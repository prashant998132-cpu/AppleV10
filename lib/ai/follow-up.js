// lib/ai/follow-up.js — JARVIS v11 Follow-up Chips
// Smarter, more context-aware chips
'use client';

export function generateFollowUps(userMessage, aiReply, mode = 'auto') {
  const u = userMessage.toLowerCase();
  const a = (aiReply || '').toLowerCase();

  // ── Mode-specific ──────────────────────────────────────────
  if (mode === 'think') return ['🔁 Phir se explain karo simply', '💡 Example do', '📝 Steps mein likho'];
  if (mode === 'deep')  return ['📊 Deeper analysis chahiye', '🔍 Sources kya hain?', '⚡ Short summary do'];

  // ── ARIA girlfriend mode ───────────────────────────────────
  if (/jaanu|baby|miss|pyaar|love/.test(a)) return [];  // Don't show chips in girlfriend mode

  // ── Topics ────────────────────────────────────────────────
  if (/weather|mausam|rain|temperature/.test(u))
    return ['📅 7-day forecast', '🌍 Aur shehar ka mausam', '☂️ Rain aayegi kya?'];

  if (/code|javascript|python|react|typescript|bug|error|fix/.test(u))
    return ['🔍 Detail mein explain', '⚡ Optimize karo', '🧪 Test cases', '📝 Documentation'];

  if (/biology|genetics|cell|photosynthesis|human body/.test(u))
    return ['🔬 Diagram banao', '❓ MCQ do', '📝 Short notes', '🧠 Mnemonics'];

  if (/study|exam|padhai|syllabus/.test(u))
    return ['📚 Plan banao', '🔁 Flashcards', '❓ Questions do', '📊 Progress track'];

  if (/goal|target|plan|career|future/.test(u))
    return ['📅 Monthly breakdown', '🎯 First step kya hai?', '💪 Motivation chahiye', '📊 Track karo'];

  if (/recipe|khana|food|cook|banana/.test(u))
    return ['🍽️ Aur dishes', '🥗 Healthy version', '⏰ Quick recipe?', '🛒 Shopping list'];

  if (/exercise|gym|fitness|workout|yoga/.test(u))
    return ['📅 Weekly routine', '🔥 Calories count', '💪 Diet bhi batao', '⏰ Best time?'];

  if (/money|invest|finance|paise|stock|crypto/.test(u))
    return ['💹 Calculator use karo', '📊 Safe options', '📈 Returns estimate', '🔒 Risk kya hai?'];

  if (/travel|trip|yatra|tour|visit/.test(u))
    return ['✈️ Budget estimate', '🏨 Hotels kahan?', '📅 Itinerary banao', '🗺️ Best time?'];

  if (/sad|stressed|anxious|depressed|pareshan|thaka/.test(u))
    return ['🤗 Aur baat karo', '😮‍💨 Breathing exercise', '🎵 Mood better karo', '📝 Likh do sab'];

  if (/news|khabar|today|aaj|current/.test(u))
    return ['📰 Aur update chahiye', '🌍 Global news', '🇮🇳 India news', '📊 Analysis karo'];

  if (/timer|alarm|reminder|minute|ghante/.test(u))
    return ['⏰ 5 min timer', '⏰ 25 min Pomodoro', '🔔 Daily reminder set'];

  if (/currency|rupee|dollar|euro|convert/.test(u))
    return ['💱 Aur convert karo', '📈 Exchange rate history', '🌍 Other currencies'];

  if (/joke|funny|hasao|meme/.test(u))
    return ['😂 Ek aur joke', '🎭 Roast mode on', '😜 Dark humor chahiye'];

  if (/motivat|inspire|boost|energy/.test(u))
    return ['🔥 Aur motivation', '📚 Book suggest karo', '🎯 Goal set karo', '💪 Action plan'];

  if (/explain|kya hai|what is|samjhao|batao/.test(u))
    return ['📚 Deep dive karo', '💡 Example do', '🔍 Related topics', '📝 Notes banana'];

  if (/image|photo|picture|generate|banao/.test(u))
    return ['🎨 Studio mein jaao', '🖼️ Style change karo', '🔁 Aur generate karo'];

  // ── AI reply based ─────────────────────────────────────────
  if (/step 1|step 2|pehla|step/.test(a))
    return ['🔁 Short mein batao', '❓ Koi doubt hai', '✅ Next step kya hai?'];

  if (/recommend|suggest|option|choice/.test(a))
    return ['📊 Compare karo', '💰 Budget-friendly option', '⭐ Best wala kaunsa?'];

  // ── Context-based defaults ───────────────────────────────
  if (/price|rate|kitna|cost|paisa|rupee/.test(a)) return ['💰 Best deal kaunsa?', '📊 Compare karo', '🛒 Kahan se lu?'];
  if (/news|khabar|latest|today|aaj/.test(a)) return ['📰 Aur news batao', '🌍 Worldwide angle?', '🔍 Deep dive'];
  if (/movie|film|series|dekhe|watch/.test(a)) return ['⭐ Rating kya hai?', '🎬 Similar movies?', '📅 Kab aaya?'];
  if (/song|gaana|music|artist|gana/.test(a)) return ['🎵 Link do', '🎤 Aur songs?', '📀 Album kaunsa?'];
  if (/stock|share|nifty|sensex|invest/.test(a)) return ['📊 Aur analysis?', '📈 Trend kya hai?', '💹 Safe hai?'];
  if (/crypto|bitcoin|ethereum|coin/.test(a)) return ['📈 Chart dikhao', '💰 Buy karna chahiye?', '🔮 Future kya?'];
  if (/recipe|khana|food|cook|bana/.test(a)) return ['🍳 Step-by-step batao', '⏰ Kitna time?', '🥗 Healthy version?'];

  // ── Default ────────────────────────────────────────────────
  const defaults = [
    ['💡 Aur ideas do', '📝 Summary chahiye', '❓ Doubt clear karo'],
    ['🔁 Dobara explain', '💬 Aur baat karo', '🎯 Action plan do'],
    ['📚 Detail mein batao', '⚡ Quick version', '✅ Kya karna chahiye?'],
  ];
  return defaults[Math.floor(Math.random() * defaults.length)];
}
