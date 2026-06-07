/* =========================================================
   STE Operations Platform — header dropdown menus.
   Wires the wireframe header chrome:
     • global search (type-ahead across designs, statements, contracts, licensees)
     • help menu
     • notifications dropdown
     • licensee switcher (HQ only)
     • profile / sign-out menu
   Runs after every route change to (re-)bind to the freshly-rendered header.
   ========================================================= */
(function (global) {
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  let _openPanel = null;
  let _outsideHandler = null;

  // Return the header inside the currently-visible <section data-page>.
  // Wireframe has 8 separate ste-shell headers (one per section); a global
  // querySelector lands on the FIRST one (hidden login) which is the wrong
  // element to bind to.
  function activeHeader() {
    const sec = Array.from(document.querySelectorAll("section[data-page]")).find(s => !s.hidden);
    return sec || document;
  }

  function close() {
    if (_openPanel) {
      _openPanel.remove();
      _openPanel = null;
    }
    if (_outsideHandler) {
      document.removeEventListener("click", _outsideHandler, true);
      document.removeEventListener("keydown", _outsideHandler, true);
      _outsideHandler = null;
    }
  }

  function open(anchor, panel, align = "right") {
    close();
    document.body.appendChild(panel);
    panel.style.position = "fixed";
    panel.style.zIndex = "9100";
    // Measure after attach so width is real
    const r = anchor.getBoundingClientRect();
    const pw = panel.offsetWidth || 320;
    const margin = 12;
    const top = Math.min(r.bottom + 8, window.innerHeight - panel.offsetHeight - margin);
    panel.style.top = Math.max(margin, top) + "px";
    if (align === "right") {
      // Anchor to the right edge of the trigger, but never let it run off either side
      let right = window.innerWidth - r.right;
      if (right + pw > window.innerWidth - margin) right = window.innerWidth - pw - margin;
      panel.style.right = Math.max(margin, right) + "px";
    } else {
      let left = r.left;
      if (left + pw > window.innerWidth - margin) left = window.innerWidth - pw - margin;
      panel.style.left = Math.max(margin, left) + "px";
    }
    panel.style.maxHeight = (window.innerHeight - parseFloat(panel.style.top) - margin) + "px";
    panel.style.overflowY = "auto";
    _openPanel = panel;
    // Defer outside-click registration until AFTER the click that opened us
    // has finished propagating. setTimeout(0) is too short in some browsers —
    // the same click can still reach the document capture listener.
    setTimeout(() => {
      _outsideHandler = (e) => {
        if (e.type === "keydown" && e.key === "Escape") { close(); return; }
        if (e.type !== "click") return;
        if (panel.contains(e.target)) return;
        // Robust anchor check via class selector — the literal anchor element
        // may have been re-rendered after route change.
        if (e.target.closest(".header-search, .header-licensee, .header-user, .header-icon-btn")) return;
        close();
      };
      document.addEventListener("click", _outsideHandler, true);
      document.addEventListener("keydown", _outsideHandler, true);
    }, 50);
  }

  // ====================== SEARCH (Spotlight overlay) ======================
  // The header search button is the magnifying-glass icon (`.header-search`).
  // Clicking it (or pressing ⌘K) opens a centered Spotlight-style modal.
  let _spotlight = null;
  function wireSearch() {
    const root = activeHeader();
    const box = $(".header-search", root);
    if (!box || box._wired) return;
    box._wired = true;
    box.setAttribute("title", "Search (⌘K)");
    box.style.cursor = "pointer";
    box.addEventListener("click", openSpotlight);
  }
  // ⌘K shortcut — registered once at module load
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      openSpotlight();
    }
  });

  function openSpotlight() {
    closeSpotlight();
    const backdrop = document.createElement("div");
    backdrop.className = "ste-spotlight-backdrop";
    backdrop.innerHTML = `
      <div class="ste-spotlight" role="dialog" aria-label="Search">
        <div class="ste-spotlight-input-wrap">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/></svg>
          <input class="ste-spotlight-input" type="search" placeholder="Search designs, statements, agreements, licensees…" autofocus>
          <span class="ste-spotlight-esc">esc</span>
        </div>
        <div class="ste-spotlight-results" id="ste-spotlight-results"></div>
      </div>
    `;
    document.body.appendChild(backdrop);
    _spotlight = backdrop;
    const input = backdrop.querySelector(".ste-spotlight-input");
    const results = backdrop.querySelector(".ste-spotlight-results");
    renderSpotlightResults(input, results);
    input.addEventListener("input", () => renderSpotlightResults(input, results));
    input.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSpotlight(); });
    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeSpotlight(); });
    setTimeout(() => input.focus(), 10);
  }
  function closeSpotlight() {
    if (_spotlight) { _spotlight.remove(); _spotlight = null; }
  }
  function renderSpotlightResults(input, results) {
    const q = (input.value || "").trim().toLowerCase();
    const state = STE.get();
    const lic = STE.currentLicensee();
    const u = STE.currentUser();
    const scope = u && STE.isHQ(u) ? state.licensees.map(l => l.id) : (lic ? [lic.id] : []);
    const designs = (state.designs||[]).filter(d => {
      if (scope.length && !scope.includes(d.licenseeId)) return false;
      return !q || `${d.id} ${d.name} ${d.category} ${d.season} ${d.aiGrade}`.toLowerCase().includes(q);
    });
    const statements = (state.salesStatements||[]).filter(s => {
      if (scope.length && !scope.includes(s.licenseeId)) return false;
      return !q || `${s.id} ${s.quarter} ${s.fileName||''} ${s.status}`.toLowerCase().includes(q);
    });
    const contracts = (state.contracts||[]).filter(c => {
      if (scope.length && !scope.includes(c.licenseeId)) return false;
      return !q || `${c.id} ${c.counterpartyName||''}`.toLowerCase().includes(q);
    });
    const licensees = (u && STE.isHQ(u)) ? (state.licensees||[]).filter(l => {
      return !q || `${l.id} ${l.legalName} ${l.country||''}`.toLowerCase().includes(q);
    }) : [];
    const plans = (state.seasonPlans||[]).filter(p => {
      if (scope.length && !scope.includes(p.licenseeId)) return false;
      return !q || `${p.id} ${p.season} ${p.subplan} ${p.status}`.toLowerCase().includes(q);
    });
    const empty = !designs.length && !statements.length && !contracts.length && !licensees.length && !plans.length;
    let html = "";
    if (empty) {
      html = `<div class="ste-hdr-empty">${q ? `No matches for <strong>${escape(q)}</strong>` : "Start typing to search"}</div>`;
    } else {
      const groupBuilders = [];
      function addGroup(label, items, limit, mapItem) {
        if (!items.length) return;
        html += `<div class="ste-hdr-group"><div class="ste-hdr-group-lbl">${label}</div>`;
        items.slice(0, limit).forEach((it) => {
          const x = mapItem(it);
          const idx = groupBuilders.length;
          groupBuilders.push(x.onClick);
          html += `<button class="ste-hdr-row" data-row-idx="${idx}">
            <div class="ste-hdr-row-body">
              <strong>${escape(x.title)}</strong>
              <span>${escape(x.sub)}</span>
            </div>
            ${x.badge ? `<span class="ste-hdr-row-badge ${x.badgeClass||''}">${x.badge}</span>` : ""}
          </button>`;
        });
        html += `</div>`;
      }
      addGroup("Designs", designs, 4, d => ({
        title: d.name, sub: `${d.id} · ${d.category} · Grade ${d.aiGrade}`,
        badge: d.aiGrade, badgeClass: `ste-grade-${d.aiGrade.toLowerCase()}`,
        onClick: () => { STE.setSession({ ...STE.getSession(), activeDesignId: d.id, viewLicenseeId: d.licenseeId }); location.hash = "#/design/" + d.licenseeId; closeSpotlight(); }
      }));
      addGroup("Sales Statements", statements, 4, s => ({
        title: s.quarter, sub: `${s.fileName||s.id} · ${s.status}`,
        onClick: () => { STE.setSession({ ...STE.getSession(), viewLicenseeId: s.licenseeId }); location.hash = "#/sales/" + s.licenseeId; closeSpotlight(); }
      }));
      addGroup("Operation Plans", plans, 3, p => ({
        title: `${p.season} · ${p.subplan}`, sub: p.status,
        onClick: () => { STE.setSession({ ...STE.getSession(), viewLicenseeId: p.licenseeId }); location.hash = "#/operation-plans/details/view/" + p.licenseeId; closeSpotlight(); }
      }));
      addGroup("Agreements", contracts, 3, c => ({
        title: c.id, sub: `Counterparty: ${c.counterpartyName||'—'}`,
        onClick: () => { STE.setSession({ ...STE.getSession(), viewLicenseeId: c.licenseeId, viewContractId: c.id }); location.hash = "#/agreements/details/view/" + c.id; closeSpotlight(); }
      }));
      addGroup("Licensees", licensees, 5, l => ({
        title: l.legalName, sub: `${l.country||''} · Compliance ${l.compliance}/100`,
        onClick: () => { STE.setSession({ ...STE.getSession(), viewLicenseeId: l.id }); location.hash = "#/hq"; closeSpotlight(); }
      }));
      results.innerHTML = html;
      results.querySelectorAll("[data-row-idx]").forEach(row => {
        const idx = parseInt(row.getAttribute("data-row-idx"));
        const fn = groupBuilders[idx];
        if (fn) row.addEventListener("click", fn);
      });
      return;
    }
    results.innerHTML = html;
  }

  function showSearch(input) {
    const q = (input.value || "").trim().toLowerCase();
    const state = STE.get();
    const lic = STE.currentLicensee();
    const u = STE.currentUser();
    const scope = u && STE.isHQ(u) ? state.licensees.map(l => l.id) : (lic ? [lic.id] : []);

    const designs = (state.designs||[]).filter(d => {
      if (scope.length && !scope.includes(d.licenseeId)) return false;
      const hay = `${d.id} ${d.name} ${d.category} ${d.season} ${d.aiGrade}`.toLowerCase();
      return !q || hay.includes(q);
    });
    const statements = (state.salesStatements||[]).filter(s => {
      if (scope.length && !scope.includes(s.licenseeId)) return false;
      return !q || `${s.id} ${s.quarter} ${s.fileName} ${s.status}`.toLowerCase().includes(q);
    });
    const contracts = (state.contracts||[]).filter(c => {
      if (scope.length && !scope.includes(c.licenseeId)) return false;
      return !q || `${c.id} ${c.counterpartyName}`.toLowerCase().includes(q);
    });
    const licensees = (u && STE.isHQ(u)) ? (state.licensees||[]).filter(l => {
      return !q || `${l.id} ${l.legalName} ${l.country||''}`.toLowerCase().includes(q);
    }) : [];
    const plans = (state.seasonPlans||[]).filter(p => {
      if (scope.length && !scope.includes(p.licenseeId)) return false;
      return !q || `${p.id} ${p.season} ${p.subplan} ${p.status}`.toLowerCase().includes(q);
    });

    const empty = !designs.length && !statements.length && !contracts.length && !licensees.length && !plans.length;

    const panel = document.createElement("div");
    panel.className = "ste-hdr-panel ste-hdr-search-panel";

    let html = "";
    if (empty) html += `<div class="ste-hdr-empty">No matches for <strong>${escape(q)}</strong></div>`;
    const groupBuilders = [];

    function addGroup(label, items, limit, mapItem) {
      if (!items.length) return;
      html += `<div class="ste-hdr-group"><div class="ste-hdr-group-lbl">${label}</div>`;
      items.slice(0, limit).forEach((it) => {
        const x = mapItem(it);
        const idx = groupBuilders.length;
        groupBuilders.push(x.onClick);
        html += `<button class="ste-hdr-row" data-row-idx="${idx}">
          <div class="ste-hdr-row-body">
            <strong>${escape(x.title)}</strong>
            <span>${escape(x.sub)}</span>
          </div>
          ${x.badge ? `<span class="ste-hdr-row-badge ${x.badgeClass||''}">${x.badge}</span>` : ""}
        </button>`;
      });
      html += `</div>`;
    }

    addGroup("Designs", designs, 4, d => ({
      title: d.name, sub: `${d.id} · ${d.category} · Grade ${d.aiGrade}`,
      badge: d.aiGrade, badgeClass: `ste-grade-${d.aiGrade.toLowerCase()}`,
      onClick: () => { STE.setSession({ ...STE.getSession(), activeDesignId: d.id }); location.hash = "#/design"; close(); }
    }));
    addGroup("Sales Statements", statements, 4, s => ({
      title: s.quarter, sub: `${s.fileName} · ${s.status}`,
      onClick: () => { location.hash = "#/sales"; close(); }
    }));
    addGroup("Operation Plans", plans, 3, p => ({
      title: `${p.season} · ${p.subplan}`, sub: p.status,
      onClick: () => { location.hash = "#/timelines"; close(); }
    }));
    addGroup("Contracts", contracts, 3, c => ({
      title: c.id, sub: `Counterparty: ${c.counterpartyName}`,
      onClick: () => { STE.setSession({ ...STE.getSession(), viewLicenseeId: c.licenseeId }); location.hash = "#/agreements"; close(); }
    }));
    addGroup("Licensees", licensees, 5, l => ({
      title: `${l.id} · ${l.legalName}`, sub: `${l.country||''} · Compliance ${l.compliance}/100`,
      onClick: () => { STE.setSession({ ...STE.getSession(), viewLicenseeId: l.id }); location.hash = "#/hq"; close(); }
    }));

    html += `<div class="ste-hdr-footer">⌘K to search · esc to close</div>`;
    panel.innerHTML = html;
    open($(".header-search", activeHeader()), panel, "left");

    panel.querySelectorAll("[data-row-idx]").forEach(row => {
      const idx = parseInt(row.getAttribute("data-row-idx"));
      const fn = groupBuilders[idx];
      if (fn) row.addEventListener("click", fn);
    });
  }

  // Update the existing search panel's content without recreating it (no flash)
  function refreshSearchPanel(input, panel) {
    const q = (input.value || "").trim().toLowerCase();
    const state = STE.get();
    const lic = STE.currentLicensee();
    const u = STE.currentUser();
    const scope = u && STE.isHQ(u) ? state.licensees.map(l => l.id) : (lic ? [lic.id] : []);

    const designs = (state.designs||[]).filter(d => {
      if (scope.length && !scope.includes(d.licenseeId)) return false;
      const hay = `${d.id} ${d.name} ${d.category} ${d.season} ${d.aiGrade}`.toLowerCase();
      return !q || hay.includes(q);
    });
    const statements = (state.salesStatements||[]).filter(s => {
      if (scope.length && !scope.includes(s.licenseeId)) return false;
      return !q || `${s.id} ${s.quarter} ${s.fileName} ${s.status}`.toLowerCase().includes(q);
    });
    const contracts = (state.contracts||[]).filter(c => {
      if (scope.length && !scope.includes(c.licenseeId)) return false;
      return !q || `${c.id} ${c.counterpartyName}`.toLowerCase().includes(q);
    });
    const licensees = (u && STE.isHQ(u)) ? (state.licensees||[]).filter(l => {
      return !q || `${l.id} ${l.legalName} ${l.country||''}`.toLowerCase().includes(q);
    }) : [];
    const plans = (state.seasonPlans||[]).filter(p => {
      if (scope.length && !scope.includes(p.licenseeId)) return false;
      return !q || `${p.id} ${p.season} ${p.subplan} ${p.status}`.toLowerCase().includes(q);
    });

    const empty = !designs.length && !statements.length && !contracts.length && !licensees.length && !plans.length;
    const groupBuilders = [];
    let html = "";
    if (empty) html += `<div class="ste-hdr-empty">No matches for <strong>${escape(q)}</strong></div>`;

    function addGroup(label, items, limit, mapItem) {
      if (!items.length) return;
      html += `<div class="ste-hdr-group"><div class="ste-hdr-group-lbl">${label}</div>`;
      items.slice(0, limit).forEach((it) => {
        const x = mapItem(it);
        const idx = groupBuilders.length;
        groupBuilders.push(x.onClick);
        html += `<button class="ste-hdr-row" data-row-idx="${idx}">
          <div class="ste-hdr-row-body">
            <strong>${escape(x.title)}</strong>
            <span>${escape(x.sub)}</span>
          </div>
          ${x.badge ? `<span class="ste-hdr-row-badge ${x.badgeClass||''}">${x.badge}</span>` : ""}
        </button>`;
      });
      html += `</div>`;
    }
    addGroup("Designs", designs, 4, d => ({
      title: d.name, sub: `${d.id} · ${d.category} · Grade ${d.aiGrade}`,
      badge: d.aiGrade, badgeClass: `ste-grade-${d.aiGrade.toLowerCase()}`,
      onClick: () => { STE.setSession({ ...STE.getSession(), activeDesignId: d.id }); location.hash = "#/design"; close(); }
    }));
    addGroup("Sales Statements", statements, 4, s => ({
      title: s.quarter, sub: `${s.fileName} · ${s.status}`,
      onClick: () => { location.hash = "#/sales"; close(); }
    }));
    addGroup("Operation Plans", plans, 3, p => ({
      title: `${p.season} · ${p.subplan}`, sub: p.status,
      onClick: () => { location.hash = "#/timelines"; close(); }
    }));
    addGroup("Contracts", contracts, 3, c => ({
      title: c.id, sub: `Counterparty: ${c.counterpartyName}`,
      onClick: () => { STE.setSession({ ...STE.getSession(), viewLicenseeId: c.licenseeId }); location.hash = "#/agreements"; close(); }
    }));
    addGroup("Licensees", licensees, 5, l => ({
      title: `${l.id} · ${l.legalName}`, sub: `${l.country||''} · Compliance ${l.compliance}/100`,
      onClick: () => { STE.setSession({ ...STE.getSession(), viewLicenseeId: l.id }); location.hash = "#/hq"; close(); }
    }));
    html += `<div class="ste-hdr-footer">⌘K to search · esc to close</div>`;
    panel.innerHTML = html;
    panel.querySelectorAll("[data-row-idx]").forEach(row => {
      const idx = parseInt(row.getAttribute("data-row-idx"));
      const fn = groupBuilders[idx];
      if (fn) row.addEventListener("click", fn);
    });
  }

  // ====================== HELP ======================
  function wireHelp() {
    const root = activeHeader();
    const btn = $$(".header-icon-btn", root).find(b => /help/i.test(b.getAttribute("title") || ""));
    if (!btn || btn._wired) return;
    btn._wired = true;
    btn.style.cursor = "pointer";
    btn.addEventListener("click", () => showHelp(btn));
  }

  function showHelp(anchor) {
    const panel = document.createElement("div");
    panel.className = "ste-hdr-panel ste-hdr-menu";
    panel.innerHTML = `
      <div class="ste-hdr-group">
        <div class="ste-hdr-group-lbl">Help &amp; Support</div>
        <a class="ste-hdr-row" href="mailto:ste-support@fnf.co.kr">
          <div class="ste-hdr-row-body"><strong>Contact Support</strong><span>ste-support@fnf.co.kr · weekday 09:00–18:00 KST</span></div>
        </a>
        <a class="ste-hdr-row" href="#">
          <div class="ste-hdr-row-body"><strong>Filing Guide</strong><span>Sales statement template · validation rules · ECB FX usage</span></div>
        </a>
        <a class="ste-hdr-row" href="#">
          <div class="ste-hdr-row-body"><strong>Design Direction · 26SS</strong><span>Damarindo Refined · palette · signature rules</span></div>
        </a>
        <a class="ste-hdr-row" href="#">
          <div class="ste-hdr-row-body"><strong>Release Notes</strong><span>v0.1 · May 2026</span></div>
        </a>
      </div>
    `;
    open(anchor, panel, "right");
  }

  // ====================== NOTIFICATIONS ======================
  function wireNotifications() {
    const root = activeHeader();
    const btn = $$(".header-icon-btn", root).find(b => /notifications/i.test(b.getAttribute("title") || ""));
    if (!btn || btn._wired) return;
    btn._wired = true;
    btn.style.cursor = "pointer";
    btn.addEventListener("click", () => showNotifications(btn));
  }

  function deriveNotifications() {
    const state = STE.get();
    const u = STE.currentUser();
    if (!u) return [];
    const items = [];

    if (STE.isLicensee(u)) {
      const lic = STE.currentLicensee();
      if (!lic) return [];
      // Season plan deadline
      const season = state.seasons && state.seasons[0];
      if (season) {
        items.push({
          icon: "deadline", type: "warn",
          title: "Season Operation Plan submission deadline approaching",
          sub: `${season.code} · Due ${fmtDate(season.nextDeadline.date)} · 12 days remaining`,
          go: "#/timelines",
        });
      }
      // Latest approved statement
      const stmt = (state.salesStatements || []).find(s => s.licenseeId === lic.id && s.status === "Approved");
      if (stmt) {
        items.push({
          icon: "approval", type: "ok",
          title: `${stmt.quarter} Sales Statement approved by HQ Finance`,
          sub: `Approved by Min Jung · ${fmtDate(stmt.submittedAt)}`,
          go: "#/sales",
        });
      }
      // Designs awaiting review
      const awaiting = (state.designs || []).filter(d => d.licenseeId === lic.id && d.stage === "F&F Review").length;
      if (awaiting) {
        items.push({
          icon: "design", type: "info",
          title: `${awaiting} design submissions awaiting F&F review`,
          sub: `${state.currentSeason} Apparel · uploaded by ${lic.legalName}`,
          go: "#/design",
        });
      }
      // Contract renewal window
      const c = (state.contracts || []).find(c => c.licenseeId === lic.id);
      if (c) {
        const days = Math.round((new Date(c.termEnd) - new Date()) / 86400000);
        if (days < 365) items.push({
          icon: "contract", type: "warn",
          title: `Contract renewal window opens`,
          sub: `${c.id} · expires ${fmtDate(c.termEnd)} · D-${days}`,
          go: "#/agreements",
        });
      }
    } else {
      // HQ: aggregate across licensees
      const lics = state.licensees || [];
      lics.forEach(l => {
        const c = (state.contracts || []).find(c => c.licenseeId === l.id);
        if (!c) return;
        const days = Math.round((new Date(c.termEnd) - new Date()) / 86400000);
        if (days < 180) items.push({
          icon: "contract", type: "warn",
          title: `${l.legalName} contract renewal D-${days}`,
          sub: `Expires ${fmtDate(c.termEnd)}`,
          go: "#/agreements", licenseeId: l.id,
        });
      });
      const pending = (state.designs || []).filter(d => d.stage === "F&F Review").length;
      if (pending) items.push({
        icon: "design", type: "info",
        title: `${pending} designs awaiting your review`,
        sub: `Across ${new Set((state.designs||[]).filter(d => d.stage==='F&F Review').map(d => d.licenseeId)).size} licensees`,
        go: "#/design",
      });
      const flagged = (state.licensees || []).filter(l => l.status === "Attention" || l.status === "Review");
      flagged.forEach(l => items.push({
        icon: "alert", type: "warn",
        title: `${l.legalName} compliance flagged`,
        sub: `Status: ${l.status} · score ${l.compliance}/100`,
        go: "#/hq",
      }));
    }
    return items.slice(0, 8);
  }

  function showNotifications(anchor) {
    const items = deriveNotifications();
    const panel = document.createElement("div");
    panel.className = "ste-hdr-panel ste-hdr-notifications";
    panel.innerHTML = `
      <div class="ste-hdr-head">
        <strong>Notifications</strong>
        <span>${items.length} unread</span>
      </div>
      ${items.length === 0 ? `<div class="ste-hdr-empty">You're all caught up.</div>` :
        items.map((n, i) => `
          <button class="ste-hdr-row ste-noti-row ste-noti-${n.type}" data-go="${n.go}" data-lic="${n.licenseeId||''}">
            <span class="ste-noti-icon ste-noti-${n.icon}"></span>
            <div class="ste-hdr-row-body">
              <strong>${escape(n.title)}</strong>
              <span>${escape(n.sub)}</span>
            </div>
          </button>`).join("")}
      <div class="ste-hdr-footer">View all in <a href="#/home" data-view-all>Dashboard</a></div>
    `;
    open(anchor, panel, "right");

    panel.querySelectorAll(".ste-noti-row").forEach(b => {
      b.addEventListener("click", () => {
        const lic = b.getAttribute("data-lic");
        if (lic) STE.setSession({ ...STE.getSession(), viewLicenseeId: lic });
        location.hash = b.getAttribute("data-go");
        close();
      });
    });
  }

  // ====================== LICENSEE PICKER ======================
  // HQ users get a real picker; licensees see their own org as a static label
  // (no dropdown — clicking it doesn't make sense for an org you can't switch).
  function wireLicensee() {
    const root = activeHeader();
    const btn = $(".header-licensee", root);
    if (!btn || btn._wired) return;
    btn._wired = true;
    const u = STE.currentUser();
    if (!u) return;
    if (u.role !== "hq") {
      btn.style.cursor = "default";
      btn.removeAttribute("title");
      // Hide the chevron for licensee users — it implies a dropdown that doesn't exist
      const chev = btn.querySelector(".chev");
      if (chev) chev.style.display = "none";
      return;
    }
    btn.style.cursor = "pointer";
    btn.addEventListener("click", () => showLicenseePicker(btn));
  }

  function showLicenseePicker(anchor) {
    const state = STE.get();
    const cur = STE.currentLicensee();
    const panel = document.createElement("div");
    panel.className = "ste-hdr-panel ste-hdr-menu";
    panel.innerHTML = `
      <div class="ste-hdr-group">
        <div class="ste-hdr-group-lbl">View as licensee</div>
        ${state.licensees.map(l => `
          <button class="ste-hdr-row ${cur && cur.id===l.id ? 'active' : ''}" data-lic="${l.id}">
            <div class="ste-hdr-row-body">
              <strong>${escape(l.id)} · ${escape(l.legalName)}</strong>
              <span>${l.country||''} · ${l.currency} · Compliance ${l.compliance}/100</span>
            </div>
            ${cur && cur.id===l.id ? `<span class="ste-hdr-check">✓</span>` : ""}
          </button>
        `).join("")}
        <div class="ste-hdr-divider"></div>
        <button class="ste-hdr-row" data-lic="__all__">
          <div class="ste-hdr-row-body">
            <strong>All licensees</strong>
            <span>Cross-portfolio view</span>
          </div>
        </button>
      </div>
    `;
    open(anchor, panel, "right");
    panel.querySelectorAll("[data-lic]").forEach(b => {
      b.addEventListener("click", () => {
        const id = b.getAttribute("data-lic");
        if (id === "__all__") {
          STE.setSession({ ...STE.getSession(), viewLicenseeId: null });
          location.hash = "#/hq";
        } else {
          STE.setSession({ ...STE.getSession(), viewLicenseeId: id });
          // Stay on current page so user sees the swap
          STEApp.runForCurrentRoute();
        }
        close();
      });
    });
  }

  // ====================== PROFILE MENU ======================
  function wireProfile() {
    const root = activeHeader();
    const btn = $(".header-user", root);
    if (!btn || btn._wired) return;
    btn._wired = true;
    btn.style.cursor = "pointer";
    btn.addEventListener("click", () => showProfile(btn));
  }

  function t(k) { return (window.STEi18n && STEi18n.t) ? STEi18n.t(k) : k; }
  function showProfile(anchor) {
    const u = STE.currentUser();
    if (!u) return;
    const panel = document.createElement("div");
    panel.className = "ste-hdr-panel ste-hdr-menu ste-profile-menu";
    panel.innerHTML = `
      <div class="ste-profile-hd">
        <span class="ste-profile-avatar">${initials(u.name)}</span>
        <div>
          <strong>${escape(u.name)}</strong>
          <span>${escape(u.email || '')}</span>
          <a class="ste-profile-link" href="#/account/profile">Account Settings</a>
        </div>
      </div>
      <div class="ste-hdr-divider"></div>
      <button class="ste-hdr-row ste-hdr-signout" data-prof="signout">
        <div class="ste-hdr-row-body"><strong>${t("profile_sign_out")}</strong></div>
      </button>
    `;
    open(anchor, panel, "right");
    // Close panel after any link click (router handles the navigation)
    panel.querySelectorAll("a").forEach(a => a.addEventListener("click", () => close()));
    panel.querySelectorAll("[data-prof='signout']").forEach(b => {
      b.addEventListener("click", () => {
        STE.setSession(null);
        location.hash = "#/login";
        close();
        STEApp.toast("Signed out", "info");
      });
    });
  }

  // ====================== Helpers ======================
  function initials(name) {
    return (name || "?").split(/\s+/).map(s => s[0]).filter(Boolean).slice(0,2).join("").toUpperCase();
  }
  function fmtDate(iso) {
    try { return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return iso; }
  }
  function escape(s) { return String(s||"").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c])); }

  function wireAll() {
    wireSearch();
    wireHelp();
    wireNotifications();
    wireLicensee();
    wireProfile();
  }

  global.STEHeaderMenus = { wireAll, close };
})(window);
