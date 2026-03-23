'use client';
export const dynamic = 'force-dynamic';
import { startAriaAutoMessages, updateLastActivity } from '@/lib/aria-auto-msg';
import { WeatherWidget, TimerWidget, CalculatorWidget, DashboardWidget, PriceWidget, ReminderWidget, detectWidget, parseTimerSeconds } from '@/components/chat/InlineWidgets';
import Sounds from '@/lib/sound/sounds';
import Link from 'next/link';
import WallpaperPicker, { ChatBackground } from '@/components/chat/WallpaperPicker';
import InfoBar from '@/components/chat/InfoBar';
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
import SmartNotifications from '@/components/pwa/SmartNotifications';
import ScreenOCR from '@/components/chat/ScreenOCR';
import { puterFallbackChat, puterStream, puterSearchChat, puterGenerateImage, puterAnalyzeImage, backupChatToPuter, puterSet, puterGet, PUTER_MODELS } from '@/lib/ai/puter-client';
import { useMultiDeviceSync, RemoteTypingIndicator } from '@/lib/sync/multi-device';
import { detectTaskerCommand } from '@/lib/automation/tasker-bridge';
import { parseCommand, executeCommand, CMD_HELP, QUICK_COMMANDS } from '@/lib/commands/chat-engine';
import { detectWorkflow, generateAIPlan, executeWorkflow } from '@/lib/ai/task-planner';
import { handleClientCommand } from '@/lib/automation/deep-links';
import { getTimeContext, trackUsage, getFrequentCommands, getProactiveAlerts } from '@/lib/ai/smart-context';

const PERSONALITY_LABELS = {
  normal:       '🤖 JARVIS',
  motivational: '💪 Coach',
  fun:          '😄 Fun',
  sarcastic:    '😏 Sarcastic',
  coach:        '🎯 Coach',
  roast:        '🔥 Roast',
  study:        '📚 Study',
  executive:    '💼 Executive',
  girlfriend:   '💕 ARIA',
};

// ─── Constants ────────────────────────────────────────────────
const MODES = [
  { id:'auto',  label:'🤖 Auto',  bg:'bg-cyan-500/15 border-cyan-500/40',    text:'text-cyan-400'   },
  { id:'flash', label:'⚡ Flash', bg:'bg-yellow-500/15 border-yellow-500/40', text:'text-yellow-400' },
  { id:'think', label:'🧠 Think', bg:'bg-purple-500/15 border-purple-500/40', text:'text-purple-400' },
  { id:'deep',  label:'🔬 Deep',  bg:'bg-blue-500/15 border-blue-500/40',    text:'text-blue-400'   },
];

// JARVIS Quick Commands — chat se directly karo
const JARVIS_QUICK_CMDS = [
  { emoji:'📸', label:'Instagram', cmd:'Instagram kholo' },
  { emoji:'💬', label:'WhatsApp',  cmd:'WhatsApp kholo' },
  { emoji:'▶️', label:'YouTube',  cmd:'YouTube kholo' },
  { emoji:'🎵', label:'Spotify',   cmd:'Spotify kholo' },
  { emoji:'🟢', label:'Green',     cmd:'Theme green karo' },
  { emoji:'⚫', label:'AMOLED',    cmd:'Theme AMOLED karo' },
  { emoji:'📋', label:'Routine',   cmd:'Mera daily routine dikhao' },
  { emoji:'🔦', label:'Torch',     cmd:'Torch on karo' },
  { emoji:'📚', label:'Study',     cmd:'Study mode on karo' },
  { emoji:'🔍', label:'Help',      cmd:'commands dikhao' },
];

// Time-aware quick starters — evaluated at render time
function getQuickStarters(personality) {
  const h = new Date().getHours();

  // ARIA girlfriend mode — different starters
  if (personality === 'girlfriend') {
    if (h < 6)  return [
      { t:'Neend nahi aa rahi...',           i:'🌙' },
      { t:'Kuch baat karo na',               i:'💬' },
      { t:'Aaj ka din kaisa tha?',           i:'☺️' },
      { t:'Koi story sunao',                 i:'📖' },
    ];
    if (h < 12) return [
      { t:'Good morning! 🌅',               i:'☀️' },
      { t:'Chai piya kya?',                  i:'☕' },
      { t:'Aaj kya plan hai?',              i:'🗓️' },
      { t:'Kuch interesting batao',          i:'💡' },
    ];
    if (h < 17) return [
      { t:'Kya kar rahe ho?',               i:'👀' },
      { t:'Bore ho raha hoon yaar',         i:'😴' },
      { t:'Koi mast baat batao',            i:'😄' },
      { t:'Miss kar raha tha',              i:'🥺' },
    ];
    return [
      { t:'Din kaisa tha?',                 i:'🌆' },
      { t:'Kuch baat karni thi...',         i:'💭' },
      { t:'Kal ke plans kya hain?',         i:'🗓️' },
      { t:'Koi kahani sunao',               i:'📖' },
    ];
  }

  // Study starters
  if (h < 6)  return [
    { t:'Nind nahi aa rahi, kya karu?',    i:'🌙' },
    { t:'Raat ko productive kaise rahun?', i:'⚡' },
    { t:'Kya yaad hai mujhse?',            i:'🧠' },
    { t:'Ek dark joke sunao yaar',         i:'😈' },
  ];
  if (h < 12) return [
    { t:'Aaj ka plan banao',      i:'📋' },
    { t:'Morning motivation chahiye',      i:'🔥' },
    
    { t:'Aaj ka mausam kaisa hai?',        i:'🌤️' },
    { t:'Kuch interesting batao', i:'🧠' },
  ];
  if (h < 17) return [
    { t:'Focus nahi ho raha',              i:'😵' },
    { t:'Quick calculation karo', i:'🧮' },
    { t:'Kuch naya seekhna hai',  i:'💡' },
    { t:'Thoda entertain karo',            i:'😄' },
  ];
  if (h < 21) return [
    { t:'Aaj ka review karo',     i:'📖' },
    { t:'Kal ke liye plan banao',          i:'🎯' },
    { t:'Aaj ka din kaisa raha?',          i:'📊' },
    { t:'Stress hai, baat karni hai',      i:'💙' },
  ];
  return [
    { t:'Goals check karo',       i:'🎯' },
    { t:'Kal ke liye goal set karo',       i:'🎯' },
    { t:'Neend se pehle motivation',       i:'✨' },
    { t:'Din review karo mera',            i:'🌙' },
  ];
}

