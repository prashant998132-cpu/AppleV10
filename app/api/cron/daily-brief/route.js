// app/api/cron/daily-brief — Vercel Cron: daily at 9 PM IST (15:30 UTC)
import { getKeys } from '@/lib/config';
import { getProfile } from '@/lib/db/queries';
export const runtime = 'nodejs';

async function buildBrief(user) {
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const day = new Date().toLocaleDateString('hi-IN', { weekday:'long', day:'numeric', month:'long' });
  const profile = await getProfile(user.id).catch(() => ({ name:'Pranshu', personality:'girlfriend' }));
  const isAria = profile?.personality === 'girlfriend';
  const name = profile?.name || 'Pranshu';
  return isAria ? {
    title: 'Aira 💕', body: `${greet} ${name}! ☀️ ${day}\nUth gaye? Miss kar rahi thi... baat karo na 💕`,
    icon:'/icons/icon-192.png', badge:'/icons/icon-96.png', tag:'daily-brief', data:{url:'/chat'},
  } : {
    title: `JARVIS — ${greet}! 🌅`,
    body: `${greet} ${name}! ☀️ ${day}\n🤖 JARVIS ready hai — aaj kya plan hai?`,
    icon:'/icons/icon-192.png', badge:'/icons/icon-96.png', tag:'daily-brief', data:{url:'/chat'},
    actions:[{action:'chat',title:'💬 Chat karo'},{action:'goals',title:'🎯 Goals dekho'}],
  };
}

export async function GET(req) {
  const auth = req.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const user = { id: 'local-user-jarvis', email: 'local@jarvis.app' };
    const brief = await buildBrief(user);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://apple-v10.vercel.app';
    const pushRes = await fetch(`${appUrl}/api/push`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'send', ...brief }),
    });
    return Response.json({ sent: pushRes.ok, brief });
  } catch(e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
export async function POST(req) { return GET(req); }
