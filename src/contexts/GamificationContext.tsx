import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Level, LEVELS, getLevelByXp, getNextLevel, XP_REWARDS, COIN_REWARDS } from '@/config/levels';
import { BADGES } from '@/data/badges';
import { STORAGE_KEYS } from '@/utils/constants';
import { todayKey } from '@/utils/helpers';

export interface GamificationState {
  xp: number;
  coins: number;
  unlockedBadgeIds: string[];
  lastDailyLoginDate: string;
  dailyLoginStreak: number;
  pendingRewards: PendingReward[];
}

export interface PendingReward {
  id: string;
  title: string;
  description: string;
  xp: number;
  coins: number;
  icon: string;
  color: string;
  kind: 'badge' | 'level-up' | 'daily-login' | 'streak';
}

interface GamificationCtx {
  state: GamificationState;
  level: Level;
  nextLevel: Level | null;
  progressToNext: number; // 0..1
  addXp: (amount: number, reason?: string) => Promise<void>;
  addCoins: (amount: number) => Promise<void>;
  awardAction: (
    action:
      | 'CHAT_MESSAGE'
      | 'SPEAKING_SESSION'
      | 'INTERVIEW_QUESTION'
      | 'INTERVIEW_SESSION_COMPLETE'
      | 'VOCAB_WORD_LEARNED'
      | 'DAILY_CHALLENGE'
      | 'DAILY_LOGIN'
      | 'STREAK_7'
      | 'STREAK_30'
      | 'PERFECT_SCORE_BONUS'
  ) => Promise<void>;
  checkBadges: (stats: {
    streak?: number;
    totalMinutes?: number;
    interviewsCount?: number;
    wordsLearned?: number;
    speakingSessions?: number;
    bestSpeakingScore?: number;
    bestInterviewScore?: number;
    dailyChallengeStreak?: number;
  }) => Promise<void>;
  claimDailyLogin: () => Promise<PendingReward | null>;
  popReward: () => PendingReward | null;
  reset: () => Promise<void>;
}

const defaultState: GamificationState = {
  xp: 0,
  coins: 0,
  unlockedBadgeIds: [],
  lastDailyLoginDate: '',
  dailyLoginStreak: 0,
  pendingRewards: [],
};

