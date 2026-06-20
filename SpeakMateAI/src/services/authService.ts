// Auth service — wraps Firebase Auth. Designed to be swap-friendly.

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged as fbOnAuthStateChanged,
  updateProfile as fbUpdateProfile,
  signInWithCredential,
  GoogleAuthProvider,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

import { auth, db } from '@/config/firebase';
import { AppUser } from '@/types';

const mapUser = async (u: User | null): Promise<AppUser | null> => {
  if (!u) return null;
  let isPremium = false;
  try {
    const snap = await getDoc(doc(db, 'users', u.uid));
    if (snap.exists()) {
      isPremium = !!snap.data().isPremium;
    }
  } catch {
    // offline / no firestore — keep defaults
  }
  return {
    uid: u.uid,
    email: u.email,
    displayName: u.displayName,
    photoURL: u.photoURL,
    isPremium,
    createdAt: u.metadata.creationTime ? new Date(u.metadata.creationTime).getTime() : Date.now(),
  };
};

const ensureUserDoc = async (u: User, displayName?: string) => {
  try {
    const ref = doc(db, 'users', u.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        email: u.email,
        displayName: displayName ?? u.displayName ?? '',
        photoURL: u.photoURL ?? '',
        isPremium: false,
        createdAt: serverTimestamp(),
      });
    }
  } catch {
    // best-effort
  }
};

export const authService = {
  onAuthStateChanged(cb: (u: AppUser | null) => void) {
    return fbOnAuthStateChanged(auth, async (u) => {
      cb(await mapUser(u));
    });
  },

  async signInWithEmail(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    await ensureUserDoc(cred.user);
  },

  async signUpWithEmail(name: string, email: string, password: string) {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (name) await fbUpdateProfile(cred.user, { displayName: name });
    await ensureUserDoc(cred.user, name);
  },

  async signOut() {
    await fbSignOut(auth);
  },

  async resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email.trim());
  },

  // Google Sign-In — completes the Firebase auth using a credential built from
  // either an ID token (preferred) OR an access token returned by Google's OAuth
  // flow. Firebase's GoogleAuthProvider.credential() supports both.
  async signInWithGoogleCredential(tokens: { idToken: string | null; accessToken: string | null }) {
    const credential = GoogleAuthProvider.credential(tokens.idToken, tokens.accessToken);
    const cred = await signInWithCredential(auth, credential);
    await ensureUserDoc(cred.user);
  },

  // Backwards-compat alias (some screens may still import this)
  async signInWithGoogleIdToken(idToken: string) {
    const credential = GoogleAuthProvider.credential(idToken);
    const cred = await signInWithCredential(auth, credential);
    await ensureUserDoc(cred.user);
  },

  // Legacy stub kept for backwards compatibility — actual sign-in happens via
  // the useGoogleAuth hook + signInWithGoogleIdToken above.
  async signInWithGoogle() {
    throw new Error(
      'Google Sign-In: please use the useGoogleAuth() hook to launch the OAuth flow ' +
        'and call authService.signInWithGoogleIdToken(idToken) on success.'
    );
  },

  async updateProfile(data: Partial<AppUser>): Promise<AppUser> {
    const u = auth.currentUser;
    if (!u) throw new Error('Not authenticated');
    if (data.displayName || data.photoURL) {
      await fbUpdateProfile(u, {
        displayName: data.displayName ?? u.displayName ?? undefined,
        photoURL: data.photoURL ?? u.photoURL ?? undefined,
      });
    }
    try {
      await updateDoc(doc(db, 'users', u.uid), {
        ...(data.displayName !== undefined && { displayName: data.displayName }),
        ...(data.photoURL !== undefined && { photoURL: data.photoURL }),
        ...(data.isPremium !== undefined && { isPremium: data.isPremium }),
      });
    } catch {
      // ignore offline writes
    }
    return (await mapUser(u))!;
  },
};
