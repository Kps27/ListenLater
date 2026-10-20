'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DEFAULT_SITE, fetchSite, type SiteConfig } from '@/lib/site';

const ICONS = [
  { key: 'x' as const, name: 'X', path: 'M4 4l7.2 8.4L4.4 20H7l5-5.6L16.6 20H20l-7.5-8.8L19.4 4H16.8l-4.6 5.2L8 4H4z' },
  {
    key: 'instagram' as const,
    name: 'Instagram',
    path: 'M8 4h8a4 4 0 014 4v8a4 4 0 01-4 4H8a4 4 0 01-4-4V8a4 4 0 014-4zm8.2 1.8a1.1 1.1 0 100 2.2 1.1 1.1 0 000-2.2zM12 8.2A3.8 3.8 0 1012 15.8 3.8 3.8 0 0012 8.2z',
  },
  {
    key: 'linkedin' as const,
    name: 'LinkedIn',
    path: 'M6.5 9H4V20h2.5V9zM5.2 4A1.6 1.6 0 103.6 5.6 1.6 1.6 0 005.2 4zM20 20h-2.5v-5.6c0-1.8-.8-2.4-1.8-2.4s-2 .9-2 2.5V20H11V9h2.4v1.5c.5-.9 1.7-1.8 3.4-1.8 2.3 0 3.2 1.4 3.2 4.1V20z',
  },
  {
    key: 'github' as const,
    name: 'GitHub',
    path: 'M12 4a8 8 0 00-2.5 15.6c.4.1.5-.2.5-.4v-1.5c-2.2.5-2.7-1-2.7-1-.4-.9-.9-1.2-.9-1.2-.7-.5.1-.5.1-.5.8.1 1.2.8 1.2.8.7 1.2 1.9.9 2.4.7.1-.5.3-.9.5-1.1-1.8-.2-3.6-.9-3.6-3.9 0-.9.3-1.6.8-2.1-.1-.2-.4-1 .1-2.1 0 0 .7-.2 2.2.8a7.5 7.5 0 014 0c1.5-1 2.2-.8 2.2-.8.5 1.1.2 1.9.1 2.1.5.5.8 1.2.8 2.1 0 3-1.9 3.7-3.6 3.9.3.3.6.8.6 1.6v2.2c0 .2.1.5.5.4A8 8 0 0012 4z',
  },
];

export function SiteFooter() {
  const [site, setSite] = useState<SiteConfig>(DEFAULT_SITE);

  useEffect(() => {
    fetchSite().then(setSite);
  }, []);

  return (
    <footer className="site-footer">
      <div className="foot-brand">
        <p>
          <span>{site.copyright}</span>
          <span className="foot-origin">
            <span className="foot-heart" aria-hidden="true">♥</span>
            {' '}born in <b>Bangalore</b>
            <span className="foot-flag" role="img" aria-label="India">🇮🇳</span>, built in <b>SFO</b>
            <span className="foot-flag" role="img" aria-label="United States">🇺🇸</span>
          </span>
        </p>
      </div>
      <nav className="foot-links" aria-label="Company">
        <Link href="/pricing">Pricing</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/hello">Say hello</Link>
        <Link href="/admin">Admin</Link>
      </nav>
      <div className="socials">
        {ICONS.map((item) => {
          const href = site.socials[item.key];
          if (!href) return null;
          return (
            <a key={item.name} href={href} target="_blank" rel="noreferrer" aria-label={item.name}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d={item.path} fill="currentColor" />
              </svg>
            </a>
          );
        })}
      </div>
    </footer>
  );
}
