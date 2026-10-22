import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Linking, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { WebView } from 'react-native-webview';
import config from './app-config.json';
import { BASE } from './src/api';
import { Login, Register } from './src/screens';
import SplashView from './src/SplashView';
import { isLight } from './src/colors';
import Offline from './src/Offline';
import { startPush } from './src/Push';
import TitleBar from './src/TitleBar';
import { ToastProvider } from './src/Toast';

const { theme, features } = config;

const hostOf = (url) => url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').split(/[/?#]/)[0].replace(/^www\./, '');

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [screen, setScreen] = useState('login');
  const [path, setPath] = useState('/');
  const [splash, setSplash] = useState(true);
  const [failed, setFailed] = useState(false);
  const [pageTitle, setPageTitle] = useState('');
  const [canBack, setCanBack] = useState(false);
  const web = useRef(null);
  const canGoBack = useRef(false);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'web' && canGoBack.current) {
        web.current.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [screen]);

  const open = (target) => {
    setFailed(false);
    setPath(target);
    setScreen('web');
  };

  useEffect(() => startPush((target) => open(target)), []);

  const shouldLoad = (request) => {
    const url = request.url;

    if (!/^https?:\/\//i.test(url)) {
      if (/^(about|data|blob|javascript):/i.test(url)) return true;
      Linking.openURL(url).catch(() => {});
      return false;
    }

    if (!features.external_browser || request.isTopFrame === false || hostOf(url) === hostOf(BASE)) return true;

    Linking.openURL(url).catch(() => {});
    return false;
  };

  const title = features.title_mode === 'custom' && features.title_text ? features.title_text : features.title_mode === 'page' && pageTitle ? pageTitle : config.app.name;

  return (
    <SafeAreaProvider>
    <ToastProvider>
      {screen === 'login' && <Login onDone={open} onRegister={() => setScreen('register')} />}
      {screen === 'register' && <Register onDone={open} onLogin={() => setScreen('login')} />}
      {screen === 'web' && (
        <SafeAreaView edges={features.title_bar ? ['left', 'right', 'bottom'] : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
          {features.title_bar ? (
            <TitleBar title={title} canBack={canBack} onBack={() => web.current && web.current.goBack()} onRefresh={() => { setFailed(false); web.current && web.current.reload(); }} />
          ) : (
            <StatusBar style={isLight(theme.background) ? 'dark' : 'light'} />
          )}
          <View style={{ flex: 1 }}>
            <WebView
              ref={web}
              source={{ uri: `${BASE}${path}` }}
              sharedCookiesEnabled
              thirdPartyCookiesEnabled
              pullToRefreshEnabled={features.pull_refresh}
              onShouldStartLoadWithRequest={shouldLoad}
              onError={() => setFailed(true)}
              onLoad={() => setFailed(false)}
              onNavigationStateChange={(nav) => {
                canGoBack.current = nav.canGoBack;
                setCanBack(nav.canGoBack);
                if (nav.title && !/^https?:\/\//i.test(nav.title)) setPageTitle(nav.title);
                if (/\/(login|logout)(\?|$)/.test(nav.url)) setScreen('login');
              }}
              startInLoadingState
              renderLoading={() => (
                <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
                  <ActivityIndicator size="large" color={theme.primary} />
                </View>
              )}
            />
            {failed && <Offline onRetry={() => { setFailed(false); web.current && web.current.reload(); }} />}
          </View>
        </SafeAreaView>
      )}
      {splash && <SplashView onDone={() => setSplash(false)} />}
    </ToastProvider>
    </SafeAreaProvider>
  );
}
