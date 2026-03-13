'use client';
export const dynamic = 'force-dynamic';
// app/(dashboard)/phone/page.jsx — JARVIS v10.9
// Smart Phone Control — Voice, Real-time, AI NLP, Alternatives everywhere

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Smartphone, Wifi, WifiOff, Bluetooth, Volume2, VolumeX,
  Sun, Moon, Camera, MessageSquare, Phone, PhoneOff,
  Bell, Zap, Battery, Signal, Activity, Settings, Shield,
  Repeat, Eye, Mic, MicOff, Contact, Send, RefreshCw,
  CheckCircle, XCircle, ChevronDown, ChevronUp, Play, Pause,
  SkipForward, BookOpen, Dumbbell, Car, Coffee, Gamepad, Film,
  Cpu, HardDrive, Globe, Lock, QrCode, FileText, Share2,
  Navigation, Radio, Clock, Star, Flashlight, AlertTriangle,
  Copy, ExternalLink, SkipBack, Maximize, Layers, Tv, Music,
  Map, Users, Info, ToggleLeft
} from 'lucide-react';

// ══════════════════════════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════════════════════════
let _addToast = null;

function Toast({ toasts }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none"
      style={{ width: 'calc(100% - 32px)', maxWidth: 380 }}>
      {toasts.map(t => (
        <div key={t.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-medium shadow-xl border
            ${t.type === 'ok'   ? 'bg-green-900/95 border-green-500/50'   : ''}
            ${t.type === 'err'  ? 'bg-red-900/95 border-red-500/50'       : ''}
            ${t.type === 'info' ? 'bg-blue-900/95 border-blue-500/50'     : ''}
            ${t.type === 'warn' ? 'bg-orange-900/95 border-orange-500/50' : ''}`}>
          {t.type === 'ok'   && <CheckCircle    size={15} className="text-green-400 shrink-0" />}
          {t.type === 'err'  && <XCircle        size={15} className="text-red-400 shrink-0" />}
          {t.type === 'info' && <Info           size={15} className="text-blue-400 shrink-0" />}
          {t.type === 'warn' && <AlertTriangle  size={15} className="text-orange-400 shrink-0" />}
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// BUTTON
// ══════════════════════════════════════════════════════════════
const COLORS = {
  blue:   'bg-blue-500/20 border-blue-500/40 text-blue-400 active:bg-blue-500/40',
  green:  'bg-green-500/20 border-green-500/40 text-green-400 active:bg-green-500/40',
  red:    'bg-red-500/20 border-red-500/40 text-red-400 active:bg-red-500/40',
  purple: 'bg-purple-500/20 border-purple-500/40 text-purple-400 active:bg-purple-500/40',
  orange: 'bg-orange-500/20 border-orange-500/40 text-orange-400 active:bg-orange-500/40',
  cyan:   'bg-cyan-500/20 border-cyan-500/40 text-cyan-400 active:bg-cyan-500/40',
  yellow: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400 active:bg-yellow-500/40',
  pink:   'bg-pink-500/20 border-pink-500/40 text-pink-400 active:bg-pink-500/40',
};

function Btn({ icon: Icon, label, onClick, color = 'blue', active }) {
  const [st, setSt] = useState('idle');
  async function tap() {
    if (st === 'loading') return;
    setSt('loading');
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(40);
    try {
      const res = await onClick();
      const ok = res?.ok !== false && !res?.error;
      setSt(ok ? 'ok' : 'err');
      if (_addToast) _addToast(ok ? 'ok' : 'err', ok ? `${label} ✓` : `${label} failed — MacroDroid connected hai?`);
    } catch {
      setSt('err');
      if (_addToast) _addToast('err', `${label} error`);
    }
    setTimeout(() => setSt('idle'), 2200);
  }
  return (
    <button onClick={tap}
      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all active:scale-95 select-none
        ${active ? 'ring-2 ring-current' : ''} ${COLORS[color]}`}>
      {st === 'loading' ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
       : st === 'ok'    ? <CheckCircle size={20} className="text-green-400" />
       : st === 'err'   ? <XCircle    size={20} className="text-red-400" />
                        : <Icon size={20} />}
      <span className="text-xs text-center leading-tight">{label}</span>
    </button>
  );
}

// ══════════════════════════════════════════════════════════════
// CARD
// ══════════════════════════════════════════════════════════════
function Card({ title, icon: Icon, color = 'blue', children, collapsed = false }) {
  const [open, setOpen] = useState(!collapsed);
  const C = { blue: 'text-blue-400', green: 'text-green-400', red: 'text-red-400', purple: 'text-purple-400', orange: 'text-orange-400', cyan: 'text-cyan-400', yellow: 'text-yellow-400', pink: 'text-pink-400' };
  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden mb-3">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <div className="flex items-center gap-2">
          <Icon size={17} className={C[color]} />
          <span className="text-white font-semibold text-sm">{title}</span>
        </div>
        {open ? <ChevronUp size={15} className="text-white/30" /> : <ChevronDown size={15} className="text-white/30" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TOGGLE
// ══════════════════════════════════════════════════════════════
function Toggle({ on, onChange, label, sub, color = 'blue' }) {
  const C = { blue: 'bg-blue-500', green: 'bg-green-500', purple: 'bg-purple-500', orange: 'bg-orange-500' };
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-white text-sm font-medium">{label}</p>
        {sub && <p className="text-white/40 text-xs mt-0.5">{sub}</p>}
      </div>
      <button onClick={() => onChange(!on)}
        className={`w-12 h-6 rounded-full relative transition-all ${on ? C[color] : 'bg-white/20'}`}>
        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow transition-all ${on ? 'left-6' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// DEEP LINKS — always work, no MacroDroid needed
// ══════════════════════════════════════════════════════════════
function openDeep(url) {
  if (typeof window !== 'undefined') window.location.href = url;
  return { ok: true };
}

// ══════════════════════════════════════════════════════════════
// ACTION MAP — for AI command interpreter
// ══════════════════════════════════════════════════════════════
function getActionFn(mb, action) {
  const map = {
    wifi_on:    () => mb?.Network?.wifiOn(),
    wifi_off:   () => mb?.Network?.wifiOff(),
    bt_on:      () => mb?.Network?.bluetoothOn(),
    bt_off:     () => mb?.Network?.bluetoothOff(),
    hotspot_on: () => mb?.Network?.hotspotOn(),
    hotspot_off:() => mb?.Network?.hotspotOff(),
    vol_up:     () => mb?.Volume?.up(),
    vol_down:   () => mb?.Volume?.down(),
    mute:       () => mb?.Volume?.mute(),
    unmute:     () => mb?.Volume?.unmute(),
    torch_on:   () => mb?.Hardware?.torchOn(),
    torch_off:  () => mb?.Hardware?.torchOff(),
    screenshot: () => mb?.Hardware?.screenshot(),
    lock:       () => mb?.Display?.lockPhone(),
    study_mode: () => mb?.SmartModes?.study(),
    sleep_mode: () => mb?.SmartModes?.sleep(),
    drive_mode: () => mb?.SmartModes?.drive(),
    gym_mode:   () => mb?.SmartModes?.gym(),
    dark_mode:  () => mb?.Display?.darkModeOn(),
    bright_max: () => mb?.Display?.brightnessMax(),
    bright_min: () => mb?.Display?.brightnessMin(),
  };
  return map[action] || null;
}

// ══════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════
export default function PhonePage() {
  const [tab, setTab]             = useState('control');
  const [toasts, setToasts]       = useState([]);
  const [modules, setModules]     = useState(null);
  const [ready, setReady]         = useState(false);
  const [deviceId, setDeviceId]   = useState('');
  const [noIdWarn, setNoIdWarn]   = useState(false);
  const [apiCaps, setApiCaps]     = useState({});
  const [vol, setVol]             = useState(50);
  const [bright, setBright]       = useState(70);
  const [voiceOn, setVoiceOn]     = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [cmd, setCmd]             = useState('');
  const [cmdBusy, setCmdBusy]     = useState(false);
  const [cmdOut, setCmdOut]       = useState('');
  const [notifs, setNotifs]       = useState([]);
  const [notifsNew, setNotifsNew] = useState(0);
  const [pickedContacts, setPicked] = useState([]);
  const [waNum, setWaNum]         = useState('');
  const [waMsg, setWaMsg]         = useState('');
  const [waSending, setWaSending] = useState(false);
  const [autoReply, setAutoReply] = useState(false);
  const [aiReply, setAiReply]     = useState(false);
  const [battery, setBattery]     = useState(null);
  const [netInfo, setNetInfo]     = useState(null);
  const recogRef  = useRef(null);
  const volTimer  = useRef(null);
  const brightTimer = useRef(null);

  // ── TOAST ────────────────────────────────────────────────
  const addToast = useCallback((type, msg) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t.slice(-3), { id, type, msg }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200);
  }, []);
  useEffect(() => { _addToast = addToast; return () => { _addToast = null; }; }, [addToast]);

  // ── LOAD MODULES ONCE on mount ───────────────────────────
  useEffect(() => {
    (async () => {
      const [na, mb] = await Promise.all([
        import('@/lib/phone/native-apis').catch(() => ({})),
        import('@/lib/automation/macro-bridge').catch(() => ({})),
      ]);
      setModules({ na, mb });
      setReady(true);
      const id = localStorage.getItem('macrodroid_device_id') || '';
      setDeviceId(id);
      setNoIdWarn(!id);
      setAutoReply(localStorage.getItem('jarvis_autoreply') === 'true');
      setAiReply(localStorage.getItem('jarvis_autoreply_ai') === 'true');
      if (na?.checkAllAPIs) setApiCaps(na.checkAllAPIs());
      if (na?.getBatteryInfo) na.getBatteryInfo().then(b => b && setBattery(b));
      if (na?.getNetworkInfo) setNetInfo(na.getNetworkInfo());
      if (na?.registerProtocolHandler) na.registerProtocolHandler();
    })();
  }, []);

  // ── REALTIME NOTIFS — Supabase + 15s poll fallback ───────
  useEffect(() => {
    fetchNotifs();
    let sub = null;
    (async () => {
      try {
        const { getSupabaseBrowser } = await import('@/lib/db/supabase');
        const sb = getSupabaseBrowser();
        sub = sb.channel('phone-notifs')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'phone_events' },
            p => {
              setNotifs(n => [p.new, ...n].slice(0, 50));
              setNotifsNew(c => c + 1);
              if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
            })
          .subscribe();
      } catch {}
    })();
    const poll = setInterval(fetchNotifs, 15000);
    return () => { clearInterval(poll); try { sub?.unsubscribe?.(); } catch {} };
  }, []);

  async function fetchNotifs() {
    try {
      const r = await fetch('/api/phone?type=notifications');
      const d = await r.json();
      if (d.notifications) setNotifs(d.notifications.slice(0, 50));
    } catch {}
  }

  // ── GUARD — no Device ID ─────────────────────────────────
  function auto(fn) {
    if (!deviceId) {
      addToast('warn', 'MacroDroid Device ID nahi hai! Setup tab mein save karo →');
      setTab('setup');
      return Promise.resolve({ ok: false });
    }
    return fn();
  }

  // ── DEEP LINK helper ─────────────────────────────────────
  function deep(url, label) {
    openDeep(url);
    addToast('ok', `${label} open ho raha hai...`);
    return Promise.resolve({ ok: true });
  }

  // ── VOICE COMMAND ────────────────────────────────────────
  function toggleVoice() {
    if (typeof window === 'undefined') return;
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Rec) { addToast('err', 'Voice recognition this browser mein nahi hai'); return; }
    if (voiceOn) { recogRef.current?.stop(); setVoiceOn(false); return; }
    const r = new Rec();
    r.lang = 'hi-IN';
    r.continuous = false;
    r.interimResults = true;
    r.onresult = e => {
      const t = Array.from(e.results).map(x => x[0].transcript).join('');
      setVoiceText(t);
      if (e.results[0]?.isFinal) {
        setCmd(t);
        setVoiceText('');
        setVoiceOn(false);
        setTimeout(() => runCommand(t), 200);
      }
    };
    r.onerror = () => { setVoiceOn(false); addToast('err', 'Voice error — phir try karo'); };
    r.onend = () => setVoiceOn(false);
    r.start();
    recogRef.current = r;
    setVoiceOn(true);
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    addToast('info', '🎤 Bol do... (Hindi ya English)');
  }

  // ── AI COMMAND — local parser + API NLP fallback ─────────
  async function runCommand(text) {
    if (!text?.trim()) return;
    setCmdBusy(true);
    setCmdOut('');
    const mb = modules?.mb;
    let executed = false;
    // 1. Local fast parser
    if (mb?.parseAndExecuteCommand) {
      const res = await mb.parseAndExecuteCommand(text);
      if (res?.executed) {
        setCmdOut('✅ ' + text);
        addToast('ok', `Command executed: ${text}`);
        executed = true;
      }
    }
    if (!executed) {
      // 2. API-based NLP (Groq/Gemini interprets command → action key)
      try {
        const r = await fetch('/api/phone/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: text, deviceId }),
        });
        const d = await r.json();
        if (d.action) {
          const fn = mb && getActionFn(mb, d.action);
          if (fn) {
            await fn();
            setCmdOut(`✅ ${d.explain || d.action}`);
            addToast('ok', d.explain || d.action);
          } else {
            setCmdOut(`🤖 ${d.explain || text}`);
          }
        } else if (d.reply) {
          setCmdOut(`🤖 ${d.reply}`);
        } else {
          setCmdOut('❓ Command nahi samajh aaya — thoda aur clear bolo');
        }
      } catch {
        setCmdOut('❌ AI se connect nahi ho paya');
      }
    }
    setCmd('');
    setCmdBusy(false);
  }

  // ── CONTACT PICKER ───────────────────────────────────────
  async function pickContact() {
    const na = modules?.na;
    if (!na?.pickContacts) {
      addToast('err', 'Contact Picker — Chrome Android 80+ mein kaam karta hai');
      return;
    }
    const res = await na.pickContacts({ multiple: true });
    if (res?.contacts?.length) {
      setPicked(res.contacts);
      addToast('ok', `${res.contacts.length} contact(s) selected`);
    }
  }

  // ── WA SEND ──────────────────────────────────────────────
  async function sendWA() {
    if (!waNum || !waMsg) return;
    setWaSending(true);
    if (deviceId && modules?.mb?.WhatsApp) {
      const res = await modules.mb.WhatsApp.send(waNum, waMsg);
      if (res?.ok) {
        addToast('ok', 'WhatsApp message sent via MacroDroid!');
        setWaMsg('');
        setWaSending(false);
        return;
      }
    }
    // Fallback: open WhatsApp directly
    openDeep(`whatsapp://send?phone=${waNum.replace(/\D/g, '')}&text=${encodeURIComponent(waMsg)}`);
    addToast('info', 'WhatsApp khula — message paste karo');
    setWaMsg('');
    setWaSending(false);
  }

  // ── SLIDERS with debounce ────────────────────────────────
  function onVol(v) {
    setVol(v);
    clearTimeout(volTimer.current);
    volTimer.current = setTimeout(() => modules?.mb?.Volume?.set(v), 500);
  }
  function onBright(v) {
    setBright(v);
    clearTimeout(brightTimer.current);
    brightTimer.current = setTimeout(() => modules?.mb?.Display?.brightnessSet(v), 500);
  }

  // ── SAVE ID ──────────────────────────────────────────────
  function saveId() {
    const id = deviceId.trim();
    localStorage.setItem('macrodroid_device_id', id);
    setNoIdWarn(!id);
    addToast(id ? 'ok' : 'warn', id ? 'Device ID saved ✅' : 'ID empty hai');
  }

  const mb = modules?.mb;
  const na = modules?.na;

  const TABS = [
    { id: 'control', label: 'Control', icon: Zap },
    { id: 'comms',   label: 'Comms',   icon: MessageSquare },
    { id: 'monitor', label: 'Status',  icon: Activity },
    { id: 'setup',   label: 'Setup',   icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950 pb-28">
      <Toast toasts={toasts} />

      {/* HEADER */}
      <div className="sticky top-0 z-20 bg-slate-950/95 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <div className="flex items-center gap-2">
            <Smartphone size={18} className="text-blue-400" />
            <span className="text-white font-bold text-base">Phone Control</span>
            {!ready && <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
          </div>
          <div className="flex gap-3 text-xs text-white/35">
            {battery && <span className="flex items-center gap-1"><Battery size={11} />{battery.level}%{battery.charging ? '⚡' : ''}</span>}
            {netInfo  && <span className="flex items-center gap-1"><Signal size={11} />{netInfo.type?.toUpperCase()}</span>}
          </div>
        </div>

        {/* No Device ID banner */}
        {noIdWarn && (
          <div onClick={() => setTab('setup')} className="mx-4 mb-2 mt-1 bg-orange-500/20 border border-orange-500/40 rounded-xl px-3 py-2 flex items-center gap-2 cursor-pointer active:opacity-70">
            <AlertTriangle size={13} className="text-orange-400 shrink-0" />
            <span className="text-orange-300 text-xs flex-1">MacroDroid ID nahi — buttons kaam nahi karenge. <span className="underline">Setup karo →</span></span>
          </div>
        )}

        {/* Voice live text */}
        {voiceText && (
          <div className="mx-4 mb-2 bg-blue-500/20 border border-blue-500/30 rounded-xl px-3 py-1.5 text-blue-300 text-sm italic">
            🎤 "{voiceText}"
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1.5 px-4 pb-3 mt-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl text-xs transition-all
                ${tab === t.id ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-white/40'}`}>
              <t.icon size={13} />{t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-3 max-w-lg mx-auto">

        {/* ═══ CONTROL ══════════════════════════════════════ */}
        {tab === 'control' && (
          <>
            {/* AI COMMAND BAR */}
            <div className="bg-gradient-to-r from-blue-950/60 to-purple-950/60 rounded-2xl border border-blue-500/30 p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap size={13} className="text-blue-400" />
                <span className="text-blue-300 text-xs font-medium">AI Command — Voice ya Text (Hinglish OK)</span>
              </div>
              <div className="flex gap-2">
                <input value={cmd} onChange={e => setCmd(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && runCommand(cmd)}
                  placeholder={voiceOn ? '🎤 Sun raha hoon...' : '"WiFi on karo" / "study mode" / "torch chalo"'}
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/25 focus:outline-none focus:border-blue-500" />
                <button onClick={toggleVoice}
                  className={`px-3 rounded-xl border transition-all active:scale-95 ${voiceOn ? 'bg-red-500 border-red-600 text-white animate-pulse' : 'bg-white/10 border-white/20 text-white/60'}`}>
                  {voiceOn ? <MicOff size={17} /> : <Mic size={17} />}
                </button>
                <button onClick={() => runCommand(cmd)} disabled={cmdBusy || !cmd.trim()}
                  className="px-4 bg-blue-600 text-white rounded-xl font-medium text-sm disabled:opacity-40 active:scale-95">
                  {cmdBusy ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Go'}
                </button>
              </div>
              {cmdOut && <p className="text-xs mt-2 text-green-400">{cmdOut}</p>}
            </div>

            {/* NETWORK */}
            <Card title="Network" icon={Wifi} color="cyan">
              <div className="grid grid-cols-4 gap-2">
                <Btn icon={Wifi}      label="WiFi On"     color="cyan"  onClick={() => auto(() => mb?.Network?.wifiOn())} />
                <Btn icon={WifiOff}   label="WiFi Off"    color="red"   onClick={() => auto(() => mb?.Network?.wifiOff())} />
                <Btn icon={Bluetooth} label="BT On"       color="blue"  onClick={() => auto(() => mb?.Network?.bluetoothOn())} />
                <Btn icon={Bluetooth} label="BT Off"      color="red"   onClick={() => auto(() => mb?.Network?.bluetoothOff())} />
                <Btn icon={Signal}    label="Hotspot On"  color="green" onClick={() => auto(() => mb?.Network?.hotspotOn())} />
                <Btn icon={Signal}    label="Hotspot Off" color="red"   onClick={() => auto(() => mb?.Network?.hotspotOff())} />
                <Btn icon={Globe}     label="Data On"     color="blue"  onClick={() => auto(() => mb?.Network?.dataOn())} />
                <Btn icon={Globe}     label="Data Off"    color="red"   onClick={() => auto(() => mb?.Network?.dataOff())} />
              </div>
              <button onClick={() => deep('android-app://com.android.settings/.wifi.WifiSettings', 'WiFi Settings')}
                className="mt-2 w-full text-xs text-cyan-400/60 bg-cyan-500/5 py-1.5 rounded-lg flex items-center justify-center gap-1 active:opacity-70">
                <ExternalLink size={11} /> Alternative: WiFi Settings open karo directly
              </button>
            </Card>

            {/* VOLUME */}
            <Card title="Volume" icon={Volume2} color="orange">
              <div className="flex items-center gap-3 mb-3">
                <VolumeX size={13} className="text-white/40 shrink-0" />
                <input type="range" min={0} max={100} value={vol} onChange={e => onVol(+e.target.value)} className="flex-1 accent-orange-500 h-1.5" />
                <Volume2 size={13} className="text-white/40 shrink-0" />
                <span className="text-white text-xs w-8 text-right">{vol}%</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <Btn icon={Volume2}     label="Max"     color="orange" onClick={() => auto(() => mb?.Volume?.max())} />
                <Btn icon={VolumeX}     label="Mute"    color="red"   onClick={() => auto(() => mb?.Volume?.mute())} />
                <Btn icon={Radio}       label="Vibrate" color="purple" onClick={() => auto(() => mb?.Volume?.vibrateMode())} />
                <Btn icon={Volume2}     label="Unmute"  color="green" onClick={() => auto(() => mb?.Volume?.unmute())} />
                <Btn icon={Play}        label="Play"    color="green" onClick={() => auto(() => mb?.Volume?.playMedia())} />
                <Btn icon={Pause}       label="Pause"   color="yellow" onClick={() => auto(() => mb?.Volume?.pauseMedia())} />
                <Btn icon={SkipForward} label="Next"    color="blue"  onClick={() => auto(() => mb?.Volume?.nextTrack())} />
                <Btn icon={SkipBack}    label="Prev"    color="blue"  onClick={() => auto(() => mb?.Volume?.prevTrack())} />
              </div>
            </Card>

            {/* DISPLAY */}
            <Card title="Display" icon={Sun} color="yellow">
              <div className="flex items-center gap-3 mb-3">
                <Moon size={13} className="text-white/40 shrink-0" />
                <input type="range" min={0} max={100} value={bright} onChange={e => onBright(+e.target.value)} className="flex-1 accent-yellow-400 h-1.5" />
                <Sun size={13} className="text-white/40 shrink-0" />
                <span className="text-white text-xs w-8 text-right">{bright}%</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <Btn icon={Sun}     label="Max"       color="yellow" onClick={() => auto(() => mb?.Display?.brightnessMax())} />
                <Btn icon={Moon}    label="Min"       color="blue"   onClick={() => auto(() => mb?.Display?.brightnessMin())} />
                <Btn icon={Moon}    label="Dark Mode" color="purple" onClick={() => auto(() => mb?.Display?.darkModeOn())} />
                <Btn icon={Lock}    label="Lock"      color="red"    onClick={() => auto(() => mb?.Display?.lockPhone())} />
                <Btn icon={Sun}     label="Auto"      color="cyan"   onClick={() => auto(() => mb?.Display?.autoBrightness())} />
                <Btn icon={Tv}      label="Keep On"   color="orange" onClick={() => auto(() => mb?.Display?.keepOn())} />
                <Btn icon={Maximize}label="Rotate"   color="green"  onClick={() => auto(() => mb?.Display?.rotateAuto())} />
              </div>
            </Card>

            {/* HARDWARE */}
            <Card title="Hardware" icon={Camera} color="pink">
              <div className="grid grid-cols-4 gap-2">
                <Btn icon={Flashlight} label="Torch On"  color="yellow" onClick={() => auto(() => mb?.Hardware?.torchOn())} />
                <Btn icon={Flashlight} label="Torch Off" color="red"    onClick={() => auto(() => mb?.Hardware?.torchOff())} />
                <Btn icon={Camera}     label="Screenshot"color="blue"   onClick={() => auto(() => mb?.Hardware?.screenshot())} />
                <Btn icon={Camera}     label="Selfie"    color="pink"   onClick={() => auto(() => mb?.Hardware?.takeSelfie())} />
                <Btn icon={Battery}    label="Battery"   color="green"  onClick={() => auto(() => mb?.DeviceInfo?.getBattery())} />
                <Btn icon={HardDrive}  label="Storage"   color="cyan"   onClick={() => auto(() => mb?.DeviceInfo?.getStorage())} />
                <Btn icon={Cpu}        label="RAM"       color="purple" onClick={() => auto(() => mb?.DeviceInfo?.getRAM())} />
                <Btn icon={Activity}   label="All Info"  color="orange" onClick={() => auto(() => mb?.DeviceInfo?.getAllInfo())} />
              </div>
            </Card>

            {/* APP LAUNCHER */}
            <Card title="App Launcher" icon={Layers} color="blue" collapsed>
              <p className="text-white/25 text-xs mb-2">MacroDroid se silent launch • No MacroDroid: Direct deep link</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { l: 'YouTube',    I: Play,    mac: () => mb?.Apps?.youtube(),   alt: () => deep('vnd.youtube://', 'YouTube') },
                  { l: 'WhatsApp',   I: MessageSquare, mac: () => mb?.Apps?.whatsapp(),  alt: () => deep('whatsapp://', 'WhatsApp') },
                  { l: 'Instagram',  I: Camera,  mac: () => mb?.Apps?.instagram(), alt: () => deep('instagram://', 'Instagram') },
                  { l: 'Telegram',   I: Send,    mac: () => mb?.Apps?.telegram(),  alt: () => deep('tg://', 'Telegram') },
                  { l: 'Spotify',    I: Music,   mac: () => mb?.Apps?.spotify(),   alt: () => deep('spotify://', 'Spotify') },
                  { l: 'Maps',       I: Map,     mac: () => mb?.Apps?.maps(),      alt: () => deep('geo:0,0', 'Maps') },
                  { l: 'Camera',     I: Camera,  mac: () => mb?.Apps?.camera(),    alt: () => deep('intent:#Intent;action=android.media.action.IMAGE_CAPTURE;end', 'Camera') },
                  { l: 'Settings',   I: Settings,mac: () => mb?.Apps?.settings(),  alt: () => deep('android-app://com.android.settings', 'Settings') },
                  { l: 'Files',      I: FileText,mac: () => mb?.Apps?.files(),     alt: () => deep('content://com.android.externalstorage.documents/root/primary', 'Files') },
                  { l: 'Chrome',     I: Globe,   mac: () => mb?.Apps?.chrome(),    alt: () => deep('googlechrome://', 'Chrome') },
                  { l: 'Alarm',      I: Clock,   mac: () => mb?.Apps?.clock(),     alt: () => deep('intent:#Intent;action=android.intent.action.SET_ALARM;end', 'Alarm') },
                  { l: 'Home',       I: Smartphone, mac: () => mb?.Apps?.homeScreen(), alt: () => { addToast('info', 'Home button press karo'); return { ok: true }; } },
                ].map(a => (
                  <Btn key={a.l} icon={a.I} label={a.l} color="blue" onClick={() => deviceId ? a.mac() : a.alt()} />
                ))}
              </div>
            </Card>

            {/* SMART MODES */}
            <Card title="Smart Modes" icon={Zap} color="purple">
              <div className="grid grid-cols-4 gap-2">
                <Btn icon={BookOpen} label="Study"   color="cyan"   onClick={() => auto(() => mb?.SmartModes?.study())} />
                <Btn icon={Moon}     label="Sleep"   color="purple" onClick={() => auto(() => mb?.SmartModes?.sleep())} />
                <Btn icon={Car}      label="Drive"   color="blue"   onClick={() => auto(() => mb?.SmartModes?.drive())} />
                <Btn icon={Dumbbell} label="Gym"     color="red"    onClick={() => auto(() => mb?.SmartModes?.gym())} />
                <Btn icon={Film}     label="Movie"   color="orange" onClick={() => auto(() => mb?.SmartModes?.movie())} />
                <Btn icon={Gamepad}  label="Gaming"  color="green"  onClick={() => auto(() => mb?.SmartModes?.gaming())} />
                <Btn icon={Coffee}   label="Work"    color="yellow" onClick={() => auto(() => mb?.SmartModes?.work())} />
                <Btn icon={Users}    label="Meeting" color="pink"   onClick={() => auto(() => mb?.SmartModes?.meeting())} />
              </div>
            </Card>

            {/* REMINDERS */}
            <Card title="Reminders & Alarms" icon={Clock} color="orange" collapsed>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <Btn icon={Clock} label="Alarm"    color="orange" onClick={() => deep('intent:#Intent;action=android.intent.action.SET_ALARM;end', 'Alarm')} />
                <Btn icon={Clock} label="Timer"    color="yellow" onClick={() => deep('intent:#Intent;action=android.intent.action.SET_TIMER;end', 'Timer')} />
                <Btn icon={Bell}  label="Reminders"color="blue"   onClick={() => auto(() => mb?.Reminders?.getAll())} />
              </div>
              <p className="text-white/25 text-xs">Alarm/Timer = deeplinks — MacroDroid ke bina bhi kaam karte hain ✓</p>
            </Card>

            {/* NATIVE BROWSER APIS */}
            <Card title="Native Browser APIs" icon={Globe} color="green" collapsed>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[
                  { l: 'Contact Picker', I: Contact, ok: apiCaps.contactPicker, fn: pickContact },
                  { l: 'Share JARVIS',   I: Share2,  ok: apiCaps.share, fn: () => na?.shareContent?.({ title: 'JARVIS AI', url: 'https://apple-v10.vercel.app' }) },
                  { l: 'Get Location',   I: Navigation, ok: apiCaps.geolocation, fn: () => na?.getLocation?.().then(l => addToast('ok', `📍 ${l?.lat?.toFixed(4)}, ${l?.lng?.toFixed(4)}`)) },
                  { l: 'Scan QR Code',   I: QrCode,  ok: apiCaps.barcodeDetector, fn: () => na?.scanQRFromCamera?.() },
                  { l: 'Screen Capture', I: Eye,     ok: apiCaps.screenCapture, fn: () => na?.startScreenCapture?.() },
                  { l: 'Read NFC',       I: Radio,   ok: apiCaps.webNFC, fn: () => na?.readNFC?.(d => addToast('ok', d.records?.[0]?.text || 'NFC read!')) },
                ].map(a => (
                  <button key={a.l} onClick={a.fn}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-sm transition-all active:scale-95
                      ${a.ok ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/8 border-red-500/20 text-red-400/50'}`}>
                    {a.ok ? <CheckCircle size={13} /> : <XCircle size={13} />}
                    <a.I size={13} />{a.l}
                  </button>
                ))}
              </div>
              {pickedContacts.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-white/40 text-xs mb-1">Contacts:</p>
                  {pickedContacts.map((c, i) => (
                    <div key={i} className="bg-white/5 rounded-xl px-3 py-2 flex items-center justify-between border border-white/8">
                      <div>
                        <p className="text-white text-sm font-medium">{c.name?.[0]}</p>
                        <p className="text-white/40 text-xs">{c.tel?.[0]}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => deep(`tel:${c.tel?.[0]}`, 'Call')} className="p-1.5 bg-green-500/20 rounded-lg active:scale-95"><Phone size={14} className="text-green-400" /></button>
                        <button onClick={() => deep(`whatsapp://send?phone=${(c.tel?.[0] || '').replace(/\D/g, '')}`, 'WhatsApp')} className="p-1.5 bg-emerald-600/20 rounded-lg active:scale-95"><MessageSquare size={14} className="text-emerald-400" /></button>
                        <button onClick={() => { navigator.clipboard?.writeText(c.tel?.[0] || ''); addToast('ok', 'Number copied!'); }} className="p-1.5 bg-white/10 rounded-lg active:scale-95"><Copy size={14} className="text-white/50" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}

        {/* ═══ COMMS ════════════════════════════════════════ */}
        {tab === 'comms' && (
          <>
            <Card title="WhatsApp Sender" icon={MessageSquare} color="green">
              <input value={waNum} onChange={e => setWaNum(e.target.value)}
                placeholder="Number (e.g. 919876543210)"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/25 focus:outline-none focus:border-green-500 mb-2" />
              <textarea value={waMsg} onChange={e => setWaMsg(e.target.value)}
                placeholder="Message..." rows={3}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/25 focus:outline-none focus:border-green-500 mb-2 resize-none" />
              <button onClick={sendWA} disabled={waSending || !waNum || !waMsg}
                className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-95 transition-all">
                <Send size={15} />{waSending ? 'Sending...' : 'Send WhatsApp'}
              </button>
              <p className="text-white/25 text-xs text-center mt-1.5">MacroDroid: sends silently • Without MacroDroid: WhatsApp directly khulega</p>
            </Card>

            <Card title="AI Auto-Reply" icon={Repeat} color="purple">
              <Toggle on={autoReply} onChange={v => { setAutoReply(v); localStorage.setItem('jarvis_autoreply', String(v)); }}
                label="Auto-Reply System" sub="MacroDroid notif → JARVIS → Reply" color="purple" />
              <Toggle on={aiReply} onChange={v => { setAiReply(v); localStorage.setItem('jarvis_autoreply_ai', String(v)); }}
                label="AI-Generated Replies" sub="JARVIS Groq AI reply likhega automatically" color="blue" />
              {autoReply && (
                <div className="mt-2 bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-xs text-purple-300">
                  MacroDroid: Notification Trigger → HTTP POST → apple-v10.vercel.app/api/phone
                  <br /><span className="text-white/40">Body: {"{"}"type":"autoreply","sender":"{'{'}notif_title{'}'}","message":"{'{'}notif_text{'}'}"{"}"}</span>
                </div>
              )}
            </Card>

            <Card title={`Live Notifications${notifsNew > 0 ? ` (${notifsNew} new 🔴)` : ''}`} icon={Bell} color="blue">
              <div className="flex gap-2 mb-3">
                <button onClick={() => { fetchNotifs(); setNotifsNew(0); }}
                  className="flex-1 bg-white/10 text-white/60 text-xs py-2 rounded-lg flex items-center justify-center gap-1 active:scale-95">
                  <RefreshCw size={11} /> Refresh
                </button>
                <button onClick={() => { setNotifs([]); setNotifsNew(0); }}
                  className="flex-1 bg-red-500/15 text-red-400 text-xs py-2 rounded-lg active:scale-95">Clear Local</button>
                <button onClick={() => auto(() => mb?.Notifications?.clearAll())}
                  className="flex-1 bg-orange-500/15 text-orange-400 text-xs py-2 rounded-lg active:scale-95">Clear Phone</button>
              </div>
              <div className="max-h-72 overflow-y-auto space-y-2 -mx-1 px-1">
                {notifs.length === 0
                  ? <p className="text-white/25 text-xs text-center py-6">Notifications yahan aayengi jab MacroDroid setup ho<br />(Setup tab → templates dekho)</p>
                  : notifs.map(n => (
                    <div key={n.id} className="bg-white/5 rounded-xl p-3 border border-white/8">
                      <div className="flex justify-between mb-0.5">
                        <span className="text-blue-400 text-xs font-semibold">{n.app}</span>
                        <span className="text-white/25 text-xs">{new Date(n.time).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-white text-sm leading-snug">{n.title}</p>
                      {n.text && <p className="text-white/50 text-xs mt-0.5">{n.text}</p>}
                    </div>
                  ))
                }
              </div>
            </Card>

            <Card title="Calls & SMS" icon={Phone} color="cyan" collapsed>
              <div className="grid grid-cols-3 gap-2">
                <Btn icon={Phone}    label="Call Log"  color="cyan" onClick={() => auto(() => mb?.Calls?.getCallLog())} />
                <Btn icon={PhoneOff} label="End Call"  color="red"  onClick={() => auto(() => mb?.Calls?.endCall())} />
                <Btn icon={Volume2}  label="Speaker"   color="green" onClick={() => auto(() => mb?.Calls?.speakerOn())} />
              </div>
            </Card>
          </>
        )}

        {/* ═══ STATUS ═══════════════════════════════════════ */}
        {tab === 'monitor' && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { I: Battery,  l: 'Battery', v: battery ? `${battery.level}%${battery.charging ? '⚡' : ''}` : '--', c: 'text-green-400' },
                { I: Signal,   l: 'Network', v: netInfo?.type?.toUpperCase() || '--', c: 'text-blue-400' },
                { I: Globe,    l: 'Status',  v: typeof navigator !== 'undefined' && navigator.onLine ? 'Online' : 'Offline', c: 'text-cyan-400' },
                { I: Cpu,      l: 'RAM',     v: typeof navigator !== 'undefined' && navigator.deviceMemory ? `${navigator.deviceMemory}GB` : '--', c: 'text-purple-400' },
              ].map(s => (
                <div key={s.l} className="bg-white/5 rounded-2xl border border-white/10 p-4">
                  <s.I size={17} className={s.c} />
                  <p className={`text-2xl font-bold mt-2 ${s.c}`}>{s.v}</p>
                  <p className="text-white/35 text-xs mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>

            <Card title="Browser API Support" icon={Shield} color="green">
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(apiCaps).map(([k, v]) => (
                  <div key={k} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs ${v ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/25'}`}>
                    {v ? <CheckCircle size={10} /> : <XCircle size={10} />}
                    <span className="capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Connection Test" icon={Activity} color="blue">
              <button onClick={async () => {
                addToast('info', 'Testing MacroDroid...');
                const r = await fetch(`https://trigger.macrodroid.com/${deviceId}/jarvis_ping`, { method: 'POST' }).catch(() => null);
                addToast(r?.ok ? 'ok' : 'err', r?.ok ? 'MacroDroid connected! ✅' : 'MacroDroid nahi mila — ID check karo');
              }} disabled={!deviceId}
                className="w-full bg-blue-500/20 border border-blue-500/30 text-blue-400 py-3 rounded-xl text-sm font-medium active:scale-95 mb-2 disabled:opacity-40">
                Test MacroDroid Ping
              </button>
              <button onClick={async () => {
                const r = await fetch('/api/phone').catch(() => null);
                addToast(r?.ok ? 'ok' : 'err', r?.ok ? 'JARVIS API working ✅' : 'JARVIS API error ❌');
              }} className="w-full bg-green-500/20 border border-green-500/30 text-green-400 py-3 rounded-xl text-sm font-medium active:scale-95">
                Test JARVIS API
              </button>
            </Card>
          </>
        )}

        {/* ═══ SETUP ════════════════════════════════════════ */}
        {tab === 'setup' && (
          <>
            <Card title="MacroDroid Device ID" icon={Settings} color="blue">
              <div className={`mb-3 p-3 rounded-xl border text-xs font-medium ${deviceId ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                {deviceId ? `✅ Saved: ${deviceId.slice(0, 16)}...` : '❌ ID nahi hai — setup karo'}
              </div>
              <input value={deviceId} onChange={e => setDeviceId(e.target.value)}
                placeholder="MacroDroid Device ID yahan paste karo"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-blue-500 mb-2" />
              <button onClick={saveId} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold active:scale-95 mb-3">Save Device ID</button>
              <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-xs text-white/50 space-y-1">
                <p className="text-white font-medium mb-1">Kaise milega:</p>
                <p>1. MacroDroid app kholo</p>
                <p>2. ☰ Menu → MacroDroid Webhook</p>
                <p>3. Device ID copy karo</p>
                <p>4. Upar paste karo → Save karo</p>
              </div>
            </Card>

            <Card title="MacroDroid Templates" icon={QrCode} color="orange">
              <p className="text-white/35 text-xs mb-3">Yeh 5 macros MacroDroid mein add karo — body copy karo aur HTTP POST Action mein paste karo:</p>
              {[
                { n: '🔔 Notification Reader', t: 'Any Notification Received', b: '{"type":"notification","app":"{app_name}","title":"{notif_title}","text":"{notif_text}"}' },
                { n: '💬 WhatsApp Auto-Reply', t: 'WhatsApp Notification',     b: '{"type":"autoreply","sender":"{notif_title}","message":"{notif_text}"}' },
                { n: '📞 Call Logger',         t: 'Incoming Call',             b: '{"type":"call","number":"{phone_number}","name":"{contact_name}"}' },
                { n: '🔋 Battery Alert',       t: 'Battery Level < 20%',      b: '{"type":"battery","level":"{battery_level}","charging":"{is_charging}"}' },
                { n: '🗣️ Hey JARVIS Wake',    t: 'Say "Hey JARVIS"',          b: 'Open URL: https://apple-v10.vercel.app/chat?voice=1' },
              ].map((t, i) => (
                <div key={i} className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 mb-2">
                  <div className="flex items-center justify-between">
                    <p className="text-white text-sm font-semibold">{t.n}</p>
                    <button onClick={() => { navigator.clipboard?.writeText(t.b); addToast('ok', 'Copied!'); }}
                      className="p-1.5 bg-white/10 rounded-lg active:scale-95 shrink-0"><Copy size={12} className="text-white/50" /></button>
                  </div>
                  <p className="text-orange-300 text-xs mt-0.5">Trigger: {t.t}</p>
                  <p className="text-white/30 text-xs mt-1 break-all">URL: https://apple-v10.vercel.app/api/phone</p>
                  <p className="text-white/25 text-xs mt-0.5 break-all">{t.b}</p>
                </div>
              ))}
            </Card>

            <Card title="Tasker Alternative" icon={Radio} color="purple" collapsed>
              <p className="text-white/40 text-xs mb-2">MacroDroid nahi hai? Tasker use karo (same WiFi pe kaam karta hai):</p>
              <input defaultValue={typeof localStorage !== 'undefined' ? localStorage.getItem('tasker_ip') || '' : ''}
                onChange={e => localStorage.setItem('tasker_ip', e.target.value)}
                placeholder="Phone IP (e.g. 192.168.1.5)"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/25 focus:outline-none mb-1" />
              <p className="text-white/25 text-xs">Tasker → HTTP Server plugin install karo → same WiFi required</p>
            </Card>

            <Card title="PWA → Native App" icon={Star} color="green" collapsed>
              {[
                { m: '1. PWABuilder (Recommended)', d: 'Free — website URL daal ke APK download karo. No Play Store needed.', u: 'pwabuilder.com', rec: true },
                { m: '2. WebAPK (Chrome Auto)',     d: 'Chrome Android khud banata hai agar PWA properly install ho. Zero work.', u: 'Install from Chrome → Add to Home Screen', rec: true },
                { m: '3. Bubblewrap (Google)',       d: 'Official TWA — Play Store pe publish kar sakte ho.', u: 'github.com/GoogleChromeLabs/bubblewrap', rec: false },
                { m: '4. Capacitor.js',             d: 'Ionic ka bridge — native APIs aur features milte hain.', u: 'capacitorjs.com', rec: false },
              ].map((m, i) => (
                <div key={i} className={`rounded-xl p-3 mb-2 border ${m.rec ? 'bg-green-500/10 border-green-500/20' : 'bg-white/5 border-white/10'}`}>
                  <div className="flex items-center gap-2">
                    <p className="text-white text-sm font-semibold flex-1">{m.m}</p>
                    {m.rec && <span className="text-green-400 text-xs bg-green-500/20 px-2 py-0.5 rounded-full shrink-0">Easy</span>}
                  </div>
                  <p className="text-white/45 text-xs mt-1">{m.d}</p>
                  <p className="text-blue-400 text-xs mt-1">{m.u}</p>
                </div>
              ))}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
