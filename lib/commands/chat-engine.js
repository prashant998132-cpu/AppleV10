'use client';
// lib/commands/chat-engine.js — JARVIS v10.9 Chat Command Engine
// ═══════════════════════════════════════════════════════════════
// Ek jagah — har command handle hoti hai
// "Instagram kholo" → App opens
// "Theme green karo" → Theme changes live
// "WhatsApp message bhejo Ram ko — Bhai aa raha hoon"
// "Study mode on karo" → Smart mode activates
// "Daily routine dikhao" → Shows schedule
// "Alarm laga 7 baje" → Sets alarm via deeplink
// ═══════════════════════════════════════════════════════════════

// Storage accessed via localStorage directly

// ─── RESULT TYPES ────────────────────────────────────────────
export const CMD = {
  APP_OPEN:    'app_open',
  THEME:       'theme',
  PHONE:       'phone',
  MESSAGE:     'message',
  ROUTINE:     'routine',
  ALARM:       'alarm',
  SEARCH:      'search',
  SETTINGS:    'settings',
  JARVIS_META: 'jarvis_meta',
  NOT_COMMAND: null,
};

// ─── APP MAP — name → deep link ──────────────────────────────
export const APP_MAP = {
  // Social
  instagram:   { names: ['instagram', 'insta', 'ig'], deep: 'intent://instagram.com/#Intent;scheme=https;package=com.instagram.android;end', web: 'https://instagram.com', emoji: '📸' },
  whatsapp:    { names: ['whatsapp', 'wp', 'wapp', 'व्हाट्सएप'], deep: 'intent://send?phone=#Intent;scheme=whatsapp;package=com.whatsapp;end', web: 'https://web.whatsapp.com', emoji: '💬' },
  telegram:    { names: ['telegram', 'tele', 'tg'], deep: 'intent://t.me/#Intent;scheme=https;package=org.telegram.messenger;end', web: 'https://web.telegram.org', emoji: '✈️' },
  twitter:     { names: ['twitter', 'x', 'tweet'], deep: 'intent://twitter.com/#Intent;scheme=https;package=com.twitter.android;end', web: 'https://twitter.com', emoji: '🐦' },
  youtube:     { names: ['youtube', 'yt', 'यूट्यूब', 'video'], deep: 'intent://youtube.com/#Intent;scheme=https;package=com.google.android.youtube;end', web: 'https://youtube.com', emoji: '▶️' },
  // Music
  spotify:     { names: ['spotify', 'music', 'gaana', 'song', 'गाना'], deep: 'intent://open.spotify.com/#Intent;scheme=https;package=com.spotify.music;end', web: 'https://open.spotify.com', emoji: '🎵' },
  ytmusic:     { names: ['youtube music', 'yt music', 'ytm'], deep: 'intent://music.youtube.com/#Intent;scheme=https;package=com.google.android.apps.youtube.music;end', web: 'https://music.youtube.com', emoji: '🎶' },
  // Google
  maps:        { names: ['maps', 'navigation', 'navigate', 'नेविगेशन', 'raasta', 'location'], deep: 'geo:0,0?q=', web: 'https://maps.google.com', emoji: '🗺️' },
  gmail:       { names: ['gmail', 'mail', 'email', 'ईमेल'], deep: 'intent://gmail.com/#Intent;scheme=https;package=com.google.android.gm;end', web: 'https://mail.google.com', emoji: '📧' },
  drive:       { names: ['drive', 'google drive', 'files', 'gdrive'], deep: 'intent://drive.google.com/#Intent;scheme=https;package=com.google.android.apps.docs;end', web: 'https://drive.google.com', emoji: '📁' },
  calendar:    { names: ['calendar', 'calender', 'schedule', 'कैलेंडर'], deep: 'intent://calendar.google.com/#Intent;scheme=https;package=com.google.android.calendar;end', web: 'https://calendar.google.com', emoji: '📅' },
  photos:      { names: ['photos', 'gallery', 'photo', 'tasveer'], deep: 'intent://photos.google.com/#Intent;scheme=https;package=com.google.android.apps.photos;end', web: 'https://photos.google.com', emoji: '🖼️' },
  // Study
  unacademy:   { names: ['unacademy', 'una'], deep: 'intent://unacademy.com/#Intent;scheme=https;package=com.unacademyapp;end', web: 'https://unacademy.com', emoji: '📚' },
  byjus:       { names: ['byju', "byju's", 'byjus'], deep: 'intent://byjus.com/#Intent;scheme=https;package=com.byjus.thelearningapp;end', web: 'https://byjus.com', emoji: '📖' },
  khan:        { names: ['khan', 'khan academy', 'khanacademy'], deep: null, web: 'https://khanacademy.org', emoji: '🎓' },
  // Shopping / Payments
  zomato:      { names: ['zomato', 'food', 'khana order'], deep: 'intent://zomato.com/#Intent;scheme=https;package=com.application.zomato;end', web: 'https://zomato.com', emoji: '🍔' },
  swiggy:      { names: ['swiggy'], deep: 'intent://swiggy.com/#Intent;scheme=https;package=in.swiggy.android;end', web: 'https://swiggy.com', emoji: '🛵' },
  paytm:       { names: ['paytm'], deep: 'intent://paytm.com/#Intent;scheme=https;package=net.one97.paytm;end', web: 'https://paytm.com', emoji: '💳' },
  phonepe:     { names: ['phonepe', 'phone pe'], deep: 'intent://phonepe.com/#Intent;scheme=https;package=com.phonepe.app;end', web: 'https://phonepe.com', emoji: '💰' },
  gpay:        { names: ['gpay', 'google pay'], deep: 'intent://pay.google.com/#Intent;scheme=https;package=com.google.android.apps.nbu.paisa.user;end', web: 'https://pay.google.com', emoji: '💚' },
  amazon:      { names: ['amazon', 'amzn'], deep: null, web: 'https://amazon.in', emoji: '📦' },
  flipkart:    { names: ['flipkart', 'fk'], deep: 'intent://flipkart.com/#Intent;scheme=https;package=com.flipkart.android;end', web: 'https://flipkart.com', emoji: '🛒' },
  // Transport
  ola:         { names: ['ola', 'cab', 'taxi'], deep: 'intent://book.olacabs.com/#Intent;scheme=https;package=com.olacabs.customer;end', web: 'https://book.olacabs.com', emoji: '🚗' },
  uber:        { names: ['uber'], deep: null, web: 'https://m.uber.com', emoji: '🚕' },
  // System
  settings:    { names: ['settings', 'setting', 'सेटिंग'], deep: 'intent:#Intent;action=android.settings.SETTINGS;end', web: null, emoji: '⚙️' },
  camera:      { names: ['camera', 'kamera', 'कैमरा'], deep: 'intent:#Intent;action=android.media.action.IMAGE_CAPTURE;end', web: null, emoji: '📷' },
  clock:       { names: ['clock', 'alarm clock', 'घड़ी'], deep: 'intent:#Intent;action=android.intent.action.SET_ALARM;end', web: null, emoji: '⏰' },
  calculator:  { names: ['calculator', 'calc', 'calculate', 'कैलकुलेटर'], deep: 'intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.APP_CALCULATOR;end', web: 'https://www.google.com/search?q=calculator', emoji: '🧮' },
  // JARVIS pages
  jarvis_phone:    { names: ['phone control', 'phone page'], deep: null, web: '/phone', emoji: '📱', internal: true },
  jarvis_goals:    { names: ['goals', 'goal', 'लक्ष्य'], deep: null, web: '/goals', emoji: '🎯', internal: true },
  jarvis_memory:   { names: ['memory', 'memories', 'याद'], deep: null, web: '/memory', emoji: '🧠', internal: true },
  jarvis_analytics:{ names: ['analytics', 'stats', 'statistics'], deep: null, web: '/analytics', emoji: '📊', internal: true },
  jarvis_studio:   { names: ['studio', 'create', 'बनाओ'], deep: null, web: '/studio', emoji: '✨', internal: true },
  jarvis_settings: { names: ['jarvis settings', 'customize jarvis'], deep: null, web: '/settings', emoji: '⚙️', internal: true },
};

