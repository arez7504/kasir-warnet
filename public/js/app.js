// Application Entry Point
document.addEventListener('DOMContentLoaded', () => {
  Toast.init();

  // Initialize Router
  Router.init();

  // Global Keyboard Shortcuts for Warnet Cashier Efficiency
  window.addEventListener('keydown', (e) => {
    // If inside an input or textarea, don't trigger navigation keys unless Esc
    const isInput = ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName);

    if (e.key === 'Escape') {
      Dialog.close();
      return;
    }

    if (!isInput && State.user && State.activeShift) {
      if (e.key === 'F1') {
        e.preventDefault();
        window.location.hash = '#/cashier-product';
      } else if (e.key === 'F2') {
        e.preventDefault();
        window.location.hash = '#/cashier-billing';
      } else if (e.key === 'F3') {
        e.preventDefault();
        window.location.hash = '#/expense';
      } else if (e.key === 'F4') {
        e.preventDefault();
        window.location.hash = '#/history';
      }
    }
  });

  console.log('Kasir Warnet SPA initialized successfully.');
});
