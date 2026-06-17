// AI service: calls FastAPI backend (multi-agent: GPT-5.2 + Claude Sonnet 4.6 + Gemini 3 Flash).
// If backend is unreachable, falls back to lightweight on-device mock so the app stays usable.

import {
  ChatMessage,
  InterviewAnswer,
  InterviewQuestion,
  InterviewResult,
  InterviewTrack,
  JobRoadmap,
  RoadmapDay,
  SpeakingScore,
  TmayEvaluation,
} from '@/types';
import { delay, randomId } from '@/utils/helpers';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const AI = BACKEND_URL ? `${BACKEND_URL.replace(/\/$/, '')}/api/ai` : '';

let tutorSessionId: string | null = null;

// Identity headers — set by AuthContext after login. Used by backend's per-user
// quota tracker so free-tier users get 30 calls/day and premium are unlimited.
let currentUserId: string | null = null;
let currentIsPremium = false;

export function setAiAuthContext(uid: string | null, isPremium: boolean) {
  currentUserId = uid;
  currentIsPremium = isPremium;
}

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (currentUserId) h['X-User-Id'] = currentUserId;
  h['X-Is-Premium'] = currentIsPremium ? 'true' : 'false';
  return h;
}

/** Thrown when the backend returns 429 user_quota_exceeded. Frontend should show paywall. */
export class QuotaExceededError extends Error {
  constructor(public readonly used: number, public readonly limit: number) {
    super('quota_exceeded');
  }
}

