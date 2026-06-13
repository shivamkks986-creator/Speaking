// Picks the highest-emotional-impact greeting line based on the user's current state.
// Reduces "another generic header" feel and drives next-best-action behaviour.
import { getNextLevel, getLevelByXp } from '@/config/levels';

interface GreetingInput {
  firstName: string;
  hour: number;          // 0-23, local time
  xp: number;
  streak: number;        // consecutive-day streak
  todayMinutes: number;  // minutes practised today
  dailyGoalMinutes: number;
  isPremium: boolean;
}

interface GreetingResult {
  greeting: string;   // top line (e.g., "Good morning, Shivam")
  nudge: string;      // emotional CTA — the real engagement driver
  emoji: string;
}

function timeOfDay(h: number): { label: string; emoji: string } {
  if (h < 5) return { label: 'Up late', emoji: '🌙' };
  if (h < 12) return { label: 'Good morning', emoji: '☀️' };
  if (h < 17) return { label: 'Good afternoon', emoji: '🌤️' };
  if (h < 21) return { label: 'Good evening', emoji: '🌆' };
  return { label: 'Late night practice', emoji: '🌙' };
}

export function computeDynamicGreeting(input: GreetingInput): GreetingResult {
  const tod = timeOfDay(input.hour);
  const greeting = `${tod.label}, ${input.firstName}`;
  const next = getNextLevel(input.xp);
  const current = getLevelByXp(input.xp);
  const xpToNext = next ? next.minXp - input.xp : 0;

  // Priority order: streak-loss > goal-gap > level-close > streak-celebrate > onboarding
  if (input.streak > 0 && input.todayMinutes === 0 && input.hour >= 17) {
    return {
      greeting,
      nudge: `🔥 Your ${input.streak}-day streak ends in a few hours. 2 mins se bacha lo!`,
      emoji: '🔥',
    };
  }

  if (input.todayMinutes < input.dailyGoalMinutes && input.todayMinutes > 0) {
    const left = input.dailyGoalMinutes - input.todayMinutes;
    return {
      greeting,
      nudge: `Bas ${left} min aur — daily goal complete karke +20 XP lo.`,
      emoji: '🎯',
    };
  }

  if (next && xpToNext > 0 && xpToNext < 60) {
    return {
      greeting,
      nudge: `Sirf ${xpToNext} XP aur — Level ${next.id} (${next.name}) unlock! 🚀`,
      emoji: next.badge,
    };
  }

  if (input.streak >= 7) {
    return {
      greeting,
      nudge: `🔥 ${input.streak}-day streak — you're on fire! Aaj bhi practice karo.`,
      emoji: '🔥',
    };
  }

  if (input.streak >= 1) {
    return {
      greeting,
      nudge: `Day ${input.streak} streak. Aaj practice karke aage badho!`,
      emoji: '🔥',
    };
  }

  if (input.xp === 0) {
    return {
      greeting,
      nudge: 'Pehli conversation start karo — 25 XP free milega 🎁',
      emoji: '✨',
    };
  }

  // Default fallback
  return {
    greeting,
    nudge: `${current.badge} ${current.name} · Aaj ka challenge complete karo.`,
    emoji: tod.emoji,
  };
}
