import { db } from '@/lib/db';

/** Story typing results are saved with titles like "The Gift of the Magi · Part 2". */
export const STORY_PART_SUFFIX = / · Part (\d+)$/;

/** 0-based indexes of the parts of a story that have been typed to completion at least once. */
export async function loadTypedStoryParts(storyTitle: string) {
  const results = await db.testResults.where('mode').equals('stories').toArray();
  return new Set(results
    .filter(result => result.subMode === storyTitle)
    .map(result => Number(result.title?.match(STORY_PART_SUFFIX)?.[1]) - 1)
    .filter(index => Number.isInteger(index) && index >= 0));
}

/**
 * Typed parts of a work, grouped by result-title prefix. Stories save "<story> · Part n" and books
 * "<book> · <chapter> · Part n", so the map is keyed by "<story>" or "<book> · <chapter>".
 */
export async function loadTypedParts(mode: 'stories' | 'library', workTitle: string) {
  const results = await db.testResults.where('mode').equals(mode).toArray();
  const parts = new Map<string, Set<number>>();
  for (const result of results) {
    if (result.subMode !== workTitle || !result.title) continue;
    const match = result.title.match(STORY_PART_SUFFIX);
    if (!match || match.index === undefined) continue;
    const prefix = result.title.slice(0, match.index);
    if (!parts.has(prefix)) parts.set(prefix, new Set());
    parts.get(prefix)!.add(Number(match[1]) - 1);
  }
  return parts;
}

/** Titles of the chapters of a book typed to completion (library results are saved as "<book> · <chapter>"). */
export async function loadTypedChapters(bookTitle: string) {
  const results = await db.testResults.where('mode').equals('library').toArray();
  const prefix = `${bookTitle} · `;
  return new Set(results
    .filter(result => result.subMode === bookTitle && result.title?.startsWith(prefix))
    .map(result => result.title!.slice(prefix.length)));
}
