export type StepKind = 'keys' | 'bigrams' | 'words' | 'sentence' | 'checkpoint';

export interface LessonStep {
  kind: StepKind;
  title: string;
  /** Fixed text; otherwise the text is generated from the lesson's keys. */
  text?: string;
  capitals?: boolean;
  punctuation?: boolean;
  numbers?: boolean;
}

export interface AcademyLesson {
  id: string;
  unitId: string;
  title: string;
  goal: string;
  /** Keys this lesson introduces (highlighted on the guide). */
  newKeys: string[];
  /** Every key taught up to and including this lesson; generated drills never use others. */
  keys: string[];
  tips: string[];
  steps: LessonStep[];
  checkpoint: { wpm: number; accuracy: number };
  /** Drill the most common English letter pairs instead of pairs of the new keys. */
  bigrams?: boolean;
  /** Ids from the original 12-lesson course, so saved progress carries over. */
  legacyIds?: string[];
}

export interface AcademyUnit {
  id: string;
  title: string;
  summary: string;
  lessons: AcademyLesson[];
}
