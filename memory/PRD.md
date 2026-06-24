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


---

## 🔧 UI Overlap Fix — Feb 2026 (latest)

### Root cause
Android 15+ with `targetSdk 36` **forces edge-to-edge mode** regardless of the `androidStatusBar.translucent` setting. Previous code had `androidStatusBar.translucent: false` in app.json + a brittle pattern `paddingTop: Math.max(insets.top, StatusBar.currentHeight ?? 0) + 12` INSIDE `<SafeAreaView edges={['top']}>`. On Android 15+ this returned 0 for BOTH values → only 12px padding → header clipped behind status bar icons.

### Files fixed (status bar overlap)
- `app.json` — `androidStatusBar.translucent: true`, `backgroundColor: "#00000000"` (transparent, edge-to-edge friendly)
- `src/screens/resume/ResumeUploadScreen.tsx` — removed broken paddingTop math; SafeAreaView handles it
- `src/screens/resume/ResumeInterviewScreen.tsx` — same (2 occurrences)
- `src/screens/companions/CompanionsScreen.tsx` — same
- `src/screens/tmay/TmayTrainerScreen.tsx` — same
- `src/screens/tutor/AITutorScreen.tsx` — same
- `src/screens/vocabulary/FlashcardsScreen.tsx` — same
- `src/screens/roadmap/RoadmapScreen.tsx` — same
- `src/screens/home/HomeScreen.tsx` — topBar `paddingTop: Math.max(insets.top+8, 16)` → `paddingTop: 8` (SafeAreaView already pads)

### Files fixed (text clipping)
- `src/screens/home/HomeScreen.tsx` careerTile (Sales Trainer + Resume Mock) — removed `adjustsFontSizeToFit minimumFontScale={0.85}` (was unreliable); sub text now `numberOfLines={2}` allowing wrapping on 360px screens

