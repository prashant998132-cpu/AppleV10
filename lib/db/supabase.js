// lib/db/supabase.js — JARVIS v10.9 Supabase Client
// ══════════════════════════════════════════════════════════════
// SAFE MODE: agar Supabase URL nahi hai toh crash nahi hoga
// App fully works without Supabase using localStorage fallback
// ══════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  || '';
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Check if Supabase is actually configured
export const SUPABASE_ENABLED = !!(
  SUPABASE_URL &&
  SUPABASE_URL !== 'https://placeholder.supabase.co' &&
  SUPABASE_URL.includes('.supabase.co') &&
  SUPABASE_ANON &&
  SUPABASE_ANON !== 'placeholder-key' &&
  SUPABASE_ANON.length > 20
);

// ─── NULL CLIENT — safe noop for when Supabase not configured ──
const NULL_CLIENT = {
  from: () => ({
    select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }), data: null, error: null }),
      order: () => ({ limit: () => Promise.resolve({ data: [], error: null }), data: [], error: null }),
      data: [], error: null }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    upsert: () => Promise.resolve({ data: null, error: null }),
    delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
  }),
  auth: {
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
    signUp: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
  channel: () => ({
    on: function() { return this; },
    subscribe: function() { return this; },
    send: () => Promise.resolve(),
    unsubscribe: () => {},
  }),
  removeChannel: () => {},
};

// ─── BROWSER CLIENT ────────────────────────────────────────────
let _browser = null;
export function getSupabaseBrowser() {
  if (!SUPABASE_ENABLED) return NULL_CLIENT;
  if (!_browser) {
    try {
      _browser = createClient(SUPABASE_URL, SUPABASE_ANON, {
        auth: { persistSession: true, autoRefreshToken: true },
      });
    } catch { return NULL_CLIENT; }
  }
  return _browser;
}

// ─── SERVER/ADMIN CLIENT ───────────────────────────────────────
export function getSupabaseAdmin() {
  if (!SUPABASE_ENABLED) return NULL_CLIENT;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON;
  try {
    return createClient(SUPABASE_URL, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  } catch { return NULL_CLIENT; }
}

export async function getSupabaseServer() {
  return getSupabaseAdmin();
}

// ─── GET USER ──────────────────────────────────────────────────
export async function getUser() {
  if (!SUPABASE_ENABLED) return null;
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();

    let accessToken = cookieStore.get('jarvis_token')?.value;
    if (!accessToken) {
      const all = cookieStore.getAll();
      for (const c of all) {
        if (c.name.includes('auth-token') || c.name.includes('access-token')) {
          try {
            const parsed = JSON.parse(decodeURIComponent(c.value));
            accessToken = Array.isArray(parsed) ? parsed[0]?.access_token : parsed?.access_token;
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
  } catch { return null; }
}
