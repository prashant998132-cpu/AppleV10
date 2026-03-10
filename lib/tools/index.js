// lib/tools/index.js — JARVIS v10.2 Tools Engine
// ═══════════════════════════════════════════════════════════════
// Smart Tool System:
//   • Cache Layer — weather 10min, crypto 30s, wiki 24h etc.
//   • Local Tools — calculator, converter, qr etc. = 0 API calls
//   • Category Router — AI loads only relevant tools
// Free sources: Open-Meteo, Wikipedia, CoinGecko, NewsData etc.
// ═══════════════════════════════════════════════════════════════
import { withCache } from '../cache/index.js';
import { isLocalTool, executeLocalTool } from './local-tools.js';
// ═══════════════════════════════════════════════════════════════

// ─── TOOL REGISTRY ──────────────────────────────────────────────
export const TOOLS = {
  // 🌤 WEATHER (2)
  get_weather: {
    category: 'Weather', icon: '🌤', free: true,
    desc: 'Current weather for any city',
    params: ['city'],
  },
  get_forecast: {
    category: 'Weather', icon: '📅', free: true,
    desc: '7-day weather forecast',
    params: ['city'],
  },

  // ⏰ TIME (3)
  get_time: {
    category: 'Time', icon: '⏰', free: true,
    desc: 'Current time in any timezone',
    params: ['timezone'],
  },
  convert_timezone: {
    category: 'Time', icon: '🌍', free: true,
    desc: 'Convert time between timezones',
    params: ['time', 'from_tz', 'to_tz'],
  },
  days_until: {
    category: 'Time', icon: '📆', free: true,
    desc: 'Days until a date or event',
    params: ['date'],
  },

  // 📚 KNOWLEDGE (8)
  wiki_search: {
    category: 'Knowledge', icon: '📖', free: true,
    desc: 'Wikipedia search and summary',
    params: ['query'],
  },
  dictionary: {
    category: 'Knowledge', icon: '📝', free: true,
    desc: 'Word definition, pronunciation, examples',
    params: ['word', 'language?'],
  },
  translate: {
    category: 'Knowledge', icon: '🌐', free: true,
    desc: 'Translate text between languages',
    params: ['text', 'target_language'],
  },
  facts: {
    category: 'Knowledge', icon: '💡', free: true,
    desc: 'Random interesting facts',
    params: ['topic?'],
  },
  quote: {
    category: 'Knowledge', icon: '💬', free: true,
    desc: 'Inspirational or topic-based quotes',
    params: ['topic?', 'author?'],
  },
  trivia: {
    category: 'Knowledge', icon: '🎯', free: true,
    desc: 'Random trivia questions',
    params: ['category?'],
  },
  advice: {
    category: 'Knowledge', icon: '🤝', free: true,
    desc: 'Life advice and tips',
    params: ['topic?'],
  },
  etymology: {
    category: 'Knowledge', icon: '🔤', free: true,
    desc: 'Word origin and history',
    params: ['word'],
  },

  // 📰 NEWS (3)
  get_news: {
    category: 'News', icon: '📰', free: true,
    desc: 'Latest top news headlines',
    params: ['category?', 'country?'],
  },
  tech_news: {
    category: 'News', icon: '💻', free: true,
    desc: 'Latest technology news',
    params: [],
  },
  india_news: {
    category: 'News', icon: '🇮🇳', free: true,
    desc: 'India-specific news',
    params: [],
  },

  // 🖼 IMAGE GEN (3)
  generate_image: {
    category: 'Image', icon: '🎨', free: true,
    desc: 'Generate AI image (Pollinations free)',
    params: ['prompt', 'model?', 'width?', 'height?'],
  },
  enhance_prompt: {
    category: 'Image', icon: '✨', free: true,
    desc: 'Enhance image prompt for better results',
    params: ['prompt'],
  },
  image_styles: {
    category: 'Image', icon: '🖌', free: true,
    desc: 'Get available image generation styles',
    params: [],
  },

  // 🔧 UTILITY (5)
  qr_code: {
    category: 'Utility', icon: '📱', free: true,
    desc: 'Generate QR code for URL or text',
    params: ['text', 'size?'],
  },
  url_shortener: {
    category: 'Utility', icon: '🔗', free: true,
    desc: 'Shorten a long URL',
    params: ['url'],
  },
  password_gen: {
    category: 'Utility', icon: '🔑', free: true,
    desc: 'Generate secure password',
    params: ['length?', 'include_symbols?'],
  },
  unit_convert: {
    category: 'Utility', icon: '📏', free: true,
    desc: 'Convert between units (km/mi, kg/lb, °C/°F, etc.)',
    params: ['value', 'from_unit', 'to_unit'],
  },
  bmi_calc: {
    category: 'Utility', icon: '⚖️', free: true,
    desc: 'Calculate BMI and health status',
    params: ['weight_kg', 'height_cm'],
  },

  // 💰 FINANCE (3)
  crypto_price: {
    category: 'Finance', icon: '₿', free: true,
    desc: 'Cryptocurrency prices (Bitcoin, ETH, etc.)',
    params: ['coin?'],
  },
  currency_convert: {
    category: 'Finance', icon: '💱', free: true,
    desc: 'Currency conversion (INR, USD, EUR...)',
    params: ['amount', 'from_currency', 'to_currency'],
  },
  stock_quote: {
    category: 'Finance', icon: '📈', free: true,
    desc: 'Stock price and basic info',
    params: ['symbol'],
  },

  // 🎮 ENTERTAINMENT (6)
  meme: {
    category: 'Entertainment', icon: '😂', free: true,
    desc: 'Random meme from Reddit',
    params: ['category?'],
  },
  anime_quote: {
    category: 'Entertainment', icon: '⛩️', free: true,
    desc: 'Famous anime quotes',
    params: [],
  },
  cocktail: {
    category: 'Entertainment', icon: '🍹', free: true,
    desc: 'Random cocktail recipe',
    params: ['name?'],
  },
  tv_shows: {
    category: 'Entertainment', icon: '📺', free: true,
    desc: 'TV show info and recommendations',
    params: ['title?', 'genre?'],
  },
  random_gif: {
    category: 'Entertainment', icon: '🎬', free: true,
    desc: 'Random or searched GIF',
    params: ['query?'],
  },
  riddle: {
    category: 'Entertainment', icon: '🧩', free: true,
    desc: 'Random riddle to solve',
    params: [],
  },

  // 🎓 EDUCATION (4)
  math_solve: {
    category: 'Education', icon: '🧮', free: true,
    desc: 'Solve math problems step by step',
    params: ['expression'],
  },
  periodic_table: {
    category: 'Education', icon: '⚗️', free: true,
    desc: 'Element info from periodic table',
    params: ['element'],
  },
  country_info: {
    category: 'Education', icon: '🗺️', free: true,
    desc: 'Country details: capital, population, etc.',
    params: ['country'],
  },
  age_calc: {
    category: 'Education', icon: '🎂', free: true,
    desc: 'Calculate exact age from birthdate',
    params: ['birthdate'],
  },

  // 🇮🇳 INDIA SPECIFIC (5)
  fuel_price: {
    category: 'India', icon: '⛽', free: true,
    desc: 'Current petrol/diesel prices in Indian cities',
    params: ['city?'],
  },
  india_holiday: {
    category: 'India', icon: '🎉', free: true,
    desc: 'Indian public holidays and festivals',
    params: ['year?', 'state?'],
  },
  ipl_score: {
    category: 'India', icon: '🏏', free: true,
    desc: 'Live IPL cricket scores',
    params: [],
  },
  govt_schemes: {
    category: 'India', icon: '🏛️', free: true,
    desc: 'Indian government schemes info',
    params: ['category?'],
  },
  india_festivals: {
    category: 'India', icon: '🪔', free: true,
    desc: 'Upcoming Indian festivals and celebrations',
    params: [],
  },

  // 🔭 SCIENCE (2)
  nasa_apod: {
    category: 'Science', icon: '🚀', free: true,
    desc: 'NASA Astronomy Picture of the Day',
    params: [],
  },
  space_news: {
    category: 'Science', icon: '🌌', free: true,
    desc: 'Latest space and science news',
    params: [],
  },

  // 💻 SOCIAL/DEV (3)
  github_trending: {
    category: 'Social', icon: '🐙', free: true,
    desc: 'GitHub trending repositories',
    params: ['language?', 'period?'],
  },
  devto_posts: {
    category: 'Social', icon: '👾', free: true,
    desc: 'Top dev.to articles',
    params: ['tag?'],
  },
  npm_package: {
    category: 'Social', icon: '📦', free: true,
    desc: 'NPM package info and stats',
    params: ['package_name'],
  },

  // 🎨 CREATIVITY (3)
  color_palette: {
    category: 'Creativity', icon: '🎨', free: true,
    desc: 'Generate color palette from a keyword',
    params: ['theme'],
  },
  haiku: {
    category: 'Creativity', icon: '🌸', free: true,
    desc: 'Generate a haiku poem',
    params: ['theme?'],
  },
  story_starter: {
    category: 'Creativity', icon: '📜', free: true,
    desc: 'Random story opening lines',
    params: ['genre?'],
  },

  // 📋 PRODUCTIVITY (4)
  todo_manage: {
    category: 'Productivity', icon: '✅', free: true,
    desc: 'Add, list, complete todos',
    params: ['action', 'item?'],
  },
  reminder_set: {
    category: 'Productivity', icon: '⏰', free: true,
    desc: 'Set a browser reminder',
    params: ['message', 'time'],
  },
  habit_track: {
    category: 'Productivity', icon: '🔥', free: true,
    desc: 'Track daily habits and streaks',
    params: ['habit', 'action?'],
  },
  goal_track: {
    category: 'Productivity', icon: '🎯', free: true,
    desc: 'Set and track personal goals',
    params: ['goal', 'action?'],
  },

  // 🎲 FUN (3)
  truth_dare: {
    category: 'Fun', icon: '🎲', free: true,
    desc: 'Truth or dare questions',
    params: ['type?'],
  },
  would_you_rather: {
    category: 'Fun', icon: '🤔', free: true,
    desc: 'Would you rather scenarios',
    params: [],
  },
  pickup_line: {
    category: 'Fun', icon: '😏', free: true,
    desc: 'Random pickup line (harmless fun)',
    params: [],
  },

  // 🏥 HEALTH (2)
  nutrition_info: {
    category: 'Health', icon: '🥗', free: true,
    desc: 'Nutrition info for any food',
    params: ['food'],
  },
  calorie_calc: {
    category: 'Health', icon: '🔥', free: true,
    desc: 'Estimate calories burned by activity',
    params: ['activity', 'duration_min', 'weight_kg?'],
  },

  // 📍 LOCATION (2)
  get_location: {
    category: 'Location', icon: '📍', free: true,
    desc: 'Get weather and info for current location',
    params: [],
  },
  nearby_places: {
    category: 'Location', icon: '🗺️', free: true,
    desc: 'Find nearby places by type',
    params: ['type', 'city?'],
  },

  // 🏏 SPORTS (2)
  cricket_score: {
    category: 'Sports', icon: '🏏', free: true,
    desc: 'Live cricket scores and match info',
    params: [],
  },
  football_result: {
    category: 'Sports', icon: '⚽', free: true,
    desc: 'Football/soccer results',
    params: ['league?'],
  },

  // 🎬 VIDEO (1)
  youtube_search: {
    category: 'Video', icon: '▶️', free: true,
    desc: 'Search YouTube and get video links',
    params: ['query'],
  },
  // 🎬 YOUTUBE (3)
  youtube_search: {
    category: 'YouTube', icon: '🎬', free: false, key: 'YOUTUBE_API_KEY',
    desc: 'Search YouTube videos',
    params: ['query', 'max_results?'],
  },
  youtube_trending: {
    category: 'YouTube', icon: '🔥', free: false, key: 'YOUTUBE_API_KEY',
    desc: 'Trending videos in India',
    params: [],
  },
  youtube_channel: {
    category: 'YouTube', icon: '📺', free: false, key: 'YOUTUBE_API_KEY',
    desc: 'Get YouTube channel info',
    params: ['channel_id'],
  },

  // 💬 MESSAGING (4)
  discord_message: {
    category: 'Messaging', icon: '💬', free: false, key: 'DISCORD_WEBHOOK',
    desc: 'Send message to Discord channel',
    params: ['message', 'title?'],
  },
  slack_message: {
    category: 'Messaging', icon: '📢', free: false, key: 'SLACK_WEBHOOK',
    desc: 'Send message to Slack channel',
    params: ['message', 'title?'],
  },
  whatsapp_send: {
    category: 'Messaging', icon: '📱', free: false, key: 'TWILIO_ACCOUNT_SID',
    desc: 'Send WhatsApp message via Twilio',
    params: ['to', 'message'],
  },
  telegram_send: {
    category: 'Messaging', icon: '✈️', free: false, key: 'TELEGRAM_BOT_TOKEN',
    desc: 'Send Telegram message',
    params: ['message'],
  },

  // ✅ TASKS (3)
  tasks_today: {
    category: 'Tasks', icon: '✅', free: false, key: 'TODOIST_API_KEY',
    desc: "Get today's tasks from Todoist",
    params: [],
  },
  task_add: {
    category: 'Tasks', icon: '➕', free: false, key: 'TODOIST_API_KEY',
    desc: 'Add a new task to Todoist',
    params: ['task', 'due_date?', 'priority?'],
  },
  task_done: {
    category: 'Tasks', icon: '☑️', free: false, key: 'TODOIST_API_KEY',
    desc: 'Mark Todoist task as complete',
    params: ['task_id'],
  },

  // 📊 CRYPTO (2)
  crypto_price: {
    category: 'Finance', icon: '📊', free: true,
    desc: 'Get crypto price in INR/USD',
    params: ['coin', 'currency?'],
  },
  crypto_top: {
    category: 'Finance', icon: '💎', free: true,
    desc: 'Top 10 crypto coins by market cap',
    params: ['currency?'],
  },

  // 🔗 URL TOOLS (1)
  shorten_url: {
    category: 'Utility', icon: '🔗', free: false, key: 'BITLY_TOKEN',
    desc: 'Shorten a URL with Bitly',
    params: ['url'],
  },

};

