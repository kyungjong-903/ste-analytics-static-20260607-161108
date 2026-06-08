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

function checkMarketingPatchCardsAndTables() {
  const html = stripped(Screens.a5.render({ ...baseState, view: "actual" }));
  const planHtml = stripped(Screens.a5.render({ ...baseState, view: "plan" }));

  ["Channel Mix", "Brand vs Performance Split", "Bottom Campaigns", "Geographic Distribution", "Customer Type Distribution"].forEach((label) => {
    assert(!html.includes(label), `Marketing should not render removed card: ${label}`);
  });

  ["SNS Engagement Tracker", "Last crawled: 2026-06-07 09:32 KST", "AI Crawling", "Posting Date", "Like", "Impression", "Advertising Cost", "ROAS"].forEach((label) => {
    assert(html.includes(label), `Marketing should render SNS Engagement Tracker label ${label}`);
  });
  ["SS26 Tennis Hero Reel", "French Open Activation Teaser", "Polo Spring Drop Post", "18,420", "685,000", "€3,200", "6.8x", "5.4x", "3.2x"].forEach((label) => {
    assert(html.includes(label), `Marketing SNS Engagement Tracker should render mock value ${label}`);
  });
  assert(planHtml.includes("SNS Engagement Tracker"), "SNS Engagement Tracker should remain visible in Plan view as Actual-only data");
  assert(planHtml.includes("Actual-only"), "Plan view should explain SNS Engagement Tracker is actual-only");

  ["Territory ROI Table", "Baseline Sales", "Sales Lift", "Total Net Sales", "France", "Morocco", "Total", "€2.16M", "3.9x"].forEach((label) => {
    assert(html.includes(label), `Marketing Territory ROI Table should render ${label}`);
  });
  assert(!html.includes("3.9x avg"), "Marketing Territory ROI Table total ROAS should not include avg text");
  assert(html.includes("Sales Lift = AI Attribution Model"), "Territory ROI Table should explain the Sales Lift attribution model");
}

