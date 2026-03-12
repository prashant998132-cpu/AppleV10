'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { clientSpeak, stopCurrentAudio, speakWithEmotion } from '@/lib/ai/media-client';
import { useClientCache } from '@/lib/cache/client-cache';
import { Send, Mic, MicOff, Volume2, VolumeX, Camera, X, Plus, ChevronDown, ChevronUp, Minimize2, Copy, Check, MessageSquare, Trash2, History, Search, Bookmark, Download, ChevronDoubleDown, Palette, LogOut } from 'lucide-react';
import FestivalBanner from '@/components/ui/FestivalBanner';
import TypingDots from '@/components/chat/TypingDots';
import MessageReactions from '@/components/chat/MessageReactions';
import ErrorSuggestions from '@/components/chat/ErrorSuggestions';
import { ThemeProvider, ThemeSwitcher, useTheme } from '@/components/ui/ThemeProvider';
import { useWakeWord, WakeWordIndicator } from '@/components/chat/WakeWord';
import DailyBrief from '@/components/chat/DailyBrief';
import WorkflowProgress from '@/components/chat/WorkflowProgress';
import { detectWorkflow, generateAIPlan, executeWorkflow } from '@/lib/ai/task-planner';
import { handleClientCommand } from '@/lib/automation/deep-links';
import { getTimeContext, trackUsage, getFrequentCommands, getProactiveAlerts } from '@/lib/ai/smart-context';

// ─── Constants ────────────────────────────────────────────────
const MODES = [
  { id:'auto',  label:'🤖 Auto',  bg:'bg-cyan-500/15 border-cyan-500/40',    text:'text-cyan-400'   },
  { id:'flash', label:'⚡ Flash', bg:'bg-yellow-500/15 border-yellow-500/40', text:'text-yellow-400' },
  { id:'think', label:'🧠 Think', bg:'bg-purple-500/15 border-purple-500/40', text:'text-purple-400' },
  { id:'deep',  label:'🔬 Deep',  bg:'bg-blue-500/15 border-blue-500/40',    text:'text-blue-400'   },
];

// Time-aware quick starters — evaluated at render time
function getQuickStarters() {
  const h = new Date().getHours();
  if (h < 6)  return [
    { t:'Nind nahi aa rahi, kya karu?',    i:'🌙' },
    { t:'Raat ko productive kaise rahun?', i:'⚡' },
    { t:'Kya yaad hai mujhse?',             i:'🧠' },
    { t:'Honest baat karo mujhse',         i:'💬' },
    { t:'Ek dark joke sunao yaar',         i:'😈' },
  ];
  if (h < 12) return [
    { t:'Aaj ka plan kya hona chahiye?', i:'🌅' },
    { t:'Morning motivation chahiye',    i:'🔥' },
    { t:'Kya yaad hai mujhse?',          i:'🧠' },
    { t:'Aaj ka mausam kaisa hai?',      i:'🌤️' },
    { t:'Koi fresh idea do mujhe',       i:'💡' },
  ];
  if (h < 17) return [
    { t:'Focus nahi ho raha kaam pe',   i:'😵' },
    { t:'Quick decision leni hai',      i:'⚡' },
    { t:'Kuch interesting batao',       i:'🧠' },
    { t:'Thoda entertain karo',         i:'😄' },
  ];
  if (h < 21) return [
    { t:'Aaj ka din kaisa raha?',       i:'📊' },
    { t:'Kal ke liye ready karo mujhe', i:'🎯' },
    { t:'Kuch naya seekhna hai',        i:'📚' },
    { t:'Stress hai, baat karni hai',   i:'💙' },
  ];
  return [
    { t:'Din review karo mera',          i:'🌙' },
    { t:'Kal ke liye ek goal set karo',  i:'🎯' },
    { t:'Neend se pehle motivation',     i:'✨' },
    { t:'Koi mast kahani sunao',         i:'📖' },
  ];
}

// ─── Helpers ──────────────────────────────────────────────────
function detectMode(msg) {
  const m = msg.toLowerCase(), w = m.split(/\s+/).length;
  if (w <= 4 || /^(hi|hello|ok|haan|thanks|bye|namaste|kya hal)[\s!?.]*$/i.test(m)) return 'flash';
  if (/\b(why|kyu|explain|code|math|solve|debug|compare|neet|jee|logic|reason)\b/.test(m)) return 'think';
  if (/\b(plan|roadmap|write|email|research|strategy|career|analyze|create)\b/.test(m) || w > 20) return 'deep';
  return 'flash';
}

// ─── Time helper ─────────────────────────────────────────────
function relativeTime(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff/60000), h = Math.floor(m/60), d = Math.floor(h/24);
  if (m < 1) return 'Abhi';
  if (m < 60) return `${m}m pehle`;
  if (h < 24) return `${h}h pehle`;
  if (d < 7)  return `${d} din pehle`;
  return new Date(ts).toLocaleDateString('en-IN',{day:'2-digit',month:'short'});
}

