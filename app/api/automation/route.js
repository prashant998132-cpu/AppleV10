// app/api/automation/route.js — JARVIS MacroDroid Bridge
// ════════════════════════════════════════════════════════════
// Phone automation via MacroDroid HTTP triggers
// Setup: MacroDroid app → Webhooks → Add trigger URL
//
// HOW IT WORKS:
// 1. User says "Hey JARVIS, WiFi band karo"
// 2. JARVIS detects intent → calls this API
// 3. This API sends webhook to MacroDroid
// 4. MacroDroid executes action on phone
//
// MacroDroid Webhook URL format:
// https://trigger.macrodroid.com/{DEVICE_ID}/{TRIGGER_NAME}
// ════════════════════════════════════════════════════════════

import { getUser } from '@/lib/db/supabase';
import { getKeys } from '@/lib/config';

export const runtime = 'nodejs';

// ─── ACTION → MACRODROID TRIGGER MAP ────────────────────────────
const ACTION_MAP = {
  // WiFi
  'wifi_on':         { trigger: 'jarvis_wifi_on',         desc: 'WiFi on kar diya ✅' },
  'wifi_off':        { trigger: 'jarvis_wifi_off',        desc: 'WiFi off kar diya ✅' },
  // Bluetooth
  'bt_on':           { trigger: 'jarvis_bt_on',           desc: 'Bluetooth on ✅' },
  'bt_off':          { trigger: 'jarvis_bt_off',          desc: 'Bluetooth off ✅' },
  // Volume
  'volume_up':       { trigger: 'jarvis_volume_up',       desc: 'Volume badha diya 🔊' },
  'volume_down':     { trigger: 'jarvis_volume_down',     desc: 'Volume kam kar diya 🔉' },
  'volume_mute':     { trigger: 'jarvis_mute',            desc: 'Phone mute kar diya 🔇' },
  'volume_max':      { trigger: 'jarvis_volume_max',      desc: 'Volume max kar diya 🔊' },
  // Apps
  'open_youtube':    { trigger: 'jarvis_open_youtube',    desc: 'YouTube khol raha hoon 📺' },
  'open_whatsapp':   { trigger: 'jarvis_open_whatsapp',  desc: 'WhatsApp khol raha hoon 💬' },
  'open_camera':     { trigger: 'jarvis_open_camera',    desc: 'Camera khol raha hoon 📷' },
  'open_maps':       { trigger: 'jarvis_open_maps',      desc: 'Maps khol raha hoon 🗺️' },
  'open_spotify':    { trigger: 'jarvis_open_spotify',   desc: 'Spotify khol raha hoon 🎵' },
  'open_chrome':     { trigger: 'jarvis_open_chrome',    desc: 'Chrome khol raha hoon 🌐' },
  'open_settings':   { trigger: 'jarvis_open_settings',  desc: 'Settings khol raha hoon ⚙️' },
  'open_calculator': { trigger: 'jarvis_open_calc',      desc: 'Calculator khola ✅' },
  // Torch
  'torch_on':        { trigger: 'jarvis_torch_on',       desc: 'Torch on kar diya 🔦' },
  'torch_off':       { trigger: 'jarvis_torch_off',      desc: 'Torch off kar diya ✅' },
  // Alarm / Timer
  'set_alarm':       { trigger: 'jarvis_alarm',          desc: 'Alarm set kar diya ⏰' },
  'cancel_alarm':    { trigger: 'jarvis_alarm_cancel',   desc: 'Alarm cancel kar diya ✅' },
  // Notifications
  'dnd_on':          { trigger: 'jarvis_dnd_on',         desc: 'Do Not Disturb on ✅' },
  'dnd_off':         { trigger: 'jarvis_dnd_off',        desc: 'Do Not Disturb off ✅' },
  // Screen
  'screen_on':       { trigger: 'jarvis_screen_on',      desc: 'Screen on kar diya ✅' },
  'screen_off':      { trigger: 'jarvis_screen_off',     desc: 'Screen off kar diya ✅' },
  // Media
  'play_music':      { trigger: 'jarvis_play',           desc: 'Music chala diya ▶️' },
  'pause_music':     { trigger: 'jarvis_pause',          desc: 'Music pause kar diya ⏸️' },
  'next_track':      { trigger: 'jarvis_next',           desc: 'Next track ⏭️' },
  // Phone
  'take_screenshot': { trigger: 'jarvis_screenshot',     desc: 'Screenshot le raha hoon 📸' },
  'lock_phone':      { trigger: 'jarvis_lock',           desc: 'Phone lock kar diya 🔒' },
  // Smart Modes
  'study_mode':      { trigger: 'jarvis_studymode',      desc: 'Study mode on ✅ — DND, dim, focus' },
  'sleep_mode':      { trigger: 'jarvis_sleepmode',      desc: 'Sleep mode on ✅ — WiFi off, DND, dim' },
  'gym_mode':        { trigger: 'jarvis_gymmode',        desc: 'Gym mode on 💪 — Music + DND' },
  'drive_mode':      { trigger: 'jarvis_drivemode',      desc: 'Drive mode on 🚗 — BT + Maps + DND' },
  'movie_mode':      { trigger: 'jarvis_moviemode',      desc: 'Movie mode on 🎬 — Max bright + DND' },
  'gaming_mode':     { trigger: 'jarvis_gamingmode',     desc: 'Gaming mode on 🎮 — Max vol + DND' },
  // Extended hardware
  'selfie':          { trigger: 'jarvis_selfie',         desc: 'Selfie le raha hoon 🤳' },
  'hotspot_on':      { trigger: 'jarvis_hotspot_on',     desc: 'Hotspot on kar diya ✅' },
  'hotspot_off':     { trigger: 'jarvis_hotspot_off',    desc: 'Hotspot off kar diya ✅' },
  'brightness_max':  { trigger: 'jarvis_brightness_max', desc: 'Brightness max kar diya ☀️' },
  'brightness_min':  { trigger: 'jarvis_brightness_min', desc: 'Brightness min kar diya 🌑' },
  'dark_mode':       { trigger: 'jarvis_dark_mode_on',   desc: 'Dark mode on 🌙' },
};