function checkMarketingSnsActualPriorSwapped() {
  const hooks = globalThis.STEMarketingSpecTestHooks || {};
  assert(typeof hooks.marketingDetail === "function", "Marketing spec should expose marketingDetail for regression checks");
  const details = hooks.marketingDetail(STEData.marketingFor("sugifr", "ytd"), "actual");
  const instagram = details.sns.find((row) => row.name === "Instagram");
  assert(instagram, "Marketing SNS detail should include Instagram");
  assert(instagram.actual[0] > instagram.prior[0], "Marketing SNS Actual should display above Prior Year after value swap");
  assert(instagram.actual.slice(5).every((v) => v == null), "Marketing SNS Actual should stay limited to closed actual months");
  assert(instagram._swappedActualPrior === true, "Marketing SNS detail should mark Actual/Prior values as swapped");
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

function checkDistributionLayoutRefinements() {
  const html = stripped(Screens.a3.render({ ...baseState, view: "actual" }));

  ["Tier 1 (Anchor)", "Tier 2 (Core)", "Tier 3 (Volume)"].forEach((label) => {
    assert(!html.includes(label), `Distribution should not render parenthetical tier label ${label}`);
  });
  ["Tier 1", "Tier 2", "Tier 3"].forEach((label) => {
    assert(html.includes(label), `Distribution should render simplified tier label ${label}`);
  });

  assert(!html.includes("Door Share by Region"), "Distribution Region Grouping should not render Door Share by Region bars");
  assert(html.includes("dist-geo-region-row"), "Distribution geography row should use a custom ratio layout");
  assert(html.includes("grid-template-columns:minmax(0,1.45fr) minmax(340px,.85fr)"), "Distribution geography row should give the chart more width than the region summary");
  assert(!html.includes("align-self:start"), "Distribution paired cards should stretch so their top and bottom lines align");
  assert(html.includes("dist-account-risk-row"), "Distribution account analysis row should have an explicit alignment hook");
  assert(/dist-account-risk-row[^"]*" style="[^"]*align-items:stretch/.test(html), "Distribution account analysis cards should stretch to matching row heights");
  assert(html.includes("dist-productivity-customer-stack"), "Distribution should stack Customer Type below Productivity");
  assert(html.includes("dist-productivity-card is-compact"), "Distribution Productivity card should use the compact variant");
  assert(!html.includes('id="dist-hist"'), "Distribution Productivity compact card should not render the revenue-bucket histogram");
  assert(/dist-productivity-customer-stack[\s\S]*Productivity — Revenue per Door[\s\S]*Customer Type Distribution/.test(html), "Customer Type Distribution should be placed below Productivity");
}

function checkInventoryMovementAndAgeLayout() {
  const html = stripped(Screens.a4.render({ ...baseState, view: "actual" }));
  assert(!html.includes("Country Inventory"), "Inventory screen should not render the Country Inventory card");
  assert(html.includes("Quarter-over-Quarter Movement"), "Inventory screen should render Quarter-over-Quarter Movement");
  assert(html.includes("Age Distribution"), "Inventory screen should render Age Distribution");
  assert(/spec-grid g2 mt-16[\s\S]*inv-movement[\s\S]*inv-age-dist/.test(html), "QoQ Movement and Age Distribution should share one two-column row");
}

function checkInventoryMovementSeasonTracking() {
  const html = stripped(Screens.a4.render({ ...baseState, view: "actual" }));
  assert(html.includes('id="inv-movement-season"'), "Inventory QoQ Movement card should include a season selector");
  assert(/Quarter-over-Quarter Movement[\s\S]*inv-movement-season/.test(html), "Inventory season selector should sit in the QoQ Movement card header area");
  assert(html.includes('value="ALL" selected>All Seasons<'), "Inventory QoQ Movement should default to All Seasons");
  assert(html.includes('data-season="ALL"'), "Inventory QoQ Movement chart should initialize with all-season data");
  ["SS25", "FW25", "SS26", "FW26"].forEach((label) => {
    assert(html.includes(`>${label}<`), `Inventory movement season selector should include ${label}`);
  });
  assert(html.includes('id="inv-movement-rates"'), "Inventory QoQ Movement rates should have a replaceable container");

  const source = fs.readFileSync("js/console/console-screen-inventory-spec.js", "utf8");
  assert(source.includes("renderMovementPanel"), "Inventory should render the movement panel through a reusable helper");
  assert(source.includes("updateMovementSeason"), "Inventory should update movement chart and rates when the selected season changes");
  assert(source.includes("addEventListener(\"change\""), "Inventory season selector should listen for changes");
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
  const planHtml = stripped(Screens.a1.render({ ...baseState, view: "plan" }));
  const ent = STEData.byId("sugifr");
  const all = STEData.money(STEData.salesFor("sugifr", "ytd").netSales, ent).book;
  const wholesale = STEData.salesFor("sugifr", "ytd", "wholesale");
  const retail = STEData.money(wholesale.netSales * 1.9, ent).book;
  const retailPlan = STEData.money(wholesale.plan * 1.9, ent).book;

  assert(html.includes(">Net Sales<"), "Overview Sales card should be labeled Net Sales");
  assert(html.includes("Net sales all"), "Overview Net Sales card should describe all-channel net sales");
  assert(html.includes(all), `Overview Net Sales card should show all-channel net sales ${all}`);
  assert(!html.includes("Wholesale net sales"), "Overview Sales card should not be scoped to Wholesale net sales");
  assert(html.includes('<span class="h-name">MSRP</span>'), "Overview should render an MSRP sales card");
  assert(!html.includes('<span class="h-name">Retail</span>') && !html.includes('<span class="h-name">Retail Sales</span>'), "Overview should not title the MSRP card as Retail");
  assert(html.includes("MSRP net sales"), "Overview MSRP card should describe MSRP net sales");
  assert(html.includes(retail), `Overview MSRP card should show Wholesale x 1.9 net sales ${retail}`);
  assert(planHtml.includes(retailPlan), `Overview MSRP plan card should show Wholesale plan x 1.9 ${retailPlan}`);
}

function checkOverviewHeadlineKpisExcludeTotalSalesRoyalty() {
  const html = stripped(Screens.a1.render({ ...baseState, view: "actual" }));
  const kpiSection = html.match(/Headline KPIs[\s\S]*?<div class="kpi-grid-8">([\s\S]*?)<\/div><\/div>/);
  assert(kpiSection, "Overview should render Headline KPIs section");
  assert(!kpiSection[0].includes("Total Net Sales"), "Headline KPIs should not include Total Net Sales");
  assert(!kpiSection[0].includes("Total Royalty"), "Headline KPIs should not include Total Royalty");
}

function checkOverviewHeadlineKpisIncludeDistributionDoorsInFiveCards() {
  const html = stripped(Screens.a1.render({ ...baseState, view: "actual" }));
  const dist = STEData.distributionFor("sugifr", "ytd");
  const kpiGrid = html.match(/<div class="kpi-grid-8">([\s\S]*?)<\/div><\/div>/);
  assert(kpiGrid, "Overview should render a KPI grid");
  assert(kpiGrid[0].includes("Distribution Doors"), "Headline KPIs should include Distribution Doors");
  assert(kpiGrid[0].includes(String(dist.active)), `Distribution Doors KPI should show active doors ${dist.active}`);
  assert((kpiGrid[0].match(/class="card kpi kpi-mini"/g) || []).length === 5, "Headline KPIs should render five cards");

  const cssSource = fs.readFileSync("tools/console-template.html", "utf8");
  assert(cssSource.includes(".kpi-grid-8 { display:grid; grid-template-columns:repeat(5,1fr);"), "KPI grid should render five cards on one row");
}

function checkOverviewSpecOverrideDisabled() {
  const overviewSpec = fs.readFileSync("js/console/console-screen-overview-spec.js", "utf8");
  assert(overviewSpec.includes("intentionally a no-op"), "Overview spec override should remain disabled");
  assert(!overviewSpec.includes("global.Screens.a1"), "Overview spec file must not override Screens.a1");
}

function checkAnalyticsV2MenuHidden() {
  const index = fs.readFileSync("index.html", "utf8");
  const navBlock = index.match(/const NAV = \[[\s\S]*?\n  \];/);
  assert(navBlock, "Global sidebar NAV block should exist");
  assert(!navBlock[0].includes("Analytics v2"), "Analytics v2 should not be shown in the sidebar menu");
  assert(!navBlock[0].includes("#/analytics-v2"), "Analytics v2 sidebar menu href should be removed");
}

checkOverviewCoversAnalyticsPages();
checkDistributionPlanUsesPlanDoors();
checkDistributionStOnlineHasNoDoors();
checkDistributionOtherHasNoDoors();
checkDistributionTierMixHasNoChart();
checkDistributionLayoutRefinements();
checkInventoryMovementAndAgeLayout();
checkInventoryMovementSeasonTracking();
checkMarketingPlanUsesPlanSpend();
checkMarketingPatchCardsAndTables();
checkMarketingSnsActualPriorSwapped();
checkInventoryAndSalesPlanContracts();
checkSalesRoyaltyUsesSpecCardHeaders();
checkSalesRoyaltyGeoProductMatrixShowsCategoryYoy();
checkSalesRoyaltyBottomSkuRemoved();
checkSalesRoyaltyMixCardsUseEqualLayout();
checkLegacyOverviewDistributionCardUsesTierDonut();
checkLegacyOverviewRoyaltyCopy();
checkOverviewWholesaleAndRetailSalesCards();
checkOverviewHeadlineKpisExcludeTotalSalesRoyalty();
checkOverviewHeadlineKpisIncludeDistributionDoorsInFiveCards();
checkOverviewSpecOverrideDisabled();
checkAnalyticsV2MenuHidden();

console.log("analytics overview and plan toggles OK");
