import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { AppEngine, AppVideoView, useAppAudioSession, type AppRemoteUser } from '@applooma/rtc-react-native';
import { ChevronDown, Mic, MicOff, PhoneOff, Signal, SwitchCamera, Video, VideoOff } from 'lucide-react-native';
import { APP_ID, Avatar, C, Glass, RoundBtn, askPermissions, fetchToken, formatTime, s } from '../common';

/**
 * 1-to-1 call, voice or video. Both people open the same call code; the second
 * to arrive connects the call and the timer starts.
 */
export default function CallScreen({ room, video, onClose }: { room: string; video: boolean; onClose: () => void }) {
  // A private voice call belongs on the call path: earpiece, speech-tuned echo cancelling.
  const engine = useMemo(() => AppEngine.create({ appId: APP_ID, audioScenario: video ? 'media' : 'call', video: { height: 720, fps: 30 } }), [video]);
  useAppAudioSession(engine);
  const [peer, setPeer] = useState<AppRemoteUser>();
  const [startedAt, setStartedAt] = useState<number>();
  const [status, setStatus] = useState('Connecting…');
  const [quality, setQuality] = useState('HD');
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [, render] = useState(0);
  const pulse = useRef(new Animated.Value(0)).current;
  const pip = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const drag = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { pip.extractOffset(); },
    onPanResponderMove: Animated.event([null, { dx: pip.x, dy: pip.y }], { useNativeDriver: false }),
    onPanResponderRelease: () => { pip.flattenOffset(); },
  })).current;

  useEffect(() => {
    Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 2400, easing: Easing.out(Easing.quad), useNativeDriver: true })).start();
    const meet = (u: AppRemoteUser) => { setPeer((p) => p ?? u); setStartedAt((t) => t ?? Date.now()); render((n) => n + 1); };
    engine
      .on('user-joined', meet).on('track-subscribed', meet).on('track-unsubscribed', () => render((n) => n + 1))
      .on('user-left', () => { setPeer(undefined); setStartedAt(undefined); setStatus('Call ended'); setTimeout(onClose, 1400); })
      .on('remote-stats', (st) => {
        const x = st[0]; if (!x) return;
        setQuality(video && x.videoHeight ? `${x.videoHeight}p` : x.audioPacketsLost > 50 ? 'Weak' : 'HD');
      });
    const tick = setInterval(() => render((n) => n + 1), 500);
    (async () => {
      try {
        if (!(await askPermissions(video))) throw new Error('Permissions are needed for the call');
        const t = await fetchToken(room, 'host');
        await engine.joinChannel(t.token, t.wsUrl, { role: 'host', camera: video, microphone: true });
        setStatus('Calling…');
        engine.remoteUsers.forEach(meet);
      } catch (e) { setStatus((e as Error).message); }
    })();
    return () => { clearInterval(tick); engine.destroy(); };
  }, [engine]);

  const name = peer ? (peer.attributes.name as string) || peer.uid : status;
  const showRemote = video && peer?.hasVideo;
  const code = room.replace(/^(a|v)call-/, '');
  const elapsed = startedAt ? formatTime(Math.floor((Date.now() - startedAt) / 1000)) : '';

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {showRemote
        ? <AppVideoView key={peer!.uid} user={peer} style={StyleSheet.absoluteFill} />
        : (
          <LinearGradient colors={['#1D3A4D', C.ink]} style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
            <View style={{ width: 220, height: 220, alignItems: 'center', justifyContent: 'center' }}>
              {[0, 0.5].map((phase) => (
                <Animated.View key={phase} style={[c.halo, {
                  opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: phase ? [0.5, 0] : [1, 0.2] }),
                  transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: phase ? [1.3, 1.7] : [1, 1.5] }) }],
                }]} />
              ))}
              <Avatar id={peer?.uid ?? room} name={peer ? name : '…'} size={132} />
            </View>
            <Text style={{ color: C.text, fontSize: 26, fontWeight: '800', marginTop: 10 }}>{name}</Text>
            <Text style={{ color: C.muted, fontSize: 15, marginTop: 6, fontVariant: ['tabular-nums'] }}>
              {startedAt ? elapsed : <>Share the code <Text style={{ color: C.text, fontWeight: '700' }}>{code}</Text></>}
            </Text>
          </LinearGradient>
        )}

      <SafeAreaView style={{ flex: 1 }}>
        <View style={[s.row, { paddingHorizontal: 12, paddingTop: 8, gap: 8 }]}>
          <Pressable onPress={onClose}><Glass style={{ padding: 8 }}><ChevronDown color={C.text} size={20} /></Glass></Pressable>
          <View style={{ flex: 1 }} />
          {showRemote && startedAt ? <Glass><Text style={s.small}>{elapsed}</Text></Glass> : null}
          <Glass style={s.row}><Signal color={C.green} size={14} /><Text style={[s.small, { marginLeft: 5 }]}>{quality}</Text></Glass>
        </View>
        <View style={{ flex: 1 }} />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={c.controls}>
          <RoundBtn icon={mic ? Mic : MicOff} off={!mic} label="Mute" onPress={() => { engine.enableMicrophone(!mic); setMic(!mic); }} />
          {video && <RoundBtn icon={cam ? Video : VideoOff} off={!cam} label="Camera" onPress={() => { engine.enableCamera(!cam); setCam(!cam); }} />}
          <RoundBtn icon={PhoneOff} danger size={66} label="End" onPress={onClose} />
          {video && <RoundBtn icon={SwitchCamera} label="Flip" onPress={() => engine.switchCamera()} />}
        </LinearGradient>
      </SafeAreaView>

      {video && cam && (
        <Animated.View {...drag.panHandlers} style={[c.pip, { transform: pip.getTranslateTransform() }]}>
          <AppVideoView local engine={engine} style={StyleSheet.absoluteFill} />
        </Animated.View>
      )}
    </View>
  );
}

const c = StyleSheet.create({
  halo: { position: 'absolute', width: 132, height: 132, borderRadius: 66, backgroundColor: 'rgba(46,229,157,0.18)' },
  controls: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'flex-start', paddingTop: 30, paddingBottom: 30 },
  pip: { position: 'absolute', right: 14, top: 90, width: 108, height: 160, borderRadius: 18, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', backgroundColor: '#111' },
});
