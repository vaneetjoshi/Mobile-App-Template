import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import config from '../app-config.json';
import { InkContext, SurfaceContext } from './ink';
import Surface from './Surface';

const { theme } = config;
const logo = require('../assets/icon.png');

export const Button = ({ label, onPress, busy, shape }) => (
  <TouchableOpacity
    disabled={busy}
    activeOpacity={0.85}
    onPress={onPress}
    style={[s.buttonWrap, { borderRadius: shape === 'pill' ? 999 : shape === 'square' ? 2 : 12 }]}
  >
    <Surface color={theme.primary} gradient={theme.primary_gradient} style={s.button}>
      {busy ? <ActivityIndicator color={theme.on_primary} /> : <Text style={{ color: theme.on_primary, fontWeight: '800', fontSize: 15 }}>{label}</Text>}
    </Surface>
  </TouchableOpacity>
);

export default function AuthLayout({ tokens, title, subtitle, children }) {
  const brand = tokens.screen === 'brand';
  const surface = theme.card;
  const align = tokens.align === 'center' ? 'center' : 'left';
  const onScreen = brand ? theme.on_primary : theme.text;
  const heading = (color) => (
    <View style={{ alignItems: align === 'center' ? 'center' : 'flex-start', marginBottom: 18 }}>
      {tokens.header === 'logo' && <Image source={logo} style={s.logo} />}
      <Text style={[s.title, { color, textAlign: align }]}>{title}</Text>
      {!!subtitle && <Text style={[s.subtitle, { color, textAlign: align }]}>{subtitle}</Text>}
    </View>
  );

  const inHeader = tokens.header === 'band' || tokens.header === 'curve';
  const container = tokens.container === 'card' ? s.card : tokens.container === 'sheet' ? s.sheet : s.plain;
  const inCard = tokens.container !== 'plain';
  const titleColor = inCard ? theme.card_text : onScreen;

  return (
    <Surface color={brand ? theme.primary : theme.background} gradient={brand ? theme.primary_gradient : theme.background_gradient} style={s.screen}>
    <SafeAreaView style={s.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.flex}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.scroll, tokens.container === 'sheet' && s.scrollSheet]}>
          {inHeader && (
            <Surface color={theme.primary} gradient={theme.primary_gradient} style={[s.header, tokens.header === 'curve' && s.headerCurve]}>
              <Text style={[s.headerTitle, { color: theme.on_primary }]}>{title}</Text>
              {!!subtitle && <Text style={[s.subtitle, { color: theme.on_primary }]}>{subtitle}</Text>}
            </Surface>
          )}
          <Surface color={inCard ? surface : 'transparent'} gradient={inCard ? theme.card_gradient : null} style={[container, tokens.container !== 'sheet' && !inHeader && s.centered]}>
            <InkContext.Provider value={inCard ? theme.card_text : theme.text}>
              <SurfaceContext.Provider value={inCard ? surface : theme.background}>
                {!inHeader && heading(titleColor)}
                {children}
              </SurfaceContext.Provider>
            </InkContext.Provider>
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </Surface>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1 },
  scroll: { flexGrow: 1 },
  scrollSheet: { justifyContent: 'flex-start' },
  centered: { flexGrow: 1, justifyContent: 'center' },
  plain: { padding: 24 },
  card: { margin: 20, padding: 22, borderRadius: 18, elevation: 4, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  sheet: { flexGrow: 1, marginTop: -28, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingTop: 30 },
  header: { paddingHorizontal: 28, paddingTop: 56, paddingBottom: 48 },
  headerCurve: { paddingBottom: 64 },
  headerTitle: { fontSize: 28, fontWeight: '800' },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 13, opacity: 0.8, marginTop: 4 },
  logo: { width: 76, height: 76, borderRadius: 18, marginBottom: 14 },
  buttonWrap: { overflow: 'hidden', marginTop: 6 },
  button: { paddingVertical: 15, alignItems: 'center' },
});
