'use client';
// components/dashboard/AuthGuard.jsx
// Client-side auth fallback — reads Supabase session from localStorage
// Wraps DashboardClient when server-side cookie is missing

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/db/supabase';
import DashboardClient from '@/components/dashboard/DashboardClient';
import InstallBanner from '@/components/pwa/InstallBanner';

export default function AuthGuard({ children }) {
  const [state, setState] = useState('loading'); // loading | authed | unauthed
  const [user, setUser]   = useState(null);
  const [profile, setProfile] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function check() {
      try {
        const sb = getSupabaseBrowser();
        const { data: { session } } = await sb.auth.getSession();

        if (!session?.access_token) {
          setState('unauthed');
          router.replace('/login');
          return;
        }

        // Refresh cookie for server-side requests
        document.cookie = `jarvis_token=${session.access_token}; path=/; max-age=${session.expires_in || 3600}; SameSite=Lax`;
        document.cookie = `jarvis_uid=${session.user.id}; path=/; max-age=${session.expires_in || 3600}; SameSite=Lax`;

        // Fetch profile
        const { data: p } = await sb
          .from('profiles')
          .select('name,personality,city,language')
          .eq('id', session.user.id)
          .single();

        setUser(session.user);
        setProfile(p || null);
        setState('authed');
      } catch {
        setState('unauthed');
        router.replace('/login');
      }
    }
    check();
  }, []);

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-[#050810] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center animate-pulse shadow-[0_0_30px_rgba(26,86,219,0.5)]">
            <span className="text-white font-black text-lg">J</span>
          </div>
          <p className="text-slate-500 text-sm">JARVIS load ho raha hai...</p>
        </div>
      </div>
    );
  }

  if (state !== 'authed' || !user) return null;

  return (
    <>
      <DashboardClient user={user} profile={profile}>
        {children}
      </DashboardClient>
      <InstallBanner />
    </>
  );
}
