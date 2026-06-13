# Marketplace Promo Video

Code-driven marketplace screenshots and promo video for the **Power Toybox Deck**
Stream Deck plugin, built with [Remotion](https://www.remotion.dev/)
(React -> MP4).

Generated marketplace assets:

- `../marketplace/promo-thumbnail.png` - 1920x960 promo thumbnail
- `../marketplace/gallery-hero.png` - 1920x960 gallery image
- `../marketplace/gallery-property-inspector.png` - 1920x960 gallery image
- `../marketplace/gallery-sync.png` - 1920x960 gallery image
- `../marketplace/inspector-quick-access.png` - 960x1440 inspector screenshot
- `../marketplace/inspector-run.png` - 960x1440 inspector screenshot
- `../marketplace/inspector-keyboard.png` - 960x1440 inspector screenshot
- `../marketplace/promo.mp4` - 1920x1080 H.264 video, about 35 seconds

## Setup

```bash
npm install
```

The first render may download a Chromium Headless Shell used by Remotion.

## Commands

| Command | What it does |
|---|---|
| `npm run studio` | Open the live preview/editor at `localhost:3000` |
| `npm run render` | Render the video to `out/promo.mp4` |
| `npm run thumbnail` | Render the promo thumbnail to `out/promo-thumbnail.png` |
| `npm run hero` | Render the first gallery image to `out/gallery-hero.png` |
| `npm run property` | Render the Property Inspector gallery image to `out/gallery-property-inspector.png` |
| `npm run sync` | Render the automatic-sync gallery image to `out/gallery-sync.png` |
| `npm run stills` | Render all PNG stills |

Copy finished files from `out/` into `../marketplace/` before packaging or
submitting the listing.

## Storyboard

| Time | Beat |
|---|---|
| 0-5s | Product hero: Power Toybox Deck as a PowerToys companion |
| 5-12s | Drag the Toybox Command action and choose from the synchronized inspector |
| 12-20s | PowerToys settings change and the Stream Deck key updates |
| 20-28s | Run aliases, Command Palette entries and Keyboard Manager mappings |
| 28-31s | Feature grid summarizing supported PowerToys sources |
| 31-35s | Closing frame with plugin name and supported command groups |

## Structure

```text
src/
  Root.tsx               Remotion compositions for video and stills
  PowerToyboxPromo.tsx   Main timeline plus static marketplace frames
public/
  *.png                  Plugin icon, logo, action icon and key-state assets
  *.mp3                  Licensed music used by the promo video
  keys/*.png             Stream Deck key-state art
```

## Music

The promo video uses `powertoybox-mixkit-close-up.mp3`, copied from the
SecurePress promo pipeline:

- Track: `Close Up`
- Artist: `Michael Ramir C.`
- Source: `https://mixkit.co/free-stock-music/tag/technology/`
- License: `Mixkit Stock Music Free License`

