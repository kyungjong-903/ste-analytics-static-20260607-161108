/* =========================================================
   SUGI France Sales & Royalty PoC native mount.
   Ported from STE_SalesRoyalty_PoC_SUGI_France.html.
   ========================================================= */
(function (global) {
  "use strict";

  let mounted = false;
  let hostState = null;

  function mount(root, nextState) {
    if (!root) return;
    hostState = nextState || hostState;
    syncFromHost();
    const hasHostFilter = !!document.getElementById('ste-sales-filterbar');
    root.innerHTML = `
      <div class="sugi-sales-poc">
        ${hasHostFilter ? '' : '<div class="filterwrap"><div class="filterbar sugi-sales-filterbar" id="filterbar"></div></div>'}
        <div class="tabs" id="tabs"></div>
        <div id="main"></div>
        <div class="footnote">PoC v1.0 · 2026-06-07 · Spec: STE_Analytics_Spec_Sales_Royalty.md + STE_Analytics_MockData_SUGI_France.md</div>
        <div class="toast" id="toast"></div>
      </div>`;
    if (!mounted) {
      mounted = true;
    }
    paint();
  }


  /* =====================================================================
     STE Analytics PoC — Sales & Royalty Detail · Licensee View (SUGI France)
     Data:  STE_Analytics_MockData_SUGI_France.md v1.0  (canonical numbers)
     Spec:  STE_Analytics_Spec_Sales_Royalty.md v1.0
     All money values are €M unless noted. Filter combos recompute from
     fixed monthly series + share tables (reactive per spec §13).
     ===================================================================== */

  /* ---------------- utils ---------------- */
  const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function mulberry(str){let a=2166136261;for(let i=0;i<str.length;i++){a^=str.charCodeAt(i);a=Math.imul(a,16777619);}a=a>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=(t+Math.imul(t^t>>>7,61|t))^t;return((t^t>>>14)>>>0)/4294967296;};}
  function sumR(arr,r){if(!arr)return null;let s=0;for(let i=r[0];i<=r[1];i++)s+=arr[i]||0;return s;}
  function eur(v){if(v==null||!isFinite(v))return'—';const a=Math.abs(v);if(a>=0.9995)return'€'+v.toFixed(1)+'M';return'€'+Math.round(v*1000)+'K';}
  function ratePct(c){return (((c&&c.royRate)||RR)*100).toFixed(1);}
  function pctf(v,d){if(v==null||!isFinite(v))return'—';d=d==null?1:d;return(v>=0?'+':'')+v.toFixed(d)+'%';}
  function delta(v,o){o=o||{};if(v==null||!isFinite(v))return'<span class="delta flat">—</span>';const good=o.invert?v<0:v>=0;const cls=Math.abs(v)<.05?'flat':(good?'up':'down');const arr=v>.05?'▲':(v<-.05?'▼':'—');return '<span class="delta '+cls+'">'+arr+' '+pctf(v)+'</span>';}
  function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),2400);}

  /* ---------------- fixed dataset (MockData spec) ---------------- */
  const RR=0.10;                       // royalty rate — net sales × 10% flat (MockData Patch v1.1)
  const ANNUAL_MIN=2.5;                // annual royalty minimum €2.5M (Patch v1.1)
  const TOT26=13.7;                    // 2026 YTD-May base for share tables

  const YEARS={
    '2024':{actual:[1.6,2.0,2.4,2.9,2.8,2.4,1.8,2.0,2.5,2.8,2.7,2.2],plan:null,prior:null,thru:11},
    '2025':{actual:[1.8,2.3,2.8,3.4,3.1,2.6,1.9,2.2,2.7,3.1,2.9,2.4],plan:[1.7,2.2,2.6,3.2,3.0,2.5,1.8,2.0,2.5,2.9,2.8,2.3],prior:'2024',thru:11},
    '2026':{actual:[1.9,2.4,2.9,3.4,3.1,0,0,0,0,0,0,0],plan:[2.0,2.5,3.0,3.5,3.3,2.7,2.0,2.3,2.8,3.2,3.0,2.5],prior:'2025',thru:4},
  };
  const PR={q1:[0,2],q2:[3,5],q3:[6,8],q4:[9,11],cum1:[0,2],cum2:[0,5],cum3:[0,8],full:[0,11]};
  const PERIOD_LABEL={ytd:'Year-to-Date',q1:'Q1 only',q2:'Q2 only',q3:'Q3 only',q4:'Q4 only',cum1:'Through Q1',cum2:'Through Q2',cum3:'Through Q3',full:'Full Year'};
  const CUM_END={ytd:null,q1:2,q2:5,q3:8,q4:11,cum1:2,cum2:5,cum3:8,full:11};

  const SEASONS={
    ss25:{label:'SS25',a:15.4,p:14.6,prior:13.8,phase:'full',win:[[2025,0],[2025,1],[2025,2],[2025,3],[2025,4],[2025,5],[2025,6]],note:'Jan–Jul 2025 · closed'},
    fw25:{label:'FW25',a:15.8,p:14.9,prior:14.2,phase:'full',win:[[2025,7],[2025,8],[2025,9],[2025,10],[2025,11],[2026,0],[2026,1],[2026,2]],note:'Aug 2025 – Mar 2026 · closed (carryover incl.)'},
    ss26:{label:'SS26',a:11.8,p:15.5,prior:15.4,phase:'inprogress',win:[[2026,0],[2026,1],[2026,2],[2026,3],[2026,4],[2026,5],[2026,6]],note:'Jan–Jul 2026 · in progress (~80%)'},
    fw26:{label:'FW26',a:0,p:17.5,prior:15.8,phase:'future',win:[[2026,7],[2026,8],[2026,9],[2026,10],[2026,11]],note:'Aug 2026 – Mar 2027 · plan only (window clipped at Dec 2026)'},
    ss27:{label:'SS27',a:0,p:null,prior:11.8,phase:'future',win:[],note:'2027 · plan TBD'},
  };
  const SEASON_CONTRIB={
    '2026':[['SS26',86,'in-season · peak'],['FW25',12,'carryover sell-through'],['SS25',2,'clearance']],
    '2025':[['SS25',49,'in-season'],['FW25',32,'launch + build'],['FW24',14,'carryover'],['SS24',5,'clearance']],
    '2024':[['SS24',52,'in-season'],['FW24',36,'launch + build'],['FW23',12,'carryover']],
  };

  const GEO=[
    {c:'France',     r:'france', v:6.8,w:4.90,a:1.90,yoy:5},
    {c:'Germany',    r:'dach',   v:2.4,w:1.70,a:0.70,yoy:-2},
    {c:'Belgium',    r:'benelux',v:1.4,w:1.00,a:0.40,yoy:12},
    {c:'Netherlands',r:'benelux',v:1.0,w:0.70,a:0.30,yoy:3},
    {c:'Switzerland',r:'dach',   v:0.7,w:0.50,a:0.20,yoy:-8},
    {c:'Austria',    r:'dach',   v:0.5,w:0.36,a:0.14,yoy:2},
    {c:'Luxembourg', r:'benelux',v:0.3,w:0.22,a:0.08,yoy:18},
    {c:'Morocco',    r:'na',     v:0.4,w:0.29,a:0.11,yoy:25},
    {c:'Tunisia',    r:'na',     v:0.2,w:0.14,a:0.06,yoy:10},
    {c:'Algeria',    r:'na',     v:0.2,w:0.14,a:0.06,yoy:15},
  ];
  const GEOSUM=GEO.reduce((s,g)=>s+g.v,0); // 13.9 (doc rounding — normalized to live total)
  const REGION_META={france:{label:'France',n:1},dach:{label:'DACH',n:3},benelux:{label:'Benelux',n:3},na:{label:'North Africa',n:3}};
  const REG={all:1,france:6.8/GEOSUM,dach:3.6/GEOSUM,benelux:2.7/GEOSUM,na:0.8/GEOSUM};
  const CHF={all:1,wholesale:0.72,retail:0.18};
  const CH_LABEL={all:'All channels',wholesale:'Wholesale',retail:'Retail'};

  /* 3-level category hierarchy — values = 2026 YTD €M (share base TOT26) */
  const CATTREE=[
   {n:'WEAR',v:9.86,vp:-3.1,vy:8.2,ch:[
     {n:'INNER',v:5.50,vp:4.5,vy:22,ch:[{n:'T SHIRT',v:2.20,vp:3,vy:18},{n:'POLO',v:1.60,vp:9,vy:31},{n:'KNITWEAR',v:0.85,vp:2,vy:12},{n:'FLEECE',v:0.45,vp:-2,vy:8},{n:'DRESS',v:0.20,vp:-5,vy:4},{n:'TRACKTOP',v:0.20,vp:1,vy:9}]},
     {n:'OUTER',v:2.10,vp:-12.4,vy:-6,ch:[{n:'JACKETS',v:1.70,vp:-13,vy:-7},{n:'SKIWEAR',v:0.40,vp:-9,vy:-2}]},
     {n:'BOTTOM',v:1.90,vp:-4.2,vy:3,ch:[{n:'PANTS',v:0.70,vp:-3,vy:4},{n:'SHORTS',v:0.50,vp:-2,vy:6},{n:'TRACKPANTS',v:0.40,vp:-8,vy:-1},{n:'LEGGINGS',v:0.20,vp:-6,vy:2},{n:'SKIRTS',v:0.10,vp:-4,vy:1}]},
     {n:'OTHERS',v:0.36,vp:-2.0,vy:5,ch:[{n:'TRACKSUIT',v:0.36,vp:-2,vy:5}]}]},
   {n:'ACC',v:3.84,vp:-7.0,vy:-3.5,ch:[
     {n:'HEADWEAR',v:1.20,vp:-2,vy:6,ch:[{n:'CAPS',v:0.80,vp:-1,vy:8},{n:'HATS',v:0.30,vp:-4,vy:2},{n:'VISORS',v:0.10,vp:-6,vy:1}]},
     {n:'BAG',v:1.00,vp:-11,vy:-15,ch:[{n:'SPORTS/TENNIS BAGS',v:0.45,vp:-9,vy:-12},{n:'BACKPACKS',v:0.30,vp:-13,vy:-18},{n:'LUGGAGE',v:0.15,vp:-10,vy:-14},{n:'SHOE BAGS',v:0.10,vp:-15,vy:-20}]},
     {n:'SOCKS',v:0.70,vp:-5,vy:2,ch:[{n:'SOCKS',v:0.70,vp:-5,vy:2}]},
     {n:'UNDERWEAR',v:0.50,vp:-8,vy:-2,ch:[{n:'UNDERWEAR',v:0.50,vp:-8,vy:-2}]},
     {n:'OTHERS',v:0.44,vp:-9,vy:-6,ch:[{n:'TOWELS',v:0.15,vp:-7,vy:-4},{n:'SUNGLASSES',v:0.12,vp:-8,vy:-5},{n:'WATCHES',v:0.09,vp:-12,vy:-9},{n:'WRISTBANDS',v:0.08,vp:-10,vy:-8}]}]},
  ];
  const LEVEL_NAME=['CATEGORY','SUB_CATEGORY','PRODUCT CATEGORY'];

  const CUSTOMER=[['Wholesale',72],['Retail',18],['Marketplace',7],['ST Online',3]];
  const GENDER=[['Mens',58],['Womens',36],['Kids',6]];
  const TIERS=[['Tier 1',28],['Tier 2',40],['Tier 3',21],['ST Online',3],['Other',8]];
  const TERR={inPct:98.7,outPct:1.3,threshold:5,euShare:120/180,nonEuShare:60/180};

  const ROY_FIX={prorated:{ytd:0.416,q1:0.25,q2:0.25,q3:0.25,q4:0.25,cum1:0.25,cum2:0.50,cum3:0.75,full:1.0},projection26:3.30};

  /* Top 20 SKU — [sku,name,cat,sub,rev€K,qty,margin%] (representative YTD values) */
  const TOP_SKUS=[
  ['ST-26-001','Classic Polo White','WEAR','INNER · POLO',185,4200,48],
  ['ST-26-014','Heritage Track Top Navy','WEAR','INNER · TRACKTOP',162,3100,46],
  ['ST-26-007','Court Tee Logo','WEAR','INNER · T SHIRT',148,5600,44],
  ['ST-26-021','Piqué Polo Navy','WEAR','INNER · POLO',141,3300,47],
  ['ST-26-002','Crew Tee Essential','WEAR','INNER · T SHIRT',133,5100,43],
  ['ST-26-033','Performance Jacket','WEAR','OUTER · JACKETS',128,1450,41],
  ['ST-26-009','Knit Crew Sweater','WEAR','INNER · KNITWEAR',117,1900,45],
  ['ST-26-018','Logo Cap Classic','ACC','HEADWEAR',104,6900,52],
  ['ST-26-026','Track Pants Tapered','WEAR','BOTTOM · TRACKPANTS',98,2400,42],
  ['ST-26-005','Polo Stripe Retro','WEAR','INNER · POLO',92,2050,46],
  ['ST-26-041','Fleece Half-Zip','WEAR','INNER · FLEECE',88,1700,44],
  ['ST-26-012','Tennis Shorts 7in','WEAR','BOTTOM · SHORTS',84,2800,43],
  ['ST-26-037','Crew Socks 3-pack','ACC','SOCKS',79,8800,55],
  ['ST-26-023','Bucket Hat Terry','ACC','HEADWEAR',72,3400,51],
  ['ST-26-030','Chino Pants Slim','WEAR','BOTTOM · PANTS',69,1500,40],
  ['ST-26-044','Tracksuit Full Set','WEAR','OTHERS · TRACKSUIT',66,700,38],
  ['ST-26-016','Tennis Bag Pro','ACC','BAG',61,800,36],
  ['ST-26-028','Logo Tee Oversized','WEAR','INNER · T SHIRT',58,2300,42],
  ['ST-26-048','Ski Jacket Alpine','WEAR','OUTER · SKIWEAR',55,380,39],
  ['ST-26-035','Backpack Court','ACC','BAG',52,690,37]];
  /* Bottom 20 — [sku,name,cat,sub,rev€K,qty,agedDays] */
  const BOTTOM_SKUS=[
  ['ST-24-118','Legacy Duffle XL','ACC','BAG',1.2,18,310],
  ['ST-24-091','Retro Visor Mesh','ACC','HEADWEAR',1.5,95,287],
  ['ST-25-007','Ski Pants Race','WEAR','OUTER · SKIWEAR',1.8,12,262],
  ['ST-24-130','Watch Classic 38','ACC','OTHERS',2.0,9,255],
  ['ST-25-052','Dress Court Pleat','WEAR','INNER · DRESS',2.2,38,240],
  ['ST-24-077','Wristband Pair','ACC','OTHERS',2.4,420,233],
  ['ST-25-014','Leggings Print','WEAR','BOTTOM · LEGGINGS',2.7,64,221],
  ['ST-24-103','Shoe Bag Logo','ACC','BAG',2.9,160,215],
  ['ST-25-088','Skirt Tennis A-line','WEAR','BOTTOM · SKIRTS',3.1,55,202],
  ['ST-25-031','Towel Court','ACC','OTHERS',3.4,210,190],
  ['ST-24-122','Sunglass Retro','ACC','OTHERS',3.8,40,184],
  ['ST-25-046','Knit Vest Cable','WEAR','INNER · KNITWEAR',4.2,48,176],
  ['ST-25-119','Track Top 80s','WEAR','INNER · TRACKTOP',4.6,52,168],
  ['ST-25-073','Fleece Vest Zip','WEAR','INNER · FLEECE',5.0,61,159],
  ['ST-25-095','Luggage Cabin','ACC','BAG',5.5,11,151],
  ['ST-25-027','Underwear 2-pack','ACC','UNDERWEAR',6.0,330,144],
  ['ST-25-110','Cap Corduroy','ACC','HEADWEAR',6.4,310,138],
  ['ST-25-064','Shorts Woven 5in','WEAR','BOTTOM · SHORTS',6.9,205,131],
  ['ST-25-082','Pants Jogger','WEAR','BOTTOM · PANTS',7.4,150,126],
  ['ST-25-039','Tee Graphic Court','WEAR','INNER · T SHIRT',7.8,290,120]];

  /* Variance ground truth: vs-plan % per segment */
  const VAR_DIMS={
    category:['INNER','OUTER','BOTTOM','HEADWEAR','BAG','SOCKS','UNDERWEAR','OTHERS'],
    country:GEO.map(g=>g.c),
    customer:CUSTOMER.map(c=>c[0]),
    tier:TIERS.map(t=>t[0])};
  const VAR_DIM_LABEL={category:'Category',country:'Country',customer:'Customer Type',tier:'Tier'};
  const VAR_VP={INNER:4.5,OUTER:-12.4,BOTTOM:-4.2,HEADWEAR:-2,BAG:-11,SOCKS:-5,UNDERWEAR:-8,OTHERS:-5.5,
    France:-6,Germany:16.5,Belgium:8,Netherlands:2,Switzerland:-11,Austria:1,Luxembourg:12,Morocco:20,Tunisia:4,Algeria:9,
    Wholesale:-5,Retail:-2,Marketplace:28,'ST Online':12,'Tier 1':3,'Tier 2':-6,'Tier 3':-9,Other:-4};
  const INSIGHTS={
    'WEAR · OUTER':'Reduced floor exposure at key DACH doors','OUTER':'Reduced floor exposure at key DACH doors',
    'ACC · BAG':'Legacy bag line discontinued — replacement lands FW26','BAG':'Legacy bag line discontinued — replacement lands FW26',
    'Tier 3':'Door rationalization in progress','Switzerland':'CHF pricing pressure — repricing under review',
    'France':'Soft wholesale reorders in Q2','UNDERWEAR':'Delisted at two multi-brand chains',
    'Tier 2':'Mid-tier door productivity below plan','SOCKS':'Promo cadence shifted to H2'};

  const YOY_NARR=[
   'Overall growth: <b>+2.0%</b> (€13.7M vs €13.4M · YTD May)',
   'Top positive driver: <b>WEAR · INNER +€500K (+22%)</b> — SS26 Polo line strong sell-through across France & DACH',
   'Top negative driver: <b>ACC · BAG −€120K (−15%)</b> — legacy bag line discontinued',
   'Channel: <b>Marketplace +45% YoY</b> — fastest-growing channel',
   'Region: <b>Benelux +9%</b> leads · Switzerland −8% drags DACH',
   'Season mix: FW25 carryover still contributes <b>12%</b> of YTD sales — SS26 peak months ahead'];
  const YOY_BARS=[['WEAR · INNER',0.50],['Marketplace',0.29],['Benelux',0.18],['HEADWEAR',0.07],['BOTTOM',0.06],['UNDERWEAR',-0.01],['ACC · OTHERS',-0.03],['Switzerland',-0.06],['ACC · BAG',-0.12],['WEAR · OUTER',-0.13],['Wholesale base',-0.46]];
  const DRIVER_LINES=[
   'YTD plan gap <b>−€0.6M</b>: ~50% from <b>WEAR · OUTER</b> underperformance (−€0.30M vs plan)',
   '<b>Germany +€0.34M</b> above plan offsets part of France softness (−€0.43M) — DACH expansion candidate for SS27 planning'];

  /* ---------------- state ---------------- */
  const st={year:'2026',period:'ytd',season:'all',view:'actual',channel:'all',region:'all',tab:'net',drill:[],geoView:'table',varDim:'category',sort:{},invOpen:false};
  const TABS=[['net','Net Sales'],['royalty','Royalty'],['variance','Variance Analysis'],['min','vs Contract Minimum']];

  /* ---------------- compute ---------------- */
  function syncFromHost(){
    if(!hostState)return;
    st.year=hostState.year||st.year;
    st.period=hostState.period||st.period;
    st.season=hostState.season||'all';
    st.view=hostState.view||st.view;
    st.channel=hostState.channel||'all';
  }
  function hostData(){
    const D=global.STEData;
    if(!D||!hostState||!hostState.entId)return null;
    if(D.setContext)D.setContext({season:st.season||'all',year:st.year,view:st.view,axis:st.season==='all'?'calendar':'season'});
    return D.salesFor(hostState.entId,st.period,st.channel==='all'?null:st.channel);
  }
  function contractData(period){
    const D=global.STEData;
    if(!D||!hostState||!hostState.entId)return null;
    if(D.setContext)D.setContext({season:st.season||'all',year:st.year,view:st.view,axis:st.season==='all'?'calendar':'season'});
    return D.salesFor(hostState.entId,period||st.period,null);
  }
  function hostEntity(){
    const D=global.STEData;
    return D&&hostState&&hostState.entId?D.byId(hostState.entId):null;
  }
  function toM(v){return v==null?null:v/1000000;}
  function periodRange(p,y){if(p==='ytd')return[0,YEARS[y].thru];return PR[p];}
  function avail(p,y){if(y!=='2026')return'full';if(['q3','q4','cum3','full'].includes(p))return'none';if(p==='q2'||p==='cum2')return'partial';return'full';}
  function ctx(){
    const f=CHF[st.channel]*REG[st.region];
    const hd=hostData();
    if(hd){
      const rf=REG[st.region]||1;
      const net=toM(hd.netSales)*rf,plan=toM(hd.plan)*rf,prior=toM(hd.prior)*rf,prPlan=toM(hd.priorPlan)*rf;
      const label=(st.season!=='all'&&SEASONS[st.season]?SEASONS[st.season].label+' · Season axis':PERIOD_LABEL[st.period]+' '+st.year);
      const netBase=net/rf;
      return{f,net,plan,prior,prPlan,av:hd.avail,label,netBase,
        hasActual:hd.hasActual,
        vsPlan:hd.vsPlan,
        vsYoY:hd.vsYoY,
        vsPriorPlan:hd.vsPriorPlan,
        achieved:hd.achieved,
        roy:toM(hd.royalty)*rf,royPlan:toM(hd.royaltyPlan)*rf,royPrior:toM(hd.royaltyPrior)*rf,royRate:hd.royaltyRate};
    }
    let net,plan,prior,prPlan=null,av,label;
    if(st.season!=='all'){
      const s=SEASONS[st.season];
      av=s.phase==='full'?'full':(s.phase==='inprogress'?'partial':'none');
      net=s.a*f;plan=s.p!=null?s.p*f:null;prior=s.prior*f;
      label=s.label+' · Season axis';
    }else{
      const Y=YEARS[st.year];const r=periodRange(st.period,st.year);
      av=avail(st.period,st.year);
      net=sumR(Y.actual,r)*f;
      plan=Y.plan?sumR(Y.plan,r)*f:null;
      prior=Y.prior?sumR(YEARS[Y.prior].actual,r)*f:null;
      prPlan=(Y.prior&&YEARS[Y.prior].plan)?sumR(YEARS[Y.prior].plan,r)*f:null;
      label=PERIOD_LABEL[st.period]+' '+st.year;
    }
    const netBase=net/(REG[st.region]||1);
    return{f,net,plan,prior,prPlan,av,label,netBase,
      hasActual:av!=='none',
      vsPlan:plan?(net/plan-1)*100:null,
      vsYoY:prior?(net/prior-1)*100:null,
      vsPriorPlan:(plan&&prPlan)?(plan/prPlan-1)*100:null,
      achieved:(plan&&av!=='none')?net/plan*100:null,
      roy:net*RR,royPlan:plan!=null?plan*RR:null,royPrior:prior!=null?prior*RR:null,royRate:RR};
  }
  function mainSeries(){
    const f=CHF[st.channel]*REG[st.region];
    const hd=hostData();
    if(hd){
      const rf=REG[st.region]||1;
      const toMS=v=>v==null?null:toM(v)*rf;
      if(['q1','q2','q3','q4'].includes(st.period)&&hd.quarterly){
        return{labels:hd.quarterly.q,actual:hd.quarterly.actual.map(toMS),plan:hd.quarterly.plan.map(toMS),prior:hd.quarterly.prior.map(toMS),bars:true};
      }
      if(hd.monthly){
        return{labels:hd.monthly.months,actual:hd.monthly.actual.map(toMS),plan:hd.monthly.plan.map(toMS),prior:hd.monthly.prior.map(toMS)};
      }
    }
    if(st.season!=='all')return seasonSeries(f);
    const Y=YEARS[st.year];
    if(['q1','q2','q3','q4'].includes(st.period)){
      const r=PR[st.period];const labels=[],a=[],p=[],pr=[];
      for(let m=r[0];m<=r[1];m++){labels.push(MONTHS[m]);
        a.push(m<=Y.thru&&Y.actual[m]?+(Y.actual[m]*f).toFixed(3):null);
        p.push(Y.plan?+(Y.plan[m]*f).toFixed(3):null);
        pr.push(Y.prior?+(YEARS[Y.prior].actual[m]*f).toFixed(3):null);}
      return{labels,actual:a,plan:p,prior:pr,bars:true};
    }
    const endIdx={ytd:11,cum1:2,cum2:5,cum3:8,full:11}[st.period];
    const labels=MONTHS.slice(0,endIdx+1);
    const cum=(arr,mask)=>{if(!arr)return labels.map(()=>null);let acc=0;return labels.map((_,i)=>{acc+=arr[i]||0;return(mask&&i>Y.thru)?null:+(acc*f).toFixed(3);});};
    return{labels,actual:cum(Y.actual,true),plan:cum(Y.plan,false),prior:Y.prior?cum(YEARS[Y.prior].actual,false):labels.map(()=>null)};
  }
  function seasonSeries(f){
    const s=SEASONS[st.season];
    if(!s.win.length)return{labels:[],actual:[],plan:[],prior:[],empty:true};
    const labels=s.win.map(w=>MONTHS[w[1]]+String(w[0]).slice(2));
    const rawA=s.win.map(w=>{const Y=YEARS[String(w[0])];return(Y&&w[1]<=Y.thru&&Y.actual[w[1]])?Y.actual[w[1]]:null;});
    const rawP=s.win.map(w=>{const Y=YEARS[String(w[0])];return(Y&&Y.plan)?Y.plan[w[1]]:null;});
    const rawPr=s.win.map(w=>{const Y=YEARS[String(w[0]-1)];return Y?Y.actual[w[1]]:null;});
    const tot=arr=>arr.reduce((x,v)=>x+(v||0),0);
    const ka=(tot(rawA)>0&&s.a)?s.a/tot(rawA):0,kp=(tot(rawP)>0&&s.p)?s.p/tot(rawP):0,kpr=(tot(rawPr)>0&&s.prior)?s.prior/tot(rawPr):0;
    let aA=0,aP=0,aPr=0;
    return{labels,
      actual:rawA.map(v=>{if(v==null)return null;aA+=v*ka*f;return +aA.toFixed(3);}),
      plan:rawP.map(v=>{if(v==null)return null;aP+=v*kp*f;return +aP.toFixed(3);}),
      prior:rawPr.map(v=>{if(v==null)return null;aPr+=v*kpr*f;return +aPr.toFixed(3);})};
  }
  function geoRows(c){
    const list=GEO.filter(g=>st.region==='all'||g.r===st.region);
    return list.map(g=>{const val=g.v/GEOSUM*c.netBase;return {...g,val,wv:val*(g.w/g.v),av:val*(g.a/g.v)};});
  }
  /* contract-level royalty cumulative through selected period end (filters NOT applied) */
  function contractRoy(){
    const hd=contractData();
    if(hd&&hd.annualRoyaltyMin)return toM(hd.royalty);
    const Y=YEARS[st.year];
    const end=st.period==='ytd'?Y.thru:Math.min(CUM_END[st.period]==null?Y.thru:CUM_END[st.period],Y.thru);
    return (sumR(Y.actual,[0,Math.max(0,end)])||0)*RR;
  }

  /* ---------------- echarts plumbing ---------------- */
  let charts=[],initQ=[];
  function mkChart(el,opt){const inst=echarts.init(el,null,{renderer:'canvas'});inst.setOption(opt);charts.push(inst);return inst;}
  function disposeCharts(){charts.forEach(ch=>{try{ch.dispose()}catch(e){}});charts=[];}
  window.addEventListener('resize',()=>charts.forEach(ch=>{try{ch.resize()}catch(e){}}));
  function chart(id,h,fn){initQ.push({id,fn});return '<div id="'+id+'" class="chart" style="height:'+h+'px"></div>';}
  function runCharts(){const q=initQ;initQ=[];q.forEach(it=>{const el=document.getElementById(it.id);if(el){try{it.fn(el)}catch(e){console.error(it.id,e)}}});}

  const TT={backgroundColor:'#1f2937',borderWidth:0,padding:[10,12],textStyle:{color:'#f9fafb',fontSize:12},extraCssText:'border-radius:9px;box-shadow:0 14px 40px rgba(15,23,42,.25);'};
  const AXL={color:'#8b94a6',fontSize:10.5,fontFamily:'ui-monospace,monospace'};
  const GRID={left:8,right:16,top:34,bottom:6,containLabel:true};
  function fade(hex,a1){return{type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:hexA(hex,a1)},{offset:1,color:hexA(hex,0)}]};}
  function hexA(hex,a){const h=hex.replace('#','');return 'rgba('+parseInt(h.slice(0,2),16)+','+parseInt(h.slice(2,4),16)+','+parseInt(h.slice(4,6),16)+','+a+')';}

  function lineChart(el,d,opt){
    opt=opt||{};const planMain=st.view==='plan';const fmt=opt.fmt||eur;
    const mk=(name,data,style)=>Object.assign({name,type:'line',data,smooth:true,symbol:'circle',symbolSize:5,showSymbol:false,connectNulls:false},style);
    const series=[
      mk('Prior Year',d.prior,{lineStyle:{color:'#cbd5e1',width:1.5},itemStyle:{color:'#cbd5e1'},z:1}),
      planMain?mk('Actual',d.actual,{lineStyle:{color:'#16233b',width:1.5,type:[5,4],opacity:.45},itemStyle:{color:'#16233b'},z:2})
              :mk('Plan',d.plan,{lineStyle:{color:'#94a3b8',width:2,type:[6,5]},itemStyle:{color:'#94a3b8'},z:2}),
      planMain?mk('Plan',d.plan,{lineStyle:{color:'#7c3aed',width:3},itemStyle:{color:'#7c3aed'},areaStyle:{color:fade('#7c3aed',.13)},z:3})
              :mk('Actual',d.actual,{lineStyle:{color:'#16233b',width:3},itemStyle:{color:'#16233b'},areaStyle:{color:fade('#16233b',.12)},z:3})];
    mkChart(el,{animation:false,
      legend:{top:0,right:0,itemWidth:18,itemHeight:2,icon:'rect',textStyle:{color:'#5b6577',fontSize:11},data:['Actual','Plan','Prior Year']},
      tooltip:Object.assign({trigger:'axis',axisPointer:{type:'line',lineStyle:{color:'rgba(15,23,42,.25)'}},
        formatter:ps=>{let s='<div style="font-weight:700;margin-bottom:5px">'+ps[0].axisValue+'</div>';const seen={};ps.forEach(p=>{if(p.value==null||seen[p.seriesName])return;seen[p.seriesName]=1;s+='<div style="display:flex;justify-content:space-between;gap:18px"><span>'+p.marker+' '+p.seriesName+'</span><b style="font-family:monospace">'+fmt(p.value)+'</b></div>';});return s;}},TT),
      grid:GRID,
      xAxis:{type:'category',data:d.labels,boundaryGap:false,axisLine:{lineStyle:{color:'rgba(15,23,42,.16)'}},axisTick:{show:false},axisLabel:AXL},
      yAxis:{type:'value',splitLine:{lineStyle:{color:'rgba(15,23,42,.06)'}},axisLabel:Object.assign({},AXL,{formatter:v=>fmt(v)})},
      series});
  }
  function barChart3(el,d,opt){
    opt=opt||{};const planMain=st.view==='plan';const fmt=opt.fmt||eur;
    mkChart(el,{animation:false,
      legend:{top:0,right:0,textStyle:{color:'#5b6577',fontSize:11}},
      tooltip:Object.assign({trigger:'axis',axisPointer:{type:'shadow',shadowStyle:{color:'rgba(15,23,42,.04)'}},
        formatter:ps=>{let s='<div style="font-weight:700;margin-bottom:5px">'+ps[0].axisValue+'</div>';ps.forEach(p=>{if(p.value==null)return;s+='<div style="display:flex;justify-content:space-between;gap:18px"><span>'+p.marker+' '+p.seriesName+'</span><b style="font-family:monospace">'+fmt(p.value)+'</b></div>';});return s;}},TT),
      grid:GRID,
      xAxis:{type:'category',data:d.labels,axisLine:{lineStyle:{color:'rgba(15,23,42,.16)'}},axisTick:{show:false},axisLabel:AXL},
      yAxis:{type:'value',splitLine:{lineStyle:{color:'rgba(15,23,42,.06)'}},axisLabel:Object.assign({},AXL,{formatter:v=>fmt(v)})},
      series:[
        {name:'Prior Year',type:'bar',data:d.prior,itemStyle:{color:'#cbd5e1',borderRadius:[3,3,0,0]}},
        {name:'Plan',type:'bar',data:d.plan,itemStyle:{color:planMain?'#7c3aed':'#94a3b8',borderRadius:[3,3,0,0],opacity:planMain?1:.85}},
        {name:'Actual',type:'bar',data:d.actual,itemStyle:{color:'#16233b',borderRadius:[3,3,0,0],opacity:planMain?.35:1}}]});
  }
  function donut(el,items,palette){
    mkChart(el,{animation:false,
      tooltip:Object.assign({trigger:'item',formatter:p=>p.marker+' <b>'+p.name+'</b><br/>'+p.percent.toFixed(0)+'% · '+eur(p.value)},TT),
      series:[{type:'pie',radius:['56%','82%'],center:['50%','50%'],label:{show:false},labelLine:{show:false},
        itemStyle:{borderColor:'#ffffff',borderWidth:2},
        data:items.map((it,i)=>({name:it.name,value:+it.value.toFixed(3),itemStyle:{color:palette[i%palette.length]}}))}]});
  }
  function hbars(el,items,opt){
    opt=opt||{};
    const rev=items.slice().reverse();
    const inst=mkChart(el,{animation:false,
      tooltip:Object.assign({trigger:'axis',axisPointer:{type:'shadow',shadowStyle:{color:'rgba(15,23,42,.04)'}},
        formatter:ps=>{const p=ps[0];const it=rev[p.dataIndex];let s='<b>'+p.axisValue+'</b><br/>'+eur(it.value);
          if(it.yoy!=null)s+=' · YoY <b style="font-family:monospace">'+pctf(it.yoy)+'</b>';
          if(it.vp!=null)s+=' · vs Plan <b style="font-family:monospace">'+pctf(it.vp)+'</b>';return s;}},TT),
      grid:{left:8,right:86,top:6,bottom:6,containLabel:true},
      xAxis:{type:'value',splitLine:{lineStyle:{color:'rgba(15,23,42,.06)'}},axisLabel:Object.assign({},AXL,{formatter:v=>eur(v)})},
      yAxis:{type:'category',data:rev.map(i=>i.label),axisLine:{lineStyle:{color:'rgba(15,23,42,.16)'}},axisTick:{show:false},axisLabel:{color:'#475569',fontSize:11.5}},
      series:[{type:'bar',barWidth:'56%',
        data:rev.map(it=>({value:+it.value.toFixed(3),itemStyle:{color:it.color||(it.vp!=null?(it.vp>=0?'#2563eb':'#d97706'):'#2563eb'),borderRadius:[0,4,4,0]}})),
        label:{show:true,position:'right',fontSize:10,fontFamily:'ui-monospace,monospace',
          formatter:p=>{const it=rev[p.dataIndex];let s=eur(it.value);if(it.yoy!=null)s+='  '+(it.yoy>=0?'▲':'▼')+Math.abs(it.yoy)+'%';return s;},
          color:'#5b6577'}}]});
    if(opt.onClick)inst.on('click',p=>opt.onClick(p.name));
    return inst;
  }
  function heatAttain(el,xL,yL,matrix){
    const data=[];for(let y=0;y<yL.length;y++)for(let x=0;x<xL.length;x++)if(matrix[y][x]!=null)data.push([x,y,matrix[y][x]]);
    mkChart(el,{animation:false,
      tooltip:Object.assign({formatter:p=>'<b>'+yL[p.value[1]]+' · '+xL[p.value[0]]+'</b><br/>Plan attainment: <b style="font-family:monospace">'+p.value[2]+'%</b>'},TT),
      grid:{left:8,right:14,top:8,bottom:34,containLabel:true},
      xAxis:{type:'category',data:xL,axisLine:{lineStyle:{color:'rgba(15,23,42,.16)'}},axisTick:{show:false},axisLabel:Object.assign({},AXL,{fontSize:11,interval:0})},
      yAxis:{type:'category',data:yL,axisLine:{lineStyle:{color:'rgba(15,23,42,.16)'}},axisTick:{show:false},axisLabel:{color:'#475569',fontSize:11}},
      visualMap:{type:'piecewise',orient:'horizontal',left:'center',bottom:0,itemWidth:11,itemHeight:11,textStyle:{color:'#5b6577',fontSize:10.5},
        pieces:[{max:90,label:'< 90% behind',color:'#f5b0b0'},{min:90,max:110,label:'90–110% on plan',color:'#fbd98e'},{min:110,label:'> 110% ahead',color:'#9fe3bd'}]},
      series:[{type:'heatmap',data,label:{show:true,color:'#1e293b',fontSize:10.5,fontFamily:'ui-monospace,monospace',formatter:p=>p.value[2]},
        itemStyle:{borderColor:'#ffffff',borderWidth:3,borderRadius:4},emphasis:{itemStyle:{borderColor:'#2563eb',borderWidth:2}}}]});
  }
  function heatMoney(el,xL,yL,matrix){
    const data=[];let max=0;for(let y=0;y<yL.length;y++)for(let x=0;x<xL.length;x++){data.push([x,y,+matrix[y][x].toFixed(2)]);max=Math.max(max,matrix[y][x]);}
    mkChart(el,{animation:false,
      tooltip:Object.assign({formatter:p=>'<b>'+yL[p.value[1]]+' · '+xL[p.value[0]]+'</b><br/>Net Sales: <b style="font-family:monospace">'+eur(p.value[2])+'</b>'},TT),
      grid:{left:8,right:14,top:8,bottom:34,containLabel:true},
      xAxis:{type:'category',data:xL,axisLine:{lineStyle:{color:'rgba(15,23,42,.16)'}},axisTick:{show:false},axisLabel:Object.assign({},AXL,{fontSize:11,interval:0})},
      yAxis:{type:'category',data:yL,axisLine:{lineStyle:{color:'rgba(15,23,42,.16)'}},axisTick:{show:false},axisLabel:{color:'#475569',fontSize:11}},
      visualMap:{min:0,max:max||1,calculable:false,orient:'horizontal',left:'center',bottom:0,itemWidth:11,itemHeight:80,textStyle:{color:'#5b6577',fontSize:10},inRange:{color:['#eef3fc','#bcd2f7','#5b8cf0','#2563eb']}},
      series:[{type:'heatmap',data,label:{show:true,fontSize:10,fontFamily:'ui-monospace,monospace',formatter:p=>eur(p.value[2]),color:'#1e293b'},
        itemStyle:{borderColor:'#ffffff',borderWidth:3,borderRadius:4}}]});
  }
  function heatYoy(el,xL,yL,matrix){
    const data=[];for(let y=0;y<yL.length;y++)for(let x=0;x<xL.length;x++)data.push([x,y,+matrix[y][x].toFixed(1)]);
    mkChart(el,{animation:false,
      tooltip:Object.assign({formatter:p=>'<b>'+yL[p.value[1]]+' · '+xL[p.value[0]]+'</b><br/>vs YoY: <b style="font-family:monospace">'+pctf(p.value[2])+'</b>'},TT),
      grid:{left:8,right:14,top:8,bottom:34,containLabel:true},
      xAxis:{type:'category',data:xL,axisLine:{lineStyle:{color:'rgba(15,23,42,.16)'}},axisTick:{show:false},axisLabel:Object.assign({},AXL,{fontSize:11,interval:0})},
      yAxis:{type:'category',data:yL,axisLine:{lineStyle:{color:'rgba(15,23,42,.16)'}},axisTick:{show:false},axisLabel:{color:'#475569',fontSize:11}},
      visualMap:{type:'piecewise',orient:'horizontal',left:'center',bottom:0,itemWidth:11,itemHeight:11,textStyle:{color:'#5b6577',fontSize:10.5},
        pieces:[{max:-0.1,label:'YoY decline',color:'#f5b0b0'},{min:0,max:9.9,label:'0-10% growth',color:'#fbd98e'},{min:10,label:'10%+ growth',color:'#9fe3bd'}]},
      series:[{type:'heatmap',data,label:{show:true,fontSize:10,fontFamily:'ui-monospace,monospace',formatter:p=>pctf(p.value[2]),color:'#1e293b'},
        itemStyle:{borderColor:'#ffffff',borderWidth:3,borderRadius:4}}]});
  }
  function waterfall(el){
    const cats=['2025 YTD','Growth','Decline','2026 YTD'];
    const base=[0,13.4,13.69,0],vals=[13.4,1.10,0.81,13.7];
    const colors=['#94a3b8','#059669','#dc2626','#16233b'];
    mkChart(el,{animation:false,
      tooltip:Object.assign({trigger:'axis',axisPointer:{type:'shadow'},formatter:ps=>{const p=ps[ps.length-1];if(!p)return'';const sign=p.dataIndex===1?'+':p.dataIndex===2?'−':'';return '<b>'+p.axisValue+'</b><br/>'+sign+eur(vals[p.dataIndex]);}},TT),
      grid:{left:8,right:14,top:14,bottom:6,containLabel:true},
      xAxis:{type:'category',data:cats,axisLine:{lineStyle:{color:'rgba(15,23,42,.16)'}},axisTick:{show:false},axisLabel:Object.assign({},AXL,{fontSize:10.5})},
      yAxis:{type:'value',min:12.5,splitLine:{lineStyle:{color:'rgba(15,23,42,.06)'}},axisLabel:Object.assign({},AXL,{formatter:v=>eur(v)})},
      series:[
        {type:'bar',stack:'wf',data:base,itemStyle:{color:'transparent'},emphasis:{itemStyle:{color:'transparent'}},tooltip:{show:false},barWidth:'46%'},
        {type:'bar',stack:'wf',data:vals.map((v,i)=>({value:v,itemStyle:{color:colors[i],borderRadius:3}})),
         label:{show:true,position:'top',fontSize:10,fontFamily:'ui-monospace,monospace',color:'#5b6577',formatter:p=>(p.dataIndex===1?'+':p.dataIndex===2?'−':'')+eur(vals[p.dataIndex])}}]});
  }
  function paceChart(el){
    const hd=contractData();
    if(hd&&hd.annualRoyaltyMin&&hd.monthly){
      const annualMin=toM(hd.annualRoyaltyMin);
      const rate=hd.royaltyRate||RR;
      const act=hd.monthly.actual.map(v=>v==null?null:+(toM(v)*rate).toFixed(3));
      const planLine=hd.monthly.plan.map(v=>v==null?null:+(toM(v)*rate).toFixed(3));
      const minLine=MONTHS.map((_,i)=>+(annualMin*(i+1)/12).toFixed(3));
      mkChart(el,{animation:false,
        legend:{top:0,right:0,itemWidth:18,itemHeight:2,icon:'rect',textStyle:{color:'#5b6577',fontSize:11}},
        tooltip:Object.assign({trigger:'axis',formatter:ps=>{let s='<div style="font-weight:700;margin-bottom:5px">'+ps[0].axisValue+'</div>';ps.forEach(p=>{if(p.value==null)return;s+='<div style="display:flex;justify-content:space-between;gap:18px"><span>'+p.marker+' '+p.seriesName+'</span><b style="font-family:monospace">'+eur(p.value)+'</b></div>';});return s;}},TT),
        grid:GRID,
        xAxis:{type:'category',data:MONTHS,boundaryGap:false,axisLine:{lineStyle:{color:'rgba(15,23,42,.16)'}},axisTick:{show:false},axisLabel:AXL},
        yAxis:{type:'value',splitLine:{lineStyle:{color:'rgba(15,23,42,.06)'}},axisLabel:Object.assign({},AXL,{formatter:v=>eur(v)})},
        series:[
          {name:'Royalty earned (cum.)',type:'line',data:act,smooth:true,symbol:'none',lineStyle:{color:'#16233b',width:3},areaStyle:{color:fade('#16233b',.12)},z:3},
          {name:'Plan royalty',type:'line',data:planLine,smooth:true,symbol:'none',lineStyle:{color:'#94a3b8',width:2,type:[6,5]},z:2},
          {name:'Min pace (€'+annualMin.toFixed(1)+'M / yr)',type:'line',data:minLine,symbol:'none',lineStyle:{color:'#dc2626',width:1.5,type:[3,4]},z:1}]});
      return;
    }
    const Y=YEARS[st.year];const thru=Y.thru;
    let acc=0;const act=MONTHS.map((_,i)=>{if(i>thru)return null;acc+=(Y.actual[i]||0)*RR;return +acc.toFixed(3);});
    const minLine=MONTHS.map((_,i)=>+(ANNUAL_MIN*(i+1)/12).toFixed(3));
    let pacc=0;const planLine=Y.plan?MONTHS.map((_,i)=>{pacc+=Y.plan[i]*RR;return +pacc.toFixed(3);}):MONTHS.map(()=>null);
    mkChart(el,{animation:false,
      legend:{top:0,right:0,itemWidth:18,itemHeight:2,icon:'rect',textStyle:{color:'#5b6577',fontSize:11}},
      tooltip:Object.assign({trigger:'axis',formatter:ps=>{let s='<div style="font-weight:700;margin-bottom:5px">'+ps[0].axisValue+'</div>';ps.forEach(p=>{if(p.value==null)return;s+='<div style="display:flex;justify-content:space-between;gap:18px"><span>'+p.marker+' '+p.seriesName+'</span><b style="font-family:monospace">'+eur(p.value)+'</b></div>';});return s;}},TT),
      grid:GRID,
      xAxis:{type:'category',data:MONTHS,boundaryGap:false,axisLine:{lineStyle:{color:'rgba(15,23,42,.16)'}},axisTick:{show:false},axisLabel:AXL},
      yAxis:{type:'value',splitLine:{lineStyle:{color:'rgba(15,23,42,.06)'}},axisLabel:Object.assign({},AXL,{formatter:v=>eur(v)})},
      series:[
        {name:'Royalty earned (cum.)',type:'line',data:act,smooth:true,symbol:'none',lineStyle:{color:'#16233b',width:3},areaStyle:{color:fade('#16233b',.12)},z:3},
        {name:'Plan royalty',type:'line',data:planLine,smooth:true,symbol:'none',lineStyle:{color:'#94a3b8',width:2,type:[6,5]},z:2},
        {name:'Min pace (€1.0M / yr)',type:'line',data:minLine,symbol:'none',lineStyle:{color:'#dc2626',width:1.5,type:[3,4]},z:1}]});
  }
  function rateLine(el){
    const Y=YEARS[st.year];const thru=Y.thru;
    const rates=MONTHS.map((_,i)=>i<=thru&&Y.actual[i]?10.0:null);
    mkChart(el,{animation:false,
      tooltip:Object.assign({trigger:'axis',formatter:ps=>{const p=ps.find(x=>x.value!=null);return p?('<b>'+p.axisValue+'</b><br/>Effective rate: <b style="font-family:monospace">'+p.value+'%</b>'):'';}},TT),
      grid:{left:8,right:14,top:14,bottom:6,containLabel:true},
      xAxis:{type:'category',data:MONTHS,boundaryGap:false,axisLine:{lineStyle:{color:'rgba(15,23,42,.16)'}},axisTick:{show:false},axisLabel:AXL},
      yAxis:{type:'value',min:0,max:6,splitLine:{lineStyle:{color:'rgba(15,23,42,.06)'}},axisLabel:Object.assign({},AXL,{formatter:v=>v+'%'})},
      series:[{type:'line',data:rates,symbol:'circle',symbolSize:4,lineStyle:{color:'#0891b2',width:2.5},itemStyle:{color:'#0891b2'},areaStyle:{color:fade('#0891b2',.10)}}]});
  }
  function histBars(el){
    const rows=[['2024',112.4],['2025',124.8],['2026 E',132]];
    mkChart(el,{animation:false,
      tooltip:Object.assign({formatter:p=>'<b>'+p.name+'</b><br/>'+p.value+'% of annual minimum'},TT),
      grid:{left:8,right:14,top:14,bottom:6,containLabel:true},
      xAxis:{type:'category',data:rows.map(r=>r[0]),axisLine:{lineStyle:{color:'rgba(15,23,42,.16)'}},axisTick:{show:false},axisLabel:AXL},
      yAxis:{type:'value',max:140,splitLine:{lineStyle:{color:'rgba(15,23,42,.06)'}},axisLabel:Object.assign({},AXL,{formatter:v=>v+'%'})},
      series:[{type:'bar',barWidth:'42%',data:rows.map((r,i)=>({value:r[1],itemStyle:{color:i===2?'#2563eb':'#94a3b8',borderRadius:[4,4,0,0],opacity:i===2?1:.8}})),
        label:{show:true,position:'top',fontSize:10.5,fontFamily:'ui-monospace,monospace',color:'#5b6577',formatter:p=>p.value+'%'},
        markLine:{symbol:'none',label:{formatter:'100% = Min',position:'insideEndTop',fontSize:9.5,color:'#dc2626'},lineStyle:{color:'#dc2626',type:[4,4]},data:[{yAxis:100}]}}]});
  }

  /* ---------------- shared render helpers ---------------- */
  function kpi(label,val,foot){return '<div class="card kpi"><div class="klabel">'+label+'</div><div class="kval">'+val+'</div><div class="kfoot">'+(foot||'')+'</div></div>';}
  function secHead(t,sub,right){return '<div class="spec-sec-head"><div><h3>'+t+'</h3>'+(sub?'<p>'+sub+'</p>':'')+'</div>'+(right||'')+'</div>';}
  function emptyState(title,desc,action){return '<div class="card empty"><div class="ic">◷</div><h2>'+title+'</h2><p>'+desc+'</p>'+(action||'')+'</div>';}
  function gate(c){
    if(st.view==='actual'&&c.av==='none')return emptyState('No actuals yet','Actual data for <b>'+c.label+'</b> will be available after period close. You can review the committed plan now.','<button class="btn btn-primary" data-view="plan">Switch to Plan view</button>');
    if(st.view==='plan'&&c.plan==null)return emptyState('No plan data','No committed plan exists for this selection ('+c.label+').','');
    return null;
  }
  function banner(c){
    if(st.view!=='actual'||c.av!=='partial')return'';
    const seasonAxis=st.season!=='all';
    return '<div class="banner"><span class="ic">⏱</span><div><b>'+(seasonAxis?'Season in progress — sell-through to date':'Period in progress — partial actuals')+'</b><div class="d">Actuals closed through 31 May 2026 · June in progress'+(seasonAxis?' · plan reflects full-season target':'')+'</div></div></div>';
  }
  function sortableTable(tid,cols,rows){
    const s=st.sort[tid];
    let rs=rows;
    if(s){rs=rows.slice().sort((a,b)=>{const x=a[s.key],y=b[s.key];const cv=(typeof x==='number'&&typeof y==='number')?x-y:String(x).localeCompare(String(y));return s.dir==='asc'?cv:-cv;});}
    return '<table class="tbl"><thead><tr>'+cols.map(cc=>'<th class="sortable'+(cc.num?' num':'')+'" data-sortk="'+tid+'|'+cc.k+'">'+cc.l+((s&&s.key===cc.k)?'<span class="arr">'+(s.dir==='asc'?'▲':'▼')+'</span>':'')+'</th>').join('')+'</tr></thead><tbody>'+
      rs.map(r=>'<tr>'+cols.map(cc=>'<td class="'+(cc.num?'num':'')+'">'+(cc.f?cc.f(r):r[cc.k])+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
  }

  /* ---------------- filter bar & tabs ---------------- */
  function licenseeControl(){
    const D=global.STEData;
    if(!hostState||hostState.mode!=='licensor'||!D){
      return '<div class="filter-group"><span class="filter-lab">Scope</span>'+
        '<div class="lic-trigger" style="cursor:default">'+
          '<span class="flag flag-anon"></span>'+
          '<div class="lt"><b>Licensee A</b><small>Auto-scoped to your account</small></div>'+
          '<span class="chev" style="opacity:.5"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></span>'+
        '</div>'+
      '</div>';
    }
    const cur=D.byId(hostState.entId)||D.byId('sugifr');
    return '<div class="filter-group"><span class="f-lab">Licensee</span>'+
      '<div class="lic-select" id="lic-select">'+
        '<div class="lic-trigger" id="lic-trigger">'+
          '<span class="flag '+cur.flag+'"></span>'+
          '<div class="lt"><b>'+cur.code+'</b><small>'+(cur.aggregate?'5 licensees · consolidated':cur.name)+'</small></div>'+
          '<span class="chev"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></span>'+
        '</div>'+
        '<div class="lic-menu" id="lic-menu">'+
          D.ENTITIES.map(e=>'<div class="lic-opt '+(e.aggregate?'total ':'')+(e.id===cur.id?'active':'')+'" data-ent="'+e.id+'">'+
            '<span class="flag '+e.flag+'"></span>'+
            '<div class="lt"><b>'+e.code+'</b><small>'+(e.aggregate?'Portfolio · all 5':e.name+' · '+e.region)+'</small></div>'+
            '<span class="check"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg></span>'+
          '</div>').join('')+
        '</div>'+
      '</div>'+
    '</div>';
  }
  function renderFilter(){
    const seasonOn=st.season!=='all';
    const sel=(id,opts,cur)=>'<select id="'+id+'">'+opts+'</select>';
    const yearOpts=['2025','2026','2027'].map(y=>'<option value="'+y+'"'+(y===st.year?' selected':'')+'>'+y+'</option>').join('');
    const perOpts='<option value="ytd"'+(st.period==='ytd'?' selected':'')+'>Year-to-Date</option>'+
      '<optgroup label="Single Quarter">'+['q1','q2','q3','q4'].map(p=>'<option value="'+p+'"'+(p===st.period?' selected':'')+'>'+PERIOD_LABEL[p]+'</option>').join('')+'</optgroup>'+
      '<optgroup label="Cumulative Through">'+['cum1','cum2','cum3','full'].map(p=>'<option value="'+p+'"'+(p===st.period?' selected':'')+'>'+PERIOD_LABEL[p]+'</option>').join('')+'</optgroup>';
    const seaOpts='<option value="all"'+(st.season==='all'?' selected':'')+'>All Seasons</option>'+Object.keys(SEASONS).map(k=>'<option value="'+k+'"'+(k===st.season?' selected':'')+'>'+SEASONS[k].label+'</option>').join('');
    const seg=(attr,items,cur,sm)=>'<div class="seg'+(sm?' seg-sm':'')+'">'+items.map(it=>'<button data-'+attr+'="'+it[0]+'" class="'+(it[0]===cur?'active':'')+'">'+it[1]+'</button>').join('')+'</div>';
    return licenseeControl()+
      '<div class="f-sep"></div>'+
      '<div class="f-group"><span class="f-lab">Calendar</span>'+sel('f-year',yearOpts,st.year)+sel('f-period',perOpts,st.period)+(seasonOn?'<span class="axis-note">Select calendar to clear season</span>':'')+'</div>'+
      '<div class="f-sep"></div>'+
      '<div class="f-group"><span class="f-lab">Season</span>'+sel('f-season',seaOpts,st.season)+'</div>'+
      '<span style="flex:1"></span>'+
      '<div class="f-group"><span class="f-lab">View</span>'+seg('view',[['actual','Actual'],['plan','Plan']],st.view)+'</div>'+
      '<div class="filter-row-break"></div>'+
      '<div class="f-group"><span class="f-lab">Distribution Channel</span>'+seg('channel',[['all','All'],['wholesale','Wholesale'],['retail','Retail']],st.channel,1)+'</div>';
  }
  function renderTabs(){return TABS.map(t=>'<button data-tab="'+t[0]+'" class="'+(t[0]===st.tab?'active':'')+'">'+t[1]+'</button>').join('');}

  /* ---------------- Net Sales tab ---------------- */
  function kpiRowNet(c){
    if(st.view==='plan'){
      return '<div class="grid g-4">'+
        kpi('Net Sales Plan',eur(c.plan),'<span class="muted">committed plan · '+c.label+'</span>')+
        kpi('Achieved %',c.achieved!=null?c.achieved.toFixed(0)+'<small>%</small>':'—',c.achieved!=null?(c.achieved>=100?'<span class="pill pill-green"><span class="dot"></span>On / ahead of plan</span>':'<span class="pill pill-amber"><span class="dot"></span>Behind plan</span>'):'<span class="muted">no actuals yet</span>')+
        kpi('vs Prior Plan',c.vsPriorPlan!=null?pctf(c.vsPriorPlan):'—','<span class="muted">'+(c.prPlan!=null?eur(c.prPlan)+' prior-year plan':'no prior plan')+'</span>')+
        kpi('Plan Royalty Rate',ratePct(c)+'<small>%</small>','<span class="muted">'+eur(c.royPlan)+' planned royalty</span>')+
        '</div>';
    }
    return '<div class="grid g-4">'+
      kpi('Net Sales',eur(c.net),delta(c.vsPlan)+'<span class="muted">vs plan</span>'+delta(c.vsYoY)+'<span class="muted">vs YoY</span>')+
      kpi('vs Plan %',c.vsPlan!=null?pctf(c.vsPlan):'—','<span class="muted">plan '+eur(c.plan)+' · attainment '+(c.plan?(c.net/c.plan*100).toFixed(0)+'%':'—')+'</span>')+
      kpi('vs YoY %',c.vsYoY!=null?pctf(c.vsYoY):'—','<span class="muted">prior year '+eur(c.prior)+'</span>')+
      kpi('Effective Royalty %',ratePct(c)+'<small>%</small>','<span class="muted">'+eur(c.roy)+' royalty earned</span>')+
      '</div>';
  }
  function catNodes(){
    let nodes=CATTREE,path=[];
    for(const nm of st.drill){const nd=nodes.find(x=>x.n===nm);if(!nd||!nd.ch)break;path.push(nd);nodes=nd.ch;}
    return nodes;
  }
  function netView(c){
    const g=gate(c);if(g)return g;
    const k=c.net/TOT26;             // scale factor for share-based tables
    const ms=mainSeries();
    const geos=geoRows(c);
    const regs=Object.keys(REGION_META).filter(r=>st.region==='all'||r===st.region);
    const contrib=st.season==='all'?SEASON_CONTRIB[st.year]:[[SEASONS[st.season].label,100,'season axis — single season']];
    const nodes=catNodes();const depth=st.drill.length;
    const crumb='<div class="crumbs"><a data-crumb="0">All Categories</a>'+st.drill.map((d,i)=>'<span class="sep">/</span>'+(i===st.drill.length-1?'<span class="cur">'+d+'</span>':'<a data-crumb="'+(i+1)+'">'+d+'</a>')).join('')+'</div>';
    const inOut={inV:c.net*TERR.inPct/100,outV:c.net*TERR.outPct/100};
    const gp=geos.map(gg=>{
      const wearShare=gg.w/Math.max(0.001,gg.v);
      const accShare=gg.a/Math.max(0.001,gg.v);
      const wearYoy=+(gg.yoy+(wearShare-0.72)*18).toFixed(1);
      const accYoy=+(gg.yoy+(accShare-0.28)*18).toFixed(1);
      return{c:gg.c,w:+(gg.wv).toFixed(2),a:+(gg.av).toFixed(2),t:+(gg.val).toFixed(2),yoy:gg.yoy,wy:wearYoy,ay:accYoy};
    });
    const skuNote='<span class="pill pill-gray">representative YTD values · not filter-scaled</span>';
    return banner(c)+kpiRowNet(c)+
    /* main chart */
    '<div class="card card-pad mt-16">'+secHead('Net Sales — '+(ms.bars?'monthly':'cumulative'),'3-line always-on · Actual (navy bold) · Plan (gray dotted) · Prior Year (light gray) · click legend items to toggle')+
      chart('a2-main',320,el=>ms.bars?barChart3(el,ms):lineChart(el,ms))+
    '</div>'+
    /* C-1 + C-3 */
    '<div class="grid g-2 mt-16">'+
      '<div class="card card-pad">'+secHead('Season Contribution','Seasons contributing to '+c.label+' net sales')+
        '<div style="display:grid;grid-template-columns:180px minmax(260px,1fr);gap:24px;align-items:center">'+chart('c1-season',180,el=>donut(el,contrib.map(s=>({name:s[0],value:c.net*s[1]/100})),['#2563eb','#0891b2','#7c3aed','#94a3b8']))+
        '<div style="min-width:0">'+contrib.map((s,i)=>'<div style="display:grid;grid-template-columns:minmax(0,1fr) max-content;gap:14px;align-items:center;font-size:12.5px;padding:6px 0;border-bottom:1px solid var(--panel-2)"><span class="center gap-8" style="min-width:0"><span style="width:9px;height:9px;border-radius:2px;background:'+['#2563eb','#0891b2','#7c3aed','#94a3b8'][i]+'"></span><b>'+s[0]+'</b><span class="muted" style="font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+s[2]+'</span></span><span class="mono" style="white-space:nowrap;text-align:right">'+s[1]+'% · '+eur(c.net*s[1]/100)+'</span></div>').join('')+'</div></div>'+
      '</div>'+
      '<div class="card card-pad">'+secHead('Net Sales by Territory','Authorized territory · 10 countries in 4 regions')+
        '<table class="tbl"><thead><tr><th>Region</th><th class="num">Countries</th><th class="num">Net Sales</th><th class="num">Share</th></tr></thead><tbody>'+
        regs.map(r=>{const v=REG[r]*c.netBase;return '<tr><td><b>'+REGION_META[r].label+'</b></td><td class="num">'+REGION_META[r].n+'</td><td class="num">'+eur(v)+'</td><td class="num">'+(v/c.netBase*100).toFixed(0)+'%</td></tr>';}).join('')+
        '<tr><td><b>Total</b></td><td class="num">'+regs.reduce((s,r)=>s+REGION_META[r].n,0)+'</td><td class="num"><b>'+eur(regs.reduce((s,r)=>s+REG[r]*c.netBase,0))+'</b></td><td class="num">100%</td></tr>'+
        '</tbody></table><div class="muted mt-12" style="font-size:11px">France · DACH (DE/CH/AT) · Benelux (BE/NL/LU) · North Africa (MA/TN/DZ)</div>'+
      '</div>'+
    '</div>'+
    /* C-2 geography */
    '<div class="card card-pad mt-16">'+secHead('Geography — Net Sales by Country','SUGI France authorized territory only ('+geos.length+' countries) · label: value + YoY')+
      chart('c2-geo',Math.max(200,geos.length*30+40),el=>hbars(el,geos.map(gg=>({label:gg.c,value:gg.val,yoy:gg.yoy,color:'#2563eb'}))))+
    '</div>'+
    /* C-4 geography × product */
    '<div class="card card-pad mt-16">'+secHead('Geography × Product Matrix','WEAR / ACC amount and vs YoY per country','<div class="seg seg-sm"><button data-geoview="table" class="'+(st.geoView==='table'?'active':'')+'">Table</button><button data-geoview="heatmap" class="'+(st.geoView==='heatmap'?'active':'')+'">Heatmap</button></div>')+
      (st.geoView==='table'
        ?sortableTable('gp',[{k:'c',l:'Country'},{k:'w',l:'WEAR',num:1,f:r=>eur(r.w)+' <span style="margin-left:8px">'+delta(r.wy)+'</span>'},{k:'a',l:'ACC',num:1,f:r=>eur(r.a)+' <span style="margin-left:8px">'+delta(r.ay)+'</span>'},{k:'t',l:'Total',num:1,f:r=>eur(r.t)}],gp)+'<div class="muted mt-12" style="font-size:11px">Click column headers to sort · WEAR / ACC cells show net sales plus category YoY</div>'
        :chart('c4-heat',Math.max(220,geos.length*30+60),el=>heatYoy(el,['WEAR vs YoY','ACC vs YoY'],geos.map(gg=>gg.c),gp.map(r=>[r.wy,r.ay]))))+
    '</div>'+
    /* C-5 category drill-down */
    '<div class="card card-pad mt-16">'+secHead('Category Drill-Down','Level '+(depth+1)+' — '+LEVEL_NAME[depth]+' · click a bar to drill in',crumb)+
      '<div class="grid" style="grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:22px;align-items:center">'+
      chart('c5-cat',Math.max(170,nodes.length*34+30),el=>hbars(el,nodes.map(nd=>({label:nd.n,value:nd.v*k,vp:nd.vp})),{onClick:nm=>{const nd=nodes.find(x=>x.n===nm);if(nd&&nd.ch&&depth<2){st.drill.push(nm);paint();}else{toast(nm+' — leaf level (SKU detail page in full build)');}}}))+
      '<table class="tbl"><thead><tr><th>'+LEVEL_NAME[depth]+'</th><th class="num">Net Sales</th><th class="num">Share</th><th class="num">vs Plan</th><th class="num">vs YoY</th></tr></thead><tbody>'+
        nodes.map(nd=>'<tr class="clickable" ><td><b>'+nd.n+'</b></td><td class="num">'+eur(nd.v*k)+'</td><td class="num">'+(nd.v*k/c.net*100).toFixed(0)+'%</td><td class="num">'+delta(nd.vp)+'</td><td class="num">'+delta(nd.vy)+'</td></tr>').join('')+
      '</tbody></table></div>'+
    '</div>'+
    /* C-6 + C-8 */
    '<div class="grid g-2 mt-16">'+
      '<div class="card card-pad sugi-equal-card" id="customer-type">'+secHead('Customer Type Mix','Net sales by channel of trade')+
        '<div class="sugi-card-body sugi-mix-body">'+chart('c6-cust',170,el=>donut(el,CUSTOMER.map(x=>({name:x[0],value:c.net*x[1]/100})),['#2563eb','#0891b2','#7c3aed','#d97706']))+
        '<table class="tbl"><thead><tr><th>Type</th><th class="num">Share</th><th class="num">Net Sales</th></tr></thead><tbody>'+CUSTOMER.map(x=>'<tr><td>'+x[0]+'</td><td class="num">'+x[1]+'%</td><td class="num">'+eur(c.net*x[1]/100)+'</td></tr>').join('')+'</tbody></table></div>'+
      '</div>'+
      '<div class="card card-pad sugi-equal-card" id="gender-mix">'+secHead('Gender Mix','Net sales split by gender line')+
        '<div class="sugi-card-body sugi-mix-body">'+chart('c8-gender',170,el=>donut(el,GENDER.map(x=>({name:x[0],value:c.net*x[1]/100})),['#2563eb','#7c3aed','#059669']))+
        '<table class="tbl"><thead><tr><th>Gender</th><th class="num">Share</th><th class="num">Net Sales</th></tr></thead><tbody>'+GENDER.map(x=>'<tr><td>'+x[0]+'</td><td class="num">'+x[1]+'%</td><td class="num">'+eur(c.net*x[1]/100)+'</td></tr>').join('')+'</tbody></table></div>'+
      '</div>'+
    '</div>'+
    /* C-7 + C-9 */
    '<div class="grid g-2 mt-16">'+
      '<div class="card card-pad sugi-equal-card">'+secHead('Tier Distribution','Net sales by account tier')+
        '<div class="sugi-card-body">'+chart('c7-tier',TIERS.length*32+40,el=>hbars(el,TIERS.map(t=>({label:t[0],value:c.net*t[1]/100,color:'#0891b2'}))))+'</div>'+
        '<div class="muted mt-8" style="font-size:11px">Tier 1 anchors (Galeries Lafayette · KaDeWe · Printemps) = 28% — healthy diversity</div>'+
      '</div>'+
      '<div class="card card-pad sugi-equal-card" id="in-territory">'+secHead('In-Territory vs Out-of-Territory','Contractual territory compliance ⚠️ flag')+
        '<div class="sugi-card-body sugi-territory-body">'+
        '<div class="between" style="font-size:13px;margin-bottom:6px"><span>In-Territory</span><b class="mono">'+TERR.inPct+'% · '+eur(inOut.inV)+'</b></div>'+
        '<div class="minibar" style="height:10px"><i style="width:'+TERR.inPct+'%;background:var(--green)"></i></div>'+
        '<div class="between" style="font-size:13px;margin:13px 0 6px"><span>Out-of-Territory</span><b class="mono">'+TERR.outPct+'% · '+eur(inOut.outV)+'</b></div>'+
        '<div class="minibar" style="height:10px"><i style="width:'+Math.max(2,TERR.outPct)+'%;background:var(--amber)"></i></div>'+
        '</div>'+
        '<div class="between mt-16"><span class="pill '+(TERR.outPct<TERR.threshold?'pill-green':'pill-red')+'"><span class="dot"></span>'+(TERR.outPct<TERR.threshold?'Within threshold (&lt;5%)':'⚠️ ABOVE threshold')+'</span>'+
        '<button class="btn" data-investigate>'+(st.invOpen?'Hide':'View')+' Investigation Report →</button></div>'+
        (st.invOpen?'<div class="card card-pad mt-12" style="background:var(--panel-2);border-style:dashed"><div class="klabel">Out-of-Territory breakdown</div>'+
          '<div class="between" style="font-size:12.5px;padding:4px 0"><span>EU non-territory</span><b class="mono">'+eur(inOut.outV*TERR.euShare)+'</b></div>'+
          '<div class="between" style="font-size:12.5px;padding:4px 0"><span>Non-EU</span><b class="mono">'+eur(inOut.outV*TERR.nonEuShare)+'</b></div>'+
          '<div class="muted mt-8" style="font-size:11px">Per spec: zone-level only — no per-country breakdown</div></div>':'')+
      '</div>'+
    '</div>'+
    /* C-10 SKUs */
    '<div class="card card-pad mt-16">'+secHead('Top 20 SKU','Best sellers · '+c.label,skuNote)+
      sortableTable('tsk',[
        {k:'i',l:'#',num:1},{k:'sku',l:'SKU'},{k:'name',l:'Product Name'},{k:'cat',l:'Category'},{k:'sub',l:'Sub-Cat'},
        {k:'rev',l:'Net Sales',num:1,f:r=>'€'+r.rev+'K'},{k:'qty',l:'Qty',num:1,f:r=>r.qty.toLocaleString()},
        {k:'mgn',l:'Margin %',num:1,f:r=>r.mgn+'%'},{k:'mgnv',l:'Margin €',num:1,f:r=>'€'+Math.round(r.mgnv)+'K'}],
        TOP_SKUS.map((s,i)=>({i:i+1,sku:s[0],name:s[1],cat:s[2],sub:s[3],rev:s[4],qty:s[5],mgn:s[6],mgnv:s[4]*s[6]/100})))+
    '</div>';
  }

  /* ---------------- Royalty tab ---------------- */
  function royaltyView(c){
    const g=gate(c);if(g)return g;
    const ms=mainSeries();const RRk=c.royRate||RR;
    const scale=d=>({labels:d.labels,bars:d.bars,actual:d.actual.map(v=>v==null?null:+(v*RRk).toFixed(4)),plan:d.plan.map(v=>v==null?null:+(v*RRk).toFixed(4)),prior:d.prior.map(v=>v==null?null:+(v*RRk).toFixed(4))});
    const cr=contractRoy();const prog=cr/ANNUAL_MIN*100;
    const dv=st.view==='plan'?c.royPlan:c.roy;
    const catL2=CATTREE.flatMap(c1=>c1.ch.map(c2=>({label:c1.n+' · '+c2.n,value:c2.v/TOT26*c.net*RRk})));
    const geos=geoRows(c);
    return banner(c)+
    '<div class="grid g-4">'+
      kpi(st.view==='plan'?'Planned Royalty':'Royalty Earned',eur(dv),delta(c.vsPlan)+'<span class="muted">vs plan</span>')+
      kpi('Effective Royalty %',ratePct(c)+'<small>%</small>','<span class="muted">flat effective · contract §4.2</span>')+
      kpi('vs Plan %',c.vsPlan!=null?pctf(c.vsPlan):'—','<span class="muted">plan royalty '+eur(c.royPlan)+'</span>')+
      kpi('YTD Min Progress',prog?prog.toFixed(0)+'<small>%</small>':'—','<span class="muted">of €1.0M annual min · contract level</span>'+(prog>=100?'<span class="pill pill-green"><span class="dot"></span>Cleared</span>':''))+
    '</div>'+
    '<div class="card card-pad mt-16">'+secHead('Royalty — '+(ms.bars?'monthly':'cumulative'),'Actual vs Plan vs Prior Year · net sales × '+ratePct(c)+'%')+
      chart('roy-main',300,el=>ms.bars?barChart3(el,scale(ms)):lineChart(el,scale(ms)))+
    '</div>'+
    '<div class="grid g-2 mt-16">'+
      '<div class="card card-pad">'+secHead('Effective Rate Trend','Royalty ÷ net sales per month — flat structure')+chart('roy-rate',180,el=>rateLine(el))+'</div>'+
      '<div class="card card-pad">'+secHead('Rate Structure','Master Agreement § 4.2')+
        '<div class="grid g-2">'+
        '<div class="card card-pad" style="background:var(--accent-dim);border-color:transparent"><div class="klabel">Effective rate</div><div class="kval" style="font-size:30px">'+ratePct(c)+'<small>%</small></div><div class="muted" style="font-size:11px;margin-top:4px">of net sales — flat, all bands</div></div>'+
        '<div class="card card-pad" style="background:var(--panel-2);border-color:transparent"><div class="klabel">Annual minimum</div><div class="kval" style="font-size:30px">€2.5<small>M</small></div><div class="muted" style="font-size:11px;margin-top:4px">royalty floor per contract year</div></div>'+
        '</div>'+
        '<div class="muted mt-12" style="font-size:11.5px;line-height:1.55">Contract rate 10% applies flat to total net sales — Royalty Earned = Net Sales × 10% (MockData Patch v1.1).</div>'+
      '</div>'+
    '</div>'+
    '<div class="grid g-3 mt-16">'+
      '<div class="card card-pad">'+secHead('Royalty by Category','WEAR / ACC sub-categories')+chart('roy-cat',catL2.length*26+40,el=>hbars(el,catL2.map(x=>({label:x.label,value:x.value,color:'#7c3aed'}))))+'</div>'+
      '<div class="card card-pad">'+secHead('Royalty by Country','Authorized territory')+chart('roy-geo',Math.max(180,geos.length*26+40),el=>hbars(el,geos.map(gg=>({label:gg.c,value:gg.val*RRk,color:'#2563eb'}))))+'</div>'+
      '<div class="card card-pad">'+secHead('Royalty by Customer Type','Wholesale vs Retail vs others')+chart('roy-cust',CUSTOMER.length*30+40,el=>hbars(el,CUSTOMER.map(x=>({label:x[0],value:c.net*x[1]/100*RRk,color:'#0891b2'}))))+
      '<div class="muted mt-8" style="font-size:11px">Royalty computed on net wholesale value</div></div>'+
    '</div>';
  }

  /* ---------------- Variance tab ---------------- */
  function varianceView(c){
    const g=gate(c);if(g)return g;
    const dim=st.varDim;
    let rows=VAR_DIMS[dim];
    if(dim==='country')rows=GEO.filter(gg=>st.region==='all'||gg.r===st.region).map(gg=>gg.c);
    const cols=st.year==='2026'?['Q1','Q2 ·p']:['Q1','Q2','Q3','Q4'];
    const matrix=rows.map(r=>{const rng=mulberry(r+st.year+dim);return cols.map((_,ci)=>Math.round(100+(VAR_VP[r]||0)+ (rng()*8-4)+ci*(rng()*2-1)));});
    /* performers pool */
    const pool=[
      ...CATTREE.flatMap(c1=>c1.ch.map(c2=>({name:c1.n+' · '+c2.n,kind:'Category',val:c2.v/TOT26*c.net,vp:c2.vp}))),
      ...GEO.filter(gg=>st.region==='all'||gg.r===st.region).map(gg=>({name:gg.c,kind:'Country',val:gg.v/GEOSUM*c.netBase,vp:VAR_VP[gg.c]||0})),
      ...CUSTOMER.map(x=>({name:x[0],kind:'Customer',val:c.net*x[1]/100,vp:VAR_VP[x[0]]||0}))]
      .map(r=>({...r,gap:r.val*r.vp/100}));
    const top=pool.slice().sort((a,b)=>b.gap-a.gap).slice(0,10);
    const bottom=pool.slice().sort((a,b)=>a.gap-b.gap).slice(0,10);
    const perfRow=(r,withIns)=>'<tr><td><span class="pill pill-gray" style="font-size:9.5px;margin-right:6px">'+r.kind+'</span><b>'+r.name+'</b>'+(withIns&&INSIGHTS[r.name]?'<div class="muted" style="font-size:11px;margin-top:2px">🤖 '+INSIGHTS[r.name]+'</div>':'')+'</td><td class="num">'+eur(r.val)+'</td><td class="num">'+delta(r.vp)+'</td><td class="num" style="color:'+(r.gap>=0?'var(--green)':'var(--red)')+'">'+(r.gap>=0?'+':'−')+eur(Math.abs(r.gap))+'</td></tr>';
    const yoyItems=YOY_BARS.map(b=>({label:b[0],value:Math.abs(b[1]),color:b[1]>=0?'#059669':'#dc2626',vp:null,yoy:null,signed:b[1]}));
    return banner(c)+
    '<div class="card card-pad">'+secHead('Plan vs Actual Heatmap','Attainment % by '+VAR_DIM_LABEL[dim]+' × quarter · '+st.year,
        '<div class="seg seg-sm">'+Object.keys(VAR_DIMS).map(d=>'<button data-vardim="'+d+'" class="'+(d===dim?'active':'')+'">'+VAR_DIM_LABEL[d]+'</button>').join('')+'</div>')+
      chart('var-heat',Math.max(220,rows.length*32+70),el=>heatAttain(el,cols,rows,matrix))+
    '</div>'+
    '<div class="grid g-2 mt-16">'+
      '<div class="card card-pad">'+secHead('Top 10 — Over Plan','Strongest plan beats · ranked by € gap')+
        '<table class="tbl"><thead><tr><th>Segment</th><th class="num">Net Sales</th><th class="num">vs Plan</th><th class="num">Gap €</th></tr></thead><tbody>'+top.map(r=>perfRow(r)).join('')+'</tbody></table></div>'+
      '<div class="card card-pad">'+secHead('Bottom 10 — Under Plan','Largest gaps to recover · auto-insight')+
        '<table class="tbl"><thead><tr><th>Segment</th><th class="num">Net Sales</th><th class="num">vs Plan</th><th class="num">Gap €</th></tr></thead><tbody>'+bottom.map(r=>perfRow(r,1)).join('')+'</tbody></table></div>'+
    '</div>'+
    '<div class="card card-pad ai-box mt-16">'+secHead('🤖 Driver Analysis','Auto-generated insight · '+c.label,'<span class="pill pill-violet"><span class="dot"></span>Auto-generated</span>')+
      DRIVER_LINES.map(l=>'<div class="ai-line"><span class="sp">✦</span><div>'+l+'</div></div>').join('')+
    '</div>'+
    '<div class="card card-pad mt-16">'+secHead('🤖 YoY Drivers — YTD 2026 vs 2025','Linked to the Prior Year line on the main chart','<span class="pill pill-violet"><span class="dot"></span>Auto-generated</span>')+
      '<div class="grid g-2" style="align-items:start">'+
      '<div>'+YOY_NARR.map(l=>'<div class="ai-line"><span class="sp">✦</span><div>'+l+'</div></div>').join('')+'</div>'+
      '<div>'+chart('var-wf',210,el=>waterfall(el))+'<div class="muted" style="font-size:11px;text-align:center;margin-top:4px">YoY waterfall: Prior Year → +Growth − Decline → Current</div></div>'+
      '</div>'+
      '<div class="mt-16">'+secHead('YoY delta by driver','€M change vs prior year · green = growth, red = decline')+
      chart('var-yoy',YOY_BARS.length*26+40,el=>{
        const rev=yoyItems.slice().reverse();
        mkChart(el,{animation:false,
          tooltip:Object.assign({trigger:'axis',axisPointer:{type:'shadow'},formatter:ps=>{const p=ps[0];const it=rev[p.dataIndex];return '<b>'+p.axisValue+'</b><br/>'+(it.signed>=0?'+':'−')+eur(Math.abs(it.signed));}},TT),
          grid:{left:8,right:60,top:6,bottom:6,containLabel:true},
          xAxis:{type:'value',splitLine:{lineStyle:{color:'rgba(15,23,42,.06)'}},axisLabel:Object.assign({},AXL,{formatter:v=>eur(v)})},
          yAxis:{type:'category',data:rev.map(i=>i.label),axisLine:{lineStyle:{color:'rgba(15,23,42,.16)'}},axisTick:{show:false},axisLabel:{color:'#475569',fontSize:11}},
          series:[{type:'bar',barWidth:'56%',data:rev.map(it=>({value:it.signed,itemStyle:{color:it.signed>=0?'#059669':'#dc2626',borderRadius:it.signed>=0?[0,4,4,0]:[4,0,0,4]}})),
            label:{show:true,position:'right',fontSize:10,fontFamily:'ui-monospace,monospace',color:'#5b6577',formatter:p=>(rev[p.dataIndex].signed>=0?'+':'−')+eur(Math.abs(rev[p.dataIndex].signed))}}]});
      })+'</div>'+
    '</div>';
  }

  /* ---------------- vs Contract Minimum tab ---------------- */
  function minView(){
    const Y=YEARS[st.year];
    const hd=contractData();
    const annualMin=hd&&hd.annualRoyaltyMin?toM(hd.annualRoyaltyMin):ANNUAL_MIN;
    const earned=hd&&hd.annualRoyaltyMin?toM(hd.royalty):(sumR(Y.actual,[0,Y.thru])||0)*RR;
    const royaltyMin=hd&&hd.annualRoyaltyMin?toM(hd.royaltyMin):null;
    const prog=earned/annualMin*100;
    const isCur=st.year==='2026';
    const proj=isCur?(royaltyMin?earned/(royaltyMin/annualMin):ROY_FIX.projection26):earned;
    const projPct=proj/annualMin*100;
    const scaleMax=Math.max(115,projPct+8);
    const monthsLeft=isCur?12-(Y.thru+1):0;
    const reqPace=isCur?Math.max(0,(annualMin-earned))/monthsLeft:0;
    const curPace=earned/(Y.thru+1);
    const filterNote=(st.channel!=='all'||st.season!=='all')?'<span class="pill pill-amber"><span class="dot"></span>Contract level — price band / season filters not applied</span>':'<span class="pill pill-gray">Contract level · calendar year '+st.year+'</span>';
    return '<div class="between" style="margin-bottom:14px"><div class="sec-h" style="margin:0"><div><h2>Royalty vs Annual Contract Minimum</h2><div class="sub">'+eur(annualMin)+' royalty floor per contract year · effective rate '+ratePct({royRate:(hd&&hd.royaltyRate)||RR})+'%</div></div></div>'+filterNote+'</div>'+
    '<div class="grid g-3">'+
      kpi('Annual Minimum',eur(annualMin),'<span class="muted">contract year '+st.year+'</span>')+
      kpi('Royalty Earned'+(isCur?' · YTD':''),eur(earned),'<span class="muted">'+prog.toFixed(0)+'% of minimum</span>'+(prog>=100?'<span class="pill pill-green"><span class="dot"></span>Min cleared</span>':''))+
      kpi(isCur?'Year-End Projection':'Final Attainment',eur(proj),(projPct>=100?'<span class="pill pill-green"><span class="dot"></span>'+projPct.toFixed(0)+'% · +'+eur(proj-annualMin)+' excess</span>':'<span class="pill pill-red"><span class="dot"></span>'+projPct.toFixed(0)+'% · shortfall '+eur(annualMin-proj)+'</span>'))+
    '</div>'+
    '<div class="card card-pad mt-16">'+secHead('Year-to-Date Progress','0–100% = annual minimum · markers: current + year-end projection')+
      '<div class="progress-xl mt-24" style="margin-top:34px">'+
        '<div class="fill'+(prog>=100?' over':'')+'" style="width:'+Math.min(100,prog/scaleMax*100)+'%"></div>'+
        '<div class="marker" style="left:'+(100/scaleMax*100)+'%"></div><div class="mlabel" style="left:'+(100/scaleMax*100)+'%">Min '+eur(annualMin)+'</div>'+
        (isCur?'<div class="marker" style="left:'+(projPct/scaleMax*100)+'%;background:var(--green)"></div><div class="mlabel" style="left:'+(projPct/scaleMax*100)+'%;color:var(--green)">Projection '+projPct.toFixed(0)+'%</div>':'')+
      '</div>'+
      '<div class="between mt-12" style="font-size:12px"><span class="mono" style="color:var(--ink-2)">Earned '+eur(earned)+' · '+prog.toFixed(1)+'%</span><span class="muted mono">scale 0–'+scaleMax.toFixed(0)+'%</span></div>'+
    '</div>'+
    '<div class="grid g-2 mt-16">'+
      '<div class="card card-pad">'+secHead('Required Pace','To reach 100% of annual minimum')+
        (isCur
          ?'<div class="grid g-2"><div><div class="klabel">Required / month</div><div class="kval" style="font-size:24px">'+eur(reqPace)+'</div><div class="muted" style="font-size:11px;margin-top:4px">'+monthsLeft+' months remaining</div></div>'+
           '<div><div class="klabel">Current run-rate</div><div class="kval" style="font-size:24px">'+eur(curPace)+'</div><div class="muted" style="font-size:11px;margin-top:4px">avg / month · Jan–May</div></div></div>'+
           '<div class="mt-16">'+(curPace>=reqPace?'<span class="pill pill-green"><span class="dot"></span>Pace sufficient — '+Math.round((curPace/reqPace-1)*100)+'% headroom</span>':'<span class="pill pill-red"><span class="dot"></span>⚠️ Pace short — need +'+eur(reqPace-curPace)+'/mo</span>')+'</div>'
          :'<div class="muted" style="font-size:13px">Closed year — final attainment '+prog.toFixed(0)+'% ('+eur(earned)+' vs '+eur(annualMin)+' minimum).</div>')+
      '</div>'+
      '<div class="card card-pad">'+secHead('Historic Comparison','Final attainment % vs annual minimum · last 3 years')+chart('min-hist',190,el=>histBars(el))+'</div>'+
    '</div>'+
    '<div class="card card-pad mt-16">'+secHead('Cumulative Royalty vs Minimum Pace','Earned royalty vs '+eur(annualMin)+' straight-line pace · '+st.year)+
      chart('min-pace',280,el=>paceChart(el))+
    '</div>';
  }

  /* ---------------- paint ---------------- */
  function renderBody(c){
    if(st.tab==='net')return netView(c);
    if(st.tab==='royalty')return royaltyView(c);
    if(st.tab==='variance')return varianceView(c);
    return minView();
  }
  function paint(){
    if (!document.querySelector('.sugi-sales-poc')) return;
    disposeCharts();initQ=[];
    const filterEl=document.getElementById('ste-sales-filterbar')||document.getElementById('filterbar');
    if(filterEl)filterEl.innerHTML=renderFilter();
    document.getElementById('tabs').innerHTML=renderTabs();
    const c=ctx();
    document.getElementById('main').innerHTML=renderBody(c);
    const sub=document.getElementById('ste-console-sub');
    const ent=hostEntity();
    if(sub)sub.textContent=(ent?ent.code:'SUGI France')+' · '+(hostState&&hostState.mode==='licensor'?'Licensor View':'Licensee View')+' · '+c.label+' · '+CH_LABEL[st.channel]+' · € EUR';
    const viewPill=document.getElementById('ste-console-view-pill');
    if(viewPill){
      viewPill.className='pill '+(st.view==='plan'?'pill-violet':'pill-blue');
      viewPill.textContent=st.view==='plan'?'PLAN':'ACTUAL';
    }
    runCharts();
  }

  /* ---------------- events ---------------- */
  document.addEventListener('click',e=>{
    const scope = e.target.closest('.sugi-sales-poc,.sugi-sales-filterbar');
    if (!scope) return;
    const t=e.target.closest('[data-view],[data-channel],[data-tab],[data-export],[data-crumb],[data-geoview],[data-vardim],[data-investigate],[data-sortk]');
    if(!t)return;
    const d=t.dataset;
    if(d.view){st.view=d.view;paint();return;}
    if(d.channel){st.channel=d.channel;paint();return;}
    if(d.tab){st.tab=d.tab;paint();window.scrollTo({top:0,behavior:'smooth'});return;}
    if(d.crumb!==undefined){st.drill=st.drill.slice(0,+d.crumb);paint();return;}
    if(d.geoview){st.geoView=d.geoview;paint();return;}
    if(d.vardim){st.varDim=d.vardim;paint();return;}
    if(d.investigate!==undefined){st.invOpen=!st.invOpen;paint();return;}
    if(d.sortk){const parts=d.sortk.split('|');const tid=parts[0],key=parts[1];const s=st.sort[tid]||{};st.sort[tid]={key,dir:(s.key===key&&s.dir==='desc')?'asc':'desc'};paint();return;}
    if(d.export){toast('Preparing '+(d.export==='pdf'?'PDF':'Excel')+' export… (PoC stub)');return;}
  });
  document.addEventListener('change',e=>{
    if (!e.target.closest('.sugi-sales-poc,.sugi-sales-filterbar')) return;
    if(e.target.id==='f-year'){st.year=e.target.value;st.season='all';paint();}
    else if(e.target.id==='f-period'){st.period=e.target.value;st.season='all';paint();}
    else if(e.target.id==='f-season'){st.season=e.target.value;if(st.season!=='all')st.period='ytd';paint();}
  });


  global.STESugiSalesRoyalty = { mount };
})(window);
