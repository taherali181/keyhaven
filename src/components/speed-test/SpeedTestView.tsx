'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, SlidersHorizontal, Trophy } from 'lucide-react';
import { createRandom } from '@/lib/academy/generate';
import { generateRandomWords } from '@/data/word-lists';
import { TestResultRecord, TypingStats, UserSettings } from '@/types';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import { TypingArea } from '@/components/typing/TypingArea';
import { LiveStatsBar } from '@/components/typing/LiveStatsBar';
import { TestResultsModal } from '@/components/typing/TestResultsModal';
import { LeaderboardView } from '@/components/analytics/LeaderboardView';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Segmented } from '@/components/ui/Segmented';
import { createClientId, db } from '@/lib/db';
import { spring } from '@/lib/motion';
import { syncEnabled } from '@/lib/sync-config';
import { getSessionUser } from '@/lib/session';

type TestType = 'time' | 'words';
interface Challenge { challengeId: string; targetText: string }

const TIME_OPTIONS = [15, 30, 60, 120];
const WORD_OPTIONS = [10, 25, 50, 100];

/** Your best and latest runs for the chosen test, so progress is visible between attempts. */
function SpeedRecords({ subMode, version }: { subMode: string; version: number }) {
  const [rows, setRows] = useState<TestResultRecord[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    void db.testResults.where('mode').equals('speed-test').filter(record => record.subMode === subMode).toArray()
      .then(list => { if (!cancelled) setRows(list); })
      .catch(() => { if (!cancelled) setRows([]); });
    return () => { cancelled = true; };
  }, [subMode, version]);

  if (!rows) return null;
  if (!rows.length) return <p className="speed-records is-empty">No {subMode} results yet. Your best and most recent runs will appear here.</p>;
  const best = rows.reduce((top, row) => (row.wpm > top.wpm || (row.wpm === top.wpm && row.accuracy > top.accuracy) ? row : top));
  const recent = [...rows].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  return <section className="speed-records" aria-label={`Your ${subMode} results`}>
    <div className="speed-best">
      <Trophy aria-hidden="true" />
      <span><small>Personal best · {subMode}</small><strong>{best.wpm} wpm</strong><em>{best.accuracy}% accuracy · {rows.length} {rows.length === 1 ? 'run' : 'runs'}</em></span>
    </div>
    <div className="speed-recent-wrap">
      <span className="speed-recent-label">Recent</span>
      <ol className="speed-recent">{recent.map(row => <li key={row.clientId}><strong>{row.wpm}</strong><small>{row.accuracy}%</small></li>)}</ol>
    </div>
  </section>;
}

