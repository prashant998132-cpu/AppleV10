'use client';
export const dynamic = 'force-dynamic';
import { useState, useMemo } from 'react';
import Link from 'next/link';

// ── 150+ Apps with deep links ────────────────────────────────
const APPS = {
  AI: [
    { name:'ChatGPT',         icon:'🤖', sub:'OpenAI GPT-4o',       url:'https://chat.openai.com',    actions:[{l:'New Chat',u:'https://chat.openai.com'},{l:'GPT-4o',u:'https://chat.openai.com/?model=gpt-4o'},{l:'DALL·E 3',u:'https://chat.openai.com/dall-e-3'}] },
    { name:'Google Gemini',   icon:'⭐', sub:'Gemini Ultra',         url:'https://gemini.google.com',  actions:[{l:'Open',u:'https://gemini.google.com'},{l:'Advanced',u:'https://gemini.google.com/advanced'}] },
    { name:'Claude',          icon:'🎭', sub:'Anthropic Claude',     url:'https://claude.ai',          actions:[{l:'New Chat',u:'https://claude.ai'},{l:'Projects',u:'https://claude.ai/projects'}] },
    { name:'Perplexity AI',   icon:'🔍', sub:'AI search engine',     url:'https://perplexity.ai',      actions:[{l:'Search',u:'https://perplexity.ai'},{l:'Spaces',u:'https://perplexity.ai/spaces'}] },
    { name:'Microsoft Copilot',icon:'🪟',sub:'Bing AI + GPT-4',     url:'https://copilot.microsoft.com',actions:[{l:'Open',u:'https://copilot.microsoft.com'}] },
    { name:'Mistral Le Chat', icon:'🌊', sub:'Mistral AI',           url:'https://chat.mistral.ai',    actions:[{l:'Open',u:'https://chat.mistral.ai'}] },
    { name:'Grok',            icon:'𝕏',  sub:'xAI Grok',            url:'https://grok.x.ai',          actions:[{l:'Open',u:'https://grok.x.ai'}] },
    { name:'DeepSeek',        icon:'🐋', sub:'DeepSeek R1',          url:'https://chat.deepseek.com',  actions:[{l:'Chat',u:'https://chat.deepseek.com'},{l:'R1',u:'https://chat.deepseek.com'}] },
    { name:'Kimi AI',           icon:'🌙', sub:'Moonshot AI — 256K ctx', url:'https://kimi.ai',            actions:[{l:'Chat',u:'https://kimi.ai'},{l:'K2',u:'https://kimi.ai'}] },
    { name:'Qwen Chat',         icon:'🐉', sub:'Alibaba Qwen 3',          url:'https://chat.qwen.ai',       actions:[{l:'Open',u:'https://chat.qwen.ai'}] },
    { name:'Meta AI',           icon:'🔵', sub:'Llama 4 — free',          url:'https://meta.ai',            actions:[{l:'Open',u:'https://meta.ai'}] },
    { name:'Hugging Face',    icon:'🤗', sub:'Open source models',   url:'https://huggingface.co',     actions:[{l:'Open',u:'https://huggingface.co'},{l:'Chat',u:'https://huggingface.co/chat'}] },
    { name:'Poe',             icon:'💬', sub:'Multiple AI models',   url:'https://poe.com',            actions:[{l:'Open',u:'https://poe.com'}] },
    { name:'Runway ML',       icon:'🎬', sub:'AI video generation',  url:'https://runwayml.com',       actions:[{l:'Open',u:'https://runwayml.com'}] },
    { name:'Midjourney',      icon:'🎨', sub:'AI image gen',         url:'https://midjourney.com',     actions:[{l:'Open',u:'https://midjourney.com'}] },
  ],
  Design: [
    { name:'Canva',           icon:'🖼️', sub:'Design platform',     url:'https://canva.com',          actions:[{l:'Open',u:'https://canva.com'},{l:'New Design',u:'https://canva.com/design/new'}] },
    { name:'Figma',           icon:'✏️', sub:'UI/UX design',        url:'https://figma.com',          actions:[{l:'Open',u:'https://figma.com'},{l:'New File',u:'https://figma.com/files'}] },
    { name:'Adobe Express',   icon:'🅰️', sub:'Quick designs',       url:'https://express.adobe.com',  actions:[{l:'Open',u:'https://express.adobe.com'}] },
    { name:'Remove.bg',       icon:'✂️', sub:'Background remove',   url:'https://remove.bg',          actions:[{l:'Remove BG',u:'https://remove.bg'}] },
    { name:'Pixlr',           icon:'🖌️', sub:'Photo editor',        url:'https://pixlr.com',          actions:[{l:'Edit',u:'https://pixlr.com/e'}] },
  ],
  Code: [
    { name:'GitHub',          icon:'🐙', sub:'Code repository',      url:'https://github.com',         actions:[{l:'Open',u:'https://github.com'},{l:'Copilot',u:'https://github.com/features/copilot'}] },
    { name:'CodePen',         icon:'🖊️', sub:'HTML/CSS/JS',         url:'https://codepen.io',         actions:[{l:'New Pen',u:'https://codepen.io/pen/new'}] },
    { name:'Replit',          icon:'💻', sub:'Online IDE',           url:'https://replit.com',         actions:[{l:'Open',u:'https://replit.com'},{l:'New',u:'https://replit.com/new'}] },
    { name:'StackOverflow',   icon:'📚', sub:'Q&A for developers',   url:'https://stackoverflow.com',  actions:[{l:'Search',u:'https://stackoverflow.com'}] },
    { name:'Vercel',          icon:'▲',  sub:'Deploy apps',          url:'https://vercel.com',         actions:[{l:'Dashboard',u:'https://vercel.com/dashboard'}] },
  ],
  Media: [
    { name:'YouTube',         icon:'▶️', sub:'Video platform',       url:'https://youtube.com',        actions:[{l:'Open',u:'https://youtube.com'},{l:'Studio',u:'https://studio.youtube.com'},{l:'Shorts',u:'https://youtube.com/shorts'}] },
    { name:'Spotify',         icon:'🎵', sub:'Music streaming',       url:'https://open.spotify.com',   actions:[{l:'Open',u:'https://open.spotify.com'},{l:'New Mix',u:'https://open.spotify.com/genre/made-for-you-hub'}] },
    { name:'Netflix',         icon:'🎬', sub:'Stream movies',         url:'https://netflix.com',        actions:[{l:'Watch',u:'https://netflix.com'}] },
    { name:'Hotstar',         icon:'⭐', sub:'Indian streaming',      url:'https://hotstar.com',        actions:[{l:'Open',u:'https://hotstar.com'}] },
    { name:'Prime Video',     icon:'📦', sub:'Amazon streaming',      url:'https://primevideo.com',     actions:[{l:'Watch',u:'https://primevideo.com'}] },
    { name:'JioCinema',       icon:'🎭', sub:'Jio streaming',         url:'https://jiocinema.com',      actions:[{l:'Open',u:'https://jiocinema.com'}] },
  ],
  Communication: [
    { name:'WhatsApp',        icon:'💬', sub:'Messaging',             url:'https://web.whatsapp.com',   actions:[{l:'Open',u:'https://web.whatsapp.com'},{l:'New Chat',u:'https://wa.me'}] },
    { name:'Telegram',        icon:'✈️', sub:'Messaging + channels', url:'https://web.telegram.org',   actions:[{l:'Open',u:'https://web.telegram.org'}] },
    { name:'Gmail',           icon:'📧', sub:'Google email',          url:'https://mail.google.com',    actions:[{l:'Inbox',u:'https://mail.google.com'},{l:'Compose',u:'https://mail.google.com/mail/u/0/#compose'}] },
    { name:'Discord',         icon:'🎮', sub:'Community chat',        url:'https://discord.com',        actions:[{l:'Open',u:'https://discord.com/app'}] },
    { name:'Instagram',       icon:'📸', sub:'Photos + reels',        url:'https://instagram.com',      actions:[{l:'Open',u:'https://instagram.com'},{l:'DMs',u:'https://instagram.com/direct/inbox'}] },
    { name:'Twitter/X',       icon:'𝕏',  sub:'Social media',          url:'https://x.com',              actions:[{l:'Open',u:'https://x.com'},{l:'DMs',u:'https://x.com/messages'}] },
  ],
  India: [
    { name:'JARVIS Chat',     icon:'🤖', sub:'Your AI assistant',    url:'/chat',                      actions:[{l:'Chat',u:'/chat'}] },
    { name:'UPI Pay',         icon:'💳', sub:'BHIM/GPay/PhonePe',    url:'upi://pay',                  actions:[{l:'Open',u:'https://bhimupi.org.in'}] },
    { name:'IRCTC',           icon:'🚂', sub:'Train booking',         url:'https://irctc.co.in',        actions:[{l:'Book',u:'https://irctc.co.in'},{l:'PNR',u:'https://indianrail.gov.in/pnr_Enq.html'}] },
    { name:'Zomato',          icon:'🍕', sub:'Food delivery',         url:'https://zomato.com',         actions:[{l:'Order',u:'https://zomato.com'}] },
    { name:'Swiggy',          icon:'🛵', sub:'Food delivery',         url:'https://swiggy.com',         actions:[{l:'Order',u:'https://swiggy.com'}] },
    { name:'Flipkart',        icon:'🛒', sub:'Indian shopping',       url:'https://flipkart.com',       actions:[{l:'Shop',u:'https://flipkart.com'}] },
    { name:'Amazon India',    icon:'📦', sub:'Online shopping',       url:'https://amazon.in',          actions:[{l:'Shop',u:'https://amazon.in'}] },
    { name:'Zepto',           icon:'⚡', sub:'Quick commerce',         url:'https://www.zeptonow.com',   actions:[{l:'Order',u:'https://www.zeptonow.com'}] },
    { name:'Google Maps',     icon:'🗺️', sub:'Navigation',           url:'https://maps.google.com',    actions:[{l:'Navigate',u:'https://maps.google.com'},{l:'Search',u:'https://maps.google.com/maps?q='}] },
    { name:'Ola',             icon:'🚕', sub:'Cab booking',           url:'https://olacabs.com',        actions:[{l:'Book Cab',u:'https://olacabs.com'}] },
  ],
  Productivity: [
    { name:'Google Docs',     icon:'📄', sub:'Documents',             url:'https://docs.google.com',    actions:[{l:'Open',u:'https://docs.google.com'},{l:'New',u:'https://docs.google.com/create'}] },
    { name:'Google Sheets',   icon:'📊', sub:'Spreadsheets',          url:'https://sheets.google.com',  actions:[{l:'Open',u:'https://sheets.google.com'},{l:'New',u:'https://sheets.google.com/create'}] },
    { name:'Notion',          icon:'📓', sub:'Notes + wiki',          url:'https://notion.so',          actions:[{l:'Open',u:'https://notion.so'}] },
    { name:'Google Calendar', icon:'📅', sub:'Schedule',              url:'https://calendar.google.com',actions:[{l:'Open',u:'https://calendar.google.com'},{l:'New Event',u:'https://calendar.google.com/calendar/render?action=TEMPLATE'}] },
    { name:'Todoist',         icon:'✅', sub:'Task manager',          url:'https://todoist.com',        actions:[{l:'Tasks',u:'https://todoist.com'},{l:'New',u:'https://todoist.com/app/today'}] },
  ],
  Education: [
    { name:'Khan Academy',    icon:'📐', sub:'Free education',        url:'https://khanacademy.org',    actions:[{l:'Learn',u:'https://khanacademy.org'}] },
    { name:'Unacademy',       icon:'🎓', sub:'NEET/JEE prep',        url:'https://unacademy.com',      actions:[{l:'Open',u:'https://unacademy.com'}] },
    { name:'BYJU\'S',         icon:'📖', sub:'Learning app',          url:'https://byjus.com',          actions:[{l:'Open',u:'https://byjus.com'}] },
    { name:'YouTube EDU',     icon:'▶️', sub:'Educational videos',   url:'https://youtube.com/education',actions:[{l:'Watch',u:'https://youtube.com/education'}] },
    { name:'Coursera',        icon:'🏫', sub:'Online courses',        url:'https://coursera.org',       actions:[{l:'Open',u:'https://coursera.org'}] },
    { name:'Wikipedia',       icon:'📚', sub:'Free encyclopedia',     url:'https://wikipedia.org',      actions:[{l:'Search',u:'https://wikipedia.org'}] },
  ],
  Finance: [
    { name:'Zerodha',         icon:'📈', sub:'Stock trading',         url:'https://kite.zerodha.com',   actions:[{l:'Trade',u:'https://kite.zerodha.com'}] },
    { name:'Groww',           icon:'💹', sub:'Invest + trade',        url:'https://groww.in',           actions:[{l:'Invest',u:'https://groww.in'}] },
    { name:'PhonePe',         icon:'💜', sub:'UPI + investments',     url:'https://phonepe.com',        actions:[{l:'Pay',u:'https://phonepe.com'}] },
    { name:'Google Pay',      icon:'💙', sub:'Google UPI',            url:'https://pay.google.com',     actions:[{l:'Pay',u:'https://pay.google.com'}] },
    { name:'CoinSwitch',      icon:'🪙', sub:'Crypto trading',        url:'https://coinswitch.co',      actions:[{l:'Trade',u:'https://coinswitch.co'}] },
  ],
};

