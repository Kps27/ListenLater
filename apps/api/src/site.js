import { randomBytes, timingSafeEqual } from 'node:crypto';
import { uid } from './db.js';
import { authPublic } from './accounts.js';
import { quoteCountry } from './prices.js';
import { inboundReceiving, normalizeInboundDomain, normalizeInboundProvider, saveAddress } from './inbound.js';

const YEAR = new Date().getFullYear();

export const DEFAULTS = {
  copyright: `© ${YEAR} Listen Later`,
  contact_email: 'hello@listenlater.app',
  hero_title: 'Hear what you meant to read.',
  hero_lede:
    'Save an article, a newsletter, or a page. Listen Later turns it into an episode, and the words stay in step with the voice.',
  privacy: [
    'Your library is yours. Article titles, addresses, and text stay with your account so the app can play them. They are not sent to analytics.',
    'Analytics, when it is on, counts events such as a save, a play, or a finished piece. It does not include the words you listened to.',
    'A private save address receives mail you forward. Unknown senders are held until you keep or dismiss them. They are not dropped in silence.',
    'You can export everything we hold, and you can delete the account. Deletion removes the items, the shares, and the sign-in session.',
    'The app on this computer stores a theme choice and, if you sign in, the email you typed, in local storage on this device.',
    'A free account can save pieces and listen for 60 seconds of each story. A paid plan stores the email on the subscription, the plan, and the last four digits of the demo card. The full card number is not stored.',
  ].join('\n\n'),
  terms: [
    'Listen Later turns links and text you save into a listening queue. You keep the right to the things you save. We keep the right to run the service.',
    'You may save articles you have access to, paste text you have the right to use, and share a link to the original page. A public share carries the title and the original address. It does not carry our copy of the article.',
    'A free account can add pieces and listen for 60 seconds of each story. Plus is one dollar a month, or ten dollars a year. Listening on Plus is capped in these terms. After sign-in, the price is shown in a local round amount. The card form on this site is a demo until a live payment provider is switched on. A demo checkout does not charge the card.',
    'Guest use without an email is limited to five items. An account removes that limit. You can export your library and delete your account from Settings.',
    'We do not bypass paywalls or sign-in walls. If a page will not open, the app will say so and ask you to open it yourself or paste the text.',
    'The service is provided as it is today. Listening uses your device voice unless you choose a premium voice later. Playback can fail when a browser has no speech engine.',
  ].join('\n\n'),
  socials: {
    x: 'https://x.com',
    instagram: 'https://instagram.com',
    linkedin: 'https://www.linkedin.com',
    github: 'https://github.com/Kps27/ListenLater',
  },
  payment_provider: 'stripe',
  stripe_publishable_key: '',
  stripe_secret_key: '',
  razorpay_key_id: '',
  razorpay_key_secret: '',
  prices: { month_cents: 100, year_cents: 1000, currency: 'USD' },
  free_listen_seconds: 60,
  inbound_domain: '',
  inbound_provider: 'webhook',
  inbound_webhook_secret: '',
  auth: {
    google_client_id: '',
    google_client_secret: '',
    apple_service_id: '',
    apple_team_id: '',
    apple_key_id: '',
    apple_private_key: '',
    mail_from: '',
    mail_host: '',
    mail_port: '587',
    mail_user: '',
    mail_password: '',
  },
};

