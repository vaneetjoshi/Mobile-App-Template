import config from '../app-config.json';

export const BASE = config.app.url.replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, fields = {}, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.fields = fields;
    this.status = status;
  }
}

const csrf = async () => {
  const response = await fetch(`${BASE}/login`, { headers: { Accept: 'text/html', 'X-Mobile-App': '1' } });
  const cookie = response.headers.get('set-cookie') || '';
  const match = cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
};

const send = async (method, path, body, retry = true) => {
  let response;
  try {
    const token = await csrf();
    response = await fetch(`${BASE}${path}`, {
      method,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-XSRF-TOKEN': token, 'X-Mobile-App': '1' },
      body: JSON.stringify(body || {}),
    });
  } catch (e) {
    const error = new ApiError('No internet connection. Please check your network and try again.');
    error.offline = true;
    throw error;
  }

  const data = await response.json().catch(() => null);

  if (response.ok && data) return data;
  if (response.status === 419 && retry) return send(method, path, body, false);

  if (response.status === 422 && data && data.errors) {
    const fields = Object.fromEntries(Object.entries(data.errors).map(([key, messages]) => [key, [].concat(messages)[0]]));
    throw new ApiError(Object.values(fields)[0] || 'Please check the form and try again.', fields, 422);
  }

  if (response.status === 429) throw new ApiError('Too many attempts. Please wait a minute and try again.', {}, 429);
  if (response.status === 419) throw new ApiError('Your session expired. Please try again.', {}, 419);

  throw new ApiError((data && data.message) || `Something went wrong (code ${response.status}). Please try again.`, {}, response.status);
};

export const post = (path, body) => send('POST', path, body);

export const del = (path, body) => send('DELETE', path, body);

export const signOut = async () => {
  try {
    const token = await csrf();
    await fetch(`${BASE}/logout`, { method: 'POST', headers: { Accept: 'application/json', 'X-XSRF-TOKEN': token, 'X-Mobile-App': '1' } });
  } catch (e) {}
};

export const getJson = async (path, timeout = 8000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${BASE}${path}`, { headers: { Accept: 'application/json', 'X-Mobile-App': '1' }, signal: controller.signal });
    return response.ok ? await response.json() : null;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
};
