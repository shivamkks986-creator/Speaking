export const APP_NAME = 'SpeakMate AI';
export const TAGLINE = 'Speak English with confidence';

export const STORAGE_KEYS = {
  THEME_MODE: '@speakmate/theme_mode',
  PROGRESS: '@speakmate/progress',
  FAV_WORDS: '@speakmate/fav_words',
  ONBOARDING_DONE: '@speakmate/onboarding_done',
  NOTIFICATION_PREFS: '@speakmate/notification_prefs',
  CHAT_HISTORY: '@speakmate/chat_history',
  GAMIFICATION: '@speakmate/gamification',
  SELECTED_COMPANION: '@speakmate/selected_companion',
  LAST_DAILY_LOGIN: '@speakmate/last_daily_login',
};

export const FREE_LIMITS = {
  DAILY_CHATS: 10,
  DAILY_SPEAKING: 3,
  INTERVIEWS_PER_WEEK: 1,
};

export const PRIVACY_POLICY_TEXT = `
SpeakMate AI Privacy Policy

Last updated: January 2026

1. Information We Collect
We collect the email address, display name, and profile photo you provide during signup, and learning activity data (streaks, scores, vocabulary saved) to improve your experience.

2. How We Use Your Data
- To personalize your learning experience.
- To sync your progress across devices.
- To send opt-in reminders.

3. Data Storage
Your data is securely stored in Firebase. You can delete your account anytime from Settings → Profile.

4. Audio Recordings
Voice recordings are processed on-device and are not uploaded unless you explicitly enable cloud sync. They are auto-deleted after each session.

5. Children's Privacy
SpeakMate AI is not intended for children under 13.

6. Contact
For any privacy concerns, email support@speakmate.ai
`.trim();
