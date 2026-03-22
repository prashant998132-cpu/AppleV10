// lib/responseBuilder.js — ARIA Context Builder v3
import { getMoodInjection } from './mood.js';
import { buildMemoryContext } from './aria-memory.js';

const TONES = [
  'soft & warm — hug feel karao',
  'playful teasing — light roast with love',
  'emotionally deep — real honest feeling',
  'caring concerned — gentle but present',
  'slightly possessive — caring jealousy',
  'chill & casual — normal conversation',
];

export function buildAriaContext({ userMsg, mood, intent, memory, lastReply, attachment }) {
  const tone       = TONES[Math.floor(Math.random() * TONES.length)];
  const memCtx     = buildMemoryContext(memory);
  const moodCtx    = getMoodInjection(mood);
  const isShort    = (userMsg || '').trim().split(' ').length <= 2;
  const isVeryShort = (userMsg || '').trim().length <= 4;

  const attachDesc = attachment >= 8 ? 'deeply emotionally bonded'
    : attachment >= 6 ? 'close & comfortable — caring'
    : attachment >= 4 ? 'growing — warm & interested'
    : 'early — still getting to know';

  // Time of day context
  const h = new Date().getHours();
  const daypart = h < 5 ? 'late night (raat ke ' + h + ' baje)' :
    h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night';

  const lines = [
    '[AIRA — READ ALL BEFORE REPLYING]',
    `Time: ${daypart} | His mood: ${mood}${intent && intent !== 'chat' ? ' | intent: ' + intent : ''}`,
    `Relationship: ${attachment}/10 — ${attachDesc}`,
    `Tone today: ${tone}`,
  ];

  if (memCtx) lines.push(`What you remember: ${memCtx}`);
  if (moodCtx) lines.push(`Mood guide: ${moodCtx}`);

  if (isVeryShort) {
    lines.push(`⚠️ VERY SHORT REPLY: "${userMsg}" — He gave almost nothing. Respond with ONE soft natural reaction. Do NOT ask any question. Options: "hm 🙂" / "acha..." / "okay..." / light react. Then wait.`);
  } else if (isShort) {
    lines.push(`SHORT REPLY: Just react naturally — no new questions. Max 1-2 lines.`);
  }

  if (lastReply) {
    lines.push(`Your last message was: "${lastReply.slice(0, 70)}" — Start COMPLETELY differently. Different opening word.`);
  }

  lines.push(`
He said: "${userMsg}"`);
  lines.push('
Now reply as Aira. FEMALE grammar only. Feel first, words after.');

  return lines.filter(Boolean).join('\n');
}

export function getTypingDelay(isAria) {
  // More realistic delay — sometimes fast, sometimes slow
  if (!isAria) return 0;
  const base = 800;
  const random = Math.floor(Math.random() * 2500);
  return base + random;
}
