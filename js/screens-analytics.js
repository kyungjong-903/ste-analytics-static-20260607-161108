/* =========================================================
   Analytics (#/analytics)
   Cross-portfolio rollup view with:
   - Dashboard-style KPI tiles
   - Date range filter (presets + custom)
   - Customizable layout — mix and match which charts to show
   - SVG charts (no chart library dependency)
   ========================================================= */
(function (global) {
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  // ============================ REFERENCE DATA MODEL ============================
  // Ported verbatim from the Licensor Console reference (STEData). Deterministic
  // per (entity, period[, channel]) so the dashboard reads consistently across
  // tabs. 5 fixed licensees + a "total" portfolio aggregate; period = YTD or
  // one of Q1..Q4. All money is in the licensee's book currency; the money()
  // helper expands a value to its EUR/USD equivalents using fixed FX.
  function _mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function _seedFrom(str) {
    let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0;
  }
  const _MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const _ACTUAL_THRU = 5; // Jan..Jun (idx 0..5) actual; Jul..Dec projected (null in series)
  const _SEASON_W = [0.74,0.82,1.02,1.16,1.24,1.18, 0.86,0.80,1.05,1.16,1.04,0.93];
  const _FX = {
    GBP: { EUR: 1.18, USD: 1.274, sym: '£' },
    EUR: { EUR: 1.0,  USD: 1.08,  sym: '€' },
  };
  const _ENTITIES = [
    { id:'total',    code:'STE Total',  name:'Portfolio (5 licensees)', cur:'EUR', flag:'flag-eu', aggregate:true,  annual:0,         attain:1.0,  yoy:0.094, region:'Europe' },
    { id:'bbuk',     code:'BBUK',       name:'Best of Britain Ltd',     cur:'GBP', flag:'flag-uk',                   annual:5_000_000, attain:1.05, yoy:0.12,  region:'UK & Ireland' },
    { id:'sugifr',   code:'SUGI FR',    name:'SUGI France',             cur:'EUR', flag:'flag-fr',                   annual:6_500_000, attain:1.02, yoy:0.09,  region:'France & Monaco' },
    { id:'sugifw',   code:'SUGI FW',    name:'SUGI International',      cur:'EUR', flag:'flag-it',                   annual:7_800_000, attain:0.91, yoy:0.05,  region:'Italy & Iberia' },
    { id:'benjamin', code:'BENJAMIN',   name:'Benjamin GmbH',           cur:'EUR', flag:'flag-de',                   annual:4_200_000, attain:0.98, yoy:0.07,  region:'DACH' },
    { id:'bds',      code:'BDS',        name:'BDS Group',               cur:'EUR', flag:'flag-eu',                   annual:3_400_000, attain:0.78, yoy:-0.03, region:'Benelux' },
  ];
  const _LICENSEES = _ENTITIES.filter(e => !e.aggregate);
  // Seeded monthly arrays per licensee — Plan, Actual (Jan..Jun real), Prior YR.
  const _SERIES = {};
  _LICENSEES.forEach(e => {
    const rng = _mulberry32(_seedFrom(e.id + 'sales'));
    const monthlyTarget = e.annual / 12;
    const monthlyPlan = _SEASON_W.map(w => Math.round(monthlyTarget * w));
    const monthlyActual = monthlyPlan.map((p, i) => i <= _ACTUAL_THRU ? Math.round(p * (e.attain * (0.92 + rng() * 0.16))) : null);
    const monthlyPrior = monthlyPlan.map(p => Math.round(p / (1 + e.yoy) * (0.92 + rng() * 0.16)));
    _SERIES[e.id] = { monthlyPlan, monthlyActual, monthlyPrior };
  });
  function _periodMonths(period) {
    if (period === 'ytd') return [0, _ACTUAL_THRU];
    if (period === 'q1') return [0, 2];
    if (period === 'q2') return [3, 5];
    if (period === 'q3') return [6, 8];
    if (period === 'q4') return [9, 11];
    return [0, _ACTUAL_THRU];
  }
  function _sumRange(arr, range) {
    let s = 0; for (let i = range[0]; i <= range[1]; i++) s += (arr[i] || 0); return s;
  }
  function _toEUR(amount, ent) {
    if (!ent || ent.cur === 'EUR' || ent.aggregate) return amount;
    return amount * (_FX[ent.cur] && _FX[ent.cur].EUR || 1);
  }
  function _byId(id) { return _ENTITIES.find(e => e.id === id) || _ENTITIES[0]; }
  function _compact(n) {
    n = Math.round(n || 0);
    if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return Math.round(n / 1e3) + 'K';
    return String(n);
  }
  function _money(amountBook, ent) {
    const cur = (ent && ent.cur) || 'EUR';
    const sym = (_FX[cur] && _FX[cur].sym) || '€';
    const eur = _toEUR(amountBook, ent || {cur:'EUR'});
    const usd = eur * _FX.EUR.USD;
    const book = sym + _compact(amountBook);
    const parts = [];
    if (cur !== 'EUR') parts.push('EUR ' + _compact(eur));
    parts.push('USD ' + _compact(usd));
    return { book, str: parts.join(' · '), sym };
  }
  function _cumulative(entId, channel) {
    const s = _SERIES[entId];
    if (!s) return { months: _MONTHS, actual: [], plan: [], prior: [] };
    const f = channel === 'retail' ? 0.34 : channel === 'wholesale' ? 0.66 : 1;
    const cm = (arr) => { const out = []; let acc = 0; for (let i = 0; i < 12; i++) { acc += (arr[i] || 0) * f; out.push(Math.round(acc)); } return out; };
    const actual = cm(s.monthlyActual).map((v, i) => i <= _ACTUAL_THRU ? v : null);
    return { months: _MONTHS, actual, plan: cm(s.monthlyPlan), prior: cm(s.monthlyPrior) };
  }
  function _cumulativeAgg(channel) {
    const f = channel === 'retail' ? 0.34 : channel === 'wholesale' ? 0.66 : 1;
    const actual = Array(12).fill(0), plan = Array(12).fill(0), prior = Array(12).fill(0);
    _LICENSEES.forEach(e => {
      const s = _SERIES[e.id]; let aA = 0, aP = 0, aPr = 0;
      for (let i = 0; i < 12; i++) {
        aA += (s.monthlyActual[i] || 0) * f * _FX[e.cur].EUR;
        aP += s.monthlyPlan[i] * f * _FX[e.cur].EUR;
        aPr += s.monthlyPrior[i] * f * _FX[e.cur].EUR;
        actual[i] += aA; plan[i] += aP; prior[i] += aPr;
      }
    });
    return { months: _MONTHS, actual: actual.map((v, i) => i <= _ACTUAL_THRU ? Math.round(v) : null), plan: plan.map(Math.round), prior: prior.map(Math.round) };
  }
  function _quarterly(entId, channel) {
    const s = _SERIES[entId];
    if (!s) return { q: ['Q1','Q2','Q3','Q4'], actual: [0,0,0,0], plan: [0,0,0,0], prior: [0,0,0,0] };
    const f = channel === 'retail' ? 0.34 : channel === 'wholesale' ? 0.66 : 1;
    const q = (arr) => [[0,2],[3,5],[6,8],[9,11]].map(r => Math.round(_sumRange(arr, r) * f));
    return { q: ['Q1','Q2','Q3','Q4'], actual: q(s.monthlyActual), plan: q(s.monthlyPlan), prior: q(s.monthlyPrior) };
  }
  function _quarterlyAgg(channel) {
    const f = channel === 'retail' ? 0.34 : channel === 'wholesale' ? 0.66 : 1;
    const actual=[0,0,0,0], plan=[0,0,0,0], prior=[0,0,0,0];
    const ranges=[[0,2],[3,5],[6,8],[9,11]];
    _LICENSEES.forEach(e => { const s = _SERIES[e.id]; ranges.forEach((r, qi) => {
      actual[qi] += _sumRange(s.monthlyActual, r) * f * _FX[e.cur].EUR;
      plan[qi]   += _sumRange(s.monthlyPlan,   r) * f * _FX[e.cur].EUR;
      prior[qi]  += _sumRange(s.monthlyPrior,  r) * f * _FX[e.cur].EUR;
    }); });
    return { q: ['Q1','Q2','Q3','Q4'], actual: actual.map(Math.round), plan: plan.map(Math.round), prior: prior.map(Math.round) };
  }
  function _salesFor(entId, period, channel) {
    const ent = _byId(entId);
    if (ent.aggregate) return _aggregateSales(period, channel);
    const s = _SERIES[entId]; const range = _periodMonths(period);
    let actual = _sumRange(s.monthlyActual, range);
    let plan   = _sumRange(s.monthlyPlan,   range);
    let prior  = _sumRange(s.monthlyPrior,  range);
    if (channel === 'retail')         { actual *= 0.34; plan *= 0.33; prior *= 0.33; }
    else if (channel === 'wholesale') { actual *= 0.66; plan *= 0.67; prior *= 0.67; }
    const royaltyRate = 0.10;
    const annualMin = ent.annual * 0.40;
    const minForPeriod = period === 'ytd' ? annualMin * 0.5 : annualMin * 0.25;
    return {
      ent, period, channel,
      netSales: actual, plan, prior,
      vsPlan: plan ? (actual / plan - 1) * 100 : 0,
      vsYoY:  prior ? (actual / prior - 1) * 100 : 0,
      vsMin:  minForPeriod ? (actual / minForPeriod) * 100 : 0,
      minForPeriod,
      royalty: actual * royaltyRate,
      royaltyPlan: plan * royaltyRate,
      royaltyPrior: prior * royaltyRate,
      royaltyMin: minForPeriod * royaltyRate,
      royaltyRate,
      marketing: actual * 0.02,
      advertising: actual * 0.02,
      monthly: _cumulative(entId, channel),
      quarterly: _quarterly(entId, channel),
    };
  }
  function _aggregateSales(period, channel) {
    let netSales=0, plan=0, prior=0, royalty=0, royaltyPlan=0, royaltyPrior=0, minForPeriod=0, royaltyMin=0, marketing=0, advertising=0;
    _LICENSEES.forEach(e => {
      const d = _salesFor(e.id, period, channel);
      netSales += _toEUR(d.netSales, e); plan += _toEUR(d.plan, e); prior += _toEUR(d.prior, e);
      royalty += _toEUR(d.royalty, e); royaltyPlan += _toEUR(d.royaltyPlan, e); royaltyPrior += _toEUR(d.royaltyPrior, e);
      minForPeriod += _toEUR(d.minForPeriod, e); royaltyMin += _toEUR(d.royaltyMin, e);
      marketing += _toEUR(d.marketing, e); advertising += _toEUR(d.advertising, e);
    });
    return {
      ent: _byId('total'), period, channel,
      netSales, plan, prior,
      vsPlan: plan ? (netSales / plan - 1) * 100 : 0,
      vsYoY:  prior ? (netSales / prior - 1) * 100 : 0,
      vsMin:  minForPeriod ? (netSales / minForPeriod) * 100 : 0,
      minForPeriod, royalty, royaltyPlan, royaltyPrior, royaltyMin, royaltyRate: 0.10,
      marketing, advertising,
      monthly: _cumulativeAgg(channel),
      quarterly: _quarterlyAgg(channel),
    };
  }
  const _CATEGORIES = ['Apparel','Footwear','Accessory','Outerwear'];
  const _CHANNELS = ['Wholesale','Retail','E-commerce','Outlet'];
  const _COUNTRIES = {
    bbuk:['United Kingdom','Ireland'],
    sugifr:['France','Monaco','Belgium'],
    sugifw:['Italy','Spain','Portugal'],
    benjamin:['Germany','Austria','Switzerland'],
    bds:['France','Netherlands','Luxembourg'],
    total:['United Kingdom','France','Germany','Italy','Spain','Others'],
  };
  function _breakdown(entId, period, dim, channel) {
    const d = _salesFor(entId, period, channel);
    const rng = _mulberry32(_seedFrom(entId + period + dim + (channel || '')));
    const labels = dim === 'category' ? _CATEGORIES
      : dim === 'channel'  ? _CHANNELS
      : (_COUNTRIES[entId] || _COUNTRIES.total);
    let w = labels.map(() => 0.5 + rng());
    if (dim === 'category') w = [0.55, 0.18, 0.17, 0.10].slice(0, labels.length);
    if (dim === 'channel')  w = [0.58, 0.22, 0.14, 0.06].slice(0, labels.length);
    const ws = w.reduce((a, b) => a + b, 0);
    return labels.map((l, i) => {
      const share = w[i] / ws; const val = d.netSales * share;
      const attain = 88 + Math.round(rng() * 28);
      return { label: l, value: val, share: share * 100, attain };
    });
  }
  function _distributionFor(entId, period) {
    const ent = _byId(entId);
    const rng = _mulberry32(_seedFrom(entId + 'dist' + period));
    const tiers = [
      { tier:'Tier 1', existing: Math.round((ent.aggregate?40:8)  + rng()*4),  nw: Math.round(1+rng()*3), closing: Math.round(rng()*2) },
      { tier:'Tier 2', existing: Math.round((ent.aggregate?110:22) + rng()*8), nw: Math.round(3+rng()*5), closing: Math.round(rng()*3) },
      { tier:'Tier 3', existing: Math.round((ent.aggregate?220:45) + rng()*14),nw: Math.round(5+rng()*8), closing: Math.round(2+rng()*4) },
    ];
    const active = tiers.reduce((a,t)=>a+t.existing+t.nw-t.closing,0);
    const newD = tiers.reduce((a,t)=>a+t.nw,0);
    const closeD = tiers.reduce((a,t)=>a+t.closing,0);
    const sales = _salesFor(entId, period);
    const revPerDoor = active ? sales.netSales / active : 0;
    const top5 = 28 + Math.round(rng() * 16);
    const channels = [
      { label:'Department Store', share: 34 + Math.round(rng()*8) },
      { label:'Multi-Brand',      share: 28 + Math.round(rng()*6) },
      { label:'Mono-Brand',       share: 14 + Math.round(rng()*6) },
      { label:'Sports Specialist',share: 12 + Math.round(rng()*5) },
    ];
    const doorCum = []; let acc = active - 9;
    for (let m = 0; m < 12; m++) {
      if (m <= _ACTUAL_THRU) { acc += Math.round(1 + rng() * 2.4); doorCum.push(acc); }
      else doorCum.push(null);
    }
    return { ent, period, tiers, active, newD, closeD, netDelta: newD - closeD, revPerDoor, top5, channels, doorCum, months: _MONTHS,
             quarterly: sales.quarterly, countries: _COUNTRIES[entId] || _COUNTRIES.total };
  }
  const _SEASONS = ['SS25','FW25','SS26','FW26'];
  function _inventoryFor(entId, period) {
    const ent = _byId(entId);
    const rng = _mulberry32(_seedFrom(entId + 'inv' + period));
    const sales = _salesFor(entId, period);
    const stockValue = sales.netSales * (0.28 + rng() * 0.1);
    const stockToSales = 2.4 + rng() * 1.6;
    const turn = 2.2 + rng() * 1.4;
    const aged = 8 + Math.round(rng() * 18);
    const matrix = _CATEGORIES.map(() => _SEASONS.map(() => Math.round(rng() * 100)));
    const stockout = Math.round(rng() * 6);
    const markdown = Math.round(2 + rng() * 8);
    const movement = { inbound: stockValue * 0.4, sold: sales.netSales * 0.55, returns: sales.netSales * 0.04, markdownVal: stockValue * 0.12 };
    const snap = [0,1,2,3].map(() => Math.round(stockValue * (0.85 + rng() * 0.3)));
    const snapPrior = snap.map(v => Math.round(v * (0.92 + rng() * 0.12)));
    return { ent, period, stockValue, stockToSales, turn, aged, matrix, categories: _CATEGORIES, seasons: _SEASONS,
             stockout, markdown, movement, snap, snapPrior, q: ['Q1','Q2','Q3','Q4'] };
  }
  const _CAMPAIGNS = {
    bbuk:    ['Tennis Heritage Reborn','Wimbledon Pop-up','Designer Collab','UK Influencers'],
    sugifr:  ['Roland-Garros Edit','Paris Flagship','Riviera Capsule','FR Creators'],
    sugifw:  ['Italian Court Series','Milan Design Week','Footwear Drop','IG Reels Push'],
    benjamin:['Bundesliga Active','Berlin Pop-up','Alpine Capsule','DE Creators'],
    bds:     ['Benelux Launch','Amsterdam Pop-up','Outlet Drive','Micro-Creators'],
    total:   ['Tennis Heritage Reborn','Roland-Garros Edit','Italian Court Series','Bundesliga Active','Benelux Launch'],
  };
  function _marketingFor(entId, period) {
    const ent = _byId(entId);
    const rng = _mulberry32(_seedFrom(entId + 'mkt' + period));
    const sales = _salesFor(entId, period);
    const spend = sales.netSales * 0.04;
    const spendPlan = sales.plan * 0.042;
    const roi = 2.6 + rng() * 2.2;
    const reach = Math.round((ent.aggregate ? 18 : 3 + rng() * 4) * 1e6);
    const violations = Math.round(rng() * 4);
    const camps = (_CAMPAIGNS[entId] || _CAMPAIGNS.total).map(name => {
      const cs = spend * (0.12 + rng() * 0.25);
      return { name, spend: cs, roi: 1.8 + rng() * 3.4 };
    });
    const channelMix = [
      { label:'Instagram', val: 26+Math.round(rng()*8) },
      { label:'TikTok',    val: 20+Math.round(rng()*8) },
      { label:'X',         val: 8+Math.round(rng()*5) },
      { label:'OOH',       val: 14+Math.round(rng()*6) },
      { label:'Print',     val: 8+Math.round(rng()*4) },
      { label:'Event',     val: 12+Math.round(rng()*6) },
    ];
    function sns(goal, pace) {
      const planC = [], actC = []; let p = 0, a = 0;
      for (let m = 0; m < 12; m++) {
        p += goal / 12;
        const step = (goal / 12) * (pace * (0.85 + rng() * 0.3));
        a += step;
        planC.push(Math.round(p));
        actC.push(m <= _ACTUAL_THRU ? Math.round(a) : null);
      }
      return { goal, plan: planC, actual: actC };
    }
    const mult = ent.aggregate ? 5 : 1;
    const snsData = {
      Instagram: sns(30000 * mult, 0.82),
      TikTok:    sns(22000 * mult, 1.05),
      X:         sns(12000 * mult, 0.7),
    };
    return { ent, period, spend, spendPlan, roi, reach, violations, camps, channelMix, sns: snsData, months: _MONTHS,
             spendQ: { q: ['Q1','Q2','Q3','Q4'], actual: sales.quarterly.actual.map(v => Math.round(v * 0.04)), plan: sales.quarterly.plan.map(v => Math.round(v * 0.042)) } };
  }
  function _actionItems() {
    return [
      { id:'bds',     sev:'urgent', headline:'Below contract minimum — intervention needed', items:[
        { ic:'red',   txt:'Q2 Sales Statement overdue', due:'D-2' },
        { ic:'red',   txt:'Cumulative min at 32% — recovery plan required', due:'D-9' },
        { ic:'amber', txt:'Brand compliance: 4 violations to clear', due:'D-15' }, ] },
      { id:'sugifw',  sev:'urgent', headline:'Brand Elevation review approaching', items:[
        { ic:'amber', txt:'SS26 design re-submission (3 CADs)', due:'D-4' },
        { ic:'amber', txt:'Stock-to-sales above 4.0 — markdown review', due:'D-12' },
        { ic:'blue',  txt:'Contract Brand Elevation checkpoint', due:'D-90' }, ] },
      { id:'bbuk',    sev:'warn',   headline:'Renewal window open — strong performer', items:[
        { ic:'blue',  txt:'Season Plan (3-B Distribution) submit', due:'D-12' },
        { ic:'blue',  txt:'Renewal term sheet review', due:'D-30' },
        { ic:'green', txt:'Q1 royalty settled — no action', due:'—' }, ] },
      { id:'benjamin',sev:'warn',   headline:'5+5 extension request under review', items:[
        { ic:'blue',  txt:'Extension request — HQ decision', due:'D-21' },
        { ic:'blue',  txt:'FW26 marketing plan review', due:'D-34' }, ] },
      { id:'sugifr',  sev:'ok',     headline:'On track across all domains', items:[
        { ic:'green', txt:'All submissions current', due:'—' },
        { ic:'blue',  txt:'Roland-Garros campaign report due', due:'D-40' }, ] },
    ];
  }
  const RefData = {
    ENTITIES: _ENTITIES, LICENSEES: _LICENSEES, MONTHS: _MONTHS,
    byId: _byId, money: _money, compact: _compact, toEUR: _toEUR,
    salesFor: _salesFor, breakdown: _breakdown,
    distributionFor: _distributionFor, inventoryFor: _inventoryFor, marketingFor: _marketingFor,
    actionItems: _actionItems,
    CATEGORIES: _CATEGORIES, CHANNELS: _CHANNELS, SEASONS: _SEASONS, COUNTRIES: _COUNTRIES,
  };
  global.STERefData = RefData;
  const PERIOD_LABEL = { ytd:'YTD 2026', q1:'Q1 2026', q2:'Q2 2026', q3:'Q3 2026', q4:'Q4 2026' };
  const PERIODS = [['ytd','YTD'],['q1','Q1'],['q2','Q2'],['q3','Q3'],['q4','Q4']];
  function getRefPeriod() {
    const p = (STE.getSession() || {}).analyticsPeriod;
    return PERIOD_LABEL[p] ? p : 'ytd';
  }
  function setRefPeriod(p) {
    if (!PERIOD_LABEL[p]) return;
    STE.setSession({ ...(STE.getSession() || {}), analyticsPeriod: p });
  }
  function getRefEnt() {
    const e = (STE.getSession() || {}).analyticsEnt;
    return _ENTITIES.find(x => x.id === e) ? e : 'total';
  }
  function setRefEnt(id) {
    if (!_ENTITIES.find(x => x.id === id)) return;
    STE.setSession({ ...(STE.getSession() || {}), analyticsEnt: id });
  }
  // Map a RefData entity to the live state.licensees row so the admin-edited
  // legalName surfaces everywhere in analytics (filter dropdown, hero cards,
  // KPI tooltips, action-required boxes, page subtitles). Resolved at render
  // time — a rename in /admin/licensees flows through immediately.
  const _REF_ENT_TO_LIC_ID = { bbuk:'lic_75f7462d', sugifr:'lic_c2a5c666', sugifw:'lic_000025e9', benjamin:'lic_b56a4e2c', bds:'lic_05056c4c' };
  function entDisplayName(eOrId) {
    const e = typeof eOrId === 'string' ? _byId(eOrId) : eOrId;
    if (!e) return '';
    if (e.aggregate) return 'Portfolio (5 licensees)';
    const lics = (window.STE && STE.get && (STE.get().licensees || [])) || [];
    const matchId = _REF_ENT_TO_LIC_ID[e.id];
    const match = matchId && lics.find(l => l.id === matchId);
    return (match && (match.legalName || match.name)) || e.name;
  }
  function entDisplayCode(eOrId) {
    const e = typeof eOrId === 'string' ? _byId(eOrId) : eOrId;
    if (!e) return '';
    if (e.aggregate) return e.code;
    // Some seed legalName values double as the short code (e.g. "BBUK",
    // "SUGI FRANCE"). When the admin-resolved name is short, show it;
    // otherwise fall back to the original code.
    const nm = entDisplayName(e);
    if (nm && nm.length <= 24) return nm;
    return e.code;
  }

  // ============================ WIDGET REGISTRY ============================
  // Every chart/section the user can show/hide. Order = default render order.
  const WIDGETS = [
    { key: "kpis",               title: "Headline KPIs",                size: "full" },
    { key: "salesYtdLine",       title: "Net Sales · YTD Cumulative",   size: "full" },
    { key: "salesQuarterlyBars", title: "Net Sales · Quarterly",        size: "wide" },
    { key: "categoryDonut",      title: "Category Mix",                 size: "half" },
    { key: "trend",              title: "Quarterly Sales & Royalty",    size: "wide" },
    { key: "regional",           title: "Regional Mix",                 size: "half" },
    { key: "distCountryBars",    title: "Country Distribution",         size: "wide" },
    { key: "distDoorsLine",      title: "Active Doors · YTD",           size: "half" },
    { key: "inventoryHeatmap",   title: "Inventory · Category × Season", size: "wide" },
    { key: "inventorySnapshot",  title: "Stock Snapshot · YoY",         size: "half" },
    { key: "marketingMixDonut",  title: "Marketing · Channel Mix",      size: "half" },
    { key: "marketingSpendBars", title: "Marketing · Spend Pacing",     size: "half" },
    { key: "marketingSnsRow",    title: "SNS · Plan vs Actual",         size: "full" },
    { key: "royaltyVsMG",        title: "Royalty vs Annual Minimum",    size: "half" },
    { key: "categories",         title: "Top Categories",               size: "half" },
    { key: "designPass",         title: "Design Pass Rate",             size: "half" },
    { key: "samples",            title: "Sample Review Throughput",     size: "half" },
    { key: "table",              title: "Licensee Performance Table",   size: "full" },
  ];

  const DATE_PRESETS = [
    { key: "4q",  label: "Last 4 quarters" },
    { key: "1y",  label: "Last year" },
    { key: "2y",  label: "Last 2 years" },
    { key: "all", label: "All time" },
  ];

  function ensureSection() {
    let sec = document.querySelector('section[data-page="analytics"]');
    if (!sec) {
      sec = document.createElement("section");
      sec.setAttribute("data-page", "analytics");
      sec.hidden = true;
      document.body.appendChild(sec);
    }
    return sec;
  }

  function getLayout() {
    const s = (STE.getSession() || {}).analyticsLayout || {};
    const layout = {};
    WIDGETS.forEach(w => { layout[w.key] = s[w.key] !== false; }); // default visible
    return layout;
  }
  function setLayout(patch) {
    const session = STE.getSession() || {};
    STE.setSession({ ...session, analyticsLayout: { ...getLayout(), ...patch } });
  }
  function getDateRange() {
    const s = (STE.getSession() || {}).analyticsDateRange;
    return s || { preset: "all" };
  }
  function setDateRange(r) {
    const session = STE.getSession() || {};
    STE.setSession({ ...session, analyticsDateRange: r });
  }
  // Licensee-scope filter. HQ can switch between "All licensees" and a
  // specific one; licensee users are auto-pinned to their own licenseeId
  // (the dropdown isn't shown to them).
  function getLicScope() {
    return (STE.getSession() || {}).analyticsLicScope || "";
  }
  function setLicScope(id) {
    const session = STE.getSession() || {};
    STE.setSession({ ...session, analyticsLicScope: id || "" });
  }
  function getCustomizeMode() {
    return !!(STE.getSession() || {}).analyticsCustomize;
  }
  function setCustomizeMode(on) {
    const session = STE.getSession() || {};
    STE.setSession({ ...session, analyticsCustomize: on });
  }

  // Headline KPI tiles inside the kpis widget. Each user can hide individual
  // tiles in customize mode the same way they hide whole widgets.
  const KPIS = [
    { key: "totalSales",       title: "Total Net Sales" },
    { key: "totalRoyalty",     title: "Total Royalty" },
    { key: "effRoyalty",       title: "Effective Royalty %" },
    { key: "stmtsCount",       title: "Statements in Range" },
    { key: "avgCompliance",    title: "Avg Compliance", hqOnly: true },
    { key: "designPass",       title: "Design Pass Rate" },
    { key: "designsInReview",  title: "Designs in HQ Review" },
    { key: "avgRounds",        title: "Sample Avg Rounds" },
  ];
  function getKpiLayout() {
    const s = (STE.getSession() || {}).analyticsKpiLayout || {};
    const layout = {};
    KPIS.forEach(k => { layout[k.key] = s[k.key] !== false; });
    return layout;
  }
  function setKpiLayout(patch) {
    const session = STE.getSession() || {};
    STE.setSession({ ...session, analyticsKpiLayout: { ...getKpiLayout(), ...patch } });
  }

  // Quarter math
  function quarterOrder(q) {
    const m = String(q || "").match(/^Q(\d)\s+(\d{4})$/);
    return m ? parseInt(m[2]) * 10 + parseInt(m[1]) : 0;
  }
  function quartersInRange(allQuarters, range) {
    const sorted = allQuarters.slice().sort((a,b) => quarterOrder(a) - quarterOrder(b));
    if (!sorted.length) return [];
    if (range.preset === "all") return sorted;
    if (range.preset === "4q") return sorted.slice(-4);
    if (range.preset === "1y") return sorted.slice(-4);
    if (range.preset === "2y") return sorted.slice(-8);
    if (range.preset === "custom" && range.from && range.to) {
      const fromO = quarterOrder(range.from);
      const toO = quarterOrder(range.to);
      return sorted.filter(q => {
        const o = quarterOrder(q);
        return o >= fromO && o <= toO;
      });
    }
    return sorted;
  }

  function analytics() {
    const sec = ensureSection();
    const u = STE.currentUser();
    if (!u) { location.hash = "#/login"; return; }
    const isHQ = STE.isHQ(u);
    document.querySelectorAll("section[data-page]").forEach(s => { s.hidden = s.dataset.page !== "analytics"; });
    sec.hidden = false;

    // Lazy-seed the design + sample stores so analytics has data on first
    // visit even if the user hasn't opened Design Review or Sample Review
    // yet (they're seeded on-demand in those screens).
    try { window.STEDesign && window.STEDesign.ensureMirrorSeed && window.STEDesign.ensureMirrorSeed(); } catch (_) {}
    try { window.STEDesign && window.STEDesign.ensureSeed && window.STEDesign.ensureSeed(); } catch (_) {}

    const state = STE.get();
    const lics = state.licensees || [];
    const allStmts = state.salesStatements || [];
    const designs = state.designs || [];
    const samples = state.sampleRecords || [];

    // -------- Reference-model scope/period (RefData) --------
    // Analytics is now driven by the Licensor-Console-shaped data model:
    // an entity selector (5 licensees + portfolio total) and a period
    // segmented control (YTD / Q1..Q4). State-derived metrics below still
    // run so existing widgets that read scopedDesigns / scopedSamples
    // stay populated, but every domain tab reads from RefData first.
    const refPeriod = getRefPeriod();
    const refEnt    = isHQ ? getRefEnt() : 'total';
    const refSales  = RefData.salesFor(refEnt, refPeriod);
    const refEntity = RefData.byId(refEnt);

    // Legacy scope still drives the state-derived metrics. HQ entity 'total'
    // → no scope filter; specific entity ids map to their matching seed
    // licensee where one exists.
    const _refToLicId = { bbuk: 'lic_75f7462d', sugifr: 'lic_c2a5c666', sugifw: 'lic_000025e9', benjamin: 'lic_b56a4e2c', bds: 'lic_05056c4c' };
    const refEntDisplayName = (e) => entDisplayName(e);
    const scope = isHQ ? (refEnt === 'total' ? '' : (_refToLicId[refEnt] || '')) : (u.licenseeId || "");
    const inScope = (lid) => !scope || lid === scope;

    // -------- Date range filtering (legacy widgets) --------
    const allQuarters = [...new Set(allStmts.map(s => s.quarter))];
    const range = getDateRange();
    const activeQuarters = new Set(quartersInRange(allQuarters, range));
    const stmts = allStmts.filter(s => activeQuarters.has(s.quarter) && inScope(s.licenseeId));
    // Apply the same scope to designs + samples + licensees so the entire
    // page reads as one filtered slice when HQ picks a specific licensee.
    const scopedLics    = lics.filter(l => inScope(l.id));
    const scopedDesigns = designs.filter(d => inScope(d.licenseeId));
    const scopedSamples = samples.filter(r => inScope(r.licenseeId));

    // ============================ AGGREGATES ============================
    const totalSales = stmts.reduce((s, x) => s + (x.totalSalesGbp || 0), 0);
    const totalRoyalty = stmts.reduce((s, x) => s + (x.royaltyGbp || 0), 0);
    const avgCompliance = scopedLics.length ? Math.round(scopedLics.reduce((s, l) => s + (l.compliance || 0), 0) / scopedLics.length) : 0;
    const designsInReview = scopedDesigns.filter(d => d.stage === "HQ Review").length;
    const designsApproved = scopedDesigns.filter(d => d.stage === "Production Cleared" || d.stage === "Sample Inspection").length;
    const designTotal = scopedDesigns.length;
    const designPassRate = designTotal ? Math.round((designsApproved / designTotal) * 100) : 0;
    const regions = [...new Set(scopedLics.map(l => l.country))];

    const quarters = [...new Set(stmts.map(s => s.quarter))].sort((a,b) => quarterOrder(a) - quarterOrder(b));
    const perQuarter = quarters.map(q => {
      const qs = stmts.filter(s => s.quarter === q);
      return {
        quarter: q,
        sales: qs.reduce((s, x) => s + (x.totalSalesGbp || 0), 0),
        royalty: qs.reduce((s, x) => s + (x.royaltyGbp || 0), 0),
        count: qs.length,
      };
    });
    const latestQuarter = perQuarter[perQuarter.length - 1];

    const regionMap = {};
    stmts.forEach(s => {
      const lic = lics.find(l => l.id === s.licenseeId);
      if (!lic) return;
      regionMap[lic.country] = (regionMap[lic.country] || 0) + (s.totalSalesGbp || 0);
    });
    let regionRows = Object.entries(regionMap).map(([r, v]) => ({ region: r, sales: v }))
      .sort((a, b) => b.sales - a.sales);
    // Fall back to the RefData country breakdown when state has only one
    // country (or none) — a one-slice donut reads as broken, and the
    // RefData model is the canonical source for the licensor console.
    if (regionRows.length <= 1) {
      regionRows = RefData.breakdown(refEnt, refPeriod, 'country')
        .map(it => ({ region: it.label, sales: it.value }));
    }

    const catMap = {};
    stmts.forEach(s => {
      (s.lineItems || []).forEach(li => {
        catMap[li.category] = (catMap[li.category] || 0) + (li.netAmount || 0);
      });
    });
    const catRows = Object.entries(catMap).map(([c, v]) => ({ category: c, sales: v }))
      .sort((a, b) => b.sales - a.sales).slice(0, 6);

    let royaltyVsMG = scopedLics.map(l => {
      const ls = stmts.filter(s => s.licenseeId === l.id);
      const totalRoy = ls.reduce((s, x) => s + (x.royaltyGbp || 0), 0);
      const minAnnual = l.minAnnualGbp || (l.minAnnualEur ? Math.round(l.minAnnualEur * 0.84) : 0);
      const pct = minAnnual > 0 ? Math.round((totalRoy / minAnnual) * 100) : 0;
      return { id: l.id, name: l.legalName || l.id, region: l.country, royalty: totalRoy, min: minAnnual, pct };
    }).sort((a, b) => b.pct - a.pct);
    // Fall back to RefData's annual contract minimum (40% of the licensee's
    // annual target × 10% royalty rate) when state has no min-guarantee data
    // so the Royalty vs Minimum widget never empty-states.
    if (!royaltyVsMG.some(r => r.min > 0)) {
      royaltyVsMG = RefData.LICENSEES.map(e => {
        const sd = RefData.salesFor(e.id, 'ytd');
        const minAnnual = e.annual * 0.40 * 0.10;
        const royalty = sd.royalty;
        const pct = minAnnual > 0 ? Math.round((royalty / minAnnual) * 100) : 0;
        return { id: e.id, name: entDisplayName(e), region: e.region, royalty, min: minAnnual, pct };
      }).sort((a, b) => b.pct - a.pct);
    }

    const perLic = scopedLics.map(l => {
      const ls = stmts.filter(s => s.licenseeId === l.id);
      const ld = scopedDesigns.filter(d => d.licenseeId === l.id);
      const ldReview = ld.filter(d => d.stage === "HQ Review").length;
      const lsSales = ls.reduce((s, x) => s + (x.totalSalesGbp || 0), 0);
      const lsRoyalty = ls.reduce((s, x) => s + (x.royaltyGbp || 0), 0);
      const latest = ls.slice().sort((a,b) => (b.submittedAt||"").localeCompare(a.submittedAt||""))[0];
      return { l, lsSales, lsRoyalty, latest, ldReview, designPassRate: l.designPassRate || 0 };
    }).sort((a, b) => b.lsSales - a.lsSales);

    const samplesApproved = scopedSamples.filter(r => r.lastResult === "APPROVED").length;
    const samplesInProgress = scopedSamples.filter(r => r.lastResult !== "APPROVED").length;
    const samplesRemade = scopedSamples.filter(r => r.type === "REMADE").length;
    const totalRounds = scopedSamples.reduce((s, r) => s + (r.rounds || 0), 0);
    const avgRounds = scopedSamples.length ? (totalRounds / scopedSamples.length).toFixed(1) : "—";

    // ============================ TAB NAV ============================
    // Five-domain analytics shell, fitted into our brand. Portfolio is the
    // existing overview; the four domain tabs surface per-domain KPIs with
    // values derived deterministically from the licensee scope + period so
    // the demo reads as coherent without needing a separate data feed.
    const ANALYTICS_TABS = [
      { id: "portfolio",    label: "Portfolio Overview" },
      { id: "sales",        label: "Sales & Royalty" },
      { id: "distribution", label: "Distribution" },
      { id: "inventory",    label: "Inventory" },
      { id: "marketing",    label: "Marketing" },
    ];
    const activeTab = (function () {
      const t = (STE.getSession() || {}).analyticsTab;
      return ANALYTICS_TABS.some(x => x.id === t) ? t : "portfolio";
    })();

    // Deterministic domain metric generator — hashed off (scope, range key) so
    // values stay stable across reloads and match the licensee filter. Numbers
    // anchor to real sales totals where possible. _hash/_rng live at module
    // scope (outside this function) so chart helpers can share them.
    function domainMetrics(scope, range, totalSales) {
      const seed = (scope || "all") + "|" + (range.preset || "ytd") + "|" + (range.from || "") + "|" + (range.to || "");
      const rng = _rng(seed);
      const sales = totalSales || 0;
      // Sales & Royalty — plan / prior baselines so deltas read consistently
      const plan = Math.round(sales / (0.85 + rng() * 0.25));
      const prior = Math.round(sales * (0.85 + rng() * 0.2));
      const minPeriod = Math.round(plan * 0.78);
      const vsPlan = plan ? +((sales / plan - 1) * 100).toFixed(1) : 0;
      const vsYoY = prior ? +((sales / prior - 1) * 100).toFixed(1) : 0;
      const vsMin = minPeriod ? +((sales / minPeriod) * 100).toFixed(0) : 0;
      const royalty = Math.round(sales * 0.10);
      // Distribution
      const activeDoors = 60 + Math.floor(rng() * 380);
      const newDoors = Math.floor(rng() * 18) + 1;
      const closingDoors = Math.floor(rng() * 12);
      const revPerDoor = activeDoors > 0 ? Math.round(sales / activeDoors) : 0;
      const top5Conc = 28 + Math.floor(rng() * 28);
      const tiers = [
        { tier: "Tier 1", existing: 8 + Math.floor(rng() * 14), nw: Math.floor(rng() * 4), closing: Math.floor(rng() * 2) },
        { tier: "Tier 2", existing: 18 + Math.floor(rng() * 30), nw: Math.floor(rng() * 8), closing: Math.floor(rng() * 4) },
        { tier: "Tier 3", existing: 40 + Math.floor(rng() * 80), nw: Math.floor(rng() * 10), closing: Math.floor(rng() * 6) },
      ];
      const channelMix = [
        { label: "Department Store", share: 30 + Math.floor(rng() * 20) },
        { label: "Specialty", share: 18 + Math.floor(rng() * 16) },
        { label: "Outlet", share: 6 + Math.floor(rng() * 10) },
      ];
      const chSum = channelMix.reduce((s, c) => s + c.share, 0);
      channelMix.forEach(c => { c.share = Math.round(c.share / chSum * 100); });
      // Inventory
      const stockValue = Math.round(sales * (0.38 + rng() * 0.18));
      const stockToSales = +(2.4 + rng() * 2.4).toFixed(1);
      const turn = +(2.5 + rng() * 2).toFixed(1);
      const aged = Math.floor(8 + rng() * 22);
      const stockout = Math.floor(rng() * 14);
      const markdown = Math.floor(rng() * 28);
      // Marketing
      const spend = Math.round(sales * 0.04);
      const spendPlan = Math.round(sales * 0.045);
      const roi = +(2 + rng() * 3).toFixed(1);
      const reach = 80000 + Math.floor(rng() * 9000000);
      const violations = Math.floor(rng() * 5);
      const sns = [
        { platform: "Instagram", followers: 12000 + Math.floor(rng() * 80000), goal: 100000 + Math.floor(rng() * 80000) },
        { platform: "TikTok",    followers:  8000 + Math.floor(rng() * 60000), goal:  90000 + Math.floor(rng() * 60000) },
        { platform: "X",         followers:  4000 + Math.floor(rng() * 22000), goal:  30000 + Math.floor(rng() * 20000) },
      ];
      const campaigns = ["Spring Court Edit","Tennis Heritage Drop","Wellness Week","Court-to-Social Lookbook","Summer Capsule"].map((name, i) => ({
        name, spend: Math.round(spend / 5 * (0.6 + rng())),
        roi: +(1.4 + rng() * 3.2).toFixed(1),
      }));
      return { sales, plan, prior, minPeriod, vsPlan, vsYoY, vsMin, royalty,
        activeDoors, newDoors, closingDoors, revPerDoor, top5Conc, tiers, channelMix,
        stockValue, stockToSales, turn, aged, stockout, markdown,
        spend, spendPlan, roi, reach, violations, sns, campaigns };
    }
    // dm starts from the legacy state-derived metrics, then we overwrite the
    // canonical numbers with RefData values keyed off (refEnt, refPeriod) so
    // every widget on Portfolio Overview reacts when the user flips the
    // YTD / Q1..Q4 segmented control.
    const _legacyDm = domainMetrics(scope, range, totalSales);
    const _refSalesDm = RefData.salesFor(refEnt, refPeriod);
    const _refDistDm  = RefData.distributionFor(refEnt, refPeriod);
    const _refInvDm   = RefData.inventoryFor(refEnt, refPeriod);
    const _refMktDm   = RefData.marketingFor(refEnt, refPeriod);
    const dm = Object.assign({}, _legacyDm, {
      sales: _refSalesDm.netSales,
      plan: _refSalesDm.plan,
      prior: _refSalesDm.prior,
      vsPlan: +_refSalesDm.vsPlan.toFixed(1),
      vsYoY:  +_refSalesDm.vsYoY.toFixed(1),
      vsMin:  +_refSalesDm.vsMin.toFixed(0),
      minPeriod: _refSalesDm.minForPeriod,
      royalty: _refSalesDm.royalty,
      activeDoors: _refDistDm.active,
      newDoors:    _refDistDm.newD,
      closingDoors:_refDistDm.closeD,
      revPerDoor:  _refDistDm.revPerDoor,
      top5Conc:    _refDistDm.top5,
      tiers:       _refDistDm.tiers,
      channelMix:  _refDistDm.channels,
      stockValue:  _refInvDm.stockValue,
      stockToSales:+_refInvDm.stockToSales.toFixed(1),
      turn:        +_refInvDm.turn.toFixed(1),
      aged:        _refInvDm.aged,
      stockout:    _refInvDm.stockout,
      markdown:    _refInvDm.markdown,
      spend:       _refMktDm.spend,
      spendPlan:   _refMktDm.spendPlan,
      roi:         +_refMktDm.roi.toFixed(1),
      reach:       _refMktDm.reach,
      violations:  _refMktDm.violations,
      sns: ['Instagram','TikTok','X'].map(p => {
        const s = _refMktDm.sns[p];
        const cur = (s.actual || []).filter(v => v != null).slice(-1)[0] || 0;
        return { platform: p, followers: cur, goal: s.goal };
      }),
      campaigns: _refMktDm.camps.map(c => ({ name: c.name, spend: c.spend, roi: +c.roi.toFixed(1) })),
    });
    // Override the state-derived totalSales used by the legacy widgets so the
    // Net Sales monthly + quarterly series re-derive against RefData totals.
    const _refTotalSales = _refSalesDm.netSales;

    // ============================ RENDER ============================
    const layout = getLayout();
    const customize = getCustomizeMode();
    const lic = STE.currentLicensee();

    // Pre-compute chart data for the new widgets so each renderer is a quick
    // closure over already-shaped data rather than recomputing every time.
    const _portfolioSeed = "portfolio:" + (refEnt || "all") + ":" + refPeriod;
    // Net Sales monthly + quarterly trend cards use the RefData canonical
    // series so the chart reacts to the period filter.
    const _moTrend = {
      months: _refSalesDm.monthly.months,
      actual: _refSalesDm.monthly.actual,
      plan:   _refSalesDm.monthly.plan,
      prior:  _refSalesDm.monthly.prior,
    };
    const _qtrTrend = {
      q:      _refSalesDm.quarterly.q,
      actual: _refSalesDm.quarterly.actual,
      plan:   _refSalesDm.quarterly.plan,
      prior:  _refSalesDm.quarterly.prior,
    };
    // Category mix donut on Portfolio Overview — prefer the state-derived
    // statements when they exist; otherwise fall back to the RefData
    // breakdown so the donut isn't empty for licensees without statements.
    let _topCats = (catRows || []).slice(0, 6).map(r => ({ label: r.category || "—", value: r.sales }));
    if (!_topCats.length || _topCats.every(c => !c.value)) {
      _topCats = RefData.breakdown(refEnt, refPeriod, 'category')
        .map(it => ({ label: it.label, value: it.value }));
    }
    // Inventory + Marketing + Doors widgets — source from RefData so the
    // YTD/Q1..Q4 period filter drives every widget on Portfolio Overview.
    const _invCats    = RefData.CATEGORIES;
    const _invSeasons = RefData.SEASONS;
    const _invMatrix  = _refInvDm.matrix;
    const _invSnapQ   = _refInvDm.q;
    const _invSnap    = _refInvDm.snap;
    const _invSnapPrior = _refInvDm.snapPrior;
    const _mktChannelMix = _refMktDm.channelMix.map(c => ({ label: c.label, value: c.val }));
    const _mktSpendQ  = { q: _refMktDm.spendQ.q, actual: _refMktDm.spendQ.actual, plan: _refMktDm.spendQ.plan, prior: _refMktDm.spendQ.plan };
    const _doorMonths = _refDistDm.months;
    const _doorCum    = _refDistDm.doorCum;
    const _countryBars = (_refDistDm.countries || []).slice(0, 6).map((c, i) => ({
      label: c,
      value: Math.round((_refDistDm.active || 100) / Math.max(1, _refDistDm.countries.length) * (0.85 + (i * 0.07))),
    }));

    const widgetBodies = {
      kpis: () => renderKpiTiles({
        totalSales, totalRoyalty, avgCompliance, isHQ,
        designsInReview, designPassRate, avgRounds, regions, latestQuarter, stmtsCount: stmts.length,
        customize, kpiLayout: getKpiLayout(),
      }),
      salesYtdLine: () => chartLine({
        labels: _moTrend.months,
        series: [
          { label: "Actual",     data: _moTrend.actual, color: "#2a3244", dashed: false },
          { label: "Plan",       data: _moTrend.plan,   color: "#6a829a", dashed: true },
          { label: "Prior Year", data: _moTrend.prior,  color: "#b8c8d4", dashed: false },
        ],
        yFormat: svgMoneyShort, height: 280,
      }),
      salesQuarterlyBars: () => chartGroupedBars({
        labels: _qtrTrend.q,
        series: [
          { label: "Actual",     data: _qtrTrend.actual, color: "#2a3244" },
          { label: "Plan",       data: _qtrTrend.plan,   color: "#9c6630" },
          { label: "Prior Year", data: _qtrTrend.prior,  color: "#b8c8d4" },
        ],
        yFormat: svgMoneyShort, height: 240,
      }),
      categoryDonut: () => chartDonut({
        slices: _topCats,
        centerLabel: gbpCompact(_topCats.reduce((s, x) => s + x.value, 0)),
        centerSub: "Top 6 categories",
      }),
      trend: () => `
        ${renderTrendChart(perQuarter)}
        <div class="ste-chart-legend">
          <span><i class="ste-swatch" style="background:var(--st-navy,#0b2c4a)"></i> Net Sales</span>
          <span><i class="ste-swatch" style="background:var(--ste-accent,#c98722)"></i> Royalty</span>
        </div>`,
      regional: () => renderDonutChart(regionRows),
      distCountryBars: () => chartHBars({
        items: _countryBars.length ? _countryBars : [{ label: "—", value: 0 }],
        valFormat: (v) => v + " doors",
      }),
      distDoorsLine: () => chartLine({
        labels: _doorMonths,
        series: [{ label: "Active doors", data: _doorCum, color: "#2a3244", dashed: false }],
        yFormat: (v) => Math.round(v).toLocaleString(),
        height: 220,
      }),
      inventoryHeatmap: () => chartHeatmap({
        rows: _invCats, cols: _invSeasons, values: _invMatrix, min: 0, max: 100, unit: "",
      }),
      inventorySnapshot: () => chartGroupedBars({
        labels: _invSnapQ,
        series: [
          { label: "This Year", data: _invSnap,      color: "#2a3244" },
          { label: "Prior",     data: _invSnapPrior, color: "#b8c8d4" },
        ],
        yFormat: svgMoneyShort, height: 220,
      }),
      marketingMixDonut: () => chartDonut({
        slices: _mktChannelMix,
        centerLabel: gbpCompact(dm.spend),
        centerSub: "Period spend",
      }),
      marketingSpendBars: () => chartGroupedBars({
        labels: _mktSpendQ.q,
        series: [
          { label: "Actual", data: _mktSpendQ.actual, color: "#8e3a4a" },
          { label: "Plan",   data: _mktSpendQ.plan,   color: "#b8c8d4" },
        ],
        yFormat: svgMoneyShort, height: 220,
      }),
      marketingSnsRow: () => {
        const snsList = dm.sns || [];
        const cards = snsList.map(s => {
          const rng = _rng(_portfolioSeed + ":sns:" + s.platform);
          const actual = [];
          let cur = Math.round(s.followers * 0.5);
          for (let i = 0; i < 12; i++) {
            cur = Math.min(s.followers, Math.round(cur + (s.followers - cur) * (0.05 + rng() * 0.18)));
            actual.push(cur);
          }
          const plan = _doorMonths.map((_, i) => Math.round((s.goal / 12) * (i + 1)));
          const pct = Math.min(100, Math.round((s.followers / s.goal) * 100));
          const color = s.platform === "Instagram" ? "#8e3a4a" : s.platform === "TikTok" ? "#2a3244" : "#6a829a";
          return `
            <div class="ste-analytics-kpi-tile">
              <div class="ste-mini"><strong>${esc(s.platform)}</strong></div>
              <div class="ste-analytics-kpi-val">${numCompact(s.followers)} <span class="ste-mini" style="font-weight:400">/ ${numCompact(s.goal)}</span></div>
              <div class="ste-mini">${pct}% to year-end goal</div>
              ${chartSparkline({ data: actual, plan, color, height: 56 })}
            </div>`;
        }).join("");
        return `<div class="ste-domain-grid">${cards}</div>`;
      },
      royaltyVsMG: () => renderRoyaltyVsMG(royaltyVsMG),
      categories: () => renderHorizontalBars(catRows, "category", "sales"),
      designPass: () => renderDesignPassChart(scopedLics),
      samples: () => renderSampleThroughput({
        approved: samplesApproved, inProgress: samplesInProgress,
        remade: samplesRemade, avgRounds, total: scopedSamples.length,
      }),
      table: () => renderLicTable(perLic),
    };

    const widgetSubs = {
      salesYtdLine: "Actual vs Plan vs Prior Year",
      salesQuarterlyBars: "Grouped Actual / Plan / Prior",
      categoryDonut: "Top 6 by net sales",
      trend: `Last ${perQuarter.length} quarter${perQuarter.length === 1 ? '' : 's'} · GBP`,
      regional: "Cumulative sales",
      distCountryBars: "Active doors by market",
      distDoorsLine: "Net door movement, month by month",
      inventoryHeatmap: "Stock-value index, 0–100",
      inventorySnapshot: "This year vs prior",
      marketingMixDonut: "Share of marketing spend",
      marketingSpendBars: "Quarterly Actual vs Plan",
      marketingSnsRow: "Monthly cumulative, sparkline + dashed plan",
      royaltyVsMG: "% of guarantee fulfilled",
      categories: "Net sales contribution",
      designPass: "Last 12 months",
      samples: "Across all submissions",
      table: `${perLic.length} licensees`,
    };

    const visible = WIDGETS.filter(w => layout[w.key]);
    const hidden = WIDGETS.filter(w => !layout[w.key]);

    document.title = "Analytics · Sergio Tacchini";

    sec.innerHTML = `
      <ste-shell active="analytics" breadcrumb="Analytics"
        user-name="${u.name}" user-role="${u.title || ''}" user-initials="${(u.name||'?').split(/\s+/).map(s=>s[0]).slice(0,2).join('').toUpperCase()}"
        licensee-code="${lic ? lic.id : 'HQ HQ'}" licensee-name="${lic ? lic.legalName : 'Global Admin View'}">
      <div class="ste-screen-pad">
        <div class="ste-section-hd">
          <div class="ste-page-crumbs"><a href="${isHQ ? '#/hq' : '#/home'}">Home</a><span class="sep">/</span><span class="cur">Analytics</span></div>
          <div class="ste-page-hd-row">
            <div>
              <h1>Analytics</h1>
            </div>
            <div class="ste-hd-cta">
              ${isHQ ? `
                <div class="ste-brief-select-wrap" style="min-width:220px">
                  <select class="ste-input ste-brief-select" data-analytics-ent>
                    ${RefData.ENTITIES.map(e => `<option value="${esc(e.id)}" ${refEnt===e.id?'selected':''}>${esc(refEntDisplayName(e))}</option>`).join("")}
                  </select>
                  <span class="ste-brief-select-chev" aria-hidden="true">▾</span>
                </div>` : ''}
              <div class="ste-brief-select-wrap" style="min-width:118px" title="Season — query analytics by season">
                <select class="ste-input ste-brief-select" data-analytics-season aria-label="Season">
                  <option value="SS26" selected>SS26 · Spring/Summer 26</option>
                  <option value="FW25">FW25 · Fall/Winter 25</option>
                  <option value="SS25">SS25 · Spring/Summer 25</option>
                  <option value="FW24">FW24 · Fall/Winter 24</option>
                </select>
                <span class="ste-brief-select-chev" aria-hidden="true">▾</span>
              </div>
              <div class="ste-brief-select-wrap" style="min-width:92px" title="Year — query analytics by year">
                <select class="ste-input ste-brief-select" data-analytics-year aria-label="Year">
                  <option value="2026" selected>2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                </select>
                <span class="ste-brief-select-chev" aria-hidden="true">▾</span>
              </div>
              <div class="ste-analytics-period" data-analytics-period>
                ${PERIODS.map(([id, lbl]) => `<button type="button" class="ste-analytics-period-btn ${refPeriod===id?'active':''}" data-period="${id}">${esc(lbl)}</button>`).join("")}
              </div>
              <button class="ste-btn ${customize ? 'ste-btn-primary' : 'ste-btn-ghost'}" data-act="toggle-customize">
                ${customize ? 'Done' : 'Customize'}
              </button>
            </div>
          </div>
        </div>

        <div class="ste-analytics-tabs">
          ${ANALYTICS_TABS.map(t => `<button class="ste-analytics-tab ${t.id===activeTab?'active':''}" data-analytics-tab="${esc(t.id)}" type="button">${esc(t.label)}</button>`).join("")}
        </div>

        ${activeTab === 'portfolio' ? `
          ${renderRefHeroes(refEnt, refPeriod)}
          ${customize && hidden.length ? `
            <div class="ste-analytics-tray">
              <span class="ste-mini">Hidden widgets — click to add back</span>
              <div class="ste-analytics-tray-chips">
                ${hidden.map(w => `<button class="ste-analytics-tray-chip" data-show="${esc(w.key)}">＋ ${esc(w.title)}</button>`).join("")}
              </div>
            </div>` : ''}

          ${customize && !hidden.length ? `
            <div class="ste-analytics-tray ste-analytics-tray-empty">
              <span class="ste-mini">All widgets visible. Click ✕ on any card to hide it.</span>
            </div>` : ''}

          ${renderWidgetsGrid(visible, widgetBodies, widgetSubs, customize)}
        ` : ''}

        ${activeTab === 'sales'        ? renderRefSalesTab(refEnt, refPeriod) : ''}
        ${activeTab === 'distribution' ? renderRefDistributionTab(refEnt, refPeriod) : ''}
        ${activeTab === 'inventory'    ? renderRefInventoryTab(refEnt, refPeriod) : ''}
        ${activeTab === 'marketing'    ? renderRefMarketingTab(refEnt, refPeriod) : ''}
      </div>
      </ste-shell>`;

    // ============================ WIRING ============================
    wireCustomize(sec);
    // Period segmented control (YTD / Q1..Q4) — drives all RefData reads.
    sec.querySelectorAll("[data-analytics-period] [data-period]").forEach(btn => {
      btn.addEventListener("click", () => {
        setRefPeriod(btn.getAttribute("data-period"));
        analytics();
      });
    });
    // Entity selector (5 licensees + portfolio total)
    const entSel = sec.querySelector("[data-analytics-ent]");
    if (entSel) entSel.addEventListener("change", () => { setRefEnt(entSel.value); analytics(); });
    // A2 sub-nav / price band / breakdown dim
    sec.querySelectorAll("[data-a2view]").forEach(btn => btn.addEventListener("click", () => { setA2View(btn.getAttribute("data-a2view")); analytics(); }));
    sec.querySelectorAll("[data-a2channel]").forEach(btn => btn.addEventListener("click", () => { setA2Channel(btn.getAttribute("data-a2channel") || null); analytics(); }));
    sec.querySelectorAll("[data-a2dim]").forEach(btn => btn.addEventListener("click", () => { setA2Dim(btn.getAttribute("data-a2dim")); analytics(); }));
    // Data-source tooltip — minimal hover popover bound to any [data-tip]
    if (!sec._tipWired) {
      sec._tipWired = true;
      let tipEl = document.querySelector('.ste-analytics-tip');
      if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'ste-analytics-tip'; document.body.appendChild(tipEl); }
      function showTip(data, x, y) {
        const rows = (data.rows || []).map(r => `<div class="ste-analytics-tip-row"><span>${esc(r[0])}</span><b>${esc(r[1])}</b></div>`).join("");
        tipEl.innerHTML = `<div class="ste-analytics-tip-h">${esc(data.title || '')}</div>${rows}${data.src ? `<div class="ste-analytics-tip-src">${esc(data.src)}</div>` : ''}`;
        tipEl.classList.add('is-show');
        const r = tipEl.getBoundingClientRect();
        let left = x + 14, top = y + 14;
        if (left + r.width > window.innerWidth - 10) left = x - r.width - 14;
        if (top + r.height > window.innerHeight - 10) top = y - r.height - 14;
        tipEl.style.left = left + 'px'; tipEl.style.top = top + 'px';
      }
      function hideTip() { tipEl.classList.remove('is-show'); }
      document.addEventListener('mouseover', (e) => {
        const el = e.target.closest('[data-tip]');
        if (!el) return;
        try { showTip(JSON.parse(decodeURIComponent(el.getAttribute('data-tip'))), e.clientX, e.clientY); } catch (_) {}
      });
      document.addEventListener('mousemove', (e) => {
        if (!tipEl.classList.contains('is-show')) return;
        const el = e.target.closest('[data-tip]');
        if (el) { try { showTip(JSON.parse(decodeURIComponent(el.getAttribute('data-tip'))), e.clientX, e.clientY); } catch (_) {} }
      });
      document.addEventListener('mouseout', (e) => { if (e.target.closest('[data-tip]')) hideTip(); });
    }
    // Tab switcher — persists in session so navigating away and back keeps
    // the same tab selected.
    sec.querySelectorAll("[data-analytics-tab]").forEach(btn => {
      btn.addEventListener("click", () => {
        const t = btn.getAttribute("data-analytics-tab");
        STE.setSession({ ...(STE.getSession() || {}), analyticsTab: t });
        analytics();
      });
    });

    // Re-rendering replaced the ste-shell, which dropped the HQ brand mark
    // and the active-nav state. Repaint the chrome so the sidebar matches the
    // rest of the platform.
    if (window.STEApp && STEApp.repaintChrome) STEApp.repaintChrome();
  }

  // Module-scope deterministic RNG used by both domain metrics and chart
  // helpers. Same seed always returns the same sequence — keeps demos stable.
  function _hash(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
  function _rng(seed) { let a = _hash(String(seed)); return function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // ============================ SVG CHART HELPERS ============================
  // Lightweight, dependency-free chart primitives. Each returns an SVG string
  // sized to a viewBox so it scales fluidly inside its container card.
  //
  // chartLine — multi-series line chart with optional area fill on the first
  //   series. Used for cumulative YTD trends (Actual / Plan / Prior).
  // chartBars — grouped vertical bars (Actual / Plan / Prior per quarter).
  // chartDonut — single-series donut with center label and inline legend.
  // chartHBars — horizontal bars for category / country breakdowns.
  // chartSparkline — small inline line; used inside SNS cards.
  // chartHeatmap — 2D matrix; used for plan-attainment by category × country.

  function svgMoneyShort(n) {
    n = Math.round(n || 0);
    if (n >= 1e9) return "£" + (n / 1e9).toFixed(1) + "B";
    if (n >= 1e6) return "£" + (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return "£" + (n / 1e3).toFixed(0) + "k";
    return "£" + n.toLocaleString();
  }
  function svgNumShort(n) {
    n = Math.round(n || 0);
    if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(0) + "k";
    return n.toLocaleString();
  }

  function chartLine(opts) {
    const { width = 900, height = 280, padL = 50, padR = 20, padT = 18, padB = 28,
      labels = [], series = [], yFormat = svgMoneyShort, area = true } = opts;
    if (!labels.length || !series.length) {
      return `<div class="ste-mini" style="padding:24px;text-align:center">No data for the selected range.</div>`;
    }
    const innerW = width - padL - padR;
    const innerH = height - padT - padB;
    const allVals = series.flatMap(s => s.data.filter(v => v != null));
    const yMax = Math.max(...allVals, 1) * 1.1;
    const xStep = labels.length > 1 ? innerW / (labels.length - 1) : 0;
    const xAt = (i) => padL + i * xStep;
    const yAt = (v) => padT + innerH - (v / yMax) * innerH;
    const gridLines = 4;
    const grid = Array.from({ length: gridLines + 1 }, (_, i) => {
      const v = yMax * (1 - i / gridLines);
      const y = padT + (innerH * i) / gridLines;
      return `<line x1="${padL}" x2="${width - padR}" y1="${y}" y2="${y}" stroke="var(--st-rule)" stroke-width="1" stroke-dasharray="${i === gridLines ? '0' : '3,3'}"/>` +
             `<text x="${padL - 8}" y="${y + 4}" font-size="10" fill="var(--st-ink-muted)" text-anchor="end">${yFormat(v)}</text>`;
    }).join("");
    const xLabels = labels.map((l, i) =>
      `<text x="${xAt(i)}" y="${height - padB + 16}" font-size="11" fill="var(--st-ink-muted)" text-anchor="middle">${esc(String(l))}</text>`
    ).join("");
    const seriesSvg = series.map((s, si) => {
      const pts = s.data.map((v, i) => v == null ? null : [xAt(i), yAt(v)]).filter(Boolean);
      if (!pts.length) return "";
      const d = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
      const color = s.color || "var(--st-navy)";
      const dash = s.dashed ? "5,4" : "0";
      const strokeW = s.dashed ? 1.6 : 2.4;
      const areaPath = (area && si === 0)
        ? d + ` L${pts[pts.length - 1][0].toFixed(1)},${(padT + innerH).toFixed(1)} L${pts[0][0].toFixed(1)},${(padT + innerH).toFixed(1)} Z`
        : null;
      const dots = pts.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" fill="${color}" stroke="var(--ste-card)" stroke-width="1.5"/>`).join("");
      return (areaPath
        ? `<path d="${areaPath}" fill="${color}" fill-opacity="0.08" stroke="none"/>`
        : ""
      ) + `<path d="${d}" fill="none" stroke="${color}" stroke-width="${strokeW}" stroke-dasharray="${dash}" stroke-linecap="round" stroke-linejoin="round"/>${dots}`;
    }).join("");
    const legend = series.map(s =>
      `<span class="ste-chart-legend-item"><span class="ste-chart-legend-sw" style="background:${s.color || 'var(--st-navy)'};${s.dashed ? 'background:none;border-top:2px dashed ' + (s.color || 'var(--st-navy)') + ';height:2px;' : ''}"></span>${esc(s.label)}</span>`
    ).join("");
    return `
      <div class="ste-chart-svg-wrap">
        <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
          ${grid}${seriesSvg}${xLabels}
        </svg>
        <div class="ste-chart-legend-row">${legend}</div>
      </div>`;
  }

  function chartGroupedBars(opts) {
    const { width = 900, height = 280, padL = 50, padR = 20, padT = 18, padB = 28,
      labels = [], series = [], yFormat = svgMoneyShort } = opts;
    if (!labels.length || !series.length) {
      return `<div class="ste-mini" style="padding:24px;text-align:center">No data.</div>`;
    }
    const innerW = width - padL - padR;
    const innerH = height - padT - padB;
    const allVals = series.flatMap(s => s.data || []);
    const yMax = Math.max(...allVals, 1) * 1.1;
    const groupW = innerW / labels.length;
    const barCount = series.length;
    const barGap = 4;
    const barW = (groupW * 0.7 - barGap * (barCount - 1)) / barCount;
    const yAt = (v) => padT + innerH - (v / yMax) * innerH;
    const gridLines = 4;
    const grid = Array.from({ length: gridLines + 1 }, (_, i) => {
      const v = yMax * (1 - i / gridLines);
      const y = padT + (innerH * i) / gridLines;
      return `<line x1="${padL}" x2="${width - padR}" y1="${y}" y2="${y}" stroke="var(--st-rule)" stroke-width="1" stroke-dasharray="${i === gridLines ? '0' : '3,3'}"/>` +
             `<text x="${padL - 8}" y="${y + 4}" font-size="10" fill="var(--st-ink-muted)" text-anchor="end">${yFormat(v)}</text>`;
    }).join("");
    const bars = labels.map((l, i) => {
      const groupX = padL + groupW * i + (groupW * 0.15);
      return series.map((s, si) => {
        const v = s.data[i] || 0;
        const x = groupX + si * (barW + barGap);
        const y = yAt(v);
        const h = padT + innerH - y;
        const color = s.color || "var(--st-navy)";
        return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" fill="${color}" rx="2"/>`;
      }).join("");
    }).join("");
    const xLabels = labels.map((l, i) =>
      `<text x="${(padL + groupW * (i + 0.5)).toFixed(1)}" y="${height - padB + 16}" font-size="11" fill="var(--st-ink-muted)" text-anchor="middle">${esc(String(l))}</text>`
    ).join("");
    const legend = series.map(s =>
      `<span class="ste-chart-legend-item"><span class="ste-chart-legend-sw" style="background:${s.color || 'var(--st-navy)'}"></span>${esc(s.label)}</span>`
    ).join("");
    return `
      <div class="ste-chart-svg-wrap">
        <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
          ${grid}${bars}${xLabels}
        </svg>
        <div class="ste-chart-legend-row">${legend}</div>
      </div>`;
  }

  function chartDonut(opts) {
    const { size = 220, thickness = 38, slices = [], centerLabel = "", centerSub = "" } = opts;
    const total = slices.reduce((s, v) => s + (v.value || 0), 0) || 1;
    const r = size / 2 - 2;
    const ri = r - thickness;
    const cx = size / 2, cy = size / 2;
    let angle = -Math.PI / 2;
    const PALETTE = ["#2a3244", "#6a829a", "#8e3a4a", "#2f4a3a", "#9c6630", "#6b5443", "#b8c8d4", "#c9b98e"];
    const arcs = slices.map((s, i) => {
      const a0 = angle;
      const a1 = angle + (s.value / total) * Math.PI * 2;
      angle = a1;
      const large = (a1 - a0) > Math.PI ? 1 : 0;
      const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
      const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      const xi0 = cx + ri * Math.cos(a1), yi0 = cy + ri * Math.sin(a1);
      const xi1 = cx + ri * Math.cos(a0), yi1 = cy + ri * Math.sin(a0);
      const color = s.color || PALETTE[i % PALETTE.length];
      return `<path d="M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)} L${xi0.toFixed(2)},${yi0.toFixed(2)} A${ri},${ri} 0 ${large} 0 ${xi1.toFixed(2)},${yi1.toFixed(2)} Z" fill="${color}"/>`;
    }).join("");
    const legend = slices.map((s, i) =>
      `<span class="ste-chart-legend-item"><span class="ste-chart-legend-sw" style="background:${s.color || PALETTE[i % PALETTE.length]}"></span>${esc(s.label)} <strong>${((s.value/total)*100).toFixed(0)}%</strong></span>`
    ).join("");
    return `
      <div class="ste-chart-donut-wrap">
        <svg viewBox="0 0 ${size} ${size}" preserveAspectRatio="xMidYMid meet" style="width:${size}px;height:${size}px;max-width:100%">
          ${arcs}
          <text x="${cx}" y="${cy - 2}" font-size="20" font-weight="700" fill="var(--st-ink)" text-anchor="middle">${esc(centerLabel)}</text>
          ${centerSub ? `<text x="${cx}" y="${cy + 16}" font-size="10" fill="var(--st-ink-muted)" text-anchor="middle">${esc(centerSub)}</text>` : ''}
        </svg>
        <div class="ste-chart-donut-legend">${legend}</div>
      </div>`;
  }

  function chartHBars(opts) {
    const { items = [], width = 700, barH = 22, labelW = 140, valFormat = svgMoneyShort } = opts;
    const max = Math.max(...items.map(it => it.value || 0), 1);
    const innerW = width - labelW - 80;
    const height = items.length * (barH + 6) + 10;
    const rows = items.map((it, i) => {
      const y = i * (barH + 6) + 4;
      const w = Math.max(1, (it.value / max) * innerW);
      return `
        <text x="0" y="${y + barH * 0.7}" font-size="12" fill="var(--st-ink)" font-weight="500">${esc(it.label)}</text>
        <rect x="${labelW}" y="${y}" width="${innerW}" height="${barH}" fill="var(--ste-bg)" rx="3"/>
        <rect x="${labelW}" y="${y}" width="${w}" height="${barH}" fill="var(--st-navy)" rx="3"/>
        <text x="${labelW + w + 8}" y="${y + barH * 0.7}" font-size="11" fill="var(--st-ink-muted)">${valFormat(it.value)}</text>`;
    }).join("");
    return `
      <div class="ste-chart-svg-wrap">
        <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">${rows}</svg>
      </div>`;
  }

  function chartSparkline(opts) {
    const { width = 240, height = 60, data = [], color = "var(--st-navy)", plan = null } = opts;
    if (!data.length) return "";
    const max = Math.max(...data, ...(plan || []), 1);
    const min = 0;
    const xAt = (i) => (i / (data.length - 1)) * width;
    const yAt = (v) => height - 4 - ((v - min) / (max - min)) * (height - 10);
    const d = data.map((v, i) => (i === 0 ? "M" : "L") + xAt(i).toFixed(1) + "," + yAt(v).toFixed(1)).join(" ");
    const area = d + ` L${width},${height - 4} L0,${height - 4} Z`;
    const planPath = plan ? plan.map((v, i) => (i === 0 ? "M" : "L") + xAt(i).toFixed(1) + "," + yAt(v).toFixed(1)).join(" ") : null;
    return `
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="width:100%;height:${height}px;display:block">
        <path d="${area}" fill="${color}" fill-opacity="0.10"/>
        ${planPath ? `<path d="${planPath}" fill="none" stroke="var(--st-ink-muted)" stroke-width="1.5" stroke-dasharray="4,3"/>` : ''}
        <path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
      </svg>`;
  }

  function chartHeatmap(opts) {
    const { rows = [], cols = [], values = [], min = 0, max = 100, unit = "%" } = opts;
    if (!rows.length || !cols.length) return "";
    const cellW = 64, cellH = 36, labelW = 100, padT = 24;
    const width = labelW + cols.length * cellW + 20;
    const height = padT + rows.length * cellH + 12;
    const colorAt = (v) => {
      const t = Math.max(0, Math.min(1, (v - min) / (max - min)));
      if (t < 0.4) return "#8e3a4a"; // burgundy (low)
      if (t < 0.7) return "#9c6630"; // ochre (mid-low)
      if (t < 0.95) return "#6a829a"; // quiet blue (mid-high)
      return "#2f4a3a"; // forest (high)
    };
    const headerCells = cols.map((c, i) =>
      `<text x="${labelW + i * cellW + cellW / 2}" y="${padT - 6}" font-size="11" fill="var(--st-ink-muted)" text-anchor="middle">${esc(c)}</text>`
    ).join("");
    const cells = rows.map((r, ri) => {
      const y = padT + ri * cellH;
      const labelEl = `<text x="0" y="${y + cellH * 0.65}" font-size="12" fill="var(--st-ink)">${esc(r)}</text>`;
      const cellsEl = cols.map((c, ci) => {
        const v = (values[ri] && values[ri][ci]) || 0;
        const x = labelW + ci * cellW;
        const color = colorAt(v);
        return `<rect x="${x + 2}" y="${y + 2}" width="${cellW - 4}" height="${cellH - 4}" fill="${color}" rx="3"/>` +
               `<text x="${x + cellW / 2}" y="${y + cellH * 0.65}" font-size="11" fill="#fff" font-weight="600" text-anchor="middle">${v}${unit}</text>`;
      }).join("");
      return labelEl + cellsEl;
    }).join("");
    return `
      <div class="ste-chart-svg-wrap">
        <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">${headerCells}${cells}</svg>
      </div>`;
  }

  // Build deterministic monthly Plan / Actual / Prior series anchored to the
  // period total. Used by Sales & Royalty cumulative line + SNS sparklines.
  function buildMonthlySeries(seed, total, kind) {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const rng = _rng(String(seed) + ":" + kind);
    let actual = months.map(() => 0.5 + rng() * 0.5);
    const aSum = actual.reduce((a, b) => a + b, 0);
    actual = actual.map(v => Math.round((v / aSum) * total));
    // Cumulative
    let cum = 0;
    const cumA = actual.map(v => (cum += v));
    let cum2 = 0;
    const plan = months.map((_, i) => Math.round((total / 12) * (i + 1)));
    const prior = cumA.map(v => Math.round(v * (0.82 + rng() * 0.18)));
    return { months, actual: cumA, plan, prior };
  }
  function buildQuarterlySeries(seed, total) {
    const rng = _rng(String(seed) + ":q");
    const q = ["Q1","Q2","Q3","Q4"];
    const actual = q.map(() => 0.5 + rng() * 0.5);
    const aSum = actual.reduce((a, b) => a + b, 0);
    const aValues = actual.map(v => Math.round((v / aSum) * total));
    const plan = aValues.map(v => Math.round(v * (0.92 + rng() * 0.16)));
    const prior = aValues.map(v => Math.round(v * (0.85 + rng() * 0.18)));
    return { q, actual: aValues, plan, prior };
  }

  // ============================ DOMAIN HERO CARDS ============================
  // Four cards across the top of Portfolio Overview — one per analytics domain
  // (Sales / Distribution / Inventory / Marketing) with the headline number,
  // a couple of supporting metrics, and click-through to the tab.
  function gbpCompact(n) {
    n = Math.round(n || 0);
    if (n >= 1e9) return "£" + (n / 1e9).toFixed(1) + "B";
    if (n >= 1e6) return "£" + (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return "£" + (n / 1e3).toFixed(0) + "k";
    return "£" + n.toLocaleString();
  }
  function numCompact(n) {
    n = Math.round(n || 0);
    if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(0) + "k";
    return n.toLocaleString();
  }
  function deltaSpan(v, suffix) {
    if (v === null || v === undefined || Number.isNaN(v)) return "—";
    const cls = v >= 0 ? "ste-delta-up" : "ste-delta-down";
    const sign = v >= 0 ? "+" : "";
    return `<span class="${cls}">${sign}${v}${suffix || ""}</span>`;
  }
  // RefData-driven hero cards on Portfolio Overview. Each card pulls live
  // numbers from RefData.salesFor / distributionFor / inventoryFor /
  // marketingFor for the current (entId, period). Click jumps to the
  // matching tab (sales / distribution / inventory / marketing).
  function renderRefHeroes(entId, period) {
    const ent = RefData.byId(entId);
    const sales = RefData.salesFor(entId, period);
    const dist  = RefData.distributionFor(entId, period);
    const inv   = RefData.inventoryFor(entId, period);
    const mkt   = RefData.marketingFor(entId, period);
    const m     = RefData.money;
    const fmtD  = (v) => `<span class="ste-domain-card-delta ${v >= 0 ? 'is-up' : 'is-down'}">${v >= 0 ? '▲' : '▼'} ${(v >= 0 ? '+' : '') + v.toFixed(1)}%</span>`;
    const metric = (l, v) => `<div><div class="ste-mini">${esc(l)}</div><div class="ste-domain-card-mv">${v}</div></div>`;
    const heroes = [
      { tab:'sales',        label:'Sales & Royalty', val: m(sales.netSales, ent).book, sub: `${PERIOD_LABEL[period]} · net sales`,
        metrics: [['vs Plan', fmtD(sales.vsPlan)], ['vs YoY', fmtD(sales.vsYoY)], ['vs Min', `${sales.vsMin.toFixed(0)}%`]] },
      { tab:'distribution', label:'Distribution',    val: dist.active.toLocaleString(),    sub: `Active doors · ${dist.countries.length} countries`,
        metrics: [['Net Δ', (dist.netDelta>=0?'+':'')+dist.netDelta], ['New', '+'+dist.newD], ['Rev/Door', m(dist.revPerDoor, ent).book]] },
      { tab:'inventory',    label:'Inventory',       val: m(inv.stockValue, ent).book, sub: `Stock value · ${PERIOD_LABEL[period]}`,
        metrics: [['Stk/Sales', inv.stockToSales.toFixed(1)+'mo'], ['Turn', inv.turn.toFixed(1)+'×'], ['Aged', inv.aged+'%']] },
      { tab:'marketing',    label:'Marketing',       val: m(mkt.spend, ent).book, sub: `Spend · ROI ${mkt.roi.toFixed(1)}×`,
        metrics: [['ROI', mkt.roi.toFixed(1)+'×'], ['Reach', RefData.compact(mkt.reach)], ['Issues', `${mkt.violations}`]] },
    ];
    return `
      <div class="ste-domain-grid">
        ${heroes.map(h => `
          <button class="ste-domain-card" data-analytics-tab="${esc(h.tab)}" type="button">
            <div class="ste-domain-card-hd">
              <strong>${esc(h.label)}</strong>
              <span class="ste-domain-card-arrow">›</span>
            </div>
            <div class="ste-domain-card-val">${h.val}</div>
            <div class="ste-mini">${esc(h.sub)}</div>
            <div class="ste-domain-card-metrics">
              ${h.metrics.map(([l, v]) => metric(l, v)).join("")}
            </div>
          </button>`).join("")}
      </div>`;
  }

  // Action Required panel — one box per licensee with urgency pill +
  // per-item severity dot + due-day chip (D-XX). Sorted by nearest deadline.
  function renderActionRequired() {
    const items = RefData.actionItems();
    const sevPill = { urgent:'is-urgent', warn:'is-warn', ok:'is-ok' };
    const sevTxt  = { urgent:'Action now', warn:'Review', ok:'On track' };
    const counts = { urgent:0, warn:0, ok:0 };
    items.forEach(a => counts[a.sev]++);
    const boxes = items.map(a => {
      const e = RefData.byId(a.id);
      return `
        <div class="ste-action-box ${sevPill[a.sev] || ''}">
          <div class="ste-action-box-hd">
            <div>
              <div class="ste-action-box-code">${esc(entDisplayName(e))}</div>
              <div class="ste-action-box-headline">${esc(a.headline)}</div>
            </div>
            <span class="ste-action-box-pill ${sevPill[a.sev] || ''}">${esc(sevTxt[a.sev] || '')}</span>
          </div>
          ${a.items.map(i => {
            const dueNear = /^D-\d+$/.test(i.due || '') && parseInt((i.due || '').slice(2), 10) <= 15;
            return `<div class="ste-action-item">
              <span class="ste-action-item-dot is-${esc(i.ic)}"></span>
              <span class="ste-action-item-txt">${esc(i.txt)}</span>
              <span class="ste-action-item-due ${dueNear ? 'is-near' : ''}">${esc(i.due)}</span>
            </div>`;
          }).join("")}
        </div>`;
    }).join("");
    return `
      <section class="ste-action-required">
        <div class="ste-action-required-hd">
          <div>
            <h2>Action Required</h2>
            <div class="ste-action-required-sub">${items.length} licensees · sorted by nearest deadline</div>
          </div>
          <span class="ste-action-box-pill is-urgent">${counts.urgent} urgent · ${counts.warn} review · ${counts.ok} on track</span>
        </div>
        <div class="ste-action-grid">${boxes}</div>
      </section>`;
  }
  // Expose so HQ Home can drop the same panel without duplicating the
  // RefData glue. Stays inside the analytics IIFE so the closure over
  // RefData / entDisplayName / esc stays intact.
  global.STEActionRequired = { render: renderActionRequired };

  // ============================ A2 — SALES & ROYALTY ============================
  // Mirrors the Licensor Console: a left sticky sub-nav (Net Sales / Royalty /
  // Variance / vs Contract Min), a Price Band toggle (All / Wholesale /
  // Retail), and per-subview content. All numbers come from RefData.
  const A2_SUBVIEWS = [
    { id: 'net',      label: 'Net Sales' },
    { id: 'royalty',  label: 'Royalty' },
    { id: 'variance', label: 'Variance Analysis' },
    { id: 'min',      label: 'vs Contract Minimum' },
  ];
  function getA2View() {
    const v = (STE.getSession() || {}).analyticsA2View;
    return A2_SUBVIEWS.some(x => x.id === v) ? v : 'net';
  }
  function setA2View(v) { STE.setSession({ ...(STE.getSession() || {}), analyticsA2View: v }); }
  function getA2Channel() {
    const c = (STE.getSession() || {}).analyticsA2Channel;
    return c === 'wholesale' || c === 'retail' ? c : null;
  }
  function setA2Channel(c) {
    STE.setSession({ ...(STE.getSession() || {}), analyticsA2Channel: c });
  }
  function getA2Dim() {
    const d = (STE.getSession() || {}).analyticsA2Dim;
    return d === 'channel' || d === 'country' ? d : 'category';
  }
  function setA2Dim(d) { STE.setSession({ ...(STE.getSession() || {}), analyticsA2Dim: d }); }

  function renderRefSalesTab(entId, period) {
    const ent = RefData.byId(entId);
    const view = getA2View();
    const channel = getA2Channel();
    const sales = RefData.salesFor(entId, period, channel);
    const tree = `
      <aside class="ste-a2-tree">
        <div class="ste-mini ste-a2-tree-lbl">Analysis</div>
        <div class="ste-a2-tree-items">
          ${A2_SUBVIEWS.map(v => `
            <button type="button" class="ste-a2-tree-item ${v.id===view?'active':''}" data-a2view="${esc(v.id)}">${esc(v.label)}</button>`).join("")}
        </div>
        <div class="ste-a2-tree-divider"></div>
        <div class="ste-mini ste-a2-tree-lbl">Price Band</div>
        <div class="ste-a2-tree-seg">
          <button type="button" class="${!channel?'active':''}"             data-a2channel="">All</button>
          <button type="button" class="${channel==='wholesale'?'active':''}" data-a2channel="wholesale">Wholesale</button>
          <button type="button" class="${channel==='retail'?'active':''}"    data-a2channel="retail">Retail</button>
        </div>
        <div class="ste-mini ste-a2-tree-foot">Toggles one price band at a time. Royalty is computed on net wholesale value.</div>
      </aside>`;
    const body = view === 'net'      ? renderA2Net(entId, period, sales, ent, channel)
              : view === 'royalty'   ? renderA2Royalty(entId, period, sales, ent)
              : view === 'variance'  ? renderA2Variance(entId, period, sales, ent, channel)
              :                        renderA2Min(entId, period, sales, ent);
    return `<div class="ste-a2-layout">${tree}<div class="ste-a2-main">${body}</div></div>`;
  }

  function refKpi(o) {
    return `
      <div class="ste-analytics-kpi-tile" ${o.tip ? `data-tip="${encodeURIComponent(JSON.stringify(o.tip))}"` : ''}>
        <div class="ste-mini">${esc(o.label)}</div>
        <div class="ste-analytics-kpi-val">${o.value}${o.unit ? `<small style="font-size:14px;color:var(--st-ink-soft);font-weight:500"> ${esc(o.unit)}</small>` : ''}</div>
        ${o.cur ? `<div class="ste-mini" style="margin-top:2px">${esc(o.cur)}</div>` : ''}
        ${o.foot ? `<div class="ste-analytics-kpi-foot">${o.foot}</div>` : ''}
      </div>`;
  }

  function renderA2KpiRow(sales, ent) {
    const m = RefData.money, sym = m(1, ent).sym, c = RefData.compact;
    return `
      <div class="ste-analytics-kpi-row">
        ${refKpi({ label:'Net Sales', value: m(sales.netSales, ent).book, cur: m(sales.netSales, ent).str,
          foot: `<span class="ste-domain-card-delta ${sales.vsPlan>=0?'is-up':'is-down'}">${sales.vsPlan>=0?'+':''}${sales.vsPlan.toFixed(1)}%</span> <span class="ste-mini">vs plan</span>`,
          tip: { title:'Net Sales · '+entDisplayName(ent), rows:[['Actual', sym+c(sales.netSales)],['Plan', sym+c(sales.plan)],['Prior Year', sym+c(sales.prior)]], src:'Source: licensee sales statements (validated) · ECB FX' } })}
        ${refKpi({ label:'vs Plan', value: (sales.vsPlan>=0?'+':'')+sales.vsPlan.toFixed(1), unit:'%',
          foot: `<span class="ste-mini">attainment ${sales.plan ? (sales.netSales/sales.plan*100).toFixed(0) : 0}%</span>`,
          tip: { title:'Plan attainment', rows:[['Actual', sym+c(sales.netSales)],['Plan', sym+c(sales.plan)],['Gap', sym+c(sales.netSales-sales.plan)]], src:'Plan: approved Season Sales Plan (3-C)' } })}
        ${refKpi({ label:'vs Prior YoY', value: (sales.vsYoY>=0?'+':'')+sales.vsYoY.toFixed(1), unit:'%',
          foot: `<span class="ste-mini">${sym}${c(sales.prior)} prior</span>`,
          tip: { title:'Year-over-year', rows:[['This year', sym+c(sales.netSales)],['Prior year', sym+c(sales.prior)]], src:'Prior-year actuals, same period' } })}
        ${refKpi({ label:'vs Contract Min', value: sales.vsMin.toFixed(0), unit:'%',
          foot: sales.vsMin >= 100 ? `<span class="ste-pill-ok">Above min</span>` : `<span class="ste-pill-err">Below min</span>`,
          tip: { title:'Contract minimum', rows:[['Actual', sym+c(sales.netSales)],['Minimum (period)', sym+c(sales.minForPeriod)]], src:'Comparison figure only — not a chart threshold' } })}
      </div>`;
  }

  function renderA2Net(entId, period, sales, ent, channel) {
    const isYtd = period === 'ytd';
    const dim = getA2Dim();
    const items = RefData.breakdown(entId, period, dim, channel);
    const labels = sales.monthly.months;
    const lineSvg = chartLine({
      labels: isYtd ? labels : sales.quarterly.q,
      series: isYtd
        ? [
            { label:'Actual',     data: sales.monthly.actual, color:'#2a3244' },
            { label:'Plan',       data: sales.monthly.plan,   color:'#9c6630', dashed:true },
            { label:'Prior Year', data: sales.monthly.prior,  color:'#b8c8d4' },
          ]
        : [
            { label:'Actual',     data: sales.quarterly.actual, color:'#2a3244' },
            { label:'Plan',       data: sales.quarterly.plan,   color:'#9c6630', dashed:true },
            { label:'Prior Year', data: sales.quarterly.prior,  color:'#b8c8d4' },
          ],
      yFormat: svgMoneyShort,
    });
    const sym = RefData.money(1, ent).sym;
    const c = RefData.compact;
    return `
      ${renderA2KpiRow(sales, ent)}
      <div class="ste-card" style="margin-top:18px">
        <div class="ste-card-head"><h3>Net Sales · ${isYtd?'YTD cumulative':'quarterly'}</h3><span class="ste-mini">Actual vs Plan vs Prior Year</span></div>
        <div class="ste-card-body">${lineSvg}</div>
      </div>
      <div class="ste-card" style="margin-top:18px">
        <div class="ste-card-head">
          <div><h3>Breakdown</h3><span class="ste-mini">Plan attainment by ${esc(dim)}</span></div>
          <div class="ste-a2-dim-tabs">
            ${['category','channel','country'].map(d => `<button type="button" class="${d===dim?'active':''}" data-a2dim="${d}">${esc(d[0].toUpperCase()+d.slice(1))}</button>`).join("")}
          </div>
        </div>
        <div class="ste-card-body">
          <div class="ste-grid-2" style="grid-template-columns:1.2fr 1fr;align-items:start">
            ${chartHBars({ items: items.map(it => ({ label: it.label, value: it.value })), valFormat: svgMoneyShort })}
            <table class="ste-table">
              <thead><tr><th>${esc(dim[0].toUpperCase()+dim.slice(1))}</th><th class="ste-num">Net Sales</th><th class="ste-num">Share</th><th class="ste-num">Attain</th></tr></thead>
              <tbody>${items.map(it => `<tr><td>${esc(it.label)}</td><td class="ste-num">${sym}${c(it.value)}</td><td class="ste-num">${it.share.toFixed(0)}%</td><td class="ste-num" style="color:${it.attain>=100?'var(--st-forest)':it.attain>=92?'var(--st-navy)':'var(--st-warn)'}">${it.attain}%</td></tr>`).join("")}</tbody>
            </table>
          </div>
        </div>
      </div>`;
  }

  function renderA2Royalty(entId, period, sales, ent) {
    const m = RefData.money, sym = m(1, ent).sym, c = RefData.compact;
    const tiers = [
      { band:'£0 – £2.0M',  rate:'8%',  status:'passed'   },
      { band:'£2.0M – £4.0M', rate:'10%', status:'current' },
      { band:'£4.0M +',      rate:'12%', status:'upcoming' },
    ];
    const tierPill = { passed:'<span class="ste-pill-ok">Passed</span>', current:'<span class="ste-pill-info">Current</span>', upcoming:'<span class="ste-pill-soft">Upcoming</span>' };
    const lineSvg = chartLine({
      labels: sales.monthly.months,
      series: [
        { label:'Royalty Actual', data: sales.monthly.actual.map(v => v == null ? null : Math.round(v * 0.10)), color:'#8e3a4a' },
        { label:'Royalty Plan',   data: sales.monthly.plan.map(v => Math.round(v * 0.10)),                       color:'#9c6630', dashed:true },
      ],
      yFormat: svgMoneyShort,
    });
    const royAttain = sales.royaltyMin ? (sales.royalty / sales.royaltyMin) * 100 : 0;
    return `
      <div class="ste-analytics-kpi-row">
        ${refKpi({ label:'Royalty Due', value: m(sales.royalty, ent).book, cur: m(sales.royalty, ent).str,
          foot: `<span class="ste-domain-card-delta ${sales.vsPlan>=0?'is-up':'is-down'}">${sales.vsPlan>=0?'+':''}${sales.vsPlan.toFixed(1)}%</span> <span class="ste-mini">vs plan</span>`,
          tip:{ title:'Royalty due', rows:[['Net sales', sym+c(sales.netSales)],['Blended rate','10.0%'],['Royalty', sym+c(sales.royalty)]], src:'Master Agreement § 4.2 (tiered)' } })}
        ${refKpi({ label:'Effective Rate', value:'10.0', unit:'%', foot:'<span class="ste-mini">tiered blended</span>' })}
        ${refKpi({ label:'vs Plan Royalty', value:(sales.vsPlan>=0?'+':'')+sales.vsPlan.toFixed(1), unit:'%', foot:`<span class="ste-mini">${sym}${c(sales.royaltyPlan)} plan</span>` })}
        ${refKpi({ label:'vs Contract Min Royalty', value: royAttain.toFixed(0), unit:'%',
          foot: royAttain >= 100 ? `<span class="ste-pill-ok">Above min</span>` : `<span class="ste-pill-err">Below min</span>`,
          tip:{ title:'Min royalty', rows:[['Royalty due', sym+c(sales.royalty)],['Min royalty', sym+c(sales.royaltyMin)]], src:'Comparison only' } })}
      </div>
      <div class="ste-card" style="margin-top:18px">
        <div class="ste-card-head"><h3>Royalty · YTD cumulative</h3><span class="ste-mini">Actual vs Plan</span></div>
        <div class="ste-card-body">${lineSvg}</div>
      </div>
      <div class="ste-card" style="margin-top:18px">
        <div class="ste-card-head"><h3>Tier Rate Application</h3><span class="ste-mini">Cumulative net sales determine the marginal royalty rate</span></div>
        <div class="ste-card-body">
          <div class="ste-grid-3">
            ${tiers.map(t => `
              <div class="ste-tier-card is-${t.status}">
                <div class="ste-tier-card-hd"><span class="ste-mini">${esc(t.band)}</span>${tierPill[t.status]||''}</div>
                <div class="ste-tier-card-rate">${esc(t.rate)}</div>
                <div class="ste-mini">marginal royalty rate</div>
              </div>`).join("")}
          </div>
        </div>
      </div>`;
  }

  function renderA2Variance(entId, period, sales, ent, channel) {
    const sym = RefData.money(1, ent).sym, c = RefData.compact;
    const rows = RefData.breakdown(entId, period, 'category', channel)
      .concat(RefData.breakdown(entId, period, ent.aggregate ? 'country' : 'channel', channel))
      .map(it => ({ ...it, variance: it.attain - 100 }))
      .sort((a, b) => b.variance - a.variance);
    const top = rows.slice(0, 5);
    const bottom = rows.slice(-5).reverse();
    const tblRow = (r) => `<tr><td>${esc(r.label)}</td><td class="ste-num">${sym}${c(r.value)}</td><td class="ste-num" style="color:${r.variance>=0?'var(--st-forest)':'var(--st-err)'}">${r.variance>=0?'+':''}${r.variance}%</td></tr>`;
    // Heatmap: category × (country|channel). Values = plan attainment %.
    // Seed off (entId, period, channel) so the matrix stays stable across
    // re-renders — earlier this used Math.random and the cells reshuffled
    // every time the user clicked a period/channel button.
    const dimY = ent.aggregate ? (RefData.COUNTRIES[entId] || RefData.COUNTRIES.total) : RefData.CHANNELS;
    const _hmRng = _rng("a2:variance:" + entId + ":" + period + ":" + (channel || ""));
    const matrix = dimY.map(() => RefData.CATEGORIES.map(() => 78 + Math.round(_hmRng() * 44)));
    return `
      <div class="ste-card">
        <div class="ste-card-head"><h3>Plan Attainment Heatmap</h3><span class="ste-mini">${ent.aggregate?'Category × Country':'Category × Channel'} · % of plan</span></div>
        <div class="ste-card-body">${chartHeatmap({ rows: dimY, cols: RefData.CATEGORIES, values: matrix, min:78, max:122, unit:'%' })}</div>
      </div>
      <div class="ste-grid-2" style="margin-top:18px">
        <div class="ste-card">
          <div class="ste-card-head"><h3>Top 5 — Over Plan</h3><span class="ste-mini">Strongest plan beats</span></div>
          <div class="ste-card-body" style="padding:0">
            <table class="ste-table"><thead><tr><th>Segment</th><th class="ste-num">Net Sales</th><th class="ste-num">vs Plan</th></tr></thead><tbody>${top.map(tblRow).join("")}</tbody></table>
          </div>
        </div>
        <div class="ste-card">
          <div class="ste-card-head"><h3>Bottom 5 — Under Plan</h3><span class="ste-mini">Largest gaps to recover</span></div>
          <div class="ste-card-body" style="padding:0">
            <table class="ste-table"><thead><tr><th>Segment</th><th class="ste-num">Net Sales</th><th class="ste-num">vs Plan</th></tr></thead><tbody>${bottom.map(tblRow).join("")}</tbody></table>
          </div>
        </div>
      </div>`;
  }

  function renderA2Min(entId, period, sales, ent) {
    const m = RefData.money, sym = m(1, ent).sym, c = RefData.compact;
    const lineSvg = chartLine({
      labels: sales.monthly.months,
      series: [
        { label:'Actual', data: sales.monthly.actual, color:'#2a3244' },
        { label:'Plan',   data: sales.monthly.plan,   color:'#9c6630', dashed:true },
      ],
      yFormat: svgMoneyShort,
    });
    return `
      <div class="ste-grid-3">
        ${refKpi({ label:'Actual Net Sales', value: m(sales.netSales, ent).book, cur: m(sales.netSales, ent).str })}
        ${refKpi({ label:'Contract Minimum', value: m(sales.minForPeriod, ent).book, cur:'period minimum' })}
        ${refKpi({ label:'Attainment', value: sales.vsMin.toFixed(0), unit:'%', foot: sales.vsMin >= 100 ? `<span class="ste-pill-ok">Above minimum</span>` : `<span class="ste-pill-err">Below minimum</span>` })}
      </div>
      <div class="ste-card" style="margin-top:18px">
        <div class="ste-card-head"><h3>Cumulative Net Sales vs Contract Minimum</h3><span class="ste-mini">Comparison figures only — no chart threshold line per spec</span></div>
        <div class="ste-card-body">${lineSvg}</div>
        <div class="ste-card-body ste-a2-min-foot">
          <div><div class="ste-mini">Headroom over minimum</div><div class="ste-a2-min-val" style="color:var(--st-forest)">${sym}${c(sales.netSales - sales.minForPeriod)}</div></div>
          <div><div class="ste-mini">Coverage ratio</div><div class="ste-a2-min-val">${sales.minForPeriod ? (sales.netSales/sales.minForPeriod).toFixed(2) : '—'}×</div></div>
          <div class="ste-mini" style="max-width:320px;line-height:1.5">Per spec, contract minimum is shown as a comparison value only and is intentionally not drawn as a threshold line on the trend chart.</div>
        </div>
      </div>`;
  }

  // ============================ A3 — DISTRIBUTION ============================
  function renderRefDistributionTab(entId, period) {
    const ent = RefData.byId(entId);
    const d = RefData.distributionFor(entId, period);
    const sales = RefData.salesFor(entId, period);
    const m = RefData.money, sym = m(1, ent).sym, c = RefData.compact;
    const tierRows = d.tiers.map(t => {
      const net = t.existing + t.nw - t.closing;
      return `<tr>
        <td><span class="ste-pill-soft">${esc(t.tier)}</span></td>
        <td class="ste-num">${t.existing}</td>
        <td class="ste-num" style="color:var(--st-forest)">+${t.nw}</td>
        <td class="ste-num" style="color:var(--st-err)">-${t.closing}</td>
        <td class="ste-num"><b>${net}</b></td>
      </tr>`;
    }).join("");
    const channelBars = d.channels.map(ch => `
      <div class="ste-channel-row">
        <div class="ste-channel-row-hd"><span>${esc(ch.label)}</span><b>${ch.share}%</b></div>
        <div class="ste-analytics-channel-bar"><div style="width:${ch.share}%;background:var(--st-navy)"></div></div>
      </div>`).join("");
    // Sized to roughly match the half-width card so each chart fills the
    // content area rather than rendering as a small strip. Width 640 +
    // height 320 = 2:1 aspect, so a ~460px-wide card paints at ~230px.
    const doorLine = chartLine({
      labels: d.months,
      series: [{ label:'Active Doors', data: d.doorCum, color:'#2a3244' }],
      yFormat: (n) => Math.round(n||0),
      width: 640,
      height: 320,
    });
    const qBars = chartGroupedBars({
      labels: d.quarterly.q,
      series: [
        { label:'Actual', data: d.quarterly.actual, color:'#2a3244' },
        { label:'Plan',   data: d.quarterly.plan,   color:'#9c6630' },
        { label:'Prior',  data: d.quarterly.prior,  color:'#b8c8d4' },
      ],
      yFormat: svgMoneyShort,
      width: 640,
      height: 320,
    });
    return `
      <div class="ste-analytics-kpi-row">
        ${refKpi({ label:'Active Doors', value: d.active.toLocaleString(), foot:`<span class="ste-mini">${d.countries.length} countries</span>`,
          tip:{ title:'Active doors', rows:[['Existing', String(d.active-d.newD)],['New', '+'+d.newD],['Closing', '-'+d.closeD]], src:'Door master · monthly account feed' } })}
        ${refKpi({ label:'Net Door Δ', value: (d.netDelta>=0?'+':'')+d.netDelta, foot:`<span class="ste-mini">${d.newD} new · ${d.closeD} closing</span>` })}
        ${refKpi({ label:'Revenue / Door', value: m(d.revPerDoor, ent).book, cur: m(d.revPerDoor, ent).str, foot:'<span class="ste-mini">period net sales ÷ doors</span>' })}
        ${refKpi({ label:'Top 5 Account Conc.', value: d.top5, unit:'%', foot: d.top5>40?'<span class="ste-pill-warn">Concentrated</span>':'<span class="ste-pill-ok">Diversified</span>',
          tip:{ title:'Account concentration', rows:[['Top 5 share', d.top5+'%'],['Long tail', (100-d.top5)+'%']], src:'Revenue by account, period' } })}
      </div>
      <div class="ste-grid-2" style="margin-top:18px">
        <div class="ste-card">
          <div class="ste-card-head"><h3>Account Development by Tier</h3><span class="ste-mini">Existing · New · Closing → Net</span></div>
          <div class="ste-card-body" style="padding:0">
            <table class="ste-table"><thead><tr><th>Tier</th><th class="ste-num">Existing</th><th class="ste-num">New</th><th class="ste-num">Closing</th><th class="ste-num">Net</th></tr></thead><tbody>${tierRows}</tbody></table>
          </div>
          <div class="ste-card-body">
            <div class="ste-mini" style="margin-bottom:10px;text-transform:uppercase;letter-spacing:0.06em">Channel Type Mix</div>
            ${channelBars}
          </div>
        </div>
        <div class="ste-card">
          <div class="ste-card-head"><h3>Active Doors · YTD cumulative</h3><span class="ste-mini">Net door movement, Jan–Jun</span></div>
          <div class="ste-card-body">${doorLine}</div>
          <div class="ste-card-head" style="border-top:1px solid var(--st-rule)"><h3>Quarterly Revenue by Door Network</h3><span class="ste-mini">Actual vs Plan vs Prior</span></div>
          <div class="ste-card-body">${qBars}</div>
        </div>
      </div>`;
  }

  // ============================ A4 — INVENTORY ============================
  function renderRefInventoryTab(entId, period) {
    const ent = RefData.byId(entId);
    const d = RefData.inventoryFor(entId, period);
    const m = RefData.money, sym = m(1, ent).sym, c = RefData.compact;
    const heat = chartHeatmap({ rows: d.categories, cols: d.seasons, values: d.matrix, min:0, max:100, unit:'' });
    // Sized to fill the half-width card — same ratio as the Distribution
    // charts so the page reads consistently across tabs.
    const snap = chartGroupedBars({
      labels: d.q,
      series: [
        { label:'This Year', data: d.snap,      color:'#2a3244' },
        { label:'Prior',     data: d.snapPrior, color:'#b8c8d4' },
      ],
      yFormat: svgMoneyShort,
      width: 640,
      height: 320,
    });
    return `
      <div class="ste-analytics-kpi-row">
        ${refKpi({ label:'Stock Value', value: m(d.stockValue, ent).book, cur: m(d.stockValue, ent).str, foot:'<span class="ste-mini">at cost · period end</span>',
          tip:{ title:'Stock value', rows:[['At cost', sym+c(d.stockValue)],['Coverage', d.stockToSales.toFixed(1)+' months']], src:'Licensee inventory feed (EOM)' } })}
        ${refKpi({ label:'Stock-to-Sales', value: d.stockToSales.toFixed(1), unit:'mo', foot: d.stockToSales>4?'<span class="ste-pill-warn">High</span>':'<span class="ste-pill-ok">Healthy</span>' })}
        ${refKpi({ label:'Inventory Turn', value: d.turn.toFixed(1), unit:'×', foot:'<span class="ste-mini">annualised</span>' })}
        ${refKpi({ label:'Aged Inventory', value: d.aged, unit:'%', foot: d.aged>20?'<span class="ste-pill-err">Markdown risk</span>':'<span class="ste-pill-ok">Under control</span>',
          tip:{ title:'Aged inventory (>2 seasons)', rows:[['Aged share', d.aged+'%'],['Markdown flags', String(d.markdown)]], src:'Season-stamped Style Code ageing' } })}
      </div>
      <div class="ste-analytics-flag-row">
        <div class="ste-analytics-flag ste-analytics-flag-err">
          <div class="ste-mini">Stockout risk</div>
          <div class="ste-analytics-flag-val">${d.stockout}</div>
          <div class="ste-mini">Style Codes projected to stock out within the period at current sell-through.</div>
        </div>
        <div class="ste-analytics-flag ste-analytics-flag-warn">
          <div class="ste-mini">Markdown candidates</div>
          <div class="ste-analytics-flag-val">${d.markdown}</div>
          <div class="ste-mini">Aged lines flagged for markdown review to protect brand price integrity.</div>
        </div>
      </div>
      <div class="ste-grid-2" style="margin-top:18px">
        <div class="ste-card">
          <div class="ste-card-head"><h3>Category × Season Matrix</h3><span class="ste-mini">Stock-value index, 0–100</span></div>
          <div class="ste-card-body">${heat}</div>
        </div>
        <div class="ste-card">
          <div class="ste-card-head"><h3>Quarterly stock snapshot</h3><span class="ste-mini">This year vs prior</span></div>
          <div class="ste-card-body">${snap}</div>
        </div>
      </div>
      <div class="ste-card" style="margin-top:18px">
        <div class="ste-card-head"><h3>Inventory Movement</h3><span class="ste-mini">Period flow at cost / value</span></div>
        <div class="ste-card-body">
          <div class="ste-analytics-kpi-row">
            ${refKpi({ label:'Inbound',        value: m(d.movement.inbound,     ent).book, cur: m(d.movement.inbound,     ent).str })}
            ${refKpi({ label:'Sold-Through',   value: m(d.movement.sold,        ent).book, cur: m(d.movement.sold,        ent).str })}
            ${refKpi({ label:'Returns',        value: m(d.movement.returns,     ent).book, cur: m(d.movement.returns,     ent).str })}
            ${refKpi({ label:'Markdown Value', value: m(d.movement.markdownVal, ent).book, cur: m(d.movement.markdownVal, ent).str })}
          </div>
        </div>
      </div>`;
  }

  // ============================ A5 — MARKETING ============================
  function renderRefMarketingTab(entId, period) {
    const ent = RefData.byId(entId);
    const d = RefData.marketingFor(entId, period);
    const m = RefData.money, sym = m(1, ent).sym, c = RefData.compact;
    const camps = d.camps.slice().sort((a, b) => b.roi - a.roi);
    const channelDonut = chartDonut({
      slices: d.channelMix.map(ch => ({ label: ch.label, value: ch.val })),
      centerLabel: RefData.compact(d.spend),
      centerSub: 'Period spend',
    });
    const spendBars = chartGroupedBars({
      labels: d.spendQ.q,
      series: [
        { label:'Actual', data: d.spendQ.actual, color:'#8e3a4a' },
        { label:'Plan',   data: d.spendQ.plan,   color:'#b8c8d4' },
      ],
      yFormat: svgMoneyShort,
      height: 220,
    });
    const snsColors = { Instagram:'#e1306c', TikTok:'#2a3244', X:'#6a829a' };
    const snsCards = ['Instagram','TikTok','X'].map((p, i) => {
      const sd = d.sns[p];
      const cur = sd.actual.filter(v => v != null).slice(-1)[0] || 0;
      const pct = sd.goal ? (cur / sd.goal * 100).toFixed(0) : 0;
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `
        <div class="ste-analytics-kpi-tile">
          <div class="ste-mini" style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:3px;background:${snsColors[p]}"></span><strong>${esc(p)}</strong></div>
          <div class="ste-analytics-kpi-val">${RefData.compact(cur)} <span class="ste-mini" style="font-weight:500"> / ${RefData.compact(sd.goal)}</span></div>
          <div class="ste-mini" style="margin:2px 0 8px">${pct}% to year-end goal</div>
          ${chartSparkline({ data: sd.actual, plan: sd.plan, color: snsColors[p], height: 70 })}
        </div>`;
    }).join("");
    return `
      <div class="ste-analytics-kpi-row">
        ${refKpi({ label:'Total Spend', value: m(d.spend, ent).book, cur: m(d.spend, ent).str, foot:`<span class="ste-mini">${d.spendPlan ? (d.spend/d.spendPlan*100).toFixed(0) : 0}% of plan</span>`,
          tip:{ title:'Marketing spend', rows:[['Actual', sym+c(d.spend)],['Plan', sym+c(d.spendPlan)]], src:'Campaign ledger · 4% of net sales target' } })}
        ${refKpi({ label:'ROI', value: d.roi.toFixed(1), unit:'×', foot: d.roi>=3?'<span class="ste-pill-ok">Strong</span>':'<span class="ste-pill-warn">Watch</span>' })}
        ${refKpi({ label:'SNS Reach', value: RefData.compact(d.reach), cur:'cumulative · IG · TikTok · X', foot:'<span class="ste-mini">period reach</span>' })}
        ${refKpi({ label:'Brand Compliance', value: d.violations, unit:'issues', foot: d.violations>0?`<span class="ste-pill-err">${d.violations} to clear</span>`:'<span class="ste-pill-ok">Clean</span>' })}
      </div>
      <div class="ste-grid-2" style="margin-top:18px">
        <div class="ste-card">
          <div class="ste-card-head"><h3>Campaign ROI</h3><span class="ste-mini">Spend and return by campaign</span></div>
          <div class="ste-card-body" style="padding:0">
            <table class="ste-table"><thead><tr><th>Campaign</th><th class="ste-num">Spend</th><th class="ste-num">ROI</th><th>Performance</th></tr></thead>
            <tbody>${camps.map(cmp => `<tr><td>${esc(cmp.name)}</td><td class="ste-num">${sym}${c(cmp.spend)}</td><td class="ste-num" style="color:${cmp.roi>=3?'var(--st-forest)':cmp.roi>=2?'var(--st-navy)':'var(--st-warn)'}">${cmp.roi.toFixed(1)}×</td><td style="width:140px"><div class="ste-analytics-channel-bar"><div style="width:${Math.min(100, cmp.roi/5*100)}%;background:${cmp.roi>=3?'var(--st-forest)':'var(--st-navy)'}"></div></div></td></tr>`).join("")}</tbody></table>
          </div>
        </div>
        <div class="ste-card">
          <div class="ste-card-head"><h3>Channel Mix</h3><span class="ste-mini">Share of marketing spend</span></div>
          <div class="ste-card-body">${channelDonut}</div>
        </div>
      </div>
      <div class="ste-card" style="margin-top:18px">
        <div class="ste-card-head"><h3>SNS Quantitative Tracking</h3><span class="ste-mini">Monthly cumulative — Plan dashed vs Actual line, toward year-end goal</span></div>
        <div class="ste-card-body">
          <div class="ste-domain-grid">${snsCards}</div>
        </div>
      </div>
      <div class="ste-card" style="margin-top:18px">
        <div class="ste-card-head"><h3>Spend vs Plan</h3><span class="ste-mini">Quarterly marketing investment pacing</span></div>
        <div class="ste-card-body">${spendBars}</div>
      </div>`;
  }

  function renderDomainHeroes(dm, totalSales) {
    const heroes = [
      { id: "sales",        label: "Sales & Royalty", val: gbpCompact(dm.sales || totalSales), sub: "Period net sales",
        metrics: [["vs Plan", deltaSpan(dm.vsPlan, "%")], ["vs YoY", deltaSpan(dm.vsYoY, "%")], ["vs Min", `${dm.vsMin}%`]] },
      { id: "distribution", label: "Distribution",   val: dm.activeDoors.toLocaleString(), sub: "Active doors",
        metrics: [["Net Δ", deltaSpan(dm.newDoors - dm.closingDoors)], ["New", `+${dm.newDoors}`], ["Rev/Door", gbpCompact(dm.revPerDoor)]] },
      { id: "inventory",    label: "Inventory",      val: gbpCompact(dm.stockValue), sub: "Stock value at cost",
        metrics: [["Stk/Sales", `${dm.stockToSales}mo`], ["Turn", `${dm.turn}×`], ["Aged", `${dm.aged}%`]] },
      { id: "marketing",    label: "Marketing",      val: gbpCompact(dm.spend), sub: `Spend · ROI ${dm.roi}×`,
        metrics: [["ROI", `${dm.roi}×`], ["Reach", numCompact(dm.reach)], ["Issues", `${dm.violations}`]] },
    ];
    return `
      <div class="ste-domain-grid">
        ${heroes.map(h => `
          <button class="ste-domain-card" data-analytics-tab="${esc(h.id)}" type="button">
            <div class="ste-domain-card-hd">
              <strong>${esc(h.label)}</strong>
              <span class="ste-domain-card-arrow">›</span>
            </div>
            <div class="ste-domain-card-val">${h.val}</div>
            <div class="ste-mini">${esc(h.sub)}</div>
            <div class="ste-domain-card-metrics">
              ${h.metrics.map(([l, v]) => `<div><div class="ste-mini">${esc(l)}</div><div class="ste-domain-card-mv">${v}</div></div>`).join("")}
            </div>
          </button>`).join("")}
      </div>`;
  }

  // ============================ DOMAIN TAB RENDERERS ============================
  function kpiTile(label, val, foot) {
    return `
      <div class="ste-analytics-kpi-tile">
        <div class="ste-mini">${esc(label)}</div>
        <div class="ste-analytics-kpi-val">${val}</div>
        ${foot ? `<div class="ste-analytics-kpi-foot">${foot}</div>` : ''}
      </div>`;
  }

  function renderSalesTab(dm, totalSales, perQuarter, catRows, royaltyVsMG) {
    const total = dm.sales || totalSales || 0;
    const seed = "sales:" + total;
    // Monthly cumulative line + quarterly grouped bars side by side.
    const mo = buildMonthlySeries(seed, total, "net");
    const lineSvg = chartLine({
      labels: mo.months,
      series: [
        { label: "Actual",     data: mo.actual, color: "#2a3244", dashed: false },
        { label: "Plan",       data: mo.plan,   color: "#6a829a", dashed: true },
        { label: "Prior Year", data: mo.prior,  color: "#b8c8d4", dashed: false },
      ],
      yFormat: svgMoneyShort,
    });
    const qtr = buildQuarterlySeries(seed, total);
    const barsSvg = chartGroupedBars({
      labels: qtr.q,
      series: [
        { label: "Actual",     data: qtr.actual, color: "#2a3244" },
        { label: "Plan",       data: qtr.plan,   color: "#9c6630" },
        { label: "Prior Year", data: qtr.prior,  color: "#b8c8d4" },
      ],
      yFormat: svgMoneyShort,
      height: 260,
    });
    // Top categories donut + horizontal bars.
    const topCat = (catRows || []).slice(0, 6).map(r => ({ label: r.category || "—", value: r.sales }));
    const catDonut = chartDonut({
      slices: topCat,
      centerLabel: gbpCompact(topCat.reduce((s, x) => s + x.value, 0)),
      centerSub: "Top 6 categories",
    });
    return `
      <div class="ste-analytics-kpi-row">
        ${kpiTile("Net Sales", gbpCompact(total), `${deltaSpan(dm.vsPlan, "%")} vs plan`)}
        ${kpiTile("vs Plan", `${dm.vsPlan >= 0 ? "+" : ""}${dm.vsPlan}%`, `Attainment ${dm.plan ? Math.round((dm.sales/dm.plan)*100) : 0}%`)}
        ${kpiTile("vs Prior YoY", `${dm.vsYoY >= 0 ? "+" : ""}${dm.vsYoY}%`, `${gbpCompact(dm.prior)} prior`)}
        ${kpiTile("vs Contract Min", `${dm.vsMin}%`, dm.vsMin >= 100 ? `<span class="ste-pill-ok">Above min</span>` : `<span class="ste-pill-err">Below min</span>`)}
      </div>

      <div class="ste-card" style="margin-top:18px">
        <div class="ste-card-head"><h3>Net Sales — YTD cumulative</h3><span class="ste-mini">Actual vs Plan vs Prior Year</span></div>
        <div class="ste-card-body">${lineSvg}</div>
      </div>

      <div class="ste-grid-2" style="margin-top:18px">
        <div class="ste-card">
          <div class="ste-card-head"><h3>Quarterly Net Sales</h3><span class="ste-mini">Grouped — Actual / Plan / Prior</span></div>
          <div class="ste-card-body">${barsSvg}</div>
        </div>
        <div class="ste-card">
          <div class="ste-card-head"><h3>Category Mix</h3><span class="ste-mini">Top 6 by contribution</span></div>
          <div class="ste-card-body">${catDonut}</div>
        </div>
      </div>

      <div class="ste-card" style="margin-top:18px">
        <div class="ste-card-head"><h3>Royalty</h3><span class="ste-mini">Tiered blended rate · period total</span></div>
        <div class="ste-card-body">
          <div class="ste-analytics-kpi-row">
            ${kpiTile("Royalty Due", gbpCompact(dm.royalty), "10.0% blended")}
            ${kpiTile("Effective Rate", "10.0%", "Tiered (8% / 10% / 12%)")}
            ${kpiTile("vs Min Royalty", `${Math.round((dm.royalty / Math.max(1, dm.minPeriod * 0.10)) * 100)}%`, "Period comparison")}
          </div>
          ${chartLine({
            labels: mo.months,
            series: [
              { label: "Royalty Actual", data: mo.actual.map(v => Math.round(v * 0.10)), color: "#8e3a4a", dashed: false },
              { label: "Royalty Plan",   data: mo.plan.map(v => Math.round(v * 0.10)),   color: "#9c6630", dashed: true },
            ],
            yFormat: svgMoneyShort,
            height: 220,
          })}
        </div>
      </div>

      <div class="ste-card" style="margin-top:18px">
        <div class="ste-card-head"><h3>Breakdown · top categories</h3><span class="ste-mini">By net sales contribution</span></div>
        <div class="ste-card-body">
          ${chartHBars({ items: topCat.slice(0, 8), valFormat: svgMoneyShort })}
        </div>
      </div>`;
  }

  function renderDistributionTab(dm, perLic) {
    const tiers = dm.tiers || [];
    const seed = "dist:" + dm.activeDoors;
    // Cumulative active doors over the year — synth from current count.
    const rng = _rng(seed + ":doors");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const start = Math.max(1, dm.activeDoors - dm.newDoors + dm.closingDoors - 8);
    const doorCum = [];
    let d = start;
    for (let i = 0; i < 12; i++) {
      d += Math.round((dm.newDoors - dm.closingDoors) / 12 * (0.5 + rng() * 1.3));
      doorCum.push(d);
    }
    const doorChart = chartLine({
      labels: months,
      series: [{ label: "Active doors", data: doorCum, color: "#2a3244", dashed: false }],
      yFormat: (v) => Math.round(v).toLocaleString(),
      height: 220,
    });
    const channelDonut = chartDonut({
      slices: (dm.channelMix || []).map(c => ({ label: c.label, value: c.share })),
      centerLabel: dm.activeDoors.toLocaleString(),
      centerSub: "Active doors",
    });
    // Country distribution h-bars synthesized from licensees in scope.
    const countries = (perLic || []).map((p, i) => ({
      label: (p.l && p.l.country) || "—",
      value: Math.round(((dm.activeDoors / Math.max(1, perLic.length)) * (0.7 + (i * 0.13) % 1))),
    })).slice(0, 6);
    const countryBars = chartHBars({
      items: countries.length ? countries : [{ label: "—", value: 0 }],
      valFormat: (v) => v + " doors",
    });
    return `
      <div class="ste-analytics-kpi-row">
        ${kpiTile("Active Doors", dm.activeDoors.toLocaleString(), `Period end`)}
        ${kpiTile("Net Door Δ", `${(dm.newDoors - dm.closingDoors) >= 0 ? "+" : ""}${dm.newDoors - dm.closingDoors}`, `<span class="ste-pill-ok">+${dm.newDoors} new</span> · <span class="ste-pill-err">-${dm.closingDoors} closing</span>`)}
        ${kpiTile("Revenue / Door", gbpCompact(dm.revPerDoor), "Period sales ÷ doors")}
        ${kpiTile("Top 5 Account Conc.", `${dm.top5Conc}%`, dm.top5Conc > 40 ? `<span class="ste-pill-warn">Concentrated</span>` : `<span class="ste-pill-ok">Diversified</span>`)}
      </div>

      <div class="ste-grid-2" style="margin-top:18px">
        <div class="ste-card">
          <div class="ste-card-head"><h3>Account development by Tier</h3><span class="ste-mini">Existing · New · Closing → Net</span></div>
          <div class="ste-card-body" style="padding:0">
            <table class="ste-table">
              <thead><tr><th>Tier</th><th class="ste-num">Existing</th><th class="ste-num">New</th><th class="ste-num">Closing</th><th class="ste-num">Net</th></tr></thead>
              <tbody>
                ${tiers.map(t => `
                  <tr>
                    <td>${esc(t.tier)}</td>
                    <td class="ste-num">${t.existing}</td>
                    <td class="ste-num" style="color:var(--st-forest)">+${t.nw}</td>
                    <td class="ste-num" style="color:var(--st-burgundy)">-${t.closing}</td>
                    <td class="ste-num"><strong>${t.existing + t.nw - t.closing}</strong></td>
                  </tr>`).join("")}
              </tbody>
            </table>
          </div>
        </div>
        <div class="ste-card">
          <div class="ste-card-head"><h3>Channel mix</h3><span class="ste-mini">Door network composition</span></div>
          <div class="ste-card-body">${channelDonut}</div>
        </div>
      </div>

      <div class="ste-card" style="margin-top:18px">
        <div class="ste-card-head"><h3>Active doors — YTD cumulative</h3><span class="ste-mini">Net door movement, month by month</span></div>
        <div class="ste-card-body">${doorChart}</div>
      </div>

      <div class="ste-card" style="margin-top:18px">
        <div class="ste-card-head"><h3>Country distribution</h3><span class="ste-mini">Doors by market</span></div>
        <div class="ste-card-body">${countryBars}</div>
      </div>`;
  }

  function renderInventoryTab(dm) {
    const seed = "inv:" + dm.stockValue;
    const rng = _rng(seed);
    // Category × season stock value index heatmap
    const cats = ["T SHIRT","POLO","FLEECE","JACKETS","PANTS","TRACKSUIT"];
    const seasons = ["25SS","25FW","26SS","26FW","27SS"];
    const matrix = cats.map(() => seasons.map(() => Math.round(20 + rng() * 80)));
    const heat = chartHeatmap({ rows: cats, cols: seasons, values: matrix, min: 0, max: 100, unit: "" });
    // Quarterly stock snapshot — this year vs prior
    const q = ["Q1","Q2","Q3","Q4"];
    const snap = q.map((_, i) => Math.round(dm.stockValue * (0.85 + rng() * 0.3)));
    const snapPrior = snap.map(v => Math.round(v * (0.82 + rng() * 0.2)));
    const snapChart = chartGroupedBars({
      labels: q,
      series: [
        { label: "This Year", data: snap,      color: "#2a3244" },
        { label: "Prior",     data: snapPrior, color: "#b8c8d4" },
      ],
      yFormat: svgMoneyShort,
      height: 220,
    });
    return `
      <div class="ste-analytics-kpi-row">
        ${kpiTile("Stock Value", gbpCompact(dm.stockValue), "At cost · period end")}
        ${kpiTile("Stock-to-Sales", `${dm.stockToSales}mo`, dm.stockToSales > 4 ? `<span class="ste-pill-warn">High</span>` : `<span class="ste-pill-ok">Healthy</span>`)}
        ${kpiTile("Inventory Turn", `${dm.turn}×`, "Annualised")}
        ${kpiTile("Aged Inventory", `${dm.aged}%`, dm.aged > 20 ? `<span class="ste-pill-err">Markdown risk</span>` : `<span class="ste-pill-ok">Under control</span>`)}
      </div>

      <div class="ste-analytics-flag-row">
        <div class="ste-analytics-flag ste-analytics-flag-err">
          <div class="ste-mini">Stockout risk</div>
          <div class="ste-analytics-flag-val">${dm.stockout}</div>
          <div class="ste-mini">Style Codes projected to stock out within the period at current sell-through.</div>
        </div>
        <div class="ste-analytics-flag ste-analytics-flag-warn">
          <div class="ste-mini">Markdown candidates</div>
          <div class="ste-analytics-flag-val">${dm.markdown}</div>
          <div class="ste-mini">Aged lines flagged for markdown review to protect brand price integrity.</div>
        </div>
      </div>

      <div class="ste-grid-2" style="margin-top:18px">
        <div class="ste-card">
          <div class="ste-card-head"><h3>Category × Season Matrix</h3><span class="ste-mini">Stock-value index, 0–100</span></div>
          <div class="ste-card-body">${heat}</div>
        </div>
        <div class="ste-card">
          <div class="ste-card-head"><h3>Quarterly stock snapshot</h3><span class="ste-mini">This year vs prior</span></div>
          <div class="ste-card-body">${snapChart}</div>
        </div>
      </div>

      <div class="ste-card" style="margin-top:18px">
        <div class="ste-card-head"><h3>Inventory movement</h3><span class="ste-mini">Period flow at cost</span></div>
        <div class="ste-card-body">
          <div class="ste-analytics-kpi-row">
            ${kpiTile("Inbound", gbpCompact(Math.round(dm.stockValue * 0.45)), "")}
            ${kpiTile("Sold-Through", gbpCompact(Math.round(dm.sales * 0.55)), "")}
            ${kpiTile("Returns", gbpCompact(Math.round(dm.sales * 0.04)), "")}
            ${kpiTile("Markdown Value", gbpCompact(Math.round(dm.stockValue * (dm.aged / 100) * 0.5)), "")}
          </div>
        </div>
      </div>`;
  }

  function renderMarketingTab(dm) {
    const sns = dm.sns || [];
    const camps = (dm.campaigns || []).slice().sort((a, b) => b.roi - a.roi);
    const seed = "mkt:" + dm.spend;
    // Channel mix donut
    const channelMix = [
      { label: "Performance", value: 28 },
      { label: "Brand",       value: 22 },
      { label: "Influencer",  value: 18 },
      { label: "Retail Coop", value: 16 },
      { label: "Events",      value: 10 },
      { label: "Other",       value: 6 },
    ];
    const channelDonut = chartDonut({
      slices: channelMix,
      centerLabel: gbpCompact(dm.spend),
      centerSub: "Period spend",
    });
    // Quarterly spend pacing — Actual vs Plan
    const qs = buildQuarterlySeries(seed, dm.spend);
    const spendChart = chartGroupedBars({
      labels: qs.q,
      series: [
        { label: "Actual", data: qs.actual, color: "#8e3a4a" },
        { label: "Plan",   data: qs.plan,   color: "#b8c8d4" },
      ],
      yFormat: svgMoneyShort,
      height: 220,
    });
    // SNS sparklines — monthly cumulative toward goal
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const snsCards = sns.map(s => {
      const rng = _rng(seed + s.platform);
      const actual = [];
      let cur = Math.round(s.followers * 0.5);
      for (let i = 0; i < 12; i++) {
        cur = Math.min(s.followers, Math.round(cur + (s.followers - cur) * (0.05 + rng() * 0.18)));
        actual.push(cur);
      }
      const plan = months.map((_, i) => Math.round((s.goal / 12) * (i + 1)));
      const pct = Math.min(100, Math.round((s.followers / s.goal) * 100));
      const color = s.platform === "Instagram" ? "#8e3a4a" : s.platform === "TikTok" ? "#2a3244" : "#6a829a";
      return `
        <div class="ste-analytics-kpi-tile">
          <div class="ste-mini"><strong>${esc(s.platform)}</strong></div>
          <div class="ste-analytics-kpi-val">${numCompact(s.followers)} <span class="ste-mini" style="font-weight:400">/ ${numCompact(s.goal)}</span></div>
          <div class="ste-mini">${pct}% to year-end goal</div>
          ${chartSparkline({ data: actual, plan: plan, color: color, height: 60 })}
        </div>`;
    }).join("");
    return `
      <div class="ste-analytics-kpi-row">
        ${kpiTile("Total Spend", gbpCompact(dm.spend), `${Math.round((dm.spend / dm.spendPlan) * 100)}% of plan`)}
        ${kpiTile("ROI", `${dm.roi}×`, dm.roi >= 3 ? `<span class="ste-pill-ok">Strong</span>` : `<span class="ste-pill-warn">Watch</span>`)}
        ${kpiTile("SNS Reach", numCompact(dm.reach), "Cumulative · IG · TikTok · X")}
        ${kpiTile("Brand Compliance", `${dm.violations}`, dm.violations > 0 ? `<span class="ste-pill-err">${dm.violations} to clear</span>` : `<span class="ste-pill-ok">Clean</span>`)}
      </div>

      <div class="ste-grid-2" style="margin-top:18px">
        <div class="ste-card">
          <div class="ste-card-head"><h3>Channel mix</h3><span class="ste-mini">Share of marketing spend</span></div>
          <div class="ste-card-body">${channelDonut}</div>
        </div>
        <div class="ste-card">
          <div class="ste-card-head"><h3>Spend pacing</h3><span class="ste-mini">Quarterly Actual vs Plan</span></div>
          <div class="ste-card-body">${spendChart}</div>
        </div>
      </div>

      <div class="ste-card" style="margin-top:18px">
        <div class="ste-card-head"><h3>SNS quantitative tracking</h3><span class="ste-mini">Monthly cumulative followers — Actual line vs Plan dashed</span></div>
        <div class="ste-card-body">
          <div class="ste-domain-grid">${snsCards}</div>
        </div>
      </div>

      <div class="ste-card" style="margin-top:18px">
        <div class="ste-card-head"><h3>Campaign ROI</h3><span class="ste-mini">Spend and return by campaign</span></div>
        <div class="ste-card-body" style="padding:0">
          <table class="ste-table">
            <thead><tr><th>Campaign</th><th class="ste-num">Spend</th><th class="ste-num">ROI</th><th>Performance</th></tr></thead>
            <tbody>
              ${camps.map(c => `
                <tr>
                  <td>${esc(c.name)}</td>
                  <td class="ste-num">${gbpCompact(c.spend)}</td>
                  <td class="ste-num" style="color:${c.roi >= 3 ? "var(--st-forest)" : c.roi >= 2 ? "var(--st-navy)" : "var(--st-warn)"}">${c.roi}×</td>
                  <td style="width:140px"><div class="ste-analytics-channel-bar"><div style="width:${Math.min(100, c.roi / 5 * 100)}%; background: ${c.roi >= 3 ? "var(--st-forest)" : "var(--st-navy)"}"></div></div></td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  // ============================ LAYOUT RENDERER ============================

  function renderWidgetsGrid(visible, bodies, subs, customize) {
    // Group consecutive widgets into rows. Full-width widgets always take their
    // own row. Wide widgets pair with one half. Two halves pair into a row.
    if (!visible.length) {
      return `<div class="ste-empty" style="padding:48px 24px;text-align:center;color:var(--ste-muted)">All widgets hidden. Click <strong>Customize</strong> above to add them back.</div>`;
    }

    const rows = [];
    let pending = null;
    visible.forEach(w => {
      if (w.size === "full") {
        if (pending) { rows.push([pending]); pending = null; }
        rows.push([w]);
      } else if (w.size === "wide") {
        if (pending) { rows.push([pending]); pending = null; }
        // wide pairs with the next half if available
        rows.push([w, "__WAIT_HALF__"]);
      } else if (w.size === "half") {
        const last = rows[rows.length - 1];
        if (last && last[1] === "__WAIT_HALF__") {
          last[1] = w;
        } else if (pending) {
          rows.push([pending, w]);
          pending = null;
        } else {
          pending = w;
        }
      }
    });
    if (pending) rows.push([pending]);
    // Clean trailing __WAIT_HALF__ marker if no partner was found
    rows.forEach(r => { if (r[1] === "__WAIT_HALF__") r.pop(); });

    return rows.map(row => {
      const isWideRow = row[0] && row[0].size === "wide";
      const isFullRow = row.length === 1 && row[0].size === "full";
      const gridClass = isFullRow ? "ste-analytics-grid ste-analytics-grid-full"
                       : isWideRow ? "ste-analytics-grid ste-analytics-grid-wide"
                       : "ste-analytics-grid ste-analytics-grid-half";
      return `
        <div class="${gridClass}">
          ${row.map(w => renderCard(w, bodies, subs, customize)).join("")}
        </div>`;
    }).join("");
  }

  function renderCard(w, bodies, subs, customize) {
    if (w.key === "kpis") {
      // KPIs render directly (no card wrapper) so the tiles take the full width.
      return `
        <div class="ste-analytics-section">
          <div class="ste-analytics-section-hd">
            <h3>${esc(w.title)}</h3>
            ${customize ? `<button class="ste-analytics-hide" data-hide="${esc(w.key)}" title="Hide">✕</button>` : ''}
          </div>
          ${bodies[w.key]()}
        </div>`;
    }
    return `
      <div class="ste-card ste-analytics-card">
        <div class="ste-card-head">
          <div style="display:flex;flex-direction:column;gap:2px">
            <h3>${esc(w.title)}</h3>
            ${subs[w.key] ? `<span class="ste-mini">${esc(subs[w.key])}</span>` : ''}
          </div>
          ${customize ? `<button class="ste-analytics-hide" data-hide="${esc(w.key)}" title="Hide">✕</button>` : ''}
        </div>
        <div class="ste-card-body">${bodies[w.key]()}</div>
      </div>`;
  }

  // ============================ WIDGET BODIES ============================

  function renderKpiTiles(d) {
    // Avg Compliance is an HQ portfolio metric (one score per licensee across
    // all licensees in scope). For a licensee viewing their own analytics it
    // would just be their own score on themselves — not meaningful — so we
    // omit it on the licensee side. Each remaining tile is also independently
    // hideable via the customize toggle (see KPIS + getKpiLayout).
    const all = [
      { key: "totalSales",      label: "Total Net Sales",         val: gbp(d.totalSales) },
      { key: "totalRoyalty",    label: "Total Royalty",           val: gbp(d.totalRoyalty) },
      { key: "effRoyalty",      label: "Effective Royalty %",     val: d.totalSales ? `${((d.totalRoyalty/d.totalSales)*100).toFixed(1)}<span>%</span>` : "—" },
      { key: "stmtsCount",      label: "Statements in Range",     val: String(d.stmtsCount) },
      ...(d.isHQ ? [{ key: "avgCompliance", label: "Avg Compliance", val: `${d.avgCompliance}<span>/100</span>` }] : []),
      { key: "designPass",      label: "Design Pass Rate",        val: `${d.designPassRate}<span>%</span>` },
      { key: "designsInReview", label: "Designs in HQ Review", val: String(d.designsInReview) },
      { key: "avgRounds",       label: "Sample Avg Rounds",       val: String(d.avgRounds) },
    ];
    const layout = d.kpiLayout || {};
    const visible = all.filter(k => layout[k.key] !== false);
    const hidden  = all.filter(k => layout[k.key] === false);
    return `
      <div class="ste-analytics-kpis">
        ${visible.map(k => `
          <div class="ste-analytics-kpi">
            <span class="ste-mini">${k.label}</span>
            <strong>${k.val}</strong>
            ${d.customize ? `<button class="ste-analytics-hide" data-kpi-hide="${k.key}" title="Hide">✕</button>` : ''}
          </div>`).join("")}
        ${visible.length === 0 ? `<div class="ste-mini" style="padding:12px 0">All KPI tiles hidden. Click a chip below to add one back.</div>` : ''}
      </div>
      ${d.customize && hidden.length ? `
        <div class="ste-analytics-tray" style="margin-top:8px">
          <span class="ste-mini">Hidden KPIs — click to add back</span>
          <div class="ste-analytics-tray-chips">
            ${hidden.map(k => `<button class="ste-analytics-tray-chip" data-kpi-show="${k.key}">＋ ${k.label}</button>`).join("")}
          </div>
        </div>` : ''}
    `;
  }

  function renderTrendChart(rows) {
    if (!rows.length) return emptyChart("No data in the selected range.");
    const W = 640, H = 240, pad = { l: 56, r: 16, t: 16, b: 36 };
    const max = Math.max(...rows.map(r => r.sales)) * 1.1 || 1;
    const colW = (W - pad.l - pad.r) / rows.length;
    const barW = Math.min(28, colW * 0.32);
    const groupW = barW * 2 + 6;
    const groupOffset = (colW - groupW) / 2;
    const yTick = (frac) => pad.t + (H - pad.t - pad.b) * (1 - frac);
    const yVal = (v) => pad.t + (H - pad.t - pad.b) * (1 - (v / max));
    const ticks = [0, 0.25, 0.5, 0.75, 1.0];
    const tickLines = ticks.map(t => `<line x1="${pad.l}" x2="${W - pad.r}" y1="${yTick(t)}" y2="${yTick(t)}" stroke="#e6dfd0" stroke-dasharray="${t === 0 ? '0' : '2,4'}"/>`).join("");
    const tickLabels = ticks.map(t => `<text x="${pad.l - 8}" y="${yTick(t) + 4}" text-anchor="end" class="ste-chart-axis">${gbpCompact(max * t)}</text>`).join("");
    const bars = rows.map((r, i) => {
      const x = pad.l + i * colW + groupOffset;
      const ySales = yVal(r.sales);
      const yRoy = yVal(r.royalty);
      const baseY = pad.t + (H - pad.t - pad.b);
      return `
        <g>
          <rect x="${x}" y="${ySales}" width="${barW}" height="${baseY - ySales}" fill="var(--st-navy,#0b2c4a)" rx="2"/>
          <rect x="${x + barW + 6}" y="${yRoy}" width="${barW}" height="${baseY - yRoy}" fill="var(--ste-accent,#c98722)" rx="2"/>
          <text x="${x + groupW/2}" y="${H - pad.b + 18}" text-anchor="middle" class="ste-chart-axis">${esc(qd(r.quarter))}</text>
          <title>${esc(qd(r.quarter))} · Sales ${gbp(r.sales)} · Royalty ${gbp(r.royalty)}</title>
        </g>`;
    }).join("");
    return `<svg viewBox="0 0 ${W} ${H}" class="ste-chart-svg" preserveAspectRatio="none">${tickLines}${tickLabels}${bars}</svg>`;
  }

  function renderDonutChart(rows) {
    if (!rows.length) return emptyChart("No regional data.");
    const total = rows.reduce((s, r) => s + r.sales, 0);
    if (!total) return emptyChart("No sales yet.");
    const W = 260, H = 240;
    const cx = 130, cy = 116, rOuter = 78, rInner = 50;
    const palette = ["#0b2c4a", "#c98722", "#1d5b94", "#7b4d24", "#8aa6c0", "#d4a76a"];
    let acc = 0;
    const slices = rows.map((r, i) => {
      const frac = r.sales / total;
      const a0 = acc * 2 * Math.PI - Math.PI/2;
      const a1 = (acc + frac) * 2 * Math.PI - Math.PI/2;
      acc += frac;
      const large = frac > 0.5 ? 1 : 0;
      const x0 = cx + rOuter * Math.cos(a0), y0 = cy + rOuter * Math.sin(a0);
      const x1 = cx + rOuter * Math.cos(a1), y1 = cy + rOuter * Math.sin(a1);
      const xi1 = cx + rInner * Math.cos(a1), yi1 = cy + rInner * Math.sin(a1);
      const xi0 = cx + rInner * Math.cos(a0), yi0 = cy + rInner * Math.sin(a0);
      return `<path d="M ${x0} ${y0} A ${rOuter} ${rOuter} 0 ${large} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${rInner} ${rInner} 0 ${large} 0 ${xi0} ${yi0} Z" fill="${palette[i % palette.length]}"><title>${esc(r.region)} · ${gbp(r.sales)} · ${Math.round(frac*100)}%</title></path>`;
    }).join("");
    const legend = rows.map((r, i) => `
      <div class="ste-donut-legend-row">
        <i class="ste-swatch" style="background:${palette[i % palette.length]}"></i>
        <span class="ste-donut-legend-label">${esc(r.region)}</span>
        <span class="ste-donut-legend-val">${Math.round((r.sales/total)*100)}%</span>
      </div>`).join("");
    return `
      <div class="ste-donut-wrap">
        <svg viewBox="0 0 ${W} ${H}" class="ste-chart-svg-fixed">${slices}
          <text x="${cx}" y="${cy - 4}" text-anchor="middle" class="ste-donut-center-val">${gbpCompact(total)}</text>
          <text x="${cx}" y="${cy + 14}" text-anchor="middle" class="ste-chart-axis">Total Sales</text>
        </svg>
        <div class="ste-donut-legend">${legend}</div>
      </div>`;
  }

  function renderHorizontalBars(rows, labelKey, valueKey) {
    if (!rows.length) return emptyChart("No data.");
    const max = Math.max(...rows.map(r => r[valueKey])) || 1;
    return `
      <div class="ste-hbar-list">
        ${rows.map(r => {
          const pct = (r[valueKey] / max) * 100;
          return `
            <div class="ste-hbar-row">
              <div class="ste-hbar-label">${esc(r[labelKey])}</div>
              <div class="ste-hbar-track"><div class="ste-hbar-fill" style="width:${pct}%"></div></div>
              <div class="ste-hbar-val">${gbpCompact(r[valueKey])}</div>
            </div>`;
        }).join("")}
      </div>`;
  }

  function renderRoyaltyVsMG(rows) {
    const valid = rows.filter(r => r.min > 0);
    if (!valid.length) return emptyChart("No minimum-guarantee data.");
    return `
      <div class="ste-mg-list">
        ${valid.map(r => {
          const bar = Math.min(r.pct, 150);
          const tone = r.pct >= 100 ? 'ok' : (r.pct >= 75 ? 'warn' : 'err');
          return `
            <div class="ste-mg-row">
              <div class="ste-mg-label"><strong>${esc(r.name || r.id)}</strong><span class="ste-mini">${esc(r.region)}</span></div>
              <div class="ste-mg-track">
                <div class="ste-mg-fill ste-mg-${tone}" style="width:${(bar/150)*100}%"></div>
                <div class="ste-mg-marker" title="Minimum guarantee"></div>
              </div>
              <div class="ste-mg-val ste-mg-val-${tone}">${r.pct}%</div>
            </div>`;
        }).join("")}
        <div class="ste-mg-axis">
          <span>0%</span>
          <span class="ste-mg-axis-mid">100% · Minimum</span>
          <span>150%</span>
        </div>
      </div>`;
  }

  function renderDesignPassChart(licensees) {
    const rows = (licensees || []).filter(l => typeof l.designPassRate === "number")
      .map(l => ({ id: l.id, name: l.legalName || l.name || l.id, pct: l.designPassRate }))
      .sort((a, b) => b.pct - a.pct);
    if (!rows.length) return emptyChart("No design pass-rate data.");
    return `
      <div class="ste-hbar-list">
        ${rows.map(r => {
          const tone = r.pct >= 85 ? 'ok' : (r.pct >= 65 ? 'warn' : 'err');
          return `
            <div class="ste-hbar-row">
              <div class="ste-hbar-label">${esc(r.name)}</div>
              <div class="ste-hbar-track"><div class="ste-hbar-fill ste-hbar-${tone}" style="width:${r.pct}%"></div></div>
              <div class="ste-hbar-val">${r.pct}%</div>
            </div>`;
        }).join("")}
      </div>`;
  }

  function renderSampleThroughput(d) {
    if (!d.total) return emptyChart("No sample submissions yet.");
    const W = 220, H = 220, cx = 110, cy = 110, r = 78;
    const approvedFrac = d.approved / d.total;
    const circ = 2 * Math.PI * r;
    const dash = approvedFrac * circ;
    return `
      <div class="ste-sample-throughput">
        <svg viewBox="0 0 ${W} ${H}" class="ste-chart-svg-fixed">
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#eee5d2" stroke-width="14"/>
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--ste-ok,#3a8a4f)" stroke-width="14"
            stroke-dasharray="${dash} ${circ - dash}" stroke-dashoffset="${circ * 0.25}" transform="rotate(-90 ${cx} ${cy})"/>
          <text x="${cx}" y="${cy - 2}" text-anchor="middle" class="ste-donut-center-val">${Math.round(approvedFrac * 100)}%</text>
          <text x="${cx}" y="${cy + 16}" text-anchor="middle" class="ste-chart-axis">Approved</text>
        </svg>
        <div class="ste-sample-stats">
          <div><span class="ste-mini">Approved</span><strong>${d.approved}</strong></div>
          <div><span class="ste-mini">In progress</span><strong>${d.inProgress}</strong></div>
          <div><span class="ste-mini">Remade</span><strong>${d.remade}</strong></div>
          <div><span class="ste-mini">Avg rounds</span><strong>${d.avgRounds}</strong></div>
        </div>
      </div>`;
  }

  function renderLicTable(perLic) {
    return `
      <table class="ste-table">
        <thead>
          <tr>
            <th>Licensee</th><th>Region</th><th>Latest Quarter</th>
            <th>Net Sales</th><th>Royalty</th><th>Compliance</th>
            <th>Design Pass</th><th>In HQ Review</th>
          </tr>
        </thead>
        <tbody>
          ${perLic.map(r => `
            <tr>
              <td><div style="display:flex;gap:10px;align-items:center"><span class="ste-mini-avatar">${esc((r.l.legalName || r.l.name || r.l.id).slice(0,2).toUpperCase())}</span><div><strong>${esc(r.l.legalName || r.l.name || r.l.id)}</strong>${r.l.country ? `<div class="ste-mini">${esc(r.l.country)}</div>` : ''}</div></div></td>
              <td>${esc(r.l.country || '')}</td>
              <td>${r.latest ? `<code class="ste-code">${esc(qd(r.latest.quarter))}</code>` : '<span class="ste-mini">—</span>'}</td>
              <td>${gbp(r.lsSales)}</td>
              <td>${gbp(r.lsRoyalty)}</td>
              <td>${r.l.compliance}/100</td>
              <td>${r.designPassRate}%</td>
              <td>${r.ldReview > 0 ? `<span class="ste-badge ste-badge-warn">${r.ldReview}</span>` : '—'}</td>
            </tr>`).join("")}
        </tbody>
      </table>`;
  }

  function emptyChart(msg) {
    return `<div class="ste-empty" style="padding:36px 16px;text-align:center;color:var(--ste-muted);font:500 13px Inter,sans-serif">${esc(msg)}</div>`;
  }

  // ============================ WIRING ============================

  function wireDateRange(sec, range, allQuarters) {
    const wrap = $(".ste-date-range", sec);
    if (!wrap) return;
    const pop = $(".ste-date-range-pop", wrap);
    const btn = $("[data-act='date-toggle']", wrap);

    // Outside-click handler is only active while the popup is open. Without
    // this gating the popup would either never close (no listener) or close
    // immediately on first click (once:true gets used up before re-open).
    function onDocClick(e) {
      if (!wrap.contains(e.target)) closePop();
    }
    function openPop() {
      pop.hidden = false;
      // defer so the open-click itself doesn't immediately trigger close
      setTimeout(() => document.addEventListener("click", onDocClick), 0);
    }
    function closePop() {
      pop.hidden = true;
      document.removeEventListener("click", onDocClick);
    }
    btn?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (pop.hidden) openPop(); else closePop();
    });

    $$("[data-preset]", wrap).forEach(opt => {
      opt.addEventListener("click", () => {
        setDateRange({ preset: opt.getAttribute("data-preset") });
        closePop();
        analytics();
      });
    });
    $("[data-act='apply-custom']", wrap)?.addEventListener("click", () => {
      const from = $("[data-custom='from']", wrap).value;
      const to = $("[data-custom='to']", wrap).value;
      setDateRange({ preset: "custom", from, to });
      closePop();
      analytics();
    });
  }

  function wireCustomize(sec) {
    $("[data-act='toggle-customize']", sec)?.addEventListener("click", () => {
      setCustomizeMode(!getCustomizeMode());
      analytics();
    });
    // HQ licensee scope dropdown — switches between overall and per-licensee views.
    $("[data-analytics-scope]", sec)?.addEventListener("change", (e) => {
      setLicScope(e.target.value);
      analytics();
    });
    $$("[data-hide]", sec).forEach(b => {
      b.addEventListener("click", () => {
        const key = b.getAttribute("data-hide");
        setLayout({ [key]: false });
        analytics();
      });
    });
    $$("[data-show]", sec).forEach(b => {
      b.addEventListener("click", () => {
        const key = b.getAttribute("data-show");
        setLayout({ [key]: true });
        analytics();
      });
    });
    $$("[data-kpi-hide]", sec).forEach(b => {
      b.addEventListener("click", () => {
        setKpiLayout({ [b.getAttribute("data-kpi-hide")]: false });
        analytics();
      });
    });
    $$("[data-kpi-show]", sec).forEach(b => {
      b.addEventListener("click", () => {
        setKpiLayout({ [b.getAttribute("data-kpi-show")]: true });
        analytics();
      });
    });
  }

  // ============================ HELPERS ============================
  function esc(s) { return String(s||"").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c])); }
  function qd(q) { const m = String(q||"").match(/^Q(\d)\s+(\d{4})$/); return m ? `${m[2]} Q${m[1]}` : (q||""); }
  function gbp(v) { return "£" + Math.round(v || 0).toLocaleString(); }
  function gbpCompact(v) {
    const n = v || 0;
    if (n >= 1e9) return "£" + (n/1e9).toFixed(1) + "B";
    if (n >= 1e6) return "£" + (n/1e6).toFixed(1) + "M";
    if (n >= 1e3) return "£" + Math.round(n/1e3) + "k";
    return "£" + Math.round(n);
  }
  function dateRangeLabel(range, allQuarters) {
    if (range.preset === "custom" && range.from && range.to) return `${qd(range.from)} – ${qd(range.to)}`;
    const preset = DATE_PRESETS.find(p => p.key === range.preset);
    return preset ? preset.label : "All time";
  }

  global.STEAnalytics = { analytics };
})(window);
