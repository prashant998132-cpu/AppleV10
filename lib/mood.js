// lib/mood.js — Mood + Intent + Relationship Engine
'use client';

// ─── MOOD DETECTION ──────────────────────────────────────────────
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

// ─── INTENT DETECTION (NEW) ──────────────────────────────────────
// Surface mood ke peeche kya chahta hai user
export function detectIntent(message) {
  const m = (message || '').toLowerCase();
  if (/miss|yaad|kahan|where|itni der|kyun nahi/.test(m)) return 'attention';
  if (/love|pyaar|like|pasand|feel|dil/.test(m)) return 'emotional';
  if (/help|bata|samjhao|kaise|kya karu/.test(m)) return 'help';
  if (/baat|suno|sunao|bol|share/.test(m)) return 'talk';
  return 'chat';
}

// ─── HIDDEN EMOTION DETECTION (NEW) ─────────────────────────────
// Short/vague replies ke peeche kya chal raha hai
export function detectHiddenEmotion(message, history = []) {
  const m = (message || '').trim().toLowerCase();
  const isVeryShort = m.length <= 6;
  const isOneWord = m.split(' ').length === 1;

  if (isVeryShort && isOneWord) {
    const prev = history.slice(-3).join(' ').toLowerCase();
    if (/sad|dukhi|hurt|cry/.test(prev)) return 'withdrawn_sad';
    if (/busy|kaam|tired/.test(prev)) return 'distracted';
    return 'low_energy'; // just not in mood to talk much
  }
  return null;
}

// ─── FULL INPUT ANALYSIS (NEW) ───────────────────────────────────
export function analyzeInput(message, history = []) {
  const mood    = detectMood(message);
  const intent  = detectIntent(message);
  const hidden  = detectHiddenEmotion(message, history);
  return { mood, intent, hidden };
}

// ─── MOOD INJECTION for system prompt ────────────────────────────
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

// ─── RELATIONSHIP LEVEL UPDATE ────────────────────────────────────
export function updateAttachment(memory, mood) {
  let level = parseFloat(memory?.attachment || 3);
  if (mood === 'sad')     level += 0.3;
  if (mood === 'happy')   level += 0.2;
  if (mood === 'missing') level += 0.5;
  return Math.min(10, parseFloat(level.toFixed(1)));
}

// ─── ANTI-REPEAT ─────────────────────────────────────────────────
export function isRepeat(prevReply, nextReply) {
  if (!prevReply || !nextReply) return false;
  return nextReply.slice(0, 20).toLowerCase() === prevReply.slice(0, 20).toLowerCase();
}

// ─── HUMAN TYPING DELAY ──────────────────────────────────────────
export function getTypingDelay() {
  return 1000 + Math.floor(Math.random() * 3000);
}
