// lib/db/queries.js
// Centralized DB operations — all queries in one place

import { getSupabaseServer, getSupabaseAdmin } from './supabase';
import { semanticMemorySearch, embedAndStore } from '../ai/embeddings.js';

// ─── PROFILE ────────────────────────────────────────────────
export async function getProfile(userId) {
  const db = await getSupabaseServer();
  const { data } = await db.from('profiles').select('*').eq('id', userId).single();
  return data;
}

export async function updateProfile(userId, updates) {
  const db = await getSupabaseServer();
  const { data } = await db.from('profiles').update(updates).eq('id', userId).select().single();
  return data;
}

// ─── MEMORY ─────────────────────────────────────────────────
export async function saveMemory(userId, { category, key, value, importance = 5, tags = [], expiresAt = null }, geminiKey = null, hfToken = null) {
  const db = await getSupabaseServer();
  const { data } = await db.from('memories').upsert({
    user_id: userId, category, key, value, importance, tags,
    expires_at: expiresAt, updated_at: new Date().toISOString()
  }, { onConflict: 'user_id,key' }).select().single();

  // Embed in background (non-blocking) — semantic search later
  if (data?.id && (geminiKey || hfToken)) {
    const textToEmbed = `${key}: ${value}`;
    embedAndStore(data.id, textToEmbed, geminiKey, hfToken, db).catch(() => {});
  }

  return data;
}

export async function getMemories(userId, { category = null, tags = null, search = null, limit = 50 } = {}) {
  const db = await getSupabaseServer();
  let q = db.from('memories').select('*').eq('user_id', userId).order('importance', { ascending: false }).order('updated_at', { ascending: false }).limit(limit);
  if (category) q = q.eq('category', category);
  if (tags?.length) q = q.overlaps('tags', tags);
  if (search) q = q.textSearch('key', search, { type: 'websearch' });
  const { data } = await q;
  return data || [];
}

export async function getMemoryByKey(userId, key) {
  const db = await getSupabaseServer();
  const { data } = await db.from('memories').select('*').eq('user_id', userId).eq('key', key).single();
  return data;
}

export async function deleteMemory(userId, id) {
  const db = await getSupabaseServer();
  await db.from('memories').delete().eq('id', id).eq('user_id', userId);
}

// Build memory context — tries semantic search first, falls back to keyword
export async function buildMemoryContext(userId, query = null, geminiKey = null, hfToken = null) {
  const db = await getSupabaseServer();

  // SEMANTIC SEARCH: if query + embedding available → find relevant memories
  if (query && (geminiKey || hfToken)) {
    const semantic = await semanticMemorySearch(userId, query, geminiKey, hfToken, db, 18);
    if (semantic?.length) {
      // Always include profile memories on top (name, city, etc.)
      const profileMems = await getMemories(userId, { category: 'profile', limit: 8 });
      const profileLines = profileMems.map(m => `${m.key}: ${m.value}`);
      const semanticLines = semantic.map(m => `${m.key}: ${m.value} [${m.category}]`);
      // Deduplicate
      const allLines = [...new Set([...profileLines, ...semanticLines])];
      return `[SEMANTIC MATCH for "${query.slice(0,40)}"]
${allLines.join('\n')}`;
    }
  }

  // FALLBACK: load top memories by importance (original behavior)
  const all = await getMemories(userId, { limit: 120 });
  if (!all?.length) return '';
  const ORDER = ['profile','goal','preference','emotion','study','performance','relationship','general'];
  const grouped = {};
  all.forEach(m => {
    const cat = m.category || 'general';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(`${m.key}: ${m.value}`);
  });
  return ORDER
    .filter(cat => grouped[cat]?.length)
    .map(cat => `[${cat.toUpperCase()}]\n${grouped[cat].slice(0, 12).join('\n')}`)
    .join('\n\n');
}

// ─── GOALS ──────────────────────────────────────────────────
export async function getGoals(userId, status = null) {
  const db = await getSupabaseServer();
  let q = db.from('goals').select('*').eq('user_id', userId).order('priority').order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data } = await q;
  return data || [];
}

export async function createGoal(userId, goal) {
  const db = await getSupabaseServer();
  const { data } = await db.from('goals').insert({ user_id: userId, ...goal }).select().single();
  return data;
}

export async function updateGoal(userId, id, updates) {
  const db = await getSupabaseServer();
  const { data } = await db.from('goals').update(updates).eq('id', id).eq('user_id', userId).select().single();
  return data;
}

