/* =========================================================
   Analytics — Distribution spec page (overrides Screens.a3)
   Spec: docs/specs/STE_Analytics_Spec_Distribution.md
   Data: STESpecModel.distribution(state) base + local
   deterministic spec-shaped detail (kept in this file per the
   parallel-work protocol; shared model/widgets untouched).
   ========================================================= */
(function (global) {
  "use strict";

  const D = () => global.STEData;
  const model = () => global.STESpecModel;
  const widgets = () => global.STESpecWidgets;

  const FONT = "Inter, system-ui, sans-serif";
  const MONO = "'JetBrains Mono', ui-monospace, monospace";

  /* Deterministic rng — same pattern as console-screens-a345.js */
  function mul(str) {
    let a = 2166136261;
    for (let i = 0; i < str.length; i++) { a ^= str.charCodeAt(i); a = Math.imul(a, 16777619); }
    a = a >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---- Local ECharts plumbing (no Charts helper matches these shapes) ---- */
  const registry = new Set();
  let resizeWired = false;
  function mount(el) {
    if (!el || !global.echarts) return null;
    const prev = global.echarts.getInstanceByDom(el);
    if (prev) prev.dispose();
    const inst = global.echarts.init(el, null, { renderer: "canvas" });
    registry.forEach((i) => { if (i.isDisposed && i.isDisposed()) registry.delete(i); });
    registry.add(inst);
    if (!resizeWired) {
      resizeWired = true;
      global.addEventListener("resize", () => registry.forEach((i) => { try { i.resize(); } catch (e) {} }));
    }
    return inst;
  }
  function tip(extra) {
    return Object.assign({
      backgroundColor: "#1f2937", borderColor: "rgba(255,255,255,0.12)", borderWidth: 1, padding: [10, 12],
      textStyle: { color: "#f9fafb", fontFamily: FONT, fontSize: 12 },
      extraCssText: "border-radius:10px; box-shadow:0 24px 64px rgba(0,0,0,0.35);",
    }, extra || {});
  }
  function axisLab(extra) {
    const C = global.Charts ? global.Charts.C : {};
    return Object.assign({ color: C.ink3 || "#8b94a6", fontFamily: MONO, fontSize: 10.5 }, extra || {});
  }

  const PERIOD_LABEL = { ytd: "YTD", q1: "Q1", q2: "Q2", q3: "Q3", q4: "Q4", cum1: "Through Q1", cum2: "Through Q2", cum3: "Through Q3", full: "Full Year" };
  function periodLabel(s) {
    if (s.axis === "season" && s.season && s.season !== "all") return s.season.toUpperCase();
    return (PERIOD_LABEL[s.period] || s.period) + " " + (s.year || "2026");
  }

  /* ---------- Spec-shaped deterministic detail ---------- */

  // Tier mix — door / revenue weights from spec §4.2
  const TIER_DEF = [
    { name: "Tier 1 (Anchor)", doorW: 0.08, revW: 0.36, pill: "pill-blue" },
    { name: "Tier 2 (Core)",   doorW: 0.41, revW: 0.39, pill: "pill-violet" },
    { name: "Tier 3 (Volume)", doorW: 0.37, revW: 0.21, pill: "pill-gray" },
    { name: "ST Online",       doorW: 0.10, revW: 0.04, pill: "pill-green" },
    { name: "Other",           doorW: 0.04, revW: 0.00, pill: "pill-amber" },
  ];

  // 10 authorized territory countries — baseline shares from MockData §8,
  // jittered per entity so every licensee gets a distinct but stable mix.
  const GEO_DEF = [
    { country: "France",      region: "France",       sales: 0.49, doors: 0.461 },
    { country: "Germany",     region: "DACH",         sales: 0.17, doors: 0.176 },
    { country: "Belgium",     region: "Benelux",      sales: 0.10, doors: 0.109 },
    { country: "Netherlands", region: "Benelux",      sales: 0.07, doors: 0.088 },
    { country: "Switzerland", region: "DACH",         sales: 0.05, doors: 0.057 },
    { country: "Austria",     region: "DACH",         sales: 0.04, doors: 0.041 },
    { country: "Morocco",     region: "North Africa", sales: 0.03, doors: 0.026 },
    { country: "Luxembourg",  region: "Benelux",      sales: 0.02, doors: 0.016 },
    { country: "Tunisia",     region: "North Africa", sales: 0.01, doors: 0.016 },
    { country: "Algeria",     region: "North Africa", sales: 0.01, doors: 0.010 },
  ];

  const ACC_DEF = [
    { name: "Galeries Lafayette",  tier: "T1", country: "France" },
    { name: "KaDeWe Group",        tier: "T1", country: "Germany" },
    { name: "Printemps",           tier: "T1", country: "France" },
    { name: "Inno Brussels",       tier: "T2", country: "Belgium" },
    { name: "de Bijenkorf",        tier: "T2", country: "Netherlands" },
    { name: "Manor",               tier: "T2", country: "Switzerland" },
    { name: "Peek & Cloppenburg",  tier: "T2", country: "Germany" },
    { name: "Sport 2000 France",   tier: "T3", country: "France" },
    { name: "Intersport Maroc",    tier: "T3", country: "Morocco" },
    { name: "Kastner & Öhler",     tier: "T2", country: "Austria" },
  ];
  const ACC_W5  = [0.355, 0.23, 0.175, 0.13, 0.11];  // top-5 split
  const ACC_W10 = [0.26, 0.22, 0.20, 0.17, 0.15];    // accounts 6–10 split
  const FLAGSHIP = {
    "Galeries Lafayette": "Paris Haussmann", "KaDeWe Group": "Berlin Tauentzienstr.",
    "Printemps": "Paris Bd Haussmann", "Inno Brussels": "Brussels Rue Neuve", "de Bijenkorf": "Amsterdam Dam",
  };

  // Productivity histogram buckets — door share per spec §8.2
  const BUCKET_DEF = [
    { label: "< €10K", w: 0.37 }, { label: "€10–30K", w: 0.25 }, { label: "€30–60K", w: 0.20 },
    { label: "€60–100K", w: 0.08 }, { label: "€100K+", w: 0.10 },
  ];

  const NEW_DOOR_DEF = [
    { name: "Boutique Riviera", loc: "Lyon · France",        tier: "T3", date: "-03-15" },
    { name: "Modehaus Stern",   loc: "Munich · Germany",     tier: "T2", date: "-04-02" },
    { name: "Maison Court",     loc: "Brussels · Belgium",   tier: "T2", date: "-04-18" },
    { name: "Atlas Concept",    loc: "Casablanca · Morocco", tier: "T3", date: "-05-06" },
  ];
  const CLOSED_DOOR_DEF = [
    { name: "Boutique Vendôme", loc: "Paris · France",          tier: "T3", date: "-02-28", reason: "Business closure" },
    { name: "Sport Hansa",      loc: "Hamburg · Germany",       tier: "T3", date: "-03-31", reason: "Account default" },
    { name: "Casa Sport",       loc: "Tunis · Tunisia",         tier: "T3", date: "-01-31", reason: "Territory reallocation" },
    { name: "Mode Centraal",    loc: "Rotterdam · Netherlands", tier: "T2", date: "-04-30", reason: "Brand discontinuation" },
  ];
  const BOTTOM_DOOR_DEF = [
    { name: "Sport Lemoine", loc: "Limoges · France" },
    { name: "Mode Krause",   loc: "Leipzig · Germany" },
    { name: "Boutique Atlas", loc: "Oran · Algeria" },
    { name: "Top Sport Gent", loc: "Ghent · Belgium" },
    { name: "Alpen Outlet",  loc: "Innsbruck · Austria" },
  ];

  function seasonOf(ctx) {
    const yy = String(ctx.year || "2026").slice(2);
    if (ctx.axis === "season" && ctx.season && ctx.season !== "all") return ctx.season.toUpperCase();
    return "SS" + yy;
  }
  function prevSeasonOf(now) {
    const m = now.match(/^(SS|FW)(\d+)$/);
    if (!m) return "FW25";
    return m[1] === "SS" ? "FW" + (parseInt(m[2], 10) - 1) : "SS" + m[2];
  }
  function nextSeasonOf(now) {
    const m = now.match(/^(SS|FW)(\d+)$/);
    if (!m) return "FW26";
    return m[1] === "SS" ? "FW" + m[2] : "SS" + (parseInt(m[2], 10) + 1);
  }

  function detail(data) {
    const ctx = data.ctx, sales = data.sales, dist = data.dist;
    const planView = ctx.view === "plan";
    const revenue = (planView || !sales.hasActual) ? sales.plan : sales.netSales;
    const active = Math.max(1, dist.active);
    const planDoors = Math.max(active, Math.round(active / 0.92));
    const rpd = revenue / active;
    const rng = mul(ctx.entity.id + ctx.year + ctx.period + ctx.season + "distspec");
    const nowSeason = seasonOf(ctx);
    const prevSeason = prevSeasonOf(nowSeason);
    const nextSeason = nextSeasonOf(nowSeason);
    const periodTxt = ctx.axis === "season" && ctx.season !== "all" ? nowSeason : (PERIOD_LABEL[ctx.period] || "YTD") + " " + ctx.year;

    // Tier mix — doors sum exactly to active, revenue split per spec weights
    let doorsLeft = active;
    const tiers = TIER_DEF.map((t, i) => {
      const doors = i === TIER_DEF.length - 1 ? Math.max(0, doorsLeft) : Math.min(doorsLeft, Math.round(active * t.doorW));
      doorsLeft -= doors;
      const value = revenue * t.revW;
      return { name: t.name, pill: t.pill, doors, doorPct: Math.round(doors / active * 100), value, rpd: doors > 0 && t.revW > 0 ? value / doors : 0 };
    });
    const tierProd = tiers.filter((t) => t.rpd > 0);

    // Geography — entity-jittered territory mix, normalized
    const sw = GEO_DEF.map((g) => g.sales * (0.85 + rng() * 0.3));
    const dw = GEO_DEF.map((g) => g.doors * (0.85 + rng() * 0.3));
    const sSum = sw.reduce((a, b) => a + b, 0), dSum = dw.reduce((a, b) => a + b, 0);
    const geo = GEO_DEF.map((g, i) => {
      const doors = Math.max(1, Math.round(active * dw[i] / dSum));
      const value = revenue * sw[i] / sSum;
      return { country: g.country, region: g.region, doors, value, rpd: value / doors, star: value / doors > rpd * 1.05 };
    }).sort((a, b) => b.value - a.value);
    const regions = ["France", "DACH", "Benelux", "North Africa"].map((name) => {
      const rows = geo.filter((g) => g.region === name);
      const doors = Math.max(1, rows.reduce((a, r) => a + r.doors, 0));
      const value = rows.reduce((a, r) => a + r.value, 0);
      return { name, doors, doorPct: Math.round(doors / active * 100), value, rpd: value / doors, star: value / doors > rpd * 1.05 };
    });

    // Accounts — top-5 share anchored to dist.top5 so KPI and table agree
    const top5 = dist.top5;
    const top10 = Math.min(88, Math.round(top5 * 1.38));
    const top20 = Math.min(92, Math.round(top10 * 1.24));
    const accounts = ACC_DEF.map((a, i) => {
      const share = i < 5 ? top5 * ACC_W5[i] : (top10 - top5) * ACC_W10[i - 5];
      const arng = mul(ctx.entity.id + a.name + ctx.period + ctx.season);
      const tierF = a.tier === "T3" ? 0.9 : a.tier === "T2" ? 0.25 : 0.2;
      return {
        rank: i + 1, name: a.name, tier: a.tier, country: a.country,
        doors: Math.max(1, Math.round(active * share / 100 * tierF)),
        share, value: revenue * share / 100,
        vsPlan: +(arng() * 20 - 6).toFixed(1), vsYoY: +(arng() * 26 - 8).toFixed(1),
      };
    });

    // Door movement waterfall — start + new + reactivated − closed = active
    const reactivated = Math.max(1, Math.round(dist.newD * 0.18));
    const start = Math.max(0, active - dist.newD - reactivated + dist.closeD);
    const steps = [
      { label: prevSeason + " Ending", value: start, kind: "total" },
      { label: "New", value: dist.newD, kind: "up" },
      { label: "Reactivated", value: reactivated, kind: "up" },
      { label: "Closed", value: dist.closeD, kind: "down" },
      { label: nowSeason + " Active", value: active, kind: "total" },
    ];

    const newDoors = NEW_DOOR_DEF.slice(0, Math.max(2, Math.min(4, dist.newD))).map((r) => {
      const nr = mul(ctx.entity.id + r.name + ctx.period);
      return { name: r.name, loc: r.loc, tier: r.tier, opened: ctx.year + r.date, season: nowSeason, value: revenue * (0.0010 + nr() * 0.0018) };
    });
    const closedDoors = CLOSED_DOOR_DEF.slice(0, Math.max(2, Math.min(4, dist.closeD))).map((r) => {
      const cr = mul(ctx.entity.id + r.name + ctx.period);
      return { name: r.name, loc: r.loc, tier: r.tier, closed: ctx.year + r.date, season: prevSeason, reason: r.reason, lost: rpd * (0.55 + cr() * 0.35) };
    });

    // Productivity distribution + top/bottom doors
    const buckets = BUCKET_DEF.map((b) => ({ label: b.label, doors: Math.round(active * b.w), pct: Math.round(b.w * 100) }));
    const topDoors = accounts.slice(0, 5).map((a) => {
      const tr = mul(a.name + "door" + ctx.period);
      return { name: a.name, loc: FLAGSHIP[a.name] || a.country, value: a.value * (0.30 + tr() * 0.12) };
    });
    const bottomDoors = BOTTOM_DOOR_DEF.map((b) => {
      const br = mul(ctx.entity.id + b.name + ctx.period);
      const value = rpd * (0.10 + br() * 0.16);
      return { name: b.name, loc: b.loc, value, review: value < rpd * 0.18 };
    }).sort((a, b) => a.value - b.value);

    // Customer type — existing reactive helper, doors split per spec §9
    const DOOR_W = { Wholesale: 0.782, Retail: 0.119, Marketplace: 0.073, "ST Online": 0.026 };
    const cust = D().customerMix(ctx.entity.id, ctx.period).map((c) => ({
      label: c.label, pct: c.val, value: revenue * c.val / 100, doors: Math.round(active * (DOOR_W[c.label] || 0.02)),
    }));

    // Door movement timeline — 3-line always-on (actual / plan / prior year)
    const seasons = ["SS24", "FW24", "SS25", "FW25", nowSeason === "FW26" ? "SS26" : nowSeason, nextSeason];
    const aF = [0.90, 0.93, 0.955, 0.972, 1.0, null];
    const planRatio = planDoors / active;
    const pF = [0.92, 0.95, 0.985, 0.997, planRatio, planRatio * 1.024];
    const prF = [0.845, 0.875, aF[0], aF[1], aF[2], aF[3]];
    const timeline = {
      seasons,
      actual: aF.map((f) => (f == null ? null : Math.round(active * f))),
      plan: pF.map((f) => Math.round(active * f)),
      prior: prF.map((f) => (f == null ? null : Math.round(active * f))),
    };

    // AI Distribution Insights — composed from the derived numbers above
    const em = (v) => D().money(v, ctx.entity).book;
    const planPct = Math.round(active / planDoors * 100);
    const gap = planDoors - active;
    const expand = geo.filter((g) => g.doors >= active * 0.08).sort((a, b) => a.rpd - b.rpd)[0] || geo[0];
    const bestR = regions.slice().sort((a, b) => b.rpd - a.rpd)[0];
    const lost = dist.closeD * rpd * 0.85;
    const ai = [
      `Active doors <b>${active}</b> vs ${nowSeason} plan ${planDoors} (${planPct}%)` +
        (gap > 0 ? ` — ${expand.country} Tier 2 expansion is the fastest route to plan (${gap} net new needed).` : " — door plan achieved."),
      `Top 5 accounts = <b>${top5}%</b> of net sales${top5 >= 40 ? " — concentration risk" : ""}. ${accounts[0].name} dependency at ${accounts[0].share.toFixed(1)}% — consider diversification toward ${accounts[2].name} & regional accounts.`,
      `${bestR.name} productivity (${em(bestR.rpd)}/door) leads all regions on ${bestR.doors} doors (${bestR.doorPct}%) — expansion opportunity for ${nextSeason}.`,
      `${dist.closeD} doors closed ${periodTxt}, ~−${em(lost)} revenue impact. Reactivation pipeline: ${reactivated} doors in discussion targeting ${em(reactivated * rpd * 0.6)} recovery.`,
    ];

    return {
      planView, revenue, active, planDoors, rpd, planPct,
      tiers, tierProd, geo, regions, accounts,
      conc: { top5, top10, top20 },
      movement: { steps, reactivated, start },
      newDoors, closedDoors, buckets, topDoors, bottomDoors, cust, timeline, ai,
      nowSeason, prevSeason, nextSeason, periodTxt,
    };
  }

  /* ---------- Local charts ---------- */

  function threeLine(el, t) {
    const inst = mount(el); if (!inst || !global.Charts) return;
    const C = global.Charts.C;
    inst.setOption({ animation: false,
      legend: { top: 0, right: 0, itemWidth: 18, itemHeight: 10, textStyle: { color: C.ink3, fontFamily: FONT, fontSize: 11 }, data: ["Actual", "Plan", "Prior Year"] },
      tooltip: tip({ trigger: "axis", axisPointer: { type: "line", lineStyle: { color: "rgba(148,163,184,0.3)" } },
        formatter: (ps) => {
          let s = `<div style="font-weight:700;margin-bottom:6px">${ps[0].axisValue}</div>`;
          ps.forEach((p) => {
            if (p.value == null) return;
            s += `<div style="display:flex;justify-content:space-between;gap:18px;padding:2px 0"><span style="color:#9aa6bd">${p.marker} ${p.seriesName}</span><b style="font-family:${MONO}">${p.value} doors</b></div>`;
          });
          return s;
        } }),
      grid: { left: 8, right: 12, top: 32, bottom: 6, containLabel: true },
      xAxis: { type: "category", data: t.seasons, boundaryGap: false, axisLine: { lineStyle: { color: C.axis } }, axisTick: { show: false }, axisLabel: axisLab() },
      yAxis: { type: "value", scale: true, splitLine: { lineStyle: { color: C.grid } }, axisLabel: axisLab() },
      series: [
        { name: "Prior Year", type: "line", data: t.prior, symbol: "none", connectNulls: false, lineStyle: { color: C.prior, width: 1.5 }, itemStyle: { color: C.prior }, z: 1 },
        { name: "Plan", type: "line", data: t.plan, symbol: "none", lineStyle: { color: C.plan, width: 2, type: [4, 5] }, itemStyle: { color: C.plan }, z: 2 },
        { name: "Actual", type: "line", data: t.actual, symbol: "circle", symbolSize: 6, showSymbol: false, connectNulls: false,
          lineStyle: { color: C.actual, width: 3.5 }, itemStyle: { color: C.actual, borderColor: "#fff", borderWidth: 2 },
          areaStyle: { color: "rgba(37,99,235,0.07)" }, z: 3 },
      ],
    });
  }

  function geoChart(el, rows) {
    const inst = mount(el); if (!inst || !global.Charts) return;
    const C = global.Charts.C, fmtK = global.Charts.fmtK;
    const rev = rows.slice().reverse();
    const regionColor = { France: C.blue, DACH: C.violet, Benelux: C.cyan, "North Africa": C.green };
    inst.setOption({ animation: false,
      tooltip: tip({ trigger: "axis", axisPointer: { type: "shadow", shadowStyle: { color: "rgba(148,163,184,0.06)" } },
        formatter: (ps) => {
          const p = ps[0]; const r = rev[p.dataIndex];
          return `<b>${r.country}</b> · ${r.region}<br/>${r.doors} doors · €${fmtK(Math.round(r.value))}<br/>€${fmtK(Math.round(r.rpd))}/door${r.star ? " ★ above network avg" : ""}`;
        } }),
      grid: { left: 8, right: 100, top: 8, bottom: 6, containLabel: true },
      xAxis: { type: "value", splitLine: { lineStyle: { color: C.grid } }, axisLabel: axisLab({ formatter: (v) => "€" + fmtK(v) }) },
      yAxis: { type: "category", data: rev.map((r) => r.country), axisLine: { lineStyle: { color: C.axis } }, axisTick: { show: false }, axisLabel: { color: C.ink, fontFamily: FONT, fontSize: 12 } },
      series: [{
        type: "bar", data: rev.map((r) => ({ value: Math.round(r.value), itemStyle: { color: regionColor[r.region] || C.blue } })),
        barWidth: "58%", itemStyle: { borderRadius: [0, 5, 5, 0] },
        label: { show: true, position: "right", color: C.ink3, fontFamily: MONO, fontSize: 10.5,
          formatter: (p) => { const r = rev[p.dataIndex]; return r.doors + "d · €" + fmtK(Math.round(r.rpd)) + (r.star ? " ★" : ""); } },
      }],
    });
  }

  function waterfallChart(el, steps) {
    const inst = mount(el); if (!inst || !global.Charts) return;
    const C = global.Charts.C;
    let run = 0; const base = [], bars = [];
    steps.forEach((st) => {
      if (st.kind === "total") { base.push(0); bars.push({ value: st.value, itemStyle: { color: C.actual } }); run = st.value; }
      else if (st.kind === "up") { base.push(run); bars.push({ value: st.value, itemStyle: { color: C.green } }); run += st.value; }
      else { run -= st.value; base.push(run); bars.push({ value: st.value, itemStyle: { color: C.red } }); }
    });
    inst.setOption({ animation: false,
      tooltip: tip({ trigger: "axis", axisPointer: { type: "shadow", shadowStyle: { color: "rgba(148,163,184,0.06)" } },
        formatter: (ps) => {
          const p = ps.find((x) => x.seriesIndex === 1) || ps[0];
          const st = steps[p.dataIndex];
          const sign = st.kind === "up" ? "+" : st.kind === "down" ? "−" : "";
          return `<b>${st.label}</b><br/>${sign}${st.value} doors`;
        } }),
      grid: { left: 8, right: 12, top: 28, bottom: 6, containLabel: true },
      xAxis: { type: "category", data: steps.map((s) => s.label), axisLine: { lineStyle: { color: C.axis } }, axisTick: { show: false }, axisLabel: axisLab({ fontSize: 10, interval: 0 }) },
      yAxis: { type: "value", splitLine: { lineStyle: { color: C.grid } }, axisLabel: axisLab() },
      series: [
        { type: "bar", stack: "wf", data: base, itemStyle: { color: "transparent" }, emphasis: { itemStyle: { color: "transparent" } }, silent: true },
        { type: "bar", stack: "wf", data: bars, barWidth: "52%", itemStyle: { borderRadius: [4, 4, 0, 0] },
          label: { show: true, position: "top", color: C.ink3, fontFamily: MONO, fontSize: 10.5,
            formatter: (p) => { const st = steps[p.dataIndex]; return (st.kind === "up" ? "+" : st.kind === "down" ? "−" : "") + st.value; } } },
      ],
    });
  }

  function histChart(el, buckets) {
    const inst = mount(el); if (!inst || !global.Charts) return;
    const C = global.Charts.C;
    inst.setOption({ animation: false,
      tooltip: tip({ trigger: "axis", axisPointer: { type: "shadow", shadowStyle: { color: "rgba(148,163,184,0.06)" } },
        formatter: (ps) => { const b = buckets[ps[0].dataIndex]; return `<b>${b.label}</b><br/>${b.doors} doors · ${b.pct}% of network`; } }),
      grid: { left: 8, right: 12, top: 24, bottom: 6, containLabel: true },
      xAxis: { type: "category", data: buckets.map((b) => b.label), axisLine: { lineStyle: { color: C.axis } }, axisTick: { show: false }, axisLabel: axisLab({ fontSize: 10, interval: 0 }) },
      yAxis: { type: "value", splitLine: { lineStyle: { color: C.grid } }, axisLabel: axisLab() },
      series: [{ type: "bar", data: buckets.map((b) => b.doors), barWidth: "56%", itemStyle: { color: C.cyan, borderRadius: [4, 4, 0, 0] },
        label: { show: true, position: "top", color: C.ink3, fontFamily: MONO, fontSize: 10.5 } }],
    });
  }

  /* ---------- Render helpers ---------- */

  // Local KPI tile: shared W.kpi omits the .kpi class, so the console's
  // klabel/kval typography would not apply — emit card+kpi+spec-kpi here.
  function kpiTile(label, value, foot, tone) {
    const W = widgets();
    return `<div class="card kpi spec-kpi${tone ? " tone-" + tone : ""}">
      <div class="klabel">${W.esc(label)}</div>
      <div class="kval">${value}</div>
      <div class="kfoot">${foot || ""}</div>
    </div>`;
  }
  function tierPill(t) {
    const cls = t === "T1" ? "pill-blue" : t === "T2" ? "pill-violet" : "pill-gray";
    return `<span class="pill ${cls}"><span class="dot"></span>${t}</span>`;
  }
  function bar(label, right, pctWidth, color) {
    return `<div style="margin-bottom:10px">
      <div class="between" style="font-size:12px;margin-bottom:4px"><span>${label}</span><b class="mono">${right}</b></div>
      <div class="minibar"><i style="width:${pctWidth}%;background:${color || "var(--accent)"}"></i></div>
    </div>`;
  }

  global.Screens = global.Screens || {};
  global.Screens.a3 = {
    title: "Distribution",
    sub: (s) => `${UI.dispCode(s)} · ${periodLabel(s)} · door network, accounts & territory productivity`,

    render(s) {
      const data = model().distribution(s);
      const W = widgets();
      const det = detail(data);
      const ent = data.ctx.entity;
      const dist = data.dist;
      const sales = data.sales;
      const money = (v) => D().money(v, ent).book;
      const nd = dist.netDelta;

      // KPI row — Active Doors · Net Door Δ · Revenue/Door · Top 5 Concentration
      const deltaPct = det.planView ? sales.vsPriorPlan : sales.vsYoY;
      const rpdDelta = deltaPct - (nd / Math.max(1, det.active - nd)) * 100;
      const kpis = `<div class="spec-grid g4">
        ${kpiTile("Active Doors",
          det.planView ? `${det.planDoors}` : `${det.active}<small> / ${det.planDoors}</small>`,
          det.planView ? `<span class="muted" style="font-size:11px">${det.nowSeason} season door plan</span>`
                       : `<span class="muted" style="font-size:11px">${det.planPct}% of ${det.nowSeason} plan · ${det.geo.length} countries</span>`)}
        ${kpiTile("Net Door Δ", `${nd >= 0 ? "+" : ""}${nd}`,
          `<span class="delta ${nd >= 0 ? "up" : "down"}">${nd >= 0 ? "▲" : "▼"} New +${dist.newD} · Closed −${dist.closeD}</span>`,
          nd >= 0 ? "ok" : "risk")}
        ${kpiTile("Revenue / Door", money(det.rpd),
          `${UI.delta(rpdDelta)}<span class="muted" style="font-size:11px">vs ${det.planView ? "prior plan" : "prior year"}</span>`)}
        ${kpiTile("Top 5 Concentration", `${det.conc.top5}<small>%</small>`,
          det.conc.top5 >= 40 ? '<span class="pill pill-amber"><span class="dot"></span>Concentration risk</span>'
                              : '<span class="pill pill-green"><span class="dot"></span>Diversified</span>',
          det.conc.top5 >= 40 ? "risk" : "")}
      </div>`;

      // Main visualization — Door Movement Timeline + Tier Mix
      const tierRows = det.tiers.map((t) => `<tr>
        <td><span class="pill ${t.pill}"><span class="dot"></span>${W.esc(t.name)}</span></td>
        <td class="num">${t.doors}</td><td class="num">${t.doorPct}%</td>
        <td class="num">${t.value > 0 ? money(t.value) : "—"}</td>
        <td class="num">${t.rpd > 0 ? money(t.rpd) : "—"}</td>
      </tr>`).join("");
      const mainViz = `<div class="spec-grid g2 mt-16">
        <div class="card card-pad">
          ${W.sec("Door Movement Timeline", "Active doors by season — Actual · Plan · Prior Year (legend toggles)")}
          <div id="dist-door-timeline" class="chart" style="height:330px"></div>
        </div>
        <div class="card card-pad">
          ${W.sec("Tier Mix", "Door count and revenue contribution by account tier")}
          <div id="dist-tier-mix" class="chart" style="height:160px"></div>
          <table class="tbl spec-table" style="margin-top:10px"><thead><tr><th>Tier</th><th class="num">Doors</th><th class="num">Share</th><th class="num">Net Sales</th><th class="num">€ / Door</th></tr></thead><tbody>${tierRows}</tbody></table>
        </div>
      </div>`;

      // Geographic distribution — 10 territory countries + region grouping
      const regionRows = det.regions.map((r) => `<tr>
        <td><b>${W.esc(r.name)}</b></td>
        <td class="num">${r.doors} <span class="muted">(${r.doorPct}%)</span></td>
        <td class="num">${money(r.value)}</td>
        <td class="num">${money(r.rpd)}/door${r.star ? " ★" : ""}</td>
      </tr>`).join("");
      const geoSec = `<div class="spec-grid g2 mt-16">
        <div class="card card-pad">
          ${W.sec("Geographic Distribution", `${det.geo.length} authorized territory countries — doors · sales · €/door (★ above network average)`)}
          <div id="dist-geo" class="chart" style="height:330px"></div>
        </div>
        <div class="card card-pad">
          ${W.sec("Region Grouping", "Territory regions — door share and productivity")}
          <table class="tbl spec-table"><thead><tr><th>Region</th><th class="num">Doors</th><th class="num">Net Sales</th><th class="num">Productivity</th></tr></thead><tbody>${regionRows}</tbody></table>
          <hr class="div" style="margin:14px 0"/>
          <div class="klabel" style="margin-bottom:10px">Door Share by Region</div>
          ${det.regions.map((r, i) => bar(W.esc(r.name), r.doorPct + "%", r.doorPct, ["var(--accent)", "#a78bfa", "#22d3ee", "#34d399"][i])).join("")}
        </div>
      </div>`;

      // Account-level analysis — Top 10 + concentration risk
      const accTable = W.table([
        { label: "#", key: "rank" },
        { label: "Account", key: "name", render: (r) => `<b>${W.esc(r.name)}</b>` },
        { label: "Tier", key: "tier", render: (r) => tierPill(r.tier) },
        { label: "Country", key: "country" },
        { label: "Doors", key: "doors", num: true },
        { label: "Net Sales", key: "value", num: true, render: (r) => money(r.value) },
        { label: "vs Plan", key: "vsPlan", num: true, render: (r) => UI.delta(r.vsPlan) },
        { label: "vs YoY", key: "vsYoY", num: true, render: (r) => UI.delta(r.vsYoY) },
      ], det.accounts);
      const concRows = [["Top 5 accounts", det.conc.top5], ["Top 10 accounts", det.conc.top10], ["Top 20 accounts", det.conc.top20]]
        .map(([lab, pct]) => bar(lab, pct + "% · " + money(det.revenue * pct / 100), pct)).join("");
      const accSec = `<div class="grid mt-16" style="grid-template-columns:1.6fr 1fr;gap:16px;align-items:start">
        <div class="card card-pad">
          ${W.sec("Top 10 Accounts", "Account-level sales, doors and performance vs plan / prior year")}
          ${accTable}
        </div>
        <div class="card card-pad">
          ${W.sec("Account Concentration Risk", "Share of net sales by account group")}
          ${concRows}
          <hr class="div" style="margin:14px 0"/>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            ${det.conc.top5 >= 40 ? '<span class="pill pill-amber"><span class="dot"></span>Concentrated</span>' : '<span class="pill pill-green"><span class="dot"></span>Diversified</span>'}
            <span class="muted" style="font-size:12px">Risk flag above 40% Top-5 share</span>
          </div>
          <div class="muted" style="font-size:12px;line-height:1.55">${W.esc(det.accounts[0].name)} is the largest dependency at <b>${det.accounts[0].share.toFixed(1)}%</b> of net sales. Long tail beyond Top 20 carries ${100 - det.conc.top20}%.</div>
        </div>
      </div>`;

      // Door movement detail — waterfall + new/closed pipeline
      const newRows = det.newDoors.map((r) => `<tr>
        <td><b>${W.esc(r.name)}</b> ${tierPill(r.tier)}<div class="muted" style="font-size:11px;margin-top:2px">${W.esc(r.loc)}</div></td>
        <td class="num">${r.opened}</td><td>${r.season}</td><td class="num">${money(r.value)}</td>
      </tr>`).join("");
      const closedRows = det.closedDoors.map((r) => `<tr>
        <td><b>${W.esc(r.name)}</b> ${tierPill(r.tier)}<div class="muted" style="font-size:11px;margin-top:2px">${W.esc(r.loc)} · ${W.esc(r.reason)}</div></td>
        <td class="num">${r.closed}</td><td>${r.season}</td><td class="num" style="color:var(--red)">−${money(r.lost)}</td>
      </tr>`).join("");
      const moveSec = `<div class="spec-grid g2 mt-16">
        <div class="card card-pad">
          ${W.sec("Door Movement", `${det.prevSeason} ending → ${det.nowSeason} active — new, reactivated and closed doors`)}
          <div id="dist-waterfall" class="chart" style="height:300px"></div>
        </div>
        <div class="card card-pad">
          ${W.sec("New Doors Pipeline", `${dist.newD} opened in period — top ${det.newDoors.length} by sales`)}
          <table class="tbl spec-table"><thead><tr><th>Account</th><th class="num">Opened</th><th>First Season</th><th class="num">Sales</th></tr></thead><tbody>${newRows}</tbody></table>
          <hr class="div" style="margin:14px 0"/>
          ${W.sec("Closed Doors Analysis", `${dist.closeD} closed — last season and lost revenue`)}
          <table class="tbl spec-table"><thead><tr><th>Account</th><th class="num">Closed</th><th>Last Season</th><th class="num">Lost / Season</th></tr></thead><tbody>${closedRows}</tbody></table>
        </div>
      </div>`;

      // Productivity analysis — €/door by tier, histogram, top/bottom doors
      const maxRpd = Math.max.apply(null, det.tierProd.map((t) => t.rpd));
      const tierProdRows = det.tierProd.map((t) => bar(W.esc(t.name), money(t.rpd) + "/door", Math.max(4, Math.round(t.rpd / maxRpd * 100)))).join("");
      const topRows = det.topDoors.map((r) => `<tr>
        <td><b>${W.esc(r.name)}</b><div class="muted" style="font-size:11px;margin-top:2px">${W.esc(r.loc)}</div></td>
        <td class="num">${money(r.value)}</td>
      </tr>`).join("");
      const bottomRows = det.bottomDoors.map((r) => `<tr>
        <td><b>${W.esc(r.name)}</b><div class="muted" style="font-size:11px;margin-top:2px">${W.esc(r.loc)}</div></td>
        <td class="num">${money(r.value)}${r.review ? ' <span class="pill pill-amber" style="margin-left:6px"><span class="dot"></span>Review</span>' : ""}</td>
      </tr>`).join("");
      const prodSec = `<div class="spec-grid g2 mt-16">
        <div class="card card-pad">
          ${W.sec("Productivity — Revenue per Door", "Tier benchmarks and door distribution by revenue bucket")}
          ${tierProdRows}
          <hr class="div" style="margin:14px 0"/>
          <div id="dist-hist" class="chart" style="height:200px"></div>
        </div>
        <div class="card card-pad">
          ${W.sec("Top Performing Doors", "Highest revenue locations")}
          <table class="tbl spec-table"><thead><tr><th>Door</th><th class="num">Revenue</th></tr></thead><tbody>${topRows}</tbody></table>
          <hr class="div" style="margin:14px 0"/>
          ${W.sec("Bottom Performing Doors", "Closure review candidates")}
          <table class="tbl spec-table"><thead><tr><th>Door</th><th class="num">Revenue</th></tr></thead><tbody>${bottomRows}</tbody></table>
        </div>
      </div>`;

      // Customer type distribution
      const custRows = det.cust.map((c) => `<tr>
        <td><b>${W.esc(c.label)}</b></td>
        <td class="num">${c.doors}</td>
        <td class="num">${money(c.value)}</td>
        <td class="num">${c.pct}%</td>
      </tr>`).join("");
      const custSec = `<div class="card card-pad mt-16">
        ${W.sec("Customer Type Distribution", "Net sales and door mix by customer type")}
        <div class="grid" style="grid-template-columns:260px 1fr;gap:20px;align-items:center">
          <div id="dist-cust" class="chart" style="height:210px"></div>
          <table class="tbl spec-table"><thead><tr><th>Type</th><th class="num">Doors</th><th class="num">Net Sales</th><th class="num">Share</th></tr></thead><tbody>${custRows}</tbody></table>
        </div>
      </div>`;

      // AI Distribution Insights
      const aiSec = `<div class="card card-pad spec-ai">
        ${W.sec("AI Distribution Insights", `Auto-generated recommendations · ${det.periodTxt}`)}
        ${det.ai.map((line) => `<div class="ai-line"><span class="sp">✦</span><span>${line}</span></div>`).join("")}
      </div>`;

      return kpis + mainViz + geoSec + accSec + moveSec + prodSec + custSec + aiSec;
    },

    init(s) {
      const data = model().distribution(s);
      const det = detail(data);
      const Ch = global.Charts;
      const tl = document.getElementById("dist-door-timeline");
      if (tl) threeLine(tl, det.timeline);
      const tm = document.getElementById("dist-tier-mix");
      if (tm && Ch) Ch.donut(tm, det.tiers.filter((t) => t.doors > 0).map((t) => ({ label: t.name, value: t.doors })),
        { palette: [Ch.C.blue, Ch.C.violet, "#64748b", Ch.C.green, Ch.C.amber], sym: "" });
      const geo = document.getElementById("dist-geo");
      if (geo) geoChart(geo, det.geo);
      const wf = document.getElementById("dist-waterfall");
      if (wf) waterfallChart(wf, det.movement.steps);
      const hg = document.getElementById("dist-hist");
      if (hg) histChart(hg, det.buckets);
      const ct = document.getElementById("dist-cust");
      if (ct && Ch) Ch.donut(ct, det.cust.map((c) => ({ label: c.label, value: Math.round(c.value) })), { sym: "€" });
    },
  };
})(window);
