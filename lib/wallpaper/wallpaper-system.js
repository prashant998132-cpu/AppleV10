'use client';
// lib/wallpaper/wallpaper-system.js — JARVIS Dynamic Wallpaper System
// ══════════════════════════════════════════════════════════════════
// Free APIs: Unsplash + Pexels + Pixabay + Pollinations AI generate
// Categories: Dark/Cyberpunk, Anime, Nature, Space, Neon, Minimal
// ══════════════════════════════════════════════════════════════════

// ─── WALLPAPER CATEGORIES ────────────────────────────────────
export const WALLPAPER_CATEGORIES = {
  dark_cyberpunk: {
    label: '🌆 Dark Cyberpunk',
    emoji: '🌆',
    unsplashQuery: 'dark cyberpunk city neon',
    pexelsQuery: 'cyberpunk dark neon city',
    pixabayQuery: 'cyberpunk neon dark',
    aiPrompt: 'dark cyberpunk city with neon lights, rain, futuristic, 4K wallpaper',
    gradient: 'linear-gradient(135deg, #0a0015 0%, #1a0030 50%, #000a1a 100%)',
    accent: '#9333ea',
  },
  anime: {
    label: '🌸 Anime Aesthetic',
    emoji: '🌸',
    unsplashQuery: 'anime aesthetic wallpaper',
    pexelsQuery: 'anime style landscape',
    pixabayQuery: 'anime wallpaper background',
    aiPrompt: 'anime style landscape, cherry blossoms, beautiful sky, 4K wallpaper art',
    gradient: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b69 50%, #0f0a1e 100%)',
    accent: '#ec4899',
  },
  space: {
    label: '🌌 Space & Galaxy',
    emoji: '🌌',
    unsplashQuery: 'galaxy space nebula stars',
    pexelsQuery: 'galaxy stars space dark',
    pixabayQuery: 'galaxy nebula space',
    aiPrompt: 'beautiful galaxy with stars and nebula, deep space, 4K wallpaper',
    gradient: 'linear-gradient(135deg, #000010 0%, #001030 50%, #0a0020 100%)',
    accent: '#3b82f6',
  },
  nature: {
    label: '🌲 Dark Nature',
    emoji: '🌲',
    unsplashQuery: 'dark forest nature moody',
    pexelsQuery: 'dark forest night nature',
    pixabayQuery: 'dark nature forest night',
    aiPrompt: 'dark moody forest at night with moonlight, misty, atmospheric, 4K',
    gradient: 'linear-gradient(135deg, #020d05 0%, #0a1f10 50%, #020d05 100%)',
    accent: '#10b981',
  },
  neon_minimal: {
    label: '✨ Neon Minimal',
    emoji: '✨',
    unsplashQuery: 'neon lights minimal dark',
    pexelsQuery: 'neon minimal dark abstract',
    pixabayQuery: 'neon abstract minimal',
    aiPrompt: 'minimalist neon geometric pattern, dark background, glowing lines, 4K',
    gradient: 'linear-gradient(135deg, #050810 0%, #0a1020 50%, #050810 100%)',
    accent: '#06b6d4',
  },
  sunset_dark: {
    label: '🌅 Dark Sunset',
    emoji: '🌅',
    unsplashQuery: 'dramatic sunset dark sky',
    pexelsQuery: 'dark dramatic sunset orange',
    pixabayQuery: 'sunset dramatic dark sky',
    aiPrompt: 'dramatic dark sunset with orange and purple sky, silhouette, 4K',
    gradient: 'linear-gradient(135deg, #1a0500 0%, #2d0a00 50%, #0f0500 100%)',
    accent: '#f97316',
  },
  amoled_pure: {
    label: '⚫ Pure AMOLED',
    emoji: '⚫',
    unsplashQuery: null,
    pexelsQuery: null,
    pixabayQuery: null,
    aiPrompt: null,
    gradient: '#000000',
    accent: '#3b82f6',
    solidColor: '#000000',
  },
  jarvis_blue: {
    label: '🔵 JARVIS Classic',
    emoji: '🔵',
    unsplashQuery: 'dark blue technology digital',
    pexelsQuery: 'dark blue abstract technology',
    pixabayQuery: 'blue dark technology abstract',
    aiPrompt: 'dark blue digital technology background, futuristic AI interface, 4K',
    gradient: 'linear-gradient(135deg, #050810 0%, #0a1628 50%, #050810 100%)',
    accent: '#1A56DB',
  },
};

// ─── STORAGE KEYS ─────────────────────────────────────────────
const STORAGE_KEYS = {
  currentCategory: 'jarvis_wallpaper_category',
  currentUrl: 'jarvis_wallpaper_url',
  favorites: 'jarvis_wallpaper_favorites',
  autoMode: 'jarvis_wallpaper_auto',
  opacity: 'jarvis_wallpaper_opacity',
  blur: 'jarvis_wallpaper_blur',
  lastFetch: 'jarvis_wallpaper_last_fetch',
};

