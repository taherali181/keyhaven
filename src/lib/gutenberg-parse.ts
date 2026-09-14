// Turns a Project Gutenberg book (HTML edition, or plain text as a fallback) into chapters of paragraphs.
// Runs in the browser with DOMParser; no text from the book is ever inserted into the page as HTML.
import type { WorkSection } from '@/types';
import { countWords } from '@/lib/reading';

type Block = { kind: 'heading'; level: number; text: string } | { kind: 'para'; text: string };

const LINE_BREAK = '\u2028';
const FRONT_OR_BACK_MATTER = /^(contents|table of contents|list of (illustrations|plates)|illustrations|index|footnotes|notes|endnotes|transcriber'?s? notes?|colophon|the full project gutenberg licen[cs]e|end of (the )?project gutenberg)/i;
const HEADING_LIKE = /^(?:(?:chapter|book|part|act|scene|stave|letter|section|canto)\s+(?:[ivxlcdm]+|\d+|[a-z]+)\b[.:]?(?:\s.{0,70})?|[IVXLC]+\.?)$/i;
const BARE_NUMBER = /^(?:(?:chapter|part|book|section)\s+)?(?:[ivxlcdm]+|\d+)\.?$/i;

/** Straight quotes, plain dashes and single spaces, so every character can be typed on a normal keyboard. */
export function normalizeProse(value: string) {
  return value
    .replace(/[\t\n\r\f \u00a0]+/g, ' ')
    .replace(/ *\u2028 */g, '\n')
    .replace(/[\u2018\u2019\u201b\u2032]/g, "'")
    .replace(/[\u201c\u201d\u201e\u2033]/g, '"')
    .replace(/ *[\u2014\u2015] */g, ' - ')
    .replace(/\u2013/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00ad/g, '')
    .replace(/\s*[[(]\*?\d*[\])]/g, match => (/\d|\*/.test(match) ? '' : match))
    .replace(/ {2,}/g, ' ')
    .replace(/ +([,.;:!?])/g, '$1')
    .replace(/^[ -]+|\s+$/g, '')
    .replace(/\n{2,}/g, '\n');
}

/** "CHAPTER IV. THE STORM" → "Chapter IV. The Storm"; mixed-case titles are left alone. */
export function displayTitle(value: string) {
  const text = value.replace(/\s+/g, ' ').trim();
  if (/[a-z]/.test(text)) return text;
  const small = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);
  const words = text.toLowerCase().split(' ');
  return words.map((word, index) => {
    if (/^[ivxlcdm]+[.:]?$/i.test(word) && word.length <= 6 && !/^(mix|dim|mild|civil|lid|vivid|mid|mi|dc|cd)$/i.test(word.replace(/[.:]$/, ''))) return word.toUpperCase();
    if (index > 0 && small.has(word) && !/[.:!?]$/.test(words[index - 1])) return word;
    return word.replace(/(^|[-('"])(\p{L})/gu, (_, lead: string, letter: string) => lead + letter.toUpperCase());
  }).join(' ');
}

function blocksFromHtml(html: string): Block[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('#pg-header, #pg-footer, .pg-boilerplate, .pagenum, .fnanchor, .footnotes, .footnote, .toc, img, .caption, sup, script, style, noscript').forEach(node => node.remove());
  doc.querySelectorAll('br').forEach(node => node.replaceWith(LINE_BREAK));
  const blocks: Block[] = [];
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
  for (let node = walker.nextNode() as Element | null; node; node = walker.nextNode() as Element | null) {
    const tag = node.tagName;
    if (/^H[1-6]$/.test(tag)) {
      const text = normalizeProse(node.textContent ?? '').replace(/\n/g, ' ');
      if (text) blocks.push({ kind: 'heading', level: Number(tag[1]), text });
    } else if (tag === 'P' && !node.parentElement?.closest('p, h1, h2, h3, h4, h5, h6')) {
      const text = normalizeProse(node.textContent ?? '');
      if (text) blocks.push({ kind: 'para', text });
    } else if (node.classList.contains('stanza') && !node.querySelector('p')) {
      const lines = [...node.children].map(line => normalizeProse(line.textContent ?? '')).filter(Boolean);
      const text = lines.length ? lines.join('\n') : normalizeProse(node.textContent ?? '');
      if (text) blocks.push({ kind: 'para', text });
    }
  }
  return blocks;
}

function blocksFromText(source: string): Block[] {
  const start = source.search(/\*\*\*\s*START OF (THE|THIS) PROJECT GUTENBERG[^\n]*\n/i);
  const end = source.search(/\*\*\*\s*END OF (THE|THIS) PROJECT GUTENBERG/i);
  let body = source.slice(start >= 0 ? source.indexOf('\n', start) + 1 : 0, end >= 0 ? end : undefined);
  body = body.replace(/\r\n?/g, '\n');
  const blocks: Block[] = [];
  for (const raw of body.split(/\n\s*\n/)) {
    const lines = raw.split('\n').map(line => line.trim()).filter(Boolean);
    if (!lines.length) continue;
    const joined = lines.join(' ');
    if (lines.length <= 2 && joined.length <= 80 && (HEADING_LIKE.test(joined) || (!/[a-z]/.test(joined) && /[A-Z]{3}/.test(joined) && !/[.,;]$/.test(joined)))) {
      blocks.push({ kind: 'heading', level: 2, text: normalizeProse(joined) });
      continue;
    }
    // Short lines of similar length are verse: keep the line breaks.
    const verse = lines.length >= 3 && lines.every(line => line.length < 60);
    const text = normalizeProse(verse ? lines.join(LINE_BREAK) : joined);
    if (text) blocks.push({ kind: 'para', text });
  }
  return blocks;
}

interface Draft { title: string; paragraphs: string[]; words: number }

function splitAt(blocks: Block[], level: number): Draft[] {
  const drafts: Draft[] = [];
  let current: Draft = { title: '', paragraphs: [], words: 0 };
  let parent = '';
  for (const block of blocks) {
    if (block.kind === 'para') {
      current.paragraphs.push(block.text);
      current.words += countWords(block.text);
    } else if (block.level < level) {
      // A part/book heading above the chapter level names the chapters under it.
      if (current.paragraphs.length) { drafts.push(current); current = { title: '', paragraphs: [], words: 0 }; }
      parent = block.text;
      if (!current.paragraphs.length) current.title = '';
    } else if (block.level === level) {
      if (current.paragraphs.length) { drafts.push(current); current = { title: '', paragraphs: [], words: 0 }; }
      // Consecutive headings ("CHAPTER I" then "The Beginning") make one title; a heading with no text
      // under it that isn't a bare number (a contents page, a title page) is simply replaced.
      const title = current.title && BARE_NUMBER.test(current.title) ? `${current.title}: ${block.text}` : block.text;
      current.title = BARE_NUMBER.test(title) && /^(book|part|volume|act|canto)\b/i.test(parent) ? `${parent} · ${title}` : title;
    } else if (block.text.length <= 80 && !BARE_NUMBER.test(block.text)) {
      // Deeper headings (a scene, a letter's heading) stay in the text as their own line.
      current.paragraphs.push(block.text);
    }
  }
  if (current.paragraphs.length) drafts.push(current);
  return drafts;
}

/** Picks the heading level whose sections look most like chapters, and cleans up front and back matter. */
function sectionsFromBlocks(blocks: Block[]): WorkSection[] {
  const total = blocks.reduce((sum, block) => sum + (block.kind === 'para' ? countWords(block.text) : 0), 0);
  let chosen: Draft[] | null = null;
  for (const level of [4, 3, 2, 1]) {
    if (!blocks.some(block => block.kind === 'heading' && block.level === level)) continue;
    const drafts = splitAt(blocks, level).filter(draft => draft.title && !FRONT_OR_BACK_MATTER.test(draft.title));
    const substantial = drafts.filter(draft => draft.words >= 250);
    if (substantial.length < 2) continue;
    const covered = substantial.reduce((sum, draft) => sum + draft.words, 0) / Math.max(1, total);
    const sorted = substantial.map(draft => draft.words).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    // Deepest level wins as long as its sections are chapter-sized and cover most of the book.
    if (covered >= 0.75 && median >= 300) { chosen = drafts; break; }
  }

  let drafts = chosen ?? [];
  if (!drafts.length) {
    // No usable headings: even ~3,000-word parts on paragraph boundaries.
    const paragraphs = blocks.filter((block): block is Extract<Block, { kind: 'para' }> => block.kind === 'para').map(block => block.text);
    let current: Draft = { title: '', paragraphs: [], words: 0 };
    for (const paragraph of paragraphs) {
      current.paragraphs.push(paragraph);
      current.words += countWords(paragraph);
      if (current.words >= 3000) { drafts.push(current); current = { title: '', paragraphs: [], words: 0 }; }
    }
    if (current.paragraphs.length) drafts.push(current);
    drafts = drafts.map((draft, index) => ({ ...draft, title: `Part ${index + 1}` }));
  }

  return drafts
    .filter(draft => draft.words >= 40)
    .map((draft, index) => ({ id: `s${index}`, title: displayTitle(draft.title || `Part ${index + 1}`), paragraphs: draft.paragraphs }));
}

export function parseGutenbergHtml(html: string) {
  return sectionsFromBlocks(blocksFromHtml(html));
}

export function parseGutenbergText(text: string) {
  return sectionsFromBlocks(blocksFromText(text));
}
