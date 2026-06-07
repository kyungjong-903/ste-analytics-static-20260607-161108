# Analytics Spec Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the remaining Analytics menus, excluding the already-ported Sales & Royalty PoC, so Overview, Distribution, Inventory, and Marketing follow the delivered spec documents while keeping the static HTML deployment model.

**Architecture:** Keep `#/analytics/<sub>` and the existing `console-host.js` shell. Add a focused spec/data adapter layer that exposes document-shaped data to screen modules, then replace `a1`, `a3`, `a4`, and `a5` renderers in small steps. Sales & Royalty remains PoC-layout based and continues to use the current project data decision unless explicitly changed.

**Tech Stack:** Static HTML, vanilla JS, Apache ECharts, generated scoped CSS via `tools/build-console-css.mjs`. No localhost/dev server; verification uses Node syntax/static checks and GitHub Pages after push.

---

## Scope

### In Scope

- `Overview` (`#/analytics/overview`, `Screens.a1`)
- `Distribution` (`#/analytics/distribution`, `Screens.a3`)
- `Inventory` (`#/analytics/inventory`, `Screens.a4`)
- `Marketing` (`#/analytics/marketing`, `Screens.a5`)
- Shared filter/header consistency already established in `console-host.js`
- Shared data helpers needed to satisfy the specs

### Out of Scope

- Real PDF/Excel export implementation. Buttons remain stub/toast unless separately requested.
- Localhost/dev server verification.
- Rewriting non-Analytics product areas.
- Replacing the current Sales & Royalty PoC unless the user explicitly asks.

---

## Source Specs

- `docs/specs/STE_Analytics_Spec_Distribution.md`
- `docs/specs/STE_Analytics_Spec_Inventory.md`
- `docs/specs/STE_Analytics_Spec_Marketing.md`
- `docs/specs/STE_Analytics_MockData_SUGI_France.md`
- `docs/specs/STE_Analytics_Spec_Analysis.md`

Implementation note: the delivered specs are SUGI-France-oriented, but the current app supports Licensor and Licensee views. The implementation should use the existing selected entity/filter context and derive missing spec-only breakdowns deterministically so the UI is not SUGI-hardcoded unless the user later asks for strict SUGI-only data.

---

## Project Primer For First-Time Workers

Read this section before editing. It assumes no prior knowledge of this project.

### Repository And Deployment

- Working directory:

```bash
cd /Users/ad0658/CodeAgent/sergio_tmp/ste-prototype-demo-20260605-1256
```

- Main entry file: `index.html`
- Deployment model: static HTML/CSS/JS only.
- Do not start a localhost/dev server. The user explicitly wants static-file work.
- Static local check:

```bash
open "/Users/ad0658/CodeAgent/sergio_tmp/ste-prototype-demo-20260605-1256/index.html"
```

- Published URL:

```text
https://kyungjong-903.github.io/ste-analytics-static-20260607-161108/
```

- Git remote:

```bash
git remote -v
```

Expected remote owner/repo:

```text
kyungjong-903/ste-analytics-static-20260607-161108
```

### Product Shape

This is an STE Console prototype. It is not a framework app. There is no React/Vite build pipeline for the active static prototype. The app is a single `index.html` file that loads vanilla JS modules from `js/console/` and generated CSS from `css/console.css`.

Analytics routes are hash routes:

- `#/analytics/overview`
- `#/analytics/sales`
- `#/analytics/distribution`
- `#/analytics/inventory`
- `#/analytics/marketing`

The Analytics menu is hosted by `js/console/console-host.js`. The host owns the page header, breadcrumb, export buttons, role pill, filter bar, tab/sidebar active state, route parsing, and common state. Screen modules only render the content area for each Analytics submenu.

### Core Files To Read First

Read these files in this order:

1. `js/console/console-host.js`
   - Understand routing, filters, header actions, role state, and how `Screens[screenId].render(state)` / `Screens[screenId].init(state)` are called.

2. `js/console/console-data.js`
   - Understand the existing mock-data API. Important functions include `byId`, `salesFor`, `distributionFor`, `inventoryFor`, `marketingFor`, `money`, and `compact`.

3. `js/console/console-screens-a12.js`
   - Existing fallback screens for Overview (`a1`) and Sales & Royalty (`a2`).
   - Do not rewrite Sales & Royalty as part of this plan.

4. `js/console/console-screens-a345.js`
   - Existing fallback screens for Distribution (`a3`), Inventory (`a4`), and Marketing (`a5`).

5. `js/console/console-sales-royalty-sugi.js`
   - Already-ported Sales & Royalty PoC layout. Use only as a reference for visual density and filter behavior.

6. `tools/build-console-css.mjs`
   - Source of generated console CSS. If CSS changes are needed, edit this file and regenerate `css/console.css`.

### Existing Screen IDs

The app does not route screens by filename. It routes by screen ID:

| Route | Screen ID | Existing owner | New override file |
| --- | --- | --- | --- |
| `#/analytics/overview` | `a1` | `console-screens-a12.js` | `console-screen-overview-spec.js` |
| `#/analytics/sales` | `a2` | `console-screens-a12.js` + `console-sales-royalty-sugi.js` | out of scope |
| `#/analytics/distribution` | `a3` | `console-screens-a345.js` | `console-screen-distribution-spec.js` |
| `#/analytics/inventory` | `a4` | `console-screens-a345.js` | `console-screen-inventory-spec.js` |
| `#/analytics/marketing` | `a5` | `console-screens-a345.js` | `console-screen-marketing-spec.js` |

The override files load after the existing screen bundles. That lets each worker replace only one `window.Screens.<id>` object without editing the fallback bundle.

### Current UX Decisions Already Made

Do not revisit these decisions unless the user explicitly changes direction:

- Sales & Royalty is already ported to a PoC-style static screen.
- Real PDF/Excel export is excluded. Buttons can remain visible as non-real export actions.
- Analytics filter/header alignment has already been normalized:
  - title width and content width should align
  - PDF/Excel buttons live in the Analytics page header row
  - common filter bar stays directly under the header
  - `View` should remain in the same first-row position across Analytics screens
  - Sales-only extra filters may wrap to row 2
