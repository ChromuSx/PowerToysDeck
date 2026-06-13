import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import * as WebSocketLib from 'ws';
import { buildPowerToysCatalog, findCatalogItem } from './powertoys-scanner';
import { ActionSettings, PowerToysCatalog, PowerToysItem } from './types';

const execFileAsync = promisify(execFile);

let ws: WebSocketLib.WebSocket;
let catalog: PowerToysCatalog = buildPowerToysCatalog();
let refreshTimer: NodeJS.Timeout | undefined;
const settingsCache = new Map<string, ActionSettings>();
const executionLock = new Map<string, boolean>();
const watchedFiles = new Set<string>();
const imageCache = new Map<string, string>();

const pluginUUID = 'com.chromusx.power-toybox-deck';
const commandActionUUID = `${pluginUUID}.command`;

function connectElgatoStreamDeckSocket(
  inPort: string,
  inPluginUUID: string,
  inRegisterEvent: string,
  inInfo: string
) {
  ws = new WebSocketLib.WebSocket(`ws://127.0.0.1:${inPort}`);

  ws.on('open', () => {
    ws.send(JSON.stringify({ event: inRegisterEvent, uuid: inPluginUUID }));
    logMessage('Power Toybox Deck connected');
    refreshCatalogNow();
  });

  ws.on('message', (data: WebSocketLib.RawData) => {
    let message: any;
    try {
      message = JSON.parse(data.toString());
    } catch (error) {
      logMessage(`Invalid Stream Deck message: ${toErrorMessage(error)}`);
      return;
    }

    handleMessage(message).catch((error) => {
      logMessage(`Message error: ${toErrorMessage(error)}`);
    });
  });

  ws.on('error', (error: Error) => {
    console.error('WebSocket error:', error);
  });
}

async function handleMessage(message: any) {
  const { event, action, context, payload } = message;

  switch (event) {
    case 'keyDown':
      if (action === commandActionUUID) {
        const settings = resolveSettings(context, payload?.settings);
        await executeConfiguredItem(context, settings);
      }
      break;

    case 'didReceiveSettings':
      if (payload?.settings) {
        settingsCache.set(context, payload.settings);
        await refreshContext(context);
      }
      break;

    case 'willAppear':
      settingsCache.set(context, payload?.settings || {});
      await refreshContext(context);
      break;

    case 'willDisappear':
      settingsCache.delete(context);
      executionLock.delete(context);
      break;

    case 'sendToPlugin':
      await handlePropertyInspectorMessage(context, payload);
      break;
  }
}

async function handlePropertyInspectorMessage(context: string, payload: any) {
  if (payload?.type === 'getCatalog') {
    refreshCatalogNow(false);
    sendCatalogToPropertyInspector(context);
    return;
  }

  if (payload?.type === 'settingsChanged') {
    const settings: ActionSettings = payload.settings || {};
    settingsCache.set(context, settings);
    sendEvent('setSettings', context, settings);
    await refreshContext(context);
  }
}

function resolveSettings(context: string, payloadSettings?: ActionSettings): ActionSettings {
  if (payloadSettings && Object.keys(payloadSettings).length > 0) {
    settingsCache.set(context, payloadSettings);
  }

  return settingsCache.get(context) || payloadSettings || {};
}

async function executeConfiguredItem(context: string, settings: ActionSettings) {
  if (executionLock.get(context)) {
    logMessage('Action already in progress, ignoring button press');
    return;
  }

  if (!settings.itemId) {
    await refreshContext(context);
    showAlert(context);
    return;
  }

  const item = findCatalogItem(catalog, settings.itemId);
  if (!item) {
    if (isPowerToysUnavailable()) {
      await showPowerToysUnavailable(context, true);
    } else {
      await showMissing(context);
    }
    return;
  }

  executionLock.set(context, true);
  try {
    let eventError: unknown;
    if (item.execution.eventName) {
      try {
        await runBridge(['signal', item.execution.eventName]);
      } catch (error) {
        eventError = error;
        if (!item.execution.hotkey) {
          throw error;
        }

        logMessage(`Signal failed, falling back to hotkey: ${toErrorMessage(error)}`);
      }
    }

    if ((!item.execution.eventName || eventError) && item.execution.hotkey) {
      await runBridge(['hotkey', JSON.stringify(item.execution.hotkey)]);
    }

    if (item.execution.inputText) {
      await delay(item.execution.inputDelayMs || 650);
      await runBridge(['hotkey', 'Ctrl+A']);
      await delay(60);
      await runBridge(['text', item.execution.inputText]);
    }

    setState(context, 1);
    showOK(context);
    setTitle(context, 'OK');
    setTimeout(() => refreshContext(context).catch(() => undefined), 1200);
  } catch (error) {
    logMessage(`Execution failed for ${item.title}: ${toErrorMessage(error)}`);
    setState(context, 2);
    setTitle(context, 'Error');
    showAlert(context);
    setTimeout(() => refreshContext(context).catch(() => undefined), 2200);
  } finally {
    executionLock.set(context, false);
  }
}

