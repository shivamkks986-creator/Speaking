# SpeakMate AI — Product Requirements Document

## Original Problem Statement
Transform English-learning app (SpeakMate AI) into a complete **Communication Skills and Job Readiness platform** ready for Google Play Store launch. Stack: React Native + Expo (SDK 54) + FastAPI + Firebase Auth + Firestore.

## Tech Stack (Locked)
- **Mobile**: React Native 0.81.5, Expo SDK 54.0.35, expo-modules-core 3.0.30
- **Backend**: FastAPI (server.py + ai_routes.py)
- **Auth**: Firebase Email/Password + Native Google Sign-In via `@react-native-google-signin/google-signin@16.1.2`
- **AI**: Gemini via Emergent LLM key
- **Build**: Local Windows + Android Studio → Release APK/AAB

## Completed Work (this fork — Feb 2026)

### P0 — Build & Launch Readiness ✅ DONE
- [x] Re-enabled Google Sign-In (native SDK) — `useGoogleAuth.ts` synced
- [x] Fixed SDK 54 vs SDK 56 version mismatch (AnyTypeCache crash)
- [x] `package.json` resolutions block enforced (`expo-modules-core: 3.0.30`, `expo-crypto: 15.0.9`)
- [x] Removed all `expo-auth-session` references — pure native Google Sign-In
- [x] Keystore signing wired in `android/app/build.gradle` (keystore.properties)
- [x] `lintVitalAnalyzeRelease` disabled project-wide via `subprojects { plugins.withId... }` in `android/build.gradle`
- [x] Missing `scripts/fix-metro-bundle.js` recreated locally
- [x] `plugins/withAndroidBuildFixes.js` confirmed present (Gradle memory + lint)
- [x] Firebase SHA-1 fingerprint added: `5C:54:79:92:90:C4:F4:18:8E:B3:D5:0A:B0:31:A5:96:81:AC:6A:13`
- [x] Updated `google-services.json` integrated
- [x] `authService.ts` synced with `signInWithGoogleCredential` method
- [x] **Release APK successfully built + installed + Google Sign-In flow verified by user (Feb 2026)**

### UI/UX Polish (previous session) ✅ DONE
- [x] Punch-hole/notch padding floor: `Math.max(insets.top, StatusBar.currentHeight, 88)` across 9 screens
- [x] Text clipping fix on Resume cards (`adjustsFontSizeToFit`)
- [x] "See all" alignment fix on HomeScreen

### Permanent SafeArea Fix (Feb 2026 — this session) ✅ DONE
- [x] Created `src/hooks/useScreenInsets.ts` — single source of truth combining `useSafeAreaInsets`, `StatusBar.currentHeight` floor (28dp min on Android), and auto-detected `BottomTabBarHeightContext`. Returns `{ headerPaddingTop, bottomPad }` drop-ins.
- [x] Upgraded `src/components/common/ScreenContainer.tsx` to use the hook — fixes Settings, Progress, Vocabulary, Profile, Notification, Privacy, MockInterview, Favorites, ForgotPassword screens automatically.
- [x] Patched 3 tab screens directly: `SpeakingPracticeScreen`, `InterviewCoachScreen`, `PremiumScreen` — now use `headerPaddingTop` floor + `tabBarHeight` bottom padding.
- [x] TypeScript compile: clean (`tsc --noEmit -p tsconfig.json` passes).
- **Why permanent**: future screens just import `useScreenInsets()` (or use `ScreenContainer`) — cannot regress via git reset on individual screens because logic lives in 1 hook.

### Backend Speed & AI Model Swap (Feb 2026) ✅ DONE
- [x] Swapped GPT-5.2 → `gemini-3-flash-preview` + `claude-haiku-4-5` in `ai_routes.py` (latency ~15s → ~4s)
- [x] `sync-ui-fix.ps1` now auto-patches `android/app/build.gradle` versionCode + versionName from `app.json` (fixes versionCode mismatch)

### Phase 1 — Premium Subscription + AdMob (Feb 2026) ✅ DONE
- [x] Backend `usage_tracker.py`: per-endpoint quotas, rewarded-ad bonus grants, daily budget kill-switch
- [x] `system_routes.py`: `/pricing`, `/quota`, `/subscription/verify`, `/subscription/restore`, `/rewarded/claim`, admin-pricing
- [x] Frontend `usageService.ts` + `billingService.ts` (Phase 1 stub) + `UsageIndicator` + `LimitReachedModal` + `AdBanner` placeholder + redesigned `PremiumScreen`
- [x] Backend tested — 100% pass (iteration_19.json)

