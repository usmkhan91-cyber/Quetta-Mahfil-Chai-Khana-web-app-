import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getMessaging, isSupported as isMessagingSupported, Messaging } from 'firebase/messaging';
import { Firestore, initializeFirestore, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported as isAnalyticsSupported, Analytics } from 'firebase/analytics';
import { getRemoteConfig, fetchAndActivate, RemoteConfig } from 'firebase/remote-config';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import firebaseConfig from '../../firebase-applet-config.json';

const getEnv = (key: string, fallback: string) => {
  const val = import.meta.env[key];
  if (!val || typeof val !== 'string' || val.trim() === '' || val === 'undefined' || val === 'null' || val.includes('YOUR_') || val.startsWith('{') || val.includes('VITE_FIREBASE_')) return fallback;
  return val;
};

const clientConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY', firebaseConfig.apiKey),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN', firebaseConfig.authDomain),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID', firebaseConfig.projectId),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET', firebaseConfig.storageBucket),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', firebaseConfig.messagingSenderId),
  appId: getEnv('VITE_FIREBASE_APP_ID', firebaseConfig.appId),
  measurementId: firebaseConfig.measurementId
};

// Singleton pattern for Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(clientConfig);

// Canonical Firestore Initialization with automatic fallback for iframe/sandbox network environments
const dbId = (firebaseConfig as any).firestoreDatabaseId || undefined;
let db: Firestore;
try {
  db = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
  }, dbId);
} catch {
  db = getFirestore(app, dbId);
}
export { db };

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {
  // Silent fallback if persistence setting fails
});

export const storage = getStorage(app);

// Messaging Initialization
export let messaging: Messaging | null = null;
if (typeof window !== 'undefined') {
  isMessagingSupported().then(supported => {
    if (supported) {
      try {
        messaging = getMessaging(app);
      } catch (err) {
        console.warn("FCM initialization failed:", err);
      }
    }
  });
}

// Safe Remote Config Initialization
let remoteConfig: RemoteConfig;
try {
  remoteConfig = getRemoteConfig(app);
  remoteConfig.settings.minimumFetchIntervalMillis = 3600000;
  remoteConfig.defaultConfig = {
    "show_promotional_banner": false,
    "primary_maroon": "#5d1212",
    "enable_ai_search": true,
    "banner_text": "Welcome to Mahfil Heritage",
    "new_user_bonus_amount": 500
  };
} catch (err) {
  // Mock remote config if it fails to initialize
  remoteConfig = {
    app,
    settings: { minimumFetchIntervalMillis: 3600000, fetchTimeoutMillis: 60000 },
    defaultConfig: {},
    // @ts-ignore - limited mock for safety
    getValue: () => ({ asBoolean: () => false, asString: () => "", asNumber: () => 0 }),
    // @ts-ignore
    getAll: () => ({}),
  } as any;
}
export { remoteConfig };

// Analytics (Safe check for SSR/Environments/Adblockers)
export let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  // Use a more aggressive suppression strategy for analytics in dev/preview
  const isDev = window.location.hostname.includes('ais-dev') || window.location.hostname.includes('ais-pre');
  
  if (!isDev) {
    isAnalyticsSupported().then(supported => {
      if (supported) {
        try {
          analytics = getAnalytics(app);
        } catch (err) {
          // Suppress initialization errors silently
        }
      }
    }).catch(() => {
      // Suppress support check errors silently
    });
  }
}

// Feature 13: App Check Security
if (typeof window !== 'undefined') {
  const appCheckKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6Lc7O7kqAAAAAF_8j_Zp_0X_X_X_X_X_X_X_X_X';
  try {
    if (appCheckKey !== '6Lc7O7kqAAAAAF_8j_Zp_0X_X_X_X_X_X_X_X_X') {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(appCheckKey),
        isTokenAutoRefreshEnabled: true
      });
    }
  } catch (err) {
    // Suppress silently
  }
}
