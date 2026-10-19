const DEFAULT_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3333';

export type SiteSocials = {
  x: string;
  instagram: string;
  linkedin: string;
  github: string;
};

export type SitePrices = {
  month_cents: number;
  year_cents: number;
  currency: string;
};

export type SiteConfig = {
  copyright: string;
  contact_email: string;
  hero_title: string;
  hero_lede: string;
  privacy: string;
  terms: string;
  socials: SiteSocials;
  prices: SitePrices;
  free_listen_seconds: number;
  payment: {
    provider: 'stripe' | 'razorpay';
    stripe_publishable_key: string;
    razorpay_key_id: string;
  };
  auth: {
    email: boolean;
    google: boolean;
    apple: boolean;
    mail: boolean;
  };
};

const YEAR = new Date().getFullYear();

export const DEFAULT_SITE: SiteConfig = {
  copyright: `© ${YEAR} Listen Later`,
  contact_email: 'hello@listenlater.app',
  hero_title: 'Hear what you meant to read.',
  hero_lede:
    'Save an article, a newsletter, or a page. Listen Later turns it into an episode, and the words stay in step with the voice.',
  privacy: '',
  terms: '',
  socials: {
    x: 'https://x.com',
    instagram: 'https://instagram.com',
    linkedin: 'https://www.linkedin.com',
    github: 'https://github.com/Kps27/ListenLater',
  },
  prices: { month_cents: 100, year_cents: 1000, currency: 'USD' },
  free_listen_seconds: 60,
  payment: { provider: 'stripe', stripe_publishable_key: '', razorpay_key_id: '' },
  auth: { email: true, google: false, apple: false, mail: false },
};

export function formatMoney(cents: number, currency = 'USD') {
  const amount = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function paragraphs(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export async function fetchSite(): Promise<SiteConfig> {
  try {
    const res = await fetch(`${DEFAULT_BASE}/v1/site`, { cache: 'no-store' });
    if (!res.ok) return DEFAULT_SITE;
    const data = (await res.json()) as Partial<SiteConfig>;
    return {
      ...DEFAULT_SITE,
      ...data,
      socials: { ...DEFAULT_SITE.socials, ...(data.socials || {}) },
      prices: { ...DEFAULT_SITE.prices, ...(data.prices || {}) },
      payment: { ...DEFAULT_SITE.payment, ...(data.payment || {}) },
      auth: { ...DEFAULT_SITE.auth, ...(data.auth || {}) },
    };
  } catch {
    return DEFAULT_SITE;
  }
}

function devApiFor(host: string) {
  if (!host || host === 'localhost' || host === '127.0.0.1') return null;
  if (host.endsWith('.local')) return `http://${host}:3333`;
  const parts = host.split('.');
  if (parts.length !== 4) return null;
  const nums = parts.map((part) => Number(part));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  const [a, b] = nums;
  const lan = a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  return lan ? `http://${host}:3333` : null;
}

export function apiBase() {
  if (typeof window !== 'undefined') {
    const dev = devApiFor(window.location.hostname);
    if (dev) return dev;
  }
  return DEFAULT_BASE;
}
