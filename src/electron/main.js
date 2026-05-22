'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow, ipcMain, nativeImage, screen, shell } = require('electron');
const { defaultDeviceId, loadDotEnv, pidFilePath } = require('../shared/config');
const { startCollector } = require('../shared/collector');
const { normalizeLimitsRefreshMs, parseBoolean, parseLimitProviders } = require('../shared/limitCollector');
const { aggregateDevices } = require('../shared/usage');
const { startDiscordRpc, stopDiscordRpc, updateDiscordRpc } = require('./discordRpc');
const { buildTrayIcon, createTray, formatTrayText, pickWorstLimit, popoverBounds } = require('./tray');

loadDotEnv();

const APP_NAME = 'Token Monitor';
const APP_ICON_PATH = path.join(__dirname, '..', '..', 'assets', 'icon.png');

const DEFAULT_WINDOW = { width: 360, height: 500 };
const WINDOW_LIMITS = { minWidth: 240, minHeight: 140, maxWidth: 1200, maxHeight: 1400 };
const ZOOM_LIMITS = { min: 0.7, max: 1.6, step: 0.1 };
const TRAY_CONTENT_VALUES = new Set(['cost', 'tokens', 'both', 'tokensAll', 'limit', 'icon']);

let mainWindow = null;
let settingsPath = null;
let settings = null;

app.setName(APP_NAME);
if (process.platform === 'win32') app.setAppUserModelId('com.javis.tokenmonitor');

function defaultSettings() {
  return {
    hubUrl: process.env.TOKEN_MONITOR_HUB_URL || '',
    secret: process.env.TOKEN_MONITOR_SECRET || '',
    alwaysOnTop: process.env.TOKEN_MONITOR_ALWAYS_ON_TOP !== '0',
    refreshMs: Number(process.env.TOKEN_MONITOR_WIDGET_REFRESH_MS || 15000),
    glassOpacity: 68,
    glassBlur: 32,
    systemGlass: true,
    showLiveDot: true,
    showToolIcons: true,
    discordRpcEnabled: false,
    deviceId: process.env.TOKEN_MONITOR_DEVICE_ID || defaultDeviceId(),
    lastPostedDeviceId: '',
    clients: process.env.TOKEN_MONITOR_CLIENTS || 'claude,codex,hermes,opencode,openclaw,cursor',
    allTimeSince: process.env.TOKEN_MONITOR_ALL_TIME_SINCE || '2024-01-01',
    limitsEnabled: parseBoolean(process.env.TOKEN_MONITOR_LIMITS_ENABLED, true),
    limitProviders: parseLimitProviders(process.env.TOKEN_MONITOR_LIMIT_PROVIDERS).join(','),
    limitsRefreshMs: normalizeLimitsRefreshMs(process.env.TOKEN_MONITOR_LIMITS_REFRESH_MS),
    showLimitSource: parseBoolean(process.env.TOKEN_MONITOR_SHOW_LIMIT_SOURCE, false),
    windowBounds: null,
    zoomFactor: 1,
    trayMode: false,
    trayContent: 'cost'
  };
}

function normalizeTrayContent(value, fallback = 'cost') {
  const v = String(value || '').trim();
  return TRAY_CONTENT_VALUES.has(v) ? v : fallback;
}

function clampZoom(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(ZOOM_LIMITS.max, Math.max(ZOOM_LIMITS.min, Number(n.toFixed(2))));
}

function isBoundsOnScreen(bounds) {
  if (!bounds || typeof bounds.x !== 'number' || typeof bounds.y !== 'number') return false;
  try {
    const display = screen.getDisplayMatching({
      x: bounds.x, y: bounds.y, width: bounds.width || 1, height: bounds.height || 1
    });
    const wa = display.workArea;
    return bounds.x + bounds.width > wa.x &&
      bounds.x < wa.x + wa.width &&
      bounds.y + bounds.height > wa.y &&
      bounds.y < wa.y + wa.height;
  } catch (_) { return false; }
}

