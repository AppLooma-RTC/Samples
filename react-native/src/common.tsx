import type React from 'react';
// Shared pieces for every sample screen: config, tokens, the design system.
import { Platform } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type { KitProps } from '@applooma/uikit-react-native';

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

/** Everything the UIKit screens need. The token provider calls YOUR server; the API secret never ships in the app. */
export const kit: Omit<KitProps, 'room' | 'onLeave'> = {
  appId: APP_ID,
  user: Me,
  tokenProvider: async (room, role, user) => {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room, identity: user.id, name: user.name, role }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `Token server answered ${res.status}`);
    return body;
  },
};

export const cleanRoom = (s: string) => s.trim().replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 40) || 'lobby';

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

export type IconType = React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
