// lib/automation/macro-bridge.js
// ═══════════════════════════════════════════════════════════════
// JARVIS v10.8 — Complete MacroDroid + Tasker Automation Bridge
// Maximum phone control — every possible action
// Primary: MacroDroid | Alternative: Tasker | Fallback: Deep Links
// ═══════════════════════════════════════════════════════════════

// ─── MACRODROID WEBHOOK SENDER ───────────────────────────────
export async function sendMacroDroid(trigger, payload = {}) {
  const deviceId = (typeof localStorage !== 'undefined')
    ? localStorage.getItem('macrodroid_device_id') || ''
    : '';

  if (!deviceId) {
    console.warn('JARVIS: MacroDroid Device ID not set. Go to Phone Control → Settings.');
    return { error: 'no_device_id' };
  }

  const url = `https://trigger.macrodroid.com/${deviceId}/${trigger}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'jarvis', ...payload }),
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { error: 'network_failed' };
  }
}

// ─── TASKER HTTP SENDER (Alternative) ────────────────────────
export async function sendTasker(action, payload = {}) {
  const taskerPort = (typeof localStorage !== 'undefined')
    ? localStorage.getItem('tasker_port') || '1821'
    : '1821';
  const taskerIp = (typeof localStorage !== 'undefined')
    ? localStorage.getItem('tasker_ip') || '192.168.1.1'
    : '192.168.1.1';

  try {
    const url = `http://${taskerIp}:${taskerPort}/action`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
      signal: AbortSignal.timeout(3000),
    });
    return { ok: res.ok };
  } catch {
    return { error: 'tasker_unreachable' };
  }
}

// Smart sender — MacroDroid pehle, Tasker fallback
async function automate(trigger, payload = {}) {
  const md = await sendMacroDroid(trigger, payload);
  if (md.ok) return md;
  const tk = await sendTasker(trigger, payload);
  if (tk.ok) return tk;
  return { error: 'all_automation_failed', trigger };
}

// ═══════════════════════════════════════════════════════════════
// 1. NETWORK CONTROL
// ═══════════════════════════════════════════════════════════════
export const Network = {
  wifiOn:       () => automate('jarvis_wifi_on'),
  wifiOff:      () => automate('jarvis_wifi_off'),
  wifiToggle:   () => automate('jarvis_wifi_toggle'),
  bluetoothOn:  () => automate('jarvis_bt_on'),
  bluetoothOff: () => automate('jarvis_bt_off'),
  btToggle:     () => automate('jarvis_bt_toggle'),
  hotspotOn:    () => automate('jarvis_hotspot_on'),
  hotspotOff:   () => automate('jarvis_hotspot_off'),
  airplaneOn:   () => automate('jarvis_airplane_on'),
  airplaneOff:  () => automate('jarvis_airplane_off'),
  nfcOn:        () => automate('jarvis_nfc_on'),
  nfcOff:       () => automate('jarvis_nfc_off'),
  dataOn:       () => automate('jarvis_data_on'),
  dataOff:      () => automate('jarvis_data_off'),
  connectWifi:  (ssid, password) => automate('jarvis_connect_wifi', { ssid, password }),
};

// ═══════════════════════════════════════════════════════════════
// 2. VOLUME & AUDIO
// ═══════════════════════════════════════════════════════════════
export const Volume = {
  up:       () => automate('jarvis_volume_up'),
  down:     () => automate('jarvis_volume_down'),
  mute:     () => automate('jarvis_mute'),
  unmute:   () => automate('jarvis_unmute'),
  max:      () => automate('jarvis_volume_max'),
  set:    (level) => automate('jarvis_volume_set', { level }), // 0-100
  ringerOn:  () => automate('jarvis_ringer_on'),
  ringerOff: () => automate('jarvis_ringer_off'),
  vibrateMode: () => automate('jarvis_vibrate_mode'),
  playMedia:   () => automate('jarvis_play'),
  pauseMedia:  () => automate('jarvis_pause'),
  nextTrack:   () => automate('jarvis_next'),
  prevTrack:   () => automate('jarvis_prev'),
};

