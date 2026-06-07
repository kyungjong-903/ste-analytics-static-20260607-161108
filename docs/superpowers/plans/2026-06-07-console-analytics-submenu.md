# Console Analytics Submenu Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the ST Licensor Console's 5 analytics screens (Overview, Sales & Royalty, Distribution, Inventory, Marketing) out of the self-extracting `STE Console (shareable) (3).html` bundle into the ste-prototype as native sub-pages under a new "Analytics" sidebar section, replacing (temporarily hiding) the existing single Analytics menu item.

**Architecture:** First de-inline the prototype's 1.8MB inlined JS bundle (verified byte-identical to the `js/` sources) so `index.html` loads the `js/` files directly — all later edits then happen in clean source files. Then decode the Console bundle's 6 JS modules + ECharts + fonts into the repo, scope its CSS under a `.ste-console` container class, and write one new adapter file (`js/console/console-host.js`) that renders the Console screens inside the prototype's `<ste-shell>` at `#/analytics/<sub>` routes. Console's licensor/licensee mode toggle is removed — mode follows `STE.isHQ()`.

**Tech Stack:** Vanilla JS (no build), Apache ECharts 5.5.0 (extracted to `js/lib/`), Node (one-off extraction/transform scripts in `tools/`), Playwright MCP for browser verification. No test framework exists in this project — every task ends with an explicit scripted or browser verification step instead of unit tests.

---

## Verified facts this plan relies on (do not re-derive)

- **Repo root** = `/Users/ad0658/CodeAgent/sergio_tmp/ste-prototype-demo-20260605-1256` (NOT yet a git repo). All paths below are relative to it. The Console source file lives one directory up: `../STE Console (shareable) (3).html`.
- `index.html` (19,735 lines) does **NOT** load the `js/` files. Line 19723 starts `<script id="ste-bundle-loader">` which loads `js/lib/xlsx.full.min.js`, then executes a 1,748,558-char inlined string (`bundle.textContent = "..."`, single line 19730).
- That inlined string is **exactly**: a prefix `[0, 170091)` containing `window.STE_SEED = <data/seed.json>` + `STE_SKU_MASTER` + `STE_FX` assignments, followed by these 11 files verbatim, joined by `\n`, in this order:
  `js/state.js`, `js/services/validate.js`, `js/screens.js`, `js/screens-onboarding.js`, `js/screens-account.js`, `js/screens-admin.js`, `js/screens-support.js`, `js/screens-analytics.js`, `js/screens-design.js`, `js/header-menus.js`, `js/app.js`. (Verified by `indexOf` of each full file; segments are contiguous and account for every byte.)
- The Console HTML is a self-extracting bundle: `<script type="__bundler/manifest">` (line 173, JSON: uuid → `{mime, compressed, data(base64)}`), `<script type="__bundler/template">` (line 181, JSON-escaped full HTML doc). Asset UUIDs:
  - `d3354b52-ba44-4cea-bdbd-eaf5a64ea528` → ECharts 5.5.0 (1,029,203 bytes decoded)
  - `c0b985f0-abcb-47ad-abdc-9a5fa50de034` → `window.STEData` (mock data model)
  - `98a6594e-d8fd-4266-8869-fd6f8d4a42b7` → `window.Charts` (ECharts wrappers; has `setTheme(light)`, `setView(v)`, window-resize listener)
  - `0af0b961-b561-4cd9-9834-811bf1970b2d` → `window.UI` (helpers + document-level hover tooltip engine appending `.cc-tip` to `<body>`)
  - `df781f3d-f896-4a44-8037-bb03a91deee6` → `window.Screens.a1/.a2`
  - `9127ab9b-d45e-4fe6-8747-f87aa4e2f09f` → `window.Screens.a3/.a4/.a5`
  - `2c913479-a6a0-4284-a620-53862e4c1e3c` → app shell (we port pieces of it into console-host.js; the file itself is NOT loaded)
  - Console template (decoded): theme CSS = the **2nd** `<style>` block (template lines 432–982); 1st style block (lines 8–431) is @font-face for Inter + JetBrains Mono.
- **No global name collisions:** the prototype never defines `window.STEData`, `window.Charts`, `window.UI`, `window.Screens`, and contains zero `echarts` references.
- Prototype router: `js/app.js` — `ROUTES` array line 7 already contains `"analytics"`; `currentRoute()` (line 410) maps `#/analytics/overview` → top-level route `analytics`; handler map line 517: `analytics: () => window.STEAnalytics && STEAnalytics.analytics()`. `paintActiveNav` (line ~708) toggles `.active` by comparing the link href's **first** path segment — with 5 sibling `#/analytics/*` links it would activate all 5 (must be patched, Task 6).
- Sidebar nav single source of truth: `NAV` array in `index.html` lines 5259–5273 (the `analytics` entry is line 5269) + `ICONS` map lines 5275–5296. Two render paths (function `renderShell` line 5298 and `STEShell` class line 5368) both read this NAV. `paintSidebarSections` (app.js) auto-inserts a section header for each new `data-section` value.
- Screen-section pattern to copy (from `js/screens-analytics.js`): `ensureSection()` line 407 creates `<section data-page="analytics">`; `analytics()` line 500 hides other sections, then renders `<ste-shell active=... breadcrumb=...>…</ste-shell>` into it (shell attr block at lines 933–937).
- Entity mapping already exists in the prototype (`js/screens-analytics.js` line ~535): `_refToLicId = { bbuk:'lic_75f7462d', sugifr:'lic_c2a5c666', sugifw:'lic_000025e9', benjamin:'lic_b56a4e2c', bds:'lic_05056c4c' }`. console-host uses the **reverse** of this map.
- Console screens' init functions mount ECharts by `getElementById` on ids they themselves render (`a3-doors` etc.) — they work as long as `sc.render()` output is in the DOM before `sc.init(state)` runs.
- The Console persists filter state in localStorage key `ste-console-state-v2` — we keep that key (isolated from prototype state `ste.state.v13`).

