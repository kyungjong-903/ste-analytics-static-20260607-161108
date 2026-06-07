/* =========================================================
   Administration (#/admin/<tab>)
   HQ-only. Tabs: Workspace · Users & Roles · Audit Log
   ========================================================= */
(function (global) {
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function t(k) { return (window.STEi18n && STEi18n.t) ? STEi18n.t(k) : k; }
  const SECTION_DEFS = [
    { id: "licensees", i18n: "tab_licensees", label: "Licensees",      icon: "licensees" },
    { id: "users",     i18n: "tab_users",     label: "Users",          icon: "users",    licenseeOnly: true },
    { id: "system",    i18n: "tab_system",    label: "HQ",             icon: "users",    hqOnly: true },
    { id: "reference", i18n: "tab_reference", label: "Reference Data", icon: "sliders",  hqOnly: true },
    { id: "audit",     i18n: "tab_audit",     label: "Audit Log",      icon: "list",     hqOnly: true },
  ];
  function SECTIONS() {
    // HQ sees: Licensees, System, Reference Data, Audit Log.
    // Licensee admin sees: Organization (the Licensees tab relabelled),
    // Users (their own org's user roster).
    const u = window.STE && STE.currentUser && STE.currentUser();
    const isHQ = u && window.STE && STE.isHQ && STE.isHQ(u);
    return SECTION_DEFS
      .filter(s => {
        if (s.hqOnly) return isHQ;
        if (s.licenseeOnly) return !isHQ;
        return true;
      })
      .map(s => {
        let label = t(s.i18n) || s.label;
        if (!isHQ) {
          if (s.id === "licensees") label = "Organization";
          if (s.id === "users") label = "Users";
        }
        return { ...s, label };
      });
  }

  function ensureSection() {
    let sec = document.querySelector('section[data-page="admin"]');
    if (!sec) {
      sec = document.createElement("section");
      sec.setAttribute("data-page", "admin");
      sec.hidden = true;
      document.body.appendChild(sec);
    }
    return sec;
  }

  function currentTab() {
    const m = (location.hash || "").match(/^#\/admin(?:\/([a-z]+))?/i);
    const sub = m && m[1];
    if (sub && SECTIONS().find(t => t.id === sub)) return sub;
    return "licensees";
  }

  function admin() {
    const sec = ensureSection();
    const u = STE.currentUser();
    if (!u) { location.hash = "#/login"; return; }
    if (!STE.isAdmin(u)) { location.hash = "#/home"; return; }
    const prefs = getPrefs(u);
    const tab = currentTab();

    document.querySelectorAll("section[data-page]").forEach(s => { s.hidden = s.dataset.page !== "admin"; });
    sec.hidden = false;

    const lic = STE.currentLicensee();
    const initialsStr = (u.name||'?').split(/\s+/).map(s=>s[0]).slice(0,2).join('').toUpperCase();
    sec.innerHTML = `
      <ste-shell active="admin" breadcrumb="Administration"
        user-name="${u.name}" user-role="${u.title || ''}" user-initials="${initialsStr}"
        licensee-code="${lic ? lic.id : 'HQ HQ'}" licensee-name="${lic ? lic.legalName : 'Global Admin View'}">
        <div class="ste-account-inline">
          <nav class="ste-account-tabs">
            ${SECTIONS().map(s => `
              <a class="ste-account-tab ${s.id===tab?'active':''}" href="#/admin/${s.id}">
                <span class="ste-acct-ico ste-acct-ico-${s.icon}"></span>
                <span>${s.label}</span>
              </a>`).join("")}
          </nav>
          <main class="ste-account-panel-inline">
            ${tab === "licensees" ? renderLicensees(u) : ""}
            ${tab === "users" ? renderUsers(u) : ""}
            ${tab === "system" ? renderSystem(u) : ""}
            ${tab === "reference" ? renderReference(u) : ""}
            ${tab === "audit" ? renderAudit(u) : ""}
          </main>
        </div>
      </ste-shell>`;

    if (tab === "licensees") wireLicensees(sec, u);
    if (tab === "users") wireUsers(sec, u);
    if (tab === "system") wireSystem(sec, u);
    if (tab === "reference") wireReference(sec, u);
    if (tab === "audit") wireAudit(sec, u);
  }

  // ====================== LICENSEES & USERS ======================
  // Master-detail layout: left rail lists licensees (plus an "HQ Internal"
  // group for staff/administrators), right pane shows the selected org's
  // detail + the users belonging to it.
  function renderLicensees(u) {
    const isHQ = window.STE && STE.isHQ && STE.isHQ(u);
    const allLics = STE.get().licensees || [];
    // Licensee admins only see their own org — no rail of every other
    // organization. The "+ New" button and rail search are also dropped.
    const lics = isHQ ? allLics : allLics.filter(l => l.id === (u && u.licenseeId));
    const titleLabel = isHQ ? "Licensees" : "Organization";
    return `
      <div class="ste-section-hd">
        <div class="ste-page-crumbs"><a href="#/home">Home</a><span class="sep">/</span><span>Administration</span><span class="sep">/</span><span class="cur">${escape(titleLabel)}</span></div>
        <h1>${escape(titleLabel)}</h1>
      </div>
      <div class="ste-lu-card ${isHQ ? '' : 'ste-lu-card-single'}">
        ${isHQ ? `
        <aside class="ste-lu-rail">
          <div class="ste-lu-rail-hd">
            <div class="ste-users-search ste-lu-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/></svg>
              <input id="ste-lu-search" type="search" placeholder="Search organizations…">
            </div>
            <button class="ste-btn ste-btn-ghost ste-btn-sm" id="ste-lu-new-lic" type="button">+ New</button>
          </div>
          <div class="ste-lu-rail-list" id="ste-lu-list">
            ${renderRailItems(lics)}
          </div>
        </aside>` : ''}
        <main class="ste-lu-detail" id="ste-lu-detail"></main>
      </div>`;
  }

  function renderRailItems(lics) {
    const state = STE.get();
    if (lics.length === 0) return `<div class="ste-empty-cell" style="padding:18px">No organizations yet.</div>`;
    return lics.map(l => {
      const userCount = (state.users || []).filter(x => x.licenseeId === l.id).length;
      const init = (l.legalName || l.id).split(/\s+/).map(s => s[0]).filter(Boolean).slice(0,2).join('').toUpperCase();
      return railRow(l.id, l.legalName, userCount, init, l.logo);
    }).join("");
  }
  function railRow(id, name, userCount, init, logo) {
    const avatarInner = logo ? `<img src="${escape(logo)}" alt="">` : escape(init);
    return `
      <button class="ste-lu-rail-item" type="button" data-rail="${escape(id)}">
        <span class="ste-mini-avatar">${avatarInner}</span>
        <span class="ste-lu-rail-body">
          <strong>${escape(name)}</strong>
        </span>
        <span class="ste-lu-rail-count">${userCount}</span>
      </button>`;
  }

  function renderDetailPane(railId) {
    const state = STE.get();
    const lic = (state.licensees || []).find(l => l.id === railId);
    if (!lic) return `<div class="ste-empty" style="padding:48px;text-align:center"><p>Pick an organization on the left to view details.</p></div>`;
    const users = (state.users || []).filter(x => x.licenseeId === lic.id);
    const cu = window.STE && STE.currentUser && STE.currentUser();
    const isHQ = cu && window.STE && STE.isHQ && STE.isHQ(cu);
    const addr = lic.address || {};
    const addrLine = [addr.street1, addr.street2, addr.city, addr.state, addr.postalCode, addr.country].filter(Boolean).join(", ");
    // HQ stays on the master-detail layout with the inline users table.
    // Licensee admin gets a richer detail card (with the org's address /
    // VAT / contact + the invite/edit CTAs only) — users live on the
    // adjacent "Users" tab, so they don't need to be embedded here.
    if (!isHQ) {
      // Inline-editable Organization page for licensee admins. Per the
      // domain rule: licensee admins can edit Address + Tax ID only;
      // everything else is read-only. Header (legal-name + meta + Edit
      // button) is dropped — the section header above already names the
      // org, and edits happen in place. No card border so the fields read
      // as one flat page section, not a stacked dialog.
      return `
        <div class="ste-admin-detail ste-admin-detail-org ste-admin-detail-bare">
          <div class="ste-form-grid-2">
            <div class="ste-field">
              <div class="ste-lbl">Legal name</div>
              <div class="ste-view-val">${escape(lic.legalName || '—')}</div>
            </div>
            <div class="ste-field">
              <div class="ste-lbl">Organization code</div>
              <div class="ste-view-val">${escape(lic.code || lic.id || '—')}</div>
            </div>
            <div class="ste-field" style="grid-column: 1 / -1">
              <div class="ste-lbl">Address line 1</div>
              <input class="ste-input" type="text" data-lic-edit="street1" value="${escape(addr.street1 || '')}" placeholder="Street address">
            </div>
            <div class="ste-field" style="grid-column: 1 / -1">
              <div class="ste-lbl">Address line 2</div>
              <input class="ste-input" type="text" data-lic-edit="street2" value="${escape(addr.street2 || '')}" placeholder="Apt, suite, building (optional)">
            </div>
            <div class="ste-field">
              <div class="ste-lbl">City</div>
              <input class="ste-input" type="text" data-lic-edit="city" value="${escape(addr.city || '')}" placeholder="City">
            </div>
            <div class="ste-field">
              <div class="ste-lbl">State / Region</div>
              <input class="ste-input" type="text" data-lic-edit="state" value="${escape(addr.state || '')}" placeholder="State / region">
            </div>
            <div class="ste-field">
              <div class="ste-lbl">Postal code</div>
              <input class="ste-input" type="text" data-lic-edit="postalCode" value="${escape(addr.postalCode || '')}" placeholder="Postal code">
            </div>
            <div class="ste-field">
              <div class="ste-lbl">Country</div>
              <div class="ste-view-val">${escape(addr.country || lic.country || '—')}</div>
            </div>
            <div class="ste-field">
              <div class="ste-lbl">Tax ID / VAT</div>
              <input class="ste-input" type="text" data-lic-edit="vatId" value="${escape(addr.vatId || lic.vatId || lic.taxId || '')}" placeholder="Tax ID / VAT">
            </div>
            <div class="ste-field">
              <div class="ste-lbl">Primary contact</div>
              <div class="ste-view-val">${escape(lic.contactName || '—')}${lic.contactTitle ? ' · ' + escape(lic.contactTitle) : ''}</div>
            </div>
            <div class="ste-field">
              <div class="ste-lbl">Contact email</div>
              <div class="ste-view-val">${escape(lic.contactEmail || '—')}</div>
            </div>
          </div>
        </div>`;
    }
    // HQ — consolidated card with the inline users table.
    return `
      <div class="ste-admin-detail">
        <div class="ste-admin-detail-hd">
          <div>
            <h2>${escape(lic.legalName)}</h2>
            <div class="ste-mini">${users.length} user${users.length===1?'':'s'}${addr.city ? ` · ${escape(addr.city)}` : ''}</div>
          </div>
          <div class="ste-admin-detail-cta">
            <button class="ste-btn ste-btn-ghost" data-act="edit-org" data-lic="${escape(lic.id)}">Edit organization</button>
            <button class="ste-btn ste-btn-primary" data-act="invite-user">+ Invite user</button>
          </div>
        </div>
        ${renderUsersTable(users, lic, { hideInvite: true, hideCount: true })}
      </div>`;
  }

  function renderUsersTable(users, lic, opts) {
    opts = opts || {};
    // Toolbar only renders when there's something to show — by default the
    // count + invite button live there; the consolidated admin detail card
    // suppresses both since they're shown in the unified header above.
    const showToolbar = !opts.hideCount || !opts.hideInvite;
    return `
      <div class="ste-form-card">
        ${showToolbar ? `
          <div class="ste-users-toolbar">
            ${opts.hideCount ? '' : `<span class="ste-mini">${users.length} user${users.length===1?'':'s'}</span>`}
            ${opts.hideInvite ? '' : `<button class="ste-btn ste-btn-primary" data-act="invite-user" style="margin-left:auto">+ Invite user</button>`}
          </div>` : ''}
        <table class="ste-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Title</th><th>Last sign-in</th><th></th></tr></thead>
          <tbody>
            ${users.length ? users.map(x => {
              const pending = !!x.invitePending;
              const lastSignIn = x.lastSignInAt ? fmtDateShort(x.lastSignInAt) : (pending ? `<span class="ste-mini" style="color:var(--st-warn)">Invite pending</span>` : `<span class="ste-mini">—</span>`);
              const displayName = x.name && x.name.trim() ? escape(x.name) : `<span class="ste-mini" style="font-style:italic">(awaiting profile)</span>`;
              return `
              <tr>
                <td>
                  <div style="display:flex;gap:10px;align-items:center">
                    <span class="ste-mini-avatar">${x.name && x.name.trim() ? initials(x.name) : '✉'}</span>
                    <strong>${displayName}</strong>
                  </div>
                </td>
                <td><code class="ste-code">${escape(x.email||'')}</code></td>
                <td><span class="ste-badge ste-badge-${roleBadge(x.role)}">${escape(roleLabel(x.role))}</span></td>
                <td>${escape(x.title||'')}</td>
                <td>${lastSignIn}</td>
                <td><button class="ste-btn ste-btn-link" data-edit-user="${escape(x.id)}">Manage</button></td>
              </tr>`;
            }).join("") : `<tr><td colspan="6" class="ste-empty-cell">No users yet.</td></tr>`}
          </tbody>
        </table>
      </div>`;
  }
  function fmtDateShort(iso) {
    try { return new Date(iso).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }); } catch { return iso; }
  }

  function REGION_LABEL(code) {
    return (REGION_DEFAULTS[code] && REGION_DEFAULTS[code].label) || code;
  }

  // Country dial codes — short list covering the European licensee region
  // plus a few common others. Each option encodes ISO code, flag, name, dial.
  const PHONE_COUNTRIES = [
    { code: "GB", flag: "🇬🇧", name: "United Kingdom", dial: "+44" },
    { code: "FR", flag: "🇫🇷", name: "France",         dial: "+33" },
    { code: "DE", flag: "🇩🇪", name: "Germany",        dial: "+49" },
    { code: "IT", flag: "🇮🇹", name: "Italy",          dial: "+39" },
    { code: "ES", flag: "🇪🇸", name: "Spain",          dial: "+34" },
    { code: "NL", flag: "🇳🇱", name: "Netherlands",    dial: "+31" },
    { code: "SE", flag: "🇸🇪", name: "Sweden",         dial: "+46" },
    { code: "PL", flag: "🇵🇱", name: "Poland",         dial: "+48" },
    { code: "PT", flag: "🇵🇹", name: "Portugal",       dial: "+351" },
    { code: "CH", flag: "🇨🇭", name: "Switzerland",    dial: "+41" },
    { code: "AT", flag: "🇦🇹", name: "Austria",        dial: "+43" },
    { code: "BE", flag: "🇧🇪", name: "Belgium",        dial: "+32" },
    { code: "DK", flag: "🇩🇰", name: "Denmark",        dial: "+45" },
    { code: "NO", flag: "🇳🇴", name: "Norway",         dial: "+47" },
    { code: "FI", flag: "🇫🇮", name: "Finland",        dial: "+358" },
    { code: "IE", flag: "🇮🇪", name: "Ireland",        dial: "+353" },
    { code: "US", flag: "🇺🇸", name: "United States",  dial: "+1" },
    { code: "KR", flag: "🇰🇷", name: "Korea",          dial: "+82" },
  ];

  // ============= EDIT ORGANIZATION MODAL =============
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
  let _orgModal = null;
  function closeOrgModal() { if (_orgModal) { _orgModal.remove(); _orgModal = null; } }
  function openEditOrgModal(licId, hooks) {
    closeOrgModal();
    hooks = hooks || {};
    const lic = (STE.get().licensees || []).find(l => l.id === licId);
    if (!lic) return;
    const currentUser = window.STE && STE.currentUser && STE.currentUser();
    const isHQ = currentUser && window.STE && STE.isHQ && STE.isHQ(currentUser);
    // Licensee admins can edit ONLY address + Tax ID for their OWN org —
    // everything else is HQ-side governance. Editing a foreign org is
    // blocked outright (the rail already hides them, but guard anyway).
    if (!isHQ && lic.id !== (currentUser && currentUser.licenseeId)) {
      STEApp && STEApp.toast && STEApp.toast("You can only edit your own organization.", "warn");
      return;
    }
    const addr = lic.address || { street1: "", street2: "", city: "", state: "", postalCode: "", country: lic.country || "", vatId: "" };
    // Country list for invoice address — ISO codes paired with display labels.
    // Covers the EU + UK markets the prototype seeds; HQ can extend on demand.
    const COUNTRIES = [
      ["GB", "United Kingdom"], ["FR", "France"], ["DE", "Germany"], ["IT", "Italy"],
      ["ES", "Spain"], ["NL", "Netherlands"], ["SE", "Sweden"], ["PL", "Poland"],
      ["PT", "Portugal"], ["CH", "Switzerland"], ["AT", "Austria"], ["BE", "Belgium"],
      ["DK", "Denmark"], ["NO", "Norway"], ["FI", "Finland"], ["IE", "Ireland"],
    ];
    const initialsStr = (lic.legalName||lic.id).split(/\s+/).map(s=>s[0]).filter(Boolean).slice(0,2).join('').toUpperCase();
    const draftLogo = lic.logo || null;
    const backdrop = document.createElement("div");
    backdrop.className = "ste-spotlight-backdrop";
    backdrop.innerHTML = `
      <div class="ste-modal" role="dialog" aria-label="Edit organization">
        <div class="ste-modal-hd">
          <strong>${isHQ ? 'Edit organization' : 'Edit billing details'}</strong>
          <button class="ste-modal-close" data-eact="close" aria-label="Close">×</button>
        </div>
        <div class="ste-modal-body">
          ${isHQ ? `
          <div class="ste-photo-row">
            <div class="ste-photo-avatar" id="ste-eo-avatar">
              ${draftLogo ? `<img src="${escape(draftLogo)}" alt="">` : escape(initialsStr)}
            </div>
            <div class="ste-photo-actions">
              <button class="ste-btn ste-btn-ghost" data-eact="upload" type="button">Change image</button>
              <button class="ste-btn ste-btn-ghost" data-eact="reset-logo" type="button">Reset</button>
              <input type="file" id="ste-eo-file" accept="image/*" hidden>
            </div>
          </div>
          <div class="ste-field">
            <label class="ste-lbl">Company Name</label>
            <input class="ste-input" id="ste-eo-name" value="${escape(lic.legalName||'')}">
          </div>` : `
          <div class="ste-field">
            <div class="ste-lbl">Organization</div>
            <div class="ste-view-val">${escape(lic.legalName || '')}</div>
            <div class="ste-mini" style="margin-top:6px">Address and Tax ID are the only fields you can update. Reach out to Sergio Tacchini Europe to change anything else.</div>
          </div>`}
          <div class="ste-field">
            <label class="ste-lbl">Billing address</label>
            <div class="ste-mini" style="margin-bottom:8px">Used on invoices — required for royalty settlement.</div>
            <input class="ste-input" id="ste-eo-addr-street1" placeholder="Street address" value="${escape(addr.street1||'')}" style="margin-bottom:8px">
            <input class="ste-input" id="ste-eo-addr-street2" placeholder="Street address line 2 (optional)" value="${escape(addr.street2||'')}" style="margin-bottom:8px">
            <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:8px;margin-bottom:8px">
              <input class="ste-input" id="ste-eo-addr-city" placeholder="City" value="${escape(addr.city||'')}">
              <input class="ste-input" id="ste-eo-addr-state" placeholder="State / Region" value="${escape(addr.state||'')}">
              <input class="ste-input" id="ste-eo-addr-postal" placeholder="Postal code" value="${escape(addr.postalCode||'')}">
            </div>
            <select class="ste-input" id="ste-eo-addr-country">
              <option value="">— Country —</option>
              ${COUNTRIES.map(([cc, label]) => `<option value="${cc}" ${cc === (addr.country || '') ? 'selected' : ''}>${escape(label)}</option>`).join("")}
            </select>
          </div>
          <div class="ste-field">
            <label class="ste-lbl">VAT / Tax ID</label>
            <input class="ste-input" id="ste-eo-vat" placeholder="e.g. GB 123 4567 89" value="${escape(addr.vatId||'')}">
          </div>
        </div>
        <div class="ste-modal-actions">
          ${isHQ ? `<button class="ste-btn ste-btn-danger-ghost" data-eact="delete">Delete organization</button>` : ''}
          <div style="margin-left:auto; display:flex; gap:8px">
            <button class="ste-btn ste-btn-ghost" data-eact="close">Cancel</button>
            <button class="ste-btn ste-btn-primary" data-eact="save">Save</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(backdrop);
    _orgModal = backdrop;
    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeOrgModal(); });

    // Image upload / reset
    let pendingLogo = draftLogo;  // null = use initials, otherwise data URL
    let logoTouched = false;
    const avatar = $("#ste-eo-avatar", backdrop);
    const fileInput = $("#ste-eo-file", backdrop);
    function paintAvatar() {
      if (pendingLogo) avatar.innerHTML = `<img src="${escape(pendingLogo)}" alt="">`;
      else avatar.textContent = initialsStr;
    }
    fileInput.addEventListener("change", () => {
      const f = fileInput.files && fileInput.files[0];
      if (!f) return;
      if (!/^image\//.test(f.type)) { STEApp.toast("Pick an image file", "warn"); return; }
      const r = new FileReader();
      r.onload = (e) => {
        pendingLogo = e.target.result;
        logoTouched = true;
        paintAvatar();
      };
      r.readAsDataURL(f);
    });

    $$("[data-eact]", backdrop).forEach(b => b.addEventListener("click", (e) => {
      e.stopPropagation();
      const act = b.getAttribute("data-eact");
      if (act === "close") { closeOrgModal(); return; }
      if (act === "upload") { fileInput.click(); return; }
      if (act === "reset-logo") {
        pendingLogo = null;
        logoTouched = true;
        fileInput.value = "";
        paintAvatar();
        return;
      }
      if (act === "save") {
        // Licensee admins don't see the name field — fall back to the
        // persisted legalName so we don't try to read a missing input.
        const nameInp = $("#ste-eo-name", backdrop);
        const newName = nameInp ? nameInp.value.trim() : lic.legalName;
        if (isHQ && !newName) { STEApp.toast("Company name can't be empty", "warn"); return; }
        const newAddress = {
          street1:    $("#ste-eo-addr-street1", backdrop).value.trim(),
          street2:    $("#ste-eo-addr-street2", backdrop).value.trim(),
          city:       $("#ste-eo-addr-city",    backdrop).value.trim(),
          state:      $("#ste-eo-addr-state",   backdrop).value.trim(),
          postalCode: $("#ste-eo-addr-postal",  backdrop).value.trim(),
          country:    $("#ste-eo-addr-country", backdrop).value,
          vatId:      $("#ste-eo-vat",          backdrop).value.trim(),
        };
        STE.mutate(s => {
          const target = (s.licensees||[]).find(l => l.id === licId);
          if (!target) return;
          // Only HQ can rename the org. Licensee admins are scoped to
          // address + Tax ID; the rest stays untouched on their save.
          if (isHQ) target.legalName = newName;
          target.address = newAddress;
          // Mirror the address country up to the top-level country field so
          // anywhere that still reads lic.country stays in sync.
          if (newAddress.country) target.country = newAddress.country;
          // Legacy HQ-location fields no longer tracked — drop them on save.
          if (isHQ) {
            delete target.location;
            delete target.region;
          }
          if (isHQ && logoTouched) {
            if (pendingLogo) target.logo = pendingLogo;
            else delete target.logo;
          }
        });
        STEApp.toast(`${newName} updated`, "success");
        closeOrgModal();
        if (hooks.onChange) hooks.onChange();
        return;
      }
      if (act === "delete") {
        showDeleteConfirmStep(backdrop, lic, () => {
          STE.mutate(s => {
            s.licensees = (s.licensees || []).filter(l => l.id !== licId);
            s.users = (s.users || []).filter(u => u.licenseeId !== licId);
            s.contracts = (s.contracts || []).filter(c => c.licenseeId !== licId);
            s.designs = (s.designs || []).filter(x => x.licenseeId !== licId);
            s.salesStatements = (s.salesStatements || []).filter(x => x.licenseeId !== licId);
            s.seasonPlans = (s.seasonPlans || []).filter(x => x.licenseeId !== licId);
            const sess = STE.getSession() || {};
            if (sess.viewLicenseeId === licId) {
              STE.setSession({ ...sess, viewLicenseeId: (s.licensees[0]||{}).id || null });
            }
          });
          STEApp.toast(`${lic.legalName} deleted`, "warn");
          closeOrgModal();
          if (hooks.onDelete) hooks.onDelete();
        });
        return;
      }
    }));
    setTimeout(() => { const n = $("#ste-eo-name", backdrop); if (n) n.focus(); }, 10);
  }

  // Swap the modal body into a "type the name to confirm" delete step.
  function showDeleteConfirmStep(backdrop, lic, onConfirm) {
    const modal = backdrop.querySelector(".ste-modal");
    const userCount = (STE.get().users || []).filter(x => x.licenseeId === lic.id).length;
    modal.innerHTML = `
      <div class="ste-modal-hd">
        <span class="ste-modal-warn-icon"></span>
        <div>
          <strong style="color:var(--st-err)">Delete ${escape(lic.legalName)}?</strong>
          <div class="ste-mini">This action cannot be undone.</div>
        </div>
        <button class="ste-modal-close" data-dact="close" aria-label="Close">×</button>
      </div>
      <div class="ste-modal-body">
        <p style="margin:0 0 10px; font:500 13px/1.5 Inter,sans-serif; color:var(--ste-text)">
          You're about to permanently remove this organization and everything linked to it:
        </p>
        <ul style="margin:0 0 14px 18px; padding:0; font:500 13px/1.7 Inter,sans-serif; color:var(--ste-muted)">
          <li>${userCount} user${userCount===1?'':'s'} with access</li>
          <li>All agreements, amendments, and extension requests</li>
          <li>All season plans, design submissions, and sales statements</li>
        </ul>
        <div class="ste-field">
          <label class="ste-lbl">Type <strong style="color:var(--st-err); text-transform:none; letter-spacing:0; font-weight:700">${escape(lic.legalName)}</strong> to confirm</label>
          <input class="ste-input" id="ste-del-confirm" autocomplete="off" placeholder="${escape(lic.legalName)}">
        </div>
      </div>
      <div class="ste-modal-actions">
        <div style="margin-left:auto; display:flex; gap:8px">
          <button class="ste-btn ste-btn-ghost" data-dact="close">Cancel</button>
          <button class="ste-btn ste-btn-danger" id="ste-del-go" disabled>Delete organization</button>
        </div>
      </div>
    `;
    const input = $("#ste-del-confirm", modal);
    const btn = $("#ste-del-go", modal);
    input.addEventListener("input", () => {
      btn.disabled = input.value.trim() !== lic.legalName;
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !btn.disabled) onConfirm();
    });
    btn.addEventListener("click", () => { if (!btn.disabled) onConfirm(); });
    $$("[data-dact='close']", modal).forEach(b => b.addEventListener("click", closeOrgModal));
    setTimeout(() => input.focus(), 10);
  }

  // ============= INVITE USER MODAL =============
  // Google-Docs-style: chip-input for email addresses, role picker for the
  // batch, optional message, Send button.
  let _inviteModal = null;
  function closeInviteModal() { if (_inviteModal) { _inviteModal.remove(); _inviteModal = null; } }
  function openInviteUserModal(licenseeId, onChange) {
    closeInviteModal();
    const lic = (STE.get().licensees || []).find(l => l.id === licenseeId);
    if (!lic) return;
    const state = { emails: [], role: "user", message: "" };

    const backdrop = document.createElement("div");
    backdrop.className = "ste-spotlight-backdrop";
    backdrop.innerHTML = `
      <div class="ste-modal ste-invite-modal" role="dialog" aria-label="Invite users">
        <div class="ste-modal-hd">
          <strong>Invite users to ${escape(lic.legalName)}</strong>
          <button class="ste-modal-close" data-iact="close" aria-label="Close">×</button>
        </div>
        <div class="ste-modal-body">
          <div class="ste-field">
            <label class="ste-lbl">Add people by email</label>
            <div class="ste-invite-input-row">
              <div class="ste-chip-input" id="ste-invite-chips"></div>
              <div>
                <label class="ste-lbl" style="margin-top:4px">Role for these users</label>
                <select class="ste-input ste-invite-role-select" id="ste-invite-role">
                  <option value="user">User</option>
                  <option value="administrator">Administrator</option>
                </select>
              </div>
            </div>
            <div class="ste-mini" style="margin-top:8px">Separate with comma, space, or Enter. Paste a list of addresses to add them all at once.</div>
          </div>
          <div class="ste-field">
            <label class="ste-lbl">Add a message (optional)</label>
            <textarea class="ste-input" id="ste-invite-msg" rows="3" placeholder="Hi — joining you to our Sergio Tacchini operations platform."></textarea>
          </div>
        </div>
        <div class="ste-modal-actions">
          <div class="ste-mini" id="ste-invite-count">No invites yet</div>
          <div style="margin-left:auto; display:flex; gap:8px">
            <button class="ste-btn ste-btn-ghost" data-iact="close">Cancel</button>
            <button class="ste-btn ste-btn-primary" data-iact="send" disabled>Send invites</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(backdrop);
    _inviteModal = backdrop;

    const chips = $("#ste-invite-chips", backdrop);
    const roleSel = $("#ste-invite-role", backdrop);
    const sendBtn = $('[data-iact="send"]', backdrop);
    const countEl = $("#ste-invite-count", backdrop);

    function refresh() {
      chips.innerHTML = state.emails.map((e, i) =>
        `<span class="ste-chip">${escape(e)}<button type="button" data-rm="${i}" aria-label="Remove">×</button></span>`
      ).join("") + `<input id="ste-invite-entry" class="ste-chip-input-entry" type="email" placeholder="${state.emails.length ? 'Add more…' : 'Paste comma-separated emails or type them one by one…'}">`;
      sendBtn.disabled = state.emails.length === 0;
      countEl.textContent = state.emails.length ? `${state.emails.length} email${state.emails.length===1?'':'s'} ready to invite as ${state.role === "administrator" ? "Administrator" : "User"}` : 'No invites yet';
      wireChipInput();
    }
    function addEmails(raw) {
      const parts = raw.split(/[\s,;]+/).map(s => s.trim()).filter(Boolean);
      let added = 0;
      parts.forEach(p => {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p)) return;
        if (state.emails.includes(p)) return;
        state.emails.push(p); added++;
      });
      if (added) refresh();
    }
    function wireChipInput() {
      const entry = $("#ste-invite-entry", backdrop);
      if (!entry) return;
      entry.focus();
      entry.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === "," || (e.key === " " && entry.value.includes("@"))) {
          e.preventDefault();
          if (entry.value.trim()) { addEmails(entry.value); entry.value = ""; }
        } else if (e.key === "Backspace" && !entry.value && state.emails.length) {
          state.emails.pop();
          refresh();
        }
      });
      entry.addEventListener("blur", () => {
        if (entry.value.trim()) { addEmails(entry.value); entry.value = ""; }
      });
      entry.addEventListener("paste", (e) => {
        const text = (e.clipboardData || window.clipboardData).getData("text");
        if (!text) return;
        e.preventDefault();
        addEmails(text);
        entry.value = "";
      });
      $$("[data-rm]", chips).forEach(b => b.addEventListener("click", (e) => {
        e.preventDefault();
        const i = parseInt(b.getAttribute("data-rm"));
        state.emails.splice(i, 1);
        refresh();
      }));
    }
    refresh();

    roleSel.addEventListener("change", () => { state.role = roleSel.value; refresh(); });

    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeInviteModal(); });
    $$("[data-iact]", backdrop).forEach(b => b.addEventListener("click", (e) => {
      e.stopPropagation();
      const act = b.getAttribute("data-iact");
      if (act === "close") { closeInviteModal(); return; }
      if (act === "send") {
        if (state.emails.length === 0) return;
        STE.mutate(s => {
          state.emails.forEach((email, i) => {
            const uid = `inv-${licenseeId.toLowerCase()}-${Date.now()}-${i}`;
            if ((s.users||[]).find(u => u.email === email && u.licenseeId === licenseeId)) return;
            s.users = s.users || [];
            s.users.push({
              id: uid, name: "", role: state.role,
              licenseeId, title: "", email,
              invitePending: true, invitedAt: new Date().toISOString(),
            });
          });
        });
        STEApp.toast(`${state.emails.length} invite${state.emails.length===1?'':'s'} sent to ${lic.legalName}`, "success");
        closeInviteModal();
        if (onChange) onChange();
        return;
      }
    }));
  }

  // ============= MANAGE USER MODAL =============
  let _userModal = null;
  function closeUserModal() { if (_userModal) { _userModal.remove(); _userModal = null; } }
  function openManageUserModal(userId, onChange) {
    closeUserModal();
    const u = (STE.get().users || []).find(x => x.id === userId);
    if (!u) return;
    const lic = u.licenseeId ? (STE.get().licensees || []).find(l => l.id === u.licenseeId) : null;
    const pending = !!u.invitePending;
    const orgLabel = lic ? lic.legalName : "HQ (Internal)";
    const initialsStr = u.name && u.name.trim() ? initials(u.name) : "✉";

    const backdrop = document.createElement("div");
    backdrop.className = "ste-spotlight-backdrop";
    backdrop.innerHTML = `
      <div class="ste-modal ste-user-modal" role="dialog" aria-label="Manage user">
        <div class="ste-modal-hd">
          <strong>Manage user</strong>
          <button class="ste-modal-close" data-uact="close" aria-label="Close">×</button>
        </div>
        <div class="ste-modal-body">
          <div class="ste-photo-row">
            <div class="ste-photo-avatar" id="ste-um-avatar">
              ${u.avatar ? `<img src="${escape(u.avatar)}" alt="">` : escape(initialsStr)}
            </div>
            <div>
              ${pending ? `<span class="ste-badge ste-badge-warn">Invite pending</span>` : ''}
              ${u.lastSignInAt ? `<div class="ste-mini" style="margin-top:4px">Last sign-in: ${escape(fmtDateShort(u.lastSignInAt))}</div>` : ''}
            </div>
          </div>
          <div class="ste-field">
            <label class="ste-lbl">Organization</label>
            <input class="ste-input" value="${escape(orgLabel)}" disabled>
          </div>
          <div class="ste-field">
            <label class="ste-lbl">Name</label>
            <input class="ste-input" id="ste-um-name" value="${escape(u.name||'')}" placeholder="${pending ? 'Filled in on first sign-in' : 'Full name'}">
          </div>
          <div class="ste-field">
            <label class="ste-lbl">Email</label>
            <input class="ste-input" id="ste-um-email" type="email" value="${escape(u.email||'')}">
          </div>
          <div class="ste-field">
            <label class="ste-lbl">Title</label>
            <input class="ste-input" id="ste-um-title" value="${escape(u.title||'')}" placeholder="e.g. CEO, Operations Manager">
          </div>
          <div class="ste-field">
            <label class="ste-lbl">Phone</label>
            <div class="ste-phone-row">
              <select class="ste-input ste-phone-cc" id="ste-um-phone-cc">
                ${PHONE_COUNTRIES.map(c => `<option value="${c.code}" ${ (u.phoneCountry||"GB") === c.code ? 'selected' : '' }>${c.flag} ${c.name} (${c.dial})</option>`).join("")}
              </select>
              <input class="ste-input" id="ste-um-phone" type="tel" value="${escape(u.phone||'')}" placeholder="Phone number">
            </div>
          </div>
          <div class="ste-field">
            <label class="ste-lbl">Role</label>
            <select class="ste-input" id="ste-um-role">
              <option value="administrator" ${u.role==="administrator"?'selected':''}>Administrator</option>
              <option value="user" ${u.role==="user"?'selected':''}>User</option>
            </select>
          </div>
          <div class="ste-field">
            <label class="ste-lbl">Language</label>
            <select class="ste-input" id="ste-um-lang">
              <option value="en" ${(u.language||"en")==="en"?'selected':''}>English</option>
              <option value="ko" ${u.language==="ko"?'selected':''}>한국어</option>
            </select>
          </div>
          <div class="ste-field-row">
            <div>
              <label class="ste-lbl" style="margin-bottom:2px">Account active</label>
              <div class="ste-mini">Disable to suspend sign-in for this user.</div>
            </div>
            <label class="ste-switch">
              <input type="checkbox" id="ste-um-active" ${!u.suspended?'checked':''}>
              <span class="ste-switch-track"><span class="ste-switch-knob"></span></span>
            </label>
          </div>
        </div>
        <div class="ste-modal-actions">
          <button class="ste-btn ste-btn-danger-ghost" data-uact="remove">${pending ? 'Cancel invite' : 'Remove user'}</button>
          <button class="ste-btn ste-btn-ghost" data-uact="reset-pw">${pending ? 'Resend invite' : 'Send password reset'}</button>
          <div style="margin-left:auto; display:flex; gap:8px">
            <button class="ste-btn ste-btn-ghost" data-uact="close">Cancel</button>
            <button class="ste-btn ste-btn-primary" data-uact="save">Save</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(backdrop);
    _userModal = backdrop;

    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeUserModal(); });

    $$("[data-uact]", backdrop).forEach(b => b.addEventListener("click", (e) => {
      e.stopPropagation();
      const act = b.getAttribute("data-uact");
      if (act === "close") { closeUserModal(); return; }
      if (act === "save") {
        const name = $("#ste-um-name", backdrop).value.trim();
        const email = $("#ste-um-email", backdrop).value.trim();
        const title = $("#ste-um-title", backdrop).value.trim();
        const phone = $("#ste-um-phone", backdrop).value.trim();
        const phoneCountry = $("#ste-um-phone-cc", backdrop).value;
        const role = $("#ste-um-role", backdrop).value;
        const language = $("#ste-um-lang", backdrop).value;
        const suspended = !$("#ste-um-active", backdrop).checked;
        if (!email) { STEApp.toast("Email can't be empty", "warn"); return; }
        STE.mutate(s => {
          const target = (s.users||[]).find(x => x.id === u.id);
          if (!target) return;
          target.name = name;
          target.email = email;
          target.title = title;
          target.phone = phone;
          target.phoneCountry = phoneCountry;
          target.role = role;
          target.language = language;
          target.suspended = suspended;
          // Mirror the admin-side language code into userPrefs so the
          // Preferences page reads the same value (avoids divergence between
          // the two write paths).
          s.userPrefs = s.userPrefs || {};
          s.userPrefs[u.id] = s.userPrefs[u.id] || {};
          s.userPrefs[u.id].preferences = s.userPrefs[u.id].preferences || {};
          s.userPrefs[u.id].preferences.language = (language === "ko") ? "한국어" : "English";
        });
        STEApp.toast(`${name || email} updated`, "success");
        closeUserModal();
        if (onChange) onChange();
        return;
      }
      if (act === "remove") {
        const verb = pending ? "Cancel the invite for" : "Remove";
        if (!window.confirm(`${verb} ${u.name || u.email}? This cannot be undone.`)) return;
        STE.mutate(s => { s.users = (s.users||[]).filter(x => x.id !== u.id); });
        STEApp.toast(`${u.name || u.email} ${pending ? 'invite cancelled' : 'removed'}`, "warn");
        closeUserModal();
        if (onChange) onChange();
        return;
      }
      if (act === "reset-pw") {
        if (pending) {
          STE.mutate(s => {
            const target = (s.users||[]).find(x => x.id === u.id);
            if (target) target.invitedAt = new Date().toISOString();
          });
          STEApp.toast(`Invite resent to ${u.email}`, "success");
        } else {
          STEApp.toast(`Password reset email sent to ${u.email}`, "success");
        }
        return;
      }
    }));

    setTimeout(() => { const t = $("#ste-um-title", backdrop); if (t) t.focus(); }, 10);
  }

  function wireLicensees(sec, u) {
    const list = $("#ste-lu-list", sec);
    const detail = $("#ste-lu-detail", sec);
    const search = $("#ste-lu-search", sec);
    const isHQ = window.STE && STE.isHQ && STE.isHQ(u);
    const allLics = STE.get().licensees || [];
    const lics = isHQ ? allLics : allLics.filter(l => l.id === (u && u.licenseeId));
    const session = STE.getSession() || {};
    // Licensee admin auto-lands on their own org — no rail to choose from.
    let activeId = !isHQ
      ? ((u && u.licenseeId) || null)
      : ((session.viewLicenseeId && lics.find(l => l.id === session.viewLicenseeId))
          ? session.viewLicenseeId
          : (lics[0] && lics[0].id) || null);
    function selectRail(id) {
      activeId = id;
      $$("[data-rail]", list).forEach(b => b.classList.toggle("active", b.getAttribute("data-rail") === id));
      detail.innerHTML = renderDetailPane(id);
      wireDetail();
    }
    function wireDetail() {
      const invite = $('[data-act="invite-user"]', detail);
      if (invite) invite.addEventListener("click", () => openInviteUserModal(activeId, () => selectRail(activeId)));
      $$("[data-edit-user]", detail).forEach(b => b.addEventListener("click", () => {
        openManageUserModal(b.getAttribute("data-edit-user"), () => {
          // Re-render the detail pane so changes show up
          selectRail(activeId);
        });
      }));
      // Inline org-field edits — licensee admin's Organization page. Each
      // input writes back to s.licensees[activeId].address.* (or vatId) on
      // blur. A short toast confirms each save.
      $$("[data-lic-edit]", detail).forEach(input => {
        const initial = input.value;
        input.addEventListener("blur", () => {
          const key = input.getAttribute("data-lic-edit");
          const val = input.value.trim();
          if (val === initial.trim()) return;
          STE.mutate(s => {
            const target = (s.licensees || []).find(l => l.id === activeId);
            if (!target) return;
            target.address = target.address || {};
            if (key === "vatId") target.address.vatId = val;
            else target.address[key] = val;
          });
          STEApp.toast(`Updated`, "success");
        });
      });
      const edit = $('[data-act="edit-org"]', detail);
      if (edit) edit.addEventListener("click", () => openEditOrgModal(edit.getAttribute("data-lic"), {
        onChange: () => selectRail(activeId),
        onDelete: () => {
          const remaining = STE.get().licensees || [];
          list.innerHTML = renderRailItems(remaining);
          wireRail();
          activeId = (remaining[0] && remaining[0].id) || null;
          if (activeId) selectRail(activeId);
          else detail.innerHTML = `<div class="ste-empty" style="padding:48px;text-align:center"><p>No organizations yet.</p></div>`;
        },
      }));
    }
    function wireRail() {
      $$("[data-rail]", list).forEach(b => b.addEventListener("click", () => selectRail(b.getAttribute("data-rail"))));
    }
    wireRail();
    if (activeId) selectRail(activeId);
    // One-shot: after creating an organization, auto-open the Invite modal
    const sess = STE.getSession() || {};
    if (sess.inviteAfterCreate && sess.inviteAfterCreate === activeId) {
      STE.setSession({ ...sess, inviteAfterCreate: null });
      setTimeout(() => openInviteUserModal(activeId, () => selectRail(activeId)), 50);
    }
    if (search) search.addEventListener("input", () => {
      const q = (search.value || "").trim().toLowerCase();
      const lics = (STE.get().licensees || []).filter(l => !q || [l.id, l.legalName, l.country, l.address && l.address.city].filter(Boolean).join(" ").toLowerCase().includes(q));
      list.innerHTML = renderRailItems(lics);
      wireRail();
      $$("[data-rail]", list).forEach(b => b.classList.toggle("active", b.getAttribute("data-rail") === activeId));
    });
    const newBtn = $("#ste-lu-new-lic", sec);
    if (newBtn) newBtn.addEventListener("click", () => { location.hash = "#/onboarding"; });
  }

  // ====================== WORKSPACE ======================
  function renderWorkspace(u, prefs) {
    const w = prefs.workspace || {};
    return `
      <div class="ste-section-hd">
        <div class="ste-page-crumbs"><a href="#/home">Home</a><span class="sep">/</span><span>Administration</span><span class="sep">/</span><span class="cur">Workspace</span></div>
        <h1>Workspace</h1>
      </div>

      <div class="ste-form-card">
        <div class="ste-form-section">
          <div class="ste-form-section-hd"><h3>Single Sign-On</h3></div>
          <div class="ste-sso-card">
            <div>
              <strong>Microsoft Entra ID</strong>
              <div class="ste-mini">Tenant: fnf.onmicrosoft.com · 4,217 users provisioned · auto-sync every 60 min</div>
            </div>
            <span class="ste-badge ste-badge-ok">Connected</span>
          </div>
          <div class="ste-form-actions" style="border-top:0; padding-top:12px; background:transparent">
            <button class="ste-btn ste-btn-ghost" data-act="reconfigure-sso">Reconfigure</button>
            <button class="ste-btn ste-btn-link ste-btn-danger" data-act="disconnect-sso">Disconnect</button>
          </div>
        </div>

        <div class="ste-form-section">
          <div class="ste-form-section-hd"><h3>FX &amp; Reference Data</h3></div>
          <div class="ste-form-grid">
            <div class="ste-form-field">
              <label>FX Source</label>
              <select class="ste-input" data-f="workspace.fxSource">
                <option ${w.fxSource==='ECB'||!w.fxSource?'selected':''}>ECB Daily reference</option>
                <option ${w.fxSource==='BOK'?'selected':''}>Bank of Korea</option>
              </select>
            </div>
            <div class="ste-form-field">
              <label>Style Code Master Catalogue</label>
              <input class="ste-input" value="EU catalogue v3.1 · updated 2026-01-15" disabled>
            </div>
          </div>
        </div>

        <div class="ste-form-section">
          <div class="ste-form-section-hd"><h3>Audit &amp; Retention</h3></div>
          <div class="ste-form-grid">
            <div class="ste-form-field">
              <label>Audit log retention</label>
              <select class="ste-input" data-f="workspace.auditRetention">
                <option ${w.auditRetention==='1y'?'selected':''}>1 year</option>
                <option ${w.auditRetention==='3y'?'selected':''}>3 years</option>
                <option ${!w.auditRetention||w.auditRetention==='7y'?'selected':''}>7 years (default)</option>
                <option ${w.auditRetention==='forever'?'selected':''}>Forever</option>
              </select>
            </div>
            <div class="ste-form-field">
              <label>Statement file retention</label>
              <select class="ste-input" data-f="workspace.statementRetention">
                <option ${w.statementRetention==='3y'?'selected':''}>3 years</option>
                <option ${!w.statementRetention||w.statementRetention==='7y'?'selected':''}>7 years (default)</option>
                <option ${w.statementRetention==='10y'?'selected':''}>10 years</option>
              </select>
            </div>
          </div>
        </div>

        <div class="ste-form-actions">
          <button class="ste-btn ste-btn-primary" data-act="save-workspace">Save workspace settings</button>
        </div>
      </div>`;
  }
  function wireWorkspace(sec, u, prefs) {
    prefs.workspace = prefs.workspace || {};
    $$("[data-f^='workspace.']", sec).forEach(inp => inp.addEventListener("input", () => bindField(prefs, inp)));
    $("[data-act='save-workspace']", sec)?.addEventListener("click", () => {
      setPrefs(u, prefs);
      STEApp.toast("Workspace settings saved", "success");
    });
    $("[data-act='reconfigure-sso']", sec)?.addEventListener("click", () => STEApp.toast("Microsoft Entra ID reconfigure — coming soon", "info"));
    $("[data-act='disconnect-sso']", sec)?.addEventListener("click", () => {
      if (!confirm("Disconnect Microsoft SSO? Users will need to sign in by email until reconnected.")) return;
      STEApp.toast("SSO disconnected (simulated)", "warn");
    });
  }

  // ====================== USERS & ROLES ======================
  function renderUsers(u) {
    const isHQ = window.STE && STE.isHQ && STE.isHQ(u);
    const allUsers = STE.get().users || [];
    // Licensee admin scopes to their own organization's roster only.
    const users = isHQ ? allUsers : allUsers.filter(x => x.licenseeId === (u && u.licenseeId));
    const titleLabel = isHQ ? "Users &amp; Roles" : "Users";
    return `
      <div class="ste-section-hd">
        <div class="ste-page-crumbs"><a href="#/home">Home</a><span class="sep">/</span><span>Administration</span><span class="sep">/</span><span class="cur">${titleLabel}</span></div>
        <h1>${titleLabel}</h1>
      </div>
      <div class="ste-form-card">
        <div class="ste-users-toolbar">
          <div class="ste-users-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/></svg>
            <input id="ste-users-search" type="search" placeholder="Search by name, email, role…">
          </div>
          <div class="ste-users-toolbar-right">
            <span class="ste-mini" id="ste-users-count">${users.length} user${users.length===1?'':'s'}</span>
            <button class="ste-btn ste-btn-primary" data-act="invite-user">+ Invite user${isHQ ? 's' : ''}</button>
          </div>
        </div>
        <table class="ste-table ste-users-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th>${isHQ ? '<th>Assignment</th>' : '<th>Title</th>'}<th>Last seen</th><th></th></tr></thead>
          <tbody id="ste-users-tbody">
            ${renderUserRows(users, { showAssignment: isHQ })}
          </tbody>
        </table>
      </div>`;
  }
  function renderUserRows(users, opts) {
    opts = opts || {};
    const showAssignment = !!opts.showAssignment;
    if (!users.length) return `<tr><td colspan="6" class="ste-empty-cell">No users match your search</td></tr>`;
    return users.map((x, i) => {
      const fourthCol = showAssignment
        ? (STE.isHQ(x) ? 'All licensees' : escape(x.licenseeId || ''))
        : escape(x.title || '');
      const pending = !!x.invitePending;
      const lastSignIn = x.lastSignInAt
        ? new Date(x.lastSignInAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        : (pending ? `<span class="ste-mini" style="color:var(--st-warn)">Invite pending</span>` : `<span class="ste-mini">—</span>`);
      const displayName = x.name && x.name.trim() ? escape(x.name) : `<span class="ste-mini" style="font-style:italic">(awaiting profile)</span>`;
      return `
      <tr>
        <td>
          <div style="display:flex;gap:10px;align-items:center">
            <span class="ste-mini-avatar">${x.name && x.name.trim() ? initials(x.name) : '✉'}</span>
            <strong>${displayName}</strong>
          </div>
        </td>
        <td><code class="ste-code">${escape(x.email||'')}</code></td>
        <td><span class="ste-badge ste-badge-${roleBadge(x.role)}">${roleLabel(x.role)}</span></td>
        <td>${fourthCol}</td>
        <td>${lastSignIn}</td>
        <td><button class="ste-btn ste-btn-link" data-edit-user="${x.id}">Manage</button></td>
      </tr>`;
    }).join("");
  }
  function wireUsers(sec, u) {
    const search = $("#ste-users-search", sec);
    const tbody = $("#ste-users-tbody", sec);
    const countEl = $("#ste-users-count", sec);
    const isHQ = window.STE && STE.isHQ && STE.isHQ(u);
    const myLicId = u && u.licenseeId;
    function scoped(users) {
      return isHQ ? users : users.filter(x => x.licenseeId === myLicId);
    }
    function wireManage() {
      $$("[data-edit-user]", sec).forEach(b => b.addEventListener("click", () => {
        openManageUserModal(b.getAttribute("data-edit-user"), () => applyFilter());
      }));
    }
    function applyFilter() {
      const q = (search?.value || "").trim().toLowerCase();
      const all = scoped(STE.get().users || []);
      const filtered = !q ? all : all.filter(x => {
        return [x.name, x.email, x.role, x.licenseeId, x.title]
          .filter(Boolean).join(" ").toLowerCase().includes(q);
      });
      tbody.innerHTML = renderUserRows(filtered, { showAssignment: isHQ });
      countEl.textContent = q
        ? `${filtered.length} of ${all.length} user${all.length===1?'':'s'}`
        : `${all.length} user${all.length===1?'':'s'}`;
      wireManage();
    }
    search?.addEventListener("input", applyFilter);
    wireManage();

    $("[data-act='invite-user']", sec)?.addEventListener("click", () => {
      // Licensee admin: pre-scope the invite to their own org so the
      // licensee picker doesn't show. HQ keeps the multi-org modal.
      if (isHQ) {
        openInviteModal(sec, () => applyFilter());
      } else {
        openInviteUserModal(myLicId, () => applyFilter());
      }
    });
  }

  // ====================== INVITE USERS MODAL (multi, chips) ======================
  function openInviteModal(sec, onDone) {
    const lics = STE.get().licensees || [];
    const overlay = document.createElement("div");
    overlay.className = "ste-modal-overlay";
    overlay.innerHTML = `
      <div class="ste-modal" role="dialog" aria-modal="true">
        <div class="ste-modal-hd">
          <h2>Invite users</h2>
          <button class="ste-modal-close" data-close>×</button>
        </div>
        <div class="ste-modal-body">
          <div class="ste-form-field">
            <label>Email addresses</label>
            <div class="ste-chip-input" id="ste-chip-wrap">
              <div class="ste-chip-list" id="ste-chip-list"></div>
              <input type="email" id="ste-chip-input" placeholder="Add email and press Enter…" autocomplete="off">
            </div>
            <div class="ste-mini" style="margin-top:6px">Separate addresses with comma, space, or Enter.</div>
          </div>
          <div class="ste-form-grid" style="margin-top:14px">
            <div class="ste-form-field">
              <label>Role</label>
              <select class="ste-input" id="ste-inv-role">
                <option value="administrator">Administrator</option>
                <option value="staff" selected>HQ User</option>
                <option value="licensee">Licensee</option>
              </select>
            </div>
            <div class="ste-form-field" id="ste-inv-lic-field" style="display:none">
              <label>Licensee</label>
              <select class="ste-input" id="ste-inv-licensee">
                ${lics.map(l => `<option value="${l.id}">${escape(l.legalName)}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="ste-form-field" style="margin-top:14px">
            <label>Message (optional)</label>
            <textarea class="ste-input" id="ste-inv-msg" rows="3" placeholder="Hello — you've been invited to the Sergio Tacchini Global AI Agent platform…"></textarea>
          </div>
        </div>
        <div class="ste-modal-foot">
          <button class="ste-btn ste-btn-ghost" data-close>Cancel</button>
          <button class="ste-btn ste-btn-primary" id="ste-inv-send" disabled>Send 0 invitations</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const chipList = $("#ste-chip-list", overlay);
    const chipInput = $("#ste-chip-input", overlay);
    const sendBtn = $("#ste-inv-send", overlay);
    const roleSel = $("#ste-inv-role", overlay);
    const licField = $("#ste-inv-lic-field", overlay);
    const licSel = $("#ste-inv-licensee", overlay);
    const msgInp = $("#ste-inv-msg", overlay);
    const chips = [];

    function refreshSendBtn() {
      sendBtn.disabled = chips.length === 0;
      sendBtn.textContent = `Send ${chips.length} invitation${chips.length===1?'':'s'}`;
    }
    function isValidEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }
    function addChip(raw) {
      const email = raw.trim().replace(/^[,;]+|[,;]+$/g, "");
      if (!email) return;
      if (chips.includes(email.toLowerCase())) return;
      const valid = isValidEmail(email);
      chips.push(email.toLowerCase());
      const chip = document.createElement("span");
      chip.className = "ste-chip" + (valid ? "" : " ste-chip-invalid");
      chip.innerHTML = `${escape(email)} <button type="button" aria-label="Remove">×</button>`;
      chip.querySelector("button").addEventListener("click", () => {
        chips.splice(chips.indexOf(email.toLowerCase()), 1);
        chip.remove();
        refreshSendBtn();
      });
      chipList.appendChild(chip);
      refreshSendBtn();
    }

    chipInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === "," || e.key === " ") {
        e.preventDefault();
        if (chipInput.value.trim()) {
          addChip(chipInput.value);
          chipInput.value = "";
        }
      } else if (e.key === "Backspace" && !chipInput.value) {
        const last = chips.pop();
        if (last !== undefined) {
          chipList.lastChild?.remove();
          refreshSendBtn();
        }
      }
    });
    chipInput.addEventListener("paste", (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData("text") || "";
      text.split(/[\s,;]+/).forEach(addChip);
    });
    chipInput.addEventListener("blur", () => {
      if (chipInput.value.trim()) {
        addChip(chipInput.value);
        chipInput.value = "";
      }
    });
    // Focus the input so user can start typing immediately
    setTimeout(() => chipInput.focus(), 30);

    roleSel.addEventListener("change", () => {
      licField.style.display = roleSel.value === "licensee" ? "" : "none";
    });

    function close() {
      overlay.remove();
      document.removeEventListener("keydown", esc);
    }
    function esc(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", esc);
    $$("[data-close]", overlay).forEach(b => b.addEventListener("click", close));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

    sendBtn.addEventListener("click", () => {
      // Filter to valid emails only
      const valid = chips.filter(c => isValidEmail(c));
      const invalid = chips.length - valid.length;
      if (!valid.length) {
        STEApp.toast("No valid email addresses to invite", "warn");
        return;
      }
      const role = roleSel.value;
      const lic = role === "licensee" ? licSel.value : null;
      STE.mutate(s => {
        s.users = s.users || [];
        valid.forEach(email => {
          if (s.users.find(u => u.email && u.email.toLowerCase() === email)) return;
          const local = email.split("@")[0];
          const id = `${role === "licensee" ? "lic" : "fnf"}-${local.replace(/[^a-z0-9]+/gi,"")}-${Math.random().toString(36).slice(2,5)}`;
          s.users.push({
            id,
            name: local.split(/[._-]+/).map(s => s[0].toUpperCase() + s.slice(1)).join(" "),
            role, email,
            licenseeId: lic || undefined,
            ssoEligible: role !== "licensee",
            invitedAt: new Date().toISOString(),
            invitedBy: STE.currentUser()?.id,
            pending: true,
          });
        });
      });
      const msg = invalid
        ? `${valid.length} invitation${valid.length===1?'':'s'} sent · ${invalid} skipped (invalid)`
        : `${valid.length} invitation${valid.length===1?'':'s'} sent`;
      STEApp.toast(msg, "success");
      close();
      if (onDone) onDone();
    });
  }

  // ====================== AUDIT LOG ======================
  function renderAudit(u) {
    const log = (STE.get().auditLog || []).slice().sort((a,b) => (b.at||'').localeCompare(a.at||''));
    return `
      <div class="ste-section-hd">
        <div class="ste-page-crumbs"><a href="#/home">Home</a><span class="sep">/</span><span>Administration</span><span class="sep">/</span><span class="cur">Audit Log</span></div>
        <h1>Audit Log</h1>
      </div>
      <div class="ste-form-card">
        <div class="ste-form-section-hd" style="padding:18px 24px; border-bottom:1px solid var(--ste-border)">
          <h3>${log.length} events</h3>
          <div style="display:flex;gap:8px">
            <button class="ste-btn ste-btn-ghost" data-act="filter-audit">Filter</button>
            <button class="ste-btn ste-btn-ghost" data-act="export-audit">Export CSV</button>
          </div>
        </div>
        ${log.length === 0 ? `<div class="ste-empty-cell" style="padding:40px">No audit events recorded yet.</div>` : `
        <table class="ste-table">
          <thead><tr><th>When</th><th>Event</th><th>Actor</th><th>Contract</th><th>Attachment</th></tr></thead>
          <tbody>
            ${log.map(e => `
              <tr>
                <td><strong>${fmtDateTime(e.at)}</strong></td>
                <td>${escape(e.event)}</td>
                <td>${escape(e.actor||'')}</td>
                <td><code class="ste-code">${escape(e.contractId||'—')}</code></td>
                <td>${e.attachment ? `<a class="ste-link">📎 ${escape(e.attachment)}</a>` : '—'}</td>
              </tr>`).join("")}
          </tbody>
        </table>`}
      </div>`;
  }
  function wireAudit(sec, u) {
    $("[data-act='filter-audit']", sec)?.addEventListener("click", () => STEApp.toast("Filter — coming soon", "info"));
    $("[data-act='export-audit']", sec)?.addEventListener("click", () => STEApp.toast("Audit log CSV exported", "success"));
  }

  // ====================== Helpers ======================
  function getPrefs(u) {
    const all = STE.get().userPrefs || {};
    return JSON.parse(JSON.stringify(all[u.id] || {}));
  }
  function setPrefs(u, prefs) {
    STE.mutate(s => {
      s.userPrefs = s.userPrefs || {};
      s.userPrefs[u.id] = { ...(s.userPrefs[u.id] || {}), ...prefs };
    });
  }
  function bindField(prefs, inp) {
    const path = inp.getAttribute("data-f").split(".");
    let o = prefs;
    for (let i = 0; i < path.length - 1; i++) {
      if (!o[path[i]]) o[path[i]] = {};
      o = o[path[i]];
    }
    o[path[path.length-1]] = inp.value;
  }
  function initials(name) { return (name||"?").split(/\s+/).map(s=>s[0]).filter(Boolean).slice(0,2).join("").toUpperCase(); }
  function roleLabel(r) {
    return r === "administrator" ? "Administrator" : "User";
  }
  function roleBadge(r) {
    return r === "administrator" ? "info" : "ok";
  }
  function fmtDateTime(iso) {
    try { return new Date(iso).toLocaleString("en-GB", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }); }
    catch { return iso; }
  }
  function escape(s) { return String(s||"").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c])); }

  // ====================== STAFF (HQ internal) ======================
  function renderSystem(u) {
    const users = (STE.get().users || []).filter(x => STE.isHQ(x));
    return `
      <div class="ste-section-hd">
        <div class="ste-page-crumbs"><a href="#/home">Home</a><span class="sep">/</span><span>Administration</span><span class="sep">/</span><span class="cur">HQ</span></div>
        <h1>HQ</h1>
      </div>
      <div class="ste-sso-note">
        <span class="ste-sso-note-icon"></span>
        <div>
          <strong>SSO-managed</strong>
          <span>Accounts are provisioned automatically when an HQ team member signs in with their Microsoft work account. No invitation needed.</span>
        </div>
      </div>
      ${renderUsersTable(users, null, { hideInvite: true })}`;
  }
  // ====================== REFERENCE DATA ======================
  function renderReference(u) {
    const ref = STE.get().referenceData || { currencies: [], categories: [], channels: [], productCategories: [] };
    function listCard(key, label, sub) {
      const items = ref[key] || [];
      return `
        <div class="ste-form-card" style="margin-bottom:18px">
          <div class="ste-form-section">
            <div class="ste-form-section-hd">
              <h3>${escape(label)}</h3>
              <span class="ste-mini">${items.length} value${items.length===1?'':'s'}</span>
            </div>
            <p class="ste-mini" style="margin:0 0 12px">${escape(sub)}</p>
            <div class="ste-chip-input" data-ref="${escape(key)}">
              ${items.map((v, i) => `<span class="ste-chip">${escape(v)}<button type="button" data-rm-ref="${escape(key)}|${i}" aria-label="Remove">×</button></span>`).join("")}
              <input class="ste-chip-input-entry" data-add-ref="${escape(key)}" type="text" placeholder="Add and press Enter…">
            </div>
          </div>
        </div>`;
    }
    return `
      <div class="ste-section-hd">
        <div class="ste-page-crumbs"><a href="#/home">Home</a><span class="sep">/</span><span>Administration</span><span class="sep">/</span><span class="cur">Reference Data</span></div>
        <h1>Reference Data</h1>
      </div>
      ${renderProductCategoryCard(ref)}
      ${listCard("currencies", "Reporting Currencies", "Currency codes the licensee can pick when filing.")}
      ${listCard("channels",   "Sales Channels",       "Channel options (DTC, WS, Marketplace, etc.).")}`;
  }

  // Product Category management — three-level taxonomy from the licensee
  // mapping spreadsheet (CATEGORY → SUB_CATEGORY → PRODUCT CATEGORY +
  // additional info). Drives the sales template dropdown and any per-line
  // category surfaces across the prototype.
  const PRODUCT_CATEGORY_TOP = ["WEAR", "ACC", "SHOES"];
  function renderProductCategoryCard(ref) {
    const rows = ref.productCategories || [];
    const grouped = {};
    PRODUCT_CATEGORY_TOP.forEach(c => { grouped[c] = {}; });
    rows.forEach((r, i) => {
      if (!r) return;
      const c = r.category || "OTHER";
      const s = r.subCategory || "—";
      grouped[c] = grouped[c] || {};
      grouped[c][s] = grouped[c][s] || [];
      grouped[c][s].push({ ...r, _idx: i });
    });
    const groupHtml = Object.keys(grouped).map(cat => {
      const subs = grouped[cat] || {};
      const subKeys = Object.keys(subs);
      const count = subKeys.reduce((n, k) => n + subs[k].length, 0);
      return `
        <div class="ste-pc-group">
          <div class="ste-pc-group-hd">
            <strong>${escape(cat)}</strong>
            <span class="ste-mini">${count} product${count === 1 ? '' : 's'}</span>
          </div>
          ${subKeys.map(sub => `
            <div class="ste-pc-sub">
              <div class="ste-pc-sub-label">${escape(sub)}</div>
              <div class="ste-pc-leaves">
                ${(subs[sub] || []).map(item => `
                  <div class="ste-pc-leaf" data-pc-row="${item._idx}">
                    <div class="ste-pc-leaf-main">
                      <strong>${escape(item.productCategory || '—')}</strong>
                      ${item.additionalInfo ? `<span class="ste-mini">${escape(item.additionalInfo)}</span>` : ''}
                    </div>
                    <div class="ste-pc-leaf-actions">
                      <button class="ste-btn ste-btn-link" type="button" data-pc-edit="${item._idx}">Edit</button>
                      <button class="ste-btn ste-btn-link ste-btn-link-danger" type="button" data-pc-remove="${item._idx}">Remove</button>
                    </div>
                  </div>`).join("")}
              </div>
            </div>`).join("")}
        </div>`;
    }).join("");
    return `
      <div class="ste-form-card" style="margin-bottom:18px">
        <div class="ste-form-section">
          <div class="ste-form-section-hd">
            <h3>Product Categories</h3>
            <span class="ste-mini">${rows.length} entr${rows.length === 1 ? 'y' : 'ies'} · 3 top categories</span>
          </div>
          <p class="ste-mini" style="margin:0 0 14px">Licensee Category Mapping. Used wherever a product category appears: sales template, design review, sample review. Edit a row to update the mapping.</p>
          <div class="ste-pc-grid">${groupHtml}</div>
          <div class="ste-pc-add-bar">
            <button class="ste-btn ste-btn-ghost" type="button" data-pc-add>+ Add product category</button>
          </div>
        </div>
      </div>`;
  }

  function openProductCategoryModal(idx) {
    // idx === -1 means "add new"; otherwise edit the existing row at that index.
    const refRows = (STE.get().referenceData && STE.get().referenceData.productCategories) || [];
    const editing = idx >= 0 ? refRows[idx] : null;
    const row = editing
      ? { ...editing }
      : { category: PRODUCT_CATEGORY_TOP[0], subCategory: "", productCategory: "", additionalInfo: "" };
    const backdrop = document.createElement("div");
    backdrop.className = "ste-spotlight-backdrop";
    backdrop.innerHTML = `
      <div class="ste-modal" role="dialog" aria-label="Product category">
        <div class="ste-modal-hd">
          <strong>${editing ? 'Edit product category' : 'Add product category'}</strong>
          <button class="ste-modal-close" data-pca="close" aria-label="Close">×</button>
        </div>
        <div class="ste-modal-body">
          <div class="ste-field">
            <label class="ste-lbl">Category</label>
            <select class="ste-input" id="ste-pca-cat">
              ${PRODUCT_CATEGORY_TOP.map(c => `<option value="${c}" ${c === row.category ? 'selected' : ''}>${c}</option>`).join("")}
            </select>
          </div>
          <div class="ste-field">
            <label class="ste-lbl">Sub Category</label>
            <input class="ste-input" id="ste-pca-sub" value="${escape(row.subCategory || '')}" placeholder="e.g. INNER, OUTER, BOTTOM">
          </div>
          <div class="ste-field">
            <label class="ste-lbl">Product Category</label>
            <input class="ste-input" id="ste-pca-prod" value="${escape(row.productCategory || '')}" placeholder="e.g. T SHIRT">
          </div>
          <div class="ste-field">
            <label class="ste-lbl">Additional Info</label>
            <input class="ste-input" id="ste-pca-info" value="${escape(row.additionalInfo || '')}" placeholder="Optional notes, examples, sub-items">
          </div>
        </div>
        <div class="ste-modal-actions">
          ${editing ? `<button class="ste-btn ste-btn-danger-ghost" data-pca="delete">Remove</button>` : ''}
          <div style="margin-left:auto; display:flex; gap:8px">
            <button class="ste-btn ste-btn-ghost" data-pca="close">Cancel</button>
            <button class="ste-btn ste-btn-primary" data-pca="save">Save</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
    $$("[data-pca]", backdrop).forEach(b => b.addEventListener("click", (e) => {
      e.stopPropagation();
      const act = b.getAttribute("data-pca");
      if (act === "close") { close(); return; }
      if (act === "delete") {
        if (!confirm(`Remove "${row.productCategory}" from the mapping?`)) return;
        STE.mutate(s => {
          s.referenceData = s.referenceData || {};
          s.referenceData.productCategories = (s.referenceData.productCategories || []).filter((_, i) => i !== idx);
          s.referenceData.categories = (s.referenceData.productCategories || []).map(r => r.productCategory).filter(Boolean);
        });
        close();
        admin();
        return;
      }
      if (act === "save") {
        const next = {
          category: $("#ste-pca-cat", backdrop).value,
          subCategory: $("#ste-pca-sub", backdrop).value.trim().toUpperCase(),
          productCategory: $("#ste-pca-prod", backdrop).value.trim().toUpperCase(),
          additionalInfo: $("#ste-pca-info", backdrop).value.trim(),
        };
        if (!next.productCategory) { STEApp.toast("Product Category is required", "warn"); return; }
        if (!next.subCategory) { STEApp.toast("Sub Category is required", "warn"); return; }
        STE.mutate(s => {
          s.referenceData = s.referenceData || {};
          s.referenceData.productCategories = s.referenceData.productCategories || [];
          if (idx >= 0) s.referenceData.productCategories[idx] = next;
          else s.referenceData.productCategories.push(next);
          // Keep the flat leaf list (state.referenceData.categories) in sync so
          // existing dropdowns and validators don't see stale options.
          s.referenceData.categories = s.referenceData.productCategories
            .map(r => r.productCategory)
            .filter(Boolean);
        });
        close();
        admin();
        return;
      }
    }));
  }

  function wireReference(sec, u) {
    $$("[data-add-ref]", sec).forEach(inp => {
      inp.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        const key = inp.getAttribute("data-add-ref");
        const val = inp.value.trim();
        if (!val) return;
        STE.mutate(s => {
          s.referenceData = s.referenceData || { currencies: [], categories: [], channels: [] };
          s.referenceData[key] = s.referenceData[key] || [];
          if (!s.referenceData[key].includes(val)) s.referenceData[key].push(val);
        });
        admin();
      });
    });
    $$("[data-rm-ref]", sec).forEach(b => {
      b.addEventListener("click", (e) => {
        e.preventDefault();
        const [key, iStr] = b.getAttribute("data-rm-ref").split("|");
        const i = parseInt(iStr);
        STE.mutate(s => {
          if (s.referenceData && Array.isArray(s.referenceData[key])) {
            s.referenceData[key].splice(i, 1);
          }
        });
        admin();
      });
    });
    // Product category row edit / remove / add handlers.
    $$("[data-pc-edit]", sec).forEach(b => b.addEventListener("click", (e) => {
      e.preventDefault();
      openProductCategoryModal(parseInt(b.getAttribute("data-pc-edit"), 10));
    }));
    $$("[data-pc-remove]", sec).forEach(b => b.addEventListener("click", (e) => {
      e.preventDefault();
      const i = parseInt(b.getAttribute("data-pc-remove"), 10);
      const row = ((STE.get().referenceData || {}).productCategories || [])[i];
      if (!row) return;
      if (!confirm(`Remove "${row.productCategory}" from the mapping?`)) return;
      STE.mutate(s => {
        s.referenceData = s.referenceData || {};
        s.referenceData.productCategories = (s.referenceData.productCategories || []).filter((_, j) => j !== i);
        s.referenceData.categories = (s.referenceData.productCategories || []).map(r => r.productCategory).filter(Boolean);
      });
      admin();
    }));
    $$("[data-pc-add]", sec).forEach(b => b.addEventListener("click", (e) => {
      e.preventDefault();
      openProductCategoryModal(-1);
    }));
  }

  function wireSystem(sec, u) {
    $$("[data-edit-user]", sec).forEach(b => b.addEventListener("click", () => {
      openManageUserModal(b.getAttribute("data-edit-user"), () => admin());
    }));
  }

  global.STEAdmin = { admin };
})(window);
