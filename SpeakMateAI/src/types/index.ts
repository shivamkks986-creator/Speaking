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
  vocab?: { word: string; meaning: string; hindi?: string | null };
  followup?: string;
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

export type InterviewTrack =
  | 'hr'
  | 'fresher'
  | 'technical'
  | 'experienced'
  | 'business_analyst'
  | 'sales'
  | 'customer_support'
  | 'software_engineer'
  | 'data_analyst'
  | 'marketing'
  | 'banking';

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
  fluencyScore?: number;
  grammarScore?: number;
  relevanceScore?: number;
  professionalismScore?: number;
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
  vocabulary?: number;
  confidence?: number;
  mistakes?: string[];
  corrected?: string;
  suggested?: string;
  strengths?: string[];
  weaknesses?: string[];
  next_goal?: string;
  action_plan?: string[];
  feedback: string;
}

// "Tell Me About Yourself" trainer ----------------------------------------
export interface TmayEvaluation {
  overall: number;
  structure: number;
  clarity: number;
  confidence: number;
  relevance: number;
  impact: number;
  has_hook: boolean;
  has_past: boolean;
  has_present: boolean;
  has_future: boolean;
  filler_words: string[];
  strengths: string[];
  weaknesses: string[];
  missing_elements: string[];
  polished_version: string;
  next_goal: string;
  feedback: string;
}

// 30-Day Job Ready Roadmap ------------------------------------------------
export type RoadmapFocus =
  | 'speaking' | 'vocabulary' | 'tmay' | 'interview'
  | 'resume' | 'grammar' | 'confidence' | 'listening';

export interface RoadmapDay {
  day: number;
  title: string;
  focus: RoadmapFocus | string;
  tasks: string[];
  tip: string;
}

export interface JobRoadmap {
  summary: string;
  goal_title: string;
  days: RoadmapDay[];
  createdAt: number;
  roleTarget?: string;
  currentLevel?: string;
  completedDays: number[]; // array of day numbers user has marked done
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
