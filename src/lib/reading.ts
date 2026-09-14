// Reading helpers: word counts, an adaptive reading speed, time formatting and typing chunks.

const SPEED_KEY = 'keyhaven_reading_wpm_v1';

/** Typical adult silent-reading speed, used until the reader's own pace is known. */
export const DEFAULT_READING_WPM = 238;
const MIN_WPM = 120;
const MAX_WPM = 450;

export function countWords(text: string) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** Removes chapter numbering without eating titles such as "I Strictly Business" or "Mix". */
export function sectionName(title: string) {
  const numbered = /^(?:book|part|volume|chapter|section|letter|stave|canto|act|scene)\s+(?:[ivxlcdm]+|\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b[\s.:\-–—)·]*/i;
  const bare = /^(?:\d+|[IVXLCDM]+)(?=\s*(?:[.:\-–—)·]|$))[\s.:\-–—)·]*/;
  let name = title.trim();
  for (;;) {
    const next = name.replace(numbered, '').replace(bare, '').trim();
    if (next === name) return name;
    name = next;
  }
}

export function loadReadingSpeed() {
  try {
    const stored = Number(localStorage.getItem(SPEED_KEY));
    return stored >= MIN_WPM && stored <= MAX_WPM ? stored : DEFAULT_READING_WPM;
  } catch {
    return DEFAULT_READING_WPM;
  }
}

/**
 * Blends one page's observed pace into the reading speed. Skims (under 5s), long pauses (over 5 min)
 * and near-empty pages are ignored so a single odd page can't swing the estimate.
 */
export function updateReadingSpeed(current: number, words: number, dwellMs: number) {
  if (words < 20 || dwellMs < 5_000 || dwellMs > 300_000) return current;
  const observed = Math.min(MAX_WPM, Math.max(MIN_WPM, words / (dwellMs / 60_000)));
  const next = Math.round(current * 0.7 + observed * 0.3);
  try { localStorage.setItem(SPEED_KEY, String(next)); } catch { /* memory only */ }
  return next;
}

/** "3 min left", "<1 min left", "1h 5 min left", split so the number can be emphasised. */
export function formatMinutesLeft(words: number, wpm: number) {
  if (words <= 0) return { value: '0', unit: 'min left' };
  const minutes = words / Math.max(1, wpm);
  if (minutes < 1) return { value: '<1', unit: 'min left' };
  const rounded = Math.ceil(minutes);
  if (rounded < 60) return { value: String(rounded), unit: 'min left' };
  return { value: `${Math.floor(rounded / 60)}h ${rounded % 60}`, unit: 'min left' };
}

/** Reading time for a passage: "<1 min", "4 min", "1h 5 min". */
export function formatReadTime(words: number, wpm: number) {
  const minutes = words / Math.max(1, wpm);
  if (minutes < 1) return '<1 min';
  const rounded = Math.round(minutes);
  return rounded < 60 ? `${rounded} min` : `${Math.floor(rounded / 60)}h ${rounded % 60} min`;
}

/** Typing mode splits a section into chunks of about this many words, on paragraph boundaries. */
export const CHUNK_TARGET_WORDS = 180;
/** Paragraphs longer than this are split at sentence ends so a chunk never grows unwieldy. */
const LONG_PARAGRAPH_WORDS = 400;

export interface TextChunk {
  /** Paragraphs joined with "\n" (typed with Enter); pieces of one long paragraph joined with a space. */
  text: string;
  words: number;
  /** The chunk's paragraphs for reading mode (pieces of one split paragraph are rejoined). */
  paragraphs: string[];
  /** Indexes of the first and last paragraph this chunk draws from. */
  firstParagraph: number;
  lastParagraph: number;
}

type ChunkPart = { text: string; paragraph: number };

function toChunk(parts: ChunkPart[], words: number): TextChunk {
  const paragraphs: string[] = [];
  parts.forEach((part, index) => {
    if (index > 0 && part.paragraph === parts[index - 1].paragraph) paragraphs[paragraphs.length - 1] += ` ${part.text}`;
    else paragraphs.push(part.text);
  });
  return { text: paragraphs.join('\n'), words, paragraphs, firstParagraph: parts[0].paragraph, lastParagraph: parts[parts.length - 1].paragraph };
}

/** Splits an over-long paragraph at sentence ends into pieces of roughly `target` words. */
export function splitLongParagraph(paragraph: string, target = CHUNK_TARGET_WORDS) {
  if (countWords(paragraph) <= LONG_PARAGRAPH_WORDS) return [paragraph];
  const sentences = paragraph.match(/[^.!?]+(?:[.!?]+["')\]]*|$)\s*/g) ?? [paragraph];
  const pieces: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    current += sentence;
    if (countWords(current) >= target) { pieces.push(current.trim()); current = ''; }
  }
  if (current.trim()) {
    if (pieces.length && countWords(current) < target * 0.35) pieces[pieces.length - 1] = `${pieces[pieces.length - 1]} ${current.trim()}`;
    else pieces.push(current.trim());
  }
  return pieces;
}

/** Groups paragraphs into typing chunks of about `target` words without breaking a paragraph (unless it is very long). */
export function chunkParagraphs(paragraphs: string[], target = CHUNK_TARGET_WORDS): TextChunk[] {
  const chunks: TextChunk[] = [];
  let parts: ChunkPart[] = [];
  let words = 0;
  paragraphs.forEach((paragraph, index) => {
    for (const piece of splitLongParagraph(paragraph, target)) {
      parts.push({ text: piece, paragraph: index });
      words += countWords(piece);
      if (words >= target) { chunks.push(toChunk(parts, words)); parts = []; words = 0; }
    }
  });
  if (parts.length) {
    // Fold a short tail into the previous chunk rather than leaving a stub at the end.
    const last = chunks.at(-1);
    if (last && words < target * 0.35) {
      chunks.pop();
      const previous: ChunkPart[] = last.paragraphs.map((text, offset) => ({ text, paragraph: last.firstParagraph + offset }));
      // Keep a paragraph split across the boundary joined.
      const merged = previous.concat(parts.map(part => ({ ...part, paragraph: part.paragraph === last.lastParagraph ? previous[previous.length - 1].paragraph : part.paragraph })));
      chunks.push({ ...toChunk(merged, last.words + words), firstParagraph: last.firstParagraph, lastParagraph: parts[parts.length - 1].paragraph });
    } else {
      chunks.push(toChunk(parts, words));
    }
  }
  return chunks;
}
