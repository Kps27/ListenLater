const DEFAULT_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3333';

export type Item = {
  id: string;
  source_url?: string;
  title?: string;
  site_name?: string;
  text?: string;
  status: string;
  fail_reason?: string | null;
  state: string;
  position: number;
  progress_sentence?: number;
  source_channel?: string;
};

function token(): string {
  if (typeof window === 'undefined') return 'dev-guest-token';
  return localStorage.getItem('ll-token') || 'dev-guest-token';
}

export function setToken(t: string) {
  localStorage.setItem('ll-token', t);
}

export async function login(email: string, display_name?: string) {
  const res = await fetch(`${DEFAULT_BASE}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, display_name }),
  });
  if (!res.ok) throw new Error('Login failed');
  const data = await res.json();
  setToken(data.token);
  return data;
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${DEFAULT_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error((err as { error?: string }).error || res.statusText), {
      status: res.status,
      detail: err,
    });
  }
  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}

export function mapItem(row: Record<string, unknown>): Item {
  return {
    id: String(row.id),
    source_url: (row.source_url as string) || '',
    title: (row.title as string) || '',
    site_name: (row.site_name as string) || '',
    text: (row.text as string) || '',
    status: String(row.status),
    fail_reason: row.fail_reason as string | null,
    state: String(row.state),
    position: Number(row.position) || 0,
    progress_sentence: Number(row.progress_sentence) || 0,
    source_channel: row.source_channel as string,
  };
}

export const api = {
  listItems: (q?: { state?: string; q?: string }) => {
    const p = new URLSearchParams();
    if (q?.state) p.set('state', q.state);
    if (q?.q) p.set('q', q.q);
    const qs = p.toString();
    return req<{ items: Record<string, unknown>[] }>(`/v1/items${qs ? `?${qs}` : ''}`).then((r) =>
      r.items.map(mapItem)
    );
  },
  createUrls: (urls: string[]) =>
    req<{ items: Record<string, unknown>[] }>('/v1/items', {
      method: 'POST',
      body: JSON.stringify({ urls, channel: 'web' }),
    }),
  createText: (title: string, text: string) =>
    req<{ items: Record<string, unknown>[] }>('/v1/items', {
      method: 'POST',
      body: JSON.stringify({ title, text, channel: 'paste' }),
    }),
  patch: (id: string, patch: Record<string, unknown>) =>
    req<Record<string, unknown>>(`/v1/items/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  delete: (id: string) => req(`/v1/items/${id}`, { method: 'DELETE' }),
  retry: (id: string) => req<Record<string, unknown>>(`/v1/items/${id}/retry`, { method: 'POST' }),
  share: (item_id: string) => req<{ url: string; token: string }>('/v1/shares', { method: 'POST', body: JSON.stringify({ item_id }) }),
  subscribe: (onItem: (item: Item) => void) => {
    const es = new EventSource(
      `${DEFAULT_BASE}/v1/events?access_token=${encodeURIComponent(token())}`
    );
    es.addEventListener('item', (e) => {
      try {
        onItem(mapItem(JSON.parse(e.data)));
      } catch {
        /* ignore */
      }
    });
    return () => es.close();
  },
};
