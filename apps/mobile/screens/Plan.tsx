import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, countryCode, formatMoney } from '../lib/api';
import { colors } from '../theme';

type Interval = 'month' | 'year';

export function Plan({
  email,
  onFree,
  onPlus,
}: {
  email: string;
  onFree: () => void;
  onPlus: () => void;
}) {
  const [quote, setQuote] = useState({ currency: 'USD', month_cents: 100, year_cents: 1000, save_percent: 17, country: 'US' });
  const [seconds, setSeconds] = useState(60);
  const [provider, setProvider] = useState('Stripe');
  const [interval, setInterval] = useState<Interval | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [exp, setExp] = useState('');
  const [cvc, setCvc] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const country = countryCode();
    api.prices(country).then((data) => {
      if (data?.currency) setQuote(data);
    }).catch(() => undefined);
    api.site().then((site) => {
      if (site.free_listen_seconds) setSeconds(site.free_listen_seconds);
      if (site.payment?.provider === 'razorpay') setProvider('Razorpay');
    }).catch(() => undefined);
  }, []);

  const month = formatMoney(quote.month_cents, quote.currency);
  const year = formatMoney(quote.year_cents, quote.currency);
  const due = interval === 'year' ? year : month;

  async function pay() {
    if (!interval) return;
    setError('');
    setBusy(true);
    try {
      await api.checkout({ email, interval, country: quote.country, card: { name, number, exp, cvc } });
      setOpen(false);
      onPlus();
    } catch (err) {
      setError((err as Error).message === 'card_number' ? 'Check the card number.' : 'The demo checkout did not go through.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.kicker}>Signed in as {email}</Text>
      <Text style={styles.title}>Subscribe and keep listening.</Text>
      <Text style={styles.body}>Plus is {month} a month, or {year} a year. The free plan stops at {seconds} seconds of each story.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Plus</Text>
        <Text style={styles.body}>A year saves {quote.save_percent}%. Use is capped in the terms.</Text>
        <View style={styles.row}>
          <Pressable style={[styles.chip, interval === 'month' && styles.chipOn]} onPress={() => setInterval('month')}>
            <Text style={[styles.chipText, interval === 'month' && styles.chipTextOn]}>{month} a month</Text>
          </Pressable>
          <Pressable style={[styles.chip, interval === 'year' && styles.chipOn]} onPress={() => setInterval('year')}>
            <Text style={[styles.chipText, interval === 'year' && styles.chipTextOn]}>{year} a year</Text>
          </Pressable>
        </View>
        <Pressable style={[styles.primary, !interval && styles.disabled]} disabled={!interval} onPress={() => setOpen(true)}>
          <Text style={styles.primaryText}>{interval ? `Subscribe · ${due}` : 'Choose Plus'}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Free</Text>
        <Text style={styles.body}>{seconds} seconds of each story. The piece stays in your queue.</Text>
        <Pressable style={styles.ghost} onPress={onFree}>
          <Text style={styles.ghostText}>Continue with free</Text>
        </Pressable>
      </View>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.modal}>
          <View style={styles.sheet}>
            <Text style={styles.cardTitle}>Demo card</Text>
            <Text style={styles.body}>Nothing is charged. {provider} is the provider selected in admin. Use 4242 4242 4242 4242, any future expiry, and any 3-digit code.</Text>
            <Text style={styles.body}>{interval === 'year' ? 'Yearly' : 'Monthly'} · {due}</Text>
            <TextInput style={styles.input} placeholder="Name on card" placeholderTextColor={colors.muted} value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="4242 4242 4242 4242" placeholderTextColor={colors.muted} keyboardType="number-pad" value={number} onChangeText={setNumber} />
            <View style={styles.row}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="MM/YY" placeholderTextColor={colors.muted} value={exp} onChangeText={setExp} />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="CVC" placeholderTextColor={colors.muted} keyboardType="number-pad" value={cvc} onChangeText={setCvc} />
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable style={styles.primary} disabled={busy} onPress={() => void pay()}>
              {busy ? <ActivityIndicator color={colors.onFill} /> : <Text style={styles.primaryText}>Pay {due}</Text>}
            </Pressable>
            <Pressable onPress={() => setOpen(false)}>
              <Text style={styles.ghostText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 24, paddingBottom: 48, gap: 14 },
  kicker: { color: colors.copper, fontWeight: '700', letterSpacing: 0.4, fontSize: 13 },
  title: { color: colors.ink, fontSize: 34, fontWeight: '500', lineHeight: 40 },
  body: { color: colors.muted, fontSize: 16, lineHeight: 22 },
  card: { backgroundColor: colors.elevated, borderRadius: 22, borderWidth: 1, borderColor: colors.line, padding: 18, gap: 12 },
  cardTitle: { color: colors.ink, fontSize: 24, fontWeight: '500' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.fill, borderColor: colors.fill },
  chipText: { color: colors.ink, fontWeight: '600' },
  chipTextOn: { color: colors.onFill },
  primary: { backgroundColor: colors.fill, borderRadius: 999, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.45 },
  primaryText: { color: colors.onFill, fontWeight: '700', fontSize: 17 },
  ghost: { borderRadius: 999, borderWidth: 1, borderColor: colors.line, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  ghostText: { color: colors.ink, textAlign: 'center', paddingVertical: 8, fontSize: 16 },
  modal: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8,8,14,0.62)' },
  sheet: { backgroundColor: colors.elevated, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 10, paddingBottom: 32 },
  input: { backgroundColor: colors.bg, color: colors.ink, borderRadius: 14, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, minHeight: 48, fontSize: 16 },
  error: { color: colors.warn },
});