// ─── GET WALLPAPER FROM FREE APIS ─────────────────────────────
export async function fetchWallpaper(categoryId, forceRefresh = false) {
  const cat = WALLPAPER_CATEGORIES[categoryId];
  if (!cat || cat.solidColor || !cat.unsplashQuery) return null;

  // Cache check — don't refetch within 30 min
  const lastFetch = localStorage.getItem(`${STORAGE_KEYS.lastFetch}_${categoryId}`);
  const cachedUrl = localStorage.getItem(`${STORAGE_KEYS.currentUrl}_${categoryId}`);
  if (!forceRefresh && lastFetch && cachedUrl) {
    const age = Date.now() - parseInt(lastFetch);
    if (age < 30 * 60 * 1000) return cachedUrl;
  }

  // Try Unsplash (free, no key needed for basic access via source.unsplash.com)
  const unsplashUrl = `https://source.unsplash.com/1080x2400/?${encodeURIComponent(cat.unsplashQuery)}&t=${Date.now()}`;

  // Try to preload
  try {
    const img = new Image();
    img.src = unsplashUrl;
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      setTimeout(rej, 8000);
    });

    localStorage.setItem(`${STORAGE_KEYS.currentUrl}_${categoryId}`, unsplashUrl);
    localStorage.setItem(`${STORAGE_KEYS.lastFetch}_${categoryId}`, Date.now().toString());
    return unsplashUrl;
  } catch {
    // Return null - will use gradient fallback
    return null;
  }
}

// ─── AI WALLPAPER GENERATION (Pollinations - free) ────────────
export async function generateAIWallpaper(categoryId, customPrompt = null) {
  const cat = WALLPAPER_CATEGORIES[categoryId];
  const prompt = customPrompt || cat?.aiPrompt;
  if (!prompt) return null;

  try {
    const encoded = encodeURIComponent(prompt + ', no text, no watermark');
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=1080&height=2400&nologo=true&seed=${Date.now()}`;

    const img = new Image();
    img.src = url;
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      setTimeout(rej, 30000);
    });

    localStorage.setItem(`${STORAGE_KEYS.currentUrl}_${categoryId}_ai`, url);
    return url;
  } catch {
    return null;
  }
}

// ─── SETTINGS GETTERS/SETTERS ──────────────────────────────────
export function getCurrentCategory() {
  try { return localStorage.getItem(STORAGE_KEYS.currentCategory) || 'jarvis_blue'; } catch { return 'jarvis_blue'; }
}

export function setCurrentCategory(categoryId) {
  try { localStorage.setItem(STORAGE_KEYS.currentCategory, categoryId); } catch {}
}

export function getWallpaperOpacity() {
  try { return parseFloat(localStorage.getItem(STORAGE_KEYS.opacity) || '0.3'); } catch { return 0.3; }
}

export function setWallpaperOpacity(val) {
  try { localStorage.setItem(STORAGE_KEYS.opacity, val.toString()); } catch {}
}

export function getWallpaperBlur() {
  try { return parseInt(localStorage.getItem(STORAGE_KEYS.blur) || '0'); } catch { return 0; }
}

export function setWallpaperBlur(val) {
  try { localStorage.setItem(STORAGE_KEYS.blur, val.toString()); } catch {}
}

export function isAutoModeOn() {
  try { return localStorage.getItem(STORAGE_KEYS.autoMode) === 'true'; } catch { return false; }
}

export function setAutoMode(val) {
  try { localStorage.setItem(STORAGE_KEYS.autoMode, val ? 'true' : 'false'); } catch {}
}

// ─── AUTO MODE — Time-based category selection ─────────────────
export function getAutoCategory() {
  const h = new Date().getHours();
  if (h >= 5  && h < 8)  return 'nature';       // Subah — nature
  if (h >= 8  && h < 12) return 'jarvis_blue';  // Morning — JARVIS classic
  if (h >= 12 && h < 16) return 'neon_minimal'; // Dopahar — minimal
  if (h >= 16 && h < 19) return 'sunset_dark';  // Shaam — sunset
  if (h >= 19 && h < 22) return 'dark_cyberpunk'; // Raat — cyberpunk
  return 'space';                                 // Raat ke baad — space
}

// ─── FAVORITES ────────────────────────────────────────────────
export function getFavorites() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.favorites) || '[]'); } catch { return []; }
}

export function addToFavorites(url, categoryId) {
  const favs = getFavorites();
  const item = { url, categoryId, savedAt: new Date().toISOString() };
  if (!favs.find(f => f.url === url)) {
    favs.unshift(item);
    if (favs.length > 20) favs.pop();
    try { localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(favs)); } catch {}
  }
  return favs;
}

export function removeFromFavorites(url) {
  const favs = getFavorites().filter(f => f.url !== url);
  try { localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(favs)); } catch {}
  return favs;
}
