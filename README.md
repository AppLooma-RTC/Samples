# AppLooma RTC — Sample Apps

Four ready-to-run apps, one per platform, each with the same four screens. Every
screen is a component from the **AppLooma UIKit** — the only code each app writes is
a home screen, a token provider that calls its own server, and which room to open.

| Screen | What it shows |
|---|---|
| **Live Streaming** | Go live or watch; comments, floating hearts and gift banners over `sendMessage`; mic, camera and flip for the host |
| **Voice Room** | 8 seats with a crown for the first speaker, green speaking rings, mute badges and room chat |
| **Voice Call** | 1-to-1 audio with a pulsing avatar, call timer, mute and end |
| **Video Call** | 1-to-1 video, full-screen remote picture, draggable self-view, mute, camera, flip and end |

| Folder | Platform | SDK |
|---|---|---|
| [`web`](web) | Browser (Vite + React) | `@applooma/uikit-react` |
| [`flutter`](flutter) | Android + iOS | `applooma_uikit` |
| [`react-native`](react-native) | Android + iOS | `@applooma/uikit-react-native` |
| [`android-kotlin`](android-kotlin) | Android (Jetpack Compose) | `com.applooma:uikit-android` |
| [`token-server`](token-server) | Node.js | `@applooma/server-sdk` |

## 1. Start the token server

Every app asks **your** server for a token before joining — your API secret never
ships inside an app. Get an App ID, API key and secret from
[applooma.dev/dashboard](https://applooma.dev/dashboard).

```bash
cd token-server
npm install
APPLOOMA_API_KEY=... APPLOOMA_API_SECRET=... npm start   # http://localhost:3001/token
```

## 2. Run a sample

**Web**

```bash
cd web && cp .env.example .env    # set VITE_APP_ID
npm install && npm run dev
```

**Flutter**

```bash
cd flutter && flutter pub get
flutter run --dart-define=APP_ID=YOUR_APP_ID --dart-define=TOKEN_URL=http://10.0.2.2:3001/token
```

**React Native** — set `APP_ID` and `TOKEN_URL` in `src/common.tsx`, then:

```bash
cd react-native && npm install
npm run android        # or: cd ios && pod install && cd .. && npm run ios
```

**Android (Kotlin)**

```bash
cd android-kotlin
./gradlew installDebug -PappId=YOUR_APP_ID -PtokenUrl=http://10.0.2.2:3001/token
```

`10.0.2.2` is your computer as seen from the Android emulator. On a real phone use
your computer's LAN address, e.g. `http://192.168.1.20:3001/token`.

## 3. Try it with two devices

Type the same **room / call code** on two devices (or two browser tabs) and pick the
same screen. In Live Streaming one side chooses *Go live* and the other *Watch*.

## Want the raw SDK instead?

The UIKit screens are open source and built on the SDKs. For a fully custom UI, use
the SDK directly — see [docs.applooma.dev](https://docs.applooma.dev).

## How the pieces talk

- **Roles** come from the token: the live host is `host`, viewers are `audience`,
  voice-room speakers are `cohost`, both sides of a call are `host`.
- **Chat, hearts, gifts, seat order** all ride `sendMessage` — no database, no extra
  socket. Messages reach whoever is in the room at that moment.
- **Display names** travel in the token metadata; every SDK reads them from
  `user.attributes.name`.

These samples trust the identity the app sends. In your product, derive it from your
own signed-in user on the server.

## License

MIT © AppLooma LLC
