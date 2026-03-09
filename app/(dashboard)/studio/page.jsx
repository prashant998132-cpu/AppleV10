'use client';
import { useState, useEffect, useRef } from 'react';
import { clientSpeak, clientImage, clientMusic, stopCurrentAudio, pollinationsUrl } from '@/lib/ai/media-client';
import { Image, Music, Video, Mic, Sparkles, Download, Share2, RefreshCw, Play, Pause, Volume2 } from 'lucide-react';
// Browser-safe TTS helpers (no server imports in client components)
function speakBrowser(text) {
  if (typeof window === 'undefined') return;
  window.speechSynthesis?.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis?.getVoices() || [];
  const hv = voices.find(v => v.name.includes('Swara')) || voices.find(v => v.lang === 'hi-IN') || voices.find(v => v.lang.startsWith('hi'));
  if (hv) u.voice = hv;
  u.rate = 0.92; u.pitch = 1; u.lang = 'hi-IN';
  window.speechSynthesis?.speak(u);
}
function playAudio(url) {
  if (typeof window === 'undefined') return;
  new Audio(url).play().catch(() => {});
}

const TABS = [
  { id:'image', icon:Image,  label:'Image',  emoji:'🎨' },
  { id:'video', icon:Video,  label:'Video',  emoji:'🎬' },
  { id:'music', icon:Music,  label:'Music',  emoji:'🎵' },
  { id:'tts',   icon:Mic,    label:'Voice',  emoji:'🎙️' },
];

const IMAGE_STYLES = ['realistic','anime','indian','cinematic','watercolor','thumbnail','instagram','logo','portrait','landscape'];
const MUSIC_GENRES = ['hindi_film','hindi_happy','hindi_sad','motivational','lofi','meditation','classical_indian','party','folk','background'];

// ─── PUTER.JS HOOK ───────────────────────────────────────────
function usePuter() {
  const [puterReady, setPuterReady] = useState(false);
  useEffect(() => {
    if (window.puter) { setPuterReady(true); return; }
    const s = document.createElement('script');
    s.src = 'https://js.puter.com/v2/';
    s.onload = () => setPuterReady(true);
    document.head.appendChild(s);
  }, []);
  return puterReady;
}

