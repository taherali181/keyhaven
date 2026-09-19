'use client';

import React from 'react';
import { Check } from 'lucide-react';

/** The first part of a long title ("Emma; or, ..." → "Emma"). */
export const shortTitle = (title: string) => title.split(/[;:]\s/)[0];

/** A stable, well-spread cover hue per title (FNV-1a). */
export const hueFor = (seed: string) => {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index++) hash = Math.imul(hash ^ seed.charCodeAt(index), 16777619);
  return (hash >>> 0) % 360;
};

export function BookCover({ title, author, large = false }: { title: string; author: string; large?: boolean }) {
  return <span className={`book-cover ${large ? 'is-large' : ''}`} style={{ '--cover-hue': hueFor(`${title}${author}`) } as React.CSSProperties} aria-hidden="true">
    <span className="book-cover-title">{shortTitle(title)}</span>
    <span className="book-cover-author">{author}</span>
  </span>;
}

export function ProgressRing({ percent, finished }: { percent: number; finished?: boolean }) {
  return <span className={`library-ring ${finished ? 'is-finished' : ''}`} style={{ '--p': `${finished ? 100 : percent}%` } as React.CSSProperties} aria-label={finished ? 'Finished' : `${percent}% read`}>
    {finished ? <Check aria-hidden="true" /> : <span aria-hidden="true">{percent}</span>}
  </span>;
}

export function EmptyState({ icon, title, children }: { icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  return <div className="library-empty">{icon}<p><strong>{title}</strong></p>{children}</div>;
}
