// Shared pieces for every sample screen: config, tokens, the design system.
import React from 'react';
import { PermissionsAndroid, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

/**
 * Your App ID (console → your app) and the token server from ../token-server.
 * 10.0.2.2 is the host machine as seen from the Android emulator.
 */
export const APP_ID = 'YOUR_APP_ID';
export const TOKEN_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3001/token' : 'http://localhost:3001/token';

/** The person using this device. A real app takes this from its own sign-in. */
export const Me = {
  id: 'u' + Math.random().toString(36).slice(2, 9),
  name: '',
};
Me.name = 'Guest ' + Me.id.slice(1, 4).toUpperCase();

export type Role = 'host' | 'cohost' | 'audience';

/** Ask YOUR token server for a token. The API secret never reaches the app. */
export async function fetchToken(room: string, role: Role): Promise<{ token: string; wsUrl: string }> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room, identity: Me.id, name: Me.name, role }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Token server answered ${res.status}`);
  return body;
}

export async function askPermissions(camera: boolean): Promise<boolean> {
  if (Platform.OS !== 'android') return true; // iOS asks on first use (Info.plist strings)
  const wanted = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, ...(camera ? [PermissionsAndroid.PERMISSIONS.CAMERA] : [])];
  const r = await PermissionsAndroid.requestMultiple(wanted);
  return wanted.every((p) => r[p] === PermissionsAndroid.RESULTS.GRANTED);
}

export const cleanRoom = (s: string) => s.trim().replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 40) || 'lobby';
export const formatTime = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

// ---------------------------------------------------------------- design system

export const C = {
  ink: '#07070D', glass: 'rgba(255,255,255,0.07)', glass2: 'rgba(255,255,255,0.12)', line: 'rgba(255,255,255,0.09)',
  text: '#F5F5FA', muted: '#9A9AB0', violet: '#7C5CFF', pink: '#FF4FA3', live: '#FF3B5C', gold: '#FFC24B', green: '#2EE59D',
};
export const BRAND = [C.violet, C.pink];

const GRADIENTS = [
  ['#7C5CFF', '#FF4FA3'], ['#13B58A', '#0E6F78'], ['#FF9A3C', '#FF4F7A'], ['#3C8DFF', '#7C5CFF'],
  ['#FF4F7A', '#FFC24B'], ['#00C2D1', '#2EE59D'], ['#B04BFF', '#5A3CFF'], ['#FF6B3C', '#FF3B5C'],
];
export function gradientFor(key: string) {
  let h = 0; for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

export function Avatar({ id, name, size = 36 }: { id: string; name: string; size?: number }) {
  return (
    <LinearGradient colors={gradientFor(id)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)' }}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.4 }}>{(name.trim()[0] || '?').toUpperCase()}</Text>
    </LinearGradient>
  );
}

export function Glass({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.glass, style]}>{children}</View>;
}

/** Round control: soft glass, white when "off", red for end, gradient for brand. */
export type IconType = React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;

export function RoundBtn({ icon: Icon, onPress, size = 50, off, danger, brand, label, tint, color }: {
  icon: IconType; onPress: () => void; size?: number; off?: boolean; danger?: boolean; brand?: boolean; label?: string; tint?: string; color?: string;
}) {
  const inner = <Icon size={size * 0.44} color={off ? '#111' : color ?? '#fff'} strokeWidth={2} />;
  const base: ViewStyle = { width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' };
  const btn = brand && !off
    ? <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={base}>{inner}</LinearGradient>
    : <View style={[base, { backgroundColor: off ? '#fff' : danger ? C.live : tint ?? C.glass2 }, danger && s.dangerShadow]}>{inner}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ alignItems: 'center', transform: [{ scale: pressed ? 0.92 : 1 }] }]}>
      {btn}
      {label ? <Text style={s.btnLabel}>{label}</Text> : null}
    </Pressable>
  );
}

export interface ChatLine { id: number; who: string; text: string; system?: boolean; gift?: boolean }
let lineId = 0;
export const line = (who: string, text: string, extra: Partial<ChatLine> = {}): ChatLine => ({ id: ++lineId, who, text, ...extra });

export function ChatBubble({ l }: { l: ChatLine }) {
  const body = (
    <Text style={{ color: l.system ? C.muted : C.text, fontSize: 13, lineHeight: 18 }}>
      {l.who ? <Text style={{ color: C.gold, fontWeight: '700' }}>{l.who}  </Text> : null}
      {l.text}
    </Text>
  );
  return l.gift
    ? <LinearGradient colors={['rgba(255,194,75,0.35)', 'rgba(255,79,163,0.25)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.bubble}>{body}</LinearGradient>
    : <View style={[s.bubble, { backgroundColor: 'rgba(0,0,0,0.35)' }]}>{body}</View>;
}

export const s = StyleSheet.create({
  glass: { backgroundColor: 'rgba(10,10,20,0.45)', borderColor: C.line, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  dangerShadow: { shadowColor: C.live, shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  btnLabel: { marginTop: 7, fontSize: 11.5, color: '#CFCFE0' },
  bubble: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, marginBottom: 6, maxWidth: '100%' },
  input: { flex: 1, height: 46, borderRadius: 999, paddingHorizontal: 18, borderWidth: 1, borderColor: C.line, backgroundColor: 'rgba(0,0,0,0.35)', color: C.text },
  row: { flexDirection: 'row', alignItems: 'center' },
  small: { fontSize: 12, fontWeight: '600', color: C.text },
});
