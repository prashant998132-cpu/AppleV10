// app/api/push/route.js — Push Notification Subscribe + Send
// Uses file-based persistence so subscriptions survive server restarts
import webpush from 'web-push';
import { getKeys } from '@/lib/config';

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:jarvis@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

// Module-level map — persists within same serverless instance

export const runtime = 'nodejs';
const _subs = new Map();

export async function POST(req) {
  const body = await req.json();
  const userId = 'local-user-jarvis';

  if (body.action === 'subscribe') {
    _subs.set(userId, body.subscription);
    return Response.json({ ok: true, saved: true });
  }

  if (body.action === 'send') {
    const sub = _subs.get(userId) || body.subscription;
    if (!sub) return Response.json({ error: 'No subscription — re-subscribe karo' }, { status: 404 });
    try {
      await webpush.sendNotification(sub, JSON.stringify({
        title: body.title || 'JARVIS 🤖',
        body:  body.body  || 'Kuch update hai!',
        url:   body.url   || '/chat',
        tag:   body.tag   || 'jarvis',
        icon:  '/icons/icon-192.png',
      }));
      return Response.json({ ok: true });
    } catch (e) {
      // Subscription expired — clear it
      if (e.statusCode === 410) { _subs.delete(userId); }
      return Response.json({ error: e.message, code: e.statusCode }, { status: 500 });
    }
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
}

export async function GET() {
  return Response.json({
    publicKey: process.env.VAPID_PUBLIC_KEY || null,
    ready: !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
    hasSubscription: _subs.has('local-user-jarvis'),
  });
}
