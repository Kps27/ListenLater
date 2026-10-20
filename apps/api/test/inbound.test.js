import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { acceptInbound, parseInbound, saveAddress, slugFor } from '../src/inbound.js';
import { ensureSite, profileForUser, saveSite, loginAdmin } from '../src/site.js';

test('a forwarded letter is matched to the address local part', () => {
  const mail = parseInbound({
    To: 'Listen Later <kp-7f3a@save.listenlater.app>',
    From: 'Ada <ada@news.example>',
    Subject: 'Sunday reads',
    TextBody: 'Read https://example.com/story.',
  });
  assert.equal(slugFor(mail.to, 'save.listenlater.app'), 'kp-7f3a');
  assert.equal(saveAddress('save.listenlater.app', 'kp-7f3a'), 'kp-7f3a@save.listenlater.app');
  const accepted = acceptInbound(
    { inbound_domain: 'save.listenlater.app', inbound_webhook_secret: 'secret' },
    { 'x-ll-secret': 'secret' },
    { To: mail.to, From: mail.from, Subject: mail.subject, TextBody: mail.text }
  );
  assert.equal(accepted.slug, 'kp-7f3a');
  assert.deepEqual(accepted.urls, ['https://example.com/story']);
  assert.equal(acceptInbound({ inbound_webhook_secret: 'secret' }, { 'x-ll-secret': 'nope' }, {}).error, 'invalid_signature');
  assert.equal(acceptInbound({ inbound_domain: 'save.listenlater.app' }, { 'x-ll-secret': 'secret' }, {}).error, 'invalid_signature');
});

test('each account gets its own save address from the inbound domain', () => {
  const database = new Database(':memory:');
  database.exec(`
    create table users (
      id text primary key,
      email text,
      display_name text,
      inbound_slug text,
      plan text
    );
  `);
  database.prepare('insert into users (id, email, display_name, inbound_slug, plan) values (?, ?, ?, ?, ?)').run(
    'user-1',
    'ada@listen.test',
    'Ada',
    'ada-1a2b',
    'free'
  );
  ensureSite(database);
  const req = { headers: { authorization: `Bearer ${loginAdmin(database, 'listen-later-admin').token}` } };
  saveSite(database, req, { inbound_domain: 'save.listenlater.app', inbound_webhook_secret: 'secret' });
  const profile = profileForUser(database, 'user-1');
  assert.equal(profile.save_address, 'ada-1a2b@save.listenlater.app');
  assert.equal(profile.receiving, true);
  assert.equal(profileForUser(database, 'missing'), null);
});
