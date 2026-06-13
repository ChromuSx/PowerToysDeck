const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { validatePlugin } = require('./validate-plugin');

const pluginDir = 'com.chromusx.power-toybox-deck.sdPlugin';
const outputFile = 'com.chromusx.power-toybox-deck.streamDeckPlugin';

if (!fs.existsSync(pluginDir)) {
  console.error(`Error: ${pluginDir} directory not found. Run npm run build first.`);
  process.exit(1);
}

for (const requiredFile of [
  'manifest.json',
  'bin/plugin.js',
  'ui/property-inspector.html',
  'PowerToysBridge.exe',
  'imgs/action-icon.png',
  'imgs/action-icon@2x.png',
  'imgs/category-icon.png',
  'imgs/category-icon@2x.png',
  'imgs/fallback.svg',
  'imgs/key-idle.png',
  'imgs/key-idle@2x.png',
  'imgs/key-success.png',
  'imgs/key-success@2x.png',
  'imgs/key-error.png',
  'imgs/key-error@2x.png',
  'imgs/plugin-icon.png',
  'imgs/plugin-icon@2x.png',
  'node_modules/ws/index.js',
]) {
  const fullPath = path.join(pluginDir, requiredFile);
  if (!fs.existsSync(fullPath)) {
    console.error(`Error: required plugin file missing: ${fullPath}`);
    process.exit(1);
  }
}

validatePlugin(pluginDir);

fs.rmSync(outputFile, { force: true });

const zip = new AdmZip();
addDirectory(pluginDir, pluginDir);
zip.writeZip(outputFile);

const sizeKb = (fs.statSync(outputFile).size / 1024).toFixed(2);
console.log(`Created ${outputFile} (${sizeKb} KB)`);

function addDirectory(dirPath, zipBasePath) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    const zipPath = path.join(zipBasePath, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      addDirectory(fullPath, zipPath);
      continue;
    }

    zip.addFile(zipPath, fs.readFileSync(fullPath));
  }
}
