'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const SLIDES = [
  {
    kicker: 'Listen Later',
    title: 'Hear what you meant to read.',
    body: 'Save an article, a newsletter, or a page. It becomes an episode, and the words stay in step with the voice.',
  },
  {
    kicker: 'Save',
    title: 'Save it like a bookmark.',
    body: 'Paste a link, or paste the article itself when a page will not open. It joins your queue.',
  },
  {
    kicker: 'Play',
    title: 'Press play.',
    body: 'Your phone reads it. Speed sits on the episode. The sentence you are hearing is marked.',
  },
  {
    kicker: 'Plus',
    title: 'Free, then one dollar.',
    body: 'Each story includes 60 seconds on the free plan. Plus is $1 a month, or $10 a year. Listening on Plus is capped in the terms.',
  },
];

export function PhoneIntro() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (window.innerWidth > 767) return;
    if (localStorage.getItem('ll-phone-intro') || localStorage.getItem('ll-email')) return;
    setOpen(true);
  }, []);

  if (!open) return null;
  const slide = SLIDES[step];
  const last = step === SLIDES.length - 1;

  function finish(start: boolean) {
    localStorage.setItem('ll-phone-intro', '1');
    setOpen(false);
    if (start && !window.location.pathname.startsWith('/app')) router.push('/app');
  }

  return (
    <div className="phone-intro" role="dialog" aria-modal="true" aria-labelledby="phone-intro-title">
      <p className="eyebrow">{slide.kicker}</p>
      <h1 id="phone-intro-title">{slide.title}</h1>
      <p className="lede">{slide.body}</p>
      <div className="onboard-dots" aria-hidden="true">
        {SLIDES.map((item, index) => (
          <button key={item.title} type="button" aria-label={item.title} aria-current={index === step ? 'step' : undefined} onClick={() => setStep(index)} />
        ))}
      </div>
      <div className="onboard-actions">
        <button type="button" className="primary" onClick={() => (last ? finish(true) : setStep((n) => n + 1))}>
          {last ? 'Start listening' : 'Next'}
        </button>
        {last ? null : (
          <button type="button" className="ghost" onClick={() => finish(false)}>
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
