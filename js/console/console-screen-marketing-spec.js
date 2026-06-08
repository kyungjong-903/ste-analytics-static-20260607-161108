(function (global) {
  "use strict";

  const CHANNEL_COLORS = ["#2563eb", "#06b6d4", "#111827", "#10b981", "#f59e0b", "#64748b", "#8b5cf6"];
  const TYPE_COLORS = ["#2563eb", "#10b981", "#8b5cf6", "#f59e0b", "#64748b"];
  const SNS_COLORS = { Instagram: "#e1306c", TikTok: "#22d3ee", X: "#64748b" };
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const CLOSED_ACTUAL_MONTHS = 5;
  const TERRITORY_ROI_BASE = [
    { country: "France", spend: 270000, baseline: 5770000, lift: 1030000, total: 6800000, roas: 3.8 },
    { country: "Germany", spend: 98000, baseline: 2050000, lift: 353000, total: 2400000, roas: 3.6 },
    { country: "Belgium", spend: 55000, baseline: 1150000, lift: 248000, total: 1400000, roas: 4.5 },
    { country: "Netherlands", spend: 44000, baseline: 810000, lift: 189000, total: 1000000, roas: 4.3 },
    { country: "Switzerland", spend: 27000, baseline: 610000, lift: 86000, total: 700000, roas: 3.2 },
    { country: "Austria", spend: 22000, baseline: 410000, lift: 88000, total: 500000, roas: 4.0 },
    { country: "Luxembourg", spend: 11000, baseline: 250000, lift: 50000, total: 300000, roas: 4.5 },
    { country: "Morocco", spend: 11000, baseline: 340000, lift: 61000, total: 400000, roas: 5.5 },
    { country: "Tunisia", spend: 6000, baseline: 170000, lift: 29000, total: 200000, roas: 4.8 },
    { country: "Algeria", spend: 6000, baseline: 170000, lift: 30000, total: 200000, roas: 5.0 },
  ];
  const SNS_ENGAGEMENT_ROWS = [
    { date: "2026-04-22", channel: "TikTok", content: "French Open Activation Teaser", like: 24800, impression: 685000, cost: 4500, roas: 5.4 },
    { date: "2026-03-28", channel: "X", content: "Polo Spring Drop Post", like: 3150, impression: 78000, cost: 1800, roas: 3.2 },
    { date: "2026-03-12", channel: "Instagram", content: "SS26 Tennis Hero Reel", like: 18420, impression: 412000, cost: 3200, roas: 6.8 },
  ];

  function D() {
    return global.STEData;
  }

  function W() {
    return global.STESpecWidgets;
  }

  function M() {
    return global.STESpecModel;
  }

  function money(value, ent) {
    return D().money(value || 0, ent).book;
  }

  function compact(value) {
    return D().compact(value || 0);
  }

  function pct(value, digits) {
    return `${value >= 0 ? "+" : ""}${value.toFixed(digits == null ? 1 : digits)}%`;
  }

  function fmtMult(value) {
    return `${value.toFixed(1)}x`;
  }

  function intFmt(value) {
    return Math.round(value || 0).toLocaleString("en-US");
  }

  function euroInt(value) {
    return `€${intFmt(value)}`;
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
    if (state.axis === "season" && state.season && state.season !== "all") {
      return state.season.toUpperCase();
    }
    return `${labels[state.period] || state.period || "Year-to-Date"} ${state.year || "2026"}`;
  }

  function sub(state) {
    const code = global.UI && global.UI.dispCode ? global.UI.dispCode(state) : D().byId(state.entId).code;
    return `${code} - ${periodLabel(state)} - spend, ROI, SNS and compliance`;
  }

  function latestActual(series) {
    const values = (series || []).filter((v) => v != null);
    return values.length ? values[values.length - 1] : 0;
  }

  function marketingDetail(base, view) {
    const spend = base.spend || 0;
    const plan = base.spendPlan || spend;
    const planView = view === "plan";
    const displaySpend = planView ? plan : spend;
    const priorFactor = 0.84;
    const channelSeeds = [
      ["Instagram", "Performance", 0.32, 4.2, 0.36],
      ["TikTok", "Performance", 0.23, 4.6, 0.28],
      ["X", "Performance", 0.12, 3.0, 0.10],
      ["OOH", "Brand", 0.14, 2.8, 0.09],
      ["Print", "Brand", 0.08, 2.1, 0.06],
      ["Event", "Brand", 0.12, 3.4, 0.08],
      ["Influencer", "Brand", 0.05, 2.6, 0.03],
    ];
    const channels = channelSeeds.map(([name, type, share, roi, reachShare]) => ({
      name,
      type,
      share,
      spend: displaySpend * share,
      plan: plan * share,
      prior: spend * share * priorFactor,
      roi,
      reach: base.reach * reachShare,
    }));
    const typeSplit = [
      { label: "Brand Marketing", key: "brand", type: "Brand", share: 0.30, spend: displaySpend * 0.30, plan: plan * 0.34 },
      { label: "Performance Marketing", key: "performance", type: "Performance", share: 0.60, spend: displaySpend * 0.60, plan: plan * 0.57 },
      { label: "Product Photography", key: "photography", type: "Photography", share: 0.10, spend: displaySpend * 0.10, plan: plan * 0.09 },
    ];
    const spendQ = base.spendQ || { q: ["Q1", "Q2", "Q3", "Q4"], actual: [], plan: [] };
    const actualQ = spendQ.actual.map((v, i) => i < 2 ? v : null);
    const planQ = spendQ.plan;
    const priorQ = planQ.map((v, i) => Math.round(v * ([0.86, 0.81, 0.88, 0.84][i] || priorFactor)));
    const campaignsTop = [
      ["SS26 Tennis Hero", "Instagram + TikTok", "Feb-Mar", 0.082, 7.0, "Scale"],
      ["French Open Activation", "OOH + Event", "Apr-Jun", 0.150, 5.1, "Repeat"],
      ["Polo Spring Drop", "Instagram", "Mar-Apr", 0.051, 3.5, "Maintain"],
      ["Mothers Day", "X + Print", "May", 0.033, 3.0, "Optimize"],
      ["Riviera Capsule", "Instagram", "May-Jun", 0.045, 2.9, "Watch"],
    ].map(([name, channel, period, spendShare, roi, action]) => ({
      name,
      channel,
      period,
      spend: displaySpend * spendShare,
      sales: displaySpend * spendShare * roi,
      roi,
      action,
    }));
    const campaignsBottom = [
      ["FW Influencer #2", "Influencer", 0.040, 0.8, "Underperformance"],
      ["TikTok Test Drop", "TikTok", 0.027, 0.8, "Below threshold"],
      ["Print Lookbook Retarget", "Print", 0.022, 1.2, "Low attribution"],
    ].map(([name, channel, spendShare, roi, reason]) => ({
      name,
      channel,
      spend: displaySpend * spendShare,
      sales: displaySpend * spendShare * roi,
      roi,
      reason,
    }));
    const territoryScale = displaySpend && displaySpend !== 547000 ? displaySpend / 547000 : 1;
    const geo = TERRITORY_ROI_BASE.map((row) => ({
      country: row.country,
      spend: row.spend * territoryScale,
      baseline: row.baseline * territoryScale,
      lift: row.lift * territoryScale,
      total: row.total * territoryScale,
      roas: row.roas,
    }));
    const geoTotal = {
      country: "Total",
      spend: geo.reduce((a, r) => a + r.spend, 0),
      baseline: geo.reduce((a, r) => a + r.baseline, 0),
      lift: geo.reduce((a, r) => a + r.lift, 0),
      total: geo.reduce((a, r) => a + r.total, 0),
      roas: 3.9,
      totalRow: true,
    };
    const customerTypes = [
      { label: "Wholesale Trade Activation", value: displaySpend * 0.18, share: 18 },
      { label: "Retail / Brand DTC", value: displaySpend * 0.42, share: 42 },
      { label: "Marketplace Co-op", value: displaySpend * 0.15, share: 15 },
      { label: "ST Online Support", value: displaySpend * 0.10, share: 10 },
      { label: "Cross-channel Brand", value: displaySpend * 0.15, share: 15 },
    ];
    const reviews = [
      { asset: "French Open OOH", type: "Visual", submitted: "2026-04-20", status: "Approved", reviewer: "F&F Brand" },
      { asset: "Polo Campaign Hero", type: "Photo", submitted: "2026-04-15", status: "Approved", reviewer: "F&F Brand" },
      { asset: "Tennis Spring Video", type: "Video", submitted: "2026-03-10", status: "Approved", reviewer: "F&F Brand" },
    ];
    const sns = snsDetail(base);
    const complianceIssues = 0;
    return { channels, typeSplit, actualQ, planQ, priorQ, campaignsTop, campaignsBottom, geo, geoTotal, customerTypes, reviews, sns, complianceIssues };
  }

  function snsDetail(base) {
    const goals = { Instagram: 150000, TikTok: 110000, X: 48000 };
    const engagement = { Instagram: 4.2, TikTok: 5.1, X: 2.4 };
    const reachShare = { Instagram: 0.45, TikTok: 0.34, X: 0.21 };
    return ["Instagram", "TikTok", "X"].map((name) => {
      const src = base.sns && base.sns[name] ? base.sns[name] : { plan: [], actual: [], goal: goals[name] };
      const goal = goals[name] || src.goal;
      const plan = MONTHS.map((_, i) => Math.round(goal * ((i + 1) / 12)));
      const actualBase = src.actual && src.actual.length ? src.actual : plan.map((v, i) => i < 5 ? Math.round(v * 0.82) : null);
      const rawActual = actualBase.map((v, i) => i < CLOSED_ACTUAL_MONTHS ? Math.round((v || plan[i] * 0.82) * (goal / (src.goal || goal))) : null);
      const rawPrior = plan.map((v, i) => Math.round(v * (0.68 + i * 0.012)));
      const actual = rawPrior.map((v, i) => i < CLOSED_ACTUAL_MONTHS ? v : null);
      const prior = rawActual;
      const current = latestActual(actual);
      return {
        name,
        goal,
        plan,
        actual,
        prior,
        current,
        progress: goal ? current / goal * 100 : 0,
        engagement: engagement[name],
        reach: base.reach * reachShare[name],
        impressions: base.reach * reachShare[name] * 4,
        behind: current < plan[4] * 0.9,
        _swappedActualPrior: true,
      };
    });
  }

  function renderMarketingTypeControl() {
    return `<div class="f-group" style="justify-content:flex-end">
      <span class="f-lab">Marketing Type</span>
      <div class="seg" id="mkt-type-seg">
        <button class="on" data-mkt-type="all">All</button>
        <button data-mkt-type="brand">Brand</button>
        <button data-mkt-type="performance">Performance</button>
        <button data-mkt-type="photography">Photography</button>
      </div>
    </div>`;
  }

  function renderKpis(data, details) {
    const ent = data.ctx.entity;
    const pace = data.mkt.spendPlan ? data.mkt.spend / data.mkt.spendPlan * 100 : 0;
    const vsPlan = pace - 100;
    const issues = details.complianceIssues;
    const planView = data.ctx.view === "plan";
    const spendValue = planView ? data.mkt.spendPlan : data.mkt.spend;
    return `<div class="spec-grid g4">
      ${W().kpi(planView ? "Planned Spend" : "Total Spend", money(spendValue, ent), `<span class="muted">${planView ? `budget plan · actual ${money(data.mkt.spend, ent)}` : `YTD ${data.ctx.year}`}</span>`)}
      ${W().kpi(planView ? "Budget Pace" : "vs Plan", planView ? `${pace.toFixed(0)}%` : pct(vsPlan, 0), `<span class="muted">${planView ? "actual spend / plan" : `${pace.toFixed(0)}% of plan`}</span>`, Math.abs(vsPlan) > 10 ? "risk" : "ok")}
      ${W().kpi(planView ? "Target ROI / ROAS" : "ROI / ROAS", fmtMult(data.mkt.roi), `<span class="muted">${planView ? "planned return benchmark" : "Net sales return / spend"}</span>`, data.mkt.roi >= 3 ? "ok" : "risk")}
      ${W().kpi("Brand Compliance", `${issues} issues`, `<span class="muted">${details.reviews.length}/${details.reviews.length} approved</span>`, issues ? "risk" : "ok")}
    </div>`;
  }

  function renderSnsCards(details) {
    return details.sns.map((item, i) => `<div class="card card-pad" data-mkt-section="${item.name === "TikTok" ? "performance" : item.name === "Instagram" ? "performance" : "brand"}">
      <div class="between" style="gap:12px;margin-bottom:8px">
        <div class="center gap-8"><span class="sw" style="width:10px;height:10px;border-radius:3px;background:${SNS_COLORS[item.name]}"></span><b style="font-size:13px">${item.name}</b></div>
        <span class="pill ${item.behind ? "pill-amber" : "pill-green"}"><span class="dot"></span>${item.behind ? "Behind plan" : "On pace"}</span>
      </div>
      <div class="kval" style="font-size:20px">${compact(item.current)}<small style="font-size:12px"> / ${compact(item.goal)}</small></div>
      <div class="muted" style="font-size:11px;margin:4px 0 8px">${item.progress.toFixed(0)}% to year-end target</div>
      <div id="mkt-sns-${i}" class="chart" style="height:150px"></div>
      <div class="grid g-3" style="gap:8px;margin-top:10px">
        <div><div class="klabel" style="margin:0">Eng.</div><b>${item.engagement.toFixed(1)}%</b></div>
        <div><div class="klabel" style="margin:0">Reach</div><b>${compact(item.reach)}</b></div>
        <div><div class="klabel" style="margin:0">Impr.</div><b>${compact(item.impressions)}</b></div>
      </div>
    </div>`).join("");
  }

  function roasTone(value) {
    if (value >= 5) return "pill-green";
    if (value >= 2) return "pill-amber";
    return "pill-red";
  }

  function roasLabel(value) {
    return `${fmtMult(value)}${value >= 5 ? " ★" : value < 2 ? " ⚠" : ""}`;
  }

  function renderSnsEngagementTracker(data) {
    const ent = data.ctx.entity;
    const rows = SNS_ENGAGEMENT_ROWS;
    const best = rows.slice().sort((a, b) => b.roas - a.roas)[0];
    return `<div class="card card-pad mt-16" data-mkt-section="brand performance">
      ${W().sec("SNS Engagement Tracker", "Actual-only posting-level performance · AI Crawling", '<span class="pill pill-violet"><span class="dot"></span>AI Agent</span>')}
      <div class="between" style="gap:12px;margin:4px 0 14px;align-items:center">
        <div class="muted" style="font-size:12px">Last crawled: 2026-06-07 09:32 KST · Auto-sync every 4 hours · Read-only</div>
        <button class="btn btn-ghost btn-sm" type="button" data-mkt-refresh-sns>Refresh</button>
      </div>
      <div class="filterbar" style="margin:0 0 12px;padding:10px 12px;min-height:0">
        <div class="filter-group"><span class="filter-lab">Channel</span><span class="pill pill-gray">All Channels</span></div>
        <div class="filter-group"><span class="filter-lab">Date Range</span><span class="pill pill-gray">90 days</span></div>
        <div class="filter-group"><span class="filter-lab">Sort</span><span class="pill pill-gray">Posting Date</span></div>
      </div>
      ${W().table([
        { label: "Posting Date", key: "date" },
        { label: "Channel", key: "channel", render: (r) => `<span class="pill pill-gray"><span class="dot"></span>${W().esc(r.channel)}</span>` },
        { label: "Content", key: "content", render: (r) => `<b>${W().esc(r.content)}</b>` },
        { label: "Like", key: "like", num: true, render: (r) => intFmt(r.like) },
        { label: "Impression", key: "impression", num: true, render: (r) => intFmt(r.impression) },
        { label: "Advertising Cost", key: "cost", num: true, render: (r) => euroInt(r.cost) },
        { label: "ROAS", key: "roas", num: true, render: (r) => `<span class="pill ${roasTone(r.roas)}"><span class="dot"></span>${roasLabel(r.roas)}</span>` },
      ], rows)}
      <div class="card" style="margin-top:12px;padding:12px 14px;background:var(--panel-2);box-shadow:none">
        <div class="ai-line"><span class="sp">*</span><span><b>${W().esc(best.channel)} ${W().esc(best.content)}</b> achieved the highest ROAS (${fmtMult(best.roas)}) with ${euroInt(best.cost)} ad spend - scale this content format for SS27 launch.</span></div>
      </div>
    </div>`;
  }

  function renderCampaignTables(data, details) {
    const ent = data.ctx.entity;
    return `<div class="card card-pad mt-16" data-mkt-section="performance">
        ${W().sec("Top Campaigns by ROI", "Attributed sales and scaling action")}
        ${W().table([
          { label: "Campaign", key: "name" },
          { label: "Channel", key: "channel" },
          { label: "Period", key: "period" },
          { label: "Spend", key: "spend", num: true, render: (r) => money(r.spend, ent) },
          { label: "Sales", key: "sales", num: true, render: (r) => money(r.sales, ent) },
          { label: "ROI", key: "roi", num: true, render: (r) => fmtMult(r.roi) },
        ], details.campaignsTop)}
      </div>`;
  }

  function renderBreakdown(data, details) {
    const ent = data.ctx.entity;
    const planView = data.ctx.view === "plan";
    return `<div class="card card-pad mt-16" data-mkt-section="brand performance photography">
        ${W().sec("Budget Allocation", planView ? "Plan budget allocation with current actual pace" : "Actual pacing versus plan")}
        ${W().table([
          { label: "Type", key: "label" },
          { label: planView ? "Selected View" : "Actual", key: "spend", num: true, render: (r) => money(r.spend, ent) },
          { label: "Plan", key: "plan", num: true, render: (r) => money(r.plan, ent) },
          { label: "Pace", key: "pace", num: true, render: (r) => `${(r.spend / r.plan * 100).toFixed(0)}%` },
        ], details.typeSplit)}
      </div>`;
  }

  function renderGeoAndCompliance(data, details) {
    const ent = data.ctx.entity;
    const roiRows = details.geo.concat([details.geoTotal]);
    return `<div class="spec-grid g2 mt-16">
      <div class="card card-pad" data-mkt-section="brand">
        ${W().sec("Brand Compliance Tracker", "F&F brand review status")}
        <div class="spec-grid g3" style="gap:10px;margin-bottom:14px">
          <div><div class="klabel" style="margin:0">Score</div><div class="kval" style="font-size:22px">100%</div></div>
          <div><div class="klabel" style="margin:0">Reviews</div><div class="kval" style="font-size:22px">18</div></div>
          <div><div class="klabel" style="margin:0">Avg Approval</div><div class="kval" style="font-size:22px">2.3d</div></div>
        </div>
        ${W().table([
          { label: "Asset", key: "asset" },
          { label: "Type", key: "type" },
          { label: "Submitted", key: "submitted" },
          { label: "Status", key: "status" },
          { label: "Reviewer", key: "reviewer" },
        ], details.reviews)}
      </div>
      <div class="card card-pad" data-mkt-section="brand performance photography">
        ${W().sec("Territory ROI Table", "Baseline + AI-attributed lift + total net sales")}
        <div class="muted" style="font-size:11px;margin:-4px 0 10px">Sales Lift = AI Attribution Model 산출치 (MMM 기반)</div>
        ${W().table([
          { label: "Country", key: "country", render: (r) => r.totalRow ? `<b>${W().esc(r.country)}</b>` : W().esc(r.country) },
          { label: "Marketing Spend", key: "spend", num: true, render: (r) => r.totalRow ? `<b>${money(r.spend, ent)}</b>` : money(r.spend, ent) },
          { label: "Baseline Sales", key: "baseline", num: true, render: (r) => `<span style="color:var(--ink-3)">${r.totalRow ? "<b>" : ""}${money(r.baseline, ent)}${r.totalRow ? "</b>" : ""}</span>` },
          { label: "Sales Lift", key: "lift", num: true, render: (r) => `<b style="color:#1e3a8a">${money(r.lift, ent)}</b>` },
          { label: "Total Net Sales", key: "total", num: true, render: (r) => r.totalRow ? `<b>${money(r.total, ent)}</b>` : money(r.total, ent) },
          { label: "ROAS", key: "roas", num: true, render: (r) => `<span class="pill ${roasTone(r.roas)}"><span class="dot"></span>${r.totalRow ? fmtMult(r.roas) : roasLabel(r.roas)}</span>` },
        ], roiRows)}
      </div>
    </div>`;
  }

  function renderInsights(data, details) {
    const tikTok = details.sns.find((s) => s.name === "TikTok");
    const bestTerritory = details.geo.slice().sort((a, b) => b.roas - a.roas)[0];
    const lowTerritory = details.geo.slice().sort((a, b) => a.roas - b.roas)[0];
    const liftPct = details.geoTotal.total ? details.geoTotal.lift / details.geoTotal.total * 100 : 0;
    return W().ai([
      `French Open Activation delivered ${fmtMult(details.campaignsTop[1].roi)} ROI; repeat and scale for Roland-Garros 2027.`,
      `TikTok follower growth is ${tikTok.progress.toFixed(0)}% of target; shift spend from low-ROI print into creator partnerships.`,
      `${bestTerritory.country} achieved highest ROAS (${fmtMult(bestTerritory.roas)}) with ${money(bestTerritory.spend, data.ctx.entity)} spend; scale local creative and low-cost paid boosts.`,
      `${lowTerritory.country} is the lowest territory ROAS (${fmtMult(lowTerritory.roas)}); review channel mix and creative localization before adding spend.`,
      `Marketing-attributable lift ${money(details.geoTotal.lift, data.ctx.entity)} represents ${liftPct.toFixed(1)}% of total YTD sales; baseline ${money(details.geoTotal.baseline, data.ctx.entity)} confirms strong brand equity.`,
      `Brand Compliance is clean with ${details.complianceIssues} open issues and 18 of 18 recent reviews approved.`,
    ]);
  }

  function render(s) {
    const data = M().marketing(s);
    const details = marketingDetail(data.mkt, data.ctx.view);
    const planView = data.ctx.view === "plan";
    return `
      <div class="between" style="gap:16px;margin-bottom:14px;align-items:flex-start">
        <div>
          <div class="muted" style="font-size:12px">${planView ? "Committed plan budget" : "Monthly actuals"} &middot; In-territory marketing &middot; Calendar/Season context inherited</div>
        </div>
        ${renderMarketingTypeControl()}
      </div>
      ${renderKpis(data, details)}
      <div class="card card-pad mt-16" data-mkt-section="brand performance photography">
          ${W().sec("Spend Pacing", "Quarterly Actual / Plan / Prior Year")}
          <div id="mkt-spend-pacing" class="chart" style="height:300px"></div>
      </div>
      <div class="between" style="margin:24px 0 12px">
        <div>${W().sec("SNS Performance Tracking", "Monthly cumulative followers, plan, actual, and prior year")}</div>
      </div>
      <div class="spec-grid g3">${renderSnsCards(details)}</div>
      ${renderSnsEngagementTracker(data)}
      ${renderBreakdown(data, details)}
      ${renderCampaignTables(data, details)}
      ${renderGeoAndCompliance(data, details)}
      ${renderInsights(data, details)}
    `;
  }

  function init(s) {
    const data = M().marketing(s);
    const details = marketingDetail(data.mkt, data.ctx.view);
    renderCharts(data, details);
    bindMarketingTypeFilter();
    bindSnsTrackerRefresh();
  }

  function bindMarketingTypeFilter() {
    const seg = document.getElementById("mkt-type-seg");
    if (!seg) return;
    seg.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-mkt-type]");
      if (!btn) return;
      const type = btn.getAttribute("data-mkt-type");
      seg.querySelectorAll("[data-mkt-type]").forEach((b) => b.classList.toggle("on", b === btn));
      document.querySelectorAll("[data-mkt-section]").forEach((el) => {
        const allowed = el.getAttribute("data-mkt-section").split(/\s+/);
        el.style.display = type === "all" || allowed.includes(type) ? "" : "none";
      });
    });
  }

  function bindSnsTrackerRefresh() {
    const btn = document.querySelector("[data-mkt-refresh-sns]");
    if (!btn || btn._steSnsRefreshWired) return;
    btn._steSnsRefreshWired = true;
    btn.addEventListener("click", () => {
      if (global.STEApp && global.STEApp.toast) {
        global.STEApp.toast("SNS crawler refresh requested (mock)", "info");
      }
    });
  }

  function renderCharts(data, details) {
    renderSpendPacing(document.getElementById("mkt-spend-pacing"), details, data.ctx.entity);
    if (global.Charts) {
      details.sns.forEach((item, i) => renderSnsChart(document.getElementById(`mkt-sns-${i}`), item));
    }
  }

  function mountChart(el) {
    if (!el || !global.echarts) return null;
    const old = global.echarts.getInstanceByDom(el);
    if (old) old.dispose();
    return global.echarts.init(el, null, { renderer: "canvas" });
  }

  function chartTooltip() {
    return {
      backgroundColor: "#1f2937",
      borderColor: "rgba(255,255,255,0.12)",
      borderWidth: 1,
      padding: [10, 12],
      textStyle: { color: "#f9fafb", fontFamily: "Inter, system-ui, sans-serif", fontSize: 12 },
      extraCssText: "border-radius:10px; box-shadow:0 24px 64px rgba(0,0,0,0.35);",
    };
  }

  function renderSpendPacing(el, details, ent) {
    const inst = mountChart(el);
    if (!inst) return;
    const sym = "EUR ";
    inst.setOption({
      animation: false,
      tooltip: Object.assign({}, chartTooltip(), { trigger: "axis" }),
      legend: { top: 0, right: 0, textStyle: { color: "#64748b", fontSize: 11 }, data: ["Actual", "Plan", "Prior Year"] },
      grid: { left: 8, right: 16, top: 36, bottom: 6, containLabel: true },
      xAxis: { type: "category", data: ["Q1", "Q2", "Q3", "Q4"], axisTick: { show: false }, axisLine: { lineStyle: { color: "rgba(15,23,42,0.16)" } } },
      yAxis: { type: "value", splitLine: { lineStyle: { color: "rgba(15,23,42,0.06)" } }, axisLabel: { color: "#8b94a6", formatter: (v) => sym + compact(v) } },
      series: [
        { name: "Prior Year", type: "bar", data: details.priorQ, barWidth: 18, itemStyle: { color: "#cbd5e1", borderRadius: [4, 4, 0, 0], opacity: 0.75 } },
        { name: "Actual", type: "bar", data: details.actualQ, barWidth: 22, itemStyle: { color: "#1e3a8a", borderRadius: [5, 5, 0, 0] } },
        { name: "Plan", type: "line", data: details.planQ, symbol: "none", lineStyle: { color: "#94a3b8", width: 2, type: "dashed" } },
      ],
    });
  }

  function renderSnsChart(el, item) {
    const inst = mountChart(el);
    if (!inst) return;
    inst.setOption({
      animation: false,
      tooltip: Object.assign({}, chartTooltip(), { trigger: "axis" }),
      grid: { left: 6, right: 10, top: 12, bottom: 4, containLabel: true },
      xAxis: { type: "category", data: MONTHS, boundaryGap: false, axisTick: { show: false }, axisLabel: { color: "#8b94a6", fontSize: 9.5, interval: 1 } },
      yAxis: { type: "value", splitLine: { lineStyle: { color: "rgba(15,23,42,0.06)" } }, axisLabel: { color: "#8b94a6", fontSize: 9.5, formatter: (v) => compact(v) } },
      series: [
        { name: "Prior Year", type: "line", data: item.prior, smooth: true, symbol: "none", lineStyle: { color: "#cbd5e1", width: 1.5 } },
        { name: "Plan", type: "line", data: item.plan, smooth: true, symbol: "none", lineStyle: { color: "#94a3b8", width: 1.5, type: "dashed" } },
        { name: "Actual", type: "line", data: item.actual, smooth: true, symbol: "none", lineStyle: { color: SNS_COLORS[item.name], width: 3 } },
      ],
    });
  }

  function renderGeoChart(el, geo, ent) {
    const inst = mountChart(el);
    if (!inst) return;
    const rows = geo.slice().reverse();
    inst.setOption({
      animation: false,
      tooltip: Object.assign({}, chartTooltip(), { trigger: "axis" }),
      grid: { left: 8, right: 40, top: 8, bottom: 6, containLabel: true },
      xAxis: { type: "value", splitLine: { lineStyle: { color: "rgba(15,23,42,0.06)" } }, axisLabel: { color: "#8b94a6", formatter: (v) => "EUR " + compact(v) } },
      yAxis: { type: "category", data: rows.map((r) => r.country), axisTick: { show: false }, axisLabel: { color: "#5b6577", fontSize: 11 } },
      series: [{
        name: "Spend",
        type: "bar",
        data: rows.map((r) => r.spend),
        barWidth: "58%",
        itemStyle: { color: "#2563eb", borderRadius: [0, 5, 5, 0] },
        label: { show: true, position: "right", color: "#8b94a6", fontSize: 10, formatter: (p) => `${geo[geo.length - 1 - p.dataIndex].roi.toFixed(1)}x` },
      }],
    });
  }

  global.STEMarketingSpecTestHooks = {
    marketingDetail,
    snsDetail,
  };

  global.Screens = global.Screens || {};
  global.Screens.a5 = { title: "Marketing", sub, render, init };
})(window);
