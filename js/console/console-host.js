/* =========================================================
   Console Analytics — host adapter (#/analytics/<sub>)
   Renders the ported ST Licensor Console screens (window.Screens
   a1..a5 from console-screens-*.js) inside the platform shell as
   Analytics sub-pages: overview · sales · distribution · inventory
   · marketing.
   - No mode toggle: licensor/licensee follows STE.isHQ(currentUser).
   - Filter prefs persist under the Console's own LS key, isolated
     from platform state.
   ========================================================= */
(function (global) {
  const D = () => window.STEData;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const SUBS = [
    { sub: "overview",     screen: "a1", label: "Overview",        tag: "A1" },
    { sub: "sales",        screen: "a2", label: "Sales & Royalty", tag: "A2" },
    { sub: "distribution", screen: "a3", label: "Distribution",    tag: "A3" },
    { sub: "inventory",    screen: "a4", label: "Inventory",       tag: "A4" },
    { sub: "marketing",    screen: "a5", label: "Marketing",       tag: "A5" },
  ];
  const SUB2SCREEN = Object.fromEntries(SUBS.map(s => [s.sub, s.screen]));
  const SCREEN2SUB = Object.fromEntries(SUBS.map(s => [s.screen, s.sub]));

  // Reverse of _refToLicId in screens-analytics.js — platform licensee org
  // id → Console entity id.
  const LIC2ENT = {
    lic_75f7462d: "bbuk",
    lic_c2a5c666: "sugifr",
    lic_000025e9: "sugifw",
    lic_b56a4e2c: "benjamin",
    lic_05056c4c: "bds",
  };

  const PERIODS = [
    ["ytd", "Year-to-Date"],
    ["__h1", "Single Quarter"],
    ["q1", "Q1 only"], ["q2", "Q2 only"], ["q3", "Q3 only"], ["q4", "Q4 only"],
    ["__h2", "Cumulative Through"],
    ["cum1", "Through Q1"], ["cum2", "Through Q2"], ["cum3", "Through Q3"], ["full", "Full Year"],
  ];
  const YEARS = [["2025", "2025"], ["2026", "2026"], ["2027", "2027"]];

  // ---- Persistent filter state (Console-compatible key) ----
  const LS_KEY = "ste-console-state-v2";
  const state = Object.assign({
    mode: "licensor", season: "all", period: "ytd", year: "2026", axis: "calendar",
    view: "actual", channel: null, screen: "a1",
    licensorEnt: "total", licenseeSelf: "bbuk", entId: "total",
    a2view: "net", a2dim: "category",
  }, load());
  function load() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {} }

  // Mode follows the signed-in platform role (no toggle).
  function syncRole() {
    const u = STE.currentUser && STE.currentUser();
    const hq = !!(u && STE.isHQ && STE.isHQ(u));
    state.mode = hq ? "licensor" : "licensee";
    if (!hq && u && LIC2ENT[u.licenseeId]) state.licenseeSelf = LIC2ENT[u.licenseeId];
  }

  let sec = null; // <section data-page="analytics">, owned by route()

  function ensureSection() {
    let s = document.querySelector('section[data-page="analytics"]');
    if (!s) {
      s = document.createElement("section");
      s.setAttribute("data-page", "analytics");
      s.hidden = true;
      document.body.appendChild(s);
    }
    return s;
  }

  // ---- Context: theme + season + effective entity (ported applyContext) ----
  function applyContext() {
    syncRole();
    state.entId = state.mode === "licensee" ? state.licenseeSelf : state.licensorEnt;
    if (state.axis !== "season") state.season = "all"; // calendar mode ⇒ all seasons summed
    window.__steYear = state.year || "2026";
    // Theme is decoupled from role: the Console's dark "licensor" skin is
    // retired — analytics renders in the light theme for BOTH views. Role
    // (state.mode) still drives scope/labels/anonymization.
    const light = true;
    const scope = sec && sec.querySelector(".ste-console");
    if (scope) {
      scope.classList.toggle("mode-licensee", light);
      scope.classList.toggle("mode-licensor", !light);
    }
    if (window.Charts && Charts.setTheme) Charts.setTheme(light);
    if (window.Charts && Charts.setView) Charts.setView(state.view);
    D().setContext({ season: state.axis === "season" ? (state.season || "all") : "all", year: state.year, view: state.view, axis: state.axis });
  }

  // ---- Compact dropdown (ported) ----
  function dd(key, current, options, attr) {
    const cur = options.find(o => o[0] === current) || options[0];
    return `<div class="dd" data-dd="${key}">
      <button class="dd-trigger" data-dd-trigger="${key}"><span>${cur[1]}</span><span class="chev"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></span></button>
      <div class="dd-menu" data-dd-menu="${key}">
        ${options.map(o => String(o[0]).startsWith("__")
          ? `<div class="dd-hdr">${o[1]}</div>`
          : `<div class="dd-opt ${o[0] === current ? "active" : ""}" data-${attr}="${o[0]}">${o[1]}</div>`).join("")}
      </div>
    </div>`;
  }

  // ---- Filter bar (ported; mode toggle and export buttons removed) ----
  function renderFilter() {
    const isLic = state.mode === "licensee";
    const SEASONS = D().SEASONS_FILTER;
    const licenseeAxis = isLic ? lockedScope() : licenseeSelector();
    const calMode = state.axis !== "season";
    return `<div class="filterbar">
      ${licenseeAxis}
      <div style="width:1px;height:24px;background:var(--border)"></div>
      <div class="filter-group ${calMode ? "" : "axis-dim"}">
        <span class="filter-lab">Calendar</span>
        ${dd("year", state.year, YEARS, "year")}
        ${dd("period", state.period, PERIODS, "period")}
        ${!calMode ? '<span class="axis-note">Calendar inactive</span>' : ""}
      </div>
      <div style="width:1px;height:24px;background:var(--border)"></div>
      <div class="filter-group ${calMode ? "axis-dim" : ""}">
        <span class="filter-lab">Season</span>
        ${dd("season", calMode ? "all" : state.season, SEASONS, "season")}
        ${calMode ? '<span class="axis-note">Season inactive</span>' : ""}
      </div>
      <div class="spacer" style="flex:1"></div>
      <div class="filter-group">
        <span class="filter-lab">View</span>
        <div class="seg" id="view-seg">
          <button data-view="actual" class="${state.view !== "plan" ? "active" : ""}">Actual</button>
          <button data-view="plan" class="${state.view === "plan" ? "active" : ""}">Plan</button>
        </div>
      </div>
    </div>`;
  }
  function licenseeSelector() {
    const ent = D().byId(state.licensorEnt);
    return `<div class="filter-group">
      <span class="filter-lab">Licensee</span>
      <div class="lic-select" id="lic-select">
        <div class="lic-trigger" id="lic-trigger">
          <span class="flag ${ent.flag}"></span>
          <div class="lt"><b>${ent.code}</b><small>${ent.aggregate ? "5 licensees · consolidated" : ent.name}</small></div>
          <span class="chev"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></span>
        </div>
        <div class="lic-menu" id="lic-menu">
          ${D().ENTITIES.map(e => `<div class="lic-opt ${e.aggregate ? "total" : ""} ${e.id === state.licensorEnt ? "active" : ""}" data-ent="${e.id}">
            <span class="flag ${e.flag}"></span>
            <div class="lt"><b>${e.code}</b><small>${e.aggregate ? "Portfolio · all 5" : e.name + " · " + e.region}</small></div>
            <span class="check"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg></span>
          </div>`).join("")}
        </div>
      </div>
    </div>`;
  }
  function lockedScope() {
    return `<div class="filter-group">
      <span class="filter-lab">Scope</span>
      <div class="lic-trigger" style="cursor:default">
        <span class="flag flag-anon"></span>
        <div class="lt"><b>Licensee A</b><small>Auto-scoped to your account</small></div>
        <span class="chev" style="opacity:.5"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></span>
      </div>
    </div>`;
  }
  function refreshFilter() {
    const fb = sec && sec.querySelector(".ste-console > .filterbar");
    if (fb) fb.outerHTML = renderFilter();
  }

  // ---- Empty / partial states (ported verbatim) ----
  function emptyStateHtml() {
    const lab = D().closeLabel(state.period);
    return `<div class="card card-pad" style="text-align:center;padding:64px 24px;">
      <div style="width:56px;height:56px;border-radius:16px;background:var(--panel-3);border:1px solid var(--border-2);display:inline-flex;align-items:center;justify-content:center;color:var(--ink-3);margin-bottom:18px">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
      </div>
      <h2 style="font-size:18px;font-weight:700;margin:0 0 8px">No actuals yet</h2>
      <p style="color:var(--ink-2);font-size:14px;margin:0 auto 20px;max-width:440px;line-height:1.55">Actual data will be available after <b style="color:var(--ink)">${lab}</b>. You can review the committed plan for this period now.</p>
      <button class="btn btn-primary" id="switch-plan"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></svg>Switch to Plan view</button>
    </div>`;
  }
  function invNoPlanHtml() {
    return `<div class="card card-pad" style="text-align:center;padding:64px 24px;">
      <div style="width:56px;height:56px;border-radius:16px;background:var(--panel-3);border:1px solid var(--border-2);display:inline-flex;align-items:center;justify-content:center;color:var(--ink-3);margin-bottom:18px">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/></svg>
      </div>
      <h2 style="font-size:18px;font-weight:700;margin:0 0 8px">Plan data not available for Inventory yet</h2>
      <p style="color:var(--ink-2);font-size:14px;margin:0 auto 20px;max-width:460px;line-height:1.55">Inventory does not yet have a committed plan model. Switch back to Actual view to see live stock metrics.</p>
      <button class="btn btn-primary" id="switch-actual"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l5-5 4 4 8-8"/><path d="M14 8h7v7"/></svg>Switch to Actual view</button>
    </div>`;
  }
  function partialBanner() {
    const seasonAxis = state.axis === "season";
    let title, desc, pctTxt, pctW;
    if (seasonAxis) {
      const isPre = state.season === "fw26";
      if (isPre) {
        title = "Pre-launch — sell-in only";
        desc = "Season has not launched yet. Wholesale sell-in is underway; no sell-out/actuals to report.";
        pctTxt = "~12%"; pctW = "12%";
      } else {
        title = "Season in progress — sell-through to date";
        desc = "Showing realized sell-through for the current season. Plan reflects the full-season target.";
        pctTxt = "~66%"; pctW = "66%";
      }
    } else {
      title = "Quarter in progress — partial actuals";
      desc = "Showing actuals through 31 May " + state.year + ". June will close at quarter end.";
      pctTxt = "~66%"; pctW = "66%";
    }
    return `<div class="card" style="padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:12px;border-color:var(--amber-dim)">
      <span style="width:30px;height:30px;border-radius:8px;background:var(--amber-dim);color:var(--amber);display:inline-flex;align-items:center;justify-content:center;flex:0 0 30px"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v4l3 2"/><circle cx="12" cy="12" r="9"/></svg></span>
      <div style="flex:1"><div style="font-size:13px;font-weight:600">${title}</div><div style="font-size:12px;color:var(--ink-2)">${desc}</div></div>
      <div style="display:flex;align-items:center;gap:8px"><div class="minibar" style="width:120px"><i style="width:${pctW};background:var(--amber)"></i></div><span class="mono" style="font-size:11px;color:var(--ink-2)">${pctTxt}</span></div>
    </div>`;
  }

  // ---- Screen render (ported renderScreen, targets #ste-console-main) ----
  function renderScreen() {
    applyContext();
    const sc = window.Screens && window.Screens[state.screen];
    const main = sec && sec.querySelector("#ste-console-main");
    if (!sc || !main) return;
    const navItem = SUBS.find(s => s.screen === state.screen) || SUBS[0];
    const title = typeof sc.title === "function" ? sc.title(state) : sc.title;
    const avail = D().availability(state.period);
    const futureActual = state.view !== "plan" && avail === "none";
    const invNoPlan = state.view === "plan" && state.screen === "a4";
    let bodyHtml;
    if (futureActual) bodyHtml = emptyStateHtml();
    else if (invNoPlan) bodyHtml = invNoPlanHtml();
    else bodyHtml = (avail === "partial" && state.view !== "plan" ? partialBanner() : "") + sc.render(state);
    // Page title + sub live in the host's sticky .ste-section-hd (platform
    // pattern: crumbs → h1 directly below, same as every other screen).
    // Updated in place so filter changes (period/season/entity) refresh the
    // sub line without re-rendering the shell.
    const titleEl = sec.querySelector("#ste-console-title");
    if (titleEl) titleEl.textContent = title;
    const subEl = sec.querySelector("#ste-console-sub");
    if (subEl) subEl.textContent = sc.sub(state);
    main.innerHTML = `<div id="screen-body">${bodyHtml}</div>`;
    if (!futureActual && !invNoPlan) {
      try { sc.init(state); } catch (e) { console.error("console screen init error", e); }
    }
    const anchor = state._pendingAnchor || null;
    state._pendingAnchor = null;
    if (anchor && !futureActual && !invNoPlan) {
      const a = anchor;
      setTimeout(() => {
        const el = document.getElementById(a);
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY - 80;
          window.scrollTo({ top, behavior: "smooth" });
          el.classList.add("hl-flash");
          setTimeout(() => el.classList.remove("hl-flash"), 1700);
        }
      }, 140);
    }
  }

  // ---- Full page render inside the platform shell ----
  function render() {
    const u = STE.currentUser && STE.currentUser();
    if (!u) { location.hash = "#/login"; return; }
    syncRole();
    const lic = STE.currentLicensee && STE.currentLicensee();
    const isHQ = state.mode === "licensor";
    const navItem = SUBS.find(s => s.screen === state.screen) || SUBS[0];
    const salesUsesSugiPoc = navItem.sub === "sales";
    document.title = "Analytics · Sergio Tacchini";
    sec.innerHTML = `
      <ste-shell active="analytics-${navItem.sub}" breadcrumb="Analytics"
        user-name="${esc(u.name)}" user-role="${esc(u.title || "")}"
        user-initials="${esc((u.name || "?").split(/\s+/).map(s => s[0]).slice(0, 2).join("").toUpperCase())}"
        licensee-code="${lic ? esc(lic.id) : "HQ HQ"}" licensee-name="${lic ? esc(lic.legalName) : "Global Admin View"}">
      <div class="ste-screen-pad ste-analytics-console-pad">
        <div class="ste-section-hd">
          <div class="ste-page-crumbs"><a href="${isHQ ? "#/hq" : "#/home"}">Home</a><span class="sep">/</span><span class="cur">Analytics · ${esc(navItem.label)}</span></div>
          <div class="ste-page-hd-row">
            <div>
              <h1 id="ste-console-title"></h1>
              <p id="ste-console-sub"></p>
            </div>
            <div class="ste-console-actions head-actions">
              <button class="btn btn-ghost btn-sm" id="exp-pdf"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>PDF</button>
              <button class="btn btn-ghost btn-sm" id="exp-xls"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg>Excel</button>
              <span id="ste-console-view-pill" class="pill ${state.view === "plan" ? "pill-violet" : "pill-blue"}" style="font-family:var(--mono)">${state.view === "plan" ? "PLAN" : "ACTUAL"}</span>
              <span id="ste-console-role-pill" class="pill ${state.mode === "licensee" ? "pill-blue" : "pill-gray"}" style="font-family:var(--mono)">${state.mode === "licensee" ? "LICENSEE" : "LICENSOR"} · ${navItem.tag}</span>
            </div>
          </div>
        </div>
        <div class="ste-console mode-licensee">
          ${salesUsesSugiPoc ? '<div class="filterbar sugi-sales-filterbar" id="ste-sales-filterbar"></div>' : renderFilter()}
          <div class="cc-main" id="ste-console-main"></div>
        </div>
      </div>
      </ste-shell>`;
    renderScreen();
  }

  function go(screen) { location.hash = "#/analytics/" + (SCREEN2SUB[screen] || "overview"); }

  // ---- Delegated event wiring (ported wire(); document-level, once) ----
  function wire() {
    if (document._steConsoleWired) return;
    document._steConsoleWired = true;
    document.addEventListener("click", (e) => {
      const inside = e.target.closest(".ste-console, .ste-console-actions");
      if (!inside) {
        document.querySelectorAll(".ste-console .dd.open").forEach(x => x.classList.remove("open"));
        const ls0 = document.querySelector(".ste-console #lic-select");
        if (ls0) ls0.classList.remove("open");
        return;
      }
      const goCard = e.target.closest("[data-go]");
      if (goCard) {
        if (goCard.dataset.gotab) state.a2view = goCard.dataset.gotab;
        if (goCard.dataset.anchor) state._pendingAnchor = goCard.dataset.anchor;
        save(); go(goCard.dataset.go); return;
      }
      const trig = e.target.closest("#lic-trigger");
      if (trig) { const ls = sec.querySelector("#lic-select"); if (ls) ls.classList.toggle("open"); e.stopPropagation(); return; }
      const opt = e.target.closest("[data-ent]");
      if (opt) {
        state.licensorEnt = opt.dataset.ent; save();
        if (state.screen === "a2") render();
        else { refreshFilter(); renderScreen(); }
        const ls = sec.querySelector("#lic-select"); if (ls) ls.classList.remove("open");
        return;
      }
      const ddt = e.target.closest("[data-dd-trigger]");
      if (ddt) {
        const box = ddt.closest(".dd");
        const wasOpen = box.classList.contains("open");
        document.querySelectorAll(".ste-console .dd.open").forEach(x => x.classList.remove("open"));
        if (!wasOpen) box.classList.add("open");
        e.stopPropagation(); return;
      }
      const vw = e.target.closest("[data-view]");
      if (vw) { state.view = vw.dataset.view; save(); refreshFilter(); renderScreen(); return; }
      if (e.target.closest("#switch-plan")) { state.view = "plan"; save(); refreshFilter(); renderScreen(); return; }
      if (e.target.closest("#switch-actual")) { state.view = "actual"; save(); refreshFilter(); renderScreen(); return; }
      const yy = e.target.closest("[data-year]");
      if (yy) { state.axis = "calendar"; state.year = yy.dataset.year; state.season = "all"; save(); refreshFilter(); renderScreen(); return; }
      const per = e.target.closest("[data-period]");
      if (per) { state.axis = "calendar"; state.period = per.dataset.period; state.season = "all"; save(); refreshFilter(); renderScreen(); return; }
      const sea = e.target.closest("[data-season]");
      if (sea) {
        const id = sea.dataset.season;
        if (id === "all") { state.axis = "calendar"; state.season = "all"; }
        else { state.axis = "season"; state.season = id; state.period = "ytd"; }
        save(); refreshFilter(); renderScreen(); return;
      }
      const sv = e.target.closest("[data-a2view]");
      if (sv) { state.a2view = sv.dataset.a2view; save(); renderScreen(); return; }
      const ch = e.target.closest("[data-channel]");
      if (ch) { state.channel = ch.dataset.channel || null; save(); renderScreen(); return; }
      const dim = e.target.closest("[data-a2dim]");
      if (dim) { state.a2dim = dim.dataset.a2dim; save(); renderScreen(); return; }
      if (e.target.closest("#exp-pdf") || e.target.closest("#exp-xls")) {
        if (window.STEApp && STEApp.toast) STEApp.toast(e.target.closest("#exp-pdf") ? "Preparing PDF export…" : "Preparing Excel export…", "info");
        return;
      }
      if (!e.target.closest(".dd")) document.querySelectorAll(".ste-console .dd.open").forEach(x => x.classList.remove("open"));
      if (!e.target.closest("#lic-select")) { const ls = document.querySelector(".ste-console #lic-select"); if (ls) ls.classList.remove("open"); }
    });
  }

  // ---- Route entry, called by app.js for every #/analytics* hash ----
  function route() {
    const m = (location.hash || "").match(/^#\/analytics(?:\/([a-z-]+))?/);
    const sub = m && m[1];
    if (!sub || !SUB2SCREEN[sub]) { location.replace("#/analytics/overview"); return; }
    state.screen = SUB2SCREEN[sub];
    save();
    sec = ensureSection();
    document.querySelectorAll("section[data-page]").forEach(s => { s.hidden = s.dataset.page !== "analytics"; });
    sec.hidden = false;
    wire();
    render();
  }

  global.STEConsole = { route };
})(window);
