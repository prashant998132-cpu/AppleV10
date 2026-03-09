// lib/db/supabase.js — browser-safe client only
import { createClient } from '@supabase/supabase-js';

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let _browser = null;
export function getSupabaseBrowser() {
  if (!_browser) _browser = createClient(URL, ANON, {
    auth: { persistSession: true, autoRefreshToken: true }
  });
  return _browser;
}

export function getSupabaseAdmin() {
  return createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export async function getUser() {
  const supabase = getSupabaseBrowser();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Server alias for routes
export async function getSupabaseServer() {
  return getSupabaseAdmin();
}
