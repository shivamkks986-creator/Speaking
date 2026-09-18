// Central ID-token helper. All services that call the backend go through
// this so a single Firebase Auth instance gates every request.
//
// - `attachIdToken(headers)` appends `Authorization: Bearer <token>` when a
//   user is signed in. Silently no-ops otherwise (backend can still fall
//   back to X-User-Id if SECURE_BILLING=false).
// - Firebase's `getIdToken()` internally caches for 1h and auto-refreshes.

import { auth } from '@/config/firebase';

export async function getFirebaseIdToken(forceRefresh: boolean = false): Promise<string | null> {
  const u = auth.currentUser;
  if (!u) return null;
  try {
    return await u.getIdToken(forceRefresh);
  } catch {
    return null;
  }
}

export async function attachIdToken(headers: Record<string, string>): Promise<Record<string, string>> {
  const token = await getFirebaseIdToken(false);
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}
