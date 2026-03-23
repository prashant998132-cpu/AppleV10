'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { speakWithEmotion, stopCurrentAudio } from '@/lib/ai/media-client';

// ── States ────────────────────────────────────────────────────
// idle → listening → thinking → speaking → idle
const STATES = { IDLE:'idle', LISTENING:'listening', THINKING:'thinking', SPEAKING:'speaking' };

export default function VoicePage() {
  const [phase, setPhase]       = useState(STATES.IDLE);
  const [transcript, setTrans]  = useState('');
  const [reply, setReply]       = useState('');
  const [history, setHistory]   = useState([]);
  const [personality, setPers]  = useState('normal');
  const [userName, setUserName] = useState('');
  const [error, setError]       = useState('');
  const [ariaMemory, setAriaMem]= useState('{}');
  const [holdProgress, setHoldP]= useState(0);

  const mediaRef    = useRef(null);
  const chunksRef   = useRef([]);
  const streamRef   = useRef(null);
  const holdTimer   = useRef(null);
  const holdStart   = useRef(null);
  const router      = useRouter();

  const isAria = personality === 'girlfriend';

  // ── Load profile ────────────────────────────────────────────
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem('jarvis_profile') || '{}');
      if (p.personality) setPers(p.personality);
      if (p.name) setUserName(p.name);
    } catch {}
    try {
      setAriaMem(localStorage.getItem('aria_ultra') || '{}');
    } catch {}
  }, []);

  // ── Cleanup on unmount ──────────────────────────────────────
  useEffect(() => {
    return () => {
      stopCurrentAudio();
      mediaRef.current?.stream?.getTracks().forEach(t => t.stop());
      if (streamRef.current) { try { streamRef.current.cancel(); } catch {} }
    };
  }, []);

  // ── HOLD TO SPEAK logic ─────────────────────────────────────
  function onPressStart(e) {
    e.preventDefault();
    if (phase !== STATES.IDLE && phase !== STATES.SPEAKING) return;
    stopCurrentAudio();
    setError('');
    holdStart.current = Date.now();
    setHoldP(0);

    // Animate hold ring
    const interval = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - holdStart.current) / 400) * 100);
      setHoldP(pct);
      if (pct >= 100) {
        clearInterval(interval);
        startListening();
      }
    }, 16);
    holdTimer.current = interval;
  }

  function onPressEnd(e) {
    e.preventDefault();
    clearInterval(holdTimer.current);
    if (phase === STATES.LISTENING) {
      stopListening();
    } else {
      setHoldP(0);
    }
  }

  // ── Start mic ───────────────────────────────────────────────
  async function startListening() {
    setPhase(STATES.LISTENING);
    setTrans('');
    setReply('');
    chunksRef.current = [];

    // Try Web Speech API first (zero latency)
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const sr = new SR();
      sr.continuous = false;
      sr.interimResults = true;
      sr.lang = 'hi-IN';
      sr.onresult = e => {
        const text = Array.from(e.results).map(r => r[0].transcript).join('');
        setTrans(text);
        if (e.results[e.results.length - 1].isFinal) {
          sr.stop();
          sendToJarvis(text);
        }
      };
      sr.onerror = () => startMediaRecorder();
      sr.onend   = () => { if (phase === STATES.LISTENING) setPhase(STATES.IDLE); };
      mediaRef.current = sr;
      sr.start();
      return;
    }
    startMediaRecorder();
  }

  async function startMediaRecorder() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const fd = new FormData();
        fd.append('audio', blob, 'audio.webm');
        fd.append('language', 'hi');
        try {
          const r = await fetch('/api/stt', { method: 'POST', body: fd });
          const d = await r.json();
          if (d.text) sendToJarvis(d.text);
          else setPhase(STATES.IDLE);
        } catch { setPhase(STATES.IDLE); }
      };
      mr.start();
      mediaRef.current = mr;
    } catch {
      setError('Mic access nahi mili');
      setPhase(STATES.IDLE);
    }
  }

  function stopListening() {
    setHoldP(0);
    if (!mediaRef.current) { setPhase(STATES.IDLE); return; }
    if (mediaRef.current.stop) mediaRef.current.stop();
    else if (mediaRef.current instanceof window.SpeechRecognition || mediaRef.current?.constructor?.name?.includes('Recognition')) {
      mediaRef.current.stop();
    }
  }

  // ── Send to JARVIS ──────────────────────────────────────────
  const sendToJarvis = useCallback(async (text) => {
    if (!text.trim()) { setPhase(STATES.IDLE); return; }
    setTrans(text);
    setPhase(STATES.THINKING);

    const newHistory = [...history, { role: 'user', content: text }];
    setHistory(newHistory);

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: newHistory.slice(-8, -1),
          mode: 'flash',
          personality,
          ariaMemory,
        }),
      });

      if (!res.ok) throw new Error('Stream failed');

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let fullReply = '';
      setPhase(STATES.SPEAKING);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = dec.decode(value, { stream: true }).split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const d = JSON.parse(line.slice(6));
            if (d.type === 'token') {
              fullReply += d.token;
              setReply(fullReply);
            }
          } catch {}
        }
      }

      // Save to history
      setHistory(h => [...h, { role: 'assistant', content: fullReply }]);

      // Speak reply
      const clean = fullReply.replace(/\*\*/g,'').replace(/#{1,6}\s/g,'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/[_~`]/g,'').slice(0, 400);
      setPhase(STATES.SPEAKING);
      await speakWithEmotion(clean, {
        onEnd: () => setPhase(STATES.IDLE),
      });

    } catch (e) {
      setError('Error: ' + e.message);
      setPhase(STATES.IDLE);
    }
  }, [history, personality, ariaMemory]);

  // ── Tap to stop speaking ────────────────────────────────────
  function handleOrbTap() {
    if (phase === STATES.SPEAKING) {
      stopCurrentAudio();
      setPhase(STATES.IDLE);
    }
  }

  // ── Orb style per phase/personality ────────────────────────
  const orbBase = isAria
    ? { idle:'from-pink-600 to-rose-400', glow:'rgba(236,72,153,0.5)', ring:'border-pink-500/40' }
    : { idle:'from-blue-600 to-cyan-400', glow:'rgba(26,86,219,0.5)',  ring:'border-blue-500/40' };

  const phaseLabel = {
    [STATES.IDLE]:      isAria ? 'Bol Aira se...' : 'Bolo JARVIS se...',
    [STATES.LISTENING]: 'Sun raha hoon...',
    [STATES.THINKING]:  isAria ? 'Soch rahi hoon...' : 'Soch raha hoon...',
    [STATES.SPEAKING]:  isAria ? 'Aira bol rahi hai' : 'JARVIS bol raha hai',
  };

  const pulseAnim = phase === STATES.SPEAKING ? 'animate-pulse' : phase === STATES.THINKING ? 'animate-spin' : '';

  // Recent conversation for display
  const recentPairs = history.slice(-4);

  return (
    <div className={`min-h-screen flex flex-col items-center select-none overflow-hidden ${
      isAria ? 'bg-[#0a0008]' : 'bg-[#020810]'
    }`}>

      {/* Back button */}
      <div className="w-full flex items-center justify-between px-5 pt-5 pb-2">
        <button onClick={() => { stopCurrentAudio(); router.push('/chat'); }}
          className="text-slate-500 hover:text-slate-300 text-sm flex items-center gap-1.5 transition-colors">
          ← Back
        </button>
        <p className="text-xs text-slate-600 font-medium uppercase tracking-wider">
          {isAria ? '💕 ARIA Voice' : '🤖 JARVIS Voice'}
        </p>
        <div className="w-12"/>
      </div>

      {/* Name + status */}
      <div className="text-center mt-6 mb-8">
        <h1 className="text-2xl font-black text-white">{isAria ? 'Aira' : 'JARVIS'}</h1>
        <p className={`text-sm mt-1 transition-all duration-300 ${
          phase === STATES.IDLE      ? 'text-slate-500' :
          phase === STATES.LISTENING ? 'text-green-400' :
          phase === STATES.THINKING  ? 'text-yellow-400 animate-pulse' :
          isAria ? 'text-pink-400' : 'text-blue-400'
        }`}>
          {phaseLabel[phase]}
        </p>
      </div>

      {/* ── THE ORB ─────────────────────────────────────── */}
      <div className="relative flex items-center justify-center mb-10"
        style={{ width: 220, height: 220 }}
        onMouseDown={onPressStart} onMouseUp={onPressEnd} onMouseLeave={onPressEnd}
        onTouchStart={onPressStart} onTouchEnd={onPressEnd}
        onClick={handleOrbTap}
      >
        {/* Outer glow rings */}
        {[3.2, 2.5, 1.9].map((scale, i) => (
          <span key={i} className={`absolute inset-0 rounded-full ${
            phase !== STATES.IDLE ? 'animate-ping' : ''
          }`} style={{
            background: `radial-gradient(circle, transparent 45%, ${isAria ? 'rgba(236,72,153,' : 'rgba(26,86,219,'}${0.06 - i*0.015}), transparent 75%)`,
            transform: `scale(${scale})`,
            animationDuration: `${1.2 + i*0.4}s`,
            animationDelay: `${i*0.2}s`,
          }}/>
        ))}

        {/* Hold progress ring */}
        {holdProgress > 0 && holdProgress < 100 && (
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 220 220">
            <circle cx="110" cy="110" r="100" fill="none" stroke={isAria ? '#ec4899' : '#2563eb'} strokeWidth="3"
              strokeDasharray={`${holdProgress * 6.28} 628`} strokeLinecap="round" opacity="0.7"/>
          </svg>
        )}

        {/* Listening wave rings */}
        {phase === STATES.LISTENING && [1,2,3].map(i => (
          <span key={i} className="absolute rounded-full border animate-ping" style={{
            width: 110 + i*30, height: 110 + i*30,
            borderColor: isAria ? 'rgba(236,72,153,0.3)' : 'rgba(34,211,238,0.3)',
            animationDuration: `${0.9 + i*0.3}s`,
            animationDelay: `${i*0.15}s`,
          }}/>
        ))}

        {/* Main orb */}
        <div className={`relative w-40 h-40 rounded-full bg-gradient-to-br ${orbBase.idle} flex items-center justify-center cursor-pointer active:scale-95 transition-all duration-200`}
          style={{ boxShadow: phase !== STATES.IDLE ? `0 0 60px 15px ${orbBase.glow}, 0 0 100px 30px ${isAria ? 'rgba(236,72,153,0.2)' : 'rgba(26,86,219,0.2)'}` : `0 0 30px 5px ${orbBase.glow}` }}>

          {/* Inner ripple when speaking */}
          {phase === STATES.SPEAKING && (
            <span className="absolute inset-0 rounded-full bg-white/10 animate-ping" style={{animationDuration:'0.8s'}}/>
          )}

          {/* Icon / letter */}
          <span className="text-white font-black text-5xl relative z-10" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>
            {phase === STATES.THINKING ? '...' : isAria ? 'A' : 'J'}
          </span>
        </div>
      </div>

      {/* Hold hint */}
      {phase === STATES.IDLE && (
        <p className="text-slate-600 text-xs mb-6 tracking-wider">
          HOLD to speak • TAP to stop
        </p>
      )}

      {/* Transcript */}
      {transcript && (
        <div className="mx-4 mb-3 w-full max-w-sm">
          <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl px-4 py-3 text-right">
            <p className="text-xs text-slate-500 mb-1">Tumne kaha</p>
            <p className="text-slate-200 text-sm leading-relaxed">{transcript}</p>
          </div>
        </div>
      )}

      {/* JARVIS reply streaming */}
      {reply && (
        <div className="mx-4 mb-3 w-full max-w-sm">
          <div className={`border rounded-2xl px-4 py-3 ${
            isAria ? 'bg-pink-950/30 border-pink-500/15' : 'bg-blue-950/30 border-blue-500/15'
          }`}>
            <p className={`text-xs mb-1 ${isAria ? 'text-pink-400' : 'text-blue-400'}`}>
              {isAria ? 'Aira' : 'JARVIS'}
            </p>
            <p className="text-slate-100 text-sm leading-relaxed">
              {reply}
              {phase === STATES.SPEAKING && <span className="ml-1 inline-block w-1.5 h-4 bg-current opacity-60 animate-pulse rounded-full align-middle"/>}
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-4 w-full max-w-sm">
          <p className="text-red-400 text-xs text-center bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>
        </div>
      )}

      {/* Recent conversation pills */}
      {recentPairs.length > 2 && !reply && phase === STATES.IDLE && (
        <div className="w-full max-w-sm mx-4 mt-4 space-y-1.5 px-4">
          <p className="text-[10px] text-slate-700 uppercase tracking-wider mb-2">Recent</p>
          {recentPairs.slice(-2).map((m, i) => (
            <div key={i} className={`text-xs px-3 py-1.5 rounded-xl truncate ${
              m.role === 'user'
                ? 'text-slate-500 text-right'
                : isAria ? 'text-pink-400/60' : 'text-blue-400/60'
            }`}>
              {m.content.slice(0, 60)}{m.content.length > 60 ? '...' : ''}
            </div>
          ))}
        </div>
      )}

      {/* Quick phrases */}
      {phase === STATES.IDLE && history.length === 0 && (
        <div className="w-full max-w-sm px-4 mt-6">
          <p className="text-[10px] text-slate-700 uppercase tracking-wider mb-3 text-center">Ya tap karke bolne ke baad kaho</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {(isAria
              ? ['Kya chal raha hai?', 'Miss kiya 🥺', 'Mood kaisa hai?', 'Kuch sunao']
              : ['Mujhe motivate karo', 'Aaj ka plan batao', 'Koi interesting fact', 'Jokes sunao']
            ).map(q => (
              <button key={q} onClick={() => sendToJarvis(q)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all active:scale-95 ${
                  isAria
                    ? 'bg-pink-500/10 border-pink-500/20 text-pink-300/70 hover:text-pink-300'
                    : 'bg-blue-500/10 border-blue-500/20 text-blue-300/70 hover:text-blue-300'
                }`}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Volume hint */}
      <p className="text-[10px] text-slate-700 mt-8 mb-4">
        Phone ka volume up rakho 🔊
      </p>
    </div>
  );
}