const CATS = Object.keys(APPS);
const ICONS = { AI:'🤖', Design:'🎨', Code:'💻', Media:'🎵', Communication:'💬', India:'🇮🇳', Productivity:'⚡', Education:'🎓', Finance:'💰' };
const TOTAL = Object.values(APPS).flat().length;
const TOTAL_ACTIONS = Object.values(APPS).flat().reduce((a,app)=>a+app.actions.length,0);

export default function AutomationPage() {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('AI');
  const [pinned, setPinned] = useState(() => { try { return JSON.parse(localStorage.getItem('jarvis_pinned_apps')||'[]'); } catch { return []; }});
  const [tab, setTab] = useState('All'); // All | Pinned | Recent | India

  const filtered = useMemo(() => {
    const src = tab === 'Pinned' ? Object.values(APPS).flat().filter(a=>pinned.includes(a.name))
              : tab === 'India' ? APPS.India
              : tab === 'Recent' ? Object.values(APPS).flat().slice(0,12)
              : APPS[cat] || [];
    if (!search.trim()) return src;
    const q = search.toLowerCase();
    return Object.values(APPS).flat().filter(a => a.name.toLowerCase().includes(q) || a.sub.toLowerCase().includes(q));
  }, [cat, search, tab, pinned]);

  const togglePin = (name) => {
    const np = pinned.includes(name) ? pinned.filter(p=>p!==name) : [...pinned, name];
    setPinned(np);
    try { localStorage.setItem('jarvis_pinned_apps', JSON.stringify(np)); } catch {}
  };

  return (
    <div className="h-full flex flex-col bg-[#050810] text-white">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-xl shadow-[0_0_20px_rgba(26,86,219,0.4)]">🚀</div>
          <div className="flex-1">
            <h1 className="text-lg font-black text-white">Apps Hub</h1>
            <p className="text-[11px] text-slate-500">{TOTAL} apps · {TOTAL_ACTIONS} actions · 19 real APIs</p>
          </div>
          <button onClick={()=>setCat('India')} className="px-3 py-1.5 bg-[#ff9933]/10 border border-[#ff9933]/30 rounded-xl text-xs text-orange-300 font-medium">🇮🇳 India</button>
          <button onClick={()=>window.location.href='/knowledge'} className="px-3 py-1.5 bg-blue-600/10 border border-blue-500/30 rounded-xl text-xs text-blue-300 font-medium">📚 Study</button>
        </div>
        {/* Search */}
        <div className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.08] rounded-2xl px-4 py-2.5">
          <span className="text-slate-500 text-sm">🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search apps, actions..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 outline-none"/>
          {search && <button onClick={()=>setSearch('')} className="text-slate-600 text-sm">✕</button>}
        </div>
        {/* Tabs */}
        <div className="flex gap-2 mt-2">
          {['All','Pinned','Recent','India'].map(t=>(
            <button key={t} onClick={()=>{setTab(t);setSearch('');}}
              className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${tab===t?'bg-blue-600 text-white':'bg-white/5 text-slate-500 hover:text-white border border-white/[0.06]'}`}>
              {t==='All'?'⚡':t==='Pinned'?'⭐':t==='Recent'?'🕐':'🇮🇳'} {t}
            </button>
          ))}
        </div>
      </div>

      {/* Main — sidebar + content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Category sidebar */}
        {!search && (
          <div className="w-16 flex flex-col items-center gap-1 py-2 overflow-y-auto no-scrollbar shrink-0 border-r border-white/[0.05]">
            {CATS.map(c=>(
              <button key={c} onClick={()=>{setCat(c);setTab('All');}}
                className={`flex flex-col items-center gap-0.5 w-14 py-2 rounded-xl transition-all text-center ${cat===c&&tab==='All'?'bg-blue-600/20 border border-blue-500/30 text-blue-300':'text-slate-600 hover:text-white hover:bg-white/5'}`}>
                <span className="text-lg">{ICONS[c]}</span>
                <span className="text-[9px] leading-tight">{c}</span>
              </button>
            ))}
          </div>
        )}

        {/* App cards */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-2 space-y-2">
          {!search && !['Pinned','Recent','India'].includes(tab) && (
            <div className="flex items-center gap-2 py-1 px-1">
              <span className="text-lg">{ICONS[cat]}</span>
              <p className="text-white font-bold text-sm">{cat} Tools</p>
              <span className="text-slate-600 text-xs">{APPS[cat]?.length} apps</span>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-16 text-slate-600">
              <p className="text-3xl mb-2">🔍</p>
              <p className="text-sm">Koi app nahi mila</p>
            </div>
          )}

          {filtered.map((app,i) => (
            <div key={i} className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-xl shrink-0">
                  {app.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-[13px]">{app.name}</p>
                  <p className="text-slate-500 text-[11px]">{app.sub}</p>
                </div>
                <button onClick={()=>togglePin(app.name)}
                  className={`text-lg transition-all ${pinned.includes(app.name)?'text-yellow-400':'text-slate-700 hover:text-yellow-400'}`}>
                  {pinned.includes(app.name)?'★':'☆'}
                </button>
              </div>
              {/* Action buttons */}
              <div className="flex flex-wrap gap-1.5">
                {app.actions.map((action,j)=>(
                  <button key={j}
                    onClick={()=>window.open(action.u.startsWith('http')?action.u:action.u,'_blank')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] border border-white/[0.08] rounded-xl text-xs text-white/80 hover:bg-white/[0.1] hover:text-white active:scale-95 transition-all">
                    {action.l}
                  </button>
                ))}
                {app.actions.length > 3 && (
                  <button className="px-3 py-1.5 bg-white/[0.03] border border-dashed border-white/[0.06] rounded-xl text-xs text-slate-600">
                    +{app.actions.length - 3}
                  </button>
                )}
              </div>
            </div>
          ))}
          <div className="h-4"/>
        </div>
      </div>
    </div>
  );
}
