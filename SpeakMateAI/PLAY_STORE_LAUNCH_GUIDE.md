# SpeakMate AI — Play Store Launch Playbook

Complete step-by-step guide to ship SpeakMate AI to Google Play Store.
All commands are PowerShell (Windows). Run from `D:\sm\SpeakMateAI` unless noted.

---

## ✅ Pre-Launch Checklist (Code Side — Already Done by Agent)

- [x] Backend pointing to production: `https://gift-hub-sync.emergent.host`
- [x] `app.json`:
  - `versionCode: 1`, `version: "1.0.0"`
  - `enableProguardInReleaseBuilds: true`
  - `enableShrinkResourcesInReleaseBuilds: true`
  - EAS Updates configured (`projectId: fbee2ef0-...`)
- [x] Privacy Policy template at `SpeakMateAI/PRIVACY_POLICY.md`

---

## 🔐 STEP 1 — Generate Release Keystore (One-Time, CRITICAL)

⚠️ **This keystore signs your APK/AAB. If lost, you can NEVER update your app on Play Store. Back it up in 3 places.**

### 1.1 Generate keystore
PowerShell (in `D:\sm\SpeakMateAI`):

```powershell
keytool -genkeypair -v `
  -storetype PKCS12 `
  -keystore speakmate-release-key.keystore `
  -alias speakmate-release `
  -keyalg RSA -keysize 2048 -validity 10000
```

It will ask:
- **Keystore password:** Choose a strong one. **Save it in a password manager.**
- **First and last name:** Shivam Singh (or your name)
- **Organizational unit:** SpeakMate AI
- **Organization:** SpeakMate AI
- **City / State / Country code (IN)**
- **Confirm: yes**
- **Key password:** Same as keystore password (recommended) → press ENTER to use store password

✅ A file `speakmate-release-key.keystore` is now created in your project root.

### 1.2 Back it up (DO THIS NOW)
- Copy `speakmate-release-key.keystore` to **Google Drive** (your personal account).
- Copy to a **USB drive**.
- Save the password in **Google Password Manager / Bitwarden**.

⚠️ **Add to `.gitignore`** (already done — verify):
```
speakmate-release-key.keystore
keystore.properties
```

### 1.3 Create `android/keystore.properties` (after first prebuild)
After running `npx expo prebuild --clean`, create this file at `android/keystore.properties`:

```properties
storeFile=../../speakmate-release-key.keystore
storePassword=YOUR_STORE_PASSWORD_HERE
keyAlias=speakmate-release
keyPassword=YOUR_KEY_PASSWORD_HERE
```

### 1.4 Update `android/app/build.gradle`
Open `android/app/build.gradle` after prebuild and find the `android { ... }` block. Modify:

```gradle
android {
    ...

    // ADD THIS BLOCK before signingConfigs
    def keystorePropertiesFile = rootProject.file("keystore.properties")
    def keystoreProperties = new Properties()
    if (keystorePropertiesFile.exists()) {
        keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
    }

    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release   // <-- CHANGE from `signingConfigs.debug` to `signingConfigs.release`
            shrinkResources true
            minifyEnabled true
            proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"
        }
    }
}
```

---

## 📦 STEP 2 — Build Signed AAB (App Bundle)

Play Store requires AAB, not APK.

```powershell
.\gradlew --stop
Get-Process java -ErrorAction SilentlyContinue | Stop-Process -Force

npx expo prebuild --clean
# (Then re-apply Step 1.4 if prebuild overwrote build.gradle — see Step 4 below for permanent fix)

cd android
.\gradlew bundleRelease --no-daemon
cd ..
```

Output AAB: `android\app\build\outputs\bundle\release\app-release.aab`

**Verify it's signed with your keystore:**
```powershell
keytool -printcert -jarfile android\app\build\outputs\bundle\release\app-release.aab
```
Owner CN should match what you entered in Step 1.1.

---

## 🌐 STEP 3 — Host Privacy Policy

Play Store needs a **public HTTPS URL** for your privacy policy.

**Easiest options:**
1. **GitHub Pages:** Push `PRIVACY_POLICY.md` to a public repo, enable Pages → URL like `https://yourname.github.io/speakmate-privacy/`
2. **Notion:** Paste content into a Notion page → Share → publish to web → copy URL
3. **GitBook / Vercel / Netlify:** Drag-and-drop hosting

**Replace placeholders** in `PRIVACY_POLICY.md`:
- `privacy@speakmate.ai` → your real email
- `[Your Address]` → your actual address (required by Play Store)

Test the URL opens publicly in incognito browser.

---

## 🎨 STEP 4 — Play Console Assets (Visual)

Create these in Figma/Canva (free):

### App Icon
- 512×512 PNG, **no transparency** (Play Store rejects transparent icons)
- Already have `assets/icon.png` — verify it's 512×512 and opaque

### Feature Graphic
- 1024×500 PNG/JPG
- Hero banner shown at the top of your Play Store listing

### Phone Screenshots (minimum 2, max 8)
- 9:16 ratio
- 1080×1920 or higher
- Take from your running app:
  - Home / Roadmap screen
  - TMAY Trainer in action
  - Sales Roleplay chat
  - Resume Upload + Mock Interview
  - Feedback / Score screen

### Optional but recommended:
- Promo video (YouTube link, 30 sec)
- Tablet screenshots (if supporting tablets)

---

## 📝 STEP 5 — Play Console Listing Setup

1. Go to https://play.google.com/console
2. Click **Create app**:
   - App name: **SpeakMate AI**
   - Default language: **English (United States)** (or Hindi)
   - App or Game: **App**
   - Free or Paid: **Free**
   - Accept declarations → **Create**

