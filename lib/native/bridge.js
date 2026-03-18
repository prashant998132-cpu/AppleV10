// lib/native/bridge.js — JARVIS v10.9 Native Bridge
// ══════════════════════════════════════════════════════
// PWA + Capacitor hybrid — Web API fallback har jagah
// Native app mein: Capacitor plugins use hote hain
// Browser mein: Web APIs use hoti hain
// ══════════════════════════════════════════════════════
'use client';

// Check if running inside Capacitor native app
export const isNative = () => {
  if (typeof window === 'undefined') return false;
  return !!(window.Capacitor?.isNativePlatform?.() || window.Capacitor?.platform !== 'web');
};

export const getPlatform = () => {
  if (typeof window === 'undefined') return 'web';
  return window.Capacitor?.getPlatform?.() || 'web';
};

// ── 1. DEVICE INFO ────────────────────────────────────
export async function getDeviceInfo() {
  if (isNative()) {
    const { Device } = await import('@capacitor/device');
    const [info, battery, id] = await Promise.all([
      Device.getInfo(),
      Device.getBatteryInfo().catch(() => ({})),
      Device.getId().catch(() => ({})),
    ]);
    return { ...info, ...battery, deviceId: id.identifier };
  }
  // Web fallback
  const battery = await navigator.getBattery?.().catch(() => null);
  return {
    platform: 'web',
    model: navigator.userAgent.match(/Android|iPhone|iPad/)?.[0] || 'Desktop',
    osVersion: navigator.userAgent,
    batteryLevel: battery ? Math.round(battery.level * 100) : null,
    isCharging: battery?.charging ?? null,
    deviceId: localStorage.getItem('jarvis_device_id') || ('web_' + Math.random().toString(36).slice(2)),
  };
}

// ── 2. CAMERA ────────────────────────────────────────
export async function takePhoto(source = 'CAMERA') {
  if (isNative()) {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
    const src = source === 'GALLERY' ? CameraSource.Photos : CameraSource.Camera;
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: src,
    });
    return `data:image/jpeg;base64,${photo.base64String}`;
  }
  // Web fallback — file input
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (source === 'CAMERA') input.capture = 'environment';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return reject('No file');
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

export const pickFromGallery = () => takePhoto('GALLERY');

// ── 3. FILESYSTEM ─────────────────────────────────────
export async function saveFile(filename, content, mimeType = 'text/plain') {
  if (isNative()) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    await Filesystem.writeFile({
      path: `JARVIS/${filename}`,
      data: content,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true,
    });
    return { ok: true, path: `Documents/JARVIS/${filename}` };
  }
  // Web fallback — download
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  return { ok: true, downloaded: true };
}

export async function readFile(path) {
  if (isNative()) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    const result = await Filesystem.readFile({
      path, directory: Directory.Documents, encoding: Encoding.UTF8,
    });
    return result.data;
  }
  return null;
}

export async function listFiles(folder = 'JARVIS') {
  if (isNative()) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const result = await Filesystem.readdir({ path: folder, directory: Directory.Documents });
    return result.files.map(f => f.name || f);
  }
  return [];
}

// ── 4. GEOLOCATION ────────────────────────────────────
export async function getLocation(options = {}) {
  if (isNative()) {
    const { Geolocation } = await import('@capacitor/geolocation');
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
      ...options,
    });
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      altitude: pos.coords.altitude,
      speed: pos.coords.speed,
    };
  }
  // Web fallback
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      reject,
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

