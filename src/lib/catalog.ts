// The reading catalog: bundled short stories, the Project Gutenberg book list, search, and opening a work.
import type { CatalogAuthor, CatalogBook, StoryMeta, Work, WorkSection } from '@/types';
import { db } from '@/lib/db';
import { parseGutenbergHtml, parseGutenbergText } from '@/lib/gutenberg-parse';
import { manuscriptSections, manuscriptTitle } from '@/lib/manuscript';

const SUMMARY_SHARDS = 64;
const requests = new Map<string, Promise<unknown>>();

function loadJson<T>(path: string): Promise<T> {
  if (!requests.has(path)) {
    const request = fetch(`/catalog/${path}`).then(response => {
      if (!response.ok) throw new Error(`Could not load ${path}`);
      return response.json();
    });
    request.catch(() => requests.delete(path));
    requests.set(path, request);
  }
  return requests.get(path) as Promise<T>;
}

export const loadStoryIndex = () => loadJson<StoryMeta[]>('stories/index.json');
export const loadBookCatalog = () => loadJson<CatalogBook[]>('books.json');
export const loadAuthors = () => loadJson<CatalogAuthor[]>('authors.json');
/** Every English Gutenberg text as [id, title, author]; only fetched when a search asks for more. */
export const loadFullIndex = () => loadJson<Array<[number, string, string]>>('all.json');

export async function loadSummary(bookId: number) {
  try {
    const shard = await loadJson<Record<string, string>>(`summaries/${bookId % SUMMARY_SHARDS}.json`);
    return shard[bookId] ?? null;
  } catch {
    return null;
  }
}

// ── Keys ──

const CURRENT_WORK_STORAGE = 'keyhaven_current_work_v1';

/** The work open in the reader, remembered so the next visit can resume it. */
export function rememberWork(key: string) {
  try { localStorage.setItem(CURRENT_WORK_STORAGE, key); } catch { /* memory only */ }
}
export function rememberedWork() {
  try { return localStorage.getItem(CURRENT_WORK_STORAGE); } catch { return null; }
}

export const storyKey = (id: string) => `story:${id}`;
export const bookKey = (id: number) => `pg:${id}`;
export const importKey = (id: string) => `import:${id}`;

export function parseKey(key: string) {
  const [kind, ...rest] = key.split(':');
  const id = rest.join(':');
  if (kind === 'story') return { kind: 'story' as const, id };
  if (kind === 'pg') return { kind: 'book' as const, id };
  if (kind === 'import') return { kind: 'import' as const, id };
  if (kind === 'ms') return { kind: 'manuscript' as const, id };
  return null;
}

// ── Lists ──

export const STORY_LISTS: Array<{ id: string; label: string; test: (story: StoryMeta) => boolean }> = [
  { id: 'popular', label: 'Popular', test: story => Boolean(story.popular) },
  { id: 'quick', label: 'Quick reads', test: story => story.tags.includes('quick') },
  { id: 'mystery', label: 'Mystery & detection', test: story => story.tags.includes('mystery') },
  { id: 'gothic', label: 'Ghost & gothic', test: story => story.tags.includes('gothic') },
  { id: 'humour', label: 'Humour', test: story => story.tags.includes('humour') },
  { id: 'love', label: 'Love & longing', test: story => story.tags.includes('love') },
  { id: 'fairy', label: 'Fairy tales & fables', test: story => story.tags.includes('fairy') },
  { id: 'russian', label: 'Russian masters', test: story => story.tags.includes('russian') },
  { id: 'adventure', label: 'Adventure', test: story => story.tags.includes('adventure') },
  { id: 'scifi', label: 'Strange & speculative', test: story => story.tags.includes('scifi') },
  { id: 'modernist', label: 'Modernists', test: story => story.tags.includes('modernist') }
];