// ─── THEME MAP ────────────────────────────────────────────────
export const THEME_CMD = {
  dark:   ['dark', 'dark blue', 'blue', 'neela'],
  amoled: ['amoled', 'black', 'kaala', 'dark black'],
  soft:   ['soft', 'purple', 'violet', 'indigo', 'soft dark'],
  green:  ['green', 'matrix', 'hara', 'hre'],
  sunset: ['sunset', 'orange', 'naranja', 'warm'],
  auto:   ['auto', 'system', 'default'],
};

// ─── DAILY ROUTINE ───────────────────────────────────────────
export const DAILY_ROUTINE = [
  { time: '5:30 AM',  label: '🌅 Uthna',           desc: 'Wake up, paani, stretch',               alarm: true },
  { time: '6:00 AM',  label: '📚 Study 1 — Physics',desc: '2.5 hrs — fresh brain, best time',      alarm: true },
  { time: '8:30 AM',  label: '☕ Break + Naashta',  desc: '15-20 min — light breakfast',           alarm: true },
  { time: '9:00 AM',  label: '🧬 Study 2 — Biology',desc: '2 hrs — NCERT + diagrams',             alarm: true },
  { time: '11:00 AM', label: '📝 Study 3 — Chemistry',desc: '2 hrs — reactions + organic',        alarm: false },
  { time: '1:00 PM',  label: '🍽️ Lunch Break',     desc: '30-40 min — proper khana',              alarm: true },
  { time: '2:00 PM',  label: '⚡ Study 4 — Numericals',desc: '3 hrs — problems + PYQ',             alarm: true },
  { time: '5:30 PM',  label: '🏃 Exercise/Walk',    desc: '30 min — dimaag reset',                 alarm: true },
  { time: '6:15 PM',  label: '📖 Study 5 — Revision',desc: '2 hrs — aaj jo padha uska revision',  alarm: true },
  { time: '8:30 PM',  label: '🌙 Dinner',           desc: '30 min — proper rest',                  alarm: true },
  { time: '9:00 PM',  label: '📝 Night Review',     desc: '1.5 hrs — light notes + formulas',      alarm: true },
  { time: '10:30 PM', label: '😴 So Jao',           desc: '7.5 ghante neend = better retention',   alarm: true },
];