export async function watchLocation(callback) {
  if (isNative()) {
    const { Geolocation } = await import('@capacitor/geolocation');
    const id = await Geolocation.watchPosition({ enableHighAccuracy: true }, (pos) => {
      if (pos) callback({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
    return () => Geolocation.clearWatch({ id });
  }
  const id = navigator.geolocation.watchPosition(p => callback({ lat: p.coords.latitude, lng: p.coords.longitude }));
  return () => navigator.geolocation.clearWatch(id);
}

// ── 5. NOTIFICATIONS ──────────────────────────────────
export async function requestNotificationPermission() {
  if (isNative()) {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const result = await PushNotifications.requestPermissions();
    if (result.receive === 'granted') await PushNotifications.register();
    
    // Listen for token
    PushNotifications.addListener('registration', token => {
      localStorage.setItem('jarvis_push_token', token.value);
    });
    PushNotifications.addListener('pushNotificationReceived', notif => {
      console.log('Push received:', notif);
    });
    return result.receive === 'granted';
  }
  if ('Notification' in window) {
    const r = await Notification.requestPermission();
    return r === 'granted';
  }
  return false;
}

export async function showNotification(title, body, options = {}) {
  if (isNative()) {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const id = options.id || Math.floor(Math.random() * 100000);
    await LocalNotifications.schedule({
      notifications: [{
        title, body, id,
        schedule: options.delay ? { at: new Date(Date.now() + options.delay) } : { at: new Date(Date.now() + 100) },
        sound: options.silent ? undefined : 'default',
        channelId: 'jarvis',
        extra: options.data || null,
      }]
    });
    return id;
  }
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/icons/icon-192.png', ...options.webOptions });
  }
}

// ── 6. HAPTICS / VIBRATION ────────────────────────────
export async function vibrate(style = 'medium') {
  if (isNative()) {
    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
    const impacts = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
    const notifs = { success: NotificationType.Success, warning: NotificationType.Warning, error: NotificationType.Error };
    if (notifs[style]) await Haptics.notification({ type: notifs[style] });
    else await Haptics.impact({ style: impacts[style] || ImpactStyle.Medium });
    return;
  }
  if (navigator.vibrate) {
    const p = { light: 40, medium: 80, heavy: 200, success: [50,50,100], warning: [100,50,100], error: [200,100,200,100,200] };
    navigator.vibrate(p[style] || 80);
  }
}

// ── 7. CLIPBOARD ──────────────────────────────────────
export async function copyText(text) {
  if (isNative()) {
    const { Clipboard } = await import('@capacitor/clipboard');
    await Clipboard.write({ string: text });
    return true;
  }
  return navigator.clipboard?.writeText(text).then(() => true).catch(() => false);
}

export async function pasteText() {
  if (isNative()) {
    const { Clipboard } = await import('@capacitor/clipboard');
    const r = await Clipboard.read();
    return r.value;
  }
  return navigator.clipboard?.readText().catch(() => null);
}

// ── 8. SHARE ──────────────────────────────────────────
export async function share({ title, text, url, files } = {}) {
  if (isNative()) {
    const { Share } = await import('@capacitor/share');
    const canShare = await Share.canShare();
    if (canShare.value) return Share.share({ title, text, url, dialogTitle: 'Share via' });
  }
  if (navigator.share) return navigator.share({ title, text, url });
  await copyText(url || text || '');
  return { shared: false, copied: true };
}

// ── 9. NETWORK ────────────────────────────────────────
export async function getNetworkStatus() {
  if (isNative()) {
    const { Network } = await import('@capacitor/network');
    const s = await Network.getStatus();
    return { connected: s.connected, type: s.connectionType };
  }
  const conn = navigator.connection || navigator.mozConnection;
  return {
    connected: navigator.onLine,
    type: conn?.effectiveType || (navigator.onLine ? '4g' : 'none'),
    downlink: conn?.downlink,
    saveData: conn?.saveData,
  };
}

export function onNetworkChange(callback) {
  if (isNative()) {
    import('@capacitor/network').then(({ Network }) => {
      Network.addListener('networkStatusChange', s => callback({ connected: s.connected, type: s.connectionType }));
    });
    return;
  }
  const handler = () => callback({ connected: navigator.onLine });
  window.addEventListener('online', handler);
  window.addEventListener('offline', handler);
  return () => { window.removeEventListener('online', handler); window.removeEventListener('offline', handler); };
}

// ── 10. STORAGE / PREFERENCES ─────────────────────────
export async function storeSave(key, value) {
  if (isNative()) {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key, value: typeof value === 'string' ? value : JSON.stringify(value) });
    return true;
  }
  try { localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value)); return true; } catch { return false; }
}

export async function storeGet(key, fallback = null) {
  if (isNative()) {
    const { Preferences } = await import('@capacitor/preferences');
    const r = await Preferences.get({ key });
    if (!r.value) return fallback;
    try { return JSON.parse(r.value); } catch { return r.value; }
  }
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}

export async function storeRemove(key) {
  if (isNative()) {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.remove({ key });
    return;
  }
  localStorage.removeItem(key);
}

