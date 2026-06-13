# PowerToys Deck

PowerToys Deck is a Windows Stream Deck plugin for launching and mirroring Microsoft
PowerToys commands, shortcuts, Run aliases, Command Palette entries, and Keyboard
Manager mappings.

The plugin reads PowerToys settings from the local user profile and keeps configured
Stream Deck keys synchronized when PowerToys shortcuts, enabled modules, Run plugins,
Command Palette aliases, or Keyboard Manager mappings change.

## What It Syncs

- PowerToys Quick Access utilities.
- Global hotkeys from PowerToys modules.
- PowerToys Run plugin action keywords.
- Command Palette aliases and command hotkeys.
- Keyboard Manager key and shortcut mappings.

## Build

```powershell
cd streamdeck-plugin
dotnet publish native/PowerToysBridge/PowerToysBridge.csproj -c Release -r win-x64 --self-contained true
node .\node_modules\typescript\bin\tsc
node .\scripts\copy-assets.js
node .\scripts\package-plugin.js
```

The generated installer is:

```text
streamdeck-plugin/com.chromusx.powertoys-deck.streamDeckPlugin
```

## Requirements

- Windows 10 or Windows 11.
- Microsoft PowerToys installed.
- Stream Deck 6.9 or newer.
- Node.js runtime compatible with Stream Deck Node plugins.
- .NET SDK for building the native PowerToys bridge.
