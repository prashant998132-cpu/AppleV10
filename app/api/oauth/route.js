import { getKeys, APP } from '@/lib/config';
// app/api/oauth/route.js
import { getUser } from '@/lib/db/supabase';
import { buildOAuthUrl, exchangeCode, saveToken } from '@/lib/oauth/social';
import { NextResponse } from 'next/server';

const BASE_URL = APP.url;

// GET — Initiate OAuth OR handle callback
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get('platform');
  const code     = searchParams.get('code');
  const state    = searchParams.get('state');
  const error    = searchParams.get('error');

  // OAuth callback
  if (code && state) {
    const [cbPlatform, userId] = (state || '').split('::');
    if (!cbPlatform || !userId) return NextResponse.redirect(`${BASE_URL}/settings?oauth=error&msg=invalid_state`);
    if (error) return NextResponse.redirect(`${BASE_URL}/settings?oauth=error&platform=${cbPlatform}&msg=${error}`);

    try {
      const redirectUri = `${BASE_URL}/api/oauth`;
      const tokenData = await exchangeCode(cbPlatform, code, redirectUri);
      await saveToken(userId, cbPlatform, tokenData);

      // For Meta — also fetch long-lived token
      if (cbPlatform === 'meta') {
        await upgradeFbToken(userId, tokenData.access_token);
      }

      return NextResponse.redirect(`${BASE_URL}/settings?oauth=success&platform=${cbPlatform}`);
    } catch (e) {
      return NextResponse.redirect(`${BASE_URL}/settings?oauth=error&platform=${cbPlatform}&msg=${encodeURIComponent(e.message)}`);
    }
  }

  // Initiate OAuth
  const user = await getUser();
  if (!user) return NextResponse.redirect(`${BASE_URL}/login`);
  if (!platform) return Response.json({ error: 'platform required' }, { status: 400 });

  try {
    const redirectUri = `${BASE_URL}/api/oauth`;
    const state = `${platform}::${user.id}`;
    const url = buildOAuthUrl(platform, redirectUri, state);
    return NextResponse.redirect(url);
  } catch (e) {
    return NextResponse.redirect(`${BASE_URL}/settings?oauth=error&msg=${encodeURIComponent(e.message)}`);
  }
}

// Upgrade short-lived Meta token to long-lived
async function upgradeFbToken(userId, shortToken) {
  try {
    const r = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${getKeys().META_APP_ID}&client_secret=${getKeys().META_APP_SECRET}&fb_exchange_token=${shortToken}`
    );
    const d = await r.json();
    if (d.access_token) {
      const { saveToken: st } = await import('@/lib/oauth/social');
      await st(userId, 'meta', { access_token: d.access_token, expires_in: d.expires_in });
    }
  } catch {}
}
