import { InterviewQuestion, InterviewTrack } from '@/types';
import { CompanionId } from '@/config/companions';

export const HR_QUESTIONS: InterviewQuestion[] = [
  { id: 'hr1', question: 'Tell me about yourself.', category: 'introduction', difficulty: 'easy', track: 'hr' },
  { id: 'hr2', question: 'Why do you want to work for our company?', category: 'behavioural', difficulty: 'medium', track: 'hr' },
  { id: 'hr3', question: 'What are your greatest strengths?', category: 'behavioural', difficulty: 'easy', track: 'hr' },
  { id: 'hr4', question: 'What is your biggest weakness?', category: 'behavioural', difficulty: 'medium', track: 'hr' },
  { id: 'hr5', question: 'Where do you see yourself in five years?', category: 'behavioural', difficulty: 'medium', track: 'hr' },
  { id: 'hr6', question: 'Why should we hire you?', category: 'behavioural', difficulty: 'medium', track: 'hr' },
  { id: 'hr7', question: 'Describe a difficult colleague and how you handled it.', category: 'situational', difficulty: 'hard', track: 'hr' },
  { id: 'hr8', question: 'Why are you leaving your current job?', category: 'behavioural', difficulty: 'medium', track: 'hr' },
];

export const FRESHER_QUESTIONS: InterviewQuestion[] = [
  { id: 'fr1', question: 'Walk me through your final year project.', category: 'introduction', difficulty: 'medium', track: 'fresher' },
  { id: 'fr2', question: 'Why did you choose your field of study?', category: 'introduction', difficulty: 'easy', track: 'fresher' },
  { id: 'fr3', question: 'Which subject did you enjoy the most and why?', category: 'behavioural', difficulty: 'easy', track: 'fresher' },
  { id: 'fr4', question: 'Have you done any internships? What did you learn?', category: 'behavioural', difficulty: 'medium', track: 'fresher' },
  { id: 'fr5', question: 'How do you keep yourself updated with industry trends?', category: 'behavioural', difficulty: 'medium', track: 'fresher' },
  { id: 'fr6', question: 'Are you willing to relocate?', category: 'situational', difficulty: 'easy', track: 'fresher' },
  { id: 'fr7', question: 'Tell me about a time you worked in a team in college.', category: 'situational', difficulty: 'medium', track: 'fresher' },
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

export const EXPERIENCED_QUESTIONS: InterviewQuestion[] = [
  { id: 'ex1', question: 'Walk me through your most impactful project in your career.', category: 'introduction', difficulty: 'medium', track: 'experienced' },
  { id: 'ex2', question: 'Describe a time you led a team through a difficult challenge.', category: 'situational', difficulty: 'hard', track: 'experienced' },
  { id: 'ex3', question: 'How do you handle disagreements with senior stakeholders?', category: 'situational', difficulty: 'hard', track: 'experienced' },
  { id: 'ex4', question: 'What is the biggest mistake you made and how did you recover?', category: 'behavioural', difficulty: 'hard', track: 'experienced' },
  { id: 'ex5', question: 'Why are you looking to switch right now?', category: 'behavioural', difficulty: 'medium', track: 'experienced' },
  { id: 'ex6', question: 'How do you prioritize when everything feels urgent?', category: 'situational', difficulty: 'medium', track: 'experienced' },
];

export const BA_QUESTIONS: InterviewQuestion[] = [
  { id: 'ba1', question: 'How do you elicit requirements from a non-technical stakeholder?', category: 'situational', difficulty: 'medium', track: 'business_analyst' },
  { id: 'ba2', question: 'Explain the difference between functional and non-functional requirements.', category: 'technical', difficulty: 'medium', track: 'business_analyst' },
  { id: 'ba3', question: 'Walk me through a BRD or user story you wrote.', category: 'behavioural', difficulty: 'medium', track: 'business_analyst' },
  { id: 'ba4', question: 'How do you handle scope creep mid-sprint?', category: 'situational', difficulty: 'hard', track: 'business_analyst' },
  { id: 'ba5', question: 'What tools have you used for process modelling?', category: 'technical', difficulty: 'easy', track: 'business_analyst' },
  { id: 'ba6', question: 'How do you measure success after a feature launch?', category: 'situational', difficulty: 'medium', track: 'business_analyst' },
];

export const SALES_QUESTIONS: InterviewQuestion[] = [
  { id: 'sl1', question: 'Sell me this pen.', category: 'situational', difficulty: 'medium', track: 'sales' },
  { id: 'sl2', question: 'Describe your sales process from lead to close.', category: 'behavioural', difficulty: 'medium', track: 'sales' },
  { id: 'sl3', question: 'How do you handle "I need to think about it"?', category: 'situational', difficulty: 'medium', track: 'sales' },
  { id: 'sl4', question: 'Tell me about your highest-value deal and what made it work.', category: 'behavioural', difficulty: 'medium', track: 'sales' },
  { id: 'sl5', question: 'How do you prospect new leads?', category: 'behavioural', difficulty: 'easy', track: 'sales' },
  { id: 'sl6', question: 'A long-term client says they\'re switching to a competitor. What do you do?', category: 'situational', difficulty: 'hard', track: 'sales' },
];

export const SUPPORT_QUESTIONS: InterviewQuestion[] = [
  { id: 'cs1', question: 'How would you handle an angry customer on a call?', category: 'situational', difficulty: 'medium', track: 'customer_support' },
  { id: 'cs2', question: 'A customer is asking for a refund that violates policy. How do you respond?', category: 'situational', difficulty: 'hard', track: 'customer_support' },
  { id: 'cs3', question: 'What does great customer service mean to you?', category: 'behavioural', difficulty: 'easy', track: 'customer_support' },
  { id: 'cs4', question: 'How do you handle repetitive questions all day without burning out?', category: 'behavioural', difficulty: 'medium', track: 'customer_support' },
  { id: 'cs5', question: 'Tell me about a time you turned an unhappy customer into a loyal one.', category: 'behavioural', difficulty: 'medium', track: 'customer_support' },
  { id: 'cs6', question: 'How do you handle a customer who insists on speaking to a manager?', category: 'situational', difficulty: 'medium', track: 'customer_support' },
];

export const SWE_QUESTIONS: InterviewQuestion[] = [
  { id: 'sw1', question: 'How do you approach designing a scalable URL shortener?', category: 'technical', difficulty: 'hard', track: 'software_engineer' },
  { id: 'sw2', question: 'Explain database normalization with an example.', category: 'technical', difficulty: 'medium', track: 'software_engineer' },
  { id: 'sw3', question: 'Walk me through a recent feature you shipped end-to-end.', category: 'behavioural', difficulty: 'medium', track: 'software_engineer' },
  { id: 'sw4', question: 'How do you decide between writing tests vs shipping faster?', category: 'situational', difficulty: 'medium', track: 'software_engineer' },
  { id: 'sw5', question: 'Explain CAP theorem in plain English.', category: 'technical', difficulty: 'hard', track: 'software_engineer' },
  { id: 'sw6', question: 'How do you do code reviews?', category: 'behavioural', difficulty: 'medium', track: 'software_engineer' },
];

export const DATA_QUESTIONS: InterviewQuestion[] = [
  { id: 'da1', question: 'Walk me through how you would analyze user churn.', category: 'situational', difficulty: 'medium', track: 'data_analyst' },
  { id: 'da2', question: 'Explain the difference between correlation and causation.', category: 'technical', difficulty: 'easy', track: 'data_analyst' },
  { id: 'da3', question: 'How do you handle missing data?', category: 'technical', difficulty: 'medium', track: 'data_analyst' },
  { id: 'da4', question: 'Describe a dashboard you built and what insights it surfaced.', category: 'behavioural', difficulty: 'medium', track: 'data_analyst' },
  { id: 'da5', question: 'What SQL window functions do you use most?', category: 'technical', difficulty: 'medium', track: 'data_analyst' },
  { id: 'da6', question: 'Stakeholders disagree with your data. How do you respond?', category: 'situational', difficulty: 'hard', track: 'data_analyst' },
];

export const MARKETING_QUESTIONS: InterviewQuestion[] = [
  { id: 'mk1', question: 'How would you launch a new product with a limited budget?', category: 'situational', difficulty: 'medium', track: 'marketing' },
  { id: 'mk2', question: 'Walk me through a campaign you owned end-to-end.', category: 'behavioural', difficulty: 'medium', track: 'marketing' },
  { id: 'mk3', question: 'How do you measure the ROI of a brand campaign?', category: 'technical', difficulty: 'hard', track: 'marketing' },
  { id: 'mk4', question: 'What is your favourite brand and why?', category: 'behavioural', difficulty: 'easy', track: 'marketing' },
  { id: 'mk5', question: 'Performance vs brand — how do you balance the spend?', category: 'situational', difficulty: 'medium', track: 'marketing' },
  { id: 'mk6', question: 'How do you stay updated with marketing trends?', category: 'behavioural', difficulty: 'easy', track: 'marketing' },
];

export const BANKING_QUESTIONS: InterviewQuestion[] = [
  { id: 'bk1', question: 'Why banking, and why our bank specifically?', category: 'behavioural', difficulty: 'medium', track: 'banking' },
  { id: 'bk2', question: 'Explain repo rate and reverse repo rate.', category: 'technical', difficulty: 'medium', track: 'banking' },
  { id: 'bk3', question: 'How would you sell a credit card to a hesitant customer?', category: 'situational', difficulty: 'medium', track: 'banking' },
  { id: 'bk4', question: 'What is KYC and why is it important?', category: 'technical', difficulty: 'easy', track: 'banking' },
  { id: 'bk5', question: 'A customer wants to invest in a high-risk product. How do you advise?', category: 'situational', difficulty: 'hard', track: 'banking' },
  { id: 'bk6', question: 'How do you handle achieving aggressive monthly targets?', category: 'behavioural', difficulty: 'medium', track: 'banking' },
];

export interface TrackMeta {
  id: InterviewTrack;
  title: string;
  description: string;
  duration: string;
  icon: 'people' | 'school' | 'code-slash' | 'business' | 'analytics' | 'cart' | 'headset' | 'desktop' | 'stats-chart' | 'megaphone' | 'card';
  colors: [string, string];
  questions: InterviewQuestion[];
  interviewer: CompanionId;       // AI interviewer companion
  premium: boolean;
}

export const INTERVIEW_TRACKS: TrackMeta[] = [
  { id: 'hr',                title: 'HR Interview',          description: 'Behavioural & situational questions hiring managers love.',          duration: '~15 min', icon: 'people',      colors: ['#7C5CFF', '#A992FF'], questions: HR_QUESTIONS,        interviewer: 'sophia', premium: false },
  { id: 'fresher',           title: 'Fresher Interview',     description: 'Tailored for college grads and first jobs.',                          duration: '~12 min', icon: 'school',      colors: ['#34D399', '#22D3EE'], questions: FRESHER_QUESTIONS,   interviewer: 'alex',   premium: false },
  { id: 'technical',         title: 'Technical Round',       description: 'Core CS concepts & problem-solving.',                                 duration: '~20 min', icon: 'code-slash',  colors: ['#F59E0B', '#FBBF24'], questions: TECHNICAL_QUESTIONS, interviewer: 'ryan',   premium: true },
  { id: 'experienced',       title: 'Experienced (3-7 yrs)', description: 'Leadership, ownership, conflict scenarios.',                          duration: '~20 min', icon: 'business',    colors: ['#5B3FE0', '#22D3EE'], questions: EXPERIENCED_QUESTIONS, interviewer: 'sophia', premium: true },
  { id: 'business_analyst',  title: 'Business Analyst',      description: 'Requirements, stakeholder, process questions.',                       duration: '~18 min', icon: 'analytics',   colors: ['#0F766E', '#22D3EE'], questions: BA_QUESTIONS,        interviewer: 'ryan',   premium: true },
  { id: 'sales',             title: 'Sales',                 description: 'Pitching, objection handling, closing.',                              duration: '~18 min', icon: 'cart',        colors: ['#EF4444', '#F97316'], questions: SALES_QUESTIONS,     interviewer: 'maya',   premium: false },
  { id: 'customer_support',  title: 'Customer Support',      description: 'Empathy, conflict resolution, policy.',                               duration: '~15 min', icon: 'headset',     colors: ['#FF6B9D', '#FFA496'], questions: SUPPORT_QUESTIONS,   interviewer: 'emma',   premium: false },
  { id: 'software_engineer', title: 'Software Engineer',     description: 'System design, ownership, technical depth.',                          duration: '~25 min', icon: 'desktop',     colors: ['#7C5CFF', '#22D3EE'], questions: SWE_QUESTIONS,       interviewer: 'ryan',   premium: true },
  { id: 'data_analyst',      title: 'Data Analyst',          description: 'SQL, analysis, dashboards, storytelling.',                            duration: '~18 min', icon: 'stats-chart', colors: ['#22D3EE', '#7C5CFF'], questions: DATA_QUESTIONS,      interviewer: 'ryan',   premium: true },
  { id: 'marketing',         title: 'Marketing',             description: 'Campaigns, ROI, brand vs performance.',                               duration: '~15 min', icon: 'megaphone',   colors: ['#FF6B9D', '#7C5CFF'], questions: MARKETING_QUESTIONS, interviewer: 'maya',   premium: false },
  { id: 'banking',           title: 'Banking',               description: 'Banking products, KYC, advisory.',                                    duration: '~15 min', icon: 'card',        colors: ['#0F766E', '#34D399'], questions: BANKING_QUESTIONS,   interviewer: 'sophia', premium: true },
];

export const getTrackQuestions = (track: InterviewTrack): InterviewQuestion[] => {
  return INTERVIEW_TRACKS.find((t) => t.id === track)?.questions ?? HR_QUESTIONS;
};

export const getTrackMeta = (track: InterviewTrack): TrackMeta => {
  return INTERVIEW_TRACKS.find((t) => t.id === track) || INTERVIEW_TRACKS[0];
};
