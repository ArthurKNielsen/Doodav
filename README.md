# Doohickey

Point your phone at anything (food, a plant, a gadget, a book, a tool) or a product barcode, tap **Scan**, and get a clean info card. Every scan is saved to a searchable history, and you can ask follow-up questions about any item.

- **Barcodes:** looked up in [Open Food Facts](https://world.openfoodfacts.org) (free, no key).
- **Objects:** identified by Claude vision (`claude-sonnet-5-5` by default).
- **Stack:** React + Vite + TypeScript on the front, a small Express server that holds your API key.

---

## 1. Install

You need **Node.js 20 or newer** (22 recommended).

```bash
cd Doodav
npm install
```

## 2. Add your API key

```bash
cp .env.example .env
```

Open `.env` and paste your key after `ANTHROPIC_API_KEY=`. Get a key at <https://console.anthropic.com>.

The key lives only on the server. The browser never sees it. Barcode scans work without a key; object scans need one.

## 3. Start the app

```bash
npm run dev
```

This starts two processes:

- the API server on `http://localhost:8787`
- the web app on `http://0.0.0.0:5173` (reachable from your phone on the same Wi-Fi)

Check it works on your computer: open <http://localhost:5173>. Your laptop's webcam is used when there's no rear camera.

## 4. Get an HTTPS address for your iPhone

iPhone Safari only gives camera access on `https://` pages. Pick one of the two options below. The tunnel is the easiest, and it works from anywhere.

### Option A: Cloudflare Tunnel (recommended, no account needed)

Install `cloudflared` once:

```bash
# macOS
brew install cloudflared

# Windows (PowerShell)
winget install --id Cloudflare.cloudflared

# Linux (Debian/Ubuntu)
sudo mkdir -p --mode=0755 /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-public-v2.gpg | sudo tee /usr/share/keyrings/cloudflare-public-v2.gpg >/dev/null
echo 'deb [signed-by=/usr/share/keyrings/cloudflare-public-v2.gpg] https://pkg.cloudflare.com/cloudflared any main' | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt-get update && sudo apt-get install -y cloudflared
```

With `npm run dev` running in one terminal, open a second terminal and run:

```bash
cloudflared tunnel --url http://localhost:5173
```

It prints a line like:

```
https://random-words-here.trycloudflare.com
```

That's your HTTPS address. Open it on your iPhone. The URL changes each time you restart the tunnel, so you'll need to re-open the new one after a restart.

### Option B: ngrok

```bash
ngrok http 5173
```

Use the `https://….ngrok-free.app` address it prints.

### Option C: mkcert (local HTTPS only, same Wi-Fi)

Use this only if you don't want a tunnel. It's more setup: your phone has to trust a local certificate.

```bash
brew install mkcert            # or your OS's package manager
mkcert -install
mkcert -cert-file cert.pem -key-file key.pem <your-laptop-LAN-IP> localhost
```

Then point Vite at the certificates by adding `https: { cert: 'cert.pem', key: 'key.pem' }` under `server` in `vite.config.ts`. On the iPhone you must install the mkcert root CA (Settings > General > VPN & Device Management, then Certificate Trust Settings). The tunnel is simpler.

## 5. Add it to your iPhone home screen

1. Open your HTTPS address in **Safari** (not Chrome; only Safari can add a home-screen web app on iPhone).
2. Tap the **Share** button (square with an arrow).
3. Scroll and tap **Add to Home Screen**, then **Add**.
4. Open **Doohickey** from your home screen. It runs full screen, like an app.

To use the offline shell and the service worker, run a production build (see below). Dev mode skips caching so your edits show up right away.

## 6. Camera permission

If the camera is blocked, go to **Settings > Safari > Camera** and set it to **Allow** (or **Ask**). Then fully close and reopen Doohickey. You can also tap **Choose a photo instead** at any time.

## Production-style run (optional)

```bash
npm run build          # type-checks and builds to dist/
npm start              # API server on :8787 (keep it running)
npm run preview        # serves dist/ on :4173 and proxies /api
```

Then tunnel port 4173 instead of 5173 (`cloudflared tunnel --url http://localhost:4173`).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | API server + web app with hot reload |
| `npm run build` | Typecheck and production build |
| `npm test` | Unit tests for the JSON validator and barcode parser |
| `npm run typecheck` | TypeScript check only |
| `python3 scripts/make-icons.py` | Regenerate the PWA icons (needs Pillow) |

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | (none) | Required for object scans and follow-up questions |
| `ANTHROPIC_MODEL` | `claude-sonnet-5-5` | Model for vision and follow-ups. Use `claude-sonnet-4-5` if you prefer that one. |
| `PORT` | `8787` | API server port (Vite proxies `/api` here) |

After changing `.env`, restart `npm run dev`.

## How it works

- **Scan:** the app captures one frame from the rear camera and resizes it to 1024 px on the longest side, then JPEG-encodes it.
- **Barcode first:** the frame is checked for a product barcode using the native `BarcodeDetector` when available (Chrome and Android). Otherwise it uses ZXing, which iPhone Safari needs. A hit goes to Open Food Facts.
- **Object:** if there's no barcode (or the barcode isn't a food product), the photo goes to Claude, which must reply with strict JSON. The server validates it (`shared/validate.ts`) before anything reaches the screen. Prices are always marked as estimates, and fields the model doesn't know are left empty.
- **Follow-ups:** each question is one API call, with the card as context and the last few turns of conversation.
- **History:** saved in your browser's `localStorage`, capped at 200 scans. It stays on that device and browser.

## Tests

```bash
npm test
```

- `shared/validate.test.ts`: the Claude JSON validator (required fields, caps, price handling, food-only allergens, fenced JSON).
- `server/openFoodFacts.test.ts`: the barcode format check and the Open Food Facts parser.

## Project layout

```
server/
  index.ts            Express routes (identify, barcode, ask, health)
  claude.ts           Anthropic calls and prompts
  openFoodFacts.ts    Barcode lookup and parser
shared/
  types.ts            Types used by client and server
  validate.ts         Validates Claude's JSON
src/
  App.tsx             Shell, tabs, card view
  components/         Scanner, InfoCard, AskPanel, HistoryList, Notice
  lib/                API client, camera, barcode, image, history, theme
public/
  manifest.json       Home-screen app manifest
  sw.js               Service worker (app shell only, never /api)
  icons/              App icons
scripts/make-icons.py Icon generator
```

## Troubleshooting

- **"The camera needs a secure (https://) address"**: you're on `http://`. Open the tunnel link.
- **"ANTHROPIC_API_KEY is not set"**: add the key to `.env` and restart.
- **"Can't reach the Doohickey server"**: make sure `npm run dev` is still running.
- **Barcode not found**: Open Food Facts only covers food and drink. Non-food barcodes go to Claude with the photo.
