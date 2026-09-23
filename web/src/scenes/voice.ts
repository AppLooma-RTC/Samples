import AppEngine from '@applooma/rtc-web';
import { APP_ID, avatarStyle, currentUser, esc, fetchToken, h, I, initial, toast } from '../lib';

/**
 * Voice room: up to 8 people on seats, speaking rings, text chat.
 *
 * Seats are ordered by when each person joined. Everyone announces their join
 * time with a small message and answers newcomers, so every client draws the
 * same seat order with no server state. The first person holds the crown.
 */
const SEATS = 8;

export function voiceScene(root: HTMLElement, room: string, back: () => void) {
  const me = currentUser();
  const engine = AppEngine.create({ appId: APP_ID });
  const joinedAt = new Map<string, number>([[me.id, Date.now()]]);
  const names = new Map<string, string>([[me.id, me.name]]);
  let speaking = new Set<string>();
  let micOn = true;

  const s = h('div', 'screen voice');
  s.innerHTML = `
    <div class="topbar">
      <button class="icon-btn glass" id="close">${I.close}</button>
      <div class="spacer"></div>
      <div class="viewers glass">${I.users}<span id="count">1</span></div>
    </div>
    <div class="room-title"><h2>🎙️ ${esc(room.replace(/^voice-/, ''))}</h2><p><span class="dot"></span> Voice room · <span id="status">connecting…</span></p></div>
    <div class="seats" id="seats"></div>
    <div class="chat" id="chat"></div>
    <div class="bottombar">
      <input class="say" id="say" placeholder="Say hi to the room…" maxlength="120">
      <button class="btn-round soft" id="mic">${I.mic}</button>
      <button class="btn-round soft" id="hand" title="Wave">${I.hand}</button>
    </div>`;
  root.replaceChildren(s);
  const $ = (id: string) => s.querySelector('#' + id) as HTMLElement;
  const chat = $('chat');

  function line(html: string, cls = '') {
    chat.append(h('div', 'msg ' + cls, html));
    while (chat.children.length > 60) chat.firstElementChild!.remove();
    chat.scrollTop = chat.scrollHeight;
  }

  function render() {
    const present = new Set([me.id, ...engine.remoteUsers.map((u) => u.uid)]);
    const order = [...present].sort((a, b) => (joinedAt.get(a) ?? 9e15) - (joinedAt.get(b) ?? 9e15) || a.localeCompare(b));
    const seats = $('seats'); seats.replaceChildren();
    for (let i = 0; i < SEATS; i++) {
      const uid = order[i];
      const seat = h('div', 'seat' + (i === 0 ? ' host' : ''));
      if (!uid) {
        seat.innerHTML = `<div class="ring empty"><div class="face">${I.plus}</div></div><div class="num">Seat ${i + 1}</div>`;
      } else {
        const name = names.get(uid) || uid;
        const muted = uid === me.id ? !micOn : !(engine.remoteUsers.find((u) => u.uid === uid)?.audioEnabled ?? true);
        seat.innerHTML = `
          <div class="ring ${speaking.has(uid) && !muted ? 'speaking' : ''}">
            ${i === 0 ? '<span class="crown">👑</span>' : ''}
            <div class="face" style="${avatarStyle(uid)}">${initial(name)}</div>
            ${muted ? `<span class="mic-off">${I.micOff.replace(/22/g, '12')}</span>` : ''}
          </div>
          <div class="label">${esc(name)}${uid === me.id ? ' (you)' : ''}</div>`;
      }
      seats.append(seat);
    }
    $('count').textContent = String(present.size);
  }

  const hello = () => engine.sendMessage({ kind: 'hi', at: joinedAt.get(me.id), name: me.name }).catch(() => {});

  engine
    .on('track-subscribed', (t) => { if (t.kind === 'audio') t.attach(); render(); })
    .on('track-unsubscribed', render)
    .on('user-joined', (u) => { names.set(u.uid, (u.attributes.name as string) || u.uid); line(`<b>${esc(names.get(u.uid)!)}</b>joined the room`, 'sys'); hello(); render(); })
    .on('user-left', (u) => { line(`<b>${esc(names.get(u.uid) || u.uid)}</b>left`, 'sys'); joinedAt.delete(u.uid); render(); })
    .on('active-speakers-changed', (uids) => { speaking = new Set(uids); render(); })
    .on('message', (m) => {
      const uid = m.from?.uid; if (!uid) return;
      if (m.data?.kind === 'hi') { joinedAt.set(uid, Number(m.data.at)); names.set(uid, String(m.data.name || uid)); render(); return; }
      if (m.data?.kind === 'wave') { line(`<b>${esc(names.get(uid) || uid)}</b>waved 👋`, 'sys'); return; }
      if (m.text) line(`<b>${esc(names.get(uid) || uid)}</b>${esc(m.text)}`);
    })
    .on('error', (e) => toast(s, e.message));

  (async () => {
    try {
      const { token, wsUrl } = await fetchToken(room, 'cohost');
      await engine.joinChannel(token, wsUrl, { role: 'cohost', microphone: true });
      engine.remoteUsers.forEach((u) => names.set(u.uid, (u.attributes.name as string) || u.uid));
      $('status').textContent = 'live';
      line('You are on a seat — just start talking 🎧', 'sys');
      hello(); render();
    } catch (e) { $('status').textContent = 'failed'; toast(s, (e as Error).message); }
  })();
  render();
  const tick = setInterval(render, 1500); // picks up remote mute changes

  const say = $('say') as HTMLInputElement;
  say.onkeydown = (e) => {
    if (e.key !== 'Enter' || !say.value.trim()) return;
    const text = say.value.trim(); say.value = '';
    line(`<b>${esc(me.name)}</b>${esc(text)}`); engine.sendMessage(text).catch(() => {});
  };
  $('mic').onclick = () => { micOn = !micOn; engine.enableMicrophone(micOn); $('mic').innerHTML = micOn ? I.mic : I.micOff; $('mic').classList.toggle('off', !micOn); render(); };
  $('hand').onclick = () => { line(`<b>${esc(me.name)}</b>waved 👋`, 'sys'); engine.sendMessage({ kind: 'wave' }).catch(() => {}); };
  $('close').onclick = back;

  return () => { clearInterval(tick); engine.destroy(); };
}
