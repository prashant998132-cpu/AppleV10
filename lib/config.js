// lib/config.js — Single Source of Truth
// Import from here: keys, constants, defaults
// ─────────────────────────────────────────

export const APP = {
  name:    'JARVIS',
  version: '10.0',
  url:     process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  defaultName: 'Yaar',
  defaultCity: 'India',
};

// All server-side API keys — import getKeys() in every API route
export function getKeys() {
  return {
    GEMINI_API_KEY:         process.env.GEMINI_API_KEY         || null,
    GROQ_API_KEY:           process.env.GROQ_API_KEY           || null,
    OPENROUTER_KEY:         process.env.OPENROUTER_KEY         || null,
    ELEVENLABS_API_KEY:     process.env.ELEVENLABS_API_KEY     || null,
    SARVAM_API_KEY:         process.env.SARVAM_API_KEY         || null,  // v7: Hindi TTS+STT (Made in India)
    GOOGLE_TTS_KEY:         process.env.GOOGLE_TTS_KEY         || null,
    AZURE_TTS_KEY:          process.env.AZURE_TTS_KEY          || null,
    AZURE_REGION:           process.env.AZURE_REGION           || 'eastus',
    FISH_AUDIO_KEY:         process.env.FISH_AUDIO_KEY         || null,
    CEREBRAS_API_KEY:       process.env.CEREBRAS_API_KEY       || null,  // v7: 3000 t/s fast LLM
    TAVILY_API_KEY:         process.env.TAVILY_API_KEY         || null,  // v7: web search in ReAct agent
    SAMBANOVA_API_KEY:      process.env.SAMBANOVA_API_KEY      || null,  // v8: 919 t/s, free tier, OpenAI-compatible
    AIMLAPI_KEY:            process.env.AIMLAPI_KEY            || null,
    FAL_API_KEY:            process.env.FAL_API_KEY            || null,
    LEONARDO_API_KEY:       process.env.LEONARDO_API_KEY       || null,
    HUGGINGFACE_TOKEN:      process.env.HUGGINGFACE_TOKEN      || null,
    DEEPAI_KEY:             process.env.DEEPAI_KEY             || null,
    LUMA_API_KEY:           process.env.LUMA_API_KEY           || null,
    KLING_API_KEY:          process.env.KLING_API_KEY          || null,
    HAILUO_API_KEY:         process.env.HAILUO_API_KEY         || null,
    HAILUO_GROUP_ID:        process.env.HAILUO_GROUP_ID        || null,
    MUBERT_API_KEY:         process.env.MUBERT_API_KEY         || null,
    NEWSDATA_KEY:           process.env.NEWSDATA_KEY           || null,
    GNEWS_API_KEY:          process.env.GNEWS_API_KEY          || null,
    TOGETHER_API_KEY:       process.env.TOGETHER_API_KEY       || null,  // v9: Llama 4 Scout (10M ctx)
    MISTRAL_API_KEY:        process.env.MISTRAL_API_KEY        || null,  // v10: Mistral free 1B tokens/month
    OPENROUTER_FREE_KEY:    process.env.OPENROUTER_FREE_KEY    || null,  // v10: 30+ free models on OpenRouter
    POLLINATIONS_TOKEN:     process.env.POLLINATIONS_TOKEN     || null,  // v10: Pollinations Seed tier (5s/req vs 15s/req anon)
    GOOGLE_CLIENT_ID:       process.env.GOOGLE_CLIENT_ID       || null,
    GOOGLE_CLIENT_SECRET:   process.env.GOOGLE_CLIENT_SECRET   || null,
    META_APP_ID:            process.env.META_APP_ID            || null,
    META_APP_SECRET:        process.env.META_APP_SECRET        || null,
    LINKEDIN_CLIENT_ID:     process.env.LINKEDIN_CLIENT_ID     || null,
    LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET || null,

    // ── v10.1: App Integrations ────────────────────────────────
    GITHUB_TOKEN:           process.env.GITHUB_TOKEN           || null,  // GitHub — repos, commits, gist (optional, public API free)
    VERCEL_TOKEN:           process.env.VERCEL_TOKEN           || null,  // Vercel — deployment status, build logs
    VERCEL_PROJECT_ID:      process.env.VERCEL_PROJECT_ID      || null,  // prj_0zfbT8HdV3jEc61o8sy8l9HO94Hy
    VERCEL_TEAM_ID:         process.env.VERCEL_TEAM_ID         || null,  // Team slug
    GOOGLE_ACCESS_TOKEN:    process.env.GOOGLE_ACCESS_TOKEN    || null,  // Google Calendar + Drive
    TELEGRAM_BOT_TOKEN:     process.env.TELEGRAM_BOT_TOKEN     || null,  // Telegram Bot (create via @BotFather)
    TELEGRAM_CHAT_ID:       process.env.TELEGRAM_CHAT_ID       || null,  // Your Telegram user/chat ID
    SPOTIFY_CLIENT_ID:      process.env.SPOTIFY_CLIENT_ID      || null,  // Spotify (developer.spotify.com — free)
    SPOTIFY_CLIENT_SECRET:  process.env.SPOTIFY_CLIENT_SECRET  || null,
    NOTION_TOKEN:           process.env.NOTION_TOKEN           || null,  // Notion integration token (notion.so/my-integrations)
    PEXELS_API_KEY:         process.env.PEXELS_API_KEY         || null,  // Pexels photos/videos (free — pexels.com/api)
    PIXABAY_KEY:            process.env.PIXABAY_KEY            || null,  // Pixabay (free — pixabay.com/api)
    PUSHOVER_TOKEN:         process.env.PUSHOVER_TOKEN         || null,  // Push notifications
    PUSHOVER_USER:          process.env.PUSHOVER_USER          || null,
    NEWSDATA_KEY:           process.env.NEWSDATA_KEY           || null,  // newsdata.io (200 req/day free)
    CRICKET_API_KEY:        process.env.CRICKET_API_KEY        || null,  // cricapi.com (100 req/day free)
    // ── v10.2: New Integrations ────────────────────────────────
    YOUTUBE_API_KEY:        process.env.YOUTUBE_API_KEY        || null,  // YouTube search & trending (free 10k/day)
    DISCORD_WEBHOOK:        process.env.DISCORD_WEBHOOK        || null,  // Discord webhook URL
    SLACK_WEBHOOK:          process.env.SLACK_WEBHOOK          || null,  // Slack incoming webhook URL
    TODOIST_API_KEY:        process.env.TODOIST_API_KEY        || null,  // Todoist task manager
    OPENWEATHER_KEY:        process.env.OPENWEATHER_KEY        || null,  // OpenWeatherMap (fallback: free Open-Meteo)
    TWILIO_ACCOUNT_SID:     process.env.TWILIO_ACCOUNT_SID     || null,  // WhatsApp via Twilio
    TWILIO_AUTH_TOKEN:      process.env.TWILIO_AUTH_TOKEN      || null,
    TWILIO_FROM_NUMBER:     process.env.TWILIO_FROM_NUMBER     || null,
    BITLY_TOKEN:            process.env.BITLY_TOKEN            || null,  // URL shortener
    PIXABAY_KEY:            process.env.PIXABAY_KEY            || null,  // Pixabay photos/videos
  };
}

// ─── PROVIDER LIMITS (daily) ──────────────────────────────────────
export const DAILY_LIMITS = {
  gemini:      250,
  groq:        6000,
  cerebras:    1000,
  sambanova:   999999,
  together:    9999,
  openrouter:  99999,
  mistral:     99999,
  pollinations: 99999,
  huggingface: 30000,
};

// ─── MEDIA RULES (NEVER break these) ──────────────────────────────
export const MEDIA_RULES = {
  MAX_BASE64_BYTES:    200_000,   // TTS: base64 only if <200KB
  MAX_IMAGE_BASE64:    400_000,   // Images: base64 only if <400KB
  VERCEL_BANDWIDTH_MB: 100_000,   // 100GB/month free tier
  ALWAYS_CDN:          true,      // Always return CDN URLs for media
};
