const fs = require('fs');
const path = require('path');

const DEFAULT_PLUGIN_DIR = 'com.chromusx.power-toybox-deck.sdPlugin';
const MINIMUM_SOFTWARE_VERSIONS = ['6.4', '6.5', '6.6', '6.7', '6.8', '6.9', '7.0', '7.1', '7.2', '7.3', '7.4'];

function validatePlugin(pluginDir = DEFAULT_PLUGIN_DIR) {
  const errors = [];
  const manifestPath = path.join(pluginDir, 'manifest.json');
  const manifest = readJson(manifestPath, errors);
  if (!manifest) {
    report(errors);
  }

  requireFile(pluginDir, 'bin/plugin.js', errors);
  requireFile(pluginDir, 'ui/property-inspector.html', errors);
  requireFile(pluginDir, 'PowerToysBridge.exe', errors);
  requireFile(pluginDir, 'node_modules/ws/index.js', errors);

  checkString(manifest.Name, 'Manifest.Name', errors);
  checkString(manifest.Author, 'Manifest.Author', errors);
  checkString(manifest.Description, 'Manifest.Description', errors);
  checkReverseDns(manifest.UUID, 'Manifest.UUID', errors);
  checkVersion(manifest.Version, errors);

  if (![2, 3].includes(manifest.SDKVersion)) {
    errors.push('Manifest.SDKVersion must be 2 or 3.');
  }

  if (!manifest.Software || !MINIMUM_SOFTWARE_VERSIONS.includes(manifest.Software.MinimumVersion)) {
    errors.push('Manifest.Software.MinimumVersion is not a documented Stream Deck version.');
  }

  if (manifest.SupportURL && compareVersions(manifest.Software.MinimumVersion, '6.9') < 0) {
    errors.push('Manifest.SupportURL requires Software.MinimumVersion 6.9 or newer.');
  }

  checkImageSet(pluginDir, manifest.Icon, 'Manifest.Icon', 256, 512, errors);
  if (manifest.CategoryIcon) {
    checkImageSet(pluginDir, manifest.CategoryIcon, 'Manifest.CategoryIcon', 28, 56, errors);
  }

  if (!Array.isArray(manifest.Actions) || manifest.Actions.length === 0) {
    errors.push('Manifest.Actions must contain at least one action.');
  } else {
    for (const action of manifest.Actions) {
      checkString(action.Name, `Action ${action.UUID || '<missing>'}.Name`, errors);
      checkReverseDns(action.UUID, `Action ${action.Name || '<missing>'}.UUID`, errors);
      if (manifest.UUID && action.UUID && !action.UUID.startsWith(`${manifest.UUID}.`)) {
        errors.push(`Action ${action.UUID} should be prefixed with the plugin UUID.`);
      }

      checkImageSet(pluginDir, action.Icon, `Action ${action.UUID}.Icon`, 20, 40, errors);

      if (!Array.isArray(action.States) || action.States.length === 0) {
        errors.push(`Action ${action.UUID} must define at least one state.`);
      } else {
        if (action.States.length > 1 && action.DisableAutomaticStates !== true) {
          errors.push(`Action ${action.UUID} has multiple states; set DisableAutomaticStates to true when the plugin controls states.`);
        }

        action.States.forEach((state, index) => {
          checkImageSet(pluginDir, state.Image, `Action ${action.UUID}.States[${index}].Image`, 72, 144, errors);
        });
      }

      if (action.PropertyInspectorPath) {
        checkHtmlPath(pluginDir, action.PropertyInspectorPath, `Action ${action.UUID}.PropertyInspectorPath`, errors);
      }
    }
  }

  if (manifest.PropertyInspectorPath) {
    checkHtmlPath(pluginDir, manifest.PropertyInspectorPath, 'Manifest.PropertyInspectorPath', errors);
  }

  report(errors);
  console.log('Plugin validation OK.');
}

function readJson(filePath, errors) {
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing required file: ${filePath}`);
    return undefined;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    errors.push(`Invalid JSON in ${filePath}: ${error.message}`);
    return undefined;
  }
}

function checkString(value, label, errors) {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${label} must be a non-empty string.`);
  }
}

function checkReverseDns(value, label, errors) {
  if (typeof value !== 'string' || !/^([a-z0-9-]+)(\.[a-z0-9-]+)+$/.test(value)) {
    errors.push(`${label} must use reverse-DNS format with lowercase letters, digits, hyphens, and periods.`);
  }
}

function checkVersion(value, errors) {
  if (typeof value !== 'string' || !/^(0|[1-9]\d*)(\.(0|[1-9]\d*)){3}$/.test(value)) {
    errors.push('Manifest.Version must use {major}.{minor}.{patch}.{build}.');
  }
}

function checkHtmlPath(pluginDir, value, label, errors) {
  if (typeof value !== 'string' || !/\.html?$/i.test(value) || path.isAbsolute(value) || value.startsWith('.') || value.includes('\\')) {
    errors.push(`${label} must be a relative .htm/.html path with a file extension.`);
    return;
  }

  requireFile(pluginDir, value, errors);
}

function checkImageSet(pluginDir, stem, label, normalSize, retinaSize, errors) {
  if (typeof stem !== 'string' || path.extname(stem) !== '' || path.isAbsolute(stem) || stem.startsWith('.') || stem.includes('\\')) {
    errors.push(`${label} must be a relative image path with the file extension omitted.`);
    return;
  }

  checkPng(path.join(pluginDir, `${stem}.png`), `${label}.png`, normalSize, normalSize, errors);
  checkPng(path.join(pluginDir, `${stem}@2x.png`), `${label}@2x.png`, retinaSize, retinaSize, errors);
}

function checkPng(filePath, label, expectedWidth, expectedHeight, errors) {
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing ${label}: ${filePath}`);
    return;
  }

  const data = fs.readFileSync(filePath);
  const isPng = data.length >= 24
    && data[0] === 0x89
    && data[1] === 0x50
    && data[2] === 0x4e
    && data[3] === 0x47;

  if (!isPng) {
    errors.push(`${label} must be a PNG file.`);
    return;
  }

  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);
  if (width !== expectedWidth || height !== expectedHeight) {
    errors.push(`${label} must be ${expectedWidth}x${expectedHeight}px, got ${width}x${height}px.`);
  }
}

function requireFile(pluginDir, relativePath, errors) {
  const filePath = path.join(pluginDir, relativePath);
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing required file: ${filePath}`);
  }
}

function compareVersions(a, b) {
  const left = String(a || '').split('.').map(Number);
  const right = String(b || '').split('.').map(Number);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    const diff = (left[i] || 0) - (right[i] || 0);
    if (diff !== 0) return diff;
  }

  return 0;
}

function report(errors) {
  if (errors.length === 0) {
    return;
  }

  for (const error of errors) {
    console.error(`Error: ${error}`);
  }

  process.exit(1);
}

if (require.main === module) {
  validatePlugin(process.argv[2] || DEFAULT_PLUGIN_DIR);
}

module.exports = { validatePlugin };
