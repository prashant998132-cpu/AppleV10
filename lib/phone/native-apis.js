// lib/phone/native-apis.js
// ═══════════════════════════════════════════════════════════════
// JARVIS v10.8 — Complete Native Web APIs
// Har API browser-native hai — koi native app nahi chahiye
// Primary → Fallback → MacroDroid bridge — ALWAYS
// ═══════════════════════════════════════════════════════════════

// ─── CONTACT PICKER API ──────────────────────────────────────
// Direct phone contacts — Chrome Android 80+, no MacroDroid needed
export async function pickContacts({ multiple = false } = {}) {
  if (typeof navigator === 'undefined') return null;
  if (!('contacts' in navigator) || !('ContactsManager' in window)) {
    return { error: 'contact_picker_unsupported', fallback: 'macrodroid' };
  }
  try {
    const props = ['name', 'tel', 'email'];
    const contacts = await navigator.contacts.select(props, { multiple });
    return { ok: true, contacts };
  } catch (e) {
    return { error: e.name, message: e.message };
  }
}

export async function searchContact(query) {
  const result = await pickContacts({ multiple: false });
  if (result?.contacts?.length > 0) return result.contacts[0];
  return null;
}

// ─── APP BADGING API ─────────────────────────────────────────
// Home screen pe unread count badge — Chrome 81+
export function setBadge(count) {
  if (typeof navigator === 'undefined') return;
  if ('setAppBadge' in navigator) {
    if (count > 0) navigator.setAppBadge(count).catch(() => {});
    else navigator.clearAppBadge().catch(() => {});
  }
}

export function clearBadge() {
  if (typeof navigator !== 'undefined' && 'clearAppBadge' in navigator) {
    navigator.clearAppBadge().catch(() => {});
  }
}

// ─── SCREEN WAKE LOCK API ────────────────────────────────────
// Voice mode mein screen band mat ho — Chrome 84+
let wakeLockSentinel = null;
export async function requestWakeLock() {
  if (typeof navigator === 'undefined') return false;
  if (!('wakeLock' in navigator)) return false;
  try {
    wakeLockSentinel = await navigator.wakeLock.request('screen');
    wakeLockSentinel.addEventListener('release', () => { wakeLockSentinel = null; });
    return true;
  } catch { return false; }
}

export async function releaseWakeLock() {
  if (wakeLockSentinel) {
    await wakeLockSentinel.release().catch(() => {});
    wakeLockSentinel = null;
  }
}

export function isWakeLockActive() { return wakeLockSentinel !== null; }

// ─── VIBRATION API ───────────────────────────────────────────
// Haptic feedback — widely supported
export function vibrate(pattern = 200) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}
// Patterns
export const VIBRATE = {
  tap:      () => vibrate(50),
  success:  () => vibrate([100, 50, 100]),
  error:    () => vibrate([200, 100, 200, 100, 200]),
  notify:   () => vibrate([50, 100, 50]),
  longPress:() => vibrate(400),
  jarvis:   () => vibrate([100, 50, 100, 50, 300]), // JARVIS signature
};

// ─── NETWORK INFORMATION API ─────────────────────────────────
// 2G/3G/4G/WiFi detect karo — quality adaptive
export function getNetworkInfo() {
  if (typeof navigator === 'undefined') return { type: 'unknown', quality: 'high' };
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return { type: 'unknown', quality: 'high' };

  const effectiveType = conn.effectiveType; // '2g' | '3g' | '4g'
  const downlink = conn.downlink;           // Mbps
  const saveData = conn.saveData;

  let quality = 'high';
  if (saveData || effectiveType === '2g') quality = 'low';
  else if (effectiveType === '3g' || downlink < 1) quality = 'medium';

  return { type: effectiveType, downlink, saveData, quality, online: navigator.onLine };
}

export function onNetworkChange(callback) {
  if (typeof window === 'undefined') return () => {};
  const conn = navigator.connection;
  const handler = () => callback(getNetworkInfo());
  if (conn) conn.addEventListener('change', handler);
  window.addEventListener('online',  () => callback({ ...getNetworkInfo(), online: true }));
  window.addEventListener('offline', () => callback({ ...getNetworkInfo(), online: false }));
  return () => {
    if (conn) conn.removeEventListener('change', handler);
  };
}