export const BOOK_CATEGORIES: Array<{ id: string; label: string }> = [
  { id: 'popular', label: 'Popular' },
  { id: 'classics', label: 'Classics' },
  { id: 'fiction', label: 'Fiction' },
  { id: 'nonfiction', label: 'Non-fiction' },
  { id: 'philosophy', label: 'Philosophy' },
  { id: 'poetry', label: 'Poetry' },
  { id: 'drama', label: 'Drama' },
  { id: 'scifi', label: 'Sci-fi & fantasy' },
  { id: 'mystery', label: 'Mystery' },
  { id: 'adventure', label: 'Adventure' },
  { id: 'gothic', label: 'Gothic & horror' },
  { id: 'romance', label: 'Romance' },
  { id: 'children', label: "Children's" },
  { id: 'history', label: 'History' },
  { id: 'biography', label: 'Biography' },
  { id: 'religion', label: 'Religion & myth' },
  { id: 'essays', label: 'Essays & letters' },
  { id: 'science', label: 'Science' },
  { id: 'authors', label: 'Famous authors' }
];

export function booksInCategory(books: CatalogBook[], category: string) {
  if (category === 'popular') return books;
  if (category === 'religion') return books.filter(book => book.cats.includes('religion') || book.cats.includes('mythology'));
  return books.filter(book => book.cats.includes(category));
}

// ── Search ──

const fold = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/** Every query word must appear; title-start and whole-word matches rank higher. Null when there's no match. */
function score(query: string[], title: string, secondary: string) {
  const foldedTitle = ` ${fold(title)} `;
  const haystack = `${foldedTitle}${fold(secondary)} `;
  let total = 0;
  for (const word of query) {
    const at = haystack.indexOf(word);
    if (at === -1) return null;
    total += foldedTitle.includes(` ${word}`) ? 3 : 1;
    if (haystack.includes(` ${word} `)) total += 1;
  }
  if (foldedTitle.trim().startsWith(query.join(' '))) total += 5;
  return total;
}

export function searchStories(stories: StoryMeta[], query: string) {
  const words = fold(query).split(' ').filter(Boolean);
  if (!words.length) return stories;
  return stories
    .map(story => ({ story, value: score(words, story.title, `${story.author} ${story.tags.join(' ')}`) }))
    .filter((match): match is { story: StoryMeta; value: number } => match.value !== null)
    .sort((a, b) => b.value - a.value)
    .map(match => match.story);
}

export function searchBooks(books: CatalogBook[], query: string, limit = 60) {
  const words = fold(query).split(' ').filter(Boolean);
  if (!words.length) return books.slice(0, limit);
  const matches: Array<{ book: CatalogBook; value: number }> = [];
  for (const book of books) {
    const value = score(words, `${book.title} ${book.subtitle ?? ''}`, book.authors.map(author => author.name).join(' '));
    if (value !== null) matches.push({ book, value: value + Math.log10(book.downloads + 1) });
  }
  return matches.sort((a, b) => b.value - a.value).slice(0, limit).map(match => match.book);
}

/** Searches the full index, returning titles that are not already in the popular catalog. */
export function searchFullIndex(index: Array<[number, string, string]>, known: Set<number>, query: string, limit = 60) {
  const words = fold(query).split(' ').filter(Boolean);
  if (!words.length) return [];
  const matches: Array<{ entry: [number, string, string]; value: number; order: number }> = [];
  index.forEach((entry, order) => {
    if (known.has(entry[0])) return;
    const value = score(words, entry[1], entry[2]);
    if (value !== null) matches.push({ entry, value, order });
  });
  // The index is sorted by downloads, so ties keep popularity order.
  return matches.sort((a, b) => b.value - a.value || a.order - b.order).slice(0, limit).map(({ entry }) => ({ id: entry[0], title: entry[1], author: entry[2] }));
}

export const authorLine = (book: Pick<CatalogBook, 'authors'>) => book.authors.map(author => author.name).join(', ') || 'Anonymous';

