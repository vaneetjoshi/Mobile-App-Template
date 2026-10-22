import { useContext, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import config from '../app-config.json';
import { LinearGradient } from 'expo-linear-gradient';
import { InkContext, SurfaceContext } from './ink';
import { points } from './Surface';
import { tint } from './colors';
import { normalizeOptions } from './validation';

const { theme } = config;

const inputStyle = (variant, hasError, ink, framed) => {
  const border = hasError ? '#dc2626' : theme.secondary;
  if (variant === 'filled') return { backgroundColor: tint(ink, 0.07), borderRadius: 12, borderWidth: 1, borderColor: hasError ? '#dc2626' : 'transparent' };
  if (variant === 'underline') return { borderBottomWidth: framed ? 0 : 1.5, borderColor: border, borderRadius: 0, paddingHorizontal: 2 };
  if (variant === 'pill') return { borderWidth: framed ? 0 : 1, borderColor: border, borderRadius: 999, paddingHorizontal: 20 };
  return { borderWidth: framed ? 0 : 1, borderColor: border, borderRadius: 10 };
};

const GRADIENT_BORDER = 1.5;

function Frame({ variant, framed, surface, children }) {
  if (!framed) return children;
  const gradient = theme.secondary_gradient;
  const paint = { colors: gradient.colors, locations: gradient.locations, ...points(gradient.angle) };

  if (variant === 'underline') {
    return (
      <View>
        {children}
        <LinearGradient {...paint} style={{ height: GRADIENT_BORDER }} />
      </View>
    );
  }

  const radius = variant === 'pill' ? 999 : 10;
  return (
    <LinearGradient {...paint} style={{ borderRadius: radius, padding: GRADIENT_BORDER }}>
      <View style={{ backgroundColor: surface, borderRadius: radius - GRADIENT_BORDER }}>{children}</View>
    </LinearGradient>
  );
}

export default function Field({ field, value, onChange, error, variant, align }) {
  const ink = useContext(InkContext) || theme.text;
  const surface = useContext(SurfaceContext) || theme.background;
  const [hidden, setHidden] = useState(true);
  const [open, setOpen] = useState(false);
  const secure = field.type === 'password';
  const options = field.type === 'select' || field.type === 'radio' ? normalizeOptions(field.options) : null;
  const selected = options && options.find((o) => o.value === String(value));
  const keyboard = field.type === 'email' ? 'email-address' : field.type === 'number' || field.name === 'mobile' ? (field.name === 'mobile' ? 'phone-pad' : 'numeric') : 'default';
  const framed = !!theme.secondary_gradient && !error && variant !== 'filled';
  const box = [s.box, inputStyle(variant, !!error, ink, framed)];

  return (
    <View style={s.field}>
      <Text style={[s.label, { color: ink, textAlign: align }]}>{field.label}{field.required ? ' *' : ''}</Text>
      <Frame variant={variant} framed={framed} surface={surface}>
      {options ? (
        <TouchableOpacity activeOpacity={0.8} onPress={() => setOpen(true)} style={[...box, s.select]}>
          <Text style={{ color: selected ? ink : tint(ink, 0.45) }}>{selected ? selected.label : 'Select...'}</Text>
          <Text style={{ color: ink }}>▾</Text>
        </TouchableOpacity>
      ) : (
        <View style={[...box, s.row]}>
          <TextInput
            value={value || ''}
            onChangeText={onChange}
            secureTextEntry={secure && hidden}
            autoCapitalize={field.type === 'text' && field.name !== 'mobile' ? 'sentences' : 'none'}
            autoCorrect={false}
            keyboardType={keyboard}
            multiline={field.type === 'textarea'}
            placeholderTextColor={tint(ink, 0.4)}
            style={[s.input, { color: ink }]}
          />
          {secure && (
            <TouchableOpacity onPress={() => setHidden(!hidden)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={{ color: theme.link, fontWeight: '700', fontSize: 12 }}>{hidden ? 'Show' : 'Hide'}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      </Frame>
      {!!error && <Text style={[s.error, { textAlign: align }]}>{error}</Text>}

      {options && (
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={s.backdrop} onPress={() => setOpen(false)}>
            <View style={[s.sheet, { backgroundColor: theme.card }]}>
              <FlatList
                data={options}
                keyExtractor={(o) => o.value}
                renderItem={({ item }) => (
                  <TouchableOpacity style={s.option} onPress={() => { onChange(item.value); setOpen(false); }}>
                    <Text style={{ color: theme.card_text, fontWeight: item.value === String(value) ? '800' : '400' }}>{item.label}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  field: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  box: { minHeight: 46, paddingHorizontal: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  input: { flex: 1, paddingVertical: 10, fontSize: 15 },
  error: { color: '#dc2626', fontSize: 12, marginTop: 5 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  sheet: { borderRadius: 16, maxHeight: '60%', paddingVertical: 8 },
  option: { paddingHorizontal: 20, paddingVertical: 14 },
});