// ─── IMAGE STUDIO ────────────────────────────────────────────
function ImageStudio({ puterReady }) {
  const [prompt, setPrompt]     = useState('');
  const [style, setStyle]       = useState('realistic');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [provider, setProvider] = useState('');
  const [error, setError]       = useState('');

  async function generate() {
    if (!prompt.trim()) return;
    setLoading(true); setError(''); setResult(null);

    // Try Puter.js first (browser-side, no key, free)
    if (puterReady && window.puter) {
      try {
        const img = await window.puter.ai.txt2img(`${prompt}, ${style}`);
        if (img?.src) {
          setResult(img.src); setProvider('Puter.js (Unlimited Free)'); setLoading(false); return;
        }
      } catch {}
    }

    // ✅ v8: clientImage returns Pollinations URL instantly (zero Vercel)
    // or calls /api/image which returns CDN URL (no base64 proxy)
    try {
      const img = await clientImage(prompt, { style, width: 512, height: 512, highQuality: false });
      if (img?.url) { setResult(img.url); setProvider(img.provider); setLoading(false); return; }
    } catch {}

    // Fallback to server chain (returns CDN URL, never base64)
    try {
      const r = await fetch('/api/image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, style }),
      });
      const d = await r.json();
      if (d.url) { setResult(d.url); setProvider(d.provider); }
      else setError(d.error || 'Generation failed');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
        placeholder="Kya dikhana chahte ho? E.g. 'Rewa ki sunset, Indian village, traditional style'"
        rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm resize-none placeholder-slate-600"/>

      {/* Style selector */}
      <div>
        <p className="text-xs text-slate-500 mb-2">Style</p>
        <div className="flex flex-wrap gap-2">
          {IMAGE_STYLES.map(s => (
            <button key={s} onClick={() => setStyle(s)}
              className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-all ${style===s ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}>
              {s.replace('_',' ')}
            </button>
          ))}
        </div>
      </div>

      <button onClick={generate} disabled={!prompt.trim() || loading}
        className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
        {loading ? <><RefreshCw size={16} className="animate-spin"/>Generating...</> : <><Sparkles size={16}/>Generate Image</>}
      </button>

      {puterReady && (
        <p className="text-xs text-green-400 text-center">✓ Puter.js ready — unlimited free generation</p>
      )}

      {error && <p className="text-xs text-red-400 bg-red-500/10 rounded-xl p-3">{error}</p>}

      {result && (
        <div className="space-y-3">
          <div className="rounded-2xl overflow-hidden border border-white/10 relative">
            <img src={result} alt="Generated" className="w-full" onError={() => setError('Image load failed')}/>
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
              <p className="text-xs text-white/70">via {provider}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <a href={result} download="jarvis-image.png" target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-300 hover:text-white transition-colors">
              <Download size={15}/>Download
            </a>
            <button onClick={generate}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600/20 border border-blue-500/30 rounded-xl text-sm text-blue-400">
              <RefreshCw size={15}/>Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── VIDEO STUDIO ────────────────────────────────────────────
function VideoStudio() {
  const [prompt, setPrompt]   = useState('');
  const [loading, setLoading] = useState(false);
  const [job, setJob]         = useState(null);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef(null);

  async function generate() {
    if (!prompt.trim()) return;
    setLoading(true); setJob(null);
    try {
      const r = await fetch('/api/video', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, duration: 5 }),
      });
      const d = await r.json();
      setJob(d);
      if (d.jobId && d.status === 'pending') startPolling(d.jobId, d.provider);
    } catch (e) { setJob({ status: 'error', message: e.message }); }
    finally { setLoading(false); }
  }

  function startPolling(jobId, provider) {
    setPolling(true);
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch('/api/video', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'poll', jobId, provider }),
        });
        const d = await r.json();
        setJob(d);
        if (d.status === 'done' || d.status === 'failed') { clearInterval(pollRef.current); setPolling(false); }
      } catch { clearInterval(pollRef.current); setPolling(false); }
    }, 5000);
  }

  useEffect(() => () => clearInterval(pollRef.current), []);

  return (
    <div className="space-y-4">
      <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
        placeholder="E.g. 'A beautiful sunrise over Indian village, time lapse, cinematic'"
        rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm resize-none placeholder-slate-600"/>

      <button onClick={generate} disabled={!prompt.trim() || loading}
        className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
        {loading ? <><RefreshCw size={16} className="animate-spin"/>Submitting...</> : <><Video size={16}/>Generate Video (5s)</>}
      </button>

      {job && (
        <div className="glass-card p-4 space-y-3">
          {job.status === 'unavailable' && (
            <>
              <p className="text-sm text-yellow-400">{job.message}</p>
              <div className="space-y-2">
                {job.links?.map(l => (
                  <a key={l.name} href={l.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors">
                    <Video size={14}/>{l.name} — Free tier available →
                  </a>
                ))}
              </div>
            </>
          )}
          {job.status === 'pending' && (
            <div className="flex items-center gap-3">
              <RefreshCw size={16} className="text-blue-400 animate-spin"/>
              <div>
                <p className="text-sm text-white">Video generate ho rahi hai...</p>
                <p className="text-xs text-slate-500">via {job.provider} · ~2-5 min</p>
              </div>
            </div>
          )}
          {job.status === 'done' && job.url && (
            <div className="space-y-2">
              <video src={job.url} controls className="w-full rounded-xl border border-white/10"/>
              <a href={job.url} download target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-300">
                <Download size={15}/>Download Video
              </a>
            </div>
          )}
          {job.status === 'failed' && <p className="text-red-400 text-sm">Generation failed. Dobara try karo.</p>}
        </div>
      )}
    </div>
  );
}

