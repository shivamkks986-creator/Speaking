// Google Sign-In hook — wraps expo-auth-session's Google provider.
// On successful OAuth, calls authService.signInWithGoogleIdToken() to finalize
// the Firebase Auth session. No additional native modules required (works with
// the existing Expo prebuild flow).
//
// SETUP:
// 1. In Firebase Console → Authentication → Sign-in method → enable Google.
// 2. In Google Cloud Console (auto-linked to your Firebase project):
//    https://console.cloud.google.com/apis/credentials?project=speakmateai-83a32
//    a) Find/create "Web client (auto created by Google Service)" — copy its Client ID
//       and put it in .env as EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
//    b) Create OAuth 2.0 client ID → Type: Android
//       - Package name: com.speakmate.ai   (or whatever your app.json android.package is)
//       - SHA-1: get with `cd android && ./gradlew signingReport` (use the release SHA-1)
//       - Copy its Client ID → EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID in .env
//
// .env additions:
//   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=688960403070-xxxxxx.apps.googleusercontent.com
//   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=688960403070-yyyyyy.apps.googleusercontent.com
import { useEffect, useState, useCallback } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

import { authService } from '@/services/authService';

// Ensures the OAuth popup browser tab closes after redirect (Android requirement).
WebBrowser.maybeCompleteAuthSession();

export type GoogleAuthState = {
  /** Trigger the Google OAuth flow */
  signIn: () => Promise<void>;
  /** True while OAuth is in progress (browser open or token exchange in flight) */
  loading: boolean;
  /** Last error from the flow (user cancellation, missing env, etc.) */
  error: string | null;
  /** True if the env vars required for Google Sign-In are missing → button should be hidden/disabled */
  configured: boolean;
};

export function useGoogleAuth(): GoogleAuthState {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const configured = !!webClientId; // web client ID is mandatory (used as audience for ID token)

  // IMPORTANT: We intentionally pass ONLY `clientId` (the WEB OAuth Client ID).
  // Android OAuth Client IDs (type 1) do NOT support the implicit `response_type=id_token`
  // flow used by `useIdTokenAuthRequest` and Google rejects them with `Error 400: invalid_request`.
  // The Web Client (type 3) supports the implicit ID token flow on all platforms via
  // a browser/Chrome Custom Tab redirect. The token Firebase receives is still verified
  // against Google's public keys, so security is unaffected.
  //
  // The Android OAuth Client (registered in google-services.json) is still useful — it lets
  // the native Google Play Services pre-fill the account picker — but we should not pass it
  // here.
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: webClientId,
    scopes: ['profile', 'email'],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When the OAuth flow returns with an id_token, exchange it with Firebase
  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      const idToken = response.params?.id_token;
      if (!idToken) {
        setError('Google did not return an ID token. Check your client ID.');
        setLoading(false);
        return;
      }
      (async () => {
        try {
          await authService.signInWithGoogleIdToken(idToken);
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Failed to sign in with Google');
        } finally {
          setLoading(false);
        }
      })();
    } else if (response.type === 'error') {
      setError(response.error?.message || 'Google Sign-In failed');
      setLoading(false);
    } else if (response.type === 'cancel' || response.type === 'dismiss') {
      setError(null);
      setLoading(false);
    }
  }, [response]);

  const signIn = useCallback(async () => {
    if (!configured) {
      setError(
        'Google Sign-In not configured. Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to your .env file.'
      );
      return;
    }
    if (!request) {
      setError('Google Sign-In is initialising — try again in a moment.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await promptAsync();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open Google Sign-In');
      setLoading(false);
    }
  }, [configured, request, promptAsync]);

  return { signIn, loading, error, configured };
}
