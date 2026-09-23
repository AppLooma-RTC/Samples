import AppEngine, { type AppRemoteUser, type AppTrack } from '@applooma/rtc-web';
import { APP_ID, avatarStyle, currentUser, esc, fetchToken, h, I, initial, toast } from '../lib';

/**
 * Live streaming: one host on camera, any number of viewers. Viewers watch,
 * comment, send hearts and gifts — all over sendMessage, no extra server.
 */
const GIFTS = [
  { e: '🌹', n: 'Rose' }, { e: '💎', n: 'Diamond' }, { e: '🚀', n: 'Rocket' }, { e: '👑', n: 'Crown' },
];

export function liveScene(root: HTMLElement, room: string, back: () => void) {
  const me = currentUser();
  const engine = AppEngine.create({ appId: APP_ID, video: { height: 720, fps: 30 } });
  let isHost = true;
  let started = false;
  const nameOf = (u?: AppRemoteUser) => (u?.attributes.name as string) || u?.uid || 'Someone';

  const s = h('div', 'screen');
  s.innerHTML = `
    <div class="stage"><div class="placeholder"><div class="muted" style="text-align:center">${I.live}<div style="margin-top:8px">Waiting for the host…</div></div></div><video autoplay playsinline muted></video></div>
    <div class="shade-top"></div><div class="shade-bottom"></div>
    <div class="topbar">
      <div class="pill glass"><div class="avatar" id="hostAv"></div><div class="host-name"><b id="hostName">—</b><small id="hostSub">Live</small></div></div>
      <span class="tag-live" id="liveTag" style="display:none">LIVE</span>
      <div class="spacer"></div>
      <div class="viewers glass">${I.eye}<span id="count">0</span></div>
      <button class="icon-btn glass" id="close">${I.close}</button>
    </div>
    <div class="chat" id="chat"></div>
    <div class="hearts" id="hearts"></div>
    <div class="side" id="side" style="display:none">
      <button class="btn-round soft glass" id="mic" title="Microphone">${I.mic}</button>
      <button class="btn-round soft glass" id="cam" title="Camera">${I.cam}</button>
      <button class="btn-round soft glass" id="flip" title="Switch camera">${I.flip}</button>
    </div>
    <div class="bottombar" id="bar" style="display:none">
      <input class="say" id="say" placeholder="Say something…" maxlength="120">
      <button class="btn-round soft glass" id="gift" title="Send a gift" style="color:var(--gold)">${I.gift}</button>
      <button class="btn-round brand" id="like" title="Like">${I.heart}</button>
    </div>
    <div class="prejoin">
      <div class="hero" style="font-size:26px">Live · <span>${esc(room.replace(/^live-/, ''))}</span></div>
      <div class="seg glass"><button class="on" data-r="host">Go live</button><button data-r="audience">Watch</button></div>
      <button class="cta" id="start">Start broadcast</button>
    </div>`;
  root.replaceChildren(s);
  const $ = <T extends HTMLElement>(id: string) => s.querySelector('#' + id) as T;
  const video = s.querySelector('.stage video') as HTMLVideoElement;
  const placeholder = s.querySelector('.placeholder') as HTMLElement;
  const chat = $('chat');

  function line(html: string, cls = '') {
    const m = h('div', 'msg ' + cls, html); chat.append(m);
    while (chat.children.length > 40) chat.firstElementChild!.remove();
  }
  function heart() {
    const e = h('div', 'heart', ['💖', '💜', '💗', '✨', '🔥'][Math.floor(Math.random() * 5)]);
    e.style.setProperty('--dx', `${Math.round(Math.random() * 60 - 30)}px`);
    $('hearts').append(e); setTimeout(() => e.remove(), 2300);
  }
  function giftBanner(from: string, g: { e: string; n: string }) {
    const b = h('div', 'gift-banner', `<div class="avatar" style="${avatarStyle(from)}">${initial(from)}</div><div>${esc(from)}<br><small style="font-weight:600">sent ${g.n}</small></div><span class="big">${g.e}</span>`);
    s.append(b); setTimeout(() => b.remove(), 3300);
    line(`<b>${esc(from)}</b>sent ${g.n} ${g.e}`, 'gift');
  }
  const setCount = () => { $('count').textContent = String(engine.audienceCount + (isHost ? 0 : 1)); };
  function showHost(name: string, uid: string) {
    $('hostName').textContent = name;
    const av = $('hostAv'); av.setAttribute('style', avatarStyle(uid)); av.textContent = initial(name);
  }

  s.querySelectorAll<HTMLButtonElement>('.seg button').forEach((b) => b.onclick = () => {
    s.querySelectorAll('.seg button').forEach((x) => x.classList.toggle('on', x === b));
    isHost = b.dataset.r === 'host';
    $('start').textContent = isHost ? 'Start broadcast' : 'Join as viewer';
  });

  engine
    .on('track-subscribed', (track: AppTrack, user) => {
      if (track.kind === 'audio') { track.attach(); return; }
      if (user.isPublisher) { track.attach(video); placeholder.style.display = 'none'; showHost(nameOf(user), user.uid); $('liveTag').style.display = ''; }
    })
    .on('track-unsubscribed', (track, user) => {
      if (track.kind === 'video' && user.isPublisher) { track.detach(); placeholder.style.display = ''; }
    })
    .on('user-joined', (u) => { if (!u.isPublisher) line(`<b>${esc(nameOf(u))}</b>joined`, 'sys'); setCount(); })
    .on('user-left', (u) => { if (u.isPublisher && !isHost) { placeholder.style.display = ''; toast(s, 'The host ended the live'); } setCount(); })
    .on('audience-changed', setCount)
    .on('message', (m) => {
      const from = nameOf(m.from);
      if (m.text) line(`<b>${esc(from)}</b>${esc(m.text)}`);
      else if (m.data?.kind === 'like') heart();
      else if (m.data?.kind === 'gift') giftBanner(from, GIFTS[Number(m.data.i) % GIFTS.length]);
    })
    .on('disconnected', () => toast(s, 'Disconnected'))
    .on('error', (e) => toast(s, e.message));

  $('start').onclick = async () => {
    if (started) return; started = true;
    ($('start') as HTMLButtonElement).textContent = 'Connecting…';
    try {
      const { token, wsUrl } = await fetchToken(room, isHost ? 'host' : 'audience');
      await engine.joinChannel(token, wsUrl, { role: isHost ? 'host' : 'audience', camera: isHost, microphone: isHost });
      s.querySelector('.prejoin')!.remove();
      $('bar').style.display = '';
      if (isHost) {
        $('side').style.display = '';
        engine.attachLocalVideo(video); video.style.transform = 'scaleX(-1)';
        placeholder.style.display = 'none'; $('liveTag').style.display = '';
        showHost(me.name, me.id); $('hostSub').textContent = 'You are live';
      }
      line('Welcome! Be kind in the chat 💬', 'sys');
      setCount();
    } catch (e) {
      started = false; ($('start') as HTMLButtonElement).textContent = 'Try again';
      toast(s, (e as Error).message);
    }
  };

  const say = $('say') as HTMLInputElement;
  say.onkeydown = async (e) => {
    if (e.key !== 'Enter' || !say.value.trim()) return;
    const text = say.value.trim(); say.value = '';
    line(`<b>${esc(me.name)}</b>${esc(text)}`);
    await engine.sendMessage(text).catch(() => {});
  };
  $('like').onclick = () => { heart(); engine.sendMessage({ kind: 'like' }, { reliable: false }).catch(() => {}); };
  $('gift').onclick = () => {
    const i = Math.floor(Math.random() * GIFTS.length);
    giftBanner(me.name, GIFTS[i]); engine.sendMessage({ kind: 'gift', i }).catch(() => {});
  };
  let mic = true, cam = true;
  $('mic').onclick = () => { mic = !mic; engine.enableMicrophone(mic); $('mic').innerHTML = mic ? I.mic : I.micOff; $('mic').classList.toggle('off', !mic); };
  $('cam').onclick = () => { cam = !cam; engine.enableCamera(cam); $('cam').innerHTML = cam ? I.cam : I.camOff; $('cam').classList.toggle('off', !cam); placeholder.style.display = cam ? 'none' : ''; };
  $('flip').onclick = () => engine.switchCamera();
  $('close').onclick = back;

  return () => { engine.destroy(); };
}