// ═══════════════════════════════════════════════════════════════
// 3. DISPLAY & SYSTEM
// ═══════════════════════════════════════════════════════════════
export const Display = {
  brightnessUp:    () => automate('jarvis_brightness_up'),
  brightnessDown:  () => automate('jarvis_brightness_down'),
  brightnessSet: (level) => automate('jarvis_brightness_set', { level }), // 0-100
  brightnessMax:   () => automate('jarvis_brightness_max'),
  brightnessMin:   () => automate('jarvis_brightness_min'),
  autoBrightness:  () => automate('jarvis_auto_brightness'),
  screenOn:        () => automate('jarvis_screen_on'),
  screenOff:       () => automate('jarvis_screen_off'),
  lockPhone:       () => automate('jarvis_lock'),
  keepOn:          () => automate('jarvis_keep_screen_on'),
  darkModeOn:      () => automate('jarvis_dark_mode_on'),
  darkModeOff:     () => automate('jarvis_dark_mode_off'),
  rotateLock:      () => automate('jarvis_rotate_lock'),
  rotateAuto:      () => automate('jarvis_rotate_auto'),
};

// ═══════════════════════════════════════════════════════════════
// 4. APPS & LAUNCHER
// ═══════════════════════════════════════════════════════════════
export const Apps = {
  open:       (appPackage) => automate('jarvis_open_app', { package: appPackage }),
  openByName: (appName)    => automate('jarvis_open_by_name', { name: appName }),
  close:      (appPackage) => automate('jarvis_close_app', { package: appPackage }),
  killAll:    () => automate('jarvis_kill_all_apps'),
  recentApps: () => automate('jarvis_recent_apps'),
  homeScreen: () => automate('jarvis_go_home'),
  backButton: () => automate('jarvis_back'),
  notifShade: () => automate('jarvis_notifications_shade'),
  settings:   () => automate('jarvis_open_settings'),
  getInstalledApps: () => automate('jarvis_get_apps'), // returns list via webhook

  // Popular apps shortcuts
  youtube:    () => automate('jarvis_open_youtube'),
  whatsapp:   () => automate('jarvis_open_whatsapp'),
  instagram:  () => automate('jarvis_open_instagram'),
  telegram:   () => automate('jarvis_open_telegram'),
  spotify:    () => automate('jarvis_open_spotify'),
  youtube_music: () => automate('jarvis_open_ytmusic'),
  maps:       () => automate('jarvis_open_maps'),
  camera:     () => automate('jarvis_open_camera'),
  gallery:    () => automate('jarvis_open_gallery'),
  chrome:     () => automate('jarvis_open_chrome'),
  gmail:      () => automate('jarvis_open_gmail'),
  clock:      () => automate('jarvis_open_clock'),
  calculator: () => automate('jarvis_open_calculator'),
  files:      () => automate('jarvis_open_files'),
};

// ═══════════════════════════════════════════════════════════════
// 5. NOTIFICATIONS — READ + CONTROL ← NEW POWERFUL FEATURE
// ═══════════════════════════════════════════════════════════════
export const Notifications = {
  // Request MacroDroid to send all current notifications to JARVIS webhook
  getAll:      () => automate('jarvis_get_notifications'),
  // Clear all notifications
  clearAll:    () => automate('jarvis_clear_notifications'),
  // Clear specific app notifications
  clearApp:  (appPackage) => automate('jarvis_clear_app_notifs', { package: appPackage }),
  // Get notifications from specific app
  getFromApp:(appName)    => automate('jarvis_get_notifs_from', { app: appName }),
  // DND
  dndOn:     (until)  => automate('jarvis_dnd_on',  { until }),
  dndOff:    ()       => automate('jarvis_dnd_off'),
  // Enable notification listener (setup in MacroDroid once)
  enableListener: () => automate('jarvis_enable_notif_listener'),
};

