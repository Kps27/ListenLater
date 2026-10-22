import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { randomBytes } from 'node:crypto';

function loadLocalEnv() {
  const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadLocalEnv();
import { openDb, rowToItem, uid } from './db.js';
import { registerAuth, GUEST_ITEM_LIMIT, countActiveItems } from './auth.js';
import { createUserSession } from './sessions.js';
import { accountStatus, deliverPin, issuePin, loginWithPassword, setPassword, verifyPin } from './accounts.js';
import { sendLoginCode } from './mail.js';
import { enqueueExtract, startWorker } from './worker.js';
import { ingestClientText } from './extract.js';
import { canonicalUrl } from '../../../lib/model.js';
import { buildTextPayload } from '../../../lib/cleanup.js';
import { ensureAudioTable, getOrCreateAudioStub } from './audio.js';
import { ensureSite, publicSite, adminSite, loginAdmin, saveSite, deleteAccount, checkout, planForUser, profileForUser, readSite } from './site.js';
import { acceptInbound } from './inbound.js';
import { quoteCountry } from './prices.js';

const PORT = Number(process.env.PORT || 3333);
const db = openDb();
ensureAudioTable(db);
ensureSite(db);
const sseClients = new Set();

function emit(event, payload) {
  const line = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(line);
    } catch {
      sseClients.delete(res);
    }
  }
}

function nextPosition(db, userId) {
  const row = db.prepare('select max(position) as m from items where user_id = ?').get(userId);
  return (row?.m ?? 0) + 1;
}

