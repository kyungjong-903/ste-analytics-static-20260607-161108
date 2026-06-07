/* =========================================================
   ST Licensor Console — Chart helpers (ECharts wrappers)
   window.Charts.* — each returns/initializes an ECharts instance
   ========================================================= */
(function () {
  const DARK = {
    actual: '#5b9bff', plan: '#76839c', prior: '#3c465c',
    grid: 'rgba(148,163,184,0.08)', axis: 'rgba(148,163,184,0.18)',
    ink: '#9aa6bd', ink3: '#66708a',
    blue: '#4f8ff7', cyan: '#22d3ee', green: '#34d399', amber: '#fbbf24', red: '#f87171', violet: '#a78bfa',
    tipBg: '#060910', tipBorder: 'rgba(148,163,184,0.20)', tipInk: '#eef2fa',
  };
  const LIGHT = {
    actual: '#2563eb', plan: '#94a3b8', prior: '#cbd5e1',
    grid: 'rgba(15,23,42,0.06)', axis: 'rgba(15,23,42,0.16)',
    ink: '#5b6577', ink3: '#8b94a6',
    blue: '#2563eb', cyan: '#0891b2', green: '#059669', amber: '#d97706', red: '#dc2626', violet: '#7c3aed',
    tipBg: '#1f2937', tipBorder: 'rgba(255,255,255,0.12)', tipInk: '#f9fafb',
  };
  const C = Object.assign({}, DARK);
  let _view = 'actual';
  function setView(v) { _view = v === 'plan' ? 'plan' : 'actual'; }
  function setTheme(isLight) {
    Object.assign(C, isLight ? LIGHT : DARK);
    baseTooltip.backgroundColor = C.tipBg;
    baseTooltip.borderColor = C.tipBorder;
    baseTooltip.textStyle.color = C.tipInk;
  }
  const FONT = "Inter, system-ui, sans-serif";
  const MONO = "'JetBrains Mono', ui-monospace, monospace";

  const registry = new Set();
  function mount(el) {
    if (!el) return null;
    let inst = echarts.getInstanceByDom(el);
    if (inst) inst.dispose();
    inst = echarts.init(el, null, { renderer: 'canvas' });
    registry.add(inst);
    return inst;
  }
  window.addEventListener('resize', () => { registry.forEach(i => { try { i.resize(); } catch (e) {} }); });
  function resizeAll(){ registry.forEach(i => { try { i.resize(); } catch(e){} }); }

  const baseTooltip = {
    backgroundColor: '#060910',
    borderColor: 'rgba(148,163,184,0.20)',
    borderWidth: 1,
    padding: [10, 12],
    textStyle: { color: '#eef2fa', fontFamily: FONT, fontSize: 12 },
    extraCssText: 'border-radius:10px; box-shadow:0 24px 64px rgba(0,0,0,0.5);',
  };
  const baseGrid = { left: 8, right: 16, top: 18, bottom: 6, containLabel: true };

  function axisLabel(extra) { return Object.assign({ color: C.ink3, fontFamily: MONO, fontSize: 10.5 }, extra || {}); }
  function fmtK(v) {
    if (v == null) return '–';
    const a = Math.abs(v);
    if (a >= 1e6) return (v / 1e6).toFixed(1) + 'M';
    if (a >= 1e3) return Math.round(v / 1e3) + 'K';
    return Math.round(v);
  }

  // ---- Cumulative line (Actual / Plan / Prior) ----
  function cumulativeLine(el, data, opts) {
    const inst = mount(el); if (!inst) return null;
    opts = opts || {};
    const sym = opts.sym || '';
    inst.setOption({ animation: false,
      tooltip: Object.assign({}, baseTooltip, {
        trigger: 'axis',
        axisPointer: { type: 'line', lineStyle: { color: 'rgba(148,163,184,0.3)' } },
        formatter: (ps) => {
          let s = `<div style="font-weight:700;margin-bottom:6px">${ps[0].axisValue}</div>`;
          ps.forEach(p => {
            if (p.value == null) return;
            s += `<div style="display:flex;justify-content:space-between;gap:18px;padding:2px 0">
              <span style="color:#9aa6bd">${p.marker} ${p.seriesName}</span>
              <b style="font-family:${MONO}">${sym}${fmtK(p.value)}</b></div>`;
          });
          return s;
        }
      }),
      grid: baseGrid,
      xAxis: {
        type: 'category', data: data.months,
        axisLine: { lineStyle: { color: C.axis } },
        axisTick: { show: false },
        axisLabel: axisLabel(),
        boundaryGap: false,
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: C.grid } },
        axisLabel: axisLabel({ formatter: (v) => sym + fmtK(v) }),
      },
      series: (function(){
        const planMain = _view === 'plan';
        const actualSolid = { name:'Actual', type:'line', data:data.actual, smooth:true, symbol:'circle', symbolSize:6, showSymbol:false, connectNulls:false, lineStyle:{ color:C.actual, width:3 }, itemStyle:{ color:C.actual, borderColor:'#0b1422', borderWidth:2 }, areaStyle:{ color: new echarts.graphic.LinearGradient(0,0,0,1,[{ offset:0, color:hexA(C.actual,0.22) },{ offset:1, color:hexA(C.actual,0.01) }]) }, z:3 };
        const actualRef = { name:'Actual', type:'line', data:data.actual, smooth:true, symbol:'none', connectNulls:false, lineStyle:{ color:C.actual, width:1.5, type:[5,4], opacity:0.5 }, z:2 };
        const planSolid = { name:'Plan', type:'line', data:data.plan, smooth:true, symbol:'none', lineStyle:{ color:C.violet, width:3 }, areaStyle:{ color: new echarts.graphic.LinearGradient(0,0,0,1,[{ offset:0, color:hexA(C.violet,0.18) },{ offset:1, color:hexA(C.violet,0.01) }]) }, z:3 };
        const planRef = { name:'Plan', type:'line', data:data.plan, smooth:true, symbol:'none', lineStyle:{ color:C.plan, width:2, type:[6,5] }, z:2 };
        return [
          { name:'Prior Year', type:'line', data:data.prior, smooth:true, symbol:'none', lineStyle:{ color:C.prior, width:1.5, type:'solid' }, z:1 },
          planMain ? actualRef : planRef,
          planMain ? planSolid : actualSolid,
        ];
      })(),
    });
    return inst;
  }

  // ---- Grouped quarterly bars (Actual / Plan / Prior) ----
  function groupedBars(el, data, opts) {
    const inst = mount(el); if (!inst) return null;
    opts = opts || {};
    const sym = opts.sym || '';
    const planMain = _view === 'plan';
    const series = [
      { name: 'Prior Year', color: C.prior, op: 0.8 },
      { name: 'Plan', color: planMain ? C.violet : C.plan, op: planMain ? 1 : 0.85 },
      { name: 'Actual', color: C.actual, op: planMain ? 0.4 : 1 },
    ];
    const keys = ['prior', 'plan', 'actual'];
    inst.setOption({ animation: false,
      tooltip: Object.assign({}, baseTooltip, {
        trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(148,163,184,0.06)' } },
        formatter: (ps) => {
          let s = `<div style="font-weight:700;margin-bottom:6px">${ps[0].axisValue}</div>`;
          ps.forEach(p => { s += `<div style="display:flex;justify-content:space-between;gap:18px;padding:2px 0"><span style="color:#9aa6bd">${p.marker} ${p.seriesName}</span><b style="font-family:${MONO}">${sym}${fmtK(p.value)}</b></div>`; });
          return s;
        }
      }),
      grid: baseGrid,
      xAxis: { type: 'category', data: data.q, axisLine: { lineStyle: { color: C.axis } }, axisTick: { show: false }, axisLabel: axisLabel({ fontSize: 11 }) },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: C.grid } }, axisLabel: axisLabel({ formatter: (v) => sym + fmtK(v) }) },
      series: series.map((s, i) => ({
        name: s.name, type: 'bar', data: data[keys[i]],
        barGap: '12%', barCategoryGap: '38%',
        itemStyle: { color: s.color, borderRadius: [4, 4, 0, 0], opacity: s.op },
        z: i + 1,
      })),
    });
    return inst;
  }

  // ---- Donut ----
  function donut(el, items, opts) {
    const inst = mount(el); if (!inst) return null;
    opts = opts || {};
    const palette = opts.palette || [C.blue, C.cyan, C.violet, C.green, C.amber, '#64748b'];
    inst.setOption({ animation: false,
      tooltip: Object.assign({}, baseTooltip, { trigger: 'item', formatter: (p) => `${p.marker} <b>${p.name}</b><br/>${p.percent}% · ${opts.sym||''}${fmtK(p.value)}` }),
      series: [{
        type: 'pie', radius: ['58%', '82%'], center: ['50%', '50%'],
        avoidLabelOverlap: true, label: { show: false }, labelLine: { show: false },
        itemStyle: { borderColor: '#0d1422', borderWidth: 2 },
        data: items.map((it, i) => ({ name: it.label, value: it.value, itemStyle: { color: palette[i % palette.length] } })),
      }],
    });
    return inst;
  }

  // ---- Horizontal attainment bars (breakdown) ----
  function hbars(el, items, opts) {
    const inst = mount(el); if (!inst) return null;
    opts = opts || {};
    const sym = opts.sym || '';
    const cats = items.map(i => i.label).reverse();
    const vals = items.map(i => Math.round(i.value)).reverse();
    const attain = items.map(i => i.attain).reverse();
    inst.setOption({ animation: false,
      tooltip: Object.assign({}, baseTooltip, { trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle:{color:'rgba(148,163,184,0.06)'} },
        formatter: (ps) => { const p = ps[0]; const idx = cats.indexOf(p.axisValue); return `<b>${p.axisValue}</b><br/>${sym}${fmtK(p.value)} · plan attain <b style="font-family:${MONO}">${attain[idx]}%</b>`; } }),
      grid: { left: 8, right: 50, top: 8, bottom: 6, containLabel: true },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: C.grid } }, axisLabel: axisLabel({ formatter: (v) => sym + fmtK(v) }) },
      yAxis: { type: 'category', data: cats, axisLine: { lineStyle: { color: C.axis } }, axisTick: { show: false }, axisLabel: { color: C.ink, fontFamily: FONT, fontSize: 12 } },
      series: [{
        type: 'bar', data: vals.map((v, i) => ({ value: v, itemStyle: { color: attain[i] >= 100 ? C.green : attain[i] >= 92 ? C.blue : C.amber } })),
        barWidth: '52%', itemStyle: { borderRadius: [0, 5, 5, 0] },
        label: { show: true, position: 'right', color: C.ink3, fontFamily: MONO, fontSize: 10.5, formatter: (p) => attain[p.dataIndex] + '%' },
      }],
    });
    return inst;
  }

  // ---- Heatmap (Category × Channel/Country attainment) ----
  function heatmap(el, xLabels, yLabels, matrix, opts) {
    const inst = mount(el); if (!inst) return null;
    opts = opts || {};
    const data = [];
    for (let y = 0; y < yLabels.length; y++)
      for (let x = 0; x < xLabels.length; x++)
        data.push([x, y, matrix[y][x]]);
    inst.setOption({ animation: false,
      tooltip: Object.assign({}, baseTooltip, { formatter: (p) => `<b>${yLabels[p.value[1]]} · ${xLabels[p.value[0]]}</b><br/>${opts.label||'Plan attainment'}: <b style="font-family:${MONO}">${p.value[2]}${opts.unit||'%'}</b>` }),
      grid: { left: 8, right: 12, top: 8, bottom: 24, containLabel: true },
      xAxis: { type: 'category', data: xLabels, splitArea: { show: false }, axisLine: { lineStyle: { color: C.axis } }, axisTick: { show: false }, axisLabel: axisLabel({ color: C.ink, fontFamily: FONT, fontSize: 11, interval: 0 }) },
      yAxis: { type: 'category', data: yLabels, splitArea: { show: false }, axisLine: { lineStyle: { color: C.axis } }, axisTick: { show: false }, axisLabel: { color: C.ink, fontFamily: FONT, fontSize: 11 } },
      visualMap: {
        min: opts.min != null ? opts.min : 70, max: opts.max != null ? opts.max : 120, calculable: true,
        orient: 'horizontal', left: 'center', bottom: 0, itemWidth: 12, itemHeight: 90,
        text: [opts.max != null ? String(opts.max) : '120', opts.min != null ? String(opts.min) : '70'],
        textStyle: { color: C.ink3, fontFamily: MONO, fontSize: 10 },
        inRange: { color: ['#3a1d28', '#7a3b2e', '#b08534', '#3f7a4e', '#2f9e6a'] },
      },
      series: [{
        type: 'heatmap', data,
        label: { show: true, color: '#dfe7f2', fontFamily: MONO, fontSize: 10.5, formatter: (p)=> p.value[2] },
        itemStyle: { borderColor: '#0b1220', borderWidth: 3, borderRadius: 4 },
        emphasis: { itemStyle: { borderColor: '#5b9bff', borderWidth: 2 } },
      }],
    });
    return inst;
  }

  // ---- Door cumulative line (single series + bar overlay) ----
  function doorLine(el, months, doorCum) {
    const inst = mount(el); if (!inst) return null;
    inst.setOption({ animation: false,
      tooltip: Object.assign({}, baseTooltip, { trigger: 'axis', axisPointer:{type:'line', lineStyle:{color:'rgba(148,163,184,0.3)'}},
        formatter: (ps)=>{ const p=ps.find(x=>x.value!=null)||ps[0]; return `<b>${p.axisValue}</b><br/>${p.marker} Active doors: <b style="font-family:${MONO}">${p.value??'–'}</b>`; } }),
      grid: baseGrid,
      xAxis: { type:'category', data: months, boundaryGap:false, axisLine:{lineStyle:{color:C.axis}}, axisTick:{show:false}, axisLabel: axisLabel() },
      yAxis: { type:'value', scale:true, splitLine:{lineStyle:{color:C.grid}}, axisLabel: axisLabel() },
      series: [{ name:'Active Doors', type:'line', data: doorCum, smooth:true, symbol:'circle', symbolSize:5, showSymbol:false,
        lineStyle:{color:C.cyan,width:3}, itemStyle:{color:C.cyan,borderColor:'#0b1422',borderWidth:2},
        areaStyle:{ color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'rgba(34,211,238,0.20)'},{offset:1,color:'rgba(34,211,238,0.01)'}]) } }],
    });
    return inst;
  }

  // ---- SNS plan vs actual cumulative (small multiples) ----
  function snsLine(el, months, plan, actual, color) {
    const inst = mount(el); if (!inst) return null;
    inst.setOption({ animation: false,
      tooltip: Object.assign({}, baseTooltip, { trigger:'axis', axisPointer:{type:'line', lineStyle:{color:'rgba(148,163,184,0.3)'}},
        formatter: (ps)=>{ let s=`<div style="font-weight:700;margin-bottom:4px">${ps[0].axisValue}</div>`; ps.forEach(p=>{ if(p.value==null)return; s+=`<div style="display:flex;justify-content:space-between;gap:14px"><span style="color:#9aa6bd">${p.marker}${p.seriesName}</span><b style="font-family:${MONO}">${fmtK(p.value)}</b></div>`; }); return s; } }),
      grid: { left: 6, right: 10, top: 12, bottom: 4, containLabel: true },
      xAxis: { type:'category', data: months, boundaryGap:false, axisLine:{lineStyle:{color:C.axis}}, axisTick:{show:false}, axisLabel: axisLabel({ fontSize: 9.5, interval: 1 }) },
      yAxis: { type:'value', splitLine:{lineStyle:{color:C.grid}}, axisLabel: axisLabel({ formatter:(v)=>fmtK(v), fontSize: 9.5 }) },
      series: [
        { name:'Plan', type:'line', data: plan, smooth:true, symbol:'none', lineStyle:{color:C.plan,width:1.5,type:[5,4]} },
        { name:'Actual', type:'line', data: actual, smooth:true, symbol:'none', lineStyle:{color:color||C.blue,width:2.5},
          areaStyle:{ color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:hexA(color||C.blue,0.18)},{offset:1,color:hexA(color||C.blue,0.01)}]) } },
      ],
    });
    return inst;
  }

  // ---- Spend vs plan quarterly bars ----
  function spendBars(el, q, actual, plan, opts) {
    const inst = mount(el); if (!inst) return null;
    const sym = (opts&&opts.sym)||'';
    inst.setOption({ animation: false,
      tooltip: Object.assign({}, baseTooltip, { trigger:'axis', axisPointer:{type:'shadow', shadowStyle:{color:'rgba(148,163,184,0.06)'}},
        formatter:(ps)=>{ let s=`<div style="font-weight:700;margin-bottom:6px">${ps[0].axisValue}</div>`; ps.forEach(p=>{ s+=`<div style="display:flex;justify-content:space-between;gap:16px"><span style="color:#9aa6bd">${p.marker}${p.seriesName}</span><b style="font-family:${MONO}">${sym}${fmtK(p.value)}</b></div>`; }); return s; } }),
      grid: baseGrid,
      xAxis: { type:'category', data:q, axisLine:{lineStyle:{color:C.axis}}, axisTick:{show:false}, axisLabel: axisLabel({fontSize:11}) },
      yAxis: { type:'value', splitLine:{lineStyle:{color:C.grid}}, axisLabel: axisLabel({formatter:(v)=>sym+fmtK(v)}) },
      series: [
        { name:'Plan', type:'bar', data:plan, itemStyle:{color:C.plan,borderRadius:[4,4,0,0]}, barGap:'10%' },
        { name:'Actual', type:'bar', data:actual, itemStyle:{color:C.violet,borderRadius:[4,4,0,0]} },
      ],
    });
    return inst;
  }

  function hexA(hex, a) {
    const h = hex.replace('#',''); const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
    return `rgba(${r},${g},${b},${a})`;
  }

  window.Charts = { cumulativeLine, groupedBars, donut, hbars, heatmap, doorLine, snsLine, spendBars, resizeAll, setTheme, setView, C, fmtK };
})();
