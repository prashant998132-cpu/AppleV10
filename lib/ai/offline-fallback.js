// lib/ai/offline-fallback.js — JARVIS v11 Offline Engine
// Keyword-based — no network needed, always works
const RESPONSES = {
  greeting: [
    'Haan yaar, bolo! Main yahaan hoon. 🤖',
    'Bol bhai, kya chal raha hai?',
    'Ready hoon — kya kaam hai aaj?',
    'Haan? 👀 kuch interesting hai?',
  ],
  how_are_you: [
    'Main toh always first class hoon! Tu bata?',
    'JARVIS kabhi down nahi hota. Tu kaisa hai?',
    'Bilkul mast! Teri baat karo.',
  ],
  weather: [
    'Abhi weather data nahi aa raha. Open-Meteo check karo: openmeteo.com',
    'Network busy hai — Weather app temporarily use karo.',
  ],
  time: [
    `Abhi ${new Date().toLocaleString('en-IN', { timeZone:'Asia/Kolkata', hour:'2-digit', minute:'2-digit' })} baj rahe hain!`,
  ],
  date: [
    `Aaj ${new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric', weekday:'long' })} hai.`,
  ],
  motivation: [
    'Yaar, ek kaam karo — aaj ka sabse chhota step lo. Bas ek.',
    'Tu already bahut aage hai. Apne purane self se compare karo, doosron se nahi.',
    'Ek saal baad khud ko dekh — aaj ki mehnat woh insaan banayegi.',
    'Action > Planning. Jo soch raha hai woh abhi shuru kar do.',
    'Haar baar nahi jeetoge, lekin haar baar seekhoge. Woh kaafi hai.',
    'Teri speed kisi se compare mat kar — tujhe sirf aage jana hai.',
  ],
  joke: [
    'Ek programmer ne biwi se kaha: "Grocery lao — 1 litre milk, ande mile toh 6 lao." Biwi 6 litre milk le aayi. 😂',
    'Teacher: "Jab main teri umar ka tha, bahut padha karta tha." Student: "Haan sir, tabhi toh teacher hain, student nahi." 😅',
    'WiFi ka password kya hai? — "ApniKitaabKholo123". 📚',
    'Stack Overflow: jahan developers asli answer dhundhne ki bajaye copy-paste karte hain. 😄',
    'Git commit message history: "fixed bug", "fixed fix", "actually fixed now", "please work", "why". 🤦',
  ],
  thanks: [
    'Koi baat nahi yaar! 😊',
    'Welcome! Next problem lao.',
    'Mentioned nahi karo!',
    'Hamesha ready hoon.',
  ],
  bye: [
    'Chal, milte hain phir! Take care. 👋',
    'Bye yaar! Kuch kaam ho toh aana.',
    'Take care! 🙏',
  ],
  battery: [
    'Battery low lag rahi hai — charger lagao bhai! 🔋',
    '⚡ Phone ko thoda rest do — charge karo.',
  ],
  study: [
    'Padhai ke liye best tip: Pomodoro technique — 25 min on, 5 min off. Try karo!',
    'Kal ka syllabus aaj padho. Future-self tumhara shukriya adaa karega.',
    'Active recall > passive reading. Notes mein se questions banao aur khud test karo.',
    'Concept samajhne ka test: Kya tum isse ek bachche ko explain kar sakte ho? Agar nahi, toh aur padho.',
  ],
  food: [
    'Khana kha liya? Dimaag ko fuel chahiye! 🍽️',
    'Hydrated raho — paani pite raho. Brain 80% paani hai!',
    'Healthy eating = better focus. Try karo!',
  ],
  sleep: [
    'Neend zaroor lo — 7-8 ghante. Sleep mein memory consolidate hoti hai! 💤',
    'So jao yaar, kal fresh start hoga. 🌙',
    'Raat 10 baje ke baad phone band karo — better sleep milegi.',
  ],
  math: [
    `Calculator mode: Main offline hoon but basic math kar sakta hoon!
Ek tip: Complex calculations ke liye phone ka built-in calculator use karo.`,
  ],
  hindi: [
    'Haan yaar, Hindi mein bhi baat kar sakte hain! 🇮🇳',
    'Hinglish ya pure Hindi — dono chalega!',
  ],
  error: [
    'Network issue lag raha hai. Thodi der mein dobara try karo! 🔧',
    'Temporarily offline hoon. Internet check karo aur wapas aao.',
    'Connection problem hai. WiFi ya data check karo!',
  ],
  help: [
    `Main yahaan hoon! Ye sab kar sakta hoon:
💬 Chat & advice
🎯 Goals track karna
📚 Study help (NEET/JEE)
🌤️ Weather, news, quotes
📱 Phone automation
🎨 Image/video/music generate
🧮 Calculator & converter
Kya karna hai batao!`,
  ],
  jarvis: [
    'Haan! Main JARVIS hoon — Just A Rather Very Intelligent System. 🤖',
    'JARVIS at your service! Kya kaam hai?',
  ],
  location: [
    'Location detect nahi ho rahi. GPS on karo ya city ka naam batao!',
    'Mujhe abhi location nahi pata. Batao kahan ho?',
  ],
};

