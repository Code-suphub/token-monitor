'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const rendererDir = path.join(__dirname, '..', '..', 'src', 'electron', 'renderer');

function readRendererFile(name) {
  return fs.readFileSync(path.join(rendererDir, name), 'utf8');
}

function cssRule(source, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `${selector} rule should exist`);
  return match[1];
}

function declaration(rule, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = rule.match(new RegExp(`${escaped}\\s*:\\s*([^;]+);`));
  return match?.[1].trim() || '';
}

function functionBody(source, name, nextName) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} function should exist`);
  const end = source.indexOf(`function ${nextName}(`, start);
  assert.notEqual(end, -1, `${nextName} function should follow ${name}`);
  return source.slice(start, end);
}

function functionBodyBeforeMarker(source, name, marker) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} function should exist`);
  const end = source.indexOf(marker, start);
  assert.notEqual(end, -1, `${marker} marker should follow ${name}`);
  return source.slice(start, end);
}

test('Cursor account status stays inline with an email-only summary', () => {
  const html = readRendererFile('index.html');
  const toggle = html.match(/<button id="cursorSettingsToggle"[\s\S]*?<\/button>/)?.[0] || '';
  assert.match(
    toggle,
    /<span data-i18n="settings\.cursor\.title"[\s\S]*?<\/span>\s*<span class="cursor-settings-summary">[\s\S]*?<span id="cursorAccountStatus"[\s\S]*?<\/span>\s*<span class="cursor-disclosure-icon"/,
    'status pill and disclosure icon should stay on the title row'
  );
  assert.match(
    toggle,
    /<span class="cursor-disclosure-icon" aria-hidden="true"><\/span>/,
    'CSS chevron should not render on top of a text arrow'
  );

  const css = readRendererFile('styles.css');
  const toggleRule = cssRule(css, '.cursor-settings-toggle');
  assert.equal(declaration(toggleRule, 'flex-wrap'), '');

  const summaryRule = cssRule(css, '.settings-group-header .cursor-settings-summary');
  assert.equal(declaration(summaryRule, 'max-width'), '58%');

  const pillRule = cssRule(css, '.cursor-status-pill');
  assert.equal(declaration(pillRule, 'white-space'), 'nowrap');
  assert.equal(declaration(pillRule, 'overflow-wrap'), '');

  const iconRule = cssRule(css, '.cursor-disclosure-icon');
  assert.equal(declaration(iconRule, 'display'), 'inline-grid');
  assert.equal(declaration(iconRule, 'place-items'), 'center');
  assert.equal(declaration(iconRule, 'height'), '12px');
  assert.equal(declaration(iconRule, 'transform-origin'), 'center');
  assert.equal(declaration(iconRule, 'transform'), '');

  const expandedRule = cssRule(css, '.cursor-account-group.expanded .cursor-disclosure-icon');
  assert.equal(declaration(expandedRule, 'transform'), 'rotate(180deg)');
});

test('Cursor account header omits plan and reset details', () => {
  const body = functionBody(readRendererFile('app.js'), 'renderCursorStatus', 'refreshCursorStatus');
  assert.match(body, /const summary = status\.email \|\| t\('settings\.cursor\.loggedIn'\);/);
  assert.match(body, /setCursorStatusText\(statusEl, summary\);/);
  assert.doesNotMatch(body, /membershipType|billingCycleEnd|billingResets/);
});

