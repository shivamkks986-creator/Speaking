# SpeakMate AI 🎙️

Production-ready React Native + Expo app to help Indian users improve spoken English through AI conversations, grammar correction, pronunciation practice, vocabulary building, and mock interviews.

## ✨ Features

- 🔐 **Authentication** — Email/Password + Google Sign-In + Forgot Password
- 🤖 **AI English Tutor** — Chat with AI, grammar correction, Hindi → English help
- 🎤 **Speaking Practice** — Voice recording, AI feedback, pronunciation scoring
- 📚 **Vocabulary Builder** — Daily words, examples, favorites
- 💼 **Mock Interview** — HR interview mode with AI interviewer & scoring
- 📊 **Progress Dashboard** — Streaks, stats, weekly reports
- 💎 **Premium System** — Subscription screens + Google Play Billing placeholders
- 🔔 **Notifications** — Daily reminders, streak nudges
- ⚙️ **Settings** — Profile, theme (light/dark/system), notifications, privacy policy
- 🎨 **Material Design 3** with smooth animations

## 🛠 Tech Stack

- React Native 0.74 + Expo SDK 51
- TypeScript (strict)
- React Navigation 6 (Stack + Bottom Tabs)
- React Native Paper (Material Design 3)
- Firebase (Auth + Firestore) — *placeholder config*
- Expo AV / Expo Speech / Expo Notifications
- Reanimated 3 for animations
- AsyncStorage for local persistence

## 📁 Project Structure

```
SpeakMateAI/
├── App.tsx
├── app.json
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
├── assets/
└── src/
    ├── config/          # Firebase + Theme config
    ├── contexts/        # Auth, Theme, Progress providers
    ├── navigation/      # Root, Auth, Main tab navigators
    ├── screens/         # All app screens (grouped by feature)
    ├── components/      # Reusable UI components
    ├── services/        # AI, Auth, Firestore, Speech, Billing, Notifications
    ├── hooks/           # Custom React hooks
    ├── utils/           # Constants, validators, helpers
    ├── data/            # Static seed data (vocab, interview questions)
    └── types/           # TypeScript type definitions
```

## 🚀 Setup (Local Development)

### 1. Install dependencies

```bash
cd SpeakMateAI
npm install
# or
yarn install
```

### 2. Configure Firebase

Replace the placeholders in `src/config/firebase.ts` with your real Firebase project credentials:

```ts
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

To create a Firebase project:
1. Visit https://console.firebase.google.com
2. Create a project → Add Android app (package: `com.speakmate.ai`)
3. Enable **Authentication** → Email/Password + Google
4. Create a **Firestore Database** (start in test mode)
5. Copy the web config into `firebase.ts`

### 3. Configure Google Sign-In (optional)

In `src/services/authService.ts`, set your `webClientId` from Firebase Console → Authentication → Google → Web SDK configuration.

### 4. Run the app

```bash
npx expo start
```

- Press **a** to run on Android emulator
- Or scan the QR with **Expo Go** app on your physical Android device

### 5. Build APK (production)

```bash
npm install -g eas-cli
eas login
eas build --profile preview --platform android
```

## 🧪 Mock AI Service

`src/services/aiService.ts` provides a **dummy AI** with:
- Conversational replies
- Grammar correction (simple rule-based)
- Vocabulary lookups
- Mock interview Q&A
- Pronunciation scoring (random with weighted feedback)

To plug in real AI later, replace the implementation while keeping the same interface.

## 💳 Google Play Billing

`src/services/billingService.ts` contains placeholder methods (`purchase`, `restorePurchases`, `getProducts`). Integrate `expo-in-app-purchases` or `react-native-iap` later — only swap the implementation.

## 📱 Android Optimisation

- Adaptive icon configured
- Material Design 3 theming (dynamic light/dark)
- Edge-to-edge safe area handling
- Optimized FlatLists with `keyExtractor` & memoization
- Haptic feedback on key actions

## 📝 License

MIT — Built with ❤️ for India.