export function ensureSite(db) {
  db.exec(`
    create table if not exists site_settings (
      id text primary key,
      json text not null,
      updated_at text not null
    );
    create table if not exists admin_sessions (
      token text primary key,
      created_at text not null
    );
    create table if not exists subscriptions (
      id text primary key,
      email text not null,
      interval text not null,
      provider text not null,
      last4 text,
      amount_cents integer not null,
      status text not null,
      created_at text not null
    );
  `);
  const subCols = db.prepare('pragma table_info(subscriptions)').all();
  if (!subCols.some((col) => col.name === 'currency')) {
    db.exec('alter table subscriptions add column currency text');
  }
  const row = db.prepare('select json from site_settings where id = ?').get('default');
  if (!row) {
    db.prepare('insert into site_settings (id, json, updated_at) values (?, ?, ?)').run(
      'default',
      JSON.stringify(DEFAULTS),
      new Date().toISOString()
    );
    return;
  }
  try {
    const stored = JSON.parse(row.json);
    let changed = false;
    const prices = stored.prices || {};
    if (prices.currency === 'USD' && prices.month_cents === 200 && prices.year_cents === 1000) {
      stored.prices = { ...prices, month_cents: 100 };
      changed = true;
    }
    if (typeof stored.terms === 'string') {
      const nextTerms = stored.terms
        .replace(
          'two dollars a month, or ten dollars a year, and removes that listening limit.',
          'one dollar a month, or ten dollars a year. Listening on Plus is capped in these terms.'
        )
        .replace(
          'one dollar a month, or ten dollars a year, and is capped in these terms.',
          'one dollar a month, or ten dollars a year. Listening on Plus is capped in these terms.'
        )
        .replace('removes that listening limit', 'Listening on Plus is capped in these terms');
      if (nextTerms !== stored.terms) {
        stored.terms = nextTerms;
        changed = true;
      }
    }
    if (changed) {
      db.prepare('update site_settings set json = ?, updated_at = ? where id = ?').run(
        JSON.stringify(stored),
        new Date().toISOString(),
        'default'
      );
    }
  } catch {
    /* keep the stored site */
  }
}

function merge(base, patch) {
  return {
    ...base,
    ...patch,
    socials: { ...base.socials, ...(patch.socials || {}) },
    prices: { ...base.prices, ...(patch.prices || {}) },
    auth: { ...base.auth, ...(patch.auth || {}) },
  };
}

export function readSite(db) {
  const row = db.prepare('select json from site_settings where id = ?').get('default');
  let stored = {};
  if (row) {
    try {
      stored = JSON.parse(row.json);
    } catch {
      stored = {};
    }
  }
  return merge(DEFAULTS, stored);
}

function writeSite(db, value) {
  const json = JSON.stringify(value);
  const now = new Date().toISOString();
  db.prepare(
    `insert into site_settings (id, json, updated_at) values ('default', ?, ?)
     on conflict(id) do update set json = excluded.json, updated_at = excluded.updated_at`
  ).run(json, now);
}

function authFromPatch(current, patch) {
  const stored = current || {};
  const next = patch || {};
  const text = (value, storedValue, max) => (value === undefined ? storedValue || '' : clip(value, max));
  const keep = (value, storedValue, max) => clip(value, max) || storedValue || '';
  return {
    google_client_id: text(next.google_client_id, stored.google_client_id, 200),
    google_client_secret: keep(next.google_client_secret, stored.google_client_secret, 300),
    apple_service_id: text(next.apple_service_id, stored.apple_service_id, 200),
    apple_team_id: text(next.apple_team_id, stored.apple_team_id, 40),
    apple_key_id: text(next.apple_key_id, stored.apple_key_id, 40),
    apple_private_key: keep(next.apple_private_key, stored.apple_private_key, 4000),
    mail_from: text(next.mail_from, stored.mail_from, 160),
    mail_host: text(next.mail_host, stored.mail_host, 200),
    mail_port: /^\d{2,5}$/.test(text(next.mail_port, stored.mail_port, 5)) ? text(next.mail_port, stored.mail_port, 5) : '587',
    mail_user: text(next.mail_user, stored.mail_user, 160),
    mail_password: keep(next.mail_password, stored.mail_password, 200),
  };
}

