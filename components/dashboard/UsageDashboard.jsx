'use client';
// components/dashboard/UsageDashboard.jsx — JARVIS v10.1
// Live API usage dashboard — limits dikhata hai sab providers ka
// Used in: Settings page → Connect tab

import { useState, useEffect } from 'react';

const PROVIDER_META = {
  gemini:           { icon: '✨', color: '#4285F4', name: 'Gemini 2.5 Flash',       limit: '250/day' },
  groq_llama4_maverick: { icon: '⚡', color: '#F97316', name: 'Groq Llama 4 Maverick',  limit: '6000/day' },
  groq_llama4_scout:    { icon: '🦅', color: '#F59E0B', name: 'Groq Llama 4 Scout',    limit: '6000/day' },
  groq_deepseek_r1:     { icon: '🧠', color: '#8B5CF6', name: 'Groq DeepSeek R1',      limit: '6000/day' },
  cerebras:         { icon: '🚀', color: '#10B981', name: 'Cerebras 3000t/s',       limit: '1000/day' },
  sambanova:        { icon: '🌊', color: '#06B6D4', name: 'SambaNova 919t/s',       limit: 'Generous' },
  together_llama4:  { icon: '🤝', color: '#6366F1', name: 'Together Llama 4',       limit: '$1 credit' },
  mistral:          { icon: '💫', color: '#EC4899', name: 'Mistral AI',             limit: '1B/month' },
  openrouter_deepseek: { icon: '🔀', color: '#84CC16', name: 'OpenRouter DeepSeek', limit: 'Free' },
  pollinations_text:    { icon: '🌸', color: '#F43F5E', name: 'Pollinations',        limit: '∞ Free' },
};

const DAILY_LIMITS = {
  gemini: 250, groq_llama4_maverick: 6000, groq_llama4_scout: 6000,
  groq_deepseek_r1: 6000, cerebras: 1000, sambanova: 999999,
  together_llama4: 9999, mistral: 99999, openrouter_deepseek: 99999, pollinations_text: 99999
};

function ProviderBar({ id, used = 0 }) {
  const meta = PROVIDER_META[id];
  if (!meta) return null;
  const limit = DAILY_LIMITS[id] || 9999;
  const pct = Math.min(100, (used / limit) * 100);
  const isHigh = pct > 80;
  const isMed = pct > 50;

  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-base w-6 text-center flex-shrink-0">{meta.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-0.5">
          <span className="text-xs text-white/70 truncate">{meta.name}</span>
          <span className={`text-[10px] flex-shrink-0 ml-2 ${isHigh ? 'text-red-400' : isMed ? 'text-yellow-400' : 'text-green-400'}`}>
            {used > 0 ? `${used.toLocaleString()}` : '0'} / {meta.limit}
          </span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.max(pct, used > 0 ? 2 : 0)}%`,
              backgroundColor: isHigh ? '#EF4444' : isMed ? '#F59E0B' : meta.color,
            }}
          />
        </div>
      </div>
      {isHigh && <span className="text-[9px] text-red-400 flex-shrink-0">⚠️</span>}
      {used === 0 && <span className="text-[9px] text-green-400 flex-shrink-0">✅</span>}
    </div>
  );
}

export default function UsageDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshed, setRefreshed] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/integrations/status');
      const d = await r.json();
      setData(d);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const refresh = async () => {
    await load();
    setRefreshed(true);
    setTimeout(() => setRefreshed(false), 2000);
  };

  const usage = data?.integrations?.usage || {};
  const activeProviders = Object.values(data?.integrations?.ai || {}).filter(p => p.configured).length;
  const totalProviders = Object.keys(data?.integrations?.ai || {}).length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">AI Usage Today</h3>
          <p className="text-[11px] text-white/40">
            {activeProviders}/{totalProviders} providers active • Auto-rotate on limit
          </p>
        </div>
        <button
          onClick={refresh}
          className="text-xs text-white/40 hover:text-white/70 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
        >
          {refreshed ? '✅' : '🔄'} Refresh
        </button>
      </div>

      {/* Summary chips */}
      <div className="flex gap-2 flex-wrap">
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-2.5 py-1 text-[11px] text-green-300">
          🌸 Pollinations — Always Free
        </div>
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl px-2.5 py-1 text-[11px] text-purple-300">
          🟣 Puter.js — Browser AI Free
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-2.5 py-1 text-[11px] text-blue-300">
          🌐 Offline — Always Works
        </div>
      </div>

      {/* Provider bars */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-8 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-white/3 rounded-2xl p-3 space-y-0.5 border border-white/5">
          {Object.entries(PROVIDER_META).map(([id]) => (
            <ProviderBar key={id} id={id} used={usage[id]?.used || 0} />
          ))}
        </div>
      )}

      {/* Vercel bandwidth */}
      <div className="bg-white/3 rounded-2xl p-3 border border-white/5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-medium text-white/70">Vercel Bandwidth</span>
          <span className="text-[11px] text-green-400">100 GB / month free</span>
        </div>
        <div className="space-y-1.5">
          {[
            { label: 'Images', value: '0 bytes', note: 'CDN URLs only ✅', color: 'green' },
            { label: 'Audio (TTS)', value: '<200KB each', note: 'base64 ya URL ✅', color: 'green' },
            { label: 'Videos', value: '0 bytes', note: 'External URLs ✅', color: 'green' },
            { label: 'Music', value: '0 bytes', note: 'Spotify/Jamendo URL ✅', color: 'green' },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between text-[11px]">
              <span className="text-white/50">{item.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-white/40">{item.value}</span>
                <span className="text-green-400">{item.note}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Smart Router note */}
      <div className="text-[10px] text-white/30 text-center px-2">
        Smart Router automatically picks cheapest/fastest provider based on your daily usage.
        Simple messages → Free providers. Complex → Best quality.
      </div>
    </div>
  );
}
