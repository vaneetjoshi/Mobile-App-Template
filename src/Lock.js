import { useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import config from '../app-config.json';
import { Button } from './AuthLayout';
import Surface from './Surface';

const { theme, app } = config;
const logo = require('../assets/icon.png');

export default function Lock({ onUnlock }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const unlock = useCallback(async () => {
    setBusy(true);
    setMessage('');

    try {
      const level = await LocalAuthentication.getEnrolledLevelAsync();

      if (level === LocalAuthentication.SecurityLevel.NONE) {
        onUnlock();
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({ promptMessage: `Unlock ${app.name}`, cancelLabel: 'Cancel' });

      if (result.success) onUnlock();
      else setMessage('Could not verify it is you. Please try again.');
    } catch (e) {
      setMessage('Could not verify it is you. Please try again.');
    }

    setBusy(false);
  }, [onUnlock]);

  useEffect(() => {
    unlock();
  }, []);

  return (
    <Surface color={theme.background} gradient={theme.background_gradient} style={[StyleSheet.absoluteFill, s.center]}>
      <Image source={logo} style={s.logo} />
      <Text style={[s.title, { color: theme.text }]}>{app.name} is locked</Text>
      <Text style={[s.message, { color: theme.text }]}>{message || 'Use your fingerprint, face or screen lock to continue.'}</Text>
      <View style={s.button}>
        <Button label="Unlock" onPress={unlock} busy={busy} />
      </View>
    </Surface>
  );
}

const s = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: 32, zIndex: 50 },
  logo: { width: 88, height: 88, borderRadius: 20, marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  message: { fontSize: 14, opacity: 0.75, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  button: { alignSelf: 'stretch', marginTop: 22, paddingHorizontal: 24 },
});
