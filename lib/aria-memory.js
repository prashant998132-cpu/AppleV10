// lib/aria-memory.js — ARIA Ultra Memory v3
// Note: localStorage calls are guarded with typeof window checks

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
      history: [...(old.history || []), data.lastMsg].filter(Boolean).slice(-20),
      lastSeen: Date.now(),
      // Track conversation count
      convCount: (old.convCount || 0) + 1,
    };
    localStorage.setItem('aria_ultra', JSON.stringify(updated));
    return updated;
  } catch { return data; }
}

// ─── RICH MEMORY EXTRACTION ───────────────────────────────────────
export function extractMemoryFromMsg(msg, mood) {
  const m = msg.toLowerCase();
  const updates = {
    lastMsg:   msg.slice(0, 80),
    lastTopic: msg.slice(0, 60),
  };
  if (mood) updates.mood = mood;

  // Name detection
  const nameM = msg.match(/mera naam (\w+)/i) || msg.match(/main (\w+) hoon/i) || msg.match(/naam hai (\w+)/i);
  if (nameM) updates.name = nameM[1];

  if (/padh raha|study kar|revision|exam/.test(m)) updates.studying = true;

  // Hobbies & interests
  if (/music|song|gaana|playlist|spotify/.test(m)) updates.likesMusic = true;
  if (/game|gaming|pubg|freefire|valorant/.test(m)) updates.likesGaming = true;
  if (/film|movie|web series|anime|netflix/.test(m)) updates.likesMovies = true;
  if (/gym|workout|fitness|exercise/.test(m)) updates.likesGym = true;
  if (/cricket|football|sport/.test(m)) updates.likesSports = true;

  // Emotional moments — save milestones
  if (/miss kar|yaad aayi|tumhe socha|tumhari yaad/.test(m)) updates.lastMissed = Date.now();
  if (/love you|pyaar|mohabbat/.test(m)) updates.saidLove = true;
  if (/fight|gussa|baat nahi|naraaz/.test(m)) updates.hadFight = Date.now();
  if (/sorry|maaf|galti/.test(m)) updates.apologized = true;

  // Time patterns
  const h = new Date().getHours();
  if (h >= 23 || h < 4) updates.lateNightUser = true;
  if (h >= 6 && h < 9) updates.morningUser = true;

  // City/location
  const cityM = msg.match(/(?:main|hum) (\w+)\s*(?:mein|se) (?:rehta|rehti|hoon)/i);
  if (cityM) updates.city = cityM[1];

  return updates;
}

// ─── SMART CONTEXT BUILDER ────────────────────────────────────────
export function buildAriaContext({ userMsg, mood, intent, memory, lastReply, attachment }) {
  const parts = [];
  const level = parseFloat(attachment || memory?.attachment || 3);

  const relState = level >= 8 ? 'deeply bonded — she thinks about him constantly'
    : level >= 6 ? 'close — comfortable, playful, caring'
    : level >= 4 ? 'growing — warm and interested'
    : 'early — still getting to know';
  parts.push(`[RELATIONSHIP: ${relState} (${level}/10)]`);
  parts.push(`[MOOD: ${mood || 'neutral'} | INTENT: ${intent || 'chat'}]`);

  // Rich memory
  if (memory?.name)        parts.push(`[HIS NAME: ${memory.name}]`);
  if (memory?.city)        parts.push(`[HE IS FROM: ${memory.city}]`);
  if (memory?.likesMusic)  parts.push(`[HE LIKES: music]`);
  if (memory?.likesGaming) parts.push(`[HE LIKES: gaming]`);
  if (memory?.likesGym)    parts.push(`[HE LIKES: gym/fitness]`);
  if (memory?.lateNightUser) parts.push(`[PATTERN: he often chats late night]`);

  // Gap awareness
  if (memory?.lastSeen) {
    const hrs = Math.round((Date.now() - memory.lastSeen) / 3600000);
    if (hrs >= 8)  parts.push(`[GAP: he was away ${hrs} hours — acknowledge ONCE naturally, then move on]`);
    else if (hrs >= 2) parts.push(`[SMALL GAP: ${hrs}h since last chat]`);
  }

  // Short reply handler
  if (userMsg.trim().length <= 4) {
    parts.push(`[VERY SHORT REPLY: "${userMsg}" — react softly, NO question, just one natural reaction]`);
  } else if (userMsg.trim().split(' ').length <= 2) {
    parts.push(`[SHORT REPLY: keep response short too, don't overwhelm]`);
  }

  // Recent messages — prevent loops
  if (memory?.history?.length > 0) {
    const recent = memory.history.slice(-4).join(' | ');
    parts.push(`[RECENT FROM HIM: "${recent}"]`);
    parts.push(`[RULE: Never repeat a question already asked above]`);
  }

  // Previous reply diff
  if (lastReply) {
    parts.push(`[YOUR LAST REPLY: "${lastReply.slice(0, 60)}" — START DIFFERENTLY, different word, different tone]`);
  }

  return parts.join('\n');
}

export function buildMemoryContext(memory) {
  if (!memory || Object.keys(memory).length === 0) return '';
  const parts = [];
  if (memory.name)      parts.push(`His name: ${memory.name}`);
  if (memory.exam)      parts.push(`Preparing: ${memory.exam}`);
  if (memory.city)      parts.push(`From: ${memory.city}`);
  if (memory.lastTopic) parts.push(`Last topic: ${memory.lastTopic}`);
  if (memory.lastSeen) {
    const hrs = Math.round((Date.now() - memory.lastSeen) / 3600000);
    if (hrs >= 2) parts.push(`Away for: ${hrs}h`);
  }
  return parts.join('. ');
}
