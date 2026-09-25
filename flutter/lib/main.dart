import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'common.dart';
import 'package:applooma_uikit/applooma_uikit.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle.light.copyWith(statusBarColor: Colors.transparent));
  runApp(const SamplesApp());
}

class SamplesApp extends StatelessWidget {
  const SamplesApp({super.key});
  @override
  Widget build(BuildContext context) =>
      MaterialApp(title: 'AppLooma RTC', debugShowCheckedModeBanner: false, theme: appTheme(), home: const HomeScreen());
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _name = TextEditingController(text: Me.name);
  final _room = TextEditingController(text: 'demo');

  void _open(Widget Function(AppLoomaKit kit, String room) screen, String prefix) {
    Me.name = _name.text.trim().isEmpty ? Me.name : _name.text.trim();
    final room = '$prefix-${cleanRoom(_room.text)}';
    // Every screen is one widget from the UIKit; the kit carries App ID, user and token provider.
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => screen(buildKit(), room)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: RadialGradient(center: Alignment(-0.9, -1.1), radius: 1.3, colors: [Color(0x407C5CFF), C.ink]),
        ),
        child: SafeArea(
          child: ListView(padding: const EdgeInsets.fromLTRB(20, 20, 20, 24), children: [
            Row(children: [
              Container(
                width: 42, height: 42,
                decoration: BoxDecoration(gradient: C.brand, borderRadius: BorderRadius.circular(13),
                    boxShadow: [BoxShadow(color: C.violet.withValues(alpha: 0.45), blurRadius: 24, offset: const Offset(0, 8))]),
                alignment: Alignment.center,
                child: const Text('A', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 20)),
              ),
              const SizedBox(width: 12),
              const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('AppLooma RTC', style: TextStyle(fontSize: 19, fontWeight: FontWeight.w800)),
                Text('Sample app · Flutter · built on the UIKit', style: TextStyle(fontSize: 12.5, color: C.muted)),
              ]),
            ]),
            const SizedBox(height: 22),
            ShaderMask(
              shaderCallback: (r) => C.brand.createShader(r),
              blendMode: BlendMode.srcIn,
              child: const Text('Real-time,\nbeautifully simple.', style: TextStyle(fontSize: 30, height: 1.12, fontWeight: FontWeight.w800)),
            ),
            if (appId == 'YOUR_APP_ID') ...[
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: C.glass, borderRadius: BorderRadius.circular(14), border: Border.all(color: C.line)),
                child: const Text('Run with --dart-define=APP_ID=… and TOKEN_URL=… — see README.', style: TextStyle(fontSize: 13)),
              ),
            ],
            const SizedBox(height: 22),
            Row(children: [
              Expanded(child: _field('YOUR NAME', _name)),
              const SizedBox(width: 12),
              Expanded(child: _field('ROOM / CALL CODE', _room)),
            ]),
            const SizedBox(height: 18),
            GridView.count(
              crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 0.98,
              children: [
                _card('Live Streaming', 'Go live · watch · chat · gifts', Icons.sensors, const [Color(0xFFFF3B5C), Color(0xFFFF4FA3), Color(0xFF7C5CFF)],
                    () => _open((k, r) => AppLoomaLiveStream(kit: k, room: r), 'live')),
                _card('Voice Room', '8 seats · speaking rings', Icons.graphic_eq, const [Color(0xFF7C5CFF), Color(0xFF4B3CC9), Color(0xFF1F1A4D)],
                    () => _open((k, r) => AppLoomaVoiceRoom(kit: k, room: r), 'voice')),
                _card('Voice Call', '1-to-1 · HD audio', Icons.call, const [Color(0xFF13B58A), Color(0xFF0E6F78), Color(0xFF0C2A3A)],
                    () => _open((k, r) => AppLoomaCall(kit: k, room: r, video: false), 'acall')),
                _card('Video Call', '1-to-1 · 1080p', Icons.videocam, const [Color(0xFFFF9A3C), Color(0xFFFF4F7A), Color(0xFF5A1D52)],
                    () => _open((k, r) => AppLoomaCall(kit: k, room: r, video: true), 'vcall')),
              ],
            ),
            const SizedBox(height: 16),
            const Text('Open the same room on a second device to talk to yourself.',
                textAlign: TextAlign.center, style: TextStyle(fontSize: 11.5, color: C.muted)),
          ]),
        ),
      ),
    );
  }

  Widget _field(String label, TextEditingController c) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: const TextStyle(fontSize: 11.5, color: C.muted, fontWeight: FontWeight.w600, letterSpacing: 0.3)),
        const SizedBox(height: 6),
        TextField(
          controller: c, maxLength: 24,
          decoration: InputDecoration(
            counterText: '', filled: true, fillColor: C.glass,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(15), borderSide: const BorderSide(color: C.line)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(15), borderSide: const BorderSide(color: C.violet)),
          ),
        ),
      ]);

  Widget _card(String title, String sub, IconData icon, List<Color> colors, VoidCallback onTap) => GestureDetector(
        onTap: onTap,
        child: Container(
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(22),
            gradient: LinearGradient(colors: colors, begin: Alignment.topLeft, end: Alignment.bottomRight),
            border: Border.all(color: C.line),
          ),
          child: Stack(children: [
            Positioned(right: -30, top: -30, child: Container(width: 120, height: 120, decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0x1FFFFFFF)))),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Container(width: 44, height: 44, decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.18), borderRadius: BorderRadius.circular(14)),
                    child: Icon(icon, color: Colors.white)),
                const Spacer(),
                Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(sub, style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.8))),
              ]),
            ),
          ]),
        ),
      );
}
