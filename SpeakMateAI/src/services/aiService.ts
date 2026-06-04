// AI service: calls FastAPI backend (multi-agent: GPT-5.2 + Claude Sonnet 4.6 + Gemini 3 Flash).
// If backend is unreachable, falls back to lightweight on-device mock so the app stays usable.

import {
  ChatMessage,
  InterviewAnswer,
  InterviewQuestion,
  InterviewResult,
  InterviewTrack,
  SpeakingScore,
} from '@/types';
import { delay, pickRandom, randomId } from '@/utils/helpers';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const AI = BACKEND_URL ? `${BACKEND_URL.replace(/\/$/, '')}/api/ai` : '';

let tutorSessionId: string | null = null;

async function postJson<T>(path: string, body: unknown, timeoutMs = 30000): Promise<T> {
  if (!AI) throw new Error('EXPO_PUBLIC_BACKEND_URL not set');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${AI}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
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

const friendlyReplies = [
  "That's a great point! Let me share my thoughts.",
  'I understand what you mean. Have you tried explaining it this way?',
  'Excellent! Your English is improving. Keep practising every day.',
  'Nice try! Let me suggest a more natural phrasing.',
];

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
  async chat(userText: string, companionId?: string, systemPrompt?: string): Promise<ChatMessage> {
    try {
      const data = await postJson<{
        id: string;
        session_id: string;
        reply: string;
        correction?: string | null;
        suggestion?: string | null;
      }>('/tutor/chat', {
        message: userText,
        session_id: tutorSessionId,
        companion_id: companionId,
        system_prompt: systemPrompt,
      });
      tutorSessionId = data.session_id;
      return {
        id: data.id,
        role: 'ai',
        text: data.reply,
        correction: data.correction || undefined,
        suggestion: data.suggestion || undefined,
        timestamp: Date.now(),
      };
    } catch (err) {
      console.warn('[aiService.chat] backend failed, using mock:', err);
      await delay(500);
      return {
        id: randomId(),
        role: 'ai',
        text: pickRandom(friendlyReplies),
        correction: correctGrammarLocal(userText) ?? undefined,
        timestamp: Date.now(),
      };
    }
  },

  resetTutorSession(): void {
    tutorSessionId = null;
  },

  async scoreSpeaking(transcript: string, durationSec: number): Promise<SpeakingScore> {
    try {
      const data = await postJson<SpeakingScore>('/speaking/score', {
        transcript,
        duration_sec: durationSec,
      });
      return data;
    } catch (err) {
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
};
