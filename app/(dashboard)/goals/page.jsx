'use client';
import { useState, useEffect } from 'react';
import { Target, Plus, Trash2, CheckCircle, Circle, ChevronDown, ChevronUp, Zap, RefreshCw, Flag } from 'lucide-react';

const CATEGORIES = ['career','health','learning','finance','personal','project'];
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
  const color = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500' : pct >= 20 ? 'bg-yellow-500' : 'bg-slate-600';
  return (
    <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function GoalCard({ goal, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);
  const milestones = (() => { try { return JSON.parse(goal.milestones || '[]'); } catch { return []; } })();

  async function setProgress(val) {
    setUpdating(true);
    await fetch('/api/goals', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: goal.id, progress: val, status: val >= 100 ? 'completed' : 'active' })
    });
    onUpdate(); setUpdating(false);
  }

  async function togglePause() {
    const next = goal.status === 'active' ? 'paused' : 'active';
    await fetch('/api/goals', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: goal.id, status: next }) });
    onUpdate();
  }

  async function del() {
    if (!confirm('Goal delete karo?')) return;
    await fetch('/api/goals', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: goal.id, status: 'deleted' }) });
    onUpdate();
  }

  const catStyle = CAT_BG[goal.category] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  const done = goal.status === 'completed';
  const paused = goal.status === 'paused';

  return (
    <div className={`bg-white/[0.03] border rounded-2xl p-4 transition-all ${done ? 'border-green-500/30' : paused ? 'border-white/[0.04]' : 'border-white/[0.07] hover:border-white/[0.12]'}`}>
      <div className="flex items-start gap-3">
        <button onClick={togglePause} className="mt-0.5 shrink-0">
          {done
            ? <CheckCircle size={18} className="text-green-400" />
            : <Circle size={18} className={`${paused ? 'text-slate-600' : 'text-slate-500 hover:text-blue-400'} transition-colors`} />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className={`text-sm font-semibold ${done ? 'text-slate-500 line-through' : 'text-white'}`}>{goal.title}</p>
            <span className={`text-[10px] border px-1.5 py-0.5 rounded-full ${catStyle}`}>{goal.category || 'general'}</span>
            {done   && <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded-full">Done</span>}
            {paused && <span className="text-[10px] bg-slate-500/10 text-slate-500 border border-slate-500/20 px-1.5 py-0.5 rounded-full">Paused</span>}
          </div>
          {goal.description && <p className="text-xs text-slate-500 mb-2 line-clamp-2">{goal.description}</p>}
          {!done && (
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-[11px] text-slate-500">{goal.progress || 0}%</span>
                {goal.deadline && <span className="text-[11px] text-slate-600">📅 {new Date(goal.deadline).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</span>}
              </div>
              <ProgressBar value={goal.progress || 0} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setExpanded(!expanded)} className="p-1 text-slate-600 hover:text-slate-300 transition-colors">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button onClick={del} className="p-1 text-slate-700 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pl-7 space-y-3">
          {!done && (
            <div>
              <p className="text-[11px] text-slate-500 mb-1.5">Progress</p>
              <div className="flex gap-1.5 flex-wrap">
                {[0,25,50,75,100].map(v => (
                  <button key={v} onClick={() => setProgress(v)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${(goal.progress||0)===v ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' : 'border-white/10 text-slate-500 hover:text-white hover:border-white/20'}`}>
                    {v}%
                  </button>
                ))}
                {updating && <span className="text-[11px] text-slate-600 self-center">saving...</span>}
              </div>
            </div>
          )}
          {milestones.length > 0 && (
            <div>
              <p className="text-[11px] text-slate-500 mb-1.5">Milestones</p>
              {milestones.map((m, i) => (
                <div key={i} className="flex gap-2 items-start mb-1">
                  <span className="text-[10px] bg-white/5 text-slate-500 px-1.5 py-0.5 rounded shrink-0">Wk {m.week || i+1}</span>
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

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/goals');
      const d = await r.json();
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
    } catch { alert('Error — dobara try karo'); }
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

  const filtered = goals.filter(g => {
    if (tab === 'active') return g.status === 'active';
    if (tab === 'done')   return g.status === 'completed';
    if (tab === 'paused') return g.status === 'paused';
    return g.status !== 'deleted';
  });

  const activeCount    = goals.filter(g => g.status === 'active').length;
  const completedCount = goals.filter(g => g.status === 'completed').length;
  const avgProgress    = activeCount
    ? Math.round(goals.filter(g=>g.status==='active').reduce((s,g) => s+(g.progress||0),0) / activeCount)
    : 0;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Target size={20} className="text-blue-400"/> Goals
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeCount} active · {completedCount} done · {avgProgress}% avg
            </p>
          </div>
          <button onClick={() => setAdding(!adding)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm px-3 py-1.5 rounded-xl transition-colors">
            <Plus size={15}/> Add
          </button>
        </div>

        {/* Add Panel */}
        {adding && (
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 mb-4 space-y-3">
            <div>
              <p className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
                <Zap size={12} className="text-yellow-400"/> AI se banao — describe karo
              </p>
              <div className="flex gap-2">
                <input value={aiInput} onChange={e=>setAiInput(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&aiCreate()}
                  placeholder="e.g. 6 months mein fit hona hai..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/40"/>
                <button onClick={aiCreate} disabled={aiLoading||!aiInput.trim()}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-3 py-2 rounded-xl transition-colors">
                  {aiLoading ? <RefreshCw size={14} className="animate-spin"/> : <Zap size={14}/>}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-white/5"/>
              <span className="text-[11px] text-slate-600">ya manually</span>
              <div className="flex-1 h-px bg-white/5"/>
            </div>

            <div className="space-y-2">
              <input value={manual.title} onChange={e=>setManual(p=>({...p,title:e.target.value}))}
                placeholder="Goal title..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/40"/>
              <div className="flex gap-2">
                <select value={manual.category} onChange={e=>setManual(p=>({...p,category:e.target.value}))}
                  className="flex-1 bg-[#0a0a0f] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
                  {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
                <input type="date" value={manual.deadline} onChange={e=>setManual(p=>({...p,deadline:e.target.value}))}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-400 focus:outline-none"/>
              </div>
              <textarea value={manual.description} onChange={e=>setManual(p=>({...p,description:e.target.value}))}
                placeholder="Details (optional)..." rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none resize-none"/>
              <button onClick={manualCreate} disabled={aiLoading||!manual.title.trim()}
                className="w-full bg-white/5 hover:bg-white/10 disabled:opacity-40 border border-white/10 text-white text-sm py-2 rounded-xl transition-colors">
                {aiLoading ? 'Saving...' : 'Save Goal'}
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 mb-4">
          {[['active','Active'],['done','Done'],['paused','Paused'],['all','All']].map(([val,label])=>(
            <button key={val} onClick={()=>setTab(val)}
              className={`flex-1 text-xs py-1.5 rounded-lg transition-colors ${tab===val?'bg-blue-600 text-white':'text-slate-500 hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-600">
            <RefreshCw size={18} className="animate-spin mr-2"/> Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Flag size={32} className="text-slate-700 mx-auto mb-3"/>
            <p className="text-slate-500 text-sm">Koi goal nahi</p>
            <p className="text-slate-600 text-xs mt-1">Upar Add karo, ya chat mein bol do</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(g => <GoalCard key={g.id} goal={g} onUpdate={load}/>)}
          </div>
        )}
      </div>
    </div>
  );
}
