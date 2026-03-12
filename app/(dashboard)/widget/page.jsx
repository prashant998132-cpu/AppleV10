'use client';
// app/(dashboard)/widget/page.jsx — Android Home Screen Widget Guide
// JARVIS widget: Long-press homescreen → Widgets → Chrome Custom Tab
export const dynamic = 'force-dynamic';
import { useState } from 'react';
import { Smartphone, Copy, Check, ExternalLink } from 'lucide-react';

const WIDGET_OPTIONS = [
  {
    name: 'KWGT Widget (Recommended)',
    desc: 'Beautiful custom widget — shows JARVIS chat button + time + battery',
    steps: [
      'Play Store se KWGT install karo (free)',
      'Homescreen pe long press → Widgets → KWGT',
      'Widget tap karo → Edit mein jao',
      'Launch URL set karo: https://apple-v10.vercel.app/chat',
      'Save karo — Done! 🎉',
    ],
    icon: '🎨',
    free: true,
    link: 'https://play.google.com/store/apps/details?id=org.kustom.widget',
  },
  {
    name: 'Shortcut Widget (Simplest)',
    desc: '1-tap launcher widget — seedha JARVIS chat khule',
    steps: [
      'Homescreen pe long press karo',
      '"Widgets" ya "Shortcuts" dhundo',
      '"Chrome Custom Tab" ya "Bookmark" widget add karo',
      'URL: https://apple-v10.vercel.app/chat',
      'Icon customize karo (JARVIS logo use karo)',
    ],
    icon: '⚡',
    free: true,
    link: null,
  },
  {
    name: 'MacroDroid Widget',
    desc: 'Phone automation widget — direct JARVIS commands se phone control',
    steps: [
      'MacroDroid open karo',
      'Macros → "Open JARVIS" macro banao',
      'Action: Open URL → https://apple-v10.vercel.app/chat',
      'Long press homescreen → MacroDroid Widgets',
      'Apna macro select karo',
    ],
    icon: '🤖',
    free: true,
    link: 'https://play.google.com/store/apps/details?id=com.arlosoft.macrodroid',
  },
  {
    name: 'WebView App (Best Experience)',
    desc: 'PWABuilder se APK banao — native app feel, widget bhi milega',
    steps: [
      'pwabuilder.com pe jao',
      'URL: https://apple-v10.vercel.app dalo',
      '"Build My PWA" click karo',
      'Android → Download → APK install karo',
      'Ab JARVIS ek native app ki tarah behave karega',
    ],
    icon: '📱',
    free: true,
    link: 'https://pwabuilder.com',
  },
];

export default function WidgetPage() {
  const [copied, setCopied] = useState('');

  function copy(text) {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(''), 2000);
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)]">
          <Smartphone size={20} className="text-white"/>
        </div>
        <div>
          <h1 className="text-lg font-black text-white">Home Screen Widget</h1>
          <p className="text-xs text-slate-500">JARVIS seedha homescreen pe — ek tap mein open</p>
        </div>
      </div>

      {/* JARVIS URL */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3">
        <p className="text-[10px] text-blue-400 mb-1">JARVIS URL (widget mein use karo)</p>
        <div className="flex items-center gap-2">
          <code className="text-xs text-blue-300 flex-1 break-all">https://apple-v10.vercel.app/chat</code>
          <button onClick={() => copy('https://apple-v10.vercel.app/chat')}
            className="text-blue-400 hover:text-blue-300 p-1 shrink-0">
            {copied === 'https://apple-v10.vercel.app/chat' ? <Check size={14}/> : <Copy size={14}/>}
          </button>
        </div>
      </div>

      {/* Widget options */}
      <div className="space-y-3">
        {WIDGET_OPTIONS.map((opt, i) => (
          <div key={i} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.05]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{opt.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-white">{opt.name}</p>
                    <p className="text-[11px] text-slate-500">{opt.desc}</p>
                  </div>
                </div>
                <span className="text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">FREE</span>
              </div>
            </div>
            <div className="px-4 py-3 space-y-1.5">
              {opt.steps.map((step, j) => (
                <div key={j} className="flex items-start gap-2">
                  <span className="text-[10px] text-blue-400 font-bold mt-0.5 shrink-0">{j+1}.</span>
                  <p className="text-xs text-slate-400 leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
            {opt.link && (
              <div className="px-4 pb-3">
                <a href={opt.link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300">
                  <ExternalLink size={12}/> Install karo
                </a>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pro tip */}
      <div className="bg-yellow-500/5 border border-yellow-500/15 rounded-2xl p-3">
        <p className="text-xs text-yellow-400/80 font-semibold mb-1">💡 Pro Tip</p>
        <p className="text-xs text-slate-400">JARVIS ko PWA install karo pehle (Chrome → 3 dots → "Add to Home Screen"). Phir widget add karo — native app jaise feel hoga!</p>
      </div>
    </div>
  );
}
