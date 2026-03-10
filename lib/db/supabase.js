// lib/db/supabase.js — Supabase client (browser + server)
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  || 'https://placeholder.supabase.co';
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// ─── BROWSER CLIENT ──────────────────────────────────────────────
let _browser = null;
export function getSupabaseBrowser() {
  if (!_browser) {
    _browser = createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return _browser;
}

// ─── ADMIN CLIENT (service role — server only) ───────────────────
export function getSupabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON;
  return createClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function getSupabaseServer() {
  return getSupabaseAdmin();
}

// ─── GET USER (server-side) ──────────────────────────────────────
// Reads jarvis_token cookie set by login page
export async function getUser() {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();

    // Try our custom cookie first (set by login page)
    let accessToken = cookieStore.get('jarvis_token')?.value;

    // Fallback: scan for any Supabase auth cookie
    if (!accessToken) {
      const all = cookieStore.getAll();
      for (const c of all) {
        if (c.name.includes('auth-token') || c.name.includes('access-token')) {
          try {
            const parsed = JSON.parse(decodeURIComponent(c.value));
            accessToken = Array.isArray(parsed)
              ? parsed[0]?.access_token
              : parsed?.access_token;
          } catch {
            if (c.value.startsWith('eyJ')) accessToken = c.value;
          }
          if (accessToken) break;
        }
      }
    }

    if (!accessToken) return null;

    const sb = getSupabaseAdmin();
    const { data: { user }, error } = await sb.auth.getUser(accessToken);
    if (error || !user) return null;
    return user;

  } catch {
    return null;
  }
}