async function postJson<T>(path: string, body: unknown, timeoutMs = 30000): Promise<T> {
  if (!AI) throw new Error('EXPO_PUBLIC_BACKEND_URL not set');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${AI}${path}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (res.status === 429) {
      const data = await res.json().catch(() => ({}));
      const reason = String(data?.detail?.reason || '');
      const m = reason.match(/(\d+)\/(\d+)/);
      throw new QuotaExceededError(m ? parseInt(m[1], 10) : 0, m ? parseInt(m[2], 10) : 30);
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------- Mock fallbacks (kept minimal, used only if backend down) ----------------

const correctGrammarLocal = (text: string): string | null => {
  let out = text;
  let changed = false;
  if (out.length > 0 && out[0] !== out[0].toUpperCase()) {
    out = out[0].toUpperCase() + out.slice(1);
    changed = true;
  }
  if (out.length > 5 && !/[.!?]$/.test(out.trim())) {
    out = `${out.trim()}.`;
    changed = true;
  }
  return changed ? out : null;
};

// ---------------- Public service ----------------

export const aiService = {
  async chat(
    userText: string,
    companionId?: string,
    systemPrompt?: string,
    history: { role: 'user' | 'ai'; text: string }[] = [],
    agent?: string
  ): Promise<ChatMessage> {
    try {
      const data = await postJson<{
        id: string;
        session_id: string;
        reply: string;
        correction?: string | null;
        suggestion?: string | null;
        vocab?: { word: string; meaning: string; hindi?: string | null } | null;
        followup?: string | null;
      }>('/tutor/chat', {
        message: userText,
        session_id: tutorSessionId,
        companion_id: companionId,
        system_prompt: systemPrompt,
        agent,
        history: history.map((h) => ({
          role: h.role === 'ai' ? 'assistant' : 'user',
          text: h.text,
        })),
      });
      tutorSessionId = data.session_id;
      return {
        id: data.id,
        role: 'ai',
        text: data.reply,
        correction: data.correction || undefined,
        suggestion: data.suggestion || undefined,
        vocab: data.vocab || undefined,
        followup: data.followup || undefined,
        timestamp: Date.now(),
      };
    } catch (err) {
      console.warn('[aiService.chat] backend failed, using mock:', err);
      await delay(500);
      return {
        id: randomId(),
        role: 'ai',
        text: 'Backend offline. Try again in a moment.',
        correction: correctGrammarLocal(userText) ?? undefined,
        timestamp: Date.now(),
      };
    }
  },

  resetTutorSession(): void {
    tutorSessionId = null;
  },

  async scoreSpeaking(transcript: string, durationSec: number, prompt?: string): Promise<SpeakingScore> {
    try {
      const data = await postJson<SpeakingScore>('/speaking/score', {
        transcript,
        duration_sec: durationSec,
        prompt,
      });
      return data;
    } catch (err) {
      if (err instanceof QuotaExceededError) throw err;
      console.warn('[aiService.scoreSpeaking] backend failed, using mock:', err);
      await delay(500);
      const words = transcript.trim().split(/\s+/).filter(Boolean).length;
      const wpm = durationSec > 0 ? Math.round((words / durationSec) * 60) : 0;
      const overall = Math.max(45, Math.min(95, 60 + (wpm - 90) / 3));
      return {
        overall: Math.round(overall),
        pronunciation: Math.round(overall - 3),
        fluency: Math.round(overall + 2),
        grammar: Math.round(overall),
        vocabulary: Math.round(overall - 2),
        mistakes: [],
        corrected: transcript,
        suggested: '',
        feedback: 'Backend unavailable — basic offline score shown.',
      };
    }
  },

  async evaluateInterviewAnswer(
    q: InterviewQuestion,
    answer: string
  ): Promise<{ score: number; feedback: string }> {
    try {
      const data = await postJson<{ score: number; feedback: string }>(
        '/interview/evaluate',
        { question: q.question, answer, track: q.track }
      );
      return data;
    } catch (err) {
      console.warn('[aiService.evaluateInterviewAnswer] backend failed, using mock:', err);
      await delay(400);
      const words = answer.trim().split(/\s+/).filter(Boolean).length;
      const score = Math.max(40, Math.min(90, 50 + Math.min(40, words / 2)));
      return { score: Math.round(score), feedback: 'Backend offline — expand your answer with examples.' };
    }
  },

  async followUpInterviewer(prevAnswer: string): Promise<string> {
    try {
      const data = await postJson<{ question: string }>('/interview/followup', {
        previous_answer: prevAnswer,
      });
      return data.question;
    } catch (err) {
      console.warn('[aiService.followUpInterviewer] backend failed, using mock:', err);
      await delay(300);
      return 'Tell me more about that — can you share a specific example?';
    }
  },

  async scoreInterviewSession(track: InterviewTrack, answers: InterviewAnswer[]): Promise<InterviewResult> {
    try {
      const data = await postJson<{
        overallScore: number;
        communicationScore: number;
        confidenceScore: number;
        contentScore: number;
        strengths: string[];
        suggestions: string[];
      }>('/interview/score-session', {
        track,
        answers: answers.map((a) => ({ question: a.question, answer: a.answer, score: a.score })),
      });
      return {
        track,
        overallScore: data.overallScore,
        communicationScore: data.communicationScore,
        confidenceScore: data.confidenceScore,
        contentScore: data.contentScore,
        strengths: data.strengths,
        suggestions: data.suggestions,
        answers,
        completedAt: Date.now(),
      };
    } catch (err) {
      console.warn('[aiService.scoreInterviewSession] backend failed, using mock:', err);
      await delay(500);
      const avg = answers.length ? Math.round(answers.reduce((s, a) => s + a.score, 0) / answers.length) : 0;
      return {
        track,
        overallScore: avg,
        communicationScore: avg,
        confidenceScore: avg,
        contentScore: avg,
        strengths: ['You completed the session — great effort!'],
        suggestions: ['Backend offline. Reconnect for detailed AI feedback.'],
        answers,
        completedAt: Date.now(),
      };
    }
  },

  computeInterviewReadiness(stats: {
    interviewsCount: number;
    bestInterviewScore: number;
    streak: number;
    speakingScores: number[];
  }): number {
    const interviewWeight = Math.min(40, stats.interviewsCount * 8);
    const speakingAvg = stats.speakingScores.length
      ? stats.speakingScores.reduce((a, b) => a + b, 0) / stats.speakingScores.length
      : 0;
    const speakingWeight = (speakingAvg / 100) * 30;
    const bestWeight = (stats.bestInterviewScore / 100) * 20;
    const streakWeight = Math.min(10, stats.streak);
    return Math.min(100, Math.round(interviewWeight + speakingWeight + bestWeight + streakWeight));
  },

  // -------- TMAY (Tell Me About Yourself) trainer --------
  async evaluateTmay(
    transcript: string,
    durationSec: number,
    roleTarget?: string,
    experienceLevel: 'fresher' | 'experienced' = 'fresher'
  ): Promise<TmayEvaluation> {
    const data = await postJson<TmayEvaluation>('/tmay/evaluate', {
      transcript,
      duration_sec: durationSec,
      role_target: roleTarget,
      experience_level: experienceLevel,
    });
    return data;
  },

  // -------- 30-Day Job-Ready Roadmap --------
  async generateRoadmap(opts: {
    userName?: string;
    roleTarget?: string;
    currentLevel?: 'beginner' | 'intermediate' | 'advanced';
    weakAreas?: string[];
    dailyMinutes?: number;
  }): Promise<JobRoadmap> {
    const data = await postJson<{ summary: string; goal_title: string; days: RoadmapDay[] }>(
      '/roadmap/generate',
      {
        user_name: opts.userName,
        role_target: opts.roleTarget,
        current_level: opts.currentLevel || 'beginner',
        weak_areas: opts.weakAreas || [],
        daily_minutes: opts.dailyMinutes ?? 15,
      },
      60000 // roadmap generation can be slow
    );
    return {
      summary: data.summary,
      goal_title: data.goal_title,
      days: data.days,
      createdAt: Date.now(),
      roleTarget: opts.roleTarget,
      currentLevel: opts.currentLevel,
      completedDays: [],
    };
  },
};
