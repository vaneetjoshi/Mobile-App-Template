import { Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const useInsets = () => {
  const insets = useSafeAreaInsets();
  const bar = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;
  return { ...insets, top: Math.max(insets.top, bar) };
};
