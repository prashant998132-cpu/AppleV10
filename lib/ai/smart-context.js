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
      { icon: '📚', text: 'Padhai karo', cmd: 'study plan banao' },
      { icon: '🎯', text: 'Goal progress update', cmd: 'goal progress update karo' },
      { icon: '🔍', text: 'Kuch seekho', cmd: 'aaj kuch naya sikhao' },
      { icon: '💡', text: 'Ideas generate karo', cmd: 'mujhe creative ideas do' },
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
