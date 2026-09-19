// Lists a Gutenberg book's headings with the words under each, to help choose stories for story-sources.json.
//   node scripts/catalog/list-headings.mjs 1725 [more ids…]
import { bookHtmlUrl, cachedFetch, cleanText, countWords, parseHtml } from './gutenberg.mjs';

for (const id of process.argv.slice(2)) {
  const html = await cachedFetch(bookHtmlUrl(id));
  if (!html) { console.log(`# ${id}: not found`); continue; }
  const doc = parseHtml(html);
  doc.querySelectorAll('.pagenum, .pg-boilerplate, #pg-header, #pg-footer').forEach(node => node.remove());
  const title = cleanText(doc.querySelector('title')?.textContent ?? '');
  const headings = [...doc.body.querySelectorAll('h1, h2, h3, h4, h5')];
  console.log(`# ${id} ${title}`);
  headings.forEach((heading, index) => {
    // Words from this heading to the next heading of the same or a higher level.
    const level = Number(heading.tagName.slice(1));
    const next = headings.slice(index + 1).find(other => Number(other.tagName.slice(1)) <= level);
    let words = 0;
    for (let node = heading.nextElementSibling ?? heading.parentElement?.nextElementSibling; node && node !== next && !node.contains(next ?? null); node = node.nextElementSibling ?? node.parentElement?.nextElementSibling) {
      if (node.matches?.('p')) words += countWords(node.textContent ?? '');
      else words += [...(node.querySelectorAll?.('p') ?? [])].reduce((sum, p) => sum + countWords(p.textContent ?? ''), 0);
      if (words > 60000) break;
    }
    console.log(`  h${level} ${String(words).padStart(6)}  ${cleanText(heading.textContent).slice(0, 80)}`);
  });
}
