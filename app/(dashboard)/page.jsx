'use client';
import { useState, useEffect } from 'react';
import { MessageSquare, Target, Brain, Mic, TrendingUp, Flame, Sun, Moon, Star, ChevronRight, RefreshCw, Zap } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [time, setTime]       = useState('');
  const [greeting, setGreet]  = useState('');
  const [profile, setProfile] = useState({});
  const [goals, setGoals]     = useState([]);
  const [memories, setMems]   = useState([]);
  const [convCount, setConvs] = useState(0);
  const [quote, setQuote]     = useState('');
  const [weekMood, setMood]   = useState([]);
  const [loading, setLoad]    = useState(true);

  useEffect(() => {
    // Clock
    const tick = () => {
      const now = new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Kolkata'}));
      const h = now.getHours(), m = now.getMinutes();
      setTime(`${String(h%12||12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`);
      setGreet(h<5?'🌙 Raat ho gayi':h<12?'☀️ Good Morning':h<17?'⛅ Kya chal raha hai':h<21?'🌆 Shaam ho gayi':'🌙 Raat ho gayi');
    };
    tick(); const iv = setInterval(tick, 30000);

    // Load all data from localStorage
    try {
      const p = JSON.parse(localStorage.getItem('jarvis_profile')||'{}');
      setProfile(p);
      const g = JSON.parse(localStorage.getItem('jarvis_goals')||'[]');
      setGoals(g.filter(g=>g.status==='active').slice(0,3));
      const m = JSON.parse(localStorage.getItem('jarvis_memories')||'[]');
      setMems(m.slice(-5));
      const c = JSON.parse(localStorage.getItem('jarvis_conversations')||'[]');
      setConvs(c.length);
      const logs = JSON.parse(localStorage.getItem('jarvis_daily_logs')||'[]');
      setMood(logs.slice(-7).map(l=>l.mood_score||5));
    } catch {}

    // Motivational quotes — large pool
    const quotes = [
      'Jo kal possible nahi laga, aaj possible hai.',
      'Teri consistency hi teri superpower hai.',
      'Chota step bhi aage ka step hai.',
      'Progress > Perfection.',
      'Ek din ka kaam ek din mein. Bas.',
      'Mehnat kabhi bekar nahi hoti — waqt lagta hai bas.',
      'Duniya tujhe tab samjhegi jab tu khud ko samjhe.',
      'Shuru karna hi sabse mushkil hota hai. Shuru kar.',
      'Har din ek naya mauka hai khud ko prove karne ka.',
      'Teri story abhi khatam nahi hui — agle chapter pe jaa.',
      'Jo cheez daraye, wahi karne layak hoti hai.',
      'Slow progress is still progress — mat ruk.',
      'Teri life ka director tu hai — script bhi tu likhega.',
      'Aaj ka effort kal ka result ban jaata hai.',
      'Failure ek event hai, identity nahi.',
    ];
    setQuote(quotes[Math.floor(Math.random()*quotes.length)]);
    setLoad(false);
    return () => clearInterval(iv);
  }, []);

  const name = profile.name || 'Yaar';
  const streak = (() => {
    try {
      const logs = JSON.parse(localStorage.getItem('jarvis_daily_logs')||'[]');
      if (!logs.length) return 0;
      let s = 0, d = new Date();
      for (let i=0;i<7;i++) {
        const key = new Date(d.getTime()-i*86400000).toISOString().slice(0,10);
        if (logs.find(l=>l.date===key)) s++; else break;
      }
      return s;
    } catch { return 0; }
  })();

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center animate-pulse">
        <span className="text-white font-black text-xl">J</span>
      </div>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto" style={{background:'transparent'}}>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5 pb-24">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-slate-500 text-sm">{greeting}</p>
            <h1 className="text-2xl font-bold text-white mt-0.5">{name} 👋</h1>
            <p className="text-slate-600 text-xs mt-1">{time}</p>
          </div>
          {streak > 0 && (
            <div className={`flex flex-col items-center rounded-2xl px-4 py-2 ${streak >= 7 ? 'bg-orange-500/20 border border-orange-500/40 shadow-[0_0_20px_rgba(249,115,22,0.2)]' : 'bg-orange-500/10 border border-orange-500/20'}`}>
              <Flame size={20} className="text-orange-400"/>
              <span className="text-orange-400 font-bold text-lg leading-none">{streak}</span>
              <span className="text-orange-400/60 text-[10px]">streak</span>
            </div>
          )}
        </div>

        {/* Quick actions — 3 cards */}
        <div className="grid grid-cols-3 gap-2.5">
          <Link href="/chat" className="glass border border-white/[0.06] rounded-2xl p-3.5 flex flex-col items-center gap-2 hover:border-blue-500/30 active:scale-95 transition-all">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 flex items-center justify-center">
              <MessageSquare size={17} className="text-blue-400"/>
            </div>
            <div className="text-center">
              <p className="text-white text-xs font-semibold">Chat</p>
              <p className="text-slate-600 text-[10px]">{convCount} convs</p>
            </div>
          </Link>
          <Link href="/voice" className="glass border border-white/[0.06] rounded-2xl p-3.5 flex flex-col items-center gap-2 hover:border-purple-500/30 active:scale-95 transition-all">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 flex items-center justify-center">
              <Mic size={17} className="text-purple-400"/>
            </div>
            <div className="text-center">
              <p className="text-white text-xs font-semibold">Voice</p>
              <p className="text-slate-600 text-[10px]">Tap to talk</p>
            </div>
          </Link>
          <Link href="/analytics" className="glass border border-white/[0.06] rounded-2xl p-3.5 flex flex-col items-center gap-2 hover:border-cyan-500/30 active:scale-95 transition-all">
            <div className="w-9 h-9 rounded-xl bg-cyan-600/20 flex items-center justify-center">
              <TrendingUp size={17} className="text-cyan-400"/>
            </div>
            <div className="text-center">
              <p className="text-white text-xs font-semibold">Stats</p>
              <p className="text-slate-600 text-[10px]">Your data</p>
            </div>
          </Link>
        </div>

        {/* Today's focus — JARVIS quote */}
        <div className="glass border border-blue-500/15 rounded-2xl p-4"
          style={{background:'linear-gradient(135deg,rgba(26,86,219,0.08),rgba(6,182,212,0.05))'}}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-blue-400"/>
              <span className="text-blue-400 text-xs font-medium tracking-wide uppercase">JARVIS says</span>
            </div>
            <button onClick={()=>{
              const q=['Jo kal possible nahi laga, aaj possible hai.','Teri consistency hi teri superpower hai.','Shuru karna hi sabse mushkil hota hai. Shuru kar.','Har din ek naya mauka hai.','Aaj ka effort kal ka result ban jaata hai.','Failure ek event hai, identity nahi.','Slow progress is still progress — mat ruk.'];
              import('react').then(({useState:_})=>{});
              const el=document.getElementById('jarvis-quote');
              if(el){el.style.opacity='0';setTimeout(()=>{el.textContent='"'+q[Math.floor(Math.random()*q.length)]+'"';el.style.opacity='1';},200);}
            }} className="text-slate-600 hover:text-blue-400 transition-colors" title="New quote">
              <RefreshCw size={12}/>
            </button>
          </div>
          <p id="jarvis-quote" className="text-slate-300 text-sm leading-relaxed italic" style={{transition:'opacity 0.2s'}}>"{quote}"</p>
        </div>

        {/* Mood mini chart */}
        {weekMood.length > 1 && (
          <div className="glass border border-white/5 rounded-2xl p-4">
            <p className="text-slate-400 text-xs font-medium mb-3 uppercase tracking-wide">7-Day Mood</p>
            <div className="flex items-end gap-1.5 h-10">
              {weekMood.map((v,i) => (
                <div key={i} style={{
                  flex:1, borderRadius:4,
                  height: `${(v/10)*100}%`,
                  background: v>=7?'#10b981':v>=5?'#3b82f6':'#6366f1',
                  opacity: 0.7 + (i/weekMood.length)*0.3,
                  minHeight: 4,
                }}/>
              ))}
            </div>
          </div>
        )}

        {/* Active Goals */}
        {goals.length > 0 && (
          <div className="glass border border-white/5 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target size={14} className="text-green-400"/>
                <span className="text-slate-400 text-xs font-medium uppercase tracking-wide">Active Goals</span>
              </div>
              <Link href="/goals" className="text-blue-400 text-xs flex items-center gap-1 hover:text-blue-300">
                All <ChevronRight size={12}/>
              </Link>
            </div>
            <div className="space-y-2">
              {goals.map((g,i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-400 shrink-0"/>
                  <p className="text-slate-300 text-sm truncate">{g.title}</p>
                  {g.progress > 0 && (
                    <span className="text-green-400 text-xs ml-auto shrink-0">{g.progress}%</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Memory snippets — what JARVIS remembers */}
        {memories.length > 0 && (
          <div className="glass border border-white/5 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Brain size={14} className="text-purple-400"/>
                <span className="text-slate-400 text-xs font-medium uppercase tracking-wide">What I Remember</span>
              </div>
              <Link href="/memory" className="text-blue-400 text-xs flex items-center gap-1">
                All <ChevronRight size={12}/>
              </Link>
            </div>
            <div className="space-y-1.5">
              {memories.slice(-3).map((m,i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-slate-600 text-xs mt-0.5 shrink-0">•</span>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    <span className="text-slate-500">{m.key}:</span> {m.value?.slice(0,60)}{m.value?.length>60?'...':''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state — new user */}
        {goals.length === 0 && memories.length === 0 && (
          <div className="glass border border-white/5 rounded-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 mx-auto mb-3 flex items-center justify-center">
              <span className="text-white font-black">J</span>
            </div>
            <p className="text-white font-medium mb-1">JARVIS ready hai!</p>
            <p className="text-slate-500 text-sm mb-4">Chat shuru karo — main seekhunga, yaad rakhunga, aur actually help karunga.</p>
            <Link href="/chat" className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 text-sm px-4 py-2 rounded-xl hover:bg-blue-600/30 transition-all">
              <MessageSquare size={14}/> Start chatting
            </Link>
          </div>
        )}

        {/* Log mood */}
        <div className="glass border border-white/5 rounded-2xl p-4">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-3">Log Today</p>
          <DayLogQuick />
        </div>

      </div>
    </div>
  );
}

// ── Quick day log ─────────────────────────────────────────────
function DayLogQuick() {
  const [mood, setMood] = useState(7);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    try {
      await fetch('/api/analytics', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ action:'log_day', mood_score: mood, energy: mood, productivity: mood }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
  };

  const moods = [
    {v:2,e:'😞'},{v:4,e:'😐'},{v:6,e:'🙂'},{v:8,e:'😊'},{v:10,e:'🤩'}
  ];

  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-2 flex-1">
        {moods.map(m => (
          <button key={m.v} onClick={() => setMood(m.v)}
            className="flex-1 text-xl py-1 rounded-xl transition-all"
            style={{background: mood===m.v ? 'rgba(26,86,219,0.25)' : 'rgba(255,255,255,0.03)',
              border: mood===m.v ? '1px solid rgba(26,86,219,0.4)' : '1px solid transparent'}}>
            {m.e}
          </button>
        ))}
      </div>
      <button onClick={save}
        className="text-xs px-3 py-2 rounded-xl transition-all"
        style={{background: saved ? 'rgba(16,185,129,0.2)' : 'rgba(26,86,219,0.2)',
          border: saved ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(26,86,219,0.3)',
          color: saved ? '#34d399' : '#60a5fa'}}>
        {saved ? '✓' : 'Log'}
      </button>
    </div>
  );
}
