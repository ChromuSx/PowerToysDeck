import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { hotkeyToString, isEmptyHotkey, keyboardManagerKeysToHotkey, keyboardManagerKeysToString, getHotkeyAt, unwrapHotkey } from './hotkeys';
import { EVENTS, POWERTOYS_RUN_ICON_NAMES } from './powertoys-constants';
import { HotkeySettings, PowerToysCatalog, PowerToysExecution, PowerToysItem } from './types';

export interface BuildCatalogOptions {
  localAppData?: string;
  powertoysRoot?: string;
  cmdPalSettingsPath?: string;
  now?: Date;
}

interface ActionSpec {
  id: string;
  title: string;
  shortTitle?: string;
  group: string;
  source?: string;
  moduleName: string;
  settingsModule?: string;
  hotkeyPath?: string[];
  eventName?: string;
  iconModule?: string;
  description?: string;
}

const QUICK_ACCESS_SPECS: ActionSpec[] = [
  { id: 'quick:ColorPicker', title: 'Color Picker', group: 'Quick Access', moduleName: 'ColorPicker', hotkeyPath: ['properties', 'ActivationShortcut'], eventName: EVENTS.colorPicker },
  { id: 'quick:CmdPal', title: 'Command Palette', group: 'Quick Access', moduleName: 'CmdPal', eventName: EVENTS.cmdPal },
  { id: 'quick:EnvironmentVariables', title: 'Environment Variables', group: 'Quick Access', moduleName: 'EnvironmentVariables', eventName: EVENTS.environmentVariables, iconModule: 'EnvironmentVariables' },
  { id: 'quick:FancyZones', title: 'FancyZones Editor', group: 'Quick Access', moduleName: 'FancyZones', hotkeyPath: ['properties', 'fancyzones_editor_hotkey'], eventName: EVENTS.fancyZonesEditor },
  { id: 'quick:Hosts', title: 'Hosts File Editor', group: 'Quick Access', moduleName: 'Hosts', eventName: 'Local\\Hosts-ShowHostsEvent-5a0c0aae-5ff5-40f5-95c2-20e37ed671f0' },
  { id: 'quick:KeyboardManager', title: 'Keyboard Manager', group: 'Quick Access', moduleName: 'Keyboard Manager', eventName: EVENTS.keyboardManager },
  { id: 'quick:LightSwitch', title: 'Light Switch', group: 'Quick Access', moduleName: 'LightSwitch', hotkeyPath: ['properties', 'toggle-theme-hotkey'], eventName: EVENTS.lightSwitch },
  { id: 'quick:MouseWithoutBorders', title: 'Mouse Without Borders Reconnect', group: 'Quick Access', moduleName: 'MouseWithoutBorders', hotkeyPath: ['properties', 'ReconnectShortcut'], eventName: EVENTS.mouseWithoutBordersReconnect },
  { id: 'quick:PowerDisplay', title: 'PowerDisplay', group: 'Quick Access', moduleName: 'PowerDisplay', hotkeyPath: ['properties', 'activation_shortcut'], eventName: EVENTS.powerDisplay },
  { id: 'quick:PowerToysRun', title: 'PowerToys Run', group: 'Quick Access', moduleName: 'PowerToys Run', hotkeyPath: ['properties', 'open_powerlauncher'], eventName: EVENTS.powerLauncher },
  { id: 'quick:TextExtractor', title: 'Text Extractor', group: 'Quick Access', moduleName: 'TextExtractor', hotkeyPath: ['properties', 'ActivationShortcut'], eventName: EVENTS.textExtractor },
  { id: 'quick:RegistryPreview', title: 'Registry Preview', group: 'Quick Access', moduleName: 'RegistryPreview', eventName: EVENTS.registryPreview },
  { id: 'quick:MeasureTool', title: 'Screen Ruler', group: 'Quick Access', moduleName: 'Measure Tool', hotkeyPath: ['properties', 'ActivationShortcut'], eventName: EVENTS.measureTool },
  { id: 'quick:ShortcutGuide', title: 'Shortcut Guide', group: 'Quick Access', moduleName: 'Shortcut Guide', hotkeyPath: ['properties', 'open_shortcutguide'], eventName: EVENTS.shortcutGuide },
  { id: 'quick:Workspaces', title: 'Workspaces Editor', group: 'Quick Access', moduleName: 'Workspaces', hotkeyPath: ['properties', 'hotkey'], eventName: EVENTS.workspacesEditor },
];

