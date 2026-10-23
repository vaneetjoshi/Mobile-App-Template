import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import config from '../app-config.json';
import { BASE } from './api';

const own = (url) => typeof url === 'string' && url.startsWith(`${BASE}/`);

export const safe = (url) => typeof url === 'string' && (url.startsWith('https://') || own(url));

export const modeFor = (data) => (Platform.OS === 'android' && data && data.apk && own(data.apk.url) && data.url === data.apk.url ? 'install' : 'link');

export const download = async (apk, onProgress) => {
  const target = `${FileSystem.cacheDirectory}update.apk`;

  await FileSystem.deleteAsync(target, { idempotent: true });

  const task = FileSystem.createDownloadResumable(apk.url, target, {}, (progress) => {
    const total = progress.totalBytesExpectedToWrite > 0 ? progress.totalBytesExpectedToWrite : apk.size;
    if (total > 0) onProgress(Math.min(1, progress.totalBytesWritten / total));
  });
  const result = await task.downloadAsync();

  if (!result || result.status !== 200) throw new Error('The download did not finish. Please check your internet and try again.');

  const info = await FileSystem.getInfoAsync(target, { md5: true, size: true });

  if (!info.exists || (apk.size && info.size !== apk.size) || (apk.md5 && info.md5 !== apk.md5)) {
    await FileSystem.deleteAsync(target, { idempotent: true });
    throw new Error('The downloaded file is damaged. Please try again.');
  }

  return target;
};

export const install = async (uri) => {
  const content = await FileSystem.getContentUriAsync(uri);

  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', { data: content, flags: 1, type: 'application/vnd.android.package-archive' });
};

export const allowInstalls = () => IntentLauncher.startActivityAsync('android.settings.MANAGE_UNKNOWN_APP_SOURCES', { data: `package:${config.app.package_id}` }).catch(() => {});
