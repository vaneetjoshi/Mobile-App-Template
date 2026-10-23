import { BASE } from './api';

export const AUTH_PATH = /^\/(login|register|forgot-password|reset-password|two-factor-challenge)(\/|\?|$)/;

export const SAFE_PATH = /^\/(client|dashboard|mobile-app)(\/|\?|$)/;

export const probeSession = async () => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${BASE}/dashboard`, { headers: { Accept: 'text/html' }, signal: controller.signal });
    const url = response.url || '';

    if (response.status >= 500) return { state: 'offline' };
    if (!response.ok || !url.startsWith(BASE)) return { state: 'guest' };

    const path = url.slice(BASE.length) || '/';

    return AUTH_PATH.test(path) ? { state: 'guest' } : { state: 'user', path };
  } catch (e) {
    return { state: 'offline' };
  } finally {
    clearTimeout(timer);
  }
};

export const needsGuard = (url, wentBack = false) => {
  if (!url.startsWith(BASE)) return false;

  const path = url.slice(BASE.length) || '/';

  return !AUTH_PATH.test(path) && (wentBack || !SAFE_PATH.test(path));
};
