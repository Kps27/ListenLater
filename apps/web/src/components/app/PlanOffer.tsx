'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiBase, formatMoney } from '@/lib/site';
import { countryCode } from '@/lib/country';

type Interval = 'month' | 'year';
type Quote = { currency: string; month_cents: number; year_cents: number; save_percent: number; country: string };

const CARD_ERRORS: Record<string, string> = {
  card_number: 'Enter a card number with 13 to 19 digits.',
  card_exp: 'Enter an expiry that is still ahead, as MM/YY.',
  card_cvc: 'Enter the 3 or 4 digit code.',
  card_name: 'Enter the name on the card.',
  checkout_failed: 'The demo checkout did not go through. Try again.',
};

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
  const [quote, setQuote] = useState<Quote>({ currency: 'USD', month_cents: 200, year_cents: 1000, save_percent: 58, country: 'US' });
  const [interval, setInterval] = useState<Interval | null>(null);
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [exp, setExp] = useState('');
  const [cvc, setCvc] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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

  async function subscribe(e: FormEvent) {
    e.preventDefault();
    if (!interval) return;
    setError('');
    setBusy(true);
    try {
      const res = await fetch(`${apiBase()}/v1/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          email,
          interval,
          country: quote.country,
          card: { name, number, exp, cvc },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(CARD_ERRORS[(data as { error?: string }).error || ''] || CARD_ERRORS.checkout_failed);
        return;
      }
      localStorage.setItem('ll-plan', 'plus');
      onSubscribed();
    } catch {
      setError(CARD_ERRORS.checkout_failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ll offer-screen">
      <main>
        <p className="eyebrow">Signed in as {email}</p>
        <h1>How do you want to listen?</h1>
        <div className="offer-grid">
          <section className="plan-card">
            <h2>Continue with free</h2>
            <p className="price">
              {seconds}s<span> per story</span>
            </p>
            <p>Each story includes {seconds} seconds of listening. The next story starts its own {seconds} seconds. The piece stays in your queue.</p>
            <button type="button" className="primary" onClick={onFree}>
              Continue with free
            </button>
          </section>
          <section className="plan-card plus">
            <h2>Subscribe now</h2>
            <p className="fine">Prices for {quote.country}. A year saves {quote.save_percent}%.</p>
            <div className="bill-toggle" role="group" aria-label="Billing period">
              <button type="button" aria-pressed={interval === 'month'} onClick={() => setInterval('month')}>
                {month} a month
              </button>
              <button type="button" aria-pressed={interval === 'year'} onClick={() => setInterval('year')}>
                {year} a year · save {quote.save_percent}%
              </button>
            </div>
            {interval ? (
              <form className="stack-form" onSubmit={subscribe}>
                <p className="fine">Nothing is charged. Use 4242 4242 4242 4242, any future expiry, and any 3-digit code.</p>
                <label>
                  Name on card
                  <input className="field" required autoComplete="cc-name" value={name} onChange={(e) => setName(e.target.value)} />
                </label>
                <label>
                  Card number
                  <input className="field" inputMode="numeric" autoComplete="cc-number" placeholder="4242 4242 4242 4242" value={number} onChange={(e) => setNumber(e.target.value)} />
                </label>
                <div className="card-row">
                  <label>
                    Expiry
                    <input className="field" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/YY" value={exp} onChange={(e) => setExp(e.target.value)} />
                  </label>
                  <label>
                    CVC
                    <input className="field" inputMode="numeric" autoComplete="cc-csc" placeholder="123" value={cvc} onChange={(e) => setCvc(e.target.value)} />
                  </label>
                </div>
                {error ? <p className="form-error">{error}</p> : null}
                <button type="submit" className="primary" disabled={busy}>
                  {busy ? 'Checking…' : `Subscribe · ${due}`}
                </button>
              </form>
            ) : (
              <p>Pick a month or a year. Plus removes the {seconds}-second limit on every story.</p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