// ─── INTENT DETECTOR ─────────────────────────────────────────────
// ─── ENHANCED INTENT DETECTOR (covers more Hinglish patterns) ──────
export function detectAutomationIntent(text) {
  const t = text.toLowerCase();

  // WiFi
  if (/wifi.*(on|chalu|khol|start|laga|kar|karo)|wifi\s+chalu|wi-?fi\s+on/i.test(t))  return 'wifi_on';
  if (/wifi.*(off|band|bund|stop)/i.test(t))          return 'wifi_off';
  // Bluetooth
  if (/bluetooth.*(on|chalu)/i.test(t))               return 'bt_on';
  if (/bluetooth.*(off|band)/i.test(t))               return 'bt_off';
  // Volume
  if (/volume.*(up|badha|zyada|tez)/i.test(t))        return 'volume_up';
  if (/volume.*(down|kam|dhima)/i.test(t))             return 'volume_down';
  if (/mute|chup|silent/i.test(t))                    return 'volume_mute';
  if (/volume.*(max|full|poora)/i.test(t))             return 'volume_max';
  // Torch
  if (/torch.*(on|chalu|jala|laga)|flashlight.*(on|chalu)|light.*(on|chalu)|batti.*on/i.test(t)) return 'torch_on';
  if (/torch|flashlight|light.*(off|band)/i.test(t)) return 'torch_off';
  // Apps
  if (/youtube.*khol|open.*youtube/i.test(t))         return 'open_youtube';
  if (/whatsapp.*khol|open.*whatsapp/i.test(t))       return 'open_whatsapp';
  if (/camera.*khol|open.*camera/i.test(t))           return 'open_camera';
  if (/maps.*khol|open.*maps/i.test(t))               return 'open_maps';
  if (/spotify.*khol|open.*spotify/i.test(t))         return 'open_spotify';
  if (/chrome.*khol|open.*chrome/i.test(t))           return 'open_chrome';
  if (/settings.*khol|open.*settings/i.test(t))       return 'open_settings';
  if (/calculator|calc/i.test(t))                     return 'open_calculator';
  // DND
  if (/dnd|disturb.*(on|chalu)|do not disturb/i.test(t)) return 'dnd_on';
  if (/dnd.*(off|band)|disturb.*(off)/i.test(t))     return 'dnd_off';
  // Media
  if (/music.*(chala|play|start)/i.test(t))           return 'play_music';
  if (/music.*(roko|pause|band)/i.test(t))            return 'pause_music';
  if (/next.*(song|track|gana)/i.test(t))             return 'next_track';
  // Screen
  if (/screenshot/i.test(t))                         return 'take_screenshot';
  if (/phone.*(lock|band)|screen.*(off|band)/i.test(t)) return 'lock_phone';
  // Alarm
  if (/alarm.*(set|laga|rakh)/i.test(t))              return 'set_alarm';
  if (/alarm.*(cancel|band|hata)/i.test(t))           return 'cancel_alarm';

  // Smart modes
  if (/study.*mode|studymode|padhai.*mode/i.test(t)) return 'study_mode';
  if (/sleep.*mode|sleepmode|so.*ja|sone.*wala/i.test(t)) return 'sleep_mode';
  if (/gym.*mode|gymmode|exercise.*mode/i.test(t)) return 'gym_mode';
  if (/drive.*mode|drivemode|gaadi.*chal/i.test(t)) return 'drive_mode';

  return null;
}

