'use client';
// components/security/PinLock.jsx — PIN Lock Overlay
// SHA-256 hashed PIN stored in localStorage (never sent to server)
import { useState, useEffect, useRef } from 'react';
import { Lock, Delete, Eye, EyeOff } from 'lucide-react';

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function PinLock({ children }) {
  const [locked, setLocked]     = useState(false);
  const [pin, setPin]           = useState('');
  const [error, setError]       = useState('');
  const [shake, setShake]       = useState(false);
  const [showPin, setShowPin]   = useState(false);
  const timerRef                = useRef(null);

  // Check if PIN is configured
  useEffect(() => {
    const pinHash = localStorage.getItem('jarvis_pin_hash');
    const enabled = localStorage.getItem('jarvis_pin_enabled') === 'true';
    if (pinHash && enabled) {
      setLocked(true);
    }
    // Auto-lock after 5 min inactivity
    if (enabled) {
      const startTimer = () => {
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setLocked(true), 5 * 60 * 1000);
      };
      document.addEventListener('touchstart', startTimer);
      document.addEventListener('click', startTimer);
      startTimer();
      return () => {
        document.removeEventListener('touchstart', startTimer);
        document.removeEventListener('click', startTimer);
        clearTimeout(timerRef.current);
      };
    }
  }, []);

  async function handleDigit(d) {
    const newPin = pin + d;
    setPin(newPin);
    if (newPin.length === 4) {
      const hash = await sha256(newPin);
      const storedHash = localStorage.getItem('jarvis_pin_hash');
      if (hash === storedHash) {
        setLocked(false);
        setPin('');
        setError('');
      } else {
        setShake(true);
        setError('Galat PIN! Dobara try karo.');
        setTimeout(() => { setShake(false); setPin(''); setError(''); }, 800);
      }
    }
  }

  if (!locked) return children;

  return (
    <div className="fixed inset-0 z-[100] bg-[#050810] flex flex-col items-center justify-center p-6">
      {/* Ambient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-blue-600/8 rounded-full blur-[80px]"/>
      </div>

      <div className={`relative z-10 w-full max-w-xs space-y-8 ${shake ? 'animate-[shake_0.4s_ease]' : ''}`}
        style={shake ? { animation: 'shake 0.4s ease' } : {}}>
        {/* Icon */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(26,86,219,0.3)]">
            <Lock size={28} className="text-white"/>
          </div>
          <div>
            <h2 className="text-lg font-black text-white">JARVIS Locked</h2>
            <p className="text-xs text-slate-500">4-digit PIN daalo</p>
          </div>
        </div>

        {/* PIN dots */}
        <div className="flex justify-center gap-4">
          {[0,1,2,3].map(i => (
            <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${
              i < pin.length
                ? 'bg-blue-400 border-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]'
                : 'border-white/20 bg-transparent'
            }`}/>
          ))}
        </div>

        {error && <p className="text-center text-xs text-red-400">{error}</p>}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
            <button key={i} onClick={() => {
              if (d === '') return;
              if (d === '⌫') { setPin(p => p.slice(0, -1)); return; }
              handleDigit(d);
            }}
              className={`h-14 rounded-2xl font-bold text-lg transition-all active:scale-95 ${
                d === '' ? 'invisible' :
                d === '⌫' ? 'bg-white/4 border border-white/8 text-slate-400 hover:bg-white/8' :
                'bg-white/6 border border-white/10 text-white hover:bg-white/10'
              }`}>
              {d}
            </button>
          ))}
        </div>

        <p className="text-center text-[10px] text-slate-700">
          Settings mein PIN disable kar sakte ho
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-8px)}
          40%{transform:translateX(8px)}
          60%{transform:translateX(-6px)}
          80%{transform:translateX(6px)}
        }
      `}</style>
    </div>
  );
}

// Helper functions — call from Settings page
export async function setPIN(pin) {
  const hash = await sha256(pin);
  localStorage.setItem('jarvis_pin_hash', hash);
  localStorage.setItem('jarvis_pin_enabled', 'true');
}

export function disablePIN() {
  localStorage.removeItem('jarvis_pin_hash');
  localStorage.setItem('jarvis_pin_enabled', 'false');
}

export function isPINEnabled() {
  return localStorage.getItem('jarvis_pin_enabled') === 'true';
}