// ═══════════════════════════════════════════════════════════════
// 6. WHATSAPP CONTROL ← MOST POWERFUL NEW FEATURE
// ═══════════════════════════════════════════════════════════════
export const WhatsApp = {
  // Send WhatsApp message via MacroDroid
  send: (number, message) => automate('jarvis_whatsapp_send', {
    number: number.replace(/\D/g, ''),
    message,
  }),

  // Auto-reply to last WhatsApp notification
  // MacroDroid: Notification Trigger → POST to JARVIS → JARVIS AI → POST back → MacroDroid reply
  setupAutoReply: () => automate('jarvis_whatsapp_autoreply_setup'),

  // Read last N WhatsApp messages (via MacroDroid notification log)
  readMessages: (n = 10) => automate('jarvis_whatsapp_read', { count: n }),

  // Open specific chat
  openChat: (number) => automate('jarvis_whatsapp_open_chat', { number }),

  // Send voice note (TTS → audio file → WhatsApp)
  sendVoice: (number, text) => automate('jarvis_whatsapp_voice', { number, text }),
};

// ═══════════════════════════════════════════════════════════════
// 7. PHONE CALLS & SMS
// ═══════════════════════════════════════════════════════════════
export const Calls = {
  call:         (number) => automate('jarvis_call', { number }),
  endCall:      ()       => automate('jarvis_end_call'),
  rejectCall:   ()       => automate('jarvis_reject_call'),
  acceptCall:   ()       => automate('jarvis_accept_call'),
  getCallLog:   (n = 10) => automate('jarvis_get_calllog', { count: n }),
  getLastCall:  ()       => automate('jarvis_last_call'),
  // Speakerphone
  speakerOn:    ()       => automate('jarvis_speaker_on'),
  speakerOff:   ()       => automate('jarvis_speaker_off'),
};

export const SMS = {
  send:     (number, message) => automate('jarvis_sms_send', { number, message }),
  readLast: (n = 10)          => automate('jarvis_sms_read', { count: n }),
  readFrom: (number)          => automate('jarvis_sms_from', { number }),
};

// ═══════════════════════════════════════════════════════════════
// 8. CONTACTS
// ═══════════════════════════════════════════════════════════════
export const Contacts = {
  search:   (name)   => automate('jarvis_contact_search', { name }),
  getPhone: (name)   => automate('jarvis_contact_phone', { name }),
  getAll:   ()       => automate('jarvis_contacts_all'),
  // Fallback: Web Contact Picker API (no MacroDroid needed)
  pickNative: async () => {
    const { pickContacts } = await import('@/lib/phone/native-apis').catch(() => ({}));
    return pickContacts ? pickContacts({ multiple: false }) : { error: 'not_available' };
  },
};

// ═══════════════════════════════════════════════════════════════
// 9. REMINDERS & ALARMS
// ═══════════════════════════════════════════════════════════════
export const Reminders = {
  // Create reminder via MacroDroid
  set: (title, time, date) => automate('jarvis_reminder_set', { title, time, date }),
  // Create alarm
  alarm: (hour, minute, label) => automate('jarvis_alarm_set', { hour, minute, label }),
  // Timer
  timer: (minutes) => automate('jarvis_timer', { minutes }),
  // Delete reminder
  delete: (id) => automate('jarvis_reminder_delete', { id }),
  // Get all reminders
  getAll: () => automate('jarvis_reminders_all'),
  // Calendar event
  createEvent: (title, datetime, duration) => automate('jarvis_calendar_event', { title, datetime, duration }),
};

