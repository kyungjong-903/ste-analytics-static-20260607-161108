/* =========================================================
   Analytics spec override — A4 Inventory (#/analytics/inventory)
   Overrides window.Screens.a4 only (loads after console-screens-a345.js;
   the fallback bundle stays untouched).
   Spec: docs/specs/STE_Analytics_Spec_Inventory.md
   Mock baseline: docs/specs/STE_Analytics_MockData_SUGI_France.md
   Base data: STESpecModel.inventory(state) → STEData.inventoryFor.
   Inventory-only derived arrays stay local to this file (parallel-work rule).
   Plan mode and future-period empty states are handled by console-host.js.
   ========================================================= */
(function (global) {
  "use strict";

  const D = () => global.STEData;
  const model = () => global.STESpecModel;
  const widgets = () => global.STESpecWidgets;

  const periodLabel = (p) => ({ ytd: "YTD", q1: "Q1", q2: "Q2", q3: "Q3", q4: "Q4", cum1: "Through Q1", cum2: "Through Q2", cum3: "Through Q3", full: "Full Year" }[p] || p) + " " + (global.__steYear || "2026");

  /* Deterministic local rng — same pattern as the fallback bundle. */
  function mul(str) { let a = 2166136261; for (let i = 0; i < str.length; i++) { a ^= str.charCodeAt(i); a = Math.imul(a, 16777619); } a = a >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* SUGI France 10-country territory stock split (MockData §8). Other
     entities fall back to their own country list with seeded weights so the
     page is not SUGI-hardcoded. */
  const SUGI_COUNTRIES = [
    ["France", 0.46], ["Germany", 0.18], ["Belgium", 0.10], ["Netherlands", 0.08],
    ["Switzerland", 0.05], ["Austria", 0.04], ["Luxembourg", 0.03],
    ["Morocco", 0.04], ["Tunisia", 0.01], ["Algeria", 0.01],
  ];

  /* Markdown suggestion bands per spec §6.2: 90-150d → 20%, 150-200d → 35%,
     200+d → 50% / clearance. */
  function markdownRule(aged) {
    if (aged >= 200) return { mark: 50, action: "Clearance" };
    if (aged >= 150) return { mark: 35, action: "Markdown" };
    return { mark: 20, action: "Markdown" };
  }

  function movementDetail(inv) {
    const mv = inv.movement;
    const ending = inv.stockValue;
    const beginning = Math.max(0, ending - mv.inbound - mv.returns + mv.sold + mv.markdownVal);
    const denom = beginning + mv.inbound;
    return {
      beginning, ending,
      inbound: mv.inbound, returns: mv.returns, sold: mv.sold, markdownVal: mv.markdownVal,
      sellThrough: denom > 0 ? mv.sold / denom * 100 : 0,
      returnRate: mv.sold > 0 ? mv.returns / mv.sold * 100 : 0,
      adjRate: denom > 0 ? mv.markdownVal / denom * 100 : 0,
    };
  }

  function countryStock(data) {
    const inv = data.inv;
    const ent = data.ctx.entity;
    let rows;
    if (ent.id === "sugifr") rows = SUGI_COUNTRIES;
    else {
      const names = D().COUNTRIES[ent.id] || D().COUNTRIES.total;
      const rng = mul(ent.id + "invgeo");
      const w = names.map(() => 0.4 + rng());
      const ws = w.reduce((a, b) => a + b, 0);
      rows = names.map((n, i) => [n, w[i] / ws]);
    }
    const rng2 = mul(ent.id + "invsts");
    return rows.map(([name, share]) => ({
      name,
      share: share * 100,
      value: inv.stockValue * share,
      sts: inv.stockToSales * (0.75 + rng2() * 0.9),
    })).sort((a, b) => b.value - a.value);
  }

  /* Spec-shaped deterministic detail derived from the STEData inventory base. */
  function inventoryDetail(data) {
    const inv = data.inv;

    // Season composition (spec §5.3 shares)
    const seasonStock = [
      { season: "SS26", share: 54, status: "Fresh", pill: "pill-green", color: "var(--green)" },
      { season: "FW25", share: 23, status: "Sell-through", pill: "pill-blue", color: "var(--accent)" },
      { season: "SS25", share: 10, status: "Markdown", pill: "pill-amber", color: "var(--amber)" },
      { season: "Older", share: 5, status: "Clearance", pill: "pill-red", color: "var(--red)" },
      { season: "FW26", share: 8, status: "Pre-launch", pill: "pill-violet", color: "var(--violet)" },
    ].map((r) => Object.assign(r, { value: inv.stockValue * r.share / 100 }));

    // Category mix (spec §5.1) and WEAR sub-category split (spec §5.2)
    const catMix = {
      wear: inv.stockValue * 0.78, wearPct: 78,
      acc: inv.stockValue * 0.22, accPct: 22,
    };
    const subcats = [
      { label: "INNER", pct: 40 }, { label: "BOTTOM", pct: 27 },
      { label: "OUTER", pct: 20 }, { label: "OTHERS", pct: 13 },
    ].map((r) => Object.assign(r, { value: catMix.wear * r.pct / 100 }));

    // Risk flags (spec §6.1 / §6.2) — sorted by weeks remaining / aged days
    const stockout = [
      { sku: "ST-26-001", name: "Classic Polo White", category: "WEAR · POLO", stock: 63, weekly: 30, weeks: 2.1 },
      { sku: "ST-26-014", name: "Heritage Track Top Navy", category: "WEAR · TRACKTOP", stock: 95, weekly: 34, weeks: 2.8 },
      { sku: "ST-26-021", name: "Pique Polo Navy", category: "WEAR · POLO", stock: 120, weekly: 40, weeks: 3.0 },
      { sku: "ST-26-018", name: "Tennis Polo W M", category: "WEAR · INNER", stock: 142, weekly: 38, weeks: 3.7 },
      { sku: "ST-26-024", name: "Court Skirt M", category: "WEAR · BOTTOM", stock: 96, weekly: 22, weeks: 4.4 },
      { sku: "ST-26-A05", name: "Classic Cap", category: "ACC · HEADWEAR", stock: 210, weekly: 45, weeks: 4.7 },
    ];
    const markdown = [
      { sku: "ST-25-007", name: "Ski Pants Race", category: "WEAR · OUTER", aged: 262, value: inv.stockValue * 0.018 },
      { sku: "ST-25-052", name: "Dress Court Pleat", category: "WEAR · INNER", aged: 240, value: inv.stockValue * 0.014 },
      { sku: "ST-25-014", name: "Leggings Print", category: "WEAR · BOTTOM", aged: 221, value: inv.stockValue * 0.013 },
      { sku: "ST-24-B02", name: "Old Season Bag", category: "ACC · BAG", aged: 208, value: inv.stockValue * 0.002 },
      { sku: "ST-25-T08", name: "SS25 Polo Y", category: "WEAR · INNER", aged: 184, value: inv.stockValue * 0.005 },
      { sku: "ST-25-J03", name: "SS25 Track Jacket", category: "WEAR · OUTER", aged: 162, value: inv.stockValue * 0.006 },
    ].map((r) => Object.assign(r, markdownRule(r.aged)));

    // Age buckets (spec §9) — 90+ days share reconciles with the Aged KPI
    const fresh = Math.max(0, 100 - inv.aged);
    const ageBuckets = [
      { label: "0-30 days", share: fresh * 0.6 },
      { label: "30-90 days", share: fresh * 0.4 },
      { label: "90-180 days", share: inv.aged * 0.78 },
      { label: "180+ days", share: inv.aged * 0.22 },
    ].map((b) => Object.assign(b, { value: inv.stockValue * b.share / 100 }));

    return {
      seasonStock, seasonMax: 54,
      catMix, subcats, subcatMax: 40,
      stockout, markdown, ageBuckets,
      countries: countryStock(data),
      movement: movementDetail(inv),
    };
  }

  /* Seeded vs-prior-quarter deltas for the KPI tiles. */
  function kpiDeltas(data) {
    const rng = mul(data.ctx.entity.id + data.ctx.period + (data.ctx.season || "") + "invdelta");
    return {
      stock: rng() * 12 - 4,
      sts: rng() * 1.0 - 0.55,
      aged: Math.round(rng() * 5) - 1,
      turn: rng() * 0.5 - 0.15,
    };
  }
  const signed = (v, d) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(d);
  function dspan(v, txt, goodWhenDown) {
    const good = goodWhenDown ? v <= 0 : v >= 0;
    return `<span class="delta ${good ? "up" : "down"}">${v >= 0 ? "▲" : "▼"} ${txt} vs prior Q</span>`;
  }

  function barRow(label, valTxt, pctTxt, color, width) {
    return `<div style="margin-bottom:12px">
      <div class="between" style="font-size:12px;margin-bottom:4px"><span>${label}</span><b class="mono">${valTxt} · ${pctTxt}</b></div>
      <div class="minibar"><i style="width:${Math.min(100, Math.round(width))}%;background:${color}"></i></div>
    </div>`;
  }

  /* Reactive AI narrative (spec §10) — derived from the same filtered data. */
  function aiLines(data, det) {
    const inv = data.inv;
    const c = D().compact;
    const urgent = det.stockout.filter((r) => r.weeks < 4);
    const urgentCat = (urgent[0] || det.stockout[0]).category;
    const agedVal = det.markdown.filter((r) => r.aged >= 150).reduce((a, r) => a + r.value, 0);
    const topC = det.countries.slice().sort((a, b) => b.sts - a.sts)[0];
    const lines = [];
    lines.push(`<b>Stockout risk:</b> ${urgent.length} SKU${urgent.length === 1 ? "" : "s"} may run out within 4 weeks at current sell-through — prioritise reorder review on <b>${urgentCat}</b> lines.`);
    lines.push(`<b>€${c(agedVal)}</b> of stock aged 150+ days — suggest 35–50% markdown to clear before the next season launch.`);
    if (topC) lines.push(`<b>${topC.name}</b> stock-to-sales at <b>${topC.sts.toFixed(1)} months</b> vs portfolio average ${inv.stockToSales.toFixed(1)} — over-supplied; consider rebalancing toward faster markets.`);
    lines.push(`Inventory turn <b>${inv.turn.toFixed(1)}×</b> vs sport-lifestyle benchmark 2.8× — ${inv.turn >= 2.8 ? "ahead of pace; current buy depth is sustainable" : "aging stock is the primary driver; action the markdown candidates above first"}.`);
    return lines;
  }

  /* ---- Local ECharts helpers for charts without a Charts.* match ---- */
  function mountLocal(el) {
    if (!el || !global.echarts) return null;
    const prev = global.echarts.getInstanceByDom(el);
    if (prev) prev.dispose();
    return global.echarts.init(el, null, { renderer: "canvas" });
  }
  function tipBase(C) {
    return {
      backgroundColor: C.tipBg || "#1f2937", borderColor: C.tipBorder || "rgba(255,255,255,0.12)",
      borderWidth: 1, padding: [10, 12],
      textStyle: { color: C.tipInk || "#f9fafb", fontSize: 12 },
      extraCssText: "border-radius:10px; box-shadow:0 24px 64px rgba(0,0,0,0.35);",
    };
  }

  function renderInventoryCharts(s) {
    const data = model().inventory(s);
    const inv = data.inv;
    const ent = data.ctx.entity;
    const det = inventoryDetail(data);
    const Ch = global.Charts;
    const C = (Ch && Ch.C) || {};
    const sym = global.UI ? global.UI.curSym(ent) : "€";
    const fmt = (v) => sym + (Ch && Ch.fmtK ? Ch.fmtK(v) : Math.round(v));
    const MONO = "'JetBrains Mono', ui-monospace, monospace";

    // Category × Season matrix — heatmap (existing helper)
    const mx = document.getElementById("inv-matrix");
    if (mx && Ch && global.echarts) Ch.heatmap(mx, inv.seasons, inv.categories, inv.matrix, { min: 0, max: 100, label: "Stock value index", unit: "" });

    // Stock value trend — Actual + Prior Year 2-line (no Plan for Inventory)
    const tr = document.getElementById("inv-stock-trend");
    if (tr && Ch && global.echarts) {
      const am = D().actualMonths();
      const qStart = [0, 3, 6, 9];
      const yy = String(data.ctx.year || "2026").slice(2);
      const labels = inv.q.map((q) => `${q} '${yy}`);
      const actual = inv.snap.map((v, i) => (qStart[i] < am ? v : null));
      Ch.cumulativeLine(tr, { months: labels, actual, plan: [null, null, null, null], prior: inv.snapPrior }, { sym });
    }

    // Category mix donut
    const cm = document.getElementById("inv-cat-mix");
    if (cm && Ch && global.echarts) {
      Ch.donut(cm, [
        { label: "WEAR", value: Math.round(det.catMix.wear) },
        { label: "ACC", value: Math.round(det.catMix.acc) },
      ], { palette: [C.blue || "#2563eb", C.cyan || "#0891b2"], sym });
    }

    // QoQ movement waterfall (no Charts.* helper — local, guarded)
    const mvInst = mountLocal(document.getElementById("inv-movement"));
    if (mvInst) {
      const m = det.movement;
      const steps = [
        { label: "Beginning", offset: 0, value: m.beginning, color: C.plan || "#94a3b8", sign: "" },
        { label: "Inbound", offset: m.beginning, value: m.inbound, color: C.green || "#059669", sign: "+" },
        { label: "Returns", offset: m.beginning + m.inbound, value: m.returns, color: C.green || "#059669", sign: "+" },
        { label: "Sold", offset: m.beginning + m.inbound + m.returns - m.sold, value: m.sold, color: C.red || "#dc2626", sign: "−" },
        { label: "Markdowns", offset: m.ending, value: m.markdownVal, color: C.amber || "#d97706", sign: "−" },
        { label: "Ending", offset: 0, value: m.ending, color: C.actual || "#2563eb", sign: "" },
      ];
      mvInst.setOption({ animation: false,
        tooltip: Object.assign(tipBase(C), { trigger: "axis", axisPointer: { type: "shadow", shadowStyle: { color: "rgba(148,163,184,0.06)" } },
          formatter: (ps) => { const p = ps[ps.length - 1]; const st = steps[p.dataIndex]; return `<b>${st.label}</b><br/>${st.sign}${fmt(st.value)}`; } }),
        grid: { left: 8, right: 16, top: 28, bottom: 6, containLabel: true },
        xAxis: { type: "category", data: steps.map((x) => x.label), axisLine: { lineStyle: { color: C.axis || "rgba(15,23,42,0.16)" } }, axisTick: { show: false }, axisLabel: { color: C.ink3 || "#8b94a6", fontSize: 10.5 } },
        yAxis: { type: "value", splitLine: { lineStyle: { color: C.grid || "rgba(15,23,42,0.06)" } }, axisLabel: { color: C.ink3 || "#8b94a6", fontFamily: MONO, fontSize: 10.5, formatter: (v) => fmt(v) } },
        series: [
          { type: "bar", stack: "wf", itemStyle: { color: "transparent" }, emphasis: { itemStyle: { color: "transparent" } }, tooltip: { show: false }, data: steps.map((x) => Math.round(x.offset)) },
          { type: "bar", stack: "wf", barWidth: "54%",
            data: steps.map((x) => ({ value: Math.round(x.value), itemStyle: { color: x.color, borderRadius: [4, 4, 0, 0] } })),
            label: { show: true, position: "top", fontSize: 10.5, fontFamily: MONO, color: C.ink3 || "#8b94a6", formatter: (p) => steps[p.dataIndex].sign + fmt(p.value) } },
        ],
      });
    }

    // Age distribution histogram (local, guarded)
    const agInst = mountLocal(document.getElementById("inv-age-dist"));
    if (agInst) {
      const cols = [C.green || "#059669", C.blue || "#2563eb", C.amber || "#d97706", C.red || "#dc2626"];
      agInst.setOption({ animation: false,
        tooltip: Object.assign(tipBase(C), { trigger: "item", formatter: (p) => { const b = det.ageBuckets[p.dataIndex]; return `<b>${b.label}</b><br/>${fmt(b.value)} · ${b.share.toFixed(0)}% of stock`; } }),
        grid: { left: 8, right: 16, top: 28, bottom: 6, containLabel: true },
        xAxis: { type: "category", data: det.ageBuckets.map((b) => b.label), axisLine: { lineStyle: { color: C.axis || "rgba(15,23,42,0.16)" } }, axisTick: { show: false }, axisLabel: { color: C.ink3 || "#8b94a6", fontSize: 10.5 } },
        yAxis: { type: "value", splitLine: { lineStyle: { color: C.grid || "rgba(15,23,42,0.06)" } }, axisLabel: { color: C.ink3 || "#8b94a6", fontFamily: MONO, fontSize: 10.5, formatter: (v) => fmt(v) } },
        series: [{ type: "bar", barWidth: "56%",
          data: det.ageBuckets.map((b, i) => ({ value: Math.round(b.value), itemStyle: { color: cols[i], borderRadius: [4, 4, 0, 0] } })),
          label: { show: true, position: "top", fontSize: 10.5, fontFamily: MONO, color: C.ink3 || "#8b94a6", formatter: (p) => det.ageBuckets[p.dataIndex].share.toFixed(0) + "%" } }],
      });
    }

    // Country inventory — horizontal bars with share + stock-to-sales aux metric
    const coInst = mountLocal(document.getElementById("inv-country"));
    if (coInst) {
      const rows = det.countries.slice().reverse(); // largest on top
      coInst.setOption({ animation: false,
        tooltip: Object.assign(tipBase(C), { trigger: "item", formatter: (p) => { const r = rows[p.dataIndex]; return `<b>${r.name}</b><br/>${fmt(r.value)} · ${r.share.toFixed(0)}% of stock<br/>Stock-to-Sales: <b>${r.sts.toFixed(1)} mo</b>`; } }),
        grid: { left: 8, right: 96, top: 8, bottom: 6, containLabel: true },
        xAxis: { type: "value", splitLine: { lineStyle: { color: C.grid || "rgba(15,23,42,0.06)" } }, axisLabel: { color: C.ink3 || "#8b94a6", fontFamily: MONO, fontSize: 10.5, formatter: (v) => fmt(v) } },
        yAxis: { type: "category", data: rows.map((r) => r.name), axisLine: { lineStyle: { color: C.axis || "rgba(15,23,42,0.16)" } }, axisTick: { show: false }, axisLabel: { color: C.ink || "#5b6577", fontSize: 11.5 } },
        series: [{ type: "bar", barWidth: "58%",
          data: rows.map((r) => ({ value: Math.round(r.value), itemStyle: { color: r.sts > inv.stockToSales * 1.25 ? (C.amber || "#d97706") : (C.blue || "#2563eb"), borderRadius: [0, 4, 4, 0] } })),
          label: { show: true, position: "right", fontSize: 10.5, fontFamily: MONO, color: C.ink3 || "#8b94a6", formatter: (p) => { const r = rows[p.dataIndex]; return `${r.share.toFixed(0)}% · ${r.sts.toFixed(1)}mo`; } } }],
      });
    }
  }

  global.Screens = global.Screens || {};
  global.Screens.a4 = {
    title: "Inventory",
    sub(s) { return `${global.UI.dispCode(s)} · ${periodLabel(s.period)} · stock health & aging`; },
    render(s) {
      const data = model().inventory(s);
      const W = widgets();
      const inv = data.inv;
      const ent = data.ctx.entity;
      const money = (v) => D().money(v, ent).book;
      const det = inventoryDetail(data);
      const k = kpiDeltas(data);
      const C = (global.Charts && global.Charts.C) || {};
      const prodCell = (r) => `<b>${W.esc(r.name)}</b><div class="muted" style="font-size:11px">${W.esc(r.category)}</div>`;
      const wkCell = (r) => { const col = r.weeks < 4 ? "var(--red)" : r.weeks < 8 ? "var(--amber)" : "var(--green)"; return `<b class="mono" style="color:${col}">${r.weeks.toFixed(1)} wk</b>`; };

      const kpis = `<div class="spec-grid g4">
        ${W.kpi("Stock Value", money(inv.stockValue), `<span class="muted" style="font-size:11px">period-end snapshot · ${k.stock >= 0 ? "▲" : "▼"} ${signed(k.stock, 1)}% vs prior Q</span>`)}
        ${W.kpi("Stock-to-Sales", `${inv.stockToSales.toFixed(1)}mo`, `${dspan(k.sts, signed(k.sts, 1) + "mo", true)} <span class="muted" style="font-size:11px">· target ≤ 3.0mo</span>`, inv.stockToSales > 3 ? "risk" : "ok")}
        ${W.kpi("Aged Stock %", `${inv.aged}%`, `${dspan(k.aged, signed(k.aged, 0) + "pp", true)} <span class="muted" style="font-size:11px">· 90+ days share</span>`, inv.aged > 20 ? "risk" : "")}
        ${W.kpi("Turnover", `${inv.turn.toFixed(1)}×`, `${dspan(k.turn, signed(k.turn, 1) + "×", false)} <span class="muted" style="font-size:11px">· annualised</span>`)}
      </div>`;

      const legendTrend = `<div class="legend"><span class="lg"><span class="ln" style="border-color:${C.actual || "#2563eb"};border-top-width:3px;width:18px"></span>Actual</span><span class="lg"><span class="ln" style="border-color:${C.prior || "#cbd5e1"}"></span>Prior Year</span></div>`;
      const mainRow = `<div class="spec-grid g2 mt-16">
        <div class="card card-pad">${W.sec("Category × Season Matrix", "Stock value index by category and season — low cells flag aged or stockout risk")}<div id="inv-matrix" class="chart" style="height:300px"></div></div>
        <div class="card card-pad">${W.sec("Stock Value Trend", "Quarter-end snapshots · no plan concept for Inventory", legendTrend)}<div id="inv-stock-trend" class="chart" style="height:300px"></div></div>
      </div>`;

      const comp = `<div class="spec-grid g3 mt-16">
        <div class="card card-pad">${W.sec("Category Mix", "Share of stock value")}<div id="inv-cat-mix" class="chart" style="height:188px"></div>
          <div class="legend wrap" style="margin-top:12px;justify-content:center">
            <span class="lg"><span class="sw" style="background:${C.blue || "#2563eb"}"></span>WEAR ${det.catMix.wearPct}% · ${money(det.catMix.wear)}</span>
            <span class="lg"><span class="sw" style="background:${C.cyan || "#0891b2"}"></span>ACC ${det.catMix.accPct}% · ${money(det.catMix.acc)}</span>
          </div>
        </div>
        <div class="card card-pad">${W.sec("Sub-Category — WEAR", "Stock value split within WEAR")}
          ${det.subcats.map((r) => barRow(r.label, money(r.value), r.pct + "%", "var(--accent)", r.pct / det.subcatMax * 96)).join("")}
        </div>
        <div class="card card-pad">${W.sec("Season Composition", "Stock value by season lifecycle state")}
          ${det.seasonStock.map((r) => barRow(
            `<span class="center gap-8">${r.season}<span class="pill ${r.pill}"><span class="dot"></span>${r.status}</span></span>`,
            money(r.value), Math.round(r.share) + "%", r.color, r.share / det.seasonMax * 96)).join("")}
        </div>
      </div>`;

      const risk = `<div class="spec-grid g2 mt-16">
        <div class="card card-pad" style="border-color:var(--red-dim)">${W.sec("Stockout Candidates", "High sell-through with low cover — sorted by weeks remaining")}
          ${W.table([
            { label: "SKU", key: "sku" },
            { label: "Product", key: "name", render: prodCell },
            { label: "Stock", key: "stock", num: true },
            { label: "Wk Sell", key: "weekly", num: true },
            { label: "Weeks Left", key: "weeks", num: true, render: wkCell },
            { label: "Action", key: "action", render: () => `<span class="pill pill-blue"><span class="dot"></span>Reorder</span>` },
          ], det.stockout)}
        </div>
        <div class="card card-pad" style="border-color:var(--amber-dim)">${W.sec("Markdown Candidates", "Aged inventory — suggested markdown by aging band")}
          ${W.table([
            { label: "SKU", key: "sku" },
            { label: "Product", key: "name", render: prodCell },
            { label: "Aged", key: "aged", num: true, render: (r) => `<b class="mono" style="color:${r.aged >= 200 ? "var(--red)" : "var(--amber)"}">${r.aged}d</b>` },
            { label: "Value", key: "value", num: true, render: (r) => money(r.value) },
            { label: "Mark %", key: "mark", num: true, render: (r) => `<b class="mono">${r.mark}%</b>` },
            { label: "Action", key: "action", render: (r) => `<span class="pill ${r.action === "Clearance" ? "pill-red" : "pill-amber"}"><span class="dot"></span>${r.action}</span>` },
          ], det.markdown)}
        </div>
      </div>`;

      const m = det.movement;
      const rateTile = (label, val, formula) => `<div><div class="klabel" style="margin:0">${label}</div><div class="kval" style="font-size:20px;margin-top:6px">${val}</div><div class="muted" style="font-size:11px;margin-top:2px">${formula}</div></div>`;
      const movement = `<div class="card card-pad mt-16">
        ${W.sec("Quarter-over-Quarter Movement", "Beginning stock + inbound + returns − sold − markdowns → ending stock")}
        <div id="inv-movement" class="chart" style="height:280px"></div>
        <hr class="div" style="margin:16px 0"/>
        <div class="spec-grid g3">
          ${rateTile("Sell-through rate", m.sellThrough.toFixed(0) + "%", "Sold ÷ (Beginning + Inbound)")}
          ${rateTile("Return rate", m.returnRate.toFixed(1) + "%", "Returns ÷ Sold")}
          ${rateTile("Adjustment rate", m.adjRate.toFixed(1) + "%", "Markdowns ÷ (Beginning + Inbound)")}
        </div>
      </div>`;

      const geoAge = `<div class="spec-grid g2 mt-16">
        <div class="card card-pad">${W.sec("Age Distribution", "Stock value by aging bucket — 90+ days share drives the Aged KPI")}<div id="inv-age-dist" class="chart" style="height:280px"></div></div>
        <div class="card card-pad">${W.sec("Country Inventory", "Stock value by territory · bar label = share + stock-to-sales")}<div id="inv-country" class="chart" style="height:280px"></div></div>
      </div>`;

      const snapLabel = s.axis === "season" ? String(s.season || "").toUpperCase() + " season" : periodLabel(s.period);
      const aiCard = `<div class="card card-pad spec-ai">
        ${W.sec("AI Inventory Insights", snapLabel + " snapshot · auto-generated, reactive to filters")}
        ${aiLines(data, det).map((line) => `<div class="ai-line"><span class="sp">*</span><span>${line}</span></div>`).join("")}
      </div>`;

      return kpis + mainRow + comp + risk + movement + geoAge + aiCard;
    },
    init(s) {
      renderInventoryCharts(s);
    },
  };
})(window);
