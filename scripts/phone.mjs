#!/usr/bin/env node
// One command to run Doohav on your computer AND open it on your phone.
//   npm run phone
// It starts the API server and the web app, opens a free HTTPS tunnel with
// Cloudflare (needed for the iPhone camera), and prints a QR code to scan.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { networkInterfaces } from 'node:os';

const WEB_PORT = 5173;
const API_PORT = Number(process.env.PORT) || 8787;
const isWindows = process.platform === 'win32';
const children = [];
let shuttingDown = false;

const fail = (msg) => {
  console.log(`\n\x1b[31m${msg}\x1b[0m\n`);
  process.exit(1);
};

// ---- Preflight: catch the common setup problems before starting anything -----
for (const pkg of ['vite', 'tsx', 'qrcode-terminal']) {
  if (!existsSync(`node_modules/${pkg}`)) {
    fail(`Missing "${pkg}". Run "npm install" in this folder first, then try again.`);
  }
}

/** Resolves true if nothing is listening on the port. */
function portFree(port) {
  return new Promise((resolve) => {
    const probe = createServer().once('error', () => resolve(false)).once('listening', () => {
      probe.close(() => resolve(true));
    });
    probe.listen(port, '0.0.0.0');
  });
}

if (!(await portFree(WEB_PORT))) {
  fail(`Port ${WEB_PORT} is already in use. Close the other "npm run dev" or "npm run phone" window, then try again.`);
}
if (!(await portFree(API_PORT))) {
  fail(`Port ${API_PORT} is already in use. Close the other Doohav server window, then try again.`);
}

const { default: qrcode } = await import('qrcode-terminal');

const color = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

/** Starts a child process and prefixes its output so you can tell the pieces apart. */
function start(label, cmd, args, { onLine } = {}) {
  const child = spawn(cmd, args, { shell: isWindows, stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(child);
  const recent = []; // last lines of output, shown if this process dies
  const handle = (chunk) => {
    for (const line of chunk.toString().split(/\r?\n/)) {
      if (!line.trim()) continue;
      recent.push(line);
      if (recent.length > 25) recent.shift();
      onLine?.(line);
      if (process.env.DOOHAV_VERBOSE) console.log(color.dim(`[${label}] ${line}`));
    }
  };
  child.stdout.on('data', handle);
  child.stderr.on('data', handle);
  child.on('error', (err) => {
    console.log(color.red(`\n${label} could not start: ${err.message}`));
  });
  child.on('exit', (code) => {
    if (!shuttingDown && code !== 0 && code !== null) {
      console.log(color.red(`\n${label} stopped (exit ${code}). Last output:`));
      console.log(color.dim(recent.slice(-12).map((l) => `  ${l}`).join('\n')));
      console.log(color.yellow('\nFix the problem above, then press Ctrl+C and run npm run phone again.'));
    }
  });
  return child;
}

function lanAddress() {
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list ?? []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return null;
}

function hasCommand(cmd) {
  return spawnSync(cmd, ['--version'], { shell: isWindows, stdio: 'ignore' }).status === 0;
}

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(color.dim('\nStopping Doohav…'));
  for (const c of children) c.kill();
  setTimeout(() => process.exit(0), 300);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// ---- 1. API server --------------------------------------------------------
start('api', 'npx', ['tsx', 'server/index.ts']);

// ---- 2. Web app (proxies /api to the API server) ----------------------------
let webReady = false;
start('web', 'npx', ['vite', '--host', '0.0.0.0', '--port', String(WEB_PORT), '--strictPort'], {
  onLine: (line) => {
    if (!webReady && /Local:|ready in/i.test(line)) {
      webReady = true;
      openTunnel();
    }
  },
});

// ---- 3. Free HTTPS tunnel for the phone -----------------------------------
function openTunnel() {
  const lan = lanAddress();
  const lanUrl = lan ? `http://${lan}:${WEB_PORT}` : null;

  if (!hasCommand('cloudflared')) {
    console.log(`
${color.yellow('cloudflared is not installed, so the phone can open the app but the camera will be blocked.')}
Install it once (free), then run npm run phone again:
  macOS:    brew install cloudflared
  Windows:  winget install --id Cloudflare.cloudflared
  Linux:    see the README, section 4

${color.bold('Meanwhile, test on your phone over Wi-Fi (no camera, but "Choose a photo" works):')}
  ${lanUrl ?? '(could not find your Wi-Fi address)'}
`);
    return;
  }

  let announced = false;
  start('tunnel', 'cloudflared', ['tunnel', '--no-autoupdate', '--url', `http://localhost:${WEB_PORT}`], {
    onLine: (line) => {
      const match = line.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match && !announced) {
        announced = true;
        announce(match[0], lanUrl);
      }
    },
  });
}

function announce(url, lanUrl) {
  console.log(`
${color.green(color.bold('Doohav is running!'))}

${color.bold('On your iPhone:')} scan this QR code with the Camera app and open the link in Safari.
${color.bold('Link:')} ${color.bold(url)}
`);
  qrcode.generate(url, { small: true });
  console.log(`
${color.bold('Then:')} Share button > Add to Home Screen (optional, runs full screen).
${color.bold('On this computer:')} http://localhost:${WEB_PORT}
${lanUrl ? `${color.bold('Same Wi-Fi, no camera:')} ${lanUrl}\n` : ''}
${color.dim('Keep this window open. Press Ctrl+C to stop everything.')}
${color.dim('The link changes each time you start this command.')}
`);
}