// ═══════════════════════════════════════════════════════════════
// 10. TORCH & HARDWARE
// ═══════════════════════════════════════════════════════════════
export const Hardware = {
  torchOn:     () => automate('jarvis_torch_on'),
  torchOff:    () => automate('jarvis_torch_off'),
  torchToggle: () => automate('jarvis_torch_toggle'),
  screenshot:  () => automate('jarvis_screenshot'),
  screenRecord:(start) => automate(start ? 'jarvis_screen_record_start' : 'jarvis_screen_record_stop'),
  cameraFront: () => automate('jarvis_camera_front'),
  cameraBack:  () => automate('jarvis_camera_back'),
  takeSelfie:  () => automate('jarvis_selfie'),
  getBattery:  () => automate('jarvis_get_battery'),
  getStorage:  () => automate('jarvis_get_storage'),
  getRAM:      () => automate('jarvis_get_ram'),
  reboot:      () => automate('jarvis_reboot'),  // root only
  shutdown:    () => automate('jarvis_shutdown'), // root only
};

// ═══════════════════════════════════════════════════════════════
// 11. SMART MODES ← Enhanced
// ═══════════════════════════════════════════════════════════════
export const SmartModes = {
  work: async () => {
    await Network.wifiOn();
    await Display.brightnessSet(70);
    await Notifications.dndOff();
    return automate('jarvis_workmode');
  },
  study: async () => {
    await Volume.mute();
    await Display.brightnessMin();
    await Notifications.dndOn();
    await Apps.open('com.google.android.apps.docs'); // Google Docs
    return automate('jarvis_studymode');
  },
  sleep: async () => {
    await Volume.mute();
    await Display.brightnessMin();
    await Network.wifiOff();
    await Notifications.dndOn();
    await Display.darkModeOn();
    return automate('jarvis_sleepmode');
  },
  drive: async () => {
    await Network.bluetoothOn();
    await Volume.max();
    await Apps.maps();
    await Notifications.dndOn();
    return automate('jarvis_drivemode');
  },
  gym: async () => {
    await Apps.spotify();
    await Volume.max();
    await Notifications.dndOn();
    return automate('jarvis_gymmode');
  },
  movie: async () => {
    await Display.brightnessMax();
    await Notifications.dndOn();
    await Display.rotateLock();
    return automate('jarvis_moviemode');
  },
  gaming: async () => {
    await Volume.max();
    await Display.brightnessMax();
    await Network.wifiOn();
    await Notifications.dndOn();
    return automate('jarvis_gamingmode');
  },
  meeting: async () => {
    await Volume.vibrateMode();
    await Notifications.dndOn();
    return automate('jarvis_meetingmode');
  },
  custom: (name, actions) => automate(`jarvis_mode_${name}`, { actions }),
};

// ═══════════════════════════════════════════════════════════════
// 12. FILES & MEDIA
// ═══════════════════════════════════════════════════════════════
export const Files = {
  search:      (query)  => automate('jarvis_file_search', { query }),
  open:        (path)   => automate('jarvis_file_open', { path }),
  delete:      (path)   => automate('jarvis_file_delete', { path }),
  share:       (path)   => automate('jarvis_file_share', { path }),
  listDir:     (dir)    => automate('jarvis_list_dir', { dir }),
  getRecent:   ()       => automate('jarvis_recent_files'),
  getDownloads:()       => automate('jarvis_get_downloads'),
};

// ═══════════════════════════════════════════════════════════════
// 13. DEVICE INFO
// ═══════════════════════════════════════════════════════════════
export const DeviceInfo = {
  getBattery:     () => automate('jarvis_get_battery'),
  getStorage:     () => automate('jarvis_get_storage'),
  getRAM:         () => automate('jarvis_get_ram'),
  getWifiNetwork: () => automate('jarvis_get_wifi_name'),
  getIPAddress:   () => automate('jarvis_get_ip'),
  getLocation:    () => automate('jarvis_get_location'),
  getAllInfo:      () => automate('jarvis_device_info'),
};

