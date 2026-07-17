'use strict';

const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function dbPath(homeDir = os.homedir()) {
  return path.join(homeDir, '.claude', 'token-stats', 'token_stats.db');
}

function buildClaudeStatsGraph(options = {}) {
  const homeDir = options.homeDir || os.homedir();
  const filePath = dbPath(homeDir);

  let stat;
  try { stat = fs.statSync(filePath); } catch { return null; }
  if (!stat.isFile()) return null;

  let db;
  try {
    db = new DatabaseSync(filePath, { readOnly: true });
  } catch {
    return null;
  }

  const sinceDate = options.sinceDate || (() => {
    const d = new Date();
    d.setDate(d.getDate() - 370);
    return d.toISOString().slice(0, 10);
  })();

  const contributions = [];
  try {
    const stmt = db.prepare(
      'SELECT date, model, input_tokens, output_tokens, cache_create, cache_read FROM tokens WHERE date >= ? ORDER BY date, model'
    );
    const rows = stmt.all(sinceDate);

    const byDate = new Map();
    for (const row of rows) {
      const input = Math.max(0, Math.round(Number(row.input_tokens || 0)));
      const output = Math.max(0, Math.round(Number(row.output_tokens || 0)));
      const cacheCreate = Math.max(0, Math.round(Number(row.cache_create || 0)));
      const cacheRead = Math.max(0, Math.round(Number(row.cache_read || 0)));
      if (input + output + cacheCreate + cacheRead === 0) continue;

      const date = String(row.date).slice(0, 10);
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date).push({
        client: 'claude',
        modelId: String(row.model || 'unknown').trim().toLowerCase() || 'unknown',
        providerId: 'anthropic',
        tokens: { input, output, cacheRead, cacheWrite: cacheCreate, reasoning: 0 },
        cost: 0,
        messages: 1
      });
    }

    for (const [date, clients] of byDate) {
      contributions.push({ date, clients });
    }
  } catch {
    return null;
  } finally {
    try { db.close(); } catch {}
  }

  return contributions.length ? { contributions } : null;
}

module.exports = { buildClaudeStatsGraph, dbPath };
