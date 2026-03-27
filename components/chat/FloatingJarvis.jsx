'use client';
// FloatingJarvis — JARVIS on every page
import { useState, useRef, useEffect } from 'react';
import { X, Send, Mic, MicOff } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function FloatingJarvis() {
  const path = usePathname();
  const [open, setOpen]       = useState(false);
  const [msgs, setMsgs]       = useState([]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [personality, setPersonality] = useState('normal');
  const [listening, setListening] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  // Load personality
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem('jarvis_profile') || '{}');
      const standalone = localStorage.getItem('jarvis_personality');
      const pers = p.personality || standalone || 'normal';
      setPersonality(pers);
    } catch {}
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  // Don't show on chat page — AFTER all hooks
  if (path === '/chat') return null;

  const isAria = personality === 'girlfriend';

  async function send(text = input) {
    const msg = text.trim();
    if (!msg || loading) return;
    setInput('');
    setMsgs(p => p.filter(m => m.content !== 'Error aa gaya 🥺' && !m.content?.startsWith('Error') && !m.content?.startsWith('Server') && !m.content?.startsWith('Network') && !m.content?.startsWith('API')));
    const userMsg = { role: 'user', content: msg };
    const newMsgs = [...msgs, userMsg];
    setMsgs(newMsgs);
    setLoading(true);

    try {
      const history = newMsgs.slice(-6).map(m => ({ role: m.role, content: m.content }));
      let ariaMemory = undefined;
      if (isAria) {
        try { ariaMemory = localStorage.getItem('aria_ultra') || '{}'; } catch {}
      }
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          history: history.slice(0,-1),
          mode: 'flash',
          personality,
          ariaMemory,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(()=>'');
        throw new Error(`HTTP ${res.status}${errBody.includes('key') || errBody.includes('auth') ? ':auth' : ''}`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let reply = '';
      const aiMsg = { role: 'assistant', content: '' };
      setMsgs(p => [...p, aiMsg]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = dec.decode(value).split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const d = JSON.parse(line.slice(6));
            if (d.type === 'token') {
              reply += d.token;
              setMsgs(p => {
                const last = [...p];
                last[last.length-1] = { role:'assistant', content: reply };
                return last;
              });
            }
          } catch {}
        }
      }
    } catch (e) {
      const em = e?.message || '';
      const msg = em.includes('auth') || em.includes('401') || em.includes('403')
        ? '🔑 API key missing — Settings → APIs mein Groq key add karo (free hai)'
        : em.includes('500') || em.includes('502')
        ? '⚠️ Server error — thodi der mein try karo'
        : em.includes('Failed to fetch') || em.includes('NetworkError')
        ? '📶 Network check karo — ya Aira se full chat mein baat karo'
        : 'Kuch hua 🥺 Full chat mein try karo → ';
      setMsgs(p => [...p, { role: 'assistant', content: msg }]);
    }
    setLoading(false);
  }

  function startVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const sr = new SR();
    sr.lang = 'hi-IN';
    sr.onresult = e => { send(e.results[0][0].transcript); setListening(false); };
    sr.onerror = () => setListening(false);
    sr.onend = () => setListening(false);
    setListening(true);
    sr.start();
  }

  const quickPrompts = isAria
    ? ['Kya chal raha hai?', 'Miss kiya 🥺', 'Kuch baat karo']
    : ['Motivate karo', 'Quick advice do', 'Kuch interesting batao'];

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className={`fixed bottom-6 right-4 z-[9999] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all active:scale-95 ${
            isAria
              ? 'bg-gradient-to-br from-pink-500 to-rose-400 shadow-[0_0_25px_rgba(236,72,153,0.5)]'
              : 'bg-gradient-to-br from-blue-600 to-cyan-500 shadow-[0_0_25px_rgba(26,86,219,0.5)]'
          }`}
          title="JARVIS se baat karo"
        >
          <span className="text-white font-black text-xl">{isAria ? 'A' : 'J'}</span>
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-full animate-ping opacity-20 bg-white"/>
        </button>
      )}

      {/* Chat Overlay */}
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-end p-4" onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}/>

          {/* Chat Panel */}
          <div className="relative w-full max-w-sm bg-[#080c14] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
               style={{ maxHeight: '75vh' }}>

            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b border-white/[0.06] ${isAria ? 'bg-gradient-to-r from-pink-600/10 to-rose-600/5' : 'bg-gradient-to-r from-blue-600/10 to-cyan-600/5'}`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isAria ? 'bg-gradient-to-br from-pink-500 to-rose-400' : 'bg-gradient-to-br from-blue-600 to-cyan-500'}`}>
                  <span className="text-white font-black text-sm">{isAria ? 'A' : 'J'}</span>
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{isAria ? 'Aira' : 'JARVIS'}</p>
                  <p className="text-[10px] text-slate-500">Quick chat · {path.replace('/','')||'Home'}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <a href="/chat" className="text-[11px] text-blue-400 px-2 py-1 bg-blue-500/10 rounded-lg hover:bg-blue-500/20 transition-colors">
                  Full chat →
                </a>
                <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                  <X size={14}/>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[120px]">
              {msgs.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-slate-600 text-xs mb-3">Quick poochho kuch bhi 👇</p>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {quickPrompts.map(q => (
                      <button key={q} onClick={() => send(q)}
                        className={`text-[11px] px-3 py-1.5 rounded-full border transition-all active:scale-95 ${
                          isAria ? 'bg-pink-500/10 border-pink-500/20 text-pink-300 hover:bg-pink-500/20'
                                 : 'bg-blue-500/10 border-blue-500/20 text-blue-300 hover:bg-blue-500/20'
                        }`}>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {msgs.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : isAria
                        ? 'bg-rose-950/50 border border-rose-500/15 text-slate-100 rounded-bl-sm'
                        : 'bg-white/[0.06] border border-white/[0.08] text-slate-100 rounded-bl-sm'
                  }`}>
                    {m.content}
                    {i === msgs.length-1 && loading && m.role === 'assistant' && (
                      <span className="ml-1 inline-block w-1.5 h-3.5 bg-current opacity-60 animate-pulse rounded-full"/>
                    )}
                  </div>
                </div>
              ))}
              {loading && msgs[msgs.length-1]?.role === 'user' && (
                <div className="flex justify-start">
                  <div className="bg-white/[0.06] border border-white/[0.08] px-3 py-2 rounded-2xl rounded-bl-sm">
                    <div className="flex gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full animate-bounce ${isAria?'bg-pink-400':'bg-slate-400'}`} style={{animationDelay:'0ms'}}/>
                      <span className={`w-1.5 h-1.5 rounded-full animate-bounce ${isAria?'bg-pink-400':'bg-slate-400'}`} style={{animationDelay:'150ms'}}/>
                      <span className={`w-1.5 h-1.5 rounded-full animate-bounce ${isAria?'bg-pink-400':'bg-slate-400'}`} style={{animationDelay:'300ms'}}/>
                    </div>
                  </div>
                </div>
              )}
              <div ref={endRef}/>
            </div>

            {/* Input */}
            <div className="px-3 py-2 border-t border-white/[0.06] flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder={isAria ? 'Aira se bolo...' : 'Kuch poocho...'}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-slate-600 outline-none focus:border-blue-500/40 transition-colors"
              />
              <button onClick={startVoice}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${listening ? 'text-red-400 bg-red-500/10' : 'text-slate-500 hover:text-slate-300'}`}>
                {listening ? <MicOff size={15}/> : <Mic size={15}/>}
              </button>
              <button onClick={() => send()}
                disabled={!input.trim() || loading}
                className={`w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30 transition-all active:scale-95 ${
                  isAria ? 'bg-pink-500' : 'bg-blue-600'
                }`}>
                <Send size={13} className="text-white ml-0.5"/>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
