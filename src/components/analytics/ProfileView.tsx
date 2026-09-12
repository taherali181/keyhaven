'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { User, Zap, Target, Award, Clock, Trash2, Cloud, LogIn } from 'lucide-react';
import { TestResultRecord } from '@/types';
import { db } from '@/lib/db';
import { VirtualKeyboardHeatmap } from '@/components/typing/VirtualKeyboardHeatmap';

export const ProfileView: React.FC = () => {
  const [history, setHistory] = useState<TestResultRecord[]>([]);
  const [lifetimeErrors, setLifetimeErrors] = useState<Record<string, number>>({});

  const reloadData = () => {
    db.testResults.toArray().then(records => {
      setHistory(records.reverse());

      const errMap: Record<string, number> = {};
      records.forEach(r => {
        if (r.errorKeys) {
          Object.entries(r.errorKeys).forEach(([k, count]) => {
            errMap[k] = (errMap[k] || 0) + count;
          });
        }
      });
      setLifetimeErrors(errMap);
    }).catch(() => {});
  };

  useEffect(() => {
    reloadData();
  }, []);

  const totalTests = history.length;
  const bestWpm = totalTests > 0 ? Math.max(...history.map(h => h.wpm)) : 0;
  const avgWpm = totalTests > 0 ? Math.round(history.reduce((a, b) => a + b.wpm, 0) / totalTests) : 0;
  const avgAcc = totalTests > 0 ? Math.round(history.reduce((a, b) => a + b.accuracy, 0) / totalTests) : 100;
  const totalDurationSec = history.reduce((a, b) => a + (b.duration || 0), 0);
  const totalMins = (totalDurationSec / 60).toFixed(1);

  const clearHistory = async () => {
    if (confirm('Are you sure you want to clear your typing test history?')) {
      await db.testResults.clear();
      reloadData();
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center font-bold text-xl font-serif">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-serif font-bold text-[var(--text-primary)]">
              Typist Profile & Analytics
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Your typing journey, accuracy benchmarks, and lifetime keyboard heatmap.
            </p>
          </div>
        </div>

        {totalTests > 0 && (
          <button
            onClick={clearHistory}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium text-rose-500 hover:bg-rose-500/10 border border-rose-500/30 transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      <AccountPanel />

      {/* Lifetime Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--color-border)]">
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-1">
            <Zap className="w-3.5 h-3.5 text-[var(--color-accent)]" />
            <span>Highest WPM</span>
          </div>
          <div className="text-3xl font-black font-mono text-[var(--color-accent)]">
            {bestWpm}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--color-border)]">
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-1">
            <Award className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            <span>Average WPM</span>
          </div>
          <div className="text-3xl font-black font-mono text-[var(--text-primary)]">
            {avgWpm}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--color-border)]">
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-1">
            <Target className="w-3.5 h-3.5 text-[var(--color-correct)]" />
            <span>Avg Accuracy</span>
          </div>
          <div className="text-3xl font-black font-mono text-[var(--color-correct)]">
            {avgAcc}%
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--color-border)]">
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-1">
            <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span>Time Typed</span>
          </div>
          <div className="text-3xl font-black font-mono text-[var(--text-secondary)]">
            {totalMins}m
          </div>
        </div>
      </div>

      {/* Lifetime Error Heatmap */}
      <div className="mb-8 p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--color-border)] shadow-md">
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2">
          Lifetime Error Heatmap
        </h3>
        <p className="text-xs text-[var(--text-secondary)] mb-6">
          Keys with numbers show total recorded mistakes across stories, speed tests, and books.
        </p>

        <VirtualKeyboardHeatmap
          errorHeatmap={lifetimeErrors}
          showFingers={true}
        />
      </div>

      {/* Recent History */}
      <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--color-border)] shadow-md">
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">
          Recent Activity Log ({totalTests} total)
        </h3>

        {totalTests === 0 ? (
          <div className="text-center py-8 text-xs text-[var(--text-muted)]">
            No tests recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)] max-h-80 overflow-y-auto">
            {history.map((rec, idx) => (
              <div key={idx} className="flex items-center justify-between py-2.5 text-xs">
                <div>
                  <div className="font-semibold text-[var(--text-primary)]">
                    {rec.title || rec.mode}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    {new Date(rec.timestamp).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="font-mono font-bold text-[var(--color-accent)]">
                    {rec.wpm} WPM
                  </span>
                  <span className="font-mono text-[var(--color-correct)]">
                    {rec.accuracy}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function AccountPanel() {
  const cloudAvailable = process.env.NEXT_PUBLIC_KEYHAVEN_CLOUD === 'true';
  const [email, setEmail] = useState<string | null>(null);
  const [handle, setHandle] = useState('');
  const [leaderboardEnabled, setLeaderboardEnabled] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!cloudAvailable) return;
    void fetch('/api/auth/session').then(response => response.json()).then(async session => {
      if (!session?.user) return;
      setEmail(session.user.email ?? 'Signed in');
      const response = await fetch('/api/profile');
      if (!response.ok) return;
      const payload = await response.json();
      if (payload.profile) { setHandle(payload.profile.handle); setLeaderboardEnabled(payload.profile.leaderboardEnabled); }
    });
  }, [cloudAvailable]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setMessage('Saving…');
    const response = await fetch('/api/profile', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ handle, leaderboardEnabled }) });
    const payload = await response.json();
    setMessage(response.ok ? 'Profile saved and sync enabled.' : payload.error ?? 'Could not save profile.');
  };

  return (
    <section className="editorial-panel mb-8 flex flex-col justify-between gap-5 p-5 sm:flex-row sm:items-center">
      <div className="flex items-start gap-3"><Cloud className="mt-0.5 h-5 w-5 text-[var(--color-accent)]" /><div><h3 className="text-sm font-bold">KeyHaven Cloud</h3><p className="mt-1 text-xs text-[var(--text-secondary)]">{email ? `Signed in as ${email}` : cloudAvailable ? 'Sign in to sync this local library across devices.' : 'Your progress is safely stored on this device. Cloud credentials can be connected at deployment.'}</p></div></div>
      {cloudAvailable && !email && <Link href="/sign-in" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-xs font-bold text-[var(--bg-primary)]"><LogIn className="h-3.5 w-3.5" />Sign in</Link>}
      {email && <form onSubmit={save} className="flex w-full max-w-sm flex-col gap-2"><div className="flex gap-2"><input aria-label="Public handle" value={handle} onChange={event => setHandle(event.target.value)} placeholder="public_handle" className="min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--bg-secondary)] px-3 py-2 text-xs" /><button className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-bold">Save</button></div><label className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]"><input type="checkbox" checked={leaderboardEnabled} onChange={event => setLeaderboardEnabled(event.target.checked)} className="accent-[var(--color-accent)]" />Publish verified test and arcade scores under this handle</label>{message && <span className="text-[10px] text-[var(--color-accent)]">{message}</span>}</form>}
    </section>
  );
}
