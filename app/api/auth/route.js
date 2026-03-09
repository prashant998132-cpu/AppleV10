// app/api/auth/route.js
import { getSupabaseServer } from '@/lib/db/supabase';
import { NextResponse } from 'next/server';

export async function POST(req) {
  const { action, email, password, name } = await req.json();
  const supabase = await getSupabaseServer();

  if (action === 'signup') {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name } }
    });
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ user: data.user, message: 'Account banaya gaya!' });
  }

  if (action === 'login') {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return Response.json({ error: 'Email ya password galat hai' }, { status: 400 });
    return Response.json({ user: data.user });
  }

  if (action === 'logout') {
    await supabase.auth.signOut();
    return Response.json({ success: true });
  }

  if (action === 'reset') {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ message: 'Password reset email bheja gaya!' });
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
}
