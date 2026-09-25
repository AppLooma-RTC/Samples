/**
 * AppLooma RTC — Web sample, built on the UIKit.
 *
 * Every screen is one component from @applooma/uikit-react. The only code an
 * app needs to write is this file: a home screen, a token provider that calls
 * YOUR server, and which room to open.
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LiveStream, VoiceRoom, Call, type KitUser, type TokenProvider } from '@applooma/uikit-react';
import './styles.css';

const APP_ID = import.meta.env.VITE_APP_ID as string;
const TOKEN_URL = (import.meta.env.VITE_TOKEN_URL as string) || 'http://localhost:3001/token';

/** Asks ../token-server for a token. Your API secret never reaches the browser. */
const tokenProvider: TokenProvider = async (room, role, user) => {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room, role, identity: user.id, name: user.name }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Token server answered ${res.status}`);
  return body;
};

/** A per-tab identity so two tabs are two different people. */
function currentUser(): KitUser {
  let id = sessionStorage.getItem('uid');
  if (!id) { id = 'u' + Math.random().toString(36).slice(2, 9); sessionStorage.setItem('uid', id); }
  return { id, name: localStorage.getItem('name') || 'Guest ' + id.slice(1, 4).toUpperCase() };
}
const cleanRoom = (s: string) => s.trim().replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 40) || 'lobby';

type Route = { kind: 'home' } | { kind: 'live' | 'voice' | 'acall' | 'vcall'; room: string };

function App() {
  const [route, setRoute] = useState<Route>({ kind: 'home' });
  const [user] = useState(currentUser);
  const home = () => setRoute({ kind: 'home' });
  const kit = { appId: APP_ID, user, tokenProvider, onLeave: home };

  switch (route.kind) {
    case 'live': return <div className="screen"><LiveStream {...kit} room={route.room} /></div>;
    case 'voice': return <div className="screen"><VoiceRoom {...kit} room={route.room} seats={8} /></div>;
    case 'acall': return <div className="screen"><Call {...kit} room={route.room} video={false} /></div>;
    case 'vcall': return <div className="screen"><Call {...kit} room={route.room} video /></div>;
    default: return <Home user={user} open={setRoute} />;
  }
}

const CARDS = [
  { k: 'live', cls: 'live', title: 'Live Streaming', sub: 'Go live · watch · chat · gifts', icon: 'M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.24a6 6 0 0 1 0-8.49M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14' },
  { k: 'voice', cls: 'voice', title: 'Voice Room', sub: '8 seats · speaking rings', icon: 'M2 10v3M6 6v11M10 3v18M14 8v7M18 5v13M22 10v3' },
  { k: 'acall', cls: 'acall', title: 'Voice Call', sub: '1-to-1 · HD audio', icon: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.18 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.1 9.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z' },
  { k: 'vcall', cls: 'vcall', title: 'Video Call', sub: '1-to-1 · 1080p', icon: 'm16 13 5.22 3.48a.5.5 0 0 0 .78-.42V7.94a.5.5 0 0 0-.76-.42L16 11M2 8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z' },
] as const;

function Home({ user, open }: { user: KitUser; open: (r: Route) => void }) {
  const [name, setName] = useState(user.name);
  const [room, setRoom] = useState('demo');
  const go = (k: Route['kind']) => {
    if (name.trim()) { user.name = name.trim().slice(0, 24); localStorage.setItem('name', user.name); }
    if (k !== 'home') open({ kind: k, room: `${k}-${cleanRoom(room)}` });
  };
  return (
    <div className="screen home">
      <div className="brand"><div className="logo">A</div><div><h1>AppLooma RTC</h1><p>Sample app · Web · built on the UIKit</p></div></div>
      <div className="hero">Real-time, <span>beautifully</span> simple.</div>
      {(!APP_ID || APP_ID === 'YOUR_APP_ID') && <div className="glass note">Set <b>VITE_APP_ID</b> and <b>VITE_TOKEN_URL</b> in <code>.env</code> — see README.</div>}
      <div className="row2">
        <label className="field">YOUR NAME<input className="input" maxLength={24} value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="field">ROOM / CALL CODE<input className="input" maxLength={40} value={room} onChange={(e) => setRoom(e.target.value)} /></label>
      </div>
      <div className="cards">
        {CARDS.map((c) => (
          <button key={c.k} className={`card ${c.cls}`} onClick={() => go(c.k)}>
            <div className="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={c.icon} /></svg></div>
            <b>{c.title}</b><small>{c.sub}</small>
          </button>
        ))}
      </div>
      <p className="foot">Open the same room in a second tab or device to talk to yourself.</p>
    </div>
  );
}

createRoot(document.getElementById('app')!).render(<App />);
