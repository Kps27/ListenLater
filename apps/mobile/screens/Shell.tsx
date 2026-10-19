import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, clearSession, Item, splitSentences } from '../lib/api';
import { colors } from '../theme';

type Tab = 'listen' | 'add' | 'settings';
const SPEEDS = [1, 1.25, 1.5, 1.75, 2];

export function Shell({
  email,
  plus,
  onSignOut,
  showTour,
  onTourDone,
}: {
  email: string;
  plus: boolean;
  onSignOut: () => void;
  showTour: boolean;
  onTourDone: () => void;
}) {
  const [tab, setTab] = useState<Tab>(showTour ? 'add' : 'listen');
  const [tour, setTour] = useState(showTour ? 0 : -1);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [paste, setPaste] = useState('');
  const [note, setNote] = useState('');
  const [current, setCurrent] = useState<Item | null>(null);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedI, setSpeedI] = useState(1);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [freeSeconds, setFreeSeconds] = useState(60);
  const [heard, setHeard] = useState(0);
  const playingRef = useRef(false);
  const idxRef = useRef(0);
  const heardMap = useRef<Record<string, number>>({});

  const refresh = useCallback(async () => {
    try {
      setItems(await api.listItems());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => setLoading(false));
    api.plan().then((data) => {
      if (data.free_listen_seconds) setFreeSeconds(data.free_listen_seconds);
    }).catch(() => undefined);
  }, [refresh]);

  useEffect(() => {
    if (!playing || plus || !current) return;
    const timer = setInterval(() => {
      setHeard((n) => {
        const next = n + 1;
        if (current) heardMap.current[current.id] = next;
        if (next >= freeSeconds) {
          Speech.stop();
          playingRef.current = false;
          setPlaying(false);
          setNote(`This story’s free ${freeSeconds} seconds are used.`);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [playing, plus, current, freeSeconds]);

  const speakAt = useCallback((i: number, sentences: string[], item: Item) => {
    if (!playingRef.current) return;
    if (i >= sentences.length) {
      playingRef.current = false;
      setPlaying(false);
      api.patch(item.id, { state: 'listened', progress_sentence: 0 }).then(refresh).catch(() => undefined);
      return;
    }
    idxRef.current = i;
    setIdx(i);
    Speech.speak(sentences[i], {
      rate: SPEEDS[speedI],
      onDone: () => speakAt(i + 1, sentences, item),
      onStopped: () => undefined,
      onError: () => {
        playingRef.current = false;
        setPlaying(false);
      },
    });
  }, [refresh, speedI]);

  function toggle(item: Item) {
    if (!item.text) return;
    const used = current?.id === item.id ? heard : heardMap.current[item.id] || 0;
    if (!plus && used >= freeSeconds) {
      setCurrent(item);
      setPlayerOpen(true);
      setHeard(used);
      setNote(`This story’s free ${freeSeconds} seconds are used.`);
      return;
    }
    if (playing && current?.id === item.id) {
      Speech.stop();
      playingRef.current = false;
      setPlaying(false);
      api.patch(item.id, { progress_sentence: idxRef.current, state: 'in_progress' }).catch(() => undefined);
      return;
    }
    Speech.stop();
    setCurrent(item);
    setPlayerOpen(true);
    if (current?.id !== item.id) setHeard(heardMap.current[item.id] || 0);
    const sentences = splitSentences(item.text);
    const start = item.progress_sentence || 0;
    idxRef.current = start;
    setIdx(start);
    playingRef.current = true;
    setPlaying(true);
    api.patch(item.id, { state: 'in_progress' }).catch(() => undefined);
    speakAt(start, sentences, item);
  }

  async function addUrl() {
    const value = url.trim();
    if (!value) return;
    setNote('');
    try {
      await api.createUrls([value]);
      setUrl('');
      setNote('Added to Listen');
      await refresh();
      setTab('listen');
    } catch {
      setNote('That link was not saved.');
    }
  }

  async function addPaste() {
    const value = paste.trim();
    if (value.length < 40) {
      setNote('Paste a little more of the article.');
      return;
    }
    try {
      await api.createText(value);
      setPaste('');
      setNote('Added to Listen');
      await refresh();
      setTab('listen');
    } catch {
      setNote('That text was not saved.');
    }
  }

  const sentences = current?.text ? splitSentences(current.text) : [];
  const ready = items.filter((item) => item.state !== 'archived');

  function nextTour() {
    if (tour >= 2) {
      setTour(-1);
      setTab('add');
      onTourDone();
      return;
    }
    const next = tour + 1;
    setTour(next);
    setTab(next === 1 ? 'listen' : 'settings');
  }

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Text style={styles.brand}>Listen Later</Text>
        <Text style={styles.who} numberOfLines={1}>{email}</Text>
      </View>

      {tab === 'listen' ? (
        <ScrollView contentContainerStyle={styles.list}>
          <Text style={styles.h1}>Listen</Text>
          {loading ? <ActivityIndicator color={colors.fill} /> : null}
          {!loading && ready.length === 0 ? <Text style={styles.body}>Nothing to hear yet. Add a link.</Text> : null}
          {ready.map((item) => (
            <Pressable key={item.id} style={[styles.row, current?.id === item.id && styles.rowOn]} onPress={() => { setCurrent(item); setPlayerOpen(true); }}>
              <View style={styles.mark}><Text style={styles.markText}>{(item.site_name || item.title || 'LL').slice(0, 2).toUpperCase()}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={2}>{item.title || item.source_url || 'Untitled'}</Text>
                <Text style={styles.meta}>{item.status === 'ready' ? item.state : item.status}{item.site_name ? ` · ${item.site_name}` : ''}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {tab === 'add' ? (
        <ScrollView contentContainerStyle={styles.list}>
          <Text style={styles.h1}>Add</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>URL</Text>
            <Text style={styles.body}>Paste a link. It joins Listen and is read from the article.</Text>
            <TextInput style={styles.input} autoCapitalize="none" placeholder="https://" placeholderTextColor={colors.muted} value={url} onChangeText={setUrl} />
            <Pressable style={styles.primary} onPress={() => void addUrl()}><Text style={styles.primaryText}>Add URL</Text></Pressable>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pasted copy</Text>
            <Text style={styles.body}>Paste the article itself when a page will not open.</Text>
            <TextInput style={[styles.input, styles.area]} multiline placeholder="Paste the article text" placeholderTextColor={colors.muted} value={paste} onChangeText={setPaste} />
            <Pressable style={styles.primary} onPress={() => void addPaste()}><Text style={styles.primaryText}>Add pasted copy</Text></Pressable>
          </View>
        </ScrollView>
      ) : null}

      {tab === 'settings' ? (
        <ScrollView contentContainerStyle={styles.list}>
          <Text style={styles.h1}>Settings</Text>
          <View style={styles.setting}><Text style={styles.rowTitle}>Plan</Text><Text style={styles.meta}>{plus ? 'Plus' : `Free · ${freeSeconds}s per story`}</Text></View>
          <Pressable style={styles.setting} onPress={() => setSpeedI((n) => (n + 1) % SPEEDS.length)}>
            <Text style={styles.rowTitle}>Speed</Text><Text style={styles.meta}>{SPEEDS[speedI]}×</Text>
          </Pressable>
          <Text style={styles.body}>{plus ? 'Plus continues past the free preview. Use is capped in the terms.' : `Each story includes ${freeSeconds} seconds. Plus is $1 a month, or $10 a year.`}</Text>
          <Pressable style={styles.ghost} onPress={() => { Speech.stop(); void clearSession().then(onSignOut); }}>
            <Text style={styles.ghostText}>Sign out</Text>
          </Pressable>
        </ScrollView>
      ) : null}

      {note ? <Text style={styles.toast}>{note}</Text> : null}

      {current && !playerOpen ? (
        <Pressable style={styles.dock} onPress={() => setPlayerOpen(true)}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle} numberOfLines={1}>{current.title || 'Now playing'}</Text>
            <Text style={styles.meta}>{playing ? 'Playing' : 'Paused'}</Text>
          </View>
          <Pressable style={styles.play} onPress={() => toggle(current)}><Text style={styles.playText}>{playing ? 'Pause' : 'Play'}</Text></Pressable>
        </Pressable>
      ) : null}

      {playerOpen && current ? (
        <View style={styles.player}>
          <Pressable onPress={() => setPlayerOpen(false)}><Text style={styles.skip}>Close</Text></Pressable>
          <Text style={styles.kicker}>{current.site_name || 'Listen Later'}</Text>
          <Text style={styles.playerTitle}>{current.title || 'Untitled'}</Text>
          <Text style={styles.meta}>{idx + 1} / {Math.max(sentences.length, 1)} · {SPEEDS[speedI]}×{plus ? '' : ` · ${Math.min(heard, freeSeconds)}s / ${freeSeconds}s`}</Text>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingVertical: 12 }}>
            {sentences.map((sentence, index) => (
              <Pressable key={`${index}-${sentence.slice(0, 12)}`} onPress={() => { idxRef.current = index; setIdx(index); }}>
                <Text style={[styles.sentence, index === idx && styles.sentenceOn]}>{sentence}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.transport}>
            <Pressable style={styles.ghost} onPress={() => setSpeedI((n) => (n + 1) % SPEEDS.length)}><Text style={styles.ghostText}>{SPEEDS[speedI]}×</Text></Pressable>
            <Pressable style={styles.primary} onPress={() => toggle(current)}><Text style={styles.primaryText}>{playing ? 'Pause' : 'Play'}</Text></Pressable>
          </View>
        </View>
      ) : null}

      {tour >= 0 ? (
        <View style={styles.tour}>
          <Text style={styles.kicker}>How it works</Text>
          <Text style={styles.tourTitle}>{tour === 0 ? 'Add a story' : tour === 1 ? 'Press play' : 'Free, then Plus'}</Text>
          <Text style={styles.body}>
            {tour === 0
              ? 'This is Add. Paste a link, or paste the article itself when a page will not open.'
              : tour === 1
                ? 'This is Listen. Open a story and press play. The sentence you hear is marked.'
                : `Each story includes ${freeSeconds} seconds on the free plan. Plus continues past that preview. Use on Plus is capped in the terms.`}
          </Text>
          <Pressable style={styles.primary} onPress={nextTour}><Text style={styles.primaryText}>Next</Text></Pressable>
        </View>
      ) : null}

      <View style={styles.tabs}>
        {(['listen', 'add', 'settings'] as Tab[]).map((id) => (
          <Pressable key={id} style={styles.tab} onPress={() => setTab(id)}>
            <Text style={[styles.tabText, tab === id && styles.tabOn]}>{id === 'listen' ? 'Listen' : id === 'add' ? 'Add' : 'Settings'}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
  brand: { color: colors.ink, fontSize: 20, fontWeight: '600', letterSpacing: 0.4 },
  who: { color: colors.muted, flex: 1, textAlign: 'right' },
  list: { padding: 20, paddingBottom: 120, gap: 12 },
  h1: { color: colors.ink, fontSize: 34, fontWeight: '500' },
  body: { color: colors.muted, fontSize: 16, lineHeight: 22 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.elevated, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.line },
  rowOn: { borderColor: colors.fill },
  mark: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#243460', alignItems: 'center', justifyContent: 'center' },
  markText: { color: colors.ink, fontWeight: '700' },
  rowTitle: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  meta: { color: colors.muted, marginTop: 2, fontSize: 13 },
  card: { backgroundColor: colors.elevated, borderRadius: 20, padding: 16, gap: 10, borderWidth: 1, borderColor: colors.line },
  cardTitle: { color: colors.ink, fontSize: 22, fontWeight: '500' },
  input: { backgroundColor: colors.bg, color: colors.ink, borderRadius: 14, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, minHeight: 48, fontSize: 16 },
  area: { minHeight: 120, textAlignVertical: 'top', paddingTop: 12 },
  primary: { backgroundColor: colors.fill, borderRadius: 999, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  primaryText: { color: colors.onFill, fontWeight: '700', fontSize: 16 },
  ghost: { borderRadius: 999, borderWidth: 1, borderColor: colors.line, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  ghostText: { color: colors.ink, fontWeight: '600' },
  setting: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 52, borderBottomWidth: 1, borderBottomColor: colors.line },
  toast: { position: 'absolute', left: 20, right: 20, bottom: 132, backgroundColor: colors.elevated, color: colors.ink, borderRadius: 14, padding: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.line },
  dock: { position: 'absolute', left: 12, right: 12, bottom: 78, backgroundColor: colors.elevated, borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.line },
  play: { backgroundColor: colors.fill, borderRadius: 999, paddingHorizontal: 14, minHeight: 36, justifyContent: 'center' },
  playText: { color: colors.onFill, fontWeight: '700' },
  player: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.bg, padding: 20, paddingTop: 12 },
  kicker: { color: colors.copper, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', fontSize: 12 },
  playerTitle: { color: colors.ink, fontSize: 28, fontWeight: '500', marginTop: 6 },
  sentence: { color: colors.muted, fontSize: 18, lineHeight: 28 },
  sentenceOn: { color: colors.ink, backgroundColor: '#3a2d78', borderRadius: 8 },
  transport: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingTop: 8 },
  skip: { color: colors.muted, fontSize: 16, paddingVertical: 8 },
  tour: { position: 'absolute', left: 16, right: 16, bottom: 86, backgroundColor: colors.elevated, borderRadius: 22, padding: 18, gap: 8, borderWidth: 1, borderColor: colors.line },
  tourTitle: { color: colors.ink, fontSize: 26, fontWeight: '500' },
  tabs: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bg, paddingBottom: 18, paddingTop: 8 },
  tab: { flex: 1, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  tabText: { color: colors.muted, fontWeight: '600', fontSize: 15 },
  tabOn: { color: colors.ink },
});
