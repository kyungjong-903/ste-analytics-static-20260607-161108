# STE Analytics Specs — Intake Analysis

Date: 2026-06-07

Imported from `/Users/ad0658/Downloads` into `docs/specs/`:

- `STE_Analytics_MockData_SUGI_France.md`
- `STE_Analytics_Spec_Sales_Royalty.md`
- `STE_Analytics_Spec_Distribution.md`
- `STE_Analytics_Spec_Inventory.md`
- `STE_Analytics_Spec_Marketing.md`

## 1. What Each File Is

### `STE_Analytics_MockData_SUGI_France.md`

This is the SUGI France baseline data source for the Analytics module. It defines exact values for:

- Monthly net sales for 2024, 2025, and 2026 through May
- Period-level actual/plan/prior values
- Season-level actual/plan values
- Royalty at 10% with annual minimum EUR 1.0M
- Distribution summary: 386 / 420 active doors, net +11, top 5 concentration 42%
- Inventory summary: EUR 3.9M stock, 3.6 months stock-to-sales, 23% aged
- Marketing summary: EUR 547K spend, ROI 3.9x, 0 issues
- Geography, category, gender, customer type, in-territory compliance, AI insights

This file is the most important if the goal is numeric fidelity. The current app does not use these exact values yet.

### `STE_Analytics_Spec_Sales_Royalty.md`

This is the functional/detail-page spec for Sales & Royalty. It defines:

- Licensee context: SUGI France, 10 countries, WEAR + ACC, EUR, out-of-territory flag
- Category hierarchy: CATEGORY -> SUB_CATEGORY -> PRODUCT CATEGORY
- 4 sub-tabs: Net Sales, Royalty, Variance Analysis, vs Contract Minimum
- Shared filter inheritance from Overview
- Wholesale/Retail toggle and Country Region filter
- Required Net Sales breakdowns: season contribution, geography, region grouping, geo x product matrix, category drill-down, customer type, tier, gender, territory compliance, top/bottom 20 SKU
- Required chart behavior: 3-Line Always-On (Actual + Plan + Prior Year)
- Required variance and contract-minimum views

### `STE_Analytics_Spec_Distribution.md`

This is the functional/detail-page spec for Distribution. It defines:

- Licensee context: SUGI France, 10 countries, WEAR + ACC, EUR, wholesale-centered distribution
- Sticky filter bar plus Tier filter
- KPI tiles: Active Doors, Net Door Delta, Revenue per Door, Top 5 Concentration
- Main visualizations: Door Movement Timeline (3-line), Tier Mix
- Geographic Distribution across 10 territory countries and four regions
- Account-level analysis: Top 10 accounts, top 5/10/20 concentration
- Door movement: New/Closed pipeline and waterfall
- Productivity analysis: revenue per door by tier, histogram, top/bottom doors
- Customer type distribution
- AI Distribution Insights

### `STE_Analytics_Spec_Inventory.md`

This is the functional/detail-page spec for Inventory. It defines:

- Licensee context: SUGI France, 10 countries, WEAR + ACC, EUR
- Data cadence: quarter-end inventory snapshots
- Inventory has no plan concept; Plan mode must show "Plan data not applicable for Inventory" and remain Actual
- Stock Value / Stock Units toggle
- KPI tiles: Stock Value, Stock-to-Sales, Inventory Turn, Aged Inventory %
- Main visualization: Category x Season Matrix with cell-level drill-down
- Stock composition by category, sub-category, and season
- Stockout candidates and markdown candidates
- Stock Value trend: 2-line chart only (Actual + Prior Year)
- Quarter-over-quarter movement waterfall
- Country-level inventory distribution across the 10 territory countries
- Age distribution and AI inventory insights

### `STE_Analytics_Spec_Marketing.md`

This is the functional/detail-page spec for Marketing. It defines:

- Licensee context: SUGI France, 10 countries, WEAR + ACC, EUR
- Marketing scope: in-territory only
- Data cadence: Season Plan + Monthly Actual
- Budget basis: performance marketing = Net Sales x 10%; Brand and Photography separate
- Marketing Type filter: All / Brand / Performance / Photography
- KPI tiles: Total Spend, vs Plan, ROI/ROAS, Brand Compliance
- Spend Pacing: quarterly bar + plan/prior overlay
- Channel Mix donut
- SNS tracking for Instagram / TikTok / X with monthly cumulative Actual + Plan + Prior Year
- Brand vs Performance vs Photography breakdown
- Campaign performance tables: top ROI and bottom performers
- Country-level marketing distribution across the 10 territories
- Brand Compliance tracker
- Customer Type distribution by marketing spend
- AI marketing insights

