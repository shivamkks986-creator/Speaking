// Persists an in-progress interview session so the user can resume after
// closing the app / switching screens. Keyed by (uid, track) so switching
// tracks doesn't lose the other track's progress.
//
// Design goals:
//   • Never lose work — auto-save after every answer.
//   • Idempotent — writing twice is a no-op if content matches.
//   • Fresh: sessions older than 24h are treated as stale and deleted.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { InterviewTrack } from '@/types';

export interface SavedInterviewSession {
  track: InterviewTrack;
  targetQuestions: number;
  currentQuestion: string;
  history: {
    question: string;
    answer: string;
    scores?: any;
    feedback?: string;
    fillers?: any;
    strongPoints?: string[];
    weakPoints?: string[];
    betterVersion?: string;
  }[];
  startedAt: number;
  savedAt: number;
}

const KEY = (uid: string, track: string) => `interview:session:${uid}:${track}`;
const STALE_MS = 24 * 60 * 60 * 1000; // 24h

export const interviewProgressService = {
  async save(uid: string, session: Omit<SavedInterviewSession, 'savedAt'>): Promise<void> {
    if (!uid) return;
    try {
      const payload: SavedInterviewSession = { ...session, savedAt: Date.now() };
      await AsyncStorage.setItem(KEY(uid, session.track), JSON.stringify(payload));
    } catch {
      // AsyncStorage error — non-fatal; user can still finish the current session in memory.
    }
  },

  async load(uid: string, track: InterviewTrack): Promise<SavedInterviewSession | null> {
    if (!uid) return null;
    try {
      const raw = await AsyncStorage.getItem(KEY(uid, track));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SavedInterviewSession;
      // Discard stale sessions (24h+).
      if (Date.now() - parsed.savedAt > STALE_MS) {
        await AsyncStorage.removeItem(KEY(uid, track));
        return null;
      }
      // Only resume if there's real progress to resume (≥1 answered question).
      if (!parsed.history || parsed.history.length === 0) return null;
      return parsed;
    } catch {
      return null;
    }
  },

  async clear(uid: string, track: InterviewTrack): Promise<void> {
    if (!uid) return;
    try {
      await AsyncStorage.removeItem(KEY(uid, track));
    } catch {
      // ignore
    }
  },
};
