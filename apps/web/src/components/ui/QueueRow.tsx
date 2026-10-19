import type { Episode } from '@/design/types';
import { ProgressCover } from './Cover';

export function QueueRow({
  episode,
  meta,
  onOpen,
}: {
  episode: Episode;
  meta?: string;
  onOpen?: () => void;
}) {
  return (
    <div className="queue-line">
      <ProgressCover name={episode.siteName} progress={episode.progress} />
      <button type="button" className="queue-main" onClick={onOpen}>
        <span className="t">{episode.title}</span>
        <span className="m">{meta || `${episode.siteName} · ${episode.durationMin} min`}</span>
      </button>
      <button type="button" className="handle" aria-label={`Reorder ${episode.title}`}>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3 4.5h10M3 8h10M3 11.5h10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
