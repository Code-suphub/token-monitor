'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');


const { buildClaudeStatsGraph, dbPath } = require('../../src/shared/claudeTokenStats');
const { parseGraphResult, normalizeHistory } = require('../../src/shared/history');

function tempDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-token-stats-test-'));
  const dbPath = path.join(dir, 'token_stats.db');
  const db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      session_id TEXT NOT NULL,
      project TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      cache_create INTEGER NOT NULL DEFAULT 0,
      cache_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  const stmt = db.prepare('INSERT INTO tokens (date, session_id, project, model, input_tokens, output_tokens, cache_create, cache_read) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  stmt.run('2026-04-01', 's1', '/proj', 'opus', 100, 200, 0, 300);
  stmt.run('2026-04-01', 's1', '/proj', 'sonnet', 50, 0, 10, 0);
  stmt.run('2026-04-02', 's2', '/proj', 'opus', 1000, 500, 0, 0);
  stmt.run('2026-04-02', 's3', '/proj', 'haiku', 0, 0, 0, 0);
  stmt.run('2026-07-17', 's4', '/proj', 'sonnet', 5000, 2500, 100, 200);
  db.close();
  return { dir, dbPath };
}

function fakeHome(dbFile) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-fake-home-'));
  const statsDir = path.join(dir, '.claude', 'token-stats');
  fs.mkdirSync(statsDir, { recursive: true });
  fs.copyFileSync(dbFile, path.join(statsDir, 'token_stats.db'));
  return dir;
}

test('dbPath returns the expected location', () => {
  const p = dbPath('/home/user');
  assert.equal(p, path.join('/home', 'user', '.claude', 'token-stats', 'token_stats.db'));
});

test('buildClaudeStatsGraph returns null for a missing DB', () => {
  const result = buildClaudeStatsGraph({ homeDir: '/nonexistent-path-xyz' });
  assert.equal(result, null);
});

test('buildClaudeStatsGraph builds graph JSON from real DB', () => {
  const { dir, dbPath: dbFile } = tempDb();
  const home = fakeHome(dbFile);
  try {
    const result = buildClaudeStatsGraph({ homeDir: home });
    assert.ok(result, 'should return a graph object');
    assert.ok(Array.isArray(result.contributions), 'should have contributions array');
    assert.ok(result.contributions.length >= 3, 'should have entries for dates with data');

    // Day with multiple models
    const apr1 = result.contributions.find((c) => c.date === '2026-04-01');
    assert.ok(apr1, 'should have April 1');
    assert.ok(Array.isArray(apr1.clients), 'should have clients array');
    assert.equal(apr1.clients.length, 2, 'should have two client rows (one per model)');
    assert.equal(apr1.clients[0].client, 'claude');
    assert.equal(apr1.clients[0].tokens.reasoning, 0);

    // Verify token values for the opus model
    const opus = apr1.clients.find((c) => c.modelId === 'opus');
    assert.ok(opus, 'should have opus model entry');
    assert.equal(opus.tokens.input, 100);
    assert.equal(opus.tokens.output, 200);
    assert.equal(opus.tokens.cacheRead, 300);
    assert.equal(opus.tokens.cacheWrite, 0);

    // Sonnet has cache_write from cache_create
    const sonnet = apr1.clients.find((c) => c.modelId === 'sonnet');
    assert.equal(sonnet.tokens.cacheWrite, 10);
    assert.equal(sonnet.tokens.cacheRead, 0);

    // Day with only zero-value rows should be excluded
    const apr2 = result.contributions.find((c) => c.date === '2026-04-02');
    assert.ok(apr2, 'should have April 2 (has non-zero rows)');
    assert.equal(apr2.clients.length, 1, 'should only have the non-zero row');
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('buildClaudeStatsGraph respects sinceDate', () => {
  const { dir, dbPath: dbFile } = tempDb();
  const home = fakeHome(dbFile);
  try {
    const all = buildClaudeStatsGraph({ homeDir: home });
    const filtered = buildClaudeStatsGraph({ homeDir: home, sinceDate: '2026-07-01' });
    assert.ok(all.contributions.length > filtered.contributions.length, 'filtered should have fewer entries');
    assert.equal(filtered.contributions.length, 1);
    assert.equal(filtered.contributions[0].date, '2026-07-17');
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('buildClaudeStatsGraph output is compatible with parseGraphResult', () => {
  const { dir, dbPath: dbFile } = tempDb();
  const home = fakeHome(dbFile);
  try {
    const graph = buildClaudeStatsGraph({ homeDir: home });
    const parsed = parseGraphResult(graph);
    assert.ok(parsed.contributions.length >= 3);
    const apr1 = parsed.contributions.find((c) => c.date === '2026-04-01');
    assert.equal(apr1.tokens, 660); // 100+200+300+50+10
    assert.equal(apr1.perClient.claude.tokens, 660);
    assert.equal(apr1.perModel.opus.tokens, 600);
    assert.equal(apr1.perModel.sonnet.tokens, 60);
    assert.equal(apr1.messages, 0); // token_stats.db has no message count
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('buildClaudeStatsGraph output normalizes via normalizeHistory', () => {
  const { dir, dbPath: dbFile } = tempDb();
  const home = fakeHome(dbFile);
  try {
    const graph = buildClaudeStatsGraph({ homeDir: home });
    const history = normalizeHistory(parseGraphResult(graph), { todayKey: '2026-07-17', capDays: 370 });
    assert.ok(history.daily.length >= 3);
    assert.equal(history.summary.totalTokens, 9960); // 660+1500+7800
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
