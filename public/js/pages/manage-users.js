// Layar: Manajemen User / Operator (Admin Only)
const ManageUsersPage = {
  users: [],

  async render() {
    return `
      <div class="layout-wrapper">
        ${Sidebar.render('#/manage-users')}
        <div class="main-wrapper">
          <header class="top-header">
            <div class="page-title-box">
              <h1>👥 Manajemen User & Operator</h1>
            </div>
            <div class="header-status-box">
              <button type="button" class="btn btn-primary" id="btn-add-user">
                ➕ Tambah User Baru
              </button>
              <a href="#/home" class="btn btn-sm btn-secondary">← Kembali ke Home</a>
            </div>
          </header>

          <main class="page-container">
            <div class="card" style="padding: 0; overflow: hidden;">
              <div style="padding: 20px 24px; border-bottom: 1px solid var(--border-subtle);">
                <h3 style="font-size: 14px; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; margin: 0;">
                  Daftar Akun Pengguna Sistem
                </h3>
              </div>
              <div class="table-responsive">
                <table class="data-table" id="table-users">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Username</th>
                      <th>Nama Lengkap</th>
                      <th>Role</th>
                      <th>Terdaftar</th>
                      <th style="text-align: center;">Aksi</th>
                    </tr>
                  </thead>
                  <tbody id="tbody-users">
                    <tr>
                      <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">
                        Memuat data user...
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        </div>
      </div>

      <!-- Modal Tambah / Edit User -->
      <div id="modal-user-form" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:1000; display:none; align-items:center; justify-content:center;">
        <div class="card" style="width: 440px; max-width: 95vw; padding: 32px; position: relative;">
          <h2 id="modal-user-title" style="font-size: 18px; margin-bottom: 24px;">Tambah User Baru</h2>

          <form id="form-user">
            <div class="form-group" id="field-username">
              <label class="form-label" for="input-username">Username</label>
              <input type="text" id="input-username" class="form-control" placeholder="Contoh: rezi" autocomplete="off">
              <small style="color: var(--text-muted); font-size: 11px;">Huruf kecil, tanpa spasi. Tidak bisa diubah setelah dibuat.</small>
            </div>

            <div class="form-group">
              <label class="form-label" for="input-nama">Nama Lengkap</label>
              <input type="text" id="input-nama" class="form-control" placeholder="Contoh: Rezi Pratama">
            </div>

            <div class="form-group">
              <label class="form-label" for="select-role">Role</label>
              <select id="select-role" class="form-control">
                <option value="operator">Operator (Kasir)</option>
                <option value="admin">Admin (Owner)</option>
              </select>
            </div>

            <div class="form-group" id="field-password">
              <label class="form-label" for="input-password">Password</label>
              <input type="password" id="input-password" class="form-control" placeholder="Minimal 4 karakter" autocomplete="new-password">
            </div>

            <div style="display: flex; gap: 12px; margin-top: 24px;">
              <button type="submit" class="btn btn-primary" id="btn-user-submit" style="flex: 1;">Simpan</button>
              <button type="button" class="btn btn-secondary" id="btn-user-cancel" style="flex: 1;">Batal</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal Ganti Password -->
      <div id="modal-change-password" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:1000; align-items:center; justify-content:center;">
        <div class="card" style="width: 380px; max-width: 95vw; padding: 32px; position: relative;">
          <h2 style="font-size: 18px; margin-bottom: 8px;">🔑 Ganti Password</h2>
          <p id="modal-pw-subtitle" style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;"></p>

          <form id="form-change-password">
            <div class="form-group">
              <label class="form-label" for="input-new-password">Password Baru</label>
              <input type="password" id="input-new-password" class="form-control" placeholder="Minimal 4 karakter" autocomplete="new-password">
            </div>

            <div style="display: flex; gap: 12px; margin-top: 20px;">
              <button type="submit" class="btn btn-primary" style="flex: 1;">Ubah Password</button>
              <button type="button" class="btn btn-secondary" id="btn-pw-cancel" style="flex: 1;">Batal</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  async loadUsers() {
    try {
      const res = await Api.get('/api/users');
      this.users = res.users || [];
      this.renderTable();
    } catch (err) {
      Toast.error('Gagal memuat data user: ' + err.message);
    }
  },

  renderTable() {
    const tbody = document.getElementById('tbody-users');
    if (!tbody) return;

    if (this.users.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 50px 20px; color: var(--text-muted);">
            Belum ada user yang terdaftar.
          </td>
        </tr>
      `;
      return;
    }

    const me = State.user;

    tbody.innerHTML = this.users.map(u => `
      <tr>
        <td style="font-family: var(--font-mono); color: var(--text-muted);">#${u.id}</td>
        <td>
          <code style="background: rgba(255,255,255,0.05); padding: 2px 8px; border-radius: 4px; font-size: 13px;">${Utils.escapeHtml(u.username)}</code>
          ${u.id === me.id ? '<span class="badge" style="background:rgba(99,102,241,0.15);color:#818cf8;border:1px solid rgba(99,102,241,0.3);font-size:9px;margin-left:4px;">ANDA</span>' : ''}
        </td>
        <td style="font-weight: 600;">${Utils.escapeHtml(u.nama)}</td>
        <td>
          <span class="badge ${u.role === 'admin' ? 'badge-billing' : 'badge-product'}" style="text-transform: uppercase; font-size: 10px;">
            ${u.role === 'admin' ? '👑 Admin' : '🧑‍💼 Operator'}
          </span>
        </td>
        <td style="font-size: 12px; color: var(--text-muted);">${Utils.formatDate ? Utils.formatDate(u.created_at) : u.created_at}</td>
        <td style="text-align: center;">
          <div style="display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
            <button type="button" class="btn btn-sm btn-secondary btn-edit-user" data-id="${u.id}" title="Edit nama & role">
              ✏️ Edit
            </button>
            <button type="button" class="btn btn-sm" style="background: rgba(245,158,11,0.12); color: #f59e0b; border: 1px solid rgba(245,158,11,0.3);" class="btn-change-pw" data-id="${u.id}" data-nama="${Utils.escapeHtml(u.nama)}" title="Ganti password">
              🔑 Password
            </button>
            ${u.id !== me.id ? `
              <button type="button" class="btn btn-sm btn-danger btn-delete-user" data-id="${u.id}" data-nama="${Utils.escapeHtml(u.nama)}" title="Hapus user">
                🗑️ Hapus
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `).join('');

    // Attach edit buttons
    tbody.querySelectorAll('.btn-edit-user').forEach(btn => {
      btn.addEventListener('click', () => {
        const user = this.users.find(u => u.id === parseInt(btn.dataset.id));
        if (user) this.openEditModal(user);
      });
    });

    // Attach change password buttons
    tbody.querySelectorAll('[class*="btn-change-pw"], [title="Ganti password"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        const nama = btn.dataset.nama;
        this.openPasswordModal(id, nama);
      });
    });

    // Attach delete buttons
    tbody.querySelectorAll('.btn-delete-user').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        const nama = btn.dataset.nama;
        this.confirmDeleteUser(id, nama);
      });
    });
  },

  // --- Modal Tambah/Edit ---
  _editingId: null,

  openAddModal() {
    this._editingId = null;
    document.getElementById('modal-user-title').textContent = '➕ Tambah User Baru';
    document.getElementById('field-username').style.display = '';
    document.getElementById('field-password').style.display = '';
    document.getElementById('form-user').reset();
    document.getElementById('modal-user-form').style.display = 'flex';
    document.getElementById('input-username').focus();
  },

  openEditModal(user) {
    this._editingId = user.id;
    document.getElementById('modal-user-title').textContent = `✏️ Edit User: ${user.username}`;
    document.getElementById('field-username').style.display = 'none'; // username tidak bisa diubah
    document.getElementById('field-password').style.display = 'none'; // password pakai modal terpisah
    document.getElementById('input-nama').value = user.nama;
    document.getElementById('select-role').value = user.role;
    document.getElementById('modal-user-form').style.display = 'flex';
    document.getElementById('input-nama').focus();
  },

  closeUserModal() {
    document.getElementById('modal-user-form').style.display = 'none';
    this._editingId = null;
  },

  // --- Modal Ganti Password ---
  _pwUserId: null,

  openPasswordModal(userId, nama) {
    this._pwUserId = userId;
    document.getElementById('modal-pw-subtitle').textContent = `User: ${nama}`;
    document.getElementById('form-change-password').reset();
    document.getElementById('modal-change-password').style.display = 'flex';
    document.getElementById('input-new-password').focus();
  },

  closePwModal() {
    document.getElementById('modal-change-password').style.display = 'none';
    this._pwUserId = null;
  },

  // --- Delete ---
  confirmDeleteUser(id, nama) {
    Dialog.confirm({
      title: 'Hapus User',
      message: `Apakah Anda yakin ingin menghapus user <strong>${nama}</strong>?<br><small style="color: var(--text-muted);">User yang punya riwayat shift tidak bisa dihapus.</small>`,
      confirmText: 'Hapus',
      confirmClass: 'btn-danger',
      onConfirm: async () => {
        try {
          await Api.delete(`/api/users/${id}`);
          Toast.success(`User "${nama}" berhasil dihapus`);
          await this.loadUsers();
        } catch (err) {
          Toast.error('Gagal hapus user: ' + err.message);
        }
      }
    });
  },

  attachEvents() {
    Sidebar.attachEvents();

    // Muat data
    this.loadUsers();

    // Tombol tambah user
    document.getElementById('btn-add-user')?.addEventListener('click', () => this.openAddModal());

    // Tombol batal modal user
    document.getElementById('btn-user-cancel')?.addEventListener('click', () => this.closeUserModal());

    // Tombol batal modal password
    document.getElementById('btn-pw-cancel')?.addEventListener('click', () => this.closePwModal());

    // Close modal klik backdrop
    document.getElementById('modal-user-form')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeUserModal();
    });
    document.getElementById('modal-change-password')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closePwModal();
    });

    // Submit form user (tambah / edit)
    document.getElementById('form-user')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('btn-user-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Menyimpan...';

      try {
        if (this._editingId) {
          // Mode Edit
          const nama = document.getElementById('input-nama').value.trim();
          const role = document.getElementById('select-role').value;
          await Api.put(`/api/users/${this._editingId}`, { nama, role });
          Toast.success('Data user berhasil diperbarui!');
        } else {
          // Mode Tambah
          const username = document.getElementById('input-username').value.trim();
          const nama = document.getElementById('input-nama').value.trim();
          const role = document.getElementById('select-role').value;
          const password = document.getElementById('input-password').value;
          await Api.post('/api/users', { username, nama, role, password });
          Toast.success('User baru berhasil ditambahkan!');
        }
        this.closeUserModal();
        await this.loadUsers();
      } catch (err) {
        Toast.error(err.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Simpan';
      }
    });

    // Submit form ganti password
    document.getElementById('form-change-password')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = document.getElementById('input-new-password').value;
      const submitBtn = e.target.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Mengubah...';

      try {
        await Api.patch(`/api/users/${this._pwUserId}/password`, { password });
        Toast.success('Password berhasil diubah!');
        this.closePwModal();
      } catch (err) {
        Toast.error('Gagal ganti password: ' + err.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Ubah Password';
      }
    });
  }
};
