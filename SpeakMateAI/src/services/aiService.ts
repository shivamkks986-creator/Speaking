// Mock AI service abstraction. Same interface can later be backed by a real LLM.

import { ChatMessage, InterviewQuestion, SpeakingScore } from '@/types';
import { delay, pickRandom, randomId } from '@/utils/helpers';

const friendlyReplies = [
  "That's a great point! Let me share my thoughts.",
  'I understand what you mean. Have you tried explaining it this way?',
  'Excellent! Your English is improving. Keep practising every day.',
  'Nice try! Let me suggest a more natural phrasing.',
  'Good thinking! In English, we often say it slightly differently.',
  'Wonderful! Let’s build a longer sentence together.',
];

const grammarPatterns: Array<[RegExp, string]> = [
  [/\bi am go\b/gi, 'I am going'],
  [/\bhe go\b/gi, 'he goes'],
  [/\bshe go\b/gi, 'she goes'],
  [/\bdoes not went\b/gi, 'did not go'],
  [/\bi has\b/gi, 'I have'],
  [/\bi was went\b/gi, 'I went'],
  [/\bvery much good\b/gi, 'very good'],
  [/\bmore better\b/gi, 'better'],
  [/\bgood in english\b/gi, 'good at English'],
  [/\bdiscuss about\b/gi, 'discuss'],
  [/\breturn back\b/gi, 'return'],
  [/\brevert back\b/gi, 'reply'],
  [/\bdoing the needful\b/gi, 'taking the necessary action'],
];

const detectHindi = (text: string): boolean => /[\u0900-\u097F]/.test(text);

const hindiToEnglishMap: Record<string, string> = {
  नमस्ते: 'Hello',
  'कैसे हो': 'How are you',
  'धन्यवाद': 'Thank you',
  'मुझे': 'I',
  'पसंद है': 'like',
  'अच्छा': 'good',
  'खाना': 'food',
  'पानी': 'water',
  'दोस्त': 'friend',
  'काम': 'work',
};

const translateHindi = (text: string): string => {
  let out = text;
  Object.entries(hindiToEnglishMap).forEach(([hi, en]) => {
    out = out.replace(new RegExp(hi, 'g'), en);
  });
  return out;
};

const correctGrammar = (text: string): string | null => {
  let corrected = text;
  let changed = false;
  grammarPatterns.forEach(([pattern, replacement]) => {
    if (pattern.test(corrected)) {
      corrected = corrected.replace(pattern, replacement);
      changed = true;
    }
  });
  // Capitalize first letter
  if (corrected.length > 0 && corrected[0] !== corrected[0].toUpperCase()) {
    corrected = corrected[0].toUpperCase() + corrected.slice(1);
    changed = true;
  }
  // Add period if missing
  if (corrected.length > 5 && !/[.!?]$/.test(corrected.trim())) {
    corrected = `${corrected.trim()}.`;
    changed = true;
  }
  return changed ? corrected : null;
};

const suggestBetter = (text: string): string | null => {
  const lower = text.toLowerCase();
  if (lower.includes('i think')) {
    return text.replace(/i think/i, 'In my opinion,');
  }
  if (lower.includes('very nice')) {
    return text.replace(/very nice/i, 'absolutely wonderful');
  }
  if (lower.includes('i want to')) {
    return text.replace(/i want to/i, "I'd love to");
  }
  if (text.split(' ').length < 6) {
    return `Try elaborating: "${text} because ..."`;
  }
  return null;
};

export const aiService = {
  async chat(userText: string): Promise<ChatMessage> {
    await delay(700 + Math.random() * 600);
    let workingText = userText;
    let hindiNote = '';
    if (detectHindi(userText)) {
      const translated = translateHindi(userText);
      hindiNote = `In English you can say: "${translated}". `;
      workingText = translated;
    }
    const correction = correctGrammar(workingText);
    const suggestion = suggestBetter(correction ?? workingText);
    const reply = `${hindiNote}${pickRandom(friendlyReplies)}`;

    return {
      id: randomId(),
      role: 'ai',
      text: reply,
      correction: correction ?? undefined,
      suggestion: suggestion ?? undefined,
      timestamp: Date.now(),
    };
  },

  async scoreSpeaking(transcript: string, durationSec: number): Promise<SpeakingScore> {
    await delay(900);
    const words = transcript.trim().split(/\s+/).filter(Boolean).length;
    const wpm = durationSec > 0 ? Math.round((words / durationSec) * 60) : 0;
    const fluency = Math.max(40, Math.min(98, 60 + (wpm - 90) / 3 + Math.random() * 10));
    const pronunciation = Math.max(45, Math.min(98, 65 + Math.random() * 25));
    const grammar = correctGrammar(transcript) ? 70 + Math.random() * 15 : 82 + Math.random() * 14;
    const overall = Math.round((fluency + pronunciation + grammar) / 3);

    let feedback = 'Solid attempt! ';
    if (overall >= 85) feedback += 'You sound very natural. Keep this momentum.';
    else if (overall >= 70) feedback += 'Good clarity. Work on pacing and pauses for impact.';
    else feedback += 'Slow down a little, articulate each syllable, and re-record.';

    return {
      overall,
      pronunciation: Math.round(pronunciation),
      fluency: Math.round(fluency),
      grammar: Math.round(grammar),
      feedback,
    };
  },

  async evaluateInterviewAnswer(
    q: InterviewQuestion,
    answer: string
  ): Promise<{ score: number; feedback: string }> {
    await delay(800);
    const words = answer.trim().split(/\s+/).filter(Boolean).length;
    let score = 50 + Math.min(40, words / 2);
    if (correctGrammar(answer)) score -= 6;
    score = Math.round(Math.max(30, Math.min(98, score + (Math.random() * 10 - 5))));

    let feedback = '';
    if (words < 15) feedback = 'Expand your answer with more details and a concrete example.';
    else if (score < 65) feedback = 'Structure with STAR (Situation, Task, Action, Result) and reduce filler words.';
    else if (score < 85) feedback = 'Good answer. Add quantifiable impact and a confident closing line.';
    else feedback = 'Excellent! Confident, structured, and on-point.';

    return { score, feedback };
  },

  async followUpInterviewer(prevAnswer: string): Promise<string> {
    await delay(500);
    const followUps = [
      'Interesting. Can you give me a specific example from your experience?',
      'What did you learn from that situation?',
      'How would you handle it differently next time?',
      'How do you measure success in that area?',
      'Tell me more about your role specifically.',
    ];
    return pickRandom(followUps);
  },
};
