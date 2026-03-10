'use client';
// components/chat/TypingDots.jsx — Animated JARVIS thinking indicator

export default function TypingDots({ phase = '' }) {
  return (
    <div className="flex items-center gap-3">
      {/* Animated dots */}
      <div className="flex items-center gap-1">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-blue-400"
            style={{
              animation: `typingBounce 1.2s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
      {/* Phase text */}
      {phase && (
        <span className="text-xs text-slate-500 animate-pulse truncate max-w-[180px]">
          {phase}
        </span>
      )}
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
