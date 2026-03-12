// lib/automation/tasker-bridge.js
// ══════════════════════════════════════════════════════════════
// JARVIS — Tasker HTTP Bridge (more powerful than MacroDroid)
// Tasker = MacroDroid ka bada bhai — variables, profiles, scenes
// Setup: Tasker → AutoRemote plugin → JARVIS sends commands
// FREE: Tasker (₹350 one-time) or use via AutoApps
// ══════════════════════════════════════════════════════════════

// ─── TASKER COMMAND REGISTRY ──────────────────────────────────
// Each command has: tasker_task name, description, params
export const TASKER_COMMANDS = {

  // ── System Controls ──────────────────────────────────────────
  wifi_on:       { task: 'JarvisWifiOn',      desc: 'WiFi ON karo',            icon: '📶' },
  wifi_off:      { task: 'JarvisWifiOff',     desc: 'WiFi OFF karo',           icon: '📶' },
  bt_on:         { task: 'JarvisBtOn',        desc: 'Bluetooth ON',            icon: '🔵' },
  bt_off:        { task: 'JarvisBtOff',       desc: 'Bluetooth OFF',           icon: '🔵' },
  torch_on:      { task: 'JarvisTorchOn',     desc: 'Torch ON',                icon: '🔦' },
  torch_off:     { task: 'JarvisTorchOff',    desc: 'Torch OFF',               icon: '🔦' },
  dnd_on:        { task: 'JarvisDndOn',       desc: 'Do Not Disturb ON',       icon: '🔕' },
  dnd_off:       { task: 'JarvisDndOff',      desc: 'DND OFF',                 icon: '🔔' },
  screenshot:    { task: 'JarvisScreenshot',  desc: 'Screenshot lo',           icon: '📸' },
  lock:          { task: 'JarvisLock',        desc: 'Phone lock karo',         icon: '🔒' },
  volume_max:    { task: 'JarvisVolumeMax',   desc: 'Volume MAX karo',         icon: '🔊' },
  volume_zero:   { task: 'JarvisVolumeZero',  desc: 'Volume mute karo',        icon: '🔇' },
  volume_50:     { task: 'JarvisVolume50',    desc: 'Volume 50% karo',         icon: '🔉' },
  airplane_on:   { task: 'JarvisAirplaneOn',  desc: 'Airplane mode ON',        icon: '✈️' },
  airplane_off:  { task: 'JarvisAirplaneOff', desc: 'Airplane mode OFF',       icon: '✈️' },
  hotspot_on:    { task: 'JarvisHotspotOn',   desc: 'Hotspot ON karo',         icon: '📡' },
  hotspot_off:   { task: 'JarvisHotspotOff',  desc: 'Hotspot OFF karo',        icon: '📡' },
  brightness_max:{ task: 'JarvisBrightnessMax',desc: 'Brightness MAX',         icon: '☀️' },
  brightness_min:{ task: 'JarvisBrightnessMin',desc: 'Brightness MIN',         icon: '🌑' },
  auto_rotate_on:{ task: 'JarvisRotateOn',    desc: 'Auto-rotate ON',          icon: '🔄' },

  // ── App Launchers ─────────────────────────────────────────────
  open_camera:   { task: 'JarvisOpenCamera',  desc: 'Camera kholo',            icon: '📷' },
  open_gallery:  { task: 'JarvisOpenGallery', desc: 'Gallery kholo',           icon: '🖼️' },
  open_chrome:   { task: 'JarvisOpenChrome',  desc: 'Chrome kholo',            icon: '🌐' },
  open_maps:     { task: 'JarvisOpenMaps',    desc: 'Maps kholo',              icon: '🗺️' },
  open_contacts: { task: 'JarvisOpenContacts',desc: 'Contacts kholo',          icon: '👥' },

  // ── Smart Automations ─────────────────────────────────────────
  study_mode:    { task: 'JarvisStudyMode',   desc: 'Study mode: DND + brightness min + timer', icon: '📚' },
  sleep_mode:    { task: 'JarvisSleepMode',   desc: 'Sleep mode: DND + dim + wifi off', icon: '🌙' },
  drive_mode:    { task: 'JarvisDriveMode',   desc: 'Drive mode: Bluetooth + maps + DND', icon: '🚗' },
  gym_mode:      { task: 'JarvisGymMode',     desc: 'Gym mode: Music + DND + timer', icon: '💪' },

  // ── Custom text/notification send ─────────────────────────────
  notify:        { task: 'JarvisNotify',      desc: 'Custom notification bhejo', icon: '🔔', hasParam: true },
  speak:         { task: 'JarvisSpeak',       desc: 'Phone se bolwao',          icon: '🗣️', hasParam: true },
  clipboard_set: { task: 'JarvisClipboard',   desc: 'Clipboard mein copy karo', icon: '📋', hasParam: true },
};

