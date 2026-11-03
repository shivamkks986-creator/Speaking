// Firestore service - thin wrapper. Fails gracefully if Firebase isn't configured.

import { collection, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
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

  // Public-safe rank card (name + XP only) — see firestore.rules `leaderboard`.
  async syncLeaderboard(uid: string, displayName: string, xp: number): Promise<void> {
    try {
      await setDoc(doc(db, 'leaderboard', uid), {
        displayName: (displayName || 'Learner').slice(0, 40),
        xp: Math.max(0, Math.floor(xp)),
        updatedAt: serverTimestamp(),
      });
    } catch {
      // ignore
    }
  },
};
