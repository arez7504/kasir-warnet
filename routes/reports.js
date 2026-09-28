const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requireAuth, requireRole } = require('../middleware/auth');

// Reports are restricted to admin
router.use(requireAuth);
router.use(requireRole('admin'));

// Helper to get formatted YYYY-MM-DD string in WIB (Asia/Jakarta)
function getWibDate(offsetDays = 0) {
  const now = new Date();
  const wibTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  wibTime.setDate(wibTime.getDate() + offsetDays);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(wibTime);
}

// Helper to parse date filters using WIB timezone
function getDateRange(query) {
  let { dari, sampai, preset } = query;

  const today = getWibDate(0);

  if (preset === 'kemarin') {
    const kem = getWibDate(-1);
    return { startDate: `${kem} 00:00:00`, endDate: `${kem} 23:59:59` };
  } else if (preset === '7_hari') {
    const d = getWibDate(-6);
    return { startDate: `${d} 00:00:00`, endDate: `${today} 23:59:59` };
  } else if (preset === '30_hari') {
    const d = getWibDate(-29);
    return { startDate: `${d} 00:00:00`, endDate: `${today} 23:59:59` };
  } else if (dari && sampai) {
    return { startDate: `${dari} 00:00:00`, endDate: `${sampai} 23:59:59` };
  } else if (dari) {
    return { startDate: `${dari} 00:00:00`, endDate: `${dari} 23:59:59` };
  }

  // Default 'hari_ini'
  return { startDate: `${today} 00:00:00`, endDate: `${today} 23:59:59` };
}

// GET /api/reports/summary
router.get('/summary', (req, res) => {
  const { startDate, endDate } = getDateRange(req.query);

  // Transactions aggregate
  const txStats = db.prepare(`
    SELECT 
      COUNT(*) as total_transaksi,
      COALESCE(SUM(total), 0) as total_pendapatan,
      COALESCE(SUM(CASE WHEN metode_bayar = 'cash' AND tipe = 'billing' THEN total ELSE 0 END), 0) as cash_billing,
      COALESCE(SUM(CASE WHEN metode_bayar = 'cash' AND tipe = 'produk' THEN total ELSE 0 END), 0) as cash_produk,
      COALESCE(SUM(CASE WHEN metode_bayar = 'cash' THEN total ELSE 0 END), 0) as total_cash,
      COALESCE(SUM(CASE WHEN metode_bayar = 'qris' AND tipe = 'billing' THEN total ELSE 0 END), 0) as qris_billing,
      COALESCE(SUM(CASE WHEN metode_bayar = 'qris' AND tipe = 'produk' THEN total ELSE 0 END), 0) as qris_produk,
      COALESCE(SUM(CASE WHEN metode_bayar = 'qris' THEN total ELSE 0 END), 0) as total_qris,
      COALESCE(SUM(CASE WHEN tipe = 'produk' THEN total ELSE 0 END), 0) as total_produk,
      COALESCE(SUM(CASE WHEN tipe = 'billing' THEN total ELSE 0 END), 0) as total_billing
    FROM transactions
    WHERE created_at >= ? AND created_at <= ?
    AND (status IS NULL OR status != 'void')
  `).get(startDate, endDate);

  // Expenses aggregate
  const expStats = db.prepare(`
    SELECT 
      COUNT(*) as count_pengeluaran,
      COALESCE(SUM(nominal), 0) as total_pengeluaran,
      COALESCE(SUM(CASE WHEN tipe = 'kasbon' THEN nominal ELSE 0 END), 0) as total_kasbon,
      COALESCE(SUM(CASE WHEN tipe = 'operasional' THEN nominal ELSE 0 END), 0) as total_operasional,
      COALESCE(SUM(CASE WHEN tipe = 'stok_masuk' THEN nominal ELSE 0 END), 0) as total_stok_masuk
    FROM expenses
    WHERE created_at >= ? AND created_at <= ?
  `).get(startDate, endDate);

  const totalPendapatan = txStats.total_pendapatan;
  const persenProduk = totalPendapatan > 0 ? Math.round((txStats.total_produk / totalPendapatan) * 100) : 0;
  const persenBilling = totalPendapatan > 0 ? Math.round((txStats.total_billing / totalPendapatan) * 100) : 0;

  res.json({
    range: { startDate, endDate },
    total_transaksi: txStats.total_transaksi,
    total_pendapatan: totalPendapatan,
    total_cash: txStats.total_cash,
    total_qris: txStats.total_qris,
    cash_billing: txStats.cash_billing,
    cash_produk: txStats.cash_produk,
    qris_billing: txStats.qris_billing,
    qris_produk: txStats.qris_produk,
    total_pengeluaran: expStats.total_pengeluaran,
    detail_pengeluaran: expStats,
    breakdown: {
      produk: {
        total: txStats.total_produk,
        persen: persenProduk
      },
      billing: {
        total: txStats.total_billing,
        persen: persenBilling
      }
    }
  });
});

