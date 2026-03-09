'use client';
// components/chat/FollowUpChips.jsx — JARVIS v10
// Grok/Gemini-style follow-up suggestion chips after AI reply

export default function FollowUpChips({ chips = [], onChipClick, disabled = false }) {
  if (!chips || chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2 mb-1 px-1">
      {chips.slice(0, 3).map((chip, i) => (
        <button
          key={i}
          onClick={() => !disabled && onChipClick(chip)}
          disabled={disabled}
          className="text-xs px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/90 hover:border-white/20 transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed max-w-[180px] truncate"
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
