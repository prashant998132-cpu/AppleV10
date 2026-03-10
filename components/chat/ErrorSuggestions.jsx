'use client';
// components/chat/ErrorSuggestions.jsx — Smart retry when AI fails

const SUGGESTIONS = [
  { label: '🔄 Dobara try karo', action: 'retry' },
  { label: '⚡ Flash mode mein try karo', action: 'flash' },
  { label: '🌐 Simpler question likh', action: 'simplify' },
  { label: '🔌 Offline answer chahiye', action: 'offline' },
];

export default function ErrorSuggestions({ error, onAction, originalMsg }) {
  if (!error) return null;

  // Detect error type for smart suggestions
  const isNetwork = /network|fetch|timeout|ECONNREFUSED/i.test(error);
  const isAuth    = /unauthorized|403|401/i.test(error);
  const isLimit   = /429|rate.?limit|quota/i.test(error);

  const suggestions = isLimit
    ? [
        { label: '⚡ Flash mode try karo', action: 'flash' },
        { label: '🆓 Free provider use karo', action: 'free' },
        { label: '⏳ 30 sec baad dobara', action: 'retry' },
      ]
    : isNetwork
    ? [
        { label: '🔄 Retry karo', action: 'retry' },
        { label: '📡 Offline mode', action: 'offline' },
      ]
    : SUGGESTIONS;

  return (
    <div className="mt-2 flex flex-col gap-2">
      <p className="text-xs text-red-400/80 flex items-center gap-1">
        ⚠️ {isLimit ? 'API limit reach ho gayi' : isNetwork ? 'Connection issue' : 'Kuch gadbad ho gayi'}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map(s => (
          <button
            key={s.action}
            onClick={() => onAction?.(s.action, originalMsg)}
            className="text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-blue-500/20 border border-white/10 hover:border-blue-500/40 text-slate-400 hover:text-blue-300 transition-all"
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
