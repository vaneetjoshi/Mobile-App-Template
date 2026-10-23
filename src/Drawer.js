import { useEffect, useRef, useState } from 'react';
import { Animated, Image, PanResponder, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import config from '../app-config.json';
import { tint } from './colors';
import { useInsets } from './insets';
import Surface from './Surface';

const { theme, app } = config;
const logo = require('../assets/icon.png');

const ICONS = [
  [/dashboard|home|overview/, 'speedometer-outline'],
  [/security|password|2fa|passkey/, 'shield-checkmark-outline'],
  [/profile|account|user|member|kyc|id-card/, 'person-outline'],
  [/setting|preference|config/, 'settings-outline'],
  [/withdraw|payout/, 'arrow-up-circle-outline'],
  [/deposit|fund|recharge|topup|top-up/, 'arrow-down-circle-outline'],
  [/wallet/, 'wallet-outline'],
  [/income|earning|commission|bonus|reward|roi|profit|invest|plan/, 'trending-up-outline'],
  [/transaction|transfer|history|ledger|statement/, 'swap-horizontal-outline'],
  [/payment|invoice|billing|card|subscription/, 'card-outline'],
  [/order|cart|shop|store|product|purchase|ecommerce/, 'cart-outline'],
  [/team|network|tree|genealogy|downline|referral|binary|level|member/, 'git-network-outline'],
  [/invite|link|share/, 'link-outline'],
  [/gift|coupon|offer|voucher/, 'gift-outline'],
  [/ticket|support|help|chat|message/, 'chatbubbles-outline'],
  [/report|statement|document|file|page/, 'document-text-outline'],
  [/notif|alert|announce/, 'notifications-outline'],
  [/game|casino|play/, 'game-controller-outline'],
  [/course|class|learn|school/, 'school-outline'],
  [/astro|horoscope|star|rank/, 'star-outline'],
  [/reseller|business|agency|partner/, 'briefcase-outline'],
  [/stat|chart|analytic/, 'stats-chart-outline'],
];

export const iconFor = (item) => {
  const text = `${item.icon || ''} ${item.label || ''}`.toLowerCase();
  const match = ICONS.find(([pattern]) => pattern.test(text));

  return match ? match[1] : 'ellipse-outline';
};

const clean = (value) => String(value || '').split(/[?#]/)[0].replace(/\/+$/, '') || '/';

const active = (item, current) => (item.path ? clean(item.path) === clean(current) : item.children.some((child) => active(child, current)));

function Row({ item, depth, current, onSelect }) {
  const color = theme.on_primary;
  const [open, setOpen] = useState(null);
  const group = item.children.length > 0;
  const here = active(item, current);
  const expanded = open === null ? here : open;

  return (
    <View>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => (group ? setOpen(!expanded) : onSelect(item))}
        style={[s.row, { marginLeft: depth * 14, backgroundColor: here && !group ? tint(color, 0.2) : 'transparent' }]}
      >
        <Ionicons name={depth ? 'ellipse' : iconFor(item)} size={depth ? 6 : 21} color={color} style={depth ? s.dot : s.icon} />
        <Text numberOfLines={1} style={[s.label, { color, fontWeight: here ? '800' : '600', fontSize: depth ? 14 : 15 }]}>{item.label}</Text>
        {group && <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={17} color={color} />}
      </TouchableOpacity>
      {group && expanded && item.children.map((child) => <Row key={child.id} item={child} depth={depth + 1} current={current} onSelect={onSelect} />)}
    </View>
  );
}

export default function Drawer({ visible, items, current, lockSupported, lockOn, onClose, onSelect, onToggleLock, onLogout }) {
  const insets = useInsets();
  const { width } = useWindowDimensions();
  const panelWidth = Math.min(320, Math.round(width * 0.82));
  const progress = useRef(new Animated.Value(0)).current;
  const closeRef = useRef(onClose);
  const color = theme.on_primary;

  closeRef.current = onClose;

  useEffect(() => {
    Animated.timing(progress, { toValue: visible ? 1 : 0, duration: 230, useNativeDriver: true }).start();
  }, [visible, progress]);

  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderRelease: (_, g) => {
      if (g.dx < -50) closeRef.current();
    },
  })).current;

  return (
    <View pointerEvents={visible ? 'auto' : 'none'} style={[StyleSheet.absoluteFill, s.layer]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000000', opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] }) }]}>
        <TouchableOpacity activeOpacity={1} style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View
        {...pan.panHandlers}
        style={[s.panel, { width: panelWidth, transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-panelWidth, 0] }) }] }]}
      >
        <Surface color={theme.primary} gradient={theme.primary_gradient} style={{ flex: 1, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 8, paddingLeft: 14 + insets.left }}>
          <View style={s.head}>
            <Image source={logo} style={s.logo} />
            <Text numberOfLines={2} style={[s.name, { color }]}>{app.name}</Text>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingRight: 12, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
            {items.map((item) => <Row key={item.id} item={item} depth={0} current={current} onSelect={onSelect} />)}
          </ScrollView>
          <View style={[s.foot, { borderColor: tint(color, 0.25) }]}>
            {lockSupported && (
              <View style={s.row}>
                <Ionicons name="finger-print" size={21} color={color} style={s.icon} />
                <Text style={[s.label, { color, fontWeight: '600' }]}>Fingerprint / face login</Text>
                <Switch value={lockOn} onValueChange={onToggleLock} trackColor={{ true: tint(color, 0.55), false: tint(color, 0.25) }} thumbColor={color} />
              </View>
            )}
            <TouchableOpacity activeOpacity={0.7} onPress={onLogout} style={s.row}>
              <Ionicons name="log-out-outline" size={21} color={color} style={s.icon} />
              <Text style={[s.label, { color, fontWeight: '600' }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </Surface>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  layer: { zIndex: 40 },
  panel: { position: 'absolute', top: 0, bottom: 0, left: 0, elevation: 16, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 4, height: 0 } },
  head: { flexDirection: 'row', alignItems: 'center', paddingRight: 14, paddingBottom: 18 },
  logo: { width: 52, height: 52, borderRadius: 14, marginRight: 12 },
  name: { flex: 1, fontSize: 18, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 46, paddingHorizontal: 12, borderRadius: 12, marginBottom: 2 },
  icon: { width: 30 },
  dot: { width: 22, textAlign: 'center' },
  label: { flex: 1, fontSize: 15 },
  foot: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, paddingRight: 12 },
});
