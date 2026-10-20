'use client';

import { useState } from 'react';

const STEPS = [
  {
    title: 'Your library starts empty.',
    body: 'Nothing is waiting here. Add the first story when you are ready.',
  },
  {
    title: 'Add a story.',
    body: 'Paste a link, or paste the article itself when a page will not open. It joins Listen.',
  },
  {
    title: 'Press play.',
    body: 'The sentence you are hearing is marked. Tap a line to jump.',
  },
] as const;

export function Onboarding({
  seconds,
  month,
  year,
  onDone,
}: {
  seconds: number;
  month: string;
  year: string;
  onDone: () => void;
}) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const last = step === STEPS.length - 1;
  const body = last
    ? `${current.body} Each story includes ${seconds} seconds on the free plan. Plus is ${month} a month, or ${year} a year.`
    : current.body;

  return (
    <main className="welcome-screen">
      <p className="eyebrow">Welcome</p>
      <h1>{current.title}</h1>
      <p className="lede">{body}</p>
      <div className="onboard-dots" role="tablist" aria-label="Onboarding steps">
        {STEPS.map((item, index) => (
          <button key={item.title} type="button" aria-label={item.title} aria-current={index === step ? 'step' : undefined} onClick={() => setStep(index)} />
        ))}
      </div>
      <div className="onboard-actions">
        <button type="button" className="primary" onClick={() => (last ? onDone() : setStep((n) => n + 1))}>
          {last ? 'Start listening' : 'Next'}
        </button>
        <button type="button" className="ghost" onClick={onDone}>
          Skip
        </button>
      </div>
    </main>
  );
}
