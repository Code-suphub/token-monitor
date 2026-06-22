'use strict';

const DEFAULT_CLIENTS = 'claude,codex,hermes,opencode,openclaw,cursor,antigravity,cline,kimi,qwen,grok,copilot,pi,zed,kilocode';

function normalizeClientsCsv(value) {
  return String(value ?? '').split(',').map((client) => client.trim().toLowerCase()).filter(Boolean).join(',');
}

function clientsCsvForSetting(value, fallback = DEFAULT_CLIENTS) {
  if (value === undefined || value === null) return normalizeClientsCsv(fallback);
  return normalizeClientsCsv(value);
}

module.exports = {
  DEFAULT_CLIENTS,
  clientsCsvForSetting,
  normalizeClientsCsv
};
