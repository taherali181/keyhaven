// The reader's own writing, from Write. A manuscript is stored exactly as written; when it opens in the reader it
// becomes sections of paragraphs, with its punctuation made typeable on an ordinary keyboard.
import type { ManuscriptRecord, WorkSection } from '@/types';
import { countWords } from '@/lib/reading';

export const manuscriptKey = (id: string) => `ms:${id}`;

/** A line that starts a new section: "# Title" (any heading level, trailing #s ignored). */
const HEADING = /^\s{0,3}#{1,6}\s+(.+?)(?:\s+#+)?\s*$/;

/** Curly quotes, long dashes and ellipses become their plain-keyboard forms; spacing is tidied. */
export function typeableProse(text: string) {
  return text
    .replace(/\[\[kh-img:[^\]]*\]\]/g, '')
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/ *[—―] */g, ' - ')
    .replace(/–/g, '-')
    .replace(/…/g, '...')
    .replace(/[­​]/g, '')
    .replace(/[\t  ]+/g, ' ');
}

/** Blank lines separate paragraphs; a single line break inside a paragraph is kept (for verse, lists, addresses). */
function paragraphsOf(lines: string[]) {
  return lines.join('\n').split(/\n\s*\n/)
    .map(block => block.split('\n').map(line => typeableProse(line).trim()).filter(Boolean).join('\n'))
    .filter(Boolean);
}

/** The display title: the one given, or the first words of the piece. */
export function manuscriptTitle(record: Pick<ManuscriptRecord, 'title' | 'body'>) {
  const title = record.title.trim();
  if (title) return title;
  const first = record.body.split('\n').map(line => line.replace(HEADING, '$1').trim()).find(Boolean);
  if (!first) return 'Untitled';
  return first.length > 48 ? `${first.slice(0, 48).replace(/\s+\S*$/, '')}…` : first;
}

/** "# Heading" lines start sections. Text before the first heading is a section named after the piece. */
export function manuscriptSections(record: Pick<ManuscriptRecord, 'title' | 'body'>): WorkSection[] {
  const parts: Array<{ title: string; lines: string[] }> = [{ title: manuscriptTitle(record), lines: [] }];
  for (const line of record.body.replace(/\r\n?/g, '\n').split('\n')) {
    const heading = line.match(HEADING);
    if (heading) parts.push({ title: typeableProse(heading[1]).trim(), lines: [] });
    else parts[parts.length - 1].lines.push(line);
  }
  return parts
    .map(part => ({ title: part.title, paragraphs: paragraphsOf(part.lines) }))
    .filter(part => part.paragraphs.length)
    .map((part, index) => ({ id: `m${index}`, ...part }));
}

/** Words in the piece, headings included. */
export function manuscriptWords(body: string) {
  return countWords(body.replace(/^\s{0,3}#{1,6}\s+/gm, ''));
}

export function newManuscript(now = Date.now()): ManuscriptRecord {
  return { id: crypto.randomUUID(), title: '', body: '', createdAt: now, updatedAt: now };
}
