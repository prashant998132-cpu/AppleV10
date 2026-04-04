'use client';
import { useEffect, useState, Component } from 'react';

// ── Error Boundary — shows EXACT error on screen ──────────────
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) {
    console.error('[JARVIS CRASH]', error?.message, info?.componentStack?.slice(0, 200));
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{padding:'20px',background:'#050810',color:'white',minHeight:'100vh',fontFamily:'monospace'}}>
          <div style={{background:'#1a0000',border:'1px solid #ff4444',borderRadius:'12px',padding:'16px',marginBottom:'16px'}}>
            <p style={{color:'#ff6666',fontWeight:'bold',fontSize:'14px',marginBottom:'8px'}}>🔴 JARVIS Crash — Error:</p>
            <p style={{color:'#ffaaaa',fontSize:'12px',wordBreak:'break-all'}}>
              {this.state.error?.message || 'Unknown error'}
            </p>
          </div>
          <div style={{background:'#000a1a',border:'1px solid #1a56db',borderRadius:'12px',padding:'12px',marginBottom:'12px'}}>
            <p style={{color:'#4488ff',fontSize:'11px',marginBottom:'4px'}}>Stack trace:</p>
            <p style={{color:'#6699cc',fontSize:'10px',wordBreak:'break-all',whiteSpace:'pre-wrap'}}>
              {this.state.error?.stack?.slice(0, 500) || 'No stack'}
            </p>
          </div>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{background:'#1a56db',color:'white',border:'none',borderRadius:'8px',padding:'12px 24px',fontSize:'14px',cursor:'pointer',width:'100%'}}>
            🔄 Reload JARVIS
          </button>
          <p style={{color:'#444',fontSize:'10px',marginTop:'12px',textAlign:'center'}}>
            Yeh error message screenshot lekar Claude ko bhejo — crash fix ho jayega
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

import { BiometricLockScreen } from '@/components/security/BiometricLock';
import { isAppLocked, touchActivity, isBiometricLockEnabled } from '@/lib/security/biometric';
import { startBackgroundAI, scheduleStudyNotifications, registerPeriodicSync } from '@/lib/ai/background-service';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { MessageSquare, BarChart2, Brain, Target, BookOpen, Settings, Menu, X, LogOut, Zap, Bell, Sparkles, User, Mic } from 'lucide-react';
import FloatingJarvis from '@/components/chat/FloatingJarvis';

const NAV = [
  { href: '/',           icon: Zap,           label: 'Home'      },
  { href: '/chat',       icon: MessageSquare, label: 'Chat'      },
  { href: '/voice',      icon: Mic,           label: 'Voice'     },
  { href: '/studio',     icon: Sparkles,      label: 'Studio'    },
  { href: '/goals',      icon: Target,        label: 'Goals'     },
  { href: '/memory',     icon: Brain,         label: 'Memory'    },
  { href: '/analytics',  icon: BarChart2,     label: 'Analytics' },
  { href: '/knowledge',  icon: BookOpen,      label: 'Knowledge' },
  { href: '/settings',   icon: Settings,      label: 'Settings'  },
];
// Mobile bottom bar — only 5 most used (space limited)
const MOBILE_NAV = [
  { href: '/',        icon: Zap,           label: 'Home'     },
  { href: '/chat',    icon: MessageSquare, label: 'Chat'     },
  { href: '/voice',   icon: Mic,           label: 'Voice'    },
  { href: '/goals',   icon: Target,        label: 'Goals'    },
  { href: '/settings',icon: Settings,      label: 'Settings' },
];

