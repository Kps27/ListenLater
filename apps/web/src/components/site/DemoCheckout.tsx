'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiBase, fetchSite, formatMoney } from '@/lib/site';

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

export function DemoCheckout({
  open,
  onClose,
  email,
  onEmailChange,
  emailEditable = true,
  interval,
  due,
  country,
  onPaid,
  confirm = false,
}: {
  open: boolean;
  onClose: () => void;
  email: string;
  onEmailChange?: (value: string) => void;
  emailEditable?: boolean;
  interval: Interval;
  due: string;
  country?: string;
  onPaid: (result: { email: string; last4: string; provider: string; amount: string }) => void;
  confirm?: boolean;
}) {
  const [providerName, setProviderName] = useState('Stripe');
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [exp, setExp] = useState('');
  const [cvc, setCvc] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ email: string; last4: string; provider: string; amount: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    fetchSite()
      .then((site) => setProviderName(site.payment.provider === 'razorpay' ? 'Razorpay' : 'Stripe'))
      .catch(() => undefined);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setError('');
      setBusy(false);
      setDone(null);
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch(`${apiBase()}/v1/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          email,
          interval,
          country,
          card: { name, number, exp, cvc },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(CARD_ERRORS[(data as { error?: string }).error || ''] || CARD_ERRORS.checkout_failed);
        return;
      }
      const result = {
        email: email.trim().toLowerCase(),
        last4: String((data as { last4?: string }).last4 || ''),
        provider: (data as { provider?: string }).provider === 'razorpay' ? 'Razorpay' : 'Stripe',
        amount: formatMoney((data as { amount_cents?: number }).amount_cents || 0, (data as { currency?: string }).currency || 'USD'),
      };
      onPaid(result);
      if (confirm) setDone(result);
    } catch {
      setError(CARD_ERRORS.checkout_failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pay-layer">
      <button type="button" className="pay-scrim" aria-label="Close checkout" onClick={onClose} />
      <form className="card-form pay-card" role="dialog" aria-modal="true" aria-labelledby="demo-card-title" onSubmit={submit}>
        <div className="pay-head">
          <h2 id="demo-card-title">Demo card</h2>
          <button type="button" className="ghost pay-close" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="fine">
          Nothing is charged. {providerName} is the provider selected in admin. Use 4242 4242 4242 4242, any future expiry, and any 3-digit code.
        </p>
        <p className="fine">
          {interval === 'year' ? 'Yearly' : 'Monthly'} · {due}
        </p>
        {done ? (
          <div className="card-done" role="status">
            <p>
              Plus is on for {done.email}. {done.provider} would have billed {done.amount}. Card ending {done.last4} was not charged.
            </p>
            <a className="primary" href="/app">
              Continue listening
            </a>
          </div>
        ) : (
          <>
            {emailEditable ? (
              <label>
                Email
                <input className="field" type="email" required autoComplete="email" value={email} onChange={(e) => onEmailChange?.(e.target.value)} />
              </label>
            ) : (
              <p className="fine">{email}</p>
            )}
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
              {busy ? 'Checking…' : `Pay ${due}`}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