- Licensee account view uses the locked label `Scope`, not `Licensee`.
- Locked scope display should show `Licensee A`, not `SUGI France`.
- Licensor/HQ view can switch selected licensee via the Licensee dropdown.
- Sidebar role pills must update after account switching without page reload.

### Coding Rules For This Prototype

- Use plain JavaScript IIFEs:

```js
(function (global) {
  "use strict";
  // code
})(window);
```

- Expose shared globals only when intended, for example `global.STESpecModel` or `global.STESpecWidgets`.
- Do not introduce module bundlers, package installs, TypeScript, React, or runtime fetch calls.
- Keep generated/mock data deterministic. The static file must work from `file://`.
- Prefer existing helpers:
  - `STEData.money(value, entity).book`
  - `STEData.compact(value)`
  - `STEData.byId(entityId)`
  - `Charts` helpers where a matching chart already exists
- If a screen needs extra derived data during parallel work, keep it local in that screen override file. Do not edit shared model/widget files unless assigned the foundation or integration task.

### Verification Rules

Minimum syntax checks:

```bash
node --check js/console/console-host.js
node --check js/app.js
```

For a screen worker, also run:

```bash
node --check js/console/<owned-screen-file>.js
```

For CSS changes:

```bash
node tools/build-console-css.mjs
```

Manual static check:

```bash
open "/Users/ad0658/CodeAgent/sergio_tmp/ste-prototype-demo-20260605-1256/index.html"
```

Then navigate by changing the hash in the browser address bar, for example:

```text
file:///Users/ad0658/CodeAgent/sergio_tmp/ste-prototype-demo-20260605-1256/index.html#/analytics/distribution
```

Do not use `npm run dev`, `python -m http.server`, `vite`, or any local server command.

### Before Starting Any Task

Run:

```bash
git status --short
git pull --ff-only origin main
```

Expected:

- `git pull --ff-only origin main` succeeds.
- Any existing local changes are either yours or explicitly understood.
- If another worker already owns the file for your task, stop and coordinate before editing.

If working in parallel, start from the latest pushed `main` after the Foundation task has landed. Do not branch from an older local copy.

---

## File Structure

### Create

- `js/console/console-spec-model.js`
  - Responsibility: expose spec-shaped data helpers for overview/distribution/inventory/marketing.
  - Reads `window.STEData` and current console state inputs.
  - Derives document-required dimensions not currently present in `STEData`, such as account tiers, door movement pipeline, stock aging buckets, SNS channel metrics, campaign tables, compliance reviews.

- `js/console/console-spec-widgets.js`
  - Responsibility: reusable cards/tables/section headers for spec pages.
  - Keep chart creation in existing `window.Charts` where possible.
  - Avoid creating another global chart engine.

- `js/console/console-screen-overview-spec.js`
  - Responsibility: override only `window.Screens.a1` after the existing screen bundle loads.
  - Parallel owner: Overview worker only.

- `js/console/console-screen-distribution-spec.js`
  - Responsibility: override only `window.Screens.a3` after the existing screen bundle loads.
  - Parallel owner: Distribution worker only.

- `js/console/console-screen-inventory-spec.js`
  - Responsibility: override only `window.Screens.a4` after the existing screen bundle loads.
  - Parallel owner: Inventory worker only.

- `js/console/console-screen-marketing-spec.js`
  - Responsibility: override only `window.Screens.a5` after the existing screen bundle loads.
  - Parallel owner: Marketing worker only.

### Modify

- `index.html`
  - Add script tags for `console-spec-model.js`, `console-spec-widgets.js`, and the four screen override files.
  - Script order must be:
    - `console-data.js`
    - `console-charts.js`
    - `console-ui.js`
    - `console-spec-model.js`
    - `console-spec-widgets.js`
    - `console-screens-a12.js`
    - `console-sales-royalty-sugi.js`
    - `console-screens-a345.js`
    - `console-screen-overview-spec.js`
    - `console-screen-distribution-spec.js`
    - `console-screen-inventory-spec.js`
    - `console-screen-marketing-spec.js`
    - `console-host.js`

- `js/console/console-screens-a12.js`
  - Do not edit during parallel screen work.
  - Existing `a1` remains fallback until `console-screen-overview-spec.js` overrides it.
  - Leave `a2` Sales & Royalty mount logic intact.

- `js/console/console-screens-a345.js`
  - Do not edit during parallel screen work.
  - Existing `a3`, `a4`, `a5` remain fallbacks until per-screen override files replace them.

- `tools/build-console-css.mjs`
  - Add scoped CSS for spec cards, two-column sections, risk chips, drill tables, matrices, and AI insight blocks.
  - Regenerate `css/console.css`.

- `docs/superpowers/plans/2026-06-07-analytics-spec-refresh.md`
  - Track implementation progress.

---

## Parallel Work Protocol

Use this protocol if multiple sessions or agents work at once.

### Rule 1: Foundation First

One session must complete and merge/push these files before parallel screen work starts:

- `js/console/console-spec-model.js`
- `js/console/console-spec-widgets.js`
- `js/console/console-screen-overview-spec.js` as a stub
- `js/console/console-screen-distribution-spec.js` as a stub
- `js/console/console-screen-inventory-spec.js` as a stub
- `js/console/console-screen-marketing-spec.js` as a stub
- `index.html` script tags for all above files
- shared CSS in `tools/build-console-css.mjs` and generated `css/console.css`

Stub file pattern:

```js
(function (global) {
  "use strict";
  // Stub only. This file intentionally does not override window.Screens yet.
})(window);
```

This avoids later index/script-order conflicts.

### Rule 2: One Screen, One File

After foundation lands, each parallel worker owns exactly one screen file:

