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
  }
];