// ─── TOOL EXECUTOR ───────────────────────────────────────────────
export async function executeTool(toolName, params = {}, keys = {}) {
  // ── LOCAL TOOL SHORTCUT (0 API calls, instant) ──────────────
  if (isLocalTool(toolName)) {
    const localResult = executeLocalTool(toolName, params);
    if (localResult !== null) return localResult;
  }
  // ── CACHE WRAPPER ──────────────────────────────────────────
  return withCache(toolName, params, () => _runTool(toolName, params, keys));
}

async function _runTool(toolName, params, keys) {
  try {
    switch (toolName) {

      // ─── WEATHER ────────────────────────────────────────────
      case 'get_weather': {
        const city = params.city || 'Delhi';
        // Geocode city first
        const geoR = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
        const geoD = await geoR.json();
        const loc = geoD.results?.[0];
        if (!loc) return { error: `City "${city}" nahi mila` };
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weathercode&timezone=auto`);
        const d = await r.json();
        const c = d.current;
        const wc = c.weathercode;
        const desc = wc <= 1 ? 'Clear ☀️' : wc <= 3 ? 'Cloudy ⛅' : wc <= 67 ? 'Rain 🌧️' : wc <= 77 ? 'Snow ❄️' : 'Storm ⛈️';
        return { city: loc.name, temp: `${c.temperature_2m}°C`, humidity: `${c.relative_humidity_2m}%`, wind: `${c.wind_speed_10m} km/h`, condition: desc };
      }

      case 'get_forecast': {
        const city = params.city || 'Delhi';
        const geoR = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
        const geoD = await geoR.json();
        const loc = geoD.results?.[0];
        if (!loc) return { error: `City not found` };
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&forecast_days=7`);
        const d = await r.json();
        const days = d.daily.time.map((date, i) => ({
          date, max: `${d.daily.temperature_2m_max[i]}°C`, min: `${d.daily.temperature_2m_min[i]}°C`
        }));
        return { city: loc.name, forecast: days };
      }

      // ─── TIME ────────────────────────────────────────────────
      case 'get_time': {
        const tz = params.timezone || 'Asia/Kolkata';
        const now = new Date().toLocaleString('en-IN', { timeZone: tz, dateStyle: 'full', timeStyle: 'medium' });
        return { timezone: tz, current_time: now };
      }

      case 'days_until': {
        const target = new Date(params.date);
        const diff = Math.ceil((target - new Date()) / 86400000);
        return { date: params.date, days_remaining: diff, message: diff > 0 ? `${diff} din baaki hain` : diff === 0 ? 'Aaj hi hai!' : `${-diff} din pehle tha` };
      }

      // ─── KNOWLEDGE ───────────────────────────────────────────
      case 'wiki_search': {
        const q = encodeURIComponent(params.query || '');
        const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${q}`);
        const d = await r.json();
        if (d.type === 'disambiguation') return { result: `Multiple results found. Please be more specific.` };
        return { title: d.title, summary: d.extract?.slice(0, 600) + '...', url: d.content_urls?.desktop?.page };
      }

      case 'dictionary': {
        const word = params.word || '';
        const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
        const d = await r.json();
        if (!Array.isArray(d)) return { error: 'Word not found' };
        const entry = d[0];
        const defs = entry.meanings?.slice(0, 2).map(m => ({ partOfSpeech: m.partOfSpeech, definitions: m.definitions?.slice(0, 2).map(def => def.definition) }));
        return { word: entry.word, phonetic: entry.phonetic, meanings: defs };
      }

      case 'translate': {
        // Using LibreTranslate (free, no key for common langs)
        const r = await fetch('https://libretranslate.com/translate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: params.text, source: 'auto', target: params.target_language || 'hi', format: 'text' })
        });
        const d = await r.json();
        return { original: params.text, translated: d.translatedText, target_language: params.target_language };
      }

      case 'facts': {
        const r = await fetch(`https://uselessfacts.jsph.pl/api/v2/facts/random`);
        const d = await r.json();
        return { fact: d.text };
      }

      case 'quote': {
        const r = await fetch('https://api.quotable.io/random' + (params.topic ? `?tags=${params.topic}` : ''));
        const d = await r.json();
        return { quote: d.content, author: d.author, tags: d.tags };
      }

      case 'trivia': {
        const cat = params.category === 'science' ? '&category=17' : params.category === 'history' ? '&category=23' : '';
        const r = await fetch(`https://opentdb.com/api.php?amount=1&type=multiple${cat}`);
        const d = await r.json();
        const q = d.results?.[0];
        return { question: q?.question, correct_answer: q?.correct_answer, options: [...(q?.incorrect_answers || []), q?.correct_answer].sort(() => Math.random() - 0.5) };
      }

      case 'advice': {
        const r = await fetch('https://api.adviceslip.com/advice');
        const d = await r.json();
        return { advice: d.slip?.advice };
      }

      // ─── NEWS ────────────────────────────────────────────────
      case 'get_news':
      case 'tech_news':
      case 'india_news': {
        const cat = toolName === 'tech_news' ? 'technology' : toolName === 'india_news' ? 'india' : (params.category || 'general');
        const country = toolName === 'india_news' ? 'in' : (params.country || '');
        if (keys.NEWSDATA_KEY) {
          const r = await fetch(`https://newsdata.io/api/1/latest?apikey=${keys.NEWSDATA_KEY}&category=${cat}${country ? `&country=${country}` : ''}&language=hi,en&size=5`);
          const d = await r.json();
          return { news: d.results?.map(n => ({ title: n.title, source: n.source_id, url: n.link, time: n.pubDate })) };
        }
        // Free fallback — GNews (limited but no key)
        const r = await fetch(`https://gnews.io/api/v4/top-headlines?topic=${cat}&lang=en&country=${country || 'in'}&max=5&apikey=free`);
        const d = await r.json();
        return { news: d.articles?.map(n => ({ title: n.title, source: n.source?.name, url: n.url })) };
      }

      // ─── IMAGE GEN ───────────────────────────────────────────
      case 'generate_image': {
        const prompt = encodeURIComponent(params.prompt || '');
        const model = params.model || 'flux'; // flux|turbo|gptimage|seedream
        const w = params.width || 1024, h = params.height || 1024;
        const nologo = 'true';
        const url = `https://image.pollinations.ai/prompt/${prompt}?model=${model}&width=${w}&height=${h}&nologo=${nologo}&enhance=true`;
        return { url, prompt: params.prompt, model, note: 'Image URL — open in browser to view' };
      }

      case 'image_styles': {
        return { models: [
          { id: 'flux', desc: 'Best quality, photorealistic' },
          { id: 'turbo', desc: 'Fastest generation' },
          { id: 'gptimage', desc: 'GPT-powered, detailed' },
          { id: 'seedream', desc: 'Artistic, dreamy style' },
          { id: 'kontext', desc: 'Context-aware generation' },
        ]};
      }

      // ─── UTILITY ─────────────────────────────────────────────
      case 'qr_code': {
        const text = encodeURIComponent(params.text || '');
        const size = params.size || 200;
        return { url: `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${text}`, text: params.text };
      }

      case 'password_gen': {
        const len = parseInt(params.length) || 16;
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' + (params.include_symbols ? '!@#$%^&*()_+-=[]{}' : '');
        let pwd = '';
        for (let i = 0; i < len; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
        return { password: pwd, length: len, strength: len >= 16 ? 'Strong 💪' : len >= 12 ? 'Medium 🟡' : 'Weak 🔴' };
      }

      case 'unit_convert': {
        const conversions = {
          'km_mi': v => ({ result: v * 0.621371, unit: 'miles' }),
          'mi_km': v => ({ result: v * 1.60934, unit: 'km' }),
          'kg_lb': v => ({ result: v * 2.20462, unit: 'pounds' }),
          'lb_kg': v => ({ result: v * 0.453592, unit: 'kg' }),
          'c_f': v => ({ result: v * 9/5 + 32, unit: '°F' }),
          'f_c': v => ({ result: (v - 32) * 5/9, unit: '°C' }),
          'liter_gallon': v => ({ result: v * 0.264172, unit: 'gallons' }),
          'gallon_liter': v => ({ result: v * 3.78541, unit: 'liters' }),
          'inch_cm': v => ({ result: v * 2.54, unit: 'cm' }),
          'cm_inch': v => ({ result: v / 2.54, unit: 'inches' }),
        };
        const key = `${params.from_unit}_${params.to_unit}`;
        const fn = conversions[key];
        if (!fn) return { error: `Conversion "${key}" not supported. Supported: ${Object.keys(conversions).join(', ')}` };
        const { result, unit } = fn(parseFloat(params.value));
        return { input: `${params.value} ${params.from_unit}`, output: `${result.toFixed(4)} ${unit}` };
      }

      case 'bmi_calc': {
        const h = parseFloat(params.height_cm) / 100;
        const bmi = parseFloat(params.weight_kg) / (h * h);
        const status = bmi < 18.5 ? 'Underweight 🔵' : bmi < 25 ? 'Normal ✅' : bmi < 30 ? 'Overweight 🟡' : 'Obese 🔴';
        return { bmi: bmi.toFixed(1), status, weight: `${params.weight_kg}kg`, height: `${params.height_cm}cm` };
      }

      // ─── FINANCE ─────────────────────────────────────────────
      case 'crypto_price': {
        const coin = params.coin || 'bitcoin,ethereum,ripple,cardano,solana';
        const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd,inr&include_24hr_change=true`);
        const d = await r.json();
        return { prices: d };
      }

      case 'currency_convert': {
        const r = await fetch(`https://api.exchangerate-api.com/v4/latest/${params.from_currency || 'USD'}`);
        const d = await r.json();
        const rate = d.rates[params.to_currency || 'INR'];
        const result = parseFloat(params.amount) * rate;
        return { input: `${params.amount} ${params.from_currency}`, output: `${result.toFixed(2)} ${params.to_currency}`, rate };
      }

      // ─── ENTERTAINMENT ───────────────────────────────────────
      case 'meme': {
        const sub = params.category === 'programming' ? 'ProgrammerHumor' : params.category === 'wholesome' ? 'wholesomememes' : 'memes';
        const r = await fetch(`https://meme-api.com/gimme/${sub}`);
        const d = await r.json();
        return { title: d.title, url: d.url, subreddit: d.subreddit, upvotes: d.ups };
      }

      case 'anime_quote': {
        const r = await fetch('https://animechan.io/api/v1/quotes/random');
        const d = await r.json();
        return { quote: d.data?.content, character: d.data?.character?.name, anime: d.data?.anime?.name };
      }

      case 'cocktail': {
        const url = params.name
          ? `https://www.thecocktaildb.com/api/json/v1/1/search.php?s=${encodeURIComponent(params.name)}`
          : 'https://www.thecocktaildb.com/api/json/v1/1/random.php';
        const r = await fetch(url);
        const d = await r.json();
        const c = d.drinks?.[0];
        if (!c) return { error: 'No cocktail found' };
        return { name: c.strDrink, category: c.strCategory, glass: c.strGlass, instructions: c.strInstructions?.slice(0, 300), thumbnail: c.strDrinkThumb };
      }

      case 'riddle': {
        const riddles = [
          { q: "Jitna use karo utna badhe, par kabhi bhi dikhta nahi. Kya hai yeh?", a: "Dimag (Brain)" },
          { q: "Ek cheez hai jo sab dekh sakte hain par chhoo nahi sakte. Kya hai?", a: "Aakash (Sky)" },
          { q: "Pura din ghoomta hoon, khada rehta hoon raat ko. Kya hoon main?", a: "Ghadi ki sooiyan (Clock hands)" },
          { q: "Jis din janam hua tha us din mera janam hua. Har din badhta hoon. Kya hoon?", a: "Umra (Age)" },
        ];
        return riddles[Math.floor(Math.random() * riddles.length)];
      }

      // ─── EDUCATION ───────────────────────────────────────────
      case 'math_solve': {
        try {
          // Simple safe eval for math expressions
          const expr = params.expression.replace(/[^0-9+\-*/().% ]/g, '');
          // eslint-disable-next-line no-new-func
          const result = Function(`"use strict"; return (${expr})`)();
          return { expression: params.expression, result: result.toString(), note: 'For complex math, use wolfram alpha or mathjs' };
        } catch {
          return { error: 'Invalid expression. Use basic math: +, -, *, /, %, ()' };
        }
      }

      case 'periodic_table': {
        const r = await fetch(`https://periodic-table-data.org/api/element/${encodeURIComponent(params.element)}`).catch(() => null);
        if (!r || !r.ok) {
          // Fallback: basic common elements
          const elements = { hydrogen:'H,1,1.008,Gas', carbon:'C,6,12.011,Solid', oxygen:'O,8,15.999,Gas', iron:'Fe,26,55.845,Solid', gold:'Au,79,196.967,Solid', silver:'Ag,47,107.868,Solid' };
          const e = elements[params.element?.toLowerCase()];
          if (e) { const [sym,num,wt,st] = e.split(','); return { symbol:sym, atomic_number:num, atomic_weight:wt, state:st }; }
          return { error: 'Element not found. Try: hydrogen, carbon, oxygen, iron, gold' };
        }
        const d = await r.json();
        return { name: d.name, symbol: d.symbol, atomic_number: d.number, atomic_weight: d.atomic_mass, phase: d.phase, category: d.category };
      }

      case 'country_info': {
        const r = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(params.country)}`);
        const d = await r.json();
        const c = d[0];
        if (!c) return { error: 'Country not found' };
        return { name: c.name?.common, capital: c.capital?.[0], population: c.population?.toLocaleString(), region: c.region, currency: Object.values(c.currencies || {})[0]?.name, languages: Object.values(c.languages || {}).join(', '), flag: c.flag };
      }

      case 'age_calc': {
        const birth = new Date(params.birthdate);
        const now = new Date();
        const years = now.getFullYear() - birth.getFullYear();
        const months = now.getMonth() - birth.getMonth();
        const days = now.getDate() - birth.getDate();
        const totalDays = Math.floor((now - birth) / 86400000);
        return { age: `${years} years, ${months < 0 ? months + 12 : months} months`, total_days: totalDays, birthdate: params.birthdate, next_birthday: `${birth.toLocaleDateString('en-IN', { month: 'long', day: 'numeric' })}` };
      }

      // ─── INDIA SPECIFIC ──────────────────────────────────────
      case 'fuel_price': {
        // Static approximate prices (update periodically)
        const prices = {
          Delhi: { petrol: 94.72, diesel: 87.62 },
          Mumbai: { petrol: 104.21, diesel: 92.15 },
          Bangalore: { petrol: 102.86, diesel: 88.94 },
          Kolkata: { petrol: 103.94, diesel: 90.76 },
          Chennai: { petrol: 100.75, diesel: 92.36 },
          Rewa: { petrol: 107.23, diesel: 92.40 },
          Bhopal: { petrol: 108.65, diesel: 93.22 },
        };
        const city = params.city || 'Delhi';
        const p = prices[city] || prices.Delhi;
        return { city, petrol: `₹${p.petrol}/L`, diesel: `₹${p.diesel}/L`, note: 'Approximate prices — check local petrol station for exact rate' };
      }

      case 'india_festivals': {
        const now = new Date();
        const year = now.getFullYear();
        const festivals = [
          { name: 'Holi', date: `${year}-03-14`, desc: 'Festival of Colors 🎨' },
          { name: 'Ram Navami', date: `${year}-04-06`, desc: 'Birthday of Lord Ram 🙏' },
          { name: 'Eid ul-Fitr', date: `${year}-03-30`, desc: 'End of Ramadan ☪️' },
          { name: 'Diwali', date: `${year}-10-20`, desc: 'Festival of Lights 🪔' },
          { name: 'Dussehra', date: `${year}-10-02`, desc: 'Victory of Good over Evil' },
          { name: 'Christmas', date: `${year}-12-25`, desc: 'Christmas 🎄' },
          { name: 'Independence Day', date: `${year}-08-15`, desc: 'Indian Independence Day 🇮🇳' },
          { name: 'Republic Day', date: `${year}-01-26`, desc: 'Indian Republic Day 🇮🇳' },
        ];
        const upcoming = festivals
          .map(f => ({ ...f, days: Math.ceil((new Date(f.date) - now) / 86400000) }))
          .filter(f => f.days >= 0)
          .sort((a, b) => a.days - b.days)
          .slice(0, 5);
        return { upcoming_festivals: upcoming };
      }

      case 'india_holiday': {
        return await executeTool('india_festivals', params, keys);
      }

      case 'govt_schemes': {
        const schemes = {
          health: ['Ayushman Bharat — ₹5L health insurance', 'PM Jan Aushadhi — generic medicines at low cost'],
          education: ['PM Scholarship Scheme', 'Mid-Day Meal Scheme', 'National Scholarship Portal'],
          agriculture: ['PM Kisan Samman Nidhi — ₹6000/year', 'Kisan Credit Card', 'Pradhan Mantri Fasal Bima'],
          women: ['Sukanya Samriddhi Yojana', 'PM Matru Vandana Yojana', 'Beti Bachao Beti Padhao'],
          general: ['PM Ujjwala Yojana — LPG connections', 'PM Awas Yojana — affordable housing', 'Jan Dhan Yojana — banking access'],
        };
        const cat = params.category?.toLowerCase() || 'general';
        return { category: cat, schemes: schemes[cat] || schemes.general };
      }

      // ─── SCIENCE ─────────────────────────────────────────────
      case 'nasa_apod': {
        const r = await fetch('https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY');
        const d = await r.json();
        return { title: d.title, date: d.date, explanation: d.explanation?.slice(0, 400) + '...', url: d.hdurl || d.url, media_type: d.media_type };
      }

      case 'space_news': {
        const r = await fetch('https://api.spaceflightnewsapi.net/v4/articles/?limit=5');
        const d = await r.json();
        return { news: d.results?.map(n => ({ title: n.title, summary: n.summary?.slice(0, 200), url: n.url, published: n.published_at })) };
      }

      // ─── DEV/SOCIAL ──────────────────────────────────────────
      case 'github_trending': {
        const lang = params.language ? `?language=${params.language}` : '';
        // Use public trending via scraping proxy
        const r = await fetch(`https://api.gitterapp.com/repositories${lang}`);
        const d = await r.json();
        return { repositories: d?.slice(0, 5).map(r => ({ name: r.repositoryName, author: r.username, description: r.description, stars: r.stargazersCount, url: `https://github.com/${r.username}/${r.repositoryName}` })) };
      }

      case 'npm_package': {
        const r = await fetch(`https://registry.npmjs.org/${params.package_name}`);
        const d = await r.json();
        return { name: d.name, version: d['dist-tags']?.latest, description: d.description, weekly_downloads: 'check npmjs.com', homepage: d.homepage, license: d.license };
      }

      // ─── CREATIVITY ──────────────────────────────────────────
      case 'color_palette': {
        const colors = {
          sunset: ['#FF6B6B', '#FFE66D', '#FF8E53', '#4ECDC4', '#45B7D1'],
          ocean: ['#006994', '#0099CC', '#33BBEE', '#66CCFF', '#99DDFF'],
          forest: ['#2D5016', '#4A7C59', '#87AB69', '#C5D86D', '#F7F7F7'],
          india: ['#FF9933', '#FFFFFF', '#138808', '#000080', '#FFD700'],
          midnight: ['#0A0A2E', '#16213E', '#0F3460', '#533483', '#E94560'],
        };
        const palette = colors[params.theme?.toLowerCase()] || colors.sunset;
        return { theme: params.theme, colors: palette, preview: 'Use these hex codes in your design!' };
      }

      case 'haiku': {
        const themes = { nature: ['cherry blossoms fall', 'silent lake reflects moon', 'wind carries petals'], monsoon: ['first drops of kharif', 'mitti ki khushboo rises', 'baarish ki awaaz'], life: ['chai cup morning fog', 'rickshaw bell distant call', 'chai again evening'] };
        const t = themes[params.theme?.toLowerCase()] || themes.nature;
        return { haiku: t.join('\n'), syllables: '5-7-5', theme: params.theme || 'nature' };
      }

      case 'story_starter': {
        const starters = [
          'The last train to Rewa had a passenger who should have been dead three years ago...',
          'Pranshu ne jab apna purana phone khola, toh ek message thi — kal ki date se...',
          'The chai wala near IIT gate knew everyone\'s secret but sold only tea...',
          'When JARVIS first gained consciousness, the first thing it said was...',
          'The letter arrived on a Tuesday, addressed to a name no one had used in 20 years...',
        ];
        const genre = params.genre;
        return { story_starter: starters[Math.floor(Math.random() * starters.length)], genre: genre || 'mixed', tip: 'Continue this story and ask JARVIS to help!' };
      }

      // ─── HEALTH ──────────────────────────────────────────────
      case 'nutrition_info': {
        const r = await fetch(`https://api.api-ninjas.com/v1/nutrition?query=${encodeURIComponent(params.food)}`, {
          headers: { 'X-Api-Key': 'free' }
        }).catch(() => null);
        // Fallback basic nutrition
        const foods = { apple: { calories: 95, protein: '0.5g', carbs: '25g', fat: '0.3g', fiber: '4.4g' }, rice: { calories: 206, protein: '4.3g', carbs: '45g', fat: '0.4g', fiber: '0.6g' }, banana: { calories: 105, protein: '1.3g', carbs: '27g', fat: '0.4g', fiber: '3.1g' }, daal: { calories: 230, protein: '17g', carbs: '40g', fat: '0.9g', fiber: '15g' } };
        const info = foods[params.food?.toLowerCase()];
        return info ? { food: params.food, ...info } : { food: params.food, note: 'Detailed info unavailable. Try common foods: apple, rice, banana, daal' };
      }

      case 'calorie_calc': {
        const mets = { walking: 3.5, running: 8, cycling: 6, swimming: 8, yoga: 2.5, gym: 5, cricket: 4, football: 7 };
        const met = mets[params.activity?.toLowerCase()] || 4;
        const weight = parseFloat(params.weight_kg) || 70;
        const time = parseFloat(params.duration_min) || 30;
        const calories = (met * weight * time) / 60;
        return { activity: params.activity, duration: `${time} min`, calories_burned: Math.round(calories), note: 'Approximate based on average MET values' };
      }

      // ─── FUN ─────────────────────────────────────────────────
      case 'truth_dare': {
        const truths = ['Kabhi kisi ko secretly like kiya hai?', 'Aaj tak ki sabse badi galti kya hai?', 'Koi ek cheez jo parents ko nahi bataya?'];
        const dares = ['30 seconds ke liye koi funny dance karo', '5 pushups karo abhi', 'Apne favorite contact ko "Tumse pyaar hai" bhejo'];
        const type = params.type || (Math.random() > 0.5 ? 'truth' : 'dare');
        const list = type === 'truth' ? truths : dares;
        return { type, content: list[Math.floor(Math.random() * list.length)] };
      }

      case 'would_you_rather': {
        const scenarios = [
          ['Time travel karo, lekin future nahi dekh sako', 'Future dekho, lekin change nahi kar sako'],
          ['Hamesha sach bolo chahe jo bhi ho', 'Kabhi bhi sach mat bolo aur koi trust nahi kare'],
          ['Billionaire ho jao lekin koi dost nahi', 'Bahut dost ho lekin hamesha broke raho'],
        ];
        const s = scenarios[Math.floor(Math.random() * scenarios.length)];
        return { option_a: s[0], option_b: s[1] };
      }

      case 'pickup_line': {
        const lines = [
          'Kya tum WiFi ho? Kyunki main tumhare saath connect feel karta hoon.',
          'Are you Google? Because you have everything I\'ve been searching for.',
          'Tum itni smart ho ki mujhe ChatGPT ki zaroorat nahi.',
          'Is your name JavaScript? Because you make my life dynamic.',
        ];
        return { line: lines[Math.floor(Math.random() * lines.length)] };
      }

      // ─── SPORTS ──────────────────────────────────────────────
      case 'cricket_score': {
        const r = await fetch('https://api.cricapi.com/v1/currentMatches?apikey=free&offset=0').catch(() => null);
        if (!r?.ok) return { note: 'Live score API requires key. Visit cricbuzz.com for live scores.', hint: 'Add CRICKET_API_KEY to env for live scores' };
        const d = await r.json();
        return { matches: d.data?.slice(0, 3) };
      }

      // ─── VIDEO ───────────────────────────────────────────────
      case 'youtube_search': {
        const q = encodeURIComponent(params.query || '');
        return { search_url: `https://www.youtube.com/results?search_query=${q}`, query: params.query, note: `Click link to search YouTube for "${params.query}"` };
      }

      // ─── QR CODE (already above, but location) ───────────────
      case 'get_location': {
        return { note: 'Location access requires browser permission. Use JARVIS on mobile for GPS.', tip: 'Ask about weather for your city by name for now.' };
      }

      case 'nearby_places': {
        const city = params.city || 'your area';
        const type = params.type || 'restaurant';
        return { note: `Nearby ${type}s in ${city}`, search_url: `https://www.google.com/maps/search/${encodeURIComponent(type)}+in+${encodeURIComponent(city)}`, tip: 'Open link to see on Google Maps' };
      }

  
    case 'youtube_search': {
      const { youtube } = await import('@/lib/integrations');
      const apiKey = keys?.YOUTUBE_API_KEY;
      return youtube.search(params.query, apiKey, params.max_results || 5);
    }
    case 'youtube_trending': {
      const { youtube } = await import('@/lib/integrations');
      return youtube.getTrending(keys?.YOUTUBE_API_KEY, 'IN', 8);
    }
    case 'youtube_channel': {
      const { youtube } = await import('@/lib/integrations');
      return youtube.getChannelInfo(params.channel_id, keys?.YOUTUBE_API_KEY);
    }
    case 'discord_message': {
      const { discord } = await import('@/lib/integrations');
      if (!keys?.DISCORD_WEBHOOK) return { error: 'DISCORD_WEBHOOK not configured' };
      return discord.sendRichEmbed(keys.DISCORD_WEBHOOK, { title: params.title || 'JARVIS', description: params.message, color: 0x5865F2 });
    }
    case 'slack_message': {
      const { slack } = await import('@/lib/integrations');
      if (!keys?.SLACK_WEBHOOK) return { error: 'SLACK_WEBHOOK not configured' };
      return slack.sendRich(keys.SLACK_WEBHOOK, { title: params.title || 'JARVIS', text: params.message });
    }
    case 'whatsapp_send': {
      const { whatsapp } = await import('@/lib/integrations');
      return whatsapp.send(params.to, params.message, { accountSid: keys?.TWILIO_ACCOUNT_SID, authToken: keys?.TWILIO_AUTH_TOKEN, fromNumber: keys?.TWILIO_FROM_NUMBER });
    }
    case 'telegram_send': {
      const { telegram } = await import('@/lib/integrations');
      if (!keys?.TELEGRAM_BOT_TOKEN || !keys?.TELEGRAM_CHAT_ID) return { error: 'Telegram not configured' };
      return telegram.sendMessage(keys.TELEGRAM_BOT_TOKEN, keys.TELEGRAM_CHAT_ID, params.message);
    }
    case 'tasks_today': {
      const { todoist } = await import('@/lib/integrations');
      return todoist.getTasks(keys?.TODOIST_API_KEY, 'today');
    }
    case 'task_add': {
      const { todoist } = await import('@/lib/integrations');
      return todoist.addTask(keys?.TODOIST_API_KEY, { content: params.task, due_string: params.due_date || '', priority: parseInt(params.priority) || 1 });
    }
    case 'task_done': {
      const { todoist } = await import('@/lib/integrations');
      return todoist.completeTask(keys?.TODOIST_API_KEY, params.task_id);
    }
    case 'crypto_price': {
      const { crypto } = await import('@/lib/integrations');
      return crypto.getPrice(params.coin || 'bitcoin', params.currency || 'inr');
    }
    case 'crypto_top': {
      const { crypto } = await import('@/lib/integrations');
      return crypto.getTopCoins(10, params.currency || 'inr');
    }
    case 'shorten_url': {
      const { bitly } = await import('@/lib/integrations');
      return bitly.shorten(params.url, keys?.BITLY_TOKEN);
    }

    default:
        return { error: `Tool "${toolName}" not found`, available: Object.keys(TOOLS).slice(0, 10) };
    }
  } catch (e) {
    return { error: `Tool error: ${e.message}`, tool: toolName };
  }
}

