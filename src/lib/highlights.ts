// Highlights and notes in the reader. A highlight is a stretch of one paragraph, stored by the section, the
// paragraph's index in it (data-paragraph) and character offsets, plus the quoted text for finding it again.
import type { HighlightColor, HighlightRecord } from '@/types';

export const HIGHLIGHT_COLORS: Array<{ id: HighlightColor; label: string }> = [
  { id: 'yellow', label: 'Yellow' },
  { id: 'green', label: 'Green' },
  { id: 'blue', label: 'Blue' },
  { id: 'pink', label: 'Pink' },
  { id: 'purple', label: 'Purple' }
];

export interface Anchor { paragraph: number; start: number; end: number; quote: string }

/** Letters, digits and the joiners inside words (apostrophes, hyphens). */
const WORD = /[\p{L}\p{N}'’-]/u;

/** Characters of `root`'s text that come before (node, offset). */
function textOffset(root: Node, node: Node, offset: number): number {
  if (node.nodeType !== Node.TEXT_NODE) {
    // An element boundary: count the text of the children before it.
    let total = 0;
    for (let index = 0; index < offset && index < node.childNodes.length; index++) total += node.childNodes[index].textContent?.length ?? 0;
    return (node === root ? 0 : textOffset(root, node.parentNode ?? root, [...(node.parentNode?.childNodes ?? [])].indexOf(node as ChildNode))) + total;
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let total = 0;
  let current: Node | null;
  while ((current = walker.nextNode())) {
    if (current === node) return total + offset;
    total += current.textContent?.length ?? 0;
  }
  return total;
}

/**
 * Where a selection sits in the reader, or null when it isn't inside a single paragraph. Spaces at the ends are
 * trimmed and partly selected words are completed, so highlights hug whole words.
 */
export function anchorFromRange(range: Range): Anchor | null {
  const startElement = (range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer.parentElement : range.startContainer as Element)?.closest<HTMLElement>('[data-paragraph]');
  const endElement = (range.endContainer.nodeType === Node.TEXT_NODE ? range.endContainer.parentElement : range.endContainer as Element)?.closest<HTMLElement>('[data-paragraph]');
  if (!startElement || startElement !== endElement) return null;
  const text = startElement.textContent ?? '';
  let start = textOffset(startElement, range.startContainer, range.startOffset);
  let end = textOffset(startElement, range.endContainer, range.endOffset);
  while (start < end && /\s/.test(text[start])) start++;
  while (end > start && /\s/.test(text[end - 1])) end--;
  // A drag rarely starts or stops exactly on a word's edge: take in the whole words it touches.
  while (start > 0 && WORD.test(text[start - 1]) && WORD.test(text[start])) start--;
  while (end < text.length && WORD.test(text[end - 1]) && WORD.test(text[end])) end++;
  if (end <= start) return null;
  return { paragraph: Number(startElement.dataset.paragraph), start, end, quote: text.slice(start, end) };
}

export interface Segment { text: string; highlight?: Pick<HighlightRecord, 'id' | 'color' | 'note'> }

/** Splits a paragraph into plain and highlighted runs. Overlaps go to the highlight made first. */
export function segmentParagraph(text: string, highlights: Array<Pick<HighlightRecord, 'id' | 'start' | 'end' | 'color' | 'note' | 'createdAt'>>): Segment[] {
  const owner: Array<number | undefined> = new Array(text.length);
  const ordered = [...highlights].sort((a, b) => a.createdAt - b.createdAt);
  ordered.forEach((highlight, index) => {
    for (let position = Math.max(0, highlight.start); position < Math.min(text.length, highlight.end); position++) owner[position] ??= index;
  });
  const segments: Segment[] = [];
  let from = 0;
  for (let position = 1; position <= text.length; position++) {
    if (position < text.length && owner[position] === owner[from]) continue;
    const index = owner[from];
    const highlight = index === undefined ? undefined : ordered[index];
    segments.push({ text: text.slice(from, position), ...(highlight ? { highlight: { id: highlight.id, color: highlight.color, note: highlight.note } } : {}) });
    from = position;
  }
  return segments;
}

/**
 * The highlight's offsets in the paragraph as it reads now. If the text shifted (a re-parsed book), the quote is
 * found again, preferring the match nearest the old spot; null when it's gone.
 */
export function reanchor(highlight: Pick<HighlightRecord, 'start' | 'end' | 'quote'>, text: string): { start: number; end: number } | null {
  if (text.slice(highlight.start, highlight.end) === highlight.quote) return { start: highlight.start, end: highlight.end };
  let best: number | null = null;
  for (let at = text.indexOf(highlight.quote); at !== -1; at = text.indexOf(highlight.quote, at + 1)) {
    if (best === null || Math.abs(at - highlight.start) < Math.abs(best - highlight.start)) best = at;
  }
  return best === null ? null : { start: best, end: best + highlight.quote.length };
}

/** A book's highlights and notes as Markdown, grouped by section. */
export function highlightsMarkdown(title: string, author: string, highlights: HighlightRecord[], sectionTitle: (index: number) => string): string {
  const lines = [`# ${title}`, ...(author ? [`*${author}*`] : []), ''];
  const sorted = [...highlights].sort((a, b) => a.sectionIndex - b.sectionIndex || a.paragraph - b.paragraph || a.start - b.start);
  let section = -1;
  for (const highlight of sorted) {
    if (highlight.sectionIndex !== section) {
      section = highlight.sectionIndex;
      lines.push(`## ${sectionTitle(section)}`, '');
    }
    lines.push(`> ${highlight.quote.replace(/\n+/g, ' ')}`, '');
    if (highlight.note?.trim()) lines.push(highlight.note.trim(), '');
  }
  return lines.join('\n').trimEnd() + '\n';
}
