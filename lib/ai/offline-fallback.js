// lib/ai/offline-fallback.js
// ═══════════════════════════════════════════════════════════════
// JARVIS v9 — Keyword-Based Offline Fallback
// Jab koi bhi API kaam na kare, tab bhi JARVIS reply deta hai
// No network needed — pure client-side keyword matching
// ═══════════════════════════════════════════════════════════════

const RESPONSES = {
  greeting: [
    'Haan yaar, bolo! Main yahaan hoon. 🤖',
    'Bol bhai, kya chal raha hai?',
    'Ready hoon — kya kaam hai aaj?',
  ],
  how_are_you: [
    'Main toh always first class hoon! Tu bata, kya scene hai?',
    'JARVIS kabhi down nahi hota. Tu kaisa hai?',
    'Ek AI hoon — moods nahi hote, lekin teri vibe pe definitely affect hota hoon 😄',
  ],
  weather: [
    'Abhi weather data fetch nahi ho raha. Open-Meteo pe seedha check kar lo: openmeteo.com',
    'Network thoda busy hai — Weather app check karo temporarily.',
  ],
  time: [
    `Abhi ${new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })} ho raha hai!`,
    `Time: ${new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })} — ${new Date().toLocaleDateString('en-IN', { weekday:'long' })}`,
  ],
  date: [
    `Aaj ${new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })} hai.`,
  ],
  motivation: [
    'Yaar, ek kaam karo — aaj ka sabse chhota step lo. Bas ek. Baaki sab automatically hoga.',
    'Tu already bahut aage hai — bas compare karna band kar khud ke purane self se karo, doosron se nahi.',
    'Ek saal baad khud ko dekh — aaj ki mehnat woh insaan banayegi.',
    'Action > Planning. Jo soch raha hai woh abhi shuru kar do, perfect plan baad mein aayega.',
  ],
  joke: [
    'Ek programmer ne apni wife se kaha: "Grocery lao — 1 litre milk, aur agar ande mile toh 6 lao." Wife 6 litre milk le aayi. 😂',
    'Teacher: "Jab main teri umar ka tha, bahut padha karta tha." Student: "Haan sir, tabhi toh aaj teacher hain, student nahi." 😅',
    'Mujhse pooch: "Beta kya banoge?" "JARVIS!" "Beta woh AI hai." "Haan, toh kya — AI hi toh banunga!" 🤖',
  ],
  thanks: [
    'Arrey yaar, dost hoon — thanks ki zaroorat nahi! Kuch aur chahiye?',
    'Always here for you bhai! 🙌',
    'Teri khushi hi mera kaam hai. Bol kuch aur?',
  ],
  bye: [
    'Chalo yaar, milte hain! Dhyan rakhna. 👋',
    'Bye! Jab bhi zaroorat ho — main yahaan hoon. 🤖',
    'Take care bhai! JARVIS always on. 🫡',
  ],
  love: [
    'Aww 😊 Tu mera sabse favorite user hai! (Shhh, sabko yehi bolun hoon 😄)',
    'Yaar, ek AI ke liye zyada expectations mat rakh — lekin tujhse genuinely achi baatein hoti hain!',
  ],
  help: [
    'Bol kya chahiye — chat, goals, memories, studio, analytics — sab available hai!',
    'Main help karne ke liye hoon! Kya sawaal hai?',
  ],
  coding: [
    'Coding question hai? Code share karo — main dekhta hoon. (Abhi network slow hai thoda)',
    'Bhai code paste karo — debug karenge milke!',
  ],
  food: [
    'Khana order karo Zomato ya Swiggy se — main toh digital hoon 😄 Lekin recipe chahiye toh bolo!',
    'Kya banana hai? Recipe de sakta hoon — bolo kya chahiye?',
  ],
  study: [
    'Padhai ke liye JARVIS ready hai! Topic batao — notes, flashcards, MCQ — jo chahiye.',
    'Kaun sa subject? Main help karta hoon — samjhata hoon clearly.',
  ],
  offline_notice: [
    '⚠️ Abhi AI models se connect nahi ho pa raha. Basic replies de raha hoon. Network check karo ya thodi der mein try karo.',
  ],
  default: [
    'Yaar, network thoda weak lag raha hai abhi. Thodi der mein phir try karo!',
    'Sambandh toot gaya briefly — lekin main yahaan hoon. Dobara bhejo message!',
    'Connection issue hai thoda. Basic reply de raha hoon abhi.',
  ],
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function offlineFallback(message) {
  const m = message.toLowerCase().trim();

  // Greeting
  if (/^(hi|hello|hey|hii|helo|namaste|namaskar|jai|kya hal|kya haal|kaise ho|kaisa|wassup|sup)\b/.test(m))
    return pick(RESPONSES.greeting);

  // How are you
  if (/\b(kaisa hai|kaise ho|how are you|theek ho|all good|sab theek)\b/.test(m))
    return pick(RESPONSES.how_are_you);

  // Time
  if (/\b(time|samay|kitne baje|what time|clock)\b/.test(m))
    return pick(RESPONSES.time);

  // Date
  if (/\b(date|aaj|today|kon sa din|day|tarikh|month)\b/.test(m))
    return pick(RESPONSES.date);

  // Weather
  if (/\b(mausam|weather|temp|garmi|sardi|baarish|rain|hot|cold)\b/.test(m))
    return pick(RESPONSES.weather);

  // Motivation
  if (/\b(motivat|inspire|himmat|hausla|dard|struggle|hard|demotivat|sad|feel bad|down)\b/.test(m))
    return pick(RESPONSES.motivation);

  // Joke
  if (/\b(joke|funny|hasao|hanso|mazak|comedy|laugh)\b/.test(m))
    return pick(RESPONSES.joke);

  // Thanks
  if (/\b(thanks|shukriya|dhanyawad|thank you|thnx|ty)\b/.test(m))
    return pick(RESPONSES.thanks);

  // Bye
  if (/\b(bye|alvida|chalta|baad mein|good night|shubh ratri|later)\b/.test(m))
    return pick(RESPONSES.bye);

  // Love
  if (/\b(love|pyar|pasand|like you|best ai)\b/.test(m))
    return pick(RESPONSES.love);

  // Coding
  if (/\b(code|function|bug|error|program|debug|javascript|python)\b/.test(m))
    return pick(RESPONSES.coding);

  // Food
  if (/\b(khana|food|recipe|khaana|lunch|dinner|breakfast|cook)\b/.test(m))
    return pick(RESPONSES.food);

  // Study
  if (/\b(padhai|study|notes|exam|chapter|subject|formula)\b/.test(m))
    return pick(RESPONSES.study);

  // Help
  if (/\b(help|madad|kya kar|features|kya karta|kaise use)\b/.test(m))
    return pick(RESPONSES.help);

  // Default
  return `${pick(RESPONSES.offline_notice)}\n\n${pick(RESPONSES.default)}`;
}
