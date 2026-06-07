/* =========================================================
   ST Licensor Console — Screens A3 (Distribution), A4 (Inventory), A5 (Marketing)
   ========================================================= */
(function () {
  const D = () => window.STEData;
  const periodLabel = (p) => ({ ytd:'YTD', q1:'Q1', q2:'Q2', q3:'Q3', q4:'Q4', cum1:'Through Q1', cum2:'Through Q2', cum3:'Through Q3', full:'Full Year' }[p] || p) + ' ' + (window.__steYear || '2026');

  /* ============ A3 — Distribution ============ */
  const a3 = {
    title: 'Distribution',
    sub: (s) => `${UI.dispCode(s)} · ${periodLabel(s.period)} · door network & accounts`,
    render(s) {
      const ent = D().byId(s.entId);
      const sym = UI.curSym(ent);
      const d = D().distributionFor(s.entId, s.period);
      const m = D().money;
      const tierTotal = d.tiers.reduce((a,t)=>a+t.existing+t.nw,0);

      const kpis = `<div class="grid g-4">
        ${UI.kpi({ label:'Active Doors', value:d.active.toLocaleString(), foot:`<span class="muted" style="font-size:11px">${d.countries.length} countries</span>`,
          tip:{ title:'Active doors', rows:[['Existing', String(d.active-d.newD)],['New', '+'+d.newD],['Closing', '-'+d.closeD]], src:'Door master · monthly account feed' } })}
        ${UI.kpi({ label:'Net Door Δ', value:(d.netDelta>=0?'+':'')+d.netDelta, foot:`<span class="delta ${d.netDelta>=0?'up':'down'}">${d.netDelta>=0?'▲':'▼'} ${d.newD} new · ${d.closeD} closing</span>` })}
        ${UI.kpi({ label:'Revenue / Door', value:m(d.revPerDoor,ent).book, foot:'<span class="muted" style="font-size:11px">period net sales ÷ doors</span>' })}
        ${UI.kpi({ label:'Top 5 Account Conc.', value:d.top5, unit:'%', foot: d.top5>40?'<span class="pill pill-amber"><span class="dot"></span>Concentrated</span>':'<span class="pill pill-green"><span class="dot"></span>Diversified</span>',
          tip:{ title:'Account concentration', rows:[['Top 5 share', d.top5+'%'],['Long tail', (100-d.top5)+'%']], src:'Revenue by account, period' } })}
      </div>`;

      const tierRows = d.tiers.map(t=>{
        const net = t.existing+t.nw-t.closing;
        return `<tr><td><span class="pill ${t.tier==='Tier 1'?'pill-blue':t.tier==='Tier 2'?'pill-violet':'pill-gray'}"><span class="dot"></span>${t.tier}</span></td>
          <td class="num">${t.existing}</td><td class="num" style="color:var(--green)">+${t.nw}</td><td class="num" style="color:var(--red)">-${t.closing}</td><td class="num"><b>${net}</b></td></tr>`;
      }).join('');

      return `${kpis}
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:18px;margin-top:18px;align-items:start">
          <div class="card card-pad">
            ${UI.sec('Account Development by Tier','Existing · New · Closing → Net')}
            <table class="tbl"><thead><tr><th>Tier</th><th class="num">Existing</th><th class="num">New</th><th class="num">Closing</th><th class="num">Net</th></tr></thead><tbody>${tierRows}</tbody></table>
            <hr class="div" style="margin:14px 0"/>
            <div class="klabel" style="margin-bottom:10px">Channel Type Mix</div>
            ${d.channels.map(c=>`<div style="margin-bottom:10px"><div class="between" style="font-size:12px;margin-bottom:4px"><span>${c.label}</span><b class="mono">${c.share}%</b></div><div class="minibar"><i style="width:${c.share}%;background:var(--accent)"></i></div></div>`).join('')}
          </div>
          <div class="card card-pad">
            ${UI.sec('Active Doors — YTD cumulative','Net door movement, Jan–Jun')}
            <div id="a3-doors" class="chart" style="height:200px"></div>
            <hr class="div" style="margin:14px 0"/>
            ${UI.sec('Quarterly Revenue by Door Network','Actual vs Plan vs Prior', legendMini())}
            <div id="a3-rev" class="chart" style="height:200px"></div>
          </div>
        </div>
        <div class="card card-pad" style="margin-top:18px">
          ${UI.sec('Country Distribution','Door count & revenue share by market')}
          <div id="a3-country" class="chart" style="height:240px"></div>
        </div>`;
    },
    init(s) {
      const ent = D().byId(s.entId); const sym = UI.curSym(ent);
      const d = D().distributionFor(s.entId, s.period);
      const dr = document.getElementById('a3-doors'); if (dr) Charts.doorLine(dr, d.months, d.doorCum);
      const rv = document.getElementById('a3-rev'); if (rv) Charts.groupedBars(rv, d.quarterly, { sym });
      const cc = document.getElementById('a3-country');
      if (cc) {
        const rng = mul(s.entId+'cty'); const items = d.countries.map(c=>({ label:c, value: Math.round(d.revPerDoor*d.active*(0.1+rng()*0.4)), attain: 88+Math.round(rng()*26) }));
        Charts.hbars(cc, items, { sym });
      }
    },
  };

  /* ============ A4 — Inventory ============ */
  const a4 = {
    title: 'Inventory',
    sub: (s) => `${UI.dispCode(s)} · ${periodLabel(s.period)} · stock health`,
    render(s) {
      const ent = D().byId(s.entId); const sym = UI.curSym(ent);
      const d = D().inventoryFor(s.entId, s.period);
      const m = D().money;
      const kpis = `<div class="grid g-4">
        ${UI.kpi({ label:'Stock Value', value:m(d.stockValue,ent).book, foot:'<span class="muted" style="font-size:11px">at cost · period end</span>',
          tip:{ title:'Stock value', rows:[['At cost', sym+D().compact(d.stockValue)],['Coverage', d.stockToSales.toFixed(1)+' months']], src:'Licensee inventory feed (EOM)' } })}
        ${UI.kpi({ label:'Stock-to-Sales', value:d.stockToSales.toFixed(1), unit:'mo', foot: d.stockToSales>4?'<span class="pill pill-amber"><span class="dot"></span>High</span>':'<span class="pill pill-green"><span class="dot"></span>Healthy</span>' })}
        ${UI.kpi({ label:'Inventory Turn', value:d.turn.toFixed(1), unit:'×', foot:'<span class="muted" style="font-size:11px">annualised</span>' })}
        ${UI.kpi({ label:'Aged Inventory', value:d.aged, unit:'%', foot: d.aged>20?'<span class="pill pill-red"><span class="dot"></span>Markdown risk</span>':'<span class="pill pill-green"><span class="dot"></span>Under control</span>',
          tip:{ title:'Aged inventory (>2 seasons)', rows:[['Aged share', d.aged+'%'],['Markdown flags', String(d.markdown)]], src:'Season-stamped SKU ageing' } })}
      </div>`;

      const flags = `<div class="grid g-2" style="margin-top:18px">
        <div class="card card-pad" style="border-color:var(--red-dim)">
          <div class="between"><div class="klabel" style="margin:0;color:var(--red)">Stockout Risk</div><span class="kval" style="font-size:22px;color:var(--red)">${d.stockout}</span></div>
          <div class="muted" style="font-size:12px;margin-top:6px">SKUs projected to stock out within the period at current sell-through.</div>
        </div>
        <div class="card card-pad" style="border-color:var(--amber-dim)">
          <div class="between"><div class="klabel" style="margin:0;color:var(--amber)">Markdown Candidates</div><span class="kval" style="font-size:22px;color:var(--amber)">${d.markdown}</span></div>
          <div class="muted" style="font-size:12px;margin-top:6px">Aged lines flagged for markdown review to protect brand price integrity.</div>
        </div>
      </div>`;

      return `${kpis}${flags}
        <div class="grid" style="grid-template-columns:1.2fr 1fr;gap:18px;margin-top:18px;align-items:start">
          <div class="card card-pad">
            ${UI.sec('Category × Season Matrix','Stock value index by category and season')}
            <div id="a4-matrix" class="chart" style="height:280px"></div>
          </div>
          <div class="card card-pad">
            ${UI.sec('Quarterly Stock Snapshot','This year vs prior year', legendYoY())}
            <div id="a4-snap" class="chart" style="height:280px"></div>
          </div>
        </div>
        <div class="card card-pad" style="margin-top:18px">
          ${UI.sec('Inventory Movement','Period flow at cost / value')}
          <div class="grid g-4">
            ${movetile('Inbound', m(d.movement.inbound,ent).book, 'var(--accent)')}
            ${movetile('Sold-Through', m(d.movement.sold,ent).book, 'var(--green)')}
            ${movetile('Returns', m(d.movement.returns,ent).book, 'var(--amber)')}
            ${movetile('Markdown Value', m(d.movement.markdownVal,ent).book, 'var(--red)')}
          </div>
        </div>`;
    },
    init(s) {
      const ent = D().byId(s.entId); const sym = UI.curSym(ent);
      const d = D().inventoryFor(s.entId, s.period);
      const mx = document.getElementById('a4-matrix');
      if (mx) Charts.heatmap(mx, d.seasons, d.categories, d.matrix, { min:0, max:100, label:'Stock value index', unit:'' });
      const sn = document.getElementById('a4-snap');
      if (sn) Charts.groupedBars(sn, { q:d.q, actual:d.snap, plan:d.snap.map((v,i)=>Math.round((d.snap[i]+d.snapPrior[i])/2)), prior:d.snapPrior }, { sym });
    },
  };
  function movetile(l,v,c){ return `<div class="card card-pad" style="background:var(--panel)"><div class="klabel" style="margin:0">${l}</div><div class="kval" style="font-size:22px;margin-top:8px;color:${c}">${v}</div></div>`; }

  /* ============ A5 — Marketing ============ */
  const a5 = {
    title: 'Marketing',
    sub: (s) => `${UI.dispCode(s)} · ${periodLabel(s.period)} · spend, ROI & SNS`,
    render(s) {
      const ent = D().byId(s.entId); const sym = UI.curSym(ent);
      const d = D().marketingFor(s.entId, s.period);
      const m = D().money;
      const kpis = `<div class="grid g-4">
        ${UI.kpi({ label:'Total Spend', value:m(d.spend,ent).book, foot:`<span class="muted" style="font-size:11px">${(d.spend/d.spendPlan*100).toFixed(0)}% of plan</span>`,
          tip:{ title:'Marketing spend', rows:[['Actual', sym+D().compact(d.spend)],['Plan', sym+D().compact(d.spendPlan)]], src:'Campaign ledger · 4% of net sales target' } })}
        ${UI.kpi({ label:'ROI', value:d.roi.toFixed(1), unit:'×', foot: d.roi>=3?'<span class="pill pill-green"><span class="dot"></span>Strong</span>':'<span class="pill pill-amber"><span class="dot"></span>Watch</span>' })}
        ${UI.kpi({ label:'SNS Reach', value:D().compact(d.reach), cur:'cumulative · IG·TikTok·X', foot:'<span class="muted" style="font-size:11px">period reach</span>' })}
        ${UI.kpi({ label:'Brand Compliance', value:d.violations, unit:' issues', foot: d.violations>0?'<span class="pill pill-red"><span class="dot"></span>'+d.violations+' to clear</span>':'<span class="pill pill-green"><span class="dot"></span>Clean</span>' })}
      </div>`;

      const sns = ['Instagram','TikTok','X'];
      const snsColors = { Instagram:'#e1306c', TikTok:'#22d3ee', X:'#9aa6bd' };
      const snsCards = sns.map((p,i)=>{
        const sd = d.sns[p];
        const cur = sd.actual.filter(v=>v!=null).slice(-1)[0]||0;
        return `<div class="card card-pad">
          <div class="between" style="margin-bottom:6px"><div class="center gap-8"><span class="sw" style="width:10px;height:10px;border-radius:3px;background:${snsColors[p]}"></span><b style="font-size:13px">${p}</b></div><span class="muted mono" style="font-size:11px">goal ${D().compact(sd.goal)}</span></div>
          <div class="kval" style="font-size:20px">${D().compact(cur)}<small style="font-size:12px"> / ${D().compact(sd.goal)}</small></div>
          <div class="muted" style="font-size:11px;margin-bottom:8px">${(cur/sd.goal*100).toFixed(0)}% to year-end goal</div>
          <div id="a5-sns-${i}" class="chart" style="height:120px"></div>
        </div>`;
      }).join('');

      const camps = d.camps.slice().sort((a,b)=>b.roi-a.roi);
      return `${kpis}
        <div class="grid" style="grid-template-columns:1.2fr 1fr;gap:18px;margin-top:18px;align-items:start">
          <div class="card card-pad">
            ${UI.sec('Campaign ROI','Spend and return by campaign')}
            <table class="tbl"><thead><tr><th>Campaign</th><th class="num">Spend</th><th class="num">ROI</th><th>Performance</th></tr></thead>
            <tbody>${camps.map(c=>`<tr><td>${c.name}</td><td class="num">${sym}${D().compact(c.spend)}</td><td class="num" style="color:${c.roi>=3?'var(--green)':c.roi>=2?'var(--accent)':'var(--amber)'}">${c.roi.toFixed(1)}×</td><td style="width:120px"><div class="minibar"><i style="width:${Math.min(100,c.roi/5*100)}%;background:${c.roi>=3?'var(--green)':'var(--accent)'}"></i></div></td></tr>`).join('')}</tbody></table>
          </div>
          <div class="card card-pad">
            ${UI.sec('Channel Mix','Share of marketing spend')}
            <div id="a5-mix" class="chart" style="height:200px"></div>
            <div class="legend wrap" style="margin-top:10px;justify-content:center">${d.channelMix.map((c,i)=>`<span class="lg"><span class="sw" style="background:${['#4f8ff7','#22d3ee','#a78bfa','#34d399','#fbbf24','#64748b'][i]}"></span>${c.label} ${c.val}%</span>`).join('')}</div>
          </div>
        </div>
        <div class="between" style="margin:26px 0 12px"><div><h2 style="font-size:15px;font-weight:700;margin:0">SNS Quantitative Tracking</h2><div class="muted" style="font-size:12px;margin-top:3px">Monthly cumulative — Plan vs Actual followers, toward year-end goal</div></div>${legendPlanActual()}</div>
        <div class="grid g-3">${snsCards}</div>
        <div class="card card-pad" style="margin-top:18px">
          ${UI.sec('Spend vs Plan','Quarterly marketing investment pacing', legendSpend())}
          <div id="a5-spend" class="chart" style="height:220px"></div>
        </div>`;
    },
    init(s) {
      const ent = D().byId(s.entId); const sym = UI.curSym(ent);
      const d = D().marketingFor(s.entId, s.period);
      const mix = document.getElementById('a5-mix');
      if (mix) Charts.donut(mix, d.channelMix.map(c=>({label:c.label,value:c.val})), { palette:['#4f8ff7','#22d3ee','#a78bfa','#34d399','#fbbf24','#64748b'], sym:'' });
      ['Instagram','TikTok','X'].forEach((p,i)=>{
        const el = document.getElementById('a5-sns-'+i);
        const colors = { Instagram:'#e1306c', TikTok:'#22d3ee', X:'#9aa6bd' };
        if (el) Charts.snsLine(el, d.months, d.sns[p].plan, d.sns[p].actual, colors[p]);
      });
      const sp = document.getElementById('a5-spend');
      if (sp) Charts.spendBars(sp, d.spendQ.q, d.spendQ.actual, d.spendQ.plan, { sym });
    },
  };

  /* ---- shared mini legends ---- */
  function legendMini(){ return `<div class="legend"><span class="lg"><span class="sw" style="background:#5b9bff"></span>Actual</span><span class="lg"><span class="sw" style="background:#76839c"></span>Plan</span><span class="lg"><span class="sw" style="background:#3c465c"></span>Prior</span></div>`; }
  function legendYoY(){ return `<div class="legend"><span class="lg"><span class="sw" style="background:#5b9bff"></span>This year</span><span class="lg"><span class="sw" style="background:#3c465c"></span>Prior year</span></div>`; }
  function legendPlanActual(){ return `<div class="legend"><span class="lg"><span class="ln" style="border-color:#76839c;border-top-style:dashed"></span>Plan</span><span class="lg"><span class="ln" style="border-color:#5b9bff;border-top-width:3px;width:18px"></span>Actual</span></div>`; }
  function legendSpend(){ return `<div class="legend"><span class="lg"><span class="sw" style="background:#76839c"></span>Plan</span><span class="lg"><span class="sw" style="background:#a78bfa"></span>Actual</span></div>`; }
  function mul(str){ let a=2166136261; for(let i=0;i<str.length;i++){a^=str.charCodeAt(i);a=Math.imul(a,16777619);} a=a>>>0; return function(){ a|=0;a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

  window.Screens = window.Screens || {};
  window.Screens.a3 = a3;
  window.Screens.a4 = a4;
  window.Screens.a5 = a5;
})();
