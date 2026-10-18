'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { api, Item, login } from '@/lib/api';
import { toSentences, wordCount } from '@/lib/sentences';

type Tab = 'active' | 'in_progress' | 'listened' | 'archived';

export default function ListenApp() {
  const [items, setItems] = useState<Item[]>([]);
  const [tab, setTab] = useState<Tab>('active');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [urls, setUrls] = useState('');
  const [email, setEmail] = useState('');
  const [playing, setPlaying] = useState(false);
  const [idx, setIdx] = useState(0);
  const [rate, setRate] = useState(1);
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const refresh = useCallback(async () => {
    const list = await api.listItems(search ? { q: search } : undefined);
    setItems(list.sort((a, b) => a.position - b.position));
  }, [search]);

  useEffect(() => {
    refresh().catch(console.error);
    const unsub = api.subscribe((row) => {
      setItems((prev) => {
        const i = prev.findIndex((x) => x.id === row.id);
        if (i >= 0) {
          const next = [...prev];
          next[i] = row;
          return next.sort((a, b) => a.position - b.position);
        }
        return [...prev, row].sort((a, b) => a.position - b.position);
      });
    });
    return unsub;
  }, [refresh]);

  const visible = useMemo(() => {
    let q = items;
    if (tab === 'in_progress') q = q.filter((i) => i.state === 'in_progress');
    else if (tab === 'listened') q = q.filter((i) => i.state === 'listened');
    else if (tab === 'archived') q = q.filter((i) => i.state === 'archived');
    else q = q.filter((i) => i.state !== 'archived' && i.state !== 'listened');
    if (search.trim()) {
      const s = search.toLowerCase();
      q = q.filter(
        (i) =>
          i.title?.toLowerCase().includes(s) ||
          i.site_name?.toLowerCase().includes(s) ||
          i.source_url?.toLowerCase().includes(s)
      );
    }
    return q;
  }, [items, tab, search]);

  const current = items.find((i) => i.id === currentId) || null;
  const sentences = current?.text ? toSentences(current.text) : [];

  const speakAt = useCallback(
    (i: number) => {
      if (!synth || !current?.text) return;
      if (i >= sentences.length) {
        setPlaying(false);
        api.patch(current.id, { state: 'listened', progress_sentence: 0 }).then(refresh);
        return;
      }
      setIdx(i);
      const u = new SpeechSynthesisUtterance(sentences[i].s);
      u.rate = rate;
      u.onend = () => {
        if (utterRef.current !== u) return;
        speakAt(i + 1);
      };
      utterRef.current = u;
      synth.speak(u);
    },
    [synth, current, sentences, rate, refresh]
  );

  const togglePlay = () => {
    if (!current?.text) return;
    if (playing) {
      synth?.cancel();
      setPlaying(false);
      api.patch(current.id, { progress_sentence: idx, state: idx > 0 ? 'in_progress' : current.state });
      return;
    }
    setPlaying(true);
    api.patch(current.id, { state: 'in_progress' });
    synth?.cancel();
    speakAt(idx);
  };

  async function addLinks() {
    const list = urls.match(/https?:\/\/[^\s<>"']+/g) || [];
    if (!list.length) return;
    await api.createUrls(list);
    setUrls('');
    await refresh();
  }

  async function bulkArchive() {
    for (const id of selected) {
      await api.patch(id, { state: 'archived' });
    }
    setSelected(new Set());
    await refresh();
  }

  async function bulkDelete() {
    for (const id of selected) {
      await api.delete(id);
    }
    setSelected(new Set());
    await refresh();
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b bg-white px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-medium">Listen Later</h1>
          <p className="text-sm text-slate-600">Enterprise listening queue</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            className="border rounded-lg px-3 py-2 text-sm w-48"
            placeholder="Work email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            type="button"
            className="rounded-lg bg-emerald-800 text-white px-4 py-2 text-sm font-medium"
            onClick={() => login(email).then(refresh)}
          >
            Sign in
          </button>
          <Link href="http://127.0.0.1:8765/" className="text-sm text-emerald-800 underline">
            Classic player
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 grid lg:grid-cols-[360px_1fr] gap-6">
        <section className="space-y-4">
          <div className="bg-white rounded-xl border p-4 space-y-3">
            <textarea
              className="w-full border rounded-lg p-2 text-sm min-h-[80px]"
              placeholder="Paste article URLs…"
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
            />
            <button
              type="button"
              onClick={() => addLinks().catch(console.error)}
              className="w-full rounded-lg bg-emerald-800 text-white py-2 text-sm font-medium"
            >
              Add to queue
            </button>
          </div>

          <div className="bg-white rounded-xl border p-4">
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
              placeholder="Search library…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex flex-wrap gap-1 mb-3">
              {(['active', 'in_progress', 'listened', 'archived'] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`text-xs px-2 py-1 rounded-full border ${tab === t ? 'bg-emerald-800 text-white border-emerald-800' : ''}`}
                >
                  {t.replace('_', ' ')}
                </button>
              ))}
            </div>
            {selected.size > 0 && (
              <div className="flex gap-2 mb-3 text-xs">
                <button type="button" className="underline" onClick={() => bulkArchive()}>
                  Archive ({selected.size})
                </button>
                <button type="button" className="underline text-red-700" onClick={() => bulkDelete()}>
                  Delete
                </button>
              </div>
            )}
            <ul className="space-y-2 max-h-[420px] overflow-auto">
              {visible.map((it) => (
                <li
                  key={it.id}
                  className={`border rounded-lg p-2 text-sm cursor-pointer ${currentId === it.id ? 'ring-2 ring-emerald-700' : ''}`}
                >
                  <div className="flex gap-2 items-start">
                    <input
                      type="checkbox"
                      checked={selected.has(it.id)}
                      onChange={(e) => {
                        const n = new Set(selected);
                        if (e.target.checked) n.add(it.id);
                        else n.delete(it.id);
                        setSelected(n);
                      }}
                    />
                    <button
                      type="button"
                      className="text-left flex-1"
                      onClick={() => {
                        setCurrentId(it.id);
                        setIdx(it.progress_sentence || 0);
                        setPlaying(false);
                        synth?.cancel();
                      }}
                    >
                      <div className="font-medium line-clamp-2">{it.title || it.source_url || 'Untitled'}</div>
                      <div className="text-xs text-slate-500">
                        {it.status !== 'ready' ? it.status : `${wordCount(it.text || '')} words · ${it.state}`}
                      </div>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="bg-white rounded-xl border p-6 min-h-[480px]">
          {!current ? (
            <p className="text-slate-600">Select an item from the library to listen.</p>
          ) : !current.text ? (
            <div className="space-y-3">
              <h2 className="text-xl font-medium">{current.title || 'Preparing…'}</h2>
              <p className="text-slate-600">Status: {current.status}</p>
              {current.status === 'failed' && (
                <button
                  type="button"
                  className="text-emerald-800 underline text-sm"
                  onClick={() => api.retry(current.id).then(refresh)}
                >
                  Retry extraction
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-3 items-center mb-4">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="rounded-lg bg-emerald-800 text-white px-4 py-2 text-sm font-medium"
                >
                  {playing ? 'Pause' : 'Play'}
                </button>
                <label className="text-sm flex items-center gap-2">
                  Speed
                  <select value={rate} onChange={(e) => setRate(+e.target.value)} className="border rounded px-2 py-1">
                    {[0.8, 1, 1.2, 1.4, 1.6].map((r) => (
                      <option key={r} value={r}>
                        {r}×
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="text-sm underline"
                  onClick={() =>
                    api.share(current.id).then((r) => navigator.clipboard.writeText(r.url))
                  }
                >
                  Copy share link
                </button>
              </div>
              <h2 className="text-xl font-serif mb-4">{current.title}</h2>
              <div className="prose prose-slate max-w-none text-lg leading-relaxed max-h-[520px] overflow-auto">
                {sentences.map((s, i) => (
                  <span
                    key={i}
                    className={i === idx ? 'bg-amber-200 rounded px-0.5' : ''}
                    onClick={() => {
                      setIdx(i);
                      if (playing) {
                        synth?.cancel();
                        speakAt(i);
                      }
                    }}
                  >
                    {s.s}{' '}
                  </span>
                ))}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
