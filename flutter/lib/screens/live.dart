import 'dart:async';
import 'dart:math';

import 'package:applooma_rtc/applooma_rtc.dart';
import 'package:flutter/material.dart';

import '../common.dart';

/// Live streaming: one host on camera, any number of viewers. Comments, hearts
/// and gifts travel over sendMessage — no extra server.
class LiveScreen extends StatefulWidget {
  final String room;
  const LiveScreen({super.key, required this.room});
  @override
  State<LiveScreen> createState() => _LiveScreenState();
}

const _gifts = [('🌹', 'Rose'), ('💎', 'Diamond'), ('🚀', 'Rocket'), ('👑', 'Crown')];

class _LiveScreenState extends State<LiveScreen> with TickerProviderStateMixin {
  final engine = AppEngine.create(appId: appId, options: const AppEngineOptions(
    audioScenario: AppAudioScenario.media,
    video: AppVideoConfig(height: 720, fps: 30),
  ));
  final _subs = <StreamSubscription>[];
  final _chat = <ChatLine>[];
  final _hearts = <_Heart>[];
  final _say = TextEditingController();
  bool _isHost = true, _joined = false, _joining = false, _mic = true, _cam = true;
  (String, String, String)? _banner; // sender, gift name, emoji

  AppRemoteUser? get _host => engine.hosts.isEmpty ? null : engine.hosts.first;
  String _nameOf(AppRemoteUser? u) => (u?.attributes['name'] as String?) ?? u?.uid ?? 'Someone';

  @override
  void initState() {
    super.initState();
    _subs.addAll([
      engine.onTrackSubscribed.listen((_) => setState(() {})),
      engine.onTrackUnsubscribed.listen((_) => setState(() {})),
      engine.onAudienceChanged.listen((_) => setState(() {})),
      engine.onUserJoined.listen((u) { if (!u.isPublisher) _add(ChatLine(_nameOf(u), 'joined', system: true)); }),
      engine.onUserLeft.listen((u) {
        if (u.isPublisher && !_isHost && mounted) toast(context, 'The host ended the live');
        setState(() {});
      }),
      engine.onMessage.listen((m) {
        final from = _nameOf(m.from);
        if (m.text != null) {
          _add(ChatLine(from, m.text!));
        } else if (m.data?['kind'] == 'like') {
          _heart();
        } else if (m.data?['kind'] == 'gift') {
          _gift(from, (m.data!['i'] as num).toInt());
        }
      }),
    ]);
  }

  void _add(ChatLine l) => setState(() { _chat.add(l); if (_chat.length > 40) _chat.removeAt(0); });

  void _heart() {
    final h = _Heart(AnimationController(vsync: this, duration: const Duration(milliseconds: 2200)), Random().nextDouble() * 60 - 30,
        ['💖', '💜', '💗', '✨', '🔥'][Random().nextInt(5)]);
    setState(() => _hearts.add(h));
    h.c.forward().whenComplete(() { if (mounted) setState(() => _hearts.remove(h)); h.c.dispose(); });
  }

  void _gift(String from, int i) {
    final g = _gifts[i % _gifts.length];
    _add(ChatLine(from, 'sent ${g.$2} ${g.$1}', gift: true));
    setState(() => _banner = (from, g.$2, g.$1));
    Future.delayed(const Duration(milliseconds: 3200), () { if (mounted) setState(() => _banner = null); });
  }

  Future<void> _start() async {
    if (_joining) return;
    setState(() => _joining = true);
    try {
      if (_isHost && !await askPermissions(camera: true)) throw Exception('Camera and microphone are needed to go live');
      final t = await fetchToken(widget.room, _isHost ? 'host' : 'audience');
      await engine.joinChannel(token: t.token, wsUrl: t.wsUrl,
          options: AppJoinOptions(role: _isHost ? AppRole.host : AppRole.audience, camera: _isHost, microphone: _isHost));
      _add(ChatLine('', 'Welcome! Be kind in the chat 💬', system: true));
      setState(() => _joined = true);
    } catch (e) {
      if (mounted) toast(context, e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _joining = false);
    }
  }