const HOTKEY_SPECS: ActionSpec[] = [
  { id: 'hotkey:general:quick-access', title: 'PowerToys Quick Access', group: 'PowerToys Hotkeys', moduleName: 'General', settingsModule: '', hotkeyPath: ['quick_access_shortcut'], description: 'PowerToys tray Quick Access shortcut' },
  { id: 'hotkey:AdvancedPaste:ui', title: 'Advanced Paste UI', group: 'PowerToys Hotkeys', moduleName: 'AdvancedPaste', hotkeyPath: ['properties', 'advanced-paste-ui-hotkey'], eventName: EVENTS.advancedPasteUi, iconModule: 'AdvancedPaste' },
  { id: 'hotkey:AdvancedPaste:plain', title: 'Advanced Paste Plain Text', group: 'PowerToys Hotkeys', moduleName: 'AdvancedPaste', hotkeyPath: ['properties', 'paste-as-plain-hotkey'], iconModule: 'AdvancedPaste' },
  { id: 'hotkey:AdvancedPaste:markdown', title: 'Advanced Paste Markdown', group: 'PowerToys Hotkeys', moduleName: 'AdvancedPaste', hotkeyPath: ['properties', 'paste-as-markdown-hotkey'], iconModule: 'AdvancedPaste' },
  { id: 'hotkey:AdvancedPaste:json', title: 'Advanced Paste JSON', group: 'PowerToys Hotkeys', moduleName: 'AdvancedPaste', hotkeyPath: ['properties', 'paste-as-json-hotkey'], iconModule: 'AdvancedPaste' },
  { id: 'hotkey:AlwaysOnTop:pin', title: 'Always On Top Pin', group: 'PowerToys Hotkeys', moduleName: 'AlwaysOnTop', hotkeyPath: ['properties', 'hotkey'], eventName: EVENTS.alwaysOnTop },
  { id: 'hotkey:AlwaysOnTop:opacity-up', title: 'Always On Top Opacity Up', group: 'PowerToys Hotkeys', moduleName: 'AlwaysOnTop', hotkeyPath: ['properties', 'increase-opacity-hotkey'], eventName: EVENTS.alwaysOnTopIncreaseOpacity },
  { id: 'hotkey:AlwaysOnTop:opacity-down', title: 'Always On Top Opacity Down', group: 'PowerToys Hotkeys', moduleName: 'AlwaysOnTop', hotkeyPath: ['properties', 'decrease-opacity-hotkey'], eventName: EVENTS.alwaysOnTopDecreaseOpacity },
  { id: 'hotkey:CropAndLock:thumbnail', title: 'Crop And Lock Thumbnail', group: 'PowerToys Hotkeys', moduleName: 'CropAndLock', hotkeyPath: ['properties', 'thumbnail-hotkey'], eventName: EVENTS.cropAndLockThumbnail },
  { id: 'hotkey:CropAndLock:reparent', title: 'Crop And Lock Reparent', group: 'PowerToys Hotkeys', moduleName: 'CropAndLock', hotkeyPath: ['properties', 'reparent-hotkey'], eventName: EVENTS.cropAndLockReparent },
  { id: 'hotkey:CropAndLock:screenshot', title: 'Crop And Lock Screenshot', group: 'PowerToys Hotkeys', moduleName: 'CropAndLock', hotkeyPath: ['properties', 'screenshot-hotkey'], eventName: EVENTS.cropAndLockScreenshot },
  { id: 'hotkey:CursorWrap:toggle', title: 'Cursor Wrap', group: 'PowerToys Hotkeys', moduleName: 'CursorWrap', hotkeyPath: ['properties', 'activation_shortcut'], eventName: EVENTS.cursorWrap },
  { id: 'hotkey:FancyZones:next-tab', title: 'FancyZones Next Tab', group: 'PowerToys Hotkeys', moduleName: 'FancyZones', hotkeyPath: ['properties', 'fancyzones_nextTab_hotkey'] },
  { id: 'hotkey:FancyZones:prev-tab', title: 'FancyZones Previous Tab', group: 'PowerToys Hotkeys', moduleName: 'FancyZones', hotkeyPath: ['properties', 'fancyzones_prevTab_hotkey'] },
  { id: 'hotkey:FindMyMouse:activate', title: 'Find My Mouse', group: 'PowerToys Hotkeys', moduleName: 'FindMyMouse', hotkeyPath: ['properties', 'activation_shortcut'], eventName: EVENTS.findMyMouse },
  { id: 'hotkey:MouseHighlighter:activate', title: 'Mouse Highlighter', group: 'PowerToys Hotkeys', moduleName: 'MouseHighlighter', hotkeyPath: ['properties', 'activation_shortcut'], eventName: EVENTS.mouseHighlighter },
  { id: 'hotkey:MouseJump:activate', title: 'Mouse Jump', group: 'PowerToys Hotkeys', moduleName: 'MouseJump', hotkeyPath: ['properties', 'activation_shortcut'], eventName: EVENTS.mouseJump },
  { id: 'hotkey:MousePointerCrosshairs:activate', title: 'Mouse Pointer Crosshairs', group: 'PowerToys Hotkeys', moduleName: 'MousePointerCrosshairs', hotkeyPath: ['properties', 'activation_shortcut'], eventName: EVENTS.mouseCrosshairs },
  { id: 'hotkey:MouseWithoutBorders:toggle', title: 'Mouse Without Borders Toggle Easy Mouse', group: 'PowerToys Hotkeys', moduleName: 'MouseWithoutBorders', hotkeyPath: ['properties', 'ToggleEasyMouseShortcut'], eventName: EVENTS.mouseWithoutBordersToggle },
  { id: 'hotkey:MouseWithoutBorders:reconnect', title: 'Mouse Without Borders Reconnect', group: 'PowerToys Hotkeys', moduleName: 'MouseWithoutBorders', hotkeyPath: ['properties', 'ReconnectShortcut'], eventName: EVENTS.mouseWithoutBordersReconnect },
  { id: 'hotkey:Peek:activate', title: 'Peek', group: 'PowerToys Hotkeys', moduleName: 'Peek', hotkeyPath: ['properties', 'ActivationShortcut'], eventName: EVENTS.peek },
  { id: 'hotkey:Workspaces:launcher', title: 'Workspaces Launcher', group: 'PowerToys Hotkeys', moduleName: 'Workspaces', hotkeyPath: ['properties', 'hotkey'], eventName: EVENTS.workspacesHotkey },
  { id: 'hotkey:ZoomIt:zoom', title: 'ZoomIt Zoom', group: 'PowerToys Hotkeys', moduleName: 'ZoomIt', hotkeyPath: ['properties', 'toggle-key'], eventName: EVENTS.zoomItZoom },
  { id: 'hotkey:ZoomIt:draw', title: 'ZoomIt Draw', group: 'PowerToys Hotkeys', moduleName: 'ZoomIt', hotkeyPath: ['properties', 'draw-toggle-key'], eventName: EVENTS.zoomItDraw },
  { id: 'hotkey:ZoomIt:break', title: 'ZoomIt Break Timer', group: 'PowerToys Hotkeys', moduleName: 'ZoomIt', hotkeyPath: ['properties', 'break-timer-key'], eventName: EVENTS.zoomItBreak },
  { id: 'hotkey:ZoomIt:live', title: 'ZoomIt Live Zoom', group: 'PowerToys Hotkeys', moduleName: 'ZoomIt', hotkeyPath: ['properties', 'live-zoom-toggle-key'], eventName: EVENTS.zoomItLiveZoom },
  { id: 'hotkey:ZoomIt:snip', title: 'ZoomIt Snip', group: 'PowerToys Hotkeys', moduleName: 'ZoomIt', hotkeyPath: ['properties', 'snip-toggle-key'], eventName: EVENTS.zoomItSnip },
  { id: 'hotkey:ZoomIt:record', title: 'ZoomIt Record', group: 'PowerToys Hotkeys', moduleName: 'ZoomIt', hotkeyPath: ['properties', 'record-toggle-key'], eventName: EVENTS.zoomItRecord },
];

