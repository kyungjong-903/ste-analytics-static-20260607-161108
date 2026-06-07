import fs from "node:fs";
import vm from "node:vm";

globalThis.window = globalThis;
globalThis.document = {
  querySelector() { return null; },
  querySelectorAll() { return []; },
  createElement() { return { setAttribute() {}, appendChild() {} }; },
  body: { appendChild() {} },
  addEventListener() {},
};
globalThis.location = { hash: "" };

const seedSource = fs.readFileSync("js/seed-inline.js", "utf8");
vm.runInThisContext(seedSource, { filename: "js/seed-inline.js" });
vm.runInThisContext(fs.readFileSync("js/screens.js", "utf8"), { filename: "js/screens.js" });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const normalize = globalThis.STEScreensTestHooks?.normalizeOperationPlanForDisplay;
assert(typeof normalize === "function", "Operation Plans display-status helper should be exported for tests");

const historicalPlans = STE_SEED.seasonPlans.filter((p) => p.season === "25FW");
assert(historicalPlans.length > 0, "Seed should include historical 25FW Operation Plans");
historicalPlans.forEach((plan) => {
  const shown = normalize(plan);
  assert(shown.status === "Approved", `25FW ${plan.subplan} should display as Approved, got ${shown.status}`);
});

const currentRejected = { season: "26SS", subplan: "3-A", status: "Rejected" };
assert(normalize(currentRejected).status === "Rejected", "26SS rejected plans should keep their real status");

const futureDraft = { season: "27SS", subplan: "3-C", status: "Draft" };
assert(normalize(futureDraft).status === "Draft", "Future draft plans should keep their real status");

console.log("operation plans status OK");