const Ctx = createContext<GamificationCtx | undefined>(undefined);

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GamificationState>(defaultState);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.GAMIFICATION);
      if (raw) {
        try {
          setState({ ...defaultState, ...JSON.parse(raw) });
        } catch {
          /* noop */
        }
      }
    })();
  }, []);

  const persist = useCallback(async (next: GamificationState) => {
    setState(next);
    await AsyncStorage.setItem(STORAGE_KEYS.GAMIFICATION, JSON.stringify(next));
  }, []);

  const addXp = useCallback(
    async (amount: number) => {
      if (amount <= 0) return;
      const prevLevel = getLevelByXp(state.xp);
      const newXp = state.xp + amount;
      const newLevel = getLevelByXp(newXp);
      const next = { ...state, xp: newXp };
      if (newLevel.id > prevLevel.id) {
        next.pendingRewards = [
          ...next.pendingRewards,
          {
            id: `lvl-${newLevel.id}-${Date.now()}`,
            title: `Level Up! ${newLevel.name}`,
            description: newLevel.perks[0] || 'You leveled up!',
            xp: 0,
            coins: 50,
            icon: newLevel.badge,
            color: newLevel.color,
            kind: 'level-up',
          },
        ];
        next.coins = next.coins + 50;
      }
      await persist(next);
    },
    [state, persist]
  );

  const addCoins = useCallback(
    async (amount: number) => {
      if (amount <= 0) return;
      await persist({ ...state, coins: state.coins + amount });
    },
    [state, persist]
  );

  const awardAction = useCallback(
    async (action: keyof typeof XP_REWARDS) => {
      const xp = XP_REWARDS[action];
      const coinKey = action as keyof typeof COIN_REWARDS;
      const coins = (COIN_REWARDS as Record<string, number>)[coinKey] || 0;
      const prevLevel = getLevelByXp(state.xp);
      const newXp = state.xp + xp;
      const newLevel = getLevelByXp(newXp);
      const next = { ...state, xp: newXp, coins: state.coins + coins };
      if (newLevel.id > prevLevel.id) {
        next.pendingRewards = [
          ...next.pendingRewards,
          {
            id: `lvl-${newLevel.id}-${Date.now()}`,
            title: `Level Up! ${newLevel.name}`,
            description: newLevel.perks[0] || 'You leveled up!',
            xp: 0,
            coins: 50,
            icon: newLevel.badge,
            color: newLevel.color,
            kind: 'level-up',
          },
        ];
        next.coins += 50;
      }
      await persist(next);
    },
    [state, persist]
  );

  const checkBadges = useCallback(
    async (stats: Record<string, number | undefined>) => {
      const newlyUnlocked: string[] = [];
      const newRewards: PendingReward[] = [];
      let xpGain = 0;
      let coinGain = 0;
      const currentLevel = getLevelByXp(state.xp);
      const effectiveStats: Record<string, number> = { ...stats, level: currentLevel.id } as Record<string, number>;

      for (const badge of BADGES) {
        if (state.unlockedBadgeIds.includes(badge.id)) continue;
        const val = effectiveStats[badge.criteria.type];
        if (typeof val === 'number' && val >= badge.criteria.threshold) {
          newlyUnlocked.push(badge.id);
          xpGain += badge.xpReward;
          coinGain += badge.coinReward;
          newRewards.push({
            id: `badge-${badge.id}-${Date.now()}`,
            title: `Badge Unlocked: ${badge.title}`,
            description: badge.description,
            xp: badge.xpReward,
            coins: badge.coinReward,
            icon: badge.icon as string,
            color: badge.color,
            kind: 'badge',
          });
        }
      }
      if (newlyUnlocked.length === 0) return;
      const next: GamificationState = {
        ...state,
        unlockedBadgeIds: [...state.unlockedBadgeIds, ...newlyUnlocked],
        xp: state.xp + xpGain,
        coins: state.coins + coinGain,
        pendingRewards: [...state.pendingRewards, ...newRewards],
      };
      await persist(next);
    },
    [state, persist]
  );

  const claimDailyLogin = useCallback(async (): Promise<PendingReward | null> => {
    const today = todayKey();
    if (state.lastDailyLoginDate === today) return null;
    const isConsecutive =
      state.lastDailyLoginDate &&
      new Date(today).getTime() - new Date(state.lastDailyLoginDate).getTime() <= 86400000 * 1.5;
    const streak = isConsecutive ? state.dailyLoginStreak + 1 : 1;
    const reward: PendingReward = {
      id: `login-${today}`,
      title: `Daily Reward Day ${streak}`,
      description: `Welcome back! +${XP_REWARDS.DAILY_LOGIN} XP, +${COIN_REWARDS.DAILY_LOGIN} coins`,
      xp: XP_REWARDS.DAILY_LOGIN,
      coins: COIN_REWARDS.DAILY_LOGIN,
      icon: 'gift',
      color: '#FACC15',
      kind: 'daily-login',
    };
    const next: GamificationState = {
      ...state,
      lastDailyLoginDate: today,
      dailyLoginStreak: streak,
      xp: state.xp + reward.xp,
      coins: state.coins + reward.coins,
      pendingRewards: [...state.pendingRewards, reward],
    };
    await persist(next);
    return reward;
  }, [state, persist]);

  const popReward = useCallback((): PendingReward | null => {
    if (state.pendingRewards.length === 0) return null;
    const [head, ...rest] = state.pendingRewards;
    persist({ ...state, pendingRewards: rest }).catch(() => {});
    return head;
  }, [state, persist]);

  const reset = useCallback(async () => {
    await persist(defaultState);
  }, [persist]);

  const level = useMemo(() => getLevelByXp(state.xp), [state.xp]);
  const nextLevel = useMemo(() => getNextLevel(state.xp), [state.xp]);
  const progressToNext = useMemo(() => {
    if (!nextLevel) return 1;
    const span = nextLevel.minXp - level.minXp;
    if (span <= 0) return 1;
    return Math.max(0, Math.min(1, (state.xp - level.minXp) / span));
  }, [state.xp, level, nextLevel]);

  return (
    <Ctx.Provider
      value={{
        state,
        level,
        nextLevel,
        progressToNext,
        addXp,
        addCoins,
        awardAction,
        checkBadges,
        claimDailyLogin,
        popReward,
        reset,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useGamification(): GamificationCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useGamification must be used within GamificationProvider');
  return ctx;
}

export { LEVELS };
