import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const TOKEN_KEY = 'll-token';
const EMAIL_KEY = 'll-email';

export function apiBase(): string {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (env) return env.replace(/\/$/, '');
  return Platform.OS === 'android' ? 'http://10.0.2.2:3333' : 'http://127.0.0.1:3333';
}

export async function getToken(): Promise<string> {
  return (await AsyncStorage.getItem(TOKEN_KEY)) || '';
}

export async function getEmail(): Promise<string> {
  return (await AsyncStorage.getItem(EMAIL_KEY)) || '';
}

export async function setSession(token: string, email: string) {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [EMAIL_KEY, email.trim().toLowerCase()],
  ]);
}

export async function clearSession() {
  await AsyncStorage.multiRemove([TOKEN_KEY, EMAIL_KEY, 'll-plan']);
}

export type Item = {
  id: string;
  title?: string;
  source_url?: string;
  site_name?: string;
  text?: string;
  status: string;
  state: string;
  position: number;
  progress_sentence?: number;
  fail_reason?: string | null;
};

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers as Record<string, string>),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = (data as { error?: string }).error || res.statusText;
    throw Object.assign(new Error(error), { code: (data as { error?: string }).error });
  }
  return data as T;
}

export function mapItem(row: Record<string, unknown>): Item {
  return {
    id: String(row.id),
    title: (row.title as string) || '',
    source_url: (row.source_url as string) || '',
    site_name: (row.site_name as string) || '',
    text: (row.text as string) || '',
    status: String(row.status),
    state: String(row.state),
    position: Number(row.position) || 0,
    progress_sentence: Number(row.progress_sentence) || 0,
    fail_reason: (row.fail_reason as string) || null,
  };
}

export function splitSentences(text: string): string[] {
  const out: string[] = [];
  for (const block of text.split(/\n\n+/)) {
    const parts = block.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
    for (const part of parts) {
      const sentence = part.trim();
      if (sentence) out.push(sentence);
    }
  }
  return out;
}

export function countryCode() {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone === 'Asia/Kolkata' || zone === 'Asia/Calcutta') return 'IN';
    if (zone?.startsWith('Europe/London')) return 'GB';
    if (zone?.startsWith('America/')) return 'US';
  } catch {
    /* ignore */
  }
  return 'US';
}

export function formatMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(0)}`;
  }
}

export const api = {
  start: (email: string) =>
    req<{ email: string; has_password: boolean }>('/v1/auth/start', { method: 'POST', body: JSON.stringify({ email }) }),
  pin: (email: string) =>
    req<{ preview_pin: string | null; sender: 'saved' | 'none' }>('/v1/auth/pin', { method: 'POST', body: JSON.stringify({ email }) }),
  verify: async (email: string, pin: string) => {
    const data = await req<{ token: string; email: string; needs_password: boolean }>('/v1/auth/pin/verify', {
      method: 'POST',
      body: JSON.stringify({ email, pin, adopt_guest: false }),
    });
    await setSession(data.token, data.email);
    return data;
  },
  login: async (email: string, password: string) => {
    const data = await req<{ token: string; email: string }>('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, adopt_guest: false }),
    });
    await setSession(data.token, data.email);
    return data;
  },
  setPassword: (password: string) => req<{ ok: boolean }>('/v1/auth/password', { method: 'POST', body: JSON.stringify({ password }) }),
  plan: () => req<{ plan?: string; free_listen_seconds?: number }>('/v1/me/plan'),
  prices: (country: string) =>
    req<{ currency: string; month_cents: number; year_cents: number; save_percent: number; country: string }>(
      `/v1/prices?country=${encodeURIComponent(country)}`
    ),
  site: () =>
    req<{ free_listen_seconds?: number; prices?: { month_cents: number; year_cents: number; currency: string }; payment?: { provider?: string } }>(
      '/v1/site'
    ),
  checkout: (body: { email: string; interval: 'month' | 'year'; country?: string; card: { name: string; number: string; exp: string; cvc: string } }) =>
    req<{ last4?: string; provider?: string; amount_cents?: number; currency?: string }>('/v1/billing/checkout', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  listItems: () =>
    req<{ items: Record<string, unknown>[] }>('/v1/items').then((r) =>
      r.items.map(mapItem).sort((a, b) => a.position - b.position)
    ),
  createUrls: (urls: string[]) => req('/v1/items', { method: 'POST', body: JSON.stringify({ urls, channel: 'mobile' }) }),
  createText: (text: string) => req('/v1/items', { method: 'POST', body: JSON.stringify({ text, channel: 'paste' }) }),
  patch: (id: string, patch: Record<string, unknown>) => req(`/v1/items/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
};