## File structure (created / modified)

```
ste-prototype-demo-20260605-1256/
├── index.html                      MODIFY: loader→static script tags (T1), NAV+ICONS (T5), css link (T3), console script tags (T6)
├── js/
│   ├── seed-inline.js              CREATE (T1, generated): STE_SEED + STE_SKU_MASTER + STE_FX
│   ├── app.js                      MODIFY (T6): analytics handler + paintActiveNav
│   ├── lib/echarts.min.js          CREATE (T2, extracted)
│   └── console/
│       ├── console-data.js         CREATE (T2, extracted verbatim)
│       ├── console-charts.js       CREATE (T2, extracted verbatim)
│       ├── console-ui.js           CREATE (T2, extracted verbatim)
│       ├── console-screens-a12.js  CREATE (T2, extracted verbatim)
│       ├── console-screens-a345.js CREATE (T2, extracted verbatim)
│       └── console-host.js         CREATE (T4, new adapter — full code below)
├── css/console.css                 CREATE (T3, generated: scoped Console theme + JBM fonts + submenu indent)
├── fonts/jbm-500.woff2, jbm-600.woff2  CREATE (T2, extracted)
└── tools/
    ├── deinline-bundle.mjs         CREATE (T1)
    ├── extract-console.mjs         CREATE (T2)
    ├── build-console-css.mjs       CREATE (T3)
    └── console-template.html       CREATE (T2, decoded template, reference for T3)
```

---

### Task 0: git init + baseline commit

**Files:** Create: `.gitignore`

- [ ] **Step 0.1: Init repo and baseline commit**

```bash
cd /Users/ad0658/CodeAgent/sergio_tmp/ste-prototype-demo-20260605-1256
git init
printf '.DS_Store\nnode_modules/\n' > .gitignore
git add -A
git commit -m "chore: baseline — ste-prototype demo as received"
```

Expected: commit created; `git status` clean.

---

### Task 1: De-inline the JS bundle (behavior-preserving refactor)

**Files:**
- Create: `tools/deinline-bundle.mjs`, `js/seed-inline.js` (generated)
- Modify: `index.html` (replace the `ste-bundle-loader` block — done by the script, NOT by hand: the block is a 1.8MB single line)

- [ ] **Step 1.1: Write `tools/deinline-bundle.mjs`**

```js
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
let cursor = null;
for (const f of FILES) {
  const src = fs.readFileSync(f, 'utf8');
  const at = bundle.indexOf(src);
  if (at === -1) throw new Error(`DRIFT: ${f} not verbatim in bundle — abort, do not de-inline`);
  if (cursor === null) cursor = at;            // first file = end of seed prefix
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
```

- [ ] **Step 1.2: Run it**

```bash
cd /Users/ad0658/CodeAgent/sergio_tmp/ste-prototype-demo-20260605-1256
node tools/deinline-bundle.mjs
```

Expected: `js/seed-inline.js bytes: 170091`, rewritten tail shows 13 `<script src=...>` tags right before `</body></html>`. If it throws `DRIFT: ...` — STOP, the sources diverged from the bundle; report to the user.

- [ ] **Step 1.3: Browser-verify identical behavior (Playwright MCP)**

1. `browser_navigate` → `file:///Users/ad0658/CodeAgent/sergio_tmp/ste-prototype-demo-20260605-1256/index.html`
2. `browser_snapshot` — expect the HQ dashboard (Licensor view, signed in as Min Jung), sidebar shows Home / Design… / Operations… sections.
3. `browser_console_messages` — no errors (warnings about favicons OK).
4. `browser_click` on "Sales Statements" nav → snapshot shows the statements list (proves routing + seed + screens all work from external files).

- [ ] **Step 1.4: Commit**

```bash
git add -A && git commit -m "refactor: de-inline app bundle — index.html now loads js/ sources directly"
```

---

### Task 2: Extract Console assets into the repo

**Files:**
- Create: `tools/extract-console.mjs`, `tools/console-template.html` (generated), `js/lib/echarts.min.js`, `js/console/console-{data,charts,ui,screens-a12,screens-a345}.js`, `fonts/jbm-500.woff2`, `fonts/jbm-600.woff2`

- [ ] **Step 2.1: Write `tools/extract-console.mjs`**

```js
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

// JetBrains Mono fonts: find @font-face blocks naming JetBrains Mono and pull
// their uuid src refs out of the template's first <style> block.
const faces = [...template.matchAll(/@font-face\s*{[^}]*}/g)].map(m => m[0])
  .filter(f => /JetBrains Mono/.test(f));
const seen = new Set();
for (const f of faces) {
  const w = (f.match(/font-weight:\s*(\d+)/) || [])[1];
  const u = (f.match(/url\("([0-9a-f-]{36})"\)/) || [])[1];
  if (!w || !u || seen.has(w)) continue;
  seen.add(w);
  fs.writeFileSync(`fonts/jbm-${w}.woff2`, decode(u));
  console.log(`fonts/jbm-${w}.woff2 written (uuid ${u})`);
}
if (!seen.size) console.warn('WARN: no JetBrains Mono faces found — check template');
```

- [ ] **Step 2.2: Run + sanity-check the extracted modules**

```bash
cd /Users/ad0658/CodeAgent/sergio_tmp/ste-prototype-demo-20260605-1256
node tools/extract-console.mjs
node --check js/console/console-data.js && node --check js/console/console-charts.js \
  && node --check js/console/console-ui.js && node --check js/console/console-screens-a12.js \
  && node --check js/console/console-screens-a345.js && echo SYNTAX-OK
head -c 120 js/lib/echarts.min.js
grep -c "window.STEData" js/console/console-data.js
grep -c "window.Screens" js/console/console-screens-a12.js
```

