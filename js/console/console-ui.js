/* =========================================================
   ST Licensor Console — shared UI helpers (window.UI)
   ========================================================= */
(function () {
  const D = () => window.STEData;

  function curSym(ent) { return D().money(1, ent).sym; }
  function fmtMoney(amountBook, ent) { return D().money(amountBook, ent); }

  function delta(value, opts) {
    opts = opts || {};
    const inv = opts.invert; // for metrics where down is good
    const good = inv ? value < 0 : value >= 0;
    const cls = Math.abs(value) < 0.05 ? 'flat' : (good ? 'up' : 'down');
    const arrow = value > 0.05 ? '▲' : value < -0.05 ? '▼' : '—';
    const txt = (opts.raw != null) ? opts.raw : ((value >= 0 ? '+' : '') + value.toFixed(1) + (opts.unit || '%'));
    return `<span class="delta ${cls}">${arrow} ${txt}</span>`;
  }

  // Number with source-data popup on hover
  function srcNum(text, tip) {
    const enc = encodeURIComponent(JSON.stringify(tip));
    return `<span class="src-num" data-tip="${enc}">${text}</span>`;
  }

  // KPI card
  function kpi(o) {
    return `<div class="card kpi" ${o.tip ? `data-tip="${encodeURIComponent(JSON.stringify(o.tip))}"` : ''}>
      <div class="klabel">${o.icon || ''}${o.label}</div>
      <div class="kval">${o.value}${o.unit ? `<small>${o.unit}</small>` : ''}</div>
      ${o.cur ? `<div class="kcur">${o.cur}</div>` : ''}
      <div class="kfoot">${o.foot || ''}</div>
    </div>`;
  }

  // Global custom tooltip wiring
  let tipEl;
  function ensureTip() {
    if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'cc-tip'; document.body.appendChild(tipEl); }
    return tipEl;
  }
  function showTip(data, x, y) {
    const t = ensureTip();
    let rows = (data.rows || []).map(r => `<div class="tt-row"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');
    t.innerHTML = `<div class="tt-h">${data.title || ''}</div>${rows}${data.src ? `<div class="tt-src">${data.src}</div>` : ''}`;
    t.classList.add('show');
    const r = t.getBoundingClientRect();
    let left = x + 14, top = y + 14;
    if (left + r.width > window.innerWidth - 10) left = x - r.width - 14;
    if (top + r.height > window.innerHeight - 10) top = y - r.height - 14;
    t.style.left = left + 'px'; t.style.top = top + 'px';
  }
  function hideTip() { if (tipEl) tipEl.classList.remove('show'); }

  document.addEventListener('mouseover', (e) => {
    const el = e.target.closest('[data-tip]');
    if (!el) return;
    try { showTip(JSON.parse(decodeURIComponent(el.getAttribute('data-tip'))), e.clientX, e.clientY); } catch (err) {}
  });
  document.addEventListener('mousemove', (e) => {
    if (!tipEl || !tipEl.classList.contains('show')) return;
    const el = e.target.closest('[data-tip]');
    if (el) showTip(JSON.parse(decodeURIComponent(el.getAttribute('data-tip'))), e.clientX, e.clientY);
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest('[data-tip]')) hideTip();
  });

  function flag(cls) { return `<span class="flag ${cls}"></span>`; }

  // Anonymized display code for the scoped licensee (Licensee Portal placeholder)
  function dispCode(s) { return s && s.mode === 'licensee' ? 'Licensee A' : window.STEData.byId(s.entId).code; }

  // Section header
  function sec(title, sub, right) {
    return `<div class="card-head"><div><h3>${title}</h3>${sub ? `<div class="sub">${sub}</div>` : ''}</div>${right || ''}</div>`;
  }

  window.UI = { curSym, fmtMoney, delta, srcNum, kpi, flag, sec, showTip, hideTip, dispCode };
})();
