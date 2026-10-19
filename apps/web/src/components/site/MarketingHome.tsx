'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Cover } from '@/components/ui/Cover';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { DEFAULT_SITE, fetchSite, formatMoney, type SiteConfig } from '@/lib/site';

export function MarketingHome() {
  const [site, setSite] = useState<SiteConfig>(DEFAULT_SITE);

  useEffect(() => {
    fetchSite().then(setSite);
  }, []);

  const month = formatMoney(site.prices.month_cents, site.prices.currency);
  const year = formatMoney(site.prices.year_cents, site.prices.currency);
  const minute = Math.round(site.free_listen_seconds / 60);

  return (
    <div className="ll market">
      <SiteHeader />
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">A personal podcast of the things you saved</p>
            <h1>{site.hero_title}</h1>
            <p className="lede">{site.hero_lede}</p>
            <div className="hero-actions">
              <Link href="/app" className="primary">
                Start listening
              </Link>
              <Link href="/pricing" className="ghost">
                {month} a month
              </Link>
            </div>
            <p className="fine">
              Free accounts listen for {site.free_listen_seconds} seconds of each story. Plus is {month} a month, or {year} a year.
            </p>
          </div>
          <article className="ticket" aria-label="A sample episode">
            <Cover name="The Atlantic" size="lg" />
            <p className="ticket-kicker">Now playing</p>
            <h2>Why the night commute got longer</h2>
            <p className="ticket-line">
              <mark>The city kept the lights on</mark> longer than anyone had planned.
            </p>
            <div className="wave" aria-hidden="true">
              {Array.from({ length: 18 }, (_, i) => (
                <span key={i} style={{ animationDelay: `${i * 70}ms` }} />
              ))}
            </div>
            <p className="ticket-meta">0:42 of {minute === 1 ? '1:00 free' : `${site.free_listen_seconds}s free`}</p>
          </article>
        </section>

        <section className="band" aria-label="What you can do">
          <div>
            <strong>Add freely</strong>
            <p>Links, pasted text, and forwarded newsletters all land in the queue.</p>
          </div>
          <div>
            <strong>{site.free_listen_seconds} seconds per story</strong>
            <p>Listen before you pay. Each story has its own {site.free_listen_seconds} seconds, and it stays saved when they end.</p>
          </div>
          <div>
            <strong>
              {month} or {year}
            </strong>
            <p>A month, or a year. Unlimited listening after that.</p>
          </div>
        </section>

        <section className="steps">
          <article>
            <span>01</span>
            <h2>Save it like a bookmark</h2>
            <p>Paste a link, share from another app, or forward a newsletter to your save address. The page becomes an episode with a cover.</p>
          </article>
          <article>
            <span>02</span>
            <h2>Press play</h2>
            <p>Your device reads it. Speed, voice, and a sleep timer sit on the episode, the way they would on a podcast.</p>
          </article>
          <article>
            <span>03</span>
            <h2>Read along when you want</h2>
            <p>The sentence you are hearing is marked. Tap any line to jump. The queue remembers where you stopped.</p>
          </article>
        </section>

        <section className="plans-tease">
          <div>
            <h2>Free, then two dollars.</h2>
            <p>Keep adding. Each story includes {site.free_listen_seconds} seconds on the free plan. Plus keeps going.</p>
          </div>
          <Link href="/pricing" className="primary">
            See plans
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
