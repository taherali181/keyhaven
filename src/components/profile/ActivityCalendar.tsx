'use client';

import React, { useEffect, useRef } from 'react';
import { formatMinutes, type CalendarCell } from '@/lib/profile-stats';

const WEEKDAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

function describe(cell: CalendarCell) {
  const date = new Date(cell.start).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  if (cell.minutes <= 0) return `${date}: no activity`;
  return `${date}: ${formatMinutes(cell.typingMinutes)} typing, ${formatMinutes(cell.readingMinutes)} reading`;
}

/** Practice and reading by day, like a contribution graph. Scrolls sideways on narrow screens. */
export function ActivityCalendar({ weeks }: { weeks: CalendarCell[][] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // On narrow screens the graph scrolls; start at the newest weeks rather than the oldest.
  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollLeft = node.scrollWidth;
  }, [weeks.length]);
  const months = weeks.map((week, index) => {
    const month = new Date(week[0].start).getMonth();
    const previous = index > 0 ? new Date(weeks[index - 1][0].start).getMonth() : -1;
    return month !== previous ? new Date(week[0].start).toLocaleDateString(undefined, { month: 'short' }) : '';
  });

  return <div ref={scrollRef} className="profile-calendar-scroll">
    <div className="profile-calendar">
      <div className="profile-calendar-months" aria-hidden="true">{months.map((label, index) => <span key={index}>{label}</span>)}</div>
      <div className="profile-calendar-days" aria-hidden="true">{WEEKDAY_LABELS.map((label, index) => <span key={index}>{label}</span>)}</div>
      <div className="profile-calendar-grid" role="list" aria-label={`Activity over the last ${weeks.length} weeks`}>
        {weeks.flat().map(cell => cell.future
          ? <span key={cell.day} className="profile-calendar-cell" data-level="future" aria-hidden="true" />
          : <span key={cell.day} role="listitem" className="profile-calendar-cell" data-level={cell.level} aria-label={describe(cell)} title={describe(cell)} />)}
      </div>
    </div>
    <div className="profile-calendar-legend" aria-hidden="true"><span>Less</span>{[0, 1, 2, 3, 4].map(level => <i key={level} data-level={level} />)}<span>More</span></div>
  </div>;
}
