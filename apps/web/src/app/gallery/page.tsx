'use client';

import { useEffect, useState } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { EpisodeCard } from '@/components/ui/EpisodeCard';
import { FullPlayer } from '@/components/ui/FullPlayer';
import { InboxItem } from '@/components/ui/InboxItem';
import { MiniPlayer } from '@/components/ui/MiniPlayer';
import { QueueRow } from '@/components/ui/QueueRow';
import { SentenceHighlighter } from '@/components/ui/SentenceHighlighter';
import { Toast } from '@/components/ui/Toast';
import type { Episode } from '@/design/types';
import { formatQueued } from '@/design/types';

const NOW: Episode = {
  id: '1',
  title: 'Why the night commute got longer',
  siteName: 'The Atlantic',
  durationMin: 12,
  progress: 0.34,
  elapsedLabel: '4:10',
};

const QUEUE: Episode[] = [
  { id: '2', title: 'Markets opened quietly, then did not', siteName: 'WSJ', durationMin: 18, progress: 0 },
  { id: '3', title: 'The city kept the lights on', siteName: 'NYT', durationMin: 9, progress: 0.4 },
  { id: '4', title: 'Sunday reads for a long train', siteName: 'Substack', durationMin: 22, progress: 0 },
];

const SENTENCES = [
  'The city kept the lights on.',
  'This is the sentence you hear.',
  'The next one waits its turn.',
];

export default function GalleryPage() {
  const [playing, setPlaying] = useState(false);
  const [text, setText] = useState(false);
  const [index, setIndex] = useState(1);
  const [toast, setToast] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  function setMode(next: 'light' | 'dark') {
    setTheme(next);
    document.documentElement.dataset.theme = next;
  }

  useEffect(() => {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setMode(dark ? 'dark' : 'light');
  }, []);

  const queued = QUEUE.reduce((s, e) => s + e.durationMin, 0);

  return (
    <div className="ll">
      <main className="gallery">
        <header>
          <div>
            <h1>Listen Later</h1>
            <p className="lede">
              Component gallery. Covers come from a fixed art library. Violet is for play and the sentence being heard.
            </p>
          </div>
          <div className="row-controls">
            <button type="button" className="ghost" onClick={() => setMode('light')} aria-pressed={theme === 'light'}>
              Light
            </button>
            <button type="button" className="ghost" onClick={() => setMode('dark')} aria-pressed={theme === 'dark'}>
              Dark
            </button>
          </div>
        </header>

        <section className="specimen">
          <h2>Composed listen</h2>
          <div className="phone">
            <EpisodeCard episode={NOW} playing={playing} onToggle={() => setPlaying((v) => !v)} />
            <p className="m" style={{ color: 'var(--muted)', margin: '20px 0 8px' }}>
              Up next · {formatQueued(queued)}
            </p>
            {QUEUE.map((ep) => (
              <QueueRow key={ep.id} episode={ep} />
            ))}
            <div style={{ marginTop: 16 }}>
              <MiniPlayer episode={NOW} playing={playing} onToggle={() => setPlaying((v) => !v)} />
            </div>
          </div>
        </section>

        <section className="specimen">
          <h2>Full player</h2>
          <div style={{ maxWidth: 420 }}>
            <FullPlayer
              episode={NOW}
              playing={playing}
              showText={text}
              sentences={SENTENCES}
              sentenceIndex={index}
              onToggle={() => setPlaying((v) => !v)}
              onToggleText={() => setText((v) => !v)}
              onJump={setIndex}
            />
          </div>
        </section>

        <section className="specimen">
          <h2>Sentence highlighter</h2>
          <SentenceHighlighter sentences={SENTENCES} index={index} onJump={setIndex} />
        </section>

        <section className="specimen">
          <h2>Inbox</h2>
          <div className="stack">
            <InboxItem
              tone="warn"
              title="This page needs you signed in"
              body="Sites like LinkedIn block automatic readers. Open the page in your browser, then share or paste the text here."
              actions={[{ label: 'Open in browser' }, { label: 'Paste the text' }]}
            />
            <InboxItem
              title="Sunday reads"
              body="4 links from an unknown sender."
              actions={[{ label: 'Keep all' }, { label: 'Dismiss' }]}
            />
            <InboxItem arriving title="The Atlantic" body="Preparing for listening." />
          </div>
        </section>

        <section className="specimen">
          <h2>Empty state</h2>
          <EmptyState
            title="Nothing queued"
            body="Add something to hear. It will wait in Up Next."
            action={{ label: 'Add something to hear', onClick: () => setToast('Add opens from here') }}
          />
        </section>

        <section className="specimen">
          <h2>Toast</h2>
          <button type="button" className="ghost" onClick={() => setToast('Saved to Up Next')}>
            Show toast
          </button>
          {toast ? (
            <div style={{ marginTop: 16 }}>
              <Toast message={toast} />
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
