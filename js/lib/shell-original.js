/* =========================================================
   Shared shell renderer for STE Operations Platform.
   Renders <ste-shell active="home"> into sidebar + header.
   ========================================================= */
(function () {
  const NAV = [
    { id: 'home',     label: 'Home',            href: '02 Dashboard.html',         icon: 'home' },
    { id: 'sales',    label: 'Sales',           href: '03 Sales.html',             icon: 'sales' },
    { id: 'inventory',label: 'Inventory',       href: '04 Inventory.html',         icon: 'inventory' },
    { id: 'design',   label: 'Design Approval', href: '05 Design Approval.html',   icon: 'design', badge: 3 },
    { id: 'season',   label: 'Season Plan',     href: '06 Season Plan.html',       icon: 'season' },
    { id: 'contracts',label: 'Contracts',       href: '07 Contracts.html',         icon: 'contract' },
    { id: 'guide',    label: 'Guide / FAQ',     href: '08 Guide.html',             icon: 'guide' },
  ];

  const ICONS = {
    home: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12 12 4l9 8"/><path d="M5 10v10h14V10"/></svg>',
    sales: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l5-5 4 4 8-8"/><path d="M14 8h7v7"/></svg>',
    inventory: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></svg>',
    design: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="7.5" cy="10.5" r="1.2"/><circle cx="11.5" cy="7.5" r="1.2"/><circle cx="16" cy="10" r="1.2"/><path d="M14 16c2 0 3-1 3-2.5S15.5 12 13.5 12.5"/></svg>',
    season: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M8 3v4M16 3v4"/></svg>',
    contract: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>',
    guide: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5V21h16"/></svg>',
    bell: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>',
    search: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
    chev: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    logout: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>',
    help: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7"/><path d="M12 17h.01"/></svg>',
  };

  function renderShell(host) {
    const active = host.getAttribute('active') || 'home';
    const breadcrumb = host.getAttribute('breadcrumb') || NAV.find(n => n.id === active)?.label || '';
    const userName = host.getAttribute('user-name') || 'James Smith';
    const userRole = host.getAttribute('user-role') || 'Licensee Admin · BBUK';
    const userInit = (host.getAttribute('user-initials') || userName.split(' ').map(s => s[0]).slice(0,2).join('')).toUpperCase();
    const licensee = host.getAttribute('licensee') || 'BBUK · Best of Britain Ltd';

    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';
    sidebar.innerHTML = `
      <div class="sidebar-brand">
        <span class="mark">ST</span>
        <div class="name">STE Platform<small>Operations · v0.1</small></div>
      </div>
      <nav class="sidebar-nav">
        <div class="sidebar-section">Workspace</div>
        ${NAV.map(n => `
          <a class="nav-item ${n.id === active ? 'active' : ''}" href="${n.href}">
            <span class="icn">${ICONS[n.icon]}</span>
            <span>${n.label}</span>
            ${n.badge ? `<span class="badge">${n.badge}</span>` : ''}
          </a>
        `).join('')}
      </nav>
      <div class="sidebar-footer">
        <span>James Smith</span>
        <span class="env">DEMO</span>
      </div>
    `;

    const header = document.createElement('header');
    header.className = 'header';
    header.innerHTML = `
      <div class="header-title">
        <span>STE Operations Platform</span>
        <span class="crumb-sep">/</span>
        <strong>${breadcrumb}</strong>
      </div>
      <div class="header-spacer"></div>
      <div class="header-search">
        ${ICONS.search}
        <input type="text" placeholder="Search orders, designs, contracts…" />
        <span class="mono" style="font-size:10px;color:#9ca3af;border:1px solid #e5e7eb;padding:1px 5px;border-radius:3px;">⌘K</span>
      </div>
      <div class="header-licensee" title="Switch licensee">
        <span class="flag" aria-hidden="true"></span>
        <span class="lab"><b>BBUK</b><span>· Best of Britain Ltd</span></span>
        <span class="chev">${ICONS.chev}</span>
      </div>
      <div class="header-icon-btn" title="Help">${ICONS.help}</div>
      <div class="header-icon-btn" title="Notifications">
        ${ICONS.bell}
        <span class="dot"></span>
      </div>
      <div class="header-user" title="Account">
        <span class="avatar">${userInit}</span>
        <span class="who"><b>${userName}</b><span>${userRole}</span></span>
        <span style="color:#9ca3af;">${ICONS.chev}</span>
      </div>
    `;

    host.replaceWith(sidebar);
    sidebar.after(...[]);
    // We need: <div class="app"><sidebar/><div class="main-col"><header/>...content...</div></div>
    // Let's instead expect the page to give us the right container.
  }

  // Better approach: this script provides a function the page calls,
  // and an element the page declares.
  class STEShell extends HTMLElement {
    connectedCallback() {
      const active = this.getAttribute('active') || 'home';
      const breadcrumb = this.getAttribute('breadcrumb') || NAV.find(n => n.id === active)?.label || '';
      const userName = this.getAttribute('user-name') || 'James Smith';
      const userRole = this.getAttribute('user-role') || 'Licensee Admin · BBUK';
      const userInit = (this.getAttribute('user-initials') || userName.split(' ').map(s => s[0]).slice(0,2).join('')).toUpperCase();
      const licenseeCode = this.getAttribute('licensee-code') || 'BBUK';
      const licenseeName = this.getAttribute('licensee-name') || 'Best of Britain Ltd';

      this.innerHTML = `
        <aside class="sidebar">
          <div class="sidebar-brand">
            <span class="mark">ST</span>
            <div class="name">STE Platform<small>OPERATIONS · v0.1</small></div>
          </div>
          <nav class="sidebar-nav">
            <div class="sidebar-section">Workspace</div>
            ${NAV.map(n => `
              <a class="nav-item ${n.id === active ? 'active' : ''}" href="${n.href}">
                <span class="icn">${ICONS[n.icon]}</span>
                <span>${n.label}</span>
                ${n.badge ? `<span class="badge">${n.badge}</span>` : ''}
              </a>
            `).join('')}
          </nav>
          <div class="sidebar-footer">
            <span>${userName}</span>
            <span class="env">DEMO</span>
          </div>
        </aside>
        <div class="main-col">
          <header class="header">
            <div class="header-title">
              <span>STE Operations Platform</span>
              <span class="crumb-sep">/</span>
              <strong>${breadcrumb}</strong>
            </div>
            <div class="header-spacer"></div>
            <div class="header-search">
              ${ICONS.search}
              <input type="text" placeholder="Search orders, designs, contracts…" />
              <span class="mono" style="font-size:10px;color:#9ca3af;border:1px solid #e5e7eb;padding:1px 5px;border-radius:3px;">⌘K</span>
            </div>
            <div class="header-licensee" title="Switch licensee">
              <span class="flag" aria-hidden="true"></span>
              <span class="lab"><b>${licenseeCode}</b><span>· ${licenseeName}</span></span>
              <span class="chev">${ICONS.chev}</span>
            </div>
            <div class="header-icon-btn" title="Help">${ICONS.help}</div>
            <div class="header-icon-btn" title="Notifications">
              ${ICONS.bell}
              <span class="dot"></span>
            </div>
            <div class="header-user" title="Account">
              <span class="avatar">${userInit}</span>
              <span class="who"><b>${userName}</b><span>${userRole}</span></span>
              <span style="color:#9ca3af;">${ICONS.chev}</span>
            </div>
          </header>
          <main class="main">
            ${this.innerHTML}
          </main>
        </div>
      `;
      this.classList.add('app');
    }
  }
  customElements.define('ste-shell', STEShell);

  // Wireframe badge
  document.addEventListener('DOMContentLoaded', () => {
    if (!document.querySelector('.wf-badge')) {
      const b = document.createElement('div');
      b.className = 'wf-badge';
      b.textContent = 'WIREFRAME · v0.1 (May 2026)';
      document.body.appendChild(b);
    }
  });
})();
