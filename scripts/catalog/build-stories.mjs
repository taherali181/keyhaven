// Extracts hand-picked short stories from Project Gutenberg collections.
//   node scripts/catalog/build-stories.mjs
// Reads scripts/catalog/story-sources.json and writes public/catalog/stories/index.json plus one
// JSON file per story ({ paragraphs }). Every story is validated; failures are reported and skipped.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { bookHtmlUrl, cachedFetch, cleanText, countWords, normalizeTitle, parseHtml } from './gutenberg.mjs';

const OUT = path.resolve('public/catalog/stories');
const MANIFEST = path.resolve('scripts/catalog/story-sources.json');
const MIN_WORDS = 400;
const MAX_WORDS = 22000;
const MAX_STORIES = 320;
const QUICK_READ_WORDS = 2400; // about ten minutes at an average reading pace

const slug = value => value.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[’'"]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Straight quotes and plain dashes, so every character in a story can be typed on a normal keyboard. */
export function typeable(text) {
  return cleanText(text)
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/\s*[—―]\s*/g, ' - ')
    .replace(/–/g, '-')
    .replace(/…/g, '...')
    .replace(/­/g, '')
    .replace(/\s*[\[(]\*?\d*[\])]/g, (match) => (/\d|\*/.test(match) ? '' : match)) // footnote markers like [1], (*1) or (*)
    .replace(/ {2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/^- /, '')
    .trim();
}

/** Heading text without page numbers, numbering or trailing punctuation, for matching against titles. */
function headingKey(element) {
  const text = cleanText(element.textContent)
    .replace(/^p\.\s*\d+\s*/i, '')
    .replace(/^(chapter|story|tale|part)\s+/i, '')
    .replace(/^([ivxlc]+|\d+)(?:[.:)]\s*|\s+)(?=\S)/i, '')
    .replace(/\[\d+\]|\(\*?\d+\)/g, '');
  return normalizeTitle(text);
}

const level = element => Number(element.tagName.slice(1));

function extract(doc, story, otherKeys) {
  const wanted = normalizeTitle(story.match ?? story.title);
  const headings = [...doc.body.querySelectorAll('h1, h2, h3, h4, h5')];
  const candidates = headings.filter(heading => headingKey(heading) === wanted);
  if (!candidates.length) return { error: 'heading not found' };
  // Title pages and contents lists repeat story titles as headings; use the one that actually starts the text.
  let best = null;
  for (const candidate of story.occurrence !== undefined ? [candidates[story.occurrence]] : candidates) {
    const result = collect(doc, candidate, story, otherKeys);
    if (!best || result.words > best.words) best = result;
  }
  const { paragraphs, words } = best;
  if (paragraphs.length < 3) return { error: `only ${paragraphs.length} paragraphs` };
  if (words < (story.minWords ?? MIN_WORDS) || words > MAX_WORDS) return { error: `${words} words` };
  return { paragraphs, words };
}