export function publicSite(db) {
  const site = readSite(db);
  return {
    copyright: site.copyright,
    contact_email: site.contact_email,
    hero_title: site.hero_title,
    hero_lede: site.hero_lede,
    privacy: site.privacy,
    terms: site.terms,
    socials: site.socials,
    prices: site.prices,
    free_listen_seconds: site.free_listen_seconds,
    payment: {
      provider: site.payment_provider,
      stripe_publishable_key: site.stripe_publishable_key || '',
      razorpay_key_id: site.razorpay_key_id || '',
    },
    auth: authPublic(site),
  };
}

function adminOk(db, req) {
  const h = req.headers.authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  if (!m) return false;
  const row = db.prepare('select token from admin_sessions where token = ?').get(m[1].trim());
  return !!row;
}

function recentCheckouts(db) {
  return db
    .prepare(
      `select id, email, interval, provider, last4, amount_cents, currency, status, created_at
       from subscriptions order by created_at desc limit 12`
    )
    .all();
}

function tableCols(db, table) {
  if (!['users', 'items', 'api_sessions', 'subscriptions', 'shares'].includes(table)) return new Set();
  const found = db.prepare(`select name from sqlite_master where type = 'table' and name = ?`).get(table);
  if (!found) return new Set();
  return new Set(db.prepare(`pragma table_info(${table})`).all().map((col) => col.name));
}

function adminRoster(db) {
  const counts = { signed_up: 0, paid: 0, free: 0, stories: 0, ready: 0, preparing: 0, failed: 0, sessions: 0, checkouts: 0 };
  const userCols = tableCols(db, 'users');
  if (!userCols.has('id') || !userCols.has('email')) return { counts, users: [], paid: [] };

  const planExpr = userCols.has('plan') ? 'u.plan' : "'free'";
  const nameExpr = userCols.has('display_name') ? 'u.display_name' : "''";
  const joinedExpr = userCols.has('created_at') ? 'u.created_at' : "''";
  const slugExpr = userCols.has('inbound_slug') ? 'u.inbound_slug' : "''";
  const inboundDomain = readSite(db).inbound_domain || '';
  const deletedSql = userCols.has('deleted_at') ? 'and u.deleted_at is null' : '';
  const itemCols = tableCols(db, 'items');
  const storyExpr = itemCols.has('user_id') ? '(select count(*) from items i where i.user_id = u.id)' : '0';
  const sessionCols = tableCols(db, 'api_sessions');
  const seenExpr =
    sessionCols.has('user_id') && sessionCols.has('created_at')
      ? '(select max(s.created_at) from api_sessions s where s.user_id = u.id)'
      : 'null';
  const people = db
    .prepare(
      `select u.id as id, u.email as email, ${nameExpr} as display_name, ${planExpr} as plan,
              ${slugExpr} as inbound_slug, ${joinedExpr} as created_at, ${storyExpr} as stories, ${seenExpr} as last_sign_in
       from users u
       where u.email is not null and trim(u.email) != '' and u.id != 'user-guest' ${deletedSql}
       order by created_at desc`
    )
    .all();

  const subCols = tableCols(db, 'subscriptions');
  const subs = subCols.has('email')
    ? db
        .prepare(
          `select email, interval, provider, last4, amount_cents,
                  ${subCols.has('currency') ? 'currency' : "''"} as currency,
                  status, created_at
           from subscriptions order by created_at desc`
        )
        .all()
    : [];
  const active = new Map();
  for (const sub of subs) {
    if (sub.status !== 'active') continue;
    const key = String(sub.email || '').toLowerCase();
    if (!active.has(key)) active.set(key, sub);
  }

  const users = people.map((person) => {
    const email = String(person.email || '').toLowerCase();
    const paid = person.plan === 'plus' || person.plan === 'premium' || active.has(email);
    return {
      email,
      name: person.display_name || '',
      plan: paid ? 'plus' : 'free',
      stories: Number(person.stories) || 0,
      save_address: saveAddress(inboundDomain, person.inbound_slug),
      joined: person.created_at || '',
      last_sign_in: person.last_sign_in || '',
    };
  });

  const paid = [];
  const seenPaid = new Set();
  for (const sub of subs) {
    if (sub.status !== 'active') continue;
    const email = String(sub.email || '').toLowerCase();
    if (seenPaid.has(email)) continue;
    seenPaid.add(email);
    paid.push({
      email,
      interval: sub.interval,
      provider: sub.provider,
      last4: sub.last4 || '',
      amount_cents: sub.amount_cents,
      currency: sub.currency || '',
      created_at: sub.created_at,
    });
  }
  for (const person of users) {
    if (person.plan !== 'plus' || seenPaid.has(person.email)) continue;
    paid.push({
      email: person.email,
      interval: '',
      provider: '',
      last4: '',
      amount_cents: 0,
      currency: '',
      created_at: person.joined,
    });
  }

  if (itemCols.has('status')) {
    for (const group of db.prepare(`select status, count(*) as n from items group by status`).all()) {
      const n = Number(group.n) || 0;
      counts.stories += n;
      if (group.status === 'ready') counts.ready += n;
      else if (group.status === 'failed' || group.status === 'blocked') counts.failed += n;
      else counts.preparing += n;
    }
  }
  if (sessionCols.size) {
    counts.sessions = Number(db.prepare('select count(*) as n from api_sessions').get().n) || 0;
  }
  counts.signed_up = users.length;
  counts.paid = users.filter((person) => person.plan === 'plus').length;
  counts.free = counts.signed_up - counts.paid;
  counts.checkouts = subs.length;
  return { counts, users, paid };
}