const POWERTOYS_INSTALL_URL = 'https://github.com/microsoft/PowerToys/releases';

export function buildPowerToysCatalog(options: BuildCatalogOptions = {}): PowerToysCatalog {
  const localAppData = options.localAppData || process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const rootPath = options.powertoysRoot || path.join(localAppData, 'Microsoft', 'PowerToys');
  const watchedFiles = new Set<string>();
  const items: PowerToysItem[] = [];

  const generalPath = path.join(rootPath, 'settings.json');
  const generalSettings = readJson(generalPath);
  addWatch(watchedFiles, generalPath);

  const readModuleSettings = (moduleName: string): unknown => {
    if (!moduleName) return generalSettings;
    const filePath = path.join(rootPath, moduleName, 'settings.json');
    addWatch(watchedFiles, filePath);
    return readJson(filePath);
  };

  const addSpec = (spec: ActionSpec): void => {
    if (spec.moduleName !== 'General' && !isModuleEnabled(generalSettings, spec.moduleName)) {
      return;
    }

    const settings = readModuleSettings(spec.settingsModule ?? spec.moduleName);
    const hotkey = spec.hotkeyPath ? getHotkeyAt(settings, spec.hotkeyPath) : undefined;
    const hasExecution = !!spec.eventName || !isEmptyHotkey(hotkey);
    if (!hasExecution) return;

    items.push(makeItem({
      id: spec.id,
      title: spec.title,
      shortTitle: spec.shortTitle,
      group: spec.group,
      source: spec.source || 'PowerToys',
      enabled: true,
      description: spec.description,
      hotkey,
      eventName: spec.eventName,
      iconPath: findModuleIcon(localAppData, spec.iconModule || spec.moduleName),
    }));
  };

  QUICK_ACCESS_SPECS.forEach(addSpec);
  HOTKEY_SPECS.forEach(addSpec);

  addCommandPaletteItems(items, watchedFiles, localAppData, generalSettings, options.cmdPalSettingsPath);
  addPowerToysRunItems(items, watchedFiles, rootPath, generalSettings);
  addKeyboardManagerItems(items, watchedFiles, rootPath, localAppData, generalSettings);

  return {
    generatedAt: (options.now || new Date()).toISOString(),
    rootPath,
    version: typeof generalSettings?.powertoys_version === 'string' ? generalSettings.powertoys_version : undefined,
    availability: powerToysAvailability(generalSettings, generalPath),
    watchedFiles: [...watchedFiles].sort(),
    items: dedupeItems(items).sort(compareItems),
  };
}