// ─── INTENT → TASKER COMMAND MAPPING ─────────────────────────
const INTENT_TO_TASKER = [
  { pattern: /wifi.*on|on.*wifi|wifi.*chalu/i,           cmd: 'wifi_on' },
  { pattern: /wifi.*off|off.*wifi|wifi.*band/i,          cmd: 'wifi_off' },
  { pattern: /bluetooth.*on|bt.*on|bluetooth.*chalu/i,   cmd: 'bt_on' },
  { pattern: /bluetooth.*off|bt.*off|bluetooth.*band/i,  cmd: 'bt_off' },
  { pattern: /torch|flashlight|light.*on/i,              cmd: 'torch_on' },
  { pattern: /torch.*off|light.*off/i,                   cmd: 'torch_off' },
  { pattern: /dnd|do not disturb|silent.*mode|mode.*silent/i, cmd: 'dnd_on' },
  { pattern: /dnd.*off|disturb.*on|sound.*on/i,          cmd: 'dnd_off' },
  { pattern: /screenshot|screen.*capture/i,              cmd: 'screenshot' },
  { pattern: /phone.*lock|screen.*lock/i,                cmd: 'lock' },
  { pattern: /volume.*max|volume.*zyada|loud/i,          cmd: 'volume_max' },
  { pattern: /mute|volume.*zero|volume.*0/i,             cmd: 'volume_zero' },
  { pattern: /airplane|flight.*mode/i,                   cmd: 'airplane_on' },
  { pattern: /hotspot.*on|hotspot.*chalu/i,              cmd: 'hotspot_on' },
  { pattern: /hotspot.*off|hotspot.*band/i,              cmd: 'hotspot_off' },
  { pattern: /study.*mode|padhai.*mode/i,                cmd: 'study_mode' },
  { pattern: /sleep.*mode|so.*ja.*mode/i,                cmd: 'sleep_mode' },
  { pattern: /drive.*mode|gaadi.*mode/i,                 cmd: 'drive_mode' },
  { pattern: /gym.*mode/i,                               cmd: 'gym_mode' },
  { pattern: /camera.*khol/i,                            cmd: 'open_camera' },
  { pattern: /brightness.*max|bright.*zyada/i,           cmd: 'brightness_max' },
  { pattern: /brightness.*min|bright.*kam/i,             cmd: 'brightness_min' },
];

export function detectTaskerCommand(text) {
  for (const { pattern, cmd } of INTENT_TO_TASKER) {
    if (pattern.test(text)) return cmd;
  }
  return null;
}

// ─── SEND COMMAND VIA MACRODROID WEBHOOK (same bridge) ────────
// Both MacroDroid and Tasker can be wired to same webhook
export async function sendTaskerCommand(cmdKey, param = '', deviceId) {
  const cmd = TASKER_COMMANDS[cmdKey];
  if (!cmd || !deviceId) return { ok: false, error: 'No command or device ID' };

  const taskName = cmd.task;
  const url = `https://trigger.macrodroid.com/${deviceId}/${taskName.toLowerCase()}${param ? `?param=${encodeURIComponent(param)}` : ''}`;

  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });
    return { ok: r.ok, task: taskName, cmd: cmdKey };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ─── GENERATE TASKER SETUP INSTRUCTIONS ───────────────────────
export function getTaskerSetupSteps(cmd) {
  const command = TASKER_COMMANDS[cmd];
  if (!command) return [];

  return [
    `1. Tasker kholo → Tasks → + (new task)`,
    `2. Task name: "${command.task}" (exactly yahi naam)`,
    `3. Action add karo: Net → WiFi → set On/Off (ya jo action chahiye)`,
    `4. Save karo`,
    `5. Profile → + → Event → Plugin → AutoRemote → "Message Received"`,
    `6. Message filter: "${command.task.toLowerCase()}"`,
    `7. Task select: "${command.task}"`,
    `8. Bas! JARVIS se "${command.desc}" bolne pe kaam karega`,
  ];
}