## 2. Current Implementation Match

Current Analytics implementation lives mostly in:

- `js/console/console-data.js`
- `js/console/console-screens-a12.js`
- `js/console/console-screens-a345.js`
- `js/console/console-host.js`

### Already Present

Sales & Royalty:

- 4 sub-tabs exist: Net Sales, Royalty, Variance Analysis, vs Contract Minimum
- Wholesale / Retail / All channel toggle exists
- Net Sales KPI tiles exist
- Royalty KPI and chart exist
- Plan attainment heatmap exists
- Contract minimum view exists
- Customer Type, Gender, and In-Territory sections exist as Overview drill anchors
- PDF / Excel buttons exist, but currently only show toast placeholders

Distribution:

- KPI tiles exist: Active Doors, Net Door Delta, Revenue / Door, Top 5
- Tier table exists
- Channel Type Mix exists
- Active Doors cumulative chart exists
- Quarterly Revenue by Door Network chart exists
- Country Distribution section exists
- AI-like insights exist in the broader data layer

Overview / Mock baseline:

- Overview has Sales, Royalty, Distribution, Inventory, Marketing hero cards
- Quick Mix and performance highlights exist
- Entity selector supports `Sugi France`
- Licensee mode is scoped by original STE role logic

## 3. Main Gaps Against Specs

### Gap A — Exact SUGI France Numbers Are Not Wired

Current `STEData` uses seeded synthetic data:

- `sugifr.annual = 5_600_000`
- monthly/period values are generated by season weights + seeded random noise
- territory list for `sugifr` is currently only `France`, `Monaco`, `Belgium`

The spec requires SUGI France to show EUR 13.7M YTD net sales, EUR 493K royalty, 386 active doors, 10 territories, etc.

Impact: the UI structure is directionally close, but numbers will not match the supplied mock data.

### Gap B — Territory Scope Is Too Small

Spec territory:

- France
- Germany
- Belgium
- Netherlands
- Switzerland
- Austria
- Luxembourg
- Morocco
- Tunisia
- Algeria

Current `COUNTRIES.sugifr`:

- France
- Monaco
- Belgium

Distribution and Sales geography need this corrected first.

### Gap C — Sales & Royalty Detail Is Missing Several Required Deep Sections

Partially present:

- sub-tabs
- KPI cards
- charts
- category/channel/country-style breakdowns

Missing or shallow:

- SUGI-specific 10-country geography and region grouping
- Geo x Product Matrix table/heatmap toggle
- true 3-level category drill-down (CATEGORY -> SUB_CATEGORY -> PRODUCT CATEGORY)
- Top 20 / Bottom 20 SKU tables with margin fields
- out-of-territory investigation detail
- Country Region filter
- explicit Season Contribution chart using supplied SUGI season numbers
- YoY driver waterfall / top positive-negative drivers

### Gap D — Distribution Detail Is Missing Account/Door-Level Depth

Partially present:

- KPI cards
- tier table
- cumulative active door line
- country distribution section

Missing or shallow:

- Active / Plan KPI display as `386 / 420`
- Tier filter
- 10-country territory breakdown with exact doors and EUR values
- region grouping card
- top 10 accounts with named accounts such as Galeries Lafayette, KaDeWe, Printemps
- concentration risk text and top 5/10/20 ratios
- New Doors Pipeline table
- Closed Doors Analysis table
- movement waterfall
- revenue-per-door histogram
- top/bottom performing doors
- customer type distribution using spec values

### Gap E — Export Buttons Are Placeholders

`console-host.js` renders PDF and Excel buttons, but click handling currently only calls `STEApp.toast(...)`.

This matches demo tolerance but not the spec's export requirement.

### Gap F — Inventory Page Is Structurally Present but Spec-Depth Is Shallow

Current `a4` page already has:

- KPI tiles: Stock Value, Stock-to-Sales, Inventory Turn, Aged Inventory
- Category x Season heatmap
- Stockout and markdown summary cards
- Quarterly Stock Snapshot chart
- Inventory Movement table

Missing or shallow:

