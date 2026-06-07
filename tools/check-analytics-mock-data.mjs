import fs from "node:fs";
import vm from "node:vm";

globalThis.window = globalThis;
vm.runInThisContext(fs.readFileSync("js/console/console-data.js", "utf8"), {
  filename: "js/console/console-data.js",
});

function near(actual, expected, tolerance, label) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function checkSugiFrance() {
  const sales = STEData.salesFor("sugifr", "ytd");
  const dist = STEData.distributionFor("sugifr", "ytd");
  const inv = STEData.inventoryFor("sugifr", "ytd");
  const mkt = STEData.marketingFor("sugifr", "ytd");

  near(sales.netSales, 13_700_000, 1, "SUGI France YTD net sales");
  near(sales.plan, 14_300_000, 1, "SUGI France YTD plan");
  near(sales.prior, 13_400_000, 1, "SUGI France prior year");
  near(sales.royalty, 1_370_000, 1, "SUGI France royalty");
  near(sales.minForPeriod, 1_040_000 / sales.royaltyRate, 1, "SUGI France prorated minimum sales base");
  near(dist.active, 386, 0, "SUGI France active doors");
  near(inv.stockValue, 3_900_000, 1, "SUGI France stock value");
  near(inv.stockToSales, 3.6, 0.01, "SUGI France stock-to-sales");
  near(inv.aged, 23, 0, "SUGI France aged stock");
  near(mkt.spend, 547_000, 1, "SUGI France marketing spend");
  near(mkt.spendPlan, 490_000, 1, "SUGI France marketing plan");
  near(mkt.roi, 3.9, 0.01, "SUGI France marketing ROI");
  near(mkt.violations, 0, 0, "SUGI France compliance issues");
}

function checkLicensorTotal() {
  const sales = STEData.salesFor("total", "ytd");
  const dist = STEData.distributionFor("total", "ytd");
  const inv = STEData.inventoryFor("total", "ytd");
  const mkt = STEData.marketingFor("total", "ytd");

  near(sales.netSales, 54_800_000, 1, "Licensor total YTD net sales");
  near(sales.plan, 57_000_000, 1, "Licensor total YTD plan");
  near(sales.prior, 52_600_000, 1, "Licensor total prior year");
  near(sales.royalty, 5_480_000, 1, "Licensor total royalty");
  near(dist.active, 1_544, 0, "Licensor total active doors");
  near(inv.stockValue, 15_600_000, 1, "Licensor total stock value");
  near(mkt.spend, 2_190_000, 1, "Licensor total marketing spend");
  near(mkt.violations, 2, 0, "Licensor total compliance issues");
}

function checkOtherLicenseesRemainGenerated() {
  const bbuk = STEData.salesFor("bbuk", "ytd");
  near(Math.round(bbuk.netSales), 2_738_220, 5_000, "BBUK generated net sales unchanged");
}

checkSugiFrance();
checkLicensorTotal();
checkOtherLicenseesRemainGenerated();

console.log("analytics mock data OK");
