'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, ExternalLink, RefreshCw, Plus, ChevronRight } from 'lucide-react';

const PLATFORMS = [
  {
    id: 'google',
    name: 'Google',
    desc: 'Calendar + Gmail + Drive',
    icon: '🔵',
    services: ['Google Calendar', 'Gmail Drafts', 'Google Drive'],
    color: 'border-blue-500/30 bg-blue-500/5',
    activeColor: 'border-green-500/30 bg-green-500/10',
    oauth: true,
  },
  {
    id: 'telegram',
    name: 'Telegram',
    desc: 'Reminders & notifications',
    icon: '✈️',
    services: ['Send Messages', 'Reminders', 'Photo Sharing'],
    color: 'border-sky-500/30 bg-sky-500/5',
    activeColor: 'border-green-500/30 bg-green-500/10',
    envKeys: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'],
    note: 'BotFather se bot banao → @BotFather on Telegram',
  },
  {
    id: 'spotify',
    name: 'Spotify',
    desc: 'Music search & playlists',
    icon: '🎵',
    services: ['Track Search', 'New Releases', 'Featured Playlists'],
    color: 'border-green-500/30 bg-green-500/5',
    activeColor: 'border-green-500/30 bg-green-500/10',
    envKeys: ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET'],
    note: 'developer.spotify.com — free app registration',
  },
  {
    id: 'notion',
    name: 'Notion',
    desc: 'Notes & databases',
    icon: '📝',
    services: ['Read Pages', 'Create Notes', 'Database Access'],
    color: 'border-slate-500/30 bg-slate-500/5',
    activeColor: 'border-green-500/30 bg-green-500/10',
    envKeys: ['NOTION_TOKEN'],
    note: 'notion.so/my-integrations → Create integration',
  },
  {
    id: 'github',
    name: 'GitHub',
    desc: 'Repos, commits & gists',
    icon: '🐙',
    services: ['Repository Info', 'Commit History', 'Save to Gist'],
    color: 'border-purple-500/30 bg-purple-500/5',
    activeColor: 'border-green-500/30 bg-green-500/10',
    envKeys: ['GITHUB_TOKEN'],
    note: 'github.com/settings/tokens → Generate classic token',
    alwaysFree: true,
    freeNote: 'Public repos work without key!',
  },
  {
    id: 'discord',
    name: 'Discord',
    desc: 'Send messages to server',
    icon: '💬',
    services: ['Webhook Messages', 'Rich Embeds', 'Notifications'],
    color: 'border-indigo-500/30 bg-indigo-500/5',
    activeColor: 'border-green-500/30 bg-green-500/10',
    envKeys: ['DISCORD_WEBHOOK'],
    note: 'Server Settings → Integrations → Webhooks → New Webhook',
  },
  {
    id: 'slack',
    name: 'Slack',
    desc: 'Team notifications',
    icon: '📢',
    services: ['Webhook Messages', 'Channel Notifications', 'Rich Blocks'],
    color: 'border-amber-500/30 bg-amber-500/5',
    activeColor: 'border-green-500/30 bg-green-500/10',
    envKeys: ['SLACK_WEBHOOK'],
    note: 'api.slack.com/apps → Create App → Incoming Webhooks',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    desc: 'Search & trending videos',
    icon: '🎬',
    services: ['Video Search', 'Trending India', 'Channel Info'],
    color: 'border-red-500/30 bg-red-500/5',
    activeColor: 'border-green-500/30 bg-green-500/10',
    envKeys: ['YOUTUBE_API_KEY'],
    note: 'console.cloud.google.com → YouTube Data API v3 (free 10k/day)',
  },
  {
    id: 'todoist',
    name: 'Todoist',
    desc: 'Tasks & to-dos',
    icon: '✅',
    services: ['Today\'s Tasks', 'Add Tasks', 'Complete Tasks', 'Projects'],
    color: 'border-rose-500/30 bg-rose-500/5',
    activeColor: 'border-green-500/30 bg-green-500/10',
    envKeys: ['TODOIST_API_KEY'],
    note: 'todoist.com/app/settings/integrations/developer → Copy API token',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    desc: 'Messages via Twilio sandbox',
    icon: '📱',
    services: ['Send Messages', 'Reminders', 'Notifications'],
    color: 'border-emerald-500/30 bg-emerald-500/5',
    activeColor: 'border-green-500/30 bg-green-500/10',
    envKeys: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'],
    note: 'twilio.com → Free account → WhatsApp Sandbox',
  },
  {
    id: 'openweather',
    name: 'OpenWeather',
    desc: 'Weather with icons (optional)',
    icon: '🌤',
    services: ['Current Weather', '5-day Forecast', 'Feels Like', 'Humidity'],
    color: 'border-cyan-500/30 bg-cyan-500/5',
    activeColor: 'border-green-500/30 bg-green-500/10',
    envKeys: ['OPENWEATHER_KEY'],
    alwaysFree: true,
    freeNote: 'Works without key! (Open-Meteo fallback)',
    note: 'openweathermap.org → Free 1M calls/month',
  },
  {
    id: 'reddit',
    name: 'Reddit',
    desc: 'Posts, memes & news',
    icon: '🤖',
    services: ['Hot Posts', 'Memes', 'Search Posts'],
    color: 'border-orange-500/30 bg-orange-500/5',
    activeColor: 'border-green-500/30 bg-green-500/10',
    alwaysFree: true,
    freeNote: 'Always works — no key needed!',
  },
  {
    id: 'crypto',
    name: 'Crypto / Stocks',
    desc: 'Prices via CoinGecko',
    icon: '📊',
    services: ['BTC/ETH/INR Prices', 'Top 10 Coins', '24h Change'],
    color: 'border-yellow-500/30 bg-yellow-500/5',
    activeColor: 'border-green-500/30 bg-green-500/10',
    alwaysFree: true,
    freeNote: 'Always works — CoinGecko free API!',
  },
  {
    id: 'vercel',
    name: 'Vercel',
    desc: 'Deployment monitoring',
    icon: '▲',
    services: ['Deployment Status', 'Build Logs', 'Project Info'],
    color: 'border-slate-500/30 bg-slate-500/5',
    activeColor: 'border-green-500/30 bg-green-500/10',
    envKeys: ['VERCEL_TOKEN'],
  },
  {
    id: 'meta',
    name: 'Instagram/Facebook',
    desc: 'Business accounts only',
    icon: '📸',
    services: ['Instagram Posts', 'Facebook Pages'],
    color: 'border-pink-500/30 bg-pink-500/5',
    activeColor: 'border-green-500/30 bg-green-500/10',
    oauth: true,
    note: 'Sirf Business accounts supported hai.',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    desc: 'Professional posts',
    icon: '💼',
    services: ['LinkedIn Posts'],
    color: 'border-blue-400/30 bg-blue-400/5',
    activeColor: 'border-green-500/30 bg-green-500/10',
    oauth: true,
  },
];

