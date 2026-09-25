// Shared pieces for every sample screen: config, tokens, the design system.
import 'dart:convert';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:applooma_uikit/applooma_uikit.dart';

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

/// Everything the UIKit screens need: your App ID, the signed-in user and a
/// token provider that calls YOUR server. The API secret never ships in the app.
AppLoomaKit buildKit() => AppLoomaKit(
      appId: appId,
      user: AppLoomaKitUser(id: Me.id, name: Me.name),
      tokenProvider: (room, role, user) async {
        final res = await http.post(Uri.parse(tokenUrl),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'room': room, 'identity': user.id, 'name': user.name, 'role': role}));
        final body = jsonDecode(res.body) as Map<String, dynamic>;
        if (res.statusCode != 200) throw Exception(body['error'] ?? 'Token server answered ${res.statusCode}');
        return AppLoomaToken(token: body['token'] as String, wsUrl: body['wsUrl'] as String);
      },
    );

String cleanRoom(String s) {
  final r = s.trim().replaceAll(RegExp(r'[^a-zA-Z0-9_-]'), '-');
  return r.isEmpty ? 'lobby' : (r.length > 40 ? r.substring(0, 40) : r);
}


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












