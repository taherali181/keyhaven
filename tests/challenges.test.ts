import { describe, expect, it } from 'vitest';
import { challengeText } from '@/server/challenges';

describe('server challenges', () => {
  it('generates deterministic targets from a seed', () => {
    expect(challengeText('keyhaven', 12)).toBe(challengeText('keyhaven', 12));
    expect(challengeText('keyhaven', 12)).not.toBe(challengeText('other', 12));
    expect(challengeText('keyhaven', 12).split(' ')).toHaveLength(12);
  });
});