export function lifeYears(author: { birth?: number; death?: number }) {
  const year = (value: number) => (value < 0 ? `${-value} BCE` : String(value));
  if (author.birth !== undefined && author.death !== undefined) return `${year(author.birth)}–${year(author.death)}`;
  if (author.death !== undefined) return `d. ${year(author.death)}`;
  if (author.birth !== undefined) return `b. ${year(author.birth)}`;
  return '';
}

// ── Opening works ──

/** Imported documents store each section as one block of text; split it back into readable paragraphs. */
function importedParagraphs(text: string) {
  const byLine = text.split(/\n\s*\n/).map(part => part.replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (byLine.length > 1) return byLine;
  const sentences = text.match(/[^.!?]+(?:[.!?]+["')\]]*|$)\s*/g) ?? [text];
  const paragraphs: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    current += sentence;
    if (current.split(/\s+/).length >= 120) { paragraphs.push(current.trim()); current = ''; }
  }
  if (current.trim()) paragraphs.push(current.trim());
  return paragraphs;
}

export class WorkLoadError extends Error {}

export async function loadWork(key: string): Promise<Work> {
  const parsed = parseKey(key);
  if (!parsed) throw new WorkLoadError('Unknown book');

  if (parsed.kind === 'story') {
    const [index, text] = await Promise.all([loadStoryIndex(), loadJson<{ paragraphs: string[] }>(`stories/${parsed.id}.json`)]);
    const meta = index.find(story => story.id === parsed.id);
    if (!meta) throw new WorkLoadError('This story is no longer in the catalog');
    return { key, kind: 'story', title: meta.title, author: meta.author, year: meta.year, sections: [{ id: 's0', title: meta.title, paragraphs: text.paragraphs }], updatedAt: 0 };
  }

  if (parsed.kind === 'import') {
    const document = await db.importedDocuments.get(parsed.id);
    if (!document) throw new WorkLoadError('This imported book was deleted');
    const sections: WorkSection[] = document.sections.map(section => ({ id: section.id, title: section.title, paragraphs: importedParagraphs(section.text) })).filter(section => section.paragraphs.length);
    return { key, kind: 'import', title: document.title, author: document.author, sections, updatedAt: document.updatedAt, format: document.format };
  }

  if (parsed.kind === 'manuscript') {
    const record = await db.manuscripts.get(parsed.id);
    if (!record) throw new WorkLoadError('This piece was deleted');
    const sections = manuscriptSections(record);
    if (!sections.length) throw new WorkLoadError('This piece has no text yet');
    return { key, kind: 'manuscript', title: manuscriptTitle(record), author: 'You', sections, updatedAt: record.updatedAt };
  }

  const cached = await db.works.get(key).catch(() => undefined);
  if (cached?.sections.length) return cached;

  const id = Number(parsed.id);
  const response = await fetch(`/api/gutenberg/${id}`).catch(() => null);
  if (!response) throw new WorkLoadError('You appear to be offline');
  if (!response.ok) {
    const message = await response.json().then((body: { error?: string }) => body.error).catch(() => undefined);
    throw new WorkLoadError(message ?? 'Could not open this book');
  }
  const body = await response.text();
  const sections = response.headers.get('X-Book-Format') === 'txt' ? parseGutenbergText(body) : parseGutenbergHtml(body);
  if (!sections.length) throw new WorkLoadError('This book has no readable text');

  const books = await loadBookCatalog().catch(() => [] as CatalogBook[]);
  const entry = books.find(book => book.id === id);
  let title = entry?.title;
  let author = entry ? authorLine(entry) : undefined;
  if (!entry) {
    const full = await loadFullIndex().catch(() => [] as Array<[number, string, string]>);
    const row = full.find(item => item[0] === id);
    title = row?.[1];
    author = row?.[2];
  }
  const work: Work = { key, kind: 'book', title: title ?? `Book ${id}`, author: author || 'Anonymous', year: entry?.authors[0]?.death, sections, updatedAt: Date.now() };
  await db.works.put(work).catch(() => {});
  return work;
}
