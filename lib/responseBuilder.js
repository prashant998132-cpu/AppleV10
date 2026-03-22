// lib/responseBuilder.js — Ultra Context Builder v2
import { getMoodInjection } from './mood.js';
import { buildMemoryContext } from './aria-memory.js';

const TONES = ['soft & warm', 'playful teasing', 'emotional & deep', 'caring concerned', 'slightly possessive'];

export function buildAriaContext({ userMsg, mood, intent, memory, lastReply, attachment }) {
  const tone       = TONES[Math.floor(Math.random() * TONES.length)];
  const memCtx     = buildMemoryContext(memory);
  const moodCtx    = getMoodInjection(mood);
  const isShort    = (userMsg || '').trim().length <= 6;
  const attachDesc = attachment >= 7 ? 'deeply attached — emotionally close'
    : attachment >= 4 ? 'growing bond — caring and warm'
    : 'early — getting to know';

  return [
    '[AIRA — THINK BEFORE REPLYING]',
    `His mood: ${mood}${intent && intent !== 'chat' ? ` | intent: ${intent}` : ''}`,
    `Relationship: ${attachment}/10 (${attachDesc})`,
    `Tone for this reply: ${tone}`,
    memCtx  ? `Memory: ${memCtx}` : '',
    moodCtx ? `Guide: ${moodCtx}` : '',
    isShort ? `SHORT REPLY DETECTED: He is not saying much. ONE soft reaction only — do NOT ask a new question. Wait.` : '',
    lastReply ? `Your last reply: "${lastReply.slice(0, 60)}" — respond DIFFERENTLY, new phrasing` : '',
    `\nHe said: "${userMsg}"`,
    '\nRespond as Aira. Feel first, then words.',
  ].filter(Boolean).join('\n');
}

export function getTypingDelay(isAria) {
  return isAria ? 1000 + Math.floor(Math.random() * 3000) : 0;
}
