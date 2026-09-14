import type { CSSProperties } from 'react';

// Deterministic "random" values so server and client render the same motes.
const MOTES = Array.from({ length: 12 }, (_, i) => ({
  '--x': `${(i * 37 + 11) % 100}%`,
  '--s': `${2 + ((i * 7) % 3)}px`,
  '--d': `${26 + ((i * 13) % 18)}s`,
  '--delay': `-${(i * 5.3) % 30}s`,
  '--dx': `${((i * 29) % 80) - 40}px`,
  '--o': `${0.25 + ((i * 11) % 5) / 10}`
}) as CSSProperties);

/** Static aurora light and a vignette behind the reader; floating motes only when Background motion is on. */
export function StoryAtmosphere({ withScenery, motion = false }: { withScenery: boolean; motion?: boolean }) {
  return (
    <div className={`story-atmosphere ${withScenery ? 'has-scenery' : ''}`} aria-hidden="true">
      {motion && <span className="story-motes">{MOTES.map((style, i) => <i key={i} style={style} />)}</span>}
      <span className="story-vignette" />
    </div>
  );
}
