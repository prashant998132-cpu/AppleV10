// lib/db/supabase.js
import { createClient } from '@supabase/supabase-js';
import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Browser client (singleton)
let _browser = null;
export function getSupabaseBrowser() {
  if (!_browser) _browser = createBrowserClient(URL, ANON);
  return _browser;
}

// Server client (per-request with cookie auth)
export async function getSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(URL, ANON, {
    cookies: {
      getAll()          { return cookieStore.getAll(); },
      setAll(toSet)     { try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {} },
    },
  });
}

// Admin client (server-only, bypasses RLS)
export function getSupabaseAdmin() {
  return createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

// Get current user server-side
export async function getUser() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
