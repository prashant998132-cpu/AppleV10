// app/api/daily-brief/route.js — JARVIS Daily Morning Brief
// Sends a personalized morning briefing notification
// Called by: Service Worker scheduled task or manual trigger

import { getUser, getSupabaseAdmin } from '@/lib/db/supabase';
import { getKeys } from '@/lib/config';

export const runtime = 'nodejs';

// Generate brief content
async function buildBrief(user) {
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const day = new Date().toLocaleDateString('hi-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  // Get pending goals count from DB
  let goalsText = '';
  try {
    const sb = getSupabaseAdmin();
    const { data: goals } = await sb
      .from('goals')
      .select('id, title, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(3);
    if (goals?.length) {
      goalsText = `🎯 ${goals.length} active goal${goals.length > 1 ? 's' : ''}: ${goals[0].title}`;
    }
  } catch {}

  const messages = [
    `${greet} Pranshu! ☀️ ${day}`,
    goalsText || '🤖 JARVIS ready hai — aaj kya plan hai?',
    '💬 Chat, goals, studio sab ready hain!',
  ];

  return {
    title: `JARVIS — ${greet}! 🌅`,
    body: messages.filter(Boolean).join('\n'),
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    tag: 'daily-brief',
    data: { url: '/chat', type: 'daily-brief' },
    actions: [
      { action: 'chat', title: '💬 Chat karo' },
      { action: 'goals', title: '🎯 Goals dekho' },
    ],
  };
}

export async function GET(req) {
  // Manual trigger (from settings)
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const brief = await buildBrief(user);
  return Response.json({ brief, ok: true });
}

export async function POST(req) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const brief = await buildBrief(user);

  // Send push notification if VAPID configured
  const keys = getKeys();
  if (keys.VAPID_PUBLIC_KEY && keys.VAPID_PRIVATE_KEY) {
    try {
      const webpush = await import('web-push');
      webpush.default.setVapidDetails(
        keys.VAPID_SUBJECT || 'mailto:jarvis@example.com',
        keys.VAPID_PUBLIC_KEY,
        keys.VAPID_PRIVATE_KEY,
      );

      const sb = getSupabaseAdmin();
      const { data: sub } = await sb
        .from('push_subscriptions')
        .select('subscription')
        .eq('user_id', user.id)
        .single();

      if (sub?.subscription) {
        await webpush.default.sendNotification(
          JSON.parse(sub.subscription),
          JSON.stringify({ type: 'daily-brief', ...brief })
        );
        return Response.json({ ok: true, sent: true, brief });
      }
    } catch (e) {
      return Response.json({ ok: false, error: e.message, brief });
    }
  }

  // No push — just return brief content for in-app display
  return Response.json({ ok: true, sent: false, brief });
}
