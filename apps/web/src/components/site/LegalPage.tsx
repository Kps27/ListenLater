'use client';

import { useEffect, useState } from 'react';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { fetchSite, paragraphs } from '@/lib/site';

export function LegalPage({ kind, title }: { kind: 'terms' | 'privacy'; title: string }) {
  const [body, setBody] = useState('');

  useEffect(() => {
    fetchSite().then((site) => setBody(kind === 'terms' ? site.terms : site.privacy));
  }, [kind]);

  const parts = paragraphs(body);

  return (
    <div className="ll legal">
      <SiteHeader />
      <main>
        <h1>{title}</h1>
        {parts.length ? parts.map((part) => <p key={part.slice(0, 48)}>{part}</p>) : <p>Loading…</p>}
      </main>
      <SiteFooter />
    </div>
  );
}
