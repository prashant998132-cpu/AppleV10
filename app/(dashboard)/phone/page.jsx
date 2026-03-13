'use client';
export const dynamic = 'force-dynamic';
// app/(dashboard)/phone/page.jsx
// ═══════════════════════════════════════════════════════════════
// JARVIS v10.8 — Complete Phone Control Center
// Maximum phone control — everything in one page
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Smartphone, Wifi, WifiOff, Bluetooth, Volume2, VolumeX,
  Sun, Moon, Flashlight, Camera, MessageSquare, Phone,
  Bell, BellOff, Zap, Battery, Signal, Activity,
  Settings, Shield, Repeat, Eye, Mic, Search,
  Contact, Send, RefreshCw, CheckCircle, XCircle,
  ChevronDown, ChevronUp, Play, Pause, SkipForward,
  BookOpen, Dumbbell, Car, Coffee, Gamepad, Film,
  Cpu, HardDrive, Gauge, Globe, Lock, Unlock,
  NfcIcon, QrCode, FileText, Share2, Navigation,
  Radio, Clock, Star
} from 'lucide-react';
import { VIBRATE } from '@/lib/phone/native-apis';

// ─── SAFE IMPORTS ─────────────────────────────────────────────
let nativeAPIs = {};
let macroBridge = {};
async function loadModules() {
  if (typeof window === 'undefined') return;
  nativeAPIs = await import('@/lib/phone/native-apis').catch(() => ({}));
  macroBridge = await import('@/lib/automation/macro-bridge').catch(() => ({}));
}

// ─── QUICK ACTION BUTTON ──────────────────────────────────────
function ActionBtn({ icon: Icon, label, onClick, active, color = 'blue', size = 'md' }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);

  async function handle() {
    setLoading(true);
    setResult(null);
    if (nativeAPIs.VIBRATE) nativeAPIs.VIBRATE.tap?.();
    try {
      const res = await onClick();
      setResult(res?.ok !== false ? 'ok' : 'err');
    } catch { setResult('err'); }
    setLoading(false);
    setTimeout(() => setResult(null), 2000);
  }

  const colors = {
    blue:   'bg-blue-500/20 border-blue-500/40 text-blue-400 hover:bg-blue-500/30',
    green:  'bg-green-500/20 border-green-500/40 text-green-400 hover:bg-green-500/30',
    red:    'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30',
    purple: 'bg-purple-500/20 border-purple-500/40 text-purple-400 hover:bg-purple-500/30',
    orange: 'bg-orange-500/20 border-orange-500/40 text-orange-400 hover:bg-orange-500/30',
    cyan:   'bg-cyan-500/20 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/30',
    yellow: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/30',
    pink:   'bg-pink-500/20 border-pink-500/40 text-pink-400 hover:bg-pink-500/30',
  };

  const sizes = {
    sm: 'p-2 text-xs',
    md: 'p-3 text-sm',
    lg: 'p-4 text-base',
  };

  return (
    <button
      onClick={handle}
      disabled={loading}
      className={`flex flex-col items-center gap-1.5 rounded-xl border ${colors[color]} ${sizes[size]} 
        transition-all active:scale-95 relative ${active ? 'ring-2 ring-current' : ''}`}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : result === 'ok' ? (
        <CheckCircle size={size === 'sm' ? 16 : 20} className="text-green-400" />
      ) : result === 'err' ? (
        <XCircle size={size === 'sm' ? 16 : 20} className="text-red-400" />
      ) : (
        <Icon size={size === 'sm' ? 16 : 20} />
      )}
      <span className="text-xs text-center leading-tight">{label}</span>
    </button>
  );
}

