'use client';
// components/security/BiometricLock.jsx
// ══════════════════════════════════════
// Fingerprint/Face ID lock screen
// App open hote hi fingerprint maango
// ══════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import {
  isBiometricAvailable, isBiometricRegistered, isBiometricSupported,
  registerBiometric, authenticateBiometric, isAppLocked, setBiometricLockEnabled,
  isBiometricLockEnabled, removeBiometric, touchActivity,
} from '@/lib/security/biometric';

// ─── LOCK SCREEN ─────────────────────────────────────
export function BiometricLockScreen({ onUnlock }) {
  const [status, setStatus] = useState('idle'); // idle|scanning|success|error
  const [error, setError] = useState(null);
  const [dots, setDots] = useState(0);

  useEffect(() => {
    if (status === 'scanning') {
      const t = setInterval(() => setDots(d => (d + 1) % 4), 400);
      return () => clearInterval(t);
    }
  }, [status]);

  const unlock = useCallback(async () => {
    setStatus('scanning');
    setError(null);
    try {
      await authenticateBiometric();
      setStatus('success');
      setTimeout(() => onUnlock?.(), 400);
    } catch (err) {
      setStatus('error');
      if (err.name === 'NotAllowedError') {
        setError('Authentication cancelled. Dobara try karo.');
      } else {
        setError(err.message || 'Authentication fail ho gaya.');
      }
      setTimeout(() => setStatus('idle'), 2000);
    }
  }, [onUnlock]);

  // Auto-trigger on mount
  useEffect(() => {
    unlock();
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#050810] flex flex-col items-center justify-center select-none">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      {/* Lock icon */}
      <div className="relative mb-10">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 ${
          status === 'success' ? 'bg-green-500/20 border-2 border-green-500/50 shadow-[0_0_40px_rgba(34,197,94,0.3)]' :
          status === 'scanning' ? 'bg-blue-500/20 border-2 border-blue-500/50 shadow-[0_0_40px_rgba(26,86,219,0.4)] animate-pulse' :
          status === 'error' ? 'bg-red-500/20 border-2 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.3)]' :
          'bg-white/5 border-2 border-white/10'
        }`}>
          <span className="text-4xl">
            {status === 'success' ? '✅' :
             status === 'scanning' ? '👆' :
             status === 'error' ? '❌' : '🔒'}
          </span>
        </div>
        {status === 'scanning' && (
          <div className="absolute inset-0 rounded-full border-2 border-blue-400/30 animate-ping" />
        )}
      </div>

      {/* App name */}
      <div className="mb-2 text-center">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(26,86,219,0.4)]">
          <span className="text-white font-black text-lg">J</span>
        </div>
        <h1 className="text-2xl font-bold text-white">JARVIS</h1>
        <p className="text-slate-500 text-sm mt-1">Tera Personal AI</p>
      </div>

      {/* Status */}
      <div className="mt-8 text-center px-8">
        <p className={`text-base font-medium mb-2 ${
          status === 'success' ? 'text-green-400' :
          status === 'scanning' ? 'text-blue-400' :
          status === 'error' ? 'text-red-400' : 'text-white/60'
        }`}>
          {status === 'success' ? '✅ Unlock ho gaya!' :
           status === 'scanning' ? `🔍 Scanning${'.'.repeat(dots)}` :
           status === 'error' ? '❌ Failed' : 'Fingerprint / Face ID se unlock karo'}
        </p>
        {error && <p className="text-red-400/70 text-xs">{error}</p>}
      </div>

      {/* Unlock button */}
      <button
        onClick={unlock}
        disabled={status === 'scanning' || status === 'success'}
        className={`mt-8 px-8 py-4 rounded-2xl font-bold text-base transition-all active:scale-95 ${
          status === 'scanning' || status === 'success'
            ? 'bg-white/5 text-white/30 cursor-not-allowed'
            : 'bg-blue-600 text-white shadow-[0_0_30px_rgba(26,86,219,0.4)] hover:bg-blue-700'
        }`}>
        {status === 'scanning' ? 'Scanning...' :
         status === 'success' ? 'Unlocked!' : '👆 Fingerprint se Unlock'}
      </button>

      {/* Time */}
      <div className="absolute bottom-12 text-center">
        <p className="text-3xl font-bold text-white/80">
          {new Date().toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' })}
        </p>
        <p className="text-slate-600 text-xs mt-1">
          {new Date().toLocaleDateString('hi-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>
    </div>
  );
}

// ─── SETTINGS PANEL ───────────────────────────────────
export function BiometricSettings() {
  const [supported, setSupported] = useState(false);
  const [available, setAvailable] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [lockEnabled, setLockEnabled] = useState(false);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSupported(isBiometricSupported());
    isBiometricAvailable().then(setAvailable);
    setRegistered(isBiometricRegistered());
    setLockEnabled(isBiometricLockEnabled());
  }, []);

  const handleRegister = async () => {
    setLoading(true);
    setStatus('');
    try {
      const pName = (() => { try { return JSON.parse(localStorage.getItem('jarvis_profile')||'{}')?.name || 'User'; } catch { return 'User'; } })();
      await registerBiometric(pName);
      setRegistered(true);
      setStatus('✅ Fingerprint register ho gaya!');
    } catch (err) {
      setStatus(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    removeBiometric();
    setRegistered(false);
    setLockEnabled(false);
    setBiometricLockEnabled(false);
    setStatus('🗑️ Biometric removed.');
  };

  const toggleLock = (val) => {
    setLockEnabled(val);
    setBiometricLockEnabled(val);
    if (val) touchActivity();
  };

  if (!supported) {
    return (
      <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4">
        <p className="text-orange-300 text-sm font-medium">⚠️ WebAuthn Support Nahi</p>
        <p className="text-orange-300/60 text-xs mt-1">Chrome Android 67+ pe kaam karta hai.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Status card */}
      <div className="bg-white/[0.04] border border-white/8 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{registered ? '🔐' : '🔓'}</span>
            <div>
              <p className="text-sm font-medium text-white">Biometric Lock</p>
              <p className="text-xs text-slate-500">
                {!available ? '⚠️ Device biometric nahi hai' :
                 registered ? '✅ Fingerprint registered' :
                 '🔴 Register nahi kiya abhi'}
              </p>
            </div>
          </div>
          {registered && (
            <div
              onClick={() => toggleLock(!lockEnabled)}
              className={`relative w-12 h-6 rounded-full cursor-pointer transition-colors ${lockEnabled ? 'bg-blue-600' : 'bg-white/10'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${lockEnabled ? 'left-7' : 'left-1'}`} />
            </div>
          )}
        </div>

        {!registered && available && (
          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-medium active:scale-95 transition-all disabled:opacity-50">
            {loading ? '⏳ Scanning...' : '👆 Fingerprint Register Karo'}
          </button>
        )}

        {registered && (
          <div className="space-y-2">
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2">
              <p className="text-xs text-green-400">
                {lockEnabled ? '🔒 App lock ON — 5 min baad auto-lock' : '🔓 Lock OFF — Tap to enable'}
              </p>
            </div>
            <button
              onClick={handleRemove}
              className="w-full py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs active:scale-95 transition-all">
              🗑️ Biometric Hatao
            </button>
          </div>
        )}

        {status && (
          <p className="text-xs text-center mt-2 text-slate-400">{status}</p>
        )}
      </div>

      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
        <p className="text-xs text-slate-600 font-medium mb-2">Kaise kaam karta hai:</p>
        <div className="space-y-1 text-xs text-slate-700">
          <p>• Phone ka fingerprint/face ID use hota hai</p>
          <p>• Data sirf tere device pe — koi server nahi</p>
          <p>• 5 min idle hone ke baad auto-lock</p>
          <p>• Chrome Android 67+ + HTTPS zarori</p>
        </div>
      </div>
    </div>
  );
}
