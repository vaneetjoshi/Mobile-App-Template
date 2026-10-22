import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, SafeAreaView, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { WebView } from 'react-native-webview';
import config from './app-config.json';
import { BASE } from './src/api';
import { Login, Register } from './src/screens';
import SplashView from './src/SplashView';
import { ToastProvider } from './src/Toast';

const { theme } = config;

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [screen, setScreen] = useState('login');
  const [path, setPath] = useState('/');
  const [splash, setSplash] = useState(true);
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
    setPath(target);
    setScreen('web');
  };

  return (
    <ToastProvider>
      {screen === 'login' && <Login onDone={open} onRegister={() => setScreen('register')} />}
      {screen === 'register' && <Register onDone={open} onLogin={() => setScreen('login')} />}
      {screen === 'web' && (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
          <WebView
            ref={web}
            source={{ uri: `${BASE}${path}` }}
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            onNavigationStateChange={(nav) => {
              canGoBack.current = nav.canGoBack;
              if (/\/(login|logout)(\?|$)/.test(nav.url)) setScreen('login');
            }}
            startInLoadingState
            renderLoading={() => (
              <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            )}
          />
        </SafeAreaView>
      )}
      {splash && <SplashView onDone={() => setSplash(false)} />}
    </ToastProvider>
  );
}
