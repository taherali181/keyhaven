import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, normalizeSettings } from '@/lib/db';

describe('live stats settings', () => {
  it('puts live stats under the header by default, with time and progress on', () => {
    expect(DEFAULT_SETTINGS.liveStatsPosition).toBe('top');
    expect(normalizeSettings({}).liveStatsPosition).toBe('top');
    expect(normalizeSettings({}).showLiveTime).toBe(true);
    expect(normalizeSettings({}).showLiveProgress).toBe(true);
  });

  it('keeps the corner choice and coerces anything else to the top bar', () => {
    expect(normalizeSettings({ liveStatsPosition: 'corner' }).liveStatsPosition).toBe('corner');
    expect(normalizeSettings({ liveStatsPosition: 'sideways' }).liveStatsPosition).toBe('top');
    expect(normalizeSettings({ liveStatsPosition: 42 }).liveStatsPosition).toBe('top');
  });

  it('keeps saved toggles and ignores values that are not booleans', () => {
    expect(normalizeSettings({ showLiveTime: false, showLiveProgress: false })).toMatchObject({ showLiveTime: false, showLiveProgress: false });
    expect(normalizeSettings({ showLiveTime: 'no' }).showLiveTime).toBe(true);
  });
});
