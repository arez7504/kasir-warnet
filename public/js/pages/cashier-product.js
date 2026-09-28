// Layar 4: Kasir Produk
const CashierProductPage = {
  products: [],
  selectedCategory: 'Semua',
  searchQuery: '',

  async render() {
    return `
      <div class="layout-wrapper">
        ${Sidebar.render('#/cashier-product')}
        <div class="main-wrapper">
          <header class="top-header">
            <div class="page-title-box">
              <h1>🛒 Kasir Penjualan Produk</h1>
            </div>
            <div class="header-status-box">
              <a href="#/home" class="btn btn-sm btn-secondary">← Kembali ke Home</a>
            </div>
          </header>

          <main class="page-container">
            <div class="pos-layout">
              <!-- Left: Product Catalog -->
              <div class="product-catalog-box">
                <!-- Search & Filters -->
                <div class="catalog-search-bar">
                  <input type="text" id="input-search-product" class="form-control" placeholder="🔍 Cari nama produk..." style="flex: 1;" value="${Utils.escapeHtml(this.searchQuery)}">
                </div>

                <div class="filter-tabs" id="pos-category-tabs">
                  <button type="button" class="tab-btn ${this.selectedCategory === 'Semua' ? 'active' : ''}" data-category="Semua">Semua</button>
                  <button type="button" class="tab-btn ${this.selectedCategory === 'Minuman' ? 'active' : ''}" data-category="Minuman">🥤 Minuman</button>
                  <button type="button" class="tab-btn ${this.selectedCategory === 'Makanan' ? 'active' : ''}" data-category="Makanan">🍜 Makanan</button>
                  <button type="button" class="tab-btn ${this.selectedCategory === 'Rokok' ? 'active' : ''}" data-category="Rokok">🚬 Rokok</button>
                </div>

                <!-- Product Grid -->
                <div class="product-grid" id="pos-product-grid">
                  <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
                    Memuat daftar produk...
                  </div>
                </div>
              </div>

              <!-- Right: Cart Panel -->
              <div class="cart-panel" id="pos-cart-panel">
                <div class="cart-header">
                  <h3 style="font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                    <span>🛍️</span> Keranjang Belanja
                  </h3>
                  <button type="button" class="btn btn-sm btn-secondary" id="btn-clear-cart" title="Kosongkan Keranjang">
                    🗑️ Reset
                  </button>
                </div>

                <div class="cart-items-list" id="pos-cart-items">
                  <!-- Populated dynamically -->
                </div>

                <div class="cart-footer">
                  <div class="cart-total-line">
                    <span class="cart-total-label">Total Pembayaran:</span>
                    <span class="cart-total-amount" id="pos-cart-total">Rp 0</span>
                  </div>

                  <div class="cart-actions">
                    <button type="button" class="btn btn-cash btn-full" id="btn-pay-cash" disabled>
                      💵 Bayar Cash
                    </button>
                    <button type="button" class="btn btn-qris btn-full" id="btn-pay-qris" disabled>
                      📱 Bayar QRIS
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    `;
  },

  async loadProducts() {
    try {
      const res = await Api.get('/api/products', { aktif: 1 });
      this.products = res.products || [];
      this.renderProductGrid();
    } catch (err) {
      Toast.error('Gagal memuat produk: ' + err.message);
    }
  },

  renderProductGrid() {
    const grid = document.getElementById('pos-product-grid');
    if (!grid) return;

    let filtered = this.products;

    if (this.selectedCategory !== 'Semua') {
      if (this.selectedCategory === 'Minuman') {
        filtered = filtered.filter(p => p.kategori === 'Minuman' || p.kategori === 'Minuman Botol');
      } else {
        filtered = filtered.filter(p => p.kategori === this.selectedCategory);
      }
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p => 
        p.nama.toLowerCase().includes(q) || 
        (p.varian && p.varian.toLowerCase().includes(q))
      );
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
          <div style="font-size: 36px; margin-bottom: 8px;">🔍</div>
          <p>Tidak ada produk yang cocok ditemukan.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(p => {
      const isOutOfStock = p.stok <= 0;
      const isLowStock = p.stok > 0 && p.stok <= 5;
      const stockBadgeClass = isOutOfStock ? 'zero' : (isLowStock ? 'low' : '');
      const stockLabel = isOutOfStock ? 'Habis' : `${p.stok} stok`;

      return `
        <div class="product-card ${isOutOfStock ? 'out-of-stock' : ''}" data-id="${p.id}" id="prod-card-${p.id}">
          <span class="product-badge-cat">${Utils.escapeHtml(p.kategori)}</span>
          <div class="product-name">${Utils.escapeHtml(p.nama)}</div>
          ${p.varian ? `<span class="product-variant">🏷️ ${Utils.escapeHtml(p.varian)}</span>` : ''}
          <div class="product-card-footer">
            <span class="product-price">${Utils.formatRupiah(p.harga)}</span>
            <span class="product-stock ${stockBadgeClass}">${stockLabel}</span>
          </div>
        </div>
      `;
    }).join('');

    // Attach click events to cards
    grid.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = parseInt(card.dataset.id, 10);
        const product = this.products.find(p => p.id === id);
        if (product) {
          State.addToCart(product);
          this.renderCart();
        }
      });
    });
  },

  renderCart() {
    const listElem = document.getElementById('pos-cart-items');
    const totalElem = document.getElementById('pos-cart-total');
    const btnCash = document.getElementById('btn-pay-cash');
    const btnQris = document.getElementById('btn-pay-qris');

    if (!listElem) return;

    const cart = State.cart;
    const total = State.getCartTotal();

    if (cart.length === 0) {
      listElem.innerHTML = `
        <div class="cart-empty">
          <div style="font-size: 32px;">🛒</div>
          <p style="font-size: 13.5px;">Keranjang belanja masih kosong</p>
          <span style="font-size: 11.5px;">Pilih produk di katalog untuk menambahkan</span>
        </div>
      `;
      totalElem.textContent = 'Rp 0';
      btnCash.disabled = true;
      btnQris.disabled = true;
      return;
    }

    listElem.innerHTML = cart.map(item => `
      <div class="cart-item-row" data-id="${item.product.id}">
        <div class="cart-item-info">
          <div class="cart-item-title">
            ${Utils.escapeHtml(item.product.nama)}
            ${item.product.varian ? `<span style="font-size: 11.5px; color: #38bdf8; font-weight: 600; margin-left: 4px;">(${Utils.escapeHtml(item.product.varian)})</span>` : ''}
          </div>
          <div class="cart-item-subprice">
            ${item.qty} × ${Utils.formatRupiah(item.product.harga)} = <strong style="color: var(--text-primary);">${Utils.formatRupiah(item.product.harga * item.qty)}</strong>
          </div>
        </div>
        <div class="cart-qty-control">
          <button type="button" class="qty-btn btn-cart-dec" data-id="${item.product.id}">−</button>
          <span class="cart-qty-num">${item.qty}</span>
          <button type="button" class="qty-btn btn-cart-inc" data-id="${item.product.id}">+</button>
          <button type="button" class="qty-btn btn-cart-del" data-id="${item.product.id}" style="color: var(--color-danger); margin-left: 4px;">🗑️</button>
        </div>
      </div>
    `).join('');

    totalElem.textContent = Utils.formatRupiah(total);
    btnCash.disabled = false;
    btnQris.disabled = false;

    // Attach listeners for cart actions
    listElem.querySelectorAll('.btn-cart-dec').forEach(btn => {
      btn.addEventListener('click', () => {
        State.updateCartQty(parseInt(btn.dataset.id, 10), -1);
        this.renderCart();
      });
    });

    listElem.querySelectorAll('.btn-cart-inc').forEach(btn => {
      btn.addEventListener('click', () => {
        State.updateCartQty(parseInt(btn.dataset.id, 10), 1);
        this.renderCart();
      });
    });

    listElem.querySelectorAll('.btn-cart-del').forEach(btn => {
      btn.addEventListener('click', () => {
        State.removeFromCart(parseInt(btn.dataset.id, 10));
        this.renderCart();
      });
    });
  },

  async handleCheckout(metode_bayar, nominal_bayar = null) {
    const items = State.cart.map(item => ({
      product_id: item.product.id,
      qty: item.qty
    }));

    try {
      const res = await Api.post('/api/transactions/product', {
        items,
        metode_bayar,
        nominal_bayar
      });

      // Show receipt modal
      const kembalianText = metode_bayar === 'cash' 
        ? `<div style="display: flex; justify-content: space-between; font-size: 16px; color: var(--color-cash); font-weight: 700; margin-top: 8px;">
            <span>Kembalian:</span>
            <span>${Utils.formatRupiah(res.kembalian)}</span>
          </div>` 
        : '';

      const itemsListHtml = res.items && res.items.length > 0 ? `
        <div style="margin: 10px 0; border-top: 1px dashed var(--border-subtle); border-bottom: 1px dashed var(--border-subtle); padding: 8px 0; font-size: 13px;">
          ${res.items.map(i => `
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>${Utils.escapeHtml(i.nama)} ${i.varian ? `<span style="color: #38bdf8; font-weight: 600;">(${Utils.escapeHtml(i.varian)})</span>` : ''} × ${i.qty}</span>
              <span style="font-family: var(--font-mono); font-weight: 600;">${Utils.formatRupiah(i.subtotal)}</span>
            </div>
          `).join('')}
        </div>
      ` : '';

      Dialog.show({
        title: '✅ Transaksi Berhasil',
        contentHtml: `
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div style="text-align: center; padding: 12px 0;">
              <div style="font-size: 40px; margin-bottom: 4px;">🎉</div>
              <h3 style="font-size: 18px;">Pembayaran Selesai</h3>
              <p style="font-size: 13px; color: var(--text-muted);">ID Transaksi: #TRX-${res.transaction_id}</p>
            </div>

            <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: var(--border-radius-md); padding: 14px;">
              <div style="display: flex; justify-content: space-between; font-size: 13.5px; margin-bottom: 6px;">
                <span style="color: var(--text-secondary);">Metode Bayar:</span>
                <span style="font-weight: 700; text-transform: uppercase;">${res.metode_bayar}</span>
              </div>
              ${itemsListHtml}
              <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 700;">
                <span>Total:</span>
                <span style="color: var(--color-primary);">${Utils.formatRupiah(res.total)}</span>
              </div>
              ${kembalianText}
            </div>

            <div class="dialog-footer" style="justify-content: center;">
              <button type="button" class="btn btn-primary" id="btn-receipt-done">
                Selesai / Transaksi Baru
              </button>
            </div>
          </div>
        `,
        onOpen: (dlg) => {
          dlg.querySelector('#btn-receipt-done').addEventListener('click', () => {
            Dialog.close();
          });
        }
      });

      State.clearCart();
      this.renderCart();
      await this.loadProducts(); // reload updated stocks
      Toast.success('Transaksi produk berhasil disimpan!');
    } catch (err) {
      Toast.error('Gagal memproses transaksi: ' + err.message);
    }
  },

  attachEvents() {
    Sidebar.attachEvents();
    this.loadProducts();
    this.renderCart();

    // Category Tabs
    const tabs = document.querySelectorAll('#pos-category-tabs .tab-btn');
    tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        tabs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedCategory = btn.dataset.category;
        this.renderProductGrid();
      });
    });

    // Search input
    const searchInp = document.getElementById('input-search-product');
    if (searchInp) {
      searchInp.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.renderProductGrid();
      });
    }

    // Clear cart button
    const clearBtn = document.getElementById('btn-clear-cart');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (State.cart.length > 0) {
          Dialog.confirm({
            title: 'Kosongkan Keranjang',
            message: 'Apakah Anda yakin ingin mengosongkan seluruh isi keranjang?',
            confirmText: 'Kosongkan',
            confirmClass: 'btn-danger',
            onConfirm: () => {
              State.clearCart();
              this.renderCart();
            }
          });
        }
      });
    }

    // Cash Pay Button
    const btnCash = document.getElementById('btn-pay-cash');
    if (btnCash) {
      btnCash.addEventListener('click', () => {
        const total = State.getCartTotal();
        if (total <= 0) return;
        Dialog.showCashPayment({
          total,
          onConfirm: (received) => {
            this.handleCheckout('cash', received);
          }
        });
      });
    }

    // QRIS Pay Button
    const btnQris = document.getElementById('btn-pay-qris');
    if (btnQris) {
      btnQris.addEventListener('click', () => {
        const total = State.getCartTotal();
        if (total <= 0) return;
        Dialog.showQrisPayment({
          total,
          onConfirm: () => {
            this.handleCheckout('qris');
          }
        });
      });
    }
  }
};
