// lib/db/supabase.js — NO SUPABASE VERSION
// App runs 100% without any database
// All data stored in localStorage / memory

export const SUPABASE_ENABLED = false;

export const LOCAL_USER = {
  id: 'local-user-jarvis',
  email: 'local@jarvis.app',
  user_metadata: { name: 'Pranshu' },
  app_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
};

// Safe null client — no crash, no Supabase
const NULL_CLIENT = {
  from: () => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: null, error: null }),
        order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
        limit: () => Promise.resolve({ data: [], error: null }),
        data: [], error: null
      }),
      order: () => ({ limit: () => Promise.resolve({ data: [], error: null }), data: [], error: null }),
      limit: () => Promise.resolve({ data: [], error: null }),
      data: [], error: null
    }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    upsert: () => Promise.resolve({ data: null, error: null }),
    delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
  }),
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'No database' } }),
    signUp: () => Promise.resolve({ data: null, error: { message: 'No database' } }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    refreshSession: () => Promise.resolve({ data: { session: null }, error: null }),
  },
  channel: () => ({
    on: function() { return this; },
    subscribe: function() { return this; },
    send: () => Promise.resolve(),
    unsubscribe: () => {},
  }),
  removeChannel: () => {},
};

export function getSupabaseBrowser() { return NULL_CLIENT; }
export function getSupabaseAdmin()   { return NULL_CLIENT; }
export async function getSupabaseServer() { return NULL_CLIENT; }

export async function getUser() {
  return LOCAL_USER;
}
