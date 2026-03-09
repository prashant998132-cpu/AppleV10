'use client';
// components/settings/IntegrationSettings.jsx — JARVIS v10.1
// Shows connected apps status + quick setup links

import { useState, useEffect } from 'react';
import UsageDashboard from '@/components/dashboard/UsageDashboard';

const APP_INFO = {
  github:    { icon: '🐙', name: 'GitHub',        desc: 'Repos, commits, trending, Gist notes', setup: 'github.com/settings/tokens', noKeyWorks: true },
  vercel:    { icon: '▲',  name: 'Vercel',        desc: 'Deployment status, build logs',        setup: 'vercel.com/account/tokens' },
  calendar:  { icon: '📅', name: 'Google Cal',    desc: 'View & add events',                    setup: 'console.cloud.google.com' },
  telegram:  { icon: '✈️', name: 'Telegram Bot',  desc: 'Send messages, reminders',             setup: 'Create bot via @BotFather' },
  spotify:   { icon: '🎵', name: 'Spotify',       desc: 'Search music, new releases, previews', setup: 'developer.spotify.com' },
  notion:    { icon: '📝', name: 'Notion',        desc: 'Read/write pages & notes',             setup: 'notion.so/my-integrations' },
  drive:     { icon: '☁️', name: 'Google Drive',  desc: 'List & read files',                    setup: 'console.cloud.google.com' },
  reddit:    { icon: '🤖', name: 'Reddit',        desc: 'Top posts, memes, search',             noKey: true, noKeyWorks: true },
  pexels:    { icon: '📸', name: 'Pexels Media',  desc: 'Free photos & videos',                setup: 'pexels.com/api', noKeyWorks: true },
};

const AI_INFO = {
  gemini:       { icon: '✨', name: 'Gemini 2.5 Flash', limit: '250/day', key: 'GEMINI_API_KEY', link: 'aistudio.google.com' },
  groq:         { icon: '⚡', name: 'Groq Llama 4',      limit: '6000/day', key: 'GROQ_API_KEY', link: 'console.groq.com' },
  cerebras:     { icon: '🧠', name: 'Cerebras 3000t/s',  limit: '1000/day', key: 'CEREBRAS_API_KEY', link: 'cloud.cerebras.ai' },
  sambanova:    { icon: '🚀', name: 'SambaNova 919t/s',   limit: 'Generous', key: 'SAMBANOVA_API_KEY', link: 'cloud.sambanova.ai' },
  together:     { icon: '🤝', name: 'Together Llama 4',  limit: '$1 credit', key: 'TOGETHER_API_KEY', link: 'api.together.ai' },
  mistral:      { icon: '🌊', name: 'Mistral AI',         limit: '1B tok/mo', key: 'MISTRAL_API_KEY', link: 'console.mistral.ai' },
  openrouter:   { icon: '🔀', name: 'OpenRouter 50+',     limit: 'Varies', key: 'OPENROUTER_KEY', link: 'openrouter.ai/keys' },
  pollinations: { icon: '🌸', name: 'Pollinations',       limit: 'Unlimited', noKey: true },
  puter:        { icon: '🟣', name: 'Puter.js Claude 3.5',limit: 'Unlimited', noKey: true },
};

export default function IntegrationSettings() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('apps'); // 'apps' | 'ai' | 'media' | 'usage'

  useEffect(() => {
    fetch('/api/integrations/status')
      .then(r => r.json())
      .then(d => { setStatus(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center gap-2 text-white/50 p-4">
      <span className="animate-spin">⏳</span> Loading integration status...
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      {status?.summary && (
        <div className="flex gap-3 flex-wrap">
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-3 py-2 text-xs text-green-300">
            ✅ {status.summary.ai_providers_active}/{status.summary.ai_providers_total} AI Providers Active
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl px-3 py-2 text-xs text-blue-300">
            🔌 {status.summary.apps_connected}/{status.summary.apps_total} Apps Connected
          </div>
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-purple-300">
            📊 Bandwidth Safe: {status.summary.media_bandwidth_safe ? '✅' : '⚠️'}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1">
        {['apps', 'ai', 'media', 'usage'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === t ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
          >
            {t === 'apps' ? '🔌 Apps' : t === 'ai' ? '🤖 AI' : t === 'usage' ? '📈 Usage' : '📊 Media'}
          </button>
        ))}
      </div>

      {/* Apps Tab */}
      {tab === 'apps' && (
        <div className="space-y-2">
          {Object.entries(APP_INFO).map(([id, app]) => {
            const connected = status?.integrations?.apps?.[id]?.configured;
            return (
              <div key={id} className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5">
                <span className="text-xl w-8 text-center">{app.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium">{app.name}</span>
                    {app.noKey && <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-300 rounded">No Key!</span>}
                    {app.noKeyWorks && !app.noKey && <span className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded">Works free</span>}
                  </div>
                  <p className="text-white/40 text-xs truncate">{app.desc}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-600'}`} />
                  {!connected && app.setup && (
                    <a href={`https://${app.setup}`} target="_blank" rel="noopener"
                       className="text-xs text-blue-400 hover:text-blue-300">Setup →</a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI Tab */}
      {tab === 'ai' && (
        <div className="space-y-2">
          {Object.entries(AI_INFO).map(([id, ai]) => {
            const configured = status?.integrations?.ai?.[id]?.configured ?? ai.noKey;
            const usagePct = status?.integrations?.usage?.[id]?.percent || 0;
            return (
              <div key={id} className="bg-white/5 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-xl w-8 text-center">{ai.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm">{ai.name}</span>
                      {ai.noKey && <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-300 rounded">Free Always</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-white/40 text-xs">{ai.limit}</span>
                      {usagePct > 0 && (
                        <div className="flex-1 h-1 bg-white/10 rounded-full max-w-[80px]">
                          <div
                            className={`h-1 rounded-full ${usagePct > 80 ? 'bg-red-400' : usagePct > 50 ? 'bg-yellow-400' : 'bg-green-400'}`}
                            style={{ width: `${Math.min(100, usagePct)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`w-2 h-2 rounded-full ${configured ? 'bg-green-400' : 'bg-gray-600'}`} />
                    {!configured && ai.link && (
                      <a href={`https://${ai.link}`} target="_blank" rel="noopener"
                         className="text-xs text-blue-400 hover:text-blue-300">Get Key →</a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Usage Tab */}
      {tab === 'usage' && <UsageDashboard />}

      {/* Media Rules Tab */}
      {tab === 'media' && (
        <div className="space-y-2">
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-200 space-y-1">
            <p className="font-bold text-red-300">🔴 NEVER Proxy (Vercel bandwidth = 100GB/month)</p>
            <p>• Images → CDN URL only, never binary</p>
            <p>• Videos → External URL only</p>
            <p>• Music → External URL only</p>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-xs text-yellow-200 space-y-1">
            <p className="font-bold text-yellow-300">🟡 Conditional</p>
            <p>• TTS Audio → base64 only if &lt;200KB, else browser fallback</p>
            <p>• Images → base64 only if &lt;400KB and explicitly needed</p>
          </div>
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-xs text-green-200 space-y-1">
            <p className="font-bold text-green-300">✅ Media Providers (Zero bandwidth)</p>
            <p>• Images: Pollinations CDN → Pexels → Picsum</p>
            <p>• Audio: Sarvam → ElevenLabs → Google → Azure → Pollinations Audio → Browser</p>
            <p>• Video: YouTube embed → Pexels URL → Pixabay URL</p>
            <p>• Music: Spotify preview URL → Jamendo → YouTube link</p>
          </div>
        </div>
      )}
    </div>
  );
}