// ─── MAIN COMMAND PARSER ─────────────────────────────────────
export function parseCommand(text) {
  if (!text?.trim()) return { type: CMD.NOT_COMMAND };
  const t = text.trim();
  const low = t.toLowerCase();

  // ── 1. APP OPEN COMMAND ─────────────────────────────────
  // "Instagram kholo", "WhatsApp open karo", "YouTube chala"
  const appOpenPatterns = [
    /^(open|kholo|khol|chala|start|launch|show)\s+(.+)/i,
    /^(.+)\s+(kholo|khol|open\s+karo|chala\s+do|open)/i,
    /^(.+)\s+kholna\s+hai/i,
    /^(.+)\s+app\s+(open|khol)/i,
  ];

  for (const pat of appOpenPatterns) {
    const m = low.match(pat);
    if (m) {
      const appName = (m[2] || m[1]).trim().replace(/\s*(app|application)\s*/gi, '').trim();
      const found = findApp(appName);
      if (found) return { type: CMD.APP_OPEN, app: found.key, data: found.app, original: t };
    }
  }

  // Direct app name mention
  for (const [key, app] of Object.entries(APP_MAP)) {
    if (app.names.some(n => {
      const nl = n.toLowerCase();
      if (nl === low) return true;
      if (low === nl + ' kholo' || low === nl + ' open' || low === 'open ' + nl || low === nl + ' chala' || low === nl + ' start') return true;
      if (low.startsWith(nl + ' ') && (low.includes('khol') || low.includes('open') || low.includes('chala'))) return true;
      return false;
    })) {
      return { type: CMD.APP_OPEN, app: key, data: app, original: t };
    }
  }

  // ── 2. WHATSAPP MESSAGE COMMAND ─────────────────────────
  // "WhatsApp message bhejo Ram ko — Bhai aa raha hoon"
  // "WhatsApp karo Ram — hello"  
  const waMsgPatterns = [
    /whatsapp.{0,20}(message|msg|bhejo|bhej|text|send).{0,20}(?:to\s+)?(.+?)(?:\s*[-—:]\s*|\s+ko\s+)(.+)/i,
    /(.+?)\s+ko\s+whatsapp\s+(?:karo|bhejo|send\s+karo|message\s+karo)\s*[-—:]?\s*(.+)/i,
    /send\s+whatsapp\s+to\s+(.+?)[-—:]\s*(.+)/i,
  ];
  for (const pat of waMsgPatterns) {
    const m = t.match(pat);
    if (m) {
      if (m[3]) return { type: CMD.MESSAGE, platform: 'whatsapp', to: m[2]?.trim(), msg: m[3]?.trim(), original: t };
      if (m[1] && m[2]) return { type: CMD.MESSAGE, platform: 'whatsapp', to: m[1]?.trim(), msg: m[2]?.trim(), original: t };
    }
  }

  // ── 3. THEME COMMAND ─────────────────────────────────────
  // "Theme dark karo", "Green theme lagao", "AMOLED theme"
  if (/theme|rang|color|colour|look|dikhna/i.test(low)) {
    for (const [id, names] of Object.entries(THEME_CMD)) {
      if (names.some(n => low.includes(n))) {
        return { type: CMD.THEME, themeId: id, original: t };
      }
    }
    // "theme change karo" without specifying
    if (/theme.*(change|badlo|badal)|change.*theme/i.test(low)) {
      return { type: CMD.THEME, themeId: 'cycle', original: t };
    }
  }

  // ── 4. DAILY ROUTINE ──────────────────────────────────────
  if (/routine|schedule|timetable|time table|daily plan|din ka plan|aaj ka plan/i.test(low)) {
    return { type: CMD.ROUTINE, original: t };
  }

  // ── 4.5. TIMER (countdown) ────────────────────────────────
  // "5 minute ka timer", "25 min timer", "1 ghante ka timer"
  const timerPat = /(\d+)\s*(minute|min|second|sec|ghante|hour|hr|s|m|h).*timer|timer.*?(\d+)\s*(minute|min|second|sec|ghante|hour|hr)/i;
  const timerM = low.match(timerPat);
  if (timerM && /timer|countdown|pomodoro/i.test(low)) {
    const num = parseInt(timerM[1] || timerM[3]);
    const unit = (timerM[2] || timerM[4] || 'min').toLowerCase();
    let seconds = unit.startsWith('s') ? num : unit.startsWith('h') || unit === 'ghante' ? num * 3600 : num * 60;
    return { type: 'timer', seconds, label: `${num} ${unit} timer`, original: t };
  }

  // ── 4.6. GOALS / TARGET ───────────────────────────────────
  // "Target set karo", "Goal add karo"
  if (/target.*set|goal.*set|goal.*add|lakshya|aim.*set/i.test(low)) {
    return { type: 'navigate', url: '/goals', message: 'Goals page khol raha hoon...', original: t };
  }

  // ── 5. ALARM SET ──────────────────────────────────────────
  // "Alarm laga 7 baje", "7:30 AM ka alarm set karo"
  const alarmPat = /(?:alarm|reminder).*?(\d{1,2})(?::(\d{2}))?\s*(am|pm|baje|subah|dopahar|shaam|raat)?|(\d{1,2})(?::(\d{2}))?\s*(am|pm|baje|subah|dopahar|shaam|raat).*(?:alarm|reminder|uth)/i;
  const alarmM = low.match(alarmPat);
  if (alarmM && /alarm|uth|reminder|yaad|wake/i.test(low)) {
    let h = parseInt(alarmM[1] || alarmM[4]);
    const min = parseInt(alarmM[2] || alarmM[5] || '0');
    const period = (alarmM[3] || alarmM[6] || '').toLowerCase();
    if (period === 'pm' || period === 'shaam' || period === 'dopahar' || period === 'raat') {
      if (h < 12) h += 12;
    }
    if (period === 'am' || period === 'subah') {
      if (h === 12) h = 0;
    }
    const label = t.replace(/alarm|set|laga|karo|reminder/gi, '').trim() || 'JARVIS Alarm';
    return { type: CMD.ALARM, hour: h, minute: min, label, deepUrl: `intent:#Intent;action=android.intent.action.SET_ALARM;i.android.intent.extra.ALARM_HOUR=${h};i.android.intent.extra.ALARM_MINUTES=${min};S.android.intent.extra.alarm.MESSAGE=${encodeURIComponent(label)};end`, original: t };
  }

  // ── 6. JARVIS SETTINGS ────────────────────────────────────
  // "Font size badlo", "Naam change karo FRIDAY", "Dark mode on"
  if (/font.*(size|badlo|change)|text size/i.test(low)) {
    const sizeM = low.match(/small|normal|large|xl|xlarge|bada|chota|medium/);
    const sizeMap = { small:'small', chota:'small', normal:'normal', medium:'normal', large:'large', bada:'large', xl:'xlarge', xlarge:'xlarge' };
    return { type: CMD.SETTINGS, setting: 'font', value: sizeMap[sizeM?.[0]] || 'normal', original: t };
  }
  if (/naam.*change|rename.*jarvis|jarvis.*naam|call.*you|naam.*dena|jarvis.*name/i.test(low)) {
    const nameM = t.match(/(?:naam|name|call you|rename to|jarvis ko)\s+["']?([A-Za-z]+)["']?/i);
    return { type: CMD.SETTINGS, setting: 'name', value: nameM?.[1] || null, original: t };
  }

  // ── 7. PHONE ACTIONS ──────────────────────────────────────
  if (/wifi|bluetooth|torch|screenshot|mute|volume|brightness|hotspot|dnd|lock|study mode|sleep mode|gym mode|drive mode/i.test(low)) {
    return { type: CMD.PHONE, original: t };
  }

  // ── 8. SEARCH ─────────────────────────────────────────────
  // "Google karo X", "YouTube pe search karo X", "Search karo X"
  const searchM = low.match(/(?:google|search|dhundho|dhundh|find|youtube.*search)\s+(?:karo\s+)?["']?(.+?)["']?(?:\s+pe|\s+on)?$/i);
  if (searchM) {
    const isYT = /youtube/i.test(low);
    return { type: CMD.SEARCH, query: searchM[1].trim(), platform: isYT ? 'youtube' : 'google', original: t };
  }

  return { type: CMD.NOT_COMMAND };
}

// ─── FIND APP BY NAME ─────────────────────────────────────────
function findApp(name) {
  const n = name.toLowerCase().trim();
  for (const [key, app] of Object.entries(APP_MAP)) {
    if (app.names.some(an => an.toLowerCase() === n || n.includes(an.toLowerCase()) || an.toLowerCase().includes(n))) {
      return { key, app };
    }
  }
  return null;
}

// ─── EXECUTE COMMAND — returns { handled, response, action } ─
export async function executeCommand(parsed, { setTheme, addMsg, navigate } = {}) {
  if (!parsed || parsed.type === CMD.NOT_COMMAND) return { handled: false };

  switch (parsed.type) {

    case CMD.APP_OPEN: {
      const { app } = parsed;
      // Internal JARVIS page
      if (app.internal && app.web) {
        navigate?.(app.web);
        return { handled: true, response: `${app.emoji} ${parsed.app.replace('jarvis_','')} page khol raha hoon...` };
      }
      // Try deep link (native app)
      const url = app.deep || (app.web ? (app.web.startsWith('http') ? app.web : null) : null);
      if (url) {
        setTimeout(() => { if (typeof window !== 'undefined') window.location.href = url; }, 100);
        return { handled: true, response: `${app.emoji} ${parsed.app.charAt(0).toUpperCase() + parsed.app.slice(1)} khol raha hoon...` };
      }
      if (app.web) {
        setTimeout(() => { if (typeof window !== 'undefined') window.open(app.web, '_blank'); }, 100);
        return { handled: true, response: `${app.emoji} ${parsed.app} browser mein khol raha hoon...` };
      }
      return { handled: false };
    }

    case CMD.MESSAGE: {
      const { to, msg, platform } = parsed;
      if (platform === 'whatsapp' && msg) {
        const deepUrl = to
          ? `https://wa.me/?text=${encodeURIComponent(msg)}` // Can't auto-fill contact without number
          : `whatsapp://send?text=${encodeURIComponent(msg)}`;
        setTimeout(() => { if (typeof window !== 'undefined') window.location.href = deepUrl; }, 200);
        return {
          handled: true,
          response: `💬 WhatsApp khul raha hai — ${to ? `"${to}" ko ` : ''}message ke saath:\n\n_"${msg}"_\n\nContact choose karo aur send karo.`
        };
      }
      return { handled: false };
    }

    case CMD.THEME: {
      const THEMES = ['dark', 'amoled', 'soft', 'green', 'purple', 'sunset'];
      const NAMES  = { dark:'Dark Blue 🔵', amoled:'AMOLED Black ⚫', soft:'Soft Dark 🌫', green:'Matrix Green 🟢', purple:'Deep Purple 💜', sunset:'Sunset 🌅' };
      let id = parsed.themeId;
      if (id === 'cycle') {
        const cur = (typeof localStorage !== 'undefined' ? localStorage.getItem('jarvis_theme') : null) || 'dark';
        id = THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length];
      }
      if (id && THEMES.includes(id)) {
        if (typeof localStorage !== 'undefined') localStorage.setItem('jarvis_theme', id);
        setTheme?.(id);
        // Apply CSS vars immediately
        if (typeof document !== 'undefined') {
          const T = { dark:'#050810/#1A56DB', amoled:'#000000/#3b82f6', soft:'#1a1a2e/#6366f1', green:'#020d05/#00cc44', purple:'#0a0010/#9333ea', sunset:'#0f0a00/#f97316' };
          const [bg, acc] = (T[id] || T.dark).split('/');
          document.documentElement.style.setProperty('--bg', bg);
          document.documentElement.style.setProperty('--accent', acc);
          document.body.style.backgroundColor = bg;
        }
        return { handled: true, response: `✅ Theme change ho gaya — **${NAMES[id]}**! Kaisi lagi?` };
      }
      return { handled: true, response: `Themes available: Dark Blue, AMOLED Black, Soft Dark, Matrix Green, Deep Purple, Sunset. Kaun si chahiye?` };
    }

      const now2 = new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Kolkata'}));
      const h2 = now2.getHours(), m2 = now2.getMinutes();
      const cur2 = h2 * 60 + m2;
      const sessions2 = [
        {time:'05:30',label:'Uthna',h:5,m:30,icon:'sunrise'},
        {time:'06:00',label:'Physics',h:6,m:0,dur:'2.5 hr',icon:'book'},
        {time:'08:30',label:'Break',h:8,m:30,icon:'coffee'},
        {time:'09:00',label:'Biology',h:9,m:0,dur:'2 hr',icon:'dna'},
        {time:'11:00',label:'Chemistry',h:11,m:0,dur:'2 hr',icon:'flask'},
        {time:'13:00',label:'Lunch',h:13,m:0,icon:'food'},
        {time:'14:00',label:'Numericals',h:14,m:0,dur:'3 hr',icon:'bolt'},
        {time:'17:30',label:'Exercise',h:17,m:30,icon:'run'},
        {time:'18:15',label:'Revision',h:18,m:15,dur:'2 hr',icon:'review'},
        {time:'20:30',label:'Dinner',h:20,m:30,icon:'moon'},
        {time:'21:00',label:'Night Review',h:21,m:0,dur:'1.5 hr',icon:'notes'},
        {time:'22:30',label:'So Jao',h:22,m:30,icon:'sleep'},
      ];
      const days2 = 0;
      const current2 = [...sessions2].reverse().find(s => (s.h*60+s.m) <= cur2);
      const next2 = sessions2.find(s => (s.h*60+s.m) > cur2);
      const lines = sessions2.map(s => {
        const st = s.h*60+s.m;
        const marker = st < cur2 ? '[done]' : (current2 && current2.time===s.time ? '[now]' : '[wait]');
        return marker + ' ' + s.time + ' ' + s.label + (s.dur ? ' (' + s.dur + ')' : '');
      });
    }

        case CMD.ROUTINE: {
      const routineText = DAILY_ROUTINE.map(r =>
        `**${r.time}** — ${r.label}\n${r.desc}`
      ).join('\n\n');
      return {
        handled: true,
      };
    }

    case 'timer': {
      const { seconds, label } = cmd;
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      // Use native timer deeplink
      const timerUrl = `intent:#Intent;action=android.intent.action.SET_TIMER;i.android.intent.extra.COUNTDOWN_LENGTH_MS=${seconds * 1000};S.android.intent.extra.TIMER_MESSAGE=${encodeURIComponent(label)};end`;
      window.location.href = timerUrl;
      setTimeout(() => {
        // Fallback: SW notification after duration
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SCHEDULE_NOTIFICATION',
            data: { title: '⏰ Timer Complete!', body: `${label} khatam ho gaya!`, delay: seconds * 1000, tag: 'timer' }
          });
        }
      }, 100);
      return { success: true, message: `⏰ ${mins > 0 ? mins + ' min' : ''}${secs > 0 ? ' ' + secs + ' sec' : ''} ka timer set ho gaya!`, type: 'timer' };
    }

    case 'navigate': {
      if (typeof window !== 'undefined') window.location.href = cmd.url;
      return { success: true, message: cmd.message, type: 'navigate' };
    }

    case CMD.ALARM: {
      const { hour, minute, label, deepUrl } = parsed;
      const timeStr = `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
      if (deepUrl && typeof window !== 'undefined') {
        setTimeout(() => { window.location.href = deepUrl; }, 200);
      }
      return { handled: true, response: `⏰ **Alarm set kar raha hoon — ${timeStr}**\n\nLabel: ${label}\n\nPhone mein alarm app khul raha hai — confirm karo!` };
    }

    case CMD.SETTINGS: {
      const { setting, value } = parsed;
      if (setting === 'font' && value) {
        if (typeof localStorage !== 'undefined') localStorage.setItem('jarvis_font_size', value);
        const sizes = { small: '13px', normal: '14px', large: '16px', xlarge: '18px' };
        if (typeof document !== 'undefined' && sizes[value]) document.documentElement.style.fontSize = sizes[value];
        return { handled: true, response: `✅ Font size **${value}** kar diya! Kaisi lagti hai?` };
      }
      if (setting === 'name' && value) {
        if (typeof localStorage !== 'undefined') localStorage.setItem('jarvis_ai_name', value);
        return { handled: true, response: `✅ Ab main **${value}** hoon! Bolo ${value}, kya kaam hai? 😄` };
      }
      return { handled: false };
    }

    case CMD.PHONE: {
      // Let the existing automation system handle it
      return { handled: false };
    }

    case CMD.SEARCH: {
      const { query, platform } = parsed;
      const url = platform === 'youtube'
        ? `https://youtube.com/results?search_query=${encodeURIComponent(query)}`
        : `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      setTimeout(() => { if (typeof window !== 'undefined') window.open(url, '_blank'); }, 100);
      return { handled: true, response: `🔍 ${platform === 'youtube' ? 'YouTube' : 'Google'} pe search kar raha hoon: **"${query}"**` };
    }

    default:
      return { handled: false };
  }
}

// ─── QUICK COMMAND SUGGESTIONS ───────────────────────────────
export const QUICK_COMMANDS = [
  { label: '📸 Instagram kholo', cmd: 'Instagram kholo' },
  { label: '💬 WhatsApp kholo',  cmd: 'WhatsApp kholo' },
  { label: '▶️ YouTube kholo',  cmd: 'YouTube kholo' },
  { label: '🎵 Spotify kholo',  cmd: 'Spotify kholo' },
  { label: '🟢 Green theme',    cmd: 'Theme green karo' },
  { label: '⚫ AMOLED theme',   cmd: 'Theme AMOLED karo' },
  { label: '📋 Daily routine',  cmd: 'Mera daily routine dikhao' },
  { label: '🔦 Torch on',       cmd: 'Torch on karo' },
  { label: '🔇 Phone mute',     cmd: 'Phone mute karo' },
  { label: '📚 Study mode',     cmd: 'Study mode on karo' },
];

// ─── COMMAND HELP TEXT ────────────────────────────────────────
export const CMD_HELP = `**Chat se hi sab kuch karo:**

📱 **App Open:**
"Instagram kholo" / "WhatsApp open karo" / "YouTube chala"

💬 **Message:**
"WhatsApp karo Ram ko — Bhai aa raha hoon"

🎨 **Theme:**
"Theme green karo" / "AMOLED theme lagao"

📋 **Routine:**
"Mera daily routine dikhao"

⏰ **Alarm:**
"Alarm laga 7 baje" / "6:30 AM ka alarm set karo"

🔤 **Font:**
"Font size large karo"

🔍 **Search:**

📱 **Phone:**
"WiFi on karo" / "Torch chala" / "Study mode"`;