// ═══════════════════════════════════════════════════════════════
// 14. WHATSAPP AUTO-REPLY SYSTEM
// Complete flow: WA notification → MacroDroid → JARVIS AI → reply back
// ═══════════════════════════════════════════════════════════════
export const AutoReply = {
  // Enable auto-reply (MacroDroid setup in phone)
  enable:  () => automate('jarvis_autoreply_on'),
  disable: () => automate('jarvis_autoreply_off'),

  // Set custom reply for specific contact
  setForContact: (contact, reply) => automate('jarvis_autoreply_set', { contact, reply }),

  // Enable AI auto-reply (JARVIS generates reply)
  enableAI: async () => {
    // Store in localStorage so incoming MacroDroid webhooks know to use AI
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('jarvis_autoreply_ai', 'true');
    }
    return automate('jarvis_autoreply_ai_on');
  },

  // Process incoming message (called when MacroDroid sends notification to JARVIS)
  processIncoming: async (sender, message, app = 'whatsapp') => {
    const aiEnabled = typeof localStorage !== 'undefined'
      ? localStorage.getItem('jarvis_autoreply_ai') === 'true'
      : false;

    if (!aiEnabled) return null;

    // Generate AI reply
    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `Tu JARVIS hai. "${sender}" ne ${app} pe message bheja hai. 
Ek short, natural reply do jo Pranshu ki taraf se bhejne layak ho. 
Hinglish/Hindi mein reply karo agar message Hindi mein hai. 
Max 2 sentences. Formal nahi, dost jaisa.`,
            },
            { role: 'user', content: message },
          ],
        }),
      });

      let reply = '';
      const reader = res.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const d = JSON.parse(line.slice(6));
                if (d.text) reply += d.text;
              } catch {}
            }
          }
        }
      }

      if (reply.trim()) {
        // Send reply back via MacroDroid
        if (app === 'whatsapp') await WhatsApp.send('', reply.trim());
        else if (app === 'sms') await SMS.send('', reply.trim());
        return reply.trim();
      }
    } catch {}
    return null;
  },
};

