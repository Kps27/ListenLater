'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BrandMark } from '@/components/site/BrandMark';
import { ThemeToggle } from '@/components/site/ThemeToggle';

const LINKS = [
  { href: '/pricing', label: 'Pricing' },
  { href: '/app', label: 'Sign in' },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="market-nav">
      <Link href="/" className="market-word" aria-label="Listen Later">
        <BrandMark />
      </Link>
      <div className="market-tools">
        <ThemeToggle />
      <button
        type="button"
        className="menu-toggle"
        aria-expanded={open}
        aria-controls="site-menu"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="menu-bars" />
        <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
      </button>
      <nav className="site-links" aria-label="Site">
        {LINKS.map((link) => (
          <Link key={link.label} href={link.href}>
            {link.label}
          </Link>
        ))}
        <Link href="/app" className="primary">
          Start listening
        </Link>
      </nav>
      </div>
      {open ? (
        <>
          <button type="button" className="nav-scrim" aria-label="Close menu" onClick={() => setOpen(false)} />
          <nav className="nav-drawer" id="site-menu" aria-label="Site">
            <p className="nav-kicker">Menu</p>
            {LINKS.map((link) => (
              <Link key={link.label} href={link.href} className="nav-text" onClick={() => setOpen(false)}>
                {link.label}
              </Link>
            ))}
            <Link href="/app" className="primary" onClick={() => setOpen(false)}>
              Start listening
            </Link>
          </nav>
        </>
      ) : null}
    </header>
  );
}
