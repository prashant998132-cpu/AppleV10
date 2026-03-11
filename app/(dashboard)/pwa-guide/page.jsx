'use client';
export const dynamic = 'force-dynamic';
// app/(dashboard)/pwa-guide/page.jsx — PWABuilder APK Guide

export default function PWAGuidePage() {
  return (
    <div className="min-h-screen bg-[#050810] pb-24 px-4 py-6 overflow-y-auto">
      <div className="max-w-lg mx-auto space-y-5">

        {/* Header */}
        <div className="text-center">
          <div className="text-4xl mb-2">📦🤖</div>
          <h1 className="text-xl font-black text-white">JARVIS APK Banao</h1>
          <p className="text-slate-500 text-sm mt-1">Play Store ke bina — FREE Android APK</p>
        </div>

        {/* Two options */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-center">
            <div className="text-2xl mb-1">🌐</div>
            <p className="text-blue-400 text-sm font-bold">PWA Install</p>
            <p className="text-slate-500 text-xs mt-1">Browser se directly — easiest!</p>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 text-center">
            <div className="text-2xl mb-1">📦</div>
            <p className="text-purple-400 text-sm font-bold">APK via PWABuilder</p>
            <p className="text-slate-500 text-xs mt-1">Real Android app — no Play Store!</p>
          </div>
        </div>

        {/* Option 1 - PWA Install */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌐</span>
            <p className="text-white font-bold">Option 1: Browser se Install (Easiest)</p>
          </div>
          {[
            { step: 1, title: 'Chrome mein kholo', desc: 'apple-v10.vercel.app Chrome browser mein kholo' },
            { step: 2, title: 'Address bar mein icon dekho', desc: 'Address bar ke right side mein install icon (⊕) dikhayi dega' },
            { step: 3, title: 'Install tap karo', desc: '"Add to Home Screen" ya "Install" dabao' },
            { step: 4, title: 'Done!', desc: 'JARVIS home screen pe icon ke saath install ho jayega — bilkul native app jaisa!' },
          ].map(s => (
            <div key={s.step} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center shrink-0">
                <span className="text-blue-400 text-xs font-bold">{s.step}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{s.title}</p>
                <p className="text-xs text-slate-500">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Option 2 - PWABuilder APK */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">📦</span>
            <p className="text-white font-bold">Option 2: Real APK via PWABuilder</p>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
            <p className="text-yellow-400 text-xs">✅ FREE • No Play Store needed • Real Android APK • Auto-updates via Vercel</p>
          </div>
          {[
            { step: 1, title: 'PWABuilder.com kholo', desc: 'PC ya laptop pe pwbuilder.com kholo (mobile pe bhi kaam karta hai)' },
            { step: 2, title: 'URL enter karo', desc: '"apple-v10.vercel.app" URL box mein daalo → Start karo' },
            { step: 3, title: 'Score dekho', desc: 'JARVIS ka PWA score dikhayi dega — 100 ke karib hona chahiye' },
            { step: 4, title: 'Android package choose karo', desc: '"Package for Stores" → "Android" option select karo' },
            { step: 5, title: 'APK generate karo', desc: '"Generate Package" click karo → APK download ho jayegi' },
            { step: 6, title: 'Phone pe install karo', desc: 'APK file phone pe transfer karo → Settings → Unknown Sources ON karo → Install!' },
            { step: 7, title: 'Auto-updates free mein!', desc: 'Jab bhi main JARVIS update karta hoon, app khud update ho jaati hai — koi new APK nahi chahiye!' },
          ].map(s => (
            <div key={s.step} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-600/30 border border-purple-500/40 flex items-center justify-center shrink-0">
                <span className="text-purple-400 text-xs font-bold">{s.step}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{s.title}</p>
                <p className="text-xs text-slate-500">{s.desc}</p>
              </div>
            </div>
          ))}
          <a href="https://www.pwabuilder.com" target="_blank" rel="noreferrer"
            className="block mt-2 text-center py-3 bg-purple-600/20 border border-purple-500/30 text-purple-400 text-sm font-semibold rounded-xl hover:bg-purple-600/30 transition-all">
            🔗 PWABuilder.com kholo →
          </a>
        </div>

        {/* Comparison */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">🆚 Comparison</p>
          <div className="space-y-2 text-xs">
            {[
              ['', 'PWA Install', 'APK (PWABuilder)', 'Play Store'],
              ['💰 Cost', 'FREE', 'FREE', '₹1,700+'],
              ['⏱ Time', '30 sec', '10 min', '1-2 weeks'],
              ['🔄 Auto-update', '✅ Yes', '✅ Yes', '⚠️ Manual'],
              ['📱 Home icon', '✅ Yes', '✅ Yes', '✅ Yes'],
              ['🔔 Notifications', '✅ Yes', '✅ Yes', '✅ Yes'],
              ['📴 Offline', '✅ Yes', '✅ Yes', '✅ Yes'],
            ].map((row, i) => (
              <div key={i} className={`grid grid-cols-4 gap-1 ${i === 0 ? 'text-slate-500 pb-1 border-b border-white/5' : 'text-slate-300'}`}>
                {row.map((cell, j) => <span key={j} className={j === 1 ? 'text-blue-400' : j === 2 ? 'text-purple-400' : j === 3 ? 'text-slate-600' : ''}>{cell}</span>)}
              </div>
            ))}
          </div>
        </div>

        {/* Recommendation */}
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4">
          <p className="text-green-400 font-bold text-sm mb-1">💡 Meri Recommendation</p>
          <p className="text-slate-400 text-xs leading-relaxed">
            Pehle <span className="text-blue-400 font-semibold">PWA Install</span> karo (30 second) — aaj se hi use karo.
            Phir kabhi time mile toh <span className="text-purple-400 font-semibold">PWABuilder APK</span> bana lo doston ke liye share karne ke liye.
            Play Store ki zaroorat hi nahi hai!
          </p>
        </div>

      </div>
    </div>
  );
}
