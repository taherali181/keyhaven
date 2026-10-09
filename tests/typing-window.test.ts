import { describe, expect, it } from 'vitest';
import { lineStarts, windowShift } from '@/components/typing/TypingArea';

describe('typing window', () => {
  it('keeps the active line in the middle of a centred window, with the typed line above it', () => {
    // The window leads with one empty line, so the first line starts in the middle with the second below it.
    expect(windowShift(0, 3, 'centered')).toBe(0);
    // After each line the text moves up by exactly one line: the finished line above, the next one below.
    expect(windowShift(1, 3, 'centered')).toBe(1);
    expect(windowShift(4, 3, 'centered')).toBe(4);
  });

  it('turns a whole window at a time in pages mode', () => {
    expect(windowShift(4, 3, 'pages', 1)).toBe(3);
    expect(windowShift(4, 3, 'pages', 0)).toBe(0);
  });

  it('finds where each line starts from the characters’ top offsets', () => {
    expect(lineStarts([0, 0, 0, 40, 40, 80])).toEqual([0, 3, 5]);
    expect(lineStarts([undefined, 0, 0, 40])).toEqual([1, 3]);
    expect(lineStarts([])).toEqual([0]);
  });
});