3. Fill out left sidebar items (Play Console will show ✗ until each is complete):

### a) Store listing
- **App name:** SpeakMate AI
- **Short description (80 chars):**
  > Master communication skills with AI feedback. Land your dream job in 30 days.
- **Full description (4000 chars):**
  > SpeakMate AI is your personal AI-powered communication coach. Practice with our 30-Day Job Ready Roadmap, master "Tell Me About Yourself" interviews, get instant feedback on Sales & Counselling roleplays, and upload your resume for personalized mock interviews. ...
  > [Add more]
- **App icon, feature graphic, screenshots** (from Step 4)
- **App category:** Education
- **Tags:** Communication, Interview, English Learning
- **Contact email:** your-email@example.com
- **Privacy Policy URL:** (from Step 3)

### b) App content
- **Privacy Policy:** URL from Step 3
- **Ads:** Does your app contain ads? → **No**
- **App access:** Restricted? → **No, all functionality available without restrictions**
- **Content rating:** Fill questionnaire → expect **PEGI 3 / Everyone**
- **Target audience:** Age 18+ (or 13+ if you allow teens)
- **News app:** No
- **COVID-19 contact tracing:** No
- **Data safety:** Fill form based on `PRIVACY_POLICY.md` — declare:
  - Personal info: Email, Name → required, encrypted in transit
  - App activity: User-generated content (practice transcripts) → required, encrypted in transit
  - Device or other IDs: For crash logs → optional
  - Data NOT shared with third parties (for ads/marketing)
- **Government apps:** No
- **Financial features:** No

### c) Main store listing → Save

### d) **App signing (Important!):**
   - Play Console → App integrity → App signing
   - Choose: **Let Google manage and protect your app signing key (recommended)**
   - Play will sign final APK with their key, you upload signed AAB.
   - After signing, Play Console shows **new SHA-1**. Copy it → add to Firebase Console → Project Settings → Your Android app → Add fingerprint. This is needed for Google Sign-In later.

---

## 🚀 STEP 6 — Upload AAB to Internal Testing

Always launch via Internal Testing first (instant, no review needed).

1. Play Console → **Testing → Internal testing → Create new release**
2. Upload `app-release.aab` from Step 2
3. Release name: `1.0.0 (1)`
4. Release notes:
   ```
   Initial release.
   - 30-Day Job Ready Roadmap
   - TMAY Trainer with AI feedback
   - Sales & Counselling Roleplay
   - Resume PDF parsing + Mock Interview
   ```
5. **Review release → Start rollout to Internal testing**

### Add testers:
- **Testers tab → Create email list**
- Add your email + 2-3 friends/colleagues
- Share the **opt-in URL** (Play Console gives you a link). Testers click → install from Play Store directly.

Test the app from Play Store install for 2-3 days. Verify:
- Sign up / login works
- All AI endpoints respond
- No crashes
- OTA updates work (push an `eas update` and verify auto-apply)

---

## 🎉 STEP 7 — Promote to Production

When internal testing is stable:

1. Play Console → **Production → Create new release**
2. Click **Use a previous release** → choose the internal AAB (no need to re-upload)
3. Release notes (user-facing): Short, friendly
4. **Rollout percentage:** Start with **20%** → monitor crashes for 48h → bump to 100%
5. **Review release → Start rollout to Production**

⏳ Google review takes 1-7 days for first submission. After approval, your app is **LIVE on Play Store** 🎉

---

## 🔄 Post-Launch: OTA Updates (No Rebuild Needed!)

For JS-only changes:
```powershell
npx eas-cli update --branch production --message "fixed bug XYZ"
```

For native changes (new library, version bump):
1. Bump `versionCode` and `versionName` in `app.json`
2. Rebuild AAB (Step 2)
3. Upload new release in Play Console

---

## 🆘 Troubleshooting

### "Your app was rejected"
- 99% of time it's Data Safety form mismatch. Match it exactly to your Privacy Policy.

### "Upload failed: APK signed with wrong key"
- You used different keystore than first upload. Use the original `.keystore` file. If lost: contact Google Play support; they may help recover via App Signing.

### "Google Sign-In stopped working in production"
- Play App Signing changed your SHA-1. Get the new SHA-1 from Play Console → App integrity, add to Firebase → re-download `google-services.json` → next AAB build will work.

### ProGuard breaks something
- Check `android/app/build/outputs/mapping/release/mapping.txt` for stack trace mappings.
- Add specific rules to `android/app/proguard-rules.pro`:
  ```
  -keep class com.google.firebase.** { *; }
  -keep class com.google.android.gms.** { *; }
  ```

---

## 📋 Quick Reference

| Task | Command |
|---|---|
| Generate keystore | `keytool -genkeypair ...` (Step 1.1) |
| Build signed AAB | `cd android && .\gradlew bundleRelease --no-daemon` |
| OTA push code change | `npx eas-cli update --branch production --message "..."` |
| Check signing cert | `keytool -printcert -jarfile app-release.aab` |
| Get SHA-1 of keystore | `keytool -list -v -keystore speakmate-release-key.keystore` |

---

## Status Tracker

- [ ] Step 1 — Keystore generated + backed up
- [ ] Step 2 — Signed AAB built
- [ ] Step 3 — Privacy Policy hosted publicly
- [ ] Step 4 — Visual assets created (icon, feature graphic, screenshots)
- [ ] Step 5 — Play Console listing complete
- [ ] Step 6 — Internal testing live + tested
- [ ] Step 7 — Production rollout

🚀 **Goal:** Get to Step 6 in 2 days, Step 7 in 1 week.
