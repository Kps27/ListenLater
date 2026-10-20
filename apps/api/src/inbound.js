import { timingSafeEqual } from 'node:crypto';

const PROVIDERS = new Set(['postmark', 'mailgun', 'ses', 'webhook']);
const HOST = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

export function normalizeInboundDomain(value) {
  let host = String(value ?? '').trim().toLowerCase();
  if (!host) return '';
  host = host.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/\.$/, '');
  if (!HOST.test(host) || host.length > 160) {
    throw Object.assign(new Error('invalid_domain'), { code: 'invalid_domain' });
  }
  return host;
}

export function normalizeInboundProvider(value, fallback = 'webhook') {
  if (value === undefined || value === null || value === '') return PROVIDERS.has(fallback) ? fallback : 'webhook';
  return PROVIDERS.has(value) ? value : (PROVIDERS.has(fallback) ? fallback : 'webhook');
}

export function inboundReceiving(site, envSecret = process.env.LL_INBOUND_WEBHOOK_SECRET) {
  return Boolean(site?.inbound_domain && (site?.inbound_webhook_secret || envSecret));
}

export function saveAddress(domain, slug) {
  const host = String(domain || '').trim().toLowerCase();
  const name = String(slug || '').trim().toLowerCase();
  if (!host || !name) return '';
  return `${name}@${host}`;
}

function presentedSecret(headers = {}) {
  const header = headers['x-ll-secret'] || headers['X-LL-Secret'] || '';
  if (header) return String(header).trim();
  const auth = /^Bearer\s+(.+)$/i.exec(String(headers.authorization || headers.Authorization || ''));
  return auth ? auth[1].trim() : '';
}

export function secretMatches(expected, headers) {
  const want = String(expected || '');
  const got = presentedSecret(headers);
  if (!want || !got) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function firstText(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value;
    if (Array.isArray(value) && value.length) return firstText(...value);
  }
  return '';
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseInbound(body) {
  const mail = body && typeof body === 'object' ? body : {};
  const nested = mail.mail && typeof mail.mail === 'object' ? mail.mail : {};
  const headers = nested.commonHeaders && typeof nested.commonHeaders === 'object' ? nested.commonHeaders : {};
  const to = firstText(mail.To, mail.to, mail.OriginalRecipient, mail.recipient, mail.Recipients, nested.destination, headers.to);
  const from = firstText(mail.From, mail.from, mail.sender, mail.FromFull?.Email, nested.source, headers.from);
  const subject = firstText(mail.Subject, mail.subject, headers.subject);
  const text = firstText(mail.TextBody, mail.text, mail['body-plain'], mail.Text, mail.content);
  const html = firstText(mail.HtmlBody, mail.html, mail['body-html']);
  return {
    to: String(to || ''),
    from: String(from || ''),
    subject: String(subject || '').trim(),
    text: String(text || '').trim() || stripHtml(html),
  };
}

export function slugFor(to, domain) {
  const emails = String(to || '').match(/[a-z0-9._+-]+@[a-z0-9.-]+/gi) || [];
  const host = String(domain || '').trim().toLowerCase();
  const chosen = (host && emails.find((email) => email.toLowerCase().endsWith(`@${host}`))) || emails[0] || '';
  const local = chosen.split('@')[0].toLowerCase();
  if (!/^[a-z0-9][a-z0-9._+-]{0,80}$/.test(local)) return '';
  return local;
}

export function urlsIn(text) {
  const found = String(text || '').match(/https?:\/\/[^\s<>"']+/gi) || [];
  const clean = found.map((url) => url.replace(/[),.;:!?]+$/g, ''));
  return [...new Set(clean)].slice(0, 10);
}

export function acceptInbound(site, headers, body, envSecret = process.env.LL_INBOUND_WEBHOOK_SECRET) {
  const expected = site?.inbound_webhook_secret || envSecret || '';
  if (!secretMatches(expected, headers)) return { error: 'invalid_signature' };
  const mail = parseInbound(body);
  const slug = slugFor(mail.to, site?.inbound_domain);
  if (!slug) return { error: 'unknown_inbox', mail };
  return { slug, mail, urls: urlsIn(mail.text) };
}
