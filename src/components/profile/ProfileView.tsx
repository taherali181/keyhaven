'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Award, BookMarked, BookOpen, Download, Flame, Gamepad2, GraduationCap, Keyboard, LogIn, Minus, Pencil, PenLine, Plus, RefreshCw, ShieldCheck, Trash2, Trophy, Type, Upload } from 'lucide-react';
import type { AcademyStateRecord, ArcadeScoreRecord, TypingMode, UserSettings } from '@/types';
import { ALL_LESSONS, findLesson, lessonByLegacyId } from '@/data/academy/units';
import { db } from '@/lib/db';
import { syncEnabled } from '@/lib/sync-config';
import { requestBackupNow, useBackupStatus, type BackupStatus } from '@/lib/sync/status';
import { queueTombstone } from '@/lib/sync/tracking';
import { downloadBlob, exportBackupBlob, importBackupFile } from '@/lib/backup-file';
import {
  academySummary, activityByDay, arcadeBests, calendarWeeks, compactNumber, formatMinutes, memberSince, readerLevel, readingSummary,
  plural, streaks, todayActivity, typingSummary, type DayActivity
} from '@/lib/profile-stats';
import { achievements, type Achievement, type AchievementGroup } from '@/lib/achievements';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SignOutDialog } from '@/components/auth/SignOutDialog';
import { ActivityCalendar } from './ActivityCalendar';
import { Card, Meter, Ring, Stat } from './ProfileBits';
import { ReadingSection } from './ProfileReading';
import { TypingSection } from './ProfileTyping';
import { useProfileData } from './useProfileData';

type UpdateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
type Level = ReturnType<typeof readerLevel>;

interface ProfileViewProps {
  settings: UserSettings;
  onUpdateSetting: UpdateSetting;
  onNavigate: (mode: TypingMode) => void;
  onOpenWork: (key: string) => void;
  onImportSettings: (settings: UserSettings) => void;
}

