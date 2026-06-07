/* =========================================================
   ST Licensor Console — Screens A1 (Portfolio) & A2 (Sales & Royalty)
   window.Screens.a1 / .a2
   ========================================================= */
(function () {
  const D = () => window.STEData;
  const ICN = {
    sales: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l5-5 4 4 8-8"/><path d="M14 8h7v7"/></svg>',
    dist: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6"/></svg>',
    inv: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/></svg>',
    mkt: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11v3a1 1 0 0 0 1 1h3l4 4V7L7 11H4a1 1 0 0 0-1 0z"/><path d="M16 8a5 5 0 0 1 0 8"/></svg>',
    clock: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/></svg>',
    check: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>',
    arrow: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    alert: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.7 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0z"/></svg>',
    doc: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>',
    roy: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  };
  const periodLabel = (p) => ({ ytd:'YTD', q1:'Q1', q2:'Q2', q3:'Q3', q4:'Q4', cum1:'Through Q1', cum2:'Through Q2', cum3:'Through Q3', full:'Full Year' }[p] || p) + ' ' + (window.__steYear || '2026');

  /* ============ A1 — Portfolio Overview ============ */
  const SEASON_LABELS = { all:'All Seasons', ss25:'SS25', fw25:'FW25', ss26:'SS26', fw26:'FW26', ss27:'SS27', fw27:'FW27' };

  const a1 = {
    title: (s) => s.mode === 'licensee' ? 'My Overview' : 'Portfolio Overview',
    sub(s) {
      const ent = s.mode === 'licensee' ? D().byId(s.licenseeSelf || 'bbuk') : D().byId(s.entId);
      return `${s.mode === 'licensee' ? 'Licensee A' : ent.code} · ${periodLabel(s.period)} · ${SEASON_LABELS[s.season||'all']} · summary`;
    },
    render(s) {
      const isLicensee = s.mode === 'licensee';
      const ent = isLicensee ? D().byId(s.licenseeSelf || 'bbuk') : D().byId(s.entId);
      const eid = ent.id;
      const sym = UI.curSym(ent);
      const sales = D().salesFor(eid, s.period);
      const dist = D().distributionFor(eid, s.period);
      const inv = D().inventoryFor(eid, s.period);
      const mkt = D().marketingFor(eid, s.period);
      const m = D().money;

      const peerHtml = () => '';

      const hero = (o) => `<div class="card hero" data-go="${o.go}" ${o.gotab?`data-gotab="${o.gotab}"`:''} style="--glow:${o.glow}">
        <div class="h-top">
          <div class="center gap-12">
            <span class="h-ic" style="background:${o.glow};color:${o.color}">${o.icon}</span>
            <span class="h-name">${o.name}</span>
          </div>
          <span class="h-arrow">${ICN.arrow}</span>
        </div>
        <div class="h-val">${o.val}</div>
        <div class="between" style="margin-top:4px;gap:10px">
          <div class="h-cur">${o.cur}</div>
          ${o.peer || ''}
        </div>
        <div class="h-metrics">${o.metrics}</div>
      </div>`;

      const metric = (l, v, cls) => `<div class="h-metric"><div class="ml">${l}</div><div class="mv ${cls||''}" style="${cls==='g'?'color:var(--green)':cls==='r'?'color:var(--red)':''}">${v}</div></div>`;
      const own = '';
      const tierShareMetrics = (tiers) => {
        const rows = (tiers || []).map((t) => ({
          label: String(t.tier || '').replace('Tier ', 'T'),
          count: (t.existing || 0) + (t.nw || 0) - (t.closing || 0),
        }));
        const total = rows.reduce((a, r) => a + r.count, 0) || 1;
        return rows.map((r) => ({ label: r.label, pct: Math.round(r.count / total * 100) }));
      };
      const distTierShare = tierShareMetrics(dist.tiers);
      const distTierMetrics = distTierShare.map((r) => metric(r.label + ' Share', r.pct + '%')).join('');

      const planView = s.view === 'plan';
      const annualRoyMin = ent.annual * 0.40 * 0.10;
      const royEarned = sales.royalty;
      const royPace = annualRoyMin > 0 ? (royEarned / annualRoyMin * 100) : 0;
      const royProj = royEarned * (12 / 5); // YTD→year-end projection
      const planActive = Math.round(dist.active * 1.08);
      const salesMetrics = planView
        ? metric('Achieved', sales.hasActual ? sales.achieved.toFixed(0)+'%' : '—', sales.hasActual ? (sales.achieved>=100?'g':'r') : '') + metric('vs Prior Plan', UI.delta(sales.vsPriorPlan,{}), sales.vsPriorPlan>=0?'g':'r')
        : metric('vs Plan', UI.delta(sales.vsPlan,{}), sales.vsPlan>=0?'g':'r') + metric('vs YoY', UI.delta(sales.vsYoY,{}), sales.vsYoY>=0?'g':'r');
      const royVsPlan = (sales.royalty/sales.royaltyPlan - 1) * 100;
      const royVsYoY = (sales.royalty/sales.royaltyPrior - 1) * 100;
      const royContractTip = encodeURIComponent(JSON.stringify({ title:'Royalty vs Contract', rows:[['Annual Min', m(annualRoyMin,ent).book],['Earned YTD', m(royEarned,ent).book],['Projected Year-End', m(royProj,ent).book+' ('+(royProj/annualRoyMin*100).toFixed(0)+'%)']], src:'Pace vs Annual Royalty Minimum' }));
      const royMetrics = planView
        ? metric('Achieved', sales.hasActual ? (sales.royalty/sales.royaltyPlan*100).toFixed(0)+'%' : '—', sales.hasActual?'g':'') + metric('vs Contract', royPace.toFixed(0)+'%', royPace>=50?'g':'r') + metric('Annual Min', m(annualRoyMin,ent).book)
        : metric('vs Plan', UI.delta(royVsPlan,{}), royVsPlan>=0?'g':'r') + `<div class="h-metric" data-tip="${royContractTip}"><div class="ml">vs Contract</div><div class="mv" style="color:var(--green)">${royPace.toFixed(0)}%</div></div>` + metric('vs YoY', UI.delta(royVsYoY,{}), royVsYoY>=0?'g':'r');

      const heroes = `<div class="grid" style="grid-template-columns:repeat(3,1fr)">
        ${hero({ go:'a2', name:own+'Sales', icon:ICN.sales, color:'var(--accent)', glow:'var(--accent-dim)',
          val: (planView ? m(sales.plan, ent) : m(sales.netSales, ent)).book, cur: (planView?'Planned net sales · ':'Net sales · ')+periodLabel(s.period),
          metrics: salesMetrics })}
        ${hero({ go:'a2', gotab:'royalty', name:own+'Royalty', icon:ICN.roy, color:'#fbbf24', glow:'rgba(251,191,36,0.14)',
          val: (planView ? m(sales.royaltyPlan, ent) : m(sales.royalty, ent)).book, cur: (planView?'Planned royalty · ':'Royalty · ')+periodLabel(s.period),
          metrics: royMetrics })}
        ${hero({ go:'a3', name:own+'Distribution', icon:ICN.dist, color:'var(--cyan)', glow:'rgba(34,211,238,0.14)',
          val: 'Tier Share', cur: dist.active.toLocaleString()+' active doors',
          metrics: distTierMetrics })}
        ${planView
          ? `<div class="card hero" style="opacity:.6"><div class="h-top"><div class="center gap-12"><span class="h-ic" style="background:var(--violet-dim);color:var(--violet)">${ICN.inv}</span><span class="h-name">${own}Inventory</span></div></div><div style="padding:14px 0 6px;color:var(--ink-3);font-size:13px;line-height:1.5">Plan data not applicable for Inventory</div><div class="muted" style="font-size:11px">No committed plan model</div></div>`
          : hero({ go:'a4', name:own+'Inventory', icon:ICN.inv, color:'var(--violet)', glow:'var(--violet-dim)',
          val: m(inv.stockValue, ent).book, cur: 'Stock value · '+periodLabel(s.period),
          metrics: metric('Stk/Sales', inv.stockToSales.toFixed(1)+'mo') + metric('Turn', inv.turn.toFixed(1)+'×') + metric('Aged', inv.aged+'%', inv.aged>20?'r':'') })}
        ${hero({ go:'a5', name:own+'Marketing', icon:ICN.mkt, color:'var(--green)', glow:'var(--green-dim)',
          val: (planView ? m(mkt.spendPlan, ent) : m(mkt.spend, ent)).book, cur: (planView?'Planned campaign budget':'Spend · ROI '+mkt.roi.toFixed(1)+'×'),
          metrics: planView
            ? metric('Achieved', (mkt.spend/mkt.spendPlan*100).toFixed(0)+'%', 'g') + metric('Plan', m(mkt.spendPlan,ent).book) + metric('Campaigns', mkt.camps.length)
            : metric('ROI', mkt.roi.toFixed(1)+'×','g') + metric('Reach', D().compact(mkt.reach)) + metric('Issues', mkt.violations, mkt.violations>0?'r':'g') })}
      </div>`;

      // 8 headline KPIs
      const kpis = D().operationalKPIs(eid, s.period, s.mode);
      const kpiHtml = `<div class="ov-sec"><div><h2>Headline KPIs</h2><div class="ov-sub">${isLicensee?'My operational state':'Portfolio operational state'} · ${periodLabel(s.period)} · ${SEASON_LABELS[s.season||'all']}</div></div></div>
        <div class="kpi-grid-8">${kpis.map(k=>`
          <div class="card kpi kpi-mini" ${k.tip?`data-tip="${encodeURIComponent(JSON.stringify(k.tip))}"`:''}>
            <div class="klabel">${k.label}</div>
            <div class="kval ${k.tone?('tone-'+k.tone):''}">${k.value}${k.unit?`<small>${k.unit}</small>`:''}</div>
            <div class="ksub">${k.sub}</div>
          </div>`).join('')}</div>`;

      // Optional: Licensor rankings
      let rankingsHtml = '';
      if (!isLicensee) {
        const rk = D().rankings(s.period);
        rankingsHtml = `<div class="ov-sec"><div><h2>Per-Licensee Rankings</h2><div class="ov-sub">Net Sales attainment % vs season plan · ranked</div></div></div>
          <div class="card card-pad">
            ${rk.map((r,i)=>`<div class="rank-row">
              <div class="rk">${i+1}</div>
              <div class="rname">${UI.flag(r.ent.flag)}${r.ent.code}</div>
              <div class="minibar"><i style="width:${Math.min(100,r.attain)}%;background:${r.attain>=100?'var(--green)':r.attain>=92?'var(--accent)':'var(--amber)'}"></i></div>
              <div class="rval" style="color:${r.attain>=100?'var(--green)':r.attain>=92?'var(--ink)':'var(--amber)'}">${r.attain}% <span style="color:var(--ink-3)">vs plan</span></div>
            </div>`).join('')}
          </div>`;
      }

      // Quick Mix
      const gm = D().genderMix(eid, s.period), cm = D().customerMix(eid, s.period), tm = D().territoryMix(eid, s.period);
      const quickMixHtml = `<div class="ov-sec"><div><h2>Quick Mix</h2><div class="ov-sub">Click any widget to drill into Sales &amp; Royalty</div></div></div>
        <div class="grid" style="grid-template-columns:repeat(3,1fr)">
          <div class="card card-pad qmix" data-go="a2" data-gotab="net" data-anchor="gender-mix">
            <div class="between"><div class="klabel" style="margin:0">Gender</div><span class="h-arrow">${ICN.arrow}</span></div>
            <div class="flex gap-16 mt-16" style="align-items:center"><div id="qm-gender" style="width:88px;height:88px;flex:0 0 88px"></div>
              <div style="flex:1">${gm.map((x,i)=>`<div class="between" style="font-size:12px;padding:3px 0"><span class="center gap-8"><span style="width:9px;height:9px;border-radius:2px;background:${['#4f8ff7','#a78bfa','#34d399'][i]}"></span>${x.label}</span><b class="mono">${x.val}%</b></div>`).join('')}</div></div>
          </div>
          <div class="card card-pad qmix" data-go="a2" data-gotab="net" data-anchor="customer-type">
            <div class="between"><div class="klabel" style="margin:0">Customer Type</div><span class="h-arrow">${ICN.arrow}</span></div>
            <div class="flex gap-16 mt-16" style="align-items:center"><div id="qm-cust" style="width:88px;height:88px;flex:0 0 88px"></div>
              <div style="flex:1">${cm.map((x,i)=>`<div class="between" style="font-size:12px;padding:3px 0"><span class="center gap-8"><span style="width:9px;height:9px;border-radius:2px;background:${['#4f8ff7','#22d3ee','#a78bfa','#fbbf24'][i]}"></span>${x.label}</span><b class="mono">${x.val}%</b></div>`).join('')}</div></div>
          </div>
          <div class="card card-pad qmix" data-go="a2" data-gotab="net" data-anchor="in-territory">
            <div class="between"><div class="klabel" style="margin:0">In-Territory Compliance</div><span class="h-arrow">${ICN.arrow}</span></div>
            <div class="mt-24"><div class="kval" style="font-size:30px">${tm.inPct}<small style="font-size:14px">%</small></div>
            <div class="minibar mt-8" style="height:8px"><i style="width:${tm.inPct}%;background:var(--green)"></i></div>
            <div class="mt-16 ${tm.outPct<tm.threshold?'':'pill pill-red'}" style="font-size:11.5px;color:${tm.outPct<tm.threshold?'var(--ink-2)':'inherit'};display:inline-flex;${tm.outPct<tm.threshold?'':'padding:3px 9px'}">${tm.outPct<tm.threshold?'':'⚠️ '}Out-of-Territory €${D().compact(tm.outVal)} (${tm.outPct}%)${tm.outPct<tm.threshold?' · within <5% threshold':' · ABOVE threshold'}</div></div>
          </div>
        </div>`;

      // AI Insights
      const insights = D().aiInsights(eid, s.period, s.mode);
      const aiHtml = `<div class="ov-sec"><div><h2>🤖 AI Insights</h2><div class="ov-sub">${(isLicensee?'Licensee A':ent.code)} · ${periodLabel(s.period)} · ${SEASON_LABELS[s.season||'all']} · ${s.view==='plan'?'Plan':'Actual'}</div></div><span class="pill pill-violet"><span class="dot"></span>Auto-generated</span></div>
        <div class="card card-pad"><div style="display:flex;flex-direction:column;gap:12px">
          ${insights.map(t=>`<div class="flex gap-12" style="align-items:flex-start"><span style="width:22px;height:22px;border-radius:6px;background:var(--violet-dim);color:var(--violet);display:inline-flex;align-items:center;justify-content:center;flex:0 0 22px;margin-top:1px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></svg></span><div style="font-size:13.5px;line-height:1.55;color:var(--ink)">${t}</div></div>`).join('')}
        </div></div>`;

      // Performance Highlights
      const ph = D().performanceHighlights(eid, s.period, s.mode);
      const row = (x) => `<div class="action-item qmix" data-go="${x.go}" style="margin-bottom:8px">
        <span style="font-size:10px;font-weight:700;color:var(--ink-3);font-family:var(--mono);width:48px;flex:0 0 48px">${x.kind}</span>
        <div class="ai-txt"><b>${x.name}</b><div class="muted" style="font-size:11px">€${D().compact(x.value)}</div></div>
        <span class="mono" style="font-size:12px;font-weight:700;color:${x.delta>=0?'var(--green)':'var(--red)'}">${x.delta>=0?'+':''}${x.delta}%</span></div>`;
      const perfHtml = `<div class="ov-sec"><div><h2>Performance Highlights</h2><div class="ov-sub">vs plan · ${periodLabel(s.period)}</div></div></div>
        <div class="grid g-2">
          <div class="card card-pad"><div class="klabel" style="margin-bottom:12px;color:var(--green)">🏆 Best Performers</div>${ph.best.map(row).join('')}</div>
          <div class="card card-pad"><div class="klabel" style="margin-bottom:12px;color:var(--amber)">⚠️ Needs Attention</div>${ph.watch.map(row).join('')}</div>
        </div>`;

      return `${heroes}${kpiHtml}${rankingsHtml}${quickMixHtml}${aiHtml}${perfHtml}`;
    },
    init(s) {
      const eid = s.mode === 'licensee' ? (s.licenseeSelf || 'bbuk') : s.entId;
      const gm = D().genderMix(eid, s.period), cm = D().customerMix(eid, s.period);
      const ge = document.getElementById('qm-gender'); if (ge) Charts.donut(ge, gm.map(x=>({label:x.label,value:x.val})), { palette:['#4f8ff7','#a78bfa','#34d399'] });
      const ce = document.getElementById('qm-cust'); if (ce) Charts.donut(ce, cm.map(x=>({label:x.label,value:x.val})), { palette:['#4f8ff7','#22d3ee','#a78bfa','#fbbf24'] });
    },
  };

  /* ============ A2 — Sales & Royalty ============ */
  const SUBVIEWS = [
    { id:'net', label:'Net Sales', icon:ICN.sales },
    { id:'royalty', label:'Royalty', icon:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' },
    { id:'variance', label:'Variance Analysis', icon:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>' },
    { id:'min', label:'vs Contract Minimum', icon:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7L9 18l-5-5"/></svg>' },
  ];

  const a2 = {
    title: 'Sales & Royalty',
    sub: (s) => `${UI.dispCode(s)} · ${periodLabel(s.period)} · ${s.channel ? s.channel[0].toUpperCase()+s.channel.slice(1) : 'All channels'}`,
    render(s) {
      if (window.STESugiSalesRoyalty) {
        return `<div id="ste-sugi-sales-royalty"></div>`;
      }
      const ent = D().byId(s.entId);
      const view = s.a2view || 'net';
      const channel = s.channel || null;
      const d = D().salesFor(s.entId, s.period, channel);
      const m = D().money;
      const sym = UI.curSym(ent);

      const tree = `<div class="card card-pad" style="position:sticky;top:calc(var(--topbar-h) + var(--filter-h) + 20px)">
        <div class="klabel" style="margin-bottom:12px">Analysis</div>
        <div class="subtree">
          ${SUBVIEWS.map(v=>`<div class="st-item ${v.id===view?'active':''}" data-a2view="${v.id}"><span class="ic">${v.icon}</span>${v.label}</div>`).join('')}
        </div>
        <hr class="div" style="margin:16px 0"/>
        <div class="klabel" style="margin-bottom:10px">Price Band</div>
        <div class="seg" style="width:100%">
          <button data-channel="" class="${!channel?'active':''}" style="flex:1">All</button>
          <button data-channel="wholesale" class="${channel==='wholesale'?'active':''}" style="flex:1">Wholesale</button>
          <button data-channel="retail" class="${channel==='retail'?'active':''}" style="flex:1">Retail</button>
        </div>
        <div class="muted" style="font-size:11px;margin-top:10px;line-height:1.5">Toggles one price band at a time. Royalty is computed on net wholesale value.</div>
      </div>`;

      const body = view === 'net' ? netView(s, d, ent, sym)
                 : view === 'royalty' ? royaltyView(s, d, ent, sym)
                 : view === 'variance' ? varianceView(s, d, ent, sym)
                 : minView(s, d, ent, sym);

      return `<div class="grid" style="grid-template-columns:220px 1fr;align-items:start;gap:18px">
        ${tree}
        <div class="col" style="display:flex;flex-direction:column;gap:18px">${body}</div>
      </div>`;
    },
    init(s) {
      if (window.STESugiSalesRoyalty) {
        window.STESugiSalesRoyalty.mount(document.getElementById('ste-sugi-sales-royalty'), s);
        return;
      }
      const view = s.a2view || 'net';
      const ent = D().byId(s.entId);
      const sym = UI.curSym(ent);
      const d = D().salesFor(s.entId, s.period, s.channel || null);
      if (view === 'net' || view === 'royalty') {
        const useRoy = view === 'royalty';
        const chartEl = document.getElementById('a2-main');
        if (chartEl) {
          if (s.period === 'ytd') {
            const mo = d.monthly;
            const data = useRoy
              ? { months: mo.months, actual: mo.actual.map(v=>v==null?null:Math.round(v*0.1)), plan: mo.plan.map(v=>Math.round(v*0.1)), prior: mo.prior.map(v=>Math.round(v*0.1)) }
              : mo;
            Charts.cumulativeLine(chartEl, data, { sym });
          } else {
            const q = d.quarterly;
            const data = useRoy
              ? { q:q.q, actual:q.actual.map(v=>Math.round(v*0.1)), plan:q.plan.map(v=>Math.round(v*0.1)), prior:q.prior.map(v=>Math.round(v*0.1)) }
              : q;
            Charts.groupedBars(chartEl, data, { sym });
          }
        }
        // breakdown
        const dim = s.a2dim || 'category';
        const items = D().breakdown(s.entId, s.period, dim, s.channel||null);
        const bEl = document.getElementById('a2-break');
        if (bEl) Charts.hbars(bEl, items, { sym });
        // mix sections (anchors)
        const gm = D().genderMix(s.entId, s.period), cm = D().customerMix(s.entId, s.period);
        const gE = document.getElementById('a2-gender'); if (gE) Charts.donut(gE, gm.map(x=>({label:x.label,value:x.val})), { palette:['#4f8ff7','#a78bfa','#34d399'] });
        const cE = document.getElementById('a2-cust'); if (cE) Charts.donut(cE, cm.map(x=>({label:x.label,value:x.val})), { palette:['#4f8ff7','#22d3ee','#a78bfa','#fbbf24'] });
      }
      if (view === 'variance') {
        const x = ['Apparel','Footwear','Accessory','Outerwear'];
        const yd = (D().byId(s.entId).aggregate) ? ['UK','France','Germany','Italy','Spain'] : (D().CHANNELS);
        const rng = mulberry(s.entId + s.period);
        const matrix = yd.map(()=>x.map(()=> 78 + Math.round(rng()*44)));
        const hmEl = document.getElementById('a2-heat');
        if (hmEl) Charts.heatmap(hmEl, x, yd, matrix, { min:78, max:122, label:'Plan attainment' });
      }
      if (view === 'min') {
        const chartEl = document.getElementById('a2-main');
        if (chartEl) {
          const mo = d.monthly;
          Charts.cumulativeLine(chartEl, mo, { sym });
        }
      }
    },
  };

  function kpiRow(d, ent, sym) {
    const m = D().money;
    const planView = (D().getContext().view === 'plan');
    if (planView) {
      const achieved = d.hasActual ? (d.netSales/d.plan*100) : null;
      return `<div class="grid g-4">
        ${UI.kpi({ label:'Planned Net Sales', value: m(d.plan,ent).book,
          foot:`<span class="muted" style="font-size:11px">committed plan</span>`,
          tip:{ title:'Planned Net Sales', rows:[['Plan', sym+D().compact(d.plan)],['Prior Plan', sym+D().compact(d.priorPlan)]], src:'Approved Season Sales Plan (3-C)' } })}
        ${UI.kpi({ label:'Achieved %', value: d.hasActual ? achieved.toFixed(0) : '—', unit: d.hasActual?'%':'',
          foot: d.hasActual ? (achieved>=100?'<span class="pill pill-green"><span class="dot"></span>On/ahead of plan</span>':'<span class="pill pill-amber"><span class="dot"></span>Behind plan</span>') : '<span class="muted" style="font-size:11px">no actuals yet</span>',
          tip:{ title:'Achieved', rows: d.hasActual?[['Actual', sym+D().compact(d.netSales)],['Plan', sym+D().compact(d.plan)]]:[['Status','No actuals yet']], src:'Actual ÷ Plan' } })}
        ${UI.kpi({ label:'vs Prior Plan', value:(d.vsPriorPlan>=0?'+':'')+d.vsPriorPlan.toFixed(1), unit:'%',
          foot:`<span class="muted" style="font-size:11px">${sym}${D().compact(d.priorPlan)} prior plan</span>` })}
        ${UI.kpi({ label:'Plan vs Contract Min', value: ((d.plan/d.minForPeriod)*100).toFixed(0), unit:'%',
          foot: (d.plan>=d.minForPeriod? '<span class="pill pill-green"><span class="dot"></span>Above min</span>':'<span class="pill pill-red"><span class="dot"></span>Below min</span>') })}
      </div>`;
    }
    return `<div class="grid g-4">
      ${UI.kpi({ label:'Net Sales', value: m(d.netSales,ent).book,
        foot: UI.delta(d.vsPlan,{})+'<span class="muted" style="font-size:11px">vs plan</span>',
        tip:{ title:'Net Sales · '+ent.code, rows:[['Actual', sym+D().compact(d.netSales)],['Plan', sym+D().compact(d.plan)],['Prior Year', sym+D().compact(d.prior)]], src:'Source: licensee sales statements (validated) · ECB FX' } })}
      ${UI.kpi({ label:'vs Plan', value: (d.vsPlan>=0?'+':'')+d.vsPlan.toFixed(1), unit:'%',
        foot:`<span class="muted" style="font-size:11px">attainment ${(d.netSales/d.plan*100).toFixed(0)}%</span>`,
        tip:{ title:'Plan attainment', rows:[['Actual', sym+D().compact(d.netSales)],['Plan', sym+D().compact(d.plan)],['Gap', sym+D().compact(d.netSales-d.plan)]], src:'Plan: approved Season Sales Plan (3-C)' } })}
      ${UI.kpi({ label:'vs Prior YoY', value:(d.vsYoY>=0?'+':'')+d.vsYoY.toFixed(1), unit:'%',
        foot:`<span class="muted" style="font-size:11px">${sym}${D().compact(d.prior)} prior</span>`,
        tip:{ title:'Year-over-year', rows:[['This year', sym+D().compact(d.netSales)],['Prior year', sym+D().compact(d.prior)]], src:'Prior-year actuals, same period' } })}
      ${UI.kpi({ label:'vs Contract Min', value: d.vsMin.toFixed(0), unit:'%',
        foot: (d.vsMin>=100? '<span class="pill pill-green"><span class="dot"></span>Above min</span>':'<span class="pill pill-red"><span class="dot"></span>Below min</span>'),
        tip:{ title:'Contract minimum', rows:[['Actual', sym+D().compact(d.netSales)],['Minimum (period)', sym+D().compact(d.minForPeriod)]], src:'Comparison figure only — not a chart threshold' } })}
    </div>`;
  }

  function netView(s, d, ent, sym) {
    const isYtd = s.period === 'ytd';
    const dim = s.a2dim || 'category';
    const items = D().breakdown(s.entId, s.period, dim, s.channel||null);
    const m = D().money;
    return `${kpiRow(d, ent, sym)}
      <div class="card card-pad">
        ${UI.sec('Net Sales — '+(isYtd?'YTD cumulative':'quarterly'), 'Actual vs Plan vs Prior Year', legend())}
        <div id="a2-main" class="chart" style="height:320px"></div>
      </div>
      <div class="card card-pad">
        ${UI.sec('Breakdown', 'Plan attainment by '+dim, breakTabs(dim))}
        <div class="grid" style="grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:24px;align-items:center">
          <div id="a2-break" class="chart" style="height:240px;min-width:0"></div>
          <table class="tbl">
            <thead><tr><th>${dim[0].toUpperCase()+dim.slice(1)}</th><th class="num">Net Sales</th><th class="num">Share</th><th class="num">Attain</th></tr></thead>
            <tbody>${items.map(it=>`<tr><td>${it.label}</td><td class="num">${sym}${D().compact(it.value)}</td><td class="num">${it.share.toFixed(0)}%</td><td class="num" style="color:${it.attain>=100?'var(--green)':it.attain>=92?'var(--accent)':'var(--amber)'}">${it.attain}%</td></tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
      ${mixSections(s, d, ent, sym)}`;
  }

  function mixSections(s, d, ent, sym) {
    const gm = D().genderMix(s.entId, s.period), cm = D().customerMix(s.entId, s.period), tm = D().territoryMix(s.entId, s.period);
    return `
      <div class="card card-pad" id="gender-mix">
        ${UI.sec('Gender Mix', 'Net sales split by gender line')}
        <div class="grid" style="grid-template-columns:200px 1fr;gap:24px;align-items:center">
          <div id="a2-gender" class="chart" style="height:180px"></div>
          <table class="tbl"><thead><tr><th>Gender</th><th class="num">Share</th><th class="num">Net Sales</th></tr></thead>
          <tbody>${gm.map(x=>`<tr><td>${x.label}</td><td class="num">${x.val}%</td><td class="num">${sym}${D().compact(d.netSales*x.val/100)}</td></tr>`).join('')}</tbody></table>
        </div>
      </div>
      <div class="card card-pad" id="customer-type">
        ${UI.sec('Customer Type Mix', 'Net sales by channel of trade')}
        <div class="grid" style="grid-template-columns:200px 1fr;gap:24px;align-items:center">
          <div id="a2-cust" class="chart" style="height:180px"></div>
          <table class="tbl"><thead><tr><th>Customer Type</th><th class="num">Share</th><th class="num">Net Sales</th></tr></thead>
          <tbody>${cm.map(x=>`<tr><td>${x.label}</td><td class="num">${x.val}%</td><td class="num">${sym}${D().compact(d.netSales*x.val/100)}</td></tr>`).join('')}</tbody></table>
        </div>
      </div>
      <div class="card card-pad" id="in-territory">
        ${UI.sec('In-Territory vs Out-of-Territory', 'Contractual territory compliance')}
        <div class="flex gap-24" style="align-items:center">
          <div style="flex:1">
            <div class="between" style="font-size:13px;margin-bottom:6px"><span>In-Territory</span><b class="mono">${tm.inPct}% · ${sym}${D().compact(d.netSales*tm.inPct/100)}</b></div>
            <div class="minibar" style="height:10px"><i style="width:${tm.inPct}%;background:var(--green)"></i></div>
            <div class="between" style="font-size:13px;margin:14px 0 6px"><span>Out-of-Territory</span><b class="mono" style="color:${tm.outPct<tm.threshold?'var(--ink)':'var(--red)'}">${tm.outPct}% · ${sym}${D().compact(tm.outVal)}</b></div>
            <div class="minibar" style="height:10px"><i style="width:${Math.max(2,tm.outPct)}%;background:${tm.outPct<tm.threshold?'var(--amber)':'var(--red)'}"></i></div>
          </div>
          <div class="card card-pad" style="flex:0 0 240px;background:${tm.outPct<tm.threshold?'var(--green-dim)':'var(--red-dim)'};border:none">
            <div class="klabel" style="margin:0">Compliance Status</div>
            <div class="kval" style="font-size:22px;margin-top:8px;color:${tm.outPct<tm.threshold?'var(--green)':'var(--red)'}">${tm.outPct<tm.threshold?'Within threshold':'⚠️ Breach'}</div>
            <div class="muted" style="font-size:11.5px;margin-top:4px">Out-of-Territory ${tm.outPct}% vs &lt;${tm.threshold}% allowed</div>
          </div>
        </div>
      </div>`;
  }

  function royaltyView(s, d, ent, sym) {
    const isYtd = s.period === 'ytd';
    const m = D().money;
    const tiers = [
      { band:'€0 – €2.0M', rate:'8%', status:'passed' },
      { band:'€2.0M – €4.0M', rate:'10%', status:'current' },
      { band:'€4.0M +', rate:'12%', status:'upcoming' },
    ];
    return `<div class="grid g-4">
        ${UI.kpi({ label:'Royalty Due', value: m(d.royalty,ent).book, foot:UI.delta(d.vsPlan,{})+'<span class="muted" style="font-size:11px">vs plan</span>',
          tip:{ title:'Royalty due', rows:[['Net sales', sym+D().compact(d.netSales)],['Blended rate','10.0%'],['Royalty', sym+D().compact(d.royalty)]], src:'Master Agreement § 4.2 (tiered)' } })}
        ${UI.kpi({ label:'Effective Rate', value:'10.0', unit:'%', foot:'<span class="muted" style="font-size:11px">tiered blended</span>' })}
        ${UI.kpi({ label:'vs Plan Royalty', value:(d.vsPlan>=0?'+':'')+d.vsPlan.toFixed(1), unit:'%', foot:`<span class="muted" style="font-size:11px">${sym}${D().compact(d.royaltyPlan)} plan</span>` })}
        ${UI.kpi({ label:'vs Contract Min Royalty', value:((d.royalty/d.royaltyMin)*100).toFixed(0), unit:'%',
          foot: d.royalty>=d.royaltyMin?'<span class="pill pill-green"><span class="dot"></span>Above min</span>':'<span class="pill pill-red"><span class="dot"></span>Below min</span>',
          tip:{ title:'Min royalty', rows:[['Royalty due', sym+D().compact(d.royalty)],['Min royalty', sym+D().compact(d.royaltyMin)]], src:'Comparison only' } })}
      </div>
      <div class="card card-pad">
        ${UI.sec('Royalty — '+(isYtd?'YTD cumulative':'quarterly'), 'Actual vs Plan vs Prior Year', legend())}
        <div id="a2-main" class="chart" style="height:300px"></div>
      </div>
      <div class="card card-pad">
        ${UI.sec('Tier Rate Application', 'Cumulative net sales determine the marginal royalty rate')}
        <div class="grid g-3">
          ${tiers.map(t=>`<div class="card card-pad" style="background:${t.status==='current'?'var(--accent-dim)':'var(--panel)'};border-color:${t.status==='current'?'var(--border-3)':'var(--border)'}">
            <div class="between"><span class="klabel" style="margin:0">${t.band}</span>${t.status==='current'?'<span class="pill pill-blue"><span class="dot"></span>Current</span>':t.status==='passed'?'<span class="pill pill-green"><span class="dot"></span>Passed</span>':'<span class="pill pill-gray"><span class="dot"></span>Upcoming</span>'}</div>
            <div class="kval" style="font-size:30px;margin-top:10px">${t.rate}</div>
            <div class="muted" style="font-size:11px;margin-top:4px">marginal royalty rate</div>
          </div>`).join('')}
        </div>
      </div>`;
  }

  function varianceView(s, d, ent, sym) {
    const rng = mulberry(s.entId + s.period + 'v');
    const rows = D().breakdown(s.entId, s.period, 'category', s.channel||null)
      .concat(D().breakdown(s.entId, s.period, s.entId==='total'?'country':'channel', s.channel||null))
      .map(it => ({ ...it, variance: (it.attain-100) }))
      .sort((a,b)=>b.variance-a.variance);
    const top = rows.slice(0,5), bottom = rows.slice(-5).reverse();
    const rowHtml = (r, sign) => `<tr><td>${r.label}</td><td class="num">${sym}${D().compact(r.value)}</td><td class="num" style="color:${r.variance>=0?'var(--green)':'var(--red)'}">${r.variance>=0?'+':''}${r.variance}%</td></tr>`;
    return `<div class="card card-pad">
        ${UI.sec('Plan Attainment Heatmap', (ent.aggregate?'Category × Country':'Category × Channel')+' · % of plan')}
        <div id="a2-heat" class="chart" style="height:300px"></div>
      </div>
      <div class="grid g-2">
        <div class="card card-pad">${UI.sec('Top 5 — Over Plan','Strongest plan beats')}
          <table class="tbl"><thead><tr><th>Segment</th><th class="num">Net Sales</th><th class="num">vs Plan</th></tr></thead><tbody>${top.map(r=>rowHtml(r,1)).join('')}</tbody></table></div>
        <div class="card card-pad">${UI.sec('Bottom 5 — Under Plan','Largest gaps to recover')}
          <table class="tbl"><thead><tr><th>Segment</th><th class="num">Net Sales</th><th class="num">vs Plan</th></tr></thead><tbody>${bottom.map(r=>rowHtml(r,-1)).join('')}</tbody></table></div>
      </div>`;
  }

  function minView(s, d, ent, sym) {
    const m = D().money;
    const att = d.vsMin;
    return `<div class="grid g-3">
        ${UI.kpi({ label:'Actual Net Sales', value:m(d.netSales,ent).book, foot:'' })}
        ${UI.kpi({ label:'Contract Minimum', value:m(d.minForPeriod,ent).book, cur:'period minimum', foot:'' })}
        ${UI.kpi({ label:'Attainment', value:att.toFixed(0), unit:'%', foot: att>=100?'<span class="pill pill-green"><span class="dot"></span>Above minimum</span>':'<span class="pill pill-red"><span class="dot"></span>Below minimum</span>' })}
      </div>
      <div class="card card-pad">
        ${UI.sec('Cumulative Net Sales vs Contract Minimum', 'Comparison figures only — no chart threshold line per spec', legend())}
        <div id="a2-main" class="chart" style="height:300px"></div>
        <div class="card card-pad mt-16" style="background:var(--panel);display:flex;gap:30px;align-items:center">
          <div><div class="klabel" style="margin:0">Headroom over minimum</div><div class="kval" style="font-size:24px;margin-top:6px;color:var(--green)">${sym}${D().compact(d.netSales-d.minForPeriod)}</div></div>
          <div><div class="klabel" style="margin:0">Coverage ratio</div><div class="kval" style="font-size:24px;margin-top:6px">${(d.netSales/d.minForPeriod).toFixed(2)}×</div></div>
          <div class="muted" style="font-size:12px;max-width:320px;line-height:1.5">Per spec, contract minimum is shown as a comparison value only and is intentionally not drawn as a threshold line on the trend chart.</div>
        </div>
      </div>`;
  }

  function legend() {
    return `<div class="legend">
      <span class="lg"><span class="ln" style="border-color:#5b9bff;border-top-width:3px;width:18px"></span>Actual</span>
      <span class="lg"><span class="ln" style="border-color:#76839c;border-top-style:dashed"></span>Plan</span>
      <span class="lg"><span class="ln" style="border-color:#3c465c"></span>Prior Year</span>
    </div>`;
  }
  function breakTabs(dim) {
    const t = [['category','Category'],['channel','Channel'],['country','Country']];
    return `<div class="tabs">${t.map(([id,l])=>`<button data-a2dim="${id}" class="${id===dim?'active':''}">${l}</button>`).join('')}</div>`;
  }
  function breakTabsActive(){}

  // small seeded rng for view-local randomness (stable per entity+period)
  function mulberry(str){ let a=2166136261; for(let i=0;i<str.length;i++){a^=str.charCodeAt(i);a=Math.imul(a,16777619);} a=a>>>0; return function(){ a|=0;a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

  window.Screens = window.Screens || {};
  window.Screens.a1 = a1;
  window.Screens.a2 = a2;
})();
