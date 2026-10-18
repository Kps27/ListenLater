import Link from 'next/link';

async function loadShare(token: string) {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3333';
  const res = await fetch(`${base}/v1/shares/${encodeURIComponent(token)}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json() as Promise<{ title?: string; source_url: string }>;
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const row = await loadShare(token);
  if (!row) {
    return (
      <main className="max-w-lg mx-auto p-8">
        <h1 className="text-xl font-semibold">Share not found</h1>
        <p className="text-slate-600 mt-2">This link may have expired.</p>
        <Link href="/" className="inline-block mt-6 text-emerald-800 underline">
          Open Listen Later
        </Link>
      </main>
    );
  }
  return (
    <main className="max-w-lg mx-auto p-8">
      <h1 className="text-2xl font-semibold">{row.title || 'Shared article'}</h1>
      <p className="text-slate-600 mt-2">Public shares include the original link only — not a copy of the article text.</p>
      <a href={row.source_url} className="block mt-4 text-emerald-800 break-all" rel="noopener noreferrer">
        {row.source_url}
      </a>
      <Link href="/" className="inline-block mt-8 rounded-lg bg-emerald-800 text-white px-4 py-2 font-medium">
        Save to Listen Later
      </Link>
    </main>
  );
}