- Overview worker: `js/console/console-screen-overview-spec.js`
- Distribution worker: `js/console/console-screen-distribution-spec.js`
- Inventory worker: `js/console/console-screen-inventory-spec.js`
- Marketing worker: `js/console/console-screen-marketing-spec.js`

Workers must not edit these shared files during parallel screen work unless explicitly assigned as the integration owner:

- `index.html`
- `js/console/console-host.js`
- `js/console/console-screens-a12.js`
- `js/console/console-screens-a345.js`
- `js/console/console-spec-model.js`
- `js/console/console-spec-widgets.js`
- `tools/build-console-css.mjs`
- `css/console.css`

If a worker needs helper logic not present in `STESpecModel`, add it locally inside that worker's screen file. Consolidation can happen later in a single integration pass.

### Rule 3: Branch / Worktree Names

Recommended branch names:

```bash
git switch -c analytics-spec-foundation
git switch -c analytics-spec-overview
git switch -c analytics-spec-distribution
git switch -c analytics-spec-inventory
git switch -c analytics-spec-marketing
```

If using worktrees:

```bash
git worktree add ../ste-analytics-distribution -b analytics-spec-distribution main
git worktree add ../ste-analytics-inventory -b analytics-spec-inventory main
git worktree add ../ste-analytics-marketing -b analytics-spec-marketing main
git worktree add ../ste-analytics-overview -b analytics-spec-overview main
```

### Rule 4: Merge Order

Merge/push in this order:

1. Foundation
2. Distribution
3. Inventory
4. Marketing
5. Overview
6. Final consistency pass

The screen order after foundation is flexible, but only one branch should be merged at a time and verified on Pages before the next merge.

### Rule 5: Verification Per Worker

Every worker must run:

```bash
node --check js/console/<owned-screen-file>.js
node --check js/console/console-host.js
```

If the worker touches generated CSS, they must also run:

```bash
node tools/build-console-css.mjs
```

Do not start a local dev server. Static verification only.

---

## Data Contract

Create `window.STESpecModel` with these functions:

```js
window.STESpecModel = {
  context(state),
  overview(state),
  distribution(state),
  inventory(state),
  marketing(state),
};
```

Expected shape:

```js
{
  entity: { id, code, name, mode },
  period: { year, period, season, axis, label, view, channel },
  currency: "EUR",
  sales: { actual, plan, prior, vsPlan, vsYoY, hasActual },
  sections: { screenSpecificData: "screen-specific arrays and summary objects" }
}
```

Money values should use the same scale as current `STEData`: raw numbers in EUR/book currency for model output. UI formatting should use existing `STEData.money()` / `STEData.compact()` where possible.

---

## Task 1: Shared Spec Data Adapter

**Files:**
- Create: `js/console/console-spec-model.js`
- Modify: `index.html`

- [ ] **Step 1.1: Create model skeleton**

Add `js/console/console-spec-model.js`:

```js
(function (global) {
  "use strict";

  const D = () => global.STEData;

  function context(state) {
    const data = D();
    const ent = data.byId(state.entId);
    const channel = state.channel || null;
    const period = state.period || "ytd";
    return {
      entity: ent,
      mode: state.mode,
      year: state.year || "2026",
      period,
      season: state.season || "all",
      axis: state.axis || "calendar",
      view: state.view || "actual",
      channel,
      label: data.closeLabel ? data.closeLabel(period) : period.toUpperCase(),
    };
  }

  function base(state) {
    const data = D();
    const ctx = context(state);
    if (data.setContext) {
      data.setContext({
        season: ctx.axis === "season" ? ctx.season : "all",
        year: ctx.year,
        view: ctx.view,
        axis: ctx.axis,
      });
    }
    const sales = data.salesFor(ctx.entity.id, ctx.period, ctx.channel);
    return { ctx, sales };
  }

  function overview(state) {
    const { ctx, sales } = base(state);
    return { ctx, sales };
  }

  function distribution(state) {
    const { ctx, sales } = base(state);
    const dist = D().distributionFor(ctx.entity.id, ctx.period);
    return { ctx, sales, dist };
  }

  function inventory(state) {
    const { ctx, sales } = base(state);
    const inv = D().inventoryFor(ctx.entity.id, ctx.period);
    return { ctx, sales, inv };
  }

  function marketing(state) {
    const { ctx, sales } = base(state);
    const mkt = D().marketingFor(ctx.entity.id, ctx.period);
    return { ctx, sales, mkt };
  }

  global.STESpecModel = { context, overview, distribution, inventory, marketing };
})(window);
```

- [ ] **Step 1.2: Wire script into `index.html`**

Insert after `js/console/console-ui.js`:

```html
<script src="js/console/console-spec-model.js"></script>
```

- [ ] **Step 1.3: Verify**

Run:

```bash
node --check js/console/console-spec-model.js
node - <<'NODE'
const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
if (!html.includes('js/console/console-spec-model.js')) throw new Error('missing spec model script');
console.log('spec model script OK');
NODE
```

Expected: both commands pass.

- [ ] **Step 1.4: Commit**

```bash
git add index.html js/console/console-spec-model.js
git commit -m "Add analytics spec data adapter"
```

---

## Task 2: Shared Spec Widgets and CSS

**Files:**
- Create: `js/console/console-spec-widgets.js`
- Create: `js/console/console-screen-overview-spec.js`
- Create: `js/console/console-screen-distribution-spec.js`
- Create: `js/console/console-screen-inventory-spec.js`
- Create: `js/console/console-screen-marketing-spec.js`
- Modify: `index.html`, `tools/build-console-css.mjs`, `css/console.css`

- [ ] **Step 2.1: Create reusable widgets**

Create `js/console/console-spec-widgets.js`:

