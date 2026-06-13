// Firebase configuration — reads keys from environment variables (.env file).
// Why env? So your real Firebase keys stay in your local .env (gitignored) and never
// get overwritten when you `git pull`. Set these in D:\sm\SpeakMateAI\.env :
//
//   EXPO_PUBLIC_FIREBASE_API_KEY=...
//   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
//   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
//   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
//   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
//   EXPO_PUBLIC_FIREBASE_APP_ID=...
//
// Get these from: https://console.firebase.google.com → Project Settings → Web SDK
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  // @ts-ignore  - getReactNativePersistence is exported but not typed
  getReactNativePersistence,
  getAuth,
  Auth,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

if (!firebaseConfig.apiKey) {
  // Surface a clear error in dev/prod logs so the user knows their .env is missing.
  console.warn(
    '[Firebase] EXPO_PUBLIC_FIREBASE_* env vars are missing. Auth and Firestore will not work. ' +
      'Create a .env file at the SpeakMateAI project root (see comment in src/config/firebase.ts).'
  );
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

const db = getFirestore(app);

export { app, auth, db };
