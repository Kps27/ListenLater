'use client';

import { useEffect, useState } from 'react';
import { DemoCheckout } from '@/components/site/DemoCheckout';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { countryCode } from '@/lib/country';
import { DEFAULT_SITE, apiBase, fetchSite, formatMoney, type SiteConfig } from '@/lib/site';

type Interval = 'month' | 'year';

export function PricingScreen() {
  const [site, setSite] = useState<SiteConfig>(DEFAULT_SITE);
  const [interval, setInterval] = useState<Interval>('year');
  const [email, setEmail] = useState('');
  const [payOpen, setPayOpen] = useState(false);
  const [local, setLocal] = useState<{ currency: string; month_cents: number; year_cents: number; save_percent: number; country: string } | null>(null);

  useEffect(() => {
    fetchSite().then(setSite);
    const saved = localStorage.getItem('ll-email');
    if (saved) setEmail(saved);
    const country = countryCode();
    fetch(`${apiBase()}/v1/prices?country=${encodeURIComponent(country)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.currency) setLocal(data);
      })
      .catch(() => undefined);
  }, []);

  const currency = local?.currency || site.prices.currency;
  const monthCents = local?.month_cents || site.prices.month_cents;
  const yearCents = local?.year_cents || site.prices.year_cents;
  const month = formatMoney(monthCents, currency);
  const year = formatMoney(yearCents, currency);
  const save = local?.save_percent ?? Math.round((1 - yearCents / (monthCents * 12)) * 100);
  const due = interval === 'year' ? year : month;

  return (
    <div className="ll market">
      <SiteHeader />
      <main className="pricing-main">
        <header className="pricing-intro">
          <p className="eyebrow">Plus</p>
          <h1>Keep listening. {month} a month.</h1>
          <p className="lede">
            Plus continues past the free {site.free_listen_seconds} seconds of each story. {year} a year saves {save}%. Listening on Plus is capped in the terms.
          </p>
        </header>

        <div className="pricing-grid">
          <section className="plan-card plus" aria-label="Plus">
            <h2>Plus</h2>
            <div className="bill-toggle" role="group" aria-label="Billing period">
              <button type="button" aria-pressed={interval === 'month'} onClick={() => setInterval('month')}>
                {month} / month
              </button>
              <button type="button" aria-pressed={interval === 'year'} onClick={() => setInterval('year')}>
                {year} / year · save {save}%
              </button>
            </div>
            <p className="price">
              {due}
              <span>{interval === 'year' ? 'billed yearly' : 'billed monthly'}</span>
            </p>
            <ul>
              <li>Everything in Free</li>
              <li>Listening past the {site.free_listen_seconds}-second preview</li>
              <li>The same queue, on this account</li>
            </ul>
            <button type="button" className="primary plan-cta" onClick={() => setPayOpen(true)}>
              Subscribe · {due}
            </button>
          </section>

          <section className="plan-card" aria-label="Free">
            <h2>Free</h2>
            <p className="price">
              {formatMoney(0, currency)}
              <span>forever</span>
            </p>
            <ul>
              <li>Add articles, text, and newsletters</li>
              <li>{site.free_listen_seconds} seconds of each story</li>
              <li>The piece stays in your queue</li>
            </ul>
            <a className="ghost plan-cta" href="/app">
              Continue with free
            </a>
          </section>
        </div>
      </main>
      <SiteFooter />
      <DemoCheckout
        open={payOpen}
        onClose={() => setPayOpen(false)}
        email={email}
        onEmailChange={setEmail}
        interval={interval}
        due={due}
        country={local?.country}
        confirm
        onPaid={(result) => {
          localStorage.setItem('ll-plan', 'plus');
          localStorage.setItem('ll-email', result.email);
        }}
      />
    </div>
  );
}
