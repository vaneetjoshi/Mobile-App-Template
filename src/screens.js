import { useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import config from '../app-config.json';
import { ApiError, post } from './api';
import AuthLayout, { Button } from './AuthLayout';
import Field from './Field';
import { useToast } from './Toast';
import { compact, validateConfirm, validateField, validatePassword } from './validation';

const { theme, app, login, register, password } = config;

const useForm = (validate, request, onDone, serverKeys = {}) => {
  const toast = useToast();
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);

  const change = (name) => (value) => {
    const next = { ...form, [name]: value };
    setForm(next);
    if (tried) setErrors(compact(validate(next)));
  };

  const submit = async () => {
    setTried(true);
    const found = compact(validate(form));
    setErrors(found);

    if (Object.keys(found).length) {
      toast(Object.values(found)[0]);
      return;
    }

    setBusy(true);
    try {
      const data = await request(form);
      toast(data.two_factor ? 'Two-factor verification required.' : 'Welcome!', data.two_factor ? 'info' : 'success');
      onDone(data.two_factor ? '/two-factor-challenge' : '/');
    } catch (e) {
      const message = e instanceof ApiError ? e.message : 'Something went wrong. Please try again.';
      const mapped = Object.fromEntries(Object.entries(e.fields || {}).map(([key, text]) => [serverKeys[key] || key, text]));
      setErrors(mapped);
      toast(message);
    }
    setBusy(false);
  };

  return { form, errors, busy, change, submit };
};

const Link = ({ text, onPress }) => (
  <TouchableOpacity onPress={onPress} style={{ alignItems: 'center', marginTop: 18, padding: 6 }}>
    <Text style={{ color: theme.link, fontWeight: '700' }}>{text}</Text>
  </TouchableOpacity>
);

export function Login({ onDone, onRegister }) {
  const only = login.identifiers.length === 1 ? login.identifiers[0] : null;
  const identifierField = { name: 'identifier', label: login.identifiers.map((i) => i.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\bId\b/, 'ID')).join(' / '), type: only === 'email' ? 'email' : 'text', required: true, rules: { required: true, email: only === 'email', max: 255 } };
  const passwordField = { name: 'password', label: 'Password', type: 'password', required: true, rules: { required: true } };
  const { form, errors, busy, change, submit } = useForm(
    (v) => ({ identifier: validateField(identifierField, v.identifier), password: v.password ? '' : 'Password is required' }),
    (v) => post('/login', { identifier: v.identifier.trim(), password: v.password }),
    onDone,
  );

  return (
    <AuthLayout tokens={login.tokens} title="Welcome back" subtitle={`Sign in to ${app.name}`}>
      <Field field={identifierField} value={form.identifier} onChange={change('identifier')} error={errors.identifier} variant={login.tokens.input} align={login.tokens.align} />
      <Field field={passwordField} value={form.password} onChange={change('password')} error={errors.password} variant={login.tokens.input} align={login.tokens.align} />
      <Button label="Login" onPress={submit} busy={busy} shape={login.tokens.button} />
      <Link text="Create an account" onPress={onRegister} />
    </AuthLayout>
  );
}

export function Register({ onDone, onLogin }) {
  const passwordField = { name: 'password', label: 'Password', type: 'password', required: true };
  const confirmField = { name: 'confirm', label: 'Confirm password', type: 'password', required: true };
  const { form, errors, busy, change, submit } = useForm(
    (v) => {
      const out = Object.fromEntries(register.fields.map((f) => [f.name, validateField(f, v[f.name])]));
      out.password = validatePassword(v.password, password.min);
      out.confirm = validateConfirm(v.password, v.confirm);
      return out;
    },
    (v) => {
      const { confirm, ...rest } = v;
      return post('/register', { ...rest, password_confirmation: confirm });
    },
    onDone,
    { password_confirmation: 'confirm' },
  );
  const tokens = register.tokens;

  return (
    <AuthLayout tokens={tokens} title="Create account" subtitle={`Join ${app.name}`}>
      {register.fields.map((f) => (
        <Field key={f.name} field={f} value={form[f.name]} onChange={change(f.name)} error={errors[f.name]} variant={tokens.input} align={tokens.align} />
      ))}
      <Field field={passwordField} value={form.password} onChange={change('password')} error={errors.password} variant={tokens.input} align={tokens.align} />
      <Field field={confirmField} value={form.confirm} onChange={change('confirm')} error={errors.confirm} variant={tokens.input} align={tokens.align} />
      <Button label="Register" onPress={submit} busy={busy} shape={tokens.button} />
      <Link text="I already have an account" onPress={onLogin} />
    </AuthLayout>
  );
}
