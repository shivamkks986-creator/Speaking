// Roadmap progress + Accent Improvement API (server-side, per-user, Bearer auth).
import { authHeaders, QuotaExceededError } from '@/services/aiService';
import { SpeakingScore } from '@/types';
import { AccentId } from '@/data/accentContent';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const API = BACKEND_URL ? `${BACKEND_URL.replace(/\/$/, '')}/api` : '';

export interface RoadmapProgress {
  plan: Record<string, unknown> | null;
  completed_days: number[];
  scores: Record<string, number>;
}

export interface AccentResult {
  id: string;
  accent: AccentId;
  target: string;
  transcript: string;
  score: number;
  word_match: number;
  clarity: number;
  fluency: number;
  intonation: number;
  words_per_minute: number;
  mistakes: { heard: string; expected: string; tip: string }[];
  corrected_examples: string[];
  intonation_tip: string;
  feedback: string;
  method_note: string;
  remaining_today: number;
}

export interface AccentHistory {
  items: { id: string; accent: AccentId; target: string; score: number; created_at: string }[];
  attempts: number;
  average: Partial<Record<AccentId, number>>;
  best: Partial<Record<AccentId, number>>;
}

async function request<T>(method: string, path: string, body?: unknown, timeoutMs = 30000): Promise<T> {
  if (!API) throw new Error('Backend not configured');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: await authHeaders(),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    if (res.status === 429) {
      const data = await res.json().catch(() => ({}));
      const m = String(data?.detail?.reason || '').match(/(\d+)\/(\d+)/);
      throw new QuotaExceededError(m ? +m[1] : 0, m ? +m[2] : 0);
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const code = typeof data?.detail === 'string' ? data.detail : `HTTP ${res.status}`;
      throw new Error(code);
    }
    return (await res.json()) as T;
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw new Error('Request timed out. Check your internet and try again.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export const practiceService = {
  getRoadmap: () => request<RoadmapProgress>('GET', '/practice/roadmap'),
  savePlan: (plan: unknown) => request<RoadmapProgress>('PUT', '/practice/roadmap/plan', { plan }),
  completeDay: (day: number, score?: number) =>
    request<RoadmapProgress>('POST', '/practice/roadmap/complete', { day, score }),
  resetRoadmap: () => request<RoadmapProgress>('POST', '/practice/roadmap/reset', { confirm: 'RESET' }),
  // Real AI score only — no offline mock, so we never show a fake number.
  scoreSpeaking: (transcript: string, durationSec: number, prompt: string) =>
    request<SpeakingScore>('POST', '/ai/speaking/score', { transcript, duration_sec: durationSec, prompt }),
  evaluateAccent: (accent: AccentId, target: string, transcript: string, durationSec: number) =>
    request<AccentResult>('POST', '/practice/accent/evaluate', { accent, target, transcript, duration_sec: durationSec }),
  accentHistory: () => request<AccentHistory>('GET', '/practice/accent/history'),
};
