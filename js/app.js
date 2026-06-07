/* =========================================================
   STE Operations Platform — main app.
   Boots state, owns role switcher + reset, dispatches to
   per-screen enhancers when the hash route changes.
   ========================================================= */
(function () {
  const ROUTES = ["login", "home", "hq", "sales", "sales-statements", "inventory", "invoices", "design", "timelines", "operation-plans", "agreements", "forgot", "onboarding", "account", "admin", "support", "analytics", "analytics-v2", "design-review", "design-studio", "sample-review", "brand-guide"];

  async function boot() {
    await STE.init();
    if (!STE.getSession()) {
      // default session — F&F admin (Min Jung)
      // Default boot: signed in as F&F admin (Min Jung) so the HQ-side
      // experience is what the prototype lands on. Email-sign-in / SSO
      // both switch this; licensee users can be impersonated by signing
      // in as their own email.
      STE.setSession({ userId: "usr_6bc7b45b" });
    }
    removeWireframeChrome();
    startSelectEnhancer();
    bindRouter();
    bindNavTrees();
    runForCurrentRoute();
    // Reveal once the first route render has settled. Two RAFs: first lets
    // runForCurrentRoute()'s sync paint commit; second ensures it's visible
    // to the compositor before we lift the visibility:hidden FOUC guard.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => document.body.classList.add("app-ready"));
    });
  }

  // ====================== Custom dropdown enhancer ======================
  // Turn every <select class="ste-brief-select"> into a styled popover
  // dropdown. The native <select> stays in the DOM (for form value /
  // keyboard accessibility / change handlers) but is visually hidden;
  // a custom button + listbox sits on top. Any code that reads or
  // dispatches change on the <select> keeps working unchanged.
  let _cddOpenInstance = null;
  function closeAnyCdd() {
    if (_cddOpenInstance) {
      _cddOpenInstance.popover?.remove();
      _cddOpenInstance.trigger?.setAttribute("aria-expanded", "false");
      _cddOpenInstance = null;
    }
  }
  function enhanceSelect(sel) {
    if (!sel || sel._cdd) return;
    sel._cdd = true;
    const wrap = sel.closest(".ste-brief-select-wrap") || sel.parentElement;
    if (!wrap) return;
    // Make the wrap a positioning context.
    if (getComputedStyle(wrap).position === "static") wrap.style.position = "relative";
    // Hide the native select visually but keep it accessible to AT.
    sel.classList.add("ste-cdd-native");
    // Remove the inline chevron span if present — our trigger has its own.
    wrap.querySelectorAll(".ste-brief-select-chev").forEach(s => s.remove());

    const labelFor = (val) => {
      const opt = Array.from(sel.options).find(o => o.value === val);
      return opt ? opt.textContent : "";
    };

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "ste-cdd-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    trigger.innerHTML = `<span class="ste-cdd-trigger-label">${escapeText(labelFor(sel.value))}</span><span class="ste-cdd-trigger-chev" aria-hidden="true">▾</span>`;
    wrap.appendChild(trigger);

    const syncLabel = () => {
      const lab = trigger.querySelector(".ste-cdd-trigger-label");
      if (lab) lab.textContent = labelFor(sel.value);
    };
    sel.addEventListener("change", syncLabel);

    const openMenu = () => {
      closeAnyCdd();
      const rect = trigger.getBoundingClientRect();
      const popover = document.createElement("div");
      popover.className = "ste-cdd-popover";
      popover.setAttribute("role", "listbox");
      popover.style.position = "fixed";
      popover.style.minWidth = rect.width + "px";
      popover.style.left = rect.left + "px";
      popover.style.top = (rect.bottom + 4) + "px";
      const cur = sel.value;
      popover.innerHTML = Array.from(sel.options).map(opt => `
        <button type="button" class="ste-cdd-option ${opt.value === cur ? 'is-current' : ''}" data-val="${escapeAttr(opt.value)}" role="option" aria-selected="${opt.value === cur ? 'true' : 'false'}">
          <span class="ste-cdd-option-label">${escapeText(opt.textContent)}</span>
          ${opt.value === cur ? `<span class="ste-cdd-option-check" aria-hidden="true">✓</span>` : ''}
        </button>`).join("");
      document.body.appendChild(popover);
      // Flip above if not enough room below.
      const pRect = popover.getBoundingClientRect();
      if (pRect.bottom > window.innerHeight - 8) {
        popover.style.top = (rect.top - pRect.height - 4) + "px";
      }
      trigger.setAttribute("aria-expanded", "true");
      _cddOpenInstance = { popover, trigger };
      popover.querySelectorAll("[data-val]").forEach(b => b.addEventListener("click", (e) => {
        e.stopPropagation();
        const v = b.getAttribute("data-val");
        if (sel.value !== v) {
          sel.value = v;
          sel.dispatchEvent(new Event("change", { bubbles: true }));
          syncLabel();
        }
        closeAnyCdd();
      }));
    };

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      if (_cddOpenInstance && _cddOpenInstance.trigger === trigger) {
        closeAnyCdd();
      } else {
        openMenu();
      }
    });
    trigger.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        openMenu();
      }
    });
  }
  function escapeText(s) {
    return String(s == null ? "" : s).replace(/[<>&]/g, c => c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&amp;");
  }
  function escapeAttr(s) {
    return String(s == null ? "" : s).replace(/[<>&"]/g, c => c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : "&quot;");
  }
  function scanAndEnhanceSelects(root) {
    (root || document).querySelectorAll("select.ste-brief-select").forEach(enhanceSelect);
  }
  // Filter-bar active-state highlighter — toggles .is-active on every filter
  // chip (select wrap / search input / fdrop) whose underlying control has a
  // non-empty value. Lets every list page show at a glance which filters are
  // applied. Scoped to elements inside a .ste-insp-filter-bar / .ste-filter-bar
  // so non-filter dropdowns (e.g. Brief form Season selector) stay neutral.
  function markFilterActiveState(root) {
    const scope = root || document;
    const inFilterBar = (el) => !!(el && (el.closest(".ste-insp-filter-bar") || el.closest(".ste-filter-bar")));
    scope.querySelectorAll(".ste-brief-select-wrap").forEach(wrap => {
      if (!inFilterBar(wrap)) { wrap.classList.remove("is-active"); return; }
      const sel = wrap.querySelector("select");
      wrap.classList.toggle("is-active", !!(sel && sel.value));
    });
    scope.querySelectorAll(".ste-insp-filter-search").forEach(inp => {
      if (!inFilterBar(inp)) { inp.classList.remove("is-active"); return; }
      inp.classList.toggle("is-active", !!(inp.value && inp.value.trim()));
    });
    scope.querySelectorAll(".ste-cdd-trigger").forEach(trig => {
      if (!inFilterBar(trig)) { trig.classList.remove("is-active"); return; }
      const wrap = trig.closest(".ste-brief-select-wrap");
      const sel = wrap && wrap.querySelector("select");
      trig.classList.toggle("is-active", !!(sel && sel.value));
    });
  }
  function startSelectEnhancer() {
    scanAndEnhanceSelects(document);
    markFilterActiveState(document);
    const observer = new MutationObserver(muts => {
      for (const m of muts) {
        if (m.addedNodes && m.addedNodes.length) {
          scanAndEnhanceSelects(document);
          markFilterActiveState(document);
          return;
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    // Live-update active state on every filter change too — the observer
    // already catches re-renders, but inline updates (typing in the search
    // box, picking from the custom dropdown) need the immediate refresh.
    document.addEventListener("input", (e) => {
      if (e.target.closest(".ste-insp-filter-bar")) markFilterActiveState(document);
    });
    document.addEventListener("change", (e) => {
      if (e.target.closest(".ste-insp-filter-bar")) markFilterActiveState(document);
    });
    // Outside clicks close the open popover.
    document.addEventListener("mousedown", (e) => {
      if (!_cddOpenInstance) return;
      if (e.target.closest(".ste-cdd-popover") || e.target.closest(".ste-cdd-trigger")) return;
      closeAnyCdd();
    });
    // Normalize numeric inputs on blur: strip leading zeros (and redundant
    // trailing decimal zeros) so "0034" reads as "34". A single capture-phase
    // listener on document covers every type="number" field across all forms.
    // Capture means this runs BEFORE any component's own blur formatter (e.g.
    // money fields that pad to 2dp), so those still get the last word.
    document.addEventListener("blur", (e) => {
      const el = e.target;
      if (!el || el.tagName !== "INPUT" || el.type !== "number") return;
      const raw = el.value;
      if (raw === "" || raw == null) return;
      const n = Number(raw);
      if (!Number.isFinite(n)) return;
      const canonical = String(n);
      if (canonical !== raw) {
        el.value = canonical;
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }, true);
    // Esc closes; scroll/resize repositions by simply closing (cheap).
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAnyCdd(); });
    window.addEventListener("scroll", closeAnyCdd, true);
    window.addEventListener("resize", closeAnyCdd);
  }

  function mountResetDemoButton() {
    if (document.getElementById("ste-reset-zone")) return;
    // Invisible hover zone in the bottom-right corner. Moving the mouse
    // into the corner reveals the icon button; moving away fades it back
    // out. Keeps the demo chrome out of the way during walk-throughs.
    const zone = document.createElement("div");
    zone.id = "ste-reset-zone";
    const btn = document.createElement("button");
    btn.id = "ste-reset-demo";
    btn.type = "button";
    btn.title = "Reset all demo data back to the seeded defaults";
    btn.setAttribute("aria-label", "Reset demo");
    btn.innerHTML = `<span aria-hidden="true">↺</span>`;
    btn.addEventListener("click", async () => {
      if (!confirm("Reset all demo data?\n\nThis clears your boards, picks, drafts, and any changes you made — and restores the original seeded sample data. Refreshes the page when done.")) return;
      try { await STE.reset(); } catch (e) { console.error(e); }
      // Also nuke the per-user unread sets — otherwise yesterday's "seen"
      // marks linger across a fresh demo and the row dots never reappear.
      try {
        const drop = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.indexOf(UNREAD_LS_PREFIX) === 0) drop.push(k);
        }
        drop.forEach(k => localStorage.removeItem(k));
      } catch (_) {}
      // Session has its own per-page "seen" maps (designReviewSeenIds,
      // sampleReviewSeenIds, etc.) that suppress the alert banners + dots
      // for records the user already expanded. We keep the session itself
      // (don't log out), but wipe everything that gates "new" UI so the
      // post-reset state looks like a brand new demo. Filter draft / draft-
      // expand state too — they're scratch buffers tied to the cleared
      // records.
      try {
        const SESSION_NEW_GATES = [
          "designReviewSeenIds",
          "sampleReviewSeenIds",
          "mirrorRowExpanded",
          "mirrorItemDrafts",
          "mirrorItemHistoryOpen",
          "mirrorFilters",
          "inspectorFilters",
          "boardsFilters",
          "opsAlertsExpanded",
          "_openInspDropKey",
          "_inspectorFreshEntry",
          "_mirrorFreshEntry",
          "_linesOpen",
        ];
        const s = (window.STE && STE.getSession && STE.getSession()) || null;
        if (s) {
          const next = { ...s };
          let changed = false;
          SESSION_NEW_GATES.forEach(k => {
            if (k in next) { delete next[k]; changed = true; }
          });
          if (changed) STE.setSession(next);
        }
      } catch (_) {}
      // Preserve the current route so the user lands back on the same
      // page after the reload, instead of being kicked to home.
      location.reload();
    });
    zone.appendChild(btn);
    document.body.appendChild(zone);
  }

  function removeWireframeChrome() {
    // Hide (don't remove) wireframe chrome — the bundler's own inline scripts
    // dereference #bundle-drawer/#bundle-fab, so removing them throws.
    document.querySelectorAll(".wf-badge").forEach(el => { el.style.display = "none"; });
    const fab = document.getElementById("bundle-fab");
    if (fab) fab.style.display = "none";
    const drawer = document.getElementById("bundle-drawer");
    if (drawer) drawer.style.display = "none";
    mountResetDemoButton();
    // Replace every sidebar's circular "ST" mark + "STE Platform" text with the
    // real Sergio Tacchini wordmark + "Global Operations Management" subtitle.
    const _u = window.STE && STE.currentUser();
    const _isHQ = _u && window.STE && STE.isHQ && STE.isHQ(_u);
    const _viewLabel = _isHQ ? "Licensor view" : "Licensee view";
    document.body.classList.toggle("ste-licensor-mode", !!_isHQ);
    document.body.classList.toggle("ste-licensee-mode", !_isHQ);
    document.querySelectorAll(".sidebar-brand").forEach(brand => {
      if (brand._stBranded) return;
      brand._stBranded = true;
      brand.innerHTML = `
        <img class="ste-sidebar-mark" src="assets/st-mark.svg" alt="Sergio Tacchini" width="32" height="32">
        <div class="ste-sidebar-brand-text">
          <img class="ste-sidebar-logo" src="assets/st-logo-white.svg" alt="Sergio Tacchini">
          <div class="ste-sidebar-sub">Global AI Agent</div>
          <div class="ste-sidebar-viewmode ${_isHQ ? 'is-licensor' : 'is-licensee'}">${_viewLabel}</div>
        </div>
      `;
    });
    // Inject a small icon-only sidebar toggle at the LEFT of each header,
    // before the breadcrumb. Standard SaaS pattern; avoids cluttering the
    // sidebar itself.
    document.querySelectorAll(".header").forEach(header => {
      if (header.querySelector(".ste-sidebar-toggle")) return;
      const title = header.querySelector(".header-title");
      if (!title) return;
      const btn = document.createElement("button");
      btn.className = "ste-sidebar-toggle";
      btn.type = "button";
      btn.setAttribute("aria-label", "Toggle sidebar");
      btn.setAttribute("title", "Toggle sidebar");
      header.insertBefore(btn, title);
    });
    // Add hover tooltips on every sidebar nav item — only render visually
    // when the sidebar is collapsed (CSS gates by body.sidebar-collapsed).
    document.querySelectorAll(".sidebar a.nav-item, .sidebar-nav a").forEach(a => {
      if (a._ttWired) return;
      a._ttWired = true;
      // Derive label from the visible <span> text (icon span is separate).
      const labelSpan = Array.from(a.querySelectorAll("span"))
        .find(s => !s.classList.contains("icn") && !s.classList.contains("badge"));
      const text = (labelSpan && labelSpan.textContent || a.textContent || "").trim();
      if (text) a.setAttribute("data-tooltip", text);
    });

    // Hide admin-only nav items for non-admins
    try {
      const u = window.STE && STE.currentUser();
      const isAdmin = u && window.STE && STE.isAdmin && STE.isAdmin(u);
      const isHQ    = u && window.STE && STE.isHQ    && STE.isHQ(u);
      if (!isAdmin) {
        document.querySelectorAll('.sidebar a[href^="#/admin"]').forEach(a => {
          a.style.display = "none";
          // Hidden Admin is still the first .nav-item-bottom in the DOM, so it
          // absorbs the margin-top:auto pin (and the divider) meant for the
          // first *visible* bottom item — which leaves Help Center stuck to the
          // main nav. Drop the class so the pin moves to the next visible one.
          a.classList.remove("nav-item-bottom");
        });
      }
      // Design Studio used to be licensee-only, but per the licensor-platform
      // decision HQ now sees the studio (read-only across all licensees plus
      // their own boards, with a licensee filter). Other licensee-only items,
      // if any, stay hidden for HQ.
      if (isHQ) {
        document.querySelectorAll('.sidebar [data-licensee-only="1"]').forEach(a => {
          const href = a.getAttribute("href") || "";
          if (href.startsWith("#/design-studio")) return;
          a.style.display = "none";
        });
      }
    } catch (e) {}

    // Apply persisted collapse state + wire toggle
    try {
      if (localStorage.getItem("ste.sidebarCollapsed") === "1") {
        document.body.classList.add("sidebar-collapsed");
      }
    } catch (e) {}
    document.querySelectorAll(".ste-sidebar-toggle").forEach(btn => {
      if (btn._wired) return;
      btn._wired = true;
      btn.addEventListener("click", () => {
        const collapsed = !document.body.classList.contains("sidebar-collapsed");
        document.body.classList.toggle("sidebar-collapsed", collapsed);
        try { localStorage.setItem("ste.sidebarCollapsed", collapsed ? "1" : "0"); } catch (e) {}
      });
    });
  }

  function bindRouter() {
    // One-shot: normalize language storage so userPrefs and user.language
    // can't disagree. Whichever side has a value wins; if both have values
    // and they differ, userPrefs (user-facing Preferences page) wins.
    try {
      const state = STE.get();
      const norm = (v) => v === "한국어" || v === "ko" ? "ko"
                       : v === "English" || v === "en" ? "en" : null;
      let dirty = false;
      (state.users || []).forEach(u => {
        const prefs = (state.userPrefs || {})[u.id];
        const fromPrefs = norm(prefs && prefs.preferences && prefs.preferences.language);
        const fromUser  = norm(u.language);
        const canonical = fromPrefs || fromUser;
        if (!canonical) return;
        const expectedUser = canonical;
        const expectedPrefs = canonical === "ko" ? "한국어" : "English";
        if (u.language !== expectedUser) { u.language = expectedUser; dirty = true; }
        state.userPrefs = state.userPrefs || {};
        state.userPrefs[u.id] = state.userPrefs[u.id] || {};
        state.userPrefs[u.id].preferences = state.userPrefs[u.id].preferences || {};
        if (state.userPrefs[u.id].preferences.language !== expectedPrefs) {
          state.userPrefs[u.id].preferences.language = expectedPrefs; dirty = true;
        }
      });
      if (dirty) STE.mutate(() => {});
    } catch (e) { console.warn("language normalize failed", e); }

    window.addEventListener("hashchange", runForCurrentRoute);
    document.addEventListener("DOMContentLoaded", runForCurrentRoute);
  }

  function currentRoute() {
    const hash = location.hash || "";
    // Legacy path aliases — keep old links working after the URL cleanup.
    // Order matters: longer/more-specific matches first.
    const aliases = [
      ["#/inspector",      "#/design-review"],
      ["#/design-lab",     "#/design-studio"],
      ["#/studio",         "#/design-studio"],
      ["#/boards",         "#/design-studio"], // list moved under Design Studio
      ["#/mirror",         "#/sample-review"],
      ["#/codex",          "#/brand-guide"],
      ["#/design",         "#/design-review"], // legacy "Design Approvals" page
      ["#/season",         "#/timelines"],     // renamed for clarity (avoids confusion with Season Plans)
      ["#/distribution",   "#/operation-plans"],  // renamed to match the displayed name
      ["#/season-plans",   "#/operation-plans"],  // legacy slug — page renamed to "Operation Plans"
      ["#/contracts",      "#/agreements"],    // renamed to match the displayed name
      ["#/sales",          "#/sales-statements"], // canonical URL uses sales-statements
      ["#/inventory",      "#/invoices"],         // canonical URL uses invoices
      ["#/hq",             "#/home"],          // HQ + licensee share one home URL
    ];
    for (const [from, to] of aliases) {
      if (hash === from || hash.startsWith(from + "/")) {
        location.replace(to + hash.slice(from.length));
        return to.replace(/^#\//, "").split("/")[0];
      }
    }
    const h = hash.replace(/^#\/?/, "");
    // Treat sub-paths (e.g. account/profile) as their parent route
    const top = h.split("/")[0];
    return ROUTES.includes(top) ? top : "login";
  }

  let _prevRoute = null;
  function runForCurrentRoute() {
    const r = currentRoute();
    // Design Studio (the wizard) — entering the /new sub-route starts a
    // fresh wizard at step 1. The list view and /details/{id} branches set
    // their own session state in designStudio() — don't trample either.
    // Design Review entry — set a fresh-entry flag so the inspector
    // re-applies the HQ defaults (Pending Review + Under Review) on every
    // route transition INTO design-review. The inspector clears the flag
    // once it consumes it, so internal re-renders (filter changes) keep
    // whatever the user picked.
    if (r === "design-review" && _prevRoute !== "design-review") {
      try {
        const sess = STE.getSession() || {};
        STE.setSession({ ...sess, _inspectorFreshEntry: true });
      } catch (e) {}
    }
    // Sample Review entry — same pattern. Defaults to Under Review + the
    // latest season the user has data in, applied on every entry.
    if (r === "sample-review" && _prevRoute !== "sample-review") {
      try {
        const sess = STE.getSession() || {};
        STE.setSession({ ...sess, _mirrorFreshEntry: true });
      } catch (e) {}
    }
    if (r === "design-studio" && _prevRoute !== "design-studio") {
      try {
        const hash = location.hash || "";
        const newSub = hash.match(/^#\/design-studio\/(new)\b/);
        if (newSub && newSub[1] === "new") {
          const sess = STE.getSession() || {};
          STE.setSession({ ...sess, studioStep: 1 });
        }
        // Design Studio list view always loads with cleared filters — the
        // user asked for no sticky filters on entry, only inside-session
        // filter changes should persist between re-renders.
        const isListView = !/^#\/design-studio\/(new|details|edit)\b/.test(hash);
        if (isListView) {
          const sess = STE.getSession() || {};
          STE.setSession({
            ...sess,
            boardsFilters: { search: "", season: [], item: [], target: [], licensee: [] },
          });
        }
      } catch (e) {}
    }
    // Brand Guide entry — drop the editing flag on every fresh route entry
    // so the page always lands in view mode. Clicking the Edit button
    // inside the page re-sets the flag for the in-session work.
    if (r === "brand-guide" && _prevRoute !== "brand-guide") {
      try {
        const sess = STE.getSession() || {};
        if (sess.brandGuideEditing) {
          STE.setSession({ ...sess, brandGuideEditing: false });
        }
      } catch (e) {}
    }
    // Entering Analytics from elsewhere (deep link, search, drill-down card)
    // auto-opens the sidebar tree so the active sub-item is visible.
    if (r === "analytics" && _prevRoute !== "analytics") setNavTreeOpen(true);
    _prevRoute = r;
    // The bundler's own showRoute() handles visibility — we just augment.
    const handlers = {
      login: STEScreens.login,
      home: STEScreens.home,
      hq: STEScreens.hq,
      sales: STEScreens.sales,
      "sales-statements": STEScreens.sales,
      inventory: STEScreens.inventory,
      invoices: STEScreens.inventory,
      design: STEScreens.design,
      timelines: STEScreens.season,
      "operation-plans": () => STEScreens.distribution && STEScreens.distribution(),
      agreements: STEScreens.contracts,
      forgot: STEScreens.forgot,
      account: () => window.STEAccount && STEAccount.account(),
      admin: () => window.STEAdmin && STEAdmin.admin(),
      support: () => window.STESupport && STESupport.support(),
      // Console-ported analytics sub-pages (#/analytics/<sub>). The legacy
      // single-page screen lives on at #/analytics-v2 ("Analytics v2").
      analytics: () => window.STEConsole && STEConsole.route(),
      "analytics-v2": () => window.STEAnalytics && STEAnalytics.analytics(),
      onboarding: () => window.STEOnboarding && STEOnboarding.onboarding(),
      "design-review": () => window.STEDesign && STEDesign.inspector(),
      "design-studio": () => window.STEDesign && STEDesign.designStudio(),
      "sample-review": () => window.STEDesign && STEDesign.mirror(),
      "brand-guide":   () => window.STEDesign && STEDesign.codex(),
    };
    if (handlers[r]) {
      try { handlers[r](); }
      catch (e) { console.error(`[${r}] enhancer failed:`, e); }
    }
    // Dynamic pages (account/admin/support/analytics/forgot/onboarding) create
    // their own ste-shell on first visit, so the chrome (brand mark, sidebar
    // toggle, admin gating) needs to be re-applied after each route change to
    // pick up any newly-rendered headers/sidebars. Idempotent.
    removeWireframeChrome();
    paintHeaderUser();
    paintBreadcrumb(r);
    paintActiveNav(r);
    paintNavTrees();
    paintSidebarSections();
    paintNavBadges();
    paintChromeI18n();
    translatePage();
    if (window.STEHeaderMenus) STEHeaderMenus.wireAll();
  }

  // Compute and inject sidebar badge counts from live state so the numbers
  // reflect what's actually pending — not a hard-coded literal.
  function paintNavBadges() {
    const state = window.STE && STE.get ? STE.get() : null;
    if (!state) return;
    // Eagerly seed the design + sample stores so the Design Review and
    // Sample Review badges have data before the user has visited those
    // pages. Without this, the lazy seeds in /design-review and /sample-
    // review only fire on first visit, and the sidebar count is zero
    // until the user clicks into each page once.
    try { window.STEDesign && window.STEDesign.ensureSeed && window.STEDesign.ensureSeed(); } catch (_) {}
    try { window.STEDesign && window.STEDesign.ensureMirrorSeed && window.STEDesign.ensureMirrorSeed(); } catch (_) {}
    const u = STE.currentUser && STE.currentUser();
    const isHQ = u && STE.isHQ && STE.isHQ(u);

    const counts = {};
    const session = (STE.getSession && STE.getSession()) || {};

    // Design Review badge
    //  - HQ: submissions in their queue (Pending Review / Under Review, not
    //    yet decided)
    //  - Licensee: submissions that finished review (status Done) but they
    //    haven't opened yet — matches the in-page "X reviews ready to check"
    //    banner so the sidebar dot and the banner stay in sync.
    const subs = state.designSubmissions || [];
    const isDone = (s) => {
      const st = (s.status || "").toLowerCase();
      return st === "done" || st === "released" || st === "rejected" || !!s.decision;
    };
    if (isHQ) {
      counts["design-review"] = subs.filter(s => !s.decision && (s.status === "Pending Review" || s.status === "Submitted" || s.status === "Under Review")).length;
    } else if (u && u.licenseeId) {
      const seen = session.designReviewSeenIds || {};
      counts["design-review"] = subs.filter(s => s.licenseeId === u.licenseeId && isDone(s) && !seen[s.id]).length;
    }

    // Sample Review badge
    //  - HQ: samples awaiting a decision (lastResult PENDING / no result yet)
    //  - Licensee: samples where the decision is in (APPROVED / REJECTED)
    //    that the licensee hasn't expanded yet
    const samples = state.sampleRecords || [];
    if (isHQ) {
      counts["sample-review"] = samples.filter(r => !r.lastResult || r.lastResult === "PENDING").length;
    } else if (u && u.licenseeId) {
      const seen = session.sampleReviewSeenIds || {};
      counts["sample-review"] = samples.filter(r =>
        r.licenseeId === u.licenseeId
        && (r.lastResult === "APPROVED" || r.lastResult === "REJECTED")
        && !seen[`${r.batchId}|${r.code}`]
      ).length;
    }

    // Operation Plans badge
    //  - HQ: sub-plans waiting on HQ review (Pending Review)
    //  - Licensee: sub-plans they still need to submit (Draft + any that came
    //    back Rejected)
    const plans = state.seasonPlans || [];
    if (isHQ) {
      counts["operation-plans"] = plans.filter(p => p.status === "Pending Review").length;
    } else if (u && u.licenseeId) {
      counts["operation-plans"] = plans.filter(p =>
        p.licenseeId === u.licenseeId
        && (p.status === "Draft" || p.status === "Rejected")
      ).length;
    }

    // Sales Statements
    //  - HQ: pending review queue (invoicing pipeline)
    //  - Licensee: any draft statements they haven't submitted yet
    // Keyed by the route segment (#/sales-statements) so the lookup against
    // a nav link's href matches; the same goes for the Invoices badge below.
    const stmts = state.salesStatements || [];
    if (isHQ) {
      counts["sales-statements"] = stmts.filter(s => s.status === "Pending Review").length;
    } else if (u && u.licenseeId) {
      counts["sales-statements"] = stmts.filter(s =>
        s.licenseeId === u.licenseeId
        && (s.status === "Draft" || s.status === "Rejected")
      ).length;
    }

    // Invoices
    //  - HQ: invoices issued but not yet paid (post-approval auto-issue)
    //  - Licensee: outstanding (issued, not paid)
    if (isHQ) {
      counts["invoices"] = stmts.filter(s => s.invoice && s.invoice.status !== "Paid").length;
    } else if (u && u.licenseeId) {
      counts["invoices"] = stmts.filter(s =>
        s.licenseeId === u.licenseeId && s.invoice && s.invoice.status !== "Paid"
      ).length;
    }

    // Agreements
    //  - HQ owes a response on "Terms Updated" (+ legacy Review/Attention)
    //  - Licensee owes a response on "Terms Sent"
    // Draft is HQ-internal and not visible to licensees; it doesn't count
    // toward the badge because the draft form itself is the open work item.
    const contracts = state.contracts || [];
    if (isHQ) {
      counts.agreements = contracts.filter(c =>
        c.status === "Terms Updated"
        || c.status === "Review"
        || c.status === "Attention"
      ).length;
    } else if (u && u.licenseeId) {
      const myContracts = contracts.filter(c => c.licenseeId === u.licenseeId);
      counts.agreements = myContracts.filter(c => c.status === "Terms Sent").length;
    }

    document.querySelectorAll(".sidebar a.nav-item").forEach(a => {
      const href = a.getAttribute("href") || "";
      const m = href.match(/^#\/([a-z-]+)/i);
      if (!m) return;
      const id = m[1];
      if (!(id in counts)) return;
      let badge = a.querySelector(".badge");
      const n = counts[id];
      if (!n) {
        if (badge) badge.remove();
        return;
      }
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "badge";
        a.appendChild(badge);
      }
      badge.textContent = String(n);
    });
  }

  // Inject section-divider headers between consecutive nav items whose
  // data-section field changes. Idempotent — runs on every route change.
  // Translates section labels via STEi18n.
  function paintSidebarSections() {
    const t = (window.STEi18n && STEi18n.t) || ((k) => k);
    const labelFor = (s) => {
      const key = `nav_section_${s.toLowerCase()}`;
      const translated = t(key);
      return translated === key ? s : translated;
    };
    document.querySelectorAll(".sidebar-nav").forEach(nav => {
      // Clear previously-injected dividers so re-renders don't stack them
      nav.querySelectorAll(".sidebar-section[data-auto]").forEach(d => d.remove());
      let lastSection = null;
      const items = Array.from(nav.querySelectorAll(".nav-item"));
      items.forEach(a => {
        const s = a.getAttribute("data-section") || "";
        // `bottom: true` items (Admin, Help Center) don't get section headers
        if (!s || a.classList.contains("nav-item-bottom")) { lastSection = null; return; }
        if (s !== lastSection) {
          const div = document.createElement("div");
          div.className = "sidebar-section";
          div.setAttribute("data-auto", "1");
          div.textContent = labelFor(s);
          a.parentNode.insertBefore(div, a);
          lastSection = s;
        }
      });
    });
  }

  // The wireframe-era ste-shell bakes its `active=` attribute at bundle time
  // (each section has its own pre-rendered shell), so the sidebar highlight
  // gets stuck on whatever the source HTML said. Re-toggle .active on every
  // .nav-item after each route change to match the live URL.
  function paintActiveNav(route) {
    // Routes that share a nav slot
    const navAlias = { hq: "home" };
    const target = navAlias[route] || route;
    const hash = location.hash || "";
    const links = Array.from(document.querySelectorAll(".sidebar .nav-item"));
    // When several nav items share one top-level route (the five
    // #/analytics/* sub-items), disambiguate by hash prefix so only the
    // matching sub-item lights up. Single-link routes (e.g. #/admin/...)
    // keep the old route-level behavior.
    const routeCount = {};
    links.forEach(a => {
      const m = (a.getAttribute("href") || "").match(/^#\/([^\/?#]+)/);
      const r = m ? m[1] : "";
      routeCount[r] = (routeCount[r] || 0) + 1;
    });
    links.forEach(a => {
      // Tree parents (Analytics) are toggles, not destinations — never show
      // them as the selected item; only their sub-items light up.
      if (a.hasAttribute("data-nav-parent")) { a.classList.remove("active"); return; }
      const href = a.getAttribute("href") || "";
      const m = href.match(/^#\/([^\/?#]+)/);
      const linkRoute = m ? m[1] : "";
      let on = linkRoute === target;
      if (on && routeCount[linkRoute] > 1) {
        on = hash === href || hash.startsWith(href + "/") || hash.startsWith(href + "?");
      }
      a.classList.toggle("active", on);
    });
  }

  // ====================== Sidebar tree (Analytics) ======================
  // The Analytics nav item is a collapsible tree parent: clicking it toggles
  // its sub-items open/closed; used from elsewhere in the app it jumps
  // straight to Overview. Open state is shared across every shell's sidebar
  // and persisted so it survives reloads.
  const NAV_TREE_LS = "ste.navTree.analytics";
  function navTreeOpen() {
    try { return localStorage.getItem(NAV_TREE_LS) === "1"; } catch (e) { return false; }
  }
  function setNavTreeOpen(open) {
    try { localStorage.setItem(NAV_TREE_LS, open ? "1" : "0"); } catch (e) {}
    paintNavTrees();
  }
  function paintNavTrees() {
    const open = navTreeOpen();
    document.querySelectorAll('[data-subnav="analytics"]').forEach(a => {
      a.style.display = open ? "" : "none";
    });
    document.querySelectorAll('[data-nav-parent="analytics"] .ste-nav-chev').forEach(c => {
      c.classList.toggle("closed", !open);
    });
  }
  function bindNavTrees() {
    if (document._steNavTreeWired) return;
    document._steNavTreeWired = true;
    document.addEventListener("click", (e) => {
      const p = e.target.closest('[data-nav-parent="analytics"]');
      if (!p) return;
      e.preventDefault();
      const onAnalytics = (location.hash || "").startsWith("#/analytics");
      if (!navTreeOpen()) {
        // Closed → open the tree; from elsewhere in the app, also land on
        // the first sub-screen so the click visibly "does something".
        setNavTreeOpen(true);
        if (!onAnalytics) location.hash = "#/analytics/overview";
      } else if (!onAnalytics) {
        location.hash = "#/analytics/overview";
      } else {
        setNavTreeOpen(false);
      }
    });
  }

  function paintBreadcrumb(route) {
    const t = (window.STEi18n && STEi18n.t) || ((k) => k);
    const map = {
      home: "crumb_home", hq: "crumb_hq", sales: "crumb_sales",
      inventory: "crumb_inventory", design: "crumb_design",
      timelines: "crumb_season", "operation-plans": "crumb_distribution", agreements: "crumb_contracts",
      analytics: "crumb_analytics", "analytics-v2": "crumb_analytics", support: "crumb_support",
      onboarding: "crumb_onboarding",
    };
    const key = map[route];
    if (!key) return;
    const label = t(key);
    document.querySelectorAll(".header-title strong").forEach(el => { el.textContent = label; });
  }

  // Korean translations for common UI strings — applied via DOM walk after each
  // render. Lets us switch the whole interface to Korean without refactoring
  // every screen to use t().
  const KO_STRINGS = {
    // Page titles
    "Profile": "프로필",
    "Preferences": "환경설정",
    "Security": "보안",
    "Notifications": "알림",
    "Workspace": "워크스페이스",
    "Users & Roles": "사용자 및 권한",
    "Audit Log": "감사 로그",
    "Sales Statement Upload": "판매 정산서 업로드",
    "Design Approval": "디자인 승인",
    "Operation Plan": "운영 계획",
    "Operation Plans": "운영 계획",
    "Season Plan": "운영 계획",
    // Legacy strings — kept so any cached or external "Season Operation
    // Plans" label resolves to the new Korean translation cleanly.
    "Season Operation Plan": "운영 계획",
    "Season Operation Plans": "운영 계획",
    "Contract Lifecycle Management": "계약 생애주기 관리",
    "Royalty Settlement": "인보이스",
    "Global Operations Overview": "글로벌 운영 개요",
    "New Licensee Onboarding": "신규 라이선시 온보딩",
    "Reset Password": "비밀번호 재설정",
    // Section headings
    "Profile Photo": "프로필 사진",
    "Identity": "신원",
    "Language & Region": "언어 및 지역",
    "Currency Display": "통화 표시",
    "Password": "비밀번호",
    "Two-Factor Authentication": "2단계 인증",
    "Active Sessions": "활성 세션",
    "Recent Sign-ins": "최근 로그인",
    "Categories": "카테고리",
    "Quiet Hours": "방해 금지 시간",
    "Single Sign-On": "통합 인증 (SSO)",
    "FX & Reference Data": "환율 및 참조 데이터",
    "Audit & Retention": "감사 및 보존",
    // Form labels
    "Name": "이름",
    "Email": "이메일",
    "Phone": "전화번호",
    "Language": "언어",
    "Timezone": "시간대",
    "Date Format": "날짜 형식",
    "Time Format": "시간 형식",
    "Number Format": "숫자 형식",
    "First Day of Week": "주의 첫째 날",
    "Currency display (rollup)": "통화 표시 (집계)",
    "Current Password": "현재 비밀번호",
    "New Password": "새 비밀번호",
    "Confirm New Password": "새 비밀번호 확인",
    "From": "시작",
    "To": "종료",
    "FX Source": "환율 출처",
    "SKU Master Catalogue": "SKU 마스터 카탈로그",
    "Audit log retention": "감사 로그 보존",
    "Statement file retention": "정산서 파일 보존",
    "Role": "권한",
    "Assignment": "할당",
    "Last seen": "마지막 접속",
    "When": "시점",
    "Device": "기기",
    "Location": "위치",
    "Method": "방식",
    "Result": "결과",
    "Notification": "알림",
    // Buttons
    "Save changes": "변경사항 저장",
    "Cancel": "취소",
    "Change photo": "사진 변경",
    "Remove": "삭제",
    "Update password": "비밀번호 업데이트",
    "Enable 2FA": "2단계 인증 사용",
    "Reconfigure": "재설정",
    "Disconnect": "연결 해제",
    "Sign out": "로그아웃",
    "Sign out all other devices": "다른 모든 기기 로그아웃",
    "Save preferences": "환경설정 저장",
    "Reset to defaults": "기본값으로 재설정",
    "Save workspace settings": "워크스페이스 설정 저장",
    "+ Invite users": "+ 사용자 초대",
    "+ Invite user": "+ 사용자 초대",
    "Manage": "관리",
    "Filter": "필터",
    "Export CSV": "CSV 내보내기",
    "Send 0 invitations": "0건 초대 보내기",
    "Invite users": "사용자 초대",
    // Status / badges
    "Connected": "연결됨",
    "Administrator": "관리자",
    "HQ": "본사",
    "HQ User": "본사 사용자",
    "Licensee": "라이선시",
    "All licensees": "전체 라이선시",
    "Approved": "승인됨",
    "Pending": "대기 중",
    "Pending Review": "본사 검토 대기 중",
    "F&F Review": "F&F 검토",
    "Excellent": "우수",
    "Good": "양호",
    "Attention": "주의 필요",
    "Review": "검토 필요",
    "Healthy": "정상",
    "Expiring Soon": "곧 만료",
    "Review Needed": "검토 필요",
    // Common
    "Just now": "방금 전",
    "Today": "오늘",
    "Yesterday": "어제",
    "or": "또는",
    "All": "전체",
    "Action": "조치",
    "Search": "검색",
    "Continue": "계속",
    "Submit": "제출",
    "Submit to F&F": "F&F에 제출",
    "Save Draft": "임시 저장",
    "View all": "전체 보기",
    "Open": "열기",
    "Approve": "승인",
    "Reject": "거부",
    "Request Revision": "수정 요청",
    "Quick Actions": "빠른 작업",
    "Recent Notifications": "최근 알림",
    "Action Queue": "작업 대기열",
    "At a glance": "한눈에 보기",
    "Latest Quarter": "최근 분기",
    "Net Sales": "순매출",
    "Royalty": "로열티",
    "Compliance": "준수도",
    "Designs in F&F Review": "F&F 검토 중인 디자인",
    "View detailed reports →": "상세 보고서 보기 →",
    // Profile menu sub-text
    "Profile · preferences · security · notifications": "프로필 · 환경설정 · 보안 · 알림",
    "Workspace · users · audit log": "워크스페이스 · 사용자 · 감사 로그",
    // Onboarding text
    "From": "보낸 이",
    "Welcome to Sergio Tacchini Europe": "Sergio Tacchini Europe에 오신 것을 환영합니다",
  };

  function translatePage() {
    if (!window.STEi18n || STEi18n.currentLang() !== "ko") return;
    // Walk text in semantic elements where we expect labels
    const selectors = "h1, h2, h3, h4, label, button, .ste-mini, .ste-eyebrow, .ste-hd-eyebrow, .ste-form-section-hd h3, .ste-section-hd p, th, .ste-hdr-group-lbl, .ste-account-tab span, .sidebar-nav a span, .nav-item span, .nav-item > span";
    document.querySelectorAll(selectors).forEach(el => {
      // Only translate elements with a single text-node child (no nested elements)
      // or leaf text content equal to a known key
      const text = (el.firstChild && el.firstChild.nodeType === 3 ? el.firstChild.nodeValue : "").trim();
      if (text && KO_STRINGS[text]) {
        el.firstChild.nodeValue = el.firstChild.nodeValue.replace(text, KO_STRINGS[text]);
      } else {
        const all = el.textContent.trim();
        if (KO_STRINGS[all] && el.children.length === 0) {
          el.textContent = KO_STRINGS[all];
        }
      }
    });
  }

  // Translate the sidebar nav labels + search placeholder. The wireframe bakes
  // these in English; we override them at render time so KO preference shows
  // through everywhere.
  function paintChromeI18n() {
    if (!window.STEi18n) return;
    const t = STEi18n.t;
    const navMap = {
      home: "nav_home", agreements: "nav_contracts", timelines: "nav_season",
      "operation-plans": "nav_distribution",
      design: "nav_design", sales: "nav_sales", inventory: "nav_inventory",
      analytics: "nav_analytics", support: "nav_support",
      guide: "nav_guide",
    };
    document.querySelectorAll(".sidebar-nav a, .sidebar a.nav-item").forEach(a => {
      const href = a.getAttribute("href") || "";
      // The wireframe sidebar links have href like "02 Dashboard.html"
      const fileToRoute = {
        "#/home": "home",
        "#/sales": "sales",
        "#/inventory": "inventory",
        "#/design": "design",
        "#/timelines": "timelines",
        "#/operation-plans": "operation-plans",
        "#/agreements": "agreements",
        "#/analytics": "analytics",
        "#/support": "support",
        "#/admin/licensees": "admin",
        "#/admin/workspace": "admin",
        // Legacy file-name hrefs (kept in case stale sidebars remain)
        "02 Dashboard.html": "home",
        "03 Sales.html": "sales",
        "04 Inventory.html": "inventory",
        "05 Design Approval.html": "design",
        "06 Season Plan.html": "timelines",
        "07 Contracts.html": "contracts",
        "08 Guide.html": "guide",
      };
      const route = fileToRoute[href];
      if (!route) return;
      const labelSpan = a.querySelector("span:not(.badge):not([class])") || a.querySelector("span");
      if (labelSpan && navMap[route]) labelSpan.textContent = t(navMap[route]);
    });
    // Search placeholder
    document.querySelectorAll(".header-search input").forEach(inp => {
      inp.setAttribute("placeholder", t("header_search_placeholder"));
    });
  }

  function paintHeaderUser() {
    const user = STE.currentUser();
    const lic = STE.currentLicensee();
    if (!user) return;
    // Pull profile overrides (e.g. user-edited display name) from prefs
    const prefs = (STE.get().userPrefs || {})[user.id] || {};
    const displayName = (prefs.profile && prefs.profile.fullName) || user.name;
    const displayTitle = (prefs.profile && prefs.profile.title) || user.title || "";
    const initials = displayName.split(/\s+/).map(s => s[0]).filter(Boolean).slice(0,2).join("").toUpperCase();
    // The wireframe has 8 ste-shell headers (one per section). Update them all
    // so the visible one reflects current session no matter which route we're on.
    document.querySelectorAll(".header-user").forEach(hu => {
      const av = hu.querySelector(".avatar");
      const name = hu.querySelector(".who b");
      const role = hu.querySelector(".who span");
      if (av) av.textContent = initials;
      if (name) name.textContent = displayName;
      // Hide the secondary role line — name alone is enough; full details
      // live in the profile dropdown / Account Settings.
      if (role) role.style.display = "none";
    });
    // Licensee badge (only relevant on HQ view; for licensee user, header-licensee
    // already shows their own org from wireframe attributes — leave it).
    if (STE.isHQ(user)) {
      const viewLic = lic || (STE.get().licensees && STE.get().licensees[0]);
      document.querySelectorAll(".header-licensee .lab").forEach(lab => {
        if (viewLic) lab.innerHTML = `<b>${viewLic.id}</b><span>· ${viewLic.legalName}</span>`;
      });
    }
  }

  // ====================== Toast ======================
  // toast(msg, type)
  // toast(msg, type, { actionLabel, onAction }) — renders an inline action
  //   button (e.g. "Undo"); clicking it invokes onAction and dismisses the toast.
  function toast(msg, type, opts) {
    type = type || "info";
    opts = opts || {};
    let t = document.getElementById("ste-toast-stack");
    if (!t) {
      t = document.createElement("div");
      t.id = "ste-toast-stack";
      document.body.appendChild(t);
    }
    const el = document.createElement("div");
    el.className = `ste-toast ste-toast-${type}`;
    const txt = document.createElement("span");
    txt.className = "ste-toast-msg";
    txt.textContent = msg;
    el.appendChild(txt);
    let timers = [];
    const dismiss = () => {
      timers.forEach(clearTimeout);
      el.classList.remove("show");
      setTimeout(() => el.remove(), 800);
    };
    if (opts.actionLabel && typeof opts.onAction === "function") {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ste-toast-action";
      btn.textContent = opts.actionLabel;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        try { opts.onAction(); } catch (_) {}
        dismiss();
      });
      el.appendChild(btn);
    }
    t.appendChild(el);
    // Slow in (~0.6s) → hold ~4.4s → slow out (~0.6s) → cleanup.
    timers.push(setTimeout(() => { el.classList.add("show"); }, 20));
    timers.push(setTimeout(() => { el.classList.remove("show"); }, 5000));
    timers.push(setTimeout(() => { el.remove(); }, 5800));
  }

  // Repaint just the sidebar / header chrome — used by screens that re-render
  // their section in place (e.g. analytics filters) without going through a
  // full route change. Without this the sidebar reverts to the wireframe
  // default (no F&F branding, no active state).
  function repaintChrome() {
    const r = currentRoute();
    removeWireframeChrome();
    paintHeaderUser();
    paintBreadcrumb(r);
    paintActiveNav(r);
    paintNavTrees();
    paintSidebarSections();
    paintNavBadges();
    paintChromeI18n();
    translatePage();
    if (window.STEHeaderMenus) STEHeaderMenus.wireAll();
  }

  // Per-user "unread" tracker. Each user gets their own set of seen
  // record-ids (kind:id) keyed by an ISO timestamp. A row is considered
  // "new" if (a) its id has never been seen by this user, or (b) the
  // record's `lastUpdatedAt` is more recent than the last-seen mark — so
  // a record gets re-flagged as new when someone updates it after the
  // user has already opened it.
  //
  // Persisted to localStorage under "ste.unread.{userId}" so the flag
  // survives reloads. Another colleague in the same org marking a record
  // seen doesn't clear it for everyone — each user has their own copy.
  const UNREAD_LS_PREFIX = "ste.unread.";
  function _unreadKey() {
    const u = window.STE && STE.currentUser && STE.currentUser();
    return u && u.id ? UNREAD_LS_PREFIX + u.id : null;
  }
  function _readUnread() {
    const k = _unreadKey(); if (!k) return {};
    try { return JSON.parse(localStorage.getItem(k) || "{}"); } catch (_) { return {}; }
  }
  function _writeUnread(data) {
    const k = _unreadKey(); if (!k) return;
    try { localStorage.setItem(k, JSON.stringify(data)); } catch (_) {}
  }
  function _seenKey(kind, id) { return `${kind}:${id}`; }
  const STEUnread = {
    // Mark this record as seen by the current user, RIGHT NOW. Subsequent
    // updates (newer lastUpdatedAt) will re-flag it.
    markSeen(kind, id) {
      if (!kind || id == null) return;
      const data = _readUnread();
      data[_seenKey(kind, id)] = new Date().toISOString();
      _writeUnread(data);
      // Repaint badges so any unread-count surfaces (sidebar, banners)
      // reflect the new state without a full re-render of the page.
      try { paintNavBadges(); } catch (_) {}
    },
    // True when the record is unseen-by-this-user OR has been updated
    // since this user last opened it. updatedAt is optional — when omitted
    // we only flag never-seen records.
    isNew(kind, id, updatedAt) {
      if (!kind || id == null) return false;
      const data = _readUnread();
      const seenAt = data[_seenKey(kind, id)];
      if (!seenAt) return true;
      if (updatedAt && new Date(updatedAt) > new Date(seenAt)) return true;
      return false;
    },
    // Returns the bare dot markup callers drop into a row cell. The
    // caller decides when a row is "actionable for me" — pass true as
    // the optional `actionable` arg; the dot still respects the user's
    // own seen state (so the dot clears once they open the record).
    // Default is to ONLY render the dot when actionable is true so we
    // don't flag every history-row as new by default.
    dot(kind, id, updatedAt, actionable) {
      if (actionable === false) return '';
      // Backwards-compat shape: when called with three args we assume
      // the caller wants the historical "every unseen record" behavior.
      // New call sites pass `actionable` explicitly.
      const needsAttention = (actionable === undefined) ? this.isNew(kind, id, updatedAt) : !!actionable;
      if (!needsAttention) return '';
      return this.isNew(kind, id, updatedAt)
        ? '<span class="ste-unread-dot" aria-label="New" title="New — you haven\'t opened this yet"></span>'
        : '';
    },
  };
  window.STEUnread = STEUnread;

  window.STEApp = { boot, toast, runForCurrentRoute, repaintChrome };
  // Run after the bundler swap
  if (document.readyState === "complete" || document.readyState === "interactive") boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
