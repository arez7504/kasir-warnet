// Layar 1: Login Page
const LoginPage = {
  render() {
    return `
      <div class="fullscreen-container">
        <div class="card" style="width: 100%; max-width: 440px; padding: 40px 36px; border-radius: var(--border-radius-xl); box-shadow: var(--shadow-lg);">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="width: 56px; height: 56px; background: linear-gradient(135deg, var(--color-primary), #2563eb); border-radius: 16px; margin: 0 auto 16px auto; display: flex; align-items: center; justify-content: center; font-size: 28px; box-shadow: var(--shadow-glow);">
              ⚡
            </div>
            <h1 style="font-size: 24px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;">Kasir Warnet</h1>
            <p style="color: var(--text-secondary); font-size: 13.5px; margin-top: 6px;">Sistem Kasir & Rekonsiliasi Shift</p>
          </div>

          <form id="form-login">
            <div id="login-error" style="display: none; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--border-radius-md); padding: 12px 16px; color: var(--color-danger); font-size: 13px; margin-bottom: 20px;">
              ⚠ Username atau password salah
            </div>

            <div class="form-group">
              <label class="form-label" for="input-username">👤 Username</label>
              <input type="text" id="input-username" class="form-control" placeholder="Masukkan username" required autofocus autocomplete="username">
            </div>

            <div class="form-group" style="margin-bottom: 24px;">
              <label class="form-label" for="input-password">🔒 Password</label>
              <input type="password" id="input-password" class="form-control" placeholder="Masukkan password" required autocomplete="current-password">
            </div>

            <button type="submit" class="btn btn-primary btn-full btn-lg" id="btn-submit-login">
              ▶ MASUK
            </button>
          </form>

          <!-- Quick Autofill Helper for Testing -->
          <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid var(--border-subtle); text-align: center;">
            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.05em;">
              Akun Cepat (Klik untuk isi)
            </div>
            <div style="display: flex; justify-content: center; gap: 8px; flex-wrap: wrap;">
              <button type="button" class="btn btn-sm btn-secondary" onclick="LoginPage.fillAccount('agil', 'agil123')">
                Operator: Agil
              </button>
              <button type="button" class="btn btn-sm btn-secondary" onclick="LoginPage.fillAccount('rezi', 'rezi123')">
                Operator: Rezi
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  fillAccount(u, p) {
    const userInp = document.getElementById('input-username');
    const passInp = document.getElementById('input-password');
    if (userInp && passInp) {
      userInp.value = u;
      passInp.value = p;
    }
  },

  attachEvents() {
    const form = document.getElementById('form-login');
    const errBox = document.getElementById('login-error');
    const submitBtn = document.getElementById('btn-submit-login');

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errBox.style.display = 'none';

        const username = document.getElementById('input-username').value.trim();
        const password = document.getElementById('input-password').value;

        if (!username || !password) return;

        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Memverifikasi...';

        try {
          const res = await Api.post('/api/auth/login', { username, password });
          State.setUser(res.user);
          Toast.success(`Selamat datang, ${res.user.nama}!`);

          // Set active shift and navigate directly to home (buka shift modal 0 jika belum ada)
          let shiftRes = await Api.get('/api/shifts/active');
          if (!shiftRes || !shiftRes.shift) {
            shiftRes = await Api.post('/api/shifts/open', { saldo_awal: 0 });
          }
          if (shiftRes && shiftRes.shift) {
            State.setShift(shiftRes.shift);
          }
          window.location.hash = '#/home';
        } catch (err) {
          errBox.textContent = `⚠ ${err.message || 'Gagal masuk'}`;
          errBox.style.display = 'block';
          Toast.error(err.message || 'Login gagal');
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '▶ MASUK';
        }
      });
    }
  }
};
