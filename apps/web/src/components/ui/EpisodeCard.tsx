import type { ReactNode } from 'react';
import type { Episode } from '@/design/types';
import { Cover } from './Cover';
import { PlayBokeh } from './FullPlayer';
import { IconPause, IconPlay } from './Icons';

export function EpisodeCard({
  episode,
  playing,
  onToggle,
  onScrub,
  controls,
}: {
  episode: Episode;
  playing?: boolean;
  onToggle?: () => void;
  onScrub?: (ratio: number) => void;
  controls?: ReactNode;
}) {
  const max = Math.max(episode.durationMin * 60, 1);
  const value = Math.round(episode.progress * max);
  return (
    <article className="episode">
      <PlayBokeh />
      <div key={episode.id} className="story-face">
        <Cover name={episode.siteName} size="lg" />
        <p className="source">{episode.siteName}</p>
        <h2>{episode.title}</h2>
      </div>
      <input
        className="scrub"
        type="range"
        min={0}
        max={max}
        value={value}
        aria-label="Position"
        onChange={(e) => onScrub?.(Number(e.target.value) / max)}
      />
      <div className="times">
        <span>{episode.elapsedLabel || '0:00'}</span>
        <span>{episode.durationMin}:00</span>
      </div>
      <button type="button" className="play" onClick={onToggle} aria-label={playing ? 'Pause' : 'Play'}>
        {playing ? <IconPause /> : <IconPlay />}
      </button>
      {controls}
    </article>
  );
}
