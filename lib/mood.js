// lib/mood.js — Ultra Mood + Relationship Engine
export function detectMood(message) {
  const m = (message || '').toLowerCase();
  if (/sad|udaas|dukhi|alone|akela|hurt|cry|rona|bura|depressed|anxious/.test(m)) return 'sad';
  if (/happy|khush|great|awesome|maza|excited|achha|badhiya|best/.test(m)) return 'happy';
  if (/busy|kaam|work|padhai|study|exam|meeting/.test(m)) return 'busy';
  if (/tired|thak|neend|bore|ugh/.test(m)) return 'tired';
  if (/gussa|angry|frustrated|irritate/.test(m)) return 'angry';
  if (/miss|yaad|soch raha|soch rahi|where are you/.test(m)) return 'missing';
  return 'normal';
}

export function getMoodInjection(mood) {
  const map = {
    sad:     'He seems sad/hurt. Comfort first, slow tone, stay close emotionally.',
    happy:   'He is happy! Match energy — excited, celebrate together.',
    busy:    'He is busy. Keep short — one cute complaint + support.',
    tired:   'He is tired. Soft, short replies. Do not overload.',
    angry:   'He is frustrated. Be calm, take his side, soothe.',
    missing: 'He is missing you. Be emotional — "main bhi soch rahi thi" type.',
    normal:  '',
  };
  return map[mood] || '';
}

export function updateAttachment(memory, mood) {
  let level = parseFloat(memory?.attachment || 3);
  if (mood === 'sad') level += 0.3;
  else if (mood === 'happy') level += 0.2;
  else if (mood === 'missing') level += 0.5;
  return Math.min(10, parseFloat(level.toFixed(1)));
}

export function isRepeat(prevReply, nextReply) {
  if (!prevReply || !nextReply) return false;
  return nextReply.slice(0, 20).toLowerCase() === prevReply.slice(0, 20).toLowerCase();
}

export function getTypingDelay() {
  return 1000 + Math.floor(Math.random() * 3000);
}
