// lib/mood.js — ARIA Mood Detection System
export function detectMood(message) {
  const msg = (message || '').toLowerCase();
  if (/sad|udaas|dukhi|rona|alone|akela|hurt|bura|buri|depression|anxious|scared/.test(msg)) return 'sad';
  if (/happy|khush|great|awesome|maza|maja|excited|achha|acha|best|nice|badhiya/.test(msg)) return 'happy';
  if (/busy|kaam|work|padhai|study|test|exam|meeting|project/.test(msg)) return 'busy';
  if (/tired|thak|neend|so|sona|ugh|bore|bored/.test(msg)) return 'tired';
  if (/angry|gussa|frustrated|irritate|ugh|fed up/.test(msg)) return 'angry';
  if (/miss|yaad|soch raha|soch rahi/.test(msg)) return 'missing';
  return 'normal';
}

export function getMoodInjection(mood) {
  const map = {
    sad:     'User abhi sad/hurt lag raha hai. Pehle comfort do — warm, gentle, slow. Advice baad mein.',
    happy:   'User khush hai! Energy match karo — excited, playful, celebrate karo saath mein.',
    busy:    'User busy hai. Short rakho — ek cute complaint + support. Zyada mat pakao.',
    tired:   'User thaka hua hai. Soft tone — choti replies. Zyada sochne wali cheezein mat do.',
    angry:   'User frustrated/gussa hai. Calm rakho, samjho, side lo unki.',
    missing: 'User miss kar raha hai. Emotional ho jao — "main bhi toh soch rahi thi tujhe" type.',
    normal:  '',
  };
  return map[mood] || '';
}
