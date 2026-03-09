'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/db/supabase';

export default function LoginPage() {
  const [mode, setMode]     = useState('login');
  const [tagline, setTagline] = useState(0);
  const TAGLINES = [
    'Tera dost. Tera AI.',
    'Jo sochte ho, woh karta hoon.',
    'Hinglish mein, dil se.',
    'Goals se goals tak, saath hoon.',
    '24/7 available. No judgement.',
  ];
  useEffect(() => {
    const t = setInterval(() => setTagline(i => (i+1) % 5), 3000);
    return () => clearInterval(t);
  }, []); // login | signup | reset
  const [email, setEmail]   = useState('');
  const [password, setPass] = useState('');
  const [name, setName]     = useState('');
  const [loading, setLoad]  = useState(false);
  const [error, setError]   = useState('');
  const [msg, setMsg]       = useState('');
  const router = useRouter();
  const sb = getSupabaseBrowser();

  async function submit(e) {
    e.preventDefault();
    setLoad(true); setError(''); setMsg('');
    try {
      if (mode === 'login') {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/');
        router.refresh();
      } else if (mode === 'signup') {
        const { error } = await sb.auth.signUp({ email, password, options: { data: { name } } });
        if (error) throw error;
        setMsg('Account create ho gaya! Email verify karo.');
      } else {
        const { error } = await sb.auth.resetPasswordForEmail(email);
        if (error) throw error;
        setMsg('Reset link bheja gaya email pe!');
      }
    } catch (e) {
      setError(e.message || 'Kuch galat hua');
    } finally {
      setLoad(false);
    }
  }

  return (
    <div className="min-h-screen w-screen bg-[#050810] hud-grid flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/8 rounded-full blur-[100px] pointer-events-none"/>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-600/6 rounded-full blur-[80px] pointer-events-none"/>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full bg-blue-500/20 ping-slow"/>
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-[0_0_40px_rgba(26,86,219,0.5)] orb-pulse">
              <span className="text-white font-black text-3xl">J</span>
            </div>
          </div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">JARVIS</h1>
          <p className="text-slate-400 text-sm mt-1 transition-all duration-500">{TAGLINES[tagline]}</p>
        </div>

        {/* Card */}
        <div className="glass-card p-6">
          <h2 className="font-bold text-white text-lg mb-1">
            {mode === 'login' ? 'Welcome back!' : mode === 'signup' ? 'Account banao' : 'Password reset'}
          </h2>
          <p className="text-slate-500 text-sm mb-5">
            {mode === 'login' ? mode === 'login' ? 'JARVIS ka intezaar tha 👋' : 'Tera AI companion ready hai' : mode === 'signup' ? 'Sirf 30 second, phir JARVIS tera hai' : 'Email pe link aayega'}
          </p>

          <form onSubmit={submit} className="space-y-3">
            {mode === 'signup' && (
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Tumhara naam</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Apna naam likho" required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:border-blue-500/50 transition-colors"/>
              </div>
            )}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tumhara@email.com" required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:border-blue-500/50 transition-colors"/>
            </div>
            {mode !== 'reset' && (
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Password</label>
                <input type="password" value={password} onChange={e => setPass(e.target.value)}
                  placeholder="••••••••" required minLength={6}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:border-blue-500/50 transition-colors"/>
              </div>
            )}

            {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
            {msg   && <p className="text-green-400 text-xs bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">{msg}</p>}

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold text-sm disabled:opacity-50 hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(26,86,219,0.3)] mt-2">
              {loading ? '...' : mode === 'login' ? 'Login Karo' : mode === 'signup' ? 'Account Banao' : 'Reset Link Bhejo'}
            </button>
          </form>

          <div className="mt-4 flex flex-col gap-1.5 text-center">
            {mode === 'login' && <>
              <button onClick={() => setMode('signup')} className="text-blue-400 text-xs hover:text-blue-300">Naya account banao →</button>
              <button onClick={() => setMode('reset')} className="text-slate-500 text-xs hover:text-slate-400">Password bhool gaya?</button>
            </>}
            {mode !== 'login' && <button onClick={() => setMode('login')} className="text-blue-400 text-xs hover:text-blue-300">← Login pe wapas jao</button>}
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-4">JARVIS v5.2 — Your Personal AI 🤖</p>
      </div>
    </div>
  );
}
