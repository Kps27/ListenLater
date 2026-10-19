'use client';

import { useState } from 'react';

const STEPS = [
  {
    title: 'Add a story',
    body: 'This is Add. Paste a link, or paste the article itself when a page will not open. It joins your Listen list.',
    place: 'right',
  },
  {
    title: 'Press play',
    body: 'This is the player. Press play. The sentence you are hearing is marked, and you can tap a line to jump.',
    place: 'left',
  },
  {
    title: 'Free, then Plus',
    body: '',
    place: 'right',
  },
] as const;

export function Onboarding({ seconds, onDone, onStep }: { seconds: number; onDone: () => void; onStep: (index: number) => void }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const body = step === 2
    ? `Each story includes ${seconds} seconds on the free plan. Plus continues past that preview. Use on Plus is capped in the terms.`
    : current.body;

  function go(next: number) {
    setStep(next);
    onStep(next);
  }

  return (
    <div className={`tour-card tour-${current.place}`} role="dialog" aria-modal="false" aria-labelledby="tour-title">
      <p className="eyebrow">How it works</p>
      <h2 id="tour-title">{current.title}</h2>
      <p className="lede">{body}</p>
      <div className="onboard-dots" role="tablist" aria-label="Onboarding steps">
        {STEPS.map((item, index) => (
          <button key={item.title} type="button" aria-label={item.title} aria-current={index === step ? 'step' : undefined} onClick={() => go(index)} />
        ))}
      </div>
      <div className="onboard-actions">
        <button type="button" className="primary" onClick={() => (step === STEPS.length - 1 ? onDone() : go(step + 1))}>
          Next
        </button>
        <button type="button" className="ghost" onClick={onDone}>
          Skip
        </button>
      </div>
    </div>
  );
}