  void _send() {
    final text = _say.text.trim();
    if (text.isEmpty) return;
    _say.clear();
    _add(ChatLine(Me.name, text));
    engine.sendMessage(text: text);
  }

  @override
  void dispose() {
    for (final s in _subs) { s.cancel(); }
    engine.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final host = _host;
    final showVideo = _joined && (_isHost ? _cam : host?.hasVideo == true);
    final hostName = _isHost ? Me.name : _nameOf(host);
    final hostId = _isHost ? Me.id : (host?.uid ?? widget.room);
    return Scaffold(
      resizeToAvoidBottomInset: false,
      body: Stack(fit: StackFit.expand, children: [
        // Stage
        if (showVideo)
          _isHost ? AppVideoView.local(engine) : AppVideoView.remote(host!, key: ValueKey(host.uid))
        else
          Container(
            decoration: const BoxDecoration(gradient: RadialGradient(center: Alignment(0, -0.3), radius: 1, colors: [Color(0xFF2A1F5A), C.ink])),
            alignment: Alignment.center,
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Icon(Icons.sensors, color: C.muted, size: 34),
              const SizedBox(height: 8),
              Text(_joined ? (_isHost ? 'Camera is off' : 'Waiting for the host…') : 'Live · ${widget.room.replaceFirst('live-', '')}',
                  style: const TextStyle(color: C.muted)),
            ]),
          ),
        // Shades
        const Positioned(top: 0, left: 0, right: 0, height: 140,
            child: DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0x8C000000), Colors.transparent])))),
        const Positioned(bottom: 0, left: 0, right: 0, height: 340,
            child: DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Colors.transparent, Color(0xBF000000)])))),
        SafeArea(child: Stack(children: [
          // Top bar
          Positioned(top: 8, left: 12, right: 12, child: Row(children: [
            Glass(padding: const EdgeInsets.fromLTRB(4, 4, 12, 4), child: Row(children: [
              Avatar(hostId, hostName, size: 34),
              const SizedBox(width: 8),
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(_joined ? hostName : '—', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                Text(_isHost && _joined ? 'You are live' : 'Live', style: const TextStyle(fontSize: 11, color: C.muted)),
              ]),
            ])),
            const SizedBox(width: 8),
            if (_joined)
              Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: C.live, borderRadius: BorderRadius.circular(7)),
                  child: const Text('LIVE', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.6))),
            const Spacer(),
            Glass(child: Row(children: [
              const Icon(Icons.visibility_outlined, size: 15),
              const SizedBox(width: 5),
              Text('${engine.audienceCount + (_isHost ? 0 : (_joined ? 1 : 0))}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
            ])),
            const SizedBox(width: 8),
            GestureDetector(onTap: () => Navigator.pop(context),
                child: const Glass(padding: EdgeInsets.all(8), child: Icon(Icons.close, size: 18))),
          ])),
          // Gift banner
          if (_banner != null)
            Positioned(top: 70, left: 12, child: TweenAnimationBuilder<double>(
              tween: Tween(begin: -1, end: 0), duration: const Duration(milliseconds: 350), curve: Curves.easeOutBack,
              builder: (_, v, child) => FractionalTranslation(translation: Offset(v, 0), child: child),
              child: Container(
                padding: const EdgeInsets.fromLTRB(6, 6, 16, 6),
                decoration: BoxDecoration(borderRadius: BorderRadius.circular(999),
                    gradient: const LinearGradient(colors: [Color(0xF2FFC24B), Color(0xE6FF4FA3)]),
                    boxShadow: [BoxShadow(color: C.gold.withValues(alpha: 0.4), blurRadius: 24, offset: const Offset(0, 10))]),
                child: Row(children: [
                  Avatar(_banner!.$1, _banner!.$1, size: 34),
                  const SizedBox(width: 10),
                  Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(_banner!.$1, style: const TextStyle(color: Color(0xFF1A0F00), fontWeight: FontWeight.w800, fontSize: 13)),
                    Text('sent ${_banner!.$2}', style: const TextStyle(color: Color(0xFF1A0F00), fontSize: 12)),
                  ]),
                  const SizedBox(width: 10),
                  Text(_banner!.$3, style: const TextStyle(fontSize: 28)),
                ]),
              ),
            )),
          // Chat
          Positioned(left: 12, right: 90, bottom: 76, height: 240, child: ShaderMask(
            shaderCallback: (r) => const LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter,
                colors: [Colors.transparent, Colors.black], stops: [0, 0.3]).createShader(r),
            blendMode: BlendMode.dstIn,
            child: ListView(reverse: true, children: _chat.reversed.map((l) => ChatBubble(l)).toList()),
          )),
          // Hearts
          ..._hearts.map((h) => AnimatedBuilder(animation: h.c, builder: (_, _) {
                final t = h.c.value;
                return Positioned(right: 22 - h.dx * t, bottom: 150 + 280 * t,
                    child: Opacity(opacity: (t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85).clamp(0, 1),
                        child: Transform.scale(scale: 0.6 + 0.5 * (t < 0.15 ? t / 0.15 : 1 - t * 0.3), child: Text(h.emoji, style: const TextStyle(fontSize: 28)))));
              })),
          // Host side controls
          if (_joined && _isHost)
            Positioned(right: 12, bottom: 90, child: Column(children: [
              RoundBtn(_mic ? Icons.mic : Icons.mic_off, () { setState(() => _mic = !_mic); engine.enableMicrophone(_mic); }, off: !_mic),
              const SizedBox(height: 12),
              RoundBtn(_cam ? Icons.videocam : Icons.videocam_off, () { setState(() => _cam = !_cam); engine.enableCamera(_cam); }, off: !_cam),
              const SizedBox(height: 12),
              RoundBtn(Icons.cameraswitch_outlined, engine.switchCamera),
            ])),
          // Bottom bar
          if (_joined)
            Positioned(left: 12, right: 12, bottom: 14, child: Row(children: [
              Expanded(child: TextField(
                controller: _say, onSubmitted: (_) => _send(), maxLength: 120,
                decoration: InputDecoration(
                  counterText: '', hintText: 'Say something…', filled: true, fillColor: Colors.black.withValues(alpha: 0.35),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(999), borderSide: const BorderSide(color: C.line)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(999), borderSide: const BorderSide(color: C.line)),
                ),
              )),
              const SizedBox(width: 10),
              RoundBtn(Icons.card_giftcard, () { final i = Random().nextInt(_gifts.length); _gift(Me.name, i); engine.sendMessage(data: {'kind': 'gift', 'i': i}); },
                  color: const Color(0x33FFC24B)),
              const SizedBox(width: 10),
              RoundBtn(Icons.favorite, () { _heart(); engine.sendMessage(data: {'kind': 'like'}, reliable: false); }, gradient: C.brand),
            ])),
          // Pre-join panel
          if (!_joined)
            Positioned(left: 20, right: 20, bottom: 24, child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Glass(radius: 16, padding: const EdgeInsets.all(5), child: Row(children: [
                _seg('Go live', _isHost, () => setState(() => _isHost = true)),
                const SizedBox(width: 6),
                _seg('Watch', !_isHost, () => setState(() => _isHost = false)),
              ])),
              const SizedBox(height: 12),
              GestureDetector(onTap: _start, child: Container(
                height: 54, alignment: Alignment.center,
                decoration: BoxDecoration(gradient: C.brand, borderRadius: BorderRadius.circular(16),
                    boxShadow: [BoxShadow(color: C.violet.withValues(alpha: 0.35), blurRadius: 30, offset: const Offset(0, 12))]),
                child: Text(_joining ? 'Connecting…' : (_isHost ? 'Start broadcast' : 'Join as viewer'),
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15.5)),
              )),
            ])),
        ])),
      ]),
    );
  }

  Widget _seg(String label, bool on, VoidCallback tap) => Expanded(child: GestureDetector(onTap: tap, child: Container(
        height: 42, alignment: Alignment.center,
        decoration: BoxDecoration(gradient: on ? C.brand : null, borderRadius: BorderRadius.circular(12)),
        child: Text(label, style: TextStyle(fontWeight: FontWeight.w700, color: on ? Colors.white : C.muted)),
      )));
}

class _Heart {
  final AnimationController c;
  final double dx;
  final String emoji;
  _Heart(this.c, this.dx, this.emoji);
}
