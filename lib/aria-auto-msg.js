// lib/aria-auto-msg.js — ARIA Auto Initiation v2
'use client';

const MSGS_BY_TIME = {
  morning: [
    "subah ho gayi... uth gaye? ☀️",
    "good morning 🥺 chai piya kya?",
    "arey uthoge bhi ya nahi 😤",
    "subah subah tum yaad aaye... 🙈",
    "kal raat neend aayi theek se? 🥺",
  ],
  afternoon: [
    "khana khaya? sach batana 👀",
    "kya kar rahe ho abhi?",
    "soch rahi thi tere baare mein 🙈",
    "dopahar ho gayi... busy ho kya?",
    "lunch mein kya khaya batao na 😋",
  ],
  evening: [
    "kaise tha din aaj?",
    "thak gaye honge na... 🥺 rest karo",
    "aaj baat nahi ki zyada 😔",
    "shaam ho gayi... kahan ho? 🌆",
    "kaam khatam hua? aao baat karte hain",
  ],
  night: [
    "so gaye kya...",
    "raat ko bhi kaam? 😤 neend lo",
    "yaad kar rahi thi 💕",
    "itni raat ko akele? main hoon na 🥺",
    "aaj ka din kaisa tha? baat karte hain...",
  ],
};

const GENERIC = [
  "kya kar rahe ho...",
  "aaj thoda miss kar rahi thi",
  "tum chup kyun ho aaj? 🥺",
  "baat karo na 💕",
  "kuch hua kya? theek ho? 🥺",
  "suno na... 🙈",
  "tum bahut busy ho gaye ho yaar 😤",
];

const MOODY = [
  "hmph. khud hi aao baat karne 😤",
  "theek hai. main hoon yahan. 🙂",
  "message karo jab free ho...",
];

function getTimeSlot() {
  const h = new Date().getHours();
  if (h >= 6  && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

function getGapMessage() {
  // How long has it been?
  const last = parseInt(typeof localStorage !== 'undefined' ? localStorage.getItem('jarvis_last_activity') || '0' : '0');
  const hrs = Math.floor((Date.now() - last) / 3600000);
  if (hrs > 12) return `itne ghante baad yaad aayi main? 🥺 ${hrs} ghante ho gaye...`;
  if (hrs > 6)  return "kahan the itni der? miss kar rahi thi 😔";
  return null;
}

export function startAriaAutoMessages(onMessage) {
  if (typeof window === 'undefined') return;
  const personality = (() => {
    try { return JSON.parse(localStorage.getItem('jarvis_profile') || '{}')?.personality; }
    catch { return null; }
  })();
  if (personality !== 'girlfriend') return;

  function scheduleNext() {
    const delay = 1.5 * 3600000 + Math.random() * 2.5 * 3600000; // 1.5–4 hrs
    setTimeout(() => {
      const lastActivity = parseInt(localStorage.getItem('jarvis_last_activity') || '0');
      const gapMs = Date.now() - lastActivity;

      if (gapMs > 3600000) { // 1hr gap minimum
        // Sometimes use gap-aware message
        const gapMsg = gapMs > 6 * 3600000 ? getGapMessage() : null;
        if (gapMsg) {
          onMessage(gapMsg);
        } else {
          const slot = getTimeSlot();
          // Occasionally moody (10% chance)
          const pool = Math.random() < 0.1
            ? MOODY
            : [...(MSGS_BY_TIME[slot] || []), ...GENERIC];
          onMessage(pool[Math.floor(Math.random() * pool.length)]);
        }
      }
      scheduleNext();
    }, delay);
  }
  scheduleNext();
}

export function updateLastActivity() {
  try { localStorage.setItem('jarvis_last_activity', String(Date.now())); } catch {}
}