function restoredBounds() {
  const saved = settings?.windowBounds;
  if (!saved || typeof saved.width !== 'number' || typeof saved.height !== 'number') return null;
  const width = Math.min(WINDOW_LIMITS.maxWidth, Math.max(WINDOW_LIMITS.minWidth, saved.width));
  const height = Math.min(WINDOW_LIMITS.maxHeight, Math.max(WINDOW_LIMITS.minHeight, saved.height));
  if (!isBoundsOnScreen({ ...saved, width, height })) return { width, height };
  return { x: saved.x, y: saved.y, width, height };
}

let persistBoundsTimer = null;
function stopPersistBoundsTimer() {
  if (persistBoundsTimer) clearTimeout(persistBoundsTimer);
  persistBoundsTimer = null;
}

function persistBoundsSoon() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized() || mainWindow.isFullScreen()) return;
  stopPersistBoundsTimer();
  persistBoundsTimer = setTimeout(() => {
    persistBoundsTimer = null;
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const next = mainWindow.getBounds();
    const prev = settings.windowBounds || {};
    if (settings?.trayMode) {
      // Popover x/y is anchored to the tray icon each open; only the size carries over.
      if (prev.width === next.width && prev.height === next.height) return;
      settings.windowBounds = { ...prev, width: next.width, height: next.height };
    } else {
      if (prev.x === next.x && prev.y === next.y && prev.width === next.width && prev.height === next.height) return;
      settings.windowBounds = next;
    }
    saveSettings();
  }, 400);
}

function applyZoomFactor(target = mainWindow) {
  if (!target || target.isDestroyed()) return;
  target.webContents.setZoomFactor(clampZoom(settings.zoomFactor));
}

function setZoomFactor(value) {
  const next = clampZoom(value);
  if (next === clampZoom(settings.zoomFactor)) return;
  settings.zoomFactor = next;
  saveSettings();
  applyZoomFactor();
}

function adjustZoom(delta) {
  setZoomFactor(clampZoom(settings.zoomFactor) + delta);
}

function readSettings() {
  settingsPath = path.join(app.getPath('userData'), 'settings.json');
  try {
    const defaults = defaultSettings();
    const saved = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    if (!saved.secret && defaults.secret) delete saved.secret;
    return { ...defaults, ...saved };
  }
  catch (_error) { return defaultSettings(); }
}

function saveSettings() {
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
}

function applyWindowSettings() {
  if (mainWindow) mainWindow.setAlwaysOnTop(Boolean(settings.alwaysOnTop), 'floating');
}

function nativeBlurEnabled(source = settings) {
  return source?.systemGlass !== false;
}

function keepNativeBlurActive() {
  if (!mainWindow) return;
  if (!nativeBlurEnabled()) return;
  if (process.platform === 'darwin' && typeof mainWindow.setVisualEffectState === 'function') {
    mainWindow.setVisualEffectState('active');
  }
}

function applyNativeMaterial(source = settings) {
  if (!mainWindow) return;
  const enabled = nativeBlurEnabled(source);
  if (process.platform === 'darwin' && typeof mainWindow.setVibrancy === 'function') {
    mainWindow.setVibrancy(enabled ? 'hud' : null);
    if (typeof mainWindow.setVisualEffectState === 'function') {
      mainWindow.setVisualEffectState(enabled ? 'active' : 'inactive');
    }
  }
  // Windows: backgroundMaterial is locked in at window creation. setBackgroundMaterial('none')
  // does not restore layered-window transparency once DWM SystemBackdrop has been engaged,
  // so toggling is handled by rebuildWindow() instead.
}

let mode = 'idle';
let localCollectorHandle = null;
let localDevice = null;
let localStats = null;
let sseAbortController = null;
let sseRetryTimer = null;
let streamConnected = false;
let syncCollectorHandle = null;
let tray = null;
let latestStats = null;
let suppressNextBlurHide = false;
const providerTrayIcons = {};
let defaultTrayIcon = null;
function getDefaultTrayIcon() {
  if (!defaultTrayIcon) defaultTrayIcon = buildTrayIcon();
  return defaultTrayIcon;
}
const AGENT_PID_PATH = pidFilePath();

