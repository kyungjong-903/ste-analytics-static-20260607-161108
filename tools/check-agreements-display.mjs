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

const hooks = globalThis.STEScreensTestHooks || {};
const displayName = hooks.agreementLicenseeDisplayName;
const displayRoyalty = hooks.agreementRoyaltyDisplay;

assert(typeof displayName === "function", "Agreement licensee display helper should be exported for tests");
assert(typeof displayRoyalty === "function", "Agreement royalty display helper should be exported for tests");

const sugi = STE_SEED.licensees.find((lic) => lic.id === "lic_c2a5c666");
const sugiAgreement = STE_SEED.contracts.find((contract) => contract.licenseeId === sugi.id && Number(contract.royaltyPct) === 10);
assert(sugi, "Seed should include SUGI France licensee");
assert(sugiAgreement, "Seed should include a SUGI France 10% agreement");

const otherTenPct = STE_SEED.contracts.find((contract) => contract.licenseeId !== sugi.id && Number(contract.royaltyPct) === 10);
const otherLic = STE_SEED.licensees.find((lic) => lic.id === otherTenPct.licenseeId);
assert(otherTenPct && otherLic, "Seed should include another non-SUGI 10% agreement");

assert(displayName(sugi) === "Licensee A", `SUGI France should display as Licensee A, got ${displayName(sugi)}`);
assert(displayRoyalty({ licensee: sugi, royaltyPct: sugiAgreement.royaltyPct }) === "xx%", "SUGI France 10% agreement should display xx%");
assert(displayName(otherLic) === otherLic.legalName, "Other licensee names should remain unchanged");
assert(displayRoyalty({ licensee: otherLic, royaltyPct: otherTenPct.royaltyPct }) === "10%", "Other 10% agreements should remain visible as 10%");

console.log("agreements display OK");
