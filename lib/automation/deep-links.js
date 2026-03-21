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
  linkedin:      { url: 'https://linkedin.com', intent: 'intent://linkedin.com/#Intent;scheme=https;package=com.linkedin.android;end' },

  // ── Productivity ──────────────────────────────────────────────
  notion:        { url: 'https://notion.so' },
  spotify:       { url: 'https://open.spotify.com',                 intent: 'intent://open.spotify.com/#Intent;scheme=https;package=com.spotify.music;end' },
  netflix:       { url: 'https://netflix.com', intent: 'intent://netflix.com/#Intent;scheme=https;package=com.netflix.mediaclient;end' },
  amazon:        { url: 'https://amazon.in', intent: 'intent://amazon.in/#Intent;scheme=https;package=in.amazon.mShop.android.shopping;end' },
  flipkart:      { url: 'https://flipkart.com', intent: 'intent://flipkart.com/#Intent;scheme=https;package=com.flipkart.android;end' },
  zomato:        { url: 'https://zomato.com' },
  swiggy:        { url: 'https://swiggy.com', intent: 'intent://swiggy.com/#Intent;scheme=https;package=in.swiggy.android;end' },
  ola:           { url: 'https://olaoperator.com',                  intent: 'intent://book.olacabs.com/#Intent;scheme=https;package=com.olacabs.customer;end' },
  uber:          { url: 'https://m.uber.com', intent: 'intent://m.uber.com/#Intent;scheme=https;package=com.ubercab;end' },
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
  chrome:        { url: 'https://google.com', intent: 'intent://google.com/#Intent;scheme=https;package=com.android.chrome;end' },
  calculator:    { url: null, intent: 'intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.APP_CALCULATOR;end' },
  twitter:       { url: 'https://x.com', intent: 'intent://x.com/#Intent;scheme=https;package=com.twitter.android;end' },
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
  // ══ SOCIAL MEDIA ══════════════════════════════════════════
  { pattern: /instagram|insta/i,          action: 'instagram' },
  { pattern: /whatsapp|watsapp/i,         action: 'whatsapp' },
  { pattern: /youtube|\byt\b/i,         action: 'youtube' },
  { pattern: /telegram/i,                 action: 'telegram' },
  { pattern: /\btwitter\b|\bx\.com\b/i, action: 'twitter' },
  { pattern: /linkedin/i,                 action: 'linkedin' },

  // ══ MUSIC & MEDIA ═════════════════════════════════════════
  { pattern: /spotify/i,                  action: 'spotify' },
  { pattern: /netflix/i,                  action: 'netflix' },

  // ══ GOOGLE APPS ═══════════════════════════════════════════
  { pattern: /\bgmail\b|email kh/i,     action: 'gmail' },
  { pattern: /google maps|\bmaps\b/i,   action: 'maps' },
  { pattern: /google drive|\bdrive\b/i, action: 'drive' },
  { pattern: /google meet|\bmeet\b/i,   action: 'meet' },
  { pattern: /google calendar|calendar kh/i, action: 'calendar' },
  { pattern: /google photos|photos kh/i,  action: 'photos' },
  { pattern: /\bchrome\b|browser kh/i,  action: 'chrome' },

  // ══ SHOPPING ══════════════════════════════════════════════
  { pattern: /amazon/i,                   action: 'amazon' },
  { pattern: /flipkart/i,                 action: 'flipkart' },

  // ══ FOOD DELIVERY ═════════════════════════════════════════
  { pattern: /zomato/i,                   action: 'zomato' },
  { pattern: /swiggy/i,                   action: 'swiggy' },

  // ══ TRANSPORT ═════════════════════════════════════════════
  { pattern: /\bola\b.*cab|cab.*\bola\b|\bola\b.*book/i, action: 'ola' },
  { pattern: /\buber\b/i,               action: 'uber' },

  // ══ PAYMENTS ══════════════════════════════════════════════
  { pattern: /\bgpay\b|google pay/i,    action: 'gpay' },
  { pattern: /phonepe/i,                  action: 'phonepe' },
  { pattern: /\bpaytm\b/i,              action: 'paytm' },

  // ══ EDUCATION ═════════════════════════════════════════════
  { pattern: /unacademy/i,                action: 'unacademy' },
  { pattern: /byju/i,                     action: 'byju' },
  { pattern: /khan academy/i,             action: 'khan_academy' },
  { pattern: /coursera/i,                 action: 'coursera' },
  { pattern: /\bnotion\b/i,             action: 'notion' },

  // ══ SYSTEM ════════════════════════════════════════════════
  { pattern: /\bcalculator\b|\bcalc\b/i, action: 'calculator' },
  { pattern: /settings kh|settings open/i, action: 'settings' },
  { pattern: /wifi setting|wifi kh/i,     action: 'wifi_settings' },
  { pattern: /bluetooth setting/i,        action: 'bt_settings' },
  { pattern: /camera kh|camera open/i,    action: 'camera' },

  // ══ ACTIONS ═══════════════════════════════════════════════
  { pattern: /alarm.*set|alarm.*laga|set.*alarm/i, action: 'alarm' },
  { pattern: /call karo|dial karo/i,      action: 'dialer' },
  { pattern: /youtube.*search|search.*youtube/i, action: 'youtube_search' },
  { pattern: /navigate to|directions to/i, action: 'maps_navigate' },
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
