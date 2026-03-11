'use client';
// components/chat/WakeWord.jsx — "Hey JARVIS" continuous wake word detection
// ════════════════════════════════════════════════════════════════════════════
// Uses Web Speech API (Chrome/Android Chrome — free, no API key needed)
// Continuously listens in background → activates on "Hey JARVIS" / "JARVIS"
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState, useCallback } from 'react';

const WAKE_WORDS = ['hey jarvis', 'jarvis', 'hey jarwis', 'jarwis', 'hey jarvis', 'jai jarvis', 'hei jarvis'];
const LISTEN_LANG = 'hi-IN'; // Hinglish detection better in hi-IN

export function useWakeWord({ onWake, onCommand, enabled = true }) {
  const srRef      = useRef(null);
  const activeRef  = useRef(false);
  const [listening, setListening]       = useState(false);
  const [wakeDetected, setWakeDetected] = useState(false);
  const [lastCommand, setLastCommand]   = useState('');
  const restartTimer = useRef(null);

  const startListening = useCallback(() => {
    if (!enabled) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return; // Browser doesn't support

    try {
      const sr = new SR();
      sr.continuous      = true;
      sr.interimResults  = true;
      sr.lang            = LISTEN_LANG;
      sr.maxAlternatives = 3;
      srRef.current      = sr;

      sr.onstart = () => {
        setListening(true);
        activeRef.current = true;
      };

      sr.onresult = (e) => {
        let transcript = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          transcript += e.results[i][0].transcript.toLowerCase();
        }

        // Wake word check
        const isWake = WAKE_WORDS.some(w => transcript.includes(w));

        if (isWake) {
          setWakeDetected(true);

          // Extract command after wake word
          let command = transcript;
          for (const w of WAKE_WORDS) {
            command = command.replace(w, '').trim();
          }

          setLastCommand(command);

          // Vibrate on wake (mobile feedback)
          navigator.vibrate?.([100, 50, 100]);

          if (command.length > 2) {
            // Has command after wake word → process it
            onCommand?.(command);
            setWakeDetected(false);
            setTimeout(() => setLastCommand(''), 3000);
          } else {
            // Just wake word → activate mic for next command
            onWake?.();
            setTimeout(() => setWakeDetected(false), 5000);
          }
        }
      };

      sr.onerror = (e) => {
        if (e.error === 'no-speech' || e.error === 'audio-capture') {
          // Normal — restart quietly
        }
        // Don't restart on 'not-allowed' (permission denied)
        if (e.error !== 'not-allowed') {
          scheduleRestart();
        }
      };

      sr.onend = () => {
        setListening(false);
        if (activeRef.current) {
          scheduleRestart(); // Auto-restart for continuous listening
        }
      };

      sr.start();
    } catch { /* Browser restriction */ }
  }, [enabled, onWake, onCommand]);

  function scheduleRestart() {
    clearTimeout(restartTimer.current);
    restartTimer.current = setTimeout(() => {
      if (activeRef.current) startListening();
    }, 1000);
  }

  function stop() {
    activeRef.current = false;
    clearTimeout(restartTimer.current);
    srRef.current?.stop();
    setListening(false);
    setWakeDetected(false);
  }

  function start() {
    activeRef.current = true;
    startListening();
  }

  // Auto-start if enabled
  useEffect(() => {
    if (enabled) start();
    return () => stop();
  }, [enabled]);

  return { listening, wakeDetected, lastCommand, start, stop };
}

// ─── Wake Word Status Indicator UI ──────────────────────────────
export function WakeWordIndicator({ active, wakeDetected }) {
  if (!active) return null;
  return (
    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] transition-all ${
      wakeDetected
        ? 'bg-blue-500/30 border border-blue-400/50 text-blue-300'
        : 'bg-white/[0.04] border border-white/[0.06] text-slate-600'
    }`}>
      <div className={`w-1.5 h-1.5 rounded-full ${
        wakeDetected ? 'bg-blue-400 animate-ping' : 'bg-slate-700'
      }`}/>
      {wakeDetected ? '🎤 Bol JARVIS!' : 'Hey JARVIS...'}
    </div>
  );
}
