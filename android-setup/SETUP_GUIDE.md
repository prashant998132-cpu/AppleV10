# JARVIS Capacitor Setup — Step by Step

## Prerequisites
- Node.js 18+
- Android Studio (Android ke liye)
- Xcode + Mac (iOS ke liye)
- Java 17+

## Step 1: Init (ek baar)

```bash
# Project mein jaao
cd AppleV10

# Capacitor initialize (already done — capacitor.config.ts already hai)
npx cap init "JARVIS AI" "com.jarvis.personalai" --web-dir=out

# Android add karo
npx cap add android

# iOS add karo (Mac zarori)
npx cap add ios
```

## Step 2: Build aur Sync

```bash
# Har change ke baad yeh karo:
npm run build        # Next.js build (ya skip — hybrid mode mein Vercel se load hoga)
npx cap sync         # Native projects sync karo
```

## Step 3: Android Setup

```bash
# Android Studio mein kholo
npx cap open android
```

Android Studio mein:
1. `android/app/src/main/AndroidManifest.xml` mein `android-setup/AndroidManifest_permissions.xml` se permissions copy karo
2. `android/app/src/main/java/com/jarvis/personalai/` folder mein `MainActivity.kt` copy karo

## Step 4: APK Build

Android Studio mein:
- **Debug APK:** Build → Build Bundle(s)/APK(s) → Build APK(s)
- **Release APK:** Build → Generate Signed Bundle/APK → APK

APK milega: `android/app/build/outputs/apk/debug/app-debug.apk`

## Step 5: Live Development

```bash
# Real device pe live reload:
npx cap run android --livereload --external

# iOS:
npx cap run ios --livereload --external
```

## Custom Plugin Use karna (JavaScript se)

```javascript
import { registerPlugin } from '@capacitor/core';

const SystemControl = registerPlugin('SystemControl');

// Volume set karo
await SystemControl.setVolume({ level: 80, type: 'music' });

// App open karo
await SystemControl.openApp({ package: 'com.whatsapp' });

// Number dial karo
await SystemControl.dialNumber({ number: '9876543210' });

// Deep link
await SystemControl.openDeepLink({ url: 'whatsapp://' });
```

## Native Bridge Use karna

```javascript
import NativeBridge from '@/lib/native/bridge';

// Device info
const info = await NativeBridge.getDeviceInfo();

// Photo lo
const photo = await NativeBridge.takePhoto();

// Location lo
const loc = await NativeBridge.getLocation();

// Notification
await NativeBridge.showNotification('JARVIS', 'Study time!');

// Vibrate
await NativeBridge.vibrate('success');

// Toast
await NativeBridge.showToast('WiFi on ho gaya!');
```

## Files Reference

| File | Kya hai |
|---|---|
| `capacitor.config.ts` | Main config — Vercel URL + plugins |
| `lib/native/bridge.js` | All native features — Web fallback bhi |
| `android-setup/AndroidManifest_permissions.xml` | Android permissions |
| `android-setup/MainActivity.kt` | Custom Kotlin plugin |
| `android-setup/SystemControlPlugin.swift` | Custom iOS plugin |

