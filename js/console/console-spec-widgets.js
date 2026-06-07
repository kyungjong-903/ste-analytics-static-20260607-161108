(function (global) {
  "use strict";

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));
  }

  function sec(title, sub, right) {
    return `<div class="spec-sec-head"><div><h3>${esc(title)}</h3>${sub ? `<p>${esc(sub)}</p>` : ""}</div>${right || ""}</div>`;
  }

  function kpi(label, value, meta, tone) {
    return `<div class="card spec-kpi ${tone ? `tone-${tone}` : ""}">
      <div class="klabel">${esc(label)}</div>
      <div class="kval">${value}</div>
      <div class="kcur">${meta || ""}</div>
    </div>`;
  }

  function table(columns, rows) {
    return `<table class="tbl spec-table"><thead><tr>${columns.map((c) => `<th class="${c.num ? "num" : ""}">${esc(c.label)}</th>`).join("")}</tr></thead><tbody>
      ${rows.map((row) => `<tr>${columns.map((c) => `<td class="${c.num ? "num" : ""}">${c.render ? c.render(row) : esc(row[c.key])}</td>`).join("")}</tr>`).join("")}
    </tbody></table>`;
  }

  function ai(lines) {
    return `<div class="card card-pad spec-ai">
      ${sec("AI Insights", "Auto-generated recommendations")}
      ${lines.map((line) => `<div class="ai-line"><span class="sp">*</span><span>${line}</span></div>`).join("")}
    </div>`;
  }

  global.STESpecWidgets = { esc, sec, kpi, table, ai };
})(window);