// ═══════════════════════════════════════════════════════════════
// 15. AI COMMAND PARSER
// Voice/text command → correct automation action
// ═══════════════════════════════════════════════════════════════
export async function parseAndExecuteCommand(command) {
  const cmd = command.toLowerCase().trim();
  const results = [];

  // Network
  if (cmd.includes('wifi on') || cmd.includes('वाईफाई चालू')) { results.push(await Network.wifiOn()); }
  else if (cmd.includes('wifi off') || cmd.includes('वाईफाई बंद')) { results.push(await Network.wifiOff()); }
  else if (cmd.includes('bluetooth on') || cmd.includes('ब्लूटूथ चालू')) { results.push(await Network.bluetoothOn()); }
  else if (cmd.includes('bluetooth off') || cmd.includes('ब्लूटूथ बंद')) { results.push(await Network.bluetoothOff()); }
  else if (cmd.includes('hotspot on')) { results.push(await Network.hotspotOn()); }
  else if (cmd.includes('hotspot off')) { results.push(await Network.hotspotOff()); }

  // Volume
  else if (cmd.includes('volume up') || cmd.includes('आवाज़ बढ़ाओ')) { results.push(await Volume.up()); }
  else if (cmd.includes('volume down') || cmd.includes('आवाज़ कम')) { results.push(await Volume.down()); }
  else if (cmd.includes('mute') || cmd.includes('बंद कर आवाज़')) { results.push(await Volume.mute()); }
  else if (cmd.includes('unmute') || cmd.includes('आवाज़ चालू')) { results.push(await Volume.unmute()); }

  // Display
  else if (cmd.includes('torch on') || cmd.includes('flashlight on') || cmd.includes('टॉर्च चालू')) { results.push(await Hardware.torchOn()); }
  else if (cmd.includes('torch off') || cmd.includes('flashlight off') || cmd.includes('टॉर्च बंद')) { results.push(await Hardware.torchOff()); }
  else if (cmd.includes('brightness') && cmd.includes('max')) { results.push(await Display.brightnessMax()); }
  else if (cmd.includes('brightness') && (cmd.includes('min') || cmd.includes('low'))) { results.push(await Display.brightnessMin()); }
  else if (cmd.includes('screen off') || cmd.includes('lock phone') || cmd.includes('फोन लॉक')) { results.push(await Display.lockPhone()); }
  else if (cmd.includes('dark mode on') || cmd.includes('डार्क मोड')) { results.push(await Display.darkModeOn()); }

  // Apps
  else if (cmd.includes('youtube') || cmd.includes('यूट्यूब')) { results.push(await Apps.youtube()); }
  else if (cmd.includes('whatsapp') || cmd.includes('व्हाट्सएप')) { results.push(await Apps.whatsapp()); }
  else if (cmd.includes('instagram')) { results.push(await Apps.instagram()); }
  else if (cmd.includes('camera') || cmd.includes('कैमरा')) { results.push(await Apps.camera()); }
  else if (cmd.includes('spotify')) { results.push(await Apps.spotify()); }
  else if (cmd.includes('maps') || cmd.includes('नेविगेशन')) { results.push(await Apps.maps()); }
  else if (cmd.includes('settings') || cmd.includes('सेटिंग')) { results.push(await Apps.settings()); }
  else if (cmd.includes('screenshot') || cmd.includes('स्क्रीनशॉट')) { results.push(await Hardware.screenshot()); }

  // Modes
  else if (cmd.includes('study mode') || cmd.includes('स्टडी मोड')) { results.push(await SmartModes.study()); }
  else if (cmd.includes('sleep mode') || cmd.includes('नींद')) { results.push(await SmartModes.sleep()); }
  else if (cmd.includes('drive mode') || cmd.includes('ड्राइव')) { results.push(await SmartModes.drive()); }
  else if (cmd.includes('gym mode')) { results.push(await SmartModes.gym()); }
  else if (cmd.includes('movie mode') || cmd.includes('movie')) { results.push(await SmartModes.movie()); }
  else if (cmd.includes('gaming mode') || cmd.includes('gaming')) { results.push(await SmartModes.gaming()); }
  else if (cmd.includes('meeting mode')) { results.push(await SmartModes.meeting()); }
  else if (cmd.includes('work mode')) { results.push(await SmartModes.work()); }

  // Reminders
  else if (cmd.includes('reminder') || cmd.includes('याद दिला') || cmd.includes('alarm') || cmd.includes('अलार्म')) {
    // Parse time from command
    const timeMatch = cmd.match(/(\d{1,2})[:\s]?(\d{2})?\s*(am|pm|बजे)?/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      const min = parseInt(timeMatch[2] || '0');
      if (timeMatch[3] === 'pm' && hour < 12) hour += 12;
      results.push(await Reminders.alarm(hour, min, command));
    }
  }

  // Contacts
  else if (cmd.includes('call') || cmd.includes('फोन करो')) {
    const contactMatch = cmd.match(/call\s+(.+?)(?:\s+ka|$)/i) || cmd.match(/(.+?)\s+ko\s+call/i);
    if (contactMatch) results.push(await Contacts.search(contactMatch[1]));
  }

  // WhatsApp message
  else if ((cmd.includes('whatsapp') || cmd.includes('message')) && (cmd.includes('send') || cmd.includes('bhejo'))) {
    const match = cmd.match(/(?:send|bhejo)\s+(?:to\s+)?(.+?)\s+(?:message|ko|that)\s+(.+)/i);
    if (match) results.push(await WhatsApp.send(match[1], match[2]));
  }

  // Notifications
  else if (cmd.includes('notification') || cmd.includes('notif')) {
    if (cmd.includes('clear')) results.push(await Notifications.clearAll());
    else if (cmd.includes('read') || cmd.includes('show') || cmd.includes('dikhao')) results.push(await Notifications.getAll());
  }

  // Device info
  else if (cmd.includes('battery') || cmd.includes('बैटरी')) { results.push(await DeviceInfo.getBattery()); }
  else if (cmd.includes('storage')) { results.push(await DeviceInfo.getStorage()); }

  if (results.length === 0) return { executed: false, command };
  return { executed: true, results };
}

