// lib/sound/sounds.js — JARVIS UI Sound System
// Pure Web Audio API — no external files needed
'use client';

let _ctx = null;

function getCtx() {
  if (typeof window === 'undefined') return null;
  try {
    if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
    return _ctx;
  } catch { return null; }
}

function tone(freq, dur, type = 'sine', vol = 0.08) {
  const ctx = getCtx(); if (!ctx) return;
  try {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = freq; o.type = type;
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.start(); o.stop(ctx.currentTime + dur);
  } catch {}
}

function isMuted() {
  try { return localStorage.getItem('jarvis_sound_muted') === 'true'; } catch { return false; }
}

export const Sounds = {
  sent:         () => { if(isMuted()) return; tone(800, 0.08, 'sine', 0.05); },
  received:     () => { if(isMuted()) return; tone(600,0.06); setTimeout(()=>tone(800,0.08),60); },
  success:      () => { if(isMuted()) return; [523,659,784].forEach((f,i)=>setTimeout(()=>tone(f,0.12),i*100)); },
  error:        () => { if(isMuted()) return; tone(200, 0.2, 'sawtooth', 0.04); },
  notification: () => { if(isMuted()) return; tone(880,0.1); setTimeout(()=>tone(1100,0.15),120); },
  wakeWord:     () => { if(isMuted()) return; [400,500,600,700].forEach((f,i)=>setTimeout(()=>tone(f,0.08),i*60)); },
  click:        () => { if(isMuted()) return; tone(1000, 0.04, 'sine', 0.03); },
  timerDone:    () => { if(isMuted()) return; [0,300,600].forEach(t=>setTimeout(()=>tone(880,0.2,'square',0.08),t)); },
  toggleMute:   () => { const m=!isMuted(); try{localStorage.setItem('jarvis_sound_muted',m?'true':'false');}catch{} return m; },
  thinking:     () => { if(isMuted()) return; [300,350,300].forEach((f,i)=>setTimeout(()=>tone(f,0.15,'sine',0.03),i*200)); },
  levelUp:      () => { if(isMuted()) return; [523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,0.18,'triangle',0.07),i*120)); },
  pop:          () => { if(isMuted()) return; tone(1200,0.05,'sine',0.04); },
  swoosh:       () => { if(isMuted()) return; const ctx=getCtx();if(!ctx)return;try{const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.type='sine';o.frequency.setValueAtTime(800,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(200,ctx.currentTime+0.15);g.gain.setValueAtTime(0.06,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.15);o.start();o.stop(ctx.currentTime+0.15);}catch{}},
  isMuted,
};

export default Sounds;
