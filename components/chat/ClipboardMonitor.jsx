'use client';
// components/chat/ClipboardMonitor.jsx
// ═══════════════════════════════════════════════════════════════
// Watches clipboard — jab kuch copy karo, JARVIS action suggest kare
// Examples:
//   Copy a URL → "Summarize this?"
//   Copy code  → "Debug this?"
//   Copy text  → "Translate? / Summarize? / Reply draft?"
//   Copy phone → "Call? / WhatsApp?"
// Zero cost. Pure browser API. No server calls.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Clipboard, ExternalLink } from 'lucide-react';

const MAX_PREVIEW = 60;

function detectClipType(text) {
  const t = text.trim();
  if (/^https?:\/\//i.test(t)) {
    if (/youtube\.com|youtu\.be/i.test(t)) return { type: 'youtube', label: 'YouTube link', icon: '▶️' };
    if (/github\.com/i.test(t))           return { type: 'github',  label: 'GitHub link',  icon: '🐙' };
    return { type: 'url', label: 'Link', icon: '🔗' };
  }
  if (/^\d{10}$/.test(t.replace(/\s/g,''))) return { type: 'phone', label: 'Phone number', icon: '📞' };
  if (/function|const |let |var |=>|import |export |class |def |<\/?[a-z]+>/i.test(t)) return { type: 'code', label: 'Code snippet', icon: '💻' };
  if (t.split(/\s+/).length > 30) return { type: 'long_text', label: 'Long text', icon: '📄' };
  if (/[\u0900-\u097F]/.test(t)) return { type: 'hindi', label: 'Hindi text', icon: '🇮🇳' };
  return { type: 'text', label: 'Text', icon: '📋' };
}

function getSuggestions(clipInfo, text) {
  switch (clipInfo.type) {
    case 'youtube':
      return [
        { label: 'Summarize video',      cmd: `Is YouTube video ka summary do: ${text}` },
        { label: 'Key points nikalo',    cmd: `Is YouTube video ke key points nikalo: ${text}` },
      ];
    case 'github':
      return [
        { label: 'Repo explain karo',    cmd: `Is GitHub repo ko explain karo: ${text}` },
        { label: 'README summary',       cmd: `Is GitHub project ka README summarize karo: ${text}` },
      ];
    case 'url':
      return [
        { label: 'Summarize karo',       cmd: `Is page ka summary do: ${text}` },
        { label: 'Key points nikalo',    cmd: `Is link ke key points nikalo: ${text}` },
      ];
    case 'phone':
      return [
        { label: 'WhatsApp karo',        cmd: `WhatsApp karo ${text}`, direct: () => window.open(`https://wa.me/${text.replace(/\D/g,'')}`, '_blank') },
        { label: 'Call karo',            cmd: null, direct: () => window.location.href = `tel:${text.replace(/\D/g,'')}` },
      ];
    case 'code':
      return [
        { label: 'Debug karo',           cmd: `Is code mein bug dhundo aur fix karo:\n\`\`\`\n${text.slice(0,500)}\n\`\`\`` },
        { label: 'Explain karo',         cmd: `Is code ko Hinglish mein explain karo:\n\`\`\`\n${text.slice(0,500)}\n\`\`\`` },
        { label: 'Improve karo',         cmd: `Is code ko better banao:\n\`\`\`\n${text.slice(0,500)}\n\`\`\`` },
      ];
    case 'hindi':
      return [
        { label: 'English mein translate', cmd: `Translate to English: "${text.slice(0,300)}"` },
        { label: 'Summarize karo',         cmd: `Is text ka summary do: "${text.slice(0,300)}"` },
      ];
    case 'long_text':
      return [
        { label: 'Summarize karo',       cmd: `Is text ka concise summary do:\n\n${text.slice(0,800)}` },
        { label: 'Key points nikalo',    cmd: `Is text ke main points bullet mein nikalo:\n\n${text.slice(0,800)}` },
        { label: 'Reply draft karo',     cmd: `Is message ka professional reply draft karo:\n\n${text.slice(0,500)}` },
      ];
    default:
      return [
        { label: 'Explain karo',         cmd: `Explain karo: "${text.slice(0,200)}"` },
        { label: 'Translate karo',       cmd: `Translate to English: "${text.slice(0,200)}"` },
      ];
  }
}

export default function ClipboardMonitor({ onSend, enabled = true }) {
  const [clip, setClip]       = useState(null);
  const [visible, setVisible] = useState(false);
  const lastClip = useRef('');
  const timer    = useRef(null);

  const checkClipboard = useCallback(async () => {
    if (!enabled || !document.hasFocus()) return;
    try {
      const text = await navigator.clipboard.readText();
      if (!text || text === lastClip.current || text.length < 4) return;
      lastClip.current = text;

      const info = detectClipType(text);
      // Don't show for very short text (single words)
      if (info.type === 'text' && text.trim().split(/\s+/).length < 3) return;

      setClip({ text, info, suggestions: getSuggestions(info, text) });
      setVisible(true);

      // Auto-dismiss after 8 seconds
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setVisible(false), 8000);
    } catch {}
  }, [enabled]);

  useEffect(() => {
    // Listen to focus events + manual paste
    const onFocus   = () => setTimeout(checkClipboard, 300);
    const onPaste   = () => setTimeout(checkClipboard, 100);
    const onVisibility = () => { if (document.visibilityState === 'visible') setTimeout(checkClipboard, 500); };

    window.addEventListener('focus', onFocus);
    window.addEventListener('paste', onPaste);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('paste', onPaste);
      document.removeEventListener('visibilitychange', onVisibility);
      clearTimeout(timer.current);
    };
  }, [checkClipboard]);

  const dismiss = () => { setVisible(false); clearTimeout(timer.current); };

  const handleAction = (suggestion) => {
    dismiss();
    if (suggestion.direct) {
      suggestion.direct();
    } else if (suggestion.cmd && onSend) {
      onSend(suggestion.cmd);
    }
  };

  if (!visible || !clip) return null;

  const preview = clip.text.length > MAX_PREVIEW
    ? clip.text.slice(0, MAX_PREVIEW) + '…'
    : clip.text;

  return (
    <div className="fixed bottom-[80px] left-3 right-3 z-50 animate-in slide-in-from-bottom-3 duration-300">
      <div className="bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-w-[420px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Clipboard size={13} className="text-blue-400"/>
            <span className="text-[11px] font-semibold text-blue-300">{clip.info.icon} {clip.info.label} copied</span>
          </div>
          <button onClick={dismiss} className="text-slate-600 hover:text-slate-400 transition-colors p-1">
            <X size={13}/>
          </button>
        </div>

        {/* Preview */}
        <div className="px-3.5 py-2 bg-white/[0.02]">
          <p className="text-[11px] text-slate-500 font-mono leading-relaxed break-all">{preview}</p>
        </div>

        {/* Suggestions */}
        <div className="px-3.5 py-2.5 flex flex-wrap gap-1.5">
          {clip.suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => handleAction(s)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:bg-blue-500/20 transition-all">
              {s.label}
            </button>
          ))}
          <button
            onClick={() => { dismiss(); if (onSend) onSend(clip.text.slice(0, 500)); }}
            className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 transition-all">
            Seedha bhejo →
          </button>
        </div>
      </div>
    </div>
  );
}
