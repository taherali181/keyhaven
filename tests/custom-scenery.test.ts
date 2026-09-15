import { afterEach, describe, expect, it, vi } from 'vitest';
import { prepareCustomScenery } from '@/lib/custom-scenery';
import { readerStyle } from '@/lib/reader-style';
import { DEFAULT_SETTINGS } from '@/lib/db';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('custom scenery', () => {
  it('rejects unsupported uploads before decoding', async () => {
    await expect(prepareCustomScenery(new File(['text'], 'image.svg', { type: 'image/svg+xml' }))).rejects.toThrow('JPG, PNG, or WebP');
  });

  it('resizes large images, compresses them, and releases the bitmap', async () => {
    const close = vi.fn();
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 4000, height: 2000, close }));
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ fillRect: vi.fn(), drawImage } as unknown as CanvasRenderingContext2D);
    const encode = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValueOnce('x'.repeat(500_001)).mockReturnValue('data:image/jpeg;base64,test');
    await expect(prepareCustomScenery(new File(['image'], 'image.png', { type: 'image/png' }))).resolves.toBe('data:image/jpeg;base64,test');
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1920, 960);
    expect(encode).toHaveBeenLastCalledWith('image/jpeg', 0.65);
    expect(close).toHaveBeenCalledOnce();
  });

  it('renders a saved custom image and falls back safely when absent', () => {
    const settings = { ...DEFAULT_SETTINGS, readerBackground: 'custom' as const, customScenery: 'data:image/jpeg;base64,test' };
    expect(readerStyle(settings)).toHaveProperty('--reader-image', 'url("data:image/jpeg;base64,test")');
    expect(readerStyle({ ...settings, customScenery: undefined })).toHaveProperty('--reader-image', 'none');
  });
});
