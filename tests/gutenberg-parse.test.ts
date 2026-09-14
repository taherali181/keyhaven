import { describe, expect, it } from 'vitest';
import { displayTitle, normalizeProse, parseGutenbergHtml, parseGutenbergText } from '@/lib/gutenberg-parse';

const words = (count: number, seed: string) => Array.from({ length: count }, (_, index) => `${seed}${index % 7}`).join(' ');

describe('Gutenberg parsing', () => {
  it('splits the HTML edition into chapters and drops boilerplate and contents', () => {
    const html = `<html><body>
      <section class="pg-boilerplate" id="pg-header"><h2>The Project Gutenberg eBook of A Test</h2><p>${words(80, 'license')}</p></section>
      <h1>A TEST BOOK</h1>
      <h2>CONTENTS</h2><p class="toc">Chapter I</p>
      <h2>CHAPTER I. THE HARBOUR</h2>
      <p>“It was early,” she said — quietly.<span class="pagenum">[Pg 1]</span></p>
      <p>${words(400, 'sea')}</p>
      <h2>CHAPTER II.</h2><h3>Another Morning</h3>
      <p>${words(600, 'land')}</p>
      <section class="pg-boilerplate" id="pg-footer"><p>${words(90, 'footer')}</p></section>
    </body></html>`;
    const sections = parseGutenbergHtml(html);
    expect(sections.map(section => section.title), JSON.stringify(sections.map(section => [section.title, section.paragraphs.length]))).toEqual(['Chapter I. The Harbour', 'Chapter II.']);
    expect(sections[0].paragraphs[0]).toBe('"It was early," she said - quietly.');
    expect(sections[1].paragraphs).toContain('Another Morning');
    expect(sections.flatMap(section => section.paragraphs).join(' ')).not.toMatch(/license|footer|Pg 1/);
  });

  it('keeps line breaks inside verse', () => {
    const html = `<body><h2>ONE</h2><p>First line<br>Second line</p><p>${words(300, 'a')}</p><h2>TWO</h2><p>${words(300, 'b')}</p></body>`;
    expect(parseGutenbergHtml(html)[0].paragraphs[0]).toBe('First line\nSecond line');
  });

  it('falls back to plain text between the Gutenberg markers', () => {
    const text = [
      'The Project Gutenberg eBook of Plain', '', '*** START OF THE PROJECT GUTENBERG EBOOK PLAIN ***', '',
      'CHAPTER I', '', words(40, 'wrapped-prose-').replace(/(\S+ ){8}/g, '$&\n'), '', words(300, 'two'), '',
      'CHAPTER II', '', words(350, 'three'), '',
      '*** END OF THE PROJECT GUTENBERG EBOOK PLAIN ***', 'license text'
    ].join('\n');
    const sections = parseGutenbergText(text);
    expect(sections.map(section => section.title)).toEqual(['Chapter I', 'Chapter II']);
    expect(sections[0].paragraphs[0]).not.toContain('\n');
    expect(sections.flatMap(section => section.paragraphs).join(' ')).not.toContain('license');
  });

  it('splits headingless books into even parts', () => {
    const html = `<body>${Array.from({ length: 30 }, (_, index) => `<p>${words(250, `w${index}`)}</p>`).join('')}</body>`;
    const sections = parseGutenbergHtml(html);
    expect(sections.length).toBeGreaterThan(1);
    expect(sections[0].title).toBe('Part 1');
  });

  it('normalizes typography and titles', () => {
    expect(normalizeProse('Don’t—stop… now')).toBe("Don't - stop... now");
    expect(displayTitle('THE FALL OF THE HOUSE OF USHER')).toBe('The Fall of the House of Usher');
    expect(displayTitle('CHAPTER XIV. A VIVID DREAM')).toBe('Chapter XIV. A Vivid Dream');
  });
});
