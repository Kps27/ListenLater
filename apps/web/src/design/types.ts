export type Episode = {
  id: string;
  title: string;
  siteName: string;
  durationMin: number;
  /** 0 to 1 */
  progress: number;
  elapsedLabel?: string;
};

export function coverHue(name: string) {
  let n = 0;
  for (const c of name || 'LL') n = (n * 33 + c.charCodeAt(0)) % 360;
  return n;
}

export function initials(name: string) {
  const parts = (name || 'LL').replace(/[^A-Za-z0-9 ]/g, '').trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function formatQueued(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m} min queued`;
  if (m === 0) return `${h} h queued`;
  return `${h} h ${m} min queued`;
}