### Phase 2 — Native AdMob + Google Play Billing (Feb 2026) ✅ DONE
- [x] Added `react-native-google-mobile-ads@14.7.2` + `react-native-iap@12.16.4` to `package.json`
- [x] `app.json` v1.0.9 / versionCode 10 with AdMob plugin (App ID `ca-app-pub-3735972538807236~1561583938`) + `react-native-iap` plugin
- [x] `src/services/adsService.ts` — central init, banner unit ID, interstitial + rewarded lifecycle (Test IDs in `__DEV__`, production IDs baked in). Uses dynamic `require()` so Expo Go doesn't crash.
- [x] `AdBanner.tsx` — renders real `BannerAd` in release AAB, placeholder in Expo Go
- [x] `billingService.ts` — real `react-native-iap` flow: `initConnection`, `getSubscriptions` (offer token for subs), `requestPurchase`/`requestSubscription`, server-verify via `/api/system/subscription/verify`, then `finishTransaction`. Restore uses `getAvailablePurchases()` and re-verifies each.
- [x] `LimitReachedModal.tsx` — real rewarded ad → only after Google reward callback fires do we hit `/rewarded/claim`
- [x] `App.tsx` — calls `initAds()` on cold start (silent no-op if native module missing)
- [x] Play Store legal pages served by backend: `/api/legal/privacy`, `/api/legal/data-deletion` (HTML)
- [x] `sync-ui-fix.ps1` extended to pull `package.json`, `App.tsx`, `adsService.ts`
- [x] Backend tested — 16/16 pass (iteration_20.json), no regressions
- [x] Ad Unit IDs (Interstitial 9256241120, Rewarded 4056332447, Banner 9248949370)
- [x] Play Console SKUs: `speakmate_monthly_149`, `speakmate_yearly_799`, `speakmate_lifetime_1499`

### Phase 3 — Play API Hardening + Skeleton Loader (Feb 2026) ✅ DONE
- [x] `backend/play_verifier.py` — Google Play Developer API v3 wrapper. Handles `subscriptionsv2.get` for monthly/yearly and `products.get` for lifetime. Auto-acknowledges purchases so Play doesn't refund after 3 days.
- [x] `system_routes.py` `subscription/verify` — now calls `pv.verify_purchase()`. When `GOOGLE_SERVICE_ACCOUNT_JSON` (or `_PATH`) env is set → real Google verification (rejects fake/expired tokens with HTTP 400). When unset → trust-mode fallback flagged `source='play_billing_unverified'` (audit-friendly, dev-safe).
- [x] `EvaluatingProgress.tsx` — shimmering gradient progress bar with 4 rotating status messages ("Listening…", "Checking grammar…", "Scoring…", "Preparing feedback…"). Wired into `InterviewSessionScreen`, `ResumeInterviewScreen`, and `TmayTrainerScreen` to replace bare spinners on the ~5s evaluate wait.
- [x] Backend tested — 19/19 pass (iteration_21.json), no regressions. TypeScript clean.

### Phase 4 — AdMob SSV + Play Console Setup + Roadmap Speedup (Feb 2026) ✅ DONE
- [x] `backend/admob_ssv.py` — Google's AdMob SSV signature verifier. Fetches Google's verifier keys (24h cache), reconstructs canonical signed message, ECDSA-verifies with `cryptography`.
- [x] `GET /api/system/rewarded/ssv` — Google → backend callback. Validates signature, dedupes on `transaction_id`, grants reward atomically via `usage_tracker.grant_rewarded_bonus`. Falls back to `user_id` query param if `custom_data` empty.
- [x] `adsService.ts` — `setAdsAuthContext(uid)` + `showRewarded(endpoint)` set `setServerSideVerificationOptions({userId, customData})` before showing rewarded ad so Google's SSV callback carries the uid.
- [x] `AuthContext.tsx` — now propagates uid to all four services (aiService, billingService, usageService, adsService) on auth state change.
- [x] `PLAY_CONSOLE_SETUP.md` — step-by-step SKU creation, License testing, Internal testing track, service account setup for real `subscription/verify` hardening.
- [x] Roadmap speedup: `_gen_roadmap_meta` moved to `claude-haiku-4-5` (was Gemini) → provider parallelism. `ROADMAP_PHASES` split into 6 × 5-day chunks (was 3 × 10-day) → finer parallelism. `return_exceptions=True` on outer + inner gather so one chunk/meta failure doesn't tank the whole roadmap; missing days backfilled and meta falls back to a friendly default.
- [x] Backend tested — 24/24 pass (iteration_22.json), no regressions.