export function findCatalogItem(catalog: PowerToysCatalog, itemId: string | undefined): PowerToysItem | undefined {
  if (!itemId) return undefined;
  return catalog.items.find((item) => item.id === itemId);
}

function addCommandPaletteItems(
  items: PowerToysItem[],
  watchedFiles: Set<string>,
  localAppData: string,
  generalSettings: any,
  explicitSettingsPath?: string
): void {
  if (!isModuleEnabled(generalSettings, 'CmdPal')) {
    return;
  }

  const settingsPath = explicitSettingsPath || path.join(
    localAppData,
    'Packages',
    'Microsoft.CommandPalette_8wekyb3d8bbwe',
    'LocalState',
    'settings.json'
  );
  addWatch(watchedFiles, settingsPath);
  const settings = readJson(settingsPath);
  if (!settings) return;

  const hotkey = unwrapHotkey(settings.Hotkey);
  items.push(makeItem({
    id: 'cmdpal:open',
    title: 'Command Palette',
    group: 'Command Palette',
    source: 'Command Palette',
    enabled: true,
    hotkey,
    eventName: EVENTS.cmdPal,
    iconPath: findModuleIcon(localAppData, 'CmdPal'),
  }));

  const aliases = settings.Aliases;
  if (aliases && typeof aliases === 'object') {
    for (const value of Object.values(aliases as Record<string, any>)) {
      if (!value || typeof value !== 'object') continue;
      const alias = typeof value.Alias === 'string' ? value.Alias : undefined;
      const commandId = typeof value.CommandId === 'string' ? value.CommandId : undefined;
      if (!alias || !commandId) continue;
      const isDirect = value.IsDirect !== false;
      items.push(makeItem({
        id: `cmdpal:alias:${stableHash(commandId)}`,
        title: `Alias ${alias}`,
        shortTitle: alias,
        group: 'Command Palette',
        source: 'Command Palette',
        description: commandId,
        enabled: true,
        eventName: EVENTS.cmdPal,
        inputText: isDirect ? alias : `${alias} `,
        inputDelayMs: 700,
        keyword: alias,
        iconPath: findModuleIcon(localAppData, 'CmdPal'),
      }));
    }
  }

  const commandHotkeys = Array.isArray(settings.CommandHotkeys) ? settings.CommandHotkeys : [];
  commandHotkeys.forEach((command: unknown, index: number) => {
    const hotkey = findFirstHotkey(command);
    if (!hotkey) return;
    const label = findFirstString(command, ['Name', 'Title', 'CommandId', 'ProviderId']) || `Command Hotkey ${index + 1}`;
    const stableKey = commandPaletteCommandKey(command) || label;
    items.push(makeItem({
      id: `cmdpal:command-hotkey:${stableHash(stableKey)}`,
      title: label,
      group: 'Command Palette',
      source: 'Command Palette Hotkey',
      enabled: true,
      hotkey,
      iconPath: findModuleIcon(localAppData, 'CmdPal'),
    }));
  });
}