// ─── CONVERSATIONS ───────────────────────────────────────────
export async function getConversations(userId, limit = 25) {
  const db = await getSupabaseServer();
  const { data } = await db
    .from('conversations')
    .select('id,title,message_count,updated_at,created_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit);
  return data || [];
}

export async function createConversation(userId, title = 'Naya Chat') {
  const db = await getSupabaseServer();
  const { data } = await db.from('conversations').insert({ user_id: userId, title }).select().single();
  return data;
}

export async function updateConversation(userId, id, updates) {
  const db = await getSupabaseServer();
  await db.from('conversations').update(updates).eq('id', id).eq('user_id', userId);
}

export async function getMessages(convId, limit = 50) {
  const db = await getSupabaseServer();
  const { data } = await db.from('messages').select('*').eq('conversation_id', convId).order('created_at').limit(limit);
  return data || [];
}

export async function saveMessage(userId, convId, { role, content, metadata = {} }) {
  const db = await getSupabaseServer();
  const { data } = await db.from('messages').insert({ user_id: userId, conversation_id: convId, role, content, metadata }).select().single();
  // Update conversation
  await db.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', convId);
  return data;
}

export async function deleteConversation(userId, id) {
  const db = await getSupabaseServer();
  await db.from('messages').delete().eq('conversation_id', id).eq('user_id', userId);
  await db.from('conversations').delete().eq('id', id).eq('user_id', userId);
}

// ─── DAILY LOGS ──────────────────────────────────────────────
export async function saveDailyLog(userId, log) {
  const db = await getSupabaseServer();
  const { data } = await db.from('daily_logs').upsert({ user_id: userId, ...log }, { onConflict: 'user_id,log_date' }).select().single();
  return data;
}

export async function getDailyLogs(userId, days = 30) {
  const db = await getSupabaseServer();
  const from = new Date(); from.setDate(from.getDate() - days);
  const { data } = await db.from('daily_logs').select('*').eq('user_id', userId).gte('log_date', from.toISOString().split('T')[0]).order('log_date', { ascending: false });
  return data || [];
}

// ─── HABITS ──────────────────────────────────────────────────
export async function getHabits(userId) {
  const db = await getSupabaseServer();
  const { data } = await db.from('habits').select('*').eq('user_id', userId).eq('is_active', true).order('created_at');
  return data || [];
}

export async function createHabit(userId, habit) {
  const db = await getSupabaseServer();
  const { data } = await db.from('habits').insert({ user_id: userId, ...habit }).select().single();
  return data;
}

export async function logHabit(userId, habitId, notes = '') {
  const db = await getSupabaseServer();
  const today = new Date().toISOString().split('T')[0];
  await db.from('habit_logs').upsert({ habit_id: habitId, user_id: userId, done_date: today, notes }, { onConflict: 'habit_id,done_date' });
  // Update streak
  const habit = await db.from('habits').select('*').eq('id', habitId).single();
  if (habit.data) {
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const newStreak = habit.data.last_done === yesterday.toISOString().split('T')[0] ? habit.data.streak + 1 : 1;
    await db.from('habits').update({ streak: newStreak, best_streak: Math.max(newStreak, habit.data.best_streak), total_done: habit.data.total_done + 1, last_done: today }).eq('id', habitId);
  }
}

// ─── KNOWLEDGE ───────────────────────────────────────────────
export async function saveKnowledge(userId, item) {
  const db = await getSupabaseServer();
  const { data } = await db.from('knowledge_items').insert({ user_id: userId, ...item }).select().single();
  return data;
}

export async function searchKnowledge(userId, query) {
  const db = await getSupabaseServer();
  const { data } = await db.from('knowledge_items').select('*').eq('user_id', userId).textSearch('title', query, { type: 'websearch' }).limit(10);
  return data || [];
}

export async function getKnowledge(userId, limit = 20) {
  const db = await getSupabaseServer();
  const { data } = await db.from('knowledge_items').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
  return data || [];
}

// ─── ANALYTICS ───────────────────────────────────────────────
export async function getAnalyticsData(userId) {
  const logs = await getDailyLogs(userId, 30);
  const goals = await getGoals(userId);
  const habits = await getHabits(userId);

  const avgMood = logs.length ? (logs.reduce((s, l) => s + (l.mood_score || 0), 0) / logs.filter(l => l.mood_score).length).toFixed(1) : 0;
  const avgProductivity = logs.length ? (logs.reduce((s, l) => s + (l.productivity || 0), 0) / logs.filter(l => l.productivity).length).toFixed(1) : 0;
  const totalFocusHours = logs.reduce((s, l) => s + (parseFloat(l.focus_hours) || 0), 0).toFixed(1);
  const activeGoals = goals.filter(g => g.status === 'active').length;
  const completedGoals = goals.filter(g => g.status === 'completed').length;
  const avgHabitStreak = habits.length ? Math.round(habits.reduce((s, h) => s + h.streak, 0) / habits.length) : 0;

  return {
    avgMood: parseFloat(avgMood),
    avgProductivity: parseFloat(avgProductivity),
    totalFocusHours: parseFloat(totalFocusHours),
    activeGoals, completedGoals, avgHabitStreak,
    logs: logs.slice(0, 14).reverse(),
    goals: goals.slice(0, 5),
    habits: habits.slice(0, 6),
    consistencyScore: calculateConsistency(logs),
  };
}

function calculateConsistency(logs) {
  if (logs.length < 3) return 0;
  const last7 = logs.slice(0, 7);
  const withData = last7.filter(l => l.productivity > 0).length;
  return Math.round((withData / 7) * 100);
}

// ─── LINKS ───────────────────────────────────────────────────
export async function getLinks(userId) {
  const db = await getSupabaseServer();
  const { data } = await db.from('links').select('*').eq('user_id', userId).order('click_count', { ascending: false });
  return data || [];
}

export async function saveLink(userId, link) {
  const db = await getSupabaseServer();
  const { data } = await db.from('links').insert({ user_id: userId, ...link }).select().single();
  return data;
}

export async function incrementClick(userId, id) {
  const db = await getSupabaseServer();
  await db.rpc('increment_click', { link_id: id });
}

// ─── DATA EXPORT ─────────────────────────────────────────────
// ─── LLM LOGS ────────────────────────────────────────────────
export async function saveLLMLog(userId, { model, latency_ms, mode, tokens, react_steps = 0 }) {
  try {
    const db = await getSupabaseServer();
    await db.from('llm_logs').insert({ user_id: userId, model, latency_ms, mode, tokens, react_steps });
  } catch {} // Non-critical — never throw
}

export async function getLLMLogs(userId, days = 7) {
  const db = await getSupabaseServer();
  const from = new Date(); from.setDate(from.getDate() - days);
  const { data } = await db.from('llm_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', from.toISOString())
    .order('created_at', { ascending: false })
    .limit(200);
  return data || [];
}

// ─── MESSAGE FEEDBACK ─────────────────────────────────────────
export async function saveFeedback(userId, { messageId, rating, content }) {
  try {
    const db = await getSupabaseServer();
    await db.from('message_feedback').insert({ user_id: userId, message_id: messageId, rating, content: content?.slice(0,500) });
    // Negative feedback → auto-save as correction memory
    if (rating === 'down' && content) {
      await saveMemory(userId, {
        category: 'correction', key: `correction_${Date.now()}`,
        value: `User disliked this response: "${content.slice(0,100)}"`,
        importance: 7, tags: ['feedback','correction']
      });
    }
  } catch {}
}

export async function exportAllData(userId) {
  const [profile, memories, goals, habits, logs, knowledge] = await Promise.all([
    getProfile(userId),
    getMemories(userId, { limit: 500 }),
    getGoals(userId),
    getHabits(userId),
    getDailyLogs(userId, 365),
    getKnowledge(userId, 200),
  ]);
  return { profile, memories, goals, habits, logs, knowledge, exportedAt: new Date().toISOString() };
}

// ─── DELETE ALL DATA ─────────────────────────────────────────
export async function deleteAllUserData(userId) {
  const db = await getSupabaseServer();
  await Promise.all([
    db.from('memories').delete().eq('user_id', userId),
    db.from('goals').delete().eq('user_id', userId),
    db.from('daily_logs').delete().eq('user_id', userId),
    db.from('habits').delete().eq('user_id', userId),
    db.from('knowledge_items').delete().eq('user_id', userId),
    db.from('links').delete().eq('user_id', userId),
  ]);
  const convs = await getConversations(userId, 1000);
  for (const c of convs) await deleteConversation(userId, c.id);
}

// ════════════════════════════════════════════════════════════════
// JARVIS v9 — Gamification: XP, Badges, Pins, Evolution, Decay
// ════════════════════════════════════════════════════════════════

// ─── BADGE DEFINITIONS ────────────────────────────────────────
export const BADGES = {
  first_chat:    { id:'first_chat',    emoji:'💬', name:'Pehli Baat',     desc:'Pehla message bheja',               xp:25 },
  day_3_streak:  { id:'day_3_streak',  emoji:'🔥', name:'3 Din Streak',   desc:'3 din lagatar baat ki',             xp:50 },
  week_streak:   { id:'week_streak',   emoji:'📅', name:'Week Warrior',   desc:'7 din ka streak complete',          xp:100 },
  month_streak:  { id:'month_streak',  emoji:'🏆', name:'Iron Habit',     desc:'30 din ka streak — legend',        xp:500 },
  goal_done:     { id:'goal_done',     emoji:'🎯', name:'Goal Crusher',   desc:'Pehla goal complete kiya',          xp:75 },
  memory_saver:  { id:'memory_saver',  emoji:'🧠', name:'Memory Master',  desc:'10 memories save ki',               xp:50 },
  night_owl:     { id:'night_owl',     emoji:'🦉', name:'Night Owl',      desc:'Raat 12 ke baad active raha',      xp:30 },
  early_bird:    { id:'early_bird',    emoji:'🌅', name:'Early Bird',     desc:'Subah 6 se pehle active raha',     xp:30 },
  power_user:    { id:'power_user',    emoji:'⚡', name:'Power User',     desc:'100 messages complete',             xp:100 },
  deep_thinker:  { id:'deep_thinker',  emoji:'🔭', name:'Deep Thinker',   desc:'Deep mode 10 baar use kiya',       xp:75 },
  creator:       { id:'creator',       emoji:'🎨', name:'Creator',        desc:'Studio mein kuch banaya',           xp:50 },
  knowledge_hub: { id:'knowledge_hub', emoji:'📚', name:'Knowledge Hub',  desc:'5 documents upload kiye',          xp:75 },
  jarvis_mode:   { id:'jarvis_mode',   emoji:'🤖', name:'JARVIS MODE',    desc:'Level 5 reach — Ultimate Bond',    xp:1000 },
  pin_master:    { id:'pin_master',    emoji:'📌', name:'Pin Master',     desc:'Pehla message pin kiya',           xp:25 },
  voice_user:    { id:'voice_user',    emoji:'🎤', name:'Voice User',     desc:'Pehla voice message bheja',        xp:25 },
};

export const LEVEL_CONFIG = [
  { level:1, name:'Stranger',      emoji:'👋', minXp:0,    color:'slate'  },
  { level:2, name:'Acquaintance',  emoji:'🤝', minXp:200,  color:'blue'   },
  { level:3, name:'Friend',        emoji:'😊', minXp:500,  color:'cyan'   },
  { level:4, name:'Best Friend',   emoji:'💙', minXp:1000, color:'purple' },
  { level:5, name:'JARVIS MODE',   emoji:'🤖', minXp:2500, color:'gold'   },
];

export function calcLevel(xp) {
  let lvl = LEVEL_CONFIG[0];
  for (const l of LEVEL_CONFIG) { if (xp >= l.minXp) lvl = l; else break; }
  return lvl;
}

export function nextLevelXp(xp) {
  for (const l of LEVEL_CONFIG) { if (xp < l.minXp) return l.minXp; }
  return null; // max level
}

// ─── XP ───────────────────────────────────────────────────────
export async function getXP(userId) {
  const db = getSupabaseAdmin();
  const { data } = await db.from('user_xp').select('*').eq('user_id', userId).single();
  if (!data) {
    await db.from('user_xp').insert({ user_id: userId });
    return { xp:0, level:1, streak_days:0, total_msgs:0 };
  }
  return data;
}

export async function addXP(userId, amount, reason = '') {
  const db = getSupabaseAdmin();

  const today = new Date().toISOString().split('T')[0];
  const { data: cur } = await db.from('user_xp').select('*').eq('user_id', userId).single();

  if (!cur) {
    await db.from('user_xp').insert({ user_id: userId, xp: amount, last_active: today, total_msgs: 1 });
    return { xp: amount, levelUp: false, newLevel: 1 };
  }

  const oldLevel = calcLevel(cur.xp).level;

  // Streak logic
  const lastDate = cur.last_active;
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  let streak = cur.streak_days || 0;
  let bonusXP = 0;

  if (lastDate === yesterday) { streak += 1; bonusXP = streak * 2; }
  else if (lastDate !== today) { streak = 1; }

  const isNewDay = lastDate !== today;
  const dailyBonus = isNewDay ? 20 : 0;
  const totalXP = cur.xp + amount + bonusXP + dailyBonus;
  const newLevel = calcLevel(totalXP).level;

  await db.from('user_xp').update({
    xp: totalXP,
    level: newLevel,
    streak_days: streak,
    last_active: today,
    total_msgs: (cur.total_msgs || 0) + (reason === 'message' ? 1 : 0),
    total_days: isNewDay ? (cur.total_days || 0) + 1 : (cur.total_days || 0),
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId);

  return { xp: totalXP, streak, levelUp: newLevel > oldLevel, newLevel, oldLevel };
}

// ─── BADGES ───────────────────────────────────────────────────
export async function getBadges(userId) {
  const db = getSupabaseAdmin();
  const { data } = await db.from('user_badges').select('badge_id, earned_at').eq('user_id', userId);
  return data || [];
}

export async function awardBadge(userId, badgeId) {
  const badge = BADGES[badgeId];
  if (!badge) return null;
  const db = getSupabaseAdmin();
  const { data, error } = await db.from('user_badges')
    .insert({ user_id: userId, badge_id: badgeId })
    .select().single();
  if (error) return null; // already earned
  await addXP(userId, badge.xp, 'badge');
  return { ...badge, earned_at: data.earned_at };
}

export async function checkAndAwardBadges(userId) {
  const xpData = await getXP(userId);
  const earned = await getBadges(userId);
  const earnedIds = new Set(earned.map(b => b.badge_id));
  const newBadges = [];

  if (!earnedIds.has('first_chat') && xpData.total_msgs >= 1)    newBadges.push(await awardBadge(userId, 'first_chat'));
  if (!earnedIds.has('power_user') && xpData.total_msgs >= 100)  newBadges.push(await awardBadge(userId, 'power_user'));
  if (!earnedIds.has('day_3_streak') && xpData.streak_days >= 3) newBadges.push(await awardBadge(userId, 'day_3_streak'));
  if (!earnedIds.has('week_streak') && xpData.streak_days >= 7)  newBadges.push(await awardBadge(userId, 'week_streak'));
  if (!earnedIds.has('month_streak') && xpData.streak_days >= 30)newBadges.push(await awardBadge(userId, 'month_streak'));
  if (!earnedIds.has('jarvis_mode') && xpData.level >= 5)        newBadges.push(await awardBadge(userId, 'jarvis_mode'));

  const hour = new Date().getHours();
  if (!earnedIds.has('night_owl') && hour >= 0 && hour < 4)     newBadges.push(await awardBadge(userId, 'night_owl'));
  if (!earnedIds.has('early_bird') && hour >= 5 && hour < 7)    newBadges.push(await awardBadge(userId, 'early_bird'));

  return newBadges.filter(Boolean);
}

// ─── PINNED MESSAGES ──────────────────────────────────────────
export async function getPinnedMessages(userId) {
  const db = getSupabaseAdmin();
  const { data } = await db.from('pinned_messages').select('*').eq('user_id', userId).order('pinned_at', { ascending: false }).limit(20);
  return data || [];
}

export async function pinMessage(userId, { messageId, content, role }) {
  const db = getSupabaseAdmin();
  const { data } = await db.from('pinned_messages').insert({ user_id: userId, message_id: messageId, content, role }).select().single();
  await awardBadge(userId, 'pin_master');
  return data;
}

export async function unpinMessage(userId, messageId) {
  const db = getSupabaseAdmin();
  await db.from('pinned_messages').delete().eq('user_id', userId).eq('message_id', messageId);
}

// ─── JARVIS EVOLUTION ─────────────────────────────────────────
export async function getEvolutionInsights(userId, limit = 5) {
  const db = getSupabaseAdmin();
  const { data } = await db.from('jarvis_evolution').select('*').eq('user_id', userId).order('run_at', { ascending: false }).limit(limit);
  return data || [];
}

export async function saveEvolutionInsight(userId, { insight, pattern }) {
  const db = getSupabaseAdmin();
  const { data } = await db.from('jarvis_evolution').insert({ user_id: userId, insight, pattern }).select().single();
  return data;
}

// ─── SMART MEMORY DECAY ────────────────────────────────────────
export async function decayOldMemories(userId) {
  const db = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - 90 * 86400000).toISOString(); // 90 days ago
  const { data, error } = await db
    .from('memories')
    .update({ category: 'archived' })
    .eq('user_id', userId)
    .lt('importance', 4)
    .lt('created_at', cutoff)
    .neq('category', 'archived')
    .select('id');
  return { archived: data?.length || 0 };
}
