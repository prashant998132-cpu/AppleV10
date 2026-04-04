// lib/ai/proactive-memory.js — JARVIS Conversation Intelligence
// ═══════════════════════════════════════════════════════════════
// Extracts and stores important facts from every conversation
// ARIA uses this to follow up naturally on past conversations
// No gamification — pure conversational intelligence
// ═══════════════════════════════════════════════════════════════

const CONV_STORE = 'jarvis_conv_memory';
const MAX_FACTS = 100;

// ─── FACT TYPES ──────────────────────────────────────────────
const FACT_PATTERNS = [
  // Work/tasks
  { pattern: /\b(kaam|work|project|task|deadline|submit|meeting|presentation)\b/i, type: 'task', follow: 'Woh {topic} ka kya hua?' },
  // Feelings/problems
  { pattern: /\b(pareshan|tension|stress|dard|hurt|sad|dukhi|problem|issue|trouble)\b/i, type: 'emotion', follow: 'Theek ho abhi? Pehle {topic} ki baat kar rahe the.' },
  // Goals/plans
  { pattern: /\b(plan|sochna|karenge|chahta|chahti|goal|target|achieve)\b/i, type: 'plan', follow: 'Woh {topic} wala plan — kya hua?' },
  // Events/activities
  { pattern: /\b(exam|test|interview|trip|travel|movie|match|event)\b/i, type: 'event', follow: '{topic} kaisa/kaisi raha/rahi?' },
  // Achievements
  { pattern: /\b(complete|khatam|finish|done|achieve|mil gaya|ho gaya|success)\b/i, type: 'win', follow: 'Woh {topic} — congrats btw, kya hua finally?' },
  // Ideas
  { pattern: /\b(idea|soch raha|plan kar raha|sochte hain|kya lagta|should i|karna chahiye)\b/i, type: 'idea', follow: 'Woh {topic} wala idea — aage kya socha?' },
  // Health
  { pattern: /\b(beemar|sick|doctor|tabiyat|health|hospital|dawai)\b/i, type: 'health', follow: 'Tabiyat theek hai ab? {topic} ki baat ho rahi thi.' },
];

// ─── SAVE CONVERSATION FACT ──────────────────────────────────
export function saveConversationFact(userMsg, topic, factType) {
  if (typeof localStorage === 'undefined') return;
  try {
    const facts = JSON.parse(localStorage.getItem(CONV_STORE) || '[]');
    // Avoid duplicates
    const existing = facts.find(f => f.topic?.toLowerCase() === topic?.toLowerCase());
    if (existing) {
      existing.ts = Date.now();
      existing.count = (existing.count || 1) + 1;
    } else {
      facts.unshift({ topic, type: factType, ts: Date.now(), count: 1, followedUp: false });
    }
    if (facts.length > MAX_FACTS) facts.splice(MAX_FACTS);
    localStorage.setItem(CONV_STORE, JSON.stringify(facts));
  } catch {}
}

// ─── AUTO-EXTRACT FACTS FROM MESSAGE ────────────────────────
export function extractConversationFacts(userMsg) {
  if (!userMsg || userMsg.length < 10) return [];
  const facts = [];
  for (const fp of FACT_PATTERNS) {
    if (fp.pattern.test(userMsg)) {
      // Extract the relevant noun/topic near the matched word
      const words = userMsg.split(/\s+/);
      const topic = words.slice(0, 6).join(' ').slice(0, 50);
      facts.push({ topic, type: fp.type, followTemplate: fp.follow });
    }
  }
  return facts;
}

// ─── GET PENDING FOLLOW-UPS ──────────────────────────────────
export function getPendingFollowUps(maxAge = 72 * 3600000) { // 72 hours
  if (typeof localStorage === 'undefined') return [];
  try {
    const facts = JSON.parse(localStorage.getItem(CONV_STORE) || '[]');
    const now = Date.now();
    return facts
      .filter(f => !f.followedUp && (now - f.ts) > 3600000 && (now - f.ts) < maxAge)
      .slice(0, 3);
  } catch { return []; }
}

// ─── MARK FOLLOWED UP ────────────────────────────────────────
export function markFollowedUp(topic) {
  if (typeof localStorage === 'undefined') return;
  try {
    const facts = JSON.parse(localStorage.getItem(CONV_STORE) || '[]');
    const f = facts.find(f => f.topic === topic);
    if (f) { f.followedUp = true; f.followedUpAt = Date.now(); }
    localStorage.setItem(CONV_STORE, JSON.stringify(facts));
  } catch {}
}

// ─── BUILD PROACTIVE CONTEXT FOR AI ─────────────────────────
// Gives AI awareness of pending follow-ups
export function buildProactiveContext(pendingFollowUps) {
  if (!pendingFollowUps?.length) return '';
  const items = pendingFollowUps.map(f => {
    const hoursAgo = Math.round((Date.now() - f.ts) / 3600000);
    return `• "${f.topic}" — ${hoursAgo}h pehle baat hui thi (type: ${f.type})`;
  }).join('\n');
  return `\n[FOLLOW-UP OPPORTUNITIES — agar natural lage toh reference karo:\n${items}]`;
}

// ─── SMART MEMORY COMPRESSION ───────────────────────────────
// Takes conversation history and extracts key facts to save
export function compressConversation(history, maxMessages = 20) {
  if (!history || history.length < 10) return null;
  
  const older = history.slice(0, -maxMessages);
  if (older.length < 5) return null;
  
  // Extract key facts from older messages
  const facts = [];
  for (const msg of older) {
    if (msg.role !== 'user') continue;
    const extracted = extractConversationFacts(msg.content || '');
    facts.push(...extracted);
  }
  
  return facts.length > 0 ? facts : null;
}

// ─── GET CONVERSATION MEMORY SUMMARY ────────────────────────
export function getConversationMemorySummary() {
  if (typeof localStorage === 'undefined') return '';
  try {
    const facts = JSON.parse(localStorage.getItem(CONV_STORE) || '[]');
    if (!facts.length) return '';
    const recent = facts.slice(0, 5);
    return recent.map(f => {
      const hoursAgo = Math.round((Date.now() - f.ts) / 3600000);
      return `${f.topic} (${hoursAgo}h ago)`;
    }).join(', ');
  } catch { return ''; }
}
