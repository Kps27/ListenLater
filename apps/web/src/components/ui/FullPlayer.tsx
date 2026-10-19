import { useState } from 'react';
import type { Episode } from '@/design/types';
import { Cover } from './Cover';
import { IconPause, IconPlay } from './Icons';
import { SentenceHighlighter } from './SentenceHighlighter';

export type VoiceOption = { id: string; label: string };

const ORBS = [
  { left: '-20%', top: '-8%', size: 300, color: '#2E2870', dx: '180px', dy: '120px', dur: '8s', delay: '0s' },
  { left: '55%', top: '-12%', size: 320, color: '#3A3078', dx: '-200px', dy: '140px', dur: '11s', delay: '-3s' },
  { left: '10%', top: '30%', size: 240, color: '#243460', dx: '150px', dy: '-90px', dur: '9s', delay: '-5s' },
  { left: '60%', top: '38%', size: 280, color: '#3C2E68', dx: '-160px', dy: '110px', dur: '10s', delay: '-2s' },
  { left: '-8%', top: '58%', size: 260, color: '#2A2458', dx: '170px', dy: '-70px', dur: '12s', delay: '-7s' },
  { left: '42%', top: '64%', size: 300, color: '#2C3A62', dx: '-130px', dy: '-120px', dur: '9s', delay: '-4s' },
];

function PlayBokeh() {
  return (
    <span className="play-bokeh" aria-hidden="true">
      <span className="play-sheen" />
      {ORBS.map((orb) => (
        <span
          key={`${orb.left}-${orb.top}`}
          className="play-orb"
          style={{
            left: orb.left,
            top: orb.top,
            width: orb.size,
            height: orb.size,
            background: orb.color,
            ['--dx' as string]: orb.dx,
            ['--dy' as string]: orb.dy,
            ['--dur' as string]: orb.dur,
            animationDelay: orb.delay,
          }}
        />
      ))}
    </span>
  );
}

export function FullPlayer({
  episode,
  playing,
  showText,
  sentences,
  paragraphs,
  sentenceIndex,
  onToggle,
  onBack,
  onForward,
  onToggleText,
  onJump,
  speedLabel,
  voiceLabel,
  voices,
  voiceId,
  sleepLabel,
  onSpeed,
  onPickVoice,
  onSleep,
  onScrub,
}: {
  episode: Episode;
  playing?: boolean;
  showText?: boolean;
  sentences?: string[];
  paragraphs?: string[][];
  sentenceIndex?: number;
  onToggle?: () => void;
  onBack?: () => void;
  onForward?: () => void;
  onToggleText?: () => void;
  onJump?: (i: number) => void;
  speedLabel?: string;
  voiceLabel?: string;
  voices?: VoiceOption[];
  voiceId?: string;
  sleepLabel?: string;
  onSpeed?: () => void;
  onPickVoice?: (id: string) => void;
  onSleep?: () => void;
  onScrub?: (ratio: number) => void;
}) {
  const [voicesOpen, setVoicesOpen] = useState(false);
  const max = Math.max(episode.durationMin * 60, 1);
  const value = Math.round(episode.progress * max);
  return (
    <section className={playing ? 'player is-live' : 'player'} aria-label="Now playing">
      <PlayBokeh />
      <div key={episode.id} className="story-face">
        {showText && sentences ? (
          <SentenceHighlighter sentences={sentences} paragraphs={paragraphs} index={sentenceIndex ?? 0} onJump={onJump} />
        ) : (
          <Cover name={episode.siteName} size="lg" />
        )}
        <div>
          <h2>{episode.title}</h2>
          <p className="sub">
            {episode.siteName} · {episode.durationMin} min
          </p>
        </div>
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
      <div className="transport">
        <button type="button" className="ghost" onClick={onBack} aria-label="Back 30 seconds">
          −30
        </button>
        <button type="button" className="play" onClick={onToggle} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? <IconPause /> : <IconPlay />}
        </button>
        <button type="button" className="ghost" onClick={onForward} aria-label="Forward 15 seconds">
          +15
        </button>
      </div>
      <div className="row-controls">
        <button type="button" className="ghost" onClick={onSpeed}>{speedLabel || '1.2×'}</button>
        <div className="voice-picker">
          <button
            type="button"
            className="ghost"
            aria-expanded={voicesOpen}
            aria-haspopup="listbox"
            onClick={() => setVoicesOpen((open) => !open)}
          >
            {voiceLabel || 'Voice'}
          </button>
          {voicesOpen && voices?.length ? (
            <ul className="voice-menu" role="listbox" aria-label="Voices">
              {voices.map((voice) => (
                <li key={voice.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={voice.id === voiceId}
                    onClick={() => {
                      onPickVoice?.(voice.id);
                      setVoicesOpen(false);
                    }}
                  >
                    {voice.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <button type="button" className="ghost" onClick={onSleep}>{sleepLabel || 'Sleep'}</button>
      </div>
      {onToggleText ? (
        <button type="button" className="read-peek" onClick={onToggleText}>
          {showText ? 'Show cover' : 'Read along'}
        </button>
      ) : null}
    </section>
  );
}
