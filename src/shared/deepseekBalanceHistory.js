'use strict';

const { readJson, writeJsonAtomic } = require('./config');

const RETENTION_MS = 40 * 24 * 60 * 60 * 1000;

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function startOfLocalDay(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfLocalMonth(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d.getTime();
}

function sameLocalDay(a, b) {
  const x = new Date(a);
  const y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

function sameLocalMonth(a, b) {
  const x = new Date(a);
  const y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth();
}

// snapshots: [{ ts: epochMs, paid: number }] — single currency.
// Spend = sum of paid drops (increases are top-ups -> 0), bucketed by interval-end local time.
function computeConsumption(snapshots, nowMs) {
  const sorted = [...(snapshots || [])]
    .map((s) => ({ ts: Number(s.ts), paid: Number(s.paid) }))
    .filter((s) => Number.isFinite(s.ts) && Number.isFinite(s.paid))
    .sort((a, b) => a.ts - b.ts);

  let todaySpend = 0;
  let monthSpend = 0;
  for (let i = 1; i < sorted.length; i += 1) {
    const drop = Math.max(0, sorted[i - 1].paid - sorted[i].paid);
    if (drop <= 0) continue;
    const ts = sorted[i].ts;
    if (sameLocalDay(ts, nowMs)) todaySpend += drop;
    if (sameLocalMonth(ts, nowMs)) monthSpend += drop;
  }

  const earliest = sorted.length ? sorted[0].ts : nowMs;
  return {
    todaySpend: round2(todaySpend),
    monthSpend: round2(monthSpend),
    monthSinceTracking: earliest > startOfLocalMonth(nowMs)
  };
}

// deps: { readJson, writeJsonAtomic } injectable for tests.
function recordConsumption({ accountKey, currency, paid, now, storePath }, deps = {}) {
  const read = deps.readJson || readJson;
  const write = deps.writeJsonAtomic || writeJsonAtomic;
  const store = read(storePath, {}) || {};

  let entry = store[accountKey];
  if (!entry || entry.currency !== currency) entry = { currency, snapshots: [] };

  entry.snapshots.push({ ts: Number(now), paid: Number(paid) });
  entry.snapshots = entry.snapshots
    .map((s) => ({ ts: Number(s.ts), paid: Number(s.paid) }))
    .filter((s) => Number.isFinite(s.ts) && Number.isFinite(s.paid) && s.ts >= Number(now) - RETENTION_MS)
    .sort((a, b) => a.ts - b.ts);
  entry.currency = currency;
  store[accountKey] = entry;

  write(storePath, store);
  return computeConsumption(entry.snapshots, Number(now));
}

module.exports = { computeConsumption, recordConsumption, round2, startOfLocalDay, startOfLocalMonth };