test('OpenCode account panel mirrors Cursor linked-state controls', () => {
  const html = readRendererFile('index.html');
  const details = html.match(/<div id="opencodeSettingsDetails"[\s\S]*?<div id="opencodeErrorMessage" class="settings-note error hidden"><\/div>/)?.[0] || '';
  assert.match(details, /<button id="opencodeLogoutButton" class="hidden" data-i18n="settings\.common\.logout">/);
  assert.match(details, /<button id="opencodeRefreshButton" class="hidden" data-i18n="settings\.common\.refresh">/);
  assert.match(details, /<div id="opencodeManualPanel">[\s\S]*?<textarea id="opencodeCookieInput"/);
  assert.match(details, /data-i18n="settings\.opencode\.step3Before">Copy the<\/span> <code>auth<\/code> <span data-i18n="settings\.opencode\.step3After">value\.<\/span>/);
  assert.doesNotMatch(details, /Name\/Value columns/);
  assert.doesNotMatch(details, /auth=&lt;auth value&gt;/);
  assert.doesNotMatch(details, /oc_locale/);
  assert.doesNotMatch(details, /full Cookie header/);
  assert.match(details, /placeholder="auth=\.\.\."/);
  assert.match(details, /<div id="opencodeErrorMessage" class="settings-note error hidden"><\/div>/);

  const app = readRendererFile('app.js');
  const renderBody = functionBody(app, 'renderOpencodeStatus', 'refreshOpencodeStatus');
  assert.match(
    renderBody,
    /if \(status\.saveFailed\) \{[\s\S]*logoutBtn\.classList\.add\('hidden'\);[\s\S]*refreshBtn\.classList\.add\('hidden'\);[\s\S]*manualPanel\.classList\.remove\('hidden'\);/,
    'failed manual saves should not expose linked-account controls'
  );
  assert.match(renderBody, /t\('settings\.opencode\.statusLinked'\)/);
  assert.match(renderBody, /logoutBtn\.classList\.remove\('hidden'\)/);
  assert.match(renderBody, /refreshBtn\.classList\.remove\('hidden'\)/);
  assert.match(renderBody, /manualPanel\.classList\.add\('hidden'\)/);

  const setupBody = functionBodyBeforeMarker(app, 'setupCursorAccountUI', '\nsetupCursorAccountUI();');
  assert.match(setupBody, /window\.tokenMonitor\.openExternal\('https:\/\/opencode\.ai\/auth'\)/);
  assert.match(setupBody, /saveFailed: true/);
  assert.match(setupBody, /window\.tokenMonitor\.opencode\.logout\(\)/);
  assert.match(setupBody, /refreshOpencodeStatus\(\)/);
});

test('DeepSeek account panel provides a first-class API key entry', () => {
  const html = readRendererFile('index.html');
  const details = html.match(/<div id="deepseekSettingsDetails"[\s\S]*?<div id="deepseekErrorMessage" class="settings-note error hidden"><\/div>/)?.[0] || '';
  assert.match(details, /<button id="deepseekOpenBrowser"[\s\S]*data-i18n="settings\.deepseek\.openBrowser">/);
  assert.match(details, /<button id="deepseekLogoutButton" class="hidden" data-i18n="settings\.deepseek\.clearApiKey">/);
  assert.match(details, /<input id="deepseekApiKeyInput" type="password"[\s\S]*data-i18n-placeholder="settings\.deepseek\.apiKeyPlaceholder"/);
  assert.match(details, /<button id="deepseekApiKeySubmit"[\s\S]*data-i18n="settings\.deepseek\.saveApiKey">/);

  const app = readRendererFile('app.js');
  const setupBody = functionBodyBeforeMarker(app, 'setupCursorAccountUI', '\nsetupCursorAccountUI();');
  assert.match(setupBody, /window\.tokenMonitor\.openExternal\('https:\/\/platform\.deepseek\.com\/api_keys'\)/);
  assert.match(setupBody, /saveSettings\(\{ deepseekApiKey: input\.value \}\)/);
  assert.match(setupBody, /saveSettings\(\{ deepseekApiKey: '' \}\)/);
  assert.match(setupBody, /refreshStats\(\{ force: true \}\)/);
  const renderBody = functionBody(app, 'renderDeepseekStatus', 'renderOpencodeStatus');
  assert.match(renderBody, /const openBtn = document\.getElementById\('deepseekOpenBrowser'\);/);
  assert.match(renderBody, /const linked = deepseekAccountLinked\(\);/);
  assert.match(renderBody, /manualPanel\.classList\.toggle\('hidden', linked\)/);
  assert.match(renderBody, /openBtn\.classList\.toggle\('hidden', linked\)/);
  assert.match(renderBody, /logoutBtn\.classList\.toggle\('hidden', !linked \|\| source !== 'settings'\)/);
  assert.match(renderBody, /refreshBtn\.classList\.toggle\('hidden', !linked\)/);
});

test('DeepSeek account linked state requires a validated API key', () => {
  const app = readRendererFile('app.js');
  const summaryBody = functionBody(app, 'settingsSectionSummary', 'renderSettingsSummaries');
  assert.match(summaryBody, /const deepseekLinked = deepseekAccountLinked\(\);/);
  assert.doesNotMatch(
    summaryBody,
    /const deepseekLinked = Boolean\(state\.settings\?\.deepseekApiKeyConfigured\);/,
    'the account summary should not count an unverified stored API key as linked'
  );

  const linkedBody = functionBody(app, 'deepseekAccountLinked', 'deepseekProviderStatus');
  assert.match(linkedBody, /Boolean\(state\.settings\?\.deepseekApiKeyConfigured\)/);
  assert.match(linkedBody, /deepseekProviderForAccount\(\)/);
  assert.match(linkedBody, /provider\?\.status === 'ok'/);

  const renderBody = functionBody(app, 'renderDeepseekStatus', 'renderOpencodeStatus');
  assert.match(
    renderBody,
    /if \(linked\) \{[\s\S]*settings\.deepseek\.statusSet[\s\S]*\} else if \(provider\?\.status === 'unauthorized'\) \{/,
    'validated ok should be handled before invalid or pending states'
  );
});

test('DeepSeek key changes invalidate stale provider status before re-checking', () => {
  const app = readRendererFile('app.js');
  const setupBody = functionBodyBeforeMarker(app, 'setupCursorAccountUI', '\nsetupCursorAccountUI();');
  assert.match(setupBody, /markDeepseekKeyCheckPending\(\);[\s\S]*await saveSettings\(\{ deepseekApiKey: input\.value \}\);[\s\S]*renderDeepseekStatus\(\);[\s\S]*await refreshStats\(\{ force: true \}\);/);
  assert.match(setupBody, /await saveSettings\(\{ deepseekApiKey: '' \}\);[\s\S]*clearDeepseekPendingCheck\(\);[\s\S]*clearDeepseekProviderStatus\(\);[\s\S]*renderDeepseekStatus\(\);/);

  const pendingBody = functionBody(app, 'markDeepseekKeyCheckPending', 'clearDeepseekPendingCheck');
  assert.match(pendingBody, /state\.deepseekPendingCheckSince = Date\.now\(\);/);
  assert.match(pendingBody, /clearDeepseekProviderStatus\(\);/);

  const providerBody = functionBody(app, 'deepseekProviderForAccount', 'markDeepseekKeyCheckPending');
  assert.match(providerBody, /const pendingSince = Number\(state\.deepseekPendingCheckSince \|\| 0\);/);
  assert.match(providerBody, /Date\.parse\(provider\.updatedAt \|\| ''\)/);
  assert.match(providerBody, /updatedAt < pendingSince/);
  assert.match(providerBody, /state\.deepseekPendingCheckSince = 0;/);

  const clearBody = functionBody(app, 'clearDeepseekProviderStatus', 'renderDeepseekStatus');
  assert.match(clearBody, /state\.stats\.limits\.providers = state\.stats\.limits\.providers\.filter/);
  assert.match(clearBody, /provider\.provider !== 'deepseek'/);
});

test('DeepSeek account copy says browser and external URL is allowlisted', () => {
  const html = readRendererFile('index.html');
  const details = html.match(/<div id="deepseekSettingsDetails"[\s\S]*?<div id="deepseekErrorMessage" class="settings-note error hidden"><\/div>/)?.[0] || '';
  assert.match(details, /<button id="deepseekOpenBrowser"[\s\S]*data-i18n="settings\.deepseek\.openBrowser">/);

  const i18n = readRendererFile('i18n.js');
  assert.match(i18n, /'settings\.deepseek\.openBrowser': 'Open DeepSeek API keys in browser'/);
  assert.match(i18n, /'settings\.deepseek\.openBrowser': '在瀏覽器開啟 DeepSeek API 金鑰'/);
  assert.match(i18n, /'settings\.deepseek\.openBrowser': '在浏览器打开 DeepSeek API 密钥'/);

  const main = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'electron', 'main.js'), 'utf8');
  const allowlist = functionBody(main, 'isAllowedExternalUrl', 'revealWindow');
  assert.match(allowlist, /parsed\.hostname === 'platform\.deepseek\.com'/);

  const app = readRendererFile('app.js');
  const setupBody = functionBodyBeforeMarker(app, 'setupCursorAccountUI', '\nsetupCursorAccountUI();');
  assert.match(setupBody, /window\.tokenMonitor\.openExternal\('https:\/\/platform\.deepseek\.com\/api_keys'\)/);
});
