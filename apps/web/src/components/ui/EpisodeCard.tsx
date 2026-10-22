import type { ReactNode } from 'react';
import type { Episode } from '@/design/types';
import { Cover } from './Cover';
import { PlayBokeh } from './FullPlayer';
import { IconPause, IconPlay } from './Icons';

export function EpisodeCard({
  episode,
  playing,
  onToggle,
  controls,
}: {
  episode: Episode;
  playing?: boolean;
  onToggle?: () => void;
  controls?: ReactNode;
}) {
  return (
    <article className="episode">
      <PlayBokeh />
      <div key={episode.id} className="story-face">
        <Cover name={episode.siteName} size="lg" />
        <p className="source">{episode.siteName}</p>
        <h2>{episode.title}</h2>
      </div>
      <button type="button" className="play" onClick={onToggle} aria-label={playing ? 'Pause' : 'Play'}>
        {playing ? <IconPause /> : <IconPlay />}
      </button>
      <p className="meta">
        {episode.durationMin} min
        {episode.elapsedLabel ? ` · ${episode.elapsedLabel} in` : ''}
      </p>
      {controls}
    </article>
  );
}
