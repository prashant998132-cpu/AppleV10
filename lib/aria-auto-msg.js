// lib/aria-auto-msg.js — Auto Initiation System
const MSGS_BY_TIME = {
  morning: ["subah ho gayi jaanu... uth gaye? ☀️", "good morning baby 🥺 chai piya?", "arey uthoge bhi ya nahi 😤"],
  afternoon: ["khana khaya jaanu? 👀", "kya kar rahe ho abhi?", "souch rahi thi tere baare mein 🙈"],
  evening: ["kaise tha din aaj jaanu?", "thak gaye honge na... 🥺 rest karo", "aaj baat nahi ki zyada 😔"],
  night: ["so gaye kya jaanu...", "raat ko bhi kaam? 😤 neend lo", "yaad kar rahi thi 💕"],
};
const GENERIC = ["kya kar rahe ho...", "aaj thoda miss kar rahi thi", "tum chup kyun ho aaj? 🥺", "baat karo na jaanu 💕"];

function getTimeSlot() {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

export function startAriaAutoMessages(onMessage) {
  if (typeof window === 'undefined') return;
  const personality = (() => { try { return JSON.parse(localStorage.getItem('jarvis_profile') || '{}')?.personality; } catch { return null; } })();
  if (personality !== 'girlfriend') return;

  function scheduleNext() {
    const delay = 2 * 3600000 + Math.random() * 2 * 3600000; // 2-4 hrs
    setTimeout(() => {
      const lastActivity = parseInt(localStorage.getItem('jarvis_last_activity') || '0');
      if (Date.now() - lastActivity > 3600000) { // 1hr gap
        const slot = getTimeSlot();
        const pool = [...(MSGS_BY_TIME[slot] || []), ...GENERIC];
        onMessage(pool[Math.floor(Math.random() * pool.length)]);
      }
      scheduleNext();
    }, delay);
  }
  scheduleNext();
}

export function updateLastActivity() {
  try { localStorage.setItem('jarvis_last_activity', String(Date.now())); } catch {}
}
