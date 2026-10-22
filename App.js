import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import config from './app-config.json';

const { theme, app, login, register } = config;
const BASE = app.url.replace(/\/$/, '');

const csrf = async () => {
  const response = await fetch(`${BASE}/login`, { headers: { Accept: 'text/html' } });
  const cookie = response.headers.get('set-cookie') || '';
  const match = cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
};

const post = async (path, body) => {
  const token = await csrf();
  const response = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-XSRF-TOKEN': token },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (response.ok) return data;
  const errors = data.errors ? Object.values(data.errors).flat().join('\n') : data.message || 'Something went wrong';
  throw new Error(errors);
};

const Shell = ({ style, title, children }) => (
  <SafeAreaView style={[s.screen, { backgroundColor: theme.background }]}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={style === 'split' ? s.splitScroll : s.scroll}>
        {style === 'split' && (
          <View style={[s.splitHead, { backgroundColor: theme.primary }]}>
            <Text style={[s.splitTitle, { color: theme.on_primary }]}>{title}</Text>
          </View>
        )}
        <View style={[s.body, style === 'card' && s.card]}>
          {style !== 'split' && <Text style={[s.title, { color: theme.text }]}>{title}</Text>}
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>
);

const Field = ({ label, value, onChange, secure, type }) => (
  <View style={s.field}>
    <Text style={[s.label, { color: theme.text }]}>{label}</Text>
    <TextInput
      value={value || ''}
      onChangeText={onChange}
      secureTextEntry={secure}
      autoCapitalize="none"
      keyboardType={type === 'email' ? 'email-address' : type === 'number' ? 'numeric' : 'default'}
      style={[s.input, { color: theme.text, borderColor: theme.secondary }]}
    />
  </View>
);

const Button = ({ label, onPress, busy }) => (
  <TouchableOpacity disabled={busy} onPress={onPress} style={[s.button, { backgroundColor: theme.primary }]}>
    {busy ? <ActivityIndicator color={theme.on_primary} /> : <Text style={{ color: theme.on_primary, fontWeight: '700' }}>{label}</Text>}
  </TouchableOpacity>
);

const Login = ({ onDone, onRegister }) => {
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await post('/login', { identifier: form.identifier, password: form.password });
      onDone();
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  };

  return (
    <Shell style={login.style} title={app.name}>
      <Field label={login.identifiers.map((i) => i[0].toUpperCase() + i.slice(1)).join(' / ')} value={form.identifier} onChange={(v) => setForm({ ...form, identifier: v })} />
      <Field label="Password" secure value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
      {!!error && <Text style={s.error}>{error}</Text>}
      <Button label="Login" onPress={submit} busy={busy} />
      <TouchableOpacity onPress={onRegister} style={s.link}><Text style={{ color: theme.primary }}>Create an account</Text></TouchableOpacity>
    </Shell>
  );
};

const Register = ({ onDone, onLogin }) => {
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await post('/register', { ...form, password_confirmation: form.password });
      onDone();
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  };

  return (
    <Shell style={register.style} title="Create account">
      {register.fields.map((f) => (
        <Field key={f.name} label={f.label + (f.required ? ' *' : '')} type={f.type} value={form[f.name]} onChange={(v) => setForm({ ...form, [f.name]: v })} />
      ))}
      <Field label="Password *" secure value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
      {!!error && <Text style={s.error}>{error}</Text>}
      <Button label="Register" onPress={submit} busy={busy} />
      <TouchableOpacity onPress={onLogin} style={s.link}><Text style={{ color: theme.primary }}>I already have an account</Text></TouchableOpacity>
    </Shell>
  );
};

export default function App() {
  const [screen, setScreen] = useState('login');
  const web = useRef(null);
  const canGoBack = useRef(false);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'web' && canGoBack.current) {
        web.current.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [screen]);

  if (screen === 'login') return <Login onDone={() => setScreen('web')} onRegister={() => setScreen('register')} />;
  if (screen === 'register') return <Register onDone={() => setScreen('web')} onLogin={() => setScreen('login')} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <WebView
        ref={web}
        source={{ uri: `${BASE}/` }}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        onNavigationStateChange={(nav) => {
          canGoBack.current = nav.canGoBack;
          if (/\/(login|logout)(\?|$)/.test(nav.url)) setScreen('login');
        }}
        startInLoadingState
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  splitScroll: { flexGrow: 1 },
  splitHead: { padding: 40, paddingTop: 72 },
  splitTitle: { fontSize: 26, fontWeight: '800' },
  body: { padding: 16 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20, elevation: 3 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 16 },
  field: { marginBottom: 12 },
  label: { fontSize: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  button: { borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  link: { alignItems: 'center', marginTop: 16 },
  error: { color: '#dc2626', marginBottom: 8 },
});
