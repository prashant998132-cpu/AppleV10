// lib/automation/deep-links.js — Android Deep Link & Intent Bridge
// ═══════════════════════════════════════════════════════════════
// Opens Android apps + actions using deep links / intent:// URLs
// Works DIRECTLY from PWA — no MacroDroid needed for these!
// ═══════════════════════════════════════════════════════════════

// ─── DEEP LINK MAP ────────────────────────────────────────────────
export const DEEP_LINKS = {

  // ── Google Apps ──────────────────────────────────────────────
  youtube:       { url: 'https://youtube.com',                      intent: 'intent://youtube.com/#Intent;scheme=https;package=com.google.android.youtube;end' },
  youtube_search:{ url: (q) => `https://youtube.com/results?search_query=${encodeURIComponent(q)}`, label: 'YouTube Search' },
  maps:          { url: 'https://maps.google.com',                  intent: 'geo:0,0?q=' },
  maps_navigate: { url: (dest) => `https://maps.google.com/maps?daddr=${encodeURIComponent(dest)}`, label: 'Navigate to' },
  gmail:         { url: 'https://mail.google.com',                  intent: 'intent://gmail.com/#Intent;scheme=https;package=com.google.android.gm;end' },
  drive:         { url: 'https://drive.google.com' },
  meet:          { url: 'https://meet.google.com' },
  calendar:      { url: 'https://calendar.google.com' },
  photos:        { url: 'https://photos.google.com',                intent: 'intent://photos.google.com/#Intent;scheme=https;package=com.google.android.apps.photos;end' },

  // ── Social / Communication ────────────────────────────────────
  whatsapp:      { url: 'https://wa.me/',                           intent: 'intent://send?phone=&text=#Intent;scheme=whatsapp;package=com.whatsapp;end' },
  whatsapp_chat: { url: (phone) => `https://wa.me/${phone}`,        label: 'WhatsApp message' },
  telegram:      { url: 'https://t.me',                             intent: 'intent://t.me/#Intent;scheme=https;package=org.telegram.messenger;end' },
  instagram:     { url: 'https://instagram.com',                    intent: 'intent://instagram.com/#Intent;scheme=https;package=com.instagram.android;end' },
  twitter:       { url: 'https://twitter.com' },
  linkedin:      { url: 'https://linkedin.com' },

  // ── Productivity ──────────────────────────────────────────────
  notion:        { url: 'https://notion.so' },
  spotify:       { url: 'https://open.spotify.com',                 intent: 'intent://open.spotify.com/#Intent;scheme=https;package=com.spotify.music;end' },
  netflix:       { url: 'https://netflix.com' },
  amazon:        { url: 'https://amazon.in' },
  flipkart:      { url: 'https://flipkart.com' },
  zomato:        { url: 'https://zomato.com' },
  swiggy:        { url: 'https://swiggy.com' },
  ola:           { url: 'https://olaoperator.com',                  intent: 'intent://book.olacabs.com/#Intent;scheme=https;package=com.olacabs.customer;end' },
  uber:          { url: 'https://m.uber.com' },
  paytm:         { url: 'https://paytm.com' },
  gpay:          { url: 'https://pay.google.com' },
  phonepe:       { url: 'https://phonepe.com',                      intent: 'intent://phonepe.com/#Intent;scheme=https;package=com.phonepe.app;end' },

  // ── Study ─────────────────────────────────────────────────────
  unacademy:     { url: 'https://unacademy.com' },
  byju:          { url: 'https://byjus.com' },
  khan_academy:  { url: 'https://khanacademy.org' },
  coursera:      { url: 'https://coursera.org' },

  // ── Android System actions (intent:// scheme) ─────────────────
  settings:      { intent: 'intent:#Intent;action=android.settings.SETTINGS;end', url: null },
  wifi_settings: { intent: 'intent:#Intent;action=android.settings.WIFI_SETTINGS;end', url: null },
  bt_settings:   { intent: 'intent:#Intent;action=android.settings.BLUETOOTH_SETTINGS;end', url: null },
  volume:        { intent: 'intent:#Intent;action=android.settings.SOUND_SETTINGS;end', url: null },
  battery:       { intent: 'intent:#Intent;action=android.settings.BATTERY_SAVER_SETTINGS;end', url: null },
  camera:        { intent: 'intent:#Intent;action=android.media.action.IMAGE_CAPTURE;end', url: null },
  dialer:        { intent: 'intent:#Intent;action=android.intent.action.DIAL;end', url: null },
  call:          { intent: (num) => `tel:${num}`, url: (num) => `tel:${num}` },
  sms:           { intent: (num) => `sms:${num}`, url: (num) => `sms:${num}` },
  email:         { url: (addr) => `mailto:${addr}` },
  alarm:         { intent: 'intent:#Intent;action=android.intent.action.SET_ALARM;end', url: null },
  timer:         { intent: 'intent:#Intent;action=android.intent.action.SET_TIMER;end', url: null },
};

