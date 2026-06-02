// Firestore service - thin wrapper. Fails gracefully if Firebase isn't configured.

import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { ProgressStats } from '@/types';

export const firestoreService = {
  async getProgress(uid: string): Promise<ProgressStats | null> {
    try {
      const snap = await getDoc(doc(db, 'progress', uid));
      return snap.exists() ? (snap.data() as ProgressStats) : null;
    } catch {
      return null;
    }
  },

  async saveProgress(uid: string, stats: ProgressStats): Promise<void> {
    try {
      await setDoc(doc(db, 'progress', uid), stats, { merge: true });
    } catch {
      // ignore
    }
  },

  async saveFavoriteWord(uid: string, wordId: string): Promise<void> {
    try {
      await setDoc(doc(collection(db, 'users', uid, 'favorites'), wordId), {
        wordId,
        createdAt: Date.now(),
      });
    } catch {
      // ignore
    }
  },

  async setPremium(uid: string, isPremium: boolean): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', uid), { isPremium });
    } catch {
      // ignore
    }
  },
};
