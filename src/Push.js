import { Platform } from 'react-native';
import config from '../app-config.json';
import { post } from './api';

const { push } = config;

const register = async (token) => {
  try {
    await post('/mobile-app/device', { app_key: push.app_key, token });
  } catch (e) {}
};

const target = (response) => {
  const url = response && response.notification && response.notification.request.content.data && response.notification.request.content.data.url;
  return typeof url === 'string' && url.startsWith('/') ? url : null;
};

export function startPush(onOpen) {
  if (!push || !push.enabled || Platform.OS !== 'android') return () => {};

  let stopped = false;
  const subscriptions = [];

  (async () => {
    try {
      const Notifications = require('expo-notifications');

      Notifications.setNotificationHandler({
        handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
      });
      await Notifications.setNotificationChannelAsync('default', { name: 'Default', importance: Notifications.AndroidImportance.HIGH });

      subscriptions.push(Notifications.addNotificationResponseReceivedListener((response) => {
        const path = target(response);
        if (path) onOpen(path);
      }));
      subscriptions.push(Notifications.addPushTokenListener((next) => {
        if (typeof next.data === 'string') register(next.data);
      }));

      const last = await Notifications.getLastNotificationResponseAsync();
      const lastPath = target(last);
      if (lastPath && !stopped) onOpen(lastPath);

      let status = (await Notifications.getPermissionsAsync()).status;
      if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
      if (status !== 'granted') return;

      const token = await Notifications.getDevicePushTokenAsync();
      if (typeof token.data === 'string') await register(token.data);
    } catch (e) {}
  })();

  return () => {
    stopped = true;
    subscriptions.forEach((subscription) => subscription.remove());
  };
}
