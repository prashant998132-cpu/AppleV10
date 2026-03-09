'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, ExternalLink, RefreshCw } from 'lucide-react';

const PLATFORMS = [
  {
    id: 'google',
    name: 'Google',
    desc: 'Calendar + Gmail + YouTube',
    icon: '🔵',
    services: ['Google Calendar', 'Gmail Drafts', 'YouTube Upload'],
    color: 'border-blue-500/30 bg-blue-500/5',
    activeColor: 'border-green-500/30 bg-green-500/10',
  },
  {
    id: 'meta',
    name: 'Instagram/Facebook',
    desc: 'Business accounts only',
    icon: '📸',
    services: ['Instagram Posts', 'Facebook Pages'],
    color: 'border-pink-500/30 bg-pink-500/5',
    activeColor: 'border-green-500/30 bg-green-500/10',
    note: 'Sirf Business accounts supported. Personal accounts ka Meta API allow nahi karta.',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    desc: 'Professional posts',
    icon: '💼',
    services: ['LinkedIn Posts'],
    color: 'border-cyan-500/30 bg-cyan-500/5',
    activeColor: 'border-green-500/30 bg-green-500/10',
  },
];

export default function ConnectedApps() {
  const [connected, setConnected]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [disconnecting, setDisc]      = useState(null);
  const [notification, setNotif]      = useState(null);
  const searchParams                  = useSearchParams();

  useEffect(() => {
    load();
    // Handle OAuth callback result
    const oauth  = searchParams.get('oauth');
    const platform = searchParams.get('platform');
    const msg    = searchParams.get('msg');
    if (oauth === 'success') setNotif({ type:'success', msg: `${platform} successfully connected!` });
    if (oauth === 'error')   setNotif({ type:'error',   msg: msg || 'Connection failed' });
  }, []);

  async function load() {
    try {
      const r = await fetch('/api/social');
      const d = await r.json();
      setConnected(d.connected || []);
    } finally { setLoading(false); }
  }

  function connect(platformId) {
    window.location.href = `/api/oauth?platform=${platformId}`;
  }

  async function disconnect(platformId) {
    setDisc(platformId);
    try {
      await fetch('/api/social', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect', platform: platformId }),
      });
      setConnected(p => p.filter(c => c !== platformId));
      setNotif({ type:'success', msg: `${platformId} disconnected` });
    } finally { setDisc(null); }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-bold text-white">Connected Apps</h2>
        <p className="text-xs text-slate-500 mt-0.5">Ek baar connect karo — JARVIS silently background mein use karega</p>
      </div>

      {notification && (
        <div className={`p-3 rounded-xl text-sm flex items-center gap-2 ${notification.type==='success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
          {notification.type==='success' ? <CheckCircle size={16}/> : <XCircle size={16}/>}
          {notification.msg}
          <button onClick={() => setNotif(null)} className="ml-auto text-xs">✕</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><RefreshCw size={20} className="animate-spin text-slate-500"/></div>
      ) : (
        <div className="space-y-3">
          {PLATFORMS.map(p => {
            const isConnected = connected.includes(p.id);
            return (
              <div key={p.id} className={`border rounded-xl p-4 transition-all ${isConnected ? p.activeColor : p.color}`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0">{p.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-white text-sm">{p.name}</p>
                      {isConnected && (
                        <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle size={10}/>Connected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{p.desc}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {p.services.map(s => (
                        <span key={s} className="text-[10px] bg-white/5 text-slate-500 px-2 py-0.5 rounded">✓ {s}</span>
                      ))}
                    </div>
                    {p.note && !isConnected && (
                      <p className="text-[10px] text-yellow-500/80 mt-2 flex items-start gap-1">
                        <span>⚠️</span>{p.note}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">
                    {isConnected ? (
                      <button onClick={() => disconnect(p.id)} disabled={disconnecting === p.id}
                        className="px-3 py-1.5 bg-red-600/20 border border-red-500/30 text-red-400 rounded-lg text-xs hover:bg-red-600/30 transition-colors disabled:opacity-50">
                        {disconnecting === p.id ? '...' : 'Disconnect'}
                      </button>
                    ) : (
                      <button onClick={() => connect(p.id)}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 transition-colors flex items-center gap-1">
                        Connect <ExternalLink size={10}/>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* What JARVIS can do when connected */}
      <div className="glass-card p-4 border border-blue-500/15">
        <p className="text-xs font-semibold text-blue-400 mb-2">Connect karne ke baad JARVIS kya karega</p>
        <div className="space-y-1.5 text-xs text-slate-400">
          <p>📅 Google: "Kal 3 baje meeting add karo" → Calendar mein auto-add</p>
          <p>📧 Google: "Client ko email draft karo" → Gmail draft ready</p>
          <p>📸 Instagram: "Yeh image Instagram pe daalo" → Business page pe post</p>
          <p>💼 LinkedIn: "Aaj ka achievement share karo" → LinkedIn pe post</p>
        </div>
      </div>
    </div>
  );
}
