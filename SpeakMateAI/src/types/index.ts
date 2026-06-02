// Core domain types for SpeakMate AI

export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isPremium: boolean;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  correction?: string;
  suggestion?: string;
  timestamp: number;
}

export interface VocabWord {
  id: string;
  word: string;
  meaning: string;
  hindiMeaning: string;
  example: string;
  partOfSpeech: string;
  level: 'beginner' | 'intermediate' | 'advanced';
}

export type InterviewTrack = 'hr' | 'fresher' | 'technical';

export interface InterviewQuestion {
  id: string;
  question: string;
  category: 'introduction' | 'behavioural' | 'technical' | 'situational';
  difficulty: 'easy' | 'medium' | 'hard';
  track?: InterviewTrack;
}

export interface InterviewAnswer {
  questionId: string;
  question: string;
  answer: string;
  score: number;
  feedback: string;
}

export interface InterviewResult {
  track: InterviewTrack;
  overallScore: number;
  communicationScore: number;
  confidenceScore: number;
  contentScore: number;
  suggestions: string[];
  strengths: string[];
  answers: InterviewAnswer[];
  completedAt: number;
}

export interface DailyChallenge {
  id: string;
  title: string;
  prompt: string;
  durationSec: number;
  focus: 'fluency' | 'pronunciation' | 'vocabulary' | 'confidence';
}

export interface PronunciationDrill {
  id: string;
  word: string;
  phonetic: string;
  tip: string;
  example: string;
}

export interface SpeakingScore {
  overall: number;
  pronunciation: number;
  fluency: number;
  grammar: number;
  feedback: string;
}

export interface ProgressStats {
  streak: number;
  longestStreak: number;
  totalMinutes: number;
  wordsLearned: number;
  conversationsCount: number;
  interviewsCount: number;
  lastActiveDate: string;
  weeklyMinutes: number[]; // Mon..Sun
  speakingScores: number[]; // last 10 speaking session overall scores
  bestSpeakingScore: number;
  bestInterviewScore: number;
  dailyChallengeCompletedDate: string;
  dailyChallengeStreak: number;
}

export interface PremiumProduct {
  id: string;
  title: string;
  price: string;
  durationMonths: number;
  savings?: string;
  popular?: boolean;
}