// ─── MACRODROID SETUP TEMPLATES ──────────────────────────────
export const MACRODROID_TEMPLATES = {
  notificationReader: {
    name: 'JARVIS — Notification Reader',
    trigger: 'Notification Received (from any app)',
    actions: [
      'HTTP POST to: https://apple-v10.vercel.app/api/phone/notification',
      'Body: {"app":"{app_name}","title":"{notif_title}","text":"{notif_text}","time":"{time}"}',
    ],
  },
  whatsappAutoReply: {
    name: 'JARVIS — WhatsApp Auto Reply',
    trigger: 'Notification Received from WhatsApp',
    actions: [
      'HTTP POST to: https://apple-v10.vercel.app/api/phone/autoreply',
      'Body: {"sender":"{notif_title}","message":"{notif_text}","app":"whatsapp"}',
      'Wait for response',
      'If response.reply exists → Reply to notification with response.reply',
    ],
  },
  callHandler: {
    name: 'JARVIS — Call Handler',
    trigger: 'Incoming Call',
    actions: [
      'HTTP POST to: https://apple-v10.vercel.app/api/phone/call',
      'Body: {"type":"incoming","number":"{phone_number}","name":"{contact_name}"}',
    ],
  },
  batteryAlert: {
    name: 'JARVIS — Battery Alert',
    trigger: 'Battery < 20%',
    actions: [
      'HTTP POST to: https://apple-v10.vercel.app/api/phone/battery',
      'Body: {"level":"{battery_level}","charging":"{is_charging}"}',
    ],
  },
  wakeWord: {
    name: 'JARVIS — Wake Word Trigger',
    trigger: 'Say "Hey JARVIS"',
    actions: [
      'Open URL: https://apple-v10.vercel.app/chat?voice=1',
    ],
  },
};

