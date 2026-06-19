// Google Sign-In hook — uses expo-auth-session's Google provider with the
// PKCE OAuth code flow against the ANDROID OAuth client (so custom-scheme
// redirects like com.speakmate.ai://... are accepted). Expo internally
// exchanges the code for tokens — both `accessToken` and `idToken` come back.
// We pass `idToken` to Firebase via signInWithCredential.
//
// IMPORTANT — Why this setup (and the two failure modes we've already hit):
//   1. `useIdTokenAuthRequest` with a WEB client → fails because the request
//      tries a custom-scheme redirect URI which Web client IDs reject:
//      "Custom scheme URIs are not allowed for 'WEB' client type."
//   2. `useIdTokenAuthRequest` with an ANDROID client → fails because Android
//      OAuth client IDs do not support the implicit `response_type=id_token`
//      flow: "Error 400: invalid_request".
//   ✅ `useAuthRequest` (code flow) with an ANDROID client → works. The code
//      is exchanged server-side at Google's /token endpoint and both id_token
//      + access_token are returned to the app.
//
// SETUP CHECKLIST:
//   • Firebase Console → Authentication → Sign-in method → Google enabled.
//   • Firebase Console → Project Settings → Android app registered with the
//     release-keystore SHA-1 and the package name (com.speakmate.ai).
//   • google-services.json placed at project root (referenced from app.json).
//   • .env contains EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID (type 1, from GCP).
//   • Rebuild the APK after editing .env — env vars are baked at build time.
import { useEffect, useState, useCallback } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

import { authService } from '@/services/authService';

// Ensures the OAuth browser tab dismisses itself after the redirect (Android).
WebBrowser.maybeCompleteAuthSession();

export type GoogleAuthState = {
  /** Trigger the Google OAuth flow */
  signIn: () => Promise<void>;
  /** True while OAuth is in progress (browser open or token exchange in flight) */
  loading: boolean;
  /** Last error from the flow */
  error: string | null;
  /** True iff env vars required for Google Sign-In are present */
  configured: boolean;
};

export function useGoogleAuth(): GoogleAuthState {
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  // We need at least the platform-specific client; web is optional fallback.
  const configured = !!androidClientId || !!webClientId;

  // PKCE code flow — works with Android client IDs and custom URI schemes.
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId,
    iosClientId,
    webClientId,
    scopes: ['profile', 'email', 'openid'],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      const idToken = response.authentication?.idToken;
      if (!idToken) {
        setError('Google did not return an ID token. Ensure your OAuth client is correctly configured.');
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
        'Google Sign-In not configured. Add EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID to your .env file.'
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
