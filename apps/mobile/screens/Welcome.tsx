import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

const SLIDES = [
  {
    kicker: 'Listen Later',
    title: 'Hear what you meant to read.',
    body: 'Save an article, a newsletter, or a page. It becomes an episode, and the words stay in step with the voice.',
  },
  {
    kicker: 'Save',
    title: 'Save it like a bookmark.',
    body: 'Paste a link, or paste the article itself when a page will not open. It joins your queue.',
  },
  {
    kicker: 'Play',
    title: 'Press play.',
    body: 'Your phone reads it. Speed sits on the episode. The sentence you are hearing is marked.',
  },
  {
    kicker: 'Plus',
    title: 'Free, then one dollar.',
    body: 'Each story includes 60 seconds on the free plan. Plus is $1 a month, or $10 a year. Listening on Plus is capped in the terms.',
  },
];

export function Welcome({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];
  const last = step === SLIDES.length - 1;

  return (
    <View style={styles.screen}>
      <Text style={styles.kicker}>{slide.kicker}</Text>
      <Text style={styles.title}>{slide.title}</Text>
      <Text style={styles.body}>{slide.body}</Text>
      <View style={styles.dots}>
        {SLIDES.map((item, index) => (
          <View key={item.title} style={[styles.dot, index === step && styles.dotOn]} />
        ))}
      </View>
      <Pressable style={styles.primary} onPress={() => (last ? onDone() : setStep((n) => n + 1))}>
        <Text style={styles.primaryText}>{last ? 'Start listening' : 'Next'}</Text>
      </Pressable>
      {last ? null : (
        <Pressable onPress={onDone} hitSlop={12}>
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'flex-end', padding: 28, paddingBottom: 36, gap: 14 },
  kicker: { color: colors.copper, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', fontSize: 13 },
  title: { color: colors.ink, fontSize: 40, lineHeight: 46, fontWeight: '500' },
  body: { color: colors.muted, fontSize: 18, lineHeight: 26 },
  dots: { flexDirection: 'row', gap: 8, marginTop: 8 },
  dot: { width: 8, height: 8, borderRadius: 99, backgroundColor: colors.line },
  dotOn: { backgroundColor: colors.fill, width: 22 },
  primary: { marginTop: 8, backgroundColor: colors.fill, borderRadius: 999, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.onFill, fontWeight: '700', fontSize: 17 },
  skip: { color: colors.muted, textAlign: 'center', paddingVertical: 8, fontSize: 16 },
});
