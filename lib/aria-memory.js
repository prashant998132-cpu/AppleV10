// lib/aria-memory.js — ARIA Memory System (SSR-safe)
'use client';

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
      ...old, ...data,
      // Last 15 messages for better context
      history: [...(old.history || []), data.lastMsg].filter(Boolean).slice(-15),
      lastSeen: Date.now(),
    };
    localStorage.setItem('aria_ultra', JSON.stringify(updated));
    return updated;
  } catch { return data; }
}

export function buildMemoryContext(memory) {
  if (!memory || Object.keys(memory).length === 0) return '';
  const parts = [];
  if (memory.name)      parts.push(`His name: ${memory.name}`);
  if (memory.mood)      parts.push(`His current mood: ${memory.mood}`);
  if (memory.lastTopic) parts.push(`Last topic: ${memory.lastTopic}`);
  if (memory.lastSeen) {
    const hrs = Math.round((Date.now() - memory.lastSeen) / 3600000);
    if (hrs >= 2) parts.push(`He was away for ${hrs} hours — acknowledge this once`);
  }
  // Give AI recent conversation context so it doesn't repeat questions
  if (memory.history?.length > 0) {
    parts.push(`Recent messages from him: "${memory.history.slice(-5).join('" → "')}"`);
    parts.push(`Do NOT repeat questions already asked in this conversation`);
  }
  return parts.join('. ');
}

export function extractMemoryFromMsg(msg, mood) {
  const updates = {
    lastMsg: msg.slice(0, 80),
    lastTopic: msg.slice(0, 60),
  };
  if (mood) updates.mood = mood;
  const nameM = msg.match(/mera naam (\w+)/i) || msg.match(/main (\w+) hoon/i);
  if (nameM) updates.name = nameM[1];
  return updates;
}
