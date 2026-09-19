# SpeakMate AI — Product Requirements Document

Last updated: Feb 2026

## Original Problem Statement
User building "Communication Skills and Job Readiness" mobile platform (SpeakMate AI) targeting Indian learners. React Native Expo + FastAPI Python + MongoDB. Full mock-interview, TMAY trainer, resume-based interviews, sales roleplay, 30-day roadmap, and speaking practice. Free tier with quotas + rewarded ads; Premium plans (Monthly ₹149 with 3-day trial, Yearly ₹799 best-value, Lifetime ₹1499) unlock differentiated features.

## Architecture
- Frontend: `SpeakMateAI/` React Native Expo SDK 54. `expo-iap` 5.6.2 for billing; `react-native-google-mobile-ads` 15.5.0 for AdMob (with built-in UMP).
- Backend: `backend/` FastAPI. Prefixes `/api/ai/*`, `/api/system/*`.
- Web frontend: `frontend/` React (CRA) — hosts legal pages + `app-ads.txt` at domain root.
- DB: MongoDB — `users`, `subscriptions` (unique `purchase_token`), `user_usage`, `user_bonus`, `api_usage`, `system_state.config`, `rewarded_ssv`, `rtdn_events`.
- Auth: Firebase (client) + Firebase Admin SDK (backend token verification).
- Package name: `com.speakmate.ai`. AdMob Publisher: `pub-3735972538807236`.

## Implemented
- Native AdMob (Banner, Interstitial, Rewarded) with SSV backend callback
- Native Google Play Billing via `expo-iap`
- Differentiated Premium plans with backend-driven features/CTA/badges
- Per-plan backend quotas + 3-day free trial for Monthly
- **Feb 2026 — Production billing security overhaul:**
  - Firebase ID token verification via `require_uid` (Bearer auth) with X-User-Id fallback
  - Backend IGNORES `X-Is-Premium` header — resolves premium from `subscriptions` DB
  - Unique index on `purchase_token` — blocks cross-user replay (403)
  - New `/subscription/status` for lightweight auto-restore
  - RTDN webhook `/api/system/rtdn` handles refunds/cancellations/expirations
  - `SUBSCRIPTION_STATE_ON_HOLD` added to grace list
  - Firestore rules doc: deny client `isPremium` writes
  - AuthContext auto-hydrates `isPremium` from backend on every login
- **Feb 2026 — AdMob integration audit:**
  - Banner ads deployed to Home + Interview Dashboard (previously component existed but was unused)
  - UMP (Google User Messaging Platform) consent flow — GDPR-safe for EU
  - "Manage ad preferences" row added to Settings
  - Gate: `canRequestAds()` — ads never load until consent resolves
  - `app-ads.txt` at `https://<domain>/app-ads.txt` (frontend static asset)
- Iteration 26 test report: 14/15 backend tests passing (the 1 fail was production-only, resolved via deploy)

## Backlog (Prioritized)

### P0 — Production Blockers (User Action Required)
- [ ] Add `GOOGLE_SERVICE_ACCOUNT_JSON` to backend env (real receipt verification)
- [ ] Add `FIREBASE_SERVICE_ACCOUNT_JSON` to backend env (Bearer token verification)
- [ ] Set `SECURE_BILLING=true` after both above are added
- [ ] Publish Firestore rules that deny client `isPremium` writes
- [ ] Set up RTDN Pub/Sub topic + push subscription (see `BILLING_PRODUCTION_SETUP.md`)
- [ ] AdMob Console: Set Rewarded SSV URL = `https://<domain>/api/system/rewarded/ssv`
- [ ] Play Console: Verify products published, base plans active, license testers opted in
- [ ] Play Console: Add developer website URL so Google can crawl `app-ads.txt`

### P1 — Feature Additions
- [ ] "Practice weak topics again" button in interview feedback → jump to practice mode
- [ ] Better final report screen after mock interview (hero screen w/ graph + badge)
- [ ] Dedicated Communication Skills Tab & Dashboard
- [ ] Spaced Repetition Flashcards + Push Notifications
- [ ] Model routing hardening: verify premium users get better model on backend, not from spoofable client hint

### Documentation
- `/app/memory/PLAY_CONSOLE_SETUP.md`
- `/app/memory/BILLING_PRODUCTION_SETUP.md`

## Test Reports
- Latest: `/app/test_reports/iteration_26.json` (14/15 backend, 93%)
- iteration_25: 17/17 (100%)
