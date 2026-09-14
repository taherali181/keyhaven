// Builds the Discover catalog from Project Gutenberg's offline catalogs.
//   node scripts/catalog/build-books.mjs [path/to/rdf-files.tar.bz2]
// Outputs public/catalog/books.json (top ~5,000 English books by downloads), summaries.json,
// authors.json, and all.json (a compact search index of every English text).
import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { cachedFetch, CACHE_DIR, parseCsv } from './gutenberg.mjs';

const OUT = path.resolve('public/catalog');
const TOP = 5000;
const SUMMARY_SHARDS = 64;

const decode = value => value
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));

/** Stream the RDF archive line by line and pull download counts and summaries for every ebook. */
async function readRdf(archive) {
  const { createInterface } = await import('node:readline');
  const stats = new Map();
  const tar = spawn('tar', ['-xjOf', archive], { stdio: ['ignore', 'pipe', 'inherit'] });
  let id = 0; let downloads = 0; let summary = null; let inSummary = false;
  const finish = () => {
    if (id) stats.set(id, { downloads, summary: summary ? decode(summary).replace(/\s*\(This is an automatically generated summary\.\)\s*$/i, '').replace(/\s+/g, ' ').trim() : undefined });
    id = 0; downloads = 0; summary = null; inSummary = false;
  };
  for await (const line of createInterface({ input: tar.stdout, crlfDelay: Infinity })) {
    const ebook = line.match(/<pgterms:ebook rdf:about="ebooks\/(\d+)"/);
    if (ebook) { finish(); id = Number(ebook[1]); continue; }
    if (!id) continue;
    const count = line.match(/<pgterms:downloads[^>]*>(\d+)</);
    if (count) downloads = Number(count[1]);
    if (inSummary || line.includes('<pgterms:marc520>')) {
      const text = line.replace('<pgterms:marc520>', '');
      const close = text.indexOf('</pgterms:marc520>');
      summary = `${summary ?? ''} ${close === -1 ? text : text.slice(0, close)}`;
      inSummary = close === -1;
    }
    if (line.includes('</rdf:RDF>')) finish();
  }
  finish();
  return stats;
}

/** "Doyle, Arthur Conan, 1859-1930" → { name: "Arthur Conan Doyle", birth: 1859, death: 1930 } */
export function parseAuthor(raw) {
  const role = raw.match(/\[([^\]]+)\]/)?.[1];
  let text = raw.replace(/\[[^\]]+\]/g, '').replace(/\s*\([^)]*\)/g, '').trim();
  let birth, death;
  const bce = /BCE/.test(text);
  // Trailing dates: "1859-1930", "-1471", "1775?-1817", "621? BCE-565? BCE", "active 12th century".
  const years = text.match(/,\s*(?:active\s+[^,]*|(\d{1,4})?\??\s*(?:BCE)?\s*-\s*(\d{1,4})?\??\s*(?:BCE)?)\s*$/);
  if (years) {
    text = text.slice(0, years.index).trim();
    if (years[1]) birth = Number(years[1]) * (bce ? -1 : 1);
    if (years[2]) death = Number(years[2]) * (bce ? -1 : 1);
  }
  const parts = text.split(/,\s*/).filter(part => !/^(Sir|Lord|Lady|Dame|Mrs\.?|Mr\.?|Dr\.?|Jr\.?|Rev\.?)$/i.test(part));
  let name;
  if (parts.length < 2) name = parts[0] ?? text;
  // "Marcus Aurelius, Emperor of Rome" / "Chrétien, de Troyes": the first part is already the name.
  else if (/^(Emperor|King|Queen|Saint|Pope|Prince|Princess|Duke|Earl|Baron|Count|of )\b/i.test(parts[1]) || / of /.test(parts[1])) name = parts[0];
  else if (/^[a-zà-ÿ]/.test(parts[1])) name = `${parts[0]} ${parts[1]}`;
  else name = `${parts[1]} ${parts[0]}`;
  return { name: name.replace(/\s+/g, ' ').trim(), birth, death, role };
}

