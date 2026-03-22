// lib/responseBuilder.js — ARIA Response Context Builder
import { getMoodInjection } from './mood.js';
import { buildMemoryContext } from './aria-memory.js';

const TONES = ['soft', 'playful', 'teasing', 'emotional', 'caring'];

export function buildAriaContext({ userMsg, mood, memory, lastReply }) {
  const randomTone = TONES[Math.floor(Math.random() * TONES.length)];
  const memCtx = buildMemoryContext(memory);
  const moodCtx = getMoodInjection(mood);
  return `
[ARIA CONTEXT]
Tone this reply: ${randomTone}
User mood: ${mood}
${memCtx ? `Memory: ${memCtx}` : ''}
${moodCtx ? `Mood instruction: ${moodCtx}` : ''}
${lastReply ? `Teri last reply thi: "${lastReply.slice(0,80)}" — ALAG reply de, repeat mat karna` : ''}

User said: "${userMsg}"
`;
}

export function getTypingDelay() {
  return 800 + Math.floor(Math.random() * 1800); // 0.8s to 2.6s
}
