import { InterviewQuestion, InterviewTrack } from '@/types';

export const HR_QUESTIONS: InterviewQuestion[] = [
  { id: 'hr1', question: 'Tell me about yourself.', category: 'introduction', difficulty: 'easy', track: 'hr' },
  { id: 'hr2', question: 'Why do you want to work for our company?', category: 'behavioural', difficulty: 'medium', track: 'hr' },
  { id: 'hr3', question: 'What are your greatest strengths?', category: 'behavioural', difficulty: 'easy', track: 'hr' },
  { id: 'hr4', question: 'What is your biggest weakness?', category: 'behavioural', difficulty: 'medium', track: 'hr' },
  { id: 'hr5', question: 'Where do you see yourself in five years?', category: 'behavioural', difficulty: 'medium', track: 'hr' },
  { id: 'hr6', question: 'Why should we hire you?', category: 'behavioural', difficulty: 'medium', track: 'hr' },
  { id: 'hr7', question: 'Describe a difficult colleague and how you handled the situation.', category: 'situational', difficulty: 'hard', track: 'hr' },
  { id: 'hr8', question: 'Why are you leaving your current job?', category: 'behavioural', difficulty: 'medium', track: 'hr' },
];

export const FRESHER_QUESTIONS: InterviewQuestion[] = [
  { id: 'fr1', question: 'Walk me through your final year project.', category: 'introduction', difficulty: 'medium', track: 'fresher' },
  { id: 'fr2', question: 'Why did you choose your engineering branch / field of study?', category: 'introduction', difficulty: 'easy', track: 'fresher' },
  { id: 'fr3', question: 'Which subject did you enjoy the most and why?', category: 'behavioural', difficulty: 'easy', track: 'fresher' },
  { id: 'fr4', question: 'Have you done any internships? What did you learn?', category: 'behavioural', difficulty: 'medium', track: 'fresher' },
  { id: 'fr5', question: 'How do you keep yourself updated with industry trends?', category: 'behavioural', difficulty: 'medium', track: 'fresher' },
  { id: 'fr6', question: 'Are you willing to relocate to a different city?', category: 'situational', difficulty: 'easy', track: 'fresher' },
  { id: 'fr7', question: 'Tell me about a time you worked in a team during college.', category: 'situational', difficulty: 'medium', track: 'fresher' },
  { id: 'fr8', question: 'Why are you applying for this role specifically?', category: 'behavioural', difficulty: 'medium', track: 'fresher' },
];

export const TECHNICAL_QUESTIONS: InterviewQuestion[] = [
  { id: 'tc1', question: 'What is the difference between an array and a linked list?', category: 'technical', difficulty: 'easy', track: 'technical' },
  { id: 'tc2', question: 'Explain the four pillars of Object-Oriented Programming.', category: 'technical', difficulty: 'medium', track: 'technical' },
  { id: 'tc3', question: 'What is the time complexity of binary search and why?', category: 'technical', difficulty: 'medium', track: 'technical' },
  { id: 'tc4', question: 'Explain REST APIs and the difference between GET and POST.', category: 'technical', difficulty: 'medium', track: 'technical' },
  { id: 'tc5', question: 'What is a database index and when would you use one?', category: 'technical', difficulty: 'medium', track: 'technical' },
  { id: 'tc6', question: 'How would you debug a slow API endpoint in production?', category: 'situational', difficulty: 'hard', track: 'technical' },
  { id: 'tc7', question: 'Explain the difference between SQL and NoSQL databases.', category: 'technical', difficulty: 'medium', track: 'technical' },
  { id: 'tc8', question: 'What is the difference between synchronous and asynchronous code?', category: 'technical', difficulty: 'medium', track: 'technical' },
];

export const INTERVIEW_TRACKS: Array<{
  id: InterviewTrack;
  title: string;
  description: string;
  duration: string;
  icon: 'people' | 'school' | 'code-slash';
  colors: [string, string];
  questions: InterviewQuestion[];
}> = [
  {
    id: 'hr',
    title: 'HR Interview',
    description: 'Behavioural & situational questions hiring managers love.',
    duration: '~15 min',
    icon: 'people',
    colors: ['#6D5BFF', '#9C8FFF'],
    questions: HR_QUESTIONS,
  },
  {
    id: 'fresher',
    title: 'Fresher Interview',
    description: 'Tailored for college grads and first jobs.',
    duration: '~12 min',
    icon: 'school',
    colors: ['#34D399', '#6EE7B7'],
    questions: FRESHER_QUESTIONS,
  },
  {
    id: 'technical',
    title: 'Technical Interview',
    description: 'Core CS concepts & problem-solving.',
    duration: '~20 min',
    icon: 'code-slash',
    colors: ['#F59E0B', '#FBBF24'],
    questions: TECHNICAL_QUESTIONS,
  },
];

export const getTrackQuestions = (track: InterviewTrack): InterviewQuestion[] => {
  return INTERVIEW_TRACKS.find((t) => t.id === track)?.questions ?? HR_QUESTIONS;
};
