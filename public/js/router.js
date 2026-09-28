// Hash-based Router with Auth & Shift Guards
const Router = {
  routes: {
    '#/login': { page: LoginPage, public: true },
    '#/home': { page: HomePage, requireAuth: true, requireShift: true },
    '#/cashier-product': { page: CashierProductPage, requireAuth: true, requireShift: true },
    '#/cashier-billing': { page: CashierBillingPage, requireAuth: true, requireShift: true },
    '#/history': { page: HistoryPage, requireAuth: true },
    '#/expense': { page: ExpensePage, requireAuth: true, requireShift: true },
    '#/close-shift': { page: CloseShiftPage, requireAuth: true, requireShift: true },
    '#/manage-products': { page: ManageProductsPage, requireAuth: true, requireAdmin: true },
    '#/manage-packages': { page: ManagePackagesPage, requireAuth: true, requireAdmin: true },
    '#/manage-users': { page: ManageUsersPage, requireAuth: true, requireAdmin: true },
    '#/reports': { page: ReportsPage, requireAuth: true, requireAdmin: true }
  },

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    if (!window.location.hash) {
      window.location.hash = '#/login';
    } else {
      this.handleRoute();
    }
  },

  async handleRoute() {
    // Clear any active timers from previous page
    if (window.activeTimers && Array.isArray(window.activeTimers)) {
      window.activeTimers.forEach(t => clearInterval(t));
      window.activeTimers = [];
    }

    let hash = window.location.hash || '#/login';
    if (hash === '#/open-shift') {
      hash = '#/home';
      window.location.hash = hash;
      return;
    }

    if (!this.routes[hash]) {
      hash = '#/login';
      window.location.hash = hash;
      return;
    }

    const routeConfig = this.routes[hash];

    // Check user auth if not cached
    if (State.user === null) {
      try {
        const meRes = await Api.get('/api/auth/me');
        if (meRes.user) {
          State.setUser(meRes.user);
        }
      } catch (e) {
        console.warn('Auth check error:', e);
      }
    }

    // Unauthenticated user attempting to access protected route
    if (routeConfig.requireAuth && !State.user) {
      if (window.location.hash !== '#/login') {
        window.location.hash = '#/login';
      } else {
        const loginConfig = this.routes['#/login'];
        const appContainer = document.getElementById('app');
        if (appContainer && loginConfig.page) {
          appContainer.innerHTML = await loginConfig.page.render();
          if (typeof loginConfig.page.attachEvents === 'function') {
            loginConfig.page.attachEvents();
          }
        }
      }
      return;
    }

    // Authenticated user attempting to view login page
    if (hash === '#/login' && State.user) {
      window.location.hash = '#/home';
      return;
    }

    // Admin-only route guard
    if (routeConfig.requireAdmin && State.user && State.user.role !== 'admin') {
      Toast.error('Akses ditolak: Hanya pemilik/admin yang dapat mengakses halaman ini.');
      window.location.hash = '#/home';
      return;
    }

    // Active shift guard: automatically ensure active shift is set
    if (routeConfig.requireShift && State.user) {
      if (!State.activeShift) {
        try {
          const shiftRes = await Api.get('/api/shifts/active');
          if (shiftRes && shiftRes.shift) {
            State.setShift(shiftRes.shift);
          }
        } catch (e) {
          console.warn('Error fetching active shift:', e);
        }
      }
    }

    // Render the target page
    const appContainer = document.getElementById('app');
    if (appContainer && routeConfig.page) {
      try {
        const html = await routeConfig.page.render();
        appContainer.innerHTML = html;
        if (typeof routeConfig.page.attachEvents === 'function') {
          routeConfig.page.attachEvents();
        }
      } catch (err) {
        console.error('Error rendering page:', err);
        appContainer.innerHTML = `
          <div class="card" style="margin: 40px auto; max-width: 500px; text-align: center;">
            <h2>Gagal Memuat Halaman</h2>
            <p style="color: var(--text-secondary); margin: 10px 0;">${Utils.escapeHtml(err.message)}</p>
            <a href="#/home" class="btn btn-primary">Kembali ke Home</a>
          </div>
        `;
      }
    }
  }
};