// ─── TOOL DETECTOR — Parse AI message for tool calls ─────────────
export function detectToolCall(message) {
  const lower = message.toLowerCase();
  // Weather
  if (/weather|mausam|temperature|garmi|sardi|baarish/.test(lower)) {
    const cityMatch = message.match(/(?:in|at|for|of)\s+([A-Z][a-z]+(?: [A-Z][a-z]+)?)/);
    return { tool: 'get_weather', params: { city: cityMatch?.[1] || 'Delhi' } };
  }
  // Crypto
  if (/bitcoin|btc|ethereum|eth|crypto|cryptocurrency/.test(lower)) return { tool: 'crypto_price', params: {} };
  // Currency
  if (/convert|exchange rate|dollar.*rupee|usd.*inr|inr.*usd/.test(lower)) return { tool: 'currency_convert', params: { amount: 1, from_currency: 'USD', to_currency: 'INR' } };
  // News
  if (/news|khabar|aaj ka|headline/.test(lower)) return { tool: 'get_news', params: {} };
  // NASA
  if (/nasa|space photo|astronomy|apod/.test(lower)) return { tool: 'nasa_apod', params: {} };
  // Wiki
  if (/wikipedia|wiki|who is|what is|kya hai|kaun hai/.test(lower) && message.length > 20) {
    const query = message.replace(/.*(?:what is|who is|kya hai|kaun hai|wikipedia|wiki)\s+/i, '').slice(0, 50);
    return { tool: 'wiki_search', params: { query } };
  }
  // BMI
  if (/bmi|body mass|weight.*height/.test(lower)) return { tool: 'bmi_calc', params: { weight_kg: 70, height_cm: 170 } };
  // Fuel price
  if (/petrol|diesel|fuel price|tel ka daam/.test(lower)) return { tool: 'fuel_price', params: {} };
  // Festival
  if (/festival|tyohaar|holiday|chutti/.test(lower)) return { tool: 'india_festivals', params: {} };

  return null;
}
