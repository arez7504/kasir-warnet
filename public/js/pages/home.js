// Layar 3: Home Dashboard
const HomePage = {
  async render() {
    const user = State.user || { nama: 'Operator' };
    const shift = State.activeShift;

    let summary = {
      total_transaksi: 0,
      total_cash_masuk: 0,
      total_qris_masuk: 0,
      cash_billing: 0,
      cash_produk: 0,
      qris_billing: 0,
      qris_produk: 0,
      total_billing: 0,
      total_produk: 0,
      total_pengeluaran: 0,
      kas_seharusnya: shift ? shift.saldo_awal : 0
    };

    try {
      summary = await Api.get('/api/shifts/summary');
    } catch (err) {
      console.warn('Could not fetch shift summary:', err);
    }

    const cashBilling = summary.cash_billing || 0;
    const cashProduk = summary.cash_produk || 0;
    const totalCashMasuk = summary.total_cash_masuk !== undefined ? summary.total_cash_masuk : (cashBilling + cashProduk);

    const qrisBilling = summary.qris_billing || 0;
    const qrisProduk = summary.qris_produk || 0;
    const totalQrisMasuk = summary.total_qris_masuk !== undefined ? summary.total_qris_masuk : (qrisBilling + qrisProduk);

    const totalBilling = summary.total_billing !== undefined ? summary.total_billing : (cashBilling + qrisBilling);
    const totalProduk = summary.total_produk !== undefined ? summary.total_produk : (cashProduk + qrisProduk);

    const totalPengeluaran = summary.total_pengeluaran || 0;
    const cashSisa = totalCashMasuk - totalPengeluaran;

    const totalOmzet = totalCashMasuk + totalQrisMasuk;

    const shiftStart = shift ? Utils.formatTime(shift.started_at) : '-';

    return `
      <div class="layout-wrapper">
        ${Sidebar.render('#/home')}
        <div class="main-wrapper">
          <header class="top-header">
            <div class="page-title-box">
              <h1>🏠 Home Dashboard</h1>
            </div>
            <div class="header-status-box">
              <div class="shift-status-pill">
                <span class="pulse-dot"></span>
                <span>Shift Aktif · Mulai ${shiftStart}</span>
              </div>
              <div class="clock-display" id="live-clock">--:--:--</div>
            </div>
          </header>

          <main class="page-container">
            <!-- Stat Cards Row 1: Ringkasan Utama Shift -->
            <div class="stat-grid">
              <div class="stat-card" style="--accent-color: #f59e0b; background: linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(234, 179, 8, 0.08), rgba(17, 24, 39, 0.85)); border-color: rgba(245, 158, 11, 0.45); box-shadow: 0 0 20px rgba(245, 158, 11, 0.12);">
                <div class="stat-header">
                  <span class="stat-label">Total Omzet</span>
                  <span class="stat-icon">💰</span>
                </div>
                <div class="stat-value" style="color: #fbbf24; font-size: 1.6rem;" id="dash-total-omzet">
                  ${Utils.formatRupiah(totalOmzet)}
                </div>
                <span class="stat-subtext">Cash Masuk + QRIS Masuk</span>
              </div>

              <div class="stat-card" style="--accent-color: var(--color-primary);">
                <div class="stat-header">
                  <span class="stat-label">Total Transaksi</span>
                  <span class="stat-icon">📦</span>
                </div>
                <div class="stat-value" id="dash-total-tx">${summary.total_transaksi}</div>
                <span class="stat-subtext">Transaksi produk & billing</span>
              </div>

              <div class="stat-card" style="--accent-color: var(--color-cash);">
                <div class="stat-header">
                  <span class="stat-label">Cash Masuk</span>
                  <span class="stat-icon">💵</span>
                </div>
                <div class="stat-value" style="color: var(--color-cash);" id="dash-cash-in">
                  ${Utils.formatRupiah(totalCashMasuk)}
                </div>
                <span class="stat-subtext">Total Cash: Billing + Produk</span>
              </div>

              <div class="stat-card" style="--accent-color: var(--color-qris);">
                <div class="stat-header">
                  <span class="stat-label">QRIS Masuk</span>
                  <span class="stat-icon">📱</span>
                </div>
                <div class="stat-value" style="color: var(--color-qris);" id="dash-qris-in">
                  ${Utils.formatRupiah(totalQrisMasuk)}
                </div>
                <span class="stat-subtext">Total QRIS: Billing + Produk</span>
              </div>

              <div class="stat-card" style="--accent-color: var(--color-danger);">
                <div class="stat-header">
                  <span class="stat-label">Pengeluaran</span>
                  <span class="stat-icon">💸</span>
                </div>
                <div class="stat-value" style="color: var(--color-danger);" id="dash-expenses">
                  ${Utils.formatRupiah(totalPengeluaran)}
                </div>
                <span class="stat-subtext">Kasbon, operasional, & stok</span>
              </div>

              <div class="stat-card" style="--accent-color: #f59e0b;">
                <div class="stat-header">
                  <span class="stat-label">Cash Sisa</span>
                  <span class="stat-icon">🏦</span>
                </div>
                <div class="stat-value" style="color: #f59e0b;" id="dash-expected-cash">
                  ${Utils.formatRupiah(cashSisa)}
                </div>
                <span class="stat-subtext">Cash Masuk − Pengeluaran</span>
              </div>
            </div>

            <!-- Stat Cards Row 2: Rincian Pemasukan (Billing & Produk) -->
            <div style="margin-bottom: 24px; display: flex; flex-direction: column; gap: 20px;">
              <!-- Kelompok Billing PC -->
              <div>
                <h3 style="font-size: 13px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                  <span>🖥️ Pemasukan Billing PC</span>
                </h3>
                <div class="stat-grid" style="margin-bottom: 0;">
                  <div class="stat-card" style="--accent-color: #38bdf8; background: linear-gradient(135deg, rgba(56, 189, 248, 0.12), rgba(17, 24, 39, 0.7)); border-color: rgba(56, 189, 248, 0.3);">
                    <div class="stat-header">
                      <span class="stat-label">Total Billing</span>
                      <span class="stat-icon">💻</span>
                    </div>
                    <div class="stat-value" style="color: #38bdf8;" id="dash-total-billing">
                      ${Utils.formatRupiah(totalBilling)}
                    </div>
                    <span class="stat-subtext">Billing QRIS + Billing Cash</span>
                  </div>

                  <div class="stat-card" style="--accent-color: #0284c7;">
                    <div class="stat-header">
                      <span class="stat-label">Cash Billing</span>
                      <span class="stat-icon">💵</span>
                    </div>
                    <div class="stat-value" style="color: #38bdf8;" id="dash-cash-billing">
                      ${Utils.formatRupiah(cashBilling)}
                    </div>
                    <span class="stat-subtext">Pemasukan cash sewa billing PC</span>
                  </div>

                  <div class="stat-card" style="--accent-color: #818cf8;">
                    <div class="stat-header">
                      <span class="stat-label">QRIS Billing</span>
                      <span class="stat-icon">📱</span>
                    </div>
                    <div class="stat-value" style="color: #818cf8;" id="dash-qris-billing">
                      ${Utils.formatRupiah(qrisBilling)}
                    </div>
                    <span class="stat-subtext">Pemasukan QRIS sewa billing PC</span>
                  </div>
                </div>
              </div>

              <!-- Kelompok Produk -->
              <div>
                <h3 style="font-size: 13px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                  <span>🛒 Pemasukan Produk / F&B</span>
                </h3>
                <div class="stat-grid" style="margin-bottom: 0;">
                  <div class="stat-card" style="--accent-color: #10b981; background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(17, 24, 39, 0.7)); border-color: rgba(16, 185, 129, 0.3);">
                    <div class="stat-header">
                      <span class="stat-label">Total Produk</span>
                      <span class="stat-icon">🛍️</span>
                    </div>
                    <div class="stat-value" style="color: #10b981;" id="dash-total-produk">
                      ${Utils.formatRupiah(totalProduk)}
                    </div>
                    <span class="stat-subtext">Total Cash Produk + QRIS Produk</span>
                  </div>

                  <div class="stat-card" style="--accent-color: #059669;">
                    <div class="stat-header">
                      <span class="stat-label">Cash Produk</span>
                      <span class="stat-icon">💵</span>
                    </div>
                    <div class="stat-value" style="color: #10b981;" id="dash-cash-produk">
                      ${Utils.formatRupiah(cashProduk)}
                    </div>
                    <span class="stat-subtext">Pemasukan cash penjualan produk</span>
                  </div>

                  <div class="stat-card" style="--accent-color: #c084fc;">
                    <div class="stat-header">
                      <span class="stat-label">QRIS Produk</span>
                      <span class="stat-icon">📱</span>
                    </div>
                    <div class="stat-value" style="color: #c084fc;" id="dash-qris-produk">
                      ${Utils.formatRupiah(qrisProduk)}
                    </div>
                    <span class="stat-subtext">Pemasukan QRIS penjualan produk</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Big Action Tiles -->
            <div class="action-grid">
              <a href="#/cashier-product" class="action-tile" style="--tile-color: var(--color-cash); --tile-bg: rgba(16, 185, 129, 0.15); --tile-glow: var(--color-cash-glow);" id="tile-pos-product">
                <div class="action-tile-icon">🛒</div>
                <div class="action-tile-info">
                  <h3>Kasir Produk</h3>
                  <p>Penjualan rokok, minuman dingin botol, dan makanan instan</p>
                </div>
              </a>

              <a href="#/cashier-billing" class="action-tile" style="--tile-color: var(--color-primary); --tile-bg: rgba(56, 189, 248, 0.15); --tile-glow: var(--color-primary-glow);" id="tile-pos-billing">
                <div class="action-tile-icon">💻</div>
                <div class="action-tile-info">
                  <h3>Kasir Billing</h3>
                  <p>Catat pembayaran paket sewa PC warnet per jam, pagi, dan malam</p>
                </div>
              </a>

              <a href="#/expense" class="action-tile" style="--tile-color: var(--color-danger); --tile-bg: rgba(239, 68, 68, 0.15); --tile-glow: var(--color-danger-glow);" id="tile-expense">
                <div class="action-tile-icon">💸</div>
                <div class="action-tile-info">
                  <h3>Catat Pengeluaran</h3>
                  <p>Input kasbon karyawan, belanja operasional, atau stok barang masuk</p>
                </div>
              </a>

              <a href="#/history" class="action-tile" style="--tile-color: var(--color-qris); --tile-bg: rgba(99, 102, 241, 0.15); --tile-glow: var(--color-qris-glow);" id="tile-history">
                <div class="action-tile-icon">📜</div>
                <div class="action-tile-info">
                  <h3>Riwayat Transaksi</h3>
                  <p>Lihat rincian transaksi penjualan, struk, dan riwayat shift sebelumnya</p>
                </div>
              </a>
            </div>

            <!-- Tutup Shift Action Banner -->
            <div class="close-shift-action-bar">
              <div>
                <h3 style="font-size: 18px; color: #fff; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
                  <span>🔒</span> Siap Mengakhiri Jam Kerja?
                </h3>
                <p style="font-size: 13.5px; color: var(--text-secondary);">
                  Lakukan rekonsiliasi 3 langkah (QRIS EDC, Billing Cyberindo, dan Kas Fisik di laci)
                </p>
              </div>
              <a href="#/close-shift" class="btn btn-danger btn-lg" id="btn-dash-close-shift">
                🔒 Tutup Shift Sekarang
              </a>
            </div>
          </main>
        </div>
      </div>
    `;
  },

  attachEvents() {
    Sidebar.attachEvents();

    // Start live clock
    const clockElem = document.getElementById('live-clock');
    if (clockElem) {
      const updateClock = () => {
        const d = new Date();
        clockElem.textContent = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
      };
      updateClock();
      const timer = setInterval(updateClock, 1000);
      window.activeTimers = window.activeTimers || [];
      window.activeTimers.push(timer);
    }
  }
};
