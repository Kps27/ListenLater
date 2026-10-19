import { randomUUID } from 'node:crypto';

const STATIC = new Map([['dev-guest-token', { userId: 'user-guest', guest: true }]]);

function activeSubscription(db, email) {
  try {
    return db.prepare(`select 1 as ok from subscriptions where email = ? and status = 'active' limit 1`).get(email);
  } catch {
    return null;
  }
}

export function resolveSession(db, token) {
  if (!token) return null;
  if (STATIC.has(token)) return STATIC.get(token);
  const row = db.prepare('select user_id from api_sessions where token = ?').get(token);
  if (!row) return null;
  return { userId: row.user_id, guest: false };
}

export function createUserSession(db, { email, display_name, adopt_guest }) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw Object.assign(new Error('invalid_email'), { code: 'invalid_email' });
  }
  let user = db.prepare('select id from users where email = ?').get(normalized);
  const now = new Date().toISOString();
  if (!user) {
    const id = randomUUID();
    const slug = normalized.split('@')[0].replace(/[^a-z0-9-]/gi, '').slice(0, 12) || 'user';
    const plan = activeSubscription(db, normalized) ? 'plus' : 'free';
    db.prepare(
      `insert into users (id, email, display_name, inbound_slug, plan, created_at)
       values (?, ?, ?, ?, ?, ?)`
    ).run(id, normalized, display_name || normalized.split('@')[0], `${slug}-${id.slice(0, 4)}`, plan, now);
    user = { id };
  }
  const token = randomUUID();
  db.prepare(
    `insert into api_sessions (token, user_id, label, created_at) values (?, ?, ?, ?)`
  ).run(token, user.id, 'enterprise-web', now);
  if (adopt_guest) {
    const owned = db.prepare(`select count(*) as n from items where user_id = ?`).get(user.id).n;
    if (owned === 0) {
      db.prepare(`update items set user_id = ? where user_id = 'user-guest'`).run(user.id);
    }
  }
  return { token, user_id: user.id, email: normalized };
}
