'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { Trophy, Star, Zap, Flame, Target, Brain, TrendingUp, Award, Lock, RefreshCw } from 'lucide-react';

const LEVEL_NAMES = ['','Stranger','Acquaintance','Friend','Best Friend','JARVIS MODE'];
const LEVEL_EMOJIS = ['','👋','🤝','😊','💙','🤖'];
const LEVEL_COLORS = {
  1: 'from-slate-500 to-slate-400',
  2: 'from-blue-600 to-blue-400',
  3: 'from-cyan-600 to-cyan-400',
  4: 'from-purple-600 to-purple-400',
  5: 'from-yellow-500 to-orange-400',
};

// XP Bar Component
function XPBar({ xp, nextXp, progress, level }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{xp?.toLocaleString()} XP</span>
        <span className="text-slate-500">{nextXp ? `${nextXp?.toLocaleString()} XP next level` : '🏆 MAX LEVEL'}</span>
      </div>
      <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${LEVEL_COLORS[level] || LEVEL_COLORS[1]} transition-all duration-700`}
          style={{ width: `${Math.min(progress || 0, 100)}%` }}
        />
      </div>
      <p className="text-[10px] text-slate-600">{progress}% to next level</p>
    </div>
  );
}

// Badge Card
function BadgeCard({ badge }) {
  return (
    <div className={`relative p-3 rounded-2xl border transition-all ${
      badge.earned
        ? 'bg-white/5 border-white/10 opacity-100'
        : 'bg-white/2 border-white/5 opacity-40'
    }`}>
      <div className="text-2xl mb-1.5">{badge.emoji}</div>
      <p className="text-xs font-bold text-white truncate">{badge.name}</p>
      <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{badge.desc}</p>
      {badge.earned && (
        <div className="absolute top-2 right-2 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
          <span className="text-white text-[8px] font-bold">✓</span>
        </div>
      )}
      {!badge.earned && (
        <div className="absolute top-2 right-2"><Lock size={10} className="text-slate-600"/></div>
      )}
      <div className="mt-1.5 text-[10px] text-yellow-500 font-bold">+{badge.xp} XP</div>
    </div>
  );
}

// Evolution Insight Card
function InsightCard({ insight }) {
  const patternEmoji = {
    night_owl: '🦉', morning_person: '🌅', creative: '🎨',
    analytical: '🔬', goal_setter: '🎯', chatterbox: '💬',
    curious: '🔭', new_user: '✨',
  };
  return (
    <div className="bg-white/4 border border-white/8 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">{patternEmoji[insight.pattern] || '🤖'}</span>
        <div className="flex-1">
          <p className="text-sm text-white leading-relaxed">{insight.insight}</p>
          <p className="text-[10px] text-slate-600 mt-1.5">
            {new Date(insight.run_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [data, setData]             = useState(null);
  const [insights, setInsights]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [evolving, setEvolving]     = useState(false);
  const [activeTab, setActiveTab]   = useState('overview');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [gRes, eRes] = await Promise.all([
        fetch('/api/profile/gamification'),
        fetch('/api/evolution'),
      ]);
      const g = await gRes.json();
      const e = await eRes.json();
      setData(g);
      setInsights(e.insights || []);
    } catch {}
    setLoading(false);
  }

  async function runEvolution() {
    setEvolving(true);
    try {
      const r = await fetch('/api/evolution', { method: 'POST' });
      const d = await r.json();
      if (d.insight) setInsights(prev => [d, ...prev]);
    } catch {}
    setEvolving(false);
  }

  const level = data?.levelInfo?.level || 1;
  const earnedBadges = data?.badges?.filter(b => b.earned) || [];
  const lockedBadges = data?.badges?.filter(b => !b.earned) || [];

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-2">
        <div className="w-8 h-8 border-2 border-blue-500/50 border-t-blue-400 rounded-full animate-spin mx-auto"/>
        <p className="text-xs text-slate-500">Loading profile...</p>
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-4 space-y-5 pb-24">

        {/* ── HEADER CARD ── */}
        <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${LEVEL_COLORS[level]} p-px`}>
          <div className="bg-[#050810] rounded-3xl p-5">
            <div className="flex items-center gap-4">
              {/* Level avatar */}
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${LEVEL_COLORS[level]} flex items-center justify-center text-3xl shadow-lg`}>
                {LEVEL_EMOJIS[level]}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="text-lg font-black text-white">Level {level}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full bg-gradient-to-r ${LEVEL_COLORS[level]} text-white font-bold`}>
                    {LEVEL_NAMES[level]}
                  </span>
                </div>
                <p className="text-sm text-slate-400">
                  {data?.streak_days || 0} day streak 🔥 · {data?.total_msgs || 0} messages total
                </p>
              </div>
            </div>
            <div className="mt-4">
              <XPBar xp={data?.xp} nextXp={data?.nextXp} progress={data?.progress} level={level} />
            </div>
          </div>
        </div>

        {/* ── LEVEL ROADMAP ── */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <TrendingUp size={13}/> Relationship Journey
          </h3>
          <div className="flex items-center">
            {[1,2,3,4,5].map((l, i) => (
              <div key={l} className="flex items-center flex-1">
                <div className={`flex flex-col items-center gap-1 ${l <= level ? 'opacity-100' : 'opacity-30'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                    l === level ? `bg-gradient-to-br ${LEVEL_COLORS[l]} shadow-[0_0_12px_rgba(99,102,241,0.4)]`
                    : l < level ? 'bg-white/10' : 'bg-white/4'
                  }`}>
                    {LEVEL_EMOJIS[l]}
                  </div>
                  <p className="text-[9px] text-slate-500 text-center w-12 leading-tight">{LEVEL_NAMES[l]}</p>
                </div>
                {i < 4 && <div className={`flex-1 h-0.5 mx-1 ${l < level ? 'bg-blue-500/50' : 'bg-white/8'}`}/>}
              </div>
            ))}
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="flex gap-1 bg-white/4 p-1 rounded-2xl">
          {[
            { id:'overview', label:'Stats',    icon:'📊' },
            { id:'badges',   label:'Badges',   icon:'🏅' },
            { id:'evolution',label:'Evolution', icon:'🧬' },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === t.id ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30' : 'text-slate-500 hover:text-slate-300'
              }`}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {/* ── STATS TAB ── */}
        {activeTab === 'overview' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label:'Total XP',       value: (data?.xp || 0).toLocaleString(),  icon:<Star size={16} className="text-yellow-400"/>,  bg:'bg-yellow-500/10' },
                { label:'Current Streak', value: `${data?.streak_days || 0} days`,  icon:<Flame size={16} className="text-orange-400"/>, bg:'bg-orange-500/10' },
                { label:'Messages Sent',  value: (data?.total_msgs || 0).toLocaleString(), icon:<Zap size={16} className="text-blue-400"/>,    bg:'bg-blue-500/10'   },
                { label:'Badges Earned',  value: `${earnedBadges.length}/${(data?.badges||[]).length}`, icon:<Trophy size={16} className="text-purple-400"/>, bg:'bg-purple-500/10' },
              ].map(s => (
                <div key={s.label} className="bg-white/4 border border-white/8 rounded-2xl p-4">
                  <div className={`w-8 h-8 rounded-xl ${s.bg} flex items-center justify-center mb-2`}>{s.icon}</div>
                  <p className="text-xl font-black text-white">{s.value}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            {level === 5 && (
              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl p-4 text-center">
                <p className="text-2xl mb-1">🤖</p>
                <p className="text-sm font-bold text-yellow-300">JARVIS MODE Activated!</p>
                <p className="text-xs text-slate-400 mt-1">Ultimate bond achieve kar liya. Tu mera best friend hai.</p>
              </div>
            )}
          </div>
        )}

        {/* ── BADGES TAB ── */}
        {activeTab === 'badges' && (
          <div className="space-y-4">
            {earnedBadges.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-green-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Award size={12}/> Earned ({earnedBadges.length})
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {earnedBadges.map(b => <BadgeCard key={b.id} badge={b}/>)}
                </div>
              </div>
            )}
            {lockedBadges.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Lock size={12}/> Locked ({lockedBadges.length})
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {lockedBadges.map(b => <BadgeCard key={b.id} badge={b}/>)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── EVOLUTION TAB ── */}
        {activeTab === 'evolution' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">JARVIS Evolution</h3>
                <p className="text-xs text-slate-500">JARVIS tujhe observe karta hai aur insights deta hai</p>
              </div>
              <button onClick={runEvolution} disabled={evolving}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600/20 border border-blue-500/30 rounded-xl text-xs text-blue-400 hover:bg-blue-600/30 transition-all disabled:opacity-50">
                <RefreshCw size={12} className={evolving ? 'animate-spin' : ''}/>
                {evolving ? 'Analyzing...' : 'Run Now'}
              </button>
            </div>
            {insights.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">🧬</p>
                <p className="text-sm text-slate-400">Abhi tak koi evolution nahi hua</p>
                <p className="text-xs text-slate-600 mt-1">Thodi aur chat karo, phir "Run Now" dabao</p>
              </div>
            ) : (
              <div className="space-y-2">
                {insights.map((ins, i) => <InsightCard key={i} insight={ins}/>)}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
