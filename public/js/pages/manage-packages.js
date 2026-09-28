// Layar 10: Manajemen Paket Billing & Tier (Admin)
const ManagePackagesPage = {
  packages: [],
  tiers: [],
  selectedTierFilter: 'all',

  async render() {
    return `
      <div class="layout-wrapper">
        ${Sidebar.render('#/manage-packages')}
        <div class="main-wrapper">
          <header class="top-header">
            <div class="page-title-box">
              <h1>⚡ Manajemen Paket Billing Cyberindo</h1>
            </div>
            <div class="header-status-box" style="display: flex; gap: 10px; align-items: center;">
              <button type="button" class="btn btn-secondary" id="btn-manage-tiers">
                🏷️ Tambahkan Tier
              </button>
              <button type="button" class="btn btn-primary" id="btn-add-package">
                ➕ Tambah Paket Billing Baru
              </button>
            </div>
          </header>

          <main class="page-container">
            <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: var(--border-radius-md); padding: 14px 18px; margin-bottom: 24px; font-size: 13.5px; color: var(--text-secondary);">
              💡 <strong>Manajemen Tarif & Tier:</strong> Tambahkan tier ruangan/PC (seperti Reguler, Premium, VIP) pada fitur <strong>Tambahkan Tier</strong>, lalu atur paket billing dengan waktu billing dan harga sesuai tier masing-masing.
            </div>

            <!-- Filter Bar -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
              <div style="display: flex; align-items: center; gap: 8px;" id="tier-filter-container">
                <span style="font-size: 13px; color: var(--text-muted); font-weight: 600;">Filter Tier:</span>
                <div style="display: flex; gap: 6px; flex-wrap: wrap;" id="tier-filter-buttons">
                  <button type="button" class="btn btn-sm btn-primary filter-tier-btn" data-tier="all">Semua</button>
                </div>
              </div>
              <div style="font-size: 13px; color: var(--text-muted);" id="packages-count-badge">
                Memuat data...
              </div>
            </div>

            <!-- Packages Table Card -->
            <div class="card" style="padding: 0; overflow: hidden;">
              <div class="table-responsive">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th style="width: 70px;">ID</th>
                      <th>Nama Paket</th>
                      <th>Waktu Billing</th>
                      <th style="text-align: center;">Tier</th>
                      <th style="text-align: right; color: var(--color-primary);">Harga Billing</th>
                      <th style="text-align: center; width: 170px;">Aksi</th>
                    </tr>
                  </thead>
                  <tbody id="tbody-manage-packages">
                    <tr>
                      <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">
                        Memuat data paket billing...
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

  async loadTiers() {
    try {
      const res = await Api.get('/api/tiers');
      this.tiers = res.tiers || [];
      this.renderTierFilterButtons();
    } catch (err) {
      console.error('Gagal mengambil data tier:', err);
    }
  },

  async loadPackages() {
    try {
      const res = await Api.get('/api/packages');
      this.packages = res.packages || [];
      this.renderTable();
    } catch (err) {
      Toast.error('Gagal mengambil paket billing: ' + err.message);
    }
  },

  getTierColor(tierName = '') {
    const t = tierName.toLowerCase();
    if (t === 'reguler') return { color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)', border: 'rgba(56, 189, 248, 0.3)' };
    if (t === 'premium') return { color: '#a855f7', bg: 'rgba(168, 85, 247, 0.12)', border: 'rgba(168, 85, 247, 0.3)' };
    if (t === 'vip') return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)' };
    if (t.includes('vvip')) return { color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)', border: 'rgba(236, 72, 153, 0.3)' };
    return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)' };
  },

  renderTierFilterButtons() {
    const container = document.getElementById('tier-filter-buttons');
    if (!container) return;

    let html = `
      <button type="button" class="btn btn-sm ${this.selectedTierFilter === 'all' ? 'btn-primary' : 'btn-secondary'} filter-tier-btn" data-tier="all">
        Semua
      </button>
    `;

    this.tiers.forEach(t => {
      const isSelected = this.selectedTierFilter.toLowerCase() === t.nama.toLowerCase();
      html += `
        <button type="button" class="btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'} filter-tier-btn" data-tier="${Utils.escapeHtml(t.nama)}">
          ${Utils.escapeHtml(t.nama)}
        </button>
      `;
    });

    container.innerHTML = html;

    container.querySelectorAll('.filter-tier-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedTierFilter = btn.dataset.tier;
        this.renderTierFilterButtons();
        this.renderTable();
      });
    });
  },

  renderTable() {
    const tbody = document.getElementById('tbody-manage-packages');
    const countBadge = document.getElementById('packages-count-badge');
    if (!tbody) return;

    let filtered = this.packages;
    if (this.selectedTierFilter !== 'all') {
      filtered = this.packages.filter(p => (p.tier || '').toLowerCase() === this.selectedTierFilter.toLowerCase());
    }

    if (countBadge) {
      countBadge.textContent = `Total: ${filtered.length} paket billing`;
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">
            ${this.selectedTierFilter === 'all'
          ? 'Belum ada paket billing yang terdaftar. Klik "+ Tambah Paket Billing Baru" untuk membuat paket.'
          : `Belum ada paket billing untuk tier "${Utils.escapeHtml(this.selectedTierFilter)}".`}
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(pkg => {
      const tierStyle = this.getTierColor(pkg.tier || 'Reguler');
      const tierBadge = `
        <span style="display: inline-block; padding: 3px 10px; font-size: 11.5px; font-weight: 700; text-transform: uppercase; border-radius: 999px; color: ${tierStyle.color}; background: ${tierStyle.bg}; border: 1px solid ${tierStyle.border};">
          ${Utils.escapeHtml(pkg.tier || 'Reguler')}
        </span>
      `;

      return `
        <tr>
          <td style="font-family: var(--font-mono); font-weight: 600; color: var(--text-muted);">#${pkg.id}</td>
          <td style="font-weight: 700; font-size: 14px;">${Utils.escapeHtml(pkg.nama)}</td>
          <td style="font-size: 13.5px; color: var(--text-secondary);">${Utils.escapeHtml(pkg.waktu || '-')}</td>
          <td style="text-align: center;">${tierBadge}</td>
          <td style="text-align: right; font-family: var(--font-mono); font-weight: 700; color: var(--color-primary); font-size: 14.5px;">
            ${Utils.formatRupiah(pkg.harga || 0)}
          </td>
          <td style="text-align: center;">
            <div style="display: flex; gap: 8px; justify-content: center;">
              <button type="button" class="btn btn-sm btn-secondary btn-edit-pkg" data-id="${pkg.id}" title="Edit Paket">
                ✏️ Edit
              </button>
              <button type="button" class="btn btn-sm btn-danger btn-delete-pkg" data-id="${pkg.id}" title="Hapus Paket">
                🗑️ Hapus
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach Edit listeners
    tbody.querySelectorAll('.btn-edit-pkg').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id, 10);
        this.showPackageModal(id);
      });
    });

    // Attach Delete listeners
    tbody.querySelectorAll('.btn-delete-pkg').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id, 10);
        this.handleDeletePackage(id);
      });
    });
  },

  handleDeletePackage(pkgId) {
    const pkg = this.packages.find(p => p.id === pkgId);
    if (!pkg) return;

    Dialog.confirm({
      title: '🗑️ Hapus Paket Billing',
      message: `Apakah Anda yakin ingin menghapus paket billing <strong>${Utils.escapeHtml(pkg.nama)}</strong> (Tier: ${Utils.escapeHtml(pkg.tier || 'Reguler')})?<br><br><span style="color: var(--color-danger); font-size: 12.5px;">* Paket yang dihapus tidak dapat dipulihkan kembali. Riwayat transaksi lama tetap tersimpan.</span>`,
      confirmText: '🗑️ Ya, Hapus Paket',
      confirmClass: 'btn-danger',
      onConfirm: async () => {
        try {
          const res = await Api.delete(`/api/packages/${pkgId}`);
          Toast.success(res.message || 'Paket billing berhasil dihapus');
          await this.loadPackages();
        } catch (err) {
          Toast.error('Gagal menghapus paket: ' + err.message);
        }
      }
    });
  },

  showTierModal() {
    Dialog.show({
      title: '🏷️ Kelola & Tambahkan Tier',
      maxWidth: '520px',
      contentHtml: `
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <!-- Form Tambah Tier -->
          <form id="form-add-tier" style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: var(--border-radius-md); padding: 16px; display: flex; flex-direction: column; gap: 12px;">
            <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
              <span>➕</span> Tambah Tier Baru
            </div>
            <div style="display: flex; gap: 8px;">
              <input type="text" id="modal-tier-nama" class="form-control" placeholder="Contoh: Reguler, Premium, VIP, VVIP, Sofa..." required autofocus style="flex: 1;">
              <button type="submit" class="btn btn-primary" id="btn-save-tier" style="white-space: nowrap;">
                ➕ Simpan Tier
              </button>
            </div>
            <div style="font-size: 11.5px; color: var(--text-muted);">
              Tier baru dapat diisi sesuka hati dan akan langsung tersedia pada pemilihan tier paket billing & kasir billing.
            </div>
          </form>

          <!-- List Tier Terdaftar -->
          <div>
            <div style="font-size: 13px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px;">
              Daftar Tier Terdaftar:
            </div>
            <div id="modal-tiers-list" style="display: flex; flex-direction: column; gap: 8px; max-height: 250px; overflow-y: auto;">
              <div style="text-align: center; color: var(--text-muted); padding: 20px;">Memuat tier...</div>
            </div>
          </div>

          <div class="dialog-footer" style="margin-top: 4px;">
            <button type="button" class="btn btn-secondary" onclick="Dialog.close();">Tutup</button>
          </div>
        </div>
      `,
      onOpen: (dlg) => {
        const renderModalTiers = () => {
          const listElem = dlg.querySelector('#modal-tiers-list');
          if (!listElem) return;

          if (this.tiers.length === 0) {
            listElem.innerHTML = `
              <div style="text-align: center; color: var(--text-muted); padding: 20px;">
                Belum ada tier. Masukkan nama tier di atas untuk menambahkan.
              </div>
            `;
            return;
          }

          listElem.innerHTML = this.tiers.map(t => {
            const tierStyle = this.getTierColor(t.nama);
            const countForTier = this.packages.filter(p => (p.tier || '').toLowerCase() === t.nama.toLowerCase()).length;

            return `
              <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: var(--border-radius-sm); padding: 10px 14px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="display: inline-block; padding: 3px 10px; font-size: 12px; font-weight: 700; text-transform: uppercase; border-radius: 999px; color: ${tierStyle.color}; background: ${tierStyle.bg}; border: 1px solid ${tierStyle.border};">
                    ${Utils.escapeHtml(t.nama)}
                  </span>
                  <span style="font-size: 12px; color: var(--text-muted);">
                    (${countForTier} paket terdaftar)
                  </span>
                </div>
                <button type="button" class="btn btn-sm btn-secondary btn-del-tier" data-id="${t.id}" data-nama="${Utils.escapeHtml(t.nama)}" title="Hapus Tier" style="color: var(--color-danger); border-color: rgba(239, 68, 68, 0.3);">
                  🗑️ Hapus
                </button>
              </div>
            `;
          }).join('');

          listElem.querySelectorAll('.btn-del-tier').forEach(btn => {
            btn.addEventListener('click', async () => {
              const tierId = parseInt(btn.dataset.id, 10);
              const tierNama = btn.dataset.nama;

              Dialog.confirm({
                title: 'Hapus Tier',
                message: `Apakah Anda yakin ingin menghapus tier <strong>${Utils.escapeHtml(tierNama)}</strong>?`,
                confirmText: 'Hapus Tier',
                confirmClass: 'btn-danger',
                onConfirm: async () => {
                  try {
                    const res = await Api.delete(`/api/tiers/${tierId}`);
                    Toast.success(res.message || 'Tier berhasil dihapus');
                    await this.loadTiers();
                    renderModalTiers();
                    // Reopen tier modal to refresh
                    this.showTierModal();
                  } catch (err) {
                    Toast.error(err.message || 'Gagal menghapus tier');
                  }
                }
              });
            });
          });
        };

        renderModalTiers();

        const formAdd = dlg.querySelector('#form-add-tier');
        formAdd.addEventListener('submit', async (e) => {
          e.preventDefault();
          const inputNama = dlg.querySelector('#modal-tier-nama');
          const valNama = inputNama.value.trim();

          if (!valNama) {
            Toast.error('Nama tier wajib diisi');
            return;
          }

          try {
            const res = await Api.post('/api/tiers', { nama: valNama });
            Toast.success(res.message || `Tier "${valNama}" berhasil ditambahkan!`);
            inputNama.value = '';
            await this.loadTiers();
            renderModalTiers();
          } catch (err) {
            Toast.error(err.message || 'Gagal menambahkan tier');
          }
        });
      }
    });
  },

  showPackageModal(pkgId = null) {
    const isEdit = pkgId !== null;
    const pkg = isEdit ? this.packages.find(p => p.id === pkgId) : null;

    if (this.tiers.length === 0) {
      Toast.error('Silakan tambahkan tier terlebih dahulu melalui menu "Tambahkan Tier"');
      this.showTierModal();
      return;
    }

    const modalTitle = isEdit ? `✏️ Edit Paket Billing: ${pkg.nama}` : '➕ Tambah Paket Billing Baru';

    // Generate tier select options
    const selectedTierVal = pkg ? (pkg.tier || this.tiers[0].nama) : (this.tiers[0] ? this.tiers[0].nama : 'Reguler');
    const tierOptionsHtml = this.tiers.map(t => `
      <option value="${Utils.escapeHtml(t.nama)}" ${t.nama.toLowerCase() === selectedTierVal.toLowerCase() ? 'selected' : ''}>
        Tier ${Utils.escapeHtml(t.nama)}
      </option>
    `).join('');

    Dialog.show({
      title: modalTitle,
      maxWidth: '480px',
      contentHtml: `
        <form id="form-manage-package" style="display: flex; flex-direction: column; gap: 16px;">
          <div class="form-group">
            <label class="form-label" for="modal-pkg-nama">Nama Paket</label>
            <input type="text" id="modal-pkg-nama" class="form-control" placeholder="Contoh: Biasa 1 Jam / Malam Begadang" required value="${pkg ? Utils.escapeHtml(pkg.nama) : ''}" autofocus>
          </div>

          <div class="form-group">
            <label class="form-label" for="modal-pkg-waktu">Waktu Billing</label>
            <input type="text" id="modal-pkg-waktu" class="form-control" placeholder="Contoh: 1 Jam, 2 Jam, 23:00 - 06:00, 45 Menit" required value="${pkg ? Utils.escapeHtml(pkg.waktu || '') : ''}">
            <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 4px;">
              Kolom waktu billing bebas diisi sesuka hati (misal durasi jam, jam berlaku, dll).
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="modal-pkg-harga" style="color: var(--color-primary);">Harga Billing (Rp)</label>
            <input type="text" id="modal-pkg-harga" class="form-control form-control-money" placeholder="0" required value="${pkg ? (pkg.harga || 0).toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, '.') : ''}">
          </div>

          <div class="form-group">
            <label class="form-label" for="modal-pkg-tier">Pilih Tier</label>
            <select id="modal-pkg-tier" class="form-control" required style="cursor: pointer; background: var(--bg-card);">
              ${tierOptionsHtml}
            </select>
            <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 4px;">
              Pilihan tier berdasarkan tier yang sudah ditambahkan di fitur "Tambahkan Tier".
            </div>
          </div>

          <div class="dialog-footer" style="margin-top: 8px;">
            <button type="button" class="btn btn-secondary" onclick="Dialog.close();">Batal</button>
            <button type="submit" class="btn btn-primary" id="btn-save-pkg">
              💾 Simpan Paket
            </button>
          </div>
        </form>
      `,
      onOpen: (dlg) => {
        const hargaInp = dlg.querySelector('#modal-pkg-harga');
        let valHarga = pkg ? (pkg.harga || 0) : 0;

        Utils.bindRupiahInput(hargaInp, v => valHarga = v);

        const form = dlg.querySelector('#form-manage-package');
        form.addEventListener('submit', async (e) => {
          e.preventDefault();

          const nama = dlg.querySelector('#modal-pkg-nama').value.trim();
          const waktu = dlg.querySelector('#modal-pkg-waktu').value.trim();
          const tier = dlg.querySelector('#modal-pkg-tier').value.trim();

          if (!nama) {
            Toast.error('Nama paket wajib diisi');
            return;
          }
          if (!waktu) {
            Toast.error('Waktu billing wajib diisi');
            return;
          }
          if (valHarga <= 0) {
            Toast.error('Harga billing harus bernilai lebih dari 0');
            return;
          }
          if (!tier) {
            Toast.error('Pilih tier terlebih dahulu');
            return;
          }

          const payload = {
            nama,
            waktu,
            harga: valHarga,
            tier
          };

          try {
            if (isEdit) {
              await Api.put(`/api/packages/${pkgId}`, payload);
              Toast.success('Paket billing berhasil diperbarui!');
            } else {
              await Api.post('/api/packages', payload);
              Toast.success('Paket billing baru berhasil ditambahkan!');
            }

            Dialog.close();
            await this.loadPackages();
          } catch (err) {
            Toast.error('Gagal menyimpan paket: ' + err.message);
          }
        });
      }
    });
  },

  attachEvents() {
    Sidebar.attachEvents();
    this.loadTiers();
    this.loadPackages();

    const addPkgBtn = document.getElementById('btn-add-package');
    if (addPkgBtn) {
      addPkgBtn.addEventListener('click', () => {
        this.showPackageModal();
      });
    }

    const manageTiersBtn = document.getElementById('btn-manage-tiers');
    if (manageTiersBtn) {
      manageTiersBtn.addEventListener('click', () => {
        this.showTierModal();
      });
    }
  }
};
