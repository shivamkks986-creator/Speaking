// Firebase configuration for SpeakMate AI
// Connected to project: speakmateai-83a32

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
  apiKey: "AIzaSyAf9_Jb_2KipOUGMEyKtN2NrSKBW4SiTN0",
  authDomain: "speakmateai-83a32.firebaseapp.com",
  databaseURL: "https://speakmateai-83a32-default-rtdb.firebaseio.com",
  projectId: "speakmateai-83a32",
  storageBucket: "speakmateai-83a32.firebasestorage.app",
  messagingSenderId: "688960403070",
  appId: "1:688960403070:web:940d7ee29a2cca15b30a2f",
  measurementId: "G-3MJ8H2JJ2C"
};

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