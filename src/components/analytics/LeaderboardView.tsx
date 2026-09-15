'use client';

import { useEffect, useState } from 'react';
import { Crown, Medal, Trophy } from 'lucide-react';
import { ArcadeScoreRecord, TestResultRecord } from '@/types';
import { db } from '@/lib/db';
import { syncEnabled } from '@/lib/sync-config';
import { ARCADE_GAMES } from '@/lib/profile-stats';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Segmented } from '@/components/ui/Segmented';

type Board = 'speed-test' | 'alphabet-sprint' | 'word-rain' | 'ghost-racer';
type Period = 'day' | 'week' | 'all';
interface PublicEntry { handle: string; score: number; accuracy: number; occurredAt: string; }
interface Entry { key: string; rank: number; name: string; score: string; detail: string }

const BOARDS: Array<{ value: Board; label: string }> = [
  { value: 'speed-test', label: 'Speed' }, { value: 'alphabet-sprint', label: 'Alphabet' }, { value: 'word-rain', label: 'Word Rain' }, { value: 'ghost-racer', label: 'Ghost Racer' }
];
const PERIODS: Array<{ value: Period; label: string }> = [{ value: 'day', label: 'Today' }, { value: 'week', label: 'This week' }, { value: 'all', label: 'All time' }];

export const LeaderboardView = ({ speedOnly = false, embedded = false }: { speedOnly?: boolean; embedded?: boolean }) => {
  const [board, setBoard] = useState<Board>('speed-test');
  const [period, setPeriod] = useState<Period>('all');
  const [personal, setPersonal] = useState<Array<TestResultRecord | ArcadeScoreRecord>>([]);
  const [publicEntries, setPublicEntries] = useState<PublicEntry[]>([]);
  const [syncConfigured, setSyncConfigured] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      let ranked: Array<TestResultRecord | ArcadeScoreRecord>;
      if (board === 'speed-test') {
        ranked = (await db.testResults.where('mode').equals('speed-test').toArray()).sort((left, right) => right.wpm - left.wpm);
      } else {
        ranked = (await db.arcadeScores.where('game').equals(board).toArray()).sort((left, right) => board === 'alphabet-sprint' ? left.timeMs - right.timeMs : right.score - left.score);
      }
      if (!cancelled) setPersonal(ranked.slice(0, 15));
      if (syncEnabled()) {
        const response = await fetch(`/api/leaderboards?mode=${board}&period=${period}`);
        if (response.ok) {
          const payload = await response.json() as { entries: PublicEntry[]; syncConfigured: boolean };
          if (!cancelled) { setPublicEntries(payload.entries); setSyncConfigured(payload.syncConfigured); }
        }
      }
    };
    void load().catch(() => {});
    return () => { cancelled = true; };
  }, [board, period]);

  const publicRows: Entry[] = publicEntries.map((entry, index) => ({ key: `${entry.handle}-${index}`, rank: index + 1, name: entry.handle, score: `${entry.score}${board === 'speed-test' ? ' wpm' : ' pts'}`, detail: `${entry.accuracy}% accuracy` }));
  const personalRows: Entry[] = personal.map((entry, index) => {
    const arcade = 'game' in entry;
    const score = board === 'alphabet-sprint' && arcade ? `${(entry.timeMs / 1000).toFixed(2)}s` : arcade ? `${entry.score} pts` : `${entry.wpm} wpm`;
    const name = arcade ? ARCADE_GAMES.find(game => game.id === entry.game)?.label ?? entry.game : entry.title ?? entry.subMode;
    const date = new Date(entry.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return { key: entry.clientId, rank: index + 1, name, score, detail: `${entry.accuracy}% · ${date}` };
  });

  const content = <div className="lb">
    <div className="lb-controls">
      {!speedOnly && <Segmented label="Board" value={board} options={BOARDS} onChange={setBoard} layoutId="leaderboard-board" />}
      <Segmented label="Period" value={period} options={PERIODS} onChange={setPeriod} layoutId={speedOnly ? 'leaderboard-period-speed' : 'leaderboard-period'} />
    </div>
    <div className="lb-grid">
      <BoardPanel title="Public standings" icon={<Crown aria-hidden="true" />} entries={publicRows} empty={syncConfigured ? 'No verified scores for this board yet.' : 'Verified public standings appear once Backup & sync is set up and you are signed in.'} />
      <BoardPanel title="Your records" icon={<Medal aria-hidden="true" />} entries={personalRows} empty="Complete this activity to set your first record." />
    </div>
  </div>;

  if (embedded) return content;
  return <section className="speed-shell">
    <SectionHeader eyebrow="The record room" title="Leaderboards" description="Verified public standings when Backup & sync is on, and honest personal records everywhere." />
    {content}
  </section>;
};

function BoardPanel({ title, icon, entries, empty }: { title: string; icon: React.ReactNode; entries: Entry[]; empty: string }) {
  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);
  return <section className="lb-panel" aria-label={title}>
    <header className="lb-panel-head">{icon}<h2>{title}</h2></header>
    {entries.length
      ? <>
        <ol className="lb-podium">
          {podium.map(entry => <li key={entry.key} data-rank={entry.rank}>
            <span className="lb-rank" aria-label={`Rank ${entry.rank}`}>{entry.rank}</span>
            <span className="lb-name">{entry.name}</span>
            <strong>{entry.score}</strong>
            <small>{entry.detail}</small>
          </li>)}
        </ol>
        {rest.length > 0 && <ol className="lb-list" start={4}>
          {rest.map(entry => <li key={entry.key}>
            <span className="lb-rank" aria-label={`Rank ${entry.rank}`}>{entry.rank}</span>
            <span className="lb-name">{entry.name}</span>
            <span className="lb-score"><strong>{entry.score}</strong><small>{entry.detail}</small></span>
          </li>)}
        </ol>}
      </>
      : <div className="lb-empty"><Trophy aria-hidden="true" /><p>{empty}</p></div>}
  </section>;
}