export default function DashboardClient({ children, user, profile }) {
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined' && isBiometricLockEnabled() && isAppLocked()) {
        setLocked(true);
      }
    } catch {}

    const touch = () => { try { touchActivity(); } catch {} };
    
    // Shake detection (DeviceMotion API)
    let shakeLastX = 0, shakeLastY = 0, shakeLastZ = 0, shakeLast = 0;
    const handleShake = (e) => {
      try {
        const { x, y, z } = e.accelerationIncludingGravity || {};
        if (!x) return;
        const now = Date.now();
        if (now - shakeLast < 200) return;
        const dX = Math.abs(x - shakeLastX), dY = Math.abs(y - shakeLastY), dZ = Math.abs(z - shakeLastZ);
        shakeLastX = x; shakeLastY = y; shakeLastZ = z; shakeLast = now;
        if (dX + dY + dZ > 50) {
          window.dispatchEvent(new CustomEvent('jarvis-shake'));
        }
      } catch {}
    };
    window.addEventListener('devicemotion', handleShake, { passive: true });
    window.addEventListener('touchstart', touch, { passive: true });
    window.addEventListener('click', touch);

    // Start background services — completely wrapped, no crash
    try { startBackgroundAI(); } catch {}
    setTimeout(() => { try { scheduleStudyNotifications(); } catch {} }, 2000);
    setTimeout(() => { try { registerPeriodicSync(); } catch {} }, 3000);

    return () => {
      window.removeEventListener('jarvis-open-sidebar', openSidebar);
      window.removeEventListener('touchstart', touch);
      window.removeEventListener('click', touch);
      window.removeEventListener('devicemotion', handleShake);
    };
  }, []);
  const path   = usePathname();
  const router = useRouter();
  const [sidebar, setSidebar]   = useState(false);
  const [online, setOnline]     = useState(true);
  const [time, setTime]         = useState('');

  useEffect(() => {
    setOnline(navigator.onLine);
    window.addEventListener('online',  () => setOnline(true));
    window.addEventListener('offline', () => setOnline(false));
    // Live clock
    // Listen for chat page ≡ button to open this sidebar
    const openSidebar = () => setSidebar(true);
    window.addEventListener('jarvis-open-sidebar', openSidebar);

    const tick = () => setTime(new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }));
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, []);

  async function logout() {
    // Clear session cookies
    document.cookie = 'jarvis_token=; path=/; max-age=0';
    document.cookie = 'jarvis_uid=; path=/; max-age=0';
    router.push('/');
  }

  const currentPage = NAV.find(n => n.href === path)?.label || 'JARVIS';

  if (locked) {
    return <BiometricLockScreen onUnlock={() => { setLocked(false); touchActivity(); }} />;
  }

  return (
    <ErrorBoundary>
    <div className="h-screen w-screen flex flex-col overflow-hidden safe-top" style={{background:"var(--bg, #050810)"}}>
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-blue-600/6 rounded-full blur-[120px]"/>
        <div className="absolute -bottom-40 -right-40 w-[400px] h-[400px] bg-cyan-600/5 rounded-full blur-[100px]"/>
        <div className="absolute inset-0 hud-grid opacity-100"/>
      </div>

      {/* Header — desktop only (mobile pages have their own headers) */}
      <header className="hidden lg:flex relative z-20 glass border-b border-white/5 px-4 py-2.5 items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-[0_0_15px_rgba(26,86,219,0.4)]">
              <span className="text-white font-black text-sm">J</span>
            </div>
            <div>
              <div className="font-black text-sm bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent tracking-wider">JARVIS</div>
              <div className="text-[10px] text-slate-600">{currentPage}</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${online ? 'status-online' : 'status-offline'}`}/>
          <span className="text-xs text-slate-600">{time}</span>
          <span className="text-xs text-slate-500">{profile?.name || user?.email?.split('@')[0]}</span>
          <button onClick={logout} className="text-slate-500 hover:text-red-400 p-1.5 transition-colors">
            <LogOut size={16}/>
          </button>
        </div>
      </header>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-56 flex-col glass border-r border-white/5 shrink-0">
          <nav className="flex-1 p-3 space-y-1 pt-4">
            {NAV.map(({ href, icon: Icon, label }) => {
              const active = href === '/' ? path === '/' : path.startsWith(href);
              return (
                <Link key={href} href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${active ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-500 hover:text-slate-200 hover:bg-white/4'}`}>
                  <Icon size={17}/>
                  <span className="font-medium">{label}</span>
                  {active && <div className="ml-auto w-1.5 h-1.5 bg-blue-400 rounded-full"/>}
                </Link>
              );
            })}
          </nav>
          <div className="p-3 border-t border-white/5">
            <div className="flex items-center justify-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-green-500 shadow-[0_0_6px_#22c55e]' : 'bg-red-500'}`}/>
            <span className="text-xs text-slate-600">JARVIS v12.0 · {time}</span>
          </div>
          </div>
        </aside>

        {/* Page content */}
        {/* Floating hamburger for mobile — non-chat pages */}
        {path !== '/chat' && (
          <button onClick={()=>setSidebar(true)}
            className="lg:hidden fixed top-2.5 right-3 z-40 w-9 h-9 bg-[#0a0f1a]/90 border border-white/10 rounded-xl flex flex-col gap-[3.5px] items-center justify-center shadow-lg backdrop-blur-sm">
            <span className="block w-4 h-[1.5px] bg-slate-400 rounded-full"/>
            <span className="block w-4 h-[1.5px] bg-slate-400 rounded-full"/>
            <span className="block w-2.5 h-[1.5px] bg-slate-400 rounded-full"/>
          </button>
        )}

        <main className="flex-1 overflow-hidden h-full page-enter">
          {children}
        </main>
      </div>




      {/* Mobile sidebar overlay */}
      {sidebar && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSidebar(false)}/>
          <div className="absolute left-0 top-0 bottom-0 w-64 glass border-r border-white/5 flex flex-col p-4">
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="font-black text-lg bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">JARVIS</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-green-500 shadow-[0_0_6px_#22c55e]' : 'bg-red-500'}`}/>
                  <span className="text-[10px] text-slate-500">{online ? 'Online' : 'Offline'} · {time}</span>
                </div>
              </div>
              <button onClick={() => setSidebar(false)}><X size={18} className="text-slate-400"/></button>
            </div>
            <nav className="space-y-1 flex-1">
              {NAV.map(({ href, icon: Icon, label }) => {
                const active = href === '/' ? path === '/' : path.startsWith(href);
                return (
                  <Link key={href} href={href} onClick={() => setSidebar(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm ${active ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-500 hover:text-slate-200 hover:bg-white/4'}`}>
                    <Icon size={17}/>{label}
                  </Link>
                );
              })}
            </nav>
            <button onClick={logout} className="flex items-center gap-2 text-red-400/70 hover:text-red-400 text-sm px-3 py-2.5 mt-2">
              <LogOut size={16}/>Logout
            </button>
          </div>
        </div>
      )}
    </div>
      {/* ── Mobile Bottom Tab Bar ─────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-white/[0.07]"
        style={{paddingBottom:'env(safe-area-inset-bottom,0px)'}}>
        <div className="flex items-stretch">
          {MOBILE_NAV.map(({ href, icon: Icon, label }) => {
            const active = href === '/' ? path === '/' : path.startsWith(href);
            return (
              <Link key={href} href={href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-all active:scale-90 ${active ? 'text-blue-400' : 'text-slate-600 hover:text-slate-300'}`}>
                <div className={`relative ${active ? 'after:absolute after:-bottom-1.5 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-blue-400' : ''}`}>
                  <Icon size={20} strokeWidth={active ? 2.2 : 1.8}/>
                </div>
                <span className={`text-[10px] font-medium ${active ? 'text-blue-400' : 'text-slate-600'}`}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <FloatingJarvis/>
    </ErrorBoundary>
  );
}
