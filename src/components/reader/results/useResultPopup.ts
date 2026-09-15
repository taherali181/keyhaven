'use client';

import { useCallback, useEffect, useState } from 'react';
import { db } from '@/lib/db';
import { loadResults, summariseAttempt, type AttemptSummary } from '@/lib/result-history';
import type { TestResultRecord, TypingMode, TypingStats } from '@/types';

/** A group of earlier results the dialog can compare against. The first scope is the toast's. */
export interface HistoryScope { id: string; label: string; match: (record: TestResultRecord) => boolean }

export interface ReaderResult {
  record: TestResultRecord;
  stats: TypingStats;
  /** "Part 3 done", "Quote done". */
  heading: string;
  /** "Story · Part 3", "Quote · Stoicism". */
  eyebrow: string;
  title: string;
  nextLabel: string;
  modes: TypingMode[];
  scopes: HistoryScope[];
  summary: AttemptSummary;
}

export type ResultView = 'toast' | 'chip' | 'hidden';

/** Saves a finished part, then works out how it compares with earlier attempts in the first scope. */
export async function saveResult(input: Omit<ReaderResult, 'summary'>): Promise<ReaderResult> {
  const id = await db.testResults.add(input.record);
  const record = { ...input.record, id };
  const records = await loadResults(input.modes).catch(() => []);
  const scoped = records.filter(input.scopes[0]?.match ?? (() => true));
  return { ...input, record, summary: summariseAttempt(record, scoped.some(item => item.clientId === record.clientId) ? scoped : [...scoped, record]) };
}

export const focusTyping = () => document.querySelector<HTMLInputElement>('.reader-stage .typing-input')?.focus({ preventScroll: true });

/**
 * The result that rises from the bottom bar: shown when a part is finished, tucked into a chip once typing starts
 * again (or it's dismissed or left alone), and reopened from that chip.
 */
export function useResultPopup(typedLength: number, isFinished: boolean) {
  const [state, setState] = useState<{ result: ReaderResult | null; view: ResultView }>({ result: null, view: 'hidden' });
  const [detailsOpen, setDetailsOpen] = useState(false);

  const show = useCallback((result: ReaderResult) => setState({ result, view: 'toast' }), []);
  const collapse = useCallback(() => setState(current => (current.result ? { ...current, view: 'chip' } : current)), []);
  const reopen = useCallback(() => setState(current => (current.result ? { ...current, view: 'toast' } : current)), []);
  const openDetails = useCallback(() => setDetailsOpen(true), []);
  const closeDetails = useCallback(() => { setDetailsOpen(false); requestAnimationFrame(focusTyping); }, []);

  // Typing the next part (or the same part again) tucks the result away.
  const typing = typedLength > 0 && !isFinished;
  useEffect(() => {
    if (typing && state.view === 'toast') queueMicrotask(collapse);
  }, [typing, state.view, collapse]);

  return { result: state.result, view: state.view, detailsOpen, show, collapse, reopen, openDetails, closeDetails };
}

export type ResultPopupState = ReturnType<typeof useResultPopup>;