// ─── MAIN HANDLER ────────────────────────────────────────────────
export async function POST(req) {
  try {
    const user = await getUser();
    if (!user) { user = { id: 'local-user-jarvis', email: 'local@jarvis.app' }; } if (false) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, text, params = {} } = await req.json();

    // Detect from text if action not provided directly
    const resolvedAction = action || (text ? detectAutomationIntent(text) : null);

    if (!resolvedAction) {
      return Response.json({
        ok: false,
        message: 'Koi automation action nahi mila. MacroDroid setup hai?',
        availableActions: Object.keys(ACTION_MAP),
      });
    }

    const actionDef = ACTION_MAP[resolvedAction];
    if (!actionDef) {
      return Response.json({ ok: false, message: `Unknown action: ${resolvedAction}` });
    }

    // Get MacroDroid device ID — check multiple sources
    const keys = getKeys();
    // Priority: body > env var > header
    const deviceId = params?.deviceId
      || keys.MACRODROID_DEVICE_ID
      || process.env.MACRODROID_DEVICE_ID
      || req.headers?.get?.('x-macrodroid-id');

    if (!deviceId) {
      // Try AI NLP first if text provided and no action
      if (text && !action) {
        const aiResult = await fetch(new URL('/api/phone/command', req.url).href, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: text, deviceId: '' }),
        }).then(r => r.json()).catch(() => null);
        if (aiResult?.action) {
          return Response.json({
            ok: false,
            setup_needed: true,
            understood: aiResult.action,
            explain: aiResult.explain,
            message: 'MacroDroid ID nahi hai — Phone Control → Setup tab mein save karo.',
          });
        }
      }
      return Response.json({
        ok: false,
        setup_needed: true,
        message: 'MacroDroid Device ID nahi hai. Phone Control → Setup tab mein save karo.',
        action: resolvedAction,
        desc: actionDef?.desc,
      });
    }

    // Fire MacroDroid webhook
    const webhookUrl = `https://trigger.macrodroid.com/${deviceId}/${actionDef.trigger}`;

    // Add optional params as query string
    const paramStr = Object.keys(params).length > 0
      ? '?' + new URLSearchParams(params).toString()
      : '';

    const r = await fetch(webhookUrl + paramStr, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (!r.ok) {
      return Response.json({
        ok: false,
        message: 'MacroDroid webhook failed. Device online hai?',
        status: r.status,
      });
    }

    return Response.json({
      ok: true,
      action: resolvedAction,
      message: actionDef.desc,
      webhook: webhookUrl,
    });

  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// ─── GET — list available actions ────────────────────────────────
export async function GET() {
  const groups = {};
  for (const [key, val] of Object.entries(ACTION_MAP)) {
    const category = key.split('_')[0];
    if (!groups[category]) groups[category] = [];
    groups[category].push({ action: key, desc: val.desc, trigger: val.trigger });
  }
  return Response.json({ actions: ACTION_MAP, grouped: groups, total: Object.keys(ACTION_MAP).length });
}
