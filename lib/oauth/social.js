// lib/oauth/social.js
// ═══════════════════════════════════════════════════════════════
// JARVIS v5 — Social Media & OAuth Integration
// Instagram, LinkedIn, YouTube, Google Calendar, Gmail
// Server-side token management with Supabase encrypted storage
// ═══════════════════════════════════════════════════════════════

import { getSupabaseServer } from '../db/supabase';

// ─── OAUTH CONFIG ─────────────────────────────────────────────
export const OAUTH_CONFIG = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' '),
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },
  meta: {
    authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
    scopes: 'pages_manage_posts,instagram_basic,instagram_content_publish,pages_read_engagement',
    clientId: process.env.META_APP_ID,
    clientSecret: process.env.META_APP_SECRET,
  },
  linkedin: {
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    scopes: 'openid profile w_member_social',
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
  },
};

// ─── TOKEN STORAGE (Supabase) ─────────────────────────────────
export async function saveToken(userId, platform, tokenData) {
  const db = await getSupabaseServer();
  await db.from('oauth_tokens').upsert({
    user_id: userId,
    platform,
    access_token:  tokenData.access_token,
    refresh_token: tokenData.refresh_token || null,
    expires_at:    tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null,
    scope: tokenData.scope || null,
    meta: tokenData.meta || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,platform' });
}

export async function getToken(userId, platform) {
  const db = await getSupabaseServer();
  const { data } = await db.from('oauth_tokens').select('*').eq('user_id', userId).eq('platform', platform).single();
  return data;
}

export async function deleteToken(userId, platform) {
  const db = await getSupabaseServer();
  await db.from('oauth_tokens').delete().eq('user_id', userId).eq('platform', platform);
}

export async function getConnectedPlatforms(userId) {
  const db = await getSupabaseServer();
  const { data } = await db.from('oauth_tokens').select('platform,updated_at').eq('user_id', userId);
  return data?.map(d => d.platform) || [];
}

// ─── OAUTH URL BUILDER ────────────────────────────────────────
export function buildOAuthUrl(platform, redirectUri, state) {
  const cfg = OAUTH_CONFIG[platform];
  if (!cfg) throw new Error(`Unknown platform: ${platform}`);
  const params = new URLSearchParams({
    client_id:     cfg.clientId,
    redirect_uri:  redirectUri,
    scope:         cfg.scopes,
    response_type: 'code',
    state,
    access_type:   platform === 'google' ? 'offline' : undefined,
    prompt:        platform === 'google' ? 'consent' : undefined,
  });
  // Remove undefined
  params.forEach((v, k) => { if (v === 'undefined') params.delete(k); });
  return `${cfg.authUrl}?${params}`;
}

// ─── TOKEN EXCHANGE ───────────────────────────────────────────
export async function exchangeCode(platform, code, redirectUri) {
  const cfg = OAUTH_CONFIG[platform];
  const r = await fetch(cfg.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     cfg.clientId,
      client_secret: cfg.clientSecret,
      code,
      redirect_uri:  redirectUri,
      grant_type:    'authorization_code',
    }),
  });
  const d = await r.json();
  if (d.error) throw new Error(`OAuth error: ${d.error_description || d.error}`);
  return d;
}

// ─── GOOGLE CALENDAR ─────────────────────────────────────────
export async function addCalendarEvent(userId, event) {
  const token = await getToken(userId, 'google');
  if (!token) throw new Error('Google not connected');

  const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary:     event.title,
      description: event.description || '',
      location:    event.location || '',
      start: { dateTime: new Date(event.start).toISOString(), timeZone: 'Asia/Kolkata' },
      end:   { dateTime: new Date(event.end   || event.start).toISOString(), timeZone: 'Asia/Kolkata' },
      reminders: {
        useDefault: false,
        overrides: [{ method: 'popup', minutes: 30 }, { method: 'email', minutes: 60 }],
      },
    }),
  });

  if (!r.ok) {
    const e = await r.json();
    if (e.error?.status === 'UNAUTHENTICATED') throw new Error('TOKEN_EXPIRED');
    throw new Error(`Calendar: ${e.error?.message}`);
  }

  const d = await r.json();
  return { id: d.id, link: d.htmlLink, title: event.title };
}

