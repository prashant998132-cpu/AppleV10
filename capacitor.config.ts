import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jarvis.personalai',
  appName: 'JARVIS AI',
  webDir: 'out',

  // HYBRID MODE — Vercel se load karo, native plugins extra milenge
  server: {
    url: 'https://apple-v10.vercel.app',
    cleartext: false,
    allowNavigation: [
      '*.vercel.app',
      'api.groq.com',
      '*.puter.com',
      '*.googleapis.com',
      'trigger.macrodroid.com',
    ],
  },

  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_jarvis',
      iconColor: '#1A56DB',
      sound: 'default',
    },
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#050810',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'dark' as any,
      backgroundColor: '#050810',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'body' as any,
      style: 'dark' as any,
      resizeOnFullScreen: true,
    },
  },

  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    backgroundColor: '#050810',
    loggingBehavior: 'none' as any,
  },

  ios: {
    contentInset: 'automatic' as any,
    scrollEnabled: true,
    backgroundColor: '#050810',
    limitsNavigationsToAppBoundDomains: false,
  },
};

export default config;
