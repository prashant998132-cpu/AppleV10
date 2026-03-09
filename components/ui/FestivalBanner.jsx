'use client';
// components/ui/FestivalBanner.jsx — JARVIS v10
// Shows today's Indian festivals / upcoming ones as a nice banner
// Auto-hides if no festival in next 7 days

import { useState, useEffect } from 'react';

const FESTIVALS = [
  // Format: { name, date (MM-DD), emoji, color, greeting }
  { name: 'Republic Day',     date: '01-26', emoji: '🇮🇳', color: '#FF9933', greeting: 'Jai Hind! 🎉' },
  { name: 'Valentine\'s Day', date: '02-14', emoji: '❤️',  color: '#FF69B4', greeting: 'Happy Valentine\'s Day!' },
  { name: 'Holi',             date: '03-14', emoji: '🎨',  color: '#FF6B6B', greeting: 'Happy Holi! Rang barse! 🎨' },
  { name: 'Ram Navami',       date: '04-06', emoji: '🙏',  color: '#FF8C00', greeting: 'Jai Shri Ram! 🙏' },
  { name: 'Eid ul-Fitr',      date: '03-30', emoji: '☪️',  color: '#2E8B57', greeting: 'Eid Mubarak! ☪️' },
  { name: 'Baisakhi',         date: '04-13', emoji: '🌾',  color: '#FFD700', greeting: 'Happy Baisakhi! 🌾' },
  { name: 'Independence Day', date: '08-15', emoji: '🇮🇳', color: '#138808', greeting: 'Jai Hind! Happy Independence Day! 🇮🇳' },
  { name: 'Janmashtami',      date: '08-16', emoji: '🦚',  color: '#4B0082', greeting: 'Jai Shri Krishna! 🦚' },
  { name: 'Ganesh Chaturthi', date: '08-27', emoji: '🐘',  color: '#FF8C00', greeting: 'Ganpati Bappa Morya! 🐘' },
  { name: 'Navratri',         date: '10-02', emoji: '🪔',  color: '#FF4500', greeting: 'Happy Navratri! 🪔' },
  { name: 'Dussehra',         date: '10-12', emoji: '🏹',  color: '#FF6B6B', greeting: 'Happy Dussehra! Jai Ma Durga!' },
  { name: 'Diwali',           date: '10-20', emoji: '🪔',  color: '#FFD700', greeting: 'Happy Diwali! Shubh Deepawali! 🪔' },
  { name: 'Guru Nanak Jayanti',date:'11-05', emoji: '🙏',  color: '#FF8C00', greeting: 'Waheguru Ji Ka Khalsa, Waheguru Ji Ki Fateh!' },
  { name: 'Christmas',        date: '12-25', emoji: '🎄',  color: '#2E8B57', greeting: 'Merry Christmas! 🎄' },
  { name: 'New Year\'s Eve',  date: '12-31', emoji: '🎆',  color: '#4169E1', greeting: 'Happy New Year! 🎆' },
];

export default function FestivalBanner() {
  const [festival, setFestival] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${mm}-${dd}`;

    // Check today first
    const todayFest = FESTIVALS.find(f => f.date === todayStr);
    if (todayFest) { setFestival({ ...todayFest, isToday: true, daysLeft: 0 }); return; }

    // Check next 7 days
    for (let i = 1; i <= 7; i++) {
      const next = new Date(today);
      next.setDate(today.getDate() + i);
      const nm = String(next.getMonth() + 1).padStart(2, '0');
      const nd = String(next.getDate()).padStart(2, '0');
      const nextStr = `${nm}-${nd}`;
      const upcomingFest = FESTIVALS.find(f => f.date === nextStr);
      if (upcomingFest) { setFestival({ ...upcomingFest, isToday: false, daysLeft: i }); return; }
    }
  }, []);

  if (!festival || dismissed) return null;

  return (
    <div
      className="relative mx-4 mb-3 rounded-2xl overflow-hidden cursor-pointer select-none"
      style={{ background: `linear-gradient(135deg, ${festival.color}22, ${festival.color}44)`, border: `1px solid ${festival.color}66` }}
      onClick={() => setDismissed(true)}
    >
      <div className="flex items-center gap-3 px-4 py-2.5">
        <span className="text-2xl">{festival.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">
            {festival.isToday ? `🎉 Aaj ${festival.name} hai!` : `${festival.daysLeft} din mein — ${festival.name}`}
          </p>
          <p className="text-white/70 text-xs truncate">{festival.greeting}</p>
        </div>
        <button
          className="text-white/50 hover:text-white/80 text-xs ml-1 flex-shrink-0"
          onClick={e => { e.stopPropagation(); setDismissed(true); }}
        >
          ✕
        </button>
      </div>
      {/* Shimmer animation for today */}
      {festival.isToday && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse pointer-events-none" />
      )}
    </div>
  );
}
