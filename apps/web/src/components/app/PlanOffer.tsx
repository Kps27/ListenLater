'use client';

import { useEffect, useState } from 'react';
import { DemoCheckout } from '@/components/site/DemoCheckout';
import { apiBase, formatMoney } from '@/lib/site';
import { countryCode } from '@/lib/country';

type Interval = 'month' | 'year';
type Quote = { currency: string; month_cents: number; year_cents: number; save_percent: number; country: string };

export function PlanOffer({
  email,
  seconds,
  onFree,
  onSubscribed,
}: {
  email: string;
  seconds: number;
  onFree: () => void;
  onSubscribed: () => void;
}) {
  const [quote, setQuote] = useState<Quote>({ currency: 'USD', month_cents: 100, year_cents: 1000, save_percent: 17, country: 'US' });
  const [interval, setInterval] = useState<Interval | null>(null);
  const [payOpen, setPayOpen] = useState(false);

  useEffect(() => {
    const country = countryCode();
    fetch(`${apiBase()}/v1/prices?country=${encodeURIComponent(country)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Quote | null) => {
        if (data?.currency) setQuote(data);
      })
      .catch(() => undefined);
  }, []);

  const month = formatMoney(quote.month_cents, quote.currency);
  const year = formatMoney(quote.year_cents, quote.currency);
  const due = interval === 'year' ? year : month;

  return (
    <div className="ll offer-screen">
      <main>
        <p className="eyebrow">Signed in as {email}</p>
        <h1>Subscribe and keep listening.</h1>
        <p className="lede">Plus is {month} a month, or {year} a year. The free plan stops at {seconds} seconds of each story.</p>
        <div className="offer-grid">
          <section className="plan-card plus">
            <h2>Plus</h2>
            <p className="price">
              {interval === 'year' ? year : month}
              <span>{interval === 'year' ? `a year · save ${quote.save_percent}%` : `a month, or ${year} a year`}</span>
            </p>
            <div className="bill-toggle" role="group" aria-label="Billing period">
              <button type="button" aria-pressed={interval === 'month'} onClick={() => setInterval('month')}>
                {month} a month
              </button>
              <button type="button" aria-pressed={interval === 'year'} onClick={() => setInterval('year')}>
                {year} a year · save {quote.save_percent}%
              </button>
            </div>
            <p>Pick a month or a year. Plus continues past the free {seconds} seconds. Use is capped in the terms.</p>
            <button type="button" className="primary" disabled={!interval} onClick={() => setPayOpen(true)}>
              {interval ? `Subscribe · ${due}` : 'Choose Plus'}
            </button>
          </section>
          <section className="plan-card">
            <h2>Free</h2>
            <p className="price">
              {seconds}s<span> per story</span>
            </p>
            <p>Each story includes {seconds} seconds of listening. The next story starts its own {seconds} seconds. The piece stays in your queue.</p>
            <button type="button" className="ghost" onClick={onFree}>
              Continue with free
            </button>
          </section>
        </div>
      </main>
      {interval ? (
        <DemoCheckout
          open={payOpen}
          onClose={() => setPayOpen(false)}
          email={email}
          emailEditable={false}
          interval={interval}
          due={due}
          country={quote.country}
          onPaid={() => {
            localStorage.setItem('ll-plan', 'plus');
            onSubscribed();
          }}
        />
      ) : null}
    </div>
  );
}
