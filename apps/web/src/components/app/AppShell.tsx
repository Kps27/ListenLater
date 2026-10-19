'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { EpisodeCard } from '@/components/ui/EpisodeCard';
import { FullPlayer } from '@/components/ui/FullPlayer';
import { InboxItem } from '@/components/ui/InboxItem';
import { MiniPlayer } from '@/components/ui/MiniPlayer';
import { QueueRow } from '@/components/ui/QueueRow';
import { SentenceHighlighter } from '@/components/ui/SentenceHighlighter';
import { Toast } from '@/components/ui/Toast';
import { PlanOffer } from '@/components/app/PlanOffer';
import { SignInPanel } from '@/components/app/SignInPanel';
import { BrandMark } from '@/components/site/BrandMark';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { api } from '@/lib/api';
import { apiBase, fetchSite, formatMoney } from '@/lib/site';
import { formatQueued } from '@/design/types';
import {
  INITIAL_ITEMS,
  SAVE_ADDRESS,
  SLEEPS,
  SPEEDS,
  failCopy,
  minutes,
  toEpisode,
  type Item,
} from '@/design/mock';

type Tab = 'listen' | 'add' | 'settings';
type SourceKind = 'url' | 'paste' | 'forward';
type ListenFilter = 'all' | SourceKind;

const TABS: { id: Tab; label: string }[] = [
  { id: 'listen', label: 'Listen' },
  { id: 'add', label: 'Add' },
  { id: 'settings', label: 'Settings' },
];

function sourceKind(item: Item): SourceKind {
  if (item.source_channel === 'paste') return 'paste';
  if (item.source_channel === 'email' || item.held) return 'forward';
  return 'url';
}

function kindName(kind: SourceKind) {
  if (kind === 'paste') return 'Pasted';
  if (kind === 'forward') return 'Forward';
  return 'URL';
}

