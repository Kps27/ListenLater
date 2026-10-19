import { resolveSession } from './sessions.js';

export function registerAuth(app, db) {
  app.decorateRequest('userId', null);
  app.decorateRequest('isGuest', false);

  app.addHook('onRequest', async (req, reply) => {
    const path = req.url.split('?')[0];
    if (path === '/health') return;
    if (path === '/v1/auth/login' && req.method === 'POST') return;
    if (path === '/v1/auth/start' && req.method === 'POST') return;
    if (path === '/v1/auth/pin' && req.method === 'POST') return;
    if (path === '/v1/auth/pin/verify' && req.method === 'POST') return;
    if (path === '/v1/site' && req.method === 'GET') return;
    if (path === '/v1/prices' && req.method === 'GET') return;
    if (path === '/v1/admin/login' && req.method === 'POST') return;
    if (path === '/v1/billing/checkout' && req.method === 'POST') return;
    if (path.startsWith('/v1/admin/')) return;
    if (path.startsWith('/v1/shares/') && req.method === 'GET') return;
    if (path.startsWith('/v1/webhooks/')) return;

    if (path.startsWith('/v1/events')) {
      const t = req.query?.access_token;
      const meta = resolveSession(db, t);
      if (meta) {
        req.userId = meta.userId;
        req.isGuest = !!meta.guest;
        return;
      }
    }

    const h = req.headers.authorization || '';
    const m = /^Bearer\s+(.+)$/i.exec(h);
    if (!m) return reply.code(401).send({ error: 'missing_bearer' });
    const meta = resolveSession(db, m[1].trim());
    if (!meta) return reply.code(401).send({ error: 'invalid_token' });
    req.userId = meta.userId;
    req.isGuest = !!meta.guest;
  });
}

export const GUEST_ITEM_LIMIT = 5;

export function countActiveItems(db, userId) {
  return db
    .prepare(`select count(*) as n from items where user_id = ? and state != 'archived'`)
    .get(userId).n;
}
