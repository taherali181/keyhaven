// The Academy course: ten units of guided lessons. Each lesson teaches new keys, drills them in steps, and ends
// with a checkpoint that unlocks the next lesson. Drill text is generated (src/lib/academy/generate.ts) unless a
// step gives its own.
import type { AcademyLesson, AcademyUnit, LessonStep } from '@/lib/academy/types';

type LessonSpec = Omit<AcademyLesson, 'unitId' | 'keys'>;
interface UnitSpec { id: string; title: string; summary: string; lessons: LessonSpec[] }

const keySteps = (label: string, extra: Partial<LessonStep> = {}): LessonStep[] => [
  { kind: 'keys', title: `Find ${label}` },
  { kind: 'bigrams', title: 'Pairs and rolls' },
  { kind: 'words', title: 'Words', ...extra },
  { kind: 'checkpoint', title: 'Checkpoint', ...extra }
];

const textSteps = (texts: [string, string, string], titles: [string, string] = ['Warm up', 'Keep the rhythm']): LessonStep[] => [
  { kind: 'sentence', title: titles[0], text: texts[0] },
  { kind: 'sentence', title: titles[1], text: texts[1] },
  { kind: 'checkpoint', title: 'Checkpoint', text: texts[2] }
];

const HOME_TIPS = ['Rest your index fingers on F and J; feel for the small bumps.', 'Keep your fingers curved and light, as if holding a small ball.', 'After every key, let the finger return to the home row.'];

