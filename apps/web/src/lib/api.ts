import { apiBase } from './site';

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

async function publicPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; token?: string };
  if (!res.ok) throw Object.assign(new Error(data.error || 'request_failed'), { code: data.error });
  if (data.token) setToken(data.token);
  return data as T;
}

export function authStart(email: string) {
  return publicPost<{ email: string; has_password: boolean }>('/v1/auth/start', { email });
}

export function authPin(email: string) {
  return publicPost<{ delivery: string; preview_pin: string | null; sender: 'saved' | 'none' }>('/v1/auth/pin', { email });
}

export function authVerify(email: string, pin: string) {
  return publicPost<{ token: string; email: string; needs_password: boolean }>('/v1/auth/pin/verify', {
    email,
    pin,
    adopt_guest: true,
  });
}

export function authLogin(email: string, password: string) {
  return publicPost<{ token: string; email: string }>('/v1/auth/login', { email, password, adopt_guest: true });
}

export async function login(email: string, display_name?: string) {
  const res = await fetch(`${apiBase()}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, display_name, adopt_guest: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error((err as { error?: string }).error || 'Login failed'), {
      code: (err as { error?: string }).error,
    });
  }
  const data = await res.json();
  setToken(data.token);
  return data;
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
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
  listRaw: () => req<{ items: Record<string, unknown>[] }>('/v1/items').then((r) => r.items),
  getItem: (id: string) => req<Record<string, unknown>>(`/v1/items/${id}`),
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
  setPassword: (password: string) => req<{ ok: boolean }>('/v1/auth/password', { method: 'POST', body: JSON.stringify({ password }) }),
  subscribe: (onItem: (item: Item) => void) => {
    const es = new EventSource(
      `${apiBase()}/v1/events?access_token=${encodeURIComponent(token())}`
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
