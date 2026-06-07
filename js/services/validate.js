/* =========================================================
   Sales Statement validation engine — AX Platform stand-in.
   Pure JS, runs entirely in browser, deterministic results.
   ========================================================= */
(function (global) {

  const TOLERANCE_GBP = 0.05;

  async function loadRef() {
    // Prefer inlined data (works under file://); fall back to fetch for dev
    if (typeof STE_SKU_MASTER !== "undefined" && typeof STE_FX !== "undefined") {
      return { skuMaster: STE_SKU_MASTER, fx: STE_FX };
    }
    const [skuRes, fxRes] = await Promise.all([
      fetch("data/sku-master.json").then(r => r.json()),
      fetch("data/ecb-fx-rates.json").then(r => r.json()),
    ]);
    return { skuMaster: skuRes, fx: fxRes };
  }

  function findNearestFx(fx, isoDate) {
    const rates = fx.rates || {};
    const dates = Object.keys(rates).sort();
    let best = null;
    for (const d of dates) {
      if (d <= isoDate) best = d;
    }
    if (!best) best = dates[0];
    return { date: best, rate: rates[best] };
  }

  function validateRows(rows, ref) {
    const errors = [];
    const warnings = [];
    let totalNet = 0;

    const skuSet = new Set(ref.skuMaster.skus.map(s => s.sku));

    rows.forEach((r, idx) => {
      const lineNo = r.line || (idx + 1);

      // 1. SKU presence
      if (r.sku && !skuSet.has(r.sku)) {
        // try to suggest correction by suffix match
        const tail = r.sku.split("-").slice(-1)[0];
        const suggestion = ref.skuMaster.skus.find(s => s.sku.endsWith("-" + tail));
        errors.push({
          line: lineNo,
          type: "sku_unknown",
          title: "International SKU mismatch",
          detail: `SKU ${r.sku} not found in master catalogue (region: EU)`,
          suggestion: suggestion ? `Mapped to ${suggestion.sku} (${suggestion.name})` : "No matching EU SKU found",
          licensee: r.net,
          ax: suggestion ? (r.qty * suggestion.wholesale_gbp * (1 - (r.discount_pct || 0)/100)) : r.net,
        });
      }

      // 2. FX rate sanity (only if row reports a non-base currency conversion)
      if (r.fx_eur_gbp && r.date) {
        const iso = (r.date instanceof Date) ? r.date.toISOString().slice(0,10) : String(r.date).slice(0,10);
        const { date: refDate, rate } = findNearestFx(ref.fx, iso);
        const expected = rate && (rate.GBP_per_EUR || (rate.GBP ? 1 / rate.GBP : null));
        if (expected && Math.abs(r.fx_eur_gbp - expected) > 0.002) {
          errors.push({
            line: lineNo,
            type: "fx_mismatch",
            title: "Exchange rate application difference",
            detail: `Used ${r.fx_eur_gbp.toFixed(4)} EUR/GBP; ECB published ${expected.toFixed(4)} for ${refDate}`,
            suggestion: `Recompute line at ${expected.toFixed(4)} EUR/GBP`,
            licensee: r.net,
            ax: round(r.net * (expected / r.fx_eur_gbp), 2),
          });
        }
      }

      // 3. Arithmetic: net = gross - discount within tolerance
      if (typeof r.gross === "number" && typeof r.discount === "number" && typeof r.net === "number") {
        const expectedNet = round(r.gross - r.discount, 2);
        if (Math.abs(expectedNet - r.net) > TOLERANCE_GBP) {
          errors.push({
            line: lineNo,
            type: "arithmetic",
            title: "Net calculation error",
            detail: `Gross £${r.gross.toFixed(2)} − discount £${r.discount.toFixed(2)} ≠ reported net £${r.net.toFixed(2)} (expected £${expectedNet.toFixed(2)})`,
            suggestion: `Correct net to £${expectedNet.toFixed(2)}`,
            licensee: r.net,
            ax: expectedNet,
          });
        }
      }

      totalNet += (typeof r.net === "number" ? r.net : 0);
    });

    return {
      totalLines: rows.length,
      errors, warnings,
      validCount: rows.length - errors.length - warnings.length,
      licenseeNet: round(totalNet, 2),
    };
  }

  // AX side: recompute net by applying corrections from errors[]
  function recompute(rows, errors) {
    // Build per-line override map
    const overrides = {};
    for (const e of errors) {
      if (typeof e.ax === "number") overrides[e.line] = e.ax;
    }
    let total = 0;
    rows.forEach((r, idx) => {
      const ln = r.line || (idx + 1);
      total += (ln in overrides) ? overrides[ln] : (typeof r.net === "number" ? r.net : 0);
    });
    return round(total, 2);
  }

  function round(n, d) {
    const p = Math.pow(10, d);
    return Math.round(n * p) / p;
  }

  function parseWorkbook(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = (ev) => {
        try {
          const wb = XLSX.read(ev.target.result, { type: "array", cellDates: true });
          const ws = wb.Sheets[wb.SheetNames[0]];
          // Find the header row — the ST Sales & Royalty Reporting Template's
          // row that carries a SKU column plus a Units Sold / Net Sales column.
          // Tolerant of any leading title/instruction rows above it.
          const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
          // Accept either the legacy "SKU" naming or the current "Style Code"
          // wording. Both surface as the per-line identifier column.
          const isCodeHeader = (c) => c.includes("sku") || c.includes("style code");
          let headerRow = -1;
          for (let i = 0; i < Math.min(20, aoa.length); i++) {
            const row = (aoa[i] || []).map(c => String(c || "").toLowerCase());
            const hasCode = row.some(isCodeHeader);
            const hasUnitsOrNet = row.some(c => c.includes("units sold") || c === "qty" || c.includes("quantity") || c.includes("net sales") || c === "net");
            if (hasCode && hasUnitsOrNet) { headerRow = i; break; }
          }
          if (headerRow < 0) return reject(new Error("Could not find header row (need a Style Code / SKU column and a Units Sold / Net Sales column)"));
          const headers = (aoa[headerRow] || []).map(c => String(c || "").trim());
          const skuKey = headers.find(h => isCodeHeader(h.toLowerCase()));
          // Return rows keyed by their raw header names — the importer maps the
          // ST template columns (Season, International SKU #, Units Sold, …) by
          // name, so we hand it the values verbatim rather than normalising.
          const rows = [];
          for (let i = headerRow + 1; i < aoa.length; i++) {
            const r = aoa[i];
            if (!r || r.every(c => c == null || c === "")) continue;
            const first = String(r[0] == null ? "" : r[0]).toLowerCase();
            if (first.startsWith("total")) continue;
            const obj = {};
            headers.forEach((h, j) => { if (h) obj[h] = r[j]; });
            // Skip rows with no SKU — spacers or summary lines.
            if (!skuKey || obj[skuKey] == null || obj[skuKey] === "") continue;
            rows.push(obj);
          }
          resolve(rows);
        } catch (err) { reject(err); }
      };
      fr.onerror = () => reject(fr.error);
      fr.readAsArrayBuffer(file);
    });
  }

  // Generic CSV / XLSX parser. Caller supplies an array of lowercase substrings
  // that must ALL appear (each as a substring of some cell) in the header row
  // — used to find the header position past any leading title/instruction rows
  // — and gets back an array of rows keyed by the raw header names.
  function parseSheet(file, requiredColsLower) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = (ev) => {
        try {
          const wb = XLSX.read(ev.target.result, { type: "array", cellDates: true });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
          let headerRow = -1;
          for (let i = 0; i < Math.min(30, aoa.length); i++) {
            const row = (aoa[i] || []).map(c => String(c == null ? "" : c).toLowerCase());
            if (requiredColsLower.every(req => row.some(c => c.includes(req)))) { headerRow = i; break; }
          }
          if (headerRow < 0) {
            return reject(new Error(`Couldn't find a header row containing: ${requiredColsLower.join(", ")}`));
          }
          const headers = (aoa[headerRow] || []).map(c => String(c == null ? "" : c).trim());
          const rows = [];
          for (let i = headerRow + 1; i < aoa.length; i++) {
            const r = aoa[i];
            if (!r || r.every(c => c == null || c === "")) continue;
            const first = String(r[0] == null ? "" : r[0]).toLowerCase();
            if (first.startsWith("total")) continue;
            const obj = {};
            headers.forEach((h, j) => { if (h) obj[h] = r[j]; });
            rows.push(obj);
          }
          resolve(rows);
        } catch (err) { reject(err); }
      };
      fr.onerror = () => reject(fr.error);
      fr.readAsArrayBuffer(file);
    });
  }

  global.STEValidate = { loadRef, validateRows, recompute, parseWorkbook, parseSheet, round };
})(window);
