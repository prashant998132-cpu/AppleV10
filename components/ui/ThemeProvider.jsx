'use client';
// components/ui/ThemeProvider.jsx — JARVIS v10.9 Full Theme System
// 6 presets + custom accent color + JARVIS name + font size
// All settings persist in localStorage

import { createContext, useContext, useEffect, useState } from 'react';

export const THEMES = {
  dark: {
    label: '🔵 Dark Blue', bg: '#050810', sidebar: '#080c14', card: '#0d1117',
    input: '#0f1421', border: 'rgba(255,255,255,0.06)', accent: '#1A56DB',
    accentRgb: '26,86,219', text: '#e2e8f0', subtext: '#64748b',
    msgUser: 'linear-gradient(135deg,#1a3a6b,#1e40af)', msgAI: '#0d1117',
  },
  amoled: {
    label: '⚫ AMOLED', bg: '#000000', sidebar: '#0a0a0a', card: '#111111',
    input: '#0d0d0d', border: 'rgba(255,255,255,0.08)', accent: '#3b82f6',
    accentRgb: '59,130,246', text: '#f1f5f9', subtext: '#475569',
    msgUser: 'linear-gradient(135deg,#1d2d50,#2563eb)', msgAI: '#111111',
  },
  soft: {
    label: '🌫 Soft Dark', bg: '#1a1a2e', sidebar: '#16213e', card: '#1f2b47',
    input: '#1f2b47', border: 'rgba(255,255,255,0.08)', accent: '#6366f1',
    accentRgb: '99,102,241', text: '#dde4f0', subtext: '#7c8db0',
    msgUser: 'linear-gradient(135deg,#2d1b69,#5b21b6)', msgAI: '#1f2b47',
  },
  green: {
    label: '🟢 Matrix Green', bg: '#020d05', sidebar: '#040f07', card: '#071a0a',
    input: '#071a0a', border: 'rgba(0,255,65,0.08)', accent: '#00cc44',
    accentRgb: '0,204,68', text: '#c8f7d4', subtext: '#4a7c59',
    msgUser: 'linear-gradient(135deg,#0a2e12,#006622)', msgAI: '#071a0a',
  },
  purple: {
    label: '💜 Deep Purple', bg: '#0a0010', sidebar: '#100020', card: '#18003a',
    input: '#18003a', border: 'rgba(160,0,255,0.10)', accent: '#9333ea',
    accentRgb: '147,51,234', text: '#e9d5ff', subtext: '#7c3aed',
    msgUser: 'linear-gradient(135deg,#3b0764,#7c3aed)', msgAI: '#18003a',
  },
  sunset: {
    label: '🌅 Sunset', bg: '#0f0a00', sidebar: '#1a1000', card: '#1f1500',
    input: '#1f1500', border: 'rgba(255,150,0,0.10)', accent: '#f97316',
    accentRgb: '249,115,22', text: '#fed7aa', subtext: '#9a6200',
    msgUser: 'linear-gradient(135deg,#431407,#c2410c)', msgAI: '#1f1500',
  },
};

const ThemeContext = createContext({ theme: 'dark', themeData: THEMES.dark, setTheme: () => {}, customAccent: null, setCustomAccent: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('dark');
  const [customAccent, setCustomAccentState] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('jarvis_theme') || 'dark';
    const savedAccent = localStorage.getItem('jarvis_custom_accent') || null;
    setThemeState(saved);
    setCustomAccentState(savedAccent);
    applyTheme(saved, savedAccent);

    // Listen for external theme change (from chat commands)
    const handler = (e) => {
      const id = e.detail?.theme;
      if (id && THEMES[id]) {
        setThemeState(id);
        const currentAccent = localStorage.getItem('jarvis_custom_accent') || null;
        applyTheme(id, currentAccent);
        localStorage.setItem('jarvis_theme', id);
      }
    };
    window.addEventListener('jarvis-theme-change', handler);
    return () => window.removeEventListener('jarvis-theme-change', handler);
  }, []); // eslint-disable-line

  function applyTheme(themeId, accent = null) {
    const t = THEMES[themeId] || THEMES.dark;
    const finalAccent = accent || t.accent;
    // Parse custom accent to RGB
    const hexToRgb = (hex) => {
      const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
      return `${r},${g},${b}`;
    };
    const accentRgb = accent ? hexToRgb(accent) : t.accentRgb;
    const root = document.documentElement;
    root.style.setProperty('--bg', t.bg);
    root.style.setProperty('--sidebar', t.sidebar);
    root.style.setProperty('--card', t.card);
    root.style.setProperty('--input', t.input);
    root.style.setProperty('--border', t.border);
    root.style.setProperty('--accent', finalAccent);
    root.style.setProperty('--accent-rgb', accentRgb);
    root.style.setProperty('--text', t.text);
    root.style.setProperty('--subtext', t.subtext);
    root.style.setProperty('--msg-user', t.msgUser);
    root.style.setProperty('--msg-ai', t.msgAI);
    if (document.body) document.body.style.backgroundColor = t.bg;
  }

  function setTheme(id) {
    setThemeState(id);
    localStorage.setItem('jarvis_theme', id);
    applyTheme(id, customAccent);
  }

  function setCustomAccent(color) {
    setCustomAccentState(color);
    localStorage.setItem('jarvis_custom_accent', color || '');
    applyTheme(theme, color);
  }

  const themeData = {
    ...(THEMES[theme] || THEMES.dark),
    accent: customAccent || (THEMES[theme] || THEMES.dark).accent,
  };

  return (
    <ThemeContext.Provider value={{ theme, themeData, setTheme, customAccent, setCustomAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() { return useContext(ThemeContext); }

export function ThemeSwitcher({ compact = false }) {
  const { theme, setTheme } = useTheme();
  if (compact) {
    const themes = Object.entries(THEMES);
    const idx = themes.findIndex(([id]) => id === theme);
    const next = themes[(idx + 1) % themes.length];
    return (
      <button onClick={() => setTheme(next[0])}
        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm"
        title={`Theme: ${THEMES[theme]?.label}`}>
        {THEMES[theme]?.label.split(' ')[0]}
      </button>
    );
  }
  return (
    <div className="flex gap-2 flex-wrap">
      {Object.entries(THEMES).map(([id, t]) => (
        <button key={id} onClick={() => setTheme(id)}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${theme === id ? 'border-white/40 bg-white/10 text-white' : 'border-white/10 text-white/50 hover:border-white/20'}`}
          style={{ borderColor: theme === id ? t.accent + '80' : undefined }}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