function addPowerToysRunItems(items: PowerToysItem[], watchedFiles: Set<string>, rootPath: string, generalSettings: any): void {
  if (!isModuleEnabled(generalSettings, 'PowerToys Run')) {
    return;
  }

  const settingsPath = path.join(rootPath, 'PowerToys Run', 'settings.json');
  addWatch(watchedFiles, settingsPath);
  const settings = readJson(settingsPath);
  if (!settings) return;

  const plugins = Array.isArray(settings.plugins) ? settings.plugins : [];
  for (const plugin of plugins) {
    if (!plugin || typeof plugin !== 'object' || plugin.Disabled === true) continue;
    const id = typeof plugin.Id === 'string' ? plugin.Id : stableHash(JSON.stringify(plugin));
    const name = typeof plugin.Name === 'string' ? plugin.Name : id;
    const keyword = typeof plugin.ActionKeyword === 'string' ? plugin.ActionKeyword.trim() : '';
    if (!keyword) continue;
    const iconPath = firstExistingPath([plugin.IconPathDark, plugin.IconPathLight]);

    items.push(makeItem({
      id: `run:${id}`,
      title: name,
      shortTitle: name,
      group: 'PowerToys Run',
      source: 'PowerToys Run',
      description: typeof plugin.Description === 'string' ? plugin.Description : undefined,
      enabled: true,
      eventName: EVENTS.powerLauncher,
      inputText: keyword ? (keyword.endsWith(' ') ? keyword : `${keyword} `) : undefined,
      inputDelayMs: 700,
      keyword,
      iconPath,
    }));
  }
}

