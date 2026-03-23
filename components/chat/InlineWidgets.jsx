'use client';
// components/chat/InlineWidgets.jsx — JARVIS Chat-First Inline Widgets
// ══════════════════════════════════════════════════════════════════════
// All widgets render INSIDE chat messages — no page navigation needed
// Triggered by: weather, calculator, timer, schedule, news, crypto, etc.
// ══════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';

// ── WEATHER WIDGET ────────────────────────────────────────────
export function WeatherWidget({ city, lat, lng }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        let la = lat, lo = lng;
        if (!la && city) {
          const g = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`).then(r=>r.json());
          la = g.results?.[0]?.latitude;
          lo = g.results?.[0]?.longitude;
        }
        if (!la) { setLoading(false); return; }
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}&current=temperature_2m,relative_humidity_2m,weathercode,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum&timezone=auto&forecast_days=5`);
        const d = await r.json();
        setData(d);
      } catch {}
      setLoading(false);
    }
    load();
  }, [city, lat, lng]);

  const wIcon = (code) => code <= 1 ? '☀️' : code <= 3 ? '⛅' : code <= 48 ? '🌫️' : code <= 67 ? '🌧️' : code <= 77 ? '❄️' : '⛈️';
  const wDesc = (code) => code <= 1 ? 'Clear' : code <= 3 ? 'Cloudy' : code <= 48 ? 'Foggy' : code <= 67 ? 'Rainy' : code <= 77 ? 'Snowy' : 'Storm';

  if (loading) return <div className="text-slate-500 text-xs py-2 animate-pulse">Weather load ho raha hai...</div>;
  if (!data) return <div className="text-slate-500 text-xs py-2">Location share karo weather ke liye</div>;

  const c = data.current;
  const days = data.daily;

  return (
    <div className="mt-2 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-600/20 to-cyan-600/10 border border-blue-500/20">
      {/* Current */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/60 text-xs">{city || 'Aapki location'}</p>
            <div className="flex items-end gap-2 mt-0.5">
              <span className="text-4xl font-black text-white">{Math.round(c.temperature_2m)}°</span>
              <span className="text-white/50 text-sm mb-1">{wDesc(c.weathercode)}</span>
            </div>
            <p className="text-white/40 text-xs mt-0.5">Humidity: {c.relative_humidity_2m}% · Wind: {c.wind_speed_10m} km/h</p>
          </div>
          <span className="text-5xl">{wIcon(c.weathercode)}</span>
        </div>
      </div>
      {/* 5-day forecast */}
      <div className="flex border-t border-white/10">
        {days.time?.slice(0,5).map((date, i) => (
          <div key={i} className="flex-1 flex flex-col items-center py-2 border-r border-white/5 last:border-0">
            <p className="text-white/40 text-[10px]">{new Date(date).toLocaleDateString('en',{weekday:'short'})}</p>
            <span className="text-lg my-0.5">{wIcon(days.weathercode?.[i] || 0)}</span>
            <p className="text-white text-[11px] font-medium">{Math.round(days.temperature_2m_max?.[i] || 0)}°</p>
            <p className="text-white/40 text-[10px]">{Math.round(days.temperature_2m_min?.[i] || 0)}°</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── TIMER WIDGET ──────────────────────────────────────────────
export function TimerWidget({ seconds: initSeconds, label }) {
  const [seconds, setSeconds] = useState(initSeconds);
  const [running, setRunning] = useState(true);
  const [done, setDone] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!running || done) return;
    ref.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          clearInterval(ref.current);
          setRunning(false);
          setDone(true);
          // Vibrate + notification
          navigator.vibrate?.([200,100,200,100,400]);
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'SHOW_NOTIFICATION',
              data: { title: '⏰ Timer Done!', body: `${label || 'Timer'} complete!`, tag: 'timer-done' }
            });
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(ref.current);
  }, [running, done]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const total = initSeconds;
  const pct = ((total - seconds) / total) * 100;

  return (
    <div className="mt-2 bg-white/5 border border-white/10 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-white/60 text-xs">{label || 'Timer'}</p>
        <p className={`text-xs font-medium ${done ? 'text-green-400' : running ? 'text-blue-400 animate-pulse' : 'text-yellow-400'}`}>
          {done ? '✅ Done!' : running ? '⏳ Running' : '⏸️ Paused'}
        </p>
      </div>
      {/* Big time display */}
      <div className="text-center mb-3">
        <span className={`text-4xl font-black tabular-nums ${done ? 'text-green-400' : 'text-white'}`}>
          {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}
        </span>
      </div>
      {/* Progress bar */}
      <div className="w-full bg-white/5 rounded-full h-2 mb-3">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 h-2 rounded-full transition-all"
          style={{width: `${pct}%`}}/>
      </div>
      {/* Controls */}
      <div className="flex gap-2">
        {!done && (
          <button onClick={() => setRunning(r => !r)}
            className="flex-1 py-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-300 text-sm font-medium active:scale-95 transition-all">
            {running ? '⏸️ Pause' : '▶️ Resume'}
          </button>
        )}
        <button onClick={() => { setSeconds(initSeconds); setRunning(true); setDone(false); }}
          className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-sm active:scale-95 transition-all">
          🔄 Reset
        </button>
      </div>
    </div>
  );
}

// ── CALCULATOR WIDGET ─────────────────────────────────────────
export function CalculatorWidget() {
  const [display, setDisplay] = useState('0');
  const [expr, setExpr] = useState('');
  const [fresh, setFresh] = useState(true);

  const press = (val) => {
    if (val === 'C') { setDisplay('0'); setExpr(''); setFresh(true); return; }
    if (val === '⌫') { setDisplay(d => d.length > 1 ? d.slice(0,-1) : '0'); return; }
    if (val === '=') {
      try {
        const result = Function('"use strict";return (' + expr + display + ')')();
        setDisplay(String(parseFloat(result.toFixed(8))));
        setExpr('');
        setFresh(true);
      } catch { setDisplay('Error'); }
      return;
    }
    if (['+','-','×','÷','%'].includes(val)) {
      const op = val === '×' ? '*' : val === '÷' ? '/' : val;
      setExpr(expr + display + op);
      setFresh(true);
      return;
    }
    if (fresh) {
      setDisplay(val === '.' ? '0.' : val);
      setFresh(false);
    } else {
      setDisplay(d => d === '0' && val !== '.' ? val : d + val);
    }
  };

  const btns = [
    ['C','⌫','%','÷'],
    ['7','8','9','×'],
    ['4','5','6','-'],
    ['1','2','3','+'],
    ['0','.','='],
  ];

  return (
    <div className="mt-2 bg-[#0a0f1a] border border-white/10 rounded-2xl overflow-hidden" style={{width:"280px",minWidth:"280px",maxWidth:"280px"}}>
      {/* Display */}
      <div className="px-4 py-3 text-right" style={{height:"76px"}}>
        <p className="text-white/30 text-xs h-4 truncate">{expr}</p>
        <p className="text-white text-3xl font-light mt-1 truncate">{display}</p>
      </div>
      {/* Buttons */}
      <div className="p-2 space-y-1.5">
        {btns.map((row, ri) => (
          <div key={ri} className={`grid gap-1.5 ${row.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
            {row.map(btn => (
              <button key={btn} onClick={() => press(btn)}
                className={`py-3 rounded-xl text-sm font-semibold active:scale-95 transition-all ${
                  ['÷','×','-','+','='].includes(btn) ? 'bg-blue-600 text-white' :
                  ['C','⌫','%'].includes(btn) ? 'bg-white/10 text-orange-300' :
                  btn === '0' ? 'col-span-1 bg-white/[0.06] text-white' :
                  'bg-white/[0.06] text-white'
                } ${btn === '0' ? 'col-span-2' : ''}`}>
                {btn}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── MINI DASHBOARD WIDGET ─────────────────────────────────────
export function DashboardWidget() {
  const [data, setData] = useState(null);

  useEffect(() => {
    // Load from localStorage
    try {
      const profile = JSON.parse(localStorage.getItem('jarvis_profile') || '{}');
      const memories = JSON.parse(localStorage.getItem('jarvis_memories') || '[]');
      const goals = JSON.parse(localStorage.getItem('jarvis_goals') || '[]');
      const convs = JSON.parse(localStorage.getItem('jarvis_conversations') || '[]');
      setData({
        name: profile.name || '',
        memories: memories.length,
        goals: goals.filter(g => !g.completed).length,
        totalGoals: goals.length,
        convs: convs.length,
        city: profile.city || '',
      });
    } catch {}
  }, []);

  const days = 0;

  return (
    <div className="mt-2 bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <p className="text-white font-bold text-sm">📊 Tera Dashboard</p>
      </div>
      <div className="grid grid-cols-2 gap-px bg-white/[0.06]">
        {[
          {label:'Goals Active', value: data ? `${data.goals}/${data.totalGoals}` : '—', icon:'🎯', color:'text-blue-400'},
          {label:'Memories Saved', value: data?.memories || '—', icon:'🧠', color:'text-purple-400'},
          {label:'Chat Sessions', value: data?.convs || '—', icon:'💬', color:'text-cyan-400'},
        ].map((item, i) => (
          <div key={i} className="bg-[#050810] px-4 py-3">
            <p className="text-white/40 text-[10px] mb-1">{item.icon} {item.label}</p>
            <p className={`text-2xl font-black ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 flex gap-2">
        <a href="/goals" className="flex-1 py-2 text-center bg-blue-600/10 border border-blue-500/20 text-blue-300 text-xs rounded-xl">🎯 Goals</a>
        <a href="/memory" className="flex-1 py-2 text-center bg-purple-600/10 border border-purple-500/20 text-purple-300 text-xs rounded-xl">🧠 Memory</a>
        <a href="/analytics" className="flex-1 py-2 text-center bg-cyan-600/10 border border-cyan-500/20 text-cyan-300 text-xs rounded-xl">📊 Analytics</a>
      </div>
    </div>
  );
}

// ── CRYPTO/GOLD WIDGET ────────────────────────────────────────
export function PriceWidget({ items = ['gold', 'bitcoin'] }) {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const result = {};
      // Bitcoin price
      if (items.includes('bitcoin') || items.includes('crypto')) {
        try {
          const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=inr,usd&include_24hr_change=true');
          const d = await r.json();
          if (d.bitcoin) result.bitcoin = { inr: d.bitcoin.inr, change: d.bitcoin.inr_24h_change?.toFixed(1) };
          if (d.ethereum) result.ethereum = { inr: d.ethereum.inr, change: d.ethereum.inr_24h_change?.toFixed(1) };
        } catch {}
      }
      // Gold/Silver from InfoBar cache
      try {
        const cached = JSON.parse(localStorage.getItem('jarvis_infobar_cache') || '{}');
        if (cached.gold10g) result.gold = { per10g: cached.gold10g };
        if (cached.silver10g) result.silver = { per10g: cached.silver10g };
      } catch {}
      setPrices(result);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="text-slate-500 text-xs py-2 animate-pulse">Prices load ho rahi hain...</div>;

  const cards = [
    prices.gold && { name: 'Gold', icon: '🥇', value: `₹${prices.gold.per10g?.toLocaleString('en-IN')}`, sub: 'per 10g', color: 'text-yellow-400' },
    prices.silver && { name: 'Silver', icon: '🥈', value: `₹${prices.silver.per10g?.toLocaleString('en-IN')}`, sub: 'per 10g', color: 'text-slate-300' },
    prices.bitcoin && { name: 'Bitcoin', icon: '₿', value: `₹${(prices.bitcoin.inr/100000).toFixed(1)}L`, sub: prices.bitcoin.change > 0 ? `+${prices.bitcoin.change}%` : `${prices.bitcoin.change}%`, color: 'text-orange-400', changeColor: prices.bitcoin.change > 0 ? 'text-green-400' : 'text-red-400' },
    prices.ethereum && { name: 'Ethereum', icon: 'Ξ', value: `₹${prices.ethereum.inr?.toLocaleString('en-IN')}`, sub: prices.ethereum.change > 0 ? `+${prices.ethereum.change}%` : `${prices.ethereum.change}%`, color: 'text-purple-400', changeColor: prices.ethereum.change > 0 ? 'text-green-400' : 'text-red-400' },
  ].filter(Boolean);

  return (
    <div className="mt-2 grid grid-cols-2 gap-2">
      {cards.map((card, i) => (
        <div key={i} className="bg-white/[0.04] border border-white/10 rounded-2xl px-3 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-lg">{card.icon}</span>
            <p className="text-white/50 text-xs">{card.name}</p>
          </div>
          <p className={`text-base font-bold ${card.color}`}>{card.value}</p>
          <p className={`text-[10px] mt-0.5 ${card.changeColor || 'text-white/30'}`}>{card.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ── REMINDER WIDGET ───────────────────────────────────────────
export function ReminderWidget({ onSet }) {
  const [time, setTime] = useState('');
  const [label, setLabel] = useState('');
  const [set, setSetDone] = useState(false);

  const handleSet = () => {
    if (!time) return;
    const [h, m] = time.split(':').map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(h, m, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const msUntil = target - now;
    const lbl = label || 'JARVIS Reminder';

    // Browser notification (works in PWA + Chrome)
    if ('Notification' in window) {
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') {
          setTimeout(() => {
            new Notification(`⏰ ${lbl}`, {
              body: `JARVIS: ${lbl} — Time ho gaya!`,
              icon: '/icons/icon-192.png',
              badge: '/icons/icon-96.png',
              vibrate: [200, 100, 200],
              tag: 'jarvis-reminder',
            });
          }, msUntil);
        }
      });
    }

    // Also try Android alarm deep link as backup
    try {
      window.location.href = `intent:#Intent;action=android.intent.action.SET_ALARM;i.android.intent.extra.ALARM_HOUR=${h};i.android.intent.extra.ALARM_MINUTES=${m};S.android.intent.extra.alarm.MESSAGE=${encodeURIComponent(lbl)};end`;
    } catch {}

    setSetDone(true);
    onSet?.({ time, label });
  };

  if (set) return (
    <div className="mt-2 bg-green-500/10 border border-green-500/20 rounded-2xl px-4 py-3">
      <p className="text-green-400 text-sm font-bold">✅ Reminder set ho gaya!</p>
      <p className="text-green-300/60 text-xs mt-1">{label || 'Reminder'} at {time}</p>
      <p className="text-slate-600 text-[10px] mt-1">Browser notification + Android alarm — dono set kiya</p>
    </div>
  );

  return (
    <div className="mt-2 bg-white/[0.04] border border-white/10 rounded-2xl p-4">
      <p className="text-white/60 text-xs mb-3">⏰ Reminder set karo</p>
      <div className="flex flex-col gap-2">
        <input type="time" value={time} onChange={e => setTime(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500/50" />
        <input type="text" value={label} onChange={e => setLabel(e.target.value)}
          placeholder="Label (e.g. Study Biology)"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/30 outline-none focus:border-blue-500/50" />
        <button onClick={handleSet} disabled={!time}
          className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium active:scale-95 transition-all disabled:opacity-40">
          Set Reminder
        </button>
      </div>
    </div>
  );
}

// ── WIDGET DETECTOR ───────────────────────────────────────────
// Returns widget type from message text
export function detectWidget(text) {
  const t = text.toLowerCase();
  if (/\bweather\b|mausam|temperature|barish/.test(t)) return 'weather';
  if (/calculator|calc\b|calculate/.test(t)) return 'calculator';
  if (/(\d+)\s*(min|minute|second|sec|ghante|hour)\s*(ka\s+)?timer/.test(t) || /timer.*(\d+)/.test(t)) return 'timer';
  if (/mera\s*(account|dashboard|stats)|dashboard\s*dikhao/.test(t)) return 'dashboard';
  if (/bitcoin|crypto|ethereum|gold\s*rate|silver\s*rate/.test(t)) return 'price';
  if (/reminder\s*set|set\s*reminder|alarm\s*set/.test(t) && !/\d{1,2}:\d{2}/.test(t)) return 'reminder';
  return null;
}

// ── PARSE TIMER SECONDS ───────────────────────────────────────
export function parseTimerSeconds(text) {
  const m = text.match(/(\d+)\s*(min|minute|second|sec|ghante|hour|hr)/i);
  if (!m) return 60;
  const n = parseInt(m[1]);
  const u = m[2].toLowerCase();
  if (u.startsWith('s')) return n;
  if (u.startsWith('h') || u === 'ghante') return n * 3600;
  return n * 60;
}
