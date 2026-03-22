// lib/aria-memory.js — Ultra Memory System
export function getAriaMemory() {
  try { return JSON.parse(localStorage.getItem('aira_ultra') || '{}'); } catch { return {}; }
}

export function saveAriaMemory(data) {
  try {
    const old = getAriaMemory();
    const updated = {
      ...old, ...data,
      history: [...(old.history || []), data.lastMsg].filter(Boolean).slice(-10),
      lastSeen: Date.now(),
    };
    localStorage.setItem('aira_ultra', JSON.stringify(updated));
    return updated;
  } catch { return data; }
}

export function buildMemoryContext(memory) {
  if (!memory || Object.keys(memory).length === 0) return '';
  const parts = [];
  if (memory.name) parts.push(`His name: ${memory.name}`);
  if (memory.lastTopic) parts.push(`Last talked about: ${memory.lastTopic}`);
  if (memory.lastSeen) {
    const hrs = Math.round((Date.now() - memory.lastSeen) / 3600000);
    if (hrs >= 2) parts.push(`He was away for ${hrs} hours`);
  }
  if (memory.history?.length > 0) parts.push(`Recent: ${memory.history.slice(-3).join(' | ')}`);
  return parts.join('. ');
}

export function extractMemoryFromMsg(msg) {
  const updates = { lastMsg: msg.slice(0, 80), lastTopic: msg.slice(0, 60) };
  const nameM = msg.match(/mera naam (\w+)/i) || msg.match(/main (\w+) hoon/i);
  if (nameM) updates.name = nameM[1];
  return updates;
}
