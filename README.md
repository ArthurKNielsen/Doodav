# Doohav

Point your phone at anything (food, a plant, a gadget, a book, a tool) or a product barcode, tap **Scan**, and get a clean info card. Every scan is saved to a searchable history, and you can ask follow-up questions about any item.

**Free to run.** No paid AI service and no Anthropic/Claude account:

- **Barcodes:** [Open Food Facts](https://world.openfoodfacts.org), free, no key.
- **Objects and follow-ups:** a vision model that runs on your own computer through [Ollama](https://ollama.com) (free, no key, no limits). Or Google's free Gemini tier if you'd rather not run a model locally.
- **Stack:** React + Vite + TypeScript on the front, a small Express server that holds any keys.

---

## Quick test (start here)

Two ways to try it. Do the first one, then the second if you want to use your phone.

**A. Test on your PC**

```bash
npm install
cp .env.example .env         # Windows: copy .env.example .env
npm run doctor               # checks what's ready and tells you what's missing
npm run dev                  # then open http://localhost:5173
```

Your laptop's webcam works here. Tap **Scan** on a product barcode, or use **Choose a photo instead** on any object (the object scan needs Ollama running, see step 2).

**B. Test on your iPhone (one command)**

1. Install the free tunnel tool once:
   - macOS: `brew install cloudflared`
   - Windows: `winget install --id Cloudflare.cloudflared`
   - Linux: see section 4 below
2. Run:

   ```bash
   npm run phone
   ```

3. A QR code appears in the terminal. Scan it with your iPhone Camera app and open the link in **Safari**.
4. Optional: Share > Add to Home Screen.
5. Keep the terminal open while you test. Press **Ctrl+C** to stop.

The link changes every time you run `npm run phone`. If the camera says it's blocked, see section 6.

**What to try first:** scan a food barcode, scan a plant or a gadget, tap "Ask about this", close the app and reopen it to check your history is still there.

---

## Put it online (use it on your iPhone without your laptop)

This runs the app on a free web host with Google's free Gemini AI. Once it's up, the phone only needs the internet, and the camera works because the address is `https://`.

1. **Get a free Gemini key** at <https://aistudio.google.com/apikey>.
2. **Create a free web service** on [Render](https://render.com) (sign in with GitHub, then New > Web Service, and pick the `Doodav` repo, branch `main`). Render's free plan and features may change, so check their page if the options look different.
3. **Fill in the settings:**
   - Runtime: Node
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - Environment variables:
     - `AI_PROVIDER` = `gemini`
     - `GEMINI_API_KEY` = your key
     - `NODE_ENV` = leave unset (the build needs the dev tools)
4. **Deploy.** When it says Live, Render gives you an address like `https://doodav.onrender.com`.
5. **On your iPhone:** open that address in Safari, then Share > Add to Home Screen. It opens full screen like an app.

Good to know:
- Free hosts sleep when idle. The first scan after a quiet period can take 30 to 60 seconds to wake up.
- Your key lives only in the host's settings, never in the code or in git.
- Every push to `main` redeploys automatically. Update with `git pull` as before.
- The free Gemini tier has daily and per-minute limits. The app shows a message if you hit them.

## Test from scratch (new computer, step by step)

This walks through everything, starting from a computer with nothing installed. Each step says what you should see. If a step doesn't match, jump to **Troubleshooting** at the bottom.

You need: a Mac, Windows, or Linux computer, an iPhone with Safari, and both on the same Wi-Fi.

### Step 1. Install Node.js (once)

Download the **LTS** version from <https://nodejs.org> and install it with the default options.

Open a terminal (Mac: Terminal, Windows: PowerShell) and check:

```bash
node -v
```

✅ Pass: it prints `v20.something` or higher.

### Step 2. Get the code

```bash
git clone https://github.com/ArthurKNielsen/Doodav.git
cd Doodav
git checkout main
```

No git? Download the ZIP from GitHub, unzip it, switch to the branch on GitHub, and open the folder in your terminal.

### Step 3. Install the project

```bash
npm install
```

✅ Pass: it ends with a line like `added 300 packages`. Some "funding" or "warn" lines are normal. Only a red `ERR!` is a problem.

### Step 4. Create your settings file

```bash
cp .env.example .env
```

Windows (PowerShell): `copy .env.example .env`

You don't need to edit anything for the free local setup.

### Step 5. Install the free AI (Ollama, about 6 GB download)

1. Download and install Ollama from <https://ollama.com>, then open it. A llama icon should appear in your menu bar or system tray.
2. Download the model. This takes a while:

   ```bash
   ollama pull qwen2.5vl:7b
   ```

✅ Pass: it ends with `success`. Then `ollama list` shows `qwen2.5vl:7b`.

### Step 6. Check everything

```bash
npm run doctor
```

✅ Pass: Node is green, `.env` is found, and Ollama is running with `qwen2.5vl:7b`. The cloudflared line may still be a warning. That's fixed in Step 9.

### Step 7. Run the automatic tests

```bash
npm test
npm run build
```

✅ Pass: `Tests 23 passed` and `built in` with no errors. This checks the JSON validator, the barcode parser, and the Ollama and Gemini code. It doesn't need a camera or a real model.

### Step 8. Test on your computer

```bash
npm run dev
```

Open <http://localhost:5173> in Chrome or Safari. Allow the camera if asked. Then check each item below:

| # | Try this | ✅ You should see |
| --- | --- | --- |
| a | Look at the top of the screen | "Doohav" header, and the Scan / History tabs at the bottom |
| b | Point the camera at any object (a mug, a plant) and tap **Scan** | "Identifying…" for up to a minute the first time (the model loads), then an info card with a name, category, and facts |
| c | Tap **Ask about this**, type "What is it made of?", tap **Send** | An answer appears in a chat bubble |
| d | Tap **Choose a photo instead** and pick a photo of a food product that shows its barcode | A product card from Open Food Facts (needs internet). If you have no barcode photo, skip this one |
| e | Tap **History** | Your scans are listed. Type in the search box and the list filters |
| f | Tap **Dark mode** in the header | The colors switch to dark. Tap again to go back |
| g | Refresh the page (Cmd+R / Ctrl+R) and open History | Your scans are still there |

If the camera is blocked on your laptop, the browser has a camera icon in the address bar. Allow it and refresh.

Stop the app with **Ctrl+C** in the terminal when you're done.

### Step 9. Test on your iPhone

1. Install the free tunnel tool once (this is what gives the phone the secure link the camera needs):
   - Mac: `brew install cloudflared` (needs Homebrew from <https://brew.sh>)
   - Windows: `winget install --id Cloudflare.cloudflared`
   - Linux: see section 4 below
2. Run it in the terminal:

   ```bash
   npm run phone
   ```

3. Wait for **"Doohav is running!"** and a QR code. This can take 10 to 20 seconds.
4. On your iPhone, open the **Camera** app, point it at the QR code, and tap the link. It opens in Safari.
5. Tap **Allow** when Safari asks for camera access. If you tapped Don't Allow, go to **Settings > Safari > Camera** and set it to Allow, then reload.

Now run the same checks as Step 8 (a to g) on the phone. Then:

6. Tap the **Share** button (square with an arrow) > **Add to Home Screen** > **Add**.
7. Close Safari, open **Doohav** from your home screen. It should open full screen with no browser bar.

✅ Pass: the scan, the follow-up question, and the history all work on the phone.

Keep the terminal open while you use the phone. Press **Ctrl+C** to stop. The link changes every time you run `npm run phone`, so the home-screen icon may need the new link.

### Troubleshooting

| What you see | Fix |
| --- | --- |
| `node: command not found` | Restart the terminal after installing Node. |
| `npm ERR!` during install | Run `npm install` again. If it still fails, copy the error and ask for help. |
| "Ollama isn't running" | Open the Ollama app, or run `ollama serve`, then refresh. |
| "Ollama doesn't have the model" | Run `ollama pull qwen2.5vl:7b`. |
| Scan takes more than 2 minutes | Your computer is slow for the model. Try `ollama pull qwen2.5vl:3b`, set `OLLAMA_MODEL=qwen2.5vl:3b` in `.env`, and restart `npm run dev`. |
| "Can't reach the Doohav server" | `npm run dev` isn't running, or the API crashed. Check the terminal for red text. |
| Barcode not found | Not every barcode is in Open Food Facts. Non-food items go to the AI instead. |
| Phone shows "needs a secure (https://) address" | You opened the `http://` address. Use the `https://…trycloudflare.com` link from `npm run phone`. |
| Phone camera blocked | Settings > Safari > Camera > Allow, then fully close and reopen Doohav. |
| `cloudflared: command not found` | Install it (Step 9.1), then open a new terminal. |

## 1. Install

You need **Node.js 20 or newer** (22 recommended).

```bash
cd Doodav
npm install
```

## 2. Set up the free AI (pick one)

### Option A: Ollama, local and fully free (default)

1. Install Ollama from <https://ollama.com> and open it (it runs in the background).
2. Download a vision model once. `qwen2.5vl:7b` is a good balance of quality and speed (about 6 GB):

   ```bash
   ollama pull qwen2.5vl:7b
   ```

3. Copy the settings file and leave the defaults:

   ```bash
   cp .env.example .env
   ```

Ollama needs a computer with enough memory: 16 GB of RAM is comfortable for the 7B model. A slower machine still works, just with longer waits. For a lighter model, use `ollama pull qwen2.5vl:3b` and set `OLLAMA_MODEL=qwen2.5vl:3b` in `.env`.

### Option B: Gemini free tier (hosted, no local model)

1. Create a free key at <https://aistudio.google.com/apikey>.
2. In `.env`, set:

   ```
   AI_PROVIDER=gemini
   GEMINI_API_KEY=your-key-here
   ```

Free-tier limits apply (requests per minute and per day). If you hit them, the app says so and you can wait a minute. Google may use free-tier data to improve its products, so read their terms if that matters to you.

Barcode scans work without any AI setup.

## 3. Start the app

```bash
npm run dev
```

This starts two processes:

- the API server on `http://localhost:8787`
- the web app on `http://0.0.0.0:5173` (reachable from your phone on the same Wi-Fi)

Open <http://localhost:5173> on your computer. The app shows a setup note if the AI isn't ready yet (for example, Ollama isn't running or the model isn't downloaded).

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
4. Open **Doohav** from your home screen. It runs full screen, like an app.

To use the offline shell and the service worker, run a production build (see below). Dev mode skips caching so your edits show up right away.

## 6. Camera permission

If the camera is blocked, go to **Settings > Safari > Camera** and set it to **Allow** (or **Ask**). Then fully close and reopen Doohav. You can also tap **Choose a photo instead** at any time.

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
| `npm run phone` | Run everything and print a QR code to open on your iPhone (free HTTPS tunnel) |
| `npm run doctor` | Check Node, `.env`, Ollama, and cloudflared, and say what to fix |
| `python3 scripts/make-icons.py` | Regenerate the PWA icons (needs Pillow) |

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `AI_PROVIDER` | `ollama` | `ollama` (local, free) or `gemini` (free tier, needs a key) |
| `OLLAMA_HOST` | `http://localhost:11434` | Where Ollama is running |
| `OLLAMA_MODEL` | `qwen2.5vl:7b` | Any vision-capable model you've pulled with `ollama pull` |
| `GEMINI_API_KEY` | (none) | Required only when `AI_PROVIDER=gemini` |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model name |
| `PORT` | `8787` | API server port (Vite proxies `/api` here) |

After changing `.env`, restart `npm run dev`.

## How it works

- **Scan:** the app captures one frame from the rear camera and resizes it to 1024 px on the longest side, then JPEG-encodes it.
- **Barcode first:** the frame is checked for a product barcode using the native `BarcodeDetector` when available (Chrome and Android). Otherwise it uses ZXing, which iPhone Safari needs. A hit goes to Open Food Facts.
- **Object:** if there's no barcode (or the barcode isn't a food product), the photo goes to the vision model (Ollama or Gemini), which must reply with strict JSON. The server validates it (`shared/validate.ts`) before anything reaches the screen. Prices are always marked as estimates, and fields the model doesn't know are left empty.
- **Follow-ups:** each question is one API call, with the card as context and the last few turns of conversation.
- **History:** saved in your browser's `localStorage`, capped at 200 scans. It stays on that device and browser.

## Tests

```bash
npm test
```

- `shared/validate.test.ts`: the AI JSON validator (required fields, caps, price handling, food-only allergens, fenced JSON).
- `server/openFoodFacts.test.ts`: the barcode format check and the Open Food Facts parser.
- `server/llm/providers.test.ts`: the Ollama and Gemini request and response handling (fetch is mocked, so no real model or key is needed).

## Project layout

```
server/
  index.ts            Express routes (identify, barcode, ask, health)
  ai.ts               Prompts and the identify / follow-up tasks
  llm/                Provider-neutral model layer
    types.ts          LlmProvider interface and errors
    ollama.ts         Local model via Ollama (default)
    gemini.ts         Google Gemini free tier
    index.ts          Picks the provider from AI_PROVIDER
  openFoodFacts.ts    Barcode lookup and parser
shared/
  types.ts            Types used by client and server
  validate.ts         Validates the model's JSON
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
- **"Ollama isn't running"**: open the Ollama app (or run `ollama serve`), then refresh.
- **"Ollama doesn't have the model"**: run the `ollama pull ...` command the message shows.
- **"GEMINI_API_KEY is not set"**: add your free key to `.env` (with `AI_PROVIDER=gemini`) and restart.
- **"Can't reach the Doohav server"**: make sure `npm run dev` is still running.
- **Barcode not found**: Open Food Facts only covers food and drink. Non-food barcodes go to the AI model with the photo.
