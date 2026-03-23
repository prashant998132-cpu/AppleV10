// lib/db/queries.js — Works on server AND client (no Supabase needed)
// Server: in-memory Map (per-request, stateless)
// Client: localStorage (persistent across sessions)

const _mem = new Map(); // server-side fallback

function lsGet(key, fallback = null) {
  try {
    if (typeof localStorage !== 'undefined') {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    }
    return _mem.has(key) ? _mem.get(key) : fallback;
  } catch { return fallback; }
}

function lsSet(key, value) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    } else {
      _mem.set(key, value);
    }
  } catch {}
}

// ─── PROFILE ─────────────────────────────────────────────────
export async function getProfile(userId) {
  return lsGet('jarvis_profile', { name: '', personality: 'normal', city: '', language: 'auto' });
}
export async function updateProfile(userId, updates) {
  const p = await getProfile(userId);
  lsSet('jarvis_profile', { ...p, ...updates });
  return { data: updates, error: null };
}

// ─── MEMORY ──────────────────────────────────────────────────
export async function saveMemory(userId, { category, key, value, importance = 5 }) {
  const mems = lsGet('jarvis_memories', []);
  const idx = mems.findIndex(m => m.key === key);
  const mem = { id: Date.now(), category, key, value, importance, created_at: new Date().toISOString() };
  if (idx >= 0) mems[idx] = mem; else mems.push(mem);
  // Keep last 200
  if (mems.length > 200) mems.splice(0, mems.length - 200);
  lsSet('jarvis_memories', mems);
  return mem;
}
export async function getMemories(userId, { category = null, limit = 50, search = null } = {}) {
  let mems = lsGet('jarvis_memories', []);
  if (category) mems = mems.filter(m => m.category === category);
  if (search) {
    const q = search.toLowerCase();
    mems = mems.filter(m => (m.key||'').toLowerCase().includes(q) || (m.value||'').toLowerCase().includes(q));
  }
  return mems.slice(-limit);
}
export async function buildMemoryContext(userId) {
  const mems = await getMemories(userId, { limit: 20 });
  if (!mems.length) return '';
  return mems.map(m => `${m.key}: ${m.value}`).join('\n');
}
export async function deleteMemory(userId, id) {
  const mems = lsGet('jarvis_memories', []).filter(m => String(m.id) !== String(id));
  lsSet('jarvis_memories', mems);
  return { deleted: true };
}
export async function decayOldMemories(userId) {
  const mems = lsGet('jarvis_memories', []);
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days
  const updated = mems.map(m => {
    if (m.created_at && new Date(m.created_at).getTime() < cutoff && (m.importance||5) > 2) {
      return { ...m, importance: (m.importance||5) - 1 };
    }
    return m;
  }).filter(m => (m.importance||5) > 0);
  lsSet('jarvis_memories', updated);
  return { decayed: mems.length - updated.length };
}

// ─── GOALS ───────────────────────────────────────────────────
export async function getGoals(userId, status = null) {
  let goals = lsGet('jarvis_goals', []);
  if (status) goals = goals.filter(g => g.status === status);
  return goals;
}
export async function createGoal(userId, goal) {
  const goals = lsGet('jarvis_goals', []);
  const g = { id: Date.now(), ...goal, created_at: new Date().toISOString() };
  goals.push(g); lsSet('jarvis_goals', goals); return g;
}
export async function updateGoal(userId, id, updates) {
  const goals = lsGet('jarvis_goals', []);
  const idx = goals.findIndex(g => g.id == id);
  if (idx >= 0) { goals[idx] = { ...goals[idx], ...updates }; lsSet('jarvis_goals', goals); }
  return goals[idx] || null;
}

