/* =========================================================
   ST Licensor Console — Mock data model
   Deterministic generator for 6 entities × periods × domains.
   Exposes window.STEData
   ========================================================= */
(function () {
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seedFrom(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  // Actual data available through June (idx 0..5); Jul-Dec are projection.
  const ACTUAL_THRU = 5;
  const SEASON = [0.74,0.82,1.02,1.16,1.24,1.18, 0.86,0.80,1.05,1.16,1.04,0.93]; // weights, ~12

  const FX = { // to convert book -> others
    GBP: { EUR: 1.18, USD: 1.274, sym: '£' },
    EUR: { EUR: 1.0,  USD: 1.08,  sym: '€' },
  };

  const ENTITIES = [
    { id: 'total',    code: 'STE Total',     name: 'Portfolio (5 licensees)', cur: 'EUR', flag: 'flag-eu', aggregate: true,
      annual: 0, attain: 1.0, yoy: 0.094, region: 'Europe' },
    { id: 'bbuk',     code: 'BBUK',          name: 'Best of Britain Ltd',     cur: 'EUR', flag: 'flag-uk',
      annual: 5_000_000, attain: 1.05, yoy: 0.12,  region: 'UK · Ireland' },
    { id: 'sugifr',   code: 'Sugi France',   name: 'Sugi SAS',                cur: 'EUR', flag: 'flag-fr',
      annual: 5_600_000, attain: 1.08, yoy: 0.14,  region: 'France' },
    { id: 'sugifw',   code: 'Sugi Footwear', name: 'Sugi Footwear SpA',       cur: 'EUR', flag: 'flag-it',
      annual: 4_800_000, attain: 0.94, yoy: -0.02, region: 'Italy · Footwear' },
    { id: 'benjamin', code: 'Benjamin',      name: 'Benjamin GmbH',           cur: 'EUR', flag: 'flag-de',
      annual: 5_300_000, attain: 1.02, yoy: 0.08,  region: 'Germany · Austria' },
    { id: 'bds',      code: 'BDS',           name: 'BDS Distribution',        cur: 'EUR', flag: 'flag-fr',
      annual: 2_700_000, attain: 0.88, yoy: -0.09, region: 'France · Benelux' },
  ];
  const LICENSEES = ENTITIES.filter(e => !e.aggregate);

  // ---- Monthly series per entity (book currency) ----
  function buildSeries(ent) {
    const rng = mulberry32(seedFrom(ent.id));
    const monthlyPlan = [], monthlyActual = [], monthlyPrior = [];
    const base = ent.annual / 12;
    for (let m = 0; m < 12; m++) {
      const noise = 0.92 + rng() * 0.16;
      const plan = base * SEASON[m] * noise;
      const actual = plan * (ent.attain * (0.97 + rng() * 0.06));
      const prior = actual / (1 + ent.yoy) * (0.97 + rng() * 0.06);
      monthlyPlan.push(plan);
      monthlyActual.push(actual);
      monthlyPrior.push(prior);
    }
    return { monthlyPlan, monthlyActual, monthlyPrior };
  }

  const SERIES = {};
  LICENSEES.forEach(e => { SERIES[e.id] = buildSeries(e); });

  function periodMonths(period) {
    switch (period) {
      case 'q1': return [0, 2];
      case 'q2': return [3, 5];
      case 'q3': return [6, 8];
      case 'q4': return [9, 11];
      case 'cum1': return [0, 2];
      case 'cum2': return [0, 5];
      case 'cum3': return [0, 8];
      case 'full': return [0, 11];
      case 'ytd': default: return [0, ACTUAL_THRU];
    }
  }
  function sumRange(arr, [a, b]) { let s = 0; for (let i = a; i <= b; i++) s += arr[i]; return s; }

  // ---- Season context: each season has its own realistic magnitude + lifecycle phase ----
  let _ctx = { season: 'all' };
  function setContext(c) { Object.assign(_ctx, c || {}); }
  function getContext() { return Object.assign({}, _ctx); }
  const SEASONS_FILTER = [['all','All Seasons'],['ss25','SS25'],['fw25','FW25'],['ss26','SS26'],['fw26','FW26'],['ss27','SS27'],['fw27','FW27']];
  // Magnitude multipliers vs the all-season period base (smooth YoY 0.85–1.2×, adjacent 0.7–1.4×)
  const SEASON_MULT  = { all: 1, ss25: 0.68, fw25: 0.74, ss26: 0.82, fw26: 0.80, ss27: 0.88, fw27: 0.86 };
  // Lifecycle phase relative to now (June 2026): full=closed · inprogress=selling-through · prelaunch=sell-in only · future=not started
  const SEASON_PHASE = { all: 'full', ss25: 'full', fw25: 'full', ss26: 'inprogress', fw26: 'prelaunch', ss27: 'future', fw27: 'future' };
  const SEASON_LAUNCH = { ss26: 'SS26 launched · Feb 2026', fw26: 'FW26 launch · Aug 2026', ss27: 'SS27 launch · Feb 2027', fw27: 'FW27 launch · Aug 2027' };
  function seasonPhase() { return SEASON_PHASE[_ctx.season] || 'full'; }
  // actual-vs-plan scaling by phase (plan = full target; actual = realized to date)
  function seasonFactors(period) {
    const season = _ctx.season || 'all';
    if (season === 'all') return { a: 1, p: 1, pr: 1 };
    const mult = SEASON_MULT[season] || 1;
    const ph = SEASON_PHASE[season];
    const aScale = ph === 'future' ? 0 : ph === 'prelaunch' ? 0.08 : ph === 'inprogress' ? 0.66 : 1;
    return { a: mult * aScale, p: mult, pr: mult * 0.92 };
  }

  // ---- Time / year context (now = June 2026; actuals closed through May) ----
  function curYear() { return parseInt(_ctx.year || '2026', 10); }
  function actualMonths() {
    if (_ctx.axis === 'season') {
      const ph = seasonPhase();
      return ph === 'future' ? 0 : ph === 'prelaunch' ? 1 : ph === 'inprogress' ? 5 : 12;
    }
    const y = curYear(); if (y < 2026) return 12; if (y > 2026) return 0; return 5;
  }
  function yearFactor() { const y = curYear(); if (y === 2025) return 0.92; if (y === 2027) return 1.12; return 1.0; }
  // availability of ACTUALS for the current axis selection
  function availability(period) {
    if (_ctx.axis === 'season') {
      const ph = seasonPhase();
      if (ph === 'future') return 'none';
      if (ph === 'prelaunch' || ph === 'inprogress') return 'partial';
      return 'full';
    }
    const y = curYear();
    if (y < 2026) return 'full';
    if (y > 2026) return 'none';
    if (period === 'full' || period === 'cum3' || period === 'q3' || period === 'q4') return 'none';
    if (period === 'q2' || period === 'cum2') return 'partial';
    return 'full'; // ytd, q1, cum1
  }
  function closeLabel(period) {
    if (_ctx.axis === 'season') return SEASON_LAUNCH[_ctx.season] || (String(_ctx.season || '').toUpperCase() + ' launch');
    const y = curYear();
    if (y > 2026) return 'FY ' + y;
    return ({ q3:'Q3 ' + y + ' close', q4:'Q4 ' + y + ' close', cum3:'Q3 ' + y + ' close', full:'FY ' + y + ' close', ytd:'period close', q1:'Q1 close', q2:'Q2 ' + y + ' close', cum2:'Q2 ' + y + ' close' }[period]) || ('FY ' + y);
  }

  // Convert a book-currency amount of entity to EUR
  function toEUR(amount, ent) { return amount * FX[ent.cur].EUR; }

  // ---- Currency formatting ----
  function compact(n) {
    const abs = Math.abs(n);
    if (abs >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (abs >= 1e3) return Math.round(n / 1e3) + 'K';
    return Math.round(n).toString();
  }
  function money(amountBook, ent) {
    const eur = amountBook * FX[ent.cur].EUR;
    const s = '€' + compact(eur);
    return { book: s, eur, usd: eur, str: s, sym: '€' };
  }
  function pct(n, digits = 1) { return (n >= 0 ? '+' : '') + n.toFixed(digits) + '%'; }

  // ---- Document-backed mock fixtures ----
  // Only these two contexts are pinned to delivered specs:
  // - SUGI France licensee view: STE_Analytics_MockData_SUGI_France.md
  // - Licensor aggregate view: STE_Analytics_MockData_Licensor_Console.md
  // All other licensees intentionally keep the generated data path.
  const SPEC_FIXTURES = {
    sugifr: {
      // Patch v1.1: royalty = net sales × 10% flat · annual min €2.5M
      royaltyRate: 0.10,
      annualRoyaltyMin: 2_500_000,
      sales: {
        ytd:  { actual: 13_700_000, plan: 14_300_000, prior: 13_400_000, royalty: 1_370_000, royaltyPlan: 1_430_000, royaltyPrior: 1_340_000, royaltyMin: 1_040_000 },
        q1:   { actual:  7_200_000, plan:  7_500_000, prior:  6_900_000, royalty: 720_000, royaltyPlan: 750_000, royaltyPrior: 690_000, royaltyMin: 625_000 },
        q2:   { actual:  6_500_000, plan:  9_500_000, prior:  9_100_000, royalty: 650_000, royaltyPlan: 950_000, royaltyPrior: 910_000, royaltyMin: 625_000 },
        q3:   { actual: null,       plan:  7_100_000, prior:  6_800_000 },
        q4:   { actual: null,       plan:  8_900_000, prior:  8_400_000 },
        cum1: { actual:  7_200_000, plan:  7_500_000, prior:  6_900_000, royalty: 720_000, royaltyPlan: 750_000, royaltyPrior: 690_000, royaltyMin: 625_000 },
        cum2: { actual: 13_700_000, plan: 17_000_000, prior: 16_000_000, royalty: 1_370_000, royaltyPlan: 1_700_000, royaltyPrior: 1_600_000, royaltyMin: 1_250_000 },
        cum3: { actual: null,       plan: 24_100_000, prior: 22_800_000 },
        full: { actual: null,       plan: 33_000_000, prior: 31_200_000 },
      },
      monthly: {
        actual: [1_900_000, 2_400_000, 2_900_000, 3_400_000, 3_100_000, null, null, null, null, null, null, null],
        plan:   [2_000_000, 2_500_000, 3_000_000, 3_500_000, 3_300_000, 2_700_000, 2_000_000, 2_300_000, 2_800_000, 3_200_000, 3_000_000, 2_500_000],
        prior:  [1_800_000, 2_300_000, 2_800_000, 3_400_000, 3_100_000, 2_600_000, 1_900_000, 2_200_000, 2_700_000, 3_100_000, 2_900_000, 2_400_000],
      },
      distribution: { active: 386, planDoors: 420, newD: 28, closeD: 17, top5: 42 },
      inventory: { stockValue: 3_900_000, stockToSales: 3.6, turn: 2.5, aged: 23, stockout: 4, markdown: 6 },
      marketing: { spend: 547_000, spendPlan: 490_000, roi: 3.9, reach: 6_000_000, violations: 0 },
    },
    total: {
      // Patch v1.1: royalty = net sales × 10% flat · combined annual min €10.3M
      royaltyRate: 0.10,
      annualRoyaltyMin: 10_300_000,
      sales: {
        ytd:  { actual: 54_800_000, plan: 57_000_000, prior: 52_600_000, royalty: 5_480_000, royaltyPlan: 5_700_000, royaltyPrior: 5_260_000, royaltyMin: 4_290_000 },
        q1:   { actual: 28_900_000, plan: 30_100_000, prior: 27_200_000 },
        q2:   { actual: 26_000_000, plan: 36_800_000, prior: 35_400_000 },
        q3:   { actual: null,       plan: 28_400_000, prior: 27_200_000 },
        q4:   { actual: null,       plan: 35_600_000, prior: 33_600_000 },
        cum1: { actual: 28_900_000, plan: 30_100_000, prior: 27_200_000 },
        cum2: { actual: 54_800_000, plan: 66_900_000, prior: 62_600_000 },
        cum3: { actual: null,       plan: 95_300_000, prior: 89_800_000 },
        full: { actual: null,       plan:130_900_000, prior:122_500_000 },
      },
      monthly: {
        actual: [7_600_000, 9_600_000, 11_700_000, 13_500_000, 12_400_000, null, null, null, null, null, null, null],
        plan:   [8_000_000,10_000_000, 12_100_000, 14_000_000, 12_900_000, 11_900_000, 8_000_000, 9_200_000, 11_200_000, 12_800_000, 12_000_000, 10_000_000],
        prior:  [7_200_000, 9_200_000, 10_800_000, 13_600_000, 11_800_000, 10_000_000, 7_600_000, 8_800_000, 10_800_000, 12_400_000, 11_600_000, 9_600_000],
      },
      distribution: { active: 1_544, planDoors: 1_645, newD: 112, closeD: 68, top5: 32 },
      inventory: { stockValue: 15_600_000, stockToSales: 3.6, turn: 2.6, aged: 21, stockout: 12, markdown: 18 },
      marketing: { spend: 2_190_000, spendPlan: 2_010_000, roi: 3.8, reach: 24_000_000, violations: 2 },
    },
  };

  function specFixture(entId) {
    return SPEC_FIXTURES[entId] || null;
  }
  function channelFactor(channel) {
    if (channel === 'retail') return 0.18;
    if (channel === 'wholesale') return 0.72;
    return 1;
  }
  function scaleNullable(v, factor) {
    return v == null ? null : Math.round(v * factor);
  }
  function cumulativeFromMonthly(arr, factor) {
    const out = [];
    let acc = 0;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] == null) out.push(null);
      else { acc += arr[i] * factor; out.push(Math.round(acc)); }
    }
    return out;
  }
  function quarterlyFromMonthly(monthly, factor) {
    return [
      scaleNullable(monthly[0] + monthly[1] + monthly[2], factor),
      monthly[3] == null || monthly[4] == null ? null : scaleNullable(monthly[3] + monthly[4] + (monthly[5] || 0), factor),
      monthly[6] == null ? null : scaleNullable(monthly[6] + monthly[7] + monthly[8], factor),
      monthly[9] == null ? null : scaleNullable(monthly[9] + monthly[10] + monthly[11], factor),
    ];
  }
  function specSalesFor(entId, period, channel) {
    const fx = specFixture(entId);
    if (!fx) return null;
    const row = fx.sales[period] || fx.sales.ytd;
    const ent = byId(entId);
    const factor = channelFactor(channel);
    const actual = scaleNullable(row.actual, factor);
    const plan = scaleNullable(row.plan, factor);
    const prior = scaleNullable(row.prior, factor);
    const royaltyRate = fx.royaltyRate;
    const royalty = scaleNullable(row.royalty != null ? row.royalty : (row.actual == null ? null : row.actual * royaltyRate), factor) || 0;
    const royaltyPlan = scaleNullable(row.royaltyPlan != null ? row.royaltyPlan : row.plan * royaltyRate, factor);
    const royaltyPrior = scaleNullable(row.royaltyPrior != null ? row.royaltyPrior : row.prior * royaltyRate, factor);
    const royaltyMin = scaleNullable(row.royaltyMin != null ? row.royaltyMin : fx.annualRoyaltyMin * ((periodMonths(period)[1] - periodMonths(period)[0] + 1) / 12), factor);
    const minForPeriod = royaltyMin / royaltyRate;
    const priorPlan = plan / 1.08;
    const avail = availability(period);
    return {
      ent, period, channel,
      netSales: actual || 0, plan, prior, priorPlan,
      hasActual: actual != null && avail !== 'none', avail, partial: avail === 'partial',
      achieved: actual != null ? actual / plan * 100 : null,
      vsPriorPlan: (plan / priorPlan - 1) * 100,
      vsPlan: actual != null ? (actual / plan - 1) * 100 : null,
      vsYoY: actual != null ? (actual / prior - 1) * 100 : null,
      vsMin: actual != null ? (actual / minForPeriod) * 100 : null,
      minForPeriod,
      royalty, royaltyPlan, royaltyPrior, royaltyMin, royaltyRate,
      annualRoyaltyMin: fx.annualRoyaltyMin,
      marketing: actual ? actual * 0.02 : 0,
      advertising: actual ? actual * 0.02 : 0,
      monthly: {
        months: MONTHS,
        actual: cumulativeFromMonthly(fx.monthly.actual, factor),
        plan: cumulativeFromMonthly(fx.monthly.plan, factor),
        prior: cumulativeFromMonthly(fx.monthly.prior, factor),
      },
      quarterly: {
        q: ['Q1','Q2','Q3','Q4'],
        actual: quarterlyFromMonthly(fx.monthly.actual, factor),
        plan: quarterlyFromMonthly(fx.monthly.plan, factor),
        prior: quarterlyFromMonthly(fx.monthly.prior, factor),
      },
    };
  }

  // ---- Domain: Sales & Royalty ----
  function salesFor(entId, period, channel) {
    const fixed = specSalesFor(entId, period, channel);
    if (fixed) return fixed;
    const ent = byId(entId);
    if (ent.aggregate) return aggregateSales(period, channel);
    const s = SERIES[entId];
    const rng = mulberry32(seedFrom(entId + period + (channel||'')));
    const range = periodMonths(period);
    let actual = sumRange(s.monthlyActual, range);
    let plan = sumRange(s.monthlyPlan, range);
    let prior = sumRange(s.monthlyPrior, range);
    // Wholesale vs Retail split (retail ~ 0.32 of total typical)
    if (channel === 'retail') { actual *= 0.34; plan *= 0.33; prior *= 0.33; }
    else if (channel === 'wholesale') { actual *= 0.66; plan *= 0.67; prior *= 0.67; }
    // Season intersection factor
    const sfac = seasonFactors(period);
    actual *= sfac.a; plan *= sfac.p; prior *= sfac.pr;
    // Year factor (YoY trend across 2025/2026/2027)
    const yf = yearFactor();
    actual *= yf; plan *= yf; prior *= yf;
    const avail = availability(period);
    const hasActual = avail !== 'none';
    const royaltyRate = 0.10;
    const annualMin = ent.annual * 0.40; // annual minimum (book)
    const _pm = periodMonths(period); const _mc = _pm[1] - _pm[0] + 1;
    let minForPeriod = annualMin * (_mc / 12);
    minForPeriod *= sfac.a * yf; // prorate minimum to the season slice for comparability
    const priorPlan = plan / 1.08;
    return {
      ent, period, channel,
      netSales: actual, plan, prior, priorPlan,
      hasActual, avail, partial: avail === 'partial',
      achieved: hasActual ? (actual / plan * 100) : null,
      vsPriorPlan: (plan / priorPlan - 1) * 100,
      vsPlan: (actual / plan - 1) * 100,
      vsYoY: (actual / prior - 1) * 100,
      vsMin: (actual / minForPeriod) * 100,
      minForPeriod,
      royalty: actual * royaltyRate,
      royaltyPlan: plan * royaltyRate,
      royaltyPrior: prior * royaltyRate,
      royaltyMin: minForPeriod * royaltyRate,
      royaltyRate,
      marketing: actual * 0.02,
      advertising: actual * 0.02,
      monthly: cumulative(entId, channel),
      quarterly: quarterly(entId, channel),
    };
  }
  function aggregateSales(period, channel) {
    let netSales = 0, plan = 0, prior = 0, royalty = 0, royaltyPlan = 0, minForPeriod = 0, royaltyMin = 0, marketing = 0, advertising = 0, royaltyPrior = 0;
    LICENSEES.forEach(e => {
      const d = salesFor(e.id, period, channel);
      netSales += toEUR(d.netSales, e); plan += toEUR(d.plan, e); prior += toEUR(d.prior, e);
      royalty += toEUR(d.royalty, e); royaltyPlan += toEUR(d.royaltyPlan, e); royaltyPrior += toEUR(d.royaltyPrior, e);
      minForPeriod += toEUR(d.minForPeriod, e); royaltyMin += toEUR(d.royaltyMin, e);
      marketing += toEUR(d.marketing, e); advertising += toEUR(d.advertising, e);
    });
    const total = byId('total');
    const avail = availability(period);
    const priorPlan = plan / 1.08;
    return {
      ent: total, period, channel,
      netSales, plan, prior, priorPlan,
      hasActual: avail !== 'none', avail, partial: avail === 'partial',
      achieved: avail !== 'none' ? (netSales / plan * 100) : null,
      vsPriorPlan: (plan / priorPlan - 1) * 100,
      vsPlan: (netSales / plan - 1) * 100,
      vsYoY: (netSales / prior - 1) * 100,
      vsMin: (netSales / minForPeriod) * 100,
      minForPeriod, royalty, royaltyPlan, royaltyPrior, royaltyMin, royaltyRate: 0.10,
      marketing, advertising,
      monthly: cumulativeAgg(channel),
      quarterly: quarterlyAgg(channel),
    };
  }

  // Cumulative monthly arrays (for YTD curve) — book currency for single, EUR for agg
  function cumulative(entId, channel) {
    const s = SERIES[entId];
    const sfac = seasonFactors('ytd'); const yf = yearFactor(); const am = actualMonths();
    const cm = (arr, factor) => { const out = []; let acc = 0; for (let i = 0; i < 12; i++) { acc += arr[i] * factor; out.push(Math.round(acc)); } return out; };
    const f = channel === 'retail' ? 0.34 : channel === 'wholesale' ? 0.66 : 1;
    const actual = cm(s.monthlyActual, f*sfac.a*yf).map((v, i) => i < am ? v : null);
    const plan = cm(s.monthlyPlan, f*sfac.p*yf);
    const prior = cm(s.monthlyPrior, f*sfac.pr*yf);
    return { months: MONTHS, actual, plan, prior };
  }
  function cumulativeAgg(channel) {
    const sfac = seasonFactors('ytd'); const yf = yearFactor(); const am = actualMonths();
    const f = channel === 'retail' ? 0.34 : channel === 'wholesale' ? 0.66 : 1;
    const actual = Array(12).fill(0), plan = Array(12).fill(0), prior = Array(12).fill(0);
    LICENSEES.forEach(e => {
      const s = SERIES[e.id]; let aA = 0, aP = 0, aPr = 0;
      for (let i = 0; i < 12; i++) {
        aA += s.monthlyActual[i] * f * sfac.a * yf * FX[e.cur].EUR;
        aP += s.monthlyPlan[i] * f * sfac.p * yf * FX[e.cur].EUR;
        aPr += s.monthlyPrior[i] * f * sfac.pr * yf * FX[e.cur].EUR;
        actual[i] += aA; plan[i] += aP; prior[i] += aPr;
      }
    });
    return { months: MONTHS, actual: actual.map((v, i) => i < am ? Math.round(v) : null), plan: plan.map(Math.round), prior: prior.map(Math.round) };
  }
  function quarterly(entId, channel) {
    const s = SERIES[entId];
    const sfac = seasonFactors('ytd'); const yf = yearFactor(); const am = actualMonths();
    const f = channel === 'retail' ? 0.34 : channel === 'wholesale' ? 0.66 : 1;
    const q = (arr, ff) => [sumRange(arr,[0,2]),sumRange(arr,[3,5]),sumRange(arr,[6,8]),sumRange(arr,[9,11])].map(v => Math.round(v*ff));
    const qStart = [0,3,6,9];
    const act = q(s.monthlyActual, f*sfac.a*yf).map((v,qi)=> qStart[qi] < am ? v : null);
    return { q: ['Q1','Q2','Q3','Q4'], actual: act, plan: q(s.monthlyPlan, f*sfac.p*yf), prior: q(s.monthlyPrior, f*sfac.pr*yf) };
  }
  function quarterlyAgg(channel) {
    const sfac = seasonFactors('ytd'); const yf = yearFactor(); const am = actualMonths();
    const f = channel === 'retail' ? 0.34 : channel === 'wholesale' ? 0.66 : 1;
    const actual=[0,0,0,0], plan=[0,0,0,0], prior=[0,0,0,0];
    const ranges=[[0,2],[3,5],[6,8],[9,11]]; const qStart=[0,3,6,9];
    LICENSEES.forEach(e=>{ const s=SERIES[e.id]; ranges.forEach((r,qi)=>{ actual[qi]+=sumRange(s.monthlyActual,r)*f*sfac.a*yf*FX[e.cur].EUR; plan[qi]+=sumRange(s.monthlyPlan,r)*f*sfac.p*yf*FX[e.cur].EUR; prior[qi]+=sumRange(s.monthlyPrior,r)*f*sfac.pr*yf*FX[e.cur].EUR; }); });
    return { q:['Q1','Q2','Q3','Q4'], actual: actual.map((v,qi)=> qStart[qi] < am ? Math.round(v) : null), plan: plan.map(Math.round), prior: prior.map(Math.round) };
  }

  // Category / Channel / Country breakdowns (share of net sales)
  const CATEGORIES = ['WEAR','ACC'];
  const SUBCATS = { WEAR:['INNER','OUTER','BOTTOM','OTHERS'], ACC:['HEADWEAR','UNDERWEAR','SOCKS','BAG','OTHERS'] };
  const CHANNELS = ['Wholesale','Retail','E-commerce','Outlet'];
  const COUNTRIES = {
    bbuk: ['United Kingdom','Ireland'], sugifr: ['France','Monaco','Belgium'],
    sugifw: ['Italy','Spain','Portugal'], benjamin: ['Germany','Austria','Switzerland'],
    bds: ['France','Netherlands','Luxembourg'],
    total: ['United Kingdom','France','Germany','Italy','Spain','Others']
  };
  function breakdown(entId, period, dim, channel) {
    const d = salesFor(entId, period, channel);
    const total = d.netSales;
    const rng = mulberry32(seedFrom(entId + period + dim + (channel||'')));
    let labels;
    if (dim === 'category') labels = CATEGORIES;
    else if (dim === 'channel') labels = CHANNELS;
    else labels = COUNTRIES[entId] || COUNTRIES.total;
    // weights
    let w = labels.map(() => 0.5 + rng());
    if (dim === 'category') w = [0.66, 0.34].slice(0, labels.length);
    if (dim === 'channel') w = [0.58, 0.22, 0.14, 0.06].slice(0, labels.length);
    const ws = w.reduce((a, b) => a + b, 0);
    return labels.map((l, i) => {
      const share = w[i] / ws;
      const val = total * share;
      const attain = 88 + Math.round(rng() * 28); // plan attainment %
      return { label: l, value: val, share: share * 100, attain };
    }).sort((a, b) => b.value - a.value);
  }

  // ---- Domain: Distribution ----
  function distributionFor(entId, period) {
    const ent = byId(entId);
    const fx = specFixture(entId);
    if (fx) {
      const sales = salesFor(entId, period);
      const d = fx.distribution;
      const priorActive = d.active - (d.newD - d.closeD);
      const tiers = [
        { tier: 'Tier 1', existing: Math.round(priorActive * 0.08), nw: Math.round(d.newD * 0.18), closing: Math.round(d.closeD * 0.12) },
        { tier: 'Tier 2', existing: Math.round(priorActive * 0.41), nw: Math.round(d.newD * 0.34), closing: Math.round(d.closeD * 0.29) },
        { tier: 'Tier 3', existing: priorActive - Math.round(priorActive * 0.08) - Math.round(priorActive * 0.41), nw: d.newD - Math.round(d.newD * 0.18) - Math.round(d.newD * 0.34), closing: d.closeD - Math.round(d.closeD * 0.12) - Math.round(d.closeD * 0.29) },
      ];
      const doorCum = []; let acc = d.active - d.netDelta;
      for (let m = 0; m < 12; m++) {
        if (m <= ACTUAL_THRU) {
          acc += Math.round(d.netDelta / (ACTUAL_THRU + 1));
          doorCum.push(m === ACTUAL_THRU ? d.active : acc);
        } else doorCum.push(null);
      }
      return {
        ent, period, tiers, active: d.active, planDoors: d.planDoors,
        newD: d.newD, closeD: d.closeD, netDelta: d.newD - d.closeD,
        revPerDoor: sales.netSales / d.active, top5: d.top5,
        channels: [
          { label: 'Wholesale', share: 72 },
          { label: 'Retail', share: 18 },
          { label: 'Marketplace', share: 7 },
          { label: 'ST Online', share: 3 },
        ],
        doorCum, months: MONTHS, quarterly: sales.quarterly,
        countries: COUNTRIES[entId] || COUNTRIES.total,
      };
    }
    const rng = mulberry32(seedFrom(entId + 'dist' + period));
    const scale = ent.aggregate ? 5 : 1;
    const base = ent.aggregate ? 75 : Math.round(40 + rng() * 50);
    const tiers = [
      { tier: 'Tier 1', existing: Math.round((ent.aggregate?40:8) + rng()*4), nw: Math.round(1+rng()*3), closing: Math.round(rng()*2) },
      { tier: 'Tier 2', existing: Math.round((ent.aggregate?110:22) + rng()*8), nw: Math.round(3+rng()*5), closing: Math.round(rng()*3) },
      { tier: 'Tier 3', existing: Math.round((ent.aggregate?220:45) + rng()*14), nw: Math.round(5+rng()*8), closing: Math.round(2+rng()*4) },
    ];
    const active = tiers.reduce((a,t)=>a+t.existing+t.nw-t.closing,0);
    const newD = tiers.reduce((a,t)=>a+t.nw,0);
    const closeD = tiers.reduce((a,t)=>a+t.closing,0);
    const sales = salesFor(entId, period);
    const revPerDoor = sales.netSales / active;
    const top5 = 28 + Math.round(rng()*16);
    const channels = [
      { label: 'Department Store', share: 34 + Math.round(rng()*8) },
      { label: 'Multi-Brand', share: 28 + Math.round(rng()*6) },
      { label: 'Mono-Brand', share: 14 + Math.round(rng()*6) },
      { label: 'Sports Specialist', share: 12 + Math.round(rng()*5) },
    ];
    // cumulative net door openings (monotonic upward, Jan–Jun actual)
    const doorCum = []; let acc = active - 9;
    for (let m=0;m<12;m++){ if (m<=ACTUAL_THRU){ acc += Math.round(1 + rng()*2.4); doorCum.push(acc); } else doorCum.push(null); }
    return { ent, period, tiers, active, newD, closeD, netDelta: newD-closeD, revPerDoor, top5, channels, doorCum, months: MONTHS,
             quarterly: sales.quarterly, countries: COUNTRIES[entId] || COUNTRIES.total };
  }

  // ---- Domain: Inventory ----
  const SEASONS = ['SS25','FW25','SS26','FW26'];
  function inventoryFor(entId, period) {
    const ent = byId(entId);
    const fx = specFixture(entId);
    if (fx) {
      const inv = fx.inventory;
      const sales = salesFor(entId, period);
      const matrix = [
        [60, 9, 97, 90],
        [36, 50, 12, 57],
      ];
      const stockValue = inv.stockValue;
      const movement = { inbound: stockValue * 0.4, sold: sales.netSales * 0.55, returns: sales.netSales * 0.04, markdownVal: stockValue * 0.12 };
      const snap = [
        Math.round(stockValue * 1.10),
        Math.round(stockValue),
        Math.round(stockValue * 0.95),
        Math.round(stockValue * 1.04),
      ];
      const snapPrior = snap.map((v, i) => Math.round(v * ([0.93, 0.95, 0.91, 0.88][i])));
      return {
        ent, period, stockValue, stockToSales: inv.stockToSales, turn: inv.turn, aged: inv.aged,
        matrix, categories: CATEGORIES, seasons: SEASONS,
        stockout: inv.stockout, markdown: inv.markdown, movement, snap, snapPrior, q: ['Q1','Q2','Q3','Q4'],
      };
    }
    const rng = mulberry32(seedFrom(entId + 'inv' + period));
    const sales = salesFor(entId, period);
    const stockValue = sales.netSales * (0.28 + rng()*0.1);
    const stockToSales = 2.4 + rng()*1.6; // months
    const turn = 2.2 + rng()*1.4;
    const aged = 8 + Math.round(rng()*18); // %
    // category × season matrix (stock value share)
    const matrix = CATEGORIES.map(cat => SEASONS.map(() => Math.round(rng()*100)));
    const stockout = Math.round(rng()*6);
    const markdown = Math.round(2 + rng()*8);
    const movement = { inbound: stockValue*0.4, sold: sales.netSales*0.55, returns: sales.netSales*0.04, markdownVal: stockValue*0.12 };
    // quarterly snapshot + yoy
    const snap = [0,1,2,3].map(qi => Math.round(stockValue*(0.85+rng()*0.3)));
    const snapPrior = snap.map(v => Math.round(v*(0.92+rng()*0.12)));
    return { ent, period, stockValue, stockToSales, turn, aged, matrix, categories: CATEGORIES, seasons: SEASONS,
             stockout, markdown, movement, snap, snapPrior, q: ['Q1','Q2','Q3','Q4'] };
  }

  // ---- Domain: Marketing ----
  const CAMPAIGNS = {
    bbuk: ['Tennis Heritage Reborn','Wimbledon Pop-up','Designer Collab','UK Influencers'],
    sugifr: ['Roland-Garros Edit','Paris Flagship','Riviera Capsule','FR Creators'],
    sugifw: ['Italian Court Series','Milan Design Week','Footwear Drop','IG Reels Push'],
    benjamin: ['Bundesliga Active','Berlin Pop-up','Alpine Capsule','DE Creators'],
    bds: ['Benelux Launch','Amsterdam Pop-up','Outlet Drive','Micro-Creators'],
    total: ['Tennis Heritage Reborn','Roland-Garros Edit','Italian Court Series','Bundesliga Active','Benelux Launch']
  };
  function marketingFor(entId, period) {
    const ent = byId(entId);
    const fx = specFixture(entId);
    if (fx) {
      const m = fx.marketing;
      const sales = salesFor(entId, period);
      const spend = m.spend;
      const spendPlan = m.spendPlan;
      const camps = (CAMPAIGNS[entId] || CAMPAIGNS.total).map((name, i) => {
        const roi = [5.1, 4.2, 3.5, 3.0, 2.6][i] || m.roi;
        const cs = spend * ([0.15, 0.12, 0.10, 0.08, 0.06][i] || 0.08);
        return { name, spend: cs, roi };
      });
      const channelMix = [
        { label: 'Instagram', val: 32 },
        { label: 'TikTok', val: 23 },
        { label: 'X', val: 12 },
        { label: 'OOH', val: 14 },
        { label: 'Print', val: 8 },
        { label: 'Event', val: 12 },
      ];
      function sns(goal, pace) {
        const planC = [], actC = [];
        let p = 0, a = 0;
        for (let month = 0; month < 12; month++) {
          p += goal / 12;
          a += (goal / 12) * pace;
          planC.push(Math.round(p));
          actC.push(month <= ACTUAL_THRU ? Math.round(a) : null);
        }
        return { goal, plan: planC, actual: actC };
      }
      const mult = ent.aggregate ? 5 : 1;
      return {
        ent, period, spend, spendPlan, roi: m.roi, reach: m.reach, violations: m.violations,
        camps, channelMix, months: MONTHS,
        sns: { Instagram: sns(150000 * mult, 0.42), TikTok: sns(110000 * mult, 0.52), X: sns(48000 * mult, 0.35) },
        spendQ: {
          q: ['Q1','Q2','Q3','Q4'],
          actual: sales.quarterly.actual.map((v) => v == null ? null : Math.round(v * spend / Math.max(1, sales.netSales))),
          plan: sales.quarterly.plan.map((v) => Math.round(v * spendPlan / Math.max(1, sales.plan))),
        },
      };
    }
    const rng = mulberry32(seedFrom(entId + 'mkt' + period));
    const sales = salesFor(entId, period);
    const spend = sales.netSales * 0.04;
    const spendPlan = sales.plan * 0.042;
    const roi = 2.6 + rng()*2.2;
    const reach = Math.round((ent.aggregate? 18 : 3 + rng()*4) * 1e6); // SNS reach
    const violations = Math.round(rng()*4);
    const camps = (CAMPAIGNS[entId]||CAMPAIGNS.total).map(name => {
      const cs = spend * (0.12 + rng()*0.25);
      return { name, spend: cs, roi: 1.8 + rng()*3.4 };
    });
    const channelMix = [
      { label:'Instagram', val: 26+Math.round(rng()*8) },
      { label:'TikTok', val: 20+Math.round(rng()*8) },
      { label:'X', val: 8+Math.round(rng()*5) },
      { label:'OOH', val: 14+Math.round(rng()*6) },
      { label:'Print', val: 8+Math.round(rng()*4) },
      { label:'Event', val: 12+Math.round(rng()*6) },
    ];
    // SNS monthly cumulative plan vs actual (followers), per platform with year-end goal
    function sns(goal, pace) {
      const planC=[], actC=[]; let p=0,a=0;
      for(let m=0;m<12;m++){ p += goal/12; const step=(goal/12)*(pace*(0.85+rng()*0.3)); a += step; planC.push(Math.round(p)); actC.push(m<=ACTUAL_THRU?Math.round(a):null); }
      return { goal, plan: planC, actual: actC };
    }
    const mult = ent.aggregate ? 5 : 1;
    const snsData = {
      Instagram: sns(30000*mult, 0.82),
      TikTok: sns(22000*mult, 1.05),
      X: sns(12000*mult, 0.7),
    };
    return { ent, period, spend, spendPlan, roi, reach, violations, camps, channelMix, sns: snsData, months: MONTHS,
             spendQ: { q:['Q1','Q2','Q3','Q4'], actual: sales.quarterly.actual.map(v=>Math.round(v*0.04)), plan: sales.quarterly.plan.map(v=>Math.round(v*0.042)) } };
  }

  // ---- Action items (A1) ----
  function actionItems() {
    // headline + items with due dates (sorted by nearest)
    return [
      { id:'bds', sev:'urgent', headline:'Below contract minimum — intervention needed',
        items:[
          { ic:'red', txt:'Q2 Sales Statement overdue', due:'D-2' },
          { ic:'red', txt:'Cumulative min at 32% — recovery plan required', due:'D-9' },
          { ic:'amber', txt:'Brand compliance: 4 violations to clear', due:'D-15' },
        ]},
      { id:'sugifw', sev:'urgent', headline:'Brand Elevation review approaching',
        items:[
          { ic:'amber', txt:'SS26 design re-submission (3 CADs)', due:'D-4' },
          { ic:'amber', txt:'Stock-to-sales above 4.0 — markdown review', due:'D-12' },
          { ic:'blue', txt:'Contract Brand Elevation checkpoint', due:'D-90' },
        ]},
      { id:'bbuk', sev:'warn', headline:'Renewal window open — strong performer',
        items:[
          { ic:'blue', txt:'Season Plan (3-B Distribution) submit', due:'D-12' },
          { ic:'blue', txt:'Renewal term sheet review', due:'D-30' },
          { ic:'green', txt:'Q1 royalty settled — no action', due:'—' },
        ]},
      { id:'benjamin', sev:'warn', headline:'5+5 extension request under review',
        items:[
          { ic:'blue', txt:'Extension request — HQ decision', due:'D-21' },
          { ic:'blue', txt:'FW26 marketing plan review', due:'D-34' },
        ]},
      { id:'sugifr', sev:'ok', headline:'On track across all domains',
        items:[
          { ic:'green', txt:'All submissions current', due:'—' },
          { ic:'blue', txt:'Roland-Garros campaign report due', due:'D-40' },
        ]},
    ];
  }

  // ---- Operational KPIs (6 headline tiles) ----
  const CONTRACTED = { bbuk: 3, sugifr: 4, sugifw: 4, benjamin: 4, bds: 4, total: 18 };
  function operationalKPIs(entId, period, mode) {
    const ent = byId(entId);
    const d = salesFor(entId, period);
    const m = money;
    const rng = mulberry32(seedFrom(entId + period + 'kpi'));
    const isLicensor = mode === 'licensor';
    const selling = (COUNTRIES[entId] || COUNTRIES.total).length;
    const contracted = CONTRACTED[entId] || CONTRACTED.total;
    const passRate = 82 + Math.round(rng() * 12);
    const sampleRounds = (2 + rng() * 1.4).toFixed(1);
    const planView = (_ctx.view === 'plan');
    const netVal = planView ? m(d.plan, ent).book : m(d.netSales, ent).book;
    const royVal = planView ? m(d.royaltyPlan, ent).book : m(d.royalty, ent).book;
    // Excess royalty over prorated contract minimum (spec-pinned entities carry their own annual min)
    const annualRoyMin = d.annualRoyaltyMin || ent.annual * 0.40 * 0.10;
    const proratedRoyMin = d.royaltyMin; // already prorated by period month-count
    const excess = d.royalty - proratedRoyMin;
    const fraction = annualRoyMin > 0 ? (proratedRoyMin / annualRoyMin) : 1;
    const royProj = fraction > 0 ? (d.royalty / fraction) : d.royalty;
    const excessStr = (excess < 0 ? '−€' : '+€') + compact(Math.abs(excess));
    const excessTile = !d.hasActual
      ? { label: 'Excess Royalty €', value: '—', sub: 'no actuals yet' }
      : { label: 'Excess Royalty €', value: excessStr, tone: excess < 0 ? 'red' : 'green',
          sub: excess < 0 ? 'Min underpayment ⚠️' : 'over prorated minimum',
          tip: { title: 'Excess Royalty', rows: [['Annual Min', '€'+compact(annualRoyMin)], ['Prorated Min', '€'+compact(proratedRoyMin)], ['Actual Royalty', '€'+compact(d.royalty)], ['Excess', excessStr], ['Year-End Projection', '€'+compact(royProj)+' ('+(annualRoyMin>0?(royProj/annualRoyMin*100).toFixed(0):'—')+'%)']], src: 'Actual − Prorated Contract Minimum' } };
    return [
      { label: planView ? 'Planned Net Sales' : 'Total Net Sales', value: netVal, sub: planView ? 'committed plan · EUR' : 'consolidated · EUR' },
      { label: planView ? 'Planned Royalty' : 'Total Royalty', value: royVal, sub: '@ 10.0% effective' },
      excessTile,
      { label: 'Design Pass Rate', value: passRate, unit: '%', sub: 'first-pass approvals', tone: passRate >= 85 ? 'green' : 'amber' },
      { label: 'Sample Avg Rounds', value: sampleRounds, sub: 'to approval' },
      isLicensor
        ? { label: 'Licensee Compliance Alerts', value: 3, sub: 'across 5 licensees', tone: 'red' }
        : { label: 'Active Markets', value: selling + ' / ' + contracted, sub: 'Selling in ' + selling + ' of ' + contracted + ' contracted territories' },
    ];
  }

  // ---- Licensee-side action list (things this licensee owes) ----
  const LICENSEE_ACTIONS = {
    bbuk: [
      { sev:'amber', txt:'Upload Q1 2026 Sales Statement', meta:'deadline 30 Apr 2026', due:'D-3' },
      { sev:'amber', txt:'Resubmit 2 designs flagged in HQ review', meta:'SS26 Track Top series', due:'D-7' },
      { sev:'blue',  txt:'Renewal negotiation — contract expires 2027-03-31', meta:'term sheet review', due:'D-30' },
      { sev:'green', txt:'Q4 2025 royalty settled', meta:'no action required', due:'—' },
    ],
  };
  function licenseeActions(entId) {
    if (LICENSEE_ACTIONS[entId]) return LICENSEE_ACTIONS[entId];
    const a = actionItems().find(x => x.id === entId);
    if (!a) return LICENSEE_ACTIONS.bbuk;
    return a.items.map(it => ({ sev: it.ic === 'red' ? 'urgent' : it.ic === 'amber' ? 'amber' : it.ic === 'green' ? 'green' : 'blue', txt: it.txt, meta: a.headline, due: it.due }));
  }

  // ---- Anonymized peer benchmark (GDPR/competition-safe) ----
  function peerBadge(entId, domain) {
    const rng = mulberry32(seedFrom(entId + domain + 'peer'));
    const delta = Math.round(rng() * 34) - 11; // -11 .. +23
    return { delta, txt: 'vs European avg' };
  }

  // ---- Per-licensee rankings (Net Sales attainment % vs season plan) ----
  function rankings(period) {
    return LICENSEES.map(e => {
      const d = salesFor(e.id, period);
      return { ent: e, attain: Math.round(d.netSales / d.plan * 100), netSales: toEUR(d.netSales, e) };
    }).sort((a, b) => b.attain - a.attain);
  }

  function byId(id){ return ENTITIES.find(e=>e.id===id) || ENTITIES[0]; }

  // ---- Overview analytics: Quick Mix · AI Insights · Performance Highlights ----
  function _seed(eid, salt) { return seedFrom(eid + (_ctx.year||'') + (_ctx.season||'') + (_ctx.view||'') + salt); }
  function _pl(p) { return ({ ytd:'YTD', q1:'Q1', q2:'Q2', q3:'Q3', q4:'Q4', cum1:'Through Q1', cum2:'Through Q2', cum3:'Through Q3', full:'Full Year' }[p] || p) + ' ' + (_ctx.year||'2026'); }
  function mixPct(eid, period, salt, labels, weights) {
    const rng = mulberry32(_seed(eid, period + salt));
    const w = weights.map(b => b * (0.88 + rng() * 0.24));
    const sum = w.reduce((a,b)=>a+b,0);
    let acc = 0; const out = labels.map((l,i)=>{ const v = Math.round(w[i]/sum*100); acc += v; return { label:l, val:v }; });
    out[out.length-1].val += (100 - acc); // normalize to 100
    return out;
  }
  function genderMix(eid, period) { return mixPct(eid, period, 'gender', ['Mens','Womens','Kids'], [0.52,0.40,0.08]); }
  function customerMix(eid, period) { return mixPct(eid, period, 'cust', ['Wholesale','Retail','Marketplace','ST Online'], [0.50,0.26,0.14,0.10]); }
  function territoryMix(eid, period) {
    const d = salesFor(eid, period);
    const rng = mulberry32(_seed(eid, period + 'terr'));
    const outPct = +(0.6 + rng() * 2.2).toFixed(1);
    return { inPct: +(100 - outPct).toFixed(1), outPct, outVal: d.netSales * outPct / 100, threshold: 5 };
  }
  function aiInsights(eid, period, mode) {
    const d = salesFor(eid, period);
    const cats = breakdown(eid, period, 'category', null);
    const terr = territoryMix(eid, period);
    const ent = byId(eid);
    const annualRoyMin = ent.annual * 0.40 * 0.10;
    const frac = annualRoyMin > 0 ? (d.royaltyMin / annualRoyMin) : 1;
    const proj = (d.hasActual && frac > 0) ? d.royalty / frac : 0;
    const planView = _ctx.view === 'plan';
    const regionPool = breakdown(eid, period, ent.aggregate ? 'country' : 'channel', null);
    const topRegion = regionPool.slice().sort((a,b)=>Math.abs(b.attain-100)-Math.abs(a.attain-100))[0];
    const sub = SUBCATS[cats[0].label] || ['INNER'];
    const subName = sub[Math.floor(mulberry32(_seed(eid, period+'sub'))() * sub.length)];
    const out = [];
    out.push(`${cats[0].label} category leads at ${cats[0].share.toFixed(0)}% of net sales — plan attainment ${cats[0].attain}%, with ${subName} the standout sub-line.`);
    if (d.hasActual) out.push(`Royalty pace projects ${proj>=annualRoyMin?'+':'−'}€${compact(Math.abs(proj-annualRoyMin))} ${proj>=annualRoyMin?'above':'below'} contract minimum at year-end.`);
    else out.push(`No actuals yet for ${_pl(period)} — committed plan totals €${compact(d.plan)} (royalty €${compact(d.royaltyPlan)}).`);
    out.push(`${topRegion.label} ${topRegion.attain>=100?'overperforming':'tracking below'} plan by ${topRegion.attain>=100?'+':'−'}€${compact(Math.abs(topRegion.value*(topRegion.attain-100)/100))}${topRegion.attain>=100?' — consider for SS27 expansion planning':''}.`);
    out.push(`Out-of-Territory sales: €${compact(terr.outVal)} (${terr.outPct}%) — ${terr.outPct<terr.threshold?'within':'ABOVE'} acceptable threshold (<5%).`);
    if (planView) out.push(`Viewing committed Plan: ${cats[0].label}/${cats[1]?cats[1].label:''} split reflects season buy, not realized sell-through.`);
    return out.slice(0, 5);
  }
  function performanceHighlights(eid, period, mode) {
    const ent = byId(eid);
    const cats = breakdown(eid, period, 'category', null).map(x=>({ name:x.label, kind:'Category', value:x.value, delta:x.attain-100, go:'a2' }));
    const geo = breakdown(eid, period, ent.aggregate ? 'country' : 'channel', null).map(x=>({ name:x.label, kind: ent.aggregate?'Market':'Channel', value:x.value, delta:x.attain-100, go: ent.aggregate?'a2':'a3' }));
    const skus = ['Polo SS26','Track Top','Knit Crew','Cap Logo','Tote Bag','Crew Socks'].map((n,i)=>{ const rng=mulberry32(_seed(eid, period+'sku'+i)); return { name:n, kind:'SKU', value: salesFor(eid,period).netSales*(0.02+rng()*0.06), delta: Math.round(rng()*40-15), go:'a2' }; });
    const pool = cats.concat(geo, skus);
    const best = pool.slice().sort((a,b)=>b.delta-a.delta).slice(0,3);
    const watch = pool.slice().sort((a,b)=>a.delta-b.delta).slice(0,3);
    return { best, watch };
  }

  window.STEData = {
    ENTITIES, LICENSEES, MONTHS, byId, money, compact, pct, toEUR,
    salesFor, breakdown, distributionFor, inventoryFor, marketingFor, actionItems,
    CATEGORIES, CHANNELS, COUNTRIES,
    setContext, getContext, seasonFactors, SEASONS_FILTER,
    availability, closeLabel, actualMonths, curYear,
    operationalKPIs, licenseeActions, peerBadge, rankings,
    genderMix, customerMix, territoryMix, aiInsights, performanceHighlights, SUBCATS,
  };
})();
