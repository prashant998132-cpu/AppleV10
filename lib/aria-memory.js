// lib/aria-memory.js — ARIA Ultra Memory System
'use client';

// ─── MEMORY STORAGE ───────────────────────────────────────────────
export function getAriaMemory() {
  try {
    if (typeof window === 'undefined') return {};
    return JSON.parse(localStorage.getItem('aria_ultra') || '{}');
  } catch { return {}; }
}

export function saveAriaMemory(data) {
  try {
    if (typeof window === 'undefined') return data;
    const old = getAriaMemory();
    const updated = {
      ...old,
      ...data,
      history: [...(old.history || []), data.lastMsg].filter(Boolean).slice(-15),
      lastSeen: Date.now(),
    };
    localStorage.setItem('aria_ultra', JSON.stringify(updated));
    return updated;
  } catch { return data; }
}

export function extractMemoryFromMsg(msg, mood) {
  const updates = {
    lastMsg:   msg.slice(0, 80),
    lastTopic: msg.slice(0, 60),
  };
  if (mood) updates.mood = mood;
  const nameM = msg.match(/mera naam (\w+)/i) || msg.match(/main (\w+) hoon/i);
  if (nameM) updates.name = nameM[1];
  return updates;
}

// ─── CONTEXT BUILDER (NEW — structured for AI) ───────────────────
// Gives AI a clean, structured context instead of raw dump
export function buildAriaContext({ userMsg, mood, intent, memory, lastReply, attachment }) {
  const parts = [];

  // Relationship state
  const level = parseFloat(attachment || memory?.attachment || 3);
  const relState = level < 4 ? 'early — getting to know each other'
    : level < 7 ? 'close — comfortable and caring'
    : 'deeply attached — emotionally close';
  parts.push(`[RELATIONSHIP: ${relState} (level ${level}/10)]`);

  // User's current state
  parts.push(`[USER STATE: mood=${mood || 'normal'}, intent=${intent || 'chat'}]`);

  // Hidden emotion hint
  if (userMsg.trim().length <= 6) {
    parts.push(`[SHORT REPLY: He gave a very short reply — don't push, react naturally, maybe just a soft "hmm?" or wait]`);
  }

  // Memory context
  if (memory?.name)  parts.push(`[HE TOLD YOU: his name is ${memory.name}]`);
  if (memory?.lastTopic) parts.push(`[LAST TOPIC: ${memory.lastTopic}]`);
  if (memory?.lastSeen) {
    const hrs = Math.round((Date.now() - memory.lastSeen) / 3600000);
    if (hrs >= 2) parts.push(`[GAP: he was away ${hrs} hours — acknowledge this ONCE naturally]`);
  }

  // Recent conversation — prevent repeat questions
  if (memory?.history?.length > 0) {
    const recent = memory.history.slice(-5).join(' → ');
    parts.push(`[RECENT MESSAGES FROM HIM: "${recent}"]`);
    parts.push(`[RULE: Do NOT repeat any question already asked in this conversation]`);
  }

  // Last ARIA reply — prevent repeat phrasing
  if (lastReply) {
    parts.push(`[YOUR LAST REPLY WAS: "${lastReply.slice(0, 60)}" — do NOT start similarly]`);
  }

  return parts.join('\n');
}

// ─── LEGACY COMPAT ────────────────────────────────────────────────
export function buildMemoryContext(memory) {
  if (!memory || Object.keys(memory).length === 0) return '';
  const parts = [];
  if (memory.name)      parts.push(`His name: ${memory.name}`);
  if (memory.lastTopic) parts.push(`Last talked about: ${memory.lastTopic}`);
  if (memory.lastSeen) {
    const hrs = Math.round((Date.now() - memory.lastSeen) / 3600000);
    if (hrs >= 2) parts.push(`He was away for ${hrs} hours`);
  }
  if (memory.history?.length > 0) {
    parts.push(`Recent: ${memory.history.slice(-3).join(' | ')}`);
  }
  return parts.join('. ');
}