- Stock Value / Stock Units toggle
- explicit Plan mode N/A guard at page level
- exact SUGI values: EUR 3.9M, 3.6 months, 2.5x, 23%
- matrix cell hover details: stock value, units, aged days, sell-through, top 3 SKU
- matrix drill-down to SUB_CATEGORY and PRODUCT CATEGORY
- stock composition donuts/bars by category/sub-category/season
- full stockout SKU table
- full markdown candidate SKU table
- exact 2-line stock trend with actual + prior year only
- exact waterfall values: beginning EUR 4.3M, inbound EUR 1.8M, returns EUR 0.2M, sold EUR 2.1M, adjustments EUR 0.3M, ending EUR 3.9M
- 10-country inventory distribution
- age distribution stack
- reactive AI inventory insights

### Gap G — Marketing Page Has Core Widgets but Needs Spec-Specific Data and Controls

Current `a5` page already has:

- KPI tiles: Total Spend, vs Plan, SNS Reach, Brand Violations
- Campaign ROI table
- Channel Mix donut
- SNS quantitative tracking for Instagram / TikTok / X
- Spend vs Plan chart

Missing or shallow:

- Marketing Type filter: All / Brand / Performance / Photography
- exact SUGI values: EUR 547K spend, +12% vs plan, ROI 3.9x, 0 issues
- budget basis correction: current code uses spend = net sales x 4%; spec says performance marketing target = 10% of net sales
- spend split: Brand EUR 165K / Performance EUR 330K / Photography EUR 52K
- explicit budget allocation comparison
- campaign names and rows from spec: SS26 Tennis Hero, French Open Activation, Polo Spring Drop, Mother's Day, etc.
- bottom campaigns table
- 10-country marketing distribution
- Brand Compliance tracker and recent reviews table
- customer type distribution by marketing spend
- reactive AI marketing insights

## 4. Recommended Implementation Order

### P0 — Data Fidelity Foundation

1. Add a deterministic SUGI France baseline dataset into `console-data.js` or a new `js/console/console-sugi-france-data.js`.
2. Replace `COUNTRIES.sugifr` with the 10 authorized countries.
3. For `entId === "sugifr"`, make `salesFor`, `distributionFor`, `inventoryFor`, and `marketingFor` read from the supplied mock values instead of PRNG.

This must happen before visual refinements; otherwise charts will remain numerically wrong.

### P1 — Sales & Royalty Spec Match

1. Add Country Region filter.
2. Add Season Contribution.
3. Add 10-country geography and region grouping.
4. Add Geo x Product Matrix toggle.
5. Add 3-level category drill-down.
6. Add Top/Bottom SKU tables.
7. Expand Variance Analysis with YoY drivers.

### P2 — Distribution Spec Match

1. Change Active Doors KPI to `386 / 420`.
2. Add Tier filter.
3. Add exact country/region distribution.
4. Add account-level top 10 and concentration risk.
5. Add door movement waterfall and New/Closed tables.
6. Add productivity histogram and top/bottom doors.

### P3 — Inventory Spec Match

1. Enforce Inventory Actual-only behavior and Plan N/A messaging.
2. Add Stock Value / Stock Units toggle.
3. Replace generated inventory numbers with SUGI baseline values.
4. Expand matrix hover and drill-down.
5. Add stock composition sections.
6. Add stockout and markdown candidate SKU tables.
7. Add exact movement waterfall and age distribution.
8. Add 10-country stock distribution.

### P4 — Marketing Spec Match

1. Add Marketing Type filter.
2. Correct spend math to spec basis.
3. Replace generated marketing numbers with SUGI baseline values.
4. Add Brand / Performance / Photography split and budget allocation cards.
5. Add spec campaign tables.
6. Add 10-country marketing distribution.
7. Add Brand Compliance tracker.
8. Add customer type spend mix.

### P5 — Export

Implement real CSV/XLSX export first. PDF export can remain a demo toast until needed.

## 5. Practical Notes

- `docs/specs/STE_Analytics_MockData_SUGI_France.md` should be treated as the numeric source of truth.
- The two detail specs define layout/interaction behavior; they do not always provide complete row-level mock data.
- Some deeper tables require generated mock rows consistent with the summary numbers.
- Current architecture can support this without changing routing: update `STEData` first, then screen renderers.
- Since this project is static-only, all new data should be bundled as JS constants or JSON loaded through existing inline-safe mechanisms.
