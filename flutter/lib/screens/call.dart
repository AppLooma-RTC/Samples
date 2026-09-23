import 'dart:async';

import 'package:applooma_rtc/applooma_rtc.dart';
import 'package:flutter/material.dart';

import '../common.dart';

/// 1-to-1 call, voice or video. Both people open the same call code; the second
/// to arrive connects the call and the timer starts.
class CallScreen extends StatefulWidget {
  final String room;
  final bool video;
  const CallScreen({super.key, required this.room, required this.video});
  @override
  State<CallScreen> createState() => _CallScreenState();
}

class _CallScreenState extends State<CallScreen> with SingleTickerProviderStateMixin {
  late final engine = AppEngine.create(appId: appId, options: AppEngineOptions(
    // A private call belongs on the call path: earpiece by default, speech-tuned echo cancelling.
    audioScenario: widget.video ? AppAudioScenario.media : AppAudioScenario.call,
    video: const AppVideoConfig(height: 720, fps: 30),
  ));
  final _subs = <StreamSubscription>[];
  late final AnimationController _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 2400))..repeat();
  AppRemoteUser? _peer;
  DateTime? _startedAt;
  Timer? _timer;
  bool _mic = true, _cam = true;
  String _status = 'Connecting…', _quality = 'HD';
  Offset _pip = const Offset(-1, -1);

  @override
  void initState() {
    super.initState();
    _subs.addAll([
      engine.onUserJoined.listen(_meet),
      engine.onTrackSubscribed.listen(_meet),
      engine.onTrackUnsubscribed.listen((_) => setState(() {})),
      engine.onUserLeft.listen((u) {
        if (u.uid != _peer?.uid) return;
        setState(() { _peer = null; _startedAt = null; _status = 'Call ended'; });
        Future.delayed(const Duration(milliseconds: 1400), () { if (mounted) Navigator.pop(context); });
      }),
      engine.onRemoteStats.listen((stats) {
        if (stats.isEmpty) return;
        final s = stats.first;
        setState(() => _quality = widget.video && s.videoHeight > 0 ? '${s.videoHeight}p' : (s.audioPacketsLost > 50 ? 'Weak' : 'HD'));
      }),
    ]);
    _timer = Timer.periodic(const Duration(milliseconds: 500), (_) { if (mounted && _startedAt != null) setState(() {}); });
    _join();
  }

  void _meet(AppRemoteUser u) => setState(() { _peer ??= u; _startedAt ??= DateTime.now(); });

  Future<void> _join() async {
    try {
      if (!await askPermissions(camera: widget.video)) throw Exception('Permissions are needed for the call');
      final t = await fetchToken(widget.room, 'host');
      await engine.joinChannel(token: t.token, wsUrl: t.wsUrl, options: AppJoinOptions(role: AppRole.host, camera: widget.video, microphone: true));
      if (_peer == null) setState(() => _status = 'Calling…');
      for (final u in engine.remoteUsers) { _meet(u); }
    } catch (e) {
      if (!mounted) return;
      setState(() => _status = 'Could not connect');
      toast(context, e.toString().replaceFirst('Exception: ', ''));
    }
  }

  @override
  void dispose() {
    for (final s in _subs) { s.cancel(); }
    _timer?.cancel();
    _pulse.dispose();
    engine.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    if (_pip.dx < 0) _pip = Offset(size.width - 124, 90);
    final peerName = _peer == null ? _status : ((_peer!.attributes['name'] as String?) ?? _peer!.uid);
    final showRemote = widget.video && _peer?.hasVideo == true;
    final code = widget.room.replaceFirst(RegExp(r'^(a|v)call-'), '');
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(children: [
        if (showRemote)
          Positioned.fill(child: AppVideoView.remote(_peer!, key: ValueKey(_peer!.uid)))
        else
          Positioned.fill(child: Container(
            decoration: const BoxDecoration(gradient: RadialGradient(center: Alignment(0, -0.3), radius: 1, colors: [Color(0xFF1D3A4D), C.ink])),
            child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              SizedBox(width: 220, height: 220, child: Stack(alignment: Alignment.center, children: [
                for (final phase in [0.0, 0.5])
                  AnimatedBuilder(animation: _pulse, builder: (_, _) {
                    final v = (_pulse.value + phase) % 1;
                    return Container(width: 132 + 90 * v, height: 132 + 90 * v,
                        decoration: BoxDecoration(shape: BoxShape.circle, color: C.green.withValues(alpha: 0.18 * (1 - v))));
                  }),
                Avatar(_peer?.uid ?? widget.room, _peer == null ? '…' : peerName, size: 132),
              ])),
              const SizedBox(height: 10),
              Text(peerName, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800)),
              const SizedBox(height: 6),
              _startedAt != null
                  ? Text(formatTime(DateTime.now().difference(_startedAt!).inSeconds),
                      style: const TextStyle(color: C.muted, fontSize: 15, letterSpacing: 1, fontFeatures: [FontFeature.tabularFigures()]))
                  : Text.rich(TextSpan(style: const TextStyle(color: C.muted), children: [
                      const TextSpan(text: 'Share the code '), TextSpan(text: code, style: const TextStyle(color: C.text, fontWeight: FontWeight.w700)),
                    ])),
            ]),
          )),
        if (showRemote)
          const Positioned(top: 0, left: 0, right: 0, height: 140,
              child: DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0x8C000000), Colors.transparent])))),
        SafeArea(child: Padding(padding: const EdgeInsets.fromLTRB(12, 8, 12, 0), child: Row(children: [
          GestureDetector(onTap: () => Navigator.pop(context), child: const Glass(padding: EdgeInsets.all(8), child: Icon(Icons.keyboard_arrow_down, size: 20))),
          const Spacer(),
          if (showRemote && _startedAt != null)
            Glass(child: Text(formatTime(DateTime.now().difference(_startedAt!).inSeconds), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600))),
          const SizedBox(width: 8),
          Glass(child: Row(children: [const Icon(Icons.signal_cellular_alt, size: 14, color: C.green), const SizedBox(width: 5), Text(_quality, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600))])),
        ]))),
        // Draggable self-view
        if (widget.video && _cam)
          Positioned(left: _pip.dx, top: _pip.dy, child: GestureDetector(
            onPanUpdate: (d) => setState(() => _pip = Offset((_pip.dx + d.delta.dx).clamp(8, size.width - 116), (_pip.dy + d.delta.dy).clamp(40, size.height - 260))),
            child: Container(
              width: 108, height: 160, clipBehavior: Clip.antiAlias,
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(18), border: Border.all(color: Colors.white38, width: 2),
                  boxShadow: const [BoxShadow(color: Colors.black54, blurRadius: 30, offset: Offset(0, 12))], color: const Color(0xFF111111)),
              child: AppVideoView.local(engine),
            ),
          )),
        // Controls
        Positioned(left: 0, right: 0, bottom: 0, child: Container(
          padding: const EdgeInsets.fromLTRB(20, 30, 20, 38),
          decoration: const BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Colors.transparent, Color(0xB3000000)])),
          child: Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
            RoundBtn(_mic ? Icons.mic : Icons.mic_off, () { setState(() => _mic = !_mic); engine.enableMicrophone(_mic); }, off: !_mic, label: 'Mute'),
            if (widget.video) RoundBtn(_cam ? Icons.videocam : Icons.videocam_off, () { setState(() => _cam = !_cam); engine.enableCamera(_cam); }, off: !_cam, label: 'Camera'),
            RoundBtn(Icons.call_end, () => Navigator.pop(context), size: 66, color: C.live, label: 'End'),
            if (widget.video) RoundBtn(Icons.cameraswitch_outlined, engine.switchCamera, label: 'Flip'),
          ]),
        )),
      ]),
    );
  }
}
