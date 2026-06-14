import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppUser } from '@/types';
import { authService } from '@/services/authService';
import { setAiAuthContext } from '@/services/aiService';

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

  useEffect(() => {
    const unsub = authService.onAuthStateChanged((u) => {
      setUser(u);
      setInitializing(false);
      // Keep aiService headers in sync — backend uses these for per-user quota.
      setAiAuthContext(u?.uid ?? null, !!u?.isPremium);
    });
    return unsub;
  }, []);

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
  }, []);

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
