'use client';
// components/ai/PuterAI.jsx — JARVIS v10.1
// ═══════════════════════════════════════════════════════════════
// Puter.js — Browser-side Claude 3.5 Sonnet (FREE, UNLIMITED)
// No API key needed — runs entirely in browser
// Used as: last server fallback OR direct mode
// ═══════════════════════════════════════════════════════════════
// HOW TO USE in chat page:
//   import { puterChat } from '@/components/ai/PuterAI';
//   const reply = await puterChat(message, history, systemPrompt);
// ═══════════════════════════════════════════════════════════════

// ── Load Puter.js dynamically ─────────────────────────────────
let puterLoaded = false;
let puterLoadPromise = null;

function loadPuter() {
  if (puterLoaded) return Promise.resolve();
  if (puterLoadPromise) return puterLoadPromise;

  puterLoadPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Puter only available in browser'));
      return;
    }

    if (window.puter) {
      puterLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.puter.com/v2/';
    script.async = true;
    script.onload = () => {
      puterLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Puter.js'));
    document.head.appendChild(script);
  });

  return puterLoadPromise;
}

// ── Main chat function ─────────────────────────────────────────
export async function puterChat(userMessage, history = [], systemPrompt = '') {
  await loadPuter();

  if (!window.puter?.ai?.chat) {
    throw new Error('Puter.ai not available');
  }

  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  for (const h of history.slice(-10)) { // Last 10 messages for context
    messages.push({ role: h.role, content: h.content });
  }
  messages.push({ role: 'user', content: userMessage });

  // Claude 3.5 Sonnet via Puter — FREE, UNLIMITED
  const response = await window.puter.ai.chat(messages, {
    model: 'claude-3-5-sonnet',
    // Alternative models available on Puter:
    // 'gpt-4o', 'gpt-4o-mini', 'o1-mini', 'gemini-pro', 'claude-3-opus'
  });

  return {
    text: response?.message?.content || response?.content || String(response),
    provider: 'Puter.js (Claude 3.5 Sonnet)',
    model: 'claude-3-5-sonnet',
    free: true,
  };
}

// ── Streaming version ─────────────────────────────────────────
export async function puterStream(userMessage, history = [], systemPrompt = '', onToken) {
  await loadPuter();
  if (!window.puter?.ai?.chat) throw new Error('Puter.ai not available');

  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  for (const h of history.slice(-10)) {
    messages.push({ role: h.role, content: h.content });
  }
  messages.push({ role: 'user', content: userMessage });

  // Stream response
  const stream = await window.puter.ai.chat(messages, {
    model: 'claude-3-5-sonnet',
    stream: true,
  });

  let fullText = '';
  for await (const part of stream) {
    const token = part?.text || part?.delta?.text || '';
    if (token) {
      fullText += token;
      if (onToken) onToken(token);
    }
  }

  return { text: fullText, provider: 'Puter.js', model: 'claude-3-5-sonnet' };
}

// ── TTS via Puter ─────────────────────────────────────────────
export async function puterSpeak(text, voice = 'en-US-AriaNeural') {
  await loadPuter();
  if (!window.puter?.ai?.txt2speech) throw new Error('Puter TTS not available');

  const audio = await window.puter.ai.txt2speech(text, { voice });
  // Returns an Audio element — play it
  if (audio && typeof audio.play === 'function') {
    audio.play();
    return { playing: true, provider: 'Puter.js TTS' };
  }
  return { error: 'Could not play audio' };
}

// ── Image generation via Puter ────────────────────────────────
export async function puterImage(prompt) {
  await loadPuter();
  if (!window.puter?.ai?.txt2img) throw new Error('Puter image gen not available');

  const img = await window.puter.ai.txt2img(prompt);
  // Returns a blob URL
  return { url: img?.src || img, provider: 'Puter.js (DALL-E)' };
}

// ── React hook for Puter status ───────────────────────────────
import { useState, useEffect } from 'react';

export function usePuterStatus() {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    loadPuter()
      .then(() => setStatus('ready'))
      .catch(() => setStatus('unavailable'));
  }, []);

  return status;
}

// ── Puter Badge Component ─────────────────────────────────────
export function PuterBadge() {
  const status = usePuterStatus();

  if (status !== 'ready') return null;

  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
      <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
      Puter AI Active
    </span>
  );
}
