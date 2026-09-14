import type { NextRequest } from 'next/server';

// Project Gutenberg sends no CORS headers, so the reader fetches book text through this route.
// Only numeric ebook ids are accepted and only gutenberg.org is ever contacted.
const MAX_BYTES = 12 * 1024 * 1024;
const TIMEOUT_MS = 20_000;
const WEEK = 60 * 60 * 24 * 7;

const sources = (id: string) => [
  { url: `https://www.gutenberg.org/cache/epub/${id}/pg${id}-images.html`, format: 'html' },
  { url: `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`, format: 'txt' }
] as const;

export async function GET(_request: NextRequest, ctx: RouteContext<'/api/gutenberg/[id]'>) {
  const { id } = await ctx.params;
  if (!/^\d{1,6}$/.test(id)) return Response.json({ error: 'Invalid book id' }, { status: 400 });

  for (const source of sources(id)) {
    try {
      const response = await fetch(source.url, {
        headers: { 'User-Agent': 'KeyHaven reader (https://keyhaven.app)' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        next: { revalidate: WEEK }
      });
      if (response.status === 404) continue;
      if (!response.ok) return Response.json({ error: `Project Gutenberg returned ${response.status}` }, { status: 502 });
      const length = Number(response.headers.get('content-length') ?? 0);
      if (length > MAX_BYTES) return Response.json({ error: 'This book is too large to open' }, { status: 413 });
      const body = await response.text();
      if (body.length > MAX_BYTES) return Response.json({ error: 'This book is too large to open' }, { status: 413 });
      return new Response(body, {
        headers: {
          'Content-Type': source.format === 'html' ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8',
          'X-Book-Format': source.format,
          'Cache-Control': `public, max-age=86400, s-maxage=${WEEK}`
        }
      });
    } catch (error) {
      if ((error as Error).name === 'TimeoutError') return Response.json({ error: 'Project Gutenberg took too long to respond' }, { status: 504 });
      return Response.json({ error: 'Could not reach Project Gutenberg' }, { status: 502 });
    }
  }
  return Response.json({ error: 'Book not found' }, { status: 404 });
}