function isExternalAgentActive() {
  try {
    const raw = fs.readFileSync(AGENT_PID_PATH, 'utf8').trim();
    const pid = parseInt(raw, 10);
    if (!pid || pid === process.pid) return false;
    process.kill(pid, 0);
    return true;
  } catch (_) { return false; }
}

async function deleteDeviceFromHub(deviceId) {
  const base = String(settings.hubUrl).replace(/\/$/, '');
  const response = await fetch(`${base}/api/devices/${encodeURIComponent(deviceId)}`, {
    method: 'DELETE',
    headers: settings.secret ? { authorization: `Bearer ${settings.secret}` } : {}
  });
  if (!response.ok && response.status !== 404) throw new Error(`DELETE ${response.status}`);
}

async function postToHub(summary) {
  const stale = settings.lastPostedDeviceId;
  if (stale && stale !== summary.deviceId) {
    try { await deleteDeviceFromHub(stale); }
    catch (error) { console.log(`[sync] cleanup of old deviceId ${stale} failed: ${error.message}`); }
  }
  const url = `${String(settings.hubUrl).replace(/\/$/, '')}/api/ingest`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(settings.secret ? { authorization: `Bearer ${settings.secret}` } : {}) },
    body: JSON.stringify(summary)
  });
  if (!response.ok) throw new Error(`Hub ${response.status}: ${(await response.text()).slice(0, 200)}`);
  if (settings.lastPostedDeviceId !== summary.deviceId) {
    settings.lastPostedDeviceId = summary.deviceId;
    saveSettings();
  }
  return response.json();
}

function stopSyncCollector() {
  if (syncCollectorHandle) { try { syncCollectorHandle.stop(); } catch (_) {} }
  syncCollectorHandle = null;
}

function startSyncCollector() {
  stopSyncCollector();
  if (!isHubConfigured()) return;
  syncCollectorHandle = startCollector({
    clients: settings.clients || 'claude,codex,hermes,opencode,openclaw,cursor',
    allTimeSince: settings.allTimeSince || '2024-01-01',
    commandTimeoutMs: 120 * 1000,
    deviceId: settings.deviceId || defaultDeviceId(),
    agentVersion: '0.1.0-widget',
    intervalMs: 5 * 60 * 1000,
    watchEnabled: true,
    watchDebounceMs: 1500,
    limitsEnabled: settings.limitsEnabled !== false,
    limitProviders: settings.limitProviders ?? 'claude,codex',
    limitsRefreshMs: normalizeLimitsRefreshMs(settings.limitsRefreshMs),
    onUpdate: (summary) => {
      if (isExternalAgentActive()) return;
      postToHub(summary).catch((error) => console.log(`[sync-collector] post failed: ${error.message}`));
    },
    onError: (error, reason) => console.log(`[sync-collector] ${reason}: ${error.message}`),
    logger: (msg) => console.log(`[sync-collector] ${msg}`)
  });
}

function isHubConfigured() {
  return Boolean(settings?.hubUrl && String(settings.hubUrl).trim());
}

function sendPush(payload) {
  if (payload?.data?.stats) {
    latestStats = payload.data.stats;
    updateTrayDisplay();
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    try { mainWindow.webContents.send('stats:push', payload); } catch (_) {}
  }
}

function updateTrayDisplay() {
  if (!tray || tray.isDestroyed()) return;
  const mode = settings?.trayContent || 'cost';
  const text = formatTrayText(latestStats, mode);
  if (process.platform === 'darwin') tray.setTitle(text);
  // Tooltip always shows a useful summary, even in icon-only mode where setTitle is blank.
  const tip = formatTrayText(latestStats, 'both');
  tray.setToolTip(`Token Monitor — ${tip}`);
  // Icon: provider logo in limit mode (when we have one), otherwise the app icon.
  let icon = null;
  if (mode === 'limit') {
    const worst = pickWorstLimit(latestStats);
    if (worst && providerTrayIcons[worst.provider]) icon = providerTrayIcons[worst.provider];
  }
  tray.setImage(icon || getDefaultTrayIcon());
}