// ── 11. MOTION / SENSORS ──────────────────────────────
export function watchMotion(callback) {
  if (isNative()) {
    import('@capacitor/motion').then(({ Motion }) => {
      Motion.addListener('accel', e => callback({ type: 'accel', ...e.acceleration }));
    });
    return () => import('@capacitor/motion').then(({ Motion }) => Motion.removeAllListeners());
  }
  // Web fallback — DeviceMotion API
  const handler = (e) => callback({
    type: 'accel',
    x: e.accelerationIncludingGravity.x,
    y: e.accelerationIncludingGravity.y,
    z: e.accelerationIncludingGravity.z,
  });
  window.addEventListener('devicemotion', handler);
  return () => window.removeEventListener('devicemotion', handler);
}

// ── 12. STATUS BAR ────────────────────────────────────
export async function setStatusBar(color = '#050810', style = 'dark') {
  if (isNative()) {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setBackgroundColor({ color });
    await StatusBar.setStyle({ style: style === 'dark' ? Style.Dark : Style.Light });
  }
}

export async function hideStatusBar() {
  if (isNative()) {
    const { StatusBar } = await import('@capacitor/status-bar');
    await StatusBar.hide();
  }
}

// ── 13. KEYBOARD ──────────────────────────────────────
export function onKeyboardShow(callback) {
  if (isNative()) {
    import('@capacitor/keyboard').then(({ Keyboard }) => {
      Keyboard.addListener('keyboardWillShow', info => callback(info.keyboardHeight));
    });
    return () => import('@capacitor/keyboard').then(({ Keyboard }) => Keyboard.removeAllListeners());
  }
  const handler = () => callback(window.innerHeight - document.documentElement.clientHeight);
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}

export async function hideKeyboard() {
  if (isNative()) {
    const { Keyboard } = await import('@capacitor/keyboard');
    await Keyboard.hide();
  } else {
    document.activeElement?.blur();
  }
}

// ── 14. APP LIFECYCLE ─────────────────────────────────
export function setupAppLifecycle({ onPause, onResume, onBack, onDeepLink } = {}) {
  if (isNative()) {
    import('@capacitor/app').then(({ App }) => {
      App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) onResume?.();
        else onPause?.();
      });
      // Android back button
      App.addListener('backButton', ({ canGoBack }) => {
        if (onBack) { onBack(); return; }
        if (canGoBack) window.history.back();
        else App.exitApp();
      });
      // Deep links
      if (onDeepLink) {
        App.addListener('appUrlOpen', data => onDeepLink(data.url));
      }
    });
    return;
  }
  // Web fallback
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) onPause?.();
    else onResume?.();
  });
}

// ── 15. SCREEN ORIENTATION ────────────────────────────
export async function lockOrientation(orientation = 'portrait') {
  if (isNative()) {
    const { ScreenOrientation } = await import('@capacitor/screen-orientation');
    await ScreenOrientation.lock({ orientation });
    return;
  }
  screen.orientation?.lock?.(orientation).catch(() => {});
}

export async function unlockOrientation() {
  if (isNative()) {
    const { ScreenOrientation } = await import('@capacitor/screen-orientation');
    await ScreenOrientation.unlock();
    return;
  }
  screen.orientation?.unlock?.();
}

// ── 16. IN-APP BROWSER ────────────────────────────────
export async function openBrowser(url, target = '_blank') {
  if (isNative()) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url, toolbarColor: '#050810', presentationStyle: 'fullscreen' });
    return;
  }
  window.open(url, target);
}

// ── 17. TOAST ─────────────────────────────────────────
export async function showToast(message, duration = 'short', position = 'bottom') {
  if (isNative()) {
    const { Toast } = await import('@capacitor/toast');
    await Toast.show({ text: message, duration, position });
    return;
  }
  // CSS toast fallback
  const el = document.createElement('div');
  el.textContent = message;
  el.style.cssText = `position:fixed;${position==='top'?'top:20px':'bottom:20px'};left:50%;transform:translateX(-50%);background:#1a1a2e;color:white;padding:10px 20px;border-radius:12px;z-index:99999;font-size:14px;pointer-events:none;opacity:1;transition:opacity 0.3s`;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, duration === 'short' ? 2000 : 3500);
}

