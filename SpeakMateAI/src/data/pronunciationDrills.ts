import { PronunciationDrill } from '@/types';

export const PRONUNCIATION_DRILLS: PronunciationDrill[] = [
  {
    id: 'p1',
    word: 'Schedule',
    phonetic: '/ˈskɛdʒuːl/ or /ˈʃɛdjuːl/',
    tip: 'In Indian English, both pronunciations are accepted. American style: "skej-ool", British style: "shed-yool".',
    example: 'Could you check my schedule for tomorrow?',
  },
  {
    id: 'p2',
    word: 'Pronunciation',
    phonetic: '/prəˌnʌn.siˈeɪ.ʃən/',
    tip: 'Note: it is NOT "pronoun-ciation". The "noun" sound becomes "nun" in the middle.',
    example: 'Her pronunciation has improved a lot.',
  },
  {
    id: 'p3',
    word: 'February',
    phonetic: '/ˈfɛb.ru.ɛr.i/',
    tip: 'Many speakers drop the first "r". The careful pronunciation is "feb-roo-air-ee".',
    example: 'My birthday is in February.',
  },
  {
    id: 'p4',
    word: 'Wednesday',
    phonetic: '/ˈwɛnz.deɪ/',
    tip: 'The first "d" is silent. Say it like "wenz-day".',
    example: 'See you on Wednesday morning.',
  },
  {
    id: 'p5',
    word: 'Comfortable',
    phonetic: '/ˈkʌmf.tə.bəl/',
    tip: 'Native speakers say "kumf-ter-bul" — drop the middle "or".',
    example: 'This chair is very comfortable.',
  },
  {
    id: 'p6',
    word: 'Vegetable',
    phonetic: '/ˈvɛdʒ.tə.bəl/',
    tip: 'Pronounce as "vej-tuh-bul", not "ve-ge-ta-ble".',
    example: 'I love fresh vegetable salads.',
  },
  {
    id: 'p7',
    word: 'Entrepreneur',
    phonetic: '/ˌɒn.trə.prəˈnɜːr/',
    tip: 'Tricky! Say it as "on-truh-pruh-nur".',
    example: 'She is a successful young entrepreneur.',
  },
  {
    id: 'p8',
    word: 'Genuine',
    phonetic: '/ˈdʒɛn.ju.ɪn/',
    tip: '"jen-yoo-in" — the last syllable rhymes with "in", not "wine".',
    example: 'I appreciate your genuine feedback.',
  },
];

export const getDrillsForToday = (): PronunciationDrill[] => {
  const day = new Date().getDate();
  const start = day % PRONUNCIATION_DRILLS.length;
  return [
    PRONUNCIATION_DRILLS[start],
    PRONUNCIATION_DRILLS[(start + 1) % PRONUNCIATION_DRILLS.length],
    PRONUNCIATION_DRILLS[(start + 2) % PRONUNCIATION_DRILLS.length],
  ];
};
