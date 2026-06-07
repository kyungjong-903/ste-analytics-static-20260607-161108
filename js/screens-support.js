/* =========================================================
   Support (#/support)
   Public: Contact Support, Guides, FAQs
   Staff/Admin: also add / edit / delete guides + FAQs
   Edit is inline (same visual frame as view) so the UI stays unified.
   ========================================================= */
(function (global) {
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  // Per-session map of which items are in edit mode + draft state for a "new" entry
  const editing = { guide: new Set(), faq: new Set(), newGuide: false, newFaq: false };

  function ensureSection() {
    let sec = document.querySelector('section[data-page="support"]');
    if (!sec) {
      sec = document.createElement("section");
      sec.setAttribute("data-page", "support");
      sec.hidden = true;
      document.body.appendChild(sec);
    }
    return sec;
  }

  function ensureSeed() {
    STE.mutate(s => {
      if (!s.guides) s.guides = [
        { id: "g-1", title: "Filing a quarterly Sales Statement", body: "Use the standard template. The platform validates Style Codes against the master catalogue and FX rates against ECB daily references. Errors must be resolved before submission.", updatedAt: "2026-02-12" },
        { id: "g-2", title: "26SS Brand Direction — Damarindo Refined", body: "Refined active silhouettes (no oversized fits), elegant palette (max chroma 60), minimum two Damarindo signature cues per silhouette.", updatedAt: "2025-12-01" },
        { id: "g-3", title: "Invoice variance review", body: "When AI recompute differs from licensee figures by ≤ 0.5%, Mutual Agreement is recommended. Larger variances should be sent back to the licensee for review (7-day SLA).", updatedAt: "2026-03-04" },
      ];
      if (!s.faqs) s.faqs = [
        { id: "f-1", q: "When are sales statements due?", a: "Quarterly, within 30 days of quarter end. Q1 is due by 30 April." },
        { id: "f-2", q: "What FX rate should I use?", a: "Always the ECB published daily rate matching the transaction date. The platform cross-validates this on upload." },
        { id: "f-3", q: "How long does design approval take?", a: "AI pre-screening is instant. F&F review typically resolves within 2–5 business days. Brand Director final adds ~2 days." },
        { id: "f-4", q: "Can I edit a submitted statement?", a: "No. Submit a corrected version; the prior file remains in the audit log." },
      ];
    });
  }

  function support() {
    const sec = ensureSection();
    const u = STE.currentUser();
    if (!u) { location.hash = "#/login"; return; }
    ensureSeed();
    const canEdit = STE.isHQ(u);
    const state = STE.get();
    const guides = state.guides || [];
    const faqs = state.faqs || [];

    document.querySelectorAll("section[data-page]").forEach(s => { s.hidden = s.dataset.page !== "support"; });
    sec.hidden = false;

    // Wrap content in ste-shell so the regular sidebar + header are present
    const lic = STE.currentLicensee();
    sec.innerHTML = `
      <ste-shell active="support" breadcrumb="Help Center"
        user-name="${u.name}" user-role="${u.title || ''}" user-initials="${(u.name||'?').split(/\s+/).map(s=>s[0]).slice(0,2).join('').toUpperCase()}"
        licensee-code="${lic ? lic.id : 'F&F HQ'}" licensee-name="${lic ? lic.legalName : 'Global Admin View'}">
      <div class="ste-screen-pad">
        <div class="ste-section-hd">
          <div class="ste-page-crumbs">
            <a href="#/${STE.isHQ(u) ? 'hq' : 'home'}">Home</a>
            <span class="sep">/</span>
            <span class="cur">Help Center</span>
          </div>
          <h1>Help Center</h1>
        </div>

        <div class="ste-form-card ste-help-card">
          <div class="ste-form-section">
            <div class="ste-form-section-hd"><h3>Contact</h3></div>
            <p class="ste-mini" style="margin:0 0 14px">Reach the Sergio Tacchini Global AI Agent team by email — typically a one business day response, critical issues escalated immediately.</p>
            <a class="ste-btn ste-btn-primary" href="mailto:ste-support@fnf.co.kr?subject=Sergio Tacchini Global AI Agent">Email Support</a>
          </div>
        </div>

        ${renderEntryList("Guides", "guide", guides, canEdit, editing.newGuide, editing.guide)}
        ${renderEntryList("FAQs", "faq", faqs, canEdit, editing.newFaq, editing.faq)}
      </div>
      </ste-shell>`;

    wireSection(sec, canEdit);
  }

  function renderEntryList(label, kind, items, canEdit, draftOpen, editIds) {
    return `
      <div class="ste-form-card ste-help-card">
        <div class="ste-help-list-hd">
          <h3>${escape(label)}</h3>
          <span class="ste-mini">${items.length} ${items.length === 1 ? label.slice(0,-1) : label}</span>
          ${canEdit ? `<button class="ste-btn ste-btn-primary" data-act="new-${kind}" ${draftOpen?'disabled':''} style="margin-left:auto">+ New ${label.slice(0,-1)}</button>` : ""}
        </div>

        ${draftOpen ? renderEditor(kind, null) : ""}

        <ul class="ste-support-list">
          ${items.length === 0 && !draftOpen ? `<li class="ste-empty-cell">No ${label} yet.</li>` :
            items.map(item => editIds.has(item.id)
              ? `<li>${renderEditor(kind, item)}</li>`
              : `<li>${renderViewer(kind, item, canEdit)}</li>`
            ).join("")}
        </ul>
      </div>`;
  }

  function renderViewer(kind, item, canEdit) {
    const title = kind === "guide" ? item.title : item.q;
    const body = kind === "guide" ? item.body : item.a;
    const meta = kind === "guide" && item.updatedAt ? `Updated ${escape(item.updatedAt)}` : "";
    return `
      <article class="ste-support-item" data-id="${item.id}" data-kind="${kind}">
        <header class="ste-support-item-hd">
          <h4>${escape(title)}</h4>
          ${meta ? `<span class="ste-mini">${meta}</span>` : ""}
          ${canEdit ? `<div class="ste-support-item-actions">
            <button class="ste-btn ste-btn-link" data-edit-${kind}="${item.id}">Edit</button>
            <button class="ste-btn ste-btn-link ste-btn-danger" data-del-${kind}="${item.id}">Delete</button>
          </div>` : ""}
        </header>
        <div class="ste-support-item-body">${escape(body)}</div>
      </article>`;
  }

  function renderEditor(kind, item) {
    const isNew = !item;
    const titleVal = item ? (kind === "guide" ? item.title : item.q) : "";
    const bodyVal = item ? (kind === "guide" ? item.body : item.a) : "";
    const titleLbl = kind === "guide" ? "Title" : "Question";
    const bodyLbl = kind === "guide" ? "Content" : "Answer";
    return `
      <article class="ste-support-item ste-support-item-edit" data-id="${item?.id || ''}" data-kind="${kind}" ${isNew ? 'data-new="1"' : ''}>
        <header class="ste-support-item-hd">
          <div class="ste-support-item-eyebrow">${isNew ? `New ${kind === 'guide' ? 'guide' : 'FAQ'}` : `Editing ${kind === 'guide' ? 'guide' : 'FAQ'}`}</div>
        </header>
        <div class="ste-support-item-body">
          <div class="ste-form-field" style="margin-bottom:14px">
            <label>${titleLbl}</label>
            <input class="ste-input" data-field="title" value="${escape(titleVal)}">
          </div>
          <div class="ste-form-field">
            <label>${bodyLbl}</label>
            <textarea class="ste-input" data-field="body" rows="5">${escape(bodyVal)}</textarea>
          </div>
        </div>
        <footer class="ste-support-item-foot">
          <button class="ste-btn ste-btn-ghost" data-cancel>Cancel</button>
          <button class="ste-btn ste-btn-primary" data-save>${isNew ? "Publish" : "Save"}</button>
        </footer>
      </article>`;
  }

  function wireSection(sec, canEdit) {
    if (!canEdit) return;

    // Open new editor
    $("[data-act='new-guide']", sec)?.addEventListener("click", () => {
      editing.newGuide = true;
      support();
    });
    $("[data-act='new-faq']", sec)?.addEventListener("click", () => {
      editing.newFaq = true;
      support();
    });

    // Edit existing
    $$("[data-edit-guide]", sec).forEach(b => b.addEventListener("click", () => {
      editing.guide.add(b.getAttribute("data-edit-guide"));
      support();
    }));
    $$("[data-edit-faq]", sec).forEach(b => b.addEventListener("click", () => {
      editing.faq.add(b.getAttribute("data-edit-faq"));
      support();
    }));

    // Delete
    $$("[data-del-guide]", sec).forEach(b => b.addEventListener("click", () => {
      const id = b.getAttribute("data-del-guide");
      if (!confirm("Delete this guide? This cannot be undone.")) return;
      STE.mutate(s => { s.guides = s.guides.filter(g => g.id !== id); });
      STEApp.toast("Guide deleted", "info");
      support();
    }));
    $$("[data-del-faq]", sec).forEach(b => b.addEventListener("click", () => {
      const id = b.getAttribute("data-del-faq");
      if (!confirm("Delete this FAQ? This cannot be undone.")) return;
      STE.mutate(s => { s.faqs = s.faqs.filter(f => f.id !== id); });
      STEApp.toast("FAQ deleted", "info");
      support();
    }));

    // Cancel + Save on each editor
    $$(".ste-support-item-edit", sec).forEach(card => {
      const kind = card.getAttribute("data-kind");
      const id = card.getAttribute("data-id");
      const isNew = card.getAttribute("data-new") === "1";

      card.querySelector("[data-cancel]")?.addEventListener("click", () => {
        if (isNew) {
          if (kind === "guide") editing.newGuide = false;
          else editing.newFaq = false;
        } else {
          (kind === "guide" ? editing.guide : editing.faq).delete(id);
        }
        support();
      });
      card.querySelector("[data-save]")?.addEventListener("click", () => {
        const title = card.querySelector('[data-field="title"]').value.trim();
        const body = card.querySelector('[data-field="body"]').value.trim();
        if (!title || !body) { STEApp.toast("Please fill all fields", "warn"); return; }
        STE.mutate(s => {
          if (kind === "guide") {
            s.guides = s.guides || [];
            if (isNew) s.guides.unshift({ id: "g-" + Math.random().toString(36).slice(2,8), title, body, updatedAt: new Date().toISOString().slice(0,10) });
            else {
              const g = s.guides.find(x => x.id === id);
              g.title = title; g.body = body; g.updatedAt = new Date().toISOString().slice(0,10);
            }
          } else {
            s.faqs = s.faqs || [];
            if (isNew) s.faqs.unshift({ id: "f-" + Math.random().toString(36).slice(2,8), q: title, a: body });
            else {
              const f = s.faqs.find(x => x.id === id);
              f.q = title; f.a = body;
            }
          }
        });
        if (isNew) {
          if (kind === "guide") editing.newGuide = false;
          else editing.newFaq = false;
        } else {
          (kind === "guide" ? editing.guide : editing.faq).delete(id);
        }
        STEApp.toast(isNew ? "Published" : "Saved", "success");
        support();
      });
    });
  }

  function escape(s) { return String(s||"").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c])); }

  global.STESupport = { support };
})(window);
