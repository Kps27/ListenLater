/** Minimal client for §5 REST (web prototype). */

const DEFAULT_BASE = 'http://127.0.0.1:3333';
const TOKEN = 'dev-guest-token';

export function apiBase() {
  return (typeof localStorage !== 'undefined' && localStorage.getItem('ll-api-base')) || DEFAULT_BASE;
}

export async function probeApi() {
  try {
    const r = await fetch(`${apiBase()}/health`, { signal: AbortSignal.timeout(2500) });
    return r.ok;
  } catch {
    return false;
  }
}

export function useApiBackend() {
  if (typeof window === 'undefined') return false;
  if (window.LL_USE_API === false) return false;
  if (localStorage.getItem('ll-use-api') === '0') return false;
  return localStorage.getItem('ll-use-api') === '1' || location.hostname === '127.0.0.1' || location.hostname === 'localhost';
}

async function req(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${apiBase()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err.error || res.statusText), { status: res.status, detail: err });
  }
  if (res.status === 204) return null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('json')) return res.json();
  return res.text();
}

export function mapApiItem(row) {
  return {
    id: row.id,
    source_url: row.source_url || '',
    url: row.source_url || '',
    canonical_url: row.canonical_url,
    source_channel: row.source_channel,
    title: row.title || '',
    site_name: row.site_name || '',
    text: row.text || '',
    status: row.status,
    fail_reason: row.fail_reason,
    state: row.state,
    position: row.position,
    progress_sentence: row.progress_sentence ?? 0,
    progress: row.progress_sentence ?? 0,
    listened_at: row.listened_at,
    addedAt: Date.parse(row.created_at) || Date.now(),
  };
}

export const api = {
  listItems: () => req('/v1/items').then((r) => r.items.map(mapApiItem)),
  createFromUrls: (urls) => req('/v1/items', { method: 'POST', body: { urls, channel: 'web' } }),
  createFromText: (title, text) =>
    req('/v1/items', { method: 'POST', body: { title, text, channel: 'paste' } }),
  clientText: (client_text, channel = 'extension') =>
    req('/v1/items', { method: 'POST', body: { client_text, channel } }),
  patchItem: (id, patch) => req(`/v1/items/${id}`, { method: 'PATCH', body: patch }),
  deleteItem: (id) => req(`/v1/items/${id}`, { method: 'DELETE' }),
  retryItem: (id) => req(`/v1/items/${id}/retry`, { method: 'POST' }),
  createShare: (item_id) => req('/v1/shares', { method: 'POST', body: { item_id } }),
  subscribeEvents: (onItem) => {
    const es = new EventSource(`${apiBase()}/v1/events?access_token=${encodeURIComponent(TOKEN)}`);
    es.addEventListener('item', (e) => {
      try {
        onItem(mapApiItem(JSON.parse(e.data)));
      } catch {}
    });
    return () => es.close();
  },
};
