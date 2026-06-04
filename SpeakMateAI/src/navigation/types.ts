import { NavigatorScreenParams } from '@react-navigation/native';
import { InterviewResult, InterviewTrack, SpeakingScore } from '@/types';

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Tutor: undefined;
  Speaking: undefined;
  Interview: undefined;
  Premium: undefined;
  Progress: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  Vocabulary: undefined;
  Favorites: undefined;
  MockInterview: undefined;
  InterviewSession: { questionId?: string; track?: InterviewTrack };
  InterviewResults: { result: InterviewResult };
  DailyChallenge: undefined;
  SpeakingScore: { score: SpeakingScore; challengeId?: string };
  PronunciationPractice: undefined;
  Premium: undefined;
  Profile: undefined;
  NotificationPrefs: undefined;
  PrivacyPolicy: undefined;
  Companions: undefined;
  Achievements: undefined;
  VoiceCall: undefined;
  PremiumDashboard: undefined;
};
