// Shared pieces for every sample screen: config, tokens, the design system.
import 'dart:convert';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:permission_handler/permission_handler.dart';

/// Your App ID (console → your app) and the token server from ../token-server.
/// Pass them at build time:
///   flutter run --dart-define=APP_ID=... --dart-define=TOKEN_URL=http://10.0.2.2:3001/token
const appId = String.fromEnvironment('APP_ID', defaultValue: 'YOUR_APP_ID');
const tokenUrl = String.fromEnvironment('TOKEN_URL', defaultValue: 'http://10.0.2.2:3001/token');

/// The person using this device. A real app takes this from its own sign-in.
class Me {
  static final String id = 'u${Random().nextInt(1 << 31).toRadixString(36)}';
  static String name = 'Guest ${id.substring(1, 4).toUpperCase()}';
}

/// Ask YOUR token server for a token. The API secret never reaches the app.
Future<({String token, String wsUrl})> fetchToken(String room, String role) async {
  final res = await http.post(Uri.parse(tokenUrl),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'room': room, 'identity': Me.id, 'name': Me.name, 'role': role}));
  final body = jsonDecode(res.body) as Map<String, dynamic>;
  if (res.statusCode != 200) throw Exception(body['error'] ?? 'Token server answered ${res.statusCode}');
  return (token: body['token'] as String, wsUrl: body['wsUrl'] as String);
}

Future<bool> askPermissions({required bool camera}) async {
  final wanted = [Permission.microphone, if (camera) Permission.camera];
  final result = await wanted.request();
  return result.values.every((s) => s.isGranted);
}

String cleanRoom(String s) {
  final r = s.trim().replaceAll(RegExp(r'[^a-zA-Z0-9_-]'), '-');
  return r.isEmpty ? 'lobby' : (r.length > 40 ? r.substring(0, 40) : r);
}

String formatTime(int sec) => '${(sec ~/ 60).toString().padLeft(2, '0')}:${(sec % 60).toString().padLeft(2, '0')}';

// ---------------------------------------------------------------- design system

class C {
  static const ink = Color(0xFF07070D);
  static const glass = Color(0x12FFFFFF);
  static const glass2 = Color(0x1FFFFFFF);
  static const line = Color(0x17FFFFFF);
  static const text = Color(0xFFF5F5FA);
  static const muted = Color(0xFF9A9AB0);
  static const violet = Color(0xFF7C5CFF);
  static const pink = Color(0xFFFF4FA3);
  static const live = Color(0xFFFF3B5C);
  static const gold = Color(0xFFFFC24B);
  static const green = Color(0xFF2EE59D);
  static const brand = LinearGradient(colors: [violet, pink], begin: Alignment.topLeft, end: Alignment.bottomRight);
}

ThemeData appTheme() => ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: C.ink,
      colorScheme: const ColorScheme.dark(primary: C.violet, secondary: C.pink, surface: C.ink),
      fontFamily: 'Roboto',
      useMaterial3: true,
    );

const _gradients = [
  [Color(0xFF7C5CFF), Color(0xFFFF4FA3)], [Color(0xFF13B58A), Color(0xFF0E6F78)], [Color(0xFFFF9A3C), Color(0xFFFF4F7A)],
  [Color(0xFF3C8DFF), Color(0xFF7C5CFF)], [Color(0xFFFF4F7A), Color(0xFFFFC24B)], [Color(0xFF00C2D1), Color(0xFF2EE59D)],
  [Color(0xFFB04BFF), Color(0xFF5A3CFF)], [Color(0xFFFF6B3C), Color(0xFFFF3B5C)],
];

LinearGradient gradientFor(String key) {
  var h = 0;
  for (final c in key.codeUnits) { h = (h * 31 + c) & 0x7fffffff; }
  final g = _gradients[h % _gradients.length];
  return LinearGradient(colors: g, begin: Alignment.topLeft, end: Alignment.bottomRight);
}

/// A round gradient avatar with the person's initial.
class Avatar extends StatelessWidget {
  final String id, name;
  final double size;
  const Avatar(this.id, this.name, {super.key, this.size = 36});
  @override
  Widget build(BuildContext context) => Container(
        width: size, height: size,
        decoration: BoxDecoration(shape: BoxShape.circle, gradient: gradientFor(id), border: Border.all(color: Colors.white24, width: 1.5)),
        alignment: Alignment.center,
        child: Text(name.isEmpty ? '?' : name[0].toUpperCase(), style: TextStyle(fontWeight: FontWeight.w800, fontSize: size * 0.4)),
      );
}

/// Frosted pill / panel.
class Glass extends StatelessWidget {
  final Widget child;
  final EdgeInsets padding;
  final double radius;
  const Glass({super.key, required this.child, this.padding = const EdgeInsets.symmetric(horizontal: 10, vertical: 6), this.radius = 999});
  @override
  Widget build(BuildContext context) => Container(
        padding: padding,
        decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.38), borderRadius: BorderRadius.circular(radius), border: Border.all(color: C.line)),
        child: child,
      );
}

/// A round control button: soft glass, white when "off", red for end, gradient for brand.
class RoundBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final double size;
  final Color? color;
  final Gradient? gradient;
  final bool off;
  final String? label;
  const RoundBtn(this.icon, this.onTap, {super.key, this.size = 50, this.color, this.gradient, this.off = false, this.label});
  @override
  Widget build(BuildContext context) {
    final btn = GestureDetector(
      onTap: onTap,
      child: Container(
        width: size, height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: off ? Colors.white : (gradient == null ? (color ?? C.glass2) : null),
          gradient: off ? null : gradient,
          boxShadow: color == C.live ? [BoxShadow(color: C.live.withValues(alpha: 0.45), blurRadius: 20, offset: const Offset(0, 8))] : null,
        ),
        child: Icon(icon, color: off ? Colors.black87 : Colors.white, size: size * 0.44),
      ),
    );
    if (label == null) return btn;
    return Column(mainAxisSize: MainAxisSize.min, children: [btn, const SizedBox(height: 7), Text(label!, style: const TextStyle(fontSize: 11.5, color: Color(0xFFCFCFE0)))]);
  }
}

void toast(BuildContext context, String text) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text), behavior: SnackBarBehavior.floating, backgroundColor: const Color(0xFF1C1C2A)));
}

/// One chat line.
class ChatLine {
  final String who, text;
  final bool system, gift;
  ChatLine(this.who, this.text, {this.system = false, this.gift = false});
}

class ChatBubble extends StatelessWidget {
  final ChatLine line;
  const ChatBubble(this.line, {super.key});
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Align(
          alignment: Alignment.centerLeft,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              color: line.gift ? null : Colors.black.withValues(alpha: 0.35),
              gradient: line.gift ? LinearGradient(colors: [C.gold.withValues(alpha: 0.35), C.pink.withValues(alpha: 0.25)]) : null,
            ),
            child: RichText(
              text: TextSpan(style: TextStyle(fontSize: 13, color: line.system ? C.muted : C.text, height: 1.35), children: [
                if (line.who.isNotEmpty) TextSpan(text: '${line.who}  ', style: const TextStyle(color: C.gold, fontWeight: FontWeight.w700)),
                TextSpan(text: line.text),
              ]),
            ),
          ),
        ),
      );
}
