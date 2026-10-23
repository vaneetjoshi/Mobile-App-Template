import { useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { WebView } from 'react-native-webview';
import config from '../app-config.json';
import { BASE, post } from './api';
import AuthLayout, { Button } from './AuthLayout';
import * as Biometric from './Biometric';
import Field from './Field';
import { InkContext } from './ink';
import { useInsets } from './insets';
import { tint } from './colors';
import { useToast } from './Toast';
import { compact, normalizeOptions, validateConfirm, validateField, validatePassword } from './validation';

const { theme, app, login, register, password } = config;

const landing = (data) => {
  if (data.two_factor) return '/two-factor-challenge';
  const url = String((data && data.redirect_url) || '');
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  if (url.startsWith(`${BASE}/`) || url === BASE) return url.slice(BASE.length) || '/';
  return '/';
};

const useForm = (validate, request, onDone, review = false, onOffline = null) => {
  const toast = useToast();
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const change = (name) => (value) => {
    const next = { ...form, [name]: value };
    setForm(next);
    if (tried) setErrors(compact(validate(next)));
  };

  const send = async () => {
    setReviewing(false);
    setBusy(true);
    try {
      const data = await request(form);
      toast(data.two_factor ? 'Two-factor verification required.' : 'Welcome!', data.two_factor ? 'info' : 'success');
      onDone(landing(data));
    } catch (e) {
      const known = e && e.name === 'ApiError';

      if (known && e.offline && onOffline) onOffline();
      else {
        setErrors(known ? Object.fromEntries(Object.entries(e.fields || {})) : {});
        toast(known ? e.message : `Unexpected error: ${(e && e.message) || 'unknown'}`);
      }
    }
    setBusy(false);
  };

  const submit = () => {
    setTried(true);
    const found = compact(validate(form));
    setErrors(found);

    if (Object.keys(found).length) {
      toast(Object.values(found)[0]);
      return;
    }

    if (review) {
      setReviewing(true);
      return;
    }

    send();
  };

  return { form, errors, busy, change, submit, send, reviewing, closeReview: () => setReviewing(false) };
};

const useChain = (names, onLast) => {
  const refs = useRef({});

  return (name) => {
    const index = names.indexOf(name);
    const last = index === names.length - 1;

    return {
      inputRef: (node) => {
        refs.current[name] = node;
      },
      returnKeyType: last ? 'done' : 'next',
      onSubmitEditing: () => {
        const next = names.slice(index + 1).find((candidate) => refs.current[candidate]);

        if (next) refs.current[next].focus();
        else onLast();
      },
    };
  };
};

const BioButton = ({ onPress, busy }) => (
  <TouchableOpacity disabled={busy} activeOpacity={0.8} onPress={onPress} style={[s.bio, { borderColor: theme.link }]}>
    {busy ? <ActivityIndicator color={theme.link} /> : (
      <>
        <Ionicons name="finger-print" size={22} color={theme.link} />
        <Text style={{ color: theme.link, fontWeight: '800', fontSize: 15, marginLeft: 8 }}>Login with fingerprint / face</Text>
      </>
    )}
  </TouchableOpacity>
);

const Link = ({ text, onPress }) => (
  <TouchableOpacity onPress={onPress} style={{ alignItems: 'center', marginTop: 18, padding: 6 }}>
    <Text style={{ color: theme.link, fontWeight: '700' }}>{text}</Text>
  </TouchableOpacity>
);

const CheckRow = ({ checked, onChange, error, children }) => {
  const ink = useContext(InkContext) || theme.text;

  return (
    <View style={{ marginBottom: 14 }}>
      <TouchableOpacity activeOpacity={0.8} onPress={() => onChange(!checked)} style={s.checkRow}>
        <View style={[s.box, { borderColor: error ? '#dc2626' : tint(ink, 0.5), backgroundColor: checked ? theme.primary : 'transparent' }]}>
          {checked && <Text style={{ color: theme.on_primary, fontWeight: '800', fontSize: 14 }}>✓</Text>}
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>{children}</View>
      </TouchableOpacity>
      {!!error && <Text style={s.error}>{error}</Text>}
    </View>
  );
};

function PageModal({ visible, title, path, onClose }) {
  const insets = useInsets();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#ffffff', paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View style={s.pageHeader}>
          <Text numberOfLines={1} style={s.pageTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={{ color: theme.link, fontWeight: '800', fontSize: 15 }}>Close</Text>
          </TouchableOpacity>
        </View>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <WebView source={{ uri: `${BASE}${path}` }} startInLoadingState />
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function Review({ visible, rows, busy, onEdit, onConfirm }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onEdit}>
      <View style={s.backdrop}>
        <View style={[s.sheet, { backgroundColor: theme.card }]}>
          <Text style={[s.sheetTitle, { color: theme.card_text }]}>Confirm Registration Details</Text>
          <Text style={[s.sheetText, { color: theme.card_text }]}>Please verify the details below before completing your registration.</Text>
          <ScrollView style={{ maxHeight: 300 }}>
            {rows.map(([label, value]) => (
              <View key={label} style={[s.row, { borderColor: tint(theme.card_text, 0.15) }]}>
                <Text style={{ color: tint(theme.card_text, 0.7), fontSize: 12 }}>{label}</Text>
                <Text style={{ color: theme.card_text, fontWeight: '700', fontSize: 15 }}>{value}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={{ marginTop: 14 }}>
            <Button label="Confirm & Register" onPress={onConfirm} busy={busy} />
            <TouchableOpacity onPress={onEdit} style={{ alignItems: 'center', padding: 12 }}>
              <Text style={{ color: theme.link, fontWeight: '800' }}>Edit details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function Login({ onDone, onRegister, onOffline, auto }) {
  const toast = useToast();
  const [remember, setRemember] = useState(true);
  const [forgot, setForgot] = useState(false);
  const [bio, setBio] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);
  const only = login.identifiers.length === 1 ? login.identifiers[0] : null;
  const identifierField = { name: 'identifier', label: login.label, type: only === 'email' ? 'email' : 'text', autofill: 'username', required: true, rules: { required: true, email: only === 'email', max: 255 } };
  const passwordField = { name: 'password', label: 'Password', type: 'password', required: true, rules: { required: true } };
  const { form, errors, busy, change, submit } = useForm(
    (v) => ({ identifier: validateField(identifierField, v.identifier), password: v.password ? '' : 'Password is required' }),
    (v) => post('/login', { identifier: v.identifier.trim(), password: v.password, remember }),
    onDone,
    false,
    onOffline,
  );
  const chain = useChain(['identifier', 'password'], submit);

  const bioLogin = async () => {
    setBioBusy(true);

    try {
      const data = await Biometric.login();

      if (data) {
        toast(data.two_factor ? 'Two-factor verification required.' : 'Welcome!', data.two_factor ? 'info' : 'success');
        onDone(landing(data));
      }
    } catch (e) {
      const known = e && e.name === 'ApiError';

      if (known && e.offline) onOffline();
      else {
        toast(known ? e.message : 'Fingerprint login did not work. Please sign in with your password.');
        if (known && e.status === 401) setBio(false);
      }
    }

    setBioBusy(false);
  };

  useEffect(() => {
    Biometric.ready().then((ok) => {
      setBio(ok);
      if (ok && auto) bioLogin();
    });
  }, []);

  return (
    <AuthLayout tokens={login.tokens} title="Welcome back" subtitle={`Sign in to ${app.name}`}>
      <Field field={identifierField} value={form.identifier} onChange={change('identifier')} error={errors.identifier} variant={login.tokens.input} align={login.tokens.align} {...chain('identifier')} />
      <Field field={passwordField} value={form.password} onChange={change('password')} error={errors.password} variant={login.tokens.input} align={login.tokens.align} {...chain('password')} />
      <CheckRow checked={remember} onChange={setRemember}>
        <RememberText />
      </CheckRow>
      <Button label="Login" onPress={submit} busy={busy} shape={login.tokens.button} />
      {bio && <View style={{ marginTop: 12 }}><BioButton onPress={bioLogin} busy={bioBusy} /></View>}
      <Link text="Forgot password?" onPress={() => setForgot(true)} />
      <Link text="Create an account" onPress={onRegister} />
      <PageModal visible={forgot} title="Reset password" path="/forgot-password" onClose={() => setForgot(false)} />
    </AuthLayout>
  );
}

const RememberText = () => {
  const ink = useContext(InkContext) || theme.text;
  return <Text style={{ color: ink, fontSize: 14 }}>Remember me</Text>;
};

const TermsText = ({ title, onOpen }) => {
  const ink = useContext(InkContext) || theme.text;

  return (
    <Text style={{ color: ink, fontSize: 14 }}>
      I agree to the{' '}
      <Text onPress={onOpen} style={{ color: theme.link, fontWeight: '700', textDecorationLine: 'underline' }}>{title}</Text>.
    </Text>
  );
};

export function Register({ onDone, onLogin, onOffline }) {
  const fields = register.fields;
  const terms = register.terms || { enabled: false };
  const [pageOpen, setPageOpen] = useState(false);

  const validate = (v) => {
    const out = {};

    fields.forEach((f) => {
      if (f.confirm) out[f.name] = validateConfirm(v[f.confirm], v[f.name]);
      else if (f.type === 'password') out[f.name] = validatePassword(v[f.name], password.min);
      else out[f.name] = validateField(f, v[f.name]);
    });

    if (terms.enabled && !v.terms) out.terms = 'You must accept the Terms & Conditions';

    return out;
  };

  const { form, errors, busy, change, submit, send, reviewing, closeReview } = useForm(
    validate,
    (v) => {
      const { terms: accepted, ...rest } = v;
      return post('/register', terms.enabled ? { ...rest, terms: '1' } : rest);
    },
    onDone,
    true,
    onOffline,
  );
  const tokens = register.tokens;
  const chain = useChain(fields.map((f) => f.name), submit);

  const display = (f) => {
    const value = form[f.name];
    if (f.type !== 'select') return value;
    const match = normalizeOptions(f.options).find((o) => o.value === String(value));
    return match ? match.label : value;
  };
  const rows = fields.filter((f) => f.type !== 'password' && form[f.name]).map((f) => [f.label, String(display(f))]);

  return (
    <AuthLayout tokens={tokens} title="Create account" subtitle={`Join ${app.name}`}>
      {fields.map((f) => (
        <Field key={f.name} field={f.type === 'password' ? { ...f, autofill: 'new' } : f} value={form[f.name]} onChange={change(f.name)} error={errors[f.name]} variant={tokens.input} align={tokens.align} {...chain(f.name)} />
      ))}
      {terms.enabled && (
        <CheckRow checked={!!form.terms} onChange={change('terms')} error={errors.terms}>
          <TermsText title={terms.title} onOpen={() => setPageOpen(true)} />
        </CheckRow>
      )}
      <Button label="Continue to Review" onPress={submit} busy={busy} shape={tokens.button} />
      <Link text="I already have an account" onPress={onLogin} />
      <Review visible={reviewing} rows={rows} busy={busy} onEdit={closeReview} onConfirm={send} />
      {terms.enabled && <PageModal visible={pageOpen} title={terms.title} path={terms.path} onClose={() => setPageOpen(false)} />}
    </AuthLayout>
  );
}

const s = StyleSheet.create({
  bio: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 12, borderWidth: 1.5 },
  checkRow: { flexDirection: 'row', alignItems: 'center' },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#dc2626', fontSize: 12, marginTop: 5 },
  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  pageTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: '#111827', marginRight: 12 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  sheet: { borderRadius: 18, padding: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '800' },
  sheetText: { fontSize: 13, opacity: 0.8, marginTop: 6, marginBottom: 12 },
  row: { paddingVertical: 8, borderBottomWidth: 1 },
});
