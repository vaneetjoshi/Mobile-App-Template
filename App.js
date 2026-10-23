import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, BackHandler, KeyboardAvoidingView, Linking, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { WebView } from 'react-native-webview';
import config from './app-config.json';
import { BASE, getJson, signOut } from './src/api';
import * as Biometric from './src/Biometric';
import Drawer from './src/Drawer';
import Lock from './src/Lock';
import { Login, Register } from './src/screens';
import { AUTH_PATH, needsGuard, probeSession } from './src/session';
import SplashView from './src/SplashView';
import { useInsets } from './src/insets';
import Offline from './src/Offline';
import { startPush } from './src/Push';
import TitleBar from './src/TitleBar';
import { ToastProvider, useToast } from './src/Toast';
import { UpdateRequired, useUpdate } from './src/Update';

const { theme, features, app } = config;

const DOWNLOAD = /\.(pdf|zip|rar|7z|xlsx?|docx?|pptx?|csv|apk|aab|ipa)$/i;
const HIDE_WEB_MENU = String.raw`.vb-sidebar,.vb-header-menu-btn,[\@click="mobileMenuOpen = true"]{display:none!important}`;
const HIDE_SCRIPT = `(function(){var s=document.createElement('style');s.textContent=${JSON.stringify(HIDE_WEB_MENU)};(document.head||document.documentElement).appendChild(s)})();true;`;

const hostOf = (url) => url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').split(/[/?#]/)[0].replace(/^www\./, '');

SplashScreen.preventAutoHideAsync().catch(() => {});

