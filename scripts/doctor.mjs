#!/usr/bin/env node
// Checks what's ready for a test run and tells you what to fix. Run: npm run doctor
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const isWindows = process.platform === 'win32';
const ok = (msg) => console.log(`  \x1b[32m✔\x1b[0m ${msg}`);
const warn = (msg) => console.log(`  \x1b[33m!\x1b[0m ${msg}`);
const fix = (msg) => console.log(`      ${msg}`);

console.log('\nDoohav checkup\n');

// Node version
const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number);
const nodeOk = nodeMajor > 22 || (nodeMajor === 22 && nodeMinor >= 12);
nodeOk
  ? ok(`Node.js ${process.versions.node}`)
  : warn(`Node.js ${process.versions.node} is too old. Install Node 22 LTS from nodejs.org, then open a new terminal.`);

// .env file
if (existsSync('.env')) {
  ok('.env file found');
} else {
  warn('No .env file yet. Run: cp .env.example .env   (Windows: copy .env.example .env)');
}

// Which AI provider is selected
const env = existsSync('.env') ? readFileSync('.env', 'utf8') : '';
const provider = (env.match(/^AI_PROVIDER=(.*)$/m)?.[1] ?? 'ollama').trim().toLowerCase() || 'ollama';
const model = (env.match(/^OLLAMA_MODEL=(.*)$/m)?.[1] ?? 'qwen2.5vl:7b').trim() || 'qwen2.5vl:7b';

if (provider === 'gemini') {
  const key = (env.match(/^GEMINI_API_KEY=(.*)$/m)?.[1] ?? '').trim();
  key ? ok('Gemini selected and GEMINI_API_KEY is set') : warn('Gemini selected but GEMINI_API_KEY is empty. Add your free key to .env.');
} else {
  ok(`AI provider: Ollama (model ${model})`);
  try {
    const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    const names = (data.models ?? []).map((m) => m.name);
    const found = names.some((n) => n === model || (!model.includes(':') && n.split(':')[0] === model));
    if (found) {
      ok(`Ollama is running and has ${model}`);
    } else {
      warn(`Ollama is running, but ${model} is not downloaded.`);
      fix(`Run: ollama pull ${model}`);
    }
  } catch {
    warn("Ollama is not running. Open the Ollama app (or run 'ollama serve'). Barcode scans still work without it.");
    fix('Get Ollama from https://ollama.com if you have not installed it yet.');
  }
}

// Cloudflare tunnel for the phone
const cf = spawnSync('cloudflared', ['--version'], { shell: isWindows, stdio: 'ignore' });
if (cf.status === 0) {
  ok('cloudflared installed (phone camera will work through the tunnel)');
} else {
  warn('cloudflared not installed. Needed for the phone camera. Free, one-time install.');
  fix('macOS: brew install cloudflared     Windows: winget install --id Cloudflare.cloudflared');
}

console.log('\nNext: npm run dev (PC only)   or   npm run phone (PC + phone)\n');
