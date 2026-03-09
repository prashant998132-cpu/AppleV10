// app/api/profile/gamification/route.js
import { getUser } from '@/lib/db/supabase';
import { getXP, getBadges, addXP, awardBadge, BADGES, LEVEL_CONFIG, calcLevel, nextLevelXp } from '@/lib/db/queries';

export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const [xpData, earnedBadges] = await Promise.all([getXP(user.id), getBadges(user.id)]);
  const earnedIds = new Set(earnedBadges.map(b => b.badge_id));
  const allBadges = Object.values(BADGES).map(b => ({
    ...b, earned: earnedIds.has(b.id),
    earned_at: earnedBadges.find(e => e.badge_id === b.id)?.earned_at || null,
  }));
  const levelInfo = calcLevel(xpData.xp || 0);
  const nextXp = nextLevelXp(xpData.xp || 0);
  const prevXp = LEVEL_CONFIG.find(l => l.level === levelInfo.level)?.minXp || 0;
  const progress = nextXp ? Math.round(((xpData.xp - prevXp) / (nextXp - prevXp)) * 100) : 100;
  return Response.json({ ...xpData, levelInfo, nextXp, progress, badges: allBadges });
}

export async function POST(req) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { action, badgeId, amount = 10 } = await req.json();
  if (action === 'award_badge') return Response.json(await awardBadge(user.id, badgeId));
  if (action === 'add_xp') return Response.json(await addXP(user.id, amount, 'manual'));
  return Response.json({ error: 'Unknown action' }, { status: 400 });
}
