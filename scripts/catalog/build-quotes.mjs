// Builds public/catalog/quotes.json from scripts/catalog/quote-sources.txt, checking every quote against the text of
// its source on Project Gutenberg. A quote that can't be found there is left out, and the published wording is taken
// from the source itself, so nothing is misquoted or misattributed.
//   node scripts/catalog/build-quotes.mjs
//
// quote-sources.txt: "## Category" lines start a category; every other non-empty line is
//   Author | Work [@gutenbergId] | quoted words
// The Gutenberg id is found from the work title and author in public/catalog/all.json when it isn't given.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { bookHtmlUrl, cachedFetch, cleanText, parseHtml, typeable } from './gutenberg.mjs';

const SOURCES = path.resolve('scripts/catalog/quote-sources.txt');
const OUT = path.resolve('public/catalog/quotes.json');
const MIN_CHARS = 20;
const MAX_CHARS = 420;

const slug = value => value.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[’'"]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Letters and digits only, lower-cased, with a map from each kept character back to its place in the original. */
function fold(text) {
  let folded = '';
  const at = [];
  let space = true;
  const source = text.normalize('NFKD');
  for (let index = 0; index < source.length; index++) {
    const character = source[index].toLowerCase();
    if (/[a-z0-9]/.test(character)) { folded += character; at.push(index); space = false; }
    else if (/\s|[-—–]/.test(character) && !space) { folded += ' '; at.push(index); space = true; }
  }
  return { folded: folded.trim(), at, source };
}

/** Cleans the edges of a quote taken from a book: stray punctuation, editorial brackets and small-capital openings. */
function tidy(input) {
  let text = input.replace(/^[\s'"(\[]+/, '').replace(/[\s,;:'"(\[-]+$/, '');
  // An unmatched bracket or quote mark is an editor's or printer's, not the author's.
  if ((text.match(/\[/g) ?? []).length !== (text.match(/\]/g) ?? []).length) text = text.replace(/[[\]]/g, '');
  if ((text.match(/"/g) ?? []).length % 2) text = text.replace(/"/g, '');
  const letters = text.replace(/[^A-Za-z]/g, '');
  if (letters.length && letters.replace(/[^A-Z]/g, '').length / letters.length > 0.8) {
    // Printed all in capitals: back to sentence case.
    text = text.toLowerCase().replace(/(^|[.!?]\s+)([a-z])/g, (_, before, letter) => before + letter.toUpperCase()).replace(/\bi\b/g, 'I');
  } else {
    // Books often set the first words in small capitals ("REVENGE is a kind of wild justice").
    text = text.replace(/^([A-Z][A-Z']+(?:\s+[A-Z][A-Z']*)*)(?=[\s,.]+[a-z(])/, words => words.toLowerCase().replace(/^./, letter => letter.toUpperCase()).replace(/\bi\b/g, 'I'));
  }
  return /^[a-z]/.test(text) ? text[0].toUpperCase() + text.slice(1) : text;
}

/** For a quote that isn't there word for word: the source sentence sharing the most of its words, as a hint. */
function closestSentence(book, wanted) {
  const words = new Set(wanted.split(' ').filter(word => word.length > 3));
  if (words.size < 3) return null;
  let best = null;
  for (const sentence of book.source.split(/(?<=[.!?;])\s+/)) {
    if (sentence.length > 600) continue;
    const own = new Set(fold(sentence).folded.split(' '));
    const shared = [...words].filter(word => own.has(word)).length / words.size;
    if (shared >= 0.6 && (!best || shared > best.shared)) best = { shared, sentence };
  }
  return best ? `(${Math.round(best.shared * 100)}%) ${cleanText(best.sentence).replace(/\s+/g, ' ').slice(0, 300)}` : null;
}

async function main() {
  const lines = (await readFile(SOURCES, 'utf8')).split('\n');
  const index = JSON.parse(await readFile(path.resolve('public/catalog/all.json'), 'utf8'));
  const books = new Map();
  const quotes = [];
  const failures = [];
  const seen = new Set();
  let category = 'Wisdom';

  const findBook = (work, author) => {
    const title = work.toLowerCase();
    const surname = author.split(/\s+/).at(-1).toLowerCase();
    const hits = index.filter(([, bookTitle, bookAuthor]) => bookTitle.toLowerCase().startsWith(title) && (bookAuthor ?? '').toLowerCase().includes(surname));
    return hits[0]?.[0] ?? null;
  };
  const loadBook = async id => {
    if (!books.has(id)) {
      const html = await cachedFetch(bookHtmlUrl(id));
      if (!html) { books.set(id, null); return null; }
      const doc = parseHtml(html);
      doc.querySelectorAll('.pagenum, .pg-boilerplate, #pg-header, #pg-footer, .footnote, .fnanchor').forEach(node => node.remove());
      books.set(id, fold(doc.body.textContent ?? ''));
    }
    return books.get(id);
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#') && !line.startsWith('##')) continue;
    if (line.startsWith('##')) { category = line.replace(/^##\s*/, ''); continue; }
    const [author, workField, ...rest] = line.split('|').map(part => part.trim());
    const quote = rest.join('|').trim();
    if (!author || !workField || !quote) { failures.push(`malformed: ${line}`); continue; }
    const [, work, idText] = workField.match(/^(.*?)(?:\s*@(\d+))?$/);
    const id = idText ? Number(idText) : findBook(work, author);
    if (!id) { failures.push(`no Gutenberg book for "${work}" by ${author}`); continue; }
    const book = await loadBook(id);
    if (!book) { failures.push(`book ${id} missing`); continue; }
    const wanted = fold(quote).folded;
    const found = book.folded.indexOf(wanted);
    if (found === -1) {
      const hint = closestSentence(book, wanted);
      failures.push(`not found in ${id} (${work}): ${quote.slice(0, 70)}${hint ? `\n    closest: ${hint}` : ''}`);
      continue;
    }
    // The source's own wording, from the first to the last matched character (closing punctuation included).
    const start = book.at[found];
    let end = book.at[found + wanted.length - 1] + 1;
    while (end < book.source.length && /[.!?,;:'"’”)]/.test(book.source[end])) end++;
    let text = typeable(cleanText(book.source.slice(start, end)).replace(/\s+/g, ' ')).replace(/^["']|[,;:]$/g, '');
    text = tidy(text);
    if (text.length < MIN_CHARS || text.length > MAX_CHARS) { failures.push(`length ${text.length}: ${text.slice(0, 60)}`); continue; }
    const key = wanted.slice(0, 80);
    if (seen.has(key)) { failures.push(`duplicate: ${text.slice(0, 60)}`); continue; }
    seen.add(key);
    const base = `${slug(author).split('-').at(-1)}-${slug(text).split('-').slice(0, 6).join('-')}`;
    let quoteId = base;
    for (let n = 2; quotes.some(item => item.id === quoteId); n++) quoteId = `${base}-${n}`;
    quotes.push({ id: quoteId, text, author, source: work, category, gutenberg: id, length: text.length < 90 ? 'short' : text.length < 200 ? 'medium' : 'long' });
  }

  await writeFile(OUT, JSON.stringify(quotes));
  const byCategory = {};
  for (const item of quotes) byCategory[item.category] = (byCategory[item.category] ?? 0) + 1;
  console.log(`Quotes: ${quotes.length}`, byCategory);
  if (failures.length) console.log(`\nLeft out ${failures.length}:\n${failures.join('\n')}`);
}

await main();
