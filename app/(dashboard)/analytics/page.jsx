'use client';
import { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { RefreshCw, TrendingUp, TrendingDown, Minus, Calendar, Flame, Target, Brain } from 'lucide-react';

const TT_STYLE = { background:'#0a0f1e', border:'1px solid rgba(26,86,219,0.3)', borderRadius:8, fontSize:11, color:'#e2e8f0' };

export default function AnalyticsPage() {
  const [data, setData]     = useState(null);
  const [loading, setLoad]  = useState(true);
  const [tab, setTab]       = useState('overview');
  const [moodAI, setMoodAI] = useState(null);
  const [llmStats, setLlmStats] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoad(true);
    try {
      const r = await fetch('/api/analytics?type=full');
      const d = await r.json();
      setData(d);
      setMoodAI(d.moodAnalysis);
      setLlmStats(d.llmStats || null);
    } finally { setLoad(false); }
  }

  if (loading) return <div className="h-full flex items-center justify-center"><div className="flex flex-col items-center gap-3"><div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"/><p className="text-xs text-slate-600 animate-pulse">Data crunch ho raha hai...</p></div></div>;

  const chartLogs = data?.logs?.slice().reverse().map(l => ({
    date: l.log_date?.slice(5),
    mood: l.mood_score || 0,
    prod: l.productivity || 0,
    energy: l.energy || 0,
    focus: parseFloat(l.focus_hours) || 0,
  })) || [];

  const radarData = [
    { subject:'Mood',    A: data?.avgMood || 0,          fullMark:10 },
    { subject:'Energy',  A: data?.logs?.[0]?.energy || 0, fullMark:10 },
    { subject:'Focus',   A: Math.min((data?.totalFocusHours/7/8)*10, 10) || 0, fullMark:10 },
    { subject:'Habits',  A: Math.min((data?.avgHabitStreak/7)*10, 10) || 0, fullMark:10 },
    { subject:'Goals',   A: data?.goals?.[0]?.progress/10 || 0, fullMark:10 },
    { subject:'Consistency', A: (data?.consistencyScore || 0)/10, fullMark:10 },
  ];

  const trendIcon = moodAI?.trend === 'improving'  ? <TrendingUp  size={16} className="text-green-400"/> :
                    moodAI?.trend === 'declining'   ? <TrendingDown size={16} className="text-red-400"/> :
                    <Minus size={16} className="text-yellow-400"/>;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 pb-24 lg:pb-6 space-y-4 max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-white">📊 Teri Performance</h1>
            <p className="text-xs text-slate-500">JARVIS ne dekhа — last 30 din ka haal</p>
          </div>
          <button onClick={load} className="p-2 glass-card text-slate-500 hover:text-white rounded-xl">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''}/>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['overview','trends','habits','insights','usage'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${tab===t ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-500 bg-white/4 hover:text-slate-300'}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <>
            {/* Key Stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label:'Avg Mood',    val:`${data?.avgMood}/10`,        color:'text-purple-400' },
                { label:'Avg Prod',    val:`${data?.avgProductivity}/10`, color:'text-blue-400' },
                { label:'Consistency', val:`${data?.consistencyScore}%`,  color:'text-orange-400' },
                { label:'Focus Hrs',   val:`${data?.totalFocusHours}h`,   color:'text-cyan-400' },
                { label:'Active Goals',val:data?.activeGoals || 0,        color:'text-green-400' },
                { label:'Habit Streak',val:`${data?.avgHabitStreak}d`,    color:'text-yellow-400' },
              ].map(s => (
                <div key={s.label} className="glass-card p-3 text-center">
                  <div className={`text-xl font-black ${s.color}`}>{s.val}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Radar */}
            <div className="glass-card p-4">
              <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Performance Radar</p>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)"/>
                  <PolarAngleAxis dataKey="subject" tick={{ fill:'#64748b', fontSize:11 }}/>
                  <PolarRadiusAxis angle={30} domain={[0,10]} tick={false} axisLine={false}/>
                  <Radar dataKey="A" stroke="#1A56DB" fill="#1A56DB" fillOpacity={0.25} strokeWidth={2}/>
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Mood AI Analysis */}
            {moodAI && (
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  {trendIcon}
                  <p className="text-sm font-semibold text-white capitalize">{moodAI.trend} trend · Score: {moodAI.weekly_score}/100</p>
                </div>
                <div className="space-y-2">
                  {moodAI.insights?.map((ins, i) => (
                    <div key={i} className="flex gap-2 text-sm text-slate-400">
                      <span className="text-blue-400 shrink-0">•</span>{ins}
                    </div>
                  ))}
                  {moodAI.warnings?.map((w, i) => (
                    <div key={i} className="flex gap-2 text-sm text-red-400 bg-red-500/10 p-2 rounded-lg">
                      <span>⚠️</span>{w}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'trends' && (
          <>
            {/* Combined Line Chart */}
            <div className="glass-card p-4">
              <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Mood + Productivity + Energy</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartLogs}>
                  <XAxis dataKey="date" tick={{ fill:'#475569', fontSize:9 }} tickLine={false}/>
                  <YAxis domain={[0,10]} tick={{ fill:'#475569', fontSize:9 }} tickLine={false} axisLine={false}/>
                  <Tooltip contentStyle={TT_STYLE}/>
                  <Line type="monotone" dataKey="mood"   stroke="#6D28D9" strokeWidth={2} dot={false} name="Mood"/>
                  <Line type="monotone" dataKey="prod"   stroke="#1A56DB" strokeWidth={2} dot={false} name="Productivity"/>
                  <Line type="monotone" dataKey="energy" stroke="#0891B2" strokeWidth={2} dot={false} name="Energy"/>
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Focus Hours Bar */}
            <div className="glass-card p-4">
              <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Daily Focus Hours</p>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={chartLogs.slice(-14)}>
                  <XAxis dataKey="date" tick={{ fill:'#475569', fontSize:9 }} tickLine={false}/>
                  <Tooltip contentStyle={TT_STYLE}/>
                  <Bar dataKey="focus" fill="rgba(26,86,219,0.6)" radius={[3,3,0,0]} name="Focus hrs"/>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Day Log Heatmap */}
            <div className="glass-card p-4">
              <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">30-Day Activity Heatmap</p>
              <div className="grid grid-cols-10 gap-1">
                {Array.from({length:30}).map((_,i) => {
                  const dateStr = new Date(Date.now() - (29-i)*86400000).toISOString().split('T')[0];
                  const log = data?.logs?.find(l => l.log_date === dateStr);
                  const val = log ? Math.round((log.mood_score + log.productivity + log.energy) / 3) : 0;
                  const opacity = val === 0 ? 'bg-white/5' : val <= 3 ? 'bg-red-500/40' : val <= 6 ? 'bg-yellow-500/50' : 'bg-green-500/60';
                  return <div key={i} className={`aspect-square rounded-sm ${opacity}`} title={`${dateStr}: ${val}/10`}/>;
                })}
              </div>
              <div className="flex gap-4 mt-2 text-[10px] text-slate-600">
                <span>● No data</span>
                <span className="text-red-400">● Low (1-3)</span>
                <span className="text-yellow-400">● Medium (4-6)</span>
                <span className="text-green-400">● High (7-10)</span>
              </div>
            </div>
          </>
        )}

        {tab === 'habits' && (
          <div className="space-y-3">
            {data?.habits?.length === 0 && (
              <div className="glass-card p-8 text-center">
                <p className="text-slate-500">Chat mein "new habit add karo — [habit name]" bol ke habits banao</p>
              </div>
            )}
            {data?.habits?.map(h => (
              <div key={h.id} className="glass-card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-white">{h.name}</p>
                    <p className="text-xs text-slate-500">{h.frequency} · {h.total_done} total done</p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-full">
                    <Flame size={13} className="text-orange-400"/>
                    <span className="text-sm font-bold text-orange-400">{h.streak}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>Best: <span className="text-blue-400 font-bold">{h.best_streak}d</span></span>
                  <span>Success rate: <span className="text-green-400 font-bold">{h.total_done > 0 ? Math.round((h.streak / h.total_done) * 100) : 0}%</span></span>
                </div>
                <div className="mt-3 h-1.5 bg-white/8 rounded-full">
                  <div className="h-1.5 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full transition-all"
                    style={{ width:`${Math.min((h.streak / (h.target_days || 30)) * 100, 100)}%` }}/>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'insights' && (
          <div className="space-y-3">
            {moodAI?.suggestions?.map((s, i) => (
              <div key={i} className="glass-card p-4 border border-green-500/15 bg-green-500/5">
                <p className="text-sm text-slate-200">💡 {s}</p>
              </div>
            ))}
            {data?.prediction && (
              <div className="glass-card p-4 border border-purple-500/20 bg-purple-500/5">
                <p className="text-xs text-purple-400 font-semibold mb-2">Tomorrow's Prediction</p>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-300">{data.prediction.recommendation}</p>
                  <span className="text-2xl font-black text-purple-400">{data.prediction.predicted_score}/10</span>
                </div>
                {data.prediction.warning && (
                  <p className="text-xs text-red-400 mt-2">⚠️ {data.prediction.warning}</p>
                )}
              </div>
            )}
            {(!moodAI?.suggestions?.length && !data?.prediction) && (
              <div className="glass-card p-8 text-center">
                <Brain size={32} className="text-slate-700 mx-auto mb-3"/>
                <p className="text-slate-500 text-sm">Log a few days of data to get AI insights</p>
              </div>
            )}
          </div>
        )}

        {tab === 'usage' && (
          <div className="space-y-4">
            <div className="glass-card p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">LLM Usage — Last 7 Days</p>
              {!llmStats ? (
                <div className="text-center py-8">
                  <p className="text-slate-500 text-sm">Koi data nahi abhi</p>
                  <p className="text-slate-600 text-xs mt-1">Chat karo — usage yahan dikhega</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      ['Requests', llmStats.totalRequests, 'text-blue-400'],
                      ['Avg Latency', `${llmStats.avgLatencyMs}ms`, 'text-green-400'],
                      ['~Tokens', llmStats.totalTokens?.toLocaleString(), 'text-purple-400'],
                    ].map(([label, val, c]) => (
                      <div key={label} className="bg-white/3 rounded-xl p-3 text-center border border-white/5">
                        <p className={`text-lg font-bold ${c}`}>{val}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500 mb-2">Model Usage</p>
                    {Object.entries(llmStats.modelBreakdown || {}).map(([model, count]) => (
                      <div key={model} className="flex items-center gap-2 mb-1.5">
                        <span className="text-[11px] text-slate-400 w-40 truncate">{model}</span>
                        <div className="flex-1 bg-white/5 rounded-full h-1.5">
                          <div className="bg-blue-500 h-1.5 rounded-full" style={{width:`${(count/llmStats.totalRequests*100).toFixed(0)}%`}}/>
                        </div>
                        <span className="text-[11px] text-slate-500 w-6 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
