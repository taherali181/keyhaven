import { Lesson } from '@/types';

export const LESSONS: Lesson[] = [
  {
    id: 'lesson-1',
    tier: 1,
    title: 'Home Row: Foundations',
    subtitle: 'Index fingers on F & J bumps',
    description: 'Learn to anchor your index fingers on the home keys F and J and reach adjacent home keys.',
    targetKeys: ['f', 'j', 'd', 'k'],
    fingerAssignments: {
      'f': 'Left Index',
      'j': 'Right Index',
      'd': 'Left Middle',
      'k': 'Right Middle'
    },
    exercises: [
      'f j f j ff jj fj jf dk dk dd kk',
      'fjd kjf dkf jfd fk jd kj df dkfj',
      'fjkd dfjk kjdf jfdk fdkj jfkd kdfj'
    ]
  },
  {
    id: 'lesson-2',
    tier: 1,
    title: 'Home Row: Full Reach',
    subtitle: 'Pinkies and ring fingers: A S L ;',
    description: 'Master all eight home row keys to anchor your muscle memory.',
    targetKeys: ['a', 's', 'l', ';', 'g', 'h'],
    fingerAssignments: {
      'a': 'Left Pinky',
      's': 'Left Ring',
      'l': 'Right Ring',
      ';': 'Right Pinky',
      'g': 'Left Index',
      'h': 'Right Index'
    },
    exercises: [
      'asdf jkl; asdf jkl; a; sl dk fj gh',
      'fall glad flash half dash flask shall',
      'all lads had salad as a flash flag fell'
    ]
  },
  {
    id: 'lesson-3',
    tier: 2,
    title: 'Top Row: Center Reach',
    subtitle: 'Index fingers reaching up to R, T, Y, U',
    description: 'Extend your index fingers from home row to the center upper keys.',
    targetKeys: ['r', 't', 'y', 'u'],
    fingerAssignments: {
      'r': 'Left Index',
      't': 'Left Index',
      'y': 'Right Index',
      'u': 'Right Index'
    },
    exercises: [
      'fr ju ft jy juj ftf jyj rtyu uytr',
      'try rust fury yurt duty hurt truly',
      'trust the rust truly just fury shut'
    ]
  },
  {
    id: 'lesson-4',
    tier: 2,
    title: 'Top Row: Full Reach',
    subtitle: 'Q, W, E and I, O, P',
    description: 'Complete the top row with ring and pinky upward reaches.',
    targetKeys: ['q', 'w', 'e', 'i', 'o', 'p'],
    fingerAssignments: {
      'q': 'Left Pinky',
      'w': 'Left Ring',
      'e': 'Left Middle',
      'i': 'Right Middle',
      'o': 'Right Ring',
      'p': 'Right Pinky'
    },
    exercises: [
      'we io op qu ew oi po qw er ty ui op',
      'power quiet poetry write world quote',
      'we require write power for quick poetry'
    ]
  },
  {
    id: 'lesson-5',
    tier: 3,
    title: 'Bottom Row: Downward Reach',
    subtitle: 'Z, X, C, V and B, N, M, comma, period',
    description: 'Learn comfortable downward finger reaches to the bottom row.',
    targetKeys: ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.'],
    fingerAssignments: {
      'z': 'Left Pinky',
      'x': 'Left Ring',
      'c': 'Left Middle',
      'v': 'Left Index',
      'b': 'Left Index',
      'n': 'Right Index',
      'm': 'Right Index',
      ',': 'Right Middle',
      '.': 'Right Ring'
    },
    exercises: [
      'zxcv bnm, .za qws cde vfr bgt nhy mju',
      'cave zinc verb climb next calm bronze',
      'move calmly, next climb the bronze cave.'
    ]
  },
  {
    id: 'lesson-6',
    tier: 4,
    title: 'English Bigrams & Flow',
    subtitle: 'The most frequent letter combinations in English',
    description: 'Develop continuous rhythm on the most common bigrams: th, he, in, er, an, re, on, at, en.',
    targetKeys: ['t', 'h', 'e', 'i', 'n', 'r', 'a'],
    fingerAssignments: {},
    exercises: [
      'th he in er an re on at en nd ti es',
      'the there their then other another mother father',
      'the other father entered in another great theater'
    ]
  },
  {
    id: 'lesson-7',
    tier: 5,
    title: 'Punctuation & Flow',
    subtitle: 'Commas, periods, quotes, and question marks',
    description: 'Integrate natural conversational punctuation into high-speed typing.',
    targetKeys: [',', '.', "'", '?', '!'],
    fingerAssignments: {},
    exercises: [
      'Is it true? Yes, it is! "Look here," she said.',
      'Why wait? Time is now, not later. "Never say never!"',
      '"Wisdom," wrote Seneca, "is the art of living well."'
    ]
  },
  {
    id: 'lesson-8', tier: 6, title: 'Numbers & Symbols', subtitle: 'Confident reaches beyond letters',
    description: 'Build accuracy on numbers and the symbols used in everyday writing.',
    targetKeys: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'], fingerAssignments: {},
    exercises: ['1 2 3 4 5 6 7 8 9 0 10 20 30 40 50', 'Room 12 opens at 8:30, and table 7 seats 4.', 'In 2026, the goal rose from 45 to 60 words per minute.']
  },
  {
    id: 'lesson-9', tier: 7, title: 'Capitalization', subtitle: 'Shift keys without breaking rhythm',
    description: 'Coordinate both shift keys while preserving a relaxed cadence.',
    targetKeys: ['Shift', 'A', 'T', 'M', 'S'], fingerAssignments: {},
    exercises: ['Alice and Thomas met Maya beside the river.', 'Monday, Tuesday, Wednesday, Thursday, Friday.', 'The Quiet Garden opened beneath a Silver Moon.']
  },
  {
    id: 'lesson-10', tier: 8, title: 'Natural Prose', subtitle: 'Sustained sentences and varied rhythm',
    description: 'Join every key group in expressive, naturally punctuated prose.',
    targetKeys: [], fingerAssignments: {},
    exercises: ['Morning arrived slowly, lifting the mist from the lake until every reed stood clear against the water.', 'A patient typist does not chase each letter; the hands learn the path, and the eyes remain with the thought.', 'Beyond the window, rain moved softly through the trees, and the room settled into a deeper kind of quiet.']
  },
  {
    id: 'lesson-11', tier: 9, title: 'Speed Control', subtitle: 'Increase pace without losing accuracy',
    description: 'Practice short bursts, measured recovery, and an even return to pace.',
    targetKeys: [], fingerAssignments: {},
    exercises: ['clear steady motion clear steady motion calm accurate rhythm', 'Speed grows from easy movement, clean keystrokes, and the patience to remain precise.', 'Move quickly through familiar words, then soften the pace when punctuation asks for care.']
  },
  {
    id: 'lesson-12', tier: 10, title: 'Endurance', subtitle: 'Comfort and consistency over longer work',
    description: 'Sustain posture, rhythm, and concentration through longer passages.',
    targetKeys: [], fingerAssignments: {},
    exercises: ['The finest practice feels almost unhurried. Shoulders remain loose, wrists stay level, and each finger travels only as far as it needs to travel. Over time, this economy of motion becomes speed without strain.', 'Consistency is not the absence of difficult moments. It is the habit of returning to a calm rhythm after each hesitation, allowing attention to settle again on the sentence rather than the individual key.', 'When a long session begins to feel heavy, pause briefly, breathe, and notice where tension has gathered. Good endurance is built through awareness and repetition, never by forcing tired hands to continue.']
  }
];