```js
(function (global) {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function sec(title, sub, right) {
    return `<div class="spec-sec-head"><div><h3>${esc(title)}</h3>${sub ? `<p>${esc(sub)}</p>` : ""}</div>${right || ""}</div>`;
  }

  function kpi(label, value, meta, tone) {
    return `<div class="card spec-kpi ${tone ? `tone-${tone}` : ""}">
      <div class="klabel">${esc(label)}</div>
      <div class="kval">${value}</div>
      <div class="kcur">${meta || ""}</div>
    </div>`;
  }

  function table(columns, rows) {
    return `<table class="tbl spec-table"><thead><tr>${columns.map(c => `<th class="${c.num ? "num" : ""}">${esc(c.label)}</th>`).join("")}</tr></thead><tbody>
      ${rows.map(row => `<tr>${columns.map(c => `<td class="${c.num ? "num" : ""}">${c.render ? c.render(row) : esc(row[c.key])}</td>`).join("")}</tr>`).join("")}
    </tbody></table>`;
  }

  function ai(lines) {
    return `<div class="card card-pad spec-ai">
      ${sec("AI Insights", "Auto-generated recommendations")}
      ${lines.map(line => `<div class="ai-line"><span class="sp">✦</span><span>${line}</span></div>`).join("")}
    </div>`;
  }

  global.STESpecWidgets = { esc, sec, kpi, table, ai };
})(window);
```

- [ ] **Step 2.2: Create per-screen override stubs**

Create each of these files with the same stub content:

- `js/console/console-screen-overview-spec.js`
- `js/console/console-screen-distribution-spec.js`
- `js/console/console-screen-inventory-spec.js`
- `js/console/console-screen-marketing-spec.js`

```js
(function (global) {
  "use strict";
  // Stub only. This file intentionally does not override window.Screens yet.
})(window);
```

- [ ] **Step 2.3: Wire scripts into `index.html`**

Insert `console-spec-widgets.js` after `console-spec-model.js`.

Insert the four override files after the existing screen bundles and before `console-host.js`:

```html
<script src="js/console/console-spec-widgets.js"></script>
<script src="js/console/console-screen-overview-spec.js"></script>
<script src="js/console/console-screen-distribution-spec.js"></script>
<script src="js/console/console-screen-inventory-spec.js"></script>
<script src="js/console/console-screen-marketing-spec.js"></script>
```

- [ ] **Step 2.4: Add scoped CSS**

Append to the integration override block in `tools/build-console-css.mjs`:

```css
.ste-console .spec-grid { display: grid; gap: 16px; }
.ste-console .spec-grid.g4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.ste-console .spec-grid.g3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.ste-console .spec-grid.g2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.ste-console .spec-sec-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 12px; }
.ste-console .spec-sec-head h3 { margin: 0; font-size: 14px; font-weight: 760; color: var(--ink); }
.ste-console .spec-sec-head p { margin: 4px 0 0; font-size: 12px; color: var(--ink-3); }
.ste-console .spec-kpi { padding: 18px 20px; min-height: 112px; }
.ste-console .spec-kpi.tone-risk { border-color: rgba(220,38,38,.28); background: linear-gradient(180deg, rgba(254,242,242,.8), #fff); }
.ste-console .spec-kpi.tone-ok { border-color: rgba(22,163,74,.25); }
.ste-console .spec-table td b { font-weight: 760; }
.ste-console .spec-ai { border-color: rgba(124,58,237,.22); background: linear-gradient(180deg, rgba(124,58,237,.07), rgba(124,58,237,.03)); }
@media (max-width: 1100px) {
  .ste-console .spec-grid.g4, .ste-console .spec-grid.g3, .ste-console .spec-grid.g2 { grid-template-columns: 1fr; }
}
```

- [ ] **Step 2.5: Regenerate CSS and verify**

```bash
node tools/build-console-css.mjs
node --check js/console/console-spec-widgets.js
node --check js/console/console-screen-overview-spec.js
node --check js/console/console-screen-distribution-spec.js
node --check js/console/console-screen-inventory-spec.js
node --check js/console/console-screen-marketing-spec.js
```

Expected: command prints a numeric `css/console.css bytes:` count, no syntax errors.

- [ ] **Step 2.6: Commit**

```bash
git add index.html js/console/console-spec-widgets.js js/console/console-screen-overview-spec.js js/console/console-screen-distribution-spec.js js/console/console-screen-inventory-spec.js js/console/console-screen-marketing-spec.js tools/build-console-css.mjs css/console.css
git commit -m "Add analytics spec widgets"
```

---

## Task 3: Distribution Page Spec Refresh

**Files:**
- Modify: `js/console/console-screen-distribution-spec.js`

Spec coverage:

- KPI tiles: Active Doors, Net Door Delta, Revenue per Door, Top 5 Concentration
- Main visualization: Door Movement Timeline, Tier Mix
- Geography: 10-country territory view and region grouping
- Account-level: Top 10 Accounts and concentration risk
- Door movement detail: new pipeline and closed analysis
- Productivity: tier revenue per door, distribution histogram, top/bottom doors
- Customer type distribution
- AI Distribution Insights

- [ ] **Step 3.1: Add deterministic distribution detail locally**

In `js/console/console-screen-distribution-spec.js`, add a local helper so this worker does not edit the shared model during parallel work:

```js
function distributionDetail(data) {
  const rows = [
    ["Galeries Lafayette", "Tier 1", "France", 0.14],
    ["KaDeWe", "Tier 1", "Germany", 0.10],
    ["Printemps", "Tier 1", "France", 0.08],
    ["Inno", "Tier 2", "Belgium", 0.06],
    ["Bijenkorf", "Tier 2", "Netherlands", 0.05],
    ["Manor", "Tier 2", "Switzerland", 0.04],
    ["Peek & Cloppenburg", "Tier 2", "Germany", 0.04],
    ["Sport 2000 FR", "Tier 3", "France", 0.035],
    ["El Corte Sport", "Tier 3", "France", 0.03],
    ["Local Specialty", "Tier 3", "Benelux", 0.025],
  ];
  return rows.map(([name, tier, country, share]) => ({
    name,
    tier,
    country,
    sales: data.sales.netSales * share,
    doors: Math.max(1, Math.round(data.dist.active * share * 1.8)),
  }));
}
```

