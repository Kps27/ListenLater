import type { Episode } from '@/design/types';
import { Cover } from './Cover';
import { IconPause, IconPlay } from './Icons';

export function MiniPlayer({
  episode,
  playing,
  onToggle,
  onExpand,
}: {
  episode: Episode;
  playing?: boolean;
  onToggle?: () => void;
  onExpand?: () => void;
}) {
  return (
    <div className="mini">
      <div key={episode.id} className="story-face story-face-mini">
        <Cover name={episode.siteName} size="sm" />
      </div>
      <button type="button" className="mini-copy" onClick={onExpand} aria-label="Open player">
        <span key={episode.id} className="t story-line">{episode.title}</span>
        <span className="mini-bar" aria-hidden="true">
          <i style={{ width: `${Math.round(episode.progress * 100)}%` }} />
        </span>
      </button>
      <button type="button" className="play-sm" onClick={onToggle} aria-label={playing ? 'Pause' : 'Play'}>
        {playing ? <IconPause /> : <IconPlay />}
      </button>
    </div>
  );
}
