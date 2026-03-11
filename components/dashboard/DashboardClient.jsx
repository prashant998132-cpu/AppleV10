'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { MessageSquare, BarChart2, Brain, Target, BookOpen, Settings, Menu, X, LogOut, Zap, Bell, Sparkles, User } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/db/supabase';

const NAV = [
  { href: '/',           icon: Zap,           label: 'Dashboard' },
  { href: '/chat',       icon: MessageSquare, label: 'Chat'      },
  { href: '/studio',     icon: Sparkles,      label: 'Studio'    },
  { href: '/analytics',  icon: BarChart2,     label: 'Analytics' },
  { href: '/goals',      icon: Target,        label: 'Goals'     },
  { href: '/memory',     icon: Brain,         label: 'Memory'    },
  { href: '/knowledge',  icon: BookOpen,      label: 'Knowledge' },
  { href: '/profile',    icon: User,          label: 'Profile'   },
  { href: '/automation', icon: Zap,           label: 'Automation'},
  { href: '/settings',   icon: Settings,      label: 'Settings'  },
];
// Mobile bottom bar — only 5 most used (space limited)
const MOBILE_NAV = [
  { href: '/',        icon: Zap,           label: 'Home'     },
  { href: '/chat',    icon: MessageSquare, label: 'Chat'     },
  { href: '/studio',  icon: Sparkles,      label: 'Studio'   },
  { href: '/profile', icon: User,          label: 'Profile'  },
  { href: '/settings',icon: Settings,      label: 'Settings' },
];

export default function DashboardClient({ children, user, profile }) {
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
    const tick = () => setTime(new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }));
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, []);

  async function logout() {
    const sb = getSupabaseBrowser();
    await sb.auth.signOut();
    router.push('/login');
  }

  const currentPage = NAV.find(n => n.href === path)?.label || 'JARVIS';

  return (
    <div className="h-screen w-screen flex flex-col bg-[#050810] overflow-hidden safe-top">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-blue-600/6 rounded-full blur-[120px]"/>
        <div className="absolute -bottom-40 -right-40 w-[400px] h-[400px] bg-cyan-600/5 rounded-full blur-[100px]"/>
        <div className="absolute inset-0 hud-grid opacity-100"/>
      </div>

      {/* Header */}
      <header className="relative z-20 glass border-b border-white/5 px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebar(true)} className="text-slate-400 hover:text-white p-1 lg:hidden">
            <Menu size={20}/>
          </button>
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
            <div className="text-xs text-slate-600 text-center">JARVIS v10.0</div>
          </div>
        </aside>

        {/* Page content */}
        <main className="flex-1 overflow-hidden page-enter">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden relative z-20 glass border-t border-white/5 safe-bottom shrink-0">
        <div className="flex justify-around py-2 px-1">
          {MOBILE_NAV.map(({ href, icon: Icon, label }) => {
            const active = href === '/' ? path === '/' : path.startsWith(href);
            return (
              <Link key={href} href={href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all ${active ? 'text-blue-400' : 'text-slate-600'}`}>
                <Icon size={19}/>
                <span className="text-[10px]">{label}</span>
                {active && <div className="w-1 h-1 bg-blue-400 rounded-full"/>}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile sidebar overlay */}
      {sidebar && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSidebar(false)}/>
          <div className="absolute left-0 top-0 bottom-0 w-64 glass border-r border-white/5 flex flex-col p-4">
            <div className="flex justify-between items-center mb-6">
              <span className="font-black text-lg bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">JARVIS</span>
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
  );
}
