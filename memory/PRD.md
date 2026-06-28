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
- [ ] Generate AAB (`gradlew bundleRelease`) for Play Store upload (only APK done locally)
- [ ] Play Store legal pages: Privacy Policy, Data Deletion URL (hostable on GitHub Pages)
- [ ] Play Store assets: Feature graphic 1024x500, screenshots, store description
- [ ] Data Safety form + Content Rating questionnaire in Play Console
- [ ] Real Google Play Billing integration (currently MOCKED in app)
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
