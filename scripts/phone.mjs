#!/usr/bin/env node
// One command to run Doohickey on your computer AND open it on your phone.
//   npm run phone
// It starts the API server and the web app, opens a free HTTPS tunnel with
// Cloudflare (needed for the iPhone camera), and prints a QR code to scan.
import { spawn, spawnSync } from 'node:child_process';
import { networkInterfaces } from 'node:os';
import qrcode from 'qrcode-terminal';

const WEB_PORT = 5173;
const isWindows = process.platform === 'win32';
const children = [];
let shuttingDown = false;

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
  const handle = (chunk) => {
    for (const line of chunk.toString().split(/\r?\n/)) {
      if (!line.trim()) continue;
      onLine?.(line);
      if (process.env.DOOHICKEY_VERBOSE) console.log(color.dim(`[${label}] ${line}`));
    }
  };
  child.stdout.on('data', handle);
  child.stderr.on('data', handle);
  child.on('exit', (code) => {
    if (!shuttingDown && code !== 0 && code !== null) {
      console.log(color.red(`\n${label} stopped (exit ${code}). Press Ctrl+C and run again.`));
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
  console.log(color.dim('\nStopping Doohickey…'));
  for (const c of children) c.kill();
  setTimeout(() => process.exit(0), 300);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// ---- 1. API server --------------------------------------------------------
start('api', 'npx', ['tsx', 'server/index.ts']);

// ---- 2. Web app (proxies /api to the API server) ----------------------------
let webReady = false;
start('web', 'npx', ['vite', '--host', '0.0.0.0', '--port', String(WEB_PORT)], {
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
${color.green(color.bold('Doohickey is running!'))}

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
