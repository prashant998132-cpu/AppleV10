// app/api/daily-brief/route.js — JARVIS Daily Brief v2
// Smart brief using localStorage data (no Supabase needed)

import { getKeys } from '@/lib/config';
import { getProfile, getGoals, getDailyLogs } from '@/lib/db/queries';

export const runtime = 'nodejs';

async function buildBrief(user) {
  const now  = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const hour = now.getHours();
  const day  = now.toLocaleDateString('hi-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // NEET countdown
  const neetDays = Math.max(0, Math.round((new Date('2026-05-03') - now) / 86400000));
  const neetLine = neetDays > 0
    ? `📚 NEET 2026: ${neetDays} din baaki — aaj ka plan ready hai?`
    : '🎉 NEET exam aa gaya! All the best!';

  // Goals
  let goalsLine = '';
  try {
    const goals = await getGoals(user.id, 'active');
    if (goals?.length) {
      const top = goals[0];
      goalsLine = `🎯 Goal: "${top.title}" — ${top.progress || 0}% done`;
    }
  } catch {}

  // Motivational line by time
  const motivLines = {
    morning: ['Har subah ek nayi shuruat hai! 🌅', 'Aaj ka din best day of your life ho sakta hai!', 'Uth jao, duniya wait kar rahi hai! ⚡'],
    afternoon: ['Afternoon slump? Ek chai pi aur wapas lag jao! ☕', 'Half day gaya — half din baaki hai. Lage raho!', 'Focus mode on! 🎯'],
    evening: ['Din ka review karo — kya achieve kiya?', 'Shaam ho gayi, kal ki planning karo! 📋', 'Aaj ki mehnat kal ke results banegi. 💪'],
    night: ['Neend lo — tired brain padh nahi sakta!', 'Rest bhi productivity hai. So jao! 🌙', 'Kal fresh start hoga. 💤'],
  };
  const timeKey = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
  const motiv = motivLines[timeKey][Math.floor(Math.random() * motivLines[timeKey].length)];

  const bodyLines = [
    neetLine,
    goalsLine,
    motiv,
  ].filter(Boolean);

  return {
    title: `JARVIS — ${greet}! ${hour < 12 ? '🌅' : hour < 17 ? '☀️' : hour < 21 ? '🌆' : '🌙'}`,
    body: `📅 ${day}\n\n${bodyLines.join('\n\n')}\n\n💬 Bol do kya plan hai aaj!`,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    tag: 'daily-brief',
    data: { url: '/chat', type: 'daily-brief' },
    actions: [
      { action: 'chat',  title: '💬 Chat karo'  },
      { action: 'goals', title: '🎯 Goals dekho' },
    ],
  };
}

export async function GET(req) {
  const user = { id: 'local-user-jarvis', email: 'local@jarvis.app' };
  const brief = await buildBrief(user);
  return Response.json({ brief, ok: true });
}

export async function POST(req) {
  const user = { id: 'local-user-jarvis', email: 'local@jarvis.app' };
  const brief = await buildBrief(user);

  const keys = getKeys();
  if (keys.VAPID_PUBLIC_KEY && keys.VAPID_PRIVATE_KEY) {
    try {
      const webpush = await import('web-push');
      webpush.default.setVapidDetails(
        keys.VAPID_SUBJECT || 'mailto:jarvis@example.com',
        keys.VAPID_PUBLIC_KEY,
        keys.VAPID_PRIVATE_KEY,
      );
    } catch {}
  }

  return Response.json({ ok: true, sent: false, brief });
}
