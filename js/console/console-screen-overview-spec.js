(function (global) {
  "use strict";

  const D = () => global.STEData;
  const M = () => global.STESpecModel;
  const W = () => global.STESpecWidgets;

  function ent(state) {
    return D().byId(state.entId);
  }

  function money(value, entity) {
    return D().money(value || 0, entity).book;
  }

  function compact(value) {
    return D().compact(value || 0);
  }

  function pct(value, digits) {
    if (value == null || !isFinite(value)) return "-";
    return `${value >= 0 ? "+" : ""}${value.toFixed(digits == null ? 1 : digits)}%`;
  }

  function periodLabel(state) {
    const labels = {
      ytd: "Year-to-Date",
      q1: "Q1",
      q2: "Q2",
      q3: "Q3",
      q4: "Q4",
      cum1: "Through Q1",
      cum2: "Through Q2",
      cum3: "Through Q3",
      full: "Full Year",
    };
    if (state.axis === "season" && state.season && state.season !== "all") return state.season.toUpperCase();
    return `${labels[state.period] || state.period || "Year-to-Date"} ${state.year || "2026"}`;
  }

  function sub(state) {
    const code = global.UI && global.UI.dispCode ? global.UI.dispCode(state) : ent(state).code;
    return `${code} - ${periodLabel(state)} - full analytics summary`;
  }

  function bundle(state) {
    return {
      overview: M().overview(state),
      distribution: M().distribution(state),
      inventory: M().inventory(state),
      marketing: M().marketing(state),
    };
  }

  function salesValue(sales, planView) {
    return planView || !sales.hasActual ? sales.plan : sales.netSales;
  }

  function royaltyValue(sales, planView) {
    return planView || !sales.hasActual ? sales.royaltyPlan : sales.royalty;
  }

  function coverageCard(id, title, meta, body) {
    return `<div class="card hero qmix" data-go="${id}" style="cursor:pointer">
      <div class="between" style="gap:10px;margin-bottom:8px">
        <b>${W().esc(title)}</b>
        <span class="pill pill-blue">Open</span>
      </div>
      <span>${W().esc(meta)}</span>
      <div class="muted" style="font-size:12px;margin-top:8px;line-height:1.45">${body}</div>
    </div>`;
  }

  function miniStat(label, value, meta, tone) {
    return `<div class="card spec-kpi ${tone ? `tone-${tone}` : ""}">
      <div class="klabel">${W().esc(label)}</div>
      <div class="kval" style="font-size:22px">${value}</div>
      <div class="kcur">${meta || ""}</div>
    </div>`;
  }

  function row(label, value, meta) {
    return `<div class="between" style="gap:12px;padding:10px 0;border-bottom:1px solid rgba(15,23,42,.07)">
      <span style="font-size:13px;color:var(--ink-2)">${W().esc(label)}</span>
      <span style="text-align:right"><b>${value}</b>${meta ? `<div class="muted" style="font-size:11px;margin-top:2px">${meta}</div>` : ""}</span>
    </div>`;
  }

  function tierShare(dist) {
    const rows = (dist.tiers || []).map((tier) => ({
      label: String(tier.tier || "").replace("Tier ", "T"),
      count: (tier.existing || 0) + (tier.nw || 0) - (tier.closing || 0),
    }));
    const total = rows.reduce((sum, item) => sum + item.count, 0) || 1;
    return rows.map((item) => ({ label: item.label, pct: Math.round(item.count / total * 100) }));
  }

  function render(state) {
    const data = bundle(state);
    const ctx = data.overview.ctx;
    const entity = ctx.entity;
    const planView = ctx.view === "plan";
    const sales = data.overview.sales;
    const dist = data.distribution.dist;
    const inv = data.inventory.inv;
    const mkt = data.marketing.mkt;
    const distTierShare = tierShare(dist);
    const distTierText = distTierShare.map((item) => `${item.label} ${item.pct}%`).join(" · ");
    const net = salesValue(sales, planView);
    const royalty = royaltyValue(sales, planView);
    const budgetPace = mkt.spendPlan ? mkt.spend / mkt.spendPlan * 100 : 0;
    const distAttain = dist.planDoors ? dist.active / dist.planDoors * 100 : 0;
    const marketingSpend = planView ? mkt.spendPlan : mkt.spend;
    const inventoryNote = planView ? "Inventory has no committed plan model; showing latest stock snapshot." : "Latest stock health snapshot.";
    const salesTone = sales.vsPlan == null ? "" : sales.vsPlan >= 0 ? "ok" : "risk";
    const distTone = distAttain >= 95 ? "ok" : "risk";
    const invTone = inv.aged <= 20 ? "ok" : "risk";
    const mktTone = Math.abs(budgetPace - 100) <= 10 ? "ok" : "risk";

    return `
      <div class="between" style="gap:16px;margin-bottom:14px;align-items:flex-start">
        <div>
          <div class="muted" style="font-size:12px">${planView ? "Committed Plan view" : "Actual view"} &middot; ${W().esc(periodLabel(state))} &middot; ${W().esc(entity.name)}</div>
        </div>
      </div>

      <div class="spec-grid g4">
        ${W().kpi(planView ? "Planned Net Sales" : "Net Sales", money(net, entity), `<span class="muted">${planView ? "committed sales plan" : `${pct(sales.vsPlan, 1)} vs plan`}</span>`, salesTone)}
        ${W().kpi(planView ? "Planned Royalty" : "Royalty", money(royalty, entity), `<span class="muted">effective ${(sales.royaltyRate * 100).toFixed(1)}%</span>`)}
        ${W().kpi(planView ? "Planned Doors" : "Active Doors", planView ? `${dist.planDoors}` : `${dist.active}`, `<span class="muted">${planView ? `${dist.active} active now` : `${dist.planDoors} plan doors`}</span>`, distTone)}
        ${W().kpi(planView ? "Planned Marketing Spend" : "Marketing Spend", money(marketingSpend, entity), `<span class="muted">${budgetPace.toFixed(0)}% actual budget pace</span>`, mktTone)}
      </div>

      <div class="spec-grid g4 mt-16">
        ${coverageCard("a2", "Sales & Royalty", "Net sales, royalty, variance, minimum guarantee", `${money(net, entity)} sales &middot; ${money(royalty, entity)} royalty &middot; ${pct(sales.vsPlan, 1)} vs plan`)}
        ${coverageCard("a3", "Distribution", "Doors, account tiers, geography, concentration", `${distTierText} &middot; ${dist.active} active doors`)}
        ${coverageCard("a4", "Inventory", "Stock value, aging, stockout, markdown risk", `${money(inv.stockValue, entity)} stock &middot; ${inv.stockToSales.toFixed(1)}mo stock-to-sales &middot; ${inv.aged}% aged`)}
        ${coverageCard("a5", "Marketing", "Spend, ROI, SNS, campaign and compliance", `${money(marketingSpend, entity)} spend &middot; ${mkt.roi.toFixed(1)}x ROI &middot; ${mkt.violations} compliance issues`)}
      </div>

      <div class="spec-grid g2 mt-16">
        <div class="card card-pad">
          ${W().sec("Sales & Royalty Snapshot", planView ? "Committed plan summary" : "Actual performance versus plan")}
          ${row(planView ? "Net Sales Plan" : "Net Sales", money(net, entity), planView ? `vs prior plan ${pct(sales.vsPriorPlan, 1)}` : `plan ${money(sales.plan, entity)}`)}
          ${row(planView ? "Royalty Plan" : "Royalty", money(royalty, entity), `minimum base ${money(sales.minForPeriod, entity)}`)}
          ${row("Plan Attainment", sales.achieved == null ? "-" : `${sales.achieved.toFixed(0)}%`, sales.hasActual ? `${pct(sales.vsPlan, 1)} vs plan` : "actuals not closed")}
        </div>
        <div class="card card-pad">
          ${W().sec("Distribution Snapshot", planView ? "Door plan coverage" : "Door performance and movement")}
          ${row("Tier Share", distTierText, `${dist.active} active doors`)}
          ${row("Active / Plan Doors", `${dist.active} / ${dist.planDoors}`, `${distAttain.toFixed(0)}% coverage`)}
          ${row("Top 5 Concentration", `${dist.top5}%`, "sales concentration across anchor accounts")}
        </div>
        <div class="card card-pad">
          ${W().sec("Inventory Snapshot", inventoryNote)}
          ${row("Stock Value", money(inv.stockValue, entity), "period-end inventory value")}
          ${row("Stock-to-Sales", `${inv.stockToSales.toFixed(1)} months`, "target <= 3.0 months")}
          ${row("Aged Stock / Turnover", `${inv.aged}% / ${inv.turn.toFixed(1)}x`, "90+ days share / annualised turn")}
        </div>
        <div class="card card-pad">
          ${W().sec("Marketing Snapshot", planView ? "Planned spend and expected return" : "Actual spend and return")}
          ${row(planView ? "Planned Spend" : "Spend", money(marketingSpend, entity), `actual ${money(mkt.spend, entity)} / plan ${money(mkt.spendPlan, entity)}`)}
          ${row("ROI / Reach", `${mkt.roi.toFixed(1)}x / ${compact(mkt.reach)}`, "return on ad spend / estimated reach")}
          ${row("Brand Compliance", `${mkt.violations} issues`, mkt.violations ? "needs review" : "clean")}
        </div>
      </div>

      <div class="spec-grid g4 mt-16">
        ${miniStat("Budget Pace", `${budgetPace.toFixed(0)}%`, `<span class="muted">Marketing actual vs plan</span>`, mktTone)}
        ${miniStat("Stock Risk", `${inv.aged}% aged`, `<span class="muted">90+ days inventory</span>`, invTone)}
        ${miniStat("Door Coverage", `${distAttain.toFixed(0)}%`, `<span class="muted">active vs planned doors</span>`, distTone)}
        ${miniStat("Royalty Rate", `${(sales.royaltyRate * 100).toFixed(1)}%`, `<span class="muted">effective contract rate</span>`)}
      </div>

      ${W().ai([
        `${planView ? "Plan view" : "Actual view"} combines Sales & Royalty, Distribution, Inventory, and Marketing into one executive summary.`,
        `Sales are ${sales.achieved == null ? "awaiting actual close" : `${sales.achieved.toFixed(0)}% of plan`} while active doors are ${distAttain.toFixed(0)}% of the distribution plan.`,
        `Inventory is shown as a stock snapshot because the Inventory page has no committed plan model; aged stock is ${inv.aged}% and stock-to-sales is ${inv.stockToSales.toFixed(1)} months.`,
        `Marketing budget pace is ${budgetPace.toFixed(0)}% with ${mkt.roi.toFixed(1)}x ROI and ${mkt.violations} open brand compliance issues.`,
      ])}
    `;
  }

  global.Screens = global.Screens || {};
  global.Screens.a1 = { title: "Overview", sub, render, init() {} };
})(window);
