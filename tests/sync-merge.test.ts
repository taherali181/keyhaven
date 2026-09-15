import { describe, expect, it } from 'vitest';
import { chunk, finite, isUuid, jsonBytes, latestByKey, remoteWins, tombstoneCovers } from '@/lib/sync/merge';
import { PUSH_BATCH, pushInput } from '@/lib/sync/protocol';

describe('backup merge rules', () => {
  it('batches rows without losing any', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 3)).toEqual([]);
  });

  it('lets the newest edit win and never overwrites newer unsynced local changes', () => {
    expect(remoteWins(undefined, 5)).toBe(true);
    expect(remoteWins({ updatedAt: 10, dirty: 1 }, 9)).toBe(false);
    expect(remoteWins({ updatedAt: 10, dirty: 1 }, 10)).toBe(false);
    expect(remoteWins({ updatedAt: 10, dirty: 1 }, 11)).toBe(true);
    expect(remoteWins({ updatedAt: 10, dirty: 0 }, 9)).toBe(true);
    expect(remoteWins({ updatedAt: 10, dirty: 0 }, 10)).toBe(false);
  });

  it('applies deletions only to records last changed before them', () => {
    expect(tombstoneCovers({ key: 'pg:1', deletedAt: 100 }, { key: 'pg:1', updatedAt: 90 })).toBe(true);
    expect(tombstoneCovers({ key: 'pg:1', deletedAt: 100 }, { key: 'pg:1', updatedAt: 120 })).toBe(false);
    expect(tombstoneCovers({ key: 'pg:1', deletedAt: 100 }, { key: 'pg:2', updatedAt: 90 })).toBe(false);
    expect(tombstoneCovers({ key: '*', deletedAt: 100 }, { key: 'anything', updatedAt: 100 })).toBe(true);
  });

  it('keeps one newest row per key', () => {
    const rows = [{ k: 'a', t: 1 }, { k: 'b', t: 5 }, { k: 'a', t: 3 }];
    expect(latestByKey(rows, row => row.k, row => row.t)).toEqual([{ k: 'a', t: 3 }, { k: 'b', t: 5 }]);
  });

  it('recognises client ids and cleans up numbers from old records', () => {
    expect(isUuid('3f1b2c4d-1a2b-4c3d-8e9f-0a1b2c3d4e5f')).toBe(true);
    expect(isUuid('1712345-abc')).toBe(false);
    expect(finite(Number.NaN, 7)).toBe(7);
    expect(finite(4)).toBe(4);
    expect(jsonBytes({ a: 'é' })).toBe(10);
  });
});

describe('backup protocol', () => {
  const result = { clientId: '3f1b2c4d-1a2b-4c3d-8e9f-0a1b2c3d4e5f', mode: 'speed-test', subMode: '30s', wpm: 60, rawWpm: 64, accuracy: 97, consistency: 80, duration: 30, timestamp: 1 };

  it('fills empty collections and accepts a normal batch', () => {
    const parsed = pushInput.parse({ results: [result] });
    expect(parsed.results[0].errorKeys).toEqual({});
    expect(parsed.progress).toEqual([]);
    expect(parsed.tombstones).toEqual([]);
  });

  it('rejects oversized batches, bad ids, non-finite numbers and unknown deletion kinds', () => {
    expect(pushInput.safeParse({ results: Array.from({ length: PUSH_BATCH + 1 }, () => result) }).success).toBe(false);
    expect(pushInput.safeParse({ results: [{ ...result, clientId: 'nope' }] }).success).toBe(false);
    expect(pushInput.safeParse({ results: [{ ...result, wpm: Number.POSITIVE_INFINITY }] }).success).toBe(false);
    expect(pushInput.safeParse({ tombstones: [{ entity: 'settings', key: 'x', deletedAt: 1 }] }).success).toBe(false);
  });
});
