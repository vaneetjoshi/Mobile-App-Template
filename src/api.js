import config from '../app-config.json';

export const BASE = config.app.url.replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, fields = {}, status = 0) {
    super(message);
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

export const post = async (path, body, retry = true) => {
  let response;
  try {
    const token = await csrf();
    response = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-XSRF-TOKEN': token, 'X-Mobile-App': '1' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new ApiError('No internet connection. Please check your network and try again.');
  }

  const data = await response.json().catch(() => null);

  if (response.ok && data) return data;
  if (response.status === 419 && retry) return post(path, body, false);

  if (response.status === 422 && data && data.errors) {
    const fields = Object.fromEntries(Object.entries(data.errors).map(([key, messages]) => [key, [].concat(messages)[0]]));
    throw new ApiError(Object.values(fields)[0] || 'Please check the form and try again.', fields, 422);
  }

  if (response.status === 429) throw new ApiError('Too many attempts. Please wait a minute and try again.', {}, 429);
  if (response.status === 419) throw new ApiError('Your session expired. Please try again.', {}, 419);

  throw new ApiError((data && data.message) || 'Something went wrong. Please try again.', {}, response.status);
};
