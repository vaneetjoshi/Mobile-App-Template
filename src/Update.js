import { useEffect, useRef, useState } from 'react';
import { Alert, Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import config from '../app-config.json';
import { BASE } from './api';
import { Button } from './AuthLayout';
import Surface from './Surface';
import { allowInstalls, download, install, modeFor, safe } from './updater';

const { theme, app, features, update } = config;
const logo = require('../assets/icon.png');

export function useUpdate() {
  const [offer, setOffer] = useState(null);
  const [shown, setShown] = useState(false);
  const [stage, setStage] = useState('idle');
  const [percent, setPercent] = useState(0);
  const [message, setMessage] = useState('');
  const file = useRef(null);

  const run = async (data) => {
    if (modeFor(data) !== 'install') {
      Linking.openURL(data.url).catch(() => {});
      return;
    }

    setShown(true);

    if (!file.current) {
      setStage('downloading');
      setPercent(0);
      setMessage('');

      try {
        file.current = await download(data.apk, setPercent);
      } catch (e) {
        setStage('failed');
        setMessage((e && e.message) || 'The download failed. Please try again.');
        return;
      }
    }

    setStage('ready');
    setMessage('');

    try {
      await install(file.current);
    } catch (e) {
      setStage('failed');
      setMessage('Could not open the installer. Please try again.');
    }
  };

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

        setOffer(data);

        if (data.force) setShown(true);
        else Alert.alert('Update available', `A newer version of ${app.name} is available.`, [{ text: 'Later', style: 'cancel' }, { text: 'Update', onPress: () => run(data) }]);
      } catch (e) {}
    })().finally(() => clearTimeout(timer));

    return () => {
      alive = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  if (!offer) return null;

  return { force: offer.force, shown, stage, percent, message, run: () => run(offer), later: () => setShown(false) };
}

export function UpdateScreen({ update: state }) {
  if (!state.shown) return null;

  const { force, stage, percent, message } = state;
  const busy = stage === 'downloading';
  const title = busy ? 'Downloading update' : stage === 'ready' ? 'Ready to install' : stage === 'failed' ? 'Update did not finish' : force ? 'Update required' : 'Update available';
  const text = busy
    ? `${Math.round(percent * 100)}% - please keep the app open.`
    : stage === 'ready'
      ? 'Tap Install in the Android screen to finish. If it did not open, tap Install below.'
      : stage === 'failed'
        ? message
        : `Please install the latest version of ${app.name}${force ? ' to continue' : ''}.`;

  return (
    <Surface color={theme.background} gradient={theme.background_gradient} style={[StyleSheet.absoluteFill, s.center]}>
      <Image source={logo} style={s.logo} />
      <Text style={[s.title, { color: theme.text }]}>{title}</Text>
      <Text style={[s.message, { color: theme.text }]}>{text}</Text>
      {busy && (
        <View style={[s.track, { backgroundColor: `${theme.text}22` }]}>
          <View style={[s.fill, { width: `${Math.round(percent * 100)}%`, backgroundColor: theme.primary }]} />
        </View>
      )}
      {!busy && (
        <View style={s.button}>
          <Button label={stage === 'ready' ? 'Install' : stage === 'failed' ? 'Try again' : 'Update'} onPress={state.run} />
          {(stage === 'ready' || stage === 'failed') && (
            <TouchableOpacity onPress={allowInstalls} style={s.link}>
              <Text style={{ color: theme.link, fontWeight: '700' }}>Installer did not open? Allow installs from this app</Text>
            </TouchableOpacity>
          )}
          {!force && (
            <TouchableOpacity onPress={state.later} style={s.link}>
              <Text style={{ color: theme.link, fontWeight: '700' }}>Later</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </Surface>
  );
}

const s = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: 32, zIndex: 60 },
  logo: { width: 88, height: 88, borderRadius: 20, marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  message: { fontSize: 14, opacity: 0.75, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  track: { alignSelf: 'stretch', height: 10, borderRadius: 5, marginTop: 22, marginHorizontal: 24, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5 },
  button: { alignSelf: 'stretch', marginTop: 22, paddingHorizontal: 24 },
  link: { alignItems: 'center', marginTop: 14, padding: 6 },
});
