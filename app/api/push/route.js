// app/api/push/route.js — Push Notification Subscribe + Send
import { getUser } from '@/lib/db/supabase';
import webpush from 'web-push';

// Set VAPID only if keys are configured (skip at build time)
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:jarvis@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

// In-memory store (use Supabase in production for persistence)
const subscriptions = new Map();

export async function POST(req) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();

  // Save subscription
  if (body.action === 'subscribe') {
    subscriptions.set(user.id, body.subscription);
    return Response.json({ ok: true });
  }

  // Send push (internal use / cron)
  if (body.action === 'send') {
    const sub = subscriptions.get(user.id);
    if (!sub) return Response.json({ error: 'No subscription' }, { status: 404 });
    try {
      await webpush.sendNotification(sub, JSON.stringify({
        title: body.title || 'JARVIS 🤖',
        body:  body.body  || 'Kuch update hai!',
        url:   body.url   || '/chat',
        tag:   body.tag   || 'jarvis',
      }));
      return Response.json({ ok: true });
    } catch (e) {
      return Response.json({ error: e.message }, { status: 500 });
    }
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
}

export async function GET() {
  return Response.json({
    publicKey: process.env.VAPID_PUBLIC_KEY || null,
    ready: !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
  });
}
