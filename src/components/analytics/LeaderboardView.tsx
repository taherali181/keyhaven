'use client';

import { useEffect, useState } from 'react';
import { Crown, Medal } from 'lucide-react';
import { ArcadeScoreRecord, TestResultRecord } from '@/types';
import { db } from '@/lib/db';

type Board = 'speed-test' | 'alphabet-sprint' | 'word-rain' | 'ghost-racer';
interface PublicEntry { handle: string; score: number; accuracy: number; occurredAt: string; }

export const LeaderboardView = () => {
  const [board, setBoard] = useState<Board>('speed-test');
  const [period, setPeriod] = useState<'day' | 'week' | 'all'>('all');
  const [personal, setPersonal] = useState<Array<TestResultRecord | ArcadeScoreRecord>>([]);
  const [publicEntries, setPublicEntries] = useState<PublicEntry[]>([]);
  const [cloudConfigured, setCloudConfigured] = useState(false);

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
      if (process.env.NEXT_PUBLIC_KEYHAVEN_CLOUD === 'true') {
        const response = await fetch(`/api/leaderboards?mode=${board}&period=${period}`);
        if (response.ok) {
          const payload = await response.json() as { entries: PublicEntry[]; cloudConfigured: boolean };
          if (!cancelled) { setPublicEntries(payload.entries); setCloudConfigured(payload.cloudConfigured); }
        }
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [board, period]);

  const tabs: Array<{ id: Board; label: string }> = [
    { id: 'speed-test', label: 'Speed' }, { id: 'alphabet-sprint', label: 'Alphabet' }, { id: 'word-rain', label: 'Word Rain' }, { id: 'ghost-racer', label: 'Ghost Racer' }
  ];
  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <header className="mb-8 border-b border-[var(--color-border)] pb-7"><p className="eyebrow">The record room</p><h1 className="mt-2 font-serif text-4xl font-medium">Leaderboards</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">Verified public standings when connected; honest personal records everywhere.</p></header>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row">
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--bg-secondary)] p-1.5">{tabs.map(tab => <button key={tab.id} onClick={() => setBoard(tab.id)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${board === tab.id ? 'bg-[var(--color-highlight)] text-[var(--color-accent)]' : 'text-[var(--text-secondary)]'}`}>{tab.label}</button>)}</div>
        <div className="flex gap-1">{(['day', 'week', 'all'] as const).map(value => <button key={value} onClick={() => setPeriod(value)} className={`px-3 py-2 text-[10px] uppercase tracking-widest ${period === value ? 'text-[var(--color-accent)]' : 'text-[var(--text-muted)]'}`}>{value}</button>)}</div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <BoardPanel title="Public standings" icon={<Crown />} empty={cloudConfigured ? 'No verified scores for this board yet.' : 'Connect KeyHaven Cloud to enable verified public standings.'}>
          {publicEntries.map((entry, index) => <Row key={`${entry.handle}-${index}`} rank={index + 1} name={entry.handle} score={`${entry.score}${board === 'speed-test' ? ' wpm' : ' pts'}`} detail={`${entry.accuracy}% accuracy`} />)}
        </BoardPanel>
        <BoardPanel title="Your records" icon={<Medal />} empty="Complete this activity to set your first record.">
          {personal.map((entry, index) => {
            const arcade = 'game' in entry;
            const score = board === 'alphabet-sprint' && arcade ? `${(entry.timeMs / 1000).toFixed(2)}s` : arcade ? `${entry.score} pts` : `${entry.wpm} wpm`;
            return <Row key={entry.clientId} rank={index + 1} name={arcade ? entry.game.replaceAll('-', ' ') : entry.title ?? entry.subMode} score={score} detail={`${entry.accuracy}% accuracy`} />;
          })}
        </BoardPanel>
      </div>
    </section>
  );
};

function BoardPanel({ title, icon, empty, children }: { title: string; icon: React.ReactNode; empty: string; children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return <section className="editorial-panel overflow-hidden"><header className="flex items-center gap-2 border-b border-[var(--color-border)] px-5 py-4 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-[var(--color-accent)]">{icon}{title}</header>{hasChildren ? <div className="divide-y divide-[var(--color-border)]">{children}</div> : <div className="grid min-h-52 place-items-center p-8 text-center text-xs leading-5 text-[var(--text-muted)]">{empty}</div>}</section>;
}

function Row({ rank, name, score, detail }: { rank: number; name: string; score: string; detail: string }) {
  return <div className="flex items-center justify-between px-5 py-4 text-xs"><div className="flex min-w-0 items-center gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[var(--color-border)] font-mono text-[10px] text-[var(--color-accent)]">{rank}</span><span className="truncate capitalize text-[var(--text-primary)]">{name}</span></div><div className="ml-3 text-right"><strong className="block font-mono text-[var(--color-accent)]">{score}</strong><span className="text-[10px] text-[var(--text-muted)]">{detail}</span></div></div>;
}
