/* =========================================================
   Design — Review / Studio / Sample Review / Brand Guide
   Built into the Global Operations Management platform.
   ========================================================= */
(function (global) {
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function escape(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  // CSV escape — wrap in quotes when value contains comma/quote/newline,
  // double up internal quotes per RFC 4180.
  function _csvField(v) {
    const s = String(v == null ? "" : v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }
  // Build a CSV from headers + rows and trigger a browser download. Used
  // for "Download template" affordances throughout the prototype.
  function downloadCsv(filename, headers, rows) {
    const lines = [headers.map(_csvField).join(",")]
      .concat((rows || []).map(r => r.map(_csvField).join(",")));
    // BOM so Excel auto-detects UTF-8.
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
  }

  function pageMain(name) {
    let sec = document.querySelector(`section[data-page="${name}"]`);
    if (!sec) {
      sec = document.createElement("section");
      sec.setAttribute("data-page", name);
      document.body.appendChild(sec);
    }
    document.querySelectorAll("section[data-page]").forEach(s => {
      s.hidden = s.dataset.page !== name;
    });
    sec.hidden = false;
    if (!sec.querySelector("ste-shell")) {
      sec.innerHTML = `<ste-shell active="${escape(name)}" breadcrumb="${escape(name)}" user-name="Min Jung" user-role="ST BU · License Lead" user-initials="MJ" licensee-code="" licensee-name="Global Admin View"></ste-shell>`;
    }
    const shell = sec.querySelector("ste-shell");
    let main = sec.querySelector("main.main");
    if (!main) {
      main = document.createElement("main");
      main.className = "main";
      shell.appendChild(main);
    }
    return main;
  }

  // -------- 5 Universal Pillars (Brandbook 2026) --------
  // Five-pillar grading scale — the CAD Inspection Rubric (see Brand Guide).
  // Each pillar is scored 0–5; the per-SKU grade is derived from the average.
  // Full criteria live in the Brand Guide, so there's no per-column tooltip
  // here — the score table links out to the Brand Guide instead.
  const AXES = [
    { key: "P1", label: "P1 · Italian Heritage" },
    { key: "P2", label: "P2 · Functionalism" },
    { key: "P3", label: "P3 · Court-to-Social" },
    { key: "P4", label: "P4 · Body-Lined Fit" },
    { key: "P5", label: "P5 · Quiet Performance" },
  ];
  // Per-pillar colors for any bars / dots that key off the pillar.
  const AXIS_COLORS = {
    P1: { from: "#7c3aed", to: "#a78bfa" },
    P2: { from: "#2563eb", to: "#60a5fa" },
    P3: { from: "#0d9488", to: "#5eead4" },
    P4: { from: "#ea580c", to: "#fdba74" },
    P5: { from: "#db2777", to: "#f9a8d4" },
  };
  // Back-compat alias — legacy code paths still reach for `PILLARS` until
  // they're updated; this stays in scope but is no longer the authority.
  const PILLARS = AXES;

  // Normalize SKU scores onto the 5-pillar (P1–P5, 0–5) model. Handles two
  // legacy shapes; idempotent (skips once scores are already P1–P5 ≤ 5):
  //   (a) old 4-axis keys (0–5) → map onto P1–P4, mirror P4 into P5
  //   (b) seed pillar scores at 0–100 → scale down to 0–5 (detect by value > 5)
  function migrateLegacyScores(s) {
    const KEYS = ["P1", "P2", "P3", "P4", "P5"];
    (s.designSubmissions || []).forEach(sub => {
      (sub.lines || []).forEach(line => {
        (line.skus || []).forEach(sku => {
          const sc = sku.scores || {};
          if (sc.line_alignment != null && sc.P1 == null) {
            const m = (v) => v == null ? 3 : v;
            sku.scores = {
              P1: m(sc.line_alignment), P2: m(sc.signature_use),
              P3: m(sc.detail_craft),   P4: m(sc.color_silhouette),
              P5: m(sc.color_silhouette),
            };
            return;
          }
          const isLegacy = KEYS.some(k => sc[k] != null && sc[k] > 5);
          if (!isLegacy) return;
          const norm = {};
          KEYS.forEach(k => { norm[k] = sc[k] == null ? 3 : Math.max(0, Math.min(5, Math.round(sc[k] / 20))); });
          sku.scores = norm;
        });
      });
    });
  }

  const VERDICTS = {
    A: { label: "APPROVE",          desc: "Proceed as-is",                    tone: "ok"   },
    B: { label: "APPROVE W/ NOTES", desc: "Conditional approval with notes",  tone: "info" },
    C: { label: "MINOR REVISE",     desc: "Small revisions required",         tone: "warn" },
    D: { label: "MAJOR REVISE",     desc: "Significant revisions required",   tone: "err"  },
    "—": { label: "ANALYZING",      desc: "AI is scoring this submission",    tone: "info" },
  };
  // Safe lookup — newly-uploaded submissions sit on "—" while AI scoring is
  // pending. Any unexpected value also falls back to the analyzing state so
  // we never crash on `VERDICTS[v].tone`.
  function getVerdict(v) { return VERDICTS[v] || VERDICTS["—"]; }

  // Simulate the AI parse pass that fires when a submission is uploaded. The
  // real product would parse fabric / classify items here; the demo just
  // Deterministic SKU scoring + grade synthesizer — called inline at submit
  // time so HQ lands on the detail page with grades already populated rather
  // than waiting on a simulated background pipeline. Same seed → same scores
  // across reloads. Scores live on the 0–100 scale; `_normalizeScores` later
  // scales them to 0–5 for display.
  function synthesizeSkuScore(seed) {
    let h = 2166136261 >>> 0;
    const s = String(seed || "");
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    const rand = () => { h = Math.imul(h ^ (h >>> 15), 1 | h); h = (h + Math.imul(h ^ (h >>> 7), 61 | h)) ^ h; return ((h ^ (h >>> 14)) >>> 0) / 4294967296; };
    const score = (base) => Math.max(35, Math.min(98, Math.round(base + (rand() * 24 - 12))));
    const center = 70 + rand() * 16; // most SKUs in the 70–86 band
    const scores = {
      P1: score(center), P2: score(center), P3: score(center),
      P4: score(center), P5: score(center),
    };
    const avg = (scores.P1 + scores.P2 + scores.P3 + scores.P4 + scores.P5) / 5;
    const grade = avg >= 88 ? "A" : avg >= 76 ? "B" : avg >= 60 ? "C" : "D";
    return { scores, grade, avgScore: Math.round(avg * 10) / 10 };
  }

  // clears the `aiAnalyzing` flag after a short delay so the UI advances
  // from the processing waiting state into the inspector.
  function simulateAiScoring(subId, delayMs) {
    setTimeout(() => {
      STE.mutate(s => {
        const sub = (s.designSubmissions || []).find(x => x.id === subId);
        if (!sub) return;
        sub.lines.forEach(l => {
          l.skus.forEach(sku => {
            sku.fabric = sku.fabric === "Pending parse" ? "Cotton/poly blend" : sku.fabric;
          });
        });
        sub.aiAnalyzing = false;
        sub.aiAnalyzingFinishedAt = new Date().toISOString();
      });
      if ((location.hash || "").startsWith("#/design-review")) {
        if (typeof inspector === "function") inspector();
      }
    }, delayMs);
  }

  // -------- Submission ID format --------
  // Pattern: DES-{season}-{licCode}-{lineGroupCode}-{seq}[.R{rev}]
  // Examples:
  //   DES-27FW-BOB-AC-001        (1st Best of Britain · Active Court · 27FW)
  //   DES-27FW-BOB-AC-001.R2     (resubmission revision 2 of the same root)
  //   DES-27FW-SUG-LM-002        (Sugi SAS · Lifestyle Man · 27FW · 2nd)
  // Carries everything a reviewer needs to glance-identify a submission:
  // licensee, line group, sequence, and revision lineage.
  const LINE_GROUP_CODES = {
    "Lifestyle Man":   "LM",
    "Lifestyle Woman": "LW",
    "Active Man":      "AM",
    "Active Woman":    "AW",
    "Active Court":    "AC",
    "Kids":            "KD",
    "Heritage":        "HR",
    "Footwear":        "FW",
    "Accessory":       "AY",
  };
  function lineGroupCode(lg) {
    if (LINE_GROUP_CODES[lg]) return LINE_GROUP_CODES[lg];
    // Fallback: take initials of capitalised words, max 3 chars.
    return (lg || "").split(/\s+/).map(w => (w[0] || "").toUpperCase()).join("").slice(0,3) || "X";
  }
  function licCode(state, licenseeId) {
    const lic = (state.licensees || []).find(l => l.id === licenseeId);
    if (lic && lic.code) return lic.code.toUpperCase();
    // Fallback when a licensee doesn't ship a code: first 3 chars of legalName.
    return (lic && lic.legalName || licenseeId || "").replace(/[^A-Za-z]/g, "").slice(0,3).toUpperCase() || "XXX";
  }
  function nextSubmissionId(state, { season, lineGroup, licenseeId }) {
    const lc = licCode(state, licenseeId);
    const gc = lineGroupCode(lineGroup);
    const prefix = `DES-${season}-${lc}-${gc}-`;
    // Look at every existing submission for this (lic, group, season) and find
    // the highest sequence number. Ignore any .R{n} suffix when computing the
    // next seq — resubmissions reuse their parent's base ID.
    const matches = (state.designSubmissions || [])
      .map(s => (s.id || "").match(new RegExp(`^${prefix.replace(/-/g,'\\-')}(\\d+)`)))
      .filter(Boolean)
      .map(m => parseInt(m[1], 10));
    const seq = (matches.length ? Math.max(...matches) : 0) + 1;
    return `${prefix}${String(seq).padStart(3,"0")}`;
  }
  function resubmissionId(parentId, revisionRound) {
    if (!parentId) return null;
    // Strip any existing .R suffix off the parent (resubmitting a resubmission
    // bumps from the root, not the previous-rev ID).
    const base = parentId.replace(/\.R\d+$/i, "");
    return `${base}.R${revisionRound}`;
  }

  // -------- Seed: Sugi France · 27FW Lifestyle Man (real lines from
  // wetransfer_lifestyle-st-fw27 — ARCHIVIO/ATLAS/CEO/CRIO/ESSENTIALS PLUS/
  // GIAPETO/KRONOS). SKU scores synthesized to demonstrate the 5-Pillar
  // grading model. --------
  function ensureSeed() {
    const st = STE.get();
    const existingIds = new Set((st.designSubmissions || []).map(s => s.id));
    const submissions = [{
      id: "DES-27FW-SSAS-LM-001",
      licenseeId: "lic_c2a5c666",
      season: "27FW",
      lineGroup: "Lifestyle Man",
      submittedAt: "2026-05-14T16:59:28+09:00",
      verdict: "B",
      avgScore: 2.50,
      status: "Under Review",   // Draft · Submitted · Under Review · Released
      comments: [],             // staff review comments
      lines: [
        {
          id: "L-ARCHIVIO", file: "LIFESTYLE - ARCHIVIO.pdf", name: "ARCHIVIO", target: "MAN · 27FW", sizeMb: 10.7,
          avgScore: 2.75, grade: "B",
          previews: [
            "assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__ARCHIVIO-1.jpg",
            "assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__ARCHIVIO-2.jpg",
          ],
          aiAnnotations: [
            { x: 50, y: 22, kind: "good",  title: "P1 heritage cue clean",   detail: "Collar piping reads tennis-heritage without nostalgia — strong P1 alignment." },
            { x: 28, y: 48, kind: "warn",  title: "P3 court-to-social risk", detail: "Sleeve hem stiffness skews sporty. Soften the cuff finish for court→social transition." },
            { x: 72, y: 64, kind: "bad",   title: "P4 silhouette deviation", detail: "Body line drops 4cm wider than 26SS block. Tighten waist by 2cm to restore body-lined silhouette." },
          ],
          skus: [
            { id: "42050", name: "ARCHIVIO JACKET",       category: "Heritage", grade: "B", scores: { P1:85, P2:78, P3:75, P4:75, P5:78 }, fabric: "COTTON CANVAS 100% CO" },
            { id: "42051", name: "ARCHIVIO PANT",         category: "Heritage", grade: "B", scores: { P1:78, P2:75, P3:72, P4:70, P5:72 }, fabric: "COTTON DRILL 100% CO" },
            { id: "42052", name: "ARCHIVIO TEE",          category: "Heritage", grade: "C", scores: { P1:60, P2:65, P3:65, P4:60, P5:58 }, fabric: "COTTON JERSEY 100% CO" },
            { id: "42053", name: "ARCHIVIO SHORT",        category: "Heritage", grade: "B", scores: { P1:75, P2:78, P3:72, P4:70, P5:72 }, fabric: "COTTON TWILL 100% CO" },
            { id: "42054", name: "ARCHIVIO POLO",         category: "Heritage", grade: "B", scores: { P1:82, P2:80, P3:78, P4:75, P5:80 }, fabric: "COTTON PIQUE 100% CO" },
            { id: "42055", name: "ARCHIVIO SWEATER",      category: "Heritage", grade: "B", scores: { P1:78, P2:78, P3:75, P4:75, P5:78 }, fabric: "WOOL BLEND 70% WO 30% PA" },
            { id: "42056", name: "ARCHIVIO HOODIE",       category: "Heritage", grade: "C", scores: { P1:65, P2:65, P3:70, P4:60, P5:62 }, fabric: "COTTON FLEECE 100% CO" },
            { id: "42057", name: "ARCHIVIO TRACK JACKET", category: "Heritage", grade: "B", scores: { P1:80, P2:78, P3:75, P4:72, P5:78 }, fabric: "NYLON TAFFETA 100% PA" },
            { id: "42058", name: "ARCHIVIO CAP",          category: "Heritage", grade: "A", scores: { P1:92, P2:88, P3:88, P4:88, P5:90 }, fabric: "COTTON TWILL 100% CO" },
          ],
        },
        {
          id: "L-ATLAS", file: "LIFESTYLE - ATLAS.pdf", name: "ATLAS", target: "MAN · 27FW", sizeMb: 6.2,
          avgScore: 3.00, grade: "B",
          previews: [
            "assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__ATLAS-1.jpg",
            "assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__ATLAS-2.jpg",
          ],
          skus: [
            { id: "42060", name: "ATLAS TRACK JACKET", category: "Active Court", grade: "B", scores: { P1:85, P2:82, P3:78, P4:80, P5:80 }, fabric: "NYLON STRETCH 88% PA 12% EA" },
            { id: "42061", name: "ATLAS TRACK PANT",   category: "Active Court", grade: "B", scores: { P1:80, P2:82, P3:78, P4:78, P5:80 }, fabric: "NYLON STRETCH 88% PA 12% EA" },
            { id: "42062", name: "ATLAS POLO",         category: "Active Court", grade: "A", scores: { P1:92, P2:90, P3:88, P4:88, P5:90 }, fabric: "COTTON PIQUE 95% CO 5% EA" },
          ],
        },
        {
          id: "L-CEO", file: "LIFESTYLE - CEO.pdf", name: "CEO", target: "MAN · 27FW", sizeMb: 4.4,
          avgScore: 2.60, grade: "B",
          previews: [
            "assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__CEO-1.jpg",
            "assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__CEO-2.jpg",
          ],
          skus: [
            { id: "42070", name: "CEO JACKET",   category: "Lifestyle", grade: "B", scores: { P1:75, P2:100, P3:75, P4:75, P5:83 }, fabric: "WOOL BLEND 70% WOOL 30% PA" },
            { id: "42071", name: "CEO SHIRT",    category: "Lifestyle", grade: "C", scores: { P1:55, P2:75,  P3:75, P4:60, P5:70 }, fabric: "COTTON POPLIN 100% CO" },
            { id: "42072", name: "CEO POLO",     category: "Lifestyle", grade: "B", scores: { P1:80, P2:80,  P3:78, P4:72, P5:75 }, fabric: "COTTON PIQUE 95% CO 5% EA" },
            { id: "42073", name: "CEO SHORT",    category: "Lifestyle", grade: "B", scores: { P1:72, P2:85,  P3:70, P4:80, P5:75 }, fabric: "WOOL TROPICAL 100% WO" },
            { id: "42074", name: "CEO PANT",     category: "Lifestyle", grade: "C", scores: { P1:65, P2:70,  P3:60, P4:65, P5:68 }, fabric: "WOOL TROPICAL 100% WO" },
          ],
        },
        {
          id: "L-CRIO", file: "LIFESTYLE - CRIO.pdf", name: "CRIO", target: "MAN · 27FW", sizeMb: 2.1,
          avgScore: 3.00, grade: "B",
          previews: [
            "assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__CRIO-1.jpg",
            "assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__CRIO-2.jpg",
          ],
          skus: [
            { id: "42080", name: "CRIO TEE",     category: "Lifestyle", grade: "B", scores: { P1:80, P2:78, P3:90, P4:75, P5:80 }, fabric: "COTTON JERSEY 100% CO" },
            { id: "42081", name: "CRIO POLO",    category: "Lifestyle", grade: "B", scores: { P1:78, P2:80, P3:88, P4:80, P5:78 }, fabric: "COTTON PIQUE 100% CO" },
            { id: "42082", name: "CRIO SHORT",   category: "Lifestyle", grade: "B", scores: { P1:82, P2:80, P3:90, P4:75, P5:80 }, fabric: "COTTON TWILL 100% CO" },
          ],
        },
        {
          id: "L-ESSENTIALS", file: "LIFESTYLE - ESSENTIALS PLUS.pdf", name: "ESSENTIALS PLUS", target: "MAN · 27FW", sizeMb: 319.7,
          avgScore: 1.80, grade: "C",
          previews: [
            "assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__ESSENTIALS_PLUS-1.jpg",
            "assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__ESSENTIALS_PLUS-2.jpg",
          ],
          skus: [
            { id: "42090", name: "ESSENTIALS PLUS HOODIE",   category: "Lifestyle", grade: "B", scores: { P1:78, P2:75, P3:72, P4:70, P5:72 }, fabric: "COTTON FLEECE 100% CO" },
            { id: "42091", name: "ESSENTIALS PLUS CREW",     category: "Lifestyle", grade: "C", scores: { P1:60, P2:62, P3:60, P4:58, P5:55 }, fabric: "COTTON FLEECE 100% CO" },
            { id: "42092", name: "ESSENTIALS PLUS TEE",      category: "Lifestyle", grade: "C", scores: { P1:58, P2:60, P3:62, P4:58, P5:55 }, fabric: "COTTON JERSEY 100% CO" },
            { id: "42093", name: "ESSENTIALS PLUS PANT",     category: "Lifestyle", grade: "D", scores: { P1:45, P2:48, P3:50, P4:45, P5:48 }, fabric: "COTTON FLEECE 100% CO" },
            { id: "42094", name: "ESSENTIALS PLUS SHORT",    category: "Lifestyle", grade: "C", scores: { P1:55, P2:58, P3:60, P4:55, P5:58 }, fabric: "COTTON FLEECE 100% CO" },
          ],
        },
        {
          id: "L-GIAPETO", file: "LIFESTYLE - GIAPETO.pdf", name: "GIAPETO", target: "MAN · 27FW", sizeMb: 85.6,
          avgScore: 2.50, grade: "B",
          previews: [
            "assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__GIAPETO-1.jpg",
            "assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__GIAPETO-2.jpg",
          ],
          skus: [
            { id: "42100", name: "GIAPETO TRACK JACKET", category: "Active Court", grade: "B", scores: { P1:78, P2:80, P3:75, P4:78, P5:75 }, fabric: "POLYESTER MEMORY 100% PL" },
            { id: "42101", name: "GIAPETO TRACK PANT",   category: "Active Court", grade: "B", scores: { P1:75, P2:78, P3:75, P4:75, P5:75 }, fabric: "POLYESTER MEMORY 100% PL" },
            { id: "42102", name: "GIAPETO POLO",         category: "Active Court", grade: "C", scores: { P1:60, P2:65, P3:65, P4:62, P5:60 }, fabric: "COTTON PIQUE 100% CO" },
            { id: "42103", name: "GIAPETO SHORT",        category: "Active Court", grade: "C", scores: { P1:65, P2:68, P3:65, P4:60, P5:62 }, fabric: "POLYESTER MEMORY 100% PL" },
            { id: "42104", name: "GIAPETO CAP",          category: "Accessory",    grade: "B", scores: { P1:72, P2:75, P3:78, P4:72, P5:75 }, fabric: "COTTON 100%" },
            { id: "42105", name: "GIAPETO BAG",          category: "Accessory",    grade: "B", scores: { P1:75, P2:78, P3:75, P4:72, P5:75 }, fabric: "POLYESTER 100%" },
          ],
        },
        {
          id: "L-KRONOS", file: "LIFESTYLE - KRONOS.pdf", name: "KRONOS", target: "MAN · 27FW", sizeMb: 8.0,
          avgScore: 3.20, grade: "A",
          previews: [
            "assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__KRONOS-1.jpg",
            "assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__KRONOS-2.jpg",
          ],
          skus: [
            { id: "42110", name: "KRONOS TRACK TOP",  category: "Active Court", grade: "A", scores: { P1:95, P2:92, P3:88, P4:90, P5:88 }, fabric: "MESH PA 100%" },
            { id: "42111", name: "KRONOS TRACK PANT", category: "Active Court", grade: "B", scores: { P1:80, P2:78, P3:80, P4:78, P5:80 }, fabric: "MESH PA 100%" },
            { id: "42112", name: "KRONOS POLO",       category: "Active Court", grade: "B", scores: { P1:78, P2:80, P3:80, P4:78, P5:75 }, fabric: "COTTON PIQUE 95% CO 5% EA" },
            { id: "42113", name: "KRONOS SHORT",      category: "Active Court", grade: "A", scores: { P1:90, P2:90, P3:88, P4:88, P5:88 }, fabric: "POLYESTER 100%" },
          ],
        },
      ],
    },
    // SUBM-002 — newly submitted, not yet picked up. Drives "N packages
    // awaiting review" on HQ home and counts toward the sidebar badge.
    {
      id: "DES-27FW-BOB-AC-001",
      licenseeId: "lic_75f7462d",
      season: "27FW",
      lineGroup: "Active Court",
      submittedAt: "2026-05-18T09:14:00+01:00",
      verdict: "A",
      avgScore: 3.10,
      status: "Pending Review",
      comments: [],
      lines: [{
        id: "L-BBUK-COURT", file: "COURT - BBUK.pdf", name: "COURT", target: "MAN · 27FW", sizeMb: 5.4,
        avgScore: 3.10, grade: "A",
        previews: [
          "assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__ATLAS-1.jpg",
          "assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__ATLAS-2.jpg",
        ],
        skus: [
          { id: "43010", name: "BBUK COURT POLO",  category: "Active Court", grade: "A", scores: { P1:92, P2:90, P3:88, P4:88, P5:90 }, fabric: "COTTON PIQUE 95% CO 5% EA" },
          { id: "43011", name: "BBUK COURT SHORT", category: "Active Court", grade: "A", scores: { P1:90, P2:88, P3:88, P4:90, P5:88 }, fabric: "POLYESTER 100%" },
        ],
      }],
    },
    // ---- Best of Britain (James Smith) state coverage — one submission per
    //      workflow state so the licensee side shows Draft / Pending Review /
    //      Under Review / Done(approved) / Done(rejected → resubmit). ----
    {
      // Draft — licensee still preparing; editable, not yet sent to HQ.
      id: "DES-28SS-BOB-LM-001",
      licenseeId: "lic_75f7462d",
      season: "28SS",
      lineGroup: "Lifestyle Man",
      submittedAt: "2026-05-26T10:00:00+01:00",
      verdict: "—",
      avgScore: 0,
      status: "Draft",
      comments: [],
      lines: [{
        id: "L-BBUK-ESS28", file: "ESSENTIALS - BBUK.pdf", name: "ESSENTIALS", target: "MAN · 28SS", sizeMb: 4.2,
        avgScore: 0, grade: "—",
        previews: [
          "assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__ARCHIVIO-1.jpg",
          "assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__ARCHIVIO-2.jpg",
        ],
        skus: [
          { id: "43020", name: "BBUK ESSENTIAL TEE",  category: "Lifestyle", grade: "—", scores: {}, fabric: "COTTON JERSEY 100% CO" },
          { id: "43021", name: "BBUK ESSENTIAL CREW", category: "Lifestyle", grade: "—", scores: {}, fabric: "COTTON FLEECE 100% CO" },
        ],
      }],
    },
    {
      // Under Review — HQ is actively reviewing; licensee sees "Awaiting HQ".
      id: "DES-28SS-BOB-AC-001",
      licenseeId: "lic_75f7462d",
      season: "28SS",
      lineGroup: "Active Court",
      submittedAt: "2026-05-20T09:30:00+01:00",
      verdict: "B",
      avgScore: 3.40,
      status: "Under Review",
      comments: [],
      lines: [{
        id: "L-BBUK-AC28", file: "COURT - BBUK 28SS.pdf", name: "COURT", target: "MAN · 28SS", sizeMb: 6.1,
        avgScore: 3.40, grade: "B",
        previews: [
          "assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__ATLAS-1.jpg",
          "assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__ATLAS-2.jpg",
        ],
        skus: [
          { id: "43030", name: "BBUK COURT JACKET", category: "Active Court", grade: "B", scores: { P1:80, P2:78, P3:75, P4:80, P5:78 }, fabric: "NYLON STRETCH 88% PA 12% EA" },
          { id: "43031", name: "BBUK COURT PANT",   category: "Active Court", grade: "B", scores: { P1:78, P2:76, P3:74, P4:78, P5:76 }, fabric: "NYLON STRETCH 88% PA 12% EA" },
        ],
      }],
    },
    {
      // Done · approved — released to the licensee with a positive verdict.
      id: "DES-27SS-BOB-LM-001",
      licenseeId: "lic_75f7462d",
      season: "27SS",
      lineGroup: "Lifestyle Man",
      submittedAt: "2026-04-10T09:00:00+01:00",
      verdict: "A",
      staffVerdict: "A",
      avgScore: 4.20,
      status: "Done",
      decision: "approved",
      decisionAt: "2026-04-16T15:00:00+09:00",
      decisionBy: "Min Jung",
      comments: [
        { author: "Min Jung", role: "ST BU License Lead", at: "2026-04-16T14:58:00+09:00", body: "Strong heritage-meets-court read. Approved for sampling." },
      ],
      lines: [{
        id: "L-BBUK-LM27", file: "LIFESTYLE - BBUK.pdf", name: "LIFESTYLE", target: "MAN · 27SS", sizeMb: 5.0,
        avgScore: 4.20, grade: "A",
        lineDecision: "approved",
        lineDecisionAt: "2026-04-16T14:59:00+09:00",
        lineDecisionBy: "Min Jung",
        previews: [
          "assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__ARCHIVIO-1.jpg",
          "assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__ARCHIVIO-2.jpg",
        ],
        skus: [
          { id: "43040", name: "BBUK POLO",  category: "Lifestyle", grade: "A", scores: { P1:92, P2:90, P3:88, P4:90, P5:90 }, fabric: "COTTON PIQUE 95% CO 5% EA" },
          { id: "43041", name: "BBUK CHINO", category: "Lifestyle", grade: "A", scores: { P1:88, P2:90, P3:86, P4:88, P5:88 }, fabric: "COTTON TWILL 100% CO" },
        ],
      }],
    },
    {
      // Done · rejected — a rejected line, so the licensee gets the Resubmit
      // affordance (Done + at least one rejected line).
      id: "DES-27SS-BOB-AC-001",
      licenseeId: "lic_75f7462d",
      season: "27SS",
      lineGroup: "Active Court",
      submittedAt: "2026-04-12T09:00:00+01:00",
      verdict: "C",
      staffVerdict: "C",
      avgScore: 2.40,
      status: "Done",
      decision: "disapproved",
      decisionAt: "2026-04-18T11:00:00+09:00",
      decisionBy: "Min Jung",
      comments: [
        { author: "Min Jung", role: "ST BU License Lead", at: "2026-04-18T10:58:00+09:00", body: "Center-front logo exceeds the size limit and the palette pulls too bright. Pull both back and resubmit." },
      ],
      lines: [{
        id: "L-BBUK-AC27", file: "COURT - BBUK 27SS.pdf", name: "COURT", target: "MAN · 27SS", sizeMb: 7.2,
        avgScore: 2.40, grade: "C",
        lineDecision: "rejected",
        lineDecisionAt: "2026-04-18T10:59:00+09:00",
        lineDecisionBy: "Min Jung",
        previews: [
          "assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__KRONOS-1.jpg",
          "assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__KRONOS-2.jpg",
        ],
        skus: [
          { id: "43050", name: "BBUK COURT TEE", category: "Active Court", grade: "C", scores: { P1:62, P2:60, P3:64, P4:62, P5:58 }, fabric: "COTTON JERSEY 100% CO" },
          { id: "43051", name: "BBUK COURT CAP", category: "Accessory",    grade: "C", scores: { P1:60, P2:62, P3:60, P4:64, P5:58 }, fabric: "COTTON 100%" },
        ],
      }],
    },
    // SUBM-003 — already decided / approved. Visible on Inspector queue
    // but not counted in the pending badge.
    {
      id: "DES-27SS-BEN-HR-001",
      licenseeId: "lic_b56a4e2c",
      season: "27SS",
      lineGroup: "Heritage",
      submittedAt: "2026-04-22T11:30:00+02:00",
      verdict: "B",
      staffVerdict: "B",
      avgScore: 2.80,
      status: "Done",
      decision: "approved",
      decisionAt: "2026-04-28T14:12:00+09:00",
      decisionBy: "Min Jung",
      comments: [
        { author: "Min Jung", role: "ST BU License Lead", at: "2026-04-28T14:10:00+09:00", body: "Approved as-is. Heritage palette is on-brand; production cleared." },
      ],
      lines: [{
        id: "L-BENJ-HERITAGE", file: "HERITAGE - BENJAMIN.pdf", name: "HERITAGE", target: "MAN · 27SS", sizeMb: 3.8,
        avgScore: 2.80, grade: "B",
        lineDecision: "approved",
        lineDecisionAt: "2026-04-28T14:11:00+09:00",
        lineDecisionBy: "Min Jung",
        previews: [
          "assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__ARCHIVIO-1.jpg",
          "assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__ARCHIVIO-2.jpg",
        ],
        skus: [
          { id: "44020", name: "HERITAGE JACKET", category: "Heritage", grade: "B", scores: { P1:82, P2:80, P3:75, P4:78, P5:78 }, fabric: "COTTON CANVAS 100% CO" },
          { id: "44021", name: "HERITAGE TEE",    category: "Heritage", grade: "B", scores: { P1:78, P2:78, P3:75, P4:75, P5:78 }, fabric: "COTTON JERSEY 100% CO" },
        ],
      }],
    },
    // SUBM-004 — disapproved, awaiting licensee revision. Drives
    // "designs returned for revision" on the LICENSEE home for Sugi IT.
    {
      id: "DES-27FW-SFOO-FW-001",
      licenseeId: "lic_000025e9",
      season: "27FW",
      lineGroup: "Footwear",
      submittedAt: "2026-05-12T10:05:00+02:00",
      verdict: "C",
      staffVerdict: "D",
      avgScore: 1.90,
      status: "Done",
      decision: "disapproved",
      decisionAt: "2026-05-15T13:40:00+09:00",
      decisionBy: "Min Jung",
      comments: [
        { author: "Min Jung", role: "ST BU License Lead", at: "2026-05-15T13:38:00+09:00", body: "Sole shape drifts from the 25SS reference. Tighten toe profile and re-submit with corrected outsole." },
      ],
      lines: [{
        id: "L-SUGI-FW", file: "FOOTWEAR - SUGI.pdf", name: "FOOTWEAR", target: "UNISEX · 27FW", sizeMb: 12.1,
        avgScore: 1.90, grade: "D",
        lineDecision: "rejected",
        lineDecisionAt: "2026-05-15T13:39:00+09:00",
        lineDecisionBy: "Min Jung",
        previews: [
          "assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__KRONOS-1.jpg",
          "assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__KRONOS-2.jpg",
        ],
        skus: [
          { id: "45050", name: "SUGI COURT SHOE", category: "Footwear", grade: "D", scores: { P1:50, P2:55, P3:50, P4:48, P5:50 }, fabric: "LEATHER + RUBBER" },
        ],
      }],
    },
    // SUBM-005 — Sugi SAS · 27FW Lifestyle Woman. Full WOMAN package with
    // CAD previews + AI annotations on the lead lines.
    {
      id: "DES-27FW-SSAS-LW-001",
      licenseeId: "lic_c2a5c666",
      season: "27FW",
      lineGroup: "Lifestyle Woman",
      submittedAt: "2026-05-16T09:42:00+02:00",
      verdict: "B",
      avgScore: 2.85,
      status: "Under Review",
      comments: [],
      lines: [
        {
          id: "L-AMBROSIA", file: "LIFESTYLE - AMBROSIA.pdf", name: "AMBROSIA", target: "WOMAN · 27FW", sizeMb: 14.2,
          avgScore: 3.10, grade: "A",
          previews: [
            "assets/cad-previews/27FW-LIFESTYLE-WOMAN/LIFESTYLE__AMBROSIA-1.jpg",
            "assets/cad-previews/27FW-LIFESTYLE-WOMAN/LIFESTYLE__AMBROSIA-2.jpg",
          ],
          aiAnnotations: [
            { x: 50, y: 18, kind: "good", title: "P1 signature collar",       detail: "Italian-tennis collar treatment is on-brand and reads as heritage without nostalgia." },
            { x: 42, y: 55, kind: "good", title: "P2 fabric × function",      detail: "Premium wool blend with hidden ventilation panels — quiet performance done well." },
            { x: 65, y: 78, kind: "warn", title: "P5 cuff finish",            detail: "Cuff hem stitching feels a touch sporty — consider a softer rolled finish for court-to-social transition." },
          ],
          skus: [
            { id: "46010", name: "AMBROSIA JACKET",  category: "Heritage", grade: "A", scores: { P1:92, P2:88, P3:85, P4:88, P5:78 }, fabric: "WOOL BLEND 70% WOOL 30% PA" },
            { id: "46011", name: "AMBROSIA SKIRT",   category: "Heritage", grade: "B", scores: { P1:82, P2:80, P3:78, P4:82, P5:78 }, fabric: "WOOL TROPICAL 100% WO" },
            { id: "46012", name: "AMBROSIA POLO",    category: "Heritage", grade: "A", scores: { P1:90, P2:88, P3:85, P4:85, P5:85 }, fabric: "COTTON PIQUE 95% CO 5% EA" },
          ],
        },
        {
          id: "L-CIRENE", file: "LIFESTYLE - CIRENE.pdf", name: "CIRENE", target: "WOMAN · 27FW", sizeMb: 8.5,
          avgScore: 2.80, grade: "B",
          previews: [
            "assets/cad-previews/27FW-LIFESTYLE-WOMAN/LIFESTYLE__CIRENE-1.jpg",
            "assets/cad-previews/27FW-LIFESTYLE-WOMAN/LIFESTYLE__CIRENE-2.jpg",
          ],
          aiAnnotations: [
            { x: 55, y: 35, kind: "good", title: "P3 court-to-social hit",    detail: "Drape transitions cleanly from training to evening wear — strong P3 read." },
            { x: 30, y: 62, kind: "bad",  title: "P4 silhouette deviation",   detail: "Waistline drops 3cm wider than 26SS woman block. Tighten to restore body-lined silhouette." },
          ],
          skus: [
            { id: "46020", name: "CIRENE DRESS",  category: "Lifestyle", grade: "B", scores: { P1:78, P2:75, P3:82, P4:65, P5:80 }, fabric: "JERSEY 95% VI 5% EA" },
            { id: "46021", name: "CIRENE PANT",   category: "Lifestyle", grade: "B", scores: { P1:75, P2:78, P3:80, P4:68, P5:78 }, fabric: "WOOL TROPICAL 100% WO" },
            { id: "46022", name: "CIRENE TEE",    category: "Lifestyle", grade: "C", scores: { P1:62, P2:65, P3:68, P4:62, P5:65 }, fabric: "COTTON JERSEY 100% CO" },
          ],
        },
        {
          id: "L-ETERNA", file: "LIFESTYLE - ETERNA.pdf", name: "ETERNA", target: "WOMAN · 27FW", sizeMb: 6.1,
          avgScore: 2.70, grade: "B",
          previews: [
            "assets/cad-previews/27FW-LIFESTYLE-WOMAN/LIFESTYLE__ETERNA-1.jpg",
            "assets/cad-previews/27FW-LIFESTYLE-WOMAN/LIFESTYLE__ETERNA-2.jpg",
          ],
          skus: [
            { id: "46030", name: "ETERNA TRACK JACKET", category: "Active Court", grade: "B", scores: { P1:75, P2:78, P3:75, P4:80, P5:75 }, fabric: "NYLON STRETCH 88% PA 12% EA" },
            { id: "46031", name: "ETERNA TRACK PANT",   category: "Active Court", grade: "B", scores: { P1:72, P2:75, P3:78, P4:75, P5:72 }, fabric: "NYLON STRETCH 88% PA 12% EA" },
          ],
        },
        {
          id: "L-NISA", file: "LIFESTYLE - NISA.pdf", name: "NISA", target: "WOMAN · 27FW", sizeMb: 4.8,
          avgScore: 2.40, grade: "C",
          previews: [
            "assets/cad-previews/27FW-LIFESTYLE-WOMAN/LIFESTYLE__NISA-1.jpg",
            "assets/cad-previews/27FW-LIFESTYLE-WOMAN/LIFESTYLE__NISA-2.jpg",
          ],
          skus: [
            { id: "46040", name: "NISA POLO",   category: "Active Court", grade: "C", scores: { P1:60, P2:65, P3:62, P4:65, P5:62 }, fabric: "COTTON PIQUE 100% CO" },
            { id: "46041", name: "NISA SKIRT",  category: "Active Court", grade: "C", scores: { P1:62, P2:65, P3:65, P4:60, P5:60 }, fabric: "POLY STRETCH 92% PL 8% EA" },
          ],
        },
        {
          id: "L-PENELOPE", file: "LIFESTYLE - PENELOPE.pdf", name: "PENELOPE", target: "WOMAN · 27FW", sizeMb: 9.3,
          avgScore: 3.00, grade: "B",
          previews: [
            "assets/cad-previews/27FW-LIFESTYLE-WOMAN/LIFESTYLE__PENELOPE-1.jpg",
            "assets/cad-previews/27FW-LIFESTYLE-WOMAN/LIFESTYLE__PENELOPE-2.jpg",
          ],
          skus: [
            { id: "46050", name: "PENELOPE COAT",   category: "Outerwear", grade: "B", scores: { P1:82, P2:80, P3:75, P4:78, P5:78 }, fabric: "WOOL CASHMERE 80% WO 20% WS" },
            { id: "46051", name: "PENELOPE GLOVE",  category: "Accessory", grade: "B", scores: { P1:78, P2:80, P3:78, P4:75, P5:75 }, fabric: "LEATHER 100%" },
          ],
        },
        {
          id: "L-VICTORIA", file: "LIFESTYLE - VICTORIA.pdf", name: "VICTORIA", target: "WOMAN · 27FW", sizeMb: 7.4,
          avgScore: 2.90, grade: "B",
          previews: [
            "assets/cad-previews/27FW-LIFESTYLE-WOMAN/LIFESTYLE__VICTORIA-1.jpg",
            "assets/cad-previews/27FW-LIFESTYLE-WOMAN/LIFESTYLE__VICTORIA-2.jpg",
          ],
          skus: [
            { id: "46060", name: "VICTORIA BLAZER", category: "Heritage", grade: "B", scores: { P1:80, P2:82, P3:78, P4:78, P5:78 }, fabric: "WOOL BLEND 70% WO 30% PA" },
            { id: "46061", name: "VICTORIA SHIRT",  category: "Heritage", grade: "B", scores: { P1:75, P2:78, P3:78, P4:75, P5:75 }, fabric: "COTTON POPLIN 100% CO" },
          ],
        },
        {
          id: "L-ESSENTIALS-W", file: "LIFESTYLE - ESSENTIALS PLUS W.pdf", name: "ESSENTIALS PLUS W", target: "WOMAN · 27FW", sizeMb: 5.2,
          avgScore: 2.50, grade: "B",
          previews: [
            "assets/cad-previews/27FW-LIFESTYLE-WOMAN/LIFESTYLE__ESSENTIALS_PLUS_W-1.jpg",
            "assets/cad-previews/27FW-LIFESTYLE-WOMAN/LIFESTYLE__ESSENTIALS_PLUS_W-2.jpg",
          ],
          skus: [
            { id: "46070", name: "ESSENTIALS PLUS W HOODIE", category: "Lifestyle", grade: "B", scores: { P1:72, P2:75, P3:72, P4:75, P5:75 }, fabric: "COTTON FLEECE 100% CO" },
            { id: "46071", name: "ESSENTIALS PLUS W LEGGING",category: "Lifestyle", grade: "C", scores: { P1:62, P2:68, P3:65, P4:65, P5:62 }, fabric: "NYLON SPANDEX 88% PA 12% EA" },
            { id: "46072", name: "ESSENTIALS PLUS W TEE",    category: "Lifestyle", grade: "C", scores: { P1:60, P2:62, P3:62, P4:60, P5:60 }, fabric: "COTTON JERSEY 100% CO" },
          ],
        },
      ],
    }];
    // Merge instead of overwrite — preserves any user-uploaded submissions
    // and back-fills seed entries that didn't exist in older cached state.
    const additions = submissions.filter(sub => !existingIds.has(sub.id));
    if (additions.length === 0) return;
    STE.mutate(s => {
      s.designSubmissions = (s.designSubmissions || []).concat(additions);
    });
  }

  // ============================ INSPECTOR ============================
  // Role-aware:
  //  · Licensee: their own submissions, status, upload new package
  //  · Staff (HQ): queue of ALL submissions, review scores, leave comments,
  //    Release once review is done.
  // Extract the sub-route segment off `#/design-review/...`. Returns null if
  // the hash is just `#/design-review`. Used to drive list-vs-detail rendering
  // off the URL so the browser back/forward buttons work and detail pages
  // are linkable.
  function inspectorSubRoute() {
    // Canonical:
    //   #/design-review/details/view/<id>      (detail)
    //   #/design-review/details/edit/<id>      (licensee edit page on a Draft submission)
    // Legacy (still accepted, then normalized by the link generators):
    //   #/design-review/details/<id>           → view
    //   #/design-review/details/<id>/edit      → edit
    //   #/design-review/<id>                   → view
    const h = location.hash || "";
    const canonical = h.match(/^#\/design-review\/details\/(view|edit)\/([A-Z0-9_-]+)/i);
    if (canonical) return { id: canonical[2], action: canonical[1].toLowerCase() === "edit" ? "edit" : null };
    const legacy = h.match(/^#\/design-review(?:\/details)?\/([A-Z0-9_-]+)(?:\/([a-z]+))?/i);
    return legacy ? { id: legacy[1], action: legacy[2] ? legacy[2].toLowerCase() : null } : null;
  }

  function inspector() {
    ensureSeed();
    STE.mutate(s => migrateLegacyScores(s));
    const root = pageMain("design-review");
    const u = STE.currentUser();
    const isHQ = u && STE.isHQ(u);
    const sub = inspectorSubRoute();
    const subId = sub ? sub.id : null;
    // Sub-route #/design-review/submit-new-design → upload flow. Licensee
    // submits for their own org; HQ can submit on behalf of any licensee
    // via a picker. Legacy /new still works for any saved bookmarks.
    if (subId === "submit-new-design" || subId === "new") return inspectorUpload(root, u, isHQ, null);
    // Sub-route #/design-review/details/<id>/edit → edit form pre-filled from
    // the existing submission. Only Draft submissions can be edited.
    if (subId && sub.action === "edit") {
      const found = (STE.get().designSubmissions || []).find(s => s.id === subId);
      if (found) return inspectorUpload(root, u, isHQ, found);
    }
    // Sub-route #/design-review/<SUBM-ID> → detail page
    if (subId) {
      const found = (STE.get().designSubmissions || []).find(s => s.id === subId);
      if (found) return inspectorDetail(root, subId, isHQ);
    }
    // Both HQ and licensees share the same list shell — inspectorStaff
    // hides the Licensee column + filter when !isHQ and masks Grade/Score
    // for rows that aren't Done yet.
    return inspectorStaff(root, isHQ, u);
  }

  function inspectorUpload(root, u, isHQ, existing) {
    const allLicensees = STE.get().licensees || [];
    // Product Category mapping from Reference Data (admin-managed). Used as
    // the dropdown vocabulary in the SKU table below so designers pick from
    // the canonical taxonomy instead of free-typing.
    const PRODUCT_CATEGORIES = ((STE.get().referenceData || {}).categories) || [];
    const session = STE.getSession() || {};
    const isEditing = !!existing;
    const defaultLicId = isHQ
      ? (session.inspectorUploadDraft?.licenseeId || (allLicensees[0] && allLicensees[0].id) || "")
      : u.licenseeId;
    // Edit mode: hydrate the draft from the existing submission so the form
    // pre-fills with the parsed lines + SKU details. Resets each time the
    // user opens the edit URL so stale unsaved tweaks don't sneak through.
    if (isEditing) {
      if (!session._editingSubId || session._editingSubId !== existing.id) {
        const hydrated = {
          season: existing.season,
          lineGroup: existing.lineGroup,
          licenseeId: existing.licenseeId,
          files: (existing.lines || []).map(l => ({
            name: l.file,
            line: l.name,
            sizeMb: l.sizeMb || 0,
            skuCount: (l.skus || []).length,
            previews: l.previews || [],
            // Carry through SKU details so edits round-trip back to the line.
            skus: (l.skus || []).map(sku => ({
              id: sku.id, name: sku.name, category: sku.category, fabric: sku.fabric,
            })),
          })),
        };
        STE.setSession({ ...session, inspectorUploadDraft: hydrated, _editingSubId: existing.id });
      }
    }
    const draft = (STE.getSession() || {}).inspectorUploadDraft
      || { season: "27FW", lineGroup: "Lifestyle Man", files: [], licenseeId: defaultLicId };
    // Backfill licenseeId for older drafts.
    if (!draft.licenseeId) draft.licenseeId = defaultLicId;
    const activeLicId = isHQ ? draft.licenseeId : u.licenseeId;
    const lic = allLicensees.find(l => l.id === activeLicId) || { legalName: activeLicId };
    const parsed = !!(draft.files && draft.files.length);
    // Transient "uploading + analyzing" state for the new-design flow. While
    // active, the line editor is hidden behind a progress skeleton so the
    // mock upload doesn't feel instantaneous. handleFiles sets this flag and
    // a setTimeout below clears it once analysis "completes".
    const analyzing = !!(STE.getSession() || {})._uploadAnalyzing;

    const pageTitle = isEditing ? `Edit ${escape(existing.id)}` : "Submit New Design";
    const submitLabel = isEditing ? "Save & Resubmit" : "Submit for Review";
    root.innerHTML = `
      <div class="ste-screen-pad">
        <div class="ste-section-hd">
          <div class="ste-page-crumbs">
            <a href="${isHQ ? '#/hq' : '#/home'}">Home</a><span class="sep">/</span>
            <a href="#/design-review" data-back-list>Design Review</a><span class="sep">/</span>
            ${isEditing ? `<a href="#/design-review/details/view/${escape(existing.id)}" data-back-detail>${escape(existing.id)}</a><span class="sep">/</span><span class="cur">Edit</span>` : `<span class="cur">Submit New Design</span>`}
          </div>
          <div class="ste-page-hd-row">
            <div>
              <h1>${pageTitle}${isHQ ? ` <span class="ste-mini ste-onbehalf-tag">on behalf of ${escape(lic.legalName)}</span>` : ''}</h1>
            </div>
            <div class="ste-hd-cta">
              <a class="ste-btn ste-btn-ghost" href="${isEditing ? '#/design-review/details/view/' + escape(existing.id) : '#/design-review'}" data-back-list>Cancel</a>
              <div class="ste-split-btn" data-split-btn>
                <button class="ste-btn ste-btn-primary ste-split-btn-main" data-act="submit" ${parsed ? '' : 'disabled'} title="${parsed ? (isEditing ? 'Save edits and resubmit for review' : 'Submit this package for HQ review') : 'Add at least one line PDF first'}">${submitLabel}</button>
                <button class="ste-btn ste-btn-primary ste-split-btn-caret" type="button" data-split-toggle ${parsed ? '' : 'disabled'} aria-haspopup="menu" aria-expanded="false" aria-label="More options"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg></button>
                <div class="ste-split-btn-menu" data-split-menu hidden role="menu">
                  <button class="ste-split-btn-item" type="button" data-act="save-draft-upload" role="menuitem">Save as draft</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="ste-card">
          <div class="ste-card-head"><h3>Basic Info</h3></div>
          <div class="ste-card-body">
            ${isHQ ? `
              <div class="ste-field" style="margin-bottom:14px">
                <div class="ste-lbl">LICENSEE</div>
                <select class="ste-input" data-uf="licenseeId">
                  ${allLicensees.map(l => `<option value="${escape(l.id)}" ${l.id===activeLicId?'selected':''}>${escape(l.legalName)}</option>`).join("")}
                </select>
              </div>
            ` : ''}
            <div class="ste-field">
              <div class="ste-lbl">SEASON</div>
              <select class="ste-input" data-uf="season">
                ${["26SS","26FW","27SS","27FW","28SS"].map(s => `<option ${s===draft.season?'selected':''}>${s}</option>`).join("")}
              </select>
              <div class="ste-mini" style="margin-top:6px">Line Group is set per line below — each file can belong to a different group.</div>
            </div>
          </div>
        </div>

        <div class="ste-card">
          <div class="ste-card-head">
            <h3>${isEditing ? 'Lines' : 'Lines'}</h3>
            ${parsed && !analyzing ? `
              <div style="display:flex;gap:8px;margin-left:auto">
                <button class="ste-btn ste-btn-ghost ste-btn-mini" data-act="browse" type="button" title="Upload additional CAD PDFs — drag-drop onto this card also works">+ Upload additional CADs</button>
              </div>` : ''}
          </div>
          <div class="ste-card-body">
            <input type="file" id="ste-insp-files" accept=".pdf" multiple hidden>
            ${analyzing ? `
              <div class="ste-insp-upload-analyzing" aria-live="polite">
                <div class="ste-insp-upload-progress" aria-hidden="true">
                  <span class="ste-insp-upload-progress-bar"></span>
                </div>
                <div class="ste-insp-upload-analyzing-hd">
                  <strong>Uploading and analyzing</strong>
                </div>
              </div>
            ` : ''}
            ${parsed && !analyzing ? `
              <div class="ste-insp-line-editor-list">
                ${draft.files.map((f, i) => {
                  const expanded = (session._linesOpen || []).indexOf(i) >= 0 || (draft.files.length === 1);
                  const skus = f.skus || [];
                  return `
                  <div class="ste-insp-line-editor ${expanded ? 'is-open' : ''}" data-line-editor="${i}">
                    <div class="ste-insp-line-editor-hd">
                      <button class="ste-insp-line-editor-toggle" data-line-toggle="${i}" type="button" aria-expanded="${expanded ? 'true' : 'false'}">
                        <span class="ste-insp-line-editor-chev" aria-hidden="true">▾</span>
                        <div class="ste-insp-line-editor-thumb">
                          ${(f.previews && f.previews[0]) ? `<img src="${escape(f.previews[0])}" alt="" loading="lazy">` : `<span class="ste-mini">${(f.previews && f.previews.length === 0 && f.sizeMb === 0) ? '✎' : 'PDF'}</span>`}
                        </div>
                        <div class="ste-insp-line-editor-meta">
                          <strong>${escape(f.line)}</strong>
                          <div class="ste-mini">${skus.length || f.skuCount || 0} SKUs${f.sizeMb > 0 ? ` · ${f.sizeMb.toFixed(1)} MB` : ''} · ${escape(f.name)}</div>
                        </div>
                      </button>
                      <button class="ste-insp-line-editor-rm" data-rm-file="${i}" type="button" aria-label="Remove ${escape(f.name)}" title="Remove line">×</button>
                    </div>
                    ${expanded ? `
                      <div class="ste-insp-line-editor-body">
                        ${(f.previews || []).length ? `
                          <div class="ste-insp-line-editor-images">
                            ${f.previews.map((src, pIdx) => `
                              <div class="ste-insp-line-editor-imgwrap">
                                <button type="button" class="ste-insp-line-editor-imgbtn" data-upload-lightbox="${i}|${pIdx}" aria-label="Zoom ${escape(f.line)} page ${pIdx+1}" title="Click to zoom">
                                  <img src="${escape(src)}" alt="${escape(f.line)} page ${pIdx+1}" loading="lazy">
                                  <span class="ste-cad-zoom-hint" aria-hidden="true">⤢</span>
                                </button>
                                <div class="ste-mini" style="text-align:center;margin-top:4px">Page ${pIdx+1}</div>
                              </div>`).join("")}
                          </div>` : ''}
                        <div class="ste-insp-line-editor-fields ste-form-grid-2">
                          <div class="ste-field">
                            <div class="ste-lbl">LINE NAME</div>
                            <input class="ste-input" type="text" data-line-field="${i}|line" value="${escape(f.line)}" placeholder="ATLAS">
                          </div>
                          <div class="ste-field">
                            <div class="ste-lbl">LINE GROUP</div>
                            <select class="ste-input" data-line-field="${i}|lineGroup">
                              ${["Lifestyle Man","Lifestyle Woman","Active Man","Active Woman","Kids","Accessory"].map(g => `<option value="${escape(g)}" ${g===(f.lineGroup || draft.lineGroup || 'Lifestyle Man')?'selected':''}>${escape(g)}</option>`).join("")}
                            </select>
                          </div>
                        </div>
                        <div class="ste-insp-line-editor-skus">
                          <div class="ste-insp-line-editor-skus-hd">
                            <button class="ste-btn ste-btn-ghost ste-btn-mini" data-sku-add="${i}" type="button">+ Add Style Code</button>
                          </div>
                          <table class="ste-mirror-records ste-insp-line-sku-table">
                            <thead>
                              <tr>
                                <th style="width:110px">SKU</th>
                                <th>Name</th>
                                <th style="width:140px">Category</th>
                                <th>Fabric</th>
                                <th style="width:40px"></th>
                              </tr>
                            </thead>
                            <tbody>
                              ${skus.length === 0
                                ? `<tr><td colspan="5" class="ste-empty-cell" style="padding:12px;text-align:center;color:var(--ste-muted)">No Style Codes parsed yet. Click "+ Add Style Code" to add one manually.</td></tr>`
                                : skus.map((sku, sIdx) => `
                                  <tr>
                                    <td><input class="ste-input ste-cell-input" type="text" data-sku-field="${i}|${sIdx}|id" value="${escape(sku.id || '')}" placeholder="42050"></td>
                                    <td><input class="ste-input ste-cell-input" type="text" data-sku-field="${i}|${sIdx}|name" value="${escape(sku.name || '')}" placeholder="ATLAS POLO"></td>
                                    <td>${(() => {
                                      // Treat legacy line-DNA placeholders (Lifestyle / Heritage /
                                      // Active Court / Active Athleisure / Active Classic) as
                                      // unselected so users land on "—" instead of seeing a stale
                                      // value pre-picked.
                                      const LEGACY = new Set(["LIFESTYLE","HERITAGE","ACTIVE COURT","ACTIVE ATHLEISURE","ACTIVE CLASSIC"]);
                                      const rawCur = (sku.category || '').toUpperCase();
                                      const cur = LEGACY.has(rawCur) ? '' : rawCur;
                                      const inList = PRODUCT_CATEGORIES.includes(cur);
                                      return `<select class="ste-input ste-cell-input ste-cell-select" data-sku-field="${i}|${sIdx}|category">
                                        <option value="" ${cur ? '' : 'selected'}>—</option>
                                        ${PRODUCT_CATEGORIES.map(c => `<option value="${escape(c)}" ${cur === c ? 'selected' : ''}>${escape(c)}</option>`).join("")}
                                        ${cur && !inList ? `<option value="${escape(cur)}" selected>${escape(cur)}</option>` : ''}
                                      </select>`;
                                    })()}</td>
                                    <td><input class="ste-input ste-cell-input" type="text" data-sku-field="${i}|${sIdx}|fabric" value="${escape((() => {
                                      // Sanitize stale defaults so the cell doesn't keep showing the
                                      // generic "Cotton blend" placeholder from previous builds —
                                      // pick a realistic per-SKU fabric instead.
                                      const raw = (sku.fabric || '').replace(/^AI-classified\s*·\s*/i, '');
                                      if (/^Cotton blend$/i.test(raw) || /^Pending parse$/i.test(raw) || !raw) {
                                        return pickPlaceholderFabric(f.line, sIdx);
                                      }
                                      return raw;
                                    })())}" placeholder="COTTON 100% CO"></td>
                                    <td><button class="ste-batch-row-rm" type="button" data-sku-rm="${i}|${sIdx}" aria-label="Remove Style Code">×</button></td>
                                  </tr>`).join("")}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ` : ''}
                  </div>`;
                }).join("")}
              </div>
            ` : ''}
            ${!parsed && !analyzing ? `
              <div class="ste-insp-drop" id="ste-insp-drop">
                <div class="ste-insp-drop-icon">⤴︎</div>
                <div class="ste-insp-drop-title">Drop PDFs here or <button class="ste-btn-link" data-act="browse">Browse files</button></div>
                <div class="ste-mini">Supports .pdf — up to 500MB per line</div>
              </div>` : ''}
          </div>
        </div>
      </div>`;

    // Upload-analyze scheduler — when the analyzing skeleton is on screen,
    // wait long enough for the mock upload to feel like real work, then
    // commit the parsed files to the draft so the editor reveals.
    if (analyzing) {
      setTimeout(() => {
        const sess = STE.getSession() || {};
        const pending = sess._pendingUploadCommit;
        if (!pending) {
          // Defensive: nothing to commit, just clear the flag.
          STE.setSession({ ...sess, _uploadAnalyzing: false });
          inspector();
          return;
        }
        const d = sess.inspectorUploadDraft || draft;
        STE.setSession({
          ...sess,
          inspectorUploadDraft: { ...d, files: pending.files },
          _linesOpen: pending.openSet,
          _uploadAnalyzing: false,
          _pendingUploadCommit: null,
        });
        inspector();
      }, 3000);
    }

    // Wire field bindings. Licensee picker (HQ on-behalf flow) re-renders
    // so the resubmit candidates and breadcrumb update; other fields stay
    // resident until submit.
    $$("[data-uf]", root).forEach(inp => {
      inp.addEventListener("change", () => {
        const k = inp.getAttribute("data-uf");
        STE.setSession({ ...STE.getSession(), inspectorUploadDraft: { ...draft, [k]: inp.value } });
        if (k === "licenseeId") inspector();
      });
    });

    // Browse / drop. After upload, the dedicated drop zone is replaced by a
    // preview grid — but the surrounding card body still accepts file drops,
    // so listeners bind to the card body when the drop zone isn't present.
    const fileInput = $("#ste-insp-files", root);
    $$("[data-act='browse']", root).forEach(b => b.addEventListener("click", (e) => {
      e.preventDefault();
      fileInput && fileInput.click();
    }));
    const drop = $("#ste-insp-drop", root) || (fileInput && fileInput.closest(".ste-card-body"));
    drop?.addEventListener("dragover", e => { e.preventDefault(); drop.classList.add("ste-drop-on"); });
    drop?.addEventListener("dragleave", () => drop.classList.remove("ste-drop-on"));
    drop?.addEventListener("drop", e => {
      e.preventDefault(); drop.classList.remove("ste-drop-on");
      handleFiles(e.dataTransfer.files);
    });
    fileInput?.addEventListener("change", e => handleFiles(e.target.files));

    // Demo CAD preview pool — pairs of (page-1, page-2) keyed roughly by
    // line group. Real upload would render PDF pages; mock attaches one of
    // these pairs to each uploaded "PDF" so the preview UI has content.
    const MAN_PREVIEW_PAIRS = [
      ["assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__ARCHIVIO-1.jpg","assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__ARCHIVIO-2.jpg"],
      ["assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__ATLAS-1.jpg","assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__ATLAS-2.jpg"],
      ["assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__CEO-1.jpg","assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__CEO-2.jpg"],
      ["assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__CRIO-1.jpg","assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__CRIO-2.jpg"],
      ["assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__ESSENTIALS_PLUS-1.jpg","assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__ESSENTIALS_PLUS-2.jpg"],
      ["assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__GIAPETO-1.jpg","assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__GIAPETO-2.jpg"],
      ["assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__KRONOS-1.jpg","assets/cad-previews/27FW-LIFESTYLE-MAN/LIFESTYLE__KRONOS-2.jpg"],
    ];
    const WOMAN_PREVIEW_PAIRS = [
      ["assets/cad-previews/27FW-LIFESTYLE-WOMAN/LIFESTYLE__AMBROSIA-1.jpg","assets/cad-previews/27FW-LIFESTYLE-WOMAN/LIFESTYLE__AMBROSIA-2.jpg"],
      ["assets/cad-previews/27FW-LIFESTYLE-WOMAN/LIFESTYLE__CIRENE-1.jpg","assets/cad-previews/27FW-LIFESTYLE-WOMAN/LIFESTYLE__CIRENE-2.jpg"],
      ["assets/cad-previews/27FW-LIFESTYLE-WOMAN/LIFESTYLE__ESSENTIALS_PLUS_W-1.jpg","assets/cad-previews/27FW-LIFESTYLE-WOMAN/LIFESTYLE__ESSENTIALS_PLUS_W-2.jpg"],
      ["assets/cad-previews/27FW-LIFESTYLE-WOMAN/LIFESTYLE__ETERNA-1.jpg","assets/cad-previews/27FW-LIFESTYLE-WOMAN/LIFESTYLE__ETERNA-2.jpg"],
      ["assets/cad-previews/27FW-LIFESTYLE-WOMAN/LIFESTYLE__NISA-1.jpg","assets/cad-previews/27FW-LIFESTYLE-WOMAN/LIFESTYLE__NISA-2.jpg"],
      ["assets/cad-previews/27FW-LIFESTYLE-WOMAN/LIFESTYLE__PENELOPE-1.jpg","assets/cad-previews/27FW-LIFESTYLE-WOMAN/LIFESTYLE__PENELOPE-2.jpg"],
      ["assets/cad-previews/27FW-LIFESTYLE-WOMAN/LIFESTYLE__VICTORIA-1.jpg","assets/cad-previews/27FW-LIFESTYLE-WOMAN/LIFESTYLE__VICTORIA-2.jpg"],
    ];
    function pickPreviewPair(lineGroup, seed) {
      const pool = /woman/i.test(lineGroup) ? WOMAN_PREVIEW_PAIRS : MAN_PREVIEW_PAIRS;
      return pool[seed % pool.length];
    }
    // Realistic placeholder fabric — biases by line-name keyword (POLO →
    // piqué, TRACK → nylon, etc.) and rotates within that bucket per SKU
    // so a single line isn't all "Cotton blend". Falls through to a mixed
    // pool when the line name doesn't match any keyword.
    const FABRIC_POOLS = {
      polo:    ["COTTON PIQUE 100% CO","COTTON PIQUE 95% CO 5% EA","JERSEY 95% VI 5% EA"],
      tee:     ["COTTON JERSEY 100% CO","COTTON SLUB 100% CO","JERSEY 65% CO 35% PL"],
      track:   ["NYLON STRETCH 88% PA 12% EA","POLY STRETCH 92% PL 8% EA","MESH PA 100%","NYLON TAFFETA 100% PA"],
      jacket:  ["NYLON STRETCH 88% PA 12% EA","COTTON CANVAS 100% CO","WOOL BLEND 70% WO 30% PA"],
      pant:    ["COTTON TWILL 100% CO","WOOL TROPICAL 100% WO","POLYESTER MEMORY 100% PL"],
      short:   ["COTTON TWILL 100% CO","POLYESTER 100% PL","COTTON CANVAS 100% CO"],
      knit:    ["WOOL CASHMERE 80% WO 20% WS","COTTON BLEND 70% CO 30% PA"],
      sweat:   ["COTTON FLEECE 100% CO","COTTON FRENCH TERRY 100% CO"],
      hoodie:  ["COTTON FLEECE 100% CO","COTTON FRENCH TERRY 80% CO 20% PL"],
      shirt:   ["COTTON POPLIN 100% CO","LINEN BLEND 55% LI 45% CO"],
      cap:     ["COTTON TWILL 100% CO","POLYESTER 100% PL"],
      sock:    ["COTTON BLEND 80% CO 20% PA"],
      shoe:    ["LEATHER + RUBBER","LEATHER 100%","MESH PA 100%"],
      mixed:   ["COTTON JERSEY 100% CO","COTTON TWILL 100% CO","WOOL BLEND 70% WO 30% PA","NYLON STRETCH 88% PA 12% EA","POLYESTER 100% PL","COTTON PIQUE 100% CO","COTTON FLEECE 100% CO","LINEN BLEND 55% LI 45% CO"],
    };
    function pickPlaceholderFabric(lineName, skuIdx) {
      const n = (lineName || "").toUpperCase();
      let key = "mixed";
      if (/POLO/.test(n)) key = "polo";
      else if (/TRACK/.test(n)) key = "track";
      else if (/JACKET|BOMBER|COAT/.test(n)) key = "jacket";
      else if (/PANT/.test(n)) key = "pant";
      else if (/SHORT/.test(n)) key = "short";
      else if (/HOOD/.test(n)) key = "hoodie";
      else if (/SWEAT|CREW|FLEECE/.test(n)) key = "sweat";
      else if (/KNIT|SWEATER/.test(n)) key = "knit";
      else if (/SHIRT/.test(n) && !/T.?SHIRT|TEE/.test(n)) key = "shirt";
      else if (/TEE|T.?SHIRT/.test(n)) key = "tee";
      else if (/CAP|HAT/.test(n)) key = "cap";
      else if (/SOCK/.test(n)) key = "sock";
      else if (/SHOE|SNEAKER|SANDAL/.test(n)) key = "shoe";
      const pool = FABRIC_POOLS[key] || FABRIC_POOLS.mixed;
      return pool[skuIdx % pool.length];
    }
    function handleFiles(fileList) {
      const startIdx = (draft.files || []).length;
      const fresh = Array.from(fileList).filter(f => f.name.toLowerCase().endsWith(".pdf")).map((f, i) => {
        // Mock parse: line name = filename root, SKUs = 3-8 random
        const root = f.name.replace(/^.*[- ]/, '').replace(/\.pdf$/i, '').toUpperCase();
        // Deterministic preview pick based on filename so the same file
        // resolves to the same preview across re-renders.
        const seed = (startIdx + i) + (f.name.split("").reduce((a, c) => a + c.charCodeAt(0), 0));
        const skuCount = 3 + Math.floor(Math.random() * 6);
        // Pre-generate SKU placeholders so the editor has something to show
        // immediately — these are the "AI-parsed" values the user can override
        // in the line editor before submitting.
        const skus = Array.from({ length: skuCount }, (_, k) => ({
          id: String(50000 + Math.floor(Math.random()*9000)),
          name: `${root} ITEM ${k+1}`,
          // Empty so the SKU table dropdown lands on "—" and forces a
          // conscious pick from the canonical product-category list.
          category: "",
          fabric: pickPlaceholderFabric(root, k),
        }));
        return {
          name: f.name,
          line: root,
          // Each uploaded file picks its own line group; defaults to the
          // draft's last-used group so an all-Lifestyle batch doesn't
          // require switching every file manually.
          lineGroup: draft.lineGroup || "Lifestyle Man",
          sizeMb: f.size / 1024 / 1024,
          skuCount,
          previews: pickPreviewPair(draft.lineGroup, seed),
          skus,
        };
      });
      if (!fresh.length) { STEApp.toast("Only PDF files can be uploaded", "warn"); return; }
      const newFiles = [...(draft.files || []), ...fresh];
      // Two-phase render: first show the analyzing skeleton (so the mock
      // upload looks like a real parse/score pass), then commit the parsed
      // lines + clear the flag once "analysis" finishes. The DOM-level
      // step ticks come from the post-render scheduler below.
      const sess = STE.getSession() || {};
      const openSet = new Set(sess._linesOpen || []);
      fresh.forEach((_, i) => openSet.add(startIdx + i));
      STE.setSession({
        ...sess,
        _uploadAnalyzing: { count: fresh.length, startedAt: Date.now() },
        _pendingUploadCommit: { files: newFiles, openSet: Array.from(openSet) },
      });
      inspector();
    }

    // Line accordion toggle — clicking the header expands/collapses the
    // editable SKU panel. State persists in session._linesOpen so closing
    // doesn't wipe filled-in fields (the inputs are re-rendered on re-open).
    $$("[data-line-toggle]", root).forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-line-toggle"), 10);
        const sess = STE.getSession() || {};
        const openSet = new Set(sess._linesOpen || []);
        if (openSet.has(idx)) openSet.delete(idx); else openSet.add(idx);
        STE.setSession({ ...sess, _linesOpen: Array.from(openSet) });
        inspector();
      });
    });

    // Line-level fields (line name / lineGroup) — input fires for the text
    // field; change fires for the select. Both write to the same per-file
    // store keyed by the field name.
    $$("[data-line-field]", root).forEach(inp => {
      const evt = inp.tagName === "SELECT" ? "change" : "input";
      inp.addEventListener(evt, () => {
        const [iStr, key] = inp.getAttribute("data-line-field").split("|");
        const i = parseInt(iStr, 10);
        const sess = STE.getSession() || {};
        const d = sess.inspectorUploadDraft || draft;
        const files = (d.files || []).slice();
        if (!files[i]) return;
        files[i] = { ...files[i], [key]: inp.value };
        STE.setSession({ ...sess, inspectorUploadDraft: { ...d, files } });
      });
    });

    // SKU field edit (id / name / category / fabric).
    $$("[data-sku-field]", root).forEach(inp => {
      inp.addEventListener("input", () => {
        const [iStr, sStr, key] = inp.getAttribute("data-sku-field").split("|");
        const i = parseInt(iStr, 10), s = parseInt(sStr, 10);
        const sess = STE.getSession() || {};
        const d = sess.inspectorUploadDraft || draft;
        const files = (d.files || []).slice();
        if (!files[i] || !files[i].skus || !files[i].skus[s]) return;
        const skus = files[i].skus.slice();
        skus[s] = { ...skus[s], [key]: inp.value };
        files[i] = { ...files[i], skus };
        STE.setSession({ ...sess, inspectorUploadDraft: { ...d, files } });
      });
    });

    // Add SKU row.
    $$("[data-sku-add]", root).forEach(btn => {
      btn.addEventListener("click", () => {
        const i = parseInt(btn.getAttribute("data-sku-add"), 10);
        const sess = STE.getSession() || {};
        const d = sess.inspectorUploadDraft || draft;
        const files = (d.files || []).slice();
        if (!files[i]) return;
        const nextSku = {
          id: String(50000 + Math.floor(Math.random()*9000)),
          name: `${files[i].line} ITEM ${(files[i].skus || []).length + 1}`,
          category: "",
          fabric: "",
        };
        const skus = [...(files[i].skus || []), nextSku];
        files[i] = { ...files[i], skus, skuCount: skus.length };
        STE.setSession({ ...sess, inspectorUploadDraft: { ...d, files } });
        inspector();
      });
    });

    // Remove SKU row.
    $$("[data-sku-rm]", root).forEach(btn => {
      btn.addEventListener("click", () => {
        const [iStr, sStr] = btn.getAttribute("data-sku-rm").split("|");
        const i = parseInt(iStr, 10), s = parseInt(sStr, 10);
        const sess = STE.getSession() || {};
        const d = sess.inspectorUploadDraft || draft;
        const files = (d.files || []).slice();
        if (!files[i] || !files[i].skus) return;
        const skus = files[i].skus.filter((_, idx) => idx !== s);
        files[i] = { ...files[i], skus, skuCount: skus.length };
        STE.setSession({ ...sess, inspectorUploadDraft: { ...d, files } });
        inspector();
      });
    });

    // Remove file
    $$("[data-rm-file]", root).forEach(b => {
      b.addEventListener("click", () => {
        const i = parseInt(b.getAttribute("data-rm-file"));
        const newFiles = draft.files.filter((_, idx) => idx !== i);
        STE.setSession({ ...STE.getSession(), inspectorUploadDraft: { ...draft, files: newFiles } });
        inspector();
      });
    });

    // Upload-preview thumbnail zoom — opens the same CAD lightbox used on
    // the read-only view page so reviewers and licensees get a consistent
    // zoom-and-pan experience for the pages they uploaded.
    $$("[data-upload-lightbox]", root).forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const [fileIdxStr, pIdxStr] = btn.getAttribute("data-upload-lightbox").split("|");
        const fIdx = parseInt(fileIdxStr, 10);
        const pIdx = parseInt(pIdxStr, 10) || 0;
        const file = (draft.files || [])[fIdx];
        if (!file) return;
        // Synthesize a line-like object so openCadLightbox can reuse its
        // pan/zoom + arrow-key navigation logic verbatim.
        const lineLike = {
          id: "upload-" + fIdx,
          name: file.line || file.name || "Upload",
          previews: file.previews || [],
        };
        openCadLightbox(lineLike, pIdx);
      });
    });

    // Back link
    $$("[data-back-list]", root).forEach(b => {
      b.addEventListener("click", e => {
        e.preventDefault();
        STE.setSession({ ...STE.getSession(), inspectorUploadDraft: null });
        location.hash = "#/design-review";
      });
    });

    // Submit — create submission record, route back to list. Marks the new
    // submission as `aiAnalyzing: true` so the UI shows a scoring-in-progress
    // state. A simulated scoring pass populates real grades + scores after a
    // few seconds, mirroring what an actual AI pipeline would do.
    // Commit the uploaded package either as a submission (Pending Review →
    // AI scoring) or as a Draft (saved for later, no scoring). Shared by the
    // split button's main action and its "Save as draft" menu item.
    const commitUpload = (targetStatus) => {
      const toDraft = targetStatus === "Draft";
      // Read the freshest draft from session — the closure-captured `draft`
      // can be stale because Season / Line Group changes don't re-render,
      // they only patch the session (otherwise the user loses cursor focus).
      const fresh = (STE.getSession() || {}).inspectorUploadDraft || draft;
      const freshLicId = isHQ ? (fresh.licenseeId || activeLicId) : (u && u.licenseeId);
      if (!fresh.files || !fresh.files.length) return;
      const totalSkus = fresh.files.reduce((n, f) => n + (f.skus ? f.skus.length : (f.skuCount || 0)), 0);

      // Duplicate Style Code guard — only when actually submitting (not on
      // Save as Draft). A Style Code is "locked" for the licensee + season
      // pair if it already exists on another submission in Pending Review,
      // Under Review, or Done. Same Style Code in a different season is
      // fine. Withdrawn drafts and rejected lines don't block resubmission.
      if (!toDraft) {
        const stateNow = STE.get();
        const editingId = isEditing ? existing.id : null;
        const LOCKED_STATUSES = new Set(["Pending Review", "Under Review", "Done"]);
        const lockedByCode = new Map();
        (stateNow.designSubmissions || []).forEach(other => {
          if (other.id === editingId) return;
          if (other.licenseeId !== freshLicId) return;
          if (other.season !== fresh.season) return;
          if (!LOCKED_STATUSES.has(other.status)) return;
          (other.lines || []).forEach(ln => {
            // Skip rejected lines — those Style Codes are free to resubmit.
            if (ln.lineDecision === "rejected") return;
            (ln.skus || []).forEach(sku => {
              const code = String(sku.id || "").trim().toUpperCase();
              if (!code) return;
              if (!lockedByCode.has(code)) lockedByCode.set(code, other.id);
            });
          });
        });
        const collisions = [];
        fresh.files.forEach(f => (f.skus || []).forEach(sku => {
          const code = String(sku.id || "").trim().toUpperCase();
          if (code && lockedByCode.has(code)) {
            collisions.push({ code, sub: lockedByCode.get(code) });
          }
        }));
        if (collisions.length) {
          const seen = new Set();
          const lines = collisions.filter(c => {
            const k = c.code + "|" + c.sub;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          });
          const msg = lines.length === 1
            ? `Style Code ${lines[0].code} is already on submission ${lines[0].sub} for ${fresh.season}. Withdraw or wait for rejection before resubmitting.`
            : `${lines.length} Style Codes already submitted for ${fresh.season} (${lines.slice(0, 3).map(c => c.code).join(", ")}${lines.length > 3 ? "…" : ""}). Each must be withdrawn or rejected before resubmitting.`;
          STEApp.toast(msg, "warn");
          return;
        }
      }
      // Derive the submission-level line group from the per-file picks.
      // When every file shares one group, that's the submission group;
      // otherwise mark it "Mixed" so the ID + downstream displays surface
      // that the package spans groups.
      const fileGroups = Array.from(new Set(fresh.files.map(f => f.lineGroup || draft.lineGroup || "Lifestyle Man")));
      const derivedLineGroup = fileGroups.length === 1 ? fileGroups[0] : "Mixed";
      fresh.lineGroup = derivedLineGroup;
      // Build line objects from the (potentially edited) draft files. SKUs
      // come from f.skus if present (post-edit), otherwise fall back to a
      // generated placeholder set so old drafts without per-SKU data still work.
      // Scoring is suppressed for Drafts — they're a licensee work-in-progress,
      // not a review artefact. Scores synthesize only when the package is
      // being committed to a non-Draft status (Pending Review et al.).
      const buildLines = (suppressScores) => fresh.files.map((f, i) => {
        const rawSkus = (f.skus && f.skus.length)
          ? f.skus
          : Array.from({length: f.skuCount || 0}, (_, k) => ({
              id: String(50000 + Math.floor(Math.random()*9000)),
              name: `${f.line} ITEM ${k+1}`,
              category: "",
              fabric: pickPlaceholderFabric(f.line, k),
            }));
        const skusOut = rawSkus.map(sku => {
          // Existing values always win — re-edits don't clobber HQ's manual
          // overrides. For Drafts we leave the placeholders so the licensee
          // doesn't see (or rely on) a score they haven't earned yet.
          const hasScores = sku.scores && typeof sku.scores.P1 === "number";
          if (suppressScores) {
            return {
              id: sku.id, name: sku.name, category: sku.category,
              grade: sku.grade || "—",
              scores: hasScores ? sku.scores : { P1: null, P2: null, P3: null, P4: null, P5: null },
              fabric: sku.fabric || "Pending parse",
            };
          }
          const synth = synthesizeSkuScore(`${f.line}|${sku.id}|${sku.name}`);
          // _ai captures the AI-generated baseline so the inspector can flag
          // any HQ override (grade / pillar score) at render time.
          return {
            id: sku.id, name: sku.name, category: sku.category,
            grade: sku.grade && sku.grade !== "—" ? sku.grade : synth.grade,
            scores: hasScores ? sku.scores : synth.scores,
            fabric: sku.fabric || "Pending parse",
            _ai: sku._ai || { grade: synth.grade, scores: { ...synth.scores } },
          };
        });
        // Roll line-level avg from the (now-populated) SKU scores; Drafts
        // keep an "—" placeholder at the line level too.
        const skuAvgs = skusOut.map(sku => {
          const vs = sku.scores || {};
          return ["P1","P2","P3","P4","P5"].map(k => typeof vs[k] === "number" ? vs[k] : 0).reduce((a, b) => a + b, 0) / 5;
        });
        const lineAvg = skuAvgs.length ? Math.round(skuAvgs.reduce((a, b) => a + b, 0) / skuAvgs.length * 10) / 10 : 0;
        return {
          id: `L-${i+1}`,
          file: f.name,
          name: f.line,
          lineGroup: f.lineGroup || derivedLineGroup,
          target: `${f.lineGroup || derivedLineGroup} · ${fresh.season}`,
          sizeMb: f.sizeMb,
          avgScore: suppressScores ? 0 : lineAvg,
          grade: suppressScores ? "—" : (lineAvg >= 88 ? "A" : lineAvg >= 76 ? "B" : lineAvg >= 60 ? "C" : "D"),
          previews: f.previews || [],
          skus: skusOut,
        };
      });

      if (isEditing) {
        // Update the existing submission in place, reset review state, and
        // resubmit. Comments + lineage are preserved; scores are cleared so
        // HQ re-evaluates the edited lines.
        STE.mutate(s => {
          const target = (s.designSubmissions || []).find(x => x.id === existing.id);
          if (!target) return;
          target.season = fresh.season;
          target.lineGroup = fresh.lineGroup;
          target.licenseeId = freshLicId;
          target.lines = buildLines(!!toDraft);
          target.submittedAt = new Date().toISOString();
          target.status = targetStatus;
          target.verdict = "—";
          target.avgScore = 0;
          target.aiAnalyzing = !toDraft;
          if (!toDraft) target.aiAnalyzingStartedAt = new Date().toISOString();
          // Clear any per-line decisions so HQ starts the review fresh.
          target.lines.forEach(l => { delete l.lineDecision; });
        });
        STE.setSession({ ...STE.getSession(), inspectorUploadDraft: null, _editingSubId: null });
        if (toDraft) {
          STEApp.toast(`${existing.id} saved as draft.`, "info");
        } else {
          STEApp.toast(`${existing.id} updated and resubmitted for review.`, "success");
          simulateAiScoring(existing.id, 4500);
        }
        location.hash = `#/design-review/details/view/${existing.id}`;
        return;
      }

      // New submission path — ID encodes season, licensee, line group, seq.
      // See nextSubmissionId() for the full format.
      const subId = nextSubmissionId(STE.get(), {
        season: fresh.season, lineGroup: fresh.lineGroup, licenseeId: freshLicId,
      });
      const newSubmission = {
        id: subId,
        licenseeId: freshLicId,
        season: fresh.season,
        lineGroup: fresh.lineGroup,
        submittedAt: new Date().toISOString(),
        verdict: "—",
        avgScore: 0,
        status: targetStatus,
        aiAnalyzing: !toDraft,
        aiAnalyzingStartedAt: toDraft ? null : new Date().toISOString(),
        comments: [],
        lines: buildLines(!!toDraft),
      };
      STE.mutate(s => {
        s.designSubmissions = s.designSubmissions || [];
        s.designSubmissions.unshift(newSubmission);
      });
      STE.setSession({ ...STE.getSession(), inspectorUploadDraft: null });
      if (toDraft) {
        STEApp.toast(`${totalSkus} Style Codes · ${fresh.files.length} lines saved as draft.`, "info");
        location.hash = `#/design-review/details/view/${subId}`;
      } else {
        STEApp.toast(`${totalSkus} Style Codes · ${fresh.files.length} lines submitted for review.`, "success");
        simulateAiScoring(subId, 4500);
        location.hash = `#/design-review/details/view/${subId}`;
      }
    };
    $("[data-act='submit']", root)?.addEventListener("click", () => commitUpload("Pending Review"));
    $("[data-act='save-draft-upload']", root)?.addEventListener("click", () => commitUpload("Draft"));

    // Split-button dropdown (Submit ▾ → Save as draft).
    const splitToggle = root.querySelector("[data-split-toggle]");
    const splitMenu = root.querySelector("[data-split-menu]");
    if (splitToggle && splitMenu) {
      splitToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        const opening = splitMenu.hidden;
        splitMenu.hidden = !opening;
        splitToggle.setAttribute("aria-expanded", opening ? "true" : "false");
        if (opening) {
          const onDoc = (ev) => {
            if (ev.target.closest("[data-split-btn]")) return;
            splitMenu.hidden = true;
            splitToggle.setAttribute("aria-expanded", "false");
            document.removeEventListener("mousedown", onDoc);
          };
          setTimeout(() => document.addEventListener("mousedown", onDoc), 0);
        }
      });
    }
  }

  function inspectorLicensee(root, u) {
    const subs = (STE.get().designSubmissions || [])
      .filter(s => s.licenseeId === u.licenseeId)
      // Newest submission first.
      .sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));
    const lic = (STE.get().licensees || []).find(l => l.id === u.licenseeId) || { legalName: u.licenseeId };

    // Licensee alert banner — surfaces "X review(s) ready to check" for any
    // submission whose status is Done that the licensee hasn't opened yet.
    // The "seen" set lives in session.designReviewSeenIds and is appended
    // whenever the licensee opens a detail page (see route handler).
    const _session = STE.getSession() || {};
    const _seenIds = _session.designReviewSeenIds || {};
    const doneSubs = subs.filter(s => normalizeStatus(s.status) === "Done" && !_seenIds[s.id]);
    const _bannerNames = doneSubs.slice(0, 3).map(s => s.id).join(", ");
    const _bannerMore = doneSubs.length > 3 ? ` · +${doneSubs.length - 3} more` : '';

    root.innerHTML = `
      <div class="ste-screen-pad">
        <div class="ste-section-hd">
          <div class="ste-page-crumbs"><a href="#/home">Home</a><span class="sep">/</span><span class="cur">Design Review</span></div>
          <div class="ste-page-hd-row">
            <div>
              <h1>Design Review</h1>
            </div>
            <div class="ste-hd-cta">
              <button class="ste-btn ste-btn-primary" data-act="new-submission">+ Submit New Design</button>
            </div>
          </div>
        </div>

        ${doneSubs.length ? `
          <button class="ste-overdue-banner ste-overdue-banner-warn" data-act="open-design-ready" type="button">
            <span class="ste-overdue-icon"></span>
            <span class="ste-overdue-text">
              <strong>${doneSubs.length} review${doneSubs.length===1?'':'s'} ready to check</strong>
              <span class="ste-mini">${escape(_bannerNames)}${_bannerMore} · click to open the first</span>
            </span>
            <span class="ste-overdue-chev">→</span>
          </button>` : ''}

        <div class="ste-insp-mine">
          ${subs.length === 0
            ? `<div class="ste-empty-cell" style="padding:40px; background:white; border:1px solid var(--ste-border); border-radius:4px">No submissions yet. Upload a new package above.</div>`
            : subs.map(s => renderLicenseeSubmissionRow(s, lic)).join("")}
        </div>
      </div>`;
    // Banner jumps to the first ready review.
    $("[data-act='open-design-ready']", root)?.addEventListener("click", () => {
      if (doneSubs.length) location.hash = `#/design-review/details/view/${doneSubs[0].id}`;
    });

    $("[data-act='new-submission']", root)?.addEventListener("click", () => {
      location.hash = "#/design-review/submit-new-design";
    });
    const closeAnyMineMenu = () => {
      document.querySelectorAll(".ste-insp-mine-popmenu").forEach(m => m.remove());
    };
    $$("[data-open-sub]", root).forEach(b => {
      const open = () => location.hash = `#/design-review/details/view/${b.getAttribute("data-open-sub")}`;
      b.addEventListener("click", (e) => {
        if (e.target.closest("[data-sub-menu]")) return;
        if (e.target.closest(".ste-insp-mine-popmenu")) return;
        open();
      });
      b.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
      });
    });
    $$("[data-sub-menu]", root).forEach(btn => btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.getAttribute("data-sub-menu");
      if (btn.hasAttribute("data-no-actions")) {
        STEApp.toast("No actions available for this submission.", "info");
        return;
      }
      if (document.querySelector(`.ste-insp-mine-popmenu[data-for='${id}']`)) {
        closeAnyMineMenu();
        return;
      }
      closeAnyMineMenu();
      const sub = (STE.get().designSubmissions || []).find(x => x.id === id);
      if (!sub) return;
      const anyRejected = (sub.lines || []).some(l => l.lineDecision === "rejected");
      const canResub = normalizeStatus(sub.status) === "Done" && anyRejected && !sub.resubmittedAsId;
      const rect = btn.getBoundingClientRect();
      const menu = document.createElement("div");
      menu.className = "ste-board-popmenu ste-insp-mine-popmenu";
      menu.setAttribute("data-for", id);
      menu.innerHTML = `
        <button class="ste-board-popmenu-item" data-act="open" type="button">Open</button>
        ${canResub ? `<button class="ste-board-popmenu-item" data-act="resubmit" type="button">Resubmit</button>` : ''}
      `;
      menu.style.position = "fixed";
      menu.style.top = (rect.bottom + 6) + "px";
      menu.style.left = Math.max(8, rect.right - 160) + "px";
      document.body.appendChild(menu);
      const mRect = menu.getBoundingClientRect();
      if (mRect.bottom > window.innerHeight - 8) {
        menu.style.top = (rect.top - mRect.height - 6) + "px";
      }
      menu.querySelectorAll("[data-act]").forEach(it => it.addEventListener("click", () => {
        const act = it.getAttribute("data-act");
        closeAnyMineMenu();
        if (act === "open") {
          location.hash = `#/design-review/details/view/${id}`;
        } else if (act === "resubmit") {
          if (!confirm(`Start a revision of ${sub.season} · ${sub.lineGroup}?\n\nA new draft revision will be created from this package — revise it and submit for review. The original stays in your history.`)) return;
          const newId = createResubmission(id);
          if (newId) {
            STEApp.toast("New revision started — revise and submit.", "info");
            location.hash = `#/design-review/details/edit/${newId}`;
          }
        }
      }));
    }));
    // Click anywhere else closes the popmenu.
    document.addEventListener("mousedown", (e) => {
      if (e.target.closest(".ste-insp-mine-popmenu")) return;
      if (e.target.closest("[data-sub-menu]")) return;
      closeAnyMineMenu();
    }, { once: true });
  }

  function renderLicenseeSubmissionRow(sub, lic) {
    const totalSkus = sub.lines.reduce((n, l) => n + l.skus.length, 0);
    const st = normalizeStatus(sub.status);
    const tone = statusTone(st);
    const anyRejected = (sub.lines || []).some(l => l.lineDecision === "rejected");
    const canResubmit = st === "Done" && anyRejected && !sub.resubmittedAsId;
    const revTag = (sub.revisionRound || 1) > 1 ? ` <span class="ste-insp-rev-tag">Rev ${sub.revisionRound}</span>` : '';
    // Grading (grade + score) is HQ-internal and never surfaced to the
    // licensee — the list carries status + the resubmit affordance only.
    // Licensee dot fires when HQ's review is finished and the result is
    // waiting for the licensee to read — once they open the detail page,
    // markSeen clears it.
    const _licDotActionable = st === "Done";
    const unread = (window.STEUnread && STEUnread.dot("design-sub", sub.id, sub.updatedAt || sub.submittedAt, _licDotActionable)) || '';
    return `
      <div class="ste-insp-mine-row" data-open-sub="${escape(sub.id)}" role="button" tabindex="0">
        <div>
          <strong>${unread}${escape(sub.season)} · ${escape(sub.lineGroup)}</strong>${revTag}
          <div class="ste-mini">${sub.lines.length} lines · ${totalSkus} Style Codes · Submitted ${escape(sub.submittedAt.slice(0,10))}</div>
        </div>
        <span class="ste-insp-status-${tone}">${escape(st || 'Draft')}</span>
        <button class="ste-insp-mine-menu-btn" data-sub-menu="${escape(sub.id)}" type="button" aria-label="More" ${canResubmit ? '' : 'data-no-actions'}>⋮</button>
      </div>`;
  }
  // Status pill categories — semantic palette:
  //   ok       → Done / Approved / Completed   (green)
  //   info     → Under Review                   (blue, HQ actively reviewing)
  //   warn     → Action Needed                  (amber, your turn)
  //   neutral  → Draft / Pending Review / Empty (gray, not yet picked up)
  //   err      → Rejected / Overdue / Blocked   (magenta-red)
  function statusTone(s) {
    if (s === "Done") return "ok";
    if (s === "Released") return "ok";          // legacy → Done
    if (s === "Revise Requested") return "ok";  // legacy → Done
    if (s === "Approved") return "ok";
    if (s === "Under Review") return "info";
    if (s === "In Progress") return "info";
    if (s === "Pending Review") return "neutral";
    if (s === "Draft") return "neutral";
    if (s === "Not Started") return "neutral";
    if (s === "Empty") return "neutral";
    if (s === "Rejected") return "err";
    if (s === "Overdue") return "err";
    return "neutral";  // unknown
  }

  // Workflow statuses available in the status dropdown. Draft + Submitted
  // belong to the licensee; Under Review + Done belong to HQ. A submission
  // can be pulled back to Draft by the licensee to make edits, then
  // re-Submitted. STATUS_OPTIONS_BY_ROLE filters the dropdown so each user
  // only sees the transitions they're allowed to make.
  const STATUS_FLOW = ["Draft", "Pending Review", "Under Review", "Done"];
  const LICENSEE_STATUS_OPTIONS = ["Draft", "Pending Review"];
  const HQ_STATUS_OPTIONS = STATUS_FLOW;
  function normalizeStatus(s) {
    if (s === "Released" || s === "Revise Requested") return "Done";
    // Legacy: persisted state from before the status rename uses "Submitted".
    if (s === "Submitted") return "Pending Review";
    return s;
  }

  // Working-day helpers — Mon–Fri only. Saturday/Sunday don't count.
  // Holidays aren't modelled for the demo (would need a calendar feed).
  function isWeekend(d) {
    const day = d.getDay();
    return day === 0 || day === 6;
  }
  function addWorkingDays(date, n) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    let added = 0;
    while (added < n) {
      d.setDate(d.getDate() + 1);
      if (!isWeekend(d)) added++;
    }
    return d;
  }
  function workingDaysBetween(from, to) {
    const a = new Date(from); a.setHours(0,0,0,0);
    const b = new Date(to);   b.setHours(0,0,0,0);
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
    const sign = b >= a ? 1 : -1;
    const cur = new Date(a < b ? a : b);
    const end = new Date(a < b ? b : a);
    let count = 0;
    while (cur < end) {
      cur.setDate(cur.getDate() + 1);
      if (!isWeekend(cur)) count++;
    }
    return count * sign;
  }
  function fmtDate(d) {
    return d.toISOString().slice(0, 10);
  }
  // Review deadline rule: 10 working days after the initial submission,
  // 5 working days after each resubmission. revisionRound 0/1 = original,
  // 2+ = resubmission.
  function reviewDeadline(sub) {
    if (!sub.submittedAt) return null;
    const isResub = (sub.revisionRound || 1) >= 2;
    const days = isResub ? 5 : 10;
    const base = new Date(sub.submittedAt);
    if (isNaN(base.getTime())) return null;
    return { date: addWorkingDays(base, days), workingDays: days, isResub };
  }

  // Clone a submission into a new revision. Carries over the brief
  // (season/lineGroup/lines/SKUs), bumps revisionRound, links to the
  // original via parentSubmissionId, clears line decisions + verdict +
  // status, and inserts the new record at the top of the list.
  // Returns the new submission ID, or null on failure.
  function createResubmission(originalId) {
    const orig = (STE.get().designSubmissions || []).find(x => x.id === originalId);
    if (!orig) return null;
    const u = STE.currentUser();
    const now = new Date().toISOString();
    // Resubmission ID = parent base + .R{rev}. Keeps the same root so a
    // reviewer can trace lineage at a glance.
    const nextRev = (orig.revisionRound || 1) + 1;
    let newId = resubmissionId(orig.id, nextRev);
    // Collision guard — if someone already created this exact .R suffix
    // (shouldn't happen via the UI, but be safe), fall through to the
    // next available revision number.
    const taken = new Set((STE.get().designSubmissions || []).map(x => x.id));
    let candidateRev = nextRev;
    while (taken.has(newId)) {
      candidateRev++;
      newId = resubmissionId(orig.id, candidateRev);
    }

    const cloneLines = (orig.lines || []).map(l => ({
      ...l,
      // Reset any review state — fresh round.
      lineDecision: undefined,
      lineDecisionAt: undefined,
      lineDecisionBy: undefined,
      skus: (l.skus || []).map(sku => ({
        ...sku,
        decision: undefined,
        scoresOverride: undefined,
        gradeOriginal: undefined,
        reviewerNote: undefined,
        tierComments: undefined,
      })),
    }));

    const newSub = {
      id: newId,
      licenseeId: orig.licenseeId,
      season: orig.season,
      lineGroup: orig.lineGroup,
      submittedAt: now,
      verdict: "—",
      avgScore: 0,
      // Starts as a Draft — the licensee opens it in the edit flow, revises the
      // package, then submits it for review (which moves it to Pending Review).
      status: "Draft",
      revisionRound: (orig.revisionRound || 1) + 1,
      parentSubmissionId: orig.id,
      submittedBy: u?.name || "Licensee",
      comments: [],
      lines: cloneLines,
    };

    STE.mutate(s => {
      s.designSubmissions = s.designSubmissions || [];
      s.designSubmissions.unshift(newSub);
      // Note the resubmission on the parent so the original detail page
      // can show a forward link to the new revision.
      const parent = s.designSubmissions.find(x => x.id === orig.id);
      if (parent) parent.resubmittedAsId = newId;
    });
    return newId;
  }

  function inspectorStaff(root, isHQ, u) {
    if (isHQ === undefined) isHQ = true; // default for any legacy direct callers
    const allSubs = STE.get().designSubmissions || [];
    // Licensee users only see their own submissions; HQ sees everything.
    const subs = isHQ ? allSubs : allSubs.filter(s => s.licenseeId === (u && u.licenseeId));
    const lics = STE.get().licensees || [];
    const findLic = id => lics.find(l => l.id === id) || { legalName: id || '—' };

    const session = STE.getSession() || {};
    const _rawFilters = session.inspectorFilters || {};
    const asArr = (v) => Array.isArray(v) ? v : (v ? [v] : []);
    // Every fresh entry into /design-review wipes the filter back to the
    // audience default. HQ defaults to Pending Review + Under Review (the
    // queue that owes work). Licensee defaults to nothing — the row-level
    // "new" dots already tell them what's ready; if they want to scope to
    // decisions, the alert banner click does it.
    // The "fresh entry" flag is set by app.js on route transitions INTO
    // design-review; the inspector clears it once consumed so filter changes
    // made within the page persist for the rest of the visit.
    const enteredFresh = !!session._inspectorFreshEntry;
    const filters = enteredFresh
      ? {
          status:     isHQ ? ["Pending Review", "Under Review"] : [],
          licenseeId: [],
          season:     [],
          lineGroup:  [],
          search:     "",
          readyOnly:  false,
        }
      : {
          status:     asArr(_rawFilters.status),
          licenseeId: asArr(_rawFilters.licenseeId),
          season:     asArr(_rawFilters.season),
          lineGroup:  asArr(_rawFilters.lineGroup),
          search:     _rawFilters.search || "",
          readyOnly:  !!_rawFilters.readyOnly,
        };
    if (enteredFresh) {
      STE.setSession({ ...(STE.getSession() || {}), inspectorFilters: filters, _inspectorFreshEntry: false });
    }

    // Helper — unique line groups touched by a submission. Reads per-line
    // values when present; falls back to submission-level for legacy data.
    const subLineGroups = (s) => {
      const fromLines = Array.from(new Set((s.lines || []).map(l => l.lineGroup).filter(Boolean)));
      if (fromLines.length) return fromLines;
      return s.lineGroup ? [s.lineGroup] : [];
    };

    // Build filter options from the actual submission set.
    const statusOptions    = Array.from(new Set(subs.map(s => normalizeStatus(s.status)).filter(Boolean)))
      .filter(st => !(isHQ && st === "Draft"))
      .sort();
    const seasonOptions    = Array.from(new Set(subs.map(s => s.season).filter(Boolean))).sort();
    const lineGroupOptions = Array.from(new Set(subs.flatMap(s => subLineGroups(s)))).sort();
    const licenseeOptions  = Array.from(new Set(subs.map(s => s.licenseeId).filter(Boolean)))
      .map(id => ({ id, name: findLic(id).legalName }))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    // Apply filters to the visible submission list. Line-group filter is
    // contains-semantics: include the submission if any of its line groups
    // matches any of the selected filter values.
    const searchTerm = (filters.search || "").trim().toLowerCase();
    const _seenIdsForFilter = session.designReviewSeenIds || {};
    const filtered = subs.filter(s => {
      // HQ doesn't see licensee drafts — only submissions that have been
      // released for review (or further along).
      if (isHQ && normalizeStatus(s.status) === "Draft") return false;
      if (filters.status.length && !filters.status.includes(normalizeStatus(s.status))) return false;
      if (filters.licenseeId.length && !filters.licenseeId.includes(s.licenseeId)) return false;
      if (filters.season.length && !filters.season.includes(s.season)) return false;
      if (filters.lineGroup.length) {
        const subGroups = subLineGroups(s);
        if (!subGroups.some(g => filters.lineGroup.includes(g))) return false;
      }
      // "Ready" mode (set by the licensee banner click) further restricts to
      // submissions the user hasn't acknowledged yet. The banner counts
      // "new AND done" — so when the user clicks through, the list should
      // show that same intersection, not every Done submission.
      if (filters.readyOnly && _seenIdsForFilter[s.id]) return false;
      if (searchTerm) {
        const hay = [
          s.id,
          subLineGroups(s).join(" "),
          s.season,
          findLic(s.licenseeId).legalName,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(searchTerm)) return false;
      }
      return true;
    });
    // Sort by review deadline ascending (most urgent first). Submissions
    // with no deadline (e.g. Released, no submittedAt) sort to the bottom.
    filtered.sort((a, b) => {
      const da = reviewDeadline(a);
      const db = reviewDeadline(b);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da.date - db.date;
    });
    const hasActiveFilters = !!(filters.status.length || filters.licenseeId.length || filters.season.length || filters.lineGroup.length || searchTerm);
    const today = new Date(); today.setHours(0,0,0,0);

    // Alert banner. HQ sees "N submissions awaiting your review" — the
    // Pending/Under-Review queue. Licensee sees "N decisions ready to check"
    // — submissions that have a result back but they haven't opened yet.
    // Clicking applies the audience's natural filter; if it's already on,
    // we flash the Status dropdown so they realise the filter is the one
    // surfacing those rows.
    const _seenForBanner = (session.designReviewSeenIds || {});
    let _bannerActionable = [];
    let _bannerWantedStatus = [];
    if (isHQ) {
      _bannerActionable = subs.filter(s => {
        const st = normalizeStatus(s.status);
        return st === "Pending Review" || st === "Under Review";
      });
      _bannerWantedStatus = ["Pending Review", "Under Review"];
    } else {
      _bannerActionable = subs.filter(s => normalizeStatus(s.status) === "Done" && !_seenForBanner[s.id]);
      _bannerWantedStatus = ["Done"];
    }
    const _bannerHeadline = isHQ
      ? `${_bannerActionable.length} submission${_bannerActionable.length===1?'':'s'} awaiting your review`
      : `${_bannerActionable.length} design decision${_bannerActionable.length===1?'':'s'} ready to check`;
    const _bannerSub = (() => {
      if (!_bannerActionable.length) return '';
      const ids = _bannerActionable.slice(0, 5).map(s => s.id).join(", ");
      const more = _bannerActionable.length > 5 ? ` · +${_bannerActionable.length - 5} more` : '';
      const tail = isHQ ? 'click to filter the queue' : 'click to open the first';
      return `${ids}${more} · ${tail}`;
    })();

    root.innerHTML = `
      <div class="ste-screen-pad">
        <div class="ste-section-hd">
          <div class="ste-page-crumbs"><a href="${isHQ ? '#/hq' : '#/home'}">Home</a><span class="sep">/</span><span class="cur">Design Review</span></div>
          <div class="ste-page-hd-row">
            <div>
              <h1>Design Review</h1>
            </div>
            <div class="ste-hd-cta">
              <button class="ste-btn ste-btn-primary" data-act="new-submission" type="button" title="${isHQ ? 'Submit on behalf of a licensee' : 'Upload a new CAD package for review'}">+ Submit New Design</button>
            </div>
          </div>
        </div>

        ${_bannerActionable.length ? `
          <button class="ste-overdue-banner ${isHQ ? '' : 'ste-overdue-banner-warn'}" data-act="open-design-action" type="button">
            <span class="ste-overdue-icon"></span>
            <span class="ste-overdue-text">
              <strong>${escape(_bannerHeadline)}</strong>
              <span class="ste-mini">${escape(_bannerSub)}</span>
            </span>
            <span class="ste-overdue-chev">→</span>
          </button>` : ''}

        <div class="ste-form-card">
          <div class="ste-filter-bar">
            <div class="ste-users-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/></svg>
              <input type="search" data-insp-filter="search" value="${escape(filters.search || '')}" placeholder="${isHQ ? 'Search by licensee, line group, season, or ID…' : 'Search by line group, season, or ID…'}">
            </div>
            <span class="ste-filter-divider" aria-hidden="true"></span>
            <div class="ste-fdrop" data-insp-fdrop="status">
              <button class="ste-fdrop-btn" type="button"><span class="ste-fdrop-lbl">Statuses</span><span class="ste-fdrop-val"></span><span class="ste-fdrop-chev"></span></button>
              <div class="ste-fdrop-panel" hidden></div>
            </div>
            ${isHQ ? `
            <div class="ste-fdrop" data-insp-fdrop="licenseeId">
              <button class="ste-fdrop-btn" type="button"><span class="ste-fdrop-lbl">Organizations</span><span class="ste-fdrop-val"></span><span class="ste-fdrop-chev"></span></button>
              <div class="ste-fdrop-panel" hidden></div>
            </div>
            ` : ''}
            <div class="ste-fdrop" data-insp-fdrop="season">
              <button class="ste-fdrop-btn" type="button"><span class="ste-fdrop-lbl">Seasons</span><span class="ste-fdrop-val"></span><span class="ste-fdrop-chev"></span></button>
              <div class="ste-fdrop-panel" hidden></div>
            </div>
            <div class="ste-fdrop" data-insp-fdrop="lineGroup">
              <button class="ste-fdrop-btn" type="button"><span class="ste-fdrop-lbl">Line Groups</span><span class="ste-fdrop-val"></span><span class="ste-fdrop-chev"></span></button>
              <div class="ste-fdrop-panel" hidden></div>
            </div>
            ${hasActiveFilters ? `<button class="ste-btn ste-btn-ghost ste-btn-mini" type="button" data-insp-filter-clear>Clear</button>` : ''}
            <span class="ste-mini ste-insp-filter-count"><strong>${filtered.length}</strong> of ${subs.length}</span>
          </div>

          ${filtered.length === 0 ? `
            <div class="ste-empty-cell" style="padding:40px;text-align:center;color:var(--ste-muted)">
              ${hasActiveFilters ? 'No submissions match the current filters.' : 'No submissions yet. Click "+ Submit New Design" to upload your first package.'}
            </div>
          ` : `
          <div class="ste-mirror-table-wrap">
          <table class="ste-mirror-records">
            <thead>
              <tr>
                <th>Submission ID</th>
                ${isHQ ? '<th>Licensee</th>' : ''}
                <th>Season</th>
                <th>Line Groups</th>
                <th>Style Codes</th>
                <th>Status</th>
                <th>Rejected</th>
                <th>Submitted</th>
                ${isHQ ? '<th>Deadline</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${filtered.map(s => {
                const totalSkus = s.lines.reduce((n, l) => n + l.skus.length, 0);
                const rowStatus = normalizeStatus(s.status) || "Draft";
                const tone = statusTone(rowStatus);
                // Approval is gated by Status: while review is still in flight
                // (anything other than "Done") we always show "Pending" —
                // line-by-line ticks may have happened but the overall verdict
                // isn't final yet. Once Done, the per-line decisions resolve:
                // any rejected → Rejected; otherwise → Approved.
                // All approval badges share the neutral (light gray) tone on
                // purpose — the status column already carries the urgency
                // color; this column reads as quiet metadata.
                // Show a concrete "X / Y rejected" count so HQ can scan
                // failure rate at a glance. Pre-Done: dash (no verdict yet).
                const lineDs = (s.lines || []).map(l => l.lineDecision || null);
                const totalLines = lineDs.length;
                const rejectedLines = lineDs.filter(d => d === "rejected").length;
                let approvalLabel;
                let approvalTone;
                if (rowStatus !== "Done") {
                  approvalLabel = "—";
                  approvalTone = "neutral";
                } else if (rejectedLines === 0) {
                  approvalLabel = "None";
                  approvalTone = "ok";
                } else {
                  approvalLabel = `${rejectedLines} / ${totalLines}`;
                  approvalTone = rejectedLines === totalLines ? "err" : "warn";
                }
                const dl = reviewDeadline(s);
                let deadlineCell = `<span class="ste-mini">—</span>`;
                if (dl && dl.date) {
                  // Deadline is informational only on the list — no tone
                  // colors, no bold dates. Quiet light-gray date + a small
                  // suffix; urgency reads from the row's other cells (status,
                  // approval) and the detail page.
                  if (rowStatus === "Done") {
                    deadlineCell = `<span class="ste-mini">${escape(fmtDate(dl.date))}</span>`;
                  } else {
                    const wd = workingDaysBetween(today, dl.date);
                    const suffix = wd < 0 ? `${Math.abs(wd)}d overdue`
                      : wd === 0 ? "due today"
                      : `${wd}d left`;
                    deadlineCell = `
                      <div class="ste-insp-deadline">
                        <span class="ste-mini">${escape(fmtDate(dl.date))}</span>
                        <span class="ste-mini">${suffix}</span>
                      </div>`;
                  }
                }
                // HQ "your turn" — submissions still in the review queue.
                const _subActionable = isHQ
                  ? (rowStatus === "Pending Review" || rowStatus === "Under Review")
                  : (rowStatus === "Done" && !s.licenseeAck); // licensee dot fires when results are in
                const _unread = (window.STEUnread && STEUnread.dot("design-sub", s.id, s.updatedAt || s.submittedAt, _subActionable)) || '';
                return `
                <tr class="ste-insp-staff-row" data-open-sub="${escape(s.id)}">
                  <td>${_unread}<span class="ste-code">${escape(s.id)}</span></td>
                  ${isHQ ? `<td><strong>${escape(findLic(s.licenseeId).legalName)}</strong></td>` : ''}
                  <td>${escape(s.season || '—')}</td>
                  <td>${(() => {
                    const groups = subLineGroups(s);
                    if (!groups.length) return '—';
                    return groups.map(g => `<span class="ste-line-group-tag">${escape(g)}</span>`).join(' ');
                  })()}</td>
                  <td>${totalSkus}</td>
                  <td><span class="ste-status-chip ste-insp-status-${tone}">${escape(rowStatus)}</span></td>
                  <td>${rowStatus !== "Done"
                    ? `<span class="ste-mini">${escape(approvalLabel)}</span>`
                    : `<span class="ste-approval-chip ste-approval-${approvalTone}"><span class="ste-approval-dot" aria-hidden="true"></span>${escape(approvalLabel)}</span>`}</td>
                  <td class="ste-mini">${escape((s.submittedAt || '').slice(0,16).replace('T',' '))}</td>
                  ${isHQ ? `<td>${deadlineCell}</td>` : ''}
                </tr>`;
              }).join("")}
              </tbody>
            </table>
          </div>`}
        </div>
      </div>`;

    $$("[data-open-sub]", root).forEach(r => {
      r.style.cursor = "pointer";
      r.addEventListener("click", () => {
        STE.setSession({ ...STE.getSession(), inspectorLineId: null });
        location.hash = `#/design-review/details/view/${r.getAttribute("data-open-sub")}`;
      });
    });

    const writeFilter = (key, val) => {
      const s = STE.getSession() || {};
      const cur = s.inspectorFilters || {};
      // Any manual filter change drops the banner's "new AND done" mode so
      // the user's pick is honoured verbatim instead of double-restricted.
      STE.setSession({ ...s, inspectorFilters: { ...cur, [key]: val, readyOnly: false } });
      inspectorStaff(root, isHQ, u);
    };
    $$("[data-insp-filter]", root).forEach(el => {
      const key = el.getAttribute("data-insp-filter");
      const evt = el.tagName === "SELECT" ? "change" : "input";
      el.addEventListener(evt, () => writeFilter(key, el.value));
    });
    // Multi-checkbox filter dropdowns — uses the platform-wide ste-fdrop
    // shell with "All {label}" checkbox + per-option checkboxes (same
    // visual pattern as Agreements / Sales Statements). Helper comes from
    // window.STEScreens.multiCheckboxPanel.
    const mcp = window.STEScreens && window.STEScreens.multiCheckboxPanel;
    const mlb = (window.STEScreens && window.STEScreens.multiLabel) || ((sel) => ({ val: sel && sel.length ? `${sel.length} selected` : "", active: !!(sel && sel.length) }));
    // labelFor: value → human label (per selected item).
    // allValues: the full set of values; used by multiLabel to detect the
    // "everything selected → blank" case.
    const FDROP_OPTS = {
      status:     { all: "All Statuses",      options: () => statusOptions.map(v => ({ value: v, label: v })),            labelFor: (v) => v,                                                                        allValues: () => statusOptions },
      licenseeId: { all: "All Organizations", options: () => licenseeOptions.map(l => ({ value: l.id, label: l.name })),  labelFor: (v) => { const m = licenseeOptions.find(l => l.id === v); return m ? m.name : v; }, allValues: () => licenseeOptions.map(l => l.id) },
      season:     { all: "All Seasons",       options: () => seasonOptions.map(v => ({ value: v, label: v })),            labelFor: (v) => v,                                                                        allValues: () => seasonOptions },
      lineGroup:  { all: "All Line Groups",   options: () => lineGroupOptions.map(v => ({ value: v, label: v })),          labelFor: (v) => v,                                                                        allValues: () => lineGroupOptions },
    };
    // Paint each fdrop button label using the multiLabel helper — empty
    // when 0 / all selected, the value itself when 1, "X selected" when 2+.
    function paintInspLabels() {
      $$(".ste-fdrop[data-insp-fdrop]", root).forEach(drop => {
        const key = drop.getAttribute("data-insp-fdrop");
        const cfg = FDROP_OPTS[key];
        if (!cfg) return;
        const sel = filters[key] || [];
        const allValues = cfg.allValues();
        const labels = (sel || []).map(v => cfg.labelFor(v));
        const info = mlb(labels, allValues);
        drop.classList.toggle("ste-filter-active", info.active);
        const valEl = drop.querySelector(".ste-fdrop-val");
        if (valEl) valEl.innerHTML = info.val;
      });
    }
    paintInspLabels();
    let _openInspDrop = null;
    function closeInspDrop() {
      if (!_openInspDrop) return;
      const panel = _openInspDrop.querySelector(".ste-fdrop-panel");
      if (panel) { panel.innerHTML = ""; panel.hidden = true; }
      _openInspDrop.classList.remove("ste-fdrop-open");
      _openInspDrop = null;
    }
    const outsideClose = (ev) => {
      if (!_openInspDrop) return;
      if (ev.target.closest(".ste-fdrop") === _openInspDrop) return;
      closeInspDrop();
    };
    document.addEventListener("click", outsideClose, true);
    function openInspDrop(drop) {
      const btn = drop.querySelector(".ste-fdrop-btn");
      const panel = drop.querySelector(".ste-fdrop-panel");
      const key = drop.getAttribute("data-insp-fdrop");
      const cfg = FDROP_OPTS[key];
      if (!mcp || !cfg) return;
      const built = mcp(cfg.options(), filters[key] || [], (sel) => {
        const s = STE.getSession() || {};
        const cur = s.inspectorFilters || {};
        // Remember which dropdown was open so the re-render can re-open it
        // immediately — toggling rows / Select All used to drop the panel.
        // Manual filter change also drops the banner-applied "readyOnly" so
        // the user's explicit pick wins.
        STE.setSession({ ...s, inspectorFilters: { ...cur, [key]: sel, readyOnly: false }, _openInspDropKey: key });
        inspectorStaff(root, isHQ, u);
      }, cfg.all);
      panel.innerHTML = built.html;
      built.wire(panel);
      panel.hidden = false;
      drop.classList.add("ste-fdrop-open");
      _openInspDrop = drop;
    }
    $$(".ste-fdrop[data-insp-fdrop]", root).forEach(drop => {
      const btn = drop.querySelector(".ste-fdrop-btn");
      const key = drop.getAttribute("data-insp-fdrop");
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (_openInspDrop === drop) {
          closeInspDrop();
          STE.setSession({ ...(STE.getSession() || {}), _openInspDropKey: null });
          return;
        }
        closeInspDrop();
        STE.setSession({ ...(STE.getSession() || {}), _openInspDropKey: key });
        openInspDrop(drop);
      });
    });
    // Re-open the dropdown the user was just interacting with — this runs
    // after every render, so clicking Select All / a row no longer drops
    // the panel. The flag is cleared on outside-click.
    {
      const _pending = (STE.getSession() || {})._openInspDropKey;
      if (_pending) {
        const drop = root.querySelector(`.ste-fdrop[data-insp-fdrop="${_pending}"]`);
        if (drop) openInspDrop(drop);
      }
    }
    // Outside-click closes the dropdown AND clears the persisted key so the
    // next render doesn't auto-reopen it.
    const _outsideCloseInspV2 = (ev) => {
      if (!_openInspDrop) return;
      if (ev.target.closest(".ste-fdrop") === _openInspDrop) return;
      closeInspDrop();
      STE.setSession({ ...(STE.getSession() || {}), _openInspDropKey: null });
    };
    document.removeEventListener("click", outsideClose, true);
    document.addEventListener("click", _outsideCloseInspV2, true);
    root.querySelector("[data-insp-filter-clear]")?.addEventListener("click", () => {
      const s = STE.getSession() || {};
      STE.setSession({ ...s, inspectorFilters: { status: [], licenseeId: [], season: [], lineGroup: [], search: "", readyOnly: false } });
      inspectorStaff(root, isHQ, u);
    });
    // Alert-banner click. Applies the audience's natural filter (HQ: Pending
    // Review + Under Review; Licensee: Done) AND, on the licensee side,
    // turns on the `readyOnly` flag so the list shows ONLY rows that are
    // both new AND in Done status — matching the banner count. If the same
    // filter is already applied, flash the Status dropdown.
    root.querySelector("[data-act='open-design-action']")?.addEventListener("click", () => {
      const wanted = _bannerWantedStatus;
      const cur = filters.status || [];
      const sameSet = wanted.length === cur.length && wanted.every(v => cur.includes(v));
      const wantsReady = !isHQ;  // licensee banner means "new AND done"
      const sameReady = !!filters.readyOnly === !!wantsReady;
      if (sameSet && sameReady) {
        const drop = root.querySelector('[data-insp-fdrop="status"]');
        if (drop) {
          drop.classList.add("ste-fdrop-flash");
          setTimeout(() => drop.classList.remove("ste-fdrop-flash"), 800);
        }
        return;
      }
      const s = STE.getSession() || {};
      STE.setSession({ ...s, inspectorFilters: { status: wanted, licenseeId: [], season: [], lineGroup: [], search: "", readyOnly: wantsReady } });
      inspectorStaff(root, isHQ, u);
    });
    // HQ "+ Submit New Design" button — same destination as the licensee
    // flow. The upload form auto-shows an "On behalf of" licensee picker
    // for HQ users so the new submission has the right owner.
    $("[data-act='new-submission']", root)?.addEventListener("click", () => {
      location.hash = "#/design-review/submit-new-design";
    });
  }

  function inspectorDetail(root, subId, staffMode) {
    const session = STE.getSession() || {};
    const sub = (STE.get().designSubmissions || []).find(s => s.id === subId);
    if (!sub) {
      root.innerHTML = `
        <div class="ste-screen-pad">
          <div class="ste-section-hd"><h1>Design Review</h1><p>No submissions queued.</p></div>
        </div>`;
      return;
    }
    const lic = (STE.get().licensees || []).find(l => l.id === sub.licenseeId) || { legalName: sub.licenseeId };
    // Mark this submission as seen — clears it from the licensee's
    // "X reviews ready to check" banner on /design-review.
    if (!staffMode && normalizeStatus(sub.status) === "Done") {
      const _s = STE.getSession() || {};
      const _seen = { ...(_s.designReviewSeenIds || {}) };
      if (!_seen[subId]) {
        _seen[subId] = Date.now();
        STE.setSession({ ..._s, designReviewSeenIds: _seen });
      }
    }
    // Per-user "new" row indicator — opening the detail page clears the
    // dot for THIS user on the list view (other org members keep theirs).
    try { window.STEUnread && STEUnread.markSeen("design-sub", subId); } catch (_) {}

    // AI scoring runs invisibly in the background. Both licensee and HQ land
    // straight on the regular detail page — placeholders fill in as scoring
    // completes. The earlier dedicated "AI Scoring Underway" page exposed
    // grader internals neither audience needs to see.

    // Auto-expand the first line with CAD previews on the *first* visit
    // to this submission, so images are visible immediately. After that
    // we honour the user's collapse — session.inspectorLineId === null
    // explicitly means "closed", we shouldn't re-open it on every render.
    let activeLineId = session.inspectorLineId === undefined
      ? (sub.lines.find(l => Array.isArray(l.previews) && l.previews.length) || sub.lines[0])?.id || null
      : session.inspectorLineId;
    // Validate the remembered ID still exists.
    if (activeLineId && !sub.lines.find(l => l.id === activeLineId)) activeLineId = null;
    // Persist the auto-expand so subsequent renders see the explicit value.
    if (session.inspectorLineId === undefined && activeLineId) {
      STE.setSession({ ...session, inspectorLineId: activeLineId });
    }
    const activeLine = activeLineId ? sub.lines.find(l => l.id === activeLineId) : null;

    let totalSkus = 0;
    sub.lines.forEach(l => l.skus.forEach(() => { totalSkus++; }));
    // Submission decision is derived from per-line decisions: any line
    // rejected → submission rejected; all lines approved → approved;
    // otherwise still under review. Individual lines carry the actual
    // approve/reject buttons (see the line action bar below).
    const lineDecisions = sub.lines.map(l => l.lineDecision || null);
    const anyRejected = lineDecisions.some(d => d === "rejected");
    const allApproved = lineDecisions.length > 0 && lineDecisions.every(d => d === "approved");
    const decision = anyRejected ? "disapproved" : (allApproved ? "approved" : null);
    const decided = decision === "approved" || decision === "disapproved";

    const subStatus = normalizeStatus(sub.status) || "Under Review";
    const stTone = statusTone(subStatus);
    const released = subStatus === "Done" || decided;
    // Score + AI-comment visibility gate. Pending Review intentionally hides
    // the review payload so HQ has to move the submission to Under Review
    // before the grading surface unfolds — otherwise nothing nudges them
    // out of the queued state.
    const reviewSurfaceVisible = subStatus === "Under Review" || subStatus === "Done";
    // HQ edits (approve/reject lines, adjust SKU scores + grades) are only
    // allowed in "Under Review" status — that's the active review state.
    //  · Pending Review → submission is queued; HQ hasn't picked it up yet,
    //                     so no edits until they move it to Under Review.
    //  · Under Review   → HQ is actively reviewing; edits permitted.
    //  · Done           → review finalized; edits locked until HQ moves it
    //                     back to Under Review.
    // The status dropdown enforces the workflow adjacency (only ±1 step),
    // so the licensee/HQ split + the lock both fall out naturally.
    const reviewLocked = subStatus !== "Under Review";
    // Resubmit affordance: licensee can resubmit when HQ has finished
    // ("Done") AND at least one line was rejected. Resubmission bumps
    // the revision round (review deadline shrinks from 10 to 5 working
    // days) and resets line decisions + status back to "Pending Review".
    const canResubmit = !staffMode && subStatus === "Done" && lineDecisions.some(d => d === "rejected");
    root.innerHTML = `
      <div class="ste-screen-pad">
        <div class="ste-section-hd">
          <div class="ste-page-crumbs">
            ${staffMode
              ? `<a href="#/hq">Home</a><span class="sep">/</span><a href="#/design-review" data-back-list>Design Review</a><span class="sep">/</span><span class="cur">${escape(sub.id)}</span>`
              : `<a href="#/home">Home</a><span class="sep">/</span><a href="#/design-review" data-back-list>Design Review</a><span class="sep">/</span><span class="cur">${escape(sub.id)}</span>`}
          </div>
          <div class="ste-page-hd-row">
            <div class="ste-insp-hd-meta">
              <h1>${escape(sub.id)}${(sub.revisionRound || 1) > 1 ? ` <span class="ste-mini ste-insp-rev-tag">Rev ${sub.revisionRound}</span>` : ''}</h1>
              <div class="ste-insp-hd-sub">
                ${staffMode ? `<strong>${escape(lic.legalName)}</strong><span class="ste-insp-hd-dot">·</span>` : ''}
                <span>${escape(sub.season)} · ${escape(sub.lineGroup)}</span>
                <span class="ste-insp-hd-dot">·</span>
                <span>${totalSkus} Style Codes · ${sub.lines.length} lines</span>
                <span class="ste-insp-hd-dot">·</span>
                <span>Submitted ${escape(sub.submittedAt.replace('T',' ').slice(0,16))}</span>
              </div>
              ${(sub.parentSubmissionId || sub.resubmittedAsId) ? `
                <div class="ste-insp-rev-lineage">
                  ${sub.parentSubmissionId ? `
                    <a href="#/design-review/details/view/${escape(sub.parentSubmissionId)}" class="ste-insp-rev-link">
                      <span class="ste-mini">Previous revision</span>
                      <code class="ste-code">${escape(sub.parentSubmissionId)}</code>
                    </a>` : ''}
                  ${sub.resubmittedAsId ? `
                    <a href="#/design-review/details/view/${escape(sub.resubmittedAsId)}" class="ste-insp-rev-link">
                      <span class="ste-mini">Resubmitted as</span>
                      <code class="ste-code">${escape(sub.resubmittedAsId)}</code>
                      <span aria-hidden="true">→</span>
                    </a>` : ''}
                </div>` : ''}
            </div>
            <div class="ste-hd-cta">
              <a class="ste-btn ste-btn-ghost" href="#/design-review" data-back-list>Back</a>
              ${(() => {
                // Status dropdown — both roles get a dropdown so the workflow
                // transition path is consistent. Allowed options depend on
                // role + current status, and only adjacent transitions in the
                // workflow are reachable from the current status:
                //
                //   Draft  ↔  Pending Review  ↔  Under Review  ↔  Done
                //   ─────────────────────  HQ owns this stretch ─────
                //   ── licensee owns this stretch ──────
                //
                // The current option is shown highlighted; non-adjacent
                // options are simply not rendered.
                const flow = STATUS_FLOW;  // ["Draft","Pending Review","Under Review","Done"]
                const idx = flow.indexOf(subStatus);
                const adjacent = idx < 0
                  ? flow.slice()
                  : [flow[idx - 1], flow[idx], flow[idx + 1]].filter(Boolean);
                const roleScoped = staffMode
                  ? HQ_STATUS_OPTIONS
                  : LICENSEE_STATUS_OPTIONS;
                const allowed = adjacent.filter(s => roleScoped.includes(s));
                // Dropdown shows only when there is at least one OTHER option
                // (besides the current status) the user can pick. For licensee
                // users that means Draft/Pending Review only; once HQ moves it
                // to Under Review, the licensee's allowed set collapses to
                // just the current status, so the trigger goes read-only.
                const showEditBtn = !staffMode && subStatus === "Draft";
                const allowDropdown = allowed.filter(s => s !== subStatus).length > 0;
                // Status dropdown is HQ-only — HQ owns the workflow transitions.
                // Licensees don't change status here: in Draft they submit via
                // "Edit submission", and in Pending Review they get a Withdraw
                // button (below) instead of a manual status flip.
                const showWithdraw = !staffMode && subStatus === "Pending Review";
                const statusDd = (staffMode && subStatus !== "Draft") ? `
                <div class="ste-status-dd${allowDropdown ? '' : ' ste-status-dd-static'}" data-status-dd>
                  <button type="button" class="ste-insp-status-pill ste-insp-status-${stTone} ste-status-dd-trigger" ${allowDropdown ? `data-status-dd-toggle aria-haspopup="listbox" aria-expanded="${session._statusMenuOpen ? 'true' : 'false'}"` : 'disabled aria-disabled="true"'}>
                    <span>${escape(subStatus)}</span>
                    ${allowDropdown ? `<span class="ste-status-dd-chev" aria-hidden="true">▾</span>` : ''}
                  </button>
                  ${allowDropdown && session._statusMenuOpen ? `
                    <div class="ste-status-dd-menu" role="listbox">
                      ${allowed.filter(opt => opt !== subStatus).map(opt => `
                        <button type="button" class="ste-status-dd-option" data-status-pick="${escape(opt)}" role="option" aria-selected="false">
                          <span class="ste-status-dd-dot ste-insp-status-${statusTone(opt)}"></span>
                          <span>${escape(opt)}</span>
                        </button>`).join("")}
                    </div>` : ''}
                </div>` : "";
                return `
                ${statusDd}
                ${showWithdraw ? `<button class="ste-btn ste-btn-primary" type="button" data-withdraw>Withdraw</button>` : ''}
                ${showEditBtn ? `<a class="ste-btn ste-btn-primary" href="#/design-review/details/edit/${escape(sub.id)}" data-edit-sub>Edit submission</a>` : ''}
                ${canResubmit ? `<button class="ste-btn ste-btn-primary" type="button" data-resubmit>Resubmit</button>` : ''}`;
              })()}
            </div>
          </div>
        </div>

        ${(staffMode && !reviewSurfaceVisible) ? `
        <div class="ste-insp-pending-banner ste-insp-pending-banner-draft" style="margin-bottom:18px">
          <span class="ste-insp-pending-icon" aria-hidden="true">⏳</span>
          <div class="ste-insp-pending-banner-body">
            <strong>This submission is in Pending Review.</strong>
            <div class="ste-mini">Change the status to Under Review to start grading.</div>
          </div>
          <div class="ste-insp-pending-banner-actions">
            <button class="ste-btn ste-btn-primary ste-btn-mini" type="button" data-act="start-review" data-sub-id="${escape(sub.id)}">Start Review</button>
          </div>
        </div>
        ` : ''}

        ${staffMode && decided ? `
        <div class="ste-insp-summary">
          <div class="ste-insp-decision-banner">
            <strong>${decision === 'approved' ? 'Approved' : 'Rejected'}</strong>
            <span class="ste-mini">
              ${sub.decisionAt ? `${escape(sub.decisionAt.replace('T',' ').slice(0,16))}` : ''}
              ${sub.decisionBy ? ` · ${escape(sub.decisionBy)}` : ''}
            </span>
          </div>
        </div>
        ` : ''}

        ${(!staffMode && subStatus !== "Done" && subStatus !== "Draft") ? `
          <!-- Licensee post-submission, pre-Done: single quiet banner.
               Suppressed while the submission is back in Draft (the user is
               editing — they don't need a "waiting on HQ" message). -->
          <div class="ste-insp-pending-banner">
            <span class="ste-insp-pending-icon" aria-hidden="true">⏱</span>
            <div>
              <strong>Awaiting HQ review</strong>
              <div class="ste-mini">Your submission is in HQ's queue. The review outcome (approved / rejected lines) and any reviewer comments will appear here once HQ completes the review.</div>
            </div>
          </div>
        ` : ''}
        ${(!staffMode && subStatus === "Draft") ? `
          <!-- Licensee Draft state: a soft banner explaining the draft hasn't
               been submitted yet, with a direct "Submit for review" affordance
               beside the Edit submission button at the top of the page. -->
          <div class="ste-insp-pending-banner ste-insp-pending-banner-draft">
            <span class="ste-insp-pending-icon" aria-hidden="true">✎</span>
            <div class="ste-insp-pending-banner-body">
              <strong>This draft hasn't been submitted yet</strong>
              <div class="ste-mini">Update details via <strong>Edit submission</strong>, or submit it now to send to HQ for review.</div>
            </div>
            <div class="ste-insp-pending-banner-actions">
              <button class="ste-btn ste-btn-ghost ste-btn-mini" type="button" data-act="submit-draft" data-sub-id="${escape(sub.id)}">Submit for review</button>
            </div>
          </div>
        ` : ''}

        ${(staffMode || (sub.comments || []).length > 0) ? `
          <div class="ste-insp-comments ste-insp-comments-block">
            <div class="ste-insp-comments-hd">
              <h3>${staffMode ? 'HQ Review Comments' : 'HQ Reviewer Comments'} <span class="ste-mini">(${(sub.comments || []).length})</span></h3>
            </div>
            <div class="ste-insp-comments-list">
              ${(sub.comments || []).length === 0
                ? `<div class="ste-mini" style="padding:8px 0;color:var(--ste-muted)">No comments yet.</div>`
                : (sub.comments || []).map(c => `
                  <div class="ste-insp-comment">
                    <div class="ste-insp-comment-hd">
                      <strong>${escape(c.author)}</strong>
                      <span class="ste-mini">· ${escape(c.role || '')}</span>
                      <span class="ste-mini">· ${escape((c.at || '').slice(0,16).replace('T',' '))}</span>
                    </div>
                    <div class="ste-insp-comment-body">${escape(c.body)}</div>
                  </div>`).join("")}
            </div>
            ${staffMode ? `
              <div class="ste-insp-comment-add">
                <textarea class="ste-input" rows="3" id="ste-insp-new-comment" placeholder="Enter a comment to send to the licensee…"></textarea>
                <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px">
                  <button class="ste-btn ste-btn-primary ste-btn-mini" data-act="add-comment">Add Comment</button>
                </div>
              </div>` : ''}
          </div>
        ` : ''}

        <div class="ste-insp-lines">
          <div class="ste-insp-lines-hd">
            <div><strong>${sub.lines.length} LINES</strong> <span class="ste-mini">· Click a line to see Style Code details · <a href="#/brand-guide">scoring criteria in the Brand Guide</a></span></div>
          </div>
          ${sub.lines.map(l => {
            const open = activeLineId === l.id;
            const lineTab = (session.lineTabs && session.lineTabs[l.id]) || "overview";
            const lineDecision = l.lineDecision || null;
            const lineDecided  = lineDecision === "approved" || lineDecision === "rejected";
            const lineStatusTone = lineDecision === "approved" ? "ok" : lineDecision === "rejected" ? "err" : null;
            return `
              <div class="ste-insp-line ${open?'open':''} ${lineDecision ? 'is-' + lineDecision : ''}">
                <div class="ste-insp-line-row">
                  <button class="ste-insp-line-hd" data-line="${escape(l.id)}">
                    <span class="ste-insp-line-arrow">›</span>
                    <span class="ste-insp-line-file">${escape(l.file)}</span>
                    <span class="ste-insp-line-name">${escape(l.name)}</span>
                    <span class="ste-mini">${escape(l.lineGroup || l.target || '')}</span>
                    <span class="ste-mini">${l.skus.length} Style Codes</span>
                  </button>
                  ${staffMode && !reviewLocked ? `
                    <div class="ste-insp-line-actions">
                      ${lineDecided
                        ? `<span class="ste-insp-line-status ste-verdict-${lineStatusTone}">${lineDecision === "approved" ? "Approved" : "Rejected"}</span>
                           <button class="ste-btn ste-btn-ghost ste-btn-mini" type="button" data-line-undo="${escape(l.id)}">Undo</button>`
                        : `<button class="ste-btn ste-btn-ghost ste-btn-mini" type="button" data-line-decision="${escape(l.id)}|rejected">Reject</button>
                           <button class="ste-btn ste-btn-primary ste-btn-mini" type="button" data-line-decision="${escape(l.id)}|approved">Approve</button>`}
                    </div>` : (staffMode && reviewLocked && lineDecided) ? `
                    <div class="ste-insp-line-actions">
                      <span class="ste-insp-line-status ste-verdict-${lineStatusTone}">${lineDecision === "approved" ? "Approved" : "Rejected"}</span>
                    </div>` : lineDecided ? `
                    <div class="ste-insp-line-actions">
                      <span class="ste-insp-line-status ste-verdict-${lineStatusTone}">${lineDecision === "approved" ? "Approved" : "Rejected"}</span>
                    </div>` : ''}
                </div>
                ${open ? `
                <div class="ste-insp-line-body">
                  <div class="ste-insp-line-grid">
                    <!-- Left column: blueprint preview stays put across tab switches -->
                    ${Array.isArray(l.previews) && l.previews.length ? `
                      <div class="ste-insp-preview-wrap ste-insp-preview-pinned">
                        ${l.previews.map((src, pIdx) => `
                          <div class="ste-insp-preview">
                            <button type="button" class="ste-insp-preview-imgwrap" data-cad-lightbox="${escape(l.id)}|${pIdx}" aria-label="Open ${escape(l.name)} preview ${pIdx+1} full size" title="Click to zoom">
                              <img src="${escape(src)}" alt="${escape(l.name)} preview ${pIdx+1}" loading="lazy">
                              <span class="ste-cad-zoom-hint" aria-hidden="true">⤢</span>
                            </button>
                            <div class="ste-mini ste-insp-preview-cap">Page ${pIdx+1}</div>
                          </div>`).join("")}
                      </div>
                    ` : `<div class="ste-insp-preview-wrap ste-insp-preview-pinned"></div>`}
                    <!-- Right column: tabs + grade/comments cycle here.
                         Tabs hidden for licensee pre-Done — no review output
                         to switch between yet, so the tab strip would only
                         be empty noise. -->
                    <div class="ste-insp-line-tabpane">
                      ${((staffMode && reviewSurfaceVisible) || released) ? renderLineTabs(l, lineTab) : ''}
                      ${lineTab === "overview" ? (() => {
                        // Items list. Licensee sees SKU/Name/Fabric only — no grades,
                        // no scores; designers receive feedback as language via the
                        // Strengths and Suggestions tabs. HQ (staffMode) additionally
                        // sees the AI Grade chip and the 5-pillar score breakdown,
                        // which the rubric drives — the same data their decision
                        // rests on.
                        const showScores = staffMode && reviewSurfaceVisible;
                        // HQ-side cells are editable so reviewers can override
                        // the AI grade and per-pillar scores in place. Each
                        // input carries data-grade-edit / data-pillar-edit
                        // attributes wired below.
                        const fmtEdit = (meta) => meta && meta.by
                          ? `Edited by ${meta.by}${meta.at ? ' on ' + meta.at.slice(0,16).replace('T',' ') : ''}`
                          : 'Edited';
                        const gradeChip = (sku) => {
                          const g = sku.grade || "";
                          const cls = g === "A" ? "ste-grade-A"
                                    : g === "B" ? "ste-grade-B"
                                    : g === "C" ? "ste-grade-C"
                                    : g === "D" ? "ste-grade-D" : "ste-grade-na";
                          const aiG = (sku._ai && sku._ai.grade) || g;
                          const edited = g && aiG && g !== aiG;
                          const meta = sku._edits && sku._edits.grade;
                          const tip = edited
                            ? `${fmtEdit(meta)} · AI graded ${aiG}, HQ override ${g}`
                            : '';
                          return `
                            <div class="ste-grade-edit-wrap">
                              <span class="ste-grade-chip ${cls}">${escape(g || "—")}</span>
                              <select class="ste-grade-edit" data-grade-edit="${escape(l.id)}|${escape(sku.id)}" aria-label="Edit grade for ${escape(sku.name)}">
                                ${["","A","B","C","D"].map(opt => `<option value="${opt}" ${opt === g ? 'selected' : ''}>${opt || "—"}</option>`).join("")}
                              </select>
                              ${edited ? `<span class="ste-edited-flag" title="${escape(tip)}">Edited</span>` : ''}
                            </div>`;
                        };
                        const pillarBar = (sku) => {
                          const scores = sku.scores || {};
                          const aiScores = (sku._ai && sku._ai.scores) || {};
                          const skuEdits = (sku._edits && sku._edits.scores) || {};
                          const keys = ["P1","P2","P3","P4","P5"];
                          // Each pillar carries an "edited" mark when current
                          // value differs from the AI baseline; tooltip names
                          // who and when.
                          return `<div class="ste-pillar-row ste-pillar-row-edit">${keys.map(k => {
                            const v = typeof scores[k] === "number" ? scores[k] : 0;
                            const display = v > 5 ? Math.round(v / 20 * 10) / 10 : v;
                            const aiV = typeof aiScores[k] === "number" ? aiScores[k] : null;
                            const aiDisp = aiV != null && aiV > 5 ? Math.round(aiV / 20 * 10) / 10 : aiV;
                            const edited = aiDisp != null && Math.abs(display - aiDisp) > 0.05;
                            const pct = Math.max(0, Math.min(100, display * 20));
                            const meta = skuEdits[k];
                            const tip = edited
                              ? `${k}: ${display} · ${fmtEdit(meta)} · AI ${aiDisp}`
                              : `${k}: ${display}`;
                            return `<label class="ste-pillar-cell ${edited ? 'is-edited' : ''}" title="${escape(tip)}">
                              <span class="ste-pillar-key">${k}${edited ? ' <span class="ste-pillar-edited-dot" aria-label="edited">●</span>' : ''}</span>
                              <span class="ste-pillar-bar"><span style="width:${pct}%"></span></span>
                              <input class="ste-pillar-edit" type="number" min="0" max="5" step="0.1" value="${display}" data-pillar-edit="${escape(l.id)}|${escape(sku.id)}|${k}" aria-label="${k} score">
                            </label>`;
                          }).join("")}</div>`;
                        };
                        return `
                          <table class="ste-insp-sku-table${showScores ? ' ste-insp-sku-table-staff' : ''}">
                            <thead>
                              <tr>
                                <th>Style Code</th><th>Name · Category</th><th>Fabric</th>
                                ${showScores ? `<th class="ste-insp-grade-th">Grade</th><th class="ste-insp-scores-th">Pillar Scores</th>` : ''}
                              </tr>
                            </thead>
                            <tbody>
                              ${l.skus.map(sku => `
                                <tr class="ste-sku-row">
                                  <td><span class="ste-code">#${escape(sku.id)}</span></td>
                                  <td>
                                    <strong>${escape(sku.name)}</strong>
                                    <div class="ste-mini">${escape(sku.category)}</div>
                                  </td>
                                  <td class="ste-insp-fabric">${escape(sku.fabric)}</td>
                                  ${showScores ? `<td class="ste-insp-grade-td">${gradeChip(sku)}</td>
                                  <td class="ste-insp-scores-td">${pillarBar(sku)}</td>` : ''}
                                </tr>`).join("")}
                            </tbody>
                          </table>`;
                      })() : ''}
                      ${lineTab === "strengths" ? renderLineTabBody(l, "strengths", "", { canEdit: staffMode && subStatus !== "Done" }) : ''}
                      ${lineTab === "suggestions" ? renderLineTabBody(l, "suggestions", "", { canEdit: staffMode && subStatus !== "Done" }) : ''}
                      ${lineTab === "closing" ? renderLineTabBody(l, "closing", "", { canEdit: staffMode && subStatus !== "Done" }) : ''}
                    </div>
                  </div>
                </div>` : ''}
              </div>`;
          }).join("")}
        </div>

      </div>`;

    $$("[data-line]", root).forEach(b => {
      b.addEventListener("click", () => {
        const id = b.getAttribute("data-line");
        STE.setSession({ ...STE.getSession(), inspectorLineId: id === activeLineId ? null : id });
        inspector();
      });
    });
    $("[data-back-list]", root)?.addEventListener("click", (e) => {
      e.preventDefault();
      // Wipe the auto-expand sentinel so the next visit re-opens the
      // first line (instead of remembering the previously-active one).
      const s = STE.getSession() || {};
      const { inspectorLineId, ...rest } = s;
      STE.setSession(rest);
      location.hash = "#/design-review";
    });

    // CAD preview lightbox — opens an overlay with the image at full size and
    // pan / zoom controls so a reviewer can inspect details up close. Click
    // backdrop or X to close; ← / → cycles between pages of the same line.
    $$("[data-cad-lightbox]", root).forEach(b => b.addEventListener("click", (e) => {
      e.preventDefault();
      const [lineId, pIdxStr] = b.getAttribute("data-cad-lightbox").split("|");
      const line = sub.lines.find(l => l.id === lineId);
      if (!line || !Array.isArray(line.previews) || !line.previews.length) return;
      openCadLightbox(line, parseInt(pIdxStr) || 0);
    }));

    // Per-line tab switcher (Overview / Strengths / Suggestions / Closing).
    $$("[data-line-tab]", root).forEach(b => {
      b.addEventListener("click", () => {
        const [lineId, tabKey] = b.getAttribute("data-line-tab").split("|");
        const sess = STE.getSession() || {};
        const lineTabs = { ...(sess.lineTabs || {}), [lineId]: tabKey };
        STE.setSession({ ...sess, lineTabs });
        inspector();
      });
    });

    // HQ inline grade override — persists on the SKU and recomputes line +
    // submission average via a lightweight rollup so the dashboard chips
    // follow the new pick.
    const _editor = () => {
      const u = STE.currentUser();
      return { at: new Date().toISOString(), by: u?.name || "HQ Reviewer" };
    };
    $$("[data-grade-edit]", root).forEach(sel => sel.addEventListener("change", () => {
      const [lineId, skuId] = sel.getAttribute("data-grade-edit").split("|");
      const v = sel.value;
      STE.mutate(s => {
        const t = (s.designSubmissions || []).find(x => x.id === sub.id);
        if (!t) return;
        const line = t.lines.find(l => l.id === lineId);
        if (!line) return;
        const sku = line.skus.find(x => x.id === skuId);
        if (!sku) return;
        sku.grade = v;
        // Capture the edit metadata so the inspector can show "Edited by X
        // on date" on hover. Original AI value lives in sku._ai.grade.
        sku._edits = sku._edits || {};
        sku._edits.grade = _editor();
      });
      inspector();
    }));

    // HQ inline AI-comment overrides — strengths and suggestions are per
    // SKU; closing is per line. Empty string is an explicit clear (the row
    // hides on the licensee side). Save on blur so cursor / scroll stay put.
    $$("[data-comment-edit]", root).forEach(ta => ta.addEventListener("blur", () => {
      const [lineId, kind, target] = ta.getAttribute("data-comment-edit").split("|");
      const v = ta.value;
      STE.mutate(s => {
        const t = (s.designSubmissions || []).find(x => x.id === sub.id);
        if (!t) return;
        const line = t.lines.find(l => l.id === lineId);
        if (!line) return;
        line.commentOverrides = line.commentOverrides || { strengths: {}, suggestions: {} };
        // Per-edit audit lives alongside the override values themselves.
        line._commentEdits = line._commentEdits || { strengths: {}, suggestions: {} };
        const meta = _editor();
        if (kind === "closing") {
          line.commentOverrides.closing = v;
          line._commentEdits.closing = meta;
        } else {
          line.commentOverrides[kind] = line.commentOverrides[kind] || {};
          line.commentOverrides[kind][target] = v;
          line._commentEdits[kind] = line._commentEdits[kind] || {};
          line._commentEdits[kind][target] = meta;
        }
      });
    }));

    // HQ inline pillar score override — clamped to 0–5 and stored on the
    // SKU. Updating any one pillar leaves the others untouched.
    $$("[data-pillar-edit]", root).forEach(inp => inp.addEventListener("change", () => {
      const [lineId, skuId, k] = inp.getAttribute("data-pillar-edit").split("|");
      let v = parseFloat(inp.value);
      if (!isFinite(v)) v = 0;
      v = Math.max(0, Math.min(5, v));
      STE.mutate(s => {
        const t = (s.designSubmissions || []).find(x => x.id === sub.id);
        if (!t) return;
        const line = t.lines.find(l => l.id === lineId);
        if (!line) return;
        const sku = line.skus.find(x => x.id === skuId);
        if (!sku) return;
        sku.scores = sku.scores || {};
        sku.scores[k] = v;
        sku._edits = sku._edits || {};
        sku._edits.scores = sku._edits.scores || {};
        sku._edits.scores[k] = _editor();
      });
      inspector();
    }));

    // Reviewer's Note — save / redraft.
    root.querySelector("[data-reviewer-note-save]")?.addEventListener("click", () => {
      const ta = root.querySelector("[data-reviewer-note]");
      if (!ta) return;
      const v = ta.value.trim();
      STE.mutate(s => {
        const t = s.designSubmissions.find(x => x.id === sub.id);
        if (t) { t.reviewerNote = v; delete t._reviewerNoteDraft; }
      });
      STEApp.toast("Reviewer's note saved", "success");
      inspector();
    });
    root.querySelector("[data-reviewer-note-redraft]")?.addEventListener("click", () => {
      STE.mutate(s => {
        const t = s.designSubmissions.find(x => x.id === sub.id);
        if (!t) return;
        // Force a re-render of the AI draft by clearing any saved note + cached draft.
        delete t.reviewerNote;
        delete t._reviewerNoteDraft;
      });
      inspector();
    });

    // Per-line approve / reject — drives the submission's rollup
    // decision (any line rejected → disapproved; all approved → approved).
    // Status is independent: the user picks it from the status dropdown
    // at the top of the page (Jira-style workflow column).
    const applyLineDecision = (lineId, kind) => {
      const u = STE.currentUser();
      STE.mutate(s => {
        const t = s.designSubmissions.find(x => x.id === sub.id);
        if (!t) return;
        const line = t.lines.find(l => l.id === lineId);
        if (!line) return;
        line.lineDecision = kind;
        line.lineDecisionAt = new Date().toISOString();
        line.lineDecisionBy = u?.name || "HQ Reviewer";
        // Recompute submission decision rollup AND flip status to Done once
        // every line carries a decision — HQ doesn't need to switch status
        // manually after they've finished reviewing the package.
        const decisions = t.lines.map(l => l.lineDecision || null);
        const anyRejected = decisions.some(d => d === "rejected");
        const allApproved = decisions.length > 0 && decisions.every(d => d === "approved");
        const allDecided = decisions.length > 0 && decisions.every(d => d === "approved" || d === "rejected");
        t.decision = anyRejected ? "disapproved" : (allApproved ? "approved" : null);
        t.decisionAt = (anyRejected || allApproved) ? new Date().toISOString() : null;
        t.decisionBy = (anyRejected || allApproved) ? (u?.name || "HQ Reviewer") : null;
        if (allDecided && t.status !== "Done") {
          t.status = "Done";
          t.statusChangedAt = new Date().toISOString();
          t.statusChangedBy = u?.name || "HQ Reviewer";
        }
      });
      STEApp.toast(`Line ${kind === "approved" ? "approved" : "rejected"}.`, kind === "approved" ? "success" : "warn");
      inspector();
    };
    // Licensee resubmit — creates a NEW submission record that links
    // back to the original via parentSubmissionId, so the revision
    // history is preserved. Original stays as-is (Done with rejected
    // lines visible). New record starts as "Pending Review" with cleared
    // line decisions and an incremented revisionRound, which makes the
    // review deadline +5 working days instead of +10.
    root.querySelector("[data-resubmit]")?.addEventListener("click", () => {
      if (!confirm(`Start a revision of ${sub.season} · ${sub.lineGroup}?\n\nA new draft revision (round ${(sub.revisionRound || 1) + 1}) will be created from this package — revise it and submit for review. The original stays in your history. Review deadline once submitted: 5 working days.`)) return;
      const newId = createResubmission(sub.id);
      if (!newId) return;
      STEApp.toast("New revision started — revise and submit.", "info");
      location.hash = `#/design-review/details/edit/${newId}`;
    });

    // Submit-from-draft — auxiliary action on the draft banner. Flips the
    // submission's status to Pending Review and kicks off the AI scoring
    // simulation so the licensee can submit without re-entering edit mode.
    // HQ shortcut — flips Pending Review → Under Review from the top banner.
    root.querySelector("[data-act='start-review']")?.addEventListener("click", () => {
      const u = STE.currentUser();
      STE.mutate(s => {
        const t = (s.designSubmissions || []).find(x => x.id === sub.id);
        if (!t) return;
        t.status = "Under Review";
        t.statusChangedAt = new Date().toISOString();
        t.statusChangedBy = u?.name || "HQ Reviewer";
      });
      STEApp.toast(`${sub.id} moved to Under Review.`, "success");
      inspectorDetail(root, sub.id, staffMode);
    });

    root.querySelector("[data-act='submit-draft']")?.addEventListener("click", () => {
      if (!confirm(`Submit ${sub.id} for HQ review?\n\nYou can still withdraw it from review until HQ picks it up.`)) return;
      const u = STE.currentUser();
      STE.mutate(s => {
        const t = (s.designSubmissions || []).find(x => x.id === sub.id);
        if (!t) return;
        t.status = "Pending Review";
        t.statusChangedAt = new Date().toISOString();
        t.statusChangedBy = u?.name || "Licensee";
        t.submittedAt = t.submittedAt || new Date().toISOString();
        t.aiAnalyzing = true;
        t.aiAnalyzingStartedAt = new Date().toISOString();
      });
      STEApp.toast(`${sub.id} submitted for review.`, "success");
      simulateAiScoring(sub.id, 4500);
      inspectorDetail(root, sub.id, staffMode);
    });

    // Withdraw (licensee, Pending Review) — pull the submission back out of
    // HQ's queue and save it as a Draft, via a styled confirm modal.
    root.querySelector("[data-withdraw]")?.addEventListener("click", () => {
      openWithdrawModal(sub, () => {
        const u = STE.currentUser();
        STE.mutate(s => {
          const t = (s.designSubmissions || []).find(x => x.id === sub.id);
          if (!t) return;
          t.status = "Draft";
          t.statusChangedAt = new Date().toISOString();
          t.statusChangedBy = u?.name || "Licensee";
        });
        STEApp.toast("Submission withdrawn — saved as Draft.", "info");
        inspector();
      });
    });

    // Status dropdown (Jira-style) — click the pill to open a picker
    // of workflow statuses; click an option to set sub.status.
    root.querySelector("[data-status-dd-toggle]")?.addEventListener("click", (e) => {
      e.stopPropagation();
      const s = STE.getSession() || {};
      STE.setSession({ ...s, _statusMenuOpen: !s._statusMenuOpen });
      inspector();
    });
    $$("[data-status-pick]", root).forEach(b => b.addEventListener("click", (e) => {
      e.stopPropagation();
      const newStatus = b.getAttribute("data-status-pick");
      const cur = normalizeStatus(sub.status);
      // Adjacency guard — only allow ±1 step along STATUS_FLOW. Catches
      // any stale links / dev-console pokes; the dropdown already filters
      // its options so users won't normally hit this branch.
      const flow = STATUS_FLOW;
      const curIdx = flow.indexOf(cur);
      const nextIdx = flow.indexOf(newStatus);
      if (curIdx >= 0 && nextIdx >= 0 && Math.abs(curIdx - nextIdx) > 1) {
        const sess = STE.getSession() || {};
        STE.setSession({ ...sess, _statusMenuOpen: false });
        STEApp.toast(`Move one step at a time — ${cur} can only go to ${flow[curIdx - 1] || '—'} or ${flow[curIdx + 1] || '—'}.`, "warn");
        inspector();
        return;
      }
      // Done can only be set once every line has a reviewer decision
      // (approved or rejected). Anything less is incomplete review.
      if (newStatus === "Done") {
        const undecided = (sub.lines || []).filter(l => l.lineDecision !== "approved" && l.lineDecision !== "rejected");
        if (undecided.length > 0) {
          const sess = STE.getSession() || {};
          STE.setSession({ ...sess, _statusMenuOpen: false });
          STEApp.toast(`Cannot mark Done — ${undecided.length} line${undecided.length===1?'':'s'} still need a decision.`, "warn");
          inspector();
          return;
        }
      }
      // Licensee picking "Draft" from "Pending Review" is the withdraw path —
      // surface a confirm so accidental dropdown taps don't pull a submission
      // out from under HQ silently.
      const isLicenseeWithdraw = !staffMode && cur === "Pending Review" && newStatus === "Draft";
      if (isLicenseeWithdraw) {
        if (!confirm(`Withdraw this submission?\n\nIt will return to Draft so you can edit. HQ will no longer see it in their review queue.`)) {
          const sess = STE.getSession() || {};
          STE.setSession({ ...sess, _statusMenuOpen: false });
          inspector();
          return;
        }
      }
      // Moving backward in the workflow invalidates prior review decisions —
      // EXCEPT for Done → Under Review, which is just "I need to keep
      // editing." Those line decisions are preserved so HQ can tweak a
      // couple of items without redoing the whole review. Moving further
      // back (Under Review → Pending Review) does wipe with a confirm.
      const isBackward = curIdx >= 0 && nextIdx >= 0 && nextIdx < curIdx;
      const isReopenDone = cur === "Done" && newStatus === "Under Review";
      const decidedCount = (sub.lines || []).filter(l => l.lineDecision === "approved" || l.lineDecision === "rejected").length;
      let wipeDecisions = false;
      if (isBackward && !isReopenDone && decidedCount > 0 && !isLicenseeWithdraw) {
        if (!confirm(`Move back to ${newStatus}?\n\nThis clears the approval on ${decidedCount} line${decidedCount === 1 ? '' : 's'} (approve / reject decisions). The lines will need to be reviewed again.`)) {
          const sess = STE.getSession() || {};
          STE.setSession({ ...sess, _statusMenuOpen: false });
          inspector();
          return;
        }
        wipeDecisions = true;
      }
      const u = STE.currentUser();
      STE.mutate(s => {
        const t = s.designSubmissions.find(x => x.id === sub.id);
        if (!t) return;
        t.status = newStatus;
        t.statusChangedAt = new Date().toISOString();
        t.statusChangedBy = u?.name || (staffMode ? "HQ Reviewer" : "Licensee");
        if (wipeDecisions) {
          t.lines.forEach(l => { delete l.lineDecision; delete l.lineDecisionAt; delete l.lineDecisionBy; });
          t.decision = null; t.decisionAt = null; t.decisionBy = null;
        }
      });
      const sess = STE.getSession() || {};
      STE.setSession({ ...sess, _statusMenuOpen: false });
      const toastMsg = isLicenseeWithdraw
        ? "Submission withdrawn — back to Draft."
        : wipeDecisions
          ? `Status set to ${newStatus} — approval decisions cleared.`
          : `Status set to ${newStatus}.`;
      STEApp.toast(toastMsg, isLicenseeWithdraw ? "info" : "info");
      inspector();
    }));
    // Click outside the status menu closes it.
    if ((STE.getSession() || {})._statusMenuOpen) {
      const closer = (ev) => {
        if (ev.target.closest("[data-status-dd]")) return;
        const s = STE.getSession() || {};
        if (s._statusMenuOpen) {
          STE.setSession({ ...s, _statusMenuOpen: false });
          inspector();
        }
        document.removeEventListener("mousedown", closer);
      };
      setTimeout(() => document.addEventListener("mousedown", closer), 0);
    }

    $$("[data-line-decision]", root).forEach(b => b.addEventListener("click", (e) => {
      e.stopPropagation();
      const [lineId, kind] = b.getAttribute("data-line-decision").split("|");
      applyLineDecision(lineId, kind);
    }));
    $$("[data-line-undo]", root).forEach(b => b.addEventListener("click", (e) => {
      e.stopPropagation();
      const lineId = b.getAttribute("data-line-undo");
      STE.mutate(s => {
        const t = s.designSubmissions.find(x => x.id === sub.id);
        if (!t) return;
        const line = t.lines.find(l => l.id === lineId);
        if (!line) return;
        delete line.lineDecision;
        delete line.lineDecisionAt;
        delete line.lineDecisionBy;
        // Recompute submission decision rollup (status stays manual).
        const decisions = t.lines.map(l => l.lineDecision || null);
        const anyRejected = decisions.some(d => d === "rejected");
        const allApproved = decisions.length > 0 && decisions.every(d => d === "approved");
        t.decision = anyRejected ? "disapproved" : (allApproved ? "approved" : null);
      });
      STEApp.toast("Line decision cleared.", "info");
      inspector();
    }));

    // AI annotation marker clicks → flash the matching list row so the user
    // can read the rationale without hunting through the side panel.
    $$("[data-ann-line]", root).forEach(btn => {
      btn.addEventListener("click", () => {
        const lid = btn.getAttribute("data-ann-line");
        const idx = btn.getAttribute("data-ann-idx");
        const target = root.querySelector(`[data-ann-list-line="${lid}"][data-ann-list-idx="${idx}"]`);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "nearest" });
          target.classList.add("ste-insp-ann-item-flash");
          setTimeout(() => target.classList.remove("ste-insp-ann-item-flash"), 1200);
        }
      });
    });
    $("[data-act='add-comment']", root)?.addEventListener("click", () => {
      const inp = $("#ste-insp-new-comment", root);
      const body = (inp.value || "").trim();
      if (!body) { STEApp.toast("Please enter a comment", "warn"); return; }
      const u = STE.currentUser();
      STE.mutate(s => {
        const t = s.designSubmissions.find(x => x.id === sub.id);
        if (!t) return;
        t.comments = t.comments || [];
        t.comments.push({
          author: u?.name || "HQ Reviewer",
          role: u?.title || "Reviewer",
          at: new Date().toISOString(),
          body,
        });
      });
      inspector();
    });
  }


  // CAD preview lightbox — full-screen overlay with the preview image,
  // pan-on-drag at zoomed levels, prev/next page navigation, and Escape /
  // backdrop / X to close. Mounted into <body> so it sits above everything.
  function openCadLightbox(line, startIdx) {
    const previews = line.previews || [];
    if (!previews.length) return;
    let idx = Math.max(0, Math.min(startIdx, previews.length - 1));
    let zoom = 1;
    let panX = 0, panY = 0;
    let dragging = false, dragStartX = 0, dragStartY = 0, panStartX = 0, panStartY = 0;

    // Tear down any previous lightbox first.
    document.querySelectorAll(".ste-cad-lightbox").forEach(n => n.remove());

    const overlay = document.createElement("div");
    overlay.className = "ste-cad-lightbox";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = `
      <div class="ste-cad-lightbox-bar">
        <div class="ste-cad-lightbox-title">
          <strong>${escape(line.name)}</strong>
          <span class="ste-mini" data-cad-page>Page ${idx+1} of ${previews.length}</span>
        </div>
        <div class="ste-cad-lightbox-controls">
          <button type="button" data-cad-prev aria-label="Previous page" title="Previous">‹</button>
          <button type="button" data-cad-zoomout aria-label="Zoom out" title="Zoom out">−</button>
          <span class="ste-cad-zoom-level" data-cad-zoom-level>100%</span>
          <button type="button" data-cad-zoomin aria-label="Zoom in" title="Zoom in">+</button>
          <button type="button" data-cad-reset aria-label="Reset zoom" title="Fit to screen">Fit</button>
          <button type="button" data-cad-next aria-label="Next page" title="Next">›</button>
          <button type="button" data-cad-close aria-label="Close" title="Close (Esc)">×</button>
        </div>
      </div>
      <div class="ste-cad-lightbox-stage" data-cad-stage>
        <img class="ste-cad-lightbox-img" data-cad-img src="${escape(previews[idx])}" alt="${escape(line.name)} page ${idx+1}">
      </div>
    `;
    document.body.appendChild(overlay);

    const imgEl = overlay.querySelector("[data-cad-img]");
    const pageLbl = overlay.querySelector("[data-cad-page]");
    const zoomLbl = overlay.querySelector("[data-cad-zoom-level]");
    const stage = overlay.querySelector("[data-cad-stage]");

    const applyTransform = () => {
      imgEl.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
      zoomLbl.textContent = `${Math.round(zoom * 100)}%`;
      stage.classList.toggle("is-zoomed", zoom > 1);
    };
    const setIdx = (next) => {
      if (next < 0) next = previews.length - 1;
      if (next >= previews.length) next = 0;
      idx = next;
      imgEl.src = previews[idx];
      pageLbl.textContent = `Page ${idx+1} of ${previews.length}`;
      zoom = 1; panX = 0; panY = 0;
      applyTransform();
    };
    const setZoom = (z) => {
      const clamped = Math.max(0.4, Math.min(5, z));
      zoom = clamped;
      if (zoom <= 1) { panX = 0; panY = 0; }
      applyTransform();
    };

    overlay.querySelector("[data-cad-prev]").addEventListener("click", () => setIdx(idx - 1));
    overlay.querySelector("[data-cad-next]").addEventListener("click", () => setIdx(idx + 1));
    overlay.querySelector("[data-cad-zoomin]").addEventListener("click", () => setZoom(zoom + 0.25));
    overlay.querySelector("[data-cad-zoomout]").addEventListener("click", () => setZoom(zoom - 0.25));
    overlay.querySelector("[data-cad-reset]").addEventListener("click", () => { zoom = 1; panX = 0; panY = 0; applyTransform(); });
    const close = () => {
      overlay.remove();
      document.removeEventListener("keydown", onKey);
    };
    overlay.querySelector("[data-cad-close]").addEventListener("click", close);

    // Click backdrop (anywhere outside the image) to close.
    stage.addEventListener("mousedown", (ev) => {
      if (ev.target !== stage) return; // ignore clicks on the image itself
      close();
    });

    // Drag-to-pan when zoomed in.
    imgEl.addEventListener("mousedown", (ev) => {
      if (zoom <= 1) return;
      ev.preventDefault();
      dragging = true;
      dragStartX = ev.clientX; dragStartY = ev.clientY;
      panStartX = panX; panStartY = panY;
      stage.classList.add("is-panning");
    });
    document.addEventListener("mousemove", (ev) => {
      if (!dragging) return;
      panX = panStartX + (ev.clientX - dragStartX);
      panY = panStartY + (ev.clientY - dragStartY);
      applyTransform();
    });
    document.addEventListener("mouseup", () => {
      if (!dragging) return;
      dragging = false;
      stage.classList.remove("is-panning");
    });

    // Wheel = zoom around cursor.
    stage.addEventListener("wheel", (ev) => {
      ev.preventDefault();
      setZoom(zoom + (ev.deltaY < 0 ? 0.15 : -0.15));
    }, { passive: false });

    // Keyboard: Esc close, ← →, + - zoom.
    const onKey = (ev) => {
      if (ev.key === "Escape") close();
      else if (ev.key === "ArrowLeft") setIdx(idx - 1);
      else if (ev.key === "ArrowRight") setIdx(idx + 1);
      else if (ev.key === "+" || ev.key === "=") setZoom(zoom + 0.25);
      else if (ev.key === "-") setZoom(zoom - 0.25);
      else if (ev.key === "0") { zoom = 1; panX = 0; panY = 0; applyTransform(); }
    };
    document.addEventListener("keydown", onKey);

    applyTransform();
  }

  // AI-drafted Reviewer's Note for a whole submission. Editable in staff
  // mode; licensees see the read-only finished note once HQ has saved it.
  function aiDraftReviewerNote(sub) {
    const lic = (STE.get().licensees || []).find(l => l.id === sub.licenseeId);
    const licName = lic ? lic.legalName : "the licensee";
    return `${escape(licName)}'s interpretation of the ST direction for ${escape(sub.season || "this season")} comes through in the proposal. On the ST DNA side, line alignment and detail craft read clearly, while color and signature use offer room to evolve one step further toward the ST tone. In particular, a touch of the Italian Retro palette at micro points and a subtle hint of the Active Slim code would sharpen the heritage read. We would welcome the opportunity to refine details together and extend the strongest pieces into a capsule.`;
  }
  function renderReviewerNote(sub, staffMode) {
    const note = sub.reviewerNote || (sub._reviewerNoteDraft || aiDraftReviewerNote(sub));
    const isAiDraft = !sub.reviewerNote;
    if (!staffMode) {
      // Licensee view — only render once HQ has saved a finished note.
      if (!sub.reviewerNote) return "";
      return `
        <div class="ste-rev-note">
          <div class="ste-rev-note-hd"><strong>Reviewer's Note</strong></div>
          <div class="ste-rev-note-body">${escape(sub.reviewerNote)}</div>
        </div>`;
    }
    return `
      <div class="ste-rev-note ${isAiDraft ? 'is-ai-draft' : ''}">
        <div class="ste-rev-note-hd">
          <strong>Reviewer's Note</strong>
          ${isAiDraft ? `<span class="ste-rev-note-ai"><span class="ste-rev-note-ai-badge">AI</span>Draft · refine before saving</span>` : `<span class="ste-mini">Saved · click to edit</span>`}
        </div>
        <textarea class="ste-input ste-rev-note-text" data-reviewer-note rows="5" placeholder="Write the overall reviewer's note for this submission…">${escape(note)}</textarea>
        <div class="ste-rev-note-actions">
          <button class="ste-btn ste-btn-ghost ste-btn-mini" type="button" data-reviewer-note-redraft>↻ Redraft with AI</button>
          <button class="ste-btn ste-btn-primary ste-btn-mini" type="button" data-reviewer-note-save>${isAiDraft ? 'Save Note' : 'Update Note'}</button>
        </div>
      </div>`;
  }

  function renderLineTabs(line, activeTab) {
    const tabs = [
      { key: "overview",    label: "Items" },
      { key: "strengths",   label: "Strengths" },
      { key: "suggestions", label: "Suggestions" },
      { key: "closing",     label: "Closing" },
    ];
    return `
      <div class="ste-line-tabs" data-line-tabs="${escape(line.id)}">
        ${tabs.map(t => `
          <button class="ste-line-tab ${activeTab === t.key ? 'active' : ''}" data-line-tab="${escape(line.id)}|${escape(t.key)}" type="button">${escape(t.label)}</button>
        `).join("")}
      </div>`;
  }
  // AI-generated comment templates, anchored to the CAD Inspection Rubric's
  // five ST brand pillars (heritage, elegant functionalism, court-to-social,
  // body-lined silhouette, quiet performance). Comments are an alternative to
  // numeric grading so designers receive feedback as language, not a score
  // that can read as personal judgment.
  const ST_AI_STRENGTHS = [
    "{name} carries Italian tennis heritage clearly — the court reference reads as ST, not generic sportswear.",
    "Heritage cues on {name} (collar geometry, court tonality, white-base discipline) anchor the piece firmly to ST's tennis lineage.",
    "Elegant functionalism comes through on {name} — refined surface, genuine performance construction, nothing forced.",
    "{name} balances refinement and utility — the performance is built in rather than declared.",
    "The court-to-social read is strong on {name} — wears at the club and moves into refined social settings without strain.",
    "{name} reads as a hero piece in the {category} pocket — confident on court, equally at home off it.",
    "Silhouette on {name} is body-lined with restraint — clean shoulder, composed length, no oversized drift.",
    "{name} respects the body-lined cut — the proportions read intentional, not loose.",
    "Quiet performance is respected on {name} — restrained palette, purposeful detailing, disciplined logo use.",
    "Logo and trim on {name} are dialled to the right level — the heritage signals do the talking.",
    "{name} uses the six ST tones with discipline — the palette reads considered rather than decorative.",
    "Construction on {name} carries the elegant-functionalism signal cleanly — finishes are quiet but precise.",
    "The court code on {name} is unmistakable — pleat, panel, and trim all point back to the tennis lineage.",
    "{name} would slot naturally into the lookbook as a transitional piece — its dual register is doing the work.",
    "Material story on {name} earns the price tier — texture and hand reinforce the refined-surface read.",
    "Proportions on {name} hold up against the rubric — body-lined without becoming restrictive.",
    "{name} demonstrates restraint in branding — the pentagon mark and wordmark sit in the right places at the right scale.",
    "Color blocking on {name} pulls from the heritage palette rather than chasing seasonal trend colors.",
    "{name} carries the {category} archetype with confidence — readable as ST at a glance.",
    "There's a measured quietness to {name} that fits the brand's contemporary tennis posture.",
  ];
  const ST_AI_SUGGESTIONS = [
    "{name} would benefit from a clearer Italian-tennis heritage anchor — strengthening a single court code (collar tape, pleat, court-line, white base) would lift the read.",
    "Push the elegant functionalism further on {name} — making the hidden performance (wicking, stretch, concealed construction) explicit would lift the piece.",
    "Sharpen the court-to-social mapping on {name} — a clearer wear scenario across both active and social settings would land it better.",
    "Refine the body-lined silhouette on {name} — a half-step tighter through the shoulder and a touch shorter on the length would compose the line.",
    "Pull the palette on {name} back toward the six ST tones and keep logo placement minimal — the quiet-performance line is doing real work.",
    "Color and signature on {name} read close to neutral — a hint of the Italian Retro tones at micro points would sharpen the heritage read.",
    "{name} interprets the rubric one step toward the market — pulling one element back toward ST DNA would tighten the read.",
    "Hardware on {name} reads slightly utility-leaning for ST — softening or recessing one component would bring it back to elegant functionalism.",
    "Logo scale on {name} is a touch loud — half a size smaller would let the heritage signals carry the piece.",
    "Fabric weight on {name} sits between two tiers — committing to one (lighter performance vs heavier heritage) would resolve the read.",
    "The contrast tape on {name} verges on streetwear coding — narrowing the width or pulling the chroma down would protect the ST tone.",
    "{name} could use a clearer dual-register cue — one detail that signals court, one that signals social, on the same piece.",
    "Trim placement on {name} crowds the chest area — a small amount of breathing room would let each element register.",
    "Length and break on {name} sit a hair long for the body-lined silhouette — consider cropping ½ inch.",
    "Stitch density on {name} reads sportswear-generic — switching to a finer gauge in visible areas would lift the refinement.",
    "Print scale on {name} dominates the heritage cues — reducing it by 15–20% would let the brand language lead.",
    "{name} would gain from a single bespoke detail — a custom trim, embossed token, or label that ties it to the season's narrative.",
    "Color story on {name} leans cool — a warmer accent (one of the Italian Retro tones) would restore tonal balance.",
    "Drape on {name} reads more athleisure than tennis — a slightly firmer hand would protect the court read.",
  ];
  const ST_AI_CLOSINGS = [
    "Overall {lineName} is a competitive proposal for the season. The strongest pieces already read as ST; the notes above are about sharpening rather than rebuilding.",
    "{lineName} reads as a confident submission. A few items lean closer to market and would benefit from a step back toward the rubric. Happy to refine the details together.",
    "There's real range in {lineName}. With one or two refinements toward the brand pillars, the line tightens up significantly.",
    "{lineName} clears Tier-1 brand integrity and lands solidly on most rubric pillars. A small set of items needs another pass before the line reads as fully ST.",
    "{lineName} demonstrates a clear point of view. The hero pieces are on-brand and ready; the supporting items need light refinement to match.",
    "The proposal for {lineName} is coherent and the dual-register intent is visible. We'd encourage another pass on the items flagged above, and then this line is ready to progress.",
  ];

  // Deterministic 32-bit hash so the same SKU always picks the same comment
  // template across reloads — keeps the demo stable without persisting the
  // generated text to localStorage.
  function _stableHash(str) {
    let h = 2166136261 >>> 0;
    const s = String(str || "");
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h;
  }
  function _fill(tpl, sku, line) {
    return tpl
      .replace(/\{name\}/g,     sku.name || "the item")
      .replace(/\{category\}/g, sku.category || "")
      .replace(/\{lineName\}/g, (line && line.name) || "the line");
  }
  // Pure-function comment generation. Strengths fire on ~85% of SKUs,
  // suggestions on ~75%. Closing is ALWAYS present per line. Recomputed on
  // every render so template edits take effect on reload without state
  // migration.
  // Use `>>>` (unsigned right shift) — `>>` is signed and on a uint32 hash
  // with the high bit set it yields a negative number, so `negative % length`
  // returns a negative index and the array lookup is `undefined`. That bug
  // surfaced as "Cannot read properties of undefined (reading 'replace')"
  // for ~half of all lines/SKUs.
  // Stored HQ overrides win over generated text. Empty string means HQ
  // explicitly cleared the comment — the row hides. `undefined` (no key)
  // falls through to the rubric-driven generation below.
  function aiStrengthFor(sku, line) {
    const ov = line.commentOverrides && line.commentOverrides.strengths;
    if (ov && Object.prototype.hasOwnProperty.call(ov, sku.id)) return ov[sku.id] || null;
    const h = _stableHash(line.id + "|" + sku.id);
    if ((h % 100) >= 85) return null;
    return _fill(ST_AI_STRENGTHS[h % ST_AI_STRENGTHS.length], sku, line);
  }
  function aiSuggestionFor(sku, line) {
    const ov = line.commentOverrides && line.commentOverrides.suggestions;
    if (ov && Object.prototype.hasOwnProperty.call(ov, sku.id)) return ov[sku.id] || null;
    const h = _stableHash(line.id + "|" + sku.id);
    if (((h >>> 8) % 100) >= 75) return null;
    return _fill(ST_AI_SUGGESTIONS[(h >>> 4) % ST_AI_SUGGESTIONS.length], sku, line);
  }
  function aiClosingFor(line) {
    if (line.commentOverrides && typeof line.commentOverrides.closing === "string") {
      return line.commentOverrides.closing;
    }
    const h = _stableHash(line.id + "|closing");
    return _fill(ST_AI_CLOSINGS[h % ST_AI_CLOSINGS.length], { name: "" }, line);
  }

  // AI comment tabs — read-only by default, editable when HQ has the
  // submission open and it hasn't been marked Done yet. Strengths /
  // Suggestions list one row per SKU that surfaced a comment; HQ can
  // overwrite the generated text or clear it. Closing is line-level and
  // always present (the wrap-up paragraph).
  function renderLineTabBody(line, activeTab, skuTableHtml, opts) {
    opts = opts || {};
    const canEdit = !!opts.canEdit;
    if (activeTab === "overview") return skuTableHtml;
    if (activeTab === "strengths" || activeTab === "suggestions") {
      const getter = activeTab === "strengths" ? aiStrengthFor : aiSuggestionFor;
      // In edit mode we list ALL SKUs so HQ can add a comment to one that
      // the rubric skipped. In read mode we only show rows that have text,
      // so missing commentary doesn't read as a flagged absence.
      const candidates = (line.skus || []).map(sku => ({ sku, text: getter(sku, line) }));
      const overrides = line.commentOverrides && line.commentOverrides[activeTab];
      const editsLog = (line._commentEdits && line._commentEdits[activeTab]) || {};
      const rows = (canEdit ? candidates : candidates.filter(x => x.text))
        .map(({ sku, text }) => {
          const edited = overrides && Object.prototype.hasOwnProperty.call(overrides, sku.id);
          const meta = editsLog[sku.id];
          const tip = edited && meta && meta.by
            ? `Edited by ${meta.by}${meta.at ? ' on ' + meta.at.slice(0,16).replace('T',' ') : ''}`
            : 'Edited from AI';
          return `
          <div class="ste-line-comment-row">
            <div class="ste-line-comment-meta">
              <span class="ste-code">#${escape(sku.id)}</span>
              <strong>${escape(sku.name)}</strong>
              <span class="ste-mini">${escape(sku.category)}</span>
              ${edited ? `<span class="ste-edited-flag" title="${escape(tip)}">Edited</span>` : ''}
            </div>
            ${canEdit
              ? `<textarea class="ste-input ste-line-comment-edit" rows="2" placeholder="${activeTab === 'strengths' ? 'Add a strength for this item — leave blank to skip.' : 'Add a suggestion for this item — leave blank to skip.'}" data-comment-edit="${escape(line.id)}|${activeTab}|${escape(sku.id)}">${escape(text || '')}</textarea>`
              : `<p class="ste-line-comment-text">${escape(text)}</p>`
            }
          </div>`;
        }).join("");
      const empty = !rows
        ? (activeTab === "strengths"
            ? `<div class="ste-mini ste-line-comment-empty">No standout strengths surfaced for this line — the items are still solid; nothing yet rose above the rubric baseline.</div>`
            : `<div class="ste-mini ste-line-comment-empty">No suggestions for this line — the rubric didn't flag anything worth changing.</div>`)
        : "";
      return `<div class="ste-line-narrative ste-line-narrative-${activeTab}">
        ${rows}${empty}
      </div>`;
    }
    if (activeTab === "closing") {
      const text = aiClosingFor(line);
      const closingEdited = line.commentOverrides && typeof line.commentOverrides.closing === "string";
      return `<div class="ste-line-narrative ste-line-narrative-closing">
        ${closingEdited ? `<div style="margin-bottom:8px"><span class="ste-edited-flag" title="HQ overrode the AI closing comment">Edited</span></div>` : ''}
        ${canEdit
          ? `<textarea class="ste-input ste-line-comment-edit" rows="3" placeholder="Closing comment for this line — wraps the review up." data-comment-edit="${escape(line.id)}|closing|line">${escape(text)}</textarea>`
          : `<p>${escape(text)}</p>`}
      </div>`;
    }
    return skuTableHtml;
  }

  // ============================ STUDIO ============================
  // 6-step wizard. Steps live on session.studioStep (1..6).
  const STUDIO_STEPS = [
    { n: 1, key: "brief",   label: "Brief" },
    { n: 2, key: "source",  label: "Source" },
    { n: 3, key: "filter",  label: "DNA Filter" },
    { n: 4, key: "pick",    label: "Pick References" },
    { n: 5, key: "generate",label: "Generate" },
    { n: 6, key: "lineup",  label: "Lineup" },
  ];
  // Full season universe — newest first. The Studio picker shows only the
  // subset up to and including the platform's "current season" (per
  // STE.selectors().currentSeason()), so designers can't accidentally
  // create a board for a future season the platform hasn't opened yet.
  const STUDIO_SEASONS_ALL = ["30FW","30SS","29FW","29SS","28FW","28SS","27FW","27SS","26FW","26SS","25FW","25SS","24FW","24SS","23FW","23SS"];
  function _seasonWeight(code) {
    if (!code) return 0;
    const m = /^(\d{2})(SS|FW)$/.exec(code);
    if (!m) return 0;
    return parseInt(m[1], 10) * 2 + (m[2] === "FW" ? 1 : 0);
  }
  function _currentSeasonCode() {
    try { return (STE.selectors().currentSeason() || {}).code || ""; } catch (_) { return ""; }
  }
  function studioSeasonOptions() {
    const cur = _currentSeasonCode();
    if (!cur) return STUDIO_SEASONS_ALL.slice();
    const curW = _seasonWeight(cur);
    return STUDIO_SEASONS_ALL.filter(s => _seasonWeight(s) <= curW);
  }
  // Resolved at call time — STE state may not be hydrated when this module
  // first evaluates, so we can't freeze these as constants.
  function studioLatestSeason() {
    const opts = studioSeasonOptions();
    return opts[0] || STUDIO_SEASONS_ALL[STUDIO_SEASONS_ALL.length - 1];
  }
  // Mirrors the Reference Data product-category taxonomy (state.referenceData
  // .productCategories) used in admin/sales/design review. Grouped by the
  // top-level WEAR/ACC/SHOES bucket; leaf names match exactly.
  const STUDIO_ITEM_GROUPS = [
    { label: "Wear", items: [
      "T Shirt","Polo","Knitwear","Fleece","Dress","Tracktop",
      "Jackets","Skiwear",
      "Leggings","Pants","Shorts","Skirts","Trackpants",
      "Tracksuit",
    ]},
    { label: "Accessories", items: [
      "Headwear","Underwear","Socks",
      "Sports/Tennis Bags","Backpacks","Shoe Bags","Luggage",
      "Wristbands","Towels","Headbands","Bandanas",
      "Watches","Cosmetics & Perfumes","Other Sports Accessories",
      "Pyjamas","Swimwear","Leather Goods",
      "Sunglasses","Optical Frames","Glass Cases","Home Textile Products",
    ]},
    { label: "Footwear", items: ["Footwear"] },
  ];
  const STUDIO_ITEMS = STUDIO_ITEM_GROUPS.flatMap(g => g.items);
  const STUDIO_TARGETS = ["Men","Women","Unisex"];
  const STUDIO_REF_COUNTS = [60, 120, 180, 240, 300];
  // Category availability per target — Men/Unisex exclude female-specific
  // pieces (Dress, Skirts). Filters STUDIO_ITEM_GROUPS at render time.
  const _femaleOnly = new Set(["Dress","Skirts"]);
  const STUDIO_ITEMS_BY_TARGET = {
    Men:    new Set(STUDIO_ITEMS.filter(i => !_femaleOnly.has(i))),
    Women:  new Set(STUDIO_ITEMS),
    Unisex: new Set(STUDIO_ITEMS.filter(i => !_femaleOnly.has(i))),
  };
  function itemGroupsForTarget(target) {
    const allow = STUDIO_ITEMS_BY_TARGET[target] || new Set(STUDIO_ITEMS);
    return STUDIO_ITEM_GROUPS
      .map(g => ({ ...g, items: g.items.filter(i => allow.has(i)) }))
      .filter(g => g.items.length > 0);
  }

  let _crawlTickActive = false;
  let _dnaTickActive = false;
  let _genTickActive = false;
  let _briefDdOutsideHandler = null;

  // Featured references — real garment images with pre-generated ST-style
  // variants in assets/generator/. Branded as other-market competitors so
  // they read like genuine references the designer crawled, not ST product.
  // These are spaced through the crawl deck (not pinned to the front) so the
  // DNA filter visibly removes the non-passers between them — the featured
  // items then FLIP-reflow into the front 4 slots, which is where the "wow"
  // comes from.
  const _FEATURED_CRAWL = [
    {
      file: "assets/generator/polo-original.jpg",
      brand: "Lacoste", category: "Polo", name: "Court Heritage Polo",
      grade: "A",
      featured: true,
      variants: [
        "assets/generator/polo-variant-1.jpg",
        "assets/generator/polo-variant-2.jpg",
        "assets/generator/polo-variant-3.png",
      ],
    },
    {
      file: "assets/generator/skirt-original.jpg",
      brand: "Wilson", category: "Skirt", name: "Pleated Tennis Skirt",
      grade: "A",
      featured: true,
      variants: [
        "assets/generator/skirt-variant-1.jpg",
        "assets/generator/skirt-variant-2.jpg",
        "assets/generator/skirt-variant-3.png",
      ],
    },
    {
      file: "assets/generator/shorts-original.jpg",
      brand: "Sporty & Rich", category: "Shorts", name: "Court Active Short",
      grade: "A",
      featured: true,
      variants: [
        "assets/generator/shorts-variant-1.jpg",
        "assets/generator/shorts-variant-2.jpg",
        "assets/generator/shorts-variant-3.png",
      ],
    },
    {
      file: "assets/generator/outer-original.jpg",
      brand: "FILA", category: "Outerwear", name: "Heritage Track Jacket",
      grade: "A",
      featured: true,
      variants: [
        "assets/generator/outer-variant-1.jpg",
        "assets/generator/outer-variant-2.jpg",
        "assets/generator/outer-variant-3.png",
      ],
    },
  ];
  // Shared card builders for the in-page crawl. Reads window.STE_CRAWL_IMAGES
  // (real crawled product photos with brand / category / name metadata). The
  // 4 featured references are SPLICED into the deck at spaced positions (not
  // pinned to the front), so the DNA filter visibly removes the non-passers
  // between them and the featured cards FLIP-reflow into the first 4 slots.
  function buildCrawlCardSet(brief, total) {
    const lib = window.STE_CRAWL_IMAGES || [];
    const GRADES = ["A","B","B","C","C","C","D","D"];
    const remaining = Math.max(0, total - _FEATURED_CRAWL.length);
    const crawled = lib.slice(0, remaining).map((img, i) => ({
      file: "assets/crawl/" + img.file,
      brand: img.brand,
      category: img.category,
      name: img.name,
      grade: GRADES[i % GRADES.length],
    }));
    // Splice featured demo cards into spaced positions through the first
    // two rows. They stay visible (featured-always-pass in the DNA filter)
    // but mixed in with the other references so the grid feels like a
    // real crawl. A "recommended" mark on each helps the designer spot
    // which four to pick for the generation step.
    const SPLICE_AT = [2, 6, 10, 14];
    _FEATURED_CRAWL.forEach((f, i) => {
      const pos = Math.min(crawled.length, SPLICE_AT[i] || (i * 4 + 2));
      crawled.splice(pos, 0, f);
    });
    return crawled.slice(0, total);
  }

  function crawlCardHtml(c) {
    // Note: the recommended mark is NOT shown during the crawl. It only
    // appears at the moment the DNA filter judges each card (Step 3),
    // synchronously with the ✓ pass badge — so it reads as a system
    // verdict, not a pre-baked label on the imagery.
    return `
      <div class="ste-crawl-card">
        <div class="ste-crawl-thumb-wrap">
          <img class="ste-crawl-img" src="${escape(c.file)}" alt="${escape(c.name)}" loading="lazy">
          <span class="ste-crawl-grade">${c.grade}</span>
          <span class="ste-crawl-brand">${escape(c.brand)}</span>
        </div>
        <div class="ste-crawl-meta">
          <strong>${escape(c.category)}</strong>
          <span class="ste-mini">${escape(c.brand)}</span>
        </div>
      </div>`;
  }

  const STUDIO_SOURCE_PRESETS = [
    { key: "diadora",    label: "Diadora · runway + product",    n: 127 },
    { key: "fila",       label: "FILA · heritage line",          n: 104 },
    { key: "sporty",     label: "Sporty & Rich · 26FW",          n: 64  },
    { key: "lacoste",    label: "Lacoste · tennis heritage",     n: 60  },
    { key: "wilson",     label: "Wilson · active courtwear",     n: 37  },
    { key: "skims",      label: "Skims · loungewear",            n: 29  },
    { key: "miumiu",     label: "Miu Miu · sport capsule",       n: 27  },
    { key: "ralphlauren",label: "Ralph Lauren · polo line",      n: 13  },
    { key: "alo",        label: "Alo · activewear",              n: 12  },
    { key: "loropiana",  label: "Loro Piana · luxury active",    n: 9   },
  ];

  // Demo-scale loader. Supports a "script" (array of log lines), an optional
  // counter ("12 / 40"), and a configurable duration so reviewers can absorb
  // each step. Falls back to a simple rolling-log animation if no script.
  function showStudioLoader(root, opts, done) {
    // Back-compat: showStudioLoader(root, label, sub, done)
    if (typeof opts === "string") {
      opts = { label: opts, sub: arguments[2] || "" };
      done = arguments[3];
    }
    const label = opts.label || "Working";
    const sub = opts.sub || "";
    const script = Array.isArray(opts.script) && opts.script.length ? opts.script : null;
    const counterTotal = opts.counterTotal || null;
    const counterLabel = opts.counterLabel || "items";
    const DUR = opts.durationMs || (script ? Math.max(2400, script.length * 350) : 1800);

    const overlay = document.createElement("div");
    overlay.className = "ste-studio-loader";
    overlay.innerHTML = `
      <div class="ste-studio-loader-card">
        <div class="ste-studio-loader-icon"><span class="ste-spinner ste-spinner-inline" aria-hidden="true"></span></div>
        <h3 class="ste-studio-loader-title">${label}…</h3>
        <div class="ste-mini ste-studio-loader-sub">${sub}</div>
        ${counterTotal ? `<div class="ste-studio-loader-counter" data-counter><strong data-counter-n>0</strong> / ${counterTotal} ${counterLabel}</div>` : ''}
        <div class="ste-studio-loader-bar"><div class="ste-studio-loader-fill" style="width:0%"></div></div>
        <div class="ste-studio-loader-log" data-log>${script ? script[0] : 'Initialising…'}</div>
      </div>`;
    root.appendChild(overlay);
    const fill = overlay.querySelector(".ste-studio-loader-fill");
    const log = overlay.querySelector("[data-log]");
    const counterEl = overlay.querySelector("[data-counter-n]");
    const lines = script || [
      "Initialising…", "Reading brief context…", "Querying source catalog…",
      "Streaming reference imagery…", "Scoring against ST DNA…", "Compositing results…"
    ];
    let i = 0;
    const start = Date.now();
    const tick = () => {
      const dt = Date.now() - start;
      const p = Math.min(100, (dt / DUR) * 100);
      fill.style.width = p + "%";
      const lineIdx = Math.min(lines.length - 1, Math.floor(p / (100 / lines.length)));
      if (lineIdx !== i) { i = lineIdx; log.innerHTML = lines[i]; }
      if (counterEl && counterTotal) {
        counterEl.textContent = Math.min(counterTotal, Math.round((p / 100) * counterTotal));
      }
      if (p < 100) requestAnimationFrame(tick);
      else { overlay.remove(); done && done(); }
    };
    requestAnimationFrame(tick);
  }

  // Per-step transition script. Returns opts for showStudioLoader.
  function buildStudioTransition(nextStep, brief) {
    if (nextStep === 2) return null;  // no loader on Brief → Source pick

    if (nextStep === 3) {
      // Crawl. Build a site-by-site narrative from the actually-selected sources.
      const selectedKeys = brief.sources || [];
      const selectedPresets = STUDIO_SOURCE_PRESETS.filter(s => selectedKeys.includes(s.key));
      // Available custom sources (post-provisioning) that are selected get
      // crawled too. Each contributes ~25 images.
      const customs = (brief.customSources || [])
        .map((c, i) => ({ name: typeof c === "string" ? c : c.name, key: "_c_" + i }))
        .filter(c => selectedKeys.includes(c.key))
        .map(c => ({ key: c.key, label: c.name + " · custom", n: 25 }));
      const all = selectedPresets.concat(customs);
      const totalImages = all.reduce((sum, s) => sum + s.n, 0) || 1;
      const script = [];
      script.push(`Connecting to <strong>${all.length}</strong> source${all.length===1?'':'s'}…`);
      all.forEach((s) => {
        const name = escape(s.label.split(" · ")[0] || s.label);
        script.push(`<span style="color:var(--ste-muted)">→</span> Visiting <strong>${name}</strong>…`);
        script.push(`<span style="color:var(--ste-muted)">→</span> Inspecting ${name} catalogue…`);
        script.push(`<span style="color:var(--ste-muted)">→</span> Collecting <strong>${s.n}</strong> reference${s.n===1?'':'s'} from ${name} ✓`);
      });
      script.push(`De-duplicating ${totalImages} candidates by perceptual hash…`);
      script.push(`Indexing palette + composition signatures…`);
      script.push(`Crawl complete — <strong>${totalImages}</strong> references ready for DNA filter.`);
      return {
        label: "Crawling sources",
        sub: `Pulling reference imagery from the brands you selected.`,
        script,
        counterTotal: totalImages,
        counterLabel: "images",
        durationMs: Math.max(5200, all.length * 1100),
      };
    }
    if (nextStep === 4) {
      // DNA filter — pillar by pillar
      const PILLAR_LIST = ["P1 Italian Tennis Heritage", "P2 Elegant Functionalism", "P3 Court-to-Social Lifestyle", "P4 Body-Lined Silhouette", "P5 Quiet Performance"];
      const totalCandidates = Math.max(20, Math.round(60 * (1 - (brief.dnaStrictness || 70) / 200)));
      const script = [`Loading 5 pillars + 26 sub-rules…`];
      PILLAR_LIST.forEach(p => {
        script.push(`<span style="color:var(--ste-muted)">→</span> Scoring against <strong>${p}</strong>…`);
      });
      script.push(`Aggregating per-image scores…`);
      script.push(`Filtering at DNA Strictness <strong>${brief.dnaStrictness}%</strong>…`);
      script.push(`<strong>${totalCandidates}</strong> images pass the filter.`);
      return {
        label: "Applying ST DNA filter",
        sub: "Scoring candidates against the 26 sub-rules of P1–P5.",
        script,
        counterTotal: totalCandidates,
        counterLabel: "passed",
        durationMs: 4400,
      };
    }
    if (nextStep === 5) {
      const total = 24;
      const script = [
        `Reading 12 reference selections…`,
        `Composing variant prompts for <strong>${escape(brief.item || 'item')}</strong> × <strong>${escape(brief.target || 'target')}</strong>…`,
        `<span style="color:var(--ste-muted)">→</span> Sampling silhouette geometry…`,
        `<span style="color:var(--ste-muted)">→</span> Generating colorway candidates…`,
        `<span style="color:var(--ste-muted)">→</span> Applying ST palette constraints (TCX-6)…`,
        `<span style="color:var(--ste-muted)">→</span> Variant Boldness <strong>${brief.variantBoldness}%</strong> — perturbation strength set…`,
        `Rendering <strong>${total}</strong> concept thumbnails…`,
        `Generation complete.`,
      ];
      return {
        label: "Generating variants",
        sub: "Composing concepts on the ST lineup grid.",
        script,
        counterTotal: total,
        counterLabel: "concepts",
        durationMs: 5600,
      };
    }
    if (nextStep === 6) {
      const script = [
        `Ranking 24 concepts by aggregate pillar score…`,
        `<span style="color:var(--ste-muted)">→</span> Selecting top 5 …`,
        `<span style="color:var(--ste-muted)">→</span> Assigning lineup codenames (ACE · BAGEL · NET · ARCHIVIO · CHALLENGE)…`,
        `<span style="color:var(--ste-muted)">→</span> Composing final lineup grid…`,
        `Bundling concept assets for Inspector handoff…`,
        `Lineup ready.`,
      ];
      return {
        label: "Finalising lineup",
        sub: "Bundling the top 5 concepts.",
        script,
        counterTotal: 5,
        counterLabel: "concepts",
        durationMs: 3800,
      };
    }
    return null;
  }

  // Design Studio sub-routes:
  //   #/design-studio                  → boards list
  //   #/design-studio/new              → wizard for a new board (step 1)
  //   #/design-studio/details/<id>     → wizard hydrated from an existing
  //                                       saved board (lands on step 6, but the
  //                                       user can navigate back to edit any
  //                                       earlier step)
  // Design Studio sub-routes:
  //   #/design-studio                          → boards list
  //   #/design-studio/new                      → wizard for a new board (step 1)
  //   #/design-studio/details/view/<id>        → read-only board view
  //   #/design-studio/details/edit/<id>        → wizard hydrated from the board
  //   #/design-studio/details/<id>             → legacy alias for /view/<id>
  function designStudioSubRoute() {
    const h = location.hash || "";
    // New form: /details/(view|edit)/<id>
    const m1 = h.match(/^#\/design-studio\/details\/(view|edit)\/([A-Za-z0-9_-]+)/i);
    if (m1) return { kind: m1[1].toLowerCase(), id: m1[2] };
    // /new
    const m2 = h.match(/^#\/design-studio\/(new)\b/i);
    if (m2) return { kind: "new" };
    // Legacy: /details/<id> → treat as view
    const m3 = h.match(/^#\/design-studio\/details\/([A-Za-z0-9_-]+)/i);
    if (m3) return { kind: "view", id: m3[1] };
    return { kind: "list" };
  }

  function designStudio() {
    const sub = designStudioSubRoute();
    if (sub.kind === "list") return boards();
    if (sub.kind === "new") {
      // designStudio router is responsible for seeding the wizard when the
      // user lands on /new — runForCurrentRoute already reset studioStep
      // to 1, but a missing studioBrief would leave the wizard empty.
      const sess = STE.getSession() || {};
      const _curW = _seasonWeight(_currentSeasonCode());
      const _briefSeasonW = _seasonWeight((sess.studioBrief && sess.studioBrief.season) || "");
      const _seasonStale = _curW && _briefSeasonW && _briefSeasonW > _curW;
      if (!sess.studioBrief || !sess.studioBrief.season || _seasonStale) {
        STE.setSession({
          ...sess,
          studioBoardId: null,
          studioStep: 1,
          studioBrief: {
            ...(sess.studioBrief || {}),
            season: studioLatestSeason(), item: "", items: [], target: "Men", refCount: 120,
            dnaStrictness: 70, variantBoldness: 40,
            sources: [], customSources: [], picks: [],
          },
        });
      } else if (sess.studioBoardId) {
        // Coming from /details/<id> via the URL bar — drop the active board.
        STE.setSession({ ...sess, studioBoardId: null, studioStep: 1 });
      }
      return studio();
    }
    // sub.kind === "view" or "edit" — pull the persisted board record.
    const board = (STE.get().studioBoards || []).find(x => x.id === sub.id);
    if (!board) {
      // Stale URL — drop back to the list.
      location.replace("#/design-studio");
      return boards();
    }
    if (sub.kind === "view") {
      return boardDetail(board);
    }
    // Edit mode — hydrate session from the board record and hand off to the
    // wizard. Skip rehydration when the wizard is already pointed at the
    // same board so unsaved changes survive a re-render.
    const sess = STE.getSession() || {};
    if (sess.studioBoardId !== sub.id) {
      const restoredBrief = {
        ...(board.brief || {}),
        picks: (board.picks || []).slice(),
        _genState: "complete",
      };
      STE.setSession({
        ...sess,
        studioBoardId: sub.id,
        studioStep: 6,
        studioBrief: restoredBrief,
      });
    }
    return studio();
  }

  // Read-only board detail page. Rendered at #/design-studio/details/view/<id>.
  // Mirrors the wizard's Step 6 layout (lineup of variant cards grouped by
  // reference) but drops every "click to toggle" affordance — the user sees
  // the finished work, and an Edit Board button takes them into the wizard
  // when they want to change something.
  function boardDetail(board) {
    const root = pageMain("design-studio");
    const brief = board.brief || {};
    const picks = board.picks || [];

    // Reconstruct the lineup using the same helpers Step 6 uses, so the
    // rendering stays consistent between view + edit.
    const totalLib = (window.STE_CRAWL_IMAGES || []).length || 60;
    const allCards = buildCrawlCardSet(brief, totalLib);
    const variantsFor = (idx) => {
      const orig = allCards[idx];
      if (!orig) return [];
      if (orig.variants && orig.variants.length) return orig.variants.slice(0, 3);
      return [17, 34, 51].map(off => allCards[(idx + off) % totalLib]?.file).filter(Boolean);
    };
    const lineupSet = new Set(brief.lineupVariants || []);
    const CONCEPT_NAMES = ["ACE", "BAGEL", "NET", "ARCHIVIO", "CHALLENGE", "VOLLEY", "BREAK", "SLICE", "RALLY", "SMASH", "RETURN", "DROP", "LOB", "TOSS"];
    let conceptN = 0;
    const groups = picks
      .slice()
      .sort((a, b) => a - b)
      .map(idx => {
        const orig = allCards[idx];
        if (!orig) return null;
        const kept = variantsFor(idx)
          .map((file, vi) => ({ file, vi }))
          .filter(({ vi }) => lineupSet.has(`${idx}_${vi}`));
        if (!kept.length) return null;
        return {
          orig,
          idx,
          variants: kept.map(({ file, vi }) => {
            const n = conceptN++;
            return {
              file,
              variantNum: vi + 1,
              name: CONCEPT_NAMES[n % CONCEPT_NAMES.length] + (n >= CONCEPT_NAMES.length ? `-${Math.floor(n/CONCEPT_NAMES.length)+1}` : ""),
              num: n + 1,
              skus: 3 + (n % 3),
            };
          }),
        };
      })
      .filter(Boolean);
    const conceptCount = groups.reduce((s, g) => s + g.variants.length, 0);

    // Brief recap chips — only the dimensions that have a value.
    const recapChips = [
      ["SEASON",  brief.season],
      ["CATEGORY", brief.item],
      ["TARGET",  brief.target],
      ["REF COUNT", brief.refCount],
      ["DNA STRICTNESS",   brief.dnaStrictness != null ? brief.dnaStrictness + "%" : null],
      ["VARIANT BOLDNESS", brief.variantBoldness != null ? brief.variantBoldness + "%" : null],
    ].filter(([, v]) => v != null && v !== "");

    const sources = Array.isArray(brief.sources) ? brief.sources : [];

    root.innerHTML = `
      <div class="ste-screen-pad">
        <div class="ste-section-hd">
          <div class="ste-page-crumbs">
            <a href="#/home">Home</a><span class="sep">/</span>
            <a href="#/design-studio">Design Studio</a><span class="sep">/</span>
            <span class="cur">${escape(board.id)}</span>
            <p class="ste-hd-meta">Updated ${escape(formatRelative(board.updatedAt))}</p>
          </div>
          <div class="ste-page-hd-row">
            <div class="ste-studio-header-title">
              <h1>${escape(board.id)}</h1>
              <p class="ste-page-subtitle">${escape(board.name)}</p>
            </div>
            <div class="ste-hd-cta" style="display:flex;gap:8px;align-items:center">
              <div class="ste-cta-secondary">
                <button class="ste-icon-btn" type="button" data-share-board aria-label="Share board" title="Share board">
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                </button>
                <button class="ste-icon-btn" type="button" data-download-assets aria-label="Download assets" title="Download assets">
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </button>
                <button class="ste-icon-btn ste-icon-btn-danger" type="button" data-delete-board aria-label="Delete board" title="Delete board">
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
              <a class="ste-btn ste-btn-ghost ste-btn-cancel" href="#/design-studio" data-back-list>Back</a>
              <a class="ste-btn ste-btn-primary" href="#/design-studio/details/edit/${escape(board.id)}" data-edit-board>Edit Board</a>
            </div>
          </div>
        </div>

        <div class="ste-studio-card">
          <div class="ste-studio-card-hd">
            <div class="ste-mini">BRIEF</div>
            <h2>Season Design Brief</h2>
          </div>
          <div class="ste-brief-recap" style="margin:0 0 14px">
            ${recapChips.map(([k,v]) => `<span class="ste-brief-chip"><em>${escape(k)}</em><strong>${escape(v)}</strong></span>`).join("")}
          </div>
          ${sources.length ? `
            <div class="ste-mini" style="margin-top:6px">Sources · ${sources.map(s => `<span class="ste-brief-chip ste-brief-chip-soft">${escape(s)}</span>`).join(" ")}</div>` : ''}
        </div>

        <div class="ste-studio-card">
          <div class="ste-studio-card-hd ste-studio-card-hd-row">
            <div class="ste-studio-card-hd-text">
              <h2>Lineup</h2>
              <p>${conceptCount === 0
                ? 'No variants were selected for the lineup. Click <strong>Edit Board</strong> to go back to Step 5 and tick the variants you want to include.'
                : `<strong>${conceptCount}</strong> variant${conceptCount===1?'':'s'} across <strong>${groups.length}</strong> reference${groups.length===1?'':'s'}.`}</p>
            </div>
            <div class="ste-studio-pick-counter">
              <span class="ste-studio-pick-num"><strong>${conceptCount}</strong></span>
              <span class="ste-studio-pick-lbl">Concepts</span>
            </div>
          </div>

          ${conceptCount === 0 ? '' : `
            <div class="ste-gen-list ste-gen-list-compact">
              ${groups.map(g => `
                <div class="ste-gen-pick-row is-generated ste-gen-pick-row-compact">
                  <div class="ste-gen-orig">
                    <div class="ste-mini ste-gen-orig-lbl">REFERENCE</div>
                    <div class="ste-crawl-thumb-wrap ste-gen-orig-thumb">
                      <img class="ste-crawl-img" src="${escape(g.orig.file)}" alt="${escape(g.orig.name)}" loading="lazy">
                    </div>
                    <div class="ste-gen-orig-meta">
                      <strong>${escape(g.orig.category)}</strong>
                      <span class="ste-mini">${escape(g.orig.brand)}</span>
                    </div>
                  </div>
                  <div class="ste-gen-variants">
                    <div class="ste-gen-variants-grid">
                      ${g.variants.map(v => `
                        <div class="ste-gen-variant-card is-ready is-included is-lineup">
                          <div class="ste-crawl-thumb-wrap">
                            <img class="ste-crawl-img" src="${escape(v.file)}" alt="${escape(v.name)}" loading="lazy">
                            <span class="ste-lineup-num">${String(v.num).padStart(2,'0')}</span>
                          </div>
                          <div class="ste-gen-variant-meta">
                            <strong class="ste-lineup-name">${escape(v.name)}</strong>
                          </div>
                        </div>`).join("")}
                    </div>
                  </div>
                </div>`).join("")}
            </div>`}
        </div>
      </div>`;

    // Edit Board — anchor href is already canonical, but stop wizard
    // session from carrying stale state by clearing here too.
    root.querySelector("[data-edit-board]")?.addEventListener("click", () => {
      // Anchor navigates; designStudio router will hydrate session.
    });
    root.querySelector("[data-share-board]")?.addEventListener("click", () => {
      openShareModal(board.id);
    });
    root.querySelector("[data-download-assets]")?.addEventListener("click", () => {
      downloadBoardAssets(board);
    });
    root.querySelector("[data-delete-board]")?.addEventListener("click", () => {
      openBoardDeleteModal(board, () => {
        STE.mutate(s => {
          s.studioBoards = (s.studioBoards || []).filter(x => x.id !== board.id);
        });
        STEApp.toast(`Deleted "${board.name}".`, "info");
        location.hash = "#/design-studio";
      });
    });
  }

  function studio() {
    const root = pageMain("design-studio");
    const session = STE.getSession() || {};
    const step = parseInt(session.studioStep) || 1;
    const brief = session.studioBrief || { season: studioLatestSeason(), item: "", items: [], target: "Men", refCount: 120, dnaStrictness: 70, variantBoldness: 40, sources: [], customSources: [] };

    // Title stays generic — "Create New Board" for a fresh wizard run,
    // "Edit Board" when an existing board is loaded. The board name surfaces
    // in the breadcrumb (next to the back-link to Design Studio).
    const activeBoard = session.studioBoardId
      ? ((STE.get().studioBoards || []).find(x => x.id === session.studioBoardId))
      : null;
    const wizardTitle = activeBoard ? activeBoard.id : "Create New Board";
    const wizardCrumb = activeBoard ? escape(activeBoard.id) : "Create New Board";

    root.innerHTML = `
      <div class="ste-screen-pad">
        <div class="ste-studio-header">
          <div class="ste-page-crumbs"><a href="#/home">Home</a><span class="sep">/</span><a href="#/design-studio">Design Studio</a><span class="sep">/</span><span class="cur">${wizardCrumb}</span></div>
          <div class="ste-studio-header-titlerow">
            <div class="ste-studio-header-title">
              <h1>${escape(wizardTitle)}</h1>
              ${activeBoard ? `<p class="ste-board-subtitle">${escape(activeBoard.name)}</p>` : ''}
            </div>
            <div class="ste-studio-steps">
              ${STUDIO_STEPS.map(s => {
                const state = s.n===step ? 'active' : s.n<step ? 'done' : 'locked';
                const disabled = state === 'locked' ? 'disabled' : '';
                return `
                  <button class="ste-studio-step ${state}" data-step="${s.n}" ${disabled}>
                    <span class="ste-studio-step-n">${state === 'done' ? '✓' : s.n}</span>
                    <span>${escape(s.label)}</span>
                  </button>${s.n<STUDIO_STEPS.length ? `<span class="ste-studio-step-sep">›</span>` : ''}
                `;
              }).join("")}
            </div>
            <div class="ste-studio-nav">
              <button class="ste-btn ste-btn-ghost" data-nav="cancel" type="button">Cancel</button>
              ${(() => {
                if (step === 1) {
                  return `<button class="ste-btn ste-btn-primary" data-nav="next">Pick Sources →</button>`;
                }
                if (step === 2) {
                  if (brief._crawlState === "complete") {
                    return `<button class="ste-btn ste-btn-primary" data-nav="next">APPLY DNA FILTER →</button>`;
                  }
                  if (brief._crawlState === "running") {
                    return `<button class="ste-btn ste-btn-primary" data-nav="next" disabled>Crawling sources…</button>`;
                  }
                  const total = (brief.sources || []).length;
                  return total === 0
                    ? `<button class="ste-btn ste-btn-primary" data-nav="next" disabled title="Pick at least one source to continue">Start Crawl →</button>`
                    : `<button class="ste-btn ste-btn-primary" data-nav="next">Start Crawl →</button>`;
                }
                if (step === 3) {
                  if (brief._dnaState === "scanning" || !brief._dnaState) {
                    return `<button class="ste-btn ste-btn-primary" data-nav="next" disabled>Filtering DNA…</button>`;
                  }
                  return `<button class="ste-btn ste-btn-primary" data-nav="next">Pick References →</button>`;
                }
                if (step === 4) {
                  const pickN = (brief.picks || []).length;
                  if (pickN === 0) {
                    return `<button class="ste-btn ste-btn-primary" data-nav="next" disabled title="Pick at least one reference to continue">Generate with Brand Guide →</button>`;
                  }
                  return `<button class="ste-btn ste-btn-primary" data-nav="next">Generate with Brand Guide (${pickN}) →</button>`;
                }
                if (step === 5) {
                  if (brief._genState === "generating" || !brief._genState) {
                    return `<button class="ste-btn ste-btn-primary" data-nav="next" disabled>Generating variants…</button>`;
                  }
                  const lineupN = (brief.lineupVariants || []).length;
                  if (lineupN === 0) {
                    return `<button class="ste-btn ste-btn-primary" data-nav="next" disabled title="Click variants to include them in the lineup" data-lineup-next>Build Lineup →</button>`;
                  }
                  return `<button class="ste-btn ste-btn-primary" data-nav="next" data-lineup-next>Build Lineup →</button>`;
                }
                // Step 6 — finish actions. Save creates/updates the board;
                // Share opens the share modal (board is saved first if needed).
                const isExistingBoard = !!session.studioBoardId;
                return `
                  <button class="ste-btn ste-btn-primary" data-nav="finish">${isExistingBoard ? 'Update Board' : 'Save Board'}</button>`;
              })()}
            </div>
          </div>
        </div>

        ${renderStudioStep(step, brief)}
      </div>`;

    // Step jumping — locked (future) steps are disabled; can only jump back.
    $$("[data-step]", root).forEach(b => {
      b.addEventListener("click", () => {
        if (b.disabled) return;
        let targetStep = parseInt(b.getAttribute("data-step"));
        if (targetStep > step) return; // belt-and-suspenders
        // Step 3 (DNA Filter) is a one-way transition — never a resting
        // state. Jumping back to it is treated as "back to Step 2 (Crawl)"
        // so the filter re-runs cleanly when the user proceeds again.
        if (targetStep === 3) targetStep = 2;
        // Cascading state resets — only clear state for steps BEHIND the
        // target. So jumping 6→5 preserves picks + gen; 5→4 preserves
        // picks; 4→2 resets DNA + picks; 2→1 resets the crawl.
        const patch = { ...brief };
        if (targetStep < 2) { patch._crawlState = null; patch._crawlReceived = 0; }
        if (targetStep < 3) { patch._dnaState = null; }
        if (targetStep < 4) { patch.picks = []; }
        if (targetStep < 5) { patch._genState = null; }
        STE.setSession({ ...STE.getSession(), studioStep: targetStep, studioBrief: patch });
        studio();
      });
    });
    // Nav buttons
    $$("[data-nav]", root).forEach(b => {
      b.addEventListener("click", () => {
        const dir = b.getAttribute("data-nav");
        if (dir === "next") {
          // Step 1 → 2 requires at least one category. The Brief stage's
          // crawl/DNA/generation downstream all key off CATEGORIES — without
          // at least one selection the prompts have nothing to compose.
          if (step === 1) {
            const _picked = Array.isArray(brief.items)
              ? brief.items.filter(Boolean)
              : (brief.item ? [brief.item] : []);
            if (_picked.length === 0) {
              STEApp.toast("Pick at least one category to continue.", "warn");
              return;
            }
          }
          // Step 2 → 3 uses an in-page streaming crawl (Tacchini-style)
          // instead of the modal loader. Only the first click on Step 2
          // triggers the crawl; once complete, the same button proceeds.
          if (step === 2 && brief._crawlState !== "complete") {
            STE.setSession({ ...STE.getSession(), studioBrief: { ...brief, _crawlState: "running", _crawlReceived: 0 } });
            studio();
            return;
          }
          // Step 2 → 3 (after crawl complete): open the DNA settings modal
          // so the user can dial in DNA Strictness + Variant Boldness before
          // the filter actually runs — the thresholds are most relevant
          // right here, at the moment the filter is about to be applied.
          // On Apply, advance into Step 3 with the chosen values; on Cancel,
          // stay on Step 2.
          if (step === 2 && brief._crawlState === "complete") {
            openDnaSettingsModal(brief, (next) => {
              const freshSess = STE.getSession() || {};
              const freshBrief = freshSess.studioBrief || brief;
              STE.setSession({
                ...freshSess,
                studioStep: 3,
                studioBrief: {
                  ...freshBrief,
                  dnaStrictness: next.dnaStrictness,
                  variantBoldness: next.variantBoldness,
                  _dnaState: "scanning",
                  _dnaScanStart: Date.now(),
                  // Every fresh DNA filter run clears any prior picks so
                  // Step 4 doesn't reopen with stale selections.
                  picks: [],
                },
              });
              studio();
            });
            return;
          }
          const nextStep = Math.min(6, step+1);
          // Step 4 → 5 (generate variants): mirror the DNA filter transition.
          // Unpicked cards fade out, picked cards FLIP-reflow into their new
          // grid positions, then we advance to Step 5 where image variants
          // morph in. Whole flow stays on the same DOM (no jump).
          if (step === 4 && nextStep === 5) {
            const grid = root.querySelector("[data-pick-grid]");
            if (!grid) {
              // Defensive fallback if the grid disappeared
              STE.setSession({ ...STE.getSession(), studioStep: 5, studioBrief: { ...brief, _genState: "generating" } });
              studio();
              return;
            }
            const cardEls = Array.from(grid.querySelectorAll(".ste-crawl-card"));
            const picks = brief.picks || [];
            const pickSet = new Set(picks);
            const pickedEls = cardEls.filter(el => pickSet.has(parseInt(el.getAttribute("data-pick-idx"))));
            const unpickedEls = cardEls.filter(el => !pickSet.has(parseInt(el.getAttribute("data-pick-idx"))));

            // Disable further clicks on the gallery during the transition.
            grid.style.pointerEvents = "none";
            const navBtn = root.querySelector('[data-nav="next"]');
            if (navBtn) { navBtn.disabled = true; navBtn.textContent = "Preparing…"; }

            // Phase 1: white out / dim the unpicked cards in place (like the
            //          DNA filter's first pass — opacity drops, grayscale).
            unpickedEls.forEach(el => el.classList.add("is-filtering"));

            // Phase 2: after the dim settles, capture FLIP rects, then zoom
            //          out the dimmed cards (.is-removing — scale 0.88, opacity 0).
            setTimeout(() => {
              const oldRects = new Map();
              pickedEls.forEach(el => oldRects.set(el, el.getBoundingClientRect()));
              unpickedEls.forEach(el => el.classList.add("is-removing"));

              setTimeout(() => {
                // Phase 3: pull unpicked from layout, FLIP picked into new spots.
                unpickedEls.forEach(el => { el.style.display = "none"; });
                requestAnimationFrame(() => {
                const transforms = pickedEls.map(el => {
                  const oldR = oldRects.get(el);
                  const newR = el.getBoundingClientRect();
                  return { el, dx: oldR.left - newR.left, dy: oldR.top - newR.top };
                });
                transforms.forEach(({ el, dx, dy }) => {
                  if (dx !== 0 || dy !== 0) {
                    el.style.transition = "none";
                    el.style.transform = `translate(${dx}px, ${dy}px)`;
                  }
                });
                void grid.offsetHeight;
                requestAnimationFrame(() => {
                  transforms.forEach(({ el }) => {
                    el.classList.add("is-reflowing");
                    el.style.transition = "transform 1.6s cubic-bezier(0.22, 1, 0.36, 1)";
                  });
                  void grid.offsetHeight;
                  requestAnimationFrame(() => {
                    transforms.forEach(({ el }) => {
                      el.style.transform = "";
                    });
                    // 5. Wait for the 2.2s slide + breathing room, then go.
                    setTimeout(() => {
                      const sess = STE.getSession() || {};
                      const lb = sess.studioBrief || {};
                      STE.setSession({
                        ...sess,
                        studioStep: 5,
                        studioBrief: { ...lb, _genState: "generating" },
                      });
                      studio();
                    }, 1800);
                  });
                });
              });
              }, 700);
            }, 800);
            return;
          }
          // Step 5 → 6 (build lineup): fade the gen list to white, then
          // render Step 6 underneath and fade it back in. No FLIP — the
          // designer's eye doesn't need to track individual variants
          // moving, they just need a clean handoff to the final lineup.
          if (step === 5 && nextStep === 6) {
            const grid = root.querySelector("[data-gen-grid]");
            const navBtn = root.querySelector('[data-nav="next"]');
            if (navBtn) { navBtn.disabled = true; navBtn.textContent = "Building lineup…"; }
            if (!grid) {
              // Read freshest brief — variant picks made AFTER the nav handler
              // bound live in session, not in the closure-captured `brief`.
              const freshSess = STE.getSession() || {};
              STE.setSession({ ...freshSess, studioStep: 6 });
              studio();
              return;
            }
            grid.style.pointerEvents = "none";
            // Phase 1: fade the gen list out to white.
            grid.classList.add("is-fading-out");
            setTimeout(() => {
              // Phase 2: swap to Step 6. The new gen list renders with
              // .is-fading-in which animates from opacity 0 up to 1.
              // Pull the latest brief from session (closure `brief` is stale
              // — variant picks update session but not the closure).
              const freshSess = STE.getSession() || {};
              const freshBrief = freshSess.studioBrief || brief;
              STE.setSession({ ...freshSess, studioStep: 6, studioBrief: { ...freshBrief, _lineupFadeIn: true } });
              studio();
            }, 950);
            return;
          }

          const opts = buildStudioTransition(nextStep, brief);
          // Reset crawl state when leaving step 2 forward so a re-entry
          // starts a fresh crawl.
          STE.setSession({ ...STE.getSession(), studioStep: nextStep, studioBrief: { ...brief, _crawlState: null, _crawlReceived: 0 } });
          if (nextStep === 3) {
            // The crawl already happened in-page on step 2 — no extra modal.
            studio();
          } else if (opts) {
            showStudioLoader(root, opts, () => studio());
          } else {
            studio();
          }
        }
        else if (dir === "cancel") {
          // Cancel — abandon the current wizard session. If we were editing
          // an existing board, return to its view page so the user lands on
          // the saved state. For a brand-new board, go back to the list.
          const sessNow = STE.getSession() || {};
          const editingId = sessNow.studioBoardId;
          STE.setSession({ ...sessNow, studioBoardId: null, studioStep: 1, studioBrief: null, _linesOpen: [] });
          if (editingId && (STE.get().studioBoards || []).some(x => x.id === editingId)) {
            location.hash = `#/design-studio/details/view/${encodeURIComponent(editingId)}`;
          } else {
            location.hash = "#/design-studio";
          }
        }
        else if (dir === "prev") {
          // Step 3 (DNA Filter) is a one-way transition — never a resting
          // state. Going Previous from Step 4 jumps over it to Step 2 (Crawl).
          let targetStep = Math.max(1, step - 1);
          if (targetStep === 3) targetStep = 2;
          const patch = { ...brief };
          // Cascading state resets — only clear state for steps BEHIND the
          // target. So going 6→5 preserves picks + gen; 5→4 preserves picks;
          // 4→2 resets DNA + picks; 2→1 resets the crawl.
          if (targetStep < 2) { patch._crawlState = null; patch._crawlReceived = 0; }
          if (targetStep < 3) { patch._dnaState = null; }
          if (targetStep < 4) { patch.picks = []; }
          if (targetStep < 5) { patch._genState = null; }
          STE.setSession({ ...STE.getSession(), studioStep: targetStep, studioBrief: patch });
          studio();
        }
        else if (dir === "finish") {
          // For an existing board: save quietly (rename inline on the
          // boards list if needed). For a new board: prompt for a name
          // first via the naming modal, then save with that name. Either
          // way, drop the user onto the read-only view page so they can
          // confirm the result without staying inside the wizard.
          if (session.studioBoardId) {
            const id = session.studioBoardId;
            saveCurrentBoard();
            STEApp.toast("Board updated.", "success");
            location.hash = `#/design-studio/details/view/${encodeURIComponent(id)}`;
          } else {
            openNameBoardModal(defaultBoardName(brief), (name) => {
              const id = saveCurrentBoard(name);
              STEApp.toast("Board saved.", "success");
              location.hash = `#/design-studio/details/view/${encodeURIComponent(id)}`;
            });
          }
        }
        else if (dir === "share") {
          // Auto-save the current state before opening the share modal so
          // we always have a board to share. Then open the share modal.
          const id = saveCurrentBoard();
          openShareModal(id);
        }
      });
    });
    // Brief inputs — single-select chip groups (SEASON / TARGET / REFCOUNT)
    $$("[data-brief]", root).forEach(b => {
      b.addEventListener("click", () => {
        const k = b.getAttribute("data-brief"), v = b.getAttribute("data-val");
        STE.setSession({ ...STE.getSession(), studioBrief: { ...brief, [k]: isNaN(+v) ? v : +v } });
        studio();
      });
    });
    // Brief inputs — multi-select chip groups (ITEMS). Toggle in/out of array.
    $$("[data-brief-multi]", root).forEach(b => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const k = b.getAttribute("data-brief-multi"), v = b.getAttribute("data-val");
        const cur = Array.isArray(brief[k]) ? brief[k].slice() : (brief[k] ? [brief[k]] : []);
        const i = cur.indexOf(v);
        if (i === -1) cur.push(v); else cur.splice(i, 1);
        const patch = { [k]: cur };
        if (k === "items") patch.item = cur[0] || "";
        STE.setSession({ ...STE.getSession(), studioBrief: { ...brief, ...patch } });
        studio();
      });
    });

    // Brief inputs — native <select> dropdowns (e.g. SEASON). Same
    // contract as data-brief: write the value to brief[key].
    $$("[data-brief-select]", root).forEach(s => {
      s.addEventListener("change", (e) => {
        const k = s.getAttribute("data-brief-select");
        const raw = e.target.value;
        const v = isNaN(+raw) ? raw : +raw;
        STE.setSession({ ...STE.getSession(), studioBrief: { ...brief, [k]: v } });
        studio();
      });
    });

    // Brief inputs — single-select dropdowns (SEASON / TARGET / REF COUNT)
    $$("[data-brief-single]", root).forEach(b => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const k = b.getAttribute("data-brief-single");
        const raw = b.getAttribute("data-val");
        const v = isNaN(+raw) ? raw : +raw;
        const openKey = (k === "items") ? "_itemsMenuOpen" : ("_" + k + "MenuOpen");
        STE.setSession({ ...STE.getSession(), studioBrief: { ...brief, [k]: v, [openKey]: false } });
        studio();
      });
    });

    // Open/close any brief dropdown menu (only one open at a time).
    $$("[data-brief-dd-toggle]", root).forEach(b => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const k = b.getAttribute("data-brief-dd-toggle");
        const allOpenKeys = ["_itemsMenuOpen","_seasonMenuOpen","_targetMenuOpen","_refCountMenuOpen"];
        const openKey = (k === "items") ? "_itemsMenuOpen" : ("_" + k + "MenuOpen");
        const wasOpen = !!brief[openKey];
        const patch = {};
        allOpenKeys.forEach(ok => { patch[ok] = false; });
        if (!wasOpen) patch[openKey] = true;
        STE.setSession({ ...STE.getSession(), studioBrief: { ...brief, ...patch } });
        studio();
      });
    });

    // Select / Deselect all
    $$("[data-brief-dd-toggle-all]", root).forEach(b => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const k = b.getAttribute("data-brief-dd-toggle-all");
        const allItems = STUDIO_ITEM_GROUPS.flatMap(g => g.items);
        const cur = Array.isArray(brief[k]) ? brief[k] : [];
        const allSelected = allItems.every(o => cur.includes(o));
        const next = allSelected ? [] : allItems.slice();
        const patch = { [k]: next };
        if (k === "items") patch.item = next[0] || "";
        STE.setSession({ ...STE.getSession(), studioBrief: { ...brief, ...patch } });
        studio();
      });
    });

    // Group-level All / Clear
    $$("[data-brief-dd-toggle-group]", root).forEach(b => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const k = b.getAttribute("data-brief-dd-toggle-group");
        const grp = b.getAttribute("data-group");
        const group = STUDIO_ITEM_GROUPS.find(g => g.label === grp);
        if (!group) return;
        const cur = Array.isArray(brief[k]) ? brief[k].slice() : [];
        const groupAllSel = group.items.every(o => cur.includes(o));
        const next = groupAllSel
          ? cur.filter(v => !group.items.includes(v))
          : Array.from(new Set([...cur, ...group.items]));
        const patch = { [k]: next };
        if (k === "items") patch.item = next[0] || "";
        STE.setSession({ ...STE.getSession(), studioBrief: { ...brief, ...patch } });
        studio();
      });
    });

    // Outside click closes any open brief-dd menu. The handler is GLOBAL —
    // we keep a single module-level reference so re-renders (which happen on
    // every selection) tear down the previous listener before attaching a
    // fresh one. The handler looks up `.ste-brief-dropdown` by selector on
    // each click, so it survives the rerender DOM swap.
    if (_briefDdOutsideHandler) {
      document.removeEventListener("mousedown", _briefDdOutsideHandler);
      _briefDdOutsideHandler = null;
    }
    const anyMenuOpen = brief._itemsMenuOpen || brief._seasonMenuOpen || brief._targetMenuOpen || brief._refCountMenuOpen;
    if (anyMenuOpen) {
      _briefDdOutsideHandler = (ev) => {
        // Click inside any dropdown? Keep open.
        const dds = Array.from(document.querySelectorAll(".ste-brief-dropdown"));
        if (dds.some(dd => dd.contains(ev.target))) return;
        document.removeEventListener("mousedown", _briefDdOutsideHandler);
        _briefDdOutsideHandler = null;
        const sess = STE.getSession() || {};
        STE.setSession({ ...sess, studioBrief: {
          ...(sess.studioBrief || {}),
          _itemsMenuOpen: false, _seasonMenuOpen: false, _targetMenuOpen: false, _refCountMenuOpen: false,
        } });
        studio();
      };
      setTimeout(() => document.addEventListener("mousedown", _briefDdOutsideHandler), 0);
    }
$$("[data-brief-slider]", root).forEach(s => {
      s.addEventListener("input", e => {
        const v = e.target.value;
        STE.setSession({ ...STE.getSession(), studioBrief: { ...brief, [s.getAttribute("data-brief-slider")]: +v } });
        // Update label + fill stop only (avoid full re-render on every drag tick)
        const lbl = root.querySelector(`[data-slider-out="${s.getAttribute("data-brief-slider")}"]`);
        if (lbl) lbl.textContent = v;
        s.style.setProperty("--p", v + "%");
      });
    });

    // Step 3 DNA filter settings cog — opens a modal with DNA Strictness +
    // Variant Boldness sliders. Apply commits both values and re-renders the
    // page so the pass count + score visuals reflect the new threshold.
    $$("[data-dna-settings]", root).forEach(b => b.addEventListener("click", () => {
      openDnaSettingsModal(brief, (next) => {
        const freshSess = STE.getSession() || {};
        const freshBrief = freshSess.studioBrief || brief;
        STE.setSession({
          ...freshSess,
          studioBrief: {
            ...freshBrief,
            dnaStrictness: next.dnaStrictness,
            variantBoldness: next.variantBoldness,
          },
        });
        studio();
      });
    }));

    // Step 4: pick-references gallery — click a card to toggle inclusion.
    // Selection is ordered (so badges show pick order); no cap.
    $$("[data-pick-idx]", root).forEach(el => {
      const toggle = () => {
        const idx = parseInt(el.getAttribute("data-pick-idx"));
        const cur = (brief.picks || []).slice();
        const at = cur.indexOf(idx);
        if (at >= 0) cur.splice(at, 1);
        else cur.push(idx);
        STE.setSession({ ...STE.getSession(), studioBrief: { ...brief, picks: cur } });
        studio();
      };
      el.addEventListener("click", toggle);
      el.addEventListener("keydown", (e) => {
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(); }
      });
    });
    root.querySelector("[data-pick-clear]")?.addEventListener("click", () => {
      STE.setSession({ ...STE.getSession(), studioBrief: { ...brief, picks: [] } });
      studio();
    });

    // Step 5 — variant toggle. Each variant card flips its "in lineup" state.
    // Update in place (no full re-render) so the page doesn't flash on every click.
    function syncLineupChrome(count) {
      const counterNum = $("[data-lineup-count]", root);
      if (counterNum) counterNum.textContent = String(count);
      const counter = $(".ste-studio-pick-counter", root);
      if (counter) {
        let clearBtn = counter.querySelector("[data-lineup-clear]");
        if (count > 0 && !clearBtn) {
          clearBtn = document.createElement("button");
          clearBtn.className = "ste-btn-iconlink";
          clearBtn.type = "button";
          clearBtn.setAttribute("data-lineup-clear", "");
          clearBtn.title = "Clear lineup selection";
          clearBtn.textContent = "Clear";
          clearBtn.addEventListener("click", onClear);
          counter.appendChild(clearBtn);
        } else if (count === 0 && clearBtn) {
          clearBtn.remove();
        }
      }
      const navBtn = $("[data-lineup-next]");
      if (navBtn) {
        if (count === 0) {
          navBtn.setAttribute("disabled", "");
          navBtn.setAttribute("title", "Click variants to include them in the lineup");
        } else {
          navBtn.removeAttribute("disabled");
          navBtn.removeAttribute("title");
        }
      }
    }
    function onClear() {
      const latest = STE.getSession();
      STE.setSession({ ...latest, studioBrief: { ...latest.studioBrief, lineupVariants: [] } });
      $$("[data-variant-toggle]", root).forEach(b => {
        b.classList.remove("is-included");
        const check = b.querySelector(".ste-gen-variant-check");
        if (check) check.textContent = "";
        const meta = b.querySelector(".ste-gen-variant-meta .ste-mini");
        if (meta) meta.textContent = "Excluded";
      });
      syncLineupChrome(0);
    }
    $$("[data-variant-toggle]", root).forEach(el => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const key = el.getAttribute("data-variant-toggle");
        const latest = STE.getSession();
        const cur = new Set(latest.studioBrief.lineupVariants || []);
        let nowIn;
        if (cur.has(key)) { cur.delete(key); nowIn = false; }
        else { cur.add(key); nowIn = true; }
        STE.setSession({ ...latest, studioBrief: { ...latest.studioBrief, lineupVariants: Array.from(cur) } });
        el.classList.toggle("is-included", nowIn);
        const check = el.querySelector(".ste-gen-variant-check");
        if (check) check.textContent = nowIn ? "✓" : "";
        syncLineupChrome(cur.size);
      });
    });
    $$("[data-lineup-clear]", root).forEach(b => b.addEventListener("click", onClear));

    // Step 2: source picker — preset checkboxes + custom add/remove. Each
    // mutation re-renders the step so the running image total updates.
    // Selection state is sticky — including empty (no auto-default to "all").
    $$("[data-source-key]", root).forEach(cb => {
      cb.addEventListener("change", () => {
        const key = cb.getAttribute("data-source-key");
        const cur = (brief.sources || []).slice();
        const next = cb.checked
          ? Array.from(new Set([...cur, key]))
          : cur.filter(k => k !== key);
        STE.setSession({ ...STE.getSession(), studioBrief: { ...brief, sources: next, _sourceSelectionInitialised: true } });
        studio();
      });
    });
    // Search filter on preset list
    const searchInp = root.querySelector("[data-source-search]");
    searchInp?.addEventListener("input", () => {
      STE.setSession({ ...STE.getSession(), studioBrief: { ...brief, _sourceFilter: searchInp.value } });
      studio();
      // Restore focus + caret position so typing doesn't break
      const next = document.querySelector("[data-source-search]");
      if (next) { next.focus(); next.setSelectionRange(next.value.length, next.value.length); }
    });
    // Select all / deselect all (scoped to currently-filtered visible list)
    root.querySelector("[data-source-toggle-all]")?.addEventListener("click", () => {
      const filter = (brief._sourceFilter || "").trim().toLowerCase();
      const visibleKeys = STUDIO_SOURCE_PRESETS
        .filter(s => !filter || s.label.toLowerCase().includes(filter))
        .map(s => s.key);
      const sel = (brief.sources || []).slice();
      const allChecked = visibleKeys.length > 0 && visibleKeys.every(k => sel.includes(k));
      const next = allChecked
        ? sel.filter(k => !visibleKeys.includes(k))         // deselect all visible
        : Array.from(new Set([...sel, ...visibleKeys]));    // select all visible
      STE.setSession({ ...STE.getSession(), studioBrief: { ...brief, sources: next, _sourceSelectionInitialised: true } });
      studio();
    });
    // Custom source add / remove. Each entry is { name, addedAt } so the
    // provisioning state can be derived from the time delta on every render.
    // After the provisioning period a re-render is scheduled so the row
    // automatically flips from spinner → available without user action.
    const nameInp = root.querySelector("[data-custom-name]");
    const urlInp = root.querySelector("[data-custom-url]");
    const addCustom = () => {
      const name = (nameInp?.value || "").trim();
      const url = (urlInp?.value || "").trim();
      if (!name || !url) {
        // Highlight whichever field is empty — flash a red outline briefly.
        const missing = !name ? nameInp : urlInp;
        if (missing) {
          missing.classList.add("ste-input-error");
          missing.focus();
          setTimeout(() => missing.classList.remove("ste-input-error"), 1500);
        }
        return;
      }
      const cur = (brief.customSources || []).map(c =>
        typeof c === "string" ? { name: c, addedAt: 0 } : c);
      const next = [...cur, { name, url, addedAt: Date.now() }];
      STE.setSession({ ...STE.getSession(), studioBrief: { ...brief, customSources: next, _sourceSelectionInitialised: true } });
      studio();
    };
    root.querySelector("[data-custom-add]")?.addEventListener("click", addCustom);
    nameInp?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); urlInp?.focus(); }
    });
    urlInp?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); addCustom(); }
    });
    $$("[data-custom-rm]", root).forEach(b => {
      b.addEventListener("click", (e) => {
        // Stop the click from toggling the surrounding <label>'s checkbox.
        e.preventDefault();
        e.stopPropagation();
        const i = parseInt(b.getAttribute("data-custom-rm"));
        const cur = (brief.customSources || []).map(c =>
          typeof c === "string" ? { name: c, addedAt: 0 } : c);
        // Also drop any selection that pointed at this custom source.
        const next = cur.slice();
        next.splice(i, 1);
        const droppedKey = "_c_" + i;
        const nextSel = (brief.sources || []).filter(k => k !== droppedKey);
        STE.setSession({ ...STE.getSession(), studioBrief: { ...brief, customSources: next, sources: nextSel, _sourceSelectionInitialised: true } });
        studio();
      });
    });
    // Auto-flip provisioning sources to "available" once their timer
    // elapses. Schedule a single re-render for the next-to-expire entry.
    if (step === 2) {
      const PROV_MS = 75000;
      const now = Date.now();
      const earliestExpiry = (brief.customSources || [])
        .map(c => (typeof c === "string") ? 0 : (c.addedAt || 0))
        .filter(t => t > 0)
        .map(t => t + PROV_MS - now)
        .filter(dt => dt > 0)
        .sort((a, b) => a - b)[0];
      if (earliestExpiry) {
        setTimeout(() => {
          const s = STE.getSession() || {};
          if (parseInt(s.studioStep) !== 2) return;
          studio();
        }, earliestExpiry + 80);
      }
    }

    // Streaming crawl tick — incremental DOM appends, not full re-renders.
    // Existing cards stay in place; only the NEW card(s) fade in each tick
    // via the .ste-crawl-card-in keyframe animation.
    if (step === 2 && brief._crawlState === "running" && !_crawlTickActive) {
      _crawlTickActive = true;
      const grid = root.querySelector(".ste-crawl-grid");
      const overlayText = root.querySelector("[data-crawl-overlay-text]");
      const stageEl = root.querySelector("[data-crawl-stage]");
      const crawlPctEl = root.querySelector("[data-crawl-pct]");

      const total = (window.STE_CRAWL_IMAGES || []).length || 60;
      const cards = buildCrawlCardSet(brief, total);
      const buildCardHtml = (c) => crawlCardHtml(c);

      // Build the source narrative: which source "owns" each card index.
      // Each preset contributes its `n` from STUDIO_SOURCE_PRESETS, scaled to
      // the total available card count. Customs share leftover capacity.
      const selectedKeys = brief.sources || [];
      const selPresets = STUDIO_SOURCE_PRESETS.filter(s => selectedKeys.includes(s.key));
      const selCustoms = (brief.customSources || [])
        .map((c, i) => ({ key: "_c_" + i, name: typeof c === "string" ? c : c.name, n: 25 }))
        .filter(c => selectedKeys.includes(c.key));
      const sourceList = selPresets.map(s => ({ name: s.label.split(" · ")[0], n: s.n }))
                                   .concat(selCustoms);
      const sumN = sourceList.reduce((a, s) => a + s.n, 0) || 1;
      // Map each card index 0..total to a source name based on proportional bucketing.
      const sourceForIdx = (idx) => {
        if (!sourceList.length) return null;
        let acc = 0;
        for (const s of sourceList) {
          acc += (s.n / sumN) * total;
          if (idx < acc) return s.name;
        }
        return sourceList[sourceList.length - 1].name;
      };

      // Sequential streaming: append exactly one card per tick in left-to-right
      // top-to-bottom order. No random delay — pure reading order.
      const INTERVAL = 130;  // 60 cards × 130ms ≈ 7.8s active streaming

      const tick = () => {
        const session = STE.getSession() || {};
        const liveBrief = session.studioBrief || {};
        if (parseInt(session.studioStep) !== 2 || liveBrief._crawlState !== "running") {
          _crawlTickActive = false;
          return;
        }
        const currentlyReceived = liveBrief._crawlReceived || 0;
        const nextReceived = Math.min(total, currentlyReceived + 1);
        if (grid && nextReceived > currentlyReceived) {
          const tmp = document.createElement("div");
          tmp.innerHTML = buildCardHtml(cards[currentlyReceived]);
          const el = tmp.firstElementChild;
          el.style.setProperty("--ste-card-delay", "0ms");
          grid.appendChild(el);
        }
        if (crawlPctEl) crawlPctEl.textContent = `${Math.round(nextReceived/total*100)}%`;
        if (overlayText) {
          // Phase-based messaging that maps to crawl progress.
          const p = nextReceived / total;
          let msg;
          if (p < 0.05) {
            msg = "Connecting to sources…";
          } else if (p < 0.90) {
            const src = sourceForIdx(nextReceived - 1);
            msg = src ? `Collecting from ${src}…` : `Collecting references…`;
          } else if (p < 0.98) {
            msg = "Indexing palette + composition signatures…";
          } else {
            msg = "Finalising reference set…";
          }
          if (overlayText.textContent !== msg) overlayText.textContent = msg;
        }

        const done = nextReceived >= total;
        STE.setSession({
          ...session,
          studioBrief: { ...liveBrief, _crawlReceived: nextReceived, _crawlState: done ? "complete" : "running" },
        });
        if (done) {
          _crawlTickActive = false;
          // Mark stage complete so the overlay fades out, then re-render.
          if (stageEl) {
            stageEl.classList.remove("is-running");
            stageEl.classList.add("is-complete");
          }
          setTimeout(() => studio(), 1100);
        } else {
          setTimeout(tick, INTERVAL);
        }
      };
      setTimeout(tick, INTERVAL);
    }

    // Step 3 DNA scan — drives the full phased transition without re-rendering.
    // Phases inside the same DOM:
    //   (a) scanning      — aura visible, pillar text cycles, mid-scan dim
    //   (b) reveal        — aura fades out, ✓/FILTERED badges fade in
    //   (c) fadeout       — filtered cards fade + shrink
    //   (d) reflow (FLIP) — remaining cards translate to new grid positions
    //   (e) finalize      — set _dnaState="complete" and re-render the page
    //                       (only passing cards + summary now)
    if (step === 3 && brief._dnaState === "scanning" && !_dnaTickActive) {
      _dnaTickActive = true;
      const DURATION = 9000; // ms — ~150ms per card cursor advance
      const start = Date.now();
      const pillarOut = root.querySelector("[data-dna-pillar]");
      const stageEl = root.querySelector("[data-dna-stage]");
      const gridEl = root.querySelector("[data-dna-grid]");
      const captionEl = root.querySelector(".ste-dna-caption");
      const auraEl = root.querySelector(".ste-dna-aura");
      const dnaProgressFill = root.querySelector("[data-dna-progress-fill]");
      const dnaStatusEl = root.querySelector("[data-dna-status]");
      const dnaPctEl = root.querySelector("[data-dna-pct]");
      const PILLAR_LABELS = [
        "P1 Italian Tennis Heritage",
        "P2 Elegant Functionalism",
        "P3 Court-to-Social Lifestyle",
        "P4 Body-Lined Silhouette",
        "P5 Quiet Performance",
      ];
      let gradeCursor = 0;
      const cardElList = gridEl ? Array.from(gridEl.querySelectorAll(".ste-crawl-card")) : [];

      // Sequential dimming — walk through cards in render order; filter-out
      // cards transition to dimmed one at a time as the AI "reaches" them.
      // Pass cards are skipped (no per-card visual). The CSS transition on
      // .is-filtering gives each dim a smooth ~650ms fade so dimming looks
      // organic rather than instant.
      const dimRemainingFiltered = () => {
        // Safety net: any card the cursor didn't reach (e.g. timer drift)
        // still gets its verdict applied so the visual state is consistent.
        cardElList.forEach(el => {
          if (el.getAttribute("data-pass") === "false") el.classList.add("is-filtering");
          else el.classList.add("is-passed");
        });
      };

      const runReflow = () => {
        if (!gridEl) return;
        const cardEls = Array.from(gridEl.querySelectorAll(".ste-crawl-card"));
        const passEls = cardEls.filter(el => el.getAttribute("data-pass") === "true");
        const failEls = cardEls.filter(el => el.getAttribute("data-pass") === "false");

        // 1. Capture OLD positions for pass cards (before any layout change)
        const oldRects = new Map();
        passEls.forEach(el => oldRects.set(el, el.getBoundingClientRect()));

        // 2. Fade + shrink the filtered cards (they're still in layout)
        failEls.forEach(el => el.classList.add("is-removing"));

        // 3. After fade-out, pull filtered cards from layout
        setTimeout(() => {
          failEls.forEach(el => { el.style.display = "none"; });

          // 4. Measure new positions; for each pass card, compute delta + apply
          //    inverse transform instantly (no transition), then animate back
          //    to identity. Canonical FLIP with double-rAF: rAF#1 commits the
          //    inverse transform with transition:none, rAF#2 enables the
          //    transition, rAF#3 clears the transform → animates over 2.2s.
          requestAnimationFrame(() => {
            const transforms = passEls.map(el => {
              const oldRect = oldRects.get(el);
              const newRect = el.getBoundingClientRect();
              return { el, dx: oldRect.left - newRect.left, dy: oldRect.top - newRect.top };
            });
            transforms.forEach(({ el, dx, dy }) => {
              if (dx !== 0 || dy !== 0) {
                el.style.transition = "none";
                el.style.transform = `translate(${dx}px, ${dy}px)`;
              }
            });
            void gridEl.offsetHeight;
            requestAnimationFrame(() => {
              // Enable transition in this frame, but don't clear transform yet.
              transforms.forEach(({ el }) => {
                el.classList.add("is-reflowing");
                el.style.transition = "transform 1.6s cubic-bezier(0.22, 1, 0.36, 1)";
              });
              void gridEl.offsetHeight;
              requestAnimationFrame(() => {
                // Now clear transform → browser animates over the 2.2s transition.
                transforms.forEach(({ el }) => {
                  el.style.transform = "";
                });
                // 5. After reflow finishes, jump straight to Step 4 (Pick
                //    References). The same passing cards become selectable —
                //    user clicks to choose images for generation, then submits
                //    using the brand guide.
                setTimeout(() => {
                  passEls.forEach(el => {
                    el.classList.remove("is-reflowing");
                    el.style.transform = "";
                  });
                  const sess = STE.getSession() || {};
                  const lb = sess.studioBrief || {};
                  STE.setSession({
                    ...sess,
                    studioStep: 4,
                    // Fresh DNA result → fresh picks. The Step 2→3 transition
                    // already cleared picks, but reaffirm here for safety.
                    studioBrief: { ...lb, _dnaState: "complete", picks: [] },
                  });
                  studio();
                }, 1800);
              });
            });
          });
        }, 380);
      };

      const tick = () => {
        const session = STE.getSession() || {};
        const liveBrief = session.studioBrief || {};
        if (parseInt(session.studioStep) !== 3 || liveBrief._dnaState !== "scanning") {
          _dnaTickActive = false;
          return;
        }
        const dt = Date.now() - start;
        const p = Math.min(1, dt / DURATION);
        if (pillarOut) {
          const idx = Math.min(PILLAR_LABELS.length - 1, Math.floor(p * PILLAR_LABELS.length));
          if (pillarOut.textContent !== PILLAR_LABELS[idx]) pillarOut.textContent = PILLAR_LABELS[idx];
        }
        if (dnaProgressFill) {
          dnaProgressFill.style.width = (p * 100).toFixed(1) + "%";
        }
        if (dnaPctEl) {
          dnaPctEl.textContent = `${Math.round(p * 100)}%`;
        }
        // Advance through cards in render order; give each card its verdict
        // as the cursor reaches it: pass → ✓ checkmark fades in, fail → starts
        // dimming. Pass cards stay normal otherwise (not dimmed).
        const GRADING_SPAN = 0.92;
        const target = Math.floor(Math.min(1, p / GRADING_SPAN) * cardElList.length);
        while (gradeCursor < target && gradeCursor < cardElList.length) {
          const el = cardElList[gradeCursor];
          if (el.getAttribute("data-pass") === "false") el.classList.add("is-filtering");
          else el.classList.add("is-passed");
          gradeCursor++;
        }
        if (p < 1) {
          requestAnimationFrame(tick);
          return;
        }
        // Scan complete — reveal phase (no re-render):
        //   - aura fades, badges fade in
        //   - then ~700ms later, reflow
        _dnaTickActive = false;
        dimRemainingFiltered();
        if (stageEl) {
          stageEl.classList.remove("is-scanning");
          stageEl.classList.add("is-complete");
        }
        setTimeout(runReflow, 850);
      };
      requestAnimationFrame(tick);
    }

    // Step 6 fade-in finisher — the Step 5 → 6 transition adds
    // ._lineupFadeIn to the brief and renders the gen list at opacity 0.
    // After the fade-in animation has played, clear the flag so any later
    // re-render of Step 6 (back/forward, share modal close, etc.) doesn't
    // replay the animation unprompted.
    if (step === 6 && brief._lineupFadeIn) {
      setTimeout(() => {
        const s = STE.getSession() || {};
        const lb = s.studioBrief || {};
        if (lb._lineupFadeIn) {
          const { _lineupFadeIn, ...rest } = lb;
          STE.setSession({ ...s, studioBrief: rest });
        }
      }, 1200);
    }

    // Step 5 generation tick — the picked cards morph their images via a
    // staggered fade. We wait for all stagger + per-card animation time to
    // elapse, then flip _genState to "complete" so the page reflects the
    // final variant state.
    if (step === 5 && brief._genState === "generating" && !_genTickActive) {
      _genTickActive = true;
      const picks = brief.picks || [];
      // Stagger 160ms per card + 1600ms per-card animation + small buffer.
      const totalMs = (Math.max(1, picks.length) - 1) * 160 + 1600 + 300;
      const genStart = Date.now();
      const genPctEl = root.querySelector("[data-gen-pct]");
      // Update the inline % next to the H2 every 80ms.
      const pctTimer = setInterval(() => {
        const sess2 = STE.getSession() || {};
        if (parseInt(sess2.studioStep) !== 5 || (sess2.studioBrief || {})._genState !== "generating") {
          clearInterval(pctTimer);
          return;
        }
        const elapsed = Date.now() - genStart;
        const p = Math.min(1, elapsed / totalMs);
        if (genPctEl) genPctEl.textContent = `${Math.round(p * 100)}%`;
        if (p >= 1) clearInterval(pctTimer);
      }, 80);
      setTimeout(() => {
        const sess = STE.getSession() || {};
        const lb = sess.studioBrief || {};
        _genTickActive = false;
        clearInterval(pctTimer);
        if (parseInt(sess.studioStep) !== 5) return;
        STE.setSession({ ...sess, studioBrief: { ...lb, _genState: "complete" } });
        studio();
      }, totalMs);
    }
  }

  function renderStudioStep(step, brief) {
    if (step === 1) {
      return `
        <div class="ste-studio-card">
          <div class="ste-studio-card-hd">
            <div class="ste-mini">STEP 1 · BRIEF</div>
            <h2>Season Design Brief</h2>
            <p>Define this season's context. The AI uses this brief to crawl trends and refine them against ST DNA.</p>
          </div>
          <div class="ste-studio-brief-stack">
            <div class="ste-studio-brief-context">
              ${nativeSelect("SEASON", "season", studioSeasonOptions(), brief.season)}
              ${segmentedControl("TARGET", "target", STUDIO_TARGETS, brief.target)}
              ${segmentedControl("REFERENCE COUNT", "refCount", STUDIO_REF_COUNTS, brief.refCount)}
            </div>
            ${chipMultiDropdown("CATEGORIES", "items", itemGroupsForTarget(brief.target), brief.items || (brief.item ? [brief.item] : []), brief._itemsMenuOpen)}
          </div>
        </div>`;
    }
    if (step === 2 && (brief._crawlState === "running" || brief._crawlState === "complete")) {
      // In-page streaming crawl — Tacchini-style. Uses real crawled product
      // images from window.STE_CRAWL_IMAGES (60 entries, brand/category/name).
      const selectedKeys = brief.sources || [];
      const presetsForCrawl = STUDIO_SOURCE_PRESETS.filter(s => selectedKeys.includes(s.key));
      // Custom sources that finished provisioning + are selected get crawled too.
      const customForCrawl = (brief.customSources || [])
        .map((c, i) => ({ name: typeof c === "string" ? c : c.name, key: "_c_" + i }))
        .filter(c => selectedKeys.includes(c.key));
      const allSources = presetsForCrawl.concat(customForCrawl.map(c => ({ label: c.name + " · custom", n: 25 })));
      const total = (window.STE_CRAWL_IMAGES || []).length || 60;
      const received = brief._crawlState === "complete" ? total : (brief._crawlReceived || 0);
      const briefLabel = `${brief.season || ''} ${brief.item || ''}`.trim() || "Reference set";
      const cards = buildCrawlCardSet(brief, total);
      const visibleCards = cards.slice(0, received);

      return `
        <div class="ste-studio-card">
          <div class="ste-studio-card-hd">
            <div class="ste-mini">STEP 2 · CRAWL</div>
            <h2>${brief._crawlState === "complete"
              ? "Trend Crawl Complete"
              : `Crawling Market &amp; Trend Images <span class="ste-pct" data-crawl-pct>${Math.round(received/total*100)}%</span>`}</h2>
            <p>${brief._crawlState === "complete"
              ? `<strong>${total}</strong> reference${total===1?'':'s'} from <strong>${allSources.length}</strong> source${allSources.length===1?'':'s'} ready · pulled for <strong>${escape(briefLabel)}</strong>. Proceed to the DNA filter to score against the 5 pillars.`
              : `Pulling references from <strong>${allSources.length}</strong> source${allSources.length===1?'':'s'} for <strong>${escape(briefLabel)}</strong>…`}</p>
          </div>

          <div class="ste-crawl-stage ${brief._crawlState === 'complete' ? 'is-complete' : 'is-running'}" data-crawl-stage>
            <div class="ste-crawl-grid">
              ${visibleCards.map(c => crawlCardHtml(c)).join("")}
            </div>
          </div>
        </div>`;
    }

    if (step === 2) {
      // Source library — registry of crawlable references. Each preset has a
      // brand name + descriptor (split on " · ") and an image count. User can
      // add a custom source which auto-provisions over ~2.5s: it appears in
      // the list dimmed with a spinner, then becomes selectable.
      const SOURCE_PRESETS = STUDIO_SOURCE_PRESETS;
      const filter = (brief._sourceFilter || "").trim().toLowerCase();
      const visiblePresets = SOURCE_PRESETS.filter(s => !filter || s.label.toLowerCase().includes(filter));
      const selected = brief.sources || [];
      // Normalize custom sources: accept legacy string[] or new {name, addedAt}[].
      const rawCustom = brief.customSources || [];
      const customs = rawCustom.map((c, i) => typeof c === "string"
        ? { name: c, url: "", addedAt: 0, idx: i }
        : { name: c.name, url: c.url || "", addedAt: c.addedAt || 0, idx: i });
      const PROV_MS = 75000;
      const now = Date.now();
      const customsResolved = customs.map(c => {
        const remaining = c.addedAt + PROV_MS - now;
        return { ...c, provisioning: remaining > 0, remaining };
      });
      const visibleCustoms = customsResolved.filter(c =>
        !filter || c.name.toLowerCase().includes(filter));

      // Image count for crawl summary: presets + available customs (~25 each).
      const totalImages =
        SOURCE_PRESETS.filter(s => selected.includes(s.key)).reduce((a, s) => a + s.n, 0)
        + customsResolved.filter(c => !c.provisioning && selected.includes("_c_" + c.idx)).length * 25;

      const allRowKeys = visiblePresets.map(s => s.key).concat(
        customsResolved.filter(c => !c.provisioning).map(c => "_c_" + c.idx));
      const allRowsSelected = allRowKeys.length > 0 && allRowKeys.every(k => selected.includes(k));
      const totalSourcesCount = SOURCE_PRESETS.length + customsResolved.filter(c => !c.provisioning).length;

      const initialOf = (name) => (name || "?").trim().charAt(0).toUpperCase() || "?";

      // Row renderer — used for both presets and available customs so layout
      // stays consistent. Presets pass the key + image count; customs use the
      // synthetic "_c_<idx>" key and a fixed "~25 imgs" estimate.
      const renderRow = ({ key, name, desc, count, isCustom, customIdx }) => {
        const isSel = selected.includes(key);
        return `
          <label class="ste-source-row ${isSel ? 'is-selected' : ''} ${isCustom ? 'is-custom' : ''}">
            <input type="checkbox" class="ste-source-row-check" data-source-key="${escape(key)}" ${isSel ? 'checked' : ''}>
            <span class="ste-source-row-avatar" aria-hidden="true">${escape(initialOf(name))}</span>
            <span class="ste-source-row-main">
              <span class="ste-source-row-name">${escape(name)}</span>
              ${desc ? `<span class="ste-source-row-desc">${escape(desc)}</span>` : ''}
            </span>
            ${isCustom ? `<span class="ste-source-row-tag">Custom</span>` : ''}
            <span class="ste-source-row-count">${count}</span>
            <span class="ste-source-row-tick" aria-hidden="true">✓</span>
            ${isCustom ? `<button type="button" class="ste-source-row-rm" data-custom-rm="${customIdx}" aria-label="Remove">×</button>` : ''}
          </label>`;
      };
      const renderProvisioningRow = (c) => `
        <div class="ste-source-row is-provisioning is-custom" data-custom-idx="${c.idx}">
          <span class="ste-source-row-spinner" aria-hidden="true"></span>
          <span class="ste-source-row-avatar is-pending" aria-hidden="true">${escape(initialOf(c.name))}</span>
          <span class="ste-source-row-main">
            <span class="ste-source-row-name">${escape(c.name)}</span>
            <span class="ste-source-row-desc">Processing — adding source imagery to your library…</span>
          </span>
          <span class="ste-source-row-tag">Custom</span>
          <span class="ste-source-row-count">—</span>
          <button type="button" class="ste-source-row-rm" data-custom-rm="${c.idx}" aria-label="Cancel">×</button>
        </div>`;

      const presetRows = visiblePresets.map(s => {
        const [brandName, ...descParts] = s.label.split(" · ");
        return renderRow({
          key: s.key,
          name: brandName,
          desc: descParts.join(" · "),
          count: `${s.n}`,
          isCustom: false,
        });
      }).join("");

      const customRows = visibleCustoms.map(c => c.provisioning
        ? renderProvisioningRow(c)
        : renderRow({
            key: "_c_" + c.idx,
            name: c.name,
            desc: c.url ? c.url.replace(/^https?:\/\//, "") : "Custom source · indexed",
            count: "~",
            isCustom: true,
            customIdx: c.idx,
          })
      ).join("");

      const empty = visiblePresets.length === 0 && visibleCustoms.length === 0;

      // Compact recap of what the designer chose in Step 1.
      const recapItems = [
        ["SEASON",          brief.season || "—"],
        ["TARGET",          brief.target || "—"],
        ["CATEGORY",        brief.item || "—"],
        ["REF COUNT",       String(brief.refCount || "—")],
        ["DNA STRICTNESS",  (brief.dnaStrictness ?? "—") + "%"],
        ["VARIANT BOLDNESS",(brief.variantBoldness ?? "—") + "%"],
      ];

      return `
        <div class="ste-studio-card">
          <div class="ste-studio-card-hd">
            <div class="ste-mini">STEP 2 · SELECT SOURCES</div>
            <h2>Pick which sources to crawl</h2>
            <div class="ste-brief-recap">
              ${recapItems.map(([k,v]) => `
                <span class="ste-brief-chip">
                  <em>${escape(k)}</em>
                  <strong>${escape(v)}</strong>
                </span>`).join("")}
            </div>
          </div>

          <div class="ste-source-panel">
            <div class="ste-source-panel-toolbar">
              <input class="ste-input ste-source-search" type="search" data-source-search value="${escape(brief._sourceFilter || '')}" placeholder="Search sources…">
              <button class="ste-btn ste-btn-ghost ste-btn-mini" type="button" data-source-toggle-all>${allRowsSelected ? 'Deselect all' : 'Select all'}</button>
              <span class="ste-mini ste-source-panel-count"><strong>${selected.length}</strong>&nbsp;/ ${totalSourcesCount}&nbsp;selected</span>
            </div>

            <div class="ste-source-list" data-source-list>
              ${empty
                ? `<div class="ste-source-list-empty">No sources match "${escape(filter)}".</div>`
                : presetRows + customRows}
            </div>

            <div class="ste-source-add">
              <span class="ste-source-add-plus" aria-hidden="true">+</span>
              <div class="ste-source-add-fields ste-source-add-fields-inline">
                <input class="ste-input ste-source-add-input ste-source-add-name" type="text" data-custom-name placeholder="Source name (e.g. Diadora Heritage)">
                <input class="ste-input ste-source-add-input ste-source-add-url" type="text" data-custom-url placeholder="Enter URL (Example: www.fnf.co.kr)">
              </div>
              <button class="ste-btn ste-btn-ghost" data-custom-add type="button">Add</button>
            </div>
          </div>
        </div>`;
    }
    if (step === 3) {
      // Reuse the exact crawl grid from Step 2 (same DOM shape, same cards) and
      // overlay a soft pastel-light aura on top while the AI scores each card
      // against the 5 ST DNA pillars. Cards never re-animate (.is-static), so
      // the grid feels continuous from Step 2.
      //
      // Phases (driven by the post-render tick + DOM-level animations, NOT by
      // re-renders):
      //   1. scanning      — aura visible, all cards present, mid-scan dim
      //   2. (DOM ops)     — aura fades, ✓ / FILTERED badges fade in
      //   3. (DOM ops)     — filtered cards fade out
      //   4. (FLIP reflow) — remaining cards animate to new grid positions
      //   5. complete      — re-render with only passing cards + pillar summary
      const total = (window.STE_CRAWL_IMAGES || []).length || 60;
      const cards = buildCrawlCardSet(brief, total);
      const dnaState = brief._dnaState || "scanning";
      const passRate = Math.max(0.20, 1 - (brief.dnaStrictness || 70) / 200);
      // A few hand-picked non-featured slots in the first row always fail so
      // the designer sees the filter visibly remove items on the top row
      // (where their eye lands first). Featured cards sit at 2/6/10/14, so
      // these positions sit between them and never collide with the demo
      // references. Without this, the hash-based pass calc sometimes leaves
      // the first row completely intact and the filter looks like a no-op.
      const LEAD_ROW_FAILS = new Set([1, 4, 9, 12]);
      const passes = cards.map((c, i) => {
        // Featured (real-variant) demo references always pass — they're the
        // four cards the wizard needs to keep visible for the generation step.
        if (c.featured) return true;
        if (LEAD_ROW_FAILS.has(i)) return false;
        const seed = (c.brand + c.name + i).split("").reduce((a, ch) => a + ch.charCodeAt(0), 0);
        return ((seed % 100) / 100) < passRate;
      });
      const passCount = passes.filter(Boolean).length;
      const briefLabel = `${brief.season || ''} ${brief.item || ''}`.trim() || "Reference set";

      // In "complete" state, only render the cards that passed; during
      // scanning render everything in deck order (the tick handler does
      // class toggles to dim / remove filtered ones). Render order matches
      // the order the cards appeared in during the crawl in Step 2.
      const cardsForRender = dnaState === "complete"
        ? cards.map((c, i) => ({ c, i })).filter(({ i }) => passes[i])
        : cards.map((c, i) => ({ c, i }));

      return `
        <div class="ste-studio-card">
          <div class="ste-studio-card-hd ste-studio-card-hd-cog">
            <div>
              <div class="ste-mini">STEP 3 · DNA FILTER</div>
              <h2>${dnaState === "complete"
                ? "DNA Filter Complete"
                : `Applying DNA Filter <span class="ste-pct" data-dna-pct>0%</span>`}</h2>
              <p>${dnaState === "complete"
                ? `<strong>${passCount}</strong> of <strong>${total}</strong> references passed the 5-pillar filter at DNA strictness <strong>${brief.dnaStrictness}%</strong>. Proceed to pick your final references.`
                : `Scoring <strong>${total}</strong> references against <strong>P1–P5</strong> at DNA strictness <strong>${brief.dnaStrictness}%</strong> · matching <strong>${escape(briefLabel)}</strong>.`}</p>
            </div>
            ${dnaState === "complete" ? `<button type="button" class="ste-btn ste-btn-ghost ste-dna-settings-btn" data-dna-settings aria-label="DNA filter settings" title="Adjust DNA strictness and variant boldness">
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" style="vertical-align:-3px;margin-right:6px"><path fill="currentColor" d="M19.43 12.98c.04-.32.07-.65.07-.98s-.03-.66-.07-.98l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.03 7.03 0 0 0-1.69-.98l-.38-2.65A.5.5 0 0 0 14 2h-4a.5.5 0 0 0-.5.42l-.38 2.65c-.61.24-1.18.57-1.69.98l-2.49-1a.5.5 0 0 0-.61.22l-2 3.46a.5.5 0 0 0 .12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98L2.46 14.63a.5.5 0 0 0-.12.64l2 3.46c.14.24.43.34.69.22l2.49-1c.51.41 1.08.74 1.69.98l.38 2.65c.05.24.26.42.5.42h4c.24 0 .45-.18.5-.42l.38-2.65c.61-.24 1.18-.57 1.69-.98l2.49 1c.26.12.55.02.69-.22l2-3.46a.5.5 0 0 0-.12-.64l-2.11-1.65zM12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5z"/></svg>Settings
            </button>` : ''}
          </div>

          <div class="ste-dna-stage ${dnaState === "scanning" ? "is-scanning" : "is-complete"}" data-dna-stage>
            <div class="ste-crawl-grid" data-dna-grid>
              ${cardsForRender.map(({ c, i }) => {
                const ok = passes[i];
                return `
                  <div class="ste-crawl-card is-static ${c.featured ? 'is-recommended' : ''}" data-pass="${ok}" data-card-idx="${i}">
                    <div class="ste-crawl-thumb-wrap">
                      <img class="ste-crawl-img" src="${escape(c.file)}" alt="${escape(c.name)}" loading="lazy">
                      <span class="ste-crawl-grade">${c.grade}</span>
                      <span class="ste-crawl-brand">${escape(c.brand)}</span>
                      ${c.featured ? `<span class="ste-crawl-reco" aria-label="Recommended for this brief" title="Recommended for this brief"><svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path d="M8 1.5l1.94 4.13 4.56.55-3.36 3.12.86 4.5L8 11.6l-4 2.2.86-4.5L1.5 6.18l4.56-.55z" fill="currentColor"/></svg></span>` : ''}
                      <span class="ste-dna-pass-badge" aria-label="Pass">✓</span>
                      <span class="ste-dna-fail-badge" aria-label="Filtered">FILTERED</span>
                    </div>
                    <div class="ste-crawl-meta">
                      <strong>${escape(c.category)}</strong>
                      <span class="ste-mini">${escape(c.brand)}</span>
                    </div>
                  </div>`;
              }).join("")}
            </div>

            ${dnaState === "scanning" ? `
              <div class="ste-dna-aura" aria-hidden="true">
                <span class="ste-dna-blob blob-blue"></span>
                <span class="ste-dna-blob blob-cyan"></span>
                <span class="ste-dna-blob blob-pink"></span>
                <span class="ste-dna-blob blob-peach"></span>
                <span class="ste-dna-sheen sheen-1"></span>
                <span class="ste-dna-sheen sheen-2"></span>
                <span class="ste-dna-glow"></span>
              </div>
` : ``}
          </div>

        </div>`;
    }
    if (step === 4) {
      // Step 4 reuses the DNA-passing cards as a selectable gallery. The same
      // deterministic pass calculation from Step 3 gives us the candidate set
      // without needing to thread state through.
      const total = (window.STE_CRAWL_IMAGES || []).length || 60;
      const cards = buildCrawlCardSet(brief, total);
      const passRate = Math.max(0.20, 1 - (brief.dnaStrictness || 70) / 200);
      // A few hand-picked non-featured slots in the first row always fail so
      // the designer sees the filter visibly remove items on the top row
      // (where their eye lands first). Featured cards sit at 2/6/10/14, so
      // these positions sit between them and never collide with the demo
      // references. Without this, the hash-based pass calc sometimes leaves
      // the first row completely intact and the filter looks like a no-op.
      const LEAD_ROW_FAILS = new Set([1, 4, 9, 12]);
      const passes = cards.map((c, i) => {
        // Featured (real-variant) demo references always pass — they're the
        // four cards the wizard needs to keep visible for the generation step.
        if (c.featured) return true;
        if (LEAD_ROW_FAILS.has(i)) return false;
        const seed = (c.brand + c.name + i).split("").reduce((a, ch) => a + ch.charCodeAt(0), 0);
        return ((seed % 100) / 100) < passRate;
      });
      const passing = cards.map((c, i) => ({ c, i })).filter(({ i }) => passes[i]);
      const picks = brief.picks || [];
      const pickedSet = new Set(picks);

      return `
        <div class="ste-studio-card">
          <div class="ste-studio-card-hd ste-studio-card-hd-row">
            <div class="ste-studio-card-hd-text">
              <div class="ste-mini">STEP 4 · PICK REFERENCES</div>
              <h2>Pick Reference Images</h2>
              <p>Click the references closest to your design direction. Your selection feeds the next step — the AI generates concepts using these picks + the ST Brand Guide as grading context.</p>
            </div>
            <div class="ste-studio-pick-counter">
              <span class="ste-studio-pick-num"><strong>${picks.length}</strong></span>
              <span class="ste-studio-pick-lbl">Selected</span>
              ${picks.length ? `<button class="ste-btn-iconlink" data-pick-clear type="button" title="Clear selection">Clear</button>` : ''}
            </div>
          </div>

          <div class="ste-crawl-grid ste-pick-grid" data-pick-grid>
            ${passing.map(({ c, i }) => {
              const isSel = pickedSet.has(i);
              const ord = isSel ? picks.indexOf(i) + 1 : null;
              return `
                <div class="ste-crawl-card is-static ${isSel ? 'is-picked' : ''} ${c.featured ? 'is-recommended' : ''}" data-pick-idx="${i}" role="button" tabindex="0" aria-pressed="${isSel}">
                  <div class="ste-crawl-thumb-wrap">
                    <img class="ste-crawl-img" src="${escape(c.file)}" alt="${escape(c.name)}" loading="lazy">
                    <span class="ste-crawl-grade">${c.grade}</span>
                    <span class="ste-crawl-brand">${escape(c.brand)}</span>
                    ${c.featured ? `<span class="ste-crawl-reco" aria-label="Recommended for this brief" title="Recommended for this brief"><svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path d="M8 1.5l1.94 4.13 4.56.55-3.36 3.12.86 4.5L8 11.6l-4 2.2.86-4.5L1.5 6.18l4.56-.55z" fill="currentColor"/></svg></span>` : ''}
                    ${isSel ? `<span class="ste-pick-badge">${ord}</span>` : `<span class="ste-pick-add">+</span>`}
                  </div>
                  <div class="ste-crawl-meta">
                    <strong>${escape(c.category)}</strong>
                    <span class="ste-mini">${escape(c.brand)}</span>
                  </div>
                </div>`;
            }).join("")}
          </div>
        </div>`;
    }
    if (step === 5) {
      // Step 5 keeps the picked cards from Step 4 in their grid positions and
      // morphs each card's image from the original reference to an AI-generated
      // Step 5 — three variants per pick. Featured references (Polo / Skirt /
      // Shorts / Outer originals) come with three real variant images bundled
      // in assets/generator/; everything else falls back to deterministic
      // crawl-image stand-ins so the gen grid stays full.
      const picks = brief.picks || [];
      const total = (window.STE_CRAWL_IMAGES || []).length || 60;
      const cards = buildCrawlCardSet(brief, total);
      // Order generated rows by GRID position (idx ascending), not click
      // order. The designer sees the references reading top-left to bottom-
      // right exactly as they were arranged on the pick grid, regardless of
      // which one they clicked first.
      const pickedItems = picks
        .slice()
        .sort((a, b) => a - b)
        .map(i => ({ orig: cards[i], idx: i }))
        .filter(x => x.orig);
      const genState = brief._genState || "generating";
      const isComplete = genState === "complete";
      const variantsFor = (pick) => {
        if (pick.orig.variants && pick.orig.variants.length) return pick.orig.variants.slice(0, 3);
        const total = cards.length;
        return [17, 34, 51].map(off => cards[(pick.idx + off) % total]?.file).filter(Boolean);
      };
      // Lineup starts EMPTY — the designer explicitly clicks each variant
      // they want in the final lineup. We initialise to [] on first reach
      // of Step 5 "complete" so the variant cards render as not-included
      // (grayscaled / dimmed) and the designer picks intentionally.
      if (isComplete && brief.lineupVariants == null) {
        setTimeout(() => {
          const s = STE.getSession() || {};
          const lb = s.studioBrief || {};
          if (lb.lineupVariants == null) {
            STE.setSession({ ...s, studioBrief: { ...lb, lineupVariants: [] } });
            studio();
          }
        }, 0);
      }
      const lineupSet = new Set(brief.lineupVariants || []);
      const lineupCount = lineupSet.size;
      const variantCount = pickedItems.reduce((s, p) => s + variantsFor(p).length, 0);

      return `
        <div class="ste-studio-card">
          <div class="ste-studio-card-hd ste-studio-card-hd-row">
            <div class="ste-studio-card-hd-text">
              <div class="ste-mini">STEP 5 · GENERATE</div>
              <h2>${isComplete
                ? "Variants Generated — Pick for Lineup"
                : `Generating Variants <span class="ste-pct" data-gen-pct>0%</span>`}</h2>
              <p>${isComplete
                ? `<strong>${variantCount}</strong> variants ready (3 per reference). Click each variant to include or exclude from the final lineup.`
                : `Transforming <strong>${pickedItems.length}</strong> references into <strong>${pickedItems.length * 3}</strong> variants — applying ST Brand Guide as creative direction…`}</p>
            </div>
            ${isComplete ? `
              <div class="ste-studio-pick-counter">
                <span class="ste-studio-pick-num"><strong data-lineup-count>${lineupCount}</strong></span>
                <span class="ste-studio-pick-lbl">In Lineup</span>
                ${lineupCount ? `<button class="ste-btn-iconlink" data-lineup-clear type="button" title="Clear lineup selection">Clear</button>` : ''}
              </div>
            ` : ''}
          </div>

          <div class="ste-gen-list" data-gen-grid>
            ${pickedItems.map(({ orig, idx }, n) => {
              const variants = variantsFor({ orig, idx });
              return `
                <div class="ste-gen-pick-row ${isComplete ? 'is-generated' : 'is-generating'}" style="--gen-delay: ${n * 160}ms">
                  <div class="ste-gen-orig">
                    <div class="ste-mini ste-gen-orig-lbl">REFERENCE</div>
                    <div class="ste-crawl-thumb-wrap ste-gen-orig-thumb">
                      <img class="ste-crawl-img" src="${escape(orig.file)}" alt="${escape(orig.name)}" loading="lazy">
                    </div>
                    <div class="ste-gen-orig-meta">
                      <strong>${escape(orig.category)}</strong>
                      <span class="ste-mini">${escape(orig.brand)}</span>
                    </div>
                  </div>
                  <div class="ste-gen-variants">
                    ${isComplete ? '' : `<div class="ste-mini ste-gen-variants-lbl">GENERATING…</div>`}
                    <div class="ste-gen-variants-grid">
                      ${variants.map((file, vi) => {
                        const key = `${idx}_${vi}`;
                        const inLineup = lineupSet.has(key);
                        return `
                          <button type="button" class="ste-gen-variant-card ${isComplete ? 'is-ready' : 'is-loading'} ${inLineup ? 'is-included' : ''}" data-variant-toggle="${escape(key)}" ${!isComplete ? 'disabled' : ''} style="--gen-delay: ${(n * 160) + (vi * 80)}ms">
                            <div class="ste-crawl-thumb-wrap">
                              <img class="ste-crawl-img" src="${escape(file)}" alt="variant ${vi+1}" loading="lazy">
                              ${isComplete ? `<span class="ste-gen-variant-check">${inLineup ? '✓' : ''}</span>` : ''}
                            </div>
                          </button>`;
                      }).join("")}
                    </div>
                  </div>
                </div>`;
            }).join("")}
          </div>

        </div>`;
    }
    if (step === 6) {
      // Step 6 — only the variants the user kept in the lineup show up here.
      // Variants are keyed `${pickIdx}_${variantNum}`; we reconstruct the
      // image path the same way Step 5 derived it.
      const lineupPicks = brief.picks || [];
      const totalLib = (window.STE_CRAWL_IMAGES || []).length || 60;
      const allCards = buildCrawlCardSet(brief, totalLib);
      const variantsFor = (idx) => {
        const orig = allCards[idx];
        if (!orig) return [];
        if (orig.variants && orig.variants.length) return orig.variants.slice(0, 3);
        return [17, 34, 51].map(off => allCards[(idx + off) % totalLib]?.file).filter(Boolean);
      };
      const lineupSet = new Set(brief.lineupVariants || []);
      const CONCEPT_NAMES = ["ACE", "BAGEL", "NET", "ARCHIVIO", "CHALLENGE", "VOLLEY", "BREAK", "SLICE", "RALLY", "SMASH", "RETURN", "DROP", "LOB", "TOSS"];
      // Group kept variants by their reference (idx). References with no
      // kept variants drop out entirely. Order by grid position so the
      // lineup reads top-left to bottom-right like the pick grid did.
      let conceptN = 0;
      const groups = lineupPicks
        .slice()
        .sort((a, b) => a - b)
        .map(idx => {
          const orig = allCards[idx];
          if (!orig) return null;
          const kept = variantsFor(idx)
            .map((file, vi) => ({ file, vi }))
            .filter(({ vi }) => lineupSet.has(`${idx}_${vi}`));
          if (!kept.length) return null;
          return {
            orig,
            idx,
            variants: kept.map(({ file, vi }) => {
              const n = conceptN++;
              return {
                file,
                variantNum: vi + 1,
                name: CONCEPT_NAMES[n % CONCEPT_NAMES.length] + (n >= CONCEPT_NAMES.length ? `-${Math.floor(n/CONCEPT_NAMES.length)+1}` : ""),
                num: n + 1,
                skus: 3 + (n % 3),
              };
            }),
          };
        })
        .filter(Boolean);
      const conceptCount = groups.reduce((s, g) => s + g.variants.length, 0);

      return `
        <div class="ste-studio-card">
          <div class="ste-studio-card-hd ste-studio-card-hd-row">
            <div class="ste-studio-card-hd-text">
              <div class="ste-mini">STEP 6 · LINEUP</div>
              <h2>Final Lineup · ${escape(brief.season)} ${escape(brief.item)}</h2>
              <p>${conceptCount === 0
                ? `No variants selected for the lineup yet. Go back to Step 5 and tick the variants you want to include.`
                : `<strong>${conceptCount}</strong> variant${conceptCount===1?'':'s'} across <strong>${groups.length}</strong> reference${groups.length===1?'':'s'}. Push them to the Inspector queue to move into the licensee review flow.`}</p>
            </div>
            <div class="ste-studio-pick-counter">
              <span class="ste-studio-pick-num"><strong>${conceptCount}</strong></span>
              <span class="ste-studio-pick-lbl">Concepts</span>
            </div>
          </div>

          <div class="ste-gen-list ste-gen-list-compact ${brief._lineupFadeIn ? 'is-fading-in' : ''}">
            ${groups.map((g, n) => `
              <div class="ste-gen-pick-row is-generated ste-gen-pick-row-compact" style="--gen-delay: ${n * 80}ms">
                <div class="ste-gen-orig">
                  <div class="ste-mini ste-gen-orig-lbl">REFERENCE</div>
                  <div class="ste-crawl-thumb-wrap ste-gen-orig-thumb">
                    <img class="ste-crawl-img" src="${escape(g.orig.file)}" alt="${escape(g.orig.name)}" loading="lazy">
                  </div>
                  <div class="ste-gen-orig-meta">
                    <strong>${escape(g.orig.category)}</strong>
                    <span class="ste-mini">${escape(g.orig.brand)}</span>
                  </div>
                </div>
                <div class="ste-gen-variants">
                  <div class="ste-gen-variants-grid">
                    ${g.variants.map(v => `
                      <div class="ste-gen-variant-card is-ready is-included is-lineup">
                        <div class="ste-crawl-thumb-wrap">
                          <img class="ste-crawl-img" src="${escape(v.file)}" alt="${escape(v.name)}" loading="lazy">
                          <span class="ste-lineup-num">${String(v.num).padStart(2,'0')}</span>
                        </div>
                        <div class="ste-gen-variant-meta">
                          <strong class="ste-lineup-name">${escape(v.name)}</strong>
                        </div>
                      </div>`).join("")}
                  </div>
                </div>
              </div>`).join("")}
          </div>
        </div>`;
    }
    return "";
  }

  function chipGroup(label, key, options, current) {
    return `
      <div class="ste-studio-chips">
        <div class="ste-lbl">${escape(label)}</div>
        <div class="ste-studio-chips-row">
          ${options.map(o => `
            <button class="ste-studio-chip ${o===current?'active':''}" data-brief="${escape(key)}" data-val="${escape(o)}">${escape(o)}</button>`).join("")}
        </div>
      </div>`;
  }

  // Single-select dropdown — current value displays as a chip; clicking the
  // trigger opens a flat menu of options.
  // Segmented pill control — for short single-select lists where a dropdown
  // would be heavy. `cols` lets you grid-wrap (e.g. SEASON renders 5×2).
  // Custom slider control — styled `<input type="range">` with a filled-left
  // track. Uses --p CSS var to drive the gradient stop; the input handler
  // updates --p on change so the fill follows the thumb in real time.
  function sliderControl(label, key, current, ends) {
    return `
      <div class="ste-studio-field ste-slider-field">
        <div class="ste-slider-head">
          <div class="ste-lbl">${escape(label)}</div>
          <div class="ste-slider-pct"><strong data-slider-out="${escape(key)}">${current}</strong>%</div>
        </div>
        <div class="ste-slider-track-wrap">
          <input type="range" min="0" max="100" step="5" value="${current}"
                 data-brief-slider="${escape(key)}" class="ste-slider-input"
                 style="--p: ${current}%">
        </div>
        <div class="ste-slider-ends"><span>${escape(ends[0])}</span><span>${escape(ends[1])}</span></div>
      </div>`;
  }

  // Regular native <select> dropdown — wrapped so we can render an
  // overlaid chevron via a positioned span (more reliable than the
  // background-image chevron trick, which some renderers drop).
  function nativeSelect(label, key, options, current) {
    return `
      <div class="ste-studio-field">
        <div class="ste-lbl">${escape(label)}</div>
        <div class="ste-brief-select-wrap">
          <select class="ste-input ste-brief-select" data-brief-select="${escape(key)}">
            ${options.map(o => `<option value="${escape(String(o))}" ${String(o)===String(current)?'selected':''}>${escape(String(o))}</option>`).join("")}
          </select>
          <span class="ste-brief-select-chev" aria-hidden="true">▾</span>
        </div>
      </div>`;
  }

  function segmentedControl(label, key, options, current, cols) {
    const cls = cols ? `ste-segmented is-grid` : `ste-segmented is-row`;
    const style = cols ? ` style="grid-template-columns:repeat(${cols},1fr)"` : ``;
    return `
      <div class="ste-studio-field ste-brief-segmented">
        <div class="ste-lbl">${escape(label)}</div>
        <div class="${cls}"${style}>
          ${options.map(o => `
            <button type="button" class="ste-segmented-btn ${String(o)===String(current)?'is-active':''}" data-brief="${escape(key)}" data-val="${escape(String(o))}">${escape(String(o))}</button>`).join("")}
        </div>
      </div>`;
  }

  function singleDropdown(label, key, options, current, isOpen) {
    return `
      <div class="ste-studio-chips ste-brief-dropdown" data-dropdown-key="${escape(key)}">
        <div class="ste-lbl">${escape(label)}</div>
        <div class="ste-brief-dd-wrap">
          <button type="button" class="ste-brief-dd-trigger" data-brief-dd-toggle="${escape(key)}">
            <span class="ste-brief-dd-current">${current ? escape(String(current)) : '<span class="ste-mini">Select…</span>'}</span>
            <span class="ste-brief-dd-chev">▾</span>
          </button>
          ${isOpen ? `
            <div class="ste-brief-dd-menu">
              <div class="ste-brief-dd-options ste-brief-dd-options-single">
                ${options.map(o => `
                  <button type="button" class="ste-brief-dd-option ${String(o)===String(current)?'active':''}" data-brief-single="${escape(key)}" data-val="${escape(String(o))}">
                    <span class="ste-brief-dd-check">${String(o)===String(current)?'✓':''}</span>
                    <span>${escape(String(o))}</span>
                  </button>`).join("")}
              </div>
            </div>` : ''}
        </div>
      </div>`;
  }

  // Multi-select dropdown — selected values appear as chips with × in the
  // trigger row; clicking the trigger opens a grouped menu of options.
  function chipMultiDropdown(label, key, groups, currentArr, isOpen) {
    const sel = new Set(currentArr || []);
    return `
      <div class="ste-studio-chips ste-brief-dropdown" data-dropdown-key="${escape(key)}">
        <div class="ste-lbl">${escape(label)} <span class="ste-mini" style="margin-left:6px;text-transform:none;letter-spacing:0">${sel.size} selected</span></div>
        <div class="ste-brief-dd-wrap">
          <div class="ste-brief-dd-chips">
            ${(currentArr || []).map(v => `
              <span class="ste-brief-dd-chip">${escape(v)}<button type="button" data-brief-multi="${escape(key)}" data-val="${escape(v)}" aria-label="Remove">×</button></span>`).join("")}
            <button type="button" class="ste-brief-dd-add" data-brief-dd-toggle="${escape(key)}">
              + Add category <span class="ste-brief-dd-chev">▾</span>
            </button>
          </div>
          ${isOpen ? (() => {
            const allItems = groups.flatMap(g => g.items);
            const allSelected = allItems.length > 0 && allItems.every(o => sel.has(o));
            return `
            <div class="ste-brief-dd-menu">
              <div class="ste-brief-dd-toolbar">
                <button type="button" class="ste-brief-dd-toolbtn" data-brief-dd-toggle-all="${escape(key)}">${allSelected ? 'Deselect all' : 'Select all'}</button>
                <span class="ste-mini">${sel.size} / ${allItems.length} selected</span>
              </div>
              ${groups.map(g => {
                const groupAllSel = g.items.every(o => sel.has(o));
                return `
                <div class="ste-brief-dd-group">
                  <div class="ste-brief-dd-group-hd">
                    <div class="ste-brief-dd-group-lbl">${escape(g.label)}</div>
                    <button type="button" class="ste-brief-dd-group-btn" data-brief-dd-toggle-group="${escape(key)}" data-group="${escape(g.label)}">${groupAllSel ? 'Clear' : 'All'}</button>
                  </div>
                  <div class="ste-brief-dd-options">
                    ${g.items.map(o => `
                      <button type="button" class="ste-brief-dd-option ${sel.has(o)?'active':''}" data-brief-multi="${escape(key)}" data-val="${escape(o)}">
                        <span class="ste-brief-dd-check">${sel.has(o)?'✓':''}</span>
                        <span>${escape(o)}</span>
                      </button>`).join("")}
                  </div>
                </div>`;
              }).join("")}
            </div>`;
          })() : ''}
        </div>
      </div>`;
  }

  // Grouped multi-select. Each option toggles in/out of brief[key] (an array).
  // Renders one sub-row per group label (e.g. Outerwear / Tops / Bottoms).
  function chipGroupedMulti(label, key, groups, currentArr) {
    const sel = new Set(currentArr || []);
    return `
      <div class="ste-studio-chips">
        <div class="ste-lbl">${escape(label)} <span class="ste-mini" style="margin-left:6px;text-transform:none;letter-spacing:0">${sel.size} selected</span></div>
        <div class="ste-studio-chips-groups">
          ${groups.map(g => `
            <div class="ste-studio-chips-group">
              <div class="ste-studio-chips-group-lbl">${escape(g.label)}</div>
              <div class="ste-studio-chips-row">
                ${g.items.map(o => `
                  <button class="ste-studio-chip ${sel.has(o)?'active':''}" data-brief-multi="${escape(key)}" data-val="${escape(o)}">${escape(o)}</button>`).join("")}
              </div>
            </div>`).join("")}
        </div>
      </div>`;
  }

  // ============================ MIRROR ============================
  // Historical sample inspection — 차수 (rounds) per style, filterable.
  // Sub-routes: #/sample-review/submit-new-sample → batch entry form (both
  // HQ on-behalf-of and licensee modes mount here). Reading the URL keeps
  // the bookmark / refresh experience consistent with the rest of the app
  // (Design Review uses the same pattern at /submit-new-design).
  function mirrorSubRoute() {
    const m = (location.hash || "").match(/^#\/sample-review\/([a-z0-9-]+)/i);
    return m ? m[1].toLowerCase() : null;
  }
  function mirror() {
    ensureMirrorSeed();
    const root = pageMain("sample-review");
    const u = STE.currentUser();
    const isHQ = u && STE.isHQ(u);
    const session = STE.getSession() || {};
    const sub = mirrorSubRoute();
    // Submit-new-sample sub-route — same form for HQ and licensee.
    if (sub === "submit-new-sample") return mirrorLicensee(root, u, isHQ);
    // Both HQ and licensees see the same list view, just scoped — see
    // licenseeId filter handling further down.
    // Shared list view — HQ sees every licensee's batches; licensees see
    // only their own (locked, no licensee filter UI). Same table shell.
    const records  = STE.get().sampleRecords  || [];
    const licensees = STE.get().licensees || [];
    const findLic = id => licensees.find(l => l.id === id) || { legalName: id || '—' };
    // Available seasons across all records, sorted so the latest is last
    // (alphanumeric sort handles 26FW < 27SS < 27FW correctly under our naming).
    const _allSeasonsSorted = Array.from(new Set((isHQ ? records : records.filter(r => r.licenseeId === (u && u.licenseeId))).map(r => r.season).filter(Boolean))).sort();
    const _latestSeason = _allSeasonsSorted[_allSeasonsSorted.length - 1] || "";
    // Filter state is multi-select (fdrop pattern, matching Agreements +
    // Design Review). Legacy single-string state from the prior native-select
    // bar is migrated up-front so existing sessions don't lose their picks.
    // Default scope: the latest season the user has data in, with all
    // statuses visible — the seed has no "Under Review" rows so locking that
    // status by default emptied the table.
    const _mrAsArr = (v) => Array.isArray(v) ? v.filter(Boolean) : (v ? [v] : []);
    const _mrRaw = session.mirrorFilters || {};
    // Default filter — Under Review + latest season. Applied on every fresh
    // entry into the Sample Review route (set by app.js when transitioning
    // INTO /sample-review). Internal re-renders (filter changes) consume
    // the flag and persist whatever the user picks instead.
    const _mrFreshEntry = !!session._mirrorFreshEntry;
    // Default on fresh entry — HQ scopes to Under Review + latest season
    // (their action queue). Licensee defaults to nothing — they have a
    // banner that surfaces decided samples and per-row unread dots; they
    // don't need a default filter and a sticky one was getting in the way
    // when navigating away and back.
    const filters = _mrFreshEntry
      ? (isHQ
          ? { status: ["Under Review"], licenseeId: [], season: _latestSeason ? [_latestSeason] : [], carryover: [], search: "" }
          : { status: [], licenseeId: [], season: [], carryover: [], search: "" })
      : {
          status:     _mrAsArr(_mrRaw.status),
          licenseeId: _mrAsArr(_mrRaw.licenseeId),
          season:     _mrAsArr(_mrRaw.season),
          carryover:  _mrAsArr(_mrRaw.carryover),
          search:     typeof _mrRaw.search === "string" ? _mrRaw.search : "",
        };
    if (_mrFreshEntry) {
      STE.setSession({ ...session, mirrorFilters: filters, _mirrorFreshEntry: false });
    }
    // Expansion state — session-persisted via mirrorRowExpanded so the
    // user can keep an open row across filter changes. On FRESH ENTRY into
    // the page (route transition from elsewhere), reset to all-collapsed
    // so the user lands clean. Within the page the click handler keeps
    // toggling the set — this clear used to run on EVERY render, which
    // wiped the set right before the click handler read it, so clicking
    // to collapse a row instead re-added the key (storage was empty) and
    // the row appeared stuck open.
    if (_mrFreshEntry && Array.isArray(session.mirrorRowExpanded) && session.mirrorRowExpanded.length) {
      STE.setSession({ ...STE.getSession(), mirrorRowExpanded: [] });
      session.mirrorRowExpanded = [];
    }

    // Flat per-sample list — the Movin dashboard model. Batch IDs still exist
    // behind the scenes (samples submitted together share a batchId so we can
    // back-trace), but the list itself is one row per sample with filters
    // doing the grouping work.
    const scopedRecords = isHQ ? records : records.filter(r => r.licenseeId === (u && u.licenseeId));
    // Per-sample derived status: APPROVED → Approved (done). Anything else
    // (REJECTED, or no rounds yet) → Under Review.
    // Three distinct statuses so HQ and licensee can see Rejected items
    // separately from those still waiting on a first decision.
    const sampleStatus = (rec) => {
      if (rec.lastResult === "APPROVED") return "Approved";
      if (rec.lastResult === "REJECTED") return "Rejected";
      return "Under Review";
    };

    const seasonOptions   = Array.from(new Set(scopedRecords.map(r => r.season).filter(Boolean))).sort();
    const carryoverOptions= Array.from(new Set(scopedRecords.map(r => r.type).filter(Boolean))).sort();
    const licenseeOptions = Array.from(new Set(scopedRecords.map(r => r.licenseeId).filter(Boolean)))
      .map(id => ({ id, name: findLic(id).legalName }))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    const searchTerm = (filters.search || "").trim().toLowerCase();
    const filtered = scopedRecords.filter(rec => {
      const status = sampleStatus(rec);
      if (filters.status.length     && !filters.status.includes(status))         return false;
      if (filters.licenseeId.length && !filters.licenseeId.includes(rec.licenseeId)) return false;
      if (filters.season.length     && !filters.season.includes(rec.season))     return false;
      if (filters.carryover.length  && !filters.carryover.includes(rec.type))    return false;
      if (searchTerm) {
        const hay = [
          rec.code, rec.name, rec.line, rec.type, rec.batchId,
          findLic(rec.licenseeId).legalName,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(searchTerm)) return false;
      }
      return true;
    });
    // Newest first, breaking ties on code so the order is deterministic.
    filtered.sort((a, b) => {
      const ts = (b.submittedAt || '').localeCompare(a.submittedAt || '');
      return ts !== 0 ? ts : (a.code || '').localeCompare(b.code || '');
    });
    const hasActiveFilters = !!(filters.status.length || filters.licenseeId.length || filters.season.length || filters.carryover.length || searchTerm);
    const tone = (status) => status === "Approved" ? "ok"
                            : status === "Rejected" ? "err"
                            : "info";

    // KPI tiles — Movin-style "검수율 요약" scorecard. Roll up across the
    // scoped (licensee + season + …) records.
    const kpiTotal = scopedRecords.length;
    const kpiApproved = scopedRecords.filter(i => i.lastResult === "APPROVED").length;
    const kpiRejected = scopedRecords.filter(i => i.lastResult === "REJECTED").length;
    const kpiUnderReview = kpiTotal - kpiApproved - kpiRejected;
    const kpiApprovalRate = kpiTotal ? Math.round((kpiApproved / kpiTotal) * 100) : 0;
    const roundsTotals = scopedRecords.reduce((s, i) => s + (i.rounds || 0), 0);
    const kpiAvgRounds = kpiTotal ? (roundsTotals / kpiTotal).toFixed(1) : "—";

    // Alert banner — different shape per audience.
    //  * Licensee: samples HQ has decided on (APPROVED / REJECTED) that the
    //    licensee hasn't expanded yet. The "seen" set lives in
    //    session.sampleReviewSeenIds and is appended on row-expand.
    //  * Licensor: samples awaiting an HQ decision (lastResult PENDING /
    //    unset). No "seen" tracking — these stay in the banner until HQ
    //    actually approves or rejects each one.
    const _mrSeen = (STE.getSession() || {}).sampleReviewSeenIds || {};
    const _mrUnseen = isHQ
      ? scopedRecords.filter(r => !r.lastResult || r.lastResult === "PENDING")
      : scopedRecords.filter(r => (r.lastResult === "APPROVED" || r.lastResult === "REJECTED") && !_mrSeen[`${r.batchId}|${r.code}`]);
    const _mrBannerCodes = _mrUnseen.slice(0, 5).map(r => r.code).join(", ");
    const _mrBannerMore  = _mrUnseen.length > 5 ? ` · +${_mrUnseen.length - 5} more` : '';
    const _mrBannerHeadline = isHQ
      ? `${_mrUnseen.length} sample${_mrUnseen.length===1?'':'s'} awaiting your decision`
      : `${_mrUnseen.length} sample decision${_mrUnseen.length===1?'':'s'} ready to check`;
    const _mrBannerSub = isHQ
      ? `${_mrBannerCodes}${_mrBannerMore} · click to filter the queue`
      : `${_mrBannerCodes}${_mrBannerMore} · expand a row to mark as checked`;

    root.innerHTML = `
      <div class="ste-screen-pad">
        <div class="ste-section-hd">
          <div class="ste-page-crumbs"><a href="${isHQ ? '#/hq' : '#/home'}">Home</a><span class="sep">/</span><span class="cur">Sample Review</span></div>
          <div class="ste-page-hd-row">
            <div>
              <h1>Sample Review</h1>
            </div>
            <div class="ste-hd-cta">
              <button class="ste-btn ste-btn-primary" data-act="new-mirror-batch" type="button" title="${isHQ ? 'Submit a sample on behalf of a licensee' : 'Submit a batch of samples to HQ for review'}">+ Submit New Sample</button>
            </div>
          </div>
        </div>

        ${_mrUnseen.length ? `
          <button class="ste-overdue-banner ${isHQ ? '' : 'ste-overdue-banner-warn'}" data-act="open-mr-ready" type="button">
            <span class="ste-overdue-icon"></span>
            <span class="ste-overdue-text">
              <strong>${escape(_mrBannerHeadline)}</strong>
              <span class="ste-mini">${escape(_mrBannerSub)}</span>
            </span>
            <span class="ste-overdue-chev">→</span>
          </button>` : ''}

        <div class="ste-mr-kpis">
          <div class="ste-mr-kpi"><div class="ste-mini">Approval rate</div><div class="ste-big">${kpiApprovalRate}%</div></div>
          <div class="ste-mr-kpi"><div class="ste-mini">Total samples</div><div class="ste-big">${kpiTotal}</div></div>
          <div class="ste-mr-kpi"><div class="ste-mini">Approved</div><div class="ste-big" style="color:var(--ste-ok)">${kpiApproved}</div></div>
          <div class="ste-mr-kpi"><div class="ste-mini">Rejected</div><div class="ste-big" style="color:var(--st-err)">${kpiRejected}</div></div>
          <div class="ste-mr-kpi"><div class="ste-mini">Under review</div><div class="ste-big">${kpiUnderReview}</div></div>
          <div class="ste-mr-kpi"><div class="ste-mini">Avg rounds</div><div class="ste-big">${kpiAvgRounds}</div></div>
        </div>

        <div class="ste-form-card">
          <div class="ste-filter-bar">
            <div class="ste-users-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/></svg>
              <input type="search" data-mr-filter="search" value="${escape(filters.search || '')}" placeholder="Search by code, style name, line, licensee…">
            </div>
            <span class="ste-filter-divider" aria-hidden="true"></span>
            <div class="ste-fdrop" data-mr-fdrop="status">
              <button class="ste-fdrop-btn" type="button"><span class="ste-fdrop-lbl">Statuses</span><span class="ste-fdrop-val"></span><span class="ste-fdrop-chev"></span></button>
              <div class="ste-fdrop-panel" hidden></div>
            </div>
            ${isHQ ? `
            <div class="ste-fdrop" data-mr-fdrop="licenseeId">
              <button class="ste-fdrop-btn" type="button"><span class="ste-fdrop-lbl">Organizations</span><span class="ste-fdrop-val"></span><span class="ste-fdrop-chev"></span></button>
              <div class="ste-fdrop-panel" hidden></div>
            </div>
            ` : ''}
            <div class="ste-fdrop" data-mr-fdrop="season">
              <button class="ste-fdrop-btn" type="button"><span class="ste-fdrop-lbl">Seasons</span><span class="ste-fdrop-val"></span><span class="ste-fdrop-chev"></span></button>
              <div class="ste-fdrop-panel" hidden></div>
            </div>
            <div class="ste-fdrop" data-mr-fdrop="carryover">
              <button class="ste-fdrop-btn" type="button"><span class="ste-fdrop-lbl">Types</span><span class="ste-fdrop-val"></span><span class="ste-fdrop-chev"></span></button>
              <div class="ste-fdrop-panel" hidden></div>
            </div>
            ${hasActiveFilters ? `<button class="ste-btn ste-btn-ghost ste-btn-mini" type="button" data-mr-filter-clear>Clear</button>` : ''}
            <span class="ste-mini ste-insp-filter-count"><strong>${filtered.length}</strong> of ${scopedRecords.length}</span>
          </div>

          ${filtered.length === 0 ? `
            <div class="ste-empty-cell" style="padding:40px;text-align:center;color:var(--ste-muted)">
              ${hasActiveFilters ? 'No samples match the current filters.' : 'No samples submitted yet. Submit a batch from the button above.'}
            </div>
          ` : `
          <div class="ste-mirror-table-wrap">
          <table class="ste-mirror-records">
            <thead>
              <tr>
                <th class="ste-mr-th-caret"></th>
                <th>Style Code</th>
                <th>Style name</th>
                <th>Line</th>
                <th>Type</th>
                <th>Round</th>
                ${isHQ ? '<th>Licensee</th>' : ''}
                <th>Season</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(it => {
                const itemKey = `${it.batchId}|${it.code}`;
                const status = sampleStatus(it);
                const t = tone(status);
                const drafts = session.mirrorItemDrafts || {};
                const draft = drafts[itemKey] || null;
                const expanded = (session.mirrorRowExpanded || []).includes(itemKey);
                const hist = Array.isArray(it.rounds_history) ? it.rounds_history : [];
                const lic = findLic(it.licenseeId);
                const colCount = isHQ ? 10 : 9;
                // A draft in progress force-opens the row so the form stays
                // anchored to its sample.
                const isOpen = expanded || !!draft;
                const _itemUpdated = it.lastUpdatedAt || (hist.length ? hist[hist.length-1].at : it.submittedAt);
                // HQ "your turn" — samples awaiting a decision.
                // Licensee "your turn" — decided samples (APPROVED / REJECTED)
                // they haven't expanded yet.
                const _sampleActionable = isHQ
                  ? (!it.lastResult || it.lastResult === "PENDING")
                  : (it.lastResult === "APPROVED" || it.lastResult === "REJECTED");
                const _unreadDot = (window.STEUnread && STEUnread.dot("sample", itemKey, _itemUpdated, _sampleActionable)) || '';
                // Has expandable content?
                //   - HQ always (decision form / withdraw button)
                //   - Either side: if a result is back (Approved/Rejected has a
                //     summary panel) OR there's at least one history entry.
                // An initial Under-Review submission with no comment yet has
                // nothing to show, so we hide the caret and disable toggle —
                // expanding an empty panel was misleading.
                const hasExpandContent = isHQ
                  || it.lastResult === "APPROVED"
                  || it.lastResult === "REJECTED"
                  || hist.length > 0;
                const _toggleAttr = hasExpandContent ? `data-mr-row-toggle="${escape(itemKey)}"` : '';
                const _caretGlyph = hasExpandContent ? (isOpen ? '▾' : '▸') : '';
                return `
                <tr class="ste-mr-item-row ${isOpen ? 'is-open' : ''} ${draft ? 'is-drafting' : ''} ${hasExpandContent ? '' : 'is-not-expandable'}" ${_toggleAttr}>
                  <td class="ste-mr-caret"><span aria-hidden="true">${_caretGlyph}</span></td>
                  <td class="ste-code">${_unreadDot}${escape(it.code)}</td>
                  <td><strong>${escape(it.name)}</strong></td>
                  <td>${escape(it.line || '—')}</td>
                  <td>${escape(it.type || '—')}</td>
                  <td><span class="ste-mini">${(() => {
                    // Current round number = the highest round_no in
                    // rounds_history, falling back to rec.rounds counter,
                    // else 1 (the initial submission).
                    const lastRound = hist.length ? (hist[hist.length - 1].round_no || hist.length) : (it.rounds || 1);
                    return `R${lastRound}`;
                  })()}</span></td>
                  ${isHQ ? `<td>${escape(lic.legalName)}</td>` : ''}
                  <td>${escape(it.season || '—')}</td>
                  <td><span class="ste-status-chip ste-insp-status-${t}">${escape(status)}</span></td>
                  <td class="ste-mini">${escape((it.submittedAt || '').slice(0,16).replace('T',' '))}</td>
                </tr>
                ${isOpen && hasExpandContent ? `
                  <tr class="ste-mr-expand-row"><td colspan="${colCount}">
                    <div class="ste-mr-expand">
                      ${renderItemApprovedHeadline(it)}
                      ${isHQ && it.lastResult === "APPROVED"
                        ? `<div class="ste-mr-withdraw"><button class="ste-btn ste-btn-ghost ste-btn-mini ste-mr-undo-btn" type="button" data-mr-withdraw="${escape(itemKey)}">Undo</button></div>`
                        : (isHQ ? renderItemDecisionForm(it, draft || { comment_kr: "", images: [] }) : '')}
                      ${hist.length ? (() => {
                        // Default history open on the licensee side — comments
                        // are the main content for them. HQ defaults closed
                        // since their focus is the decision form above.
                        const trackedOpen = (session.mirrorItemHistoryOpen || []).includes(itemKey);
                        const trackedKey = `__closed__|${itemKey}`;
                        const trackedClosed = (session.mirrorItemHistoryOpen || []).includes(trackedKey);
                        const open = isHQ ? trackedOpen : !trackedClosed;
                        return `
                          <details class="ste-mr-history-details" ${open ? 'open' : ''} data-mr-history-key="${escape(itemKey)}" data-mr-history-default-open="${!isHQ ? '1' : '0'}">
                            <summary class="ste-mr-history-summary">History (${hist.length})</summary>
                            ${renderItemRoundsHistory(it)}
                          </details>`;
                      })() : ''}
                    </div>
                  </td></tr>` : ''}`;
              }).join("")}
              </tbody>
            </table>
          </div>`}
        </div>
      </div>`;

    // List is flat per-sample now — filters do the grouping work that the
    // batch accordion used to. Each row toggles open / closed; the
    // expanded panel holds the action buttons + history + draft form.
    $$("[data-mr-row-toggle]", root).forEach(rowEl => {
      rowEl.style.cursor = "pointer";
      rowEl.addEventListener("click", (e) => {
        // Don't toggle when the click was inside the expanded panel — it has
        // its own buttons / textareas / dropzone.
        if (e.target.closest(".ste-mr-expand-row, .ste-mr-expand")) return;
        const key = rowEl.getAttribute("data-mr-row-toggle");
        const s = STE.getSession() || {};
        const cur = new Set(s.mirrorRowExpanded || []);
        if (cur.has(key)) {
          cur.delete(key);
          // Closing also drops any in-progress draft for that row so the
          // next open starts fresh.
          const drafts = { ...(s.mirrorItemDrafts || {}) };
          delete drafts[key];
          STE.setSession({ ...s, mirrorRowExpanded: Array.from(cur), mirrorItemDrafts: drafts });
        } else {
          cur.add(key);
          // Mark this sample as "seen" so it leaves the licensee alert
          // banner once they've expanded the row to check the decision.
          const _seen = { ...(s.sampleReviewSeenIds || {}) };
          if (!_seen[key]) _seen[key] = Date.now();
          STE.setSession({ ...s, mirrorRowExpanded: Array.from(cur), sampleReviewSeenIds: _seen });
          // Per-user "new" dot — clear for this user only, the rest of
          // the org still sees their own dot until they expand.
          try { window.STEUnread && STEUnread.markSeen("sample", key); } catch (_) {}
        }
        mirror();
      });
    });
    // Banner CTA — set the Status filter to the audience's natural queue.
    // HQ → Under Review (samples awaiting their decision).
    // Licensee → Approved + Rejected (results the licensee hasn't ack'd
    // yet; matches the banner count which uses lastResult === APPROVED|REJECTED).
    // If the filter is already on that set, flash the Statuses dropdown
    // instead of changing anything.
    $("[data-act='open-mr-ready']", root)?.addEventListener("click", () => {
      const s = STE.getSession() || {};
      const curFilters = s.mirrorFilters || {};
      const curStatus = Array.isArray(curFilters.status) ? curFilters.status : [];
      const wanted = isHQ ? ["Under Review"] : ["Approved", "Rejected"];
      const sameSet = curStatus.length === wanted.length && wanted.every(v => curStatus.includes(v));
      if (sameSet) {
        const drop = root.querySelector('.ste-fdrop[data-mr-fdrop="status"]');
        if (drop) {
          drop.classList.add("ste-fdrop-flash");
          setTimeout(() => drop.classList.remove("ste-fdrop-flash"), 800);
        }
        return;
      }
      STE.setSession({ ...s, mirrorFilters: { ...curFilters, status: wanted } });
      mirror();
    });

    // Helper: get the itemKey of the draft form a given element lives inside.
    function _draftKeyOf(el) {
      return el.closest("[data-mr-draft-key]")?.getAttribute("data-mr-draft-key") || null;
    }
    // Helper: read/write per-item draft state in session keyed by itemKey.
    function _getDraft(s, key) { return ((s && s.mirrorItemDrafts) || {})[key] || { comment_kr: "", images: [] }; }
    function _setDraft(key, mut) {
      const s = STE.getSession() || {};
      const drafts = { ...(s.mirrorItemDrafts || {}) };
      drafts[key] = { ...(drafts[key] || { comment_kr: "", images: [] }), ...mut };
      STE.setSession({ ...s, mirrorItemDrafts: drafts });
    }
    function _clearDraft(key) {
      const s = STE.getSession() || {};
      const drafts = { ...(s.mirrorItemDrafts || {}) };
      delete drafts[key];
      STE.setSession({ ...s, mirrorItemDrafts: drafts });
    }
    // KR textarea — commit value on blur, scoped to that row's draft.
    $$("[data-mr-draft-kr]", root).forEach(ta => ta.addEventListener("blur", (e) => {
      const key = _draftKeyOf(ta); if (!key) return;
      _setDraft(key, { comment_kr: e.target.value });
    }));
    // Add images — read each file as a data URL and append to that row's draft.
    function _attachImages(key, files) {
      const fs = Array.from(files || []).filter(f => f.type && f.type.startsWith("image/"));
      if (fs.length === 0) return;
      Promise.all(fs.map(f => new Promise(res => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = () => res(null);
        r.readAsDataURL(f);
      }))).then(urls => {
        const ok = urls.filter(Boolean);
        const s = STE.getSession() || {};
        const cur = _getDraft(s, key).images || [];
        _setDraft(key, { images: cur.concat(ok) });
        mirror();
      });
    }
    $$("[data-mr-img-add]", root).forEach(inp => inp.addEventListener("change", (e) => {
      const key = _draftKeyOf(inp); if (!key) return;
      _attachImages(key, e.target.files);
      e.target.value = "";
    }));
    // Drag-and-drop on each dropzone.
    $$("[data-mr-dropzone]", root).forEach(dz => {
      ["dragenter", "dragover"].forEach(ev => dz.addEventListener(ev, e => {
        e.preventDefault();
        e.stopPropagation();
        dz.classList.add("is-dragover");
      }));
      ["dragleave", "drop"].forEach(ev => dz.addEventListener(ev, e => {
        e.preventDefault();
        e.stopPropagation();
        dz.classList.remove("is-dragover");
      }));
      dz.addEventListener("drop", e => {
        const key = _draftKeyOf(dz); if (!key) return;
        const files = (e.dataTransfer && e.dataTransfer.files) || [];
        _attachImages(key, files);
      });
    });
    // <details> history panel — persist toggle state. On the HQ side we
    // track "open" (default closed). On the licensee side we track "closed"
    // (default open) so comments surface immediately when they expand a row.
    $$("[data-mr-history-key]", root).forEach(d => d.addEventListener("toggle", () => {
      const key = d.getAttribute("data-mr-history-key");
      const defaultOpen = d.getAttribute("data-mr-history-default-open") === "1";
      const s = STE.getSession() || {};
      const cur = new Set(s.mirrorItemHistoryOpen || []);
      if (defaultOpen) {
        // Licensee mode: track explicit close.
        const closedKey = `__closed__|${key}`;
        if (d.open) cur.delete(closedKey); else cur.add(closedKey);
      } else {
        // HQ mode: track explicit open.
        if (d.open) cur.add(key); else cur.delete(key);
      }
      STE.setSession({ ...s, mirrorItemHistoryOpen: Array.from(cur) });
    }));
    // Withdraw approval — flip an approved sample back to Under Review so
    // HQ can revisit the decision. Removes the latest (approved) round
    // from history and resets lastResult so the inline decision form
    // re-appears on next render.
    $$("[data-mr-withdraw]", root).forEach(b => b.addEventListener("click", (e) => {
      e.stopPropagation();
      const key = b.getAttribute("data-mr-withdraw");
      const [batchId, code] = key.split("|");
      const u = STE.currentUser();
      STE.mutate(state => {
        const rec = (state.sampleRecords || []).find(r => r.batchId === batchId && r.code === code);
        if (!rec || rec.lastResult !== "APPROVED") return;
        // Drop the latest round (the approved one) from history.
        const hist = Array.isArray(rec.rounds_history) ? rec.rounds_history.slice() : [];
        hist.sort((a, b) => (a.round_no || 0) - (b.round_no || 0));
        if (hist.length && hist[hist.length - 1].result === "APPROVED") hist.pop();
        rec.rounds_history = hist;
        rec.rounds = hist.length;
        rec.lastResult = "PENDING";
        rec.decisionAt = new Date().toISOString();
        rec.decisionBy = u?.name || "HQ Reviewer";
      });
      STEApp.toast(`Approval withdrawn · ${code} is back under review.`, "info");
      mirror();
    }));
    // Per-round language toggle in the history panel.
    $$("[data-mr-round-langtoggle]", root).forEach(b => b.addEventListener("click", (e) => {
      e.stopPropagation();
      const key = b.getAttribute("data-mr-round-langtoggle");
      const s = STE.getSession() || {};
      const cur = new Set(s.mirrorRoundAltLang || []);
      if (cur.has(key)) cur.delete(key); else cur.add(key);
      STE.setSession({ ...s, mirrorRoundAltLang: Array.from(cur) });
      mirror();
    }));
    // Remove a single image from a row's draft.
    $$("[data-mr-img-rm]", root).forEach(b => b.addEventListener("click", (e) => {
      e.stopPropagation();
      const key = _draftKeyOf(b); if (!key) return;
      const idx = parseInt(b.getAttribute("data-mr-img-rm"));
      const s = STE.getSession() || {};
      const imgs = (_getDraft(s, key).images || []).slice();
      imgs.splice(idx, 1);
      _setDraft(key, { images: imgs });
      mirror();
    }));
    // Submit — commit the draft as a new round. Kind ("approved" /
    // "rejected") comes from the button's data attribute, so Reject and
    // Approve share the same form fields.
    $$("[data-mr-decision-submit]", root).forEach(btn => btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const kind = btn.getAttribute("data-mr-decision-submit");
      const key = _draftKeyOf(btn); if (!key) return;
      const krEl = btn.closest("[data-mr-draft-key]").querySelector("[data-mr-draft-kr]");
      const sess0 = STE.getSession() || {};
      const draft = _getDraft(sess0, key);
      const comment_kr = (krEl?.value ?? draft.comment_kr ?? "").trim();
      if (!comment_kr) { STEApp.toast("Add a comment before submitting.", "warn"); return; }
      const comment_en = mockTranslateKr(comment_kr);
      const [batchId, code] = key.split("|");
      const u = STE.currentUser();
      STE.mutate(state => {
        const rec = (state.sampleRecords || []).find(r => r.batchId === batchId && r.code === code);
        if (!rec) return;
        addRoundToRecord(rec, {
          result: kind === "approved" ? "APPROVED" : "REJECTED",
          decision_at: new Date().toISOString(),
          decision_by: u?.name || "HQ Reviewer",
          comment_kr,
          comment_en,
          images: draft.images || [],
        });
        rec.decisionAt = new Date().toISOString();
        rec.decisionBy = u?.name || "HQ Reviewer";
      });
      _clearDraft(key);
      STEApp.toast(`Round logged · ${code} ${kind === "approved" ? "approved" : "rejected"}.`, kind === "approved" ? "success" : "info");
      mirror();
    }));

    // Filter handlers — text search (input) + fdrop multi-checkbox panels.
    const writeMr = (key, val) => {
      const s = STE.getSession() || {};
      const cur = s.mirrorFilters || {};
      STE.setSession({ ...s, mirrorFilters: { ...cur, [key]: val } });
      mirror();
    };
    $$("[data-mr-filter]", root).forEach(el => {
      const key = el.getAttribute("data-mr-filter");
      el.addEventListener("input", () => writeMr(key, el.value));
    });
    const _mcpMr = window.STEScreens && window.STEScreens.multiCheckboxPanel;
    const _MR_FDROP = {
      status:     { all: "All Statuses",      options: () => ["Approved","Rejected","Under Review"].map(v => ({ value: v, label: v })) },
      licenseeId: { all: "All Organizations", options: () => licenseeOptions.map(l => ({ value: l.id, label: l.name })) },
      season:     { all: "All Seasons",       options: () => seasonOptions.map(v => ({ value: v, label: v })) },
      carryover:  { all: "All Types",         options: () => carryoverOptions.map(v => ({ value: v, label: v })) },
    };
    let _openMrDrop = null;
    function closeMrDrop() {
      if (!_openMrDrop) return;
      const panel = _openMrDrop.querySelector(".ste-fdrop-panel");
      if (panel) { panel.innerHTML = ""; panel.hidden = true; }
      _openMrDrop.classList.remove("ste-fdrop-open");
      _openMrDrop = null;
    }
    const _outsideCloseMr = (ev) => {
      if (!_openMrDrop) return;
      if (ev.target.closest(".ste-fdrop") === _openMrDrop) return;
      closeMrDrop();
    };
    document.addEventListener("click", _outsideCloseMr, true);
    // Paint button labels using the Agreements pattern (value itself when 1
    // picked, "X selected" when 2+, empty when 0 or all).
    const _mlbMr = (window.STEScreens && window.STEScreens.multiLabel)
      || ((sel) => ({ val: sel && sel.length ? `${sel.length} selected` : "", active: !!(sel && sel.length) }));
    function paintMrLabels() {
      $$(".ste-fdrop[data-mr-fdrop]", root).forEach(drop => {
        const key = drop.getAttribute("data-mr-fdrop");
        const cfg = _MR_FDROP[key];
        if (!cfg) return;
        const opts = cfg.options();
        const allValues = opts.map(o => o.value);
        const labels = (filters[key] || []).map(v => {
          const m = opts.find(o => o.value === v);
          return m ? m.label : v;
        });
        const info = _mlbMr(labels, allValues);
        drop.classList.toggle("ste-filter-active", info.active);
        const valEl = drop.querySelector(".ste-fdrop-val");
        if (valEl) valEl.innerHTML = info.val;
      });
    }
    paintMrLabels();
    function openMrDrop(drop) {
      const panel = drop.querySelector(".ste-fdrop-panel");
      const key = drop.getAttribute("data-mr-fdrop");
      if (!_mcpMr) return;
      const cfg = _MR_FDROP[key]; if (!cfg) return;
      const built = _mcpMr(cfg.options(), filters[key] || [], (sel) => {
        // Stash the open key so the post-render re-opens this panel; toggling
        // rows / Select All otherwise drops it.
        STE.setSession({ ...(STE.getSession() || {}), _openMrDropKey: key });
        writeMr(key, sel);
      }, cfg.all);
      panel.innerHTML = built.html;
      built.wire(panel);
      panel.hidden = false;
      drop.classList.add("ste-fdrop-open");
      _openMrDrop = drop;
    }
    $$(".ste-fdrop[data-mr-fdrop]", root).forEach(drop => {
      const btn = drop.querySelector(".ste-fdrop-btn");
      const key = drop.getAttribute("data-mr-fdrop");
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (_openMrDrop === drop) {
          closeMrDrop();
          STE.setSession({ ...(STE.getSession() || {}), _openMrDropKey: null });
          return;
        }
        closeMrDrop();
        STE.setSession({ ...(STE.getSession() || {}), _openMrDropKey: key });
        openMrDrop(drop);
      });
    });
    // Re-open the dropdown the user was just on — runs after every render.
    {
      const _pending = (STE.getSession() || {})._openMrDropKey;
      if (_pending) {
        const drop = root.querySelector(`.ste-fdrop[data-mr-fdrop="${_pending}"]`);
        if (drop) openMrDrop(drop);
      }
    }
    const _outsideCloseMrV2 = (ev) => {
      if (!_openMrDrop) return;
      if (ev.target.closest(".ste-fdrop") === _openMrDrop) return;
      closeMrDrop();
      STE.setSession({ ...(STE.getSession() || {}), _openMrDropKey: null });
    };
    document.removeEventListener("click", _outsideCloseMr, true);
    document.addEventListener("click", _outsideCloseMrV2, true);
    root.querySelector("[data-mr-filter-clear]")?.addEventListener("click", () => {
      const s = STE.getSession() || {};
      STE.setSession({ ...s, mirrorFilters: { status: [], licenseeId: [], season: [], carryover: [], search: "" } });
      mirror();
    });
    // HQ "+ Submit New Sample" — navigate to the dedicated submit URL so the
    // route is bookmarkable + the back button works like other detail pages.
    $("[data-act='new-mirror-batch']", root)?.addEventListener("click", () => {
      const s = STE.getSession() || {};
      STE.setSession({
        ...s,
        mirrorOnBehalfLicId: s.mirrorOnBehalfLicId || ((STE.get().licensees || [])[0]?.id || null),
        mirrorBatchDraft: { items: [_emptySampleRow()] },
      });
      location.hash = "#/sample-review/submit-new-sample";
    });
  }

  // Licensee-side Mirror — submission form for items going into the sample
  // review queue. Once they submit, items appear on the staff dashboard with
  // 차수 starting at 0 (waiting for first round).
  // Default row template for the batch composer.
  function _emptySampleRow() {
    return { code: "", name: "", line: "", garmentType: "TRACKTOP", gender: "M", tier: "T1", type: "NEW", fabric: "" };
  }

  // Inline decision form — always visible inside an expanded sample row.
  // HQ types a Korean comment, attaches photos via drag-drop, then clicks
  // Approve or Reject to commit a new round. Comment is required for both
  // outcomes (so the licensee always sees what was decided and why).
  function renderItemDecisionForm(it, draft) {
    const images = Array.isArray(draft.images) ? draft.images : [];
    const itemKey = `${it.batchId}|${it.code}`;
    return `
      <div class="ste-mr-draft" data-mr-draft-key="${escape(itemKey)}">
        <div class="ste-mr-draft-imgs">
          <div class="ste-mr-dropzone" data-mr-dropzone>
            ${images.length ? `
              <div class="ste-mr-img-row">
                ${images.map((src, i) => `
                  <div class="ste-mr-img-thumb">
                    <img src="${escape(src)}" alt="Inspection image ${i+1}" loading="lazy">
                    <button type="button" class="ste-mr-img-rm" data-mr-img-rm="${i}" aria-label="Remove image">×</button>
                  </div>`).join("")}
              </div>` : ''}
            <label class="ste-mr-dropzone-hint">
              <input type="file" data-mr-img-add accept="image/*" multiple hidden>
              <span class="ste-mr-dropzone-text">
                <strong>Drop images here</strong>
                <span class="ste-mini">or click to browse — inspection photos for the licensee</span>
              </span>
            </label>
          </div>
        </div>

        <div class="ste-mr-draft-cmt">
          <textarea class="ste-input" rows="4" data-mr-draft-kr>${escape(draft.comment_kr || "")}</textarea>
        </div>

        <div class="ste-mr-draft-actions">
          <button class="ste-btn ste-btn-ghost" type="button" data-mr-decision-submit="rejected">Reject</button>
          <button class="ste-btn ste-btn-primary" type="button" data-mr-decision-submit="approved">Approve</button>
        </div>
      </div>`;
  }

  // Round-by-round history panel — one card per round. Each card shows the
  // comment in the viewer's primary language (HQ → Korean, licensee →
  // English), with a "Show original / Show translation" toggle to flip.
  // Render a single round as a card. Shared between the prominent "approved
  // round" card (rendered above history) and the per-round entries inside
  // history.
  function renderRoundCard(rd, it, opts) {
    const session = STE.getSession() || {};
    const u = STE.currentUser();
    const isHQ = u && STE.isHQ(u);
    const primaryLang = isHQ ? "kr" : "en";
    const altLang = isHQ ? "en" : "kr";
    const langToggles = new Set(session.mirrorRoundAltLang || []);
    const ok = rd.result === "APPROVED";
    const tone = ok ? "ok" : "err";
    const dateShort = (rd.decision_at || "").slice(0,10);
    const kr = rd.comment_kr || "";
    const en = rd.comment_en || "";
    const imgs = Array.isArray(rd.images) ? rd.images : [];
    const toggleKey = `${it.batchId}|${it.code}|${rd.round_no}`;
    const showingAlt = langToggles.has(toggleKey);
    const shown = showingAlt ? rd[`comment_${altLang}`] : rd[`comment_${primaryLang}`];
    const toggleLabel = showingAlt ? "Show translation" : "Show original";
    const hasAlt = !!rd[`comment_${altLang}`];
    // Comments are authored in Korean. HQ/licensor already reads the Korean
    // original as their primary language, so "Show original" is meaningless
    // for them — only offer the toggle on the licensee (English-primary) side.
    const showLangToggle = hasAlt && !isHQ;
    const hasShown = !!shown;
    const variant = (opts && opts.variant) || "";
    return `
      <div class="ste-mr-round-card ${variant}">
        <div class="ste-mr-round-hd">
          <span class="ste-mr-round-tag">Round ${rd.round_no}</span>
          <span class="ste-status-chip ste-insp-status-${tone}">${ok ? "APPROVED" : "REJECTED"}</span>
          <span class="ste-mini">${escape(dateShort)}</span>
        </div>
        ${hasShown ? `
          <div class="ste-mr-round-body">
            <p>${escape(shown)}</p>
          </div>
          ${showLangToggle ? `<a class="ste-mr-round-langlink" data-mr-round-langtoggle="${escape(toggleKey)}" role="button" tabindex="0">${toggleLabel}</a>` : ''}
        ` : (ok ? `<div class="ste-mini ste-mr-round-body-empty">Approved without further comment.</div>` : `<div class="ste-mini ste-mr-history-empty">No comment recorded.</div>`)}
        ${imgs.length ? `
          <div class="ste-mr-round-imgs">
            ${imgs.map(src => `<a class="ste-mr-round-img" href="${escape(src)}" target="_blank" rel="noopener"><img src="${escape(src)}" alt="" loading="lazy"></a>`).join("")}
          </div>` : ''}
      </div>`;
  }

  // Approved-round headline — pulled out of `rounds_history` and rendered
  // as its own prominent card above the history collapsible. Returns the
  // approved round's HTML plus the list of "prior" (non-approved or older)
  // rounds that should still live inside History.
  function splitApprovedRound(it) {
    const hist = (Array.isArray(it.rounds_history) ? it.rounds_history : []).slice();
    if (!hist.length) return { approved: null, prior: [] };
    const sorted = hist.slice().sort((a, b) => (b.round_no || 0) - (a.round_no || 0));
    const latest = sorted[0];
    if (latest && latest.result === "APPROVED") {
      return { approved: latest, prior: sorted.slice(1) };
    }
    return { approved: null, prior: sorted };
  }

  function renderItemApprovedHeadline(it) {
    const { approved } = splitApprovedRound(it);
    if (!approved) return "";
    return `
      <div class="ste-mr-approved-headline">
        ${renderRoundCard(approved, it, { variant: "is-headline" })}
      </div>`;
  }

  function renderItemRoundsHistory(it, opts) {
    const hist = Array.isArray(it.rounds_history) ? it.rounds_history : [];
    if (!hist.length) return `<div class="ste-mini ste-mr-history-empty">No round history yet.</div>`;
    // If the latest round is APPROVED, it's rendered separately by
    // renderItemApprovedHeadline; only earlier rounds belong in history.
    const { prior } = splitApprovedRound(it);
    if (!prior.length) return `<div class="ste-mini ste-mr-history-empty">No earlier rounds.</div>`;
    return `
      <div class="ste-mr-history">
        ${prior.map(rd => renderRoundCard(rd, it)).join("")}
      </div>`;
  }


  // Korean → English translation dictionary, seeded from the Movin 26FW
  // 검수대시보드 corpus so the demo's Korean phrases translate exactly.
  // Anything not in the dictionary falls through to a `[Auto-translated]`
  // pass-through — in the real product this hits an LLM/translation API.
  const STE_KR_TRANSLATIONS = {
    "목둘레가 너무 좁고 카라가 뒤집어지는 현상이 있으니, 핏과 봉제 구조를 조정해 주세요.":
      "The neck circumference is too tight and the collar is flipping over; please adjust both fit and construction.",
    "상단 지퍼 좌우 높이가 맞지 않으므로 정렬을 수정해 주세요.":
      "The left and right heights of the upper zipper are not aligned; please correct the alignment.",
    "자수 퀄리티를 개선해 주세요.":
      "Please improve the embroidery quality.",
    "밑단 지퍼 좌우가 맞지 않으므로 동일하게 맞춰 주세요.":
      "The left and right bottom zippers are not aligned; please match them equally.",
    "암홀 접밴드가 늘어나 꿀렁거리지 않도록 작업해 주세요.":
      "Please construct the armhole binding so it doesn't stretch or ripple.",
    "지퍼 작업 전 수축 테스트를 통해 지퍼가 꿀렁거리지 않도록 해주세요.":
      "Please run a shrink test before attaching the zipper so it doesn't ripple.",
    "사이즈를 조정해 주세요.": "Please adjust the sizing.",
    "원단을 변경해 주세요.": "Please change the fabric.",
    "색상이 견본과 다릅니다. 컬러를 맞춰 주세요.":
      "The color does not match the swatch. Please align the color.",
    "봉제선이 고르지 않습니다. 정렬을 수정해 주세요.":
      "The stitching is uneven. Please correct the alignment.",
    "프린트 위치가 어긋났습니다. 정확히 맞춰 주세요.":
      "The print is misaligned. Please position it precisely.",
    "라벨 위치를 표준에 맞춰 수정해 주세요.":
      "Please reposition the label to the standard placement.",
    "패턴 라인이 좌우 대칭이 맞지 않습니다. 다시 작업해 주세요.":
      "The pattern lines are not symmetrical left to right. Please rework.",
  };
  // Detect Hangul in a string — anything containing a Korean codepoint
  // triggers the translation flow; ASCII-only text passes through unchanged.
  function _hasHangul(s) { return /[가-힯ᄀ-ᇿ㄰-㆏]/.test(String(s || "")); }
  function mockTranslateKr(kr) {
    const t = String(kr || "").trim();
    if (!t) return "";
    if (!_hasHangul(t)) return t; // already English, leave alone
    if (STE_KR_TRANSLATIONS[t]) return STE_KR_TRANSLATIONS[t];
    // Try per-sentence/line lookup so multi-paragraph comments translate
    // partially even when the whole isn't in the dictionary.
    const lines = t.split(/\n+/).map(l => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      return lines.map(l => STE_KR_TRANSLATIONS[l] || `[Auto-translated] ${l}`).join("\n");
    }
    return `[Auto-translated] ${t}`;
  }

  // Push a fresh round onto a sample record. Keeps the legacy `rounds`
  // counter and `lastResult` in sync so existing list views still work
  // while the per-round history (`rounds_history`) becomes the source of
  // truth for the new round-by-round detail panel.
  function addRoundToRecord(rec, round) {
    rec.rounds_history = rec.rounds_history || [];
    const nextNo = (rec.rounds_history[rec.rounds_history.length - 1]?.round_no || rec.rounds || 0) + 1;
    rec.rounds_history.push({
      round_no: nextNo,
      result: round.result,
      decision_at: round.decision_at || new Date().toISOString(),
      decision_by: round.decision_by || "HQ Reviewer",
      comment_kr: round.comment_kr || "",
      comment_en: round.comment_en || "",
      images: Array.isArray(round.images) ? round.images : [],
    });
    rec.rounds = nextNo;
    rec.lastResult = round.result;
  }

  function mirrorLicensee(root, u, isHQ) {
    ensureMirrorSeed();
    const all = STE.get().sampleRecords || [];
    const allLicensees = STE.get().licensees || [];
    const lic = STE.currentLicensee();
    const session = STE.getSession() || {};
    // HQ "on behalf of" mode: pick a licensee via session flag, default to
    // the first licensee in the directory.
    const hqPicked = session.mirrorOnBehalfLicId
      || (allLicensees[0] && allLicensees[0].id) || null;
    const myLicId = isHQ
      ? hqPicked
      : ((u && u.licenseeId) || (lic && lic.id) || null);
    const activeLic = allLicensees.find(l => l.id === myLicId) || { legalName: myLicId };
    const batchDraft = session.mirrorBatchDraft || { items: [_emptySampleRow()] };
    const mine = myLicId
      ? all.filter(r => r.licenseeId === myLicId)
      : all;
    const allBatches = (STE.get().sampleBatches || []);
    const myBatches = myLicId
      ? allBatches.filter(b => b.licenseeId === myLicId)
      : allBatches;

    // Split previously-submitted samples into the two buckets the licensee
    // cares about: REJECTED ones that need a remade resubmission (the
    // urgent set the banner / alert nudges them about) and everything else
    // still in progress (Round 0 or PENDING). Approved items are out of
    // scope — they're done.
    const _sortByNewest = (a, b) => {
      const t = (b.submittedAt || '').localeCompare(a.submittedAt || '');
      return t !== 0 ? t : (a.code || '').localeCompare(b.code || '');
    };
    const _draftCodes = new Set((batchDraft.items || []).map(r => r.code).filter(Boolean));
    const rejectedSamples     = mine.filter(r => r.lastResult === "REJECTED").sort(_sortByNewest);
    const otherPendingSamples = mine.filter(r => r.lastResult !== "APPROVED" && r.lastResult !== "REJECTED").sort(_sortByNewest);
    const rejectedNotInDraft  = rejectedSamples.filter(r => !_draftCodes.has(r.code));

    root.innerHTML = `
      <div class="ste-screen-pad">
        <div class="ste-section-hd">
          <div class="ste-page-crumbs">
            <a href="${isHQ ? '#/hq' : '#/home'}">Home</a><span class="sep">/</span>
            <a href="#/sample-review" data-back-mirror>Sample Review</a><span class="sep">/</span>
            <span class="cur">Submit New Sample</span>
          </div>
          <div class="ste-page-hd-row">
            <div>
              <h1>Submit New Sample${isHQ ? ` <span class="ste-mini ste-onbehalf-tag">on behalf of ${escape(activeLic.legalName)}</span>` : ''}</h1>
              <p class="ste-mini" style="margin-top:6px;color:var(--ste-muted)">Submit samples to HQ as a single batch. Add as many rows as you need, then submit them together for review.</p>
            </div>
            <div class="ste-hd-cta">
              <a class="ste-btn ste-btn-ghost" href="#/sample-review" data-back-mirror>Cancel</a>
            </div>
          </div>
        </div>

        ${isHQ ? `
        <div class="ste-card">
          <div class="ste-card-head"><h3>Basic Info</h3></div>
          <div class="ste-card-body">
            <div class="ste-field">
              <div class="ste-lbl">LICENSEE</div>
              <select class="ste-input" data-mr-onbehalf>
                ${allLicensees.map(l => `<option value="${escape(l.id)}" ${l.id===myLicId?'selected':''}>${escape(l.legalName)}</option>`).join("")}
              </select>
            </div>
          </div>
        </div>` : ''}

        ${rejectedNotInDraft.length ? `
          <button class="ste-overdue-banner" data-act="open-resubmit-picker" type="button">
            <span class="ste-overdue-icon"></span>
            <span class="ste-overdue-text">
              <strong>${rejectedNotInDraft.length} rejected sample${rejectedNotInDraft.length===1?'':'s'} need${rejectedNotInDraft.length===1?'s':''} to be resubmitted</strong>
              <span class="ste-mini">${rejectedNotInDraft.slice(0,5).map(r => r.code).join(", ")}${rejectedNotInDraft.length > 5 ? ` · +${rejectedNotInDraft.length - 5} more` : ''} · click to pick what to remake</span>
            </span>
            <span class="ste-overdue-chev">→</span>
          </button>` : ''}

        <div class="ste-card">
          <div class="ste-card-head">
            <h3>Draft batch <span class="ste-mini" style="color:var(--ste-muted);margin-left:6px">${batchDraft.items.length} row${batchDraft.items.length===1?'':'s'}</span></h3>
            <div style="margin-left:auto;display:flex;gap:8px">
              <input type="file" data-mr-upload accept=".xlsx,.csv" hidden>
              <button class="ste-btn ste-btn-ghost ste-btn-mini" data-act="batch-template" type="button">Download template</button>
              <button class="ste-btn ste-btn-ghost ste-btn-mini" data-act="batch-upload" type="button">Upload template (.xlsx, .csv)</button>
              <button class="ste-btn ste-btn-ghost ste-btn-mini" data-act="batch-clear" type="button">Clear all rows</button>
            </div>
          </div>
          <div class="ste-mirror-table-wrap">
            <table class="ste-mirror-records ste-batch-table">
              <thead>
                <tr>
                  <th style="width:42px"></th>
                  <th>Style Code</th>
                  <th>Style Name</th>
                  <th>Line</th>
                  <th>Garment</th>
                  <th>Gender</th>
                  <th>Tier</th>
                  <th>Type</th>
                  <th>Fabric</th>
                  <th style="width:42px"></th>
                </tr>
              </thead>
              <tbody data-batch-tbody>
                ${batchDraft.items.map((row, i) => `
                  <tr data-row-i="${i}">
                    <td class="ste-batch-rowidx">${i+1}</td>
                    <td><input class="ste-input ste-cell-input" data-bf="${i}|code" value="${escape(row.code)}" placeholder="41950"></td>
                    <td><input class="ste-input ste-cell-input" data-bf="${i}|name" value="${escape(row.name)}" placeholder="ATLAS TRACK JACKET"></td>
                    <td><input class="ste-input ste-cell-input" data-bf="${i}|line" value="${escape(row.line)}" placeholder="ATLAS"></td>
                    <td>
                      <select class="ste-input ste-cell-input ste-cell-select" data-bf="${i}|garmentType">
                        ${["TRACKTOP","TRACK JACKET","JACKET","PANTS","SHORTS","POLO","T-SHIRT","SWEATER","TRACKSUIT","CAP","BAG","ACC"].map(t => `<option ${t===row.garmentType?'selected':''}>${t}</option>`).join("")}
                      </select>
                    </td>
                    <td>
                      <select class="ste-input ste-cell-input ste-cell-select" data-bf="${i}|gender">
                        ${["M","W","U"].map(g => `<option ${g===row.gender?'selected':''}>${g}</option>`).join("")}
                      </select>
                    </td>
                    <td>
                      <select class="ste-input ste-cell-input ste-cell-select" data-bf="${i}|tier">
                        ${["T1","T2","T3","NORTH AFRICA"].map(t => `<option ${t===row.tier?'selected':''}>${t}</option>`).join("")}
                      </select>
                    </td>
                    <td>
                      <select class="ste-input ste-cell-input ste-cell-select" data-bf="${i}|type">
                        ${["NEW","CARRY OVER","REMADE","SMU"].map(t => `<option ${t===row.type?'selected':''}>${t}</option>`).join("")}
                      </select>
                    </td>
                    <td><input class="ste-input ste-cell-input" data-bf="${i}|fabric" value="${escape(row.fabric)}" placeholder="NYLON STRETCH 88% PA 12% EA"></td>
                    <td><button class="ste-batch-row-rm" data-act="batch-rm" data-row="${i}" type="button" aria-label="Remove row" title="Remove row" ${batchDraft.items.length === 1 ? 'disabled' : ''}>×</button></td>
                  </tr>`).join("")}
              </tbody>
            </table>
          </div>
          <div class="ste-form-actions" style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:14px 22px;border-top:1px solid var(--ste-border)">
            <div style="display:flex;gap:8px;align-items:center">
              <button class="ste-btn ste-btn-ghost" data-act="batch-add" type="button">+ Add another sample</button>
              ${rejectedSamples.length ? `
                <button class="ste-btn ste-btn-ghost" data-act="open-resubmit-picker" type="button">
                  + Add rejected samples
                  ${rejectedNotInDraft.length ? `<span class="ste-badge ste-badge-err" style="margin-left:6px">${rejectedNotInDraft.length}</span>` : ''}
                </button>` : ''}
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              <span class="ste-mini" style="color:var(--ste-muted)">${batchDraft.items.filter(r => r.code && r.name).length} of ${batchDraft.items.length} ready</span>
              <button class="ste-btn ste-btn-primary" data-act="batch-submit" type="button">Submit batch (${batchDraft.items.filter(r => r.code && r.name).length})</button>
            </div>
          </div>
        </div>
      </div>`;

    // Field input → mutate the row.
    $$("[data-bf]", root).forEach(inp => {
      const evt = inp.tagName === "INPUT" ? "input" : "change";
      inp.addEventListener(evt, () => {
        const [rowI, key] = inp.getAttribute("data-bf").split("|");
        // Pull the latest draft from session, NOT from the closure — the
        // closure's `batchDraft` is the snapshot at render time and goes
        // stale after the very first edit. Re-reading on every event keeps
        // multi-field edits cumulative instead of clobbering each other.
        const sess = STE.getSession() || {};
        const items = ((sess.mirrorBatchDraft && sess.mirrorBatchDraft.items) || batchDraft.items).slice();
        items[parseInt(rowI)] = { ...items[parseInt(rowI)], [key]: inp.value };
        STE.setSession({ ...sess, mirrorBatchDraft: { items } });
      });
    });
    // Shared helper — copies one previously-submitted sample record into
    // the draft batch as a remade resubmission. Skips anything already in
    // the draft so re-clicking from the modal doesn't duplicate rows.
    function _addSampleRecordsToDraft(records) {
      const sess = STE.getSession() || {};
      const cur = ((sess.mirrorBatchDraft && sess.mirrorBatchDraft.items) || batchDraft.items).slice();
      const inDraft = new Set(cur.map(r => r.code).filter(Boolean));
      const lastIdx = cur.length - 1;
      if (lastIdx >= 0 && !cur[lastIdx].code && !cur[lastIdx].name) cur.pop();
      let added = 0;
      records.forEach(src => {
        if (inDraft.has(src.code)) return;
        cur.push({
          code: src.code, name: src.name, line: src.line,
          garmentType: src.garmentType || "TRACKTOP",
          gender: src.gender || "M",
          tier: src.tier || "T1",
          type: "REMADE",
          fabric: src.fabric || "",
        });
        inDraft.add(src.code);
        added++;
      });
      STE.setSession({ ...sess, mirrorBatchDraft: { items: cur } });
      return added;
    }
    // Open the resubmit picker modal — banner button + "+ Add from previous
    // samples" both bind to this. Scoped to REJECTED samples only — items
    // still in progress aren't actionable (the licensee can't pre-emptively
    // resubmit an in-progress sample).
    function openResubmitPicker() {
      const makeModal = window.STEScreens && window.STEScreens.makeModal;
      const closeModal = window.STEScreens && window.STEScreens.closeModal;
      if (!makeModal || !closeModal) return;
      const records = rejectedSamples;
      const selected = new Set();
      let query = "";

      function renderRows(panel) {
        const rows = records.filter(r => {
          if (_draftCodes.has(r.code)) return true;
          if (!query) return true;
          const hay = `${r.code} ${r.name || ""} ${r.line || ""} ${r.type || ""}`.toLowerCase();
          return hay.includes(query);
        });
        const list = panel.querySelector("[data-rp-list]");
        if (!list) return;
        if (!rows.length) {
          list.innerHTML = `<div class="ste-mini" style="padding:24px;text-align:center;color:var(--ste-muted)">${records.length === 0 ? "No rejected samples to resubmit." : "No matches."}</div>`;
          return;
        }
        list.innerHTML = rows.map(r => {
          const lastRound = Array.isArray(r.rounds_history) ? r.rounds_history[r.rounds_history.length - 1] : null;
          const lastComment = (lastRound && (lastRound.comment_kr || lastRound.comment_en)) || "";
          const truncated = lastComment.length > 100 ? lastComment.slice(0, 98) + "…" : lastComment;
          const inDraft = _draftCodes.has(r.code);
          const checked = selected.has(r.code);
          return `
            <label class="ste-resubmit-row ${inDraft ? 'is-disabled' : ''} ${checked ? 'is-selected' : ''}" data-rp-row="${escape(r.code)}">
              <input type="checkbox" data-rp-cb value="${escape(r.code)}" ${checked ? 'checked' : ''} ${inDraft ? 'disabled' : ''}>
              <span class="ste-resubmit-row-main">
                <span class="ste-resubmit-row-hd">
                  <span class="ste-code">${escape(r.code)}</span>
                  <strong>${escape(r.name || '—')}</strong>
                  <span class="ste-status-chip ste-insp-status-err">REJECTED</span>
                  <span class="ste-mini">${escape(r.line || '—')} · ${escape(r.type || '—')} · Round ${r.rounds || 0}</span>
                </span>
                ${truncated ? `<span class="ste-mini ste-resubmit-row-comment">${escape(truncated)}</span>` : ''}
                ${inDraft ? `<span class="ste-mini" style="color:var(--ste-muted)">Already in this batch</span>` : ''}
              </span>
            </label>`;
        }).join("");
      }
      function updateFooter(panel) {
        const fb = panel.querySelector("[data-rp-foot-count]");
        const btn = panel.querySelector("[data-rp-add]");
        if (fb) fb.textContent = selected.size ? `${selected.size} selected` : "Nothing selected yet";
        if (btn) {
          btn.disabled = selected.size === 0;
          btn.textContent = selected.size ? `Add ${selected.size} to batch` : "Add to batch";
        }
      }
      const body = `
        <div class="ste-resubmit-modal" data-rp-modal>
          <div class="ste-mini" style="color:var(--ste-muted)">Pick the rejected samples you've remade so HQ can re-review them in this batch.</div>
          <div class="ste-resubmit-search">
            <input class="ste-input" type="search" placeholder="Search Style Code, name, line…" data-rp-q>
            <button class="ste-btn ste-btn-link" type="button" data-rp-all>Select all visible</button>
          </div>
          <div class="ste-resubmit-list" data-rp-list></div>
          <div class="ste-resubmit-foot">
            <span class="ste-mini" data-rp-foot-count>Nothing selected yet</span>
          </div>
        </div>`;
      const m = makeModal("Add from rejected samples", body, [
        { label: "Cancel", kind: "ghost", onClick: () => closeModal(m) },
        { label: "Add to batch", kind: "primary", onClick: () => {
            const picks = [];
            selected.forEach(code => {
              const src = all.find(r => r.code === code && r.licenseeId === myLicId);
              if (src) picks.push(src);
            });
            const added = _addSampleRecordsToDraft(picks);
            closeModal(m);
            if (added > 0) STEApp.toast(`Added ${added} sample${added === 1 ? "" : "s"} to the batch.`, "success");
            mirror();
          } },
      ]);
      const addBtn = m.querySelector(".ste-modal-foot .ste-btn-primary");
      if (addBtn) addBtn.setAttribute("data-rp-add", "1");

      const qInput = m.querySelector("[data-rp-q]");
      if (qInput) qInput.addEventListener("input", () => { query = qInput.value.trim().toLowerCase(); renderRows(m); });
      m.querySelector("[data-rp-all]")?.addEventListener("click", () => {
        m.querySelectorAll("[data-rp-cb]:not(:disabled)").forEach(cb => {
          cb.checked = true; selected.add(cb.value);
          cb.closest(".ste-resubmit-row")?.classList.add("is-selected");
        });
        updateFooter(m);
      });
      m.addEventListener("change", (ev) => {
        const cb = ev.target.closest("[data-rp-cb]");
        if (!cb) return;
        if (cb.checked) selected.add(cb.value); else selected.delete(cb.value);
        cb.closest(".ste-resubmit-row")?.classList.toggle("is-selected", cb.checked);
        updateFooter(m);
      });

      renderRows(m);
      updateFooter(m);
    }
    // Both the banner and the toolbar button open the picker.
    $$("[data-act='open-resubmit-picker']", root).forEach(b => {
      b.addEventListener("click", openResubmitPicker);
    });
    // Add row
    $("[data-act='batch-add']", root)?.addEventListener("click", () => {
      const items = batchDraft.items.concat([_emptySampleRow()]);
      STE.setSession({ ...STE.getSession(), mirrorBatchDraft: { items } });
      mirror();
    });
    // Download a blank CSV template matching the batch composer's columns,
    // with a couple of example rows so the licensee can see the expected
    // dropdown values. Generated client-side — no static file to maintain.
    $("[data-act='batch-template']", root)?.addEventListener("click", () => {
      // Header column names mirror the batch table on this page.
      // "Style Code" matters specifically — parseSheet upstream requires a
      // header that contains "code" so the upload handler can locate the
      // identifier column; the older "SKU" header silently failed parsing.
      const headers = ["Style Code","Style Name","Line","Garment","Gender","Tier","Type","Fabric"];
      const rows = [
        ["41950","ATLAS TRACK JACKET","ATLAS","TRACK JACKET","M","T1","NEW","NYLON STRETCH 88% PA 12% EA"],
        ["41951","ATLAS TRACK PANT","ATLAS","PANTS","M","T1","NEW","NYLON STRETCH 88% PA 12% EA"],
      ];
      downloadCsv("sample-review-template.csv", headers, rows);
    });
    // Upload template — XLSX or CSV with one row per sample. Column headers
    // are matched case-insensitively against the draft row fields (SKU,
    // Style Name, Line, Garment, Gender, Tier, Type, Fabric). Unmatched
    // rows get dropped onto the form's selects with their fallback options.
    $("[data-act='batch-upload']", root)?.addEventListener("click", () => {
      root.querySelector("[data-mr-upload]")?.click();
    });
    root.querySelector("[data-mr-upload]")?.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const rows = await STEValidate.parseSheet(file, ["code"]);
        if (rows.length === 0) { STEApp.toast("No data rows found in the template.", "warn"); return; }
        const find = (obj, ...needles) => {
          const keys = Object.keys(obj);
          for (const n of needles) {
            const k = keys.find(kk => kk.toLowerCase().includes(n));
            if (k) return k;
          }
          return undefined;
        };
        const k0 = rows[0];
        const kCode    = find(k0, "code");
        const kName    = find(k0, "style name", "name");
        const kLine    = find(k0, "line");
        const kGarment = find(k0, "garment");
        const kGender  = find(k0, "gender");
        const kTier    = find(k0, "tier");
        const kType    = find(k0, "type");
        const kFabric  = find(k0, "fabric");
        const newItems = rows
          .filter(r => String(r[kCode] || "").trim())
          .map(r => ({
            code:        String(r[kCode] || "").trim(),
            name:        String(r[kName] || "").trim(),
            line:        String(r[kLine] || "").trim(),
            garmentType: String(r[kGarment] || "").trim().toUpperCase(),
            gender:      String(r[kGender] || "").trim().toUpperCase(),
            tier:        String(r[kTier] || "").trim().toUpperCase(),
            type:        String(r[kType] || "").trim().toUpperCase(),
            fabric:      String(r[kFabric] || "").trim(),
          }));
        if (newItems.length === 0) { STEApp.toast("No sample rows parsed.", "warn"); return; }
        STE.setSession({ ...STE.getSession(), mirrorBatchDraft: { items: newItems } });
        STEApp.toast(`Loaded ${newItems.length} sample${newItems.length===1?'':'s'} from template.`, "success");
        mirror();
      } catch (err) {
        STEApp.toast(`Couldn't parse template: ${err.message || err}`, "warn");
      } finally {
        e.target.value = "";
      }
    });
    // Remove row
    $$("[data-act='batch-rm']", root).forEach(b => b.addEventListener("click", () => {
      const i = parseInt(b.getAttribute("data-row"));
      const items = batchDraft.items.filter((_, idx) => idx !== i);
      if (items.length === 0) items.push(_emptySampleRow());
      STE.setSession({ ...STE.getSession(), mirrorBatchDraft: { items } });
      mirror();
    }));
    // Clear all
    $("[data-act='batch-clear']", root)?.addEventListener("click", () => {
      if (!confirm("Clear all rows in this draft batch?")) return;
      STE.setSession({ ...STE.getSession(), mirrorBatchDraft: { items: [_emptySampleRow()] } });
      mirror();
    });
    // Submit batch — pushes every ready row as a single batch with shared id.
    // Pulls the latest items straight from session so unblurred edits (and
    // any edits made after the closure was captured) are still counted.
    $("[data-act='batch-submit']", root)?.addEventListener("click", () => {
      const sess = STE.getSession() || {};
      const liveItems = (sess.mirrorBatchDraft && sess.mirrorBatchDraft.items) || batchDraft.items;
      const ready = liveItems.filter(r => r.code && r.name);
      if (ready.length === 0) {
        STEApp.toast("Fill in at least one row's Code and Style Name before submitting.", "warn");
        return;
      }
      const batchId = "SB-" + new Date().toISOString().slice(0,10).replace(/-/g,'') + "-" + Math.random().toString(36).slice(2,6).toUpperCase();
      const submittedAt = new Date().toISOString();
      STE.mutate(s => {
        s.sampleRecords = s.sampleRecords || [];
        s.sampleBatches = s.sampleBatches || [];
        ready.forEach(d => {
          s.sampleRecords.unshift({
            code: d.code, name: d.name, line: d.line, garmentType: d.garmentType,
            gender: d.gender, tier: d.tier, type: d.type, fabric: d.fabric,
            rounds: 0, lastResult: "PENDING", season: "26FW", box: "—",
            licenseeId: myLicId, batchId, submittedAt,
          });
        });
        s.sampleBatches.unshift({
          id: batchId,
          licenseeId: myLicId,
          submittedAt,
          itemCodes: ready.map(d => d.code),
        });
      });
      STE.setSession({
        ...STE.getSession(),
        mirrorBatchDraft: { items: [_emptySampleRow()] },
        mirrorOnBehalfLicId: null,
      });
      STEApp.toast(`Batch ${batchId} submitted to HQ — ${ready.length} sample${ready.length===1?'':'s'} added to the review queue.`, "success");
      // Successful submit → return to the list view.
      location.hash = "#/sample-review";
    });

    // HQ on-behalf-licensee picker — switch which licensee owns this batch.
    $("[data-mr-onbehalf]", root)?.addEventListener("change", (e) => {
      STE.setSession({ ...STE.getSession(), mirrorOnBehalfLicId: e.target.value });
      mirror();
    });
    // Cancel button — back to the list view, regardless of HQ vs licensee.
    $$("[data-back-mirror]", root).forEach(b => b.addEventListener("click", (e) => {
      e.preventDefault();
      STE.setSession({
        ...STE.getSession(),
        mirrorOnBehalfLicId: null,
        mirrorBatchDraft: { items: [_emptySampleRow()] },
      });
      location.hash = "#/sample-review";
    }));
  }

  // Bump when the seed shape changes (e.g. new rounds_history field, new
  // photo references) so cached state from a prior version is regenerated.
  const SAMPLE_SEED_VERSION = 4;
  function ensureMirrorSeed() {
    const st = STE.get();
    // Fast-path: if the seeded shape is up to date, skip. We re-seed when
    // there's no data at all OR the version is older than the current one.
    const seeded = st.sampleRecords && st.sampleRecords.length
      && st.sampleBatches && st.sampleBatches.length;
    if (seeded && st._sampleSeedVersion === SAMPLE_SEED_VERSION) return;
    // Real codes from _Movin Feedback on FW26_0423 — line/style/type/CARRYOVER
    // taken from the 26FW SMS Review sheets. 차수 (rounds) approximates how
    // many inspection passes each style went through before final state.
    const items = [
      ["40706","ABELIA JACKET S/L","SAGGIA","TRACKTOP","M","T3","REMADE",11,"APPROVED","30"],
      ["41739","ONCINO JACKET","ONCINO","JACKET","M","T3","REMADE",3,"APPROVED","31"],
      ["41836","PAPAYA TRACK JACKET","PAPAYA","TRACK JACKET","M","T3","REMADE",2,"APPROVED","31"],
      ["41142","FANALI TRACKSUIT","TWILLANDIA","TRACKSUIT","M","NORTH AFRICA","NEW",4,"APPROVED","30"],
      ["41147","AUTO PL PANTS","TWILLANDIA","PANTS","M","NORTH AFRICA","NEW",3,"APPROVED","30"],
      ["41184","ADRENALINA PANTS","ADRENALINA","PANTS","M","NORTH AFRICA","NEW",2,"REJECTED","30"],
      ["40705","ABELIA JACKET","SAGGIA","JACKET","M","T3","CARRY OVER",7,"APPROVED","30"],
      ["40721","ORION 024 TRACKTOP","ORION","TRACKTOP","M","T1","NEW",7,"APPROVED","31"],
      ["40722","ORION 024 PANTS","ORION","PANTS","M","T1","NEW",6,"APPROVED","31"],
      ["40723","SERGIO 024 TRACKTOP","SERGIO","TRACKTOP","M","T1","NEW",6,"APPROVED","31"],
      ["40724","SERGIO 024 PANTS","SERGIO","PANTS","M","T1","NEW",6,"APPROVED","31"],
      ["40760","INNSBRUCK TRACKTOP","INNSBRUCK","TRACKTOP","M","T2","CARRY OVER",3,"REJECTED","31"],
      ["40761","INNSBRUCK HOODIE TRACKTOP","INNSBRUCK","TRACKTOP","M","T2","CARRY OVER",3,"REJECTED","31"],
      ["40762","INNSBRUCK PANTS","INNSBRUCK","PANTS","M","T2","CARRY OVER",3,"APPROVED","31"],
      ["40763","PINETA BEANIE","PINETA","CAP","M","T2","NEW",1,"APPROVED","31"],
      ["40766","SAUCE SWEATER","SAUCE","SWEATER","M","T2","REMADE",2,"REJECTED","30"],
      ["40768","CIPRESSO FLEECE PANTS","CIPRESSO","PANTS","M","T2","NEW",2,"APPROVED","30"],
      ["40817","ISTRICE 024 CAP","ISTRICE","CAP","M","T1","NEW",1,"APPROVED","31"],
      ["40833","FORCHETTA TRACKSUIT","FORCHETTA","TRACKSUIT","M","T2","NEW",1,"APPROVED","30"],
      ["40842","NAYLA 024 CAP","NAYLA","CAP","W","T2","SMU",3,"REJECTED","31"],
      ["40850","PADUA JACKET","PADUA","JACKET","M","T1","NEW",4,"APPROVED","30"],
      ["40851","PADUA PANT","PADUA","PANTS","M","T1","NEW",4,"APPROVED","30"],
      ["40860","TREVI POLO","TREVI","POLO","M","T2","CARRY OVER",2,"APPROVED","30"],
      ["40870","RIVA SHORT","RIVA","SHORTS","M","T2","NEW",2,"REJECTED","31"],
      ["40710","SIMBA CO T-SHIRT","SIMBA","T-SHIRT","M","T2","NEW",2,"REJECTED","30"],
      ["40711","SIMBA HOODIE SWEATER","SIMBA","SWEATER","M","T2","NEW",2,"APPROVED","30"],
      ["40712","SIMBA FLEECE SHORTS","SIMBA","SHORTS","M","T2","NEW",2,"REJECTED","30"],
      ["40713","SIMBA FLEECE PANTS","SIMBA","PANTS","M","T2","NEW",2,"REJECTED","30"],
      // Additional 26FW samples — heavier mix of rejected / multi-round so
      // the history panels and KPI rates feel populated.
      ["41515","ALTERNATIVA FLEECE SHORTS JR","ALTERNATIVA","SHORTS","JR","JR","CARRY OVER",2,"APPROVED","31"],
      ["41699","SHAMS CO POLO US","SHAMS","POLO","M","SMU","SMU",2,"APPROVED","31"],
      ["42010","BORA JACKET W","BORA","JACKET","W","T2","NEW",6,"REJECTED","30"],
      ["42011","BORA PANTS W","BORA","PANTS","W","T2","NEW",5,"REJECTED","30"],
      ["42012","BORA TRACKSUIT M","BORA","TRACKSUIT","M","T2","NEW",4,"REJECTED","31"],
      ["42013","AMBROSIA TRACKSUIT","AMBROSIA","TRACKSUIT","M","T2","NEW",5,"APPROVED","30"],
      ["42014","ADAMANTA JACKET","ADAMANTA","JACKET","M","T1","NEW",7,"REJECTED","30"],
      ["42015","ARCATA T-SHIRT","ARCATA","T-SHIRT","M","T3","REMADE",6,"REJECTED","31"],
      ["42016","AUREA CO T-SHIRT","AUREA","T-SHIRT","W","T2","NEW",3,"REJECTED","30"],
      ["42017","AVENA TRACKSUIT","AVENA","TRACKSUIT","W","T2","NEW",4,"REJECTED","31"],
      ["42018","BRITOP HOODIE SWEATER","BRITOP","SWEATER","M","T1","NEW",5,"REJECTED","30"],
      ["42019","BRUNELLESCHI TRACK JACKET","BRUNELLESCHI","TRACK JACKET","M","T2","CARRY OVER",4,"REJECTED","31"],
      ["42020","CAMARINDO PL T-SHIRT","CAMARINDO","T-SHIRT","M","T2","NEW",3,"REJECTED","30"],
      ["42021","CAMARINDO TRACKTOP","CAMARINDO","TRACKTOP","M","T2","NEW",4,"REJECTED","31"],
      ["42022","BOSTON POLO W","BOSTON","POLO","W","T3","NEW",2,"REJECTED","30"],
      ["42023","BOSTON SHORTS W","BOSTON","SHORTS","W","T3","NEW",3,"REJECTED","30"],
      // Pending samples — submitted by licensees but HQ hasn't reviewed
      // them yet. Status reads "Under Review" and they show up in the
      // default inspection queue.
      ["42030","SERGIO 026 TRACKTOP","SERGIO","TRACKTOP","M","T1","NEW",0,"PENDING","32"],
      ["42031","SERGIO 026 PANTS","SERGIO","PANTS","M","T1","NEW",0,"PENDING","32"],
      ["42032","KRONOS POLO","KRONOS","POLO","M","T2","NEW",0,"PENDING","32"],
      ["42033","KRONOS SHORTS","KRONOS","SHORTS","M","T2","NEW",0,"PENDING","32"],
      ["42034","NAYLA HOODIE","NAYLA","SWEATER","W","T2","NEW",0,"PENDING","32"],
      ["42035","FORCHETTA TRACK JACKET","FORCHETTA","TRACK JACKET","M","T2","CARRY OVER",0,"PENDING","32"],
      ["42036","ATLAS 026 POLO","ATLAS","POLO","M","T1","NEW",0,"PENDING","32"],
      ["42037","ATLAS 026 SHORTS","ATLAS","SHORTS","M","T1","NEW",0,"PENDING","32"],
    ];
    // KR/EN comment pool pulled directly from the Movin 26FW corpus so the
    // round history demo has authentic-looking feedback the licensee can
    // actually read.
    const SEED_KR_COMMENTS = [
      ["목둘레가 너무 좁고 카라가 뒤집어지는 현상이 있으니, 핏과 봉제 구조를 조정해 주세요.",
       "The neck circumference is too tight and the collar is flipping over; please adjust both fit and construction."],
      ["상단 지퍼 좌우 높이가 맞지 않으므로 정렬을 수정해 주세요.\n자수 퀄리티를 개선해 주세요.\n밑단 지퍼 좌우가 맞지 않으므로 동일하게 맞춰 주세요.",
       "The left and right heights of the upper zipper are not aligned; please correct the alignment.\nPlease improve the embroidery quality.\nThe left and right bottom zippers are not aligned; please match them equally."],
      ["봉제선이 고르지 않습니다. 정렬을 수정해 주세요.",
       "The stitching is uneven. Please correct the alignment."],
      ["프린트 위치가 어긋났습니다. 정확히 맞춰 주세요.",
       "The print is misaligned. Please position it precisely."],
      ["색상이 견본과 다릅니다. 컬러를 맞춰 주세요.",
       "The color does not match the swatch. Please align the color."],
      ["패턴 라인이 좌우 대칭이 맞지 않습니다. 다시 작업해 주세요.",
       "The pattern lines are not symmetrical left to right. Please rework."],
    ];
    // Real Movin inspection photos copied into the prototype's assets.
    // Cycled through deterministically per round so the same SKU always
    // shows the same set across reloads.
    const SEED_PHOTO_POOL = [
      "assets/sample-photos/26FW/ABELIA_JACKET_S_L5049/r08_01.png",
      "assets/sample-photos/26FW/ABELIA_JACKET_S_L5049/r08_02.png",
      "assets/sample-photos/26FW/ABELIA_JACKET_S_L5049/r08_03.png",
      "assets/sample-photos/26FW/ABELIA_JACKET_S_L5049/r11_01.png",
      "assets/sample-photos/26FW/ABELIA_JACKET_S_L5049/r11_02.png",
      "assets/sample-photos/26FW/ABELIA_JACKET_S_L5049/r11_03.png",
      "assets/sample-photos/26FW/AGNONE_PL_SHORTS_5037/r04_01.png",
      "assets/sample-photos/26FW/AGNONE_PL_SHORTS_5037/r04_02.png",
      "assets/sample-photos/26FW/AGNONE_PL_SHORTS_5037/r10_01.png",
      "assets/sample-photos/26FW/AMBROSIA_TRACKSUIT/r05_01.png",
      "assets/sample-photos/26FW/AMBROSIA_TRACKSUIT/r05_02.png",
      "assets/sample-photos/26FW/AMBROSIA_TRACKSUIT/r05_03.png",
      "assets/sample-photos/26FW/ARCATA_T-SHIRT/r06_01.png",
      "assets/sample-photos/26FW/ARCATA_T-SHIRT/r06_02.png",
      "assets/sample-photos/26FW/ARCATA_T-SHIRT/r06_03.png",
      "assets/sample-photos/26FW/BORA_JACKET_W/r06_01.png",
      "assets/sample-photos/26FW/BORA_TRACKSUIT6079/r09_01.png",
      "assets/sample-photos/26FW/ONCINO_JACKET2055/r11_01.png",
      "assets/sample-photos/26FW/ONCINO_JACKET2055/r11_02.png",
      "assets/sample-photos/26FW/ONCINO_JACKET2055/r11_03.png",
      "assets/sample-photos/26FW/PAPAYA_TRACK_JACKET2005/r08_01.png",
      "assets/sample-photos/26FW/PAPAYA_TRACK_JACKET2005/r08_02.png",
      "assets/sample-photos/26FW/PAPAYA_TRACK_JACKET2005/r08_03.png",
      "assets/sample-photos/26FW/PAPAYA_TRACK_JACKET2005/r11_01.png",
      "assets/sample-photos/26FW/PAPAYA_TRACK_JACKET2005/r11_02.png",
    ];
    function _seedPhotos(code, roundNo, count) {
      const base = (code.charCodeAt(0) * 7 + roundNo * 3) % SEED_PHOTO_POOL.length;
      const out = [];
      for (let k = 0; k < count; k++) out.push(SEED_PHOTO_POOL[(base + k) % SEED_PHOTO_POOL.length]);
      return out;
    }
    // Build a synthetic rounds_history per item — for items that ended
    // APPROVED with rounds > 1, the prior rounds are REJECTED with KR
    // comments; the final round is APPROVED with no comment. For items
    // still REJECTED, every round is REJECTED.
    function buildHistory(code, totalRounds, lastResult) {
      if (!totalRounds || totalRounds < 1) return [];
      const hist = [];
      const baseTime = new Date("2025-12-01T10:00:00Z").getTime();
      for (let i = 0; i < totalRounds; i++) {
        const isFinal = i === totalRounds - 1;
        const result = (isFinal && lastResult === "APPROVED") ? "APPROVED" : "REJECTED";
        const day = baseTime + (i + 1) * 14 * 86400000; // ~bi-weekly cadence
        const cmtIdx = (code.charCodeAt(0) + i) % SEED_KR_COMMENTS.length;
        const [kr, en] = result === "REJECTED" ? SEED_KR_COMMENTS[cmtIdx] : ["", ""];
        const imgs = result === "REJECTED" ? _seedPhotos(code, i + 1, 3) : [];
        hist.push({
          round_no: i + 1,
          result,
          decision_at: new Date(day).toISOString(),
          decision_by: "HQ Reviewer",
          comment_kr: kr,
          comment_en: en,
          images: imgs,
        });
      }
      return hist;
    }
    const baseRecords = items.map(([code,name,line,garmentType,gender,tier,carryover,rounds,lastResult,box]) => ({
      code, name, line, garmentType, gender, tier, type: carryover, rounds, lastResult, box, season: "26FW",
      rounds_history: buildHistory(code, rounds, lastResult),
    }));

    // Distribute records across batches that cover every status case.
    // Pick the first licensee per region so the seed works regardless of
    // ID specifics — fall back to lic_75f7462d (Best of Britain) if needed.
    const lics = (st.licensees || []);
    const lic = (i) => (lics[i] && lics[i].id) || "lic_75f7462d";
    // Helper to build (batchId, submittedAt) and tag records.
    const isoDaysAgo = (d) => {
      const t = new Date(); t.setDate(t.getDate() - d); return t.toISOString();
    };
    const partition = (arr, sizes) => {
      const out = []; let pos = 0;
      sizes.forEach(n => { out.push(arr.slice(pos, pos + n)); pos += n; });
      if (pos < arr.length) out[out.length - 1] = out[out.length - 1].concat(arr.slice(pos));
      return out;
    };
    // Partition the 28 records into 5 batches with intentional status mix.
    // All-Approved batch first (so the seed has clean rows up top), then
    // Partial, Under-Review, Partial, All-Approved.
    const allApproved   = baseRecords.filter(r => r.lastResult === "APPROVED").slice();
    const allRejected   = baseRecords.filter(r => r.lastResult === "REJECTED").slice();
    const allPending    = baseRecords.filter(r => r.lastResult === "PENDING").slice();
    // Spread every base record across batches so the full pool surfaces to
    // licensees. Each batch leads with rejected + pending items so the
    // active inspection queue is visible; approved fills the remainder.
    const _take = (arr, n) => arr.splice(0, n);
    const b1 = _take(allPending, 2).concat(_take(allRejected, 4)).concat(_take(allApproved, 2));  // BoB
    const b2 = _take(allPending, 2).concat(_take(allRejected, 4)).concat(_take(allApproved, 3));  // Sugi SAS
    const b3 = _take(allPending, 1).concat(_take(allRejected, 4)).concat(_take(allApproved, 3));  // Sugi Footwear
    const b4 = _take(allPending, 1).concat(_take(allRejected, 4)).concat(_take(allApproved, 3));  // Benjamin
    const b5 = _take(allPending, 1).concat(_take(allRejected, 3)).concat(_take(allApproved, 3));  // BDS
    const b6 = _take(allPending, 1).concat(_take(allRejected, 3)).concat(_take(allApproved, 4))   // BoB second
              .concat(allPending).concat(allRejected).concat(allApproved);                          // anything left
    // Empty batch — just submitted, no items reviewed yet.
    const emptyBatchId = "SB-20260520-EMPT";
    const batchSpecs = [
      { id: "SB-20260415-AAAA", licenseeIdx: 0, dayOffset: 42, items: b1 },  // BoB
      { id: "SB-20260428-BBBB", licenseeIdx: 1, dayOffset: 29, items: b2 },  // Sugi SAS
      { id: "SB-20260505-CCCC", licenseeIdx: 2, dayOffset: 22, items: b3 },  // Sugi Footwear
      { id: "SB-20260512-DDDD", licenseeIdx: 3, dayOffset: 15, items: b4 },  // Benjamin
      { id: "SB-20260519-EEEE", licenseeIdx: 4, dayOffset:  8, items: b5 },  // BDS
      { id: "SB-20260522-FFFF", licenseeIdx: 0, dayOffset:  3, items: b6 },  // BoB second batch
    ];
    const records = [];
    const batches = [];
    batchSpecs.forEach(spec => {
      const submittedAt = isoDaysAgo(spec.dayOffset);
      const licenseeId = lic(spec.licenseeIdx);
      spec.items.forEach(r => {
        records.push({ ...r, batchId: spec.id, licenseeId, submittedAt });
      });
      batches.push({
        id: spec.id,
        licenseeId,
        submittedAt,
        itemCodes: spec.items.map(r => r.code),
      });
    });
    // Empty batch — appears as "Empty" status; e.g. a freshly created draft
    // that was submitted with no rows (edge case to show the status pill).
    batches.unshift({
      id: emptyBatchId,
      licenseeId: lic(4),
      submittedAt: isoDaysAgo(1),
      itemCodes: [],
    });

    STE.mutate(s => {
      s.sampleRecords = records;
      s.sampleBatches = batches;
      s._sampleSeedVersion = SAMPLE_SEED_VERSION;
    });
  }

  // ============================ CODEX ============================
  // Default Brand Guide content seeded if state.brandGuide is missing.
  // Stored as raw HTML — rendered as-is in view mode, editable in a textarea
  // in edit mode. This is what HQ reads AND what gets handed to the AI when
  // grading design submissions, so keep it concrete, measurable, and citation-rich.
  const DEFAULT_BRAND_GUIDE_HTML = `
<h2>Why this rubric</h2>
<p>Not subjective design judgment — 60 years of heritage and every principle in Brandbook 2026, quantified into one repeatable engine: an <strong>8 Absolute No's</strong> hard gate plus <strong>5 weighted pillars</strong> (26 sub-rules), resolved into a single A/B/C/D verdict. Licensees, HQ, and the AI grader reach the same conclusion from the same criteria.</p>
<ul>
<li><strong>8</strong> Absolute No's — Brandbook explicit prohibitions, scored Pass / Fail</li>
<li><strong>5</strong> pillars · <strong>26</strong> sub-rules, each scored 0 / 0.5 / 1.0</li>
<li><strong>P2 ×2</strong> — Elegant Functionalism is double-weighted</li>
<li><strong>100%</strong> reproducibility — same design, same result</li>
</ul>
<p><strong>Audience:</strong> licensee designers (design within these rails), HQ reviewers (cite these clauses in feedback), the AI grader (this text is the system-prompt context — every rule here is enforceable).</p>

<h2>Evaluation flow</h2>
<p>Three stages, run in order. If the Gate fails, pillar scoring is skipped and the verdict is immediately D.</p>
<ol>
<li><strong>Stage 1 · Gate</strong> — 8 Absolute No's, each Pass / Fail. Any single Fail → Verdict D.</li>
<li><strong>Stage 2 · Pillars</strong> — 5 pillars × sub-rules, each sub-rule 0 / 0.5 / 1.0. Pillar score = (sum ÷ sub-rule count) × 100.</li>
<li><strong>Stage 3 · Aggregation</strong> — weighted total → A / B / C / D verdict.</li>
</ol>

<h2>Stage 1 · 8 Absolute No · Gate (Pass / Fail)</h2>
<p>Brandbook explicit prohibitions, measured at the CAD stage. <strong>Any single Fail forces Verdict D</strong> and skips pillar scoring.</p>
<h3>AN1 · Not a Street Brand</h3>
<p>(a) No simultaneous street codes — oversized + large graphic print + cargo·drawcord, any 2 of 3 = Fail. (b) No slang / meme text graphics. <em>Brandbook p.10 — ABSOLUTE NO #1.</em></p>
<h3>AN2 · No Discount Growth</h3>
<p>(a) Tech Pack states a full-price policy. (b) No Promo / Sale-only line labels. (c) No discount-planned label within 6 weeks of season launch. <em>Brandbook p.10 — ABSOLUTE NO #2.</em></p>
<h3>AN3 · No Logo Mania</h3>
<p>(a) Center-front logo max edge length &lt; 6.0 cm. (b) Logo appearances per garment ≤ 3. (c) Logo area within a single panel ≤ 5%. <em>Brandbook p.10 — ABSOLUTE NO #3.</em></p>
<h3>AN4 · No Y2K Reliance</h3>
<p>No simultaneous Y2K codes — metallic finish + full velvet tracksuit + ultra-mini, any 2 of 3 = Fail. <em>Brandbook p.10 — ABSOLUTE NO #4.</em></p>
<h3>AN5 · No Style Without Function</h3>
<p>Every decorative detail in the drawing carries a function label. Zero unlabelled decoration. <em>Brandbook p.10 — ABSOLUTE NO #5.</em></p>
<h3>AN6 · No Short-term Hype</h3>
<p>Limited-campaign / meme-motif Style Code share ≤ 10%. <em>Brandbook p.10 — ABSOLUTE NO #6.</em></p>
<h3>AN7 · Beyond Athlete</h3>
<p>Competition-only silhouette Style Code share ≤ 30%. <em>Brandbook p.10 — ABSOLUTE NO #7.</em></p>
<h3>AN8 · No Oversized</h3>
<p>Shoulder Drop limits — Court ≤ 4 cm · Athleisure ≤ 6 cm · Classic ≤ 8 cm. <em>Brandbook p.10 — ABSOLUTE NO #8.</em></p>

<h2>Stage 2 · 5 Pillars (sub-score 0 / 0.5 / 1.0)</h2>
<p>1.0 = fully met · 0.5 = partial · 0 = not met. Each pillar's score = (sum of its sub-scores ÷ sub-rule count) × 100, checked against its pass threshold.</p>

<h2>P1 · Italian Tennis Heritage</h2>
<p><strong>Pass threshold 60 · Weight ×1 · 5 sub-rules</strong></p>
<blockquote>"The iconic tennis brand that first brought style to the court — heritage reinterpreted into a modern, functional wellness lifestyle."</blockquote>
<h3>P1.1 · Tennis-first Origin</h3>
<p>Tennis is ST's origin. Every design must carry at least one court code embedded in the construction. <strong>Measure:</strong> ≥ 1 court code (racket·court-line / pleated skirt / polo collar / white base). <em>Brandbook p.1 — We Are.</em></p>
<h3>P1.2 · Beyond Athlete</h3>
<p>Tennis is our origin, but lifestyle is our language — no athlete-only / competitive-only expression. <strong>Measure:</strong> ≥ 1 non-competition scene in Scene Mapping (café · social · travel). <em>Brandbook p.10 — ABSOLUTE NO #7.</em></p>
<h3>P1.3 · Damarindo Signature</h3>
<p>Use heritage line graphics like the Damarindo stripe (signature double-stripe) preferentially. <strong>Measure:</strong> ≥ 1 heritage signature (Damarindo stripe / Caribbean palette / 1980s track line). <em>Brandbook p.9 — Detail.</em></p>
<h3>P1.4 · No Y2K Reliance</h3>
<p>Heritage is not nostalgia — no Y2K retro-costume borrowing. Contemporary reinterpretation only. <strong>Measure:</strong> standalone Y2K code share ≤ 20% (metallic·velvet·low-rise combined). <em>Brandbook p.10 — ABSOLUTE NO #4.</em></p>
<h3>P1.5 · Italian First Layer</h3>
<p>Italian Tennis is the primary layer. Domestic tennis (Wimbledon, Roland Garros, etc.) is a secondary layer only. <strong>Measure:</strong> ≥ 1 of Italian Court graphic / Italian flag colours / Italic script font.</p>

<h2>P2 · Elegant Functionalism (Weight ×2)</h2>
<p><strong>Pass threshold 70 · Weight ×2 · 6 sub-rules</strong></p>
<blockquote>"Premium functionality defines today's court attitude and extends it into a more active, timeless everyday life — refined social living."</blockquote>
<p><strong>Weight ×2</strong> — a P2 failure pulls the overall grade harder than P1/P3/P4/P5.</p>
<h3>P2.1 · Natural Face / Performance Core</h3>
<p>Exterior is natural hand-feel · durability · moisture-wicking. Pure natural fiber + high-function poly/elastane structure. <strong>Measure:</strong> matte/natural surface + documented dual-construction (inner performance + outer natural). <em>Brandbook p.5 — Fabric Rules.</em></p>
<h3>P2.2 · Surface Aesthetics</h3>
<p>No shiny nylon · no high-gloss fabric. Moderate texture + layered knit feel (high-density piqué, tech-knit). <strong>Measure:</strong> Gloss Index ≤ Moderate (Pantone Gloss scale ≤ 30) + No-shiny label. <em>Brandbook p.5 — Surface.</em></p>
<h3>P2.3 · Hidden Performance</h3>
<p>Invisible Tech — exterior natural, interior dual-layer sweat-wicking · quick-dry · stretch — hidden. <strong>Measure:</strong> ≥ 1 of Hidden zip / Bonded seam / Concealed vent / Inner mesh. <em>Brandbook p.5 — Hidden Performance.</em></p>
<h3>P2.4 · Composition Standards (per CORE)</h3>
<p><strong>Court Active</strong> Poly 60–85% · <strong>Active Athleisure</strong> Poly 40–65% / Cotton 15–40% · <strong>Active Classic</strong> Cotton 30–60% · Elastane <strong>always</strong> 3–15%. <em>Brandbook p.6 — Composition Std.</em></p>
<h3>P2.5 · Mandatory Function</h3>
<p>Wicking · Stretch · Lightweight construction required across all COREs. Active Classic adds Pilling Resist + Color Fastness. <strong>Measure:</strong> all function labels present (Wicking · Stretch · Lightweight; +Pilling Resistance for Active Classic). <em>Brandbook p.6 — Surface &amp; Function.</em></p>
<h3>P2.6 · No Style Without Function</h3>
<p>Functionless styling is rejected — form-only designs are out. The strength is <em>elegantly functional</em>. <strong>Measure:</strong> every decorative detail mapped 1:1 to a function label (zero unlabelled). <em>Brandbook p.10 — ABSOLUTE NO #5.</em></p>

<h2>P3 · Court-to-Social Lifestyle</h2>
<p><strong>Pass threshold 60 · Weight ×1 · 4 sub-rules</strong></p>
<blockquote>"Athleisure lens — flowing seamlessly from court to social life, expressed as lifestyle wear."</blockquote>
<h3>P3.1 · Court Active (Energetic Active)</h3>
<p>Tennis / court-based active. Innovative + semi-performance fabric. On/off court movement, confidence, shared moments. <strong>Measure:</strong> when CORE = Court Active, ≥ 1 Energetic Active code (performance shell · UV · side mesh). <em>Brandbook p.2 — Court Active.</em></p>
<h3>P3.2 · Active Athleisure (Performance × Elegance)</h3>
<p>Beyond the studio — premium / functional pieces. Seamless transition from indoor activity to gathering. Refined social lifestyle. <strong>Measure:</strong> when CORE = Active Athleisure, ≥ 1 Performance × Elegance balance code (tailored cut + stretch fabric). <em>Brandbook p.3 — Active Athleisure.</em></p>
<h3>P3.3 · Active Classic (Functional Heritage)</h3>
<p>Elegant knit + modern athletic sensibility. Clean lines · timeless heritage codes. <strong>Measure:</strong> when CORE = Active Classic, heritage detail (polo collar·chino fit·knit trim) + functional yarn. <em>Brandbook p.4 — Active Classic.</em></p>
<h3>P3.4 · Scene Mapping</h3>
<p>Every design must map explicitly to one of the three COREs (Court / Athleisure / Classic). Unmapped designs are rejected. <strong>Measure:</strong> Tech Pack states ≥ 2 wear scenarios.</p>

<h2>P4 · Body-Lined Silhouette</h2>
<p><strong>Pass threshold 60 · Weight ×1 · 5 sub-rules</strong></p>
<blockquote>"The silhouette reveals an active body with restraint — social, not sporty. Clean lines and controlled fit create quiet sensuality and refined confidence, never overt."</blockquote>
<h3>P4.1 · Protect &amp; Support · Space and Shoulder Line</h3>
<p>Adequate space between body and garment · natural wellness-lifestyle contour · properly fitted shoulder line for dignified movement. <strong>Measure:</strong> Shoulder Drop ≤ 4 cm (Court) / 6 cm (Athleisure) / 8 cm (Classic). <em>Brandbook p.7 — Protect &amp; Support.</em></p>
<h3>P4.2 · Active-Ready · Range of Motion</h3>
<p>Tennis swing freedom + depth on bending/sitting. First wear should read as "dressy yet functional". <strong>Measure:</strong> documented swing freedom ≥ 120° + bending depth ≥ 5 cm. <em>Brandbook p.7 — Active-Ready.</em></p>
<h3>P4.3 · Length Balance · Proportion</h3>
<p>Skirt-to-pant length proportion must balance. "Too short" or "too loose" breaks elegance = violation. <strong>Measure:</strong> skirts knee −15 ~ +5 cm · pants inseam within defined range · tops at hip-line ±5 cm. <em>Brandbook p.7 — Length Balance.</em></p>
<h3>P4.4 · Not Oversized</h3>
<p>Silhouettes are never excessive. Fit is comfortable yet composed — tailored, balanced, elegant. <strong>Measure:</strong> AN8 passed + chest ease ≤ body chest +12 cm. <em>Brandbook p.10 — ABSOLUTE NO #8 (No Oversized).</em></p>
<h3>P4.5 · Restraint, Not Overt</h3>
<p>Quiet sensuality · refined confidence · never overt. No Second-Skin compression. No excessive exposure / deep V / high slit. No S-line / hourglass marketing language. <strong>Measure:</strong> neckline ≤ collarbone +8 cm · slit ≤ knee +5 cm · no Second Skin fit.</p>

<h2>P5 · Quiet Performance</h2>
<p><strong>Pass threshold 60 · Weight ×1 · 6 sub-rules</strong></p>
<blockquote>"Details matter — not for excess decoration but for purpose. Standard: Simple, Basic, but Functional."</blockquote>
<h3>P5.1 · Quiet Luxury Color</h3>
<p>Allowed palette: <strong>Deep Navy · Quiet Light Blue · Ecru (ivory/beige) · Muted Burgundy · Brown · Forest Green</strong>. Tone-on-Tone &amp; refined point-color standard. <strong>Measure:</strong> defined 6-colour palette share ≥ 70%. <em>Brandbook p.8 — Color Palette.</em></p>
<h3>P5.2 · No Strong / Bright Color</h3>
<p>No neon · no bold primaries · no excessive saturation. Refined restraint first. <strong>Measure:</strong> Neon · Pure Primary share (HSV: S &gt; 80% &amp; V &gt; 90%) = 0%. <em>Brandbook p.8.</em></p>
<h3>P5.3 · Refined Decorative</h3>
<p>No excess graphics, logos, or patches. Every detail must answer <em>"Why is this detail necessary?"</em> with a functional answer. <strong>Measure:</strong> every decoration carries a "Why necessary?" answer label. <em>Brandbook p.9 — Refined Decorative.</em></p>
<h3>P5.4 · No Logo Mania</h3>
<p>Logo is purpose, not decoration. No large center-chest logos. Side / outer minimal placement / Tone-on-Tone preferred. <strong>Measure:</strong> AN3 passed + only side/outer logo placement, no large center-front. <em>Brandbook p.10 — ABSOLUTE NO #3.</em></p>
<h3>P5.5 · Premium Artwork — Logo Application (3 only)</h3>
<p>Logo application is limited to: <strong>(1) Matte Raised Rubber Print · (2) Embossed Embroidery · (3) Clean &amp; Textured Printed</strong>. All other application methods are prohibited. <em>Brandbook p.9 — Premium Artwork.</em></p>
<h3>P5.6 · Not a Street Brand</h3>
<p>No streetwear trend / hype-cycle chasing. Refined activewear is the foundation. <strong>Measure:</strong> AN1 passed + street graphic (slang·tag·character) area ≤ 3%. <em>Brandbook p.10 — ABSOLUTE NO #1.</em></p>

<h2>Stage 3 · Aggregation &amp; Verdict</h2>
<p><strong>Weighted Total = (P1 + 2·P2 + P3 + P4 + P5) ÷ 6</strong> — Elegant Functionalism (P2) counts double, so a P2 miss pulls the grade harder than any other pillar.</p>
<p>Pillar pass thresholds: P1 ≥ 60 · <strong>P2 ≥ 70</strong> · P3 ≥ 60 · P4 ≥ 60 · P5 ≥ 60. A pillar below its threshold caps the verdict at D regardless of the weighted total.</p>
<h3>A · Excellent</h3>
<p>All Absolute No's pass · all pillars pass · P2 ≥ 85 · Weighted ≥ 85. → Proceed to sample immediately.</p>
<h3>B · Pass</h3>
<p>All Absolute No's pass · all pillars pass · Weighted 70–84. → Minor refinement, then proceed.</p>
<h3>C · Conditional</h3>
<p>All Absolute No's pass · all pillars pass · Weighted 60–69. → Re-CAD Review required.</p>
<h3>D · Fail</h3>
<p>Any Absolute No violation · or any pillar below its threshold · or Weighted &lt; 60. → Return to Brief.</p>

<h2>How the AI grades</h2>
<p>Not just an AI response — every step passes through explicit, quantitative rules and leaves a human-reviewable trail.</p>
<ol>
<li><strong>STEP 1 · PDF Parsing</strong> — auto-extract Style Codes, fabrics, and colors from the licensee CAD package.</li>
<li><strong>STEP 2 · Gate Check</strong> — run the 8 Absolute No's Pass / Fail. Any Fail returns Verdict D and skips the rest.</li>
<li><strong>STEP 3 · Composition &amp; Color</strong> — P2.4 composition % check (Brandbook p.6 table) and P5.1 TCX color auto-mapped to the six allowed Sergio Tacchini colors.</li>
<li><strong>STEP 4 · Pillar Scoring</strong> — apply the 5 pillars × sub-rules → per-pillar 0–100 score, then the weighted total.</li>
<li><strong>STEP 5 · Verdict + Report</strong> — derive the A/B/C/D grade → auto-generate the AI Report.</li>
</ol>

<h2>Objective, not subjective</h2>
<ul>
<li><strong>Direct Brandbook citation</strong> — every violation includes the Brandbook page and sentence. Licensees can verify and contest.</li>
<li><strong>Quantitative first</strong> — composition %, color HEX/HSV, size (cm) — measurable values decide the first pass.</li>
<li><strong>Group-tiered thresholds</strong> — G1 (new) · G2 (elevation) · G3 (long-term). Inspection strictness differs by licensee group. No one-size-fits-all.</li>
<li><strong>Human gate</strong> — low-confidence items go to HQ designers for final judgment. AI provides opinion only.</li>
</ul>

<h2>Where the 5 Pillars take ST</h2>
<p>More than inspection — a coherence system that builds ST's global consistency. Six licensees, one language, one brand.</p>

<h2>Line DNA</h2>
<p>Sergio Tacchini lives across three lines, each carrying the brand at a different intensity. Tag every CAD line to one of these registers before inspection.</p>
<h3>Court Active · Energetic Active</h3>
<p>Tennis comes alive through movement, confidence, and shared moments on and off the court. Inspired by the sport's vibrant spirit, we create elevated pieces that blend energetic performance with refined style and a fresh, social attitude.</p>
<h3>Active Athleisure · Performance × Elegance</h3>
<p>Active athleisure beyond the studio — designed for movement, wellness, and social life. Premium, functional pieces that move seamlessly from indoor activities to gatherings, elevating athleisure into a refined, social lifestyle.</p>
<h3>Active Classic · Functional Heritage</h3>
<p>A timeless routine of active wellness, untouched by trends. Designed for clubhouse settings, travel, and polished everyday moments — where consistency and balance matter more than passing trends.</p>

<h2>ST-RA System · Surface Texture System</h2>
<p>ST uses <strong>RA (surface roughness and texture)</strong> — not luster — as its core axis. Surfaces are ordered along a <strong>five-level RA scale</strong>.</p>
<h3>Core Range</h3>
<p><strong>RA Lv.2 – Lv.3 (Soft Flat – Micro Texture)</strong> — the center of ST.</p>
<ul>
<li>Lv.1 — too slick, reads as performance; limited use only.</li>
<li>Lv.4 and above — too coarse, reads as casual or workwear; reserved for accents.</li>
</ul>
<p><strong>Guiding principle:</strong> "Dry to the touch, composed to the eye."</p>

<h3>RA 5-level definitions</h3>
<ul>
<li><strong>RA 1 — Ultra Flat:</strong> Very smooth (slick), almost no relief. Representative fabrics — tricot, high-density nylon, high-gauge jersey. ST fit — limited. Usage rule — up to 20% of mix, base layers and function items.</li>
<li><strong>RA 2 — Soft Flat:</strong> Soft and uniform. Representative fabrics — cotton jersey, smooth knit. ST fit — default. Usage rule — t-shirts, dresses, daily wear.</li>
<li><strong>RA 3 — Micro Texture (CORE):</strong> The most ST-like surface. Representative fabrics — piqué, fine-gauge weaves. ST fit — CORE. Usage rule — polos, skirts, hero pieces.</li>
<li><strong>RA 4 — Structured Texture:</strong> Carries dimensionality. Representative fabrics — rib, waffle, light structured weaves. ST fit — accent. Usage rule — for silhouette emphasis, up to 30% of mix.</li>
<li><strong>RA 5 — Heavy Texture:</strong> Coarse and heavy. Representative fabrics — bouclé, heavy knit. ST fit — restricted. Usage rule — effectively excluded from ST.</li>
</ul>
<p><strong>Core principle:</strong> "RA 3 anchors the system; RA 2 and RA 4 are the supporting range." RA 1 and RA 5 are not used outside of deliberate exceptions.</p>

<h3>Luster position (supporting axis)</h3>
<p>Surface (RA) is the core axis; luster works as a supporting one.</p>
<ul>
<li><strong>Baseline:</strong> Soft-Matte center. Luster is always restrained.</li>
<li><strong>Avoid:</strong> High-Gloss — performance-brand register.</li>
<li><strong>Avoid:</strong> Dead Matte — casual or workwear register.</li>
</ul>

<h3>Fabric mix principle — Natural Look + Technical Performance</h3>
<p><strong>Core line:</strong> "Classic on the outside, functional on the inside."</p>
<p><strong>Base composition:</strong> Cotton / Viscose (surface) with Poly / Nylon (function).</p>
<p><strong>Cotton share by category:</strong> t-shirts 50 – 70%, piqué 40 – 60%, sweats 60% and above, wovens 0 – 30%.</p>
<p><strong>Recommended:</strong> Recycled Poly / Nylon (use freely), Dry Touch Poly (core), 4-way Stretch (optional).</p>
<p><strong>Avoid:</strong> 100% synthetic performance fabrics (breaks the Heritage Look), heavy performance coatings or lamination.</p>

<h3>What counts as ST fabric — Must-have Checklist</h3>
<p>When developing new product or adapting a competitor reference toward ST, <strong>at least one</strong> of the criteria below must be met.</p>
<ol>
<li>Tennis-heritage weave — piqué, terry, rib, or track woven.</li>
<li>Dry touch and breathability — handles sweat and heat.</li>
<li>Soft-matte surface — restrained luster.</li>
<li>Line expression in motion — stretch or drape.</li>
<li>Color receptivity — surface that holds the Italian Retro palette.</li>
</ol>
<p><strong>Final definition:</strong> "A fabric that resolves more completely <strong>in motion</strong> than at rest."</p>

<h3>Operating principles</h3>
<ul>
<li>The fabric signature is near-invariant — this grammar holds across seasons.</li>
<li>Any new product or competitor-derived reference must carry at least one of the criteria above to register as ST.</li>
<li>"Hide the function, show only the silhouette." Function stays embedded rather than declared; surface stays composed at RA 3 by default.</li>
</ul>
`;

  // Default human-readable Principle page — licensee-facing, designed editorial
  // layout. HQ can override this via the Brand Guide editor; the stored HTML is
  // rendered verbatim on both sides.
  const DEFAULT_PRINCIPLE_HTML = `
<section class="ste-principle-hero">
  <div class="ste-principle-hero-eyebrow">Sergio Tacchini · Brand Principle</div>
  <h1 class="ste-principle-hero-title">Italian tennis heritage, quiet performance.</h1>
  <p class="ste-principle-hero-sub">A field guide to designing pieces that read as Sergio Tacchini at first glance — court-credible, body-lined, refined in surface, and unmistakable in palette.</p>
</section>

<section class="ste-principle-pillars">
  <h2 class="ste-principle-h">The five pillars</h2>
  <p class="ste-principle-lead">Every Sergio Tacchini piece is composed against these five principles. They are not a scoring rubric — they are the brand's voice. Stay close to all five and the line reads as ST.</p>
  <div class="ste-principle-pillar-grid">
    <div class="ste-principle-pillar"><span class="ste-principle-pillar-num">01</span><h3>Italian tennis heritage</h3><p>Court codes — collar geometry, white base discipline, pleat, court-line — anchor the piece to ST's tennis lineage rather than generic sportswear.</p></div>
    <div class="ste-principle-pillar"><span class="ste-principle-pillar-num">02</span><h3>Elegant functionalism</h3><p>Performance is built in, not declared. Refined surface and quiet construction; technique that reads as craft.</p></div>
    <div class="ste-principle-pillar"><span class="ste-principle-pillar-num">03</span><h3>Court-to-social</h3><p>Wears at the club and moves into refined social settings without strain. A dual register on the same piece.</p></div>
    <div class="ste-principle-pillar"><span class="ste-principle-pillar-num">04</span><h3>Body-lined silhouette</h3><p>Composed shoulder, considered length, no oversized drift. Proportions read intentional.</p></div>
    <div class="ste-principle-pillar"><span class="ste-principle-pillar-num">05</span><h3>Quiet performance</h3><p>Restrained palette, purposeful detailing, disciplined logo use. Heritage signals do the talking.</p></div>
  </div>
</section>

<section class="ste-principle-palette">
  <h2 class="ste-principle-h">Six tones</h2>
  <p class="ste-principle-lead">The brand palette is six tone-on-tone hues. Bright primaries and neon are out of register. Composition decisions are made within this set.</p>
  <div class="ste-principle-swatch-row">
    <div class="ste-principle-swatch"><span class="ste-principle-swatch-chip" style="background:#2a3244"></span><strong>Deep Navy</strong><span class="ste-mini">Primary brand</span></div>
    <div class="ste-principle-swatch"><span class="ste-principle-swatch-chip" style="background:#6a829a"></span><strong>Quiet Light Blue</strong><span class="ste-mini">Info accent</span></div>
    <div class="ste-principle-swatch"><span class="ste-principle-swatch-chip" style="background:#f5ecd9"></span><strong>Ecru</strong><span class="ste-mini">Primary warm surface</span></div>
    <div class="ste-principle-swatch"><span class="ste-principle-swatch-chip" style="background:#8e3a4a"></span><strong>Muted Burgundy</strong><span class="ste-mini">Heritage red</span></div>
    <div class="ste-principle-swatch"><span class="ste-principle-swatch-chip" style="background:#6b5443"></span><strong>Brown</strong><span class="ste-mini">Earthy secondary</span></div>
    <div class="ste-principle-swatch"><span class="ste-principle-swatch-chip" style="background:#2f4a3a"></span><strong>Forest Green</strong><span class="ste-mini">Sport accent</span></div>
  </div>
</section>

<section class="ste-principle-lines">
  <h2 class="ste-principle-h">Line DNA</h2>
  <p class="ste-principle-lead">Sergio Tacchini lives across three lines. Each carries the brand at a different intensity — use these notes to compose pieces that fit the line's register.</p>
  <div class="ste-principle-line-grid">
    <div class="ste-principle-line">
      <h3>Court Active</h3>
      <div class="ste-principle-line-sublabel">Energetic Active</div>
      <p>Tennis comes alive through movement, confidence, and shared moments on and off the court. Inspired by the sport's vibrant spirit, we create elevated pieces that blend energetic performance with refined style and a fresh, social attitude.</p>
    </div>
    <div class="ste-principle-line">
      <h3>Active Athleisure</h3>
      <div class="ste-principle-line-sublabel">Performance × Elegance</div>
      <p>Active athleisure beyond the studio — designed for movement, wellness, and social life. Premium, functional pieces that move seamlessly from indoor activities to gatherings, elevating athleisure into a refined, social lifestyle.</p>
    </div>
    <div class="ste-principle-line">
      <h3>Active Classic</h3>
      <div class="ste-principle-line-sublabel">Functional Heritage</div>
      <p>A timeless routine of active wellness, untouched by trends. Designed for clubhouse settings, travel, and polished everyday moments — where consistency and balance matter more than passing trends.</p>
    </div>
  </div>
</section>

<section class="ste-principle-ra">
  <div class="ste-ra-hd">
    <h2 class="ste-principle-h">ST-RA System</h2>
    <div class="ste-ra-sub">Surface Texture System</div>
  </div>
  <p class="ste-principle-lead">ST uses <strong>RA (surface roughness and texture)</strong> — not luster — as its core axis. Surfaces are ordered along a <strong>five-level RA scale</strong>.</p>

  <div class="ste-ra-callout">
    <div class="ste-ra-callout-label">Core Range</div>
    <div class="ste-ra-callout-body">
      <p><strong>RA Lv.2 – Lv.3 (Soft Flat – Micro Texture)</strong> — the center of ST.</p>
      <ul>
        <li>Lv.1 — too slick, reads as performance; limited use only.</li>
        <li>Lv.4 and above — too coarse, reads as casual or workwear; reserved for accents.</li>
      </ul>
    </div>
  </div>

  <blockquote class="ste-ra-quote">
    <span class="ste-ra-quote-label">Guiding principle</span>
    <span class="ste-ra-quote-body">"Dry to the touch, composed to the eye."</span>
  </blockquote>

  <div class="ste-ra-subhead">RA 5-level definitions</div>
  <div class="ste-ra-table-wrap">
    <table class="ste-ra-table">
      <thead>
        <tr><th>RA Level</th><th>Surface</th><th>Representative fabrics</th><th>ST fit</th><th>Usage rule</th></tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>RA 1</strong><div class="ste-mini">Ultra Flat</div></td>
          <td>Very smooth (slick), almost no relief</td>
          <td>Tricot, high-density nylon, high-gauge jersey</td>
          <td><span class="ste-ra-pill ste-ra-pill-warn">Limited</span></td>
          <td>Up to 20% of mix · base layers and function items</td>
        </tr>
        <tr>
          <td><strong>RA 2</strong><div class="ste-mini">Soft Flat</div></td>
          <td>Soft and uniform</td>
          <td>Cotton jersey, smooth knit</td>
          <td><span class="ste-ra-pill ste-ra-pill-ok">Default</span></td>
          <td>T-shirts, dresses, daily wear</td>
        </tr>
        <tr class="ste-ra-row-core">
          <td><strong>RA 3</strong><div class="ste-mini">Micro Texture</div></td>
          <td>The most ST-like surface</td>
          <td>Piqué, fine-gauge weaves</td>
          <td><span class="ste-ra-pill ste-ra-pill-core">CORE</span></td>
          <td>Polos, skirts, hero pieces</td>
        </tr>
        <tr>
          <td><strong>RA 4</strong><div class="ste-mini">Structured Texture</div></td>
          <td>Carries dimensionality</td>
          <td>Rib, waffle, light structured weaves</td>
          <td><span class="ste-ra-pill ste-ra-pill-warn">Accent</span></td>
          <td>For silhouette emphasis · up to 30% of mix</td>
        </tr>
        <tr>
          <td><strong>RA 5</strong><div class="ste-mini">Heavy Texture</div></td>
          <td>Coarse and heavy</td>
          <td>Bouclé, heavy knit</td>
          <td><span class="ste-ra-pill ste-ra-pill-no">Restricted</span></td>
          <td>Effectively excluded from ST</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="ste-ra-callout ste-ra-callout-primary">
    <div class="ste-ra-callout-label">Core principle</div>
    <div class="ste-ra-callout-body">"RA 3 anchors the system; RA 2 and RA 4 are the supporting range." RA 1 and RA 5 are not used outside of deliberate exceptions.</div>
  </div>

  <div class="ste-ra-subhead">Luster position (supporting axis)</div>
  <p class="ste-principle-lead">Surface (RA) is the core axis; luster works as a supporting one.</p>
  <div class="ste-ra-luster-grid">
    <div class="ste-ra-luster">
      <span class="ste-ra-luster-label ste-ra-luster-ok">Baseline</span>
      <h4>Soft-Matte center</h4>
      <p>Luster is always restrained.</p>
    </div>
    <div class="ste-ra-luster">
      <span class="ste-ra-luster-label ste-ra-luster-no">Avoid</span>
      <h4>High-Gloss</h4>
      <p>Performance-brand register. Not used.</p>
    </div>
    <div class="ste-ra-luster">
      <span class="ste-ra-luster-label ste-ra-luster-no">Avoid</span>
      <h4>Dead Matte</h4>
      <p>Casual or workwear register. Not used.</p>
    </div>
  </div>

  <div class="ste-ra-subhead">Fabric mix principle — Natural Look + Technical Performance</div>
  <p class="ste-principle-lead"><strong>Core line:</strong> "Classic on the outside, functional on the inside."</p>
  <div class="ste-ra-mix-grid">
    <div class="ste-ra-mix-card">
      <div class="ste-ra-mix-hd">Base composition</div>
      <p class="ste-ra-mix-formula"><strong>Cotton / Viscose</strong> <span class="ste-ra-mix-divider">surface</span> with <strong>Poly / Nylon</strong> <span class="ste-ra-mix-divider">function</span></p>
    </div>
    <div class="ste-ra-mix-card">
      <div class="ste-ra-mix-hd">Cotton share by category</div>
      <table class="ste-ra-mini-table">
        <thead><tr><th>Category</th><th>Cotton share</th></tr></thead>
        <tbody>
          <tr><td>T-shirts</td><td>50 – 70%</td></tr>
          <tr><td>Piqué</td><td>40 – 60%</td></tr>
          <tr><td>Sweats</td><td>60% and above</td></tr>
          <tr><td>Wovens</td><td>0 – 30%</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="ste-ra-direction-grid">
    <div class="ste-ra-direction ste-ra-direction-yes">
      <div class="ste-ra-direction-label">Recommended</div>
      <ul>
        <li>Recycled Poly / Nylon — use freely</li>
        <li>Dry Touch Poly — core</li>
        <li>4-way Stretch — optional</li>
      </ul>
    </div>
    <div class="ste-ra-direction ste-ra-direction-no">
      <div class="ste-ra-direction-label">Avoid</div>
      <ul>
        <li>100% synthetic performance fabrics — breaks the Heritage Look</li>
        <li>Heavy performance coatings or lamination</li>
      </ul>
    </div>
  </div>

  <div class="ste-ra-subhead">What counts as ST fabric — Must-have Checklist</div>
  <p class="ste-principle-lead">When developing new product or adapting a competitor reference toward ST, <strong>at least one</strong> of the criteria below must be met.</p>
  <table class="ste-ra-checklist">
    <thead><tr><th>#</th><th>Criterion</th><th>Check</th></tr></thead>
    <tbody>
      <tr><td>①</td><td>Tennis-heritage weave</td><td>Piqué, terry, rib, or track woven</td></tr>
      <tr><td>②</td><td>Dry touch + breathability</td><td>Handles sweat and heat</td></tr>
      <tr><td>③</td><td>Soft-matte surface</td><td>Restrained luster</td></tr>
      <tr><td>④</td><td>Line expression in motion</td><td>Stretch or drape</td></tr>
      <tr><td>⑤</td><td>Color receptivity</td><td>Surface that holds the Italian Retro palette</td></tr>
    </tbody>
  </table>

  <blockquote class="ste-ra-quote ste-ra-quote-final">
    <span class="ste-ra-quote-label">Final definition</span>
    <span class="ste-ra-quote-body">"A fabric that resolves more completely <strong>in motion</strong> than at rest."</span>
  </blockquote>

  <div class="ste-ra-subhead">Operating principles</div>
  <ul class="ste-ra-ops">
    <li>The fabric signature is near-invariant — this grammar holds across seasons.</li>
    <li>Any new product or competitor-derived reference must carry <strong>at least one</strong> of the criteria above to register as ST.</li>
    <li>"Hide the function, show only the silhouette." Function stays embedded rather than declared; surface stays composed at RA 3.</li>
  </ul>
</section>

<section class="ste-principle-noteq">
  <h2 class="ste-principle-h">A few "no" zones</h2>
  <ul class="ste-principle-noteq-list">
    <li>Oversized or sloppy silhouettes that lose the body-lined intent.</li>
    <li>Bright/neon primaries outside the six-tone palette.</li>
    <li>Logos scaled large enough to read as the design.</li>
    <li>Streetwear coding — wide contrast tape, bold blocking, athleisure drape.</li>
    <li>Generic sportswear with no court reference.</li>
  </ul>
</section>
`;

  function codex() {
    const root = pageMain("brand-guide");
    const state = STE.get();
    const u = STE.currentUser();
    const isHQ = u && STE.isHQ(u);
    const isEditing = !!(STE.getSession() || {}).brandGuideEditing;
    // Tab visibility by role:
    //   Licensee  → Principle + Brand Book (two tabs, no AI source).
    //   Licensor  → Principle + Brand Book + Principle Source (all three),
    //               each manageable in edit mode.
    // Default landing tab differs too: licensee lands on Principle, HQ on
    // Principle Source so the AI-readable rubric stays first-class for staff.
    const _storedTab = (STE.getSession() || {}).brandGuideTab;
    // Display order, left-to-right: Brand Book first, then the human-readable
    // Principle page, then the AI-readable source (HQ only).
    const _allowedTabs = isHQ
      ? ['brand-book','principle','rubric']
      : ['brand-book','principle'];
    // Default landing tab: HQ lands on the AI source they manage; licensee
    // lands on the Principle page.
    const _defaultTab = isHQ ? 'rubric' : 'principle';
    const activeTab = _allowedTabs.includes(_storedTab) ? _storedTab : _defaultTab;
    const stored = (state && state.brandGuide) || {};
    // Demo seed: HQ has already "uploaded" the brand book. The carousel pulls
    // pre-extracted PNG pages from assets/brandbook-pages/, and the Download
    // PDF button links to the source PDF in assets/. Use an `in` check so an
    // explicit `null` (HQ clicked Clear) doesn't fall back to the seed.
    const seededBrandBook = { url: "assets/brandbook-2026.pdf", description: "Sergio Tacchini global brand book — visual identity, palette, mark usage, typography." };
    const guide = {
      html: stored.html || DEFAULT_BRAND_GUIDE_HTML,
      principleHtml: stored.principleHtml || DEFAULT_PRINCIPLE_HTML,
      version: stored.version || 1,
      updatedAt: stored.updatedAt || null,
      updatedBy: stored.updatedBy || null,
      brandBook: ('brandBook' in stored) ? stored.brandBook : seededBrandBook,
      history: Array.isArray(stored.history) ? stored.history : [],
    };
    const bb = guide.brandBook;
    const showHistory = !!(STE.getSession() || {}).brandGuideShowHistory;

    root.innerHTML = `
      <div class="ste-screen-pad">
        <div class="ste-section-hd">
          <div class="ste-page-crumbs-row">
            <div class="ste-page-crumbs"><a href="#/home">Home</a><span class="sep">/</span><span class="cur">Brand Guide</span></div>
            ${guide.updatedAt ? `
              <span class="ste-mini ste-page-meta">Updated ${escape(guide.updatedAt.slice(0,10))}${(isHQ && guide.updatedBy) ? ' · ' + escape(guide.updatedBy) : ''}</span>
            ` : ''}
          </div>
          <div class="ste-page-hd-row">
            <div>
              <h1>Brand Guide</h1>
            </div>
            ${isHQ ? `
              <div class="ste-hd-cta" style="display:flex;gap:8px;align-items:center">
                ${!isEditing ? `<button class="ste-btn ste-btn-ghost" data-act="bg-edit" type="button">Edit Brand Guide</button>` : ''}
                ${isEditing && guide.history.length ? `<button class="ste-icon-only" data-act="bg-history" type="button" title="${showHistory ? 'Hide' : 'Show'} version history (${guide.history.length})" aria-label="${showHistory ? 'Hide' : 'Show'} version history">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
                </button>` : ''}
                ${isEditing ? `
                  <button class="ste-btn ste-btn-ghost" data-act="bg-cancel" type="button">Cancel</button>
                  <button class="ste-btn ste-btn-primary" data-act="bg-save" type="button">Save new version</button>` : ''}
              </div>` : ''}
          </div>
        </div>

        <div class="ste-bg-tabs">
          ${_allowedTabs.includes('brand-book') ? `<button class="ste-bg-tab ${activeTab==='brand-book'?'active':''}" data-bg-tab="brand-book" type="button">Brand Book</button>` : ''}
          ${_allowedTabs.includes('principle') ? `<button class="ste-bg-tab ${activeTab==='principle'?'active':''}" data-bg-tab="principle" type="button">Principle</button>` : ''}
          ${_allowedTabs.includes('rubric') ? `<button class="ste-bg-tab ${activeTab==='rubric'?'active':''}" data-bg-tab="rubric" type="button">Principle Source (AI)</button>` : ''}
        </div>

        ${isEditing && activeTab === 'brand-book' ? `
          <div class="ste-card">
            <div class="ste-card-head">
              <h3>Brand Book (registered document)</h3>
              <span class="ste-mini">The PDF designers and reviewers see in the Brand Book tab.</span>
            </div>
            <div class="ste-card-body">
              <div class="ste-field">
                <div class="ste-lbl">Brand Book PDF</div>
                ${(bb && bb.url) ? `
                  <div class="ste-bb-uploaded">
                    <span class="ste-bb-uploaded-name"><strong>${escape((bb.url.split('/').pop()) || bb.url)}</strong></span>
                    <button type="button" class="ste-btn ste-btn-ghost ste-btn-mini" data-act="bb-clear">Clear</button>
                  </div>
                  <div class="ste-mini" style="margin-top:6px">One PDF at a time. Clear to upload a different one.</div>
                ` : `
                  <input class="ste-input" type="file" accept="application/pdf,.pdf" data-bb-file>
                  <div class="ste-mini" data-bb-file-status style="margin-top:6px">Pick the official Brand Book PDF. The file itself stays on disk — the prototype just stores its path for the carousel.</div>
                `}
              </div>
            </div>
          </div>
        ` : ''}

        ${isEditing && activeTab === 'rubric' ? `
          <div class="ste-card">
            <div class="ste-card-head">
              <h3>Edit CAD Inspection Rubric (HTML)</h3>
              <span class="ste-mini">Supports headings (&lt;h2&gt;, &lt;h3&gt;), lists, paragraphs, &lt;strong&gt;, &lt;em&gt;. The AI grader reads this verbatim — be measurable and citation-rich.</span>
            </div>
            <div class="ste-card-body">
              <textarea class="ste-input" data-bg-html rows="30" style="font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 13px; line-height: 1.5">${escape(guide.html || '')}</textarea>
            </div>
          </div>

          ${showHistory && guide.history.length ? `
            <div class="ste-card">
              <div class="ste-card-head"><h3>Version History</h3><span class="ste-mini">Click <strong>Restore</strong> on a row to load that version into the editor.</span></div>
              <div class="ste-card-body" style="padding:0">
                <table class="ste-table">
                  <thead><tr><th>Version</th><th>Saved at</th><th>By</th><th></th></tr></thead>
                  <tbody>
                    ${guide.history.slice().reverse().map(h => `
                      <tr>
                        <td><strong>v${h.version}</strong></td>
                        <td class="ste-mini">${escape((h.savedAt || '').slice(0,16).replace('T',' '))}</td>
                        <td>${escape(h.savedBy || '—')}</td>
                        <td>${isHQ ? `<button class="ste-btn ste-btn-link" data-bg-restore="${h.version}" type="button">Restore</button>` : ''}</td>
                      </tr>`).join("")}
                  </tbody>
                </table>
              </div>
            </div>` : ''}
        ` : ''}

        ${!isEditing && activeTab === 'brand-book' ? `
          <div class="ste-brand-banner" data-brand-banner data-pdf-url="${bb && bb.url ? escape(bb.url) : ''}">
            <div class="ste-brand-banner-status" data-brand-banner-status>
              <div class="ste-brand-banner-spinner" data-brand-banner-spinner aria-label="Loading PDF"></div>
              <div class="ste-brand-banner-msg" data-brand-banner-msg hidden></div>
            </div>
            <div class="ste-brand-banner-pages" data-brand-banner-pages hidden></div>
            <div class="ste-brand-banner-dots" data-brand-banner-dots></div>
            <button class="ste-brand-banner-arrow ste-brand-banner-prev" data-banner-prev aria-label="Previous page" type="button" hidden>‹</button>
            <button class="ste-brand-banner-arrow ste-brand-banner-next" data-banner-next aria-label="Next page" type="button" hidden>›</button>
            <a class="ste-brand-banner-download" data-banner-download href="${escape((bb && bb.url) || 'assets/brandbook-2026.pdf')}" download target="_blank" rel="noopener" title="Download Brand Book PDF" aria-label="Download Brand Book PDF" hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </a>
          </div>
        ` : ''}

        ${!isEditing && activeTab === 'rubric' ? `
          <div class="ste-brand-guide-content ste-brand-rubric-view">${guide.html || ''}</div>
        ` : ''}

        ${isEditing && activeTab === 'principle' ? `
          <div class="ste-card">
            <div class="ste-card-head">
              <h3>Edit Principle (HTML)</h3>
              <span class="ste-mini">Licensee-facing brand-principle page. Edit as HTML — the platform styles <code>.ste-principle-hero</code>, <code>.ste-principle-pillars</code>, <code>.ste-principle-palette</code>, <code>.ste-principle-lines</code>, <code>.ste-principle-noteq</code> sections. Save creates a new version like the rubric does.</span>
            </div>
            <div class="ste-card-body">
              <textarea class="ste-input" data-bg-principle-html rows="30" style="font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 13px; line-height: 1.5">${escape(guide.principleHtml || '')}</textarea>
            </div>
          </div>
        ` : ''}

        ${!isEditing && activeTab === 'principle' ? `
          <div class="ste-principle-page">${guide.principleHtml || ''}</div>
        ` : ''}
      </div>`;

    root.querySelector('[data-act="bg-history"]')?.addEventListener('click', () => {
      STE.setSession({ ...STE.getSession(), brandGuideShowHistory: !showHistory });
      codex();
    });
    // Tabs — switch between Brand Book carousel and CAD Inspection Rubric.
    $$("[data-bg-tab]", root).forEach(b => {
      b.addEventListener('click', () => {
        STE.setSession({ ...STE.getSession(), brandGuideTab: b.getAttribute('data-bg-tab') });
        codex();
      });
    });
    // Brand Book carousel — renders pre-extracted page PNGs as slides. <img>
    // loads work over file:// (unlike fetch), so this is fully demoable from
    // a local file:// open. Pages live at src/assets/brandbook-pages/page-NN.png
    // (extracted from the PDF once via pdftoppm); we probe sequentially and
    // append as many as we find. Auto-advances every 6s.
    (() => {
      const banner = root.querySelector("[data-brand-banner]");
      if (!banner) return;
      const status = banner.querySelector("[data-brand-banner-status]");
      const spinner = banner.querySelector("[data-brand-banner-spinner]");
      const statusMsg = banner.querySelector("[data-brand-banner-msg]");
      const pagesWrap = banner.querySelector("[data-brand-banner-pages]");
      const dotsWrap  = banner.querySelector("[data-brand-banner-dots]");
      const prevBtn   = banner.querySelector("[data-banner-prev]");
      const nextBtn   = banner.querySelector("[data-banner-next]");
      const dlBtn     = banner.querySelector("[data-banner-download]");

      function showStatus(msg) {
        if (spinner) spinner.hidden = true;
        if (statusMsg) { statusMsg.innerHTML = msg; statusMsg.hidden = false; }
        if (status) status.hidden = false;
        if (pagesWrap) pagesWrap.hidden = true;
        if (prevBtn) prevBtn.hidden = true;
        if (nextBtn) nextBtn.hidden = true;
        if (dlBtn) dlBtn.hidden = true;
      }

      // Manual-advance only: no auto-rotate. Users move pages via prev/next
      // arrows or the dots indicator.
      let idx = 0;
      const allSlides = [];
      function show(n) {
        if (allSlides.length === 0) return;
        idx = (n + allSlides.length) % allSlides.length;
        // Ribbon transform model: i < idx → slid out left, i === idx → on
        // screen, i > idx → waiting off right. The CSS transition does the
        // sliding animation.
        allSlides.forEach((s, i) => {
          s.classList.toggle("active", i === idx);
          s.classList.toggle("prev", i < idx);
        });
        dotsWrap.querySelectorAll("[data-banner-dot]").forEach((d, i) => d.classList.toggle("active", i === idx));
      }
      prevBtn?.addEventListener("click", () => show(idx - 1));
      nextBtn?.addEventListener("click", () => show(idx + 1));

      function tryLoad(url) {
        return new Promise(resolve => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = url;
        });
      }

      (async () => {
        const MAX = 100;
        for (let i = 1; i <= MAX; i++) {
          const pad = String(i).padStart(2, "0");
          const url = `assets/brandbook-pages/page-${pad}.png`;
          const img = await tryLoad(url);
          if (!img) break;
          const slide = document.createElement("div");
          slide.className = "ste-brand-banner-slide ste-brand-banner-pdf-slide";
          if (allSlides.length === 0) slide.classList.add("active");
          slide.setAttribute("data-slide", String(allSlides.length));
          slide.appendChild(img);
          pagesWrap.appendChild(slide);
          allSlides.push(slide);
          if (allSlides.length === 1) {
            // Snap the banner's aspect ratio to the first page so there are
            // no letterbox margins — the slide fills the banner edge to edge.
            if (img.naturalWidth && img.naturalHeight) {
              banner.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
            }
            if (status) status.hidden = true;
            pagesWrap.hidden = false;
            if (dlBtn) dlBtn.hidden = false;
          }
          dotsWrap.innerHTML = Array.from({ length: allSlides.length }, (_, j) =>
            `<button class="ste-brand-banner-dot ${j===idx?'active':''}" data-banner-dot="${j}" aria-label="Page ${j+1}" type="button"></button>`
          ).join("");
          dotsWrap.querySelectorAll("[data-banner-dot]").forEach((d, j) => {
            d.addEventListener("click", () => show(j));
          });
          if (allSlides.length === 2) {
            if (prevBtn) prevBtn.hidden = false;
            if (nextBtn) nextBtn.hidden = false;
          }
        }
        if (allSlides.length === 0) {
          showStatus(isHQ
            ? 'No brand book pages found. Extract page PNGs to <code>src/assets/brandbook-pages/page-01.png</code>, <code>page-02.png</code>, …'
            : 'Brand Book has not been published yet.');
          return;
        }
      })();
    })();
    if (isHQ) {
      root.querySelector('[data-act="bg-edit"]')?.addEventListener('click', () => {
        STE.setSession({ ...STE.getSession(), brandGuideEditing: true });
        codex();
      });
      root.querySelector('[data-act="bg-cancel"]')?.addEventListener('click', () => {
        STE.setSession({ ...STE.getSession(), brandGuideEditing: false });
        codex();
      });
      // Brand Book file picker — purely a UX affordance. Picking a file does
      // NOT upload anything; it stashes a derived asset path on the input
      // (assets/<filename>) which the save handler reads. The user is
      // responsible for dropping the actual PDF into src/assets/ so the
      // carousel can fetch it at that path.
      const fileInp = root.querySelector('[data-bb-file]');
      const fileStatus = root.querySelector('[data-bb-file-status]');
      fileInp?.addEventListener('change', () => {
        const f = fileInp.files && fileInp.files[0];
        if (!f) return;
        const safe = String(f.name).trim().replace(/[^A-Za-z0-9._-]+/g, '-');
        const assetPath = `assets/${safe}`;
        fileInp._pickedUrl = assetPath;
        if (fileStatus) fileStatus.innerHTML = `Will register as <code>${escape(assetPath)}</code> on save — drop <strong>${escape(f.name)}</strong> into <code>src/assets/</code> so the carousel can fetch it.`;
      });
      // Clear the registered PDF — mutates state immediately so the form
      // re-renders with the picker. User can then pick a new one or Cancel.
      root.querySelector('[data-act="bb-clear"]')?.addEventListener('click', () => {
        STE.mutate(s => {
          s.brandGuide = s.brandGuide || {};
          s.brandGuide.brandBook = null;
        });
        codex();
      });
      root.querySelector('[data-act="bg-save"]')?.addEventListener('click', () => {
        // Each editable tab uses its own textarea — read whichever ones exist
        // on the page and fall back to the previously stored value so a save
        // from any single tab preserves the other tabs' content.
        const rubricTa    = root.querySelector('[data-bg-html]');
        const principleTa = root.querySelector('[data-bg-principle-html]');
        const html          = rubricTa    ? rubricTa.value    : (guide.html || '');
        const principleHtml = principleTa ? principleTa.value : (guide.principleHtml || '');
        // Brand Book URL — either freshly picked, or carried over from the
        // current state. (Description is no longer an editable field.)
        const pickedUrl = (fileInp && fileInp._pickedUrl) || null;
        const url = pickedUrl || ((bb && bb.url) || '');
        const newBb = url ? { url } : null;
        try {
        STE.mutate(s => {
          const prev = s.brandGuide || {};
          const priorHistory = Array.isArray(prev.history) ? prev.history : [];
          // Push the previous version into history (only if it actually had content).
          const newHistory = priorHistory.slice();
          if (prev.html || prev.principleHtml) {
            newHistory.push({
              version: prev.version || 1,
              html: prev.html,
              principleHtml: prev.principleHtml,
              brandBook: prev.brandBook || null,
              savedAt: prev.updatedAt || new Date().toISOString(),
              savedBy: prev.updatedBy || '—',
            });
          }
          s.brandGuide = {
            html,
            principleHtml,
            brandBook: newBb,
            version: (prev.version || 0) + 1,
            updatedAt: new Date().toISOString(),
            updatedBy: u.name,
            history: newHistory,
          };
        });
        STE.setSession({ ...STE.getSession(), brandGuideEditing: false });
        STEApp.toast('Brand Guide saved successfully.', 'success');
        codex();
        } catch (err) {
          // Most likely a localStorage QuotaExceededError on a giant PDF.
          STEApp.toast(`Couldn't save — the embedded PDF likely exceeds the browser storage quota (${String(err && err.name || err)}). Host the PDF and use the URL field instead.`, 'warn');
        }
      });
      // Restore a prior version into the editor
      root.querySelectorAll('[data-bg-restore]').forEach(b => {
        b.addEventListener('click', () => {
          const v = parseInt(b.getAttribute('data-bg-restore'));
          const entry = (guide.history || []).find(h => h.version === v);
          if (!entry) return;
          STE.mutate(s => {
            const prev = s.brandGuide || {};
            const priorHistory = Array.isArray(prev.history) ? prev.history : [];
            const newHistory = priorHistory.slice();
            if (prev.html || prev.principleHtml) {
              newHistory.push({
                version: prev.version || 1,
                html: prev.html,
                principleHtml: prev.principleHtml,
                brandBook: prev.brandBook || null,
                savedAt: prev.updatedAt || new Date().toISOString(),
                savedBy: prev.updatedBy || '—',
              });
            }
            s.brandGuide = {
              html: entry.html,
              principleHtml: entry.principleHtml || prev.principleHtml || null,
              brandBook: entry.brandBook || prev.brandBook || null,
              version: (prev.version || 0) + 1,
              updatedAt: new Date().toISOString(),
              updatedBy: u.name,
              history: newHistory,
            };
          });
          STEApp.toast(`Restored v${v} as the current Brand Guide (saved as new version).`, 'success');
          codex();
        });
      });
    }
  }

  // ====================== Boards (list of saved Design Studio runs) =====
  // Each "board" captures one full pass of Design Studio: the brief, the
  // picked references, and (if reached) the generated lineup. Licensees use
  // this list to manage in-progress concept work and to send finished boards
  // to HQ for direction sign-off.
  function ensureBoardsSeed() {
    const st = STE.get();
    // Re-seed when the existing array is missing the per-org scoping
    // (boards before v16 had no licenseeId). Reset just the boards array,
    // not other state.
    if (Array.isArray(st.studioBoards)) {
      // Re-seed when the existing array still uses the old cryptic
      // `brd_demo_*` ID format. Boards now use the readable
      // `BRD-{season}-{licCode}-{seq}` scheme so they line up with the
      // other resource identifiers (DES-, STM-, INV-, AGR-).
      const hasReadableId = st.studioBoards.some(b => typeof b.id === "string" && b.id.startsWith("BRD-"));
      if (hasReadableId) return;
    }
    const now = Date.now();
    // Boards are private per organization. Each licensee gets their own demo
    // pair so when a tester switches licensee they see only their org's work.
    // HQ also has its own pair (licenseeId === null = HQ-owned).
    const stState = STE.get();
    const licensees = (stState.licensees || []);
    const licById = (id) => licensees.find(l => l.id === id);
    const licUserId = (id) => {
      const l = licById(id);
      return (l && l.primaryUserId) || "usr_unknown";
    };
    const hqUser = (stState.users || []).find(u => !u.licenseeId);
    const hqId = (hqUser && hqUser.id) || "usr_unknown";

    const seedBoards = [
      // HQ-owned boards (licenseeId: null → only HQ users see these)
      {
        id: "BRD-27SS-HQ-001",
        name: "27SS · POLO · Men",
        licenseeId: null,
        brief: {
          season: "27SS", item: "POLO", target: "Men", refCount: 120,
          dnaStrictness: 70, variantBoldness: 40,
          sources: ["diadora","fila","sporty","lacoste"],
          customSources: [],
          lineupVariants: ["0_0","0_1","3_0","5_1","8_0","8_2","11_0","14_1","17_0","21_2"],
        },
        picks: [0,3,5,8,11,14,17,21],
        status: "complete",
        createdAt: now - 1000*60*60*24*4,
        updatedAt: now - 1000*60*60*24*2,
        createdBy: hqId,
        sharedInternalIds: [],
        externalShareLink: null,
        externalShareExpiresAt: null,
      },
      {
        id: "BRD-26FW-HQ-001",
        name: "26FW · BOMBER · Women",
        licenseeId: null,
        brief: {
          season: "26FW", item: "BOMBER", target: "Women", refCount: 80,
          dnaStrictness: 60, variantBoldness: 55,
          sources: ["diadora","fila","wilson"],
          customSources: [],
          lineupVariants: ["2_0","2_2","7_1","9_0","13_1"],
        },
        picks: [2,7,9,13],
        status: "in-progress",
        createdAt: now - 1000*60*60*24*1,
        updatedAt: now - 1000*60*60*4,
        createdBy: hqId,
        sharedInternalIds: [],
        externalShareLink: null,
        externalShareExpiresAt: null,
      },

      // Best of Britain (BOB) — UK apparel + accessory licensee
      {
        id: "BRD-27SS-BOB-001",
        name: "27SS · CAP · Unisex",
        licenseeId: "lic_75f7462d",
        brief: {
          season: "27SS", item: "CAP", target: "Unisex", refCount: 90,
          dnaStrictness: 75, variantBoldness: 35,
          sources: ["fila","lacoste","wilson"],
          customSources: [],
          lineupVariants: ["1_0","4_1","6_0","9_2","12_0"],
        },
        picks: [1,4,6,9,12],
        status: "complete",
        createdAt: now - 1000*60*60*24*5,
        updatedAt: now - 1000*60*60*24*3,
        createdBy: licUserId("lic_75f7462d"),
        sharedInternalIds: [],
        externalShareLink: null,
        externalShareExpiresAt: null,
      },
      {
        id: "BRD-27FW-BOB-001",
        name: "27FW · TRACK JACKET · Men",
        licenseeId: "lic_75f7462d",
        brief: {
          season: "27FW", item: "TRACK JACKET", target: "Men", refCount: 110,
          dnaStrictness: 65, variantBoldness: 45,
          sources: ["diadora","fila","sporty"],
          customSources: [],
          lineupVariants: ["0_1","2_0","5_2","8_1"],
        },
        picks: [0,2,5,8],
        status: "in-progress",
        createdAt: now - 1000*60*60*12,
        updatedAt: now - 1000*60*60*2,
        createdBy: licUserId("lic_75f7462d"),
        sharedInternalIds: [],
        externalShareLink: null,
        externalShareExpiresAt: null,
      },

      // Sugi SAS (SSAS) — French apparel + accessory licensee
      {
        id: "BRD-27FW-SSAS-001",
        name: "27FW · SCARF · Women",
        licenseeId: "lic_c2a5c666",
        brief: {
          season: "27FW", item: "SCARF", target: "Women", refCount: 70,
          dnaStrictness: 80, variantBoldness: 30,
          sources: ["fila","lacoste"],
          customSources: [],
          lineupVariants: ["1_0","3_1","6_0"],
        },
        picks: [1,3,6],
        status: "complete",
        createdAt: now - 1000*60*60*24*6,
        updatedAt: now - 1000*60*60*24*4,
        createdBy: licUserId("lic_c2a5c666"),
        sharedInternalIds: [],
        externalShareLink: null,
        externalShareExpiresAt: null,
      },
      {
        id: "BRD-27SS-SSAS-001",
        name: "27SS · DRESS · Women",
        licenseeId: "lic_c2a5c666",
        brief: {
          season: "27SS", item: "DRESS", target: "Women", refCount: 95,
          dnaStrictness: 55, variantBoldness: 60,
          sources: ["diadora","fila","sporty"],
          customSources: [],
          lineupVariants: ["0_0","2_1","4_2","7_0","10_1"],
        },
        picks: [0,2,4,7,10],
        status: "in-progress",
        createdAt: now - 1000*60*60*8,
        updatedAt: now - 1000*60*60*1,
        createdBy: licUserId("lic_c2a5c666"),
        sharedInternalIds: [],
        externalShareLink: null,
        externalShareExpiresAt: null,
      },

      // Sugi Footwear SpA (SFOO) — Italian footwear licensee
      {
        id: "BRD-27SS-SFOO-001",
        name: "27SS · SNEAKER · Unisex",
        licenseeId: "lic_000025e9",
        brief: {
          season: "27SS", item: "SNEAKER", target: "Unisex", refCount: 140,
          dnaStrictness: 70, variantBoldness: 50,
          sources: ["diadora","fila","sporty","wilson"],
          customSources: [],
          lineupVariants: ["0_0","3_1","6_2","9_0","12_1","15_0"],
        },
        picks: [0,3,6,9,12,15],
        status: "complete",
        createdAt: now - 1000*60*60*24*7,
        updatedAt: now - 1000*60*60*24*5,
        createdBy: licUserId("lic_000025e9"),
        sharedInternalIds: [],
        externalShareLink: null,
        externalShareExpiresAt: null,
      },
    ];
    STE.mutate(s => { s.studioBoards = seedBoards; });
  }

  // Save the current Design Studio session state as a board, or update an
  // existing board if session.studioBoardId is set. Returns the board id.
  // Auto-generated default name for a brand-new board, used as the
  // pre-fill in the naming modal and as the persisted name if the user
  // saves without entering one.
  function defaultBoardName(brief) {
    return `${brief.season || "??"} · ${brief.item || "??"} · ${brief.target || "??"}`;
  }

  function saveCurrentBoard(nameOverride) {
    const session = STE.getSession() || {};
    const brief = session.studioBrief || {};
    const step = parseInt(session.studioStep) || 1;
    const u = STE.currentUser && STE.currentUser();
    const myId = (u && u.id) || "usr_unknown";
    const now = Date.now();
    const status = step >= 6 ? "complete" : "in-progress";
    // Strip transient flags (menu open, crawl/dna/gen tick state) so they
    // don't leak into persistence and re-trigger animations on reload.
    const cleanBrief = {};
    Object.keys(brief).forEach(k => {
      if (k.startsWith("_")) return;
      cleanBrief[k] = brief[k];
    });
    // Pull picks off the brief — that's where the wizard stores them.
    const picks = (brief.picks || []).slice();
    delete cleanBrief.picks;

    const name = (nameOverride || "").trim() || defaultBoardName(cleanBrief);

    let id = session.studioBoardId;
    STE.mutate(s => {
      s.studioBoards = s.studioBoards || [];
      if (id) {
        const existing = s.studioBoards.find(b => b.id === id);
        if (existing) {
          existing.brief = cleanBrief;
          existing.picks = picks;
          existing.status = status;
          existing.updatedAt = now;
          return;
        }
      }
      // Mint a readable board id `BRD-{season}-{licCode}-{seq}`. seq is
      // a per-(season,licCode) sequence so the most recent board for a
      // given season + org reads as 001, 002, etc.
      const seasonPart = String(cleanBrief.season || "ANY").toUpperCase();
      const ownerLicId = (u && u.licenseeId) || null;
      const codePart = ownerLicId ? licCode(s, ownerLicId) : "HQ";
      const prefix = `BRD-${seasonPart}-${codePart}-`;
      const existingSeqs = (s.studioBoards || [])
        .map(b => (b.id || "").startsWith(prefix) ? parseInt((b.id || "").slice(prefix.length), 10) : 0)
        .filter(n => Number.isFinite(n));
      const nextSeq = (existingSeqs.length ? Math.max(...existingSeqs) : 0) + 1;
      id = `${prefix}${String(nextSeq).padStart(3, "0")}`;
      s.studioBoards.unshift({
        id,
        name,
        // Boards are private per organization. Stamp the creator's licenseeId
        // (null for HQ users) so the boards list can scope visibility.
        licenseeId: ownerLicId,
        brief: cleanBrief,
        picks,
        status,
        createdAt: now,
        updatedAt: now,
        createdBy: myId,
        sharedInternalIds: [],
        externalShareLink: null,
        externalShareExpiresAt: null,
      });
    });
    STE.setSession({ ...STE.getSession(), studioBoardId: id });
    return id;
  }

  // Download all of a board's assets as a single .zip. Lazy-loads JSZip
  // from CDN on first call. Bundles:
  //   - references/: each picked reference image (Step 4 selections)
  //   - lineup/:     each variant the user marked as "in lineup" (Step 6)
  //   - board.json:  the brief metadata + pick/lineup index for context
  let _jszipLoadPromise = null;
  function loadJSZip() {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    if (_jszipLoadPromise) return _jszipLoadPromise;
    _jszipLoadPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";
      s.onload = () => resolve(window.JSZip);
      s.onerror = () => { _jszipLoadPromise = null; reject(new Error("Failed to load JSZip")); };
      document.head.appendChild(s);
    });
    return _jszipLoadPromise;
  }

  async function downloadBoardAssets(board) {
    if (!board) return;
    const safe = (board.name || "board").replace(/[^a-z0-9 _.-]+/gi, "_").trim().replace(/\s+/g, "_") || "board";

    // Reconstruct the asset list from the brief.
    const brief = board.brief || {};
    const picks = board.picks || [];
    const totalLib = (window.STE_CRAWL_IMAGES || []).length || 60;
    const allCards = buildCrawlCardSet(brief, totalLib);
    const variantsFor = (idx) => {
      const orig = allCards[idx];
      if (!orig) return [];
      if (orig.variants && orig.variants.length) return orig.variants.slice(0, 3);
      return [17, 34, 51].map(off => allCards[(idx + off) % totalLib]?.file).filter(Boolean);
    };
    const lineupSet = new Set(brief.lineupVariants || []);

    const refs = picks.map((idx, i) => {
      const c = allCards[idx];
      if (!c) return null;
      const ext = (c.file.split(".").pop() || "jpg").toLowerCase();
      const name = `${String(i+1).padStart(2,"0")}_${(c.category || "ref").replace(/\s+/g,"_")}_${(c.brand || "").replace(/\s+/g,"_")}.${ext}`;
      return { src: c.file, path: `references/${name}` };
    }).filter(Boolean);

    const lineup = [];
    picks.forEach(idx => {
      const c = allCards[idx];
      if (!c) return;
      variantsFor(idx).forEach((file, vi) => {
        if (!lineupSet.has(`${idx}_${vi}`)) return;
        const ext = (file.split(".").pop() || "jpg").toLowerCase();
        const n = lineup.length + 1;
        const name = `${String(n).padStart(2,"0")}_${(c.category || "concept").replace(/\s+/g,"_")}_V${vi+1}.${ext}`;
        lineup.push({ src: file, path: `lineup/${name}` });
      });
    });

    const all = refs.concat(lineup);
    if (all.length === 0) {
      STEApp.toast("This board has no assets to download yet.", "info");
      return;
    }

    STEApp.toast(`Preparing ${all.length} asset${all.length===1?'':'s'}…`, "info");
    let JSZip;
    try { JSZip = await loadJSZip(); }
    catch (e) { console.error(e); STEApp.toast("Could not load the zip library. Check your connection.", "error"); return; }

    const zip = new JSZip();
    // Include a small manifest so the recipient knows what they're looking at.
    zip.file("board.json", JSON.stringify({
      name: board.name,
      brief,
      picks,
      lineupVariants: brief.lineupVariants || [],
      assetCounts: { references: refs.length, lineup: lineup.length },
      exportedAt: new Date().toISOString(),
    }, null, 2));

    try {
      // Fetch each asset individually so a single 404 doesn't sink the
      // whole zip. Anything that fails is silently skipped — the zip still
      // bundles whatever did load. (file:// + missing demo previews can
      // legitimately 404; not worth scaring the user about it.)
      const blobs = (await Promise.all(all.map(async (a) => {
        try {
          const res = await fetch(a.src);
          if (!res.ok) return null;
          return { path: a.path, blob: await res.blob() };
        } catch (_) { return null; }
      }))).filter(Boolean);
      // Nothing came back — every fetch 404'd (common under file://). Don't
      // trigger a misleading "downloaded 0 assets" toast or hand the user
      // an empty zip; just say the assets aren't reachable and bail.
      if (blobs.length === 0) {
        STEApp.toast("No assets could be downloaded — the files may have moved.", "warn");
        return;
      }
      blobs.forEach(({ path, blob }) => zip.file(path, blob));
      const out = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(out);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safe}_assets.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      STEApp.toast(`Downloaded ${blobs.length} asset${blobs.length===1?'':'s'}.`, "success");
    } catch (e) {
      console.error(e);
      // Only surface a toast for a catastrophic failure (zip lib never
      // loaded, etc.) — partial-fetch failures are absorbed above.
    }
  }

  // Styled delete confirmation for boards — replaces the native browser
  // confirm() so the modal matches the rest of the platform's chrome.
  function openBoardDeleteModal(board, onConfirm) {
    const bd = document.createElement("div");
    bd.className = "ste-mini-modal-backdrop";
    bd.innerHTML = `
      <div class="ste-mini-modal" role="dialog" aria-modal="true" aria-labelledby="board-del-title">
        <h3 class="ste-mini-modal-title" id="board-del-title">Delete this board?</h3>
        <p class="ste-mini" style="color:var(--ste-muted);margin:0 0 8px">
          <strong>${escape(board.name)}</strong> will be removed. This can't be undone.
        </p>
        <div class="ste-mini-modal-actions">
          <button class="ste-btn ste-btn-ghost" type="button" data-mm-cancel>Cancel</button>
          <button class="ste-btn ste-btn-primary" type="button" data-mm-confirm style="background:#be185d;border-color:#be185d">Delete board</button>
        </div>
      </div>`;
    document.body.appendChild(bd);
    const close = () => bd.remove();
    bd.addEventListener("click", (e) => { if (e.target === bd) close(); });
    bd.querySelector("[data-mm-cancel]").addEventListener("click", close);
    bd.querySelector("[data-mm-confirm]").addEventListener("click", () => {
      close();
      try { onConfirm && onConfirm(); } catch (_) {}
    });
    // ESC to cancel.
    const onKey = (e) => { if (e.key === "Escape") { close(); document.removeEventListener("keydown", onKey); } };
    document.addEventListener("keydown", onKey);
    setTimeout(() => bd.querySelector("[data-mm-confirm]")?.focus(), 20);
  }

  // Styled withdraw confirmation for licensees — replaces the native confirm.
  // Withdrawing pulls the submission out of HQ's queue and saves it as a Draft
  // so the licensee can edit and resubmit.
  function openWithdrawModal(sub, onConfirm) {
    const bd = document.createElement("div");
    bd.className = "ste-mini-modal-backdrop";
    bd.innerHTML = `
      <div class="ste-mini-modal" role="dialog" aria-modal="true" aria-labelledby="withdraw-title">
        <h3 class="ste-mini-modal-title" id="withdraw-title">Withdraw this submission?</h3>
        <p class="ste-mini" style="color:var(--ste-muted);margin:0 0 8px">
          <strong>${escape(sub.id)}</strong> will be pulled out of HQ's review queue and saved as a <strong>Draft</strong>. You can edit it and resubmit anytime.
        </p>
        <div class="ste-mini-modal-actions">
          <button class="ste-btn ste-btn-ghost" type="button" data-mm-cancel>Cancel</button>
          <button class="ste-btn ste-btn-primary" type="button" data-mm-confirm>Withdraw &amp; save as Draft</button>
        </div>
      </div>`;
    document.body.appendChild(bd);
    const close = () => bd.remove();
    bd.addEventListener("click", (e) => { if (e.target === bd) close(); });
    bd.querySelector("[data-mm-cancel]").addEventListener("click", close);
    bd.querySelector("[data-mm-confirm]").addEventListener("click", () => {
      close();
      try { onConfirm && onConfirm(); } catch (_) {}
    });
    const onKey = (e) => { if (e.key === "Escape") { close(); document.removeEventListener("keydown", onKey); } };
    document.addEventListener("keydown", onKey);
    setTimeout(() => bd.querySelector("[data-mm-confirm]")?.focus(), 20);
  }

  function formatRelative(ts) {
    if (!ts) return "—";
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return "just now";
    if (s < 60*60) return `${Math.floor(s/60)}m ago`;
    if (s < 60*60*24) return `${Math.floor(s/(60*60))}h ago`;
    if (s < 60*60*24*30) return `${Math.floor(s/(60*60*24))}d ago`;
    return new Date(ts).toLocaleDateString();
  }

  function boardThumbnails(board) {
    const total = (window.STE_CRAWL_IMAGES || []).length || 60;
    const cards = buildCrawlCardSet(board.brief || {}, total);
    const picks = board.picks || [];
    // Use the first 4 picks' variant images (+17 offset, matching Step 5/6).
    const slots = [0,1,2,3].map(i => {
      const pickIdx = picks[i];
      if (pickIdx === undefined) return null;
      const variant = cards[(pickIdx + 17) % total];
      return variant ? variant.file : null;
    });
    return slots;
  }

  function boards() {
    ensureBoardsSeed();
    const root = pageMain("design-studio");
    const state = STE.get();
    const session = STE.getSession() || {};
    const u = STE.currentUser && STE.currentUser();
    const isHQ = u && STE.isHQ && STE.isHQ(u);
    // Boards are private per organization for licensees — they see only
    // their own. HQ (licensor) sees boards across every licensee plus their
    // own, with an explicit licensee filter so they can scope to one org.
    // Legacy boards (created before per-org scoping) have no licenseeId
    // field — surface them only to HQ so nothing demo-side disappears.
    const myLicId = (u && u.licenseeId) || null;
    const all = (state.studioBoards || [])
      .filter(b => {
        if (isHQ) return true;
        const owner = Object.prototype.hasOwnProperty.call(b, "licenseeId") ? b.licenseeId : null;
        return owner === myLicId;
      })
      .slice()
      .sort((a,b) => b.updatedAt - a.updatedAt);

    // Licensee lookup for the HQ filter dropdown + board-card chip. Licensee
    // names come straight from admin's legalName field. HQ-owned boards (no
    // licenseeId) are tagged "Licensor" so the chip doesn't masquerade as a
    // tenant that was never set up in admin.
    const licById = {};
    (state.licensees || []).forEach(l => { licById[l.id] = l; });
    const licNameOf = (lid) => lid ? ((licById[lid] && (licById[lid].legalName || licById[lid].name)) || lid) : "HQ";

    // Filter state — persisted in session like the other list pages.
    // Multi-select arrays for season/item/target/licensee (fdrop pattern,
    // matching Agreements / Design Review). Legacy single-string state from
    // the old native-select bar is migrated up-front so existing sessions
    // don't lose their selection.
    const _asArr = (v) => Array.isArray(v) ? v.filter(Boolean) : (v ? [v] : []);
    const _rawFilters = session.boardsFilters || {};
    const filters = {
      search:   typeof _rawFilters.search === "string" ? _rawFilters.search : "",
      season:   _asArr(_rawFilters.season),
      item:     _asArr(_rawFilters.item),
      target:   _asArr(_rawFilters.target),
      licensee: _asArr(_rawFilters.licensee),
    };
    const seasonOpts = Array.from(new Set(all.map(b => b.brief?.season).filter(Boolean))).sort();
    const itemOpts   = Array.from(new Set(all.map(b => b.brief?.item).filter(Boolean))).sort();
    const targetOpts = Array.from(new Set(all.map(b => b.brief?.target).filter(Boolean))).sort();
    const licOpts    = isHQ
      ? Array.from(new Set(all.map(b => Object.prototype.hasOwnProperty.call(b, "licenseeId") ? (b.licenseeId || "__hq") : "__hq")))
          .map(lid => ({ id: lid, label: lid === "__hq" ? "HQ" : licNameOf(lid) }))
          // HQ (HQ-owned boards) always sits at the top of the list; licensees
          // sort alphabetically beneath it.
          .sort((a, b) => {
            if (a.id === "__hq") return -1;
            if (b.id === "__hq") return 1;
            return a.label.localeCompare(b.label);
          })
      : [];
    const term = (filters.search || "").trim().toLowerCase();
    const list = all.filter(b => {
      if (filters.season.length   && !filters.season.includes(b.brief?.season))   return false;
      if (filters.item.length     && !filters.item.includes(b.brief?.item))       return false;
      if (filters.target.length   && !filters.target.includes(b.brief?.target))   return false;
      if (isHQ && filters.licensee.length) {
        const owner = Object.prototype.hasOwnProperty.call(b, "licenseeId") ? (b.licenseeId || "__hq") : "__hq";
        if (!filters.licensee.includes(owner)) return false;
      }
      if (term) {
        const hay = [b.name, b.brief?.season, b.brief?.item, b.brief?.target, licNameOf(b.licenseeId)].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
    const hasActiveFilters = !!(filters.season.length || filters.item.length || filters.target.length || filters.licensee.length || term);

    const renderCard = (b) => {
      const thumbs = boardThumbnails(b);
      const shared = (b.sharedInternalIds || []).length;
      const brief = b.brief || {};
      const ownerLid = Object.prototype.hasOwnProperty.call(b, "licenseeId") ? b.licenseeId : null;
      const ownerLabel = ownerLid ? licNameOf(ownerLid) : "HQ";
      const ownerVariant = ownerLid ? "is-licensee" : "is-licensor";
      return `
        <div class="ste-board-card" data-board-id="${escape(b.id)}" data-board-card="${escape(b.id)}">
          <div class="ste-board-thumbs">
            ${thumbs.map(f => f
              ? `<div class="ste-board-thumb"><img src="${escape(f)}" alt="" loading="lazy"></div>`
              : `<div class="ste-board-thumb is-empty"></div>`).join("")}
          </div>
          <div class="ste-board-body">
            <div class="ste-board-titlerow">
              <span class="ste-board-name" data-board-rename="${escape(b.id)}" contenteditable="true" spellcheck="false" title="Click to rename">${escape(b.name)}</span>
            </div>
            ${isHQ ? `<span class="ste-board-owner-chip ${ownerVariant}">${escape(ownerLabel)}</span>` : ''}
            <div class="ste-board-recap">
              <span class="ste-board-recap-chip"><em>SEASON</em><strong>${escape(brief.season || "—")}</strong></span>
              <span class="ste-board-recap-chip"><em>TARGET</em><strong>${escape(brief.target || "—")}</strong></span>
              <span class="ste-board-recap-chip"><em>CATEGORY</em><strong>${escape(brief.item || "—")}</strong></span>
            </div>
            <div class="ste-board-footer">
              <div class="ste-board-footer-meta">
                <span class="ste-mini">Updated ${formatRelative(b.updatedAt)}</span>
                <span class="ste-mini">${b.picks ? b.picks.length : 0} pick${(b.picks||[]).length===1?'':'s'}${shared ? ` · shared with ${shared}` : ""}</span>
              </div>
              <button class="ste-board-menu-btn" data-board-menu="${escape(b.id)}" type="button" aria-label="More">⋮</button>
            </div>
          </div>
        </div>`;
    };

    root.innerHTML = `
      <div class="ste-screen-pad ste-screen-pad-wide">
        <div class="ste-section-hd">
          <div class="ste-page-crumbs"><a href="#/home">Home</a><span class="sep">/</span><span class="cur">Design Studio</span></div>
          <div class="ste-board-header">
            <div>
              <h1>Design Studio</h1>
            </div>
            <button class="ste-btn ste-btn-primary" data-new-board type="button">+ Create New Board</button>
          </div>
        </div>

        ${all.length === 0 ? `
          <div class="ste-board-empty">
            <div class="ste-board-empty-icon">▱</div>
            <h3>No boards yet</h3>
            <p>Click "+ Create New Board" to start your first one — crawl references, run the DNA filter, generate variants, and assemble a lineup.</p>
            <button class="ste-btn ste-btn-primary" data-new-board type="button">+ Create your first board</button>
          </div>` : `
          <div class="ste-form-card ste-form-card-boards">
            <div class="ste-insp-filter-bar">
              <input class="ste-input ste-insp-filter-search" type="search" data-boards-filter="search" value="${escape(filters.search || '')}" placeholder="Search boards by name, season, category…">
              <div class="ste-brief-select-wrap">
                <select class="ste-input ste-brief-select" data-boards-filter="season">
                  <option value="">All seasons</option>
                  ${seasonOpts.map(s => `<option value="${escape(s)}" ${(filters.season[0])===s?'selected':''}>${escape(s)}</option>`).join("")}
                </select>
                <span class="ste-brief-select-chev" aria-hidden="true">▾</span>
              </div>
              <div class="ste-brief-select-wrap">
                <select class="ste-input ste-brief-select" data-boards-filter="item">
                  <option value="">All categories</option>
                  ${itemOpts.map(s => `<option value="${escape(s)}" ${(filters.item[0])===s?'selected':''}>${escape(s)}</option>`).join("")}
                </select>
                <span class="ste-brief-select-chev" aria-hidden="true">▾</span>
              </div>
              <div class="ste-brief-select-wrap">
                <select class="ste-input ste-brief-select" data-boards-filter="target">
                  <option value="">All targets</option>
                  ${targetOpts.map(s => `<option value="${escape(s)}" ${(filters.target[0])===s?'selected':''}>${escape(s)}</option>`).join("")}
                </select>
                <span class="ste-brief-select-chev" aria-hidden="true">▾</span>
              </div>
              ${isHQ ? `<div class="ste-brief-select-wrap">
                <select class="ste-input ste-brief-select" data-boards-filter="licensee">
                  <option value="">All organizations</option>
                  ${licOpts.map(o => `<option value="${escape(o.id)}" ${(filters.licensee[0])===o.id?'selected':''}>${escape(o.label)}</option>`).join("")}
                </select>
                <span class="ste-brief-select-chev" aria-hidden="true">▾</span>
              </div>` : ''}
              ${hasActiveFilters ? `<button class="ste-btn ste-btn-ghost ste-btn-mini" type="button" data-boards-filter-clear>Clear</button>` : ''}
              <span class="ste-mini ste-insp-filter-count"><strong>${list.length}</strong> of ${all.length}</span>
            </div>
            ${list.length === 0 ? `
              <div class="ste-empty-cell" style="padding:40px;text-align:center;color:var(--ste-muted)">
                No boards match the current filters.
              </div>` : `
              <div class="ste-board-grid">
                ${list.map(renderCard).join("")}
              </div>`}
          </div>`}
      </div>`;

    // Boards filter handlers — search + native single-select dropdowns.
    // Each native select writes a one-element array (so the existing
    // filter logic above, which uses .length / .includes, keeps working).
    const writeBoardsFilter = (key, val) => {
      const s = STE.getSession() || {};
      const cur = s.boardsFilters || {};
      const next = key === "search" ? val : (val ? [val] : []);
      STE.setSession({ ...s, boardsFilters: { ...cur, [key]: next } });
      boards();
    };
    $$("[data-boards-filter]", root).forEach(el => {
      const key = el.getAttribute("data-boards-filter");
      const evt = el.tagName === "SELECT" ? "change" : "input";
      el.addEventListener(evt, () => writeBoardsFilter(key, el.value));
    });
    root.querySelector("[data-boards-filter-clear]")?.addEventListener("click", () => {
      const s = STE.getSession() || {};
      STE.setSession({ ...s, boardsFilters: { search: "", season: [], item: [], target: [], licensee: [] } });
      boards();
    });

    // + New Board → clear active board, reset wizard to step 1, navigate to
    // /design-studio/new — designStudio() router seeds the brief on entry.
    $$("[data-new-board]", root).forEach(b => b.addEventListener("click", () => {
      STE.setSession({
        ...STE.getSession(),
        studioBoardId: null,
        studioStep: 1,
        studioBrief: {
          season: studioLatestSeason(), item: "", items: [], target: "Men", refCount: 120,
          dnaStrictness: 70, variantBoldness: 40,
          sources: [], customSources: [], picks: [],
        },
      });
      location.hash = "#/design-studio/new";
    }));

    // Open board on card click (anywhere except the ⋮ menu or the editable
    // name). The /details/{id} URL is the canonical surface; designStudio()
    // router hydrates the session from the board record on entry, so we don't
    // need to pre-seed studioBoardId here.
    const openBoard = (id) => {
      location.hash = `#/design-studio/details/view/${encodeURIComponent(id)}`;
    };
    $$("[data-board-card]", root).forEach(card => card.addEventListener("click", (e) => {
      // Ignore clicks on the ⋮ menu, the rename field, or anything inside
      // an open pop menu so they keep their own behavior.
      if (e.target.closest("[data-board-menu]")) return;
      if (e.target.closest("[data-board-rename]")) return;
      if (e.target.closest(".ste-board-popmenu")) return;
      openBoard(card.getAttribute("data-board-card"));
    }));

    // Inline rename — commit on blur or Enter; Esc reverts.
    $$("[data-board-rename]", root).forEach(el => {
      const id = el.getAttribute("data-board-rename");
      const original = el.textContent;
      el.addEventListener("click", (e) => e.stopPropagation());
      el.addEventListener("focus", () => {
        // Select all text so user can replace by typing.
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(el);
        sel.removeAllRanges();
        sel.addRange(range);
      });
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); el.blur(); }
        if (e.key === "Escape") { e.preventDefault(); el.textContent = original; el.blur(); }
      });
      el.addEventListener("blur", () => {
        const newName = (el.textContent || "").trim();
        if (!newName || newName === original) { el.textContent = original; return; }
        STE.mutate(s => {
          const board = (s.studioBoards || []).find(x => x.id === id);
          if (board) { board.name = newName; board.updatedAt = Date.now(); }
        });
        STEApp.toast(`Renamed to "${newName}"`, "success");
      });
    });

    // ⋮ menu — for now just exposes Delete.
    // ⋮ context menu — popover anchored to the button with Open / Share /
    // Delete. Click outside or pick an item to close. Replaces the previous
    // direct confirm() call so the menu is actually a menu.
    function closeAnyBoardMenu() {
      document.querySelectorAll(".ste-board-popmenu").forEach(m => m.remove());
    }
    $$("[data-board-menu]", root).forEach(b => b.addEventListener("click", (e) => {
      e.stopPropagation();
      // Toggle: clicking again closes it.
      if (document.querySelector(".ste-board-popmenu[data-for='" + b.getAttribute("data-board-menu") + "']")) {
        closeAnyBoardMenu();
        return;
      }
      closeAnyBoardMenu();
      const id = b.getAttribute("data-board-menu");
      const board = (STE.get().studioBoards || []).find(x => x.id === id);
      if (!board) return;
      const rect = b.getBoundingClientRect();
      const menu = document.createElement("div");
      menu.className = "ste-board-popmenu";
      menu.setAttribute("data-for", id);
      menu.innerHTML = `
        <button class="ste-board-popmenu-item" data-act="open" type="button">Open</button>
        <button class="ste-board-popmenu-item" data-act="share" type="button">Share</button>
        <button class="ste-board-popmenu-item" data-act="download" type="button">Download assets</button>
        <div class="ste-board-popmenu-sep"></div>
        <button class="ste-board-popmenu-item ste-board-popmenu-danger" data-act="delete" type="button">Delete</button>
      `;
      // Position below-right of the ⋮ button, flipping above if it'd overflow.
      menu.style.position = "fixed";
      menu.style.top = (rect.bottom + 6) + "px";
      menu.style.left = Math.max(8, rect.right - 160) + "px";
      document.body.appendChild(menu);
      // Flip above if not enough room below
      const mRect = menu.getBoundingClientRect();
      if (mRect.bottom > window.innerHeight - 8) {
        menu.style.top = (rect.top - mRect.height - 6) + "px";
      }
      menu.querySelectorAll("[data-act]").forEach(it => it.addEventListener("click", () => {
        const act = it.getAttribute("data-act");
        closeAnyBoardMenu();
        if (act === "open") {
          // Mirror the existing Open handler's logic so the menu is identical.
          const targetStep = board.status === "complete" ? 6 : 1;
          const restoredBrief = { ...(board.brief || {}), picks: (board.picks || []).slice() };
          if (board.status === "complete") restoredBrief._genState = "complete";
          STE.setSession({
            ...STE.getSession(),
            studioBoardId: id,
            studioStep: targetStep,
            studioBrief: restoredBrief,
          });
          location.hash = "#/design-studio";
        } else if (act === "share") {
          openShareModal(id);
        } else if (act === "download") {
          downloadBoardAssets(board);
        } else if (act === "delete") {
          openBoardDeleteModal(board, () => {
            STE.mutate(s => {
              s.studioBoards = (s.studioBoards || []).filter(x => x.id !== id);
            });
            const sess = STE.getSession() || {};
            if (sess.studioBoardId === id) {
              STE.setSession({ ...sess, studioBoardId: null });
            }
            boards();
            STEApp.toast(`Deleted "${board.name}".`, "info");
          });
        }
      }));
      // Close on outside click. One-shot listener attached on the next tick so
      // it doesn't immediately catch the same click that opened the menu.
      setTimeout(() => {
        const onDocClick = (ev) => {
          if (!menu.contains(ev.target)) { closeAnyBoardMenu(); document.removeEventListener("click", onDocClick); }
        };
        document.addEventListener("click", onDocClick);
      }, 0);
    }));
  }

  // Small modal that asks the user to name a new board before saving.
  // Pre-filled with the auto-generated default ("27SS · POLO · Men").
  // Calls onSave(name) with the final name; Enter submits, Esc cancels.
  // DNA Filter settings modal — hosts DNA Strictness + Variant Boldness
  // sliders. Both values drive the filtering pipeline (Step 3 + variant
  // generation in Step 5), so they live behind a single cog rather than
  // taking up real estate on the brief step.
  function openDnaSettingsModal(brief, onSave) {
    // Local working copy — only committed on Save.
    const draft = {
      dnaStrictness: typeof brief.dnaStrictness === "number" ? brief.dnaStrictness : 70,
      variantBoldness: typeof brief.variantBoldness === "number" ? brief.variantBoldness : 40,
    };

    const overlay = document.createElement("div");
    overlay.className = "ste-modal-overlay ste-dna-settings-overlay";
    overlay.innerHTML = `
      <div class="ste-modal ste-dna-settings-modal" role="dialog" aria-modal="true" aria-labelledby="dna-settings-title">
        <div class="ste-name-board-hd">
          <div class="ste-mini">DNA FILTER SETTINGS</div>
          <h3 id="dna-settings-title">Adjust filtering thresholds</h3>
          <p class="ste-mini ste-name-board-sub">DNA Strictness controls how aggressively references are filtered against the 5 ST DNA pillars. Variant Boldness controls how far generated variants stray from the source references.</p>
        </div>
        <div class="ste-dna-settings-body">
          ${sliderControl("DNA STRICTNESS", "dnaStrictness", draft.dnaStrictness, ["Loose","Strict"])}
          ${sliderControl("VARIANT BOLDNESS", "variantBoldness", draft.variantBoldness, ["Conservative","Experimental"])}
        </div>
        <div class="ste-name-board-footer">
          <button class="ste-btn ste-btn-ghost" type="button" data-dna-cancel>Cancel</button>
          <button class="ste-btn ste-btn-primary" type="button" data-dna-save>Apply</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    // Local input handlers — write to draft only; commit happens on Apply.
    overlay.querySelectorAll("[data-brief-slider]").forEach(s => {
      s.addEventListener("input", e => {
        const key = s.getAttribute("data-brief-slider");
        const v = +e.target.value;
        draft[key] = v;
        const lbl = overlay.querySelector(`[data-slider-out="${key}"]`);
        if (lbl) lbl.textContent = v;
        s.style.setProperty("--p", v + "%");
      });
    });

    const close = () => overlay.remove();
    const commit = () => { close(); onSave(draft); };
    overlay.querySelector("[data-dna-cancel]").addEventListener("click", close);
    overlay.querySelector("[data-dna-save]").addEventListener("click", commit);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.preventDefault(); close(); }
    });
    setTimeout(() => overlay.querySelector("[data-dna-save]")?.focus(), 0);
  }

  function openNameBoardModal(defaultName, onSave) {
    const overlay = document.createElement("div");
    overlay.className = "ste-modal-overlay ste-name-board-overlay";
    overlay.innerHTML = `
      <div class="ste-modal ste-name-board-modal" role="dialog" aria-modal="true">
        <div class="ste-name-board-hd">
          <div class="ste-mini">SAVE BOARD</div>
          <h3>Name this board</h3>
          <p class="ste-mini ste-name-board-sub">Give your board a name so it's easy to find on the Design Studio list. You can rename it later.</p>
        </div>
        <div class="ste-name-board-body">
          <label class="ste-lbl">BOARD NAME</label>
          <input class="ste-input ste-name-board-input" type="text" data-name-board-input value="${escape(defaultName || "")}" placeholder="e.g. 27SS Polo · Men">
        </div>
        <div class="ste-name-board-footer">
          <button class="ste-btn ste-btn-ghost" type="button" data-name-board-cancel>Cancel</button>
          <button class="ste-btn ste-btn-primary" type="button" data-name-board-save>Save Board</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const input = overlay.querySelector("[data-name-board-input]");
    const close = () => overlay.remove();
    const commit = () => {
      const name = (input.value || "").trim() || defaultName || "Untitled Board";
      close();
      onSave(name);
    };
    overlay.querySelector("[data-name-board-cancel]").addEventListener("click", close);
    overlay.querySelector("[data-name-board-save]").addEventListener("click", commit);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); commit(); }
      if (e.key === "Escape") { e.preventDefault(); close(); }
    });
    setTimeout(() => { input.focus(); input.select(); }, 0);
  }

  // Modal that lets the user share a board with platform users (internal)
  // or via a generated link (external). Internal share writes to the board's
  // sharedInternalIds; external generates a mocked tokenised URL.
  function openShareModal(boardId) {
    const board = (STE.get().studioBoards || []).find(x => x.id === boardId);
    if (!board) return;
    const state = STE.get();
    const session = STE.getSession() || {};
    const tab = session._shareTab || "internal";

    // Pull a directory of platform users from state.users (or a small fallback).
    const allUsers = (state.users || []).slice();
    const me = STE.currentUser && STE.currentUser();
    const others = allUsers.filter(u => !me || u.id !== me.id);
    const searchTerm = (session._shareSearch || "").toLowerCase();
    const filtered = others.filter(u => !searchTerm
      || (u.name || "").toLowerCase().includes(searchTerm)
      || (u.email || "").toLowerCase().includes(searchTerm));
    const sharedIds = new Set(board.sharedInternalIds || []);

    const overlay = document.createElement("div");
    overlay.className = "ste-modal-overlay ste-share-overlay";
    overlay.innerHTML = `
      <div class="ste-modal ste-share-modal" role="dialog" aria-modal="true">
        <div class="ste-share-hd">
          <div>
            <div class="ste-mini">SHARE BOARD</div>
            <h3>${escape(board.name)}</h3>
          </div>
          <button class="ste-share-close" type="button" aria-label="Close">×</button>
        </div>

        <div class="ste-share-body">
          <input class="ste-input ste-share-search" type="search" data-share-search value="${escape(session._shareSearch || "")}" placeholder="Search by name or email…">
          <div class="ste-share-users">
            ${filtered.length === 0
              ? `<div class="ste-share-empty">No users match "${escape(searchTerm)}"</div>`
              : filtered.map(u => {
                  const isShared = sharedIds.has(u.id);
                  const initials = (u.name || "?").split(/\s+/).map(s => s[0]).slice(0,2).join("").toUpperCase();
                  return `
                    <label class="ste-share-user ${isShared ? 'is-shared' : ''}">
                      <input type="checkbox" data-share-toggle="${escape(u.id)}" ${isShared ? 'checked' : ''}>
                      <span class="ste-share-user-avatar">${escape(initials)}</span>
                      <span class="ste-share-user-main">
                        <span class="ste-share-user-name">${escape(u.name || "—")}</span>
                        <span class="ste-share-user-email">${escape(u.email || "")}</span>
                      </span>
                      <span class="ste-share-user-tick">${isShared ? '✓' : ''}</span>
                    </label>`;
                }).join("")}
          </div>
          <div class="ste-share-footer">
            <span class="ste-mini">${sharedIds.size} ${sharedIds.size === 1 ? 'person has' : 'people have'} access</span>
            <button class="ste-btn ste-btn-primary" data-share-done type="button">Done</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const close = () => {
      overlay.remove();
      STE.setSession({ ...STE.getSession(), _shareSearch: "" });
    };
    overlay.querySelector(".ste-share-close")?.addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    $$("[data-share-done]", overlay).forEach(b => b.addEventListener("click", close));

    const searchInp = overlay.querySelector("[data-share-search]");
    let searchT = null;
    searchInp?.addEventListener("input", () => {
      clearTimeout(searchT);
      searchT = setTimeout(() => {
        STE.setSession({ ...STE.getSession(), _shareSearch: searchInp.value });
        overlay.remove();
        openShareModal(boardId);
      }, 200);
    });

    $$("[data-share-toggle]", overlay).forEach(cb => cb.addEventListener("change", () => {
      const uid = cb.getAttribute("data-share-toggle");
      STE.mutate(s => {
        const b = (s.studioBoards || []).find(x => x.id === boardId);
        if (!b) return;
        b.sharedInternalIds = b.sharedInternalIds || [];
        if (cb.checked && !b.sharedInternalIds.includes(uid)) b.sharedInternalIds.push(uid);
        if (!cb.checked) b.sharedInternalIds = b.sharedInternalIds.filter(x => x !== uid);
        b.updatedAt = Date.now();
      });
      // Light re-render the count badge without nuking the whole modal.
      const board2 = (STE.get().studioBoards || []).find(x => x.id === boardId);
      const n = (board2.sharedInternalIds || []).length;
      const lbl = overlay.querySelector(".ste-share-footer .ste-mini");
      if (lbl) lbl.textContent = `${n} ${n === 1 ? 'person has' : 'people have'} access`;
      cb.closest(".ste-share-user")?.classList.toggle("is-shared", cb.checked);
      const tick = cb.closest(".ste-share-user")?.querySelector(".ste-share-user-tick");
      if (tick) tick.textContent = cb.checked ? '✓' : '';
    }));

  }

  global.STEDesign = { inspector, designStudio, studio, mirror, codex, boards, ensureMirrorSeed, ensureSeed };
})(window);
