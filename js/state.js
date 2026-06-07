/* =========================================================
   STE Operations Platform — central state store.
   localStorage-backed, JSON-serialized, with a tiny pub/sub.
   ========================================================= */
(function (global) {
  const KEY = "ste.state.v13";
  const SESSION_KEY = "ste.session.v13";

  // Clean up old-version keys so stale data doesn't haunt us
  try {
    for (let v = 1; v <= 12; v++) {
      localStorage.removeItem(`ste.state.v${v}`);
      localStorage.removeItem(`ste.session.v${v}`);
    }
  } catch (e) {}

  const subs = new Set();
  let _state = null;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { console.warn("state load failed", e); }
    return null;
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(_state));
    subs.forEach((fn) => { try { fn(_state); } catch (e) { console.error(e); } });
  }

  // One-time key renames so saved state from older builds carries over after
  // internal renames (the legacy "atelier*" keys → design*/sample*). Returns
  // true when it changed something so the caller can persist.
  function migrateStateKeys(st) {
    if (!st) return false;
    const RENAMES = {
      atelierSubmissions: "designSubmissions",
      atelierSampleRecords: "sampleRecords",
      atelierSampleBatches: "sampleBatches",
    };
    let changed = false;
    Object.keys(RENAMES).forEach((oldK) => {
      if (st[oldK] === undefined) return;
      const newK = RENAMES[oldK];
      if (st[newK] === undefined) st[newK] = st[oldK];
      delete st[oldK];
      changed = true;
    });
    return changed;
  }

  async function seedIfEmpty() {
    if (_state) return;
    // Prefer inlined seed (works under file://); fall back to fetch for dev
    if (typeof STE_SEED !== "undefined" && STE_SEED) {
      _state = JSON.parse(JSON.stringify(STE_SEED));
    } else {
      const r = await fetch("data/seed.json");
      _state = await r.json();
    }
    save();
  }

  async function init() {
    _state = load();
    if (_state && migrateStateKeys(_state)) save();
    // Re-seed when the inlined seed bumps SEED_VERSION beyond what the saved
    // state was last initialised with — without this, demo additions (new
    // sample contracts, etc.) never reach users who already have localStorage.
    const seedV = (typeof STE_SEED !== "undefined" && STE_SEED && STE_SEED.seedVersion) || 0;
    if (_state && seedV && (_state.seedVersion || 0) < seedV) {
      console.log(`[STE] Seed bumped (${_state.seedVersion || 0} → ${seedV}); resetting state.`);
      _state = null;
    }
    if (!_state) await seedIfEmpty();
  }

  function get() { return _state; }
  function mutate(fn) { fn(_state); save(); }
  function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }

  async function reset() {
    // Restore the seeded sample data but keep the user signed in as the same
    // account — a demo data reset shouldn't log you out or switch accounts.
    // (SESSION_KEY is intentionally left in place.)
    localStorage.removeItem(KEY);
    _state = null;
    await seedIfEmpty();
  }

  // Session — current user + currently-viewed licensee context.
  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
    catch { return null; }
  }
  function setSession(s) {
    if (s == null) localStorage.removeItem(SESSION_KEY);
    else localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    subs.forEach((fn) => { try { fn(_state); } catch (e) { console.error(e); } });
  }

  function currentUser() {
    const s = getSession();
    if (!s) return null;
    return (_state.users || []).find(u => u.id === s.userId) || null;
  }
  function currentLicensee() {
    const u = currentUser();
    const s = getSession();
    if (!u) return null;
    // Licensee users see their own org; F&F (no licenseeId) can pin a licensee
    // via session.viewLicenseeId.
    const id = u.licenseeId || (s && s.viewLicenseeId) || ((_state.licensees||[])[0]||{}).id;
    return (_state.licensees || []).find(l => l.id === id) || null;
  }

  // Selectors
  function selectors() {
    const st = _state;
    return {
      licensees: () => st.licensees,
      licensee: (id) => st.licensees.find(l => l.id === id),
      contract: (licenseeId) => st.contracts.find(c => c.licenseeId === licenseeId),
      season: (code) => st.seasons.find(s => s.code === code) || st.seasons[0],
      currentSeason: () => st.seasons.find(s => s.code === st.currentSeason) || st.seasons[0],
      designs: (licenseeId, season) => st.designs.filter(d => d.licenseeId === licenseeId && d.season === season),
      design: (id) => st.designs.find(d => d.id === id),
      salesStatements: (licenseeId) => st.salesStatements.filter(s => s.licenseeId === licenseeId),
      seasonPlan: (licenseeId, season, subplan) => st.seasonPlans.find(p => p.licenseeId === licenseeId && p.season === season && p.subplan === subplan),
      negotiationThread: (contractId) => (st.negotiationThreads || []).find(t => t.contractId === contractId) || {messages: []},
      renewalSchedule: (contractId) => (st.renewalSchedule || {})[contractId] || null,
      similarApproved: () => st.similarApproved || [],
      currentStatement: () => st.currentStatement,
      currentSettlement: () => st.currentSettlement,
      auditLog: (contractId) => (st.auditLog || []).filter(e => !contractId || e.contractId === contractId),
    };
  }

  // Role helpers — the platform has three roles:
  //   administrator: full F&F internal admin (workspace, users, audit access)
  //   staff:         F&F internal but not admin (operations only)
  //   licensee:      external licensee user
  // Org membership is now driven by `licenseeId`, role is just admin/user.
  function isHQ(u)       { u = u || currentUser(); return !!u && !u.licenseeId; }
  function isAdmin(u)    { u = u || currentUser(); return !!u && u.role === "administrator"; }
  function isLicensee(u) { u = u || currentUser(); return !!u && !!u.licenseeId; }

  global.STE = {
    init, get, mutate, subscribe, reset,
    getSession, setSession, currentUser, currentLicensee, selectors,
    isHQ, isAdmin, isLicensee,
  };
})(window);
