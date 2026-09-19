// Shared helpers for the catalog build scripts: cached downloads from Project Gutenberg and HTML parsing.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

export const CACHE_DIR = process.env.CATALOG_CACHE ?? path.resolve('node_modules/.cache/keyhaven-catalog');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/** Fetch a URL once and keep it on disk; Gutenberg asks for gentle, cached access. */
export async function cachedFetch(url, { binary = false } = {}) {
  await mkdir(CACHE_DIR, { recursive: true });
  const file = path.join(CACHE_DIR, url.replace(/^https?:\/\//, '').replace(/[^a-z0-9.]+/gi, '_'));
  if (existsSync(file)) return binary ? readFile(file) : readFile(file, 'utf8');
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, { headers: { 'User-Agent': 'KeyHaven catalog builder' } });
    if (response.ok) {
      const body = Buffer.from(await response.arrayBuffer());
      await writeFile(file, body);
      await sleep(400);
      return binary ? body : body.toString('utf8');
    }
    if (response.status === 404) return null;
    await sleep(1500 * (attempt + 1));
  }
  throw new Error(`Failed to fetch ${url}`);
}

export const bookHtmlUrl = id => `https://www.gutenberg.org/cache/epub/${id}/pg${id}-images.html`;

export function parseHtml(html) {
  return new JSDOM(html).window.document;
}

/** Collapse whitespace and straighten Gutenberg's typographic oddities. */
export function cleanText(value) {
  return value
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
}

export const normalizeTitle = value => cleanText(value)
  .toLowerCase()
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/[’'`"“”]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .replace(/^(the|a|an) /, '');

export const countWords = text => (text.match(/\S+/g) ?? []).length;

/** Minimal RFC 4180 CSV parser (the Gutenberg catalog has quoted multi-line fields). */
export function parseCsv(source) {
  const rows = []; let row = []; let field = ''; let quoted = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (quoted) {
      if (c === '"') { if (source[i + 1] === '"') { field += '"'; i++; } else quoted = false; }
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/** Straight quotes and plain dashes, so every character in a story can be typed on a normal keyboard. */
export function typeable(text) {
  return cleanText(text)
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/\s*[—―]\s*/g, ' - ')
    .replace(/–/g, '-')
    .replace(/…/g, '...')
    .replace(/×/g, 'x')
    .replace(/½/g, '1/2')
    .replace(/¼/g, '1/4')
    .replace(/¾/g, '3/4')
    .replace(/´/g, "'")
    .replace(/æ/g, 'ae').replace(/Æ/g, 'Ae').replace(/œ/g, 'oe').replace(/Œ/g, 'Oe')
    .replace(/\s*°/g, ' degrees')
    .replace(/­/g, '')
    .replace(/\s*[\[(]\*?\d*[\])]/g, (match) => (/\d|\*/.test(match) ? '' : match)) // footnote markers like [1], (*1) or (*)
    .replace(/ {2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/^- /, '')
    .trim();
}
