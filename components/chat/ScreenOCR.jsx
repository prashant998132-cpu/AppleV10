'use client';
// components/chat/ScreenOCR.jsx
// ══════════════════════════════════════════════════════════════
// JARVIS Screen Reader / OCR
// Take photo of anything → JARVIS reads text + takes action
// Uses: Gemini Vision (FREE) or browser OCR API
//
// Use cases:
// - Photo of notes → "Summarize karo"
// - Screenshot of error → "Fix karo"
// - Photo of book page → "Explain karo"
// - Photo of bill/receipt → "Calculate karo"
// - Photo of WhatsApp → "Reply draft karo"
// ══════════════════════════════════════════════════════════════

import { useState, useRef, useCallback } from 'react';
import { Camera, X, Scan, Type, FileText, Loader } from 'lucide-react';

const OCR_SUGGESTIONS = [
  { icon: '📖', label: 'Summarize karo',   suffix: 'Is image ka summary do' },
  { icon: '🔧', label: 'Fix/Debug karo',   suffix: 'Is mein kya galat hai? Fix karo' },
  { icon: '💬', label: 'Reply draft karo', suffix: 'Is message ka achi reply draft karo' },
  { icon: '📊', label: 'Calculate karo',   suffix: 'Is mein numbers check karo' },
  { icon: '🌐', label: 'Translate karo',   suffix: 'Is text ko English mein translate karo' },
  { icon: '📝', label: 'Notes banao',      suffix: 'Is content se clean notes banao' },
];

export default function ScreenOCR({ onSendWithImage, onClose }) {
  const [mode, setMode]         = useState('idle'); // idle|capturing|preview|processing
  const [imageData, setImageData] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [error, setError]       = useState('');
  const fileRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setMode('processing');
    setError('');

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
      setImageData(e.target.result.split(',')[1]); // base64 only
    };
    reader.readAsDataURL(file);

    // Try browser OCR first (fast, offline)
    let text = '';
    try {
      if ('createImageBitmap' in window) {
        // Try basic extraction via canvas if available
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await new Promise(r => img.onload = r);
        // We'll let AI do the OCR via vision
      }
    } catch {}

    setExtractedText(text);
    setMode('preview');
  }, []);

  const handleCameraCapture = () => {
    fileRef.current?.click();
  };

  const handleAction = (suggestion) => {
    if (!imageData && !extractedText) return;

    const message = extractedText
      ? `${suggestion.suffix}:\n\n"${extractedText}"`
      : suggestion.suffix;

    onSendWithImage?.(message, imageData);
    onClose?.();
  };

  const handleCustomQuery = (query) => {
    if (!query.trim()) return;
    onSendWithImage?.(query, imageData);
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="mt-auto bg-[#0a0d14] border-t border-white/10 rounded-t-3xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <Scan size={16} className="text-purple-400"/>
            </div>
            <div>
              <p className="text-sm font-bold text-white">Screen Reader</p>
              <p className="text-[10px] text-slate-500">Photo lo → JARVIS samjhega</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-400 p-2">
            <X size={18}/>
          </button>
        </div>

        {mode === 'idle' && (
          <div className="p-5">
            {/* Use cases */}
            <p className="text-xs text-slate-500 mb-3 text-center">Kisi bhi cheez ki photo lo:</p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {[
                { icon: '📝', text: 'Notes / Textbook' },
                { icon: '💻', text: 'Error / Code' },
                { icon: '💬', text: 'WhatsApp chat' },
                { icon: '🧾', text: 'Bill / Receipt' },
                { icon: '📋', text: 'Question paper' },
                { icon: '📜', text: 'Document' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2">
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-xs text-slate-400">{item.text}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleCameraCapture}
              className="w-full bg-purple-500/15 border border-purple-500/30 rounded-2xl py-4 flex items-center justify-center gap-3 hover:bg-purple-500/25 transition-all active:scale-98">
              <Camera size={22} className="text-purple-400"/>
              <span className="text-base font-semibold text-purple-300">Camera Kholo / File Select Karo</span>
            </button>
          </div>
        )}

        {mode === 'processing' && (
          <div className="p-8 flex flex-col items-center gap-3">
            <Loader size={32} className="text-purple-400 animate-spin"/>
            <p className="text-sm text-slate-400">Image analyze ho rahi hai...</p>
          </div>
        )}

        {mode === 'preview' && imagePreview && (
          <div className="p-4">
            {/* Image preview */}
            <div className="relative rounded-2xl overflow-hidden mb-4 border border-white/10">
              <img src={imagePreview} alt="Captured" className="w-full max-h-48 object-cover"/>
              <button
                onClick={() => { setMode('idle'); setImageData(null); setImagePreview(null); }}
                className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5 text-white">
                <X size={14}/>
              </button>
            </div>

            {/* Extracted text preview (if any) */}
            {extractedText && (
              <div className="bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 mb-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <Type size={11} className="text-slate-500"/>
                  <span className="text-[10px] text-slate-500">Extracted text</span>
                </div>
                <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">{extractedText}</p>
              </div>
            )}

            {/* Action suggestions */}
            <p className="text-[11px] text-slate-600 mb-2 text-center">Ab kya karna hai?</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {OCR_SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleAction(s)}
                  className="text-left bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 hover:bg-white/[0.07] transition-all">
                  <span className="text-base block mb-0.5">{s.icon}</span>
                  <span className="text-xs text-slate-300">{s.label}</span>
                </button>
              ))}
            </div>

            {/* Custom query */}
            <CustomQueryInput onSubmit={handleCustomQuery}/>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-400 px-5 py-3 text-center">{error}</p>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

function CustomQueryInput({ onSubmit }) {
  const [val, setVal] = useState('');
  return (
    <div className="flex gap-2">
      <input
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && val.trim() && onSubmit(val.trim())}
        placeholder="Ya apna sawaal likho..."
        className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-purple-500/40"
      />
      <button
        onClick={() => val.trim() && onSubmit(val.trim())}
        className="bg-purple-500/20 border border-purple-500/30 rounded-xl px-3 py-2 text-purple-300 text-xs hover:bg-purple-500/30 transition-all">
        Bhejo
      </button>
    </div>
  );
}
