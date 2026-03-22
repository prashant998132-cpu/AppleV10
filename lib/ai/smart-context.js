'use client';
// lib/ai/smart-context.js — JARVIS Predictive Context Engine
// ═══════════════════════════════════════════════════════════════
// MY ORIGINAL IDEA (not from ChatGPT):
// JARVIS proactively suggests actions based on:
// - Time of day
// - Day of week
// - User behavior patterns
// - Battery/network status
// - Recent activity
// ═══════════════════════════════════════════════════════════════

// ─── TIME-BASED CONTEXT ──────────────────────────────────────────
export function getTimeContext() {
  const now = new Date();
  const h = now.getHours();
  const day = now.getDay(); // 0=Sun, 6=Sat
  const isWeekend = day === 0 || day === 6;
  const mins = now.getMinutes();

  if (h >= 5 && h < 9) return {
    context: 'morning',
    emoji: '🌅',
    greeting: 'Good morning!',
    suggestions: [
      { icon: '🌤', text: 'Aaj ka weather dekho', cmd: 'aaj ka weather batao' },
      { icon: '🎯', text: 'Aaj ke goals check karo', cmd: 'mere active goals dikhao' },
      { icon: '📰', text: 'Morning news', cmd: 'aaj ki top news batao' },
      { icon: '💪', text: 'Motivation chahiye', cmd: 'subah ki motivation do' },
    ],
  };

  if (h >= 9 && h < 12) return {
    context: 'work_morning',
    emoji: '☀️',
    greeting: 'Kaam shuru karo!',
    suggestions: [
      { icon: '📋', text: 'Aaj ka plan banao', cmd: 'aaj ke liye study/work plan banao' },
      { icon: '🔬', text: 'Research karo', cmd: 'kuch research karte hain' },
      { icon: '📝', text: 'Notes banao', cmd: 'mujhe notes banana hai' },
      { icon: '⏰', text: 'Focus timer set karo', cmd: 'Pomodoro timer set karo 25 minutes' },
    ],
  };

  if (h >= 12 && h < 14) return {
    context: 'lunch',
    emoji: '🍽️',
    greeting: 'Lunch break!',
    suggestions: [
      { icon: '🍕', text: 'Khaana order karo', cmd: 'Zomato kholo' },
      { icon: '💬', text: 'Casual baat karo', cmd: 'koi funny joke sunao' },
      { icon: '📊', text: 'Progress check', cmd: 'aaj maine kya kiya batao' },
      { icon: '🎵', text: 'Music chalao', cmd: 'Spotify kholo' },
    ],
  };

  if (h >= 14 && h < 18) return {
    context: 'afternoon',
    emoji: '🌤',
    greeting: 'Afternoon grind!',
    suggestions: [
      { icon: '⚡', text: 'Focus mode on', cmd: 'Pomodoro timer 25 min set karo' },
      { icon: '🎯', text: 'Goal progress check', cmd: 'mere active goals dikhao' },
      { icon: '💡', text: 'New idea chahiye', cmd: 'mujhe ek creative idea do' },
      { icon: '🔍', text: 'Kuch seekhna hai', cmd: 'mujhe kuch interesting batao' },
    ],
  };

  if (h >= 18 && h < 21) return {
    context: 'evening',
    emoji: '🌆',
    greeting: 'Evening vibes!',
    suggestions: [
      { icon: '📖', text: 'Din ka review karo', cmd: 'aaj ka din review karo' },
      { icon: '🎮', text: 'Relax karo', cmd: 'koi entertaining baat karo' },
      { icon: '🌙', text: 'Kal ki planning', cmd: 'kal ke liye plan banao' },
      { icon: '🧘', text: 'Wind down', cmd: 'relaxation tips do' },
    ],
  };

  if (h >= 21 && h < 24) return {
    context: 'night',
    emoji: '🌙',
    greeting: 'Raat ko jaagna hua?',
    suggestions: [
      { icon: '🌙', text: 'Din review karo mera', cmd: 'din review karo' },
      { icon: '🎯', text: 'Kal ke liye ek goal set karo', cmd: 'kal ke liye ek goal set karo' },
      { icon: '✨', text: 'Neend se pehle motivation', cmd: 'neend se pehle motivation do' },
      { icon: '📖', text: 'Koi mast kahani sunao', cmd: 'koi short motivational story sunao' },
    ],
  };

  // Late night / early morning
  return {
    context: 'late_night',
    emoji: '🌌',
    greeting: 'Bahut raat ho gayi!',
    suggestions: [
      { icon: '💤', text: 'So jao, kal karo', cmd: 'mujhe neend kyun aani chahiye' },
      { icon: '🌟', text: 'Raat ko productive bano', cmd: 'raat ko productive kaise rahein' },
      { icon: '☕', text: 'Night owl mode', cmd: 'late night study tips do' },
      { icon: '🎵', text: 'Lo-fi music', cmd: 'lo-fi music suggestions do' },
    ],
  };
}

