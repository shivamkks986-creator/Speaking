# SpeakMate AI — Product Requirements Document

Last updated: Feb 2026

## Original Problem Statement
User building "Communication Skills and Job Readiness" mobile platform (SpeakMate AI) targeting Indian learners. React Native Expo + FastAPI Python + MongoDB. Full mock-interview, TMAY trainer, resume-based interviews, sales roleplay, 30-day roadmap, and speaking practice. Free tier with quotas + rewarded ads; Premium plans (Monthly ₹149 with 3-day trial, Yearly ₹799 best-value, Lifetime ₹1499) unlock differentiated features.

## Architecture
- Frontend: `SpeakMateAI/` React Native Expo SDK 54, native billing via `expo-iap` 5.6.2, native ads via `react-native-google-mobile-ads` 15.5.0.
- Backend: `backend/` FastAPI. Prefixes `/api/ai/*`, `/api/system/*`.
- DB: MongoDB collections — `users`, `subscriptions` (unique index on `purchase_token`), `user_usage`, `user_endpoint_usage`, `user_bonus`, `api_usage`, `system_state.config`, `rewarded_ssv`, `rtdn_events`.
- Auth: Firebase (client) + Firebase Admin SDK (backend token verification).
- Package name: `com.speakmate.ai`.

## Implemented
- Native AdMob (Banner, Interstitial, Rewarded) + Rewarded SSV callback (Feb 2026)
- Native Google Play Billing via `expo-iap` (Feb 2026)
- Differentiated Premium plans with dynamic features/CTA/badges from backend (Feb 2026)
- Per-plan backend quotas + 3-day free trial for Monthly (Feb 2026)
- Interstitial trigger after every 3 practice completions (Feb 2026)
- Premium screen resilience: client-side plan build if backend `plans` missing (Feb 2026)
- **Production billing security overhaul (Feb 2026):**
  - Firebase ID token verification via `require_uid` (Bearer auth)
  - Backend now IGNORES `X-Is-Premium` header — premium resolved from `subscriptions` collection
  - Unique index on `purchase_token` blocks cross-user replay (403)
  - Trust-mode `play_billing_unverified` rejected when `SECURE_BILLING=true`
  - `SUBSCRIPTION_STATE_ON_HOLD` added to grace list
  - New `/api/system/subscription/status` for auto-restore
  - RTDN webhook `/api/system/rtdn` handles refunds/cancellations/expirations
  - Firestore rules doc: deny client `isPremium` writes
  - `AuthContext` auto-hydrates `isPremium` from backend on every login (2nd-device works)
- All backend security tests 17/17 PASSED (iteration 25)

## Backlog (Prioritized)

### P0 — Production Blockers (User Action Required)
- [ ] Add `GOOGLE_SERVICE_ACCOUNT_JSON` to backend env (real receipt verification)
- [ ] Add `FIREBASE_SERVICE_ACCOUNT_JSON` to backend env (Bearer token verification)
- [ ] Set `SECURE_BILLING=true` after both above are added
- [ ] Publish Firestore rules that deny client `isPremium` writes
- [ ] Set up RTDN Pub/Sub topic + push subscription (see `BILLING_PRODUCTION_SETUP.md`)
- [ ] Verify Play Console: products published, base plans active, license testers opted in

### P1 — Backend Improvements
- [ ] Add `firebase-admin` package to production deployment
- [ ] Emergent deploy pipeline: ensure env vars are set as secrets
- [ ] Store lifetime purchases with `expires_at: null` semantics instead of +100 years

### P2 — Feature Additions
- [ ] "Practice weak topics again" button in interview feedback → jump to practice mode
- [ ] Better final report screen after mock interview (hero screen w/ graph + badge)
- [ ] Dedicated Communication Skills Tab & Dashboard
- [ ] Spaced Repetition Flashcards + Push Notifications
- [ ] Model routing: verify premium users get better model (Claude Opus vs Haiku) — currently uses client hint which could be spoofed

### Documentation
- `/app/memory/PLAY_CONSOLE_SETUP.md`
- `/app/memory/BILLING_PRODUCTION_SETUP.md` ← NEW comprehensive setup guide

## Test Reports
- Latest: `/app/test_reports/iteration_25.json` (17/17 backend, 100%)
