import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { AppEngine, useAppAudioSession } from '@applooma/rtc-react-native';
import { Hand, Mic, MicOff, Plus, Users, X } from 'lucide-react-native';
import { APP_ID, Avatar, C, ChatBubble, Glass, Me, RoundBtn, askPermissions, fetchToken, line, s, type ChatLine } from '../common';

/**
 * Voice room: up to 8 people on seats with speaking rings, plus text chat.
 *
 * Seats are ordered by join time. Everyone announces theirs with a small
 * message and answers newcomers, so every device draws the same seat order
 * without any server state. The first person holds the crown.
 */
const SEATS = 8;

export default function VoiceScreen({ room, onClose }: { room: string; onClose: () => void }) {
  const engine = useMemo(() => AppEngine.create({ appId: APP_ID, audioScenario: 'media' }), []);
  useAppAudioSession(engine);
  const joinedAt = useRef(new Map<string, number>([[Me.id, Date.now()]])).current;
  const names = useRef(new Map<string, string>([[Me.id, Me.name]])).current;
  const [, render] = useState(0);
  const refresh = () => render((n) => n + 1);
  const [speaking, setSpeaking] = useState<Set<string>>(new Set());
  const [mic, setMic] = useState(true);
  const [status, setStatus] = useState('connecting…');
  const [chat, setChat] = useState<ChatLine[]>([]);
  const [say, setSay] = useState('');
  const ripple = useRef(new Animated.Value(0)).current;

  const add = (l: ChatLine) => setChat((c) => [...c.slice(-59), l]);
  const hello = () => engine.sendMessage({ kind: 'hi', at: joinedAt.get(Me.id), name: Me.name }).catch(() => {});

  useEffect(() => {
    Animated.loop(Animated.timing(ripple, { toValue: 1, duration: 1200, easing: Easing.out(Easing.quad), useNativeDriver: true })).start();
    engine
      .on('user-joined', (u) => { names.set(u.uid, (u.attributes.name as string) || u.uid); add(line(names.get(u.uid)!, 'joined the room', { system: true })); hello(); refresh(); })
      .on('user-left', (u) => { add(line(names.get(u.uid) || u.uid, 'left', { system: true })); joinedAt.delete(u.uid); refresh(); })
      .on('track-subscribed', refresh)
      .on('active-speakers-changed', (uids) => setSpeaking(new Set(uids)))
      .on('message', (m) => {
        const uid = m.from?.uid; if (!uid) return;
        if (m.data?.kind === 'hi') { joinedAt.set(uid, Number(m.data.at)); names.set(uid, String(m.data.name || uid)); refresh(); }
        else if (m.data?.kind === 'wave') add(line(names.get(uid) || uid, 'waved 👋', { system: true }));
        else if (m.text) add(line(names.get(uid) || uid, m.text));
      });
    const tick = setInterval(refresh, 1500); // remote mute changes
    (async () => {
      try {
        if (!(await askPermissions(false))) throw new Error('The microphone is needed to take a seat');
        const t = await fetchToken(room, 'cohost');
        await engine.joinChannel(t.token, t.wsUrl, { role: 'cohost', microphone: true });
        engine.remoteUsers.forEach((u) => names.set(u.uid, (u.attributes.name as string) || u.uid));
        add(line('', 'You are on a seat — just start talking 🎧', { system: true }));
        setStatus('live'); hello();
      } catch (e) { setStatus('failed'); add(line('', (e as Error).message, { system: true })); }
    })();
    return () => { clearInterval(tick); engine.destroy(); };
  }, [engine]);

  const present = [Me.id, ...engine.remoteUsers.map((u) => u.uid)]
    .sort((a, b) => (joinedAt.get(a) ?? 9e15) - (joinedAt.get(b) ?? 9e15) || a.localeCompare(b));

  const seat = (i: number, big = false) => {
    const uid = present[i];
    const size = big ? 86 : 60;
    if (!uid) return (
      <View key={i} style={v.seat}>
        <View style={[v.empty, { width: size, height: size, borderRadius: size / 2 }]}><Plus color={C.muted} size={20} /></View>
        <Text style={v.num}>Seat {i + 1}</Text>
      </View>
    );
    const name = names.get(uid) || uid;
    const muted = uid === Me.id ? !mic : !(engine.remoteUsers.find((u) => u.uid === uid)?.audioEnabled ?? true);
    const talking = speaking.has(uid) && !muted;
    return (
      <View key={i} style={v.seat}>
        <View style={{ width: size + 16, height: size + 16, alignItems: 'center', justifyContent: 'center' }}>
          {talking && (
            <Animated.View style={[v.ring, { width: size, height: size, borderRadius: size / 2,
              opacity: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }),
              transform: [{ scale: ripple.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }) }] }]} />
          )}
          <Avatar id={uid} name={name} size={size} />
          {i === 0 && <Text style={v.crown}>👑</Text>}
          {muted && <View style={v.micOff}><MicOff color="#fff" size={11} /></View>}
        </View>
        <Text numberOfLines={1} style={v.label}>{uid === Me.id ? `${name} (you)` : name}</Text>
      </View>
    );
  };

  const send = () => { const t = say.trim(); if (!t) return; setSay(''); add(line(Me.name, t)); engine.sendMessage(t).catch(() => {}); };

  return (
    <LinearGradient colors={['#2C1F66', '#141030', C.ink]} locations={[0, 0.4, 1]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={[s.row, { paddingHorizontal: 12, paddingTop: 8 }]}>
          <Pressable onPress={onClose}><Glass style={{ padding: 8 }}><X color={C.text} size={18} /></Glass></Pressable>
          <View style={{ flex: 1 }} />
          <Glass style={s.row}><Users color={C.text} size={15} /><Text style={[s.small, { marginLeft: 5 }]}>{present.length}</Text></Glass>
        </View>
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <Text style={{ color: C.text, fontSize: 20, fontWeight: '800' }}>🎙️ {room.replace(/^voice-/, '')}</Text>
          <View style={[s.row, { marginTop: 3 }]}>
            <View style={v.dot} /><Text style={{ color: C.muted, fontSize: 12.5, marginLeft: 6 }}>Voice room · {status}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'center', marginTop: 14 }}>{seat(0, true)}</View>
        <View style={v.grid}>{Array.from({ length: SEATS - 1 }, (_, k) => seat(k + 1))}</View>
        <FlatList style={{ flex: 1, paddingHorizontal: 16 }} data={[...chat].reverse()} inverted keyExtractor={(x) => String(x.id)} renderItem={({ item }) => <ChatBubble l={item} />} />
        <View style={[s.row, { padding: 12, gap: 10 }]}>
          <TextInput value={say} onChangeText={setSay} onSubmitEditing={send} placeholder="Say hi to the room…" placeholderTextColor={C.muted} maxLength={120} style={s.input} />
          <RoundBtn icon={mic ? Mic : MicOff} off={!mic} onPress={() => { engine.enableMicrophone(!mic); setMic(!mic); }} />
          <RoundBtn icon={Hand} onPress={() => { add(line(Me.name, 'waved 👋', { system: true })); engine.sendMessage({ kind: 'wave' }).catch(() => {}); }} />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const v = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, marginTop: 8 },
  seat: { width: '25%', alignItems: 'center', marginBottom: 10 },
  empty: { alignItems: 'center', justifyContent: 'center', backgroundColor: C.glass, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.2)', margin: 8 },
  ring: { position: 'absolute', borderWidth: 2.5, borderColor: C.green },
  crown: { position: 'absolute', top: -2, fontSize: 18 },
  micOff: { position: 'absolute', right: 6, bottom: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: C.live, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  label: { color: '#D9D9E6', fontSize: 11.5, maxWidth: 80 },
  num: { color: C.muted, fontSize: 10.5 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.green },
});