// ─── MUSIC STUDIO ────────────────────────────────────────────
function MusicStudio() {
  const [prompt, setPrompt]   = useState('');
  const [genre, setGenre]     = useState('hindi_film');
  const [duration, setDur]    = useState(30);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  async function generate() {
    if (!prompt.trim()) return;
    setLoading(true); setResult(null);
    try {
      const r = await fetch('/api/music', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, genre, duration }),
      });
      const d = await r.json();
      setResult(d);
    } catch (e) { setResult({ status: 'error', message: e.message }); }
    finally { setLoading(false); }
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  }

  return (
    <div className="space-y-4">
      <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
        placeholder="E.g. 'Happy Bollywood song for a wedding, upbeat, celebratory'"
        rows={2} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm resize-none placeholder-slate-600"/>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-slate-500 mb-1.5">Genre</p>
          <select value={genre} onChange={e => setGenre(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm">
            {MUSIC_GENRES.map(g => <option key={g} value={g} className="bg-[#0a0f1e]">{g.replace(/_/g,' ')}</option>)}
          </select>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1.5">Duration: {duration}s</p>
          <input type="range" min="10" max="60" step="5" value={duration}
            onChange={e => setDur(parseInt(e.target.value))}
            className="w-full mt-2.5 accent-green-500"/>
        </div>
      </div>

      <button onClick={generate} disabled={!prompt.trim() || loading}
        className="w-full py-3 bg-gradient-to-r from-green-600 to-cyan-600 text-white rounded-xl font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
        {loading ? <><RefreshCw size={16} className="animate-spin"/>Generating...</> : <><Music size={16}/>Generate Music</>}
      </button>

      {result && (
        <div className="glass-card p-4 space-y-3">
          {result.url && (
            <>
              <audio ref={audioRef} src={result.url} onEnded={() => setPlaying(false)} preload="auto"/>
              <div className="flex items-center gap-3">
                <button onClick={togglePlay} className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center shadow-[0_0_20px_rgba(22,163,74,0.4)] shrink-0">
                  {playing ? <Pause size={20} className="text-white"/> : <Play size={20} className="text-white ml-0.5"/>}
                </button>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{genre.replace(/_/g,' ')} · {duration}s</p>
                  <p className="text-xs text-slate-500">via {result.provider} · {result.royaltyFree ? '✓ Royalty-free' : ''}</p>
                </div>
                <a href={result.url} download="jarvis-music.mp3" className="p-2 text-slate-400 hover:text-white transition-colors">
                  <Download size={16}/>
                </a>
              </div>
            </>
          )}

          {result.status === 'manual_only' && (
            <div className="space-y-3">
              <p className="text-xs text-yellow-400">{result.message}</p>
              {result.suno && (
                <a href={result.suno.redirectUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 py-2.5 px-4 bg-yellow-600/20 border border-yellow-500/30 rounded-xl text-sm text-yellow-300 hover:text-yellow-200">
                  🎵 Suno pe jaao — {prompt.slice(0,30)}...
                </a>
              )}
              {result.udio && (
                <a href={result.udio.redirectUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 py-2.5 px-4 bg-purple-600/20 border border-purple-500/30 rounded-xl text-sm text-purple-300">
                  🎶 Udio pe jaao
                </a>
              )}
              {result.youtube?.suggestions && (
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-1">YouTube Audio Library suggestions:</p>
                  {result.youtube.suggestions.map(s => <p key={s} className="text-xs text-blue-400">• {s}</p>)}
                  <a href={result.youtube.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 mt-1 block">Open YouTube Audio Library →</a>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── TTS STUDIO ──────────────────────────────────────────────
function TTSStudio() {
  const [text, setText]       = useState('');
  const [gender, setGender]   = useState('female');
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  async function synthesize() {
    if (!text.trim()) return;
    setLoading(true); setResult(null);
    try {
      // ✅ v8: clientSpeak calls Sarvam directly from browser — zero Vercel bandwidth
      await clientSpeak(text, {
        sarvamKey: window.__JARVIS_KEYS__?.sarvam,
        elevenLabsKey: window.__JARVIS_KEYS__?.elevenlabs,
        voice: gender === 'male' ? 'amol' : 'meera',
        onEnd: () => setPlaying(false),
      });
      setResult({ provider: 'Sarvam Bulbul v3 (direct)', played: true });
    } catch (e) {
      speakBrowser(text);
      setResult({ provider: 'Browser SpeechSynthesis', played: true });
    } finally { setLoading(false); }
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  }

  const presets = [
    'Namaste yaar! Aaj ka din bahut productive raha.',
    'Tumhara goal track ho raha hai. Aaj 80% complete ho gaya.',
    'Subah ki briefing: Aaj Rewa mein mausam sunny rahega.',
    'JARVIS ready hai. Kya chahiye aapko?',
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-slate-500 mb-2">Quick presets</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {presets.map((p, i) => (
            <button key={i} onClick={() => setText(p)}
              className="shrink-0 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-slate-400 hover:text-white transition-colors text-left max-w-[160px] truncate">
              {p}
            </button>
          ))}
        </div>
      </div>

      <textarea value={text} onChange={e => setText(e.target.value)}
        placeholder="Jo bhi sunna chahte ho — Hindi ya English mein..."
        rows={4} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm resize-none placeholder-slate-600"/>

      <div className="flex gap-3">
        {['female','male'].map(g => (
          <button key={g} onClick={() => setGender(g)}
            className={`flex-1 py-2 rounded-xl text-sm capitalize transition-all ${gender===g ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40' : 'bg-white/5 text-slate-400'}`}>
            {g === 'female' ? '👩 Female' : '👨 Male'} Voice
          </button>
        ))}
      </div>

      <button onClick={synthesize} disabled={!text.trim() || loading}
        className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
        {loading ? <><RefreshCw size={16} className="animate-spin"/>Synthesizing...</> : <><Volume2 size={16}/>Speak This Text</>}
      </button>

      {result && (
        <div className="glass-card p-4">
          {result.canPlay && result.url && (
            <>
              <audio ref={audioRef} src={result.url} onEnded={() => setPlaying(false)} preload="auto"/>
              <div className="flex items-center gap-3">
                <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                  {playing ? <Pause size={16} className="text-white"/> : <Play size={16} className="text-white ml-0.5"/>}
                </button>
                <div>
                  <p className="text-sm text-white">Audio ready</p>
                  <p className="text-xs text-slate-500">via {result.provider}</p>
                </div>
                <a href={result.url} download="jarvis-voice.mp3" className="ml-auto p-2 text-slate-400 hover:text-white">
                  <Download size={15}/>
                </a>
              </div>
            </>
          )}
          {result.played && <p className="text-sm text-green-400">✓ {result.provider} se play hua</p>}
          {result.error && <p className="text-sm text-red-400">{result.error}</p>}
        </div>
      )}
    </div>
  );
}

// ─── MAIN STUDIO PAGE ────────────────────────────────────────
export default function StudioPage() {
  const [tab, setTab]     = useState('image');
  const puterReady        = usePuter();

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 pb-24 lg:pb-8 space-y-4 max-w-2xl mx-auto">

        {/* Header */}
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Sparkles size={20} className="text-purple-400"/>Creative Studio
          </h1>
          <p className="text-xs text-slate-500">Image · Video · Music · Voice — sab ek jagah</p>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-4 gap-2">
          {TABS.map(({ id, emoji, label }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex flex-col items-center gap-1 py-3 rounded-xl transition-all text-sm ${tab===id ? 'bg-blue-600/20 border border-blue-500/30 text-blue-300' : 'bg-white/4 text-slate-500 hover:text-slate-300'}`}>
              <span className="text-xl">{emoji}</span>
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>

        {/* Studio Content */}
        <div className="glass-card p-4">
          {tab === 'image' && <ImageStudio puterReady={puterReady}/>}
          {tab === 'video' && <VideoStudio/>}
          {tab === 'music' && <MusicStudio/>}
          {tab === 'tts'   && <TTSStudio/>}
        </div>
      </div>
    </div>
  );
}
