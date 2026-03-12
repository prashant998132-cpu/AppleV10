'use client';
// components/chat/WorkflowProgress.jsx — Real-time workflow step tracker
// Shows live progress: Step 1 ✅ → Step 2 ⏳ → Step 3 ⬜
// Used when JARVIS executes multi-step autonomous tasks

import { useEffect, useState } from 'react';

const STATUS_CONFIG = {
  pending: { icon: '⬜', color: 'text-slate-700',  bg: 'bg-transparent',         animate: false },
  running: { icon: '⏳', color: 'text-blue-400',   bg: 'bg-blue-500/10',         animate: true  },
  done:    { icon: '✅', color: 'text-green-400',  bg: 'bg-green-500/8',         animate: false },
  error:   { icon: '❌', color: 'text-red-400',    bg: 'bg-red-500/8',           animate: false },
};

export default function WorkflowProgress({ workflow, stepStatuses, isComplete, finalResult, onDismiss }) {
  const [expanded, setExpanded] = useState(true);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (isComplete) {
      setTimeout(() => setShowResult(true), 400);
      // Auto-collapse steps after 3s
      setTimeout(() => setExpanded(false), 3000);
    }
  }, [isComplete]);

  if (!workflow) return null;

  const doneCount = Object.values(stepStatuses).filter(s => s.status === 'done').length;
  const total = workflow.steps.length;
  const progress = Math.round((doneCount / total) * 100);

  return (
    <div className="my-3 mx-1">
      {/* Header */}
      <div
        onClick={() => setExpanded(e => !e)}
        className="flex items-center justify-between bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-3 cursor-pointer hover:bg-white/[0.06] transition-all">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{workflow.emoji}</span>
          <div>
            <p className="text-sm font-semibold text-white capitalize">
              {workflow.goal?.replace(/_/g, ' ')}
            </p>
            <p className="text-[10px] text-slate-500">
              {isComplete ? `✅ Complete — ${total} steps done` : `Step ${doneCount + 1} / ${total}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Progress bar */}
          <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-600">{progress}%</span>
          <span className="text-slate-700 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Steps list */}
      {expanded && (
        <div className="mt-1 bg-white/[0.02] border border-white/[0.05] rounded-xl overflow-hidden">
          {workflow.steps.map((step, i) => {
            const s = stepStatuses[step.id] || { status: 'pending' };
            const cfg = STATUS_CONFIG[s.status];
            return (
              <div
                key={step.id}
                className={`flex items-start gap-3 px-4 py-2.5 border-b border-white/[0.04] last:border-0 transition-all ${cfg.bg} ${cfg.animate ? 'animate-pulse' : ''}`}>
                <span className="text-sm mt-0.5 shrink-0">{cfg.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${cfg.color}`}>
                    {i + 1}. {step.label}
                  </p>
                  {s.result && s.status === 'done' && (
                    <p className="text-[10px] text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                      {String(s.result).slice(0, 120)}{String(s.result).length > 120 ? '...' : ''}
                    </p>
                  )}
                  {s.status === 'error' && (
                    <p className="text-[10px] text-red-500/70 mt-0.5">{s.result}</p>
                  )}
                </div>
                {s.status === 'running' && (
                  <div className="shrink-0 flex gap-0.5 mt-1">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Final result preview */}
      {showResult && finalResult && (
        <div className="mt-2 bg-green-500/5 border border-green-500/20 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-green-400 font-semibold">✅ JARVIS ne complete kiya</span>
            {onDismiss && (
              <button onClick={onDismiss} className="text-[10px] text-slate-600 hover:text-slate-400">dismiss</button>
            )}
          </div>
          <p className="text-xs text-slate-300 leading-relaxed line-clamp-5">{finalResult}</p>
        </div>
      )}
    </div>
  );
}
