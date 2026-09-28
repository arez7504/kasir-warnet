// Sidebar Navigation Component
const Sidebar = {
  render(currentRoute) {
    const user = State.user;
    if (!user) return '';

    const isAdmin = user.role === 'admin';

    const navItems = [
      { section: 'Kasir & Shift' },
      { route: '#/home', label: 'Home Dashboard', icon: '🏠', id: 'nav-home' },
      { route: '#/cashier-product', label: 'Kasir Produk', icon: '🛒', id: 'nav-product' },
      { route: '#/cashier-billing', label: 'Kasir Billing', icon: '💻', id: 'nav-billing' },
      { route: '#/history', label: 'Riwayat Transaksi', icon: '📜', id: 'nav-history' },
      { route: '#/expense', label: 'Catat Pengeluaran', icon: '💸', id: 'nav-expense' },
      { route: '#/close-shift', label: 'Tutup Shift', icon: '🔒', id: 'nav-close-shift' }
    ];

    if (isAdmin) {
      navItems.push(
        { section: 'Administrasi' },
        { route: '#/manage-products', label: 'Manajemen Produk', icon: '📦', id: 'nav-manage-products' },
        { route: '#/manage-packages', label: 'Manajemen Paket', icon: '⚡', id: 'nav-manage-packages' },
        { route: '#/manage-users', label: 'Manajemen User', icon: '👥', id: 'nav-manage-users' },
        { route: '#/reports', label: 'Laporan & Audit', icon: '📊', id: 'nav-reports' }
      );
    }

    let navHtml = '';
    navItems.forEach(item => {
      if (item.section) {
        navHtml += `<div class="nav-section-title">${item.section}</div>`;
      } else {
        const isActive = currentRoute === item.route;
        navHtml += `
          <a href="${item.route}" class="nav-item ${isActive ? 'active' : ''}" id="${item.id}">
            <span class="nav-icon">${item.icon}</span>
            <span>${item.label}</span>
          </a>
        `;
      }
    });

    return `
      <aside class="sidebar" id="app-sidebar">
        <div class="sidebar-header">
          <div class="sidebar-logo-icon">⚡</div>
          <div class="sidebar-brand">
            <h2>Kasir Warnet</h2>
            <p>POS & Shift Control</p>
          </div>
        </div>

        <nav class="sidebar-nav">
          ${navHtml}
        </nav>

        <div class="sidebar-footer">
          <div class="user-profile-card">
            <div class="user-info">
              <div class="user-avatar">${user.nama ? user.nama.charAt(0).toUpperCase() : 'U'}</div>
              <div class="user-details">
                <div class="user-name">${Utils.escapeHtml(user.nama)}</div>
                <span class="user-role-badge ${user.role === 'admin' ? 'admin' : ''}">${user.role}</span>
              </div>
            </div>
            <button type="button" class="btn-logout" id="btn-sidebar-logout" title="Keluar dari akun">
              🚪
            </button>
          </div>
        </div>
      </aside>
    `;
  },

  attachEvents() {
    const logoutBtn = document.getElementById('btn-sidebar-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        Dialog.confirm({
          title: 'Konfirmasi Logout',
          message: 'Apakah Anda yakin ingin keluar dari sistem? Shift yang belum ditutup akan tetap tersimpan.',
          confirmText: 'Keluar',
          confirmClass: 'btn-danger',
          onConfirm: async () => {
            try {
              await Api.post('/api/auth/logout');
              State.setUser(null);
              State.setShift(null);
              Toast.info('Anda telah keluar.');
              window.location.hash = '#/login';
            } catch (err) {
              Toast.error('Gagal logout: ' + err.message);
            }
          }
        });
      });
    }
  }
};
