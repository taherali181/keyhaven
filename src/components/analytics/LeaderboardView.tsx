'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Flame, Zap, Clock, Globe } from 'lucide-react';
import { ArcadeScoreRecord, TestResultRecord } from '@/types';
import { db } from '@/lib/db';

export const LeaderboardView: React.FC = () => {
  const [boardType, setBoardType] = useState<'speed' | 'sprint'>('speed');
  const [speedRecords, setSpeedRecords] = useState<TestResultRecord[]>([]);
  const [sprintRecords, setSprintRecords] = useState<ArcadeScoreRecord[]>([]);

  useEffect(() => {
    // Load top speeds from Dexie DB
    db.testResults.orderBy('wpm').reverse().limit(15).toArray().then(data => {
      setSpeedRecords(data);
    }).catch(() => {});

    // Load top alphabet sprints from Dexie DB
    db.arcadeScores.where('game').equals('alphabet-sprint').sortBy('timeMs').then(data => {
      setSprintRecords(data.slice(0, 15));
    }).catch(() => {});
  }, []);

  // Built-in Hall of Fame benchmarks for comparison
  const mockGlobalRecords = [
    { rank: 1, name: 'AuraTyper', wpm: 148, acc: '99.4%', mode: '60s Test', date: 'Yesterday' },
    { rank: 2, name: 'ZenMaster_99', wpm: 135, acc: '98.8%', mode: '60s Test', date: '3 days ago' },
    { rank: 3, name: 'KafkaTypist', wpm: 124, acc: '100%', mode: 'The Metamorphosis', date: 'This week' },
    { rank: 4, name: 'StoicScribe', wpm: 118, acc: '97.6%', mode: 'Meditations', date: 'This week' },
    { rank: 5, name: 'CosmicTypist', wpm: 109, acc: '99.1%', mode: 'Quotes', date: 'This week' }
  ];

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-[var(--color-accent)]">
              Hall of Fame
            </span>
          </div>
          <h2 className="text-3xl font-serif font-bold text-[var(--text-primary)] mt-1">
            Leaderboards & Records
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Track your personal bests and compete against top scores.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--color-border)]">
          <button
            onClick={() => setBoardType('speed')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              boardType === 'speed'
                ? 'bg-[var(--color-accent)] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Speed Records</span>
          </button>
          <button
            onClick={() => setBoardType('sprint')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              boardType === 'sprint'
                ? 'bg-[var(--color-accent)] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Alphabet Sprint (A-Z)</span>
          </button>
        </div>
      </div>

      {/* Leaderboard Table Card */}
      <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--color-border)] shadow-xl overflow-hidden">
        {boardType === 'speed' ? (
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Personal Top Typing Speeds</span>
            </h3>

            {speedRecords.length === 0 ? (
              <div className="text-center py-12 text-xs text-[var(--text-muted)]">
                No recorded tests yet. Complete a story or speed test to see your ranking here!
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {speedRecords.map((rec, idx) => (
                  <div key={idx} className="flex items-center justify-between py-3 text-xs">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                        idx === 0 ? 'bg-amber-500/20 text-amber-500' : idx === 1 ? 'bg-slate-400/20 text-slate-400' : idx === 2 ? 'bg-amber-700/20 text-amber-700' : 'text-[var(--text-muted)]'
                      }`}>
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="font-semibold text-[var(--text-primary)]">
                          {rec.title || `${rec.mode} (${rec.subMode})`}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)]">
                          {new Date(rec.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="font-bold font-mono text-[var(--color-accent)] text-base">
                          {rec.wpm} WPM
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)]">
                          {rec.accuracy}% acc
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-[var(--color-accent)]" />
              <span>Alphabet Sprint (A to Z) High Scores</span>
            </h3>

            {sprintRecords.length === 0 ? (
              <div className="text-center py-12 text-xs text-[var(--text-muted)]">
                No alphabet sprints recorded yet. Head to Arcade &gt; Alphabet Sprint to set your first record!
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {sprintRecords.map((rec, idx) => (
                  <div key={idx} className="flex items-center justify-between py-3 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-[var(--text-primary)] font-mono text-base">
                          {(rec.timeMs / 1000).toFixed(2)}s
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)]">
                          {new Date(rec.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="font-mono text-xs text-[var(--color-correct)] font-semibold">
                      {rec.wpm} WPM Equivalent
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Global Community Benchmark Section */}
        <div className="mt-8 pt-6 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-2 mb-4 text-xs font-bold text-[var(--text-primary)]">
            <Globe className="w-4 h-4 text-[var(--color-accent)]" />
            <span>Global Community Highlights</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {mockGlobalRecords.map(item => (
              <div key={item.rank} className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--color-border)] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[var(--color-accent)]">#{item.rank}</span>
                  <div>
                    <div className="font-semibold text-[var(--text-primary)]">{item.name}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">{item.mode} • {item.date}</div>
                  </div>
                </div>
                <div className="text-right font-mono font-bold text-[var(--color-accent)]">
                  {item.wpm} WPM
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