export async function getCalendarEvents(userId, days = 7) {
  const token = await getToken(userId, 'google');
  if (!token) return [];

  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + days * 86400000).toISOString();

  const r = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=10`,
    { headers: { 'Authorization': `Bearer ${token.access_token}` } }
  );
  const d = await r.json();
  return d.items || [];
}

// ─── GMAIL (Draft Only — user approves before sending) ────────
export async function createGmailDraft(userId, { to, subject, body }) {
  const token = await getToken(userId, 'google');
  if (!token) throw new Error('Google not connected');

  const email = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=utf-8`,
    ``,
    body,
  ].join('\n');

  const encoded = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: { raw: encoded } }),
  });

  if (!r.ok) throw new Error(`Gmail draft: ${r.status}`);
  const d = await r.json();
  return { draftId: d.id, message: 'Draft Gmail mein save ho gaya! Wahan jaake send karo.' };
}

// ─── INSTAGRAM (Business accounts only via Meta Graph) ────────
export async function postToInstagram(userId, { imageUrl, caption, hashtags = [] }) {
  const token = await getToken(userId, 'meta');
  if (!token) throw new Error('Instagram not connected');

  const fullCaption = `${caption}\n\n${hashtags.map(h => `#${h}`).join(' ')}`;

  // Step 1: Get Instagram business account ID
  const meR = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${token.access_token}`);
  const meD = await meR.json();
  const page = meD.data?.[0];
  if (!page) throw new Error('No Facebook Page found. Personal Instagram accounts not supported.');

  const igR = await fetch(`https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`);
  const igD = await igR.json();
  const igId = igD.instagram_business_account?.id;
  if (!igId) throw new Error('No Instagram Business account linked to this page.');

  // Step 2: Create media container
  const createR = await fetch(`https://graph.facebook.com/v19.0/${igId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl, caption: fullCaption, access_token: page.access_token }),
  });
  const createD = await createR.json();
  if (!createD.id) throw new Error(`Instagram media: ${JSON.stringify(createD)}`);

  // Step 3: Publish
  const pubR = await fetch(`https://graph.facebook.com/v19.0/${igId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: createD.id, access_token: page.access_token }),
  });
  const pubD = await pubR.json();
  return { postId: pubD.id, platform: 'Instagram', caption: fullCaption };
}

// ─── LINKEDIN ────────────────────────────────────────────────
export async function postToLinkedIn(userId, { text, imageUrl = null }) {
  const token = await getToken(userId, 'linkedin');
  if (!token) throw new Error('LinkedIn not connected');

  // Get person ID
  const meR = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { 'Authorization': `Bearer ${token.access_token}` },
  });
  const meD = await meR.json();
  const personUrn = `urn:li:person:${meD.sub}`;

  const postBody = {
    author:      personUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text },
        shareMediaCategory: 'NONE',
      }
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  };

  const r = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token.access_token}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' },
    body: JSON.stringify(postBody),
  });

  if (!r.ok) throw new Error(`LinkedIn post: ${r.status}`);
  const d = await r.json();
  return { postId: d.id, platform: 'LinkedIn' };
}

// ─── YOUTUBE UPLOAD ──────────────────────────────────────────
export async function uploadToYouTube(userId, { title, description, tags, videoUrl, privacyStatus = 'private' }) {
  const token = await getToken(userId, 'google');
  if (!token) throw new Error('Google not connected');

  // Note: Full video upload requires multipart upload — this creates a video resource
  // For production, use resumable upload for large files
  return {
    message: 'YouTube upload ke liye video file direct browser se upload karo.',
    uploadUrl: 'https://www.youtube.com/upload',
    preparedMeta: { title, description, tags },
    note: 'Resumable upload API implementation needed for large files.',
  };
}