Expected: 6 files written (echarts ≈ 1,029,203 bytes; data ≈ 31,625; charts ≈ 15,877; ui ≈ 3,560; a12 ≈ 36,913; a345 ≈ 15,850), `SYNTAX-OK`, echarts head shows the Apache license banner, both greps ≥ 1, two `fonts/jbm-*.woff2` written.

- [ ] **Step 2.3: Commit**

```bash
git add -A && git commit -m "feat: extract Console modules, ECharts, and JBM fonts from shareable bundle"
```

---

### Task 3: Scope the Console theme CSS and link it

**Files:**
- Create: `tools/build-console-css.mjs`, `css/console.css` (generated)
- Modify: `index.html` (one-line `<link>` insertion after `</title>`)

The Console CSS is the **second** `<style>` block of `tools/console-template.html` (`:root` tokens, `.card/.kpi/.dd/...` components, `body.mode-licensee` light theme). It must only apply inside our container, so every rule is re-scoped under `.ste-console`. Exceptions: selectors containing `.cc-tip` stay **global** (the UI module's tooltip element is appended to `<body>`, outside the container).

- [ ] **Step 3.1: Write `tools/build-console-css.mjs`**

```js
// tools/build-console-css.mjs
// Extract the Console theme <style> block and scope it under .ste-console.
import fs from 'node:fs';

const tpl = fs.readFileSync('tools/console-template.html', 'utf8');
const styles = [...tpl.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]);
if (styles.length < 2) throw new Error('expected ≥2 style blocks, got ' + styles.length);
const css = styles[1]; // [0] = @font-face block, [1] = theme/components

const SCOPE = '.ste-console';
function scopeSelector(sel) {
  const s = sel.trim();
  if (!s) return s;
  if (s.includes('.cc-tip')) return s;                       // global tooltip
  if (s === ':root' || s === 'html' || s === 'body') return SCOPE;
  if (s.startsWith('body.')) return SCOPE + s.slice(4);      // body.mode-licensee X → .ste-console.mode-licensee X
  if (s.startsWith('body ')) return SCOPE + s.slice(4);
  if (s.startsWith('html,') || s.startsWith(':root,')) return SCOPE;
  if (s === '*') return SCOPE + ' *';
  return SCOPE + ' ' + s;
}

// Minimal CSS walker: handles top-level rules, @media (recurse one level),
// @keyframes/@font-face (verbatim). Good enough for this hand-written sheet.
function transform(src) {
  let out = '', i = 0;
  while (i < src.length) {
    const brace = src.indexOf('{', i);
    if (brace === -1) { out += src.slice(i); break; }
    const head = src.slice(i, brace);
    if (/@(keyframes|font-face|-webkit-keyframes)/.test(head)) {
      // copy whole block incl. nested braces verbatim
      let depth = 1, k = brace + 1;
      while (depth > 0 && k < src.length) { if (src[k] === '{') depth++; else if (src[k] === '}') depth--; k++; }
      out += head + src.slice(brace, k); i = k; continue;
    }
    if (/@media/.test(head)) {
      let depth = 1, k = brace + 1;
      while (depth > 0 && k < src.length) { if (src[k] === '{') depth++; else if (src[k] === '}') depth--; k++; }
      out += head + '{' + transform(src.slice(brace + 1, k - 1)) + '}'; i = k; continue;
    }
    const close = src.indexOf('}', brace);
    const body = src.slice(brace + 1, close);
    // strip comments around the selector list before splitting
    const sels = head.replace(/\/\*[\s\S]*?\*\//g, '').split(',').map(scopeSelector).join(', ');
    out += sels + '{' + body + '}';
    i = close + 1;
  }
  return out;
}

let result = `/* GENERATED by tools/build-console-css.mjs — do not edit by hand.
   Console theme scoped under .ste-console. Re-run the script to regenerate. */\n`;
result += `@font-face { font-family: 'JetBrains Mono'; font-style: normal; font-weight: 500; font-display: swap; src: url("../fonts/jbm-500.woff2") format('woff2'); }\n`;
result += `@font-face { font-family: 'JetBrains Mono'; font-style: normal; font-weight: 600; font-display: swap; src: url("../fonts/jbm-600.woff2") format('woff2'); }\n`;
result += transform(css);
// Integration overrides: container is a panel inside the shell, not a page.
result += `
/* --- integration overrides (hand-written, keep at end) --- */
.ste-console { border-radius: 14px; padding: 0 0 24px; }
.ste-console .filterbar { position: sticky; top: 0; z-index: 5; border-radius: 14px 14px 0 0; }
.ste-console .main { padding: 18px 22px; }
/* Sidebar submenu indent for the five #/analytics/* items */
.sidebar a.nav-item[href^="#/analytics/"] { padding-left: 28px; }
body.sidebar-collapsed .sidebar a.nav-item[href^="#/analytics/"] { padding-left: 0; }
`;
fs.mkdirSync('css', { recursive: true });
fs.writeFileSync('css/console.css', result);
console.log('css/console.css bytes:', result.length);
```

- [ ] **Step 3.2: Run + spot-check the output**

```bash
node tools/build-console-css.mjs
grep -c "^\.ste-console\|, \.ste-console\| \.ste-console" css/console.css | head -1
grep -n "body\." css/console.css | head -5
grep -n "\.cc-tip" css/console.css | head -3
```

Expected: file written (roughly 25–40KB); `body.` matches only inside the integration-override comment area or none (every `body.mode-licensee` became `.ste-console.mode-licensee`); `.cc-tip` rules present WITHOUT a `.ste-console` prefix.

- [ ] **Step 3.3: Link the stylesheet in `index.html`** (Edit tool, unique anchor)

Replace:
```html
<title>Sergio Tacchini · Global AI Agent</title>
```
with:
```html
<title>Sergio Tacchini · Global AI Agent</title>
<link rel="stylesheet" href="css/console.css">
```

- [ ] **Step 3.4: Commit**

```bash
git add -A && git commit -m "feat: scoped Console theme CSS (.ste-console) + JetBrains Mono fonts"
```

---

### Task 4: Write the host adapter `js/console/console-host.js`

**Files:** Create: `js/console/console-host.js`

This is the only new hand-written file. It ports the Console app shell's filter bar, screen-render pipeline, and event wiring (source: decoded asset `2c913479`, kept at `/tmp/ste_assets/2c913479-a6a0-4284-a620-53862e4c1e3c` and re-derivable from `tools/console-source` extraction) — minus its sidebar, topbar, mode toggle, and own router. Mode follows `STE.isHQ()`.

- [ ] **Step 4.1: Create the file with this full content**

```js
/* =========================================================
   Console Analytics — host adapter (#/analytics/<sub>)
   Renders the ported ST Licensor Console screens (window.Screens
   a1..a5 from console-screens-*.js) inside the platform shell as
   Analytics sub-pages: overview · sales · distribution · inventory
   · marketing.
   - No mode toggle: licensor/licensee follows STE.isHQ(currentUser).
   - Filter prefs persist under the Console's own LS key, isolated
     from platform state.
   ========================================================= */
(function (global) {
  const D = () => window.STEData;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const SUBS = [
    { sub: "overview",     screen: "a1", label: "Overview",        tag: "A1" },
    { sub: "sales",        screen: "a2", label: "Sales & Royalty", tag: "A2" },
    { sub: "distribution", screen: "a3", label: "Distribution",    tag: "A3" },
    { sub: "inventory",    screen: "a4", label: "Inventory",       tag: "A4" },
    { sub: "marketing",    screen: "a5", label: "Marketing",       tag: "A5" },
  ];
  const SUB2SCREEN = Object.fromEntries(SUBS.map(s => [s.sub, s.screen]));
  const SCREEN2SUB = Object.fromEntries(SUBS.map(s => [s.screen, s.sub]));

  // Reverse of _refToLicId in screens-analytics.js — platform licensee org
  // id → Console entity id.
  const LIC2ENT = {
    lic_75f7462d: "bbuk",
    lic_c2a5c666: "sugifr",
    lic_000025e9: "sugifw",
    lic_b56a4e2c: "benjamin",
    lic_05056c4c: "bds",
  };

  const PERIODS = [
    ["ytd", "Year-to-Date"],
    ["__h1", "Single Quarter"],
    ["q1", "Q1 only"], ["q2", "Q2 only"], ["q3", "Q3 only"], ["q4", "Q4 only"],
    ["__h2", "Cumulative Through"],
    ["cum1", "Through Q1"], ["cum2", "Through Q2"], ["cum3", "Through Q3"], ["full", "Full Year"],
  ];
  const YEARS = [["2025", "2025"], ["2026", "2026"], ["2027", "2027"]];

  // ---- Persistent filter state (Console-compatible key) ----
  const LS_KEY = "ste-console-state-v2";
  const state = Object.assign({
    mode: "licensor", season: "all", period: "ytd", year: "2026", axis: "calendar",
    view: "actual", channel: null, screen: "a1",
    licensorEnt: "total", licenseeSelf: "bbuk", entId: "total",
    a2view: "net", a2dim: "category",
  }, load());
  function load() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {} }

  // Mode follows the signed-in platform role (no toggle).
  function syncRole() {
    const u = STE.currentUser && STE.currentUser();
    const hq = !!(u && STE.isHQ && STE.isHQ(u));
    state.mode = hq ? "licensor" : "licensee";
    if (!hq && u && LIC2ENT[u.licenseeId]) state.licenseeSelf = LIC2ENT[u.licenseeId];
  }

  let sec = null; // <section data-page="analytics">, owned by route()

  function ensureSection() {
    let s = document.querySelector('section[data-page="analytics"]');
    if (!s) {
      s = document.createElement("section");
      s.setAttribute("data-page", "analytics");
      s.hidden = true;
      document.body.appendChild(s);
    }
    return s;
  }

  // ---- Context: theme + season + effective entity (ported applyContext) ----
  function applyContext() {
    syncRole();
    state.entId = state.mode === "licensee" ? state.licenseeSelf : state.licensorEnt;
    if (state.axis !== "season") state.season = "all"; // calendar mode ⇒ all seasons summed
    window.__steYear = state.year || "2026";
    const light = state.mode === "licensee";
    const scope = sec && sec.querySelector(".ste-console");
    if (scope) {
      scope.classList.toggle("mode-licensee", light);
      scope.classList.toggle("mode-licensor", !light);
    }
    if (window.Charts && Charts.setTheme) Charts.setTheme(light);
    if (window.Charts && Charts.setView) Charts.setView(state.view);
    D().setContext({ season: state.axis === "season" ? (state.season || "all") : "all", year: state.year, view: state.view, axis: state.axis });
  }

  // ---- Compact dropdown (ported) ----
  function dd(key, current, options, attr) {
    const cur = options.find(o => o[0] === current) || options[0];
    return `<div class="dd" data-dd="${key}">
      <button class="dd-trigger" data-dd-trigger="${key}"><span>${cur[1]}</span><span class="chev"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></span></button>
      <div class="dd-menu" data-dd-menu="${key}">
        ${options.map(o => String(o[0]).startsWith("__")
          ? `<div class="dd-hdr">${o[1]}</div>`
          : `<div class="dd-opt ${o[0] === current ? "active" : ""}" data-${attr}="${o[0]}">${o[1]}</div>`).join("")}
      </div>
    </div>`;
  }

  // ---- Filter bar (ported; mode toggle and export buttons removed) ----
  function renderFilter() {
    const isLic = state.mode === "licensee";
    const SEASONS = D().SEASONS_FILTER;
    const licenseeAxis = isLic ? lockedScope() : licenseeSelector();
    const calMode = state.axis !== "season";
    return `<div class="filterbar">
      ${licenseeAxis}
      <div style="width:1px;height:24px;background:var(--border)"></div>
      <div class="filter-group ${calMode ? "" : "axis-dim"}">
        <span class="filter-lab">Calendar</span>
        ${dd("year", state.year, YEARS, "year")}
        ${dd("period", state.period, PERIODS, "period")}
        ${!calMode ? '<span class="axis-note">Calendar inactive</span>' : ""}
      </div>
      <div style="width:1px;height:24px;background:var(--border)"></div>
      <div class="filter-group ${calMode ? "axis-dim" : ""}">
        <span class="filter-lab">Season</span>
        ${dd("season", calMode ? "all" : state.season, SEASONS, "season")}
        ${calMode ? '<span class="axis-note">Season inactive</span>' : ""}
      </div>
      <div class="spacer" style="flex:1"></div>
      <div class="filter-group">
        <span class="filter-lab">View</span>
        <div class="seg" id="view-seg">
          <button data-view="actual" class="${state.view !== "plan" ? "active" : ""}">Actual</button>
          <button data-view="plan" class="${state.view === "plan" ? "active" : ""}">Plan</button>
        </div>
      </div>
    </div>`;
  }
  function licenseeSelector() {
    const ent = D().byId(state.licensorEnt);
    return `<div class="filter-group">
      <span class="filter-lab">Licensee</span>
      <div class="lic-select" id="lic-select">
        <div class="lic-trigger" id="lic-trigger">
          <span class="flag ${ent.flag}"></span>
          <div class="lt"><b>${ent.code}</b><small>${ent.aggregate ? "5 licensees · consolidated" : ent.name}</small></div>
          <span class="chev"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></span>
        </div>
        <div class="lic-menu" id="lic-menu">
          ${D().ENTITIES.map(e => `<div class="lic-opt ${e.aggregate ? "total" : ""} ${e.id === state.licensorEnt ? "active" : ""}" data-ent="${e.id}">
            <span class="flag ${e.flag}"></span>
            <div class="lt"><b>${e.code}</b><small>${e.aggregate ? "Portfolio · all 5" : e.name + " · " + e.region}</small></div>
            <span class="check"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg></span>
          </div>`).join("")}
        </div>
      </div>
    </div>`;
  }
  function lockedScope() {
    return `<div class="filter-group">
      <span class="filter-lab">Scope</span>
      <div class="lic-trigger" style="cursor:default">
        <span class="flag flag-anon"></span>
        <div class="lt"><b>Licensee A</b><small>Auto-scoped to your account</small></div>
        <span class="chev" style="opacity:.5"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></span>
      </div>
    </div>`;
  }
  function refreshFilter() {
    const fb = sec && sec.querySelector(".filterbar");
    if (fb) fb.outerHTML = renderFilter();
  }

  // ---- Empty / partial states (ported verbatim) ----
  function emptyStateHtml() {
    const lab = D().closeLabel(state.period);
    return `<div class="card card-pad" style="text-align:center;padding:64px 24px;">
      <div style="width:56px;height:56px;border-radius:16px;background:var(--panel-3);border:1px solid var(--border-2);display:inline-flex;align-items:center;justify-content:center;color:var(--ink-3);margin-bottom:18px">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
      </div>
      <h2 style="font-size:18px;font-weight:700;margin:0 0 8px">No actuals yet</h2>
      <p style="color:var(--ink-2);font-size:14px;margin:0 auto 20px;max-width:440px;line-height:1.55">Actual data will be available after <b style="color:var(--ink)">${lab}</b>. You can review the committed plan for this period now.</p>
      <button class="btn btn-primary" id="switch-plan"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></svg>Switch to Plan view</button>
    </div>`;
  }
  function invNoPlanHtml() {
    return `<div class="card card-pad" style="text-align:center;padding:64px 24px;">
      <div style="width:56px;height:56px;border-radius:16px;background:var(--panel-3);border:1px solid var(--border-2);display:inline-flex;align-items:center;justify-content:center;color:var(--ink-3);margin-bottom:18px">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/></svg>
      </div>
      <h2 style="font-size:18px;font-weight:700;margin:0 0 8px">Plan data not available for Inventory yet</h2>
      <p style="color:var(--ink-2);font-size:14px;margin:0 auto 20px;max-width:460px;line-height:1.55">Inventory does not yet have a committed plan model. Switch back to Actual view to see live stock metrics.</p>
      <button class="btn btn-primary" id="switch-actual"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l5-5 4 4 8-8"/><path d="M14 8h7v7"/></svg>Switch to Actual view</button>
    </div>`;
  }
  function partialBanner() {
    const seasonAxis = state.axis === "season";
    let title, desc, pctTxt, pctW;
    if (seasonAxis) {
      const isPre = state.season === "fw26";
      if (isPre) {
        title = "Pre-launch — sell-in only";
        desc = "Season has not launched yet. Wholesale sell-in is underway; no sell-out/actuals to report.";
        pctTxt = "~12%"; pctW = "12%";
      } else {
        title = "Season in progress — sell-through to date";
        desc = "Showing realized sell-through for the current season. Plan reflects the full-season target.";
        pctTxt = "~66%"; pctW = "66%";
      }
    } else {
      title = "Quarter in progress — partial actuals";
      desc = "Showing actuals through 31 May " + state.year + ". June will close at quarter end.";
      pctTxt = "~66%"; pctW = "66%";
    }
    return `<div class="card" style="padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:12px;border-color:var(--amber-dim)">
      <span style="width:30px;height:30px;border-radius:8px;background:var(--amber-dim);color:var(--amber);display:inline-flex;align-items:center;justify-content:center;flex:0 0 30px"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v4l3 2"/><circle cx="12" cy="12" r="9"/></svg></span>
      <div style="flex:1"><div style="font-size:13px;font-weight:600">${title}</div><div style="font-size:12px;color:var(--ink-2)">${desc}</div></div>
      <div style="display:flex;align-items:center;gap:8px"><div class="minibar" style="width:120px"><i style="width:${pctW};background:var(--amber)"></i></div><span class="mono" style="font-size:11px;color:var(--ink-2)">${pctTxt}</span></div>
    </div>`;
  }

  // ---- Screen render (ported renderScreen, targets #ste-console-main) ----
  function renderScreen() {
    applyContext();
    const sc = window.Screens && window.Screens[state.screen];
    const main = sec && sec.querySelector("#ste-console-main");
    if (!sc || !main) return;
    const navItem = SUBS.find(s => s.screen === state.screen) || SUBS[0];
    const title = typeof sc.title === "function" ? sc.title(state) : sc.title;
    const avail = D().availability(state.period);
    const futureActual = state.view !== "plan" && avail === "none";
    const invNoPlan = state.view === "plan" && state.screen === "a4";
    let bodyHtml;
    if (futureActual) bodyHtml = emptyStateHtml();
    else if (invNoPlan) bodyHtml = invNoPlanHtml();
    else bodyHtml = (avail === "partial" && state.view !== "plan" ? partialBanner() : "") + sc.render(state);
    main.innerHTML = `
      <div class="page-head">
        <div><h1>${title}</h1><div class="sub">${sc.sub(state)}</div></div>
        <div class="head-actions">
          <button class="btn btn-ghost btn-sm" id="exp-pdf"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>PDF</button>
          <button class="btn btn-ghost btn-sm" id="exp-xls"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg>Excel</button>
          <span class="pill ${state.view === "plan" ? "pill-violet" : "pill-blue"}" style="font-family:var(--mono)">${state.view === "plan" ? "PLAN" : "ACTUAL"}</span>
          <span class="pill ${state.mode === "licensee" ? "pill-blue" : "pill-gray"}" style="font-family:var(--mono)">${state.mode === "licensee" ? "LICENSEE" : "LICENSOR"} · ${navItem.tag}</span>
        </div>
      </div>
      <div id="screen-body">${bodyHtml}</div>`;
    if (!futureActual && !invNoPlan) {
      try { sc.init(state); } catch (e) { console.error("console screen init error", e); }
    }
    if (state._pendingAnchor && !futureActual && !invNoPlan) {
      const a = state._pendingAnchor; state._pendingAnchor = null;
      setTimeout(() => {
        const el = document.getElementById(a);
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY - 80;
          window.scrollTo({ top, behavior: "smooth" });
          el.classList.add("hl-flash");
          setTimeout(() => el.classList.remove("hl-flash"), 1700);
        }
      }, 140);
    }
  }

  // ---- Full page render inside the platform shell ----
  function render() {
    const u = STE.currentUser && STE.currentUser();
    if (!u) { location.hash = "#/login"; return; }
    syncRole();
    const lic = STE.currentLicensee && STE.currentLicensee();
    const isHQ = state.mode === "licensor";
    const navItem = SUBS.find(s => s.screen === state.screen) || SUBS[0];
    document.title = "Analytics · Sergio Tacchini";
    sec.innerHTML = `
      <ste-shell active="analytics-${navItem.sub}" breadcrumb="Analytics"
        user-name="${esc(u.name)}" user-role="${esc(u.title || "")}"
        user-initials="${esc((u.name || "?").split(/\s+/).map(s => s[0]).slice(0, 2).join("").toUpperCase())}"
        licensee-code="${lic ? esc(lic.id) : "HQ HQ"}" licensee-name="${lic ? esc(lic.legalName) : "Global Admin View"}">
      <div class="ste-screen-pad">
        <div class="ste-section-hd">
          <div class="ste-page-crumbs"><a href="${isHQ ? "#/hq" : "#/home"}">Home</a><span class="sep">/</span><span class="cur">Analytics · ${esc(navItem.label)}</span></div>
        </div>
        <div class="ste-console ${isHQ ? "mode-licensor" : "mode-licensee"}">
          ${renderFilter()}
          <main class="main" id="ste-console-main"></main>
        </div>
      </div>
      </ste-shell>`;
    renderScreen();
  }

  function go(screen) { location.hash = "#/analytics/" + (SCREEN2SUB[screen] || "overview"); }

  // ---- Delegated event wiring (ported wire(); document-level, once) ----
  function wire() {
    if (document._steConsoleWired) return;
    document._steConsoleWired = true;
    document.addEventListener("click", (e) => {
      const inside = e.target.closest(".ste-console");
      if (!inside) {
        document.querySelectorAll(".ste-console .dd.open").forEach(x => x.classList.remove("open"));
        const ls0 = document.querySelector(".ste-console #lic-select");
        if (ls0) ls0.classList.remove("open");
        return;
      }
      const goCard = e.target.closest("[data-go]");
      if (goCard) {
        if (goCard.dataset.gotab) state.a2view = goCard.dataset.gotab;
        if (goCard.dataset.anchor) state._pendingAnchor = goCard.dataset.anchor;
        save(); go(goCard.dataset.go); return;
      }
      const trig = e.target.closest("#lic-trigger");
      if (trig) { const ls = sec.querySelector("#lic-select"); if (ls) ls.classList.toggle("open"); e.stopPropagation(); return; }
      const opt = e.target.closest("[data-ent]");
      if (opt) {
        state.licensorEnt = opt.dataset.ent; save();
        refreshFilter(); renderScreen();
        const ls = sec.querySelector("#lic-select"); if (ls) ls.classList.remove("open");
        return;
      }
      const ddt = e.target.closest("[data-dd-trigger]");
      if (ddt) {
        const box = ddt.closest(".dd");
        const wasOpen = box.classList.contains("open");
        document.querySelectorAll(".ste-console .dd.open").forEach(x => x.classList.remove("open"));
        if (!wasOpen) box.classList.add("open");
        e.stopPropagation(); return;
      }
      const vw = e.target.closest("[data-view]");
      if (vw) { state.view = vw.dataset.view; save(); refreshFilter(); renderScreen(); return; }
      if (e.target.closest("#switch-plan")) { state.view = "plan"; save(); refreshFilter(); renderScreen(); return; }
      if (e.target.closest("#switch-actual")) { state.view = "actual"; save(); refreshFilter(); renderScreen(); return; }
      const yy = e.target.closest("[data-year]");
      if (yy) { state.axis = "calendar"; state.year = yy.dataset.year; state.season = "all"; save(); refreshFilter(); renderScreen(); return; }
      const per = e.target.closest("[data-period]");
      if (per) { state.axis = "calendar"; state.period = per.dataset.period; state.season = "all"; save(); refreshFilter(); renderScreen(); return; }
      const sea = e.target.closest("[data-season]");
      if (sea) {
        const id = sea.dataset.season;
        if (id === "all") { state.axis = "calendar"; state.season = "all"; }
        else { state.axis = "season"; state.season = id; state.period = "ytd"; }
        save(); refreshFilter(); renderScreen(); return;
      }
      const sv = e.target.closest("[data-a2view]");
      if (sv) { state.a2view = sv.dataset.a2view; save(); renderScreen(); return; }
      const ch = e.target.closest("[data-channel]");
      if (ch) { state.channel = ch.dataset.channel || null; save(); renderScreen(); return; }
      const dim = e.target.closest("[data-a2dim]");
      if (dim) { state.a2dim = dim.dataset.a2dim; save(); renderScreen(); return; }
      if (e.target.closest("#exp-pdf") || e.target.closest("#exp-xls")) {
        if (window.STEApp && STEApp.toast) STEApp.toast(e.target.closest("#exp-pdf") ? "Preparing PDF export…" : "Preparing Excel export…", "info");
        return;
      }
      if (!e.target.closest(".dd")) document.querySelectorAll(".ste-console .dd.open").forEach(x => x.classList.remove("open"));
      if (!e.target.closest("#lic-select")) { const ls = document.querySelector(".ste-console #lic-select"); if (ls) ls.classList.remove("open"); }
    });
  }

  // ---- Route entry, called by app.js for every #/analytics* hash ----
  function route() {
    const m = (location.hash || "").match(/^#\/analytics(?:\/([a-z-]+))?/);
    const sub = m && m[1];
    if (!sub || !SUB2SCREEN[sub]) { location.replace("#/analytics/overview"); return; }
    state.screen = SUB2SCREEN[sub];
    save();
    sec = ensureSection();
    document.querySelectorAll("section[data-page]").forEach(s => { s.hidden = s.dataset.page !== "analytics"; });
    sec.hidden = false;
    wire();
    render();
  }

  global.STEConsole = { route };
})(window);
```

- [ ] **Step 4.2: Syntax check**

```bash
node --check js/console/console-host.js && echo HOST-OK
```

Expected: `HOST-OK`

- [ ] **Step 4.3: Commit**

```bash
git add js/console/console-host.js && git commit -m "feat: console-host adapter — Console screens under #/analytics/<sub>"
```

---

### Task 5: Sidebar NAV — Analytics submenu, hide legacy item

**Files:** Modify: `index.html` (NAV array line 5259–5273; ICONS map ~5275)

- [ ] **Step 5.1: Replace the analytics NAV entry** (Edit tool)

Replace:
```js
    { id: 'analytics',label: 'Analytics',       href: '#/analytics',               icon: 'analytics', section: 'Operations' },
```
with:
```js
    // HIDDEN (temporarily) — legacy single-page Analytics. Restore by
    // uncommenting and removing the five Analytics sub-items below.
    // { id: 'analytics',label: 'Analytics',       href: '#/analytics',               icon: 'analytics', section: 'Operations' },
    { id: 'analytics-overview',     label: 'Overview',        href: '#/analytics/overview',     icon: 'cOverview',     section: 'Analytics' },
    { id: 'analytics-sales',        label: 'Sales & Royalty', href: '#/analytics/sales',        icon: 'cSales',        section: 'Analytics' },
    { id: 'analytics-distribution', label: 'Distribution',    href: '#/analytics/distribution', icon: 'cDistribution', section: 'Analytics' },
    { id: 'analytics-inventory',    label: 'Inventory',       href: '#/analytics/inventory',    icon: 'cInventory',    section: 'Analytics' },
    { id: 'analytics-marketing',    label: 'Marketing',       href: '#/analytics/marketing',    icon: 'cMarketing',    section: 'Analytics' },
```

(`paintSidebarSections` auto-creates the "Analytics" section header from `data-section`; no `data-licensee-only` flag — both roles see the submenu, same as the old Analytics item.)

- [ ] **Step 5.2: Add the 5 Console icons to the ICONS map** (Edit tool)

Replace:
```js
    folderStack: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l3-3h5l2 2h8a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H3z"/><path d="M7 3l2 2h5"/></svg>',
```
with:
```js
    folderStack: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l3-3h5l2 2h8a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H3z"/><path d="M7 3l2 2h5"/></svg>',
    cOverview: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
    cSales: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l5-5 4 4 8-8"/><path d="M14 8h7v7"/></svg>',
    cDistribution: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6"/></svg>',
    cInventory: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/></svg>',
    cMarketing: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11v3a1 1 0 0 0 1 1h3l4 4V7L7 11H4a1 1 0 0 0-1 0z"/><path d="M16 8a5 5 0 0 1 0 8"/></svg>',
```

- [ ] **Step 5.3: Commit**

```bash
git add index.html && git commit -m "feat: Analytics submenu (5 Console screens) in sidebar; hide legacy Analytics item"
```

---

### Task 6: Wire routing + load the new scripts

**Files:**
- Modify: `js/app.js` (handler map line ~517; `paintActiveNav` ~line 708)
- Modify: `index.html` (script tags from Task 1)

- [ ] **Step 6.1: Point the analytics route at the host** (Edit `js/app.js`)

Replace:
```js
      analytics: () => window.STEAnalytics && STEAnalytics.analytics(),
```
with:
```js
      // Console-ported analytics sub-pages. The legacy single-page screen
      // (STEAnalytics.analytics) is temporarily unrouted — restore by
      // swapping this line back.
      analytics: () => window.STEConsole && STEConsole.route(),
```

- [ ] **Step 6.2: Patch `paintActiveNav` for sub-path siblings** (Edit `js/app.js`)

Replace:
```js
  function paintActiveNav(route) {
    // Routes that share a nav slot
    const navAlias = { hq: "home" };
    const target = navAlias[route] || route;
    document.querySelectorAll(".sidebar .nav-item").forEach(a => {
      const href = a.getAttribute("href") || "";
      const m = href.match(/^#\/([^\/?#]+)/);
      const linkRoute = m ? m[1] : "";
      a.classList.toggle("active", linkRoute === target);
    });
  }
```
with:
```js
  function paintActiveNav(route) {
    // Routes that share a nav slot
    const navAlias = { hq: "home" };
    const target = navAlias[route] || route;
    const hash = location.hash || "";
    const links = Array.from(document.querySelectorAll(".sidebar .nav-item"));
    // When several nav items share one top-level route (the five
    // #/analytics/* sub-items), disambiguate by hash prefix so only the
    // matching sub-item lights up. Single-link routes (e.g. #/admin/...)
    // keep the old route-level behavior.
    const routeCount = {};
    links.forEach(a => {
      const m = (a.getAttribute("href") || "").match(/^#\/([^\/?#]+)/);
      const r = m ? m[1] : "";
      routeCount[r] = (routeCount[r] || 0) + 1;
    });
    links.forEach(a => {
      const href = a.getAttribute("href") || "";
      const m = href.match(/^#\/([^\/?#]+)/);
      const linkRoute = m ? m[1] : "";
      let on = linkRoute === target;
      if (on && routeCount[linkRoute] > 1) {
        on = hash === href || hash.startsWith(href + "/") || hash.startsWith(href + "?");
      }
      a.classList.toggle("active", on);
    });
  }
```

- [ ] **Step 6.3: Add the Console script tags to `index.html`** (Edit tool)

Replace:
```html
<script src="js/header-menus.js"></script>
<script src="js/app.js"></script>
```
with:
```html
<script src="js/header-menus.js"></script>
<script src="js/lib/echarts.min.js"></script>
<script src="js/console/console-data.js"></script>
<script src="js/console/console-charts.js"></script>
<script src="js/console/console-ui.js"></script>
<script src="js/console/console-screens-a12.js"></script>
<script src="js/console/console-screens-a345.js"></script>
<script src="js/console/console-host.js"></script>
<script src="js/app.js"></script>
```

(Console modules must precede `js/app.js` so `STEConsole` exists when boot dispatches an `#/analytics/*` initial hash.)

- [ ] **Step 6.4: Commit**

```bash
git add -A && git commit -m "feat: route #/analytics/* to Console host; load ECharts + console modules"
```

---

### Task 7: End-to-end browser verification (Playwright MCP)

No files. All checks must pass before claiming done.

- [ ] **Step 7.1: Licensor (HQ) pass** — default boot is HQ admin Min Jung.

1. `browser_navigate` → `file:///Users/ad0658/CodeAgent/sergio_tmp/ste-prototype-demo-20260605-1256/index.html`
2. `browser_snapshot`: sidebar shows an **Analytics** section with 5 items: Overview, Sales & Royalty, Distribution, Inventory, Marketing. The old single "Analytics" item is gone.
3. Click **Overview** → URL becomes `#/analytics/overview`; snapshot shows the Console dark-panel (`.ste-console`) inside the platform shell: filter bar (Licensee selector "STE Total", Calendar/Season axes, Actual/Plan seg) + "Portfolio Overview" page-head + KPI grid. Only the Overview nav item is `.active` (not all 5).
4. `browser_console_messages`: no errors.
5. Click each of the other 4 submenu items; for each: snapshot shows the right title ("Sales & Royalty", "Distribution", "Inventory", "Marketing") and `browser_evaluate` → `document.querySelectorAll('.ste-console canvas').length` ≥ 1 (ECharts mounted).
6. On Sales & Royalty, click the Licensee filter trigger and pick "BBUK" → KPIs re-render scoped to BBUK.
7. `browser_take_screenshot` of Overview for the record.

- [ ] **Step 7.2: Licensee pass** — switch role and confirm view-logic coupling.

1. `browser_evaluate`: `STE.setSession({ userId: 'usr_06e0bea9' }); location.hash = '#/analytics/overview'; location.reload();` (James Smith, BBUK licensee admin)
2. Snapshot: sidebar pill says **Licensee view**; Analytics submenu still visible; `.ste-console` now has class `mode-licensee` (light theme); filter bar shows the **locked** "Licensee A · Auto-scoped to your account" scope (no licensee picker); page title "My Overview"; pill shows `LICENSEE · A1`.
3. `browser_console_messages`: no errors.
4. Restore: `browser_evaluate`: `STE.setSession({ userId: 'usr_6bc7b45b' }); location.reload();`

- [ ] **Step 7.3: Regression spot-check** — legacy screens still fine after de-inline + nav edits: click Home, Sales Statements, Agreements, Admin; each renders, no console errors.

- [ ] **Step 7.4: Final commit**

```bash
git add -A && git commit -m "chore: verified Console analytics integration end-to-end (HQ + licensee)"
```

---

## Known acceptable trade-offs (by design, do not "fix" during execution)

- Console mock data (`STEData`, deterministic PRNG) ≠ prototype seed-derived numbers. The old Analytics screen already used a near-identical ported copy of this engine; numbers may differ slightly between the two (entity details diverged upstream). Fine for the demo.
- Licensee mode shows the Console's "Licensee A" anonymization (faithful port).
- Export PDF/Excel buttons remain toast-only stubs (as in the Console).
- `STEAnalytics` (legacy screen, 139K) stays loaded but unrouted — intentional, for easy restore.
- The Korean i18n DOM-walk (`translatePage`) may translate matching strings inside Console screens when language=ko; consistent with the rest of the app.