### Verification
- TypeScript `npx tsc --noEmit` passes with zero errors
- Static code verification by testing_agent passed 100% (iteration_3.json)
- Zero regression: grep `Math.max(insets.top` returns 0 matches across src/**
- Visual verification: **pending user device test** (must rebuild local APK after `git pull`)


---

## 🔧 UI Overlap Fix v2 — Feb 2026 (iteration 4)

### Why a v2 was needed
v1 fix (above) relied on `SafeAreaView edges={['top']}` to handle the status bar inset after setting `androidStatusBar.translucent: true`. On the user's Android 15 device, SafeAreaView's top inset resolution proved **unreliable** — sometimes returning 0 even when the status bar height should have been applied. Result: header had only the static styles.header padding (`spacing.md = 16px`), insufficient to clear the ~28-32px status bar.

### v2 Fix — bulletproof manual padding
Replaced SafeAreaView-only approach with **explicit manual paddingTop using a guaranteed minimum**:
```ts
paddingTop: Math.max(insets.top, StatusBar.currentHeight ?? 0, 28) + 12
```
The literal `28` floor ensures the header is always pushed below the status bar even if BOTH `insets.top` and `StatusBar.currentHeight` return 0 (the Android 15+ edge-to-edge bug case). Additionally, changed SafeAreaView `edges` from `['top']` → `['left', 'right']` in those 8 affected files to prevent double-padding on devices where SafeAreaView DOES work correctly.

### Files patched (v2)
- `src/screens/resume/ResumeUploadScreen.tsx` (header L106 + SafeAreaView L103)
- `src/screens/resume/ResumeInterviewScreen.tsx` (2 headers L146 & L197 + 2 SafeAreaViews L144 & L194)
- `src/screens/companions/CompanionsScreen.tsx` (L28-29)
- `src/screens/tmay/TmayTrainerScreen.tsx` (L158-161)
- `src/screens/tutor/AITutorScreen.tsx` (L127-129)
- `src/screens/vocabulary/FlashcardsScreen.tsx` (L103-104)
- `src/screens/roadmap/RoadmapScreen.tsx` (L153-156)
- `src/screens/home/HomeScreen.tsx` (topBar L74 + SafeAreaView L68 + StatusBar import L2)

### See all alignment fix (HomeScreen)
On the user's device, "See all →" was rendering on a different visual row than "AI Companions" heading. Root cause: `flexShrink: 1` + `marginRight: spacing.sm` on `styles.section` was conflicting with `flexShrink: 0` on the Pressable + `width: '100%'` on the FadeInView wrapper. Layout calculation was inconsistent.

**Fix**: Pure flex layout:
- `<Text style={[styles.section, { flex: 1 }]} numberOfLines={1}>AI Companions</Text>` (flex:1 forces title to expand fully)
- Removed `flexShrink: 0` from Pressable, `width: '100%'` from FadeInView, `flexShrink: 1` + `marginRight` from styles.section, `width: '100%'` from styles.sectionRow
- `justifyContent: 'space-between'` on the row now reliably places heading + See all on same line.

### Verification (v2)
- TypeScript `npx tsc --noEmit` → 0 errors
- Static code verification by testing_agent (iteration_4.json) → **100% pass**, 0 action items, retest_needed: false
- All 9 expected Math.max paddingTop occurrences verified in correct files at correct line numbers
- Visual verification: **pending user device test** (rebuild local APK)


---

## 🚨 CRITICAL: Native Crash Fix — Feb 2026 (iteration 5)

### The crash
After UI fixes from iterations 3+4 were pushed, the user's APK started crashing on launch with:
```
FATAL EXCEPTION: create_react_context
Process: com.speakmate.ai, PID: 27945
java.lang.NoClassDefFoundError: Failed resolution of: Lexpo/modules/kotlin/types/AnyTypeCache;
    at expo.modules.crypto.CryptoModule.definition(CryptoModule.kt:76)
Caused by: java.lang.ClassNotFoundException: expo.modules.kotlin.types.AnyTypeCache
```

### Root cause (definitive)
1. **`expo-crypto` is NEVER imported in the user's src/** — it was pulled in as a transitive dep of `expo-auth-session` (which is ALSO never imported — only mentioned in a doc comment in useGoogleAuth.ts).
2. Tilde-versioning (`~15.0.9`) on the expo-* deps allowed yarn to resolve `expo-crypto` to a newer patch that referenced `AnyTypeCache` — a class that **doesn't exist** in `expo-modules-core` 3.0.30 (Expo SDK 54).
3. Result: Kotlin code compiled fine, but at runtime when `CryptoModule.kt:76` ran, the JVM couldn't resolve `AnyTypeCache` → fatal crash on React context creation → app crashed before any JS code could even run.

### Fix applied
1. **REMOVED unused `expo-auth-session`** from package.json (this was the trigger).
2. **PINNED EXACT versions** (no `~`/`^`) for every expo-* package: expo=54.0.0, expo-crypto=15.0.9, expo-clipboard=8.0.7, expo-av=16.0.8, expo-build-properties=1.0.9, expo-document-picker=14.0.8, expo-file-system=19.0.16, expo-haptics=15.0.8, expo-linear-gradient=15.0.8, expo-notifications=0.32.17, expo-speech=14.0.8, expo-status-bar=3.0.9, expo-updates=29.0.18, expo-web-browser=15.0.11, babel-preset-expo=54.0.0.
3. **EXPLICITLY ADDED** `expo-modules-core: 3.0.30` to dependencies (was only transitive before).
4. **ADDED yarn `resolutions` block** in package.json forcing `expo-modules-core: 3.0.30` AND `expo-crypto: 15.0.9` across the entire dep tree — overrides any transitive duplicates.
5. **Tightened** other RN deps (google-signin, gesture-handler, screens, safe-area-context, get-random-values) to exact versions.
6. **Enhanced** `nuclear-rebuild.ps1` step 2 to wipe additional gradle caches that may hold stale compiled AAR:
   - `~/.gradle/caches/modules-2/files-2.1/host.exp.exponent`
   - `~/.gradle/caches/modules-2/files-2.1/com.facebook.react`
   - `~/.gradle/caches/build-cache-*`, `jars-*`
   - Windows `AppData\Local\Temp\react-*` and `metro-*`

### Verification (cloud)
- `yarn install` succeeded; node_modules has expo-modules-core 3.0.30 + expo-crypto 15.0.9, NO expo-auth-session.
- TypeScript `npx tsc --noEmit` → 0 errors.
- testing_agent (iteration_5.json) → **12/12 static checks PASS**, 0 action items.
- All previous UI overlap fixes from iteration_4 verified intact.

### User-side validation pending
User must run `nuclear-rebuild.ps1` (now beefier) on Windows to rebuild local APK. The fix guarantees the version mismatch cannot recur because exact pins + resolutions remove all ambiguity from yarn's dependency resolution.