function addKeyboardManagerItems(
  items: PowerToysItem[],
  watchedFiles: Set<string>,
  rootPath: string,
  localAppData: string,
  generalSettings: any
): void {
  if (!isModuleEnabled(generalSettings, 'Keyboard Manager')) {
    return;
  }

  const profilePath = path.join(rootPath, 'Keyboard Manager', 'default.json');
  addWatch(watchedFiles, profilePath);
  const profile = readJson(profilePath);
  if (!profile) return;

  const addMappings = (kind: string, mappings: unknown): void => {
    if (!Array.isArray(mappings)) return;
    mappings.forEach((mapping: any, index: number) => {
      const originalKeys = typeof mapping?.originalKeys === 'string' ? mapping.originalKeys : undefined;
      const hotkey = keyboardManagerKeysToHotkey(originalKeys);
      if (!hotkey) return;

      const original = keyboardManagerKeysToString(originalKeys) || 'Shortcut';
      const target = describeKeyboardManagerTarget(mapping);
      const targetApp = typeof mapping.targetApp === 'string' && mapping.targetApp ? ` (${mapping.targetApp})` : '';
      const stableKey = keyboardManagerMappingKey(kind, mapping, originalKeys);
      items.push(makeItem({
        id: `kbm:${kind}:${stableHash(stableKey)}`,
        title: `${original}${target ? ` -> ${target}` : ''}${targetApp}`,
        shortTitle: original,
        group: 'Keyboard Manager',
        source: 'Keyboard Manager',
        description: target || undefined,
        enabled: true,
        hotkey,
        iconPath: findModuleIcon(localAppData, 'Keyboard Manager'),
      }));
    });
  };

  addMappings('key-remaps', profile.remapKeys?.inProcess);
  addMappings('key-remaps-text', profile.remapKeysToText?.inProcess);
  addMappings('global-shortcuts', profile.remapShortcuts?.global);
  addMappings('app-shortcuts', profile.remapShortcuts?.appSpecific);
  addMappings('global-shortcuts-text', profile.remapShortcutsToText?.global);
  addMappings('app-shortcuts-text', profile.remapShortcutsToText?.appSpecific);
}

function makeItem(input: {
  id: string;
  title: string;
  shortTitle?: string;
  group: string;
  source: string;
  description?: string;
  enabled: boolean;
  hotkey?: HotkeySettings;
  eventName?: string;
  inputText?: string;
  inputDelayMs?: number;
  keyword?: string;
  iconPath?: string;
}): PowerToysItem {
  const execution: PowerToysExecution = {};
  if (input.eventName) execution.eventName = input.eventName;
  if (!isEmptyHotkey(input.hotkey)) execution.hotkey = input.hotkey;
  if (input.inputText) {
    execution.inputText = input.inputText;
    execution.inputDelayMs = input.inputDelayMs || 650;
  }

  return {
    id: input.id,
    title: input.title,
    shortTitle: compactTitle(input.shortTitle || input.title),
    group: input.group,
    source: input.source,
    description: input.description,
    enabled: input.enabled,
    hotkeyText: hotkeyToString(input.hotkey),
    keyword: input.keyword,
    iconPath: input.iconPath,
    execution,
  };
}

function isModuleEnabled(generalSettings: any, moduleName: string): boolean {
  if (moduleName === 'General') return !!generalSettings;
  if (!generalSettings?.enabled || typeof generalSettings.enabled !== 'object') return false;
  return generalSettings.enabled[moduleName] !== false;
}

function powerToysAvailability(generalSettings: any, settingsPath: string): PowerToysCatalog['availability'] {
  if (generalSettings) {
    return {
      status: 'ready',
      settingsPath,
      message: 'PowerToys settings loaded.',
      installUrl: POWERTOYS_INSTALL_URL,
    };
  }

  return {
    status: 'not-found',
    settingsPath,
    message: 'PowerToys settings were not found. Install or open PowerToys once, then refresh.',
    installUrl: POWERTOYS_INSTALL_URL,
  };
}

function readJson(filePath: string): any | undefined {
  try {
    if (!fs.existsSync(filePath)) return undefined;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return undefined;
  }
}

function addWatch(watchedFiles: Set<string>, filePath: string): void {
  watchedFiles.add(path.normalize(filePath));
}

function findModuleIcon(localAppData: string, moduleName: string): string | undefined {
  const iconName = POWERTOYS_RUN_ICON_NAMES[moduleName] || moduleName.replace(/\s+/g, '');
  const imageDir = path.join(localAppData, 'PowerToys', 'RunPlugins', 'PowerToys', 'Images');
  return firstExistingPath([
    path.join(imageDir, `${iconName}.png`),
    path.join(imageDir, 'PowerToys.dark.png'),
    path.join(imageDir, 'PowerToys.light.png'),
  ]);
}

