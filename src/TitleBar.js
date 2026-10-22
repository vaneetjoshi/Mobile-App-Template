import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import config from '../app-config.json';
import { isLight } from './colors';
import Surface from './Surface';

const { theme, features } = config;

export default function TitleBar({ title, canBack, onBack, onRefresh }) {
  const insets = useSafeAreaInsets();
  const color = { color: theme.on_primary };

  return (
    <Surface color={theme.primary} gradient={theme.primary_gradient} style={[s.bar, { paddingTop: insets.top + 10, paddingLeft: 10 + insets.left, paddingRight: 10 + insets.right }]}>
      <StatusBar style={isLight(theme.primary) ? 'dark' : 'light'} />
      <View style={s.side}>
        {features.title_back && canBack && (
          <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[s.icon, color]}>←</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text numberOfLines={1} style={[s.title, color]}>{title}</Text>
      <View style={[s.side, s.right]}>
        {features.title_refresh && (
          <TouchableOpacity onPress={onRefresh} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[s.icon, color]}>↻</Text>
          </TouchableOpacity>
        )}
      </View>
    </Surface>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingBottom: 12 },
  side: { width: 40, justifyContent: 'center' },
  right: { alignItems: 'flex-end' },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800' },
  icon: { fontSize: 22, fontWeight: '800' },
});
