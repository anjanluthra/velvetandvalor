/* Velvet & Valor — admin left sidebar (shared across /admin/* pages).
   Renders nav, role-gates items, marks the active page, handles logout.
   Pages can read window.ADMIN_ME or listen for the 'admin-me' event. */
(function () {
  const el = document.getElementById('adminSidebar');
  if (!el) return;

  const ROLES = { staff: 0, manager: 1, owner: 2 };
  const ITEMS = [
    { href: '/admin/dashboard', label: 'Orders', icon: '◳', match: ['/admin/dashboard'], min: 'staff' },
    { href: '/admin/products', label: 'Products', icon: '◈', match: ['/admin/products'], min: 'manager' },
    { href: '/admin/submissions', label: 'Form Submissions', icon: '✉', match: ['/admin/submissions'], min: 'manager' },
    { href: '/admin/settings', label: 'Settings', icon: '⚙', match: ['/admin/settings', '/admin/users'], min: 'owner' },
  ];
  const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const path = location.pathname.replace(/\/$/, '');

  function render(me) {
    const r = ROLES[me && me.role] != null ? ROLES[me.role] : 0;
    const nav = ITEMS.filter((i) => r >= ROLES[i.min]).map((i) => {
      const active = i.match.some((m) => path === m || path.startsWith(m + '/'));
      return `<a class="admin-navitem${active ? ' active' : ''}" href="${i.href}"><span class="ic">${i.icon}</span>${i.label}</a>`;
    }).join('');
    el.innerHTML =
      '<div class="admin-brand">Velvet &amp; Valor <span>Admin</span></div>' +
      '<nav class="admin-nav">' + nav + '</nav>' +
      '<div class="admin-foot">' +
        '<div class="admin-user">' + (me.name ? '<b>' + esc(me.name) + '</b><br>' : '') +
          '<span>' + esc(me.email) + '</span><br><span class="role">' + esc(me.role) + '</span></div>' +
        '<button class="admin-logout" id="navLogout">Log out</button>' +
      '</div>';
    document.getElementById('navLogout').addEventListener('click', async () => {
      try { await fetch('/api/admin/logout', { method: 'POST' }); } catch (e) {}
      location.href = '/admin/login';
    });
  }

  fetch('/api/admin/me')
    .then((r) => { if (r.status === 401) { location.href = '/admin/login'; throw new Error('unauth'); } return r.json(); })
    .then((me) => {
      window.ADMIN_ME = me;
      render(me);
      document.dispatchEvent(new CustomEvent('admin-me', { detail: me }));
    })
    .catch(() => {});
})();
