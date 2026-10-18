const TOKENS = new Map([
  ['dev-guest-token', { userId: 'user-guest', guest: true }],
]);

export function registerAuth(app) {
  app.decorateRequest('userId', null);
  app.decorateRequest('isGuest', false);

  app.addHook('onRequest', async (req, reply) => {
    const path = req.url.split('?')[0];
    if (path === '/health') return;
    if (path.startsWith('/v1/shares/') && req.method === 'GET') return;
    if (path.startsWith('/v1/webhooks/')) return;

    if (path.startsWith('/v1/events')) {
      const t = req.query?.access_token;
      if (t && TOKENS.has(t)) {
        req.userId = TOKENS.get(t).userId;
        req.isGuest = !!TOKENS.get(t).guest;
        return;
      }
    }

    const h = req.headers.authorization || '';
    const m = /^Bearer\s+(.+)$/i.exec(h);
    if (!m) return reply.code(401).send({ error: 'missing_bearer' });
    const meta = TOKENS.get(m[1].trim());
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
