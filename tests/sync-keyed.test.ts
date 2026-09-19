import { describe, expect, it } from 'vitest';
import { keyedPuts, tombstoneCovers } from '@/lib/sync/merge';
import { KEYED_ENTITIES, MANUSCRIPT_BATCH, PUSH_BATCH, SYNC_ENTITIES, pushInput } from '@/lib/sync/protocol';

const row = (key: string, updatedAt: number, state: Record<string, unknown> = {}) => ({ key, updatedAt, state });

describe('keyed records (highlights, favourites, manuscripts)', () => {
  it('writes a pulled record when there is no local copy, or the server copy wins', () => {
    const puts = keyedPuts<Record<string, unknown>>(
      [row('a', 5, { color: 'yellow' }), row('b', 5), row('c', 9, { title: 'Newer' })],
      [undefined, { updatedAt: 7, dirty: 1 }, { updatedAt: 3, dirty: 0 }],
      'id',
      100
    );
    expect(puts).toEqual([
      { color: 'yellow', id: 'a', updatedAt: 5, dirty: 0, syncedAt: 100 },
      { title: 'Newer', id: 'c', updatedAt: 9, dirty: 0, syncedAt: 100 }
    ]);
  });

  it('keeps newer unsynced local edits (last writer wins)', () => {
    expect(keyedPuts([row('a', 10)], [{ updatedAt: 10, dirty: 1 }], 'id', 1)).toEqual([]);
    expect(keyedPuts([row('a', 11)], [{ updatedAt: 10, dirty: 1 }], 'id', 1)).toHaveLength(1);
  });

  it('files the record under its own key field and never lets the state override it', () => {
    const [put] = keyedPuts<Record<string, unknown>>([row('quote:q1', 2, { key: 'wrong', kind: 'quote' })], [undefined], 'key', 1);
    expect(put.key).toBe('quote:q1');
  });

  it('deletes only records that were not edited after the deletion', () => {
    expect(tombstoneCovers({ key: 'h1', deletedAt: 10 }, { key: 'h1', updatedAt: 9 })).toBe(true);
    expect(tombstoneCovers({ key: 'h1', deletedAt: 10 }, { key: 'h1', updatedAt: 11 })).toBe(false);
    expect(tombstoneCovers({ key: '*', deletedAt: 10 }, { key: 'anything', updatedAt: 10 })).toBe(true);
  });
});

describe('keyed records on the wire', () => {
  it('pulls every keyed entity and accepts deletions of each', () => {
    for (const entity of KEYED_ENTITIES) {
      expect(SYNC_ENTITIES).toContain(entity);
      expect(pushInput.safeParse({ tombstones: [{ entity, key: 'x', deletedAt: 1 }] }).success).toBe(true);
    }
  });

  it('accepts batches of each keyed entity and fills the empty ones', () => {
    const parsed = pushInput.parse({ highlights: [row('h1', 1, { color: 'yellow' })] });
    expect(parsed.highlights).toHaveLength(1);
    expect(parsed.favorites).toEqual([]);
    expect(parsed.manuscripts).toEqual([]);
  });

  it('keeps manuscript batches small and caps the others at the normal batch size', () => {
    expect(pushInput.safeParse({ manuscripts: Array.from({ length: MANUSCRIPT_BATCH + 1 }, (_, index) => row(`m${index}`, 1)) }).success).toBe(false);
    expect(pushInput.safeParse({ favorites: Array.from({ length: PUSH_BATCH + 1 }, (_, index) => row(`f${index}`, 1)) }).success).toBe(false);
  });

  it('accepts reading sessions of your own writing', () => {
    const session = { clientId: '3f1b2c4d-1a2b-4c3d-8e9f-0a1b2c3d4e5f', workKey: 'ms:1', kind: 'manuscript', title: 'Draft', author: '', mode: 'read', startedAt: 1, durationMs: 1000, words: 10, pages: 1 };
    expect(pushInput.safeParse({ sessions: [session] }).success).toBe(true);
  });
});
