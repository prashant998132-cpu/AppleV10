// lib/tools/category-router.js — JARVIS Category-Based Tool Routing
// ════════════════════════════════════════════════════════════════════
// AI loads only relevant category tools based on user intent
// Reduces prompt size + processing load for 100+ tool systems
// ════════════════════════════════════════════════════════════════════

// ─── CATEGORY DEFINITIONS ───────────────────────────────────────
export const TOOL_CATEGORIES = {

  weather: {
    label: '🌤 Weather',
    tools: ['get_weather', 'get_forecast'],
    triggers: ['weather', 'mausam', 'rain', 'barish', 'temperature', 'forecast',
               'sunny', 'cloudy', 'humidity', 'wind', 'storm', 'aaj ka mausam'],
  },

  time: {
    label: '⏰ Time & Date',
    tools: ['get_time', 'convert_timezone', 'days_until'],
    triggers: ['time', 'samay', 'timezone', 'date', 'tarikh', 'kitne din', 'days until',
               'kitne baje', 'time in', 'current time'],
  },

  finance: {
    label: '💰 Finance & Crypto',
    tools: ['crypto_price', 'currency_convert', 'crypto_portfolio', 'stock_info'],
    triggers: ['bitcoin', 'crypto', 'ethereum', 'price', 'rate', 'dollar', 'rupee',
               'currency', 'exchange', 'market', 'invest', 'coin', 'bnb', 'matic',
               'btc', 'eth', 'rupay', 'forex', 'share price'],
  },

  news: {
    label: '📰 News',
    tools: ['get_news', 'tech_news', 'india_news', 'headlines'],
    triggers: ['news', 'khabar', 'headlines', 'samachar', 'today news', 'latest',
               'breaking', 'update', 'aaj ki khabar'],
  },

  knowledge: {
    label: '📚 Knowledge',
    tools: ['wiki_search', 'dictionary', 'facts', 'quote', 'trivia', 'advice',
            'etymology', 'translate'],
    triggers: ['wikipedia', 'wiki', 'meaning', 'definition', 'translate', 'anuvad',
               'fact', 'quote', 'trivia', 'advice', 'explain', 'kya hai', 'what is',
               'word', 'language', 'history of', 'tell me about'],
  },

  utilities: {
    label: '🛠 Utilities',
    tools: ['calculator', 'unit_convert', 'qr_code', 'password_gen', 'color_picker',
            'text_counter', 'hash_text', 'base64_encode', 'json_format', 'regex_test',
            'url_shortener', 'uuid_gen'],
    triggers: ['calculate', 'math', 'hisab', 'convert', 'qr', 'password', 'generate',
               'count', 'characters', 'words', 'hash', 'encode', 'decode', 'format',
               'json', 'url', 'link', 'shorten', 'uuid', 'unit', 'kg', 'km', 'celsius'],
  },

  productivity: {
    label: '✅ Productivity',
    tools: ['todo_add', 'todo_list', 'todo_complete', 'reminder_set', 'note_save',
            'note_search', 'pomodoro', 'habit_track'],
    triggers: ['todo', 'task', 'kaam', 'reminder', 'yaad', 'note', 'likho', 'save',
               'pomodoro', 'timer', 'habit', 'aadat', 'schedule', 'plan'],
  },

  india: {
    label: '🇮🇳 India Services',
    tools: ['india_news', 'india_festivals', 'india_holidays', 'pnr_check',
            'ifsc_lookup', 'pin_code'],
    triggers: ['india', 'bharat', 'festival', 'tyohar', 'holiday', 'pnr', 'train',
               'ifsc', 'bank', 'pin code', 'pincode', 'diwali', 'holi', 'eid'],
  },

  media: {
    label: '🎬 Media & Entertainment',
    tools: ['image_search', 'gif_search', 'meme_gen', 'movie_info', 'music_info',
            'podcast_search'],
    triggers: ['image', 'photo', 'pic', 'gif', 'meme', 'movie', 'film', 'music',
               'song', 'gaana', 'podcast', 'entertainment', 'watch'],
  },

  health: {
    label: '💪 Health & Fitness',
    tools: ['bmi_calc', 'calorie_lookup', 'water_intake', 'exercise_info', 'meditation'],
    triggers: ['health', 'bmi', 'weight', 'calorie', 'food', 'khana', 'exercise',
               'workout', 'gym', 'water', 'meditation', 'yoga', 'diet', 'fitness'],
  },

  ai_tools: {
    label: '🤖 AI Tools',
    tools: ['summarize', 'rewrite', 'analyze_text', 'code_explain', 'code_gen',
            'email_draft', 'essay_outline'],
    triggers: ['summarize', 'summary', 'rewrite', 'improve', 'analyze', 'explain code',
               'write code', 'email', 'essay', 'draft', 'generate text'],
  },

  system: {
    label: '⚙️ System',
    tools: ['get_time', 'days_until', 'uuid_gen', 'system_status'],
    triggers: [], // always available as fallback
  },
};

// ─── INTENT → CATEGORY DETECTOR ─────────────────────────────────
export function detectCategory(message) {
  if (!message) return null;
  const lower = message.toLowerCase();

  let bestMatch = null;
  let bestScore = 0;

  for (const [catKey, cat] of Object.entries(TOOL_CATEGORIES)) {
    if (catKey === 'system') continue;
    let score = 0;
    for (const trigger of cat.triggers) {
      if (lower.includes(trigger)) {
        score += trigger.length; // longer triggers = more specific = higher score
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = catKey;
    }
  }

  return bestMatch;
}

// ─── GET TOOLS FOR CATEGORY ──────────────────────────────────────
export function getToolsForCategory(categoryKey) {
  const cat = TOOL_CATEGORIES[categoryKey];
  if (!cat) return null;
  return cat.tools;
}

// ─── GET RELEVANT TOOLS FOR MESSAGE ─────────────────────────────
// Returns array of tool names relevant to this message
// Falls back to all tools if no category detected
export function getRelevantTools(message, TOOLS) {
  const category = detectCategory(message);

  if (!category) {
    // No specific category → return all tools (full fallback)
    return Object.keys(TOOLS);
  }

  const cat = TOOL_CATEGORIES[category];
  // Relevant category + always-available system tools
  const systemTools = TOOL_CATEGORIES.system.tools;
  return [...new Set([...cat.tools, ...systemTools])];
}

// ─── FILTER TOOL REGISTRY BY CATEGORY ───────────────────────────
// Returns subset of TOOLS object for a given message
export function filterTools(message, TOOLS) {
  const relevantNames = getRelevantTools(message, TOOLS);
  const filtered = {};
  for (const name of relevantNames) {
    if (TOOLS[name]) filtered[name] = TOOLS[name];
  }
  return filtered;
}
