'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  isWslInstalled,
  listRunningWslDistros,
  emptyWslBundle,
  wslUsageHomes,
  collectWslUsage
} = require('../../src/shared/wslUsage');

test('isWslInstalled is false on non-win32 without calling exec', () => {
  let called = false;
  const ok = isWslInstalled({ platform: 'darwin', exec: () => { called = true; return ''; } });
  assert.equal(ok, false);
  assert.equal(called, false);
});

test('isWslInstalled false when reg query throws (key missing)', () => {
  const ok = isWslInstalled({ platform: 'win32', exec: () => { throw new Error('key not found'); } });
  assert.equal(ok, false);
});

test('isWslInstalled true when reg query succeeds', () => {
  const ok = isWslInstalled({ platform: 'win32', exec: () => 'HKEY_CURRENT_USER\\...\\Lxss\\{guid}' });
  assert.equal(ok, true);
});

test('listRunningWslDistros never calls wsl.exe when WSL not installed', () => {
  const calls = [];
  const out = listRunningWslDistros({
    platform: 'win32',
    exec: (cmd) => { calls.push(cmd); if (cmd === 'reg') throw new Error('missing'); return ''; }
  });
  assert.deepEqual(out, []);
  assert.deepEqual(calls, ['reg']); // reg only, wsl.exe never reached
});

test('listRunningWslDistros parses running names when installed', () => {
  const out = listRunningWslDistros({
    platform: 'win32',
    exec: (cmd) => (cmd === 'reg' ? 'Lxss' : 'Ubuntu\nDebian\n')
  });
  assert.deepEqual(out, ['Ubuntu', 'Debian']);
});

test('listRunningWslDistros returns [] when wsl.exe throws', () => {
  const out = listRunningWslDistros({
    platform: 'win32',
    exec: (cmd) => { if (cmd === 'reg') return 'Lxss'; throw new Error('boom'); }
  });
  assert.deepEqual(out, []);
});

test('emptyWslBundle has three empty periods', () => {
  const b = emptyWslBundle();
  assert.equal(b.today.totalTokens, 0);
  assert.equal(b.month.totalTokens, 0);
  assert.equal(b.allTime.totalTokens, 0);
});

test('wslUsageHomes keeps homes with a data marker, drops empty ones', () => {
  const homes = wslUsageHomes({
    platform: 'win32',
    exec: (cmd) => (cmd === 'reg' ? 'Lxss' : 'Ubuntu\n'),
    readdirSync: (dir) => {
      if (dir === '\\\\wsl$\\Ubuntu\\home') return ['alice', 'bob'];
      throw new Error('unreadable');
    },
    existsSync: (p) => p === '\\\\wsl$\\Ubuntu\\home\\alice\\.claude\\projects'
  });
  assert.deepEqual(homes, ['\\\\wsl$\\Ubuntu\\home\\alice']);
});

test('wslUsageHomes checks the root home too', () => {
  const homes = wslUsageHomes({
    platform: 'win32',
    exec: (cmd) => (cmd === 'reg' ? 'Lxss' : 'Debian\n'),
    readdirSync: () => [],
    existsSync: (p) => p === '\\\\wsl$\\Debian\\root\\.codex\\sessions'
  });
  assert.deepEqual(homes, ['\\\\wsl$\\Debian\\root']);
});

test('wslUsageHomes returns [] when no distro is running', () => {
  const homes = wslUsageHomes({
    platform: 'win32',
    exec: (cmd) => (cmd === 'reg' ? 'Lxss' : ''),
    readdirSync: () => [],
    existsSync: () => true
  });
  assert.deepEqual(homes, []);
});

function entriesJson(tokens) {
  return { entries: [{ client: 'claude', sessionId: 's1', model: 'claude-opus-4-8', input: tokens, output: 0, cost: 0 }] };
}

function tokscaleStub(map) {
  return async ({ flags }) => {
    const home = flags[flags.indexOf('--home') + 1];
    const period = flags.includes('--today') ? 'today' : flags.includes('--month') ? 'month' : 'allTime';
    return entriesJson(map[home][period]);
  };
}

test('collectWslUsage sums two homes per period', async () => {
  const deps = {
    platform: 'win32',
    exec: (cmd) => (cmd === 'reg' ? 'Lxss' : 'Ubuntu\n'),
    readdirSync: () => ['alice', 'bob'],
    existsSync: (p) => p.endsWith('\\.claude\\projects')
  };
  const map = {
    '\\\\wsl$\\Ubuntu\\home\\alice': { today: 10, month: 100, allTime: 1000 },
    '\\\\wsl$\\Ubuntu\\home\\bob': { today: 5, month: 50, allTime: 500 }
  };
  const bundle = await collectWslUsage(
    { clients: 'claude', allTimeSince: '2025-01-01', commandTimeoutMs: 1000, runTokscale: tokscaleStub(map) },
    deps
  );
  assert.equal(bundle.today.totalTokens, 15);
  assert.equal(bundle.month.totalTokens, 150);
  assert.equal(bundle.allTime.totalTokens, 1500);
  assert.deepEqual(bundle.today.clients, { claude: 15 });
});

test('collectWslUsage returns empty bundle when no homes', async () => {
  const bundle = await collectWslUsage(
    { clients: 'claude', allTimeSince: '2025-01-01', commandTimeoutMs: 1000, runTokscale: async () => ({}) },
    { platform: 'darwin' }
  );
  assert.equal(bundle.today.totalTokens, 0);
});

test('collectWslUsage logs and skips a home that throws, keeps others', async () => {
  const logs = [];
  const deps = {
    platform: 'win32',
    exec: (cmd) => (cmd === 'reg' ? 'Lxss' : 'Ubuntu\nDebian\n'),
    readdirSync: () => [],
    existsSync: (p) => p.endsWith('\\root\\.claude\\projects')
  };
  const runTokscale = async ({ flags }) => {
    const home = flags[flags.indexOf('--home') + 1];
    if (home.includes('Debian')) throw new Error('9p down');
    return entriesJson(7);
  };
  const bundle = await collectWslUsage(
    { clients: 'claude', allTimeSince: '2025-01-01', commandTimeoutMs: 1000, runTokscale, logger: (m) => logs.push(m) },
    deps
  );
  assert.equal(bundle.today.totalTokens, 7); // Ubuntu counted, Debian skipped
  assert.equal(logs.length, 1);
  assert.match(logs[0], /Debian/);
});