### Phase 5 — Premium Plan Differentiation + Sticky CTA (Feb 2026) ✅ DONE
- [x] SKUs renamed: `speakmate_monthly_149/yearly_799/lifetime_1499` → **`premium_monthly/premium_yearly/premium_lifetime`** (clean Play Console naming)
- [x] `usage_tracker.py` — pricing config extended with `plans` (per-plan title/cta/badge/features array with `included/note`) + `per_plan_daily_limits` (monthly=30 tutor_chat, yearly/lifetime=100). Force-migration for legacy DB docs.
- [x] `system_routes.py` — `/pricing` returns full `PricingResponse` with typed `plans: Dict[str, PlanConfig]`.
- [x] `types/index.ts` — `PremiumProduct` extended with `planKey`, `cta`, `badge`, `billingPeriod`, `features[]`.
- [x] `billingService.ts` — `getProducts()` now returns plan-differentiated products from backend.
- [x] `PremiumScreen.tsx` — full rewrite: 3 plan cards with badge, dynamic feature list per selected plan (✅ included / 🔒 locked with notes), **sticky bottom CTA** with plan-specific label ("Subscribe for ₹149/month", "Subscribe for ₹799/year", "Get Lifetime Access for ₹1499"). Uses `useSafeAreaInsets` + `useBottomTabBarHeight` for correct offset above tab bar. Loading state + duplicate-purchase guard.
- [x] Backend tested — 19/19 pass (iteration_23.json), no regressions. TypeScript clean.

## Critical Build Config

### Files that MUST exist locally (and in repo)
- `/app/SpeakMateAI/plugins/withAndroidBuildFixes.js` (Expo plugin — gradle memory + lint disable)
- `/app/SpeakMateAI/scripts/fix-metro-bundle.js` (Postinstall — Metro Windows fix)
- `/app/SpeakMateAI/google-services.json` (Firebase config, SHA-1 must match release keystore)
- `/app/SpeakMateAI/speakmateai-release.jks` (Release keystore — gitignored)
- `/app/SpeakMateAI/android/keystore.properties` (passwords — gitignored)

### .env requirements (local — gitignored)
```
EXPO_PUBLIC_BACKEND_URL=<backend>
EXPO_PUBLIC_FEATURE_GOOGLE_SIGNIN=true
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=688960403070-20qvj005f03k8koa7m4u885b3fpg1b0p.apps.googleusercontent.com
```

### Build commands (verified working)
```powershell
yarn install --force
node node_modules\expo\bin\cli prebuild --platform android --clean --no-install
cd android
.\gradlew assembleRelease --no-daemon --max-workers=1 -x lintVitalAnalyzeRelease
```
APK: `android/app/build/outputs/apk/release/app-release.apk`

## P1 — Pending (Backlog)
- [ ] Generate AAB (`gradlew bundleRelease`) for Play Store upload with v1.0.9 (versionCode 10) — includes AdMob + IAP
- [x] Play Store legal pages (Privacy Policy, Data Deletion URL) — served at `/api/legal/privacy` and `/api/legal/data-deletion`
- [ ] Play Store assets: Feature graphic 1024x500, screenshots, store description
- [ ] Data Safety form + Content Rating questionnaire in Play Console (declare app contains ads + IAPs)
- [ ] Create 3 Play Console SKUs (`speakmate_monthly_149`, `speakmate_yearly_799`, `speakmate_lifetime_1499`) — activate base plans/offers
- [x] **Harden `/api/system/subscription/verify`** with Google Play Developer API v3 — validates purchase tokens server-side when `GOOGLE_SERVICE_ACCOUNT_JSON` is set; falls back to trust-mode flagged `play_billing_unverified` otherwise.
- [x] **Harden `/api/system/rewarded/ssv`** with AdMob SSV signature verification — Google → backend callback, ECDSA-verified, dedupes on `transaction_id`. Client fallback `/rewarded/claim` still available for pre-SSV builds.
- [ ] Set `GOOGLE_SERVICE_ACCOUNT_JSON` env var in production after creating the Play Console service account (see `PLAY_CONSOLE_SETUP.md`)
- [ ] Configure AdMob console SSV URL: `https://<backend>/api/system/rewarded/ssv` for the rewarded ad unit
- [x] Create 3 Play Console SKUs (**`premium_monthly`, `premium_yearly`, `premium_lifetime`**) — activate base plans/offers (see `PLAY_CONSOLE_SETUP.md`)
- [ ] Enforce `per_plan_daily_limits` in `usage_tracker.check_user_quota` — premium users currently share `free_endpoint_limits` overrides; plan-specific caps defined but not enforced yet
- [ ] Performance: 30-Day Roadmap backend API speed optimization

## P2 — Future Tasks
- [ ] Dedicated Communication Skills Tab & Dashboard
- [ ] Spaced Repetition Flashcards
- [ ] Push Notifications (expo-notifications already installed)
- [ ] Multi-language UI (Hindi + English toggle)
- [ ] Offline mode / cache strategy

## Known Issue Recurrence Log
| Issue | Recurrence | Status |
|-------|-----------|--------|
| Gradle Metaspace OOM | High | Resolved via `withAndroidBuildFixes.js` plugin + `-x lintVital` flag |
| Stale node_modules on Windows | High | Mitigated via clean install workflow |
| SDK version drift (yarn cache) | Medium | Pinned via `resolutions` block in package.json |
| Google Sign-In SHA-1 mismatch | One-time (Feb 2026) | Resolved — keystore SHA-1 registered in Firebase |
| `undefined is not a function` on Google button | One-time (Feb 2026) | Resolved — `authService.signInWithGoogleCredential` synced |
