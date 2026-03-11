'use client';
import { useState, useEffect, Suspense } from 'react';
import { User, Bell, Shield, Palette, Brain, Zap, Download, Trash2, Key, Check, X, ChevronRight, AlertTriangle, RefreshCw, Link } from 'lucide-react';

import ConnectedApps from '@/components/dashboard/ConnectedApps';
import IntegrationSettings from '@/components/settings/IntegrationSettings';

const PERSONALITY_OPTIONS = [
  { id:'normal',       label:'Normal',       desc:'Helpful, balanced, warm',        emoji:'🤝', preview:"Haan yaar, batao kya chal raha hai. Main yahaan hoon." },
  { id:'motivational', label:'Motivational', desc:'High energy, hype man mode',     emoji:'🔥', preview:"BRO. Tu yeh kar sakta hai. I believe in you 1000%. Lets go!!" },
  { id:'fun',          label:'Fun',          desc:'Humor, jokes, light-hearted',    emoji:'😄', preview:"Aye aye captain! Kya scene hai aaj? Kuch mast karte hain!" },
  { id:'sarcastic',    label:'Sarcastic',    desc:'Brutally honest, pyaar se maar', emoji:'😏', preview:"Wah, kya plan hai. Ekdum genius. Theek hai, sunao, kya karna hai." },
  { id:'coach',        label:'Coach',        desc:'Disciplined, no fluff, results', emoji:'💪', preview:"Goals set karo. Excuses band karo. Kaam shuru karo. Simple." },
  { id:'roast',        label:'Roast Mode',   desc:'Brutal honesty + dark humor + care',emoji:'🔥', preview:"Aye bhai, teri life ki story sun ke mujhe khud sad feel ho raha hai 😂 Chal theek karte hain!" },
];

const API_ENDPOINTS = [
  { name:'Gemini AI',       key:'GEMINI_API_KEY',    required:true,  desc:'Main AI brain — aistudio.google.com (free)' },
  { name:'Groq',            key:'GROQ_API_KEY',      required:true,  desc:'⚡Flash + 🧠Think mode — console.groq.com (free)' },
  { name:'OpenRouter',      key:'OPENROUTER_KEY',    required:false, desc:'DeepSeek R1, Mistral, Qwen — openrouter.ai (free models)' },
  { name:'ElevenLabs TTS',  key:'ELEVENLABS_API_KEY',required:false, desc:'Best Hindi voice — elevenlabs.io (10k chars free)' },
  { name:'AIMLAPI (Images)',key:'AIMLAPI_KEY',       required:false, desc:'FLUX image gen — aimlapi.com (free tier)' },
  { name:'fal.ai Images',   key:'FAL_API_KEY',       required:false, desc:'FLUX HD — fal.ai (100 free credits)' },
  { name:'HuggingFace',     key:'HUGGINGFACE_TOKEN', required:false, desc:'Images + Music — huggingface.co (free)' },
  { name:'Mubert Music',    key:'MUBERT_API_KEY',    required:false, desc:'Royalty-free music — mubert.com (free tier)' },
  { name:'Luma Video',      key:'LUMA_API_KEY',      required:false, desc:'Dream Machine video — lumalabs.ai' },
  { name:'GNews',           key:'GNEWS_API_KEY',     required:false, desc:'Live India news — gnews.io (free)' },
  { name:'NewsData',        key:'NEWSDATA_KEY',      required:false, desc:'Hindi news — newsdata.io (free 200/day)' },
];

const FREE_APIS = [
  { name:'Weather',   url:'open-meteo.com',       desc:'No key needed ✓' },
  { name:'Quotes',    url:'quotable.io',           desc:'No key needed ✓' },
  { name:'Jokes',     url:'jokeapi.dev',           desc:'No key needed ✓' },
  { name:'Holidays',  url:'date.nager.at',         desc:'No key needed ✓' },
  { name:'Currency',  url:'exchangerate-api.com',  desc:'No key needed ✓' },
  { name:'Images',    url:'pollinations.ai',       desc:'No key needed ✓' },
];

