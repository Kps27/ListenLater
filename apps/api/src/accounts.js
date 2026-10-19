import { randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';
import { createUserSession } from './sessions.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PIN_MS = 10 * 60 * 1000;

function emailOf(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!EMAIL.test(email)) {
    throw Object.assign(new Error('invalid_email'), { code: 'invalid_email' });
  }
  return email;
}

function hashSecret(secret) {
  const salt = randomBytes(16).toString('hex');
  const key = scryptSync(String(secret), salt, 32).toString('hex');
  return `${salt}:${key}`;
}

function checkSecret(secret, stored) {
  const [salt, key] = String(stored || '').split(':');
  if (!salt || !key) return false;
  const next = scryptSync(String(secret), salt, 32);
  const prev = Buffer.from(key, 'hex');
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}

export function authPublic(site) {
  const auth = site.auth || {};
  return {
    email: true,
    google: Boolean(auth.google_client_id),
    apple: Boolean(auth.apple_service_id),
    mail: Boolean(auth.mail_host),
  };
}

export function accountStatus(db, email) {
  const normalized = emailOf(email);
  const row = db.prepare('select password_hash from users where email = ?').get(normalized);
  return { email: normalized, has_password: Boolean(row?.password_hash) };
}

export function issuePin(db, email, mailConfigured) {
  const normalized = emailOf(email);
  const pin = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const expires = new Date(Date.now() + PIN_MS).toISOString();
  db.prepare(
    `insert into login_pins (email, pin_hash, expires_at) values (?, ?, ?)
     on conflict(email) do update set pin_hash = excluded.pin_hash, expires_at = excluded.expires_at`
  ).run(normalized, hashSecret(pin), expires);
  return {
    email: normalized,
    delivery: 'preview',
    preview_pin: pin,
    sender: mailConfigured ? 'saved' : 'none',
  };
}

export function verifyPin(db, email, pin, adoptGuest) {
  const normalized = emailOf(email);
  const row = db.prepare('select pin_hash, expires_at from login_pins where email = ?').get(normalized);
  if (!row || row.expires_at < new Date().toISOString() || !checkSecret(String(pin || '').trim(), row.pin_hash)) {
    throw Object.assign(new Error('invalid_pin'), { code: 'invalid_pin' });
  }
  db.prepare('delete from login_pins where email = ?').run(normalized);
  const session = createUserSession(db, { email: normalized, adopt_guest: adoptGuest });
  const user = db.prepare('select password_hash from users where id = ?').get(session.user_id);
  return { ...session, needs_password: !user?.password_hash };
}

export function setPassword(db, userId, password) {
  const value = String(password || '');
  if (value.length < 8) throw Object.assign(new Error('weak_password'), { code: 'weak_password' });
  db.prepare('update users set password_hash = ? where id = ?').run(hashSecret(value), userId);
  return { ok: true };
}

export function loginWithPassword(db, email, password, adoptGuest) {
  const normalized = emailOf(email);
  const row = db.prepare('select id, password_hash from users where email = ?').get(normalized);
  if (!row?.password_hash) throw Object.assign(new Error('needs_pin'), { code: 'needs_pin' });
  if (!checkSecret(password, row.password_hash)) {
    throw Object.assign(new Error('invalid_password'), { code: 'invalid_password' });
  }
  return createUserSession(db, { email: normalized, adopt_guest: adoptGuest });
}