function sendStatus(connected, extra) {
  streamConnected = Boolean(connected);
  sendPush({ event: 'status', data: { connected: streamConnected, mode, ...(extra || {}) } });
}

function stopLocalCollector() {
  if (localCollectorHandle) { try { localCollectorHandle.stop(); } catch (_) {} }
  localCollectorHandle = null;
  localDevice = null;
  localStats = null;
}

function startLocalCollector() {
  stopLocalCollector();
  mode = 'local';
  sendStatus(false, { reason: 'collecting' });
  localCollectorHandle = startCollector({
    clients: settings.clients || 'claude,codex,hermes,opencode,openclaw,cursor',
    allTimeSince: settings.allTimeSince || '2024-01-01',
    commandTimeoutMs: 120 * 1000,
    deviceId: settings.deviceId || defaultDeviceId(),
    agentVersion: '0.1.0',
    intervalMs: 5 * 60 * 1000,
    watchEnabled: true,
    watchDebounceMs: 1500,
    limitsEnabled: settings.limitsEnabled !== false,
    limitProviders: settings.limitProviders ?? 'claude,codex',
    limitsRefreshMs: normalizeLimitsRefreshMs(settings.limitsRefreshMs),
    onUpdate: (summary, reason) => {
      localDevice = { ...summary, receivedAt: new Date().toISOString() };
      localStats = aggregateDevices([localDevice], 0);
      updateDiscordRpc(localStats);
      sendPush({ event: 'stats', data: { type: 'stats', reason, stats: localStats, at: new Date().toISOString() } });
      sendStatus(true, { reason });
    },
    onError: (error, reason) => {
      sendStatus(false, { reason: `${reason}:${error.message}` });
    },
    logger: (msg) => console.log(`[collector] ${msg}`)
  });
}

function scheduleStreamRetry(delayMs = 3000) {
  if (sseRetryTimer) return;
  sseRetryTimer = setTimeout(() => { sseRetryTimer = null; startStatsStream(); }, delayMs);
}

function stopStatsStream() {
  if (sseAbortController) { try { sseAbortController.abort(); } catch (_) {} }
  sseAbortController = null;
  if (sseRetryTimer) { clearTimeout(sseRetryTimer); sseRetryTimer = null; }
}

function parseSseChunk(chunk) {
  let event = 'message';
  const dataLines = [];
  for (const line of chunk.split('\n')) {
    if (!line || line.startsWith(':')) continue;
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return null;
  try { return { event, data: JSON.parse(dataLines.join('\n')) }; } catch (_) { return null; }
}

async function startStatsStream() {
  stopStatsStream();
  if (!isHubConfigured()) return;
  mode = 'sync';
  const url = `${String(settings.hubUrl).replace(/\/$/, '')}/api/stats/stream`;
  const controller = new AbortController();
  sseAbortController = controller;
  try {
    const response = await fetch(url, {
      headers: { accept: 'text/event-stream', ...(settings.secret ? { authorization: `Bearer ${settings.secret}` } : {}) },
      signal: controller.signal
    });
    if (!response.ok || !response.body) {
      sendStatus(false, { code: response.status });
      scheduleStreamRetry();
      return;
    }
    sendStatus(true);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const chunk = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const parsed = parseSseChunk(chunk);
        if (parsed) {
          if (parsed.event === 'stats' && parsed.data?.stats) updateDiscordRpc(parsed.data.stats);
          sendPush(parsed);
        }
      }
    }
    sendStatus(false, { reason: 'eof' });
    scheduleStreamRetry();
  } catch (error) {
    if (controller.signal.aborted) return;
    sendStatus(false, { reason: error.message });
    scheduleStreamRetry();
  }
}

