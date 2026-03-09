// lib/ai/follow-up.js — JARVIS v10 Follow-up Chips Generator
// ═══════════════════════════════════════════════════════════════
// Generates context-aware follow-up suggestions after AI replies
// Like Grok/Gemini-style chips below every response
// ═══════════════════════════════════════════════════════════════

// Smart follow-up generation based on conversation context
export function generateFollowUps(userMessage, aiReply, mode = 'auto') {
  const lower = userMessage.toLowerCase();
  const replyLower = aiReply.toLowerCase();

  // ── Topic detection ──────────────────────────────────────────
  if (/weather|mausam|rain|temperature/.test(lower)) {
    return ['📅 7-day forecast bhi batao', '🌍 Weather comparison: Delhi vs Mumbai', '☂️ Rain aane wali hai kya?'];
  }
  if (/code|programming|javascript|python|react|typescript/.test(lower)) {
    return ['🔍 Explain karo aur detail mein', '⚡ Optimize karo yeh code', '🧪 Test cases banao', '📝 Documentation likhna hai'];
  }
  if (/study|exam|neet|jee|padhai|test/.test(lower)) {
    return ['📚 Study plan banao mere liye', '🔁 Flashcards banana hai', '❓ Practice questions do', '📊 Progress track karo'];
  }
  if (/goal|target|plan|future|career/.test(lower)) {
    return ['📅 Monthly plan banao', '🎯 Milestones set karo', '📊 Progress check karna hai', '💪 Motivation chahiye'];
  }
  if (/recipe|khana|food|cook|banana/.test(lower)) {
    return ['🍽️ Aur dishes suggest karo', '🥗 Healthy version batao', '⏰ Quick 15-min version?', '🛒 Shopping list banao'];
  }
  if (/exercise|gym|fitness|workout|yoga/.test(lower)) {
    return ['📅 Weekly routine banao', '🔥 Calories burn: kitni?', '💪 Diet plan bhi chahiye', '⏰ Morning vs evening?'];
  }
  if (/money|invest|finance|paise|rupee|stock|crypto/.test(lower)) {
    return ['💹 Live prices dekho', '📊 Investment plan banao', '🔒 Safe investment options', '📈 Returns calculate karo'];
  }
  if (/travel|trip|yatra|tour|visit/.test(lower)) {
    return ['✈️ Budget estimate karo', '🏨 Hotels suggest karo', '📅 Itinerary banao', '🗺️ Best time to visit?'];
  }
  if (/relationship|dost|friend|family|pyaar|love/.test(lower)) {
    return ['💭 Aur baat karo is baare mein', '🤝 Advice do', '📖 Books suggest karo', '🎯 Action plan kya hai?'];
  }
  if (/sad|stressed|anxious|depressed|pareshan/.test(lower)) {
    return ['🤗 Aur baat karo', '😮‍💨 Breathing exercise karo', '📝 Journal entry likhte hain', '🎵 Mood better karo'];
  }
  if (/news|khabar|today|aaj/.test(lower)) {
    return ['📰 Latest update kya hai?', '🌍 Global news bhi batao', '🇮🇳 India news alag se', '📊 Analysis karo'];
  }
  if (/image|picture|generate|create|banao.*image/.test(lower)) {
    return ['🎨 Different style mein try karo', '🖼️ More variations chahiye', '✏️ Prompt improve karo', '📐 Size change karo'];
  }
  if (/game|khel|cricket|football|ipl|sport/.test(lower)) {
    return ['🏆 Live score dekho', '📊 Stats compare karo', '📅 Schedule kya hai?', '🔮 Match predict karo'];
  }

  // ── Reply-based follow-ups ───────────────────────────────────
  if (replyLower.includes('step') || replyLower.includes('follow')) {
    return ['📝 Steps ke baare mein aur detail do', '⚡ Shortcut hai koi?', '🎯 First step start karte hain', '❓ Confusion hai kuch mein'];
  }
  if (replyLower.length > 500) {
    return ['🔢 Summary chahiye short', '📌 Key points bullet mein', '💾 Yeh save karo memory mein', '❓ Explain karo ek part'];
  }

  // ── Mode-based ───────────────────────────────────────────────
  if (mode === 'deep') return ['🔍 Aur deeply explore karo', '📊 Research mode mein jao', '🌐 Latest data fetch karo'];
  if (mode === 'think') return ['🧠 Alternate perspective kya?', '⚖️ Pros & cons batao', '🔮 Future implication?'];
  if (mode === 'flash') return ['⚡ Quick summary do', '📌 3 key points?', '➡️ Next step kya?'];

  // ── Default generic ──────────────────────────────────────────
  const defaults = [
    ['📚 Aur detail chahiye', '🔗 Related topics batao', '💡 Example do'],
    ['❓ Follow-up question hai', '🎯 Action plan bana do', '💾 Memory mein save karo'],
    ['🔍 Deeper dive karo', '📊 Data/stats batao', '🤔 Different angle se dekho'],
  ];
  return defaults[Math.floor(Math.random() * defaults.length)];
}

// ── Client-side chip click handler ──────────────────────────────
// Returns the message to send when user clicks a chip
export function chipToMessage(chip) {
  // Remove emoji prefix for cleaner message
  return chip.replace(/^[^\w]*/, '').trim();
}