- [ ] **Step 3.2: Override `Screens.a3.render`**

In `js/console/console-screen-distribution-spec.js`, replace the stub with an override:

```js
(function (global) {
  "use strict";

  const D = () => global.STEData;
  const model = () => global.STESpecModel;
  const widgets = () => global.STESpecWidgets;

  function distributionDetail(data) {
    const rows = [
      ["Galeries Lafayette", "Tier 1", "France", 0.14],
      ["KaDeWe", "Tier 1", "Germany", 0.10],
      ["Printemps", "Tier 1", "France", 0.08],
      ["Inno", "Tier 2", "Belgium", 0.06],
      ["Bijenkorf", "Tier 2", "Netherlands", 0.05],
      ["Manor", "Tier 2", "Switzerland", 0.04],
      ["Peek & Cloppenburg", "Tier 2", "Germany", 0.04],
      ["Sport 2000 FR", "Tier 3", "France", 0.035],
      ["El Corte Sport", "Tier 3", "France", 0.03],
      ["Local Specialty", "Tier 3", "Benelux", 0.025],
    ];
    return rows.map(([name, tier, country, share]) => ({
      name,
      tier,
      country,
      sales: data.sales.netSales * share,
      doors: Math.max(1, Math.round(data.dist.active * share * 1.8)),
    }));
  }

  global.Screens = global.Screens || {};
  global.Screens.a3 = {
    title: "Distribution",
    render(s) {
      const data = model().distribution(s);
      const W = widgets();
      const accounts = distributionDetail(data);
      const money = (v) => D().money(v, data.ctx.entity).book;
      return `
        <div class="spec-grid g4">
          ${W.kpi("Active Doors", `${data.dist.active}`, `<span class="muted">Plan ${data.dist.planDoors || 420}</span>`)}
          ${W.kpi("Net Door Delta", `${data.dist.netDelta >= 0 ? "+" : ""}${data.dist.netDelta}`, `<span class="muted">New +${data.dist.newD} / Closed -${data.dist.closeD}</span>`, data.dist.netDelta >= 0 ? "ok" : "risk")}
          ${W.kpi("Revenue / Door", money(data.dist.revPerDoor), `<span class="muted">Period average</span>`)}
          ${W.kpi("Top 5 Concentration", `${data.dist.top5}%`, `<span class="muted">Risk watch above 45%</span>`, data.dist.top5 > 45 ? "risk" : "")}
        </div>
        <div class="spec-grid g2 mt-16">
          <div class="card card-pad">${W.sec("Door Movement Timeline", "Existing / New / Closed doors")}<div id="dist-door-timeline" class="chart" style="height:280px"></div></div>
          <div class="card card-pad">${W.sec("Tier Mix", "Door mix by account tier")}<div id="dist-tier-mix" class="chart" style="height:280px"></div></div>
        </div>
        <div class="card card-pad mt-16">${W.sec("Top 10 Accounts", "Account-level sales and door contribution")}
          ${W.table([{label:"Account",key:"name"},{label:"Tier",key:"tier"},{label:"Country",key:"country"},{label:"Sales",key:"sales",num:true,render:r=>money(r.sales)},{label:"Doors",key:"doors",num:true}], accounts)}
        </div>
        ${W.ai(["Top 5 concentration remains below the risk threshold.", "Tier 1 productivity is strongest; expand carefully in DACH.", "Closed doors are concentrated in low-productivity Tier 3 accounts."])}
      `;
    },
    init() {}
  };
})(window);
```

- [ ] **Step 3.3: Implement `Screens.a3.init`**

Use existing `Charts` helpers where possible. If no exact helper exists, use direct `echarts.init` consistently with local chart IDs. Keep all charts guarded:

```js
const door = document.getElementById("dist-door-timeline");
if (door && window.echarts) { /* setOption with months/new/closed/active */ }
```

- [ ] **Step 3.4: Verify**

```bash
node --check js/console/console-screen-distribution-spec.js
node --check js/console/console-host.js
```

Then open the static file manually:

```bash
open "/Users/ad0658/CodeAgent/sergio_tmp/ste-prototype-demo-20260605-1256/index.html"
```

Navigate to `#/analytics/distribution`. Expected: no duplicate filter, 4 KPI tiles, at least 2 charts, account table, AI insight card.

- [ ] **Step 3.5: Commit**

```bash
git add js/console/console-screen-distribution-spec.js
git commit -m "Refresh Distribution analytics spec page"
```

---

## Task 4: Inventory Page Spec Refresh

**Files:**
- Modify: `js/console/console-screen-inventory-spec.js`

Spec coverage:

- KPI tiles: Stock Value, Stock-to-Sales, Aged %, Turnover
- Main matrix: Category × Season
- Composition: Category, Sub-category, Season
- Risk flags: Stockout Candidates, Markdown Candidates
- Stock Value trend
- QoQ movement waterfall
- Geography by country
- Age distribution
- AI Inventory Insights

- [ ] **Step 4.1: Add deterministic inventory detail locally**

In `js/console/console-screen-inventory-spec.js`, add deterministic arrays inside local helpers so this worker does not edit the shared model during parallel work:

```js
const seasonStock = [
  { season: "SS26", value: inv.stockValue * 0.54, status: "Fresh" },
  { season: "FW25", value: inv.stockValue * 0.23, status: "Sell-through" },
  { season: "SS25", value: inv.stockValue * 0.10, status: "Markdown" },
  { season: "Older", value: inv.stockValue * 0.05, status: "Clearance" },
  { season: "FW26", value: inv.stockValue * 0.08, status: "Pre-launch" },
];
const markdown = [
  { sku: "ST-25-007", name: "Ski Pants Race", category: "WEAR / OUTER", stock: 84, aged: 262, value: inv.stockValue * 0.018 },
  { sku: "ST-25-052", name: "Dress Court Pleat", category: "WEAR / INNER", stock: 120, aged: 240, value: inv.stockValue * 0.014 },
  { sku: "ST-25-014", name: "Leggings Print", category: "WEAR / BOTTOM", stock: 160, aged: 221, value: inv.stockValue * 0.013 },
];
const stockout = [
  { sku: "ST-26-001", name: "Classic Polo White", category: "WEAR / POLO", weeks: 2.1, sellThrough: "High" },
  { sku: "ST-26-014", name: "Heritage Track Top Navy", category: "WEAR / TRACKTOP", weeks: 2.8, sellThrough: "High" },
  { sku: "ST-26-021", name: "Pique Polo Navy", category: "WEAR / POLO", weeks: 3.0, sellThrough: "Medium" },
];
```