// ── 18. DIALOG ────────────────────────────────────────
export async function showAlert(title, message, buttonTitle = 'OK') {
  if (isNative()) {
    const { Dialog } = await import('@capacitor/dialog');
    await Dialog.alert({ title, message, buttonTitle });
    return;
  }
  alert(`${title}\n${message}`);
}

export async function showConfirm(title, message, okText = 'Haan', cancelText = 'Nahi') {
  if (isNative()) {
    const { Dialog } = await import('@capacitor/dialog');
    const r = await Dialog.confirm({ title, message, okButtonTitle: okText, cancelButtonTitle: cancelText });
    return r.value;
  }
  return confirm(`${title}\n${message}`);
}

export async function showPrompt(title, message, placeholder = '') {
  if (isNative()) {
    const { Dialog } = await import('@capacitor/dialog');
    const r = await Dialog.prompt({ title, message, inputPlaceholder: placeholder });
    return r.cancelled ? null : r.value;
  }
  return prompt(`${title}\n${message}`);
}

// ── 19. ACTION SHEET ──────────────────────────────────
export async function showActionSheet(title, options = []) {
  if (isNative()) {
    const { ActionSheet, ActionSheetButtonStyle } = await import('@capacitor/action-sheet');
    const buttons = options.map(o => ({
      title: o.label,
      style: o.destructive ? ActionSheetButtonStyle.Destructive : ActionSheetButtonStyle.Default,
    }));
    buttons.push({ title: 'Cancel', style: ActionSheetButtonStyle.Cancel });
    const r = await ActionSheet.showActions({ title, message: '', options: buttons });
    if (r.index < options.length) return options[r.index].value || options[r.index].label;
    return null;
  }
  // Web fallback — simple select
  const choice = await new Promise(resolve => {
    const sheet = document.createElement('div');
    sheet.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:flex-end;';
    const inner = document.createElement('div');
    inner.style.cssText = 'background:#1a1a2e;width:100%;border-radius:20px 20px 0 0;padding:20px;';
    inner.innerHTML = `<p style="color:white;font-weight:bold;margin-bottom:12px">${title}</p>`;
    options.forEach(o => {
      const btn = document.createElement('button');
      btn.textContent = o.label;
      btn.style.cssText = 'display:block;width:100%;padding:14px;background:rgba(255,255,255,0.1);color:white;border:none;border-radius:12px;margin-bottom:8px;font-size:14px;cursor:pointer;';
      btn.onclick = () => { document.body.removeChild(sheet); resolve(o.value || o.label); };
      inner.appendChild(btn);
    });
    const cancel = document.createElement('button');
    cancel.textContent = 'Cancel';
    cancel.style.cssText = 'display:block;width:100%;padding:14px;background:transparent;color:#888;border:none;border-radius:12px;font-size:14px;cursor:pointer;';
    cancel.onclick = () => { document.body.removeChild(sheet); resolve(null); };
    inner.appendChild(cancel);
    sheet.appendChild(inner);
    document.body.appendChild(sheet);
  });
  return choice;
}

// ── 20. WAKE LOCK / SCREEN ON ─────────────────────────
let _wakeLock = null;
export async function keepScreenOn(enable = true) {
  if (isNative()) {
    // Use StatusBar visibility trick for native
    return;
  }
  if ('wakeLock' in navigator) {
    if (enable && !_wakeLock) {
      _wakeLock = await navigator.wakeLock.request('screen').catch(() => null);
    } else if (!enable && _wakeLock) {
      await _wakeLock.release().catch(() => {});
      _wakeLock = null;
    }
  }
}

// ── EXPORT ALL ────────────────────────────────────────
const NativeBridge = {
  isNative, getPlatform,
  getDeviceInfo,
  takePhoto, pickFromGallery,
  saveFile, readFile, listFiles,
  getLocation, watchLocation,
  requestNotificationPermission, showNotification,
  vibrate,
  copyText, pasteText,
  share,
  getNetworkStatus, onNetworkChange,
  storeSave, storeGet, storeRemove,
  watchMotion,
  setStatusBar, hideStatusBar,
  onKeyboardShow, hideKeyboard,
  setupAppLifecycle,
  lockOrientation, unlockOrientation,
  openBrowser,
  showToast, showAlert, showConfirm, showPrompt, showActionSheet,
  keepScreenOn,
};

export default NativeBridge;
