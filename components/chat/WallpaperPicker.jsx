'use client';
// components/chat/WallpaperPicker.jsx — JARVIS Chat Wallpaper System
// ══════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import {
  WALLPAPER_CATEGORIES, fetchWallpaper, generateAIWallpaper,
  getCurrentCategory, setCurrentCategory,
  getWallpaperOpacity, setWallpaperOpacity,
  getWallpaperBlur, setWallpaperBlur,
  isAutoModeOn, setAutoMode, getAutoCategory,
  getFavorites, addToFavorites, removeFromFavorites,
} from '@/lib/wallpaper/wallpaper-system';

export default function WallpaperPicker({ onClose, onWallpaperChange }) {
  const [activeCategory, setActiveCategory] = useState(getCurrentCategory());
  const [wallpaperUrl, setWallpaperUrl] = useState(null);
  const [opacity, setOpacityState] = useState(getWallpaperOpacity());
  const [blur, setBlurState] = useState(getWallpaperBlur());
  const [autoMode, setAutoModeState] = useState(isAutoModeOn());
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [tab, setTab] = useState('categories'); // categories|ai|favorites|settings
  const [favorites, setFavorites] = useState(getFavorites());
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState(null);

  const applyWallpaper = useCallback((catId, url) => {
    const cat = WALLPAPER_CATEGORIES[catId];
    setCurrentCategory(catId);
    setWallpaperUrl(url);
    onWallpaperChange?.({ categoryId: catId, url, category: cat });
  }, [onWallpaperChange]);

  const loadWallpaper = useCallback(async (catId, force = false) => {
    setLoading(true);
    const url = await fetchWallpaper(catId, force);
    setLoading(false);
    applyWallpaper(catId, url);
  }, [applyWallpaper]);

  const handleCategory = useCallback(async (catId) => {
    setActiveCategory(catId);
    const cat = WALLPAPER_CATEGORIES[catId];
    if (cat.solidColor || !cat.unsplashQuery) {
      applyWallpaper(catId, null);
    } else {
      loadWallpaper(catId);
    }
  }, [loadWallpaper, applyWallpaper]);

  const handleAutoToggle = (val) => {
    setAutoMode(val);
    setAutoModeState(val);
    if (val) {
      const autoCat = getAutoCategory();
      handleCategory(autoCat);
    }
  };

  const handleOpacity = (val) => {
    setOpacityState(val);
    setWallpaperOpacity(val);
    onWallpaperChange?.({ opacity: val });
  };

  const handleBlur = (val) => {
    setBlurState(val);
    setWallpaperBlur(val);
    onWallpaperChange?.({ blur: val });
  };

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    const url = await generateAIWallpaper(activeCategory, aiPrompt);
    setAiLoading(false);
    if (url) {
      setAiResult(url);
      applyWallpaper(activeCategory, url);
    }
  };

  const handleFavorite = () => {
    if (!wallpaperUrl) return;
    const favs = addToFavorites(wallpaperUrl, activeCategory);
    setFavorites(favs);
    navigator.vibrate?.(40);
  };

  const handleRefresh = () => loadWallpaper(activeCategory, true);

  const cat = WALLPAPER_CATEGORIES[activeCategory];

  return (
    <div className="fixed inset-0 z-[9998] bg-black/80 backdrop-blur-sm flex flex-col" onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div className="mt-auto bg-[#080c14] rounded-t-3xl border-t border-white/10 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.06]">
          <div>
            <h3 className="text-white font-bold text-base">🎨 Chat Wallpaper</h3>
            <p className="text-slate-600 text-xs mt-0.5">
              {autoMode ? `🕐 Auto mode — ${cat?.label}` : cat?.label}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {wallpaperUrl && (
              <button onClick={handleFavorite} className="p-2 text-yellow-400/60 hover:text-yellow-400 transition-colors">
                ⭐
              </button>
            )}
            {!cat?.solidColor && wallpaperUrl && (
              <button onClick={handleRefresh} className="p-2 text-slate-500 hover:text-white transition-colors text-sm">
                🔄
              </button>
            )}
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
              ✕
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="relative h-32 mx-4 mt-3 rounded-2xl overflow-hidden border border-white/10">
          {/* Background */}
          {wallpaperUrl ? (
            <img src={wallpaperUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity, filter: `blur(${blur}px)` }} />
          ) : (
            <div className="absolute inset-0" style={{ background: cat?.gradient || '#050810' }} />
          )}
          {/* Sample messages */}
          <div className="absolute inset-0 flex flex-col justify-end p-3 gap-1.5">
            <div className="self-end bg-blue-600/90 text-white text-xs px-3 py-1.5 rounded-2xl rounded-br-sm max-w-[60%]">
              Aaj kaisa hai? 😊
            </div>
            <div className="self-start bg-white/10 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-2xl rounded-bl-sm max-w-[70%]">
              Bilkul mast! JARVIS kaam kar raha hai 🔥
            </div>
          </div>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mx-4 mt-3 bg-white/[0.03] rounded-xl p-1">
          {[
            { id: 'categories', label: '🖼️ Themes' },
            { id: 'ai', label: '🤖 AI Generate' },
            { id: 'favorites', label: '⭐ Saved' },
            { id: 'settings', label: '⚙️ Settings' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                tab === t.id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3">

          {/* Categories tab */}
          {tab === 'categories' && (
            <>
              {/* Auto mode toggle */}
              <div className="flex items-center justify-between bg-white/[0.04] border border-white/8 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm text-white font-medium">🕐 Auto Mode</p>
                  <p className="text-xs text-slate-500">Time ke hisaab se wallpaper badlega</p>
                </div>
                <div onClick={() => handleAutoToggle(!autoMode)}
                  className={`relative w-12 h-6 rounded-full cursor-pointer transition-colors ${autoMode ? 'bg-blue-600' : 'bg-white/10'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoMode ? 'left-7' : 'left-1'}`} />
                </div>
              </div>

              {/* Category grid */}
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(WALLPAPER_CATEGORIES).map(([id, c]) => (
                  <button key={id} onClick={() => handleCategory(id)}
                    className={`relative h-20 rounded-2xl overflow-hidden border-2 transition-all active:scale-95 ${
                      activeCategory === id ? 'border-blue-500 shadow-[0_0_15px_rgba(26,86,219,0.4)]' : 'border-white/10'
                    }`}
                    style={{ background: c.gradient || c.solidColor || '#050810' }}>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl mb-1">{c.emoji}</span>
                      <span className="text-white text-[11px] font-medium text-center px-2 leading-tight">{c.label}</span>
                    </div>
                    {activeCategory === id && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-[9px]">✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* AI Generate tab */}
          {tab === 'ai' && (
            <div className="space-y-3">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                <p className="text-xs text-blue-300/80">🤖 Pollinations AI se free wallpaper generate karo — koi key nahi chahiye!</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-medium">Custom prompt:</p>
                <textarea
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  placeholder="e.g. dark blue galaxy with stars, futuristic AI style..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 resize-none"
                />
              </div>

              {/* Quick prompt chips */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  'dark cyberpunk city neon rain',
                  'galaxy nebula deep space dark',
                  'dark forest moonlight misty',
                  'anime sky cherry blossoms night',
                  'minimal geometric neon lines',
                ].map(p => (
                  <button key={p} onClick={() => setAiPrompt(p)}
                    className="text-[10px] px-2 py-1 bg-white/5 border border-white/8 rounded-full text-slate-500 hover:text-white hover:border-white/20 transition-all">
                    {p.slice(0, 30)}...
                  </button>
                ))}
              </div>

              <button
                onClick={handleGenerateAI}
                disabled={aiLoading || !aiPrompt.trim()}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium text-sm active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {aiLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating... (30 sec)
                  </>
                ) : '✨ Generate AI Wallpaper (Free)'}
              </button>

              {aiResult && (
                <div className="rounded-xl overflow-hidden border border-white/10">
                  <img src={aiResult} alt="AI Generated" className="w-full h-40 object-cover" />
                  <div className="flex gap-2 p-2">
                    <button onClick={() => applyWallpaper(activeCategory, aiResult)}
                      className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium active:scale-95 transition-all">
                      ✅ Apply
                    </button>
                    <button onClick={() => { addToFavorites(aiResult, activeCategory); setFavorites(getFavorites()); }}
                      className="py-2 px-3 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 rounded-lg text-xs active:scale-95 transition-all">
                      ⭐ Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Favorites tab */}
          {tab === 'favorites' && (
            <div className="space-y-2">
              {favorites.length === 0 ? (
                <p className="text-slate-600 text-sm text-center py-8">
                  Koi saved wallpaper nahi. ⭐ tap karke save karo!
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {favorites.map((fav, i) => (
                    <div key={i} className="relative rounded-xl overflow-hidden border border-white/10 h-28">
                      <img src={fav.url} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button onClick={() => { applyWallpaper(fav.categoryId, fav.url); setActiveCategory(fav.categoryId); }}
                          className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg active:scale-95 transition-all">
                          Apply
                        </button>
                        <button onClick={() => { const f = removeFromFavorites(fav.url); setFavorites(f); }}
                          className="bg-red-500/80 text-white text-xs px-2 py-1.5 rounded-lg active:scale-95 transition-all">
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Settings tab */}
          {tab === 'settings' && (
            <div className="space-y-4">
              {/* Opacity */}
              <div className="bg-white/[0.04] border border-white/8 rounded-xl p-4">
                <div className="flex justify-between mb-2">
                  <p className="text-sm text-white font-medium">🔆 Opacity</p>
                  <span className="text-xs text-slate-500">{Math.round(opacity * 100)}%</span>
                </div>
                <input type="range" min="0.05" max="0.8" step="0.05" value={opacity}
                  onChange={e => handleOpacity(parseFloat(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, #1A56DB ${opacity * 100 / 0.8}%, rgba(255,255,255,0.1) ${opacity * 100 / 0.8}%)` }} />
                <div className="flex justify-between mt-1 text-[10px] text-slate-700">
                  <span>Subtle</span><span>Vivid</span>
                </div>
              </div>

              {/* Blur */}
              <div className="bg-white/[0.04] border border-white/8 rounded-xl p-4">
                <div className="flex justify-between mb-2">
                  <p className="text-sm text-white font-medium">💧 Blur</p>
                  <span className="text-xs text-slate-500">{blur}px</span>
                </div>
                <input type="range" min="0" max="20" step="1" value={blur}
                  onChange={e => handleBlur(parseInt(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, #1A56DB ${blur * 100 / 20}%, rgba(255,255,255,0.1) ${blur * 100 / 20}%)` }} />
                <div className="flex justify-between mt-1 text-[10px] text-slate-700">
                  <span>Sharp</span><span>Frosted</span>
                </div>
              </div>

              {/* Reset */}
              <button onClick={() => {
                handleOpacity(0.3);
                handleBlur(0);
                setCurrentCategory('jarvis_blue');
                setActiveCategory('jarvis_blue');
                applyWallpaper('jarvis_blue', null);
              }}
                className="w-full py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm active:scale-95 transition-all">
                🔄 Reset to Default
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── CHAT BACKGROUND WRAPPER ──────────────────────────────────
export function ChatBackground({ children }) {
  const [wallpaper, setWallpaper] = useState(null);
  const [opacity, setOpacity] = useState(0.3);
  const [blur, setBlur] = useState(0);
  const [category, setCategory] = useState(null);

  useEffect(() => {
    const catId = getCurrentCategory();
    const cat = WALLPAPER_CATEGORIES[catId];
    setCategory(cat);

    const op = getWallpaperOpacity();
    const bl = getWallpaperBlur();
    setOpacity(op);
    setBlur(bl);

    // Auto mode
    if (isAutoModeOn()) {
      const autoCat = getAutoCategory();
      fetchWallpaper(autoCat).then(url => setWallpaper(url));
    } else {
      const cached = localStorage.getItem(`jarvis_wallpaper_url_${catId}`);
      if (cached) setWallpaper(cached);
    }

    // Listen for wallpaper changes
    const handler = (e) => {
      const { categoryId, url, opacity: op, blur: bl } = e.detail || {};
      if (op !== undefined) setOpacity(op);
      if (bl !== undefined) setBlur(bl);
      if (categoryId) setCategory(WALLPAPER_CATEGORIES[categoryId]);
      if (url !== undefined) setWallpaper(url);
    };
    window.addEventListener('jarvis-wallpaper-change', handler);
    return () => window.removeEventListener('jarvis-wallpaper-change', handler);
  }, []);

  const bg = category?.gradient || category?.solidColor || 'linear-gradient(135deg, #050810 0%, #0a1628 100%)';

  return (
    <div className="relative h-full flex flex-col overflow-hidden">
      {/* Background layer */}
      <div className="absolute inset-0 z-0" style={{ background: bg }} />

      {/* Wallpaper image layer */}
      {wallpaper && (
        <div className="absolute inset-0 z-0">
          <img src={wallpaper} alt=""
            className="w-full h-full object-cover"
            style={{ opacity, filter: `blur(${blur}px) ${blur > 0 ? 'scale(1.1)' : ''}` }} />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col">
        {children}
      </div>
    </div>
  );
}
