# AppLooma RTC — Flutter sample

Live streaming, voice room, voice call and video call screens from
[`applooma_uikit`](https://pub.dev/packages/applooma_uikit) 0.1.2 (on `applooma_rtc` 0.3.3).

```bash
flutter pub get
flutter run --dart-define=APP_ID=YOUR_APP_ID --dart-define=TOKEN_URL=http://10.0.2.2:3001/token
```

Start the token server in [`../token-server`](../token-server) first. `10.0.2.2` is
your computer as seen from the Android emulator; on a real phone use its LAN address.

The manifest declares `CAMERA`, `RECORD_AUDIO` and, for Android 12 and above,
`BLUETOOTH_CONNECT`; `Info.plist` carries the camera and microphone usage strings.
See [`../README.md`](../README.md) for the other platforms.
