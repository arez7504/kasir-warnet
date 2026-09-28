// Layar 7: Catat Pengeluaran
const ExpensePage = {
  selectedType: 'kasbon', // 'kasbon' | 'operasional' | 'stok_masuk'
  products: [],
  recentExpenses: [],

  async render() {
    return `
      <div class="layout-wrapper">
        ${Sidebar.render('#/expense')}
        <div class="main-wrapper">
          <header class="top-header">
            <div class="page-title-box">
              <h1>💸 Catat Pengeluaran Kas</h1>
            </div>
            <div class="header-status-box">
              <a href="#/home" class="btn btn-sm btn-secondary">← Kembali ke Home</a>
            </div>
          </header>

          <main class="page-container">
            <div style="display: grid; grid-template-columns: 1fr 380px; gap: 24px; align-items: start;">
              <!-- Left: Expense Form -->
              <div class="card" style="padding: 32px;">
                <h3 style="font-size: 14px; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; margin-bottom: 16px;">
                  1. Pilih Jenis Pengeluaran
                </h3>

                <!-- Expense Type Tabs -->
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 28px;" id="expense-type-selector">
                  <div class="tier-card ${this.selectedType === 'kasbon' ? 'active' : ''}" data-type="kasbon" style="--tier-theme-color: #f59e0b; --tier-theme-bg: rgba(245, 158, 11, 0.1); --tier-theme-glow: var(--color-warning-glow);">
                    <div style="font-size: 26px; margin-bottom: 4px;">🤝</div>
                    <h3 style="font-size: 15px; color: #f59e0b;">KASBON</h3>
                    <p style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">Pinjaman karyawan</p>
                  </div>

                  <div class="tier-card ${this.selectedType === 'operasional' ? 'active' : ''}" data-type="operasional" style="--tier-theme-color: #ef4444; --tier-theme-bg: rgba(239, 68, 68, 0.1); --tier-theme-glow: var(--color-danger-glow);">
                    <div style="font-size: 26px; margin-bottom: 4px;">⚡</div>
                    <h3 style="font-size: 15px; color: #ef4444;">OPERASIONAL</h3>
                    <p style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">Galon, listrik, kebersihan</p>
                  </div>

                  <div class="tier-card ${this.selectedType === 'stok_masuk' ? 'active' : ''}" data-type="stok_masuk" style="--tier-theme-color: #10b981; --tier-theme-bg: rgba(16, 185, 129, 0.1); --tier-theme-glow: var(--color-cash-glow);">
                    <div style="font-size: 26px; margin-bottom: 4px;">📦</div>
                    <h3 style="font-size: 15px; color: #10b981;">STOK MASUK</h3>
                    <p style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">Kulakan / tambah stok</p>
                  </div>
                </div>

                <!-- Form Fields -->
                <form id="form-expense">
                  <div class="form-group">
                    <label class="form-label" for="input-expense-nominal">💵 Nominal Pengeluaran (Rp)</label>
                    <input type="text" id="input-expense-nominal" class="form-control form-control-money" placeholder="Contoh: 50.000" required autofocus>
                  </div>

                  <!-- Quick Presets -->
                  <div style="margin-bottom: 20px;">
                    <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase;">Pecahan Cepat:</div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;" id="expense-quick-presets">
                      <button type="button" class="btn btn-sm btn-secondary" data-amount="10000">10.000</button>
                      <button type="button" class="btn btn-sm btn-secondary" data-amount="20000">20.000</button>
                      <button type="button" class="btn btn-sm btn-secondary" data-amount="50000">50.000</button>
                      <button type="button" class="btn btn-sm btn-secondary" data-amount="100000">100.000</button>
                    </div>
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="input-expense-keterangan">📝 Keterangan Pengeluaran</label>
                    <input type="text" id="input-expense-keterangan" class="form-control" placeholder="Contoh: Kasbon Rezi 50rb / Beli Galon Aqua 2 Galon" required>
                  </div>

                  <!-- Conditional fields for Stok Masuk -->
                  <div id="stok-masuk-fields" style="${this.selectedType === 'stok_masuk' ? '' : 'display: none;'} background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: var(--border-radius-md); padding: 18px; margin-bottom: 20px;">
                    <div style="font-weight: 700; color: var(--color-cash); font-size: 13.5px; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                      <span>📦</span> Informasi Penambahan Stok Otomatis
                    </div>

                    <div class="form-group">
                      <label class="form-label" for="select-expense-product">Pilih Produk Yang Dibeli</label>
                      <select id="select-expense-product" class="form-control">
                        <option value="">-- Pilih Produk --</option>
                      </select>
                    </div>

                    <div class="form-group" style="margin-bottom: 0;">
                      <label class="form-label" for="input-expense-qty">Jumlah Barang Masuk (Qty)</label>
                      <input type="number" id="input-expense-qty" class="form-control" placeholder="Contoh: 10" min="1">
                    </div>
                  </div>

                  <button type="submit" class="btn btn-primary btn-full btn-lg" id="btn-submit-expense">
                    ▶ Simpan Pengeluaran
                  </button>
                </form>
              </div>

              <!-- Right: Recent Expenses This Shift -->
              <div class="card" style="padding: 24px;">
                <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
                  <span>📋</span> Pengeluaran Shift Ini
                </h3>

                <div id="recent-expenses-list" style="display: flex; flex-direction: column; gap: 10px;">
                  <div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 13px;">
                    Memuat pengeluaran...
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    `;
  },

  async loadInitialData() {
    try {
      const [prodRes, expRes] = await Promise.all([
        Api.get('/api/products', { aktif: 1 }),
        Api.get('/api/expenses', { filter_scope: 'shift_ini' })
      ]);

      this.products = prodRes.products || [];
      this.recentExpenses = expRes.expenses || [];

      this.populateProductSelect();
      this.renderRecentExpenses();
    } catch (err) {
      Toast.error('Gagal memuat data: ' + err.message);
    }
  },

  populateProductSelect() {
    const sel = document.getElementById('select-expense-product');
    if (!sel) return;

    sel.innerHTML = '<option value="">-- Pilih Produk --</option>' + this.products.map(p => `
      <option value="${p.id}">${Utils.escapeHtml(p.nama)}${p.varian ? ' - ' + Utils.escapeHtml(p.varian) : ''} (Stok: ${p.stok})</option>
    `).join('');
  },

  renderRecentExpenses() {
    const list = document.getElementById('recent-expenses-list');
    if (!list) return;

    if (this.recentExpenses.length === 0) {
      list.innerHTML = `
        <div style="text-align: center; padding: 30px 10px; color: var(--text-muted); font-size: 13px;">
          Belum ada pengeluaran yang dicatat pada shift ini.
        </div>
      `;
      return;
    }

    list.innerHTML = this.recentExpenses.map(e => `
      <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: var(--border-radius-md); padding: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span class="badge badge-expense" style="font-size: 10px;">${e.tipe.replace('_', ' ')}</span>
          <span style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">${Utils.formatTime(e.created_at)}</span>
        </div>
        <div style="font-size: 13px; font-weight: 600; margin-bottom: 4px;">${Utils.escapeHtml(e.keterangan)}</div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 11.5px; color: var(--text-muted);">${e.product_nama ? `+${e.qty} ${e.product_nama}` : ''}</span>
          <span style="font-family: var(--font-mono); font-weight: 700; color: var(--color-danger);">${Utils.formatRupiah(e.nominal)}</span>
        </div>
        <div style="display: flex; gap: 6px; justify-content: flex-end;">
          ${e.shift_status === 'closed' ? `
            <span class="badge" style="background:rgba(255,255,255,0.06);color:var(--text-muted);font-size:10.5px;padding:3px 8px;border:1px solid rgba(255,255,255,0.1);" title="Pengeluaran tidak dapat diubah karena shift sudah ditutup">🔒 Shift Ditutup</span>
          ` : `
            ${e.tipe !== 'stok_masuk' ? `
              <button type="button" class="btn btn-sm btn-secondary btn-edit-expense" data-id="${e.id}" data-nominal="${e.nominal}" data-keterangan="${Utils.escapeHtml(e.keterangan)}" style="font-size: 11px; padding: 3px 10px;">
                ✏️ Edit
              </button>
            ` : ''}
            <button type="button" class="btn btn-sm" style="background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.3);font-size:11px;padding:3px 10px;" class="btn-del-expense" data-id="${e.id}" data-tipe="${e.tipe}" data-ket="${Utils.escapeHtml(e.keterangan)}">
              🗑️ Hapus
            </button>
          `}
        </div>
      </div>
    `).join('');

    // Attach edit buttons
    list.querySelectorAll('.btn-edit-expense').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        const nominal = parseInt(btn.dataset.nominal);
        const keterangan = btn.dataset.keterangan;
        this.showEditExpenseDialog(id, nominal, keterangan);
      });
    });

    // Attach delete buttons
    list.querySelectorAll('[data-tipe]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        const tipe = btn.dataset.tipe;
        const ket = btn.dataset.ket;
        Dialog.confirm({
          title: '🗑️ Hapus Pengeluaran',
          message: `Hapus pengeluaran <strong>"${ket}"</strong>?${tipe === 'stok_masuk' ? '<br><small style="color:var(--text-muted);">Stok yang ditambahkan akan dikembalikan.</small>' : ''}`,
          confirmText: 'Hapus',
          confirmClass: 'btn-danger',
          onConfirm: async () => {
            try {
              await Api.delete(`/api/expenses/${id}`);
              Toast.success('Pengeluaran berhasil dihapus');
              await this.loadInitialData();
            } catch (err) {
              Toast.error('Gagal hapus: ' + err.message);
            }
          }
        });
      });
    });

  },

  showEditExpenseDialog(id, currentNominal, currentKeterangan) {
    const nominalFormatted = currentNominal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    Dialog.show({
      title: '✏️ Edit Pengeluaran',
      contentHtml: `
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div class="form-group" style="margin:0;">
            <label class="form-label">Nominal Baru (Rp)</label>
            <input type="text" id="edit-exp-nominal" class="form-control form-control-money" value="${nominalFormatted}" style="font-size:15px;" autocomplete="off">
          </div>
          <div class="form-group" style="margin:0;">
            <label class="form-label">Keterangan</label>
            <input type="text" id="edit-exp-keterangan" class="form-control" value="${currentKeterangan}" style="font-size:15px;">
          </div>
          <div class="dialog-footer" style="margin-top:4px;">
            <button type="button" class="btn btn-secondary" id="btn-edit-exp-cancel">Batal</button>
            <button type="button" class="btn btn-primary" id="btn-edit-exp-save">💾 Simpan</button>
          </div>
        </div>
      `,
      onOpen: (dlg) => {
        let parsedNominal = currentNominal;
        const nominalInput = dlg.querySelector('#edit-exp-nominal');

        if (nominalInput) {
          Utils.bindRupiahInput(nominalInput, (val) => { parsedNominal = val; });
        }

        dlg.querySelector('#btn-edit-exp-cancel').addEventListener('click', () => Dialog.close());

        dlg.querySelector('#btn-edit-exp-save').addEventListener('click', async () => {
          const keteranganNew = dlg.querySelector('#edit-exp-keterangan')?.value.trim() || '';

          if (isNaN(parsedNominal) || parsedNominal <= 0) {
            Toast.error('Nominal harus lebih dari 0');
            return;
          }
          if (!keteranganNew) {
            Toast.error('Keterangan wajib diisi');
            return;
          }

          const saveBtn = dlg.querySelector('#btn-edit-exp-save');
          saveBtn.disabled = true;
          saveBtn.textContent = 'Menyimpan...';

          try {
            await Api.put(`/api/expenses/${id}`, { nominal: parsedNominal, keterangan: keteranganNew });
            Toast.success('Pengeluaran berhasil diperbarui!');
            Dialog.close();
            await this.loadInitialData();
          } catch (err) {
            Toast.error('Gagal edit: ' + err.message);
            saveBtn.disabled = false;
            saveBtn.textContent = '💾 Simpan';
          }
        });
      }
    });
  },

  attachEvents() {
    Sidebar.attachEvents();
    this.loadInitialData();

    // Type cards selection
    const typeCards = document.querySelectorAll('#expense-type-selector .tier-card');
    const stokFields = document.getElementById('stok-masuk-fields');

    typeCards.forEach(card => {
      card.addEventListener('click', () => {
        typeCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.selectedType = card.dataset.type;

        if (this.selectedType === 'stok_masuk') {
          stokFields.style.display = 'block';
        } else {
          stokFields.style.display = 'none';
        }
      });
    });

    // Form inputs and presets
    const nominalInp = document.getElementById('input-expense-nominal');
    let currentNominal = 0;

    Utils.bindRupiahInput(nominalInp, (val) => {
      currentNominal = val;
    });

    const presets = document.querySelectorAll('#expense-quick-presets button');
    presets.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseInt(btn.dataset.amount, 10);
        nominalInp.value = val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        currentNominal = val;
      });
    });

    // Submit handler
    const form = document.getElementById('form-expense');
    const submitBtn = document.getElementById('btn-submit-expense');

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (currentNominal <= 0) {
          Toast.error('Nominal pengeluaran harus lebih dari 0');
          return;
        }

        const ket = document.getElementById('input-expense-keterangan').value.trim();
        if (!ket) {
          Toast.error('Keterangan pengeluaran wajib diisi');
          return;
        }

        const payload = {
          tipe: this.selectedType,
          nominal: currentNominal,
          keterangan: ket
        };

        if (this.selectedType === 'stok_masuk') {
          const prodId = document.getElementById('select-expense-product').value;
          const qty = parseInt(document.getElementById('input-expense-qty').value, 10);

          if (!prodId) {
            Toast.error('Silakan pilih produk untuk stok masuk');
            return;
          }
          if (isNaN(qty) || qty <= 0) {
            Toast.error('Qty barang masuk minimal 1');
            return;
          }

          payload.product_id = parseInt(prodId, 10);
          payload.qty = qty;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Menyimpan...';

        try {
          await Api.post('/api/expenses', payload);
          Toast.success('Pengeluaran berhasil dicatat!');

          // Reset form
          form.reset();
          currentNominal = 0;
          nominalInp.value = '';

          // Reload data
          await this.loadInitialData();
        } catch (err) {
          Toast.error('Gagal mencatat pengeluaran: ' + err.message);
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '▶ Simpan Pengeluaran';
        }
      });
    }
  }
};
