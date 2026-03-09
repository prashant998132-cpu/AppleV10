'use client';
import { useState, useEffect } from 'react';
import { Brain, Plus, Search, Trash2, Tag, X, RefreshCw } from 'lucide-react';

const CATS = ['all','profile','goal','emotion','preference','study','performance','relationship','daily_log','general'];
const CAT_COLOR = {
  profile:'text-blue-400 bg-blue-500/10',
  goal:'text-green-400 bg-green-500/10',
  emotion:'text-purple-400 bg-purple-500/10',
  preference:'text-cyan-400 bg-cyan-500/10',
  study:'text-yellow-400 bg-yellow-500/10',
  performance:'text-orange-400 bg-orange-500/10',
  relationship:'text-pink-400 bg-pink-500/10',
  daily_log:'text-slate-400 bg-slate-500/10',
  general:'text-slate-400 bg-slate-500/10',
};

export default function MemoryPage() {
  const [memories, setMemories]   = useState([]);
  const [loading, setLoad]        = useState(true);
  const [cat, setCat]             = useState('all');
  const [search, setSearch]       = useState('');
  const [addOpen, setAddOpen]     = useState(false);
  const [newMem, setNewMem]       = useState({ category:'general', key:'', value:'', importance:5, tags:'' });
  const [saving, setSaving]       = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { load(); }, [cat]);

  async function load() {
    setLoad(true);
    try {
      const params = new URLSearchParams();
      if (cat !== 'all') params.set('category', cat);
      if (search) params.set('search', search);
      const r = await fetch(`/api/memory?${params}`);
      const d = await r.json();
      setMemories(d.memories || []);
    } finally { setLoad(false); }
  }

  async function saveMemory() {
    if (!newMem.key || !newMem.value) return;
    setSaving(true);
    try {
      await fetch('/api/memory', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ ...newMem, tags: newMem.tags.split(',').map(t=>t.trim()).filter(Boolean) }) });
      setAddOpen(false);
      setNewMem({ category:'general', key:'', value:'', importance:5, tags:'' });
      load();
    } finally { setSaving(false); }
  }

  async function deleteMemory(id) {
    await fetch('/api/memory', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id }) });
    setMemories(p => p.filter(m => m.id !== id));
    setDeleteConfirm(null);
  }

  async function exportData() {
    setExporting(true);
    try {
      const r = await fetch('/api/memory?export=true');
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'jarvis-export.json'; a.click();
    } finally { setExporting(false); }
  }

  const filtered = memories.filter(m =>
    !search || m.key.toLowerCase().includes(search.toLowerCase()) || m.value.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = {};
  filtered.forEach(m => { if (!grouped[m.category]) grouped[m.category] = []; grouped[m.category].push(m); });

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 pb-24 lg:pb-6 space-y-4 max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-white">🧠 JARVIS ki Yaadein</h1>
            <p className="text-xs text-slate-500">JARVIS ko {memories.length} baatein yaad hain tumhari</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportData} disabled={exporting}
              className="px-3 py-2 glass-card text-xs text-slate-400 hover:text-white rounded-xl transition-colors">
              {exporting ? '...' : 'Export'}
            </button>
            <button onClick={() => setAddOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-medium">
              <Plus size={14}/> Add
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-xl px-3 py-2.5">
          <Search size={15} className="text-slate-500"/>
          <input value={search} onChange={e => { setSearch(e.target.value); }}
            onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="Search memories..." className="bg-transparent text-sm text-white outline-none flex-1 placeholder-slate-600"/>
          {search && <button onClick={() => { setSearch(''); load(); }}><X size={14} className="text-slate-500"/></button>}
        </div>

        {/* Category tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {CATS.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all ${cat===c ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-500 bg-white/4 hover:text-slate-300'}`}>
              {c.replace('_',' ')}
            </button>
          ))}
        </div>

        {/* Memory Groups */}
        {loading ? (
          <div className="py-12 flex justify-center"><div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"/></div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <Brain size={36} className="text-slate-700 mx-auto mb-3"/>
            <p className="text-slate-400 text-sm">No memories found</p>
            <p className="text-slate-600 text-xs mt-1">Chat with JARVIS — it automatically saves important info</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(cat === 'all' ? grouped : { [cat]: filtered }).map(([category, items]) => (
              <div key={category}>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">{category.replace('_',' ')}</p>
                <div className="space-y-2">
                  {items.map(m => (
                    <div key={m.id} className="glass-card p-3 flex items-start gap-3 group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${CAT_COLOR[m.category] || CAT_COLOR.general}`}>{m.category}</span>
                          <p className="text-sm font-medium text-white truncate">{m.key}</p>
                          {m.importance >= 8 && <span className="text-[10px] text-yellow-400">★ High</span>}
                        </div>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{m.value}</p>
                        {m.tags?.length > 0 && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {m.tags.map(t => <span key={t} className="text-[10px] bg-white/5 text-slate-500 px-1.5 py-0.5 rounded">#{t}</span>)}
                          </div>
                        )}
                        <p className="text-[10px] text-slate-600 mt-1">{new Date(m.updated_at).toLocaleDateString('en-IN')}</p>
                      </div>
                      <button onClick={() => setDeleteConfirm(m.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-red-400 p-1 shrink-0">
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Memory Modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-end p-4">
          <div className="fixed inset-0 bg-black/70" onClick={() => setAddOpen(false)}/>
          <div className="relative w-full max-w-lg mx-auto glass border border-white/10 rounded-2xl p-5 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white">Add Memory</h3>
              <button onClick={() => setAddOpen(false)}><X size={18} className="text-slate-400"/></button>
            </div>
            <select value={newMem.category} onChange={e => setNewMem(p => ({...p, category:e.target.value}))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm">
              {CATS.filter(c => c !== 'all').map(c => <option key={c} value={c} className="bg-[#0a0f1e]">{c}</option>)}
            </select>
            <input value={newMem.key} onChange={e => setNewMem(p => ({...p, key:e.target.value}))}
              placeholder="Key (e.g. favorite_subject)" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600"/>
            <textarea value={newMem.value} onChange={e => setNewMem(p => ({...p, value:e.target.value}))}
              placeholder="Value..." rows={2} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm resize-none placeholder-slate-600"/>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs text-slate-500 block mb-1">Importance: {newMem.importance}/10</label>
                <input type="range" min="1" max="10" value={newMem.importance}
                  onChange={e => setNewMem(p => ({...p, importance: parseInt(e.target.value)}))}
                  className="w-full accent-blue-500"/>
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-500 block mb-1">Tags (comma sep)</label>
                <input value={newMem.tags} onChange={e => setNewMem(p => ({...p, tags:e.target.value}))}
                  placeholder="tag1, tag2" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs placeholder-slate-600"/>
              </div>
            </div>
            <button onClick={saveMemory} disabled={!newMem.key || !newMem.value || saving}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold text-sm disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Memory'}
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70" onClick={() => setDeleteConfirm(null)}/>
          <div className="relative glass border border-white/10 rounded-2xl p-5 max-w-xs w-full">
            <p className="text-white font-semibold mb-3">Delete this memory?</p>
            <p className="text-slate-400 text-sm mb-4">Yeh permanently delete ho jaayega.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 bg-white/5 rounded-xl text-slate-400 text-sm">Cancel</button>
              <button onClick={() => deleteMemory(deleteConfirm)} className="flex-1 py-2.5 bg-red-600 rounded-xl text-white text-sm font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
