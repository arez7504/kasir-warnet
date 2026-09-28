// Modal Dialog Component System
const Dialog = {
  getDialog() {
    return document.getElementById('app-dialog');
  },

  show({ title, contentHtml, maxWidth, onOpen, onClose }) {
    const dialog = this.getDialog();
    if (!dialog) return;

    if (maxWidth) {
      dialog.style.maxWidth = maxWidth;
    } else {
      dialog.style.maxWidth = '';
    }

    dialog.innerHTML = `
      <div class="dialog-modal-card">
        <div class="dialog-header">
          <h2 class="dialog-title" id="dialog-title">${Utils.escapeHtml(title)}</h2>
          <button type="button" class="dialog-close-btn" id="btn-dialog-close" aria-label="Tutup">✕</button>
        </div>
        <div class="dialog-body" id="dialog-body">
          ${contentHtml}
        </div>
      </div>
    `;

    const closeBtn = dialog.querySelector('#btn-dialog-close');
    closeBtn.addEventListener('click', () => {
      this.close();
      if (typeof onClose === 'function') onClose();
    });

    // Close on click outside (backdrop)
    dialog.onclick = (e) => {
      const rect = dialog.getBoundingClientRect();
      const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height
        && rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
      if (!isInDialog) {
        this.close();
        if (typeof onClose === 'function') onClose();
      }
    };

    dialog.showModal();

    if (typeof onOpen === 'function') {
      onOpen(dialog);
    }
  },

  close() {
    const dialog = this.getDialog();
    if (dialog && dialog.open) {
      dialog.close();
      dialog.innerHTML = '';
      dialog.style.maxWidth = '';
    }
  },

  confirm({ title, message, confirmText = 'Konfirmasi', confirmClass = 'btn-primary', onConfirm }) {
    this.show({
      title,
      contentHtml: `
        <p style="color: var(--text-secondary); margin-bottom: 20px; font-size: 14.5px;">
          ${message}
        </p>
        <div class="dialog-footer">
          <button type="button" class="btn btn-secondary" id="btn-modal-cancel">Batal</button>
          <button type="button" class="btn ${confirmClass}" id="btn-modal-confirm">${Utils.escapeHtml(confirmText)}</button>
        </div>
      `,
      onOpen: (dlg) => {
        dlg.querySelector('#btn-modal-cancel').addEventListener('click', () => this.close());
        dlg.querySelector('#btn-modal-confirm').addEventListener('click', () => {
          this.close();
          if (typeof onConfirm === 'function') onConfirm();
        });
      }
    });
  },

  // Specialized dialog for Cash Payments (Product or Billing)
  showCashPayment({ total, onConfirm }) {
    const content = `
      <div style="display: flex; flex-direction: column; gap: 18px;">
        <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: var(--border-radius-md); padding: 16px;">
          <div style="font-size: 13px; color: var(--text-muted); text-transform: uppercase;">Total Tagihan</div>
          <div style="font-size: 28px; font-weight: 800; font-family: var(--font-mono); color: var(--color-cash);" id="cash-modal-total">
            ${Utils.formatRupiah(total)}
          </div>
        </div>

        <!-- Quick Denomination Buttons -->
        <div>
          <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">Uang Pas & Pecahan:</div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;" id="cash-quick-buttons">
            <button type="button" class="btn btn-sm btn-secondary" data-val="${total}">Uang Pas</button>
            <button type="button" class="btn btn-sm btn-secondary" data-val="10000">10.000</button>
            <button type="button" class="btn btn-sm btn-secondary" data-val="20000">20.000</button>
            <button type="button" class="btn btn-sm btn-secondary" data-val="50000">50.000</button>
            <button type="button" class="btn btn-sm btn-secondary" data-val="100000">100.000</button>
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label" for="cash-input-received">Uang Diterima (Rp)</label>
          <input type="text" id="cash-input-received" class="form-control form-control-money" placeholder="0" autofocus>
        </div>

        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: var(--border-radius-md); padding: 14px; display: flex; align-items: center; justify-content: space-between;">
          <span style="font-size: 14px; font-weight: 600; color: var(--text-secondary);">Kembalian:</span>
          <span style="font-size: 22px; font-weight: 800; font-family: var(--font-mono); color: var(--color-cash);" id="cash-display-change">
            Rp 0
          </span>
        </div>

        <div id="cash-warning-msg" style="display: none; color: var(--color-danger); font-size: 13px;">
          ⚠️ Uang yang diterima kurang dari total tagihan!
        </div>

        <div class="dialog-footer" style="margin-top: 6px;">
          <button type="button" class="btn btn-secondary" id="btn-cash-cancel">Batal</button>
          <button type="button" class="btn btn-cash" id="btn-cash-confirm" disabled>
            ✅ Konfirmasi Bayar
          </button>
        </div>
      </div>
    `;

    this.show({
      title: '💵 Pembayaran Tunai (Cash)',
      contentHtml: content,
      onOpen: (dlg) => {
        const inputReceived = dlg.querySelector('#cash-input-received');
        const displayChange = dlg.querySelector('#cash-display-change');
        const warningMsg = dlg.querySelector('#cash-warning-msg');
        const btnConfirm = dlg.querySelector('#btn-cash-confirm');
        const btnCancel = dlg.querySelector('#btn-cash-cancel');
        const quickBtns = dlg.querySelectorAll('#cash-quick-buttons button');

        let currentReceived = 0;

        const updateChange = (val) => {
          currentReceived = val;
          const change = currentReceived - total;
          if (currentReceived >= total) {
            displayChange.textContent = Utils.formatRupiah(change);
            warningMsg.style.display = 'none';
            btnConfirm.disabled = false;
          } else {
            displayChange.textContent = 'Rp 0';
            btnConfirm.disabled = true;
            if (currentReceived > 0) {
              warningMsg.style.display = 'block';
            } else {
              warningMsg.style.display = 'none';
            }
          }
        };

        Utils.bindRupiahInput(inputReceived, (val) => {
          updateChange(val);
        });

        quickBtns.forEach(btn => {
          btn.addEventListener('click', () => {
            const val = parseInt(btn.dataset.val, 10);
            inputReceived.value = val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            updateChange(val);
          });
        });

        btnCancel.addEventListener('click', () => this.close());
        btnConfirm.addEventListener('click', () => {
          if (currentReceived >= total) {
            this.close();
            if (typeof onConfirm === 'function') {
              onConfirm(currentReceived);
            }
          }
        });
      }
    });
  },

  // Specialized dialog for QRIS Payments
  showQrisPayment({ total, onConfirm }) {
    const content = `
      <div style="text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px;">
        <div style="font-size: 14px; color: var(--text-secondary);">
          Silakan arahkan customer untuk scan QRIS statis / dinamis kasir
        </div>

        <div style="width: 190px; height: 190px; background: #fff; border-radius: 14px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 12px; box-shadow: var(--shadow-md);">
          <div style="font-size: 26px; font-weight: 800; color: #000; letter-spacing: 2px;">QRIS</div>
          <div style="width: 110px; height: 110px; background: #000; border-radius: 8px; margin: 6px 0; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 32px;">
            📱
          </div>
          <div style="font-size: 10px; font-weight: 700; color: #333;">NMID: ID1020304050</div>
        </div>

        <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: var(--border-radius-md); padding: 14px 20px; width: 100%;">
          <div style="font-size: 12px; color: var(--text-muted); text-transform: uppercase;">Total Pembayaran QRIS</div>
          <div style="font-size: 26px; font-weight: 800; font-family: var(--font-mono); color: var(--color-qris);">
            ${Utils.formatRupiah(total)}
          </div>
        </div>

        <p style="font-size: 12.5px; color: var(--text-muted);">
          Pastikan notifikasi dana masuk telah muncul pada mesin EDC / aplikasi sebelum menekan konfirmasi.
        </p>

        <div class="dialog-footer" style="width: 100%; justify-content: center; gap: 14px;">
          <button type="button" class="btn btn-secondary" id="btn-qris-cancel">Batal</button>
          <button type="button" class="btn btn-qris" id="btn-qris-confirm">
            ✅ Pembayaran Berhasil Diterima
          </button>
        </div>
      </div>
    `;

    this.show({
      title: '📱 Pembayaran QRIS',
      contentHtml: content,
      onOpen: (dlg) => {
        dlg.querySelector('#btn-qris-cancel').addEventListener('click', () => this.close());
        dlg.querySelector('#btn-qris-confirm').addEventListener('click', () => {
          this.close();
          if (typeof onConfirm === 'function') onConfirm();
        });
      }
    });
  }
};
