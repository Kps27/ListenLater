import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StatusBar as NativeStatusBar, StyleSheet, View } from 'react-native';
import { api, clearSession, getEmail, getToken } from './lib/api';
import { Auth } from './screens/Auth';
import { Plan } from './screens/Plan';
import { Shell } from './screens/Shell';
import { Welcome } from './screens/Welcome';
import { colors } from './theme';

type Gate = 'boot' | 'welcome' | 'auth' | 'plan' | 'app';

export default function App() {
  const [gate, setGate] = useState<Gate>('boot');
  const [email, setEmail] = useState('');
  const [plus, setPlus] = useState(false);
  const [tour, setTour] = useState(false);
  const top = Platform.OS === 'android' ? NativeStatusBar.currentHeight || 24 : 0;

  useEffect(() => {
    (async () => {
      const welcomed = await AsyncStorage.getItem('ll-welcomed');
      if (!welcomed) {
        setGate('welcome');
        return;
      }
      const token = await getToken();
      const saved = await getEmail();
      if (!token || !saved) {
        setGate('auth');
        return;
      }
      setEmail(saved);
      try {
        const plan = await api.plan();
        const isPlus = plan.plan === 'plus' || plan.plan === 'premium';
        setPlus(isPlus);
        if (isPlus) await AsyncStorage.setItem('ll-plan', 'plus');
      } catch {
        await clearSession();
        setGate('auth');
        return;
      }
      const seen = await AsyncStorage.getItem('ll-onboarded');
      setTour(seen !== saved);
      setGate('app');
    })().catch(() => setGate('auth'));
  }, []);

  async function finishWelcome() {
    await AsyncStorage.setItem('ll-welcomed', '1');
    const token = await getToken();
    const saved = await getEmail();
    setGate(token && saved ? 'app' : 'auth');
  }

  async function signedIn(value: string) {
    const account = value.trim().toLowerCase();
    setEmail(account);
    let isPlus = false;
    try {
      const plan = await api.plan();
      isPlus = plan.plan === 'plus' || plan.plan === 'premium';
    } catch {
      isPlus = false;
    }
    setPlus(isPlus);
    if (isPlus) {
      await AsyncStorage.setItem('ll-plan', 'plus');
      const seen = await AsyncStorage.getItem('ll-onboarded');
      setTour(seen !== account);
      setGate('app');
      return;
    }
    setGate('plan');
  }

  async function choose(nextPlus: boolean) {
    setPlus(nextPlus);
    if (nextPlus) await AsyncStorage.setItem('ll-plan', 'plus');
    else await AsyncStorage.removeItem('ll-plan');
    const seen = await AsyncStorage.getItem('ll-onboarded');
    setTour(seen !== email);
    setGate('app');
  }

  return (
    <View style={[styles.root, { paddingTop: top }]}>
      <StatusBar style="light" />
      {gate === 'boot' ? <ActivityIndicator color={colors.fill} style={{ marginTop: 80 }} /> : null}
      {gate === 'welcome' ? <Welcome onDone={() => void finishWelcome()} /> : null}
      {gate === 'auth' ? <Auth onSignedIn={(value) => void signedIn(value)} /> : null}
      {gate === 'plan' ? <Plan email={email} onFree={() => void choose(false)} onPlus={() => void choose(true)} /> : null}
      {gate === 'app' ? (
        <Shell
          email={email}
          plus={plus}
          showTour={tour}
          onTourDone={() => {
            setTour(false);
            void AsyncStorage.setItem('ll-onboarded', email);
          }}
          onSignOut={() => {
            setEmail('');
            setPlus(false);
            setTour(false);
            setGate('auth');
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
