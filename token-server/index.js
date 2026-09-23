/**
 * Token server for the AppLooma RTC sample apps.
 *
 *   APPLOOMA_API_KEY=... APPLOOMA_API_SECRET=... npm start
 *
 * Every sample asks this server for a token before joining. Your API secret
 * lives only here — never ship it inside an app.
 *
 * POST /token  { room, identity, name?, role? }  ->  { token, wsUrl }
 *
 * This sample trusts whatever identity the app sends. In your product, derive
 * the identity from your own signed-in user instead.
 */
const express = require('express');
const cors = require('cors');
const { AppServerClient } = require('@applooma/server-sdk');

const { APPLOOMA_API_KEY, APPLOOMA_API_SECRET, APPLOOMA_API_URL, PORT = 3001 } = process.env;
if (!APPLOOMA_API_KEY || !APPLOOMA_API_SECRET) {
  console.error('Set APPLOOMA_API_KEY and APPLOOMA_API_SECRET (console → your app → API keys).');
  process.exit(1);
}

const applooma = new AppServerClient({ apiKey: APPLOOMA_API_KEY, apiSecret: APPLOOMA_API_SECRET, baseUrl: APPLOOMA_API_URL });
const ROLES = new Set(['host', 'cohost', 'audience']);
const ROOM = /^[a-zA-Z0-9_-]{1,64}$/;

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/token', async (req, res) => {
  const { room, identity, name, role = 'host' } = req.body || {};
  if (!ROOM.test(String(room || ''))) return res.status(400).json({ error: 'room must match [a-zA-Z0-9_-]{1,64}' });
  if (!identity || String(identity).length > 64) return res.status(400).json({ error: 'identity is required (max 64 chars)' });
  if (!ROLES.has(role)) return res.status(400).json({ error: 'role must be host, cohost or audience' });
  try {
    // `name` rides in the token metadata; every SDK exposes it as user.attributes.name.
    const result = await applooma.createToken({ roomName: room, identity: String(identity), role, metadata: { name: name || identity } });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`AppLooma sample token server on http://localhost:${PORT}`));
