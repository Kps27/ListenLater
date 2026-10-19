import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '../lib/api';
import { colors } from '../theme';

type Step = 'email' | 'password' | 'pin' | 'set-password';

function message(code?: string) {
  if (code === 'invalid_email') return 'Use a full email, like you@domain.com.';
  if (code === 'invalid_pin') return 'That code does not match, or it has expired.';
  if (code === 'invalid_password') return 'That password does not match.';
  if (code === 'weak_password') return 'Use at least 8 characters.';
  return 'Sign in did not reach the server.';
}

export function Auth({ onSignedIn }: { onSignedIn: (email: string) => void }) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [preview, setPreview] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function continueEmail() {
    setNote('');
    setBusy(true);
    try {
      const status = await api.start(email.trim());
      setEmail(status.email);
      if (status.has_password) {
        setStep('password');
        return;
      }
      const issued = await api.pin(status.email);
      setPreview(issued.preview_pin || '');
      setPin(issued.preview_pin || '');
      setStep('pin');
    } catch (err) {
      setNote(message((err as { code?: string }).code));
    } finally {
      setBusy(false);
    }
  }

  async function submitPassword() {
    setNote('');
    setBusy(true);
    try {
      const session = await api.login(email, password);
      onSignedIn(session.email);
    } catch (err) {
      setNote(message((err as { code?: string }).code));
    } finally {
      setBusy(false);
    }
  }

  async function submitPin() {
    setNote('');
    setBusy(true);
    try {
      const session = await api.verify(email, pin);
      if (session.needs_password) {
        setPassword('');
        setStep('set-password');
        return;
      }
      onSignedIn(session.email);
    } catch (err) {
      setNote(message((err as { code?: string }).code));
    } finally {
      setBusy(false);
    }
  }

  async function savePassword() {
    setNote('');
    setBusy(true);
    try {
      await api.setPassword(password);
      onSignedIn(email);
    } catch (err) {
      setNote(message((err as { code?: string }).code));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.kicker}>Sign in</Text>
      <Text style={styles.title}>Open your library.</Text>
      <Text style={styles.body}>Use your email. A code appears here until mail is connected.</Text>
      {step === 'email' ? (
        <>
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} placeholder="you@domain.com" placeholderTextColor={colors.muted} />
          <Pressable style={styles.primary} disabled={busy} onPress={() => void continueEmail()}>
            {busy ? <ActivityIndicator color={colors.onFill} /> : <Text style={styles.primaryText}>Continue</Text>}
          </Pressable>
        </>
      ) : null}
      {step === 'password' ? (
        <>
          <Text style={styles.body}>{email}</Text>
          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} secureTextEntry value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor={colors.muted} />
          <Pressable style={styles.primary} disabled={busy} onPress={() => void submitPassword()}>
            {busy ? <ActivityIndicator color={colors.onFill} /> : <Text style={styles.primaryText}>Sign in</Text>}
          </Pressable>
        </>
      ) : null}
      {step === 'pin' ? (
        <>
          <Text style={styles.body}>Mail is not connected yet. Use this code, then choose a password.</Text>
          {preview ? <Text style={styles.pin}>{preview}</Text> : null}
          <Text style={styles.label}>Code</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={pin} onChangeText={setPin} />
          <Pressable style={styles.primary} disabled={busy} onPress={() => void submitPin()}>
            {busy ? <ActivityIndicator color={colors.onFill} /> : <Text style={styles.primaryText}>Continue</Text>}
          </Pressable>
        </>
      ) : null}
      {step === 'set-password' ? (
        <>
          <Text style={styles.body}>Choose a password for {email}. Next time you can use it, or ask for a new code.</Text>
          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} secureTextEntry value={password} onChangeText={setPassword} placeholder="At least 8 characters" placeholderTextColor={colors.muted} />
          <Pressable style={styles.primary} disabled={busy} onPress={() => void savePassword()}>
            {busy ? <ActivityIndicator color={colors.onFill} /> : <Text style={styles.primaryText}>Save password</Text>}
          </Pressable>
        </>
      ) : null}
      {note ? <Text style={styles.error}>{note}</Text> : null}
      {step !== 'email' ? (
        <Pressable onPress={() => { setStep('email'); setNote(''); }}>
          <Text style={styles.skip}>Back</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: 24, gap: 10 },
  kicker: { color: colors.copper, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', fontSize: 13 },
  title: { color: colors.ink, fontSize: 36, fontWeight: '500' },
  body: { color: colors.muted, fontSize: 16, lineHeight: 22 },
  label: { color: colors.muted, marginTop: 8, fontSize: 13 },
  input: { backgroundColor: colors.elevated, color: colors.ink, borderRadius: 14, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, minHeight: 52, fontSize: 16 },
  primary: { marginTop: 8, backgroundColor: colors.fill, borderRadius: 999, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.onFill, fontWeight: '700', fontSize: 17 },
  pin: { color: colors.ink, fontSize: 32, letterSpacing: 6, fontVariant: ['tabular-nums'] },
  error: { color: colors.warn, marginTop: 4 },
  skip: { color: colors.muted, textAlign: 'center', paddingVertical: 10, fontSize: 16 },
});
