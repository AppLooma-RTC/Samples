import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { AppEngine, AppVideoView, useAppAudioSession, type AppRemoteUser } from '@applooma/rtc-react-native';
import { Eye, Gift, Heart, Mic, MicOff, Radio, SwitchCamera, Video, VideoOff, X } from 'lucide-react-native';
import { APP_ID, Avatar, BRAND, C, ChatBubble, Glass, Me, RoundBtn, askPermissions, fetchToken, line, s, type ChatLine } from '../common';

/**
 * Live streaming: one host on camera, any number of viewers. Comments, hearts
 * and gifts travel over sendMessage — no extra server.
 */
const GIFTS = [{ e: '🌹', n: 'Rose' }, { e: '💎', n: 'Diamond' }, { e: '🚀', n: 'Rocket' }, { e: '👑', n: 'Crown' }];
const nameOf = (u?: AppRemoteUser) => (u?.attributes.name as string) || u?.uid || 'Someone';

export default function LiveScreen({ room, onClose }: { room: string; onClose: () => void }) {
  const engine = useMemo(() => AppEngine.create({ appId: APP_ID, audioScenario: 'media', video: { height: 720, fps: 30 } }), []);
  useAppAudioSession(engine);
  const [, render] = useState(0);
  const refresh = () => render((n) => n + 1);
  const [isHost, setIsHost] = useState(true);
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [chat, setChat] = useState<ChatLine[]>([]);
  const [say, setSay] = useState('');
  const [banner, setBanner] = useState<{ from: string; g: (typeof GIFTS)[number] } | null>(null);
  const [hearts, setHearts] = useState<{ id: number; dx: number; e: string; v: Animated.Value }[]>([]);
  const hostRef = useRef(true);
  hostRef.current = isHost;

  const add = (l: ChatLine) => setChat((c) => [...c.slice(-39), l]);
  const heart = () => {
    const h = { id: Math.random(), dx: Math.random() * 60 - 30, e: ['💖', '💜', '💗', '✨', '🔥'][Math.floor(Math.random() * 5)], v: new Animated.Value(0) };
    setHearts((x) => [...x, h]);
    Animated.timing(h.v, { toValue: 1, duration: 2200, useNativeDriver: true }).start(() => setHearts((x) => x.filter((y) => y !== h)));
  };
  const gift = (from: string, i: number) => {
    const g = GIFTS[i % GIFTS.length];
    add(line(from, `sent ${g.n} ${g.e}`, { gift: true }));
    setBanner({ from, g }); setTimeout(() => setBanner(null), 3200);
  };

  useEffect(() => {
    engine
      .on('track-subscribed', refresh).on('track-unsubscribed', refresh).on('audience-changed', refresh)
      .on('user-joined', (u) => { if (!u.isPublisher) add(line(nameOf(u), 'joined', { system: true })); })
      .on('user-left', refresh)
      .on('message', (m) => {
        const from = nameOf(m.from);
        if (m.text) add(line(from, m.text));
        else if (m.data?.kind === 'like') heart();
        else if (m.data?.kind === 'gift') gift(from, Number(m.data.i));
      });
    return () => { engine.destroy(); };
  }, [engine]);

  const start = async () => {
    if (joining) return;
    setJoining(true);
    try {
      if (isHost && !(await askPermissions(true))) throw new Error('Camera and microphone are needed to go live');
      const t = await fetchToken(room, isHost ? 'host' : 'audience');
      await engine.joinChannel(t.token, t.wsUrl, { role: isHost ? 'host' : 'audience', camera: isHost, microphone: isHost });
      add(line('', 'Welcome! Be kind in the chat 💬', { system: true }));
      setJoined(true);
    } catch (e) {
      add(line('', (e as Error).message, { system: true }));
    } finally { setJoining(false); }
  };

  const send = () => {
    const text = say.trim(); if (!text) return;
    setSay(''); add(line(Me.name, text)); engine.sendMessage(text).catch(() => {});
  };

  const host = engine.hosts[0];
  const showVideo = joined && (isHost ? cam : host?.hasVideo);
  const hostName = isHost ? Me.name : nameOf(host);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {showVideo
        ? isHost
          ? <AppVideoView local engine={engine} style={StyleSheet.absoluteFill} />
          : <AppVideoView key={host!.uid} user={host} style={StyleSheet.absoluteFill} />
        : (
          <LinearGradient colors={['#2A1F5A', C.ink]} style={[StyleSheet.absoluteFill, l.center]}>
            <Radio color={C.muted} size={34} />
            <Text style={{ color: C.muted, marginTop: 8 }}>{joined ? (isHost ? 'Camera is off' : 'Waiting for the host…') : `Live · ${room.replace(/^live-/, '')}`}</Text>
          </LinearGradient>
        )}
      <LinearGradient colors={['rgba(0,0,0,0.55)', 'transparent']} style={[l.shade, { top: 0, height: 140 }]} pointerEvents="none" />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={[l.shade, { bottom: 0, height: 340 }]} pointerEvents="none" />

      <SafeAreaView style={{ flex: 1 }}>
        <View style={[s.row, { paddingHorizontal: 12, paddingTop: 8, gap: 8 }]}>
          <Glass style={[s.row, { paddingLeft: 4, paddingVertical: 4, paddingRight: 12 }]}>
            <Avatar id={isHost ? Me.id : host?.uid ?? room} name={hostName} size={34} />
            <View style={{ marginLeft: 8 }}>
              <Text style={{ color: C.text, fontSize: 13, fontWeight: '700' }}>{joined ? hostName : '—'}</Text>
              <Text style={{ color: C.muted, fontSize: 11 }}>{isHost && joined ? 'You are live' : 'Live'}</Text>
            </View>
          </Glass>
          {joined && <View style={l.liveTag}><Text style={l.liveText}>LIVE</Text></View>}
          <View style={{ flex: 1 }} />
          <Glass style={s.row}><Eye color={C.text} size={15} /><Text style={[s.small, { marginLeft: 5 }]}>{engine.audienceCount + (isHost || !joined ? 0 : 1)}</Text></Glass>
          <Pressable onPress={onClose}><Glass style={{ padding: 8 }}><X color={C.text} size={18} /></Glass></Pressable>
        </View>

        {banner && (
          <LinearGradient colors={['rgba(255,194,75,0.95)', 'rgba(255,79,163,0.9)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={l.banner}>
            <Avatar id={banner.from} name={banner.from} size={34} />
            <View style={{ marginHorizontal: 10 }}>
              <Text style={{ color: '#1A0F00', fontWeight: '800', fontSize: 13 }}>{banner.from}</Text>
              <Text style={{ color: '#1A0F00', fontSize: 12 }}>sent {banner.g.n}</Text>
            </View>
            <Text style={{ fontSize: 28 }}>{banner.g.e}</Text>
          </LinearGradient>
        )}

        <View style={{ flex: 1 }} />
        <FlatList style={l.chat} data={[...chat].reverse()} inverted keyExtractor={(x) => String(x.id)} renderItem={({ item }) => <ChatBubble l={item} />} />

        {hearts.map((h) => (
          <Animated.Text key={h.id} style={[l.heart, {
            opacity: h.v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] }),
            transform: [
              { translateY: h.v.interpolate({ inputRange: [0, 1], outputRange: [0, -280] }) },
              { translateX: h.v.interpolate({ inputRange: [0, 1], outputRange: [0, h.dx] }) },
              { scale: h.v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.6, 1.1, 0.8] }) },
            ],
          }]}>{h.e}</Animated.Text>
        ))}

        {joined && isHost && (
          <View style={l.side}>
            <RoundBtn icon={mic ? Mic : MicOff} off={!mic} onPress={() => { engine.enableMicrophone(!mic); setMic(!mic); }} />
            <RoundBtn icon={cam ? Video : VideoOff} off={!cam} onPress={() => { engine.enableCamera(!cam); setCam(!cam); }} />
            <RoundBtn icon={SwitchCamera} onPress={() => engine.switchCamera()} />
          </View>
        )}

        {joined ? (
          <View style={[s.row, { paddingHorizontal: 12, paddingBottom: 14, gap: 10 }]}>
            <TextInput value={say} onChangeText={setSay} onSubmitEditing={send} placeholder="Say something…" placeholderTextColor={C.muted} maxLength={120} style={s.input} />
            <RoundBtn icon={Gift} color={C.gold} tint="rgba(255,194,75,0.2)" onPress={() => { const i = Math.floor(Math.random() * GIFTS.length); gift(Me.name, i); engine.sendMessage({ kind: 'gift', i }).catch(() => {}); }} />
            <RoundBtn icon={Heart} brand onPress={() => { heart(); engine.sendMessage({ kind: 'like' }, { reliable: false }).catch(() => {}); }} />
          </View>
        ) : (
          <View style={{ padding: 20, gap: 12 }}>
            <View style={l.seg}>
              {[['Go live', true], ['Watch', false]].map(([label, v]) => (
                <Pressable key={String(label)} style={{ flex: 1 }} onPress={() => setIsHost(v as boolean)}>
                  {isHost === v
                    ? <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={l.segBtn}><Text style={l.segOn}>{label}</Text></LinearGradient>
                    : <View style={l.segBtn}><Text style={l.segOff}>{label}</Text></View>}
                </Pressable>
              ))}
            </View>
            <Pressable onPress={start}>
              <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={l.cta}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15.5 }}>{joining ? 'Connecting…' : isHost ? 'Start broadcast' : 'Join as viewer'}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const l = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  shade: { position: 'absolute', left: 0, right: 0 },
  liveTag: { backgroundColor: C.live, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  liveText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  banner: { position: 'absolute', top: 70, left: 12, flexDirection: 'row', alignItems: 'center', paddingLeft: 6, paddingRight: 16, paddingVertical: 6, borderRadius: 999 },
  chat: { maxHeight: 240, marginLeft: 12, marginRight: 90, marginBottom: 10, flexGrow: 0 },
  heart: { position: 'absolute', right: 26, bottom: 150, fontSize: 28 },
  side: { position: 'absolute', right: 12, bottom: 90, gap: 12 },
  seg: { flexDirection: 'row', gap: 6, padding: 5, borderRadius: 16, backgroundColor: 'rgba(10,10,20,0.45)', borderWidth: 1, borderColor: C.line },
  segBtn: { height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segOn: { color: '#fff', fontWeight: '700' },
  segOff: { color: C.muted, fontWeight: '700' },
  cta: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
