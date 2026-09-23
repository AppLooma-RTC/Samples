import 'dart:async';

import 'package:applooma_rtc/applooma_rtc.dart';
import 'package:flutter/material.dart';

import '../common.dart';

/// Voice room: up to 8 people on seats with speaking rings, plus text chat.
///
/// Seats are ordered by join time. Everyone announces theirs with a small
/// message and answers newcomers, so every device draws the same seat order
/// without any server state. The first person holds the crown.
class VoiceRoomScreen extends StatefulWidget {
  final String room;
  const VoiceRoomScreen({super.key, required this.room});
  @override
  State<VoiceRoomScreen> createState() => _VoiceRoomScreenState();
}

const _seatCount = 8;

class _VoiceRoomScreenState extends State<VoiceRoomScreen> with SingleTickerProviderStateMixin {
  final engine = AppEngine.create(appId: appId, options: const AppEngineOptions(audioScenario: AppAudioScenario.media));
  final _subs = <StreamSubscription>[];
  final _joinedAt = <String, int>{Me.id: DateTime.now().millisecondsSinceEpoch};
  final _names = <String, String>{Me.id: Me.name};
  final _chat = <ChatLine>[];
  final _say = TextEditingController();
  late final AnimationController _ripple = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200))..repeat();
  Set<String> _speaking = {};
  bool _mic = true;
  String _status = 'connecting…';
  Timer? _tick;

  void _hello() => engine.sendMessage(data: {'kind': 'hi', 'at': _joinedAt[Me.id], 'name': Me.name});
  void _add(ChatLine l) => setState(() { _chat.add(l); if (_chat.length > 60) _chat.removeAt(0); });

  @override
  void initState() {
    super.initState();
    _subs.addAll([
      engine.onUserJoined.listen((u) {
        _names[u.uid] = (u.attributes['name'] as String?) ?? u.uid;
        _add(ChatLine(_names[u.uid]!, 'joined the room', system: true));
        _hello();
      }),
      engine.onUserLeft.listen((u) { _add(ChatLine(_names[u.uid] ?? u.uid, 'left', system: true)); _joinedAt.remove(u.uid); }),
      engine.onTrackSubscribed.listen((_) => setState(() {})),
      engine.onActiveSpeakersChanged.listen((uids) => setState(() => _speaking = uids.toSet())),
      engine.onMessage.listen((m) {
        final uid = m.from?.uid;
        if (uid == null) return;
        if (m.data?['kind'] == 'hi') {
          setState(() { _joinedAt[uid] = (m.data!['at'] as num).toInt(); _names[uid] = '${m.data!['name'] ?? uid}'; });
        } else if (m.data?['kind'] == 'wave') {
          _add(ChatLine(_names[uid] ?? uid, 'waved 👋', system: true));
        } else if (m.text != null) {
          _add(ChatLine(_names[uid] ?? uid, m.text!));
        }
      }),
    ]);
    _tick = Timer.periodic(const Duration(milliseconds: 1500), (_) { if (mounted) setState(() {}); }); // remote mute changes
    _join();
  }

  Future<void> _join() async {
    try {
      if (!await askPermissions(camera: false)) throw Exception('The microphone is needed to take a seat');
      final t = await fetchToken(widget.room, 'cohost');
      await engine.joinChannel(token: t.token, wsUrl: t.wsUrl, options: const AppJoinOptions(role: AppRole.cohost, microphone: true));
      for (final u in engine.remoteUsers) { _names[u.uid] = (u.attributes['name'] as String?) ?? u.uid; }
      _add(ChatLine('', 'You are on a seat — just start talking 🎧', system: true));
      setState(() => _status = 'live');
      _hello();
    } catch (e) {
      if (!mounted) return;
      setState(() => _status = 'failed');
      toast(context, e.toString().replaceFirst('Exception: ', ''));
    }
  }

  @override
  void dispose() {
    for (final s in _subs) { s.cancel(); }
    _tick?.cancel();
    _ripple.dispose();
    engine.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final present = {Me.id, ...engine.remoteUsers.map((u) => u.uid)}.toList()
      ..sort((a, b) { final c = (_joinedAt[a] ?? 1 << 53).compareTo(_joinedAt[b] ?? 1 << 53); return c != 0 ? c : a.compareTo(b); });
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0xFF2C1F66), Color(0xFF141030), C.ink], stops: [0, 0.4, 1])),
        child: SafeArea(child: Column(children: [
          Padding(padding: const EdgeInsets.fromLTRB(12, 8, 12, 0), child: Row(children: [
            GestureDetector(onTap: () => Navigator.pop(context), child: const Glass(padding: EdgeInsets.all(8), child: Icon(Icons.close, size: 18))),
            const Spacer(),
            Glass(child: Row(children: [const Icon(Icons.people_outline, size: 15), const SizedBox(width: 5), Text('${present.length}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600))])),
          ])),
          Padding(padding: const EdgeInsets.fromLTRB(20, 16, 20, 0), child: Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('🎙️ ${widget.room.replaceFirst('voice-', '')}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
              const SizedBox(height: 3),
              Row(children: [
                Container(width: 7, height: 7, decoration: BoxDecoration(color: C.green, shape: BoxShape.circle, boxShadow: [BoxShadow(color: C.green.withValues(alpha: 0.8), blurRadius: 8)])),
                const SizedBox(width: 6),
                Text('Voice room · $_status', style: const TextStyle(fontSize: 12.5, color: C.muted)),
              ]),
            ])),
          ])),
          const SizedBox(height: 18),
          _seat(0, present.isNotEmpty ? present[0] : null, big: true),
          const SizedBox(height: 16),
          Padding(padding: const EdgeInsets.symmetric(horizontal: 12), child: GridView.count(
            crossAxisCount: 4, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), childAspectRatio: 0.78,
            children: [for (var i = 1; i < _seatCount; i++) _seat(i, i < present.length ? present[i] : null)],
          )),
          Expanded(child: ShaderMask(
            shaderCallback: (r) => const LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Colors.transparent, Colors.black], stops: [0, 0.18]).createShader(r),
            blendMode: BlendMode.dstIn,
            child: ListView(reverse: true, padding: const EdgeInsets.symmetric(horizontal: 16), children: _chat.reversed.map((l) => ChatBubble(l)).toList()),
          )),
          Padding(padding: const EdgeInsets.fromLTRB(12, 8, 12, 12), child: Row(children: [
            Expanded(child: TextField(
              controller: _say, maxLength: 120,
              onSubmitted: (_) { final t = _say.text.trim(); if (t.isEmpty) return; _say.clear(); _add(ChatLine(Me.name, t)); engine.sendMessage(text: t); },
              decoration: InputDecoration(counterText: '', hintText: 'Say hi to the room…', filled: true, fillColor: Colors.black.withValues(alpha: 0.35),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(999), borderSide: const BorderSide(color: C.line)),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(999), borderSide: const BorderSide(color: C.violet))),
            )),
            const SizedBox(width: 10),
            RoundBtn(_mic ? Icons.mic : Icons.mic_off, () { setState(() => _mic = !_mic); engine.enableMicrophone(_mic); }, off: !_mic),
            const SizedBox(width: 10),
            RoundBtn(Icons.waving_hand_outlined, () { _add(ChatLine(Me.name, 'waved 👋', system: true)); engine.sendMessage(data: {'kind': 'wave'}); }),
          ])),
        ])),
      ),
    );
  }

  Widget _seat(int index, String? uid, {bool big = false}) {
    final size = big ? 86.0 : 60.0;
    if (uid == null) {
      return Column(mainAxisSize: MainAxisSize.min, children: [
        Container(width: size, height: size,
            decoration: BoxDecoration(shape: BoxShape.circle, color: C.glass, border: Border.all(color: Colors.white24)),
            child: const Icon(Icons.add, color: C.muted)),
        const SizedBox(height: 6),
        Text('Seat ${index + 1}', style: const TextStyle(fontSize: 10.5, color: C.muted)),
      ]);
    }
    final name = _names[uid] ?? uid;
    final muted = uid == Me.id ? !_mic : !(engine.remoteUsers.where((u) => u.uid == uid).firstOrNull?.audioEnabled ?? true);
    final talking = _speaking.contains(uid) && !muted;
    return Column(mainAxisSize: MainAxisSize.min, children: [
      SizedBox(width: size + 16, height: size + 16, child: Stack(alignment: Alignment.center, clipBehavior: Clip.none, children: [
        if (talking)
          AnimatedBuilder(animation: _ripple, builder: (_, _) => Container(
                width: size + 16 * _ripple.value, height: size + 16 * _ripple.value,
                decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: C.green.withValues(alpha: 1 - _ripple.value), width: 2.5)))),
        Avatar(uid, name, size: size),
        if (index == 0) const Positioned(top: -6, child: Text('👑', style: TextStyle(fontSize: 18))),
        if (muted)
          Positioned(right: 6, bottom: 6, child: Container(width: 22, height: 22,
              decoration: BoxDecoration(color: C.live, shape: BoxShape.circle, border: Border.all(color: C.ink, width: 2)),
              child: const Icon(Icons.mic_off, size: 12))),
      ])),
      Text(uid == Me.id ? '$name (you)' : name, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11.5, color: Color(0xFFD9D9E6))),
    ]);
  }
}
