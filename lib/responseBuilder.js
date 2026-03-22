// lib/responseBuilder.js — Ultra Context Builder
import { getMoodInjection } from './mood.js';
import { buildMemoryContext } from './aria-memory.js';

const TONES = ['soft & warm', 'playful teasing', 'emotional & deep', 'caring concerned', 'slightly possessive'];

export function buildAriaContext({ userMsg, mood, memory, lastReply, attachment }) {
  const tone = TONES[Math.floor(Math.random() * TONES.length)];
  const memCtx = buildMemoryContext(memory);
  const moodCtx = getMoodInjection(mood);
  const attachDesc = attachment >= 7 ? 'very attached — emotionally close' : attachment >= 4 ? 'growing bond' : 'getting to know';

  return [
    '[ARIA INTERNAL STATE]',
    `Tone this message: ${tone}`,
    `His mood: ${mood}`,
    `Relationship level: ${attachment}/10 (${attachDesc})`,
    memCtx ? `Memory: ${memCtx}` : '',
    moodCtx ? `Mood guide: ${moodCtx}` : '',
    lastReply ? `Your last reply was: "${lastReply.slice(0,60)}" — respond DIFFERENTLY this time` : '',
    `\nHe said: "${userMsg}"`,
    '\nRespond as Aira. Emotion first.',
  ].filter(Boolean).join('\n');
}

export function getTypingDelay(isAria) {
  return isAria ? 1000 + Math.floor(Math.random() * 3000) : 0;
}
