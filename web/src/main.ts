import './styles.css';
import { APP_ID, cleanRoom, currentUser, h, I, setName } from './lib';
import { liveScene } from './scenes/live';
import { voiceScene } from './scenes/voice';
import { callScene } from './scenes/call';

const app = document.getElementById('app')!;
let cleanup: (() => void) | undefined;

export type Scene = (root: HTMLElement, room: string, back: () => void) => () => void;

function open(scene: Scene, room: string) {
  cleanup?.();
  app.replaceChildren();
  cleanup = scene(app, room, home);
}

function home() {
  cleanup?.(); cleanup = undefined;
  const me = currentUser();
  const s = h('div', 'screen home');
  s.innerHTML = `
    <div class="brand"><div class="logo">A</div><div><h1>AppLooma RTC</h1><p>Sample app · Web</p></div></div>
    <div class="hero">Real-time, <span>beautifully</span> simple.</div>
    ${APP_ID && APP_ID !== 'YOUR_APP_ID' ? '' : '<div class="glass" style="padding:12px 14px;border-radius:14px;font-size:13px">Set <b>VITE_APP_ID</b> and <b>VITE_TOKEN_URL</b> in <code>.env</code> — see README.</div>'}
    <div class="row2">
      <div class="field"><label>YOUR NAME</label><input class="input" id="name" maxlength="24" value="${me.name.replace(/"/g, '')}"></div>
      <div class="field"><label>ROOM / CALL CODE</label><input class="input" id="room" maxlength="40" value="demo"></div>
    </div>
    <div class="cards">
      <button class="card live" data-k="live"><div class="ic">${I.live}</div><b>Live Streaming</b><small>Go live · watch · chat · gifts</small></button>
      <button class="card voice" data-k="voice"><div class="ic">${I.waves}</div><b>Voice Room</b><small>8 seats · speaking rings</small></button>
      <button class="card acall" data-k="acall"><div class="ic">${I.phone}</div><b>Voice Call</b><small>1-to-1 · HD audio</small></button>
      <button class="card vcall" data-k="vcall"><div class="ic">${I.video}</div><b>Video Call</b><small>1-to-1 · 1080p</small></button>
    </div>
    <p class="foot">Open the same room in a second tab or device to talk to yourself.</p>`;
  app.replaceChildren(s);
  s.querySelectorAll<HTMLButtonElement>('.card').forEach((b) => b.onclick = () => {
    setName((s.querySelector('#name') as HTMLInputElement).value || me.name);
    const room = cleanRoom((s.querySelector('#room') as HTMLInputElement).value);
    const k = b.dataset.k!;
    if (k === 'live') open(liveScene, `live-${room}`);
    else if (k === 'voice') open(voiceScene, `voice-${room}`);
    else open(callScene(k === 'vcall'), `${k}-${room}`);
  });
}

home();
