/* =========================================================
   Account Settings (#/account)
   Sections: Profile · Security · Notifications · API Access ·
             Workspace (HQ only)
   ========================================================= */
(function (global) {
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function t(k) { return (window.STEi18n && STEi18n.t) ? STEi18n.t(k) : k; }
  const SECTION_DEFS = [
    { id: "profile",       i18n: "tab_profile",       label: "Profile",       icon: "user" },
    { id: "preferences",   i18n: "tab_preferences",   label: "Preferences",   icon: "sliders" },
    { id: "security",      i18n: "tab_security",      label: "Security",      icon: "lock" },
    { id: "notifications", i18n: "tab_notifications", label: "Notifications", icon: "bell" },
  ];
  function SECTIONS() { return SECTION_DEFS.map(s => ({ ...s, label: t(s.i18n) || s.label })); }

  function ensureSection() {
    let sec = document.querySelector('section[data-page="account"]');
    if (!sec) {
      sec = document.createElement("section");
      sec.setAttribute("data-page", "account");
      sec.hidden = true;
      document.body.appendChild(sec);
    }
    return sec;
  }

  function currentTab(u) {
    const tabs = SECTIONS().filter(s => !s.hqOnly || STE.isHQ(u));
    const m = (location.hash || "").match(/^#\/account(?:\/([a-z]+))?/i);
    const sub = m && m[1];
    if (sub && tabs.find(t => t.id === sub)) return sub;
    return "profile";
  }

  function account() {
    const sec = ensureSection();
    const u = STE.currentUser();
    if (!u) { location.hash = "#/login"; return; }
    const lic = STE.currentLicensee();
    const tabs = SECTIONS().filter(s => !s.hqOnly || STE.isHQ(u));
    const prefs = getPrefs(u);
    const tab = currentTab(u);

    document.querySelectorAll("section[data-page]").forEach(s => { s.hidden = s.dataset.page !== "account"; });
    sec.hidden = false;

    const initialsStr = (u.name||'?').split(/\s+/).map(s=>s[0]).slice(0,2).join('').toUpperCase();
    sec.innerHTML = `
      <ste-shell active="account" breadcrumb="Account Settings"
        user-name="${u.name}" user-role="${u.title || ''}" user-initials="${initialsStr}"
        licensee-code="${lic ? lic.id : 'F&F HQ'}" licensee-name="${lic ? lic.legalName : 'Global Admin View'}">
        <div class="ste-account-inline">
          <nav class="ste-account-tabs">
            ${tabs.map(tab2 => `
              <a class="ste-account-tab ${tab2.id===tab?'active':''}" href="#/account/${tab2.id}" data-tab="${tab2.id}">
                <span class="ste-acct-ico ste-acct-ico-${tab2.icon}"></span>
                <span>${tab2.label}</span>
              </a>`).join("")}
          </nav>
          <main class="ste-account-panel-inline">
            ${tab === "profile" ? renderProfile(u, lic, prefs) : ""}
            ${tab === "preferences" ? renderPreferences(u, prefs) : ""}
            ${tab === "security" ? renderSecurity(u, prefs) : ""}
            ${tab === "notifications" ? renderNotifications(u, prefs) : ""}
          </main>
        </div>
      </ste-shell>`;

    // Section-specific wiring (no tab-click handler — <a href> drives the hash)
    if (tab === "profile") wireProfile(sec, u, lic, prefs);
    if (tab === "preferences") wirePreferences(sec, u, prefs);
    if (tab === "security") wireSecurity(sec, u, prefs);
    if (tab === "notifications") wireNotifications(sec, u, prefs);
  }

  // ====================== PROFILE ======================
  function renderProfile(u, lic, prefs) {
    const p = prefs.profile || {};
    return `
      <div class="ste-section-hd">
        <div class="ste-page-crumbs"><a href="#/home">Home</a><span class="sep">/</span><span>Account Settings</span><span class="sep">/</span><span class="cur">Profile</span></div>
        <h1>Profile</h1>
      </div>

      <div class="ste-form-card">
        <div class="ste-form-section">
          <div class="ste-form-section-hd">
            <h3>Profile Photo</h3>
          </div>
          <div class="ste-photo-row">
            <div class="ste-photo-avatar">${initials(u.name)}</div>
            <div class="ste-photo-actions">
              <button class="ste-btn ste-btn-ghost" data-act="upload-photo">Change photo</button>
              <button class="ste-btn ste-btn-link" data-act="remove-photo">Remove</button>
            </div>
          </div>
        </div>

        <div class="ste-form-section">
          <div class="ste-form-section-hd"><h3>Profile</h3></div>
          <div class="ste-form-grid">
            <div class="ste-form-field">
              <label>Name</label>
              <input class="ste-input" data-f="profile.fullName" value="${escape(p.fullName || u.name)}">
            </div>
            <div class="ste-form-field">
              <label>Email <span class="ste-tag">SSO managed</span></label>
              <input class="ste-input" value="${escape(u.email || '')}" disabled>
            </div>
            <div class="ste-form-field">
              <label>Phone</label>
              <input class="ste-input" data-f="profile.phone" value="${escape(p.phone || '')}" placeholder="+44 20 7946 0123">
            </div>
          </div>
        </div>

        <div class="ste-form-actions">
          <button class="ste-btn ste-btn-ghost" data-act="cancel-profile">Cancel</button>
          <button class="ste-btn ste-btn-primary" data-act="save-profile">Save changes</button>
        </div>
      </div>`;
  }

  // ====================== PREFERENCES ======================
  function renderPreferences(u, prefs) {
    const p = prefs.preferences || {};
    const language = p.language || 'English';
    const tz = p.timezone || u.tz || 'Europe/London';
    return `
      <div class="ste-section-hd">
        <div class="ste-page-crumbs"><a href="#/home">Home</a><span class="sep">/</span><span>Account Settings</span><span class="sep">/</span><span class="cur">Preferences</span></div>
        <h1>Preferences</h1>
      </div>

      <div class="ste-form-card">
        <div class="ste-form-section">
          <div class="ste-form-section-hd"><h3>Language &amp; Region</h3></div>
          <div class="ste-form-grid">
            <div class="ste-form-field">
              <label>Language</label>
              <select class="ste-input" data-f="preferences.language">
                ${["English","한국어"].map(l =>
                  `<option value="${l}" ${l===language?'selected':''}>${l}</option>`).join("")}
              </select>
            </div>
            <div class="ste-form-field">
              <label>Timezone</label>
              <select class="ste-input" data-f="preferences.timezone">
                ${["Europe/London","Europe/Paris","Europe/Berlin","Europe/Rome","Europe/Amsterdam","Europe/Madrid","Europe/Lisbon","Europe/Stockholm","Asia/Seoul","Asia/Tokyo","America/New_York","America/Los_Angeles"].map(t =>
                  `<option value="${t}" ${t===tz?'selected':''}>${t}</option>`).join("")}
              </select>
            </div>
            <div class="ste-form-field">
              <label>Date Format</label>
              <select class="ste-input" data-f="preferences.dateFormat">
                <option value="DD MMM YYYY" ${(!p.dateFormat||p.dateFormat==='DD MMM YYYY')?'selected':''}>DD MMM YYYY (15 Aug 2026)</option>
                <option value="DD/MM/YYYY" ${p.dateFormat==='DD/MM/YYYY'?'selected':''}>DD/MM/YYYY (15/08/2026)</option>
                <option value="MMM DD, YYYY" ${p.dateFormat==='MMM DD, YYYY'?'selected':''}>MMM DD, YYYY (Aug 15, 2026)</option>
                <option value="MM/DD/YYYY" ${p.dateFormat==='MM/DD/YYYY'?'selected':''}>MM/DD/YYYY (08/15/2026)</option>
                <option value="YYYY-MM-DD" ${p.dateFormat==='YYYY-MM-DD'?'selected':''}>YYYY-MM-DD (2026-08-15 · ISO 8601)</option>
              </select>
            </div>
            <div class="ste-form-field">
              <label>Time Format</label>
              <select class="ste-input" data-f="preferences.timeFormat">
                <option ${p.timeFormat==='24h'||!p.timeFormat?'selected':''}>24-hour (14:30)</option>
                <option ${p.timeFormat==='12h'?'selected':''}>12-hour (2:30 PM)</option>
              </select>
            </div>
            <div class="ste-form-field">
              <label>Number Format</label>
              <select class="ste-input" data-f="preferences.numberFormat">
                <option ${p.numberFormat==='1,234.56'||!p.numberFormat?'selected':''}>1,234.56 (UK · US)</option>
                <option ${p.numberFormat==='1.234,56'?'selected':''}>1.234,56 (EU)</option>
                <option ${p.numberFormat==='1 234.56'?'selected':''}>1 234.56 (FR)</option>
              </select>
            </div>
            <div class="ste-form-field">
              <label>First Day of Week</label>
              <select class="ste-input" data-f="preferences.weekStart">
                <option ${p.weekStart==='Monday'||!p.weekStart?'selected':''}>Monday</option>
                <option ${p.weekStart==='Sunday'?'selected':''}>Sunday</option>
              </select>
            </div>
          </div>
        </div>


        <div class="ste-form-actions">
          <button class="ste-btn ste-btn-ghost" data-act="reset-preferences">Reset to defaults</button>
          <button class="ste-btn ste-btn-primary" data-act="save-preferences">Save preferences</button>
        </div>

        <div class="ste-form-section" style="margin-top:32px;border-top:1px solid var(--ste-border);padding-top:20px">
          <div class="ste-form-section-hd"><h3>Prototype</h3></div>
          <p class="ste-mini" style="margin:0 0 12px">Wipe all locally-stored demo data (agreements, statements, invoices, season plans, design submissions, edits) and reload with the original seed. Use after a demo to start clean.</p>
          <button class="ste-btn ste-btn-ghost" data-act="reset-prototype" style="color:var(--st-err);border-color:var(--st-err)">Reset prototype data</button>
        </div>
      </div>`;
  }

  function wirePreferences(sec, u, prefs) {
    prefs.preferences = prefs.preferences || {};
    $$("[data-f^='preferences.']", sec).forEach(inp => inp.addEventListener("change", () => {
      bindField(u, prefs, inp);
      // Language is a global UI concern — apply instantly so the user doesn't
      // get into a "selected English but still seeing Korean because I forgot
      // to click Save" state. Mirror the value to user.language too so admin
      // modal and preferences page stay in sync.
      if (inp.getAttribute("data-f") === "preferences.language") {
        const v = inp.value;
        setPrefs(u, prefs);
        STE.mutate(s => {
          const usr = s.users.find(x => x.id === u.id);
          if (usr) usr.language = (v === "한국어") ? "ko" : (v === "English") ? "en" : v;
        });
        if (window.STEApp && STEApp.runForCurrentRoute) STEApp.runForCurrentRoute();
      }
    }));
    $$("[data-f-bool^='preferences.']", sec).forEach(inp => inp.addEventListener("change", () => {
      const path = inp.getAttribute("data-f-bool").split(".");
      prefs.preferences[path[1]] = inp.checked;
      inp.closest(".ste-switch")?.classList.toggle("on", inp.checked);
    }));
    $$("input[name='theme']", sec).forEach(r => r.addEventListener("change", () => {
      prefs.preferences.theme = r.value;
    }));
    $("[data-act='save-preferences']", sec)?.addEventListener("click", () => {
      setPrefs(u, prefs);
      STEApp.toast("Preferences saved", "success");
      // Apply immediately — re-render this page and the global chrome so language /
      // currency / etc. take effect right away.
      account();
      if (window.STEApp && STEApp.runForCurrentRoute) STEApp.runForCurrentRoute();
    });
    $("[data-act='reset-preferences']", sec)?.addEventListener("click", () => {
      if (!confirm("Reset all preferences to defaults?")) return;
      prefs.preferences = {};
      setPrefs(u, prefs);
      STEApp.toast("Preferences reset to defaults", "info");
      account();
    });
    $("[data-act='reset-prototype']", sec)?.addEventListener("click", async () => {
      if (!confirm("This wipes ALL locally-stored demo data (agreements, statements, invoices, season plans, design submissions, edits) and reloads from the original seed.\n\nProceed?")) return;
      await STE.reset();
      STE.setSession(null);
      location.hash = "#/login";
      location.reload();
    });
  }

  function wireProfile(sec, u, lic, prefs) {
    $$("[data-f]", sec).forEach(inp => {
      inp.addEventListener("input", () => bindField(u, prefs, inp));
    });
    $("[data-act='save-profile']", sec)?.addEventListener("click", () => {
      setPrefs(u, prefs);
      // Also mirror onto the user record so headers & menus everywhere reflect it
      STE.mutate(s => {
        const usr = s.users.find(x => x.id === u.id);
        if (!usr) return;
        if (prefs.profile?.fullName) usr.name = prefs.profile.fullName;
        if (prefs.profile?.title) usr.title = prefs.profile.title;
        if (prefs.profile?.phone) usr.phone = prefs.profile.phone;
      });
      // Re-paint the live header so the change is visible immediately
      if (window.STEApp && STEApp.runForCurrentRoute) STEApp.runForCurrentRoute();
      STEApp.toast("Profile saved", "success");
      // Re-render this page so the sidebar avatar/name picks up the new value
      account();
    });
    $("[data-act='cancel-profile']", sec)?.addEventListener("click", () => {
      // Go back to where the user came from (or fall back to home)
      if (history.length > 1) history.back();
      else location.hash = "#/" + (STE.isHQ(u) ? "hq" : "home");
    });
    $("[data-act='upload-photo']", sec)?.addEventListener("click", () => STEApp.toast("Photo upload — coming soon", "info"));
    $("[data-act='remove-photo']", sec)?.addEventListener("click", () => STEApp.toast("Photo removed", "info"));
  }

  // ====================== SECURITY ======================
  function renderSecurity(u, prefs) {
    const s = prefs.security || { mfa: STE.isHQ(u) ? 'app' : 'off' };
    const mfaLabel = { app: "Authenticator app", sms: "SMS", off: "Not enabled" }[s.mfa] || "Not enabled";
    const sessions = s.sessions || defaultSessions(u);
    return `
      <div class="ste-section-hd">
        <div class="ste-page-crumbs"><a href="#/home">Home</a><span class="sep">/</span><span>Account Settings</span><span class="sep">/</span><span class="cur">Security</span></div>
        <h1>Security</h1>
      </div>

      <div class="ste-form-card">
        <div class="ste-form-section">
          <div class="ste-form-section-hd"><h3>Password</h3><span class="ste-mini">Last changed ${escape(s.passwordChangedAt || "2026-02-18")}</span></div>
          <div class="ste-form-grid">
            <div class="ste-form-field">
              <label>Current Password</label>
              <input class="ste-input" type="password" data-pw="cur" placeholder="••••••••">
            </div>
            <div class="ste-form-field">
              <label>New Password</label>
              <input class="ste-input" type="password" data-pw="new" placeholder="At least 12 characters">
            </div>
            <div class="ste-form-field">
              <label>Confirm New Password</label>
              <input class="ste-input" type="password" data-pw="cfm" placeholder="Repeat new password">
            </div>
            <div></div>
          </div>
          <div class="ste-form-actions">
            <button class="ste-btn ste-btn-primary" data-act="change-password">Update password</button>
          </div>
        </div>

        <div class="ste-form-section">
          <div class="ste-form-section-hd"><h3>Two-Factor Authentication</h3></div>
          <div class="ste-mfa-row">
            <div>
              <strong>${mfaLabel}</strong>
              <div class="ste-mini">${s.mfa === 'off' ? 'Add a second factor to protect your account from unauthorized access.' : 'Enrolled ' + escape(s.mfaEnrolledAt || '2025-11-04') }</div>
            </div>
            <button class="ste-btn ${s.mfa === 'off' ? 'ste-btn-primary' : 'ste-btn-ghost'}" data-act="configure-mfa">${s.mfa === 'off' ? 'Enable 2FA' : 'Reconfigure'}</button>
          </div>
        </div>

        <div class="ste-form-section">
          <div class="ste-form-section-hd"><h3>Active Sessions</h3><span class="ste-mini">${sessions.length} signed-in device${sessions.length===1?'':'s'}</span></div>
          <ul class="ste-sessions">
            ${sessions.map((sess, i) => `
              <li>
                <span class="ste-sess-icon ste-sess-${sess.platform}"></span>
                <div>
                  <strong>${escape(sess.device)} ${sess.current ? '<span class="ste-tag ste-tag-ok">This device</span>' : ''}</strong>
                  <div class="ste-mini">${escape(sess.location)} · ${escape(sess.lastActive)}</div>
                </div>
                ${sess.current ? '' : `<button class="ste-btn ste-btn-link ste-btn-danger" data-revoke="${i}">Sign out</button>`}
              </li>`).join("")}
          </ul>
          <div class="ste-form-actions">
            <button class="ste-btn ste-btn-ghost" data-act="signout-others">Sign out all other devices</button>
          </div>
        </div>

        <div class="ste-form-section">
          <div class="ste-form-section-hd"><h3>Recent Sign-ins</h3></div>
          <table class="ste-table ste-signin-log">
            <thead><tr><th>When</th><th>Device</th><th>Location</th><th>Method</th><th>Result</th></tr></thead>
            <tbody>
              ${defaultSignInLog(u).map(e => `
                <tr>
                  <td>${escape(e.when)}</td>
                  <td>${escape(e.device)}</td>
                  <td>${escape(e.location)}</td>
                  <td>${escape(e.method)}</td>
                  <td><span class="ste-badge ste-badge-${e.ok ? 'ok' : 'err'}">${e.ok ? 'Success' : 'Failed'}</span></td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  function wireSecurity(sec, u, prefs) {
    $("[data-act='change-password']", sec)?.addEventListener("click", () => {
      const cur = $("[data-pw='cur']", sec).value;
      const nw = $("[data-pw='new']", sec).value;
      const cfm = $("[data-pw='cfm']", sec).value;
      if (!cur || !nw || !cfm) return STEApp.toast("Fill all password fields", "warn");
      if (nw !== cfm) return STEApp.toast("New passwords don't match", "err");
      if (nw.length < 12) return STEApp.toast("Password must be at least 12 characters", "warn");
      prefs.security = prefs.security || {};
      prefs.security.passwordChangedAt = new Date().toISOString().slice(0,10);
      setPrefs(u, prefs);
      STEApp.toast("Password updated", "success");
      account();
    });
    $("[data-act='configure-mfa']", sec)?.addEventListener("click", () => {
      prefs.security = prefs.security || {};
      const next = { off: "app", app: "sms", sms: "off" }[prefs.security.mfa || "off"];
      prefs.security.mfa = next;
      prefs.security.mfaEnrolledAt = next === "off" ? null : new Date().toISOString().slice(0,10);
      setPrefs(u, prefs);
      STEApp.toast(next === "off" ? "2FA disabled" : `2FA enabled via ${next === 'app' ? 'authenticator app' : 'SMS'}`, "success");
      account();
    });
    $("[data-act='signout-others']", sec)?.addEventListener("click", () => {
      prefs.security = prefs.security || {};
      prefs.security.sessions = defaultSessions(u).filter(s => s.current);
      setPrefs(u, prefs);
      STEApp.toast("Signed out of all other devices", "success");
      account();
    });
    $$("[data-revoke]", sec).forEach(b => b.addEventListener("click", () => {
      const i = parseInt(b.getAttribute("data-revoke"));
      prefs.security = prefs.security || {};
      prefs.security.sessions = (prefs.security.sessions || defaultSessions(u)).filter((_, idx) => idx !== i);
      setPrefs(u, prefs);
      STEApp.toast("Session revoked", "info");
      account();
    }));
  }

  function defaultSessions(u) {
    return [
      { platform: "mac", device: "Chrome on macOS", location: "London, GB", lastActive: "now", current: true },
      { platform: "ios", device: "Safari on iPhone", location: "London, GB", lastActive: "2 hours ago", current: false },
      { platform: "win", device: "Edge on Windows", location: STE.isHQ(u) ? "Seoul, KR" : "Manchester, GB", lastActive: "Yesterday, 18:42", current: false },
    ];
  }

  function defaultSignInLog(u) {
    return [
      { when: "Today · 09:12", device: "Chrome 132 · macOS 15", location: "London, GB", method: u.role==='hq' ? "Microsoft SSO" : "Email + password", ok: true },
      { when: "Yesterday · 18:42", device: "Edge 132 · Windows 11", location: u.role==='hq' ? "Seoul, KR" : "Manchester, GB", method: "Email + password", ok: true },
      { when: "Yesterday · 08:03", device: "Safari · iPhone iOS 18", location: "London, GB", method: "Microsoft SSO", ok: true },
      { when: "10 May · 14:08", device: "Unknown", location: "Lagos, NG", method: "Email + password", ok: false },
      { when: "08 May · 11:30", device: "Chrome 132 · macOS 15", location: "London, GB", method: "Microsoft SSO", ok: true },
    ];
  }

  // ====================== NOTIFICATIONS ======================
  function renderNotifications(u, prefs) {
    const n = prefs.notifications || defaultNotifications(u);
    const categories = STE.isHQ(u) ? [
      { id: "designReviews",  label: "Design approvals awaiting review",  sub: "When a licensee submits CADs for approval" },
      { id: "salesReviews",   label: "Sales statement submissions",       sub: "When a licensee files their quarterly statement" },
      { id: "settlementSla",  label: "Settlement SLA reminders",          sub: "Reminders before reviewer SLA deadline" },
      { id: "renewals",       label: "Contract renewal alerts",           sub: "D-180 / D-90 / D-30 reminders" },
      { id: "compliance",     label: "Compliance status changes",         sub: "Licensee moves to Review / Attention" },
      { id: "audit",          label: "Weekly audit digest",               sub: "Friday summary of platform activity" },
    ] : [
      { id: "designs",        label: "Design approval decisions",          sub: "Approve / revise / reject from F&F" },
      { id: "sales",          label: "Sales statement decisions",          sub: "Approve / variance review / auto-invoice" },
      { id: "plans",          label: "Season plan deadline reminders",     sub: "D-180 / D-90 / D-30 countdowns" },
      { id: "renewals",       label: "Contract renewal updates",           sub: "Negotiation thread activity, new term sheets" },
      { id: "brandDirection", label: "Brand direction releases",           sub: "New SS / FW direction published by F&F" },
      { id: "audit",          label: "Audit log changes",                  sub: "Amendments, e-signatures, ownership changes" },
    ];

    return `
      <div class="ste-section-hd">
        <div class="ste-page-crumbs"><a href="#/home">Home</a><span class="sep">/</span><span>Account Settings</span><span class="sep">/</span><span class="cur">Notifications</span></div>
        <h1>Notifications</h1>
      </div>

      <div class="ste-form-card">
        <div class="ste-form-section">
          <div class="ste-form-section-hd"><h3>Email notifications</h3></div>
          <ul class="ste-noti-list">
            ${categories.map(cat => {
              const c = n[cat.id] || { email: true };
              return `
              <li>
                <div>
                  <strong>${cat.label}</strong>
                  <div class="ste-mini">${cat.sub}</div>
                </div>
                ${toggle(cat.id, "email", c.email)}
              </li>`;
            }).join("")}
          </ul>
        </div>

        <div class="ste-form-actions">
          <button class="ste-btn ste-btn-primary" data-act="save-noti">Save preferences</button>
        </div>
      </div>`;
  }

  function toggle(catId, channel, on) {
    return `<label class="ste-switch ${on?'on':''}">
      <input type="checkbox" data-toggle="${catId}.${channel}" ${on?'checked':''}>
      <span></span>
    </label>`;
  }

  function defaultNotifications(u) {
    if (STE.isHQ(u)) return {
      designReviews: { email: true },
      salesReviews:  { email: true },
      settlementSla: { email: true },
      renewals:      { email: true },
      compliance:    { email: false },
      audit:         { email: true },
    };
    return {
      designs:       { email: true },
      sales:         { email: true },
      plans:         { email: true },
      renewals:      { email: true },
      brandDirection:{ email: true },
      audit:         { email: false },
    };
  }

  function wireNotifications(sec, u, prefs) {
    prefs.notifications = prefs.notifications || defaultNotifications(u);
    $$("[data-toggle]", sec).forEach(inp => {
      inp.addEventListener("change", () => {
        const [cat, ch] = inp.getAttribute("data-toggle").split(".");
        prefs.notifications[cat] = prefs.notifications[cat] || {};
        prefs.notifications[cat][ch] = inp.checked;
        inp.closest(".ste-switch").classList.toggle("on", inp.checked);
      });
    });
    // (Quiet hours removed — email-only doesn't need it)
    $$("[data-qh-DEAD]", sec).forEach(inp => {
      inp.addEventListener("change", () => {
        if (inp.getAttribute("data-qh") === "from") prefs.notifications.quietFrom = inp.value;
        else prefs.notifications.quietTo = inp.value;
      });
    });
    $("[data-act='save-noti']", sec)?.addEventListener("click", () => {
      setPrefs(u, prefs);
      STEApp.toast("Notification preferences saved", "success");
    });
  }

  // ====================== API ACCESS (disabled — not on roadmap) ======================
  /* eslint-disable */ /*
  function renderApi(u, prefs) {
    const tokens = (prefs.api && prefs.api.tokens) || defaultTokens(u);
    const hooks = (prefs.api && prefs.api.webhooks) || defaultWebhooks(u);
    return `
      <div class="ste-section-hd">
        <div class="ste-page-crumbs"><a href="#/home">Home</a><span class="sep">/</span><span>Account Settings</span><span class="sep">/</span><span class="cur">API Access</span></div>
        <h1>API Access</h1>
      </div>

      <div class="ste-form-card">
        <div class="ste-form-section">
          <div class="ste-form-section-hd">
            <h3>Personal Access Tokens</h3>
            <button class="ste-btn ste-btn-primary" data-act="new-token">+ New token</button>
          </div>
          <table class="ste-table ste-api-table">
            <thead><tr><th>Name</th><th>Scopes</th><th>Last used</th><th>Expires</th><th></th></tr></thead>
            <tbody>
              ${tokens.length === 0 ? `<tr><td colspan="5" class="ste-empty-cell">No tokens yet</td></tr>` : tokens.map((t, i) => `
                <tr>
                  <td><strong>${escape(t.name)}</strong><div class="ste-mini">Created ${escape(t.created)}</div></td>
                  <td>${(t.scopes||[]).map(s => `<span class="ste-tag">${escape(s)}</span>`).join(" ")}</td>
                  <td>${escape(t.lastUsed || 'Never')}</td>
                  <td>${escape(t.expires || 'No expiry')}</td>
                  <td><button class="ste-btn ste-btn-link ste-btn-danger" data-revoke-tok="${i}">Revoke</button></td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>

        <div class="ste-form-section">
          <div class="ste-form-section-hd">
            <h3>Webhooks</h3>
            <button class="ste-btn ste-btn-ghost" data-act="new-webhook">+ New webhook</button>
          </div>
          <table class="ste-table ste-api-table">
            <thead><tr><th>Endpoint</th><th>Events</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${hooks.length === 0 ? `<tr><td colspan="4" class="ste-empty-cell">No webhooks configured</td></tr>` : hooks.map((h, i) => `
                <tr>
                  <td><code class="ste-code">${escape(h.url)}</code></td>
                  <td>${(h.events||[]).map(e => `<span class="ste-tag">${escape(e)}</span>`).join(" ")}</td>
                  <td><span class="ste-badge ste-badge-${h.active?'ok':'warn'}">${h.active?'Active':'Paused'}</span></td>
                  <td>
                    <button class="ste-btn ste-btn-link" data-test-hook="${i}">Test</button>
                    <button class="ste-btn ste-btn-link ste-btn-danger" data-del-hook="${i}">Delete</button>
                  </td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>

        <div class="ste-form-section">
          <div class="ste-form-section-hd"><h3>API Documentation</h3></div>
          <div class="ste-doc-card">
            <strong>REST API · v1</strong>
            <p>Base URL: <code class="ste-code">https://api.ste.fnf.co.kr/v1</code></p>
            <p>Authenticate with <code class="ste-code">Authorization: Bearer &lt;token&gt;</code></p>
            <p><a class="ste-link" href="#" data-act="open-docs">Open API reference →</a></p>
          </div>
        </div>
      </div>`;
  }

  function defaultTokens(u) {
    if (STE.isHQ(u)) return [
      { name: "Slack notifications", scopes: ["read:notifications","read:licensees"], lastUsed: "2 hours ago", expires: "2026-12-31", created: "2025-09-04" },
      { name: "BoardPack export", scopes: ["read:hq","read:licensees","read:settlements"], lastUsed: "Yesterday, 09:00", expires: "Never", created: "2025-02-12" },
    ];
    return [
      { name: "ERP nightly sync", scopes: ["read:statements","read:contracts"], lastUsed: "Today, 03:00", expires: "2027-01-15", created: "2026-01-15" },
    ];
  }
  function defaultWebhooks(u) {
    if (STE.isHQ(u)) return [
      { url: "https://hooks.slack.com/services/T01.../B01.../xxx", events: ["royalty.settled","design.approved","contract.amended"], active: true },
    ];
    return [
      { url: "https://erp.bestofbritain.co.uk/webhooks/ste", events: ["invoice.issued","statement.approved"], active: true },
    ];
  }

  function wireApi(sec, u, prefs) {
    prefs.api = prefs.api || { tokens: defaultTokens(u), webhooks: defaultWebhooks(u) };
    $("[data-act='new-token']", sec)?.addEventListener("click", () => {
      const name = prompt("Token name (e.g., \"Slack bot\", \"ERP sync\")");
      if (!name) return;
      prefs.api.tokens.push({
        name, scopes: ["read:notifications"], lastUsed: "Never", expires: "2027-05-13",
        created: new Date().toISOString().slice(0,10),
      });
      setPrefs(u, prefs);
      STEApp.toast(`Token "${name}" created · token shown only once`, "success");
      account();
    });
    $("[data-act='new-webhook']", sec)?.addEventListener("click", () => {
      const url = prompt("Webhook URL");
      if (!url) return;
      prefs.api.webhooks.push({ url, events: ["statement.approved"], active: true });
      setPrefs(u, prefs);
      STEApp.toast("Webhook added", "success");
      account();
    });
    $$("[data-revoke-tok]", sec).forEach(b => b.addEventListener("click", () => {
      const i = parseInt(b.getAttribute("data-revoke-tok"));
      const t = prefs.api.tokens[i];
      if (!confirm(`Revoke token "${t.name}"? This cannot be undone.`)) return;
      prefs.api.tokens.splice(i, 1);
      setPrefs(u, prefs);
      STEApp.toast("Token revoked", "info");
      account();
    }));
    $$("[data-test-hook]", sec).forEach(b => b.addEventListener("click", () => {
      STEApp.toast("Test event sent · response 200 OK", "success");
    }));
    $$("[data-del-hook]", sec).forEach(b => b.addEventListener("click", () => {
      const i = parseInt(b.getAttribute("data-del-hook"));
      prefs.api.webhooks.splice(i, 1);
      setPrefs(u, prefs);
      STEApp.toast("Webhook deleted", "info");
      account();
    }));
    $("[data-act='open-docs']", sec)?.addEventListener("click", (e) => {
      e.preventDefault();
      STEApp.toast("API reference — coming soon", "info");
    });
  }
  */ /* end API block */

  // ====================== WORKSPACE (HQ) ======================
  function renderWorkspace(u, prefs) {
    const w = prefs.workspace || { name: "Sergio Tacchini Global AI Agent", accent: "#2a3244", defaultRegion: "UK" };
    return `
      <div class="ste-section-hd">
        <div class="ste-page-crumbs"><a href="#/home">Home</a><span class="sep">/</span><span>Account Settings</span><span class="sep">/</span><span class="cur">Workspace</span></div>
        <h1>Workspace</h1>
      </div>
      <div class="ste-form-card">
        <div class="ste-form-section">
          <div class="ste-form-section-hd"><h3>Identity</h3></div>
          <div class="ste-form-grid">
            <div class="ste-form-field">
              <label>Workspace Name</label>
              <input class="ste-input" data-f="workspace.name" value="${escape(w.name)}">
            </div>
            <div class="ste-form-field">
              <label>Accent Color</label>
              <div style="display:flex;gap:8px;align-items:center"><input type="color" data-f="workspace.accent" value="${w.accent}"><code class="ste-code">${w.accent}</code></div>
            </div>
          </div>
        </div>

        <div class="ste-form-section">
          <div class="ste-form-section-hd"><h3>Regional Defaults</h3></div>
          <div class="ste-form-grid">
            <div class="ste-form-field">
              <label>Default Region for New Licensees</label>
              <select class="ste-input" data-f="workspace.defaultRegion">
                ${["UK","FR","DE","IT","ES","NL","PT","SE","PL"].map(r => `<option ${r===w.defaultRegion?'selected':''}>${r}</option>`).join("")}
              </select>
            </div>
            <div class="ste-form-field">
              <label>Default Reporting Currency</label>
              <select class="ste-input" data-f="workspace.currency">
                <option ${w.currency==='EUR'||!w.currency?'selected':''}>EUR</option>
                <option ${w.currency==='GBP'?'selected':''}>GBP</option>
                <option ${w.currency==='USD'?'selected':''}>USD</option>
              </select>
            </div>
            <div class="ste-form-field">
              <label>Royalty Default</label>
              <input class="ste-input" data-f="workspace.royaltyPct" value="${w.royaltyPct||10}">
            </div>
            <div class="ste-form-field">
              <label>FX Source</label>
              <select class="ste-input" data-f="workspace.fxSource">
                <option ${w.fxSource==='ECB'||!w.fxSource?'selected':''}>ECB Daily reference</option>
                <option ${w.fxSource==='BOK'?'selected':''}>Bank of Korea</option>
              </select>
            </div>
          </div>
        </div>

        <div class="ste-form-section">
          <div class="ste-form-section-hd"><h3>Single Sign-On</h3></div>
          <div class="ste-sso-card">
            <div>
              <strong>Microsoft Entra ID</strong>
              <div class="ste-mini">Tenant: fnf.onmicrosoft.com · 4,217 users provisioned · auto-sync every 60 min</div>
            </div>
            <span class="ste-badge ste-badge-ok">Connected</span>
          </div>
        </div>

        <div class="ste-form-actions">
          <button class="ste-btn ste-btn-primary" data-act="save-workspace">Save workspace settings</button>
        </div>
      </div>`;
  }
  function wireWorkspace(sec, u, prefs) {
    prefs.workspace = prefs.workspace || {};
    $$("[data-f^='workspace.']", sec).forEach(inp => inp.addEventListener("input", () => bindField(u, prefs, inp)));
    $("[data-act='save-workspace']", sec)?.addEventListener("click", () => {
      setPrefs(u, prefs);
      STEApp.toast("Workspace settings saved", "success");
    });
  }

  // ====================== Prefs helpers ======================
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
  function bindField(u, prefs, inp) {
    const path = inp.getAttribute("data-f").split(".");
    let o = prefs;
    for (let i = 0; i < path.length - 1; i++) {
      if (!o[path[i]]) o[path[i]] = {};
      o = o[path[i]];
    }
    o[path[path.length-1]] = inp.value;
  }

  function initials(name) {
    return (name || "?").split(/\s+/).map(s => s[0]).filter(Boolean).slice(0,2).join("").toUpperCase();
  }
  function escape(s) {
    return String(s||"").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
  }

  global.STEAccount = { account };
})(window);
