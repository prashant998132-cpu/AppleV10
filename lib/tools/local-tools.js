// lib/tools/local-tools.js — JARVIS Zero-API Local Tools
// ════════════════════════════════════════════════════════
// These tools run 100% locally — no API call, no credits used
// Fast, always available, no bandwidth cost
// ════════════════════════════════════════════════════════

// ─── LOCAL TOOL REGISTRY ────────────────────────────────
export const LOCAL_TOOLS = [
  'calculator', 'unit_convert', 'password_gen', 'qr_code',
  'text_counter', 'hash_text_local', 'base64_encode',
  'uuid_gen', 'color_picker', 'roman_numeral',
  'bmi_calc', 'water_intake', 'percentage_calc',
  'days_between', 'age_calc',
];

// ─── CHECK IF TOOL IS LOCAL ──────────────────────────────
export function isLocalTool(toolName) {
  return LOCAL_TOOLS.includes(toolName);
}

// ─── EXECUTE LOCAL TOOL ──────────────────────────────────
export function executeLocalTool(toolName, params = {}) {
  switch (toolName) {

    // ── CALCULATOR ──────────────────────────────────────
    case 'calculator': {
      const expr = params.expression || params.query || '';
      try {
        // Safe eval — only allow math chars
        const safe = expr.replace(/[^0-9+\-*/().%\s^]/g, '');
        if (!safe) return { error: 'Invalid expression' };
        // eslint-disable-next-line no-new-func
        const result = Function('"use strict"; return (' + safe + ')')();
        return { expression: expr, result, formatted: result.toLocaleString('en-IN') };
      } catch {
        return { error: 'Could not calculate: ' + expr };
      }
    }

    // ── PERCENTAGE CALC ─────────────────────────────────
    case 'percentage_calc': {
      const { value, percent, mode = 'of' } = params;
      const v = parseFloat(value), p = parseFloat(percent);
      if (isNaN(v) || isNaN(p)) return { error: 'Invalid numbers' };
      if (mode === 'of') return { result: (v * p) / 100, expression: `${p}% of ${v}` };
      if (mode === 'what') return { result: (v / p) * 100, expression: `${v} is what % of ${p}` };
      if (mode === 'change') return { result: ((p - v) / v) * 100, expression: `${v} → ${p} change%` };
      return { error: 'mode must be: of | what | change' };
    }

    // ── UNIT CONVERTER ──────────────────────────────────
    case 'unit_convert': {
      const { value, from_unit, to_unit } = params;
      const v = parseFloat(value);
      if (isNaN(v)) return { error: 'Invalid value' };
      const key = `${from_unit?.toLowerCase()}_${to_unit?.toLowerCase()}`;
      const conversions = {
        // Length
        km_mi: v => v * 0.621371, mi_km: v => v * 1.60934,
        m_ft: v => v * 3.28084, ft_m: v => v / 3.28084,
        cm_in: v => v * 0.393701, in_cm: v => v * 2.54,
        // Weight
        kg_lb: v => v * 2.20462, lb_kg: v => v / 2.20462,
        kg_g: v => v * 1000, g_kg: v => v / 1000,
        // Temperature
        c_f: v => (v * 9/5) + 32, f_c: v => (v - 32) * 5/9,
        c_k: v => v + 273.15, k_c: v => v - 273.15,
        // Speed
        kmh_mph: v => v * 0.621371, mph_kmh: v => v / 0.621371,
        ms_kmh: v => v * 3.6, kmh_ms: v => v / 3.6,
        // Data
        mb_gb: v => v / 1024, gb_mb: v => v * 1024,
        gb_tb: v => v / 1024, tb_gb: v => v * 1024,
        mb_kb: v => v * 1024, kb_mb: v => v / 1024,
        // Area
        sqm_sqft: v => v * 10.7639, sqft_sqm: v => v / 10.7639,
        acre_sqm: v => v * 4046.86, sqm_acre: v => v / 4046.86,
      };
      const fn = conversions[key];
      if (!fn) return { error: `Conversion ${from_unit} → ${to_unit} not supported` };
      const result = fn(v);
      return { value: v, from: from_unit, to: to_unit, result: +result.toFixed(4) };
    }

    // ── BMI CALCULATOR ──────────────────────────────────
    case 'bmi_calc': {
      const { weight_kg, height_cm } = params;
      const w = parseFloat(weight_kg), h = parseFloat(height_cm) / 100;
      if (isNaN(w) || isNaN(h) || h === 0) return { error: 'Invalid values' };
      const bmi = +(w / (h * h)).toFixed(1);
      let category;
      if (bmi < 18.5) category = 'Underweight 😟';
      else if (bmi < 25) category = 'Normal ✅';
      else if (bmi < 30) category = 'Overweight ⚠️';
      else category = 'Obese 🔴';
      return { bmi, category, weight_kg: w, height_cm: height_cm };
    }

    // ── WATER INTAKE ────────────────────────────────────
    case 'water_intake': {
      const { weight_kg, activity = 'moderate' } = params;
      const w = parseFloat(weight_kg);
      if (isNaN(w)) return { error: 'Invalid weight' };
      const base = w * 35; // ml
      const extra = activity === 'high' ? 500 : activity === 'low' ? -200 : 0;
      const total = base + extra;
      return {
        daily_ml: total, daily_liters: +(total / 1000).toFixed(1),
        glasses: Math.ceil(total / 250),
        note: `Based on ${w}kg weight, ${activity} activity`
      };
    }

    // ── PASSWORD GENERATOR ──────────────────────────────
    case 'password_gen': {
      const len = parseInt(params.length) || 16;
      const { include_symbols = true, include_numbers = true } = params;
      let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
      if (include_numbers) chars += '0123456789';
      if (include_symbols) chars += '!@#$%^&*()_+-=[]{}';
      const arr = new Uint8Array(len);
      crypto.getRandomValues(arr);
      const pwd = Array.from(arr).map(x => chars[x % chars.length]).join('');
      const strength = len >= 16 && include_symbols ? 'Strong 💪' : len >= 12 ? 'Medium 🟡' : 'Weak 🔴';
      return { password: pwd, length: len, strength };
    }

    // ── QR CODE ─────────────────────────────────────────
    case 'qr_code': {
      const text = params.text || params.url || '';
      if (!text) return { error: 'Text required for QR code' };
      const size = params.size || 300;
      const encoded = encodeURIComponent(text);
      return {
        url: `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`,
        text, size
      };
    }

    // ── TEXT COUNTER ────────────────────────────────────
    case 'text_counter': {
      const text = params.text || '';
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      const sentences = text.split(/[.!?]+/).filter(s => s.trim()).length;
      const paragraphs = text.split(/\n\n+/).filter(p => p.trim()).length;
      return {
        characters: text.length,
        characters_no_spaces: text.replace(/\s/g, '').length,
        words, sentences, paragraphs,
        reading_time_min: Math.ceil(words / 200),
      };
    }

    // ── BASE64 ──────────────────────────────────────────
    case 'base64_encode': {
      const { text, mode = 'encode' } = params;
      try {
        if (mode === 'encode') return { result: btoa(unescape(encodeURIComponent(text))), mode: 'encoded' };
        if (mode === 'decode') return { result: decodeURIComponent(escape(atob(text))), mode: 'decoded' };
      } catch { return { error: 'Invalid input for base64' }; }
      return { error: 'mode must be encode or decode' };
    }

    // ── UUID GENERATOR ──────────────────────────────────
    case 'uuid_gen': {
      const count = Math.min(parseInt(params.count) || 1, 10);
      const uuids = [];
      for (let i = 0; i < count; i++) {
        const arr = new Uint8Array(16);
        crypto.getRandomValues(arr);
        arr[6] = (arr[6] & 0x0f) | 0x40;
        arr[8] = (arr[8] & 0x3f) | 0x80;
        const hex = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
        uuids.push(`${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`);
      }
      return { uuids, count };
    }

    // ── ROMAN NUMERALS ──────────────────────────────────
    case 'roman_numeral': {
      const num = parseInt(params.number);
      if (isNaN(num) || num <= 0 || num > 3999) return { error: 'Number must be 1–3999' };
      const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
      const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
      let result = ''; let n = num;
      vals.forEach((v, i) => { while (n >= v) { result += syms[i]; n -= v; } });
      return { number: num, roman: result };
    }

    // ── DAYS BETWEEN ────────────────────────────────────
    case 'days_between': {
      try {
        const d1 = new Date(params.date1), d2 = new Date(params.date2);
        const diff = Math.abs(d2 - d1);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        return { date1: params.date1, date2: params.date2, days };
      } catch { return { error: 'Invalid dates' }; }
    }

    // ── AGE CALCULATOR ──────────────────────────────────
    case 'age_calc': {
      try {
        const birth = new Date(params.dob);
        const now = new Date();
        const age = now.getFullYear() - birth.getFullYear()
          - (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
        const next = new Date(now.getFullYear() + (now >= new Date(now.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0), birth.getMonth(), birth.getDate());
        const days_to_bday = Math.ceil((next - now) / (1000 * 60 * 60 * 24));
        return { age, dob: params.dob, days_to_next_birthday: days_to_bday };
      } catch { return { error: 'Invalid date of birth' }; }
    }

    // ── COLOR INFO ──────────────────────────────────────
    case 'color_picker': {
      const hex = (params.hex || '').replace('#', '');
      if (!/^[0-9a-fA-F]{6}$/.test(hex)) return { error: 'Invalid hex color' };
      const r = parseInt(hex.slice(0,2), 16);
      const g = parseInt(hex.slice(2,4), 16);
      const b = parseInt(hex.slice(4,6), 16);
      return {
        hex: `#${hex}`, rgb: `rgb(${r},${g},${b})`,
        hsl: rgbToHsl(r, g, b),
        preview_url: `https://singlecolorimage.com/get/${hex}/100x100`
      };
    }

    default:
      return null; // not a local tool
  }
}

// Helper: RGB → HSL
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `hsl(${Math.round(h*360)},${Math.round(s*100)}%,${Math.round(l*100)}%)`;
}
