// Utility Functions
const Utils = {
  // Format integer rupiah to formatted string (e.g. 15000 -> "Rp 15.000")
  formatRupiah(number) {
    if (number === null || number === undefined || isNaN(number)) return 'Rp 0';
    const isNegative = number < 0;
    const absVal = Math.abs(Math.round(number));
    const formatted = absVal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return isNegative ? `-Rp ${formatted}` : `Rp ${formatted}`;
  },

  // Parse rupiah text/number to raw integer
  parseRupiah(str) {
    if (typeof str === 'number') return Math.round(str);
    if (!str) return 0;
    const clean = str.toString().replace(/[^0-9-]/g, '');
    const num = parseInt(clean, 10);
    return isNaN(num) ? 0 : num;
  },

  // Format date to Indonesian format (e.g. "20 Sep 2026")
  formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr.replace(' ', 'T'));
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  },

  // Format time (e.g. "08:15 WIB")
  formatTime(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr.replace(' ', 'T'));
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes} WIB`;
  },

  // Format full date time (e.g. "20 Sep 2026, 08:15")
  formatDateTime(dateStr) {
    if (!dateStr) return '-';
    return `${this.formatDate(dateStr)}, ${this.formatTime(dateStr)}`;
  },

  // Escape HTML to prevent XSS
  escapeHtml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  // Auto-format currency inputs on typing
  bindRupiahInput(inputElem, onChangeCallback) {
    if (!inputElem) return;
    inputElem.addEventListener('input', (e) => {
      const rawVal = Utils.parseRupiah(e.target.value);
      if (rawVal === 0 && e.target.value.trim() === '') {
        e.target.value = '';
      } else {
        e.target.value = rawVal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      }
      if (typeof onChangeCallback === 'function') {
        onChangeCallback(rawVal);
      }
    });
  }
};
