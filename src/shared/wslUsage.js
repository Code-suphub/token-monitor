'use strict';

const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { emptyPeriod, extractUsageFromTokscale, mergePeriods } = require('./usage');

const LXSS_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Lxss';

// Relative (Linux-style) paths under a WSL home. If any exists, a tracked client
// stores data there and the home is worth a tokscale scan. The `.vscode-server`
// entry covers Cline running through the VS Code WSL remote.
const WSL_DATA_MARKERS = [
  '.claude/projects',
  '.codex/sessions',
  '.local/share/opencode',
  '.openclaw/agents',
  '.hermes',
  '.kimi/sessions',
  '.qwen/projects',
  '.grok/sessions',
  '.copilot/otel',
  '.config/Code/User/globalStorage/saoudrizwan.claude-dev/tasks',
  '.vscode-server/data/User/globalStorage/saoudrizwan.claude-dev/tasks'
];

// Default command runner. reg output is ANSI/utf8; wsl.exe output is UTF-16LE.
// stdin is NUL ('ignore') so a non-WSL wsl.exe stub cannot block on "press any
// key to install"; a timeout backstops any hang.
function defaultExec(cmd, args) {
  const isWsl = /wsl(\.exe)?$/i.test(cmd);
  const out = execFileSync(cmd, args, {
    stdio: ['ignore', 'pipe', 'ignore'],
    timeout: 5000,
    windowsHide: true,
    encoding: 'buffer'
  });
  return Buffer.from(out).toString(isWsl ? 'utf16le' : 'utf8');
}

function emptyWslBundle() {
  return { today: emptyPeriod(), month: emptyPeriod(), allTime: emptyPeriod() };
}

// Install-proof gate: reg.exe is read-only and cannot trigger a WSL install. If
// the Lxss key is absent, reg exits non-zero and execFileSync throws -> false.
function isWslInstalled(deps = {}) {
  const platform = deps.platform || process.platform;
  if (platform !== 'win32') return false;
  const exec = deps.exec || defaultExec;
  try {
    exec('reg', ['query', LXSS_KEY]);
    return true;
  } catch (_) {
    return false;
  }
}

function listRunningWslDistros(deps = {}) {
  if (!isWslInstalled(deps)) return [];
  const exec = deps.exec || defaultExec;
  let out;
  try {
    out = exec('wsl.exe', ['--list', '--quiet', '--running']);
  } catch (_) {
    return [];
  }
  return String(out)
    .split(/\r?\n/)
    .map((line) => line.replace(/\u0000/g, '').trim())
    .filter(Boolean);
}

function homeHasData(home, existsSync) {
  return WSL_DATA_MARKERS.some((rel) => existsSync(`${home}\\${rel.replace(/\//g, '\\')}`));
}

function wslUsageHomes(deps = {}) {
  const readdirSync = deps.readdirSync || fs.readdirSync;
  const existsSync = deps.existsSync || fs.existsSync;
  const homes = [];
  for (const distro of listRunningWslDistros(deps)) {
    const candidates = [];
    const homeRoot = `\\\\wsl$\\${distro}\\home`;
    try {
      for (const user of readdirSync(homeRoot)) {
        candidates.push(`${homeRoot}\\${user}`);
      }
    } catch (_) { /* distro has no /home or it is unreadable */ }
    candidates.push(`\\\\wsl$\\${distro}\\root`);
    for (const home of candidates) {
      if (homeHasData(home, existsSync)) homes.push(home);
    }
  }
  return homes;
}

async function collectWslUsage(options = {}, deps = {}) {
  const { clients, allTimeSince, commandTimeoutMs, runTokscale, logger } = options;
  const bundle = emptyWslBundle();
  if (!clients || typeof runTokscale !== 'function') return bundle;
  for (const home of wslUsageHomes(deps)) {
    try {
      // Serial on purpose (issue #15): never run these concurrently.
      const todayJson = await runTokscale({ clients, flags: ['--today', '--home', home], commandTimeoutMs });
      const monthJson = await runTokscale({ clients, flags: ['--month', '--home', home], commandTimeoutMs });
      const allTimeJson = await runTokscale({ clients, flags: ['--since', allTimeSince, '--home', home], commandTimeoutMs });
      bundle.today = mergePeriods(bundle.today, extractUsageFromTokscale(todayJson));
      bundle.month = mergePeriods(bundle.month, extractUsageFromTokscale(monthJson));
      bundle.allTime = mergePeriods(bundle.allTime, extractUsageFromTokscale(allTimeJson));
    } catch (error) {
      if (typeof logger === 'function') logger(`wsl usage scan failed for ${home}: ${error.message}`);
    }
  }
  return bundle;
}

module.exports = {
  WSL_DATA_MARKERS,
  collectWslUsage,
  emptyWslBundle,
  isWslInstalled,
  listRunningWslDistros,
  wslUsageHomes
};
