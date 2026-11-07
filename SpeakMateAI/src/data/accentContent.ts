// Accent Improvement content — lessons + practice sentences per accent mode.
export type AccentId = 'indian' | 'american' | 'british';

export interface AccentLesson {
  title: string;
  tip: string;
  examples: string[];
}

export interface AccentMode {
  id: AccentId;
  label: string;
  voiceLang: string;
  color: string;
  tagline: string;
  lessons: AccentLesson[];
  sentences: string[];
}

export const ACCENTS: AccentMode[] = [
  {
    id: 'indian',
    label: 'Indian English',
    voiceLang: 'en-IN',
    color: '#FF9F43',
    tagline: 'Clear, neutral Indian English for interviews',
    lessons: [
      { title: 'V vs W', tip: '"V" — top teeth touch the lower lip. "W" — round your lips, no teeth.', examples: ['very well', 'village water', 'video work'] },
      { title: 'Silent letters', tip: 'Do not pronounce the silent letters in common words.', examples: ['Wednesday (WENZ-day)', 'island (EYE-land)', 'know, write, half'] },
      { title: 'Word stress', tip: 'Stress one syllable clearly instead of every syllable equally.', examples: ['deVELop', 'comPAny', 'deCIsion'] },
      { title: 'Th sounds', tip: 'Put your tongue lightly between your teeth for "th".', examples: ['think', 'three', 'this, that'] },
    ],
    sentences: [
      'I am very well, thank you for asking.',
      'We will visit the village on Wednesday.',
      'Our company will develop a new video platform.',
      'I think three of us can finish this work today.',
      'Please send me the report by evening.',
      'I have completed my graduation in commerce.',
      'The meeting is scheduled for Thursday afternoon.',
      'I would like to know more about this role.',
    ],
  },
  {
    id: 'american',
    label: 'American English',
    voiceLang: 'en-US',
    color: '#60A5FA',
    tagline: 'General American sounds for global companies',
    lessons: [
      { title: 'Rhotic R', tip: 'Always pronounce the "r" sound, even at the end of words.', examples: ['car', 'water', 'better'] },
      { title: 'Flap T', tip: 'Between vowels, "t" becomes a soft quick "d"-like sound.', examples: ['water (WAH-der)', 'better (BED-er)', 'city (SIH-dee)'] },
      { title: 'Short "a" (æ)', tip: 'Open your mouth wide for the "a" in cat and can.', examples: ['can', 'answer', 'plan'] },
      { title: 'Linking words', tip: 'Join words smoothly: "turn it off" sounds like "tur-ni-doff".', examples: ['turn it off', 'pick it up', 'what about it'] },
    ],
    sentences: [
      'Can I get a glass of water, please?',
      'I am better at solving problems in a team.',
      'Could you turn it off before the meeting?',
      'I have a plan to answer every customer call.',
      'Our office is in the center of the city.',
      'I am really excited about this opportunity.',
      'What do you think about the new schedule?',
      'Let me pick it up and call you right back.',
    ],
  },
  {
    id: 'british',
    label: 'British English',
    voiceLang: 'en-GB',
    color: '#A992FF',
    tagline: 'Received Pronunciation style, crisp and polite',
    lessons: [
      { title: 'Non-rhotic R', tip: 'Drop the "r" at the end of a word unless the next word starts with a vowel.', examples: ['car (CAH)', 'water (WAW-tuh)', 'better (BET-uh)'] },
      { title: 'Crisp T', tip: 'Pronounce "t" clearly between vowels instead of a soft "d".', examples: ['water', 'little', 'city'] },
      { title: 'Long "a" (ɑː)', tip: 'In words like bath and can\'t, use a long "ah" sound.', examples: ['bath', 'can\'t', 'after'] },
      { title: 'Polite intonation', tip: 'Let your voice rise gently on polite requests.', examples: ['Could you help me, please?', 'Would you mind?', 'Shall we start?'] },
    ],
    sentences: [
      'I would like a glass of water, please.',
      'Could you help me with this report, please?',
      'We can\'t start the meeting until after lunch.',
      'Shall we discuss the schedule for tomorrow?',
      'It was a little better than last time.',
      'I have been working on this project for a year.',
      'Would you mind sending me the details?',
      'Thank you, that is very kind of you.',
    ],
  },
];

export const getAccent = (id: AccentId): AccentMode => ACCENTS.find((a) => a.id === id) || ACCENTS[0];
