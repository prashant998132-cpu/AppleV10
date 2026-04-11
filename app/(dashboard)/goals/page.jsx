'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { Target, Plus, Trash2, CheckCircle, Circle, ChevronDown, ChevronUp, Zap, RefreshCw, Flag, Brain } from 'lucide-react';

const CATEGORIES = ['career','health','learning','finance','personal','project'];
const CAT_EMOJI = { career:'💼', health:'💪', learning:'📖', finance:'💰', personal:'🌱', project:'🚀' };
const CAT_BG = {
  career:'bg-blue-500/10 text-blue-400 border-blue-500/20',
  health:'bg-green-500/10 text-green-400 border-green-500/20',
  learning:'bg-purple-500/10 text-purple-400 border-purple-500/20',
  finance:'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  personal:'bg-pink-500/10 text-pink-400 border-pink-500/20',
  project:'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

function ProgressBar({ value = 0 }) {
  const pct = Math.min(100, Math.max(0, value));
  const g = pct>=80?'from-emerald-500 to-green-400':pct>=50?'from-blue-500 to-cyan-400':pct>=20?'from-yellow-500 to-amber-400':'from-slate-600 to-slate-500';
  return (
    <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
      <div className={`h-full rounded-full bg-gradient-to-r ${g} transition-all duration-700`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function GoalCard({ goal, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [aiTip, setAiTip] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const milestones = (() => { try { return JSON.parse(goal.milestones || '[]'); } catch { return []; } })();

  async function setProgress(val) {
    setUpdating(true);
    await fetch('/api/goals', { method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id:goal.id, progress:val, status:val>=100?'completed':'active' }) });
    onUpdate(); setUpdating(false);
  }

  async function togglePause() {
    await fetch('/api/goals', { method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id:goal.id, status:goal.status==='active'?'paused':'active' }) });
    onUpdate();
  }

  async function del() {
    if (!confirm('Goal delete karo?')) return;
    await fetch('/api/goals', { method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id:goal.id, status:'deleted' }) });
    onUpdate();
  }

  async function getAiTip() {
    if (aiTip) { setAiTip(''); return; }
    setAiLoading(true);
    try {
      const r = await fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ message:`Goal: "${goal.title}". Progress: ${goal.progress||0}%. Category: ${goal.category}. Give ONE specific actionable tip for today, 2 lines max, Hinglish.`, history:[], mode:'flash' }) });
      const d = await r.json();
      setAiTip(d.reply || '');
    } catch { setAiTip('Aaj ek chota step lo — consistency se hi result milta hai.'); }
    setAiLoading(false);
  }

  const catStyle = CAT_BG[goal.category] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  const done = goal.status === 'completed';
  const paused = goal.status === 'paused';
  const daysLeft = goal.deadline ? Math.ceil((new Date(goal.deadline) - new Date()) / 86400000) : null;
  const isUrgent = daysLeft !== null && daysLeft <= 3 && !done;
  const isNear   = daysLeft !== null && daysLeft <= 7 && !done;

  return (
    <div className={`border rounded-2xl p-4 transition-all ${done?'bg-emerald-500/5 border-emerald-500/20':paused?'bg-white/[0.02] border-white/[0.04]':'bg-white/[0.03] border-white/[0.07]'}`}>
      <div className="flex items-start gap-3">
        <button onClick={togglePause} className="mt-0.5 shrink-0">
          {done ? <CheckCircle size={18} className="text-emerald-400"/> : <Circle size={18} className={`${paused?'text-slate-600':'text-slate-500 hover:text-blue-400'} transition-colors`}/>}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className={`text-sm font-semibold ${done?'text-slate-500 line-through':'text-white'}`}>{goal.title}</p>
            <span className={`text-[10px] border px-1.5 py-0.5 rounded-full ${catStyle}`}>{CAT_EMOJI[goal.category]||'📌'} {goal.category}</span>
            {done && <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">✓ Done</span>}
            {paused && <span className="text-[10px] bg-slate-500/10 text-slate-500 border border-slate-500/20 px-1.5 py-0.5 rounded-full">Paused</span>}
          </div>
          {goal.description && <p className="text-xs text-slate-500 mb-2 line-clamp-2">{goal.description}</p>}
          {!done && (
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-slate-500 font-mono">{goal.progress||0}%</span>
                {daysLeft !== null && <span className={`text-[11px] font-medium ${isUrgent?'text-red-400':isNear?'text-orange-400':'text-slate-600'}`}>{isUrgent?'🔥':isNear?'⏰':'📅'} {daysLeft}d left</span>}
              </div>
              <ProgressBar value={goal.progress||0}/>
            </div>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {!done && !paused && (
            <button onClick={getAiTip} className={`p-1.5 rounded-lg transition-all ${aiTip?'text-yellow-400':'text-slate-600 hover:text-yellow-400'}`}>
              {aiLoading ? <RefreshCw size={13} className="animate-spin"/> : <Brain size={13}/>}
            </button>
          )}
          <button onClick={() => setExpanded(!expanded)} className="p-1.5 text-slate-600 hover:text-slate-300 transition-colors">
            {expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
          </button>
          <button onClick={del} className="p-1.5 text-slate-700 hover:text-red-400 transition-colors"><Trash2 size={13}/></button>
        </div>
      </div>

      {aiTip && (
        <div className="mt-2.5 ml-7 px-3 py-2 bg-yellow-500/8 border border-yellow-500/15 rounded-xl">
          <p className="text-[12px] text-yellow-300 leading-relaxed">💡 {aiTip}</p>
        </div>
      )}

      {expanded && (
        <div className="mt-3 ml-7 space-y-3">
          {!done && (
            <div>
              <p className="text-[11px] text-slate-500 mb-2">Progress update karo</p>
              <div className="flex items-center gap-2 mb-2">
                <input type="range" min="0" max="100" step="5" value={goal.progress||0}
                  onChange={e => setProgress(parseInt(e.target.value))}
                  className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer accent-blue-500"
                  style={{background:`linear-gradient(to right, #3b82f6 ${goal.progress||0}%, rgba(255,255,255,0.08) ${goal.progress||0}%)`}}/>
                <span className="text-xs font-bold text-blue-400 w-8 text-right shrink-0">{goal.progress||0}%</span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {[0,25,50,75,100].map(v => (
                  <button key={v} onClick={() => setProgress(v)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all active:scale-95 ${(goal.progress||0)===v?'bg-blue-500/20 border-blue-500/40 text-blue-400':'border-white/10 text-slate-500 hover:text-white'}`}>{v}%</button>
                ))}
              </div>
            </div>
          )}
          {milestones.length > 0 && (
            <div>
              <p className="text-[11px] text-slate-500 mb-1.5">Milestones</p>
              {milestones.map((m, i) => (
                <div key={i} className="flex gap-2 items-start mb-1.5">
                  <span className="text-[10px] bg-white/5 text-slate-500 px-1.5 py-0.5 rounded shrink-0 font-mono">Wk{m.week||i+1}</span>
                  <p className="text-[12px] text-slate-400">{m.title || String(m)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function GoalsPage() {
  const [goals, setGoals]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('active');
  const [adding, setAdding]   = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [manual, setManual]   = useState({ title:'', category:'personal', description:'', deadline:'' });
  const [weekInsight, setWeekInsight] = useState('');
  const [insightLoading, setInsightLoad] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/goals');
      const d = await r.json();
      try { localStorage.setItem('jarvis_goals', JSON.stringify(d.goals||[])); } catch {}
      setGoals(d.goals || []);
    } finally { setLoading(false); }
  }

  async function aiCreate() {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    try {
      await fetch('/api/goals', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'decompose', goal: aiInput }) });
      setAiInput(''); setAdding(false); load();
    } catch { alert('Error — retry karo'); }
    finally { setAiLoading(false); }
  }

  async function manualCreate() {
    if (!manual.title.trim()) return;
    setAiLoading(true);
    try {
      await fetch('/api/goals', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ ...manual, progress:0, status:'active' }) });
      setManual({ title:'', category:'personal', description:'', deadline:'' });
      setAdding(false); load();
    } finally { setAiLoading(false); }
  }

  async function getWeekInsight() {
    setInsightLoad(true);
    const active = goals.filter(g=>g.status==='active');
    const summary = active.map(g=>`"${g.title}" (${g.progress||0}%)`).join(', ');
    try {
      const r = await fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ message:`My active goals: ${summary||'none'}. Give sharp 2-line weekly check-in — what is going well, where to push harder. Direct, no fluff. Hinglish.`, history:[], mode:'flash' }) });
      const d = await r.json();
      setWeekInsight(d.reply || '');
    } catch {}
    setInsightLoad(false);
  }

  const filtered = goals.filter(g => {
    if (tab==='active') return g.status==='active';
    if (tab==='done')   return g.status==='completed';
    if (tab==='paused') return g.status==='paused';
    return g.status!=='deleted';
  });

  const activeCount    = goals.filter(g=>g.status==='active').length;
  const completedCount = goals.filter(g=>g.status==='completed').length;
  const avgProgress    = activeCount ? Math.round(goals.filter(g=>g.status==='active').reduce((s,g)=>s+(g.progress||0),0)/activeCount) : 0;

  return (
    <div className="min-h-screen" style={{background:'transparent'}}>
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">

        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2"><Target size={20} className="text-emerald-400"/> Goals</h1>
            <p className="text-xs text-slate-500 mt-0.5">{activeCount} active · {completedCount} done · <span className="text-blue-400 font-medium">{avgProgress}% avg</span></p>
          </div>
          <button onClick={() => setAdding(!adding)}
            className={`flex items-center gap-1.5 text-white text-sm px-3.5 py-2 rounded-xl transition-all active:scale-95 ${adding?'bg-white/10 border border-white/20':'bg-blue-600 hover:bg-blue-500'}`}>
            {adding ? '✕' : <><Plus size={15}/> Add</>}
          </button>
        </div>

        {activeCount > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[{label:'Active',val:activeCount,icon:'🎯',color:'text-blue-400'},{label:'Done',val:completedCount,icon:'✅',color:'text-emerald-400'},{label:'Avg',val:avgProgress+'%',icon:'📈',color:'text-purple-400'}].map(s=>(
              <div key={s.label} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3 text-center">
                <span className="text-xl">{s.icon}</span>
                <p className={`text-lg font-black ${s.color} mt-1`}>{s.val}</p>
                <p className="text-[10px] text-slate-600">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {activeCount > 0 && (
          <div className="bg-white/[0.03] border border-purple-500/15 rounded-2xl p-3.5 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Brain size={14} className="text-purple-400"/><span className="text-[11px] text-purple-400 font-semibold uppercase tracking-wide">JARVIS Analysis</span></div>
              <button onClick={getWeekInsight} disabled={insightLoading} className="text-[11px] text-purple-400 border border-purple-500/20 bg-purple-500/8 px-2.5 py-1 rounded-lg transition-all active:scale-95">
                {insightLoading ? <RefreshCw size={11} className="animate-spin inline"/> : '✨ Analyze'}
              </button>
            </div>
            {weekInsight ? <p className="text-slate-300 text-[12px] leading-relaxed mt-2.5">{weekInsight}</p> : <p className="text-slate-600 text-[11px] mt-1.5">Tap to get personalized progress analysis</p>}
          </div>
        )}

        {adding && (
          <div className="bg-white/[0.04] border border-white/[0.09] rounded-2xl p-4 mb-4 space-y-3">
            <p className="text-xs text-slate-400 flex items-center gap-1.5"><Zap size={12} className="text-yellow-400"/> AI se banao</p>
            <div className="flex gap-2">
              <input value={aiInput} onChange={e=>setAiInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&aiCreate()}
                placeholder="e.g. 6 months mein fit hona hai..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/40"/>
              <button onClick={aiCreate} disabled={aiLoading||!aiInput.trim()} className="bg-blue-600 disabled:opacity-40 text-white px-3 py-2 rounded-xl transition-colors">
                {aiLoading ? <RefreshCw size={14} className="animate-spin"/> : <Zap size={14}/>}
              </button>
            </div>
            <div className="flex items-center gap-2"><div className="flex-1 h-px bg-white/5"/><span className="text-[11px] text-slate-600">ya manually</span><div className="flex-1 h-px bg-white/5"/></div>
            <input value={manual.title} onChange={e=>setManual(p=>({...p,title:e.target.value}))} placeholder="Goal title..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none"/>
            <div className="flex gap-2">
              <select value={manual.category} onChange={e=>setManual(p=>({...p,category:e.target.value}))} className="flex-1 bg-[#050810] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
                {CATEGORIES.map(c=><option key={c} value={c}>{CAT_EMOJI[c]} {c}</option>)}
              </select>
              <input type="date" value={manual.deadline} onChange={e=>setManual(p=>({...p,deadline:e.target.value}))} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-400 focus:outline-none"/>
            </div>
            <button onClick={manualCreate} disabled={aiLoading||!manual.title.trim()} className="w-full bg-blue-600/20 disabled:opacity-40 border border-blue-500/30 text-blue-400 text-sm py-2.5 rounded-xl transition-colors">
              {aiLoading ? 'Saving...' : '+ Save Goal'}
            </button>
          </div>
        )}

        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 mb-4">
          {[['active',`Active ${activeCount}`],['done','Done'],['paused','Paused'],['all','All']].map(([val,label])=>(
            <button key={val} onClick={()=>setTab(val)} className={`flex-1 text-xs py-1.5 rounded-lg transition-all ${tab===val?'bg-blue-600 text-white':'text-slate-500 hover:text-white'}`}>{label}</button>
          ))}
        </div>

        {!loading && filtered.length > 0 && tab==='active' && (() => {
          const top = filtered.find(g=>(g.progress||0)>0&&(g.progress||0)<100)||filtered[0];
          return top ? (
            <div className="border border-blue-500/20 rounded-2xl p-4 mb-3" style={{background:'linear-gradient(135deg,rgba(26,86,219,0.08),rgba(6,182,212,0.04))'}}>
              <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider mb-1.5">⚡ Today's Focus</p>
              <p className="text-white font-bold text-sm truncate">{top.title}</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{width:`${top.progress||0}%`}}/>
                </div>
                <span className="text-xs font-bold text-blue-400 font-mono">{top.progress||0}%</span>
              </div>
            </div>
          ) : null;
        })()}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-600"><RefreshCw size={18} className="animate-spin mr-2"/> Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3"><Flag size={24} className="text-emerald-400"/></div>
            <p className="text-white font-semibold text-sm mb-1">Koi goal nahi</p>
            <p className="text-slate-500 text-xs">AI se describe karo ya manually add karo</p>
          </div>
        ) : (
          <div className="space-y-2.5">{filtered.map(g => <GoalCard key={g.id} goal={g} onUpdate={load}/>)}</div>
        )}
      </div>
    </div>
  );
}