export const SpeedTestView = ({ settings, onKeyPress }: { settings: UserSettings; onKeyPress: (key: string) => void }) => {
  const [view, setView] = useState<'test' | 'leaderboard'>('test');
  const [testType, setTestType] = useState<TestType>('time');
  const [timeConfig, setTimeConfig] = useState(30);
  const [wordConfig, setWordConfig] = useState(25);
  const [punctuation, setPunctuation] = useState(false);
  const [numbers, setNumbers] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [completed, setCompleted] = useState<TypingStats | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [recordsVersion, setRecordsVersion] = useState(0);
  const startedRef = useRef(false);
  const configRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!configOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (configRef.current && !configRef.current.contains(event.target as Node)) setConfigOpen(false);
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setConfigOpen(false); };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onPointerDown); document.removeEventListener('keydown', onKey); };
  }, [configOpen]);

  // The server and the first client render share a fixed seed, so hydration matches; a random seed follows at once.
  const [seed, setSeed] = useState('first-render');
  useEffect(() => { queueMicrotask(() => setSeed(Math.random().toString(36).slice(2))); }, []);
  const localText = useMemo(() => generateRandomWords(testType === 'time' ? Math.max(120, timeConfig * 7) : wordConfig, punctuation, numbers, createRandom(`${seed}:${nonce}`)), [testType, timeConfig, wordConfig, punctuation, numbers, nonce, seed]);

  useEffect(() => {
    if (!syncEnabled()) return;
    let cancelled = false;
    void getSessionUser().then(user => {
      if (!user || cancelled) return null;
      return fetch('/api/challenges', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode: 'speed-test', configuration: { testType, duration: timeConfig, wordCount: wordConfig, punctuation, numbers } }) });
    }).then(response => response?.ok ? response.json() : null).then(payload => { if (payload && !cancelled && !startedRef.current) setChallenge(payload); }).catch(() => {});
    return () => { cancelled = true; };
  }, [testType, timeConfig, wordConfig, punctuation, numbers, nonce]);

  const subMode = testType === 'time' ? `${timeConfig}s` : `${wordConfig} words`;
  const targetText = challenge?.targetText ?? localText;
  const complete = (stats: TypingStats) => {
    const clientId = createClientId();
    setCompleted(stats); setResultOpen(true);
    void db.testResults.add({ clientId, mode: 'speed-test', subMode, title: `Speed Test · ${subMode}`, wpm: stats.wpm, rawWpm: stats.rawWpm, accuracy: stats.accuracy, consistency: stats.consistency, duration: stats.timeElapsed, timestamp: Date.now(), errors: stats.incorrectChars, errorKeys: stats.errorHeatmap, totalChars: stats.totalChars, correctChars: stats.correctChars, incorrectChars: stats.incorrectChars, challengeId: challenge?.challengeId, visibility: 'private' })
      .then(() => setRecordsVersion(value => value + 1)).catch(() => {});
    if (challenge) void fetch('/api/scores', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ clientResultId: clientId, challengeId: challenge.challengeId, elapsedMs: Math.round(stats.timeElapsed * 1000), events: stats.evidence }) }).then(async response => {
      if (!response.ok) return; const payload = await response.json(); await db.testResults.where('clientId').equals(clientId).modify({ visibility: payload.result.visibility, syncedAt: Date.now() });
    }).catch(() => {});
  };
  const engine = useTypingEngine({ targetText, isTimed: testType === 'time', timeLimit: timeConfig, sessionKey: `${testType}-${timeConfig}-${wordConfig}-${punctuation}-${numbers}-${nonce}-${challenge?.challengeId ?? 'guest'}`, strictMode: settings.strictMode, onComplete: complete, onKeyPress: key => { startedRef.current = true; onKeyPress(key); } });
  const restart = () => { startedRef.current = false; setResultOpen(false); setChallenge(null); setNonce(value => value + 1); engine.reset(timeConfig); };
  const reconfigure = (action: () => void) => { startedRef.current = false; action(); setChallenge(null); setResultOpen(false); setNonce(value => value + 1); engine.reset(); };

  return <section className="speed-shell">
    <SectionHeader eyebrow="Practice against the clock" title="Speed" tabs={[{ id: 'test', label: 'Test' }, { id: 'leaderboard', label: 'Leaderboard' }]} active={view} onChange={setView} layoutId="speed-tab" />
    {view === 'leaderboard' ? <LeaderboardView speedOnly embedded /> : <div className="speed-stage">
      <div className="speed-toolbar">
        <div className="speed-config-wrap" ref={configRef}>
          <button type="button" className="speed-config-trigger" onClick={() => setConfigOpen(value => !value)} aria-expanded={configOpen} aria-haspopup="dialog">
            <SlidersHorizontal aria-hidden="true" />
            <span>{testType === 'time' ? `${timeConfig} seconds` : `${wordConfig} words`}</span>
            {punctuation && <em>punctuation</em>}
            {numbers && <em>numbers</em>}
            <motion.span className="speed-config-chevron" animate={{ rotate: configOpen ? 180 : 0 }} transition={{ duration: 0.2 }} aria-hidden="true"><ChevronDown /></motion.span>
          </button>
          <AnimatePresence>
            {configOpen && <motion.div
              className="speed-config-panel"
              role="dialog"
              aria-label="Test settings"
              initial={{ opacity: 0, scale: 0.96, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0, transition: spring.soft }}
              exit={{ opacity: 0, scale: 0.98, y: -4, transition: { duration: 0.12 } }}
            >
              <div className="speed-config-row"><span>Mode</span><Segmented label="Mode" value={testType} options={[{ value: 'time', label: 'Time' }, { value: 'words', label: 'Words' }]} onChange={value => reconfigure(() => setTestType(value))} layoutId="speed-mode" /></div>
              <div className="speed-config-row">
                <span>Length</span>
                <Segmented
                  label="Length"
                  value={testType === 'time' ? timeConfig : wordConfig}
                  options={(testType === 'time' ? TIME_OPTIONS : WORD_OPTIONS).map(value => ({ value, label: testType === 'time' ? `${value}s` : String(value) }))}
                  onChange={value => reconfigure(() => (testType === 'time' ? setTimeConfig(value) : setWordConfig(value)))}
                  layoutId="speed-length"
                />
              </div>
              <div className="speed-config-row">
                <span>Text</span>
                <div className="speed-toggles">
                  <button type="button" className="speed-toggle" aria-pressed={punctuation} onClick={() => reconfigure(() => setPunctuation(value => !value))}>Punctuation</button>
                  <button type="button" className="speed-toggle" aria-pressed={numbers} onClick={() => reconfigure(() => setNumbers(value => !value))}>Numbers</button>
                </div>
              </div>
            </motion.div>}
          </AnimatePresence>
        </div>
      </div>
      <TypingArea targetText={targetText} typed={engine.typed} isFinished={engine.isFinished} caretStyle={settings.caretStyle} font="jetbrains" fontSize={settings.fontSize} wrapMode="whole-word" viewportLines={3} viewportMode="centered" lineHeight={1.8} onKeyDown={engine.handleKeyDown} onCompositionStart={engine.handleCompositionStart} onCompositionEnd={engine.handleCompositionEnd} onReset={restart} />
      <SpeedRecords subMode={subMode} version={recordsVersion} />
      <LiveStatsBar wpm={engine.wpm} accuracy={engine.accuracy} timeRemaining={engine.timeRemaining} timeElapsed={engine.timeElapsed} isTimed={testType === 'time'} onReset={restart} showLiveWpm={settings.showLiveWpm} showLiveAccuracy={settings.showLiveAccuracy} />
      <TestResultsModal stats={completed} isOpen={resultOpen} title={`Speed Test · ${subMode}`} onRetry={restart} />
    </div>}
  </section>;
};
