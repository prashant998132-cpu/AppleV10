// app/api/phone/command/route.js
// JARVIS v10.9 — AI Command Interpreter
// Natural language → action key → MacroDroid trigger
// "WiFi chalu yaar" → { action: "wifi_on", explain: "WiFi On karunga" }
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SYSTEM_PROMPT = `Tu JARVIS ka Phone Command Interpreter hai.
User ek phone command bolta hai — Hindi, Hinglish, ya English mein.
Tu sirf JSON respond karta hai — kuch aur nahi.

Available actions (sahi action key return karo):
wifi_on, wifi_off, bt_on, bt_off, hotspot_on, hotspot_off, data_on, data_off,
vol_up, vol_down, mute, unmute, vol_max,
torch_on, torch_off, screenshot, lock, selfie,
bright_max, bright_min, dark_mode, auto_bright, keep_screen_on,
study_mode, sleep_mode, drive_mode, gym_mode, movie_mode, gaming_mode, work_mode, meeting_mode,
open_youtube, open_whatsapp, open_instagram, open_spotify, open_maps, open_camera, open_settings,
play_music, pause_music, next_track, prev_track,
dnd_on, dnd_off, notif_read, notif_clear,
get_battery, get_storage, get_ram,
alarm_set, timer_set, reminder_set.

Response format:
{"action": "action_key", "explain": "Hinglish mein kya karunga", "confidence": 0.0-1.0}

Agar samajh nahi aaya:
{"action": null, "reply": "Hinglish mein politely bolo kya nahi samajha", "confidence": 0}

Sirf JSON — no markdown, no explanation, no extra text.`;

