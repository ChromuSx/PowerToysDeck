const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildPowerToysCatalog, findCatalogItem } = require('../bin/powertoys-scanner');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'power-toybox-deck-'));
const localAppData = path.join(tempRoot, 'LocalAppData');
const powertoysRoot = path.join(localAppData, 'Microsoft', 'PowerToys');
const cmdPalSettingsPath = path.join(tempRoot, 'CmdPal', 'settings.json');
const keyboardManagerPath = path.join(powertoysRoot, 'Keyboard Manager', 'default.json');

writeJson(path.join(powertoysRoot, 'settings.json'), {
  powertoys_version: 'v.test',
  enabled: {
    AdvancedPaste: true,
    AlwaysOnTop: true,
    CmdPal: true,
    ColorPicker: true,
    FancyZones: true,
    'Keyboard Manager': true,
    'PowerToys Run': true,
  },
  quick_access_shortcut: { win: true, ctrl: false, alt: false, shift: true, code: 81, key: '' },
});

writeJson(path.join(powertoysRoot, 'ColorPicker', 'settings.json'), {
  properties: {
    ActivationShortcut: { win: true, ctrl: false, alt: false, shift: true, code: 0, key: 'C' },
  },
});

writeJson(path.join(powertoysRoot, 'AlwaysOnTop', 'settings.json'), {
  properties: {
    hotkey: { value: { win: true, ctrl: true, alt: false, shift: false, code: 84, key: '' } },
  },
});

writeJson(path.join(powertoysRoot, 'PowerToys Run', 'settings.json'), {
  properties: {
    open_powerlauncher: { win: false, ctrl: false, alt: true, shift: false, code: 32, key: '' },
  },
  plugins: [
    {
      Id: 'calculator',
      Name: 'Calculator',
      Description: 'Calculate expressions',
      Disabled: false,
      ActionKeyword: '=',
      IconPathDark: '',
      IconPathLight: '',
    },
    {
      Id: 'emptyKeyword',
      Name: 'Fallback Launcher',
      Description: 'No direct keyword',
      Disabled: false,
      ActionKeyword: '',
      IconPathDark: '',
      IconPathLight: '',
    },
  ],
});

writeJson(cmdPalSettingsPath, commandPaletteSettings());
writeJson(keyboardManagerPath, keyboardManagerSettings());

const catalog = buildPowerToysCatalog({
  localAppData,
  powertoysRoot,
  cmdPalSettingsPath,
  now: new Date('2026-01-01T00:00:00Z'),
});

assert.strictEqual(catalog.version, 'v.test');
assert.strictEqual(catalog.availability.status, 'ready');
assert.strictEqual(catalog.availability.settingsPath, path.join(powertoysRoot, 'settings.json'));

const colorPicker = findCatalogItem(catalog, 'quick:ColorPicker');
assert.ok(colorPicker);
assert.strictEqual(colorPicker.hotkeyText, 'Win+Shift+C');
assert.strictEqual(colorPicker.execution.eventName.includes('ShowColorPickerEvent'), true);

const alwaysOnTop = findCatalogItem(catalog, 'hotkey:AlwaysOnTop:pin');
assert.ok(alwaysOnTop);
assert.strictEqual(alwaysOnTop.hotkeyText, 'Win+Ctrl+T');

const runCalculator = findCatalogItem(catalog, 'run:calculator');
assert.ok(runCalculator);
assert.strictEqual(runCalculator.keyword, '=');
assert.strictEqual(runCalculator.execution.inputText, '= ');
assert.strictEqual(runCalculator.execution.inputDelayMs, 700);

const emptyKeywordPlugin = findCatalogItem(catalog, 'run:emptyKeyword');
assert.strictEqual(emptyKeywordPlugin, undefined);

const cmdAlias = catalog.items.find((item) => item.id.startsWith('cmdpal:alias:') && item.keyword === 'file');
assert.ok(cmdAlias);
assert.strictEqual(cmdAlias.execution.inputText, 'file ');
assert.strictEqual(cmdAlias.execution.inputDelayMs, 700);

