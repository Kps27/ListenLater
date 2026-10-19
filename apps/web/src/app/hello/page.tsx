'use client';

import { FormEvent, useEffect, useState } from 'react';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { DEFAULT_SITE, fetchSite } from '@/lib/site';

export default function HelloPage() {
  const [sent, setSent] = useState(false);
  const [hello, setHello] = useState(DEFAULT_SITE.contact_email);

  useEffect(() => {
    fetchSite().then((site) => setHello(site.contact_email || DEFAULT_SITE.contact_email));
  }, []);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim();
    const message = String(data.get('message') || '').trim();
    const subject = encodeURIComponent(name ? `Hello from ${name}` : 'Hello');
    const body = encodeURIComponent(`${message}\n\n${name}\n${email}`);
    window.location.href = `mailto:${hello}?subject=${subject}&body=${body}`;
    setSent(true);
  }

  return (
    <div className="ll legal">
      <SiteHeader />
      <main>
        <h1>Say hello</h1>
        <p>
          Write to <a href={`mailto:${hello}`}>{hello}</a>. A note from the form opens in your mail app.
        </p>
        <form className="stack-form" onSubmit={submit}>
          <input className="field" name="name" placeholder="Name" autoComplete="name" />
          <input className="field" name="email" type="email" required placeholder="Email" autoComplete="email" />
          <textarea className="area" name="message" required placeholder="What is on your mind?" />
          <button type="submit" className="primary">
            Send
          </button>
        </form>
        {sent ? <p className="howto">Your mail app should be open with the note ready to send.</p> : null}
      </main>
      <SiteFooter />
    </div>
  );
}
