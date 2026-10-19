import { CoverPlate } from '@/design/cover-library';
import { initials } from '@/design/types';

export function Cover({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`cover cover-${size}`} aria-hidden="true">
      <CoverPlate name={name} />
      <span className="cover-initials">{initials(name)}</span>
    </span>
  );
}

export function ProgressCover({ name, progress }: { name: string; progress: number }) {
  const p = Math.min(1, Math.max(0, progress));
  const c = 2 * Math.PI * 21;
  return (
    <span className="progress-ring" aria-hidden="true">
      <svg viewBox="0 0 48 48">
        <circle className="track" cx="24" cy="24" r="21" />
        <circle
          className="prog"
          cx="24"
          cy="24"
          r="21"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
        />
      </svg>
      <Cover name={name} size="sm" />
    </span>
  );
}
