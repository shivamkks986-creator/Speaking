// Achievement badges — unlockable rewards for various milestones
import { Ionicons } from '@expo/vector-icons';

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  gradient: [string, string];
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  criteria: {
    type:
      | 'streak'
      | 'totalMinutes'
      | 'interviewsCount'
      | 'wordsLearned'
      | 'speakingSessions'
      | 'level'
      | 'bestSpeakingScore'
      | 'bestInterviewScore'
      | 'dailyChallengeStreak';
    threshold: number;
  };
  xpReward: number;
  coinReward: number;
}

export const BADGES: Badge[] = [
  // Streaks
  { id: 'streak_3',  title: 'Spark',         description: '3-day streak',  icon: 'flame',           color: '#FACC15', gradient: ['#FACC15', '#F97316'], rarity: 'common',   criteria: { type: 'streak', threshold: 3 },  xpReward: 30,  coinReward: 5 },
  { id: 'streak_7',  title: 'Week Warrior',  description: '7-day streak',  icon: 'flame',           color: '#F97316', gradient: ['#F97316', '#EF4444'], rarity: 'rare',     criteria: { type: 'streak', threshold: 7 },  xpReward: 100, coinReward: 25 },
  { id: 'streak_30', title: 'Unstoppable',   description: '30-day streak', icon: 'flash',           color: '#7C5CFF', gradient: ['#7C5CFF', '#FF6B9D'], rarity: 'epic',     criteria: { type: 'streak', threshold: 30 }, xpReward: 500, coinReward: 100 },

  // Activity
  { id: 'first_chat',     title: 'First Word',     description: 'Send your first chat message', icon: 'chatbubble-ellipses', color: '#22D3EE', gradient: ['#22D3EE', '#7C5CFF'], rarity: 'common', criteria: { type: 'wordsLearned', threshold: 1 }, xpReward: 20, coinReward: 5 },
  { id: 'vocab_50',       title: 'Wordsmith',      description: 'Learn 50 words',               icon: 'book',                color: '#34D399', gradient: ['#34D399', '#22D3EE'], rarity: 'rare',   criteria: { type: 'wordsLearned', threshold: 50 }, xpReward: 150, coinReward: 30 },

  // Speaking
  { id: 'speaking_5',     title: 'Voice Found',    description: '5 speaking sessions',          icon: 'mic',                 color: '#FF6B9D', gradient: ['#FF6B9D', '#7C5CFF'], rarity: 'common', criteria: { type: 'speakingSessions', threshold: 5 }, xpReward: 50, coinReward: 15 },
  { id: 'speak_score_90', title: 'Eloquent',       description: 'Speaking score 90+',           icon: 'mic-circle',          color: '#FACC15', gradient: ['#FACC15', '#FF6B9D'], rarity: 'epic',   criteria: { type: 'bestSpeakingScore', threshold: 90 }, xpReward: 200, coinReward: 50 },

  // Interviews
  { id: 'interview_1',    title: 'Interview Brave', description: 'First mock interview',       icon: 'briefcase',           color: '#7C5CFF', gradient: ['#7C5CFF', '#A992FF'], rarity: 'common', criteria: { type: 'interviewsCount', threshold: 1 }, xpReward: 50, coinReward: 15 },
  { id: 'interview_5',    title: 'Mock Master',    description: '5 mock interviews',           icon: 'briefcase',           color: '#5B3FE0', gradient: ['#5B3FE0', '#22D3EE'], rarity: 'rare',   criteria: { type: 'interviewsCount', threshold: 5 }, xpReward: 200, coinReward: 50 },
  { id: 'interview_score_90', title: 'Hireable',  description: 'Interview score 90+',          icon: 'ribbon',              color: '#FACC15', gradient: ['#FACC15', '#F97316'], rarity: 'legendary', criteria: { type: 'bestInterviewScore', threshold: 90 }, xpReward: 500, coinReward: 150 },

  // Level
  { id: 'lvl_3', title: 'Speaker Tier',    description: 'Reach Speaker level',      icon: 'star',          color: '#7C5CFF', gradient: ['#7C5CFF', '#FF6B9D'], rarity: 'rare', criteria: { type: 'level', threshold: 3 }, xpReward: 100, coinReward: 25 },
  { id: 'lvl_6', title: 'Master Crown',    description: 'Reach Master Speaker',     icon: 'trophy',        color: '#FACC15', gradient: ['#FACC15', '#F59E0B'], rarity: 'legendary', criteria: { type: 'level', threshold: 6 }, xpReward: 1000, coinReward: 500 },
];

export const getBadgeById = (id: string): Badge | undefined => BADGES.find((b) => b.id === id);
