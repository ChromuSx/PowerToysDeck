# PowerToys Deck Stream Deck Plugin

A Stream Deck plugin that mirrors Microsoft PowerToys commands from the current Windows user profile.

## Features

### PowerToys Catalog

- Reads PowerToys global settings and per-module settings from `%LOCALAPPDATA%\Microsoft\PowerToys`.
- Reads PowerToys Run plugin action keywords.
- Reads Command Palette aliases and command hotkeys.
- Reads Keyboard Manager key and shortcut mappings.
- Filters disabled PowerToys modules.

### Stream Deck Action

1. **PowerToys Command** - A single configurable action that resolves the latest command behavior at runtime.

### User Experience

- PowerToys-inspired Property Inspector.
- Search and grouped filters.
- Current key setup card with title controls.
- Automatic title and icon refresh.
- Missing-command state when saved items are no longer available.

## Requirements

- **OS**: Windows 10/11
- **PowerToys**: Installed and configured for the current user
- **Stream Deck**: Software version 6.9 or later
- **Node.js**: Version 20+ for development
- **.NET SDK**: Version 8+ for building the native bridge

The packaged plugin includes `PowerToysBridge.exe` as a self-contained native helper.

## Installation

### For Users

Releases are not published yet. For now, build locally and double-click the generated:

```text
com.chromusx.powertoys-deck.streamDeckPlugin
```

### For Developers

```powershell
cd streamdeck-plugin
npm install
npm run build
npm run package
```

## Usage

1. Drag `PowerToys Command` from Stream Deck actions to a key.
2. Use the Property Inspector to select a PowerToys command.
3. Adjust `Show title` or the custom key title if needed.
4. Press the Stream Deck key.

## Development

### Project Structure

```text
streamdeck-plugin/
├── src/
│   ├── plugin.ts                # Stream Deck WebSocket plugin runtime
│   ├── powertoys-scanner.ts     # PowerToys settings scanner/catalog builder
│   ├── powertoys-constants.ts   # Known PowerToys event names
│   ├── hotkeys.ts               # Hotkey normalization helpers
│   └── types.ts                 # Shared runtime/catalog types
├── native/
│   └── PowerToysBridge/         # Windows native helper for events, hotkeys, text
├── test/                        # Scanner tests with fixture-style JSON
├── ui/
│   └── property-inspector.html  # Property Inspector UI
├── imgs/                        # Plugin/action/key icons
├── scripts/
│   ├── copy-assets.js           # Build output copy step
│   ├── package-plugin.js        # Create .streamDeckPlugin package
│   ├── run-tests.js             # Test runner
│   └── validate-plugin.js       # Manifest/icon/package validation
├── manifest.json
├── package.json
└── tsconfig.json
```

### Build Commands

```powershell
npm run build          # Publish bridge, compile TypeScript, copy assets
npm run watch          # TypeScript watch mode
npm test               # Compile TypeScript and run tests
npm run validate       # Validate built .sdPlugin manifest and icons
npm run package        # Create .streamDeckPlugin
npm run build:package  # Build and package
```

## PowerToys Settings Read

Primary locations:

```text
%LOCALAPPDATA%\Microsoft\PowerToys\settings.json
%LOCALAPPDATA%\Microsoft\PowerToys\<Module>\settings.json
%LOCALAPPDATA%\Microsoft\PowerToys\PowerToys Run\settings.json
%LOCALAPPDATA%\Microsoft\PowerToys\Keyboard Manager\default.json
%LOCALAPPDATA%\Packages\Microsoft.CommandPalette_8wekyb3d8bbwe\LocalState\settings.json
```

## Native Helper

`PowerToysBridge.exe` supports:

- `signal <eventName>` - Signal a known PowerToys event.
- `hotkey <json|string>` - Send a keyboard shortcut.
- `text <value>` - Type text for PowerToys Run and Command Palette aliases.
- `list` - Diagnostic command.

## Troubleshooting

### Property Inspector shows no commands

- Open PowerToys once so settings files exist.
- Enable the modules you want to use.
- Press refresh in the Property Inspector.

### Hotkey does not run

- Confirm the PowerToys module is enabled.
- Confirm the shortcut is assigned in PowerToys.
- Check Stream Deck logs for bridge execution errors.

### Package validation fails

Run:

```powershell
npm run build
npm run validate
```

The validator checks required files, manifest format, icon dimensions, and multi-state action configuration.

## Important Notes

- Stream Deck profiles store only the selected `itemId` and title preferences.
- The command is resolved from current PowerToys settings at runtime.
- Stream Deck cannot automatically create new physical keys when PowerToys adds commands.
- Commands run with the same permissions as Stream Deck.

## License

MIT License. See [../LICENSE](../LICENSE).
