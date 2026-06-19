'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { collectUsageOnce, localTodayKey } = require('../../src/shared/collector');
const { emptyPeriod } = require('../../src/shared/usage');

function bundleWith(clientTokens) {
  const mk = () => { const p = emptyPeriod(); p.totalTokens = clientTokens; p.clients = { gemini: clientTokens }; return p; };
  return { today: mk(), month: mk(), allTime: mk() };
}

// Stub tokscale so the Windows scan reports only claude usage.
async function windowsTokscale() {
  return { entries: [{ client: 'claude', sessionId: 's1', model: 'claude-opus-4-8', input: 20, output: 0, cost: 0 }] };
}

test('full tick merges WSL bundle and marks WSL-only client active', async () => {
  let anchorCaptured = null;
  const summary = await collectUsageOnce({
    clients: 'claude,gemini',
    allTimeSince: '2025-01-01',
    commandTimeoutMs: 1000,
    deviceId: 'dev1',
    limitsEnabled: false,
    runTokscale: windowsTokscale,
    collectWslUsage: async () => bundleWith(9),
    onAnchorComputed: (x) => { anchorCaptured = x; }
  });
  // merged totals: windows 20 + wsl 9
  assert.equal(summary.today.totalTokens, 29);
  assert.deepEqual(summary.today.clients, { claude: 20, gemini: 9 });
  // gemini has no Windows data dir but has WSL usage -> active
  assert.equal(summary.clientStatus.gemini, 'active');
  // anchor basis is Windows-only
  assert.equal(anchorCaptured.windowsPeriods.today.totalTokens, 20);
  assert.equal(anchorCaptured.wslBundle.today.totalTokens, 9);
});

test('watch tick reuses wslAnchor and does not rescan WSL', async () => {
  let wslCalls = 0;
  const anchor = { dateKey: localTodayKey(), today: emptyPeriod(), month: emptyPeriod(), allTime: emptyPeriod() };
  const summary = await collectUsageOnce({
    clients: 'claude,gemini',
    allTimeSince: '2025-01-01',
    commandTimeoutMs: 1000,
    deviceId: 'dev1',
    limitsEnabled: false,
    runTokscale: windowsTokscale,
    todayOnlyAnchor: anchor,
    wslAnchor: bundleWith(9),
    collectWslUsage: async () => { wslCalls += 1; return bundleWith(0); }
  });
  assert.equal(wslCalls, 0); // reused, not rescanned
  assert.equal(summary.today.clients.gemini, 9); // frozen WSL contribution present
});