export default function ConnectedApps() {
  const [connected, setConnected] = useState({});
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState(null);
  const [notification, setNotif]  = useState(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    loadStatus();
    const oauth    = searchParams.get('oauth');
    const platform = searchParams.get('platform');
    const msg      = searchParams.get('msg');
    if (oauth === 'success') setNotif({ type: 'success', msg: `${platform} connected! ✅` });
    if (oauth === 'error')   setNotif({ type: 'error',   msg: msg || 'Connection failed' });
  }, []);

  async function loadStatus() {
    try {
      const r = await fetch('/api/integrations/status');
      const d = await r.json();
      setConnected(d || {});
    } catch {} finally { setLoading(false); }
  }

  function isConnected(platform) {
    if (platform.alwaysFree) return true;
    return connected[platform.id] === 'connected';
  }

  const connected_count = PLATFORMS.filter(p => isConnected(p)).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Connected Apps</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            <span className="text-green-400 font-semibold">{connected_count}</span>/{PLATFORMS.length} apps active
          </p>
        </div>
        <button onClick={loadStatus} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`p-3 rounded-xl text-sm font-medium ${notification.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
          {notification.msg}
          <button onClick={() => setNotif(null)} className="float-right opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Platform Grid */}
      <div className="space-y-2">
        {PLATFORMS.map(platform => {
          const active = isConnected(platform);
          const isExp = expanded === platform.id;

          return (
            <div key={platform.id} className={`rounded-xl border transition-all duration-200 ${active ? platform.activeColor : platform.color}`}>
              <button
                onClick={() => setExpanded(isExp ? null : platform.id)}
                className="w-full flex items-center gap-3 p-3 text-left"
              >
                <span className="text-xl">{platform.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{platform.name}</span>
                    {platform.alwaysFree && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-green-500/20 text-green-400 border border-green-500/30">FREE</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{platform.desc}</p>
                </div>
                <div className="flex items-center gap-2">
                  {active
                    ? <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                    : <XCircle size={16} className="text-slate-600 flex-shrink-0" />
                  }
                  <ChevronRight size={14} className={`text-slate-600 transition-transform ${isExp ? 'rotate-90' : ''}`} />
                </div>
              </button>

              {/* Expanded detail */}
              {isExp && (
                <div className="px-3 pb-3 pt-1 space-y-3 border-t border-white/5">
                  {/* Services */}
                  <div className="flex flex-wrap gap-1">
                    {platform.services.map(s => (
                      <span key={s} className="px-2 py-0.5 rounded-full bg-white/5 text-slate-400 text-[11px] border border-white/10">{s}</span>
                    ))}
                  </div>

                  {/* Status message */}
                  {active ? (
                    <p className="text-xs text-green-400 font-medium">✓ Active — JARVIS can use this service</p>
                  ) : (
                    <div className="space-y-2">
                      {platform.freeNote && (
                        <p className="text-xs text-cyan-400">ℹ️ {platform.freeNote}</p>
                      )}
                      {platform.note && (
                        <p className="text-xs text-slate-500">📋 Setup: {platform.note}</p>
                      )}
                      {platform.envKeys && (
                        <div className="space-y-1">
                          <p className="text-xs text-slate-500">Add to Vercel Environment Variables:</p>
                          {platform.envKeys.map(key => (
                            <code key={key} className="block text-[11px] bg-slate-900 rounded px-2 py-1 text-yellow-400 border border-slate-700">
                              {key}
                            </code>
                          ))}
                        </div>
                      )}
                      {platform.oauth && (
                        <a
                          href={`/api/oauth?platform=${platform.id}`}
                          className="flex items-center gap-1.5 w-fit px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-medium hover:bg-blue-600/30 transition-colors"
                        >
                          <Plus size={12} /> Connect with OAuth
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Vercel env var note */}
      <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-slate-500">
        💡 <span className="text-blue-400">Tip:</span> Vercel Dashboard → apple-v10 → Settings → Environment Variables mein keys daalo, phir Redeploy karo.
      </div>
    </div>
  );
}
