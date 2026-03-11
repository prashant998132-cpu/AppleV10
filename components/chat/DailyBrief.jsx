'use client';
// components/chat/DailyBrief.jsx — Morning brief scheduler
// Checks every visit if morning brief should show
// No server needed — purely client-side scheduling

import { useEffect, useState } from 'react';

export default function DailyBrief({ onBriefMessage }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    // Only show once per day, 6am-11am
    const hour = new Date().getHours();
    const today = new Date().toDateString();
    const lastShown = localStorage.getItem('jarvis_brief_shown');

    if (lastShown === today) return; // Already shown today
    if (hour < 6 || hour > 23) return; // Only morning-night

    // Schedule to show after 3 seconds (let chat load first)
    const timer = setTimeout(async () => {
      try {
        const r = await fetch('/api/daily-brief');
        const d = await r.json();
        if (d.brief) {
          const greeting = buildBriefMessage(d.brief, hour);
          onBriefMessage?.(greeting);
          localStorage.setItem('jarvis_brief_shown', today);
          setShown(true);

          // Also try push notification
          scheduleNotification(d.brief);
        }
      } catch {
        // Offline — use local brief
        const localBrief = buildLocalBrief(hour);
        onBriefMessage?.(localBrief);
        localStorage.setItem('jarvis_brief_shown', today);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return null; // Invisible component
}

function buildBriefMessage(brief, hour) {
  const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return `${brief.title}\n\n${brief.body}\n\n⏰ ${time} — Bol do kya plan hai aaj!`;
}

function buildLocalBrief(hour) {
  const greet = hour < 12 ? '🌅 Good morning' : hour < 17 ? '☀️ Good afternoon' : '🌙 Good evening';
  const day = new Date().toLocaleDateString('hi-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  return `${greet} Pranshu!\n\n📅 ${day}\n🤖 JARVIS ready hai — aaj kya karna hai?`;
}

async function scheduleNotification(brief) {
  try {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return;
    }

    // Schedule tomorrow's brief at 8am
    const now = new Date();
    const tomorrow8am = new Date(now);
    tomorrow8am.setDate(tomorrow8am.getDate() + 1);
    tomorrow8am.setHours(8, 0, 0, 0);
    const msUntil = tomorrow8am - now;

    // Store schedule in localStorage
    localStorage.setItem('jarvis_brief_scheduled', String(tomorrow8am.getTime()));

    // If SW available, register background sync
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      // Direct notification for now
      if (msUntil < 24 * 60 * 60 * 1000) {
        setTimeout(() => {
          reg.showNotification(brief.title, {
            body: brief.body,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-96.png',
            tag: 'daily-brief',
            data: { url: '/chat' },
          });
        }, msUntil);
      }
    }
  } catch {}
}