const cmdHotkey = catalog.items.find((item) => item.id.startsWith('cmdpal:command-hotkey:') && item.title === 'Demo Command');
assert.ok(cmdHotkey);
assert.strictEqual(cmdHotkey.hotkeyText, 'Win+Shift+D');

assert.strictEqual(catalog.items.some((item) => item.id.startsWith('cmdpal:pinned:')), false);

const keyRemap = catalog.items.find((item) => item.id.startsWith('kbm:key-remaps:') && item.hotkeyText === 'A');
assert.ok(keyRemap);
assert.strictEqual(keyRemap.description, 'B');

const modifierOnlyRemap = catalog.items.find((item) => item.id.startsWith('kbm:key-remaps:') && item.hotkeyText === 'Ctrl');
assert.ok(modifierOnlyRemap);
assert.strictEqual(modifierOnlyRemap.description, 'B');

const keyTextRemap = catalog.items.find((item) => item.id.startsWith('kbm:key-remaps-text:') && item.hotkeyText === 'C');
assert.ok(keyTextRemap);
assert.strictEqual(keyTextRemap.description, 'hello');

const keyboardMapping = catalog.items.find((item) => item.id.startsWith('kbm:global-shortcuts:') && item.description === 'Win+R');
assert.ok(keyboardMapping);
assert.strictEqual(keyboardMapping.hotkeyText, 'Ctrl+Alt+S');

writeJson(cmdPalSettingsPath, commandPaletteSettings({ fileAlias: 'files', commandHotkeyCode: 69 }));
writeJson(keyboardManagerPath, keyboardManagerSettings({ firstShortcutOriginal: '162;164;88', reverseShortcuts: true }));

const updatedCatalog = buildPowerToysCatalog({
  localAppData,
  powertoysRoot,
  cmdPalSettingsPath,
});

const updatedCmdAlias = updatedCatalog.items.find((item) => item.description === 'com.microsoft.indexer.fileSearch');
assert.ok(updatedCmdAlias);
assert.strictEqual(updatedCmdAlias.id, cmdAlias.id);
assert.strictEqual(updatedCmdAlias.keyword, 'files');
assert.strictEqual(updatedCmdAlias.execution.inputText, 'files ');

const updatedCmdHotkey = updatedCatalog.items.find((item) => item.title === 'Demo Command');
assert.ok(updatedCmdHotkey);
assert.strictEqual(updatedCmdHotkey.id, cmdHotkey.id);
assert.strictEqual(updatedCmdHotkey.hotkeyText, 'Win+Shift+E');

const updatedKeyboardMapping = updatedCatalog.items.find((item) => item.description === 'Win+R');
assert.ok(updatedKeyboardMapping);
assert.strictEqual(updatedKeyboardMapping.id, keyboardMapping.id);
assert.strictEqual(updatedKeyboardMapping.hotkeyText, 'Ctrl+Alt+X');

writeJson(cmdPalSettingsPath, commandPaletteSettings({ includeDuplicateAlias: true }));
writeJson(keyboardManagerPath, keyboardManagerSettings({ includeDuplicateTarget: true }));

const duplicateCatalog = buildPowerToysCatalog({
  localAppData,
  powertoysRoot,
  cmdPalSettingsPath,
});

const duplicateCommandAliases = duplicateCatalog.items.filter((item) => item.id.startsWith('cmdpal:alias:') && item.description === 'com.microsoft.indexer.fileSearch');
assert.strictEqual(duplicateCommandAliases.length, 2);
assert.strictEqual(new Set(duplicateCommandAliases.map((item) => item.id)).size, 2);

const duplicateTargetMappings = duplicateCatalog.items.filter((item) => item.id.startsWith('kbm:global-shortcuts:') && item.description === 'Win+R');
assert.strictEqual(duplicateTargetMappings.length, 2);
assert.strictEqual(new Set(duplicateTargetMappings.map((item) => item.id)).size, 2);

const missingGeneralRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'power-toybox-deck-missing-general-'));
const missingGeneralLocalAppData = path.join(missingGeneralRoot, 'LocalAppData');
const missingGeneralPowerToysRoot = path.join(missingGeneralLocalAppData, 'Microsoft', 'PowerToys');
const missingGeneralCmdPalSettingsPath = path.join(missingGeneralRoot, 'CmdPal', 'settings.json');

writeJson(path.join(missingGeneralPowerToysRoot, 'PowerToys Run', 'settings.json'), {
  plugins: [
    {
      Id: 'calculator',
      Name: 'Calculator',
      Disabled: false,
      ActionKeyword: '=',
    },
  ],
});
writeJson(missingGeneralCmdPalSettingsPath, {
  Hotkey: { win: true, ctrl: false, alt: true, shift: false, code: 32, key: '' },
  Aliases: {
    test: {
      CommandId: 'demo',
      Alias: 'test',
      IsDirect: true,
    },
  },
});

const missingGeneralCatalog = buildPowerToysCatalog({
  localAppData: missingGeneralLocalAppData,
  powertoysRoot: missingGeneralPowerToysRoot,
  cmdPalSettingsPath: missingGeneralCmdPalSettingsPath,
});

assert.strictEqual(missingGeneralCatalog.items.length, 0);
assert.strictEqual(missingGeneralCatalog.availability.status, 'not-found');
assert.strictEqual(missingGeneralCatalog.availability.settingsPath, path.join(missingGeneralPowerToysRoot, 'settings.json'));
assert.match(missingGeneralCatalog.availability.message, /not found/i);

fs.rmSync(tempRoot, { recursive: true, force: true });
fs.rmSync(missingGeneralRoot, { recursive: true, force: true });

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value), 'utf8');
}

function commandPaletteSettings(options = {}) {
  const fileAlias = options.fileAlias || 'file';
  const commandHotkeyCode = options.commandHotkeyCode || 68;
  return {
    Hotkey: { win: true, ctrl: false, alt: true, shift: false, code: 32, key: '' },
    Aliases: {
      '=': {
        CommandId: 'com.microsoft.cmdpal.calculator',
        Alias: '=',
        IsDirect: true,
      },
      [fileAlias]: {
        CommandId: 'com.microsoft.indexer.fileSearch',
        Alias: fileAlias,
        IsDirect: false,
      },
      ...(options.includeDuplicateAlias
        ? {
            find: {
              CommandId: 'com.microsoft.indexer.fileSearch',
              Alias: 'find',
              IsDirect: false,
            },
          }
        : {}),
    },
    PinnedCommands: [
      {
        ProviderId: 'com.microsoft.cmdpal.demo',
        CommandId: 'demo.command',
      },
    ],
    CommandHotkeys: [
      {
        ProviderId: 'com.microsoft.cmdpal.demo',
        CommandId: 'demo.command',
        Name: 'Demo Command',
        Hotkey: { win: true, ctrl: false, alt: false, shift: true, code: commandHotkeyCode, key: '' },
      },
    ],
  };
}

function keyboardManagerSettings(options = {}) {
  const firstShortcut = {
    originalKeys: options.firstShortcutOriginal || '162;164;83',
    newRemapKeys: '91;82',
  };
  const secondShortcut = {
    originalKeys: '162;164;68',
    newRemapKeys: options.includeDuplicateTarget ? '91;82' : '91;69',
  };
  const globalShortcuts = options.reverseShortcuts ? [secondShortcut, firstShortcut] : [firstShortcut, secondShortcut];

  return {
    remapKeys: {
      inProcess: [
        {
          originalKeys: '65',
          newRemapKeys: '66',
        },
        {
          originalKeys: '162',
          newRemapKeys: '66',
        },
      ],
    },
    remapKeysToText: {
      inProcess: [
        {
          originalKeys: '67',
          unicodeText: 'hello',
        },
      ],
    },
    remapShortcuts: {
      global: globalShortcuts,
      appSpecific: [],
    },
    remapShortcutsToText: {
      global: [],
      appSpecific: [],
    },
  };
}
