// Layar 6: Riwayat Transaksi & Shift
const HistoryPage = {
  transactions: [],
  expenses: [],
  pastShifts: [],
  activeTab: 'transaksi', // 'transaksi' | 'shift'
  filterScope: 'shift_ini', // 'shift_ini' | 'semua'
  filterType: 'semua', // 'semua' | 'produk' | 'billing' | 'pengeluaran'

  async render() {
    return `
      <div class="layout-wrapper">
        ${Sidebar.render('#/history')}
        <div class="main-wrapper">
          <header class="top-header">
            <div class="page-title-box">
              <h1>📜 Riwayat Transaksi & Shift</h1>
            </div>
            <div class="header-status-box">
              ${State.user && State.user.role === 'admin' ? `
                <button type="button" class="btn btn-sm btn-danger" id="btn-reset-history" title="Reset seluruh riwayat transaksi & shift">
                  🗑️ Reset Stat & Shift
                </button>
              ` : ''}
              <a href="#/home" class="btn btn-sm btn-secondary">← Kembali ke Home</a>
            </div>
          </header>

          <main class="page-container">
            <!-- Main Navigation Tabs -->
            <div class="filter-tabs" id="history-main-tabs" style="margin-bottom: 24px;">
              <button type="button" class="tab-btn ${this.activeTab === 'transaksi' ? 'active' : ''}" data-tab="transaksi">
                💳 Riwayat Transaksi Penjualan
              </button>
              <button type="button" class="tab-btn ${this.activeTab === 'shift' ? 'active' : ''}" data-tab="shift">
                🔒 Riwayat Shift Sebelumnya
              </button>
            </div>

            <!-- View 1: Transactions & Expenses -->
            <div id="view-transactions" style="${this.activeTab === 'transaksi' ? '' : 'display: none;'}">
              <!-- Sub Filters -->
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; margin-bottom: 20px;">
                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                  <button type="button" class="btn btn-sm ${this.filterScope === 'shift_ini' ? 'btn-primary' : 'btn-secondary'}" id="btn-scope-current">
                    Shift Aktif Ini
                  </button>
                  <button type="button" class="btn btn-sm ${this.filterScope === 'semua' ? 'btn-primary' : 'btn-secondary'}" id="btn-scope-all">
                    Semua Riwayat
                  </button>
                  <button type="button" class="btn btn-sm" id="btn-preview-rekap" style="background: rgba(56, 189, 248, 0.12); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); font-weight: 600; display: inline-flex; align-items: center; gap: 6px; margin-left: 4px;" title="Lihat rekap produk gabungan khusus shift aktif saat ini & download CSV">
                    📊 Preview Rekap Produk (Shift Aktif)
                  </button>
                </div>

                <div style="display: flex; gap: 8px;">
                  <button type="button" class="btn btn-sm ${this.filterType === 'semua' ? 'btn-primary' : 'btn-secondary'}" data-type="semua">Semua</button>
                  <button type="button" class="btn btn-sm ${this.filterType === 'produk' ? 'btn-primary' : 'btn-secondary'}" data-type="produk">🟢 Produk</button>
                  <button type="button" class="btn btn-sm ${this.filterType === 'billing' ? 'btn-primary' : 'btn-secondary'}" data-type="billing">🔵 Billing</button>
                  <button type="button" class="btn btn-sm ${this.filterType === 'pengeluaran' ? 'btn-primary' : 'btn-secondary'}" data-type="pengeluaran">🔴 Pengeluaran</button>
                </div>
              </div>

              <!-- Transactions Table Card -->
              <div class="card" style="padding: 0; overflow: hidden; margin-bottom: 24px;">
                <div class="table-responsive">
                  <table class="data-table" id="table-transactions">
                    <thead>
                      <tr>
                        <th>Waktu & ID</th>
                        <th>Tipe</th>
                        <th>Rincian Item / Paket</th>
                        <th>Varian</th>
                        <th>Metode</th>
                        <th style="text-align: right;">Total / Nominal</th>
                        <th style="text-align: center;">Aksi</th>
                      </tr>
                    </thead>
                    <tbody id="tbody-transactions">
                      <tr>
                        <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
                          Memuat data riwayat...
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Summary Footprint -->
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                <div class="card" style="padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 13px; color: var(--text-muted);">Total Cash Masuk:</span>
                  <span style="font-size: 18px; font-weight: 800; font-family: var(--font-mono); color: var(--color-cash);" id="sum-cash">
                    Rp 0
                  </span>
                </div>
                <div class="card" style="padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 13px; color: var(--text-muted);">Total QRIS Masuk:</span>
                  <span style="font-size: 18px; font-weight: 800; font-family: var(--font-mono); color: var(--color-qris);" id="sum-qris">
                    Rp 0
                  </span>
                </div>
                <div class="card" style="padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 13px; color: var(--text-muted);">Total Pengeluaran:</span>
                  <span style="font-size: 18px; font-weight: 800; font-family: var(--font-mono); color: var(--color-danger);" id="sum-expense">
                    Rp 0
                  </span>
                </div>
              </div>
            </div>

            <!-- View 2: Past Shifts History -->
            <div id="view-shifts" style="${this.activeTab === 'shift' ? '' : 'display: none;'}">
              <div class="card" style="padding: 0; overflow: hidden;">
                <div class="table-responsive">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Shift ID</th>
                        <th>Operator</th>
                        <th>Waktu Mulai</th>
                        <th>Waktu Tutup</th>
                        <th>Modal Awal</th>
                        <th>Omzet</th>
                        <th>Status</th>
                        <th>Selisih Kas</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody id="tbody-shifts">
                      <tr>
                        <td colspan="9" style="text-align: center; padding: 40px; color: var(--text-muted);">
                          Memuat data riwayat shift...
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    `;
  },

  async loadData() {
    try {
      const [txRes, expRes, shiftRes] = await Promise.all([
        Api.get('/api/transactions', { filter_scope: this.filterScope }),
        Api.get('/api/expenses', { filter_scope: this.filterScope }),
        Api.get('/api/shifts/history')
      ]);

      this.transactions = txRes.transactions || [];
      this.expenses = expRes.expenses || [];
      this.pastShifts = shiftRes.shifts || [];

      this.renderTransactionsTable();
      this.renderShiftsTable();
    } catch (err) {
      Toast.error('Gagal mengambil data riwayat: ' + err.message);
    }
  },

  renderTransactionsTable() {
    const tbody = document.getElementById('tbody-transactions');
    const sumCashElem = document.getElementById('sum-cash');
    const sumQrisElem = document.getElementById('sum-qris');
    const sumExpenseElem = document.getElementById('sum-expense');

    if (!tbody) return;

    let combined = [];

    // Map transactions
    if (this.filterType === 'semua' || this.filterType === 'produk' || this.filterType === 'billing') {
      this.transactions.forEach(t => {
        if (this.filterType === 'semua' || this.filterType === t.tipe) {
          combined.push({
            id: t.id,
            type: t.tipe,
            date: t.created_at,
            metode: t.metode_bayar,
            total: t.total,
            nominal_bayar: t.nominal_bayar,
            kembalian: t.kembalian,
            raw: t
          });
        }
      });
    }

    // Map expenses
    if (this.filterType === 'semua' || this.filterType === 'pengeluaran') {
      this.expenses.forEach(e => {
        combined.push({
          id: e.id,
          type: 'pengeluaran',
          date: e.created_at,
          metode: 'cash',
          total: -e.nominal,
          raw: e
        });
      });
    }

    // Sort descending by date
    combined.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate sums (exclude void transactions)
    let cashTotal = 0;
    let qrisTotal = 0;
    let expTotal = 0;

    this.transactions.forEach(t => {
      if (t.status === 'void') return;
      if (t.metode_bayar === 'cash') cashTotal += t.total;
      if (t.metode_bayar === 'qris') qrisTotal += t.total;
    });

    this.expenses.forEach(e => {
      expTotal += e.nominal;
    });

    if (sumCashElem) sumCashElem.textContent = Utils.formatRupiah(cashTotal);
    if (sumQrisElem) sumQrisElem.textContent = Utils.formatRupiah(qrisTotal);
    if (sumExpenseElem) sumExpenseElem.textContent = Utils.formatRupiah(expTotal);

    if (combined.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 50px 20px; color: var(--text-muted);">
            Tidak ada riwayat transaksi yang cocok dengan filter.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = combined.map(item => {
      const isVoid = item.type !== 'pengeluaran' && item.raw.status === 'void';
      let typeBadge = '';
      let detailDesc = '';
      let varianDesc = '<span style="color: var(--text-muted); font-size: 12px;">-</span>';
      let metodeBadge = '';
      let amountFormatted = '';

      if (item.type === 'produk') {
        typeBadge = '<span class="badge badge-product">🟢 Produk</span>';
        const items = item.raw.items || [];
        if (items.length === 0) {
          detailDesc = 'Penjualan Produk';
          varianDesc = '<span style="color: var(--text-muted); font-size: 12px;">-</span>';
        } else if (items.length === 1) {
          const i = items[0];
          detailDesc = `${Utils.escapeHtml(i.nama_produk)} x${i.qty}`;
          varianDesc = i.varian
            ? `<span class="badge" style="background: rgba(56,189,248,0.12); color: #38bdf8; border: 1px solid rgba(56,189,248,0.25); font-weight: 600;">${Utils.escapeHtml(i.varian)}</span>`
            : '<span style="color: var(--text-muted); font-size: 12px;">-</span>';
        } else {
          detailDesc = `
            <div style="display: flex; flex-direction: column; gap: 6px;">
              ${items.map(i => `<div style="min-height: 24px; display: flex; align-items: center;">${Utils.escapeHtml(i.nama_produk)} x${i.qty}</div>`).join('')}
            </div>
          `;
          varianDesc = `
            <div style="display: flex; flex-direction: column; gap: 6px;">
              ${items.map(i => `
                <div style="min-height: 24px; display: flex; align-items: center;">
                  ${i.varian
              ? `<span class="badge" style="background: rgba(56,189,248,0.12); color: #38bdf8; border: 1px solid rgba(56,189,248,0.25); font-weight: 600;">${Utils.escapeHtml(i.varian)}</span>`
              : '<span style="color: var(--text-muted); font-size: 12px;">-</span>'}
                </div>
              `).join('')}
            </div>
          `;
        }
        metodeBadge = item.metode === 'cash' ? '<span class="badge badge-cash">💵 Cash</span>' : '<span class="badge badge-qris">📱 QRIS</span>';
        amountFormatted = isVoid
          ? `<div><s style="color: var(--text-muted); font-family: var(--font-mono);">${Utils.formatRupiah(item.total)}</s><div style="font-size: 10.5px; color: #ef4444; font-weight: 700;">BATAL (VOID)</div></div>`
          : `<strong style="color: var(--text-primary); font-family: var(--font-mono);">${Utils.formatRupiah(item.total)}</strong>`;
      } else if (item.type === 'billing') {
        typeBadge = '<span class="badge badge-billing">🔵 Billing</span>';
        detailDesc = `Paket <strong>${Utils.escapeHtml(item.raw.paket_nama || 'Billing')}</strong> · Tier <span style="text-transform: capitalize; color: var(--color-primary);">${item.raw.tier}</span> (${item.raw.jumlah_pc} PC)`;
        varianDesc = '<span style="color: var(--text-muted); font-size: 12px;">-</span>';
        metodeBadge = item.metode === 'cash' ? '<span class="badge badge-cash">💵 Cash</span>' : '<span class="badge badge-qris">📱 QRIS</span>';
        amountFormatted = isVoid
          ? `<div><s style="color: var(--text-muted); font-family: var(--font-mono);">${Utils.formatRupiah(item.total)}</s><div style="font-size: 10.5px; color: #ef4444; font-weight: 700;">BATAL (VOID)</div></div>`
          : `<strong style="color: var(--text-primary); font-family: var(--font-mono);">${Utils.formatRupiah(item.total)}</strong>`;
      } else if (item.type === 'pengeluaran') {
        typeBadge = '<span class="badge badge-expense">🔴 Pengeluaran</span>';
        const tipeLabel = item.raw.tipe === 'stok_masuk' ? `Stok Masuk (${item.raw.product_nama || 'Item'})` : (item.raw.tipe === 'kasbon' ? 'Kasbon' : 'Operasional');
        detailDesc = `${tipeLabel} — "${Utils.escapeHtml(item.raw.keterangan)}"`;
        varianDesc = item.raw.product_varian
          ? `<span class="badge" style="background: rgba(56,189,248,0.12); color: #38bdf8; border: 1px solid rgba(56,189,248,0.25); font-weight: 600;">${Utils.escapeHtml(item.raw.product_varian)}</span>`
          : '<span style="color: var(--text-muted); font-size: 12px;">-</span>';
        metodeBadge = '<span class="badge badge-cash">💵 Cash</span>';
        amountFormatted = `<strong style="color: var(--color-danger); font-family: var(--font-mono);">${Utils.formatRupiah(item.total)}</strong>`;
      }

      return `
        <tr style="${isVoid ? 'background: rgba(239, 68, 68, 0.05); opacity: 0.72;' : ''}">
          <td>
            <div style="font-weight: 700; font-size: 13px;">
              #${item.type === 'pengeluaran' ? 'EXP' : 'TRX'}-${item.id}
              ${isVoid ? '<span class="badge" style="background:rgba(239,68,68,0.18);color:#ef4444;border:1px solid rgba(239,68,68,0.3);font-size:9.5px;margin-left:4px;vertical-align:middle;">VOID</span>' : ''}
            </div>
            <div style="font-size: 11.5px; color: var(--text-muted); font-family: var(--font-mono);">${Utils.formatTime(item.date)}</div>
          </td>
          <td>${typeBadge}</td>
          <td style="max-width: 320px;">
            <div style="font-size: 13.5px; line-height: 1.4;">${detailDesc}</div>
          </td>
          <td>
            <div style="font-size: 13.5px; line-height: 1.4;">${varianDesc}</div>
          </td>
          <td>${metodeBadge}</td>
          <td style="text-align: right;">${amountFormatted}</td>
          <td style="text-align: center;">
            <div style="display: flex; gap: 6px; justify-content: center;">
              <button type="button" class="btn btn-sm btn-secondary btn-view-detail" data-type="${item.type}" data-id="${item.id}">
                🔍 Lihat
              </button>
              ${item.type !== 'pengeluaran' && !isVoid ? (
                item.raw && item.raw.shift_status === 'closed' ? `
                  <span class="badge" style="background:rgba(255,255,255,0.06);color:var(--text-muted);font-size:10.5px;padding:4px 8px;border:1px solid rgba(255,255,255,0.1);" title="Shift transaksi ini sudah ditutup & direkonsiliasi">🔒 Shift Ditutup</span>
                ` : `
                  <button type="button" class="btn btn-sm" style="background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.3);" data-type="void" data-id="${item.id}" title="Void/batalkan transaksi ini">
                    ❌ Void
                  </button>
                `
              ) : (isVoid ? '<span class="badge" style="background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.3);font-size:10px;">VOIDED</span>' : '')}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach row detail listener
    tbody.querySelectorAll('.btn-view-detail').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        const id = parseInt(btn.dataset.id, 10);
        this.showDetailModal(type, id);
      });
    });

    // Attach void listener
    tbody.querySelectorAll('[data-type="void"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id, 10);
        Dialog.confirm({
          title: '❌ Void Transaksi',
          message: `Apakah Anda yakin ingin mem-void transaksi <strong>#TRX-${id}</strong>?<br><small style="color:var(--text-muted);">Jika transaksi produk, stok akan dikembalikan secara otomatis. Aksi ini tidak bisa dibatalkan.</small>`,
          confirmText: 'Ya, Void!',
          confirmClass: 'btn-danger',
          onConfirm: async () => {
            try {
              const res = await Api.patch(`/api/transactions/${id}/void`);
              Toast.success(res.message || 'Transaksi berhasil di-void');
              await this.loadData();
            } catch (err) {
              Toast.error('Gagal void: ' + err.message);
            }
          }
        });
      });
    });
  },

  showDetailModal(type, id) {
    if (type === 'pengeluaran') {
      const exp = this.expenses.find(e => e.id === id);
      if (!exp) return;
      Dialog.show({
        title: `💸 Rincian Pengeluaran #EXP-${exp.id}`,
        contentHtml: `
          <div style="display: flex; flex-direction: column; gap: 12px; font-size: 14px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Tipe:</span>
              <span style="font-weight: 700; text-transform: uppercase;">${exp.tipe.replace('_', ' ')}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Waktu:</span>
              <span>${Utils.formatDateTime(exp.created_at)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Operator:</span>
              <span>${Utils.escapeHtml(exp.operator_nama || State.user.nama)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Keterangan:</span>
              <span style="font-weight: 600;">${Utils.escapeHtml(exp.keterangan)}</span>
            </div>
            ${exp.tipe === 'stok_masuk' ? `
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Barang & Qty:</span>
                <span>${Utils.escapeHtml(exp.product_nama || '')} ${exp.product_varian ? `<span style="color: #38bdf8; font-weight: 600;">(${Utils.escapeHtml(exp.product_varian)})</span>` : ''} (+${exp.qty} item)</span>
              </div>
            ` : ''}
            <div style="border-top: 1px solid var(--border-subtle); padding-top: 10px; display: flex; justify-content: space-between; font-size: 18px; font-weight: 800;">
              <span>Nominal Kas Keluar:</span>
              <span style="color: var(--color-danger);">${Utils.formatRupiah(exp.nominal)}</span>
            </div>
          </div>
        `
      });
    } else {
      const tx = this.transactions.find(t => t.id === id);
      if (!tx) return;

      let itemRows = '';
      if (tx.tipe === 'produk' && tx.items) {
        itemRows = `
          <div style="margin: 12px 0;">
            <div style="font-size: 12px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">Daftar Item:</div>
            ${tx.items.map(i => `
              <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 13.5px;">
                <span>${Utils.escapeHtml(i.nama_produk)} ${i.varian ? `<span style="color: #38bdf8; font-weight: 600;">(${Utils.escapeHtml(i.varian)})</span>` : ''} × ${i.qty}</span>
                <span style="font-family: var(--font-mono);">${Utils.formatRupiah(i.harga_saat_itu * i.qty)}</span>
              </div>
            `).join('')}
          </div>
        `;
      } else if (tx.tipe === 'billing') {
        itemRows = `
          <div style="background: rgba(255,255,255,0.02); padding: 12px; border-radius: 8px; margin: 12px 0;">
            <div style="display: flex; justify-content: space-between; font-size: 13.5px; margin-bottom: 4px;">
              <span style="color: var(--text-muted);">Paket Billing:</span>
              <strong>${Utils.escapeHtml(tx.paket_nama || '')}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13.5px; margin-bottom: 4px;">
              <span style="color: var(--text-muted);">Tier:</span>
              <span style="text-transform: uppercase; color: var(--color-primary); font-weight: 700;">${tx.tier}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13.5px;">
              <span style="color: var(--text-muted);">Jumlah Unit PC:</span>
              <strong>${tx.jumlah_pc} PC (@ ${Utils.formatRupiah(tx.harga_saat_itu)})</strong>
            </div>
          </div>
        `;
      }

      const isTxVoid = tx.status === 'void';
      Dialog.show({
        title: `🧾 Struk Transaksi #TRX-${tx.id}`,
        contentHtml: `
          <div style="display: flex; flex-direction: column; gap: 10px; font-size: 14px;">
            ${isTxVoid ? `
              <div style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 10px 14px; color: #ef4444; font-weight: 700; text-align: center; font-size: 13px;">
                ⚠️ TRANSAKSI TELAH DI-VOID / DIBATALKAN
                ${tx.voided_at ? `<div style="font-size: 11px; font-weight: normal; margin-top: 3px; color: var(--text-muted);">Waktu Void: ${Utils.formatDateTime(tx.voided_at)}</div>` : ''}
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Waktu:</span>
              <span>${Utils.formatDateTime(tx.created_at)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Operator:</span>
              <span>${Utils.escapeHtml(tx.operator_nama || State.user.nama)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Metode Bayar:</span>
              <span style="font-weight: 700; text-transform: uppercase;">${tx.metode_bayar}</span>
            </div>

            ${itemRows}

            <div style="border-top: 1px solid var(--border-subtle); padding-top: 10px; display: flex; justify-content: space-between; font-size: 18px; font-weight: 800;">
              <span>Total:</span>
              <span style="color: ${isTxVoid ? 'var(--text-muted)' : 'var(--color-primary)'};">
                ${isTxVoid ? `<s>${Utils.formatRupiah(tx.total)}</s> <span style="color: #ef4444; font-size: 12px; margin-left: 6px;">(VOID)</span>` : Utils.formatRupiah(tx.total)}
              </span>
            </div>

            ${tx.metode_bayar === 'cash' ? `
              <div style="display: flex; justify-content: space-between; font-size: 14px;">
                <span style="color: var(--text-muted);">Uang Diterima:</span>
                <span style="font-family: var(--font-mono);">${Utils.formatRupiah(tx.nominal_bayar)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 700; color: var(--color-cash);">
                <span>Kembalian:</span>
                <span style="font-family: var(--font-mono);">${Utils.formatRupiah(tx.kembalian)}</span>
              </div>
            ` : ''}
          </div>
        `
      });
    }
  },

  renderShiftsTable() {
    const tbody = document.getElementById('tbody-shifts');
    if (!tbody) return;

    if (this.pastShifts.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; padding: 40px; color: var(--text-muted);">
            Belum ada data shift sebelumnya.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.pastShifts.map(s => {
      const isClosed = s.status === 'closed';
      const statusBadge = isClosed
        ? '<span class="badge badge-active">Selesai Tutup</span>'
        : '<span class="badge badge-product" style="background: rgba(56,189,248,0.15); color: var(--color-primary);">Sedang Berjalan</span>';

      let diffKasBadge = '-';
      if (s.selisih_kas !== null && s.selisih_kas !== undefined) {
        if (s.selisih_kas === 0) {
          diffKasBadge = '<span style="color: var(--color-cash); font-weight: 700;">Rp 0 ✅</span>';
        } else {
          diffKasBadge = `<span style="color: var(--color-warning); font-weight: 700;">${Utils.formatRupiah(s.selisih_kas)} ⚠️</span>`;
        }
      }

      return `
        <tr>
          <td style="font-weight: 700; font-family: var(--font-mono);">#SHIFT-${s.id}</td>
          <td style="font-weight: 600;">${Utils.escapeHtml(s.operator_nama)}</td>
          <td style="font-size: 12.5px; color: var(--text-secondary);">${Utils.formatDateTime(s.started_at)}</td>
          <td style="font-size: 12.5px; color: var(--text-secondary);">${s.closed_at ? Utils.formatDateTime(s.closed_at) : 'Masih Buka'}</td>
          <td style="font-family: var(--font-mono);">${Utils.formatRupiah(s.saldo_awal)}</td>
          <td style="font-family: var(--font-mono); font-weight: 700;">${Utils.formatRupiah(s.total_pendapatan || 0)}</td>
          <td>${statusBadge}</td>
          <td>${diffKasBadge}</td>
          <td>
            ${isClosed ? `
              <button type="button" class="btn btn-sm btn-secondary btn-view-shift-recon" data-id="${s.id}">
                Audit Rekon
              </button>
            ` : '-'}
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-view-shift-recon').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id, 10);
        const s = this.pastShifts.find(item => item.id === id);
        if (!s) return;

        Dialog.show({
          title: `🔒 Rekonsiliasi Shift #SHIFT-${s.id}`,
          contentHtml: `
            <div style="display: flex; flex-direction: column; gap: 14px; font-size: 13.5px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px;">
                <div><span style="color: var(--text-muted);">Operator:</span> <strong>${Utils.escapeHtml(s.operator_nama)}</strong></div>
                <div><span style="color: var(--text-muted);">Total Transaksi:</span> <strong>${s.total_transaksi || 0} TRX</strong></div>
                <div><span style="color: var(--text-muted);">Mulai:</span> ${Utils.formatTime(s.started_at)}</div>
                <div><span style="color: var(--text-muted);">Selesai:</span> ${Utils.formatTime(s.closed_at)}</div>
              </div>

              <!-- QRIS Recon Box -->
              <div style="background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.2); padding: 12px; border-radius: 8px;">
                <div style="font-weight: 700; color: var(--color-qris); margin-bottom: 6px;">📱 Rekonsiliasi QRIS:</div>
                <div style="display: flex; justify-content: space-between;"><span>Total App: ${Utils.formatRupiah(s.qris_app)}</span> <span>Total EDC: ${Utils.formatRupiah(s.qris_edc)}</span></div>
                <div style="margin-top: 4px; font-weight: 700;">Selisih: ${Utils.formatRupiah(s.selisih_qris)} ${s.selisih_qris === 0 ? '✅' : '⚠️'}</div>
                ${s.catatan_qris ? `<div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Catatan: "${Utils.escapeHtml(s.catatan_qris)}"</div>` : ''}
              </div>

              <!-- Billing Recon Box -->
              <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.2); padding: 12px; border-radius: 8px;">
                <div style="font-weight: 700; color: var(--color-primary); margin-bottom: 6px;">💻 Rekonsiliasi Billing Cyberindo:</div>
                <div style="display: flex; justify-content: space-between;"><span>Total App: ${Utils.formatRupiah(s.billing_app)}</span> <span>Total Cyberindo: ${Utils.formatRupiah(s.billing_cyberindo)}</span></div>
                <div style="margin-top: 4px; font-weight: 700;">Selisih: ${Utils.formatRupiah(s.selisih_billing)} ${s.selisih_billing === 0 ? '✅' : '⚠️'}</div>
                ${s.catatan_billing ? `<div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Catatan: "${Utils.escapeHtml(s.catatan_billing)}"</div>` : ''}
              </div>

              <!-- Cash Recon Box -->
              <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); padding: 12px; border-radius: 8px;">
                <div style="font-weight: 700; color: var(--color-cash); margin-bottom: 6px;">💵 Rekonsiliasi Kas Fisik:</div>
                <div style="display: flex; justify-content: space-between;"><span>Kas Seharusnya: ${Utils.formatRupiah(s.kas_seharusnya)}</span> <span>Kas Fisik di Laci: ${Utils.formatRupiah(s.kas_fisik)}</span></div>
                <div style="margin-top: 4px; font-weight: 700;">Selisih: ${Utils.formatRupiah(s.selisih_kas)} ${s.selisih_kas === 0 ? '✅' : '⚠️'}</div>
                ${s.catatan_kas ? `<div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Catatan: "${Utils.escapeHtml(s.catatan_kas)}"</div>` : ''}
              </div>
            </div>
          `
        });
      });
    });
  },

  attachEvents() {
    Sidebar.attachEvents();
    this.loadData();

    // Main Tab Toggle (Transaksi vs Shift)
    const mainTabs = document.querySelectorAll('#history-main-tabs .tab-btn');
    const viewTx = document.getElementById('view-transactions');
    const viewShifts = document.getElementById('view-shifts');

    mainTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        mainTabs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeTab = btn.dataset.tab;

        if (this.activeTab === 'transaksi') {
          viewTx.style.display = 'block';
          viewShifts.style.display = 'none';
        } else {
          viewTx.style.display = 'none';
          viewShifts.style.display = 'block';
        }
      });
    });

    // Scope Buttons (Shift Ini vs Semua)
    const btnScopeCurrent = document.getElementById('btn-scope-current');
    const btnScopeAll = document.getElementById('btn-scope-all');

    if (btnScopeCurrent && btnScopeAll) {
      btnScopeCurrent.addEventListener('click', () => {
        this.filterScope = 'shift_ini';
        btnScopeCurrent.className = 'btn btn-sm btn-primary';
        btnScopeAll.className = 'btn btn-sm btn-secondary';
        this.loadData();
      });

      btnScopeAll.addEventListener('click', () => {
        this.filterScope = 'semua';
        btnScopeAll.className = 'btn btn-sm btn-primary';
        btnScopeCurrent.className = 'btn btn-sm btn-secondary';
        this.loadData();
      });
    }

    // Button Preview Rekap Produk
    const btnPreviewRekap = document.getElementById('btn-preview-rekap');
    if (btnPreviewRekap) {
      btnPreviewRekap.addEventListener('click', () => {
        this.showProductRekapPreview();
      });
    }

    // Type Filter Buttons (Semua, Produk, Billing, Pengeluaran)
    const typeBtns = document.querySelectorAll('#view-transactions [data-type]');
    typeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        typeBtns.forEach(b => b.className = 'btn btn-sm btn-secondary');
        btn.className = 'btn btn-sm btn-primary';
        this.filterType = btn.dataset.type;
        this.renderTransactionsTable();
      });
    });

    // Reset History & Shift for Admin
    const resetBtn = document.getElementById('btn-reset-history');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        Dialog.show({
          title: '⚠️ Reset Seluruh Riwayat & Shift',
          contentHtml: `
            <div style="display: flex; flex-direction: column; gap: 14px;">
              <div style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--border-radius-md); padding: 14px; color: var(--color-danger); font-size: 13.5px; line-height: 1.5;">
                <strong>PERHATIAN OWNER:</strong> Fitur ini akan mereset dan menghapus <strong>seluruh riwayat transaksi</strong>, <strong>catatan pengeluaran</strong>, dan <strong>audit shift</strong>.
              </div>
              <p style="font-size: 13.5px; color: var(--text-secondary); margin: 0;">
                Semua data transaksi dan riwayat shift akan kembali ke keadaan kosong (Rp 0). Master produk dan paket billing tetap aman.
              </p>
              <p style="font-size: 13px; font-weight: 600; color: var(--text-primary); margin: 0;">
                Ketik kata <span style="color: var(--color-danger); background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px; font-family: var(--font-mono);">RESET</span> di bawah untuk konfirmasi:
              </p>
              <div class="form-group" style="margin: 0;">
                <input type="text" id="input-confirm-reset-hist" class="form-control" placeholder="Ketik RESET" autofocus>
              </div>
              <div class="dialog-footer" style="margin-top: 8px;">
                <button type="button" class="btn btn-secondary" onclick="Dialog.close();">Batal</button>
                <button type="button" class="btn btn-danger" id="btn-execute-reset-hist" disabled>
                  🗑️ Ya, Reset Seluruh Data
                </button>
              </div>
            </div>
          `,
          onOpen: (dlg) => {
            const confirmInp = dlg.querySelector('#input-confirm-reset-hist');
            const execBtn = dlg.querySelector('#btn-execute-reset-hist');
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
                await this.loadData();
              } catch (err) {
                Toast.error('Gagal mereset data: ' + err.message);
                execBtn.disabled = false;
                execBtn.textContent = '🗑️ Ya, Reset Seluruh Data';
              }
            });
          }
        });
      });
    }
  },

  async showProductRekapPreview() {
    try {
      // 1. Selalu ambil data transaksi khusus Shift Aktif Saat Ini (bukan dari semua riwayat)
      let activeShiftTxs = [];
      if (this.filterScope === 'shift_ini' && this.transactions) {
        activeShiftTxs = this.transactions;
      } else {
        const res = await Api.get('/api/transactions', { filter_scope: 'shift_ini' });
        activeShiftTxs = res.transactions || [];
      }

      // 2. Hanya transaksi bertipe 'produk' yang berstatus aktif (tidak di-void) pada shift aktif
      const productTxs = activeShiftTxs.filter(t => t.tipe === 'produk' && t.status !== 'void');

      // 3. Kelompokkan per kombinasi: (kategori + nama produk + varian + metode bayar)
      const groupedMap = new Map();
      let grandQty = 0;
      let grandTotal = 0;
      let cashTotal = 0;
      let qrisTotal = 0;

      const catSummary = {
        Makanan: { qty: 0, total: 0 },
        Minuman: { qty: 0, total: 0 },
        Rokok: { qty: 0, total: 0 },
        Lainnya: { qty: 0, total: 0 }
      };

      productTxs.forEach(tx => {
        const metode = (tx.metode_bayar || 'cash').toLowerCase();
        const items = tx.items || [];

        items.forEach(item => {
          const namaProduk = (item.nama_produk || 'Produk').trim();
          const varian = (item.varian && item.varian.trim()) ? item.varian.trim() : '';
          let kategori = (item.kategori || 'Lainnya').trim();
          if (kategori === 'Minuman Botol') kategori = 'Minuman';

          const qty = parseInt(item.qty, 10) || 0;
          const harga = parseInt(item.harga_saat_itu, 10) || 0;
          const subtotal = qty * harga;

          grandQty += qty;
          grandTotal += subtotal;
          if (metode === 'cash') cashTotal += subtotal;
          if (metode === 'qris') qrisTotal += subtotal;

          // Track category summary
          if (catSummary[kategori]) {
            catSummary[kategori].qty += qty;
            catSummary[kategori].total += subtotal;
          } else {
            catSummary.Lainnya.qty += qty;
            catSummary.Lainnya.total += subtotal;
          }

          const key = `${kategori}|||${namaProduk.toLowerCase()}|||${varian.toLowerCase()}|||${metode}`;
          if (!groupedMap.has(key)) {
            groupedMap.set(key, {
              nama_produk: namaProduk,
              kategori: kategori,
              varian: varian || '-',
              has_varian: !!varian,
              qty: qty,
              metode_bayar: metode,
              total: subtotal
            });
          } else {
            const existing = groupedMap.get(key);
            existing.qty += qty;
            existing.total += subtotal;
          }
        });
      });

      const groupedList = Array.from(groupedMap.values());
      const catOrder = { 'Makanan': 1, 'Minuman': 2, 'Rokok': 3, 'Lainnya': 4 };
      groupedList.sort((a, b) => {
        const cComp = (catOrder[a.kategori] || 99) - (catOrder[b.kategori] || 99);
        if (cComp !== 0) return cComp;
        const nComp = a.nama_produk.localeCompare(b.nama_produk);
        if (nComp !== 0) return nComp;
        const vComp = (a.varian || '').localeCompare(b.varian || '');
        if (vComp !== 0) return vComp;
        return a.metode_bayar.localeCompare(b.metode_bayar);
      });

      const renderRows = (list) => {
        if (!list || list.length === 0) {
          return `
            <tr>
              <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">
                Tidak ada data transaksi produk yang cocok.
              </td>
            </tr>
          `;
        }
        return list.map(row => {
          let catBadge = '';
          if (row.kategori === 'Makanan') {
            catBadge = '<span class="badge" style="background: rgba(234, 179, 8, 0.12); color: #eab308; border: 1px solid rgba(234, 179, 8, 0.25); font-weight: 600;">🍜 Makanan</span>';
          } else if (row.kategori === 'Minuman') {
            catBadge = '<span class="badge" style="background: rgba(56, 189, 248, 0.12); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.25); font-weight: 600;">🥤 Minuman</span>';
          } else if (row.kategori === 'Rokok') {
            catBadge = '<span class="badge" style="background: rgba(244, 63, 94, 0.12); color: #fb7185; border: 1px solid rgba(244, 63, 94, 0.25); font-weight: 600;">🚬 Rokok</span>';
          } else {
            catBadge = `<span class="badge" style="background: rgba(255, 255, 255, 0.08); color: var(--text-muted);">${Utils.escapeHtml(row.kategori)}</span>`;
          }

          return `
            <tr>
              <td style="font-weight: 600;">${Utils.escapeHtml(row.nama_produk)}</td>
              <td>${catBadge}</td>
              <td>
                ${row.has_varian 
                  ? `<span class="badge" style="background: rgba(56,189,248,0.12); color: #38bdf8; border: 1px solid rgba(56,189,248,0.25); font-weight: 600;">${Utils.escapeHtml(row.varian)}</span>`
                  : '<span style="color: var(--text-muted); font-size: 12px;">-</span>'}
              </td>
              <td style="text-align: center; font-family: var(--font-mono); font-weight: 700; font-size: 14px;">
                ${row.qty}
              </td>
              <td>
                ${row.metode_bayar === 'cash' 
                  ? '<span class="badge badge-cash">💵 Cash</span>' 
                  : '<span class="badge badge-qris">📱 QRIS</span>'}
              </td>
              <td style="text-align: right; font-family: var(--font-mono); font-weight: 700; color: var(--color-primary);">
                ${Utils.formatRupiah(row.total)}
              </td>
            </tr>
          `;
        }).join('');
      };

      Dialog.show({
        title: '📊 Rekap Penjualan Produk (Shift Aktif)',
        maxWidth: '860px',
        contentHtml: `
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <!-- Shift Banner & Stats -->
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: var(--border-radius-md); padding: 12px 16px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 13px; color: var(--text-muted);">Cakupan:</span>
                <span class="badge badge-product">🟢 Shift Aktif Saat Ini</span>
                <span style="font-size: 12px; color: var(--text-muted); font-family: var(--font-mono);">(${productTxs.length} transaksi produk)</span>
              </div>
              <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap; font-size: 13px;">
                <div>Total Qty: <strong id="rekap-stat-qty" style="color: #fff; font-family: var(--font-mono);">${grandQty} pcs</strong></div>
                <div>Cash: <strong id="rekap-stat-cash" style="color: var(--color-cash); font-family: var(--font-mono);">${Utils.formatRupiah(cashTotal)}</strong></div>
                <div>QRIS: <strong id="rekap-stat-qris" style="color: var(--color-qris); font-family: var(--font-mono);">${Utils.formatRupiah(qrisTotal)}</strong></div>
                <div>Total: <strong id="rekap-stat-total" style="color: var(--color-primary); font-family: var(--font-mono); font-size: 15px;">${Utils.formatRupiah(grandTotal)}</strong></div>
              </div>
            </div>

            <!-- Category Summary Breakdown Bar -->
            <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap; background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: var(--border-radius-md); padding: 10px 16px; font-size: 13px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span>🍜</span> <strong>Makanan:</strong> 
                <span style="color: #eab308; font-family: var(--font-mono); font-weight: 600;">${catSummary.Makanan.qty} pcs</span>
                <span style="color: var(--text-muted); font-size: 12px; font-family: var(--font-mono);">(${Utils.formatRupiah(catSummary.Makanan.total)})</span>
              </div>
              <span style="color: var(--border-subtle);">·</span>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span>🥤</span> <strong>Minuman:</strong> 
                <span style="color: #38bdf8; font-family: var(--font-mono); font-weight: 600;">${catSummary.Minuman.qty} pcs</span>
                <span style="color: var(--text-muted); font-size: 12px; font-family: var(--font-mono);">(${Utils.formatRupiah(catSummary.Minuman.total)})</span>
              </div>
              <span style="color: var(--border-subtle);">·</span>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span>🚬</span> <strong>Rokok:</strong> 
                <span style="color: #fb7185; font-family: var(--font-mono); font-weight: 600;">${catSummary.Rokok.qty} pcs</span>
                <span style="color: var(--text-muted); font-size: 12px; font-family: var(--font-mono);">(${Utils.formatRupiah(catSummary.Rokok.total)})</span>
              </div>
              ${catSummary.Lainnya.qty > 0 ? `
                <span style="color: var(--border-subtle);">·</span>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span>📦</span> <strong>Lainnya:</strong> 
                  <span style="color: var(--text-primary); font-family: var(--font-mono); font-weight: 600;">${catSummary.Lainnya.qty} pcs</span>
                  <span style="color: var(--text-muted); font-size: 12px; font-family: var(--font-mono);">(${Utils.formatRupiah(catSummary.Lainnya.total)})</span>
                </div>
              ` : ''}
            </div>

            <!-- Filter Chips Row -->
            <div class="filter-tabs" id="rekap-category-tabs" style="margin-bottom: 0; display: flex; gap: 8px;">
              <button type="button" class="tab-btn active" data-cat="all">Semua</button>
              <button type="button" class="tab-btn" data-cat="Makanan">🍜 Makanan</button>
              <button type="button" class="tab-btn" data-cat="Minuman">🥤 Minuman</button>
              <button type="button" class="tab-btn" data-cat="Rokok">🚬 Rokok</button>
              ${catSummary.Lainnya.qty > 0 ? `<button type="button" class="tab-btn" data-cat="Lainnya">📦 Lainnya</button>` : ''}
            </div>

            <!-- Grouped Table -->
            <div class="table-responsive" style="max-height: 380px; overflow-y: auto; border: 1px solid var(--border-subtle); border-radius: var(--border-radius-md);">
              <table class="data-table" style="margin: 0; width: 100%;">
                <thead style="position: sticky; top: 0; z-index: 2; background: #151d30;">
                  <tr>
                    <th>Nama Produk</th>
                    <th>Kategori</th>
                    <th>Varian</th>
                    <th style="text-align: center;">Qty</th>
                    <th>Metode Bayar</th>
                    <th style="text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody id="tbody-rekap-produk">
                  ${renderRows(groupedList)}
                </tbody>
              </table>
            </div>

            <!-- Modal Footer -->
            <div class="dialog-footer" style="justify-content: space-between; margin-top: 4px;">
              <div style="font-size: 12.5px; color: var(--text-muted);">
                Total: <strong id="rekap-footer-count">${groupedList.length}</strong> kombinasi produk (Shift Aktif)
              </div>
              <div style="display: flex; gap: 10px;">
                <button type="button" class="btn btn-secondary" onclick="Dialog.close();">Tutup</button>
                <button type="button" class="btn btn-primary" id="btn-download-rekap-csv" ${groupedList.length === 0 ? 'disabled' : ''} style="display: inline-flex; align-items: center; gap: 6px;">
                  📥 Download CSV
                </button>
              </div>
            </div>
          </div>
        `,
        onOpen: (dlg) => {
          let currentCategory = 'all';
          let currentFilteredList = groupedList;

          const statQtyEl = dlg.querySelector('#rekap-stat-qty');
          const statCashEl = dlg.querySelector('#rekap-stat-cash');
          const statQrisEl = dlg.querySelector('#rekap-stat-qris');
          const statTotalEl = dlg.querySelector('#rekap-stat-total');
          const footerCountEl = dlg.querySelector('#rekap-footer-count');
          const tbodyEl = dlg.querySelector('#tbody-rekap-produk');
          const downloadBtn = dlg.querySelector('#btn-download-rekap-csv');

          const updateView = (cat) => {
            currentCategory = cat;
            if (cat === 'all') {
              currentFilteredList = groupedList;
            } else {
              currentFilteredList = groupedList.filter(r => r.kategori === cat);
            }

            // Hitung ulang stats sesuai kategori yang dipilih
            let fQty = 0;
            let fCash = 0;
            let fQris = 0;
            let fTotal = 0;
            currentFilteredList.forEach(r => {
              fQty += r.qty;
              fTotal += r.total;
              if (r.metode_bayar === 'cash') fCash += r.total;
              if (r.metode_bayar === 'qris') fQris += r.total;
            });

            if (statQtyEl) statQtyEl.textContent = `${fQty} pcs`;
            if (statCashEl) statCashEl.textContent = Utils.formatRupiah(fCash);
            if (statQrisEl) statQrisEl.textContent = Utils.formatRupiah(fQris);
            if (statTotalEl) statTotalEl.textContent = Utils.formatRupiah(fTotal);
            if (footerCountEl) footerCountEl.textContent = currentFilteredList.length;
            if (tbodyEl) tbodyEl.innerHTML = renderRows(currentFilteredList);
            if (downloadBtn) downloadBtn.disabled = currentFilteredList.length === 0;
          };

          // Filter tabs click handlers
          const tabBtns = dlg.querySelectorAll('#rekap-category-tabs .tab-btn');
          tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
              tabBtns.forEach(b => b.classList.remove('active'));
              btn.classList.add('active');
              updateView(btn.dataset.cat);
            });
          });

          // Download button
          if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
              this.downloadRekapCsv(currentFilteredList, currentCategory);
            });
          }
        }
      });
    } catch (err) {
      Toast.error('Gagal memuat rekap produk shift aktif: ' + err.message);
    }
  },

  downloadRekapCsv(groupedList, categoryName = 'all') {
    if (!groupedList || groupedList.length === 0) {
      Toast.warning('Tidak ada data produk untuk diunduh');
      return;
    }

    const headers = ['Nama Produk', 'Kategori', 'Varian', 'Qty', 'Metode Bayar', 'Total'];
    const rows = groupedList.map(r => [
      `"${(r.nama_produk || '').replace(/"/g, '""')}"`,
      `"${(r.kategori || '').replace(/"/g, '""')}"`,
      `"${(r.has_varian ? r.varian : '-').replace(/"/g, '""')}"`,
      r.qty,
      `"${(r.metode_bayar || '').toUpperCase()}"`,
      r.total
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    let dateStr = '';
    try {
      dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    } catch (e) {
      dateStr = new Date().toISOString().slice(0, 10);
    }
    const catSuffix = (categoryName && categoryName !== 'all') ? `-${categoryName.toLowerCase()}` : '';
    a.href = url;
    a.download = `rekap-produk${catSuffix}-shift-aktif-${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    Toast.success(`File CSV rekap produk ${categoryName !== 'all' ? '(' + categoryName + ') ' : ''}(Shift Aktif) berhasil diunduh!`);
  }
};
