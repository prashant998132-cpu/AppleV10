// lib/aria-memory.js — ARIA Memory System
export function getAriaMemory() {
  try {
    const data = localStorage.getItem('aira_memory');
    return data ? JSON.parse(data) : {};
  } catch { return {}; }
}

export function saveAriaMemory(newData) {
  try {
    const old = getAriaMemory();
    const updated = { ...old, ...newData, lastSeen: Date.now() };
    localStorage.setItem('aira_memory', JSON.stringify(updated));
    return updated;
  } catch { return newData; }
}

export function buildMemoryContext(memory) {
  const parts = [];
  if (memory.name) parts.push(`User ka naam: ${memory.name}`);
  if (memory.lastTopic) parts.push(`Last topic: ${memory.lastTopic}`);
  if (memory.lastSeen) {
    const hours = Math.round((Date.now() - memory.lastSeen) / 3600000);
    if (hours > 2) parts.push(`${hours} ghante baad aaya hai`);
  }
  if (memory.studyMode) parts.push('NEET ki padhai kar raha hai');
  if (memory.mood) parts.push(`Last mood: ${memory.mood}`);
  return parts.join('. ');
}

// Extract and save from conversation
export function extractMemoryFromMsg(msg, reply) {
  const updates = {};
  const m = msg.toLowerCase();
  // Extract name if mentioned
  const nameMatch = msg.match(/mera naam (\w+)/i) || msg.match(/main (\w+) hoon/i);
  if (nameMatch) updates.name = nameMatch[1];
  // Track topics
  if (/neet|padhai|study|exam/.test(m)) updates.studyMode = true;
  updates.lastTopic = msg.slice(0, 60);
  return updates;
}