// ─── MEDIA SESSION API ───────────────────────────────────────
// Lock screen pe JARVIS playback controls dikhao — Chrome 73+
export function setupMediaSession({ title = 'JARVIS AI', artist = 'Personal Assistant', onPlay, onPause, onNext, onPrev } = {}) {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return false;

  navigator.mediaSession.metadata = new MediaMetadata({
    title,
    artist,
    album: 'JARVIS v10.8',
    artwork: [
      { src: '/icons/icon-96.png',  sizes: '96x96',  type: 'image/png' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  });

  if (onPlay)  navigator.mediaSession.setActionHandler('play',  onPlay);
  if (onPause) navigator.mediaSession.setActionHandler('pause', onPause);
  if (onNext)  navigator.mediaSession.setActionHandler('nexttrack',  onNext);
  if (onPrev)  navigator.mediaSession.setActionHandler('previoustrack', onPrev);

  navigator.mediaSession.playbackState = 'playing';
  return true;
}

export function updateMediaSessionState(state = 'playing') {
  if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
    navigator.mediaSession.playbackState = state;
  }
}

// ─── WEB NFC ─────────────────────────────────────────────────
// NFC tag tap → JARVIS action — Chrome Android 89+
export async function readNFC(onRead) {
  if (typeof window === 'undefined' || !('NDEFReader' in window)) {
    return { error: 'nfc_unsupported' };
  }
  try {
    const reader = new NDEFReader();
    await reader.scan();
    reader.addEventListener('reading', ({ message, serialNumber }) => {
      const records = message.records.map(r => ({
        type: r.recordType,
        text: r.recordType === 'text' ? new TextDecoder().decode(r.data) : null,
        url:  r.recordType === 'url'  ? new TextDecoder().decode(r.data) : null,
      }));
      onRead({ serialNumber, records });
    });
    return { ok: true, reader };
  } catch (e) {
    return { error: e.name, message: e.message };
  }
}

export async function writeNFC(text) {
  if (typeof window === 'undefined' || !('NDEFReader' in window)) {
    return { error: 'nfc_unsupported' };
  }
  try {
    const writer = new NDEFReader();
    await writer.write({ records: [{ recordType: 'text', data: text }] });
    return { ok: true };
  } catch (e) {
    return { error: e.name, message: e.message };
  }
}

// NFC Smart Triggers
export const NFC_TRIGGERS = {
  WORK_MODE:  'jarvis:workmode',
  SLEEP_MODE: 'jarvis:sleepmode',
  GYM_MODE:   'jarvis:gymmode',
  DRIVE_MODE: 'jarvis:drivemode',
  STUDY_MODE: 'jarvis:studymode',
};

// ─── SHAPE DETECTION — QR + BARCODE SCANNER ──────────────────
// Chrome Android 83+ (Flag enable karna pad sakta hai older devices pe)
export async function scanBarcode(imageBlob) {
  if (typeof window === 'undefined') return null;
  if (!('BarcodeDetector' in window)) {
    return { error: 'barcode_detector_unsupported', fallback: 'use_camera_file_input' };
  }
  try {
    const detector = new BarcodeDetector({ formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'upc_a'] });
    const barcodes = await detector.detect(imageBlob);
    return { ok: true, barcodes };
  } catch (e) {
    return { error: e.name };
  }
}

export async function scanQRFromCamera() {
  // Creates a video stream, captures frame, scans
  if (typeof navigator === 'undefined') return null;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    const video = document.createElement('video');
    video.srcObject = stream;
    await video.play();

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    stream.getTracks().forEach(t => t.stop());

    const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
    return await scanBarcode(blob);
  } catch (e) {
    return { error: e.name };
  }
}

// ─── FILE SYSTEM ACCESS API ──────────────────────────────────
// Phone files directly read/write — Chrome 86+
export async function openFile({ accept = ['*/*'], multiple = false } = {}) {
  if (typeof window === 'undefined') return null;
  if (!('showOpenFilePicker' in window)) {
    return { error: 'file_system_access_unsupported', fallback: 'use_input_file' };
  }
  try {
    const handles = await window.showOpenFilePicker({
      multiple,
      types: accept === ['*/*'] ? [] : [{ description: 'Files', accept: { '*/*': accept } }],
    });
    const files = await Promise.all(handles.map(h => h.getFile()));
    return { ok: true, files, handles };
  } catch (e) {
    if (e.name === 'AbortError') return { cancelled: true };
    return { error: e.name };
  }
}

export async function saveFile(content, filename = 'jarvis-export.txt', mimeType = 'text/plain') {
  if (typeof window === 'undefined') return false;
  if (!('showSaveFilePicker' in window)) {
    // Fallback: download via anchor
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    return { ok: true, fallback: true };
  }
  try {
    const handle = await window.showSaveFilePicker({ suggestedName: filename });
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
    return { ok: true };
  } catch (e) {
    return { error: e.name };
  }
}

export async function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// ─── PROTOCOL HANDLER ────────────────────────────────────────
// jarvis:// custom URL scheme — register karo once
export function registerProtocolHandler() {
  if (typeof navigator === 'undefined') return false;
  if (!('registerProtocolHandler' in navigator)) return false;
  try {
    navigator.registerProtocolHandler('web+jarvis', '/?intent=%s', 'JARVIS AI');
    return true;
  } catch { return false; }
}

// ─── GEOLOCATION ─────────────────────────────────────────────
export function getLocation(options = {}) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      err => reject(err),
      { timeout: 10000, ...options }
    );
  });
}

