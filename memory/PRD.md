# SpeakMate AI — PRD

## Problem Statement
Build a production-ready Android app called "SpeakMate AI" to help Indian users improve spoken English through AI conversations, grammar correction, pronunciation practice, vocabulary building, and mock interviews.

## Tech Stack
- React Native 0.74 + Expo SDK 51
- TypeScript (strict)
- React Navigation 6 (Stack + Bottom Tabs)
- React Native Paper (Material Design 3)
- Firebase (Auth + Firestore) — placeholder config
- expo-av / expo-speech / expo-notifications / expo-haptics / expo-linear-gradient
- Reanimated 3 + Gesture Handler
- AsyncStorage for local persistence

## User Personas
- **Aspiring professional** — wants to crack HR interviews, sound confident at work
- **College student** — wants daily English practice for placements
- **Self-improver** — wants to convert Hindi thoughts into fluent English

## Core Requirements (static)
1. Email + Google authentication, forgot password
2. AI chat tutor with grammar correction & Hindi→English help
3. Voice recording + pronunciation/fluency/grammar scoring
4. Daily vocabulary with examples + favorites
5. HR mock interviews with per-question AI feedback & overall score
6. Progress dashboard (streak, weekly chart, totals)
7. Premium subscription screen + Play Billing placeholders
8. Daily + streak notification reminders
9. Settings: profile, theme (light/dark/system), notification prefs, privacy policy
10. Android-optimized Material Design 3 UI with light/dark mode

## Architecture
```
SpeakMateAI/
├── App.tsx                 # Providers + RootNavigator
├── src/
│   ├── config/             # firebase, theme (M3 colors, navigation themes)
│   ├── contexts/           # AuthContext, ThemeContext, ProgressContext
│   ├── navigation/         # Root (auth-gated), Auth stack, Main bottom tabs
│   ├── screens/            # 17 screens grouped by feature
│   ├── components/         # common (Card, EmptyState, ErrorState, LoadingScreen, ScreenContainer, GradientCard) + feature (ChatBubble, VocabCard, StreakBadge)
│   ├── services/           # aiService (mock), authService (Firebase), firestoreService, speechService, billingService, notificationService
│   ├── data/               # vocabulary seed, interview question bank
│   ├── utils/              # constants, validators, helpers
│   └── types/              # domain TypeScript types
```

## What's Been Implemented (2026-01)
- ✅ **49 TypeScript files** — zero compile errors, zero lint warnings
- ✅ Complete navigation tree (Auth → Welcome/Login/Signup/Forgot, Main Tabs → Home/Tutor/Speaking/Progress/Settings + 8 stack screens)
- ✅ Light + Dark + System theme (Material Design 3) with persisted preference
- ✅ Firebase Auth integration (Email/Password + Google placeholder + Password reset + Profile updates) with AsyncStorage persistence
- ✅ AI Tutor chat — typing indicator, empty state, grammar correction, Hindi→English help, "better phrasing" suggestions
- ✅ Speaking practice — animated pulsing record button, expo-av recording, timer, AI scoring (pronunciation/fluency/grammar), feedback card
- ✅ Vocabulary — 12 seeded words, level filter, English+Hindi meaning, TTS playback, favorites with AsyncStorage
- ✅ Mock Interview — full flow with 5–10 questions, AI evaluation per answer, final aggregated score & summary cards
- ✅ Progress Dashboard — streak hero, 4 metric cards, custom weekly bar chart, weekly summary
- ✅ Premium screen — 3 plans (Monthly/Quarterly/Yearly), benefit list, popular badge, restore purchases, Play Billing service abstraction
- ✅ Notifications — daily 7PM reminder + 9:30PM streak reminder using expo-notifications
- ✅ Settings — profile editor, theme switcher (light/dark/system), notification prefs, privacy policy, sign out
- ✅ Streak logic — automatic via ProgressContext (today/yesterday/break detection) persisted to AsyncStorage
- ✅ `data-testid`/`testID` on all interactive elements
- ✅ Loading + Empty + Error states throughout
- ✅ Path aliases (`@/`) configured via babel-plugin-module-resolver
- ✅ Production-ready `app.json` (icon, splash, adaptive icon, RECORD_AUDIO permission, plugins)
- ✅ Complete README with setup, Firebase instructions, EAS build commands

## Prioritized Backlog
### P0 (next)
- Wire real Firebase project credentials (user action)
- Wire Google Sign-In webClientId (user action)
- Test on physical Android via Expo Go

### P1
- Replace mock AI with real LLM (OpenAI/Gemini/Claude) — keep `aiService` interface unchanged
- Implement real STT (OpenAI Whisper / Google Cloud STT) inside `speechService`
- Integrate `expo-in-app-purchases` or `react-native-iap` in `billingService`
- Push Firestore-backed sync for streaks & favorites across devices

### P2
- Onboarding carousel
- Leaderboard / social practice
- Daily quizzes & spaced repetition for vocabulary
- Streak-saver "freeze" mechanic
- More interview tracks (Technical, Behavioural, Sales)

## Delivery
Code lives at `/app/SpeakMateAI/`. User clones via GitHub and runs:
```bash
cd SpeakMateAI && npm install && npx expo start
```

## Notes
- Real AI is **MOCKED** in `src/services/aiService.ts` (rule-based grammar + scoring)
- Firebase config uses **PLACEHOLDER VALUES** — user must replace in `src/config/firebase.ts`
- Google Play Billing is **PLACEHOLDER ONLY** — `billingService.purchase()` returns "not configured"
- Google Sign-In throws an explanatory error until `webClientId` is configured
- No backend testing performed (this is a mobile RN/Expo project, not a web app — preview environment cannot run it)