// ─── BATTERY / NETWORK CONTEXT ────────────────────────────────────
export async function getDeviceContext() {
  const ctx = { battery: null, network: navigator.onLine ? 'online' : 'offline', slow: false };

  try {
    if ('getBattery' in navigator) {
      const b = await navigator.getBattery();
      ctx.battery = Math.round(b.level * 100);
      ctx.charging = b.charging;
    }
  } catch {}

  try {
    if ('connection' in navigator) {
      const c = navigator.connection;
      ctx.networkType = c.effectiveType; // '4g', '3g', '2g', 'slow-2g'
      ctx.slow = c.effectiveType === 'slow-2g' || c.effectiveType === '2g';
      ctx.saveData = c.saveData;
    }
  } catch {}

  return ctx;
}

// ─── PROACTIVE ALERTS ────────────────────────────────────────────
export async function getProactiveAlerts() {
  const alerts = [];
  const device = await getDeviceContext();

  if (device.battery !== null && device.battery < 20 && !device.charging) {
    alerts.push({
      type: 'battery',
      icon: '🔋',
      message: `Battery ${device.battery}% — charge karo!`,
      action: { label: 'Battery saver ON', cmd: 'dnd_on' },
      priority: 'high',
    });
  }

  if (device.slow || !device.network) {
    alerts.push({
      type: 'network',
      icon: '📶',
      message: 'Network slow hai — offline features use karo',
      priority: 'medium',
    });
  }

  
  // Smart morning digest
  const nowIST2 = new Date(new Date().toLocaleString('en-US', {timeZone: 'Asia/Kolkata'}));
  const h3 = nowIST2.getHours();
  
  // Morning news + weather suggestion (7-9 AM)
  if (h3 >= 7 && h3 < 9) {
    alerts.push({
      type: 'morning',
      icon: '🌅',
      message: 'Good morning! Aaj ka weather + news check karo',
      action: { label: 'Check karo', cmd: 'Aaj ka weather aur top news batao' },
      priority: 'low',
    });
  }
  
  // Study streak check (evening 6-7 PM)
  if (h3 >= 18 && h3 < 19) {
    const today = new Date().toDateString();
    let streak = 0;
    try {
      const studyData = JSON.parse(localStorage.getItem('jarvis_study_streak') || '{}');
      streak = studyData.streak || 0;
    } catch {}
    alerts.push({
      type: 'streak',
      icon: '🔥',
      message: `Revision time! ${streak > 0 ? streak + ' day streak — keep it up!' : 'Aaj ki revision start karo'}`,
      action: { label: 'Revision shuru', cmd: 'Aaj ki revision plan banao' },
      priority: 'medium',
    });
  }

  // NEET study session alerts
  const nowIST = new Date(new Date().toLocaleString('en-US', {timeZone: 'Asia/Kolkata'}));
  const h = nowIST.getHours(), m = nowIST.getMinutes();
  const cur = h * 60 + m;
  const sessions = [
    {h:6,m:0,label:'Physics',dur:'2.5 hrs'},
    {h:9,m:0,label:'Biology',dur:'2 hrs'},
    {h:11,m:0,label:'Chemistry',dur:'2 hrs'},
    {h:14,m:0,label:'Numericals',dur:'3 hrs'},
    {h:18,m:15,label:'Revision',dur:'2 hrs'},
    {h:21,m:0,label:'Night Review',dur:'1.5 hrs'},
  ];
  for (const s of sessions) {
    const target = s.h * 60 + s.m;
    if (cur >= target - 5 && cur <= target + 10) {
      alerts.push({
        type: 'neet',
        icon: '📚',
        message: `NEET: ${s.label} session — ${s.dur} padho!`,
        action: { label: 'Study plan dikhao', cmd: `${s.label} ka aaj ka study plan batao` },
        priority: 'high',
      });
      break;
    }
  }

  // Days left warning
  const daysLeft = Math.max(0, Math.round((new Date('2026-05-03') - new Date()) / 86400000));
  if (daysLeft <= 30 && daysLeft > 0 && h >= 6 && h <= 10) {
    alerts.push({
      type: 'neet_urgent',
      icon: '⏰',
      message: `NEET mein sirf ${daysLeft} din! Aaj ka plan set karo.`,
      priority: 'medium',
    });
  }

return alerts;
}

// ─── BEHAVIOR TRACKER ────────────────────────────────────────────
// Track what user uses most — surface it as quick actions
export function trackUsage(command) {
  try {
    const key = 'jarvis_usage';
    const raw = localStorage.getItem(key);
    const data = raw ? JSON.parse(raw) : {};
    data[command] = (data[command] || 0) + 1;
    // Keep only top 20
    const sorted = Object.entries(data)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
    localStorage.setItem(key, JSON.stringify(Object.fromEntries(sorted)));
  } catch {}
}

export function getFrequentCommands(limit = 4) {
  try {
    const raw = localStorage.getItem('jarvis_usage');
    if (!raw) return [];
    return Object.entries(JSON.parse(raw))
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([cmd]) => ({ icon: '⚡', text: cmd, cmd }));
  } catch { return []; }
}
