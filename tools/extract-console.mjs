// tools/extract-console.mjs
// Decode the self-extracting Console bundle into repo files.
import fs from 'node:fs';
import zlib from 'node:zlib';

const SRC = '../STE Console (shareable) (3).html';
const html = fs.readFileSync(SRC, 'utf8');

function tagJson(type) {
  const m = html.match(new RegExp(`<script type="${type}">([\\s\\S]*?)</script>`));
  if (!m) throw new Error(type + ' not found');
  return JSON.parse(m[1]);
}
const manifest = tagJson('__bundler/manifest');
const template = tagJson('__bundler/template'); // string: full HTML doc

function decode(uuid) {
  const e = manifest[uuid];
  if (!e) throw new Error('asset missing: ' + uuid);
  const buf = Buffer.from(e.data, 'base64');
  return e.compressed ? zlib.gunzipSync(buf) : buf;
}

const OUT = {
  'd3354b52-ba44-4cea-bdbd-eaf5a64ea528': 'js/lib/echarts.min.js',
  'c0b985f0-abcb-47ad-abdc-9a5fa50de034': 'js/console/console-data.js',
  '98a6594e-d8fd-4266-8869-fd6f8d4a42b7': 'js/console/console-charts.js',
  '0af0b961-b561-4cd9-9834-811bf1970b2d': 'js/console/console-ui.js',
  'df781f3d-f896-4a44-8037-bb03a91deee6': 'js/console/console-screens-a12.js',
  '9127ab9b-d45e-4fe6-8747-f87aa4e2f09f': 'js/console/console-screens-a345.js',
};
fs.mkdirSync('js/console', { recursive: true });
for (const [uuid, path] of Object.entries(OUT)) {
  fs.writeFileSync(path, decode(uuid));
  console.log(path, fs.statSync(path).size, 'bytes');
}
fs.writeFileSync('tools/console-template.html', template);

// JetBrains Mono fonts: pick the LATIN subset (unicode-range U+0000-00FF)
// per weight — the first face per weight is a cyrillic-ext subset we don't want.
const faces = [...template.matchAll(/@font-face\s*{[^}]*}/g)].map(m => m[0])
  .filter(f => /JetBrains Mono/.test(f) && /U\+0000-00FF/.test(f));
const seen = new Set();
for (const f of faces) {
  const w = (f.match(/font-weight:\s*(\d+)/) || [])[1];
  const u = (f.match(/url\("([0-9a-f-]{36})"\)/) || [])[1];
  if (!w || !u || seen.has(w)) continue;
  seen.add(w);
  fs.writeFileSync(`fonts/jbm-${w}.woff2`, decode(u));
  console.log(`fonts/jbm-${w}.woff2 written (uuid ${u}, latin subset)`);
}
if (seen.size !== 2) console.warn(`WARN: expected 2 JBM latin faces (500,600), got ${seen.size}`);
