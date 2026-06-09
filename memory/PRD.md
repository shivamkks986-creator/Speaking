# SpeakMate AI — Product Requirements Document

## Vision
Premium AI-powered English learning + Interview coaching app for Indian users.
**Tagline:** "Speak Better. Get Hired Faster."

## Target Users
- College students, freshers, job seekers
- Working professionals upgrading interview skills
- IELTS aspirants
- Anyone improving spoken English

## Core Features (Implemented)

### 🎨 Branding & Visual
- ✅ Premium dark theme (deep purple #0A0418 / #150828 / #1F0E3D)
- ✅ Glassmorphism cards + neon accent gradients
- ✅ AI-generated app icon (Diamond + Speech Bubble, purple gradient, 1024x1024)
- ✅ AI-generated splash screen with ambient glow
- ✅ Adaptive icon (Android) + favicon (web)
- ✅ Premium tagline updated everywhere

### 👋 Onboarding (NEW)
- ✅ 5 swipeable slides — Improve English / AI Tutors / Interviews / Streaks / Premium
- ✅ Skip + Continue + animated dots, gradient icon ring with glow halos
- ✅ One-time only (AsyncStorage flag `onboarding.completed`)
- ✅ Auto-routes to Welcome on completion

### 🤖 AI Tutor (Enhanced)
- ✅ ChatGPT-style chat with companion avatar
- ✅ Voice in + voice out (OpenAI TTS + Whisper STT)
- ✅ Typing indicator
- ✅ **NEW: Quick action chips** — Fix my grammar / Improve sentence / Explain meaning / Translate Hindi → English
- ✅ Suggested starters
- ✅ Hindi + English support

### 🎤 Speaking Practice
- ✅ Real-time scoring (Pronunciation / Fluency / Grammar)
- ✅ Score ring + sub-score breakdown
- ✅ AI feedback card with quick wins
- ✅ **NEW: Viral Share Score Card** — WhatsApp / Instagram / More

### 💼 Interview System (Flagship)
- ✅ 11 tracks: HR · Tech · Fresher · Experienced · Sales · Manager · Customer Support · Business Analyst …
- ✅ Live voice interview mode (Whisper STT + AI evaluation)
- ✅ 6-axis evaluation: Communication / Confidence / Content / Fluency / Grammar / Relevance
- ✅ Strengths + suggestions in result
- ✅ **NEW: Viral Share Score Card** on results

### 💎 Premium Subscription
- ✅ Pricing tiers updated: **Monthly ₹99 · Quarterly ₹249 · Yearly ₹999**
- ✅ 7-day free trial messaging
- ✅ **NEW: Free vs Premium comparison table**
- ✅ Benefits list (Unlimited AI · IELTS Mode · Resume Review · Premium Voices · Progress Reports)
- ⚠️ Real Google Play Billing — **MOCKED**, needs Play Console product setup

### 🏆 Gamification
- ✅ XP, Levels, Badges, Coins, Daily login streak
- ✅ Daily Missions
- ✅ **NEW: Leaderboard (Firestore-backed with mock fallback, podium UI)**
- ✅ Achievements / unlocked-badges screen

### 🔁 Viral Growth (NEW)
- ✅ **Invite Friends screen** — Referral code (`SM{uid6}`), WhatsApp + Instagram share, 7-day Premium reward messaging
- ✅ **Share Score Cards** embedded in Speaking & Interview results
- ✅ Pre-filled message templates with hashtags
- ✅ Clipboard copy support (`expo-clipboard`)

### 📊 Home Page
- ✅ Daily goal progress, streak, badges, XP bar
- ✅ Companion hero card with conversation CTA
- ✅ Premium dashboard preview
- ✅ Quick actions grid
- ✅ **NEW: Leaderboard + Invite Friends tiles**

## Tech Stack
- **Mobile:** React Native + Expo SDK 54 (CNG via `expo prebuild` for Android Studio)
- **Backend:** FastAPI + Multi-agent LLM (GPT-5.2, Claude 4.5, Gemini 3 Flash)
- **Auth/DB:** Firebase Auth + Firestore
- **Voice:** OpenAI TTS-1 + Whisper-1
- **Build:** Android Gradle 8.13, Target SDK 35, Hermes

## Production Build
- Standalone Release APK via Android Studio: `Build → Build APK(s)` with `release` variant
- Output: `D:\rn\SpeakMateAI\android\app\build\outputs\apk\release\app-release.apk`
- ProGuard/Shrink: temporarily disabled to avoid obfuscation issues
- App ID: `com.speakmate.ai`

## Roadmap (P1)
- Real Google Play Billing integration (`react-native-iap` + Play Console products)
- Firebase Analytics events tracking
- Streak Freeze logic (spend coins to protect streak)
- Resume-based interviews + PDF export of interview reports
- Notification scheduling for daily missions

## Roadmap (P2)
- Group challenges + friend leaderboards
- Pronunciation phoneme-level analysis
- Live group interview rooms (multi-user)
- Apple App Store deployment

## Pricing Strategy
| Tier      | Price | Notes |
|-----------|-------|-------|
| Free      | ₹0    | 5 chats · 3 voice · 1 interview / day |
| Monthly   | ₹99   | Unlimited everything |
| Quarterly | ₹249  | Save 16%, most popular |
| Yearly    | ₹999  | Save 16%, best value |

7-day free trial on all paid plans.

## Test Credentials
Firebase Auth — created by user during signup. No seed accounts.

## Key Files (Updated in this iteration)
- `/app/SpeakMateAI/assets/icon.png`, `splash.png`, `adaptive-icon.png`, `favicon.png` (AI-generated)
- `/app/SpeakMateAI/src/screens/onboarding/OnboardingScreen.tsx` (NEW)
- `/app/SpeakMateAI/src/screens/gamification/LeaderboardScreen.tsx` (NEW)
- `/app/SpeakMateAI/src/screens/gamification/InviteFriendsScreen.tsx` (NEW)
- `/app/SpeakMateAI/src/components/feature/ShareScoreCard.tsx` (NEW)
- `/app/SpeakMateAI/src/navigation/AuthNavigator.tsx` (Onboarding first-run flow)
- `/app/SpeakMateAI/src/navigation/RootNavigator.tsx` (+Leaderboard, +InviteFriends)
- `/app/SpeakMateAI/src/services/billingService.ts` (₹99/249/999)
- `/app/SpeakMateAI/src/screens/premium/PremiumScreen.tsx` (Free vs Premium table)
- `/app/SpeakMateAI/src/screens/tutor/AITutorScreen.tsx` (Quick action chips)
- `/app/SpeakMateAI/src/screens/home/HomeScreen.tsx` (+Social row)
- `/app/SpeakMateAI/src/screens/speaking/SpeakingScoreScreen.tsx` (+ShareScoreCard)
- `/app/SpeakMateAI/src/screens/interview/InterviewResultsScreen.tsx` (+ShareScoreCard)
- `/app/SpeakMateAI/src/utils/constants.ts` (Tagline update)
- `/app/SpeakMateAI/package.json` (+expo-clipboard, pinned `@expo/vector-icons@15.0.3` & `expo-font@14.0.12`)
