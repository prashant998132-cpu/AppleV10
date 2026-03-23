'use client';
export const dynamic = 'force-dynamic';
import { useState } from 'react';
import { offlineFallback } from '@/lib/ai/offline-fallback';

export default function OfflinePage() {
  const [input, setInput] = useState('');
  const [reply, setReply] = useState('');

  function ask() {
    if (!input.trim()) return;
    const r = offlineFallback(input);
    setReply(r);
  }

  return (
    <div className="min-h-screen bg-[#050810] flex flex-col items-center justify-center gap-4 p-4">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-[0_0_40px_rgba(26,86,219,0.4)]">
        <span className="text-white font-black text-2xl">J</span>
      </div>
      <h1 className="text-xl font-black text-white">Offline Mode</h1>
      <p className="text-slate-500 text-sm text-center max-w-xs">Network nahi hai — lekin main yahan hoon. Basic help kar sakta hoon!</p>

      {reply && (
        <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-slate-200 text-sm leading-relaxed">{reply}</p>
        </div>
      )}

      <div className="w-full max-w-sm flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && ask()}
          placeholder="Kuch poocho (offline mode)..."
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 outline-none focus:border-blue-500/40"
        />
        <button onClick={ask} className="px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold active:scale-95 transition-all">
          →
        </button>
      </div>

      <div className="flex gap-3 mt-2">
        <button onClick={() => window.location.reload()}
          className="px-4 py-2 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-xs hover:text-white transition-colors">
          🔄 Retry
        </button>
        <a href="/chat" className="px-4 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-xl text-xs">
          💬 Chat try karo
        </a>
      </div>
    </div>
  );
}
