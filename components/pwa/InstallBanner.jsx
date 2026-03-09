'use client';
import { useState, useEffect } from 'react';
import { X, Download, Share, Plus, RefreshCw, Smartphone } from 'lucide-react';

function AndroidBanner({ onInstall, onDismiss }) {
  return (
    <div className="fixed bottom-20 left-3 right-3 z-50 lg:left-auto lg:right-6 lg:bottom-6 lg:w-80 animate-slide-up">
      <div className="bg-[#0d1117] border border-blue-500/30 rounded-2xl shadow-2xl shadow-blue-500/10 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/10 px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-[0_0_18px_rgba(26,86,219,0.4)] shrink-0">
            <span className="text-white font-black text-lg">J</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-white">JARVIS Install karo</p>
            <p className="text-[11px] text-slate-400">App jaisi speed, koi storage nahi</p>
          </div>
          <button onClick={onDismiss} className="text-slate-600 hover:text-slate-400 p-1"><X size={14}/></button>
        </div>
        <div className="px-4 py-2.5 space-y-1.5">
          {[['⚡','Seedha home screen se open'],['📴','Offline bhi kaam karta hai'],['🔔','JARVIS reminders aayenge']].map(([i,t])=>(
            <div key={t} className="flex items-center gap-2.5">
              <span className="text-base">{i}</span>
              <p className="text-xs text-slate-400">{t}</p>
            </div>
          ))}
        </div>
        <div className="px-4 pb-4 flex gap-2">
          <button onClick={onDismiss} className="flex-1 py-2 rounded-xl border border-white/10 text-xs text-slate-500">Baad mein</button>
          <button onClick={onInstall} className="flex-1 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-[0_4px_16px_rgba(59,130,246,0.3)]">
            <Download size={13}/> Install karo
          </button>
        </div>
      </div>
    </div>
  );
}

function IOSGuide({ onDismiss }) {
  return (
    <div className="fixed inset-x-3 bottom-20 z-50 lg:right-6 lg:bottom-6 lg:left-auto lg:w-80 animate-slide-up">
      <div className="bg-[#0d1117] border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600/15 to-cyan-600/5 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Smartphone size={16} className="text-blue-400"/>
            <p className="text-sm font-bold text-white">iPhone pe Install karo</p>
          </div>
          <button onClick={onDismiss} className="text-slate-600 p-1"><X size={14}/></button>
        </div>
        <div className="px-4 py-3 space-y-3">
          {[
            { n:'1', I:Share,    t:'Neeche Safari Share button tap karo' },
            { n:'2', I:Plus,     t:'"Add to Home Screen" select karo' },
            { n:'3', I:Download, t:'"Add" tap karo — done!' },
          ].map(({n,I,t})=>(
            <div key={n} className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 text-[10px] font-bold flex items-center justify-center shrink-0">{n}</span>
              <I size={14} className="text-slate-500 shrink-0"/>
              <p className="text-xs text-slate-400">{t}</p>
            </div>
          ))}
        </div>
        <div className="px-4 pb-4">
          <button onClick={onDismiss} className="w-full py-2 rounded-xl border border-white/10 text-xs text-slate-500">Theek hai</button>
        </div>
      </div>
    </div>
  );
}

function UpdateBanner({ onUpdate, onDismiss }) {
  return (
    <div className="fixed top-0 inset-x-0 z-50">
      <div className="bg-gradient-to-r from-green-900/95 to-emerald-900/95 border-b border-green-500/20 backdrop-blur-sm px-4 py-2.5 flex items-center gap-3">
        <RefreshCw size={14} className="text-green-400 shrink-0 animate-spin"/>
        <p className="text-xs text-green-300 flex-1">Naya JARVIS update available hai!</p>
        <button onClick={onUpdate} className="px-3 py-1 bg-green-600 rounded-lg text-white text-xs font-medium">Refresh</button>
        <button onClick={onDismiss}><X size={13} className="text-green-800"/></button>
      </div>
    </div>
  );
}

export default function InstallBanner() {
  const [show, setShow] = useState(null);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) return;

    const handlers = {
      'jarvis-show-install':     () => setShow('android'),
      'jarvis-show-ios-install': () => setShow('ios'),
      'jarvis-update-available': () => setShow('update'),
      'jarvis-installed':        () => setShow(null),
    };
    Object.entries(handlers).forEach(([e,fn]) => window.addEventListener(e, fn));
    return () => Object.entries(handlers).forEach(([e,fn]) => window.removeEventListener(e, fn));
  }, []);

  if (!show) return null;

  function dismiss() {
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    if (show === 'ios') localStorage.setItem('ios-install-seen', Date.now().toString());
    setShow(null);
  }

  async function handleInstall() {
    await window.__jarvisInstall?.();
    setShow(null);
  }

  if (show === 'android') return <AndroidBanner onInstall={handleInstall} onDismiss={dismiss}/>;
  if (show === 'ios')     return <IOSGuide onDismiss={dismiss}/>;
  if (show === 'update')  return <UpdateBanner onUpdate={()=>window.location.reload()} onDismiss={()=>setShow(null)}/>;
  return null;
}