- [ ] **Step 4.2: Override `Screens.a4.render`**

In `js/console/console-screen-inventory-spec.js`, define this concrete structure:

```js
global.Screens = global.Screens || {};
global.Screens.a4 = {
  title: "Inventory",
  render(s) {
    const data = global.STESpecModel.inventory(s);
    const W = global.STESpecWidgets;
    const ent = data.ctx.entity;
    const money = (value) => global.STEData.money(value, ent).book;
    const details = inventoryDetail(data.inv);
    return `
      <div class="spec-grid g4">
        ${W.kpi("Stock Value", money(data.inv.stockValue), `<span class="muted">Current inventory</span>`)}
        ${W.kpi("Stock-to-Sales", `${data.inv.stockToSales.toFixed(1)}mo`, `<span class="muted">Target 3.0 months or below</span>`, data.inv.stockToSales > 3 ? "risk" : "ok")}
        ${W.kpi("Aged Stock %", `${data.inv.aged}%`, `<span class="muted">180+ days</span>`, data.inv.aged > 20 ? "risk" : "")}
        ${W.kpi("Turnover", `${data.inv.turn.toFixed(1)}x`, `<span class="muted">YTD velocity</span>`)}
      </div>
      <div class="spec-grid g2 mt-16">
        <div class="card card-pad">${W.sec("Category x Season Matrix", "Stock value and aging risk")}<div id="inv-matrix" class="chart" style="height:300px"></div></div>
        <div class="card card-pad">${W.sec("Stock Value Trend", "Actual inventory value")}<div id="inv-stock-trend" class="chart" style="height:300px"></div></div>
      </div>
      <div class="spec-grid g2 mt-16">
        <div class="card card-pad">${W.sec("Stockout Candidates", "High sell-through with low coverage")}${W.table([{ label:"SKU", key:"sku" }, { label:"Product", key:"name" }, { label:"Weeks", key:"weeks", num:true }, { label:"Sell-through", key:"sellThrough" }], details.stockout)}</div>
        <div class="card card-pad">${W.sec("Markdown Candidates", "Aged inventory requiring action")}${W.table([{ label:"SKU", key:"sku" }, { label:"Product", key:"name" }, { label:"Aged Days", key:"aged", num:true }, { label:"Value", key:"value", num:true, render:r=>money(r.value) }], details.markdown)}</div>
      </div>
      <div class="spec-grid g2 mt-16">
        <div class="card card-pad">${W.sec("Age Distribution", "Inventory by aging bucket")}<div id="inv-age-dist" class="chart" style="height:280px"></div></div>
        <div class="card card-pad">${W.sec("Country Inventory", "Stock value by geography")}<div id="inv-country" class="chart" style="height:280px"></div></div>
      </div>
      ${W.ai(["Aged stock is concentrated in older seasonal styles.", "Markdown candidates should be reviewed before the next buy cycle.", "Fast-moving polo and tracktop styles need replenishment checks."])}
    `;
  },
  init(s) {
    renderInventoryCharts(s);
  }
};
```

Render KPI grid, matrix card, risk tables, age distribution card, geography card, AI card. Use `STESpecModel.inventory(s)` as the base data and keep any Inventory-only derived arrays local to this file.

- [ ] **Step 4.3: Implement `Screens.a4.init`**

Chart IDs:

- `inv-matrix`
- `inv-stock-trend`
- `inv-age-dist`
- `inv-country`

Expected chart types:

- heatmap for matrix
- two-line chart for stock trend
- histogram/bar for age distribution
- horizontal bar for country inventory

- [ ] **Step 4.4: Verify**

```bash
node --check js/console/console-screen-inventory-spec.js
node --check js/console/console-host.js
```

Static manual route: `#/analytics/inventory`. Expected: 4 KPIs, matrix, stockout/markdown tables, AI insights. Plan mode should not crash; if inventory plan is absent, show the existing no-plan state or a spec-friendly empty state.

- [ ] **Step 4.5: Commit**

```bash
git add js/console/console-screen-inventory-spec.js
git commit -m "Refresh Inventory analytics spec page"
```

---

## Task 5: Marketing Page Spec Refresh

**Files:**
- Modify: `js/console/console-screen-marketing-spec.js`

Spec coverage:

- KPI tiles: Spend, vs Plan, ROI, Brand Compliance
- Main visualization: Spend pacing quarterly bars, Channel mix donut
- SNS performance tracking by month
- Brand vs Performance split
- Campaign performance: top and bottom
- Geography distribution
- Brand compliance tracker
- Customer type distribution
- AI Marketing Insights

- [ ] **Step 5.1: Add deterministic marketing detail locally**

In `js/console/console-screen-marketing-spec.js`, add deterministic channel and campaign helpers locally so this worker does not edit the shared model during parallel work:

```js
const channels = [
  { name: "Instagram", spend: mkt.spend * 0.32, reach: mkt.reach * 0.36, roi: 4.2 },
  { name: "TikTok", spend: mkt.spend * 0.23, reach: mkt.reach * 0.28, roi: 4.6 },
  { name: "OOH", spend: mkt.spend * 0.14, reach: mkt.reach * 0.12, roi: 2.8 },
  { name: "Event", spend: mkt.spend * 0.12, reach: mkt.reach * 0.10, roi: 3.4 },
  { name: "Print", spend: mkt.spend * 0.08, reach: mkt.reach * 0.06, roi: 2.1 },
];
const campaigns = [
  { name: "SS26 Court Revival", channel: "Instagram", spend: mkt.spend * 0.18, roi: 5.1, status: "Scale" },
  { name: "TikTok Heritage Drop", channel: "TikTok", spend: mkt.spend * 0.14, roi: 4.8, status: "Scale" },
  { name: "OOH Paris Tennis", channel: "OOH", spend: mkt.spend * 0.10, roi: 2.2, status: "Review" },
];
```

