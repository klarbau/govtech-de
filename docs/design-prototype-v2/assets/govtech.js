/* GovTech DE — shared header/sidebar injection + lucide init.
   Each page sets window.GT_ACTIVE = 'dashboard' | 'posteingang' | ... before including this. */
(function () {
  const NAV_MAIN = [
    { id: 'dashboard',  href: 'dashboard.html',  label: 'Dashboard',   icon: 'home' },
    { id: 'posteingang',href: 'posteingang.html',label: 'Posteingang', icon: 'mail' },
    { id: 'stammdaten', href: 'stammdaten.html', label: 'Stammdaten',  icon: 'user' },
    { id: 'vorgaenge',  href: 'vorgaenge.html',  label: 'Vorgänge',    icon: 'folder' },
    { id: 'dokumente',  href: 'dokumente.html',  label: 'Dokumente',   icon: 'file-text' },
    { id: 'termine',    href: 'termine.html',    label: 'Termine',     icon: 'calendar' },
    { id: 'steuer',     href: 'steuer.html',     label: 'Steuer',      icon: 'euro' },
    { id: 'familie',    href: 'familie.html',    label: 'Familie',     icon: 'users' },
    { id: 'assistent',  href: 'assistent.html',  label: 'Assistent',   icon: 'message-circle' },
    { id: 'datenschutz',href: 'datenschutz.html',label: 'Datenschutz', icon: 'shield' },
  ];
  const NAV_BOTTOM = [
    { href: 'index.html', label: 'Hilfe & Kontakt', icon: 'help-circle' },
    { href: 'login.html', label: 'Abmelden',        icon: 'log-out' },
  ];

  const active = window.GT_ACTIVE || '';
  const PARTHENON = `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M16 3.5 3.5 9.5h25L16 3.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M5 11.5V23M11 11.5V23M16 11.5V23M21 11.5V23M27 11.5V23" stroke="currentColor" stroke-width="1.6"/>
    <path d="M3 23.5h26M2 27h28" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`;

  const HEADER_HTML = `
    <header class="gt-header">
      <a href="index.html" class="gt-brand">
        <div class="gt-brand-logo">${PARTHENON}<span>GovTech DE</span></div>
        <span class="gt-tagline">Verwaltung neu gedacht.</span>
      </a>
      <div class="gt-header-spacer"></div>
      <div class="gt-header-actions">
        <button class="gt-header-btn"><i data-lucide="globe"></i>DE<i data-lucide="chevron-down"></i></button>
        <button class="gt-header-btn icon"><i data-lucide="sun"></i></button>
        <button class="gt-user-pill"><span class="av"><i data-lucide="user"></i></span>Anna Petrov<i data-lucide="chevron-down"></i></button>
      </div>
    </header>`;

  const SIDEBAR_HTML = `
    <aside class="gt-sidebar">
      <div class="gt-sidebar-brand">
        <div class="crest">${PARTHENON}</div>
        <div class="label">Bundesrepublik<br/>Deutschland</div>
      </div>
      <nav class="gt-nav">
        ${NAV_MAIN.map(n => `
          <a href="${n.href}" class="${active === n.id ? 'active' : ''}">
            <i data-lucide="${n.icon}"></i><span>${n.label}</span>
          </a>`).join('')}
      </nav>
      <div class="gt-sidebar-bottom">
        <div class="gt-nav-divider"></div>
        <nav class="gt-nav">
          ${NAV_BOTTOM.map(n => `
            <a href="${n.href}"><i data-lucide="${n.icon}"></i><span>${n.label}</span></a>`).join('')}
        </nav>
      </div>
    </aside>`;

  // Inject placeholders
  const headerSlot = document.querySelector('[data-gt-header]');
  if (headerSlot) headerSlot.outerHTML = HEADER_HTML;
  const sidebarSlot = document.querySelector('[data-gt-sidebar]');
  if (sidebarSlot) sidebarSlot.outerHTML = SIDEBAR_HTML;

  // Mock-screens floating link
  if (!document.querySelector('.mock-link')) {
    const a = document.createElement('a');
    a.className = 'mock-link';
    a.href = 'index.html';
    a.textContent = '← Alle Screens';
    document.body.appendChild(a);
  }

  // Initialize lucide once DOM is ready
  const initLucide = () => {
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  };
  if (window.lucide) initLucide();
  else {
    // wait for the script
    const obs = setInterval(() => { if (window.lucide) { initLucide(); clearInterval(obs); } }, 30);
    setTimeout(() => clearInterval(obs), 3000);
  }
})();
