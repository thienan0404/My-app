'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
const assets = [
  'index.html', 'app.js', 'style.css', 'theme-v2.css', 'motivation.css',
  'sw.js', 'manifest.webmanifest', 'public/favicon.svg'
];

// Validate every input before replacing the generated output.
for (const asset of assets) {
  if (!fs.statSync(path.join(root, asset)).isFile()) throw new Error(`Missing asset: ${asset}`);
}
for (const script of ['app.js', 'sw.js']) {
  execFileSync(process.execPath, ['--check', path.join(root, script)], { stdio: 'inherit' });
}
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const match of html.matchAll(/(?:src|href)="\.\/([^"?#]+)"/g)) {
  if (!assets.includes(match[1])) throw new Error(`Unpackaged HTML asset: ${match[1]}`);
}
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
for (const icon of manifest.icons) {
  if (!assets.includes(icon.src.replace(/^\.\//, ''))) throw new Error(`Unpackaged PWA icon: ${icon.src}`);
}
fs.rmSync(output, { recursive: true, force: true });
for (const asset of assets) {
  const destination = path.join(output, asset);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(path.join(root, asset), destination);
}
console.log(`Built ${assets.length} static assets in dist/`);
