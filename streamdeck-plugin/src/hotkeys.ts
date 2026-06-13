import { HotkeySettings } from './types';

const VK_NAMES = new Map<number, string>([
  [0x08, 'Backspace'],
  [0x09, 'Tab'],
  [0x0d, 'Enter'],
  [0x1b, 'Esc'],
  [0x20, 'Space'],
  [0x21, 'PageUp'],
  [0x22, 'PageDown'],
  [0x23, 'End'],
  [0x24, 'Home'],
  [0x25, 'Left'],
  [0x26, 'Up'],
  [0x27, 'Right'],
  [0x28, 'Down'],
  [0x2e, 'Delete'],
  [0xba, ';'],
  [0xbb, '='],
  [0xbc, ','],
  [0xbd, '-'],
  [0xbe, '.'],
  [0xbf, '/'],
  [0xc0, '`'],
  [0xdb, '['],
  [0xdc, '\\'],
  [0xdd, ']'],
  [0xde, "'"],
]);

type ModifierKey = 'win' | 'ctrl' | 'alt' | 'shift';

const MODIFIER_CODES = new Map<number, ModifierKey>([
  [0x5b, 'win'],
  [0x5c, 'win'],
  [0x104, 'win'],
  [0x10, 'shift'],
  [0xa0, 'shift'],
  [0xa1, 'shift'],
  [0x11, 'ctrl'],
  [0xa2, 'ctrl'],
  [0xa3, 'ctrl'],
  [0x12, 'alt'],
  [0xa4, 'alt'],
  [0xa5, 'alt'],
]);

export function isHotkeySettings(value: unknown): value is HotkeySettings {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.win === 'boolean' ||
    typeof candidate.ctrl === 'boolean' ||
    typeof candidate.alt === 'boolean' ||
    typeof candidate.shift === 'boolean' ||
    typeof candidate.code === 'number' ||
    typeof candidate.key === 'string'
  );
}

export function unwrapHotkey(value: unknown): HotkeySettings | undefined {
  if (isHotkeySettings(value)) {
    return value;
  }

  if (value && typeof value === 'object' && 'value' in value) {
    const nested = (value as { value?: unknown }).value;
    if (isHotkeySettings(nested)) {
      return nested;
    }
  }

  return undefined;
}

export function isEmptyHotkey(hotkey: HotkeySettings | undefined): boolean {
  return !hotkey || (!hotkey.win && !hotkey.ctrl && !hotkey.alt && !hotkey.shift && !hotkey.code && !hotkey.key);
}

export function hotkeyToString(hotkey: HotkeySettings | undefined): string | undefined {
  if (isEmptyHotkey(hotkey)) {
    return undefined;
  }

  const parts: string[] = [];
  if (hotkey?.win) parts.push('Win');
  if (hotkey?.ctrl) parts.push('Ctrl');
  if (hotkey?.alt) parts.push('Alt');
  if (hotkey?.shift) parts.push('Shift');
  if (hotkey?.code && hotkey.code > 0) {
    parts.push(vkToString(hotkey.code));
  } else if (hotkey?.key) {
    parts.push(hotkey.key);
  }

  return parts.join('+');
}

export function vkToString(code: number): string {
  if (code >= 0x30 && code <= 0x39) {
    return String.fromCharCode(code);
  }

  if (code >= 0x41 && code <= 0x5a) {
    return String.fromCharCode(code);
  }

  if (code >= 0x70 && code <= 0x87) {
    return `F${code - 0x70 + 1}`;
  }

  return VK_NAMES.get(code) || `VK_${code}`;
}

export function getHotkeyAt(root: unknown, path: string[]): HotkeySettings | undefined {
  let current: unknown = root;
  for (const segment of path) {
    if (!current || typeof current !== 'object') {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return unwrapHotkey(current);
}

export function keyboardManagerKeysToHotkey(originalKeys: string | undefined): HotkeySettings | undefined {
  if (!originalKeys) return undefined;

  const hotkey: HotkeySettings = {};
  const codes = originalKeys
    .split(';')
    .map((part) => Number.parseInt(part, 10))
    .filter((code) => Number.isFinite(code) && code > 0);

  for (const code of codes) {
    const modifier = MODIFIER_CODES.get(code);
    if (modifier) {
      hotkey[modifier] = true;
    } else if (!hotkey.code) {
      hotkey.code = code;
    }
  }

  return isEmptyHotkey(hotkey) ? undefined : hotkey;
}

export function keyboardManagerKeysToString(originalKeys: string | undefined): string | undefined {
  const hotkey = keyboardManagerKeysToHotkey(originalKeys);
  if (hotkey) {
    return hotkeyToString(hotkey);
  }

  return undefined;
}
