'use client';
import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Target, Brain, Mic, TrendingUp, Flame, ChevronRight, Zap, RefreshCw, Sun, Moon, Sunrise, Sunset, Wind, Cloud, CloudRain } from 'lucide-react';
import Link from 'next/link';

// ── Live clock ──────────────────────────────────────────────
function LiveClock({ h, m, ampm }) {
  return (
    <div className="text-center select-none">
      <div className="text-5xl font-black text-white tracking-tight leading-none" style={{fontVariantNumeric:'tabular-nums'}}>
        {String(h%12||12).padStart(2,'0')}:{String(m).padStart(2,'0')}
        <span className="text-xl text-slate-500 ml-2 font-medium">{ampm}</span>
      </div>
    </div>
  );
}

// ── Weather icon ─────────────────────────────────────────────
function WeatherIcon({ condition = '' }) {
  const c = condition.toLowerCase();
  if (/rain|drizzle/.test(c)) return <CloudRain size={16} className="text-blue-400"/>;
  if (/cloud|overcast/.test(c)) return <Cloud size={16} className="text-slate-400"/>;
  if (/wind/.test(c)) return <Wind size={16} className="text-cyan-400"/>;
  return <Sun size={16} className="text-yellow-400"/>;
}

// ── Main Dashboard ───────────────────────────────────────────
export default function DashboardPage() {
  const [now, setNow]       = useState({ h:0, m:0, ampm:'AM', day:'', date:'' });
  const [profile, setProfile] = useState({});
  const [goals, setGoals]   = useState([]);
  const [memories, setMems] = useState([]);
  const [convs, setConvs]   = useState([]);
  const [quote, setQuote]   = useState('');
  const [quoteIdx, setQIdx] = useState(0);
  const [weekMood, setMood] = useState([]);
  const [weather, setWeather] = useState(null);
  const [brief, setBrief]   = useState('');
  const [briefLoading, setBriefLoad] = useState(false);
  const [streak, setStreak] = useState(0);
  const [autoMems, setAutoMems] = useState([]);
  const [loading, setLoad]  = useState(true);

  const QUOTES = [
    'Jo kal possible nahi laga, aaj possible hai.',
    'Teri consistency hi teri superpower hai.',
    'Chota step bhi aage ka step hai.',
    'Progress > Perfection.',
    'Mehnat kabhi bekar nahi hoti — waqt lagta hai bas.',
    'Duniya tujhe tab samjhegi jab tu khud ko samjhe.',
    'Shuru karna hi sabse mushkil hota hai. Shuru kar.',
    'Har din ek naya mauka hai.',
    'Aaj ka effort kal ka result ban jaata hai.',
    'Failure ek event hai, identity nahi.',
    'Slow progress is still progress — mat ruk.',
    'Teri story abhi khatam nahi hui.',
    'Jo cheez daraye, wahi karne layak hoti hai.',
    'Ek din ka kaam ek din mein. Bas.',
    'Tu capable hai — sirf believe karna baaki hai.',
  ];

  useEffect(() => {
    const tick = () => {
      const n = new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Kolkata'}));
      const h = n.getHours(), m = n.getMinutes();
      const days = ['Raviwar','Somwar','Mangalwar','Budhwar','Guruwar','Shukrawar','Shaniwaar'];
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      setNow({ h, m, ampm: h>=12?'PM':'AM', day: days[n.getDay()], date: `${n.getDate()} ${months[n.getMonth()]}` });
    };
    tick();
    const iv = setInterval(tick, 15000);

    // Load all localStorage data
    try {
      const p = JSON.parse(localStorage.getItem('jarvis_profile')||'{}');
      setProfile(p);
      const g = JSON.parse(localStorage.getItem('jarvis_goals')||'[]');
      setGoals(g.filter(x=>x.status==='active').slice(0,3));
      const m = JSON.parse(localStorage.getItem('jarvis_memories')||'[]');
      setMems(m.slice(-4));
      const c = JSON.parse(localStorage.getItem('jarvis_conversations')||'[]');
      setConvs(c.slice().reverse().slice(0,3));
      const logs = JSON.parse(localStorage.getItem('jarvis_daily_logs')||'[]');
      setMood(logs.slice(-7).map(l=>l.mood_score||5));
      const am = JSON.parse(localStorage.getItem('jarvis_auto_memories')||'[]');
      setAutoMems(am.slice(0,5));
      // Streak
      let s=0;
      for(let i=0;i<7;i++){
        const key=new Date(Date.now()-i*86400000).toISOString().slice(0,10);
        if(logs.find(l=>l.date===key)) s++; else break;
      }
      setStreak(s);
      // Cached weather
      const w = localStorage.getItem('jarvis_weather_cache');
      if(w) { try { setWeather(JSON.parse(w)); } catch {} }
    } catch {}

    setQuote(QUOTES[Math.floor(Math.random()*QUOTES.length)]);
    setLoad(false);
    return () => clearInterval(iv);
  }, []);

  // Load weather in background
  useEffect(() => {
    const loc = localStorage.getItem('jarvis_user_location');
    if (!loc) return;
    try {
      const { lat, lng } = JSON.parse(loc);
      const key = localStorage.getItem('jarvis_openweather_key') || null;
      if (!key) return;
      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${key}&units=metric`)
        .then(r=>r.json()).then(d => {
          const w = { temp: Math.round(d.main?.temp), condition: d.weather?.[0]?.description, city: d.name };
          setWeather(w);
          localStorage.setItem('jarvis_weather_cache', JSON.stringify({...w, ts:Date.now()}));
        }).catch(()=>{});
    } catch {}
  }, []);

  const name = profile.name || 'Yaar';
  const { h, m, ampm, day, date } = now;
  const greeting = h<5?'Raat ho gayi':h<12?`Good morning`:h<17?`Kya scene hai`:h<21?`Shaam ho gayi`:`Raat ka mood?`;
  const greetEmoji = h<5?'🌙':h<12?'☀️':h<17?'⛅':h<21?'🌆':'🌙';

  async function generateBrief() {
    if (briefLoading) return;
    setBriefLoad(true);
    setBrief('');
    const context = {
      name, time: `${h}:${String(m).padStart(2,'0')} ${ampm}`, day,
      goals: goals.map(g=>g.title).join(', ') || 'none',
      mood: weekMood.slice(-1)[0] || 7,
      memories: autoMems.slice(0,3).map(m=>`${m.key}: ${m.val}`).join(', ') || 'none',
      streak,
    };
    try {
      const r = await fetch('/api/chat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          message: `Give me a very short personal morning brief for ${name}. Time: ${context.time} ${context.day}. Their goals: ${context.goals}. Mood recently: ${context.mood}/10. Keep it to 2-3 lines max, Hinglish, warm and personal. No generic advice.`,
          history: [], mode: 'flash',
        })
      });
      const d = await r.json();
      setBrief(d.reply || '');
    } catch { setBrief('Aaj ka din shuru karo — main yahaan hoon! 🚀'); }
    setBriefLoad(false);
  }

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center animate-pulse shadow-[0_0_30px_rgba(59,130,246,0.4)]">
        <span className="text-white font-black text-xl">J</span>
      </div>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto no-scrollbar" style={{background:'transparent'}}>
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24 space-y-4">

        {/* ── Hero — Clock + Greeting ── */}
        <div className="glass border border-white/[0.06] rounded-3xl p-5 relative overflow-hidden"
          style={{background:'linear-gradient(135deg,rgba(26,86,219,0.12),rgba(6,182,212,0.07))'}}>
          {/* Ambient glow */}
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"/>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-slate-400 text-sm font-medium">{greetEmoji} {greeting}</p>
              <h1 className="text-2xl font-black text-white mt-0.5">{name}</h1>
              <p className="text-slate-600 text-xs mt-0.5">{day}, {date}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {streak > 0 && (
                <div className="flex items-center gap-1.5 bg-orange-500/15 border border-orange-500/25 px-3 py-1.5 rounded-xl">
                  <Flame size={14} className="text-orange-400"/>
                  <span className="text-orange-400 font-bold text-sm">{streak}d</span>
                </div>
              )}
              {weather && (
                <div className="flex items-center gap-1.5 bg-white/[0.05] border border-white/[0.08] px-3 py-1.5 rounded-xl">
                  <WeatherIcon condition={weather.condition}/>
                  <span className="text-slate-300 text-xs font-medium">{weather.temp}°C</span>
                </div>
              )}
            </div>
          </div>
          <LiveClock h={h} m={m} ampm={ampm}/>
        </div>

        {/* ── JARVIS Daily Brief ── */}
        <div className="glass border border-blue-500/20 rounded-2xl p-4"
          style={{background:'linear-gradient(135deg,rgba(26,86,219,0.08),rgba(6,182,212,0.04))'}}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                <span className="text-white font-black text-[9px]">J</span>
              </div>
              <span className="text-blue-400 text-xs font-semibold uppercase tracking-wide">JARVIS Brief</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={()=>{ const q=QUOTES[(QUOTES.indexOf(quote)+1)%QUOTES.length]; setQuote(q); }}
                className="text-slate-600 hover:text-slate-400 transition-colors p-1">
                <RefreshCw size={12}/>
              </button>
              <button onClick={generateBrief}
                className="text-[11px] text-blue-400 hover:text-blue-300 border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 rounded-lg transition-all active:scale-95">
                {briefLoading ? '...' : 'Generate'}
              </button>
            </div>
          </div>
          {brief ? (
            <p className="text-slate-200 text-sm leading-relaxed">{brief}</p>
          ) : (
            <p className="text-slate-400 text-sm leading-relaxed italic">"{quote}"</p>
          )}
        </div>

        {/* ── Quick Actions ── */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { href:'/chat',  icon:MessageSquare, label:'Chat',   sub:`${convs.length} convs`,  color:'blue',  bg:'from-blue-600 to-blue-500'   },
            { href:'/voice', icon:Mic,           label:'Voice',  sub:'Hold to talk',            color:'purple',bg:'from-purple-600 to-violet-500'},
            { href:'/goals', icon:Target,        label:'Goals',  sub:`${goals.length} active`,  color:'green', bg:'from-emerald-600 to-green-500'},
          ].map(({ href, icon: Icon, label, sub, color, bg }) => (
            <Link key={href} href={href}
              className="glass border border-white/[0.06] rounded-2xl p-3.5 flex flex-col items-center gap-2 hover:border-white/15 active:scale-95 transition-all">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${bg} flex items-center justify-center shadow-lg`}>
                <Icon size={18} className="text-white"/>
              </div>
              <div className="text-center">
                <p className="text-white text-xs font-bold">{label}</p>
                <p className="text-slate-600 text-[10px]">{sub}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* ── Recent Conversations ── */}
        {convs.length > 0 && (
          <div className="glass border border-white/[0.06] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageSquare size={14} className="text-slate-500"/>
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Recent Chats</span>
              </div>
              <Link href="/chat" className="text-blue-400 text-xs flex items-center gap-0.5 hover:text-blue-300">
                Open <ChevronRight size={12}/>
              </Link>
            </div>
            <div className="space-y-1.5">
              {convs.map((c,i) => (
                <Link key={c.id} href={`/chat`}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/[0.05] transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-blue-600/15 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <MessageSquare size={12} className="text-blue-400"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-300 text-xs font-medium truncate">{c.title || 'Naya Chat'}</p>
                    {c.updated_at && (
                      <p className="text-slate-700 text-[10px]">{new Date(c.updated_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</p>
                    )}
                  </div>
                  <span className="text-slate-700 text-[10px] shrink-0">{c.message_count || 0}↑</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Mood Chart ── */}
        {weekMood.length > 1 && (
          <div className="glass border border-white/[0.06] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wide">7-Day Mood</span>
              <Link href="/analytics" className="text-blue-400 text-xs flex items-center gap-0.5">
                Details <ChevronRight size={12}/>
              </Link>
            </div>
            <div className="flex items-end gap-1.5 h-12">
              {weekMood.map((v,i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div style={{
                    width:'100%', borderRadius:6,
                    height: `${Math.max(6, (v/10)*48)}px`,
                    background: v>=7?'linear-gradient(to top,#059669,#34d399)':v>=5?'linear-gradient(to top,#1d4ed8,#60a5fa)':'linear-gradient(to top,#4338ca,#818cf8)',
                    opacity: 0.6 + (i/weekMood.length)*0.4,
                    transition: 'height 0.5s ease',
                  }}/>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-1.5">
              {['M','T','W','T','F','S','S'].slice(0,weekMood.length).map((d,i)=>(
                <span key={i} className="flex-1 text-center text-[9px] text-slate-700">{d}</span>
              ))}
            </div>
          </div>
        )}

        {/* ── Active Goals ── */}
        {goals.length > 0 && (
          <div className="glass border border-white/[0.06] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target size={14} className="text-emerald-400"/>
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Active Goals</span>
              </div>
              <Link href="/goals" className="text-blue-400 text-xs flex items-center gap-0.5">All <ChevronRight size={12}/></Link>
            </div>
            <div className="space-y-2">
              {goals.map((g,i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${i===0?'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]':i===1?'bg-blue-400':'bg-purple-400'}`}/>
                  <p className="text-slate-300 text-sm truncate flex-1">{g.title}</p>
                  {g.progress > 0 && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-400 rounded-full transition-all" style={{width:`${g.progress}%`}}/>
                      </div>
                      <span className="text-emerald-400 text-[10px] font-mono">{g.progress}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Memory Snippets ── */}
        {(memories.length > 0 || autoMems.length > 0) && (
          <div className="glass border border-white/[0.06] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Brain size={14} className="text-purple-400"/>
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wide">What JARVIS Remembers</span>
              </div>
              <Link href="/memory" className="text-blue-400 text-xs flex items-center gap-0.5">All <ChevronRight size={12}/></Link>
            </div>
            <div className="space-y-1.5">
              {autoMems.slice(0,3).map((m,i) => (
                <div key={i} className="flex items-start gap-2.5 px-3 py-1.5 bg-purple-500/5 border border-purple-500/10 rounded-xl">
                  <span className="text-purple-400 text-[10px] mt-0.5 shrink-0">✦</span>
                  <p className="text-slate-400 text-xs"><span className="text-slate-500 capitalize">{m.key}:</span> {m.val}</p>
                </div>
              ))}
              {memories.slice(-2).map((m,i) => (
                <div key={i} className="flex items-start gap-2.5 px-3 py-1.5">
                  <span className="text-slate-700 text-[10px] mt-0.5 shrink-0">•</span>
                  <p className="text-slate-500 text-xs truncate">{m.key}: {m.value?.slice(0,50)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {goals.length === 0 && memories.length === 0 && autoMems.length === 0 && convs.length === 0 && (
          <div className="glass border border-blue-500/15 rounded-2xl p-5"
            style={{background:'linear-gradient(135deg,rgba(26,86,219,0.08),rgba(6,182,212,0.04))'}}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-[0_0_20px_rgba(26,86,219,0.4)]">
                <span className="text-white font-black text-base">J</span>
              </div>
              <div>
                <p className="text-white font-bold">JARVIS ready hai!</p>
                <p className="text-slate-500 text-xs">Tera personal AI — free forever</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                {i:'💬',t:'Chat karo',s:'Weather, jokes, code'},
                {i:'🎯',t:'Goals banao',s:'AI breakdown karega'},
                {i:'🎙️',t:'Voice mode',s:'Baat karo seedha'},
                {i:'📊',t:'Analytics',s:'Mood + progress track'},
              ].map(c=>(
                <div key={c.t} className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3">
                  <span className="text-xl">{c.i}</span>
                  <p className="text-white text-xs font-semibold mt-1">{c.t}</p>
                  <p className="text-slate-600 text-[10px]">{c.s}</p>
                </div>
              ))}
            </div>
            <Link href="/chat" className="flex items-center justify-center gap-2 bg-blue-600/20 border border-blue-500/35 text-blue-400 text-sm px-4 py-2.5 rounded-xl hover:bg-blue-600/30 transition-all active:scale-95">
              <MessageSquare size={14}/> Chat shuru karo
            </Link>
          </div>
        )}

        {/* ── Log Today Mood ── */}
        <DayLogQuick/>

      </div>
    </div>
  );
}

// ── Quick day log ──────────────────────────────────────────────
function DayLogQuick() {
  const [mood, setMood] = useState(7);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    try {
      await fetch('/api/analytics', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'log_day', mood_score:mood, energy:mood, productivity:mood }),
      });
      // Also save to localStorage for offline
      const logs = JSON.parse(localStorage.getItem('jarvis_daily_logs')||'[]');
      const today = new Date().toISOString().slice(0,10);
      const existing = logs.findIndex(l=>l.date===today);
      const entry = { date:today, mood_score:mood, energy:mood, productivity:mood };
      if (existing>=0) logs[existing]=entry; else logs.push(entry);
      localStorage.setItem('jarvis_daily_logs', JSON.stringify(logs));
      setSaved(true);
      setTimeout(()=>setSaved(false), 2000);
    } catch {}
  };

  const moods = [{v:2,e:'😞'},{v:4,e:'😐'},{v:6,e:'🙂'},{v:8,e:'😊'},{v:10,e:'🤩'}];

  return (
    <div className="glass border border-white/[0.06] rounded-2xl p-4">
      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">Aaj ka mood?</p>
      <div className="flex items-center gap-2.5">
        <div className="flex gap-1.5 flex-1">
          {moods.map(m => (
            <button key={m.v} onClick={()=>setMood(m.v)}
              className="flex-1 text-xl py-1.5 rounded-xl transition-all active:scale-90"
              style={{
                background: mood===m.v?'rgba(26,86,219,0.25)':'rgba(255,255,255,0.03)',
                border: mood===m.v?'1px solid rgba(26,86,219,0.4)':'1px solid rgba(255,255,255,0.05)',
              }}>
              {m.e}
            </button>
          ))}
        </div>
        <button onClick={save}
          className="text-xs px-4 py-2.5 rounded-xl font-medium transition-all active:scale-95 shrink-0"
          style={{
            background: saved?'rgba(16,185,129,0.2)':'rgba(26,86,219,0.2)',
            border: saved?'1px solid rgba(16,185,129,0.4)':'1px solid rgba(26,86,219,0.3)',
            color: saved?'#34d399':'#60a5fa',
          }}>
          {saved?'✓ Saved':'Log'}
        </button>
      </div>
    </div>
  );
}
