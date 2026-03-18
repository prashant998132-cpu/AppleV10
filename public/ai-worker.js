// public/ai-worker.js — JARVIS Background AI Worker
// ══════════════════════════════════════════════════════
// Ye Worker background mein chalta hai — tab bhi jab
// main app visible nahi ho
// Features:
// - Schedule-aware study reminders
// - Offline AI responses (pattern matching)
// - Periodic API calls without blocking UI
// ══════════════════════════════════════════════════════

const OFFLINE_RESPONSES = {
  time: () => `Abhi ${new Date().toLocaleTimeString('hi-IN', {hour:'2-digit',minute:'2-digit'})} baje hain ⏰`,
  date: () => `Aaj ${new Date().toLocaleDateString('hi-IN', {weekday:'long',day:'numeric',month:'long'})} hai 📅`,
  neet: () => {
    const d = Math.max(0, Math.round((new Date('2026-05-03') - new Date()) / 86400000));
    return `NEET 2026 mein ${d} din bache hain. Padhte raho! 📚`;
  },
  motivate: () => {
    const msgs = [
      'Tu kar sakta hai bhai! NEET crack hogi. 🔥',
      'Ek chapter ek din — compound effect se rank aayegi!',
      'Thoda aur push kar. Finish line nazdeek hai!',
      'Topper bhi ek baar beginner tha. Tu already winner hai!',
    ];
    return msgs[Math.floor(Math.random() * msgs.length)];
  },
};

// ─── Message Handler ──────────────────────────────────
self.onmessage = async (e) => {
  const { type, data, id } = e.data || {};

  switch (type) {
    case 'OFFLINE_QUERY': {
      const query = (data?.query || '').toLowerCase();
      let response = null;

      if (/time|samay|baje|kitne/.test(query)) response = OFFLINE_RESPONSES.time();
      else if (/date|aaj|today|din/.test(query)) response = OFFLINE_RESPONSES.date();
      else if (/neet|exam|din.*bache/.test(query)) response = OFFLINE_RESPONSES.neet();
      else if (/motivat|inspire|himmat|josh/.test(query)) response = OFFLINE_RESPONSES.motivate();
      else if (/calc|[\d+\-*/]/.test(query)) {
        try {
          const expr = query.replace(/[^0-9+\-*/().%\s]/g, '');
          const result = Function('"use strict"; return (' + expr + ')')();
          response = `${expr} = ${result} 🧮`;
        } catch {
          response = null;
        }
      }

      self.postMessage({ id, type: 'OFFLINE_RESPONSE', response });
      break;
    }

    case 'CHECK_STUDY_TIME': {
      const now = new Date();
      const cur = now.getHours() * 60 + now.getMinutes();

      const SCHEDULE = [
        { h:5,  m:30, title:'🌅 Uth ja!',          body:'NEET 2026 — start karo!' },
        { h:6,  m:0,  title:'📚 Physics',           body:'2.5 hrs fresh brain time' },
        { h:9,  m:0,  title:'🧬 Biology',           body:'NCERT + diagrams 2 hrs' },
        { h:14, m:0,  title:'⚡ Numericals',        body:'PYQ + problems 3 hrs' },
        { h:18, m:15, title:'📖 Revision',          body:'Aaj jo padha — 2 hrs' },
        { h:21, m:0,  title:'📝 Night Review',      body:'Notes + formulas 1.5 hrs' },
      ];

      for (const s of SCHEDULE) {
        const t = s.h * 60 + s.m;
        if (cur >= t && cur <= t + 5) {
          self.postMessage({ id, type: 'SHOW_REMINDER', title: s.title, body: s.body });
          break;
        }
      }
      self.postMessage({ id, type: 'CHECK_DONE' });
      break;
    }

    case 'PING':
      self.postMessage({ id, type: 'PONG', time: Date.now() });
      break;
  }
};
