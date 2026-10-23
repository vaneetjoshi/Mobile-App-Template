import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, BackHandler, KeyboardAvoidingView, Linking, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { WebView } from 'react-native-webview';
import config from './app-config.json';
import { BASE } from './src/api';
import Lock from './src/Lock';
import { Login, Register } from './src/screens';
import SplashView from './src/SplashView';
import { isLight, topColor } from './src/colors';
import { useInsets } from './src/insets';
import Offline from './src/Offline';
import { startPush } from './src/Push';
import TitleBar from './src/TitleBar';
import { ToastProvider } from './src/Toast';
import { UpdateRequired, useUpdate } from './src/Update';

const { theme, features, app } = config;

const DOWNLOAD = /\.(pdf|zip|rar|7z|xlsx?|docx?|pptx?|csv|apk|aab|ipa)$/i;
const AUTH_PATH = /^\/(login|register|forgot-password|reset-password|two-factor-challenge)(\/|\?|$)/;

const hostOf = (url) => url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').split(/[/?#]/)[0].replace(/^www\./, '');

SplashScreen.preventAutoHideAsync().catch(() => {});

const probeSession = async () => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${BASE}/dashboard`, { headers: { Accept: 'text/html' }, signal: controller.signal });
    const url = response.url || '';
    if (!response.ok || !url.startsWith(BASE)) return null;

    const path = url.slice(BASE.length) || '/';

    return AUTH_PATH.test(path) ? null : path;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

function Main() {
  const insets = useInsets();
  const [screen, setScreen] = useState(null);
  const [path, setPath] = useState('/');
  const [splash, setSplash] = useState(true);
  const [failed, setFailed] = useState(false);
  const [pageTitle, setPageTitle] = useState('');
  const [canBack, setCanBack] = useState(false);
  const [locked, setLocked] = useState(!!features.biometric);
  const web = useRef(null);
  const canGoBack = useRef(false);
  const failedRef = useRef(false);
  const asking = useRef(false);
  const update = useUpdate();

  failedRef.current = failed;

  useEffect(() => {
    let alive = true;

    probeSession().then((found) => {
      if (!alive) return;
      if (found) setPath((current) => (current === '/' ? found : current));
      setScreen((current) => current || (found ? 'web' : 'login'));
    });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'register') {
        setScreen('login');
        return true;
      }

      if (screen === 'web' && canGoBack.current) {
        web.current.goBack();
        return true;
      }

      if (!asking.current) {
        asking.current = true;
        Alert.alert(`Exit ${app.name}?`, 'Do you want to close the app?', [
          { text: 'Cancel', style: 'cancel', onPress: () => { asking.current = false; } },
          { text: 'Exit', onPress: () => BackHandler.exitApp() },
        ], { cancelable: true, onDismiss: () => { asking.current = false; } });
      }

      return true;
    });
    return () => sub.remove();
  }, [screen]);

  useEffect(() => {
    let left = 0;

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        left = Date.now();
        return;
      }

      if (state !== 'active' || !left) return;

      const away = Date.now() - left;
      left = 0;

      if (features.biometric && away >= Number(features.biometric_after) * 60000) setLocked(true);

      if (failedRef.current) {
        setFailed(false);
        web.current && web.current.reload();
      }
    });

    return () => sub.remove();
  }, []);

  const open = (target) => {
    setFailed(false);
    setPath(target);
    setScreen('web');
  };

  const signedIn = (target) => {
    setLocked(false);
    open(target);
  };

  useEffect(() => startPush((target) => open(target)), []);

  const shouldLoad = (request) => {
    const url = request.url;

    if (!/^https?:\/\//i.test(url)) {
      if (/^(about|data|blob|javascript):/i.test(url)) return true;
      Linking.openURL(url).catch(() => {});
      return false;
    }

    if (DOWNLOAD.test(url.split(/[?#]/)[0])) {
      Linking.openURL(url).catch(() => {});
      return false;
    }

    if (!features.external_browser || request.isTopFrame === false || hostOf(url) === hostOf(BASE)) return true;

    Linking.openURL(url).catch(() => {});
    return false;
  };

  const title = features.title_mode === 'custom' && features.title_text ? features.title_text : features.title_mode === 'page' && pageTitle ? pageTitle : config.app.name;

  return (
    <ToastProvider>
      {screen === null && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      )}
      {screen === 'login' && <Login onDone={signedIn} onRegister={() => setScreen('register')} />}
      {screen === 'register' && <Register onDone={signedIn} onLogin={() => setScreen('login')} />}
      {screen === 'web' && (
        <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: features.title_bar ? 0 : insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }}>
          {features.title_bar ? (
            <TitleBar title={title} canBack={canBack} onBack={() => web.current && web.current.goBack()} onRefresh={() => { setFailed(false); web.current && web.current.reload(); }} />
          ) : (
            <StatusBar style={isLight(topColor(theme.background, theme.background_gradient)) ? 'dark' : 'light'} />
          )}
          <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
            <WebView
              ref={web}
              source={{ uri: `${BASE}${path}` }}
              sharedCookiesEnabled
              thirdPartyCookiesEnabled
              pullToRefreshEnabled={features.pull_refresh}
              setSupportMultipleWindows={false}
              textZoom={100}
              overScrollMode="never"
              applicationNameForUserAgent={`MobileApp/${app.build_number}`}
              onHttpError={(event) => { if (event.nativeEvent.statusCode >= 500) setFailed(true); }}
              onShouldStartLoadWithRequest={shouldLoad}
              onError={() => setFailed(true)}
              onLoad={() => setFailed(false)}
              onNavigationStateChange={(nav) => {
                canGoBack.current = nav.canGoBack;
                setCanBack(nav.canGoBack);
                if (nav.title && !/^https?:\/\//i.test(nav.title)) setPageTitle(nav.title);
                if (/\/(login|logout)(\?|$)/.test(nav.url)) {
                  setLocked(false);
                  setScreen('login');
                }
              }}
              startInLoadingState
              renderLoading={() => (
                <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
                  <ActivityIndicator size="large" color={theme.primary} />
                </View>
              )}
            />
            {failed && <Offline onRetry={() => { setFailed(false); web.current && web.current.reload(); }} />}
          </KeyboardAvoidingView>
        </View>
      )}
      {features.biometric && locked && screen === 'web' && <Lock onUnlock={() => setLocked(false)} />}
      {update && <UpdateRequired onUpdate={update} />}
      {splash && <SplashView onDone={() => setSplash(false)} />}
    </ToastProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}