function refreshCatalogNow(notifyContexts = true) {
  catalog = buildPowerToysCatalog();
  syncFileWatchers(catalog.watchedFiles);

  if (!notifyContexts) {
    return;
  }

  for (const context of settingsCache.keys()) {
    refreshContext(context).catch((error) => logMessage(`Refresh context failed: ${toErrorMessage(error)}`));
    sendCatalogToPropertyInspector(context);
  }
}

function scheduleCatalogRefresh() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }

  refreshTimer = setTimeout(() => {
    refreshCatalogNow();
  }, 250);
}

function syncFileWatchers(files: string[]) {
  for (const file of files) {
    const normalized = path.normalize(file);
    if (watchedFiles.has(normalized)) continue;
    watchedFiles.add(normalized);
    fs.watchFile(normalized, { interval: 1000 }, scheduleCatalogRefresh);
  }
}

async function refreshContext(context: string) {
  const settings = settingsCache.get(context) || {};
  const item = findCatalogItem(catalog, settings.itemId);

  if (!settings.itemId) {
    if (isPowerToysUnavailable()) {
      await showPowerToysUnavailable(context, false);
      return;
    }

    setState(context, 0);
    setTitle(context, 'Select\nPowerToys');
    await setImage(context, fallbackIconPath());
    return;
  }

  if (!item) {
    if (isPowerToysUnavailable()) {
      await showPowerToysUnavailable(context, false);
    } else {
      await showMissing(context);
    }
    return;
  }

  setState(context, 0);
  setTitle(context, titleForItem(item, settings));
  await setImage(context, item.iconPath || fallbackIconPath());
}

async function showMissing(context: string) {
  setState(context, 2);
  setTitle(context, 'Missing');
  await setImage(context, fallbackIconPath());
  showAlert(context);
}

async function showPowerToysUnavailable(context: string, alert: boolean) {
  setState(context, 2);
  setTitle(context, 'PowerToys\nmissing');
  await setImage(context, fallbackIconPath());
  if (alert) {
    showAlert(context);
  }
}

function isPowerToysUnavailable(): boolean {
  return catalog.availability?.status === 'not-found';
}

function sendCatalogToPropertyInspector(context: string) {
  sendToPropertyInspector(context, {
    type: 'catalog',
    catalog,
    settings: settingsCache.get(context) || {},
  });
}

async function runBridge(args: string[]) {
  const result = await execFileAsync(bridgePath(), args, {
    timeout: 8000,
    windowsHide: true,
  });

  if (result.stderr) {
    logMessage(result.stderr.trim());
  }

  return result.stdout;
}

function bridgePath(): string {
  return path.join(__dirname, '..', 'PowerToysBridge.exe');
}

async function setImage(context: string, filePath: string) {
  try {
    const image = imageFileToDataUri(filePath);
    sendEvent('setImage', context, { image });
  } catch (error) {
    logMessage(`Failed to set image: ${toErrorMessage(error)}`);
  }
}

function imageFileToDataUri(filePath: string): string {
  const normalized = path.normalize(filePath);
  const cached = imageCache.get(normalized);
  if (cached) return cached;

  const ext = path.extname(normalized).toLowerCase();
  const mime = ext === '.svg'
    ? 'image/svg+xml'
    : ext === '.ico'
      ? 'image/x-icon'
      : 'image/png';
  const data = fs.readFileSync(normalized).toString('base64');
  const uri = `data:${mime};base64,${data}`;
  imageCache.set(normalized, uri);
  return uri;
}

function fallbackIconPath(): string {
  return path.join(__dirname, '..', 'imgs', 'fallback.svg');
}

function setState(context: string, state: number) {
  sendEvent('setState', context, { state });
}

function setTitle(context: string, title: string) {
  sendEvent('setTitle', context, { title });
}

function titleForItem(item: PowerToysItem, settings: ActionSettings): string {
  if (settings.showTitle === false) {
    return '';
  }

  if (settings.titleMode === 'custom') {
    return settings.customTitle ?? '';
  }

  return item.shortTitle;
}

function showOK(context: string) {
  sendEvent('showOk', context);
}

function showAlert(context: string) {
  sendEvent('showAlert', context);
}

function logMessage(message: string) {
  sendEvent('logMessage', undefined, { message });
  console.log(message);
}

function sendToPropertyInspector(context: string, payload: any) {
  sendEvent('sendToPropertyInspector', context, payload, commandActionUUID);
}

function sendEvent(event: string, context?: string, payload?: any, action?: string) {
  const message: any = { event };
  if (context) message.context = context;
  if (action) message.action = action;
  if (payload !== undefined) message.payload = payload;
  if (ws && ws.readyState === WebSocketLib.WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return JSON.stringify(error);
}

export function startPluginFromArgs(argv: string[] = process.argv.slice(2)) {
  const params: { [key: string]: string } = {};

  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^-+/, '');
    const value = argv[i + 1];
    if (value) {
      params[key] = value;
    }
  }

  if (params.port && params.pluginUUID && params.registerEvent && params.info) {
    connectElgatoStreamDeckSocket(
      params.port,
      params.pluginUUID,
      params.registerEvent,
      params.info
    );
  } else {
    console.error('Missing required arguments:', params);
    process.exit(1);
  }
}

if (require.main === module) {
  startPluginFromArgs();
}
