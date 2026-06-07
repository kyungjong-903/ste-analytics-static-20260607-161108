import fs from "node:fs";
import vm from "node:vm";

globalThis.window = globalThis;
globalThis.Screens = {};
globalThis.UI = {
  dispCode(state) {
    return globalThis.STEData.byId(state.entId).code;
  },
  delta(value) {
    return `${value >= 0 ? "+" : ""}${Number(value || 0).toFixed(1)}%`;
  },
};

[
  "js/console/console-data.js",
  "js/console/console-spec-model.js",
  "js/console/console-spec-widgets.js",
  "js/console/console-screen-overview-spec.js",
  "js/console/console-screen-distribution-spec.js",
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
};

function stripped(html) {
  return String(html).replace(/\s+/g, " ");
}

function checkOverviewCoversAnalyticsPages() {
  assert(Screens.a1 && typeof Screens.a1.render === "function", "Overview spec screen override was not registered");
  const html = stripped(Screens.a1.render({ ...baseState, view: "actual" }));
  ["Sales & Royalty", "Distribution", "Inventory", "Marketing"].forEach((label) => {
    assert(html.includes(label), `Overview is missing ${label} summary`);
  });
  ["data-go=\"a2\"", "data-go=\"a3\"", "data-go=\"a4\"", "data-go=\"a5\""].forEach((target) => {
    assert(html.includes(target), `Overview is missing navigation target ${target}`);
  });
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

function checkInventoryAndSalesPlanContracts() {
  const host = fs.readFileSync("js/console/console-host.js", "utf8");
  const sales = fs.readFileSync("js/console/console-sales-royalty-sugi.js", "utf8");

  assert(host.includes('state.view === "plan" && state.screen === "a4"'), "Inventory plan guard is missing in console host");
  assert(host.includes("Inventory does not yet have a committed plan model"), "Inventory plan empty-state copy is missing");
  assert(sales.includes("st.view==='plan'"), "Sales & Royalty PoC should branch on plan view");
  assert(sales.includes("'Net Sales Plan'"), "Sales & Royalty PoC should render plan KPI labels");
  assert(sales.includes("planMain"), "Sales & Royalty PoC charts should promote plan data in plan view");
}

checkOverviewCoversAnalyticsPages();
checkDistributionPlanUsesPlanDoors();
checkMarketingPlanUsesPlanSpend();
checkInventoryAndSalesPlanContracts();

console.log("analytics overview and plan toggles OK");