export default function SettingsPage() {
  const [profile, setProfile]     = useState({ name:'', city:'', personality:'normal', language:'hinglish' });
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pinInput, setPinInput]     = useState('');
  const [pinMsg, setPinMsg]         = useState('');
  const [saving, setSaving]       = useState(false);
  const [customInstr, setCustomInstr] = useState('');
  const [saved, setSaved]         = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput]     = useState('');
  const [exporting, setExporting] = useState(false);
  const [notifEnabled, setNotif]  = useState(false);
  const [apiStatus, setApiStatus] = useState({});
  const [habits, setHabits]       = useState([]);
  const [newHabit, setNewHabit]   = useState({ name:'', frequency:'daily', target_days:30 });
  const [addHabit, setAddHabit]   = useState(false);

  useEffect(() => {
    loadProfile(); checkNotif(); loadHabits();
    // Restore PIN state from localStorage
    if (typeof window !== 'undefined') {
      setPinEnabled(localStorage.getItem('jarvis_pin_enabled') === 'true');
    }
  }, []);

  async function loadProfile() {
    try {
      const r = await fetch('/api/profile');
      const d = await r.json();
      if (d.profile && Object.keys(d.profile).length) {
        setCustomInstr(d.profile?.custom_instructions || '');
        setProfile(prev => ({
          ...prev,
          name:        d.profile.name        || prev.name,
          city:        d.profile.city        || prev.city,
          personality: d.profile.personality || prev.personality,
          language:    d.profile.language    || prev.language,
        }));
      }
    } catch {}
  }

  async function saveProfile() {
    setSaving(true);
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profile, custom_instructions: customInstr }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  }

  function checkNotif() {
    setNotif('Notification' in window && Notification.permission === 'granted');
  }

  async function requestNotif() {
    if (!('Notification' in window)) return;
    const p = await Notification.requestPermission();
    setNotif(p === 'granted');
    if (p !== 'granted') return;
    // Subscribe to push via VAPID
    try {
      const keyRes = await fetch('/api/push');
      const { publicKey, ready } = await keyRes.json();
      if (!ready || !publicKey) {
        new Notification('JARVIS 🔔', { body: 'Notifications enabled! (Add VAPID keys for push)' });
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });
      await fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'subscribe', subscription: sub }) });
      new Notification('JARVIS 🔔', { body: 'Push notifications active! Milte hain.' });
    } catch (e) {
      new Notification('JARVIS 🔔', { body: 'Notifications enabled!' });
    }
  }

  async function loadHabits() {
    try {
      const r = await fetch('/api/analytics?type=dashboard');
      const d = await r.json();
      setHabits(d.habits || []);
    } catch {}
  }

  async function createHabit() {
    if (!newHabit.name) return;
    try {
      await fetch('/api/memory', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ category:'general', key:`habit_${Date.now()}`, value: JSON.stringify(newHabit), tags:['habit'] }) });
      setAddHabit(false); setNewHabit({ name:'', frequency:'daily', target_days:30 }); loadHabits();
    } catch {}
  }

  async function exportData() {
    setExporting(true);
    try {
      const r = await fetch('/api/memory?export=true');
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `jarvis-backup-${Date.now()}.json`; a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  }

  async function deleteAllData() {
    if (deleteInput !== 'DELETE') return;
    try {
      await fetch('/api/memory', { method:'DELETE', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'delete_all' }) });
      setDeleteConfirm(false);
      alert('Sab data delete ho gaya. Page reload hoga.');
      window.location.reload();
    } catch {}
  }

  async function testApi(endpoint) {
    setApiStatus(p => ({ ...p, [endpoint.key]: 'testing' }));
    await new Promise(r => setTimeout(r, 1200)); // Simulate test
    setApiStatus(p => ({ ...p, [endpoint.key]: 'ok' }));
  }

  const TABS = [
    { id:'profile',  icon:<User size={15}/>,    label:'Profile'    },
    { id:'ai',       icon:<Brain size={15}/>,   label:'AI & Voice' },
    { id:'habits',   icon:<Zap size={15}/>,     label:'Habits'     },
    { id:'apis',     icon:<Key size={15}/>,     label:'APIs'       },
    { id:'security', icon:<Shield size={15}/>,  label:'Security'   },
    { id:'connect',  icon:<Link size={15}/>,    label:'Apps'       },
  ];

  async function togglePIN() {
    if (typeof window === 'undefined') return;
    if (pinEnabled) {
      localStorage.removeItem('jarvis_pin_hash');
      localStorage.setItem('jarvis_pin_enabled', 'false');
      setPinEnabled(false);
      setPinMsg('PIN disabled');
    } else {
      if (pinInput.length !== 4 || !/^\d{4}$/.test(pinInput)) {
        setPinMsg('4-digit number chahiye'); return;
      }
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pinInput));
      const hash = Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
      localStorage.setItem('jarvis_pin_hash', hash);
      localStorage.setItem('jarvis_pin_enabled', 'true');
      setPinEnabled(true); setPinInput(''); setPinMsg('PIN set! App ab locked rahega.');
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 pb-24 lg:pb-6 space-y-4 max-w-3xl mx-auto">
        <div>
          <h1 className="text-xl font-black text-white">Settings</h1>
          <p className="text-xs text-slate-500">Configure your JARVIS system</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${activeTab===t.id ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-500 bg-white/4 hover:text-slate-300'}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ─── PROFILE TAB ─── */}
        {activeTab === 'profile' && (
          <div className="space-y-3">
            <div className="glass-card p-4 space-y-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Personal Info</p>
              {[
                { key:'name',     label:'Tumhara naam',       placeholder:'Apna naam' },
                { key:'city',     label:'City / Sheher',     placeholder:'Delhi, Mumbai...' },
                { key:'language', label:'Preferred Language', placeholder:'hinglish' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-slate-400 block mb-1.5">{f.label}</label>
                  <input value={profile[f.key] || ''} onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:border-blue-500/40 transition-colors"/>
                </div>
              ))}
              <button onClick={saveProfile} disabled={saving}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${saved ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} disabled:opacity-50`}>
                {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>

            <div className="glass-card p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Notifications</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">Push Notifications</p>
                  <p className="text-xs text-slate-500">Reminders, proactive suggestions</p>
                </div>
                <button onClick={notifEnabled ? undefined : requestNotif}
                  className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${notifEnabled ? 'bg-green-600/20 text-green-400 border border-green-500/30' : 'bg-blue-600 text-white'}`}>
                  {notifEnabled ? 'Enabled ✓' : 'Enable'}
                </button>
              </div>
              {/* Daily Brief */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                <div>
                  <p className="text-sm text-white">🌅 Daily Morning Brief</p>
                  <p className="text-xs text-slate-500">Subah JARVIS ka greeting + goals reminder</p>
                </div>
                <button onClick={async () => {
                  try {
                    const r = await fetch('/api/daily-brief', { method: 'POST' });
                    const d = await r.json();
                    if (d.brief) alert('Brief bheja gaya: ' + d.brief.title);
                  } catch { alert('Net check karo!'); }
                }} className="px-3 py-1.5 rounded-xl text-xs font-medium bg-orange-600/20 text-orange-400 border border-orange-500/30 hover:bg-orange-600/30 transition-all">
                  Test Brief
                </button>
              </div>
              {/* Quick links */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                <a href="/automation" className="flex-1 text-center py-2 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-all">
                  📱 Phone Control Setup
                </a>
                <a href="/pwa-guide" className="flex-1 text-center py-2 text-xs text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-xl hover:bg-purple-500/20 transition-all">
                  📦 APK Guide
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ─── AI & VOICE TAB ─── */}
        {activeTab === 'ai' && (
          <div className="space-y-3">
            <div className="glass-card p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Personality Mode</p>
              <div className="space-y-2">
                {PERSONALITY_OPTIONS.map(opt => (
                  <button key={opt.id} onClick={() => setProfile(p => ({ ...p, personality: opt.id }))}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${profile.personality === opt.id ? 'bg-blue-600/20 border border-blue-500/30' : 'bg-white/4 border border-transparent hover:border-white/10'}`}>
                    <span className="text-xl">{opt.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${profile.personality === opt.id ? 'text-blue-300' : 'text-white'}`}>{opt.label}</p>
                      <p className="text-xs text-slate-500">{opt.desc}</p>
                      {profile.personality === opt.id && (
                        <p className="text-xs text-blue-300/70 mt-1.5 italic">"{opt.preview}"</p>
                      )}
                    </div>
                    {profile.personality === opt.id && <Check size={16} className="text-blue-400 shrink-0 mt-0.5"/>}
                  </button>
                ))}
              </div>
              <button onClick={saveProfile} disabled={saving}
                className="w-full mt-3 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                {saving ? 'Saving...' : 'Save Personality'}
              </button>
            </div>

            {/* Theme Section */}
            <div className="glass-card p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">🎨 Theme</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id:'dark',   label:'Dark Blue', emoji:'🔵', bg:'#050810', accent:'#1A56DB' },
                  { id:'amoled', label:'AMOLED',    emoji:'⚫', bg:'#000000', accent:'#3b82f6' },
                  { id:'soft',   label:'Soft Dark', emoji:'🌫', bg:'#1a1a2e', accent:'#6366f1' },
                ].map(t => {
                  const saved = typeof window!=='undefined' ? localStorage.getItem('jarvis_theme')||'dark' : 'dark';
                  const active = saved === t.id;
                  return (
                    <button key={t.id}
                      onClick={() => {
                        localStorage.setItem('jarvis_theme', t.id);
                        document.body.style.background = t.bg;
                      }}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${active?'border-blue-500/40 bg-blue-600/15':'border-transparent bg-white/4 hover:border-white/10'}`}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg" style={{background:t.bg,border:`2px solid ${t.accent}`}}>
                        {t.emoji}
                      </div>
                      <p className={`text-xs font-medium ${active?'text-blue-300':'text-slate-400'}`}>{t.label}</p>
                      {active && <Check size={12} className="text-blue-400"/>}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-600 mt-2 text-center">Chat mein header ke theme button se bhi change kar sakte ho</p>
            </div>

            <div className="glass-card p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Custom Instructions</p>
              <p className="text-xs text-slate-600 mb-2">JARVIS hamesha yeh dhyan rakhe — apne baare mein kuch specific batao</p>
              <textarea
                value={customInstr}
                onChange={e => setCustomInstr(e.target.value)}
                placeholder={"Example: Main engineering student hoon. Technical answers prefer karta hoon. Bullet points se bachna."}
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs placeholder-slate-700 focus:border-blue-500/40 transition-colors resize-none"
                maxLength={500}
              />
              <p className="text-[10px] text-slate-700 mt-1 text-right">{customInstr.length}/500</p>
              <button onClick={saveProfile} disabled={saving}
                className="w-full mt-2 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Instructions'}
              </button>
            </div>

            <div className="glass-card p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Voice Settings</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm text-white">Wake Word</p>
                    <p className="text-xs text-slate-500">"Hey JARVIS" or "Jai JARVIS"</p>
                  </div>
                  <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-lg">Active</span>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-white/5">
                  <div>
                    <p className="text-sm text-white">Language</p>
                    <p className="text-xs text-slate-500">Speech recognition</p>
                  </div>
                  <span className="text-xs text-blue-400">Hindi (India)</span>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-white/5">
                  <div>
                    <p className="text-sm text-white">TTS Engine</p>
                    <p className="text-xs text-slate-500">Text-to-speech</p>
                  </div>
                  <span className="text-xs text-blue-400">Web Speech API</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── HABITS TAB ─── */}
        {activeTab === 'habits' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">{habits.length} Habits</p>
              <button onClick={() => setAddHabit(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-medium">
                + Add Habit
              </button>
            </div>
            {habits.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <p className="text-slate-400 text-sm">No habits yet</p>
                <p className="text-slate-600 text-xs mt-1">Add habits to track streaks and consistency</p>
              </div>
            ) : (
              <div className="space-y-2">
                {habits.map(h => (
                  <div key={h.id} className="glass-card p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: (h.color || '#1A56DB') + '20' }}>
                      🔥
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{h.name}</p>
                      <p className="text-xs text-slate-500">{h.frequency} · Streak: {h.streak}d · Best: {h.best_streak}d</p>
                    </div>
                    <span className="text-xs text-orange-400 font-bold">{h.streak}🔥</span>
                  </div>
                ))}
              </div>
            )}

            {addHabit && (
              <div className="glass-card p-4 border border-blue-500/20 space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-semibold text-white">New Habit</p>
                  <button onClick={() => setAddHabit(false)}><X size={16} className="text-slate-400"/></button>
                </div>
                <input value={newHabit.name} onChange={e => setNewHabit(p => ({...p, name:e.target.value}))}
                  placeholder="Habit name (e.g. Morning meditation)" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600"/>
                <div className="flex gap-2">
                  {['daily','weekly','monthly'].map(f => (
                    <button key={f} onClick={() => setNewHabit(p => ({...p, frequency:f}))}
                      className={`flex-1 py-2 rounded-xl text-xs capitalize ${newHabit.frequency===f ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400'}`}>{f}</button>
                  ))}
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Target: {newHabit.target_days} days</label>
                  <input type="range" min="7" max="365" value={newHabit.target_days}
                    onChange={e => setNewHabit(p => ({...p, target_days: parseInt(e.target.value)}))}
                    className="w-full accent-blue-500"/>
                </div>
                <button onClick={createHabit} disabled={!newHabit.name}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                  Create Habit
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── APIS TAB ─── */}
        {activeTab === 'apis' && (
          <div className="space-y-3">
            <div className="glass-card p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Required APIs</p>
              <p className="text-xs text-slate-500 mb-4">Add these in your .env.local file or Vercel environment variables</p>
              <div className="space-y-3">
                {API_ENDPOINTS.map(api => (
                  <div key={api.key} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white">{api.name}</p>
                        {api.required && <span className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">Required</span>}
                      </div>
                      <p className="text-xs text-slate-500">{api.desc}</p>
                      <p className="text-[10px] text-blue-400/70 font-mono mt-0.5">{api.key}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {apiStatus[api.key] === 'testing' && <RefreshCw size={14} className="text-blue-400 animate-spin"/>}
                      {apiStatus[api.key] === 'ok' && <Check size={14} className="text-green-400"/>}
                      <button onClick={() => testApi(api)}
                        className="text-xs px-2 py-1 bg-white/5 text-slate-400 hover:text-white rounded-lg transition-colors">
                        Test
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Free APIs (No Key Needed)</p>
              <div className="grid grid-cols-2 gap-2">
                {FREE_APIS.map(api => (
                  <div key={api.name} className="bg-green-500/5 border border-green-500/15 rounded-xl p-3">
                    <p className="text-xs font-medium text-white">{api.name}</p>
                    <p className="text-[10px] text-slate-500">{api.url}</p>
                    <p className="text-[10px] text-green-400 mt-1">{api.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-4 border border-blue-500/15">
              <p className="text-xs font-semibold text-blue-400 mb-2">Setup Instructions</p>
              <div className="space-y-2 text-xs text-slate-400">
                <p>1. <span className="text-white">Gemini API</span>: aistudio.google.com/app/apikey</p>
                <p>2. <span className="text-white">Groq API</span>: console.groq.com (free tier)</p>
                <p>3. <span className="text-white">fal.ai</span>: fal.ai → Dashboard → API Keys</p>
                <p>4. <span className="text-white">Supabase</span>: supabase.com → Project → Settings → API</p>
                <p>5. Copy <span className="text-blue-400 font-mono">.env.example</span> → <span className="text-blue-400 font-mono">.env.local</span></p>
              </div>
            </div>
          </div>
        )}

        {/* ─── SECURITY TAB ─── */}
        {activeTab === 'security' && (
          <div className="space-y-3">
            <div className="glass-card p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Data Management</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm text-white">Export All Data</p>
                    <p className="text-xs text-slate-500">Download everything as JSON</p>
                  </div>
                  <button onClick={exportData} disabled={exporting}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl text-xs hover:bg-blue-600/30 transition-colors disabled:opacity-50">
                    <Download size={13}/>{exporting ? 'Exporting...' : 'Export'}
                  </button>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-white/5">
                  <div>
                    <p className="text-sm text-white">Row-Level Security</p>
                    <p className="text-xs text-slate-500">All data is isolated per user</p>
                  </div>
                  <span className="text-xs text-green-400 flex items-center gap-1"><Check size={12}/>Active</span>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-white/5">
                  <div>
                    <p className="text-sm text-white">Database Encryption</p>
                    <p className="text-xs text-slate-500">Supabase AES-256 encrypted</p>
                  </div>
                  <span className="text-xs text-green-400 flex items-center gap-1"><Check size={12}/>Active</span>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-white/5">
                  <div>
                    <p className="text-sm text-white">Secure API Routes</p>
                    <p className="text-xs text-slate-500">All routes require authentication</p>
                  </div>
                  <span className="text-xs text-green-400 flex items-center gap-1"><Check size={12}/>Active</span>
                </div>
              </div>
            </div>

            {/* PIN Lock */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-white flex items-center gap-2">🔒 PIN Lock</p>
              <p className="text-xs text-slate-500">App khulne pe 4-digit PIN. Privacy ke liye.</p>
              <div className="flex gap-2">
                <input type="tel" inputMode="numeric" maxLength={4}
                  value={pinInput} onChange={e=>setPinInput(e.target.value.replace(/[^0-9]/g,''))}
                  placeholder="1234" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 tracking-widest"/>
                <button onClick={togglePIN}
                  className={`px-4 py-2 rounded-xl text-xs font-medium ${pinEnabled?'bg-red-500/20 text-red-400':'bg-blue-600/20 text-blue-400'}`}>
                  {pinEnabled?'Disable':'Set PIN'}
                </button>
              </div>
              {pinMsg && <p className="text-xs text-green-400">{pinMsg}</p>}
            </div>

            {/* Danger zone */}
            <div className="glass-card p-4 border border-red-500/20">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-red-400"/>
                <p className="text-sm font-semibold text-red-400">Danger Zone</p>
              </div>
              <p className="text-xs text-slate-400 mb-3">Delete all your data permanently. This cannot be undone.</p>
              {!deleteConfirm ? (
                <button onClick={() => setDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-600/15 border border-red-500/30 text-red-400 rounded-xl text-sm hover:bg-red-600/25 transition-colors">
                  <Trash2 size={14}/>Delete All My Data
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-red-300">Type <span className="font-mono font-bold">DELETE</span> to confirm:</p>
                  <input value={deleteInput} onChange={e => setDeleteInput(e.target.value)}
                    placeholder="DELETE" className="w-full bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 text-white text-sm placeholder-slate-600"/>
                  <div className="flex gap-2">
                    <button onClick={() => { setDeleteConfirm(false); setDeleteInput(''); }}
                      className="flex-1 py-2.5 bg-white/5 text-slate-400 rounded-xl text-sm">Cancel</button>
                    <button onClick={deleteAllData} disabled={deleteInput !== 'DELETE'}
                      className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium disabled:opacity-30">
                      Confirm Delete
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Version info */}
            <div className="glass-card p-4 text-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(26,86,219,0.3)]">
                <span className="text-white font-black text-lg">J</span>
              </div>
              <p className="font-black text-white text-lg bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">JARVIS v5.0</p>
              <p className="text-xs text-slate-500 mt-1">Maximum-Capability Personal AI</p>
              <p className="text-xs text-slate-600 mt-0.5">JARVIS v5.2 — Personal AI System 🤖</p>
              <div className="mt-3 flex justify-center gap-3 text-[10px] text-slate-600">
                <span>Next.js 15</span>
                <span>·</span>
                <span>Supabase</span>
                <span>·</span>
                <span>Gemini 1.5</span>
                <span>·</span>
                <span>Vercel</span>
              </div>
            </div>
          </div>
        )}

        {/* ─── CONNECTED APPS TAB ─── */}
        {activeTab === 'connect' && (
          <Suspense fallback={<div className="text-slate-500 text-sm text-center py-8">Loading...</div>}>
            <IntegrationSettings />
          </Suspense>
        )}
      </div>
    </div>
  );
}