function firstExistingPath(paths: unknown[]): string | undefined {
  for (const candidate of paths) {
    if (typeof candidate === 'string' && candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function stableHash(value: string): string {
  return crypto.createHash('sha1').update(value).digest('hex').slice(0, 12);
}

function compactTitle(title: string): string {
  return title
    .replace(/^PowerToys\s+/i, '')
    .replace(/\s+Editor$/i, '')
    .replace(/\s+/g, '\n')
    .slice(0, 48);
}

function dedupeItems(items: PowerToysItem[]): PowerToysItem[] {
  const result: PowerToysItem[] = [];
  const usedIds = new Set<string>();
  for (const item of items) {
    let uniqueItem = item;
    if (usedIds.has(item.id)) {
      uniqueItem = {
        ...item,
        id: uniqueCollisionId(item, usedIds),
      };
    }

    usedIds.add(uniqueItem.id);
    result.push(uniqueItem);
  }

  return result;
}

function uniqueCollisionId(item: PowerToysItem, usedIds: Set<string>): string {
  const seed = [
    item.group,
    item.source,
    item.title,
    item.hotkeyText || '',
    item.keyword || '',
    item.description || '',
    JSON.stringify(item.execution),
  ].join('|');
  const baseId = `${item.id}:${stableHash(seed)}`;
  let candidate = baseId;
  let counter = 2;

  while (usedIds.has(candidate)) {
    candidate = `${baseId}:${counter}`;
    counter += 1;
  }

  return candidate;
}

function compareItems(a: PowerToysItem, b: PowerToysItem): number {
  const group = a.group.localeCompare(b.group);
  if (group !== 0) return group;
  return a.title.localeCompare(b.title);
}

function findFirstHotkey(value: unknown): HotkeySettings | undefined {
  const direct = unwrapHotkey(value);
  if (direct) return direct;

  if (!value || typeof value !== 'object') return undefined;
  for (const child of Object.values(value as Record<string, unknown>)) {
    const found = findFirstHotkey(child);
    if (found) return found;
  }

  return undefined;
}

function findFirstString(value: unknown, keys: string[]): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    if (typeof record[key] === 'string') return record[key] as string;
  }

  for (const child of Object.values(record)) {
    const found = findFirstString(child, keys);
    if (found) return found;
  }

  return undefined;
}

function commandPaletteCommandKey(value: unknown): string | undefined {
  const providerId = findFirstString(value, ['ProviderId', 'ProviderID']);
  const commandId = findFirstString(value, ['CommandId', 'CommandID']);
  if (!providerId && !commandId) return undefined;
  return `${providerId || ''}:${commandId || ''}`;
}

function keyboardManagerMappingKey(kind: string, mapping: any, originalKeys: string | undefined): string {
  const targetApp = typeof mapping?.targetApp === 'string' ? mapping.targetApp : '';
  const target = firstString([
    mapping?.newRemapKeys,
    mapping?.unicodeText,
    mapping?.runProgramFilePath,
    mapping?.openUri,
  ]);
  return `${kind}:${targetApp}:${target || originalKeys || ''}`;
}

function firstString(values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value) return value;
  }

  return undefined;
}

function describeKeyboardManagerTarget(mapping: any): string {
  if (typeof mapping?.unicodeText === 'string' && mapping.unicodeText) {
    return mapping.unicodeText;
  }

  if (typeof mapping?.runProgramFilePath === 'string' && mapping.runProgramFilePath) {
    return path.basename(mapping.runProgramFilePath);
  }

  if (typeof mapping?.openUri === 'string' && mapping.openUri) {
    return mapping.openUri;
  }

  if (typeof mapping?.newRemapKeys === 'string' && mapping.newRemapKeys) {
    return keyboardManagerKeysToString(mapping.newRemapKeys) || mapping.newRemapKeys;
  }

  return '';
}