const JUNK_PARAGRAPH = /project gutenberg|^\[?transcriber'?s?'? note|^by$|^\(\*\d*\)|^([ivxlc]+|\d+)\.?$|^(the end|finis)\.?$/i;

function collect(doc, start, story, otherKeys) {
  const paragraphs = [];
  const walker = doc.createTreeWalker(doc.body, 1 /* SHOW_ELEMENT */);
  walker.currentNode = start;
  // Skip the heading's own subtree.
  let next = walker.nextNode();
  while (next && start.contains(next)) next = walker.nextNode();

  for (; next; next = walker.nextNode()) {
    const tag = next.tagName;
    if (/^H[1-6]$/.test(tag)) {
      const raw = cleanText(next.textContent).replace(/^p\.\s*\d+\s*/i, '');
      if (story.ignoreHeadings?.includes(raw)) continue;
      // Numbered sub-headings belong to the story: bare numerals (I, II., CHAPTER III) at any depth, and
      // numbered chapter titles only when nested below the story heading. A numbered heading with its own
      // title at the story's level ("II. The Adventure of…") is the next story.
      const bare = /^(chapter|part|book|section|letter)?\s*([ivxlc]+|\d+)\.?$/i.test(raw);
      const numberedTitle = /^(chapter|part|book|section|letter)?\s*([ivxlc]+|\d+)\b/i.test(raw);
      if (!otherKeys.has(headingKey(next)) && (bare ? level(next) >= level(start) : numberedTitle && level(next) > level(start))) continue;
      break;
    }
    if (next.closest('.pg-boilerplate, #pg-footer, #pg-header, .footnotes, .footnote, .toc, table')) continue;
    if (tag === 'P' && !next.parentElement.closest('p')) {
      const text = typeable(next.textContent);
      if (text && !JUNK_PARAGRAPH.test(text)) paragraphs.push(text);
    } else if (next.classList.contains('stanza') || next.classList.contains('poem')) {
      // Verse inside a story: one paragraph per stanza, lines joined with a slash.
      if (next.classList.contains('poem') && next.querySelector('.stanza')) continue;
      const lines = [...next.querySelectorAll('.line, .verse, span.i0, span.i2, span.i4, div')].map(line => typeable(line.textContent)).filter(Boolean);
      if (lines.length && !next.querySelector('p')) paragraphs.push(lines.join(' / '));
    }
    if (story.endsWith && paragraphs.length && normalizeTitle(paragraphs.at(-1)).startsWith(normalizeTitle(story.endsWith))) break;
  }

  // A byline repeated under the title ("Frank R. Stockton", "By O. Henry").
  while (paragraphs.length && normalizeTitle(paragraphs[0].replace(/^by\s+/i, '')) === normalizeTitle(story.author ?? '')) paragraphs.shift();
  // Short all-caps subtitles right under the title ("A FANTASY", "A ROMANCE IN ONE CHAPTER").
  while (paragraphs.length && paragraphs[0].length < 40 && paragraphs[0] === paragraphs[0].toUpperCase() && /[A-Z]/.test(paragraphs[0])) paragraphs.shift();
  if (story.skipFirst) paragraphs.splice(0, story.skipFirst);
  if (story.dropLast) paragraphs.splice(-story.dropLast);
  return { paragraphs, words: paragraphs.reduce((sum, paragraph) => sum + countWords(paragraph), 0) };
}

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  const index = [];
  const failures = [];
  const ids = new Set();

  for (const source of manifest.sources) {
    const html = await cachedFetch(bookHtmlUrl(source.id));
    if (!html) { failures.push(`${source.id}: source missing`); continue; }
    const doc = parseHtml(html);
    doc.querySelectorAll('.pagenum, .fnanchor, .caption, img, .figcenter .caption, sup, .pg-boilerplate, #pg-header, #pg-footer').forEach(node => node.remove());
    const stories = source.stories.map(entry => (typeof entry === 'string' ? { title: entry } : entry));
    const keys = new Set(stories.map(story => normalizeTitle(story.match ?? story.title)));

    for (const story of stories) {
      const others = new Set([...keys].filter(key => key !== normalizeTitle(story.match ?? story.title)));
      const result = extract(doc, { ...story, author: story.author ?? source.author }, others);
      if (result.error) { failures.push(`${source.id} "${story.title}": ${result.error}`); continue; }
      let id = story.id ?? slug(story.title);
      if (ids.has(id)) id = `${id}-${slug(source.author).split('-').at(-1)}`;
      ids.add(id);
      const author = story.author ?? source.author;
      const tags = [...new Set([...(source.tags ?? []), ...(story.tags ?? []), ...(result.words <= QUICK_READ_WORDS ? ['quick'] : [])])];
      index.push({ id, title: story.title, author, year: story.year ?? source.year, words: result.words, tags, ...(story.popular ? { popular: true } : {}), source: source.id });
      await writeFile(path.join(OUT, `${id}.json`), JSON.stringify({ paragraphs: result.paragraphs }));
    }
  }

  // Keep every popular story, then take the rest round-robin across authors in manifest order.
  const chosen = new Set(index.filter(story => story.popular));
  const queues = new Map();
  for (const story of index) if (!story.popular) { if (!queues.has(story.author)) queues.set(story.author, []); queues.get(story.author).push(story); }
  while (chosen.size < MAX_STORIES && [...queues.values()].some(queue => queue.length)) {
    for (const queue of queues.values()) if (queue.length && chosen.size < MAX_STORIES) chosen.add(queue.shift());
  }
  const dropped = index.filter(story => !chosen.has(story));
  await Promise.all(dropped.map(story => rm(path.join(OUT, `${story.id}.json`))));
  index.splice(0, index.length, ...index.filter(story => chosen.has(story)));
  await writeFile(path.join(OUT, 'index.json'), JSON.stringify(index));
  const byAuthor = {};
  for (const story of index) byAuthor[story.author] = (byAuthor[story.author] ?? 0) + 1;
  console.log(`Stories: ${index.length} (${index.filter(story => story.popular).length} popular, ${index.filter(story => story.tags.includes('quick')).length} quick reads)`);
  console.log(byAuthor);
  if (failures.length) console.log(`\nSkipped ${failures.length}:\n${failures.join('\n')}`);
}

await main();