function Main() {
  const insets = useInsets();
  const toast = useToast();
  const [screen, setScreen] = useState(null);
  const [path, setPath] = useState('/');
  const [here, setHere] = useState('');
  const [splash, setSplash] = useState(true);
  const [failed, setFailed] = useState(false);
  const [offline, setOffline] = useState(false);
  const [checking, setChecking] = useState(false);
  const [pageTitle, setPageTitle] = useState('');
  const [locked, setLocked] = useState(false);
  const [lockOn, setLockOn] = useState(false);
  const [lockSupported, setLockSupported] = useState(false);
  const [auto, setAuto] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState([]);
  const web = useRef(null);
  const canGoBack = useRef(false);
  const failedRef = useRef(false);
  const asking = useRef(false);
  const lockOnRef = useRef(false);
  const offered = useRef(false);
  const guarding = useRef(false);
  const offlineRef = useRef(false);
  const update = useUpdate();

  failedRef.current = failed;
  lockOnRef.current = lockOn;
  offlineRef.current = offline;

  const boot = async () => {
    setChecking(true);
    const [found, remembered, supported] = await Promise.all([probeSession(), Biometric.enabled(), Biometric.supported()]);
    setChecking(false);

    if (found.state === 'offline') {
      setOffline(true);
      return;
    }

    setOffline(false);
    setLockOn(remembered);
    setLockSupported(supported);

    if (found.state === 'user') {
      setPath((current) => (current === '/' ? found.path : current));
      setLocked(remembered);
      setScreen((current) => current || 'web');
      return;
    }

    setAuto(true);
    setScreen((current) => current || 'login');
  };

  const retry = async () => {
    if (screen === null) {
      await boot();
      return;
    }

    setChecking(true);
    const found = await probeSession();
    setChecking(false);

    if (found.state !== 'offline') setOffline(false);
  };

  const bootRef = useRef(boot);
  const retryRef = useRef(retry);

  bootRef.current = boot;
  retryRef.current = retry;

  useEffect(() => {
    bootRef.current();
  }, []);

  const toLogin = () => {
    setAuto(false);
    setDrawer(false);
    setLocked(false);
    setScreen('login');
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (drawer) {
        setDrawer(false);
        return true;
      }

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
  }, [screen, drawer]);

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

      if (lockOnRef.current && away >= Number(features.biometric_after) * 60000) setLocked(true);

      if (failedRef.current) {
        setFailed(false);
        web.current && web.current.reload();
      }

      if (offlineRef.current) retryRef.current();
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

  const loadMenu = async () => {
    const data = await getJson('/mobile-app/menu');
    if (data && Array.isArray(data.items)) setMenu(data.items);
  };

  useEffect(() => {
    if (screen === 'web') loadMenu();
    else setMenu([]);
  }, [screen]);

  const toggleLock = async (on) => {
    try {
      if (on) {
        if (!(await Biometric.enable())) return;
        setLockOn(true);
        toast('Fingerprint login is on.', 'success');
        return;
      }

      await Biometric.disable();
      setLockOn(false);
      setLocked(false);
      toast('Fingerprint login is off.', 'info');
    } catch (e) {
      if (e && e.offline) setOffline(true);
      else toast((e && e.message) || 'Could not change fingerprint login.');
    }
  };

  const offerFingerprint = async () => {
    if (offered.current) return;
    offered.current = true;

    if (!(await Biometric.supported()) || (await Biometric.enabled()) || (await Biometric.asked())) return;

    Alert.alert('Enable fingerprint login?', `Next time, sign in to ${app.name} with just your fingerprint or face.`, [
      { text: 'Not now', style: 'cancel', onPress: () => Biometric.markAsked() },
      { text: 'Enable', onPress: () => { Biometric.markAsked(); toggleLock(true); } },
    ], { cancelable: false });
  };

  const guard = async () => {
    if (guarding.current) return;
    guarding.current = true;
    const found = await probeSession();
    guarding.current = false;

    if (found.state === 'guest') toLogin();
  };

  const go = (target) => {
    if (/^https?:\/\//i.test(target) && hostOf(target) !== hostOf(BASE)) {
      Linking.openURL(target).catch(() => {});
      return;
    }

    const url = /^https?:\/\//i.test(target) ? target : `${BASE}${target}`;

    web.current && web.current.injectJavaScript(`window.location.assign(${JSON.stringify(url)});true;`);
  };

  const logout = async () => {
    setDrawer(false);
    await signOut();
    toLogin();
  };

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
    <View style={{ flex: 1 }}>
      {screen === null && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      )}
      {screen === 'login' && <Login auto={auto} onDone={signedIn} onRegister={() => setScreen('register')} onOffline={() => setOffline(true)} />}
      {screen === 'register' && <Register onDone={signedIn} onLogin={() => setScreen('login')} onOffline={() => setOffline(true)} />}
      {screen === 'web' && (
        <>
          <View style={{ flex: 1, backgroundColor: theme.background, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }}>
            <TitleBar
              title={title}
              onMenu={() => { loadMenu(); setDrawer(true); }}
              onRefresh={() => { setFailed(false); web.current && web.current.reload(); }}
            />
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
                injectedJavaScriptBeforeContentLoaded={HIDE_SCRIPT}
                injectedJavaScript={HIDE_SCRIPT}
                onHttpError={(event) => { if (event.nativeEvent.statusCode >= 500) setFailed(true); }}
                onShouldStartLoadWithRequest={shouldLoad}
                onError={() => setFailed(true)}
                onLoad={() => setFailed(false)}
                onNavigationStateChange={(nav) => {
                  canGoBack.current = nav.canGoBack;
                  if (nav.title && !/^https?:\/\//i.test(nav.title)) setPageTitle(nav.title);
                  if (nav.url.startsWith(BASE)) setHere(nav.url.slice(BASE.length) || '/');

                  if (/\/(login|logout)(\?|$)/.test(nav.url)) {
                    toLogin();
                    return;
                  }

                  if (nav.loading) return;

                  if (needsGuard(nav.url)) guard();

                  if (nav.url.startsWith(BASE) && !AUTH_PATH.test(nav.url.slice(BASE.length) || '/')) offerFingerprint();
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
          <Drawer
            visible={drawer}
            items={menu}
            current={here}
            lockSupported={lockSupported}
            lockOn={lockOn}
            onClose={() => setDrawer(false)}
            onSelect={(item) => { setDrawer(false); go(item.path); }}
            onToggleLock={toggleLock}
            onLogout={logout}
          />
        </>
      )}
      {offline && <Offline onRetry={retry} busy={checking} />}
      {lockOn && locked && screen === 'web' && <Lock onUnlock={() => setLocked(false)} />}
      {update && <UpdateRequired onUpdate={update} />}
      {splash && <SplashView onDone={() => setSplash(false)} />}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <Main />
      </ToastProvider>
    </SafeAreaProvider>
  );
}