function hasTable(db, table) {
  return Boolean(db.prepare(`select name from sqlite_master where type = 'table' and name = ?`).get(table));
}

export function deleteAccount(db, req, email) {
  if (!adminOk(db, req)) return null;
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) throw Object.assign(new Error('not_found'), { code: 'not_found' });
  const user = db.prepare(`select id from users where lower(email) = ?`).get(normalized);
  if (!user || user.id === 'user-guest') throw Object.assign(new Error('not_found'), { code: 'not_found' });
  const id = user.id;
  if (hasTable(db, 'items')) db.prepare('delete from items where user_id = ?').run(id);
  if (hasTable(db, 'api_sessions')) db.prepare('delete from api_sessions where user_id = ?').run(id);
  if (hasTable(db, 'shares')) db.prepare('delete from shares where user_id = ?').run(id);
  if (hasTable(db, 'subscriptions')) db.prepare('delete from subscriptions where lower(email) = ?').run(normalized);
  if (hasTable(db, 'login_pins')) db.prepare('delete from login_pins where lower(email) = ?').run(normalized);
  db.prepare('delete from users where id = ?').run(id);
  return adminSite(db, req);
}

export function adminSite(db, req) {
  if (!adminOk(db, req)) return null;
  const site = readSite(db);
  const pub = publicSite(db);
  return {
    ...pub,
    stripe_publishable_key: site.stripe_publishable_key || '',
    stripe_secret_key: '',
    stripe_secret_set: Boolean(site.stripe_secret_key),
    razorpay_key_id: site.razorpay_key_id || '',
    razorpay_key_secret: '',
    razorpay_secret_set: Boolean(site.razorpay_key_secret),
    inbound_domain: site.inbound_domain || '',
    inbound_provider: site.inbound_provider || 'webhook',
    inbound_webhook_secret: '',
    inbound_secret_set: Boolean(site.inbound_webhook_secret),
    inbound_env_secret: Boolean(process.env.LL_INBOUND_WEBHOOK_SECRET),
    inbound_receiving: inboundReceiving(site),
    auth_secrets: {
      google_client_id: site.auth.google_client_id || '',
      google_client_secret: '',
      google_secret_set: Boolean(site.auth.google_client_secret),
      apple_service_id: site.auth.apple_service_id || '',
      apple_team_id: site.auth.apple_team_id || '',
      apple_key_id: site.auth.apple_key_id || '',
      apple_private_key: '',
      apple_key_set: Boolean(site.auth.apple_private_key),
      mail_from: site.auth.mail_from || '',
      mail_host: site.auth.mail_host || '',
      mail_port: site.auth.mail_port || '587',
      mail_user: site.auth.mail_user || '',
      mail_password: '',
      mail_password_set: Boolean(site.auth.mail_password),
    },
    recent_checkouts: recentCheckouts(db),
    roster: adminRoster(db),
  };
}

