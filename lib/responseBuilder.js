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

  // ARIA 2.0 — use rich memory if available
  const xp = memory?.xp || 0;
  const streak = memory?.streak || 0;
  const facts = memory?.facts || {};
  const recentTopics = memory?.recentTopics?.slice(-3).join(', ') || '';
  const likes = memory?.likes?.slice(-5).join(', ') || '';
  const moments = memory?.moments?.slice(-2).map(m=>m.text||m).join(' | ') || '';
  const gapMsg = (() => {
    if (!memory?.lastSeen) return null;
    const hrs = Math.round((Date.now() - memory.lastSeen) / 3600000);
    if (hrs < 1) return null;
    if (hrs < 3) return `thodi der baad aaya`;
    if (hrs < 8) return `${hrs} ghante baad — ek baar acknowledge karo, phir normal`;
    if (hrs < 24) return `itne ghante kaahan tha — ek baar poocho, possessive mat ho`;
    return `${Math.floor(hrs/24)} din baad aaya — emotional greeting, phir normal`;
  })();

  const lines = [
    '[AIRA — READ ALL BEFORE REPLYING]',
    'Time: ' + daypart + ' | His mood: ' + mood + (intent && intent !== 'chat' ? ' | intent: ' + intent : ''),
    'Relationship: ' + attachment.toFixed(1) + '/10 — ' + attachDesc + (xp > 0 ? ' (' + xp + ' XP, ' + streak + ' day streak)' : ''),
    'Tone today: ' + tone,
  ];

  if (facts.name) lines.push('His name: ' + facts.name);
  else if (memCtx) lines.push('What you remember: ' + memCtx);
  if (likes) lines.push('He likes: ' + likes);
  if (recentTopics) lines.push('Recent topics: ' + recentTopics);
  if (moments) lines.push('Special moments: ' + moments);
  if (gapMsg) lines.push('GAP: ' + gapMsg);
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
