// Measures a stretch of reading for the Profile's reading stats. Time only accrues between interactions
// (a page turn or a keystroke) that are close together, so a reader left open on the desk isn't counted.

/** A pause longer than this means the reader stepped away. */
export const IDLE_MS = 120_000;
/** Shorter visits aren't worth recording. */
export const MIN_SESSION_MS = 15_000;
/** On leaving, credit a little time for the page that was being read, never more than this. */
const TAIL_CREDIT_MS = 30_000;
/** A bigger jump in position is navigation (contents, a new chapter), not reading. */
const JUMP_WORDS = 1_500;

export interface TrackedSession { startedAt: number; durationMs: number; words: number; pages: number }

interface OpenSession { startedAt: number; activeMs: number; lastActivity: number; lastWords: number; lastPage: number; words: number; pages: number }

export class ReadingSessionTracker {
  private current: OpenSession | null = null;

  touch(now: number, positionWords: number, page: number) {
    const session = this.current;
    if (!session) {
      this.current = { startedAt: now, activeMs: 0, lastActivity: now, lastWords: positionWords, lastPage: page, words: 0, pages: 0 };
      return;
    }
    const gap = now - session.lastActivity;
    if (gap > 0 && gap <= IDLE_MS) session.activeMs += gap;
    session.lastActivity = now;
    const moved = positionWords - session.lastWords;
    if (moved > 0 && moved <= JUMP_WORDS) session.words += moved;
    session.lastWords = positionWords;
    if (page !== session.lastPage) { session.pages += 1; session.lastPage = page; }
  }

  /** Ends the session. `idle`: the reader stopped interacting, so the time since the last interaction isn't credited. */
  flush(now: number, { idle = false } = {}): TrackedSession | null {
    const session = this.current;
    this.current = null;
    if (!session || session.activeMs <= 0) return null;
    const tail = idle ? 0 : Math.min(Math.max(0, now - session.lastActivity), TAIL_CREDIT_MS);
    const durationMs = session.activeMs + tail;
    if (durationMs < MIN_SESSION_MS) return null;
    return { startedAt: session.startedAt, durationMs: Math.round(durationMs), words: Math.round(session.words), pages: session.pages };
  }
}
