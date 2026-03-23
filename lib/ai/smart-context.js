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
  try {
    const h = new Date().getHours();
    const neetDays = Math.max(0, Math.round((new Date('2026-05-03') - new Date()) / 86400000));
    const goals = JSON.parse(localStorage.getItem('jarvis_goals') || '[]').filter(g => g.status === 'active');
    const habits = JSON.parse(localStorage.getItem('jarvis_habits') || '[]');
    const lastActivity = parseInt(localStorage.getItem('jarvis_last_activity') || '0');
    const gapHrs = Math.floor((Date.now() - lastActivity) / 3600000);

    // NEET critical alerts
    if (neetDays <= 7 && neetDays > 0) alerts.push({ icon: '🚨', message: `NEET mein sirf ${neetDays} din baaki! Revision chal raha hai?` });
    else if (neetDays <= 30) alerts.push({ icon: '⏳', message: `NEET 2026: ${neetDays} din baaki — daily targets follow ho rahe hain?` });

    // Late night studying
    if (h >= 1 && h <= 4) alerts.push({ icon: '😴', message: 'Raat ke ' + h + ' baj rahe hain — neend lo, fresh brain zyada retain karta hai!' });

    // Goals reminder (if gap > 24h)
    if (goals.length > 0 && gapHrs > 24) {
      const g = goals[0];
      alerts.push({ icon: '🎯', message: `"${g.title?.slice(0,30)}" — ${g.progress || 0}% done. Aaj kuch progress karein?` });
    }

    // Habit reminder (evening)
    if (h >= 20 && habits.length > 0) {
      const due = habits.filter(h => !h.last_logged || new Date(h.last_logged).toDateString() !== new Date().toDateString());
      if (due.length > 0) alerts.push({ icon: '✅', message: `${due.length} habit${due.length > 1 ? 's' : ''} aaj log nahi ki — din khatam hone se pehle kar lo!` });
    }

    // Morning motivation
    if (h >= 6 && h <= 9 && goals.length === 0) {
      alerts.push({ icon: '💡', message: 'Koi goal set nahi hai abhi — Goals tab mein ek add karo!' });
    }

  } catch {}
  return alerts.slice(0, 2); // Max 2 alerts
}


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