function siteName(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function createItemRow(db, userId, fields) {
  const id = uid();
  const now = new Date().toISOString();
  const canonical = fields.canonical_url ?? (fields.source_url ? canonicalUrl(fields.source_url) : null);
  if (canonical) {
    const existing = db
      .prepare('select * from items where user_id = ? and canonical_url = ?')
      .get(userId, canonical);
    if (existing) return { item: rowToItem(existing), created: false };
  }
  db.prepare(
    `insert into items (
      id, user_id, source_url, canonical_url, source_channel, title, site_name, author, lang,
      word_count, text_body, sentences_json, status, fail_reason, state, position,
      progress_sentence, created_at, updated_at
    ) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    id,
    userId,
    fields.source_url ?? null,
    canonical,
    fields.source_channel,
    fields.title ?? null,
    fields.site_name ?? (fields.source_url ? siteName(fields.source_url) : null),
    fields.author ?? null,
    fields.lang ?? null,
    fields.word_count ?? null,
    fields.text_body ?? null,
    fields.sentences_json ?? null,
    fields.status ?? 'queued',
    fields.fail_reason ?? null,
    fields.state ?? 'up_next',
    fields.position ?? nextPosition(db, userId),
    0,
    now,
    now
  );
  return { item: rowToItem(db.prepare('select * from items where id = ?').get(id)), created: true };
}

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });
registerAuth(app, db);

function authError(reply, error) {
  if (error.code === 'invalid_email') return reply.code(400).send({ error: 'invalid_email' });
  if (error.code === 'invalid_pin') return reply.code(401).send({ error: 'invalid_pin' });
  if (error.code === 'invalid_password') return reply.code(401).send({ error: 'invalid_password' });
  if (error.code === 'needs_pin') return reply.code(409).send({ error: 'needs_pin' });
  if (error.code === 'weak_password') return reply.code(400).send({ error: 'weak_password' });
  throw error;
}

app.post('/v1/auth/start', async (req, reply) => {
  try {
    return accountStatus(db, req.body?.email);
  } catch (e) {
    return authError(reply, e);
  }
});

app.post('/v1/auth/pin', async (req, reply) => {
  try {
    const auth = readSite(db).auth || {};
    const issued = issuePin(db, req.body?.email, Boolean(auth.mail_host));
    return await deliverPin(issued, auth, sendLoginCode);
  } catch (e) {
    if (e.code === 'mail_failed') {
      req.log.error({ err: e.cause || e }, 'login code email failed');
      return reply.code(502).send({ error: 'mail_failed' });
    }
    return authError(reply, e);
  }
});

app.post('/v1/auth/pin/verify', async (req, reply) => {
  try {
    const body = req.body || {};
    return verifyPin(db, body.email, body.pin, Boolean(body.adopt_guest));
  } catch (e) {
    return authError(reply, e);
  }
});

app.post('/v1/auth/password', async (req, reply) => {
  if (!req.userId || req.isGuest) return reply.code(401).send({ error: 'sign_in_required' });
  try {
    return setPassword(db, req.userId, req.body?.password);
  } catch (e) {
    return authError(reply, e);
  }
});

app.post('/v1/auth/login', async (req, reply) => {
  try {
    const body = req.body || {};
    if (body.password) {
      return loginWithPassword(db, body.email, body.password, Boolean(body.adopt_guest));
    }
    const session = createUserSession(db, {
      email: body.email,
      display_name: body.display_name || body.name,
      adopt_guest: Boolean(body.adopt_guest),
    });
    return session;
  } catch (e) {
    return authError(reply, e);
  }
});

app.get('/health', async () => ({ ok: true }));

app.get('/v1/site', async () => publicSite(db));

app.get('/v1/prices', async (req) => quoteCountry(req.query?.country));

app.get('/v1/admin/hint', async () => ({ custom: Boolean(process.env.LL_ADMIN_PASSWORD) }));

app.post('/v1/admin/login', async (req, reply) => {
  const session = loginAdmin(db, req.body?.password);
  if (!session) return reply.code(401).send({ error: 'invalid_admin' });
  return session;
});

app.get('/v1/admin/site', async (req, reply) => {
  const view = adminSite(db, req);
  if (!view) return reply.code(401).send({ error: 'invalid_admin' });
  return view;
});

app.delete('/v1/admin/accounts', async (req, reply) => {
  try {
    const view = deleteAccount(db, req, req.body?.email);
    if (!view) return reply.code(401).send({ error: 'invalid_admin' });
    return view;
  } catch (e) {
    if (e.code === 'not_found') return reply.code(404).send({ error: 'not_found' });
    throw e;
  }
});

app.put('/v1/admin/site', async (req, reply) => {
  try {
    const view = saveSite(db, req, req.body || {});
    if (!view) return reply.code(401).send({ error: 'invalid_admin' });
    return view;
  } catch (e) {
    if (e.code === 'invalid_url') return reply.code(400).send({ error: 'invalid_url' });
    if (e.code === 'invalid_domain') return reply.code(400).send({ error: 'invalid_domain' });
    throw e;
  }
});

app.post('/v1/billing/checkout', async (req, reply) => {
  try {
    return checkout(db, req.body || {});
  } catch (e) {
    const code = e.code || 'checkout_failed';
    const status = code === 'card_number' || code === 'card_exp' || code === 'card_cvc' || code === 'card_name' || code === 'invalid_email' || code === 'invalid_plan' ? 400 : 500;
    if (status === 500) throw e;
    return reply.code(status).send({ error: code });
  }
});

app.get('/v1/me/plan', async (req) => planForUser(db, req.userId));

app.get('/v1/me', async (req, reply) => {
  if (!req.userId || req.isGuest) return reply.code(401).send({ error: 'sign_in_required' });
  const profile = profileForUser(db, req.userId);
  if (!profile) return reply.code(404).send({ error: 'not_found' });
  return profile;
});

app.get('/v1/events', async (req, reply) => {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  sseClients.add(reply.raw);
  req.raw.on('close', () => sseClients.delete(reply.raw));
  reply.raw.write(': connected\n\n');
});

app.post('/v1/items', async (req, reply) => {
  const body = req.body || {};
  const channel = body.channel || 'web';
  const userId = req.userId;

  if (req.isGuest && countActiveItems(db, userId) >= GUEST_ITEM_LIMIT && !body.client_text) {
    return reply.code(403).send({ error: 'guest_limit', limit: GUEST_ITEM_LIMIT });
  }

  const out = [];

  if (body.client_text?.text) {
    const r = ingestClientText(body.client_text);
    const payload = r.status === 'ready' ? r : { ...r, text: r.text || '' };
    const { item, created } = createItemRow(db, userId, {
      source_url: body.client_text.url || null,
      source_channel: channel,
      title: payload.title || body.client_text.title,
      word_count: payload.word_count,
      text_body: payload.text,
      sentences_json: JSON.stringify(payload.sentences || []),
      status: payload.status,
      fail_reason: payload.fail_reason,
    });
    if (created) out.push(item);
    else out.push(item);
    return { items: out };
  }

  if (body.text) {
    const payload = buildTextPayload(body.text);
    const { item } = createItemRow(db, userId, {
      source_channel: channel,
      title: body.title,
      word_count: payload.word_count,
      text_body: payload.text,
      sentences_json: JSON.stringify(payload.sentences),
      status: 'ready',
      site_name: 'Pasted text',
    });
    out.push(item);
    return { items: out };
  }

  const urls = body.urls || [];
  for (const url of urls) {
    if (req.isGuest && countActiveItems(db, userId) >= GUEST_ITEM_LIMIT) break;
    const { item, created } = createItemRow(db, userId, {
      source_url: url,
      source_channel: channel,
      status: 'queued',
    });
    if (created) {
      enqueueExtract(db, item.id);
      out.push(item);
    } else out.push(item);
  }
  return { items: out };
});

app.get('/v1/items', async (req) => {
  const state = req.query.state;
  const q = String(req.query.q || '').trim().toLowerCase();
  let sql = 'select * from items where user_id = ?';
  const params = [req.userId];
  if (state) {
    sql += ' and state = ?';
    params.push(state);
  } else if (!q) {
    sql += " and state != 'archived'";
  }
  if (q) {
    sql += ' and (lower(title) like ? or lower(site_name) like ? or lower(source_url) like ?)';
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  sql += ' order by position';
  const limit = Math.min(Number(req.query.limit) || 100, 200);
  sql += ' limit ?';
  params.push(limit);
  const rows = db.prepare(sql).all(...params);
  return { items: rows.map(rowToItem), next_cursor: null };
});

app.get('/v1/items/:id', async (req, reply) => {
  const row = db.prepare('select * from items where id = ? and user_id = ?').get(req.params.id, req.userId);
  if (!row) return reply.code(404).send({ error: 'not_found' });
  const item = rowToItem(row);
  return {
    ...item,
    text_url: item.text ? `/v1/items/${item.id}/text` : null,
    sentences_url: item.sentences?.length ? `/v1/items/${item.id}/sentences` : null,
  };
});

app.get('/v1/items/:id/text', async (req, reply) => {
  const row = db.prepare('select text_body from items where id = ? and user_id = ?').get(req.params.id, req.userId);
  if (!row?.text_body) return reply.code(404).send({ error: 'not_found' });
  reply.type('text/plain').send(row.text_body);
});

app.get('/v1/items/:id/audio', async (req, reply) => {
  const voice = String(req.query.voice || 'premium-en');
  const row = db.prepare('select * from items where id = ? and user_id = ?').get(req.params.id, req.userId);
  if (!row) return reply.code(404).send({ error: 'not_found' });
  if (row.status !== 'ready') return reply.code(409).send({ error: 'not_ready', status: row.status });
  return getOrCreateAudioStub(db, row, voice);
});

app.get('/v1/items/:id/sentences', async (req, reply) => {
  const row = db.prepare('select sentences_json from items where id = ? and user_id = ?').get(req.params.id, req.userId);
  if (!row?.sentences_json) return reply.code(404).send({ error: 'not_found' });
  reply.send(JSON.parse(row.sentences_json));
});

app.patch('/v1/items/:id', async (req, reply) => {
  const row = db.prepare('select * from items where id = ? and user_id = ?').get(req.params.id, req.userId);
  if (!row) return reply.code(404).send({ error: 'not_found' });
  const p = req.body || {};
  const fields = [];
  const vals = [];
  for (const key of ['state', 'position', 'progress_sentence', 'title']) {
    if (p[key] !== undefined) {
      fields.push(`${key} = ?`);
      vals.push(key === 'title' ? String(p[key]).trim().slice(0, 300) : p[key]);
    }
  }
  if (typeof p.text === 'string') {
    const payload = buildTextPayload(p.text.slice(0, 200000));
    fields.push('text_body = ?', 'sentences_json = ?', 'word_count = ?', 'status = ?', 'fail_reason = ?');
    vals.push(payload.text, JSON.stringify(payload.sentences), payload.word_count, 'ready', null);
  }
  if (p.state === 'listened' && !p.listened_at) {
    fields.push('listened_at = ?');
    vals.push(new Date().toISOString());
  }
  if (p.progress_sentence !== undefined) {
    fields.push('progress_updated_at = ?');
    vals.push(new Date().toISOString());
  }
  fields.push('updated_at = ?');
  vals.push(new Date().toISOString());
  vals.push(req.params.id, req.userId);
  db.prepare(`update items set ${fields.join(', ')} where id = ? and user_id = ?`).run(...vals);
  return rowToItem(db.prepare('select * from items where id = ?').get(req.params.id));
});

app.post('/v1/items/:id/retry', async (req, reply) => {
  const row = db.prepare('select * from items where id = ? and user_id = ?').get(req.params.id, req.userId);
  if (!row) return reply.code(404).send({ error: 'not_found' });
  if (!row.source_url) return reply.code(400).send({ error: 'no_url' });
  const t = new Date().toISOString();
  db.prepare(`update items set status = 'queued', fail_reason = null, updated_at = ? where id = ?`).run(t, row.id);
  enqueueExtract(db, row.id);
  return rowToItem(db.prepare('select * from items where id = ?').get(row.id));
});

app.delete('/v1/items/:id', async (req, reply) => {
  const info = db.prepare('delete from items where id = ? and user_id = ?').run(req.params.id, req.userId);
  if (!info.changes) return reply.code(404).send({ error: 'not_found' });
  return { ok: true };
});

app.get('/v1/sync', async (req) => {
  const since = req.query.since;
  let rows;
  if (since) {
    rows = db
      .prepare('select * from items where user_id = ? and updated_at > ? order by updated_at')
      .all(req.userId, since);
  } else {
    rows = db.prepare('select * from items where user_id = ? order by updated_at').all(req.userId);
  }
  return { items: rows.map(rowToItem), server_time: new Date().toISOString() };
});

app.post('/v1/shares', async (req, reply) => {
  const { item_id: itemId } = req.body || {};
  const row = db.prepare('select * from items where id = ? and user_id = ?').get(itemId, req.userId);
  if (!row?.source_url) return reply.code(400).send({ error: 'share_requires_url' });
  const token = randomBytes(6).toString('base64url');
  const now = new Date().toISOString();
  db.prepare(
    `insert into shares (token, user_id, item_id, source_url, title, created_at)
     values (?, ?, ?, ?, ?, ?)`
  ).run(token, req.userId, row.id, row.source_url, row.title, now);
  const webBase = process.env.LL_WEB_URL || 'http://127.0.0.1:3001';
  return { url: `${webBase}/s/${token}`, token };
});

app.get('/v1/shares/:token', async (req, reply) => {
  const row = db.prepare('select * from shares where token = ? and revoked_at is null').get(req.params.token);
  if (!row) return reply.code(404).send({ error: 'not_found' });
  return { source_url: row.source_url, title: row.title };
});

app.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'string' }, (req, body, done) => {
  try {
    const params = new URLSearchParams(body);
    const parsed = {};
    for (const [key, value] of params) parsed[key] = value;
    done(null, parsed);
  } catch (err) {
    done(err);
  }
});

app.post('/v1/webhooks/inbound-email', async (req, reply) => {
  const site = readSite(db);
  const accepted = acceptInbound(site, req.headers, req.body || {});
  if (accepted.error === 'invalid_signature') return reply.code(401).send({ error: 'invalid_signature' });
  if (accepted.error) return reply.code(404).send({ error: 'unknown_inbox' });
  const user = db.prepare('select id from users where inbound_slug = ?').get(accepted.slug);
  if (!user) return reply.code(404).send({ error: 'unknown_inbox' });
  const from = String(accepted.mail.from || '').match(/[a-z0-9._+-]+@[a-z0-9.-]+/i)?.[0]?.toLowerCase() || '';
  const items = [];
  for (const url of accepted.urls) {
    const { item, created } = createItemRow(db, user.id, {
      source_url: url,
      source_channel: 'email',
      status: 'queued',
      author: from || null,
      title: accepted.mail.subject || null,
    });
    if (created) enqueueExtract(db, item.id);
    items.push(item);
  }
  if (!items.length && accepted.mail.text) {
    const payload = buildTextPayload(accepted.mail.text);
    if ((payload.word_count || 0) >= 40) {
      const { item } = createItemRow(db, user.id, {
        source_channel: 'email',
        title: accepted.mail.subject || 'Forwarded letter',
        author: from || null,
        site_name: from ? from.split('@')[1] : 'Forwarded mail',
        word_count: payload.word_count,
        text_body: payload.text,
        sentences_json: JSON.stringify(payload.sentences),
        status: 'ready',
      });
      items.push(item);
    }
  }
  return { items };
});

app.get('/v1/me/export', async (req) => {
  const user = db.prepare('select * from users where id = ?').get(req.userId);
  const items = db.prepare('select * from items where user_id = ?').all(req.userId);
  return {
    user,
    items: items.map(rowToItem),
    exported_at: new Date().toISOString(),
  };
});

app.delete('/v1/me', async (req) => {
  const t = new Date().toISOString();
  db.prepare('update users set deleted_at = ? where id = ?').run(t, req.userId);
  db.prepare('delete from items where user_id = ?').run(req.userId);
  return { ok: true, deleted_at: t };
});

startWorker(db, (event, payload) => emit(event, payload));

await app.listen({ port: PORT, host: '0.0.0.0' });
console.log(`Listen Later API http://127.0.0.1:${PORT} (Bearer dev-guest-token)`);
