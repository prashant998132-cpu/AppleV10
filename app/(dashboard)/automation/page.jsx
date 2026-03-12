'use client';
import { TASKER_COMMANDS } from '@/lib/automation/tasker-bridge';
export const dynamic = 'force-dynamic';
// app/(dashboard)/automation/page.jsx — MacroDroid Setup Guide

import { useState, useEffect } from 'react';

const ACTIONS = [
  { category: '📶 Network', items: [
    { action: 'wifi_on',   label: 'WiFi On',        trigger: 'jarvis_wifi_on' },
    { action: 'wifi_off',  label: 'WiFi Off',       trigger: 'jarvis_wifi_off' },
    { action: 'bt_on',     label: 'Bluetooth On',   trigger: 'jarvis_bt_on' },
    { action: 'bt_off',    label: 'Bluetooth Off',  trigger: 'jarvis_bt_off' },
  ]},
  { category: '🔊 Volume', items: [
    { action: 'volume_up',   label: 'Volume Up',    trigger: 'jarvis_volume_up' },
    { action: 'volume_down', label: 'Volume Down',  trigger: 'jarvis_volume_down' },
    { action: 'volume_mute', label: 'Mute',         trigger: 'jarvis_mute' },
    { action: 'volume_max',  label: 'Volume Max',   trigger: 'jarvis_volume_max' },
  ]},
  { category: '📱 Apps', items: [
    { action: 'open_youtube',  label: 'YouTube',     trigger: 'jarvis_open_youtube' },
    { action: 'open_whatsapp', label: 'WhatsApp',    trigger: 'jarvis_open_whatsapp' },
    { action: 'open_camera',   label: 'Camera',      trigger: 'jarvis_open_camera' },
    { action: 'open_spotify',  label: 'Spotify',     trigger: 'jarvis_open_spotify' },
    { action: 'open_maps',     label: 'Maps',        trigger: 'jarvis_open_maps' },
  ]},
  { category: '🔦 System', items: [
    { action: 'torch_on',       label: 'Torch On',      trigger: 'jarvis_torch_on' },
    { action: 'torch_off',      label: 'Torch Off',     trigger: 'jarvis_torch_off' },
    { action: 'take_screenshot',label: 'Screenshot',    trigger: 'jarvis_screenshot' },
    { action: 'lock_phone',     label: 'Lock Phone',    trigger: 'jarvis_lock' },
    { action: 'dnd_on',         label: 'DND On',        trigger: 'jarvis_dnd_on' },
  ]},
  { category: '🧠 Smart Modes', items: [
    { action: 'study_mode',  label: 'Study Mode',  trigger: 'jarvis_studymode',  desc: 'DND + Brightness min + Focus' },
    { action: 'sleep_mode',  label: 'Sleep Mode',  trigger: 'jarvis_sleepmode',  desc: 'DND + WiFi off + Dim' },
    { action: 'drive_mode',  label: 'Drive Mode',  trigger: 'jarvis_drivemode',  desc: 'BT on + Maps + DND' },
    { action: 'gym_mode',    label: 'Gym Mode',    trigger: 'jarvis_gymmode',    desc: 'Music + DND + Timer' },
  ]},
  { category: '🎵 Media', items: [
    { action: 'play_music',  label: 'Play',  trigger: 'jarvis_play' },
    { action: 'pause_music', label: 'Pause', trigger: 'jarvis_pause' },
    { action: 'next_track',  label: 'Next',  trigger: 'jarvis_next' },
  ]},
];

