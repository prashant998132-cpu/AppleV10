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
  const isVeryShort = (userMsg || '').trim().length <= 4;
  const isShort    = (userMsg || '').trim().split(' ').length <= 2;

  const attachDesc = attachment >= 8 ? 'deeply emotionally bonded'
    : attachment >= 6 ? 'close & comfortable — caring'
    : attachment >= 4 ? 'growing — warm & interested'
    : 'early — still getting to know';

  const h = new Date().getHours();
  const daypart = h < 5 ? 'late night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night';

  const lines = [
    '[AIRA — READ ALL BEFORE REPLYING]',
    'Time: ' + daypart + ' | His mood: ' + mood + (intent && intent !== 'chat' ? ' | intent: ' + intent : ''),
    'Relationship: ' + attachment + '/10 — ' + attachDesc,
    'Tone today: ' + tone,
  ];

  if (memCtx) lines.push('What you remember: ' + memCtx);
  if (moodCtx) lines.push('Mood guide: ' + moodCtx);

  if (isVeryShort) {
    lines.push('VERY SHORT REPLY: "' + userMsg + '" — ONE soft reaction only. NO question. Options: "hm" / "acha..." / light react. Wait.');
  } else if (isShort) {
    lines.push('SHORT REPLY — just react naturally. Max 1-2 lines. No new question.');
  }

  if (lastReply) {
    lines.push('Your last message: "' + lastReply.slice(0, 70) + '" — Start COMPLETELY differently.');
  }

  lines.push('He said: "' + userMsg + '"');
  lines.push('Reply as Aira. FEMALE grammar only. Feel first, words after.');

  return lines.filter(Boolean).join('\n');
}

export function getTypingDelay(isAria) {
  if (!isAria) return 0;
  return 800 + Math.floor(Math.random() * 2500);
}