// ─── CONVERSATIONS ───────────────────────────────────────────
export async function getConversations(userId, limit = 25) {
  return lsGet('jarvis_conversations', []).slice(-limit).reverse();
}
export async function createConversation(userId, title = 'Naya Chat') {
  const convs = lsGet('jarvis_conversations', []);
  const c = { id: `conv_${Date.now()}`, title, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), message_count: 0 };
  convs.push(c); if (convs.length > 50) convs.splice(0, convs.length - 50);
  lsSet('jarvis_conversations', convs); return c;
}
export async function updateConversation(userId, id, updates) {
  const convs = lsGet('jarvis_conversations', []);
  const idx = convs.findIndex(c => c.id === id);
  if (idx >= 0) { convs[idx] = { ...convs[idx], ...updates }; lsSet('jarvis_conversations', convs); }
}
export async function deleteConversation(userId, id) {
  const convs = lsGet('jarvis_conversations', []).filter(c => c.id !== id);
  lsSet('jarvis_conversations', convs);
  localStorage.removeItem(`jarvis_msgs_${id}`);
}

// ─── MESSAGES ────────────────────────────────────────────────
export async function getMessages(convId, limit = 50) {
  return lsGet(`jarvis_msgs_${convId}`, []).slice(-limit);
}
export async function saveMessage(userId, convId, { role, content, metadata = {} }) {
  if (!convId) return null;
  const msgs = lsGet(`jarvis_msgs_${convId}`, []);
  const msg = { id: `msg_${Date.now()}`, role, content, metadata, created_at: new Date().toISOString() };
  msgs.push(msg); if (msgs.length > 100) msgs.splice(0, msgs.length - 100);
  lsSet(`jarvis_msgs_${convId}`, msgs);
  // Update conv message count
  const convs = lsGet('jarvis_conversations', []);
  const ci = convs.findIndex(c => c.id === convId);
  if (ci >= 0) { convs[ci].message_count = (convs[ci].message_count || 0) + 1; convs[ci].updated_at = new Date().toISOString(); lsSet('jarvis_conversations', convs); }
  return msg;
}

// ─── KNOWLEDGE ───────────────────────────────────────────────
export async function saveKnowledge(userId, item) {
  const kb = lsGet('jarvis_knowledge', []);
  kb.push({ id: Date.now(), ...item, created_at: new Date().toISOString() });
  if (kb.length > 100) kb.splice(0, kb.length - 100);
  lsSet('jarvis_knowledge', kb); return item;
}
export async function searchKnowledge(userId, query) {
  const kb = lsGet('jarvis_knowledge', []);
  const q = query.toLowerCase();
  return kb.filter(k => k.title?.toLowerCase().includes(q) || k.content?.toLowerCase().includes(q)).slice(0, 3);
}
export async function getKnowledge(userId, limit = 20) {
  return lsGet('jarvis_knowledge', []).slice(-limit);
}

// ─── ANALYTICS ───────────────────────────────────────────────
export async function getAnalyticsData(userId) {
  try {
    const logs    = lsGet('jarvis_daily_logs', []);
    const goals   = lsGet('jarvis_goals', []).filter(g => g.status !== 'deleted');
    const habits  = lsGet('jarvis_habits', []);
    const convs   = lsGet('jarvis_conversations', []);
    const llmLogs = lsGet('jarvis_llm_logs', []);

    // Mood/productivity from daily logs
    const mood         = logs.map(l => ({ date: l.date || l.log_date, value: l.mood_score || 0 }));
    const productivity = logs.map(l => ({ date: l.date || l.log_date, value: l.productivity || 0 }));

    // Stats summary
    const avgMood         = logs.length ? Math.round(logs.reduce((s,l) => s+(l.mood_score||0),0) / logs.length * 10) / 10 : 0;
    const avgProductivity = logs.length ? Math.round(logs.reduce((s,l) => s+(l.productivity||0),0) / logs.length * 10) / 10 : 0;
    const totalFocusHours = logs.reduce((s,l) => s+(parseFloat(l.focus_hours)||0), 0).toFixed(1);
    const activeGoals     = goals.filter(g => g.status === 'active').length;
    const avgHabitStreak  = habits.length ? Math.round(habits.reduce((s,h) => s+(h.streak||0),0) / habits.length) : 0;
    const consistencyScore= logs.length >= 7 ? Math.min(100, Math.round(logs.length / 30 * 100)) : Math.round(logs.length / 7 * 100);

    return {
      logs, mood, productivity, habits, goals,
      messages: convs,
      avgMood, avgProductivity,
      totalFocusHours: parseFloat(totalFocusHours),
      activeGoals, avgHabitStreak, consistencyScore,
      totalConversations: convs.length,
      totalMessages: convs.reduce((s,c) => s+(c.message_count||0), 0),
    };
  } catch {
    return { mood: [], productivity: [], habits: [], goals: [], messages: [], logs: [],
             avgMood: 0, avgProductivity: 0, totalFocusHours: 0, activeGoals: 0, avgHabitStreak: 0, consistencyScore: 0 };
  }
}
export async function saveDailyLog(userId, log) {
  const logs = lsGet('jarvis_daily_logs', []);
  logs.push({ ...log, date: new Date().toISOString().slice(0, 10) });
  if (logs.length > 90) logs.splice(0, logs.length - 90);
  lsSet('jarvis_daily_logs', logs);
}
export async function getDailyLogs(userId, days = 30) {
  return lsGet('jarvis_daily_logs', []).slice(-days);
}

