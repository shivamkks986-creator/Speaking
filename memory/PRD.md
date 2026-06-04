# SpeakMate AI — PRD

## Problem Statement
Build a production-ready Android app called "SpeakMate AI" to help Indian users improve spoken English through AI conversations, grammar correction, pronunciation practice, vocabulary building, and mock interviews.

## Tech Stack
- React Native 0.81 + Expo SDK 54 (upgraded from SDK 51)
- TypeScript (strict)
- React Navigation 7 (Stack + Bottom Tabs)
- React Native Paper (Material Design 3)
- Firebase (Auth + Firestore) — user-provided credentials
- expo-av / expo-speech / expo-notifications / expo-haptics / expo-linear-gradient
- Reanimated 4 + react-native-worklets + Gesture Handler 2.28
- AsyncStorage for local persistence
- **FastAPI backend** (Emergent platform) with `emergentintegrations` for multi-LLM routing
- **EMERGENT_LLM_KEY** (universal key) routes to OpenAI/Anthropic/Google

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

## Upgrade — Phase 2 (2026-01)
- ✅ **59 total TypeScript files** — zero compile errors, zero lint warnings (added 10 new)
- ✅ **AI Interview Coach** tab — 3 tracks (HR, Fresher, Technical) with gradient cards, lock state for Technical (premium gate)
- ✅ **Interview Results Screen** with `ScoreRing` (SVG ring chart), Communication / Confidence / Content sub-scores, Strengths list, Improvement Suggestions list, per-question review with progress bars
- ✅ **`aiService.scoreInterviewSession`** — computes communication (grammar-aware), confidence (length/filler aware), content scores + actionable suggestions + strengths
- ✅ **`aiService.computeInterviewReadiness`** — combined score from interviews count + best score + speaking avg + streak
- ✅ **Daily Speaking Challenge** screen — 7 rotating prompts (fluency/pronunciation/vocab/confidence focus), animated timer auto-stop, separate daily challenge streak
- ✅ **Speaking Score Screen** — detailed view with ring chart, sub-scores, AI feedback, quick wins tips
- ✅ **Pronunciation Practice Screen** — 3 daily drills with phonetic, IPA, tip, example, normal & slow TTS playback, mark-as-practised tracking
- ✅ **Dashboard upgrade** — `ReadinessCard` (SVG ring) + `SpeakingProgressCard` (avg/best/sessions + sparkline) injected on Home; Premium badge next to user name
- ✅ **Speaking screen upgrade** — Daily Challenge + Pronunciation Practice shortcut banners at the top
- ✅ **Premium tab** in bottom nav with diamond icon
- ✅ **Interview tab** in bottom nav with briefcase icon
- ✅ **Premium Badge** component reused across Home and Settings
- ✅ **ProgressContext upgrade** — speakingScores (rolling 10), bestSpeakingScore, bestInterviewScore, dailyChallengeStreak, dailyChallengeCompletedDate + new methods (recordSpeakingScore, recordInterviewScore, recordDailyChallenge)
- ✅ **InterviewSessionScreen rewrite** — accepts `track` param, on finish calls `scoreInterviewSession`, navigates to new `InterviewResults` screen
- ✅ **New components**: PremiumBadge, ScoreRing (SVG-based), SpeakingProgressCard, ReadinessCard
- ✅ Existing features fully preserved — MockInterview accessible via stack, all old routes intact