function showPopover() {
  if (!mainWindow || mainWindow.isDestroyed() || !tray) return;
  const current = mainWindow.getBounds();
  const target = popoverBounds(tray, current.width, current.height);
  mainWindow.setBounds(target);
  suppressNextBlurHide = true;
  mainWindow.show();
  mainWindow.focus();
  // The focus event itself may not fire a blur; the suppress flag covers the
  // case where macOS fires blur immediately after show because the click that
  // opened us still has the menu bar as the focused element.
  setTimeout(() => { suppressNextBlurHide = false; }, 250);
}

function hidePopover() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isVisible()) mainWindow.hide();
}

function togglePopover() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isVisible() && mainWindow.isFocused()) hidePopover();
  else showPopover();
}

function enterTrayMode() {
  if (tray && !tray.isDestroyed()) return;
  tray = createTray({
    onToggle: togglePopover,
    onQuit: requestAppQuit,
    onSwitchToWindowMode: () => {
      settings.trayMode = false;
      saveSettings();
      exitTrayMode();
      if (mainWindow && !mainWindow.isDestroyed()) {
        try { mainWindow.webContents.send('settings:push', settings); } catch (_) {}
      }
    }
  });
  updateTrayDisplay();
  if (process.platform === 'darwin' && app.dock) app.dock.hide();
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (typeof mainWindow.setSkipTaskbar === 'function') mainWindow.setSkipTaskbar(true);
    mainWindow.hide();
  }
}

function exitTrayMode() {
  if (tray && !tray.isDestroyed()) tray.destroy();
  tray = null;
  if (process.platform === 'darwin' && app.dock) app.dock.show();
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (typeof mainWindow.setSkipTaskbar === 'function') mainWindow.setSkipTaskbar(false);
    const restore = restoredBounds() || DEFAULT_WINDOW;
    mainWindow.setBounds({
      width: restore.width,
      height: restore.height,
      ...(typeof restore.x === 'number' ? { x: restore.x, y: restore.y } : {})
    });
    mainWindow.show();
    mainWindow.focus();
  }
}

function startMode() {
  if (isHubConfigured()) {
    stopLocalCollector();
    startStatsStream();
    startSyncCollector();
  } else {
    stopStatsStream();
    stopSyncCollector();
    startLocalCollector();
  }
}

function stopAll() {
  stopPersistBoundsTimer();
  stopLocalCollector();
  stopStatsStream();
  stopSyncCollector();
  stopDiscordRpc();
  if (tray && !tray.isDestroyed()) tray.destroy();
  tray = null;
}

let quitRequested = false;
function requestAppQuit() {
  if (quitRequested) return;
  quitRequested = true;
  stopAll();
  if (app.isReady()) app.quit();
  else app.exit(0);
}

async function fetchStats() {
  if (mode === 'local') {
    if (localStats) return localStats;
    return aggregateDevices(localDevice ? [localDevice] : [], 0);
  }
  const url = `${String(settings.hubUrl || '').replace(/\/$/, '')}/api/stats`;
  const response = await fetch(url, { headers: settings.secret ? { authorization: `Bearer ${settings.secret}` } : {} });
  if (!response.ok) throw new Error(`Hub ${response.status}: ${(await response.text()).slice(0, 200)}`);
  return response.json();
}

function revealWindow(target = mainWindow) {
  if (!target || target.isDestroyed() || target.isVisible()) return;
  target.show();
}

function loadWindowFile(target) {
  let revealed = false;
  const reveal = () => {
    if (revealed) return;
    revealed = true;
    if (settings?.trayMode) return; // stay hidden until tray click
    revealWindow(target);
  };
  const fallbackTimer = setTimeout(reveal, 2500);
  const cleanup = () => clearTimeout(fallbackTimer);
  target.once('show', cleanup);
  target.once('closed', cleanup);
  target.once('ready-to-show', reveal);
  target.webContents.once('did-finish-load', () => {
    applyZoomFactor(target);
    reveal();
  });
  target.webContents.once('did-fail-load', (_event, code, description) => {
    console.log(`[window] renderer load failed: ${code} ${description}`);
    reveal();
  });
  target.loadFile(path.join(__dirname, 'renderer', 'index.html')).catch((error) => {
    console.log(`[window] renderer load failed: ${error.message}`);
    reveal();
  });
}

