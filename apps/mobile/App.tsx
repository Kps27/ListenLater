import { StatusBar } from 'expo-status-bar';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api, apiBase, Item } from './lib/api';

function splitSentences(text: string): string[] {
  const out: string[] = [];
  for (const block of text.split(/\n\n+/)) {
    const parts = block.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
    for (const p of parts) {
      const s = p.trim();
      if (s) out.push(s);
    }
  }
  return out;
}

export default function App() {
  const [email, setEmail] = useState('');
  const [url, setUrl] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<Item | null>(null);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const playingRef = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.listItems());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(console.error);
  }, [refresh]);

  const speakAt = useCallback(
    (i: number, sentences: string[], item: Item) => {
      if (!playingRef.current) return;
      if (i >= sentences.length) {
        playingRef.current = false;
        setPlaying(false);
        api.patch(item.id, { state: 'listened', progress_sentence: 0 }).then(refresh);
        return;
      }
      setIdx(i);
      Speech.speak(sentences[i], {
        rate: 1,
        onDone: () => speakAt(i + 1, sentences, item),
        onStopped: () => {},
        onError: () => {
          playingRef.current = false;
          setPlaying(false);
        },
      });
    },
    [refresh]
  );

  const togglePlay = (item: Item) => {
    if (!item.text) return;
    if (playing && current?.id === item.id) {
      Speech.stop();
      playingRef.current = false;
      setPlaying(false);
      api.patch(item.id, { progress_sentence: idx, state: 'in_progress' });
      return;
    }
    Speech.stop();
    setCurrent(item);
    const sentences = splitSentences(item.text);
    const start = item.progress_sentence || 0;
    setIdx(start);
    playingRef.current = true;
    setPlaying(true);
    api.patch(item.id, { state: 'in_progress' });
    speakAt(start, sentences, item);
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>Listen Later</Text>
        <Text style={styles.sub}>API: {apiBase()}</Text>
      </View>

      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="Work email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Pressable
          style={styles.btn}
          onPress={() => api.login(email).then(refresh).catch(console.error)}
        >
          <Text style={styles.btnText}>Sign in</Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="https://…"
          autoCapitalize="none"
          value={url}
          onChangeText={setUrl}
        />
        <Pressable
          style={styles.btn}
          onPress={() =>
            api
              .createUrls([url.trim()])
              .then(() => {
                setUrl('');
                refresh();
              })
              .catch(console.error)
          }
        >
          <Text style={styles.btnText}>Save</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={items.filter((i) => i.state !== 'archived')}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.card, current?.id === item.id && styles.cardOn]}
              onPress={() => setCurrent(item)}
            >
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.title || item.source_url || 'Untitled'}
              </Text>
              <Text style={styles.meta}>
                {item.status === 'ready' ? item.state : item.status}
                {item.site_name ? ` · ${item.site_name}` : ''}
              </Text>
              {item.status === 'ready' && item.text ? (
                <Pressable style={styles.play} onPress={() => togglePlay(item)}>
                  <Text style={styles.playText}>
                    {playing && current?.id === item.id ? 'Pause' : 'Play'}
                  </Text>
                </Pressable>
              ) : null}
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Queue is empty — save a link above.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E9EDF0', paddingHorizontal: 16 },
  header: { paddingVertical: 12 },
  title: { fontSize: 28, fontWeight: '500', color: '#1B2430' },
  sub: { fontSize: 12, color: '#5D6875', marginTop: 4 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CDD4DB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  btn: {
    backgroundColor: '#2E5E52',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  card: {
    backgroundColor: '#F7F8F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CDD4DB',
    padding: 14,
    marginTop: 10,
  },
  cardOn: { borderColor: '#2E5E52', borderWidth: 2 },
  cardTitle: { fontSize: 16, fontWeight: '500', color: '#1B2430' },
  meta: { fontSize: 13, color: '#5D6875', marginTop: 4 },
  play: { marginTop: 10, alignSelf: 'flex-start' },
  playText: { color: '#2E5E52', fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 40, color: '#5D6875' },
});