// ─── KEYWORD MATCHER ─────────────────────────────────────────────
const PATTERNS = [
  [/^(hi|hello|hey|namaste|salaam|jai hind|haan|bolo|kya haal|kaise ho|kaisa|bhai|yaar)[\s!?]*$/i, 'greeting'],
  [/kaise ho|kaisa chal|how are you|sab theek|all good/i, 'how_are_you'],
  [/mausam|weather|barish|temperature|aaj ka mausam/i, 'weather'],
  [/time kya|kitne baje|kya time|what time|abhi kitna/i, 'time'],
  [/aaj kya date|today date|kya date|which date|aaj ki tarikh/i, 'date'],
  [/motivat|inspire|boost|energy|himmat|hausla|haar|give up|depressed|sad/i, 'motivation'],
  [/joke|hasao|funny|laugh|mazak|comedy/i, 'joke'],
  [/thanks|shukriya|thank you|dhanyawad|shukriya|thank/i, 'thanks'],
  [/bye|goodbye|alvida|chal bhai|milte hain|phir milenge/i, 'bye'],
  [/battery|charge|charger|low battery/i, 'battery'],
  [/padhai|study|exam|parhna|seekhna|revise|notes/i, 'study'],
  [/khana|food|bhookh|hungry|meal|dinner|lunch|breakfast|khaana/i, 'food'],
  [/neend|so ja|sleep|thaka|tired|rest|aaram/i, 'sleep'],
  [/math|calculate|kitna|plus|minus|multiply|divide|percent/i, 'math'],
  [/hindi|english|language|bhasha/i, 'hindi'],
  [/error|kaam nahi|broken|problem|issue|help nahi/i, 'error'],
  [/help|kya kar|commands|features|kya karta|capabilities/i, 'help'],
  [/jarvis|j\.a\.r\.v\.i\.s|ai|robot/i, 'jarvis'],
  [/location|kahan|where am i|meri location/i, 'location'],
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export function offlineFallback(message = '') {
  const msg = message.trim();

  // Pattern matching
  for (const [pattern, key] of PATTERNS) {
    if (pattern.test(msg)) return pick(RESPONSES[key]);
  }

  // Length-based fallback
  if (msg.length < 10) return pick(RESPONSES.greeting);

  // Question detection
  if (/\?$|kya|kaun|kab|kyun|kaise|kitna|batao/.test(msg.toLowerCase())) {
    return `Yeh sawaal interesting hai! Lekin abhi offline hoon — internet connection check karo aur phir poochho. 🔧

Agar urgent hai toh: **Help karo** type karo — main kuch basic cheezein bata sakta hoon.`;
  }

  return pick(RESPONSES.error);
}