function createWindow(boundsOverride) {
  if (!settings) settings = readSettings();
  const glass = nativeBlurEnabled();
  const bounds = boundsOverride || restoredBounds() || DEFAULT_WINDOW;
  const win = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    ...(typeof bounds.x === 'number' ? { x: bounds.x, y: bounds.y } : {}),
    ...WINDOW_LIMITS,
    frame: false,
    transparent: true,
    resizable: true,
    show: false,
    backgroundColor: '#00000000',
    icon: APP_ICON_PATH,
    ...(process.platform === 'darwin' && glass ? { vibrancy: 'hud', visualEffectState: 'active' } : {}),
    ...(process.platform === 'win32' && glass ? { backgroundMaterial: 'acrylic' } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow = win;
  if (settings.trayMode && typeof win.setSkipTaskbar === 'function') win.setSkipTaskbar(true);
  applyWindowSettings();
  applyNativeMaterial();
  keepNativeBlurActive();
  win.on('focus', keepNativeBlurActive);
  win.on('blur', () => {
    keepNativeBlurActive();
    if (settings?.trayMode && !suppressNextBlurHide && !quitRequested) hidePopover();
  });
  win.on('resized', persistBoundsSoon);
  win.on('moved', persistBoundsSoon);
  win.on('close', (event) => {
    if (settings?.trayMode && !quitRequested) {
      event.preventDefault();
      hidePopover();
    }
  });
  win.webContents.on('before-input-event', handleZoomShortcut);
  loadWindowFile(win);
}

function handleZoomShortcut(event, input) {
  if (input.type !== 'keyDown') return;
  if (!(input.control || input.meta)) return;
  const key = input.key;
  if (key === '=' || key === '+') { event.preventDefault(); adjustZoom(ZOOM_LIMITS.step); }
  else if (key === '-' || key === '_') { event.preventDefault(); adjustZoom(-ZOOM_LIMITS.step); }
  else if (key === '0') { event.preventDefault(); setZoomFactor(1); }
}

function rebuildWindow() {
  if (!mainWindow) return;
  const bounds = mainWindow.getBounds();
  const wasFocused = mainWindow.isFocused();
  const old = mainWindow;
  old.removeAllListeners('close');
  // Build the new window first so total window count never drops to 0
  // (otherwise window-all-closed fires and quits the app on Windows).
  createWindow(bounds);
  mainWindow.once('show', () => {
    if (!old.isDestroyed()) old.destroy();
    if (wasFocused && !mainWindow.isDestroyed()) mainWindow.focus();
  });
}

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) app.dock.setIcon(APP_ICON_PATH);
  createWindow();
  if (settings.trayMode) enterTrayMode();
  startMode();
  if (settings.discordRpcEnabled) startDiscordRpc();
  ipcMain.handle('settings:get', () => settings);
  ipcMain.handle('settings:update', (_event, patch) => {
    const previousSystemGlass = settings.systemGlass;
    const previousHubUrl = settings.hubUrl;
    const previousSecret = settings.secret;
    const previousDeviceId = settings.deviceId;
    const previousClients = settings.clients;
    const previousLimitsEnabled = settings.limitsEnabled;
    const previousLimitProviders = settings.limitProviders;
    const previousLimitsRefreshMs = settings.limitsRefreshMs;
    const previousDiscordRpcEnabled = settings.discordRpcEnabled;
    const previousTrayMode = settings.trayMode;
    const previousTrayContent = settings.trayContent;
    settings = {
      ...settings,
      ...patch,
      deviceId: (patch.deviceId !== undefined ? String(patch.deviceId).trim() : settings.deviceId) || defaultDeviceId(),
      refreshMs: Math.max(5000, Number(patch.refreshMs ?? settings.refreshMs ?? 15000)),
      glassOpacity: Math.max(0, Math.min(100, Number(patch.glassOpacity ?? settings.glassOpacity ?? 68))),
      glassBlur: Math.max(0, Math.min(100, Number(patch.glassBlur ?? settings.glassBlur ?? 32))),
      systemGlass: patch.systemGlass ?? settings.systemGlass ?? true,
      showLiveDot: patch.showLiveDot ?? settings.showLiveDot ?? true,
      showToolIcons: patch.showToolIcons ?? settings.showToolIcons ?? true,
      discordRpcEnabled: patch.discordRpcEnabled ?? settings.discordRpcEnabled ?? false,
      limitsEnabled: parseBoolean(patch.limitsEnabled ?? settings.limitsEnabled, true),
      limitProviders: patch.limitProviders !== undefined ? parseLimitProviders(patch.limitProviders).join(',') : settings.limitProviders,
      limitsRefreshMs: normalizeLimitsRefreshMs(patch.limitsRefreshMs ?? settings.limitsRefreshMs),
      showLimitSource: parseBoolean(patch.showLimitSource ?? settings.showLimitSource, false),
      zoomFactor: clampZoom(patch.zoomFactor ?? settings.zoomFactor),
      trayMode: parseBoolean(patch.trayMode ?? settings.trayMode, false),
      trayContent: normalizeTrayContent(patch.trayContent ?? settings.trayContent)
    };
    saveSettings();
    if (patch.zoomFactor !== undefined) applyZoomFactor();
    if (settings.discordRpcEnabled && !previousDiscordRpcEnabled) startDiscordRpc();
    else if (!settings.discordRpcEnabled && previousDiscordRpcEnabled) stopDiscordRpc();
    applyWindowSettings();
    if (process.platform === 'win32' && previousSystemGlass !== settings.systemGlass) {
      rebuildWindow();
    } else {
      applyNativeMaterial();
    }
    if (
      settings.hubUrl !== previousHubUrl ||
      settings.secret !== previousSecret ||
      settings.deviceId !== previousDeviceId ||
      settings.clients !== previousClients ||
      settings.limitsEnabled !== previousLimitsEnabled ||
      settings.limitProviders !== previousLimitProviders ||
      settings.limitsRefreshMs !== previousLimitsRefreshMs
    ) {
      startMode();
    }
    if (settings.trayMode !== previousTrayMode) {
      if (settings.trayMode) enterTrayMode();
      else exitTrayMode();
    } else if (settings.trayContent !== previousTrayContent) {
      updateTrayDisplay();
    }
    return settings;
  });
  ipcMain.handle('appearance:preview', (_event, patch) => {
    applyNativeMaterial({ ...settings, ...patch });
    if (patch && patch.zoomFactor !== undefined && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.setZoomFactor(clampZoom(patch.zoomFactor));
    }
    return true;
  });
  ipcMain.handle('tray:setIcons', (_event, icons) => {
    if (!icons || typeof icons !== 'object') return false;
    for (const [id, dataUrl] of Object.entries(icons)) {
      if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/png')) continue;
      const img = nativeImage.createFromDataURL(dataUrl);
      if (img.isEmpty()) continue;
      const sized = img.resize({ width: 18, height: 18, quality: 'best' });
      if (process.platform === 'darwin') sized.setTemplateImage(true);
      providerTrayIcons[id] = sized;
    }
    updateTrayDisplay();
    return true;
  });
  ipcMain.handle('stats:get', () => fetchStats());
  ipcMain.handle('stream:status', () => ({ connected: streamConnected, mode }));
  ipcMain.handle('app:openUserData', () => shell.openPath(app.getPath('userData')));
  ipcMain.on('window:minimize', () => {
    if (settings?.trayMode) hidePopover();
    else mainWindow?.minimize();
  });
  ipcMain.on('window:close', () => {
    if (settings?.trayMode) hidePopover();
    else mainWindow?.close();
  });
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { quitRequested = true; stopAll(); });
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.once(signal, requestAppQuit);
}
