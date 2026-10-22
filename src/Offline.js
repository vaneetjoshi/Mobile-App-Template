import { Image, StyleSheet, Text, View } from 'react-native';
import config from '../app-config.json';
import { Button } from './AuthLayout';
import Surface from './Surface';

const { theme, features } = config;
const logo = require('../assets/icon.png');

export default function Offline({ onRetry }) {
  return (
    <Surface color={theme.background} gradient={theme.background_gradient} style={[StyleSheet.absoluteFill, s.center]}>
      {features.offline_logo && <Image source={logo} style={s.logo} />}
      <Text style={[s.title, { color: theme.text }]}>{features.offline_title}</Text>
      <Text style={[s.message, { color: theme.text }]}>{features.offline_message}</Text>
      <View style={s.button}>
        <Button label={features.offline_button} onPress={onRetry} />
      </View>
    </Surface>
  );
}

const s = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  logo: { width: 88, height: 88, borderRadius: 20, marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  message: { fontSize: 14, opacity: 0.75, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  button: { alignSelf: 'stretch', marginTop: 22, paddingHorizontal: 24 },
});