export default function AutomationPage() {
  const [deviceId, setDeviceId] = useState('');
  const [saved, setSaved]       = useState(false);
  const [testing, setTesting]   = useState(null);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('macrodroid_device_id');
    if (saved) setDeviceId(saved);
  }, []);

  async function testAction(action) {
    setTesting(action);
    setTestResult(null);
    try {
      const r = await fetch('/api/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const d = await r.json();
      setTestResult({ ok: d.ok, msg: d.message || d.error });
    } catch {
      setTestResult({ ok: false, msg: 'Network error' });
    }
    setTesting(null);
  }

  async function testVoice(phrase) {
    setTesting('voice_' + phrase);
    const r = await fetch('/api/automation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: phrase }),
    });
    const d = await r.json();
    setTestResult({ ok: d.ok, msg: d.message || 'Action: ' + d.action });
    setTesting(null);
  }

  return (
    <div className="min-h-screen bg-[#050810] pb-20 px-4 py-6 overflow-y-auto">
      <div className="max-w-lg mx-auto space-y-5">

        {/* Header */}
        <div className="text-center">
          <div className="text-4xl mb-2">🤖📱</div>
          <h1 className="text-xl font-black text-white">JARVIS Phone Control</h1>
          <p className="text-slate-500 text-sm mt-1">MacroDroid se phone automate karo — bilkul free!</p>
        </div>

        {/* Architecture visual */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4">
          <p className="text-xs text-slate-400 font-semibold mb-3 text-center">🔄 Kaise kaam karta hai</p>
          <div className="flex items-center justify-between text-center gap-1">
            {[
              { icon: '🎤', label: '"WiFi band karo"' },
              { icon: '→', label: '' },
              { icon: '🤖', label: 'JARVIS' },
              { icon: '→', label: '' },
              { icon: '🌐', label: 'Webhook' },
              { icon: '→', label: '' },
              { icon: '📱', label: 'MacroDroid' },
              { icon: '→', label: '' },
              { icon: '✅', label: 'WiFi OFF' },
            ].map((s, i) => (
              <div key={i} className={s.icon === '→' ? 'text-slate-600 text-lg' : 'flex flex-col items-center gap-0.5'}>
                <span className="text-lg">{s.icon}</span>
                {s.label && <span className="text-[9px] text-slate-500 leading-tight max-w-[50px]">{s.label}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Setup Steps */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 space-y-3">
          <p className="text-sm font-bold text-white">📋 Setup — 5 Steps (10 min)</p>
          {[
            { step: 1, title: 'MacroDroid Install karo', desc: 'Play Store pe FREE hai — search "MacroDroid"', action: null },
            { step: 2, title: 'Device ID copy karo', desc: 'MacroDroid → ≡ Menu → MacroDroid Hub → Device ID copy karo', action: null },
            { step: 3, title: 'Vercel mein add karo', desc: 'Vercel → apple-v10 → Settings → Env Vars → MACRODROID_DEVICE_ID = paste karo', action: null },
            { step: 4, title: 'MacroDroid Webhook triggers banao', desc: 'MacroDroid → Add Macro → Trigger: Webhooks → niche diye triggers add karo', action: null },
            { step: 5, title: 'Test karo!', desc: 'Neeche kisi bhi action ka "Test" button dabao', action: null },
          ].map(s => (
            <div key={s.step} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-blue-400 text-xs font-bold">{s.step}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{s.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Test result */}
        {testResult && (
          <div className={`p-3 rounded-xl border text-sm ${testResult.ok ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
            {testResult.ok ? '✅' : '⚠️'} {testResult.msg}
          </div>
        )}

        {/* Voice test */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">🎤 Voice Command Test</p>
          <div className="flex flex-wrap gap-2">
            {['WiFi band karo', 'Torch on karo', 'YouTube kholo', 'Volume mute', 'Screenshot lo'].map(phrase => (
              <button key={phrase}
                onClick={() => testVoice(phrase)}
                disabled={!!testing}
                className="text-xs px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all disabled:opacity-50">
                "{phrase}"
              </button>
            ))}
          </div>
        </div>

        {/* Actions list with test buttons */}
        {ACTIONS.map(group => (
          <div key={group.category} className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{group.category}</p>
            <div className="space-y-2">
              {group.items.map(item => (
                <div key={item.action} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white">{item.label}</p>
                    <p className="text-[10px] text-slate-600 font-mono">{item.trigger}</p>
                  </div>
                  <button
                    onClick={() => testAction(item.action)}
                    disabled={testing === item.action}
                    className="text-xs px-3 py-1 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 transition-all disabled:opacity-50">
                    {testing === item.action ? '...' : 'Test'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* MacroDroid trigger names to copy */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">📋 MacroDroid Trigger Names (copy karo)</p>
          <div className="grid grid-cols-2 gap-1.5">
            {ACTIONS.flatMap(g => g.items).map(item => (
              <button key={item.trigger}
                onClick={() => { navigator.clipboard?.writeText(item.trigger); }}
                className="text-left text-[10px] font-mono text-blue-400 bg-black/30 rounded px-2 py-1 hover:bg-blue-500/10 transition-all truncate">
                {item.trigger}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-600 mt-2">Tap to copy → MacroDroid mein paste karo</p>
        </div>
      </div>
    </div>
  );
}
