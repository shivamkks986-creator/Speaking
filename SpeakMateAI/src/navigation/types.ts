import { NavigatorScreenParams } from '@react-navigation/native';

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
  Progress: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  Vocabulary: undefined;
  Favorites: undefined;
  MockInterview: undefined;
  InterviewSession: { questionId?: string };
  Premium: undefined;
  Profile: undefined;
  NotificationPrefs: undefined;
  PrivacyPolicy: undefined;
};