// ─── HABITS ──────────────────────────────────────────────────
export async function getHabits(userId) { return lsGet('jarvis_habits', []); }
export async function createHabit(userId, habit) {
  const habits = lsGet('jarvis_habits', []);
  const h = { id: Date.now(), ...habit, streak: 0, created_at: new Date().toISOString() };
  habits.push(h); lsSet('jarvis_habits', habits); return h;
}
export async function logHabit(userId, habitId) {
  const habits = lsGet('jarvis_habits', []);
  const idx = habits.findIndex(h => h.id == habitId);
  if (idx >= 0) { habits[idx].streak = (habits[idx].streak || 0) + 1; lsSet('jarvis_habits', habits); }
}

// ─── XP / GAMIFICATION ───────────────────────────────────────
export async function getXP(userId) {
  const xp = lsGet('jarvis_xp', 0) || 0;
  const levelInfo = calcLevel(xp);
  const badges = lsGet('jarvis_badges', []);
  const nxp = nextLevelXp(xp);
  return { xp, level: levelInfo.level, levelInfo, badges, nextLevelXp: nxp };
}
export async function addXP(userId, amount, reason = '') {
  const oldXp  = lsGet('jarvis_xp', 0) || 0;
  const newXp  = oldXp + amount;
  lsSet('jarvis_xp', newXp);
  const oldLevel = Math.floor(Math.sqrt(oldXp / 100)) + 1;
  const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
  const levelUp  = newLevel > oldLevel;
  if (levelUp) lsSet('jarvis_level', newLevel);
  return { xp: newXp, levelUp, newLevel, oldLevel };
}
export async function checkAndAwardBadges(userId) {
  const xpData = await getXP(userId);
  const earned = lsGet('jarvis_badges', []);
  const earnedIds = new Set(earned.map(e => e.id || e.badge_id));
  const newBadges = [];
  const msgs = lsGet('jarvis_conversations', []).reduce((s,c) => s+(c.message_count||0),0);
  const goals = lsGet('jarvis_goals', []);
  const memories = lsGet('jarvis_memories', []);
  const aria_msgs = parseInt(lsGet('jarvis_aria_msg_count', 0)||0);

  const checks = [
    { id:'first_chat',    met: xpData.xp >= 5 },
    { id:'chatterbox',    met: msgs >= 100 },
    { id:'power_user',    met: msgs >= 1000 },
    { id:'goal_setter',   met: goals.length >= 1 },
    { id:'goal_crusher',  met: goals.filter(g=>g.status==='completed').length >= 1 },
    { id:'memory_keeper', met: memories.length >= 10 },
    { id:'aria_friend',   met: aria_msgs >= 50 },
    { id:'level5',        met: xpData.level >= 5 },
    { id:'level10',       met: xpData.level >= 10 },
    { id:'early_bird',    met: !!lsGet('jarvis_early_bird', false) },
    { id:'night_owl',     met: !!lsGet('jarvis_night_owl', false) },
  ];

  // Time badges
  const h = new Date().getHours();
  if (h < 6 && !lsGet('jarvis_early_bird')) lsSet('jarvis_early_bird', true);
  if (h >= 0 && h < 4 && !lsGet('jarvis_night_owl')) lsSet('jarvis_night_owl', true);

  for (const check of checks) {
    if (check.met && !earnedIds.has(check.id)) {
      const badge = BADGES[check.id];
      if (badge) {
        earned.push({ id: badge.id, badge_id: badge.id, name: badge.name, emoji: badge.emoji, earnedAt: Date.now() });
        newBadges.push(badge);
      }
    }
  }
  if (newBadges.length) lsSet('jarvis_badges', earned);
  return newBadges;
}
export async function getBadges(userId) { return lsGet('jarvis_badges', []); }
export async function awardBadge(userId, badgeId) {
  const badge = BADGES[badgeId];
  if (!badge) return null;
  const earned = lsGet('jarvis_badges', []);
  if (earned.find(e => (e.id || e.badge_id) === badgeId)) return null; // already earned
  earned.push({ id: badgeId, badge_id: badgeId, name: badge.name, emoji: badge.emoji, earnedAt: Date.now() });
  lsSet('jarvis_badges', earned);
  return badge;
}