// ─── Markdown renderer (no external library needed) ──────────
function MdContent({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  const out = [];
  let codeBlock = false, codeLang = '', codeLines = [];
  let listItems = [];

  function flushList() {
    if (!listItems.length) return;
    out.push(
      <ul key={out.length} className="list-none space-y-1 my-2">
        {listItems.map((item, i) => (
          <li key={i} className="flex gap-2 items-start">
            <span className="text-blue-400 mt-0.5 shrink-0">•</span>
            <span className="text-slate-200">{inlineFormat(item)}</span>
          </li>
        ))}
      </ul>
    );
    listItems = [];
  }

  function inlineFormat(str) {
    // Bold **text**, Code `text`, italic *text*
    const parts = [];
    let rem = str, key = 0;
    while (rem) {
      const bold  = rem.match(/^(.*?)\*\*(.+?)\*\*/s);
      const code  = rem.match(/^(.*?)`(.+?)`/);
      const first = [bold, code].filter(Boolean).sort((a,b) => a[1].length - b[1].length)[0];
      if (!first) { parts.push(<span key={key++}>{rem}</span>); break; }
      if (first[1]) parts.push(<span key={key++}>{first[1]}</span>);
      if (first === bold)  parts.push(<strong key={key++} className="font-bold text-white">{first[2]}</strong>);
      if (first === code)  parts.push(<code key={key++} className="bg-white/10 text-cyan-300 px-1.5 py-0.5 rounded text-xs font-mono">{first[2]}</code>);
      rem = rem.slice(first[0].length);
    }
    return parts.length ? parts : str;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Code block
    if (line.startsWith('```')) {
      if (!codeBlock) {
        flushList();
        codeBlock = true; codeLang = line.slice(3).trim(); codeLines = [];
      } else {
        const code = codeLines.join('\n');
        out.push(
          <div key={out.length} className="my-2 rounded-xl overflow-hidden border border-white/10">
            {codeLang && <div className="px-3 py-1 bg-white/5 text-[10px] text-slate-500 font-mono">{codeLang}</div>}
            <pre className="p-3 bg-black/40 text-green-300 text-xs font-mono overflow-x-auto whitespace-pre leading-relaxed">{code}</pre>
          </div>
        );
        codeBlock = false; codeLang = ''; codeLines = [];
      }
      continue;
    }
    if (codeBlock) { codeLines.push(line); continue; }
    // Headings
    if (line.startsWith('### ')) { flushList(); out.push(<h3 key={out.length} className="font-bold text-white text-sm mt-2 mb-1">{line.slice(4)}</h3>); continue; }
    if (line.startsWith('## '))  { flushList(); out.push(<h2 key={out.length} className="font-bold text-white mt-3 mb-1">{line.slice(3)}</h2>); continue; }
    if (line.startsWith('# '))   { flushList(); out.push(<h1 key={out.length} className="font-bold text-white text-base mt-3 mb-1">{line.slice(2)}</h1>); continue; }
    // Lists
    if (/^[-*•] /.test(line))    { listItems.push(line.replace(/^[-*•] /,'')); continue; }
    if (/^\d+\.\s/.test(line)) { listItems.push(line.replace(/^\d+\.\s/,'')); continue; }
    // Horizontal rule
    if (/^---+$/.test(line.trim())) { flushList(); out.push(<hr key={out.length} className="border-white/10 my-2"/>); continue; }
    // Normal line
    flushList();
    if (!line.trim()) { out.push(<div key={out.length} className="h-1.5"/>); continue; }
    out.push(<p key={out.length} className="text-slate-100 leading-relaxed">{inlineFormat(line)}</p>);
  }
  flushList();
  return <div className="space-y-0.5">{out}</div>;
}

// ─── Search Panel ─────────────────────────────────────────────
function SearchPanel({ msgs, onClose, onJump }) {
  const [q, setQ] = useState('');
  const results = q.length > 1
    ? msgs.filter(m => m.content?.toLowerCase().includes(q.toLowerCase())).slice(0,8)
    : [];
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center pt-16 px-4" onClick={onClose}>
      <div className="w-full max-w-md bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
          <span className="text-slate-500 text-sm">🔍</span>
          <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Chat mein search karo..."
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder-slate-600"/>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-400"><X size={14}/></button>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {q.length > 1 && results.length === 0 && <p className="text-slate-600 text-xs text-center py-6">Kuch nahi mila</p>}
          {results.map(m=>(
            <button key={m.id} onClick={()=>{onJump(m.id);onClose();}}
              className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/[0.04]">
              <p className="text-[10px] text-slate-600 mb-0.5">{m.role === 'user' ? 'Tu' : 'JARVIS'}</p>
              <p className="text-xs text-slate-400 truncate">{m.content?.slice(0,80)}</p>
            </button>
          ))}
          {q.length <= 1 && <p className="text-slate-700 text-xs text-center py-6">2+ characters likho</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────
function ThinkBubble({ tokens }) {
  const [open, setOpen] = useState(false);
  if (!tokens) return null;
  return (
    <div className="mb-1.5 ml-10">
      <button onClick={() => setOpen(o=>!o)} className="flex items-center gap-1 text-[11px] text-purple-400/60 hover:text-purple-300 transition-colors">
        <span>🧠</span><span>Thought process</span>{open?<ChevronUp size={10}/>:<ChevronDown size={10}/>}
      </button>
      {open && <div className="mt-1.5 p-3 bg-purple-500/6 border border-purple-500/15 rounded-xl text-xs text-slate-500 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto font-mono">{tokens}</div>}
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text).catch(()=>{});
    setCopied(true);
    setTimeout(()=>setCopied(false), 2000);
  }
  return (
    <button onClick={copy} className={`text-[10px] flex items-center gap-0.5 transition-colors ${copied?'text-green-400':'text-slate-700 hover:text-slate-400'}`}>
      {copied?<Check size={9}/>:<Copy size={9}/>}{copied?'Copied':'Copy'}
    </button>
  );
}

function Bubble({ msg, onSpeak, voiceOn, onFollowUp }) {
  const isUser = msg.role === 'user';
  const [showC, setShowC] = useState(false);
  const [compressed, setCompressed] = useState(null);
  const [compressing, setCompressing] = useState(false);
  const [feedback, setFeedback] = useState(null); // null | 'up' | 'down'
  const text = compressed || msg.content;

  // Auto-generate conversation title after first exchange
  async function generateTitle(cId, userMsg, aiReply) {
    if (titleGenerated || !cId) return;
    setTitleGenerated(true);
    try {
      const r = await fetch('/api/chat/title', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ conversationId: cId, firstMessage: userMsg, firstReply: aiReply })
      });
      const d = await r.json();
      if (d.title) {
        // Update sidebar conversation list with new title
        setConvs(p => p.map(c => c.id===cId ? {...c, title: d.title} : c));
      }
    } catch { /* silent */ }
  }

  // Export chat as .txt file
  function exportChat() {
    if (!msgs.length) return;
    const lines = msgs.map(m => {
      const who  = m.role==='user' ? '👤 Tum' : '🤖 JARVIS';
      const time = new Date(m.ts||Date.now()).toLocaleTimeString('hi-IN',{hour:'2-digit',minute:'2-digit'});
      return `[${time}] ${who}:
${m.content}
`;
    });
    const separator = '─'.repeat(40);
    const dateStr = new Date().toLocaleDateString('hi-IN');
    const text = ['JARVIS Chat Export — ' + dateStr, separator, '', ...lines].join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `jarvis-chat-${Date.now()}.txt`;
    a.click(); URL.revokeObjectURL(url);
  }

  // Handle emoji reaction
  function handleReaction(msgId, emoji) {
    setReactions(p => ({ ...p, [msgId]: emoji }));
  }

  // Error recovery actions
  async function handleErrorAction(action, originalMsg) {
    setMsgError(null);
    if (action==='retry') { await send(originalMsg); }
    else if (action==='flash') { await send(originalMsg, 'flash'); }
    else if (action==='free' || action==='offline') { await send(originalMsg, 'flash'); }
    else if (action==='simplify') { taRef.current?.focus(); setInput(originalMsg); }
  }

  async function sendFeedback(rating) {
    setFeedback(rating);
    try {
      await fetch('/api/memory', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'feedback', messageId: msg.id, rating, content: msg.content }) });
    } catch {}
  }

  async function compress(level) {
    setShowC(false); setCompressing(true);
    const targets = { tiny:'1-2 lines only', short:'~70 words', medium:'~130 words' };
    try {
      const r = await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({message:`Compress to ${targets[level]}, Hinglish:\n\n${msg.content}`,history:[],mode:'flash'})});
      const d = await r.json(); setCompressed(d.reply);
    } finally { setCompressing(false); }
  }

  return (
    <div className={`flex ${isUser?'justify-end':'justify-start'} mb-3 px-1 msg-in`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center mr-2.5 mt-0.5 shrink-0 shadow-[0_0_14px_rgba(26,86,219,0.3)]">
          <span className="text-white font-black text-[10px]">J</span>
        </div>
      )}
      <div className={`max-w-[84%] flex flex-col ${isUser?'items-end':'items-start'} gap-1`}>
        {msg.cameraPreview && <img src={msg.cameraPreview} alt="" className="rounded-2xl max-w-[110px] border border-white/10 mb-1"/>}
        {msg.imageUrl && <div className="rounded-2xl overflow-hidden border border-white/10 mb-1 shadow-xl"><img src={msg.imageUrl} alt="" className="w-full max-w-[260px]"/></div>}
        {!isUser && <ThinkBubble tokens={msg.thinking}/>}

        <div className={`px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
          isUser
            ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-[20px_20px_5px_20px] shadow-[0_4px_20px_rgba(59,130,246,0.22)]'
            : 'bg-white/[0.06] border border-white/[0.08] text-slate-100 rounded-[20px_20px_20px_5px]'
        }`}>
          {compressing
            ? <span className="text-slate-400 text-xs animate-pulse">Compress ho raha hai...</span>
            : isUser ? text
            : <>{text}{msg.streaming && <span className="inline-block w-0.5 h-4 bg-blue-400 ml-0.5 animate-pulse align-middle"/>}</>
          }
        </div>

        {/* Compress popup */}
        {showC && (
          <div className="flex gap-1 bg-[#090d1a] border border-white/10 rounded-xl p-1.5 shadow-2xl z-10">
            {[{id:'tiny',l:'💬 Tiny'},{id:'short',l:'📝 Short'},{id:'medium',l:'📄 Medium'}].map(c=>(
              <button key={c.id} onClick={()=>compress(c.id)} className="px-3 py-2 rounded-lg hover:bg-white/8 transition-colors text-xs text-white font-medium">{c.l}</button>
            ))}
          </div>
        )}

        {/* Meta bar */}
        <div className="flex flex-wrap gap-1.5 items-center px-0.5">
          {msg.agentsUsed?.slice(0,3).map(a=>(
            <span key={a} className="text-[10px] bg-blue-500/10 text-blue-400/80 border border-blue-500/15 px-1.5 py-0.5 rounded-full">{a.replace(/_/g,' ')}</span>
          ))}
          {!isUser && !msg.streaming && (
            <>
              <CopyButton text={msg.content}/>
              {msg.content?.length > 150 && (
                <button onClick={()=>setShowC(s=>!s)} className="text-[10px] text-slate-700 hover:text-slate-400 flex items-center gap-0.5 transition-colors">
                  <Minimize2 size={9}/>compress
                </button>
              )}
              {voiceOn && <button onClick={()=>onSpeak(msg.content)} className="text-[10px] text-slate-700 hover:text-blue-400 transition-colors">🔊</button>}
              {!isUser && (
                <div className="flex items-center gap-0.5 ml-1">
                  <button onClick={()=>sendFeedback('up')} title="Helpful"
                    className={`text-[10px] transition-colors ${feedback==='up'?'text-green-400':'text-slate-700 hover:text-green-400'}`}>👍</button>
                  <button onClick={()=>sendFeedback('down')} title="Not helpful"
                    className={`text-[10px] transition-colors ${feedback==='down'?'text-red-400':'text-slate-700 hover:text-red-400'}`}>👎</button>
                  <MessageReactions messageId={msg.id} onReact={handleReaction}/>
                  <button onClick={async()=>{
                    const isPinned = pinnedIds.has(msg.id);
                    await fetch('/api/messages/pin',{method:'POST',headers:{'Content-Type':'application/json'},
                      body:JSON.stringify({messageId:msg.id,content:msg.content,role:msg.role,action:isPinned?'unpin':undefined})});
                    if(isPinned){
                      setPinnedIds(s=>{ const n=new Set(s); n.delete(msg.id); return n; });
                      setPinnedMsgs(p=>p.filter(x=>x.message_id!==msg.id));
                    } else {
                      setPinnedIds(s=>new Set([...s,msg.id]));
                      setPinnedMsgs(p=>[...p,{message_id:msg.id,content:msg.content,role:msg.role}]);
                    }
                    navigator.vibrate?.(40);
                  }} title={pinnedIds.has(msg.id)?"Unpin karo":"Pin karo"}
                  className={`text-[10px] transition-colors ${pinnedIds.has(msg.id)?'text-yellow-400':'text-slate-700 hover:text-yellow-400'}`}>📌</button>
                </div>
              )}
            </>
          )}
          {msg.modelUsed && !isUser && (
            <span className={`text-[10px] border px-1.5 py-0.5 rounded-full ${
              msg.modelUsed === 'offline' || msg.modelUsed === 'keyword-fallback'
                ? 'text-orange-400/80 border-orange-500/20 bg-orange-500/5'
                : 'text-slate-800 border-white/5'
            }`}>{msg.modelUsed === 'keyword-fallback' ? '⚠️ offline mode' : msg.modelUsed}</span>
          )}
          <span className="text-[10px] text-slate-800 cursor-pointer hover:text-slate-500 transition-colors" title={new Date(msg.ts||Date.now()).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}>{new Date(msg.ts||Date.now()).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}{msg.timing?` · ${(msg.timing/1000).toFixed(1)}s`:''}</span>
        </div>

        {/* Follow-up suggestions */}
        {!isUser && !msg.streaming && msg.followUps?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1 max-w-[90%]">
            {msg.followUps.map(q=>(
              <button key={q} onClick={()=>onFollowUp(q)}
                className="text-[11px] text-blue-400/70 border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 hover:text-blue-300 px-2.5 py-1 rounded-xl transition-all">
                {q}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// TypingDots now imported from components/chat/TypingDots.jsx

// ─── History Sidebar ──────────────────────────────────────────
function HistorySidebar({ open, onClose, onLoad, onDelete }) {
  const [convs, setConvs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(()=>{
    if(!open) return;
    setLoading(true);
    fetch('/api/conversations').then(r=>r.json()).then(d=>{setConvs(d.conversations||[]);setLoading(false);}).catch(()=>setLoading(false));
  },[open]);

  if(!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose}/>
      <div className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-[#080c14] border-r border-white/[0.06] flex flex-col">
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <p className="font-bold text-white text-sm">Chat History</p>
          <button onClick={onClose}><X size={16} className="text-slate-600"/></button>
        </div>
        <div className="flex-1 overflow-y-auto py-2 no-scrollbar">
          {loading && <p className="text-center text-slate-700 text-xs py-8">Loading...</p>}
          {!loading && convs.length===0 && <p className="text-center text-slate-700 text-xs py-8">Koi conversation nahi hai abhi</p>}
          {convs.map(c=>(
            <div key={c.id} className="group flex items-center gap-2 px-3 py-2 hover:bg-white/5 cursor-pointer transition-colors mx-2 rounded-xl">
              <MessageSquare size={13} className="text-slate-700 shrink-0"/>
              <button onClick={()=>{onLoad(c.id);onClose();}} className="flex-1 text-left min-w-0">
                <p className="text-xs text-slate-400 truncate group-hover:text-white transition-colors">{c.title||'Naya Chat'}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {c.message_count > 0 && <span className="text-[10px] text-slate-700">{c.message_count} msgs</span>}
                  <span className="text-[10px] text-slate-800">·</span>
                  <span className="text-[10px] text-slate-700">{relativeTime(c.updated_at)}</span>
                </div>
              </button>
              <button onClick={e=>{e.stopPropagation();onDelete(c.id);setConvs(p=>p.filter(x=>x.id!==c.id));}}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1">
                <Trash2 size={11} className="text-slate-700 hover:text-red-400"/>
              </button>
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-white/[0.06]">
          <button onClick={()=>{onLoad(null);onClose();}} className="w-full py-2.5 rounded-xl border border-white/10 text-xs text-slate-500 hover:text-white transition-colors flex items-center justify-center gap-2">
            <Plus size={13}/> Naya Chat
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Dynamic time-aware greeting ─────────────────────────────
function DynamicGreeting() {
  const h = new Date().getHours();
  const greetings = {
    night:   { main: "Raat ko jaagna hua?",     sub: "Chal, kuch productive karte hain ya bas baat karte hain 🌙" },
    morning: { main: "Good morning! 🌅",          sub: "Naya din, nayi energy. Aaj kya plan hai?" },
    noon:    { main: "Kya chal raha hai?",        sub: "Dopahar ho gayi — kaam chal raha hai ya bas time pass? 😄" },
    evening: { main: "Shaam ho gayi yaar",        sub: "Din kaisa raha? Baat karte hain kuch." },
    late:    { main: "Itni raat ko?",             sub: "Neend nahi aa rahi ya koi serious kaam hai? 🌛" },
  };
  const g = h < 5 ? greetings.late
    : h < 12 ? greetings.morning
    : h < 17 ? greetings.noon
    : h < 21 ? greetings.evening
    : greetings.night;

  return (
    <div className="text-center">
      <h2 className="text-xl font-black text-white mb-1">{g.main}</h2>
      <p className="text-xs text-slate-500">{g.sub}</p>
    </div>
  );
}

// ─── Main Chat Page ───────────────────────────────────────────
export default function ChatPage() {
  // Logout
  async function logout() {
    try {
      const { getSupabaseBrowser } = await import('@/lib/db/supabase');
      const sb = getSupabaseBrowser();
      await sb.auth.signOut();
    } catch {}
    document.cookie = 'jarvis_token=; path=/; max-age=0';
    document.cookie = 'jarvis_uid=; path=/; max-age=0';
    window.location.href = '/login';
  }

  const [msgs, setMsgs]         = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [mode, setMode]         = useState('auto');
  const [detected, setDetected] = useState(null);
  const [voiceOn, setVoiceOn]   = useState(false);
  const [convMode, setConvMode] = useState('casual');
  const [newBadge, setNewBadge] = useState(null);   // {emoji, name} for toast
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening]= useState(false);
  const [preview, setPreview]   = useState(null);
  const [imgB64, setImgB64]     = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [convId, setConvId]     = useState(null);
  const [phase, setPhase]       = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [resuming, setResuming] = useState(true);   // auto-resume last chat
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ]   = useState('');
  const [titleGenerated, setTitleGenerated] = useState(false);  // auto-title
  const [showScrollBtn, setShowScrollBtn]   = useState(false);  // scroll-to-bottom
  const [msgError, setMsgError]             = useState(null);   // error recovery
  const [lastUserMsg, setLastUserMsg]       = useState('');     // for retry
  const [reactions, setReactions]           = useState({});     // {msgId: emoji}
  const [pinnedMsgs, setPinnedMsgs]         = useState([]);     // pinned messages
  const [pinsOpen, setPinsOpen]             = useState(false);  // pins panel open
  const [pinnedIds, setPinnedIds]           = useState(new Set()); // fast lookup
  const [refreshing, setRefreshing]         = useState(false);  // pull-to-refresh
  // ── Workflow / Task Planner ──────────────────────────────────
  const [activeWorkflow, setActiveWorkflow] = useState(null);  // current workflow
  const [stepStatuses, setStepStatuses]     = useState({});    // step progress
  const [workflowDone, setWorkflowDone]     = useState(false);
  const [workflowResult, setWorkflowResult] = useState('');
  // ── Smart Context ────────────────────────────────────────────
  const [timeCtx, setTimeCtx]               = useState(null);
  const [proAlerts, setProAlerts]           = useState([]);
  const [freqCmds, setFreqCmds]             = useState([]);
  const [theme, setTheme]                   = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('jarvis_theme') || 'dark' : 'dark'
  );
  const endRef      = useRef(null);
  const scrollRef   = useRef(null);  // scroll container
  const mediaRecRef = useRef(null);  // Groq Whisper STT
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const srRef     = useRef(null);
  const taRef     = useRef(null);
  const msgRefs   = useRef({});

  // ── Keyboard shortcuts ───────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      // Ctrl/Cmd+K → focus input
      if ((e.ctrlKey||e.metaKey) && e.key==='k') { e.preventDefault(); taRef.current?.focus(); }
      // Ctrl/Cmd+E → export chat
      if ((e.ctrlKey||e.metaKey) && e.key==='e' && msgs.length>0) { e.preventDefault(); exportChat(); }
      // Escape → close panels
      if (e.key==='Escape') { setSearchOpen(false); setHistoryOpen(false); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [msgs]);

  // ── AUTO-RESUME last conversation on mount ────────────────
  useEffect(()=>{
    (async()=>{
      try {
        const r = await fetch('/api/conversations');
        const d = await r.json();
        const last = d.conversations?.[0];
        if (last) {
          const r2 = await fetch(`/api/conversations?id=${last.id}`);
          const d2 = await r2.json();
          const loaded = (d2.messages||[]).map(m=>({
            id:`m${m.id}`, role:m.role, content:m.content,
            modelUsed:m.metadata?.modelUsed, agentsUsed:m.metadata?.agentsUsed,
            ts: new Date(m.created_at).getTime(),
          }));
          if (loaded.length) {
            setMsgs(loaded);
            setConvId(last.id);
          }
        }
      } catch {}
      setResuming(false);
    })();
  }, []);

  // Smart context — time/device aware
  useEffect(() => {
    setTimeCtx(getTimeContext());
    setFreqCmds(getFrequentCommands(4));
    getProactiveAlerts().then(setProAlerts).catch(()=>{});
  }, []);

  // Load pinned messages on mount
  useEffect(() => {
    fetch('/api/messages/pin').then(r=>r.json()).then(d=>{
      if(d.pins) {
        setPinnedMsgs(d.pins);
        setPinnedIds(new Set(d.pins.map(p=>p.message_id)));
      }
    }).catch(()=>{});
  }, []);

  // Pull-to-refresh (mobile touch gesture)
  useEffect(() => {
    let startY = 0;
    const el = document.querySelector('.jarvis-scroll');
    if (!el) return;
    const onTouchStart = (e) => { startY = e.touches[0].clientY; };
    const onTouchEnd = (e) => {
      const dy = e.changedTouches[0].clientY - startY;
      if (dy > 80 && el.scrollTop === 0 && !refreshing) {
        setRefreshing(true);
        navigator.vibrate?.(50);
        // Reload last conversation
        setTimeout(() => setRefreshing(false), 1200);
      }
    };
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [msgs]);

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:'smooth'}); },[msgs, loading]);

  // Scroll-to-bottom button visibility
  useEffect(() => {
    const el = document.querySelector('.jarvis-scroll');
    if (!el) return;
    const handler = () => setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 200);
    el.addEventListener('scroll', handler);
    return () => el.removeEventListener('scroll', handler);
  }, []);
  useEffect(()=>{
    if(!input.trim()||mode!=='auto'){setDetected(null);return;}
    setDetected(detectMode(input));
  },[input,mode]);

  // Auto-resize textarea
  useEffect(()=>{
    const ta = taRef.current; if(!ta) return;
    ta.style.height='auto'; ta.style.height=Math.min(ta.scrollHeight,88)+'px';
  },[input]);

  async function speak(text) {
    if(!text||typeof window==='undefined') return;
    setSpeaking(true);
    try {
      // clientSpeak: Sarvam direct from browser → ElevenLabs → Browser TTS
      // Zero Vercel bandwidth — audio bytes go provider→browser directly
      await speakWithEmotion(text, {
        sarvamKey: window.__JARVIS_KEYS__?.sarvam,
        elevenLabsKey: window.__JARVIS_KEYS__?.elevenlabs,
        voice: 'meera',
        onEnd: () => setSpeaking(false),
      });
    } catch {
      // Final fallback — browser TTS
      window.speechSynthesis?.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[*_#`~[\]{}]/g,' ').slice(0,400));
      u.lang='hi-IN'; u.rate=1.0;
      const voices = window.speechSynthesis?.getVoices()||[];
      const hv = voices.find(v=>v.lang.startsWith('hi'))||voices.find(v=>v.lang==='en-IN');
      if(hv) u.voice=hv;
      u.onend=()=>setSpeaking(false);
      window.speechSynthesis?.speak(u);
    }
  }

  async function startVoice() {
    // Stop if already listening
    if (mediaRecRef.current) {
      mediaRecRef.current.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks = [];
      mediaRecRef.current = rec;
      setListening(true);
      rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      rec.onstop = async () => {
        setListening(false);
        mediaRecRef.current = null;
        stream.getTracks().forEach(t => t.stop());
        navigator.vibrate?.(40);
        // Try Groq Whisper via /api/stt
        try {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const fd = new FormData();
          fd.append('audio', blob, 'voice.webm');
          fd.append('language', 'hi');
          const r = await fetch('/api/stt', { method: 'POST', body: fd });
          const d = await r.json();
          if (d.text) { setInput(d.text); return; }
        } catch {}
        // Fallback: Browser Web Speech API
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return;
        const sr = new SR(); sr.lang = 'hi-IN'; sr.interimResults = false;
        sr.onresult = e => setInput(e.results[0][0].transcript);
        sr.start();
      };
      rec.start();
      // Auto-stop after 10 seconds
      setTimeout(() => { if (mediaRecRef.current) mediaRecRef.current.stop(); }, 10000);
    } catch {
      // Direct browser fallback if mic permission denied
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) return;
      if (srRef.current) { srRef.current.stop(); return; }
      const r = new SR(); r.lang = 'hi-IN'; r.interimResults = false; srRef.current = r;
      r.onstart = () => setListening(true);
      r.onresult = e => { setInput(e.results[0][0].transcript); navigator.vibrate?.(40); };
      r.onend = () => { setListening(false); srRef.current = null; };
      r.onerror = () => { setListening(false); srRef.current = null; };
      r.start();
    }
  }

  async function startCamera() {
    try {
      const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});
      streamRef.current=s; if(videoRef.current) videoRef.current.srcObject=s; setCameraOn(true);
    } catch{alert('Camera permission chahiye');}
  }
  function capturePhoto() {
    const v=videoRef.current,c=canvasRef.current; if(!v||!c) return;
    c.width=v.videoWidth; c.height=v.videoHeight; c.getContext('2d').drawImage(v,0,0);
    const d=c.toDataURL('image/jpeg',0.7); setPreview(d); setImgB64(d.split(',')[1]);
    streamRef.current?.getTracks().forEach(t=>t.stop()); setCameraOn(false);
  }

  async function loadConversation(id) {
    setMsgs([]); setConvId(id);
    if(!id) return;
    try {
      const r = await fetch(`/api/conversations?id=${id}`);
      const d = await r.json();
      const loaded = (d.messages||[]).map(m=>({
        id:`m${m.id}`, role:m.role, content:m.content,
        modelUsed:m.metadata?.modelUsed, agentsUsed:m.metadata?.agentsUsed,
        ts: new Date(m.created_at).getTime(),
      }));
      setMsgs(loaded);
    } catch{}
  }

  async function deleteConversation(id) {
    await fetch('/api/conversations',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})}).catch(()=>{});
    if(convId===id){setMsgs([]);setConvId(null);}
  }

  // ── Generate follow-up suggestions ───────────────────────────
  async function generateFollowUps(reply, question) {
    try {
      const r = await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          message:`Based on this Q&A, suggest 3 short follow-up questions in Hinglish (max 6 words each). Return ONLY a JSON array of strings.\nQ: ${question.slice(0,100)}\nA: ${reply.slice(0,200)}`,
          history:[], mode:'flash'
        })});
      const d = await r.json();
      const arr = JSON.parse(d.reply.replace(/```json|```/g,'').trim());
      return Array.isArray(arr) ? arr.slice(0,3) : [];
    } catch { return []; }
  }

  // ── Main send function (streaming) ───────────────────────────
  // ── Client-side cache ──────────────────────────────────
  const { get: cacheGet, set: cacheSet } = useClientCache();

  // ── Wake Word "Hey JARVIS" ────────────────────────────────────
  const [wakeWordOn, setWakeWordOn] = useState(false);
  const { listening: wakeListening, wakeDetected } = useWakeWord({
    enabled: wakeWordOn,
    onWake: () => {
      // Activate mic for command
      startVoice?.();
      navigator.vibrate?.([100, 50, 100]);
    },
    onCommand: async (cmd) => {
      // Direct command after wake word → check automation first
      const automationResult = await tryAutomation(cmd);
      if (!automationResult) {
        // Not an automation command → send to AI
        send(cmd);
      }
    },
  });

  // Try phone automation command
  async function tryAutomation(text) {
    try {
      const r = await fetch('/api/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const d = await r.json();
      if (d.ok) {
        // Show automation result in chat
        const autoMsg = { id: `auto${Date.now()}`, role: 'assistant', content: `${d.message} 📱`, ts: Date.now(), mode: 'flash' };
        setMsgs(p => [...p, autoMsg]);
        navigator.vibrate?.(200);
        return true;
      }
      if (d.setup_needed) {
        const setupMsg = { id: `setup${Date.now()}`, role: 'assistant', content: `📱 MacroDroid setup nahi hua abhi. [Automation Setup](/automation) page pe jaao!`, ts: Date.now(), mode: 'flash' };
        setMsgs(p => [...p, setupMsg]);
        return true;
      }
    } catch { }
    return false;
  }

  async function send(text=input, modeOvr=null) {
    const msg=text?.trim(); if((!msg&&!imgB64)||loading) return;
    setInput(''); navigator.vibrate?.(15);

    // Track usage for smart suggestions
    trackUsage(msg);
    setFreqCmds(getFrequentCommands(4));

    // 1. Try deep link first (open apps directly)
    if (msg) {
      const deepResult = handleClientCommand(msg);
      if (deepResult) {
        const deepMsg = {id:`dl${Date.now()}`,role:'assistant',content:`${deepResult} 📱`,ts:Date.now(),mode:'flash'};
        const userMsg2 = {id:`u${Date.now()}`,role:'user',content:msg,ts:Date.now()};
        setMsgs(p=>[...p,userMsg2,deepMsg]);
        return;
      }
    }

    // 2. Try MacroDroid automation
    if (msg) {
      const autoResult = await tryAutomation(msg);
      if (autoResult) return;
    }

    // 3. Detect workflow (multi-step task)
    if (msg) {
      const workflow = detectWorkflow(msg);
      if (workflow) {
        // Show workflow in chat
        const userMsg3 = {id:`u${Date.now()}`,role:'user',content:msg,ts:Date.now()};
        setMsgs(p=>[...p,userMsg3]);
        setActiveWorkflow(workflow);
        setStepStatuses({});
        setWorkflowDone(false);
        setWorkflowResult('');
        // Execute workflow
        executeWorkflow({
          workflow,
          message: msg,
          agents: null,
          groqKey: null, // will use API route
          onProgress: (stepId, status, result) => {
            setStepStatuses(prev => ({ ...prev, [stepId]: { status, result } }));
          },
          onComplete: (result) => {
            setWorkflowDone(true);
            setWorkflowResult(result);
            if (result) {
              const wfMsg = {id:`wf${Date.now()}`,role:'assistant',content:result,ts:Date.now(),mode:'deep'};
              setMsgs(p=>[...p,wfMsg]);
            }
          },
        });
        return;
      }
    }
    const activeMode = modeOvr||mode;
    const finalMode  = activeMode==='auto'?(detected||'flash'):activeMode;
    const b64=imgB64, prev=preview;
    setPreview(null); setImgB64(null); setDetected(null);

    setLastUserMsg(msg);
    setMsgError(null);
    const userMsg = {id:`u${Date.now()}`,role:'user',content:msg,cameraPreview:prev,ts:Date.now()};
    const aiId    = `a${Date.now()}`;
    const aiMsg   = {id:aiId,role:'assistant',content:'',streaming:true,thinking:null,ts:Date.now(),mode:finalMode};

    setMsgs(p=>[...p,userMsg]);
    setLoading(true);
    const phaseMessages = {
      flash: ['⚡ Already pata hai...', '⚡ Instant reply aa raha hai...', '⚡ Chal deta hoon...'][Math.floor(Math.random()*3)],
      think: ['🧠 Seriously soch raha hoon...', '🧠 Ek second, achi tarah sochu...', '🧠 DeepSeek activate...'][Math.floor(Math.random()*3)],
      deep: ['🔬 Research mode on...', '🔬 Sab dhundh raha hoon...', '🔬 Full analysis chal raha hai...'][Math.floor(Math.random()*3)],
      auto: ['🤖 Samajh raha hoon...', '🤖 Soch raha hoon...', '🤖 Aa raha hoon...'][Math.floor(Math.random()*3)],
    };
    setPhase(phaseMessages[finalMode]);

    await new Promise(r=>setTimeout(r,280));
    setMsgs(p=>[...p,aiMsg]);
    setLoading(false);

    let fullText = '';
    try {
      // ── Check client cache first (no API call if cached) ──
      if (!imgB64 && finalMode !== 'deep') {
        const cached = await cacheGet(msg);
        if (cached) {
          setMsgs(p => p.map(m => m.id === aiId
            ? { ...m, content: cached, streaming: false }
            : m
          ));
          setLoading(false);
          if (tts) await clientSpeak(cached);
          return;
        }
      }

      const history = msgs.slice(-12).map(m=>({role:m.role,content:m.content}));
      const res = await fetch('/api/chat/stream',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({message:msg,history,conversationId:convId,imageBase64:b64,mode:finalMode}),
      });

      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const reader=res.body.getReader(), dec=new TextDecoder();
      let thinkBuffer='';

      while(true) {
        const {done,value}=await reader.read(); if(done) break;
        for(const line of dec.decode(value).split('\n')) {
          if(!line.startsWith('data: ')) continue;
          try {
            const d=JSON.parse(line.slice(6));
            if(d.type==='token'){
              fullText+=d.token;
              setMsgs(p=>p.map(m=>m.id===aiId?{...m,content:m.content+d.token}:m));
            } else if(d.type==='thinking'){
              thinkBuffer+=d.token;
              setMsgs(p=>p.map(m=>m.id===aiId?{...m,thinking:thinkBuffer}:m));
            } else if(d.type==='done'){
              if(d.conversationId) setConvId(d.conversationId);
              // v10.1: Use server-side follow-up chips if available
              const serverFups = d.followUps || [];
              setMsgs(p=>p.map(m=>m.id===aiId?{
                ...m,
                streaming:false,
                modelUsed: d.provider || m.modelUsed,
                followUps: serverFups.length > 0 ? serverFups : m.followUps,
              }:m));
            } else if(d.type==='error'){
              setMsgs(p=>p.map(m=>m.id===aiId?{...m,content:d.message,streaming:false}:m));
            }
          } catch{}
        }
      }
    } catch {
      try {
        const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({message:msg,history:msgs.slice(-8).map(m=>({role:m.role,content:m.content})),mode:finalMode})});
        const d=await r.json();
        fullText=d.reply||'';
        setMsgs(p=>p.map(m=>m.id===aiId?{...m,content:d.reply||'Error',streaming:false,agentsUsed:d.agentsUsed,modelUsed:d.modelUsed,timing:d.timing}:m));
        if(d.conversationId) setConvId(d.conversationId);
      } catch {
        setMsgs(p=>p.map(m=>m.id===aiId?{...m,content:'Network error — retry karo!',streaming:false}:m));
        setMsgError('network');
      }
    } finally {
      setPhase('');
      if(voiceOn&&fullText) speak(fullText);
      // Save to client cache for repeat queries
      if(fullText && msg.length > 8 && !imgB64) {
        cacheSet(msg, fullText).catch(()=>{});
      }
      // Generate follow-up suggestions after short delay
      if(fullText&&msg.length>8) {
        // Auto-title (first message only)
        if (!titleGenerated && convId) generateTitle(convId, msg, fullText);
        setTimeout(async()=>{
          const fups = await generateFollowUps(fullText, msg);
          if(fups.length>0) setMsgs(p=>p.map(m=>m.id===aiId?{...m,followUps:fups}:m));
        }, 1200);
      }
    }
  }

  const QUICK = getQuickStarters(); // re-evaluated each render
  const curM  = MODES.find(m=>m.id===mode)||MODES[0];
  const showM = mode==='auto'&&detected ? MODES.find(m=>m.id===detected)||curM : curM;
  const isEmpty = msgs.length===0;
  const searchFiltered = searchQ.length > 1 ? msgs.filter(m => m.content?.toLowerCase().includes(searchQ.toLowerCase())) : msgs;

  if (resuming) return (
    <div className="h-full flex items-center justify-center bg-[#050810]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center orb-pulse shadow-[0_0_30px_rgba(26,86,219,0.4)]">
          <span className="text-white font-black text-sm">J</span>
        </div>
        <p className="text-slate-600 text-xs animate-pulse">Pichli baat yaad kar raha hoon...</p>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#050810]">

      {/* Search */}
      {searchOpen && <SearchPanel msgs={msgs} onClose={()=>setSearchOpen(false)} onJump={id=>{const el=msgRefs.current[id];el?.scrollIntoView({behavior:'smooth',block:'center'});}}/>}

      {/* Camera */}
      {cameraOn && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <video ref={videoRef} autoPlay playsInline className="flex-1 object-cover"/>
          <canvas ref={canvasRef} className="hidden"/>
          <div className="p-6 flex justify-center gap-8">
            <button onClick={()=>{streamRef.current?.getTracks().forEach(t=>t.stop());setCameraOn(false);}} className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center"><X size={20} className="text-white"/></button>
            <button onClick={capturePhoto} className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-2xl"><Camera size={26} className="text-black"/></button>
          </div>
        </div>
      )}

      {/* History Sidebar */}
      <HistorySidebar open={historyOpen} onClose={()=>setHistoryOpen(false)} onLoad={loadConversation} onDelete={deleteConversation}/>

      {/* Daily Morning Brief */}
      <DailyBrief onBriefMessage={(msg) => {
        const briefMsg = { id: `brief${Date.now()}`, role:'assistant', content: msg, ts: Date.now(), mode:'flash' };
        setMsgs(p => p.length === 0 ? [briefMsg] : p);
      }}/>

      {/* Pinned Messages Panel */}
      {pinsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex flex-col" onClick={()=>setPinsOpen(false)}>
          <div className="mt-auto bg-[#0d1117] border-t border-white/10 rounded-t-3xl p-5 max-h-[65vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-base">📌 Pinned Messages</h3>
              <button onClick={()=>setPinsOpen(false)} className="text-slate-500 hover:text-white text-lg">✕</button>
            </div>
            {pinnedMsgs.length === 0
              ? <p className="text-slate-600 text-sm text-center py-6">Koi pinned message nahi hai. 📌 dabao kisi message pe!</p>
              : <div className="space-y-3">
                  {pinnedMsgs.map((p,i) => (
                    <div key={i} className="bg-white/[0.04] border border-yellow-500/20 rounded-xl p-3">
                      <p className="text-[10px] text-yellow-500/60 mb-1">{p.role === 'user' ? '👤 Tumne' : '🤖 JARVIS'}</p>
                      <p className="text-sm text-slate-300 leading-relaxed line-clamp-4">{p.content}</p>
                    </div>
                  ))}
                </div>
            }
          </div>
        </div>
      )}

      {/* Pull-to-refresh indicator */}
      {refreshing && (
        <div className="flex items-center justify-center py-2 text-xs text-blue-400 animate-pulse shrink-0">
          <span className="mr-1">🔄</span> Refresh ho raha hai...
        </div>
      )}

      {/* Header */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2.5">
          <button onClick={()=>setHistoryOpen(true)} className="p-1.5 text-slate-600 hover:text-slate-300 transition-colors" title="Chat history">
            <History size={16}/>
          </button>
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-[0_0_18px_rgba(26,86,219,0.4)] ${loading||msgs.some(m=>m.streaming)?'animate-pulse':''}`}>
            <span className="text-white font-black text-xs">J</span>
          </div>
          <div>
            <p className="text-sm font-bold text-white">JARVIS</p>
            {/* Conv mode badge + XP toast */}
            {newBadge && (
              <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-yellow-500/90 text-black text-xs font-bold px-4 py-2 rounded-full shadow-lg animate-bounce whitespace-nowrap">
                {newBadge.emoji} Badge Mila: {newBadge.name}! 🎉
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1.5">
                <WakeWordIndicator active={wakeWordOn} wakeDetected={wakeDetected}/>
                <p className="text-[10px] text-slate-600">{phase||(listening?'🎤 Sun raha hoon...':speaking?'🔊 Bol raha hoon...':`${showM.label} · ready`)}</p>
              </div>
              {convMode !== 'casual' && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-medium capitalize">{convMode}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={()=>{stopCurrentAudio();setSpeaking(false);setVoiceOn(v=>!v);}}
            className={`p-2 rounded-xl transition-colors ${voiceOn||speaking?'text-blue-400 bg-blue-500/10':'text-slate-700 hover:text-slate-400'}`}>
            {voiceOn||speaking?<Volume2 size={16}/>:<VolumeX size={16}/>}
          </button>
          <button onClick={()=>setSearchOpen(true)} className="p-2 rounded-xl text-slate-700 hover:text-slate-400 transition-colors"><Search size={16}/></button>
          <button onClick={()=>setPinsOpen(true)}
            className={`p-2 rounded-xl transition-colors text-sm ${pinnedMsgs.length>0?'text-yellow-500':'text-slate-700 hover:text-yellow-400'}`}
            title="Pinned messages">
            📌{pinnedMsgs.length>0&&<span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-yellow-500 rounded-full text-[8px] text-black font-bold flex items-center justify-center">{pinnedMsgs.length}</span>}
          </button>
          {/* Wake Word toggle */}
          <button onClick={() => setWakeWordOn(w => !w)}
            title={wakeWordOn ? 'Wake Word ON — "Hey JARVIS"' : 'Wake Word OFF'}
            className={`p-2 rounded-xl transition-all text-sm ${wakeWordOn ? 'text-blue-400 bg-blue-500/15' : 'text-slate-700 hover:text-slate-400'}`}>
            {wakeWordOn ? (wakeDetected ? '🎤' : '👂') : '🔇'}
          </button>
          <button onClick={()=>{
            const ts=['dark','amoled','soft'];
            const nt=ts[(ts.indexOf(theme)+1)%ts.length];
            setTheme(nt); localStorage.setItem('jarvis_theme',nt);
            const bgs={'dark':'#050810','amoled':'#000000','soft':'#1a1a2e'};
            document.body.style.background=bgs[nt];
          }} title={`Theme: ${theme==='dark'?'Dark Blue':theme==='amoled'?'AMOLED Black':'Soft Dark'}`}
            className="p-2 rounded-xl text-slate-700 hover:text-purple-400 transition-colors text-sm">
            {theme==='dark'?'🔵':theme==='amoled'?'⚫':'🌫'}
          </button>
          <button onClick={()=>{setMsgs([]);setConvId(null);setTitleGenerated(false);}} className="p-2 rounded-xl text-slate-700 hover:text-slate-400 transition-colors"><Plus size={16}/></button>
          <button onClick={logout} title="Logout" className="p-2 rounded-xl text-slate-700 hover:text-red-400 transition-colors lg:hidden"><LogOut size={15}/></button>
        </div>
      </div>

      {/* Mode Bar — compact scrollable strip (no height waste) */}
      <div className="px-3 py-1 flex gap-1 overflow-x-auto shrink-0 no-scrollbar">
        {MODES.map(m=>(
          <button key={m.id} onClick={()=>setMode(m.id)}
            className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${mode===m.id?m.bg+' '+m.text+' border-current/30':'bg-transparent border-transparent text-slate-700 hover:text-slate-500'}`}>
            {m.label}
            {mode==='auto'&&detected===m.id&&m.id!=='auto'&&<span className="inline-block w-1 h-1 rounded-full bg-current animate-pulse ml-1"/>}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 no-scrollbar jarvis-scroll">
        {isEmpty ? (
          <div className="flex flex-col items-center gap-4 pt-6 pb-2">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-blue-500/15 animate-ping opacity-40"/>
              <div className={`w-[72px] h-[72px] rounded-full flex items-center justify-center orb-pulse transition-all duration-500 ${
                mode==='think' ? 'bg-gradient-to-br from-purple-600 via-purple-500 to-pink-400 shadow-[0_0_50px_rgba(147,51,234,0.5)]' :
                mode==='flash' ? 'bg-gradient-to-br from-yellow-500 via-orange-500 to-yellow-400 shadow-[0_0_50px_rgba(234,179,8,0.5)]' :
                mode==='deep'  ? 'bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-400 shadow-[0_0_50px_rgba(29,78,216,0.5)]' :
                'bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 shadow-[0_0_50px_rgba(26,86,219,0.5)]'
              }`}>
                <span className="text-white font-black text-2xl">J</span>
              </div>
            </div>
            <FestivalBanner />
            <DynamicGreeting/>
            {/* Proactive Alerts */}
            {proAlerts.map((alert, i) => (
              <div key={i} className="w-full max-w-[300px] bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-2 flex items-center gap-2">
                <span>{alert.icon}</span>
                <p className="text-xs text-orange-300 flex-1">{alert.message}</p>
              </div>
            ))}
            {/* Smart time-based suggestions */}
            <div className="grid grid-cols-2 gap-2 w-full max-w-[300px]">
              {(timeCtx?.suggestions || QUICK.map(q=>({icon:q.i, text:q.t, cmd:q.t}))).map((q,i)=>(
                <button key={i} onClick={()=>send(q.cmd||q.t)}
                  className="text-left glass-card px-3 py-2.5 hover:border-blue-500/25 hover:bg-blue-500/5 transition-all text-xs text-slate-400 hover:text-slate-200 rounded-xl">
                  <span className="text-base mr-1.5">{q.icon}</span>{q.text}
                </button>
              ))}
            </div>
            {/* Frequent commands */}
            {freqCmds.length > 0 && (
              <div className="w-full max-w-[300px]">
                <p className="text-[10px] text-slate-700 mb-1.5 text-center">⚡ Frequent commands</p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {freqCmds.map((f, i) => (
                    <button key={i} onClick={()=>send(f.cmd)}
                      className="text-[11px] text-slate-500 border border-white/5 bg-white/[0.03] rounded-full px-2.5 py-1 hover:text-slate-300 hover:border-white/10 transition-all">
                      {f.text.slice(0, 24)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {msgs.map(m=>(
              m.streaming&&m.content===''
                ? <TypingDots key={m.id} mode={m.mode}/>
                : <div key={m.id} ref={el=>msgRefs.current[m.id]=el}><Bubble msg={m} onSpeak={speak} voiceOn={voiceOn} onFollowUp={t=>send(t)}/></div>
            ))}
            {loading&&<TypingDots mode={mode==='auto'?(detected||'flash'):mode}/>}
            {/* Workflow Progress */}
            {activeWorkflow && (
              <WorkflowProgress
                workflow={activeWorkflow}
                stepStatuses={stepStatuses}
                isComplete={workflowDone}
                finalResult={workflowResult}
                onDismiss={() => { setActiveWorkflow(null); setStepStatuses({}); }}
              />
            )}
            {/* Error recovery */}
            {msgError && !loading && (
              <div className="px-2 pb-2">
                <ErrorSuggestions error={msgError} onAction={handleErrorAction} originalMsg={lastUserMsg}/>
              </div>
            )}
          </>
        )}
        <div ref={endRef}/>
      </div>

      {/* Image preview */}
      {preview && (
        <div className="px-3 py-2 border-t border-white/[0.06] flex items-center gap-3 shrink-0">
          <img src={preview} alt="" className="h-10 w-10 rounded-lg object-cover border border-white/10"/>
          <span className="text-xs text-slate-500 flex-1">Image attached</span>
          <button onClick={()=>{setPreview(null);setImgB64(null);}}><X size={14} className="text-slate-600"/></button>
        </div>
      )}

      {/* Scroll to bottom FAB */}
      {showScrollBtn && (
        <button
          onClick={() => endRef.current?.scrollIntoView({behavior:'smooth'})}
          className="absolute right-4 bottom-20 z-20 w-8 h-8 rounded-full bg-blue-600/90 flex items-center justify-center shadow-lg hover:bg-blue-500 transition-all border border-blue-400/30"
        >
          <ChevronDown size={16} className="text-white"/>
        </button>
      )}
      {/* Input */}
      <div className="px-3 pt-2 pb-2 border-t border-white/[0.06] shrink-0 safe-bottom">
        <div className="flex items-end gap-2">
          <div className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-[22px] flex items-end px-4 py-2.5 gap-2 focus-within:border-blue-500/35 transition-colors">
            <textarea ref={taRef} value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}}
              placeholder={`${showM.label} — kuch bhi likho...`}
              rows={1} style={{resize:'none',minHeight:'22px',maxHeight:'88px',overflowY:'auto'}}
              className="flex-1 bg-transparent text-white text-sm placeholder-slate-700 outline-none leading-relaxed"/>
          </div>
          {/* Export chat button */}
          {msgs.length > 2 && (
            <button onClick={exportChat} title="Chat export karo (Ctrl+E)"
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-white/[0.05] border border-white/[0.08] text-slate-600 hover:text-green-400 transition-all">
              <Download size={14}/>
            </button>
          )}
          <button onClick={startCamera} className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${preview?'bg-green-600':'bg-white/[0.05] border border-white/[0.08] text-slate-600 hover:text-slate-300'}`}>
            <Camera size={15} className={preview?'text-white':''}/>
          </button>
          <button onClick={startVoice} className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${listening?'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]':'bg-white/[0.05] border border-white/[0.08] text-slate-600 hover:text-slate-300'}`}>
            {listening?<MicOff size={15} className="text-white"/>:<Mic size={15}/>}
          </button>
          <button onClick={()=>send()} disabled={(!input.trim()&&!preview)||loading}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center shadow-[0_0_18px_rgba(59,130,246,0.4)] disabled:opacity-25 disabled:shadow-none transition-all shrink-0">
            <Send size={14} className="text-white"/>
          </button>
        </div>
      </div>
    </div>
  );
}
