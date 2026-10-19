import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { ensureSite, publicSite, saveSite, checkout, loginAdmin, adminSite } from '../src/site.js';
import { quoteCountry } from '../src/prices.js';

function db() {
  const database = new Database(':memory:');
  database.exec(`create table users (id text primary key, email text, plan text)`);
  ensureSite(database);
  return database;
}

function admin(database) {
  const session = loginAdmin(database, 'listen-later-admin');
  return {
    headers: { authorization: `Bearer ${session.token}` },
  };
}

test('public site hides payment secrets', () => {
  const database = db();
  const req = admin(database);
  saveSite(database, req, {
    stripe_publishable_key: 'pk_test_public',
    stripe_secret_key: 'sk_test_secret',
    razorpay_key_secret: 'rzp_secret',
  });
  const pub = publicSite(database);
  assert.equal(pub.payment.stripe_publishable_key, 'pk_test_public');
  assert.equal(pub.stripe_secret_key, undefined);
  assert.equal(pub.razorpay_key_secret, undefined);
  assert.equal(JSON.stringify(pub).includes('sk_test_secret'), false);
  assert.equal(JSON.stringify(pub).includes('rzp_secret'), false);
});

test('public site hides sign-in secrets and a blank secret keeps the stored one', () => {
  const database = db();
  const req = admin(database);
  saveSite(database, req, {
    auth: {
      google_client_id: 'google-client',
      google_client_secret: 'goog-secret',
      apple_private_key: 'apple-pem',
      mail_password: 'mail-secret',
      mail_host: 'smtp.example.com',
    },
  });
  const pub = publicSite(database);
  assert.equal(pub.auth.google, true);
  assert.equal(pub.auth.apple, false);
  assert.equal(pub.auth.mail, true);
  const rawPub = JSON.stringify(pub);
  assert.equal(rawPub.includes('goog-secret'), false);
  assert.equal(rawPub.includes('apple-pem'), false);
  assert.equal(rawPub.includes('mail-secret'), false);
  const kept = saveSite(database, req, { auth: { google_client_secret: '', apple_private_key: '', mail_password: '' } });
  assert.equal(kept.auth_secrets.google_secret_set, true);
  assert.equal(kept.auth_secrets.apple_key_set, true);
  assert.equal(kept.auth_secrets.mail_password_set, true);
  const raw = JSON.parse(database.prepare('select json from site_settings where id = ?').get('default').json);
  assert.equal(raw.auth.google_client_secret, 'goog-secret');
  assert.equal(raw.auth.apple_private_key, 'apple-pem');
  assert.equal(raw.auth.mail_password, 'mail-secret');
  assert.equal(raw.auth.google_client_id, 'google-client');
});

test('blank secret on save keeps the stored secret', () => {
  const database = db();
  const req = admin(database);
  saveSite(database, req, { stripe_secret_key: 'sk_keep' });
  const view = saveSite(database, req, { stripe_secret_key: '' });
  assert.equal(view.stripe_secret_key, '');
  assert.equal(view.stripe_secret_set, true);
  const raw = JSON.parse(database.prepare('select json from site_settings where id = ?').get('default').json);
  assert.equal(raw.stripe_secret_key, 'sk_keep');
});

test('country prices stay on round local amounts', () => {
  const india = quoteCountry('in');
  assert.equal(india.currency, 'INR');
  assert.equal(india.month_cents, 20000);
  assert.equal(india.year_cents, 100000);
  assert.equal(india.save_percent, 58);
  const us = quoteCountry('US');
  assert.equal(us.month_cents, 200);
  assert.equal(us.year_cents, 1000);
  assert.equal(us.save_percent, 58);
});

test('demo checkout uses the signed-in country price and does not charge', () => {
  const database = db();
  database.prepare(`insert into users (id, email, plan) values ('u2', 'ada@listen.test', 'free')`).run();
  const result = checkout(database, {
    email: 'ada@listen.test',
    interval: 'year',
    country: 'IN',
    card: { name: 'Ada Lovelace', number: '4242 4242 4242 4242', exp: '12/30', cvc: '123' },
  });
  assert.equal(result.charged, false);
  assert.equal(result.currency, 'INR');
  assert.equal(result.amount_cents, 100000);
});

test('demo checkout stores last4 and does not charge', () => {
  const database = db();
  database.prepare(`insert into users (id, email, plan) values ('u1', 'ada@listen.test', 'free')`).run();
  const result = checkout(database, {
    email: 'Ada@listen.test',
    interval: 'year',
    card: { name: 'Ada Lovelace', number: '4242 4242 4242 4242', exp: '12/30', cvc: '123' },
  });
  assert.equal(result.charged, false);
  assert.equal(result.last4, '4242');
  assert.equal(result.amount_cents, 1000);
  assert.equal(result.plan, 'plus');
  const user = database.prepare('select plan from users where id = ?').get('u1');
  assert.equal(user.plan, 'plus');
  const row = database.prepare('select last4 from subscriptions').get();
  assert.equal(row.last4, '4242');
});

test('admin roster lists signed-up and paid accounts', () => {
  const database = db();
  database.prepare(`insert into users (id, email, plan) values ('free-1', 'free@listen.test', 'free')`).run();
  database.prepare(`insert into users (id, email, plan) values ('paid-1', 'ada@listen.test', 'free')`).run();
  database.prepare(`insert into users (id, email, plan) values ('guest', null, 'free')`).run();
  checkout(database, {
    email: 'ada@listen.test',
    interval: 'year',
    country: 'IN',
    card: { name: 'Ada Lovelace', number: '4242 4242 4242 4242', exp: '12/30', cvc: '123' },
  });
  const view = adminSite(database, admin(database));
  assert.equal(view.roster.counts.signed_up, 2);
  assert.equal(view.roster.counts.paid, 1);
  assert.equal(view.roster.counts.free, 1);
  assert.equal(view.roster.paid[0].email, 'ada@listen.test');
  assert.equal(view.roster.paid[0].currency, 'INR');
  assert.equal(view.roster.paid[0].amount_cents, 100000);
  assert.equal(JSON.stringify(view.roster).includes('password'), false);
});

test('expired demo card is rejected', () => {
  const database = db();
  assert.throws(
    () =>
      checkout(database, {
        email: 'ada@listen.test',
        interval: 'month',
        card: { name: 'Ada Lovelace', number: '4242424242424242', exp: '01/20', cvc: '123' },
      }),
    (err) => err.code === 'card_exp'
  );
});