// ─── ALL ACTIONS LIST (for UI display) ───────────────────────
export const ALL_ACTIONS = [
  // Network
  { id: 'wifi_on',      label: 'WiFi On',        icon: '📶', category: 'Network',   fn: Network.wifiOn },
  { id: 'wifi_off',     label: 'WiFi Off',        icon: '📵', category: 'Network',   fn: Network.wifiOff },
  { id: 'bt_on',        label: 'Bluetooth On',    icon: '🔵', category: 'Network',   fn: Network.bluetoothOn },
  { id: 'bt_off',       label: 'Bluetooth Off',   icon: '⚪', category: 'Network',   fn: Network.bluetoothOff },
  { id: 'hotspot_on',   label: 'Hotspot On',      icon: '📡', category: 'Network',   fn: Network.hotspotOn },
  { id: 'hotspot_off',  label: 'Hotspot Off',     icon: '📡', category: 'Network',   fn: Network.hotspotOff },
  { id: 'data_on',      label: 'Mobile Data On',  icon: '📱', category: 'Network',   fn: Network.dataOn },
  { id: 'airplane_on',  label: 'Airplane Mode',   icon: '✈️', category: 'Network',   fn: Network.airplaneOn },
  // Volume
  { id: 'vol_up',       label: 'Volume Up',       icon: '🔊', category: 'Volume',    fn: Volume.up },
  { id: 'vol_down',     label: 'Volume Down',      icon: '🔉', category: 'Volume',    fn: Volume.down },
  { id: 'mute',         label: 'Mute',             icon: '🔇', category: 'Volume',    fn: Volume.mute },
  { id: 'vibrate',      label: 'Vibrate Mode',     icon: '📳', category: 'Volume',    fn: Volume.vibrateMode },
  { id: 'play',         label: 'Play Media',       icon: '▶️', category: 'Volume',    fn: Volume.playMedia },
  { id: 'pause',        label: 'Pause Media',      icon: '⏸️', category: 'Volume',    fn: Volume.pauseMedia },
  // Display
  { id: 'bright_max',   label: 'Brightness Max',  icon: '☀️', category: 'Display',   fn: Display.brightnessMax },
  { id: 'bright_min',   label: 'Brightness Min',  icon: '🌑', category: 'Display',   fn: Display.brightnessMin },
  { id: 'dark_on',      label: 'Dark Mode',        icon: '🌙', category: 'Display',   fn: Display.darkModeOn },
  { id: 'lock',         label: 'Lock Phone',       icon: '🔒', category: 'Display',   fn: Display.lockPhone },
  { id: 'screen_off',   label: 'Screen Off',       icon: '📲', category: 'Display',   fn: Display.screenOff },
  // Hardware
  { id: 'torch_on',     label: 'Torch On',         icon: '🔦', category: 'Hardware',  fn: Hardware.torchOn },
  { id: 'torch_off',    label: 'Torch Off',        icon: '💡', category: 'Hardware',  fn: Hardware.torchOff },
  { id: 'screenshot',   label: 'Screenshot',       icon: '📸', category: 'Hardware',  fn: Hardware.screenshot },
  { id: 'selfie',       label: 'Take Selfie',      icon: '🤳', category: 'Hardware',  fn: Hardware.takeSelfie },
  { id: 'battery',      label: 'Battery Info',     icon: '🔋', category: 'Hardware',  fn: DeviceInfo.getBattery },
  // Apps
  { id: 'youtube',      label: 'YouTube',          icon: '▶️', category: 'Apps',      fn: Apps.youtube },
  { id: 'whatsapp',     label: 'WhatsApp',         icon: '💬', category: 'Apps',      fn: Apps.whatsapp },
  { id: 'instagram',    label: 'Instagram',        icon: '📷', category: 'Apps',      fn: Apps.instagram },
  { id: 'spotify',      label: 'Spotify',          icon: '🎵', category: 'Apps',      fn: Apps.spotify },
  { id: 'maps',         label: 'Maps',             icon: '🗺️', category: 'Apps',      fn: Apps.maps },
  { id: 'camera',       label: 'Camera',           icon: '📷', category: 'Apps',      fn: Apps.camera },
  { id: 'settings',     label: 'Settings',         icon: '⚙️', category: 'Apps',      fn: Apps.settings },
  { id: 'home',         label: 'Home Screen',      icon: '🏠', category: 'Apps',      fn: Apps.homeScreen },
  // Smart Modes
  { id: 'study_mode',   label: 'Study Mode',       icon: '📚', category: 'Modes',     fn: SmartModes.study },
  { id: 'sleep_mode',   label: 'Sleep Mode',       icon: '😴', category: 'Modes',     fn: SmartModes.sleep },
  { id: 'drive_mode',   label: 'Drive Mode',       icon: '🚗', category: 'Modes',     fn: SmartModes.drive },
  { id: 'gym_mode',     label: 'Gym Mode',         icon: '💪', category: 'Modes',     fn: SmartModes.gym },
  { id: 'movie_mode',   label: 'Movie Mode',       icon: '🎬', category: 'Modes',     fn: SmartModes.movie },
  { id: 'gaming_mode',  label: 'Gaming Mode',      icon: '🎮', category: 'Modes',     fn: SmartModes.gaming },
  { id: 'meeting_mode', label: 'Meeting Mode',     icon: '💼', category: 'Modes',     fn: SmartModes.meeting },
  { id: 'work_mode',    label: 'Work Mode',        icon: '🖥️', category: 'Modes',     fn: SmartModes.work },
  // Notifications
  { id: 'notif_all',    label: 'Read Notifications', icon: '🔔', category: 'Notifications', fn: Notifications.getAll },
  { id: 'notif_clear',  label: 'Clear All',          icon: '🗑️', category: 'Notifications', fn: Notifications.clearAll },
  { id: 'dnd_on',       label: 'DND On',             icon: '🚫', category: 'Notifications', fn: Notifications.dndOn },
  { id: 'dnd_off',      label: 'DND Off',            icon: '✅', category: 'Notifications', fn: Notifications.dndOff },
];
