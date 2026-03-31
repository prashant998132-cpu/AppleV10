'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useCallback } from 'react';
import { speakWithEmotion, stopCurrentAudio } from '@/lib/ai/media-client';

const PHASE = { IDLE: 'idle', LISTENING: 'listening', THINKING: 'thinking', SPEAKING: 'speaking' };

// ── Orb color per phase ───────────────────────────────────────
const ORB_CONFIG = {
  idle:      { c1: '#1a56db', c2: '#06b6d4', glow: 'rgba(26,86,219,0.35)', label: 'Tap to speak' },
  listening: { c1: '#7c3aed', c2: '#a855f7', glow: 'rgba(168,85,247,0.5)', label: 'Listening...' },
  thinking:  { c1: '#0ea5e9', c2: '#38bdf8', glow: 'rgba(14,165,233,0.5)', label: 'Thinking...' },
  speaking:  { c1: '#10b981', c2: '#34d399', glow: 'rgba(16,185,129,0.45)', label: 'Speaking...' },
};

export default function VoicePage() {
  const [phase, setPhase]       = useState(PHASE.IDLE);
  const [transcript, setTrans]  = useState('');
  const [reply, setReply]       = useState('');
  const [history, setHistory]   = useState([]);
  const [personality, setPers]  = useState('normal');
  const [userName, setUserName] = useState('');
  const [ariaMemory, setAriaMem]= useState('{}');
  const [waveData, setWaveData] = useState(Array(32).fill(0));
  const [error, setError]       = useState('');
  const [pulsing, setPulsing]   = useState(false);

  const mediaRef   = useRef(null);
  const chunksRef  = useRef([]);
  const streamRef  = useRef(null);
  const analyserRef= useRef(null);
  const animRef    = useRef(null);
  const audioCtxRef= useRef(null);

  // ── Load profile ─────────────────────────────────────────────
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem('jarvis_profile') || '{}');
      if (p.personality) setPers(p.personality);
      if (p.name) setUserName(p.name);
      setAriaMem(localStorage.getItem('aria_ultra') || '{}');
    } catch {}
    return () => {
      stopCurrentAudio();
      cancelAnimationFrame(animRef.current);
      audioCtxRef.current?.close().catch(() => {});
      mediaRef.current?.stream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // ── Waveform animation ────────────────────────────────────────
  const startWaveform = useCallback((stream) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      src.connect(analyser);
      analyserRef.current = analyser;
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const draw = () => {
        analyser.getByteFrequencyData(buf);
        setWaveData([...buf].slice(0, 32).map(v => v / 255));
        animRef.current = requestAnimationFrame(draw);
      };
      draw();
    } catch {}
  }, []);

  const stopWaveform = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    setWaveData(Array(32).fill(0));
    try { audioCtxRef.current?.close(); } catch {}
    audioCtxRef.current = null;
    analyserRef.current = null;
  }, []);

  // ── Start recording ───────────────────────────────────────────
  const startListening = useCallback(async () => {
    if (phase !== PHASE.IDLE) return;
    setError(''); setTrans(''); setPulsing(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRef.current = { stream };
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => processAudio();
      recorder.start();
      mediaRef.current.recorder = recorder;
      setPhase(PHASE.LISTENING);
      startWaveform(stream);
    } catch (e) {
      setError('Mic access denied — Settings mein allow karo');
    }
  }, [phase, startWaveform]);

  // ── Stop recording ────────────────────────────────────────────
  const stopListening = useCallback(() => {
    if (phase !== PHASE.LISTENING) return;
    stopWaveform();
    mediaRef.current?.recorder?.stop();
    mediaRef.current?.stream?.getTracks().forEach(t => t.stop());
    setPhase(PHASE.THINKING);
  }, [phase, stopWaveform]);

  // ── Handle tap ───────────────────────────────────────────────
  const handleTap = useCallback(() => {
    if (phase === PHASE.IDLE) startListening();
    else if (phase === PHASE.LISTENING) stopListening();
    else if (phase === PHASE.SPEAKING) {
      stopCurrentAudio();
      setPhase(PHASE.IDLE);
    }
  }, [phase, startListening, stopListening]);

  // ── Process audio → STT → LLM → TTS ─────────────────────────
  const processAudio = useCallback(async () => {
    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      if (blob.size < 1000) { setPhase(PHASE.IDLE); return; }

      // STT
      const fd = new FormData();
      fd.append('audio', blob, 'voice.webm');
      const sttRes = await fetch('/api/stt', { method: 'POST', body: fd });
      const sttData = await sttRes.json();
      const userText = sttData.text?.trim();
      if (!userText) { setPhase(PHASE.IDLE); return; }
      setTrans(userText);

      // LLM via streaming chat
      const newHistory = [...history, { role: 'user', content: userText }];
      const chatRes = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText, history: history.slice(-6),
          mode: 'flash', personality,
          ariaMemory: personality === 'girlfriend' ? ariaMemory : undefined,
        }),
      });

      if (!chatRes.ok) throw new Error(`Chat ${chatRes.status}`);

      let fullReply = '';
      const reader = chatRes.body.getReader();
      const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const d = JSON.parse(line.slice(6));
            if (d.type === 'token') fullReply += d.token;
          } catch {}
        }
      }

      fullReply = fullReply.trim();
      if (!fullReply) { setPhase(PHASE.IDLE); return; }
      setReply(fullReply);
      setHistory([...newHistory, { role: 'assistant', content: fullReply }]);
      setPhase(PHASE.SPEAKING);

      // TTS
      await speakWithEmotion(fullReply, personality === 'girlfriend' ? 'female' : 'male');
      setPhase(PHASE.IDLE);
      setPulsing(true);
      setTimeout(() => setPulsing(false), 2000);

    } catch (e) {
      setError(e.message || 'Something went wrong');
      setPhase(PHASE.IDLE);
    }
  }, [history, personality, ariaMemory]);

  const cfg = ORB_CONFIG[phase];
  const isActive = phase !== PHASE.IDLE;

  // ── Idle breathing bars ───────────────────────────────────────
  const idleBars = Array(32).fill(0).map((_, i) => {
    const base = Math.sin(Date.now() / 800 + i * 0.4) * 0.15 + 0.08;
    return base;
  });

  const bars = phase === PHASE.LISTENING ? waveData : idleBars;

  return (
    <div className="flex flex-col items-center justify-between h-full w-full select-none overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 60%, #080f20 0%, #050810 70%)', minHeight: '100dvh' }}>

      {/* Top — conversation history */}
      <div className="w-full max-w-sm px-4 pt-safe-top pt-6 pb-2 overflow-y-auto flex-1 flex flex-col justify-end gap-2" style={{ maxHeight: '35vh' }}>
        {history.slice(-4).map((m, i) => (
          <div key={i} className={`text-xs px-3 py-2 rounded-2xl max-w-[85%] leading-relaxed ${
            m.role === 'user'
              ? 'self-end bg-blue-600/25 text-blue-100 border border-blue-500/20'
              : 'self-start bg-white/5 text-slate-300 border border-white/10'
          }`}>
            {m.content.slice(0, 120)}{m.content.length > 120 ? '...' : ''}
          </div>
        ))}
      </div>

      {/* Center — the orb */}
      <div className="flex flex-col items-center justify-center gap-6 py-8">

        {/* Waveform bars */}
        <div className="flex items-center gap-[2px] h-12">
          {bars.map((v, i) => {
            const height = isActive
              ? Math.max(4, v * 48)
              : 4 + Math.sin(i * 0.5) * 3;
            return (
              <div key={i}
                style={{
                  width: 3,
                  height,
                  borderRadius: 2,
                  background: cfg.c1,
                  opacity: isActive ? 0.7 + v * 0.3 : 0.25,
                  transition: 'height 0.08s ease, opacity 0.2s',
                  boxShadow: isActive && v > 0.5 ? `0 0 6px ${cfg.c1}` : 'none',
                }}
              />
            );
          })}
        </div>

        {/* Main orb button */}
        <button
          onClick={handleTap}
          className="relative outline-none focus:outline-none"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          {/* Outer glow ring */}
          <div style={{
            position: 'absolute', inset: -20,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${cfg.glow} 0%, transparent 70%)`,
            animation: isActive ? 'orbPulse 1.4s ease-in-out infinite' : 'orbBreath 3s ease-in-out infinite',
            pointerEvents: 'none',
          }} />

          {/* Ring 1 */}
          <div style={{
            position: 'absolute', inset: -8,
            borderRadius: '50%',
            border: `1px solid ${cfg.c1}40`,
            animation: isActive ? 'spin 4s linear infinite' : 'none',
          }} />

          {/* Ring 2 */}
          <div style={{
            position: 'absolute', inset: -16,
            borderRadius: '50%',
            border: `1px solid ${cfg.c2}20`,
            animation: isActive ? 'spinReverse 6s linear infinite' : 'none',
          }} />

          {/* Core orb */}
          <div style={{
            width: 140, height: 140,
            borderRadius: '50%',
            background: `radial-gradient(circle at 40% 35%, ${cfg.c2}, ${cfg.c1} 60%, #030712)`,
            boxShadow: `0 0 40px ${cfg.glow}, 0 0 80px ${cfg.glow}60, inset 0 1px 0 rgba(255,255,255,0.15)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'box-shadow 0.4s ease, background 0.4s ease',
            transform: pulsing ? 'scale(1.04)' : 'scale(1)',
          }}>
            {/* Inner icon / animation */}
            {phase === PHASE.IDLE && (
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <path d="M20 8C16.7 8 14 10.7 14 14V20C14 23.3 16.7 26 20 26C23.3 26 26 23.3 26 20V14C26 10.7 23.3 8 20 8Z" fill="white" fillOpacity="0.9"/>
                <path d="M10 20C10 25.5 14.5 30 20 30C25.5 30 30 25.5 30 20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.7"/>
                <line x1="20" y1="30" x2="20" y2="34" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.7"/>
                <line x1="16" y1="34" x2="24" y2="34" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.7"/>
              </svg>
            )}
            {phase === PHASE.LISTENING && (
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width: 6, background: 'white', borderRadius: 3,
                    animation: `listeningBar 0.8s ease-in-out infinite`,
                    animationDelay: `${i * 0.15}s`,
                    height: 20,
                  }} />
                ))}
              </div>
            )}
            {phase === PHASE.THINKING && (
              <div style={{ display: 'flex', gap: 6 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: 'white', opacity: 0.9,
                    animation: `thinkDot 1.2s ease-in-out infinite`,
                    animationDelay: `${i * 0.2}s`,
                  }} />
                ))}
              </div>
            )}
            {phase === PHASE.SPEAKING && (
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {[0,1,2,3,4].map(i => (
                  <div key={i} style={{
                    width: 4, background: 'white', borderRadius: 2,
                    animation: `speakBar 0.6s ease-in-out infinite alternate`,
                    animationDelay: `${i * 0.1}s`,
                    height: 8 + i * 5,
                  }} />
                ))}
              </div>
            )}
          </div>
        </button>

        {/* Phase label */}
        <div style={{ textAlign: 'center', minHeight: 40 }}>
          <p style={{
            color: cfg.c2, fontSize: 14, fontWeight: 500, letterSpacing: '0.05em',
            transition: 'color 0.4s ease',
          }}>{cfg.label}</p>
          {transcript && (
            <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 4, maxWidth: 260, textAlign: 'center' }}>
              "{transcript.slice(0, 80)}{transcript.length > 80 ? '...' : ''}"
            </p>
          )}
        </div>

        {/* Hold to talk hint */}
        {phase === PHASE.IDLE && !reply && (
          <p style={{ color: '#334155', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Tap to speak • Tap again to stop
          </p>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: '#1a0000', border: '1px solid #ef444440',
            borderRadius: 12, padding: '8px 16px',
            color: '#fca5a5', fontSize: 12, maxWidth: 280, textAlign: 'center',
          }}>
            {error}
          </div>
        )}
      </div>

      {/* Bottom — last reply */}
      <div className="w-full max-w-sm px-4 pb-safe-bottom pb-8">
        {reply && (
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 20, padding: '14px 18px',
            color: '#cbd5e1', fontSize: 13, lineHeight: 1.6,
            backdropFilter: 'blur(12px)',
          }}>
            {reply.slice(0, 200)}{reply.length > 200 ? '...' : ''}
          </div>
        )}

        {/* Personality chips */}
        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar justify-center">
          {[
            { id:'normal', label:'JARVIS' },
            { id:'girlfriend', label:'ARIA 💕' },
            { id:'coach', label:'Coach' },
            { id:'fun', label:'Fun' },
          ].map(p => (
            <button key={p.id} onClick={() => {
              setPers(p.id);
              try { const prof = JSON.parse(localStorage.getItem('jarvis_profile')||'{}'); prof.personality=p.id; localStorage.setItem('jarvis_profile',JSON.stringify(prof)); } catch {}
            }} style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 12, whiteSpace: 'nowrap',
              background: personality === p.id ? 'rgba(26,86,219,0.3)' : 'rgba(255,255,255,0.04)',
              border: personality === p.id ? '1px solid rgba(26,86,219,0.6)' : '1px solid rgba(255,255,255,0.08)',
              color: personality === p.id ? '#60a5fa' : '#64748b',
              transition: 'all 0.2s',
            }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes orbPulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes orbBreath {
          0%, 100% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spinReverse { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
        @keyframes listeningBar {
          0%, 100% { height: 8px; opacity: 0.6; }
          50% { height: 28px; opacity: 1; }
        }
        @keyframes thinkDot {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-8px); opacity: 1; }
        }
        @keyframes speakBar {
          from { transform: scaleY(0.4); }
          to { transform: scaleY(1.2); }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
