import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import { TypingStats } from '@/types';

function Harness({ timed = false, strict = false, onComplete }: { timed?: boolean; strict?: boolean; onComplete: (stats: TypingStats) => void }) {
  const engine = useTypingEngine({ targetText: timed ? 'a '.repeat(500) : 'ab', isTimed: timed, timeLimit: 15, strictMode: strict, onComplete });
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
  });

  it('does not advance on an error in strict mode', async () => {
    render(<Harness strict onComplete={vi.fn()} />);
    await act(async () => {});
    fireEvent.keyDown(screen.getByLabelText('keys'), { key: 'x' });
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
