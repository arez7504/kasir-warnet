// Layar 5: Kasir Billing
const CashierBillingPage = {
  tiers: [],
  packages: [],
  selectedTier: 'Reguler',
  selectedPackageId: null,
  pcCount: 1,

  getTierTheme(tierName = '') {
    const t = tierName.toLowerCase();
    if (t === 'reguler') {
      return {
        icon: '🖥️',
        desc: 'PC Gaming Standard',
        color: '#38bdf8',
        bg: 'rgba(56, 189, 248, 0.1)',
        glow: 'var(--color-primary-glow)'
      };
    }
    if (t === 'premium') {
      return {
        icon: '🚀',
        desc: 'High Performance PC',
        color: '#a855f7',
        bg: 'rgba(168, 85, 247, 0.1)',
        glow: 'var(--color-accent-purple-glow)'
      };
    }
    if (t === 'vip') {
      return {
        icon: '👑',
        desc: 'VIP Room Private',
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.1)',
        glow: 'var(--color-warning-glow)'
      };
    }
    if (t.includes('vvip')) {
      return {
        icon: '💎',
        desc: 'VVIP Exclusive Room',
        color: '#ec4899',
        bg: 'rgba(236, 72, 153, 0.1)',
        glow: 'rgba(236, 72, 153, 0.4)'
      };
    }
    return {
      icon: '⚡',
      desc: `Tier ${tierName}`,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.1)',
      glow: 'var(--color-cash-glow)'
    };
  },

  async render() {
    return `
      <div class="layout-wrapper">
        ${Sidebar.render('#/cashier-billing')}
        <div class="main-wrapper">
          <header class="top-header">
            <div class="page-title-box">
              <h1>💻 Kasir Billing Cyberindo</h1>
            </div>
            <div class="header-status-box">
              <a href="#/home" class="btn btn-sm btn-secondary">← Kembali ke Home</a>
            </div>
          </header>

          <main class="page-container">
            <!-- Section 1: Tier Selector -->
            <div style="margin-bottom: 20px;">
              <h3 style="font-size: 14px; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; margin-bottom: 12px;">
                1. Pilih Tier Ruangan / PC Member
              </h3>
              <div class="tier-selector" id="billing-tier-selector">
                <div style="color: var(--text-muted); padding: 16px;">Memuat tier...</div>
              </div>
            </div>

            <!-- Section 2: Package Grid -->
            <div style="margin-bottom: 24px;">
              <h3 style="font-size: 14px; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; margin-bottom: 12px;" id="package-section-title">
                2. Pilih Paket Billing (Tarif <span id="label-active-tier" style="text-transform: capitalize; color: var(--color-primary);">${this.selectedTier}</span>)
              </h3>
              <div class="packages-grid" id="billing-package-grid">
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
                  Memuat paket billing...
                </div>
              </div>
            </div>

            <!-- Section 3: PC Count & Checkout Bar -->
            <div class="billing-checkout-bar">
              <div class="pc-stepper-box">
                <div>
                  <div style="font-size: 12px; color: var(--text-muted); text-transform: uppercase;">Jumlah PC / Customer</div>
                  <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);">Jumlah Pengguna:</div>
                </div>
                <div class="pc-counter">
                  <button type="button" class="qty-btn" id="btn-pc-dec">−</button>
                  <span class="pc-count-display" id="display-pc-count">${this.pcCount}</span>
                  <button type="button" class="qty-btn" id="btn-pc-inc">+</button>
                </div>
              </div>

              <div style="text-align: right;">
                <div style="font-size: 12px; color: var(--text-muted); text-transform: uppercase;">Total Tagihan Billing</div>
                <div style="font-size: 28px; font-weight: 800; font-family: var(--font-mono); color: var(--color-primary);" id="billing-total-display">
                  Rp 0
                </div>
              </div>

              <div style="display: flex; gap: 12px;">
                <button type="button" class="btn btn-cash btn-lg" id="btn-billing-cash" disabled>
                  💵 Bayar Cash
                </button>
                <button type="button" class="btn btn-qris btn-lg" id="btn-billing-qris" disabled>
                  📱 Bayar QRIS
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    `;
  },

  async loadInitialData() {
    try {
      const [tiersRes, pkgsRes] = await Promise.all([
        Api.get('/api/tiers'),
        Api.get('/api/packages')
      ]);

      this.tiers = tiersRes.tiers || [];
      this.packages = pkgsRes.packages || [];

      // Set initial selectedTier to first available tier
      if (this.tiers.length > 0) {
        const hasReguler = this.tiers.find(t => t.nama.toLowerCase() === 'reguler');
        this.selectedTier = hasReguler ? hasReguler.nama : this.tiers[0].nama;
      }

      this.renderTierSelector();
      this.selectFirstPackageForCurrentTier();
      this.renderPackageGrid();
      this.updateTotal();
    } catch (err) {
      Toast.error('Gagal memuat data kasir billing: ' + err.message);
    }
  },

  renderTierSelector() {
    const container = document.getElementById('billing-tier-selector');
    if (!container) return;

    if (this.tiers.length === 0) {
      container.innerHTML = `<div style="color: var(--text-muted); padding: 12px;">Belum ada tier terdaftar.</div>`;
      return;
    }

    container.innerHTML = this.tiers.map(t => {
      const theme = this.getTierTheme(t.nama);
      const isActive = (this.selectedTier || '').toLowerCase() === t.nama.toLowerCase();

      return `
        <div class="tier-card ${isActive ? 'active' : ''}" data-tier="${Utils.escapeHtml(t.nama)}" style="--tier-theme-color: ${theme.color}; --tier-theme-bg: ${theme.bg}; --tier-theme-glow: ${theme.glow};">
          <div style="font-size: 28px; margin-bottom: 6px;">${theme.icon}</div>
          <h3 style="color: ${theme.color}; text-transform: uppercase;">${Utils.escapeHtml(t.nama)}</h3>
          <p style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">${theme.desc}</p>
          <div class="tier-badge-indicator">${isActive ? '● Aktif Terpilih' : 'Klik untuk pilih'}</div>
        </div>
      `;
    }).join('');

    // Attach click events
    container.querySelectorAll('.tier-card').forEach(card => {
      card.addEventListener('click', () => {
        container.querySelectorAll('.tier-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.selectedTier = card.dataset.tier;

        const labelTier = document.getElementById('label-active-tier');
        if (labelTier) labelTier.textContent = this.selectedTier;

        this.selectFirstPackageForCurrentTier();
        this.renderPackageGrid();
        this.updateTotal();
      });
    });
  },

  selectFirstPackageForCurrentTier() {
    const tierPkgs = this.packages.filter(p => (p.tier || '').toLowerCase() === (this.selectedTier || '').toLowerCase());
    if (tierPkgs.length > 0) {
      this.selectedPackageId = tierPkgs[0].id;
    } else {
      this.selectedPackageId = null;
    }
  },

  renderPackageGrid() {
    const grid = document.getElementById('billing-package-grid');
    if (!grid) return;

    const tierPkgs = this.packages.filter(p => (p.tier || '').toLowerCase() === (this.selectedTier || '').toLowerCase());

    if (tierPkgs.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted); background: var(--bg-card); border: 1px dashed var(--border-subtle); border-radius: var(--border-radius-md);">
          Belum ada paket billing untuk tier <strong>${Utils.escapeHtml(this.selectedTier)}</strong>.<br>
          <span style="font-size: 13px;">Tambahkan paket untuk tier ini di menu <strong>Manajemen Paket</strong>.</span>
        </div>
      `;
      return;
    }

    grid.innerHTML = tierPkgs.map(pkg => {
      const isSelected = pkg.id === this.selectedPackageId;
      const price = pkg.harga || 0;

      return `
        <div class="package-card ${isSelected ? 'selected' : ''}" data-id="${pkg.id}" id="pkg-card-${pkg.id}">
          <div class="package-card-header">
            <div class="package-name">${Utils.escapeHtml(pkg.nama)}</div>
            ${isSelected ? '<span style="font-size: 16px;">✅</span>' : ''}
          </div>
          <div class="package-desc" style="display: flex; align-items: center; gap: 6px;">
            <span>⏱️</span>
            <span>${Utils.escapeHtml(pkg.waktu || 'Durasi fleksibel')}</span>
          </div>
          <div class="package-price">${Utils.formatRupiah(price)}</div>
        </div>
      `;
    }).join('');

    // Attach card click listeners
    grid.querySelectorAll('.package-card').forEach(card => {
      card.addEventListener('click', () => {
        this.selectedPackageId = parseInt(card.dataset.id, 10);
        this.renderPackageGrid();
        this.updateTotal();
      });
    });
  },

  updateTotal() {
    const totalElem = document.getElementById('billing-total-display');
    const btnCash = document.getElementById('btn-billing-cash');
    const btnQris = document.getElementById('btn-billing-qris');

    if (!totalElem) return;

    const selectedPkg = this.packages.find(p => p.id === this.selectedPackageId);
    if (!selectedPkg) {
      totalElem.textContent = 'Rp 0';
      if (btnCash) btnCash.disabled = true;
      if (btnQris) btnQris.disabled = true;
      return;
    }

    const unitPrice = selectedPkg.harga || 0;
    const total = unitPrice * this.pcCount;

    totalElem.textContent = Utils.formatRupiah(total);
    if (btnCash) btnCash.disabled = false;
    if (btnQris) btnQris.disabled = false;
  },

  async handleCheckout(metode_bayar, nominal_bayar = null) {
    const selectedPkg = this.packages.find(p => p.id === this.selectedPackageId);
    if (!selectedPkg) {
      Toast.error('Pilih paket billing terlebih dahulu');
      return;
    }

    try {
      const res = await Api.post('/api/transactions/billing', {
        paket_id: selectedPkg.id,
        tier: selectedPkg.tier || this.selectedTier,
        jumlah_pc: this.pcCount,
        metode_bayar,
        nominal_bayar
      });

      const kembalianText = metode_bayar === 'cash'
        ? `<div style="display: flex; justify-content: space-between; font-size: 16px; color: var(--color-cash); font-weight: 700; margin-top: 8px;">
            <span>Kembalian:</span>
            <span>${Utils.formatRupiah(res.kembalian)}</span>
          </div>`
        : '';

      Dialog.show({
        title: '✅ Billing Berhasil Dicatat',
        contentHtml: `
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div style="text-align: center; padding: 12px 0;">
              <div style="font-size: 40px; margin-bottom: 4px;">🎮</div>
              <h3 style="font-size: 18px;">Tiket Billing Cyberindo</h3>
              <p style="font-size: 13px; color: var(--text-muted);">ID Transaksi: #TRX-${res.transaction_id}</p>
            </div>

            <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: var(--border-radius-md); padding: 16px; display: flex; flex-direction: column; gap: 8px;">
              <div style="display: flex; justify-content: space-between; font-size: 13.5px;">
                <span style="color: var(--text-secondary);">Paket:</span>
                <span style="font-weight: 700;">${Utils.escapeHtml(res.paket_nama)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 13.5px;">
                <span style="color: var(--text-secondary);">Waktu Billing:</span>
                <span style="font-weight: 600;">${Utils.escapeHtml(selectedPkg.waktu || '-')}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 13.5px;">
                <span style="color: var(--text-secondary);">Tier Ruangan:</span>
                <span style="font-weight: 700; text-transform: uppercase; color: var(--color-primary);">${Utils.escapeHtml(res.tier)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 13.5px;">
                <span style="color: var(--text-secondary);">Jumlah PC:</span>
                <span style="font-weight: 700;">${res.jumlah_pc} Unit</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 13.5px;">
                <span style="color: var(--text-secondary);">Metode Bayar:</span>
                <span style="font-weight: 700; text-transform: uppercase;">${res.metode_bayar}</span>
              </div>
              <div style="border-top: 1px solid var(--border-subtle); padding-top: 8px; display: flex; justify-content: space-between; font-size: 16px; font-weight: 800;">
                <span>Total:</span>
                <span style="color: var(--color-primary);">${Utils.formatRupiah(res.total)}</span>
              </div>
              ${kembalianText}
            </div>

            <div class="dialog-footer" style="justify-content: center;">
              <button type="button" class="btn btn-primary" id="btn-billing-done">
                Selesai / Transaksi Baru
              </button>
            </div>
          </div>
        `,
        onOpen: (dlg) => {
          dlg.querySelector('#btn-billing-done').addEventListener('click', () => {
            Dialog.close();
          });
        }
      });

      // Reset PC count back to 1
      this.pcCount = 1;
      const pcDisplay = document.getElementById('display-pc-count');
      if (pcDisplay) pcDisplay.textContent = '1';
      this.updateTotal();

      Toast.success('Transaksi billing berhasil disimpan!');
    } catch (err) {
      Toast.error('Gagal mencatat billing: ' + err.message);
    }
  },

  attachEvents() {
    Sidebar.attachEvents();
    this.loadInitialData();

    // PC Count Stepper
    const btnDec = document.getElementById('btn-pc-dec');
    const btnInc = document.getElementById('btn-pc-inc');
    const pcDisplay = document.getElementById('display-pc-count');

    if (btnDec && btnInc && pcDisplay) {
      btnDec.addEventListener('click', () => {
        if (this.pcCount > 1) {
          this.pcCount -= 1;
          pcDisplay.textContent = this.pcCount;
          this.updateTotal();
        }
      });

      btnInc.addEventListener('click', () => {
        this.pcCount += 1;
        pcDisplay.textContent = this.pcCount;
        this.updateTotal();
      });
    }

    // Cash Pay Button
    const btnCash = document.getElementById('btn-billing-cash');
    if (btnCash) {
      btnCash.addEventListener('click', () => {
        const selectedPkg = this.packages.find(p => p.id === this.selectedPackageId);
        if (!selectedPkg) return;
        const total = (selectedPkg.harga || 0) * this.pcCount;

        Dialog.showCashPayment({
          total,
          onConfirm: (received) => {
            this.handleCheckout('cash', received);
          }
        });
      });
    }

    // QRIS Pay Button
    const btnQris = document.getElementById('btn-billing-qris');
    if (btnQris) {
      btnQris.addEventListener('click', () => {
        const selectedPkg = this.packages.find(p => p.id === this.selectedPackageId);
        if (!selectedPkg) return;
        const total = (selectedPkg.harga || 0) * this.pcCount;

        Dialog.showQrisPayment({
          total,
          onConfirm: () => {
            this.handleCheckout('qris');
          }
        });
      });
    }
  }
};
