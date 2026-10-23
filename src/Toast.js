import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useInsets } from './insets';

const ToastContext = createContext(() => {});

export const useToast = () => useContext(ToastContext);

const COLORS = { error: '#dc2626', success: '#16a34a', info: '#2563eb' };

export function ToastProvider({ children }) {
  const insets = useInsets();
  const [toast, setToast] = useState(null);
  const slide = useRef(new Animated.Value(-120)).current;
  const timer = useRef(null);

  const hide = useCallback(() => {
    Animated.timing(slide, { toValue: -120, duration: 180, useNativeDriver: true }).start(() => setToast(null));
  }, [slide]);

  const show = useCallback((message, type = 'error') => {
    clearTimeout(timer.current);
    setToast({ message, type });
    Animated.spring(slide, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
    timer.current = setTimeout(hide, 3800);
  }, [slide, hide]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <View pointerEvents="box-none" style={[s.wrap, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
          <Animated.View style={[s.toast, { backgroundColor: COLORS[toast.type], transform: [{ translateY: slide }] }]}>
            <TouchableOpacity activeOpacity={0.9} onPress={hide}>
              <View>
                <Text style={s.text}>{toast.message}</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0 },
  toast: { marginHorizontal: 16, marginTop: 12, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  text: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
});
