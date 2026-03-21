'use client';
// components/chat/InfoBar.jsx — Daily Info Bar
// Shows: Gold rate | Silver rate | Weather | Battery
// Auto-refreshes every 5 min, cached in localStorage

import { useState, useEffect } from 'react';

const CACHE_KEY = 'jarvis_infobar_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 min

async function fetchRates() {
  try {
    // Gold/Silver via free metals API
    const res = await fetch('https://api.metals.live/v1/spot/gold,silver', {
      signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined,
    });
    if (res.ok) {
      const data = await res.json();
      const goldOz  = data[0]?.gold  || data?.gold  || 0;
      const silverOz= data[1]?.silver|| data?.silver|| 0;
      // Convert troy oz to 10g (1 troy oz = 31.1035g)
      const gold10g  = Math.round(goldOz   / 31.1035 * 10 * 83.5); // USD→INR approx
      const silver10g= Math.round(silverOz / 31.1035 * 10 * 83.5);
      return { gold10g, silver10g };
    }
  } catch {}

  // Fallback: goldapi.io free endpoint
  try {
    const res2 = await fetch('https://data-asg.goldprice.org/dbXRates/INR', {
      signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined,
    });
    if (res2.ok) {
      const d = await res2.json();
      const goldPerGram  = d.items?.[0]?.xauPrice / 31.1035;
      const silverPerGram= d.items?.[0]?.xagPrice / 31.1035;
      return {
        gold10g:   Math.round(goldPerGram   * 10),
        silver10g: Math.round(silverPerGram * 10),
      };
    }
  } catch {}

  return null;
}

async function fetchWeather(lat, lng) {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weathercode&timezone=auto`,
    );
    if (res.ok) {
      const d = await res.json();
      const temp = d.current?.temperature_2m;
      const code = d.current?.weathercode;
      const icon = code <= 1 ? '☀️' : code <= 3 ? '⛅' : code <= 67 ? '🌧️' : '⛈️';
      return { temp: Math.round(temp), icon };
    }
  } catch {}
  return null;
}

function getBattery() {
  if (typeof navigator === 'undefined') return null;
  if (!navigator.getBattery) return null;
  return navigator.getBattery().then(b => ({
    level: Math.round(b.level * 100),
    charging: b.charging,
  })).catch(() => null);
}

export default function InfoBar() {
  const [info, setInfo] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      if (cached.ts && Date.now() - cached.ts < CACHE_TTL) return cached;
    } catch {}
    return {};
  });

  useEffect(() => {
    let alive = true;

    async function load() {
      // Battery
      const battery = await getBattery();

      // Location for weather
      let weather = info.weather || null;
      let lat = null, lng = null;

      if (navigator.geolocation) {
        await new Promise(res => navigator.geolocation.getCurrentPosition(
          p => { lat = p.coords.latitude; lng = p.coords.longitude; res(); },
          () => res(), { timeout: 3000, maximumAge: 300000 }
        ));
      }

      if (lat && lng && (!info.weather || Date.now() - (info.ts || 0) > CACHE_TTL)) {
        weather = await fetchWeather(lat, lng);
      }

      // Rates
      let rates = null;
      if (!info.gold10g || Date.now() - (info.ts || 0) > CACHE_TTL) {
        rates = await fetchRates();
      }

      if (!alive) return;

      const newInfo = {
        battery: battery || info.battery,
        weather: weather || info.weather,
        gold10g:  rates?.gold10g  || info.gold10g,
        silver10g: rates?.silver10g || info.silver10g,
        ts: Date.now(),
      };

      setInfo(newInfo);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(newInfo)); } catch {}
    }

    load();
    const interval = setInterval(load, CACHE_TTL);
    return () => { alive = false; clearInterval(interval); };
  }, []);

  // Don't render if nothing to show
  const hasContent = info.gold10g || info.silver10g || info.weather || info.battery;
  if (!hasContent) return null;

  return (
    <div className="flex items-center gap-0 px-3 py-1.5 border-b border-white/[0.05] overflow-x-auto no-scrollbar shrink-0 bg-black/10">

      {/* Weather */}
      {info.weather && (
        <div className="flex items-center gap-1 shrink-0 mr-3">
          <span className="text-sm">{info.weather.icon}</span>
          <span className="text-[11px] text-slate-400 font-medium">{info.weather.temp}°</span>
        </div>
      )}

      {/* Gold rate */}
      {info.gold10g > 0 && (
        <div className="flex items-center gap-1 shrink-0 mr-3">
          <span className="text-[10px]">🥇</span>
          <span className="text-[10px] text-yellow-500/80 font-medium">
            ₹{info.gold10g.toLocaleString('en-IN')}
          </span>
          <span className="text-[9px] text-slate-700">/10g</span>
        </div>
      )}

      {/* Silver rate */}
      {info.silver10g > 0 && (
        <div className="flex items-center gap-1 shrink-0 mr-3">
          <span className="text-[10px]">🥈</span>
          <span className="text-[10px] text-slate-400 font-medium">
            ₹{info.silver10g.toLocaleString('en-IN')}
          </span>
          <span className="text-[9px] text-slate-700">/10g</span>
        </div>
      )}

      {/* Battery */}
      {info.battery && (
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          <span className="text-[10px]">{info.battery.charging ? '⚡' : '🔋'}</span>
          <span className={`text-[10px] font-medium ${
            info.battery.level <= 20 ? 'text-red-400' :
            info.battery.level <= 40 ? 'text-orange-400' : 'text-slate-400'
          }`}>{info.battery.level}%</span>
        </div>
      )}
    </div>
  );
}
