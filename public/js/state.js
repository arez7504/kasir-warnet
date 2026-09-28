// Global Application State
const State = {
  user: null,
  activeShift: null,
  cart: [],
  listeners: [],

  // Subscribe to state changes
  subscribe(listener) {
    if (typeof listener === 'function') {
      this.listeners.push(listener);
    }
  },

  notify(event, data) {
    this.listeners.forEach(fn => fn(event, data));
  },

  setUser(user) {
    this.user = user;
    this.notify('userChanged', user);
  },

  setShift(shift) {
    this.activeShift = shift;
    this.notify('shiftChanged', shift);
  },

  // Cart operations (Product POS)
  addToCart(product) {
    const itemLabel = `${product.nama}${product.varian ? ` (${product.varian})` : ''}`;
    const existing = this.cart.find(item => item.product.id === product.id);
    if (existing) {
      if (existing.qty < product.stok) {
        existing.qty += 1;
        this.notify('cartUpdated', this.cart);
        Toast.success(`Ditambahkan: ${itemLabel} (${existing.qty})`);
      } else {
        Toast.warning(`Stok maksimal untuk ${itemLabel} adalah ${product.stok}`);
      }
    } else {
      if (product.stok <= 0) {
        Toast.error(`Stok ${itemLabel} habis`);
        return;
      }
      this.cart.push({
        product: { ...product },
        qty: 1
      });
      this.notify('cartUpdated', this.cart);
      Toast.success(`Ditambahkan: ${itemLabel}`);
    }
  },

  updateCartQty(productId, delta) {
    const index = this.cart.findIndex(item => item.product.id === productId);
    if (index === -1) return;

    const item = this.cart[index];
    const itemLabel = `${item.product.nama}${item.product.varian ? ` (${item.product.varian})` : ''}`;
    const newQty = item.qty + delta;

    if (newQty <= 0) {
      this.cart.splice(index, 1);
      Toast.info(`${itemLabel} dihapus dari keranjang`);
    } else if (newQty > item.product.stok) {
      Toast.warning(`Stok maksimal untuk ${itemLabel} adalah ${item.product.stok}`);
      return;
    } else {
      item.qty = newQty;
    }

    this.notify('cartUpdated', this.cart);
  },

  removeFromCart(productId) {
    const index = this.cart.findIndex(item => item.product.id === productId);
    if (index !== -1) {
      const removed = this.cart.splice(index, 1);
      const itemLabel = `${removed[0].product.nama}${removed[0].product.varian ? ` (${removed[0].product.varian})` : ''}`;
      Toast.info(`${itemLabel} dihapus dari keranjang`);
      this.notify('cartUpdated', this.cart);
    }
  },

  clearCart() {
    this.cart = [];
    this.notify('cartUpdated', this.cart);
  },

  getCartTotal() {
    return this.cart.reduce((sum, item) => sum + (item.product.harga * item.qty), 0);
  },

  getCartItemCount() {
    return this.cart.reduce((sum, item) => sum + item.qty, 0);
  }
};