// ─── PINNED MESSAGES ─────────────────────────────────────────
export async function getPinnedMessages(userId) { return lsGet('jarvis_pins', []); }
export async function pinMessage(userId, { messageId, content, role }) {
  const pins = lsGet('jarvis_pins', []);
  if (pins.find(p => p.message_id === messageId)) return;
  pins.push({ id: Date.now(), message_id: messageId, content, role, pinned_at: new Date().toISOString() });
  lsSet('jarvis_pins', pins);
}
export async function unpinMessage(userId, messageId) {
  lsSet('jarvis_pins', lsGet('jarvis_pins', []).filter(p => p.message_id !== messageId));
}

// ─── LLM LOGS ────────────────────────────────────────────────
export async function saveLLMLog(userId, log) {
  try {
    const logs = lsGet('jarvis_llm_logs', []);
    logs.unshift({ ...log, ts: Date.now(), userId });
    if (logs.length > 200) logs.splice(200); // keep last 200
    lsSet('jarvis_llm_logs', logs);
  } catch {}
  return null;
}
export async function getLLMLogs(userId, days = 7) {
  try {
    const cutoff = Date.now() - days * 86400000;
    const logs = lsGet('jarvis_llm_logs', []);
    // ts is Date.now() (ms) — filter correctly
    return logs.filter(l => l.ts && l.ts > cutoff);
  } catch { return []; }
}

// ─── EVOLUTION / INSIGHTS ────────────────────────────────────
export async function getEvolutionInsights(userId, limit = 5) {
  try { return lsGet('jarvis_evolution', []).slice(0, limit); } catch { return []; }
}
export async function saveEvolutionInsight(userId, insight) {
  try {
    const list = lsGet('jarvis_evolution', []);
    list.unshift({ ...insight, ts: Date.now() });
    if (list.length > 30) list.splice(30);
    lsSet('jarvis_evolution', list);
  } catch {}
}

// ─── FEEDBACK / SELF-LEARNING ────────────────────────────────
export async function saveFeedback(userId, feedback) {
  try {
    const list = lsGet('jarvis_feedback', []);
    list.unshift({ ...feedback, ts: Date.now(), userId });
    if (list.length > 100) list.splice(100);
    lsSet('jarvis_feedback', list);
  } catch {}
}

// ─── LINKS ───────────────────────────────────────────────────
export async function getLinks(userId) { return lsGet('jarvis_links', []); }
export async function saveLink(userId, link) {
  const links = lsGet('jarvis_links', []);
  const l = { id: Date.now(), ...link, clicks: 0, created_at: new Date().toISOString() };
  links.push(l); lsSet('jarvis_links', links); return l;
}
export async function incrementClick(userId, id) {
  const links = lsGet('jarvis_links', []);
  const idx = links.findIndex(l => l.id == id);
  if (idx >= 0) { links[idx].clicks = (links[idx].clicks||0)+1; lsSet('jarvis_links', links); }
}

