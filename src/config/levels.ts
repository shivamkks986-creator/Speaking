// Level system + XP rewards configuration
export interface Level {
  id: number;
  name: string;
  minXp: number;
  maxXp: number;
  badge: string;
  color: string;
  perks: string[];
}

export const LEVELS: Level[] = [
  { id: 1, name: 'Beginner',       minXp: 0,    maxXp: 100,   badge: '🌱', color: '#34D399', perks: ['Unlock Alex tutor'] },
  { id: 2, name: 'Explorer',       minXp: 100,  maxXp: 300,   badge: '🧭', color: '#22D3EE', perks: ['Unlock Emma'] },
  { id: 3, name: 'Speaker',        minXp: 300,  maxXp: 700,   badge: '🎤', color: '#7C5CFF', perks: ['Daily streak bonus'] },
  { id: 4, name: 'Communicator',   minXp: 700,  maxXp: 1500,  badge: '💬', color: '#FF6B9D', perks: ['+50% XP weekends'] },
  { id: 5, name: 'Influencer',     minXp: 1500, maxXp: 3000,  badge: '⭐', color: '#FACC15', perks: ['Exclusive challenges'] },
  { id: 6, name: 'Master Speaker', minXp: 3000, maxXp: 99999, badge: '👑', color: '#F97316', perks: ['Master crown badge'] },
];

export const getLevelByXp = (xp: number): Level => {
  return [...LEVELS].reverse().find((l) => xp >= l.minXp) || LEVELS[0];
};

export const getNextLevel = (xp: number): Level | null => {
  const current = getLevelByXp(xp);
  return LEVELS.find((l) => l.id === current.id + 1) || null;
};

// XP rewards per action
export const XP_REWARDS = {
  CHAT_MESSAGE: 5,
  SPEAKING_SESSION: 25,
  INTERVIEW_QUESTION: 15,
  INTERVIEW_SESSION_COMPLETE: 100,
  VOCAB_WORD_LEARNED: 10,
  DAILY_CHALLENGE: 50,
  DAILY_LOGIN: 20,
  STREAK_7: 100,
  STREAK_30: 500,
  PERFECT_SCORE_BONUS: 30, // overall >= 90
};

export const COIN_REWARDS = {
  CHAT_MESSAGE: 1,
  SPEAKING_SESSION: 5,
  INTERVIEW_SESSION_COMPLETE: 25,
  DAILY_CHALLENGE: 10,
  DAILY_LOGIN: 5,
  STREAK_MILESTONE: 50,
};
