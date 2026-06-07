// tools/deinline-bundle.mjs
// One-off: extract the inlined JS bundle from index.html into js/seed-inline.js
// and replace the ste-bundle-loader with static <script src> tags.
// Verified precondition: the bundle string === seed-prefix + the 11 js/ files
// verbatim, joined by "\n".
import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');

// 1. Extract the bundle string literal
const marker = 'bundle.textContent = ';
const i = html.indexOf(marker);
if (i === -1) throw new Error('bundle marker not found');
const start = i + marker.length;
const endMarker = ';\n    document.head.appendChild(bundle);';
const j = html.indexOf(endMarker, start);
if (j === -1) throw new Error('bundle end marker not found');
const bundle = eval(html.slice(start, j)); // JS string literal (has \' escapes → not JSON-parseable)

// 2. Verify the 11 sources are verbatim inside, in order, and find the prefix end
const FILES = [
  'js/state.js', 'js/services/validate.js', 'js/screens.js',
  'js/screens-onboarding.js', 'js/screens-account.js', 'js/screens-admin.js',
  'js/screens-support.js', 'js/screens-analytics.js', 'js/screens-design.js',
  'js/header-menus.js', 'js/app.js',
];
for (const f of FILES) {
  const src = fs.readFileSync(f, 'utf8');
  if (bundle.indexOf(src) === -1) throw new Error(`DRIFT: ${f} not verbatim in bundle — abort, do not de-inline`);
}
const stateAt = bundle.indexOf(fs.readFileSync('js/state.js', 'utf8'));

// 3. Write the seed prefix (STE_SEED + STE_SKU_MASTER + STE_FX) verbatim
fs.writeFileSync('js/seed-inline.js', bundle.slice(0, stateAt));
console.log('js/seed-inline.js bytes:', stateAt);

// 4. Replace the whole loader <script> block with static tags
const loaderStart = html.indexOf('<script id="ste-bundle-loader">');
const loaderEnd = html.indexOf('</script>', j) + '</script>'.length;
if (loaderStart === -1 || loaderEnd <= loaderStart) throw new Error('loader block not found');
const tags = [
  'js/lib/xlsx.full.min.js', 'js/seed-inline.js', ...FILES,
].map(s => `<script src="${s}"></script>`).join('\n');
const out = html.slice(0, loaderStart)
  + '<!-- De-inlined app bundle: js/ sources are now canonical (was: inlined ste-bundle-loader) -->\n'
  + tags + '\n' + html.slice(loaderEnd);
fs.writeFileSync('index.html', out);
console.log('index.html rewritten. New tail:');
console.log(out.slice(-700));
