import { randomUUID } from 'node:crypto';

const STATIC = new Map([['dev-guest-token', { userId: 'user-guest', guest: true }]]);

export function resolveSession(db, token) {
  if (!token) return null;
  if (STATIC.has(token)) return STATIC.get(token);
  const row = db.prepare('select user_id from api_sessions where token = ?').get(token);
  if (!row) return null;
  return { userId: row.user_id, guest: false };
}

export function createUserSession(db, { email, display_name }) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw Object.assign(new Error('invalid_email'), { code: 'invalid_email' });
  }
  let user = db.prepare('select id from users where email = ?').get(normalized);
  const now = new Date().toISOString();
  if (!user) {
    const id = randomUUID();
    const slug = normalized.split('@')[0].replace(/[^a-z0-9-]/gi, '').slice(0, 12) || 'user';
    db.prepare(
      `insert into users (id, email, display_name, inbound_slug, plan, created_at)
       values (?, ?, ?, ?, 'premium', ?)`
    ).run(id, normalized, display_name || normalized.split('@')[0], `${slug}-${id.slice(0, 4)}`, now);
    user = { id };
  }
  const token = randomUUID();
  db.prepare(
    `insert into api_sessions (token, user_id, label, created_at) values (?, ?, ?, ?)`
  ).run(token, user.id, 'enterprise-web', now);
  return { token, user_id: user.id, email: normalized };
}
