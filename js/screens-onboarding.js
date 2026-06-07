/* =========================================================
   Onboarding — create a new licensee organization.
   Single-step flow: company name + billing address.
   On submit we land back on /admin/licensees with the new org
   selected; the Invite Users modal is opened from there.
   ========================================================= */
(function (global) {
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function escape(s) { return String(s||"").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c])); }
  function initials(s) { return (s||"?").split(/\s+/).map(p=>p[0]).filter(Boolean).slice(0,2).join("").toUpperCase(); }

  // Region → defaults (country + currency) so the form can stay short.
  const REGION_DEFAULTS = {
    UK: { label: "United Kingdom",  country: "GB", currency: "GBP" },
    FR: { label: "France",          country: "FR", currency: "EUR" },
    DE: { label: "Germany",         country: "DE", currency: "EUR" },
    IT: { label: "Italy",           country: "IT", currency: "EUR" },
    ES: { label: "Spain",           country: "ES", currency: "EUR" },
    NL: { label: "Netherlands",     country: "NL", currency: "EUR" },
    SE: { label: "Sweden",          country: "SE", currency: "EUR" },
    PL: { label: "Poland",          country: "PL", currency: "EUR" },
    PT: { label: "Portugal",        country: "PT", currency: "EUR" },
    CH: { label: "Switzerland",     country: "CH", currency: "CHF" },
    AT: { label: "Austria",         country: "AT", currency: "EUR" },
    BE: { label: "Belgium",         country: "BE", currency: "EUR" },
    DK: { label: "Denmark",         country: "DK", currency: "DKK" },
    NO: { label: "Norway",          country: "NO", currency: "NOK" },
    FI: { label: "Finland",         country: "FI", currency: "EUR" },
    IE: { label: "Ireland",         country: "IE", currency: "EUR" },
  };

  function ensureSection() {
    let sec = document.querySelector('section[data-page="onboarding"]');
    if (!sec) {
      sec = document.createElement("section");
      sec.setAttribute("data-page", "onboarding");
      sec.hidden = true;
      document.body.appendChild(sec);
    }
    return sec;
  }

  function deriveIdentifier(name, region) {
    if (!name) return "";
    const slug = name.toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim().split(/\s+/);
    let base = "";
    if (slug.length === 1) base = slug[0].slice(0, 4);
    else if (slug.length === 2) base = (slug[0].slice(0,2) + slug[1].slice(0,2));
    else base = slug.map(w => w[0]).join("").slice(0,4);
    return region ? `${base}-${region}` : base;
  }

  function getDraft() {
    const s = STE.getSession() || {};
    return s.onboardingDraft || {
      org: { legalName: "", currency: "EUR", categories: ["Apparel"], address: { street1: "", street2: "", city: "", state: "", postalCode: "", country: "", vatId: "" } },
    };
  }
  function saveDraft(d) {
    const s = STE.getSession() || {};
    STE.setSession({ ...s, onboardingDraft: d });
  }
  function clearDraft() {
    const s = STE.getSession() || {};
    delete s.onboardingDraft;
    STE.setSession(s);
  }

  function onboarding() {
    const sec = ensureSection();
    const u = STE.currentUser();
    if (!u) { location.hash = "#/login"; return; }
    document.querySelectorAll("section[data-page]").forEach(s => { s.hidden = s.dataset.page !== "onboarding"; });
    sec.hidden = false;

    const d = getDraft();
    const lic = STE.currentLicensee();
    const initialsStr = initials(u.name);
    sec.innerHTML = `
      <ste-shell active="admin" breadcrumb="Add Organization"
        user-name="${escape(u.name)}" user-role="${escape(u.title || '')}" user-initials="${escape(initialsStr)}"
        licensee-code="${lic ? escape(lic.id) : 'HQ'}" licensee-name="${lic ? escape(lic.legalName) : 'Global Admin View'}">
        <div class="ste-screen-pad">
          <div class="ste-section-hd">
            <div class="ste-page-crumbs"><a href="#/hq">Home</a><span class="sep">/</span><a href="#/admin/licensees">Administration</a><span class="sep">/</span><span class="cur">Add Organization</span></div>
            <h1>Add a New Organization</h1>
          </div>
          ${renderOrganization(d)}
        </div>
      </ste-shell>`;

    wire(sec, d);
  }

  function renderRegionChips(d) {
    const selected = d.org.regions || [];
    const remaining = Object.keys(REGION_DEFAULTS).filter(r => !selected.includes(r));
    return `
      <div class="ste-region-picker">
        <div class="ste-chip-input" id="ste-region-chips">
          ${selected.map(r => `<span class="ste-chip">${escape(REGION_DEFAULTS[r].label)}<button type="button" data-region-remove="${r}" aria-label="Remove">×</button></span>`).join("")}
        </div>
        ${remaining.length ? `
          <div class="ste-region-add">
            <select class="ste-input" id="ste-region-add-select">
              <option value="">+ Add region…</option>
              ${remaining.map(r => `<option value="${r}">${REGION_DEFAULTS[r].label}</option>`).join("")}
            </select>
          </div>` : `<div class="ste-mini" style="margin-top:4px">All regions added.</div>`}
      </div>`;
  }

  function renderOrganization(d) {
    const addr = d.org.address || {};
    const COUNTRIES = [
      ["GB", "United Kingdom"], ["FR", "France"], ["DE", "Germany"], ["IT", "Italy"],
      ["ES", "Spain"], ["NL", "Netherlands"], ["SE", "Sweden"], ["PL", "Poland"],
      ["PT", "Portugal"], ["CH", "Switzerland"], ["AT", "Austria"], ["BE", "Belgium"],
      ["DK", "Denmark"], ["NO", "Norway"], ["FI", "Finland"], ["IE", "Ireland"],
    ];
    return `
      <div class="ste-form-card">
        <div class="ste-form-section">
          <div class="ste-form-section-hd"><h3>Organization</h3></div>
          <div class="ste-form-grid">
            <div class="ste-field" style="grid-column: 1 / -1">
              <label class="ste-lbl">Company Name</label>
              <input class="ste-input" data-f="org.legalName" value="${escape(d.org.legalName)}" placeholder="e.g. Iberica Sportswear S.L." autofocus>
            </div>
            <div class="ste-field" style="grid-column: 1 / -1">
              <label class="ste-lbl">Billing address</label>
              <div class="ste-mini" style="margin-bottom:8px">Used on royalty invoices. Licensed territories are defined on the Agreement separately.</div>
              <input class="ste-input" data-f="org.address.street1" value="${escape(addr.street1||'')}" placeholder="Street address" style="margin-bottom:8px">
              <input class="ste-input" data-f="org.address.street2" value="${escape(addr.street2||'')}" placeholder="Street address line 2 (optional)" style="margin-bottom:8px">
              <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:8px;margin-bottom:8px">
                <input class="ste-input" data-f="org.address.city" value="${escape(addr.city||'')}" placeholder="City">
                <input class="ste-input" data-f="org.address.state" value="${escape(addr.state||'')}" placeholder="State / Region">
                <input class="ste-input" data-f="org.address.postalCode" value="${escape(addr.postalCode||'')}" placeholder="Postal code">
              </div>
              <select class="ste-input" data-f="org.address.country">
                <option value="">— Country —</option>
                ${COUNTRIES.map(([cc, label]) => `<option value="${cc}" ${cc === (addr.country || '') ? 'selected' : ''}>${escape(label)}</option>`).join("")}
              </select>
            </div>
            <div class="ste-field" style="grid-column: 1 / -1">
              <label class="ste-lbl">VAT / Tax ID</label>
              <input class="ste-input" data-f="org.address.vatId" value="${escape(addr.vatId||'')}" placeholder="e.g. GB 123 4567 89">
            </div>
          </div>
        </div>
        <div class="ste-form-actions">
          <button class="ste-btn ste-btn-ghost" data-onboard="cancel">Cancel</button>
          <button class="ste-btn ste-btn-primary" data-onboard="create-org">Create Organization</button>
        </div>
      </div>`;
  }

  function wire(sec, d) {
    $$("[data-f]", sec).forEach(inp => {
      const evt = inp.tagName === "SELECT" ? "change" : "input";
      inp.addEventListener(evt, () => {
        const path = inp.getAttribute("data-f").split(".");
        // Ensure nested objects exist (org.address.country needs org.address).
        let o = d;
        for (let i = 0; i < path.length - 1; i++) {
          if (!o[path[i]]) o[path[i]] = {};
          o = o[path[i]];
        }
        o[path[path.length - 1]] = inp.value;
        // Address country drives the licensee's country + currency defaults
        // so the new licensee record has a sensible currency pre-filled.
        if (inp.getAttribute("data-f") === "org.address.country") {
          const cc = inp.value;
          const ccDefaults = { GB: "GBP", FR: "EUR", DE: "EUR", IT: "EUR", ES: "EUR", NL: "EUR", SE: "EUR", PL: "EUR", PT: "EUR", CH: "CHF", AT: "EUR", BE: "EUR", DK: "DKK", NO: "NOK", FI: "EUR", IE: "EUR" };
          if (cc) { d.org.country = cc; if (ccDefaults[cc]) d.org.currency = ccDefaults[cc]; }
        }
        saveDraft(d);
      });
    });
    $$("[data-onboard]", sec).forEach(b => b.addEventListener("click", () => onAction(b.getAttribute("data-onboard"), d)));
  }

  function onAction(act, d) {
    if (act === "cancel") {
      clearDraft();
      location.hash = "#/admin/licensees";
      return;
    }
    if (act === "create-org") {
      if (!d.org.legalName.trim()) { STEApp.toast("Please enter a company name", "warn"); return; }
      const addr = d.org.address || {};
      const newId = deriveIdentifier(d.org.legalName, addr.country || d.org.country);
      STE.mutate(s => {
        const lic = {
          id: newId,
          legalName: d.org.legalName.trim(),
          country: addr.country || d.org.country || "",
          currency: d.org.currency || "",
          address: {
            street1: addr.street1 || "",
            street2: addr.street2 || "",
            city:    addr.city || "",
            state:   addr.state || "",
            postalCode: addr.postalCode || "",
            country: addr.country || "",
            vatId:   addr.vatId || "",
          },
          categories: d.org.categories,
          compliance: 0, status: "New",
          cumulativeMinPct: 0, yoyGrowthPct: 0, deadlineCompliancePct: 100,
          designPassRate: 0, trend: "new", trendDirection: "flat",
        };
        if (!s.licensees.find(x => x.id === lic.id)) s.licensees.push(lic);
      });
      clearDraft();
      // Carry a one-shot flag so /admin/licensees opens the Invite Users
      // modal automatically for the new org on first render.
      STE.setSession({
        ...STE.getSession(),
        viewLicenseeId: newId,
        inviteAfterCreate: newId,
      });
      STEApp.toast(`${d.org.legalName.trim()} created`, "success");
      location.hash = "#/admin/licensees";
      return;
    }
  }

  global.STEOnboarding = { onboarding };
})(window);
