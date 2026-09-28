// Layar 11: Laporan & Audit Omzet (Admin / Owner)
const ReportsPage = {
  selectedPreset: 'hari_ini', // 'hari_ini' | 'kemarin' | '7_hari' | '30_hari' | 'custom'
  customDari: '',
  customSampai: '',
  summaryData: null,
  topProducts: [],
  shiftReports: [],

  async render() {
    return `
      <div class="layout-wrapper">
        ${Sidebar.render('#/reports')}
        <div class="main-wrapper">
          <header class="top-header">
            <div class="page-title-box">
              <h1>📊 Laporan Keuangan & Audit Shift</h1>
            </div>
            <div class="header-status-box">
              <button type="button" class="btn btn-sm btn-danger" id="btn-reset-reports" title="Reset seluruh statistik omzet dan audit shift">
                🗑️ Reset Stat & Audit
              </button>
              <a href="#/home" class="btn btn-sm btn-secondary">← Kembali ke Home</a>
            </div>
          </header>

          <main class="page-container">
            <!-- Period Selector Tabs -->
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; margin-bottom: 24px;">
              <div class="filter-tabs" id="report-period-tabs" style="margin-bottom: 0;">
                <button type="button" class="tab-btn ${this.selectedPreset === 'hari_ini' ? 'active' : ''}" data-preset="hari_ini">Hari Ini</button>
                <button type="button" class="tab-btn ${this.selectedPreset === 'kemarin' ? 'active' : ''}" data-preset="kemarin">Kemarin</button>
                <button type="button" class="tab-btn ${this.selectedPreset === '7_hari' ? 'active' : ''}" data-preset="7_hari">7 Hari Terakhir</button>
                <button type="button" class="tab-btn ${this.selectedPreset === '30_hari' ? 'active' : ''}" data-preset="30_hari">30 Hari Terakhir</button>
                <button type="button" class="tab-btn ${this.selectedPreset === 'custom' ? 'active' : ''}" data-preset="custom">Custom Tanggal</button>
              </div>

              <!-- Custom Date Pickers (hidden unless custom selected) -->
              <div id="custom-date-box" style="${this.selectedPreset === 'custom' ? 'display: flex;' : 'display: none;'} gap: 8px; align-items: center;">
                <input type="date" id="input-date-dari" class="form-control" style="padding: 6px 10px; font-size: 13px;" value="${this.customDari}">
                <span style="color: var(--text-muted); font-size: 12px;">s/d</span>
                <input type="date" id="input-date-sampai" class="form-control" style="padding: 6px 10px; font-size: 13px;" value="${this.customSampai}">
                <button type="button" class="btn btn-sm btn-primary" id="btn-apply-custom-date">Terapkan</button>
              </div>
            </div>

            <!-- Top Summary Cards -->
            <div class="stat-grid" id="report-stat-grid">
              <div class="stat-card" style="--accent-color: #38bdf8;">
                <div class="stat-header">
                  <span class="stat-label">Total Omzet / Pendapatan</span>
                  <span class="stat-icon">💰</span>
                </div>
                <div class="stat-value" style="color: #38bdf8;" id="rep-total-omzet">Rp 0</div>
                <span class="stat-subtext" id="rep-total-tx-label">0 total transaksi</span>
              </div>

              <div class="stat-card" style="--accent-color: var(--color-cash);">
                <div class="stat-header">
                  <span class="stat-label">Total Cash</span>
                  <span class="stat-icon">💵</span>
                </div>
                <div class="stat-value" style="color: var(--color-cash);" id="rep-total-cash">Rp 0</div>
                <span class="stat-subtext">Uang tunai kas</span>
              </div>

              <div class="stat-card" style="--accent-color: var(--color-qris);">
                <div class="stat-header">
                  <span class="stat-label">Total QRIS</span>
                  <span class="stat-icon">📱</span>
                </div>
                <div class="stat-value" style="color: var(--color-qris);" id="rep-total-qris">Rp 0</div>
                <span class="stat-subtext">Transfer via QRIS EDC</span>
              </div>

              <div class="stat-card" style="--accent-color: var(--color-danger);">
                <div class="stat-header">
                  <span class="stat-label">Total Pengeluaran</span>
                  <span class="stat-icon">💸</span>
                </div>
                <div class="stat-value" style="color: var(--color-danger);" id="rep-total-exp">Rp 0</div>
                <span class="stat-subtext">Kasbon, operasional, & stok</span>
              </div>
            </div>

            <!-- Two Columns: Breakdown & Top Products -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px;">
              <!-- Left: Breakdown Produk vs Billing -->
              <div class="card">
                <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                  <span>⚖️</span> Proporsi Pendapatan
                </h3>

                <div style="display: flex; flex-direction: column; gap: 16px;">
                  <div>
                    <div style="display: flex; justify-content: space-between; font-size: 13.5px; margin-bottom: 6px;">
                      <span style="display: flex; align-items: center; gap: 6px;">
                        <span style="width: 10px; height: 10px; border-radius: 50%; background: var(--color-cash);"></span>
                        Penjualan Produk (Jajan/Minum/Rokok)
                      </span>
                      <strong id="rep-prop-prod-val">Rp 0 (0%)</strong>
                    </div>
                    <div class="progress-bar-container">
                      <div class="progress-bar-fill fill-product" id="bar-prop-prod" style="width: 0%;"></div>
                    </div>
                  </div>

                  <div>
                    <div style="display: flex; justify-content: space-between; font-size: 13.5px; margin-bottom: 6px;">
                      <span style="display: flex; align-items: center; gap: 6px;">
                        <span style="width: 10px; height: 10px; border-radius: 50%; background: var(--color-primary);"></span>
                        Billing PC Cyberindo
                      </span>
                      <strong id="rep-prop-bill-val">Rp 0 (0%)</strong>
                    </div>
                    <div class="progress-bar-container">
                      <div class="progress-bar-fill fill-billing" id="bar-prop-bill" style="width: 0%;"></div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Right: Top 10 Products -->
              <div class="card">
                <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                  <span>🔥</span> Produk Terlaris
                </h3>

                <div id="rep-top-products-list" style="display: flex; flex-direction: column; gap: 10px; max-height: 240px; overflow-y: auto;">
                  <div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 13px;">
                    Memuat produk terlaris...
                  </div>
                </div>
              </div>
            </div>

            <!-- Full Width: Shift Reconciliation Audit Log -->
            <div class="card" style="padding: 0; overflow: hidden;">
              <div style="padding: 18px 24px; border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
                <h3 style="font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                  <span>🔒</span> Audit Rekonsiliasi Shift
                </h3>
                <span style="font-size: 12px; color: var(--text-muted);">Hasil pencocokan EDC, Cyberindo, dan Kas Laci</span>
              </div>

              <div class="table-responsive">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Shift ID</th>
                      <th>Operator</th>
                      <th>Jam Kerja</th>
                      <th>Total TRX</th>
                      <th>Omzet</th>
                      <th>Selisih Kas Laci</th>
                      <th>Selisih QRIS EDC</th>
                      <th>Selisih Cyberindo</th>
                      <th style="text-align: center;">Audit</th>
                    </tr>
                  </thead>
                  <tbody id="tbody-report-shifts">
                    <tr>
                      <td colspan="9" style="text-align: center; padding: 40px; color: var(--text-muted);">
                        Memuat data audit shift...
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        </div>
      </div>
    `;
  },

  async loadReportsData() {
    const params = { preset: this.selectedPreset };
    if (this.selectedPreset === 'custom') {
      if (this.customDari) params.dari = this.customDari;
      if (this.customSampai) params.sampai = this.customSampai;
    }

    try {
      const [sumRes, topRes, shiftsRes] = await Promise.all([
        Api.get('/api/reports/summary', params),
        Api.get('/api/reports/top-products', params),
        Api.get('/api/reports/shifts', params)
      ]);

      this.summaryData = sumRes;
      this.topProducts = topRes.top_products || [];
      this.shiftReports = shiftsRes.shifts || [];

      this.renderSummary();
      this.renderTopProducts();
      this.renderShiftsAudit();
    } catch (err) {
      Toast.error('Gagal memuat laporan: ' + err.message);
    }
  },

  renderSummary() {
    const s = this.summaryData;
    if (!s) return;

    document.getElementById('rep-total-omzet').textContent = Utils.formatRupiah(s.total_pendapatan);
    document.getElementById('rep-total-tx-label').textContent = `${s.total_transaksi} total transaksi`;
    document.getElementById('rep-total-cash').textContent = Utils.formatRupiah(s.total_cash);
    document.getElementById('rep-total-qris').textContent = Utils.formatRupiah(s.total_qris);
    document.getElementById('rep-total-exp').textContent = Utils.formatRupiah(s.total_pengeluaran);

    const prod = s.breakdown.produk;
    const bill = s.breakdown.billing;

    document.getElementById('rep-prop-prod-val').textContent = `${Utils.formatRupiah(prod.total)} (${prod.persen}%)`;
    document.getElementById('bar-prop-prod').style.width = `${prod.persen}%`;

    document.getElementById('rep-prop-bill-val').textContent = `${Utils.formatRupiah(bill.total)} (${bill.persen}%)`;
    document.getElementById('bar-prop-bill').style.width = `${bill.persen}%`;
  },

  renderTopProducts() {
    const list = document.getElementById('rep-top-products-list');
    if (!list) return;

    if (this.topProducts.length === 0) {
      list.innerHTML = `
        <div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 13px;">
          Belum ada penjualan produk dalam periode ini.
        </div>
      `;
      return;
    }

    list.innerHTML = this.topProducts.map((p, index) => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(255,255,255,0.02); border-radius: 8px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="rank-number ${index === 0 ? 'top1' : ''}">${index + 1}</div>
          <div>
            <div style="font-size: 13px; font-weight: 600;">${Utils.escapeHtml(p.nama_produk)}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${Utils.escapeHtml(p.kategori || '')}</div>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-weight: 700; font-family: var(--font-mono); font-size: 13.5px;">${p.total_qty} terjual</div>
          <div style="font-size: 11px; color: var(--color-primary); font-family: var(--font-mono);">${Utils.formatRupiah(p.total_rupiah)}</div>
        </div>
      </div>
    `).join('');
  },

  renderShiftsAudit() {
    const tbody = document.getElementById('tbody-report-shifts');
    if (!tbody) return;

    if (this.shiftReports.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; padding: 40px; color: var(--text-muted);">
            Tidak ada riwayat shift yang tercatat pada periode ini.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.shiftReports.map(s => {
      let diffKas = '-';
      let diffQris = '-';
      let diffBilling = '-';

      if (s.selisih_kas !== null) {
        diffKas = s.selisih_kas === 0 
          ? '<span style="color: var(--color-cash); font-weight: 700;">Rp 0 ✅</span>'
          : `<span style="color: var(--color-warning); font-weight: 700;">${Utils.formatRupiah(s.selisih_kas)} ⚠️</span>`;
      }

      if (s.selisih_qris !== null) {
        diffQris = s.selisih_qris === 0 
          ? '<span style="color: var(--color-cash); font-weight: 700;">Rp 0 ✅</span>'
          : `<span style="color: var(--color-warning); font-weight: 700;">${Utils.formatRupiah(s.selisih_qris)} ⚠️</span>`;
      }

      if (s.selisih_billing !== null) {
        diffBilling = s.selisih_billing === 0 
          ? '<span style="color: var(--color-cash); font-weight: 700;">Rp 0 ✅</span>'
          : `<span style="color: var(--color-warning); font-weight: 700;">${Utils.formatRupiah(s.selisih_billing)} ⚠️</span>`;
      }

      return `
        <tr>
          <td style="font-family: var(--font-mono); font-weight: 700;">#SHIFT-${s.id}</td>
          <td style="font-weight: 600;">${Utils.escapeHtml(s.operator_nama)}</td>
          <td style="font-size: 12px; color: var(--text-secondary);">
            ${Utils.formatTime(s.started_at)} – ${s.closed_at ? Utils.formatTime(s.closed_at) : 'Buka'}
          </td>
          <td style="text-align: center; font-family: var(--font-mono);">${s.total_transaksi || 0}</td>
          <td style="font-family: var(--font-mono); font-weight: 700; color: var(--color-primary);">${Utils.formatRupiah(s.total_omzet || 0)}</td>
          <td>${diffKas}</td>
          <td>${diffQris}</td>
          <td>${diffBilling}</td>
          <td style="text-align: center;">
            <button type="button" class="btn btn-sm btn-secondary btn-audit-shift" data-id="${s.id}">
              🔍 Detail
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-audit-shift').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id, 10);
        const s = this.shiftReports.find(item => item.id === id);
        if (!s) return;

        Dialog.show({
          title: `🔒 Rincian Audit Shift #SHIFT-${s.id}`,
          contentHtml: `
            <div style="display: flex; flex-direction: column; gap: 14px; font-size: 13.5px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px;">
                <div><span style="color: var(--text-muted);">Operator:</span> <strong>${Utils.escapeHtml(s.operator_nama)}</strong></div>
                <div><span style="color: var(--text-muted);">Total Omzet:</span> <strong>${Utils.formatRupiah(s.total_omzet || 0)}</strong></div>
                <div><span style="color: var(--text-muted);">Mulai:</span> ${Utils.formatDateTime(s.started_at)}</div>
                <div><span style="color: var(--text-muted);">Selesai:</span> ${s.closed_at ? Utils.formatDateTime(s.closed_at) : 'Masih Buka'}</div>
              </div>

              <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); padding: 12px; border-radius: 8px;">
                <div style="font-weight: 700; color: var(--color-cash); margin-bottom: 4px;">💵 Rekonsiliasi Kas Laci:</div>
                <div style="display: flex; justify-content: space-between;"><span>Kas Seharusnya: ${Utils.formatRupiah(s.kas_seharusnya)}</span> <span>Fisik Laci: ${Utils.formatRupiah(s.kas_fisik)}</span></div>
                <div style="font-weight: 700; margin-top: 4px;">Selisih: ${Utils.formatRupiah(s.selisih_kas)} ${s.selisih_kas === 0 ? '✅' : '⚠️'}</div>
                ${s.catatan_kas ? `<div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Catatan: "${Utils.escapeHtml(s.catatan_kas)}"</div>` : ''}
              </div>

              <div style="background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.2); padding: 12px; border-radius: 8px;">
                <div style="font-weight: 700; color: var(--color-qris); margin-bottom: 4px;">📱 Rekonsiliasi QRIS:</div>
                <div style="display: flex; justify-content: space-between;"><span>Total App: ${Utils.formatRupiah(s.qris_app)}</span> <span>Mesin EDC: ${Utils.formatRupiah(s.qris_edc)}</span></div>
                <div style="font-weight: 700; margin-top: 4px;">Selisih: ${Utils.formatRupiah(s.selisih_qris)} ${s.selisih_qris === 0 ? '✅' : '⚠️'}</div>
                ${s.catatan_qris ? `<div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Catatan: "${Utils.escapeHtml(s.catatan_qris)}"</div>` : ''}
              </div>

              <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.2); padding: 12px; border-radius: 8px;">
                <div style="font-weight: 700; color: var(--color-primary); margin-bottom: 4px;">💻 Rekonsiliasi Cyberindo:</div>
                <div style="display: flex; justify-content: space-between;"><span>Total App: ${Utils.formatRupiah(s.billing_app)}</span> <span>Cyberindo: ${Utils.formatRupiah(s.billing_cyberindo)}</span></div>
                <div style="font-weight: 700; margin-top: 4px;">Selisih: ${Utils.formatRupiah(s.selisih_billing)} ${s.selisih_billing === 0 ? '✅' : '⚠️'}</div>
                ${s.catatan_billing ? `<div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Catatan: "${Utils.escapeHtml(s.catatan_billing)}"</div>` : ''}
              </div>
            </div>
          `
        });
      });
    });
  },

  attachEvents() {
    Sidebar.attachEvents();
    this.loadReportsData();

    // Preset Period Tabs
    const tabs = document.querySelectorAll('#report-period-tabs .tab-btn');
    const customBox = document.getElementById('custom-date-box');

    tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        tabs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedPreset = btn.dataset.preset;

        if (this.selectedPreset === 'custom') {
          customBox.style.display = 'flex';
        } else {
          customBox.style.display = 'none';
          this.loadReportsData();
        }
      });
    });

    const applyCustomBtn = document.getElementById('btn-apply-custom-date');
    if (applyCustomBtn) {
      applyCustomBtn.addEventListener('click', () => {
        this.customDari = document.getElementById('input-date-dari').value;
        this.customSampai = document.getElementById('input-date-sampai').value;
        if (!this.customDari) {
          Toast.warning('Pilih tanggal awal');
          return;
        }
        this.loadReportsData();
      });
    }

    // Reset Stats Button (Admin / Owner Only)
    const resetBtn = document.getElementById('btn-reset-reports');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        Dialog.show({
          title: '⚠️ Reset Laporan Keuangan & Audit Shift',
          contentHtml: `
            <div style="display: flex; flex-direction: column; gap: 14px;">
              <div style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--border-radius-md); padding: 14px; color: var(--color-danger); font-size: 13.5px; line-height: 1.5;">
                <strong>PERHATIAN OWNER:</strong> Fitur ini akan mereset dan menghapus <strong>seluruh riwayat transaksi</strong>, <strong>catatan pengeluaran</strong>, dan <strong>audit shift</strong>.
              </div>
              <p style="font-size: 13.5px; color: var(--text-secondary); margin: 0;">
                Semua angka omzet, cash, QRIS, dan riwayat shift akan kembali ke <strong>Rp 0</strong>. Master produk & paket billing tetap aman.
              </p>
              <p style="font-size: 13px; font-weight: 600; color: var(--text-primary); margin: 0;">
                Ketik kata <span style="color: var(--color-danger); background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px; font-family: var(--font-mono);">RESET</span> di bawah untuk konfirmasi:
              </p>
              <div class="form-group" style="margin: 0;">
                <input type="text" id="input-confirm-reset" class="form-control" placeholder="Ketik RESET" autofocus>
              </div>
              <div class="dialog-footer" style="margin-top: 8px;">
                <button type="button" class="btn btn-secondary" onclick="Dialog.close();">Batal</button>
                <button type="button" class="btn btn-danger" id="btn-execute-reset" disabled>
                  🗑️ Ya, Reset Seluruh Stat
                </button>
              </div>
            </div>
          `,
          onOpen: (dlg) => {
            const confirmInp = dlg.querySelector('#input-confirm-reset');
            const execBtn = dlg.querySelector('#btn-execute-reset');
            confirmInp.addEventListener('input', (e) => {
              execBtn.disabled = e.target.value.trim().toUpperCase() !== 'RESET';
            });
            execBtn.addEventListener('click', async () => {
              execBtn.disabled = true;
              execBtn.textContent = 'Mereset data...';
              try {
                const res = await Api.post('/api/reports/reset');
                Dialog.close();
                Toast.success(res.message);
                State.setShift(null);
                await this.loadReportsData();
              } catch (err) {
                Toast.error('Gagal mereset data: ' + err.message);
                execBtn.disabled = false;
                execBtn.textContent = '🗑️ Ya, Reset Seluruh Stat';
              }
            });
          }
        });
      });
    }
  }
};
