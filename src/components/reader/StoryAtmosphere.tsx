import type { CSSProperties } from 'react';

// Deterministic "random" values so server and client render the same motes.
const MOTES = Array.from({ length: 22 }, (_, i) => ({
  '--x': `${(i * 37 + 11) % 100}%`,
  '--s': `${2 + ((i * 7) % 4)}px`,
  '--d': `${22 + ((i * 13) % 18)}s`,
  '--delay': `-${(i * 5.3) % 30}s`,
  '--dx': `${((i * 29) % 80) - 40}px`,
  '--o': `${0.25 + ((i * 11) % 5) / 10}`
}) as CSSProperties);

/** Aurora light, floating motes and a soft vignette behind the story reader. */
export function StoryAtmosphere({ withScenery }: { withScenery: boolean }) {
  return (
    <div className={`story-atmosphere ${withScenery ? 'has-scenery' : ''}`} aria-hidden="true">
      <span className="story-aurora a" />
      <span className="story-aurora b" />
      <span className="story-aurora c" />
      <span className="story-motes">{MOTES.map((style, i) => <i key={i} style={style} />)}</span>
      <span className="story-vignette" />
    </div>
  );
}
