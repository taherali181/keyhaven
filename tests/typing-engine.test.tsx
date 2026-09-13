import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import { TypingStats } from '@/types';

function Harness({ timed = false, strict = false, text, onComplete }: { timed?: boolean; strict?: boolean; text?: string; onComplete: (stats: TypingStats) => void }) {
  const engine = useTypingEngine({ targetText: text ?? (timed ? 'a '.repeat(500) : 'ab'), isTimed: timed, timeLimit: 15, strictMode: strict, onComplete });
  return <><input aria-label="keys" onKeyDown={engine.handleKeyDown} /><output data-testid="typed">{engine.typed}</output><output data-testid="remaining">{engine.timeRemaining}</output></>;
}

describe('typing session engine', () => {
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('includes the final key and completes only once', async () => {
    const complete = vi.fn();
    render(<Harness onComplete={complete} />);
    await act(async () => {});
    const input = screen.getByLabelText('keys');
    fireEvent.keyDown(input, { key: 'a' });
    fireEvent.keyDown(input, { key: 'b' });
    fireEvent.keyDown(input, { key: 'b' });
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete.mock.calls[0][0]).toMatchObject({ totalChars: 2, correctChars: 2, missedChars: 0 });
    expect(complete.mock.calls[0][0].evidence.map((event: { key: string }) => event.key)).toEqual(['a', 'b']);
  });

  it('does not advance on an error in strict mode', async () => {
    render(<Harness strict onComplete={vi.fn()} />);
    await act(async () => {});
    fireEvent.keyDown(screen.getByLabelText('keys'), { key: 'x' });
    expect(screen.getByTestId('typed').textContent).toBe('');
  });

  it('retracts the error when a mistake is backspaced away', async () => {
    const complete = vi.fn();
    render(<Harness onComplete={complete} />);
    await act(async () => {});
    const input = screen.getByLabelText('keys');
    fireEvent.keyDown(input, { key: 'x' });
    fireEvent.keyDown(input, { key: 'Backspace' });
    fireEvent.keyDown(input, { key: 'a' });
    fireEvent.keyDown(input, { key: 'b' });
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete.mock.calls[0][0]).toMatchObject({ totalChars: 2, correctChars: 2, incorrectChars: 0, accuracy: 100 });
    expect(complete.mock.calls[0][0].errorHeatmap).toEqual({});
  });

  it('ignores autorepeat so a held key cannot inflate errors', async () => {
    const complete = vi.fn();
    render(<Harness onComplete={complete} />);
    await act(async () => {});
    const input = screen.getByLabelText('keys');
    fireEvent.keyDown(input, { key: 'a' });
    for (let i = 0; i < 20; i += 1) fireEvent.keyDown(input, { key: 'x', repeat: true });
    expect(screen.getByTestId('typed').textContent).toBe('a');
    fireEvent.keyDown(input, { key: 'b' });
    expect(complete.mock.calls[0][0]).toMatchObject({ totalChars: 2, correctChars: 2 });
  });

  it('deletes a whole word on ctrl+backspace', async () => {
    render(<Harness text="one two three" onComplete={vi.fn()} />);
    await act(async () => {});
    const input = screen.getByLabelText('keys');
    for (const key of 'one two') fireEvent.keyDown(input, { key });
    expect(screen.getByTestId('typed').textContent).toBe('one two');
    fireEvent.keyDown(input, { key: 'Backspace', ctrlKey: true });
    expect(screen.getByTestId('typed').textContent).toBe('one ');
    fireEvent.keyDown(input, { key: 'Backspace', ctrlKey: true });
    expect(screen.getByTestId('typed').textContent).toBe('');
  });

  it('finishes a timed test at its absolute deadline', async () => {
    vi.useFakeTimers();
    const complete = vi.fn();
    render(<Harness timed onComplete={complete} />);
    await act(async () => {});
    fireEvent.keyDown(screen.getByLabelText('keys'), { key: 'a' });
    act(() => vi.advanceTimersByTime(15_100));
    expect(complete).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('remaining').textContent).toBe('0');
  });
});
