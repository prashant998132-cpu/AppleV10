'use client';
// components/pwa/SmartNotifications.jsx
// ══════════════════════════════════════════════════════════════
// JARVIS proactively notifies user — bina user ke pooche!
// - Goal reminders
// - Battery warnings
// - Daily brief (morning)
// - Inactivity nudge ("Aaj kuch productive karo?")
// - Weather-based suggestions
// All FREE — uses Web Push API
// ══════════════════════════════════════════════════════════════

import { useEffect, useRef } from 'react';

const STORAGE_KEY = 'jarvis_notif_state';

function getStoredState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}
function saveState(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...getStoredState(), ...data })); }
  catch {}
}

// ─── Convert VAPID public key to Uint8Array ───────────────────
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

// ─── Subscribe to push ────────────────────────────────────────
async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

  try {
    // Get VAPID public key
    const keyRes = await fetch('/api/push');
    const { publicKey, ready } = await keyRes.json();
    if (!ready || !publicKey) return false;

    const reg = await navigator.serviceWorker.ready;

    // Check if already subscribed
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      // Re-register with server
      await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'subscribe', subscription: existing }),
      });
      return true;
    }

    // New subscription
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'subscribe', subscription }),
    });

    saveState({ subscribed: true, subscribedAt: Date.now() });
    return true;
  } catch { return false; }
}

// ─── Send notification via API ────────────────────────────────
async function sendNotification(title, body, url = '/chat', tag = 'jarvis') {
  try {
    await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send', title, body, url, tag }),
    });
  } catch {}
}

// ─── Proactive notification rules ────────────────────────────
async function runProactiveChecks() {
  const state = getStoredState();
  const now = Date.now();
  const h = new Date().getHours();

  // 1. Morning brief (7-8 AM, once per day)
  const todayKey = new Date().toDateString();
  if (h >= 7 && h < 9 && state.lastMorningBrief !== todayKey) {
    await sendNotification(
      '🌅 JARVIS Morning Brief',
      'Subah ho gayi! Aaj ka plan ready karna hai? Tap karo.',
      '/chat',
      'morning_brief'
    );
    saveState({ lastMorningBrief: todayKey });
  }

  // 2. Evening goal check (7-8 PM, once per day)
  if (h >= 19 && h < 20 && state.lastEveningCheck !== todayKey) {
    await sendNotification(
      '🎯 Goal Check-in',
      'Shaam ho gayi — aaj ke goals pe kuch progress hua? JARVIS se baat karo.',
      '/chat',
      'goal_check'
    );
    saveState({ lastEveningCheck: todayKey });
  }

  // 3. Inactivity nudge (if not used for 12+ hours, 11 AM - 9 PM)
  const lastActive = state.lastActiveTime || now;
  const inactiveMins = (now - lastActive) / 1000 / 60;
  if (inactiveMins > 720 && h >= 11 && h <= 21 && state.lastInactivityNudge !== todayKey) {
    await sendNotification(
      '🤖 JARVIS yahan hai!',
      `Ek kaam karo aaj — chhota sa. Main hoon na. Tap karo.`,
      '/chat',
      'nudge'
    );
    saveState({ lastInactivityNudge: todayKey });
  }

  // 4. Study reminder (if goals contain study-related)
  // This runs only if it's been 2+ hours since last study reminder
  if (h >= 10 && h <= 22) {
    const lastStudyReminder = state.lastStudyReminder || 0;
    if (now - lastStudyReminder > 7200000) { // 2 hours
      try {
        const goalsRes = await fetch('/api/goals?status=active&limit=3');
        const { goals } = await goalsRes.json();
        const studyGoal = goals?.find(g =>
          /study|padhai|exam|neet|jee|board|course|learn/i.test(g.title || '')
        );
        if (studyGoal) {
          await sendNotification(
            `📚 ${studyGoal.title}`,
            `Yaad hai na? Thoda padh lo. JARVIS help karega.`,
            '/chat',
            'study_reminder'
          );
          saveState({ lastStudyReminder: now });
        }
      } catch {}
    }
  }
}

// ─── MAIN COMPONENT ──────────────────────────────────────────
export default function SmartNotifications() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Track activity
    saveState({ lastActiveTime: Date.now() });

    const init = async () => {
      // Ask permission first time
      if (Notification.permission === 'default') {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') return;
      }
      if (Notification.permission !== 'granted') return;

      // Subscribe to push
      await subscribeToPush();

      // Run proactive checks
      await runProactiveChecks();
    };

    // Delay to not block page load
    setTimeout(init, 3000);

    // Update activity timestamp on user interaction
    const updateActivity = () => saveState({ lastActiveTime: Date.now() });
    window.addEventListener('click', updateActivity, { passive: true });
    window.addEventListener('keydown', updateActivity, { passive: true });

    return () => {
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('keydown', updateActivity);
    };
  }, []);

  return null; // Invisible component
}