## Prioritized Backlog
### Done (Feb 2026)
- ✅ Upgraded local project to Expo SDK 54 + Reanimated 4 + React 19.1 + RN 0.81
- ✅ Firebase Auth + Firestore wired by user with their credentials
- ✅ App running successfully on physical Android via Expo Go
- ✅ **Multi-agent AI backend** deployed: GPT-5.2 (Tutor/Interview) + Claude Sonnet 4.6 (Speaking/Daily Challenge) + Gemini 3 Flash (Vocabulary)
- ✅ `aiService.ts` refactored to call backend with mock fallback on network errors
- ✅ Notification service updated for SDK 54 trigger API
- ✅ **Premium AI Companion Upgrade (Feb 2026)**:
  - Dark theme with purple gradients + glassmorphism cards
  - 5 AI companions (Alex/Emma/Sophia/Ryan/Maya) with unique personalities, gradients, system prompts
  - Companion-aware tutor chat (backend accepts `system_prompt` per companion)
  - Companion selection screen + companions strip on Home
  - Gamification system: XP, coins, 6 levels (Beginner→Master Speaker), 11 achievement badges
  - Reward modal (level-up, badge unlock, daily login celebration)
  - Animated voice mic button with listening/thinking/speaking states
  - Voice call screen with companion avatar + TTS via expo-speech
  - Achievements screen (badges grid + level chips)
  - Premium dashboard (Speaking/Confidence/Pronunciation/Grammar scores + weekly chart)
  - Premium subscription screen redesigned (Monthly/Quarterly/Annual + 7-day free trial highlight)
  - Modern AI Tutor chat (typing dots, message bubbles with corrections/suggestions, companion avatar header)
  - Home screen redesigned (companion greeting, XP bar, daily goal, quick actions, premium CTA)
  - XP rewards wired into Speaking, Interview, Daily Challenge flows
  - Badge auto-checking on key milestones
- ✅ **Production Voice + Missions Update (Feb 2026)**:
  - **OpenAI TTS (tts-1)** integrated — natural human-like voices per companion (echo/shimmer/nova/onyx/coral)
  - **OpenAI Whisper STT** integrated — real speech-to-text from device microphone
  - VoiceCallScreen now uses real STT (Whisper) + real TTS (OpenAI) replacing robotic expo-speech
  - Voice speed control (0.75x / 1.0x / 1.25x) in voice call header
  - AI Tutor chat bubbles got a "Play" button to listen to AI response in companion voice
  - Daily Missions screen (5 daily tasks with XP/coin rewards + progress bars)
  - Flashcards screen (flip animation, AI-powered word lookup, listen-to-pronunciation button)
  - Bottom tab bar fixed: floating glass dock with proper SafeArea bottom inset
  - All screens updated with `paddingBottom: 140` to clear tab bar
  - `speechService.ts` rewritten with `speakWithAI` (OpenAI voices) + `transcribe` (Whisper) + fallback to device TTS

### P0 (next)
- Test all real-AI flows end-to-end on phone (Tutor chat, Speaking score, Interview eval/followup/session, Vocabulary lookup, Daily Challenge)
- User needs to add `EXPO_PUBLIC_BACKEND_URL` to local `.env` file and copy new `aiService.ts` + `notificationService.ts`

### P1
- Wire real Speech-to-Text (OpenAI Whisper via backend) inside `speechService`
- Integrate `expo-in-app-purchases` / `react-native-iap` for Google Play Billing
- Persist tutor chat history in MongoDB (currently session memory only)
- Push Firestore-backed sync for streaks & favorites across devices

### P2
- Onboarding carousel
- Leaderboard / social practice
- Streak-saver "freeze" mechanic
- More interview tracks (Sales, Behavioural deep-dive)

## AI Backend Endpoints
- `POST /api/ai/tutor/chat` — GPT-5.2, multi-turn with `session_id`
- `POST /api/ai/speaking/score` — Claude Sonnet 4.6, JSON scoring
- `POST /api/ai/interview/evaluate` — GPT-5.2, per-answer scoring
- `POST /api/ai/interview/followup` — GPT-5.2, dynamic follow-up question
- `POST /api/ai/interview/score-session` — GPT-5.2, full session report
- `POST /api/ai/vocabulary/lookup` — Gemini 3 Flash, word lookup + Hindi
- `POST /api/ai/daily-challenge/evaluate` — Claude Sonnet 4.6, writing eval

## Notes
- AI is now **REAL** via Emergent LLM Key (multi-model routing in `/app/backend/ai_routes.py`)
- Mobile app needs `EXPO_PUBLIC_BACKEND_URL` env var to reach backend
- Firebase config now uses **REAL VALUES** (user added their own)
- Google Play Billing is still **PLACEHOLDER ONLY**
- Google Sign-In still requires `webClientId` configuration
