// Layar 9: Manajemen Produk (Admin)
const ManageProductsPage = {
  products: [],
  selectedCategory: '',
  selectedStatus: '',
  searchQuery: '',

  async render() {
    return `
      <div class="layout-wrapper">
        ${Sidebar.render('#/manage-products')}
        <div class="main-wrapper">
          <header class="top-header">
            <div class="page-title-box">
              <h1>📦 Manajemen Master Produk</h1>
            </div>
            <div class="header-status-box">
              <button type="button" class="btn btn-primary" id="btn-add-product">
                ➕ Tambah Produk Baru
              </button>
            </div>
          </header>

          <main class="page-container">
            <!-- Filter & Search Toolbar -->
            <div style="display: flex; gap: 14px; margin-bottom: 20px; flex-wrap: wrap; align-items: center;">
              <input type="text" id="filter-search-product" class="form-control" placeholder="🔍 Cari nama produk..." style="width: 260px;" value="${Utils.escapeHtml(this.searchQuery)}">

              <select id="filter-kategori-product" class="form-control" style="width: 180px;">
                <option value="">Semua Kategori</option>
                <option value="Minuman">🥤 Minuman</option>
                <option value="Makanan">🍜 Makanan</option>
                <option value="Rokok">🚬 Rokok</option>
              </select>

              <select id="filter-status-product" class="form-control" style="width: 160px;">
                <option value="">Semua Status</option>
                <option value="1">🟢 Aktif</option>
                <option value="0">⚪ Nonaktif</option>
              </select>
            </div>

            <!-- Products Table Card -->
            <div class="card" style="padding: 0; overflow: hidden;">
              <div class="table-responsive">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nama Produk</th>
                      <th>Varian</th>
                      <th>Kategori</th>
                      <th style="text-align: right;">Harga Jual</th>
                      <th style="text-align: center;">Sisa Stok</th>
                      <th style="text-align: center;">Status</th>
                      <th style="text-align: center;">Aksi</th>
                    </tr>
                  </thead>
                  <tbody id="tbody-manage-products">
                    <tr>
                      <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">
                        Memuat data produk...
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

  async loadProducts() {
    try {
      const res = await Api.get('/api/products');
      this.products = res.products || [];
      this.renderTable();
    } catch (err) {
      Toast.error('Gagal mengambil daftar produk: ' + err.message);
    }
  },

  renderTable() {
    const tbody = document.getElementById('tbody-manage-products');
    if (!tbody) return;

    let filtered = this.products;

    if (this.selectedCategory) {
      if (this.selectedCategory === 'Minuman') {
        filtered = filtered.filter(p => p.kategori === 'Minuman' || p.kategori === 'Minuman Botol');
      } else {
        filtered = filtered.filter(p => p.kategori === this.selectedCategory);
      }
    }

    if (this.selectedStatus !== '') {
      const st = parseInt(this.selectedStatus, 10);
      filtered = filtered.filter(p => p.aktif === st);
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p => 
        p.nama.toLowerCase().includes(q) || 
        (p.varian && p.varian.toLowerCase().includes(q))
      );
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">
            Tidak ada produk yang cocok dengan kriteria filter.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(p => {
      const isLow = p.stok > 0 && p.stok <= 5;
      const isZero = p.stok <= 0;
      const stockBadge = isZero 
        ? '<span class="badge badge-inactive" style="color: var(--color-danger);">Habis (0)</span>' 
        : (isLow ? `<span class="badge" style="background: rgba(245,158,11,0.15); color: var(--color-warning);">${p.stok} (Kritis)</span>` : `<strong>${p.stok}</strong>`);

      const statusBadge = p.aktif === 1 
        ? '<span class="badge badge-active">Aktif</span>' 
        : '<span class="badge badge-inactive">Nonaktif</span>';

      const varianBadge = p.varian 
        ? `<span class="badge" style="background: rgba(56,189,248,0.12); color: #38bdf8; border: 1px solid rgba(56,189,248,0.25); font-weight: 600;">${Utils.escapeHtml(p.varian)}</span>` 
        : '<span style="color: var(--text-muted); font-size: 11.5px;">-</span>';

      return `
        <tr style="${p.aktif === 0 ? 'opacity: 0.55;' : ''}">
          <td style="font-family: var(--font-mono); font-weight: 600;">#${p.id}</td>
          <td style="font-weight: 600;">${Utils.escapeHtml(p.nama)}</td>
          <td>${varianBadge}</td>
          <td><span class="badge" style="background: rgba(255,255,255,0.06);">${Utils.escapeHtml(p.kategori)}</span></td>
          <td style="text-align: right; font-family: var(--font-mono); font-weight: 700; color: var(--color-primary);">${Utils.formatRupiah(p.harga)}</td>
          <td style="text-align: center;">${stockBadge}</td>
          <td style="text-align: center;">${statusBadge}</td>
          <td style="text-align: center;">
            <div style="display: flex; gap: 6px; justify-content: center;">
              <button type="button" class="btn btn-sm btn-secondary btn-edit-prod" data-id="${p.id}" title="Edit Produk">
                ✏️ Edit
              </button>
              <button type="button" class="btn btn-sm ${p.aktif === 1 ? 'btn-secondary' : 'btn-primary'} btn-toggle-prod" data-id="${p.id}">
                ${p.aktif === 1 ? 'Nonaktifkan' : 'Aktifkan'}
              </button>
              <button type="button" class="btn btn-sm btn-secondary btn-del-prod" data-id="${p.id}" data-name="${Utils.escapeHtml(p.nama)}" title="Hapus Produk" style="color: var(--color-danger);">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach edit and toggle listeners
    tbody.querySelectorAll('.btn-edit-prod').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id, 10);
        this.showProductModal(id);
      });
    });

    tbody.querySelectorAll('.btn-toggle-prod').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.id, 10);
        try {
          const res = await Api.patch(`/api/products/${id}/toggle`);
          Toast.success(res.message);
          await this.loadProducts();
        } catch (err) {
          Toast.error('Gagal toggle status: ' + err.message);
        }
      });
    });

    tbody.querySelectorAll('.btn-del-prod').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id, 10);
        const name = btn.dataset.name;
        Dialog.confirm({
          title: 'Konfirmasi Hapus Produk',
          message: `Apakah Anda yakin ingin menghapus produk "${name}"?`,
          confirmText: 'Ya, Hapus',
          confirmClass: 'btn-danger',
          onConfirm: async () => {
            try {
              const res = await Api.delete(`/api/products/${id}`);
              Toast.success(res.message);
              await this.loadProducts();
            } catch (err) {
              Toast.error('Gagal menghapus produk: ' + err.message);
            }
          }
        });
      });
    });
  },

  showProductModal(productId = null) {
    const isEdit = productId !== null;
    const prod = isEdit ? this.products.find(p => p.id === productId) : null;

    const modalTitle = isEdit ? `✏️ Edit Produk: ${prod.nama}` : '➕ Tambah Produk Baru';

    Dialog.show({
      title: modalTitle,
      contentHtml: `
        <form id="form-manage-product" style="display: flex; flex-direction: column; gap: 14px;">
          <div class="form-group">
            <label class="form-label" for="modal-prod-nama">Nama Produk</label>
            <input type="text" id="modal-prod-nama" class="form-control" placeholder="Contoh: Aqua Kecil" required value="${prod ? Utils.escapeHtml(prod.nama) : ''}" autofocus>
          </div>

          <div class="form-group">
            <label class="form-label" for="modal-prod-varian">Varian Produk (Ukuran / Rasa)</label>
            <input type="text" id="modal-prod-varian" class="form-control" placeholder="Contoh: 600ml / Apple 350ml / Coklat 35gr" value="${prod && prod.varian ? Utils.escapeHtml(prod.varian) : ''}">
          </div>

          <div class="form-group">
            <label class="form-label" for="modal-prod-kategori">Kategori</label>
            <select id="modal-prod-kategori" class="form-control" required>
              <option value="Minuman" ${prod && (prod.kategori === 'Minuman' || prod.kategori === 'Minuman Botol') ? 'selected' : ''}>🥤 Minuman</option>
              <option value="Makanan" ${prod && prod.kategori === 'Makanan' ? 'selected' : ''}>🍜 Makanan</option>
              <option value="Rokok" ${prod && prod.kategori === 'Rokok' ? 'selected' : ''}>🚬 Rokok</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="modal-prod-harga">Harga Jual (Rp)</label>
            <input type="text" id="modal-prod-harga" class="form-control form-control-money" placeholder="0" required value="${prod ? prod.harga.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, '.') : ''}">
          </div>

          <div class="form-group">
            <label class="form-label" for="modal-prod-stok">${isEdit ? 'Jumlah Stok' : 'Stok Awal'}</label>
            <input type="number" id="modal-prod-stok" class="form-control" placeholder="0" min="0" required value="${prod ? prod.stok : '100'}">
          </div>

          <div class="dialog-footer">
            <button type="button" class="btn btn-secondary" onclick="Dialog.close();">Batal</button>
            <button type="submit" class="btn btn-primary" id="btn-save-prod">
              💾 Simpan Produk
            </button>
          </div>
        </form>
      `,
      onOpen: (dlg) => {
        const hargaInp = dlg.querySelector('#modal-prod-harga');
        let currentHarga = prod ? prod.harga : 0;

        Utils.bindRupiahInput(hargaInp, (val) => {
          currentHarga = val;
        });

        const form = dlg.querySelector('#form-manage-product');
        form.addEventListener('submit', async (e) => {
          e.preventDefault();

          const nama = dlg.querySelector('#modal-prod-nama').value.trim();
          const varian = dlg.querySelector('#modal-prod-varian').value.trim();
          const kategori = dlg.querySelector('#modal-prod-kategori').value;
          const stok = parseInt(dlg.querySelector('#modal-prod-stok').value, 10);

          if (!nama) {
            Toast.error('Nama produk wajib diisi');
            return;
          }
          if (currentHarga <= 0) {
            Toast.error('Harga jual harus lebih dari 0');
            return;
          }
          if (isNaN(stok) || stok < 0) {
            Toast.error('Stok tidak boleh bernilai negatif');
            return;
          }

          const payload = { nama, varian, kategori, harga: currentHarga, stok };

          try {
            if (isEdit) {
              await Api.put(`/api/products/${productId}`, payload);
              Toast.success('Produk berhasil diperbarui');
            } else {
              await Api.post('/api/products', payload);
              Toast.success('Produk baru berhasil ditambahkan');
            }

            Dialog.close();
            await this.loadProducts();
          } catch (err) {
            Toast.error('Gagal menyimpan produk: ' + err.message);
          }
        });
      }
    });
  },

  attachEvents() {
    Sidebar.attachEvents();
    this.loadProducts();

    const addBtn = document.getElementById('btn-add-product');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.showProductModal();
      });
    }

    const searchInp = document.getElementById('filter-search-product');
    if (searchInp) {
      searchInp.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.renderTable();
      });
    }

    const katSel = document.getElementById('filter-kategori-product');
    if (katSel) {
      katSel.addEventListener('change', (e) => {
        this.selectedCategory = e.target.value;
        this.renderTable();
      });
    }

    const statSel = document.getElementById('filter-status-product');
    if (statSel) {
      statSel.addEventListener('change', (e) => {
        this.selectedStatus = e.target.value;
        this.renderTable();
      });
    }
  }
};
