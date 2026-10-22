import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import config from '../app-config.json';
import Surface from './Surface';

const { splash } = config;
const image = require('../assets/splash.png');

export default function SplashView({ onDone }) {
  const fade = useRef(new Animated.Value(1)).current;
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(fade, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => done.current());
    }, 1300);
    return () => clearTimeout(timer);
  }, [fade]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]} onLayout={() => SplashScreen.hideAsync().catch(() => {})}>
      <Surface color={splash.background} gradient={splash.gradient} style={s.fill}>
        {splash.mode === 'cover' ? (
          <Image source={image} resizeMode="cover" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={s.center}>
            <Image source={image} resizeMode="contain" style={{ width: splash.width, height: splash.width }} />
          </View>
        )}
      </Surface>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
