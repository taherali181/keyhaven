'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { generateRandomWords } from '@/data/word-lists';
import { TypingStats, UserSettings } from '@/types';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import { TypingArea } from '@/components/typing/TypingArea';
import { LiveStatsBar } from '@/components/typing/LiveStatsBar';
import { TestResultsModal } from '@/components/typing/TestResultsModal';
import { LeaderboardView } from '@/components/analytics/LeaderboardView';
import { createClientId, db } from '@/lib/db';

type TestType = 'time' | 'words';
interface Challenge { challengeId: string; targetText: string }

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
  const startedRef = useRef(false);
  const localText = useMemo(() => { void nonce; return generateRandomWords(testType === 'time' ? Math.max(120, timeConfig * 7) : wordConfig, punctuation, numbers); }, [testType, timeConfig, wordConfig, punctuation, numbers, nonce]);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_KEYHAVEN_CLOUD !== 'true') return;
    let cancelled = false;
    void fetch('/api/auth/session').then(response => response.json()).then(session => {
      if (!session.user || cancelled) return null;
      return fetch('/api/challenges', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode: 'speed-test', configuration: { testType, duration: timeConfig, wordCount: wordConfig, punctuation, numbers } }) });
    }).then(response => response?.ok ? response.json() : null).then(payload => { if (payload && !cancelled && !startedRef.current) setChallenge(payload); }).catch(() => {});
    return () => { cancelled = true; };
  }, [testType, timeConfig, wordConfig, punctuation, numbers, nonce]);

  const targetText = challenge?.targetText ?? localText;
  const complete = (stats: TypingStats) => {
    const clientId = createClientId();
    setCompleted(stats); setResultOpen(true);
    const subMode = testType === 'time' ? `${timeConfig}s` : `${wordConfig} words`;
    void db.testResults.add({ clientId, mode: 'speed-test', subMode, title: `Speed Test · ${subMode}`, wpm: stats.wpm, rawWpm: stats.rawWpm, accuracy: stats.accuracy, consistency: stats.consistency, duration: stats.timeElapsed, timestamp: Date.now(), errors: stats.incorrectChars, errorKeys: stats.errorHeatmap, totalChars: stats.totalChars, correctChars: stats.correctChars, incorrectChars: stats.incorrectChars, challengeId: challenge?.challengeId, visibility: 'private' }).then(() => window.dispatchEvent(new Event('keyhaven:sync')));
    if (challenge) void fetch('/api/scores', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ clientResultId: clientId, challengeId: challenge.challengeId, elapsedMs: Math.round(stats.timeElapsed * 1000), events: stats.evidence }) }).then(async response => {
      if (!response.ok) return; const payload = await response.json(); await db.testResults.where('clientId').equals(clientId).modify({ visibility: payload.result.visibility, syncedAt: Date.now() });
    }).catch(() => {});
  };
  const engine = useTypingEngine({ targetText, isTimed: testType === 'time', timeLimit: timeConfig, sessionKey: `${testType}-${timeConfig}-${wordConfig}-${punctuation}-${numbers}-${nonce}-${challenge?.challengeId ?? 'guest'}`, strictMode: settings.strictMode, onComplete: complete, onKeyPress: key => { startedRef.current = true; onKeyPress(key); } });
  const restart = () => { startedRef.current = false; setResultOpen(false); setChallenge(null); setNonce(value => value + 1); engine.reset(timeConfig); };
  const reconfigure = (action: () => void) => { startedRef.current = false; action(); setChallenge(null); setResultOpen(false); setNonce(value => value + 1); engine.reset(); };

  return <section className="speed-shell">
    <header className="section-header"><div><p className="eyebrow">Practice against the clock</p><h1>Speed</h1></div><nav><button className={view === 'test' ? 'active' : ''} onClick={() => setView('test')}>Test</button><button className={view === 'leaderboard' ? 'active' : ''} onClick={() => setView('leaderboard')}>Leaderboard</button></nav></header>
    {view === 'leaderboard' ? <LeaderboardView speedOnly embedded /> : <div className="speed-stage">
      <div className="speed-config-wrap"><button className="speed-config-trigger" onClick={() => setConfigOpen(value => !value)}><SlidersHorizontal />{testType === 'time' ? `${timeConfig} seconds` : `${wordConfig} words`}<ChevronDown /></button>{configOpen && <div className="speed-config-panel">
        <div><span>Mode</span>{(['time', 'words'] as const).map(value => <button key={value} className={testType === value ? 'active' : ''} onClick={() => reconfigure(() => setTestType(value))}>{value}</button>)}</div>
        <div><span>Length</span>{(testType === 'time' ? [15, 30, 60, 120] : [10, 25, 50, 100]).map(value => <button key={value} className={(testType === 'time' ? timeConfig : wordConfig) === value ? 'active' : ''} onClick={() => reconfigure(() => testType === 'time' ? setTimeConfig(value) : setWordConfig(value))}>{value}{testType === 'time' ? 's' : ''}</button>)}</div>
        <div><span>Text</span><button className={punctuation ? 'active' : ''} onClick={() => reconfigure(() => setPunctuation(value => !value))}>Punctuation</button><button className={numbers ? 'active' : ''} onClick={() => reconfigure(() => setNumbers(value => !value))}>Numbers</button></div>
      </div>}</div>
      <TypingArea targetText={targetText} typed={engine.typed} isFinished={engine.isFinished} caretStyle={settings.caretStyle} font="jetbrains" fontSize={settings.fontSize} wrapMode="whole-word" viewportLines={3} viewportMode="centered" lineHeight={1.8} onKeyDown={engine.handleKeyDown} onCompositionStart={engine.handleCompositionStart} onCompositionEnd={engine.handleCompositionEnd} onReset={restart} />
      <p className="speed-note">Click the text and begin. The active line stays centered.</p>
      <LiveStatsBar wpm={engine.wpm} accuracy={engine.accuracy} timeRemaining={engine.timeRemaining} timeElapsed={engine.timeElapsed} isTimed={testType === 'time'} onReset={restart} showLiveWpm={settings.showLiveWpm} showLiveAccuracy={settings.showLiveAccuracy} />
      <TestResultsModal stats={completed} isOpen={resultOpen} title={`Speed Test · ${testType === 'time' ? `${timeConfig}s` : `${wordConfig} words`}`} onRetry={restart} />
    </div>}
  </section>;
};
