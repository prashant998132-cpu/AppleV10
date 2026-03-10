'use client';
// components/ui/ThemeProvider.jsx — 3 Themes: Dark Blue / AMOLED / Soft Dark

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({ theme: 'dark', setTheme: () => {} });

export const THEMES = {
  dark: {
    label: '🔵 Dark Blue',
    bg: '#050810',
    sidebar: '#080c14',
    card: '#0d1117',
    input: '#0f1421',
    border: 'rgba(255,255,255,0.06)',
    accent: '#1A56DB',
    text: '#e2e8f0',
    subtext: '#64748b',
    msgUser: 'linear-gradient(135deg,#1a3a6b,#1e40af)',
    msgAI: '#0d1117',
  },
  amoled: {
    label: '⚫ AMOLED Black',
    bg: '#000000',
    sidebar: '#0a0a0a',
    card: '#111111',
    input: '#0d0d0d',
    border: 'rgba(255,255,255,0.08)',
    accent: '#3b82f6',
    text: '#f1f5f9',
    subtext: '#475569',
    msgUser: 'linear-gradient(135deg,#1d2d50,#2563eb)',
    msgAI: '#111111',
  },
  soft: {
    label: '🌫 Soft Dark',
    bg: '#1a1a2e',
    sidebar: '#16213e',
    card: '#1f2b47',
    input: '#1f2b47',
    border: 'rgba(255,255,255,0.08)',
    accent: '#6366f1',
    text: '#dde4f0',
    subtext: '#7c8db0',
    msgUser: 'linear-gradient(135deg,#2d1b69,#5b21b6)',
    msgAI: '#1f2b47',
  },
};

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('dark');

  useEffect(() => {
    const saved = localStorage.getItem('jarvis_theme') || 'dark';
    setThemeState(saved);
    applyTheme(saved);
  }, []);

  function setTheme(t) {
    setThemeState(t);
    localStorage.setItem('jarvis_theme', t);
    applyTheme(t);
  }

  function applyTheme(t) {
    const vars = THEMES[t] || THEMES.dark;
    const root = document.documentElement;
    root.style.setProperty('--bg', vars.bg);
    root.style.setProperty('--sidebar', vars.sidebar);
    root.style.setProperty('--card', vars.card);
    root.style.setProperty('--input', vars.input);
    root.style.setProperty('--border', vars.border);
    root.style.setProperty('--accent', vars.accent);
    root.style.setProperty('--text', vars.text);
    root.style.setProperty('--subtext', vars.subtext);
    root.style.setProperty('--msg-user', vars.msgUser);
    root.style.setProperty('--msg-ai', vars.msgAI);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// Theme Switcher button — drop-in anywhere
export function ThemeSwitcher({ className = '' }) {
  const { theme, setTheme, themes } = useTheme();
  const keys = Object.keys(themes);
  const next = keys[(keys.indexOf(theme) + 1) % keys.length];

  return (
    <button
      onClick={() => setTheme(next)}
      title={`Theme: ${themes[theme]?.label} → ${themes[next]?.label}`}
      className={`text-xs px-2 py-1 rounded-lg border border-white/10 hover:bg-white/5 transition-all text-slate-400 hover:text-white ${className}`}
    >
      {themes[theme]?.label}
    </button>
  );
}
