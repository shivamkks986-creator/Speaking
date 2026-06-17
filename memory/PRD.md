# SpeakMate AI — Product Requirements Document

## Vision
Premium AI-powered English learning + Interview coaching app for Indian users.
**Tagline:** "Speak Better. Get Hired Faster."

## ⚠️ Critical Build Note (Feb 2026)
Due to persistent Windows local-build C++ compilation failures with `react-native-reanimated`, the entire app has been **migrated to stock React Native `Animated` API**. A reusable `FadeInView` helper at `src/components/common/FadeInView.tsx` replaces all `FadeIn / FadeInUp / FadeInDown` entrance animations. `react-native-reanimated` is completely removed from `package.json` and `babel.config.js`. This unblocks the local APK build.

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

### 🛡️ Production Polish (NEW v2)
- ✅ **ErrorBoundary** wrapping the entire app — catches React errors and shows a beautiful recovery UI with "Try Again" button
- ✅ **Skeleton loader** component (animated shimmer) for loading states
- ✅ **Hybrid AI fallback chain** in backend — auto-switches between GPT-5.2 → Claude 4.5 → Gemini 3 Flash if any provider fails
- ✅ **Premium Login + Signup redesign** — gradient hero, trust badges (4.8★ · 50K+ Convos · 1000+ Learners), benefit chips, Google CTA, glass-style fields
- ✅ **Word of the Day** card on Home — 10 curated words rotated daily with phonetic, meaning, usage

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
- Resume-based interviews + PDF upload + AI parsing
- Sales / Counselling trainer modules (Indian market)
- Firebase Admin SDK backend token verification (security against mod APKs)
- Notification scheduling for daily missions + 30-day roadmap reminders

## Phase 1: Career Launchpad (NEW — Feb 2026)
**Goal:** Pivot from pure English-learning to full Communication-Skills + Job-Readiness platform (Duolingo + Unstop + Naukri).

### ✅ Implemented (Phase 1)
- **TMAY Trainer** (`/api/ai/tmay/evaluate`, `src/screens/tmay/TmayTrainerScreen.tsx`)
  - Voice-first 60-second self-introduction practice (Whisper STT → Claude evaluation)
  - 6-axis scoring: Overall · Structure · Clarity · Confidence · Relevance · Impact
  - PPF (Past → Present → Future) coverage chips + hook detection
  - Filler-word detection, strengths/weaknesses/missing-elements lists
  - Polished native-style version with TTS listen button
  - Next-goal coaching line
- **30-Day Job Ready Roadmap** (`/api/ai/roadmap/generate`, `src/screens/roadmap/RoadmapScreen.tsx`)
  - GPT-5.2 generates a personalised 30-day plan based on role target, level, weak areas and daily minutes
  - Hybrid structure: Days 1-10 fundamentals, 11-20 applied practice, 21-30 mock & polish
  - Per-day: focus tag (speaking/vocabulary/tmay/interview/resume/grammar/confidence/listening), 3 actionable tasks (≤15 min), motivational tip
  - Progress tracking with AsyncStorage persistence + per-day mark-done toggle + overall progress bar
- **Unified 5-Axis Speaking Feedback** (`/api/ai/speaking/score`, `src/screens/speaking/SpeakingPracticeScreen.tsx`)
  - Added: confidence (5th score axis), strengths[], weaknesses[], next_goal, action_plan[] alongside existing mistakes/corrected/suggested
  - UI shows new sections with colour-coded cards
- **Home banner + nav shortcuts**: Prominent "30-Day Job Ready Roadmap" banner + TMAY tile in Quick Start grid + tiles inside SpeakingPracticeScreen action grid

### 🧪 Testing (iteration_1.json)
- All 6 backend tests passed (100%) — TMAY shape, Roadmap structure (30 days, focus rotation), 5-axis Speaking, per-user 429 quota guard, /api/system/config + /api/ai/tutor/chat regressions
- Pytest file: `/app/backend/tests/test_phase1_endpoints.py`

### 🔜 Future Phase 1 polish (from testing agent review)
- Split `ai_routes.py` (now 1423+ lines) into modules: tutor.py / speaking.py / tmay.py / roadmap.py / sales.py / resume.py / interview.py / vocab.py / media.py
- Wrap speaking_score / tmay_evaluate / roadmap_generate / sales_turn / resume_parse / resume_interview_questions in `_send_with_fallback` for multi-provider resilience
- Log a warning when roadmap backfill triggers; add pad-or-retry for resume Q under-return
- Tighten resume "empty PDF" guard (currently <40 chars → consider <80 + unique-char check)
- Stream-validate uploaded PDF size before reading the full body
- Move sales scenarios from in-memory constant to a config/mongo collection (enables A/B testing)
- Return 502 if TMAY response is clearly empty (overall=0 AND polished_version=='')

## Phase 1.5: Sales Trainer + Resume Pipeline (NEW — Feb 2026)
### ✅ Implemented
- **Sales / Counselling Trainer** (`GET /api/ai/sales/scenarios`, `POST /api/ai/sales/turn`, `POST /api/ai/sales/score-session`, `src/screens/sales/SalesTrainerScreen.tsx`)
  - 6 Indian-market roleplay scenarios: EdTech (parent + student), Insurance, Real Estate, B2B SaaS, College Admission
  - Multi-turn chat — AI plays a tough Hinglish customer with realistic objections (price, trust, family, comparison, urgency)
  - Per-turn 5-axis scoring + objection-detection + inline coach notes
  - Auto-end after 6 turns + AI decides converted/not
  - Final report: Empathy / Persuasion / Objection Handling / Product Knowledge / Closing + strengths/improvements + missed opportunities + expert winning pitch
- **Resume PDF Upload + AI Parsing + Personalised Interview Qs** (`POST /api/ai/resume/parse`, `POST /api/ai/resume/interview-questions`, `src/screens/resume/ResumeUploadScreen.tsx`, `src/screens/resume/ResumeInterviewScreen.tsx`)
  - PDF picker via `expo-document-picker` (5 MB limit)
  - Server extracts text with `pypdf` → Claude Sonnet 4.6 returns structured JSON (name, role_target, summary, skills, experience, education, projects, certifications, years_of_experience)
  - "Generate Questions" produces 8-10 resume-grounded interview Qs (project / technical / hr / situational / gap) with rationale + focus areas
  - "Start Voice Mock Interview" auto-launches the in-app interview screen pre-loaded with these Qs — voice (Whisper STT) or typed answers, per-question scoring via existing `/interview/evaluate`, final aggregate report
- **Home shortcuts**: 2-tile "Career Tools" row (Sales Trainer + Resume Mock) right after the 30-Day Roadmap banner

### 🧪 Testing (iteration_2.json)
- All 17 backend tests passed (100%) — sales list / turn / auto-end / 404, sales/score-session, resume/parse happy + 400/413/422 errors, resume Qs with resume-grounded outputs, regression smokes, 429 quota guard across all 4 new endpoints
- Pytest file: `/app/backend/tests/test_phase2_endpoints.py`

## Roadmap (P2)
- Group challenges + friend leaderboards
- Pronunciation phoneme-level analysis
- Live group interview rooms (multi-user)
- Apple App Store deployment
- Dedicated Communication Skills tab + dashboard
- Spaced Repetition Flashcards

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
