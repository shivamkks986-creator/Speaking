import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppUser } from '@/types';
import { authService } from '@/services/authService';
import { setAiAuthContext } from '@/services/aiService';
import { setBillingAuthContext, billingService } from '@/services/billingService';
import { setUsageAuthContext } from '@/services/usageService';
import { setAdsAuthContext } from '@/services/adsService';

interface AuthCtx {
  user: AppUser | null;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  updateProfile: (data: Partial<AppUser>) => Promise<void>;
}

const AuthContext = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Push the correct uid + effective-premium into every service that
  // hits our backend / SDKs. Called on every auth change and after
  // /subscription/status hydration.
  const propagateAuthContext = useCallback((uid: string | null, premium: boolean) => {
    setAiAuthContext(uid, premium);
    setBillingAuthContext(uid);
    setUsageAuthContext(uid, premium);
    setAdsAuthContext(uid);
  }, []);

  useEffect(() => {
    const unsub = authService.onAuthStateChanged(async (u) => {
      // Immediately set the local user + services so UI can render.
      // Firestore's `isPremium` is only a HINT — real answer comes from backend.
      setUser(u);
      setInitializing(false);
      const uid = u?.uid ?? null;
      propagateAuthContext(uid, !!u?.isPremium);

      // Auto-restore: on every login (and every app cold-start), ask the
      // backend for the authoritative entitlement. This handles:
      //   - 2nd device: user bought on Device A, logs into Device B
      //   - Refund / cancellation: backend `active: false` → we downgrade
      //   - Firestore stale: Firestore says premium but subscription expired
      if (uid) {
        try {
          setBillingAuthContext(uid);   // ensure billing service knows uid before fetch
          const status = await billingService.fetchStatus();
          const backendPremium = !!status.is_premium;
          if (backendPremium !== !!u?.isPremium) {
            // Reconcile local state with backend truth.
            const merged: AppUser = { ...u!, isPremium: backendPremium };
            setUser(merged);
            propagateAuthContext(uid, backendPremium);
          }
        } catch {
          // Offline — keep the last known local premium value for now.
        }
      }
    });
    return unsub;
  }, [propagateAuthContext]);

  const signIn = useCallback(async (email: string, password: string) => {
    await authService.signInWithEmail(email, password);
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    await authService.signUpWithEmail(name, email, password);
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await authService.resetPassword(email);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await authService.signInWithGoogle();
  }, []);

  const updateProfile = useCallback(async (data: Partial<AppUser>) => {
    const updated = await authService.updateProfile(data);
    setUser(updated);
    propagateAuthContext(updated.uid, !!updated.isPremium);
  }, [propagateAuthContext]);

  return (
    <AuthContext.Provider
      value={{ user, initializing, signIn, signUp, signOut, resetPassword, signInWithGoogle, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
