'use client';

import { FormEvent, useEffect, useState } from 'react';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { apiBase, formatMoney } from '@/lib/site';

type Checkout = {
  id: string;
  email: string;
  interval: string;
  provider: string;
  last4: string;
  amount_cents: number;
  currency?: string;
  status: string;
  created_at: string;
};

type RosterUser = {
  email: string;
  name: string;
  plan: string;
  stories: number;
  joined: string;
  last_sign_in: string;
};

type RosterPaid = {
  email: string;
  interval: string;
  provider: string;
  last4: string;
  amount_cents: number;
  currency: string;
  created_at: string;
};

type Roster = {
  counts: {
    signed_up: number;
    paid: number;
    free: number;
    stories: number;
    ready: number;
    preparing: number;
    failed: number;
    sessions: number;
    checkouts: number;
  };
  users: RosterUser[];
  paid: RosterPaid[];
};

const EMPTY_ROSTER: Roster = {
  counts: { signed_up: 0, paid: 0, free: 0, stories: 0, ready: 0, preparing: 0, failed: 0, sessions: 0, checkouts: 0 },
  users: [],
  paid: [],
};

function when(value: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const EMPTY_AUTH: AdminSite['auth_secrets'] = {
  google_client_id: '',
  google_client_secret: '',
  google_secret_set: false,
  apple_service_id: '',
  apple_team_id: '',
  apple_key_id: '',
  apple_private_key: '',
  apple_key_set: false,
  mail_from: '',
  mail_host: '',
  mail_user: '',
  mail_password: '',
  mail_password_set: false,
};

type AdminSite = {
  copyright: string;
  contact_email: string;
  hero_title: string;
  hero_lede: string;
  privacy: string;
  terms: string;
  socials: { x: string; instagram: string; linkedin: string; github: string };
  prices: { month_cents: number; year_cents: number; currency: string };
  free_listen_seconds: number;
  payment: { provider: 'stripe' | 'razorpay' };
  stripe_publishable_key: string;
  stripe_secret_key: string;
  stripe_secret_set: boolean;
  razorpay_key_id: string;
  razorpay_key_secret: string;
  razorpay_secret_set: boolean;
  auth_secrets: {
    google_client_id: string;
    google_client_secret: string;
    google_secret_set: boolean;
    apple_service_id: string;
    apple_team_id: string;
    apple_key_id: string;
    apple_private_key: string;
    apple_key_set: boolean;
    mail_from: string;
    mail_host: string;
    mail_user: string;
    mail_password: string;
    mail_password_set: boolean;
  };
  recent_checkouts: Checkout[];
  roster?: Roster;
};

function AdminRoster({ site }: { site: AdminSite }) {
  const roster = site.roster || EMPTY_ROSTER;
  const { counts } = roster;
  const money = site.prices.currency || 'USD';
  return (
    <div className="admin-people">
      <div className="admin-stats">
        <p className="admin-stat"><b>{counts.signed_up}</b><span>Signed up</span></p>
        <p className="admin-stat"><b>{counts.paid}</b><span>Paid</span></p>
        <p className="admin-stat"><b>{counts.free}</b><span>Free</span></p>
        <p className="admin-stat"><b>{counts.stories}</b><span>Stories</span></p>
      </div>
      <p className="admin-misc">
        <span>{counts.ready} ready</span>
        <span>{counts.preparing} preparing</span>
        <span>{counts.failed} failed</span>
        <span>{counts.sessions} sign-ins on file</span>
        <span>{counts.checkouts} checkouts</span>
      </p>

      <section className="admin-block">
        <h2>Signed up</h2>
        {roster.users.length ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Plan</th>
                <th>Stories</th>
                <th>Joined</th>
                <th>Last sign-in</th>
              </tr>
            </thead>
            <tbody>
              {roster.users.map((person) => (
                <tr key={person.email}>
                  <td>{person.email}</td>
                  <td>{person.plan === 'plus' ? 'Plus' : 'Free'}</td>
                  <td>{person.stories}</td>
                  <td>{when(person.joined)}</td>
                  <td>{when(person.last_sign_in)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="fine">No one has signed up yet.</p>
        )}
      </section>

      <section className="admin-block">
        <h2>Paid</h2>
        <p className="fine">Demo checkout marks the account Plus and does not charge the card.</p>
        {roster.paid.length ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Plan</th>
                <th>Amount</th>
                <th>Card</th>
                <th>Since</th>
              </tr>
            </thead>
            <tbody>
              {roster.paid.map((row) => (
                <tr key={row.email}>
                  <td>{row.email}</td>
                  <td>{row.interval === 'year' ? 'Year' : row.interval === 'month' ? 'Month' : 'Plus'}</td>
                  <td>{row.amount_cents ? formatMoney(row.amount_cents, row.currency || money) : '—'}</td>
                  <td>{row.last4 ? `···· ${row.last4}` : '—'}</td>
                  <td>{when(row.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="fine">No paid accounts yet.</p>
        )}
      </section>
    </div>
  );
}

export function AdminScreen() {
  const [password, setPassword] = useState('listen-later-admin');
  const [shownPassword, setShownPassword] = useState('listen-later-admin');
  const [token, setToken] = useState('');
  const [site, setSite] = useState<AdminSite | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState<'people' | 'site' | 'plans' | 'signin'>('people');

  useEffect(() => {
    fetch(`${apiBase()}/v1/admin/hint`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { password?: string; custom?: boolean } | null) => {
        if (!data || data.custom || !data.password) return;
        setShownPassword(data.password);
        setPassword(data.password);
      })
      .catch(() => undefined);
  }, []);

  async function login(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch(`${apiBase()}/v1/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError('That password did not match.');
        return;
      }
      const data = (await res.json()) as { token: string };
      setToken(data.token);
      await load(data.token);
    } catch {
      setError('The admin service is not reachable.');
    } finally {
      setBusy(false);
    }
  }

  async function load(bearer: string) {
    const res = await fetch(`${apiBase()}/v1/admin/site`, {
      headers: { Authorization: `Bearer ${bearer}` },
    });
    if (!res.ok) {
      setToken('');
      setError('The admin session expired.');
      return;
    }
    const data = (await res.json()) as AdminSite;
    data.auth_secrets = { ...EMPTY_AUTH, ...(data.auth_secrets || {}) };
    setSite(data);
  }

  function patch(partial: Partial<AdminSite>) {
    setSite((current) => (current ? { ...current, ...partial } : current));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!site) return;
    setError('');
    setSaved('');
    setBusy(true);
    try {
      const res = await fetch(`${apiBase()}/v1/admin/site`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          copyright: site.copyright,
          contact_email: site.contact_email,
          hero_title: site.hero_title,
          hero_lede: site.hero_lede,
          privacy: site.privacy,
          terms: site.terms,
          socials: site.socials,
          payment_provider: site.payment.provider,
          stripe_publishable_key: site.stripe_publishable_key,
          stripe_secret_key: site.stripe_secret_key,
          razorpay_key_id: site.razorpay_key_id,
          razorpay_key_secret: site.razorpay_key_secret,
          prices: site.prices,
          free_listen_seconds: site.free_listen_seconds,
          auth: site.auth_secrets,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error === 'invalid_url' ? 'Social links need to start with http:// or https://.' : 'The settings were not saved.');
        return;
      }
      const savedSite = data as AdminSite;
      savedSite.auth_secrets = { ...EMPTY_AUTH, ...(savedSite.auth_secrets || {}) };
      setSite(savedSite);
      setSaved('Saved. The site is using these settings.');
    } catch {
      setError('The admin service is not reachable.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ll market">
      <SiteHeader />
      <main className="admin-main">
        <p className="eyebrow">Admin</p>
        <h1>{site ? 'Admin' : 'Site settings'}</h1>
        {!site ? (
          <form className="admin-login" onSubmit={login}>
            <p className="admin-pass">
              <span>Password</span>
              <code>{shownPassword}</code>
            </p>
            <label>
              Password
              <input className="field" type="text" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" spellCheck={false} />
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <button type="submit" className="primary" disabled={busy}>
              {busy ? 'Checking…' : 'Open settings'}
            </button>
          </form>
        ) : (
          <>
          <nav className="admin-nav" aria-label="Admin sections">
            {(
              [
                ['people', 'People'],
                ['site', 'Site'],
                ['plans', 'Plans'],
                ['signin', 'Sign in'],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" aria-pressed={panel === id} onClick={() => setPanel(id)}>
                {label}
              </button>
            ))}
          </nav>
          {panel === 'people' ? <AdminRoster site={site} /> : null}
          <form className="admin-form" hidden={panel === 'people'} onSubmit={save}>
            <fieldset hidden={panel !== 'site'}>
              <legend>Marketing</legend>
              <label>
                Headline
                <input className="field" value={site.hero_title} onChange={(e) => patch({ hero_title: e.target.value })} />
              </label>
              <label>
                Intro
                <textarea className="area" value={site.hero_lede} onChange={(e) => patch({ hero_lede: e.target.value })} />
              </label>
            </fieldset>

            <fieldset hidden={panel !== 'site'}>
              <legend>Footer and legal</legend>
              <label>
                Copyright statement
                <input className="field" value={site.copyright} onChange={(e) => patch({ copyright: e.target.value })} />
              </label>
              <label>
                Contact email
                <input className="field" type="email" value={site.contact_email} onChange={(e) => patch({ contact_email: e.target.value })} />
              </label>
              <label>
                Privacy
                <textarea className="area tall" value={site.privacy} onChange={(e) => patch({ privacy: e.target.value })} />
              </label>
              <label>
                Terms
                <textarea className="area tall" value={site.terms} onChange={(e) => patch({ terms: e.target.value })} />
              </label>
            </fieldset>

            <fieldset hidden={panel !== 'site'}>
              <legend>Social links</legend>
              {(['x', 'instagram', 'linkedin', 'github'] as const).map((key) => (
                <label key={key}>
                  {key}
                  <input
                    className="field"
                    value={site.socials[key]}
                    placeholder="https://"
                    onChange={(e) => patch({ socials: { ...site.socials, [key]: e.target.value } })}
                  />
                </label>
              ))}
            </fieldset>

            <fieldset hidden={panel !== 'plans'}>
              <legend>Payment</legend>
              <div className="bill-toggle" role="group" aria-label="Payment provider">
                <button type="button" aria-pressed={site.payment.provider === 'stripe'} onClick={() => patch({ payment: { ...site.payment, provider: 'stripe' } })}>
                  Stripe
                </button>
                <button type="button" aria-pressed={site.payment.provider === 'razorpay'} onClick={() => patch({ payment: { ...site.payment, provider: 'razorpay' } })}>
                  Razorpay
                </button>
              </div>
              <p className="fine">Keys are stored for the provider you choose. Checkout on this site still uses the demo card and does not charge anyone.</p>
              <label>
                Stripe publishable key
                <input className="field" value={site.stripe_publishable_key} onChange={(e) => patch({ stripe_publishable_key: e.target.value })} />
              </label>
              <label>
                Stripe secret key {site.stripe_secret_set ? '(saved — leave blank to keep)' : ''}
                <input className="field" type="password" value={site.stripe_secret_key} autoComplete="new-password" onChange={(e) => patch({ stripe_secret_key: e.target.value })} />
              </label>
              <label>
                Razorpay key id
                <input className="field" value={site.razorpay_key_id} onChange={(e) => patch({ razorpay_key_id: e.target.value })} />
              </label>
              <label>
                Razorpay key secret {site.razorpay_secret_set ? '(saved — leave blank to keep)' : ''}
                <input className="field" type="password" value={site.razorpay_key_secret} autoComplete="new-password" onChange={(e) => patch({ razorpay_key_secret: e.target.value })} />
              </label>
            </fieldset>

            <fieldset hidden={panel !== 'signin'}>
              <legend>Sign in</legend>
              <p className="fine">
                Email codes and passwords work now. Google, Apple, and mail stay empty until you add them. Leave a secret blank to keep the one already saved. Codes are shown on the sign-in card until sending is connected.
              </p>
              <label>
                Mail from
                <input className="field" value={site.auth_secrets.mail_from} onChange={(e) => patch({ auth_secrets: { ...site.auth_secrets, mail_from: e.target.value } })} />
              </label>
              <label>
                Mail host
                <input className="field" value={site.auth_secrets.mail_host} placeholder="smtp.example.com" onChange={(e) => patch({ auth_secrets: { ...site.auth_secrets, mail_host: e.target.value } })} />
              </label>
              <label>
                Mail user
                <input className="field" value={site.auth_secrets.mail_user} onChange={(e) => patch({ auth_secrets: { ...site.auth_secrets, mail_user: e.target.value } })} />
              </label>
              <label>
                Mail password {site.auth_secrets.mail_password_set ? '(saved — leave blank to keep)' : ''}
                <input className="field" type="password" autoComplete="new-password" value={site.auth_secrets.mail_password} onChange={(e) => patch({ auth_secrets: { ...site.auth_secrets, mail_password: e.target.value } })} />
              </label>
              <label>
                Google client id
                <input className="field" value={site.auth_secrets.google_client_id} onChange={(e) => patch({ auth_secrets: { ...site.auth_secrets, google_client_id: e.target.value } })} />
              </label>
              <label>
                Google client secret {site.auth_secrets.google_secret_set ? '(saved — leave blank to keep)' : ''}
                <input className="field" type="password" autoComplete="new-password" value={site.auth_secrets.google_client_secret} onChange={(e) => patch({ auth_secrets: { ...site.auth_secrets, google_client_secret: e.target.value } })} />
              </label>
              <label>
                Apple services id
                <input className="field" value={site.auth_secrets.apple_service_id} onChange={(e) => patch({ auth_secrets: { ...site.auth_secrets, apple_service_id: e.target.value } })} />
              </label>
              <label>
                Apple team id
                <input className="field" value={site.auth_secrets.apple_team_id} onChange={(e) => patch({ auth_secrets: { ...site.auth_secrets, apple_team_id: e.target.value } })} />
              </label>
              <label>
                Apple key id
                <input className="field" value={site.auth_secrets.apple_key_id} onChange={(e) => patch({ auth_secrets: { ...site.auth_secrets, apple_key_id: e.target.value } })} />
              </label>
              <label>
                Apple private key {site.auth_secrets.apple_key_set ? '(saved — leave blank to keep)' : ''}
                <textarea className="area" value={site.auth_secrets.apple_private_key} onChange={(e) => patch({ auth_secrets: { ...site.auth_secrets, apple_private_key: e.target.value } })} />
              </label>
            </fieldset>

            <fieldset hidden={panel !== 'plans'}>
              <legend>Prices and free listening</legend>
              <div className="card-row">
                <label>
                  Month (cents)
                  <input
                    className="field"
                    inputMode="numeric"
                    value={site.prices.month_cents}
                    onChange={(e) => patch({ prices: { ...site.prices, month_cents: Number(e.target.value) } })}
                  />
                </label>
                <label>
                  Year (cents)
                  <input
                    className="field"
                    inputMode="numeric"
                    value={site.prices.year_cents}
                    onChange={(e) => patch({ prices: { ...site.prices, year_cents: Number(e.target.value) } })}
                  />
                </label>
                <label>
                  Currency
                  <input
                    className="field"
                    value={site.prices.currency}
                    onChange={(e) => patch({ prices: { ...site.prices, currency: e.target.value.toUpperCase() } })}
                  />
                </label>
              </div>
              <p className="fine">
                Shown as {formatMoney(site.prices.month_cents || 0, site.prices.currency || 'USD')} a month and {formatMoney(site.prices.year_cents || 0, site.prices.currency || 'USD')} a year.
              </p>
              <label>
                Free listening per story (seconds)
                <input
                  className="field"
                  inputMode="numeric"
                  value={site.free_listen_seconds}
                  onChange={(e) => patch({ free_listen_seconds: Number(e.target.value) })}
                />
              </label>
            </fieldset>

            {error ? <p className="form-error">{error}</p> : null}
            {saved ? <p className="form-ok">{saved}</p> : null}
            <button type="submit" className="primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save settings'}
            </button>
          </form>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
