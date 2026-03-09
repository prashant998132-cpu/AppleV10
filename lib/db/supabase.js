// lib/db/supabase.js — browser-safe client
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

let _browser = null;
export function getSupabaseBrowser() {
  if (!_browser) {
    _browser = createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
  }
  return _browser;
}

export function getSupabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON;
  return createClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export async function getUser() {
  const supabase = getSupabaseBrowser();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getSupabaseServer() {
  return getSupabaseAdmin();
}
