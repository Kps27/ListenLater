import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const TOKEN_KEY = 'll-token';

export function apiBase(): string {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (env) return env.replace(/\/$/, '');
  return Platform.OS === 'android' ? 'http://10.0.2.2:3333' : 'http://127.0.0.1:3333';
}

export async function getToken(): Promise<string> {
  return (await AsyncStorage.getItem(TOKEN_KEY)) || 'dev-guest-token';
}

export async function setToken(token: string) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
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
};

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers as Record<string, string>),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
  return res.json() as Promise<T>;
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
  };
}

export const api = {
  login: async (email: string) => {
    const res = await fetch(`${apiBase()}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) throw new Error('Login failed');
    const data = await res.json();
    await setToken(data.token);
    return data;
  },
  listItems: () =>
    req<{ items: Record<string, unknown>[] }>('/v1/items').then((r) =>
      r.items.map(mapItem).sort((a, b) => a.position - b.position)
    ),
  createUrls: (urls: string[]) =>
    req('/v1/items', { method: 'POST', body: JSON.stringify({ urls, channel: 'mobile' }) }),
  patch: (id: string, patch: Record<string, unknown>) =>
    req(`/v1/items/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
};
