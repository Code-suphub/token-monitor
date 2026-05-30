'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { exchangeRows, formatToolList } = require('../../src/electron/renderer/sessionDetail');

const detail = {
  found: true,
  exchanges: [
    {
      promptPreview: '重構 collector',
      startedAt: '2026-05-30T06:00:01.000Z',
      turnCount: 2,
      tools: ['Read', 'Bash'],
      tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, total: 150 },
      costEstimate: 0.3,
      turns: [
        { timestamp: '2026-05-30T06:00:02.000Z', tokens: { input: 100, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, total: 100 }, tools: ['Read'], costEstimate: 0.2 },
        { timestamp: '2026-05-30T06:00:03.000Z', tokens: { input: 50, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, total: 50 }, tools: ['Bash'], costEstimate: 0.1 }
      ]
    },
    {
      promptPreview: '',
      startedAt: '2026-05-30T06:00:05.000Z',
      turnCount: 1,
      tools: [],
      tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, total: 20 },
      costEstimate: 0.04,
      turns: [{ timestamp: '2026-05-30T06:00:05.000Z', tokens: { input: 20, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, total: 20 }, tools: [], costEstimate: 0.04 }]
    }
  ]
};

test('exchangeRows defaults to time desc (newest exchange first)', () => {
  const rows = exchangeRows(detail, { now: new Date(2026, 4, 30, 12, 0) });
  assert.equal(rows.length, 2);
  assert.equal(rows[0].title, '(session start)');     // startedAt 06:00:05 — newer
  assert.equal(rows[1].title, '重構 collector');       // startedAt 06:00:01 — older
  assert.equal(rows[0].isPrompt, false);
  assert.equal(rows[1].isPrompt, true);
  assert.equal(rows[1].turnCount, 2);
  assert.match(rows[1].subtitle, /2 turns/);
  assert.match(rows[1].subtitle, /2 tools/);
  // inner turns stay chronological (oldest first), not re-sorted
  assert.equal(rows[1].turns[0].value, 100);
  assert.equal(rows[1].turns[1].value, 50);
});

test('exchangeRows sorts by tokens when sortBy=tokens', () => {
  const rows = exchangeRows(detail, { now: new Date(2026, 4, 30, 12, 0), sortBy: 'tokens' });
  assert.equal(rows[0].title, '重構 collector');
  assert.equal(rows[0].value, 150);
  assert.equal(rows[1].value, 20);
});

test('formatToolList dedupes and truncates', () => {
  assert.equal(formatToolList(['Read', 'Read', 'Bash']), 'Read · Bash');
  assert.equal(formatToolList([]), '');
});