function copyOpensWith(title: string, sentence?: string) {
  const head = (sentence || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const name = title.replace(/\s+/g, ' ').trim().toLowerCase();
  return Boolean(name) && (head === name || head.startsWith(`${name}.`) || head.startsWith(`${name} `));
}

function isUnheard(item: Item) {
  return !item.held && item.state !== 'listened' && item.state !== 'archived' && item.status !== 'blocked' && item.status !== 'failed';
}

const LIST_PAGE_SIZE = 10;
const PREFERRED_VOICES = ['Samantha', 'Rishi', 'Daniel', 'Moira', 'Karen', 'Google US English', 'Google UK English Female', 'Google UK English Male'];

function voiceChoices(all: SpeechSynthesisVoice[]) {
  const used = new Set<string>();
  const out: SpeechSynthesisVoice[] = [];
  const add = (voice: SpeechSynthesisVoice | undefined) => {
    if (!voice || used.has(voice.voiceURI)) return;
    used.add(voice.voiceURI);
    out.push(voice);
  };
  for (const name of PREFERRED_VOICES) {
    add(all.find((voice) => voice.name === name || voice.name.startsWith(`${name} `)));
  }
  for (const voice of all) {
    if (!voice.lang.toLowerCase().startsWith('en')) continue;
    add(voice);
    if (out.length >= 8) break;
  }
  if (!out.length) all.slice(0, 8).forEach(add);
  return out;
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function linksFrom(raw: string) {
  const explicit = raw.match(/https?:\/\/[^\s<>]+/g) || [];
  const cleaned = explicit.map((url) => url.replace(/[),.;]+$/, ''));
  if (cleaned.length) return cleaned;
  return raw
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter((part) => /^[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(part))
    .map((part) => `https://${part}`);
}

function readingFrom(row: Record<string, unknown>) {
  const text = String(row.text || '').replace(/\r/g, '');
  const raw = row.sentences;
  const sentences: string[] = [];
  const starts: number[] = [];
  if (Array.isArray(raw) && raw.length) {
    const first = raw[0];
    if (typeof first === 'string') {
      sentences.push(...raw.map(String).filter(Boolean));
    } else if (first && typeof first === 'object' && 's' in first) {
      for (const sentence of raw) {
        const s = String((sentence as { s: string }).s || '').trim();
        if (s) sentences.push(s);
      }
    } else if (first && typeof first === 'object' && 'start' in first && text) {
      for (const sentence of raw) {
        const span = sentence as { start: number; end: number };
        const s = text.slice(span.start, span.end).trim();
        if (!s) continue;
        sentences.push(s);
        starts.push(span.start);
      }
    }
  }
  if (!sentences.length && text) {
    const bits = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((sentence) => sentence.trim()).filter(Boolean) || [text];
    sentences.push(...bits);
  }
  return { sentences, paragraphs: groupParagraphs(text, sentences, starts) };
}

function groupParagraphs(text: string, sentences: string[], starts: number[]) {
  if (!sentences.length) return [] as string[][];
  const chunks = text.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  if (chunks.length <= 1) return [sentences];
  if (!starts.length) return alignSentences(chunks, sentences);
  const ranges: { start: number; end: number }[] = [];
  let cursor = 0;
  for (const chunk of chunks) {
    const at = text.indexOf(chunk, cursor);
    const start = at >= 0 ? at : cursor;
    ranges.push({ start, end: start + chunk.length });
    cursor = start + chunk.length;
  }
  const groups = ranges.map(() => [] as string[]);
  sentences.forEach((sentence, i) => {
    const pos = starts[i] ?? ranges[ranges.length - 1].start;
    let gi = ranges.findIndex((range) => pos >= range.start && pos <= range.end);
    if (gi < 0) gi = ranges.length - 1;
    groups[gi].push(sentence);
  });
  const filled = groups.filter((group) => group.length);
  return filled.length ? filled : [sentences];
}

function alignSentences(chunks: string[], sentences: string[]) {
  const groups = chunks.map(() => [] as string[]);
  let gi = 0;
  for (const sentence of sentences) {
    const key = sentence.slice(0, Math.min(32, sentence.length));
    while (gi < chunks.length - 1 && !chunks[gi].includes(key)) gi += 1;
    groups[gi].push(sentence);
  }
  const filled = groups.filter((group) => group.length);
  return filled.length ? filled : [sentences];
}

function applyRow(row: Record<string, unknown>): Item {
  const url = String(row.source_url || '');
  const site = String(row.site_name || hostOf(url) || 'Saved');
  const reading = readingFrom(row);
  return {
    id: String(row.id),
    title: String(row.title || site),
    site_name: site,
    source_url: url,
    source_channel: (row.source_channel as Item['source_channel']) || 'web',
    status: (row.status as Item['status']) || 'queued',
    fail_reason: (row.fail_reason as string) || null,
    state: (row.state as Item['state']) || 'up_next',
    position: Number(row.position) || 0,
    progress_sentence: Number(row.progress_sentence) || 0,
    sentences: reading.sentences,
    paragraphs: reading.paragraphs,
  };
}

export function AppShell() {
  const [items, setItems] = useState<Item[]>(
    INITIAL_ITEMS.filter((item) => item.status === 'ready' || item.source_channel === 'email' || item.held)
  );
  const [tab, setTab] = useState<Tab>('listen');
  const [menuOpen, setMenuOpen] = useState(false);
  const [listenFilter, setListenFilter] = useState<ListenFilter>('all');
  const [listPage, setListPage] = useState(1);
  const [currentId, setCurrentId] = useState('atl');
  const [index, setIndex] = useState(2);
  const [playing, setPlaying] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [showText, setShowText] = useState(false);
  const [speedI, setSpeedI] = useState(2);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceId, setVoiceId] = useState('');
  const [sleepI, setSleepI] = useState(0);
  const [plan, setPlan] = useState<'free' | 'plus'>('free');
  const [freeSeconds, setFreeSeconds] = useState(60);
  const [heardMap, setHeardMap] = useState<Record<string, number>>({});
  const [step, setStep] = useState<'boot' | 'signin' | 'offer' | 'app'>('boot');
  const [monthLabel, setMonthLabel] = useState('$2');
  const [yearLabel, setYearLabel] = useState('$10');
  const [planReady, setPlanReady] = useState(false);
  const [toast, setToast] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [urlDraft, setUrlDraft] = useState('');
  const [textDraft, setTextDraft] = useState('');
  const [allow, setAllow] = useState<string[]>([]);
  const [signOpen, setSignOpen] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('ll-theme');
    const next = savedTheme === 'light' || savedTheme === 'dark'
      ? savedTheme
      : window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    const savedEmail = localStorage.getItem('ll-email');
    const token = localStorage.getItem('ll-token');
    const signed = Boolean(savedEmail && token && token !== 'dev-guest-token');
    if (signed && savedEmail) setAccount(savedEmail);
    setStep(signed ? 'app' : 'signin');
    try {
      const savedHeard = JSON.parse(localStorage.getItem('ll-heard-by-story') || '{}') as Record<string, number>;
      if (savedHeard && typeof savedHeard === 'object') setHeardMap(savedHeard);
    } catch {
      /* ignore a bad local value */
    }
  }, []);

  function chooseTheme(next: 'light' | 'dark') {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem('ll-theme', next);
  }

  async function signedIn(value: string) {
    localStorage.setItem('ll-email', value);
    setAccount(value);
    setSignOpen(false);
    setMenuOpen(false);
    let plus = localStorage.getItem('ll-plan') === 'plus';
    const bearer = localStorage.getItem('ll-token');
    if (bearer) {
      const res = await fetch(`${apiBase()}/v1/me/plan`, { headers: { Authorization: `Bearer ${bearer}` } });
      if (res.ok) {
        const data = (await res.json()) as { unlimited?: boolean };
        if (data.unlimited) plus = true;
      }
    }
    if (plus) {
      setPlan('plus');
      setStep('app');
      return;
    }
    setStep('offer');
  }

  function signOut() {
    localStorage.removeItem('ll-email');
    localStorage.removeItem('ll-token');
    setAccount(null);
    setPlan('free');
    setMenuOpen(false);
    setStep('signin');
  }

  useEffect(() => {
    const localPlus = localStorage.getItem('ll-plan') === 'plus';
    fetchSite().then((site) => {
      setFreeSeconds(site.free_listen_seconds);
      setMonthLabel(formatMoney(site.prices.month_cents, site.prices.currency));
      setYearLabel(formatMoney(site.prices.year_cents, site.prices.currency));
    });
    if (localPlus) {
      setPlan('plus');
      setPlanReady(true);
      return;
    }
    const bearer = localStorage.getItem('ll-token');
    if (!bearer || bearer === 'dev-guest-token') {
      setPlanReady(true);
      return;
    }
    fetch(`${apiBase()}/v1/me/plan`, { headers: { Authorization: `Bearer ${bearer}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { unlimited?: boolean; free_listen_seconds?: number } | null) => {
        if (!data) return;
        if (data.unlimited) setPlan('plus');
        if (data.free_listen_seconds) setFreeSeconds(data.free_listen_seconds);
      })
      .catch(() => undefined)
      .finally(() => setPlanReady(true));
  }, []);

  useEffect(() => {
    if (!playing || plan === 'plus' || !currentId) return;
    const id = window.setInterval(() => {
      setHeardMap((map) => ({ ...map, [currentId]: (map[currentId] || 0) + 1 }));
    }, 1000);
    return () => window.clearInterval(id);
  }, [playing, plan, currentId]);

  useEffect(() => {
    if (!planReady || plan === 'plus') return;
    localStorage.setItem('ll-heard-by-story', JSON.stringify(heardMap));
    if (currentId && (heardMap[currentId] || 0) >= freeSeconds) setPlaying(false);
  }, [heardMap, currentId, freeSeconds, plan, planReady]);

  const current = items.find((i) => i.id === currentId && i.status === 'ready') || null;
  const speed = SPEEDS[speedI];
  const readyUpNext = items
    .filter((i) => i.state === 'up_next' && i.status === 'ready' && !i.held)
    .sort((a, b) => a.position - b.position);
  const queuedMinutes = readyUpNext.reduce((sum, i) => sum + minutes(i), 0);

  const episode = current ? toEpisode({ ...current, progress_sentence: index }) : null;

  function note(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2200);
  }

  function playItem(item: Item, sentence = item.progress_sentence) {
    if (plan !== 'plus' && (heardMap[item.id] || 0) >= freeSeconds) {
      setCurrentId(item.id);
      setPlaying(false);
      note(`The free ${freeSeconds} seconds of this story are used.`);
      return;
    }
    if (item.status !== 'ready' || !item.sentences.length) return;
    setCurrentId(item.id);
    setIndex(Math.min(sentence, item.sentences.length - 1));
    setPlaying(true);
    setItems((list) =>
      list.map((i) => (i.id === item.id && i.state === 'up_next' ? { ...i, state: 'in_progress' } : i))
    );
  }

  function toggle() {
    if (current && plan !== 'plus' && (heardMap[current.id] || 0) >= freeSeconds) {
      setPlaying(false);
      note(`The free ${freeSeconds} seconds of this story are used.`);
      return;
    }
    if (!current) {
      const first = readyUpNext[0];
      if (first) playItem(first, 0);
      return;
    }
    setPlaying((v) => !v);
  }

  function finish() {
    if (!current) return;
    const stop = SLEEPS[sleepI] === 'End of piece';
    setItems((list) => list.map((i) => (i.id === current.id ? { ...i, state: 'listened', progress_sentence: 0 } : i)));
    setPlaying(false);
    if (stop) {
      note('Stopped at the end of this piece');
      return;
    }
    const next = readyUpNext.find((i) => i.id !== current.id);
    if (next) playItem(next, 0);
    else note('Up Next is clear');
  }

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const load = () => {
      const next = voiceChoices(synth.getVoices());
      setVoices(next);
      setVoiceId((current) => {
        if (current && next.some((voice) => voice.voiceURI === current)) return current;
        const saved = localStorage.getItem('ll-voice');
        if (saved && next.some((voice) => voice.voiceURI === saved)) return saved;
        return next[0]?.voiceURI || '';
      });
    };
    load();
    synth.addEventListener('voiceschanged', load);
    return () => synth.removeEventListener('voiceschanged', load);
  }, []);

  function pickVoice(id: string) {
    setVoiceId(id);
    localStorage.setItem('ll-voice', id);
  }

  useEffect(() => {
    if (!playing || !current) return;
    const utter = window.speechSynthesis;
    if (!utter) return;
    const sentence = current.sentences[index];
    if (!sentence) {
      finish();
      return;
    }
    utter.cancel();
    const u = new SpeechSynthesisUtterance(sentence);
    const live = utter.getVoices().find((voice) => voice.voiceURI === voiceId);
    if (live) {
      u.voice = live;
      u.lang = live.lang;
    }
    u.rate = speed;
    u.onend = () => setIndex((n) => n + 1);
    const timer = window.setTimeout(() => {
      utter.resume();
      utter.speak(u);
    }, 60);
    return () => {
      window.clearTimeout(timer);
      utter.cancel();
    };
    // finish is recreated each render; speech should follow the sentence, speed, and voice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, index, currentId, speed, voiceId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        toggle();
      } else if (e.key === 'j' || e.key === 'J') setIndex((n) => n + 1);
      else if (e.key === 'k' || e.key === 'K') setIndex((n) => Math.max(0, n - 1));
      else if (e.key === 'ArrowRight' && e.shiftKey) setIndex((n) => n + 2);
      else if (e.key === 'ArrowLeft' && e.shiftKey) setIndex((n) => Math.max(0, n - 4));
      else if (e.key === ']') setSpeedI((n) => Math.min(SPEEDS.length - 1, n + 1));
      else if (e.key === '[') setSpeedI((n) => Math.max(0, n - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function reorder(overId: string) {
    if (!dragId || dragId === overId) return;
    setItems((list) => {
      const queue = list.filter((i) => i.state === 'up_next' && i.status === 'ready' && !i.held).sort((a, b) => a.position - b.position);
      const from = queue.findIndex((i) => i.id === dragId);
      const to = queue.findIndex((i) => i.id === overId);
      if (from < 0 || to < 0) return list;
      const next = queue.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      const positions = new Map(next.map((item, i) => [item.id, i + 1]));
      return list.map((item) => (positions.has(item.id) ? { ...item, position: positions.get(item.id)! } : item));
    });
    setDragId(null);
  }

  const library = items.filter((item) => !item.held && item.state !== 'archived');
  const unheardCount = library.filter(isUnheard).length;
  const listenRows = library
    .filter((item) => listenFilter === 'all' || sourceKind(item) === listenFilter)
    .sort((a, b) => Number(isUnheard(b)) - Number(isUnheard(a)) || a.position - b.position);
  const listPageCount = Math.max(1, Math.ceil(listenRows.length / LIST_PAGE_SIZE));
  const listPageSafe = Math.min(listPage, listPageCount);
  const listPageRows = listenRows.slice((listPageSafe - 1) * LIST_PAGE_SIZE, listPageSafe * LIST_PAGE_SIZE);
  const incoming = items.filter(
    (item) => sourceKind(item) === 'forward' && (item.held || item.status === 'queued' || item.status === 'extracting')
  );

  const held = items.filter((i) => i.held);
  const blocked = items.filter((i) => i.status === 'blocked' || i.status === 'failed');

  function openPiece(item: Item) {
    if (item.status !== 'ready' || !item.sentences.length) return;
    setCurrentId(item.id);
    setIndex(0);
    setPlaying(false);
    setTab('listen');
  }

  async function follow(id: string) {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 1500));
      try {
        const row = await api.getItem(id);
        const item = { ...applyRow(row), position: -1000 };
        setItems((list) => list.map((entry) => (entry.id === id ? item : entry)));
        if (item.status === 'ready' && item.sentences.length) {
          setCurrentId(id);
          setIndex(0);
          setPlaying(false);
          note('Ready to hear');
          return;
        }
        if (item.status === 'failed' || item.status === 'blocked') {
          note(failCopy(item.fail_reason).title);
          return;
        }
      } catch {
        /* the reader may still be working */
      }
    }
  }

  async function loadRows(selectFirst = false) {
    try {
      const rows = await api.listRaw();
      const real = [...rows]
        .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
        .map((row, index) => ({ ...applyRow(row), position: -200 - index }))
        .filter((item) => item.state !== 'archived');
      if (!real.length) return;
      const demoIds = new Set(['atl', 'wsj', 'nyt', 'sub', 'heard', 'arch']);
      setItems((list) => {
        const savedIds = new Set(real.map((item) => item.id));
        const savedUrls = new Set(real.map((item) => item.source_url).filter(Boolean));
        const kept = list.filter((item) => !demoIds.has(item.id) && !savedIds.has(item.id) && !savedUrls.has(item.source_url));
        return [...real, ...kept];
      });
      if (selectFirst) {
        const playable = real.find((item) => item.status === 'ready' && item.sentences.length);
        if (playable) {
          setCurrentId(playable.id);
          setIndex(0);
        }
      }
      real.filter((item) => item.status === 'queued' || item.status === 'extracting').forEach((item) => follow(item.id));
    } catch {
      /* keep the list already on screen */
    }
  }

  useEffect(() => {
    if (step !== 'app') return;
    void loadRows(true);
    // Load saved articles when the library opens. follow is recreated each render and only starts polls.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  async function addUrls() {
    const urls = linksFrom(urlDraft);
    if (!urls.length) {
      note('Paste a link, like https://…');
      return;
    }
    const stamps: Item[] = urls.map((url, n) => ({
      id: `pending-${Date.now()}-${n}`,
      title: hostOf(url),
      site_name: hostOf(url),
      source_url: url,
      source_channel: 'web',
      status: 'extracting',
      fail_reason: null,
      state: 'up_next',
      position: -1000 - n,
      progress_sentence: 0,
      sentences: [],
    }));
    setItems((list) => [...stamps, ...list]);
    setUrlDraft('');
    setTab('listen');
    note('Added to Listen');
    try {
      const res = await api.createUrls(urls);
      const created = res.items || [];
      setItems((list) => {
        const pending = new Set(stamps.map((item) => item.id));
        const saved = created.map((row, n) => ({ ...applyRow(row), position: -1000 - n, state: 'up_next' as const }));
        const savedIds = new Set(saved.map((item) => item.id));
        return [...saved, ...list.filter((item) => !pending.has(item.id) && !savedIds.has(item.id))];
      });
      created.forEach((row) => {
        const item = applyRow(row);
        if (item.status === 'ready' && item.sentences.length) openPiece(item);
        else if (item.status === 'failed' || item.status === 'blocked') note(failCopy(item.fail_reason).title);
        else follow(item.id);
      });
      if (!created.length) note('Nothing new was saved');
    } catch (err) {
      const code = (err as { detail?: { error?: string } }).detail?.error;
      setItems((list) =>
        list.map((item) =>
          stamps.some((stamp) => stamp.id === item.id)
            ? { ...item, status: 'failed', fail_reason: code || 'network_error' }
            : item
        )
      );
      note(code === 'guest_limit' ? 'The guest queue is full. Sign in to add more.' : 'Could not save that link.');
    }
  }

  function addPasted() {
    const text = textDraft.trim();
    if (text.split(/\s+/).length < 5) {
      note('Paste a bit more of the article');
      return;
    }
    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((sentence) => sentence.trim()).filter(Boolean) || [text];
    const local: Item = {
      id: `paste-${Date.now()}`,
      title: text.slice(0, 80),
      site_name: 'Pasted text',
      source_url: '',
      source_channel: 'paste',
      status: 'ready',
      fail_reason: null,
      state: 'up_next',
      position: -1000,
      progress_sentence: 0,
      sentences,
      paragraphs: groupParagraphs(text, sentences, []),
    };
    setItems((list) => [local, ...list]);
    openPiece(local);
    setTextDraft('');
    note('Added to Listen');
    api
      .createText(local.title, text)
      .then((res) => {
        const row = res.items?.[0];
        if (!row) return;
        const saved = { ...applyRow(row), position: -1000 };
        setItems((list) => list.map((item) => (item.id === local.id ? saved : item)));
        setCurrentId(saved.id);
      })
      .catch(() => undefined);
  }

  function accountControls() {
    return (
    <>
      <div className="account-tools">
        <div className="theme-pair" role="group" aria-label="Theme">
          <button type="button" aria-pressed={theme === 'light'} aria-label="Light" onClick={() => chooseTheme('light')}>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.75" />
              <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.1 5.1l1.6 1.6M17.3 17.3l1.6 1.6M18.9 5.1l-1.6 1.6M6.7 17.3l-1.6 1.6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
          <button type="button" aria-pressed={theme === 'dark'} aria-label="Dark" onClick={() => chooseTheme('dark')}>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path d="M20 14.5A8 8 0 1 1 9.5 4 6.2 6.2 0 0 0 20 14.5z" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        {account ? (
          <>
            <button
              type="button"
              className="account-chip"
              onClick={() => {
                setMenuOpen(false);
                setTab('settings');
              }}
            >
              <span>{account}</span>
            </button>
            <button type="button" onClick={signOut}>
              Sign out
            </button>
          </>
        ) : (
          <button
            type="button"
            className="primary"
            onClick={() => {
              setMenuOpen(false);
              setSignOpen(true);
            }}
          >
            Sign in
          </button>
        )}
      </div>
    </>
    );
  }

  const storyCapped = plan !== 'plus' && Boolean(currentId) && (heardMap[currentId] || 0) >= freeSeconds;

  if (step === 'boot') return <div className="ll app-shell" />;
  if (step === 'signin') {
    return (
      <div className="ll gate-page">
        <SiteHeader />
        <SignInPanel open locked onClose={() => { window.location.href = '/'; }} onSignedIn={(value) => void signedIn(value)} />
        <SiteFooter />
      </div>
    );
  }
  if (step === 'offer' && account) {
    return (
      <div className="ll gate-page">
        <SiteHeader />
        <PlanOffer
          email={account}
          seconds={freeSeconds}
          onFree={() => setStep('app')}
          onSubscribed={() => {
            setPlan('plus');
            setStep('app');
          }}
        />
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="ll app-shell">
      <header className="brandbar">
        <div className="brand-side">
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="app-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="menu-bars" />
            <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
          </button>
          <Link href="/" className="brand" aria-label="Listen Later">
            <BrandMark />
          </Link>
        </div>
        <div className="brand-end">
          <nav className="band-nav" aria-label="Primary">
            {TABS.filter((t) => t.id !== 'settings').map((t) => (
              <button key={t.id} type="button" className="nav-item" aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
            {plan !== 'plus' ? (
              <Link href="/pricing" className="nav-item" onClick={() => setMenuOpen(false)}>
                Plus
              </Link>
            ) : null}
            <button type="button" className="nav-item" aria-current={tab === 'settings' ? 'page' : undefined} onClick={() => setTab('settings')}>
              Settings
            </button>
          </nav>
          <div className="brand-actions">{accountControls()}</div>
        </div>
      </header>
      {menuOpen ? (
        <>
          <button type="button" className="nav-scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          <div className="nav-drawer" id="app-menu" role="dialog" aria-label="Account">
            <p className="nav-kicker">Account</p>
            <div className="nav-account">{accountControls()}</div>
          </div>
        </>
      ) : null}
      <SignInPanel open={signOpen} onClose={() => setSignOpen(false)} onSignedIn={(value) => void signedIn(value)} />

      <main className="stage">
        {storyCapped ? (
          <div className="limit-note" role="status">
            <p>
              This story’s free {freeSeconds} seconds are used. Another story has its own {freeSeconds} seconds. Plus is {monthLabel} a month, or {yearLabel} a year.
            </p>
            <Link href="/pricing" className="primary">
              See plans
            </Link>
          </div>
        ) : null}
        <header className="topbar">
          <h1>
            {tab === 'listen' ? 'Listen' : tab === 'add' ? 'Add' : 'Settings'}
            {tab === 'listen' && unheardCount > 0 ? <span className="unheard-total">{unheardCount} unheard</span> : null}
          </h1>
          <button type="button" className="avatar" aria-label="Settings" onClick={() => setTab('settings')}>
            K
          </button>
        </header>

        {tab === 'listen' && (
          <>
            <div className="filters" role="tablist" aria-label="Article type">
              {(['all', 'url', 'paste', 'forward'] as ListenFilter[]).map((kind) => {
                const count =
                  kind === 'all' ? unheardCount : library.filter((item) => isUnheard(item) && sourceKind(item) === kind).length;
                const label = kind === 'all' ? 'All' : kindName(kind);
                return (
                  <button key={kind} type="button" className="ghost" aria-pressed={listenFilter === kind} onClick={() => { setListenFilter(kind); setListPage(1); }}>
                    {label}
                    {count > 0 ? <span className="quiet-count">{count}</span> : null}
                  </button>
                );
              })}
            </div>
            <div className="listen-hero">
              {episode ? (
                <EpisodeCard episode={episode} playing={playing} onToggle={toggle} />
              ) : (
                <EmptyState title="Nothing to hear" body="Add a URL or paste on the Add tab. It will show up here." action={{ label: 'Add something', onClick: () => setTab('add') }} />
              )}
            </div>
            {blocked.map((item) => {
              const copy = failCopy(item.fail_reason);
              return (
                <InboxItem
                  key={item.id}
                  tone="warn"
                  title={copy.title}
                  body={`${kindName(sourceKind(item))}. ${item.title}. ${copy.body}`}
                  actions={[
                    { label: 'Open in browser', onClick: () => item.source_url && window.open(item.source_url, '_blank', 'noopener') },
                    { label: 'Dismiss', onClick: () => setItems((list) => list.filter((entry) => entry.id !== item.id)) },
                  ]}
                />
              );
            })}
            <p className="section-label">
              {listenRows.length} in this list
              {listenFilter === 'all' && queuedMinutes > 0 ? ` · ${formatQueued(queuedMinutes)}` : ''}
            </p>
            {listenRows.length === 0 ? (
              <EmptyState title="Nothing in this group" body="URL, pasted copy, and forwards each land in their own group." />
            ) : (
              listPageRows.map((item) => (
                <div
                  key={item.id}
                  draggable={item.status === 'ready' && item.state !== 'listened'}
                  onDragStart={() => setDragId(item.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => reorder(item.id)}
                >
                  <QueueRow
                    episode={toEpisode(item)}
                    meta={
                      item.status !== 'ready'
                        ? `${kindName(sourceKind(item))} · Getting the article…`
                        : item.state === 'listened'
                          ? `${kindName(sourceKind(item))} · Heard`
                          : `${kindName(sourceKind(item))} · ${item.site_name} · ${minutes(item)} min`
                    }
                    onOpen={item.status === 'ready' ? () => playItem(item) : undefined}
                  />
                </div>
              ))
            )}
            {listPageCount > 1 ? (
              <nav className="list-pages" aria-label="List pages">
                {Array.from({ length: listPageCount }, (_, index) => {
                  const number = index + 1;
                  return (
                    <button
                      key={number}
                      type="button"
                      aria-current={number === listPageSafe ? 'page' : undefined}
                      onClick={() => {
                        setListPage(number);
                        document.querySelector('.stage')?.scrollTo({ top: 0 });
                      }}
                    >
                      {number}
                    </button>
                  );
                })}
              </nav>
            ) : null}
          </>
        )}

        {tab === 'add' && (
          <div className="intake">
            <section className="intake-card">
              <h2>URL</h2>
              <p className="howto">Paste a link. It joins Listen and is read from the article.</p>
              <form
                className="add-bar"
                onSubmit={(event) => {
                  event.preventDefault();
                  addUrls();
                }}
              >
                <input
                  className="field"
                  placeholder="https://"
                  value={urlDraft}
                  onChange={(event) => setUrlDraft(event.target.value)}
                  aria-label="Article URL"
                />
                <button type="submit" className="primary">
                  Add URL
                </button>
              </form>
            </section>
            <section className="intake-card">
              <h2>Pasted copy</h2>
              <p className="howto">Paste the article itself when a page will not open.</p>
              <textarea className="area" placeholder="Paste the article text" value={textDraft} onChange={(event) => setTextDraft(event.target.value)} />
              <button type="button" className="primary" onClick={addPasted}>
                Add pasted copy
              </button>
            </section>
            <section className="intake-card">
              <h2>Forwards</h2>
              <p className="incoming-count">
                {incoming.length} <span>incoming</span>
              </p>
              <p className="howto">Newsletters forwarded to your save address wait here until you keep them.</p>
              <div className="address">
                <code>{SAVE_ADDRESS}</code>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(SAVE_ADDRESS);
                    note('Address copied');
                  }}
                >
                  Copy
                </button>
              </div>
              {held.length > 0 ? (
                <InboxItem
                  title={held[0].batch || 'Forwarded mail'}
                  body={`${held.length} from ${held[0].sender}. Unknown senders stay incoming.`}
                  actions={[
                    {
                      label: 'Keep all',
                      onClick: () => {
                        setItems((list) => list.map((item) => (item.held ? { ...item, held: false, status: 'extracting' } : item)));
                        setAllow((list) => [...list, held[0].sender || 'sender']);
                        note('Kept. They will show up in Listen when ready.');
                      },
                    },
                    { label: 'Dismiss', onClick: () => setItems((list) => list.filter((item) => !item.held)) },
                  ]}
                />
              ) : (
                <p className="howto">No forwarded mail is waiting.</p>
              )}
            </section>
          </div>
        )}

        {tab === 'settings' && (
          <div className="settings-list">
            <Link href="/pricing" className="settings-row">
              <span>Plan</span>
              <span>{plan === 'plus' ? 'Plus · unlimited' : `Free · ${freeSeconds}s per story`}</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                if (!voices.length) return;
                const index = voices.findIndex((voice) => voice.voiceURI === voiceId);
                pickVoice(voices[(index + 1) % voices.length].voiceURI);
              }}
            >
              <span>Voice</span>
              <span>{voices.find((voice) => voice.voiceURI === voiceId)?.name || 'This device'}</span>
            </button>
            <button type="button" onClick={() => setSpeedI((n) => (n + 1) % SPEEDS.length)}>
              <span>Default speed</span>
              <span>{SPEEDS[speedI]}×</span>
            </button>
            <div className="settings-row">
              <span>Downloads</span>
              <span>Wi-Fi · next 10</span>
            </div>
            <div className="settings-row">
              <span>Allow-list</span>
              <span>{allow.length ? allow.join(', ') : 'No senders yet'}</span>
            </div>
            <button type="button" onClick={() => note('Export started')}>
              <span>Export</span>
              <span>JSON</span>
            </button>
            <button type="button" className="danger" onClick={() => note('Delete stays on the account API in the next step')}>
              <span>Delete account</span>
            </button>
          </div>
        )}
      </main>

      <aside className="stage-player">
        {episode ? (
          <div className="now-stage">
            <FullPlayer
              episode={episode}
              playing={playing}
              sentences={current?.sentences}
              paragraphs={current?.paragraphs}
              sentenceIndex={index}
              onToggle={toggle}
              onBack={() => setIndex((n) => Math.max(0, n - 4))}
              onForward={() => setIndex((n) => n + 2)}
              onJump={setIndex}
              speedLabel={`${speed}×`}
              voiceLabel={voices.find((voice) => voice.voiceURI === voiceId)?.name || 'Voice'}
              voices={voices.map((voice) => ({ id: voice.voiceURI, label: `${voice.name} · ${voice.lang}` }))}
              voiceId={voiceId}
              sleepLabel={SLEEPS[sleepI]}
              onSpeed={() => setSpeedI((n) => (n + 1) % SPEEDS.length)}
              onPickVoice={pickVoice}
              onSleep={() => setSleepI((n) => (n + 1) % SLEEPS.length)}
              onScrub={(ratio) => current && setIndex(Math.round(ratio * (current.sentences.length - 1)))}
            />
            <div key={episode.id} className="now-read story-copy">
              {episode.title && !copyOpensWith(episode.title, current?.sentences?.[0]) ? (
                <h1 className="copy-title">{episode.title}</h1>
              ) : null}
              <SentenceHighlighter sentences={current?.sentences || []} paragraphs={current?.paragraphs} index={index} onJump={setIndex} />
            </div>
          </div>
        ) : (
          <EmptyState title="Nothing playing" body="Choose an article in Listen, or add one." />
        )}
      </aside>

      {episode && tab !== 'listen' ? (
        <div className="dock">
          <MiniPlayer episode={episode} playing={playing} onToggle={toggle} onExpand={() => setSheet(true)} />
        </div>
      ) : null}

      {sheet && episode ? (
        <div className="player-sheet">
          <button type="button" className="sheet-close" onClick={() => setSheet(false)}>
            Close
          </button>
          <FullPlayer
            episode={episode}
            playing={playing}
            showText={showText}
            sentences={current?.sentences}
            paragraphs={current?.paragraphs}
            sentenceIndex={index}
            onToggle={toggle}
            onToggleText={() => setShowText((v) => !v)}
            onBack={() => setIndex((n) => Math.max(0, n - 4))}
            onForward={() => setIndex((n) => n + 2)}
            onJump={setIndex}
            speedLabel={`${speed}×`}
            voiceLabel={voices.find((voice) => voice.voiceURI === voiceId)?.name || 'Voice'}
            voices={voices.map((voice) => ({ id: voice.voiceURI, label: `${voice.name} · ${voice.lang}` }))}
            voiceId={voiceId}
            sleepLabel={SLEEPS[sleepI]}
            onSpeed={() => setSpeedI((n) => (n + 1) % SPEEDS.length)}
            onPickVoice={pickVoice}
            onSleep={() => setSleepI((n) => (n + 1) % SLEEPS.length)}
            onScrub={(ratio) => current && setIndex(Math.round(ratio * (current.sentences.length - 1)))}
          />
        </div>
      ) : null}

      {toast ? (
        <div style={{ position: 'fixed', left: '50%', bottom: 120, transform: 'translateX(-50%)', zIndex: 40 }}>
          <Toast message={toast} />
        </div>
      ) : null}
      <SiteFooter />
    </div>
  );
}