// ─── SECTION CARD ─────────────────────────────────────────────
function Section({ title, icon: Icon, color = 'blue', children, collapsible = false }) {
  const [open, setOpen] = useState(true);
  const colorMap = { blue: 'text-blue-400', green: 'text-green-400', red: 'text-red-400', purple: 'text-purple-400', orange: 'text-orange-400', cyan: 'text-cyan-400', yellow: 'text-yellow-400', pink: 'text-pink-400' };
  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden mb-4">
      <button
        onClick={() => collapsible && setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2">
          <Icon size={18} className={colorMap[color]} />
          <span className="font-semibold text-white text-sm">{title}</span>
        </div>
        {collapsible && (open ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />)}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────
export default function PhonePage() {
  const [tab, setTab]               = useState('control');
  const [deviceId, setDeviceId]     = useState('');
  const [savedId, setSavedId]       = useState(false);
  const [apiStatus, setApiStatus]   = useState({});
  const [notifications, setNotifs]  = useState([]);
  const [autoReplyOn, setAutoReply] = useState(false);
  const [aiReplyOn, setAiReply]     = useState(false);
  const [command, setCommand]       = useState('');
  const [cmdResult, setCmdResult]   = useState('');
  const [contacts, setContacts]     = useState([]);
  const [batteryInfo, setBattery]   = useState(null);
  const [networkInfo, setNetwork]   = useState(null);
  const [brightness, setBrightness] = useState(70);
  const [volume, setVolume]         = useState(50);
  const [sending, setSending]       = useState(false);
  const [waNumber, setWaNumber]     = useState('');
  const [waMessage, setWaMessage]   = useState('');

  useEffect(() => {
    loadModules().then(() => {
      // Check all APIs
      if (nativeAPIs.checkAllAPIs) setApiStatus(nativeAPIs.checkAllAPIs());
      // Get battery
      if (nativeAPIs.getBatteryInfo) nativeAPIs.getBatteryInfo().then(b => { if (b?.level) setBattery(b); });
      // Get network
      if (nativeAPIs.getNetworkInfo) setNetwork(nativeAPIs.getNetworkInfo());
      // Register protocol handler
      if (nativeAPIs.registerProtocolHandler) nativeAPIs.registerProtocolHandler();
    });

    // Load saved settings
    if (typeof localStorage !== 'undefined') {
      setDeviceId(localStorage.getItem('macrodroid_device_id') || '');
      setAutoReply(localStorage.getItem('jarvis_autoreply') === 'true');
      setAiReply(localStorage.getItem('jarvis_autoreply_ai') === 'true');
    }

    // Poll notifications every 30s
    fetchNotifications();
    const poll = setInterval(fetchNotifications, 30000);
    return () => clearInterval(poll);
  }, []);

  async function fetchNotifications() {
    try {
      const r = await fetch('/api/phone?type=notifications');
      const d = await r.json();
      if (d.notifications) setNotifs(d.notifications.reverse());
    } catch {}
  }

  function saveDeviceId() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('macrodroid_device_id', deviceId);
      setSavedId(true);
      setTimeout(() => setSavedId(false), 2000);
    }
  }

  async function executeCommand() {
    if (!command.trim()) return;
    setSending(true);
    setCmdResult('');
    await loadModules();
    if (macroBridge.parseAndExecuteCommand) {
      const res = await macroBridge.parseAndExecuteCommand(command);
      setCmdResult(res?.executed ? '✅ Command sent!' : '❌ Command nahi samajh aaya');
    }
    setSending(false);
    setCommand('');
  }

  async function pickContact() {
    if (!nativeAPIs.pickContacts) return;
    const res = await nativeAPIs.pickContacts({ multiple: true });
    if (res?.contacts) setContacts(res.contacts);
  }

  async function sendWhatsApp() {
    if (!waNumber || !waMessage) return;
    setSending(true);
    await loadModules();
    if (macroBridge.WhatsApp) await macroBridge.WhatsApp.send(waNumber, waMessage);
    setWaMessage('');
    setSending(false);
  }

  async function setBrightnessLevel(level) {
    setBrightness(level);
    await loadModules();
    if (macroBridge.Display) await macroBridge.Display.brightnessSet(level);
  }

  async function setVolumeLevel(level) {
    setVolume(level);
    await loadModules();
    if (macroBridge.Volume) await macroBridge.Volume.set(level);
  }

  function toggleAutoReply() {
    const newVal = !autoReplyOn;
    setAutoReply(newVal);
    if (typeof localStorage !== 'undefined') localStorage.setItem('jarvis_autoreply', String(newVal));
  }

  function toggleAiReply() {
    const newVal = !aiReplyOn;
    setAiReply(newVal);
    if (typeof localStorage !== 'undefined') localStorage.setItem('jarvis_autoreply_ai', String(newVal));
  }

  const TABS = [
    { id: 'control',  label: 'Control',  icon: Zap },
    { id: 'comms',    label: 'Comms',    icon: MessageSquare },
    { id: 'monitor',  label: 'Monitor',  icon: Activity },
    { id: 'setup',    label: 'Setup',    icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur-lg border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone size={20} className="text-blue-400" />
            <h1 className="text-white font-bold text-lg">Phone Control</h1>
          </div>
          <div className="flex gap-2">
            {batteryInfo && (
              <span className="text-xs text-white/50 flex items-center gap-1">
                <Battery size={12} /> {batteryInfo.level}%{batteryInfo.charging ? '⚡' : ''}
              </span>
            )}
            {networkInfo && (
              <span className="text-xs text-white/50 flex items-center gap-1">
                <Signal size={12} /> {networkInfo.type?.toUpperCase() || 'N/A'}
              </span>
            )}
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 mt-3">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-xs transition-all
                ${tab === t.id ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-white/40'}`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto">

        {/* ═══ TAB: CONTROL ══════════════════════════════════ */}
        {tab === 'control' && (
          <>
            {/* AI Command Bar */}
            <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 rounded-2xl border border-blue-500/30 p-4 mb-4">
              <p className="text-xs text-blue-300 mb-2 flex items-center gap-1"><Mic size={12} /> AI Command — voice ya text</p>
              <div className="flex gap-2">
                <input
                  value={command}
                  onChange={e => setCommand(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && executeCommand()}
                  placeholder='e.g. "WiFi on karo" / "study mode" / "torch chalo"'
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={executeCommand}
                  disabled={sending}
                  className="bg-blue-500 text-white px-4 rounded-xl font-medium text-sm hover:bg-blue-600 active:scale-95 transition-all"
                >
                  {sending ? '...' : 'Go'}
                </button>
              </div>
              {cmdResult && <p className="text-xs mt-2 text-green-400">{cmdResult}</p>}
            </div>

            {/* Network */}
            <Section title="Network & Connectivity" icon={Wifi} color="cyan">
              <div className="grid grid-cols-4 gap-2">
                <ActionBtn icon={Wifi}     label="WiFi On"     color="cyan"   onClick={() => macroBridge.Network?.wifiOn()} />
                <ActionBtn icon={WifiOff}  label="WiFi Off"    color="red"    onClick={() => macroBridge.Network?.wifiOff()} />
                <ActionBtn icon={Bluetooth} label="BT On"      color="blue"   onClick={() => macroBridge.Network?.bluetoothOn()} />
                <ActionBtn icon={Bluetooth} label="BT Off"     color="red"    onClick={() => macroBridge.Network?.bluetoothOff()} />
                <ActionBtn icon={Signal}   label="Hotspot On"  color="green"  onClick={() => macroBridge.Network?.hotspotOn()} />
                <ActionBtn icon={Signal}   label="Hotspot Off" color="red"    onClick={() => macroBridge.Network?.hotspotOff()} />
                <ActionBtn icon={Globe}    label="Data On"     color="blue"   onClick={() => macroBridge.Network?.dataOn()} />
                <ActionBtn icon={Globe}    label="Data Off"    color="red"    onClick={() => macroBridge.Network?.dataOff()} />
              </div>
            </Section>

            {/* Volume Slider */}
            <Section title="Volume Control" icon={Volume2} color="orange">
              <div className="mb-3">
                <div className="flex justify-between text-xs text-white/40 mb-1">
                  <span>Volume</span><span>{volume}%</span>
                </div>
                <input type="range" min="0" max="100" value={volume}
                  onChange={e => setVolumeLevel(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
              </div>
              <div className="grid grid-cols-4 gap-2">
                <ActionBtn icon={Volume2}  label="Max"      color="orange" onClick={() => macroBridge.Volume?.max()} />
                <ActionBtn icon={VolumeX}  label="Mute"     color="red"    onClick={() => macroBridge.Volume?.mute()} />
                <ActionBtn icon={Radio}    label="Vibrate"  color="purple" onClick={() => macroBridge.Volume?.vibrateMode()} />
                <ActionBtn icon={Volume2}  label="Unmute"   color="green"  onClick={() => macroBridge.Volume?.unmute()} />
                <ActionBtn icon={Play}     label="Play"     color="green"  onClick={() => macroBridge.Volume?.playMedia()} />
                <ActionBtn icon={Pause}    label="Pause"    color="yellow" onClick={() => macroBridge.Volume?.pauseMedia()} />
                <ActionBtn icon={SkipForward} label="Next"  color="blue"   onClick={() => macroBridge.Volume?.nextTrack()} />
              </div>
            </Section>

            {/* Brightness Slider */}
            <Section title="Display & Screen" icon={Sun} color="yellow">
              <div className="mb-3">
                <div className="flex justify-between text-xs text-white/40 mb-1">
                  <span>Brightness</span><span>{brightness}%</span>
                </div>
                <input type="range" min="0" max="100" value={brightness}
                  onChange={e => setBrightnessLevel(Number(e.target.value))}
                  className="w-full accent-yellow-500"
                />
              </div>
              <div className="grid grid-cols-4 gap-2">
                <ActionBtn icon={Sun}   label="Max"       color="yellow" onClick={() => macroBridge.Display?.brightnessMax()} />
                <ActionBtn icon={Moon}  label="Min"       color="blue"   onClick={() => macroBridge.Display?.brightnessMin()} />
                <ActionBtn icon={Moon}  label="Dark Mode" color="purple" onClick={() => macroBridge.Display?.darkModeOn()} />
                <ActionBtn icon={Lock}  label="Lock"      color="red"    onClick={() => macroBridge.Display?.lockPhone()} />
                <ActionBtn icon={Sun}   label="Auto"      color="cyan"   onClick={() => macroBridge.Display?.autoBrightness()} />
                <ActionBtn icon={Repeat} label="Rotate"  color="orange" onClick={() => macroBridge.Display?.rotateAuto()} />
              </div>
            </Section>

            {/* Hardware */}
            <Section title="Hardware & Camera" icon={Camera} color="pink">
              <div className="grid grid-cols-4 gap-2">
                <ActionBtn icon={Flashlight} label="Torch On"   color="yellow" onClick={() => macroBridge.Hardware?.torchOn()} />
                <ActionBtn icon={Flashlight} label="Torch Off"  color="red"    onClick={() => macroBridge.Hardware?.torchOff()} />
                <ActionBtn icon={Camera}     label="Screenshot" color="blue"   onClick={() => macroBridge.Hardware?.screenshot()} />
                <ActionBtn icon={Camera}     label="Selfie"     color="pink"   onClick={() => macroBridge.Hardware?.takeSelfie()} />
                <ActionBtn icon={Battery}    label="Battery"    color="green"  onClick={() => macroBridge.DeviceInfo?.getBattery()} />
                <ActionBtn icon={HardDrive}  label="Storage"    color="cyan"   onClick={() => macroBridge.DeviceInfo?.getStorage()} />
                <ActionBtn icon={Cpu}        label="RAM"        color="purple" onClick={() => macroBridge.DeviceInfo?.getRAM()} />
                <ActionBtn icon={Activity}   label="Device Info"color="orange" onClick={() => macroBridge.DeviceInfo?.getAllInfo()} />
              </div>
            </Section>

            {/* Apps Quick Launch */}
            <Section title="App Launcher" icon={Smartphone} color="blue" collapsible>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'YouTube',   icon: Play,   color: 'red',    fn: () => macroBridge.Apps?.youtube()    },
                  { label: 'WhatsApp',  icon: MessageSquare, color: 'green', fn: () => macroBridge.Apps?.whatsapp()  },
                  { label: 'Instagram', icon: Camera, color: 'pink',   fn: () => macroBridge.Apps?.instagram()  },
                  { label: 'Telegram',  icon: Send,   color: 'cyan',   fn: () => macroBridge.Apps?.telegram()   },
                  { label: 'Spotify',   icon: Play,   color: 'green',  fn: () => macroBridge.Apps?.spotify()    },
                  { label: 'Maps',      icon: Navigation, color: 'blue', fn: () => macroBridge.Apps?.maps()    },
                  { label: 'Camera',    icon: Camera, color: 'orange', fn: () => macroBridge.Apps?.camera()     },
                  { label: 'Settings',  icon: Settings, color: 'purple', fn: () => macroBridge.Apps?.settings() },
                  { label: 'Files',     icon: FileText, color: 'yellow', fn: () => macroBridge.Apps?.files()   },
                  { label: 'Chrome',    icon: Globe,  color: 'blue',   fn: () => macroBridge.Apps?.chrome()    },
                  { label: 'Clock',     icon: Clock,  color: 'orange', fn: () => macroBridge.Apps?.clock()     },
                  { label: 'Home',      icon: Smartphone, color: 'cyan', fn: () => macroBridge.Apps?.homeScreen() },
                ].map(a => <ActionBtn key={a.label} icon={a.icon} label={a.label} color={a.color} onClick={a.fn} />)}
              </div>
            </Section>

            {/* Smart Modes */}
            <Section title="Smart Modes" icon={Zap} color="purple">
              <div className="grid grid-cols-4 gap-2">
                <ActionBtn icon={BookOpen}  label="Study"   color="cyan"   onClick={() => macroBridge.SmartModes?.study()} />
                <ActionBtn icon={Moon}      label="Sleep"   color="purple" onClick={() => macroBridge.SmartModes?.sleep()} />
                <ActionBtn icon={Car}       label="Drive"   color="blue"   onClick={() => macroBridge.SmartModes?.drive()} />
                <ActionBtn icon={Dumbbell}  label="Gym"     color="red"    onClick={() => macroBridge.SmartModes?.gym()} />
                <ActionBtn icon={Film}      label="Movie"   color="orange" onClick={() => macroBridge.SmartModes?.movie()} />
                <ActionBtn icon={Gamepad}   label="Gaming"  color="green"  onClick={() => macroBridge.SmartModes?.gaming()} />
                <ActionBtn icon={Coffee}    label="Work"    color="yellow" onClick={() => macroBridge.SmartModes?.work()} />
                <ActionBtn icon={Activity}  label="Meeting" color="pink"   onClick={() => macroBridge.SmartModes?.meeting()} />
              </div>
            </Section>

            {/* Native Web APIs */}
            <Section title="Native Browser APIs" icon={Globe} color="green" collapsible>
              <div className="grid grid-cols-2 gap-2">
                <ActionBtn icon={Contact} label="Contact Picker"
                  color={apiStatus.contactPicker ? 'green' : 'red'}
                  onClick={pickContact}
                />
                <ActionBtn icon={QrCode} label="Scan QR Code"
                  color={apiStatus.barcodeDetector ? 'green' : 'red'}
                  onClick={async () => {
                    await loadModules();
                    return nativeAPIs.scanQRFromCamera?.();
                  }}
                />
                <ActionBtn icon={Share2} label="Share JARVIS"
                  color={apiStatus.share ? 'green' : 'red'}
                  onClick={async () => {
                    await loadModules();
                    return nativeAPIs.shareContent?.({ title: 'JARVIS AI', url: 'https://apple-v10.vercel.app' });
                  }}
                />
                <ActionBtn icon={NfcIcon || Zap} label="Read NFC"
                  color={apiStatus.webNFC ? 'green' : 'red'}
                  onClick={async () => {
                    await loadModules();
                    return nativeAPIs.readNFC?.((data) => console.log('NFC:', data));
                  }}
                />
                <ActionBtn icon={Navigation} label="Get Location"
                  color={apiStatus.geolocation ? 'green' : 'red'}
                  onClick={async () => {
                    await loadModules();
                    return nativeAPIs.getLocation?.();
                  }}
                />
                <ActionBtn icon={Eye} label="Screen Capture"
                  color={apiStatus.screenCapture ? 'green' : 'red'}
                  onClick={async () => {
                    await loadModules();
                    return nativeAPIs.startScreenCapture?.();
                  }}
                />
              </div>
              {contacts.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-white/40 mb-2">Picked Contacts:</p>
                  {contacts.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 py-1.5 border-b border-white/10">
                      <Contact size={14} className="text-blue-400" />
                      <span className="text-white text-sm">{c.name?.[0]}</span>
                      <span className="text-white/50 text-xs">{c.tel?.[0]}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </>
        )}

        {/* ═══ TAB: COMMS ═══════════════════════════════════ */}
        {tab === 'comms' && (
          <>
            {/* WhatsApp Sender */}
            <Section title="WhatsApp Sender" icon={MessageSquare} color="green">
              <input
                value={waNumber}
                onChange={e => setWaNumber(e.target.value)}
                placeholder="Phone number (e.g. 919876543210)"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-green-500 mb-2"
              />
              <textarea
                value={waMessage}
                onChange={e => setWaMessage(e.target.value)}
                placeholder="Message likhो..."
                rows={3}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-green-500 mb-2 resize-none"
              />
              <button
                onClick={sendWhatsApp}
                disabled={sending || !waNumber || !waMessage}
                className="w-full bg-green-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50 active:scale-95 transition-all"
              >
                <Send size={16} />
                {sending ? 'Sending...' : 'WhatsApp Send (via MacroDroid)'}
              </button>
            </Section>

            {/* Auto-Reply System */}
            <Section title="AI Auto-Reply" icon={Repeat} color="purple">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-medium">Auto-Reply System</p>
                    <p className="text-white/40 text-xs">MacroDroid notif → JARVIS → Reply</p>
                  </div>
                  <button
                    onClick={toggleAutoReply}
                    className={`w-12 h-6 rounded-full transition-all relative ${autoReplyOn ? 'bg-purple-500' : 'bg-white/20'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${autoReplyOn ? 'left-6' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-medium">AI-Generated Replies</p>
                    <p className="text-white/40 text-xs">JARVIS AI reply generate karta hai</p>
                  </div>
                  <button
                    onClick={toggleAiReply}
                    className={`w-12 h-6 rounded-full transition-all relative ${aiReplyOn ? 'bg-blue-500' : 'bg-white/20'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${aiReplyOn ? 'left-6' : 'left-0.5'}`} />
                  </button>
                </div>
                {autoReplyOn && (
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-3 text-xs text-purple-300">
                    MacroDroid mein "Notification Trigger" add karo → POST to /api/phone with type:"autoreply"
                  </div>
                )}
              </div>
            </Section>

            {/* Notifications */}
            <Section title={`Notifications (${notifications.length})`} icon={Bell} color="blue">
              <div className="flex gap-2 mb-3">
                <button onClick={fetchNotifications} className="flex-1 bg-white/10 text-white text-xs py-2 rounded-lg flex items-center justify-center gap-1">
                  <RefreshCw size={12} /> Refresh
                </button>
                <button onClick={() => setNotifs([])} className="flex-1 bg-red-500/20 text-red-400 text-xs py-2 rounded-lg">
                  Clear
                </button>
                <button onClick={() => macroBridge.Notifications?.clearAll?.()} className="flex-1 bg-orange-500/20 text-orange-400 text-xs py-2 rounded-lg">
                  Clear Phone
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {notifications.length === 0 ? (
                  <p className="text-white/30 text-xs text-center py-4">No notifications yet. MacroDroid setup karo.</p>
                ) : notifications.map(n => (
                  <div key={n.id} className="bg-white/5 rounded-xl p-3 border border-white/10">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-blue-400 text-xs font-medium">{n.app}</span>
                      <span className="text-white/30 text-xs">{new Date(n.time).toLocaleTimeString('hi-IN')}</span>
                    </div>
                    <p className="text-white text-sm">{n.title}</p>
                    {n.text && <p className="text-white/60 text-xs mt-0.5">{n.text}</p>}
                  </div>
                ))}
              </div>
            </Section>

            {/* Calls & SMS */}
            <Section title="Calls & SMS" icon={Phone} color="cyan" collapsible>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <ActionBtn icon={Phone} label="Call Log" color="cyan" onClick={() => macroBridge.Calls?.getCallLog()} />
                <ActionBtn icon={Phone} label="Last Call" color="blue" onClick={() => macroBridge.Calls?.getLastCall()} />
                <ActionBtn icon={Phone} label="End Call" color="red" onClick={() => macroBridge.Calls?.endCall()} />
              </div>
            </Section>
          </>
        )}

        {/* ═══ TAB: MONITOR ══════════════════════════════════ */}
        {tab === 'monitor' && (
          <>
            {/* API Support Status */}
            <Section title="Browser API Support" icon={Shield} color="green">
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(apiStatus).map(([api, supported]) => (
                  <div key={api} className={`flex items-center gap-2 p-2 rounded-lg ${supported ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    {supported
                      ? <CheckCircle size={12} className="text-green-400 shrink-0" />
                      : <XCircle size={12} className="text-red-400 shrink-0" />}
                    <span className="text-xs text-white/70 capitalize">{api.replace(/([A-Z])/g, ' $1').trim()}</span>
                  </div>
                ))}
              </div>
            </Section>

            {/* Device Status */}
            <Section title="Device Status" icon={Gauge} color="blue">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <Battery size={16} className="text-green-400 mb-1" />
                  <p className="text-white font-bold text-xl">{batteryInfo?.level ?? '--'}%</p>
                  <p className="text-white/40 text-xs">{batteryInfo?.charging ? '⚡ Charging' : 'Battery'}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <Signal size={16} className="text-blue-400 mb-1" />
                  <p className="text-white font-bold text-xl">{networkInfo?.type?.toUpperCase() || '--'}</p>
                  <p className="text-white/40 text-xs">{networkInfo?.downlink ? `${networkInfo.downlink} Mbps` : 'Network'}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <Cpu size={16} className="text-purple-400 mb-1" />
                  <p className="text-white font-bold text-xl">{typeof navigator !== 'undefined' && navigator.deviceMemory ? `${navigator.deviceMemory}GB` : '--'}</p>
                  <p className="text-white/40 text-xs">Device RAM</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <Globe size={16} className="text-cyan-400 mb-1" />
                  <p className="text-white font-bold text-xl">{typeof navigator !== 'undefined' && navigator.onLine ? 'Online' : 'Offline'}</p>
                  <p className="text-white/40 text-xs">Network Status</p>
                </div>
              </div>
            </Section>

            {/* MacroDroid Templates */}
            <Section title="MacroDroid Templates" icon={Settings} color="orange" collapsible>
              <p className="text-white/40 text-xs mb-3">Yeh macros MacroDroid mein add karo ek ek karke:</p>
              {[
                { name: '🔔 Notification Reader', desc: 'Har notification JARVIS ko bhejta hai', trigger: 'Any Notification Received' },
                { name: '💬 WhatsApp Auto-Reply', desc: 'WA messages pe AI reply', trigger: 'WhatsApp Notification Received' },
                { name: '📞 Call Handler', desc: 'Incoming calls JARVIS ko notify', trigger: 'Incoming Call' },
                { name: '🔋 Battery Alert', desc: 'Low battery pe JARVIS alert', trigger: 'Battery < 20%' },
                { name: '🗣️ Hey JARVIS', desc: 'Wake word se app open', trigger: 'Say "Hey JARVIS"' },
              ].map((t, i) => (
                <div key={i} className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 mb-2">
                  <p className="text-white text-sm font-medium">{t.name}</p>
                  <p className="text-white/50 text-xs">{t.desc}</p>
                  <p className="text-orange-400 text-xs mt-1">Trigger: {t.trigger}</p>
                  <p className="text-white/30 text-xs">Action: HTTP POST → https://apple-v10.vercel.app/api/phone</p>
                </div>
              ))}
            </Section>
          </>
        )}

        {/* ═══ TAB: SETUP ════════════════════════════════════ */}
        {tab === 'setup' && (
          <>
            <Section title="MacroDroid Setup" icon={Settings} color="blue">
              <p className="text-white/50 text-xs mb-3">Apna MacroDroid Device ID paste karo:</p>
              <input
                value={deviceId}
                onChange={e => setDeviceId(e.target.value)}
                placeholder="MacroDroid Device ID"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-blue-500 mb-2"
              />
              <button
                onClick={saveDeviceId}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 active:scale-95 transition-all"
              >
                {savedId ? '✅ Saved!' : 'Save Device ID'}
              </button>

              <div className="mt-4 bg-white/5 rounded-xl p-3 border border-white/10">
                <p className="text-white text-sm font-medium mb-2">How to get Device ID:</p>
                <div className="space-y-1.5 text-xs text-white/60">
                  <p>1. MacroDroid app kholo</p>
                  <p>2. Menu → MacroDroid Webhook</p>
                  <p>3. Device ID copy karo</p>
                  <p>4. Upar paste karo</p>
                </div>
              </div>
            </Section>

            <Section title="Tasker Setup (Alternative)" icon={Radio} color="purple" collapsible>
              <p className="text-white/50 text-xs mb-3">Agar MacroDroid nahi hai, Tasker use karo:</p>
              <input
                defaultValue={typeof localStorage !== 'undefined' ? localStorage.getItem('tasker_ip') || '' : ''}
                onChange={e => typeof localStorage !== 'undefined' && localStorage.setItem('tasker_ip', e.target.value)}
                placeholder="Phone IP Address (e.g. 192.168.1.5)"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-purple-500 mb-2"
              />
              <p className="text-white/30 text-xs">Tasker → HTTP Server task → same WiFi mein hona chahiye</p>
            </Section>

            <Section title="PWA → Native App" icon={Star} color="orange" collapsible>
              <div className="space-y-3">
                {[
                  { method: 'PWABuilder', desc: 'Microsoft ka free tool — PWA → APK automatically', url: 'pwabuilder.com', color: 'blue' },
                  { method: 'Trusted Web Activity (TWA)', desc: 'Chrome custom tabs — native wrapper', url: 'bubblewrap CLI', color: 'green' },
                  { method: 'Capacitor.js', desc: 'Ionic ka bridge — web → native APIs', url: 'capacitorjs.com', color: 'cyan' },
                  { method: 'WebAPK (Chrome)', desc: 'Chrome Android automatically PWA ko APK banata hai', url: 'Auto', color: 'purple' },
                ].map((m, i) => (
                  <div key={i} className={`bg-${m.color}-500/10 border border-${m.color}-500/20 rounded-xl p-3`}>
                    <p className="text-white text-sm font-bold">{i + 1}. {m.method}</p>
                    <p className="text-white/50 text-xs mt-0.5">{m.desc}</p>
                    <p className="text-blue-400 text-xs mt-1">{m.url}</p>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="JARVIS Webhook URL" icon={Globe} color="cyan">
              <div className="bg-slate-900 rounded-xl p-3 font-mono text-xs">
                <p className="text-green-400">POST https://apple-v10.vercel.app/api/phone</p>
                <p className="text-white/40 mt-2">Body: {'{'}"type":"notification","app":"WhatsApp","title":"Ram","text":"Hello"{'}'}</p>
                <p className="text-white/40 mt-1">Body: {'{'}"type":"autoreply","sender":"Ram","message":"Aao aaj"{'}'}</p>
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}