const SHELF_CATEGORIES = [
  ['Classics of Literature', 'classics'],
  ['Novels', 'fiction'], ['Adventure', 'adventure'], ['Romance', 'romance'], ['Historical Novels', 'fiction'],
  ['Short Stories', 'short-stories'], ['Science-Fiction & Fantasy', 'scifi'], ['Crime, Thrillers and Mystery', 'mystery'],
  ['Children & Young Adult Reading', 'children'], ['Humour', 'humour'],
  ['Poetry', 'poetry'], ['Plays/Films/Dramas', 'drama'],
  ['Philosophy & Ethics', 'philosophy'], ['Religion/Spirituality', 'religion'], ['Mythology, Legends & Folklore', 'mythology'],
  ['Essays, Letters & Speeches', 'essays'], ['Biographies', 'biography'], ['Travel Writing', 'travel'],
  ['Politics', 'politics'], ['Economics', 'politics'], ['Psychiatry/Psychology', 'psychology'],
  ['Science - ', 'science'], ['Mathematics', 'science'], ['History - ', 'history'], ['Art', 'art'], ['Music', 'art']
];
const FICTION = new Set(['fiction', 'adventure', 'romance', 'short-stories', 'scifi', 'mystery', 'children', 'humour']);
const LITERATURE_SHELF = /Category: (British|American|French|German|Russian) Literature|Literature - Other/;
const NOISE_TITLE = /\b(index of the project gutenberg|dictionary|encyclop|vocabulary|glossary|catalogue|bibliography|proceedings|report of|magazine|journal of|monthly|weekly|quarterly|gazette|notes and queries|punch,? or the london charivari|vol\.|volume \d+ of|no\. \d+)\b/i;
const NOISE_SHELF = /Encyclopedias\/Dictionaries\/Reference|Category: Journals|Reports & Conference Proceedings/;

function categoriesFor(shelves, subjects) {
  const cats = new Set();
  for (const [shelf, cat] of SHELF_CATEGORIES) if (shelves.some(s => s.startsWith(`Category: ${shelf}`))) cats.add(cat);
  if (/horror tales|ghost stories|gothic/i.test(subjects)) cats.add('gothic');
  if (/fiction|stories|tales/i.test(subjects) && !cats.has('poetry') && !cats.has('drama')) cats.add('fiction');
  for (const cat of cats) if (FICTION.has(cat)) cats.add('fiction');
  const literary = [...cats].some(cat => FICTION.has(cat) || cat === 'poetry' || cat === 'drama');
  if (!literary && cats.size) cats.add('nonfiction');
  return [...cats];
}

