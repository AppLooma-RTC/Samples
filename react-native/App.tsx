import React, { useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TextInput, Pressable, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { Radio, AudioLines, Phone, Video } from 'lucide-react-native';
import { APP_ID, BRAND, C, Me, cleanRoom, type IconType } from './src/common';
import LiveScreen from './src/screens/Live';
import VoiceScreen from './src/screens/Voice';
import CallScreen from './src/screens/Call';

type Route = { kind: 'home' } | { kind: 'live' | 'voice'; room: string } | { kind: 'call'; room: string; video: boolean };

export default function App() {
  const [route, setRoute] = useState<Route>({ kind: 'home' });
  const back = () => setRoute({ kind: 'home' });
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={C.ink} />
      {route.kind === 'home' && <Home open={setRoute} />}
      {route.kind === 'live' && <LiveScreen room={route.room} onClose={back} />}
      {route.kind === 'voice' && <VoiceScreen room={route.room} onClose={back} />}
      {route.kind === 'call' && <CallScreen room={route.room} video={route.video} onClose={back} />}
    </SafeAreaProvider>
  );
}

function Home({ open }: { open: (r: Route) => void }) {
  const [name, setName] = useState(Me.name);
  const [room, setRoom] = useState('demo');
  const go = (r: Route) => { if (name.trim()) Me.name = name.trim(); open(r); };
  const code = cleanRoom(room);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.ink }}>
      <LinearGradient colors={['rgba(124,92,255,0.28)', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 0.5 }} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 30 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={h.logo}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 20 }}>A</Text></LinearGradient>
          <View style={{ marginLeft: 12 }}>
            <Text style={{ color: C.text, fontSize: 19, fontWeight: '800' }}>AppLooma RTC</Text>
            <Text style={{ color: C.muted, fontSize: 12.5 }}>Sample app · React Native</Text>
          </View>
        </View>
        <Text style={h.hero}>Real-time,{'\n'}<Text style={{ color: C.pink }}>beautifully</Text> simple.</Text>
        {APP_ID === 'YOUR_APP_ID' && (
          <View style={h.note}><Text style={{ color: C.text, fontSize: 13 }}>Set APP_ID and TOKEN_URL in src/common.tsx — see README.</Text></View>
        )}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 22 }}>
          <Field label="YOUR NAME" value={name} onChange={setName} />
          <Field label="ROOM / CALL CODE" value={room} onChange={setRoom} />
        </View>
        <View style={h.grid}>
          <Card title="Live Streaming" sub="Go live · watch · chat · gifts" Icon={Radio} colors={['#FF3B5C', '#FF4FA3', '#7C5CFF']} onPress={() => go({ kind: 'live', room: `live-${code}` })} />
          <Card title="Voice Room" sub="8 seats · speaking rings" Icon={AudioLines} colors={['#7C5CFF', '#4B3CC9', '#1F1A4D']} onPress={() => go({ kind: 'voice', room: `voice-${code}` })} />
          <Card title="Voice Call" sub="1-to-1 · HD audio" Icon={Phone} colors={['#13B58A', '#0E6F78', '#0C2A3A']} onPress={() => go({ kind: 'call', room: `acall-${code}`, video: false })} />
          <Card title="Video Call" sub="1-to-1 · 1080p" Icon={Video} colors={['#FF9A3C', '#FF4F7A', '#5A1D52']} onPress={() => go({ kind: 'call', room: `vcall-${code}`, video: true })} />
        </View>
        <Text style={{ color: C.muted, fontSize: 11.5, textAlign: 'center', marginTop: 16 }}>Open the same room on a second device to talk to yourself.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: C.muted, fontSize: 11.5, fontWeight: '600', marginBottom: 6, letterSpacing: 0.3 }}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} maxLength={24} placeholderTextColor={C.muted} style={h.field} />
    </View>
  );
}

function Card({ title, sub, Icon, colors, onPress }: { title: string; sub: string; Icon: IconType; colors: string[]; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [h.cardWrap, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={h.card}>
        <View style={h.bubble} />
        <View style={h.cardIcon}><Icon color="#fff" size={22} /></View>
        <View style={{ flex: 1 }} />
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{title}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 }}>{sub}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const h = StyleSheet.create({
  logo: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  hero: { color: C.text, fontSize: 30, lineHeight: 34, fontWeight: '800', marginTop: 22, letterSpacing: -0.5 },
  note: { marginTop: 14, padding: 12, borderRadius: 14, backgroundColor: C.glass, borderWidth: 1, borderColor: C.line },
  field: { height: 50, borderRadius: 15, borderWidth: 1, borderColor: C.line, backgroundColor: C.glass, paddingHorizontal: 16, color: C.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 18 },
  cardWrap: { width: '48%', aspectRatio: 0.98 },
  card: { flex: 1, borderRadius: 22, padding: 16, overflow: 'hidden', borderWidth: 1, borderColor: C.line },
  bubble: { position: 'absolute', right: -30, top: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.12)' },
  cardIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
});
