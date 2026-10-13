// Finds the cloudflared program, even when it isn't on PATH.
// winget on Windows often installs it without updating PATH, and editing a long PATH is painful.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const isWindows = process.platform === 'win32';

/** Where cloudflared might be: the CLOUDFLARED_PATH override, the PATH, then the usual install folders. */
export function cloudflaredCandidates() {
  const list = [];
  if (process.env.CLOUDFLARED_PATH) list.push(process.env.CLOUDFLARED_PATH);
  list.push('cloudflared');
  if (isWindows) {
    const pf = process.env.ProgramFiles || 'C:\\Program Files';
    const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const local = process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local');
    list.push(
      join(pf, 'cloudflared', 'cloudflared.exe'),
      join(pf86, 'cloudflared', 'cloudflared.exe'),
      join(local, 'Microsoft', 'WinGet', 'Links', 'cloudflared.exe'),
    );
  } else {
    list.push('/opt/homebrew/bin/cloudflared', '/usr/local/bin/cloudflared');
  }
  return list;
}

/** The first working cloudflared command, or null. */
export function findCloudflared() {
  for (const cmd of cloudflaredCandidates()) {
    if (cmd !== 'cloudflared' && !existsSync(cmd)) continue;
    if (spawnSync(cmd, ['--version'], { stdio: 'ignore' }).status === 0) return cmd;
  }
  return null;
}