export async function POST(req) {
  try {
    const { command, deviceId } = await req.json();
    if (!command?.trim()) return NextResponse.json({ action: null, reply: 'Command empty hai' });

    const { getKeys } = await import('@/lib/config');
    const keys = getKeys();

    // Try Groq first (fastest, free)
    const groqKey = keys.GROQ_API_KEY;
    if (groqKey) {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 80,
          temperature: 0.1,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user',   content: command },
          ],
        }),
      });
      if (res.ok) {
        const d = await res.json();
        const text = d.choices?.[0]?.message?.content?.trim();
        if (text) {
          try {
            const parsed = JSON.parse(text);
            return NextResponse.json(parsed);
          } catch {}
        }
      }
    }

    // Fallback: Gemini Flash
    const gemKey = keys.GEMINI_API_KEY;
    if (gemKey) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${gemKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\nCommand: ${command}` }] }],
          generationConfig: { maxOutputTokens: 80, temperature: 0.1 },
        }),
      });
      if (res.ok) {
        const d = await res.json();
        const text = d.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          try {
            const clean = text.replace(/```json|```/g, '').trim();
            return NextResponse.json(JSON.parse(clean));
          } catch {}
        }
      }
    }

    // Last fallback: basic local keyword match
    return NextResponse.json(localKeywordMatch(command));
  } catch (e) {
    return NextResponse.json({ action: null, reply: 'Server error: ' + e.message }, { status: 500 });
  }
}

// Basic keyword matcher — works even without AI keys
function localKeywordMatch(cmd) {
  const c = cmd.toLowerCase();
  const map = [
    { keys: ['wifi on', 'wifi chalu', 'wifi lagao', 'वाईफाई चालू'],        action: 'wifi_on',      explain: 'WiFi on kar raha hoon' },
    { keys: ['wifi off', 'wifi band', 'wifi hatao', 'वाईफाई बंद'],          action: 'wifi_off',     explain: 'WiFi off kar raha hoon' },
    { keys: ['bluetooth on', 'bt on', 'bluetooth chalu'],                   action: 'bt_on',        explain: 'Bluetooth on kar raha hoon' },
    { keys: ['bluetooth off', 'bt off', 'bluetooth band'],                  action: 'bt_off',       explain: 'Bluetooth off kar raha hoon' },
    { keys: ['hotspot on', 'hotspot chalu', 'data share'],                  action: 'hotspot_on',   explain: 'Hotspot on kar raha hoon' },
    { keys: ['torch', 'flashlight', 'light on', 'टॉर्च चालू'],             action: 'torch_on',     explain: 'Torch on kar raha hoon' },
    { keys: ['torch off', 'light off', 'टॉर्च बंद'],                        action: 'torch_off',    explain: 'Torch off kar raha hoon' },
    { keys: ['mute', 'silent', 'chup', 'आवाज़ बंद'],                        action: 'mute',         explain: 'Phone mute kar raha hoon' },
    { keys: ['unmute', 'volume on', 'awaaz'],                               action: 'unmute',       explain: 'Phone unmute kar raha hoon' },
    { keys: ['screenshot', 'screen shot', 'स्क्रीनशॉट'],                   action: 'screenshot',   explain: 'Screenshot le raha hoon' },
    { keys: ['lock', 'band kar', 'phone lock', 'लॉक'],                     action: 'lock',         explain: 'Phone lock kar raha hoon' },
    { keys: ['dark mode', 'dark on', 'डार्क मोड'],                          action: 'dark_mode',    explain: 'Dark mode on kar raha hoon' },
    { keys: ['study', 'padhai', 'पढ़ाई'],                                    action: 'study_mode',   explain: 'Study mode activate kar raha hoon' },
    { keys: ['sleep', 'so ja', 'रात', 'neend'],                             action: 'sleep_mode',   explain: 'Sleep mode activate kar raha hoon' },
    { keys: ['drive', 'driving', 'car', 'गाड़ी'],                           action: 'drive_mode',   explain: 'Drive mode activate kar raha hoon' },
    { keys: ['gym', 'exercise', 'workout', 'व्यायाम'],                      action: 'gym_mode',     explain: 'Gym mode activate kar raha hoon' },
    { keys: ['movie', 'film', 'web series'],                                action: 'movie_mode',   explain: 'Movie mode activate kar raha hoon' },
    { keys: ['game', 'gaming', 'खेल'],                                       action: 'gaming_mode',  explain: 'Gaming mode activate kar raha hoon' },
    { keys: ['meeting', 'call pe hoon'],                                    action: 'meeting_mode', explain: 'Meeting mode activate kar raha hoon' },
    { keys: ['youtube', 'video dekho'],                                      action: 'open_youtube', explain: 'YouTube khol raha hoon' },
    { keys: ['whatsapp', 'wp'],                                              action: 'open_whatsapp',explain: 'WhatsApp khol raha hoon' },
    { keys: ['spotify', 'music chalo', 'gaana'],                            action: 'open_spotify', explain: 'Spotify khol raha hoon' },
    { keys: ['battery', 'charge', 'बैटरी'],                                 action: 'get_battery',  explain: 'Battery info le raha hoon' },
    { keys: ['volume up', 'awaaz badhao', 'तेज़ करो'],                      action: 'vol_up',       explain: 'Volume up kar raha hoon' },
    { keys: ['volume down', 'awaaz kam', 'धीमा करो'],                      action: 'vol_down',     explain: 'Volume down kar raha hoon' },
    { keys: ['play', 'chalo music', 'music on'],                            action: 'play_music',   explain: 'Music play kar raha hoon' },
    { keys: ['pause', 'rok do', 'ruko'],                                    action: 'pause_music',  explain: 'Music pause kar raha hoon' },
    { keys: ['next song', 'agla', 'skip'],                                  action: 'next_track',   explain: 'Next track chal raha hoon' },
    { keys: ['alarm', 'अलार्म'],                                             action: 'alarm_set',    explain: 'Alarm set kar raha hoon' },
    { keys: ['timer', 'countdown'],                                          action: 'timer_set',    explain: 'Timer set kar raha hoon' },
    { keys: ['selfie', 'photo le', 'front camera'],                         action: 'selfie',       explain: 'Selfie le raha hoon' },
    { keys: ['dnd', 'do not disturb', 'disturb mat'],                       action: 'dnd_on',       explain: 'DND on kar raha hoon' },
    { keys: ['notification', 'notif', 'messages'],                          action: 'notif_read',   explain: 'Notifications la raha hoon' },
  ];

  for (const m of map) {
    if (m.keys.some(k => c.includes(k))) {
      return { action: m.action, explain: m.explain, confidence: 0.7 };
    }
  }
  return { action: null, reply: 'Yeh command nahi pehchana — thoda aur clear bolo jaise "WiFi on karo" ya "study mode"', confidence: 0 };
}
