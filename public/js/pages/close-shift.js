// Layar 8: Tutup Shift (3-Step Wizard)
const CloseShiftPage = {
  currentStep: 1, // 1 | 2 | 3 | 4 (Review)
  summary: null,
  formData: {
    qris_edc: 0,
    catatan_qris: '',
    billing_cyberindo: 0,
    catatan_billing: '',
    kas_fisik: 0,
    catatan_kas: ''
  },

  async render() {
    try {
      this.summary = await Api.get('/api/shifts/summary');
    } catch (err) {
      console.error('Error fetching shift summary:', err);
    }

    if (!this.summary) {
      return `
        <div class="layout-wrapper">
          ${Sidebar.render('#/close-shift')}
          <div class="main-wrapper">
            <main class="page-container">
              <div class="card" style="text-align: center; padding: 50px;">
                <p>Tidak ada shift aktif yang dapat ditutup.</p>
                <a href="#/home" class="btn btn-primary" style="margin-top: 16px;">Kembali ke Home</a>
              </div>
            </main>
          </div>
        </div>
      `;
    }

    return `
      <div class="layout-wrapper">
        ${Sidebar.render('#/close-shift')}
        <div class="main-wrapper">
          <header class="top-header">
            <div class="page-title-box">
              <h1>🔒 Tutup Shift & Rekonsiliasi</h1>
            </div>
            <div class="header-status-box">
              <a href="#/home" class="btn btn-sm btn-secondary">← Kembali ke Home</a>
            </div>
          </header>

          <main class="page-container">
            <!-- Step Tracker -->
            <div class="wizard-steps-tracker">
              <div class="wizard-step-node ${this.currentStep >= 1 ? 'active' : ''} ${this.currentStep > 1 ? 'completed' : ''}">
                <div class="step-node-bubble">1</div>
                <span>Rekon QRIS</span>
              </div>
              <div class="wizard-divider"></div>
              <div class="wizard-step-node ${this.currentStep >= 2 ? 'active' : ''} ${this.currentStep > 2 ? 'completed' : ''}">
                <div class="step-node-bubble">2</div>
                <span>Rekon Billing</span>
              </div>
              <div class="wizard-divider"></div>
              <div class="wizard-step-node ${this.currentStep >= 3 ? 'active' : ''} ${this.currentStep > 3 ? 'completed' : ''}">
                <div class="step-node-bubble">3</div>
                <span>Rekon Kas</span>
              </div>
              <div class="wizard-divider"></div>
              <div class="wizard-step-node ${this.currentStep === 4 ? 'active' : ''}">
                <div class="step-node-bubble">4</div>
                <span>Konfirmasi</span>
              </div>
            </div>

            <!-- Dynamic Wizard Step Container -->
            <div class="reconciliation-card" id="wizard-card-body">
              ${this.renderStepContent()}
            </div>
          </main>
        </div>
      </div>
    `;
  },

  renderStepContent() {
    const s = this.summary;

    if (this.currentStep === 1) {
      const qrisApp = s.total_qris_masuk || 0;
      const diff = this.formData.qris_edc - qrisApp;
      const isMatch = diff === 0;

      return `
        <div>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
            <span style="font-size: 28px;">📱</span>
            <div>
              <h2 style="font-size: 18px;">Langkah 1: Rekonsiliasi Pembayaran QRIS</h2>
              <p style="font-size: 13px; color: var(--text-secondary);">Cocokkan total transaksi QRIS di aplikasi dengan saldo/laporan mesin EDC</p>
            </div>
          </div>

          <div class="recon-calc-row">
            <span style="color: var(--text-muted);">Total QRIS di Aplikasi (Read-only):</span>
            <span style="font-family: var(--font-mono); font-size: 18px; font-weight: 700; color: var(--color-qris);">
              ${Utils.formatRupiah(qrisApp)}
            </span>
          </div>

          <div class="form-group" style="margin-top: 18px;">
            <label class="form-label" for="step-qris-edc">Total Akhir di Mesin EDC / Rekening QRIS (Rp)</label>
            <input type="text" id="step-qris-edc" class="form-control form-control-money" placeholder="0" value="${this.formData.qris_edc ? this.formData.qris_edc.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, '.') : ''}">
          </div>

          <div class="recon-diff-box ${isMatch ? 'match' : 'differ'}" id="diff-box-qris">
            <span>Selisih QRIS:</span>
            <span id="diff-val-qris">${Utils.formatRupiah(diff)} ${isMatch ? '✅ Sesuai' : '⚠️ Berbeda'}</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="step-qris-catatan">Catatan / Alasan Selisih (Opsional)</label>
            <input type="text" id="step-qris-catatan" class="form-control" placeholder="Contoh: 1 pembayaran customer belum masuk notifikasi EDC" value="${Utils.escapeHtml(this.formData.catatan_qris)}">
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 24px;">
            <button type="button" class="btn btn-primary btn-lg" id="btn-next-step-1">
              ▶ Selanjutnya: Billing Cyberindo
            </button>
          </div>
        </div>
      `;
    }

    if (this.currentStep === 2) {
      const billingApp = s.total_billing || 0;
      const diff = this.formData.billing_cyberindo - billingApp;
      const isMatch = diff === 0;

      return `
        <div>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
            <span style="font-size: 28px;">💻</span>
            <div>
              <h2 style="font-size: 18px;">Langkah 2: Rekonsiliasi Billing Cyberindo</h2>
              <p style="font-size: 13px; color: var(--text-secondary);">Cocokkan total billing di aplikasi kasir dengan laporan shift di server Cyberindo</p>
            </div>
          </div>

          <div class="recon-calc-row">
            <span style="color: var(--text-muted);">Total Billing di Aplikasi (Read-only):</span>
            <span style="font-family: var(--font-mono); font-size: 18px; font-weight: 700; color: var(--color-primary);">
              ${Utils.formatRupiah(billingApp)}
            </span>
          </div>

          <div class="form-group" style="margin-top: 18px;">
            <label class="form-label" for="step-billing-cyberindo">Total Pendapatan di Server Cyberindo (Rp)</label>
            <input type="text" id="step-billing-cyberindo" class="form-control form-control-money" placeholder="0" value="${this.formData.billing_cyberindo ? this.formData.billing_cyberindo.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, '.') : ''}">
          </div>

          <div class="recon-diff-box ${isMatch ? 'match' : 'differ'}" id="diff-box-billing">
            <span>Selisih Billing:</span>
            <span id="diff-val-billing">${Utils.formatRupiah(diff)} ${isMatch ? '✅ Sesuai' : '⚠️ Berbeda'}</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="step-billing-catatan">Catatan / Alasan Selisih (Opsional)</label>
            <input type="text" id="step-billing-catatan" class="form-control" placeholder="Contoh: Sesi PC 12 di-void langsung di Cyberindo" value="${Utils.escapeHtml(this.formData.catatan_billing)}">
          </div>

          <div style="display: flex; justify-content: space-between; margin-top: 24px;">
            <button type="button" class="btn btn-secondary btn-lg" id="btn-prev-step-2">
              ◀ Kembali
            </button>
            <button type="button" class="btn btn-primary btn-lg" id="btn-next-step-2">
              ▶ Selanjutnya: Kas Fisik
            </button>
          </div>
        </div>
      `;
    }

    if (this.currentStep === 3) {
      const modalAwal = s.shift.saldo_awal || 0;
      const cashMasuk = s.total_cash_masuk || 0;
      const pengeluaran = s.total_pengeluaran || 0;
      const kasSeharusnya = s.kas_seharusnya || 0;
      const diff = this.formData.kas_fisik - kasSeharusnya;
      const isMatch = diff === 0;

      return `
        <div>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
            <span style="font-size: 28px;">💵</span>
            <div>
              <h2 style="font-size: 18px;">Langkah 3: Rekonsiliasi Kas Fisik di Laci</h2>
              <p style="font-size: 13px; color: var(--text-secondary);">Hitung fisik seluruh uang kertas & koin di laci kasir</p>
            </div>
          </div>

          <!-- Calculation breakdown -->
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: var(--border-radius-md); padding: 14px 18px; margin-bottom: 18px;">
            <div class="recon-calc-row">
              <span style="color: var(--text-muted);">Cash Masuk (Billing & Produk):</span>
              <span style="font-family: var(--font-mono); font-weight: 600; color: var(--color-cash);">${Utils.formatRupiah(cashMasuk)}</span>
            </div>
            <div class="recon-calc-row">
              <span style="color: var(--text-muted);">− Pengeluaran (Kasbon, Ops, Stok):</span>
              <span style="font-family: var(--font-mono); font-weight: 600; color: var(--color-danger);">−${Utils.formatRupiah(pengeluaran)}</span>
            </div>
            <div class="recon-calc-row" style="border-bottom: none; padding-top: 12px; font-size: 16px;">
              <span style="font-weight: 700;">= Kas Seharusnya di Laci:</span>
              <span style="font-family: var(--font-mono); font-weight: 800; color: #f59e0b;">${Utils.formatRupiah(kasSeharusnya)}</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="step-kas-fisik">Uang Kas Fisik Nyata di Laci (Rp)</label>
            <input type="text" id="step-kas-fisik" class="form-control form-control-money" placeholder="0" value="${this.formData.kas_fisik ? this.formData.kas_fisik.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, '.') : ''}">
          </div>

          <div class="recon-diff-box ${isMatch ? 'match' : 'differ'}" id="diff-box-kas">
            <span>Selisih Kas Fisik:</span>
            <span id="diff-val-kas">${Utils.formatRupiah(diff)} ${isMatch ? '✅ Sesuai' : '⚠️ Berbeda'}</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="step-kas-catatan">Catatan / Alasan Selisih Kas (Opsional)</label>
            <input type="text" id="step-kas-catatan" class="form-control" placeholder="Contoh: Kurang uang receh kembalian 2rb" value="${Utils.escapeHtml(this.formData.catatan_kas)}">
          </div>

          <div style="display: flex; justify-content: space-between; margin-top: 24px;">
            <button type="button" class="btn btn-secondary btn-lg" id="btn-prev-step-3">
              ◀ Kembali
            </button>
            <button type="button" class="btn btn-primary btn-lg" id="btn-next-step-3">
              ▶ Tinjau Ringkasan Akhir
            </button>
          </div>
        </div>
      `;
    }

    if (this.currentStep === 4) {
      const qrisApp = s.total_qris_masuk || 0;
      const billingApp = s.total_billing || 0;
      const kasSeharusnya = s.kas_seharusnya || 0;

      const diffQris = this.formData.qris_edc - qrisApp;
      const diffBilling = this.formData.billing_cyberindo - billingApp;
      const diffKas = this.formData.kas_fisik - kasSeharusnya;

      return `
        <div>
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="font-size: 38px; margin-bottom: 6px;">📋</div>
            <h2 style="font-size: 20px;">Ringkasan Rekonsiliasi Tutup Shift</h2>
            <p style="font-size: 13.5px; color: var(--text-secondary);">Periksa kembali seluruh data sebelum menutup shift secara permanen</p>
          </div>

          <div style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 24px;">
            <!-- QRIS Audit Summary -->
            <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: var(--border-radius-md); padding: 14px 18px;">
              <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 6px;">
                <span>📱 Rekonsiliasi QRIS</span>
                <span style="color: ${diffQris === 0 ? 'var(--color-cash)' : 'var(--color-warning)'};">
                  Selisih: ${Utils.formatRupiah(diffQris)} ${diffQris === 0 ? '✅' : '⚠️'}
                </span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 13px; color: var(--text-muted);">
                <span>App: ${Utils.formatRupiah(qrisApp)}</span>
                <span>Mesin EDC: ${Utils.formatRupiah(this.formData.qris_edc)}</span>
              </div>
              ${this.formData.catatan_qris ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Catatan: "${Utils.escapeHtml(this.formData.catatan_qris)}"</div>` : ''}
            </div>

            <!-- Billing Audit Summary -->
            <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: var(--border-radius-md); padding: 14px 18px;">
              <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 6px;">
                <span>💻 Rekonsiliasi Billing</span>
                <span style="color: ${diffBilling === 0 ? 'var(--color-cash)' : 'var(--color-warning)'};">
                  Selisih: ${Utils.formatRupiah(diffBilling)} ${diffBilling === 0 ? '✅' : '⚠️'}
                </span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 13px; color: var(--text-muted);">
                <span>App: ${Utils.formatRupiah(billingApp)}</span>
                <span>Cyberindo: ${Utils.formatRupiah(this.formData.billing_cyberindo)}</span>
              </div>
              ${this.formData.catatan_billing ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Catatan: "${Utils.escapeHtml(this.formData.catatan_billing)}"</div>` : ''}
            </div>

            <!-- Cash Audit Summary -->
            <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: var(--border-radius-md); padding: 14px 18px;">
              <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 6px;">
                <span>💵 Rekonsiliasi Kas Fisik Laci</span>
                <span style="color: ${diffKas === 0 ? 'var(--color-cash)' : 'var(--color-warning)'};">
                  Selisih: ${Utils.formatRupiah(diffKas)} ${diffKas === 0 ? '✅' : '⚠️'}
                </span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 13px; color: var(--text-muted);">
                <span>Kas Seharusnya: ${Utils.formatRupiah(kasSeharusnya)}</span>
                <span>Kas Fisik di Laci: ${Utils.formatRupiah(this.formData.kas_fisik)}</span>
              </div>
              ${this.formData.catatan_kas ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Catatan: "${Utils.escapeHtml(this.formData.catatan_kas)}"</div>` : ''}
            </div>
          </div>

          <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--border-radius-md); padding: 14px 18px; margin-bottom: 24px; font-size: 13px; color: var(--color-danger); text-align: center;">
            ⚠️ <strong>Perhatian:</strong> Setelah shift ditutup, data tidak dapat diubah kembali dan Anda akan otomatis keluar dari akun kasir.
          </div>

          <div style="display: flex; justify-content: space-between;">
            <button type="button" class="btn btn-secondary btn-lg" id="btn-prev-step-4">
              ◀ Kembali Periksa
            </button>
            <button type="button" class="btn btn-danger btn-lg" id="btn-submit-close-shift">
              🔒 Konfirmasi & Tutup Shift Sekarang
            </button>
          </div>
        </div>
      `;
    }
  },

  updateStepView() {
    const card = document.getElementById('wizard-card-body');
    if (card) {
      card.innerHTML = this.renderStepContent();
      this.attachStepEvents();
    }
  },

  attachStepEvents() {
    const s = this.summary;

    if (this.currentStep === 1) {
      const qrisInp = document.getElementById('step-qris-edc');
      const catatanInp = document.getElementById('step-qris-catatan');
      const diffBox = document.getElementById('diff-box-qris');
      const diffVal = document.getElementById('diff-val-qris');
      const btnNext = document.getElementById('btn-next-step-1');

      Utils.bindRupiahInput(qrisInp, (val) => {
        this.formData.qris_edc = val;
        const diff = val - (s.total_qris_masuk || 0);
        const isMatch = diff === 0;
        diffBox.className = `recon-diff-box ${isMatch ? 'match' : 'differ'}`;
        diffVal.textContent = `${Utils.formatRupiah(diff)} ${isMatch ? '✅ Sesuai' : '⚠️ Berbeda'}`;
      });

      if (catatanInp) {
        catatanInp.addEventListener('input', (e) => {
          this.formData.catatan_qris = e.target.value;
        });
      }

      if (btnNext) {
        btnNext.addEventListener('click', () => {
          this.currentStep = 2;
          this.render().then(html => {
            document.getElementById('app').innerHTML = html;
            this.attachEvents();
          });
        });
      }
    } else if (this.currentStep === 2) {
      const billInp = document.getElementById('step-billing-cyberindo');
      const catatanInp = document.getElementById('step-billing-catatan');
      const diffBox = document.getElementById('diff-box-billing');
      const diffVal = document.getElementById('diff-val-billing');
      const btnPrev = document.getElementById('btn-prev-step-2');
      const btnNext = document.getElementById('btn-next-step-2');

      Utils.bindRupiahInput(billInp, (val) => {
        this.formData.billing_cyberindo = val;
        const diff = val - (s.total_billing || 0);
        const isMatch = diff === 0;
        diffBox.className = `recon-diff-box ${isMatch ? 'match' : 'differ'}`;
        diffVal.textContent = `${Utils.formatRupiah(diff)} ${isMatch ? '✅ Sesuai' : '⚠️ Berbeda'}`;
      });

      if (catatanInp) {
        catatanInp.addEventListener('input', (e) => {
          this.formData.catatan_billing = e.target.value;
        });
      }

      if (btnPrev) {
        btnPrev.addEventListener('click', () => {
          this.currentStep = 1;
          this.render().then(html => {
            document.getElementById('app').innerHTML = html;
            this.attachEvents();
          });
        });
      }

      if (btnNext) {
        btnNext.addEventListener('click', () => {
          this.currentStep = 3;
          this.render().then(html => {
            document.getElementById('app').innerHTML = html;
            this.attachEvents();
          });
        });
      }
    } else if (this.currentStep === 3) {
      const kasInp = document.getElementById('step-kas-fisik');
      const catatanInp = document.getElementById('step-kas-catatan');
      const diffBox = document.getElementById('diff-box-kas');
      const diffVal = document.getElementById('diff-val-kas');
      const btnPrev = document.getElementById('btn-prev-step-3');
      const btnNext = document.getElementById('btn-next-step-3');

      Utils.bindRupiahInput(kasInp, (val) => {
        this.formData.kas_fisik = val;
        const diff = val - (s.kas_seharusnya || 0);
        const isMatch = diff === 0;
        diffBox.className = `recon-diff-box ${isMatch ? 'match' : 'differ'}`;
        diffVal.textContent = `${Utils.formatRupiah(diff)} ${isMatch ? '✅ Sesuai' : '⚠️ Berbeda'}`;
      });

      if (catatanInp) {
        catatanInp.addEventListener('input', (e) => {
          this.formData.catatan_kas = e.target.value;
        });
      }

      if (btnPrev) {
        btnPrev.addEventListener('click', () => {
          this.currentStep = 2;
          this.render().then(html => {
            document.getElementById('app').innerHTML = html;
            this.attachEvents();
          });
        });
      }

      if (btnNext) {
        btnNext.addEventListener('click', () => {
          this.currentStep = 4;
          this.render().then(html => {
            document.getElementById('app').innerHTML = html;
            this.attachEvents();
          });
        });
      }
    } else if (this.currentStep === 4) {
      const btnPrev = document.getElementById('btn-prev-step-4');
      const btnSubmit = document.getElementById('btn-submit-close-shift');

      if (btnPrev) {
        btnPrev.addEventListener('click', () => {
          this.currentStep = 3;
          this.render().then(html => {
            document.getElementById('app').innerHTML = html;
            this.attachEvents();
          });
        });
      }

      if (btnSubmit) {
        btnSubmit.addEventListener('click', async () => {
          btnSubmit.disabled = true;
          btnSubmit.innerHTML = 'Menutup shift...';

          try {
            await Api.post('/api/shifts/close', this.formData);
            Toast.success('Shift berhasil ditutup dan laporan rekonsiliasi tersimpan.');

            // Logout user from session so it doesn't bounce back and create a ghost shift
            try {
              await Api.post('/api/auth/logout');
            } catch (logoutErr) {
              console.warn('Logout after close shift error:', logoutErr);
            }
            State.setUser(null);
            State.setShift(null);

            Dialog.show({
              title: '🔒 Shift Selesai',
              contentHtml: `
                <div style="text-align: center; padding: 20px 0;">
                  <div style="font-size: 48px; margin-bottom: 10px;">👋</div>
                  <h3>Shift Berhasil Ditutup</h3>
                  <p style="color: var(--text-secondary); margin-top: 8px; font-size: 14px;">
                    Terima kasih atas kerja keras Anda hari ini. Seluruh audit rekonsiliasi telah tercatat dalam sistem dan Anda telah keluar dari sesi kasir.
                  </p>
                  <div style="margin-top: 24px;">
                    <button type="button" class="btn btn-primary btn-lg" id="btn-done-close-shift">
                      Kembali ke Halaman Login
                    </button>
                  </div>
                </div>
              `,
              onOpen: (dlg) => {
                const btnDone = dlg.querySelector('#btn-done-close-shift');
                if (btnDone) {
                  btnDone.addEventListener('click', () => {
                    Dialog.close();
                    window.location.hash = '#/login';
                  });
                }
              },
              onClose: () => {
                window.location.hash = '#/login';
              }
            });
          } catch (err) {
            Toast.error('Gagal menutup shift: ' + err.message);
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '🔒 Konfirmasi & Tutup Shift Sekarang';
          }
        });
      }
    }
  },

  attachEvents() {
    Sidebar.attachEvents();
    this.attachStepEvents();
  }
};
