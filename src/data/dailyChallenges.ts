import { DailyChallenge } from '@/types';

export const DAILY_CHALLENGES: DailyChallenge[] = [
  {
    id: 'dc1',
    title: 'My Morning Routine',
    prompt: 'Describe your morning routine in 30 seconds. Use linking words like "first", "then", "after that".',
    durationSec: 30,
    focus: 'fluency',
  },
  {
    id: 'dc2',
    title: 'Dream Vacation',
    prompt: 'If you could go anywhere in the world tomorrow, where would you go and why? Speak for 45 seconds.',
    durationSec: 45,
    focus: 'vocabulary',
  },
  {
    id: 'dc3',
    title: 'Self Introduction',
    prompt: 'Introduce yourself to a hiring manager in under 60 seconds. Include your name, background and one strength.',
    durationSec: 60,
    focus: 'confidence',
  },
  {
    id: 'dc4',
    title: 'Tongue Twister Challenge',
    prompt: 'Read aloud: "She sells seashells by the seashore. The shells she sells are surely seashells."',
    durationSec: 20,
    focus: 'pronunciation',
  },
  {
    id: 'dc5',
    title: 'Recommend a Movie',
    prompt: 'Recommend a movie or web series to a friend. Talk about the plot, your favourite scene, and why they should watch it.',
    durationSec: 45,
    focus: 'fluency',
  },
  {
    id: 'dc6',
    title: 'Opinion Time',
    prompt: 'Do you think work-from-home is better than office work? Give two reasons.',
    durationSec: 45,
    focus: 'confidence',
  },
  {
    id: 'dc7',
    title: 'Describe Your City',
    prompt: 'Describe your city to a foreign visitor. Mention food, weather and one place they must visit.',
    durationSec: 60,
    focus: 'vocabulary',
  },
];

export const getDailyChallenge = (): DailyChallenge => {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return DAILY_CHALLENGES[dayOfYear % DAILY_CHALLENGES.length];
};