function relativeTime(elapsedMs: number) {
  const minutes = Math.floor(elapsedMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours} h ago` : `${Math.floor(hours / 24)} d ago`;
}

/** A clock for relative times that doesn't read Date.now() during render. */
function useNow(intervalMs: number, resetKey?: unknown) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, intervalMs);
    return () => { window.clearTimeout(first); window.clearInterval(timer); };
  }, [intervalMs, resetKey]);
  return now;
}

export function ProfileView({ settings, onUpdateSetting, onNavigate, onOpenWork, onImportSettings }: ProfileViewProps) {
  const data = useProfileData();
  const { reload } = data;
  const status = useBackupStatus();
  const now = useNow(60_000);
  // Records pulled in by Backup & sync don't announce themselves, so reload after each pass.
  useEffect(() => { if (status.lastSyncedAt) queueMicrotask(reload); }, [status.lastSyncedAt, reload]);

  const days = useMemo(() => activityByDay(data.results, data.sessions), [data.results, data.sessions]);
  const typing = useMemo(() => typingSummary(data.results), [data.results]);
  const reading = useMemo(() => readingSummary(data.sessions, data.progress, data.shelf, now), [data.sessions, data.progress, data.shelf, now]);
  const streak = useMemo(() => streaks(days.keys(), now), [days, now]);
  const weeks = useMemo(() => calendarWeeks(days, now), [days, now]);
  const since = useMemo(() => memberSince(data.results.map(item => item.timestamp), data.sessions.map(item => item.startedAt), data.scores.map(item => item.timestamp), data.progress.map(item => item.lastRead)), [data.results, data.sessions, data.scores, data.progress]);

  if (!data.loaded || !now) {
    return <div className="profile-shell" aria-busy="true" aria-label="Loading your profile">
      <div className="profile-hero skeleton profile-skeleton-hero" />
      <div className="profile-tiles">{Array.from({ length: 6 }, (_, index) => <div key={index} className="profile-stat skeleton profile-skeleton-tile" />)}</div>
      <div className="profile-card skeleton profile-skeleton-card" />
    </div>;
  }

  const words = typing.wordsTyped + reading.words;
  const level = readerLevel(words);
  const finished = reading.storiesFinished + reading.booksFinished;

  return <div className="profile-shell">
    <ProfileHero status={status} level={level} words={words} since={since} />

    <div className="profile-tiles">
      <Stat icon={<Flame aria-hidden="true" />} label="Day streak" value={streak.current} sub={`Longest ${streak.longest} ${streak.longest === 1 ? 'day' : 'days'}`} accent />
      <Stat icon={<Keyboard aria-hidden="true" />} label="Time typing" value={formatMinutes(typing.minutes)} sub={`${typing.sessions} sessions`} />
      <Stat icon={<BookOpen aria-hidden="true" />} label="Time reading" value={formatMinutes(reading.minutes)} />
      <Stat icon={<Type aria-hidden="true" />} label="Words typed" value={compactNumber(typing.wordsTyped)} />
      <Stat icon={<BookMarked aria-hidden="true" />} label="Words read" value={compactNumber(reading.words)} />
      <Stat icon={<Trophy aria-hidden="true" />} label="Finished" value={finished} sub={`${plural(reading.storiesFinished, 'story', 'stories')} · ${plural(reading.booksFinished, 'book')}`} />
    </div>

    <div className="profile-row">
      <Card id="profile-activity" eyebrow="Activity" title={`Last ${weeks.length} weeks`}><ActivityCalendar weeks={weeks} /></Card>
      <GoalsCard today={todayActivity(days, now)} settings={settings} onUpdateSetting={onUpdateSetting} />
    </div>

    <TypingSection results={data.results} onNavigate={onNavigate} />
    <ReadingSection summary={reading} sessions={data.sessions} onOpenWork={onOpenWork} onNavigate={onNavigate} />

    <AchievementsCard list={achievements({ results: data.results, progress: data.progress, scores: data.scores, academy: data.academy, typingMinutes: typing.minutes, readingMinutes: reading.minutes, longestStreak: streak.longest, highlights: data.highlights, pieces: data.pieces, savedQuotes: data.savedQuotes })} />

    <div className="profile-pair">
      <PracticeCard academy={data.academy} scores={data.scores} onNavigate={onNavigate} />
      <DataCard settings={settings} hasResults={data.results.length > 0} onChanged={reload} onImportSettings={onImportSettings} />
    </div>
  </div>;
}

// ── Achievements ──

const GROUP_ICONS: Record<AchievementGroup, React.ReactNode> = {
  typing: <Keyboard aria-hidden="true" />, reading: <BookOpen aria-hidden="true" />, habit: <Flame aria-hidden="true" />,
  practice: <GraduationCap aria-hidden="true" />, writing: <PenLine aria-hidden="true" />
};

function AchievementsCard({ list }: { list: Achievement[] }) {
  const earned = list.filter(item => item.earned).length;
  // Earned first, then the ones closest to done.
  const ordered = [...list].sort((a, b) => Number(b.earned) - Number(a.earned) || b.current / b.target - a.current / a.target);
  return <Card id="profile-achievements" eyebrow="Milestones" title="Achievements" actions={<span className="profile-card-note">{earned} of {list.length} earned</span>}>
    <ul className="achievements">
      {ordered.map(item => <li key={item.id} className="achievement" data-earned={item.earned || undefined}>
        <span className="achievement-icon">{item.earned ? <Award aria-hidden="true" /> : GROUP_ICONS[item.group]}</span>
        <span className="achievement-text">
          <strong>{item.title}</strong>
          <small>{item.detail}</small>
          {!item.earned && item.target > 1 && <span className="achievement-progress" role="progressbar" aria-label={`${item.title} progress`} aria-valuemin={0} aria-valuemax={item.target} aria-valuenow={item.current}>
            <span className="achievement-track"><i style={{ transform: `scaleX(${item.current / item.target})` }} /></span><em>{item.current} / {item.target}</em>
          </span>}
        </span>
        <span className="sr-only">{item.earned ? 'Earned' : 'Not yet earned'}</span>
      </li>)}
    </ul>
  </Card>;
}

// ── Identity ──

interface PublicProfile { handle: string; displayName: string; bio: string; leaderboardEnabled: boolean }

function ProfileHero({ status, level, words, since }: { status: BackupStatus; level: Level; words: number; since: number | null }) {
  const user = status.user ?? null;
  const userId = user?.id;
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PublicProfile>({ handle: '', displayName: '', bio: '', leaderboardEnabled: true });
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void fetch('/api/profile').then(response => (response.ok ? response.json() : null)).then(payload => {
      const saved = payload?.profile;
      if (!cancelled && saved) setProfile({ handle: saved.handle ?? '', displayName: saved.displayName ?? '', bio: saved.bio ?? '', leaderboardEnabled: saved.leaderboardEnabled !== false });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [userId]);

  const shown = user ? profile : null;
  const name = shown?.displayName || user?.name || shown?.handle || (user ? 'Reader' : 'Guest reader');
  const initials = name.split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase();

  const startEditing = () => {
    setDraft({ handle: shown?.handle ?? '', displayName: shown?.displayName || user?.name || '', bio: shown?.bio ?? '', leaderboardEnabled: shown?.leaderboardEnabled ?? true });
    setMessage(null);
    setEditing(true);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage({ text: 'Saving…' });
    try {
      const response = await fetch('/api/profile', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(draft) });
      const payload = await response.json();
      if (!response.ok) { setMessage({ text: payload.error ?? 'Could not save your profile.', error: true }); return; }
      const saved = payload.profile;
      setProfile({ handle: saved.handle, displayName: saved.displayName ?? '', bio: saved.bio ?? '', leaderboardEnabled: saved.leaderboardEnabled });
      setEditing(false);
      setMessage({ text: 'Profile saved.' });
    } catch {
      setMessage({ text: 'Could not reach the server.', error: true });
    }
  };

  return <section className="profile-hero" aria-labelledby="profile-name">
    <div className="profile-identity">
      <span className="profile-avatar" style={user?.image ? { backgroundImage: `url(${JSON.stringify(user.image)})` } : undefined} aria-hidden="true">{user?.image ? null : initials}</span>
      <div className="profile-identity-text">
        <p className="eyebrow">Profile</p>
        <h1 id="profile-name">{name}</h1>
        <p className="profile-meta">
          {shown?.handle && <span>@{shown.handle}</span>}
          {since && <span>Here since {new Date(since).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>}
          <span>Level {level.level} · {level.title}</span>
        </p>
        {shown?.bio && !editing && <p className="profile-bio">{shown.bio}</p>}
        <div className="profile-level">
          <Meter value={level.progress} />
          <small>{level.next ? `${compactNumber(level.next.words - words)} more words to ${level.next.title}` : 'The highest level. Well read.'}</small>
        </div>
        {user && !editing && <button type="button" className="rs-btn is-small profile-edit" onClick={startEditing}><Pencil aria-hidden="true" />Edit profile</button>}
        {editing && <form className="profile-form" onSubmit={save}>
          <label className="profile-field">Display name<input value={draft.displayName} maxLength={60} autoComplete="name" onChange={event => setDraft({ ...draft, displayName: event.target.value })} /></label>
          <label className="profile-field">Public handle<input value={draft.handle} required minLength={3} maxLength={20} pattern="[A-Za-z0-9_]+" onChange={event => setDraft({ ...draft, handle: event.target.value })} /></label>
          <label className="profile-field">About you<textarea value={draft.bio} maxLength={280} placeholder="What you like to read, what you're practising for…" onChange={event => setDraft({ ...draft, bio: event.target.value })} /></label>
          <label className="profile-check"><input type="checkbox" checked={draft.leaderboardEnabled} onChange={event => setDraft({ ...draft, leaderboardEnabled: event.target.checked })} />Show my verified scores on public leaderboards</label>
          <div className="profile-actions"><button type="submit" className="rs-btn is-primary">Save profile</button><button type="button" className="rs-btn" onClick={() => setEditing(false)}>Cancel</button></div>
        </form>}
        {message && <p className={`profile-note ${message.error ? 'is-error' : ''}`} role="status">{message.text}</p>}
      </div>
    </div>
    <BackupPanel status={status} />
  </section>;
}

function BackupPanel({ status }: { status: BackupStatus }) {
  const enabled = syncEnabled();
  const user = status.user ?? null;
  const now = useNow(30_000, status.lastSyncedAt);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const since = status.lastSyncedAt && now ? relativeTime(Math.max(0, now - status.lastSyncedAt)) : null;
  const state = !enabled || !user ? 'off' : status.state;
  const label = !enabled ? 'On this device' : !user ? 'Not signed in' : status.state === 'syncing' ? 'Backing up' : status.state === 'offline' ? 'Offline' : status.state === 'error' ? 'Paused' : 'Backed up';
  const detail = !enabled
    ? 'Everything is saved on this device. Backup & sync turns on once this site is connected to its database.'
    : !user ? 'Sign in to back up your reading, practice and settings, and pick up where you left off on any device.'
    : status.state === 'syncing' ? 'Backing up your latest changes…'
    : status.state === 'offline' ? 'You’re offline. Changes stay here and back up when you reconnect.'
    : status.state === 'error' ? `Backup paused: ${status.error ?? 'something went wrong'}.`
    : since ? `Last backed up ${since}.` : 'Backed up.';

  return <div className="profile-backup">
    <div className="profile-backup-head">
      <ShieldCheck aria-hidden="true" />
      <strong>Backup &amp; sync</strong>
      <span className="profile-chip" data-state={state}>{label}</span>
    </div>
    {user?.email && <p className="profile-backup-email">{user.email}</p>}
    <p role="status">{detail}</p>
    {status.skippedDocuments ? <p className="profile-note">{status.skippedDocuments} imported {status.skippedDocuments === 1 ? 'book is' : 'books are'} too large to back up and stay on this device.</p> : null}
    {status.skippedManuscripts ? <p className="profile-note">{status.skippedManuscripts} of your {status.skippedManuscripts === 1 ? 'pieces is' : 'pieces are'} too long to back up and stay on this device.</p> : null}
    <div className="profile-actions">
      {enabled && !user && <><Link href="/sign-in" className="rs-btn is-primary"><LogIn aria-hidden="true" />Sign in</Link><Link href="/sign-up" className="rs-btn">Create account</Link></>}
      {user && <><button type="button" className="rs-btn is-primary" onClick={requestBackupNow} disabled={status.state === 'syncing'}><RefreshCw aria-hidden="true" />Back up now</button><button type="button" className="rs-btn" onClick={() => setSignOutOpen(true)}>Sign out</button></>}
    </div>
    <SignOutDialog open={signOutOpen} onCancel={() => setSignOutOpen(false)} />
  </div>;
}

// ── Goals, practice and data ──

type GoalKey = 'dailyTypingGoalMinutes' | 'dailyReadingGoalMinutes';
const GOAL_STEP = 5;
const GOAL_MAX = 240;

function GoalsCard({ today, settings, onUpdateSetting }: { today: DayActivity; settings: UserSettings; onUpdateSetting: UpdateSetting }) {
  const goal = (key: GoalKey, label: string, minutes: number) => {
    const target = settings[key] ?? 15;
    const set = (next: number) => onUpdateSetting(key, Math.min(GOAL_MAX, Math.max(GOAL_STEP, next)));
    return <div className="profile-goal">
      <Ring value={minutes} goal={target} label={label} />
      <span className="profile-goal-label">{label}</span>
      <div className="profile-stepper" role="group" aria-label={`${label} goal`}>
        <button type="button" aria-label={`Lower the ${label.toLowerCase()} goal`} disabled={target <= GOAL_STEP} onClick={() => set(target - GOAL_STEP)}><Minus aria-hidden="true" /></button>
        <output>{target} min</output>
        <button type="button" aria-label={`Raise the ${label.toLowerCase()} goal`} disabled={target >= GOAL_MAX} onClick={() => set(target + GOAL_STEP)}><Plus aria-hidden="true" /></button>
      </div>
    </div>;
  };
  return <Card id="profile-goals" eyebrow="Today" title="Daily goals">
    <div className="profile-goals">
      {goal('dailyTypingGoalMinutes', 'Typing', today.typingMinutes)}
      {goal('dailyReadingGoalMinutes', 'Reading', today.readingMinutes)}
    </div>
  </Card>;
}

function PracticeCard({ academy, scores, onNavigate }: { academy: AcademyStateRecord | null; scores: ArcadeScoreRecord[]; onNavigate: (mode: TypingMode) => void }) {
  const summary = academySummary(academy);
  const lesson = summary ? findLesson(summary.currentLessonId) ?? lessonByLegacyId(summary.currentLessonId) : undefined;
  const bests = arcadeBests(scores);
  return <Card id="profile-practice" eyebrow="Practice" title="Academy and arcade">
    <div className="profile-subsection">
      <h3><GraduationCap aria-hidden="true" />Academy</h3>
      {summary
        ? <ul className="profile-list"><li>
          <div className="profile-list-main"><strong>{lesson?.title ?? 'Course'}</strong><small>{summary.placementComplete ? 'Current lesson' : 'Placement not taken yet'} · {summary.exercises} exercises done</small></div>
          <div className="profile-list-side">{summary.lessonsPassed}/{ALL_LESSONS.length} passed</div>
        </li></ul>
        : <p className="profile-note">No lessons yet. A short placement finds your starting point.</p>}
      <button type="button" className="rs-btn is-small" onClick={() => onNavigate('learn')}>Open Academy</button>
    </div>
    <div className="profile-subsection">
      <h3><Gamepad2 aria-hidden="true" />Arcade</h3>
      <ul className="profile-list">
        {bests.map(game => <li key={game.id}>
          <div className="profile-list-main"><strong>{game.label}</strong><small>{game.rounds ? `${game.rounds} ${game.rounds === 1 ? 'round' : 'rounds'}` : 'Not played yet'}</small></div>
          <div className="profile-list-side">{game.best ?? '—'}</div>
        </li>)}
      </ul>
    </div>
  </Card>;
}

function DataCard({ settings, hasResults, onChanged, onImportSettings }: { settings: UserSettings; hasResults: boolean; onChanged: () => void; onImportSettings: (settings: UserSettings) => void }) {
  const [clearOpen, setClearOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const download = async () => {
    setBusy(true);
    try {
      downloadBlob(await exportBackupBlob(settings), `keyhaven-backup-${new Date().toISOString().slice(0, 10)}.json`);
      setMessage({ text: 'Backup file downloaded.' });
    } catch {
      setMessage({ text: 'Could not create the backup file.', error: true });
    } finally {
      setBusy(false);
    }
  };
  const restore = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const result = await importBackupFile(file);
      if (result.settings) onImportSettings(result.settings);
      setMessage({ text: result.added ? `Restored ${result.added} ${result.added === 1 ? 'record' : 'records'} from the backup.` : 'Everything in that backup is already here.' });
      onChanged();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Could not read that file.', error: true });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };
  const clearHistory = async () => {
    setClearOpen(false);
    await db.testResults.clear();
    // clear() skips change tracking, so record the deletion for Backup & sync explicitly.
    await queueTombstone(db, 'results', '*');
    setMessage({ text: 'Typing history cleared.' });
    onChanged();
  };

  return <Card id="profile-data" eyebrow="Your data" title="Keep and manage">
    <div className="profile-data">
      <div className="profile-data-row">
        <div><strong>Download a backup</strong><p>History, progress, shelves, imported books and settings, in one file.</p></div>
        <button type="button" className="rs-btn" onClick={() => void download()} disabled={busy}><Download aria-hidden="true" />Download</button>
      </div>
      <div className="profile-data-row">
        <div><strong>Restore from a backup</strong><p>Adds what’s missing from a KeyHaven backup file. Newer copies here are kept.</p></div>
        <button type="button" className="rs-btn" onClick={() => fileRef.current?.click()} disabled={busy}><Upload aria-hidden="true" />Choose file</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden aria-label="Backup file" onChange={event => void restore(event.target.files?.[0])} />
      </div>
      <div className="profile-data-row">
        <div><strong>Clear typing history</strong><p>Removes every typing result, personal best and error count. Reading progress stays.</p></div>
        <button type="button" className="rs-btn is-danger" onClick={() => setClearOpen(true)} disabled={!hasResults || busy}><Trash2 aria-hidden="true" />Clear</button>
      </div>
      {message && <p className={`profile-note ${message.error ? 'is-error' : ''}`} role="status">{message.text}</p>}
    </div>
    <ConfirmDialog open={clearOpen} title="Clear typing history?" confirmLabel="Clear history" tone="danger" onConfirm={() => void clearHistory()} onCancel={() => setClearOpen(false)}>
      <p>This removes all typing results, personal bests and error data, on this device and in your backup. It can’t be undone.</p>
    </ConfirmDialog>
  </Card>;
}