function passwordOk(input) {
  const expected = process.env.LL_ADMIN_PASSWORD || 'listen-later-admin';
  const a = Buffer.from(String(input || ''));
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function loginAdmin(db, password) {
  if (!passwordOk(password)) return null;
  const token = randomBytes(24).toString('hex');
  db.prepare('insert into admin_sessions (token, created_at) values (?, ?)').run(token, new Date().toISOString());
  return { token };
}

function clip(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

function httpUrl(value) {
  const v = clip(value, 300);
  if (!v) return '';
  if (!/^https?:\/\//i.test(v)) return null;
  return v;
}

function clampInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function saveSite(db, req, patch) {
  if (!adminOk(db, req)) return null;
  const current = readSite(db);
  const socials = { ...current.socials };
  if (patch.socials && typeof patch.socials === 'object') {
    for (const key of ['x', 'instagram', 'linkedin', 'github']) {
      if (patch.socials[key] === undefined) continue;
      const url = httpUrl(patch.socials[key]);
      if (url === null) {
        const err = new Error('invalid_url');
        err.code = 'invalid_url';
        throw err;
      }
      socials[key] = url;
    }
  }
  const provider = patch.payment_provider === 'razorpay' ? 'razorpay' : patch.payment_provider === 'stripe' ? 'stripe' : current.payment_provider;
  const prices = { ...current.prices };
  if (patch.prices && typeof patch.prices === 'object') {
    prices.month_cents = clampInt(patch.prices.month_cents, 0, 1_000_000, prices.month_cents);
    prices.year_cents = clampInt(patch.prices.year_cents, 0, 1_000_000, prices.year_cents);
    const currency = clip(patch.prices.currency || prices.currency, 8).toUpperCase();
    prices.currency = /^[A-Z]{3}$/.test(currency) ? currency : prices.currency;
  }
  const next = {
    ...current,
    copyright: patch.copyright !== undefined ? clip(patch.copyright, 200) : current.copyright,
    contact_email: patch.contact_email !== undefined ? clip(patch.contact_email, 120) : current.contact_email,
    hero_title: patch.hero_title !== undefined ? clip(patch.hero_title, 180) : current.hero_title,
    hero_lede: patch.hero_lede !== undefined ? clip(patch.hero_lede, 500) : current.hero_lede,
    privacy: patch.privacy !== undefined ? clip(patch.privacy, 20000) : current.privacy,
    terms: patch.terms !== undefined ? clip(patch.terms, 20000) : current.terms,
    socials,
    payment_provider: provider,
    stripe_publishable_key:
      patch.stripe_publishable_key !== undefined ? clip(patch.stripe_publishable_key, 200) : current.stripe_publishable_key,
    stripe_secret_key: clip(patch.stripe_secret_key, 200) || current.stripe_secret_key,
    razorpay_key_id: patch.razorpay_key_id !== undefined ? clip(patch.razorpay_key_id, 200) : current.razorpay_key_id,
    razorpay_key_secret: clip(patch.razorpay_key_secret, 200) || current.razorpay_key_secret,
    prices,
    free_listen_seconds: clampInt(patch.free_listen_seconds, 10, 3600, current.free_listen_seconds),
    inbound_domain: patch.inbound_domain !== undefined ? normalizeInboundDomain(patch.inbound_domain) : current.inbound_domain,
    inbound_provider: normalizeInboundProvider(patch.inbound_provider, current.inbound_provider),
    inbound_webhook_secret: clip(patch.inbound_webhook_secret, 200) || current.inbound_webhook_secret,
    auth: authFromPatch(current.auth, patch.auth),
  };
  writeSite(db, next);
  return adminSite(db, req);
}

export function cardLast4(card) {
  const number = String(card?.number || '').replace(/\D/g, '');
  const exp = String(card?.exp || '').trim();
  const cvc = String(card?.cvc || '').replace(/\D/g, '');
  const name = String(card?.name || '').trim();
  if (number.length < 13 || number.length > 19) throw Object.assign(new Error('card_number'), { code: 'card_number' });
  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(exp);
  if (!match) throw Object.assign(new Error('card_exp'), { code: 'card_exp' });
  const expAt = new Date(2000 + Number(match[2]), Number(match[1]), 1);
  if (expAt <= new Date()) throw Object.assign(new Error('card_exp'), { code: 'card_exp' });
  if (cvc.length < 3 || cvc.length > 4) throw Object.assign(new Error('card_cvc'), { code: 'card_cvc' });
  if (name.length < 2) throw Object.assign(new Error('card_name'), { code: 'card_name' });
  return number.slice(-4);
}

export function checkout(db, body) {
  const email = String(body.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw Object.assign(new Error('invalid_email'), { code: 'invalid_email' });
  }
  const interval = body.interval === 'year' ? 'year' : body.interval === 'month' ? 'month' : null;
  if (!interval) throw Object.assign(new Error('invalid_plan'), { code: 'invalid_plan' });
  const last4 = cardLast4(body.card);
  const site = readSite(db);
  const quote = body.country ? quoteCountry(body.country) : null;
  const amount = quote
    ? interval === 'year'
      ? quote.year_cents
      : quote.month_cents
    : interval === 'year'
      ? site.prices.year_cents
      : site.prices.month_cents;
  const currency = quote ? quote.currency : site.prices.currency;
  const id = uid();
  const now = new Date().toISOString();
  db.prepare(
    `insert into subscriptions (id, email, interval, provider, last4, amount_cents, currency, status, created_at)
     values (?, ?, ?, ?, ?, ?, ?, 'active', ?)`
  ).run(id, email, interval, site.payment_provider, last4, amount, currency, now);
  db.prepare(`update users set plan = 'plus' where lower(email) = ?`).run(email);
  return {
    ok: true,
    plan: 'plus',
    interval,
    provider: site.payment_provider,
    last4,
    amount_cents: amount,
    currency,
    charged: false,
    email,
  };
}

export function profileForUser(db, userId) {
  const cols = new Set(db.prepare('pragma table_info(users)').all().map((col) => col.name));
  if (!cols.has('id')) return null;
  const slugExpr = cols.has('inbound_slug') ? 'inbound_slug' : "''";
  const nameExpr = cols.has('display_name') ? 'display_name' : "''";
  const emailExpr = cols.has('email') ? 'email' : "''";
  const user = db.prepare(`select ${emailExpr} as email, ${nameExpr} as display_name, ${slugExpr} as inbound_slug from users where id = ?`).get(userId);
  if (!user) return null;
  const site = readSite(db);
  return {
    email: user.email || '',
    name: user.display_name || '',
    inbound_slug: user.inbound_slug || '',
    save_address: saveAddress(site.inbound_domain, user.inbound_slug),
    receiving: inboundReceiving(site),
  };
}

export function planForUser(db, userId) {
  const user = db.prepare('select plan, email from users where id = ?').get(userId);
  const site = readSite(db);
  let plan = user?.plan || 'free';
  if (user?.email) {
    const sub = db
      .prepare(`select 1 as ok from subscriptions where email = ? and status = 'active' limit 1`)
      .get(String(user.email).toLowerCase());
    if (sub) plan = 'plus';
  }
  const plus = plan === 'plus' || plan === 'premium';
  return {
    plan: plus ? plan : 'free',
    free_listen_seconds: site.free_listen_seconds,
  };
}