// GET /api/reports/top-products
router.get('/top-products', (req, res) => {
  const { startDate, endDate } = getDateRange(req.query);

  const top = db.prepare(`
    SELECT 
      ti.nama_produk,
      p.kategori,
      SUM(ti.qty) as total_qty,
      SUM(ti.qty * ti.harga_saat_itu) as total_rupiah
    FROM transaction_items ti
    JOIN transactions t ON ti.transaction_id = t.id
    LEFT JOIN products p ON ti.product_id = p.id
    WHERE t.created_at >= ? AND t.created_at <= ?
    AND (t.status IS NULL OR t.status != 'void')
    GROUP BY ti.nama_produk
    ORDER BY total_qty DESC
    LIMIT 10
  `).all(startDate, endDate);

  res.json({ top_products: top });
});

// GET /api/reports/shifts
router.get('/shifts', (req, res) => {
  const { startDate, endDate } = getDateRange(req.query);

  const shifts = db.prepare(`
    SELECT 
      s.*,
      u.nama as operator_nama,
      r.qris_app, r.qris_edc, r.selisih_qris, r.catatan_qris,
      r.billing_app, r.billing_cyberindo, r.selisih_billing, r.catatan_billing,
      r.kas_seharusnya, r.kas_fisik, r.selisih_kas, r.catatan_kas,
      (SELECT COUNT(*) FROM transactions WHERE shift_id = s.id AND (status IS NULL OR status != 'void')) as total_transaksi,
      (SELECT COALESCE(SUM(total), 0) FROM transactions WHERE shift_id = s.id AND (status IS NULL OR status != 'void')) as total_omzet,
      (SELECT COALESCE(SUM(nominal), 0) FROM expenses WHERE shift_id = s.id) as total_pengeluaran
    FROM shifts s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN reconciliations r ON s.id = r.shift_id
    WHERE s.started_at >= ? AND s.started_at <= ?
    ORDER BY s.id DESC
  `).all(startDate, endDate);

  res.json({ shifts });
});

// POST /api/reports/reset - Reset financial & shift stats (admin only)
router.post('/reset', (req, res) => {
  try {
    const resetStatsTx = db.transaction(() => {
      db.prepare('DELETE FROM reconciliations').run();
      db.prepare('DELETE FROM transaction_items').run();
      db.prepare('DELETE FROM transactions').run();
      db.prepare('DELETE FROM expenses').run();
      db.prepare('DELETE FROM shifts').run();
      try {
        db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('reconciliations', 'transaction_items', 'transactions', 'expenses', 'shifts')").run();
      } catch (e) {
        // sqlite_sequence may not exist or have those tables yet
      }
    });

    resetStatsTx();

    res.json({ 
      message: 'Seluruh statistik laporan transaksi, omzet, dan audit shift berhasil di-reset ke 0.' 
    });
  } catch (err) {
    console.error('Error resetting reports stats:', err);
    res.status(500).json({ error: 'Gagal mereset laporan: ' + err.message });
  }
});

module.exports = router;
