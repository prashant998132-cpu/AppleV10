'use client';
// components/chat/MessageReactions.jsx — Emoji reactions for messages

import { useState } from 'react';

const REACTIONS = ['❤️', '🔥', '😂', '🤔', '💪', '🙌'];

export default function MessageReactions({ messageId, onReact }) {
  const [selected, setSelected] = useState(null);
  const [showPicker, setShowPicker] = useState(false);

  function pickReaction(emoji) {
    setSelected(emoji);
    setShowPicker(false);
    onReact?.(messageId, emoji);
  }

  return (
    <div className="relative flex items-center gap-1">
      {/* Selected reaction badge */}
      {selected && (
        <button
          onClick={() => setShowPicker(p => !p)}
          className="text-sm px-1.5 py-0.5 rounded-full bg-white/5 hover:bg-white/10 transition-all border border-white/10"
        >
          {selected}
        </button>
      )}

      {/* Add reaction button */}
      <button
        onClick={() => setShowPicker(p => !p)}
        className="text-[10px] text-slate-700 hover:text-slate-400 transition-colors opacity-0 group-hover:opacity-100"
        title="React karo"
      >
        😊+
      </button>

      {/* Picker popup */}
      {showPicker && (
        <div className="absolute bottom-6 left-0 z-50 flex gap-1 p-1.5 rounded-xl bg-[#1a1f2e] border border-white/10 shadow-2xl">
          {REACTIONS.map(emoji => (
            <button
              key={emoji}
              onClick={() => pickReaction(emoji)}
              className={`w-7 h-7 flex items-center justify-center rounded-lg text-sm transition-all hover:scale-125 hover:bg-white/10 ${selected === emoji ? 'bg-white/15' : ''}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
