'use client';

import React from 'react';

export function Card({ id, title, eyebrow, actions, className = '', children }: { id: string; title: string; eyebrow?: string; actions?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return <section className={`profile-card ${className}`} aria-labelledby={id}>
    <header className="profile-card-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 id={id}>{title}</h2>
      </div>
      {actions && <div className="profile-card-actions">{actions}</div>}
    </header>
    {children}
  </section>;
}

export function Stat({ label, value, sub, icon, accent = false }: { label: string; value: React.ReactNode; sub?: string; icon?: React.ReactNode; accent?: boolean }) {
  return <div className={`profile-stat ${accent ? 'is-accent' : ''}`}>
    <span className="profile-stat-label">{icon}{label}</span>
    <strong>{value}</strong>
    {sub && <small>{sub}</small>}
  </div>;
}

export function Empty({ icon, title, action, children }: { icon: React.ReactNode; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <div className="profile-empty">
    {icon}
    <strong>{title}</strong>
    <p>{children}</p>
    {action}
  </div>;
}

export function Meter({ value }: { value: number }) {
  return <span className="profile-meter" aria-hidden="true"><i style={{ transform: `scaleX(${Math.min(1, Math.max(0, value))})` }} /></span>;
}

/** Progress toward a daily goal in minutes. */
export function Ring({ value, goal, label }: { value: number; goal: number; label: string }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const fraction = goal > 0 ? Math.min(1, value / goal) : 0;
  return <div className="profile-ring" role="img" aria-label={`${label}: ${Math.round(value)} of ${goal} minutes today`} data-complete={fraction >= 1 || undefined}>
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <circle cx="40" cy="40" r={radius} className="profile-ring-track" />
      <circle cx="40" cy="40" r={radius} className="profile-ring-fill" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - fraction)} />
    </svg>
    <span aria-hidden="true"><strong>{Math.round(value)}</strong><small>of {goal} min</small></span>
  </div>;
}
