import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ProgressStats } from '@/types';
import { STORAGE_KEYS } from '@/utils/constants';
import { getDayIndex, todayKey, yesterdayKey } from '@/utils/helpers';

interface ProgressCtx {
  stats: ProgressStats;
  recordActivity: (minutes: number, kind: 'chat' | 'speaking' | 'interview' | 'vocab') => Promise<void>;
  resetStats: () => Promise<void>;
}

const defaultStats: ProgressStats = {
  streak: 0,
  longestStreak: 0,
  totalMinutes: 0,
  wordsLearned: 0,
  conversationsCount: 0,
  interviewsCount: 0,
  lastActiveDate: '',
  weeklyMinutes: [0, 0, 0, 0, 0, 0, 0],
};

const ProgressContext = createContext<ProgressCtx | undefined>(undefined);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [stats, setStats] = useState<ProgressStats>(defaultStats);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.PROGRESS);
      if (raw) {
        try {
          setStats({ ...defaultStats, ...JSON.parse(raw) });
        } catch {
          // ignore
        }
      }
    })();
  }, []);

  const persist = useCallback(async (next: ProgressStats) => {
    setStats(next);
    await AsyncStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(next));
  }, []);

  const recordActivity = useCallback(
    async (minutes: number, kind: 'chat' | 'speaking' | 'interview' | 'vocab') => {
      const today = todayKey();
      const next: ProgressStats = { ...stats };

      // Streak logic
      if (next.lastActiveDate === today) {
        // already counted today
      } else if (next.lastActiveDate === yesterdayKey()) {
        next.streak += 1;
      } else {
        next.streak = 1;
      }
      next.longestStreak = Math.max(next.longestStreak, next.streak);
      next.lastActiveDate = today;

      // Totals
      next.totalMinutes += minutes;
      const dayIdx = getDayIndex();
      const weekly = [...next.weeklyMinutes];
      weekly[dayIdx] = (weekly[dayIdx] || 0) + minutes;
      next.weeklyMinutes = weekly;

      if (kind === 'chat') next.conversationsCount += 1;
      if (kind === 'interview') next.interviewsCount += 1;
      if (kind === 'vocab') next.wordsLearned += 1;

      await persist(next);
    },
    [stats, persist]
  );

  const resetStats = useCallback(async () => {
    await persist(defaultStats);
  }, [persist]);

  return (
    <ProgressContext.Provider value={{ stats, recordActivity, resetStats }}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress(): ProgressCtx {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider');
  return ctx;
}