const UNIT_SPECS: UnitSpec[] = [
  {
    id: 'home-row', title: 'Home row', summary: 'Where every finger rests and returns.',
    lessons: [
      { id: 'home-1', title: 'F, J, D and K', goal: 'Anchor your index fingers on the bumps and reach with your middle fingers.', newKeys: ['f', 'j', 'd', 'k'], tips: HOME_TIPS, steps: keySteps('F J D K'), checkpoint: { wpm: 12, accuracy: 90 }, legacyIds: ['lesson-1'] },
      { id: 'home-2', title: 'The whole home row', goal: 'Add your ring fingers, pinkies and the two index stretches to G and H.', newKeys: ['a', 's', 'l', ';', 'g', 'h'], tips: ['Pinkies rest on A and the semicolon; they move less than you expect.', 'Reach sideways to G and H without lifting the rest of your hand.', 'Say each letter quietly in your head to build the link.'], steps: keySteps('A S L ; G H'), checkpoint: { wpm: 14, accuracy: 90 }, legacyIds: ['lesson-2'] }
    ]
  },
  {
    id: 'top-row', title: 'Top row', summary: 'Short reaches up and back home.',
    lessons: [
      { id: 'top-1', title: 'Reaching up: R, T, Y and U', goal: 'Stretch your index fingers up and slightly inward, then return.', newKeys: ['r', 't', 'y', 'u'], tips: ['R and T belong to the left index finger; Y and U to the right.', 'Reach, press, return. Keep your palm still.'], steps: keySteps('R T Y U'), checkpoint: { wpm: 15, accuracy: 90 }, legacyIds: ['lesson-3'] },
      { id: 'top-2', title: 'E and I', goal: 'Your middle fingers reach up to the two most common vowels.', newKeys: ['e', 'i'], tips: ['E and I are among the most used keys in English. They deserve slow, clean practice.', 'Keep your index fingers anchored while the middle fingers move.'], steps: keySteps('E I'), checkpoint: { wpm: 16, accuracy: 91 } },
      { id: 'top-3', title: 'Q, W, O and P', goal: 'Complete the top row with your ring fingers and pinkies.', newKeys: ['q', 'w', 'o', 'p'], tips: ['Pinky reaches are short; lift the finger, not the wrist.', 'If a reach feels awkward, slow down until it feels easy.'], steps: keySteps('Q W O P'), checkpoint: { wpm: 17, accuracy: 91 }, legacyIds: ['lesson-4'] }
    ]
  },
  {
    id: 'bottom-row', title: 'Bottom row', summary: 'Curling down without losing home.',
    lessons: [
      { id: 'bottom-1', title: 'V, B, N and M', goal: 'Curl your index fingers down to the centre of the bottom row.', newKeys: ['v', 'b', 'n', 'm'], tips: ['B is a long reach for the left index finger. Take it gently.', 'Curl the finger down rather than moving your whole hand.'], steps: keySteps('V B N M'), checkpoint: { wpm: 18, accuracy: 92 }, legacyIds: ['lesson-5'] },
      { id: 'bottom-2', title: 'C, X, Z, comma and full stop', goal: 'Finish the alphabet and add the two most common punctuation marks.', newKeys: ['c', 'x', 'z', ',', '.'], tips: ['The comma belongs to the right middle finger, the full stop to the ring finger.', 'Z is a pinky reach; keep your other fingers resting on the home row.'], steps: keySteps('C X Z , .'), checkpoint: { wpm: 18, accuracy: 92 } }
    ]
  },
  {
    id: 'shift', title: 'Shift and capitals', summary: 'Two hands working together.',
    lessons: [
      { id: 'shift-1', title: 'Capital letters', goal: 'Hold Shift with the opposite hand’s pinky while the other hand types the letter.', newKeys: ['Shift'], tips: ['Left-hand letters use the right Shift key, and right-hand letters the left one.', 'Press Shift first, then the letter, then release both.'], steps: [{ kind: 'words', title: 'Capitalised words', capitals: true }, { kind: 'sentence', title: 'Names and places', text: 'Alice and Thomas met Maya beside the river in Rome.' }, { kind: 'sentence', title: 'Days and months', text: 'Monday in March felt quiet, but Friday in June was bright.' }, { kind: 'checkpoint', title: 'Checkpoint', text: 'The Quiet Garden opened beneath a Silver Moon in May, and Nora wrote to Leo.' }], checkpoint: { wpm: 20, accuracy: 92 }, legacyIds: ['lesson-9'] }
    ]
  },
  {
    id: 'punctuation', title: 'Punctuation', summary: 'The marks that give prose its breath.',
    lessons: [
      { id: 'punct-1', title: 'Apostrophes and semicolons', goal: 'Reach for the apostrophe and semicolon without breaking the flow of words.', newKeys: ["'", ';'], tips: ['Both keys belong to the right pinky.', 'Type contractions as one word: don\'t, it\'s, we\'ll.'], steps: [{ kind: 'words', title: 'Contractions', punctuation: true }, { kind: 'sentence', title: 'Short clauses', text: 'It\'s late; the lamps aren\'t lit yet, and we\'ll wait here.' }, { kind: 'sentence', title: 'Longer clauses', text: 'She didn\'t hurry; the road was long, and the evening was kind.' }, { kind: 'checkpoint', title: 'Checkpoint', text: 'Don\'t rush; it\'s the steady hands that win, and you\'re nearly there.' }], checkpoint: { wpm: 20, accuracy: 92 } },
      { id: 'punct-2', title: 'Questions, exclamations and quotes', goal: 'Type questions, exclamations and dialogue at an even pace.', newKeys: ['?', '!', '"'], tips: ['Question marks and quotation marks need Shift; use the opposite hand.', 'Slow down slightly at punctuation, then pick the pace back up.'], steps: textSteps(['Is it true? Yes, it is! "Look here," she said.', 'Why wait? Time is now, not later. "Never say never!"', '"Wisdom," wrote Seneca, "is the art of living well." Do you agree?'], ['Questions', 'Dialogue']), checkpoint: { wpm: 20, accuracy: 92 }, legacyIds: ['lesson-7'] }
    ]
  },
  {
    id: 'numbers', title: 'Numbers and symbols', summary: 'Confident reaches beyond the letters.',
    lessons: [
      { id: 'numbers-1', title: 'Numbers', goal: 'Reach to the number row and back without looking down.', newKeys: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'], tips: ['Each number belongs to the finger below it on the top row.', 'Glance at the guide, not at your hands.'], steps: [{ kind: 'keys', title: 'Find the numbers' }, { kind: 'words', title: 'Words and numbers', numbers: true }, { kind: 'checkpoint', title: 'Checkpoint', text: 'Room 12 opens at 8 and table 7 seats 4 of the 25 guests from 1990.' }], checkpoint: { wpm: 18, accuracy: 90 }, legacyIds: ['lesson-8'] },
      { id: 'numbers-2', title: 'Everyday symbols', goal: 'Hyphens, colons, brackets, slashes and percentages in real sentences.', newKeys: ['-', ':', '(', ')', '/', '%'], tips: ['Brackets and the percent sign need Shift.', 'Type times like 9:30 as one smooth movement.'], steps: textSteps(['Open 9:00-17:30 (closed on 1/1).', 'Prices fell 15% - from 40 to 34 - in a week.', 'Meet at 7:45 (platform 3/4); expect a 10% delay.'], ['Times and dates', 'Prices']), checkpoint: { wpm: 16, accuracy: 90 } }
    ]
  },
  {
    id: 'rhythm', title: 'Words and rhythm', summary: 'From letters to fluent words.',
    lessons: [
      { id: 'rhythm-1', title: 'Common pairs', goal: 'Roll through the letter pairs that make up most English words.', newKeys: [], tips: ['Pairs like th, he and in should feel like one movement.', 'Let rhythm, not force, set your pace.'], steps: [{ kind: 'bigrams', title: 'Frequent pairs' }, { kind: 'words', title: 'Words from pairs' }, { kind: 'checkpoint', title: 'Checkpoint' }], checkpoint: { wpm: 28, accuracy: 93 }, bigrams: true, legacyIds: ['lesson-6'] },
      { id: 'rhythm-2', title: 'Frequent words', goal: 'Type the most common words as single, automatic movements.', newKeys: [], tips: ['Read a word ahead so your fingers are never waiting.', 'Keep a soft, even beat; speed comes from not stopping.'], steps: [{ kind: 'words', title: 'Warm up' }, { kind: 'words', title: 'Flow' }, { kind: 'checkpoint', title: 'Checkpoint' }], checkpoint: { wpm: 32, accuracy: 94 } }
    ]
  },
  {
    id: 'prose', title: 'Natural prose', summary: 'Sentences with texture and punctuation.',
    lessons: [
      { id: 'prose-1', title: 'Natural prose', goal: 'Join every key group in naturally punctuated sentences.', newKeys: [], tips: ['Read the whole clause before you start typing it.', 'Commas are breaths: a tiny pause, not a stop.'], steps: textSteps(['Morning arrived slowly, lifting the mist from the lake until every reed stood clear against the water.', 'A patient typist does not chase each letter; the hands learn the path, and the eyes remain with the thought.', 'Beyond the window, rain moved softly through the trees, and the room settled into a deeper kind of quiet.']), checkpoint: { wpm: 32, accuracy: 94 }, legacyIds: ['lesson-10'] }
    ]
  },
  {
    id: 'speed', title: 'Speed control', summary: 'More pace without losing precision.',
    lessons: [
      { id: 'speed-1', title: 'Speed control', goal: 'Push the pace in short bursts, then settle into a clean, even rhythm.', newKeys: [], tips: ['Speed up on familiar words and ease off at punctuation.', 'If accuracy drops below 95%, slow down for a sentence.'], steps: textSteps(['clear steady motion clear steady motion calm accurate rhythm', 'Speed grows from easy movement, clean keystrokes, and the patience to remain precise.', 'Move quickly through familiar words, then soften the pace when punctuation asks for care.'], ['Bursts', 'Recovery']), checkpoint: { wpm: 38, accuracy: 95 }, legacyIds: ['lesson-11'] }
    ]
  },
  {
    id: 'endurance', title: 'Long passages', summary: 'Comfort and consistency over longer work.',
    lessons: [
      { id: 'endurance-1', title: 'Endurance', goal: 'Keep posture, rhythm and concentration through longer passages.', newKeys: [], tips: ['Keep your shoulders loose and your wrists level.', 'Pause and breathe between passages; tension slows everyone down.'], steps: textSteps(['The finest practice feels almost unhurried. Shoulders remain loose, wrists stay level, and each finger travels only as far as it needs to travel. Over time, this economy of motion becomes speed without strain.', 'Consistency is not the absence of difficult moments. It is the habit of returning to a calm rhythm after each hesitation, allowing attention to settle again on the sentence rather than the individual key.', 'When a long session begins to feel heavy, pause briefly, breathe, and notice where tension has gathered. Good stamina is built through awareness and repetition, never by forcing tired hands to continue.']), checkpoint: { wpm: 40, accuracy: 95 }, legacyIds: ['lesson-12'] }
    ]
  }
];

const taught = new Set<string>();
export const UNITS: AcademyUnit[] = UNIT_SPECS.map(unit => ({
  id: unit.id, title: unit.title, summary: unit.summary,
  lessons: unit.lessons.map(spec => {
    for (const key of spec.newKeys) if (key.length === 1) taught.add(key);
    return { ...spec, unitId: unit.id, keys: [...taught] };
  })
}));

export const ALL_LESSONS: AcademyLesson[] = UNITS.flatMap(unit => unit.lessons);

export const findLesson = (id: string | undefined) => ALL_LESSONS.find(lesson => lesson.id === id);
export const lessonByLegacyId = (id: string | undefined) => ALL_LESSONS.find(lesson => id !== undefined && lesson.legacyIds?.includes(id));
export const unitOf = (lessonId: string) => UNITS.find(unit => unit.lessons.some(lesson => lesson.id === lessonId));
export const nextLessonAfter = (lessonId: string) => ALL_LESSONS[ALL_LESSONS.findIndex(lesson => lesson.id === lessonId) + 1];
