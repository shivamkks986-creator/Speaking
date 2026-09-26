// Prefetch the first interview question while the user is reading the
// Job Terms glossary — by the time they hit "I'm ready", the question is
// already cached and the LiveInterview opens instantly instead of showing
// a "Loading..." spinner for 3-5 seconds.
//
// Cache key: (uid, track). Entry expires after 3 minutes so a stale prefetch
// from a previous visit doesn't leak into a new session.

import type { InterviewTrack } from '@/types';
import { attachIdToken } from '@/services/tokenProvider';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const AI = BACKEND_URL ? `${BACKEND_URL.replace(/\/$/, '')}/api/ai` : '';

interface CachedQuestion {
  question: string;
  feedback: string | null;
  fetchedAt: number;
  track: InterviewTrack;
  targetQuestions: number;
  difficulty: string;
}

const CACHE_TTL_MS = 3 * 60 * 1000;
const _cache = new Map<string, CachedQuestion>();

function key(uid: string | null | undefined, track: InterviewTrack): string {
  return `${uid || 'anon'}:${track}`;
}

/**
 * Fire off a background request for the first interview question. Silently
 * ignores failures — the LiveInterview screen will retry on mount if the
 * cache is empty. Returns immediately (fire-and-forget) so it never blocks
 * the caller's UI.
 */
export function prefetchFirstQuestion(
  uid: string | null | undefined,
  track: InterviewTrack,
  targetQuestions: number = 8,
  difficulty: string = 'intermediate',
): void {
  if (!BACKEND_URL) return;
  const cacheKey = key(uid, track);
  const existing = _cache.get(cacheKey);
  if (existing && Date.now() - existing.fetchedAt < CACHE_TTL_MS) return;

  (async () => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (uid) headers['X-User-Id'] = uid;
      await attachIdToken(headers);

      const res = await fetch(`${AI}/interview/live`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ track, difficulty, history: [], target_questions: targetQuestions }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data?.next_question) return;

      _cache.set(cacheKey, {
        question: String(data.next_question),
        feedback: data.feedback ? String(data.feedback) : null,
        fetchedAt: Date.now(),
        track,
        targetQuestions,
        difficulty,
      });
    } catch {
      // Silent — LiveInterview.startInterview will just fetch normally.
    }
  })();
}

/**
 * Consume a prefetched question. Once consumed the entry is deleted so a
 * second interview on the same track fetches fresh content.
 */
export function consumePrefetchedQuestion(
  uid: string | null | undefined,
  track: InterviewTrack,
): CachedQuestion | null {
  const cacheKey = key(uid, track);
  const cached = _cache.get(cacheKey);
  if (!cached) return null;
  if (Date.now() - cached.fetchedAt >= CACHE_TTL_MS) {
    _cache.delete(cacheKey);
    return null;
  }
  _cache.delete(cacheKey);
  return cached;
}