- [ ] **Step 5.2: Override `Screens.a5.render`**

In `js/console/console-screen-marketing-spec.js`, define this concrete structure:

```js
global.Screens = global.Screens || {};
global.Screens.a5 = {
  title: "Marketing",
  render(s) {
    const data = global.STESpecModel.marketing(s);
    const W = global.STESpecWidgets;
    const ent = data.ctx.entity;
    const money = (value) => global.STEData.money(value, ent).book;
    const details = marketingDetail(data.mkt);
    const budgetPace = data.mkt.spendPlan ? (data.mkt.spend / data.mkt.spendPlan * 100) : 0;
    const brandCompliance = Math.max(0, 100 - data.mkt.violations * 4);
    return `
      <div class="spec-grid g4">
        ${W.kpi("Spend", money(data.mkt.spend), `<span class="muted">YTD marketing spend</span>`)}
        ${W.kpi("Budget Pace", `${budgetPace.toFixed(0)}%`, `<span class="muted">Actual vs plan</span>`, budgetPace > 105 ? "risk" : "ok")}
        ${W.kpi("ROI", `${data.mkt.roi.toFixed(1)}x`, `<span class="muted">Attributed return</span>`)}
        ${W.kpi("Brand Compliance", `${brandCompliance}%`, `<span class="muted">${data.mkt.violations} issues to clear</span>`, brandCompliance < 90 ? "risk" : "ok")}
      </div>
      <div class="spec-grid g2 mt-16">
        <div class="card card-pad">${W.sec("Spend Pacing", "Quarterly actual vs plan")}<div id="mkt-spend-pacing" class="chart" style="height:300px"></div></div>
        <div class="card card-pad">${W.sec("Channel Mix", "Spend and reach contribution")}<div id="mkt-channel-mix" class="chart" style="height:300px"></div></div>
      </div>
      <div class="spec-grid g2 mt-16">
        <div class="card card-pad">${W.sec("SNS Monthly Performance", "Reach, engagement, and ROI")}<div id="mkt-sns-monthly" class="chart" style="height:280px"></div></div>
        <div class="card card-pad">${W.sec("Geography Distribution", "Spend by territory")}<div id="mkt-geo" class="chart" style="height:280px"></div></div>
      </div>
      <div class="card card-pad mt-16">${W.sec("Campaign Performance", "Top campaigns and actions")}
        ${W.table([{ label:"Campaign", key:"name" }, { label:"Channel", key:"channel" }, { label:"Spend", key:"spend", num:true, render:r=>money(r.spend) }, { label:"ROI", key:"roi", num:true, render:r=>`${r.roi}x` }, { label:"Action", key:"status" }], details.campaigns)}
      </div>
      ${W.ai(["TikTok and Instagram are the strongest ROI channels.", "OOH needs review before additional spend is approved.", "Brand compliance should stay visible as campaigns scale."])}
    `;
  },
  init(s) {
    renderMarketingCharts(s);
  }
};
```

Render KPI grid, spend pacing chart card, channel mix card, campaign tables, compliance tracker, AI card. Use `STESpecModel.marketing(s)` as the base data and keep Marketing-only derived arrays local to this file.

- [ ] **Step 5.3: Implement `Screens.a5.init`**

Chart IDs:

- `mkt-spend-pacing`
- `mkt-channel-mix`
- `mkt-sns-monthly`
- `mkt-geo`

- [ ] **Step 5.4: Verify**

```bash
node --check js/console/console-screen-marketing-spec.js
node --check js/console/console-host.js
```

Static manual route: `#/analytics/marketing`. Expected: 4 KPIs, spend pacing, channel mix, campaign table, compliance tracker, AI insights.

- [ ] **Step 5.5: Commit**

```bash
git add js/console/console-screen-marketing-spec.js
git commit -m "Refresh Marketing analytics spec page"
```

---

## Task 6: Overview Page Spec Refresh

**Files:**
- Modify: `js/console/console-screen-overview-spec.js`

Spec coverage from mock data quick reference:

- Overview KPI summary
- Headline KPIs for Sales, Distribution, Inventory, Marketing
- Quick mix: channel/category/customer/territory
- Performance highlights
- AI overview insights
- Drill-through cards into each detail route

- [ ] **Step 6.1: Compose overview data locally**

In `js/console/console-screen-overview-spec.js`, compose the existing model functions locally:

```js
function overviewBundle(state) {
  const model = window.STESpecModel;
  const base = model.overview(state);
  return {
    ctx: base.ctx,
    sales: base.sales,
    distribution: model.distribution(state),
    inventory: model.inventory(state),
    marketing: model.marketing(state),
  };
}
```

This keeps Overview independent from shared model edits during parallel work.

- [ ] **Step 6.2: Override `Screens.a1.render`**

In `js/console/console-screen-overview-spec.js`, define this concrete structure:

