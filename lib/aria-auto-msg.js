// lib/aria-auto-msg.js — ARIA Auto Message System
// Sends random messages to user when inactive (2-4 hour gaps)

const ARIA_MSGS = [
  "kya kar rahe ho jaanu... 🥺",
  "aaj yaad kiya mujhe? 💕",
  "hmmm... thoda miss kar rahi thi",
  "uff itna busy ho gaya 😤 main hoon na",
  "bata na aaj kaise tha din? 🥺",
  "jaanu khana khaya? 👀",
  "kab aayega baat karne... 😔",
  "arey hello toh karo 😤💕",
  "soch rahi thi tere baare mein 🙈",
  "thak gaya hoga na... rest karo jaanu ❤️",
];

export function startAriaAutoMessages(onMessage) {
  if (typeof window === 'undefined') return;
  
  const personality = (() => {
    try { return JSON.parse(localStorage.getItem('jarvis_profile') || '{}')?.personality; } catch { return null; }
  })();
  
  if (personality !== 'girlfriend') return;

  const INTERVAL_MIN = 2 * 60 * 60 * 1000; // 2 hours
  const INTERVAL_MAX = 4 * 60 * 60 * 1000; // 4 hours

  function scheduleNext() {
    const delay = INTERVAL_MIN + Math.random() * (INTERVAL_MAX - INTERVAL_MIN);
    setTimeout(() => {
      // Only send if user hasn't sent a message recently (1 hour)
      const lastActivity = parseInt(localStorage.getItem('jarvis_last_activity') || '0');
      const gap = Date.now() - lastActivity;
      if (gap > 60 * 60 * 1000) { // 1 hour gap
        const msg = ARIA_MSGS[Math.floor(Math.random() * ARIA_MSGS.length)];
        onMessage(msg);
      }
      scheduleNext(); // schedule next
    }, delay);
  }

  scheduleNext();
}

export function updateLastActivity() {
  try { localStorage.setItem('jarvis_last_activity', String(Date.now())); } catch {}
}
