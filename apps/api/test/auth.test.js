import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { accountStatus, issuePin, loginWithPassword, setPassword, verifyPin } from '../src/accounts.js';

function db() {
  const database = new Database(':memory:');
  database.exec(`
    create table users (
      id text primary key,
      email text unique,
      display_name text,
      inbound_slug text unique,
      plan text,
      created_at text,
      password_hash text
    );
    create table api_sessions (
      token text primary key,
      user_id text,
      label text,
      created_at text
    );
    create table login_pins (
      email text primary key,
      pin_hash text not null,
      expires_at text not null
    );
  `);
  return database;
}

test('email pin sets a password and later sign-in uses it', () => {
  const database = db();
  assert.equal(accountStatus(database, 'Ada@listen.test').has_password, false);
  const issued = issuePin(database, 'Ada@listen.test', false);
  assert.equal(issued.delivery, 'preview');
  assert.match(issued.preview_pin, /^\d{6}$/);
  assert.throws(() => verifyPin(database, 'ada@listen.test', '000000', false), (err) => err.code === 'invalid_pin');
  const again = issuePin(database, 'ada@listen.test', false);
  const session = verifyPin(database, 'ada@listen.test', again.preview_pin, false);
  assert.equal(session.needs_password, true);
  assert.equal(session.email, 'ada@listen.test');
  assert.throws(() => setPassword(database, session.user_id, 'short'), (err) => err.code === 'weak_password');
  setPassword(database, session.user_id, 'listen-later');
  assert.equal(accountStatus(database, 'ada@listen.test').has_password, true);
  const signed = loginWithPassword(database, 'ada@listen.test', 'listen-later', false);
  assert.equal(signed.email, 'ada@listen.test');
  assert.throws(
    () => loginWithPassword(database, 'ada@listen.test', 'wrong-password', false),
    (err) => err.code === 'invalid_password'
  );
});

test('a saved mail sender still returns the code until sending is connected', () => {
  const database = db();
  const issued = issuePin(database, 'ada@listen.test', true);
  assert.equal(issued.sender, 'saved');
  assert.match(issued.preview_pin, /^\d{6}$/);
});
