'use client';
import { uploadDirect } from '@/lib/ai/media-client';
import { useState, useEffect, useRef } from 'react';
import { BookOpen, Plus, Search, Upload, FileText, Image as ImageIcon, Mic, Link as LinkIcon, X, ChevronDown, ChevronUp } from 'lucide-react';

const SOURCE_ICONS = { pdf:'📄', image:'🖼️', voice:'🎙️', url:'🔗', manual:'✏️', screenshot:'📸' };

export default function KnowledgePage() {
  const [items, setItems]       = useState([]);
  const [loading, setLoad]      = useState(true);
  const [addOpen, setAddOpen]   = useState(false);
  const [addType, setAddType]   = useState('manual');
  const [search, setSearch]     = useState('');
  const [expanded, setExpanded] = useState({});
  const [uploading, setUploading] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [listening, setListening]  = useState(false);
  const [analysis, setAnalysis]    = useState(null);
  const fileRef = useRef(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoad(true);
    try {
      const r = await fetch('/api/memory?category=knowledge_list');
      // Use knowledge endpoint
      const resp = await fetch('/api/upload', { method: 'GET' }).catch(() => null);
      // Fallback - search memories for knowledge items
      const mr = await fetch('/api/memory');
      const md = await mr.json();
      setItems((md.memories || []).filter(m => m.category === 'general' && m.tags?.includes('knowledge')));
    } finally { setLoad(false); }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setAnalysis(null);
    try {
      const fd = new FormData();
      // ✅ v8: uploadDirect — browser uploads to Supabase directly (Vercel never sees file bytes!)
      const r = await (async () => {
        try {
          return { ok: true, json: async () => await uploadDirect(file, 'Summarize and explain this content') };
        } catch(e) {
          // fallback to old route if Supabase storage not configured
          const type = file.type.includes('pdf') ? 'pdf' : file.type.includes('image') ? 'image' : 'text';
          const fd2 = new FormData();
          fd2.append('file', file); fd2.append('type', type); fd2.append('question', 'Summarize and explain this content');
          return fetch('/api/upload', { method:'POST', body: fd2 });
        }
      })();
      const d = await r.json();
      setAnalysis(d.analysis);
      load();
    } finally { setUploading(false); }
  }

  async function addTextNote() {
    if (!textInput.trim()) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('type', addType === 'url' ? 'url' : 'text');
      fd.append('text', textInput);
      const r = await fetch('/api/upload', { method:'POST', body: fd });
      const d = await r.json();
      setAnalysis(d.analysis);
      setTextInput(''); setTitleInput('');
      load();
    } finally { setUploading(false); }
  }

  function startVoiceNote() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) { alert('Voice not supported'); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR(); r.lang = 'hi-IN'; r.interimResults = false;
    r.onstart = () => setListening(true);
    r.onresult = e => { setTextInput(e.results[0][0].transcript); setListening(false); };
    r.onerror = () => setListening(false); r.onend = () => setListening(false);
    r.start();
  }

  const ADD_TYPES = [
    { id:'manual',  icon:<FileText size={15}/>,  label:'Text Note' },
    { id:'url',     icon:<LinkIcon size={15}/>,  label:'URL/Article' },
    { id:'image',   icon:<ImageIcon size={15}/>, label:'Image' },
    { id:'pdf',     icon:<FileText size={15}/>,  label:'PDF' },
    { id:'voice',   icon:<Mic size={15}/>,       label:'Voice Note' },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 pb-24 lg:pb-6 space-y-4 max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-white">📚 Tera Knowledge Base</h1>
            <p className="text-xs text-slate-500">PDF · Images · Notes · Voice · URLs</p>
          </div>
          <button onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            <Plus size={16}/> Add
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-xl px-3 py-2.5">
          <Search size={15} className="text-slate-500"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search knowledge..." className="bg-transparent text-sm text-white outline-none flex-1 placeholder-slate-600"/>
        </div>

        {/* Items */}
        {loading ? (
          <div className="py-12 flex justify-center"><div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"/></div>
        ) : items.length === 0 ? (
          <div className="glass-card p-10 text-center space-y-3">
            <BookOpen size={36} className="text-slate-700 mx-auto"/>
            <p className="text-slate-400 text-sm">No knowledge saved yet</p>
            <p className="text-slate-600 text-xs">Upload PDFs, paste URLs, record voice notes — JARVIS will analyze and organize everything</p>
            <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto mt-4">
              {ADD_TYPES.map(t => (
                <button key={t.id} onClick={() => { setAddType(t.id); setAddOpen(true); }}
                  className="glass-card p-3 text-xs text-slate-400 hover:text-white text-left flex items-center gap-2 hover:border-blue-500/30 transition-all">
                  {t.icon}{t.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {items.filter(i => !search || i.key.toLowerCase().includes(search.toLowerCase()) || i.value.toLowerCase().includes(search.toLowerCase())).map(item => (
              <div key={item.id} className="glass-card overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xl shrink-0 mt-0.5">{SOURCE_ICONS[item.source_type] || '📄'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-white truncate">{item.key}</p>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{item.value?.slice(0,150)}</p>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {item.tags?.map(t => <span key={t} className="text-[10px] bg-white/5 text-slate-500 px-1.5 py-0.5 rounded">#{t}</span>)}
                        <span className="text-[10px] text-slate-600">{new Date(item.created_at || item.updated_at).toLocaleDateString('en-IN')}</span>
                      </div>
                    </div>
                    <button onClick={() => setExpanded(p => ({...p, [item.id]: !p[item.id]}))} className="text-slate-500 hover:text-white shrink-0">
                      {expanded[item.id] ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                    </button>
                  </div>
                </div>
                {expanded[item.id] && (
                  <div className="border-t border-white/5 p-4 bg-white/2">
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{item.value}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-end p-4">
          <div className="fixed inset-0 bg-black/70" onClick={() => { setAddOpen(false); setAnalysis(null); setTextInput(''); }}/>
          <div className="relative w-full max-w-lg mx-auto glass border border-white/10 rounded-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white">Add to Knowledge Base</h3>
              <button onClick={() => { setAddOpen(false); setAnalysis(null); setTextInput(''); }}><X size={18} className="text-slate-400"/></button>
            </div>

            {/* Type selector */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {ADD_TYPES.map(t => (
                <button key={t.id} onClick={() => setAddType(t.id)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all ${addType===t.id ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-500 bg-white/5'}`}>
                  {t.icon}{t.label}
                </button>
              ))}
            </div>

            {/* Upload area */}
            {(addType === 'image' || addType === 'pdf') && (
              <div className="border-2 border-dashed border-white/15 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500/40 transition-colors"
                onClick={() => fileRef.current?.click()}>
                <Upload size={28} className="text-slate-600 mx-auto mb-2"/>
                <p className="text-sm text-slate-400">Click to upload {addType}</p>
                <p className="text-xs text-slate-600 mt-1">JARVIS will analyze and summarize</p>
                <input ref={fileRef} type="file" className="hidden"
                  accept={addType === 'pdf' ? '.pdf' : 'image/*'}
                  onChange={handleUpload}/>
              </div>
            )}

            {/* Text/URL input */}
            {(addType === 'manual' || addType === 'url') && (
              <textarea value={textInput} onChange={e => setTextInput(e.target.value)}
                placeholder={addType === 'url' ? 'Paste URL here...' : 'Paste text, article, notes...'}
                rows={5} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm resize-none placeholder-slate-600"/>
            )}

            {/* Voice input */}
            {addType === 'voice' && (
              <div className="text-center py-6">
                <button onClick={startVoiceNote}
                  className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${listening ? 'bg-red-500 ping-slow' : 'bg-blue-600'} shadow-[0_0_30px_rgba(26,86,219,0.4)]`}>
                  <Mic size={24} className="text-white"/>
                </button>
                <p className="text-sm text-slate-400 mt-3">{listening ? 'Listening...' : 'Tap to record voice note'}</p>
                {textInput && <p className="text-xs text-slate-300 mt-3 p-3 bg-white/5 rounded-xl">{textInput}</p>}
              </div>
            )}

            {/* Analysis result */}
            {analysis && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                <p className="text-xs font-semibold text-green-400 mb-2">✅ JARVIS Analysis</p>
                <p className="text-sm font-medium text-white mb-1">{analysis.title}</p>
                <p className="text-xs text-slate-300">{analysis.summary}</p>
                {analysis.key_points?.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {analysis.key_points.map((p,i) => <li key={i} className="text-xs text-slate-400 flex gap-1.5"><span className="text-green-400">•</span>{p}</li>)}
                  </ul>
                )}
              </div>
            )}

            {(addType === 'manual' || addType === 'url' || (addType === 'voice' && textInput)) && (
              <button onClick={addTextNote} disabled={!textInput.trim() || uploading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold text-sm disabled:opacity-50">
                {uploading ? 'Analyzing...' : 'Save & Analyze'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
