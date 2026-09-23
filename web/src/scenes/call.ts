import AppEngine, { type AppRemoteUser } from '@applooma/rtc-web';
import { APP_ID, avatarStyle, currentUser, esc, fetchToken, formatTime, h, I, initial, toast } from '../lib';

/**
 * 1-to-1 call, voice or video. Both people open the same call code; the
 * second one to arrive connects the call. The timer starts when they meet.
 */
export function callScene(video: boolean) {
  return (root: HTMLElement, room: string, back: () => void) => {
    const me = currentUser();
    const engine = AppEngine.create({ appId: APP_ID, video: { height: 720, fps: 30 } });
    let peer: AppRemoteUser | undefined;
    let startedAt = 0;
    let mic = true, cam = video, speaker = true;

    const s = h('div', 'screen call' + (video ? ' video' : ''));
    s.innerHTML = `
      ${video ? '<div class="remote-full"><video autoplay playsinline></video></div><div class="shade-top"></div>' : ''}
      <div class="topbar" style="${video ? '' : 'position:static;padding:14px 12px 0'}">
        <button class="icon-btn glass" id="min">${I.close}</button>
        <div class="spacer"></div>
        <div class="viewers glass"><span class="net"><i style="height:5px"></i><i style="height:8px"></i><i style="height:12px"></i></span><span id="quality">HD</span></div>
      </div>
      <div class="call-center" id="center">
        <div class="pulse"><div class="face" id="face" style="${avatarStyle(room)}">…</div></div>
        <h2 id="peerName">Waiting…</h2>
        <div class="timer" id="timer">Share the code <b style="color:var(--text)">${esc(room.replace(/^(a|v)call-/, ''))}</b></div>
      </div>
      ${video ? `<div class="pip" id="pip"><video autoplay playsinline muted></video></div>` : ''}
      <div class="controls">
        <div class="control"><button class="btn-round soft glass" id="mic">${I.mic}</button>Mute</div>
        ${video
          ? `<div class="control"><button class="btn-round soft glass" id="cam">${I.cam}</button>Camera</div>
             <div class="control"><button class="btn-round end big" id="end">${I.end}</button>End</div>
             <div class="control"><button class="btn-round soft glass" id="flip">${I.flip}</button>Flip</div>`
          : `<div class="control"><button class="btn-round end big" id="end">${I.end}</button>End</div>
             <div class="control"><button class="btn-round soft glass" id="spk">${I.speaker}</button>Speaker</div>`}
      </div>`;
    root.replaceChildren(s);
    const $ = (id: string) => s.querySelector('#' + id) as HTMLElement;
    const remoteVideo = s.querySelector('.remote-full video') as HTMLVideoElement | null;
    const audios: HTMLMediaElement[] = [];

    const tick = setInterval(() => { if (startedAt) $('timer').textContent = formatTime(Math.floor((Date.now() - startedAt) / 1000)); }, 500);

    function showPeer(u: AppRemoteUser) {
      peer = u;
      const name = (u.attributes.name as string) || u.uid;
      $('peerName').textContent = name;
      $('face').textContent = initial(name); $('face').setAttribute('style', avatarStyle(u.uid));
      if (!startedAt) startedAt = Date.now();
    }

    engine
      .on('user-joined', (u) => { if (!peer) showPeer(u); })
      .on('track-subscribed', (t, u) => {
        if (!peer) showPeer(u);
        if (t.kind === 'audio') { const el = t.attach(); audios.push(el); el.muted = !speaker; return; }
        if (remoteVideo) { t.attach(remoteVideo); $('center').style.opacity = '0'; }
      })
      .on('track-unsubscribed', (t) => { if (t.kind === 'video') $('center').style.opacity = '1'; })
      .on('user-left', (u) => {
        if (u.uid !== peer?.uid) return;
        toast(s, 'Call ended'); startedAt = 0; peer = undefined;
        $('peerName').textContent = 'Call ended'; $('timer').textContent = ''; $('center').style.opacity = '1';
        setTimeout(back, 1500);
      })
      .on('remote-stats', (stats) => {
        const st = stats[0]; if (!st) return;
        const loss = st.audioPacketsLost + st.videoPacketsLost;
        $('quality').textContent = video && st.videoHeight ? `${st.videoHeight}p` : loss > 50 ? 'Weak' : 'HD';
      })
      .on('error', (e) => toast(s, e.message));

    (async () => {
      try {
        const { token, wsUrl } = await fetchToken(room, 'host');
        await engine.joinChannel(token, wsUrl, { role: 'host', camera: video, microphone: true });
        if (video) engine.attachLocalVideo(s.querySelector('#pip video') as HTMLVideoElement);
        if (!peer) $('peerName').textContent = 'Calling…';
      } catch (e) { toast(s, (e as Error).message); $('peerName').textContent = 'Could not connect'; }
    })();

    $('mic').onclick = () => { mic = !mic; engine.enableMicrophone(mic); $('mic').innerHTML = mic ? I.mic : I.micOff; $('mic').classList.toggle('off', !mic); };
    $('end').onclick = back; $('min').onclick = back;
    if (video) {
      $('cam').onclick = () => { cam = !cam; engine.enableCamera(cam); $('cam').innerHTML = cam ? I.cam : I.camOff; $('cam').classList.toggle('off', !cam); $('pip').style.visibility = cam ? '' : 'hidden'; };
      $('flip').onclick = () => engine.switchCamera();
      // Drag the self-view anywhere.
      const pip = $('pip'); let dx = 0, dy = 0, drag = false;
      pip.onpointerdown = (e) => { drag = true; dx = e.clientX - pip.offsetLeft; dy = e.clientY - pip.offsetTop; pip.setPointerCapture(e.pointerId); };
      pip.onpointermove = (e) => { if (!drag) return; pip.style.left = `${e.clientX - dx}px`; pip.style.top = `${e.clientY - dy}px`; pip.style.right = 'auto'; };
      pip.onpointerup = () => { drag = false; };
    } else {
      $('spk').onclick = () => { speaker = !speaker; audios.forEach((a) => (a.muted = !speaker)); $('spk').classList.toggle('off', !speaker); };
    }
    void me;
    return () => { clearInterval(tick); audios.forEach((a) => a.remove()); engine.destroy(); };
  };
}
