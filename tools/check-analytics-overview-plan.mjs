import fs from "node:fs";
import vm from "node:vm";

globalThis.window = globalThis;
globalThis.Screens = {};
globalThis.UI = {
  dispCode(state) {
    return state && state.mode === "licensee" ? "Licensee A" : globalThis.STEData.byId(state.entId).code;
  },
  delta(value) {
    return `${value >= 0 ? "+" : ""}${Number(value || 0).toFixed(1)}%`;
  },
  curSym() {
    return "€";
  },
  flag() {
    return "";
  },
};

[
  "js/console/console-data.js",
  "js/console/console-spec-model.js",
  "js/console/console-spec-widgets.js",
  "js/console/console-screens-a12.js",
  "js/console/console-screen-overview-spec.js",
  "js/console/console-screen-distribution-spec.js",
  "js/console/console-screen-inventory-spec.js",
  "js/console/console-screen-marketing-spec.js",
].forEach((file) => {
  vm.runInThisContext(fs.readFileSync(file, "utf8"), { filename: file });
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const baseState = {
  entId: "sugifr",
  mode: "licensee",
  year: "2026",
  period: "ytd",
  season: "all",
  axis: "calendar",
  channel: null,
  licenseeSelf: "sugifr",
};

function stripped(html) {
  return String(html).replace(/\s+/g, " ");
}

function checkOverviewCoversAnalyticsPages() {
  assert(Screens.a1 && typeof Screens.a1.render === "function", "Overview screen was not registered");
  const html = stripped(Screens.a1.render({ ...baseState, view: "actual" }));
  ["Sales", "Royalty", "Distribution", "Inventory", "Marketing"].forEach((label) => {
    assert(html.includes(label), `Overview is missing ${label} summary`);
  });
  ["data-go=\"a2\"", "data-go=\"a3\"", "data-go=\"a4\"", "data-go=\"a5\""].forEach((target) => {
    assert(html.includes(target), `Overview is missing navigation target ${target}`);
  });
  assert(html.includes('id="ov-dist-tier-donut"'), "Overview Distribution card should render a tier share donut container");
  assert(html.includes("Tier 1") && html.includes("Tier 2") && html.includes("Tier 3"), "Overview Distribution card should label tier shares");
  assert(!html.includes("Tier Share"), "Overview Distribution card should not use the placeholder Tier Share text");
  assert(!html.includes("full analytics summary"), "Overview should not render the simplified spec-card override");
}

function checkMarketingPlanUsesPlanSpend() {
  const ent = STEData.byId("sugifr");
  const actualSpend = STEData.money(STEData.marketingFor("sugifr", "ytd").spend, ent).book;
  const planSpend = STEData.money(STEData.marketingFor("sugifr", "ytd").spendPlan, ent).book;
  const actualHtml = stripped(Screens.a5.render({ ...baseState, view: "actual" }));
  const planHtml = stripped(Screens.a5.render({ ...baseState, view: "plan" }));

  assert(actualHtml.includes("Total Spend"), "Marketing actual view should label the spend KPI as Total Spend");
  assert(actualHtml.includes(actualSpend), `Marketing actual view should show actual spend ${actualSpend}`);
  assert(planHtml.includes("Planned Spend"), "Marketing plan view should label the spend KPI as Planned Spend");
  assert(planHtml.includes(planSpend), `Marketing plan view should show plan spend ${planSpend}`);
}

function checkDistributionPlanUsesPlanDoors() {
  const dist = STEData.distributionFor("sugifr", "ytd");
  const actualHtml = stripped(Screens.a3.render({ ...baseState, view: "actual" }));
  const planHtml = stripped(Screens.a3.render({ ...baseState, view: "plan" }));

  assert(actualHtml.includes("Active Doors"), "Distribution actual view should render active doors");
  assert(actualHtml.includes(`${dist.active}`), `Distribution actual view should show active doors ${dist.active}`);
  assert(planHtml.includes(`${dist.planDoors}`), `Distribution plan view should show planned doors ${dist.planDoors}`);
  assert(planHtml.includes("season door plan"), "Distribution plan view should identify the door plan");
}

function checkDistributionStOnlineHasNoDoors() {
  const html = Screens.a3.render({ ...baseState, view: "actual" });
  const row = html.match(/<tr>\s*<td><span class="pill pill-green">[\s\S]*?ST Online[\s\S]*?<\/tr>/);
  assert(row, "Distribution Tier Mix should include ST Online row");
  assert(/<td class="num">0<\/td>/.test(row[0]), "ST Online should show 0 doors in Distribution Tier Mix");
}

function checkDistributionOtherHasNoDoors() {
  const html = Screens.a3.render({ ...baseState, view: "actual" });
  const row = html.match(/<tr>\s*<td><span class="pill pill-amber">[\s\S]*?Other[\s\S]*?<\/tr>/);
  assert(row, "Distribution Tier Mix should include Other row");
  assert(/<td class="num">0<\/td><td class="num">0%<\/td>/.test(row[0]), "Other should show 0 doors and 0% share in Distribution Tier Mix");
}

function checkDistributionTierMixHasNoChart() {
  const html = Screens.a3.render({ ...baseState, view: "actual" });
  assert(!html.includes("dist-tier-mix"), "Distribution Tier Mix card should not render a chart container");
  const source = fs.readFileSync("js/console/console-screen-distribution-spec.js", "utf8");
  assert(!source.includes("Ch.donut(tm"), "Distribution Tier Mix should not initialize a donut chart");
  assert(source.includes("min-height:430px"), "Distribution Tier Mix card should match the timeline card height");
}

function checkInventoryMovementAndAgeLayout() {
  const html = stripped(Screens.a4.render({ ...baseState, view: "actual" }));
  assert(!html.includes("Country Inventory"), "Inventory screen should not render the Country Inventory card");
  assert(html.includes("Quarter-over-Quarter Movement"), "Inventory screen should render Quarter-over-Quarter Movement");
  assert(html.includes("Age Distribution"), "Inventory screen should render Age Distribution");
  assert(/spec-grid g2 mt-16[\s\S]*inv-movement[\s\S]*inv-age-dist/.test(html), "QoQ Movement and Age Distribution should share one two-column row");
}

function checkInventoryAndSalesPlanContracts() {
  const host = fs.readFileSync("js/console/console-host.js", "utf8");
  const sales = fs.readFileSync("js/console/console-sales-royalty-sugi.js", "utf8");

  assert(host.includes('state.view === "plan" && state.screen === "a4"'), "Inventory plan guard is missing in console host");
  assert(host.includes("Inventory does not yet have a committed plan model"), "Inventory plan empty-state copy is missing");
  assert(sales.includes("st.view==='plan'"), "Sales & Royalty PoC should branch on plan view");
  assert(sales.includes("'Net Sales Plan'"), "Sales & Royalty PoC should render plan KPI labels");
  assert(sales.includes("planMain"), "Sales & Royalty PoC charts should promote plan data in plan view");
}

function checkSalesRoyaltyUsesSpecCardHeaders() {
  const sales = fs.readFileSync("js/console/console-sales-royalty-sugi.js", "utf8");
  assert(sales.includes('class="spec-sec-head"'), "Sales & Royalty cards should use the shared spec card header structure");
  assert(!sales.includes('class="card-head"'), "Sales & Royalty cards should not use the legacy card-head structure");
  assert(sales.includes("secHead('Net Sales by Territory'"), "Sales & Royalty territory card title should be Net Sales by Territory");
}

function checkSalesRoyaltyGeoProductMatrixShowsCategoryYoy() {
  const sales = fs.readFileSync("js/console/console-sales-royalty-sugi.js", "utf8");
  assert(sales.includes("heatYoy"), "Geography x Product Matrix heatmap should render YoY percentages");
  assert(sales.includes("WEAR / ACC amount and vs YoY"), "Geography x Product Matrix should describe category amount and YoY");
  assert(sales.includes("eur(r.w)") && sales.includes("delta(r.wy)"), "WEAR cell should show amount with YoY");
  assert(sales.includes("eur(r.a)") && sales.includes("delta(r.ay)"), "ACC cell should show amount with YoY");
  assert(!sales.includes("Total vs YoY"), "Geography x Product Matrix should not show Total vs YoY");
  assert(!sales.includes("heatMoney(el,['WEAR','ACC']"), "Geography x Product Matrix should not render WEAR/ACC net sales money heatmap");
}

function checkSalesRoyaltyBottomSkuRemoved() {
  const sales = fs.readFileSync("js/console/console-sales-royalty-sugi.js", "utf8");
  assert(!sales.includes("Bottom 20 SKU"), "Sales & Royalty should not render Bottom 20 SKU card");
  assert(!sales.includes("Slow Movers"), "Sales & Royalty should not render Slow Movers card");
}

function checkSalesRoyaltyMixCardsUseEqualLayout() {
  const sales = fs.readFileSync("js/console/console-sales-royalty-sugi.js", "utf8");
  assert(sales.includes("sugi-equal-card"), "Sales & Royalty mix cards should use an equal card class");
  assert(sales.includes("sugi-card-body"), "Sales & Royalty mix cards should use an equal body area");
}

function checkLegacyOverviewDistributionCardUsesTierDonut() {
  const legacyOverview = fs.readFileSync("js/console/console-screens-a12.js", "utf8");
  assert(legacyOverview.includes("tierShareMetrics"), "Legacy overview Distribution card should derive tier share metrics");
  assert(legacyOverview.includes("ov-dist-tier-donut"), "Legacy overview Distribution card should render a tier share donut");
  assert(legacyOverview.includes("Charts.donut(de"), "Legacy overview Distribution card should initialize the tier share donut");
  assert(!legacyOverview.includes("val: 'Tier Share'"), "Legacy overview Distribution card should not keep the placeholder single-value label");
  assert(!legacyOverview.includes("metric('Net Δ'"), "Legacy overview Distribution card should not show Net Delta metrics");
  assert(!legacyOverview.includes("metric('Rev/Door'"), "Legacy overview Distribution card should not show Rev/Door metrics");
}

function checkLegacyOverviewRoyaltyCopy() {
  const legacyOverview = fs.readFileSync("js/console/console-screens-a12.js", "utf8");
  assert(legacyOverview.includes("'Royalty · '"), "Legacy overview Royalty card should label the subtitle as Royalty");
  assert(!legacyOverview.includes("'Royalty earned · '"), "Legacy overview Royalty card should not say Royalty earned");
}

function checkOverviewWholesaleAndRetailSalesCards() {
  const html = stripped(Screens.a1.render({ ...baseState, view: "actual" }));
  const ent = STEData.byId("sugifr");
  const wholesale = STEData.money(STEData.salesFor("sugifr", "ytd", "wholesale").netSales, ent).book;
  const retail = STEData.money(STEData.salesFor("sugifr", "ytd", "retail").netSales, ent).book;

  assert(html.includes("Wholesale net sales"), "Overview Sales card should be scoped to Wholesale net sales");
  assert(html.includes(wholesale), `Overview Sales card should show Wholesale net sales ${wholesale}`);
  assert(html.includes(">Retail<") || html.includes(">Retail Sales<"), "Overview should render a Retail sales card");
  assert(html.includes("Retail net sales"), "Overview Retail card should describe Retail net sales");
  assert(html.includes(retail), `Overview Retail card should show Retail net sales ${retail}`);
}

function checkOverviewHeadlineKpisExcludeTotalSalesRoyalty() {
  const html = stripped(Screens.a1.render({ ...baseState, view: "actual" }));
  const kpiSection = html.match(/Headline KPIs[\s\S]*?<\/div><\/div>/);
  assert(kpiSection, "Overview should render Headline KPIs section");
  assert(!kpiSection[0].includes("Total Net Sales"), "Headline KPIs should not include Total Net Sales");
  assert(!kpiSection[0].includes("Total Royalty"), "Headline KPIs should not include Total Royalty");
}

function checkOverviewSpecOverrideDisabled() {
  const overviewSpec = fs.readFileSync("js/console/console-screen-overview-spec.js", "utf8");
  assert(overviewSpec.includes("intentionally a no-op"), "Overview spec override should remain disabled");
  assert(!overviewSpec.includes("global.Screens.a1"), "Overview spec file must not override Screens.a1");
}

checkOverviewCoversAnalyticsPages();
checkDistributionPlanUsesPlanDoors();
checkDistributionStOnlineHasNoDoors();
checkDistributionOtherHasNoDoors();
checkDistributionTierMixHasNoChart();
checkInventoryMovementAndAgeLayout();
checkMarketingPlanUsesPlanSpend();
checkInventoryAndSalesPlanContracts();
checkSalesRoyaltyUsesSpecCardHeaders();
checkSalesRoyaltyGeoProductMatrixShowsCategoryYoy();
checkSalesRoyaltyBottomSkuRemoved();
checkSalesRoyaltyMixCardsUseEqualLayout();
checkLegacyOverviewDistributionCardUsesTierDonut();
checkLegacyOverviewRoyaltyCopy();
checkOverviewWholesaleAndRetailSalesCards();
checkOverviewHeadlineKpisExcludeTotalSalesRoyalty();
checkOverviewSpecOverrideDisabled();

console.log("analytics overview and plan toggles OK");
