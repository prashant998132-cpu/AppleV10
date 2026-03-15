// app/layout.jsx
import './globals.css';
import Script from 'next/script';

export const metadata = {
  title: 'JARVIS — Your Personal AI',
  description: 'Aapka personal AI — chat, goals, analytics sab ek jagah. Hinglish mein.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'JARVIS' },
  themeColor: '#050810',
  keywords: ['AI', 'personal assistant', 'Hinglish', 'JARVIS', 'chat'],
};

export const viewport = {
  width: 'device-width', initialScale: 1, maximumScale: 1,
  userScalable: false, viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="hi" className="dark">
      <head>
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192.png"/>
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512.png"/>
        <meta name="mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
        <meta name="apple-mobile-web-app-title" content="JARVIS"/>
        {/* iOS splash screens */}
        <link rel="apple-touch-startup-image" href="/icons/icon-512.png"/>
        {/* Anti-flash theme script — must be in head, runs before paint */}
        <script dangerouslySetInnerHTML={{__html: `try{var th=localStorage.getItem('jarvis_theme')||'dark';var ac=localStorage.getItem('jarvis_custom_accent');var fs=localStorage.getItem('jarvis_font_size');var bgs={dark:'#050810',amoled:'#000000',soft:'#1a1a2e',green:'#020d05',purple:'#0a0010',sunset:'#0f0a00'};var acs={dark:'#1A56DB',amoled:'#3b82f6',soft:'#6366f1',green:'#00cc44',purple:'#9333ea',sunset:'#f97316'};var bg=bgs[th]||'#050810';document.documentElement.style.setProperty('--bg',bg);document.documentElement.style.setProperty('--accent',ac||(acs[th]||'#1A56DB'));document.documentElement.style.backgroundColor=bg;if(fs){var sz={small:'13px',normal:'14px',large:'16px',xlarge:'18px'};if(sz[fs])document.documentElement.style.fontSize=sz[fs];}}catch(e){}`}} />
      </head>
      <body className="bg-[#050810] text-slate-100 antialiased overflow-hidden h-screen w-screen">
        {children}

        {/* PWA: SW + Install Banner + Update Detection */}
        <Script id="pwa-init" strategy="afterInteractive">{`
          (function() {
            // ── Service Worker ──────────────────────────────
            if ('serviceWorker' in navigator) {
              // ✅ v8: Expose TTS keys to client — direct browser→Sarvam (zero Vercel bandwidth)
              // These keys are NEXT_PUBLIC_ — safe to expose, Sarvam rate-limits by key
              window.__JARVIS_KEYS__ = {
                sarvam: '${process.env.NEXT_PUBLIC_SARVAM_KEY || ''}',
                elevenlabs: '${process.env.NEXT_PUBLIC_ELEVENLABS_KEY || ''}',
              };
              navigator.serviceWorker.register('/sw.js').then(reg => {
                // Listen for updates
                reg.addEventListener('updatefound', () => {
                  const newSW = reg.installing;
                  newSW?.addEventListener('statechange', () => {
                    if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                      window.dispatchEvent(new CustomEvent('jarvis-update-available'));
                    }
                  });
                });
              }).catch(() => {});

              // SW message listener
              navigator.serviceWorker.addEventListener('message', e => {
                if (e.data?.type === 'SW_UPDATED') {
                  window.dispatchEvent(new CustomEvent('jarvis-update-available'));
                }
              });
            }

            // ── PWA Install Prompt (Chrome/Android/Edge) ────
            let deferredPrompt = null;
            window.addEventListener('beforeinstallprompt', e => {
              e.preventDefault();
              deferredPrompt = e;
              // Only show if not already installed and not dismissed recently
              const dismissed = localStorage.getItem('pwa-install-dismissed');
              const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
              if (!dismissed || parseInt(dismissed) < dayAgo) {
                window.dispatchEvent(new CustomEvent('jarvis-show-install', { detail: { prompt: e } }));
              }
            });

            window.__jarvisInstall = async function() {
              if (!deferredPrompt) return false;
              deferredPrompt.prompt();
              const { outcome } = await deferredPrompt.userChoice;
              deferredPrompt = null;
              return outcome === 'accepted';
            };

            window.addEventListener('appinstalled', () => {
              window.dispatchEvent(new CustomEvent('jarvis-installed'));
              deferredPrompt = null;
            });

            // ── iOS Install Detection ───────────────────────
            const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
            if (isIOS && !isStandalone) {
              const seen = localStorage.getItem('ios-install-seen');
              const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
              if (!seen || parseInt(seen) < weekAgo) {
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('jarvis-show-ios-install'));
                }, 4000);
              }
            }
          })();
        `}</Script>
      </body>
    </html>
  );
}
Sun Mar 15 07:06:26 UTC 2026