async function main() {
  const archive = process.argv[2] ?? path.join(CACHE_DIR, 'rdf-files.tar.bz2');
  if (!existsSync(archive)) throw new Error(`RDF archive not found at ${archive}. Download https://www.gutenberg.org/cache/epub/feeds/rdf-files.tar.bz2 first.`);
  const csv = await cachedFetch('https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv');
  const [, ...rows] = parseCsv(csv);
  console.log('Reading download counts…');
  const stats = await readRdf(archive);

  const texts = rows
    .filter(row => row[1] === 'Text' && row[4]?.split('; ').includes('en'))
    .map(row => {
      const id = Number(row[0]);
      const [title, ...rest] = row[3].split('\n');
      const authors = row[5] ? row[5].split('; ').map(parseAuthor).filter(author => !author.role || /^Author$/i.test(author.role)) : [];
      const shelves = row[8] ? row[8].split('; ') : [];
      return { id, title: title.replace(/\s+/g, ' ').trim(), subtitle: rest.join(' ').replace(/\s+/g, ' ').trim() || undefined, authors, subjects: row[6] ?? '', shelves, downloads: stats.get(id)?.downloads ?? 0 };
    })
    .sort((a, b) => b.downloads - a.downloads);

  await mkdir(OUT, { recursive: true });
  const shortName = author => author?.name ?? 'Anonymous';
  await writeFile(path.join(OUT, 'all.json'), JSON.stringify(texts.map(book => [book.id, book.title, book.authors.map(shortName).join(', ')])));

  // Famous authors first, so "classics" can mean literature by the authors people actually read.
  const literaryCats = cats => cats.some(cat => FICTION.has(cat) || cat === 'poetry' || cat === 'drama' || cat === 'philosophy');
  const authorDownloads = new Map();
  for (const book of texts.slice(0, TOP * 2)) {
    const author = book.authors[0]?.name;
    if (author && !/^(Anonymous|Various|Unknown)/i.test(author)) authorDownloads.set(author, (authorDownloads.get(author) ?? 0) + book.downloads);
  }
  const famous = new Set([...authorDownloads.entries()].sort((a, b) => b[1] - a[1]).slice(0, 120).map(([name]) => name));

  const books = [];
  for (const book of texts) {
    if (books.length >= TOP) break;
    if (NOISE_TITLE.test(book.title) || book.shelves.some(shelf => NOISE_SHELF.test(shelf))) continue;
    const cats = categoriesFor(book.shelves, book.subjects);
    const deathYear = book.authors[0]?.death;
    if (famous.has(book.authors[0]?.name) && deathYear !== undefined && deathYear < 1940 && (literaryCats(cats) || book.shelves.some(shelf => LITERATURE_SHELF.test(shelf)))) cats.push('classics');
    books.push({
      id: book.id,
      title: book.title,
      ...(book.subtitle ? { subtitle: book.subtitle } : {}),
      authors: book.authors.map(({ name, birth, death }) => ({ name, ...(birth !== undefined ? { birth } : {}), ...(death !== undefined ? { death } : {}) })),
      cats: [...new Set(cats)],
      subjects: book.subjects.split('; ').map(subject => subject.split(' -- ')[0]).filter((subject, index, all) => subject && all.indexOf(subject) === index).slice(0, 4),
      downloads: book.downloads
    });
  }
  await writeFile(path.join(OUT, 'books.json'), JSON.stringify(books));
  // Summaries are only needed when a book's details open, so they're sharded by id.
  await rm(path.join(OUT, 'summaries'), { recursive: true, force: true });
  await mkdir(path.join(OUT, 'summaries'), { recursive: true });
  const shards = new Map();
  for (const book of books) {
    const summary = stats.get(book.id)?.summary;
    if (!summary) continue;
    const shard = book.id % SUMMARY_SHARDS;
    if (!shards.has(shard)) shards.set(shard, {});
    shards.get(shard)[book.id] = summary.length > 600 ? `${summary.slice(0, 600).replace(/\s+\S*$/, '')}…` : summary;
  }
  for (const [shard, entries] of shards) await writeFile(path.join(OUT, 'summaries', `${shard}.json`), JSON.stringify(entries));

  // Famous authors: most-downloaded authors among the top books, with their best-known works.
  const byAuthor = new Map();
  for (const book of books) for (const author of book.authors.slice(0, 1)) {
    if (/^(Anonymous|Various|Unknown)/i.test(author.name)) continue;
    const entry = byAuthor.get(author.name) ?? { ...author, downloads: 0, books: [] };
    entry.downloads += book.downloads; entry.books.push(book.id);
    byAuthor.set(author.name, entry);
  }
  const authors = [...byAuthor.values()].sort((a, b) => b.downloads - a.downloads).slice(0, 72);
  await writeFile(path.join(OUT, 'authors.json'), JSON.stringify(authors));

  const counts = {};
  for (const book of books) for (const cat of book.cats) counts[cat] = (counts[cat] ?? 0) + 1;
  console.log(`English texts: ${texts.length}; catalog: ${books.length}; authors: ${authors.length}`);
  console.log(counts);
}

await main();
