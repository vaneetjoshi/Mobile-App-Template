import { useEffect, useState } from 'react';
import { Alert, Image, Linking, StyleSheet, Text, View } from 'react-native';
import config from '../app-config.json';
import { BASE } from './api';
import { Button } from './AuthLayout';
import Surface from './Surface';

const { theme, app, features, update } = config;
const logo = require('../assets/icon.png');

const safe = (url) => typeof url === 'string' && (url.startsWith('https://') || url.startsWith(`${BASE}/`));

export function useUpdate() {
  const [required, setRequired] = useState(null);

  useEffect(() => {
    if (!features.update_check) return undefined;

    let alive = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    (async () => {
      try {
        const response = await fetch(`${BASE}/mobile-app/version?app_key=${encodeURIComponent(update.app_key)}`, { headers: { Accept: 'application/json' }, signal: controller.signal });
        if (!response.ok) return;

        const data = await response.json();
        if (!alive || !(data.build > app.build_number) || !safe(data.url)) return;

        const open = () => Linking.openURL(data.url).catch(() => {});

        if (data.force) setRequired(() => open);
        else Alert.alert('Update available', `A newer version of ${app.name} is available.`, [{ text: 'Later', style: 'cancel' }, { text: 'Update', onPress: open }]);
      } catch (e) {}
    })().finally(() => clearTimeout(timer));

    return () => {
      alive = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  return required;
}

export function UpdateRequired({ onUpdate }) {
  return (
    <Surface color={theme.background} gradient={theme.background_gradient} style={[StyleSheet.absoluteFill, s.center]}>
      <Image source={logo} style={s.logo} />
      <Text style={[s.title, { color: theme.text }]}>Update required</Text>
      <Text style={[s.message, { color: theme.text }]}>Please install the latest version of {app.name} to continue.</Text>
      <View style={s.button}>
        <Button label="Update" onPress={onUpdate} />
      </View>
    </Surface>
  );
}

const s = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: 32, zIndex: 60 },
  logo: { width: 88, height: 88, borderRadius: 20, marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  message: { fontSize: 14, opacity: 0.75, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  button: { alignSelf: 'stretch', marginTop: 22, paddingHorizontal: 24 },
});