// ─── INTENT DETECTOR ─────────────────────────────────────────────
const INTENT_MAP = [
  // Apps
  { pattern: /youtube.*khol|open.*youtube|yt.*open/i,     action: 'youtube' },
  { pattern: /youtube.*search|search.*youtube/i,          action: 'youtube_search' },
  { pattern: /whatsapp.*khol|open.*whatsapp/i,            action: 'whatsapp' },
  { pattern: /instagram.*khol|open.*instagram/i,          action: 'instagram' },
  { pattern: /spotify.*khol|open.*spotify|music.*khol/i,  action: 'spotify' },
  { pattern: /maps.*khol|open.*maps|navigate.*to/i,       action: 'maps' },
  { pattern: /gmail.*khol|open.*gmail|email.*khol/i,      action: 'gmail' },
  { pattern: /camera.*khol|open.*camera/i,                action: 'camera' },
  { pattern: /settings.*khol|open.*settings/i,            action: 'settings' },
  { pattern: /wifi.*setting|wifi.*jaao/i,                 action: 'wifi_settings' },
  { pattern: /telegram.*khol|open.*telegram/i,            action: 'telegram' },
  { pattern: /zomato|swiggy|khana.*order/i,               action: 'zomato' },
  { pattern: /paytm|gpay|phonepe|payment/i,               action: 'gpay' },
  { pattern: /ola.*book|uber.*book|cab.*book/i,            action: 'ola' },
  { pattern: /alarm.*set|alarm.*laga/i,                   action: 'alarm' },
  { pattern: /call.*karo|phone.*karo|dial/i,              action: 'dialer' },
  { pattern: /notion.*khol|open.*notion/i,                action: 'notion' },
];

export function detectDeepLink(text) {
  for (const { pattern, action } of INTENT_MAP) {
    if (pattern.test(text)) return action;
  }
  return null;
}

// ─── EXECUTE DEEP LINK ────────────────────────────────────────────
// Returns: { opened: bool, method: 'intent'|'url', action }
export function executeDeepLink(action, param = '') {
  const link = DEEP_LINKS[action];
  if (!link) return { opened: false, error: 'Unknown action' };

  try {
    // Try intent:// first (opens native app), fallback to https://
    const intentUrl = typeof link.intent === 'function'
      ? link.intent(param)
      : link.intent;

    const webUrl = typeof link.url === 'function'
      ? link.url(param)
      : link.url;

    if (intentUrl) {
      // Try native intent
      window.location.href = intentUrl;
      return { opened: true, method: 'intent', action };
    } else if (webUrl) {
      window.open(webUrl, '_blank', 'noopener');
      return { opened: true, method: 'url', action };
    }
  } catch {}

  return { opened: false, error: 'Could not open' };
}

// ─── CLIENT-SIDE COMMAND HANDLER ─────────────────────────────────
// Called from chat before sending to AI — intercepts app-open commands
export function handleClientCommand(text) {
  const action = detectDeepLink(text);
  if (!action) return null;

  // Extract param (e.g., search query, phone number)
  let param = '';
  const searchMatch = text.match(/search.*?["']?([a-zA-Z0-9\s]+)["']?$/i);
  const phoneMatch = text.match(/\b(\d{10})\b/);
  if (searchMatch) param = searchMatch[1];
  if (phoneMatch) param = phoneMatch[1];

  const result = executeDeepLink(action, param);
  return result.opened ? `${action} khol raha hoon... 📱` : null;
}