// ─── Helpers ──────────────────────────────────────────────────
function detectMode(msg) {
  const m = msg.toLowerCase(), w = m.split(/\s+/).length;
  if (w <= 4 || /^(hi|hello|ok|haan|thanks|bye|namaste|kya hal)[\s!?.]*$/i.test(m)) return 'flash';
  if (/\b(why|kyu|explain|code|math|solve|debug|compare|logic|reason)\b/.test(m)) return 'think';
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
            <pre className="p-3 bg-black/50 border border-white/10 text-green-300 text-[11px] font-mono overflow-x-auto whitespace-pre rounded-xl leading-relaxed">{code}</pre>
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

function Bubble({ msg, onSpeak, voiceOn, onFollowUp, pinnedIds, setPinnedIds, setPinnedMsgs, msgs, exportChat, titleGenerated, setTitleGenerated, convId, reactions, setReactions, lastUserMsg, profilePersonality }) {
  const isUser = msg.role === 'user';
  const [showC, setShowC] = useState(false);
  const [compressed, setCompressed] = useState(null);
  const [compressing, setCompressing] = useState(false);
  const [feedback, setFeedback] = useState(null); // null | 'up' | 'down'
  const [showActions, setShowActions] = useState(false); // tap to show
  const text = compressed || msg.content;





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
        body: JSON.stringify({
          action: 'feedback',
          messageId: msg.id,
          rating,
          content: msg.content,
          botReply: msg.content,     // for self-learning
          userMessage: lastUserMsg,  // for self-learning
        }) });
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
    <div className={`flex ${isUser?'justify-end':'justify-start'} mb-1 px-0.5 msg-in`}>
      {!isUser && (
        <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 mt-0.5 shrink-0 ${
          profilePersonality === 'girlfriend'
            ? 'bg-gradient-to-br from-pink-500 to-rose-400'
            : 'bg-gradient-to-br from-blue-600 to-cyan-500'
        }`}>
          <span className="text-white font-black text-[10px]">{profilePersonality === 'girlfriend' ? 'A' : 'J'}</span>
        </div>
      )}
      <div className={`max-w-[86%] flex flex-col ${isUser?'items-end':'items-start'} gap-0.5`}>
        {msg.cameraPreview && <img src={msg.cameraPreview} alt="" className="rounded-2xl max-w-[110px] border border-white/10 mb-1"/>}
        {msg.imageUrl && <div className="rounded-2xl overflow-hidden border border-white/10 mb-1 shadow-xl"><img src={msg.imageUrl} alt="" className="w-full max-w-[260px]"/></div>}
        {!isUser && <ThinkBubble tokens={msg.thinking}/>}

        <div onClick={()=>setShowActions(v=>!v)} className={`px-3 py-2 text-[13px] leading-snug cursor-pointer select-none ${
          isUser
            ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white font-medium rounded-[20px_20px_5px_20px] shadow-[0_4px_20px_rgba(59,130,246,0.22)]'
            : profilePersonality === 'girlfriend'
              ? 'bg-rose-950/40 border border-rose-500/15 text-slate-100 rounded-[20px_20px_20px_5px]'
              : 'bg-white/[0.06] border border-white/[0.08] text-slate-100 rounded-[20px_20px_20px_5px]'
        }`}>
          {compressing
            ? <span className="text-slate-400 text-xs animate-pulse">Compress ho raha hai...</span>
            : isUser ? text
            : <><MdContent text={text}/>{msg.streaming && <span className="inline-block w-0.5 h-4 bg-blue-400 ml-0.5 animate-pulse align-middle"/>}</>
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
        {showActions && <div className="flex gap-1 items-center px-0.5 overflow-x-auto no-scrollbar animate-in fade-in duration-150">

          {!isUser && !msg.streaming && (
            <>
              <CopyButton text={msg.content}/>


              {!isUser && (
                <div className="flex items-center gap-0.5">
                  <button onClick={()=>sendFeedback('up')} title="Helpful"
                    className={`text-[11px] transition-colors ${feedback==='up'?'text-green-400':'text-slate-700'}`}>👍</button>
                  <button onClick={()=>sendFeedback('down')} title="Not helpful"
                    className={`text-[11px] transition-colors ${feedback==='down'?'text-red-400':'text-slate-700'}`}>👎</button>

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
          {msg.modelUsed && !isUser && (msg.modelUsed === 'offline' || msg.modelUsed === 'keyword-fallback') && (
            <span className="text-[9px] text-orange-400/80 border border-orange-500/20 bg-orange-500/5 px-1.5 py-0 rounded-full shrink-0">⚠️ offline</span>
          )}
          <span className="text-[9px] text-slate-700 shrink-0 flex items-center gap-0.5">
            {new Date(msg.ts||Date.now()).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
            {msg.role==='user' && <span className="text-blue-400/60 text-[10px]">✓</span>}
          </span>
        </div>}

        {/* Inline Widget — renders inside message */}
        {!isUser && !msg.streaming && msg.widget && (
          <div className="w-full max-w-[360px] mt-1">
            {msg.widget === 'weather' && <WeatherWidget city={msg.widgetData?.city} lat={msg.widgetData?.lat} lng={msg.widgetData?.lng}/>}
            {msg.widget === 'timer' && <TimerWidget seconds={msg.widgetData?.seconds || 60} label={msg.widgetData?.label}/>}
            {msg.widget === 'calculator' && <CalculatorWidget/>}
            {msg.widget === 'dashboard' && <DashboardWidget/>}
            {msg.widget === 'price' && <PriceWidget items={msg.widgetData?.items || ['gold','bitcoin']}/>}
            {msg.widget === 'reminder' && <ReminderWidget/>}
          </div>
        )}

        {/* Emoji Reactions */}
        {!isUser && !msg.streaming && (
          <MessageReactions messageId={msg.id} onReact={(id, emoji) => {
            setReactions(p => ({ ...p, [id]: emoji }));
          }} currentReaction={reactions[msg.id]}/>
        )}

        {/* Follow-up chips — tiny horizontal scroll */}
        {!isUser && !msg.streaming && msg.followUps?.length > 0 && (
          <div className="flex gap-1 mt-0.5 overflow-x-scroll no-scrollbar" style={{maxWidth:"90%",flexWrap:"nowrap"}}>
            {msg.followUps.slice(0,3).map(q=>(
              <button key={q} onClick={()=>onFollowUp(q)}
                style={{flexShrink:0,whiteSpace:"nowrap"}}
                className="text-[9px] text-slate-500 border border-white/8 px-1.5 py-0.5 rounded-md transition-all active:bg-white/5">
                {q.length > 20 ? q.slice(0,18)+'…' : q}
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
      <div className="fixed right-0 top-0 bottom-0 z-50 w-72 bg-[#080c14] border-l border-white/[0.06] flex flex-col">
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
        <div className="p-3 border-t border-white/[0.06] space-y-2">
          {/* Quick Nav */}
          <div className="grid grid-cols-3 gap-1.5 mb-2">
            {[
              { href:'/phone',    icon:'📱', label:'Phone'   },
              { href:'/studio',   icon:'🎨', label:'Studio'  },
              { href:'/goals',    icon:'🎯', label:'Goals'   },
              { href:'/analytics',icon:'📊', label:'Stats'   },
              { href:'/memory',   icon:'🧠', label:'Memory'  },
              { href:'/settings', icon:'⚙️', label:'Settings'},
            ].map(({href,icon,label})=>(
              <a key={href} href={href} onClick={onClose}
                className="flex flex-col items-center gap-0.5 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] transition-colors active:scale-95">
                <span className="text-base">{icon}</span>
                <span className="text-[9px] text-slate-500">{label}</span>
              </a>
            ))}
          </div>
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
// ── Live Clock Component ─────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState('');
  const [ampm, setAmpm] = useState('');
  const [date, setDate] = useState('');
  useEffect(() => {
    function update() {
      const now = new Date(new Date().toLocaleString('en-US', {timeZone:'Asia/Kolkata'}));
      const h = now.getHours(), m = now.getMinutes();
      const h12 = h % 12 || 12;
      setTime(String(h12).padStart(2,'0') + ':' + String(m).padStart(2,'0'));
      setAmpm(h >= 12 ? 'pm' : 'am');
      setDate(new Date().toLocaleDateString('hi-IN', {timeZone:'Asia/Kolkata', weekday:'short', day:'numeric', month:'long'}));
    }
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-col items-center">
      <div className="text-[64px] font-black text-white tracking-tight leading-none tabular-nums">
        {time}<span className="text-2xl font-light text-white/40 ml-2">{ampm}</span>
      </div>
      <p className="text-slate-500 text-sm mt-0.5">{date}</p>
    </div>
  );
}

export default function ChatPage() {
  // Export chat as .txt file
  function exportChat() {
    if (!msgs.length) return;
    const lines = msgs.map(m => {
      const who  = m.role==='user' ? '👤 Tum' : '🤖 JARVIS';
      const time = new Date(m.ts||Date.now()).toLocaleTimeString('hi-IN',{hour:'2-digit',minute:'2-digit'});
      return `[${time}] ${who}:\n${m.content}\n`;
    });
    const text = ['JARVIS Chat — ' + new Date().toLocaleDateString('hi-IN'), '─'.repeat(40), '', ...lines].join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `jarvis-chat-${Date.now()}.txt`;
    a.click(); URL.revokeObjectURL(url);
  }

  // Logout
  async function logout() {
    try {
      // No Supabase — clear session cookies and reload app
      document.cookie = 'jarvis_token=; path=/; max-age=0';
      document.cookie = 'jarvis_uid=; path=/; max-age=0';
    } catch {}
    window.location.href = '/';
  }

  const [msgs, setMsgs]         = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [mode, setMode]         = useState(() => {
    try { return localStorage.getItem('jarvis_mode') || 'auto'; } catch { return 'auto'; }
  });
  const [detected, setDetected] = useState(null);
  // Profile — name + personality for header display
  const [profileName, setProfileName]           = useState('');
  const [profilePersonality, setProfilePersonality] = useState('normal');
  const [voiceOn, setVoiceOn]   = useState(false);
  const [convMode, setConvMode] = useState('casual');
  const [newBadge, setNewBadge] = useState(null);   // {emoji, name} for toast
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening]= useState(false);
  const [preview, setPreview]   = useState(null);
  const [imgB64, setImgB64]     = useState(null);
  const [pdfText, setPdfText]   = useState(null); // extracted PDF text
  const [pdfName, setPdfName]   = useState('');   // PDF filename
  const [cameraOn, setCameraOn] = useState(false);
  const [convId, setConvId]     = useState(null);
  const [convs, setConvs]       = useState([]);  // conversation list
  const [phase, setPhase]       = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeWidget, setActiveWidget] = useState(null); // {type, data}
  const [plusOpen, setPlusOpen]       = useState(false);
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
  // ── Screen OCR ────────────────────────────────────────────────
  const [ocrOpen, setOcrOpen]               = useState(false);
  // ── Remote typing (multi-device) ─────────────────────────────
  const [remoteTyping, setRemoteTyping]     = useState(false);
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
    // Load profile for header display
    try {
      const p = JSON.parse(localStorage.getItem('jarvis_profile') || '{}');
      if (p.name) setProfileName(p.name);
      if (p.personality) setProfilePersonality(p.personality);
      // Also check standalone personality key
      const standaloneP = localStorage.getItem('jarvis_personality');
      if (standaloneP && !p.personality) setProfilePersonality(standaloneP);
    } catch {}
    // Handle Web Share Target — koi content share kiya toh auto-send
    try {
      const url = new URL(window.location.href);
      const shared = url.searchParams.get('shared');
      if (shared) {
        const decoded = decodeURIComponent(shared);
        setInput(decoded);
        // Clear URL without reload
        window.history.replaceState({}, '', '/chat');
      }
    } catch {}

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

  // Get userId safely — from cookie or guest fallback
  const userId = (() => {
    if (typeof document === 'undefined') return null;
    const uidCookie = document.cookie.split(';').find(c => c.trim().startsWith('jarvis_uid='));
    return uidCookie ? uidCookie.split('=')[1]?.trim() : 'guest_local';
  })();

  // Multi-device sync — safe, works without Supabase
  const { broadcastMessage, broadcastTyping } = useMultiDeviceSync({
    userId: userId,
    conversationId: convId,
    onNewMessage: (msg) => {
      if (msg?.role === 'assistant') {
        setMsgs(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, { ...msg, fromRemote: true }]);
      }
    },
    onRemoteTyping: (isTyping) => setRemoteTyping(isTyping),
    enabled: true,
  });

  // Smart context — time/device aware
  useEffect(() => {
    setTimeCtx(getTimeContext());
    setFreqCmds(getFrequentCommands(4));
    getProactiveAlerts().then(setProAlerts).catch(()=>{});

    // Listen for theme changes from Settings page
    const onTheme = (e) => {
      const {bg, accent} = e.detail || {};
      if (bg) document.body.style.background = bg;
      if (bg) document.documentElement.style.setProperty('--bg', bg);
      if (accent) document.documentElement.style.setProperty('--accent', accent);
    };
    window.addEventListener('jarvis-theme-change', onTheme);

    // Apply saved theme on mount
    const savedTheme = localStorage.getItem('jarvis_theme') || 'dark';
    const THEMES = {'dark': {'bg': '#050810', 'accent': '#1A56DB'}, 'amoled': {'bg': '#000000', 'accent': '#3b82f6'}, 'soft': {'bg': '#1a1a2e', 'accent': '#6366f1'}, 'green': {'bg': '#020d05', 'accent': '#00cc44'}, 'purple': {'bg': '#0a0010', 'accent': '#9333ea'}, 'sunset': {'bg': '#0f0a00', 'accent': '#f97316'}, 'ocean': {'bg': '#00080f', 'accent': '#0ea5e9'}, 'rose': {'bg': '#0f0008', 'accent': '#f43f5e'}, 'gold': {'bg': '#0a0800', 'accent': '#eab308'}};
    const t = THEMES[savedTheme] || THEMES['dark'];
    document.body.style.background = t.bg;
    document.documentElement.style.setProperty('--bg', t.bg);
    document.documentElement.style.setProperty('--accent', t.accent);

    // Apply saved text style on mount
    const savedStyle = localStorage.getItem('jarvis_text_style');
    if (savedStyle && savedStyle !== 'default') {
      const fonts = {mono:'monospace', serif:'Georgia, serif', system:'system-ui'};
      if (fonts[savedStyle]) document.documentElement.style.fontFamily = fonts[savedStyle];
    }

    // ARIA auto messages
    startAriaAutoMessages((ariaMsg) => {
      const autoMsg = {id:`aria_auto_${Date.now()}`,role:'assistant',content:ariaMsg,streaming:false,ts:Date.now(),mode:'flash',modelUsed:'💕 ARIA'};
      setMsgs(p => [...p, autoMsg]);
    });

    // Pre-fetch location on mount + reverse geocode to city name
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (p) => {
          const lat = p.coords.latitude.toFixed(4);
          const lng = p.coords.longitude.toFixed(4);
          let city = '';
          try {
            const r = await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lng}&count=1&language=en`);
            const d = await r.json();
            city = d.results?.[0]?.name || d.results?.[0]?.admin2 || '';
          } catch {}
          const loc = {lat, lng, city, ts: Date.now()};
          try {
            localStorage.setItem('jarvis_user_location', JSON.stringify(loc));
            // Also save city in profile for AI to use
            if (city) {
              const profile = JSON.parse(localStorage.getItem('jarvis_profile') || '{}');
              if (!profile.city) {
                profile.city = city;
                localStorage.setItem('jarvis_profile', JSON.stringify(profile));
              }
            }
          } catch {}
        },
        (err) => {
          // Permission denied — save a flag so we know
          try { localStorage.setItem('jarvis_location_denied', 'true'); } catch {}
        },
        {timeout:8000, maximumAge:300000, enableHighAccuracy:false}
      );
    }

    // Setup notifications + periodic sync
    (async () => {
      try {
        if ('serviceWorker' in navigator && 'Notification' in window) {
          const perm = await Notification.requestPermission();
          if (perm === 'granted' && navigator.serviceWorker.controller) {
            // Register periodic sync for study reminders
            const reg = await navigator.serviceWorker.ready;
            if ('periodicSync' in reg) {
              await reg.periodicSync.register('jarvis-study-check',   { minInterval: 10 * 60 * 1000 });
              await reg.periodicSync.register('jarvis-daily-brief',   { minInterval: 60 * 60 * 1000 });
              await reg.periodicSync.register('jarvis-motivational',  { minInterval: 2 * 60 * 60 * 1000 });
            }
          }
        }
      } catch {}
    })();
  }, []);

  // ── Header Battery ────────────────────────────────────────────
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.getBattery) return;
    navigator.getBattery().then(b => {
      setHeaderBattery({ level: Math.round(b.level * 100), charging: b.charging });
      b.addEventListener('levelchange', () => setHeaderBattery({ level: Math.round(b.level * 100), charging: b.charging }));
      b.addEventListener('chargingchange', () => setHeaderBattery({ level: Math.round(b.level * 100), charging: b.charging }));
    }).catch(() => {});
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

  // Pull-to-refresh + Swipe gestures (mobile)
  useEffect(() => {
    let startX = 0, startY = 0;
    const el = document.querySelector('.jarvis-scroll');
    if (!el) return;
    const onTouchStart = (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const onTouchEnd = (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      const absDx = Math.abs(dx), absDy = Math.abs(dy);

      // Pull-to-refresh (swipe down)
      if (dy > 80 && absDy > absDx && el.scrollTop === 0 && !refreshing) {
        setRefreshing(true);
        navigator.vibrate?.(50);
        setTimeout(() => setRefreshing(false), 1200);
        return;
      }

      // Swipe right → History sidebar
      if (dx > 70 && absDx > absDy * 1.5 && startX < 40) {
        setHistoryOpen(true);
        navigator.vibrate?.(30);
        return;
      }

      // Swipe left → New chat (only from right edge)
      if (dx < -70 && absDx > absDy * 1.5 && startX > window.innerWidth - 40) {
        setMsgs([]); setConvId(null); setTitleGenerated(false);
        navigator.vibrate?.(30);
        return;
      }
    };
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [msgs, refreshing]);

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
      const r = new SR();
      r.lang = (() => { try { const l=localStorage.getItem('jarvis_language'); return l==='hindi'?'hi-IN':l==='english'?'en-US':'hi-IN'; } catch { return 'hi-IN'; } })();
      r.interimResults = true;
      r.continuous = false;
      srRef.current = r;
      r.onstart = () => setListening(true);
      r.onresult = e => {
        const transcript = Array.from(e.results).map(r=>r[0].transcript).join('');
        setInput(transcript);
        navigator.vibrate?.(10);
        // Auto-send if final result (sentence ended)
        if (e.results[e.results.length-1].isFinal && transcript.length > 3) {
          navigator.vibrate?.([30,20,30]);
          setTimeout(() => { send(transcript); setInput(''); }, 300);
        }
      };
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
  function generateFollowUps(reply, question) {
    // Local generation — no API call (prevents system prompt leaking in chat)
    const q = (question || '').toLowerCase();
    const r = (reply || '').toLowerCase();
    if (/weather|mausam|temp|barish|rain/.test(q+r))
      return ['7-day forecast batao', 'Kal ka weather?', 'Rain aayegi kya?'];
    if (/news|khabar|headline|india|world/.test(q+r))
      return ['Aur news batao', 'India mein kya hua?', 'Global updates?'];
    if (/time|samay|baje|kitne/.test(q+r))
      return ['Aaj ka schedule?', 'Timer set karo', 'Reminder laga do'];
    if (/location|kahan|city|jagah|ghar/.test(q+r))
      return ['Nearby places?', 'Weather yahan ka?', 'Maps kholo'];
    if (/study|padhai|exam/.test(q+r))
      return ['Practice questions do', 'Topic explain karo', 'Study plan banao'];
    if (/code|python|javascript|error|bug/.test(q+r))
      return ['Example dikhao', 'Optimize karo', 'Debug karo'];
    if (/instagram|insta|reels|post/.test(q+r))
      return ['Caption ideas do', 'Best posting time?', 'Instagram kholo'];
    if (/recipe|khana|food|cook/.test(q+r))
      return ['Ingredients list?', 'Quick version?', 'Healthy option?'];
    if (/song|music|gaana|playlist/.test(q+r))
      return ['Similar songs?', 'Spotify mein add', 'Artist ke baare mein'];
    if (/goal|plan|future|career/.test(q+r))
      return ['Step by step plan', 'Timeline set karo', 'Progress track karo'];
    // Generic — context aware
    if (reply.length > 200) return ['Summarize karo', 'Key points?', 'Aur detail mein?'];
    return [];
  }


  // ── Visual viewport — keyboard pe input bar upar aaye ──
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const vp = window.visualViewport;
    const onResize = () => {
      const diff = window.innerHeight - vp.height;
      const bar = document.getElementById('chat-input-bar');
      if (bar) bar.style.bottom = diff > 50 ? diff + 'px' : '0px';
    };
    vp.addEventListener('resize', onResize);
    return () => vp.removeEventListener('resize', onResize);
  }, []);

  // ── Main send function (streaming) ───────────────────────────
  // ── Client-side cache ──────────────────────────────────
  const { get: cacheGet, set: cacheSet } = useClientCache();

  // ── Wake Word "Hey JARVIS" ────────────────────────────────────
  const [wakeWordOn, setWakeWordOn] = useState(false);
  const [headerBattery, setHeaderBattery] = useState(null);

  // ── Battery API ──────────────────────────────────────────────
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.getBattery) return;
    navigator.getBattery().then(b => {
      const update = () => setHeaderBattery({ level: Math.round(b.level * 100), charging: b.charging });
      update();
      b.addEventListener('levelchange', update);
      b.addEventListener('chargingchange', update);
      return () => { b.removeEventListener('levelchange', update); b.removeEventListener('chargingchange', update); };
    }).catch(() => {});
  }, []);
  const [moreOpen, setMoreOpen] = useState(false);
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

  // Phone automation — smart: NLP → MacroDroid, deep link fallback
  async function tryAutomation(text) {
    try {
      // Step 1: Try AI NLP command interpretation first
      const deviceId = typeof localStorage !== 'undefined' ? localStorage.getItem('macrodroid_device_id') : null;

      // Step 2: Send to automation with device ID from localStorage
      const r = await fetch('/api/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, deviceId }),
      });
      const d = await r.json();

      if (d.ok) {
        const autoMsg = {
          id: `auto${Date.now()}`, role: 'assistant',
          content: `${d.message} 📱`, ts: Date.now(), mode: 'flash',
        };
        setMsgs(p => [...p, autoMsg]);
        if (typeof navigator !== 'undefined') navigator.vibrate?.(200);
        return true;
      }

      if (d.setup_needed) {
        // Show what JARVIS understood, guide to setup
        const understood = d.understood ? `\n\nMain samajha: "${d.explain || d.understood}" — lekin MacroDroid se connected nahi hoon abhi.` : '';
        const setupMsg = {
          id: `setup${Date.now()}`, role: 'assistant',
          content: `📱 **Phone control ke liye MacroDroid chahiye!**${understood}\n\n→ [Phone Control Setup](/phone) pe jaao — 2 min mein ready.`,
          ts: Date.now(), mode: 'flash',
        };
        setMsgs(p => [...p, setupMsg]);
        return true;
      }
    } catch { }
    return false;
  }

  async function send(text=input, modeOvr=null) {
    const msg=text?.trim(); if((!msg&&!imgB64&&!pdfText)||loading) return;
    setInput(''); navigator.vibrate?.([10]); Sounds.sent();
    // If PDF attached, prepend context to message
    const effectiveMsg = pdfText
      ? `[PDF: ${pdfName}]

${pdfText.slice(0, 6000)}

---
Sawaal: ${msg || 'Is PDF ka summary batao'}`
      : msg;

    // Track usage for smart suggestions
    trackUsage(msg);
    setFreqCmds(getFrequentCommands(4));
    // Track study streak
    if (/study|padhai|revision/i.test(msg)) {
      try {
        const data = JSON.parse(localStorage.getItem('jarvis_study_streak') || '{}');
        const today = new Date().toDateString();
        if (data.lastDate !== today) {
          const yesterday = new Date(Date.now() - 86400000).toDateString();
          data.streak = data.lastDate === yesterday ? (data.streak || 0) + 1 : 1;
          data.lastDate = today;
          localStorage.setItem('jarvis_study_streak', JSON.stringify(data));
        }
      } catch {}
    }

    // ── STEP 0a: App Open (deep links) — runs FIRST ───────────
    // "Instagram", "WhatsApp", "YouTube", "Spotify" etc → opens app
    if (msg) {
      const deepResult = handleClientCommand(msg);
      if (deepResult) {
        const deepMsg = {id:`dl${Date.now()}`,role:'assistant',content:`${deepResult} 📱`,ts:Date.now(),mode:'flash'};
        const userMsg2 = {id:`u${Date.now()}`,role:'user',content:msg,ts:Date.now()};
        setMsgs(p=>[...p,userMsg2,deepMsg]);
        return;
      }
    }

    // ── STEP 0: Chat Command Engine — highest priority ────────
    // Handles: app open, theme change, WhatsApp msg, routine, alarm, search, settings
    if (effectiveMsg && !imgB64) {
      const parsed = parseCommand(msg);
      if (parsed.type !== null) {
        // Show user message first
        const userCmdMsg = { id: `u${Date.now()}`, role: 'user', content: msg, ts: Date.now() };
        setMsgs(p => [...p, userCmdMsg]);

        // Special: "jarvis help" or "commands dikhao"
        if (/^(help|commands|kya kya kar sakta|list commands|chat commands)/i.test(msg.trim())) {
          const helpMsg = { id: `h${Date.now()}`, role: 'assistant', content: CMD_HELP, streaming: false, ts: Date.now(), mode: 'flash' };
          setMsgs(p => [...p, helpMsg]);
          return;
        }

        const result = await executeCommand(parsed, {
          setTheme: (id) => {
            // Try to use ThemeProvider if available
            if (typeof localStorage !== 'undefined') localStorage.setItem('jarvis_theme', id);
            window.dispatchEvent(new CustomEvent('jarvis-theme-change', { detail: { theme: id } }));
            // Apply immediately
            const thBgs = {dark:'#050810',amoled:'#000000',soft:'#1a1a2e',green:'#020d05',purple:'#0a0010',sunset:'#0f0a00',ocean:'#00080f',rose:'#0f0008',gold:'#0a0800'};
            const thAcs = {dark:'#1A56DB',amoled:'#3b82f6',soft:'#6366f1',green:'#00cc44',purple:'#9333ea',sunset:'#f97316',ocean:'#0ea5e9',rose:'#f43f5e',gold:'#eab308'};
            document.documentElement.style.setProperty('--bg', thBgs[id]||'#050810');
            document.documentElement.style.setProperty('--accent', thAcs[id]||'#1A56DB');
            document.body.style.background = thBgs[id]||'#050810';
          },
          navigate: (path) => {
            if (typeof window !== 'undefined') window.location.href = path;
          },
        });

        if (result.handled) {
          const cmdReply = { id: `cmd${Date.now()}`, role: 'assistant', content: result.response, streaming: false, ts: Date.now(), mode: 'flash', modelUsed: '⚡ instant' };
          setMsgs(p => [...p, cmdReply]);
          if (result.response && result.response.length < 200) speak(result.response);
          return;
        }
        if (false) {
          setMsgs(p => [...p, schedMsg]);
          return;
        }
        if (result.type === 'timer' && result.message) {
          const timerMsg = { id: `t${Date.now()}`, role: 'assistant', content: result.message, streaming: false, ts: Date.now(), mode: 'flash', modelUsed: '⏰ timer' };
          setMsgs(p => [...p, timerMsg]);
          return;
        }
        // Not handled by command engine — remove user msg, fall through to AI
        setMsgs(p => p.filter(m => m.id !== userCmdMsg.id));
      }
    }



    // ── INSTANT WIDGET COMMANDS (runs before AI/deeplink) ────
    const instantWidget = detectWidget(msg || '');
    if (instantWidget && ['calculator','dashboard','reminder'].includes(instantWidget)) {
      const userMsg0 = {id:`u${Date.now()}`,role:'user',content:msg,ts:Date.now()};
      const widgetResponses = {
        calculator:    '🧮 Calculator:',
        dashboard:     '📊 Tera dashboard:',
        reminder:      '⏰ Reminder set karo:',
      };
      const aiMsg0 = {id:`w${Date.now()}`,role:'assistant',content:widgetResponses[instantWidget],streaming:false,ts:Date.now(),widget:instantWidget,widgetData:{},modelUsed:'⚡ instant'};
      setMsgs(p=>[...p,userMsg0,aiMsg0]);
      setInput('');
      return;
    }

    // 0. Puter Image Generation — "image banao X"
    if (msg) {
      const imgMatch = msg.match(/^(?:image|photo|picture|tasveer|banao|generate|create).*?(?:banao|of|ka|ki|bana|draw|make)(.+)|^(.+)(?:image|photo|tasveer|picture)\s*(?:banao|bana|generate)$/i);
      const isImgReq = /^(image|photo|tasveer|picture) (?:banao|bana|generate|draw)/i.test(msg) || /(?:banao|bana|generate|draw).*(image|photo|tasveer|picture)/i.test(msg);
      if (isImgReq) {
        const prompt = msg.replace(/image|photo|tasveer|picture|banao|bana|generate|draw|create|make/gi, '').trim();
        if (prompt.length > 2) {
          const userMsg0 = {id:`u${Date.now()}`,role:'user',content:msg,ts:Date.now()};
          const aiId0 = `a${Date.now()}`;
          setMsgs(p=>[...p,userMsg0,{id:aiId0,role:'assistant',content:'🎨 Image generate kar raha hoon Puter AI se...',streaming:true,ts:Date.now()}]);
          puterGenerateImage(prompt).then(imgUrl => {
            if (imgUrl) {
              setMsgs(p=>p.map(m=>m.id===aiId0?{...m,content:`![Generated](${imgUrl})

✅ Image ready! Prompt: "${prompt}"`,streaming:false,modelUsed:'🎨 puter-image'}:m));
            } else {
              setMsgs(p=>p.map(m=>m.id===aiId0?{...m,content:'Image generate nahi ho paya — thodi der baad try karo.',streaming:false}:m));
            }
          }).catch(()=>{});
          return;
        }
      }
    }

    // (deep link check moved above)

    // 2. Try MacroDroid automation
    if (msg) {
      const autoResult = await tryAutomation(msg);
      if (autoResult) return;
    }

    // 3. Puter Web Search — live data for news/current events
    // Fixed: no longer fights with fullText — always wins for live queries
    if (msg) {
      const isSearchQuery = /\b(news|khabar|latest|aaj ka|today|current|price|kitna|rate|weather|mausam|score|result|winner|2024|2025|2026|abhi|live)\b/i.test(msg);
      if (isSearchQuery && !imgB64) {
        // Only run puter search if user has Puter enabled
        const _puterEnabled = typeof localStorage !== 'undefined' && localStorage.getItem('jarvis_puter_enabled') === 'true';
        (_puterEnabled ? puterSearchChat(msg, `Tu JARVIS hai — ${typeof localStorage !== 'undefined' ? (localStorage.getItem('jarvis_ai_name') || 'yaar') : 'yaar'} ka personal AI. Web search results use kar. Hinglish mein concise reply de.`) : Promise.resolve(null)).then(sr => {
          if (sr?.reply) {
            // Always update — puter has live data, overwrite server response
            setMsgs(p => p.map(m => m.id === aiId
              ? { ...m, content: sr.reply, streaming: false, modelUsed: '🔍 live-search' }
              : m));
          }
        }).catch(() => {});
      }
    }

    // 4. Detect workflow (multi-step task)
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
    setPreview(null); setImgB64(null); setPdfText(null); setPdfName(''); setDetected(null);

    setLastUserMsg(msg);
    updateLastActivity();
    setMsgError(null);
    const userMsg = {id:`u${Date.now()}`,role:'user',content:pdfText?`📄 ${pdfName}${msg?' — '+msg:''}`:msg,cameraPreview:prev,ts:Date.now()};
    const aiId    = `a${Date.now()}`;
    // ARIA: human-like delay if girlfriend mode
    const isAriaMode = typeof localStorage !== 'undefined' && localStorage.getItem('jarvis_profile') && JSON.parse(localStorage.getItem('jarvis_profile') || '{}')?.personality === 'girlfriend';
    if (isAriaMode) {
      const delay = 800 + Math.floor(Math.random() * 1800);
      await new Promise(r => setTimeout(r, delay));
    }
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
          await clientSpeak(cached).catch(()=>{});
          return;
        }
      }

      const history = msgs.slice(-12).map(m=>({role:m.role,content:m.content}));
      // Get location from cache (pre-fetched on mount)
      let userLoc = null;
      try {
        const cachedLoc = localStorage.getItem('jarvis_user_location');
        if (cachedLoc) {
          const parsed = JSON.parse(cachedLoc);
          // Use cache up to 30 min
          if (Date.now() - parsed.ts < 30 * 60 * 1000) userLoc = parsed;
        }
      } catch {}
      // If no cache and not denied, try quick fetch
      const locDenied = localStorage.getItem('jarvis_location_denied') === 'true';
      if (!userLoc && !locDenied && navigator.geolocation) {
        try {
          userLoc = await new Promise(res => navigator.geolocation.getCurrentPosition(
            p => res({lat:p.coords.latitude.toFixed(4), lng:p.coords.longitude.toFixed(4)}),
            () => res(null), {timeout:2000, maximumAge:300000}
          ));
        } catch {}
      }
      const res = await fetch('/api/chat/stream',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          message:msg, history, conversationId:convId, imageBase64:b64,
          mode:finalMode, userLocation:userLoc,
          personality:profilePersonality||'normal',
          ariaMemory: profilePersonality==='girlfriend' ? (() => { try { return localStorage.getItem('aria_ultra')||'{}'; } catch { return '{}'; } })() : undefined,
        }),
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
            } else if(d.type==='done'){ Sounds.received();
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
        // Network error → Puter.js FREE AI with STREAMING
        try {
          setMsgs(p=>p.map(m=>m.id===aiId?{...m,content:'⚡ Puter AI loading...',streaming:true}:m));
          const sysP = `Tu JARVIS hai — ${typeof localStorage !== 'undefined' ? (localStorage.getItem('jarvis_ai_name') || 'yaar') : 'yaar'} ka personal AI dost. Hinglish mein reply karo. Concise aur helpful reh.`;

          // Try streaming first (real-time tokens)
          const streamResult = await puterStream(
            msgs.slice(-4).map(m=>({role:m.role,content:m.content})).concat([{role:'user',content:msg}]),
            sysP,
            (token, accumulated) => {
              setMsgs(p=>p.map(m=>m.id===aiId?{...m,content:accumulated,streaming:true}:m));
            }
          );

          if (streamResult) {
            fullText = streamResult.reply;
            setMsgs(p=>p.map(m=>m.id===aiId?{...m,content:streamResult.reply,streaming:false,modelUsed:`🆓 ${streamResult.model}`}:m));
            // Backup to Puter cloud
            backupChatToPuter(convId, [...msgs, userMsg, {role:'assistant',content:streamResult.reply}]).catch(()=>{});
          } else {
            setMsgs(p=>p.map(m=>m.id===aiId?{...m,content:'Network error — retry karo!',streaming:false}:m));
            setMsgError('network');
          }
        } catch {
          setMsgs(p=>p.map(m=>m.id===aiId?{...m,content:'Network error — retry karo!',streaming:false}:m));
          setMsgError('network');
        }
      }
    } finally {
      setPhase('');
      // Detect and attach inline widget to AI response
      const widgetType = detectWidget(msg || '');
      if (widgetType) {
        let widgetData = {};
        if (widgetType === 'weather') {
          const locCache = localStorage.getItem('jarvis_user_location');
          if (locCache) { const l = JSON.parse(locCache); widgetData = {lat:l.lat, lng:l.lng, city:l.city}; }
        }
        if (widgetType === 'timer') {
          widgetData.seconds = parseTimerSeconds(msg || '');
          widgetData.label = msg?.replace(/timer|set|karo|laga|do/gi,'').trim().slice(0,30);
        }
        if (widgetType === 'price') {
          widgetData.items = /bitcoin|crypto/.test((msg||'').toLowerCase()) ? ['bitcoin','ethereum'] : ['gold','silver','bitcoin'];
        }
        setMsgs(p => p.map(m => m.id === aiId ? {...m, widget: widgetType, widgetData} : m));
      }
      if(voiceOn&&fullText) speak(fullText);
      // Save to client cache for repeat queries
      if(fullText && msg.length > 8 && !imgB64) {
        cacheSet(msg, fullText).catch(()=>{});
        // Also save to Puter KV for cross-device / offline access
        // puterSet disabled — auto-triggers Puter popup. Only enable if user opts in.
      }
      // Generate follow-up suggestions after short delay
      if(fullText&&msg.length>8) {
        // Auto-title (first message only)
        if (!titleGenerated && convId) generateTitle(convId, msg, fullText);
        setTimeout(()=>{
          const fups = generateFollowUps(fullText, msg);
          if(fups.length>0) setMsgs(p=>p.map(m=>m.id===aiId?{...m,followUps:fups}:m));
        }, 500);
      }
    }
  }

  const QUICK = getQuickStarters(profilePersonality); // personality-aware
  const [showCmdChips, setShowCmdChips] = useState(false);
  const [showWallpaper, setShowWallpaper]   = useState(false);
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
    <>
    <ChatBackground>
    <div className="h-full flex flex-col overflow-hidden" style={{background:"transparent"}}>

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

      {/* ── Daily Info Bar — Gold/Silver/Weather/Battery ───────── */}

      {/* ── Plus Menu Popup ───────────────────────────────────── */}
      {plusOpen && (
        <div className="fixed inset-0 z-[9980]" onClick={()=>setPlusOpen(false)}>
          <div className="absolute bottom-24 left-3 right-3 bg-[#0e1420] border border-white/[0.09] rounded-3xl overflow-hidden shadow-2xl"
            onClick={e=>e.stopPropagation()}>

            {/* MODE section */}
            <div className="px-4 pt-4 pb-3">
              <p className="text-[10px] text-slate-600 font-semibold tracking-widest uppercase mb-2.5">Mode</p>
              <div className="grid grid-cols-2 gap-2">
                {MODES.filter(m=>m.id!=='auto'?true:true).map(m=>(
                  <button key={m.id} onClick={()=>{setMode(m.id);setPlusOpen(false);}}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl border transition-all active:scale-95 ${
                      mode===m.id
                        ? 'bg-blue-600/20 border-blue-500/40 text-white'
                        : 'bg-white/[0.04] border-white/[0.07] text-slate-400 hover:text-white'
                    }`}>
                      <span className="text-[13px] font-semibold">{m.id.charAt(0).toUpperCase()+m.id.slice(1)}</span>
                    {mode===m.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400"/>}
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-white/[0.06] mx-4"/>

            {/* PERSONALITY section */}
            <div className="px-4 pt-3 pb-3">
              <p className="text-[10px] text-slate-600 font-semibold tracking-widest uppercase mb-2.5">Personality</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  {id:'normal',       emoji:'🤝', label:'Normal'},
                  {id:'girlfriend',   emoji:'💕', label:'ARIA'},
                  {id:'motivational', emoji:'🔥', label:'Hype'},
                  {id:'fun',          emoji:'😄', label:'Fun'},
                  {id:'sarcastic',    emoji:'😏', label:'Roast'},
                  {id:'study',        emoji:'📚', label:'Study'},
                  {id:'coach',        emoji:'🎯', label:'Coach'},
                  {id:'executive',    emoji:'💼', label:'Pro'},
                ].map(p=>(
                  <button key={p.id} onClick={()=>{
                    setProfilePersonality(p.id);
                    try {
                      localStorage.setItem('jarvis_personality', p.id);
                      const prof = JSON.parse(localStorage.getItem('jarvis_profile')||'{}');
                      localStorage.setItem('jarvis_profile', JSON.stringify({...prof, personality: p.id}));
                    } catch {}
                    setPlusOpen(false);
                  }}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-medium transition-all active:scale-95 ${
                      profilePersonality===p.id
                        ? p.id==='girlfriend'
                          ? 'bg-pink-500/20 border-pink-500/40 text-pink-300'
                          : 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                        : 'bg-white/[0.04] border-white/[0.07] text-slate-400 hover:text-white'
                    }`}>
                    <span>{p.emoji}</span><span>{p.label}</span>
                    {profilePersonality===p.id && <span className="text-[8px] ml-0.5">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-white/[0.06] mx-4"/>

            {/* ATTACH section */}
            <div className="px-4 pt-3 pb-4">
              <p className="text-[10px] text-slate-600 font-semibold tracking-widest uppercase mb-2.5">Attach</p>
              <div className="space-y-0.5">
                {[
                  { icon:'📷', label:'Camera',  action: ()=>{ setPlusOpen(false); startCamera(); } },
                  { icon:'🖼️', label:'Image',  action: ()=>{ setPlusOpen(false); document.getElementById('img-upload')?.click(); } },
                  { icon:'📄', label:'PDF',     action: ()=>{ setPlusOpen(false); document.getElementById('pdf-upload')?.click(); } },
                  { icon:'🎙️', label:'Voice Mode',  action: ()=>{ setPlusOpen(false); window.location.href='/voice'; } },
                ].map(item=>(
                  <button key={item.label} onClick={item.action}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.05] active:bg-white/[0.08] transition-all text-left">
                    <span className="text-[22px] w-8 text-center">{item.icon}</span>
                    <span className="text-[14px] text-slate-300 font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* SHORTCUTS section */}
            <div className="border-t border-white/[0.06] mx-4"/>
            <div className="px-4 pt-3 pb-4">
              <p className="text-[10px] text-slate-600 font-semibold tracking-widest uppercase mb-2.5">Shortcuts</p>
              <div className="flex flex-wrap gap-1.5">
                {JARVIS_QUICK_CMDS.slice(0,8).map(q=>(
                  <button key={q.cmd} onClick={()=>{send(q.cmd);setPlusOpen(false);}}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.07] text-white/70 text-[11px] hover:bg-white/[0.09] hover:text-white active:scale-95 transition-all">
                    <span>{q.emoji}</span><span>{q.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Slide-in Nav Menu — Image 3 Style ───────────────────── */}

      {/* Daily Morning Brief */}
      <DailyBrief onBriefMessage={(msg) => {
        const briefMsg = { id: `brief${Date.now()}`, role:'assistant', content: msg, ts: Date.now(), mode:'flash' };
        setMsgs(p => p.length === 0 ? [briefMsg] : p);
      }}/>
      <SmartNotifications/>
      {/* Hidden file inputs */}
      <input id="pdf-upload" type="file" accept=".pdf,application/pdf" className="hidden" onChange={async(e)=>{
        const file = e.target.files?.[0]; if(!file) return;
        setPdfName(file.name);
        try {
          // Load PDF.js from CDN
          if (!window.pdfjsLib) {
            await new Promise((res,rej)=>{
              const s=document.createElement('script');
              s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
              s.onload=res; s.onerror=rej;
              document.head.appendChild(s);
            });
            window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          }
          const arrayBuf = await file.arrayBuffer();
          const pdf = await window.pdfjsLib.getDocument({data:arrayBuf}).promise;
          let text='';
          const maxPages = Math.min(pdf.numPages, 20); // max 20 pages
          for(let i=1;i<=maxPages;i++){
            const page=await pdf.getPage(i);
            const tc=await page.getTextContent();
            text+=tc.items.map(it=>it.str).join(' ')+'\n';
          }
          setPdfText(text.trim()||'[PDF text extract nahi hua — scanned image PDF ho sakta hai]');
          navigator.vibrate?.([30]);
        } catch(err) {
          setPdfText('[PDF read error: '+err.message+']');
        }
        e.target.value='';
      }}/>
      {ocrOpen && (
        <ScreenOCR
          onSendWithImage={(text, imgB64) => {
            if (imgB64) setImgB64(imgB64);
            send(text);
          }}
          onClose={() => setOcrOpen(false)}
        />
      )}

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
      {/* ── Chat Header — Image 2 style ──────────────────────── */}
      <div className="px-3 py-2 flex items-center gap-2 border-b border-white/10 shrink-0 bg-black/20">
        {/* Left: History + Avatar + Name */}
        <button onClick={()=>setHistoryOpen(true)} className="text-slate-600 hover:text-slate-400 transition-colors shrink-0">
          <History size={16}/>
        </button>
        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
          profilePersonality === 'girlfriend'
            ? 'bg-gradient-to-br from-pink-500 to-rose-400'
            : 'bg-gradient-to-br from-blue-600 to-cyan-500'
          } ${loading||msgs.some(m=>m.streaming)?'animate-pulse shadow-[0_0_15px_rgba(236,72,153,0.5)]':''}`}>
          <span className="text-white font-black text-sm">{profilePersonality === 'girlfriend' ? 'A' : 'J'}</span>
        </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black text-white tracking-wide">JARVIS</p>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] text-slate-500">
                {profileName && <span className="text-slate-400">{profileName} · </span>}
                <span className="text-blue-400/80">{PERSONALITY_LABELS[profilePersonality] || '🤖 JARVIS'}</span>
                <span className="text-slate-600"> · {mode}</span>
              </p>
              {typeof navigator !== 'undefined' && !navigator.onLine && (
                <span className="text-[9px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1.5 py-0.5 rounded-full">Offline</span>
              )}
              {(loading || msgs.some(m=>m.streaming)) && (
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"/>
              )}
            </div>
            {newBadge && (
              <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-yellow-500/90 text-black text-xs font-bold px-4 py-2 rounded-full shadow-lg animate-bounce whitespace-nowrap">
                {newBadge.emoji} Badge Mila: {newBadge.name}! 🎉
              </div>
            )}
          </div>

          {/* Weather + Battery info */}
          {timeCtx?.weather && (
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[11px] text-slate-500">{timeCtx.weather}</span>
            </div>
          )}

          {/* Right action buttons — compact */}
          <div className="flex items-center gap-0.5 shrink-0 relative">

            {/* UI Sound toggle */}
            <button onClick={()=>{ Sounds.toggleMute(); navigator.vibrate?.([5]); }}
              title="UI sounds"
              className="p-1.5 rounded-full text-slate-600 hover:text-slate-300 transition-all text-[13px]">
              🔈
            </button>
            {/* Voice/TTS sound */}
            <button onClick={()=>{stopCurrentAudio();setSpeaking(false);setVoiceOn(v=>!v);}}
              className={`p-1.5 rounded-full transition-all ${voiceOn||speaking?'text-blue-400':'text-slate-600'}`}>
              {voiceOn||speaking?<Volume2 size={15}/>:<VolumeX size={15}/>}
            </button>
            {/* ⋯ More — Search, Pin, Wake */}
            <div className="relative">
              <button onClick={()=>setMoreOpen(v=>!v)}
                className={`p-1.5 rounded-full transition-all text-base leading-none ${moreOpen?'text-white':'text-slate-600 hover:text-white'}`}>
                ···
              </button>
              {moreOpen && (
                <div className="absolute right-0 top-9 z-50 bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl p-1.5 flex flex-col gap-0.5 min-w-[140px]"
                  onClick={()=>setMoreOpen(false)}>
                  <button onClick={()=>setSearchOpen(true)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors text-slate-400 hover:text-white text-[13px]">
                    <Search size={14}/> Chat Search
                  </button>
                  <button onClick={()=>setPinsOpen(true)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors text-[13px] ${pinnedMsgs.length>0?'text-yellow-400':'text-slate-400 hover:text-white'}`}>
                    📌 Pinned {pinnedMsgs.length>0&&<span className="ml-auto text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 rounded-full">{pinnedMsgs.length}</span>}
                  </button>
                  <button onClick={()=>setWakeWordOn(w=>!w)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors text-[13px] ${wakeWordOn?'text-blue-400':'text-slate-400 hover:text-white'}`}>
                    {wakeWordOn?(wakeDetected?'🎤':'👂'):'🔕'} Hey JARVIS
                  </button>
                </div>
              )}
            </div>
            {/* New chat */}
            <button onClick={()=>{setMsgs([]);setConvId(null);setTitleGenerated(false);}}
              className="p-1.5 rounded-full text-slate-600 hover:text-white transition-all">
              <Plus size={15}/>
            </button>
            {/* Menu */}
            <button onClick={()=>window.dispatchEvent(new CustomEvent("jarvis-open-sidebar"))}
              className="flex flex-col gap-[3px] items-center justify-center p-1.5 rounded-full text-slate-500 hover:text-white transition-all lg:hidden">
              <span className="block w-3.5 h-[1.5px] bg-current rounded-full"/>
              <span className="block w-3.5 h-[1.5px] bg-current rounded-full"/>
              <span className="block w-2.5 h-[1.5px] bg-current rounded-full"/>
            </button>
          </div>
      </div>


      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 py-1 no-scrollbar jarvis-scroll">
        {isEmpty ? (
          <div className="flex flex-col h-full overflow-y-auto no-scrollbar">

            {/* ── Clock + Date ─────────────────────────────── */}
            <div className="flex flex-col items-center pt-6 pb-3 select-none">
              <LiveClock/>
              <p className="text-slate-400 text-base mt-2 font-medium">
                {(()=>{
                  const h=new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Kolkata'})).getHours();
                  if(profilePersonality==='girlfriend'){
                    const ariaGreets=[
                      h<5?'Itni raat ko jaag rahe ho? 🌙 sab theek hai?':
                      h<12?`Good morning${profileName?', '+profileName:''}! ☀️ Uthna hua?`:
                      h<17?`Hey${profileName?', '+profileName:''}! Kya chal raha hai? 😊`:
                      h<21?`Shaam ho gayi${profileName?', '+profileName:''}... din kaisa raha? 🌆`:
                      `Raat ko${profileName?', '+profileName:''} — neend nahi aa rahi? 🌙`
                    ];
                    return ariaGreets[0];
                  }
                  return h<5?'Raat ko jaaga? 🌙':h<12?(`Kya scene hai${profileName ? ', ' + profileName : ''}? 👋`):h<17?(`Good afternoon${profileName ? ', ' + profileName : ''} ☀️`):h<21?(`Good evening${profileName ? ', ' + profileName : ''} 🌇`):'Raat ka mood kya hai? 🌙';
                })()}
              </p>
              
            </div>

            {/* ── Quick Action Cards ────────────────────────── */}
            <div className="px-3 pb-4">
              <FestivalBanner />
              {proAlerts.length > 0 && proAlerts.map((alert, i) => (
                <div key={i} className="mb-2 w-full bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-2 flex items-center gap-2">
                  <span>{alert.icon}</span>
                  <p className="text-xs text-orange-300 flex-1">{alert.message}</p>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  ...(timeCtx?.suggestions || []).slice(0,4).map(q=>({icon:q.icon,title:q.text,sub:null,cmd:q.cmd||q.text})),
                  ...(timeCtx?.suggestions?.length < 4 ? [
                    {icon:'☀️',title:'Aaj ka mausam?',sub:'Live weather + forecast',cmd:'Aaj ka weather batao'},
                    {icon:'📚',title:'Study plan banao',sub:'Aaj ka padhai ka plan',cmd:'Aaj ke liye study plan banao'},
                    {icon:'🧠',title:'Kuch seekhna hai',sub:'Interesting topic',cmd:'Koi interesting topic samjhao'},
                    {icon:'⚡',title:'Quick quiz',sub:'Test your knowledge',cmd:'Mujhe koi interesting quiz do'},
                    {icon:'📰',title:'Aaj ki khabar?',sub:'India & world news',cmd:'Aaj ki top 5 news batao'},
                    {icon:'🪙',title:'Gold & crypto rate?',sub:'Live prices',cmd:'Aaj ka gold rate aur bitcoin price batao'},
                  ] : []),
                ].slice(0,6).map((card,i) => (
                  <button key={i} onClick={()=>send(card.cmd)}
                    className="text-left bg-white/[0.05] border border-white/[0.08] rounded-2xl p-4 hover:bg-white/[0.08] hover:border-white/15 active:scale-95 transition-all">
                    <div className="text-2xl mb-2">{card.icon}</div>
                    <p className="text-white text-[13px] font-semibold leading-snug">{card.title}</p>
                    {card.sub && <p className="text-slate-500 text-[11px] mt-0.5 leading-snug">{card.sub}</p>}
                  </button>
                ))}
              </div>
            </div>

          </div>
        ) : (
          <>
            {msgs.map(m=>(
              m.streaming&&m.content===''
                ? <TypingDots key={m.id} mode={m.mode}/>
                : <div key={m.id} ref={el=>msgRefs.current[m.id]=el}><Bubble msg={m} onSpeak={speak} voiceOn={voiceOn} onFollowUp={t=>send(t)} pinnedIds={pinnedIds} setPinnedIds={setPinnedIds} setPinnedMsgs={setPinnedMsgs} msgs={msgs} exportChat={exportChat} titleGenerated={titleGenerated} setTitleGenerated={setTitleGenerated} convId={convId} reactions={reactions} setReactions={setReactions} lastUserMsg={lastUserMsg} profilePersonality={profilePersonality}/></div>
            ))}
            {loading&&(
              profilePersonality==='girlfriend'
                ? <div className="flex items-center gap-2 px-3 py-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-rose-400 flex items-center justify-center text-white text-xs font-black">A</div>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-pink-400/70">Aira likh rahi hai</span>
                      <span className="flex gap-0.5 ml-1">{[0,1,2].map(i=><span key={i} className="w-1 h-1 bg-pink-400/60 rounded-full animate-bounce" style={{animationDelay:`${i*150}ms`}}/>)}</span>
                    </div>
                  </div>
                : <TypingDots mode={mode==='auto'?(detected||'flash'):mode}/>
            )}
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
        <div className="px-2 py-1.5 border-t border-white/[0.05] flex items-center gap-2 shrink-0">
          <img src={preview} alt="" className="h-10 w-10 rounded-lg object-cover border border-white/10"/>
          <span className="text-xs text-slate-500 flex-1">Image attached</span>
          <button onClick={()=>{setPreview(null);setImgB64(null);}}><X size={14} className="text-slate-600"/></button>
        </div>
      )}

      {/* PDF Preview bar */}
      {pdfText && (
        <div className="px-3 py-2 border-t border-white/[0.05] flex items-center gap-2 shrink-0 bg-blue-500/5">
          <span className="text-lg">📄</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-blue-300 font-medium truncate">{pdfName}</p>
            <p className="text-[10px] text-slate-500">{pdfText.length > 100 ? Math.round(pdfText.length/1000)+'k chars extracted' : 'Ready'}</p>
          </div>
          <button onClick={()=>{setPdfText(null);setPdfName('');}} className="text-slate-600 hover:text-red-400 transition-colors"><X size={14}/></button>
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
      {/* Remote typing indicator */}
      <RemoteTypingIndicator isTyping={remoteTyping}/>
      {/* Input */}
      {/* ── Chat Input — Image 2 Style ─────────────────── */}
      <div className="shrink-0 safe-bottom">
        {/* Image preview */}
        {preview && (
          <div className="px-4 pb-2 flex items-center gap-2">
            <img src={preview} alt="" className="h-10 w-10 rounded-xl object-cover border border-white/10"/>
            <span className="text-xs text-slate-500 flex-1">Image ready</span>
            <button onClick={()=>{setPreview(null);setImgB64(null);}}><X size={14} className="text-slate-600"/></button>
          </div>
        )}

        {/* Main input container */}
        <div className="mx-3 mb-3 bg-white/[0.05] border border-white/[0.09] rounded-[26px] focus-within:border-blue-500/30 transition-all overflow-hidden">
          {/* Textarea */}
          <div className="px-4 pt-3 pb-1">
            <textarea ref={taRef} value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}}
              placeholder={profilePersonality === "girlfriend" ? "Aira se kuch bolo..." : profilePersonality === "study" ? "Kuch poochho, kuch seekhna hai..." : profilePersonality === "roast" ? "Roast ke liye ready ho? 😈" : "Kuch poocho ya batao..."}
              rows={1} style={{resize:'none',minHeight:'24px',maxHeight:'96px',overflowY:'auto'}}
              className="w-full bg-transparent text-white text-[15px] placeholder-slate-600 outline-none leading-relaxed"/>
          </div>

          {/* Bottom toolbar */}
          <div className="flex items-center px-3 pb-2.5 pt-1 gap-2">
            {/* + Button → popup */}
            <button onClick={()=>setPlusOpen(v=>!v)}
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all border ${
                plusOpen ? 'bg-blue-600 border-blue-500 text-white rotate-45' : 'bg-white/[0.06] border-white/[0.09] text-slate-400 hover:text-white'
              }`}>
              <Plus size={16}/>
            </button>

            {/* Mode pill - center */}
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-1 bg-white/[0.04] rounded-full px-1 py-0.5">
                {MODES.map(m => (
                  <button key={m.id} onClick={() => setMode(m.id)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${mode===m.id ? m.bg+' '+m.text+' border' : 'text-slate-600 hover:text-slate-400'}`}>
                    {m.label.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Voice */}
            <button onClick={startVoice}
              className={`flex items-center gap-1 px-2 py-1 rounded-full transition-all shrink-0 ${listening?'bg-red-500/20 text-red-400 border border-red-500/30':'text-slate-500 hover:text-slate-300'}`}>
              {listening?<MicOff size={15}/>:<Mic size={15}/>}
              {listening && <span className="text-[10px] font-medium">Bol...</span>}
            </button>

            {/* Send */}
            <button onClick={()=>send()} disabled={(!input.trim()&&!preview)||loading}
              className={`w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-25 transition-all active:scale-95 shrink-0 ${profilePersonality==="girlfriend" ? "bg-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.4)]" : "bg-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.35)]"}`}>
              <Send size={13} className="text-white ml-0.5"/>
            </button>
          </div>
        </div>
      </div>
    </div>

    </ChatBackground>
    {showWallpaper && (
      <WallpaperPicker
        onClose={() => setShowWallpaper(false)}
        onWallpaperChange={(changes) => {
          window.dispatchEvent(new CustomEvent('jarvis-wallpaper-change', { detail: changes }));
        }}
      />
    )}
    </>
  );
}