// ─── DEVICE ORIENTATION ──────────────────────────────────────
export function onDeviceOrientation(callback) {
  if (typeof window === 'undefined') return () => {};
  const handler = e => callback({ alpha: e.alpha, beta: e.beta, gamma: e.gamma });
  window.addEventListener('deviceorientation', handler);
  return () => window.removeEventListener('deviceorientation', handler);
}

// ─── CLIPBOARD API ───────────────────────────────────────────
export async function readClipboard() {
  if (typeof navigator === 'undefined') return null;
  try {
    const text = await navigator.clipboard.readText();
    return { ok: true, text };
  } catch (e) {
    return { error: e.name };
  }
}

export async function writeClipboard(text) {
  if (typeof navigator === 'undefined') return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch { return false; }
}

// ─── SHARE API ───────────────────────────────────────────────
export async function shareContent({ title, text, url } = {}) {
  if (typeof navigator === 'undefined' || !navigator.share) {
    return { error: 'share_not_supported' };
  }
  try {
    await navigator.share({ title, text, url });
    return { ok: true };
  } catch (e) {
    return { error: e.name };
  }
}

// ─── BATTERY API ─────────────────────────────────────────────
export async function getBatteryInfo() {
  if (typeof navigator === 'undefined') return null;
  if (!('getBattery' in navigator)) return { error: 'not_supported' };
  try {
    const battery = await navigator.getBattery();
    return {
      level:     Math.round(battery.level * 100),
      charging:  battery.charging,
      chargingTime:    battery.chargingTime,
      dischargingTime: battery.dischargingTime,
    };
  } catch { return null; }
}

// ─── BACKGROUND FETCH API ────────────────────────────────────
// Download large files in background — app band ho toh bhi
export async function backgroundFetch(id, urls, options = {}) {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator)) return { error: 'sw_not_supported' };
  try {
    const reg = await navigator.serviceWorker.ready;
    if (!reg.backgroundFetch) return { error: 'background_fetch_not_supported' };
    const bgFetch = await reg.backgroundFetch.fetch(id, urls, {
      title: options.title || 'JARVIS Download',
      icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      downloadTotal: options.downloadTotal,
    });
    return { ok: true, bgFetch };
  } catch (e) {
    return { error: e.name };
  }
}

// ─── PERIODIC BACKGROUND SYNC ────────────────────────────────
// App band ho toh bhi har 24h data refresh — Chrome 80+
export async function registerPeriodicSync(tag = 'jarvis-daily-refresh', minInterval = 24 * 60 * 60 * 1000) {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    if (!reg.periodicSync) return { error: 'periodic_sync_not_supported' };
    const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
    if (status.state !== 'granted') return { error: 'permission_denied' };
    await reg.periodicSync.register(tag, { minInterval });
    return { ok: true };
  } catch (e) {
    return { error: e.name };
  }
}

// ─── DEVICE MEMORY API ───────────────────────────────────────
export function getDeviceMemory() {
  if (typeof navigator === 'undefined') return null;
  return navigator.deviceMemory || null; // GB
}

// ─── SCREEN CAPTURE ──────────────────────────────────────────
export async function startScreenCapture() {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
    return { error: 'screen_capture_not_supported' };
  }
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    return { ok: true, stream };
  } catch (e) {
    return { error: e.name };
  }
}

// ─── ALL APIs SUPPORT CHECK ──────────────────────────────────
export function checkAllAPIs() {
  if (typeof window === 'undefined') return {};
  return {
    contactPicker:       'contacts' in navigator,
    appBadging:          'setAppBadge' in navigator,
    wakeLock:            'wakeLock' in navigator,
    vibration:           'vibrate' in navigator,
    networkInfo:         !!(navigator.connection || navigator.mozConnection),
    mediaSession:        'mediaSession' in navigator,
    webNFC:              'NDEFReader' in window,
    barcodeDetector:     'BarcodeDetector' in window,
    fileSystemAccess:    'showOpenFilePicker' in window,
    protocolHandler:     'registerProtocolHandler' in navigator,
    geolocation:         'geolocation' in navigator,
    clipboard:           'clipboard' in navigator,
    share:               'share' in navigator,
    battery:             'getBattery' in navigator,
    backgroundFetch:     'serviceWorker' in navigator,
    periodicSync:        'serviceWorker' in navigator,
    screenCapture:       !!(navigator.mediaDevices?.getDisplayMedia),
    deviceMemory:        'deviceMemory' in navigator,
    notifications:       'Notification' in window,
    pushManager:         'PushManager' in window,
    deviceOrientation:   'DeviceOrientationEvent' in window,
    bluetooth:           'bluetooth' in navigator,
    usb:                 'usb' in navigator,
    camera:              !!(navigator.mediaDevices?.getUserMedia),
  };
}
