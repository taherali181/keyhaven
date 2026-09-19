'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Flag, PenLine, SlidersHorizontal, Trophy } from 'lucide-react';
import { createRandom } from '@/lib/academy/generate';
import { generateRandomWords } from '@/data/word-lists';
import type { Quote, SpeedPrefs, TestResultRecord, TypingStats, UserSettings } from '@/types';
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
import { loadQuotes } from '@/lib/quotes';
import { MAX_CUSTOM_CHARS, QUOTE_LENGTHS, SPEED_MODES, TIME_OPTIONS, WORD_OPTIONS, ZEN_WORDS, pickQuote, practiceText, speedLabel, speedSubMode } from '@/lib/speed';

interface Challenge { challengeId: string; targetText: string }
type UpdateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;

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

export const SpeedTestView = ({ settings, onKeyPress, onUpdateSetting }: { settings: UserSettings; onKeyPress: (key: string) => void; onUpdateSetting: UpdateSetting }) => {
  const prefs = settings.speedPrefs;
  const { mode, time: timeConfig, words: wordConfig, punctuation, numbers } = prefs;
  const [view, setView] = useState<'test' | 'leaderboard'>('test');
  const [configOpen, setConfigOpen] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [completed, setCompleted] = useState<TypingStats | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [recordsVersion, setRecordsVersion] = useState(0);
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [customDraft, setCustomDraft] = useState('');
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

  // Quotes load the first time Quote mode is chosen.
  useEffect(() => {
    if (mode !== 'quote' || quotes) return;
    let cancelled = false;
    void loadQuotes().then(list => { if (!cancelled) setQuotes(list); }).catch(() => { if (!cancelled) setQuotes([]); });
    return () => { cancelled = true; };
  }, [mode, quotes]);

  // The server and the first client render share a fixed seed, so hydration matches; a random seed follows at once.
  const [seed, setSeed] = useState('first-render');
  useEffect(() => { queueMicrotask(() => setSeed(Math.random().toString(36).slice(2))); }, []);
  const quote = useMemo(() => (mode === 'quote' && quotes ? pickQuote(quotes, prefs.quoteLength, createRandom(`${seed}:${nonce}:quote`)) : null), [mode, quotes, prefs.quoteLength, seed, nonce]);
  const customText = useMemo(() => practiceText(prefs.customText), [prefs.customText]);
  const localText = useMemo(() => {
    const random = createRandom(`${seed}:${nonce}`);
    if (mode === 'time') return generateRandomWords(Math.max(120, timeConfig * 7), punctuation, numbers, random);
    if (mode === 'words') return generateRandomWords(wordConfig, punctuation, numbers, random);
    if (mode === 'zen') return generateRandomWords(ZEN_WORDS, punctuation, numbers, random);
    if (mode === 'quote') return quote?.text ?? '';
    return customText;
  }, [mode, timeConfig, wordConfig, punctuation, numbers, nonce, seed, quote, customText]);

  // Signed-in time and word tests are checked by the server, which hands out the text.
  const ranked = mode === 'time' || mode === 'words';
  useEffect(() => {
    if (!ranked || !syncEnabled()) return;
    let cancelled = false;
    void getSessionUser().then(user => {
      if (!user || cancelled) return null;
      return fetch('/api/challenges', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode: 'speed-test', configuration: { testType: mode, duration: timeConfig, wordCount: wordConfig, punctuation, numbers } }) });
    }).then(response => response?.ok ? response.json() : null).then(payload => { if (payload && !cancelled && !startedRef.current) setChallenge(payload); }).catch(() => {});
    return () => { cancelled = true; };
  }, [ranked, mode, timeConfig, wordConfig, punctuation, numbers, nonce]);

  const subMode = speedSubMode(prefs);
  const targetText = (ranked ? challenge?.targetText : null) ?? localText;
  const complete = (stats: TypingStats) => {
    const clientId = createClientId();
    setCompleted(stats); setResultOpen(true);
    void db.testResults.add({ clientId, mode: 'speed-test', subMode, title: `Speed Test · ${subMode}`, wpm: stats.wpm, rawWpm: stats.rawWpm, accuracy: stats.accuracy, consistency: stats.consistency, duration: stats.timeElapsed, timestamp: Date.now(), errors: stats.incorrectChars, errorKeys: stats.errorHeatmap, totalChars: stats.totalChars, correctChars: stats.correctChars, incorrectChars: stats.incorrectChars, challengeId: challenge?.challengeId, visibility: 'private' })
      .then(() => setRecordsVersion(value => value + 1)).catch(() => {});
    if (challenge) void fetch('/api/scores', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ clientResultId: clientId, challengeId: challenge.challengeId, elapsedMs: Math.round(stats.timeElapsed * 1000), events: stats.evidence }) }).then(async response => {
      if (!response.ok) return; const payload = await response.json(); await db.testResults.where('clientId').equals(clientId).modify({ visibility: payload.result.visibility, syncedAt: Date.now() });
    }).catch(() => {});
  };
  const engine = useTypingEngine({ targetText, isTimed: mode === 'time', timeLimit: timeConfig, sessionKey: `${subMode}-${punctuation}-${numbers}-${nonce}-${challenge?.challengeId ?? 'guest'}-${quote?.id ?? ''}`, strictMode: settings.strictMode, onComplete: complete, onKeyPress: key => { startedRef.current = true; onKeyPress(key); } });
  const restart = () => { startedRef.current = false; setResultOpen(false); setChallenge(null); setNonce(value => value + 1); engine.reset(timeConfig); };
  /** A new setup is remembered for next time and starts a fresh test. */
  const reconfigure = (patch: Partial<SpeedPrefs>) => {
    startedRef.current = false;
    onUpdateSetting('speedPrefs', { ...prefs, ...patch });
    setChallenge(null); setResultOpen(false); setNonce(value => value + 1); engine.reset();
  };
  const chooseMode = (next: SpeedPrefs['mode']) => {
    if (next === 'custom' && !customText) { setCustomDraft(prefs.customText); setEditing(true); }
    else setEditing(false);
    reconfigure({ mode: next });
  };
  const saveCustom = () => {
    if (!practiceText(customDraft)) return;
    setEditing(false);
    reconfigure({ mode: 'custom', customText: customDraft.slice(0, MAX_CUSTOM_CHARS) });
  };
  // Zen has no end of its own: Shift+Enter (or Finish) ends it.
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (mode === 'zen' && event.key === 'Enter' && event.shiftKey) {
      event.preventDefault();
      if (engine.isActive) engine.finishTest();
      return;
    }
    engine.handleKeyDown(event);
  };

  const showEditor = mode === 'custom' && (editing || !customText);
  const lengthOptions = mode === 'time'
    ? { value: timeConfig, options: TIME_OPTIONS.map(value => ({ value, label: `${value}s` })) }
    : mode === 'words'
      ? { value: wordConfig, options: WORD_OPTIONS.map(value => ({ value, label: String(value) })) }
      : null;

  return <section className="speed-shell">
    <SectionHeader eyebrow="Practice against the clock" title="Speed" tabs={[{ id: 'test', label: 'Test' }, { id: 'leaderboard', label: 'Leaderboard' }]} active={view} onChange={setView} layoutId="speed-tab" />
    {view === 'leaderboard' ? <LeaderboardView speedOnly embedded /> : <div className="speed-stage">
      <div className="speed-toolbar">
        <div className="speed-modes glass glass-pill">
          <Segmented label="Test mode" value={mode} options={SPEED_MODES} onChange={chooseMode} layoutId="speed-mode" />
        </div>
        <div className="speed-config-wrap" ref={configRef}>
          <button type="button" className="speed-config-trigger" onClick={() => setConfigOpen(value => !value)} aria-expanded={configOpen} aria-haspopup="dialog">
            <SlidersHorizontal aria-hidden="true" />
            <span>{speedLabel(prefs)}</span>
            {mode !== 'quote' && mode !== 'custom' && punctuation && <em>punctuation</em>}
            {mode !== 'quote' && mode !== 'custom' && numbers && <em>numbers</em>}
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
              {lengthOptions && <div className="speed-config-row">
                <span>Length</span>
                <Segmented label="Length" value={lengthOptions.value} options={lengthOptions.options} onChange={value => reconfigure(mode === 'time' ? { time: value } : { words: value })} layoutId="speed-length" />
              </div>}
              {mode === 'quote' && <div className="speed-config-row">
                <span>Length</span>
                <Segmented label="Quote length" value={prefs.quoteLength} options={QUOTE_LENGTHS.map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) }))} onChange={value => reconfigure({ quoteLength: value })} layoutId="speed-quote-length" />
              </div>}
              {(mode === 'time' || mode === 'words' || mode === 'zen') && <div className="speed-config-row">
                <span>Text</span>
                <div className="speed-toggles">
                  <button type="button" className="speed-toggle" aria-pressed={punctuation} onClick={() => reconfigure({ punctuation: !punctuation })}>Punctuation</button>
                  <button type="button" className="speed-toggle" aria-pressed={numbers} onClick={() => reconfigure({ numbers: !numbers })}>Numbers</button>
                </div>
              </div>}
              {mode === 'custom' && <div className="speed-config-row">
                <span>Text</span>
                <button type="button" className="speed-toggle" onClick={() => { setCustomDraft(prefs.customText); setEditing(true); setConfigOpen(false); }}><PenLine aria-hidden="true" />Edit your text</button>
              </div>}
              <p className="speed-config-note">{mode === 'time' ? 'Type as much as you can before the time runs out.' : mode === 'words' ? 'Type a set number of words as fast as you can.' : mode === 'quote' ? 'A line from the quote collection, with who said it.' : mode === 'custom' ? 'Practise on any text you paste in.' : 'No clock and no finish line. Press Shift+Enter when you are done.'}</p>
            </motion.div>}
          </AnimatePresence>
        </div>
        {mode === 'zen' && <button type="button" className="speed-finish" disabled={!engine.isActive} onClick={() => engine.finishTest()}><Flag aria-hidden="true" />Finish<kbd>Shift Enter</kbd></button>}
      </div>

      {showEditor
        ? <div className="speed-custom glass">
          <label htmlFor="speed-custom-text"><strong>Your practice text</strong><small>Paste or write anything. Curly quotes and long dashes become plain keys.</small></label>
          <textarea id="speed-custom-text" value={customDraft} maxLength={MAX_CUSTOM_CHARS} rows={6} placeholder="Paste a paragraph you want to get faster at…" onChange={event => setCustomDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); saveCustom(); } }} autoFocus />
          <div className="speed-custom-actions">
            <small>{customDraft.length.toLocaleString()} / {MAX_CUSTOM_CHARS.toLocaleString()}</small>
            {customText && <button type="button" className="rs-btn" onClick={() => setEditing(false)}>Cancel</button>}
            <button type="button" className="rs-btn is-primary" disabled={!practiceText(customDraft)} onClick={saveCustom}><Check aria-hidden="true" />Use this text</button>
          </div>
        </div>
        : targetText
          ? <TypingArea targetText={targetText} typed={engine.typed} isFinished={engine.isFinished} caretStyle={settings.caretStyle} font={settings.font} fontSize={settings.fontSize} wrapMode="whole-word" viewportLines={3} viewportMode="centered" lineHeight={1.8} onKeyDown={onKeyDown} onCompositionStart={engine.handleCompositionStart} onCompositionEnd={engine.handleCompositionEnd} onReset={restart} />
          : <div className="speed-loading"><span className="skeleton" aria-label="Choosing a quote" /></div>}
      {mode === 'quote' && quote && !showEditor && <p className="speed-attribution">— {quote.author}{quote.source ? <>, <cite>{quote.source}</cite></> : null}</p>}
      <SpeedRecords subMode={subMode} version={recordsVersion} />
      <LiveStatsBar wpm={engine.wpm} accuracy={engine.accuracy} timeRemaining={engine.timeRemaining} timeElapsed={engine.timeElapsed} isTimed={mode === 'time'} onReset={restart} showLiveWpm={settings.showLiveWpm} showLiveAccuracy={settings.showLiveAccuracy} />
      <TestResultsModal stats={completed} isOpen={resultOpen} title={`Speed Test · ${subMode}`} onRetry={restart} />
    </div>}
  </section>;
};
