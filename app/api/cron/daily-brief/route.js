// app/api/cron/daily-brief — Runs daily at 9 PM IST (15:30 UTC) via Vercel Cron
// Generates proactive summary and pushes notification to all active users
import { getSupabaseAdmin } from '@/lib/db/supabase';
import { buildMemoryContext, generateProactiveSuggestions } from '@/lib/ai/brain';
import { getKeys } from '@/lib/config';

export const runtime = 'nodejs';

export async function GET(req) {
  // Verify Vercel cron secret
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getSupabaseAdmin();
    const keys = getKeys();

    // Get all users with push subscriptions (stored in profiles.push_subscription)
    const { data: profiles } = await db
      .from('profiles')
      .select('user_id, name, push_subscription')
      .not('push_subscription', 'is', null);

    if (!profiles?.length) return Response.json({ sent: 0 });

    let sent = 0;
    for (const profile of profiles.slice(0, 50)) { // max 50/run
      try {
        const hour = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false });
        const greeting = parseInt(hour) >= 21 ? 'Raat ka' : parseInt(hour) >= 17 ? 'Shaam ka' : 'Din ka';

        // Push notification
        const sub = typeof profile.push_subscription === 'string'
          ? JSON.parse(profile.push_subscription) : profile.push_subscription;

        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send_to_sub',
            subscription: sub,
            title: `JARVIS — ${greeting} summary`,
            body: `${profile.name || 'Yaar'}, aaj ka din kaisa gaya? Daily brief ready hai.`,
            url: '/analytics',
            tag: 'daily-brief',
          }),
        });
        sent++;
      } catch {}
    }

    return Response.json({ sent, total: profiles.length });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
