'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useCallback } from 'react';
import { speakWithEmotion, stopCurrentAudio } from '@/lib/ai/media-client';

const PHASE = { IDLE:'idle', LISTENING:'listening', THINKING:'thinking', SPEAKING:'speaking' };

// ── Dot colors per phase ──────────────────────────────────────
const COLORS = {
  idle:      { base:'#1d4ed8', bright:'#60a5fa', glow:'rgba(96,165,250,0.15)' },
  listening: { base:'#7c3aed', bright:'#c084fc', glow:'rgba(192,132,252,0.2)' },
  thinking:  { base:'#0e7490', bright:'#22d3ee', glow:'rgba(34,211,238,0.2)'  },
  speaking:  { base:'#065f46', bright:'#34d399', glow:'rgba(52,211,153,0.2)'  },
};

export default function VoicePage() {
  const [phase, setPhase]      = useState(PHASE.IDLE);
  const [transcript, setTrans] = useState('');
  const [reply, setReply]      = useState('');
  const [history, setHistory]  = useState([]);
  const [personality, setPers] = useState('normal');
  const [ariaMemory, setAM]    = useState('{}');
  const [error, setError]      = useState('');
  const [label, setLabel]      = useState('Hold to speak');
  const [showHist, setShowHist]= useState(false);

  const canvasRef   = useRef(null);
  const dotsRef     = useRef([]);
  const phaseRef    = useRef(PHASE.IDLE);
  const volumeRef   = useRef(0);
  const animRef     = useRef(null);
  const mediaRef    = useRef(null);
  const chunksRef   = useRef([]);
  const analyserRef = useRef(null);
  const audioCtxRef = useRef(null);
  const holdTimerRef= useRef(null);
  const thinkAngle  = useRef(0);
  const speakBeat   = useRef(0);

  // ── Sync phase to ref ────────────────────────────────────────
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ── Load profile ─────────────────────────────────────────────
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem('jarvis_profile')||'{}');
      if (p.personality) setPers(p.personality);
      setAM(localStorage.getItem('aria_ultra')||'{}');
    } catch {}
  }, []);

  // ── Init dots ────────────────────────────────────────────────
  const initDots = useCallback((canvas) => {
    const cx = canvas.width / 2, cy = canvas.height / 2;
    const R = Math.min(canvas.width, canvas.height) * 0.28;
    const dots = [];
    const N = 220;

    // Fibonacci sphere for uniform distribution
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const theta = golden * i;
      const x3 = Math.cos(theta) * radius;
      const z3 = Math.sin(theta) * radius;

      // Project 3D → 2D (perspective)
      const depth = (z3 + 1) / 2; // 0..1
      const ox = cx + x3 * R;
      const oy = cy + y * R;

      dots.push({
        ox, oy,          // origin on sphere
        x: ox, y: oy,   // current pos
        vx: 0, vy: 0,   // velocity
        depth,           // z depth (size + opacity)
        size: 1.5 + depth * 2,
        phase3D: theta,  // for think rotation
        i,
      });
    }
    dotsRef.current = dots;
  }, []);

  // ── Resize canvas ────────────────────────────────────────────
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = canvas.offsetWidth  * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    const ctx = canvas.getContext('2d');
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    initDots(canvas);
  }, [initDots]);

  // ── Main render loop ─────────────────────────────────────────
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx   = canvas.getContext('2d');
    const W     = canvas.offsetWidth;
    const H     = canvas.offsetHeight;
    const cx    = W / 2, cy = H / 2;
    const p     = phaseRef.current;
    const vol   = volumeRef.current;
    const color = COLORS[p];
    const dots  = dotsRef.current;

    ctx.clearRect(0, 0, W, H);

    // Background glow
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.4);
    grd.addColorStop(0, color.glow);
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    // Update + draw dots
    const t = Date.now() / 1000;
    thinkAngle.current += 0.012;
    speakBeat.current  += 0.08;

    dots.forEach(d => {
      let tx = d.ox, ty = d.oy;

      if (p === PHASE.IDLE) {
        // Gentle breathing: dots drift slightly
        const wave = Math.sin(t * 0.6 + d.phase3D) * 4;
        tx += wave * 0.4;
        ty += Math.cos(t * 0.5 + d.phase3D * 1.3) * 3;
      }

      if (p === PHASE.LISTENING) {
        // Dots expand outward with voice amplitude
        const dist = Math.hypot(d.ox - cx, d.oy - cy);
        const dir  = { x:(d.ox-cx)/dist, y:(d.oy-cy)/dist };
        const push = vol * 55 * (0.7 + Math.random() * 0.3);
        tx = d.ox + dir.x * push + Math.sin(t*4 + d.i*0.15) * 2;
        ty = d.oy + dir.y * push + Math.cos(t*3 + d.i*0.2) * 2;
      }

      if (p === PHASE.THINKING) {
        // Dots rotate as a sphere + shimmer
        const ang = thinkAngle.current + d.phase3D;
        const R   = Math.hypot(d.ox - cx, d.oy - cy);
        tx = cx + Math.cos(ang) * R;
        ty = cy + Math.sin(ang * 0.7) * R * 0.5 + (d.oy - cy) * 0.5;
        tx += Math.sin(t * 8 + d.i) * 1.5;
        ty += Math.cos(t * 7 + d.i) * 1.5;
      }

      if (p === PHASE.SPEAKING) {
        // Dots pulse outward rhythmically like sound waves
        const beat = Math.abs(Math.sin(speakBeat.current + d.depth * 3));
        const dist = Math.hypot(d.ox - cx, d.oy - cy);
        const dir  = { x:(d.ox-cx)/dist, y:(d.oy-cy)/dist };
        tx = d.ox + dir.x * beat * 30;
        ty = d.oy + dir.y * beat * 30;
      }

      // Spring physics
      const dx = tx - d.x, dy = ty - d.y;
      d.vx = d.vx * 0.72 + dx * 0.18;
      d.vy = d.vy * 0.72 + dy * 0.18;
      d.x += d.vx;
      d.y += d.vy;

      // Draw dot
      const sz   = d.size * (1 + (p === PHASE.LISTENING ? vol * 1.8 : 0));
      const alph = 0.3 + d.depth * 0.6 + (p !== PHASE.IDLE ? vol * 0.4 : 0);

      // Glow for bright dots
      if (d.depth > 0.7 && p !== PHASE.IDLE) {
        ctx.shadowColor  = color.bright;
        ctx.shadowBlur   = 6;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.arc(d.x, d.y, Math.max(0.5, sz), 0, Math.PI * 2);

      // Color: blend base → bright by depth
      const r1 = parseInt(color.base.slice(1,3),16),
            g1 = parseInt(color.base.slice(3,5),16),
            b1 = parseInt(color.base.slice(5,7),16);
      const r2 = parseInt(color.bright.slice(1,3),16),
            g2 = parseInt(color.bright.slice(3,5),16),
            b2 = parseInt(color.bright.slice(5,7),16);
      const mix = d.depth;
      ctx.fillStyle = `rgba(${Math.round(r1+(r2-r1)*mix)},${Math.round(g1+(g2-g1)*mix)},${Math.round(b1+(b2-b1)*mix)},${Math.min(1,alph)})`;
      ctx.fill();
    });

    ctx.shadowBlur = 0;
    animRef.current = requestAnimationFrame(render);
  }, []);

  // ── Setup canvas ─────────────────────────────────────────────
  useEffect(() => {
    resizeCanvas();
    animRef.current = requestAnimationFrame(render);
    window.addEventListener('resize', resizeCanvas);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resizeCanvas);
      audioCtxRef.current?.close().catch(()=>{});
      mediaRef.current?.stream?.getTracks().forEach(t=>t.stop());
      stopCurrentAudio();
    };
  }, [resizeCanvas, render]);

  // ── Scatter on touch ─────────────────────────────────────────
  const scatterDots = useCallback((touchX, touchY) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect  = canvas.getBoundingClientRect();
    const tx    = touchX - rect.left;
    const ty    = touchY - rect.top;
    dotsRef.current.forEach(d => {
      const dx = d.x - tx, dy = d.y - ty;
      const dist = Math.hypot(dx, dy) || 1;
      const force = Math.min(200 / (dist * 0.4 + 1), 18);
      d.vx += (dx / dist) * force;
      d.vy += (dy / dist) * force;
    });
  }, []);

  // ── Mic + waveform ───────────────────────────────────────────
  const startWaveform = useCallback((stream) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const an  = ctx.createAnalyser();
      an.fftSize = 64;
      src.connect(an);
      analyserRef.current = an;
      const buf = new Uint8Array(an.frequencyBinCount);
      const tick = () => {
        an.getByteFrequencyData(buf);
        const avg = buf.reduce((s,v)=>s+v,0)/buf.length;
        volumeRef.current = avg / 255;
        if (phaseRef.current === PHASE.LISTENING)
          requestAnimationFrame(tick);
      };
      tick();
    } catch {}
  }, []);

  const stopWaveform = useCallback(() => {
    volumeRef.current = 0;
    try { audioCtxRef.current?.close(); } catch {}
    audioCtxRef.current = null;
  }, []);

  // ── Touch handlers ───────────────────────────────────────────
  const onTouchStart = useCallback((e) => {
    e.preventDefault();
    const touch = e.touches?.[0];
    scatterDots(touch?.clientX ?? 0, touch?.clientY ?? 0);

    if (phase === PHASE.SPEAKING) { stopCurrentAudio(); setPhase(PHASE.IDLE); setLabel('Hold to speak'); return; }
    if (phase !== PHASE.IDLE) return;

    holdTimerRef.current = setTimeout(() => startListening(), 120);
  }, [phase, scatterDots]);

  const onTouchEnd = useCallback(() => {
    clearTimeout(holdTimerRef.current);
    if (phaseRef.current === PHASE.LISTENING) stopListening();
  }, []);

  // Mouse for desktop
  const onMouseDown = useCallback((e) => {
    scatterDots(e.clientX, e.clientY);
    if (phase === PHASE.SPEAKING) { stopCurrentAudio(); setPhase(PHASE.IDLE); setLabel('Hold to speak'); return; }
    if (phase !== PHASE.IDLE) return;
    holdTimerRef.current = setTimeout(() => startListening(), 120);
  }, [phase, scatterDots]);

  const onMouseUp = useCallback(() => {
    clearTimeout(holdTimerRef.current);
    if (phaseRef.current === PHASE.LISTENING) stopListening();
  }, []);

  const startListening = useCallback(async () => {
    setError(''); setTrans(''); setLabel('Listening…');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      mediaRef.current = {stream};
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = e => { if(e.data.size>0) chunksRef.current.push(e.data); };
      rec.onstop = () => processAudio();
      rec.start();
      mediaRef.current.recorder = rec;
      setPhase(PHASE.LISTENING);
      startWaveform(stream);
    } catch {
      setError('Mic access denied');
      setLabel('Hold to speak');
    }
  }, [startWaveform]);

  const stopListening = useCallback(() => {
    setLabel('Thinking…');
    stopWaveform();
    mediaRef.current?.recorder?.stop();
    mediaRef.current?.stream?.getTracks().forEach(t=>t.stop());
    setPhase(PHASE.THINKING);
  }, [stopWaveform]);

  const processAudio = useCallback(async () => {
    try {
      const blob = new Blob(chunksRef.current, {type:'audio/webm'});
      if (blob.size < 800) { setPhase(PHASE.IDLE); setLabel('Hold to speak'); return; }
      const fd = new FormData(); fd.append('audio', blob, 'v.webm');
      const stt = await fetch('/api/stt', {method:'POST',body:fd});
      const {text} = await stt.json();
      if (!text?.trim()) { setPhase(PHASE.IDLE); setLabel('Hold to speak'); return; }
      setTrans(text.trim());

      const res = await fetch('/api/chat/stream', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          message:text, history:history.slice(-6), mode:'flash', personality,
          ariaMemory: personality==='girlfriend' ? ariaMemory : undefined,
        }),
      });
      if (!res.ok) throw new Error(res.status);
      let full='';
      const reader = res.body.getReader(); const dec = new TextDecoder();
      while(true){
        const {done,value}=await reader.read(); if(done)break;
        for(const l of dec.decode(value).split('\n')){
          if(!l.startsWith('data: '))continue;
          try{const d=JSON.parse(l.slice(6));if(d.type==='token')full+=d.token;}catch{}
        }
      }
      full=full.trim();
      if(!full){setPhase(PHASE.IDLE);setLabel('Hold to speak');return;}
      setReply(full);
      setHistory(h=>[...h,{role:'user',content:text},{role:'assistant',content:full}]);
      setPhase(PHASE.SPEAKING); setLabel('Speaking…');
      await speakWithEmotion(full, personality==='girlfriend'?'female':'male');
      setPhase(PHASE.IDLE); setLabel('Hold to speak');
    } catch(e) {
      setError(e.message||'Error occurred');
      setPhase(PHASE.IDLE); setLabel('Hold to speak');
    }
  }, [history, personality, ariaMemory]);

  const PERS_OPTS = [
    {id:'normal',label:'🤖 JARVIS'},{id:'girlfriend',label:'💕 ARIA'},
    {id:'coach',label:'💪 Coach'},{id:'fun',label:'😄 Fun'},
  ];

  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'space-between', minHeight:'100dvh', width:'100%',
      background:'radial-gradient(ellipse at 50% 50%, #080d1a 0%, #030609 100%)',
      overflow:'hidden', userSelect:'none',
    }}>

      {/* History toggle */}
      <div style={{width:'100%',maxWidth:400,padding:'16px 20px 0',zIndex:10}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
          <span style={{color:'#334155',fontSize:11,letterSpacing:'0.1em',textTransform:'uppercase'}}>
            JARVIS Voice
          </span>
          {history.length>0 && (
            <button onClick={()=>setShowHist(v=>!v)}
              style={{color:'#475569',fontSize:11,background:'none',border:'none',cursor:'pointer'}}>
              {showHist?'Hide':'History'} ({Math.floor(history.length/2)})
            </button>
          )}
        </div>

        {/* Chat bubbles */}
        {showHist && (
          <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:'22vh',overflowY:'auto'}}>
            {history.slice(-6).map((m,i)=>(
              <div key={i} style={{
                alignSelf:m.role==='user'?'flex-end':'flex-start',
                maxWidth:'80%', padding:'7px 13px', borderRadius:16,
                fontSize:12, lineHeight:1.55,
                background:m.role==='user'?'rgba(29,78,216,0.2)':'rgba(255,255,255,0.04)',
                border:m.role==='user'?'1px solid rgba(96,165,250,0.25)':'1px solid rgba(255,255,255,0.07)',
                color:m.role==='user'?'#bfdbfe':'#94a3b8',
              }}>
                {m.content.slice(0,90)}{m.content.length>90?'…':''}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── THE DOT SPHERE CANVAS ── */}
      <div style={{position:'relative',flex:1,width:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
        <canvas
          ref={canvasRef}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          style={{
            width:'min(88vw,420px)', height:'min(88vw,420px)',
            cursor:'pointer', touchAction:'none',
            display:'block',
          }}
        />

        {/* Center label overlay */}
        <div style={{
          position:'absolute', textAlign:'center',
          pointerEvents:'none',
        }}>
          <p style={{
            color: COLORS[phase].bright,
            fontSize:15, fontWeight:500,
            letterSpacing:'0.04em',
            textShadow:`0 0 20px ${COLORS[phase].bright}88`,
            transition:'color 0.5s ease',
          }}>{label}</p>
          {transcript && (
            <p style={{
              color:'#64748b', fontSize:12, marginTop:6,
              maxWidth:220, lineHeight:1.5,
            }}>"{transcript.slice(0,70)}{transcript.length>70?'…':''}"</p>
          )}
        </div>
      </div>

      {/* Bottom area */}
      <div style={{width:'100%',maxWidth:400,padding:'0 20px 32px',zIndex:10}}>

        {/* Last reply */}
        {reply && !showHist && (
          <div style={{
            background:'rgba(255,255,255,0.03)',
            border:'1px solid rgba(255,255,255,0.07)',
            borderRadius:18, padding:'12px 16px',
            color:'#94a3b8', fontSize:13, lineHeight:1.6,
            marginBottom:14, backdropFilter:'blur(8px)',
          }}>
            {reply.slice(0,180)}{reply.length>180?'…':''}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',
            borderRadius:12,padding:'8px 14px',color:'#fca5a5',
            fontSize:12,textAlign:'center',marginBottom:12,
          }}>{error}</div>
        )}

        {/* Personality chips */}
        <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
          {PERS_OPTS.map(opt=>(
            <button key={opt.id} onClick={()=>{
              setPers(opt.id);
              try{const p=JSON.parse(localStorage.getItem('jarvis_profile')||'{}');p.personality=opt.id;localStorage.setItem('jarvis_profile',JSON.stringify(p));}catch{}
            }} style={{
              padding:'5px 14px', borderRadius:20, fontSize:12,
              background:personality===opt.id?'rgba(96,165,250,0.15)':'rgba(255,255,255,0.03)',
              border:personality===opt.id?'1px solid rgba(96,165,250,0.4)':'1px solid rgba(255,255,255,0.06)',
              color:personality===opt.id?'#60a5fa':'#475569',
              cursor:'pointer', transition:'all 0.2s',
              WebkitTapHighlightColor:'transparent',
            }}>{opt.label}</button>
          ))}
        </div>

        <p style={{textAlign:'center',color:'#1e293b',fontSize:10,marginTop:14,letterSpacing:'0.08em'}}>
          HOLD → speak &nbsp;|&nbsp; RELEASE → send &nbsp;|&nbsp; TAP → scatter
        </p>
      </div>
    </div>
  );
}
