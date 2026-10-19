'use client';

import { FormEvent, useEffect, useState } from 'react';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { countryCode } from '@/lib/country';
import { DEFAULT_SITE, apiBase, fetchSite, formatMoney, type SiteConfig } from '@/lib/site';

type Interval = 'month' | 'year';

const CARD_ERRORS: Record<string, string> = {
  card_number: 'Enter a card number with 13 to 19 digits.',
  card_exp: 'Enter an expiry that is still ahead, as MM/YY.',
  card_cvc: 'Enter the 3 or 4 digit code.',
  card_name: 'Enter the name on the card.',
  invalid_email: 'Enter an email for the subscription.',
  invalid_plan: 'Choose a month or a year.',
  checkout_failed: 'The demo checkout did not go through. Try again.',
};

export function PricingScreen() {
  const [site, setSite] = useState<SiteConfig>(DEFAULT_SITE);
  const [interval, setInterval] = useState<Interval>('year');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [exp, setExp] = useState('');
  const [cvc, setCvc] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ last4: string; provider: string; amount: string } | null>(null);
  const [local, setLocal] = useState<{ currency: string; month_cents: number; year_cents: number; save_percent: number; country: string } | null>(null);

  useEffect(() => {
    fetchSite().then(setSite);
    const saved = localStorage.getItem('ll-email');
    if (saved) {
      setEmail(saved);
      const country = countryCode();
      fetch(`${apiBase()}/v1/prices?country=${encodeURIComponent(country)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.currency) setLocal(data);
        })
        .catch(() => undefined);
    }
  }, []);

  const currency = local?.currency || site.prices.currency;
  const monthCents = local?.month_cents || site.prices.month_cents;
  const yearCents = local?.year_cents || site.prices.year_cents;
  const month = formatMoney(monthCents, currency);
  const year = formatMoney(yearCents, currency);
  const save = local?.save_percent ?? Math.round((1 - yearCents / (monthCents * 12)) * 100);
  const due = interval === 'year' ? year : month;
  const providerName = site.payment.provider === 'razorpay' ? 'Razorpay' : 'Stripe';

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch(`${apiBase()}/v1/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          email,
          interval,
          country: local?.country,
          card: { name, number, exp, cvc },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(CARD_ERRORS[(data as { error?: string }).error || ''] || CARD_ERRORS.checkout_failed);
        return;
      }
      localStorage.setItem('ll-plan', 'plus');
      localStorage.setItem('ll-email', email.trim().toLowerCase());
      setDone({
        last4: String((data as { last4?: string }).last4 || ''),
        provider: (data as { provider?: string }).provider === 'razorpay' ? 'Razorpay' : 'Stripe',
        amount: formatMoney((data as { amount_cents?: number }).amount_cents || 0, (data as { currency?: string }).currency || site.prices.currency),
      });
    } catch {
      setError(CARD_ERRORS.checkout_failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ll market">
      <SiteHeader />
      <main className="pricing-main">
        <header className="pricing-intro">
          <p className="eyebrow">Plans</p>
          <h1>Add anything. Listen for {site.free_listen_seconds} seconds of each story.</h1>
          <p className="lede">
            The free plan keeps the queue. Each story includes {site.free_listen_seconds} seconds. Plus removes the limit.
          </p>
        </header>

        <div className="pricing-grid">
          <section className="plan-card" aria-label="Free">
            <h2>Free</h2>
            <p className="price">
              {formatMoney(0, site.prices.currency)}
              <span> forever</span>
            </p>
            <ul>
              <li>Add articles, text, and newsletters</li>
              <li>{site.free_listen_seconds} seconds of each story</li>
              <li>The piece stays in your queue</li>
            </ul>
          </section>

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
              <span> {interval === 'year' ? 'billed yearly' : 'billed monthly'}</span>
            </p>
            <ul>
              <li>Everything in Free</li>
              <li>Unlimited listening</li>
              <li>The same queue, on this account</li>
            </ul>
          </section>

          <form className="card-form" onSubmit={submit}>
            <h2>Demo card</h2>
            <p className="fine">
              Nothing is charged. {providerName} is the provider selected in admin
              {site.payment.provider === 'stripe' && site.payment.stripe_publishable_key ? ` (${site.payment.stripe_publishable_key})` : ''}
              {site.payment.provider === 'razorpay' && site.payment.razorpay_key_id ? ` (${site.payment.razorpay_key_id})` : ''}. Use 4242 4242 4242 4242, any future expiry, and any 3-digit code.
            </p>
            {done ? (
              <div className="card-done" role="status">
                <p>
                  Plus is on for {email}. {done.provider} would have billed {done.amount}. Card ending {done.last4} was not charged.
                </p>
                <a className="primary" href="/app">
                  Continue listening
                </a>
              </div>
            ) : (
              <>
                <label>
                  Email
                  <input className="field" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>
                <label>
                  Name on card
                  <input className="field" required autoComplete="cc-name" value={name} onChange={(e) => setName(e.target.value)} />
                </label>
                <label>
                  Card number
                  <input
                    className="field"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder="4242 4242 4242 4242"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                  />
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
                  {busy ? 'Checking…' : `Start Plus · ${due}`}
                </button>
              </>
            )}
          </form>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
