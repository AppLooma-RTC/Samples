// Shared helpers for the sample scenes: config, tokens, the signed-in "user",
// avatars and icons. Nothing here is AppLooma-specific except fetchToken.

export const APP_ID = import.meta.env.VITE_APP_ID as string;
export const TOKEN_URL = (import.meta.env.VITE_TOKEN_URL as string) || 'http://localhost:3001/token';

export type Role = 'host' | 'cohost' | 'audience';

/** Ask YOUR token server (../token-server) for a token. The API secret never reaches the browser. */
export async function fetchToken(room: string, role: Role): Promise<{ token: string; wsUrl: string }> {
  const me = currentUser();
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room, identity: me.id, name: me.name, role }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Token server answered ${res.status}`);
  return body;
}

export interface Me { id: string; name: string }

/** A per-browser identity so two tabs are two different people. */
export function currentUser(): Me {
  let id = sessionStorage.getItem('uid');
  if (!id) { id = 'u' + Math.random().toString(36).slice(2, 9); sessionStorage.setItem('uid', id); }
  const name = localStorage.getItem('name') || 'Guest ' + id.slice(1, 4).toUpperCase();
  return { id, name };
}
export function setName(name: string) { localStorage.setItem('name', name.trim().slice(0, 24)); }

/** Room names must match [a-zA-Z0-9_-]{1,64}. */
export const cleanRoom = (s: string) => s.trim().replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 40) || 'lobby';

const GRADIENTS = [
  ['#7c5cff', '#ff4fa3'], ['#13b58a', '#0e6f78'], ['#ff9a3c', '#ff4f7a'], ['#3c8dff', '#7c5cff'],
  ['#ff4f7a', '#ffc24b'], ['#00c2d1', '#2ee59d'], ['#b04bff', '#5a3cff'], ['#ff6b3c', '#ff3b5c'],
];
export function avatarStyle(key: string): string {
  let h = 0; for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const [a, b] = GRADIENTS[h % GRADIENTS.length];
  return `background:linear-gradient(135deg,${a},${b})`;
}
export const initial = (name: string) => (name.trim()[0] || '?').toUpperCase();

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag); if (cls) el.className = cls; if (html) el.innerHTML = html; return el;
}
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export function toast(root: HTMLElement, text: string) {
  const t = h('div', 'toast glass', esc(text)); root.append(t); setTimeout(() => t.remove(), 3100);
}

export function formatTime(sec: number) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const svg = (d: string, size = 22) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
export const I = {
  live: svg('<circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.24a6 6 0 0 1 0-8.49M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14"/>'),
  mic: svg('<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4"/>'),
  micOff: svg('<path d="m2 2 20 20M9 9v2a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6M17 16.95A7 7 0 0 1 5 11v-1m14 0v1a7 7 0 0 1-.11 1.23M12 18v4"/>'),
  cam: svg('<path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/>'),
  camOff: svg('<path d="m2 2 20 20M16 16v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L22 8v8"/>'),
  flip: svg('<path d="M20 7h-3.5L15 5H9L7.5 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z"/><path d="M9 13a3 3 0 0 1 5.12-2.12M15 13a3 3 0 0 1-5.12 2.12M14 9v2h-2M10 17v-2h2"/>'),
  phone: svg('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.18 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.1 9.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"/>'),
  end: svg('<path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7a2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07M5.46 14.32A19.8 19.8 0 0 1 2.1 4.18 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.1 9.9M22 2 2 22"/>'),
  speaker: svg('<path d="M11 5 6 9H2v6h4l5 4V5ZM15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/>'),
  close: svg('<path d="M18 6 6 18M6 6l12 12"/>', 20),
  gift: svg('<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>'),
  heart: svg('<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>'),
  send: svg('<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>', 20),
  users: svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>', 16),
  eye: svg('<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>', 15),
  plus: svg('<path d="M12 5v14M5 12h14"/>', 20),
  hand: svg('<path d="M18 11V6a2 2 0 0 0-4 0M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>'),
  video: svg('<path d="m16 13 5.22 3.48a.5.5 0 0 0 .78-.42V7.94a.5.5 0 0 0-.76-.42L16 11"/><rect x="2" y="6" width="14" height="12" rx="2"/>', 24),
  waves: svg('<path d="M2 10v3M6 6v11M10 3v18M14 8v7M18 5v13M22 10v3"/>', 24),
};
