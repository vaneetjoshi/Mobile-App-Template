import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import config from '../app-config.json';
import { del, post } from './api';

const { app, features } = config;
const TOKEN = `fingerprint_token_${app.package_id.replace(/[^A-Za-z0-9._-]/g, '_')}`;
const ASKED = `fingerprint_asked_${app.package_id.replace(/[^A-Za-z0-9._-]/g, '_')}`;
const OPTIONS = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

const read = async (key) => {
  try {
    return await SecureStore.getItemAsync(key, OPTIONS);
  } catch (e) {
    return null;
  }
};

const write = async (key, value) => {
  try {
    await SecureStore.setItemAsync(key, value, OPTIONS);
  } catch (e) {}
};

const erase = async (key) => {
  try {
    await SecureStore.deleteItemAsync(key, OPTIONS);
  } catch (e) {}
};

const verify = async (message) => {
  try {
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: message, cancelLabel: 'Cancel' });
    return result.success;
  } catch (e) {
    return false;
  }
};

export const supported = async () => {
  if (!features.biometric) return false;

  try {
    return (await LocalAuthentication.getEnrolledLevelAsync()) !== LocalAuthentication.SecurityLevel.NONE;
  } catch (e) {
    return false;
  }
};

export const enabled = async () => features.biometric && !!(await read(TOKEN));

export const ready = async () => (await enabled()) && (await supported());

export const asked = async () => !features.biometric || !!(await read(ASKED));

export const markAsked = () => write(ASKED, '1');

export const enable = async () => {
  if (!features.biometric || !(await verify(`Turn on fingerprint login for ${app.name}`))) return false;

  const data = await post('/mobile-app/biometric', { device_name: `${Platform.OS} ${(Platform.constants && Platform.constants.Model) || ''}`.trim() });

  await write(TOKEN, data.token);
  await markAsked();

  return true;
};

export const disable = async () => {
  const token = await read(TOKEN);

  await erase(TOKEN);

  try {
    await del('/mobile-app/biometric', token ? { token } : {});
  } catch (e) {}
};

export const login = async () => {
  const token = features.biometric ? await read(TOKEN) : null;

  if (!token) return null;
  if (!(await verify(`Sign in to ${app.name}`))) return null;

  try {
    const data = await post('/mobile-app/biometric/login', { token });

    await write(TOKEN, data.token);

    return data;
  } catch (e) {
    if (e && (e.status === 401 || e.status === 404)) await erase(TOKEN);

    throw e;
  }
};
