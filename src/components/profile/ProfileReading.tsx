'use client';

import React from 'react';
import { BookOpen } from 'lucide-react';
import type { BookProgressRecord, ReadingSessionRecord, TypingMode } from '@/types';
import { compactNumber, formatMinutes, plural, workKind, type ReadingSummary } from '@/lib/profile-stats';
import { Card, Empty, Meter, Stat } from './ProfileBits';

const KIND_LABELS = { story: 'Short story', book: 'Book', import: 'Imported' } as const;
const byline = (record: BookProgressRecord) => record.author?.trim() || KIND_LABELS[workKind(record)];

export function ReadingSection({ summary, sessions, onOpenWork, onNavigate }: { summary: ReadingSummary; sessions: ReadingSessionRecord[]; onOpenWork: (key: string) => void; onNavigate: (mode: TypingMode) => void }) {
  const started = summary.worksStarted.stories + summary.worksStarted.books + summary.worksStarted.imports;
  if (!started && !sessions.length) {
    return <Card id="profile-reading" eyebrow="Reading" title="Your reading">
      <Empty icon={<BookOpen aria-hidden="true" />} title="Nothing read yet" action={<button type="button" className="rs-btn is-primary" onClick={() => onNavigate('stories')}><BookOpen aria-hidden="true" />Start reading</button>}>
        Open a story or a book in Read. Time spent reading, words covered and books finished are recorded here.
      </Empty>
    </Card>;
  }

  const weekChange = summary.thisWeekMinutes - summary.lastWeekMinutes;
  const readSessions = sessions.filter(session => session.mode === 'read').length;

  return <>
    <Card id="profile-reading" eyebrow="Reading" title="Your reading">
      <div className="profile-stats">
        <Stat label="Time reading" value={formatMinutes(summary.minutes)} sub={`${readSessions} ${readSessions === 1 ? 'session' : 'sessions'}`} accent />
        <Stat label="Words read" value={compactNumber(summary.words)} sub="reading and typing" />
        <Stat label="Reading speed" value={summary.averageWpm ?? '—'} sub="words per minute" />
        <Stat label="This week" value={formatMinutes(summary.thisWeekMinutes)} sub={`${weekChange >= 0 ? '+' : '−'}${formatMinutes(Math.abs(weekChange))} vs last week`} />
        <Stat label="Finished" value={summary.storiesFinished + summary.booksFinished} sub={`${plural(summary.storiesFinished, 'story', 'stories')} · ${plural(summary.booksFinished, 'book')}`} />
        <Stat label="Want to read" value={summary.wantToRead} sub="on your shelf" />
      </div>
    </Card>

    <div className="profile-pair">
      <Card id="profile-current" eyebrow="In progress" title="Currently reading">
        {summary.currentlyReading.length
          ? <ul className="profile-list">
            {summary.currentlyReading.map(record => <li key={record.bookId}>
              <div className="profile-list-main">
                <strong>{record.title ?? 'Untitled'}</strong>
                <small>{byline(record)}</small>
                <span className="profile-progress-row"><Meter value={record.percent / 100} /><output>{record.percent}%</output></span>
              </div>
              <button type="button" className="rs-btn is-small" aria-label={`Continue ${record.title ?? 'reading'}`} onClick={() => onOpenWork(record.bookId)}>Continue</button>
            </li>)}
          </ul>
          : <p className="profile-note">Nothing in progress right now.</p>}
      </Card>

      <Card id="profile-finished" eyebrow="Shelf" title="Finished and favourites">
        {summary.recentlyFinished.length
          ? <ul className="profile-list">
            {summary.recentlyFinished.map(record => <li key={record.bookId}>
              <div className="profile-list-main"><strong>{record.title ?? 'Untitled'}</strong><small>{byline(record)}</small></div>
              <div className="profile-list-side">{record.finishedAt ? new Date(record.finishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}</div>
            </li>)}
          </ul>
          : <p className="profile-note">Finish a story or a book and it appears here.</p>}
        {summary.topAuthors.length > 0 && <div className="profile-subsection">
          <h3>Authors you return to</h3>
          <div className="profile-keys">{summary.topAuthors.map(item => <span key={item.author} className="profile-author">{item.author}<small>{item.works} {item.works === 1 ? 'work' : 'works'}</small></span>)}</div>
        </div>}
        <p className="profile-note">Opened {plural(summary.worksStarted.stories, 'story', 'stories')} · {plural(summary.worksStarted.books, 'book')} · {plural(summary.worksStarted.imports, 'import')}</p>
      </Card>
    </div>
  </>;
}
