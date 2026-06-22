'use strict';

const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { emptyPeriod, extractUsageFromTokscale, mergePeriods } = require('./usage');

const LXSS_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Lxss';

// Relative (Linux-style) paths under a WSL home. If any exists, a tracked client
// stores data there and the home is worth a tokscale scan. These mirror the roots
// tokscale 3.1.3 actually reads (incl. alternate roots: Claude transcripts, Kimi
// Code, legacy OpenClaw bot dirs) so a home holding only an alternate-root client
// is still discovered. The `.vscode-server` entries cover Cline / Kilo Code
// running through the VS Code WSL remote.
const WSL_DATA_MARKERS = [
  '.claude/projects',
  '.claude/transcripts',
  '.codex/sessions',
  '.local/share/opencode',
  '.openclaw/agents',
  '.clawdbot/agents',
  '.moltbot/agents',
  '.moldbot/agents',
  '.hermes',
  '.kimi/sessions',
  '.kimi-code/sessions',
  '.qwen/projects',
  '.grok/sessions',
  '.copilot/otel',
  '.config/Code/User/globalStorage/saoudrizwan.claude-dev/tasks',
  '.vscode-server/data/User/globalStorage/saoudrizwan.claude-dev/tasks',
  '.pi/agent/sessions',
  '.omp/agent/sessions',
  '.local/share/zed/threads/threads.db',
  '.config/Code/User/globalStorage/kilocode.kilo-code/tasks',
  '.vscode-server/data/User/globalStorage/kilocode.kilo-code/tasks'
];

// Clients whose tokscale `--home` scan can fall back to a HOST-native database
// that ignores `--home`, mapped to the WSL-home file whose presence suppresses
// that fallback. Only `zed` qualifies among tracked clients: tokscale 3.1.3's
// Windows build, even with `--home` (use_env_roots=false), unconditionally
// reads the host's %LOCALAPPDATA%\Zed\threads\threads.db when the WSL home has
// no Linux Zed DB (scanner.rs #[cfg(target_os="windows")] block, ignores
// use_env_roots). Passing `zed` to a home that lacks its own threads.db would
// re-read the host's native Zed usage once per such home and `mergePeriods`
// would add the duplicates — so we drop `zed` from a home's scan unless that
// exact file exists. tokscale checks the DB as a *file* (xdg.is_file()), so an
// empty `threads/` directory does NOT suppress the fallback; the gate is the
// file itself. (macOS has the same cfg fallback but no WSL scanning, so it can
// never double-count.) Every non-listed client is passed through untouched so
// tokscale's own alternate-root handling is preserved.
const WSL_HOST_FALLBACK_GATES = {
  zed: '.local/share/zed/threads/threads.db'
};

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

// Scope the requested client CSV for one WSL home: pass every client through
// untouched EXCEPT a host-fallback-gated client (zed) whose gate file is absent
// in this home — dropping it prevents tokscale from re-reading the host-native
// DB and double-counting (see WSL_HOST_FALLBACK_GATES). Returns a CSV string.
function clientsForHomeScan(clientsCsv, home, existsSync) {
  const requested = String(clientsCsv || '').split(',').map((c) => c.trim()).filter(Boolean);
  const kept = requested.filter((client) => {
    const gate = WSL_HOST_FALLBACK_GATES[client];
    if (!gate) return true; // not host-fallback-prone — always pass through
    return existsSync(`${home}\\${gate.replace(/\//g, '\\')}`);
  });
  return kept.join(',');
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
  const existsSync = deps.existsSync || fs.existsSync;
  const bundle = emptyWslBundle();
  if (!clients || typeof runTokscale !== 'function') return bundle;
  for (const home of wslUsageHomes(deps)) {
    // Pass the requested clients through, dropping only a host-fallback-gated
    // client (zed) whose gate file is missing here — otherwise tokscale's
    // Windows Zed scanner would re-read the host %LOCALAPPDATA% DB and
    // mergePeriods would add that native usage once per such home. An empty
    // result means the request was zed-only and this home has no WSL Zed DB, so
    // there's nothing to scan — skip rather than pass an empty --client
    // (tokscale would expand that to ALL clients).
    const homeClientsCsv = clientsForHomeScan(clients, home, existsSync);
    if (homeClientsCsv.length === 0) continue;
    try {
      // Serial on purpose (issue #15): never run these concurrently.
      const todayJson = await runTokscale({ clients: homeClientsCsv, flags: ['--today', '--home', home], commandTimeoutMs });
      const monthJson = await runTokscale({ clients: homeClientsCsv, flags: ['--month', '--home', home], commandTimeoutMs });
      const allTimeJson = await runTokscale({ clients: homeClientsCsv, flags: ['--since', allTimeSince, '--home', home], commandTimeoutMs });
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
  WSL_HOST_FALLBACK_GATES,
  clientsForHomeScan,
  collectWslUsage,
  emptyWslBundle,
  isWslInstalled,
  listRunningWslDistros,
  wslUsageHomes
};
