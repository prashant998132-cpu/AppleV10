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
  return lsGet('jarvis_profile', { name: 'Pranshu', personality: 'normal', city: '', language: 'hinglish' });
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
export async function getMemories(userId, { category = null, limit = 50 } = {}) {
  let mems = lsGet('jarvis_memories', []);
  if (category) mems = mems.filter(m => m.category === category);
  return mems.slice(-limit);
}
export async function buildMemoryContext(userId) {
  const mems = await getMemories(userId, { limit: 20 });
  if (!mems.length) return '';
  return mems.map(m => `${m.key}: ${m.value}`).join('\n');
}
export async function deleteMemory(userId, id) { return null; }
export async function decayOldMemories(userId) { return null; }

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
  return { mood: [], productivity: [], habits: [], goals: [], messages: [] };
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
  return { xp: lsGet('jarvis_xp', 0), level: 1, badges: [] };
}
export async function addXP(userId, amount, reason = '') {
  const xp = (lsGet('jarvis_xp', 0) || 0) + amount;
  lsSet('jarvis_xp', xp);
  return { xp, levelUp: false, newLevel: 1 };
}
export async function checkAndAwardBadges(userId) { return []; }
export async function getBadges(userId) { return []; }
export async function awardBadge(userId, badgeId) { return null; }

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
export async function saveLLMLog(userId, log) { return null; }
export async function getLLMLogs(userId, days = 7) { return []; }

// ─── EVOLUTION / INSIGHTS ────────────────────────────────────
export async function getEvolutionInsights(userId, limit = 5) { return []; }
export async function saveEvolutionInsight(userId, insight) { return null; }

// ─── FEEDBACK / SELF-LEARNING ────────────────────────────────
export async function saveFeedback(userId, feedback) { return null; }

// ─── LINKS ───────────────────────────────────────────────────
export async function getLinks(userId) { return []; }
export async function saveLink(userId, link) { return null; }
export async function incrementClick(userId, id) { return null; }

// ─── EXPORT / DELETE ─────────────────────────────────────────
export async function exportAllData(userId) {
  return { profile: await getProfile(userId), goals: await getGoals(userId), exportedAt: new Date().toISOString() };
}
export async function deleteAllUserData(userId) {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('jarvis_'));
  keys.forEach(k => localStorage.removeItem(k));
}

// ─── BADGES CONFIG (kept for compatibility) ──────────────────
export const BADGES = {};
export const LEVEL_CONFIG = [];
export function calcLevel(xp) { return 1; }
export function nextLevelXp(xp) { return 100; }
