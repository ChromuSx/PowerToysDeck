export interface HotkeySettings {
  win?: boolean;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  code?: number;
  key?: string;
}

export interface PowerToysExecution {
  eventName?: string;
  hotkey?: HotkeySettings;
  inputText?: string;
  inputDelayMs?: number;
}

export interface PowerToysItem {
  id: string;
  title: string;
  shortTitle: string;
  group: string;
  source: string;
  description?: string;
  enabled: boolean;
  hotkeyText?: string;
  keyword?: string;
  iconPath?: string;
  execution: PowerToysExecution;
}

export type PowerToysAvailabilityStatus = 'ready' | 'not-found';

export interface PowerToysAvailability {
  status: PowerToysAvailabilityStatus;
  settingsPath: string;
  message: string;
  installUrl: string;
}

export interface PowerToysCatalog {
  generatedAt: string;
  rootPath: string;
  version?: string;
  availability: PowerToysAvailability;
  watchedFiles: string[];
  items: PowerToysItem[];
}

export interface ActionSettings {
  itemId?: string;
  showTitle?: boolean;
  titleMode?: 'auto' | 'custom';
  customTitle?: string;
}
