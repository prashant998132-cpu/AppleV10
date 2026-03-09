// app/api/integrations/status/route.js — JARVIS v10.1
// Quick status check for Settings page
import { getUser } from '@/lib/db/supabase';
import { getKeys } from '@/lib/config';
import { getUsageStats, PROVIDERS } from '@/lib/ai/smart-router';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const keys = getKeys();

  // Check which integrations are configured
  const integrations = {
    // AI Providers
    ai: {
      gemini:      { name: 'Gemini 2.5 Flash',      configured: !!keys.GEMINI_API_KEY,     free: true,  limit: '250/day' },
      groq:        { name: 'Groq Llama 4',           configured: !!keys.GROQ_API_KEY,       free: true,  limit: '6000/day' },
      cerebras:    { name: 'Cerebras 3000t/s',       configured: !!keys.CEREBRAS_API_KEY,   free: true,  limit: '1000/day' },
      sambanova:   { name: 'SambaNova 919t/s',       configured: !!keys.SAMBANOVA_API_KEY,  free: true,  limit: 'Generous' },
      together:    { name: 'Together Llama 4',       configured: !!keys.TOGETHER_API_KEY,   free: true,  limit: '$1 credit' },
      mistral:     { name: 'Mistral AI',             configured: !!keys.MISTRAL_API_KEY,    free: true,  limit: '1B tokens/mo' },
      openrouter:  { name: 'OpenRouter (50+ models)',configured: !!keys.OPENROUTER_KEY,     free: true,  limit: 'Varies' },
      pollinations:{ name: 'Pollinations Text',      configured: true,                      free: true,  limit: 'Unlimited (throttled)', noKey: true },
    },
    // App Integrations
    apps: {
      github:    { name: 'GitHub',         configured: !!keys.GITHUB_TOKEN,          setup: 'github.com/settings/tokens', noKey: 'Public API works without key' },
      vercel:    { name: 'Vercel',         configured: !!keys.VERCEL_TOKEN,          setup: 'vercel.com/account/tokens' },
      calendar:  { name: 'Google Cal',     configured: !!keys.GOOGLE_ACCESS_TOKEN,   setup: 'console.cloud.google.com' },
      telegram:  { name: 'Telegram Bot',   configured: !!keys.TELEGRAM_BOT_TOKEN,    setup: '@BotFather on Telegram' },
      spotify:   { name: 'Spotify',        configured: !!keys.SPOTIFY_CLIENT_ID,     setup: 'developer.spotify.com' },
      notion:    { name: 'Notion',         configured: !!keys.NOTION_TOKEN,          setup: 'notion.so/my-integrations' },
      drive:     { name: 'Google Drive',   configured: !!keys.GOOGLE_ACCESS_TOKEN,   setup: 'console.cloud.google.com' },
      reddit:    { name: 'Reddit',         configured: true,                          noKey: 'No key needed!', setup: 'Built-in' },
      pexels:    { name: 'Pexels Media',   configured: !!keys.PEXELS_API_KEY,        setup: 'pexels.com/api', noKey: 'Picsum fallback always works' },
    },
    // Media Rules
    mediaRules: {
      imageProxy:    false,   // NEVER proxy images
      audioProxy:    false,   // NEVER proxy audio >200KB
      videoProxy:    false,   // NEVER proxy video
      musicProxy:    false,   // NEVER proxy music
      alwaysCDNUrl:  true,    // Always return CDN URLs
      maxBase64KB:   200,     // TTS base64 limit
      maxImageB64KB: 400,     // Image base64 limit
      vercelBandwidthGB: 100, // Monthly free limit
    },
    // Usage stats
    usage: getUsageStats(),
  };

  const configuredAI   = Object.values(integrations.ai).filter(a => a.configured).length;
  const configuredApps = Object.values(integrations.apps).filter(a => a.configured).length;

  return Response.json({
    summary: {
      ai_providers_active: configuredAI,
      ai_providers_total: Object.keys(integrations.ai).length,
      apps_connected: configuredApps,
      apps_total: Object.keys(integrations.apps).length,
      media_bandwidth_safe: true,
    },
    integrations,
    timestamp: new Date().toISOString(),
  });
}
