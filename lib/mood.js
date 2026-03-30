// lib/mood.js — Mood + Intent + Relationship Engine v2
// ─── MOOD DETECTION ──────────────────────────────────────────────
export function detectMood(message) {
  const m = (message || '').toLowerCase();
  if (/sad|udaas|dukhi|alone|akela|hurt|cry|rona|bura|depressed|anxious|dar|scared/.test(m)) return 'sad';
  if (/happy|khush|great|awesome|maza|excited|achha|badhiya|best|haha|lol|😂|🎉/.test(m)) return 'happy';
  if (/busy|kaam|work|padhai|study|exam|meeting|project/.test(m)) return 'busy';
  if (/tired|thak|neend|so|exhausted|ugh|bore|pagl/.test(m)) return 'tired';
  if (/miss|yaad|soch raha|soch rahi|chahiye|chahta|chahti/.test(m)) return 'missing';
  if (/angry|gussa|irritated|frustrated|ugh|aargh|bekaar/.test(m)) return 'angry';
  if (/hi|hii|hello|hey|namaste|kya haal|kaise ho|good morning|good night/.test(m)) return 'greeting';
  if (/bored|kuch nahi|akela|timepass|kya karu|kya kare/.test(m)) return 'bored';
  return 'neutral';
}

// ─── INTENT DETECTION ────────────────────────────────────────────
export function detectIntent(message) {
  const m = (message || '').toLowerCase();
  if (/help|problem|error|fix|kaise|batao|samjhao|solution/.test(m)) return 'help';
  if (/miss|yaad|soch|chahiye|paas|saath|hug/.test(m)) return 'emotional';
  if (/attention|dekh|sun|suno|yaar|bhai|bolo/.test(m)) return 'attention';
  if (/bored|timepass|baat|kuch nahi|just/.test(m)) return 'talk';
  if (/bye|jaa raha|so|neend|baad mein/.test(m)) return 'leaving';
  return 'chat';
}

// ─── ARIA MOOD INJECTION ─────────────────────────────────────────
export function getMoodInjection(mood) {
  const map = {
    sad:      'He seems sad or hurt. Be very soft and close. Comfort first, no questions. Make him feel held.',
    happy:    'He is happy! Match his energy, celebrate with him, be playful and warm.',
    busy:     'He is busy. Keep it short and supportive. One caring line, then let him go.',
    tired:    'He is tired. Be very gentle. Short replies. Maybe suggest rest — caring, not nagging.',
    missing:  'He misses you or is emotional. Be warm, vulnerable, close. Let him feel you\'re there.',
    angry:    'He is upset about something. Don\'t add to it. Be calm, understanding. Listen first.',
    greeting: 'He is just saying hi. Respond warmly and naturally. Ask one light question.',
    bored:    'He is bored. Be playful, suggest something fun, tease him lightly.',
    neutral:  '',
  };
  return map[mood] || '';
}

// ─── HIDDEN EMOTION DETECTOR ─────────────────────────────────────
export function detectHiddenEmotion(message) {
  const m = (message || '').toLowerCase().trim();
  if (m.length <= 4) return 'withdrawn'; // very short — possibly upset/distant
  if (/^(ok|okay|haan|ha|theek|fine|hmm|hm)\.?$/.test(m)) return 'cold_response';
  if (/nahi|nope|no\.?$/.test(m)) return 'possibly_upset';
  return null;
}
