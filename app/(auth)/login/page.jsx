'use client';
// Login page — redirects directly to app (no login needed)
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/'); }, []);
  return (
    <div className="min-h-screen bg-[#050810] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-[0_0_40px_rgba(26,86,219,0.5)] animate-pulse">
          <span className="text-white font-black text-2xl">J</span>
        </div>
        <p className="text-slate-400 text-sm">JARVIS load ho raha hai...</p>
      </div>
    </div>
  );
}
