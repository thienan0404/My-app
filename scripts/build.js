'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
const assets = [
  'index.html', 'app.js', 'cloud-config.js', 'cloud-sync.js', 'cloud-app.js', 'style.css', 'theme-v2.css', 'motivation.css', 'mobile.css',
  'sw.js', 'manifest.webmanifest', 'public/favicon.svg'
];

// Validate every input before replacing the generated output.
for (const asset of assets) {
  if (!fs.statSync(path.join(root, asset)).isFile()) throw new Error(`Missing asset: ${asset}`);
}
for (const script of ['app.js', 'sw.js', 'cloud-config.js', 'cloud-sync.js', 'cloud-app.js']) {
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
const cloudUrl = process.env.SUPABASE_URL || '';
const cloudKey = process.env.SUPABASE_PUBLISHABLE_KEY || '';
if (cloudUrl || cloudKey) {
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cloudUrl) || !cloudKey) throw new Error('Invalid public Supabase configuration');
  if (!cloudKey.startsWith('sb_publishable_')) {
    let claims;try {claims=JSON.parse(Buffer.from(cloudKey.split('.')[1],'base64url').toString());} catch {}
    if (claims?.role!=='anon') throw new Error('Only publishable / anon keys are allowed in the browser build');
  }
  fs.writeFileSync(path.join(output,'cloud-config.js'),'globalThis.GROWTH_CLOUD_CONFIG='+JSON.stringify({url:cloudUrl,key:cloudKey})+';\n');
}
console.log(`Built ${assets.length} static assets in dist/`);