// ─── EXPORT / DELETE ─────────────────────────────────────────
export async function exportAllData(userId) {
  return { profile: await getProfile(userId), goals: await getGoals(userId), exportedAt: new Date().toISOString() };
}
export async function deleteAllUserData(userId) {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('jarvis_'));
  keys.forEach(k => localStorage.removeItem(k));
}

// ─── LEVEL CONFIG ────────────────────────────────────────────
export const LEVEL_CONFIG = [
  { level:1,  name:'Stranger',      emoji:'👤', minXp:0 },
  { level:2,  name:'Acquaintance',  emoji:'👋', minXp:100 },
  { level:3,  name:'Friend',        emoji:'🤝', minXp:300 },
  { level:4,  name:'Buddy',         emoji:'😊', minXp:600 },
  { level:5,  name:'Homie',         emoji:'💙', minXp:1000 },
  { level:6,  name:'JARVIS Mode',   emoji:'🤖', minXp:2000 },
  { level:7,  name:'Power User',    emoji:'⚡', minXp:4000 },
  { level:8,  name:'Legend',        emoji:'🔥', minXp:8000 },
  { level:9,  name:'Master',        emoji:'💎', minXp:15000 },
  { level:10, name:'JARVIS Prime',  emoji:'👑', minXp:30000 },
];

export function calcLevel(xp = 0) {
  const cfg = [...LEVEL_CONFIG].reverse().find(l => xp >= l.minXp) || LEVEL_CONFIG[0];
  return cfg;
}

export function nextLevelXp(xp = 0) {
  const cur = calcLevel(xp);
  const next = LEVEL_CONFIG.find(l => l.level === cur.level + 1);
  return next?.minXp || null;
}

// ─── BADGES CONFIG ────────────────────────────────────────────
export const BADGES = {
  first_chat:   { id:'first_chat',   emoji:'🎉', name:'First Chat',      desc:'Pehli baar baat ki!',        xp:5    },
  early_bird:   { id:'early_bird',   emoji:'🌅', name:'Early Bird',      desc:'Subah 6 baje se pehle chat', xp:20   },
  night_owl:    { id:'night_owl',    emoji:'🦉', name:'Night Owl',       desc:'Raat 12 ke baad chat kiya',  xp:20   },
  week_streak:  { id:'week_streak',  emoji:'🔥', name:'7 Day Streak',    desc:'7 din lagataar active',      xp:100  },
  goal_setter:  { id:'goal_setter',  emoji:'🎯', name:'Goal Setter',     desc:'Pehla goal create kiya',     xp:50   },
  goal_crusher: { id:'goal_crusher', emoji:'💥', name:'Goal Crusher',    desc:'Pehla goal complete kiya',   xp:200  },
  memory_keeper:{ id:'memory_keeper',emoji:'🧠', name:'Memory Keeper',   desc:'10 memories save kiye',      xp:75   },
  chatterbox:   { id:'chatterbox',   emoji:'💬', name:'Chatterbox',      desc:'100 messages bheje',         xp:150  },
  deep_thinker: { id:'deep_thinker', emoji:'🧐', name:'Deep Thinker',    desc:'Deep mode 10 baar use kiya', xp:100  },
  aria_friend:  { id:'aria_friend',  emoji:'💕', name:'ARIA Friend',     desc:'ARIA se 50 baar baat ki',    xp:100  },
  level5:       { id:'level5',       emoji:'⭐', name:'Level 5',         desc:'Level 5 reach kiya!',        xp:200  },
  level10:      { id:'level10',      emoji:'👑', name:'JARVIS Prime',    desc:'Max level achieve!',         xp:1000 },
  power_user:   { id:'power_user',   emoji:'⚡', name:'Power User',      desc:'1000+ messages',             xp:500  },
};
