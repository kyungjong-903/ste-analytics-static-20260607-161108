/* =========================================================
   Sergio Tacchini Global Operations Management — per-screen enhancers.
   Each function runs when its hash route activates.
   Replaces wireframe content with state-driven UI on screens
   that need real interactivity. Leaves the rest alone.
   ========================================================= */
(function (global) {

  // Returns the section[data-page="<page>"] element. Auto-creates it if the
  // wireframe doesn't ship one — that way we can strip dead wireframe
  // sections (like the old login) without breaking the screens that target
  // them by page name.
  const SCREEN = (page) => {
    let sec = document.querySelector(`section[data-page="${page}"]`);
    if (!sec) {
      sec = document.createElement("section");
      sec.setAttribute("data-page", page);
      document.body.appendChild(sec);
    }
    return sec;
  };
  // Page main slot: inside the shell's <main class="main">. Use this for screens
  // that fully re-render their body — keeps sidebar + header + breadcrumb chrome.
  const PAGE_MAIN = (page) => {
    const sec = document.querySelector(`section[data-page="${page}"]`);
    if (!sec) return null;
    // The wireframe's showRoute() hides every section whose data-page doesn't
    // match the URL's first segment. When we use URL aliases (e.g. the canonical
    // URL is `#/sales-statements/...` but the section is `data-page="sales"`),
    // showRoute hides our section. Force it visible here.
    document.querySelectorAll("section[data-page]").forEach(s => { s.hidden = s.dataset.page !== page; });
    sec.hidden = false;
    return sec.querySelector(".main") || sec;
  };
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function gbp(n) { return "£" + Number(n || 0).toLocaleString("en-GB", {minimumFractionDigits: 2, maximumFractionDigits: 2}); }
  function gbp0(n) { return "£" + Math.round(Number(n || 0)).toLocaleString("en-GB"); }
  const REGION_NAMES = {
    UK: "United Kingdom", FR: "France", DE: "Germany", IT: "Italy",
    ES: "Spain", NL: "Netherlands", SE: "Sweden", PL: "Poland",
    PT: "Portugal", CH: "Switzerland", AT: "Austria", BE: "Belgium",
    DK: "Denmark", NO: "Norway", FI: "Finland", IE: "Ireland",
  };
  function regionName(code) { return REGION_NAMES[code] || code || "—"; }
  function pct(n) { return Number(n || 0).toFixed(2) + "%"; }
  // User preferences — read from userPrefs[userId].preferences (with defaults).
  // Single source of truth for date/time formatting so every screen looks
  // consistent and a change in Account › Preferences propagates everywhere.
  const DATE_FORMAT_PRESETS = {
    "DD MMM YYYY": { locale: "en-GB", date: { day: "2-digit", month: "short", year: "numeric" } },
    "DD/MM/YYYY":  { locale: "en-GB", date: { day: "2-digit", month: "2-digit", year: "numeric" } },
    "MMM DD, YYYY":{ locale: "en-US", date: { month: "short", day: "2-digit", year: "numeric" } },
    "MM/DD/YYYY":  { locale: "en-US", date: { month: "2-digit", day: "2-digit", year: "numeric" } },
    "YYYY-MM-DD":  { locale: "en-CA", date: { year: "numeric", month: "2-digit", day: "2-digit" } },
  };
  function getUserPrefs() {
    const user = STE.currentUser && STE.currentUser();
    const all = (STE.get && STE.get().userPrefs) || {};
    return (user && all[user.id] && all[user.id].preferences) || {};
  }
  function getDateOpts() {
    const p = getUserPrefs();
    return DATE_FORMAT_PRESETS[p.dateFormat] || DATE_FORMAT_PRESETS["DD MMM YYYY"];
  }
  function getTimeOpts() {
    const p = getUserPrefs();
    const hour12 = p.timeFormat === "12h";
    return { hour: "2-digit", minute: "2-digit", hour12 };
  }
  function fmtDate(iso) {
    if (!iso) return "";
    const opt = getDateOpts();
    return new Date(iso).toLocaleDateString(opt.locale, opt.date);
  }
  function fmtDateTime(iso) {
    if (!iso) return "";
    const opt = getDateOpts();
    const t = getTimeOpts();
    return new Date(iso).toLocaleString(opt.locale, { ...opt.date, ...t });
  }

  // ============================ LOGIN ============================
  function login() {
    const root = SCREEN("login");
    if (!root) return;
    // Full re-render: SSO is the primary CTA, email/password is secondary.
    root.innerHTML = renderLogin();
    wireLogin(root);
  }

  const LANGS = [
    { code: "en", label: "English" },
    { code: "ko", label: "한국어" },
  ];

  // Translation strings — login/forgot + key chrome (sidebar nav, profile menu,
  // account/admin tabs). Expand as needed.
  const I18N = {
    en: {
      // Sidebar nav
      nav_distribution: "Operation Plans",
      crumb_distribution: "Operation Plans",
      nav_home: "Home",
      nav_contracts: "Agreements",
      nav_season: "Season Timelines",
      nav_design: "Design Approvals",
      nav_sales: "Sales Statements",
      nav_inventory: "Invoices",
      nav_analytics: "Analytics",
      nav_section_operations: "Operations",
      nav_section_design: "Design",
      nav_support: "Help Center",
      nav_guide: "Help Center",
      // Breadcrumb labels (parallel to nav)
      crumb_home: "Home",
      crumb_hq: "Home",
      crumb_sales: "Sales",
      crumb_inventory: "Invoices",
      crumb_design: "Design Approval",
      crumb_season: "Season Timelines",
      crumb_contracts: "Agreements",
      crumb_analytics: "Analytics",
      crumb_support: "Help Center",
      crumb_onboarding: "New Licensee",
      // Profile menu
      profile_account_settings: "Account Settings",
      profile_account_sub: "Profile · preferences · security · notifications",
      profile_administration: "Administration",
      profile_administration_sub: "Workspace · users · audit log",
      profile_sign_out: "Sign Out",
      // Account Settings tabs
      tab_profile: "Profile",
      tab_preferences: "Preferences",
      tab_security: "Security",
      tab_notifications: "Notifications",
      back_to_dashboard: "← Back to Home",
      // Admin tabs
      tab_workspace: "Workspace",
      tab_licensees: "Licensees",
      tab_system: "HQ",
      tab_reference: "Reference Data",
      tab_users: "Users & Roles",
      tab_audit: "Audit Log",
      admin_administration: "Administration",
      // Header
      header_search_placeholder: "Search designs, statements, contracts, licensees…",

      login_subtitle: "Global AI Agent",
      email_label: "Email Address",
      email_placeholder: "Please enter your email",
      password_label: "Password",
      password_placeholder: "Enter your password",
      keep_signed_in: "Keep me signed in",
      forgot_password: "Forgot your password?",
      sign_in: "Sign In",
      or: "or",
      sign_in_microsoft: "Sign in with Microsoft",
      signing_you_in: "Signing you in…",
      loading_dashboard: "Loading your dashboard…",
      welcome_back: "Welcome back",
      reset_password: "Reset Password",
      reset_subtitle: "We'll email you a reset link",
      forgot_blurb: "Enter the email associated with your account. If it matches a registered user, you'll receive a password reset link valid for 30 minutes.",
      send_reset: "Send reset link",
      sending: "Sending…",
      back_to_signin: "← Back to sign in",
      back_to_signin_btn: "Back to sign in",
      check_inbox: "Check your inbox",
      forgot_success_prefix: "If",
      forgot_success: "is registered with STE, a password reset link will arrive within a few minutes. The link will expire in 30 minutes.",
      didnt_receive: "Didn't receive it? Check your spam folder, or contact",
      enter_email_warn: "Enter your email",
      enter_email_password: "Enter your email and password",
      account_not_found: "Account not found",
    },
    ko: {
      nav_home: "홈",
      nav_contracts: "계약",
      nav_season: "시즌 타임라인",
      nav_design: "디자인 승인",
      nav_sales: "판매 정산서",
      nav_inventory: "로열티 정산",
      nav_analytics: "분석",
      nav_support: "도움말 센터",
      nav_guide: "도움말 센터",
      nav_section_operations: "운영",
      nav_section_design: "디자인",
      crumb_home: "홈",
      crumb_hq: "홈",
      crumb_sales: "판매",
      crumb_inventory: "로열티 정산",
      crumb_design: "디자인 승인",
      crumb_season: "시즌 타임라인",
      nav_distribution: "운영 계획",
      crumb_distribution: "운영 계획",

      crumb_contracts: "계약",
      crumb_analytics: "분석",
      crumb_support: "도움말 센터",
      crumb_onboarding: "신규 라이선시",
      profile_account_settings: "계정 설정",
      profile_account_sub: "프로필 · 환경설정 · 보안 · 알림",
      profile_administration: "관리자",
      profile_administration_sub: "워크스페이스 · 사용자 · 감사 로그",
      profile_sign_out: "로그아웃",
      tab_profile: "프로필",
      tab_preferences: "환경설정",
      tab_security: "보안",
      tab_notifications: "알림",
      back_to_dashboard: "← 홈으로 돌아가기",
      tab_workspace: "워크스페이스",
      tab_licensees: "라이선시",
      tab_system: "본사",
      tab_reference: "참조 데이터",
      tab_users: "사용자 및 권한",
      tab_audit: "감사 로그",
      admin_administration: "관리자",
      header_search_placeholder: "디자인, 정산, 계약, 라이선시 검색…",

      login_subtitle: "글로벌 AI 에이전트",
      email_label: "이메일 주소",
      email_placeholder: "이메일을 입력해 주세요",
      password_label: "비밀번호",
      password_placeholder: "비밀번호를 입력해 주세요",
      keep_signed_in: "로그인 상태 유지",
      forgot_password: "비밀번호를 잊으셨나요?",
      sign_in: "로그인",
      or: "또는",
      sign_in_microsoft: "Microsoft로 로그인",
      signing_you_in: "로그인 중…",
      loading_dashboard: "대시보드를 불러오는 중…",
      welcome_back: "환영합니다",
      reset_password: "비밀번호 재설정",
      reset_subtitle: "재설정 링크를 이메일로 보내드립니다",
      forgot_blurb: "계정에 등록된 이메일을 입력해 주세요. 등록된 사용자의 이메일과 일치하면, 30분 동안 유효한 비밀번호 재설정 링크가 발송됩니다.",
      send_reset: "재설정 링크 보내기",
      sending: "보내는 중…",
      back_to_signin: "← 로그인으로 돌아가기",
      back_to_signin_btn: "로그인으로 돌아가기",
      check_inbox: "메일함을 확인해 주세요",
      forgot_success_prefix: "",
      forgot_success: "이(가) STE에 등록되어 있다면, 비밀번호 재설정 링크가 몇 분 이내로 도착합니다. 링크는 30분 후 만료됩니다.",
      didnt_receive: "메일이 오지 않았나요? 스팸함을 확인하거나 다음으로 문의해 주세요:",
      enter_email_warn: "이메일을 입력해 주세요",
      enter_email_password: "이메일과 비밀번호를 입력해 주세요",
      account_not_found: "계정을 찾을 수 없습니다",
    },
  };
  function t(key) {
    const lang = currentLang();
    return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
  }

  function currentLang() {
    // Normalize whatever shape the account has stored (preferences page uses
    // "English"/"한국어", admin modal uses "en"/"ko") down to "en"/"ko".
    const normalize = (v) => {
      if (!v) return null;
      if (v === "한국어" || v === "ko" || v === "Korean") return "ko";
      if (v === "English" || v === "en") return "en";
      return null;
    };

    // Logged-in user's saved preference wins — what's set in their account
    // is what they see, regardless of stale URL ?lang= flags from testing.
    try {
      const u = STE && STE.currentUser && STE.currentUser();
      if (u) {
        // Preferences page (canonical) and admin modal (legacy) both write
        // language, but to different locations. Check both.
        const prefs = (STE.get().userPrefs || {})[u.id];
        const fromPrefs = normalize(prefs && prefs.preferences && prefs.preferences.language);
        if (fromPrefs) return fromPrefs;
        const fromUser = normalize(u.language);
        if (fromUser) return fromUser;
        // Logged in but no explicit pref → English. Stale localStorage from
        // pre-account testing is intentionally ignored here so the account
        // is the single source of truth.
        return "en";
      }
    } catch {}

    // Not logged in (login screen, forgot-password, onboarding pre-auth):
    // URL ?lang= can override for testing/shareable links; otherwise English.
    const url = new URL(location.href);
    const q = url.searchParams.get("lang");
    if (q && LANGS.find(l => l.code === q)) return q;
    return "en";
  }
  function setLang(code) {
    const url = new URL(location.href);
    url.searchParams.set("lang", code);
    history.replaceState(null, "", url.toString());
    try { localStorage.setItem("ste.lang", code); } catch {}
  }
  // Expose for other modules
  global.STEi18n = { t, currentLang, setLang };

  function renderLogin() {
    return `
      <div class="ste-login-page">
        <div class="ste-login-card">
          <div class="ste-login-logo">
            <img class="ste-login-logo-img" src="assets/st-logo-dark.svg" alt="Sergio Tacchini">
            <div class="ste-login-sub">${t("login_subtitle")}</div>
          </div>

          <form id="ste-login-form">
            <div class="ste-field">
              <label for="ste-email">${t("email_label")}</label>
              <div class="ste-input-shell">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                <input id="ste-email" type="email" placeholder="${t("email_placeholder")}" autocomplete="off">
              </div>
            </div>
            <div class="ste-field">
              <label for="ste-password">${t("password_label")}</label>
              <div class="ste-input-shell">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <input id="ste-password" type="password" placeholder="${t("password_placeholder")}" autocomplete="off">
              </div>
            </div>

            <div class="ste-row-between">
              <label class="ste-checkbox">
                <input type="checkbox"> ${t("keep_signed_in")}
              </label>
              <a href="#/forgot" class="ste-link">${t("forgot_password")}</a>
            </div>

            <button id="ste-login-submit" class="ste-btn ste-btn-primary ste-btn-block" type="submit" disabled>${t("sign_in")}</button>
          </form>

          <div class="ste-login-divider"><span>${t("or")}</span></div>

          <button id="ste-ms-sso" class="ste-ms-btn" type="button">
            <svg width="18" height="18" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg" style="margin-right:10px;flex-shrink:0">
              <rect x="1"  y="1"  width="10" height="10" fill="#F25022"/>
              <rect x="12" y="1"  width="10" height="10" fill="#7FBA00"/>
              <rect x="1"  y="12" width="10" height="10" fill="#00A4EF"/>
              <rect x="12" y="12" width="10" height="10" fill="#FFB900"/>
            </svg>
            <span>${t("sign_in_microsoft")}</span>
          </button>
        </div>
      </div>`;
  }

  function wireLogin(root) {
    const form = $("#ste-login-form", root);
    const idInput = $("#ste-email", root);
    const pwInput = $("#ste-password", root);
    const submitBtn = $("#ste-login-submit", root);

    // Chrome-style autofill overlay — appears below the focused field, lists
    // saved licensee accounts. Click → fills both email and password.
    let popup = null;
    function buildOverlay(anchor) {
      // Show every account with a real name + email (excludes pending invites).
      const accounts = (STE.get().users || []).filter(u => u.email && u.name && !u.invitePending);
      if (!accounts.length) return null;
      const overlay = document.createElement("div");
      overlay.className = "ste-autofill-popup";
      overlay.innerHTML = `
        <div class="ste-autofill-popup-hd">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="14" r="3"/><path d="M12 14h9 M19 14v3 M16 14v2"/></svg>
          <span>Saved accounts</span>
        </div>
        ${accounts.map(u => `
          <button type="button" class="ste-autofill-popup-row" data-fill="${u.id}">
            <span class="ste-autofill-popup-email">${u.email}</span>
            <span class="ste-autofill-popup-mask">••••••••</span>
          </button>`).join("")}
      `;
      document.body.appendChild(overlay);
      // Position below the anchor
      const r = anchor.getBoundingClientRect();
      overlay.style.position = "fixed";
      overlay.style.top = (r.bottom + 4) + "px";
      overlay.style.left = r.left + "px";
      overlay.style.width = r.width + "px";
      overlay.style.zIndex = "9200";
      overlay.querySelectorAll("[data-fill]").forEach(b => b.addEventListener("mousedown", (e) => {
        e.preventDefault(); // don't blur the input before the click fires
        const id = b.getAttribute("data-fill");
        const u = STE.get().users.find(x => x.id === id);
        if (u) {
          idInput.value = u.email;
          pwInput.value = "Demo!2026A";   // 10 chars, masked as 10 dots
          // Fire input event so syncSubmit + any other listeners enable Sign In
          idInput.dispatchEvent(new Event("input", { bubbles: true }));
          pwInput.dispatchEvent(new Event("input", { bubbles: true }));
          hidePopup();
          submitBtn.focus();
        }
      }));
      return overlay;
    }
    function showPopup(anchor) {
      hidePopup();
      popup = buildOverlay(anchor);
    }
    function hidePopup() {
      if (popup) { popup.remove(); popup = null; }
    }
    // Open on focus / click of email or password input
    [idInput, pwInput].forEach(inp => {
      inp.addEventListener("focus", () => showPopup(inp));
      inp.addEventListener("click", () => showPopup(inp));
    });

    // Enable/disable Sign In based on field contents
    function syncSubmit() {
      submitBtn.disabled = !(idInput.value.trim() && pwInput.value.trim());
    }
    [idInput, pwInput].forEach(inp => inp.addEventListener("input", syncSubmit));
    syncSubmit();
    // Hide when both fields are blurred + click outside
    document.addEventListener("mousedown", (e) => {
      if (!popup) return;
      if (popup.contains(e.target) || e.target === idInput || e.target === pwInput) return;
      hidePopup();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hidePopup();
    });
    window.addEventListener("scroll", hidePopup, true);
    window.addEventListener("resize", hidePopup);

    function emailToLicenseeUser(email) {
      const e = (email || "").toLowerCase();
      return STE.get().users.find(u => u.email && u.email.toLowerCase() === e) || null;
    }

    async function doEmailSignin(e) {
      if (e) e.preventDefault();
      const email = (idInput.value || "").trim();
      if (!email || !pwInput.value) {
        STEApp.toast(t("enter_email_password"), "warn");
        return;
      }
      submitBtn.disabled = true;
      const orig = submitBtn.innerHTML;
      submitBtn.innerHTML = `<span class="ste-spin"></span> ${t("signing_you_in")}`;
      await sleep(900);
      submitBtn.innerHTML = `<span class="ste-spin"></span> ${t("loading_dashboard")}`;
      await sleep(800);
      const u = emailToLicenseeUser(email);
      if (!u) {
        submitBtn.innerHTML = orig;
        submitBtn.disabled = false;
        STEApp.toast(t("account_not_found"), "err");
        return;
      }
      STE.setSession({ userId: u.id });
      recordSignIn(u.id);
      const lic = STE.get().licensees.find(l => l.id === u.licenseeId);
      location.hash = "#/home";
      STEApp.toast(`${t("welcome_back")}, ${lic ? lic.legalName : u.name}`, "success");
    }

    if (form) form.addEventListener("submit", doEmailSignin);
    if (submitBtn) submitBtn.addEventListener("click", doEmailSignin);

    const ssoBtn = $("#ste-ms-sso", root);
    if (ssoBtn) ssoBtn.addEventListener("click", async (e) => { e.preventDefault(); await microsoftSsoFlow(); });
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // Microsoft-style SSO flow: redirect → account picker → consent → home
  function msHeader() {
    return `
      <div class="ste-ms-card-hd">
        <svg width="108" height="24" viewBox="0 0 108 24" xmlns="http://www.w3.org/2000/svg">
          <rect x="0"  y="0"  width="10" height="10" fill="#F25022"/>
          <rect x="11" y="0"  width="10" height="10" fill="#7FBA00"/>
          <rect x="0"  y="11" width="10" height="10" fill="#00A4EF"/>
          <rect x="11" y="11" width="10" height="10" fill="#FFB900"/>
          <text x="28" y="18" font-family="Segoe UI, Inter, sans-serif" font-size="16" fill="#5e5e5e">Microsoft</text>
        </svg>
      </div>`;
  }

  function msInitials(name) {
    return (name||"?").split(/\s+/).map(s=>s[0]).filter(Boolean).slice(0,2).join("").toUpperCase();
  }

  function ssoAccounts() {
    // SSO-eligible accounts: all HQ users + any user previously added through "Use another account" (marked ssoEligible)
    return (STE.get().users || []).filter(u => STE.isHQ(u) || u.ssoEligible);
  }

  function ssoAvatarColor(name) {
    const palette = ["#0078d4", "#107c10", "#5c2d91", "#d83b01", "#a4262c", "#038387"];
    let h = 0;
    for (let i = 0; i < (name||"").length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
    return palette[Math.abs(h) % palette.length];
  }

  async function microsoftSsoFlow() {
    const overlay = document.createElement("div");
    overlay.id = "ste-ms-overlay";

    let cancelled = false;
    const escHandler = (e) => {
      if (e.key === "Escape") { cancelled = true; overlay.remove(); document.removeEventListener("keydown", escHandler); }
    };
    document.addEventListener("keydown", escHandler);

    overlay.innerHTML = `
      <div class="ste-ms-step">
        <div class="ste-ms-spinner"></div>
        <div class="ste-ms-msg">Redirecting to <strong>login.microsoftonline.com</strong>…</div>
      </div>`;
    document.body.appendChild(overlay);
    await sleep(900);
    if (cancelled) return;

    const result = await showAccountPicker(overlay);
    document.removeEventListener("keydown", escHandler);
    if (!result) { overlay.remove(); return; }

    // Sign-in animation
    overlay.innerHTML = `
      <div class="ste-ms-card">
        ${msHeader()}
        <div class="ste-ms-card-body">
          <div class="ste-ms-title" style="display:flex;align-items:center;gap:8px">
            <span class="ste-ms-spinner small"></span>
            Signing you in…
          </div>
          <div class="ste-ms-sub">${escape(result.email)}</div>
        </div>
      </div>`;
    await sleep(1100);

    overlay.innerHTML = `
      <div class="ste-ms-step">
        <div class="ste-ms-spinner"></div>
        <div class="ste-ms-msg">Redirecting to <strong>Sergio Tacchini Global AI Agent</strong>…</div>
      </div>`;
    await sleep(700);
    overlay.remove();

    STE.setSession({ userId: result.userId, viewLicenseeId: "lic_75f7462d" });
    recordSignIn(result.userId);
    location.hash = "#/home";
    STEApp.toast(`Welcome, ${result.name}`, "success");
  }

  // Record that this user signed in — flips invitePending → false and stamps
  // lastSignInAt. SSO admins who weren't in state.users yet aren't reached here
  // (the SSO picker only offers known accounts in this prototype), but the
  // function is defensive about missing records.
  function recordSignIn(userId) {
    STE.mutate(s => {
      const u = (s.users || []).find(x => x.id === userId);
      if (!u) return;
      u.lastSignInAt = new Date().toISOString();
      if (u.invitePending) u.invitePending = false;
    });
  }

  function showAccountPicker(overlay) {
    return new Promise(resolve => {
      const accounts = ssoAccounts();
      overlay.innerHTML = `
        <div class="ste-ms-card">
          ${msHeader()}
          <div class="ste-ms-card-body">
            <div class="ste-ms-title">Pick an account</div>
            ${accounts.map(u => `
              <button class="ste-ms-account" data-acct="${u.id}">
                <span class="ste-ms-avatar" style="background:${ssoAvatarColor(u.name)}">${msInitials(u.name)}</span>
                <span>
                  <strong>${escape(u.name)}</strong>
                  <span class="ste-ms-sub">${escape(u.email || '')}</span>
                </span>
              </button>`).join("")}
            <button class="ste-ms-account" data-acct="__add__">
              <span class="ste-ms-avatar ste-ms-avatar-plus">+</span>
              <span><strong>Use another account</strong></span>
            </button>
          </div>
          <div class="ste-ms-card-foot">
            <button class="ste-ms-cancel" data-acct="__cancel__">Cancel</button>
          </div>
        </div>`;

      overlay.querySelectorAll(".ste-ms-account, .ste-ms-cancel").forEach(b => {
        b.addEventListener("click", async () => {
          const id = b.getAttribute("data-acct");
          if (id === "__cancel__") { resolve(null); return; }
          if (id === "__add__") {
            const created = await showAddAccount(overlay);
            if (created) resolve(created);
            else {
              // back to picker
              const picked = await showAccountPicker(overlay);
              resolve(picked);
            }
            return;
          }
          const u = STE.get().users.find(x => x.id === id);
          if (u) resolve({ userId: u.id, name: u.name, email: u.email });
          else resolve(null);
        });
      });
    });
  }

  function showAddAccount(overlay) {
    return new Promise(resolve => {
      overlay.innerHTML = `
        <div class="ste-ms-card">
          ${msHeader()}
          <div class="ste-ms-card-body">
            <div class="ste-ms-title">Sign in</div>
            <div class="ste-ms-sub" style="margin-bottom:14px">Enter your work or school account.</div>
            <form id="ste-ms-add">
              <input id="ste-ms-add-email" class="ste-ms-input" type="email" placeholder="Email" autocomplete="email" required>
              <input id="ste-ms-add-name" class="ste-ms-input" type="text" placeholder="Full name" autocomplete="name" required>
              <div class="ste-ms-card-foot ste-ms-add-actions">
                <button type="button" class="ste-ms-cancel" data-add-cancel>Back</button>
                <button type="submit" class="ste-ms-next">Next</button>
              </div>
            </form>
          </div>
        </div>`;

      const form = overlay.querySelector("#ste-ms-add");
      const emailInp = overlay.querySelector("#ste-ms-add-email");
      const nameInp = overlay.querySelector("#ste-ms-add-name");
      setTimeout(() => emailInp.focus(), 30);

      overlay.querySelector("[data-add-cancel]").addEventListener("click", () => resolve(null));
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const email = (emailInp.value || "").trim();
        const name = (nameInp.value || "").trim();
        if (!email || !name) return;
        // Provision a new HQ user (pretend they have an account)
        const id = "fnf-" + email.split("@")[0].replace(/[^a-z0-9]+/gi, "").toLowerCase() + "-" + Math.random().toString(36).slice(2, 5);
        const newUser = {
          id, name, role: "hq", title: "HQ User", email, tz: "Asia/Seoul", ssoEligible: true,
        };
        STE.mutate(s => {
          s.users = s.users || [];
          s.users.push(newUser);
        });
        resolve({ userId: id, name, email });
      });
    });
  }

  function escape(s) { return String(s||"").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c])); }
  // Day-count label that handles past-due cleanly. Naive `D-${d}` produces
  // "D--14" once a deadline goes negative; this returns "D+14" (past) or
  // "D-N" (countdown) or "D-0" (today).
  function dLabel(d) { return d > 0 ? `D-${d}` : d < 0 ? `D+${Math.abs(d)}` : "D-0"; }
  // Natural-language paired with the D-N tag. "12 days remaining" / "due
  // today" / "14 days overdue" — keeps action-card sub-lines consistent.
  function remainingText(d) {
    if (d > 0) return `${d} day${d === 1 ? '' : 's'} remaining`;
    if (d < 0) return `${Math.abs(d)} day${Math.abs(d) === 1 ? '' : 's'} overdue`;
    return "due today";
  }
  // CSV escape + downloader — used by Season Operation Plan "Download
  // template" links so the licensee gets a blank file with the right
  // column headers + one example row per template.
  function _csvField(v) {
    const s = String(v == null ? "" : v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }
  function downloadCsv(filename, headers, rows) {
    const lines = [headers.map(_csvField).join(",")]
      .concat((rows || []).map(r => r.map(_csvField).join(",")));
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
  }

  // ============================ HOME (Licensee + HQ — dispatched by role) ============================
  function home() {
    const root = SCREEN("home");
    if (!root) return;
    const u = STE.currentUser();
    if (!u) { location.hash = "#/login"; return; }
    // HQ shares the same URL; route to the HQ dashboard internally.
    if (STE.isHQ(u)) { return hq(); }
    const lic = STE.currentLicensee();
    const sel = STE.selectors();
    const season = sel.currentSeason();

    // Find the rendered <main> content area inside the active section and replace it
    const main = root.querySelector(".main");
    if (!main) return;

    // Derive action items from state
    const actions = deriveLicenseeActions(lic, season);

    main.innerHTML = `
      <div class="ste-screen-pad">
        <div class="ste-section-hd">
          <div class="ste-page-crumbs">
            <span class="cur">Home</span>
          </div>
          <h1>Welcome back, ${escape((u && u.name) || lic.legalName)}</h1>
        </div>

        <div class="ste-home-section">
          <div class="ste-home-section-hd">
            <h3>${escape(season.code)} Season Timeline</h3>
          </div>
          ${renderSeasonTimeline(season)}
        </div>

        ${actions.length ? `
          <div class="ste-home-section">
            <div class="ste-home-section-hd">
              <h3>Action Required</h3>
            </div>
            <div class="ste-home-actions">
              ${actions.map(a => `
                <a class="ste-home-action" href="${a.go}">
                  <span class="ste-home-action-ico ste-ico-${a.icon||'info'}"></span>
                  <div class="ste-home-action-body">
                    <strong>${escape(a.title)}</strong>
                    <span class="ste-mini">${escape(a.sub)}</span>
                  </div>
                  <span class="ste-home-action-tag ste-tag-${a.tag || 'info'}">${escape(a.tagLabel || '')}</span>
                </a>`).join("")}
            </div>
          </div>` : ""}

      </div>`;
  }

  // Build the season-phase timeline from `season.milestones`, anchoring each
  // phase's D-N count to the launch date so the labels match the way the
  // operations team talks about the calendar. Past milestones render as
  // `done`, the closest upcoming one renders as `active`.
  function renderSeasonTimeline(season) {
    const m = (season && season.milestones) || {};
    // Iterate the season's effective schema (HQ-customisable) so renamed or
    // added milestones surface here. Filter to entries that have a date.
    const phases = getMilestoneSchema(season)
      .map(p => ({ ...p, date: m[p.key] }))
      .filter(p => p.date);
    if (phases.length === 0) return "";
    const today = new Date();
    const launch = m.launch ? new Date(m.launch) : null;
    // Pick the active phase = first phase whose date is >= today.
    let activeIdx = phases.findIndex(p => new Date(p.date) >= today);
    if (activeIdx < 0) activeIdx = phases.length - 1;
    return `
      <ol class="ste-timeline">
        ${phases.map((p, i) => {
          const klass = i < activeIdx ? "done" : i === activeIdx ? "active" : "";
          const d = new Date(p.date);
          let dLabel = "";
          if (launch) {
            const days = Math.round((d - launch) / 86400000);
            dLabel = days === 0 ? "D-0" : days < 0 ? `D-${Math.abs(days)}` : `D+${days}`;
          } else {
            dLabel = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
          }
          return `<li class="${klass}"><span class="ste-timeline-dot"></span><strong>${escape(p.label)}</strong><span class="ste-mini">${escape(dLabel)}</span></li>`;
        }).join("")}
      </ol>`;
  }

  function deriveLicenseeActions(lic, season) {
    const state = STE.get();
    const session = (STE.getSession && STE.getSession()) || {};
    const actions = [];
    // Licensee design pipeline now reads from the merged designSubmissions —
    // legacy `state.designs` only feeds the sample-inspection flow in Mirror.
    const submissions = (state.designSubmissions || []).filter(s => s.licenseeId === lic.id);
    const inReview = submissions.filter(s => !s.decision && (s.status === "Pending Review" || s.status === "Submitted" || s.status === "Under Review"));
    const revisionRequested = submissions.filter(s => s.decision === "disapproved");
    // Reviews finished but the licensee hasn't opened them — pairs with the
    // sidebar Design Review badge and the in-page banner.
    const dReviewSeen = session.designReviewSeenIds || {};
    const designReady = submissions.filter(s => {
      const st = (s.status || "").toLowerCase();
      return (st === "done" || s.decision) && !dReviewSeen[s.id];
    });
    // Sample decisions waiting for the licensee to acknowledge (expand).
    const sampleSeen = session.sampleReviewSeenIds || {};
    const sampleReady = (state.sampleRecords || []).filter(r =>
      r.licenseeId === lic.id
      && (r.lastResult === "APPROVED" || r.lastResult === "REJECTED")
      && !sampleSeen[`${r.batchId}|${r.code}`]
    );
    const plan3a = state.seasonPlans?.find(p => p.licenseeId === lic.id && p.subplan === "3-A");
    const plan3b = state.seasonPlans?.find(p => p.licenseeId === lic.id && p.subplan === "3-B");
    const plan3c = state.seasonPlans?.find(p => p.licenseeId === lic.id && p.subplan === "3-C");
    const draftPlans = [plan3c, plan3b, plan3a].filter(p => p && (p.status === "Draft" || p.status === "Rejected"));
    const contract = state.contracts?.find(c => c.licenseeId === lic.id);
    const currentStmt = state.currentStatement && state.currentStatement.licenseeId === lic.id ? state.currentStatement : null;

    // Reviews ready to check — top priority for the licensee since these are
    // the items they explicitly asked HQ to decide on.
    if (designReady.length) {
      actions.push({
        title: `${designReady.length} design review${designReady.length===1?'':'s'} ready to check`,
        sub: `${designReady.slice(0,3).map(s => s.id).join(", ")}${designReady.length > 3 ? ` · +${designReady.length - 3} more` : ''}`,
        icon: "design", tag: "warn", tagLabel: "New",
        cta: "Open", go: "#/design-review",
      });
    }
    if (sampleReady.length) {
      actions.push({
        title: `${sampleReady.length} sample decision${sampleReady.length===1?'':'s'} ready to check`,
        sub: `${sampleReady.slice(0,5).map(r => r.code).join(", ")}${sampleReady.length > 5 ? ` · +${sampleReady.length - 5} more` : ''}`,
        icon: "design", tag: "warn", tagLabel: "New",
        cta: "Open", go: "#/sample-review",
      });
    }

    // Operation Plans still to submit — surfaces every draft / rejected
    // sub-plan, not just 3-B. Distribution-specific card below still fires
    // when there's a hard deadline on the 3-B draft.
    if (draftPlans.length > 1) {
      const lbl = draftPlans.map(p => p.subplan).join(" · ");
      actions.push({
        title: `${draftPlans.length} operation plan${draftPlans.length===1?'':'s'} to submit`,
        sub: `${season.code} · ${lbl}`,
        icon: "season", tag: "info", tagLabel: "Draft",
        cta: "Open", go: "#/operation-plans",
      });
    }
    // Distribution Plan deadline (if licensee hasn't submitted)
    if (plan3b && plan3b.status === "Draft") {
      const deadline = new Date(plan3b.deadline || season.nextDeadline.date);
      const daysLeft = Math.ceil((deadline - new Date()) / 86400000);
      actions.push({
        title: `Submit ${season.code} Distribution Plan`,
        sub: `Due ${fmtDate(deadline)} · ${remainingText(daysLeft)}`,
        urgency: daysLeft < 7 ? "Urgent · " + dLabel(daysLeft) : "Upcoming",
        icon: "season", tag: daysLeft < 7 ? "warn" : "info",
        tagLabel: dLabel(daysLeft),
        cta: "Submit Plan", go: "#/operation-plans",
      });
    }

    // Designs returned for revision
    if (revisionRequested.length) {
      actions.push({
        title: `${revisionRequested.length} design${revisionRequested.length===1?'':'s'} returned for revision`,
        sub: `Re-upload corrected CADs within 7 days`,
        icon: "design", tag: "warn", tagLabel: "Action",
        cta: "Review", go: "#/design-review",
      });
    }

    // 3. Current sales statement awaiting submission
    if (currentStmt && !["Invoiced","Paid"].includes(currentStmt.status) && !currentStmt.submittedAt) {
      actions.push({
        title: `${qDisplay(currentStmt.quarter)} Sales Statement ready to submit`,
        sub: `${currentStmt.totalLines} lines validated · ${currentStmt.errors?.length || 0} flagged`,
        icon: "sales", tag: "info", tagLabel: "Draft",
        cta: "Review & Submit", go: "#/sales",
      });
    } else if (!currentStmt && season.phase) {
      // Encourage filing if not started — same shape as the Distribution Plan
      // card so the two action rows line up visually.
      const deadline = new Date("2026-04-30");
      const daysLeft = Math.ceil((deadline - new Date()) / 86400000);
      actions.push({
        title: "Upload Q1 2026 Sales Statement",
        sub: `Due ${fmtDate(deadline)} · ${remainingText(daysLeft)}`,
        icon: "sales", tag: daysLeft < 7 ? "warn" : "info",
        tagLabel: dLabel(daysLeft),
        cta: "Start filing", go: "#/sales",
      });
    }

    // 4. Designs in HQ review (informational, not urgent)
    if (inReview.length && !actions.length) {
      actions.push({
        title: `${inReview.length} design${inReview.length===1?'':'s'} awaiting HQ review`,
        sub: `Reviewed within 2-5 business days`,
        icon: "design", tag: "info", tagLabel: "Pending",
        cta: "View", go: "#/design-review",
      });
    }

    // 5. Contract renewal window
    if (contract) {
      const days = Math.ceil((new Date(contract.termEnd) - new Date()) / 86400000);
      if (days < 365) {
        actions.push({
          title: `Contract renewal window opens`,
          sub: `${contract.id} · expires ${fmtDate(contract.termEnd)} · ${dLabel(days)}`,
          icon: "contract", tag: days < 180 ? "warn" : "info", tagLabel: dLabel(days),
          cta: "Open negotiation", go: "#/agreements",
        });
      }
    }

    return actions;
  }

  // Derive operational to-dos for HQ staff, mirroring the licensee
  // home shape so both audiences see the same kind of dashboard:
  // breadcrumb → h1 → hero next action → action queue → season timeline.
  function deriveHQActions(state, season) {
    const actions = [];
    const designs = state.designs || [];
    const stmts = state.salesStatements || [];
    const contracts = state.contracts || [];
    const plans = state.seasonPlans || [];
    const lics = state.licensees || [];

    // 1. Design Review queue — CAD packages awaiting decision (Approve / Disapprove).
    // Reads from the merged `designSubmissions` collection (Design Approvals
    // and Design Review are one workflow now).
    const submissions = state.designSubmissions || [];
    const subsPending = submissions.filter(s => !s.decision && (s.status === "Pending Review" || s.status === "Submitted" || s.status === "Under Review"));
    if (subsPending.length) {
      const byLic = new Set(subsPending.map(s => s.licenseeId));
      actions.push({
        title: `${subsPending.length} design package${subsPending.length===1?'':'s'} awaiting review`,
        sub: `Across ${byLic.size} licensee${byLic.size===1?'':'s'} · approve, disapprove, or grade-override`,
        urgency: subsPending.length >= 3 ? "Action required" : "Pending review",
        icon: "design", tag: subsPending.length >= 3 ? "warn" : "info",
        tagLabel: `${subsPending.length} package${subsPending.length===1?'':'s'}`,
        cta: "Open review queue", go: "#/design-review",
      });
    }

    // 2. Sales statements awaiting HQ review (invoicing queue)
    const stmtsPending = stmts.filter(s => s.status === "Pending Review");
    if (stmtsPending.length) {
      actions.push({
        title: `${stmtsPending.length} sales statement${stmtsPending.length===1?'':'s'} pending review`,
        sub: `Variance check + AI recompute reconciliation`,
        icon: "sales", tag: "info", tagLabel: "Settlement",
        cta: "Open", go: "#/sales-statements",
      });
    }

    // 2b. Sample Review queue — samples awaiting an HQ decision.
    const samples = state.sampleRecords || [];
    const samplesPending = samples.filter(r => !r.lastResult || r.lastResult === "PENDING");
    if (samplesPending.length) {
      const byLic = new Set(samplesPending.map(r => r.licenseeId));
      actions.push({
        title: `${samplesPending.length} sample${samplesPending.length===1?'':'s'} awaiting review`,
        sub: `Across ${byLic.size} licensee${byLic.size===1?'':'s'} · approve, reject, or request another round`,
        icon: "design", tag: samplesPending.length >= 5 ? "warn" : "info",
        tagLabel: `${samplesPending.length} sample${samplesPending.length===1?'':'s'}`,
        cta: "Open", go: "#/sample-review",
      });
    }

    // 3. Operation Plans under HQ Review
    const plansPending = plans.filter(p => p.status === "Pending Review");
    if (plansPending.length) {
      const byLic = new Set(plansPending.map(p => p.licenseeId));
      actions.push({
        title: `${plansPending.length} operation plan${plansPending.length===1?'':'s'} under HQ review`,
        sub: `Across ${byLic.size} licensee${byLic.size===1?'':'s'} · approve or request revision`,
        icon: "season", tag: "info", tagLabel: "Plan",
        cta: "Open", go: "#/operation-plans",
      });
    }

    // 4. Contracts within 365 days of expiry (renewal window)
    const today = new Date();
    const renewals = contracts.map(c => ({c, days: Math.ceil((new Date(c.termEnd) - today) / 86400000)}))
      .filter(x => x.days >= 0 && x.days < 365)
      .sort((a, b) => a.days - b.days);
    if (renewals.length) {
      const r = renewals[0];
      const lic = lics.find(l => l.id === r.c.licenseeId);
      actions.push({
        title: `Contract renewal: ${lic ? lic.legalName : 'agreement'}`,
        sub: `Expires ${fmtDate(r.c.termEnd)} · ${dLabel(r.days)}${renewals.length > 1 ? ` · +${renewals.length - 1} more` : ''}`,
        icon: "contract", tag: r.days < 180 ? "warn" : "info", tagLabel: dLabel(r.days),
        cta: "Open contracts", go: "#/agreements",
      });
    }

    // 5. Licensees flagged for attention (compliance issues)
    const attn = lics.filter(l => l.status === "Attention" || l.status === "Review");
    if (attn.length) {
      actions.push({
        title: `${attn.length} licensee${attn.length===1?'':'s'} flagged for attention`,
        sub: attn.map(l => `${l.legalName} (${l.compliance}/100)`).join(" · "),
        icon: "inventory", tag: "warn", tagLabel: "Compliance",
        cta: "Open analytics", go: "#/analytics",
      });
    }

    return actions;
  }

  // Build a per-licensee snapshot for the HQ home grid: pending counts across
  // every workstream, plus contract alerts. The card derives its status pill
  // (critical / attention / normal) from these numbers so HQ scans the grid
  // first and reads the detail feeds below only for the licensees that need
  // attention. Avoids the cognitive overload of one full section per licensee.
  function deriveLicenseeSnapshot(state, lic, season) {
    const subs = (state.designSubmissions || []).filter(s => s.licenseeId === lic.id);
    const pendingDesigns = subs.filter(s => !s.decision && (s.status === "Pending Review" || s.status === "Submitted" || s.status === "Under Review")).length;
    const rejectedDesigns = subs.filter(s => s.decision === "disapproved").length;

    const sampleBatches = (state.sampleRecords || []).filter(r => r.licenseeId === lic.id);
    const pendingSamples = sampleBatches.filter(r => !r.lastResult || r.lastResult === "PENDING").length;
    const rejectedSamples = sampleBatches.filter(r => r.lastResult === "REJECTED").length;

    const plans = (state.seasonPlans || []).filter(p => p.licenseeId === lic.id);
    const pendingPlans = plans.filter(p => p.status === "Pending Review").length;

    const stmts = (state.salesStatements || []).filter(s => s.licenseeId === lic.id);
    const pendingStmts = stmts.filter(s => s.status === "Pending Review").length;

    const contract = (state.contracts || []).find(c => c.licenseeId === lic.id);
    const contractAlerts = contract ? computeAgreementAlerts(contract) : [];
    const critical = contractAlerts.filter(a => a.severity === "critical").length;
    const standard = contractAlerts.filter(a => a.severity === "standard").length;
    const expiryDays = contract && contract.termEnd ? Math.ceil((new Date(contract.termEnd) - new Date()) / 86400000) : null;

    // Status — strongest signal wins. Critical alert, rejected items, or an
    // expiring contract within 90 days → critical. Anything pending → attention.
    // Otherwise normal.
    let status = "normal";
    if (critical > 0 || rejectedDesigns > 0 || rejectedSamples > 0 || (expiryDays !== null && expiryDays < 90)) status = "critical";
    else if (pendingDesigns + pendingSamples + pendingPlans + pendingStmts + standard > 0) status = "attention";

    return {
      licensee: lic,
      contract,
      pendingDesigns, rejectedDesigns,
      pendingSamples, rejectedSamples,
      pendingPlans,
      pendingStmts,
      critical, standard,
      expiryDays,
      status,
    };
  }

  // ============================ HQ Global Admin ============================
  function hq() {
    // Both HQ and licensee share the #/home URL — render into the "home"
    // section regardless of internal page key.
    const root = SCREEN("home") || SCREEN("hq");
    if (!root) return;
    const u = STE.currentUser();
    if (!u) { location.hash = "#/login"; return; }
    if (STE.isHQ && !STE.isHQ(u)) { location.hash = "#/home"; return; }

    const main = root.querySelector(".main");
    if (!main) return;

    const state = STE.get();
    const season = STE.selectors().currentSeason();
    const actions = deriveHQActions(state, season);
    const next = actions[0];
    const rest = actions.slice(1);

    // Aggregate Critical/Standard alerts across all contracts
    const allContracts = state.contracts || [];
    const licensees = state.licensees || [];
    const licById = (id) => licensees.find(l => l.id === id);
    const opsAlerts = [];
    allContracts.forEach(c => {
      const items = computeAgreementAlerts(c);
      items.forEach(a => opsAlerts.push({ ...a, licensee: licById(c.licenseeId), contract: c }));
    });
    // Sort: critical → standard → reference
    const sevOrder = { critical: 0, standard: 1, reference: 2 };
    opsAlerts.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);
    const criticalCount = opsAlerts.filter(a => a.severity === "critical").length;
    const standardCount = opsAlerts.filter(a => a.severity === "standard").length;

    // Per-licensee snapshot grid — top-of-page at-a-glance summary. Sorted
    // so licensees needing attention surface first. Cards are compact: status
    // chip, four pending-item counters, contract expiry meter.
    const statusRank = { critical: 0, attention: 1, normal: 2 };
    const snapshots = (licensees || [])
      .map(l => deriveLicenseeSnapshot(state, l, season))
      .sort((a, b) => {
        if (statusRank[a.status] !== statusRank[b.status]) return statusRank[a.status] - statusRank[b.status];
        return (a.licensee.legalName || "").localeCompare(b.licensee.legalName || "");
      });
    // Filter state — clicking a card sets a licensee filter that scopes the
    // Action Required + Operational Monitoring sections below. "All" clears.
    const homeLicFilter = (STE.getSession() || {}).hqHomeLicFilter || "";
    const filteredOpsAlerts = homeLicFilter
      ? opsAlerts.filter(a => a.contract && a.contract.licenseeId === homeLicFilter)
      : opsAlerts;
    const filteredActions = homeLicFilter
      ? actions.filter(a => !a.licenseeId || a.licenseeId === homeLicFilter)
      : actions;

    const statusLabel = (s) => s === "critical" ? "Critical" : s === "attention" ? "Attention" : "On track";
    const renderSnapshotCard = (snap) => {
      const lic = snap.licensee;
      const totalPending = snap.pendingDesigns + snap.pendingSamples + snap.pendingPlans + snap.pendingStmts;
      const expiryChip = (snap.expiryDays !== null && snap.expiryDays < 365)
        ? `<span class="ste-lic-snap-expiry ${snap.expiryDays < 90 ? 'is-warn' : ''}">Contract ${dLabel(snap.expiryDays)}</span>`
        : '';
      const isActive = homeLicFilter === lic.id;
      return `
        <button class="ste-lic-snap-card sev-${snap.status} ${isActive ? 'is-active' : ''}" type="button" data-lic-snap="${escape(lic.id)}">
          <div class="ste-lic-snap-hd">
            <div class="ste-lic-snap-id">
              <strong>${escape(lic.legalName || lic.name || lic.id)}</strong>
              ${lic.tier ? `<span class="ste-mini">Tier ${escape(String(lic.tier))}</span>` : ''}
            </div>
            <span class="ste-lic-snap-pill sev-${snap.status}">${statusLabel(snap.status)}</span>
          </div>
          <div class="ste-lic-snap-counts">
            <div class="ste-lic-snap-count ${snap.pendingDesigns > 0 ? 'is-on' : ''}">
              <strong>${snap.pendingDesigns}</strong>
              <span>Design${snap.rejectedDesigns ? ` · ${snap.rejectedDesigns} reject` : ''}</span>
            </div>
            <div class="ste-lic-snap-count ${snap.pendingSamples > 0 ? 'is-on' : ''}">
              <strong>${snap.pendingSamples}</strong>
              <span>Sample${snap.rejectedSamples ? ` · ${snap.rejectedSamples} reject` : ''}</span>
            </div>
            <div class="ste-lic-snap-count ${snap.pendingPlans > 0 ? 'is-on' : ''}">
              <strong>${snap.pendingPlans}</strong>
              <span>Plan</span>
            </div>
            <div class="ste-lic-snap-count ${snap.pendingStmts > 0 ? 'is-on' : ''}">
              <strong>${snap.pendingStmts}</strong>
              <span>Settle</span>
            </div>
          </div>
          <div class="ste-lic-snap-foot">
            ${snap.critical > 0 ? `<span class="ste-lic-snap-alert is-critical">${snap.critical} critical</span>` : ''}
            ${snap.standard > 0 ? `<span class="ste-lic-snap-alert is-standard">${snap.standard} standard</span>` : ''}
            ${expiryChip}
            ${totalPending === 0 && snap.critical === 0 && snap.standard === 0 ? `<span class="ste-mini">No pending items</span>` : ''}
          </div>
        </button>`;
    };

    main.innerHTML = `
      <div class="ste-screen-pad">
        <div class="ste-section-hd">
          <div class="ste-page-crumbs"><span class="cur">Home</span></div>
          <h1>Welcome back, ${escape(u.name)}</h1>
        </div>

        ${snapshots.length ? `
          <div class="ste-home-section ste-home-lic-grid-section">
            <div class="ste-home-section-hd">
              <h3>Licensees at a glance</h3>
              <span class="ste-mini">Click a licensee to scope the feeds below. ${homeLicFilter ? `<button class="ste-home-lic-clear" data-lic-snap-clear type="button">Clear filter</button>` : ''}</span>
            </div>
            <div class="ste-lic-snap-grid">
              ${snapshots.map(renderSnapshotCard).join("")}
            </div>
          </div>` : ''}

        ${(window.STEActionRequired && STEActionRequired.render)
          ? `<div class="ste-home-section">${STEActionRequired.render()}</div>`
          : ''}

        ${filteredActions.length ? `
          <div class="ste-home-section">
            <div class="ste-home-section-hd">
              <h3>Action Required${homeLicFilter ? ` · ${escape((licById(homeLicFilter) || {}).legalName || homeLicFilter)}` : ''}</h3>
              <span class="ste-mini">${filteredActions.length} item${filteredActions.length===1?'':'s'}</span>
            </div>
            <div class="ste-home-actions">
              ${filteredActions.map(a => `
                <a class="ste-home-action" href="${a.go}">
                  <span class="ste-home-action-ico ste-ico-${a.icon||'info'}"></span>
                  <div class="ste-home-action-body">
                    <strong>${escape(a.title)}</strong>
                    <span class="ste-mini">${escape(a.sub)}</span>
                  </div>
                  <span class="ste-home-action-tag ste-tag-${a.tag || 'info'}">${escape(a.tagLabel || '')}</span>
                </a>`).join("")}
            </div>
          </div>` : ''}

        ${filteredOpsAlerts.length ? (() => {
          const expanded = !!(STE.getSession() || {}).opsAlertsExpanded;
          const COLLAPSED_LIMIT = 4;
          const visibleAlerts = expanded ? filteredOpsAlerts : filteredOpsAlerts.slice(0, COLLAPSED_LIMIT);
          const hiddenCount = filteredOpsAlerts.length - visibleAlerts.length;
          const fCritical = filteredOpsAlerts.filter(a => a.severity === "critical").length;
          const fStandard = filteredOpsAlerts.filter(a => a.severity === "standard").length;
          return `
          <div class="ste-home-section ste-home-ops-section" style="margin-top:24px">
            <div class="ste-home-section-hd">
              <h3>Operational Monitoring · Agreements${homeLicFilter ? ` · ${escape((licById(homeLicFilter) || {}).legalName || homeLicFilter)}` : ''}</h3>
              <span class="ste-mini">
                <span class="ste-ops-dot ste-ops-dot-critical"></span> ${fCritical} critical ·
                <span class="ste-ops-dot ste-ops-dot-standard"></span> ${fStandard} standard ·
                <strong>${filteredOpsAlerts.length}</strong> total
              </span>
            </div>
            <div class="ste-home-ops-list">
              ${visibleAlerts.map(a => `
                <a class="ste-home-ops-row sev-${a.severity}" href="#/agreements/details/view/${escape(a.contractId)}">
                  <span class="ste-home-ops-bar"></span>
                  <span class="ste-home-ops-sev">${a.severity === 'critical' ? 'Critical' : a.severity === 'standard' ? 'Standard' : 'Reference'}</span>
                  <span class="ste-home-ops-label">${escape(a.label)}</span>
                  <span class="ste-home-ops-detail">${escape((a.licensee && a.licensee.legalName) || a.contractId)} · ${escape(a.detail)}</span>
                  <span class="ste-home-ops-id">${escape(a.contractId)}<span class="ste-home-ops-arrow">›</span></span>
                </a>`).join("")}
            </div>
            ${filteredOpsAlerts.length > COLLAPSED_LIMIT ? `
              <button class="ste-home-ops-toggle" type="button" data-ops-toggle>
                ${expanded ? `Show fewer` : `Show ${hiddenCount} more`}
                <span class="ste-home-ops-toggle-chev">${expanded ? '▴' : '▾'}</span>
              </button>` : ''}
          </div>`;
        })() : ''}

        ${!filteredActions.length && !filteredOpsAlerts.length ? `
          <div class="ste-home-empty">
            <h2>${homeLicFilter ? 'Nothing pending for this licensee' : 'Nothing in the queue'}</h2>
            <p>${homeLicFilter ? 'No approvals, settlements, or renewals pending for the selected licensee.' : 'No approvals, settlements, or renewals pending.'}</p>
          </div>` : ''}
      </div>`;

    // Snapshot-card click — toggle the per-licensee filter on the feeds below.
    main.querySelectorAll("[data-lic-snap]").forEach(b => b.addEventListener("click", () => {
      const lid = b.getAttribute("data-lic-snap");
      const sess = STE.getSession() || {};
      const next = sess.hqHomeLicFilter === lid ? "" : lid;
      STE.setSession({ ...sess, hqHomeLicFilter: next });
      hq();
    }));
    main.querySelector("[data-lic-snap-clear]")?.addEventListener("click", (e) => {
      e.preventDefault();
      const sess = STE.getSession() || {};
      STE.setSession({ ...sess, hqHomeLicFilter: "" });
      hq();
    });

    // Expand/collapse for the ops monitoring list.
    main.querySelector("[data-ops-toggle]")?.addEventListener("click", () => {
      const sess = STE.getSession() || {};
      STE.setSession({ ...sess, opsAlertsExpanded: !sess.opsAlertsExpanded });
      hq();
    });

    // Legacy wireframe wiring is no longer needed — the main content was
    // replaced with the action-queue dashboard above. Aggregate KPIs and
    // licensee performance cards live on the Analytics page instead.
    return;

    // Approval queue items → respective screens
    $$("a, button, .queue-item, [class*='approval']", root).forEach(el => {
      if (el._wired) return;
      const t = (el.textContent || "").toLowerCase();
      if (/design approvals?\b/.test(t)) {
        el._wired = true; el.style.cursor = "pointer";
        el.addEventListener("click", (e) => { e.preventDefault(); location.hash = "#/design"; });
      } else if (/season plan reviews?/.test(t)) {
        el._wired = true; el.style.cursor = "pointer";
        el.addEventListener("click", (e) => { e.preventDefault(); location.hash = "#/timelines"; });
      } else if (/sales statement reviews?/.test(t)) {
        el._wired = true; el.style.cursor = "pointer";
        el.addEventListener("click", (e) => { e.preventDefault(); location.hash = "#/inventory"; });
      } else if (/bbuk contract|sugi footwear brand|benjamin.*extension/.test(t)) {
        el._wired = true; el.style.cursor = "pointer";
        el.addEventListener("click", (e) => { e.preventDefault();
          if (/bbuk/.test(t)) STE.setSession({ ...STE.getSession(), viewLicenseeId: "lic_75f7462d" });
          else if (/sugi footwear/.test(t)) STE.setSession({ ...STE.getSession(), viewLicenseeId: "lic_000025e9" });
          else if (/benjamin/.test(t)) STE.setSession({ ...STE.getSession(), viewLicenseeId: "lic_b56a4e2c" });
          location.hash = "#/agreements";
        });
      }
    });
  }

  // ============================ SALES UPLOAD (full re-render) ============================
  let _validateRef = null;
  async function sales() {
    const root = PAGE_MAIN("sales");
    if (!root) return;
    if (!_validateRef) _validateRef = await STEValidate.loadRef();

    const u = STE.currentUser();
    const isHQ = u && STE.isHQ(u);
    // URL forms (canonical and legacy):
    //   #/sales                                 → list
    //   #/sales/details/view/<stmtId>           → read-only view of a statement (canonical)
    //   #/sales/details/<stmtId>                → legacy alias → redirected to /view/<id>
    //   #/sales/<licId>                         → submission form for that licensee
    //   #/sales/<licId>/<quarterSlug>           → legacy lookup form
    // Accept both #/sales and #/sales-statements as the page slug.
    const viewIdMatch = (location.hash || "").match(/^#\/(?:sales|sales-statements)\/details\/view\/([A-Z0-9_-]+)/i);
    if (viewIdMatch) {
      const stmtId = viewIdMatch[1];
      const stmt = (STE.get().salesStatements || []).find(s => s.id === stmtId);
      if (stmt) {
        renderSalesView(root, stmt.licenseeId, null, stmt);
        return;
      }
      location.hash = "#/sales-statements"; return;
    }
    // Legacy: #/sales/details/<id> — redirect to the canonical /view/<id>.
    const legacyDetailsMatch = (location.hash || "").match(/^#\/(?:sales|sales-statements)\/details\/([A-Z0-9_-]+)/i);
    if (legacyDetailsMatch) {
      location.replace(`#/sales-statements/details/view/${encodeURIComponent(legacyDetailsMatch[1])}`);
      return;
    }
    const legacyViewMatch = (location.hash || "").match(/^#\/(?:sales|sales-statements)\/([A-Z0-9_-]+)\/([A-Z0-9_-]+)/i);
    if (legacyViewMatch) { renderSalesView(root, legacyViewMatch[1], legacyViewMatch[2]); return; }
    const sub = pageSubRoute("sales") || pageSubRoute("sales-statements");
    if (_salesPreview) { renderSalesPreview(root); return; }
    // Both HQ and licensees see the list view first when no sub-route is
    // active. Click "+ Submit New Statement" → /sales/{licId} opens the form.
    if (!sub) { salesList(root, isHQ, u); return; }
    if (sub) STE.setSession({ ...STE.getSession(), viewLicenseeId: sub });

    const lic = STE.currentLicensee() || STE.get().licensees[0];
    const stmts = STE.selectors().salesStatements(lic.id).slice().sort((a,b) => (b.submittedAt||"").localeCompare(a.submittedAt||""));
    const cur = STE.get().currentStatement;

    root.innerHTML = renderSalesShell(lic, stmts, cur);
    // In-card licensee selector (HQ only): switches viewLicenseeId and re-renders
    const repLicSel = $("#ste-report-licensee", root);
    if (repLicSel) repLicSel.addEventListener("change", () => {
      STE.setSession({ ...STE.getSession(), viewLicenseeId: repLicSel.value });
      location.hash = "#/sales/" + repLicSel.value;
    });
    // Wire quarter selector — updates the deadline + range + backfill notice
    const qSel = $("#ste-quarter-select", root);
    function paintQuarter() {
      if (!qSel) return;
      const opt = qSel.options[qSel.selectedIndex];
      const y = parseInt(opt.getAttribute("data-year"));
      const q = parseInt(opt.getAttribute("data-q"));
      const filed = opt.getAttribute("data-filed") === "1";
      const rangeEl = $("#ste-quarter-range", root);
      const dlEl = $("#ste-quarter-deadline", root);
      const bfEl = $("#ste-quarter-backfill", root);
      if (rangeEl) rangeEl.textContent = quarterRange(y, q);
      if (dlEl) dlEl.textContent = quarterDeadline(y, q);
      if (bfEl) bfEl.style.display = filed ? "block" : "none";
    }
    if (qSel) qSel.addEventListener("change", paintQuarter);
    paintQuarter();
    $("#ste-report-currency", root)?.addEventListener("change", () => paintTotals());

    // ===== Editable table model =====
    // Submission is create-only: always start with a single blank row,
    // EXCEPT when the user is bouncing back from the Preview view — in that
    // case we restore the in-progress rows so their work isn't lost.
    // Row shape mirrors the ST Sales & Royalty Reporting Template's
    // quarterly tab. Legacy fields (date, gross, discountPct) are still
    // accepted by the parser for backwards compatibility, but the form
    // exposes the canonical ST columns going forward.
    const emptyRow = () => ({
      // Identity
      season: "", invoiceNumber: "",
      // Product
      category: "", gender: "", sku: "", description: "",
      // Where + who
      countryOfSale: "", territory: "", currency: "",
      customer: "", tier: "", customerType: "",
      // Pricing per unit
      unitGross: "", deductions: "", unitNet: "",
      // Volume + FX
      qty: "", fx: "",
      // Legacy / compatibility — populated from imports of older CSVs
      date: "", gross: "", discountPct: "", discount: "",
      netEntered: "", account: "", channel: "", unitPrice: "",
    });
    const isEmpty = (r) => {
      const keys = ["season","invoiceNumber","category","gender","sku","description",
        "countryOfSale","territory","currency","customer","tier","customerType",
        "unitGross","deductions","unitNet","qty","fx",
        "date","gross","discountPct","discount","netEntered","account","channel","unitPrice"];
      return keys.every(k => !r[k]);
    };
    let entryRows;
    if (_salesDraftCarry && _salesDraftCarry.licId === lic.id && Array.isArray(_salesDraftCarry.rows) && _salesDraftCarry.rows.length) {
      entryRows = _salesDraftCarry.rows.map(r => ({ ...r }));
      _salesDraftCarry = null;
    } else {
      entryRows = [emptyRow()];
    }

    function paintTotals() {
      const tfoot = $("#ste-sales-tfoot", root);
      if (!tfoot) return;
      const totalQty = entryRows.reduce((s, r) => s + (parseFloat(r.qty) || 0), 0);
      const totalSales = entryRows.reduce((s, r) => s + netSales(r), 0);
      const mismatches = entryRows.filter(netMismatch).length;
      const cur = ($("#ste-report-currency", root)?.value) || lic.currency || "GBP";
      // Column layout: 20 cells. Totals span 16 → Qty col → Net Sales col → FX + remove blanks.
      tfoot.innerHTML = `
        <tr class="ste-sales-total">
          <td colspan="15" style="text-align:right"><strong>Total</strong></td>
          <td style="text-align:right"><strong>${totalQty.toLocaleString()}</strong></td>
          <td style="text-align:right"><strong>${cur} ${fmt2(totalSales)}</strong></td>
          <td></td>
        </tr>`;
      const counts = $("#ste-sales-counts", root);
      if (counts) {
        const parts = [`${entryRows.filter(r => !isEmpty(r)).length} line${entryRows.length===1?'':'s'}`,
                       `${totalQty.toLocaleString()} units`];
        if (mismatches) parts.push(`<span style="color:var(--st-warn)">${mismatches} net mismatch${mismatches===1?'':'es'}</span>`);
        counts.innerHTML = parts.join(" · ");
      }
    }

    function fmt2(n) { return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
    // Sales math follows the ST template's quarterly tab:
    //   Unit Net = Unit Gross − Deductions (per unit)
    //   Net Sales = Unit Net × Units Sold (row total in currency of sale)
    // The entered Unit Net is honoured if the licensee overrides it; the
    // computed value is shown as a hint and used as a fallback.
    function unitNetCalc(r) {
      const g = parseFloat(r.unitGross) || 0;
      const d = parseFloat(r.deductions) || 0;
      return Math.max(0, g - d);
    }
    function unitNetEffective(r) {
      const entered = parseFloat(r.unitNet);
      if (entered > 0) return entered;
      return unitNetCalc(r);
    }
    function netSales(r) {
      const q = parseFloat(r.qty) || 0;
      return q * unitNetEffective(r);
    }
    function netMismatch(r) {
      const entered = parseFloat(r.unitNet);
      if (!entered) return false;
      const calc = unitNetCalc(r);
      if (calc <= 0) return false;
      return Math.abs(entered - calc) > 0.01;
    }
    // Legacy aliases kept so downstream submit/preview code (which still
    // references calcNet / calcDiscount) doesn't break before its own refactor.
    function calcDiscount(r) { return (parseFloat(r.deductions) || 0) * (parseFloat(r.qty) || 0); }
    function calcNet(r) { return netSales(r); }
    const ref = STE.get().referenceData || {};
    const refCategories = ref.categories || [];
    const refChannels = ref.channels || [];
    function optList(opts, sel, placeholder) {
      const has = sel && opts.includes(sel);
      return `<option value="">${escape(placeholder)}</option>` +
        opts.map(o => `<option value="${escape(o)}" ${o === sel ? 'selected' : ''}>${escape(o)}</option>`).join("") +
        (!has && sel ? `<option value="${escape(sel)}" selected>${escape(sel)}</option>` : "");
    }
    // ST template dropdown vocabularies — bake them in so the entry table
    // looks the same as the canonical .xlsx without needing a roundtrip.
    const REF_GENDERS = ["Mens","Womens","Kids","Other"];
    const REF_TERRITORY = ["In","Out"];
    // Numeric tier system per the Sales template standardization decision —
    // Tier 0 is the floor (entry-tier accounts), counting up. ST Online and
    // Other live alongside the numeric ladder as fixed buckets.
    const REF_TIERS = ["Tier 0","Tier 1","Tier 2","Tier 3","Tier 4","ST Online","Other"];
    const REF_CUSTOMER_TYPES = ["Retail","Wholesale","Marketplace","ST Online","Other Licensee","Other"];

    // Custom in-cell dropdown — replaces native <select> so the field
    // chrome stays consistent with the platform's other custom controls
    // (no system dropdown UI). Options are looked up by field name on
    // open, so the trigger markup stays light.
    const CELL_DD_OPTIONS = {
      category: refCategories,
      gender: REF_GENDERS,
      territory: REF_TERRITORY,
      tier: REF_TIERS,
      customerType: REF_CUSTOMER_TYPES,
    };
    const CELL_DD_PLACEHOLDER = {
      category: "Category…",
      gender: "Gender…",
      territory: "—",
      tier: "Tier…",
      customerType: "Type…",
    };
    function cellDropdown(i, field, value, extraClass) {
      const empty = !value;
      const ph = CELL_DD_PLACEHOLDER[field] || "—";
      const cls = (empty ? "is-empty " : "") + (extraClass || "");
      return `<div class="ste-cell-dd">
        <button class="ste-cell-input ste-cell-dd-trigger ${cls}" type="button" data-cell-dd-row="${i}" data-cell-dd-field="${escape(field)}">
          <span class="ste-cell-dd-label">${escape(value || ph)}</span>
          <span class="ste-cell-dd-chev" aria-hidden="true">▾</span>
        </button>
      </div>`;
    }
    function entryRowHtml(r, i) {
      const total = netSales(r);
      const mismatch = netMismatch(r);
      const unitNetHint = unitNetCalc(r);
      return `<tr>
        <td class="ste-cell-num ste-cell-mini-num">${i + 1}</td>
        <td><input class="ste-cell-input" data-row="${i}" data-field="season" value="${escape(r.season||'')}" placeholder="SS24"></td>
        <td><input class="ste-cell-input" data-row="${i}" data-field="invoiceNumber" value="${escape(r.invoiceNumber||'')}" placeholder="INV-1029"></td>
        <td>${cellDropdown(i, "category", r.category, r.category && !refCategories.includes(r.category) ? "ste-cell-warn" : "")}</td>
        <td>${cellDropdown(i, "gender", r.gender)}</td>
        <td><input class="ste-cell-input" data-row="${i}" data-field="sku" value="${escape(r.sku||'')}" placeholder="STM21139"></td>
        <td><input class="ste-cell-input" data-row="${i}" data-field="description" value="${escape(r.description||'')}" placeholder="Product description"></td>
        <td><input class="ste-cell-input" data-row="${i}" data-field="countryOfSale" value="${escape(r.countryOfSale||'')}" placeholder="UK"></td>
        <td>${cellDropdown(i, "territory", r.territory)}</td>
        <td><input class="ste-cell-input" data-row="${i}" data-field="customer" value="${escape(r.customer||r.account||'')}" placeholder="Customer name"></td>
        <td>${cellDropdown(i, "tier", r.tier)}</td>
        <td>${cellDropdown(i, "customerType", r.customerType || r.channel)}</td>
        <td><input class="ste-cell-input ste-cell-num" data-row="${i}" data-field="unitGross" type="number" min="0" step="0.01" value="${escape(r.unitGross||r.unitPrice||'')}" placeholder="0.00"></td>
        <td><input class="ste-cell-input ste-cell-num" data-row="${i}" data-field="deductions" type="number" min="0" step="0.01" value="${escape(r.deductions||r.discount||'')}" placeholder="0.00"></td>
        <td><input class="ste-cell-input ste-cell-num ${mismatch ? 'ste-cell-warn' : ''}" data-row="${i}" data-field="unitNet" type="number" min="0" step="0.01" value="${escape(r.unitNet||r.netEntered||'')}" placeholder="${unitNetHint > 0 ? fmt2(unitNetHint) : '0.00'}" ${mismatch ? `title="Doesn't match Unit Gross − Deductions (${fmt2(unitNetHint)})"` : ''}></td>
        <td><input class="ste-cell-input ste-cell-num" data-row="${i}" data-field="qty" type="number" min="0" value="${escape(r.qty||'')}" placeholder="0"></td>
        <td class="ste-cell-num ste-cell-calc" data-row-net="${i}">${total ? fmt2(total) : '<span class="ste-mini">—</span>'}</td>
        <td><button class="ste-row-rm-btn" type="button" data-rm-row="${i}" aria-label="Remove">×</button></td>
      </tr>`;
    }
    function paintTable() {
      const tbody = $("#ste-sales-tbody", root);
      if (!tbody) return;
      tbody.innerHTML = entryRows.map((r, i) => entryRowHtml(r, i)).join("");
      $$("[data-row]", tbody).forEach(cell => {
        const handler = () => {
          cell.classList.remove("ste-cell-err");
          // Selects flip their empty/filled appearance based on value, so the
          // placeholder option doesn't read as a real selection.
          if (cell.classList.contains("ste-cell-select")) {
            cell.classList.toggle("is-empty", !cell.value);
          }
          const idx = parseInt(cell.getAttribute("data-row"));
          const field = cell.getAttribute("data-field");
          entryRows[idx][field] = cell.value;
          const rr = entryRows[idx];
          // Auto-derive Unit Net when Unit Gross or Deductions changes and
          // Unit Net hasn't been hand-entered. Matches the ST template's
          // Q1 2026 tab formula (Unit Gross − Deductions).
          if ((field === "unitGross" || field === "deductions") && !rr.unitNet) {
            const hint = unitNetCalc(rr);
            if (hint > 0) {
              const netEl = tbody.querySelector(`[data-row="${idx}"][data-field="unitNet"]`);
              if (netEl) netEl.placeholder = fmt2(hint);
            }
          }
          // Update the Net Sales (row total) cell + mismatch flag on Unit Net.
          const total = netSales(rr);
          const totalCell = tbody.querySelector(`[data-row-net="${idx}"]`);
          if (totalCell) totalCell.innerHTML = total ? fmt2(total) : '<span class="ste-mini">—</span>';
          const netEl = tbody.querySelector(`[data-row="${idx}"][data-field="unitNet"]`);
          if (netEl) {
            const mm = netMismatch(rr);
            netEl.classList.toggle("ste-cell-warn", mm);
            if (mm) netEl.title = `Doesn't match Unit Gross − Deductions (${fmt2(unitNetCalc(rr))})`;
            else netEl.removeAttribute("title");
          }
          // Auto-append: when the user touches the last row (which is the
          // empty trailing one), spawn a new empty row beneath so they can
          // keep typing without clicking + Add row.
          if (idx === entryRows.length - 1 && !isEmpty(entryRows[idx])) {
            entryRows.push(emptyRow());
            paintTable();
            // Restore focus so the user's flow isn't interrupted
            const refocused = tbody.querySelector(`[data-row="${idx}"][data-field="${field}"]`);
            if (refocused) {
              const v = refocused.value;
              refocused.focus();
              refocused.setSelectionRange(v.length, v.length);
            }
            return;
          }
          paintTotals();
          saveDraft();
        };
        cell.addEventListener("input", handler);
        // Selects fire 'change' rather than 'input' on many browsers.
        if (cell.tagName === "SELECT") cell.addEventListener("change", handler);
      });
      $$("[data-rm-row]", tbody).forEach(b => b.addEventListener("click", () => {
        const idx = parseInt(b.getAttribute("data-rm-row"));
        entryRows.splice(idx, 1);
        if (entryRows.length === 0) entryRows.push(emptyRow());
        paintTable();
        saveDraft();
      }));
      // Custom in-cell dropdowns — click trigger to open the option panel.
      $$("[data-cell-dd-row]", tbody).forEach(trigger => {
        trigger.addEventListener("click", (e) => {
          e.stopPropagation();
          openCellDropdownPanel(trigger);
        });
      });
      paintTotals();
      paintEntryState();
    }

    // Open a custom in-cell dropdown panel anchored to the trigger. Uses
    // position:fixed so it sits above the scrollable table-wrap (which
    // would otherwise clip an absolutely-positioned child). Single panel
    // at a time — opening a new one closes any existing.
    function openCellDropdownPanel(trigger) {
      // Close anything already open.
      document.querySelectorAll(".ste-cell-dd-panel").forEach(p => p.remove());

      const i = parseInt(trigger.getAttribute("data-cell-dd-row"));
      const field = trigger.getAttribute("data-cell-dd-field");
      const options = CELL_DD_OPTIONS[field] || [];
      const current = entryRows[i] ? entryRows[i][field] : "";

      const rect = trigger.getBoundingClientRect();
      const panel = document.createElement("div");
      panel.className = "ste-cell-dd-panel";
      panel.style.position = "fixed";
      panel.style.top = (rect.bottom + 4) + "px";
      panel.style.left = rect.left + "px";
      panel.style.minWidth = rect.width + "px";
      panel.innerHTML = `
        ${current ? `<button class="ste-cell-dd-option ste-cell-dd-option-clear" type="button" data-dd-pick="">Clear</button>` : ''}
        ${options.map(o => `<button class="ste-cell-dd-option ${o === current ? 'is-current' : ''}" type="button" data-dd-pick="${escape(o)}">${escape(o)}</button>`).join("")}
      `;
      document.body.appendChild(panel);
      trigger.setAttribute("aria-expanded", "true");

      const close = () => {
        panel.remove();
        trigger.removeAttribute("aria-expanded");
        document.removeEventListener("mousedown", onAway, true);
        document.removeEventListener("keydown", onKey, true);
      };
      const onAway = (ev) => {
        if (panel.contains(ev.target) || trigger.contains(ev.target)) return;
        close();
      };
      const onKey = (ev) => { if (ev.key === "Escape") { ev.preventDefault(); close(); } };
      document.addEventListener("mousedown", onAway, true);
      document.addEventListener("keydown", onKey, true);

      panel.querySelectorAll("[data-dd-pick]").forEach(opt => {
        opt.addEventListener("click", (e) => {
          e.stopPropagation();
          const val = opt.getAttribute("data-dd-pick");
          if (!entryRows[i]) { close(); return; }
          entryRows[i][field] = val;
          // Reflect new value on the trigger without re-rendering the
          // whole table (keeps focus stable on the active row).
          trigger.classList.toggle("is-empty", !val);
          const lblEl = trigger.querySelector(".ste-cell-dd-label");
          if (lblEl) lblEl.textContent = val || (CELL_DD_PLACEHOLDER[field] || "—");
          // Category field carries a "warn" outline when the picked value
          // isn't in the canonical refCategories list — refresh the flag.
          if (field === "category") {
            const known = !val || refCategories.includes(val);
            trigger.classList.toggle("ste-cell-warn", !known);
          }
          close();
          // Auto-append empty row if the user filled the last one.
          if (i === entryRows.length - 1 && !isEmpty(entryRows[i])) {
            entryRows.push(emptyRow());
            paintTable();
          }
          paintTotals();
          saveDraft();
        });
      });
    }

    // Toggle the entry card between empty-state drop zone and populated
    // table view. A card with only the auto-seeded empty row counts as
    // "no rows yet" so the drop zone stays visible until something is
    // actually uploaded or the user clicks "Enter manually instead".
    function hasRealRows() {
      return entryRows.some(r => !isEmpty(r));
    }
    function paintEntryState() {
      const card = $("#ste-sales-entry-card", root);
      if (!card) return;
      const populated = hasRealRows() || card.dataset.userOpened === "1";
      card.dataset.hasRows = populated ? "true" : "false";
    }

    function saveDraft() {
      STE.mutate(s => {
        if (!s.currentStatement || s.currentStatement.licenseeId !== lic.id) {
          s.currentStatement = { licenseeId: lic.id };
        }
        s.currentStatement.rows = entryRows;
      });
    }

    paintTable();
    wireColResizers(root, "ste.salesColWidths.v1");
    // Show a real `title` tooltip on truncated column headers after a brief
    // hover delay — only when the label is actually clipped, so a hover on
    // a fully-visible header doesn't flash a redundant tooltip.
    wireTruncatedLabelTooltips(root, ".ste-sales-table .ste-th-lbl", 1500);

    // Import .xlsx / .csv fills the table
    const input = $("#ste-file-input", root);
    const browse = $("#ste-browse", root);
    if (browse) browse.addEventListener("click", () => input.click());
    if (input) input.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const label = $("#ste-file-label", root);
      if (label) label.textContent = `${file.name} · parsing…`;
      try {
        const parsed = await STEValidate.parseWorkbook(file);
        const pickKey = (r, keys) => { for (const k of keys) { if (r[k] != null && r[k] !== "") return r[k]; } return ""; };
        // Column aliases follow the ST Sales & Royalty Reporting Template
        // headers first, then fall back to the legacy AI-generated headers
        // so old downloads still import cleanly.
        entryRows = parsed.map(r => ({
          // Identity
          season: pickKey(r, ["Season","season"]),
          invoiceNumber: pickKey(r, ["Invoice Number","invoiceNumber","Invoice #"]),
          // Product
          category: pickKey(r, ["Product Category","category","Category"]),
          gender: pickKey(r, ["Gender","gender","Mens Womens Kids"]),
          sku: pickKey(r, ["International Style Code #","International Style Code #","SKU","Style Code","sku","International Style Code","International Style Code"]),
          description: pickKey(r, ["Product Description","description","Description","productName","Product Name","name"]),
          // Where + who
          countryOfSale: pickKey(r, ["Country of Sale","countryOfSale","Country"]),
          territory: pickKey(r, ['"In/Out" Territory','In/Out Territory','territory','In Out Territory']),
          currency: pickKey(r, ["Currency of Sale","currency","Sale Currency"]) || (lic.currency || "GBP"),
          customer: pickKey(r, ["Customer","customer","Account","account"]),
          tier: pickKey(r, ["Tier","tier"]),
          customerType: pickKey(r, ["Customer Type","customerType","Channel","channel"]),
          // Pricing per unit (ST template stores per-unit values; net sales auto-computes)
          unitGross: String(pickKey(r, ["Unit Invoice Gross Price","unitGross","Unit Wholesale","Unit Wholesale (GBP)","unitPrice","unit_price","price"])),
          deductions: String(pickKey(r, ["Allowable Deductions","deductions","Discount","discount","Discount (GBP)"])),
          unitNet: String(pickKey(r, ["Unit Invoice Price Net","unitNet","Net Unit","net","Net","Net (GBP)","netAmount","netEntered"])),
          // Volume + FX
          qty: String(pickKey(r, ["Units Sold","qty","quantity","Quantity","Qty"])),
          fx: String(pickKey(r, ["Exchange Rate","fx","FX","FX Used"])),
          // Legacy compat: empty (new shape doesn't carry these)
          date: pickKey(r, ["date","Date"]),
        }));
        if (label) label.textContent = `Loaded ${entryRows.length} rows from ${file.name}`;
        paintTable();
        saveDraft();
      } catch (err) {
        if (label) label.textContent = `Parse error: ${err.message}`;
      }
    });

    // "Enter manually instead" — opens the table view with the initial
    // empty row, so the licensee can key in line items without an upload.
    $("#ste-enter-manually", root)?.addEventListener("click", () => {
      const card = $("#ste-sales-entry-card", root);
      if (card) card.dataset.userOpened = "1";
      paintEntryState();
      // Drop focus into the first cell so the user can start typing.
      setTimeout(() => $("#ste-sales-tbody [data-row='0']", root)?.focus(), 0);
    });

    // Clear all — discard rows, fall back to a single empty row, and
    // collapse the entry card back to its drop-zone state.
    $("#ste-clear-all", root)?.addEventListener("click", () => {
      if (!confirm("Discard all current line items and start over?")) return;
      entryRows = [emptyRow()];
      const card = $("#ste-sales-entry-card", root);
      if (card) delete card.dataset.userOpened;
      const lbl = $("#ste-file-label", root);
      if (lbl) lbl.textContent = "";
      paintTable();
      saveDraft();
    });

    // Fullscreen toggle — flips the entry card into a full-viewport
    // overlay so the wide line-items table has room to breathe. CSS hides
    // the enter button + shows the X close button while in fullscreen.
    const setFullscreen = (on) => {
      const card = $("#ste-sales-entry-card", root);
      if (!card) return;
      card.classList.toggle("is-fullscreen", on);
      document.body.classList.toggle("ste-noscroll", on);
    };
    $("#ste-fullscreen-toggle", root)?.addEventListener("click", () => setFullscreen(true));
    $("#ste-fullscreen-close", root)?.addEventListener("click", () => setFullscreen(false));
    // ESC also exits fullscreen.
    const onEscFullscreen = (e) => {
      if (e.key !== "Escape") return;
      const card = $("#ste-sales-entry-card", root);
      if (card && card.classList.contains("is-fullscreen")) setFullscreen(false);
    };
    document.addEventListener("keydown", onEscFullscreen);

    // Drag-and-drop onto the table
    const dropZone = $("#ste-drop", root);
    if (dropZone) {
      ["dragover","dragenter"].forEach(ev => dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.add("drag-over"); }));
      ["dragleave","drop"].forEach(ev => dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.remove("drag-over"); }));
      dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        const f = e.dataTransfer.files[0];
        if (f) { input.files = e.dataTransfer.files; input.dispatchEvent(new Event("change")); }
      });
    }

    // Single CSV template — columns mirror the ST Sales & Royalty Reporting
    // Template's quarterly tab (Q1/Q2/Q3/Q4 sheets in the canonical .xlsx).
    // We don't ship the Summary/Instruction/Dropdown sheets — those derive
    // from contract data and parser logic. The importer accepts both .csv
    // and .xlsx (parser maps new + legacy aliases).
    function downloadCsvTemplate() {
      // Header order matches the ST template exactly. CSV-quoted because
      // several headers contain spaces, slashes, and ampersands.
      const header = [
        "QTR/YR",
        "Season",
        "Invoice Number",
        "Product Category",
        "Gender",
        "International Style Code #",
        "Product Description",
        "Country of Sale",
        "In/Out Territory",
        "Currency of Sale",
        "Customer",
        "Tier",
        "Customer Type",
        "Unit Invoice Gross Price",
        "Allowable Deductions",
        "Unit Invoice Price Net",
        "Units Sold",
        "Net Sales in Currency of Sale",
        "Exchange Rate",
        "Net Sales in Currency of Contract",
      ].map(h => `"${h}"`).join(",");
      // Two example rows in the real Sergio-Tacchini-template format.
      const rows = [
        ['Q1 2026','SS24','INV-1029','TRACKTOP','Mens','STM21139','TRACK TOP','UK','In','GBP','ST009 - StandOut Ltd T/A','Tier1','Wholesale',19.6,0,19.6,1,19.6,1.1424,22.39],
        ['Q1 2026','SS24','INV-1030','POLO','Womens','STW42118','TENNIS POLO','FR','In','EUR','Le Bon Marché','Tier1','Wholesale',32.5,2.5,30,4,120,1,120],
      ].map(r => r.map(v => typeof v === 'string' ? `"${v.replace(/"/g,'""')}"` : v).join(","));
      const csv = [header, ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `STE_Sales_Statement_template.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    }
    $("#ste-download-template", root)?.addEventListener("click", downloadCsvTemplate);
    const dlSample = $("#ste-download-sample", root);
    if (dlSample) dlSample.addEventListener("click", downloadCsvTemplate);

    // Add row
    $("#ste-sales-add-row", root)?.addEventListener("click", () => {
      entryRows.push(emptyRow());
      paintTable();
      saveDraft();
    });

    // Save Draft
    $("#ste-sales-save-draft", root)?.addEventListener("click", () => {
      saveDraft();
      STEApp.toast("Draft saved", "info");
    });

    // Preview & Submit — switches the page into a full-page preview view.
    const submitHandler = () => {
      // Clear any previously-flagged errors before re-validating.
      root.querySelectorAll(".ste-cell-err").forEach(el => el.classList.remove("ste-cell-err"));
      const tbody = root.querySelector("#ste-sales-tbody") || root.querySelector("tbody");
      const errors = [];
      // Per-row validation: every row that has any value must have SKU + net > 0.
      // Empty rows are skipped (they're placeholders).
      entryRows.forEach((r, i) => {
        const hasAnyValue = !!(r.sku || r.description || r.qty || r.unitPrice || r.gross || r.netEntered || r.discount || r.account || r.unitGross || r.unitNet || r.deductions || r.customer);
        if (!hasAnyValue) return;
        if (!r.sku) {
          const cell = tbody?.querySelector(`[data-row="${i}"][data-field="sku"]`);
          if (cell) cell.classList.add("ste-cell-err");
          errors.push({ row: i, field: "sku", msg: `Row ${i + 1}: Style Code is required` });
        }
        if (!(_netOf(r) > 0)) {
          const cell = tbody?.querySelector(`[data-row="${i}"][data-field="netEntered"]`)
            || tbody?.querySelector(`[data-row="${i}"][data-field="gross"]`);
          if (cell) cell.classList.add("ste-cell-err");
          errors.push({ row: i, field: "net", msg: `Row ${i + 1}: Net Amount must be greater than 0` });
        }
      });
      const valid = entryRows.filter(r => r.sku && _netOf(r) > 0);
      if (!valid.length) {
        if (errors.length === 0) {
          STEApp.toast("Add at least one line item with Style Code and Net Amount", "warn");
        } else {
          // Scroll the first error cell into view.
          const firstErr = root.querySelector(".ste-cell-err");
          if (firstErr) {
            const sectionHd = root.querySelector(".ste-section-hd");
            const globalHd = document.querySelector(".header");
            const stickyH = (globalHd?.offsetHeight || 56) + (sectionHd?.offsetHeight || 80);
            const desiredTop = window.scrollY + firstErr.getBoundingClientRect().top - stickyH - 24;
            window.scrollTo({ top: Math.max(0, desiredTop), behavior: "smooth" });
            setTimeout(() => firstErr.focus({ preventScroll: true }), 350);
          }
          STEApp.toast(errors[0].msg, "warn");
        }
        return;
      }
      const qSelEl = $("#ste-quarter-select", root);
      const quarter = (qSelEl && qSelEl.value) || "Q1 2026";
      _salesPreview = { licId: lic.id, quarter, rows: valid, allRows: entryRows.slice() };
      sales();  // re-render in preview mode
      window.scrollTo(0, 0);
    };
    $("#ste-sales-submit-top", root)?.addEventListener("click", submitHandler);
    $("#ste-sales-submit", root)?.addEventListener("click", submitHandler);
  }
  let _salesPreview = null;
  let _salesDraftCarry = null;  // one-shot row buffer used to restore the form on "Back from preview"
  let _agreementDraftPrefill = null;  // one-shot prefill for New Agreement form, set by row-menu actions
  let _agreementEditId = null;        // when set, the draft form is in edit mode for this contract id
  let _agreementCounterPropose = false;  // when true alongside _agreementEditId, saving the edit form sends a counter-proposal instead of a plain edit
  const _expandedAgreementIds = new Set();  // master contract IDs currently expanded in the list
  // Insights-loaded flag — first render of the draft page shows a spinner for
  // ~1.4s, then swaps in the real AI Insights card. Keyed by priorContract id
  // so each renewal gets its own one-time analysis loading state.
  const _insightsAnalyzed = new Set();

  // Module-scope helpers — re-used by submission form, preview, and view.
  function _calcDiscount(r) {
    const gross = parseFloat(r.gross) || 0;
    const pct = parseFloat(r.discountPct) || 0;
    return gross > 0 && pct > 0 ? (gross * pct / 100) : 0;
  }
  function _calcNet(r) {
    const gross = parseFloat(r.gross) || 0;
    const disc = parseFloat(r.discount) || _calcDiscount(r) || 0;
    return Math.max(0, gross - disc);
  }
  // Per-unit net: honour an entered Unit Net, else Unit Gross − Deductions.
  function _unitNetOf(r) {
    const entered = parseFloat(r.unitNet);
    if (entered > 0) return entered;
    const g = parseFloat(r.unitGross) || 0;
    const d = parseFloat(r.deductions) || 0;
    return g > 0 ? Math.max(0, g - d) : 0;
  }
  function _netOf(r) {
    // Current grid + CSV import schema: row total = Units Sold x per-unit Net.
    const qty = parseFloat(r.qty) || 0;
    const un = _unitNetOf(r);
    if (qty > 0 && un > 0) return qty * un;
    // Legacy line-total schema fallbacks.
    const entered = parseFloat(r.netEntered);
    if (entered) return entered;
    return _calcNet(r) || parseFloat(r.netAmount) || 0;  // netAmount: legacy field
  }
  function _netMismatch(r) {
    const entered = parseFloat(r.netEntered);
    if (!entered) return false;
    return Math.abs(entered - _calcNet(r)) > 0.01;
  }

  // Derive tier / country / gender from existing row fields for the breakdown
  // charts on the statement preview + detail pages. Demo data doesn't carry
  // these as first-class columns, so we infer:
  //  - Tier from unit price (premium / mid / entry bands)
  //  - Country from a known account → country map, falling back to the
  //    licensee's home country
  //  - Gender from the product description / name keywords
  function _tierOf(r) {
    // Prefer the explicit tier the user picked on the row (normalized to the
    // "Tier N" form to absorb legacy "Tier1" style values). Fall back to the
    // unit-price band for legacy rows that never carried an explicit tier.
    const raw = (r.tier || "").trim();
    if (raw) {
      const m = /^Tier\s*(\d+)$/i.exec(raw);
      if (m) return "Tier " + parseInt(m[1], 10);
      if (raw === "ST Online" || raw === "Other") return raw;
    }
    const unit = parseFloat(r.unitPrice) || (parseFloat(r.gross) / Math.max(1, parseFloat(r.qty) || 1));
    if (!unit) return "Tier 2";
    if (unit >= 100) return "Tier 1";
    if (unit >= 50) return "Tier 2";
    return "Tier 3";
  }
  const _ACCOUNT_COUNTRY = {
    "Harrods": "UK", "Selfridges": "UK", "John Lewis": "UK", "Liberty London": "UK", "ASOS": "UK",
    "Galeries Lafayette": "FR", "Printemps": "FR", "Le Bon Marché": "FR",
    "El Corte Inglés": "ES", "ZALANDO": "DE", "Breuninger": "DE", "KaDeWe": "DE",
    "La Rinascente": "IT", "Brown Thomas": "IE", "De Bijenkorf": "NL",
  };
  function _countryOf(r, lic) {
    const acc = (r.account || "").trim();
    if (_ACCOUNT_COUNTRY[acc]) return _ACCOUNT_COUNTRY[acc];
    // Substring match for accounts like "Harrods Knightsbridge"
    for (const key of Object.keys(_ACCOUNT_COUNTRY)) {
      if (acc.toLowerCase().includes(key.toLowerCase())) return _ACCOUNT_COUNTRY[key];
    }
    return (lic && (lic.country || (lic.address && lic.address.country))) || "Other";
  }
  function _genderOf(r) {
    const n = ((r.description || r.name || "") + " " + (r.sku || "")).toLowerCase();
    if (/\b(mens|men's|men |male)\b/.test(n) || / m-(s|m|l|xl)\b/.test(n)) return "Men";
    if (/\b(womens|women's|women |female|ladies)\b/.test(n) || / w-(s|m|l|xl)\b/.test(n)) return "Women";
    if (/\b(kids|junior|youth|girls|boys)\b/.test(n)) return "Kids";
    return "Unisex";
  }

  // Render the rows for a single breakdown — label · amount · percentage,
  // no bar graph. `sort` "fixed" preserves the buckets object's insertion
  // order (used for Tier 1 → 2 → 3); default sorts by amount descending.
  function renderBreakdownList(buckets, currency, sort) {
    // For tier breakdown (sort === "fixed") we keep zero-valued rows visible
    // so users see every Tier 0..N — the auto-fill makes coverage obvious.
    const allEntries = Object.entries(buckets);
    let entries = sort === "fixed" ? allEntries : allEntries.filter(([, v]) => v > 0);
    if (sort !== "fixed") entries.sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
    if (entries.length === 0) {
      return `<div class="ste-stmt-breakdown-list"><span class="ste-mini">No sales</span></div>`;
    }
    return `
      <div class="ste-stmt-breakdown-list">
        ${entries.map(([k, v]) => {
          const pct = (v / total) * 100;
          const isZero = !v;
          return `
            <div class="ste-stmt-breakdown-row${isZero ? ' is-zero' : ''}">
              <span class="ste-stmt-breakdown-label">${escape(k)}</span>
              <span class="ste-stmt-breakdown-amt">${escape(currency)} ${Math.round(v).toLocaleString()}</span>
              <span class="ste-stmt-breakdown-pct">${pct.toFixed(1)}%</span>
            </div>`;
        }).join("")}
      </div>`;
  }

  // Compliance check — every line item can carry up to three violations:
  //   territory  — sold outside the licensee's licensed market(s)
  //   product    — SKU not approved for this season in Design Review
  //   account    — sold to a retail account not on the approved list
  // A row may carry one, multiple, or none. For the prototype we pair
  // explicit demo overrides per filing with a hash fallback so any statement
  // surfaces a believable mix of issues.
  const _VIOLATION_META = {
    territory: { short: "TERRITORY",  long: "Sold out of licensed territory",      tone: "ter" },
    product:   { short: "PRODUCT",    long: "Product not approved in Design Review", tone: "pro" },
    account:   { short: "ACCOUNT",    long: "Sold to an account not on the approved list", tone: "acc" },
  };
  const _DEMO_VIOLATIONS_BY_QUARTER = {
    // Best of Britain Ltd · Q1 2026 — covers all combinations for the demo
    "Q1 2026": {
      "des_84dfccf8": ["territory"],
      "des_ee259e7e": ["product"],
      "des_19efa3a1": ["account"],
      "STM26HD-005":  ["territory", "product", "account"],
    },
  };
  function _violationsOf(r, season) {
    const sku = (r.sku || "").trim();
    if (!sku) return [];
    const demoMap = _DEMO_VIOLATIONS_BY_QUARTER[season];
    if (demoMap && demoMap[sku]) return demoMap[sku].slice();
    // Hash fallback per violation type. Different salts so a SKU might trip
    // one check but not the others.
    const hashed = (salt) => {
      const key = sku + "::" + (season || "") + "::" + salt;
      let h = 0;
      for (let i = 0; i < key.length; i++) h = ((h << 5) - h + key.charCodeAt(i)) | 0;
      return Math.abs(h);
    };
    const list = [];
    if (hashed("territory") % 14 === 0) list.push("territory");
    if (hashed("product")   % 8  === 0) list.push("product");
    if (hashed("account")   % 12 === 0) list.push("account");
    return list;
  }
  // Back-compat shim — anywhere that just needs a boolean violation flag.
  function _isSkuUnapproved(r, season) {
    return _violationsOf(r, season).length > 0;
  }

  // Build all three breakdowns (tier / country / gender) and render them in
  // a 3-column row inside one form-section. Tier order is fixed (1, 2, 3);
  // country and gender sort by net amount descending.
  function renderSalesBreakdowns(rows, lic) {
    const cur = (lic && lic.currency) || "GBP";
    // First pass — accumulate tier totals as users entered them. Numeric tiers
    // ("Tier 0", "Tier 1", …) and the fixed buckets ("ST Online", "Other") are
    // collected separately so we can auto-fill gaps in the numeric ladder.
    const numericTotals = {};   // { 0: amount, 2: amount, … }
    const extraTotals = {};     // { "ST Online": amount, "Other": amount }
    const byCountry = {}, byGender = {};
    rows.forEach(r => {
      const net = _netOf(r);
      if (!net) return;
      const t = _tierOf(r);
      const m = /^Tier\s*(\d+)$/.exec(t);
      if (m) {
        const n = parseInt(m[1], 10);
        numericTotals[n] = (numericTotals[n] || 0) + net;
      } else {
        extraTotals[t] = (extraTotals[t] || 0) + net;
      }
      const c = _countryOf(r, lic); byCountry[c] = (byCountry[c] || 0) + net;
      const g = _genderOf(r);       byGender[g]  = (byGender[g]  || 0) + net;
    });
    // Auto-fill missing tiers — if anyone reported anything in Tier 0..N,
    // every tier from 0 up to the max gets a row, zero-valued when absent.
    // This matches the meeting decision: users skip tiers (front, middle,
    // back) and the form fills the missing ones.
    const byTier = {};
    const reportedTiers = Object.keys(numericTotals).map(n => parseInt(n, 10));
    if (reportedTiers.length) {
      const maxTier = Math.max(...reportedTiers);
      for (let i = 0; i <= maxTier; i++) {
        byTier["Tier " + i] = numericTotals[i] || 0;
      }
    }
    Object.keys(extraTotals).forEach(k => { byTier[k] = extraTotals[k]; });
    return `
      <div class="ste-stmt-breakdowns">
        <div class="ste-form-section ste-stmt-breakdown-col">
          <div class="ste-form-section-hd"><h3>Net Sales by Tier</h3></div>
          ${renderBreakdownList(byTier, cur, "fixed")}
        </div>
        <div class="ste-form-section ste-stmt-breakdown-col">
          <div class="ste-form-section-hd"><h3>Net Sales by Country</h3></div>
          ${renderBreakdownList(byCountry, cur)}
        </div>
        <div class="ste-form-section ste-stmt-breakdown-col">
          <div class="ste-form-section-hd"><h3>Net Sales by Gender</h3></div>
          ${renderBreakdownList(byGender, cur)}
        </div>
      </div>`;
  }

  // Column-resizer wiring for any table marked .ste-resizable-table inside
  // `root`. The colgroup is the source of truth for widths; resizer spans
  // sit on the right edge of each <th>. Widths persist per-table under
  // `storageKey` so they survive navigation.
  // Attach a delayed-tooltip handler to every element matching `selector`
  // inside `root`. The tooltip fires only when the element's text content
  // is clipped (scrollWidth > clientWidth), and only after the user has
  // hovered for `delayMs`. Sets the native `title` attribute lazily so
  // the browser handles the actual tooltip rendering.
  function wireTruncatedLabelTooltips(root, selector, delayMs) {
    Array.from(root.querySelectorAll(selector)).forEach(el => {
      let timer = null;
      el.addEventListener("mouseenter", () => {
        // Only arm the timer when the label is actually truncated.
        const truncated = el.scrollWidth > el.clientWidth + 1;
        el.removeAttribute("title");
        if (!truncated) return;
        timer = setTimeout(() => {
          el.title = (el.textContent || "").trim();
        }, delayMs);
      });
      el.addEventListener("mouseleave", () => {
        if (timer) { clearTimeout(timer); timer = null; }
        el.removeAttribute("title");
      });
    });
  }

  function wireColResizers(root, storageKey) {
    const table = root.querySelector(".ste-resizable-table");
    if (!table) return;
    const cols = Array.from(table.querySelectorAll("colgroup > col"));
    const resizers = Array.from(table.querySelectorAll("th .ste-col-resizer"));
    // Capture each column's authored default width BEFORE any saved/manual
    // widths are applied, so a dblclick reset can restore the original
    // value. Without this, `col.style.width = ""` would remove the column
    // width entirely and the column visually collapses.
    const defaultWidths = cols.map(c => c.style.width || "");
    // Restore saved widths
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (saved && typeof saved === "object") {
        cols.forEach(c => {
          const k = c.getAttribute("data-key");
          if (k && saved[k]) c.style.width = saved[k] + "px";
        });
      }
    } catch (e) { /* ignore */ }
    function persist() {
      const m = {};
      cols.forEach(c => {
        const k = c.getAttribute("data-key");
        if (k) m[k] = c.getBoundingClientRect().width;
      });
      try { localStorage.setItem(storageKey, JSON.stringify(m)); } catch (e) {}
    }
    resizers.forEach(r => {
      r.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const idx = parseInt(r.getAttribute("data-col"));
        const col = cols[idx];
        if (!col) return;
        const startX = e.clientX;
        const startW = col.getBoundingClientRect().width;
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
        function onMove(ev) {
          const dx = ev.clientX - startX;
          const w = Math.max(36, Math.round(startW + dx));
          col.style.width = w + "px";
        }
        function onUp() {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
          document.body.style.cursor = "";
          document.body.style.userSelect = "";
          persist();
        }
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      });
      // Double-click resets that column to its authored default. Restoring
      // the captured value (rather than clearing the style) keeps the
      // column from collapsing to zero width under a fixed table layout.
      r.addEventListener("dblclick", (e) => {
        const idx = parseInt(r.getAttribute("data-col"));
        const col = cols[idx];
        if (!col) return;
        col.style.width = defaultWidths[idx] || "";
        persist();
      });
    });
  }

  // Read-only view of a previously-submitted statement.
  function renderSalesView(root, licId, quarterSlug, preResolvedStmt) {
    const state = STE.get();
    // When called via the new #/sales/details/{id} route we already have the
    // statement object; otherwise fall back to (licenseeId, quarter) lookup.
    let stmt = preResolvedStmt || null;
    if (!stmt && quarterSlug) {
      // Accept either "Q1-2026" or "2026-Q1" slug formats.
      const dashed = String(quarterSlug);
      const fwd = dashed.replace(/-/g, " "); // "Q1 2026" if input was "Q1-2026"
      const rev = (() => {
        const m = dashed.match(/^(\d{4})-Q(\d)$/i);
        return m ? `Q${m[2]} ${m[1]}` : null;
      })();
      stmt = (state.salesStatements || []).find(s => s.licenseeId === licId && (s.quarter === fwd || s.quarter === rev));
    }
    const lic = stmt ? (state.licensees || []).find(l => l.id === stmt.licenseeId) : (state.licensees || []).find(l => l.id === licId);
    // Per-user "new" row dot — clear it once the user opens the detail.
    if (stmt && window.STEUnread) {
      try { STEUnread.markSeen("stmt", stmt.id); } catch (_) {}
    }
    if (!lic || !stmt) {
      root.innerHTML = `
        <div class="ste-screen-pad">
          <div class="ste-section-hd">
            <div class="ste-page-crumbs"><a href="#/sales-statements">Sales Statements</a><span class="sep">/</span><span class="cur">Not found</span></div>
            <h1>Statement not found</h1>
            <p>The filing for <code class="ste-code">${escape(licId || '—')}</code>${quarterSlug ? ' · <code class="ste-code">'+escape(quarterSlug)+'</code>' : ''} is no longer on file.</p>
          </div>
        </div>`;
      return;
    }
    licId = lic.id;
    // Comparison: this one + 3 priors
    const allForLic = (state.salesStatements || [])
      .filter(s => s.licenseeId === licId)
      .sort((a,b) => (b.submittedAt||"").localeCompare(a.submittedAt||""));
    const idx = allForLic.findIndex(s => s.id === stmt.id);
    const priors = allForLic.slice(idx + 1, idx + 4);
    const columns = [
      { quarter: stmt.quarter, sales: stmt.totalSalesGbp || 0, royalty: stmt.royaltyGbp || 0, isCurrent: true },
      ...priors.map(p => ({ quarter: p.quarter, sales: p.totalSalesGbp || 0, royalty: p.royaltyGbp || 0, isCurrent: false })),
    ];
    function delta(a, b) { if (b == null || b === 0) return null; return ((a - b) / b) * 100; }

    const statusTone =
      stmt.status === "Invoiced" || stmt.status === "Paid" ? "ok" :
      stmt.status === "Rejected" ? "err" :
      stmt.status === "Pending Review" ? "warn" : "info";
    const isHQUser = STE.isHQ(STE.currentUser());
    const decided = ["Invoiced","Paid","Rejected"].includes(stmt.status);

    root.innerHTML = `
      <div class="ste-screen-pad">
        <div class="ste-section-hd">
          <div class="ste-page-crumbs">
            <a href="#/${STE.isHQ() ? 'hq' : 'home'}">Home</a><span class="sep">/</span>
            <a href="#/sales">Sales Statements</a><span class="sep">/</span>
            <span class="cur">${escape(stmt.id)}</span>
            ${stmt.submittedAt ? `<p class="ste-hd-meta">Submitted ${escape(new Date(stmt.submittedAt).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}))}</p>` : ''}
          </div>
          <div class="ste-page-hd-row">
            <div>
              <h1>${escape(stmt.id)}</h1>
              <p class="ste-page-subtitle">
                ${escape(qDisplay(stmt.quarter))}${isHQUser ? ` · ${escape(lic.legalName)}` : ''}
              </p>
            </div>
            <div class="ste-hd-cta" style="display:flex;gap:8px;align-items:center">
                <a class="ste-btn ste-btn-ghost ste-btn-cancel" href="#/sales" data-act="cancel-view">Back</a>
                <span class="ste-badge ste-badge-${statusTone}">${escape(stmt.status || '—')}</span>
                ${stmt.invoice ? `
                  <a class="ste-btn ste-btn-primary" href="#/invoices/details/view/${encodeURIComponent(stmt.id)}">View Invoice</a>
                ` : ''}
                ${(!isHQUser && stmt.status === "Rejected") ? `
                  <button class="ste-btn ste-btn-primary" data-act="resubmit-clone">Resubmit (cloned)</button>
                ` : ''}
                ${isHQUser ? (
                  stmt.status === "Rejected" ? `
                    <button class="ste-btn ste-btn-ghost" data-act="reopen-stmt">Reopen for Review</button>
                  ` : stmt.status === "Pending Review" ? `
                    <div class="ste-btn-group" role="group" aria-label="Decision">
                      <button class="ste-btn ste-btn-ghost" data-act="reject-stmt">Reject</button>
                      <button class="ste-btn ste-btn-primary" data-act="approve-stmt">Approve</button>
                    </div>
                  ` : ''
                ) : ''}
              </div>
          </div>
        </div>

        ${(() => {
          const rowsWithV = (stmt.rows || []).map(r => ({ r, v: _violationsOf(r, stmt.quarter) }))
            .filter(x => x.v.length > 0);
          if (rowsWithV.length === 0) return "";
          const totalNet = rowsWithV.reduce((s, x) => s + _netOf(x.r), 0);
          const cur = (lic && lic.currency) || "GBP";
          const countBy = (kind) => rowsWithV.filter(x => x.v.includes(kind)).length;
          const counts = {
            territory: countBy("territory"),
            product:   countBy("product"),
            account:   countBy("account"),
          };
          const lines = [];
          if (counts.territory) lines.push(`<li><strong class="ste-stmt-v-ter">${counts.territory}</strong> sold out of licensed territory</li>`);
          if (counts.product)   lines.push(`<li><strong class="ste-stmt-v-pro">${counts.product}</strong> use products not approved in Design Review</li>`);
          if (counts.account)   lines.push(`<li><strong class="ste-stmt-v-acc">${counts.account}</strong> sold to accounts not on the approved list</li>`);
          return `
            <div class="ste-stmt-unappr-bar">
              <span class="ste-stmt-unappr-icon" aria-hidden="true">⚠</span>
              <div class="ste-stmt-unappr-text">
                <strong>${rowsWithV.length} line item${rowsWithV.length===1?' has':'s have'} issues for ${escape(qDisplay(stmt.quarter))}.</strong>
                <ul class="ste-stmt-unappr-list">${lines.join("")}</ul>
                <span>Total net affected: ${escape(cur)} ${Math.round(totalNet).toLocaleString()}. Each row is flagged in the Line Items table below.</span>
              </div>
            </div>`;
        })()}

        <div class="ste-form-card">
          <div class="ste-form-section">
            <div class="ste-form-section-hd"><h3>Comparison</h3><span class="ste-mini">This filing vs prior quarters</span></div>
            <table class="ste-table ste-cmp-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  ${columns.map(c => `<th class="${c.isCurrent ? 'ste-cmp-current' : ''}">${escape(qDisplay(c.quarter))}${c.isCurrent ? ' <span class="ste-cmp-tag">This filing</span>' : ''}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Net Sales</strong></td>
                  ${columns.map((c, i) => {
                    const d = i > 0 ? delta(columns[i-1].sales, c.sales) : null;
                    const dLbl = d == null ? '' : `<div class="ste-mini" style="color:${d>=0?'var(--st-green)':'var(--st-err)'}">${d>=0?'+':''}${d.toFixed(1)}% vs prior</div>`;
                    return `<td class="${c.isCurrent ? 'ste-cmp-current' : ''}"><strong>${escape(lic.currency)} ${Math.round(c.sales).toLocaleString()}</strong>${c.isCurrent ? dLbl : ''}</td>`;
                  }).join("")}
                </tr>
                <tr>
                  <td><strong>Royalty (10%)</strong></td>
                  ${columns.map((c, i) => {
                    const d = i > 0 ? delta(columns[i-1].royalty, c.royalty) : null;
                    const dLbl = d == null ? '' : `<div class="ste-mini" style="color:${d>=0?'var(--st-green)':'var(--st-err)'}">${d>=0?'+':''}${d.toFixed(1)}% vs prior</div>`;
                    return `<td class="${c.isCurrent ? 'ste-cmp-current' : ''}"><strong>${escape(lic.currency)} ${Math.round(c.royalty).toLocaleString()}</strong>${c.isCurrent ? dLbl : ''}</td>`;
                  }).join("")}
                </tr>
              </tbody>
            </table>
          </div>

          ${Array.isArray(stmt.rows) && stmt.rows.length ? (() => {
            return `
              ${renderSalesBreakdowns(stmt.rows, lic)}
              <div class="ste-form-section">
                <div class="ste-form-section-hd"><h3>Line Items</h3><span class="ste-mini">${stmt.rows.length} line${stmt.rows.length===1?'':'s'}</span></div>
                <table class="ste-table">
                  <thead><tr><th>Date</th><th>Style Code</th><th>Product Name</th><th>Category</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit</th><th style="text-align:right">Gross</th><th style="text-align:right">Disc</th><th style="text-align:right">Net</th><th>Account</th><th>Channel</th></tr></thead>
                  <tbody>
                    ${stmt.rows.filter(r => r.sku || _netOf(r)).map(r => {
                      const v = _violationsOf(r, stmt.quarter);
                      const hasV = v.length > 0;
                      const titles = v.map(t => _VIOLATION_META[t].long).join(" · ");
                      const tags = v.map(t => {
                        const m = _VIOLATION_META[t];
                        return `<span class="ste-stmt-v-tag ste-stmt-v-${m.tone}" title="${escape(m.long)}">⚠ ${escape(m.short)}</span>`;
                      }).join("");
                      return `
                      <tr class="${hasV ? 'ste-stmt-row-unappr' : ''}" ${hasV ? `title="${escape(titles)}"` : ''}>
                        <td><span class="ste-mini">${escape(r.date||'—')}</span></td>
                        <td>
                          <code class="ste-code">${escape(r.sku||'')}</code>
                          ${tags}
                        </td>
                        <td>${escape(r.description||'')}</td>
                        <td>${escape(r.category||'')}</td>
                        <td style="text-align:right">${(parseFloat(r.qty)||0).toLocaleString()}</td>
                        <td style="text-align:right">${(parseFloat(r.unitPrice)||parseFloat(r.unitGross)||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                        <td style="text-align:right">${(parseFloat(r.gross)||((parseFloat(r.qty)||0)*(parseFloat(r.unitGross)||0))||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                        <td style="text-align:right">${((parseFloat(r.discount)||_calcDiscount(r))||((parseFloat(r.qty)||0)*(parseFloat(r.deductions)||0))||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                        <td style="text-align:right"><strong>${_netOf(r).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></td>
                        <td>${escape(r.account||r.customer||'')}</td>
                        <td>${escape(r.channel||r.customerType||'')}</td>
                      </tr>`;
                    }).join("")}
                  </tbody>
                </table>
              </div>`;
          })() : `
          <div class="ste-form-section">
            <div class="ste-empty" style="padding:24px;color:var(--ste-muted)">Line-item detail isn't stored for this filing.</div>
          </div>`}

          ${stmt.invoice ? renderInvoiceCard(stmt.invoice, lic) : ''}

          ${stmt.fileName ? `
          <div class="ste-form-section">
            <div class="ste-form-section-hd"><h3>Attachments</h3></div>
            <div class="ste-attachments-list">
              <a class="ste-attachment-row" href="#" data-act="open-attachment" title="${escape(stmt.fileName)}">
                <span class="ste-attachment-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </span>
                <span class="ste-attachment-name">${escape(stmt.fileName)}</span>
              </a>
            </div>
          </div>` : ''}

          <div class="ste-form-section">
            <div class="ste-form-section-hd"><h3>Comments</h3><span class="ste-mini">${(stmt.comments||[]).length} message${(stmt.comments||[]).length===1?'':'s'} between licensee and HQ</span></div>
            <div class="ste-stmt-comments">
              ${(stmt.comments||[]).length === 0
                ? `<div class="ste-mini" style="padding:14px;color:var(--ste-muted)">No comments yet. Use the box below to send a message about this filing.</div>`
                : (stmt.comments||[]).map(c => `
                  <div class="ste-stmt-comment ${c.kind==='approve'?'ste-stmt-comment-approve':c.kind==='reject'?'ste-stmt-comment-reject':''}">
                    <div class="ste-stmt-comment-hd">
                      <strong>${escape(c.author||'')}</strong>
                      <span class="ste-mini">· ${escape(c.role||'')}</span>
                      <span class="ste-mini">· ${escape((c.at||'').slice(0,16).replace('T',' '))}</span>
                      ${c.kind==='approve' ? '<span class="ste-stmt-comment-tag ste-stmt-comment-tag-ok">Approved</span>' : c.kind==='reject' ? '<span class="ste-stmt-comment-tag ste-stmt-comment-tag-err">Rejected</span>' : ''}
                    </div>
                    <div class="ste-stmt-comment-body">${escape(c.body||'')}</div>
                  </div>`).join("")}
            </div>
            <div class="ste-stmt-comment-add">
              <textarea class="ste-input" rows="3" id="ste-stmt-comment-input" placeholder="${isHQUser ? 'Message the licensee — questions about line items, deadlines, follow-ups…' : 'Message HQ — flag corrections, add context, ask a question…'}"></textarea>
              <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px">
                <button class="ste-btn ste-btn-primary" data-act="add-stmt-comment">Post Comment</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;

    // Generate Invoice — creates a self-contained invoice attached to the
    // approved sales statement. Both HQ and the licensee can then download
    // it. Only available when the statement is Ready for Invoicing AND no
    // invoice yet.
    root.querySelector('[data-act="generate-invoice"]')?.addEventListener("click", () => {
      const invoice = generateInvoiceFor(stmt, lic);
      if (!invoice) return;
      STEApp.toast(`Invoice ${invoice.number} created — ${lic.legalName} notified by email and in-app.`, "success");
      // Second toast a moment later so the licensee-notification message is
      // visible even after the navigation below.
      setTimeout(() => {
        STEApp.toast(`Notification sent to ${lic.legalName} — they can now download and pay the invoice.`, "info");
      }, 600);
      location.hash = `#/invoices/details/view/${encodeURIComponent(stmt.id)}`;
    });


    // Approve / Reject / Reopen — status transitions on the sales statement.
    // Each decision also drops a comment in the thread so the audit trail is
    // visible to both sides.
    function transitionStatus(newStatus, kind, defaultMsg) {
      const u = STE.currentUser();
      const role = u?.title || (isHQUser ? "HQ Reviewer" : "Licensee");
      const commentInp = root.querySelector("#ste-stmt-comment-input");
      const note = (commentInp?.value || "").trim();
      const body = note || defaultMsg;
      STE.mutate(s => {
        const target = (s.salesStatements || []).find(x => x.id === stmt.id);
        if (!target) return;
        target.status = newStatus;
        target.decision = kind;
        target.decisionAt = new Date().toISOString();
        target.decisionBy = u?.name || "HQ Reviewer";
        target.comments = target.comments || [];
        target.comments.push({
          author: u?.name || "HQ Reviewer",
          role,
          at: new Date().toISOString(),
          body, kind,
        });
      });
      STEApp.toast(
        kind === "approve" ? `${qDisplay(stmt.quarter)} statement approved — royalty generation available.`
        : kind === "reject" ? `${qDisplay(stmt.quarter)} statement rejected — licensee notified with comment.`
        : `${qDisplay(stmt.quarter)} statement reopened for review.`,
        kind === "approve" ? "success" : kind === "reject" ? "warn" : "info",
      );
      // Re-render to reflect new status + cleared comment input
      renderSalesView(root, licId, quarterSlug);
    }
    root.querySelector('[data-act="approve-stmt"]')?.addEventListener("click", () => {
      // Approval now invoices immediately — the "Ready for Invoicing" holding
      // state is gone. transitionStatus stamps the approval comment and sets
      // status to "Invoiced"; generateInvoiceFor then attaches the actual
      // invoice record (and harmlessly re-asserts the status).
      transitionStatus("Invoiced", "approve", "Approved — net sales and royalty figures reconcile. Invoice generated.");
      const fresh = (STE.get().salesStatements || []).find(s => s.id === stmt.id);
      if (fresh && !fresh.invoice) {
        const invoice = generateInvoiceFor(fresh, lic);
        if (invoice) {
          STEApp.toast(`Invoice ${invoice.number} created — ${lic.legalName} notified.`, "success");
        }
      }
    });
    // Resubmit (cloned) — copies the rejected statement's rows into a
    // fresh draft and navigates to the Submit New Statement form. The
    // form's loader reads _salesDraftCarry on first paint.
    root.querySelector('[data-act="resubmit-clone"]')?.addEventListener("click", () => {
      _salesDraftCarry = {
        licId: stmt.licenseeId,
        rows: (stmt.rows || []).map(r => ({ ...r })),
      };
      STE.setSession({ ...STE.getSession(), viewLicenseeId: stmt.licenseeId });
      STEApp.toast(`Cloning ${(stmt.rows||[]).length} rows from rejected ${qDisplay(stmt.quarter)}.`, "info");
      location.hash = `#/sales/${stmt.licenseeId}`;
    });
    // Attachment row — placeholder click (no real download in the demo).
    root.querySelector('[data-act="open-attachment"]')?.addEventListener("click", (e) => {
      e.preventDefault();
      STEApp.toast(`Opening ${stmt.fileName || 'attachment'}…`, "info");
    });
    root.querySelector('[data-act="reject-stmt"]')?.addEventListener("click", () => {
      const commentInp = root.querySelector("#ste-stmt-comment-input");
      const note = (commentInp?.value || "").trim();
      if (!note) {
        STEApp.toast("Add a comment explaining why the statement was rejected.", "warn");
        commentInp?.focus();
        return;
      }
      transitionStatus("Rejected", "reject", note);
    });
    root.querySelector('[data-act="reopen-stmt"]')?.addEventListener("click", () => {
      transitionStatus("Pending Review", "reopen", "Reopened — pulling back into the review queue.");
    });

    // Plain comment (no status change) — both sides can post messages here.
    root.querySelector('[data-act="add-stmt-comment"]')?.addEventListener("click", () => {
      const inp = root.querySelector("#ste-stmt-comment-input");
      const body = (inp?.value || "").trim();
      if (!body) { STEApp.toast("Type a message first.", "warn"); inp?.focus(); return; }
      const u = STE.currentUser();
      const role = u?.title || (isHQUser ? "HQ Reviewer" : "Licensee");
      STE.mutate(s => {
        const target = (s.salesStatements || []).find(x => x.id === stmt.id);
        if (!target) return;
        target.comments = target.comments || [];
        target.comments.push({
          author: u?.name || "Reviewer",
          role,
          at: new Date().toISOString(),
          body,
        });
      });
      renderSalesView(root, licId, quarterSlug);
    });
  }

  function renderSalesPreview(root) {
    const lic = (STE.get().licensees || []).find(l => l.id === _salesPreview.licId);
    if (!lic) { _salesPreview = null; sales(); return; }
    const { quarter, rows, allRows } = _salesPreview;
    const totalUnits = rows.reduce((s, r) => s + (parseFloat(r.qty) || 0), 0);
    const totalNet = rows.reduce((s, r) => s + _netOf(r), 0);
    const royalty = totalNet * 0.10;
    const prior = STE.selectors().salesStatements(lic.id);
    const sorted = (prior || []).slice().sort((a,b) => (b.submittedAt||"").localeCompare(a.submittedAt||""));
    // Build comparison columns: current (this draft) + up to 3 previous filings.
    const columns = [
      { key: "this", quarter, lines: rows.length, units: totalUnits, sales: totalNet, royalty, isCurrent: true },
      ...sorted.slice(0, 3).map(p => ({
        key: p.id, quarter: p.quarter, lines: null, units: null,
        sales: p.totalSalesGbp || 0, royalty: p.royaltyGbp || 0, isCurrent: false,
      })),
    ];
    function delta(a, b) {
      if (b == null || b === 0) return null;
      return ((a - b) / b) * 100;
    }

    root.innerHTML = `
      <div class="ste-screen-pad ste-slide-in">
        <div class="ste-section-hd">
          <div class="ste-page-crumbs">
            <a href="#/${STE.isHQ() ? 'hq' : 'home'}">Home</a><span class="sep">/</span>
            <a href="#/sales">Sales Statements</a><span class="sep">/</span>
            <a href="#/sales/${escape(lic.id)}" data-go-back>Submit New Statement</a><span class="sep">/</span>
            <span class="cur">Preview</span>
          </div>
          <h1>Preview — ${escape(lic.legalName)} · ${escape(qDisplay(quarter))}</h1>
        </div>

        <div class="ste-form-card">
          <div class="ste-form-section">
            <div class="ste-form-section-hd"><h3>Comparison</h3><span class="ste-mini">This filing vs prior quarters</span></div>
            <table class="ste-table ste-cmp-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  ${columns.map(c => `<th class="${c.isCurrent ? 'ste-cmp-current' : ''}">${escape(qDisplay(c.quarter))}${c.isCurrent ? ' <span class="ste-cmp-tag">This filing</span>' : ''}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Net Sales</strong></td>
                  ${columns.map((c, i) => {
                    const d = i > 0 ? delta(columns[i-1].sales, c.sales) : null;
                    const dLbl = d == null ? '' : `<div class="ste-mini" style="color:${d>=0?'var(--st-green)':'var(--st-err)'}">${d>=0?'+':''}${d.toFixed(1)}% vs prior</div>`;
                    return `<td class="${c.isCurrent ? 'ste-cmp-current' : ''}"><strong>${escape(lic.currency)} ${Math.round(c.sales).toLocaleString()}</strong>${c.isCurrent ? dLbl : ''}</td>`;
                  }).join("")}
                </tr>
                <tr>
                  <td><strong>Royalty (10%)</strong></td>
                  ${columns.map((c, i) => {
                    const d = i > 0 ? delta(columns[i-1].royalty, c.royalty) : null;
                    const dLbl = d == null ? '' : `<div class="ste-mini" style="color:${d>=0?'var(--st-green)':'var(--st-err)'}">${d>=0?'+':''}${d.toFixed(1)}% vs prior</div>`;
                    return `<td class="${c.isCurrent ? 'ste-cmp-current' : ''}"><strong>${escape(lic.currency)} ${Math.round(c.royalty).toLocaleString()}</strong>${c.isCurrent ? dLbl : ''}</td>`;
                  }).join("")}
                </tr>
                <tr>
                  <td>Lines</td>
                  ${columns.map(c => `<td class="${c.isCurrent ? 'ste-cmp-current' : ''}">${c.lines == null ? '<span class="ste-mini">—</span>' : c.lines}</td>`).join("")}
                </tr>
                <tr>
                  <td>Units</td>
                  ${columns.map(c => `<td class="${c.isCurrent ? 'ste-cmp-current' : ''}">${c.units == null ? '<span class="ste-mini">—</span>' : c.units.toLocaleString()}</td>`).join("")}
                </tr>
              </tbody>
            </table>
          </div>

          ${(() => {
            const rowsWithV = rows.map(r => ({ r, v: _violationsOf(r, quarter) }))
              .filter(x => x.v.length > 0);
            if (rowsWithV.length === 0) return "";
            const totalNet = rowsWithV.reduce((s, x) => s + _netOf(x.r), 0);
            const cur = (lic && lic.currency) || "GBP";
            const countBy = (kind) => rowsWithV.filter(x => x.v.includes(kind)).length;
            const counts = {
              territory: countBy("territory"),
              product:   countBy("product"),
              account:   countBy("account"),
            };
            const lines = [];
            if (counts.territory) lines.push(`<li><strong class="ste-stmt-v-ter">${counts.territory}</strong> sold out of licensed territory</li>`);
            if (counts.product)   lines.push(`<li><strong class="ste-stmt-v-pro">${counts.product}</strong> use products not approved in Design Review</li>`);
            if (counts.account)   lines.push(`<li><strong class="ste-stmt-v-acc">${counts.account}</strong> sold to accounts not on the approved list</li>`);
            return `
              <div class="ste-stmt-unappr-bar">
                <span class="ste-stmt-unappr-icon" aria-hidden="true">⚠</span>
                <div class="ste-stmt-unappr-text">
                  <strong>${rowsWithV.length} line item${rowsWithV.length===1?' has':'s have'} issues for ${escape(qDisplay(quarter))}.</strong>
                  <ul class="ste-stmt-unappr-list">${lines.join("")}</ul>
                  <span>Total net affected: ${escape(cur)} ${Math.round(totalNet).toLocaleString()}. Each row is flagged below — fix before submitting.</span>
                </div>
              </div>`;
          })()}

          ${renderSalesBreakdowns(rows, lic)}

          <div class="ste-form-section">
            <div class="ste-form-section-hd"><h3>Line Items</h3><span class="ste-mini">${rows.length} line${rows.length===1?'':'s'}</span></div>
            <table class="ste-table">
              <thead><tr><th>Date</th><th>Style Code</th><th>Product Name</th><th>Category</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit</th><th style="text-align:right">Gross</th><th style="text-align:right">Disc</th><th style="text-align:right">Net</th><th>Account</th><th>Channel</th></tr></thead>
              <tbody>
                ${rows.map(r => {
                  const netVal = _netOf(r);
                  const v = _violationsOf(r, quarter);
                  const hasV = v.length > 0;
                  const titles = v.map(t => _VIOLATION_META[t].long).join(" · ");
                  const tags = v.map(t => {
                    const m = _VIOLATION_META[t];
                    return `<span class="ste-stmt-v-tag ste-stmt-v-${m.tone}" title="${escape(m.long)}">⚠ ${escape(m.short)}</span>`;
                  }).join("");
                  return `
                  <tr class="${hasV ? 'ste-stmt-row-unappr' : ''}" ${hasV ? `title="${escape(titles)}"` : ''}>
                    <td><span class="ste-mini">${escape(r.date||'—')}</span></td>
                    <td>
                      <code class="ste-code">${escape(r.sku)}</code>
                      ${tags}
                    </td>
                    <td>${escape(r.description)}</td>
                    <td>${escape(r.category)}</td>
                    <td style="text-align:right">${(parseFloat(r.qty)||0).toLocaleString()}</td>
                    <td style="text-align:right">${(parseFloat(r.unitPrice)||parseFloat(r.unitGross)||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                    <td style="text-align:right">${(parseFloat(r.gross)||((parseFloat(r.qty)||0)*(parseFloat(r.unitGross)||0))||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                    <td style="text-align:right">${(parseFloat(r.discount)||_calcDiscount(r)||((parseFloat(r.qty)||0)*(parseFloat(r.deductions)||0))||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                    <td style="text-align:right"><strong>${netVal.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></td>
                    <td>${escape(r.account||r.customer||'')}</td>
                    <td>${escape(r.channel||r.customerType||'')}</td>
                  </tr>`;
                }).join("")}
              </tbody>
            </table>
          </div>

          <div class="ste-form-actions">
            <button class="ste-btn ste-btn-ghost" id="ste-preview-back" type="button">← Back to edit</button>
            <button class="ste-btn ste-btn-primary" id="ste-preview-submit" type="button">Submit Statement</button>
          </div>
        </div>
      </div>`;

    function slideBack() {
      // Hand the edited rows back to the submission form so the user's
      // work survives the round-trip.
      _salesDraftCarry = { licId: lic.id, rows: _salesPreview.allRows.map(r => ({ ...r })) };
      const slideEl = root.querySelector(".ste-slide-in");
      if (slideEl) {
        slideEl.classList.remove("ste-slide-in");
        slideEl.classList.add("ste-slide-out-right");
        slideEl.addEventListener("animationend", () => {
          _salesPreview = null;
          sales();
        }, { once: true });
      } else {
        _salesPreview = null;
        sales();
      }
    }
    $("#ste-preview-back", root)?.addEventListener("click", slideBack);
    $("[data-go-back]", root)?.addEventListener("click", (e) => {
      e.preventDefault();
      slideBack();
    });
    $("#ste-preview-submit", root)?.addEventListener("click", () => {
      // Final commit. If a statement for this quarter already exists, the
      // new line items SUPPLEMENT it: append rows, sum totals, bump revision.
      STE.mutate(s => {
        s.salesStatements = s.salesStatements || [];
        const idx = s.salesStatements.findIndex(x => x.licenseeId === lic.id && x.quarter === quarter);
        const existing = idx >= 0 ? s.salesStatements[idx] : null;
        const submittedAt = new Date().toISOString();
        const mergedRows = (existing && Array.isArray(existing.rows) ? existing.rows.slice() : []).concat(allRows);
        const mergedSales = (existing ? (existing.totalSalesGbp || 0) : 0) + totalNet;
        const mergedRoyalty = (existing ? (existing.royaltyGbp || 0) : 0) + royalty;
        const revision = existing ? ((existing.revision || 1) + 1) : 1;
        const status = "Pending Review";
        // ID format: SALES-STATEMENT-{YYYY-Q}-{NNN}. If a statement already
        // exists for this quarter we reuse its ID + append a revision suffix.
        const quarterSlug = quarterToSlug(quarter);
        const baseId = existing
          ? existing.id.replace(/-r\d+$/, "")
          : `SALES-STATEMENT-${quarterSlug}-${nextSeqForPrefix(s.salesStatements, `SALES-STATEMENT-${quarterSlug}`)}`;
        const entry = {
          id: baseId + (existing ? `-r${revision}` : ""),
          licenseeId: lic.id, quarter,
          fileName: existing?.fileName || null,
          submittedAt,
          totalSalesGbp: mergedSales, royaltyGbp: mergedRoyalty,
          status, revision, rows: mergedRows,
        };
        if (idx >= 0) s.salesStatements[idx] = entry;
        else s.salesStatements.unshift(entry);
        s.currentStatement = {
          ...entry,
          uploadedAt: submittedAt, uploadedBy: STE.currentUser().id,
          licenseeNet: mergedSales, licenseeRoyalty: mergedRoyalty,
          axNet: mergedSales, axRoyalty: mergedRoyalty,
          totalLines: mergedRows.length, validCount: mergedRows.length,
          errors: [], warnings: [],
          rowCount: mergedRows.length,
        };
        s.currentSettlement = {
          id: `ROYALTY-STATEMENT-${quarterToSlug(quarter)}-${nextSeqForPrefix((s.royaltyStatements||[]).concat(s.currentSettlement ? [s.currentSettlement] : []), `ROYALTY-STATEMENT-${quarterToSlug(quarter)}`)}`,
          statementId: s.currentStatement.id,
          licenseeId: lic.id, quarter,
          createdAt: submittedAt,
          slaDueAt: new Date(Date.now() + 7*24*3600*1000).toISOString(),
          status, decision: null,
        };
      });
      _salesPreview = null;
      _salesDraftCarry = null;
      STEApp.toast(`${qDisplay(quarter)} statement submitted to HQ`, "success");
      location.hash = "#/sales";
    });
  }

  function openPreviewSubmitModal({ lic, quarter, rows, allRows, prior }) {
    if (window._stePreviewBd) { window._stePreviewBd.remove(); }
    const totalUnits = rows.reduce((s, r) => s + (parseFloat(r.qty) || 0), 0);
    const totalNet = rows.reduce((s, r) => s + _netOf(r), 0);
    const royalty = totalNet * 0.10;
    const byCategory = {};
    rows.forEach(r => { const k = r.category || "(Uncategorized)"; byCategory[k] = (byCategory[k] || 0) + _netOf(r); });

    // Previous quarter summary for comparison
    const sorted = (prior || []).slice().sort((a,b) => (b.submittedAt||"").localeCompare(a.submittedAt||""));
    const prev = sorted[0];
    const prevSales = prev ? prev.totalSalesGbp : 0;
    const delta = prevSales ? ((totalNet - prevSales) / prevSales) * 100 : null;

    const bd = document.createElement("div");
    bd.className = "ste-spotlight-backdrop";
    bd.innerHTML = `
      <div class="ste-modal ste-preview-modal" role="dialog" aria-label="Preview submission">
        <div class="ste-modal-hd">
          <strong>Preview &amp; Submit — ${escape(qDisplay(quarter))}</strong>
          <button class="ste-modal-close" data-pv="close" aria-label="Close">×</button>
        </div>
        <div class="ste-modal-body">
          <div class="ste-mini" style="text-transform:uppercase;letter-spacing:1.5px;color:var(--ste-muted);margin-bottom:4px">Summary</div>
          <div class="ste-home-stats">
            <div><span class="ste-mini">Lines</span><strong>${rows.length}</strong></div>
            <div><span class="ste-mini">Units</span><strong>${totalUnits.toLocaleString()}</strong></div>
            <div><span class="ste-mini">Net Sales</span><strong>${escape(lic.currency)} ${totalNet.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></div>
            <div><span class="ste-mini">Royalty (10%)</span><strong>${escape(lic.currency)} ${royalty.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></div>
          </div>

          ${prev ? `
            <div class="ste-mini" style="text-transform:uppercase;letter-spacing:1.5px;color:var(--ste-muted);margin-top:18px;margin-bottom:4px">vs Previous Quarter (${escape(qDisplay(prev.quarter))})</div>
            <div class="ste-home-stats">
              <div><span class="ste-mini">Prev Net Sales</span><strong>£${Math.round(prevSales).toLocaleString()}</strong></div>
              <div><span class="ste-mini">Prev Royalty</span><strong>£${Math.round(prev.royaltyGbp||0).toLocaleString()}</strong></div>
              <div><span class="ste-mini">Change</span><strong style="color:${delta>=0?'var(--st-green)':'var(--st-err)'}">${delta == null ? '—' : (delta>=0?'+':'') + delta.toFixed(1) + '%'}</strong></div>
            </div>` : `
            <div class="ste-mini" style="margin-top:12px">No prior submission to compare against.</div>`}

          <div class="ste-mini" style="text-transform:uppercase;letter-spacing:1.5px;color:var(--ste-muted);margin-top:18px;margin-bottom:4px">Net Sales by Category</div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${Object.entries(byCategory).sort((a,b) => b[1]-a[1]).map(([k,v]) => {
              const pct = totalNet ? (v / totalNet) * 100 : 0;
              return `<div style="display:flex;align-items:center;gap:10px;font:500 13px Inter,sans-serif">
                <span style="flex:1">${escape(k)}</span>
                <div style="flex:2;background:rgba(10,24,50,0.08);height:6px;border-radius:3px;overflow:hidden">
                  <div style="width:${pct.toFixed(1)}%;height:100%;background:var(--st-navy)"></div>
                </div>
                <span style="width:80px;text-align:right">${escape(lic.currency)} ${Math.round(v).toLocaleString()}</span>
              </div>`;
            }).join("")}
          </div>

          <div class="ste-mini" style="text-transform:uppercase;letter-spacing:1.5px;color:var(--ste-muted);margin-top:18px;margin-bottom:4px">Line Items</div>
          <div class="ste-sales-preview-list">
            <table class="ste-table" style="margin:0">
              <thead><tr><th>Style Code</th><th>Description</th><th>Category</th><th style="text-align:right">Qty</th><th style="text-align:right">Net</th></tr></thead>
              <tbody>
                ${rows.map(r => `
                  <tr>
                    <td><code class="ste-code">${escape(r.sku)}</code></td>
                    <td>${escape(r.description)}</td>
                    <td>${escape(r.category)}</td>
                    <td style="text-align:right">${(parseFloat(r.qty)||0).toLocaleString()}</td>
                    <td style="text-align:right">${(parseFloat(r.netAmount)||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                  </tr>`).join("")}
              </tbody>
            </table>
          </div>
        </div>
        <div class="ste-modal-actions">
          <div style="margin-left:auto; display:flex; gap:8px">
            <button class="ste-btn ste-btn-ghost" data-pv="close">Back to edit</button>
            <button class="ste-btn ste-btn-primary" data-pv="submit">Submit Statement</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(bd);
    window._stePreviewBd = bd;
    function close() { bd.remove(); window._stePreviewBd = null; }
    bd.addEventListener("click", (e) => { if (e.target === bd) close(); });
    $$("[data-pv]", bd).forEach(b => b.addEventListener("click", (e) => {
      e.stopPropagation();
      const act = b.getAttribute("data-pv");
      if (act === "close") { close(); return; }
      if (act === "submit") {
        // Final commit
        STE.mutate(s => {
          const quarterSlug = quarterToSlug(quarter);
          const newId = `SALES-STATEMENT-${quarterSlug}-${nextSeqForPrefix(s.salesStatements || [], `SALES-STATEMENT-${quarterSlug}`)}`;
          s.currentStatement = {
            id: newId,
            licenseeId: lic.id, quarter,
            rows: allRows, fileName: null,
            submittedAt: new Date().toISOString(),
            uploadedAt: new Date().toISOString(),
            uploadedBy: STE.currentUser().id,
            licenseeNet: totalNet, licenseeRoyalty: royalty,
            axNet: totalNet, axRoyalty: royalty,
            totalLines: rows.length, validCount: rows.length,
            errors: [], warnings: [],
            rowCount: allRows.length,
            status: "Pending Review",
            totalSalesGbp: totalNet, royaltyGbp: royalty,
          };
          // Push into salesStatements as well
          s.salesStatements = s.salesStatements || [];
          const existing = s.salesStatements.findIndex(x => x.licenseeId === lic.id && x.quarter === quarter);
          const entry = {
            id: s.currentStatement.id, licenseeId: lic.id, quarter,
            fileName: null, submittedAt: s.currentStatement.submittedAt,
            totalSalesGbp: totalNet, royaltyGbp: royalty,
            status: "Pending Review",
          };
          if (existing >= 0) s.salesStatements[existing] = entry;
          else s.salesStatements.unshift(entry);
          s.currentSettlement = {
            id: `ROYALTY-STATEMENT-${quarterToSlug(quarter)}-${nextSeqForPrefix((s.royaltyStatements||[]).concat(s.currentSettlement ? [s.currentSettlement] : []), `ROYALTY-STATEMENT-${quarterToSlug(quarter)}`)}`,
            statementId: s.currentStatement.id,
            licenseeId: lic.id, quarter,
            createdAt: new Date().toISOString(),
            slaDueAt: new Date(Date.now() + 7*24*3600*1000).toISOString(),
            status: "Pending Review",
            decision: null,
          };
        });
        close();
        STEApp.toast(`${qDisplay(quarter)} statement submitted to HQ`, "success");
        location.hash = "#/sales";
      }
    }));
  }

  // Build the list of selectable reporting quarters: 12 most recent
  // quarters (current + 11 past). The default selection is the latest
  // quarter not yet filed by this licensee.
  // Display helper: convert stored "Q1 2026" to user-facing "2026 Q1".
  function qDisplay(q) {
    if (!q) return "";
    const m = String(q).match(/^Q(\d)\s+(\d{4})$/);
    return m ? `${m[2]} Q${m[1]}` : q;
  }

  // Convert "Q1 2026" → "2026-Q1" for the new ID format.
  function quarterToSlug(q) {
    if (!q) return "";
    const m = String(q).match(/^Q(\d)\s+(\d{4})$/);
    return m ? `${m[2]}-Q${m[1]}` : String(q).replace(/\s+/g, "-");
  }

  // Build a unique invoice number: INV-{YYYY}-Q{n}-{NNN}
  function buildInvoiceNumber(quarter, salesStatements) {
    const slug = quarterToSlug(quarter);
    const existingInvoiceIds = (salesStatements || [])
      .filter(s => s.invoice && s.invoice.number && s.invoice.number.includes(slug))
      .map(s => ({ id: s.invoice.number }));
    const seq = nextSeqForPrefix(existingInvoiceIds, `INV-${slug}`);
    return `INV-${slug}-${seq}`;
  }

  // Shared invoice generator — used by both the statement-detail "Generate
  // Invoice" button and the Invoices-page "+ Create New Invoice" modal. Supports
  // n:1 (one invoice spanning multiple sales statements). The invoice carries
  // statementIds[] referencing every statement it covers; each covered
  // statement is mutated to point at the same invoice + Invoiced status.
  function generateInvoiceForStatements(stmts, lic) {
    if (!stmts || !stmts.length) return null;
    // Approval flips status straight to "Invoiced" — any post-approval
    // statement without an invoice attached yet is eligible for one.
    const eligible = stmts.filter(s => !s.invoice && s.status === "Invoiced");
    if (eligible.length === 0) {
      STEApp.toast("Selected statements aren't ready for invoicing.", "warn");
      return null;
    }
    if (!lic) {
      lic = (STE.get().licensees || []).find(l => l.id === eligible[0].licenseeId) || { id: eligible[0].licenseeId, legalName: eligible[0].licenseeId, currency: "GBP" };
    }
    // Aggregate across selected statements.
    const netSales = eligible.reduce((acc, s) => acc + (s.totalSalesGbp || 0), 0);
    const royaltyPct = eligible[0].royaltyPct || 10;
    const marketingPct = eligible[0].marketingPct || 2;
    const royaltyAmount = eligible.reduce((acc, s) => acc + (s.royaltyGbp || Math.round((s.totalSalesGbp || 0) * (royaltyPct / 100))), 0);
    const marketingAmount = Math.round(netSales * (marketingPct / 100));
    const totalDue = royaltyAmount + marketingAmount;
    const now = new Date();
    const due = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
    // Period label: a range when spanning multiple quarters.
    const quarters = [...new Set(eligible.map(s => s.quarter))].sort();
    const periodLabel = quarters.length === 1 ? qDisplay(quarters[0]) : `${qDisplay(quarters[0])} – ${qDisplay(quarters[quarters.length - 1])}`;
    // Use the latest quarter for the invoice number so the slug is sensible.
    const numQuarter = quarters[quarters.length - 1];
    const invoice = {
      number: buildInvoiceNumber(numQuarter, STE.get().salesStatements || []),
      generatedAt: now.toISOString(),
      generatedBy: (STE.currentUser() || {}).name || "HQ",
      periodLabel,
      currency: lic.currency || "GBP",
      netSales,
      royaltyPct, royaltyAmount,
      marketingPct, marketingAmount,
      totalDue,
      dueDate: due.toISOString(),
      paymentTerms: "Net 30",
      status: "Issued",
      statementIds: eligible.map(s => s.id),
    };
    STE.mutate(s => {
      eligible.forEach(elig => {
        const target = (s.salesStatements || []).find(x => x.id === elig.id);
        if (target) {
          target.invoice = invoice;
          target.status = "Invoiced";
        }
      });
    });
    return invoice;
  }

  // Backwards-compat single-statement wrapper.
  function generateInvoiceFor(stmt, lic) {
    return generateInvoiceForStatements([stmt], lic);
  }

  // Render the invoice card shown inline on the sales statement detail page.
  function renderInvoiceCard(inv, lic) {
    const cur = inv.currency || lic.currency || "GBP";
    const sym = currencySymbol(cur);
    const fmtMoney = (v) => `${sym}${Math.round(v || 0).toLocaleString()}`;
    const dueLbl = inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : "—";
    const issuedLbl = inv.generatedAt ? new Date(inv.generatedAt).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : "—";
    const tone = inv.status === "Paid" ? "ok" : "warn";
    return `
      <div class="ste-form-section ste-invoice-section">
        <div class="ste-form-section-hd">
          <h3>Invoice</h3>
          <span class="ste-badge ste-badge-${tone}">${escape(inv.status || 'Issued')}</span>
        </div>
        <div class="ste-invoice-grid">
          <div><span class="ste-mini">Invoice Number</span><strong>${escape(inv.number)}</strong></div>
          <div><span class="ste-mini">Period</span><strong>${escape(inv.periodLabel)}</strong></div>
          <div><span class="ste-mini">Issued</span><strong>${escape(issuedLbl)}</strong></div>
          <div><span class="ste-mini">Due (${escape(inv.paymentTerms || 'Net 30')})</span><strong>${escape(dueLbl)}</strong></div>
        </div>
        <table class="ste-invoice-line-table">
          <thead><tr><th>Description</th><th style="text-align:right">Base</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr></thead>
          <tbody>
            <tr>
              <td><strong>Royalty</strong><div class="ste-mini">on net sales for ${escape(inv.periodLabel)}</div></td>
              <td style="text-align:right">${fmtMoney(inv.netSales)}</td>
              <td style="text-align:right">${inv.royaltyPct}%</td>
              <td style="text-align:right">${fmtMoney(inv.royaltyAmount)}</td>
            </tr>
            ${inv.marketingAmount ? `
            <tr>
              <td><strong>Marketing Contribution</strong><div class="ste-mini">on net sales for ${escape(inv.periodLabel)}</div></td>
              <td style="text-align:right">${fmtMoney(inv.netSales)}</td>
              <td style="text-align:right">${inv.marketingPct}%</td>
              <td style="text-align:right">${fmtMoney(inv.marketingAmount)}</td>
            </tr>` : ''}
            <tr class="ste-invoice-total">
              <td colspan="3" style="text-align:right"><strong>Total Due</strong></td>
              <td style="text-align:right"><strong>${fmtMoney(inv.totalDue)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>`;
  }

  function currencySymbol(c) {
    return { GBP: "£", EUR: "€", USD: "$", KRW: "₩" }[c] || (c + " ");
  }

  // Open a printable HTML invoice in a new window. The user prints to PDF
  // from their browser.
  function openInvoicePrintable(inv, lic, stmt) {
    const cur = inv.currency || lic.currency || "GBP";
    const sym = currencySymbol(cur);
    const fmtMoney = (v) => `${sym}${Math.round(v || 0).toLocaleString()}`;
    const dueLbl = inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : "—";
    const issuedLbl = inv.generatedAt ? new Date(inv.generatedAt).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : "—";
    const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${escape(inv.number)}</title>
<style>
  * { box-sizing: border-box; }
  body { font: 13px/1.5 -apple-system, "Inter", Arial, sans-serif; color: #1d1c14; margin: 0; padding: 48px; max-width: 820px; }
  .hd { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0b2c4a; padding-bottom: 18px; margin-bottom: 28px; }
  .hd h1 { margin: 0 0 4px; font-size: 22px; letter-spacing: 2px; color: #0b2c4a; }
  .hd .num { font-size: 14px; font-weight: 600; color: #555; letter-spacing: 1px; }
  .hd .brand { text-align: right; }
  .hd .brand .name { font-size: 18px; font-weight: 700; color: #0b2c4a; letter-spacing: 1px; }
  .hd .brand .sub { font-size: 11px; color: #777; letter-spacing: 1px; text-transform: uppercase; margin-top: 4px; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-bottom: 28px; }
  .parties h4 { margin: 0 0 6px; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #777; }
  .parties strong { display: block; font-size: 14px; color: #0b2c4a; }
  .parties .line { font-size: 12px; color: #444; }
  .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 14px 16px; background: #f7f1e3; border-radius: 4px; margin-bottom: 24px; font-size: 12px; }
  .meta div span { display: block; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: #777; margin-bottom: 2px; }
  .meta div strong { font-size: 13px; color: #0b2c4a; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { text-align: left; padding: 10px 8px; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: #777; border-bottom: 1px solid #c98722; }
  td { padding: 12px 8px; border-bottom: 1px solid #eee; vertical-align: top; font-size: 13px; }
  td .sub { font-size: 11px; color: #777; margin-top: 2px; }
  .total td { font-size: 15px; font-weight: 700; color: #0b2c4a; border-bottom: 0; border-top: 2px solid #0b2c4a; padding-top: 14px; }
  .foot { font-size: 11px; color: #777; border-top: 1px solid #eee; padding-top: 16px; margin-top: 36px; }
  .foot p { margin: 4px 0; }
  @media print { body { padding: 24px; } .noprint { display: none; } }
  .noprint { position: fixed; top: 16px; right: 16px; }
  .noprint button { background: #0b2c4a; color: white; border: 0; padding: 8px 16px; border-radius: 4px; font-weight: 600; cursor: pointer; }
</style></head>
<body>
  <div class="noprint"><button onclick="window.print()">Print / Save as PDF</button></div>
  <div class="hd">
    <div>
      <h1>INVOICE</h1>
      <div class="num">${escape(inv.number)}</div>
    </div>
    <div class="brand">
      <div class="name">SERGIO TACCHINI EUROPE</div>
      <div class="sub">Licensing Operations</div>
    </div>
  </div>
  <div class="parties">
    <div>
      <h4>Bill To</h4>
      <strong>${escape(lic.legalName || '')}</strong>
      ${lic.address ? `
        ${lic.address.street1 ? `<div class="line">${escape(lic.address.street1)}</div>` : ''}
        ${lic.address.street2 ? `<div class="line">${escape(lic.address.street2)}</div>` : ''}
        ${(lic.address.city || lic.address.postalCode || lic.address.state) ? `<div class="line">${escape([lic.address.postalCode, lic.address.city, lic.address.state].filter(Boolean).join(' '))}</div>` : ''}
        ${lic.address.country ? `<div class="line">${escape(lic.address.country)}</div>` : ''}
        ${lic.address.vatId ? `<div class="line">VAT: ${escape(lic.address.vatId)}</div>` : ''}
      ` : ''}
      <div class="line">Licensee ID: ${escape(lic.id || '')}</div>
    </div>
    <div>
      <h4>Issued By</h4>
      <strong>Sergio Tacchini Europe SpA</strong>
      <div class="line">Licensing &amp; Royalty Operations</div>
      <div class="line">VAT / Tax ID on file</div>
    </div>
  </div>
  <div class="meta">
    <div><span>Invoice No</span><strong>${escape(inv.number)}</strong></div>
    <div><span>Period</span><strong>${escape(inv.periodLabel)}</strong></div>
    <div><span>Issued</span><strong>${escape(issuedLbl)}</strong></div>
    <div><span>Due (${escape(inv.paymentTerms || 'Net 30')})</span><strong>${escape(dueLbl)}</strong></div>
  </div>
  <table>
    <thead><tr><th>Description</th><th style="text-align:right">Base</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>
      <tr>
        <td><strong>Royalty</strong><div class="sub">on net sales for ${escape(inv.periodLabel)}</div></td>
        <td style="text-align:right">${fmtMoney(inv.netSales)}</td>
        <td style="text-align:right">${inv.royaltyPct}%</td>
        <td style="text-align:right">${fmtMoney(inv.royaltyAmount)}</td>
      </tr>
      ${inv.marketingAmount ? `
      <tr>
        <td><strong>Marketing Contribution</strong><div class="sub">on net sales for ${escape(inv.periodLabel)}</div></td>
        <td style="text-align:right">${fmtMoney(inv.netSales)}</td>
        <td style="text-align:right">${inv.marketingPct}%</td>
        <td style="text-align:right">${fmtMoney(inv.marketingAmount)}</td>
      </tr>` : ''}
      <tr class="total">
        <td colspan="3" style="text-align:right">Total Due (${escape(cur)})</td>
        <td style="text-align:right">${fmtMoney(inv.totalDue)}</td>
      </tr>
    </tbody>
  </table>
  <div class="foot">
    <p><strong>Payment Terms:</strong> ${escape(inv.paymentTerms || 'Net 30')} from issue date. Wire to the bank account on file. Reference the invoice number on remittance.</p>
    <p><strong>Sales Statement:</strong> ${escape(stmt.id)} (${escape(inv.periodLabel)})</p>
    <p>Questions about this invoice? Contact your Sergio Tacchini Europe account manager.</p>
  </div>
</body></html>`;
    const w = window.open("", "_blank", "width=900,height=1100");
    if (!w) { STEApp.toast("Pop-ups blocked — allow pop-ups to download the invoice.", "warn"); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  // Sequential 3-digit suffix for a doc-id family. Looks at existing IDs and
  // returns the next available number for the given prefix.
  function nextSeqForPrefix(items, prefix) {
    const max = (items || []).reduce((m, x) => {
      const match = String(x.id || "").match(new RegExp("^" + prefix.replace(/[-/]/g, "\\$&") + "-?(\\d{3})$"));
      return match ? Math.max(m, parseInt(match[1], 10)) : m;
    }, 0);
    return String(max + 1).padStart(3, "0");
  }

  function buildQuarterOptions(stmts) {
    // For each quarter, pick the most-recently-submitted statement so we
    // can express the quarter's lockedness:
    //   · no statement      → unfiled, freely selectable
    //   · latest = Rejected → can be re-submitted (a fresh new statement)
    //   · anything else     → locked from new submissions (the prior filing
    //                          is in flight or settled and shouldn't be
    //                          mutated from this form).
    const latestByQuarter = {};
    (stmts || []).forEach(s => {
      const cur = latestByQuarter[s.quarter];
      if (!cur || (s.submittedAt || "") > (cur.submittedAt || "")) latestByQuarter[s.quarter] = s;
    });
    const today = new Date();
    const cyr = today.getFullYear();
    const cq = Math.floor(today.getMonth() / 3) + 1;
    const options = [];
    let q = cq, y = cyr;
    for (let i = 0; i < 12; i++) {
      const value = `Q${q} ${y}`;
      const label = `${y} Q${q}`;
      const latest = latestByQuarter[value];
      const rejected = !!(latest && latest.status === "Rejected");
      const lockingStatus = latest && !rejected ? latest.status : null;
      options.push({
        value, label, year: y, quarter: q,
        filed: !!latest,
        lockingStatus,
        rejected,
      });
      q--; if (q < 1) { q = 4; y--; }
    }
    return options;
  }
  function quarterDeadline(year, q) {
    const monthEnd = q * 3 - 1;
    const filingMonth = new Date(year, monthEnd + 1, 30);
    return filingMonth.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }
  function quarterRange(year, q) {
    const startMonth = (q - 1) * 3;
    const start = new Date(year, startMonth, 1).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    const end = new Date(year, startMonth + 3, 0).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    return `${start} — ${end}`;
  }

  // ============================ SALES LIST (HQ) ============================
  // Document-centric: one row per submitted/overdue sales statement.
  function salesList(root, isHQ, u) {
    if (isHQ === undefined) isHQ = true;
    const state = STE.get();
    const lics = state.licensees || [];
    const allStmts = state.salesStatements || [];
    // Licensees only see their own statements; HQ sees everything.
    const stmts = isHQ ? allStmts : allStmts.filter(s => s.licenseeId === (u && u.licenseeId));
    const findLic = (id) => lics.find(x => x.id === id);

    // Build rows — only show statements that were actually submitted.
    // "Overdue" entries (no submission) are surfaced as a banner instead.
    const rows = stmts
      .filter(s => s.status !== "Overdue")
      .map(s => {
        const lic = findLic(s.licenseeId);
        return {
          id: s.id, quarter: s.quarter,
          licensee: lic,
          status: s.status,
          sales: s.totalSalesGbp,
          royalty: s.royaltyGbp,
          submittedAt: s.submittedAt,
          fileName: s.fileName,
          lines: Array.isArray(s.rows) ? s.rows.length : null,
          warning: s.status === "Pending Review" ? "soon" : null,
          invoice: s.invoice || null,
        };
      });
    rows.sort((a, b) => (b.quarter||"").localeCompare(a.quarter||"") || (a.licensee?.legalName||"").localeCompare(b.licensee?.legalName||""));

    // Overdue submissions — derive from any status === "Overdue" rows in
    // state. These appear as a banner rather than table rows.
    const overdue = stmts.filter(s => s.status === "Overdue").map(s => ({
      ...s, licensee: findLic(s.licenseeId),
    }));

    const statuses = [...new Set(rows.map(r => r.status))].filter(Boolean).map(v => ({ value: v, label: v }));
    const quarters = [...new Set(rows.map(r => r.quarter))].map(v => ({ value: v, label: qDisplay(v) }));
    const licOptions = lics.map(l => ({ value: l.id, label: l.legalName }));
    // Honour an incoming status filter set by upstream pages (e.g. the
    // banner click). One-shot — consumed and cleared so a normal refresh of
    // /sales doesn't keep the narrow filter forever.
    const incoming = (STE.getSession() && STE.getSession().salesStatusFilter) || null;
    // Default filter — HQ pins to "Pending Review" (their action queue).
    // Licensee opens unfiltered — banner + per-row dots tell them what's
    // theirs to do; a sticky default is just in the way when bouncing
    // between pages. Incoming filter wins when explicitly set.
    const pendingAvailable = statuses.some(o => o.value === "Pending Review");
    const defaultStatuses = incoming
      ? statuses.filter(o => o.value === incoming).map(o => o.value)
      : (isHQ && pendingAvailable ? ["Pending Review"] : statuses.map(o => o.value));
    if (incoming) STE.setSession({ ...STE.getSession(), salesStatusFilter: null });
    const filters = {
      q: "", licensees: licOptions.map(o => o.value), quarters: quarters.map(o => o.value),
      statuses: defaultStatuses.length ? defaultStatuses : statuses.map(o => o.value),
      sortBy: "submittedAt", sortDir: "desc",
    };
    function getSortKey(r, k) {
      if (k === "quarter") {
        const m = String(r.quarter||"").match(/^Q(\d)\s+(\d{4})$/);
        return m ? `${m[2]}${m[1]}` : String(r.quarter || "");
      }
      if (k === "status") return r.status || "";
      if (k === "licensee") return r.licensee?.legalName || "";
      if (k === "sales") return r.sales == null ? -Infinity : r.sales;
      if (k === "royalty") return r.royalty == null ? -Infinity : r.royalty;
      if (k === "lines") return r.lines == null ? -Infinity : r.lines;
      if (k === "submittedAt") return r.submittedAt || "";
      return "";
    }

    root.innerHTML = `
      <div class="ste-screen-pad">
        <div class="ste-section-hd">
          <div class="ste-page-crumbs"><a href="#/home">Home</a><span class="sep">/</span><span class="cur">Sales Statements</span></div>
          <div class="ste-page-hd-row">
            <div>
              <h1>Sales Statements</h1>
            </div>
            <div class="ste-hd-cta">
              <button class="ste-btn ste-btn-primary" id="ste-sl-upload-btn" type="button">+ Submit New Statement</button>
            </div>
          </div>
        </div>

        ${overdue.length ? `
          <button class="ste-overdue-banner" id="ste-overdue-banner" type="button">
            <span class="ste-overdue-icon"></span>
            <span class="ste-overdue-text">
              <strong>${overdue.length} licensee${overdue.length===1?'':'s'} ${overdue.length===1?'is':'are'} overdue</strong>
              <span class="ste-mini">${overdue.map(o => o.licensee?.legalName || o.licenseeId).slice(0,3).join(", ")}${overdue.length > 3 ? ` · +${overdue.length - 3} more` : ''} · click to send reminders</span>
            </span>
            <span class="ste-overdue-chev">→</span>
          </button>` : ''}

        ${(() => {
          // Audience-specific action banner — HQ sees the Pending Review
          // queue, licensees see drafts / rejected statements they still
          // owe. Click filters the table to the corresponding status.
          const myStmts = isHQ ? stmts : stmts.filter(s => s.licenseeId === (u && u.licenseeId));
          const pending = isHQ ? myStmts.filter(s => s.status === "Pending Review") : [];
          const drafts  = !isHQ ? myStmts.filter(s => s.status === "Draft" || s.status === "Rejected") : [];
          const queue = pending.length ? pending : drafts;
          if (!queue.length) return '';
          const headline = isHQ
            ? `${queue.length} statement${queue.length===1?'':'s'} pending your review`
            : `${queue.length} statement${queue.length===1?'':'s'} to submit`;
          const filterValue = isHQ ? "Pending Review" : (drafts.find(d => d.status === "Draft") ? "Draft" : "Rejected");
          const sub = isHQ
            ? `Variance check + AI recompute reconciliation · click to filter the queue`
            : `Click to filter the table to ${filterValue.toLowerCase()} statements`;
          return `
            <button class="ste-overdue-banner ste-overdue-banner-warn" data-act="open-stmt-queue" data-status="${escape(filterValue)}" type="button">
              <span class="ste-overdue-icon"></span>
              <span class="ste-overdue-text">
                <strong>${escape(headline)}</strong>
                <span class="ste-mini">${escape(sub)}</span>
              </span>
              <span class="ste-overdue-chev">→</span>
            </button>`;
        })()}

        <div class="ste-form-card">
          <div class="ste-filter-bar">
            <div class="ste-users-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/></svg>
              <input id="ste-sl-search" type="search" placeholder="Search…">
            </div>
            <span class="ste-filter-divider" aria-hidden="true"></span>
            <div class="ste-fdrop" data-filter="status">
              <button class="ste-fdrop-btn" type="button"><span class="ste-fdrop-lbl">Statuses</span><span class="ste-fdrop-val"></span><span class="ste-fdrop-chev"></span></button>
              <div class="ste-fdrop-panel" hidden></div>
            </div>
            <div class="ste-fdrop" data-filter="quarter">
              <button class="ste-fdrop-btn" type="button"><span class="ste-fdrop-lbl">Quarters</span><span class="ste-fdrop-val"></span><span class="ste-fdrop-chev"></span></button>
              <div class="ste-fdrop-panel" hidden></div>
            </div>
            ${isHQ ? `
              <div class="ste-fdrop" data-filter="licensee">
                <button class="ste-fdrop-btn" type="button"><span class="ste-fdrop-lbl">Licensees</span><span class="ste-fdrop-val"></span><span class="ste-fdrop-chev"></span></button>
                <div class="ste-fdrop-panel" hidden></div>
              </div>
            ` : ''}
            <button class="ste-btn ste-btn-ghost ste-btn-mini" id="ste-sl-clear" type="button">Clear</button>
            <span class="ste-mini ste-insp-filter-count" id="ste-sl-count"><strong>${rows.length}</strong> of ${rows.length}</span>
          </div>
          <table class="ste-table" id="ste-sl-table">
            <thead>
              <tr>
                <th data-sort="id" class="ste-th-sort" style="width:160px">Statement #</th>
                <th data-sort="status" class="ste-th-sort" style="width:160px">Status</th>
                <th data-sort="quarter" class="ste-th-sort" style="width:120px">Quarter</th>
                ${isHQ ? `<th data-sort="licensee" class="ste-th-sort">Licensee</th>` : ''}
                <th data-sort="sales" class="ste-th-sort">Net Sales</th>
                <th data-sort="royalty" class="ste-th-sort">Royalty</th>
                <th data-sort="lines" class="ste-th-sort">Lines</th>
                <th data-sort="submittedAt" class="ste-th-sort">Submitted</th>
                <th class="ste-col-kebab"></th>
              </tr>
            </thead>
            <tbody id="ste-sl-tbody">${renderSalesRows(rows, isHQ)}</tbody>
          </table>
        </div>
      </div>`;

    const search = $("#ste-sl-search", root);
    const tbody = $("#ste-sl-tbody", root);
    const count = $("#ste-sl-count", root);
    const fLicensee = root.querySelector('.ste-fdrop[data-filter="licensee"]');
    const fQuarter = root.querySelector('.ste-fdrop[data-filter="quarter"]');
    const fStatus = root.querySelector('.ste-fdrop[data-filter="status"]');
    const fUpload = root.querySelector('.ste-fdrop[data-filter="upload-licensee"]');

    function multiLabel(sel, all) {
      if (sel.length === 0 || sel.length === all.length) return { val: "", active: false };
      if (sel.length === 1) return { val: escape(sel[0]), active: true };
      return { val: `${sel.length} selected`, active: true };
    }
    function paintFilterLabels() {
      const set = (drop, info) => {
        if (!drop) return;
        drop.classList.toggle("ste-filter-active", !!info.active);
        const v = drop.querySelector(".ste-fdrop-val");
        if (v) v.innerHTML = info.val;
      };
      set(fLicensee, multiLabel(filters.licensees, licOptions.map(o => o.value)));
      set(fQuarter,  multiLabel(filters.quarters,  quarters.map(o => o.value)));
      set(fStatus,   multiLabel(filters.statuses,  statuses.map(o => o.value)));
    }
    function applyFilters() {
      const q = (search.value || "").trim().toLowerCase();
      paintFilterLabels();
      const filtered = rows.filter(r => {
        if (q) {
          const hay = [r.id, r.quarter, r.status, r.licensee?.legalName, r.fileName].filter(Boolean).join(" ").toLowerCase();
          if (!hay.includes(q)) return false;
        }
        if (filters.licensees.length && !filters.licensees.includes(r.licensee?.id)) return false;
        if (filters.quarters.length && !filters.quarters.includes(r.quarter)) return false;
        if (filters.statuses.length && !filters.statuses.includes(r.status)) return false;
        return true;
      });
      if (filters.sortBy) {
        const dir = filters.sortDir === "desc" ? -1 : 1;
        filtered.sort((a, b) => {
          const av = getSortKey(a, filters.sortBy);
          const bv = getSortKey(b, filters.sortBy);
          if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
          return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" }) * dir;
        });
      }
      tbody.innerHTML = renderSalesRows(filtered, isHQ);
      count.innerHTML = `<strong>${filtered.length}</strong> of ${rows.length}`;
      paintSortIndicator();
      wireRows();
    }
    function paintSortIndicator() {
      $$("th[data-sort]", root).forEach(th => {
        const k = th.getAttribute("data-sort");
        th.classList.toggle("ste-th-sorted", filters.sortBy === k);
        th.classList.toggle("ste-th-sort-desc", filters.sortBy === k && filters.sortDir === "desc");
      });
    }
    function wireRows() {
      $$("tr[data-lic]", tbody).forEach(tr => {
        tr.style.cursor = "pointer";
        tr.addEventListener("click", (e) => {
          if (e.target.closest("button, a")) return;
          const id = tr.getAttribute("data-lic");
          const stmtId = tr.getAttribute("data-stmt");
          STE.setSession({ ...STE.getSession(), viewLicenseeId: id });
          location.hash = stmtId ? `#/sales/details/view/${stmtId}` : `#/sales/${id}`;
        });
        // Native right-click context menu opens the same kebab menu.
        tr.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          openRowMenu(tr, e.clientX, e.clientY);
        });
      });
      $$("[data-act='row-menu']", tbody).forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const tr = btn.closest("tr");
          const rect = btn.getBoundingClientRect();
          openRowMenu(tr, rect.right, rect.bottom);
        });
      });
    }

    // ============ Row context menu ============
    let _openRowMenu = null;
    function closeRowMenu() {
      if (_openRowMenu) { _openRowMenu.remove(); _openRowMenu = null; }
    }
    document.addEventListener("click", closeRowMenu);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeRowMenu(); });

    function openRowMenu(tr, x, y) {
      closeRowMenu();
      const isHQUser = STE.isHQ(STE.currentUser());
      const stmtId = tr.getAttribute("data-stmt");
      const licId = tr.getAttribute("data-lic");
      const status = tr.getAttribute("data-status");
      const qSlug = (tr.getAttribute("data-quarter") || "").replace(/\s+/g, "-");
      const hasInvoice = tr.getAttribute("data-has-invoice") === "1";

      const items = [];
      items.push({ label: "Open", act: "open" });

      if (isHQUser && status === "Pending Review") {
        items.push({ label: "Approve", act: "approve", primary: true });
        items.push({ label: "Reject", act: "reject" });
      }
      if (isHQUser && status === "Rejected") {
        items.push({ label: "Reopen for Review", act: "reopen" });
      }
      if (!isHQUser && status === "Rejected") {
        items.push({ label: "Resubmit (cloned)", act: "resubmit-clone", primary: true });
      }
      if (hasInvoice) {
        items.push({ label: "Download Invoice", act: "download" });
      }
      items.push({ sep: true });
      items.push({ label: "Copy Statement ID", act: "copy-id" });

      const menu = document.createElement("div");
      menu.className = "ste-row-menu";
      menu.innerHTML = items.map(it => {
        if (it.sep) return `<div class="ste-row-menu-sep"></div>`;
        return `<button class="ste-row-menu-item ${it.primary ? 'ste-row-menu-primary' : ''}" data-rm="${it.act}">${it.icon ? `<span class="ste-row-menu-icon">${it.icon}</span>` : ''}<span>${escape(it.label)}</span></button>`;
      }).join("");
      document.body.appendChild(menu);
      const w = menu.offsetWidth || 200;
      const h = menu.offsetHeight || 200;
      const px = Math.min(window.innerWidth - w - 8, Math.max(8, x));
      const py = Math.min(window.innerHeight - h - 8, Math.max(8, y));
      menu.style.left = px + "px";
      menu.style.top = py + "px";
      _openRowMenu = menu;

      menu.querySelectorAll("[data-rm]").forEach(b => {
        b.addEventListener("click", (e) => {
          e.stopPropagation();
          const act = b.getAttribute("data-rm");
          closeRowMenu();
          handleRowMenuAction(act, { stmtId, licId, qSlug });
        });
      });
    }

    function handleRowMenuAction(act, { stmtId, licId, qSlug }) {
      if (act === "open") {
        STE.setSession({ ...STE.getSession(), viewLicenseeId: licId });
        location.hash = stmtId ? `#/sales/details/view/${stmtId}` : `#/sales/${licId}`;
        return;
      }
      if (act === "copy-id") {
        navigator.clipboard?.writeText(stmtId);
        STEApp.toast(`Copied ${stmtId}`, "info");
        return;
      }
      // For actions that need to mutate state, take the licensee + quarter
      // route which auto-loads the detail and triggers the same handlers.
      const target = (STE.get().salesStatements || []).find(s => s.id === stmtId);
      if (!target) return;
      const lic = (STE.get().licensees || []).find(l => l.id === target.licenseeId) || { id: target.licenseeId };

      if (act === "approve") {
        // Approval now invoices immediately — the "Ready for Invoicing"
        // holding state is gone. We mark the statement Invoiced, stamp the
        // approval comment, and generateInvoiceFor() attaches the actual
        // invoice record on the same mutation cycle.
        STE.mutate(s => {
          const tgt = (s.salesStatements || []).find(x => x.id === stmtId);
          if (!tgt) return;
          tgt.status = "Invoiced";
          tgt.decision = "approve";
          tgt.decisionAt = new Date().toISOString();
          tgt.comments = tgt.comments || [];
          tgt.comments.push({ author: STE.currentUser()?.name || "HQ Reviewer", role: "HQ Reviewer", at: new Date().toISOString(), body: "Approved from list — invoice generated.", kind: "approve" });
        });
        const fresh = (STE.get().salesStatements || []).find(x => x.id === stmtId);
        const invoice = fresh && !fresh.invoice ? generateInvoiceFor(fresh, lic) : null;
        STEApp.toast(
          invoice
            ? `${qDisplay(target.quarter)} approved · invoice ${invoice.number} generated.`
            : `${qDisplay(target.quarter)} approved.`,
          "success"
        );
        salesList(root);
        return;
      }
      if (act === "reject") {
        STE.setSession({ ...STE.getSession(), viewLicenseeId: licId });
        location.hash = `#/sales/${licId}/${qSlug}`;
        STEApp.toast("Add a rejection comment, then click Reject.", "info");
        return;
      }
      if (act === "reopen") {
        STE.mutate(s => {
          const tgt = (s.salesStatements || []).find(x => x.id === stmtId);
          if (tgt) tgt.status = "Pending Review";
        });
        STEApp.toast(`${qDisplay(target.quarter)} reopened for review.`, "info");
        salesList(root);
        return;
      }
      // The standalone "generate invoice" CTA is gone — approval invoices
      // immediately. Legacy callers still hitting act === "generate" fall
      // through silently.

      if (act === "download") {
        if (!target.invoice) return;
        openInvoicePrintable(target.invoice, lic, target);
        return;
      }
      if (act === "resubmit-clone") {
        // Stash the rejected statement's rows + go to the Submit New
        // Statement page for this licensee. The form's load logic picks
        // up _salesDraftCarry and pre-populates the entry table.
        _salesDraftCarry = {
          licId: licId,
          rows: (target.rows || []).map(r => ({ ...r })),
        };
        STE.setSession({ ...STE.getSession(), viewLicenseeId: licId });
        STEApp.toast(`Cloning ${target.rows ? target.rows.length : 0} rows from rejected ${qDisplay(target.quarter)}.`, "info");
        location.hash = `#/sales/${licId}`;
        return;
      }
    }

    // Wire dropdown open/close + panels
    let _openDrop = null;
    function closeDrop() {
      if (!_openDrop) return;
      const panel = _openDrop.querySelector(".ste-fdrop-panel");
      if (panel) { panel.innerHTML = ""; panel.hidden = true; }
      _openDrop.classList.remove("ste-fdrop-open");
      _openDrop = null;
    }
    document.addEventListener("click", (e) => {
      if (!_openDrop) return;
      if (e.target.closest(".ste-fdrop") === _openDrop) return;
      closeDrop();
    }, true);
    function panelFor(name) {
      if (name === "licensee") return multiCheckboxPanel(licOptions, filters.licensees, (sel) => { filters.licensees = sel; applyFilters(); }, "All Organizations");
      if (name === "quarter")  return multiCheckboxPanel(quarters,   filters.quarters,  (sel) => { filters.quarters = sel; applyFilters(); }, "All Quarters");
      if (name === "status")   return multiCheckboxPanel(statuses,   filters.statuses,  (sel) => { filters.statuses = sel; applyFilters(); }, "All Statuses");
      return null;
    }
    $$(".ste-fdrop", root).forEach(drop => {
      const btn = drop.querySelector(".ste-fdrop-btn");
      const panel = drop.querySelector(".ste-fdrop-panel");
      const name = drop.getAttribute("data-filter");
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (_openDrop === drop) { closeDrop(); return; }
        closeDrop();
        const built = panelFor(name);
        panel.innerHTML = built.html;
        built.wire(panel);
        panel.hidden = false;
        drop.classList.add("ste-fdrop-open");
        _openDrop = drop;
      });
    });

    wireRows();
    search.addEventListener("input", applyFilters);
    // Wire sortable headers
    $$("th[data-sort]", root).forEach(th => {
      th.addEventListener("click", () => {
        const k = th.getAttribute("data-sort");
        if (filters.sortBy === k) {
          if (filters.sortDir === "asc") filters.sortDir = "desc";
          else { filters.sortBy = null; filters.sortDir = "asc"; }
        } else {
          filters.sortBy = k; filters.sortDir = "asc";
        }
        applyFilters();
      });
    });
    const clearBtn = $("#ste-sl-clear", root);
    if (clearBtn) clearBtn.addEventListener("click", () => {
      search.value = "";
      filters.licensees = licOptions.map(o => o.value);
      filters.quarters = quarters.map(o => o.value);
      filters.statuses = statuses.map(o => o.value);
      closeDrop();
      applyFilters();
    });
    // Overdue banner → open the reminder modal
    const banner = $("#ste-overdue-banner", root);
    if (banner) banner.addEventListener("click", () => openOverdueReminderModal(overdue));
    // Action banner → pre-filter the table to the targeted status (e.g.
    // "Pending Review" for HQ, "Draft"/"Rejected" for licensees).
    $$("[data-act='open-stmt-queue']", root).forEach(b => b.addEventListener("click", () => {
      const status = b.getAttribute("data-status") || "";
      if (status) STE.setSession({ ...(STE.getSession() || {}), salesStatusFilter: status });
      salesList(root, isHQ, u);
    }));

    // "+ Submit New Statement" — open the upload page with the right licensee
    // preselected. Licensees get their own id wired in directly; HQ falls
    // back to the previously-viewed licensee (or the first one in the list).
    const uploadBtn = $("#ste-sl-upload-btn", root);
    if (uploadBtn) uploadBtn.addEventListener("click", () => {
      const sess = STE.getSession() || {};
      const targetId = isHQ
        ? (sess.viewLicenseeId || (lics[0] && lics[0].id))
        : (u && u.licenseeId);
      if (targetId) location.hash = "#/sales/" + targetId;
    });
    applyFilters();
  }

  // Operation Plans overdue reminder modal — same shape as the Sales
  // Statements modal, but each row shows the season + plan-submit deadline
  // instead of a quarter. Per-row "Send reminder" + a "Send all" CTA.
  function openOpPlansOverdueReminderModal(overdue) {
    if (window._steOverdueBd) { window._steOverdueBd.remove(); }
    const bd = document.createElement("div");
    bd.className = "ste-spotlight-backdrop";
    bd.innerHTML = `
      <div class="ste-modal" role="dialog" aria-label="Send operation-plan reminders" style="width:min(560px,92vw)">
        <div class="ste-modal-hd">
          <strong>Send operation-plan reminders</strong>
          <button class="ste-modal-close" data-ov="close" aria-label="Close">×</button>
        </div>
        <div class="ste-modal-body">
          <p class="ste-mini" style="margin:0 0 12px">These licensees are past the plan-submit deadline. A reminder will be emailed to each licensee admin.</p>
          <ul class="ste-overdue-list">
            ${overdue.map((o, i) => `
              <li data-i="${i}">
                <div class="ste-overdue-li-body">
                  <strong>${escape(o.licensee?.legalName || o.licenseeId)}</strong>
                  <div class="ste-mini">${escape(o.season || '')}${o.deadline ? ` · deadline ${escape(fmtDate(o.deadline))}` : ''}</div>
                </div>
                <button class="ste-btn ste-btn-ghost ste-btn-sm" data-ov-row="${i}">Send reminder</button>
              </li>`).join("")}
          </ul>
        </div>
        <div class="ste-modal-actions">
          <div style="margin-left:auto; display:flex; gap:8px">
            <button class="ste-btn ste-btn-ghost" data-ov="close">Cancel</button>
            <button class="ste-btn ste-btn-primary" data-ov="send-all">Send all reminders</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(bd);
    window._steOverdueBd = bd;
    function close() { bd.remove(); window._steOverdueBd = null; }
    bd.addEventListener("click", (e) => { if (e.target === bd) close(); });
    $$("[data-ov]", bd).forEach(b => b.addEventListener("click", (e) => {
      e.stopPropagation();
      const act = b.getAttribute("data-ov");
      if (act === "close") { close(); return; }
      if (act === "send-all") {
        STEApp.toast(`Reminder emails sent to ${overdue.length} licensee${overdue.length===1?'':'s'}`, "success");
        close();
        return;
      }
    }));
    $$("[data-ov-row]", bd).forEach(b => b.addEventListener("click", (e) => {
      e.stopPropagation();
      const i = parseInt(b.getAttribute("data-ov-row"));
      const o = overdue[i];
      STEApp.toast(`Reminder sent to ${o.licensee?.legalName || o.licenseeId}`, "success");
      b.disabled = true;
      b.textContent = "Sent ✓";
    }));
  }

  // Overdue reminder modal — list of licensees with unfiled statements + per-row "Send reminder" + "Send all".
  function openOverdueReminderModal(overdue) {
    if (window._steOverdueBd) { window._steOverdueBd.remove(); }
    const bd = document.createElement("div");
    bd.className = "ste-spotlight-backdrop";
    bd.innerHTML = `
      <div class="ste-modal" role="dialog" aria-label="Send filing reminders" style="width:min(560px,92vw)">
        <div class="ste-modal-hd">
          <strong>Send filing reminders</strong>
          <button class="ste-modal-close" data-ov="close" aria-label="Close">×</button>
        </div>
        <div class="ste-modal-body">
          <p class="ste-mini" style="margin:0 0 12px">These licensees haven't submitted their Sales Statement for the period shown. A reminder will be emailed to each licensee admin.</p>
          <ul class="ste-overdue-list">
            ${overdue.map((o, i) => `
              <li data-i="${i}">
                <div class="ste-overdue-li-body">
                  <strong>${escape(o.licensee?.legalName || o.licenseeId)}</strong>
                  <div class="ste-mini">${escape(qDisplay(o.quarter))}${o.dueAt ? ` · due ${escape(o.dueAt)}` : ''}</div>
                </div>
                <button class="ste-btn ste-btn-ghost ste-btn-sm" data-ov-row="${i}">Send reminder</button>
              </li>`).join("")}
          </ul>
        </div>
        <div class="ste-modal-actions">
          <div style="margin-left:auto; display:flex; gap:8px">
            <button class="ste-btn ste-btn-ghost" data-ov="close">Cancel</button>
            <button class="ste-btn ste-btn-primary" data-ov="send-all">Send all reminders</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(bd);
    window._steOverdueBd = bd;
    function close() { bd.remove(); window._steOverdueBd = null; }
    bd.addEventListener("click", (e) => { if (e.target === bd) close(); });
    $$("[data-ov]", bd).forEach(b => b.addEventListener("click", (e) => {
      e.stopPropagation();
      const act = b.getAttribute("data-ov");
      if (act === "close") { close(); return; }
      if (act === "send-all") {
        STEApp.toast(`Reminder emails sent to ${overdue.length} licensee${overdue.length===1?'':'s'}`, "success");
        close();
        return;
      }
    }));
    $$("[data-ov-row]", bd).forEach(b => b.addEventListener("click", (e) => {
      e.stopPropagation();
      const i = parseInt(b.getAttribute("data-ov-row"));
      const o = overdue[i];
      STEApp.toast(`Reminder sent to ${o.licensee?.legalName || o.licenseeId}`, "success");
      b.disabled = true;
      b.textContent = "Sent ✓";
    }));
  }

  function uploadLicenseePanel(lics) {
    return {
      html: `
        <div class="ste-fdrop-search">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/></svg>
          <input type="search" placeholder="Pick a licensee…" data-fdrop-q>
        </div>
        <div class="ste-fdrop-list" data-rows>
          ${lics.map(l => `<button class="ste-rel-item" style="border-radius:0; border:0; width:100%; padding:9px 14px" data-lic="${escape(l.id)}">${escape(l.legalName)}</button>`).join("")}
        </div>`,
      wire: (panel) => {
        const q = panel.querySelector("[data-fdrop-q]");
        const list = panel.querySelector("[data-rows]");
        function wireRows() {
          panel.querySelectorAll("[data-lic]").forEach(b => b.addEventListener("click", () => {
            STE.setSession({ ...STE.getSession(), viewLicenseeId: b.getAttribute("data-lic") });
            location.hash = "#/sales/" + b.getAttribute("data-lic");
          }));
        }
        wireRows();
        if (q) q.addEventListener("input", () => {
          const ql = q.value.trim().toLowerCase();
          list.innerHTML = lics.filter(l => !ql || l.legalName.toLowerCase().includes(ql))
            .map(l => `<button class="ste-rel-item" style="border-radius:0; border:0; width:100%; padding:9px 14px" data-lic="${escape(l.id)}">${escape(l.legalName)}</button>`).join("");
          wireRows();
        });
      },
    };
  }

  function renderSalesRows(rows, isHQ) {
    if (isHQ === undefined) isHQ = true;
    const colspan = isHQ ? 9 : 8;
    if (!rows.length) return `<tr><td colspan="${colspan}" class="ste-empty-cell">No statements match your filters</td></tr>`;
    return rows.map(r => {
      const statusTone =
        r.status === 'Invoiced'        ? 'ok'  :
        r.status === 'Paid'            ? 'ok'  :
        r.status === 'Rejected'        ? 'err' :
        r.status === 'Overdue'         ? 'err' :
        r.status === 'Pending Review' ? 'warn':
        'info';
      // Status column already conveys "Pending Review" — no separate
      // warn dot needed alongside it. Overdue rows surface via the banner
      // at the top of the page instead.
      const warn = '';
      const init = (r.licensee?.legalName || '').split(/\s+/).map(s => s[0]).filter(Boolean).slice(0,2).join('').toUpperCase();
      const subAt = r.submittedAt ? `<span class="ste-mini">${escape(new Date(r.submittedAt).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}))}</span>` : `<span class="ste-mini">—</span>`;
      const hasInvoice = !!r.invoice;
      const invoiceNum = r.invoice?.number || '';
      const _unreadAt = r.submittedAt || r.invoice?.generatedAt;
      // Action depends on audience: HQ acts on Pending Review;
      // licensee owes work on Draft / Rejected statements.
      const _stmtActionable = isHQ
        ? r.status === "Pending Review"
        : (r.status === "Draft" || r.status === "Rejected");
      const _unread = (window.STEUnread && STEUnread.dot("stmt", r.id, _unreadAt, _stmtActionable)) || '';
      return `
        <tr data-lic="${escape(r.licensee?.id||'')}" data-quarter="${escape(r.quarter||'')}" data-stmt="${escape(r.id||'')}" data-status="${escape(r.status||'')}" data-has-invoice="${hasInvoice ? '1' : '0'}">
          <td>${_unread}${warn}<code class="ste-code">${escape(r.id||'')}</code></td>
          <td><span class="ste-badge ste-badge-${statusTone}">${escape(r.status||'')}</span></td>
          <td><code class="ste-code">${escape(qDisplay(r.quarter))}</code></td>
          ${isHQ ? `<td>
            <div style="display:flex;gap:8px;align-items:center">
              <span class="ste-mini-avatar">${escape(init)}</span>
              <strong>${escape(r.licensee?.legalName || '—')}</strong>
            </div>
          </td>` : ''}
          <td>${r.sales != null ? gbp0(r.sales) : '<span class="ste-mini">—</span>'}</td>
          <td>${r.royalty != null ? gbp0(r.royalty) : '<span class="ste-mini">—</span>'}</td>
          <td>${r.lines != null ? r.lines : '<span class="ste-mini">—</span>'}</td>
          <td>${subAt}</td>
          <td class="ste-col-kebab">
            <button class="ste-kebab-btn" data-act="row-menu" type="button" aria-label="Row actions">⋯</button>
          </td>
        </tr>`;
    }).join("");
  }

  function renderSalesShell(lic, stmts, cur) {
    const quarters = buildQuarterOptions(stmts);
    // Default to the first quarter that can still receive a fresh submission
    // — either unfiled or only-rejected. Quarters locked by an in-flight or
    // settled statement get skipped.
    const defaultQ = quarters.find(q => !q.lockingStatus) || quarters[0];
    return `
      <div class="ste-screen-pad">
        <div class="ste-section-hd">
          <div class="ste-page-crumbs">
            <a href="#/${STE.isHQ() ? 'hq' : 'home'}">Home</a><span class="sep">/</span>
            <a href="#/sales">Sales Statements</a><span class="sep">/</span>
            <span class="cur">Submit New Statement</span>
          </div>
          <div class="ste-page-hd-row">
            <h1>Submit New Statement</h1>
            <div class="ste-hd-cta">
              <button class="ste-btn ste-btn-primary" id="ste-sales-submit-top" type="button">Preview Submission →</button>
            </div>
          </div>
        </div>

        <div class="ste-card">
          <div class="ste-card-head">
            <h3>Report Basic Info</h3>
          </div>
          <div class="ste-card-body ste-report-basic">
            ${(STE.currentUser() && STE.isHQ(STE.currentUser())) ? `
              <div class="ste-field">
                <div class="ste-lbl">Licensee</div>
                <select class="ste-input" id="ste-report-licensee">
                  ${(STE.get().licensees || []).map(l => `<option value="${escape(l.id)}" ${l.id===lic.id?'selected':''}>${escape(l.legalName)}</option>`).join("")}
                </select>
              </div>` : ''}
            <div class="ste-field">
              <div class="ste-lbl">Reporting Quarter</div>
              <select class="ste-input ste-quarter-select" id="ste-quarter-select" data-default-q="${escape(defaultQ.value)}">
                ${quarters.map(q => {
                  const note = q.lockingStatus
                    ? ` · ${q.lockingStatus.toLowerCase()} (locked)`
                    : q.rejected
                      ? ' · previous rejected — submit new'
                      : '';
                  return `<option value="${escape(q.value)}" data-year="${q.year}" data-q="${q.quarter}" data-filed="${q.filed ? '1' : '0'}" data-locking-status="${escape(q.lockingStatus || '')}" ${q.lockingStatus ? 'disabled' : ''} ${q.value === defaultQ.value ? 'selected' : ''}>${escape(q.label)}${note}</option>`;
                }).join("")}
              </select>
              <div class="ste-field-hint" id="ste-quarter-range">${quarterRange(defaultQ.year, defaultQ.quarter)}</div>
              <div class="ste-field-hint ste-field-hint-warn" id="ste-quarter-backfill" style="display:none">Supplementing an existing filing — these line items will be added to what was already submitted.</div>
            </div>
            <div class="ste-field">
              <div class="ste-lbl">Reporting Currency</div>
              <select class="ste-input" id="ste-report-currency">
                ${((STE.get().referenceData||{}).currencies || ["GBP","EUR","USD"]).map(c => `<option value="${c}" ${c === (lic.currency || "GBP") ? 'selected' : ''}>${c}</option>`).join("")}
              </select>
            </div>
            <div class="ste-field">
              <div class="ste-lbl">Exchange Rate to Contract Currency</div>
              <input class="ste-input" id="ste-report-fx" type="number" min="0" step="0.0001" value="1" placeholder="1.0000">
            </div>
          </div>
        </div>

        <div class="ste-card ste-sales-entry-card" id="ste-sales-entry-card" data-has-rows="false">
          <div class="ste-card-head">
            <h3>Sales Line Items</h3>
            <span class="ste-mini ste-card-head-meta" id="ste-sales-counts" style="margin-left:14px"></span>
            <span class="ste-mini ste-card-head-meta" id="ste-file-label" style="margin-left:14px"></span>
            <button class="ste-icon-btn ste-card-head-fullscreen" id="ste-fullscreen-toggle" type="button" title="Fullscreen" aria-label="Fullscreen" style="margin-left:auto">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8V3h5M16 3h5v5M3 16v5h5M21 16v5h-5"/></svg>
            </button>
          </div>
          <div class="ste-card-body">

            <!-- Empty state: big drop zone. Shown when no rows have been
                 imported / entered yet. -->
            <div class="ste-sales-dropzone" id="ste-drop">
              <input id="ste-file-input" type="file" accept=".xlsx,.xls,.csv" hidden>
              <div class="ste-sales-dropzone-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <div class="ste-sales-dropzone-title">Drop your XLSX or CSV here</div>
              <div class="ste-sales-dropzone-sub">or <button class="ste-btn-link" id="ste-browse" type="button">Browse files</button></div>
              <div class="ste-sales-dropzone-meta"><span class="ste-mini">.xlsx · .csv · up to 10MB</span></div>
              <div class="ste-sales-dropzone-footer">
                <button class="ste-btn-link" id="ste-download-template" type="button">Download CSV template</button>
                <span class="ste-mini" style="margin:0 6px;color:var(--ste-muted)">·</span>
                <button class="ste-btn-link" id="ste-enter-manually" type="button">Enter manually instead</button>
              </div>
            </div>

            <!-- Populated state: compact toolbar + wide line-items table. -->
            <div class="ste-sales-table-card" id="ste-sales-table-card">
              <div class="ste-sales-toolbar-compact">
                <div class="ste-sales-toolbar-spacer" style="flex:1"></div>
                <button class="ste-btn ste-btn-ghost ste-btn-mini" id="ste-clear-all" type="button" title="Discard rows and start over">Clear all</button>
                <button class="ste-icon-btn ste-fullscreen-close" id="ste-fullscreen-close" type="button" title="Exit fullscreen" aria-label="Exit fullscreen">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div class="ste-sales-table-wrap" id="ste-sales-table-wrap">
                <table class="ste-table ste-sales-table ste-resizable-table" id="ste-sales-table">
                  <colgroup id="ste-sales-colgroup">
                    <col data-key="rownum" style="width:36px">
                    <col data-key="season" style="width:90px">
                    <col data-key="invoiceNumber" style="width:120px">
                    <col data-key="category" style="width:140px">
                    <col data-key="gender" style="width:96px">
                    <col data-key="sku" style="width:130px">
                    <col data-key="description" style="width:200px">
                    <col data-key="countryOfSale" style="width:90px">
                    <col data-key="territory" style="width:96px">
                    <col data-key="customer" style="width:160px">
                    <col data-key="tier" style="width:96px">
                    <col data-key="customerType" style="width:120px">
                    <col data-key="unitGross" style="width:110px">
                    <col data-key="deductions" style="width:110px">
                    <col data-key="unitNet" style="width:110px">
                    <col data-key="qty" style="width:80px">
                    <col data-key="netSales" style="width:120px">
                    <col data-key="remove" style="width:42px">
                  </colgroup>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th><span class="ste-th-lbl">Season</span><span class="ste-col-resizer" data-col="1"></span></th>
                      <th><span class="ste-th-lbl">Invoice #</span><span class="ste-col-resizer" data-col="2"></span></th>
                      <th><span class="ste-th-lbl">Product Category</span><span class="ste-col-resizer" data-col="3"></span></th>
                      <th><span class="ste-th-lbl">Gender</span><span class="ste-col-resizer" data-col="4"></span></th>
                      <th><span class="ste-th-lbl">International Style Code</span><span class="ste-col-resizer" data-col="5"></span></th>
                      <th><span class="ste-th-lbl">Product Description</span><span class="ste-col-resizer" data-col="6"></span></th>
                      <th><span class="ste-th-lbl">Country</span><span class="ste-col-resizer" data-col="7"></span></th>
                      <th><span class="ste-th-lbl">In/Out</span><span class="ste-col-resizer" data-col="8"></span></th>
                      <th><span class="ste-th-lbl">Customer</span><span class="ste-col-resizer" data-col="9"></span></th>
                      <th><span class="ste-th-lbl">Tier</span><span class="ste-col-resizer" data-col="10"></span></th>
                      <th><span class="ste-th-lbl">Customer Type</span><span class="ste-col-resizer" data-col="11"></span></th>
                      <th style="text-align:right"><span class="ste-th-lbl">Unit Gross</span><span class="ste-col-resizer" data-col="12"></span></th>
                      <th style="text-align:right"><span class="ste-th-lbl">Deductions</span><span class="ste-col-resizer" data-col="13"></span></th>
                      <th style="text-align:right"><span class="ste-th-lbl">Unit Net</span><span class="ste-col-resizer" data-col="14"></span></th>
                      <th style="text-align:right"><span class="ste-th-lbl">Units Sold</span><span class="ste-col-resizer" data-col="15"></span></th>
                      <th style="text-align:right"><span class="ste-th-lbl">Net Sales</span></th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody id="ste-sales-tbody"></tbody>
                  <tfoot id="ste-sales-tfoot"></tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div id="ste-results"></div>
      </div>`;
  }

  function renderResults(root, st, file) {
    const target = $("#ste-results", root);
    if (!target) return;
    const lbl = $("#ste-file-label", root);
    if (file) lbl && (lbl.textContent = `${file.name} · ${(file.size/1024/1024).toFixed(2)} MB · ${st.totalLines} lines processed`);
    else lbl && (lbl.textContent = `${st.fileName} · ${st.totalLines} lines processed`);

    const errs = st.errors || [];
    const blocked = errs.length > 0;
    target.innerHTML = `
      <div class="ste-card">
        <div class="ste-card-head">
          <h3>Auto-Validation Results</h3>
          <div class="ste-mini">${st.totalLines} line items</div>
        </div>
        <div class="ste-card-body">
          <div class="ste-kpi-row">
            <div class="ste-kpi"><div class="ste-kpi-lbl">Total Lines</div><div class="ste-kpi-val">${st.totalLines}</div><div class="ste-kpi-sub">${st.validCount} valid · ${errs.length} error${errs.length===1?'':'s'}</div></div>
            <div class="ste-kpi"><div class="ste-kpi-lbl">Total Net Sales</div><div class="ste-kpi-val">${gbp0(st.licenseeNet)}</div><div class="ste-kpi-sub">Currency GBP · ECB FX 31 Mar 2026</div></div>
            <div class="ste-kpi"><div class="ste-kpi-lbl">Royalty (10%)</div><div class="ste-kpi-val">${gbp0(st.licenseeRoyalty)}</div><div class="ste-kpi-sub">Payable to HQ per § 4.2</div></div>
            <div class="ste-kpi ${blocked?'ste-kpi-err':'ste-kpi-ok'}"><div class="ste-kpi-lbl">${blocked ? 'Errors Detected' : 'Clean'}</div><div class="ste-kpi-val">${errs.length}</div><div class="ste-kpi-sub">${blocked ? 'Must be resolved' : 'No issues'}</div></div>
          </div>
          ${errs.length ? `
            <div class="ste-warn-bar">⚠ ${errs.length} item${errs.length===1?'':'s'} flagged · Variance ${pct((Math.abs(st.licenseeNet - st.axNet) / st.axNet) * 100)}. Under 0.5% threshold — submit and HQ will reconcile.</div>
            <ul class="ste-err-list">
              ${errs.map(e => `
                <li>
                  <span class="ste-err-line">Line ${e.line}</span>
                  <div class="ste-err-body">
                    <div class="ste-err-title">${e.title}</div>
                    <div class="ste-err-detail">${e.detail}</div>
                    <div class="ste-err-suggest"><strong>Suggested fix:</strong> ${e.suggestion}</div>
                  </div>
                </li>`).join("")}
            </ul>` : `
            <div class="ste-ok-bar">✓ All checks passed — ready to submit</div>`}
          <div class="ste-actions">
            <button class="ste-btn ste-btn-ghost">Save Draft</button>
            <button id="ste-submit" class="ste-btn ste-btn-primary">Submit to HQ</button>
          </div>
        </div>
      </div>`;
  }

  // ============================ INVENTORY = INVOICES ============================
  function inventory() {
    const root = PAGE_MAIN("inventory");
    if (!root) return;
    const sub = pageSubRoute("inventory") || pageSubRoute("invoices");
    if (sub && sub !== "details") {
      // sub === some statement id → invoice detail
      return invoiceDetail(root, sub);
    }
    if (sub === "details") {
      // Canonical: /invoices/details/view/<stmtId>. Legacy /details/<stmtId>
      // (no view segment) is accepted and redirected to the canonical form.
      const canonical = (location.hash || "").match(/^#\/(?:inventory|invoices)\/details\/view\/([^/]+)/i);
      if (canonical && canonical[1]) return invoiceDetail(root, decodeURIComponent(canonical[1]));
      const legacy = (location.hash || "").match(/^#\/(?:inventory|invoices)\/details\/([^/]+)/i);
      if (legacy && legacy[1]) { location.replace(`#/invoices/details/view/${encodeURIComponent(legacy[1])}`); return; }
    }
    const u = STE.currentUser();
    const isHQUser = u && STE.isHQ(u);
    const state = STE.get();
    const allStmts = state.salesStatements || [];
    const lics = state.licensees || [];

    // Invoices come from sales statements with .invoice attached. Filter by
    // licensee on the licensee side.
    const stmts = isHQUser
      ? allStmts
      : allStmts.filter(s => s.licenseeId === (u?.licenseeId));
    const invoices = stmts.filter(s => s.invoice).map(s => {
      const lic = lics.find(l => l.id === s.licenseeId) || { id: s.licenseeId, legalName: s.licenseeId };
      return { stmt: s, inv: s.invoice, lic };
    }).sort((a, b) => (b.inv.generatedAt || "").localeCompare(a.inv.generatedAt || ""));

    // Approval now invoices immediately, so there is no longer a "ready to
    // invoice" holding state. Keep an empty array so any UI guard that
    // checks `pendingGenerate.length` still works without re-wiring.
    const pendingGenerate = [];

    const totalDue = invoices.filter(i => i.inv.status !== "Paid")
      .reduce((sum, i) => sum + (i.inv.totalDue || 0), 0);
    const totalPaid = invoices.filter(i => i.inv.status === "Paid")
      .reduce((sum, i) => sum + (i.inv.totalDue || 0), 0);

    root.innerHTML = `
      <div class="ste-screen-pad ste-screen-pad-wide">
        <div class="ste-section-hd">
          <div class="ste-page-crumbs">
            <a href="#/${isHQUser ? 'hq' : 'home'}">Home</a><span class="sep">/</span><span class="cur">Invoices</span>
          </div>
          <div class="ste-page-hd-row">
            <div>
              <h1>Invoices</h1>
            </div>
            <div class="ste-hd-cta">
              <button class="ste-btn ste-btn-primary" data-act="new-invoice" type="button">+ Create New Invoice</button>
            </div>
          </div>
        </div>

        ${(() => {
          const outstanding = invoices.filter(i => i.inv && i.inv.status !== "Paid");
          if (!outstanding.length) return '';
          const totalOutstandingByCur = outstanding.reduce((acc, i) => {
            const cur = i.inv.currency || "GBP";
            acc[cur] = (acc[cur] || 0) + (i.inv.totalDue || 0);
            return acc;
          }, {});
          const fmt = Object.entries(totalOutstandingByCur).map(([cur, amt]) => {
            const sym = cur === "EUR" ? "€" : cur === "USD" ? "$" : "£";
            return `${sym}${amt.toLocaleString()}`;
          }).join(" · ");
          const headline = isHQUser
            ? `${outstanding.length} invoice${outstanding.length===1?'':'s'} awaiting payment`
            : `${outstanding.length} invoice${outstanding.length===1?'':'s'} due`;
          const sub = isHQUser
            ? `${fmt} to collect from licensees · click to filter to issued invoices`
            : `${fmt} owed · click to filter to issued invoices`;
          return `
            <button class="ste-overdue-banner ste-overdue-banner-warn" data-act="open-invoices-issued" type="button">
              <span class="ste-overdue-icon"></span>
              <span class="ste-overdue-text">
                <strong>${escape(headline)}</strong>
                <span class="ste-mini">${escape(sub)}</span>
              </span>
              <span class="ste-overdue-chev">→</span>
            </button>`;
        })()}

        <div class="ste-form-card">
          <div class="ste-filter-bar">
            <div class="ste-users-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/></svg>
              <input id="ste-invoices-search" type="search" placeholder="Search invoice #, licensee, period…">
            </div>
            <span class="ste-filter-divider" aria-hidden="true"></span>
            <div class="ste-fdrop" data-filter="status">
              <button class="ste-fdrop-btn" type="button">
                <span class="ste-fdrop-lbl">Statuses</span>
                <span class="ste-fdrop-val"></span>
                <span class="ste-fdrop-chev"></span>
              </button>
              <div class="ste-fdrop-panel" hidden></div>
            </div>
            <div class="ste-fdrop" data-filter="period">
              <button class="ste-fdrop-btn" type="button">
                <span class="ste-fdrop-lbl">Periods</span>
                <span class="ste-fdrop-val"></span>
                <span class="ste-fdrop-chev"></span>
              </button>
              <div class="ste-fdrop-panel" hidden></div>
            </div>
            ${isHQUser ? `
            <div class="ste-fdrop" data-filter="licensee">
              <button class="ste-fdrop-btn" type="button">
                <span class="ste-fdrop-lbl">Licensees</span>
                <span class="ste-fdrop-val"></span>
                <span class="ste-fdrop-chev"></span>
              </button>
              <div class="ste-fdrop-panel" hidden></div>
            </div>` : ''}
            <button class="ste-btn ste-btn-ghost ste-btn-mini" id="ste-invoices-clear" type="button">Clear</button>
            <span class="ste-mini ste-insp-filter-count" id="ste-invoices-count"><strong>${invoices.length}</strong> of ${invoices.length}</span>
          </div>
          ${invoices.length === 0 ? `
            <div class="ste-empty" style="padding:48px 24px;text-align:center;color:var(--ste-muted)">
              <p style="margin:0 0 4px;font:600 14px Inter,sans-serif;color:var(--ste-text)">No invoices yet.</p>
              <p style="margin:0;font:500 13px Inter,sans-serif">${isHQUser ? 'Approve a sales statement — the invoice is generated automatically on approval.' : 'Invoices will appear here once Sergio Tacchini Europe issues them.'}</p>
            </div>` : `
            <table class="ste-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  ${isHQUser ? '<th>Licensee</th>' : ''}
                  <th>Period</th>
                  <th>Issued</th>
                  <th>Due</th>
                  <th style="text-align:right">Amount</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${invoices.map(({ stmt, inv, lic }) => {
                  const sym = currencySymbol(inv.currency || lic.currency || "GBP");
                  const tone = inv.status === "Paid" ? "ok" : "warn";
                  // Any unpaid (Issued) invoice is the one that needs
                  // attention from either side; once Paid it falls out.
                  const _invActionable = inv.status !== "Paid";
                  const _unread = (window.STEUnread && STEUnread.dot("invoice", inv.number || stmt.id, inv.generatedAt, _invActionable)) || '';
                  return `
                    <tr data-stmt="${escape(stmt.id)}" data-lic="${escape(stmt.licenseeId)}" style="cursor:pointer">
                      <td>${_unread}<code class="ste-code">${escape(inv.number || stmt.id)}</code></td>
                      ${isHQUser ? `<td><strong>${escape(lic.legalName)}</strong></td>` : ''}
                      <td>${escape(inv.periodLabel)}</td>
                      <td>${escape(new Date(inv.generatedAt).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }))}</td>
                      <td>${escape(new Date(inv.dueDate).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }))}</td>
                      <td style="text-align:right"><strong>${sym}${Math.round(inv.totalDue || 0).toLocaleString()}</strong></td>
                      <td><span class="ste-badge ste-badge-${tone}">${escape(inv.status || 'Issued')}</span></td>
                      <td class="ste-invoice-row-actions">
                        <button class="ste-icon-btn" data-act="download" data-stmt="${escape(stmt.id)}" title="Download invoice" aria-label="Download invoice">
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        </button>
                        ${isHQUser ? (
                          inv.status === "Paid"
                            ? '<button class="ste-btn ste-btn-mini" type="button" disabled title="Already marked paid">Paid</button>'
                            : `<button class="ste-btn ste-btn-primary ste-btn-mini" data-act="mark-paid-row" data-stmt="${escape(stmt.id)}" type="button" title="Mark this invoice as paid">Mark Paid</button>`
                        ) : ''}
                      </td>
                    </tr>`;
                }).join("")}
              </tbody>
            </table>`}
        </div>
      </div>`;

    // Row click → open the sales statement
    root.querySelectorAll("tbody tr[data-stmt][data-lic]").forEach(tr => {
      tr.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        const stmtId = tr.getAttribute("data-stmt");
        const target = allStmts.find(s => s.id === stmtId);
        if (!target) return;
        location.hash = `#/sales/details/view/${stmtId}`;
      });
    });
    // Filter bar — same multi-checkbox fdrop pattern as Agreements/Sales.
    const _invStatusOpts = [
      { value: "Issued", label: "Issued" },
      { value: "Paid",   label: "Paid"   },
    ];
    const _invPeriodOpts = Array.from(new Set(invoices.map(i => i.inv.periodLabel).filter(Boolean)))
      .sort()
      .map(v => ({ value: v, label: v }));
    const _invLicOpts = isHQUser
      ? Array.from(new Set(invoices.map(i => i.lic && i.lic.id).filter(Boolean)))
          .map(id => {
            const l = lics.find(x => x.id === id) || { id, legalName: id };
            return { value: id, label: l.legalName || l.id };
          })
      : [];
    const _invFilters = {
      q: "",
      statuses: _invStatusOpts.map(o => o.value),
      periods:  _invPeriodOpts.map(o => o.value),
      licensees: _invLicOpts.map(o => o.value),
    };
    const _invCountEl = $("#ste-invoices-count", root);
    const _invSearch  = $("#ste-invoices-search", root);
    const _mLabel = (window.STEScreens && window.STEScreens.multiLabel)
      || ((sel, all) => ({ val: sel && sel.length && sel.length !== all.length ? (sel.length === 1 ? sel[0] : `${sel.length} selected`) : "", active: !!(sel && sel.length && sel.length !== all.length) }));
    function paintInvoiceLabels() {
      const drops = {
        status:   { sel: _invFilters.statuses,  all: _invStatusOpts.map(o => o.value) },
        period:   { sel: _invFilters.periods,   all: _invPeriodOpts.map(o => o.value) },
        licensee: { sel: _invFilters.licensees, all: _invLicOpts.map(o => o.value)    },
      };
      Object.entries(drops).forEach(([key, cfg]) => {
        const drop = root.querySelector(`.ste-fdrop[data-filter="${key}"]`);
        if (!drop) return;
        const info = _mLabel(cfg.sel, cfg.all);
        drop.classList.toggle("ste-filter-active", info.active);
        const v = drop.querySelector(".ste-fdrop-val");
        if (v) v.innerHTML = info.val;
      });
    }
    function applyInvoiceFilter() {
      const q = (_invSearch?.value || "").toLowerCase().trim();
      _invFilters.q = q;
      let visible = 0;
      const total = invoices.length;
      root.querySelectorAll("tbody tr[data-stmt][data-lic]").forEach((tr, i) => {
        const rec = invoices[i]; if (!rec) return;
        const status = rec.inv.status || "Issued";
        const period = rec.inv.periodLabel || "";
        const licId  = rec.lic?.id || rec.stmt.licenseeId;
        const matchesQ = !q || tr.textContent.toLowerCase().includes(q);
        const matchesS = !_invFilters.statuses.length || _invFilters.statuses.includes(status);
        const matchesP = !_invFilters.periods.length  || _invFilters.periods.includes(period);
        const matchesL = !isHQUser
          ? true
          : (!_invFilters.licensees.length || _invFilters.licensees.includes(licId));
        const show = matchesQ && matchesS && matchesP && matchesL;
        tr.style.display = show ? "" : "none";
        if (show) visible++;
      });
      if (_invCountEl) _invCountEl.innerHTML = `<strong>${visible}</strong> of ${total}`;
      paintInvoiceLabels();
    }
    _invSearch?.addEventListener("input", applyInvoiceFilter);

    // Mount the multi-checkbox panel on each fdrop click — same shape the
    // Agreements / Sales pages use, via window.STEScreens.multiCheckboxPanel.
    let _invOpenDrop = null;
    function _invCloseDrop() {
      if (!_invOpenDrop) return;
      const panel = _invOpenDrop.querySelector(".ste-fdrop-panel");
      if (panel) { panel.innerHTML = ""; panel.hidden = true; }
      _invOpenDrop.classList.remove("ste-fdrop-open");
      _invOpenDrop = null;
    }
    document.addEventListener("click", (ev) => {
      if (!_invOpenDrop) return;
      if (ev.target.closest(".ste-fdrop") === _invOpenDrop) return;
      _invCloseDrop();
    }, true);
    function _invMountDrop(drop, opts, sel, onChange, allLabel) {
      const built = window.STEScreens.multiCheckboxPanel(opts, sel, onChange, allLabel);
      const panel = drop.querySelector(".ste-fdrop-panel");
      panel.innerHTML = built.html;
      built.wire(panel);
      panel.hidden = false;
      drop.classList.add("ste-fdrop-open");
      _invOpenDrop = drop;
    }
    root.querySelectorAll(".ste-fdrop[data-filter]").forEach(drop => {
      const key = drop.getAttribute("data-filter");
      const btn = drop.querySelector(".ste-fdrop-btn");
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (_invOpenDrop === drop) { _invCloseDrop(); return; }
        _invCloseDrop();
        if (!window.STEScreens || !window.STEScreens.multiCheckboxPanel) return;
        if (key === "status") {
          _invMountDrop(drop, _invStatusOpts, _invFilters.statuses, (sel) => {
            _invFilters.statuses = sel; applyInvoiceFilter();
          }, "All Statuses");
        } else if (key === "period") {
          _invMountDrop(drop, _invPeriodOpts, _invFilters.periods, (sel) => {
            _invFilters.periods = sel; applyInvoiceFilter();
          }, "All Periods");
        } else if (key === "licensee") {
          _invMountDrop(drop, _invLicOpts, _invFilters.licensees, (sel) => {
            _invFilters.licensees = sel; applyInvoiceFilter();
          }, "All Licensees");
        }
      });
    });
    $("#ste-invoices-clear", root)?.addEventListener("click", () => {
      if (_invSearch) _invSearch.value = "";
      _invFilters.q = "";
      _invFilters.statuses  = _invStatusOpts.map(o => o.value);
      _invFilters.periods   = _invPeriodOpts.map(o => o.value);
      _invFilters.licensees = _invLicOpts.map(o => o.value);
      _invCloseDrop();
      applyInvoiceFilter();
    });
    // Outstanding-invoices banner → narrow to Issued only.
    root.querySelector('[data-act="open-invoices-issued"]')?.addEventListener("click", () => {
      _invFilters.statuses = ["Issued"];
      applyInvoiceFilter();
    });
    applyInvoiceFilter();
    // Alert click → Sales Statements list, filtered to Ready for Invoicing
    // Alert + + Create New Invoice button both open the same modal — picking from
    // the same Ready-for-Invoicing queue.
    root.querySelector('[data-act="open-ready-queue"]')?.addEventListener("click", () => openNewInvoiceModal());
    root.querySelector('[data-act="new-invoice"]')?.addEventListener("click", () => openNewInvoiceModal());
    // Download button
    root.querySelectorAll('[data-act="download"]').forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-stmt");
        const target = allStmts.find(s => s.id === id);
        if (!target || !target.invoice) return;
        const lic = lics.find(l => l.id === target.licenseeId) || { legalName: target.licenseeId };
        openInvoicePrintable(target.invoice, lic, target);
      });
    });
    // Mark Paid (HQ list row) — flips invoice.status to "Paid" inline so
    // the licensor can confirm payment without opening the detail page.
    root.querySelectorAll('[data-act="mark-paid-row"]').forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-stmt");
        STE.mutate(s => {
          const tgt = (s.salesStatements || []).find(x => x.id === id);
          if (!tgt || !tgt.invoice) return;
          tgt.invoice.status = "Paid";
          tgt.invoice.paidAt = new Date().toISOString();
          tgt.status = "Paid";
        });
        STEApp.toast("Invoice marked as paid.", "success");
        inventory();
      });
    });

    // Make rows clickable → land on the invoice detail page with the
    // letterhead preview inline.
    root.querySelectorAll("tbody tr[data-stmt][data-lic]").forEach(tr => {
      tr.style.cursor = "pointer";
      // Replace the existing handler that routed to the sales statement —
      // for an INVOICED row, we want to land on the invoice detail instead.
      tr.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        e.stopImmediatePropagation();
        const stmtId = tr.getAttribute("data-stmt");
        location.hash = `#/invoices/details/view/${encodeURIComponent(stmtId)}`;
      }, true);  // capture so we run before the earlier handler
    });
    return;
  }

  // Invoice detail — letterhead preview inline + actions (Open Printable,
  // Mark as Paid, View Source Statement).
  // New Invoice modal — pick one or more Ready-for-Invoicing statements,
  // optionally span them into a single invoice (n:1). Filtered by licensee so
  // an invoice can't mix licensees.
  function openNewInvoiceModal() {
    const state = STE.get();
    const u = STE.currentUser();
    const isHQ = u && STE.isHQ(u);
    const lics = state.licensees || [];
    const allStmts = state.salesStatements || [];
    // Approval now invoices immediately, so there's nothing left to manually
    // generate. The modal still exists so the "New Invoice" CTA + the
    // licensee-side path don't break, but it will always show the
    // empty-state copy below — invoices are auto-created on approval.
    let ready = [];
    if (ready.length === 0) {
      const m = makeModal("New Invoice", `<p style="font:500 13px Inter,sans-serif;margin:0;color:var(--ste-text)">There's nothing to invoice right now. ${isHQ ? 'Approving a sales statement now creates the invoice automatically — nothing extra to do here.' : 'A statement has to be approved by Sergio Tacchini Europe before it can be invoiced.'}</p>`, [
        { label: "Cancel", kind: "ghost", onClick: () => closeModal(m) },
        { label: "Generate Invoice", kind: "primary", disabled: true },
      ]);
      return;
    }
    // Group by licensee for selection clarity. Invoice has to be per-licensee
    // (currency + counterparty), so the selection is one licensee at a time.
    const byLic = {};
    ready.forEach(s => { (byLic[s.licenseeId] = byLic[s.licenseeId] || []).push(s); });
    const licOpts = Object.keys(byLic).map(id => {
      const lic = lics.find(l => l.id === id) || { id, legalName: id };
      return { id, lic, stmts: byLic[id].sort((a, b) => (a.quarter < b.quarter ? -1 : 1)) };
    });
    let selectedLicId = licOpts[0].id;
    let selectedStmtId = null;  // one statement → one invoice (1:1)
    const showLicPicker = licOpts.length > 1;

    const sym = (cur) => cur === "EUR" ? "€" : cur === "USD" ? "$" : "£";

    const m = makeModal("New Invoice", `
      <div style="font:500 13px Inter,sans-serif;color:var(--ste-text)">
        ${showLicPicker ? `
        <div class="ste-form-field" style="margin-bottom:14px">
          <label class="ste-lbl">Licensee</label>
          <select class="ste-input" data-new-inv-lic>
            ${licOpts.map(o => `<option value="${escape(o.id)}">${escape(o.lic.legalName)} · ${o.stmts.length} ready</option>`).join("")}
          </select>
        </div>` : ''}
        <div class="ste-form-field">
          <label class="ste-lbl">Statement to invoice</label>
          <div data-new-inv-list class="ste-form-card" style="max-height:280px;overflow-y:auto"></div>
        </div>
        <div class="ste-mini" data-new-inv-summary style="margin-top:12px;padding:10px 14px;background:rgba(10,24,50,0.09);border-radius:4px"></div>
        <div data-new-inv-spinner style="display:none;text-align:center;padding:24px 0">
          <span class="ste-spinner" aria-hidden="true"></span>
          <div class="ste-mini" style="margin-top:8px">Generating invoice…</div>
        </div>
      </div>
    `, [
      { label: "Cancel", kind: "ghost", onClick: () => closeModal(m) },
      { label: "Generate Invoice", kind: "primary", onClick: () => onGenerate() },
    ]);

    const licSel = m.querySelector("[data-new-inv-lic]");
    const list = m.querySelector("[data-new-inv-list]");
    const summary = m.querySelector("[data-new-inv-summary]");
    const spinner = m.querySelector("[data-new-inv-spinner]");
    const confirmBtn = m.querySelector(".ste-modal-foot .ste-btn-primary");

    function paintList() {
      const grp = licOpts.find(o => o.id === selectedLicId);
      if (!grp) return;
      selectedStmtId = grp.stmts[0] ? grp.stmts[0].id : null;  // default to first
      list.innerHTML = grp.stmts.map((s, i) => `
        <label class="ste-typeahead-item" style="cursor:pointer">
          <input type="radio" name="new-inv-stmt" data-stmt-id="${escape(s.id)}" ${i === 0 ? 'checked' : ''} style="margin-right:10px">
          <span class="ste-typeahead-code">${escape(qDisplay(s.quarter))}</span>
          <span class="ste-typeahead-sub">${sym(grp.lic.currency)}${Math.round(s.totalSalesGbp || 0).toLocaleString()} net · ${escape(s.id.slice(0, 14))}…</span>
        </label>`).join("");
      list.querySelectorAll("[data-stmt-id]").forEach(rb => {
        rb.addEventListener("change", () => {
          if (rb.checked) { selectedStmtId = rb.getAttribute("data-stmt-id"); paintSummary(); }
        });
      });
      paintSummary();
    }
    function paintSummary() {
      const grp = licOpts.find(o => o.id === selectedLicId);
      const s = grp.stmts.find(x => x.id === selectedStmtId);
      if (!s) { summary.innerHTML = `Select a statement.`; confirmBtn.disabled = true; return; }
      const net = s.totalSalesGbp || 0;
      const royaltyPct = s.royaltyPct || 10;
      const royalty = s.royaltyGbp || Math.round(net * (royaltyPct / 100));
      const marketingPct = s.marketingPct || 2;
      const marketing = Math.round(net * (marketingPct / 100));
      const total = royalty + marketing;
      const cur = grp.lic.currency || "GBP";
      summary.innerHTML = `Invoicing <strong>${escape(qDisplay(s.quarter))}</strong> · Net Sales <strong>${sym(cur)}${Math.round(net).toLocaleString()}</strong> · Royalty <strong>${sym(cur)}${Math.round(royalty).toLocaleString()}</strong> · Marketing <strong>${sym(cur)}${Math.round(marketing).toLocaleString()}</strong> · <strong>Total ${sym(cur)}${Math.round(total).toLocaleString()}</strong>`;
      confirmBtn.disabled = false;
    }
    function onGenerate() {
      const grp = licOpts.find(o => o.id === selectedLicId);
      const s = grp.stmts.find(x => x.id === selectedStmtId);
      if (!s) return;
      // Brief loading state so the action feels deliberate.
      spinner.style.display = "";
      list.style.opacity = "0.5";
      confirmBtn.disabled = true;
      m.querySelector(".ste-modal-foot .ste-btn-ghost").disabled = true;
      setTimeout(() => {
        const invoice = generateInvoiceForStatements([s], grp.lic);
        closeModal(m);
        if (!invoice) return;
        STEApp.toast(`Invoice ${invoice.number} generated · ${grp.lic.legalName} notified.`, "success");
        location.hash = `#/invoices/details/view/${encodeURIComponent(s.id)}`;
      }, 700);
    }

    if (licSel) licSel.addEventListener("change", () => { selectedLicId = licSel.value; paintList(); });
    paintList();
  }

  function invoiceDetail(root, stmtId) {
    const state = STE.get();
    const u = STE.currentUser();
    const isHQUser = u && STE.isHQ(u);
    const stmt = (state.salesStatements || []).find(s => s.id === stmtId);
    if (!stmt || !stmt.invoice) { location.hash = "#/inventory"; return; }
    const lic = (state.licensees || []).find(l => l.id === stmt.licenseeId) || { id: stmt.licenseeId, legalName: stmt.licenseeId };
    const inv = stmt.invoice;
    // Per-user "new" dot — clear when this user opens the invoice.
    try { window.STEUnread && STEUnread.markSeen("invoice", inv.number || stmt.id); } catch (_) {}
    const cur = inv.currency || lic.currency || "GBP";
    const sym = currencySymbol(cur);
    const fmtMoney = (v) => `${sym}${Math.round(v || 0).toLocaleString()}`;
    const issuedLbl = inv.generatedAt ? fmtDate(inv.generatedAt) : "—";
    const dueLbl = inv.dueDate ? fmtDate(inv.dueDate) : "—";
    const statusTone = inv.status === "Paid" ? "ok" : "warn";

    document.title = `${inv.number} · Invoice · Sergio Tacchini`;

    root.innerHTML = `
      <div class="ste-screen-pad">
        <div class="ste-section-hd">
          <div class="ste-page-crumbs">
            <a href="#/${isHQUser ? 'hq' : 'home'}">Home</a><span class="sep">/</span>
            <a href="#/invoices">Invoices</a><span class="sep">/</span>
            <span class="cur">${escape(inv.number)}</span>
          </div>
          <div class="ste-page-hd-row">
            <div>
              <h1>${escape(inv.number)}</h1>
              <p class="ste-page-subtitle">${escape(inv.periodLabel || '')}${isHQUser && lic ? ` · ${escape(lic.legalName)}` : ''}</p>
            </div>
            <div class="ste-hd-cta" style="display:flex;gap:8px;align-items:center">
              <a class="ste-btn ste-btn-ghost ste-btn-cancel" href="#/invoices" data-back-list>Back</a>
              <span class="ste-badge ste-badge-${statusTone}">${escape(inv.status || 'Issued')}</span>
              <button class="ste-icon-btn" data-act="open-printable" type="button" title="Download invoice" aria-label="Download invoice">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </button>
              ${isHQUser ? (
                inv.status === "Paid"
                  ? '<button class="ste-btn" type="button" disabled title="Already marked paid">Paid</button>'
                  : `<button class="ste-btn ste-btn-primary" data-act="mark-paid" type="button">Mark Paid</button>`
              ) : ''}
            </div>
          </div>
        </div>

        <div class="ste-invoice-preview">
          <div class="ste-invoice-hd">
            <div>
              <h2 class="ste-invoice-title">INVOICE</h2>
              <div class="ste-invoice-num">${escape(inv.number)}</div>
            </div>
            <div style="text-align:right">
              <div class="ste-invoice-brand-name">SERGIO TACCHINI EUROPE</div>
              <div class="ste-invoice-brand-sub">Licensing Operations</div>
            </div>
          </div>

          <div class="ste-invoice-parties">
            <div>
              <h4>Bill To</h4>
              <strong>${escape(lic.legalName || '')}</strong>
              ${lic.address ? `
                ${lic.address.street1 ? `<div class="ste-mini">${escape(lic.address.street1)}</div>` : ''}
                ${lic.address.street2 ? `<div class="ste-mini">${escape(lic.address.street2)}</div>` : ''}
                ${(lic.address.city || lic.address.postalCode) ? `<div class="ste-mini">${escape([lic.address.postalCode, lic.address.city, lic.address.state].filter(Boolean).join(' '))}</div>` : ''}
                ${lic.address.country ? `<div class="ste-mini">${escape(lic.address.country)}</div>` : ''}
                ${lic.address.vatId ? `<div class="ste-mini">VAT: ${escape(lic.address.vatId)}</div>` : ''}
              ` : ''}
            </div>
            <div>
              <h4>Issued By</h4>
              <strong>Sergio Tacchini Europe SpA</strong>
              <div class="ste-mini">Licensing &amp; Royalty Operations</div>
            </div>
          </div>

          <div class="ste-invoice-meta">
            <div><span>Invoice No</span><strong>${escape(inv.number)}</strong></div>
            <div><span>Period</span><strong>${escape(inv.periodLabel)}</strong></div>
            <div><span>Issued</span><strong>${escape(issuedLbl)}</strong></div>
            <div><span>Due (${escape(inv.paymentTerms || 'Net 30')})</span><strong>${escape(dueLbl)}</strong></div>
          </div>

          <table class="ste-invoice-line-table">
            <thead><tr><th>Description</th><th style="text-align:right">Base</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr></thead>
            <tbody>
              <tr>
                <td><strong>Royalty</strong><div class="ste-mini">on net sales for ${escape(inv.periodLabel)}</div></td>
                <td style="text-align:right">${fmtMoney(inv.netSales)}</td>
                <td style="text-align:right">${inv.royaltyPct}%</td>
                <td style="text-align:right">${fmtMoney(inv.royaltyAmount)}</td>
              </tr>
              ${inv.marketingAmount ? `
              <tr>
                <td><strong>Marketing Contribution</strong><div class="ste-mini">on net sales for ${escape(inv.periodLabel)}</div></td>
                <td style="text-align:right">${fmtMoney(inv.netSales)}</td>
                <td style="text-align:right">${inv.marketingPct}%</td>
                <td style="text-align:right">${fmtMoney(inv.marketingAmount)}</td>
              </tr>` : ''}
              <tr class="ste-invoice-total">
                <td colspan="3" style="text-align:right">Total Due (${escape(cur)})</td>
                <td style="text-align:right"><strong>${fmtMoney(inv.totalDue)}</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="ste-invoice-foot ste-mini">
            <p>From ${(() => {
              const allStmts = state.salesStatements || [];
              const covered = (inv.statementIds && inv.statementIds.length)
                ? inv.statementIds.map(id => allStmts.find(s => s.id === id)).filter(Boolean)
                : [stmt];
              const links = covered.map(s => `<a href="#/sales/${escape(s.licenseeId)}/${escape(quarterToSlug(s.quarter))}">${escape(qDisplay(s.quarter))}</a>`);
              if (links.length === 1) return `sales statement ${links[0]}.`;
              return `${links.length} sales statements: ${links.join(", ")}.`;
            })()}</p>
          </div>
        </div>
      </div>`;

    root.querySelector('[data-act="open-printable"]')?.addEventListener("click", () => {
      openInvoicePrintable(inv, lic, stmt);
    });
    root.querySelector('[data-act="mark-paid"]')?.addEventListener("click", () => {
      STE.mutate(s => {
        const t = (s.salesStatements || []).find(x => x.id === stmt.id);
        if (t && t.invoice) {
          t.invoice.status = "Paid";
          t.invoice.paidAt = new Date().toISOString();
          t.status = "Paid";
        }
      });
      STEApp.toast(`Payment received recorded for invoice ${inv.number}`, "success");
      invoiceDetail(root, stmtId);
    });
  }

  // Legacy reconciliation page — kept as a private helper, no longer routed.
  function _legacyInventory_DEAD() {
    const root = PAGE_MAIN("inventory");
    if (!root) return;
    const lic = STE.currentLicensee();
    const st = STE.get().currentStatement;
    const settlement = STE.get().currentSettlement;
    if (!st || !settlement) return;

    const variance = STEValidate.round(st.licenseeNet - st.axNet, 2);
    const variancePct = st.axNet ? Math.abs(variance) / st.axNet * 100 : 0;
    const dir = variance > 0 ? "Licensee higher" : variance < 0 ? "AX AI higher" : "match";
    const recommended = variancePct <= 0.5;

    root.innerHTML = `
      <div class="ste-screen-pad">
        <div class="ste-section-hd">
          <div class="ste-page-crumbs">
            <a href="#/${STE.isHQ() ? 'hq' : 'home'}">Home</a><span class="sep">/</span><span class="cur">Invoice</span>
          </div>
          <div class="ste-page-hd-row">
            <div>
              <h1>Invoice — ${escape(lic.legalName)} ${escape(qDisplay(st.quarter))}</h1>
            </div>
            <div class="ste-hd-cta">
              ${licenseeFilter()}
              <span class="ste-badge ste-badge-warn">${settlement.status}</span>
              <button class="ste-btn ste-btn-ghost">Export PDF</button>
              <button class="ste-btn ste-btn-ghost">Open Audit Trail</button>
            </div>
          </div>
        </div>

        <div class="ste-meta-strip">
          <div><span class="ste-mini">Licensee</span><strong>${escape(lic.legalName)}</strong></div>
          <div><span class="ste-mini">Period</span><strong>${escape(qDisplay(st.quarter))}</strong></div>
          <div><span class="ste-mini">Currency</span><strong>${lic.currency} · ECB FX 31 Mar 2026</strong></div>
          <div><span class="ste-mini">Reviewer</span><strong>Min Jung</strong></div>
          <div><span class="ste-mini">SLA</span><strong>Decision due ${fmtDate(settlement.slaDueAt)}</strong></div>
        </div>

        <div class="ste-card">
          <div class="ste-card-head">
            <h3>Dual Verification — Licensee vs. AX AI</h3>
            <div class="ste-mini">${(st.errors||[]).length} line${(st.errors||[]).length===1?'':'s'} variance · ${gbp(Math.abs(variance))} gap (${variancePct.toFixed(2)}%)</div>
          </div>
          <div class="ste-dual">
            <div class="ste-side ste-side-licensee">
              <div class="ste-side-hd">Licensee Reported<span>${escape(lic.legalName)} · ${escape(st.fileName||'')}</span></div>
              <table class="ste-num-table">
                <tr><td>Net Sales</td><td>${gbp(st.licenseeNet)}</td></tr>
                <tr><td>Royalty @ 10.0%</td><td>${gbp(st.licenseeRoyalty)}</td></tr>
                <tr><td>Marketing Contribution @ 2.0%</td><td>${gbp(st.licenseeNet * 0.02)}</td></tr>
                <tr><td>Advertising Spend Required @ 2.0%</td><td>${gbp(st.licenseeNet * 0.02)}</td></tr>
                <tr class="total"><td>Total Payable to HQ</td><td>${gbp(st.licenseeRoyalty + st.licenseeNet * 0.04)}</td></tr>
              </table>
              <div class="ste-side-foot">Filed ${fmtDateTime(st.submittedAt)} · ${st.totalLines} line items</div>
            </div>
            <div class="ste-vs">VS<br><span>${(st.errors||[]).length} deltas</span></div>
            <div class="ste-side ste-side-ax">
              <div class="ste-side-hd">AX AI Calculated<span>Auto-recompute v2.4 · Style Code master + ECB FX</span></div>
              <table class="ste-num-table">
                <tr><td>Net Sales</td><td>${gbp(st.axNet)}<span class="ste-delta">${(variance===0?"":(variance>0?"−":"+"))}${gbp0(Math.abs(variance))}</span></td></tr>
                <tr><td>Royalty @ 10.0%</td><td>${gbp(st.axRoyalty)}</td></tr>
                <tr><td>Marketing Contribution @ 2.0%</td><td>${gbp(st.axNet * 0.02)}</td></tr>
                <tr><td>Advertising Spend Required @ 2.0%</td><td>${gbp(st.axNet * 0.02)}</td></tr>
                <tr class="total"><td>Total Payable to HQ</td><td>${gbp(st.axRoyalty + st.axNet * 0.04)}</td></tr>
              </table>
              <div class="ste-side-foot">Calculated ${fmtDateTime(st.uploadedAt)} · ${st.totalLines} lines · ${(st.errors||[]).length} anomalies</div>
            </div>
          </div>

          <div class="ste-variance-stats">
            <div><div class="ste-mini">Lines With Variance</div><strong>${(st.errors||[]).length} / ${st.totalLines}</strong></div>
            <div><div class="ste-mini">Total Variance</div><strong>${gbp(Math.abs(variance))}</strong></div>
            <div><div class="ste-mini">Variance Direction</div><strong>${dir}</strong></div>
            <div><div class="ste-mini">Variance %</div><strong>${variancePct.toFixed(2)}%</strong></div>
          </div>

          ${(st.errors||[]).length ? `
            <table class="ste-var-table">
              <thead><tr><th>Line</th><th>Reason (auto-analyzed)</th><th>Licensee</th><th>AX AI</th><th>Δ</th></tr></thead>
              <tbody>
                ${st.errors.map(e => `
                  <tr>
                    <td><strong>${e.line}</strong></td>
                    <td><div>${e.title}</div><div class="ste-mini">${e.detail}</div></td>
                    <td>${gbp(e.licensee || 0)}</td>
                    <td>${gbp(e.ax || 0)}</td>
                    <td>${gbp(Math.abs((e.licensee||0) - (e.ax||0)))}</td>
                  </tr>`).join("")}
              </tbody>
            </table>` : ""}
        </div>

        <div class="ste-card">
          <div class="ste-card-head">
            <h3>Reviewer Decision</h3>
            <div class="ste-mini">${gbp(Math.abs(variance))} variance</div>
          </div>
          <div class="ste-decisions">
            <button class="ste-decision" data-decision="accept">
              <div class="ste-decision-title">Accept Variance — Forward to HQ Review</div>
              <div class="ste-decision-sub">Acknowledge the licensee figures and route to Finance for second-line approval.</div>
            </button>
            <button class="ste-decision" data-decision="request">
              <div class="ste-decision-title">Request Licensee Review</div>
              <div class="ste-decision-sub">Send the flagged lines back to ${escape(lic.legalName)} with reviewer comments. Re-submission required within 7 days.</div>
            </button>
            <button class="ste-decision ${recommended?'ste-decision-rec':''}" data-decision="mutual">
              <div class="ste-decision-title">Mutual Agreement — Auto-Invoice</div>
              <div class="ste-decision-sub">Confirm AX AI figures (${gbp(st.axRoyalty)}). Invoice generates and registers into AR automatically.</div>
              ${recommended ? `<div class="ste-decision-flag">▲ Recommended · variance under threshold (≤ 0.5%)</div>` : ""}
            </button>
          </div>
        </div>

        <div id="ste-invoice-flow" class="ste-invoice-flow" hidden>
          <div class="ste-card-head"><h3>Auto-Invoice Flow</h3></div>
          <ol class="ste-steps-vert">
            <li data-step="1"><span class="ste-step-num">1</span><div><strong>Mutual Agreement</strong><div class="ste-mini">recorded</div></div><span class="ste-step-stat">✓</span></li>
            <li data-step="2"><span class="ste-step-num">2</span><div><strong>Invoice Auto-Generated (PDF)</strong><div class="ste-mini">~30s</div></div><span class="ste-step-stat">…</span></li>
            <li data-step="3"><span class="ste-step-num">3</span><div><strong>Accounting System Registered (AR)</strong><div class="ste-mini">SAP S/4HANA</div></div><span class="ste-step-stat">…</span></li>
            <li data-step="4"><span class="ste-step-num">4</span><div><strong>Licensee Notified · Payment Tracking</strong><div class="ste-mini">Net 30</div></div><span class="ste-step-stat">…</span></li>
          </ol>
        </div>
      </div>`;

    $$(".ste-decision", root).forEach(b => {
      b.addEventListener("click", () => onDecision(b.getAttribute("data-decision"), root, st, lic));
    });
    wireLicenseeFilter(root, inventory);
  }

  function onDecision(decision, root, st, lic) {
    if (decision === "accept") {
      STE.mutate(s => {
        s.currentSettlement.decision = "accept";
        s.currentSettlement.status = "Forwarded to HQ Finance";
      });
      STEApp.toast("Variance accepted — forwarded to Finance for second-line review", "info");
    } else if (decision === "request") {
      STE.mutate(s => {
        s.currentSettlement.decision = "request_review";
        s.currentSettlement.status = "Returned to licensee";
        s.currentStatement.status = "Returned for re-submission";
      });
      STEApp.toast("Returned to licensee — 7 days to re-submit", "warn");
    } else if (decision === "mutual") {
      STE.mutate(s => {
        s.currentSettlement.decision = "mutual";
        s.currentSettlement.status = "Auto-Invoice in progress";
      });
      runInvoiceFlow(root, st, lic);
    }
  }

  function runInvoiceFlow(root, st, lic) {
    const flow = $("#ste-invoice-flow", root);
    if (!flow) return;
    flow.hidden = false;
    flow.scrollIntoView({behavior: "smooth", block: "center"});
    const steps = $$("[data-step]", flow);
    const stepMs = [600, 1400, 1800, 900];
    steps.forEach(li => { const s = li.querySelector(".ste-step-stat"); if (s) s.textContent = "…"; });
    steps[0].querySelector(".ste-step-stat").textContent = "✓";
    let i = 1;
    const advance = () => {
      if (i >= steps.length) {
        STE.mutate(s => {
          s.currentSettlement.status = "Settled · Net 30 tracking";
          s.currentStatement.status = "Approved";
          // Persist into salesStatements
          const newSt = {
            id: s.currentStatement.id,
            licenseeId: s.currentStatement.licenseeId,
            quarter: s.currentStatement.quarter,
            fileName: s.currentStatement.fileName,
            submittedAt: s.currentStatement.submittedAt,
            totalSalesGbp: s.currentStatement.axNet,
            royaltyGbp: s.currentStatement.axRoyalty,
            status: "Approved",
          };
          if (!s.salesStatements.find(x => x.id === newSt.id)) s.salesStatements.unshift(newSt);
        });
        STEApp.toast(`Invoice for ${lic.legalName} · Q1 2026 registered in SAP S/4HANA · Net 30`, "success");
        return;
      }
      const cur = steps[i];
      cur.querySelector(".ste-step-stat").textContent = "✓";
      i++;
      setTimeout(advance, stepMs[i] || 1000);
    };
    setTimeout(advance, stepMs[0]);
  }

  // ============================ DESIGN APPROVAL ============================
  // ============================ DESIGN APPROVAL LIST (HQ) ============================
  function designList(root) {
    const state = STE.get();
    const lics = state.licensees || [];
    const findLic = (id) => lics.find(x => x.id === id);
    const allDesigns = state.designs || [];

    // Build rows with cross-references
    let rows = allDesigns.map(d => {
      const lic = findLic(d.licenseeId);
      const stageOrder = { "HQ Review": 1, "Sample Inspection": 2, "Production Cleared": 3, "Rejected": 99, "Licensee Upload": 0 };
      return {
        id: d.id, design: d,
        submissionId: d.submissionId,
        licensee: lic,
        season: d.season, category: d.category,
        name: d.name, version: d.version,
        aiGrade: d.aiGrade, aiScore: d.aiScore,
        stage: d.stage || "HQ Review",
        stageRank: stageOrder[d.stage || "HQ Review"] || 0,
        violations: (d.violations || []).length,
        uploadedAt: d.uploadedAt,
        hasSample: !!d.sampleStage,
        prodCode: d.sampleStage && d.sampleStage.productionCode ? d.sampleStage.productionCode.code : null,
      };
    });

    // Default sort: newest upload first
    let sortBy = "uploadedAt", sortDir = "desc";
    let stageFilter = "all"; // all | review | sample | cleared | rejected
    let qText = "";

    function getKey(r, k) {
      if (k === "licensee") return r.licensee?.legalName || "";
      if (k === "uploadedAt") return r.uploadedAt || "";
      if (k === "stage") return r.stageRank;
      if (k === "aiGrade") return r.aiGrade || "";
      if (k === "violations") return r.violations;
      return r[k] || "";
    }

    function paint() {
      const filtered = rows
        .filter(r => stageFilter === "all" ||
          (stageFilter === "review" && r.stage === "HQ Review") ||
          (stageFilter === "sample" && r.stage === "Sample Inspection") ||
          (stageFilter === "cleared" && r.stage === "Production Cleared") ||
          (stageFilter === "rejected" && r.stage === "Rejected"))
        .filter(r => !qText || [r.id, r.name, r.category, r.licensee?.legalName, r.season]
          .filter(Boolean)
          .some(v => String(v).toLowerCase().includes(qText.toLowerCase())));
      filtered.sort((a, b) => {
        const av = getKey(a, sortBy), bv = getKey(b, sortBy);
        const cmp = (typeof av === "number" && typeof bv === "number") ? (av - bv) : String(av).localeCompare(String(bv));
        return sortDir === "asc" ? cmp : -cmp;
      });

      const stageCount = (key) => rows.filter(r =>
        key === "all" ? true :
        key === "review" ? r.stage === "HQ Review" :
        key === "sample" ? r.stage === "Sample Inspection" :
        key === "cleared" ? r.stage === "Production Cleared" :
        key === "rejected" ? r.stage === "Rejected" : false
      ).length;

      root.innerHTML = `
        <div class="ste-screen-pad">
          <div class="ste-section-hd">
            <div class="ste-page-crumbs"><a href="#/home">Home</a><span class="sep">/</span><span class="cur">Design Approvals</span></div>
            <div class="ste-page-hd-row">
              <div>
                <h1>Design Approvals</h1>
              </div>
              <div class="ste-hd-cta">
                <input class="ste-input ste-search" id="ste-design-q" type="search" placeholder="Search ID, name, licensee…" value="${escape(qText)}" style="min-width:240px">
              </div>
            </div>
          </div>

          <div class="ste-stage-chips">
            ${[
              ["all",      "All",                 stageCount("all")],
              ["review",   "HQ Review",          stageCount("review")],
              ["sample",   "Sample Inspection",   stageCount("sample")],
              ["cleared",  "Production Cleared",  stageCount("cleared")],
              ["rejected", "Rejected",            stageCount("rejected")],
            ].map(([k, label, n]) => `
              <button class="ste-stage-chip ${stageFilter === k ? 'active' : ''}" data-stage="${k}">
                ${escape(label)}<span class="ste-stage-chip-n">${n}</span>
              </button>`).join("")}
          </div>

          <div class="ste-card" style="padding:0">
            <table class="ste-table ste-doc-table">
              <thead>
                <tr>
                  <th style="width:64px"></th>
                  <th class="ste-th-sort" data-sort="licensee">Licensee${sortArrow("licensee")}</th>
                  <th class="ste-th-sort" data-sort="id">Design${sortArrow("id")}</th>
                  <th>Category</th>
                  <th>Season · Ver</th>
                  <th class="ste-th-sort" data-sort="aiGrade" style="text-align:center">AI${sortArrow("aiGrade")}</th>
                  <th class="ste-th-sort" data-sort="violations" style="text-align:center">Flags${sortArrow("violations")}</th>
                  <th class="ste-th-sort" data-sort="stage">Stage${sortArrow("stage")}</th>
                  <th class="ste-th-sort" data-sort="uploadedAt">Submitted${sortArrow("uploadedAt")}</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.length === 0
                  ? `<tr><td colspan="9" class="ste-empty"><em>No design submissions match the current filters.</em></td></tr>`
                  : filtered.map(r => `
                  <tr class="ste-doc-row" data-row-design="${escape(r.id)}" data-row-lic="${escape(r.licensee?.id || '')}">
                    <td><span class="ste-doc-thumb"><img src="${escape(r.design.image || '')}" alt=""></span></td>
                    <td><strong>${escape(r.licensee?.legalName || '—')}</strong></td>
                    <td>
                      <div><strong>${escape(r.submissionId || r.id)}</strong></div>
                      <div class="ste-mini">${escape(r.name || '')}</div>
                    </td>
                    <td>${escape(r.category || '')}</td>
                    <td>${escape(r.season || '')} · ${escape(r.version || '')}</td>
                    <td style="text-align:center"><span class="ste-grade-pill ste-grade-${(r.aiGrade||'').toLowerCase()}">${escape(r.aiGrade || '—')}</span><div class="ste-mini">${r.aiScore || '—'}/100</div></td>
                    <td style="text-align:center">${r.violations > 0 ? `<span class="ste-flag-pill">${r.violations}</span>` : `<span class="ste-mini">—</span>`}</td>
                    <td>${stageBadge(r.stage, r.prodCode)}</td>
                    <td>${fmtDate(r.uploadedAt)}</td>
                  </tr>`).join("")}
              </tbody>
            </table>
          </div>
        </div>`;

      // Search
      const search = $("#ste-design-q", root);
      if (search) search.addEventListener("input", () => { qText = search.value; paint(); search.focus(); });
      // Stage chips
      root.querySelectorAll("[data-stage]").forEach(b => {
        b.addEventListener("click", () => { stageFilter = b.getAttribute("data-stage"); paint(); });
      });
      // Sort headers
      root.querySelectorAll(".ste-th-sort").forEach(th => {
        th.addEventListener("click", () => {
          const k = th.getAttribute("data-sort");
          if (sortBy === k) sortDir = sortDir === "asc" ? "desc" : "asc";
          else { sortBy = k; sortDir = "asc"; }
          paint();
        });
      });
      // Row click → open detail
      root.querySelectorAll(".ste-doc-row").forEach(tr => {
        tr.addEventListener("click", () => {
          const designId = tr.getAttribute("data-row-design");
          const licId = tr.getAttribute("data-row-lic");
          STE.setSession({ ...STE.getSession(), viewLicenseeId: licId, activeDesignId: designId });
          location.hash = `#/design/${licId}`;
        });
      });
    }

    function sortArrow(k) {
      if (sortBy !== k) return ' <span class="ste-sort-arrow">↕</span>';
      return sortDir === "asc" ? ' <span class="ste-sort-arrow active">↑</span>' : ' <span class="ste-sort-arrow active">↓</span>';
    }
    function stageBadge(stage, prodCode) {
      if (stage === "Production Cleared") return `<span class="ste-badge ste-badge-ok">${escape(stage)}</span>${prodCode ? `<div class="ste-mini">${escape(prodCode)}</div>` : ''}`;
      if (stage === "Sample Inspection") return `<span class="ste-badge ste-badge-info">${escape(stage)}</span>`;
      if (stage === "HQ Review") return `<span class="ste-badge ste-badge-warn">${escape(stage)}</span>`;
      if (stage === "Rejected") return `<span class="ste-badge ste-badge-err">${escape(stage)}</span>`;
      return `<span class="ste-badge">${escape(stage || '—')}</span>`;
    }

    paint();
  }

  function design() {
    const root = PAGE_MAIN("design");
    if (!root) return;
    const u = STE.currentUser();
    const isHQ = u && STE.isHQ(u);
    const sub = pageSubRoute("design");
    // HQ + no sub-route → document-centric list of all design submissions.
    if (isHQ && !sub) { designList(root); return; }
    if (sub) STE.setSession({ ...STE.getSession(), viewLicenseeId: sub });
    let lic = STE.currentLicensee();
    const season = STE.selectors().currentSeason();
    let designs = STE.selectors().designs(lic.id, season.code);
    // If the current licensee has no designs for this season, auto-pivot to
    // the first licensee that does so HQ users always land on real samples.
    if (!designs.length && STE.isHQ(STE.currentUser())) {
      const fallback = (STE.get().licensees || []).find(l => {
        return STE.selectors().designs(l.id, season.code).length > 0;
      });
      if (fallback) {
        STE.setSession({ ...STE.getSession(), viewLicenseeId: fallback.id });
        lic = fallback;
        designs = STE.selectors().designs(lic.id, season.code);
      }
    }
    if (!designs.length) {
      root.innerHTML = `
        <div class="ste-screen-pad">
          <div class="ste-section-hd">
            <div class="ste-page-crumbs"><a href="#/${STE.isHQ() ? 'hq' : 'home'}">Home</a><span class="sep">/</span><span class="cur">Design Approvals</span></div>
            <div class="ste-page-hd-row">
              <div>
                <h1>Design Approvals — ${escape(lic.legalName)}</h1>
                <p>${escape(lic.legalName)} has no design submissions yet for ${escape(season.code)}.</p>
              </div>
              <div class="ste-hd-cta">${licenseeFilter()}</div>
            </div>
          </div>
          <div class="ste-card"><div class="ste-card-body ste-empty"><h3>No design submissions yet</h3></div></div>
        </div>`;
      wireLicenseeFilter(root, design);
      return;
    }

    const session = STE.getSession() || {};
    const activeId = session.activeDesignId && designs.find(d => d.id === session.activeDesignId) ? session.activeDesignId : designs[0].id;
    const active = designs.find(d => d.id === activeId);
    const similar = STE.selectors().similarApproved();

    root.innerHTML = `
      <div class="ste-screen-pad">
        <div class="ste-section-hd">
          <div class="ste-page-crumbs">
            <a href="#/${STE.isHQ() ? 'hq' : 'home'}">Home</a>
            <span class="sep">/</span>
            <span class="cur">Design Approval</span>
          </div>
          <div class="ste-page-hd-row">
            <div>
              <h1>Design Approval — ${escape(lic.legalName)} · ${escape(season.code)} ${escape(active.category)}</h1>
            </div>
            <div class="ste-hd-cta">
              ${licenseeFilter()}
              <span class="ste-badge ste-badge-warn">${active.stage} · D-100</span>
              <button class="ste-btn ste-btn-ghost">Brand Direction</button>
            </div>
          </div>
        </div>

        <div class="ste-design-grid">
          <div class="ste-design-list">
            <div class="ste-card-head"><h3>Submitted Designs</h3><div class="ste-mini">${designs.length} CADs</div></div>
            <div class="ste-design-thumbs">
              ${designs.map(d => `
                <button class="ste-thumb ${d.id===activeId?'active':''}" data-design="${d.id}">
                  <span class="ste-thumb-img"><img src="${d.image}" alt=""></span>
                  <span class="ste-thumb-grade ste-grade-${d.aiGrade.toLowerCase()}">${d.aiGrade}</span>
                  <span class="ste-thumb-meta">
                    <strong>${d.id}</strong>
                    <span>${d.name}</span>
                    <span class="ste-mini">${d.category}</span>
                  </span>
                </button>`).join("")}
            </div>
          </div>

          <div class="ste-design-viewer">
            <div class="ste-viewer-hd">
              <div>
                <strong>${active.name}</strong>
                <div class="ste-mini">${active.id} · ${active.version} · uploaded ${fmtDateTime(active.uploadedAt)}</div>
              </div>
              <div class="ste-grade-big ste-grade-${active.aiGrade.toLowerCase()}">${active.aiGrade}<span>${active.aiScore}/100</span></div>
            </div>
            <div class="ste-cad-stage">
              <img src="${active.image}" alt="${active.name}">
              ${(active.violations || []).map((v, i) => `
                <div class="ste-overlay ste-overlay-${v.type}" style="left:${v.anchor.x}%;top:${v.anchor.y}%" title="${v.title}">
                  <span class="ste-overlay-num">${i+1}</span>
                  <span class="ste-overlay-label">${v.type.toUpperCase()}</span>
                </div>`).join("")}
            </div>
            <div class="ste-violations">
              <h4>Violations & Improvement Suggestions <span class="ste-mini">${active.violations.length} flagged</span></h4>
              ${active.violations.length === 0 ? `<div class="ste-ok-bar">✓ No violations — design meets ${season.code} Brand Direction</div>` :
                active.violations.map((v, i) => `
                  <div class="ste-violation">
                    <div class="ste-violation-num">${i+1}</div>
                    <div>
                      <div class="ste-violation-title">${v.title}</div>
                      <div class="ste-violation-detail">${v.detail}</div>
                      <div class="ste-violation-suggest"><strong>Suggested fix:</strong> ${v.suggestion}</div>
                    </div>
                  </div>`).join("")}
            </div>
          </div>
        </div>

        <div class="ste-card">
          <div class="ste-card-head"><h3>HQ Approval Decision</h3><div class="ste-mini">Final call · Brand Director · audit-logged</div></div>
          <div class="ste-decisions">
            <button class="ste-decision" data-d-action="approve">
              <div class="ste-decision-title">Approve</div>
              <div class="ste-decision-sub">Promote to Brand Director final review</div>
            </button>
            <button class="ste-decision" data-d-action="revise">
              <div class="ste-decision-title">Request Revision</div>
              <div class="ste-decision-sub">Return to ${escape(lic.legalName)} with markup &amp; comments</div>
            </button>
            <button class="ste-decision" data-d-action="reject">
              <div class="ste-decision-title">Reject</div>
              <div class="ste-decision-sub">Cannot proceed under ${season.code} direction</div>
            </button>
          </div>
        </div>

        <div class="ste-card">
          <div class="ste-card-head"><h3>Similar Approved Cases</h3><div class="ste-mini">${similar.length} closest matches · cosine 0.82+</div></div>
          <div class="ste-similar">
            ${similar.map(s => `
              <div class="ste-similar-card">
                <img src="${s.image}" alt="">
                <div><strong>${s.id}</strong><div class="ste-mini">${s.name}</div><div class="ste-mini">cosine ${s.cosine}</div></div>
              </div>`).join("")}
          </div>
        </div>

        ${renderSampleStage(active)}

        <div class="ste-card">
          <div class="ste-card-head"><h3>Approval Workflow</h3></div>
          <ol class="ste-workflow">
            <li class="done"><span>1</span><div><strong>Licensee Upload</strong><div class="ste-mini">${fmtDate(active.uploadedAt)} · ${escape(lic.legalName)}</div></div></li>
            <li class="done"><span>2</span><div><strong>AI Pre-screening</strong><div class="ste-mini">${fmtDate(active.uploadedAt)} · 4.2s</div></div></li>
            <li class="${active.sampleStage ? 'done' : 'active'}"><span>3</span><div><strong>HQ Review</strong><div class="ste-mini">${active.sampleStage ? 'CAD approved · ' + fmtDate(active.uploadedAt) : 'D-100 · in progress'}</div></div></li>
            <li class="${active.sampleStage && active.sampleStage.shipment ? 'done' : (active.sampleStage ? 'active' : '')}"><span>4</span><div><strong>Sample Shipment</strong><div class="ste-mini">${active.sampleStage && active.sampleStage.shipment ? 'Received ' + fmtDate(active.sampleStage.shipment.receivedAt) : 'D-70'}</div></div></li>
            <li class="${active.sampleStage && active.sampleStage.humanCheck && active.sampleStage.humanCheck.completedAt ? 'done' : (active.sampleStage ? 'active' : '')}"><span>5</span><div><strong>AI + Human Sample Inspection</strong><div class="ste-mini">Delta-E · silhouette · stitching · hand-feel</div></div></li>
            <li class="${active.sampleStage && active.sampleStage.productionCode ? 'done' : ''}"><span>6</span><div><strong>Production Code Issuance</strong><div class="ste-mini">${active.sampleStage && active.sampleStage.productionCode ? active.sampleStage.productionCode.code : 'Pending sample pass'}</div></div></li>
            <li><span>7</span><div><strong>Production Release</strong><div class="ste-mini">${season.code} line</div></div></li>
          </ol>
        </div>
      </div>`;

    // Wire thumbnail switching
    $$(".ste-thumb", root).forEach(t => {
      t.addEventListener("click", () => {
        const id = t.getAttribute("data-design");
        STE.setSession({ ...STE.getSession(), activeDesignId: id });
        design();
      });
    });

    // Wire sample-stage human inspection + production code issuance
    const completeBtn = $("[data-sample-complete]", root);
    if (completeBtn) completeBtn.addEventListener("click", () => {
      STE.mutate(s => {
        const d = s.designs.find(x => x.id === active.id);
        if (d && d.sampleStage) {
          d.sampleStage.humanCheck = d.sampleStage.humanCheck || {};
          d.sampleStage.humanCheck.completedBy = (STE.currentUser() || {}).name || "HQ Reviewer";
          d.sampleStage.humanCheck.completedAt = new Date().toISOString();
          d.sampleStage.humanCheck.verdict = "pass";
          d.sampleStage.status = "Human inspection complete · ready for production code";
        }
      });
      STEApp.toast(`Sample inspection passed for ${active.id} — ready for production code`, "success");
      design();
    });
    const issueCodeBtn = $("[data-issue-code]", root);
    if (issueCodeBtn) issueCodeBtn.addEventListener("click", () => {
      const code = `PROD-${active.season}-${active.id.replace(/^STM26|^STW26/, '').replace(/-/, '-')}-R1`;
      STE.mutate(s => {
        const d = s.designs.find(x => x.id === active.id);
        if (d && d.sampleStage) {
          d.sampleStage.productionCode = {
            code, issuedAt: new Date().toISOString(),
            issuedBy: (STE.currentUser() || {}).name || "HQ Brand Director",
          };
          d.sampleStage.status = "Production code issued";
          d.stage = "Production Cleared";
        }
      });
      STEApp.toast(`Production code ${code} issued for ${active.id}`, "success");
      design();
    });

    // Wire decision buttons
    $$("[data-d-action]", root).forEach(b => {
      b.addEventListener("click", () => {
        const action = b.getAttribute("data-d-action");
        STE.mutate(s => {
          const d = s.designs.find(x => x.id === active.id);
          if (!d) return;
          if (action === "approve") { d.stage = "Brand Director Final"; d.decision = "approved"; }
          else if (action === "revise") { d.stage = "Licensee Upload"; d.decision = "revision_requested"; }
          else { d.stage = "Rejected"; d.decision = "rejected"; }
        });
        const map = { approve: "Approved — promoted to Brand Director Final", revise: "Revision requested — returned to licensee", reject: "Rejected" };
        STEApp.toast(`${active.id}: ${map[action]}`, action === "reject" ? "warn" : "success");
        design();
      });
    });
    wireLicenseeFilter(root, design);
  }

  // Physical Sample Inspection card — D-70 → production code stage
  function renderSampleStage(design) {
    const s = design.sampleStage;
    if (!s) {
      return `
        <div class="ste-card">
          <div class="ste-card-head">
            <h3>Physical Sample Inspection</h3>
            <div class="ste-mini">Unlocks once CAD is approved — D-70 sample due date</div>
          </div>
          <div class="ste-card-body ste-empty">
            <h3>No sample submitted yet</h3>
            <p>After HQ approves the CAD, the licensee ships the physical sample. The carrier, waybill, and photos populate here when received.</p>
          </div>
        </div>`;
    }
    const ship = s.shipment || {};
    const hc = s.humanCheck || {};
    const pc = s.productionCode || null;
    const iconFor = st => ({ pass: "✓", warn: "!", fail: "×" })[st] || "·";
    const aiHtml = (s.aiInspection || []).map(c => `
      <div class="ste-aicheck ste-aicheck-${c.status}">
        <span class="ste-aicheck-icon">${iconFor(c.status)}</span>
        <div>
          <div class="ste-aicheck-name">${escape(c.name)}</div>
          <div class="ste-aicheck-detail">${escape(c.detail)}</div>
        </div>
      </div>`).join("");
    const humanItems = (hc.required || []).map(r => `<li>${escape(r)}</li>`).join("");
    const humanComplete = !!hc.completedAt;
    return `
      <div class="ste-card">
        <div class="ste-card-head">
          <h3>Physical Sample Inspection</h3>
          <div class="ste-mini">${escape(s.status)} · ${ship.tracking || 'no tracking yet'}</div>
        </div>
        <div class="ste-card-body">
          <div class="ste-meta-strip">
            <div><span class="ste-mini">Shipped</span><strong>${ship.shippedAt ? fmtDate(ship.shippedAt) : '—'}</strong></div>
            <div><span class="ste-mini">Carrier</span><strong>${escape(ship.carrier || '—')}</strong></div>
            <div><span class="ste-mini">Tracking</span><strong>${escape(ship.tracking || '—')}</strong></div>
            <div><span class="ste-mini">Received</span><strong>${ship.receivedAt ? fmtDate(ship.receivedAt) : '—'}</strong></div>
            <div><span class="ste-mini">Photos uploaded</span><strong>${s.photos || 0}</strong></div>
          </div>

          <div class="ste-aichecks">
            <div class="ste-aichecks-hd">AI Sample Inspection · ${(s.aiInspection||[]).length} checks <span class="ste-ai-chip">⚡ Delta-E + silhouette + materials</span></div>
            ${aiHtml}
          </div>

          <div class="ste-human-check ${humanComplete ? 'ste-human-check-done' : ''}">
            <div class="ste-aichecks-hd">Human Inspection · sewing · hand-feel · wash-test</div>
            <ul class="ste-human-required">${humanItems}</ul>
            ${humanComplete
              ? `<div class="ste-human-done">✓ Completed by ${escape(hc.completedBy)} · ${fmtDateTime(hc.completedAt)} · <strong>${(hc.verdict||'pass').toUpperCase()}</strong></div>`
              : `<div class="ste-actions"><button class="ste-btn ste-btn-primary" data-sample-complete>Mark Human Inspection Pass</button><button class="ste-btn ste-btn-ghost">Request Re-sample</button></div>`}
          </div>

          ${pc
            ? `<div class="ste-prod-code-issued">
                <div class="ste-prod-code-lbl">Production code issued</div>
                <div class="ste-prod-code-val">${escape(pc.code)}</div>
                <div class="ste-mini">Issued ${fmtDateTime(pc.issuedAt)} by ${escape(pc.issuedBy)} — licensee cleared for mass production</div>
              </div>`
            : humanComplete
              ? `<div class="ste-actions" style="margin-top:14px"><button class="ste-btn ste-btn-primary" data-issue-code>Issue Production Code</button></div>`
              : `<div class="ste-mini" style="margin-top:14px">Production code unlocks once human inspection passes.</div>`}
        </div>
      </div>`;
  }

  // ============================ SEASON PLAN ============================
  // Season Plan — master timeline owned by HQ HQ. Distribution Plans (the
  // licensee submissions) live on the separate #/distribution route.
  // Parse /timelines, /timelines/details/<code>, /timelines/details/<code>/edit.
  // Also accepts the bare /timelines/<code> form for backward compat.
  function seasonRoute() {
    const m = (location.hash || "").match(/^#\/timelines(?:\/details)?(?:\/([A-Z0-9_-]+))?(?:\/([a-z]+))?/i);
    return { code: m && m[1] ? m[1] : null, action: m && m[2] ? m[2].toLowerCase() : null };
  }

  function season() {
    const u = STE.currentUser();
    if (!u) { location.hash = "#/login"; return; }
    const isHQ = u && STE.isHQ(u);
    const { code } = seasonRoute();
    if (code) return seasonDetail(code);
    // Licensees skip the season-list — they only ever see their own data,
    // so the list adds an extra click. Show each of their seasons stacked
    // as detail containers instead. HQ still gets the cross-licensee list.
    if (!isHQ) return seasonLicenseeStacked();
    return seasonList();
  }

  // Licensee-only — render a detail card per published season, stacked.
  // Each card shows just the licensee's row of milestone dates for that
  // season (matching the layout of seasonDetail's grid for a single licensee).
  function seasonLicenseeStacked() {
    const root = PAGE_MAIN("timelines");
    if (!root) return;
    const state = STE.get();
    const allSeasons = state.seasons || [];
    const own = STE.currentLicensee();
    if (!own) { root.innerHTML = `<div class="ste-screen-pad"><h1>Season Timelines</h1><p>Sign in as a licensee to view your timelines.</p></div>`; return; }

    // Filter to seasons where this licensee has a published timeline,
    // sorted newest-first by season code.
    const published = allSeasons
      .filter(s => (s.licenseePublished || {})[own.id])
      .sort((a, b) => {
        const parse = (c) => {
          const m = /^(\d{2})(SS|FW)$/.exec(c || "");
          if (!m) return { year: 0, half: 0 };
          return { year: parseInt(m[1], 10), half: m[2] === "FW" ? 1 : 0 };
        };
        const A = parse(a.code), B = parse(b.code);
        if (A.year !== B.year) return B.year - A.year;
        return B.half - A.half;
      });

    const today = new Date(); today.setHours(0,0,0,0);

    root.innerHTML = `
      <div class="ste-screen-pad">
        <div class="ste-section-hd">
          <div class="ste-page-crumbs">
            <a href="#/home">Home</a><span class="sep">/</span><span class="cur">Season Timelines</span>
          </div>
          <div class="ste-page-hd-row">
            <h1>Season Timelines</h1>
          </div>
        </div>
        ${published.length === 0 ? `
          <div class="ste-form-card" style="padding:40px;text-align:center;color:var(--ste-muted)">
            No published timelines yet. Once HQ publishes a season's timeline for your team, it appears here.
          </div>
        ` : published.map(seasonObj => {
            const cols = getMilestoneSchema(seasonObj);
            const baseTemplate = seasonObj.milestones || {};
            const overrides = (seasonObj.licenseeMilestones || {})[own.id] || {};
            const ms = { ...baseTemplate, ...overrides };
            let nextKey = null;
            for (const m of cols) { const d = ms[m.key]; if (d && new Date(d) >= today) { nextKey = m.key; break; } }
            const headerCells = cols.map(m => `<th class="ste-stg-col"><div class="ste-stg-col-label">${escape(m.label)}</div></th>`).join("");
            const dateCells = cols.map(m => {
              const d = ms[m.key];
              const passed = d && new Date(d) < today;
              const isNext = m.key === nextKey;
              // Launch isn't specially highlighted on the licensee timeline —
              // it reads the same passed/next/upcoming state as every other
              // milestone.
              const stateCls = !d ? 'tbd' : passed ? 'done' : isNext ? 'next' : 'upcoming';
              return `<td class="ste-stg-cell"><span class="ste-stg-date ste-stg-date-${stateCls}">${d ? escape(fmtDate(d)) : 'TBD'}</span></td>`;
            }).join("");
            // The latest published season (first in our sorted list) opens
            // by default; the rest start collapsed for a scannable view.
            return `
              <div class="ste-card ste-tl-acc ${seasonObj === published[0] ? 'is-open' : ''}" style="margin-bottom:14px" data-tl-acc="${escape(seasonObj.code)}">
                <button type="button" class="ste-card-head ste-tl-acc-hd" data-tl-acc-toggle="${escape(seasonObj.code)}" aria-expanded="${seasonObj === published[0] ? 'true' : 'false'}">
                  <span class="ste-tl-acc-chev" aria-hidden="true">▾</span>
                  <h3>${escape(seasonObj.code)}</h3>
                </button>
                <div class="ste-card-body ste-stg-body ste-tl-acc-body">
                  <div class="ste-stg-wrap">
                    <table class="ste-stg-table">
                      <thead><tr>${headerCells}</tr></thead>
                      <tbody><tr class="ste-stg-row">${dateCells}</tr></tbody>
                    </table>
                  </div>
                </div>
              </div>`;
          }).join("")}
      </div>`;

    // Accordion toggles — click the header to expand/collapse the card.
    root.querySelectorAll("[data-tl-acc-toggle]").forEach(btn => {
      btn.addEventListener("click", () => {
        const card = btn.closest(".ste-tl-acc");
        if (!card) return;
        const open = card.classList.toggle("is-open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      });
    });
  }

  // Top-level list — rows = seasons.
  function seasonList() {
    const root = PAGE_MAIN("timelines");
    if (!root) return;
    const u = STE.currentUser();
    const isHQ = u && STE.isHQ(u);
    const state = STE.get();
    const allSeasons = (state.seasons || []);
    const licensees = state.licensees || [];

    // Sort by season code, newest first. The code is `{yy}{SS|FW}` so
    // we sort by year descending, then put FW before SS within the same
    // year (FW comes later in the calendar than SS).
    const sorted = [...allSeasons].sort((a, b) => {
      const parse = (code) => {
        const m = /^(\d{2})(SS|FW)$/.exec(code || "");
        if (!m) return { year: 0, half: 0 };
        return { year: parseInt(m[1], 10), half: m[2] === "FW" ? 1 : 0 };
      };
      const A = parse(a.code), B = parse(b.code);
      if (B.year !== A.year) return B.year - A.year;
      return B.half - A.half;
    });

    const today = new Date();
    const rows = sorted.map(s => {
      const launch = s.milestones?.launch;
      const dToLaunch = launch ? Math.round((new Date(launch) - today) / 86400000) : null;
      const published = s.licenseePublished || {};
      const pubCount = licensees.filter(l => published[l.id]).length;
      const overrideCount = Object.keys(s.licenseeMilestones || {}).length;
      // Next milestone for this season (first not-yet-passed)
      let nextLabel = "—"; let nextDate = "";
      for (const m of getMilestoneSchema(s)) {
        const d = s.milestones?.[m.key];
        if (d && new Date(d) >= today) { nextLabel = m.label; nextDate = d; break; }
      }
      const status = pubCount === 0 ? "Draft" : "Published";
      return { s, launch, dToLaunch, published, pubCount, overrideCount, nextLabel, nextDate, status };
    });

    root.innerHTML = `
      <div class="ste-screen-pad">
        <div class="ste-section-hd">
          <div class="ste-page-crumbs">
            <a href="#/${isHQ ? 'hq' : 'home'}">Home</a><span class="sep">/</span><span class="cur">Season Timelines</span>
          </div>
          <div class="ste-page-hd-row">
            <h1>Season Timelines</h1>
            ${isHQ ? `<div class="ste-hd-cta">
              <button class="ste-btn ste-btn-primary" data-act="new-season" type="button">+ Create New Season</button>
            </div>` : ''}
          </div>
        </div>

        <div class="ste-form-card">
          <div class="ste-filter-bar">
            <span class="ste-mini ste-insp-filter-count" style="margin-left:auto"><strong>${rows.length}</strong> of ${rows.length}</span>
          </div>
          <table class="ste-table">
            <thead>
              <tr>
                <th>Season</th>
                ${isHQ ? `<th>Status</th><th>Licensees</th><th class="ste-col-kebab"></th>` : ''}
              </tr>
            </thead>
            <tbody>
              ${rows.length === 0 ? `<tr><td colspan="${isHQ ? 4 : 1}" class="ste-empty-cell">No seasons configured.</td></tr>` : rows.map(r => {
                // Licensee users only see seasons where their own timeline is published.
                if (!isHQ) {
                  const own = STE.currentLicensee();
                  if (!own || !r.published[own.id]) return '';
                }
                const statusTone = r.status === "Draft" ? "warn" : "ok";
                return `
                  <tr data-season="${escape(r.s.code)}" style="cursor:pointer">
                    <td><strong>${escape(r.s.code)}</strong></td>
                    ${isHQ ? `<td><span class="ste-badge ste-badge-${statusTone}">${escape(r.status)}</span></td><td>${r.pubCount} / ${licensees.length} published</td><td><button class="ste-row-menu-btn" type="button" data-menu="${escape(r.s.code)}" aria-label="Row actions" title="Actions"></button></td>` : ''}
                  </tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>`;

    document.title = "Season Timelines · Sergio Tacchini";

    // Row click → open detail (ignore clicks inside the kebab)
    $$("tr[data-season]", root).forEach(tr => {
      tr.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        location.hash = `#/timelines/details/${tr.getAttribute("data-season")}`;
      });
      // Right-click also opens the row menu
      tr.addEventListener("contextmenu", (e) => {
        if (!isHQ) return;
        e.preventDefault();
        openSeasonRowMenu(tr.getAttribute("data-season"), e.clientX, e.clientY);
      });
    });

    // Kebab → open menu next to the button
    $$("[data-menu]", root).forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const rect = btn.getBoundingClientRect();
        openSeasonRowMenu(btn.getAttribute("data-menu"), rect.right, rect.bottom);
      });
    });

    // + Create New Season
    $("[data-act='new-season']", root)?.addEventListener("click", openNewSeasonModal);
  }

  // Standalone context menu for season list rows (Open / Open in new window /
  // Duplicate / Delete). Delete is disabled when any licensee timeline in the
  // season is still published — HQ must unpublish all of them first.
  let _openSeasonMenu = null;
  function closeSeasonMenu() {
    if (_openSeasonMenu) { _openSeasonMenu.remove(); _openSeasonMenu = null; }
  }
  document.addEventListener("click", closeSeasonMenu);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSeasonMenu(); });

  function openSeasonRowMenu(code, x, y) {
    closeSeasonMenu();
    const state = STE.get();
    const s = (state.seasons || []).find(x => x.code === code);
    if (!s) return;
    const published = s.licenseePublished || {};
    const anyPublished = Object.values(published).some(Boolean);

    const items = [
      { act: "open", label: "Open" },
      { act: "open-new", label: "Open in new window" },
      { sep: true },
      { act: "duplicate", label: "Duplicate" },
      { sep: true },
      { act: "delete", label: "Delete", danger: true, disabled: anyPublished, disabledHint: anyPublished ? "Unpublish all licensee timelines first" : null },
    ];

    const menu = document.createElement("div");
    menu.className = "ste-row-menu";
    menu.innerHTML = items.map(it => {
      if (it.sep) return `<div class="ste-row-menu-sep"></div>`;
      const cls = ["ste-row-menu-item"];
      if (it.danger) cls.push("ste-row-menu-danger");
      if (it.disabled) cls.push("ste-row-menu-disabled");
      const title = it.disabledHint ? ` title="${escape(it.disabledHint)}"` : '';
      return `<button class="${cls.join(' ')}" data-rm="${it.act}" ${it.disabled ? 'disabled' : ''}${title}><span>${escape(it.label)}</span></button>`;
    }).join("");
    document.body.appendChild(menu);
    const w = menu.offsetWidth || 200;
    const h = menu.offsetHeight || 200;
    const px = Math.min(window.innerWidth - w - 8, Math.max(8, x));
    const py = Math.min(window.innerHeight - h - 8, Math.max(8, y));
    menu.style.left = px + "px";
    menu.style.top = py + "px";
    _openSeasonMenu = menu;

    menu.querySelectorAll("[data-rm]").forEach(b => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        if (b.hasAttribute("disabled")) return;
        const act = b.getAttribute("data-rm");
        closeSeasonMenu();
        handleSeasonRowAction(act, code);
      });
    });
  }

  function handleSeasonRowAction(act, code) {
    if (act === "open") {
      location.hash = `#/timelines/details/${code}`;
    } else if (act === "open-new") {
      const url = location.origin + location.pathname + `#/timelines/details/${encodeURIComponent(code)}`;
      window.open(url, "_blank");
    } else if (act === "duplicate") {
      openSeasonPickerModal({
        title: `Duplicate ${code}`,
        confirmLabel: "Duplicate",
        onPick: (newCode) => {
          STE.mutate(s => {
            const src = s.seasons.find(x => x.code === code);
            if (!src) return;
            const copy = JSON.parse(JSON.stringify(src));
            copy.code = newCode;
            // Drafts start fully unpublished so they don't leak to licensees.
            if (copy.licenseePublished) {
              Object.keys(copy.licenseePublished).forEach(id => { copy.licenseePublished[id] = false; });
            }
            copy.phase = "Planning";
            s.seasons.unshift(copy);
          });
          STEApp.toast(`Duplicated to ${newCode}`, "success");
          season();
        },
      });
    } else if (act === "delete") {
      const modal = makeModal(`Delete ${code}?`, `
        <p style="font:500 13px/1.55 Inter,sans-serif;color:var(--ste-text);margin:0">
          The season's milestones, per-licensee overrides, and publish state will be permanently removed.
          This cannot be undone.
        </p>`, [
        { label: "Cancel", kind: "ghost", onClick: () => closeModal(modal) },
        { label: `Delete ${code}`, kind: "danger", onClick: () => {
          STE.mutate(s => { s.seasons = (s.seasons || []).filter(x => x.code !== code); });
          STEApp.toast(`Season ${code} deleted`, "info");
          closeModal(modal);
          season();
        }},
      ]);
    }
  }

  function openNewSeasonModal() {
    openSeasonPickerModal({
      title: "New Season",
      confirmLabel: "Create",
      onPick: (code, seasonPart, year) => {
        const allLicensees = STE.get().licensees || [];
        // Pre-add every current licensee with publish=false. HQ no longer has
        // to click "Add" per licensee — they just fill in dates and publish.
        const licenseePublished = {};
        allLicensees.forEach(l => { licenseePublished[l.id] = false; });
        const blank = {
          code,
          year,
          season: seasonPart,
          directionTheme: "",
          directionPrinciples: [],
          milestones: { designSubmitClose: "", designApprovalClose: "", planSubmitDeadline: "", sampleReview: "", launch: "", settlementClose: "" },
          phase: "Planning",
          licenseeMilestones: {},
          licenseePublished,
        };
        STE.mutate(s => { s.seasons = s.seasons || []; s.seasons.unshift(blank); });
        STEApp.toast(`Season ${code} created`, "success");
        // Open detail in edit mode so HQ can fill in dates right away.
        STE.setSession({ ...STE.getSession(), seasonEditMode: true });
        location.hash = `#/timelines/details/${code}`;
      },
    });
  }

  // Single picker modal used by both "New Season" and "Duplicate Season".
  // Composes the canonical SS/FW + 2-digit year format. Options that already
  // exist as seasons are filtered out, so the dropdown only shows valid picks.
  function openSeasonPickerModal({ title, confirmLabel, onPick }) {
    const state = STE.get();
    const existing = new Set((state.seasons || []).map(s => s.code));
    const thisYear = new Date().getFullYear();
    // Combined dropdown: 25SS, 25FW, 26SS, 26FW, ... across the chosen window.
    // Range: this year - 2 to this year + 5 (gives some past + future picks).
    const all = [];
    for (let y = thisYear - 2; y <= thisYear + 5; y++) {
      const yy = String(y).slice(-2);
      // {year}{season} (e.g. "27SS") — kept consistent across the app.
      all.push({ code: `${yy}SS`, season: "SS", year: y });
      all.push({ code: `${yy}FW`, season: "FW", year: y });
    }
    // Filter out existing — the user only picks NEW seasons here.
    const options = all.filter(o => !existing.has(o.code));
    if (options.length === 0) {
      const modal = makeModal(title, `
        <p style="font:500 13px Inter,sans-serif;color:var(--ste-text);margin:0">
          Every season in the next few years is already created. Delete an existing season first, or extend the range manually.
        </p>`, [
        { label: "Close", kind: "ghost", onClick: () => closeModal(modal) },
      ]);
      return;
    }
    // Default: first option that isn't in the past (≥ this year), else first.
    const defaultIdx = Math.max(0, options.findIndex(o => o.year >= thisYear));
    let picked = options[defaultIdx];

    const fmtLabel = (o) => `${o.code} — ${o.season === 'SS' ? 'Spring/Summer' : 'Fall/Winter'} ${o.year}`;

    const modal = makeModal(title, `
      <div class="ste-form-field">
        <label class="ste-lbl">Season</label>
        <div class="ste-brief-select-wrap">
          <select class="ste-input ste-brief-select" data-season-pick>
            ${options.map((o, i) => `<option value="${escape(o.code)}" ${i===defaultIdx?'selected':''}>${escape(fmtLabel(o))}</option>`).join("")}
          </select>
          <span class="ste-brief-select-chev" aria-hidden="true">▾</span>
        </div>
      </div>
    `, [
      { label: "Cancel", kind: "ghost", onClick: () => closeModal(modal) },
      { label: confirmLabel, kind: "primary", onClick: () => submit() },
    ]);

    const sel = modal.querySelector("[data-season-pick]");
    sel.addEventListener("change", () => {
      picked = options.find(o => o.code === sel.value) || picked;
    });
    function submit() {
      if (!picked) return;
      closeModal(modal);
      onPick(picked.code, picked.season, picked.year);
    }
  }

  function seasonDetail(code) {
    const root = PAGE_MAIN("timelines");
    if (!root) return;
    const u = STE.currentUser();
    const isHQ = u && STE.isHQ(u);
    const state = STE.get();
    const allSeasons = state.seasons || [];
    const seasonObj = allSeasons.find(s => s.code === code);
    if (!seasonObj) { location.hash = "#/timelines"; return; }

    const sess = STE.getSession() || {};
    const editMode = isHQ && !!sess.seasonEditMode;
    const licensees = state.licensees || [];
    const published = seasonObj.licenseePublished || {};
    const isInSeason = (id) => Object.prototype.hasOwnProperty.call(published, id);

    // Alphabetical by legal name.
    const sortedLics = [...licensees].sort((a, b) => (a.legalName || '').localeCompare(b.legalName || ''));
    // View mode → only licensees in this season (published OR draft for HQ; only published for licensee user)
    // Edit mode → ALL licensees so HQ can add new ones.
    let licOrder = sortedLics.filter(l => isInSeason(l.id));
    if (!isHQ) {
      const own = STE.currentLicensee();
      licOrder = own && published[own.id] ? [own] : [];
    }
    const editableLics = sortedLics;  // edit mode shows everyone

    const today = new Date();

    root.innerHTML = `
      <div class="ste-screen-pad">
        <div class="ste-section-hd">
          <div class="ste-page-crumbs">
            <a href="#/${isHQ ? 'hq' : 'home'}">Home</a><span class="sep">/</span>
            <a href="#/timelines">Season Timelines</a><span class="sep">/</span>
            <span class="cur">${escape(seasonObj.code)}</span>
          </div>
          <div class="ste-page-hd-row">
            <div>
              <h1>${escape(seasonObj.code)}</h1>
            </div>
            <div class="ste-hd-cta" style="display:flex;align-items:center;gap:10px">
              ${isHQ ? (editMode
                ? `<button class="ste-btn ste-btn-ghost" data-act="cancel-edit" type="button">Cancel</button>
                   <button class="ste-btn ste-btn-primary" data-act="exit-edit" type="button">Save</button>`
                : `<button class="ste-btn ste-btn-ghost" data-act="enter-edit" type="button">Edit</button>`) : ''}
            </div>
          </div>
        </div>

        ${(editMode ? renderSeasonTimelineGrid(seasonObj, editableLics, published, today, isHQ, true)
                    : (licOrder.length === 0
                        ? `<div class="ste-mini" style="padding:14px 4px">${isHQ ? 'No licensees in this season yet. Press Edit to add some.' : 'This season\'s timeline has not been released to you yet.'}</div>`
                        : renderSeasonTimelineGrid(seasonObj, licOrder, published, today, isHQ, false)))}
      </div>`;

    document.title = `${seasonObj.code} Timeline · Sergio Tacchini`;

    // Wire toggle. Entering edit mode snapshots the season's editable fields
    // Segmented control: Dates ↔ D-N
    $$("[data-tlmode]", root).forEach(btn => {
      btn.addEventListener("click", () => {
        STE.setSession({ ...STE.getSession(), timelineCellMode: btn.getAttribute("data-tlmode") });
        season();
      });
    });

    // (milestones, per-licensee overrides, publish state) so Cancel can revert
    // the in-progress changes — they're written to the store on each input
    // change, so we need to restore from snapshot to undo.
    $("[data-act='enter-edit']", root)?.addEventListener("click", () => {
      const snapshot = JSON.parse(JSON.stringify({
        milestones: seasonObj.milestones || {},
        licenseeMilestones: seasonObj.licenseeMilestones || {},
        licenseePublished: seasonObj.licenseePublished || {},
      }));
      STE.setSession({ ...STE.getSession(), seasonEditMode: true, seasonEditSnapshot: { code: seasonObj.code, snapshot } });
      season();
    });
    $("[data-act='exit-edit']", root)?.addEventListener("click", () => {
      // Save → before exiting edit mode, re-validate every CURRENTLY-PUBLISHED
      // licensee's dates. If any published licensee is missing milestone
      // dates, surface a toast instead of silently saving an incomplete
      // timeline. Unpublished rows are exempt — they're still drafts.
      const so = (STE.get().seasons || []).find(x => x.code === seasonObj.code);
      const broken = [];
      if (so) {
        const publishedMap = so.licenseePublished || {};
        Object.keys(publishedMap).forEach(licId => {
          if (!publishedMap[licId]) return;
          const overrides = (so.licenseeMilestones || {})[licId] || {};
          const merged = { ...(so.milestones || {}), ...overrides };
          const missing = cols.filter(m => !merged[m.key]);
          if (missing.length) {
            const lic = (STE.get().licensees || []).find(l => l.id === licId);
            broken.push({ lic, missing });
          }
        });
      }
      if (broken.length) {
        const first = broken[0];
        const licName = first.lic ? first.lic.legalName : 'one licensee';
        const names = first.missing.map(m => _msLabel(m.key)).join(", ");
        const more = broken.length > 1 ? ` (+${broken.length - 1} other licensee${broken.length - 1 === 1 ? '' : 's'} with missing dates)` : '';
        STEApp.toast(`Can't save — ${licName} is published but missing: ${names}${more}.`, "warn");
        return;
      }
      const sess = STE.getSession() || {};
      const next = { ...sess, seasonEditMode: false };
      delete next.seasonEditSnapshot;
      STE.setSession(next);
      season();
    });
    $("[data-act='cancel-edit']", root)?.addEventListener("click", () => {
      const sess = STE.getSession() || {};
      const snap = sess.seasonEditSnapshot;
      if (snap && snap.code === seasonObj.code) {
        STE.mutate(s => {
          const so = (s.seasons || []).find(x => x.code === seasonObj.code);
          if (!so) return;
          so.milestones = JSON.parse(JSON.stringify(snap.snapshot.milestones));
          so.licenseeMilestones = JSON.parse(JSON.stringify(snap.snapshot.licenseeMilestones));
          so.licenseePublished = JSON.parse(JSON.stringify(snap.snapshot.licenseePublished));
        });
      }
      const next = { ...sess, seasonEditMode: false };
      delete next.seasonEditSnapshot;
      STE.setSession(next);
      season();
    });
    // Master eye toggle (edit mode column header): flip all licensees on/off.
    // If any are unpublished → publish all; otherwise unpublish all.
    $("[data-act='toggle-all-publish']", root)?.addEventListener("click", () => {
      STE.mutate(s => {
        const so = (s.seasons || []).find(x => x.code === seasonObj.code);
        if (!so) return;
        so.licenseePublished = so.licenseePublished || {};
        const ids = Object.keys(so.licenseePublished);
        const allPub = ids.length > 0 && ids.every(id => so.licenseePublished[id]);
        ids.forEach(id => { so.licenseePublished[id] = !allPub; });
      });
      season();
    });

    // Inline date edits — write directly to licenseeMilestones[licId][msKey].
    // After each change we validate the milestone sequence for that licensee
    // (each milestone must be ≤ the next in the canonical order) and flag
    // any inputs that violate the rule.
    function validateLicenseeDates(licId) {
      const so = (STE.get().seasons || []).find(x => x.code === seasonObj.code);
      if (!so) return;
      const eff = { ...(so.milestones || {}), ...((so.licenseeMilestones || {})[licId] || {}) };
      // Walk the canonical milestone order; each filled date must be ≥ the
      // previous filled date. Blank values (TBD) are skipped — they don't
      // violate the order, they just delay it.
      let prevKey = null;
      const violations = [];
      const schema = getMilestoneSchema(seasonObj);
      for (const m of schema) {
        const d = eff[m.key];
        if (!d) continue;
        if (prevKey) {
          const pd = eff[prevKey];
          if (new Date(d) < new Date(pd)) {
            const prev = schema.find(x => x.key === prevKey);
            violations.push({ key: m.key, msg: `${m.label} can't be before ${prev ? prev.label : prevKey}` });
          }
        }
        prevKey = m.key;
      }
      // Paint error state on the offending inputs in this licensee's row.
      const rowInputs = root.querySelectorAll(`[data-licensee="${licId}"]`);
      rowInputs.forEach(inp => {
        inp.classList.remove("ste-input-error");
        inp.removeAttribute("title");
      });
      violations.forEach(v => {
        const inp = root.querySelector(`[data-licensee="${licId}"][data-ms-key="${v.key}"]`);
        if (inp) {
          inp.classList.add("ste-input-error");
          inp.setAttribute("title", v.msg);
        }
      });
      return violations.length === 0;
    }

    $$("[data-ms-key]", root).forEach(inp => {
      const licId = inp.getAttribute("data-licensee");
      const key = inp.getAttribute("data-ms-key");
      if (!licId || !key) return;
      inp.addEventListener("change", () => {
        const v = inp.value;
        STE.mutate(s => {
          const so = (s.seasons || []).find(x => x.code === seasonObj.code);
          if (!so) return;
          so.licenseeMilestones = so.licenseeMilestones || {};
          so.licenseeMilestones[licId] = so.licenseeMilestones[licId] || {};
          if (v) so.licenseeMilestones[licId][key] = v;
          else delete so.licenseeMilestones[licId][key];
        });
        validateLicenseeDates(licId);
      });
    });
    // Run an initial validation pass so old data with invalid ordering is
    // surfaced immediately when entering edit mode.
    if (editMode) {
      Object.keys(seasonObj.licenseePublished || {}).forEach(validateLicenseeDates);
    }

    // Wire per-licensee publish toggles. Block the publish action when
    // milestone dates are missing — show a toast naming exactly which ones
    // so HQ doesn't have to guess. Unpublishing always works.
    const _msLabel = (k) => {
      const map = {
        designSubmitClose: "Design Submit Close",
        designApprovalClose: "Design Approval Close",
        planSubmitDeadline: "Plan Submit Deadline",
        sampleReview: "Sample Review",
        launch: "Launch",
        settlementClose: "Settlement Close",
      };
      return map[k] || k;
    };
    $$("[data-toggle-publish]", root).forEach(btn => {
      btn.addEventListener("click", () => {
        const licId = btn.getAttribute("data-toggle-publish");
        const isCurrentlyPub = !!(seasonObj.licenseePublished || {})[licId];
        if (!isCurrentlyPub) {
          // Trying to publish — re-check readiness using the latest data.
          const so = (STE.get().seasons || []).find(x => x.code === seasonObj.code);
          if (so) {
            const overrides = (so.licenseeMilestones || {})[licId] || {};
            const merged = { ...(so.milestones || {}), ...overrides };
            const missing = cols.filter(m => !merged[m.key]);
            if (missing.length) {
              const names = missing.map(m => _msLabel(m.key)).join(", ");
              STEApp.toast(`Can't publish — fill ${missing.length === 1 ? 'this date' : 'these dates'} first: ${names}.`, "warn");
              return;
            }
          }
        }
        STE.mutate(s => {
          const so = (s.seasons || []).find(x => x.code === seasonObj.code);
          if (!so) return;
          so.licenseePublished = so.licenseePublished || {};
          so.licenseePublished[licId] = !so.licenseePublished[licId];
        });
        season();
      });
    });

    // Wire add/remove licensee (edit mode only)
    $$("[data-add-licensee]", root).forEach(b => b.addEventListener("click", () => {
      const id = b.getAttribute("data-add-licensee");
      STE.mutate(s => {
        const so = s.seasons.find(x => x.code === seasonObj.code);
        so.licenseePublished = so.licenseePublished || {};
        so.licenseePublished[id] = false;
      });
      season();
    }));
    $$("[data-remove-licensee]", root).forEach(b => b.addEventListener("click", () => {
      const id = b.getAttribute("data-remove-licensee");
      // Snapshot first so Undo can restore exactly what we removed.
      let snap = null;
      let licName = id;
      STE.mutate(s => {
        const so = s.seasons.find(x => x.code === seasonObj.code);
        if (!so) return;
        const publishedWas = so.licenseePublished ? Object.prototype.hasOwnProperty.call(so.licenseePublished, id) : false;
        const publishedVal = publishedWas ? so.licenseePublished[id] : undefined;
        const overrides    = so.licenseeMilestones ? so.licenseeMilestones[id] : undefined;
        snap = { publishedWas, publishedVal, overrides: overrides ? JSON.parse(JSON.stringify(overrides)) : undefined };
        if (so.licenseePublished) delete so.licenseePublished[id];
        if (so.licenseeMilestones) delete so.licenseeMilestones[id];
      });
      const lic = (STE.get().licensees || []).find(l => l.id === id);
      if (lic) licName = lic.legalName;
      season();
      STEApp.toast(`Removed ${licName} from ${seasonObj.code}.`, "info", {
        actionLabel: "Undo",
        onAction: () => {
          if (!snap) return;
          STE.mutate(s => {
            const so = s.seasons.find(x => x.code === seasonObj.code);
            if (!so) return;
            if (snap.publishedWas) {
              so.licenseePublished = so.licenseePublished || {};
              so.licenseePublished[id] = snap.publishedVal;
            }
            if (snap.overrides) {
              so.licenseeMilestones = so.licenseeMilestones || {};
              so.licenseeMilestones[id] = snap.overrides;
            }
          });
          season();
        },
      });
    }));

    // Wire per-licensee Edit timeline buttons
    $$("[data-edit-licensee-timeline]", root).forEach(btn => {
      btn.addEventListener("click", () => {
        openSeasonTimelineEditor(seasonObj.code, btn.getAttribute("data-edit-licensee-timeline"));
      });
    });
    // Edit base milestones
    $("[data-edit-base]", root)?.addEventListener("click", () => openSeasonTimelineEditor(seasonObj.code, null));

    // ===== Milestone schema editing (HQ + edit mode only) =====
    // Helper: read the season's effective schema, mutating the season in
    // state with a snapshot if it hasn't been customised yet so subsequent
    // edits all apply against a real array.
    function ensureSchema(s, seasonCode) {
      const so = (s.seasons || []).find(x => x.code === seasonCode);
      if (!so) return null;
      if (!Array.isArray(so.milestoneSchema) || so.milestoneSchema.length === 0) {
        so.milestoneSchema = SEASON_MILESTONES.map(m => ({ key: m.key, label: m.label }));
      }
      return so;
    }

    // Rename — opens a small centered modal. The column header is too narrow
    // to comfortably type into inline.
    function openColumnLabelModal(key, currentLabel) {
      const backdrop = document.createElement("div");
      backdrop.className = "ste-mini-modal-backdrop";
      backdrop.innerHTML = `
        <div class="ste-mini-modal" role="dialog" aria-modal="true">
          <h3 class="ste-mini-modal-title">Rename milestone</h3>
          <input class="ste-input ste-mini-modal-input" type="text" value="${escape(currentLabel || '')}" placeholder="Milestone name">
          <div class="ste-mini-modal-actions">
            <button class="ste-btn ste-btn-ghost" type="button" data-mm-cancel>Cancel</button>
            <button class="ste-btn ste-btn-primary" type="button" data-mm-save>Save</button>
          </div>
        </div>`;
      document.body.appendChild(backdrop);
      const inp = backdrop.querySelector("input");
      inp.focus(); inp.select();
      const close = () => backdrop.remove();
      const save = () => {
        const v = inp.value.trim();
        if (!v) { close(); return; }
        STE.mutate(s => {
          const so = ensureSchema(s, seasonObj.code); if (!so) return;
          const m = so.milestoneSchema.find(x => x.key === key);
          if (m) m.label = v;
        });
        close();
        season();
      };
      backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
      backdrop.querySelector("[data-mm-cancel]").addEventListener("click", close);
      backdrop.querySelector("[data-mm-save]").addEventListener("click", save);
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); save(); }
        else if (e.key === "Escape") { e.preventDefault(); close(); }
      });
    }
    $$("[data-col-edit-label]", root).forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const key = btn.getAttribute("data-col-edit-label");
        openColumnLabelModal(key, btn.textContent);
      });
    });

    // Drag-to-reorder — HTML5 drag-and-drop on the grip handle. The
    // drag source is the <th>, identified by its data-col-key. Drop on
    // another <th> moves the dragged column to that position.
    let dragKey = null;
    $$("[data-col-drag]", root).forEach(handle => {
      const th = handle.closest("th");
      if (!th) return;
      handle.addEventListener("dragstart", (e) => {
        dragKey = handle.getAttribute("data-col-drag");
        th.classList.add("is-dragging");
        try { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", dragKey); } catch (_) {}
      });
      handle.addEventListener("dragend", () => {
        th.classList.remove("is-dragging");
        $$(".ste-stg-col-edit", root).forEach(x => x.classList.remove("is-drop-target"));
        dragKey = null;
      });
    });
    $$(".ste-stg-col-edit", root).forEach(th => {
      th.addEventListener("dragover", (e) => {
        if (!dragKey) return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
        th.classList.add("is-drop-target");
      });
      th.addEventListener("dragleave", () => th.classList.remove("is-drop-target"));
      th.addEventListener("drop", (e) => {
        e.preventDefault();
        th.classList.remove("is-drop-target");
        const dropKey = th.getAttribute("data-col-key");
        if (!dragKey || !dropKey || dragKey === dropKey) return;
        STE.mutate(s => {
          const so = ensureSchema(s, seasonObj.code); if (!so) return;
          const arr = so.milestoneSchema;
          const fromIdx = arr.findIndex(x => x.key === dragKey);
          const toIdx   = arr.findIndex(x => x.key === dropKey);
          if (fromIdx < 0 || toIdx < 0) return;
          const [m] = arr.splice(fromIdx, 1);
          arr.splice(toIdx, 0, m);
        });
        season();
      });
    });

    // Delete — drop from schema + per-licensee dates. No confirm; we show
    // a toast with an Undo action that restores the snapshot (schema entry
    // at original index, base milestone date, and every licensee override).
    $$("[data-col-rm]", root).forEach(b => b.addEventListener("click", () => {
      const key = b.getAttribute("data-col-rm");
      let snap = null;
      STE.mutate(s => {
        const so = ensureSchema(s, seasonObj.code); if (!so) return;
        const idx = so.milestoneSchema.findIndex(x => x.key === key);
        if (idx < 0) return;
        const entry = so.milestoneSchema[idx];
        const baseDate = so.milestones ? so.milestones[key] : undefined;
        const baseHad  = so.milestones ? Object.prototype.hasOwnProperty.call(so.milestones, key) : false;
        const licOverrides = {};
        Object.entries(so.licenseeMilestones || {}).forEach(([licId, ms]) => {
          if (ms && Object.prototype.hasOwnProperty.call(ms, key)) {
            licOverrides[licId] = ms[key];
            delete ms[key];
          }
        });
        snap = { idx, entry: { ...entry }, baseHad, baseDate, licOverrides };
        so.milestoneSchema.splice(idx, 1);
        if (so.milestones && baseHad) delete so.milestones[key];
      });
      season();
      STEApp.toast(`Removed milestone "${snap?.entry?.label || key}".`, "info", {
        actionLabel: "Undo",
        onAction: () => {
          if (!snap) return;
          STE.mutate(s => {
            const so = ensureSchema(s, seasonObj.code); if (!so) return;
            so.milestoneSchema.splice(snap.idx, 0, snap.entry);
            if (snap.baseHad) {
              so.milestones = so.milestones || {};
              so.milestones[key] = snap.baseDate;
            }
            Object.entries(snap.licOverrides).forEach(([licId, val]) => {
              so.licenseeMilestones = so.licenseeMilestones || {};
              so.licenseeMilestones[licId] = so.licenseeMilestones[licId] || {};
              so.licenseeMilestones[licId][key] = val;
            });
          });
          season();
        },
      });
    }));

    // Add — append a column with a placeholder label, then open the rename
    // modal immediately so the user can name it the same way they rename
    // existing columns. No browser prompt.
    $("[data-col-add]", root)?.addEventListener("click", () => {
      const newKey = newMilestoneKey();
      STE.mutate(s => {
        const so = ensureSchema(s, seasonObj.code); if (!so) return;
        so.milestoneSchema.push({ key: newKey, label: "New milestone" });
      });
      season();
      // After re-render, open the rename modal anchored to the new column.
      setTimeout(() => {
        const btn = $(`[data-col-edit-label="${newKey}"]`, root);
        if (btn) btn.click();
      }, 30);
    });
  }

  // Column-aligned comparison grid: milestone labels at the top, one row per
  // licensee. Each cell shows the licensee's date for that milestone. No
  // "base" timeline — every licensee owns their own dates.
  function renderSeasonTimelineGrid(seasonObj, lics, published, today, isHQ, editMode) {
    const cols = getMilestoneSchema(seasonObj);
    const baseTemplate = seasonObj.milestones || {};
    const cellMode = (STE.getSession() && STE.getSession().timelineCellMode === "countdown") ? "countdown" : "dates";

    // In edit mode HQ can rename / reorder (drag) / delete / add columns.
    // The header reads almost exactly like view mode — same big label
    // and date — with a small grip handle on the left and a × that only
    // shows on hover. Clicking the label swaps it inline to an input.
    const headerCells = cols.map((m, i) => {
      if (editMode && isHQ) {
        return `
          <th class="ste-stg-col ste-stg-col-edit" data-col-key="${escape(m.key)}">
            <div class="ste-stg-col-edithd">
              <span class="ste-stg-col-drag" data-col-drag="${escape(m.key)}" title="Drag to reorder" aria-label="Drag to reorder" draggable="true">⋮⋮</span>
              <button type="button" class="ste-stg-col-label ste-stg-col-label-edit" data-col-edit-label="${escape(m.key)}" title="Click to rename">${escape(m.label)}</button>
              <button class="ste-stg-col-rm" data-col-rm="${escape(m.key)}" type="button" title="Delete milestone" aria-label="Delete">×</button>
            </div>
          </th>`;
      }
      return `
        <th class="ste-stg-col">
          <div class="ste-stg-col-label">${escape(m.label)}</div>
        </th>`;
    }).join("");

    const addColHeader = (editMode && isHQ)
      ? `<th class="ste-stg-col-add"><button class="ste-stg-col-addbtn" data-col-add type="button" title="Add milestone" aria-label="Add milestone">+</button></th>`
      : '';

    const eyeOnSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    const eyeOffSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
    const xSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

    // For TBD/blank gating: a licensee can only be published when every
    // milestone has a date. The eye button is disabled with a hint otherwise.
    function isReadyToPublish(ms) {
      return cols.every(m => !!ms[m.key]);
    }
    function fmtCell(d, launchDate) {
      if (!d) return "TBD";
      if (cellMode === "countdown") {
        if (!launchDate) return fmtDate(d);
        const days = Math.round((new Date(launchDate) - new Date(d)) / 86400000);
        return days > 0 ? `D-${days}` : days < 0 ? `D+${Math.abs(days)}` : `D-0`;
      }
      return fmtDate(d);
    }

    const inSeasonRows = lics.filter(l => Object.prototype.hasOwnProperty.call(published, l.id)).map(lic => {
      const overrides = (seasonObj.licenseeMilestones || {})[lic.id] || {};
      const ms = { ...baseTemplate, ...overrides };
      const launchDate = ms.launch;
      const isPub = !!published[lic.id];
      const ready = isReadyToPublish(ms);
      let nextKey = null;
      for (const m of cols) { const d = ms[m.key]; if (d && new Date(d) >= today) { nextKey = m.key; break; } }
      const dateCells = cols.map(m => {
        const d = ms[m.key];
        const passed = d && new Date(d) < today;
        const isLaunch = m.key === "launch";
        const isNext = m.key === nextKey;
        const stateCls = !d ? 'tbd' : isLaunch ? 'launch' : passed ? 'done' : isNext ? 'next' : 'upcoming';
        const cellInner = (editMode && isHQ)
          ? `<input type="date" class="ste-input ste-stg-date-input" data-licensee="${escape(lic.id)}" data-ms-key="${escape(m.key)}" value="${escape(d || '')}">`
          : `<span class="ste-stg-date ste-stg-date-${stateCls}">${escape(fmtCell(d, launchDate))}</span>`;
        return `<td class="ste-stg-cell">${cellInner}</td>`;
      }).join("");
      // Publish controls only render in edit mode (HQ). View mode = pure data
      // but still surfaces an "Unpublished" badge so HQ knows at a glance.
      const pubGateTitle = !ready ? "Fill every milestone date before publishing" : (isPub ? "Published — click to unpublish" : "Unpublished — click to publish");
      // Eye button stays clickable even when dates are missing — clicking
      // shows a toast listing the missing milestones so HQ knows exactly
      // what to fill in, instead of a silently-disabled button.
      const _missingKeysCsv = cols.filter(m => !ms[m.key]).map(m => m.key).join(",");
      const eyeBtn = (editMode && isHQ)
        ? `<button class="ste-icon-btn ${isPub ? 'is-on' : 'is-off'} ${!ready && !isPub ? 'is-blocked' : ''}" data-toggle-publish="${escape(lic.id)}" data-pub-missing="${escape(_missingKeysCsv)}" type="button" title="${escape(pubGateTitle)}" aria-label="${isPub ? 'Unpublish' : 'Publish'}">${isPub ? eyeOnSvg : eyeOffSvg}</button>`
        : '';
      const viewModeBadge = (!editMode && isHQ && !isPub) ? `<span class="ste-badge ste-badge-warn" style="margin-left:8px;font-size:9px;letter-spacing:0.4px">Unpublished</span>` : '';
      const rowControls = (editMode && isHQ) ? `<td class="ste-stg-actions">
        <button class="ste-icon-btn" data-remove-licensee="${escape(lic.id)}" type="button" title="Remove from season" aria-label="Remove">${xSvg}</button>
      </td>` : '';
      // Empty cell to align under the "+ Add" header column in edit mode.
      const addColCell = (editMode && isHQ) ? `<td class="ste-stg-col-addcell"></td>` : '';
      return `
        <tr class="ste-stg-row ${!isPub ? 'ste-stg-row-unpub' : ''}">
          <td class="ste-stg-licname">
            <div class="ste-stg-licname-row">${eyeBtn}<strong>${escape(lic.legalName)}</strong>${viewModeBadge}</div>
          </td>
          ${dateCells}
          ${addColCell}
          ${rowControls}
        </tr>`;
    }).join("");

    // In edit mode, also list licensees NOT yet in the season so HQ can add them.
    // Span covers the milestone cells + the trailing "+ Add" column cell.
    const notInSeasonRows = (editMode && isHQ) ? lics.filter(l => !Object.prototype.hasOwnProperty.call(published, l.id)).map(lic => `
      <tr class="ste-stg-row ste-stg-row-notinseason">
        <td class="ste-stg-licname"><strong>${escape(lic.legalName)}</strong><div class="ste-stg-licmeta"><span class="ste-mini">Not in season</span></div></td>
        <td colspan="${cols.length + 1}" class="ste-stg-noseason-cell"><span class="ste-mini">No timeline configured for this licensee yet.</span></td>
        <td class="ste-stg-actions"><button class="ste-btn ste-btn-ghost ste-btn-mini" data-add-licensee="${escape(lic.id)}" type="button">Add</button></td>
      </tr>`).join("") : '';

    // Calendar + clock SVGs for the date/countdown toggle. Stroke-only so they
    // match the rest of the platform's line-icon style.
    const calIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
    const clockIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;

    return `
      <div class="ste-card">
        ${editMode ? '' : `
          <div class="ste-card-head ste-card-head-trailing">
            <div class="ste-segctl ste-segctl-icon" role="tablist" aria-label="Cell format" style="margin-left:auto">
              <button class="ste-segctl-opt ${cellMode==='dates'?'active':''}" data-tlmode="dates" type="button" role="tab" aria-selected="${cellMode==='dates'}" title="Dates" aria-label="Dates">${calIcon}</button>
              <button class="ste-segctl-opt ${cellMode==='countdown'?'active':''}" data-tlmode="countdown" type="button" role="tab" aria-selected="${cellMode==='countdown'}" title="Countdown (D-N)" aria-label="Countdown">${clockIcon}</button>
            </div>
          </div>`}
        <div class="ste-card-body ste-stg-body">
          <div class="ste-stg-wrap">
            <table class="ste-stg-table">
              <thead>
                <tr>
                  <th class="ste-stg-licname-h">
                    ${(editMode && isHQ) ? `
                      <div class="ste-stg-licname-row">
                        <button class="ste-icon-btn ${(() => { const ids = Object.keys(published); const allPub = ids.length > 0 && ids.every(id => published[id]); return allPub ? 'is-on' : 'is-off'; })()}" data-act="toggle-all-publish" type="button" title="Publish all / Unpublish all" aria-label="Toggle publish all">${(() => { const ids = Object.keys(published); const allPub = ids.length > 0 && ids.every(id => published[id]); return allPub ? eyeOnSvg : eyeOffSvg; })()}</button>
                        <span>Licensee</span>
                      </div>` : 'Licensee'}
                  </th>
                  ${headerCells}
                  ${addColHeader}
                  ${editMode && isHQ ? '<th></th>' : ''}
                </tr>
              </thead>
              <tbody>
                ${inSeasonRows || `<tr><td colspan="${cols.length + 1 + (editMode && isHQ ? 2 : 0)}" class="ste-empty-cell">No licensees in this season.</td></tr>`}
                ${notInSeasonRows}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
  }

  // Season Plan — the licensee-submitted set (Sales · Marketing · Distribution).
  // HQ default view = list of every licensee's submissions; click a row to
  // open detail. Licensee view = their own three plan cards directly.
  function operationPlanSeasonNumber(seasonCode) {
    const m = String(seasonCode || "").match(/\d{2}/);
    return m ? parseInt(m[0], 10) : null;
  }
  function isPre26OperationPlanSeason(seasonCode) {
    const n = operationPlanSeasonNumber(seasonCode);
    return Number.isFinite(n) && n < 26;
  }
  function normalizeOperationPlanForDisplay(plan, seasonCode) {
    const code = seasonCode || (plan && plan.season);
    if (!isPre26OperationPlanSeason(code)) return plan;
    return {
      ...(plan || { season: code }),
      season: code,
      status: "Approved",
      _displayApprovedPastSeason: true,
    };
  }
  global.STEScreensTestHooks = {
    ...(global.STEScreensTestHooks || {}),
    normalizeOperationPlanForDisplay,
  };

  function distribution() {
    let sec = document.querySelector('section[data-page="operation-plans"]');
    if (!sec) {
      sec = document.createElement("section");
      sec.setAttribute("data-page", "operation-plans");
      document.body.appendChild(sec);
    }
    document.querySelectorAll("section[data-page]").forEach(s => { s.hidden = s.dataset.page !== "operation-plans"; });
    sec.hidden = false;
    // Canonical detail URL is #/operation-plans/details/view/<code>. Redirect
    // the legacy #/operation-plans/details/<code> form (no view segment) to it.
    const legacyDetail = (location.hash || "").match(/^#\/operation-plans\/details\/(?!view\/|edit\/)([A-Z0-9_-]+)/i);
    if (legacyDetail) {
      location.replace(`#/operation-plans/details/view/${encodeURIComponent(legacyDetail[1])}`);
      return;
    }
    const sub = pageSubRoute("operation-plans");
    const u = STE.currentUser();
    const isHQ = u && STE.isHQ(u);
    // Both HQ and licensees see a list view first; HQ list = licensee × season,
    // licensee list = their seasons. A sub-route opens the season detail.
    if (!sub) return isHQ ? distributionList(sec) : distributionLicenseeList(sec);
    return distributionDetail(sec);
  }

  // Licensee list — one row per season the licensee participates in, showing
  // the three sub-plan statuses + overall + deadline. Mirrors the columns of
  // the HQ list (minus the Licensee column) and uses the same row shell so
  // the page reads consistently across roles.
  function distributionLicenseeList(sec) {
    const u = STE.currentUser();
    const sel = STE.selectors();
    const state = STE.get();
    const lic = STE.currentLicensee();
    const initials = (u.name||'?').split(/\s+/).map(s=>s[0]).slice(0,2).join('').toUpperCase();
    const today = new Date();

    // Seasons the licensee has any plan in OR is published in the timeline for.
    const myLicId = lic ? lic.id : (u && u.licenseeId) || null;
    const allSeasons = state.seasons || [];
    const plans = (state.seasonPlans || []).filter(p => p.licenseeId === myLicId);
    const seasonCodes = new Set(plans.map(p => p.season));
    allSeasons.forEach(s => { if ((s.licenseePublished || {})[myLicId]) seasonCodes.add(s.code); });
    const seasonsInScope = Array.from(seasonCodes)
      .map(code => allSeasons.find(s => s.code === code))
      .filter(Boolean);
    // Newest first by code.
    seasonsInScope.sort((a, b) => {
      const parse = (c) => {
        const m = /^(\d{2})(SS|FW)$/.exec(c || "");
        if (!m) return { year: 0, half: 0 };
        return { year: parseInt(m[1], 10), half: m[2] === "FW" ? 1 : 0 };
      };
      const A = parse(a.code), B = parse(b.code);
      if (A.year !== B.year) return B.year - A.year;
      return B.half - A.half;
    });

    const rows = seasonsInScope.map(seasonObj => {
      const rawSales = sel.seasonPlan(myLicId, seasonObj.code, "3-C");
      const rawMarketing = sel.seasonPlan(myLicId, seasonObj.code, "3-A");
      const rawDistrib = sel.seasonPlan(myLicId, seasonObj.code, "3-B");
      const sales = normalizeOperationPlanForDisplay(rawSales, seasonObj.code);
      const marketing = normalizeOperationPlanForDisplay(rawMarketing, seasonObj.code);
      const distrib = normalizeOperationPlanForDisplay(rawDistrib, seasonObj.code);
      const present = [sales, marketing, distrib].filter(Boolean);
      const allApproved = present.length === 3 && present.every(p => p.status === "Approved");
      const anyPending = present.some(p => p.status === "Pending Review");
      const overrides = (seasonObj.licenseeMilestones || {})[myLicId] || {};
      const licDeadline = overrides.planSubmitDeadline || (seasonObj.milestones && seasonObj.milestones.planSubmitDeadline) || null;
      const dDays = licDeadline ? Math.round((new Date(licDeadline) - today) / 86400000) : null;
      const baseOverall = allApproved ? "Approved"
        : anyPending ? "Pending Review"
        : present.length === 0 ? "Not Started"
        : "In Progress";
      const stillOwedBase = baseOverall === "Not Started" || baseOverall === "In Progress";
      const overall = (stillOwedBase && dDays != null && dDays < 0) ? "Overdue" : baseOverall;
      const lastAt = [rawSales, rawMarketing, rawDistrib].filter(Boolean).map(p => p.submittedAt || p.approvedAt).filter(Boolean).sort().slice(-1)[0] || null;
      return { seasonObj, sales, marketing, distrib, overall, lastAt, deadline: licDeadline, deadlineDays: dDays };
    });

    document.title = "Operation Plans · Sergio Tacchini";

    // Default "+ Create New Plan" target — the most recent season the
    // licensee owes a plan for. Picks the first row whose overall status
    // is "Not Started" or "In Progress"; falls back to the newest row.
    const nextPendingRow = rows.find(r => r.overall === "Not Started" || r.overall === "In Progress" || r.overall === "Overdue") || rows[0];
    const newPlanSeasonCode = nextPendingRow ? nextPendingRow.seasonObj.code : null;

    sec.innerHTML = `
      <ste-shell active="operation-plans" breadcrumb="Operation Plans"
        user-name="${escape(u.name)}" user-role="${escape(u.title || '')}" user-initials="${initials}"
        licensee-code="${lic ? escape(lic.id) : ''}" licensee-name="${lic ? escape(lic.legalName) : ''}">
      <div class="ste-screen-pad">
        <div class="ste-section-hd">
          <div class="ste-page-crumbs"><a href="#/home">Home</a><span class="sep">/</span><span class="cur">Operation Plans</span></div>
          <div class="ste-page-hd-row">
            <div>
              <h1>Operation Plans</h1>
            </div>
            <div class="ste-hd-cta">
              ${newPlanSeasonCode
                ? `<a class="ste-btn ste-btn-primary" href="#/operation-plans/details/view/${escape(newPlanSeasonCode)}" title="Open ${escape(newPlanSeasonCode)} to draft your Sales, Distribution, and Marketing plans">+ Create New Plan</a>`
                : `<button class="ste-btn ste-btn-primary" type="button" disabled title="No open seasons available — HQ will publish one when ready">+ Create New Plan</button>`}
            </div>
          </div>
        </div>
        ${(() => {
          // Licensee alert — drafts / rejected plans that still need to
          // be submitted. Surfaces here so the user sees the workload
          // without having to click into each season.
          const draftLike = plans.filter(p => {
            const shown = normalizeOperationPlanForDisplay(p, p.season);
            return shown.status === "Draft" || shown.status === "Rejected";
          });
          if (!draftLike.length) return '';
          return `
            <button class="ste-overdue-banner ste-overdue-banner-warn" data-act="open-plans-licensee" type="button">
              <span class="ste-overdue-icon"></span>
              <span class="ste-overdue-text">
                <strong>${draftLike.length} operation plan${draftLike.length===1?'':'s'} to submit</strong>
                <span class="ste-mini">${draftLike.slice(0,4).map(p => `${p.season} ${p.subplan}`).join(", ")}${draftLike.length > 4 ? ` · +${draftLike.length - 4} more` : ''} · open the season to finish them</span>
              </span>
              <span class="ste-overdue-chev">→</span>
            </button>`;
        })()}
        ${rows.length === 0 ? `
          <div class="ste-form-card" style="padding:40px;text-align:center;color:var(--ste-muted)">
            No season plans yet. Once HQ publishes a season's timeline for your team, your plan rows appear here.
          </div>
        ` : `
          <div class="ste-form-card">
            <table class="ste-table ste-distplan-table">
              <thead>
                <tr>
                  <th>Season</th>
                  <th class="ste-distplan-sub-first">Sales</th>
                  <th class="ste-distplan-sub">Distribution</th>
                  <th class="ste-distplan-sub-last">Marketing</th>
                  <th>Deadline</th>
                  <th>Last Activity</th>
                </tr>
              </thead>
              <tbody>
                ${rows.map(r => {
                  let deadlineCell = '<span class="ste-mini">—</span>';
                  if (r.deadline) {
                    // Still-owed = the licensee hasn't moved everything to
                    // Pending Review / Approved yet. Used to drive the
                    // overdue/warn coloring on the deadline cell.
                    const stillOwed = r.overall === "Not Started" || r.overall === "In Progress";
                    const isOverdue = stillOwed && r.deadlineDays != null && r.deadlineDays < 0;
                    const isCritical = stillOwed && r.deadlineDays != null && r.deadlineDays >= 0 && r.deadlineDays <= 14;
                    const cls = isOverdue ? 'ste-deadline-err' : isCritical ? 'ste-deadline-warn' : '';
                    deadlineCell = `<div class="${cls}"><span class="ste-mini">${escape(fmtDate(r.deadline))}</span></div>`;
                  }
                  const _licPlanKey = `${myLicId}|${r.seasonObj.code}`;
                  const _licPlanUpdated = r.lastAt || r.deadline;
                  // Licensee "your turn" — any sub-plan in Draft / Rejected.
                  const _licPlanActionable = ["sales","distrib","marketing"].some(k => {
                    const st = r[k] && r[k].status;
                    return st === "Draft" || st === "Rejected";
                  });
                  const _licPlanDot = (window.STEUnread && STEUnread.dot("plan", _licPlanKey, _licPlanUpdated, _licPlanActionable)) || '';
                  return `
                    <tr data-season="${escape(r.seasonObj.code)}" style="cursor:pointer">
                      <td><strong>${_licPlanDot}${escape(r.seasonObj.code)}</strong></td>
                      <td class="ste-distplan-sub-first">${planStatusPill(r.sales)}</td>
                      <td class="ste-distplan-sub">${planStatusPill(r.distrib)}</td>
                      <td class="ste-distplan-sub-last">${planStatusPill(r.marketing)}</td>
                      <td>${deadlineCell}</td>
                      <td><span class="ste-mini">${r.lastAt ? escape(new Date(r.lastAt).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})) : '—'}</span></td>
                    </tr>`;
                }).join("")}
              </tbody>
            </table>
          </div>`}
      </div>
      </ste-shell>`;

    // Row click → detail for that season. distributionDetail reads the
    // sub-route, so we navigate via location.hash.
    sec.querySelectorAll("tr[data-season]").forEach(tr => {
      tr.addEventListener("click", () => {
        location.hash = "#/operation-plans/details/view/" + tr.getAttribute("data-season");
      });
    });
    // Drafts banner → open the first season that still has work outstanding.
    sec.querySelector('[data-act="open-plans-licensee"]')?.addEventListener("click", () => {
      const firstDraft = plans.find(p => {
        const shown = normalizeOperationPlanForDisplay(p, p.season);
        return shown.status === "Draft" || shown.status === "Rejected";
      });
      if (firstDraft) location.hash = `#/operation-plans/details/view/${encodeURIComponent(firstDraft.season)}`;
    });
  }

  // List view: every licensee × current season, with status of each sub-plan.
  function distributionList(sec) {
    const u = STE.currentUser();
    const seasonObj = STE.selectors().currentSeason();
    const sel = STE.selectors();
    const state = STE.get();
    const lics = state.licensees || [];
    const lic = STE.currentLicensee();
    const initials = (u.name||'?').split(/\s+/).map(s=>s[0]).slice(0,2).join('').toUpperCase();

    const today = new Date();
    const planDeadlineDate = seasonObj.milestones?.planSubmitDeadline ? new Date(seasonObj.milestones.planSubmitDeadline) : null;
    const dToPlanDeadline = planDeadlineDate ? Math.round((planDeadlineDate - today) / 86400000) : null;

    // Build one row per licensee with the three sub-plan statuses. Each
    // licensee can have a per-licensee plan-submit-deadline override; fall
    // back to the season's base milestone.
    const overrides = (seasonObj.licenseeMilestones || {});
    const rows = lics.map(l => {
      const rawSales = sel.seasonPlan(l.id, seasonObj.code, "3-C");
      const rawMarketing = sel.seasonPlan(l.id, seasonObj.code, "3-A");
      const rawDistrib = sel.seasonPlan(l.id, seasonObj.code, "3-B");
      const sales = normalizeOperationPlanForDisplay(rawSales, seasonObj.code);
      const marketing = normalizeOperationPlanForDisplay(rawMarketing, seasonObj.code);
      const distrib = normalizeOperationPlanForDisplay(rawDistrib, seasonObj.code);
      const present = [sales, marketing, distrib].filter(Boolean);
      const allApproved = present.length === 3 && present.every(p => p.status === "Approved");
      const anyPending = present.some(p => p.status === "Pending Review");
      const licDeadline = (overrides[l.id] && overrides[l.id].planSubmitDeadline) || (seasonObj.milestones && seasonObj.milestones.planSubmitDeadline) || null;
      const dDays = licDeadline ? Math.round((new Date(licDeadline) - today) / 86400000) : null;
      const baseOverall = allApproved ? "Approved"
        : anyPending ? "Pending Review"
        : present.length === 0 ? "Not Started"
        : "In Progress";
      const stillOwedBase = baseOverall === "Not Started" || baseOverall === "In Progress";
      const overall = (stillOwedBase && dDays != null && dDays < 0) ? "Overdue" : baseOverall;
      const lastAt = [rawSales, rawMarketing, rawDistrib].filter(Boolean).map(p => p.submittedAt || p.approvedAt).filter(Boolean).sort().slice(-1)[0] || null;
      return {
        licensee: l, season: seasonObj.code,
        sales, marketing, distrib, overall, lastAt,
        deadline: licDeadline, deadlineDays: dDays,
        submittedCount: present.filter(p => p.status === "Approved" || p.status === "Pending Review").length,
      };
    });

    const pendingReview = rows.filter(r => r.sales?.status === "Pending Review" || r.marketing?.status === "Pending Review" || r.distrib?.status === "Pending Review").length;
    const overdueRows = rows.filter(r => r.overall === "Overdue");

    const initialLics = lics.map(l => l.id);

    document.title = "Operation Plans · Sergio Tacchini";

    sec.innerHTML = `
      <ste-shell active="operation-plans" breadcrumb="Operation Plans"
        user-name="${escape(u.name)}" user-role="${escape(u.title || '')}" user-initials="${initials}"
        licensee-code="${lic ? escape(lic.id) : 'HQ HQ'}" licensee-name="${lic ? escape(lic.legalName) : 'Global Admin View'}">
      <div class="ste-screen-pad">
        <div class="ste-section-hd">
          <div class="ste-page-crumbs">
            <a href="#/home">Home</a><span class="sep">/</span><span class="cur">Operation Plans</span>
          </div>
          <div class="ste-page-hd-row">
            <div>
              <h1>Operation Plans</h1>
            </div>
          </div>
        </div>

        ${overdueRows.length ? `
          <button class="ste-overdue-banner" data-act="open-overdue" type="button">
            <span class="ste-overdue-icon"></span>
            <span class="ste-overdue-text">
              <strong>${overdueRows.length} licensee${overdueRows.length===1?' is':'s are'} overdue on operation plans</strong>
              <span class="ste-mini">${overdueRows.map(r => r.licensee.legalName).slice(0,3).join(", ")}${overdueRows.length > 3 ? ` · +${overdueRows.length - 3} more` : ''} · click to send reminders</span>
            </span>
            <span class="ste-overdue-chev">→</span>
          </button>` : ''}

        ${pendingReview > 0 ? `
          <button class="ste-overdue-banner ste-overdue-banner-warn" data-act="open-plans-pending" type="button">
            <span class="ste-overdue-icon"></span>
            <span class="ste-overdue-text">
              <strong>${pendingReview} operation plan${pendingReview===1?'':'s'} pending your review</strong>
              <span class="ste-mini">One or more sub-plans (Sales / Distribution / Marketing) need approval — click to filter</span>
            </span>
            <span class="ste-overdue-chev">→</span>
          </button>` : ''}

        <div class="ste-form-card">
          <div class="ste-filter-bar">
            <div class="ste-users-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/></svg>
              <input id="ste-dist-search" type="search" placeholder="Search…">
            </div>
            <span class="ste-filter-divider" aria-hidden="true"></span>
            <div class="ste-fdrop" data-filter="licensee">
              <button class="ste-fdrop-btn" type="button"><span class="ste-fdrop-lbl">Licensees</span><span class="ste-fdrop-val"></span><span class="ste-fdrop-chev"></span></button>
              <div class="ste-fdrop-panel" hidden></div>
            </div>
            <div class="ste-fdrop" data-filter="sales">
              <button class="ste-fdrop-btn" type="button"><span class="ste-fdrop-lbl">Sales</span><span class="ste-fdrop-val"></span><span class="ste-fdrop-chev"></span></button>
              <div class="ste-fdrop-panel" hidden></div>
            </div>
            <div class="ste-fdrop" data-filter="distrib">
              <button class="ste-fdrop-btn" type="button"><span class="ste-fdrop-lbl">Distribution</span><span class="ste-fdrop-val"></span><span class="ste-fdrop-chev"></span></button>
              <div class="ste-fdrop-panel" hidden></div>
            </div>
            <div class="ste-fdrop" data-filter="marketing">
              <button class="ste-fdrop-btn" type="button"><span class="ste-fdrop-lbl">Marketing</span><span class="ste-fdrop-val"></span><span class="ste-fdrop-chev"></span></button>
              <div class="ste-fdrop-panel" hidden></div>
            </div>
            <button class="ste-btn ste-btn-ghost ste-btn-mini" id="ste-dist-clear" type="button">Clear</button>
            <span class="ste-mini ste-insp-filter-count" id="ste-dist-count"><strong>${rows.length}</strong> of ${rows.length}</span>
          </div>
          <table class="ste-table ste-distplan-table" id="ste-dist-list">
            <thead>
              <tr>
                <th>Licensee</th>
                <th>Season</th>
                <th class="ste-distplan-sub-first">Sales</th>
                <th class="ste-distplan-sub">Distribution</th>
                <th class="ste-distplan-sub-last">Marketing</th>
                <th>Deadline</th>
                <th>Last Activity</th>
                <th class="ste-col-kebab"></th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(r => {
                let deadlineCell = '<span class="ste-mini">—</span>';
                if (r.deadline) {
                  // The licensee has already done their part once the plans are
                  // submitted (Pending Review or Approved) — no need to colour
                  // the deadline. Only paint warn/err while work is still owed.
                  const stillOwed = r.overall === "Not Started" || r.overall === "In Progress";
                  const isOverdue = stillOwed && r.deadlineDays != null && r.deadlineDays < 0;
                  const isCritical = stillOwed && r.deadlineDays != null && r.deadlineDays >= 0 && r.deadlineDays <= 14;
                  const cls = isOverdue ? 'ste-deadline-err' : isCritical ? 'ste-deadline-warn' : '';
                  deadlineCell = `<div class="${cls}">
                    <span class="ste-mini">${escape(fmtDate(r.deadline))}</span>
                  </div>`;
                }
                const _planKey = `${r.licensee.id}|${r.season}`;
                const _planUpdated = r.lastAt || r.deadline;
                // HQ "your turn" — any sub-plan pending HQ review.
                const _planActionable = (r.sales?.status === "Pending Review")
                  || (r.distrib?.status === "Pending Review")
                  || (r.marketing?.status === "Pending Review");
                const _planDot = (window.STEUnread && STEUnread.dot("plan", _planKey, _planUpdated, _planActionable)) || '';
                return `
                <tr data-lic="${escape(r.licensee.id)}" style="cursor:pointer">
                  <td>
                    <div style="display:flex;gap:10px;align-items:center">
                      <span class="ste-mini-avatar">${escape((r.licensee.legalName||'').split(/\s+/).map(s=>s[0]).filter(Boolean).slice(0,2).join('').toUpperCase())}</span>
                      <strong>${_planDot}${escape(r.licensee.legalName)}</strong>
                    </div>
                  </td>
                  <td>${escape(r.season)}</td>
                  <td class="ste-distplan-sub-first">${planStatusPill(r.sales)}</td>
                  <td class="ste-distplan-sub">${planStatusPill(r.distrib)}</td>
                  <td class="ste-distplan-sub-last">${planStatusPill(r.marketing)}</td>
                  <td>${deadlineCell}</td>
                  <td><span class="ste-mini">${r.lastAt ? escape(new Date(r.lastAt).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})) : '—'}</span></td>
                  <td><button class="ste-kebab-btn" data-act="open" data-lic="${escape(r.licensee.id)}" type="button" aria-label="Open">⋯</button></td>
                </tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
      </ste-shell>`;

    // ----- Filter wiring -----
    const STATUS_OPTS = ["Not Started", "Draft", "Pending Review", "Approved", "Rejected"];
    // Per-sub-plan filters: each independently selectable so HQ can scope
    // "Sales Pending Review" without touching the other two. A row passes
    // only when ALL three sub-plan filters accept the row's status for
    // that sub-plan (intersection semantics). `pendingOnly` is a transient
    // flag set by the Pending Review banner — it additionally restricts
    // to rows that have AT LEAST ONE sub-plan Pending, regardless of the
    // per-sub-plan filters.
    const filters = {
      q: "",
      licensees: initialLics.slice(),
      sales: STATUS_OPTS.slice(),
      distrib: STATUS_OPTS.slice(),
      marketing: STATUS_OPTS.slice(),
      pendingOnly: false,
    };
    const SUBPLAN_KEYS = ["sales", "distrib", "marketing"];
    const fLic = sec.querySelector('.ste-fdrop[data-filter="licensee"]');
    const subDrops = {};
    SUBPLAN_KEYS.forEach(k => { subDrops[k] = sec.querySelector(`.ste-fdrop[data-filter="${k}"]`); });
    const count = sec.querySelector("#ste-dist-count");
    const tbody = sec.querySelector("#ste-dist-list tbody");
    const tableRows = Array.from(tbody.querySelectorAll("tr[data-lic]"));

    function paintLabels() {
      const lbl = (sel, all) => sel.length === 0 || sel.length === all.length
        ? { val: "", active: false }
        : sel.length === 1
          ? { val: escape(sel[0]), active: true }
          : { val: `${sel.length} selected`, active: true };
      const set = (drop, info) => {
        if (!drop) return;
        drop.classList.toggle("ste-filter-active", info.active);
        const v = drop.querySelector(".ste-fdrop-val");
        if (v) v.innerHTML = info.val;
      };
      const licNames = lics.filter(l => filters.licensees.includes(l.id)).map(l => l.legalName);
      set(fLic, lbl(licNames, lics.map(l => l.legalName)));
      SUBPLAN_KEYS.forEach(k => set(subDrops[k], lbl(filters[k], STATUS_OPTS)));
    }
    function applyFilters() {
      paintLabels();
      const q = filters.q.toLowerCase();
      let visible = 0;
      rows.forEach((r, i) => {
        const tr = tableRows[i];
        if (!tr) return;
        let show = true;
        if (q) {
          // Overall status is computed but no longer rendered as a column;
          // still include it in the search haystack so a query like
          // "overdue" or "pending" still works.
          const hay = [r.licensee.legalName, r.season, r.overall].join(" ").toLowerCase();
          if (!hay.includes(q)) show = false;
        }
        if (filters.licensees.length && filters.licensees.length < lics.length && !filters.licensees.includes(r.licensee.id)) show = false;
        // Per-sub-plan status filter — each sub-plan must be in its own
        // accepted-set. "Not Started" matches a sub-plan with no record yet.
        for (const k of SUBPLAN_KEYS) {
          const sub = filters[k];
          if (sub.length && sub.length < STATUS_OPTS.length) {
            const st = (r[k] && r[k].status) || "Not Started";
            if (!sub.includes(st)) { show = false; break; }
          }
        }
        if (show && filters.pendingOnly) {
          const anyPending = SUBPLAN_KEYS.some(k => r[k] && r[k].status === "Pending Review");
          if (!anyPending) show = false;
        }
        tr.style.display = show ? "" : "none";
        if (show) visible++;
      });
      if (count) count.innerHTML = `<strong>${visible}</strong> of ${rows.length}`;
    }

    // Generic dropdown panel wiring (re-using multiCheckboxPanel helper).
    [fLic, ...SUBPLAN_KEYS.map(k => subDrops[k])].forEach(drop => {
      if (!drop) return;
      const btn = drop.querySelector(".ste-fdrop-btn");
      const panel = drop.querySelector(".ste-fdrop-panel");
      const which = drop.getAttribute("data-filter");
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        sec.querySelectorAll(".ste-fdrop-panel").forEach(p => { if (p !== panel) p.hidden = true; });
        panel.hidden = !panel.hidden;
        if (!panel.hidden) {
          if (which === "licensee") {
            const opts = lics.map(l => ({value:l.id, label:l.legalName}));
            const pickPanel = multiCheckboxPanel(opts, filters.licensees, (next) => {
              filters.licensees = next;
              applyFilters();
            }, "All Organizations");
            panel.innerHTML = pickPanel.html;
            pickPanel.wire(panel);
          } else if (SUBPLAN_KEYS.includes(which)) {
            const opts = STATUS_OPTS.map(s => ({value: s, label: s}));
            const pickPanel = multiCheckboxPanel(opts, filters[which], (next) => {
              filters[which] = next;
              // Manually changing a sub-plan filter overrides the banner's
              // pending-only mode so the user's pick wins.
              filters.pendingOnly = false;
              applyFilters();
            }, "All Statuses");
            panel.innerHTML = pickPanel.html;
            pickPanel.wire(panel);
          }
        }
      });
    });
    document.addEventListener("click", (e) => {
      sec.querySelectorAll(".ste-fdrop-panel").forEach(p => {
        if (!p.parentElement.contains(e.target)) p.hidden = true;
      });
    });

    const searchInp = sec.querySelector("#ste-dist-search");
    searchInp?.addEventListener("input", () => { filters.q = searchInp.value; applyFilters(); });
    sec.querySelector("#ste-dist-clear")?.addEventListener("click", () => {
      filters.q = "";
      filters.licensees = initialLics.slice();
      filters.sales = STATUS_OPTS.slice();
      filters.distrib = STATUS_OPTS.slice();
      filters.marketing = STATUS_OPTS.slice();
      filters.pendingOnly = false;
      if (searchInp) searchInp.value = "";
      applyFilters();
    });

    // Overdue banner → open the Send Reminders modal (mirrors Sales
    // Statements). Lists every overdue licensee with per-row "Send reminder"
    // + a "Send all" CTA. Operation Plans aren't quarter-bound so we pass
    // the current season label instead of a quarter.
    sec.querySelector('[data-act="open-overdue"]')?.addEventListener("click", () => {
      const overdueForModal = overdueRows.map(r => ({
        licensee: r.licensee,
        licenseeId: r.licensee.id,
        season: r.season,
        deadline: r.deadline,
      }));
      openOpPlansOverdueReminderModal(overdueForModal);
    });
    // Pending Review banner → flip on the "any sub-plan pending" override
    // (filters.pendingOnly). Keeps the per-sub-plan filters as-is so the
    // user can layer further restrictions; turning the override off is just
    // a Clear click. If pendingOnly is already on, flash all three sub-plan
    // chips so the user notices it's already applied.
    sec.querySelector('[data-act="open-plans-pending"]')?.addEventListener("click", () => {
      if (filters.pendingOnly) {
        SUBPLAN_KEYS.forEach(k => {
          const d = subDrops[k];
          if (!d) return;
          d.classList.add("ste-fdrop-flash");
          setTimeout(() => d.classList.remove("ste-fdrop-flash"), 800);
        });
        return;
      }
      filters.pendingOnly = true;
      applyFilters();
    });

    applyFilters();

    sec.querySelectorAll("tr[data-lic]").forEach(tr => {
      tr.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        const id = tr.getAttribute("data-lic");
        STE.setSession({ ...STE.getSession(), viewLicenseeId: id });
        location.hash = "#/operation-plans/details/view/" + id;
      });
    });
    sec.querySelectorAll('[data-act="open"]').forEach(b => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = b.getAttribute("data-lic");
        STE.setSession({ ...STE.getSession(), viewLicenseeId: id });
        location.hash = "#/operation-plans/details/view/" + id;
      });
    });
  }

  // Detail view: the three plan cards for one licensee × the active season.
  function distributionDetail(sec) {
    const sub = pageSubRoute("operation-plans");
    const u = STE.currentUser();
    const isHQ = u && STE.isHQ(u);
    // Sub-route is either a season code (e.g. 27SS, used by licensee row
    // clicks) or a licensee id (e.g. lic_xxxx, used by HQ row clicks).
    // Detect by shape so both flows land on the right detail context.
    const isSeasonCode = sub && /^\d{2}(SS|FW)$/i.test(sub);
    if (sub && !isSeasonCode) STE.setSession({ ...STE.getSession(), viewLicenseeId: sub });
    const lic = STE.currentLicensee();
    const seasonObj = (isSeasonCode
      ? (STE.get().seasons || []).find(s => s.code.toUpperCase() === sub.toUpperCase())
      : null)
      || STE.selectors().currentSeason();
    // Per-user "new" dot — clear when this user opens a season detail.
    if (lic && seasonObj) {
      try { window.STEUnread && STEUnread.markSeen("plan", `${lic.id}|${seasonObj.code}`); } catch (_) {}
    }
    const sel = STE.selectors();
    // We used to auto-create empty Draft sub-plans the moment a licensee
    // opened a season — three new "Draft" rows per visit. That inflated
    // every counter on the page (sidebar badge climbed by 3 each click)
    // and made every season look like the user owed work even when they
    // didn't. The entry forms below render fine against a missing plan
    // record (render3CEntry / render3ADraft / render3BDraft fall through
    // to empty defaults), so the seed step is gone — a real plan record
    // only materialises when the licensee actually submits one.
    const rawPlan3c = sel.seasonPlan(lic.id, seasonObj.code, "3-C");
    const rawPlan3a = sel.seasonPlan(lic.id, seasonObj.code, "3-A");
    const rawPlan3b = sel.seasonPlan(lic.id, seasonObj.code, "3-B");
    const plan3c = normalizeOperationPlanForDisplay(rawPlan3c, seasonObj.code);
    const plan3a = normalizeOperationPlanForDisplay(rawPlan3a, seasonObj.code);
    const plan3b = normalizeOperationPlanForDisplay(rawPlan3b, seasonObj.code);

    const today = new Date();
    const planDeadlineDate = seasonObj.milestones?.planSubmitDeadline ? new Date(seasonObj.milestones.planSubmitDeadline) : null;
    const dToPlanDeadline = planDeadlineDate ? Math.round((planDeadlineDate - today) / 86400000) : null;
    const submitted = [plan3c, plan3a, plan3b].filter(p => p && (p.status==="Approved" || p.status==="Pending Review")).length;

    const initials = (u.name||'?').split(/\s+/).map(s=>s[0]).slice(0,2).join('').toUpperCase();
    sec.innerHTML = `
      <ste-shell active="operation-plans" breadcrumb="Operation Plans"
        user-name="${escape(u.name)}" user-role="${escape(u.title || '')}" user-initials="${initials}"
        licensee-code="${lic ? escape(lic.id) : 'HQ HQ'}" licensee-name="${lic ? escape(lic.legalName) : 'Global Admin View'}">
      <div class="ste-screen-pad">
        <div class="ste-section-hd">
          <div class="ste-page-crumbs">
            <a href="#/home">Home</a><span class="sep">/</span>
            <a href="#/operation-plans">Operation Plans</a><span class="sep">/</span>
            <span class="cur">${escape(seasonObj.code)}</span>
          </div>
          <div class="ste-page-hd-row">
            <div>
              <h1>${escape(seasonObj.code)}</h1>
              ${isHQ ? `<p class="ste-page-subtitle">${escape(lic.legalName)}</p>` : ''}
            </div>
            <div class="ste-hd-cta">
              <a class="ste-btn ste-btn-ghost" href="#/operation-plans" data-back-list>Back</a>
            </div>
          </div>
        </div>

        ${planCard("Sales Plan", "3-C", plan3c, render3C)}
        ${planCard("Distribution Plan", "3-B", plan3b, render3B)}
        ${planCard("Marketing Plan", "3-A", plan3a, render3A)}
      </div>
      </ste-shell>`;

    // Submit → AI Review for all three plans. Each transitions Draft to
    // Pending Review (the AI runs server-side in real life; the prototype
    // just flips the status). The Sales (3-C) submit is handled by
    // wire3CEntry since that form has live validation against minimums.
    const submitPlan = (subplan, label) => {
      STE.mutate(s => {
        const p = (s.seasonPlans || []).find(x =>
          x.licenseeId === lic.id && x.season === seasonObj.code && x.subplan === subplan);
        if (p) { p.status = "Pending Review"; p.submittedAt = new Date().toISOString(); }
      });
      STEApp.toast(`${label} submitted — AI Review running.`, "success");
      distribution();
    };
    // Licensee — Edit Plan flips the submitted plan back to Draft so they
    // can refine and re-submit. The entry form picks up the existing
    // values from the saved plan (rows / accounts / activities).
    $$("[data-plan-edit]", sec).forEach(b => b.addEventListener("click", () => {
      const subplan = b.getAttribute("data-plan-edit");
      STE.mutate(s => {
        const p = (s.seasonPlans || []).find(x =>
          x.licenseeId === lic.id && x.season === seasonObj.code && x.subplan === subplan);
        if (p) p.status = "Draft";
        // Pre-seed the draft store from the saved plan so the entry form
        // opens populated. Each subplan stores its own draft shape.
        s.seasonPlanDrafts = s.seasonPlanDrafts || {};
        if (p && subplan === "3-B") {
          s.seasonPlanDrafts[`_3b_draft_${lic.id}`] = { accounts: (p.accounts || []).slice(), updatedAt: new Date().toISOString() };
        } else if (p && subplan === "3-C") {
          s.seasonPlanDrafts[`_3c_draft_${lic.id}`] = { rows: (p.rows || []).slice(), updatedAt: new Date().toISOString() };
        } else if (p && subplan === "3-A") {
          s.seasonPlanDrafts[`_3a_draft_${lic.id}`] = { activities: (p.activities || []).slice(), updatedAt: new Date().toISOString() };
        }
      });
      distribution();
    }));
    // HQ — Approve / Reject / Undo the submitted plan in one click.
    // "undo" rewinds a previous Approve OR Reject back to Pending Review
    // and clears the decision metadata, so the plan re-enters HQ's queue
    // and the licensee unlocks from the read-only Approved view.
    $$("[data-plan-decision]", sec).forEach(b => b.addEventListener("click", () => {
      const [subplan, decision] = b.getAttribute("data-plan-decision").split("::");
      const u2 = STE.currentUser();
      STE.mutate(s => {
        const p = (s.seasonPlans || []).find(x =>
          x.licenseeId === lic.id && x.season === seasonObj.code && x.subplan === subplan);
        if (!p) return;
        if (decision === "undo") {
          p.status = "Pending Review";
          delete p.decisionAt; delete p.decisionBy;
          delete p.approvedAt; delete p.rejectedAt;
          delete p.rejectedBy; delete p.rejectionReason;
        } else {
          p.status = decision === "approved" ? "Approved" : "Rejected";
          p.decisionAt = new Date().toISOString();
          p.decisionBy = u2?.name || "HQ Reviewer";
        }
      });
      const toastMsg = decision === "undo"
        ? "Decision undone — plan back in Pending Review."
        : `Plan ${decision === "approved" ? "approved" : "rejected"}.`;
      const toastTone = decision === "undo"
        ? "info"
        : (decision === "approved" ? "success" : "info");
      STEApp.toast(toastMsg, toastTone);
      distribution();
    }));

    wireLicenseeFilter(sec, distribution);
    const form3c = $("[data-3c-form]", sec);
    if (form3c) wire3CEntry(form3c, lic, seasonObj);
    const form3a = $("[data-3a-form]", sec);
    if (form3a) wire3AEntry(form3a, lic, seasonObj);
    const form3b = $("[data-3b-form]", sec);
    if (form3b) wire3BEntry(form3b, lic, seasonObj);
  }

  function planStatusPill(p, seasonCode) {
    p = normalizeOperationPlanForDisplay(p, seasonCode);
    // Plans are eagerly seeded in Draft when a licensee opens the season,
    // so a missing record means "they haven't touched this yet" — render
    // as Draft (gray) rather than the legacy "Not started" sub-text so the
    // column visually reads as a single status family.
    if (!p) return `<span class="ste-badge ste-badge-neutral">Draft</span>`;
    const s = p.status;
    let tone = "neutral";
    if (s === "Approved") tone = "ok";
    else if (s === "Under Review") tone = "info";
    // Pending Review = HQ has the ball, the licensee submitted and is
    // waiting. Use the same info (blue) tone as Under Review so a Pending
    // Review row reads as "in flight" instead of looking identical to
    // Draft (both used to share the neutral grey).
    else if (s === "Pending Review") tone = "info";
    else if (s === "Draft") tone = "neutral";
    else if (s === "Rejected" || s === "Overdue") tone = "err";
    return `<span class="ste-badge ste-badge-${tone}">${escape(s)}</span>`;
  }
  function overallTone(o) {
    if (o === "Approved" || o === "Done") return "ok";
    if (o === "Overdue" || o === "Rejected") return "err";
    if (o === "Pending Review" || o === "Under Review") return "info";
    return "warn";
  }

  // Wire up the 3-C entry form: live totals, category +/- rows, and the
  // Save / Submit actions. Values stash in state.seasonPlanDrafts so the
  // licensee can refresh without losing their entries; Submit promotes the
  // draft to a seasonPlans record with status "Under AI Review".
  function wire3CEntry(form, lic, seasonObj) {
    const cur = lic?.currency || "GBP";
    const sym = cur === "EUR" ? "€" : cur === "USD" ? "$" : "£";
    const contract = (STE.get().contracts || []).find(c => c.licenseeId === lic?.id);
    const minQ = contract ? (contract.minQuarterlyEur || contract.minQuarterlyGbp || 0) : 0;
    const annualMin = minQ * 4;
    const draftKey = `_3c_draft_${lic?.id}`;

    function readForm() {
      const rows = Array.from(form.querySelectorAll("[data-3c-row]")).map(r => {
        const catRaw = (r.querySelector("[data-3c-cat-name]")?.value || "").trim();
        return {
          country: r.querySelector("[data-3c-country]")?.value || "",
          channel: r.querySelector("[data-3c-channel]")?.value || "",
          category: catRaw === ADD_CATEGORY_OPTION ? "" : catRaw,
          gender: r.querySelector("[data-3c-cat-gender]")?.value || "",
          sku: parseInt(r.querySelector("[data-3c-sku-row]")?.value) || 0,
          amountReporting: parseFloat(r.querySelector("[data-3c-amt-rep]")?.value) || 0,
          amountRetail: parseFloat(r.querySelector("[data-3c-amt-ret]")?.value) || 0,
        };
      });
      return { rows };
    }

    // Per-gender bar colors used by the derived GENDER MIX tile.
    const STE_3C_GENDER_COLORS = {
      Mens:   "var(--st-navy)",
      Womens: "var(--st-burgundy, #8e3a4a)",
      Kids:   "#16a34a",
      Other:  "var(--ste-muted, #6b7280)",
    };
    function paint() {
      const { rows } = readForm();
      const total = rows.reduce((s, r) => s + r.amountReporting, 0);
      const totalSkus = rows.reduce((s, r) => s + r.sku, 0);
      form.querySelector("[data-3c-total]").textContent = `${sym}${Math.round(total).toLocaleString()}`;
      const skuEl = form.querySelector("[data-3c-skus]");
      if (skuEl) skuEl.textContent = String(totalSkus);
      // Min coverage % — total against the annual minimum
      const minPctEl = form.querySelector("[data-3c-min-pct]");
      if (annualMin > 0) {
        const pct = Math.round((total / annualMin) * 100);
        minPctEl.textContent = `${pct}%`;
        minPctEl.style.color = pct >= 100 ? "var(--ste-ok)" : pct >= 80 ? "var(--st-warn, #c98722)" : "var(--st-err)";
      } else {
        minPctEl.textContent = "—";
      }
      // Category donut — aggregate reporting amount per category across rows,
      // assign a stable palette color in alphabetical order so the donut
      // doesn't reshuffle as rows reorder.
      const donut = form.querySelector("[data-3c-donut]");
      if (donut) {
        const byCat = new Map();
        rows.forEach(r => {
          if (!r.category || r.amountReporting <= 0) return;
          byCat.set(r.category, (byCat.get(r.category) || 0) + r.amountReporting);
        });
        if (byCat.size && total > 0) {
          const ordered = [...byCat.entries()].sort((a, b) => a[0].localeCompare(b[0]));
          let acc = 0; const segs = [];
          ordered.forEach(([, amount], i) => {
            const c = STE_3C_COLORS[i % STE_3C_COLORS.length];
            const start = (acc / total) * 100;
            acc += amount;
            const end = (acc / total) * 100;
            segs.push(`${c} ${start}% ${end}%`);
          });
          donut.style.background = `conic-gradient(${segs.join(", ")})`;
        } else {
          donut.style.background = "conic-gradient(rgba(10,24,50,0.06) 0 100%)";
        }
      }
      // Gender mix derived from reporting amount.
      const gAmt = {}; STE_GENDERS.forEach(g => gAmt[g] = 0);
      rows.forEach(r => { if (r.gender && gAmt[r.gender] !== undefined) gAmt[r.gender] += r.amountReporting; });
      STE_GENDERS.forEach(g => {
        const pct = total > 0 ? Math.round((gAmt[g] / total) * 100) : 0;
        const bar = form.querySelector(`[data-g-bar="${g}"]`);
        const pctEl = form.querySelector(`[data-g-pct="${g}"]`);
        if (bar) { bar.style.width = `${Math.min(100, pct)}%`; bar.style.background = STE_3C_GENDER_COLORS[g] || "var(--ste-muted)"; }
        if (pctEl) pctEl.textContent = `${pct}%`;
      });
    }

    function saveDraft() {
      const data = readForm();
      STE.mutate(s => {
        s.seasonPlanDrafts = s.seasonPlanDrafts || {};
        s.seasonPlanDrafts[draftKey] = {
          rows: data.rows,
          updatedAt: new Date().toISOString(),
        };
      });
    }

    // Auto-save the draft on every edit — there's no Save Draft button; the
    // plan persists itself as the licensee types. mutate() only writes state +
    // localStorage (no re-render), so focus/caret are preserved.
    form.addEventListener("input", () => { paint(); saveDraft(); });
    paint();

    form.querySelector("[data-3c-add-cat]")?.addEventListener("click", () => {
      saveDraft();
      const data = readForm();
      data.rows.push({ country: "", channel: "", category: "", gender: "", sku: "", amountReporting: "", amountRetail: "" });
      STE.mutate(s => { s.seasonPlanDrafts[draftKey].rows = data.rows; });
      distribution();
    });

    // Download a blank Sales Plan template with the Q1 2026 column headers
    // plus a couple of example rows.
    form.querySelector("[data-3c-template]")?.addEventListener("click", () => {
      const headers = ["Country","Distribution Channel","Category","Gender","# of SKU","Sales Amount (Reporting)","Sales Amount (Retail)"];
      const rows = [
        ["UK","Wholesale","Pants","Mens",10,450000,900000],
        ["UK","Wholesale","Pants","Womens",2,100000,200000],
      ];
      downloadCsv("sales-plan-template.csv", headers, rows);
    });
    // Upload template (.xlsx / .csv) — replaces the current rows from a sheet
    // with the Q1 2026 Sales Plan columns. New categories not yet in the org's
    // shared list are appended so they show up in future dropdowns.
    form.querySelector("[data-3c-upload-btn]")?.addEventListener("click", () => {
      form.querySelector("[data-3c-upload]")?.click();
    });
    form.querySelector("[data-3c-upload]")?.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const rows = await STEValidate.parseSheet(file, ["category"]);
        if (rows.length === 0) { STEApp.toast("No data rows found in the template.", "warn"); return; }
        const find = (obj, ...needles) => {
          const keys = Object.keys(obj);
          for (const n of needles) {
            const k = keys.find(kk => kk.toLowerCase().includes(n));
            if (k) return k;
          }
          return undefined;
        };
        const kCountry = find(rows[0], "country");
        const kChannel = find(rows[0], "channel");
        const kCat     = find(rows[0], "category");
        const kGen     = find(rows[0], "gender");
        const kSku     = find(rows[0], "sku");
        const kRep     = find(rows[0], "reporting");
        const kRet     = find(rows[0], "retail");
        const VALID_G = new Set(STE_GENDERS);
        const newRows = rows
          .filter(r => String(r[kCat] || "").trim())
          .map(r => {
            const g = String(r[kGen] || "").trim();
            const gCap = g ? (g[0].toUpperCase() + g.slice(1).toLowerCase()) : "";
            return {
              country: String(r[kCountry] || "").trim(),
              channel: String(r[kChannel] || "").trim(),
              category: String(r[kCat]).trim(),
              gender: VALID_G.has(gCap) ? gCap : "",
              sku: parseInt(r[kSku]) || 0,
              amountReporting: parseFloat(r[kRep]) || 0,
              amountRetail: parseFloat(r[kRet]) || 0,
            };
          });
        // Persist new category names into the org's shared list so future
        // dropdowns include them.
        const seenLower = new Set(orgCategoryList(STE.get(), lic).map(c => c.toLowerCase()));
        const novelNames = [...new Set(newRows.map(r => r.category).filter(n => !seenLower.has(n.toLowerCase())))];
        STE.mutate(s => {
          if (novelNames.length && lic?.id) {
            s.orgCategories = s.orgCategories || {};
            const cur = orgCategoryList(s, lic);
            novelNames.forEach(n => { if (!cur.some(c => c.toLowerCase() === n.toLowerCase())) cur.push(n); });
            s.orgCategories[lic.id] = cur;
          }
          s.seasonPlanDrafts = s.seasonPlanDrafts || {};
          s.seasonPlanDrafts[draftKey] = { ...(s.seasonPlanDrafts[draftKey] || {}), rows: newRows, updatedAt: new Date().toISOString() };
        });
        STEApp.toast(`Loaded ${newRows.length} row${newRows.length===1?'':'s'} from template.`, "success");
        distribution();
      } catch (err) {
        STEApp.toast(`Couldn't parse template: ${err.message || err}`, "warn");
      } finally {
        e.target.value = "";
      }
    });
    form.addEventListener("click", (e) => {
      const rmBtn = e.target.closest("[data-3c-row-rm]");
      if (!rmBtn) return;
      const rowEl = rmBtn.closest("[data-3c-row]");
      rowEl.remove();
      paint();
      saveDraft();
    });

    // Category dropdowns. Selecting "+ Add new category…" opens a modal to add
    // a custom category to this org's shared list; any other pick just repaints.
    form.addEventListener("change", (e) => {
      const sel = e.target.closest("select[data-3c-cat-name]");
      if (!sel) {
        paint(); saveDraft();
        return;
      }
      if (sel.value === ADD_CATEGORY_OPTION) {
        // Revert immediately so the dropdown never displays the sentinel, then
        // persist the reverted state so cancelling can't blank the row.
        sel.value = sel.dataset.prev || "";
        saveDraft();
        const rowEl = sel.closest("[data-3c-row]");
        const idx = parseInt(rowEl?.getAttribute("data-3c-row"), 10);
        openAddCategoryModal(idx);
        return;
      }
      sel.dataset.prev = sel.value;
      paint();
      saveDraft();
    });

    function openAddCategoryModal(rowIdx) {
      const modal = makeModal("Add Category", `
        <div class="ste-field">
          <div class="ste-lbl">Category name</div>
          <input class="ste-input" type="text" data-new-cat placeholder="e.g. Tennis, Footwear" autocomplete="off">
          <div class="ste-mini" style="margin-top:8px">Added to ${escape(lic?.legalName || 'your organization')}'s shared category list — available to everyone in your organization.</div>
        </div>
      `, [
        { label: "Cancel", kind: "ghost", onClick: () => closeModal(modal) },
        { label: "Add Category", kind: "primary", onClick: () => {
          const inp = modal.querySelector("[data-new-cat]");
          const name = (inp.value || "").trim();
          if (!name) { STEApp.toast("Enter a category name.", "warn"); return; }
          if (orgCategoryList(STE.get(), lic).some(c => c.toLowerCase() === name.toLowerCase())) {
            STEApp.toast(`"${name}" is already in the list.`, "warn"); return;
          }
          // Persist current amounts, append the category to the org's shared
          // list, assign it to the triggering row, then re-render.
          saveDraft();
          const data = readForm();
          if (Number.isInteger(rowIdx) && data.rows[rowIdx]) data.rows[rowIdx].category = name;
          STE.mutate(s => {
            s.orgCategories = s.orgCategories || {};
            const cur = orgCategoryList(s, lic);
            cur.push(name);
            if (lic?.id) s.orgCategories[lic.id] = cur;
            s.seasonPlanDrafts = s.seasonPlanDrafts || {};
            s.seasonPlanDrafts[draftKey] = { ...(s.seasonPlanDrafts[draftKey] || {}), rows: data.rows };
          });
          closeModal(modal);
          distribution();
        } },
      ]);
      const inp = modal.querySelector("[data-new-cat]");
      if (inp) {
        inp.focus();
        inp.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter") { ev.preventDefault(); modal.querySelector(".ste-modal-foot .ste-btn-primary")?.click(); }
        });
      }
    }

    form.querySelector("[data-3c-submit]")?.addEventListener("click", () => {
      const { rows } = readForm();
      const filled = rows.filter(r => r.category && r.amountReporting > 0);
      if (filled.length === 0) { STEApp.toast("Add at least one row with a Reporting Sales amount.", "warn"); return; }
      const missing = filled.find(r => !r.country || !r.channel || !r.gender);
      if (missing) { STEApp.toast("Every filled row needs Country, Channel, and Gender.", "warn"); return; }
      const total = filled.reduce((s, r) => s + r.amountReporting, 0);
      const totalRetail = filled.reduce((s, r) => s + r.amountRetail, 0);
      const totalSkus = filled.reduce((s, r) => s + r.sku, 0);
      // Roll up category & gender mixes as % of total reporting amount for the
      // dashboard summary tile (back-compat with the prior storage schema).
      const catMix = {};
      filled.forEach(r => { catMix[r.category] = (catMix[r.category] || 0) + r.amountReporting; });
      Object.keys(catMix).forEach(k => { catMix[k] = +(((catMix[k]) / total) * 100).toFixed(1); });
      const gAmt = {}; STE_GENDERS.forEach(g => gAmt[g] = 0);
      filled.forEach(r => { if (gAmt[r.gender] !== undefined) gAmt[r.gender] += r.amountReporting; });
      const computedGenderMix = {};
      STE_GENDERS.forEach(g => { computedGenderMix[g] = +(((gAmt[g]) / total) * 100).toFixed(1); });
      STE.mutate(s => {
        s.seasonPlans = s.seasonPlans || [];
        const id = `${lic.id}-${seasonObj.code}-3C`;
        const existing = s.seasonPlans.find(p => p.id === id);
        const next = {
          id, licenseeId: lic.id, season: seasonObj.code, subplan: "3-C",
          status: "Pending Review",
          submittedAt: new Date().toISOString(),
          rows: filled,
          totalReportingSales: Math.round(total),
          totalRetailSales: Math.round(totalRetail),
          totalSkus,
          // Back-compat aliases used by the dashboard summary card.
          totalRevenueTargetGbp: Math.round(total),
          categoryMix: catMix,
          genderMix: computedGenderMix,
          skuCount: totalSkus,
          avgWholesaleGbp: totalSkus > 0 ? +(total / totalSkus).toFixed(2) : 0,
          aiChecks: [],
        };
        if (existing) Object.assign(existing, next);
        else s.seasonPlans.push(next);
        if (s.seasonPlanDrafts) delete s.seasonPlanDrafts[draftKey];
      });
      STEApp.toast(`Sales Plan submitted — AI Review running.`, "success");
      distribution();
    });
  }

  // ===== Marketing Plan (3-A) entry form — per-activity cards matching the
  // Q1 2026 Marketing template. Each activity collects basic info, KPI
  // targets, channel/content rows, budget breakdown, and (when type=Influencer)
  // an influencer-seeding block. Auto-saves on edit. =====
  function wire3AEntry(form, lic, seasonObj) {
    const cur = lic?.currency || "GBP";
    const sym = cur === "EUR" ? "€" : cur === "USD" ? "$" : "£";
    const draftKey = `_3a_draft_${lic?.id}`;
    const lcode = licCode(lic);
    const scode = seasonObj?.code || "";

    function readForm() {
      // Helper: read a numeric field's value with optional-chain safety on
      // BOTH branches of the ""-vs-parsed check. The old code only guarded
      // the LHS of `=== ""`, so a missing element crashed on `.value` in
      // the parse branch — wired-up but field not yet rendered.
      const numAt = (root, sel, parser) => {
        const el = root.querySelector(sel);
        if (!el) return "";
        if (el.value === "") return "";
        return parser(el.value) || 0;
      };
      const activities = Array.from(form.querySelectorAll("[data-3a-row]")).map((card, i) => {
        const channels = Array.from(card.querySelectorAll("[data-3a-ch-row]")).map(r => ({
          channel:        r.querySelector("[data-3a-ch-channel]")?.value || "",
          contentFormat:  r.querySelector("[data-3a-ch-format]")?.value || "",
          plannedVolume:  numAt(r, "[data-3a-ch-volume]", parseInt),
          publishPeriod: (r.querySelector("[data-3a-ch-period]")?.value || "").trim(),
        }));
        const kpi = {};
        card.querySelectorAll("[data-3a-kpi]").forEach(el => {
          const k = el.getAttribute("data-3a-kpi");
          kpi[k] = el.value === "" ? "" : (parseFloat(el.value) || 0);
        });
        const budget = {};
        card.querySelectorAll("[data-3a-bud]").forEach(el => {
          const k = el.getAttribute("data-3a-bud");
          budget[k] = el.value === "" ? "" : (parseFloat(el.value) || 0);
        });
        const influencer = {
          count:        numAt(card, "[data-3a-inf-count]", parseInt),
          category:    (card.querySelector("[data-3a-inf-cat]")?.value || "").trim(),
          products:     numAt(card, "[data-3a-inf-products]", parseInt),
          tagValue:     numAt(card, "[data-3a-inf-tag]", parseFloat),
          expectedMedia:(card.querySelector("[data-3a-inf-media]")?.value || "").trim(),
        };
        return {
          seq: i + 1,
          activityName: (card.querySelector("[data-3a-name]")?.value || "").trim(),
          activityType: card.querySelector("[data-3a-type]")?.value || "",
          targetCountry: card.querySelector("[data-3a-country]")?.value || "",
          startDate: card.querySelector("[data-3a-start]")?.value || "",
          endDate:   card.querySelector("[data-3a-end]")?.value || "",
          purpose:  (card.querySelector("[data-3a-purpose]")?.value || "").trim(),
          kpi, channels, influencer, budget,
        };
      });
      return { activities };
    }

    function activityTotal(a) {
      return Object.values(a.budget || {}).reduce((s, v) => s + (parseFloat(v) || 0), 0);
    }
    function paint() {
      const { activities } = readForm();
      let grand = 0;
      activities.forEach((a, i) => {
        const t = activityTotal(a);
        grand += t;
        const card = form.querySelectorAll("[data-3a-row]")[i];
        if (!card) return;
        const totEl = card.querySelector("[data-3a-card-total]");
        if (totEl) totEl.textContent = `${sym}${Math.round(t).toLocaleString()}`;
        const budTotEl = card.querySelector("[data-3a-bud-total]");
        if (budTotEl) budTotEl.textContent = `${sym}${Math.round(t).toLocaleString()}`;
        // Per-line % of total. Budget-line strings contain spaces / parens,
        // but inside a quoted attribute selector those are fine — we only
        // need to escape backslashes and the closing quote, neither of which
        // appears in STE_BUDGET_LINES.
        STE_BUDGET_LINES.forEach(line => {
          const el = card.querySelector(`[data-3a-bud-pct="${line}"]`);
          if (!el) return;
          const amt = parseFloat(a.budget?.[line]) || 0;
          el.textContent = t > 0 ? `${Math.round((amt / t) * 100)}%` : "—";
        });
        // Live Plan ID — driven by Licensee, Season, Type, sequence.
        const idEl = card.querySelector("[data-3a-plan-id]");
        if (idEl) {
          const typeSeq = STE_ACTIVITY_TYPE_SEQ[a.activityType] || "ACT";
          const seq = String(i + 1).padStart(3, "0");
          idEl.textContent = `${lcode}-${scode || "SXX"}-${typeSeq}-${seq}`;
        }
      });
      const grandEl = form.querySelector("[data-3a-total]");
      if (grandEl) grandEl.textContent = `${sym}${Math.round(grand).toLocaleString()}`;
      const cntEl = form.querySelector("[data-3a-count]");
      if (cntEl) cntEl.textContent = String(activities.length);
    }

    function saveDraft() {
      const { activities } = readForm();
      STE.mutate(s => {
        s.seasonPlanDrafts = s.seasonPlanDrafts || {};
        s.seasonPlanDrafts[draftKey] = { activities, updatedAt: new Date().toISOString() };
      });
    }

    form.addEventListener("input", () => { paint(); saveDraft(); });
    form.addEventListener("change", (e) => {
      // Switching activity type may show/hide the Influencer block — re-render
      // the card so the section appears/disappears. Other selects just repaint.
      if (e.target.matches("[data-3a-type]")) {
        saveDraft();
        distribution();
        return;
      }
      paint();
      saveDraft();
    });
    paint();

    form.querySelector("[data-3a-add]")?.addEventListener("click", () => {
      saveDraft();
      const { activities } = readForm();
      activities.push({
        seq: activities.length + 1,
        activityName: "", activityType: "", targetCountry: "",
        startDate: "", endDate: "", purpose: "",
        kpi: { reach: "", impressions: "", engagement: "", followerGrowth: "", clicks: "", conversions: "" },
        channels: [{ channel: "", contentFormat: "", plannedVolume: "", publishPeriod: "" }],
        influencer: { count: "", category: "", products: "", tagValue: "", expectedMedia: "" },
        budget: STE_BUDGET_LINES.reduce((acc, line) => { acc[line] = ""; return acc; }, {}),
      });
      STE.mutate(s => { s.seasonPlanDrafts[draftKey].activities = activities; });
      distribution();
    });

    // Activity card events: remove activity, add/remove channel row.
    form.addEventListener("click", (e) => {
      const rmAct = e.target.closest("[data-3a-row-rm]");
      if (rmAct) {
        rmAct.closest("[data-3a-row]").remove();
        paint();
        saveDraft();
        return;
      }
      const rmCh = e.target.closest("[data-3a-ch-rm]");
      if (rmCh) {
        rmCh.closest("[data-3a-ch-row]").remove();
        paint();
        saveDraft();
        return;
      }
      const addCh = e.target.closest("[data-3a-ch-add]");
      if (addCh) {
        saveDraft();
        const card = addCh.closest("[data-3a-row]");
        const idx = parseInt(card.getAttribute("data-3a-row"), 10);
        const { activities } = readForm();
        if (activities[idx]) {
          activities[idx].channels = activities[idx].channels || [];
          activities[idx].channels.push({ channel: "", contentFormat: "", plannedVolume: "", publishPeriod: "" });
          STE.mutate(s => { s.seasonPlanDrafts[draftKey].activities = activities; });
          distribution();
        }
      }
    });

    // Upload Activity Log (.xlsx / .csv) — accepts the 3_Activity_Log sheet
    // shape from the Marketing template: one row per activity with Plan ID,
    // Activity Type, Activity Name, dates, budget amount, KPI columns. Maps
    // each row into an activity card (channel/content + budget breakdown not
    // populated; the user fills those in after).
    // Download a blank Marketing Activity Log template — the row-style
    // version the upload handler accepts (3_Activity_Log shape).
    form.querySelector("[data-3a-template]")?.addEventListener("click", () => {
      const headers = ["Activity Type","Activity Name","Target Country","Channel","Start Date","End Date","Currency","Amount","Reach","Impressions","Engagement","Follower Growth","KPI / Outcome"];
      const rows = [
        ["Campaign","Tennis Heritage Reborn","UK","Instagram","2026-02-01","2026-04-30","GBP",80000,5000000,12000000,250000,8000,"Brand awareness +20%"],
        ["Event","Wimbledon Pop-up","UK","Offline / In-store","2026-06-29","2026-07-13","GBP",45000,50000,"",18000,1500,"12,000 in-store visits"],
      ];
      downloadCsv("marketing-plan-template.csv", headers, rows);
    });
    form.querySelector("[data-3a-upload-btn]")?.addEventListener("click", () => {
      form.querySelector("[data-3a-upload]")?.click();
    });
    form.querySelector("[data-3a-upload]")?.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const rows = await STEValidate.parseSheet(file, ["activity name"]);
        if (rows.length === 0) { STEApp.toast("No data rows found in the template.", "warn"); return; }
        const find = (obj, ...needles) => {
          const keys = Object.keys(obj);
          for (const n of needles) {
            const k = keys.find(kk => kk.toLowerCase().includes(n));
            if (k) return k;
          }
          return undefined;
        };
        const kType = find(rows[0], "activity type");
        const kName = find(rows[0], "activity name");
        const kCountry = find(rows[0], "target country", "country");
        const kCh = find(rows[0], "channel");
        const kStart = find(rows[0], "start date");
        const kEnd = find(rows[0], "end date");
        const kAmt = find(rows[0], "amount");
        const kReach = find(rows[0], "reach");
        const kImp = find(rows[0], "impression");
        const kEng = find(rows[0], "engagement");
        const kFol = find(rows[0], "follower");
        const newActs = rows
          .filter(r => String(r[kName] || "").trim())
          .map((r, i) => {
            const type = String(r[kType] || "").trim();
            const total = parseFloat(r[kAmt]) || 0;
            return {
              seq: i + 1,
              activityName: String(r[kName]).trim(),
              activityType: STE_ACTIVITY_TYPES.find(t => t.toLowerCase() === type.toLowerCase()) || type,
              targetCountry: String(r[kCountry] || "").trim(),
              startDate: String(r[kStart] || "").slice(0, 10),
              endDate:   String(r[kEnd]   || "").slice(0, 10),
              purpose: "",
              kpi: {
                reach: parseFloat(r[kReach]) || "",
                impressions: parseFloat(r[kImp]) || "",
                engagement: parseFloat(r[kEng]) || "",
                followerGrowth: parseFloat(r[kFol]) || "",
                clicks: "", conversions: "",
              },
              channels: [{ channel: String(r[kCh] || "").trim(), contentFormat: "", plannedVolume: "", publishPeriod: "" }],
              influencer: { count: "", category: "", products: "", tagValue: "", expectedMedia: "" },
              // No per-line breakdown in the Activity Log — drop the total into
              // "Other" so it's counted; the user can re-split across lines.
              budget: STE_BUDGET_LINES.reduce((acc, line) => { acc[line] = (line === "Other" ? total : ""); return acc; }, {}),
            };
          });
        if (newActs.length === 0) { STEApp.toast("No activity rows parsed.", "warn"); return; }
        STE.mutate(s => {
          s.seasonPlanDrafts = s.seasonPlanDrafts || {};
          s.seasonPlanDrafts[draftKey] = { ...(s.seasonPlanDrafts[draftKey] || {}), activities: newActs, updatedAt: new Date().toISOString() };
        });
        STEApp.toast(`Loaded ${newActs.length} activit${newActs.length===1?'y':'ies'} from template.`, "success");
        distribution();
      } catch (err) {
        STEApp.toast(`Couldn't parse template: ${err.message || err}`, "warn");
      } finally {
        e.target.value = "";
      }
    });

    form.querySelector("[data-3a-submit]")?.addEventListener("click", () => {
      const { activities } = readForm();
      const filled = activities.filter(a => a.activityName && a.activityType);
      if (filled.length === 0) { STEApp.toast("Add at least one activity with a Name and Type.", "warn"); return; }
      if (filled.some(a => !a.targetCountry)) { STEApp.toast("Every activity needs a Target Country.", "warn"); return; }
      const totals = filled.map(a => Math.round(activityTotal(a)));
      const grand = totals.reduce((s, v) => s + v, 0);
      STE.mutate(s => {
        s.seasonPlans = s.seasonPlans || [];
        const id = `${lic.id}-${seasonObj.code}-3A`;
        const existing = s.seasonPlans.find(p => p.id === id);
        const next = {
          id, licenseeId: lic.id, season: seasonObj.code, subplan: "3-A",
          status: "Pending Review", submittedAt: new Date().toISOString(),
          activities: filled.map((a, i) => {
            const typeSeq = STE_ACTIVITY_TYPE_SEQ[a.activityType] || "ACT";
            const seq = String(i + 1).padStart(3, "0");
            const planId = `${lcode}-${seasonObj.code || "SXX"}-${typeSeq}-${seq}`;
            return { ...a, planId, totalBudget: totals[i] };
          }),
          totalBudgetGbp: grand,
          // Back-compat with the prior schema's `campaigns`/`totalBudgetGbp` —
          // dashboard cards still read these fields.
          campaigns: filled.map((a, i) => ({ name: a.activityName, budgetGbp: totals[i] })),
          aiNotes: [],
        };
        if (existing) Object.assign(existing, next); else s.seasonPlans.push(next);
        if (s.seasonPlanDrafts) delete s.seasonPlanDrafts[draftKey];
      });
      STEApp.toast("Marketing Plan submitted — AI Review running.", "success");
      distribution();
    });
  }

  // ===== Distribution Plan (3-B) entry form — per-account rows matching the
  // Q1 2026 STE template: Country | Channel | Tier | Account Name | Doors |
  // Status | Sales (Reporting) | Sales (Retail). Auto-saves on edit; Submit
  // creates the 3-B plan. =====
  function wire3BEntry(form, lic, seasonObj) {
    const cur = lic?.currency || "GBP";
    const sym = cur === "EUR" ? "€" : cur === "USD" ? "$" : "£";
    const draftKey = `_3b_draft_${lic?.id}`;
    const numOrBlank = (v) => v === "" || v == null ? "" : (parseFloat(v) || 0);

    function readForm() {
      const accounts = Array.from(form.querySelectorAll("[data-3b-row]")).map(r => ({
        country:         r.querySelector("[data-3b-country]")?.value || "",
        channel:         r.querySelector("[data-3b-channel]")?.value || "",
        tier:            r.querySelector("[data-3b-tier]")?.value || "",
        accountName:    (r.querySelector("[data-3b-name]")?.value || "").trim(),
        doors:           numOrBlank(r.querySelector("[data-3b-doors]")?.value),
        status:          r.querySelector("[data-3b-status]")?.value || "",
        amountReporting: numOrBlank(r.querySelector("[data-3b-amt-rep]")?.value),
        amountRetail:    numOrBlank(r.querySelector("[data-3b-amt-ret]")?.value),
      }));
      return { accounts };
    }
    function paint() {
      const { accounts } = readForm();
      const totalRep    = accounts.reduce((s, a) => s + (parseFloat(a.amountReporting) || 0), 0);
      const totalDoors  = accounts.reduce((s, a) => s + (parseInt(a.doors) || 0), 0);
      const totalAccts  = accounts.filter(a => a.accountName).length;
      form.querySelector("[data-3b-total]").textContent    = `${sym}${Math.round(totalRep).toLocaleString()}`;
      form.querySelector("[data-3b-doors]").textContent    = String(totalDoors);
      form.querySelector("[data-3b-accounts]").textContent = String(totalAccts);
    }
    function saveDraft() {
      const d = readForm();
      STE.mutate(s => {
        s.seasonPlanDrafts = s.seasonPlanDrafts || {};
        s.seasonPlanDrafts[draftKey] = { ...d, updatedAt: new Date().toISOString() };
      });
    }

    form.addEventListener("input", () => { paint(); saveDraft(); });
    form.addEventListener("change", () => { paint(); saveDraft(); });
    paint();

    form.querySelector("[data-3b-add]")?.addEventListener("click", () => {
      saveDraft();
      const d = readForm();
      d.accounts.push({ country: "", channel: "", tier: "", accountName: "", doors: "", status: "", amountReporting: "", amountRetail: "" });
      STE.mutate(s => { s.seasonPlanDrafts[draftKey].accounts = d.accounts; });
      distribution();
    });
    form.addEventListener("click", (e) => {
      const rm = e.target.closest("[data-3b-row-rm]");
      if (!rm) return;
      rm.closest("[data-3b-row]").remove();
      paint();
      saveDraft();
    });

    // Upload template (.xlsx / .csv). One row per account; columns are
    // case-insensitive substring matches against the template headers.
    // Download a blank Distribution Plan template with example rows.
    form.querySelector("[data-3b-template]")?.addEventListener("click", () => {
      const headers = ["Country","Channel","Tier","Account Name","Number of Doors","Status","Sales Amount (Reporting)","Sales Amount (Retail)"];
      const rows = [
        ["UK","Wholesale","Tier 1","LCM01 - Little Camden Market",1,"New",450000,900000],
        ["UK","Wholesale","Tier 2","PR004 - Pride Menswear",5,"New",680000,1360000],
      ];
      downloadCsv("distribution-plan-template.csv", headers, rows);
    });
    form.querySelector("[data-3b-upload-btn]")?.addEventListener("click", () => {
      form.querySelector("[data-3b-upload]")?.click();
    });
    form.querySelector("[data-3b-upload]")?.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const rows = await STEValidate.parseSheet(file, ["account name"]);
        if (rows.length === 0) { STEApp.toast("No data rows found in the template.", "warn"); return; }
        const find = (obj, ...needles) => {
          const keys = Object.keys(obj);
          for (const n of needles) {
            const k = keys.find(kk => kk.toLowerCase().includes(n));
            if (k) return k;
          }
          return undefined;
        };
        const kCountry = find(rows[0], "country");
        const kChannel = find(rows[0], "channel");
        const kTier    = find(rows[0], "tier");
        const kName    = find(rows[0], "account name", "account");
        const kDoors   = find(rows[0], "door");
        const kStatus  = find(rows[0], "status");
        const kRep     = find(rows[0], "reporting");
        const kRet     = find(rows[0], "retail");
        const newAccounts = rows
          .filter(r => String(r[kName] || "").trim())
          .map(r => ({
            country:         String(r[kCountry] || "").trim(),
            channel:         String(r[kChannel] || "").trim(),
            tier:            String(r[kTier] || "").trim(),
            accountName:     String(r[kName]).trim(),
            doors:           parseInt(r[kDoors]) || 0,
            status:          String(r[kStatus] || "").trim(),
            amountReporting: parseFloat(r[kRep]) || 0,
            amountRetail:    parseFloat(r[kRet]) || 0,
          }));
        if (newAccounts.length === 0) { STEApp.toast("No account rows parsed.", "warn"); return; }
        STE.mutate(s => {
          s.seasonPlanDrafts = s.seasonPlanDrafts || {};
          s.seasonPlanDrafts[draftKey] = { ...(s.seasonPlanDrafts[draftKey] || {}), accounts: newAccounts, updatedAt: new Date().toISOString() };
        });
        STEApp.toast(`Loaded ${newAccounts.length} account${newAccounts.length===1?'':'s'} from template.`, "success");
        distribution();
      } catch (err) {
        STEApp.toast(`Couldn't parse template: ${err.message || err}`, "warn");
      } finally {
        e.target.value = "";
      }
    });

    form.querySelector("[data-3b-submit]")?.addEventListener("click", () => {
      const { accounts } = readForm();
      const filled = accounts.filter(a => a.accountName && (parseFloat(a.amountReporting) || 0) > 0);
      if (filled.length === 0) { STEApp.toast("Add at least one account with a Reporting Sales amount before submitting.", "warn"); return; }
      const missing = filled.find(a => !a.country || !a.channel || !a.tier || !a.status);
      if (missing) { STEApp.toast("Every filled account needs Country, Channel, Tier, and Status.", "warn"); return; }
      const totalRep   = filled.reduce((s, a) => s + (parseFloat(a.amountReporting) || 0), 0);
      const totalDoors = filled.reduce((s, a) => s + (parseInt(a.doors) || 0), 0);
      STE.mutate(s => {
        s.seasonPlans = s.seasonPlans || [];
        const id = `${lic.id}-${seasonObj.code}-3B`;
        const existing = s.seasonPlans.find(p => p.id === id);
        const next = {
          id, licenseeId: lic.id, season: seasonObj.code, subplan: "3-B",
          status: "Pending Review", submittedAt: new Date().toISOString(),
          accounts: filled.map(a => ({
            country: a.country,
            channel: a.channel,
            tier: a.tier,
            accountName: a.accountName,
            doors: parseInt(a.doors) || 0,
            status: a.status,
            amountReporting: Math.round(parseFloat(a.amountReporting) || 0),
            amountRetail:    Math.round(parseFloat(a.amountRetail) || 0),
          })),
          totalReportingSales: Math.round(totalRep),
          totalDoors,
          totalAccounts: filled.length,
          // totalAccountRevenueGbp kept as a back-compat alias used by the
          // dashboard summary card; equals totalReportingSales.
          totalAccountRevenueGbp: Math.round(totalRep),
          aiNotes: [],
        };
        if (existing) Object.assign(existing, next); else s.seasonPlans.push(next);
        if (s.seasonPlanDrafts) delete s.seasonPlanDrafts[draftKey];
      });
      STEApp.toast("Distribution Plan submitted — AI Review running.", "success");
      distribution();
    });
  }

  // ===== Season Timeline (read view + editor) =====

  // Default milestone schema used when a season has none of its own. Each
  // season can override this — labels, order, and the milestone set itself
  // are editable per-season via the timeline grid in HQ edit mode. The
  // "launch" key is the D-day anchor: every other milestone's D-N is
  // computed against it. Custom milestones added by HQ get auto-generated
  // keys like `ms_xxx` so dates and overrides stay matched on rename.
  const SEASON_MILESTONES = [
    { key: "designSubmitClose",  label: "Design Submission Closes" },
    { key: "designApprovalClose",label: "Design Approval Closes" },
    { key: "planSubmitDeadline", label: "Season Operation Plan Submission Deadline" },
    { key: "sampleReview",       label: "Sample Review" },
    { key: "launch",             label: "Launch" },
    { key: "settlementClose",    label: "Settlement Close" },
  ];

  // Returns the effective milestone schema for a season. Reads from
  // season.milestoneSchema if HQ has customised it, otherwise falls back to
  // the default. Returns a fresh array so callers can iterate safely.
  function getMilestoneSchema(season) {
    if (season && Array.isArray(season.milestoneSchema) && season.milestoneSchema.length > 0) {
      return season.milestoneSchema.slice();
    }
    return SEASON_MILESTONES.slice();
  }

  // Generates a stable id for a new milestone.
  function newMilestoneKey() {
    return "ms_" + Math.random().toString(36).slice(2, 10);
  }

  function dOffsetLabel(milestoneDate, launchDate) {
    if (!milestoneDate || !launchDate) return "—";
    const d = Math.round((new Date(launchDate) - new Date(milestoneDate)) / 86400000);
    return d > 0 ? `D-${d}` : d < 0 ? `D+${Math.abs(d)}` : "D-0";
  }

  function renderSeasonTimelineCard(seasonObj, isHQ, lic, hidden) {
    const base = seasonObj.milestones || {};
    const overrides = (seasonObj.licenseeMilestones || {})[lic?.id] || {};
    const ms = { ...base, ...overrides };
    const launch = ms.launch;
    const today = new Date();
    // The first not-yet-passed milestone is the "next" — gets the highlight.
    const schema = getMilestoneSchema(seasonObj);
    let nextKey = null;
    for (const m of schema) {
      const d = ms[m.key];
      if (d && new Date(d) >= today) { nextKey = m.key; break; }
    }
    const overrideCount = Object.keys(overrides).length;
    return `
      <div class="ste-card ste-season-timeline-card ${hidden ? 'ste-timeline-collapsed' : ''}">
        <div class="ste-card-head">
          <h3>${escape(lic ? lic.name : seasonObj.code)} ${lic ? `<span class="ste-mini" style="font-weight:normal;color:var(--ste-muted);margin-left:6px">${escape(seasonObj.code)} timeline</span>` : ''}</h3>
          <div class="ste-mini" style="display:flex;gap:10px;align-items:center;margin-left:auto">
            ${launch ? `<span>Launch ${fmtDate(launch)}</span>` : ''}
            ${overrideCount > 0 ? `<span class="ste-badge ste-badge-info">${overrideCount} licensee override${overrideCount===1?'':'s'}</span>` : ''}
            ${isHQ && lic ? `<button class="ste-btn ste-btn-ghost ste-btn-mini" data-edit-timeline="${escape(lic.id)}" type="button">Edit</button>` : ''}
            ${isHQ && lic ? `<button class="ste-btn ste-btn-ghost ste-btn-mini" data-toggle-timeline="${escape(lic.id)}" type="button">${hidden ? 'Show' : 'Hide'}</button>` : ''}
          </div>
        </div>
        ${hidden ? '' : `
        <div class="ste-card-body">
          <ol class="ste-timeline-list">
            ${schema.map(m => {
              const date = ms[m.key];
              const dLabel = dOffsetLabel(date, launch);
              const passed = date && new Date(date) < today;
              const isLaunch = m.key === "launch";
              const isNext = m.key === nextKey;
              const isOverridden = Object.prototype.hasOwnProperty.call(overrides, m.key);
              const stateCls = isLaunch ? 'launch' : passed ? 'done' : isNext ? 'next' : 'upcoming';
              const stateLabel = passed ? 'Done' : isNext ? 'Next' : isLaunch ? 'D-0' : 'Upcoming';
              return `
                <li class="ste-timeline-list-row ste-tlrow-${stateCls} ${isOverridden ? 'ste-tlrow-override' : ''}">
                  <span class="ste-tlrow-d">${escape(dLabel)}</span>
                  <span class="ste-tlrow-label">${escape(m.label)}${isOverridden ? ` <span class="ste-mini" style="color:var(--ste-accent);margin-left:6px">custom</span>` : ''}</span>
                  <span class="ste-tlrow-date">${date ? escape(fmtDate(date)) : '—'}</span>
                  <span class="ste-tlrow-state">${stateLabel}</span>
                </li>`;
            }).join("")}
          </ol>
        </div>`}
      </div>`;
  }

  function openSeasonTimelineEditor(seasonCode, licId) {
    const state = STE.get();
    const seasonObj = (state.seasons || []).find(s => s.code === seasonCode);
    if (!seasonObj) return;
    const lic = licId ? (state.licensees || []).find(l => l.id === licId) : null;
    const base = { ...(seasonObj.milestones || {}) };
    const overrides = { ...((seasonObj.licenseeMilestones || {})[licId] || {}) };
    // Editor shows the effective (merged) values; on save we diff against base
    // to compute the override set for this licensee.
    const ms = lic ? { ...base, ...overrides } : { ...base };
    const rowsHtml = getMilestoneSchema(seasonObj).map(m => {
      const isOverridden = lic && Object.prototype.hasOwnProperty.call(overrides, m.key);
      return `
      <tr>
        <td><strong>${escape(m.label)}</strong>${isOverridden ? ` <span class="ste-mini" style="color:var(--ste-accent)">custom</span>` : ''}</td>
        <td><input class="ste-input" type="date" data-ms-key="${escape(m.key)}" value="${escape(ms[m.key] || '')}"></td>
        <td class="ste-mini ste-ms-doffset" data-doffset-for="${escape(m.key)}">—</td>
        ${lic ? `<td>${isOverridden ? `<button class="ste-btn ste-btn-link ste-btn-mini" type="button" data-reset-ms="${escape(m.key)}">Reset to season default</button>` : `<span class="ste-mini" style="color:var(--ste-muted)">= season default</span>`}</td>` : ''}
      </tr>`;
    }).join("");
    const modalTitle = lic
      ? `Edit Timeline for ${lic.legalName} — ${escape(seasonObj.code)}`
      : `Edit Season Timeline — ${escape(seasonObj.code)}`;
    const intro = lic
      ? `<p class="ste-mini" style="margin-bottom:14px">Editing <strong>${escape(lic.legalName)}</strong>'s timeline for ${escape(seasonObj.code)}. Dates that differ from the season default are saved as licensee-specific overrides; leaving a field equal to the season default removes the override.</p>`
      : `<p class="ste-mini" style="margin-bottom:14px">D-day = the Launch milestone. All other D-N values recompute as you edit dates. Save commits the new schedule; all D-N badges and banners across the platform refresh from these values.</p>`;
    const modal = makeModal(modalTitle, `
      ${intro}
      ${lic ? '' : `
      <div class="ste-field" style="margin-bottom:14px">
        <div class="ste-lbl">Season Code</div>
        <input class="ste-input" type="text" id="ste-season-code-edit" value="${escape(seasonObj.code)}">
      </div>`}
      <table class="ste-num-table ste-timeline-edit-table">
        <thead><tr><th>Milestone</th><th>Date</th><th>D-Offset</th>${lic ? '<th></th>' : ''}</tr></thead>
        <tbody id="ste-ms-tbody">${rowsHtml}</tbody>
      </table>
    `, [
      { label: "Cancel", kind: "ghost", onClick: () => closeModal(modal) },
      { label: "Save Timeline", kind: "primary", onClick: () => {
        if (lic) {
          // Per-licensee save: diff against base, store only overrides.
          const newOverrides = {};
          modal.querySelectorAll("[data-ms-key]").forEach(inp => {
            const key = inp.getAttribute("data-ms-key");
            const v = inp.value;
            if (v && v !== base[key]) newOverrides[key] = v;
          });
          STE.mutate(s => {
            const sObj = s.seasons.find(x => x.code === seasonObj.code);
            if (!sObj) return;
            sObj.licenseeMilestones = sObj.licenseeMilestones || {};
            if (Object.keys(newOverrides).length === 0) {
              delete sObj.licenseeMilestones[licId];
            } else {
              sObj.licenseeMilestones[licId] = newOverrides;
            }
          });
          STEApp.toast(`${lic.legalName} timeline saved`, "success");
        } else {
          const newCode = modal.querySelector("#ste-season-code-edit").value.trim() || seasonObj.code;
          const newMs = {};
          modal.querySelectorAll("[data-ms-key]").forEach(inp => {
            newMs[inp.getAttribute("data-ms-key")] = inp.value;
          });
          STE.mutate(s => {
            const sObj = s.seasons.find(x => x.code === seasonObj.code);
            if (!sObj) return;
            sObj.code = newCode;
            sObj.milestones = newMs;
            if (s.currentSeason === seasonObj.code) s.currentSeason = newCode;
          });
          STEApp.toast(`Season timeline saved for ${newCode}`, "success");
        }
        closeModal(modal);
        season();
      }},
    ]);
    // Wire per-row reset buttons (per-licensee mode only)
    modal.querySelectorAll("[data-reset-ms]").forEach(btn => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-reset-ms");
        const input = modal.querySelector(`[data-ms-key="${key}"]`);
        if (input) {
          input.value = base[key] || '';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
    });
    // Live D-offset recompute on date change
    function recompute() {
      const launch = modal.querySelector('[data-ms-key="launch"]').value;
      modal.querySelectorAll("[data-ms-key]").forEach(inp => {
        const key = inp.getAttribute("data-ms-key");
        const cell = modal.querySelector(`[data-doffset-for="${key}"]`);
        if (cell) cell.textContent = dOffsetLabel(inp.value, launch);
      });
    }
    modal.querySelectorAll("[data-ms-key]").forEach(inp => inp.addEventListener("input", recompute));
    recompute();
  }

  function planCard(name, code, p, render) {
    // Route through planStatusPill so the detail page and the list page
    // share a single tone source — earlier this used an ad-hoc map that
    // disagreed (Draft was yellow on the detail, gray on the list, etc.).
    const statusBadge = p ? planStatusPill(p) : "";
    // Approver chip only renders after a decision lands. Pre-decision states
    // (Draft / Pending Review / Under Review) don't have an approver yet,
    // so showing one is misleading.
    const showApprover = p && p.approver && p.status === "Approved";
    const approver = showApprover
      ? `<span class="ste-approver-chip"><span class="ste-mini">Approver</span> ${escape(p.approver.role)} · ${escape(p.approver.name)}</span>`
      : "";
    // AI Checks + Plan-vs-Actual only attach once there's submitted content
    // to evaluate. Suppressing both for Draft so HQ's "Awaiting licensee
    // submission" card stays empty instead of showing residual review
    // output for a plan that doesn't exist yet.
    const showExtras = p && p.status !== "Draft";
    // The render functions all handle `p == null` (a missing plan record
    // for this sub-plan / licensee / season) by falling through to either
    // renderHQAwaiting (HQ side) or the Draft entry form (licensee side).
    // We used to short-circuit to a "Loading…" placeholder when p was
    // falsy — that was masking the entry form for any sub-plan that
    // hadn't been created yet, since the auto-seed step was removed.
    return `
      <div class="ste-card ste-plan-card" data-plan-section="${escape(code || '')}">
        <div class="ste-plan-hd">
          <span class="ste-plan-code"><strong>${escape(name)}</strong></span>
          ${approver}${statusBadge}
        </div>
        <div class="ste-card-body">${render(p) + (showExtras ? (renderAIChecks(p) + renderPlanVsActual(p)) : "")}</div>
      </div>`;
  }

  function renderAIChecks(p) {
    if (!p.aiChecks || !p.aiChecks.length) return "";
    const iconFor = s => ({ pass: "✓", warn: "!", fail: "×" })[s] || "·";
    return `
      <div class="ste-aichecks">
        <div class="ste-aichecks-hd">AI Review · ${p.aiChecks.length} checks <span class="ste-ai-chip">⚡ Auto-evaluated</span></div>
        ${p.aiChecks.map(c => `
          <div class="ste-aicheck ste-aicheck-${c.status}">
            <span class="ste-aicheck-icon">${iconFor(c.status)}</span>
            <div>
              <div class="ste-aicheck-name">${escape(c.name)}</div>
              <div class="ste-aicheck-detail">${escape(c.detail)}</div>
            </div>
          </div>`).join("")}
      </div>`;
  }

  function renderPlanVsActual(p) {
    if (!p.actualVsPlan) return "";
    const quarters = Object.entries(p.actualVsPlan);
    return `
      <div class="ste-pva">
        <div class="ste-pva-hd">Plan vs Actual · auto-tracked from Sales Statements</div>
        <table class="ste-pva-table">
          <thead><tr><th>Quarter</th><th>Plan</th><th>Actual</th><th>Variance</th></tr></thead>
          <tbody>
            ${quarters.map(([q, v]) => {
              if (v.actual == null) {
                return `<tr class="ste-pva-pending"><td>${q}</td><td>${gbp0(v.plan)}</td><td class="ste-pva-pending-cell">pending</td><td>—</td></tr>`;
              }
              const dir = v.variancePct >= 0 ? "up" : "down";
              return `<tr><td>${q}</td><td>${gbp0(v.plan)}</td><td>${gbp0(v.actual)}</td><td class="ste-pva-var ste-pva-var-${dir}">${v.variancePct >= 0 ? '+' : ''}${v.variancePct.toFixed(1)}%</td></tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>`;
  }
  // HQ placeholder shown when the licensee hasn't submitted a plan yet —
  // drafts belong to the licensee and HQ shouldn't see them at all.
  function renderHQAwaiting() {
    return `<div class="ste-mini" style="padding:32px;text-align:center;color:var(--ste-muted)">Awaiting licensee submission.</div>`;
  }
  // Bottom action bar for a submitted plan — role-aware. Licensees get an
  // Edit button (flips back to Draft so they can refine and re-submit)
  // while the plan is still in flight (Pending Review / Rejected). Once
  // HQ has Approved a plan it's locked — no edit affordance for the
  // licensee. HQ gets Approve / Reject while the plan is in Pending
  // Review. Approved / Rejected plans show no HQ actions either — the
  // pill in the card head carries the state.
  function renderPlanActions(subplan, p) {
    const u = STE.currentUser();
    const isHQ = u && STE.isHQ(u);
    if (p && p._displayApprovedPastSeason) return "";
    const st = p && p.status;
    if (!isHQ) {
      // Editable while in flight (Pending Review / Rejected). Approved
      // plans are read-only — locked record, no Edit affordance.
      if (st && st !== "Draft" && st !== "Approved") {
        return `<div class="ste-actions"><button class="ste-btn ste-btn-primary" type="button" data-plan-edit="${escape(subplan)}">Edit Plan</button></div>`;
      }
      return "";
    }
    if (st === "Pending Review" || st === "Under Review") {
      return `<div class="ste-actions">
        <div class="ste-btn-group" role="group" aria-label="Decision">
          <button class="ste-btn ste-btn-ghost" type="button" data-plan-decision="${escape(subplan)}::rejected">Reject</button>
          <button class="ste-btn ste-btn-primary" type="button" data-plan-decision="${escape(subplan)}::approved">Approve</button>
        </div>
      </div>`;
    }
    // After approval — HQ keeps an Undo affordance so a mistaken approval
    // doesn't lock the licensee out. Undo flips the plan back to Pending
    // Review and clears the decision metadata so it re-enters HQ's queue.
    if (st === "Approved") {
      return `<div class="ste-actions">
        <button class="ste-btn ste-btn-ghost" type="button" data-plan-decision="${escape(subplan)}::undo">Undo approval</button>
      </div>`;
    }
    // After rejection — symmetric Undo so HQ can reverse a rejection too.
    if (st === "Rejected") {
      return `<div class="ste-actions">
        <button class="ste-btn ste-btn-ghost" type="button" data-plan-decision="${escape(subplan)}::undo">Undo rejection</button>
      </div>`;
    }
    return "";
  }
  function render3C(p) {
    const u = STE.currentUser();
    const isHQ = u && STE.isHQ(u);
    // HQ never sees the Draft entry form — drafts belong to the licensee.
    if (isHQ && (!p || p.status === "Draft")) return renderHQAwaiting();
    if (!p || p.status === "Draft") return render3CEntry(p);
    return render3CSummary(p) + renderPlanActions("3-C", p);
  }

  function render3CSummary(p) {
    const rows = Array.isArray(p.rows) ? p.rows : [];
    const lic = STE.currentLicensee();
    const cur = lic?.currency || "GBP";
    const sym = cur === "EUR" ? "€" : cur === "USD" ? "$" : "£";
    const state = STE.get();
    const contract = (state.contracts || []).find(c => c.licenseeId === lic?.id);
    const minQ = contract ? (contract.minQuarterlyEur || contract.minQuarterlyGbp || 0) : 0;
    const annualMin = minQ * 4;
    const totalReporting = p.totalReportingSales ?? rows.reduce((s, r) => s + (parseFloat(r.amountReporting) || 0), 0);
    const totalRetail    = p.totalRetailSales    ?? rows.reduce((s, r) => s + (parseFloat(r.amountRetail)    || 0), 0);
    const totalSkus      = p.totalSkus ?? p.skuCount ?? rows.reduce((s, r) => s + (parseInt(r.sku) || 0), 0);
    const minPct = annualMin > 0 ? Math.round((totalReporting / annualMin) * 100) : null;

    // Category allocation — derive from rows when the persisted categoryMix
    // hasn't been computed, so the donut always has data. Aggregate by
    // category, then convert to percentage shares.
    const catTotals = {};
    rows.forEach(r => {
      const k = r.category || "—";
      catTotals[k] = (catTotals[k] || 0) + (parseFloat(r.amountReporting) || 0);
    });
    const totalCat = Object.values(catTotals).reduce((s, v) => s + v, 0);
    const catEntries = Object.entries(catTotals)
      .map(([label, val], i) => ({ label, val, pct: totalCat ? Math.round((val / totalCat) * 100) : 0, color: STE_3C_COLORS[i % STE_3C_COLORS.length] }))
      .sort((a, b) => b.val - a.val);
    const donutGradient = catEntries.length
      ? (() => {
          let cur = 0;
          const stops = catEntries.map(c => { const a = cur; cur += c.pct; return `${c.color} ${a}% ${cur}%`; });
          return stops.join(", ");
        })()
      : "var(--ste-border) 0% 100%";

    // Gender mix — recompute from rows, falling back to stored mix when no
    // per-row gender data exists.
    const genderTotals = {};
    rows.forEach(r => {
      const k = r.gender || "—";
      genderTotals[k] = (genderTotals[k] || 0) + (parseFloat(r.amountReporting) || 0);
    });
    const totalGen = Object.values(genderTotals).reduce((s, v) => s + v, 0);
    const genderMix = STE_GENDERS.map(g => ({
      g,
      pct: totalGen ? Math.round(((genderTotals[g] || 0) / totalGen) * 100) : (p.genderMix?.[g] || 0),
    }));

    return `
      <div class="ste-3c-summary">
        <div class="ste-3c-donut-card">
          <div class="ste-mini">CATEGORY ALLOCATION</div>
          <div class="ste-3c-donut-wrap">
            <div class="ste-3c-donut" style="background: conic-gradient(${donutGradient});"></div>
            <div class="ste-3c-donut-center">
              <div class="ste-big">${sym}${(Math.round(totalReporting / 1000)).toLocaleString()}K</div>
              <div class="ste-mini">reporting</div>
            </div>
          </div>
        </div>
        <div class="ste-3c-kpi-stat">
          <div class="ste-mini">MINIMUM COVERAGE</div>
          <div class="ste-3c-stat-body">
            <div class="ste-big">${minPct == null ? '—' : (minPct + '%')}</div>
            <div class="ste-mini">vs annual min ${annualMin ? sym + annualMin.toLocaleString() : '—'}</div>
          </div>
        </div>
        <div class="ste-3c-kpi-counts">
          <div class="ste-mini">TOTAL Style Codes</div>
          <div class="ste-3c-stat-body">
            <div class="ste-big">${totalSkus.toLocaleString()}</div>
            <div class="ste-mini">across ${rows.length} row${rows.length === 1 ? '' : 's'}</div>
          </div>
        </div>
        <div class="ste-3c-kpi-gender">
          <div class="ste-mini">GENDER MIX</div>
          <div class="ste-3c-gender-body">
            ${genderMix.map(({ g, pct }) => `
              <div class="ste-3c-gender-row">
                <span class="ste-mini">${escape(g)}</span>
                <div class="ste-3c-mini-bar"><div style="width:${pct}%"></div></div>
                <span class="ste-3c-mini-pct">${pct}%</span>
              </div>`).join("")}
          </div>
        </div>
      </div>

      <table class="ste-3b-table ste-3c-acct-table" style="margin-top:14px">
        <colgroup>
          <col style="width:8%"><col style="width:12%"><col style="width:16%"><col style="width:11%">
          <col style="width:7%"><col style="width:17%"><col style="width:17%">
        </colgroup>
        <thead>
          <tr>
            <th>Country</th><th>Channel</th><th>Category</th><th>Gender</th>
            <th># Style Codes</th><th>Sales (Reporting)</th><th>Sales (Retail)</th>
          </tr>
        </thead>
        <tbody>${rows.map(r => `
          <tr>
            <td>${escape(r.country || '—')}</td>
            <td>${escape(r.channel || '—')}</td>
            <td><strong>${escape(r.category || '—')}</strong></td>
            <td>${escape(r.gender || '—')}</td>
            <td>${r.sku ?? '—'}</td>
            <td>${sym}${(parseFloat(r.amountReporting)||0).toLocaleString()}</td>
            <td>${sym}${(parseFloat(r.amountRetail)||0).toLocaleString()}</td>
          </tr>`).join("") || '<tr><td colspan="7"><span class="ste-mini">No rows yet.</span></td></tr>'}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="4"><strong>Totals</strong></td>
            <td><strong>${totalSkus.toLocaleString()}</strong></td>
            <td><strong>${sym}${totalReporting.toLocaleString()}</strong></td>
            <td><strong>${sym}${totalRetail.toLocaleString()}</strong></td>
          </tr>
        </tfoot>
      </table>`;
  }

  // Categorical palette for the 3-C category-allocation donut + per-row bars.
  // Index-aligned: row i uses STE_3C_COLORS[i % length] in both the donut
  // slice and that row's bar fill, so the editable rows double as the
  // donut's legend (no separate legend list to keep in sync).
  const STE_3C_COLORS = ['#1d4ed8','#0891b2','#16a34a','#ca8a04','#dc2626','#7c3aed','#db2777','#0f766e','#b45309','#475569'];

  // Sentinel used as the trailing <option> value in category dropdowns; picking
  // it opens the "add a custom category" flow instead of selecting a value.
  const ADD_CATEGORY_OPTION = "__add_category__";
  // Product Category taxonomy — the 36 leaf PRODUCT CATEGORY values from the
  // standardized Licensee Category Mapping.xlsx (STO Sales & Royalty Reporting
  // taxonomy: WEAR / ACC / SHOES). Flattened to a single alphabetical list.
  const DEFAULT_3C_CATS = ["Backpacks", "Bandanas", "Cosmetics & Perfumes", "Dress", "Fleece", "Footwear", "Glass Cases", "Headbands", "Headwear", "Home Textile Products", "Jackets", "Knitwear", "Leather Goods", "Leggings", "Luggage", "Optical Frames", "Other Sports Accessories", "Pants", "Polo", "Pyjamas", "Shoe Bags", "Shorts", "Skirts", "Skiwear", "Socks", "Sports/Tennis Bags", "Sunglasses", "Swimwear", "T Shirt", "Towels", "Trackpants", "Tracksuit", "Tracktop", "Underwear", "Watches", "Wristbands"];

  // Reference dropdown values. Gender / Tier / Customer Type mirror the
  // standardized Licensee Category Mapping.xlsx; the rest still follow the
  // per-report Q1 2026 STE Excel templates (Reference sheet).
  const STE_COUNTRIES = ["UK","IE","IT","FR","DE","ES","PT","NL","BE","AT","CH","DK","SE","NO","FI","PL","CZ","GR","Multi-EU"];
  const STE_DIST_CHANNELS = ["Wholesale", "Marketplace", "ST Website"];
  // Matches REF_TIERS (the standardized numeric tier ladder) so the 3-B form
  // emits values the analytics layer can aggregate. ST Online / Other are the
  // mapping file's fixed buckets alongside the numeric tiers.
  const STE_DIST_TIERS = ["Tier 0", "Tier 1", "Tier 2", "Tier 3", "Tier 4", "ST Online", "Other"];
  const STE_DIST_STATUS = ["New", "Existing", "Renewing", "Closing", "On Hold"];
  // Customer Type from the mapping file (used as the Sales Plan channel axis).
  const STE_SALES_CHANNELS = ["Retail", "Wholesale", "Marketplace", "ST Online", "Other Licensee", "Other"];
  const STE_GENDERS = ["Mens", "Womens", "Kids", "Other"];
  const STE_ACTIVITY_TYPES = ["Campaign", "Event", "Collaboration", "Media", "Influencer", "Trade Show"];
  const STE_ACTIVITY_TYPE_SEQ = { Campaign: "CMP", Event: "EVT", Collaboration: "COL", Media: "MED", Influencer: "INF", "Trade Show": "TSH" };
  const STE_MKT_CHANNELS = ["Instagram", "Blog", "YouTube", "TikTok", "Facebook", "Print", "Offline / In-store", "OOH (Outdoor)", "PR / Editorial", "Trade Show Booth", "Other"];
  const STE_CONTENT_FORMATS = ["Post (Feed)", "Reels / Short Video", "Story", "Long Video", "Article / Blog", "Press Release", "Event Coverage", "Booth Display", "Print Ad", "Digital Banner", "Newsletter", "Other"];
  const STE_BUDGET_LINES = ["Media (Advertising)", "Production", "Influencer", "Event", "Trade Show", "Collaboration Fee", "Other"];

  // Derive a 4-char licensee brand code (e.g. "Best of Britain Ltd" → "BBLT")
  // for Plan IDs in the Marketing template format Licensee-Season-Type-Seq.
  function licCode(lic) {
    if (!lic) return "LIC";
    if (lic.codeShort) return String(lic.codeShort).toUpperCase().slice(0, 6);
    const name = (lic.legalName || lic.id || "").replace(/[^A-Za-z ]/g, "").trim();
    if (!name) return "LIC";
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 4).toUpperCase();
    return parts.map(p => p[0]).join("").slice(0, 4).toUpperCase();
  }
  // The category options for a licensee org. Shared across that org: once a
  // custom category is added it persists in state.orgCategories[licId] and
  // shows up for everyone in the same licensee. Falls back to the licensee's
  // profile categories, then the static default set, until the first custom add.
  function orgCategoryList(state, lic) {
    const seed = (lic?.categories && lic.categories.length) ? lic.categories.slice() : DEFAULT_3C_CATS.slice();
    const oc = state?.orgCategories || {};
    return (lic?.id && oc[lic.id] && oc[lic.id].length) ? oc[lic.id].slice() : seed;
  }

  function render3CEntry(p) {
    const state = STE.get();
    const lic = STE.currentLicensee();
    const cur = lic?.currency || "GBP";
    const sym = cur === "EUR" ? "€" : cur === "USD" ? "$" : "£";
    // Pull the quarterly minimum from the licensee's active contract so the
    // header can show "Minimum 대비" as a real % rather than a placeholder.
    const contract = (state.contracts || []).find(c => c.licenseeId === lic?.id);
    const minQ = contract ? (contract.minQuarterlyEur || contract.minQuarterlyGbp || 0) : 0;
    const annualMin = minQ * 4;

    // Per-row schema matches the Q1 2026 Sales Plan template: Country |
    // Distribution Channel | Category | Gender | # of SKU | Sales (Reporting)
    // | Sales (Retail). Categories shared across the licensee org.
    const orgCats = orgCategoryList(state, lic);
    const draftKey = `_3c_draft_${lic?.id}`;
    const stored = state.seasonPlanDrafts?.[draftKey] || {};
    function emptyRow() {
      return { country: "", channel: "", category: "", gender: "", sku: "", amountReporting: "", amountRetail: "" };
    }
    const rows = (stored.rows && stored.rows.length)
      ? stored.rows
      : [emptyRow(), emptyRow()];

    return `
      <div class="ste-3c-entry" data-3c-form>
        <div class="ste-3c-summary">
          <div class="ste-3c-donut-card">
            <div class="ste-mini">CATEGORY ALLOCATION</div>
            <div class="ste-3c-donut-wrap">
              <div class="ste-3c-donut" data-3c-donut></div>
              <div class="ste-3c-donut-center">
                <div class="ste-big" data-3c-total>${sym}0</div>
                <div class="ste-mini">reporting</div>
              </div>
            </div>
          </div>
          <div class="ste-3c-kpi-stat">
            <div class="ste-mini">MINIMUM COVERAGE</div>
            <div class="ste-3c-stat-body">
              <div class="ste-big" data-3c-min-pct>—</div>
              <div class="ste-mini">vs annual min ${annualMin ? sym + annualMin.toLocaleString() : '—'}</div>
            </div>
          </div>
          <div class="ste-3c-kpi-counts">
            <div class="ste-mini">TOTAL Style Codes</div>
            <div class="ste-3c-stat-body">
              <div class="ste-big" data-3c-skus>0</div>
              <div class="ste-mini">across all rows</div>
            </div>
          </div>
          <div class="ste-3c-kpi-gender">
            <div class="ste-mini">GENDER MIX</div>
            <div class="ste-3c-gender-body">
              ${STE_GENDERS.map(g => `
                <div class="ste-3c-gender-row">
                  <span class="ste-mini">${g}</span>
                  <div class="ste-3c-mini-bar"><div data-g-bar="${g}"></div></div>
                  <span class="ste-3c-mini-pct" data-g-pct="${g}">0%</span>
                </div>`).join("")}
            </div>
          </div>
        </div>

        <div class="ste-plan-toolbar">
          <div class="ste-form-subhd" style="margin:0">Sales rows</div>
          <input type="file" data-3c-upload accept=".xlsx,.csv" hidden>
          <button type="button" class="ste-btn ste-btn-ghost ste-btn-mini" data-3c-template>Download template</button>
          <button type="button" class="ste-btn ste-btn-ghost ste-btn-mini" data-3c-upload-btn>Upload template (.xlsx, .csv)</button>
        </div>

        <table class="ste-3b-table ste-3c-acct-table">
          <colgroup>
            <col style="width:8%">
            <col style="width:12%">
            <col style="width:16%">
            <col style="width:11%">
            <col style="width:7%">
            <col style="width:17%">
            <col style="width:17%">
            <col style="width:36px">
          </colgroup>
          <thead>
            <tr>
              <th>Country</th>
              <th>Channel</th>
              <th>Category</th>
              <th>Gender</th>
              <th># Style Codes</th>
              <th>Sales (Reporting)</th>
              <th>Sales (Retail)</th>
              <th></th>
            </tr>
          </thead>
          <tbody data-3c-rows>
            ${rows.map((r, i) => {
              const catOpts = Array.from(new Set([...orgCats, ...(r.category ? [r.category] : [])]));
              return `
              <tr class="ste-3b-row" data-3c-row="${i}">
                <td><select class="ste-input ste-cell-select" data-3c-country>
                  <option value="" ${!r.country?'selected':''} disabled>—</option>
                  ${STE_COUNTRIES.map(c => `<option value="${escape(c)}" ${c===r.country?'selected':''}>${escape(c)}</option>`).join("")}
                </select></td>
                <td><select class="ste-input ste-cell-select" data-3c-channel>
                  <option value="" ${!r.channel?'selected':''} disabled>—</option>
                  ${STE_SALES_CHANNELS.map(c => `<option value="${escape(c)}" ${c===r.channel?'selected':''}>${escape(c)}</option>`).join("")}
                </select></td>
                <td><select class="ste-input ste-cell-select ste-3c-cat-name" data-3c-cat-name data-prev="${escape(r.category || '')}">
                  <option value="" ${!r.category?'selected':''} disabled>Category…</option>
                  ${catOpts.map(c => `<option value="${escape(c)}" ${c===r.category?'selected':''}>${escape(c)}</option>`).join("")}
                  <option value="${ADD_CATEGORY_OPTION}">+ Add new category…</option>
                </select></td>
                <td><select class="ste-input ste-cell-select" data-3c-cat-gender>
                  <option value="" ${!r.gender?'selected':''} disabled>—</option>
                  ${STE_GENDERS.map(g => `<option value="${g}" ${g===r.gender?'selected':''}>${g}</option>`).join("")}
                </select></td>
                <td><input class="ste-input ste-3b-cnt" type="number" min="0" step="1" value="${escape(r.sku)}" data-3c-sku-row></td>
                <td><div class="ste-3c-amount-wrap"><span class="ste-3c-sym">${sym}</span><input class="ste-input ste-3c-cat-amount" type="number" min="0" step="1000" value="${escape(r.amountReporting)}" data-3c-amt-rep></div></td>
                <td><div class="ste-3c-amount-wrap"><span class="ste-3c-sym">${sym}</span><input class="ste-input" type="number" min="0" step="1000" value="${escape(r.amountRetail)}" data-3c-amt-ret></div></td>
                <td><button type="button" class="ste-3c-row-rm" data-3c-row-rm aria-label="Remove">×</button></td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
        <div class="ste-plan-form-actions">
          <button type="button" class="ste-btn ste-btn-ghost ste-btn-mini ste-3c-add-cat-btn" data-3c-add-cat>+ Add row</button>
          <button class="ste-btn ste-btn-primary" data-3c-submit>Submit</button>
        </div>
      </div>`;
  }
  function render3A(p) {
    const u = STE.currentUser();
    const isHQ = u && STE.isHQ(u);
    // HQ never sees the Draft entry form — drafts belong to the licensee.
    if (isHQ && (!p || p.status === "Draft")) return renderHQAwaiting();
    // Licensee with no record yet OR explicit Draft → entry form.
    if (!p || p.status === "Draft") return render3ADraft(p);
    const lic = STE.currentLicensee();
    const cur = lic?.currency || "GBP";
    const sym = cur === "EUR" ? "€" : cur === "USD" ? "$" : "£";
    const activities = Array.isArray(p.activities) ? p.activities : [];
    const campaigns  = Array.isArray(p.campaigns)  ? p.campaigns  : [];
    const aiNotes    = Array.isArray(p.aiNotes)    ? p.aiNotes    : [];
    const totalBudget = activities.length
      ? activities.reduce((s, a) => s + (parseFloat(a.totalBudget) || 0), 0)
      : (p.totalBudgetGbp || campaigns.reduce((s, c) => s + (parseFloat(c.budgetGbp) || 0), 0));
    const count = activities.length || campaigns.length;
    const lcode = licCode(lic);
    const scode = seasonCode(p);

    // Read-only activity card — mirrors the draft card layout so view / edit
    // share the same shell. Channels, KPIs, budget breakdown all rendered as
    // static blocks; the influencer section only appears for Influencer type.
    const readonlyCard = (a, i) => {
      const seq = String((a.seq != null ? a.seq : (i + 1))).padStart(3, "0");
      const typeSeq = STE_ACTIVITY_TYPE_SEQ[a.activityType] || "ACT";
      const planId = a.planId || `${lcode}-${scode || "SXX"}-${typeSeq}-${seq}`;
      const cardBudget = a.totalBudget != null ? a.totalBudget
        : Object.values(a.budget || {}).reduce((s, v) => s + (parseFloat(v) || 0), 0);
      const channels = (a.channels || []).filter(c => c.channel || c.contentFormat);
      const kpi = a.kpi || {};
      const budget = a.budget || {};
      const showInfluencer = a.activityType === "Influencer" && a.influencer;
      return `
        <div class="ste-3a-card">
          <div class="ste-3a-card-hd">
            <div>
              <div class="ste-mini">PLAN ID</div>
              <div class="ste-3a-plan-id">${escape(planId)}</div>
            </div>
            <div class="ste-3a-card-total">
              <div class="ste-mini">ACTIVITY BUDGET</div>
              <div class="ste-big">${sym}${(parseFloat(cardBudget)||0).toLocaleString()}</div>
            </div>
          </div>

          <div class="ste-3a-readonly-grid">
            <div><div class="ste-mini">Activity name</div><div><strong>${escape(a.activityName || '—')}</strong></div></div>
            <div><div class="ste-mini">Activity type</div><div>${escape(a.activityType || '—')}</div></div>
            <div><div class="ste-mini">Target country</div><div>${escape(a.targetCountry || '—')}</div></div>
            <div><div class="ste-mini">Start date</div><div>${escape((a.startDate || '—').slice(0, 10))}</div></div>
            <div><div class="ste-mini">End date</div><div>${escape((a.endDate || '—').slice(0, 10))}</div></div>
            ${a.purpose ? `<div style="grid-column:1/-1"><div class="ste-mini">Purpose</div><div>${escape(a.purpose)}</div></div>` : ''}
          </div>

          ${channels.length ? `
            <div class="ste-form-subhd" style="margin-top:12px">Channels &amp; content</div>
            <table class="ste-table">
              <thead><tr><th>Channel</th><th>Content format</th><th>Planned volume</th><th>Publish period</th></tr></thead>
              <tbody>${channels.map(c => `<tr>
                <td>${escape(c.channel || '—')}</td>
                <td>${escape(c.contentFormat || '—')}</td>
                <td>${escape(c.plannedVolume || '—')}</td>
                <td>${escape(c.publishPeriod || '—')}</td>
              </tr>`).join("")}</tbody>
            </table>` : ''}

          <div class="ste-form-subhd" style="margin-top:12px">KPI targets</div>
          <div class="ste-3a-readonly-grid">
            <div><div class="ste-mini">Reach</div><div>${escape(kpi.reach || '—')}</div></div>
            <div><div class="ste-mini">Impressions</div><div>${escape(kpi.impressions || '—')}</div></div>
            <div><div class="ste-mini">Engagement</div><div>${escape(kpi.engagement || '—')}</div></div>
            <div><div class="ste-mini">Follower growth</div><div>${escape(kpi.followerGrowth || '—')}</div></div>
            <div><div class="ste-mini">Clicks</div><div>${escape(kpi.clicks || '—')}</div></div>
            <div><div class="ste-mini">Conversions</div><div>${escape(kpi.conversions || '—')}</div></div>
          </div>

          ${showInfluencer ? `
            <div class="ste-form-subhd" style="margin-top:12px">Influencer block</div>
            <div class="ste-3a-readonly-grid">
              <div><div class="ste-mini">Count</div><div>${escape(a.influencer.count || '—')}</div></div>
              <div><div class="ste-mini">Category</div><div>${escape(a.influencer.category || '—')}</div></div>
              <div><div class="ste-mini">Products</div><div>${escape(a.influencer.products || '—')}</div></div>
              <div><div class="ste-mini">Tag value</div><div>${escape(a.influencer.tagValue || '—')}</div></div>
              <div><div class="ste-mini">Expected media</div><div>${escape(a.influencer.expectedMedia || '—')}</div></div>
            </div>` : ''}

          <div class="ste-form-subhd" style="margin-top:12px">Budget breakdown</div>
          <table class="ste-table">
            <thead><tr><th>Line</th><th class="ste-num">Amount</th></tr></thead>
            <tbody>${STE_BUDGET_LINES.map(line => `<tr>
              <td>${escape(line)}</td>
              <td class="ste-num">${sym}${(parseFloat(budget[line])||0).toLocaleString()}</td>
            </tr>`).join("")}</tbody>
            <tfoot><tr><td><strong>Total</strong></td><td class="ste-num"><strong>${sym}${(parseFloat(cardBudget)||0).toLocaleString()}</strong></td></tr></tfoot>
          </table>
        </div>`;
    };

    return `
      <div class="ste-3a">
        <div class="ste-3c-kpis">
          <div class="ste-3c-kpi">
            <div class="ste-mini">TOTAL MARKETING BUDGET</div>
            <div class="ste-big">${sym}${(parseFloat(totalBudget)||0).toLocaleString()}</div>
          </div>
          <div class="ste-3c-kpi">
            <div class="ste-mini">ACTIVITIES</div>
            <div class="ste-big">${count}</div>
          </div>
        </div>
        ${activities.length ? `
          <div class="ste-3a-cards" style="margin-top:14px">${activities.map(readonlyCard).join("")}</div>
        ` : campaigns.length ? `
          <table class="ste-table" style="margin-top:14px">
            <thead><tr><th>Activity</th><th class="ste-num">Budget</th></tr></thead>
            <tbody>${campaigns.map(c => `<tr><td>${escape(c.name || '—')}</td><td class="ste-num">${sym}${(parseFloat(c.budgetGbp)||0).toLocaleString()}</td></tr>`).join("")}</tbody>
          </table>
        ` : '<div class="ste-empty-cell" style="padding:24px;text-align:center;color:var(--ste-muted);margin-top:14px">No activities recorded.</div>'}
        ${aiNotes.length ? `
        <div class="ste-ai-notes">
          <div class="ste-ai-hd">AI · HQ AI Pre-Review</div>
          <ul>${aiNotes.map(n => `<li>${n}</li>`).join("")}</ul>
        </div>` : ''}
        ${renderPlanActions("3-A", p)}
      </div>`;
  }
  function render3ADraft(p) {
    const lic = STE.currentLicensee();
    const cur = lic?.currency || "GBP";
    const sym = cur === "EUR" ? "€" : cur === "USD" ? "$" : "£";
    const draftKey = `_3a_draft_${lic?.id}`;
    const stored = STE.get().seasonPlanDrafts?.[draftKey] || {};
    // Per-activity cards matching the Q1 2026 Marketing Plan submission form.
    // Each card holds basic activity info, KPI targets, channel/content rows,
    // budget breakdown by line, and an optional influencer block (visible when
    // the type is Influencer).
    function emptyActivity() {
      return {
        activityName: "", activityType: "", targetCountry: "",
        startDate: "", endDate: "", purpose: "",
        kpi: { reach: "", impressions: "", engagement: "", followerGrowth: "", clicks: "", conversions: "" },
        channels: [{ channel: "", contentFormat: "", plannedVolume: "", publishPeriod: "" }],
        influencer: { count: "", category: "", products: "", tagValue: "", expectedMedia: "" },
        budget: STE_BUDGET_LINES.reduce((acc, line) => { acc[line] = ""; return acc; }, {}),
      };
    }
    const activities = (stored.activities && stored.activities.length)
      ? stored.activities
      : [emptyActivity()];

    const lcode = licCode(lic);
    const scode = seasonCode(p); // resolved below; fallback ok

    return `
      <div class="ste-3a-entry" data-3a-form>
        <div class="ste-3c-kpis">
          <div class="ste-3c-kpi">
            <div class="ste-mini">TOTAL MARKETING BUDGET</div>
            <div class="ste-big" data-3a-total>${sym}0</div>
          </div>
          <div class="ste-3c-kpi">
            <div class="ste-mini">ACTIVITIES</div>
            <div class="ste-big" data-3a-count>${activities.length}</div>
          </div>
        </div>

        <div class="ste-plan-toolbar">
          <div class="ste-form-subhd" style="margin:0">Activities</div>
          <input type="file" data-3a-upload accept=".xlsx,.csv" hidden>
          <button type="button" class="ste-btn ste-btn-ghost ste-btn-mini" data-3a-template>Download template</button>
          <button type="button" class="ste-btn ste-btn-ghost ste-btn-mini" data-3a-upload-btn>Upload Activity Log (.xlsx, .csv)</button>
        </div>

        <div class="ste-3a-cards" data-3a-rows>
          ${activities.map((a, i) => render3ACard(a, i, sym, lcode, scode)).join("")}
        </div>

        <div class="ste-plan-form-actions">
          <button type="button" class="ste-btn ste-btn-ghost ste-btn-mini ste-3c-add-cat-btn" data-3a-add>+ Add activity</button>
          <button class="ste-btn ste-btn-primary" data-3a-submit>Submit</button>
        </div>
      </div>`;
  }

  // Season code helper — Plan IDs include the season (e.g. SS26). Falls back
  // to "" when the plan object doesn't expose one (caller is responsible for
  // re-generating IDs on save).
  function seasonCode(p) {
    return (p && p.season) || "";
  }

  // One activity card. Plan ID is derived live from Licensee + Season + Type +
  // Sequence; visible to the licensee so they know what reference they're
  // submitting. Budget lines + KPI grid mirror the Excel template sections.
  function render3ACard(a, i, sym, lcode, scode) {
    const seq = String((a.seq != null ? a.seq : (i + 1))).padStart(3, "0");
    const typeSeq = STE_ACTIVITY_TYPE_SEQ[a.activityType] || "ACT";
    const planId = `${lcode}-${scode || "SXX"}-${typeSeq}-${seq}`;
    const showInfluencer = a.activityType === "Influencer";
    return `
      <div class="ste-3a-card" data-3a-row="${i}">
        <div class="ste-3a-card-hd">
          <div>
            <div class="ste-mini">PLAN ID</div>
            <div class="ste-3a-plan-id" data-3a-plan-id>${escape(planId)}</div>
          </div>
          <div class="ste-3a-card-total">
            <div class="ste-mini">ACTIVITY BUDGET</div>
            <div class="ste-big" data-3a-card-total>${sym}0</div>
          </div>
          <button type="button" class="ste-3c-row-rm" data-3a-row-rm aria-label="Remove activity">×</button>
        </div>

        <div class="ste-3a-grid">
          <label class="ste-field">
            <span class="ste-lbl">Activity name</span>
            <input class="ste-input" type="text" value="${escape(a.activityName)}" data-3a-name placeholder="e.g. Tennis Heritage Reborn">
          </label>
          <label class="ste-field">
            <span class="ste-lbl">Activity type</span>
            <select class="ste-input" data-3a-type>
              <option value="" ${!a.activityType?'selected':''} disabled>—</option>
              ${STE_ACTIVITY_TYPES.map(t => `<option value="${escape(t)}" ${t===a.activityType?'selected':''}>${escape(t)}</option>`).join("")}
            </select>
          </label>
          <label class="ste-field">
            <span class="ste-lbl">Target country</span>
            <select class="ste-input" data-3a-country>
              <option value="" ${!a.targetCountry?'selected':''} disabled>—</option>
              ${STE_COUNTRIES.map(c => `<option value="${escape(c)}" ${c===a.targetCountry?'selected':''}>${escape(c)}</option>`).join("")}
            </select>
          </label>
          <label class="ste-field">
            <span class="ste-lbl">Start date</span>
            <input class="ste-input" type="date" value="${escape(a.startDate)}" data-3a-start>
          </label>
          <label class="ste-field">
            <span class="ste-lbl">End date</span>
            <input class="ste-input" type="date" value="${escape(a.endDate)}" data-3a-end>
          </label>
          <label class="ste-field ste-3a-purpose">
            <span class="ste-lbl">Purpose / strategic background</span>
            <textarea class="ste-input" rows="3" data-3a-purpose placeholder="Why this activity, and what it's expected to achieve.">${escape(a.purpose)}</textarea>
          </label>
        </div>

        <div class="ste-form-subhd" style="margin-top:14px">Quantitative targets</div>
        <div class="ste-3a-kpi-grid">
          ${[
            ["reach", "Target Reach", "Persons"],
            ["impressions", "Target Impressions", "Views"],
            ["engagement", "Target Engagement", "Actions"],
            ["followerGrowth", "Target Follower Growth", "Persons"],
            ["clicks", "Target Click-through", "Clicks"],
            ["conversions", "Target Conversions", "Count"],
          ].map(([key, label, unit]) => `
            <label class="ste-3a-kpi">
              <span class="ste-lbl">${label}</span>
              <input class="ste-input" type="number" min="0" step="1" value="${escape(a.kpi?.[key] ?? '')}" data-3a-kpi="${key}">
              <span class="ste-mini">${unit}</span>
            </label>`).join("")}
        </div>

        <div class="ste-form-subhd" style="margin-top:14px">Channel &amp; content plan</div>
        <table class="ste-3b-table ste-3a-ch-table" data-3a-ch-table>
          <colgroup>
            <col style="width:22%"><col style="width:22%"><col style="width:16%"><col style="width:36%"><col style="width:36px">
          </colgroup>
          <thead>
            <tr><th>Channel</th><th>Content format</th><th>Planned volume</th><th>Publish period</th><th></th></tr>
          </thead>
          <tbody data-3a-ch-rows>
            ${(a.channels || []).map((c, j) => `
              <tr class="ste-3b-row" data-3a-ch-row="${j}">
                <td><select class="ste-input ste-cell-select" data-3a-ch-channel>
                  <option value="" ${!c.channel?'selected':''} disabled>—</option>
                  ${STE_MKT_CHANNELS.map(ch => `<option value="${escape(ch)}" ${ch===c.channel?'selected':''}>${escape(ch)}</option>`).join("")}
                </select></td>
                <td><select class="ste-input ste-cell-select" data-3a-ch-format>
                  <option value="" ${!c.contentFormat?'selected':''} disabled>—</option>
                  ${STE_CONTENT_FORMATS.map(f => `<option value="${escape(f)}" ${f===c.contentFormat?'selected':''}>${escape(f)}</option>`).join("")}
                </select></td>
                <td><input class="ste-input ste-3b-cnt" type="number" min="0" step="1" value="${escape(c.plannedVolume)}" data-3a-ch-volume></td>
                <td><input class="ste-input" type="text" value="${escape(c.publishPeriod)}" data-3a-ch-period placeholder="e.g. 2026-02 — 2026-04"></td>
                <td><button type="button" class="ste-3c-row-rm" data-3a-ch-rm aria-label="Remove">×</button></td>
              </tr>`).join("")}
          </tbody>
        </table>
        <button type="button" class="ste-btn ste-btn-ghost ste-btn-mini ste-3c-add-cat-btn" data-3a-ch-add>+ Add channel row</button>

        ${showInfluencer ? `
          <div class="ste-form-subhd" style="margin-top:14px">Influencer seeding</div>
          <div class="ste-3a-inf-grid">
            <label class="ste-field">
              <span class="ste-lbl"># Influencers</span>
              <input class="ste-input" type="number" min="0" step="1" value="${escape(a.influencer?.count ?? '')}" data-3a-inf-count>
            </label>
            <label class="ste-field">
              <span class="ste-lbl">Category</span>
              <input class="ste-input" type="text" value="${escape(a.influencer?.category ?? '')}" data-3a-inf-cat placeholder="Tennis / Lifestyle / Fashion / Sport">
            </label>
            <label class="ste-field">
              <span class="ste-lbl"># Seeding products</span>
              <input class="ste-input" type="number" min="0" step="1" value="${escape(a.influencer?.products ?? '')}" data-3a-inf-products>
            </label>
            <label class="ste-field">
              <span class="ste-lbl">Total TAG value</span>
              <div class="ste-3c-amount-wrap"><span class="ste-3c-sym">${sym}</span><input class="ste-input" type="number" min="0" step="100" value="${escape(a.influencer?.tagValue ?? '')}" data-3a-inf-tag></div>
            </label>
            <label class="ste-field ste-3a-purpose">
              <span class="ste-lbl">Expected media</span>
              <input class="ste-input" type="text" value="${escape(a.influencer?.expectedMedia ?? '')}" data-3a-inf-media placeholder="Instagram, Blog, YouTube…">
            </label>
          </div>` : ''}

        <div class="ste-form-subhd" style="margin-top:14px">Budget</div>
        <table class="ste-3b-table ste-3a-budget-table">
          <colgroup>
            <col style="width:55%"><col style="width:25%"><col style="width:20%">
          </colgroup>
          <thead>
            <tr><th class="ste-3b-th-tier">Budget line</th><th>Amount</th><th>% of total</th></tr>
          </thead>
          <tbody>
            ${STE_BUDGET_LINES.map(line => `
              <tr class="ste-3b-row">
                <td class="ste-3b-tier-cell"><strong>${escape(line)}</strong></td>
                <td><div class="ste-3c-amount-wrap"><span class="ste-3c-sym">${sym}</span><input class="ste-input" type="number" min="0" step="100" value="${escape(a.budget?.[line] ?? '')}" data-3a-bud="${escape(line)}"></div></td>
                <td><span class="ste-3a-bud-pct" data-3a-bud-pct="${escape(line)}">—</span></td>
              </tr>`).join("")}
          </tbody>
          <tfoot>
            <tr><td><strong>Total budget</strong></td><td><strong data-3a-bud-total>${sym}0</strong></td><td>100%</td></tr>
          </tfoot>
        </table>
      </div>`;
  }
  function render3B(p) {
    const u = STE.currentUser();
    const isHQ = u && STE.isHQ(u);
    // HQ never sees the Draft entry form — drafts belong to the licensee.
    if (isHQ && (!p || p.status === "Draft")) return renderHQAwaiting();
    // Licensee with no record yet OR explicit Draft → entry form. Summary
    // path below assumes `p` exists and has accounts; without this guard a
    // licensee landing on a season they've never touched would crash here.
    if (!p || p.status === "Draft") return render3BDraft(p);
    const lic = STE.currentLicensee();
    const cur = lic?.currency || "GBP";
    const sym = cur === "EUR" ? "€" : cur === "USD" ? "$" : "£";
    const accounts = Array.isArray(p.accounts) ? p.accounts : [];
    const totalReporting = p.totalReportingSales ?? p.totalAccountRevenueGbp ?? accounts.reduce((s, a) => s + (parseFloat(a.amountReporting) || 0), 0);
    const totalRetail    = accounts.reduce((s, a) => s + (parseFloat(a.amountRetail) || 0), 0);
    const totalDoors     = p.totalDoors    ?? accounts.reduce((s, a) => s + (parseInt(a.doors) || 0), 0);
    const totalAccounts  = p.totalAccounts ?? accounts.length;
    return `
      <div class="ste-3b">
        <div class="ste-3c-kpis">
          <div class="ste-3c-kpi">
            <div class="ste-mini">TOTAL REPORTING SALES</div>
            <div class="ste-big">${sym}${totalReporting.toLocaleString()}</div>
          </div>
          <div class="ste-3c-kpi">
            <div class="ste-mini">TOTAL DOORS</div>
            <div class="ste-big">${totalDoors.toLocaleString()}</div>
          </div>
          <div class="ste-3c-kpi">
            <div class="ste-mini">TOTAL ACCOUNTS</div>
            <div class="ste-big">${totalAccounts.toLocaleString()}</div>
          </div>
        </div>

        <table class="ste-3b-table ste-3b-acct-table" style="margin-top:14px">
          <colgroup>
            <col style="width:8%"><col style="width:11%"><col style="width:13%"><col style="width:20%">
            <col style="width:7%"><col style="width:10%"><col style="width:14%"><col style="width:14%">
          </colgroup>
          <thead>
            <tr>
              <th>Country</th><th>Channel</th><th>Tier</th><th>Account name</th>
              <th>Doors</th><th>Status</th><th>Sales (Reporting)</th><th>Sales (Retail)</th>
            </tr>
          </thead>
          <tbody>${accounts.map(a => `<tr>
            <td>${escape(a.country || '—')}</td>
            <td>${escape(a.channel || '—')}</td>
            <td>${escape(a.tier || '—')}</td>
            <td><strong>${escape(a.accountName || '—')}</strong></td>
            <td>${a.doors ?? '—'}</td>
            <td>${escape(a.status || '—')}</td>
            <td>${sym}${(parseFloat(a.amountReporting)||0).toLocaleString()}</td>
            <td>${sym}${(parseFloat(a.amountRetail)||0).toLocaleString()}</td>
          </tr>`).join("") || '<tr><td colspan="8"><span class="ste-mini">No accounts yet.</span></td></tr>'}</tbody>
          <tfoot>
            <tr>
              <td colspan="4"><strong>Totals</strong></td>
              <td><strong>${totalDoors.toLocaleString()}</strong></td>
              <td><strong>${totalAccounts}</strong> accounts</td>
              <td><strong>${sym}${totalReporting.toLocaleString()}</strong></td>
              <td><strong>${sym}${totalRetail.toLocaleString()}</strong></td>
            </tr>
          </tfoot>
        </table>
        ${renderPlanActions("3-B", p)}
      </div>`;
  }
  function render3BDraft(p) {
    const lic = STE.currentLicensee();
    const cur = lic?.currency || "GBP";
    const sym = cur === "EUR" ? "€" : cur === "USD" ? "$" : "£";
    const draftKey = `_3b_draft_${lic?.id}`;
    const stored = STE.get().seasonPlanDrafts?.[draftKey] || {};
    // Per-account rows matching the Q1 2026 Distribution Plan template:
    // Country | Channel | Tier | Account Name | Doors | Status | Sales
    // (Reporting Price) | Sales (Retail Price).
    function emptyRow() {
      return { country: "", channel: "", tier: "", accountName: "", doors: "", status: "", amountReporting: "", amountRetail: "" };
    }
    const accounts = (stored.accounts && stored.accounts.length)
      ? stored.accounts
      : [emptyRow(), emptyRow()];

    return `
      <div class="ste-3b-entry" data-3b-form>
        <div class="ste-3c-kpis">
          <div class="ste-3c-kpi">
            <div class="ste-mini">TOTAL REPORTING SALES</div>
            <div class="ste-big" data-3b-total>${sym}0</div>
          </div>
          <div class="ste-3c-kpi">
            <div class="ste-mini">TOTAL DOORS</div>
            <div class="ste-big" data-3b-doors>0</div>
          </div>
          <div class="ste-3c-kpi">
            <div class="ste-mini">TOTAL ACCOUNTS</div>
            <div class="ste-big" data-3b-accounts>0</div>
          </div>
        </div>

        <div class="ste-plan-toolbar">
          <div class="ste-form-subhd" style="margin:0">Accounts</div>
          <input type="file" data-3b-upload accept=".xlsx,.csv" hidden>
          <button type="button" class="ste-btn ste-btn-ghost ste-btn-mini" data-3b-template>Download template</button>
          <button type="button" class="ste-btn ste-btn-ghost ste-btn-mini" data-3b-upload-btn>Upload template (.xlsx, .csv)</button>
        </div>

        <table class="ste-3b-table ste-3b-acct-table">
          <colgroup>
            <col style="width:8%">
            <col style="width:11%">
            <col style="width:13%">
            <col style="width:20%">
            <col style="width:7%">
            <col style="width:10%">
            <col style="width:14%">
            <col style="width:14%">
            <col style="width:36px">
          </colgroup>
          <thead>
            <tr>
              <th>Country</th>
              <th>Channel</th>
              <th>Tier</th>
              <th class="ste-3b-th-tier">Account name</th>
              <th>Doors</th>
              <th>Status</th>
              <th>Sales (Reporting)</th>
              <th>Sales (Retail)</th>
              <th></th>
            </tr>
          </thead>
          <tbody data-3b-rows>
            ${accounts.map((a, i) => `
              <tr class="ste-3b-row" data-3b-row="${i}">
                <td><select class="ste-input ste-cell-select" data-3b-country>
                  <option value="" ${!a.country?'selected':''} disabled>—</option>
                  ${STE_COUNTRIES.map(c => `<option value="${escape(c)}" ${c===a.country?'selected':''}>${escape(c)}</option>`).join("")}
                </select></td>
                <td><select class="ste-input ste-cell-select" data-3b-channel>
                  <option value="" ${!a.channel?'selected':''} disabled>—</option>
                  ${STE_DIST_CHANNELS.map(c => `<option value="${escape(c)}" ${c===a.channel?'selected':''}>${escape(c)}</option>`).join("")}
                </select></td>
                <td><select class="ste-input ste-cell-select" data-3b-tier>
                  <option value="" ${!a.tier?'selected':''} disabled>—</option>
                  ${STE_DIST_TIERS.map(c => `<option value="${escape(c)}" ${c===a.tier?'selected':''}>${escape(c)}</option>`).join("")}
                </select></td>
                <td><input class="ste-input ste-3b-tier" type="text" value="${escape(a.accountName)}" data-3b-name placeholder="e.g. LCM01 — Little Camden Market"></td>
                <td><input class="ste-input ste-3b-cnt" type="number" min="0" step="1" value="${escape(a.doors)}" data-3b-doors></td>
                <td><select class="ste-input ste-cell-select" data-3b-status>
                  <option value="" ${!a.status?'selected':''} disabled>—</option>
                  ${STE_DIST_STATUS.map(c => `<option value="${escape(c)}" ${c===a.status?'selected':''}>${escape(c)}</option>`).join("")}
                </select></td>
                <td><div class="ste-3c-amount-wrap"><span class="ste-3c-sym">${sym}</span><input class="ste-input" type="number" min="0" step="1000" value="${escape(a.amountReporting)}" data-3b-amt-rep></div></td>
                <td><div class="ste-3c-amount-wrap"><span class="ste-3c-sym">${sym}</span><input class="ste-input" type="number" min="0" step="1000" value="${escape(a.amountRetail)}" data-3b-amt-ret></div></td>
                <td><button type="button" class="ste-3c-row-rm" data-3b-row-rm aria-label="Remove">×</button></td>
              </tr>`).join("")}
          </tbody>
        </table>
        <div class="ste-plan-form-actions">
          <button type="button" class="ste-btn ste-btn-ghost ste-btn-mini ste-3c-add-cat-btn" data-3b-add>+ Add account</button>
          <button class="ste-btn ste-btn-primary" data-3b-submit>Submit</button>
        </div>
      </div>`;
  }

  // Sub-route helper: #/<page> → list (HQ) / detail (licensee)
  //                   #/<page>/<licenseeId> → detail for that licensee
  function pageSubRoute(page) {
    // Match #/<page>/<id> OR #/<page>/details/<id> OR #/<page>/details/(view|edit)/<id>
    // OR #/<page>/<action> (e.g. /new). Returns the id/action, skipping the
    // literal "details" wrapper + optional "view"/"edit" mode segment.
    const re = new RegExp(`^#\\/${page}(?:\\/details(?:\\/(?:view|edit))?)?(?:\\/([A-Z0-9_-]+))?`, "i");
    const m = (location.hash || "").match(re);
    return m && m[1] ? m[1] : null;
  }
  function contractsSubRoute() { return pageSubRoute("agreements"); }

  // Inline licensee filter for HQ users on a data page. Renders a select
  // bound to STE viewLicenseeId; changing it re-runs the current screen.
  // For non-HQ users (or pages with no current licensee), renders nothing.
  function licenseeFilter(reRender) {
    const u = STE.currentUser();
    if (!u || !STE.isHQ(u)) return "";
    const cur = STE.currentLicensee();
    const lics = STE.get().licensees || [];
    return `
      <label class="ste-filter">
        <span class="ste-filter-lbl">Licensee</span>
        <select class="ste-input" data-licensee-filter>
          ${lics.map(l => `<option value="${escape(l.id)}" ${cur && cur.id===l.id?'selected':''}>${escape(l.legalName)}</option>`).join("")}
        </select>
      </label>`;
  }
  function wireLicenseeFilter(root, reRender) {
    const sel = $("[data-licensee-filter]", root);
    if (!sel) return;
    sel.addEventListener("change", () => {
      STE.setSession({ ...STE.getSession(), viewLicenseeId: sel.value });
      reRender();
    });
  }

  // Render a generic per-licensee picker (HQ-only list view). Each row is
  // clickable and routes to "#/<targetPage>/<licenseeId>", which the page
  // function reads via pageSubRoute() to know which licensee's detail to show.
  function renderLicenseePicker({ title, description, targetPage, columns, rowFn }) {
    const lics = STE.get().licensees || [];
    const colsHd = columns.map(c => `<th>${escape(c)}</th>`).join("");
    function rowsHtml(filtered) {
      if (!filtered.length) return `<tr><td colspan="${columns.length + 2}" class="ste-empty-cell">No licensees match your search</td></tr>`;
      return filtered.map(l => {
        const cells = rowFn(l).map(c => `<td>${c}</td>`).join("");
        return `
          <tr data-lic="${escape(l.id)}">
            <td>
              <div style="display:flex;gap:10px;align-items:center">
                <span class="ste-mini-avatar">${escape((l.legalName||'').split(/\s+/).map(s=>s[0]).filter(Boolean).slice(0,2).join('').toUpperCase())}</span>
                <strong>${escape(l.legalName)}</strong>
              </div>
            </td>
            ${cells}
            <td><button class="ste-btn ste-btn-link">Open</button></td>
          </tr>`;
      }).join("");
    }
    return {
      html: `
        <div class="ste-screen-pad">
          <div class="ste-section-hd">
            <div class="ste-page-crumbs"><span class="cur">${escape(title)}</span></div>
            <h1>${escape(title)}</h1>
            <p>${escape(description)}</p>
          </div>
          <div class="ste-form-card">
            <div class="ste-users-toolbar">
              <div class="ste-users-search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/></svg>
                <input id="ste-lp-search" type="search" placeholder="Search by licensee, region…">
              </div>
              <div class="ste-users-toolbar-right">
                <span class="ste-mini" id="ste-lp-count">${lics.length} licensees</span>
              </div>
            </div>
            <table class="ste-table">
              <thead><tr><th>Licensee</th>${colsHd}<th></th></tr></thead>
              <tbody id="ste-lp-tbody">${rowsHtml(lics)}</tbody>
            </table>
          </div>
        </div>`,
      wire: (root) => {
        const search = $("#ste-lp-search", root);
        const tbody = $("#ste-lp-tbody", root);
        const count = $("#ste-lp-count", root);
        function wireRows() {
          $$("tr[data-lic]", tbody).forEach(tr => {
            tr.style.cursor = "pointer";
            tr.addEventListener("click", (e) => {
              if (e.target.closest("button, a")) {/* fall through */}
              const id = tr.getAttribute("data-lic");
              STE.setSession({ ...STE.getSession(), viewLicenseeId: id });
              location.hash = `#/${targetPage}/${id}`;
            });
          });
        }
        wireRows();
        if (search) search.addEventListener("input", () => {
          const q = (search.value || "").trim().toLowerCase();
          const filtered = !q ? lics : lics.filter(l => [l.id, l.legalName, l.country, l.address && l.address.city]
            .filter(Boolean).join(" ").toLowerCase().includes(q));
          tbody.innerHTML = rowsHtml(filtered);
          count.textContent = `${filtered.length} of ${lics.length} licensee${lics.length===1?'':'s'}`;
          wireRows();
        });
      },
    };
  }

  // ============================ AGREEMENTS LIST (HQ) ============================
  // Document-centric: one row per agreement document (Master License,
  // Amendment, Extension Request, Draft) — not one per licensee.
  function contractsList() {
    const root = PAGE_MAIN("agreements");
    if (!root) return;
    const cu = STE.currentUser();
    const isHQ = cu && STE.isHQ(cu);
    const allLics = STE.get().licensees || [];
    const allContracts = STE.get().contracts || [];
    // Licensees see the same list UI, scoped to their own org's agreements.
    // Draft agreements still being prepared by HQ stay invisible to the
    // licensee — they only appear once HQ "sends" them (status flips out
    // of Draft into Negotiating / Active / etc.).
    const lics = isHQ ? allLics : allLics.filter(l => l.id === (cu && cu.licenseeId));
    const contracts = isHQ
      ? allContracts
      : allContracts.filter(c => c.licenseeId === (cu && cu.licenseeId) && c.status !== "Draft");
    const today = new Date();
    const findLic = (id) => lics.find(x => x.id === id);
    const renewalDays = (end) => Math.ceil((new Date(end) - today) / 86400000);

    // Group masters by licensee so we can detect successors (newer master
    // takes over from older one → suppress the "expiring soon" warning).
    const mastersByLic = {};
    contracts.forEach(c => {
      (mastersByLic[c.licenseeId] = mastersByLic[c.licenseeId] || []).push(c);
    });
    Object.keys(mastersByLic).forEach(id => {
      mastersByLic[id].sort((a, b) => new Date(a.termStart) - new Date(b.termStart));
    });

    // Separate masters vs sub-contracts (amendments / extensions / LoI)
    // saved as their own contract records (newer draft-form output). Anything
    // tagged Amendment / Extension Request that references a parent via
    // succeedsContractId gets nested under that parent.
    const isMaster = (c) => !c.type || c.type === "Master License";
    const masters = contracts.filter(isMaster);
    const childContracts = contracts.filter(c => !isMaster(c));

    const rows = [];
    masters.forEach(c => {
      const l = findLic(c.licenseeId);
      const days = renewalDays(c.termEnd);
      const termYears = Math.round((new Date(c.termEnd) - new Date(c.termStart)) / (365.25 * 86400000));
      const chain = mastersByLic[c.licenseeId] || [];
      const idx = chain.indexOf(c);
      const predecessor = idx > 0 ? chain[idx - 1] : null;
      const successor = idx < chain.length - 1 ? chain[idx + 1] : null;
      // Status derivation: dates win over the stored status flag — once the
      // term end has passed we always show "Expired", regardless of an
      // older "Renewed" / "Active" label persisted in seed data. A
      // successor still in-force keeps the chain readable, but only when
      // the predecessor's term hasn't lapsed yet.
      let status;
      if (days < 0) {
        status = "Expired";
      } else if (successor) {
        status = "Renewed";
      } else if (c.status) {
        status = c.status;
      } else {
        status = "Active";
      }
      // Renewal warning fires only for in-effect agreements approaching termEnd.
      const warning = (status === "Active" && !successor && days < 180)
        ? (days < 0 ? "expired" : (days < 90 ? "critical" : "soon"))
        : null;

      const relations = [];
      if (predecessor) relations.push({ kind: "renews", target: predecessor.id });
      if (successor) relations.push({ kind: "renewed-by", target: successor.id });

      // Amendments and extension requests are surfaced as attachments on the
      // master agreement's detail page — not as separate rows here. Keep the
      // list focused on Master Licences only.
      rows.push({
        id: c.id, type: "Master License", licensee: l, contract: c,
        description: `${termYears}-year exclusive Sergio Tacchini license · ${l.country||''} · ${c.royaltyPct}% royalty · ${c.renewalOption} renewal option`,
        effectiveStart: c.termStart, effectiveEnd: c.termEnd,
        royaltyPct: c.royaltyPct, renewalDays: days,
        status, warning, relations, children: [],
        lastUpdatedAt: (c.amendments && c.amendments.length ? c.amendments[c.amendments.length-1].date : c.signedAt),
      });
    });
    lics.forEach(l => {
      if (!contracts.find(c => c.licenseeId === l.id)) {
        rows.push({
          id: `DRAFT-${String((STE.get().licensees||[]).indexOf(l) + 1).padStart(2, '0')}`, type: "Master License", licensee: l, contract: null,
          description: `No master license on file for ${l.legalName} — draft pending counterparty signature`,
          effectiveStart: null, effectiveEnd: null, royaltyPct: null, renewalDays: null,
          status: "Draft", warning: null, relations: [], children: [], lastUpdatedAt: null,
        });
      }
    });
    // Sort: by licensee → chronological by effectiveStart (so renewal chains read top-to-bottom)
    rows.sort((a, b) => {
      const lc = (a.licensee?.id || "").localeCompare(b.licensee?.id || "");
      if (lc !== 0) return lc;
      return (a.effectiveStart || "").localeCompare(b.effectiveStart || "");
    });

    const licOptions = lics.map(l => ({ value: l.id, label: l.legalName }));
    const types = [...new Set(rows.map(r => r.type))].map(v => ({ value: v, label: v }));
    const statuses = [...new Set(rows.map(r => r.status))].map(v => ({ value: v, label: v }));

    // Filter state — selected licensees + types + statuses are arrays;
    // royalty is { op: '<'|'='|'>', value: number }; renewal is an ISO date string.
    // Default: hide expired agreements (users can re-enable in the Status filter).
    // Default: every Licensee + Type pre-selected ("All" checked). Statuses
    // hides only Renewed (past, already-replaced documents that don't need
    // ongoing attention).
    const defaultLicensees = licOptions.map(o => o.value);
    const defaultTypes = types.map(o => o.value);
    const defaultStatuses = statuses.map(o => o.value).filter(s => s !== "Renewed");
    // Togglable table columns. ID is omitted from default-visible columns
    // (the hash is opaque to humans; the row itself opens the detail page).
    const COLUMN_DEFS = [
      { value: "status",      label: "Status" },
      { value: "licensee",    label: "Licensee" },
      { value: "territories", label: "Territories" },
      { value: "exclusivity", label: "Exclusivity" },
      { value: "royalty",     label: "Royalty" },
      { value: "start",       label: "Start" },
      { value: "end",         label: "End" },
      { value: "renewal",     label: "Renewal option" },
      { value: "updated",     label: "Last Updated" },
      { value: "id",          label: "ID (hash)" },
    ];
    // Build option lists from the data — territories + renewal options come
    // from the actual contracts on file (deduped + sorted).
    const allTerritories = [...new Set(contracts.flatMap(c => c.territories || []))].sort();
    const territoryOptions = allTerritories.map(t => ({ value: t, label: t }));
    const allRenewalOpts = [...new Set(contracts.map(c => c.renewalOption).filter(Boolean))].sort();
    const renewalOptionOptions = allRenewalOpts.map(r => ({ value: r, label: r }));

    const filters = {
      q: "", licensees: defaultLicensees, types: defaultTypes, statuses: defaultStatuses,
      territories: allTerritories.slice(),
      renewalOptions: allRenewalOpts.slice(),
      royaltyOp: "", royaltyVal: "", royaltyMin: "", royaltyMax: "",
      // ID column is hidden by default — opaque hash, low value
      columns: COLUMN_DEFS.map(c => c.value).filter(v => v !== "id"),
      sortBy: null, sortDir: "asc",
    };
    function getSortValue(r, key) {
      if (key === "id") return r.id;
      if (key === "status") return r.status;
      if (key === "licensee") return r.licensee?.legalName || "";
      if (key === "type") return r.type;
      if (key === "start") return r.effectiveStart || "";
      if (key === "end") return r.effectiveEnd || "";
      if (key === "updated") return r.lastUpdatedAt || "";
      return "";
    }

    document.title = "Agreements · Sergio Tacchini";

    // Action banner — surfaces agreements that need this audience's attention
    // (parallel to the sidebar badge logic in app.js paintNavBadges).
    const _myContracts = isHQ ? contracts : contracts.filter(c => c.licenseeId === (cu && cu.licenseeId));
    const _threads = STE.get().negotiationThreads || [];
    const _openLicenseeIds = new Set(_threads.filter(t => {
      const m = (t.messages || []); const last = m[m.length - 1];
      return last && last.side === "licensee";
    }).map(t => t.contractId));
    const _openFnfIds = new Set(_threads.filter(t => {
      const m = (t.messages || []); const last = m[m.length - 1];
      return last && last.side === "fnf";
    }).map(t => t.contractId));
    const _actionAgreements = isHQ
      ? _myContracts.filter(c => c.status === "Terms Updated" || c.status === "Review" || c.status === "Attention")
      : _myContracts.filter(c => c.status === "Terms Sent");
    const _actionAgreementHeadline = isHQ
      ? `${_actionAgreements.length} agreement${_actionAgreements.length===1?'':'s'} awaiting your input`
      : `${_actionAgreements.length} agreement${_actionAgreements.length===1?'':'s'} need your input`;
    const _actionAgreementSub = (() => {
      const ids = _actionAgreements.slice(0, 4).map(c => c.id).join(", ");
      const more = _actionAgreements.length > 4 ? ` · +${_actionAgreements.length - 4} more` : '';
      return `${ids}${more} · click to filter the table`;
    })();

    root.innerHTML = `
      <div class="ste-screen-pad">
        <div class="ste-section-hd">
          <div class="ste-page-crumbs"><a href="#/home">Home</a><span class="sep">/</span><span class="cur">Agreements</span></div>
          <div class="ste-page-hd-row">
            <div>
              <h1>Agreements</h1>
            </div>
            <div class="ste-hd-cta">
              ${isHQ ? `<button class="ste-btn ste-btn-primary" id="ste-new-agreement" type="button">+ Create New Agreement</button>` : ''}
            </div>
          </div>
        </div>

        ${_actionAgreements.length ? `
          <button class="ste-overdue-banner ste-overdue-banner-warn" data-act="open-agreements-action" type="button">
            <span class="ste-overdue-icon"></span>
            <span class="ste-overdue-text">
              <strong>${escape(_actionAgreementHeadline)}</strong>
              <span class="ste-mini">${escape(_actionAgreementSub)}</span>
            </span>
            <span class="ste-overdue-chev">→</span>
          </button>` : ''}

        <div class="ste-form-card">
          <div class="ste-filter-bar">
            <div class="ste-users-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/></svg>
              <input id="ste-contracts-search" type="search" placeholder="Search…">
            </div>
            <span class="ste-filter-divider" aria-hidden="true"></span>
            <div class="ste-fdrop" data-filter="status">
              <button class="ste-fdrop-btn" type="button">
                <span class="ste-fdrop-lbl">Statuses</span>
                <span class="ste-fdrop-val"></span>
                <span class="ste-fdrop-chev"></span>
              </button>
              <div class="ste-fdrop-panel" hidden></div>
            </div>
            <div class="ste-fdrop" data-filter="licensee">
              <button class="ste-fdrop-btn" type="button">
                <span class="ste-fdrop-lbl">Licensees</span>
                <span class="ste-fdrop-val"></span>
                <span class="ste-fdrop-chev"></span>
              </button>
              <div class="ste-fdrop-panel" hidden></div>
            </div>
            <div class="ste-fdrop" data-filter="territory">
              <button class="ste-fdrop-btn" type="button">
                <span class="ste-fdrop-lbl">Territories</span>
                <span class="ste-fdrop-val"></span>
                <span class="ste-fdrop-chev"></span>
              </button>
              <div class="ste-fdrop-panel" hidden></div>
            </div>
            <div class="ste-fdrop" data-filter="royalty">
              <button class="ste-fdrop-btn" type="button">
                <span class="ste-fdrop-lbl">Royalty</span>
                <span class="ste-fdrop-val"></span>
                <span class="ste-fdrop-chev"></span>
              </button>
              <div class="ste-fdrop-panel" hidden></div>
            </div>
            <div class="ste-fdrop" data-filter="renewalOption">
              <button class="ste-fdrop-btn" type="button">
                <span class="ste-fdrop-lbl">Renewal option</span>
                <span class="ste-fdrop-val"></span>
                <span class="ste-fdrop-chev"></span>
              </button>
              <div class="ste-fdrop-panel" hidden></div>
            </div>
            <button class="ste-btn ste-btn-ghost ste-btn-mini" id="ste-f-clear" type="button">Clear</button>
            <span class="ste-mini ste-insp-filter-count" id="ste-contracts-count"><strong>${rows.length}</strong> of ${rows.length}</span>
            <div class="ste-fdrop ste-fdrop-cols" data-filter="columns">
              <button class="ste-fdrop-btn" type="button" title="Show / hide columns" aria-label="Show / hide columns">
                <span class="ste-fdrop-cols-icon"></span>
              </button>
              <div class="ste-fdrop-panel" hidden></div>
            </div>
          </div>
          <div class="ste-table-scroll">
          <table class="ste-table ste-table-agreements" id="ste-agreements-table">
            <thead>
              <tr>
                <th class="ste-col-flag" data-col="flag"></th>
                <th data-col="id" data-sort="id" class="ste-th-sort">ID</th>
                <th data-col="status" data-sort="status" class="ste-th-sort">Status</th>
                <th data-col="licensee" data-sort="licensee" class="ste-th-sort">Licensee</th>
                <th data-col="territories">Territories</th>
                <th data-col="exclusivity">Exclusivity</th>
                <th data-col="royalty" data-sort="royaltyPct" class="ste-th-sort">Royalty</th>
                <th data-col="start" data-sort="start" class="ste-th-sort">Start</th>
                <th data-col="end" data-sort="end" class="ste-th-sort">End</th>
                <th data-col="renewal">Renewal option</th>
                <th data-col="updated" data-sort="updated" class="ste-th-sort">Last Updated</th>
                <th data-col="actions"></th>
              </tr>
            </thead>
            <tbody id="ste-contracts-tbody">${renderContractRows(rows)}</tbody>
          </table>
          </div>
        </div>
      </div>`;

    const search = $("#ste-contracts-search", root);
    const tbody = $("#ste-contracts-tbody", root);
    const count = $("#ste-contracts-count", root);
    const fClear = $("#ste-f-clear", root);

    function paintDropdownLabels() {
      const setLabel = (filterName, valHtml, isActive) => {
        const drop = $(`.ste-fdrop[data-filter="${filterName}"]`, root);
        if (!drop) return;
        drop.classList.toggle("ste-filter-active", !!isActive);
        $(".ste-fdrop-val", drop).innerHTML = valHtml;
      };
      // For multi-select filters: "all selected" = effectively no filter
      // (visually empty + not flagged active). Partial selections show count.
      function multiLabel(sel, all) {
        if (sel.length === 0 || sel.length === all.length) return { val: "", active: false };
        if (sel.length === 1) return { val: escape(sel[0]), active: true };
        return { val: `${sel.length} selected`, active: true };
      }
      const lcLbl = multiLabel(filters.licensees, defaultLicensees);
      setLabel("licensee", lcLbl.val, lcLbl.active);
      const tyLbl = multiLabel(filters.types, types.map(o => o.value));
      setLabel("type", tyLbl.val, tyLbl.active);
      const stLbl = multiLabel(filters.statuses, statuses.map(o => o.value));
      setLabel("status", stLbl.val, stLbl.active);
      const teLbl = multiLabel(filters.territories, allTerritories);
      setLabel("territory", teLbl.val, teLbl.active);
      const roLbl = multiLabel(filters.renewalOptions, allRenewalOpts);
      setLabel("renewalOption", roLbl.val, roLbl.active);
      const royaltyLabel = (() => {
        if (filters.royaltyOp === "between") {
          if (filters.royaltyMin !== "" || filters.royaltyMax !== "") {
            const lo = filters.royaltyMin !== "" ? `${filters.royaltyMin}%` : '…';
            const hi = filters.royaltyMax !== "" ? `${filters.royaltyMax}%` : '…';
            return `${lo}–${hi}`;
          }
          return "";
        }
        if (filters.royaltyOp && filters.royaltyVal !== "") {
          return `${filters.royaltyOp} ${filters.royaltyVal}%`;
        }
        return "";
      })();
      setLabel("royalty", escape(royaltyLabel), !!royaltyLabel);
    }

    function applyFilters() {
      const q = (search.value || "").trim().toLowerCase();
      paintDropdownLabels();
      const filtered = rows.filter(r => {
        if (q) {
          const hay = [r.id, r.type, r.title, r.licensee?.id, r.licensee?.legalName, r.contract?.counterpartyName].filter(Boolean).join(" ").toLowerCase();
          if (!hay.includes(q)) return false;
        }
        if (filters.licensees.length && !filters.licensees.includes(r.licensee?.id)) return false;
        if (filters.types.length && !filters.types.includes(r.type)) return false;
        if (filters.statuses.length && !filters.statuses.includes(r.status)) return false;
        // Territories — row matches if ANY of its territories are selected.
        if (filters.territories.length && filters.territories.length < allTerritories.length) {
          const rowTerrs = (r.contract && r.contract.territories) || [];
          if (!rowTerrs.some(t => filters.territories.includes(t))) return false;
        }
        if (filters.renewalOptions.length && filters.renewalOptions.length < allRenewalOpts.length) {
          if (!filters.renewalOptions.includes(r.contract?.renewalOption)) return false;
        }
        if (filters.royaltyOp === "between") {
          const lo = filters.royaltyMin !== "" ? parseFloat(filters.royaltyMin) : null;
          const hi = filters.royaltyMax !== "" ? parseFloat(filters.royaltyMax) : null;
          if (lo != null || hi != null) {
            if (r.royaltyPct == null) return false;
            if (lo != null && r.royaltyPct < lo) return false;
            if (hi != null && r.royaltyPct > hi) return false;
          }
        } else if (filters.royaltyOp && filters.royaltyVal !== "") {
          if (r.royaltyPct == null) return false;
          const v = parseFloat(filters.royaltyVal);
          if (filters.royaltyOp === "<" && !(r.royaltyPct < v)) return false;
          if (filters.royaltyOp === "=" && !(r.royaltyPct === v)) return false;
          if (filters.royaltyOp === ">" && !(r.royaltyPct > v)) return false;
        }
        return true;
      });
      if (filters.sortBy) {
        const dir = filters.sortDir === "desc" ? -1 : 1;
        filtered.sort((a, b) => {
          const av = String(getSortValue(a, filters.sortBy));
          const bv = String(getSortValue(b, filters.sortBy));
          return av.localeCompare(bv, undefined, { numeric: true, sensitivity: "base" }) * dir;
        });
      }
      tbody.innerHTML = renderContractRows(filtered);
      count.innerHTML = `<strong>${filtered.length}</strong> of ${rows.length}`;
      paintSortIndicator();
      wireRows();
    }
    function paintSortIndicator() {
      $$("th[data-sort]", root).forEach(th => {
        const k = th.getAttribute("data-sort");
        th.classList.toggle("ste-th-sorted", filters.sortBy === k);
        th.classList.toggle("ste-th-sort-desc", filters.sortBy === k && filters.sortDir === "desc");
      });
    }

    function wireRows() {
      $$("tr[data-lic][data-row-id]", tbody).forEach(tr => {
        tr.style.cursor = "pointer";
        tr.addEventListener("click", (e) => {
          if (e.target.closest("button, a")) return;
          const licId = tr.getAttribute("data-lic");
          const rowId = tr.getAttribute("data-row-id");
          // Stash the specific contract id so the detail page opens the row
          // the user actually clicked (a licensee can have multiple contracts
          // — master + drafts + amendments).
          STE.setSession({ ...STE.getSession(), viewLicenseeId: licId, viewContractId: rowId });
          location.hash = "#/agreements/details/view/" + rowId;
        });
      });
      // Wire row-level expand/collapse (master shows nested amendments/extensions)
      $$("[data-expand]", tbody).forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const id = btn.getAttribute("data-expand");
          if (_expandedAgreementIds.has(id)) _expandedAgreementIds.delete(id);
          else _expandedAgreementIds.add(id);
          applyFilters();  // re-render rows
        });
      });
      // Wire row context menu
      $$("[data-menu]", tbody).forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          openRowMenu(btn);
        });
      });
    }

    function panelForFilter(name) {
      if (name === "licensee") return multiCheckboxPanel(licOptions, filters.licensees, (sel) => { filters.licensees = sel; applyFilters(); }, "All Organizations");
      if (name === "type") return multiCheckboxPanel(types, filters.types, (sel) => { filters.types = sel; applyFilters(); }, "All Types");
      if (name === "status") return multiCheckboxPanel(statuses, filters.statuses, (sel) => { filters.statuses = sel; applyFilters(); }, "All Statuses");
      if (name === "territory") return multiCheckboxPanel(territoryOptions, filters.territories, (sel) => { filters.territories = sel; applyFilters(); }, "All Territories");
      if (name === "renewalOption") return multiCheckboxPanel(renewalOptionOptions, filters.renewalOptions, (sel) => { filters.renewalOptions = sel; applyFilters(); }, "All Renewals");
      if (name === "royalty") return royaltyConditionalPanel(filters, applyFilters);
      if (name === "columns") return multiCheckboxPanel(
        COLUMN_DEFS,
        filters.columns,
        (sel) => { filters.columns = sel; applyColumnVisibility(); },
        "All Columns"
      );
      return null;
    }
    function applyColumnVisibility() {
      const table = $("#ste-agreements-table", root);
      if (!table) return;
      COLUMN_DEFS.forEach(c => {
        const hidden = !filters.columns.includes(c.value);
        $$(`[data-col="${c.value}"]`, table).forEach(el => { el.style.display = hidden ? "none" : ""; });
      });
    }

    let _openRowMenu = null;
    function closeRowMenu() {
      if (_openRowMenu) { _openRowMenu.remove(); _openRowMenu = null; }
    }
    function openRowMenu(triggerBtn) {
      closeRowMenu();
      const rowId = triggerBtn.getAttribute("data-menu");
      const row = rows.find(r => r.id === rowId);
      if (!row) return;
      // Streamlined menu: only Master Licences exist now. Renew is the only
      // "create related" action; everything else flows through the master.
      const items = [];
      items.push({ act: "open",     label: "Open" });
      items.push({ act: "open-new", label: "Open in new tab" });
      if (isHQ && (row.status === "Active" || row.status === "Renewed")) {
        items.push({ divider: true });
        items.push({ act: "create-renewal", label: "Start Renewal Process" });
      }
      if (isHQ) {
        items.push({ divider: true });
        items.push({ act: "delete", label: "Delete", danger: true });
      }

      const menu = document.createElement("div");
      menu.className = "ste-row-menu ste-hdr-panel";
      menu.innerHTML = items.map(it => {
        if (it.divider) return `<div class="ste-fdrop-divider"></div>`;
        return `<button class="ste-row-menu-item ${it.danger?'ste-row-menu-danger':''}" data-act="${it.act}">${escape(it.label)}</button>`;
      }).join("");
      document.body.appendChild(menu);
      const r = triggerBtn.getBoundingClientRect();
      menu.style.position = "fixed";
      menu.style.zIndex = "9300";
      // Clamp the menu inside the viewport — when the trigger button is
      // close to (or past) the right edge from horizontal scroll, pin the
      // menu so it never escapes the visible area.
      const menuW = Math.min(menu.offsetWidth, window.innerWidth - 16);
      const menuH = menu.offsetHeight;
      const desiredTop   = r.bottom + 4;
      const top   = Math.max(8, Math.min(desiredTop, window.innerHeight - menuH - 8));
      const desiredRight = window.innerWidth - r.right;
      const right = Math.max(8, Math.min(desiredRight, window.innerWidth - menuW - 8));
      menu.style.top = top + "px";
      menu.style.right = right + "px";
      menu.style.maxWidth = (window.innerWidth - 16) + "px";
      _openRowMenu = menu;
      const licId = row.licensee.id;
      const href = `#/agreements/details/view/${encodeURIComponent(row.id || licId)}`;
      $$("[data-act]", menu).forEach(item => {
        item.addEventListener("click", (e) => {
          e.stopPropagation();
          const act = item.getAttribute("data-act");
          if (act === "open") { location.hash = href; }
          else if (act === "open-new") { window.open(window.location.pathname + window.location.search + href, "_blank"); }
          else if (act === "create-amend") {
            _agreementDraftPrefill = buildPrefillFromRow(row, "Amendment");
            location.hash = "#/agreements/new";
          }
          else if (act === "create-extend") {
            _agreementDraftPrefill = buildPrefillFromRow(row, "Extension Request");
            location.hash = "#/agreements/new";
          }
          else if (act === "create-renewal") {
            _agreementDraftPrefill = buildPrefillFromRow(row, "Master License", { renewal: true });
            location.hash = "#/agreements/new";
          }
          else if (act === "start-master") {
            _agreementDraftPrefill = buildPrefillFromRow(row, "Master License");
            location.hash = "#/agreements/new";
          }
          else if (act === "approve-ext") {
            STE.mutate(s => {
              const c = s.contracts.find(x => x.id === row.contract?.id);
              if (c && c.extensionRequest) {
                c.extensionRequest.status = "approved";
                c.extensionRequest.approvedAt = new Date().toISOString();
                s.auditLog = s.auditLog || [];
                s.auditLog.unshift({
                  at: new Date().toISOString(),
                  event: `Extension request approved — ${c.extensionRequest.term || ''}`,
                  actor: (STE.currentUser() || {}).name || "HQ Reviewer",
                  contractId: c.id, attachment: `${c.id}_extension_approved.pdf`,
                });
              }
            });
            STEApp.toast(`Extension request approved · ${row.id}`, "success");
            contractsList();
          }
          else if (act === "reject-ext") {
            const note = prompt("Rejection reason (sent to licensee):", "");
            if (note == null) return;
            STE.mutate(s => {
              const c = s.contracts.find(x => x.id === row.contract?.id);
              if (c && c.extensionRequest) {
                c.extensionRequest.status = "rejected";
                c.extensionRequest.rejectedAt = new Date().toISOString();
                c.extensionRequest.rejectionNote = note;
                s.auditLog = s.auditLog || [];
                s.auditLog.unshift({
                  at: new Date().toISOString(),
                  event: `Extension request rejected — ${note || 'no reason given'}`,
                  actor: (STE.currentUser() || {}).name || "HQ Reviewer",
                  contractId: c.id, attachment: `${c.id}_extension_rejected.pdf`,
                });
              }
            });
            STEApp.toast(`Extension request rejected · ${row.id}`, "warn");
            contractsList();
          }
          else if (act === "delete") {
            openDeleteAgreementModal(row);
          }
          closeRowMenu();
        });
      });
      setTimeout(() => {
        const onAway = (ev) => { if (!menu.contains(ev.target)) { closeRowMenu(); document.removeEventListener("click", onAway, true); } };
        document.addEventListener("click", onAway, true);
      }, 0);
    }

    // Wire dropdown open/close + populate panels lazily on open
    let _openDrop = null;
    function closeDrop() {
      if (!_openDrop) return;
      const panel = $(".ste-fdrop-panel", _openDrop);
      if (panel) { panel.innerHTML = ""; panel.hidden = true; }
      _openDrop.classList.remove("ste-fdrop-open");
      _openDrop = null;
    }
    document.addEventListener("click", (e) => {
      if (!_openDrop) return;
      if (e.target.closest(".ste-fdrop") === _openDrop) return;
      closeDrop();
    }, true);

    $$(".ste-fdrop", root).forEach(drop => {
      const btn = $(".ste-fdrop-btn", drop);
      const panel = $(".ste-fdrop-panel", drop);
      const name = drop.getAttribute("data-filter");
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (_openDrop === drop) { closeDrop(); return; }
        closeDrop();
        const built = panelForFilter(name);
        panel.innerHTML = built.html;
        built.wire(panel);
        panel.hidden = false;
        drop.classList.add("ste-fdrop-open");
        _openDrop = drop;
      });
    });

    const newBtn = $("#ste-new-agreement", root);
    if (newBtn) newBtn.addEventListener("click", () => {
      location.hash = "#/agreements/new";
    });

    wireRows();
    $$("th[data-sort]", root).forEach(th => {
      th.addEventListener("click", () => {
        const k = th.getAttribute("data-sort");
        if (filters.sortBy === k) {
          if (filters.sortDir === "asc") filters.sortDir = "desc";
          else { filters.sortBy = null; filters.sortDir = "asc"; }
        } else {
          filters.sortBy = k; filters.sortDir = "asc";
        }
        applyFilters();
      });
    });
    search.addEventListener("input", applyFilters);
    if (fClear) fClear.addEventListener("click", () => {
      search.value = "";
      filters.licensees = defaultLicensees.slice();
      filters.types = defaultTypes.slice();
      filters.statuses = statuses.map(o => o.value);  // Clear = include everything, even Renewed
      filters.royaltyOp = ""; filters.royaltyVal = "";
      filters.royaltyMin = ""; filters.royaltyMax = "";
      filters.renewalDate = "";
      closeDrop();
      applyFilters();
    });
    // Action banner → pre-filter the Status dropdown to the buckets the
    // current audience owes a response on (HQ: Terms Updated/Review/Attention;
    // licensee: Terms Sent).
    root.querySelector('[data-act="open-agreements-action"]')?.addEventListener("click", () => {
      const wanted = isHQ
        ? ["Terms Updated", "Review", "Attention"]
        : ["Terms Sent"];
      const available = statuses.map(o => o.value);
      filters.statuses = wanted.filter(w => available.includes(w));
      if (!filters.statuses.length) filters.statuses = available.slice();
      applyFilters();
    });
    // Run filters once on initial render so the default Status filter
    // (which hides Renewed) actually takes effect.
    applyFilters();
  }

  function multiCheckboxPanel(options, selected, onChange, allLabel) {
    const sel = new Set(selected);
    function rowHtml(o, i) {
      return `
        <label class="ste-check-row" data-row-i="${i}">
          <input type="checkbox" data-i="${i}" ${sel.has(o.value) ? 'checked' : ''}>
          <span>${escape(o.label)}</span>
        </label>`;
    }
    const showSearch = options.length > 6;
    return {
      html: `
        ${showSearch ? `
          <div class="ste-fdrop-search">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/></svg>
            <input type="search" placeholder="Search…" data-fdrop-q>
          </div>
        ` : ''}
        <div class="ste-fdrop-list">
          <label class="ste-check-row ste-check-row-all">
            <input type="checkbox" data-all>
            <span><strong>${escape(allLabel || "All")}</strong></span>
          </label>
          <div class="ste-fdrop-divider"></div>
          <div data-rows>${options.map(rowHtml).join("")}</div>
          <div class="ste-fdrop-empty" data-empty hidden>No matches</div>
        </div>`,
      wire: (panel) => {
        const allBox = $("[data-all]", panel);
        const rowsWrap = $("[data-rows]", panel);
        const emptyEl = $("[data-empty]", panel);
        function rowCbs() { return $$("[data-i]", rowsWrap); }
        function syncAllBox() {
          const total = options.length;
          if (sel.size === 0) { allBox.checked = false; allBox.indeterminate = false; }
          else if (sel.size === total) { allBox.checked = true; allBox.indeterminate = false; }
          else { allBox.checked = false; allBox.indeterminate = true; }
        }
        function wireCbs() {
          rowCbs().forEach(cb => {
            if (cb._w) return; cb._w = true;
            cb.addEventListener("change", () => {
              const i = parseInt(cb.getAttribute("data-i"));
              if (cb.checked) sel.add(options[i].value);
              else sel.delete(options[i].value);
              syncAllBox();
              onChange([...sel]);
            });
          });
        }
        wireCbs();
        allBox.addEventListener("change", () => {
          if (allBox.checked) {
            options.forEach(o => sel.add(o.value));
            rowCbs().forEach(cb => cb.checked = true);
          } else {
            sel.clear();
            rowCbs().forEach(cb => cb.checked = false);
          }
          allBox.indeterminate = false;
          onChange([...sel]);
        });
        const qInput = $("[data-fdrop-q]", panel);
        if (qInput) {
          qInput.addEventListener("input", () => {
            const q = qInput.value.trim().toLowerCase();
            const visible = options.map((o, i) => ({ o, i })).filter(({ o }) => !q || o.label.toLowerCase().includes(q));
            rowsWrap.innerHTML = visible.map(({ o, i }) => rowHtml(o, i)).join("");
            wireCbs();
            emptyEl.hidden = visible.length > 0;
          });
        }
        syncAllBox();
      },
    };
  }

  function royaltyConditionalPanel(filters, onChange) {
    const op = filters.royaltyOp || "";
    return {
      html: `
        <div class="ste-fdrop-form">
          <label class="ste-fdrop-lbl-sm">Operator</label>
          <div class="ste-seg" data-seg="op">
            <button type="button" data-v="<" ${op === "<" ? 'class="active"' : ''}>&lt;</button>
            <button type="button" data-v="=" ${op === "=" ? 'class="active"' : ''}>=</button>
            <button type="button" data-v=">" ${op === ">" ? 'class="active"' : ''}>&gt;</button>
            <button type="button" data-v="between" ${op === "between" ? 'class="active"' : ''}>between</button>
          </div>
          <div data-row-single ${op === "between" ? 'hidden' : ''}>
            <label class="ste-fdrop-lbl-sm" style="margin-top:10px">Royalty %</label>
            <input class="ste-fdrop-input" type="number" min="0" max="100" step="0.1" placeholder="e.g. 10" value="${filters.royaltyVal || ''}" data-input="single">
          </div>
          <div data-row-between ${op === "between" ? '' : 'hidden'}>
            <label class="ste-fdrop-lbl-sm" style="margin-top:10px">From — to (%)</label>
            <div style="display:flex; gap:8px; align-items:center">
              <input class="ste-fdrop-input" type="number" min="0" max="100" step="0.1" placeholder="From" value="${filters.royaltyMin || ''}" data-input="min">
              <span style="color:var(--ste-muted)">—</span>
              <input class="ste-fdrop-input" type="number" min="0" max="100" step="0.1" placeholder="To" value="${filters.royaltyMax || ''}" data-input="max">
            </div>
          </div>
          <div class="ste-fdrop-actions" style="margin-top:8px">
            <button type="button" class="ste-btn-link" data-act="clear">Clear</button>
          </div>
        </div>`,
      wire: (panel) => {
        const opBtns = $$('[data-seg="op"] button', panel);
        const single = $('[data-row-single]', panel);
        const between = $('[data-row-between]', panel);
        const singleInput = $('[data-input="single"]', panel);
        const minInput = $('[data-input="min"]', panel);
        const maxInput = $('[data-input="max"]', panel);
        function refreshRows() {
          single.hidden = filters.royaltyOp === "between";
          between.hidden = filters.royaltyOp !== "between";
        }
        opBtns.forEach(b => b.addEventListener("click", () => {
          opBtns.forEach(x => x.classList.remove("active"));
          b.classList.add("active");
          filters.royaltyOp = b.getAttribute("data-v");
          refreshRows();
          onChange();
        }));
        singleInput.addEventListener("input", () => { filters.royaltyVal = singleInput.value; onChange(); });
        minInput.addEventListener("input", () => { filters.royaltyMin = minInput.value; onChange(); });
        maxInput.addEventListener("input", () => { filters.royaltyMax = maxInput.value; onChange(); });
        const clr = $('[data-act="clear"]', panel);
        if (clr) clr.addEventListener("click", () => {
          filters.royaltyOp = ""; filters.royaltyVal = "";
          filters.royaltyMin = ""; filters.royaltyMax = "";
          opBtns.forEach(x => x.classList.remove("active"));
          singleInput.value = ""; minInput.value = ""; maxInput.value = "";
          refreshRows();
          onChange();
        });
      },
    };
  }

  function renewalDatePanel(filters, onChange, today) {
    const todayIso = today.toISOString().slice(0,10);
    const presets = [
      { label: "Today + 90 days", days: 90 },
      { label: "Today + 180 days", days: 180 },
      { label: "Today + 1 year", days: 365 },
    ];
    return {
      html: `
        <div class="ste-fdrop-form">
          <label class="ste-fdrop-lbl-sm">Renewal date by</label>
          <input class="ste-fdrop-input" type="date" min="${todayIso}" value="${filters.renewalDate}">
          <div class="ste-fdrop-presets">
            ${presets.map(p => `<button type="button" data-days="${p.days}">${p.label}</button>`).join("")}
          </div>
          <div class="ste-fdrop-actions" style="margin-top:8px">
            <button type="button" class="ste-btn-link" data-act="clear">Clear</button>
          </div>
        </div>`,
      wire: (panel) => {
        const input = $(".ste-fdrop-input", panel);
        input.addEventListener("input", () => {
          filters.renewalDate = input.value;
          onChange();
        });
        $$("[data-days]", panel).forEach(b => b.addEventListener("click", () => {
          const days = parseInt(b.getAttribute("data-days"));
          const target = new Date(today);
          target.setDate(target.getDate() + days);
          const iso = target.toISOString().slice(0,10);
          filters.renewalDate = iso;
          input.value = iso;
          onChange();
        }));
        const clr = $('[data-act="clear"]', panel);
        if (clr) clr.addEventListener("click", () => {
          filters.renewalDate = "";
          input.value = "";
          onChange();
        });
      },
    };
  }

  function renderRelationsPanel(relations, licenseeId) {
    const labels = {
      "renews":          { sym: "↻", verb: "Renews (predecessor)" },
      "renewed-by":      { sym: "↦", verb: "Renewed by (successor)" },
      "amended-by":      { sym: "✎", verb: "Amended by" },
      "extended-by":     { sym: "↗", verb: "Extended by" },
      "amends":          { sym: "✎", verb: "Amends" },
      "extends":         { sym: "↗", verb: "Extends" },
      "sibling-amend":   { sym: "•", verb: "Sibling amendment" },
      "sibling-extend":  { sym: "•", verb: "Sibling extension" },
    };
    const items = relations.map(rel => {
      const m = labels[rel.kind] || { sym: "•", verb: rel.kind };
      const href = `#/agreements/details/view/${encodeURIComponent(rel.target || licenseeId)}`;
      return `
        <a class="ste-rel-item" href="${href}" target="_blank" rel="noopener" data-rel-target="${escape(rel.target)}">
          <span class="ste-rel-sym">${m.sym}</span>
          <span class="ste-rel-verb">${escape(m.verb)}</span>
          <code class="ste-code">${escape(rel.target)}</code>
        </a>`;
    }).join("");
    return `<div class="ste-rel-panel"><div class="ste-rel-panel-hd">Related documents · ${relations.length}</div><div class="ste-rel-panel-list">${items}</div></div>`;
  }

  function renderContractRows(rows) {
    if (!rows.length) return `<tr><td colspan="10" class="ste-empty-cell">No agreements match your filters</td></tr>`;
    return rows.map(r => renderOneContractRow(r, false) + renderChildContractRows(r)).join("");
  }

  function renderChildContractRows(parent) {
    const children = parent.children || [];
    if (children.length === 0) return "";
    const isOpen = _expandedAgreementIds.has(parent.id);
    if (!isOpen) return "";
    return children.map(c => renderOneContractRow(c, true)).join("");
  }

  function renderOneContractRow(r, isChild) {
    const l = r.licensee;
    // Tone is audience-aware for the back-and-forth statuses: "warn" only
    // when it's the viewer's turn. Terms Sent → HQ pushed terms (licensee
    // owes a response); Terms Updated → licensee countered (HQ owes a
    // response). The non-turn side gets a neutral "info" tone so the page
    // doesn't read as if they have work to do.
    const _rowIsHQ = window.STE && STE.isHQ && STE.isHQ();
    const statusTone = (() => {
      if (r.status === 'Active')        return 'ok';
      if (r.status === 'Renewed')       return 'info';
      if (r.status === 'Expired')       return 'neutral';
      if (r.status === 'Draft')         return 'neutral';
      if (r.status === 'Terms Sent')    return _rowIsHQ ? 'info' : 'warn';
      if (r.status === 'Terms Updated') return _rowIsHQ ? 'warn' : 'info';
      if (r.status === 'Under Review')  return 'warn';
      return 'warn';
    })();
    const startCell = r.effectiveStart ? `<span class="ste-mini">${escape(r.effectiveStart)}</span>` : '<span class="ste-mini">—</span>';
    const endCell = r.effectiveEnd ? `<span class="ste-mini">${escape(r.effectiveEnd)}</span>` : '<span class="ste-mini">—</span>';
    const initials = (l.legalName || '').split(/\s+/).map(s => s[0]).filter(Boolean).slice(0,2).join('').toUpperCase();
    const warningDot = (() => {
      if (!r.warning) return '';
      const daysAbs = Math.abs(r.renewalDays || 0);
      const titleMap = {
        soon:     `Nearing end date — expires in ${daysAbs} days · no successor on file`,
        critical: `Nearing end date — only ${daysAbs} days until expiry · no successor on file`,
        expired:  r.isChild ? "" : `Exceeded end date — expired ${daysAbs} days ago · no successor on file`,
      };
      const msg = titleMap[r.warning] || '';
      return `<span class="ste-warn-wrap" data-tip="${escape(msg)}" title="${escape(msg)}"><span class="ste-warn-dot ste-warn-${r.warning}"></span></span>`;
    })();

    // Leftmost column = expand/collapse chevron for parents with children.
    const childCount = (r.children || []).length;
    const isOpen = _expandedAgreementIds.has(r.id);
    const expandCell = isChild
      ? ''
      : (childCount > 0
          ? `<button class="ste-expand-chevron ${isOpen ? 'open' : ''}" data-expand="${escape(r.id)}" type="button" aria-expanded="${isOpen ? 'true' : 'false'}" aria-label="${isOpen ? 'Collapse' : 'Expand'} children">
               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>
             </button>`
          : '');

    const _agrUpdated = r.lastUpdatedAt
      || (r.contract && (r.contract.lastEditedAt || r.contract.signedAt));
    // Action statuses: HQ owes a response on "Terms Updated"; licensee owes
    // a response on "Terms Sent". (Drafts are HQ-only and filtered upstream.)
    const _agrIsHQ = window.STE && STE.isHQ && STE.isHQ();
    const _agrActionable = _agrIsHQ
      ? (r.status === "Terms Updated" || r.status === "Review" || r.status === "Attention" || r.status === "Draft")
      : (r.status === "Terms Sent");
    const _agrDot = (window.STEUnread && STEUnread.dot("agreement", r.id, _agrUpdated, _agrActionable)) || '';
    return `
      <tr data-lic="${escape(l.id)}" data-row-id="${escape(r.id)}">
        <td class="ste-col-flag" data-col="flag">${_agrDot}${expandCell}</td>
        <td data-col="id">
          <div class="ste-id-cell">
            <code class="ste-code">${escape(r.id)}</code>
          </div>
        </td>
        <td data-col="status">
          <div class="ste-status-cell">
            <span class="ste-badge ste-badge-${statusTone}">${escape(r.status)}</span>
            ${warningDot}
          </div>
        </td>
        <td data-col="licensee">
          <div style="display:flex;gap:8px;align-items:center">
            <span class="ste-mini-avatar">${escape(initials)}</span>
            <strong>${escape(l.legalName)}</strong>
          </div>
        </td>
        <td data-col="territories">${(r.contract && (r.contract.territories || []).length)
          ? r.contract.territories.map(t => `<span class="ste-scope-chip">${escape(t)}</span>`).join("")
          : '<span class="ste-mini">—</span>'}</td>
        <td data-col="exclusivity">${r.contract && r.contract.exclusivity
          ? `<span class="ste-mini">${escape(r.contract.exclusivity.replace(/ \(.*\)$/, '').split(' ')[0])}</span>`
          : '<span class="ste-mini">—</span>'}</td>
        <td data-col="royalty">${r.royaltyPct != null ? `<span class="ste-mono-cell">${r.royaltyPct}%</span>` : '<span class="ste-mini">—</span>'}</td>
        <td data-col="start">${r.effectiveStart ? `<span class="ste-mini">${escape(fmtDate(r.effectiveStart))}</span>` : '<span class="ste-mini">—</span>'}</td>
        <td data-col="end">${r.effectiveEnd ? `<span class="ste-mini">${escape(fmtDate(r.effectiveEnd))}</span>` : '<span class="ste-mini">—</span>'}</td>
        <td data-col="renewal">${r.contract && r.contract.renewalOption ? `<span class="ste-mini">${escape(r.contract.renewalOption)}</span>` : '<span class="ste-mini">—</span>'}</td>
        <td data-col="updated">${r.lastUpdatedAt ? `<span class="ste-mini">${escape(fmtDate(r.lastUpdatedAt))}</span>` : '<span class="ste-mini">—</span>'}</td>
        <td data-col="actions"><button class="ste-row-menu-btn" type="button" data-menu="${escape(r.id)}" aria-label="Row actions" title="Actions"></button></td>
      </tr>`;
  }

  // ============================ CONTRACTS ============================
  // AI Renewal Negotiation Insights card — used on the agreement detail page
  // AND on the New Agreement draft when a prior contract is being amended /
  // renewed / extended. When `applyTarget` is "draft", the recommendations get
  // clickable "Apply" buttons that write into the live draft form.
  function renderRenewalInsights(lic, contract, opts) {
    opts = opts || {};
    const applyMode = opts.applyTarget === "draft";
    if (!lic) return "";
    const royaltyTarget = contract ? +(contract.royaltyPct + 1).toFixed(1) : null;
    const priorMin = contract ? (contract.minQuarterlyGbp || contract.minQuarterlyEur || 0) : 0;
    const minTarget = priorMin + 100000;
    const cur = contract && contract.minQuarterlyEur ? "EUR" : "GBP";
    const minTargetStr = cur === "EUR" ? `€${(minTarget||0).toLocaleString()}` : gbp0(minTarget||0);
    const kpiTone = (v, healthy, attention) => v == null ? "" : v >= healthy ? "ok" : v >= attention ? "warn" : "err";
    const cumTone   = kpiTone(lic.cumulativeMinPct, 150, 100);
    const growthTone= kpiTone(lic.yoyGrowthPct, 5, 0);
    const compTone  = kpiTone(lic.compliance, 90, 75);
    const passTone  = kpiTone(lic.designPassRate, 85, 70);
    const deadTone  = kpiTone(lic.deadlineCompliancePct, 95, 80);

    const recs = [
      {
        kind: "term",
        title: contract ? "Recommend 5-year renewal" : "Open with 5-year term",
        rationale: `Cumulative min ${lic.cumulativeMinPct ?? '—'}% · deadline compliance ${lic.deadlineCompliancePct ?? '—'}%`,
        tag: "Confidence 94%",
        tagTone: "ok",
        payload: { renewalOption: "5y" },
      },
    ];
    if (contract) {
      recs.push({
        kind: "royalty",
        title: `Royalty ${royaltyTarget}%`,
        rationale: `+1pp over current ${contract.royaltyPct}% — within tier-1 EU benchmark band`,
        tag: "Expected +€120K / yr",
        tagTone: "info",
        payload: { royaltyPct: royaltyTarget },
      });
      recs.push({
        kind: "min",
        title: `Minimum ${minTargetStr} / Q`,
        rationale: `Run-rate well above current ${cur === 'EUR' ? '€'+priorMin.toLocaleString() : gbp0(priorMin)} — 50%+ safety margin preserved`,
        tag: "Safety margin +52%",
        tagTone: "info",
        payload: { minQuarterly: minTarget, minAnnual: minTarget * 4 },
      });
    }

    const renderKpi = (lbl, val, sub, tone) => `
      <div class="ste-insight-kpi ste-insight-kpi-${tone || 'neutral'}">
        <div class="ste-insight-kpi-lbl">${escape(lbl)}</div>
        <div class="ste-insight-kpi-val">${val}</div>
        ${sub ? `<div class="ste-insight-kpi-sub">${escape(sub)}</div>` : ""}
      </div>`;

    // In draft mode, the card is context-only: KPIs that the form fields can't
    // show. Recommendation rationales live in the inline AI chips next to each
    // field, so the duplicated rec rows are stripped here to avoid noise.
    const titleText = applyMode
      ? "Performance Review"
      : "Renewal Negotiation Insights";
    const subText = applyMode
      ? `AI has analyzed <strong>${escape(lic.legalName || 'this licensee')}</strong>'s performance — these are the headline metrics that informed the suggestions next to each Terms field below.`
      : `Generated from ${escape(lic.legalName || 'licensee')} performance · refreshed today`;

    return `
      <div class="ste-card ste-insight-card">
        <div class="ste-insight-hd">
          <div class="ste-insight-hd-left">
            <span class="ste-insight-badge">AI</span>
            <div>
              <h3 class="ste-insight-title">${titleText}</h3>
              <div class="ste-mini">${subText}</div>
            </div>
          </div>
          ${!applyMode ? `<button class="ste-btn ste-btn-ghost ste-btn-mini">Refresh</button>` : ''}
        </div>

        <div class="ste-insight-kpis">
          ${renderKpi("Cumulative Min", (lic.cumulativeMinPct ?? '—') + '%', (lic.cumulativeMinPct||0) >= 150 ? 'Excellent' : (lic.cumulativeMinPct||0) >= 100 ? 'Healthy' : 'Below target', cumTone)}
          ${renderKpi("Revenue Growth", ((lic.yoyGrowthPct||0) >= 0 ? '+' : '') + (lic.yoyGrowthPct ?? '—') + '%', "3-year YoY avg", growthTone)}
          ${renderKpi("Compliance", lic.compliance ?? '—', "/100 · portfolio avg 89", compTone)}
          ${renderKpi("Design Pass", (lic.designPassRate ?? '—') + '%', "Current season", passTone)}
          ${renderKpi("On-time", (lic.deadlineCompliancePct ?? '—') + '%', "Deadline compliance", deadTone)}
        </div>

        ${!applyMode ? `
          <div class="ste-insight-recs">
            ${recs.map(r => `
              <div class="ste-insight-rec">
                <div class="ste-insight-rec-main">
                  <div class="ste-insight-rec-title">${escape(r.title)}</div>
                  <div class="ste-insight-rec-rationale">${escape(r.rationale)}</div>
                </div>
                <div class="ste-insight-rec-tag ste-insight-tag-${r.tagTone}">${escape(r.tag)}</div>
              </div>`).join("")}
          </div>

          <div class="ste-actions ste-insight-actions">
            <button class="ste-btn ste-btn-primary">Generate Term Sheet</button>
            <button class="ste-btn ste-btn-ghost">View Underlying Data</button>
            <button class="ste-btn ste-btn-ghost">Adjust Assumptions</button>
          </div>` : ''}
      </div>`;
  }

  // ============================ NEW AGREEMENT DRAFT (HQ) ============================
  // Build a prefill object from an Agreements-list row + the chosen agreement
  // type. For Master-License renewals, term dates shift to start the day after
  // the predecessor's end date; for amendments/extensions, term dates inherit
  // from the prior contract and the user adjusts.
  function buildPrefillFromRow(row, type, opts) {
    opts = opts || {};
    const prior = row.contract;
    if (!prior) {
      return { type, licenseeId: row.licensee?.id || "" };
    }
    const lic = row.licensee || {};
    const dayAfter = (d) => {
      if (!d) return "";
      const dt = new Date(d); dt.setDate(dt.getDate() + 1);
      return dt.toISOString().slice(0, 10);
    };
    const addYears = (d, y) => {
      if (!d) return "";
      const dt = new Date(d); dt.setFullYear(dt.getFullYear() + y);
      return dt.toISOString().slice(0, 10);
    };
    // Term end is the day BEFORE the same calendar date `y` years out — so a
    // 5y term starting 2026-05-19 ends 2031-05-18, not 2031-05-19.
    const termEndFromStart = (d, y) => {
      if (!d) return "";
      const dt = new Date(d);
      dt.setFullYear(dt.getFullYear() + y);
      dt.setDate(dt.getDate() - 1);
      return dt.toISOString().slice(0, 10);
    };
    // Parse paymentTerms "Net 30 · Quarterly" into the two fields
    let paymentNet = prior.paymentNet || "Net 30";
    let paymentFrequency = prior.paymentFrequency || "Quarterly";
    if (!prior.paymentNet && prior.paymentTerms) {
      const parts = String(prior.paymentTerms).split("·").map(s => s.trim());
      if (parts[0]) paymentNet = parts[0];
      if (parts[1]) paymentFrequency = parts[1];
    }
    const currency = lic.currency || (prior.minQuarterlyEur ? "EUR" : "GBP");
    const usingEur = currency === "EUR";
    return {
      type,
      licenseeId: prior.licenseeId,
      succeedsContractId: prior.id,
      termStart: opts.renewal ? dayAfter(prior.termEnd) : prior.termStart,
      termEnd: opts.renewal ? termEndFromStart(dayAfter(prior.termEnd), 5) : prior.termEnd,
      renewalOption: prior.renewalOption || "5y",
      royaltyPct: prior.royaltyPct,
      marketingPct: prior.marketingPct,
      advertisingPct: prior.advertisingPct,
      currency,
      minQuarterly: usingEur ? prior.minQuarterlyEur : prior.minQuarterlyGbp,
      minAnnual:    usingEur ? prior.minAnnualEur    : prior.minAnnualGbp,
      paymentNet, paymentFrequency,
      counterpartyName: prior.counterpartyName,
      counterpartyTitle: prior.counterpartyTitle,
      signedAt: new Date().toISOString().slice(0, 10),
      // License scope — inherit from the prior contract when it stores it
      // explicitly; otherwise derive sensible defaults from the licensee
      // (country, categories) so renewals don't start blank.
      exclusivity: prior.exclusivity || "Exclusive",
      territories: Array.isArray(prior.territories) && prior.territories.length
        ? [...prior.territories]
        : (lic.country ? [lic.country] : []),
      productCategories: Array.isArray(prior.productCategories) && prior.productCategories.length
        ? [...prior.productCategories]
        : (Array.isArray(lic.categories) ? [...lic.categories] : []),
      distributionChannels: Array.isArray(prior.distributionChannels) && prior.distributionChannels.length
        ? [...prior.distributionChannels]
        : ["Wholesale", "Retail"],
      subLicensing: prior.subLicensing || "Not permitted",
      rightOfFirstRefusal: typeof prior.rightOfFirstRefusal === "boolean" ? prior.rightOfFirstRefusal : true,
      sellOffPeriodDays: prior.sellOffPeriodDays || 180,
      notes: opts.renewal
        ? `Renewing ${prior.id} — predecessor term ${prior.termStart} → ${prior.termEnd}. Carry over financial terms or adjust below.`
        : type === "Amendment"
        ? `Amending ${prior.id} — leave term dates as-is; adjust financial fields that change.`
        : type === "Extension Request"
        ? `Extension request on ${prior.id} — propose new end date and confirm any condition changes.`
        : "",
    };
  }

  function renderAgreementDraft(root) {
    const state = STE.get();
    const lics = state.licensees || [];
    // Existing contracts grouped by licensee — used for "succeeds" picker
    const contracts = state.contracts || [];
    const _cu = STE.currentUser();
    const _isHQUser = _cu && STE.isHQ(_cu);

    // Each fresh entry to the draft page should re-run "AI analysis" so the
    // spinner is visible — otherwise the cache makes the card pop in instantly
    // on the second visit, which reads as "the AI didn't actually look at it".
    _insightsAnalyzed.clear();

    // Form state (kept on the function scope; not persisted until Save).
    // All "user picks this" fields start empty so the form looks unconfigured.
    // If a prefill was set by the Agreements row menu (Amend/Extend/Renew),
    // those values land on top of these blanks.
    // For NEW agreements every value starts blank — the AI suggests defaults
    // based on patterns from active contracts (the row-menu prefill from
    // Amend/Extend/Renew still lands on top of these blanks).
    const baseDraft = {
      // Only one agreement type exists (Master License) — the form no longer
      // exposes Amendment / Extension Request as separate flows.
      type: "Master License",
      licenseeId: "",
      succeedsContractId: "",
      termStart: "",
      termEnd: "",
      renewalOption: "",
      royaltyPct: "",
      marketingPct: "",
      advertisingPct: "",
      currency: "",
      minQuarterly: "",
      minAnnual: "",
      paymentNet: "",
      paymentFrequency: "",
      counterpartyName: "",
      counterpartyTitle: "",
      signedAt: new Date().toISOString().slice(0, 10),
      description: "",
      notes: "",
      reminders: defaultReminders(),
      // License scope — defaults blank; required only for Master License
      exclusivity: "",
      territories: [],
      productCategories: [],
      distributionChannels: [],
      subLicensing: "Not permitted",
      rightOfFirstRefusal: true,
      sellOffPeriodDays: 180,
    };
    const draft = Object.assign(baseDraft, _agreementDraftPrefill || {});
    const prefillBanner = _agreementDraftPrefill ? Object.assign({}, _agreementDraftPrefill) : null;
    _agreementDraftPrefill = null;
    const editId = _agreementEditId;
    _agreementEditId = null;
    const isEditMode = !!editId;
    const counterPropose = _agreementCounterPropose;
    _agreementCounterPropose = false;

    // Scroll so the target card sits just below the sticky header pair
    // (global header + page section header). Dynamic measurement beats a
    // hard-coded scroll-margin-top because the section header height varies
    // with crumbs / page title length. `focusSelector` (optional) moves the
    // keyboard focus to the next field once scroll completes — keeps the
    // mouse-and-keyboard flow continuous.
    function scrollIntoViewBelowStickies(selector, focusSelector) {
      requestAnimationFrame(() => {
        const target = root.querySelector(selector);
        if (!target) return;
        const sectionHd = root.querySelector(".ste-section-hd");
        const globalHd = document.querySelector(".header");
        const stickyH = (globalHd?.offsetHeight || 56) + (sectionHd?.offsetHeight || 100);
        const desiredTop = window.scrollY + target.getBoundingClientRect().top - stickyH - 12;
        const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        const clamped = Math.max(0, Math.min(desiredTop, maxScroll));
        // Only animate if the move is more than a tiny nudge — otherwise the
        // user just sees a stutter for no reason. Below the threshold we treat
        // the target as already in view and skip straight to focus.
        const willMove = Math.abs(clamped - window.scrollY) > 8;
        if (willMove) window.scrollTo({ top: clamped, behavior: "smooth" });
        if (focusSelector) {
          const focusEl = root.querySelector(focusSelector);
          if (focusEl) {
            // Wait for smooth-scroll to finish before focusing — otherwise
            // browsers cancel the scroll to keep the focused element in view.
            // If no scroll fired, focus immediately.
            setTimeout(() => { focusEl.focus({ preventScroll: true }); }, willMove ? 450 : 0);
          }
        }
      });
    }
    function scrollAgreementSectionToInsights() {
      scrollIntoViewBelowStickies(".ste-insight-loading, .ste-insight-card", 'input[data-f="termStart"]');
    }
    function scrollCounterpartyToAgreementType() {
      scrollIntoViewBelowStickies('[data-section="agreement-type"]', 'select[data-f="type"]');
    }

    // One-shot guard so we only cascade to the Agreement Type card once per
    // licensee selection (reset when the user switches licensees).
    let _scrolledFromCounterparty = false;

    function paint() {
      const selectedLic = lics.find(l => l.id === draft.licenseeId);
      const sameLicContracts = contracts.filter(c => c.licenseeId === draft.licenseeId);
      const priorContract = draft.succeedsContractId
        ? contracts.find(c => c.id === draft.succeedsContractId)
        : null;
      root.innerHTML = `
        <div class="ste-screen-pad">
          <div class="ste-section-hd">
            <div class="ste-page-crumbs">
              <a href="#/home">Home</a><span class="sep">/</span>
              <a href="#/agreements">Agreements</a><span class="sep">/</span>
              <span class="cur">${counterPropose ? 'Counter-Propose' : (isEditMode && selectedLic ? escape(selectedLic.legalName) : 'Create New Agreement')}</span>
            </div>
            <div class="ste-page-hd-row">
              <div>
                <h1>${counterPropose && selectedLic ? `${escape(selectedLic.legalName)} — Counter-Propose` : (isEditMode && selectedLic ? escape(selectedLic.legalName) : 'Create New Agreement')}</h1>
                ${counterPropose ? `<p>Adjust any term below. Saving sends a versioned counter-proposal to the other party and shifts the agreement to their court.</p>` : (!isEditMode && prefillBanner && priorContract ? `<p>Drafting <strong>${escape(draft.type)}</strong> for ${escape(selectedLic ? selectedLic.legalName : '')} — succeeds <strong>${escape(priorContract.id)}</strong>. Fields pre-filled from the prior contract; adjust below.</p>` : '')}
              </div>
              <div class="ste-hd-cta">
                <a class="ste-btn ste-btn-ghost" href="${isEditMode ? '#/agreements/details/view/' + editId : '#/agreements'}">Cancel</a>
                <button class="ste-btn ste-btn-primary" data-act="save-draft">${counterPropose ? 'Send Counter-Proposal' : (isEditMode ? 'Save Changes' : 'Save Draft')}</button>
              </div>
            </div>
          </div>

          ${_isHQUser ? `
          <div class="ste-card">
            <div class="ste-card-head"><h3>Counterparty</h3></div>
            <div class="ste-card-body">
              <div class="ste-form-grid-2">
                <div class="ste-field" style="grid-column: 1 / -1">
                  <div class="ste-lbl">Licensee</div>
                  <select class="ste-input" data-f="licenseeId">
                    <option value="" ${!draft.licenseeId?'selected':''} disabled>Select licensee…</option>
                    ${lics.map(l => `<option value="${escape(l.id)}" ${l.id===draft.licenseeId?'selected':''}>${escape(l.legalName)}</option>`).join("")}
                  </select>
                  ${!draft.licenseeId ? `<div class="ste-mini" style="margin-top:6px">Choose the licensee first — counterparty contact, agreement type, and parent linkage adjust based on this selection.</div>` : ''}
                </div>
                ${draft.licenseeId ? `
                <div class="ste-field">
                  <div class="ste-lbl">Counterparty Name</div>
                  <input class="ste-input" type="text" data-f="counterpartyName" value="${escape(draft.counterpartyName)}" placeholder="${escape((selectedLic && selectedLic.contactName) || 'Counterparty contact')}">
                </div>
                <div class="ste-field">
                  <div class="ste-lbl">Counterparty Title</div>
                  <input class="ste-input" type="text" data-f="counterpartyTitle" value="${escape(draft.counterpartyTitle)}" placeholder="${escape((selectedLic && selectedLic.contactTitle) || 'Title')}">
                </div>
                ` : ''}
              </div>
            </div>
          </div>` : ''}

          ${(draft.licenseeId && selectedLic) ? `
            ${(() => {
              // AI insights only fire for renewal-flavored drafts (Amendment /
              // Extension / a renewal-typed Master) — not when editing an
              // existing contract or creating a fresh Master from scratch.
              const isRenewal = !!priorContract;
              if (isEditMode || !isRenewal) return '';
              const key = aiAnalyzedKey(priorContract, selectedLic, draft.type);
              if (_insightsAnalyzed.has(key)) {
                return renderRenewalInsights(selectedLic, priorContract || null, { applyTarget: "draft" });
              }
              // Loading state mirrors the loaded state's structure exactly —
              // same header, same 5-tile KPI grid — so the card doesn't
              // resize when the spinner resolves. Tiles render as skeleton
              // shimmers, and a small spinner sits next to the title.
              const skeletonTile = (lbl) => `
                <div class="ste-insight-kpi ste-insight-kpi-skel">
                  <div class="ste-insight-kpi-lbl">${escape(lbl)}</div>
                  <div class="ste-insight-kpi-val ste-skel-bar"></div>
                  <div class="ste-insight-kpi-sub ste-skel-bar ste-skel-bar-sm"></div>
                </div>`;
              return `
                <div class="ste-card ste-insight-card ste-insight-loading" data-insight-key="${escape(key)}">
                  <div class="ste-insight-hd">
                    <div class="ste-insight-hd-left">
                      <span class="ste-insight-badge">AI</span>
                      <div>
                        <h3 class="ste-insight-title">Performance Review</h3>
                        <div class="ste-mini">
                          <span class="ste-spinner ste-spinner-inline" aria-hidden="true"></span>
                          Negotiation Agent is analyzing <strong>${escape(selectedLic.legalName)}</strong>'s performance…
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="ste-insight-kpis">
                    ${skeletonTile("Cumulative Min")}
                    ${skeletonTile("Revenue Growth")}
                    ${skeletonTile("Compliance")}
                    ${skeletonTile("Design Pass")}
                    ${skeletonTile("On-time")}
                  </div>
                </div>`;
            })()}

            <div class="ste-card">
              <div class="ste-card-head"><h3>Terms</h3></div>
              <div class="ste-card-body">
                <div class="ste-form-subhd">Effective Period</div>
                <div class="ste-form-grid-2">
                  <div class="ste-field">
                    <div class="ste-lbl">Term Start</div>
                    <input class="ste-input" type="date" data-f="termStart" value="${escape(draft.termStart)}">
                  </div>
                  <div class="ste-field">
                    <div class="ste-lbl">Term End</div>
                    <input class="ste-input" type="date" data-f="termEnd" value="${escape(draft.termEnd)}">
                  </div>
                  <div class="ste-field" style="grid-column: 1 / -1">
                    <div class="ste-lbl">Renewal Option</div>
                    <select class="ste-input" data-f="renewalOption">
                      ${["—","3y","5y","5+5y","Auto (1y rolling)"].map(o => `<option ${o===draft.renewalOption?'selected':''}>${o}</option>`).join("")}
                    </select>
                    ${aiSuggestChip("renewalOption", draft, priorContract, selectedLic, _insightsAnalyzed)}
                  </div>
                  <div class="ste-field" style="grid-column: 1 / -1">
                    <div class="ste-lbl">Signed Date (planned)</div>
                    <input class="ste-input" type="date" data-f="signedAt" value="${escape(draft.signedAt)}">
                  </div>
                </div>

                <div class="ste-form-subhd">Financial</div>
                <div class="ste-form-grid-2">
                  <div class="ste-field">
                    <div class="ste-lbl">Reporting Currency</div>
                    <select class="ste-input" data-f="currency">
                      <option value="" ${!draft.currency?'selected':''} disabled>Select currency…</option>
                      ${(((state.referenceData||{}).currencies) || ["GBP","EUR","USD"]).map(c => `<option ${c===draft.currency?'selected':''}>${c}</option>`).join("")}
                    </select>
                  </div>
                  <div class="ste-field" style="grid-column: 1 / -1">
                    <div class="ste-lbl">Royalty %</div>
                    <input class="ste-input" type="number" step="0.1" min="0" max="100" data-f="royaltyPct" value="${draft.royaltyPct}">
                    ${aiSuggestChip("royaltyPct", draft, priorContract, selectedLic, _insightsAnalyzed)}
                  </div>
                  <div class="ste-field">
                    <div class="ste-lbl">Marketing Contribution %</div>
                    <input class="ste-input" type="number" step="0.1" min="0" max="100" data-f="marketingPct" value="${draft.marketingPct}">
                    ${aiSuggestChip("marketingPct", draft, priorContract, selectedLic, _insightsAnalyzed)}
                  </div>
                  <div class="ste-field">
                    <div class="ste-lbl">Advertising Spend %</div>
                    <input class="ste-input" type="number" step="0.1" min="0" max="100" data-f="advertisingPct" value="${draft.advertisingPct}">
                    ${aiSuggestChip("advertisingPct", draft, priorContract, selectedLic, _insightsAnalyzed)}
                  </div>
                  <div class="ste-field" style="grid-column: 1 / -1">
                    <div class="ste-lbl">Minimum / Quarter${draft.currency ? ` (${draft.currency})` : ''}</div>
                    <input class="ste-input" type="number" step="10000" min="0" data-f="minQuarterly" value="${draft.minQuarterly}">
                    ${aiSuggestChip("minQuarterly", draft, priorContract, selectedLic, _insightsAnalyzed)}
                  </div>
                  <div class="ste-field" style="grid-column: 1 / -1">
                    <div class="ste-lbl">Minimum / Year${draft.currency ? ` (${draft.currency})` : ''}</div>
                    <input class="ste-input" type="number" step="10000" min="0" data-f="minAnnual" value="${draft.minAnnual}">
                    ${aiSuggestChip("minAnnual", draft, priorContract, selectedLic, _insightsAnalyzed)}
                  </div>
                  <div class="ste-field">
                    <div class="ste-lbl">Payment Net</div>
                    <select class="ste-input" data-f="paymentNet">
                      ${["Net 15","Net 30","Net 45","Net 60","Net 90","Due on receipt"].map(o => `<option ${o===draft.paymentNet?'selected':''}>${o}</option>`).join("")}
                    </select>
                    ${aiSuggestChip("paymentNet", draft, priorContract, selectedLic, _insightsAnalyzed)}
                  </div>
                  <div class="ste-field">
                    <div class="ste-lbl">Billing Frequency</div>
                    <select class="ste-input" data-f="paymentFrequency">
                      ${["Monthly","Quarterly","Semi-annual","Annual"].map(o => `<option ${o===draft.paymentFrequency?'selected':''}>${o}</option>`).join("")}
                    </select>
                    ${aiSuggestChip("paymentFrequency", draft, priorContract, selectedLic, _insightsAnalyzed)}
                  </div>
                </div>
              </div>
            </div>

            ${renderLicenseScopeCard(draft, state)}

            ${renderAnnualPeriodsEditor(draft, priorContract)}

            ${renderRenewalTermEditor(draft)}

            ${renderRenewalTimeline({ reminders: draft.reminders }, { id: "DRAFT", termEnd: draft.termEnd }, draft.termEnd ? Math.round((new Date(draft.termEnd) - new Date()) / 86400000) : "?")}

            <div class="ste-card">
              <div class="ste-card-head"><h3>Description</h3></div>
              <div class="ste-card-body">
                <textarea class="ste-input" rows="4" data-f="description" placeholder="e.g. 5-year master licence covering Apparel + Accessory for Best of Britain Ltd in UK & Ireland. Renewal of expiring 2022 master with updated minimum and brand-elevation conditions.">${escape(draft.description)}</textarea>
              </div>
            </div>

            <div class="ste-card">
              <div class="ste-card-head"><h3>Internal Notes</h3></div>
              <div class="ste-card-body">
                <textarea class="ste-input" rows="4" data-f="notes" placeholder="Anything the next reviewer should know about this draft…">${escape(draft.notes)}</textarea>
              </div>
            </div>

            <div class="ste-form-actions" style="display:flex;justify-content:flex-end;gap:10px">
              <a class="ste-btn ste-btn-ghost" href="${isEditMode ? '#/agreements/details/view/' + editId : '#/agreements'}">Cancel</a>
              <button class="ste-btn ste-btn-primary" data-act="save-draft">${counterPropose ? 'Send Counter-Proposal' : (isEditMode ? 'Save Changes' : 'Save Draft')}</button>
            </div>
          ` : `
            <div class="ste-mini" style="padding: 12px 4px; color: var(--ste-muted);">Pick an agreement type and licensee above to continue.</div>
          `}
        </div>`;

      // Wire field bindings
      root.querySelectorAll("[data-f]").forEach(inp => {
        // Clear error state as soon as user edits the offending field.
        inp.addEventListener("input", () => {
          if (inp.classList.contains("ste-input-error")) {
            inp.classList.remove("ste-input-error");
            const field = inp.closest(".ste-field") || inp.parentElement;
            field?.querySelector(".ste-inline-error")?.remove();
          }
        });
        inp.addEventListener("change", () => {
          const k = inp.getAttribute("data-f");
          const v = inp.type === "number" ? (parseFloat(inp.value) || 0) : inp.value;
          draft[k] = v;
          // Cascade: changing licensee should pre-fill counterparty + currency
          // and triggers a re-render so the lower sections appear.
          if (k === "type") {
            // Auto-fill term dates for Master Licence (no prior to inherit
            // from) — opens at today, runs 5 years matching the default
            // renewal option. Amendments / Extensions inherit dates from the
            // parent contract when the user picks one, so skip auto-fill
            // here. Don't overwrite user-edited dates.
            if (v === "Master License" && !draft.succeedsContractId) {
              const today = new Date();
              const end = new Date(today);
              end.setFullYear(end.getFullYear() + 5);
              end.setDate(end.getDate() - 1);
              if (!draft.termStart) draft.termStart = today.toISOString().slice(0, 10);
              if (!draft.termEnd) draft.termEnd = end.toISOString().slice(0, 10);
            }
            paint();
            // Master Licence with no parent: AI insights fire immediately.
            // Amendment / Extension: insights wait until the user picks a
            // parent master licence — scroll triggers from that handler.
            if (v === "Master License" || v === "Letter of Intent") {
              scrollAgreementSectionToInsights();
            }
            return;
          }
          if (k === "licenseeId") {
            const newLic = lics.find(l => l.id === v);
            // Reset one-shot scroll guard whenever the licensee changes; user
            // gets to see counterparty cascade once per pick.
            _scrolledFromCounterparty = false;
            const autofilled = !!(newLic && newLic.contactName && newLic.contactTitle);
            if (newLic) {
              draft.counterpartyName = newLic.contactName || "";
              draft.counterpartyTitle = newLic.contactTitle || "";
              draft.currency = newLic.currency || draft.currency;
            }
            // Reset type + succeedsContractId if no longer valid for the new licensee
            const newLicContracts = contracts.filter(c => c.licenseeId === v);
            const hasMaster = newLicContracts.some(c => (c.type || "Master License") === "Master License");
            if (!hasMaster && (draft.type === "Amendment" || draft.type === "Extension Request")) {
              draft.type = "";
            }
            // Auto-pick the most-recent settled Master License as the parent so
            // the new draft inherits prior terms + triggers AI suggestions per
            // field. In-flight new agreements (Draft / Terms Sent / Terms
            // Updated) are excluded — those aren't valid predecessors.
            const settled = newLicContracts
              .filter(c => (c.type || "Master License") === "Master License")
              .filter(c => {
                const s = (c.status || "").toLowerCase();
                return s !== "draft" && s !== "terms sent" && s !== "terms updated";
              })
              .sort((a, b) => String(b.termStart || b.signedAt || "").localeCompare(String(a.termStart || a.signedAt || "")));
            const prior = settled[0];
            if (prior && draft.type === "Master License") {
              const fakeRow = { contract: prior, licensee: newLic };
              const prefill = buildPrefillFromRow(fakeRow, draft.type, { renewal: true });
              draft.succeedsContractId = prior.id;
              ["royaltyPct","marketingPct","advertisingPct","currency","minQuarterly","minAnnual",
               "paymentNet","paymentFrequency","renewalOption","termStart","termEnd",
               "exclusivity","territories","productCategories","distributionChannels",
               "subLicensing","rightOfFirstRefusal","sellOffPeriodDays"].forEach(f => {
                if (prefill[f] !== undefined && prefill[f] !== "" && prefill[f] !== null) {
                  draft[f] = prefill[f];
                }
              });
              STEApp.toast(`Terms pre-filled from ${prior.id} with new dates`, "info");
            } else {
              draft.succeedsContractId = "";
            }
            paint();
            // If the licensee carried a contact on file, counterparty just
            // auto-filled — cascade to the Agreement Type card. Otherwise
            // leave the user on the Counterparty card to type the contact
            // manually; the counterparty-field handler will scroll once both
            // fields are populated.
            if (autofilled) {
              _scrolledFromCounterparty = true;
              scrollCounterpartyToAgreementType();
            }
            return;
          }
          // Manual counterparty completion — once user has filled both name
          // and title (typical for new licensees with no contact on file),
          // cascade to the Agreement Type card.
          if ((k === "counterpartyName" || k === "counterpartyTitle")
              && !_scrolledFromCounterparty
              && draft.counterpartyName && draft.counterpartyTitle) {
            _scrolledFromCounterparty = true;
            scrollCounterpartyToAgreementType();
          }
          // Cascade: picking a parent contract pre-fills financial fields
          // from the prior. Renewal-typed Master Licenses advance the dates;
          // Amendments/Extensions keep the predecessor dates as a starting
          // point for the user to adjust.
          if (k === "succeedsContractId" && v) {
            const prior = contracts.find(c => c.id === v);
            if (prior) {
              const isRenewal = draft.type === "Master License";
              const fakeRow = { contract: prior, licensee: lics.find(l => l.id === prior.licenseeId) };
              const prefill = buildPrefillFromRow(fakeRow, draft.type, { renewal: isRenewal });
              ["royaltyPct","marketingPct","advertisingPct","currency","minQuarterly","minAnnual",
               "paymentNet","paymentFrequency","renewalOption","termStart","termEnd",
               "exclusivity","territories","productCategories","distributionChannels",
               "subLicensing","rightOfFirstRefusal","sellOffPeriodDays"].forEach(f => {
                if (prefill[f] !== undefined && prefill[f] !== "" && prefill[f] !== null) {
                  draft[f] = prefill[f];
                }
              });
              STEApp.toast(`Terms pre-filled from ${prior.id}${isRenewal ? ' with new dates' : ''}`, "info");
            }
            paint();
            // Agreement Type section is now fully filled (type + parent) —
            // scroll the insights card into view, same as Master Licence flow.
            scrollAgreementSectionToInsights();
            return;
          }
          // Re-render when type or currency changes (labels depend on them)
          if (k === "type" || k === "currency") { paint(); return; }
        });
        inp.addEventListener("input", () => {
          if (inp.type === "text" || inp.tagName === "TEXTAREA") {
            const k = inp.getAttribute("data-f");
            draft[k] = inp.value;
          }
        });
      });

      // Save button
      root.querySelectorAll('[data-act="save-draft"]').forEach(b => {
        b.addEventListener("click", () => saveDraft(draft));
      });

      // Swap the AI Insights spinner for the real card once "analysis" completes.
      // Only runs while the spinner is mounted; flag persists for the session.
      const spinnerCard = root.querySelector(".ste-insight-loading");
      if (spinnerCard && selectedLic) {
        const key = spinnerCard.getAttribute("data-insight-key");
        if (key) {
          setTimeout(() => {
            _insightsAnalyzed.add(key);
            paint();
          }, 1400);
        }
      }

      // Annual Periods editor — field edits + add/remove rows
      root.querySelectorAll("[data-ap-field]").forEach(inp => {
        inp.addEventListener("change", () => {
          const tr = inp.closest("[data-ap-idx]");
          if (!tr) return;
          const idx = parseInt(tr.getAttribute("data-ap-idx"));
          const field = inp.getAttribute("data-ap-field");
          const ap = draft.annualPeriods && draft.annualPeriods[idx];
          if (!ap) return;
          let v = inp.value;
          if (field === "gmnsEur" || field === "gmrEur" || field === "terminationThresholdPct") {
            v = inp.value === "" ? null : parseFloat(inp.value);
          }
          ap[field] = v;
          // Auto-update GMR when GMNS changes and royaltyPct is set
          if (field === "gmnsEur" && draft.royaltyPct && (!ap.gmrEur || ap._gmrAuto)) {
            ap.gmrEur = Math.round(v * (draft.royaltyPct / 100));
            ap._gmrAuto = true;
          }
          paint();
        });
      });
      root.querySelector("[data-ap-add]")?.addEventListener("click", () => {
        draft.annualPeriods = draft.annualPeriods || [];
        const last = draft.annualPeriods[draft.annualPeriods.length - 1];
        const yr = draft.annualPeriods.length + 1;
        let from = "", to = "", gmns = 0, gmr = 0, threshold = 90;
        if (last) {
          const lastTo = new Date(last.to);
          lastTo.setDate(lastTo.getDate() + 1);
          from = lastTo.toISOString().slice(0, 10);
          const newTo = new Date(lastTo); newTo.setFullYear(newTo.getFullYear() + 1); newTo.setDate(newTo.getDate() - 1);
          to = newTo.toISOString().slice(0, 10);
          gmns = Math.round((+last.gmnsEur || 0) * 1.10);
          gmr = Math.round(gmns * (draft.royaltyPct ? draft.royaltyPct / 100 : 0.10));
        }
        draft.annualPeriods.push({ year: yr, from, to, gmnsEur: gmns, gmrEur: gmr, terminationThresholdPct: threshold, quarterly: [] });
        paint();
      });
      root.querySelectorAll("[data-ap-rm]").forEach(b => {
        b.addEventListener("click", () => {
          const idx = parseInt(b.getAttribute("data-ap-rm"));
          draft.annualPeriods.splice(idx, 1);
          // Re-number remaining rows
          draft.annualPeriods.forEach((p, i) => { p.year = i + 1; });
          paint();
        });
      });

      // Renewal Term editor
      root.querySelectorAll("[data-rt-field]").forEach(inp => {
        inp.addEventListener("change", () => {
          draft.renewalTerm = draft.renewalTerm || {};
          const f = inp.getAttribute("data-rt-field");
          if (f === "optionYears") draft.renewalTerm.optionYears = inp.value === "" ? null : parseInt(inp.value);
          else if (f === "stepUpsText") {
            draft.renewalTerm.stepUps = inp.value.split("\n").map(line => {
              const m = line.match(/Y(\d+)\s+\+?(\d+)%\s+vs\s+(.+)/i);
              return m ? { year: parseInt(m[1]), pctIncrease: parseInt(m[2]), vs: m[3].trim() } : null;
            }).filter(Boolean);
          }
          else if (f === "conditionsText") {
            draft.renewalTerm.conditions = inp.value.split("\n").map(l => l.trim()).filter(Boolean);
          }
          else draft.renewalTerm[f] = inp.value;
        });
      });

      // Apply-to-draft on inline AI suggestion chips
      root.querySelectorAll("[data-ai-apply]").forEach(b => {
        b.addEventListener("click", () => {
          const k = b.getAttribute("data-ai-apply");
          const raw = b.getAttribute("data-ai-value");
          // Numeric fields: parse; string fields: keep as-is.
          const v = ["royaltyPct","minQuarterly","minAnnual"].includes(k) ? parseFloat(raw) : raw;
          draft[k] = v;
          STEApp.toast(`AI recommendation applied · ${k} = ${raw}`, "success");
          paint();
        });
      });

      // Apply-to-draft on AI Insight cards
      root.querySelectorAll("[data-apply-insight]").forEach(b => {
        b.addEventListener("click", () => {
          try {
            const payload = JSON.parse(b.getAttribute("data-apply-payload") || "{}");
            Object.keys(payload).forEach(k => { draft[k] = payload[k]; });
            STEApp.toast("AI recommendation applied to draft", "success");
            paint();
          } catch (e) {
            STEApp.toast("Failed to apply recommendation", "warn");
          }
        });
      });

      // License Scope — multi-select checkboxes, bool toggles, territory chips
      root.querySelectorAll("[data-multi]").forEach(cb => {
        cb.addEventListener("change", () => {
          const key = cb.getAttribute("data-multi");
          const val = cb.value;
          draft[key] = draft[key] || [];
          if (cb.checked) {
            if (!draft[key].includes(val)) draft[key].push(val);
          } else {
            draft[key] = draft[key].filter(v => v !== val);
          }
          // Toggle visual on the label parent
          cb.closest(".ste-scope-check")?.classList.toggle("on", cb.checked);
        });
      });
      root.querySelectorAll("[data-bool]").forEach(cb => {
        cb.addEventListener("change", () => {
          const key = cb.getAttribute("data-bool");
          draft[key] = cb.checked;
          cb.closest(".ste-scope-check")?.classList.toggle("on", cb.checked);
        });
      });
      // Exclusivity radios — drive draft.exclusivity from the radio group
      root.querySelectorAll("[data-radio='exclusivity']").forEach(r => {
        r.addEventListener("change", () => {
          if (r.checked) { draft.exclusivity = r.value; paint(); }
        });
      });

      // Territory typeahead — Enter or blur commits. Case-insensitive dedupe;
      // if the typed value matches a preset (any case), use that canonical
      // casing; otherwise the user's input is added verbatim.
      const territoryInput = root.querySelector("[data-territory-input]");
      if (territoryInput) {
        const presets = [
          "United Kingdom","Ireland","France","Germany","Italy","Spain","Portugal",
          "Netherlands","Belgium","Luxembourg","Sweden","Norway","Denmark","Finland",
          "Iceland","Poland","Czech Republic","Slovakia","Hungary","Austria",
          "Switzerland","Liechtenstein","Greece","Cyprus","Malta","Romania","Bulgaria",
          "Croatia","Slovenia","Estonia","Latvia","Lithuania","Channel Islands",
          "United States","Canada","Mexico","Brazil","Argentina","Chile","Colombia",
          "Australia","New Zealand","Japan","South Korea","China","Taiwan","Hong Kong",
          "Singapore","India","Vietnam","Thailand","Indonesia","Malaysia","Philippines",
          "UAE","Saudi Arabia","Israel","Turkey","Egypt","Morocco","South Africa",
        ];
        const commit = () => {
          const raw = (territoryInput.value || "").trim();
          if (!raw) return;
          const canonical = presets.find(p => p.toLowerCase() === raw.toLowerCase()) || raw;
          draft.territories = draft.territories || [];
          if (draft.territories.some(t => t.toLowerCase() === canonical.toLowerCase())) {
            STEApp.toast(`${canonical} already added`, "warn");
            territoryInput.value = "";
            return;
          }
          draft.territories.push(canonical);
          territoryInput.value = "";
          paint();
        };
        territoryInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
        });
        territoryInput.addEventListener("change", commit);
      }
      // Chip ×
      root.querySelectorAll("[data-territory-remove]").forEach(b => {
        b.addEventListener("click", () => {
          const idx = parseInt(b.getAttribute("data-territory-remove"));
          draft.territories.splice(idx, 1);
          paint();
        });
      });

      // Reminders — × removes, "+ Add reminder" composer adds. Operates on
      // draft.reminders (persisted to state.renewalSchedule on save).
      root.querySelectorAll("[data-reminder-remove]").forEach(b => {
        b.addEventListener("click", () => {
          const id = b.getAttribute("data-reminder-remove");
          draft.reminders = (draft.reminders || []).filter(x => x.id !== id);
          paint();
        });
      });
      const addBtn = root.querySelector("[data-reminder-add]");
      if (addBtn) addBtn.addEventListener("click", () => {
        openReminderModal({ termEnd: draft.termEnd }, (newReminder) => {
          draft.reminders = draft.reminders || [];
          const matches = draft.reminders.some(r => {
            if (newReminder.monthsBefore && r.monthsBefore === newReminder.monthsBefore) return true;
            if (newReminder.customDate) {
              const d = reminderDate(r.monthsBefore, { termEnd: draft.termEnd });
              return d && d.toISOString().slice(0,10) === newReminder.customDate;
            }
            return false;
          });
          if (matches) { STEApp.toast("Reminder already exists for that date", "warn"); return; }
          draft.reminders.push(newReminder);
          draft.reminders.sort((a, b) => b.monthsBefore - a.monthsBefore);
          paint();
        });
      });
    }

    // Highlight the offending field, scroll it into view, and put an inline
    // error message right under it. Returns true so callers can `return` early.
    function flagFieldError(fieldKey, message) {
      // Clear any previously-flagged errors first.
      root.querySelectorAll(".ste-input-error").forEach(el => el.classList.remove("ste-input-error"));
      root.querySelectorAll(".ste-inline-error").forEach(el => el.remove());

      const input = root.querySelector(`[data-f="${fieldKey}"]`);
      const target = input || root.querySelector(`[data-section="${fieldKey}"]`) || root.querySelector(".ste-form-card");
      if (input) {
        input.classList.add("ste-input-error");
        const field = input.closest(".ste-field") || input.parentElement;
        if (field) {
          const err = document.createElement("div");
          err.className = "ste-inline-error";
          err.textContent = message;
          field.appendChild(err);
        }
      } else if (target) {
        const err = document.createElement("div");
        err.className = "ste-inline-error";
        err.textContent = message;
        target.insertBefore(err, target.firstChild);
      }

      // Scroll into view below the sticky header pair.
      if (target) {
        const sectionHd = root.querySelector(".ste-section-hd");
        const globalHd = document.querySelector(".header");
        const stickyH = (globalHd?.offsetHeight || 56) + (sectionHd?.offsetHeight || 100);
        const desiredTop = window.scrollY + target.getBoundingClientRect().top - stickyH - 16;
        window.scrollTo({ top: Math.max(0, desiredTop), behavior: "smooth" });
        if (input) setTimeout(() => input.focus({ preventScroll: true }), 350);
      }
      STEApp.toast(message, "warn");
      return true;
    }

    function saveDraft(d) {
      if (!d.licenseeId) return flagFieldError("licenseeId", "Pick a licensee first");
      if (!d.termStart) return flagFieldError("termStart", "Term start is required");
      if (!d.termEnd) return flagFieldError("termEnd", "Term end is required");
      if (!d.exclusivity) return flagFieldError("exclusivity", "Set exclusivity for the master license");
      if (!d.territories || !d.territories.length) return flagFieldError("territories", "Add at least one territory");
      if (!d.productCategories || !d.productCategories.length) return flagFieldError("productCategories", "Select at least one product category");
      const lic = lics.find(l => l.id === d.licenseeId);
      const usingEur = d.currency === "EUR";
      const fields = {
        licenseeId: d.licenseeId,
        type: d.type,
        signedAt: d.signedAt,
        termStart: d.termStart,
        termEnd: d.termEnd,
        renewalOption: d.renewalOption,
        royaltyPct: d.royaltyPct,
        marketingPct: d.marketingPct,
        advertisingPct: d.advertisingPct,
        paymentTerms: `${d.paymentNet} · ${d.paymentFrequency}`,
        paymentNet: d.paymentNet,
        paymentFrequency: d.paymentFrequency,
        exclusivity: d.exclusivity,
        territories: [...(d.territories || [])],
        productCategories: [...(d.productCategories || [])],
        distributionChannels: [...(d.distributionChannels || [])],
        subLicensing: d.subLicensing,
        rightOfFirstRefusal: d.rightOfFirstRefusal,
        sellOffPeriodDays: d.sellOffPeriodDays,
        counterpartyName: d.counterpartyName,
        counterpartyTitle: d.counterpartyTitle,
        description: d.description,
        notes: d.notes,
        succeedsContractId: d.succeedsContractId || null,
      };

      if (isEditMode) {
        // Update the existing contract in place; preserve status, amendments, and id.
        STE.mutate(s => {
          const c = (s.contracts || []).find(x => x.id === editId);
          if (!c) return;
          Object.assign(c, fields);
          // Clear stale currency-specific minimums, then write new ones.
          delete c.minQuarterlyEur; delete c.minAnnualEur;
          delete c.minQuarterlyGbp; delete c.minAnnualGbp;
          if (usingEur) { c.minQuarterlyEur = d.minQuarterly; c.minAnnualEur = d.minAnnual; }
          else { c.minQuarterlyGbp = d.minQuarterly; c.minAnnualGbp = d.minAnnual; }
          s.renewalSchedule = s.renewalSchedule || {};
          s.renewalSchedule[editId] = { reminders: (d.reminders || defaultReminders()).map(r => ({ ...r })) };
          s.auditLog = s.auditLog || [];
          if (counterPropose) {
            // Counter-propose path. Flip the status to the other party's
            // court, push a versioned offer/counter onto the negotiation
            // thread with the new terms snapshot, and audit it.
            const me = STE.currentUser() || {};
            const isHQUser = !!STE.isHQ(me);
            const licRec = (s.licensees || []).find(l => l.id === c.licenseeId) || {};
            c.status = isHQUser ? "Terms Sent" : "Terms Updated";
            s.negotiationThreads = s.negotiationThreads || [];
            let t = s.negotiationThreads.find(x => x.contractId === editId);
            if (!t) { t = { contractId: editId, messages: [] }; s.negotiationThreads.push(t); }
            const sameSideCount = (t.messages || []).filter(m => m.side === (isHQUser ? "fnf" : "licensee")).length;
            const nextVersion = sameSideCount + 1;
            const termsSnapshot = {
              royaltyPct: c.royaltyPct,
              marketingPct: c.marketingPct,
              termYears: c.termStart && c.termEnd ? Math.round((new Date(c.termEnd) - new Date(c.termStart)) / 31557600000) : 5,
            };
            if (usingEur) termsSnapshot.minQuarterlyEur = d.minQuarterly;
            else termsSnapshot.minQuarterlyGbp = d.minQuarterly;
            t.messages.push({
              author: me.name || "—",
              role: isHQUser ? `HQ ${me.title || ''}` : `${licRec.legalName || c.licenseeId} · ${me.title || ''}`,
              at: new Date().toISOString(),
              offerType: isHQUser ? "offer" : "counter",
              version: nextVersion,
              side: isHQUser ? "fnf" : "licensee",
              terms: termsSnapshot,
              body: isHQUser ? `Revised offer v${nextVersion} sent.` : `Counter-proposal v${nextVersion} sent.`,
            });
            s.auditLog.unshift({
              at: new Date().toISOString(),
              event: isHQUser
                ? `HQ sent revised terms v${nextVersion}`
                : `${licRec.legalName || c.licenseeId} sent revised terms v${nextVersion}`,
              actor: me.name || "—",
              contractId: editId,
            });
          } else {
            s.auditLog.unshift({
              at: new Date().toISOString(),
              event: `Agreement edited`,
              actor: (STE.currentUser() || {}).name || "HQ Reviewer",
              contractId: editId,
            });
          }
        });
        STEApp.toast(counterPropose ? `Counter-proposal sent` : `Agreement ${editId} saved`, "success");
        STE.setSession({ ...STE.getSession(), viewLicenseeId: d.licenseeId, viewContractId: editId });
        location.hash = `#/agreements/details/view/${editId}`;
        return;
      }

      // Generate agreement ID in canonical AGR-{YYYY}-{NNN} format, scoped
      // per drafting year so each year gets its own NNN sequence. Mirrors
      // the existing seed IDs (AGR-2022-001, AGR-2026-003, etc.).
      const draftYear = String(new Date().getFullYear());
      const yearRe = new RegExp(`^AGR-${draftYear}-(\\d+)$`);
      const existing = (state.contracts || [])
        .map(c => (c.id || "").match(yearRe))
        .filter(Boolean)
        .map(m => parseInt(m[1]));
      const nextSeq = (existing.length ? Math.max(...existing) : 0) + 1;
      const newId = `AGR-${draftYear}-${String(nextSeq).padStart(3, "0")}`;
      const newContract = {
        id: newId,
        ...fields,
        status: "Draft",
        amendments: [],
      };
      if (usingEur) {
        newContract.minQuarterlyEur = d.minQuarterly;
        newContract.minAnnualEur = d.minAnnual;
      } else {
        newContract.minQuarterlyGbp = d.minQuarterly;
        newContract.minAnnualGbp = d.minAnnual;
      }
      STE.mutate(s => {
        s.contracts = s.contracts || [];
        s.contracts.push(newContract);
        s.renewalSchedule = s.renewalSchedule || {};
        s.renewalSchedule[newId] = { reminders: (d.reminders || defaultReminders()).map(r => ({ ...r })) };
        s.auditLog = s.auditLog || [];
        s.auditLog.unshift({
          at: new Date().toISOString(),
          event: `${d.type} draft created`,
          actor: (STE.currentUser() || {}).name || "HQ Reviewer",
          contractId: newId,
          attachment: `${newId}.draft`,
        });
      });
      STEApp.toast(`${d.type} draft created for ${lic.legalName} — ${newId}`, "success");
      location.hash = `#/agreements`;
    }

    paint();
  }

  function contracts() {
    const root = PAGE_MAIN("agreements");
    if (!root) return;
    const session = STE.getSession() || {};
    const u = STE.currentUser();
    const isHQ = u && STE.isHQ(u);

    // HQ default: keep the list table — it IS the "filter what you need" view.
    // Sub-route #/agreements/details/<agreementId> opens that exact agreement.
    // Legacy: a licensee id resolves to the most recent contract for them.
    // Sub-route #/agreements/new opens the agreement form. HQ always allowed.
    // Licensees are allowed when they're counter-proposing their own contract
    // (flag set by the Counter-Propose button on the detail page).
    const sub = contractsSubRoute();
    if (sub === "new" && (isHQ || (_agreementCounterPropose && _agreementEditId))) { renderAgreementDraft(root); return; }
    // Both HQ and licensees get the list page; contractsList() scopes the data
    // by role so a licensee only ever sees their own agreements.
    if (!sub) { contractsList(); return; }
    {
      const allContracts = STE.get().contracts || [];
      const subContract = allContracts.find(c => c.id === sub);
      // Licensee can't deep-link into an HQ Draft — bounce them back to the
      // list (which already filters Drafts out of their view).
      if (!isHQ && subContract && subContract.status === "Draft") {
        location.replace("#/agreements");
        return;
      }
      if (isHQ) {
        if (subContract) {
          STE.setSession({ ...STE.getSession(), viewLicenseeId: subContract.licenseeId, viewContractId: subContract.id });
        } else {
          // Legacy licensee-id form: resolves via STE.selectors().contract(lic.id)
          // in the fallback path below.
          STE.setSession({ ...STE.getSession(), viewLicenseeId: sub, viewContractId: null });
        }
      } else {
        // Licensee: only pin the contract when it's their own; a foreign id
        // falls back to their own master via the resolver below.
        STE.setSession({ ...STE.getSession(), viewContractId: (subContract && subContract.licenseeId === u.licenseeId && subContract.status !== "Draft") ? subContract.id : null });
      }
    }

    const lic = STE.currentLicensee();
    // Prefer the specific contract id the user clicked (stashed in session
    // by the list-row handler); fall back to "first contract for this
    // licensee" for direct URL access.
    const sess = STE.getSession() || {};
    let contract = null;
    if (sess.viewContractId) {
      const vid = sess.viewContractId;
      const allContracts = STE.get().contracts || [];
      // Exact match first (separately-saved sub-contract records use their own id)
      contract = allContracts.find(c => c.id === vid && c.licenseeId === lic.id);
      // Legacy embedded amendment / extension ids look like "<parentId>.N" or "<parentId>.E".
      // Resolve to the parent master so the same lifecycle page renders.
      if (!contract) {
        const dot = vid.lastIndexOf(".");
        if (dot > 0) {
          const parentId = vid.slice(0, dot);
          contract = allContracts.find(c => c.id === parentId && c.licenseeId === lic.id);
        }
      }
    }
    if (!contract) contract = STE.selectors().contract(lic.id);
    // Per-user "new" dot — clear once this user opens the agreement.
    if (contract && contract.id) {
      try { window.STEUnread && STEUnread.markSeen("agreement", contract.id); } catch (_) {}
    }
    if (!contract) {
      // No contract on file → show an empty-state with a draft-it CTA.
      root.innerHTML = `
        <div class="ste-screen-pad">
          <div class="ste-section-hd">
            <div class="ste-page-crumbs">
              <a href="#/home">Home</a><span class="sep">/</span><a href="#/agreements">Agreements</a><span class="sep">/</span><span class="cur">${escape(lic.legalName)}</span>
            </div>
            <h1>${escape(lic.legalName)} — No Agreement on File</h1>
            <p>${isHQ ? `${escape(lic.legalName)} has no Master Licence saved yet. Start a new draft from the Agreements list.` : `No Master Licence is on file yet. Sergio Tacchini will share your agreement here once it is issued.`}</p>
          </div>
          ${isHQ ? `<div class="ste-card"><div class="ste-card-body">
            <a class="ste-btn ste-btn-primary" href="#/agreements/new">+ Create New Agreement</a>
          </div></div>` : ''}
        </div>`;
      return;
    }
    const thread = STE.selectors().negotiationThread(contract.id);
    const audit = STE.selectors().auditLog(contract.id);
    const renewalSched = STE.selectors().renewalSchedule(contract.id);
    const daysToExpiry = Math.round((new Date(contract.termEnd) - new Date()) / 86400000);

    const lics = STE.get().licensees;

    // Renewal Workspace markup — placed at TOP of the page when status is
    // Negotiating (the thread is the active workstream), and below the terms
    // cards otherwise (Draft / renewal window opened on Active).
    const _status = (contract.status || "").toLowerCase();
    const _inNegotiation = (_status === "terms sent" || _status === "terms updated");
    const _showRenewal = (_inNegotiation || _status === "draft" || sess.renewalOpen === contract.id);
    const renewalWorkspaceHtml = !_showRenewal ? '' : `
      ${renderRenewalTimeline(renewalSched, contract, daysToExpiry)}
      ${renderRenewalVerdict(renewalSched, contract, lic)}
      ${_status === "draft" ? `
        <div class="ste-card">
          <div class="ste-card-head"><h3>Negotiation</h3><div class="ste-mini">아직 협상이 시작되지 않았습니다.</div></div>
          <div class="ste-card-body">
            <div class="ste-negotiation-start">
              <div>
                <strong>Start the negotiation when terms are ready.</strong>
                <div class="ste-mini">Sends an opening notification to <strong>${escape(contract.counterpartyName || lic.legalName)}</strong> at the licensee, and opens a versioned thread for offers / counters.</div>
              </div>
              <button class="ste-btn ste-btn-primary" data-act="start-negotiation">Start Negotiation</button>
            </div>
          </div>
        </div>
      ` : `
        <div class="ste-card">
          <div class="ste-card-head">
            <h3>Negotiation Thread</h3>
            <div class="ste-mini">${thread.messages.length} versioned exchanges · HQ Offer ↔ Licensee Counter</div>
          </div>
          <div class="ste-thread">
            ${thread.messages.length === 0
              ? `<div class="ste-mini" style="padding:14px 4px;color:var(--ste-muted)">Negotiation started — waiting for the first offer.</div>`
              : thread.messages.map((m, i) => renderOfferMsg(m, i, thread.messages, contract)).join("")}
          </div>
          <div class="ste-thread-send">
            <textarea id="ste-msg-input" placeholder="Add a note to the counterparty…" rows="2"></textarea>
            <div class="ste-thread-send-row">
              <button class="ste-btn ste-btn-primary" id="ste-msg-send">Send Note</button>
            </div>
          </div>
        </div>
      `}
    `;

    root.innerHTML = `
      <div class="ste-screen-pad">
        <div class="ste-section-hd">
          <div class="ste-page-crumbs">
            <a href="#/${STE.isHQ() ? 'hq' : 'home'}">Home</a><span class="sep">/</span>
            ${isHQ ? `<a href="#/agreements">Agreements</a><span class="sep">/</span><span class="cur">${escape(contract.id || lic.legalName)}</span>` : `<span class="cur">${escape(contract.id || 'Agreement')}</span>`}
          </div>
          <div class="ste-page-hd-row">
            <div>
              <h1>${escape(contract.id || lic.legalName)}</h1>
              ${(contract.id && isHQ) ? `<p class="ste-page-subtitle">${escape(lic.legalName)}${contract.type ? ' · ' + escape(contract.type) : ''}</p>` : ''}
            </div>${(() => {
              // Mirror the list-view derivation: if the term has lapsed,
              // always show "Expired" — regardless of any stale "Renewed"
              // / "Active" string persisted in the seed. Old saved status
              // shouldn't outrank the date check.
              let _hdrSt = contract.status || "Active";
              if (contract.termEnd) {
                const _daysLeft = Math.ceil((new Date(contract.termEnd) - new Date()) / 86400000);
                if (_daysLeft < 0) _hdrSt = "Expired";
              }
              const st = _hdrSt;
              const stLower = st.toLowerCase();
              // Audience-aware tone for the negotiation statuses: warn only
              // when it's the viewer's turn, info otherwise. Keeps the page
              // from reading as if HQ has work on a Terms Sent agreement
              // they themselves just pushed out.
              const tone = stLower === "active" ? "ok"
                         : stLower === "terms sent" ? (isHQ ? "info" : "warn")
                         : stLower === "terms updated" ? (isHQ ? "warn" : "info")
                         : stLower === "expired" ? "neutral"
                         : stLower === "draft" ? "neutral"
                         : "info";
              // Turn semantics: "Terms Sent" = HQ just pushed terms, licensee
              // owes a response. "Terms Updated" = licensee just countered,
              // HQ owes a response. Whoever owns the turn sees both CTAs;
              // the other side just reads the latest.
              const myTurn = (stLower === "terms sent" && !isHQ)
                          || (stLower === "terms updated" && isHQ);
              const ctaButtons = [];
              const inFlight = stLower === "terms sent" || stLower === "terms updated";
              if (isHQ && stLower === "draft") {
                ctaButtons.push(`<button class="ste-btn ste-btn-ghost" data-act="edit-agreement" type="button">Edit Agreement</button>`);
                ctaButtons.push(`<button class="ste-btn ste-btn-primary" data-act="send-to-licensee" type="button">Send to Licensee</button>`);
              } else if (myTurn) {
                // Reject / Accept as a paired button group. "Reject" opens
                // the agreement edit page (same as the old Counter-Propose
                // path) so the viewer can adjust the terms and send a
                // counter — semantically "I reject the current terms,
                // here's mine". "Accept" lifts the latest thread terms
                // onto the contract and signs it.
                ctaButtons.push(`<div class="ste-btn-group" role="group" aria-label="Decision">
                  <button class="ste-btn ste-btn-ghost" data-act="counter-propose" type="button">Reject</button>
                  <button class="ste-btn ste-btn-primary" data-act="accept-terms" type="button">Accept</button>
                </div>`);
              } else if (isHQ && !inFlight) {
                ctaButtons.push(`<button class="ste-btn ste-btn-ghost" data-act="edit-agreement" type="button">Edit Agreement</button>`);
              }
              return `<div class="ste-hd-cta" style="display:flex;align-items:center;gap:10px">
                <a class="ste-btn ste-btn-ghost ste-btn-cancel" href="#/agreements" data-back-list>Back</a>
                <span class="ste-badge ste-badge-${tone}">${escape(st)}</span>
                ${ctaButtons.join("")}
              </div>`;
            })()}
          </div>
        </div>

        ${(() => {
          const status = (contract.status || "").toLowerCase();
          if (status === "draft" && isHQ) {
            return `<div class="ste-renewal-banner">
              <div>
                <strong>Internal draft</strong>
                <div class="ste-mini">Not visible to ${escape(lic.legalName)} yet. Send to licensee when terms are ready for their review.</div>
              </div>
            </div>`;
          }
          // Terms Sent → HQ just pushed terms, licensee owes a response.
          if (status === "terms sent") {
            return isHQ
              ? `<div class="ste-renewal-banner">
                  <div>
                    <strong>Awaiting licensee response</strong>
                    <div class="ste-mini">Latest terms sent to ${escape(lic.legalName)}. They can accept or counter-propose with revised terms.</div>
                  </div>
                </div>`
              : `<div class="ste-renewal-banner">
                  <div>
                    <strong>Your turn — Sergio Tacchini has proposed terms</strong>
                    <div class="ste-mini">Review the terms below. Accept to sign, or counter-propose with the changes you need.</div>
                  </div>
                </div>`;
          }
          // Terms Updated → licensee just countered, HQ owes a response.
          if (status === "terms updated") {
            return isHQ
              ? `<div class="ste-renewal-banner">
                  <div>
                    <strong>Your turn — ${escape(lic.legalName)} sent revised terms</strong>
                    <div class="ste-mini">Review the counter-proposal below. Accept to sign, or counter-propose with your own revisions.</div>
                  </div>
                </div>`
              : `<div class="ste-renewal-banner">
                  <div>
                    <strong>Awaiting Sergio Tacchini response</strong>
                    <div class="ste-mini">Your revised terms are with HQ. They can accept or send back another counter-proposal.</div>
                  </div>
                </div>`;
          }
          // Renewal banner — only when Active AND inside 180-day window AND
          // not already negotiating.
          if (status === "active" && daysToExpiry < 180 && daysToExpiry > 0) {
            return `
              <div class="ste-renewal-banner">
                <div>
                  <strong>Renewal window open · D-${daysToExpiry}</strong>
                  <div class="ste-mini">${escape(contract.id)} term ends ${escape(fmtDate(contract.termEnd))}. Start the renewal process to open the negotiation workspace, AI recommendations, and reminders.</div>
                </div>
                <button class="ste-btn ste-btn-primary" data-act="open-renewal-workspace">Start Renewal Process</button>
              </div>`;
          }
          return '';
        })()}

        ${_inNegotiation ? renewalWorkspaceHtml : ''}

        ${isHQ ? `
        <div class="ste-card">
          <div class="ste-card-head"><h3>Counterparty</h3></div>
          <div class="ste-card-body">
            <div class="ste-form-grid-2">
              <div class="ste-field" style="grid-column: 1 / -1">
                <div class="ste-lbl">Licensee</div>
                <div class="ste-view-val">${escape(lic.legalName)}</div>
              </div>
              <div class="ste-field">
                <div class="ste-lbl">Counterparty Name</div>
                <div class="ste-view-val">${escape(contract.counterpartyName || '—')}</div>
              </div>
              <div class="ste-field">
                <div class="ste-lbl">Counterparty Title</div>
                <div class="ste-view-val">${escape(contract.counterpartyTitle || '—')}</div>
              </div>
            </div>
          </div>
        </div>` : ''}

        <div class="ste-card">
          <div class="ste-card-head"><h3>Agreement</h3></div>
          <div class="ste-card-body">
            <div class="ste-form-grid-2">
              <div class="ste-field">
                <div class="ste-lbl">Agreement ID</div>
                <div class="ste-view-val">${escape(contract.id)}</div>
              </div>
              <div class="ste-field">
                <div class="ste-lbl">Status</div>
                <div class="ste-view-val">${escape(contract.status || 'Active')}</div>
              </div>
              <div class="ste-field">
                <div class="ste-lbl">Country</div>
                <div class="ste-view-val">${escape(lic.country || (lic.address && lic.address.country) || '—')}</div>
              </div>
              ${contract.succeedsContractId ? `
              <div class="ste-field">
                <div class="ste-lbl">Renews</div>
                <div class="ste-view-val">${escape(contract.succeedsContractId)}</div>
              </div>` : ''}
            </div>
          </div>
        </div>

        <div class="ste-card">
          <div class="ste-card-head"><h3>Terms</h3></div>
          <div class="ste-card-body">
            <div class="ste-form-subhd">Effective Period</div>
            <div class="ste-form-grid-2">
              <div class="ste-field">
                <div class="ste-lbl">Term Start</div>
                <div class="ste-view-val">${escape(fmtDate(contract.termStart))}</div>
              </div>
              <div class="ste-field">
                <div class="ste-lbl">Term End</div>
                <div class="ste-view-val">${escape(fmtDate(contract.termEnd))}</div>
              </div>
              <div class="ste-field" style="grid-column: 1 / -1">
                <div class="ste-lbl">Renewal Option</div>
                <div class="ste-view-val">${escape(contract.renewalOption || '—')}</div>
              </div>
              <div class="ste-field" style="grid-column: 1 / -1">
                <div class="ste-lbl">Signed Date</div>
                <div class="ste-view-val">${escape(fmtDate(contract.signedAt))}</div>
              </div>
            </div>

            <div class="ste-form-subhd">Financial</div>
            <div class="ste-form-grid-2">
              <div class="ste-field">
                <div class="ste-lbl">Reporting Currency</div>
                <div class="ste-view-val">${escape(lic.currency)}</div>
              </div>
              <div class="ste-field">
                <div class="ste-lbl">Category</div>
                <div class="ste-view-val">${escape(lic.categories.join(" · "))}</div>
              </div>
              <div class="ste-field">
                <div class="ste-lbl">Royalty %</div>
                <div class="ste-view-val">${contract.royaltyPct}%</div>
              </div>
              <div class="ste-field">
                <div class="ste-lbl">Marketing Contribution %</div>
                <div class="ste-view-val">${contract.marketingPct}%</div>
              </div>
              <div class="ste-field">
                <div class="ste-lbl">Advertising Spend %</div>
                <div class="ste-view-val">${contract.advertisingPct}%</div>
              </div>
              <div class="ste-field">
                <div class="ste-lbl">Minimum / Quarter</div>
                <div class="ste-view-val">${contract.minQuarterlyGbp ? gbp0(contract.minQuarterlyGbp) : '€'+(contract.minQuarterlyEur||0).toLocaleString()}</div>
              </div>
              <div class="ste-field">
                <div class="ste-lbl">Minimum / Year</div>
                <div class="ste-view-val">${contract.minAnnualGbp ? gbp0(contract.minAnnualGbp) : '€'+(contract.minAnnualEur||0).toLocaleString()}</div>
              </div>
              <div class="ste-field">
                <div class="ste-lbl">Payment Terms</div>
                <div class="ste-view-val">${escape(contract.paymentTerms || '—')}</div>
              </div>
            </div>
          </div>
        </div>

        ${renderLicenseScopeFields(contract)}

        ${renderAgreementExtensions(contract)}

        ${contract.description ? `
        <div class="ste-card">
          <div class="ste-card-head"><h3>Description</h3></div>
          <div class="ste-card-body">
            <div class="ste-view-val ste-view-val-multiline">${escape(contract.description)}</div>
          </div>
        </div>` : ''}

        <div class="ste-card">
          <div class="ste-card-head">
            <h3>Attachments</h3>
            <button class="ste-btn ste-btn-ghost ste-btn-mini" data-act="upload-attachment" type="button" style="margin-left:auto">+ Upload</button>
          </div>
          <div class="ste-card-body">
            ${(() => {
              const _isActive = (contract.status || "").toLowerCase() === "active";
              const _userAtts = contract.attachments || [];
              const _historyAtts = (thread.messages || []).filter(m => m.attachment).map(m => ({
                name: m.attachment,
                kind: "history",
                at: m.at,
                actor: m.author,
              }));
              const _all = [..._userAtts, ..._historyAtts];
              if (!_isActive && _all.length === 0) {
                return `<div class="ste-mini" style="color:var(--ste-muted);padding:8px 4px">No attachments yet. Use <strong>+ Upload</strong> to add supporting documents, or attach a file when posting a comment in History — both flow here.</div>`;
              }
              return `<ul class="ste-doc-list">
                ${_isActive ? `<li><a class="ste-doc-link" href="#" onclick="return false"><span class="ste-doc-icon">📄</span><span><strong>${escape(contract.id)}_master_agreement.pdf</strong><div class="ste-mini">Signed ${escape(fmtDate(contract.signedAt))} · ${escape(contract.counterpartyName || '—')}${contract.counterpartyTitle ? ' (' + escape(contract.counterpartyTitle) + ')' : ''}</div></span></a></li>` : ''}
                ${(contract.amendments || []).map((a, i) => `
                  <li><a class="ste-doc-link" href="#" onclick="return false"><span class="ste-doc-icon">📑</span><span><strong>${escape(contract.id)}_amendment_${i+1}.pdf</strong><div class="ste-mini">${escape(a.title || 'Amendment')} · ${escape(fmtDate(a.date))} · ${escape(a.actor || '')}</div></span></a></li>`).join("")}
                ${_userAtts.map(a => `
                  <li><a class="ste-doc-link" href="#" onclick="return false"><span class="ste-doc-icon">📎</span><span><strong>${escape(a.name)}</strong><div class="ste-mini">Uploaded ${escape(fmtDate(a.at))} · ${escape(a.actor || '')}</div></span></a></li>`).join("")}
                ${_historyAtts.map(a => `
                  <li><a class="ste-doc-link" href="#" onclick="return false"><span class="ste-doc-icon">📎</span><span><strong>${escape(a.name)}</strong><div class="ste-mini">From History · ${escape(fmtDate(a.at))} · ${escape(a.actor || '')}</div></span></a></li>`).join("")}
              </ul>`;
            })()}
          </div>
        </div>

        ${isHQ ? `
        <div class="ste-card">
          <div class="ste-card-head">
            <h3>Notes</h3>
          </div>
          <div class="ste-card-body">
            <textarea class="ste-input" rows="3" data-contract-notes placeholder="Add internal notes (visible to HQ only)…">${escape(contract.notes || '')}</textarea>
            <div style="display:flex;justify-content:flex-end;margin-top:8px">
              <button class="ste-btn ste-btn-ghost ste-btn-mini" data-act="save-notes">Save note</button>
            </div>
          </div>
        </div>` : ''}

        ${!_inNegotiation ? renewalWorkspaceHtml : ''}

        <div class="ste-card">
          <div class="ste-card-head"><h3>History</h3></div>
          <div class="ste-card-body">
            <div class="ste-comment-compose" style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px">
              <textarea class="ste-input" id="ste-history-comment" rows="2" placeholder="Add a comment…"></textarea>
              <div style="display:flex;align-items:center;gap:8px;justify-content:flex-end">
                <input type="file" id="ste-history-attach" style="display:none" multiple>
                <button class="ste-btn ste-btn-ghost ste-btn-mini" data-act="attach-comment" type="button">📎 Attach file</button>
                <span class="ste-mini" data-history-attach-list style="color:var(--ste-muted)"></span>
                <button class="ste-btn ste-btn-primary" data-act="post-comment" type="button">Post</button>
              </div>
            </div>
            <ul class="ste-history">
              ${(() => {
                const orgLabelFor = (actor, role) => {
                  if (role) return role;
                  // No explicit role on audit entries — infer from the actor.
                  // HQ staff names live in users[] without a licenseeId.
                  const allUsers = STE.get().users || [];
                  const matchUser = allUsers.find(usr => usr.name === actor);
                  if (matchUser) {
                    if (!matchUser.licenseeId) return "HQ Global Operations";
                    const orgLic = (STE.get().licensees || []).find(l => l.id === matchUser.licenseeId);
                    return orgLic ? orgLic.legalName : matchUser.licenseeId;
                  }
                  return "HQ Global Operations";
                };
                const items = [
                  ...audit.map(e => ({ at: e.at, kind: "audit", body: e.event, actor: e.actor, attachment: e.attachment })),
                  ...(thread.messages || []).map(m => ({ at: m.at, kind: m.offerType ? "offer" : (m.kind === 'comment' ? 'comment' : 'note'), body: m.body, actor: m.author, role: m.role })),
                ].sort((a, b) => (b.at || "").localeCompare(a.at || ""));
                return items.length === 0
                  ? `<li class="ste-history-empty"><span class="ste-mini">No history yet.</span></li>`
                  : items.map(it => `
                    <li class="ste-history-item ste-history-${it.kind}">
                      <div class="ste-history-marker"></div>
                      <div class="ste-history-body">
                        <div class="ste-history-hd">
                          <strong>${escape(it.actor || '—')}</strong>
                          <span class="ste-mini">${escape(orgLabelFor(it.actor, it.role))}</span>
                          <span class="ste-mini">· ${escape(fmtDateTime(it.at))}</span>
                        </div>
                        <div class="ste-history-body-text">${escape(it.body || '')}</div>
                        ${it.attachment ? `<a class="ste-history-attach">📎 ${escape(it.attachment)}</a>` : ''}
                      </div>
                    </li>`).join("");
              })()}
            </ul>
          </div>
        </div>
      </div>`;

    document.title = `${lic.legalName} · Agreement · Sergio Tacchini`;

    const sendBtn = $("#ste-msg-send", root);
    const input = $("#ste-msg-input", root);
    if (sendBtn && input) {
      sendBtn.addEventListener("click", () => {
        const body = input.value.trim();
        if (!body) return;
        STE.mutate(s => {
          const t = (s.negotiationThreads || []).find(x => x.contractId === contract.id);
          const m = {
            author: u.name, role: STE.isHQ(u) ? `HQ ${u.title}` : `${lic.legalName} · ${u.title || ''}`,
            at: new Date().toISOString(), body
          };
          if (t) t.messages.push(m);
          else s.negotiationThreads = [{ contractId: contract.id, messages: [m] }];
        });
        input.value = "";
        contracts();
      });
    }

    const newOfferBtn = $("#ste-msg-new-offer", root);
    if (newOfferBtn) newOfferBtn.addEventListener("click", () => openNewOfferModal(contract, thread, lic, isHQ, u));

    // Edit Agreement — pre-fill the draft form with this contract's data and
    // route to #/contracts/new in edit mode.
    const editAgreementBtn = root.querySelector("[data-act='edit-agreement']");
    if (editAgreementBtn) editAgreementBtn.addEventListener("click", () => {
      _agreementEditId = contract.id;
      _agreementDraftPrefill = {
        type: contract.type || "Master License",
        licenseeId: contract.licenseeId,
        succeedsContractId: contract.succeedsContractId || "",
        termStart: contract.termStart,
        termEnd: contract.termEnd,
        renewalOption: contract.renewalOption,
        royaltyPct: contract.royaltyPct,
        marketingPct: contract.marketingPct,
        advertisingPct: contract.advertisingPct,
        currency: contract.minQuarterlyEur != null && contract.minQuarterlyGbp == null ? "EUR" : (lic.currency || "GBP"),
        minQuarterly: contract.minQuarterlyGbp || contract.minQuarterlyEur || "",
        minAnnual: contract.minAnnualGbp || contract.minAnnualEur || "",
        paymentNet: contract.paymentNet || "Net 30",
        paymentFrequency: contract.paymentFrequency || "Quarterly",
        counterpartyName: contract.counterpartyName,
        counterpartyTitle: contract.counterpartyTitle,
        signedAt: contract.signedAt,
        description: contract.description || "",
        notes: contract.notes || "",
        exclusivity: contract.exclusivity || "",
        territories: [...(contract.territories || [])],
        productCategories: [...(contract.productCategories || [])],
        distributionChannels: [...(contract.distributionChannels || [])],
        subLicensing: contract.subLicensing || "Not permitted",
        rightOfFirstRefusal: contract.rightOfFirstRefusal !== false,
        sellOffPeriodDays: contract.sellOffPeriodDays || 180,
      };
      location.hash = "#/agreements/new";
    });

    // History attach-file. Stashes the picked filenames on the compose row
    // so the next "Post" picks them up. Files don't actually upload —
    // prototype just records the filename and flows it through to the
    // Attachments card via the negotiation-thread message record.
    const attachInput = root.querySelector("#ste-history-attach");
    const attachListEl = root.querySelector("[data-history-attach-list]");
    let _pendingAttach = [];
    const _renderPending = () => {
      if (!attachListEl) return;
      attachListEl.textContent = _pendingAttach.length
        ? `${_pendingAttach.length} file${_pendingAttach.length === 1 ? '' : 's'} ready`
        : '';
    };
    root.querySelector("[data-act='attach-comment']")?.addEventListener("click", () => {
      attachInput?.click();
    });
    attachInput?.addEventListener("change", () => {
      _pendingAttach = Array.from(attachInput.files || []).map(f => f.name);
      _renderPending();
    });

    // Post comment to history. If files were attached, they get added to
    // the Attachments card AND show on the comment row as a chip.
    const postCommentBtn = root.querySelector("[data-act='post-comment']");
    if (postCommentBtn) postCommentBtn.addEventListener("click", () => {
      const ta = root.querySelector("#ste-history-comment");
      const body = (ta?.value || "").trim();
      if (!body && _pendingAttach.length === 0) return;
      STE.mutate(s => {
        s.negotiationThreads = s.negotiationThreads || [];
        let t = s.negotiationThreads.find(x => x.contractId === contract.id);
        if (!t) { t = { contractId: contract.id, messages: [] }; s.negotiationThreads.push(t); }
        // One thread message per uploaded file (so each has its own
        // attachment field and surfaces in the Attachments card). Text-only
        // comments get one row as before.
        if (_pendingAttach.length === 0) {
          t.messages.push({
            author: u.name,
            role: STE.isHQ(u) ? "HQ Global Operations" : lic.legalName,
            at: new Date().toISOString(),
            body,
            kind: "comment",
          });
        } else {
          _pendingAttach.forEach((name, i) => {
            t.messages.push({
              author: u.name,
              role: STE.isHQ(u) ? "HQ Global Operations" : lic.legalName,
              at: new Date().toISOString(),
              body: i === 0 ? body : '',
              kind: "comment",
              attachment: name,
            });
          });
        }
      });
      contracts();
    });

    // Attachments card — + Upload. Records the picked filename(s) onto the
    // contract.attachments array; surfaces on the Attachments card.
    root.querySelector("[data-act='upload-attachment']")?.addEventListener("click", () => {
      const inp = document.createElement("input");
      inp.type = "file"; inp.multiple = true;
      inp.addEventListener("change", () => {
        const names = Array.from(inp.files || []).map(f => f.name);
        if (!names.length) return;
        STE.mutate(s => {
          const c = (s.contracts || []).find(x => x.id === contract.id);
          if (!c) return;
          c.attachments = c.attachments || [];
          names.forEach(n => c.attachments.push({
            name: n,
            at: new Date().toISOString(),
            actor: u.name,
          }));
        });
        STEApp.toast(`${names.length} file${names.length === 1 ? '' : 's'} attached`, "success");
        contracts();
      });
      inp.click();
    });

    // Renewal banner — Start Renewal Process opens the New Agreement form
    // with terms prefilled from this contract (same flow as the row menu).
    const openRenewalBtn = root.querySelector("[data-act='open-renewal-workspace']");
    if (openRenewalBtn) openRenewalBtn.addEventListener("click", () => {
      _agreementDraftPrefill = buildPrefillFromRow({ contract, licensee: lic }, "Master License", { renewal: true });
      location.hash = "#/agreements/new";
    });

    // HQ: Send Draft → Terms Sent. Pushes the current draft terms across as
    // the opening offer (versioned v1) so the licensee sees what's on the
    // table the moment they open the agreement.
    root.querySelectorAll("[data-act='send-to-licensee']").forEach(btn => {
      btn.addEventListener("click", () => {
        STE.mutate(s => {
          const c = (s.contracts || []).find(x => x.id === contract.id);
          if (!c) return;
          c.status = "Terms Sent";
          s.negotiationThreads = s.negotiationThreads || [];
          let t = s.negotiationThreads.find(x => x.contractId === contract.id);
          if (!t) { t = { contractId: contract.id, messages: [] }; s.negotiationThreads.push(t); }
          t.messages.push({
            author: u.name,
            role: `HQ ${u.title || 'Reviewer'}`,
            at: new Date().toISOString(),
            offerType: "offer",
            version: 1,
            side: "fnf",
            terms: {
              royaltyPct: c.royaltyPct,
              minQuarterlyGbp: c.minQuarterlyGbp,
              minQuarterlyEur: c.minQuarterlyEur,
              marketingPct: c.marketingPct,
              termYears: c.termStart && c.termEnd ? Math.round((new Date(c.termEnd) - new Date(c.termStart)) / 31557600000) : 5,
            },
            body: `Opening offer sent to ${lic.legalName}.`,
          });
          s.auditLog = s.auditLog || [];
          s.auditLog.unshift({
            at: new Date().toISOString(),
            event: `Sent to ${lic.legalName} for review`,
            actor: u.name,
            contractId: contract.id,
          });
        });
        STEApp.toast(`${contract.id} sent to ${lic.legalName} for review`, "success");
        contracts();
      });
    });

    // Either party: Accept Terms → Active. Pulls the latest offer/counter
    // terms from the negotiation thread into the actual contract record so
    // what was accepted becomes the contract of record.
    root.querySelectorAll("[data-act='accept-terms']").forEach(btn => {
      btn.addEventListener("click", () => {
        STE.mutate(s => {
          const c = (s.contracts || []).find(x => x.id === contract.id);
          if (!c) return;
          // Lift latest offered/countered terms onto the contract.
          const t = (s.negotiationThreads || []).find(x => x.contractId === contract.id);
          const lastWithTerms = t && (t.messages || []).slice().reverse().find(m => m.terms);
          if (lastWithTerms && lastWithTerms.terms) {
            const T = lastWithTerms.terms;
            if (T.royaltyPct != null) c.royaltyPct = T.royaltyPct;
            if (T.marketingPct != null) c.marketingPct = T.marketingPct;
            if (T.minQuarterlyGbp != null) { c.minQuarterlyGbp = T.minQuarterlyGbp; c.minAnnualGbp = T.minQuarterlyGbp * 4; }
            if (T.minQuarterlyEur != null) { c.minQuarterlyEur = T.minQuarterlyEur; c.minAnnualEur = T.minQuarterlyEur * 4; }
          }
          c.status = "Active";
          c.acceptedAt = new Date().toISOString();
          c.acceptedBy = u.name;
          c.signedAt = c.signedAt || new Date().toISOString().slice(0, 10);
          s.auditLog = s.auditLog || [];
          s.auditLog.unshift({
            at: new Date().toISOString(),
            event: `Terms accepted by ${u.name} — agreement signed`,
            actor: u.name,
            contractId: contract.id,
          });
        });
        STEApp.toast(`Terms accepted — agreement active`, "success");
        contracts();
      });
    });

    // Either party: Counter-Propose → opens the agreement edit page (same
    // form used to draft the original) pre-filled with the current terms.
    // On Save, the form's save handler flips the status (HQ → "Terms Sent",
    // licensee → "Terms Updated"), pushes a versioned offer/counter onto
    // the negotiation thread with the new terms snapshot, and writes an
    // audit-log entry. Comments stay in the History card on this page.
    root.querySelectorAll("[data-act='counter-propose']").forEach(btn => {
      btn.addEventListener("click", () => {
        _agreementEditId = contract.id;
        _agreementCounterPropose = true;
        _agreementDraftPrefill = {
          type: contract.type || "Master License",
          licenseeId: contract.licenseeId,
          succeedsContractId: contract.succeedsContractId || "",
          termStart: contract.termStart,
          termEnd: contract.termEnd,
          renewalOption: contract.renewalOption,
          royaltyPct: contract.royaltyPct,
          marketingPct: contract.marketingPct,
          advertisingPct: contract.advertisingPct,
          currency: contract.minQuarterlyEur != null && contract.minQuarterlyGbp == null ? "EUR" : (lic.currency || "GBP"),
          minQuarterly: contract.minQuarterlyGbp || contract.minQuarterlyEur || "",
          minAnnual: contract.minAnnualGbp || contract.minAnnualEur || "",
          paymentNet: contract.paymentNet || "Net 30",
          paymentFrequency: contract.paymentFrequency || "Quarterly",
          counterpartyName: contract.counterpartyName,
          counterpartyTitle: contract.counterpartyTitle,
          signedAt: contract.signedAt,
          description: contract.description || "",
          notes: contract.notes || "",
          exclusivity: contract.exclusivity || "",
          territories: [...(contract.territories || [])],
          productCategories: [...(contract.productCategories || [])],
          distributionChannels: [...(contract.distributionChannels || [])],
          subLicensing: contract.subLicensing || "Not permitted",
          rightOfFirstRefusal: contract.rightOfFirstRefusal !== false,
          sellOffPeriodDays: contract.sellOffPeriodDays || 180,
        };
        location.hash = "#/agreements/new";
      });
    });

    // Save Notes
    const saveNotesBtn = root.querySelector("[data-act='save-notes']");
    if (saveNotesBtn) saveNotesBtn.addEventListener("click", () => {
      const ta = root.querySelector("[data-contract-notes]");
      const v = (ta?.value || "").trim();
      STE.mutate(s => {
        const c = s.contracts.find(x => x.id === contract.id);
        if (c) c.notes = v;
      });
      STEApp.toast("Notes saved", "success");
    });

    const startBtn = root.querySelector("[data-act='start-negotiation']");
    if (startBtn) startBtn.addEventListener("click", () => {
      STE.mutate(s => {
        const c = s.contracts.find(x => x.id === contract.id);
        if (c) {
          c.status = "Terms Sent";
          c.negotiationStartedAt = new Date().toISOString();
        }
        // Initialize negotiation thread + system message
        s.negotiationThreads = s.negotiationThreads || [];
        let t = s.negotiationThreads.find(x => x.contractId === contract.id);
        if (!t) { t = { contractId: contract.id, messages: [] }; s.negotiationThreads.push(t); }
        t.messages.push({
          author: u.name, role: `HQ ${u.title || 'Reviewer'}`,
          at: new Date().toISOString(),
          body: `Negotiation opened. Email notification sent to ${contract.counterpartyName || lic.legalName} (${lic.contactEmail || 'counterparty email on file'}).`,
        });
        s.auditLog = s.auditLog || [];
        s.auditLog.unshift({
          at: new Date().toISOString(),
          event: `Negotiation started`,
          actor: u.name,
          contractId: contract.id,
          attachment: `${contract.id}_opening_notice.eml`,
        });
      });
      STEApp.toast(`Negotiation started · 이메일이 ${lic.contactEmail || 'counterparty'}에게 발송되었습니다.`, "success");
      contracts();
    });

    root.querySelectorAll("[data-renewal-action]").forEach(b => {
      b.addEventListener("click", () => {
        const action = b.getAttribute("data-renewal-action");
        if (action === "conditional") openBrandElevationModal(contract, lic);
        else if (action === "terminate") openTerminationModal(contract, lic);
        else if (action === "accept") openAcceptOfferModal(contract, lic, thread);
      });
    });

    root.querySelectorAll("[data-reminder-remove]").forEach(b => {
      b.addEventListener("click", () => {
        const id = b.getAttribute("data-reminder-remove");
        STE.mutate(s => {
          const sched = ensureRenewalSchedule(s, contract);
          sched.reminders = sched.reminders.filter(x => x.id !== id);
        });
        contracts();
      });
    });

    const addBtn = root.querySelector("[data-reminder-add]");
    if (addBtn) addBtn.addEventListener("click", () => {
      openReminderModal(contract, (newReminder) => {
        STE.mutate(s => {
          const sched = ensureRenewalSchedule(s, contract);
          // Same-monthsBefore dedupe; for custom dates, dedupe by computed date string
          const matches = sched.reminders.some(r => {
            if (newReminder.monthsBefore && r.monthsBefore === newReminder.monthsBefore) return true;
            if (newReminder.customDate) {
              const d = reminderDate(r.monthsBefore, contract);
              return d && d.toISOString().slice(0,10) === newReminder.customDate;
            }
            return false;
          });
          if (matches) { STEApp.toast("Reminder already exists for that date", "warn"); return; }
          sched.reminders.push(newReminder);
          sched.reminders.sort((a, b) => b.monthsBefore - a.monthsBefore);
        });
        contracts();
      });
    });
  }

  // ============================ Flow D helpers ============================

  // Reminder data is stored on state.renewalSchedule[contractId].reminders.
  // A reminder can be either months-before-expiry OR a fixed customDate.
  // Older seed used `checkpoint: "D-365"` strings; we normalize on read.
  function normalizeReminder(r, contract) {
    let months = r.monthsBefore;
    if (months == null && r.checkpoint) {
      const m = String(r.checkpoint).match(/D-(\d+)/);
      if (m) months = Math.round(parseInt(m[1]) / 30);
    }
    return {
      id: r.id || `rem-${months || r.customDate || 'x'}`,
      monthsBefore: months ?? null,
      customDate: r.customDate || null,
      status: r.status || "upcoming",
      sentAt: r.sentAt || null,
    };
  }

  function defaultReminders() {
    return [12, 6, 3, 1].map(m => ({
      id: `rem-${m}m`, monthsBefore: m, status: "upcoming", sentAt: null,
      time: "09:00",
      recipients: ["lead.negotiator@fnf.com", "minjung@fnf.com"],
    }));
  }

  function ensureRenewalSchedule(state, contract) {
    state.renewalSchedule = state.renewalSchedule || {};
    if (!state.renewalSchedule[contract.id]) {
      state.renewalSchedule[contract.id] = { reminders: defaultReminders() };
    } else if (!state.renewalSchedule[contract.id].reminders) {
      state.renewalSchedule[contract.id].reminders = defaultReminders();
    }
    return state.renewalSchedule[contract.id];
  }

  function reminderDate(monthsBefore, contract) {
    if (!contract.termEnd) return null;
    const d = new Date(contract.termEnd);
    d.setMonth(d.getMonth() - (monthsBefore || 0));
    return d;
  }

  // Resolve a reminder's actual notification date — honoring customDate first.
  function reminderResolvedDate(r, contract) {
    if (r.customDate) return new Date(r.customDate);
    return reminderDate(r.monthsBefore, contract);
  }

  // Reminders are sent automatically — a reminder whose scheduled date has
  // passed is treated as sent (no manual trigger needed).
  function reminderStatus(r, contract) {
    if (r.status === "sent" || r.sentAt) return "sent";
    const due = reminderResolvedDate(r, contract);
    if (!due) return "upcoming";
    return due <= new Date() ? "sent" : "upcoming";
  }

  // License Scope card — territory, exclusivity, product/channel scope,
  // sub-licensing and right-of-first-refusal. All licensing-specific terms
  // that don't fit under generic "Financial Terms".
  // Stable key used by the spinner + chips + banner + Apply-all so all four
  // surfaces gate on the same "analysis complete" signal.
  function aiAnalyzedKey(prior, lic, type) {
    if (!lic) return "";
    return prior
      ? `${prior.id}:${lic.id}`
      : `new:${lic.id}:${type || ""}`;
  }

  // Default form values for a fresh draft — used as the "baseline" when no
  // prior contract exists, so we can detect whether the AI's suggestion is
  // actually different from what the form started with.
  const FRESH_DRAFT_BASELINE = {
    royaltyPct: 10.0,
    marketingPct: 2.0,
    advertisingPct: 2.0,
    minQuarterly: "",
    minAnnual: "",
    renewalOption: "5y",
    paymentNet: "Net 30",
    paymentFrequency: "Quarterly",
  };

  // Returns the baseline value for a field — what the form would show if
  // the AI hadn't analyzed yet. For renewals/amendments this is the prior
  // contract value; for new agreements it's the default.
  function aiBaselineFor(field, prior) {
    if (prior) {
      if (field === "royaltyPct") return prior.royaltyPct;
      if (field === "marketingPct") return prior.marketingPct;
      if (field === "advertisingPct") return prior.advertisingPct;
      if (field === "minQuarterly") return prior.minQuarterlyGbp || prior.minQuarterlyEur || 0;
      if (field === "minAnnual") return prior.minAnnualGbp || prior.minAnnualEur || 0;
      if (field === "renewalOption") return prior.renewalOption || "5y";
      if (field === "paymentNet") return prior.paymentNet || (prior.paymentTerms || "").split("·")[0]?.trim() || "Net 30";
      if (field === "paymentFrequency") return prior.paymentFrequency || (prior.paymentTerms || "").split("·")[1]?.trim() || "Quarterly";
    }
    return FRESH_DRAFT_BASELINE[field];
  }

  // Compute the AI suggestion for one form field. Single source of truth for
  // chip rendering, the "N suggestions" banner count, and the Apply-all action.
  // Two modes: renewal (compare to prior) and benchmark (no prior — industry
  // band based on licensee tier).
  //
  // `headline` is a short imperative ("Set royalty to 11%") and `rationale`
  // is a full sentence that explains WHY in plain language — together they
  // read as "[action] because [reason]" so the user can act without parsing
  // jargon. `noChange` is set when the AI's suggestion equals the baseline
  // value (e.g. prior already had a 5y renewal option, AI also wants 5y).
  function aiSuggestionFor(field, prior, lic, draft) {
    if (!lic) return null;
    const cur = (draft && draft.currency)
      || (prior && prior.minQuarterlyEur ? "EUR" : prior ? "GBP" : (lic.currency || "GBP"));
    const money = (v) => cur === "EUR" ? `€${v.toLocaleString()}` : `£${v.toLocaleString()}`;
    const licName = lic.legalName || "this licensee";

    // Format a value into the same display form as `display`. Used for the
    // "Changed from X to Y" line on applied chips.
    const fmtFor = (f, v) => {
      if (v === "" || v == null) return "—";
      if (f === "royaltyPct") return `${v}%`;
      if (f === "renewalOption") return String(v);
      return money(+v);
    };
    const baseline = aiBaselineFor(field, prior);
    const baselineDisplay = fmtFor(field, baseline);

    let result = null;
    if (prior) {
      const priorMinQ = prior.minQuarterlyGbp || prior.minQuarterlyEur || 0;
      if (field === "royaltyPct") {
        const v = +(prior.royaltyPct + 1).toFixed(1);
        result = {
          field, value: v, display: `${v}%`,
          headline: `Set royalty to ${v}%`,
          rationale: `Bump the rate by one percentage point from the prior ${prior.royaltyPct}%. ${licName} delivered strongly over the previous term, and ${v}% stays inside the tier-1 EU benchmark band of 10–12% for apparel master licences.`,
        };
      } else if (field === "minQuarterly") {
        const v = priorMinQ + 100000;
        result = {
          field, value: v, display: money(v),
          headline: `Set Min/Q to ${money(v)}`,
          rationale: `Raise the quarterly minimum by ${money(100000)} over the prior ${money(priorMinQ)}. ${licName}'s actual quarterly revenue has run well above the current floor, so the new minimum still leaves roughly a 50% safety margin against their run-rate.`,
        };
      } else if (field === "minAnnual") {
        const v = (priorMinQ + 100000) * 4;
        result = {
          field, value: v, display: money(v),
          headline: `Set Min/Year to ${money(v)}`,
          rationale: `Set the annual minimum to four times the quarterly minimum (${money(v / 4)}/Q) so the quarterly and annual guarantees stay aligned.`,
        };
      } else if (field === "renewalOption") {
        result = {
          field, value: "5y", display: "5y",
          headline: `Set renewal option to 5y`,
          rationale: `Commit to another 5-year term. ${licName} delivered ${lic.cumulativeMinPct ?? '—'}% of the cumulative minimum over the prior 5-year cycle, giving 94% confidence that another 5-year commitment will perform similarly.`,
        };
      } else if (field === "marketingPct") {
        result = {
          field, value: 2.0, display: "2.0%",
          headline: `Set marketing contribution to 2%`,
          rationale: `Hold marketing at the licensing-industry standard 2%. ${licName}'s prior-term ${prior.marketingPct}% delivered the expected brand-elevation activity, so there's no reason to renegotiate this lever.`,
        };
      } else if (field === "advertisingPct") {
        result = {
          field, value: 2.0, display: "2.0%",
          headline: `Set advertising spend to 2%`,
          rationale: `Hold advertising spend at 2% of net sales — the industry standard for tier-1 master licences. ${licName}'s prior-term ${prior.advertisingPct}% met campaign delivery targets.`,
        };
      } else if (field === "paymentNet") {
        result = {
          field, value: "Net 30", display: "Net 30",
          headline: `Set payment terms to Net 30`,
          rationale: `Keep Net 30 payment terms. This is the standard for European apparel licensees and matches ${licName}'s payment behaviour during the prior term.`,
        };
      } else if (field === "paymentFrequency") {
        result = {
          field, value: "Quarterly", display: "Quarterly",
          headline: `Set billing frequency to Quarterly`,
          rationale: `Quarterly billing matches the quarterly minimum guarantee structure and keeps royalty reconciliation in sync with sales reporting cycles.`,
        };
      }
    } else {
      // No prior — derive suggestions from patterns across other Active
      // contracts in the portfolio. Median for numerics, mode for enums.
      const all = (STE.get().contracts || []).filter(c => (c.status || "Active") === "Active");
      const median = (xs) => {
        const a = xs.filter(v => v != null && !isNaN(+v)).map(v => +v).sort((x, y) => x - y);
        if (!a.length) return null;
        const mid = Math.floor(a.length / 2);
        return a.length % 2 ? a[mid] : +((a[mid - 1] + a[mid]) / 2).toFixed(2);
      };
      const mode = (xs) => {
        const counts = {};
        xs.filter(Boolean).forEach(v => { counts[v] = (counts[v] || 0) + 1; });
        const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        return entries.length ? entries[0][0] : null;
      };
      const n = all.length;
      const portfolioNote = n > 1 ? `Based on patterns across ${n} active agreements in the portfolio.`
                                  : `Limited reference data (only ${n} active agreement on file) — review carefully.`;

      if (field === "royaltyPct") {
        const v = median(all.map(c => c.royaltyPct));
        if (v != null) result = { field, value: v, display: `${v}%`, headline: `Suggest ${v}% royalty`, rationale: `Median royalty rate across active agreements is ${v}%. ${portfolioNote}` };
      } else if (field === "marketingPct") {
        const v = median(all.map(c => c.marketingPct));
        if (v != null) result = { field, value: v, display: `${v}%`, headline: `Suggest ${v}% marketing`, rationale: `Median marketing contribution across active agreements is ${v}%. ${portfolioNote}` };
      } else if (field === "advertisingPct") {
        const v = median(all.map(c => c.advertisingPct));
        if (v != null) result = { field, value: v, display: `${v}%`, headline: `Suggest ${v}% advertising`, rationale: `Median advertising spend across active agreements is ${v}%. ${portfolioNote}` };
      } else if (field === "minQuarterly") {
        const sameCur = all.filter(c => (cur === "EUR" ? c.minQuarterlyEur : c.minQuarterlyGbp));
        const v = median(sameCur.map(c => cur === "EUR" ? c.minQuarterlyEur : c.minQuarterlyGbp));
        if (v != null) result = { field, value: v, display: money(v), headline: `Suggest ${money(v)} / quarter`, rationale: `Median quarterly minimum across active ${cur} agreements is ${money(v)}. ${portfolioNote}` };
      } else if (field === "minAnnual") {
        const sameCur = all.filter(c => (cur === "EUR" ? c.minAnnualEur : c.minAnnualGbp));
        const v = median(sameCur.map(c => cur === "EUR" ? c.minAnnualEur : c.minAnnualGbp));
        if (v != null) result = { field, value: v, display: money(v), headline: `Suggest ${money(v)} / year`, rationale: `Median annual minimum across active ${cur} agreements is ${money(v)}. ${portfolioNote}` };
      } else if (field === "renewalOption") {
        const v = mode(all.map(c => c.renewalOption));
        if (v) result = { field, value: v, display: v, headline: `Suggest ${v} renewal option`, rationale: `Most common renewal option across active agreements is ${v}. ${portfolioNote}` };
      } else if (field === "paymentNet") {
        const v = mode(all.map(c => c.paymentNet));
        if (v) result = { field, value: v, display: v, headline: `Suggest ${v} payment terms`, rationale: `Most common payment terms across active agreements is ${v}. ${portfolioNote}` };
      } else if (field === "paymentFrequency") {
        const v = mode(all.map(c => c.paymentFrequency));
        if (v) result = { field, value: v, display: v, headline: `Suggest ${v} billing`, rationale: `Most common billing frequency across active agreements is ${v}. ${portfolioNote}` };
      }
    }
    if (!result) return null;
    // Detect "AI agrees with baseline" — suggestion is identical to what
    // the form already shows; no actual change is being recommended.
    const numericFields = ["royaltyPct", "minQuarterly", "minAnnual"];
    const noChange = numericFields.includes(field)
      ? +baseline === +result.value
      : String(baseline) === String(result.value);
    result.baseline = baseline;
    result.baselineDisplay = baselineDisplay;
    result.noChange = noChange;
    return result;
  }

  const AI_SUGGEST_FIELDS = [
    "renewalOption",
    "royaltyPct", "marketingPct", "advertisingPct",
    "minQuarterly", "minAnnual",
    "paymentNet", "paymentFrequency",
  ];

  function pendingAiSuggestions(draft, prior, lic, analyzedSet) {
    if (!lic) return [];
    const key = aiAnalyzedKey(prior, lic, draft && draft.type);
    if (!analyzedSet.has(key)) return [];
    return AI_SUGGEST_FIELDS
      .map(f => aiSuggestionFor(f, prior, lic, draft))
      .filter(Boolean)
      .filter(s => !s.noChange)
      .filter(s => {
        const cur = draft[s.field];
        return (typeof s.value === "number") ? +cur !== s.value : String(cur) !== String(s.value);
      });
  }

  // Inline AI suggestion chip — three states:
  //   1. No change recommended — AI's value equals the baseline (prior /
  //      industry default), so there's nothing to apply. Neutral muted style.
  //   2. Applied — current value matches AI suggestion AND differs from
  //      baseline. Green check with explicit "Changed from X to Y" line.
  //   3. Pending — AI's value differs from current. Suggest + Apply button.
  function aiSuggestChip(field, draft, prior, lic, analyzedSet) {
    if (!lic) return "";
    const key = aiAnalyzedKey(prior, lic, draft && draft.type);
    if (!analyzedSet.has(key)) return "";
    const s = aiSuggestionFor(field, prior, lic, draft);
    if (!s) return "";
    const current = draft[field];
    const matches = (typeof s.value === "number") ? +current === s.value : String(current) === String(s.value);

    if (s.noChange) {
      return `<div class="ste-ai-suggest ste-ai-suggest-nochange">
        <span class="ste-ai-suggest-badge">AI</span>
        <span class="ste-ai-suggest-text">
          <strong>No change recommended — keep at ${escape(s.display)}</strong>
          <div class="ste-ai-suggest-why">${escape(s.rationale)}</div>
        </span>
      </div>`;
    }
    if (matches) {
      return `<div class="ste-ai-suggest ste-ai-suggest-applied">
        <span class="ste-ai-suggest-badge">AI</span>
        <span class="ste-ai-suggest-text">
          <strong>${escape(s.headline)} — applied</strong>
          <div class="ste-ai-suggest-why">Changed from ${escape(s.baselineDisplay)} to ${escape(s.display)}. ${escape(s.rationale)}</div>
        </span>
        <span class="ste-ai-suggest-check">✓</span>
      </div>`;
    }
    return `<div class="ste-ai-suggest">
      <span class="ste-ai-suggest-badge">AI</span>
      <span class="ste-ai-suggest-text">
        <strong>${escape(s.headline)}</strong>
        <div class="ste-ai-suggest-why">${escape(s.rationale)}</div>
      </span>
      <button type="button" class="ste-ai-suggest-apply" data-ai-apply="${escape(field)}" data-ai-value="${escape(String(s.value))}">Apply</button>
    </div>`;
  }

  // Side-by-side comparison of a predecessor contract's terms against the
  // current draft. Used when the draft has a succeedsContractId (renewal /
  // amendment / extension) so negotiators can spot what changed at a glance.
  function renderPriorVsNewCard(prior, draft) {
    const usingEur = (draft.currency === "EUR");
    const priorMin = usingEur ? prior.minQuarterlyEur : prior.minQuarterlyGbp;
    const cur = draft.currency || (prior.minQuarterlyEur ? "EUR" : "GBP");
    const moneyFmt = (v) => v == null ? "—" : (cur === "EUR" ? "€" + (+v).toLocaleString() : "£" + (+v).toLocaleString());
    const pctFmt = (v) => v == null || v === "" ? "—" : `${(+v).toFixed(1)}%`;
    const yrs = (start, end) => {
      if (!start || !end) return "—";
      const d = Math.round((new Date(end) - new Date(start)) / (365.25 * 86400000));
      return `${d}y`;
    };
    const rows = [
      ["Royalty",              pctFmt(prior.royaltyPct),     pctFmt(draft.royaltyPct),     diff(prior.royaltyPct, draft.royaltyPct, "pp")],
      ["Marketing %",          pctFmt(prior.marketingPct),   pctFmt(draft.marketingPct),   diff(prior.marketingPct, draft.marketingPct, "pp")],
      ["Advertising %",        pctFmt(prior.advertisingPct), pctFmt(draft.advertisingPct), diff(prior.advertisingPct, draft.advertisingPct, "pp")],
      ["Minimum / Quarter",    moneyFmt(priorMin),           moneyFmt(draft.minQuarterly), diff(priorMin, draft.minQuarterly, "money", cur)],
      ["Term",                 yrs(prior.termStart, prior.termEnd), yrs(draft.termStart, draft.termEnd), null],
      ["Renewal option",       escape(prior.renewalOption || "—"), escape(draft.renewalOption || "—"), null],
      ["Payment",              escape(prior.paymentTerms || "—"),  escape(`${draft.paymentNet} · ${draft.paymentFrequency}`), null],
    ];
    function diff(a, b, kind, c) {
      if (a == null || b === "" || b == null) return null;
      const da = +a, db = +b;
      if (isNaN(da) || isNaN(db) || da === db) return null;
      const delta = db - da;
      const sign = delta > 0 ? "+" : "";
      if (kind === "pp") return `${sign}${delta.toFixed(1)}pp`;
      if (kind === "money") return `${sign}${c === "EUR" ? "€" : "£"}${Math.round(delta).toLocaleString()}`;
      return `${sign}${delta}`;
    }
    const priorYears = yrs(prior.termStart, prior.termEnd);
    return `
      <div class="ste-card">
        <div class="ste-card-head">
          <h3>Previous Agreement · ${escape(prior.id || '—')}</h3>
          <div class="ste-mini">Predecessor: ${escape(prior.termStart || '—')} → ${escape(prior.termEnd || '—')} · ${priorYears}</div>
        </div>
        <div class="ste-card-body">
          <table class="ste-prior-table">
            <thead>
              <tr>
                <th></th>
                <th>Previous</th>
                <th>This draft</th>
                <th>Δ</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(r => {
                const [label, oldV, newV, delta] = r;
                const tone = delta ? (String(delta).startsWith("+") ? "up" : "down") : "same";
                return `
                  <tr>
                    <td><strong>${escape(label)}</strong></td>
                    <td class="ste-prior-old">${oldV}</td>
                    <td class="ste-prior-new">${newV}</td>
                    <td class="ste-prior-delta ste-prior-delta-${tone}">${delta || ''}</td>
                  </tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  // Annual Periods editor — yearly GMNS / GMR / termination threshold table.
  // Auto-populates rows when draft.termStart / draft.termEnd / royaltyPct change.
  function renderAnnualPeriodsEditor(draft, priorContract) {
    draft.annualPeriods = draft.annualPeriods || [];
    // Seed first row when empty + we have dates.
    if (draft.annualPeriods.length === 0 && draft.termStart && draft.termEnd) {
      const start = new Date(draft.termStart);
      const end = new Date(draft.termEnd);
      const years = Math.max(1, Math.round((end - start) / (365.25 * 86400000)));
      const royalty = (draft.royaltyPct || 10) / 100;
      const baseGmns = priorContract && priorContract.annualPeriods && priorContract.annualPeriods.length
        ? +(priorContract.annualPeriods[priorContract.annualPeriods.length - 1].gmnsEur || 0) * 1.10
        : 2000000;
      for (let i = 0; i < years; i++) {
        const from = new Date(start); from.setFullYear(start.getFullYear() + i);
        const to = new Date(from); to.setFullYear(from.getFullYear() + 1); to.setDate(to.getDate() - 1);
        const gmns = Math.round(baseGmns * Math.pow(1.10, i));
        draft.annualPeriods.push({
          year: i + 1,
          from: from.toISOString().slice(0, 10),
          to: to.toISOString().slice(0, 10),
          gmnsEur: gmns,
          gmrEur: Math.round(gmns * royalty),
          terminationThresholdPct: i === 0 ? null : (i === 1 ? 85 : 90),
          quarterly: [],
        });
      }
    }
    const periods = draft.annualPeriods;
    const cur = draft.currency || "EUR";
    const sym = cur === "EUR" ? "€" : cur === "USD" ? "$" : "£";
    const totalGmns = periods.reduce((s, p) => s + (+p.gmnsEur || 0), 0);
    const totalGmr = periods.reduce((s, p) => s + (+p.gmrEur || 0), 0);
    return `
      <div class="ste-card">
        <div class="ste-card-head">
          <h3>Annual Periods Schedule</h3>
          <span class="ste-mini">${periods.length} period${periods.length===1?'':'s'} · Total GMNS ${sym}${Math.round(totalGmns).toLocaleString()} · Total GMR ${sym}${Math.round(totalGmr).toLocaleString()}</span>
        </div>
        <div class="ste-card-body" style="padding:0">
          <table class="ste-table">
            <thead>
              <tr>
                <th>Year</th>
                <th>From</th>
                <th>To</th>
                <th style="text-align:right">GMNS (${cur})</th>
                <th style="text-align:right">GMR (${cur})</th>
                <th>Termination<br>Threshold %</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${periods.map((p, i) => `
                <tr data-ap-idx="${i}">
                  <td><strong>Y${p.year}</strong></td>
                  <td><input class="ste-input" type="date" data-ap-field="from" value="${escape(p.from || '')}" style="width:130px"></td>
                  <td><input class="ste-input" type="date" data-ap-field="to" value="${escape(p.to || '')}" style="width:130px"></td>
                  <td style="text-align:right"><input class="ste-input" type="number" min="0" step="10000" data-ap-field="gmnsEur" value="${escape(p.gmnsEur || 0)}" style="width:120px;text-align:right"></td>
                  <td style="text-align:right"><input class="ste-input" type="number" min="0" step="10000" data-ap-field="gmrEur" value="${escape(p.gmrEur || 0)}" style="width:120px;text-align:right"></td>
                  <td><input class="ste-input" type="number" min="0" max="100" step="1" data-ap-field="terminationThresholdPct" value="${p.terminationThresholdPct ?? ''}" placeholder="—" style="width:70px"></td>
                  <td><button class="ste-btn ste-btn-link" data-ap-rm="${i}" type="button" title="Remove year">×</button></td>
                </tr>`).join("")}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3"><button class="ste-btn ste-btn-link" data-ap-add type="button">+ Add Year</button></td>
                <td style="text-align:right"><strong>${sym}${Math.round(totalGmns).toLocaleString()}</strong></td>
                <td style="text-align:right"><strong>${sym}${Math.round(totalGmr).toLocaleString()}</strong></td>
                <td colspan="2"></td>
              </tr>
            </tfoot>
          </table>
          <p class="ste-mini" style="padding:8px 14px;color:var(--ste-muted)">GMR = GMNS × royalty %. Threshold defaults: Y1 waived, Y2 85%, Y3+ 90%. Edit values as negotiated.</p>
        </div>
      </div>`;
  }

  function renderRenewalTermEditor(draft) {
    draft.renewalTerm = draft.renewalTerm || { optionYears: null, deadlineToSign: "", stepUps: [], conditions: [], notes: "" };
    const r = draft.renewalTerm;
    return `
      <div class="ste-card">
        <div class="ste-card-head"><h3>Renewal Term</h3></div>
        <div class="ste-card-body">
          <div class="ste-form-grid-2">
            <div class="ste-field">
              <div class="ste-lbl">Option Years</div>
              <input class="ste-input" type="number" min="0" max="10" step="1" data-rt-field="optionYears" value="${r.optionYears ?? ''}" placeholder="3">
            </div>
            <div class="ste-field">
              <div class="ste-lbl">Deadline to Sign</div>
              <input class="ste-input" type="date" data-rt-field="deadlineToSign" value="${escape(r.deadlineToSign || '')}">
            </div>
            <div class="ste-field" style="grid-column: 1 / -1">
              <div class="ste-lbl">Cumulative Step-Ups (one per line: "Y6 +20% vs year 5")</div>
              <textarea class="ste-input" rows="3" data-rt-field="stepUpsText" placeholder="Y6 +20% vs year 5&#10;Y7 +10% vs year 6&#10;Y8 +10% vs year 7">${escape((r.stepUps || []).map(s => `Y${s.year} +${s.pctIncrease}% vs ${s.vs || 'prior'}`).join("\n"))}</textarea>
            </div>
            <div class="ste-field" style="grid-column: 1 / -1">
              <div class="ste-lbl">Renewal Conditions (one per line)</div>
              <textarea class="ste-input" rows="3" data-rt-field="conditionsText" placeholder="All licensee obligations performed on time&#10;HQ reasonable-discretion performance threshold met">${escape((r.conditions || []).join("\n"))}</textarea>
            </div>
            <div class="ste-field" style="grid-column: 1 / -1">
              <div class="ste-lbl">Notes</div>
              <input class="ste-input" type="text" data-rt-field="notes" value="${escape(r.notes || '')}" placeholder="Definitive signed agreement required; not just intent notice">
            </div>
          </div>
        </div>
      </div>`;
  }

  function renderLicenseScopeCard(draft, state) {
    const ref = state.referenceData || {};
    const allCats = ref.categories || [];
    const allChans = ref.channels || [];
    // Comprehensive country list — typeahead + dropdown source. Anything the
    // user types that isn't on this list is accepted as-is (case-insensitive
    // dedupe with existing chips).
    const TERRITORY_PRESETS = [
      "United Kingdom","Ireland","France","Germany","Italy","Spain","Portugal",
      "Netherlands","Belgium","Luxembourg","Sweden","Norway","Denmark","Finland",
      "Iceland","Poland","Czech Republic","Slovakia","Hungary","Austria",
      "Switzerland","Liechtenstein","Greece","Cyprus","Malta","Romania","Bulgaria",
      "Croatia","Slovenia","Estonia","Latvia","Lithuania","Channel Islands",
      "United States","Canada","Mexico","Brazil","Argentina","Chile","Colombia",
      "Australia","New Zealand","Japan","South Korea","China","Taiwan","Hong Kong",
      "Singapore","India","Vietnam","Thailand","Indonesia","Malaysia","Philippines",
      "UAE","Saudi Arabia","Israel","Turkey","Egypt","Morocco","South Africa",
    ];
    const selectedSet = new Set((draft.territories || []).map(t => t.toLowerCase()));
    const territoryChips = (draft.territories || []).map((t, i) => `
      <span class="ste-scope-chip">
        ${escape(t)}
        <button type="button" data-territory-remove="${i}" aria-label="Remove">×</button>
      </span>`).join("");

    return `
      <div class="ste-card">
        <div class="ste-card-head">
          <h3>License Scope</h3>
        </div>
        <div class="ste-card-body">

          <div class="ste-form-subhd">Territory & Exclusivity</div>
          <div class="ste-form-grid-2" style="margin-bottom:18px">
            <div class="ste-field">
              <div class="ste-lbl">Exclusivity</div>
              <select class="ste-input" data-f="exclusivity">
                <option value="" ${!draft.exclusivity?'selected':''} disabled>Select exclusivity…</option>
                <option value="Exclusive in territory" ${draft.exclusivity==="Exclusive in territory"?'selected':''}>Exclusive — only this licensee sells in the territory</option>
                <option value="Sole (HQ + licensee, no third party)" ${draft.exclusivity==="Sole (HQ + licensee, no third party)"?'selected':''}>Sole — this licensee plus HQ direct (no other licensees)</option>
                <option value="Non-exclusive" ${draft.exclusivity==="Non-exclusive"?'selected':''}>Non-exclusive — multiple licensees may sell in the territory</option>
              </select>
            </div>

            <div class="ste-field" style="grid-column: 1 / -1">
              <div class="ste-lbl">Territory</div>
              <div class="ste-scope-chip-wrap ${(draft.territories||[]).length?'':'ste-scope-chip-wrap-empty'}">
                ${territoryChips || '<span class="ste-mini" style="color:var(--ste-muted)">Pick from the dropdown or type a country below — anything not on the list will be added as custom.</span>'}
              </div>
              <div class="ste-territory-typeahead">
                <input class="ste-input" type="text" data-territory-input list="ste-territory-list" placeholder="Pick from list or type custom — press Enter to add">
                <datalist id="ste-territory-list">
                  ${TERRITORY_PRESETS.filter(t => !selectedSet.has(t.toLowerCase())).map(t => `<option value="${escape(t)}"></option>`).join("")}
                </datalist>
              </div>
            </div>
          </div>

          <div class="ste-form-subhd">Product Scope</div>
          <div class="ste-form-grid-2" style="margin-bottom:18px">
            <div class="ste-field" style="grid-column: 1 / -1">
              <div class="ste-lbl">Product Categories <span class="ste-mini" style="text-transform:none;letter-spacing:normal">— managed in Administration · Reference Data</span></div>
              <div class="ste-scope-checks">
                ${allCats.length ? allCats.map(c => `
                  <label class="ste-scope-check ${draft.productCategories?.includes(c)?'on':''}">
                    <input type="checkbox" data-multi="productCategories" value="${escape(c)}" ${draft.productCategories?.includes(c)?'checked':''}>
                    <span>${escape(c)}</span>
                  </label>`).join("") : '<span class="ste-mini" style="color:var(--ste-muted)">No categories defined. Add some in Administration → Reference Data.</span>'}
              </div>
            </div>
            <div class="ste-field" style="grid-column: 1 / -1">
              <div class="ste-lbl">Distribution Channels</div>
              <div class="ste-scope-checks">
                ${allChans.length ? allChans.map(c => `
                  <label class="ste-scope-check ${draft.distributionChannels?.includes(c)?'on':''}">
                    <input type="checkbox" data-multi="distributionChannels" value="${escape(c)}" ${draft.distributionChannels?.includes(c)?'checked':''}>
                    <span>${escape(c)}</span>
                  </label>`).join("") : '<span class="ste-mini" style="color:var(--ste-muted)">No channels defined. Add some in Administration → Reference Data.</span>'}
              </div>
            </div>
          </div>

          <div class="ste-form-subhd">Other Terms</div>
          <div class="ste-form-grid-2">
            <div class="ste-field">
              <div class="ste-lbl">Sub-licensing</div>
              <select class="ste-input" data-f="subLicensing">
                ${["Not permitted","With HQ prior consent","Permitted"].map(o => `<option ${o===draft.subLicensing?'selected':''}>${o}</option>`).join("")}
              </select>
            </div>
            <div class="ste-field">
              <div class="ste-lbl">Sell-off window <span class="ste-mini" style="text-transform:none;letter-spacing:normal">— days after termination</span></div>
              <div style="position:relative">
                <input class="ste-input" type="number" min="0" step="30" data-f="sellOffPeriodDays" value="${draft.sellOffPeriodDays}" style="padding-right:50px">
                <span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);font:500 12px Inter,sans-serif;color:var(--ste-muted)">days</span>
              </div>
            </div>
            <div class="ste-field" style="grid-column: 1 / -1">
              <label class="ste-scope-toggle ${draft.rightOfFirstRefusal?'on':''}">
                <input type="checkbox" data-bool="rightOfFirstRefusal" ${draft.rightOfFirstRefusal?'checked':''}>
                <div>
                  <strong>Right of First Refusal on new categories</strong>
                  <div class="ste-mini">If HQ adds a new product category to the brand, this licensee gets first option to expand before any third-party offer.</div>
                </div>
              </label>
            </div>
          </div>

        </div>
      </div>`;
  }

  // Compute year-by-year actual Net Sales for a contract, joining the
  // licensee's sales statements that fall within each Annual Period window.
  // Returns map { year: { actualEur, pctOfGmns, perfStatus } }.
  function computeAnnualPerformance(contract) {
    if (!contract || !Array.isArray(contract.annualPeriods)) return {};
    const state = STE.get();
    const stmts = (state.salesStatements || []).filter(s => s.licenseeId === contract.licenseeId);
    // Each statement: quarter = "Q1 2026" etc. Map to a date inside the quarter.
    const qToDate = (q) => {
      const m = String(q || "").match(/^Q(\d)\s+(\d{4})$/);
      if (!m) return null;
      const qNum = parseInt(m[1]);
      const yr = parseInt(m[2]);
      // Use mid-quarter date so it lands cleanly inside any year window.
      const monthStart = (qNum - 1) * 3 + 1;
      return new Date(yr, monthStart, 15);
    };
    const result = {};
    contract.annualPeriods.forEach(p => {
      const from = new Date(p.from);
      const to = new Date(p.to);
      const actual = stmts
        .filter(s => {
          const d = qToDate(s.quarter);
          return d && d >= from && d <= to;
        })
        .reduce((sum, s) => sum + (s.totalSalesGbp || 0), 0);
      const pct = p.gmnsEur ? Math.round((actual / p.gmnsEur) * 100) : null;
      const threshold = p.terminationThresholdPct;
      let perfStatus = "neutral";
      if (pct != null && threshold != null) {
        if (pct >= 100) perfStatus = "ok";
        else if (pct >= threshold) perfStatus = "warn";
        else perfStatus = "err";
      } else if (pct != null && pct >= 100) perfStatus = "ok";
      result[p.year] = { actualEur: actual, pctOfGmns: pct, perfStatus };
    });
    return result;
  }

  // Operational Monitoring — derive action items from contract state.
  // Returns array of { severity: 'critical'|'standard'|'reference', label, detail, contractId }
  function computeAgreementAlerts(contract) {
    if (!contract) return [];
    const out = [];
    const today = new Date();
    const status = (contract.status || "").toLowerCase();

    // 1. Outstanding GMR
    if (contract.outstandingGmrEur > 0) {
      out.push({
        severity: "critical",
        label: "Outstanding GMR balance",
        detail: `€${(+contract.outstandingGmrEur).toLocaleString()} outstanding. Settlement gates the amendment's effectiveness.`,
        contractId: contract.id,
      });
    }

    // 2. Renewal deadline approaching
    if (contract.renewalTerm && contract.renewalTerm.deadlineToSign) {
      const d = new Date(contract.renewalTerm.deadlineToSign);
      const daysToDeadline = Math.round((d - today) / 86400000);
      if (daysToDeadline > 0 && daysToDeadline <= 365) {
        out.push({
          severity: daysToDeadline <= 90 ? "critical" : "standard",
          label: `Renewal sign-by deadline D-${daysToDeadline}`,
          detail: `Definitive renewal agreement must be signed by ${contract.renewalTerm.deadlineToSign}.`,
          contractId: contract.id,
        });
      } else if (daysToDeadline < 0) {
        out.push({
          severity: "critical",
          label: "Renewal deadline passed",
          detail: `Sign-by was ${contract.renewalTerm.deadlineToSign}. Contract may auto-expire without a new agreement.`,
          contractId: contract.id,
        });
      }
    }

    // 3. Initial Term expiring soon (no automatic renewal)
    if (status === "active" && contract.termEnd) {
      const days = Math.round((new Date(contract.termEnd) - today) / 86400000);
      if (days > 0 && days <= 180 && (!contract.renewalTerm || !contract.renewalTerm.optionYears)) {
        out.push({
          severity: "critical",
          label: `Initial Term expires D-${days}`,
          detail: `No automatic renewal clause — new license requires separate negotiation. Start renewal discussion now.`,
          contractId: contract.id,
        });
      }
    }

    // 4. Annual Period performance shortfall (uses computeAnnualPerformance)
    if (Array.isArray(contract.annualPeriods)) {
      const perf = computeAnnualPerformance(contract);
      contract.annualPeriods.forEach(p => {
        const r = perf[p.year];
        if (!r || r.pctOfGmns == null) return;
        const periodEnded = new Date(p.to) < today;
        if (!periodEnded) return; // only flag completed years
        if (p.terminationThresholdPct && r.pctOfGmns < p.terminationThresholdPct) {
          out.push({
            severity: "critical",
            label: `Y${p.year} shortfall — ${r.pctOfGmns}% of GMNS`,
            detail: `Below ${p.terminationThresholdPct}% threshold (€${Math.round(r.actualEur).toLocaleString()} actual vs €${(+p.gmnsEur).toLocaleString()} GMNS). Termination-eligible.`,
            contractId: contract.id,
          });
        } else if (r.pctOfGmns < 100) {
          out.push({
            severity: "standard",
            label: `Y${p.year} below GMNS — ${r.pctOfGmns}%`,
            detail: `€${Math.round(r.actualEur).toLocaleString()} actual vs €${(+p.gmnsEur).toLocaleString()} GMNS. Above termination threshold but watch for trend.`,
            contractId: contract.id,
          });
        }
      });
    }

    // 5. Side letters in progress
    if (Array.isArray(contract.sideLetters) && contract.sideLetters.length) {
      contract.sideLetters.forEach(s => {
        out.push({
          severity: "standard",
          label: `Side letter: ${s.title || 'untitled'}`,
          detail: `${s.status || 'in negotiation'}${s.targetSigningDate ? ' · target ' + s.targetSigningDate : ''}`,
          contractId: contract.id,
        });
      });
    }

    // 6. Missing key reference data
    if (!contract.parties || !(contract.parties.licensee || []).length) {
      out.push({
        severity: "reference",
        label: "Counterparty roster incomplete",
        detail: "No Licensee contact on file — add at least one signatory + finance contact.",
        contractId: contract.id,
      });
    }

    return out;
  }

  // Render the Ops Monitoring backlog block (used at top of agreement detail).
  function renderAgreementAlerts(contract) {
    const alerts = computeAgreementAlerts(contract);
    if (!alerts.length) return "";
    const sev = { critical: { tone: "err", icon: "!" }, standard: { tone: "warn", icon: "·" }, reference: { tone: "neutral", icon: "i" } };
    const grouped = { critical: [], standard: [], reference: [] };
    alerts.forEach(a => grouped[a.severity].push(a));
    return `
      <div class="ste-card" style="border-left:3px solid var(--st-navy)">
        <div class="ste-card-head">
          <h3>Operational Monitoring</h3>
          <span class="ste-mini">${alerts.length} item${alerts.length===1?'':'s'} · ${grouped.critical.length} critical · ${grouped.standard.length} standard · ${grouped.reference.length} reference</span>
        </div>
        <div class="ste-card-body" style="padding:0">
          ${["critical","standard","reference"].map(s => grouped[s].length ? `
            ${grouped[s].map(a => `
              <div style="display:flex;gap:12px;padding:12px 16px;border-bottom:1px solid var(--ste-border)">
                <span class="ste-badge ste-badge-${sev[s].tone}" style="height:fit-content;min-width:78px;justify-content:center">${s === 'critical' ? 'Critical' : s === 'standard' ? 'Standard' : 'Reference'}</span>
                <div>
                  <strong>${escape(a.label)}</strong>
                  <div class="ste-mini" style="margin-top:2px">${escape(a.detail)}</div>
                </div>
              </div>`).join("")}
          ` : '').join("")}
        </div>
      </div>`;
  }

  // Compose the extended agreement detail sections — only renders cards for
  // fields that exist on the contract. Older seed contracts without these
  // fields stay backwards-compatible (cards skip silently).
  function renderAgreementExtensions(contract) {
    if (!contract) return "";
    let html = "";

    // --- Ops Monitoring (auto-derived from contract state) ---
    html += renderAgreementAlerts(contract);

    // --- Outstanding GMR banner (alert at top of extensions) ---
    if (contract.outstandingGmrEur > 0) {
      html += `
        <div class="ste-renewal-banner ste-renewal-banner-err">
          <div>
            <strong>Outstanding GMR · €${(+contract.outstandingGmrEur).toLocaleString()}</strong>
            <div class="ste-mini">Per the most recent amendment, this balance must be settled to keep the contract terms in force. Track payment progress in the Annual Periods table.</div>
          </div>
        </div>`;
    }

    // --- Annual Periods table (with cumulative performance vs GMNS) ---
    if (Array.isArray(contract.annualPeriods) && contract.annualPeriods.length) {
      const cur = contract.currency || "EUR";
      const sym = cur === "EUR" ? "€" : cur === "USD" ? "$" : "£";
      const fmt = (v) => v == null ? "—" : sym + Math.round(v).toLocaleString();
      const totalGmns = contract.totalGmnsEur || contract.annualPeriods.reduce((s, p) => s + (p.gmnsEur || 0), 0);
      const totalGmr = contract.totalGmrEur || contract.annualPeriods.reduce((s, p) => s + (p.gmrEur || 0), 0);
      const perf = computeAnnualPerformance(contract);
      const today = new Date();
      html += `
        <div class="ste-card">
          <div class="ste-card-head">
            <h3>Annual Periods &amp; Performance</h3>
            <span class="ste-mini">${contract.annualPeriods.length} period${contract.annualPeriods.length===1?'':'s'} · Total GMNS ${fmt(totalGmns)} · Total GMR ${fmt(totalGmr)}</span>
          </div>
          <div class="ste-card-body" style="padding:0">
            <table class="ste-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Period</th>
                  <th style="text-align:right">GMNS</th>
                  <th style="text-align:right">Actual Net Sales</th>
                  <th>Performance</th>
                  <th style="text-align:right">GMR</th>
                  <th>Threshold</th>
                </tr>
              </thead>
              <tbody>
                ${contract.annualPeriods.map(p => {
                  const r = perf[p.year] || {};
                  const periodEnded = p.to ? new Date(p.to) < today : false;
                  const periodLive = p.from && p.to ? (new Date(p.from) <= today && today <= new Date(p.to)) : false;
                  const pctChip = r.pctOfGmns != null
                    ? `<span class="ste-badge ste-badge-${r.perfStatus || 'neutral'}">${r.pctOfGmns}%${periodLive ? ' so far' : ''}</span>`
                    : (periodEnded ? '<span class="ste-mini">No data</span>' : '<span class="ste-mini">—</span>');
                  const qSched = (p.quarterly || []).map(q => `<div class="ste-mini">${escape(q.due || '')}: ${fmt(q.amountEur || 0)}</div>`).join("");
                  return `
                    <tr>
                      <td><strong>Y${p.year}</strong></td>
                      <td class="ste-mini">${escape(p.from || '—')} → ${escape(p.to || '—')}</td>
                      <td style="text-align:right"><strong>${fmt(p.gmnsEur)}</strong></td>
                      <td style="text-align:right">${r.actualEur ? fmt(r.actualEur) : '<span class="ste-mini">—</span>'}</td>
                      <td>${pctChip}</td>
                      <td style="text-align:right">${fmt(p.gmrEur)}${qSched ? `<details style="margin-top:4px"><summary class="ste-mini" style="cursor:pointer">Schedule</summary>${qSched}</details>` : ''}</td>
                      <td>${p.terminationThresholdPct ? `<span class="ste-mini">${p.terminationThresholdPct}%</span>` : '<span class="ste-mini">Waived</span>'}</td>
                    </tr>`;
                }).join("")}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2"><strong>Total</strong></td>
                  <td style="text-align:right"><strong>${fmt(totalGmns)}</strong></td>
                  <td colspan="2"></td>
                  <td style="text-align:right"><strong>${fmt(totalGmr)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>`;
    }

    // --- Territory Zones (grouped) ---
    if (Array.isArray(contract.territoryZones) && contract.territoryZones.length) {
      html += `
        <div class="ste-card">
          <div class="ste-card-head"><h3>Territory Zones</h3></div>
          <div class="ste-card-body">
            ${contract.territoryZones.map(z => `
              <div class="ste-form-subhd" style="margin-top:8px">${escape(z.name)} <span class="ste-badge ste-badge-${z.exclusivity === 'Exclusive' ? 'ok' : 'neutral'}">${escape(z.exclusivity || '—')}</span></div>
              <div class="ste-view-val ste-view-val-multiline">${(z.countries || []).map(c => `<span class="ste-scope-chip">${escape(c)}</span>`).join(' ')}</div>
            `).join("")}
          </div>
        </div>`;
    }

    // --- Product Categories with exclusivity + excluded list ---
    if (Array.isArray(contract.productCategories) && contract.productCategories.length && typeof contract.productCategories[0] === "object") {
      html += `
        <div class="ste-card">
          <div class="ste-card-head"><h3>Product Categories</h3></div>
          <div class="ste-card-body">
            ${contract.productCategories.map(c => `
              <div class="ste-form-subhd" style="margin-top:8px">${escape(c.name)} <span class="ste-badge ste-badge-${c.exclusivity && c.exclusivity.toLowerCase().startsWith('exclusive') ? 'ok' : 'neutral'}">${escape(c.exclusivity || '—')}</span></div>
              <div class="ste-view-val ste-view-val-multiline" style="color:var(--ste-muted)">${escape(c.scope || '')}</div>
            `).join("")}
            ${(contract.excludedCategories && contract.excludedCategories.length) ? `
              <div class="ste-form-subhd" style="margin-top:16px;color:var(--st-err)">Excluded</div>
              <div class="ste-view-val">${contract.excludedCategories.map(e => `<span class="ste-scope-chip is-excluded">${escape(e)}</span>`).join(' ')}</div>
            ` : ''}
          </div>
        </div>`;
    }

    // --- Approved + Excluded Channels (Annex 1 style) ---
    if (Array.isArray(contract.approvedChannels) && contract.approvedChannels.length) {
      html += `
        <div class="ste-card">
          <div class="ste-card-head"><h3>Approved Channels <span class="ste-mini">(Annex 1)</span></h3></div>
          <div class="ste-card-body">
            ${contract.approvedChannels.map(cat => `
              <div class="ste-form-subhd" style="margin-top:8px">${escape(cat.category)}</div>
              <div class="ste-view-val ste-view-val-multiline">${(cat.names || []).map(n => `<span class="ste-scope-chip">${escape(n)}</span>`).join(' ')}</div>
            `).join("")}
            ${(contract.excludedChannels && contract.excludedChannels.length) ? `
              <div class="ste-form-subhd" style="margin-top:16px;color:var(--st-err)">Excluded Channels</div>
              <div class="ste-view-val">${contract.excludedChannels.map(e => `<span class="ste-scope-chip is-excluded">${escape(e)}</span>`).join(' ')}</div>
            ` : ''}
          </div>
        </div>`;
    }

    // --- Channel Tier obligations per year ---
    if (Array.isArray(contract.channelTiers) && contract.channelTiers.length) {
      html += `
        <div class="ste-card">
          <div class="ste-card-head"><h3>Channel Tier Obligations</h3></div>
          <div class="ste-card-body" style="padding:0">
            <table class="ste-table">
              <thead><tr><th>Year</th><th>Tier 1 (min)</th><th>Tier 2 (min)</th><th>Tier 3 (max)</th><th>Hypermarket (max)</th></tr></thead>
              <tbody>
                ${contract.channelTiers.map(t => `
                  <tr>
                    <td><strong>${escape(t.label || ('Y' + t.year))}</strong></td>
                    <td>${t.t1MinPct != null ? t.t1MinPct + '%' : '—'}</td>
                    <td>${t.t2MinPct != null ? t.t2MinPct + '%' : '—'}</td>
                    <td>${t.t3MaxPct != null ? t.t3MaxPct + '%' : '—'}</td>
                    <td>${t.hypermarketMaxPct != null ? t.hypermarketMaxPct + '%' : '—'}</td>
                  </tr>`).join("")}
              </tbody>
            </table>
          </div>
        </div>`;
    }

    // --- E-commerce + Closeout rules ---
    if (contract.ecommerce || contract.closeoutCap) {
      const e = contract.ecommerce || {};
      const c = contract.closeoutCap || {};
      html += `
        <div class="ste-card">
          <div class="ste-card-head"><h3>E-commerce &amp; Closeout</h3></div>
          <div class="ste-card-body">
            <div class="ste-form-grid-2">
              <div class="ste-field"><div class="ste-lbl">Own Site</div><div class="ste-view-val">${e.ownSiteAllowed ? 'Allowed' : 'Not permitted'}</div></div>
              <div class="ste-field"><div class="ste-lbl">Marketplaces</div><div class="ste-view-val">${e.marketplacesAllowed ? 'Allowed' : 'Not permitted'}</div></div>
              <div class="ste-field"><div class="ste-lbl">Social Media</div><div class="ste-view-val">${e.socialMediaAllowed ? 'Allowed (' + escape(e.socialMediaNotes || 'pre-approval required') + ')' : 'Not permitted'}</div></div>
              <div class="ste-field"><div class="ste-lbl">Approved 3rd-Party</div><div class="ste-view-val">${(e.approvedThirdParty || []).length ? (e.approvedThirdParty).map(escape).join(', ') : '—'}</div></div>
              <div class="ste-field" style="grid-column: 1 / -1"><div class="ste-lbl">Closeout Cap</div><div class="ste-view-val">${c.unitsPct != null ? c.unitsPct + '% per ' + escape(c.scope || 'period') : 'Not permitted'}${c.listPriceDiscountThresholdPct ? ' · Defined as ≥' + c.listPriceDiscountThresholdPct + '% off list price' : ''}${(c.approvedChannels || []).length ? ' · Approved: ' + c.approvedChannels.map(escape).join(', ') : ''}</div></div>
            </div>
          </div>
        </div>`;
    }

    // --- Renewal Term card ---
    if (contract.renewalTerm) {
      const r = contract.renewalTerm;
      html += `
        <div class="ste-card">
          <div class="ste-card-head"><h3>Renewal Term</h3></div>
          <div class="ste-card-body">
            <div class="ste-form-grid-2">
              <div class="ste-field"><div class="ste-lbl">Option Years</div><div class="ste-view-val">${r.optionYears != null ? r.optionYears + ' yr' : '— (negotiated)'}</div></div>
              <div class="ste-field"><div class="ste-lbl">Deadline to Sign</div><div class="ste-view-val">${r.deadlineToSign ? escape(fmtDate(r.deadlineToSign)) : '—'}</div></div>
            </div>
            ${(r.stepUps && r.stepUps.length) ? `
              <div class="ste-form-subhd" style="margin-top:12px">Cumulative Step-Ups</div>
              <ul style="margin:6px 0 0;padding-left:18px">
                ${r.stepUps.map(s => `<li><strong>Year ${s.year}</strong>: +${s.pctIncrease}% vs ${escape(s.vs || 'prior year')}</li>`).join("")}
              </ul>` : ''}
            ${(r.conditions && r.conditions.length) ? `
              <div class="ste-form-subhd" style="margin-top:12px">Conditions</div>
              <ul style="margin:6px 0 0;padding-left:18px">
                ${r.conditions.map(c => `<li>${escape(c)}</li>`).join("")}
              </ul>` : ''}
            ${r.notes ? `<p class="ste-mini" style="margin-top:10px">${escape(r.notes)}</p>` : ''}
          </div>
        </div>`;
    }

    // --- Rollout milestones ---
    if (contract.rollout && (contract.rollout.firstSubmissionDate || contract.rollout.firstDistributionDate || contract.rollout.transitionPeriod)) {
      const r = contract.rollout;
      html += `
        <div class="ste-card">
          <div class="ste-card-head"><h3>Rollout Milestones</h3></div>
          <div class="ste-card-body">
            <div class="ste-form-grid-2">
              <div class="ste-field"><div class="ste-lbl">First Submission Date</div><div class="ste-view-val">${r.firstSubmissionDate ? escape(fmtDate(r.firstSubmissionDate)) : '—'}</div></div>
              <div class="ste-field"><div class="ste-lbl">First Distribution Date</div><div class="ste-view-val">${r.firstDistributionDate ? escape(fmtDate(r.firstDistributionDate)) : '—'}</div></div>
              ${r.transitionPeriod ? `<div class="ste-field" style="grid-column: 1 / -1"><div class="ste-lbl">Transition Period</div><div class="ste-view-val">${escape(r.transitionPeriod.from || '')} → ${escape(r.transitionPeriod.to || '')}${r.transitionPeriod.notes ? ' · ' + escape(r.transitionPeriod.notes) : ''}</div></div>` : ''}
            </div>
          </div>
        </div>`;
    }

    // --- Parties roster (multi-contact) ---
    if (contract.parties && ((contract.parties.licensee||[]).length || (contract.parties.licensor||[]).length || contract.parties.guarantor || (contract.parties.owners||[]).length)) {
      const p = contract.parties;
      const contactList = (arr) => (arr || []).map(c => `
        <div class="ste-field"><strong>${escape(c.name || '—')}</strong><div class="ste-mini">${escape(c.role || '')}${c.email && c.email !== '—' ? ' · ' + escape(c.email) : ''}</div></div>`).join("");
      html += `
        <div class="ste-card">
          <div class="ste-card-head"><h3>Parties &amp; Contacts</h3></div>
          <div class="ste-card-body">
            ${(p.licensee||[]).length ? `<div class="ste-form-subhd">Licensee</div>${contactList(p.licensee)}` : ''}
            ${(p.licensor||[]).length ? `<div class="ste-form-subhd" style="margin-top:12px">HQ / Notice</div>${contactList(p.licensor)}` : ''}
            ${p.guarantor ? `<div class="ste-form-subhd" style="margin-top:12px">Guarantor (3-party)</div><div class="ste-view-val">${escape(p.guarantor.entity || p.guarantor.name || '—')} — ${escape(p.guarantor.country || '')}${p.guarantor.role ? ' · ' + escape(p.guarantor.role) : ''}</div>` : ''}
            ${(p.owners||[]).length ? `<div class="ste-form-subhd" style="margin-top:12px">Ownership Structure</div>${p.owners.map(o => `<div class="ste-view-val">${escape(o.name)} — <strong>${o.pct}%</strong>${o.role ? ' (' + escape(o.role) + ')' : ''}</div>`).join("")}` : ''}
          </div>
        </div>`;
    }

    // --- Legal & Financial Guardrails (sidebar-style) ---
    const hasGuardrails = contract.bankGuarantee || contract.latePaymentInterestPctMonthly != null || contract.liquidatedDamagesMultiple != null || contract.insuranceMinUsd != null || contract.governingLaw || contract.arbitration || contract.sellOffPeriodDays != null;
    if (hasGuardrails) {
      const bg = contract.bankGuarantee;
      html += `
        <div class="ste-card">
          <div class="ste-card-head"><h3>Legal &amp; Financial Guardrails</h3></div>
          <div class="ste-card-body">
            <div class="ste-form-grid-2">
              ${bg ? `<div class="ste-field"><div class="ste-lbl">Bank Guarantee</div><div class="ste-view-val">${bg.pctOfGmr || '—'}% of GMR · ${bg.issuedAnnually ? 'annual' : 'one-off'} · ${bg.validityMonths ? bg.validityMonths + ' months' : ''}${bg.firstTierBankRequired ? ' · first-tier bank' : ''}</div></div>` : ''}
              ${contract.latePaymentInterestPctMonthly != null ? `<div class="ste-field"><div class="ste-lbl">Late Payment Interest</div><div class="ste-view-val">${contract.latePaymentInterestPctMonthly}% / month</div></div>` : ''}
              ${contract.liquidatedDamagesMultiple != null ? `<div class="ste-field"><div class="ste-lbl">Liquidated Damages</div><div class="ste-view-val">${contract.liquidatedDamagesMultiple}× Net Sales Royalty</div></div>` : ''}
              ${contract.licenseContractFeeEur ? `<div class="ste-field"><div class="ste-lbl">License Contract Fee</div><div class="ste-view-val">€${(+contract.licenseContractFeeEur).toLocaleString()}</div></div>` : ''}
              ${contract.advertisingContributionPct ? `<div class="ste-field"><div class="ste-lbl">Ad Contribution to HQ</div><div class="ste-view-val">${contract.advertisingContributionPct}% Net Sales</div></div>` : ''}
              ${contract.insuranceMinUsd ? `<div class="ste-field"><div class="ste-lbl">Insurance Minimum</div><div class="ste-view-val">$${(+contract.insuranceMinUsd).toLocaleString()}${contract.insuranceRatingMin ? ' · rating ' + escape(contract.insuranceRatingMin) : ''}</div></div>` : ''}
              ${contract.liabilityCapMonths ? `<div class="ste-field"><div class="ste-lbl">HQ Liability Cap</div><div class="ste-view-val">Trailing ${contract.liabilityCapMonths} months of payments</div></div>` : ''}
              ${contract.sellOffPeriodDays != null ? `<div class="ste-field"><div class="ste-lbl">Sell-Off Period</div><div class="ste-view-val">${contract.sellOffPeriodDays} days (non-exclusive)</div></div>` : ''}
              ${contract.inventoryBuyoutOption ? `<div class="ste-field"><div class="ste-lbl">Inventory Buyout</div><div class="ste-view-val">${contract.inventoryBuyoutOption.days}-day option · ${escape(contract.inventoryBuyoutOption.basis || '—')}</div></div>` : ''}
              ${contract.accelerationOnTerminationDays != null ? `<div class="ste-field"><div class="ste-lbl">Acceleration on Termination</div><div class="ste-view-val">All remaining GMR due in ${contract.accelerationOnTerminationDays} days</div></div>` : ''}
              ${contract.crossDefault ? `<div class="ste-field"><div class="ste-lbl">Cross-Default</div><div class="ste-view-val">Breach of any related HQ agreement triggers termination</div></div>` : ''}
              ${contract.governingLaw ? `<div class="ste-field"><div class="ste-lbl">Governing Law</div><div class="ste-view-val">${escape(contract.governingLaw)}</div></div>` : ''}
              ${contract.arbitration ? `<div class="ste-field"><div class="ste-lbl">Arbitration</div><div class="ste-view-val">${escape(contract.arbitration)}</div></div>` : ''}
              ${contract.fxBasis ? `<div class="ste-field" style="grid-column: 1 / -1"><div class="ste-lbl">FX Basis</div><div class="ste-view-val">${escape(contract.fxBasis)}</div></div>` : ''}
            </div>
          </div>
        </div>`;
    }

    // --- Reporting Requirements ---
    if (Array.isArray(contract.reportingRequirements) && contract.reportingRequirements.length) {
      html += `
        <div class="ste-card">
          <div class="ste-card-head"><h3>Reporting Requirements</h3></div>
          <div class="ste-card-body">
            <ul style="margin:0;padding-left:18px">
              ${contract.reportingRequirements.map(r => `<li>${escape(r)}</li>`).join("")}
            </ul>
            ${contract.auditRights ? `
              <div class="ste-form-subhd" style="margin-top:12px">Audit Rights</div>
              <div class="ste-view-val">Book retention: ${contract.auditRights.bookRetentionYears} years</div>
              <ul style="margin:6px 0 0;padding-left:18px">
                ${(contract.auditRights.shortfallTriggers || []).map(t => `<li>Shortfall &gt; ${t.pct}% — ${escape(t.action)}</li>`).join("")}
              </ul>` : ''}
          </div>
        </div>`;
    }

    // --- Amendments timeline (rich, with deltas) ---
    if (Array.isArray(contract.amendments) && contract.amendments.length && contract.amendments[0].changes) {
      html += `
        <div class="ste-card">
          <div class="ste-card-head"><h3>Amendments Timeline</h3></div>
          <div class="ste-card-body">
            ${contract.amendments.map(a => `
              <div style="border-left:3px solid var(--st-navy);padding:8px 0 8px 14px;margin-bottom:10px">
                <strong>${escape(a.title || 'Amendment')}</strong>
                <span class="ste-mini">· ${escape(fmtDate(a.date))}${a.actor ? ' · ' + escape(a.actor) : ''}</span>
                ${a.summary ? `<div style="margin-top:4px">${escape(a.summary)}</div>` : ''}
                ${(a.changes || []).length ? `
                  <ul style="margin:6px 0 0;padding-left:18px;font:500 12px Inter,sans-serif;color:var(--ste-muted)">
                    ${a.changes.map(c => `<li><code>${escape(c.field)}</code>: ${c.from == null ? '—' : escape(String(c.from))} → ${c.to == null ? '—' : escape(String(c.to))}${c.note ? ' (' + escape(c.note) + ')' : ''}</li>`).join("")}
                  </ul>` : ''}
              </div>`).join("")}
          </div>
        </div>`;
    }

    // --- Special Clauses ---
    if (Array.isArray(contract.specialClauses) && contract.specialClauses.length) {
      html += `
        <div class="ste-card">
          <div class="ste-card-head"><h3>Special Clauses</h3></div>
          <div class="ste-card-body">
            ${contract.specialClauses.map(s => `
              <div style="margin-bottom:10px">
                <strong>${escape(s.title)}</strong>
                <div class="ste-mini" style="margin-top:2px">${escape(s.detail)}</div>
              </div>`).join("")}
          </div>
        </div>`;
    }

    // --- Side Letters in progress ---
    if (Array.isArray(contract.sideLetters) && contract.sideLetters.length) {
      html += `
        <div class="ste-card">
          <div class="ste-card-head"><h3>Side Letters</h3></div>
          <div class="ste-card-body">
            ${contract.sideLetters.map(s => `
              <div style="margin-bottom:10px">
                <strong>${escape(s.title || '—')}</strong>
                ${s.status ? ` <span class="ste-badge ste-badge-warn">${escape(s.status)}</span>` : ''}
                ${s.targetSigningDate ? `<div class="ste-mini">Target: ${escape(s.targetSigningDate)}</div>` : ''}
                ${s.scope ? `<div class="ste-mini" style="margin-top:4px">${escape(s.scope)}</div>` : ''}
              </div>`).join("")}
          </div>
        </div>`;
    }

    return html;
  }

  // Read-only render of the License Scope on the agreement detail page.
  // Skips rendering entirely if a contract has no scope data attached (older
  // seed contracts without the new fields).
  // Form-grid layout for License Scope on the View page (mirrors the Edit form).
  function renderLicenseScopeFields(contract) {
    if (!contract) return "";
    const hasAnything = contract.exclusivity || (contract.territories||[]).length || (contract.productCategories||[]).length;
    if (!hasAnything) return "";
    const chip = v => `<span class="ste-scope-chip">${escape(v)}</span>`;
    const list = (arr, fallback) => (arr && arr.length) ? arr.map(chip).join(" ") : `<span class="ste-mini">${fallback}</span>`;
    return `
      <div class="ste-card">
        <div class="ste-card-head"><h3>License Scope</h3></div>
        <div class="ste-card-body">
          <div class="ste-form-grid-2">
            <div class="ste-field">
              <div class="ste-lbl">Exclusivity</div>
              <div class="ste-view-val">${escape(contract.exclusivity || '—')}</div>
            </div>
            <div class="ste-field">
              <div class="ste-lbl">Sub-licensing</div>
              <div class="ste-view-val">${escape(contract.subLicensing || '—')}</div>
            </div>
            <div class="ste-field" style="grid-column: 1 / -1">
              <div class="ste-lbl">Territory</div>
              <div class="ste-view-val">${list(contract.territories, '—')}</div>
            </div>
            <div class="ste-field" style="grid-column: 1 / -1">
              <div class="ste-lbl">Product Categories</div>
              <div class="ste-view-val">${list(contract.productCategories, '—')}</div>
            </div>
            <div class="ste-field" style="grid-column: 1 / -1">
              <div class="ste-lbl">Distribution Channels</div>
              <div class="ste-view-val">${list(contract.distributionChannels, '—')}</div>
            </div>
            <div class="ste-field">
              <div class="ste-lbl">Right of First Refusal</div>
              <div class="ste-view-val">${contract.rightOfFirstRefusal ? 'Yes' : 'No'}</div>
            </div>
            <div class="ste-field">
              <div class="ste-lbl">Sell-off period after termination</div>
              <div class="ste-view-val">${contract.sellOffPeriodDays != null ? contract.sellOffPeriodDays + ' days' : '—'}</div>
            </div>
          </div>
        </div>
      </div>`;
  }

  function renderLicenseScopeSummary(contract) {
    if (!contract) return "";
    const hasAnything = contract.exclusivity || (contract.territories||[]).length || (contract.productCategories||[]).length;
    if (!hasAnything) return "";
    const row = (lbl, val) => `<tr><td>${escape(lbl)}</td><td>${val}</td></tr>`;
    const list = (arr, fallback) => (arr && arr.length)
      ? arr.map(v => `<span class="ste-scope-chip">${escape(v)}</span>`).join(" ")
      : `<span class="ste-mini">${fallback}</span>`;
    return `
      <div class="ste-card">
        <div class="ste-card-head"><h3>License Scope</h3></div>
        <div class="ste-card-body">
          <table class="ste-num-table ste-detail-table">
            ${row("Exclusivity", `<strong>${escape(contract.exclusivity || '—')}</strong>`)}
            ${row("Territory", list(contract.territories, '—'))}
            ${row("Product Categories", list(contract.productCategories, '—'))}
            ${row("Distribution Channels", list(contract.distributionChannels, '—'))}
            ${row("Sub-licensing", `<strong>${escape(contract.subLicensing || '—')}</strong>`)}
            ${row("Right of First Refusal", `<strong>${contract.rightOfFirstRefusal ? 'Yes' : 'No'}</strong>`)}
            ${row("Sell-off period after termination", `<strong>${contract.sellOffPeriodDays != null ? contract.sellOffPeriodDays + ' days' : '—'}</strong>`)}
          </table>
        </div>
      </div>`;
  }

  function renderRenewalTimeline(sched, contract, daysToExpiry) {
    // Source reminders from schedule or default to [12, 6, 3, 1] months.
    const raw = (sched && sched.reminders) ? sched.reminders : defaultReminders();
    const reminders = raw.map(r => normalizeReminder(r, contract))
      .sort((a, b) => b.monthsBefore - a.monthsBefore);

    // Only show upcoming ones; sent reminders are implicit and would just be
    // visual noise on an automated cadence.
    const upcoming = reminders.filter(r => reminderStatus(r, contract) !== "sent");

    const chipsHtml = upcoming.length === 0
      ? `<span class="ste-mini" style="color:var(--ste-muted)">No upcoming reminders</span>`
      : upcoming.map(r => {
          const date = reminderResolvedDate(r, contract);
          const dateStr = date ? fmtDate(date.toISOString().slice(0, 10)) : "—";
          const timePart = r.time ? ` ${escape(r.time)}` : '';
          const datePart = r.monthsBefore && !r.customDate
            ? `${r.monthsBefore}mo · ${dateStr}${timePart}`
            : `${dateStr}${timePart}`;
          const recipientCount = (r.recipients || []).length;
          const recipientPart = recipientCount > 0
            ? `<span class="ste-reminder-chip-meta">→ ${recipientCount} recipient${recipientCount===1?'':'s'}</span>`
            : '';
          return `
            <span class="ste-reminder-chip" title="${escape((r.recipients||[]).join(', '))}">
              ${escape(datePart)}${recipientPart}
              <button type="button" data-reminder-remove="${escape(r.id)}" aria-label="Remove">×</button>
            </span>`;
        }).join("");

    return `
      <div class="ste-card">
        <div class="ste-card-head ste-card-head-row">
          <div>
            <h3>Reminders</h3>
          </div>
          <button class="ste-btn ste-btn-ghost ste-btn-mini" data-reminder-add type="button">+ Add reminder</button>
        </div>
        <div class="ste-card-body ste-reminder-chips-wrap">
          ${chipsHtml}
        </div>
      </div>`;
  }

  function renderRenewalVerdict(sched, contract, lic) {
    if (!sched) return "";
    const v = sched.verdict;
    const verdictLabel = { renew: "Renew · 5 years", conditional: "Conditional · Brand Elevation", terminate: "Terminate · Discover successor" }[v] || v;
    const verdictTone = { renew: "ok", conditional: "warn", terminate: "err" }[v] || "info";
    return `
      <div class="ste-card ste-verdict-card ste-verdict-${verdictTone}">
        <div class="ste-card-head">
          <h3>AI Renewal Recommendation</h3>
          <div class="ste-mini"><span class="ste-ai-chip">⚡ AI Generated</span></div>
        </div>
        <div class="ste-card-body">
          <div class="ste-verdict-row">
            <div class="ste-verdict-badge ste-verdict-${verdictTone}-badge">${verdictLabel}</div>
            <div class="ste-verdict-conf">Confidence <strong>${sched.verdictConfidence}%</strong></div>
          </div>
          <div class="ste-verdict-rationale">${escape(sched.verdictRationale)}</div>
        </div>
      </div>`;
  }

  function renderOfferMsg(m, i, allMsgs, contract) {
    const initials = m.author.split(" ").map(s => s[0]).slice(0,2).join("");
    const isOffer = m.offerType === "offer";
    const isCounter = m.offerType === "counter";
    const versionChip = (isOffer || isCounter)
      ? `<span class="ste-offer-chip ste-offer-${m.side || (isOffer ? 'fnf' : 'licensee')}">${isOffer ? 'HQ OFFER' : 'LICENSEE COUNTER'} · v${m.version}</span>`
      : "";
    // Build delta vs prior offer/counter
    let deltaHtml = "";
    if (m.terms) {
      const prior = (allMsgs.slice(0, i).reverse().find(p => p.terms)) || null;
      const fields = [
        ["royaltyPct", "Royalty", v => `${v.toFixed(1)}%`],
        ["minQuarterlyGbp", "Min / Q", v => "£" + v.toLocaleString()],
        ["termYears", "Term", v => `${v} yrs`],
        ["marketingPct", "Mkt Contribution", v => `${v.toFixed(1)}%`],
      ];
      deltaHtml = `
        <div class="ste-offer-terms">
          ${fields.map(([k, label, fmt]) => {
            const cur = m.terms[k];
            if (cur == null) return "";
            const priorV = prior && prior.terms && prior.terms[k];
            const changed = priorV != null && priorV !== cur;
            const dir = changed ? (cur > priorV ? "up" : "down") : "";
            return `
              <div class="ste-offer-term">
                <span class="ste-offer-term-lbl">${label}</span>
                <span class="ste-offer-term-val ${changed ? 'ste-offer-term-changed' : ''}">${fmt(cur)}${changed ? ` <span class="ste-offer-term-dir ste-offer-term-${dir}">${dir === 'up' ? '▲' : '▼'}</span>` : ''}</span>
                ${changed ? `<span class="ste-offer-term-prior">was ${fmt(priorV)}</span>` : ''}
              </div>`;
          }).join("")}
        </div>`;
    }
    return `
      <div class="ste-msg ste-msg-${m.side || 'note'}">
        <div class="ste-avatar">${initials}</div>
        <div class="ste-msg-body-wrap">
          <div class="ste-msg-hd">
            <strong>${escape(m.author)}</strong>
            <span class="ste-mini">· ${escape(m.role)}</span>
            <span class="ste-mini">· ${fmtDateTime(m.at)}</span>
            ${versionChip}
          </div>
          ${deltaHtml}
          <div class="ste-msg-body">${escape(m.body)}</div>
        </div>
      </div>`;
  }

  function openNewOfferModal(contract, thread, lic, isHQ, u) {
    const lastTerms = (thread.messages.slice().reverse().find(m => m.terms) || {}).terms || {
      royaltyPct: contract.royaltyPct, minQuarterlyGbp: contract.minQuarterlyGbp || 500000,
      termYears: 5, marketingPct: contract.marketingPct,
    };
    const sameSideCount = thread.messages.filter(m => m.side === (isHQ ? "fnf" : "licensee")).length;
    const nextVersion = sameSideCount + 1;
    const modal = makeModal(`New ${isHQ ? 'HQ Offer' : 'Licensee Counter'} · v${nextVersion}`, `
      <div class="ste-form-grid-2">
        <label class="ste-field"><div class="ste-lbl">Royalty %</div><input class="ste-input" id="ste-new-roy" type="number" step="0.1" min="0" max="100" value="${lastTerms.royaltyPct || ''}"></label>
        <label class="ste-field"><div class="ste-lbl">Minimum / Quarter (£)</div><input class="ste-input" id="ste-new-min" type="number" step="1000" min="0" value="${lastTerms.minQuarterlyGbp || ''}"></label>
        <label class="ste-field"><div class="ste-lbl">Term (years)</div><input class="ste-input" id="ste-new-term" type="number" step="1" min="1" value="${lastTerms.termYears || 5}"></label>
        <label class="ste-field"><div class="ste-lbl">Marketing Contribution %</div><input class="ste-input" id="ste-new-mkt" type="number" step="0.1" min="0" max="100" value="${lastTerms.marketingPct || 2}"></label>
      </div>
      <label class="ste-field" style="margin-top:14px"><div class="ste-lbl">Cover note (optional)</div><textarea class="ste-input" id="ste-new-note" rows="3" placeholder="Context for the counterparty…"></textarea></label>
    `, [
      { label: "Cancel", kind: "ghost", onClick: () => closeModal(modal) },
      { label: `Send ${isHQ ? 'Offer' : 'Counter'} v${nextVersion}`, kind: "primary", onClick: () => {
        const terms = {
          royaltyPct: parseFloat($("#ste-new-roy").value) || 0,
          minQuarterlyGbp: parseFloat($("#ste-new-min").value) || 0,
          termYears: parseInt($("#ste-new-term").value) || 5,
          marketingPct: parseFloat($("#ste-new-mkt").value) || 0,
        };
        const body = $("#ste-new-note").value.trim() || `${isHQ ? 'HQ' : lic.legalName} ${isHQ ? 'offer' : 'counter'} v${nextVersion}.`;
        STE.mutate(s => {
          let t = (s.negotiationThreads || []).find(x => x.contractId === contract.id);
          const m = {
            author: u.name, role: STE.isHQ(u) ? `HQ ${u.title}` : `${lic.legalName} · ${u.title || ''}`,
            at: new Date().toISOString(), body,
            offerType: isHQ ? "offer" : "counter",
            version: nextVersion,
            side: isHQ ? "fnf" : "licensee",
            terms,
          };
          if (t) t.messages.push(m);
          else { s.negotiationThreads = s.negotiationThreads || []; s.negotiationThreads.push({ contractId: contract.id, messages: [m] }); }
          // Flip whose turn it is. HQ sending → "Terms Sent" (waiting on
          // licensee); licensee sending → "Terms Updated" (waiting on HQ).
          const c = (s.contracts || []).find(x => x.id === contract.id);
          if (c) {
            c.status = isHQ ? "Terms Sent" : "Terms Updated";
            s.auditLog = s.auditLog || [];
            s.auditLog.unshift({
              at: new Date().toISOString(),
              event: isHQ
                ? `HQ sent revised terms v${nextVersion}`
                : `${lic.legalName} sent revised terms v${nextVersion}`,
              actor: u.name,
              contractId: contract.id,
            });
          }
        });
        closeModal(modal);
        contracts();
      }},
    ]);
  }

  // Modal for adding a reminder. Two ways to set the date:
  //   1) Quick preset chips (1, 3, 6, 12 months before expiry)
  //   2) Custom date picker (sets an absolute date independent of termEnd)
  // onAdd receives { id, monthsBefore?, customDate?, status, sentAt }.
  function openReminderModal(contract, onAdd) {
    // Compute a sane default: 1 month before term end (if termEnd known).
    function computeDate(monthsBefore) {
      if (!contract.termEnd) return "";
      const d = new Date(contract.termEnd);
      d.setMonth(d.getMonth() - (monthsBefore || 0));
      return d.toISOString().slice(0, 10);
    }
    let activeMonths = 1;
    let activeDate   = computeDate(1);
    const defaultMsg = `Friendly reminder: the ${contract.id || 'agreement'} term is approaching its end. Let's review renewal terms.`;
    const defaultRecipients = "lead.negotiator@fnf.com, minjung@fnf.com";
    const modal = makeModal("Add Reminder", `
      <div class="ste-field">
        <div class="ste-lbl">Quick presets — months before term end</div>
        <div class="ste-reminder-preset-row">
          ${[1, 3, 6, 12].map(m => `
            <button type="button" class="ste-reminder-preset ${m===1?'active':''}" data-preset="${m}">
              ${m} month${m===1?'':'s'}
            </button>`).join("")}
        </div>
      </div>
      <div class="ste-form-grid-2" style="margin-top:14px">
        <div class="ste-field">
          <div class="ste-lbl">Notification date</div>
          <input class="ste-input" type="date" data-reminder-date value="${escape(activeDate)}">
        </div>
        <div class="ste-field">
          <div class="ste-lbl">Notification time</div>
          <input class="ste-input" type="time" data-reminder-time value="09:00">
        </div>
      </div>
      <div class="ste-mini" style="margin-top:6px">${contract.termEnd ? `Term end: ${fmtDate(contract.termEnd)}` : 'Term end not set yet — date will recompute once Term End is entered.'}</div>
      <div class="ste-field" style="margin-top:14px">
        <div class="ste-lbl">Recipients <span class="ste-mini" style="text-transform:none;letter-spacing:normal">— comma-separated emails</span></div>
        <input class="ste-input" type="text" data-reminder-recipients value="${escape(defaultRecipients)}" placeholder="lead.negotiator@fnf.com, ...">
      </div>
      <div class="ste-field" style="margin-top:14px">
        <div class="ste-lbl">Notification message</div>
        <textarea class="ste-input" data-reminder-msg rows="3" placeholder="Default message will be used if left empty">${escape(defaultMsg)}</textarea>
      </div>
    `, [
      { label: "Cancel", kind: "ghost", onClick: () => closeModal(modal) },
      { label: "Add Reminder", kind: "primary", onClick: () => {
        const dateInp = modal.querySelector("[data-reminder-date]");
        const timeInp = modal.querySelector("[data-reminder-time]");
        const recInp  = modal.querySelector("[data-reminder-recipients]");
        const msgInp  = modal.querySelector("[data-reminder-msg]");
        const finalDate = (dateInp.value || "").trim();
        if (!finalDate) { STEApp.toast("Pick a notification date", "warn"); return; }
        const recipients = (recInp.value || "")
          .split(",").map(s => s.trim()).filter(Boolean);
        if (recipients.length === 0) { STEApp.toast("Add at least one recipient", "warn"); return; }
        const newR = {
          id: `rem-${Date.now()}`,
          status: "upcoming",
          sentAt: null,
          customDate: finalDate,
          time: (timeInp.value || "09:00").trim(),
          recipients,
          message: (msgInp.value || "").trim() || defaultMsg,
        };
        // If the date matches one of the preset months-before-end, also tag
        // monthsBefore for the chip label.
        if (contract.termEnd) {
          const matched = [1, 3, 6, 12].find(m => computeDate(m) === finalDate);
          if (matched) newR.monthsBefore = matched;
        }
        closeModal(modal);
        onAdd(newR);
      }},
    ]);

    const presets = modal.querySelectorAll(".ste-reminder-preset");
    const dateInp = modal.querySelector("[data-reminder-date]");
    presets.forEach(b => {
      b.addEventListener("click", () => {
        const m = parseInt(b.getAttribute("data-preset"));
        activeMonths = m;
        activeDate = computeDate(m);
        dateInp.value = activeDate;
        presets.forEach(x => x.classList.toggle("active", parseInt(x.getAttribute("data-preset")) === m));
      });
    });
    // If user edits date manually, deactivate preset highlight
    dateInp.addEventListener("input", () => {
      presets.forEach(x => {
        const m = parseInt(x.getAttribute("data-preset"));
        x.classList.toggle("active", computeDate(m) === dateInp.value);
      });
    });
  }

  function openBrandElevationModal(contract, lic) {
    const modal = makeModal("Brand Elevation — Conditional Renewal", `
      <p class="ste-mini" style="margin-bottom:14px">Specify the conditions the licensee must accept before renewal can proceed. Acceptance moves them onto a probationary contract with quarterly checkpoint reviews.</p>
      <div class="ste-form-grid-2">
        <label class="ste-field"><div class="ste-lbl">Min uplift (% over current)</div><input class="ste-input" type="number" step="5" min="0" value="20"></label>
        <label class="ste-field"><div class="ste-lbl">Royalty adjustment (pp)</div><input class="ste-input" type="number" step="0.1" value="0.5"></label>
        <label class="ste-field"><div class="ste-lbl">Probation period (quarters)</div><input class="ste-input" type="number" min="1" max="8" value="4"></label>
        <label class="ste-field"><div class="ste-lbl">Renewal term (years)</div><input class="ste-input" type="number" min="1" max="5" value="3"></label>
      </div>
      <div class="ste-field" style="margin-top:14px">
        <div class="ste-lbl">Acceptance conditions</div>
        <div class="ste-checklist">
          <label><input type="checkbox" checked> Quarterly Min review — single miss triggers re-evaluation</label>
          <label><input type="checkbox" checked> Design pass rate ≥ 85% maintained across 4 quarters</label>
          <label><input type="checkbox" checked> Marketing plan submitted on schedule for every season</label>
          <label><input type="checkbox"> HQ right of first refusal on category expansion</label>
        </div>
      </div>
    `, [
      { label: "Cancel", kind: "ghost", onClick: () => closeModal(modal) },
      { label: "Send Conditional Offer", kind: "primary", onClick: () => {
        // Collect modal fields → build a Brand-Elevation offer + post to thread
        const inps = modal.querySelectorAll("input[type='number']");
        const minUplift  = parseFloat(inps[0]?.value) || 0;
        const royaltyAdj = parseFloat(inps[1]?.value) || 0;
        const probationQ = parseInt(inps[2]?.value) || 0;
        const termYears  = parseInt(inps[3]?.value) || 0;
        const conditions = Array.from(modal.querySelectorAll(".ste-checklist input:checked"))
          .map(c => c.parentElement.textContent.trim());
        const newRoyalty = +((contract.royaltyPct || 0) + royaltyAdj).toFixed(2);
        const newMin = Math.round((contract.minQuarterlyGbp || contract.minQuarterlyEur || 0) * (1 + minUplift / 100));
        const u = STE.currentUser();
        STE.mutate(s => {
          let t = (s.negotiationThreads || []).find(x => x.contractId === contract.id);
          if (!t) { t = { contractId: contract.id, messages: [] }; s.negotiationThreads = s.negotiationThreads || []; s.negotiationThreads.push(t); }
          const sameSideCount = t.messages.filter(m => m.side === "fnf").length;
          t.messages.push({
            author: u?.name || "HQ Reviewer",
            role: "HQ · Brand Elevation",
            at: new Date().toISOString(),
            offerType: "offer",
            side: "fnf",
            version: sameSideCount + 1,
            terms: { royaltyPct: newRoyalty, minQuarterlyGbp: newMin, termYears, marketingPct: contract.marketingPct },
            body: `Brand Elevation conditional offer — ${probationQ}Q probation. Conditions:\n• ${conditions.join('\n• ')}`,
          });
          s.auditLog = s.auditLog || [];
          s.auditLog.unshift({
            at: new Date().toISOString(),
            event: `Brand Elevation offer posted — Min +${minUplift}%, Royalty +${royaltyAdj}pp, ${probationQ}Q probation`,
            actor: u?.name || "HQ Reviewer",
            contractId: contract.id, attachment: `${contract.id}_brand_elevation.pdf`,
          });
        });
        closeModal(modal);
        STEApp.toast(`Brand Elevation offer posted to ${lic.legalName} negotiation thread`, "success");
        contracts();
      }},
    ]);
  }

  function openDeleteAgreementModal(row) {
    const c = row.contract;
    const lic = row.licensee || {};
    const target = c ? c.id : row.id;
    const modal = makeModal("Delete Agreement", `
      <div class="ste-warn-bar" style="margin-bottom:16px">⚠ This permanently removes the agreement record from the platform. Audit log entries remain for compliance.</div>
      <p>Delete <strong>${escape(target)}</strong> for <strong>${escape(lic.legalName || '—')}</strong>?</p>
      <p class="ste-mini">Type the agreement ID below to confirm.</p>
      <input class="ste-input" id="ste-del-confirm" type="text" placeholder="${escape(target)}" style="margin-top:8px">
    `, [
      { label: "Cancel", kind: "ghost", onClick: () => closeModal(modal) },
      { label: "Delete agreement", kind: "danger", onClick: () => {
        const input = modal.querySelector("#ste-del-confirm");
        if ((input.value || "").trim() !== target) {
          STEApp.toast("Confirmation text didn't match", "warn"); return;
        }
        STE.mutate(s => {
          if (c) {
            s.contracts = s.contracts.filter(x => x.id !== c.id);
            // Cascade — remove negotiation thread, renewal schedule for this id
            s.negotiationThreads = (s.negotiationThreads || []).filter(t => t.contractId !== c.id);
            if (s.renewalSchedule) delete s.renewalSchedule[c.id];
            s.auditLog = s.auditLog || [];
            s.auditLog.unshift({
              at: new Date().toISOString(),
              event: `Agreement deleted — ${c.id}`,
              actor: (STE.currentUser() || {}).name || "HQ Admin",
              contractId: c.id, attachment: `${c.id}_deletion_record.pdf`,
            });
          }
        });
        closeModal(modal);
        STEApp.toast(`${target} deleted`, "warn");
        contractsList();
      }},
    ]);
  }

  function openTerminationModal(contract, lic) {
    const modal = makeModal("Terminate Agreement", `
      <div class="ste-warn-bar" style="margin-bottom:16px">⚠ Termination is irreversible once notice is served. All checklist items run as parallel workflows after notice.</div>
      <div class="ste-field"><div class="ste-lbl">Termination effective date</div><input class="ste-input" type="date" value="${contract.termEnd}"></div>
      <div class="ste-field" style="margin-top:14px">
        <div class="ste-lbl">Post-termination obligations (auto-tracked)</div>
        <div class="ste-checklist">
          <label><input type="checkbox" checked> Inventory wind-down — 180-day sell-off window after term end</label>
          <label><input type="checkbox" checked> Residual licence — return brand assets, IP, design files</label>
          <label><input type="checkbox" checked> NDA reaffirmation — confidentiality survives 5 years</label>
          <label><input type="checkbox" checked> Account settlement — final royalty true-up + minimum balance</label>
          <label><input type="checkbox" checked> Trigger new licensee discovery for ${lic.country||''}</label>
        </div>
      </div>
      <label class="ste-field" style="margin-top:14px"><div class="ste-lbl">Notice text</div><textarea class="ste-input" rows="4">Per Section 9.2 of ${contract.id}, HQ hereby serves notice of non-renewal effective at term end…</textarea></label>
    `, [
      { label: "Cancel", kind: "ghost", onClick: () => closeModal(modal) },
      { label: "Serve Termination Notice", kind: "danger", onClick: () => {
        const dateInp = modal.querySelector("input[type='date']");
        const effectiveDate = dateInp?.value || contract.termEnd;
        const noticeBody = modal.querySelector("textarea")?.value || "";
        const obligations = Array.from(modal.querySelectorAll(".ste-checklist input:checked"))
          .map(c => c.parentElement.textContent.trim());
        const u = STE.currentUser();
        STE.mutate(s => {
          const c = s.contracts.find(x => x.id === contract.id);
          if (c) {
            c.terminated = {
              servedAt: new Date().toISOString(),
              effectiveDate,
              servedBy: u?.name || "HQ Admin",
              noticeBody,
              obligations,
            };
            c.status = "Terminating";
          }
          // Post a system note into the negotiation thread
          let t = (s.negotiationThreads || []).find(x => x.contractId === contract.id);
          if (!t) { t = { contractId: contract.id, messages: [] }; s.negotiationThreads = s.negotiationThreads || []; s.negotiationThreads.push(t); }
          t.messages.push({
            author: u?.name || "HQ Reviewer",
            role: "HQ · Termination Notice",
            at: new Date().toISOString(),
            body: `Termination notice served · effective ${effectiveDate}.\n\n${noticeBody}`,
          });
          s.auditLog = s.auditLog || [];
          s.auditLog.unshift({
            at: new Date().toISOString(),
            event: `Termination notice served — effective ${effectiveDate}`,
            actor: u?.name || "HQ Admin",
            contractId: contract.id, attachment: `${contract.id}_termination_notice.pdf`,
          });
        });
        closeModal(modal);
        STEApp.toast(`Termination notice served to ${lic.legalName}`, "warn");
        contracts();
      }},
    ]);
  }

  function openAcceptOfferModal(contract, lic, thread) {
    const last = thread.messages.slice().reverse().find(m => m.terms);
    if (!last) {
      STEApp.toast("No structured offer to accept yet — add one via + New Offer first", "warn");
      return;
    }
    const t = last.terms;
    const modal = makeModal("Accept Latest Offer", `
      <p>Accept <strong>${last.offerType === 'offer' ? 'HQ Offer' : 'Licensee Counter'} v${last.version}</strong> from ${escape(last.author)} (${fmtDateTime(last.at)}) as the binding terms for the renewed agreement.</p>
      <table class="ste-num-table" style="margin-top:14px">
        <tr><td>Royalty</td><td>${(t.royaltyPct||0).toFixed(1)}%</td></tr>
        <tr><td>Minimum / Quarter</td><td>£${(t.minQuarterlyGbp||0).toLocaleString()}</td></tr>
        <tr><td>Term</td><td>${t.termYears||0} years</td></tr>
        <tr><td>Marketing Contribution</td><td>${(t.marketingPct||0).toFixed(1)}%</td></tr>
      </table>
      <p class="ste-mini" style="margin-top:14px">A new contract record will be generated and the existing agreement marked as Renewed.</p>
    `, [
      { label: "Cancel", kind: "ghost", onClick: () => closeModal(modal) },
      { label: "Accept & Generate Contract", kind: "primary", onClick: () => {
        const u = STE.currentUser();
        const acceptedTerms = last.terms || {};
        // Create a successor contract record with the accepted terms +
        // status: "Draft" so it shows on the Agreements list under the licensee.
        // ID follows the canonical AGR-{YYYY}-{NNN} convention.
        const draftYear = String(new Date().getFullYear());
        const yearRe = new RegExp(`^AGR-${draftYear}-(\\d+)$`);
        const existing = (STE.get().contracts || [])
          .map(c => (c.id || "").match(yearRe))
          .filter(Boolean).map(m => parseInt(m[1]));
        const nextSeq = (existing.length ? Math.max(...existing) : 0) + 1;
        const newId = `AGR-${draftYear}-${String(nextSeq).padStart(3, "0")}`;
        STE.mutate(s => {
          s.contracts = s.contracts || [];
          s.contracts.push({
            id: newId,
            licenseeId: contract.licenseeId,
            type: "Master License",
            signedAt: new Date().toISOString().slice(0,10),
            termStart: new Date(new Date(contract.termEnd).getTime() + 86400000).toISOString().slice(0,10),
            termEnd: (() => { const d = new Date(contract.termEnd); d.setFullYear(d.getFullYear() + (acceptedTerms.termYears || 5)); return d.toISOString().slice(0,10); })(),
            renewalOption: `${acceptedTerms.termYears || 5}y`,
            royaltyPct: acceptedTerms.royaltyPct || contract.royaltyPct,
            marketingPct: acceptedTerms.marketingPct || contract.marketingPct,
            advertisingPct: contract.advertisingPct,
            minQuarterlyGbp: acceptedTerms.minQuarterlyGbp || contract.minQuarterlyGbp,
            minAnnualGbp: (acceptedTerms.minQuarterlyGbp || contract.minQuarterlyGbp || 0) * 4,
            paymentTerms: contract.paymentTerms,
            counterpartyName: contract.counterpartyName,
            counterpartyTitle: contract.counterpartyTitle,
            succeedsContractId: contract.id,
            status: "Draft",
            amendments: [],
          });
          // Mark the prior thread as concluded
          const t = (s.negotiationThreads || []).find(x => x.contractId === contract.id);
          if (t) {
            t.messages.push({
              author: u?.name || "HQ Reviewer",
              role: "HQ · Agreement Concluded",
              at: new Date().toISOString(),
              body: `Accepted ${last.offerType} v${last.version}. New contract ${newId} drafted with these terms.`,
            });
          }
          s.auditLog = s.auditLog || [];
          s.auditLog.unshift({
            at: new Date().toISOString(),
            event: `Renewal accepted — new contract ${newId} drafted`,
            actor: u?.name || "HQ Reviewer",
            contractId: newId, attachment: `${newId}_signature_pack.pdf`,
          });
        });
        closeModal(modal);
        STEApp.toast(`Offer accepted — new contract ${newId} drafted for ${lic.legalName}`, "success");
        contracts();
      }},
    ]);
  }

  // Lightweight modal helper for Flow D dialogs — uses the existing
  // .ste-modal-overlay / .ste-modal / .ste-modal-hd / .ste-modal-body /
  // .ste-modal-foot styles defined in app.css.
  function makeModal(title, bodyHtml, buttons) {
    const back = document.createElement("div");
    back.className = "ste-modal-overlay";
    back.innerHTML = `
      <div class="ste-modal">
        <div class="ste-modal-hd"><h2>${title}</h2><button class="ste-modal-close" type="button" aria-label="Close">×</button></div>
        <div class="ste-modal-body">${bodyHtml}</div>
        <div class="ste-modal-foot"></div>
      </div>`;
    document.body.appendChild(back);
    const actions = back.querySelector(".ste-modal-foot");
    buttons.forEach(b => {
      const cls = b.kind === "primary" ? "ste-btn-primary"
                : b.kind === "danger"  ? "ste-btn-danger"
                : "ste-btn-ghost";
      const btn = document.createElement("button");
      btn.className = `ste-btn ${cls}`;
      btn.type = "button";
      btn.textContent = b.label;
      if (b.disabled) btn.disabled = true;
      if (b.onClick) btn.addEventListener("click", b.onClick);
      actions.appendChild(btn);
    });
    back.querySelector(".ste-modal-close").addEventListener("click", () => closeModal(back));
    back.addEventListener("click", (e) => { if (e.target === back) closeModal(back); });
    return back;
  }
  function closeModal(back) {
    if (back && back.parentNode) back.parentNode.removeChild(back);
  }

  // ============================ FORGOT PASSWORD ============================
  function forgot() {
    let sec = document.querySelector('section[data-page="forgot"]');
    if (!sec) {
      sec = document.createElement("section");
      sec.setAttribute("data-page", "forgot");
      document.body.appendChild(sec);
    }
    // Hide all other sections
    document.querySelectorAll("section[data-page]").forEach(s => { s.hidden = s.dataset.page !== "forgot"; });
    sec.hidden = false;

    sec.innerHTML = `
      <div class="ste-login-page">
        <div class="ste-login-card">
          <div class="ste-forgot-header">
            <h1 class="ste-forgot-title">${t("reset_password")}</h1>
          </div>

          <div id="ste-forgot-stage-1">
            <p class="ste-login-blurb">${t("forgot_blurb")}</p>
            <form id="ste-forgot-form">
              <div class="ste-field">
                <label for="ste-forgot-email">${t("email_label")}</label>
                <div class="ste-input-shell">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  <input id="ste-forgot-email" type="email" placeholder="${t("email_placeholder")}" autocomplete="email" required>
                </div>
              </div>
              <button id="ste-forgot-submit" class="ste-btn ste-btn-primary ste-btn-block" type="submit">${t("send_reset")}</button>
            </form>
            <a href="#/login" class="ste-link ste-block" style="margin-top:18px">${t("back_to_signin")}</a>
          </div>

          <div id="ste-forgot-stage-2" hidden>
            <div class="ste-success-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
            </div>
            <h2 class="ste-forgot-success-title">${t("check_inbox")}</h2>
            <p class="ste-login-blurb">${t("forgot_success_prefix") ? t("forgot_success_prefix") + ' ' : ''}<strong id="ste-forgot-sent-to"></strong> ${t("forgot_success")}</p>
            <a href="#/login" class="ste-btn ste-btn-ghost ste-btn-block">${t("back_to_signin_btn")}</a>
          </div>
        </div>
      </div>`;

    const form = $("#ste-forgot-form", sec);
    const emailInput = $("#ste-forgot-email", sec);
    const submitBtn = $("#ste-forgot-submit", sec);

    async function doReset(e) {
      if (e) e.preventDefault();
      const email = (emailInput.value || "").trim();
      if (!email) { STEApp.toast(t("enter_email_warn"), "warn"); return; }
      submitBtn.disabled = true;
      const orig = submitBtn.innerHTML;
      submitBtn.innerHTML = `<span class="ste-spin"></span> ${t("sending")}`;
      await sleep(1100);
      // Always succeed (no email enumeration)
      $("#ste-forgot-stage-1", sec).hidden = true;
      $("#ste-forgot-sent-to", sec).textContent = email;
      $("#ste-forgot-stage-2", sec).hidden = false;
      submitBtn.innerHTML = orig;
      submitBtn.disabled = false;
    }
    if (form) form.addEventListener("submit", doReset);
    if (submitBtn) submitBtn.addEventListener("click", doReset);
  }

  // Shared filter-label helper — collapses the selected set into the
  // Agreements-style summary: empty / "all" → no value (button shows base
  // label), 1 → the value itself, 2+ → "X selected". Used by every page
  // wiring an .ste-fdrop multi-checkbox dropdown so the chrome reads the
  // same everywhere.
  function multiLabel(sel, all) {
    const list = Array.isArray(sel) ? sel : [];
    if (list.length === 0 || list.length === all.length) return { val: "", active: false };
    if (list.length === 1) return { val: escape(String(list[0])), active: true };
    return { val: `${list.length} selected`, active: true };
  }
  global.STEScreens = { login, home, hq, sales, inventory, design, season, distribution, contracts, forgot, multiCheckboxPanel, multiLabel, makeModal, closeModal };
})(window);