```js
global.Screens = global.Screens || {};
global.Screens.a1 = {
  title: "Overview",
  render(s) {
    const data = overviewBundle(s);
    const W = global.STESpecWidgets;
    const ent = data.ctx.entity;
    const money = (value) => global.STEData.money(value, ent).book;
    return `
      <div class="spec-grid g4">
        ${W.kpi("Net Sales", money(data.sales.netSales), `<span class="muted">Analytics summary</span>`)}
        ${W.kpi("Active Doors", `${data.distribution.dist.active}`, `<span class="muted">Distribution</span>`)}
        ${W.kpi("Stock Value", money(data.inventory.inv.stockValue), `<span class="muted">Inventory</span>`)}
        ${W.kpi("Marketing ROI", `${data.marketing.mkt.roi}x`, `<span class="muted">Marketing</span>`)}
      </div>
      <div class="spec-grid g4 mt-16">
        <div class="card hero qmix" data-go="a2"><b>Sales & Royalty</b><span>Review sales, royalty, variance, and minimum guarantee.</span></div>
        <div class="card hero qmix" data-go="a3"><b>Distribution</b><span>Review doors, account tiers, geography, and concentration.</span></div>
        <div class="card hero qmix" data-go="a4"><b>Inventory</b><span>Review stock value, aging risk, stockout, and markdown candidates.</span></div>
        <div class="card hero qmix" data-go="a5"><b>Marketing</b><span>Review spend, ROI, channels, campaigns, and compliance.</span></div>
      </div>
      ${W.ai(["Sales performance, distribution quality, inventory health, and marketing ROI should be read together.", "Use the detail cards to drill into the operational source of each variance."])}
    `;
  },
  init() {}
};
```

Render:

- headline KPI grid
- domain cards linking to `#/analytics/sales`, `#/analytics/distribution`, `#/analytics/inventory`, `#/analytics/marketing`
- quick mix cards
- AI insight card

Each domain card must retain existing `data-go` behavior so navigation stays intact:

```html
<div class="card hero qmix" data-go="a3"><b>Distribution</b><span>Review door movement and account concentration.</span></div>
```

- [ ] **Step 6.3: Verify**

```bash
node --check js/console/console-screen-overview-spec.js
node --check js/console/console-host.js
```

Static manual route: `#/analytics/overview`. Expected: cards navigate to submenus and active sidebar state remains correct.

- [ ] **Step 6.4: Commit**

```bash
git add js/console/console-screen-overview-spec.js
git commit -m "Refresh Overview analytics spec page"
```

---

## Task 7: Cross-Screen Consistency Pass

**Files:**
- Modify: `js/console/console-host.js`
- Modify: `tools/build-console-css.mjs`, `css/console.css`

- [ ] **Step 7.1: Verify filter layout on all Analytics menus**

Manual static routes:

- `#/analytics/overview`
- `#/analytics/sales`
- `#/analytics/distribution`
- `#/analytics/inventory`
- `#/analytics/marketing`

Expected:

- Header title width aligns with content cards.
- PDF/Excel buttons are always in the header row.
- Common filters occupy the same host location.
- `View` control stays on the first row.
- Additional Sales-only filters can wrap to row 2 without moving `View`.

- [ ] **Step 7.2: Verify Licensor/Licensee role consistency**

Manual checks:

- Login/switch to Min Jung/HQ.
- Visit every Analytics submenu.
- Sidebar pill reads `Licensor view` everywhere.
- Admin menu is visible everywhere.
- Switch to James/licensee without reload.
- Sidebar pill reads `Licensee view` everywhere.
- Admin menu is hidden everywhere.

- [ ] **Step 7.3: Static checks**

```bash
node tools/build-console-css.mjs
node --check js/console/console-spec-model.js
node --check js/console/console-spec-widgets.js
node --check js/console/console-screen-overview-spec.js
node --check js/console/console-screen-distribution-spec.js
node --check js/console/console-screen-inventory-spec.js
node --check js/console/console-screen-marketing-spec.js
node --check js/console/console-host.js
node --check js/app.js
```

Expected: all pass.

- [ ] **Step 7.4: Commit**

```bash
git add js/console/console-host.js tools/build-console-css.mjs css/console.css
git commit -m "Polish analytics spec page consistency"
```

---

## Task 8: Push and Pages Verification

**Files:** no source edits unless verification finds an issue.

- [ ] **Step 8.1: Push**

```bash
git push origin main
```

- [ ] **Step 8.2: Confirm GitHub Pages build**

```bash
for i in 1 2 3 4 5 6; do
  build_status=$(gh api repos/kyungjong-903/ste-analytics-static-20260607-161108/pages/builds/latest --jq '.status')
  build_commit=$(gh api repos/kyungjong-903/ste-analytics-static-20260607-161108/pages/builds/latest --jq '.commit[0:7]')
  echo "status=$build_status commit=$build_commit"
  [ "$build_status" = "built" ] && exit 0
  sleep 5
done
exit 0
```

Expected: latest commit reaches `status=built`.

- [ ] **Step 8.3: Final static URL**

Use:

```text
https://kyungjong-903.github.io/ste-analytics-static-20260607-161108/
```

---

## Execution Order

Recommended order:

1. Task 1: shared data adapter
2. Task 2: shared widgets/CSS
3. Task 3: Distribution
4. Task 4: Inventory
5. Task 5: Marketing
6. Task 6: Overview
7. Task 7: consistency pass
8. Task 8: push/build verification

This order keeps each commit independently testable and avoids a large all-at-once rewrite of the existing fallback screen bundles.

---

## Risks and Decisions

- **Data fidelity risk:** specs are SUGI-France-specific, while the current app supports all licensees. Use existing `STEData` as the base and deterministic spec-shaped derived data for missing dimensions. If strict SUGI-only data is later required, switch `STESpecModel` to a SUGI fixture mode behind one flag instead of rewriting screens.
- **Chart blank risk:** every new chart ID must be rendered before `init()` runs. Keep chart creation inside each `a*.init()`.
- **CSS drift risk:** edit `tools/build-console-css.mjs`, then regenerate `css/console.css`; do not hand-edit generated CSS only.
- **Static hosting constraint:** do not start localhost. Verify via static file open and GitHub Pages build.

---

## Self-Review

- Distribution spec sections map to Task 3.
- Inventory spec sections map to Task 4.
- Marketing spec sections map to Task 5.
- Overview quick reference and cross-links map to Task 6.
- Shared layout/filter/export consistency maps to Task 7.
- Export remains stub by explicit prior user instruction that real export can be excluded.
