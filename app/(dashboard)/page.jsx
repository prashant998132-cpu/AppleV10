'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart2, Target, Brain, Zap, TrendingUp, MessageSquare, BookOpen, Calendar, ChevronRight, RefreshCw, Flame } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip, AreaChart, Area } from 'recharts';
import Link from 'next/link';

export default function DashboardPage() {
  const [data, setData]         = useState(null);
  const [proactive, setProactive] = useState([]);
  const [report, setReport]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [logOpen, setLogOpen]   = useState(false);
  const [logData, setLogData]   = useState({ mood: 7, energy: 7, productivity: 7, focusHours: 2, notes: '' });
  const [saving, setSaving]     = useState(false);
  const [genReport, setGenReport] = useState(false);
  const router = useRouter();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/analytics?type=full');
      if (r.status === 401) { router.push('/login'); return; }
      const d = await r.json();
      setData(d);
      setProactive(d.proactive || []);
    } catch {} finally { setLoading(false); }
  }

  async function saveLog() {
    setSaving(true);
    try {
      await fetch('/api/analytics', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'log_day', ...logData }) });
      setLogOpen(false); load();
    } finally { setSaving(false); }
  }

  async function getWeeklyReport() {
    setGenReport(true);
    try {
      const r = await fetch('/api/analytics', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'weekly_report' }) });
      const d = await r.json();
      setReport(d.report);
    } finally { setGenReport(false); }
  }

  const STAT_COLORS = { mood:'#6D28D9', productivity:'#1A56DB', energy:'#0891B2', focus:'#15803D' };


  // First visit detection
  const isNew = !data?.logs?.length && !data?.goals?.length;

  const hour = new Date().getHours();
  const loadingQuips = [
    'Teri files dhundh raha hoon...',
    'Memory load ho rahi hai...',
    'Sab kuch calculate kar raha hoon...',
    'Almost ready yaar...',
    hour < 6 ? 'Raat ko kaam karana? theek hai...' : hour < 12 ? 'Good morning! Loading...' : 'Chal deta hoon...',
  ];
  const [quipIdx] = useState(() => Math.floor(Math.random() * loadingQuips.length));

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping"/>
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center orb-pulse shadow-[0_0_40px_rgba(26,86,219,0.5)]">
            <span className="text-white font-black text-2xl">J</span>
          </div>
        </div>
        <p className="text-slate-500 text-sm animate-pulse">{loadingQuips[quipIdx]}</p>
      </div>
    </div>
  );

  const chartData = data?.logs?.map(l => ({ date: l.log_date?.slice(5), mood: l.mood_score, prod: l.productivity, energy: l.energy })) || [];

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 pb-20 lg:pb-6 space-y-4 max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-white">
              {hour < 6 ? '🌙 Raat ka JARVIS' : hour < 12 ? '🌅 Good Morning!' : hour < 17 ? '☀️ Kya chal raha hai?' : hour < 21 ? '🌆 Shaam ho gayi' : '🌙 Raat ho gayi'}
            </h1>
            <p className="text-xs text-slate-500">{new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setLogOpen(true)}
              className="px-3 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-xl text-xs font-medium hover:bg-blue-600/30 transition-colors">
              + Log Day
            </button>
            <button onClick={load} className="p-2 glass-card text-slate-500 hover:text-white transition-colors rounded-xl">
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''}/>
            </button>
          </div>
        </div>

        {/* Prediction Banner */}
        {data?.prediction && (
          <div className="glass-card p-4 border border-purple-500/20 bg-purple-500/5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Zap size={16} className="text-purple-400"/>
              </div>
              <div>
                <p className="text-sm font-semibold text-purple-300">Tomorrow's Prediction</p>
                <p className="text-xs text-slate-400 mt-1">{data.prediction.recommendation}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-slate-500">Predicted score: <span className="text-purple-400 font-bold">{data.prediction.predicted_score}/10</span></span>
                  <span className="text-xs text-slate-500">Best time: <span className="text-cyan-400">{data.prediction.best_time}</span></span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label:'Avg Mood',     value: data?.avgMood || '—',       unit:'/10', icon:'😊', color:'text-purple-400', bg:'bg-purple-500/10' },
            { label:'Productivity', value: data?.avgProductivity || '—',unit:'/10', icon:'⚡', color:'text-blue-400',   bg:'bg-blue-500/10' },
            { label:'Focus Hours',  value: data?.totalFocusHours || '—',unit:'h',   icon:'🎯', color:'text-cyan-400',   bg:'bg-cyan-500/10' },
            { label:'Consistency',  value: data?.consistencyScore || 0, unit:'%',   icon:'🔥', color:'text-orange-400', bg:'bg-orange-500/10' },
          ].map(s => (
            <div key={s.label} className="glass-card p-4">
              <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center text-base mb-2`}>{s.icon}</div>
              <div className={`text-2xl font-black ${s.color}`}>{s.value}<span className="text-sm font-normal text-slate-500">{s.unit}</span></div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        {chartData.length > 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="glass-card p-4">
              <p className="text-xs font-semibold text-slate-400 mb-3">Mood Trend (14 days)</p>
              <ResponsiveContainer width="100%" height={80}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6D28D9" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6D28D9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="mood" stroke="#6D28D9" fill="url(#moodGrad)" strokeWidth={2} dot={false}/>
                  <Tooltip contentStyle={{ background:'#0a0f1e', border:'1px solid rgba(109,40,217,0.3)', borderRadius:8, fontSize:11 }}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs font-semibold text-slate-400 mb-3">Productivity Trend</p>
              <ResponsiveContainer width="100%" height={80}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#1A56DB" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#1A56DB" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="prod" stroke="#1A56DB" fill="url(#prodGrad)" strokeWidth={2} dot={false}/>
                  <Tooltip contentStyle={{ background:'#0a0f1e', border:'1px solid rgba(26,86,219,0.3)', borderRadius:8, fontSize:11 }}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Proactive Suggestions */}
        {proactive.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shrink-0">
                <span className="text-white font-black text-[8px]">J</span>
              </div>
              <p className="text-xs font-semibold text-slate-400">JARVIS bolta hai —</p>
            </div>
            {proactive.map((s, i) => (
              <div key={i} className={`glass-card p-4 border ${
                s.type==='warning'      ? 'border-red-500/20 bg-red-500/5' :
                s.type==='opportunity'  ? 'border-green-500/20 bg-green-500/5' :
                s.type==='encouragement'? 'border-yellow-500/20 bg-yellow-500/5' :
                'border-blue-500/20 bg-blue-500/5'
              }`}>
                <div className="flex items-start gap-3">
                  <span className="text-lg shrink-0">{s.type==='warning'?'⚠️':s.type==='opportunity'?'💡':s.type==='encouragement'?'🎉':'📊'}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{s.title}</p>
                    <p className="text-xs text-slate-400 mt-1">{s.message}</p>
                    {s.action && <p className="text-xs text-blue-400 mt-2 font-medium">→ {s.action}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Goals + Habits Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Active Goals */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Goals</p>
              <Link href="/goals" className="text-xs text-blue-400 hover:text-blue-300">See all →</Link>
            </div>
            {data?.goals?.filter(g => g.status === 'active').slice(0, 3).map(g => (
              <div key={g.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                <div className={`w-2 h-2 rounded-full shrink-0 ${g.priority==='high'||g.priority==='critical'?'bg-red-400':g.priority==='medium'?'bg-yellow-400':'bg-green-400'}`}/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate">{g.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1 bg-white/10 rounded-full">
                      <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" style={{ width:`${g.progress}%` }}/>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0">{g.progress}%</span>
                  </div>
                </div>
              </div>
            ))}
            {(!data?.goals?.length) && <p className="text-xs text-slate-600 py-4 text-center">Chat mein goal batao → JARVIS plan karega</p>}
          </div>

          {/* Habits */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Habits</p>
              <Link href="/analytics" className="text-xs text-blue-400 hover:text-blue-300">Details →</Link>
            </div>
            {data?.habits?.slice(0, 4).map(h => (
              <div key={h.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-sm text-slate-300 truncate flex-1">{h.name}</span>
                <div className="flex items-center gap-1.5 ml-2">
                  <Flame size={12} className="text-orange-400"/>
                  <span className="text-xs text-orange-400 font-bold">{h.streak}</span>
                </div>
              </div>
            ))}
            {(!data?.habits?.length) && <p className="text-xs text-slate-600 py-4 text-center">Koi habit nahi hai abhi</p>}
          </div>
        </div>

        {/* Quick Nav */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { href:'/chat',      icon:'💬', label:'Chat with JARVIS',    sub:'AI conversation' },
            { href:'/analytics', icon:'📊', label:'Full Analytics',      sub:'Charts + insights' },
            { href:'/memory',    icon:'🧠', label:'Memory Bank',         sub:'All stored data' },
            { href:'/knowledge', icon:'📚', label:'Knowledge Base',      sub:'PDF, images, notes' },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className="glass-card p-4 hover:border-blue-500/30 transition-all group">
              <div className="text-2xl mb-2">{item.icon}</div>
              <p className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">{item.label}</p>
              <p className="text-xs text-slate-500">{item.sub}</p>
            </Link>
          ))}
        </div>

        {/* Weekly Report */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-white">Weekly AI Report</p>
            <button onClick={getWeeklyReport} disabled={genReport}
              className="text-xs px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors disabled:opacity-50">
              {genReport ? 'Generating...' : 'Generate'}
            </button>
          </div>
          {report ? (
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{report}</p>
          ) : (
            <p className="text-xs text-slate-600">JARVIS tumhara weekly AI analysis generate karega</p>
          )}
        </div>
      </div>

      {/* Day Log Modal */}
      {logOpen && (
        <div className="fixed inset-0 z-50 flex items-end p-4">
          <div className="fixed inset-0 bg-black/70" onClick={() => setLogOpen(false)}/>
          <div className="relative w-full max-w-lg mx-auto glass border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white">Aaj ka Log</h3>
              <button onClick={() => setLogOpen(false)} className="text-slate-400">✕</button>
            </div>
            {[
              { key:'mood', label:'😊 Mood', emoji:'😊' },
              { key:'energy', label:'⚡ Energy', emoji:'⚡' },
              { key:'productivity', label:'🎯 Productivity', emoji:'🎯' },
            ].map(({ key, label }) => (
              <div key={key}>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-slate-400">{label}</label>
                  <span className="text-xs font-bold text-blue-400">{logData[key]}/10</span>
                </div>
                <input type="range" min="1" max="10" value={logData[key]}
                  onChange={e => setLogData(p => ({ ...p, [key]: parseInt(e.target.value) }))}
                  className="w-full accent-blue-500"/>
              </div>
            ))}
            <div>
              <label className="text-xs text-slate-400 block mb-1">⏱️ Focus Hours</label>
              <input type="number" min="0" max="24" step="0.5" value={logData.focusHours}
                onChange={e => setLogData(p => ({ ...p, focusHours: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"/>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">📝 Notes</label>
              <textarea value={logData.notes} onChange={e => setLogData(p => ({ ...p, notes: e.target.value }))}
                placeholder="Aaj kya hua? Kya achieve kiya?" rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm resize-none placeholder-slate-600"/>
            </div>
            <button onClick={saveLog} disabled={saving}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold text-sm disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Log'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
