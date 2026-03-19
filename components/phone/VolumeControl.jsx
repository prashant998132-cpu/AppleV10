'use client';
// Safe timeout signal — works on all Android Chrome versions
function _timeoutSignal(ms) {
  try {
    if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) return AbortSignal.timeout(ms);
  } catch {}
  const ctrl = new AbortController();
  setTimeout(() => { try { ctrl.abort(); } catch {} }, ms);
  return ctrl.signal;
}

// components/phone/VolumeControl.jsx — JARVIS Volume Direct Control
// ══════════════════════════════════════════════════════════════════
// 3 methods in order:
// 1. Web Audio API — media volume control
// 2. MediaSession API — media session control
// 3. MacroDroid webhook — full system volume (needs MacroDroid)
// ══════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Volume Hook ─────────────────────────────────────
export function useVolumeControl() {
  const [volume, setVolume] = useState(50);
  const [muted, setMuted] = useState(false);
  const [ringerMode, setRingerMode] = useState('normal'); // normal|silent|vibrate
  const [method, setMethod] = useState('unknown');
  const gainRef = useRef(null);
  const ctxRef = useRef(null);

  useEffect(() => {
    // Detect which method is available
    if ('AudioContext' in window || 'webkitAudioContext' in window) {
      setMethod('web-audio');
    } else if ('mediaSession' in navigator) {
      setMethod('media-session');
    } else {
      setMethod('macrodroid-only');
    }
  }, []);

  // Set media volume (0-100)
  const setMediaVolume = useCallback(async (level) => {
    const v = Math.max(0, Math.min(100, level)) / 100;
    setVolume(level);

    // Method 1: Web Audio API gain node
    if (gainRef.current) {
      gainRef.current.gain.value = v;
    }

    // Method 2: All HTML audio/video elements
    document.querySelectorAll('audio, video').forEach(el => { el.volume = v; });

    // Method 3: MacroDroid webhook (system volume)
    const deviceId = localStorage.getItem('jarvis_device_id');
    if (deviceId) {
      try {
        await fetch(`https://trigger.macrodroid.com/${deviceId}/jarvis_volume_set`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ level }),
          signal: _timeoutSignal(3000),
        });
      } catch {}
    }
  }, []);

  const toggleMute = useCallback(async () => {
    const newMuted = !muted;
    setMuted(newMuted);
    document.querySelectorAll('audio, video').forEach(el => { el.muted = newMuted; });

    const deviceId = localStorage.getItem('jarvis_device_id');
    if (deviceId) {
      const action = newMuted ? 'jarvis_volume_mute' : 'jarvis_ringer_on';
      try {
        await fetch(`https://trigger.macrodroid.com/${deviceId}/${action}`, {
          method: 'POST', signal: _timeoutSignal(3000),
        });
      } catch {}
    }
  }, [muted]);

  const setRinger = useCallback(async (mode) => {
    setRingerMode(mode);
    const deviceId = localStorage.getItem('jarvis_device_id');
    if (deviceId) {
      const actionMap = {
        silent: 'jarvis_volume_mute',
        vibrate: 'jarvis_vibrate_mode',
        normal: 'jarvis_ringer_on',
      };
      try {
        await fetch(`https://trigger.macrodroid.com/${deviceId}/${actionMap[mode]}`, {
          method: 'POST', signal: _timeoutSignal(3000),
        });
      } catch {}
    }
  }, []);

  // Open Android volume settings (no MacroDroid needed)
  const openVolumeSettings = () => {
    window.location.href = 'intent:#Intent;action=android.settings.SOUND_SETTINGS;end';
  };

  return {
    volume, muted, ringerMode, method,
    setMediaVolume, toggleMute, setRinger, openVolumeSettings,
  };
}

// ─── Volume Control UI ────────────────────────────────
export default function VolumeControl() {
  const { volume, muted, ringerMode, method, setMediaVolume, toggleMute, setRinger, openVolumeSettings } = useVolumeControl();
  const [dragging, setDragging] = useState(false);
  const [tempVol, setTempVol] = useState(volume);
  const [hasMacroDroid, setHasMacroDroid] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    setHasMacroDroid(!!localStorage.getItem('jarvis_device_id'));
  }, []);

  const handleSlider = (e) => {
    const v = parseInt(e.target.value);
    setTempVol(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setMediaVolume(v), 300);
  };

  const methodLabel = {
    'web-audio': '🔊 Web Audio (Media only)',
    'media-session': '🎵 Media Session',
    'macrodroid-only': '📱 MacroDroid required',
  };

  return (
    <div className="space-y-4">
      {/* Main Volume Slider */}
      <div className="bg-white/[0.04] border border-white/8 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-white flex items-center gap-2">
            🔊 Volume Control
          </p>
          <span className="text-xs text-slate-500 bg-white/5 px-2 py-1 rounded-full">
            {tempVol}%
          </span>
        </div>

        {/* Slider */}
        <div className="relative mb-4">
          <input
            type="range" min="0" max="100" value={tempVol}
            onChange={handleSlider}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #1A56DB ${tempVol}%, rgba(255,255,255,0.1) ${tempVol}%)`,
            }}
          />
        </div>

        {/* Volume quick buttons */}
        <div className="flex gap-2">
          {[0, 25, 50, 75, 100].map(v => (
            <button key={v}
              onClick={() => { setTempVol(v); setMediaVolume(v); }}
              className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all active:scale-95 ${
                Math.abs(tempVol - v) < 13 ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-500 hover:text-white'
              }`}>
              {v === 0 ? '🔇' : v === 100 ? '📢' : `${v}%`}
            </button>
          ))}
        </div>
      </div>

      {/* Ringer Mode */}
      <div className="bg-white/[0.04] border border-white/8 rounded-2xl p-4">
        <p className="text-xs text-slate-500 mb-3 font-medium">Ringer Mode</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'normal',  emoji: '🔔', label: 'Normal' },
            { id: 'vibrate', emoji: '📳', label: 'Vibrate' },
            { id: 'silent',  emoji: '🔕', label: 'Silent' },
          ].map(mode => (
            <button key={mode.id}
              onClick={() => setRinger(mode.id)}
              className={`py-3 rounded-xl flex flex-col items-center gap-1 transition-all active:scale-95 ${
                ringerMode === mode.id
                  ? 'bg-blue-600/20 border border-blue-500/30 text-blue-300'
                  : 'bg-white/[0.03] border border-white/5 text-slate-500 hover:text-white'
              }`}>
              <span className="text-xl">{mode.emoji}</span>
              <span className="text-[11px] font-medium">{mode.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Controls */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={toggleMute}
          className={`py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all active:scale-95 border ${
            muted ? 'bg-red-500/20 border-red-500/30 text-red-300' : 'bg-white/5 border-white/8 text-slate-400 hover:text-white'
          }`}>
          {muted ? '🔇 Unmute' : '🔇 Mute'}
        </button>
        <button
          onClick={openVolumeSettings}
          className="py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium bg-white/5 border border-white/8 text-slate-400 hover:text-white active:scale-95 transition-all">
          ⚙️ Settings
        </button>
      </div>

      {/* Method indicator */}
      <div className="bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2">
        <p className="text-xs text-slate-700">
          Mode: {methodLabel[method] || method}
        </p>
        {!hasMacroDroid && (
          <p className="text-xs text-slate-700 mt-0.5">
            Full system volume ke liye MacroDroid app install karo + device ID setup karo
          </p>
        )}
      </div>
    </div>
  );
}
