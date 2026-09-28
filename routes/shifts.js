const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requireAuth, requireActiveShift } = require('../middleware/auth');

// All shift endpoints require auth
router.use(requireAuth);

// GET /api/shifts/active
router.get('/active', (req, res) => {
  const shift = db.prepare(`
    SELECT s.*, u.nama as operator_nama, u.username as operator_username
    FROM shifts s
    JOIN users u ON s.user_id = u.id
    WHERE s.user_id = ? AND s.status = 'open'
    ORDER BY s.id DESC LIMIT 1
  `).get(req.session.user.id);

  res.json({ shift: shift || null });
});

// POST /api/shifts/open
router.post('/open', (req, res) => {
  const { saldo_awal } = req.body;
  const saldo = saldo_awal !== undefined ? parseInt(saldo_awal, 10) : 0;

  if (isNaN(saldo) || saldo < 0) {
    return res.status(400).json({ error: 'Saldo awal harus berupa angka non-negatif' });
  }

  // Check if user already has an active shift
  const existingShift = db.prepare(`
    SELECT * FROM shifts WHERE user_id = ? AND status = 'open'
  `).get(req.session.user.id);

  if (existingShift) {
    return res.status(400).json({ 
      error: 'Anda masih memiliki shift yang belum ditutup.',
      shift: existingShift
    });
  }

  const result = db.prepare(`
    INSERT INTO shifts (user_id, saldo_awal, status)
    VALUES (?, ?, 'open')
  `).run(req.session.user.id, saldo);

  const newShift = db.prepare(`
    SELECT s.*, u.nama as operator_nama 
    FROM shifts s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ shift: newShift });
});

// GET /api/shifts/summary - Summary of the active shift
router.get('/summary', requireActiveShift, (req, res) => {
  const shift = req.activeShift;

  // Transactions metrics
  const txStats = db.prepare(`
    SELECT 
      COUNT(*) as total_transaksi,
      COALESCE(SUM(CASE WHEN metode_bayar = 'cash' AND tipe = 'billing' THEN total ELSE 0 END), 0) as cash_billing,
      COALESCE(SUM(CASE WHEN metode_bayar = 'cash' AND tipe = 'produk' THEN total ELSE 0 END), 0) as cash_produk,
      COALESCE(SUM(CASE WHEN metode_bayar = 'cash' THEN total ELSE 0 END), 0) as total_cash_masuk,
      COALESCE(SUM(CASE WHEN metode_bayar = 'qris' AND tipe = 'billing' THEN total ELSE 0 END), 0) as qris_billing,
      COALESCE(SUM(CASE WHEN metode_bayar = 'qris' AND tipe = 'produk' THEN total ELSE 0 END), 0) as qris_produk,
      COALESCE(SUM(CASE WHEN metode_bayar = 'qris' THEN total ELSE 0 END), 0) as total_qris_masuk,
      COALESCE(SUM(CASE WHEN tipe = 'billing' THEN total ELSE 0 END), 0) as total_billing,
      COALESCE(SUM(CASE WHEN tipe = 'produk' THEN total ELSE 0 END), 0) as total_produk
    FROM transactions
    WHERE shift_id = ?
    AND (status IS NULL OR status != 'void')
  `).get(shift.id);

  // Expenses metrics
  const expenseStats = db.prepare(`
    SELECT 
      COUNT(*) as total_pengeluaran_count,
      COALESCE(SUM(nominal), 0) as total_pengeluaran,
      COALESCE(SUM(CASE WHEN tipe = 'kasbon' THEN nominal ELSE 0 END), 0) as kasbon,
      COALESCE(SUM(CASE WHEN tipe = 'operasional' THEN nominal ELSE 0 END), 0) as operasional,
      COALESCE(SUM(CASE WHEN tipe = 'stok_masuk' THEN nominal ELSE 0 END), 0) as stok_masuk
    FROM expenses
    WHERE shift_id = ?
  `).get(shift.id);

  const saldoAwal = shift.saldo_awal;
  const cashBilling = txStats.cash_billing;
  const cashProduk = txStats.cash_produk;
  const totalCashMasuk = cashBilling + cashProduk;

  const qrisBilling = txStats.qris_billing;
  const qrisProduk = txStats.qris_produk;
  const totalQrisMasuk = qrisBilling + qrisProduk;

  const pengeluaran = expenseStats.total_pengeluaran;
  const kasSeharusnya = totalCashMasuk - pengeluaran;

  res.json({
    shift: {
      id: shift.id,
      started_at: shift.started_at,
      saldo_awal: shift.saldo_awal,
      operator_nama: req.session.user.nama
    },
    total_transaksi: txStats.total_transaksi,
    total_cash_masuk: totalCashMasuk,
    total_qris_masuk: totalQrisMasuk,
    cash_billing: cashBilling,
    cash_produk: cashProduk,
    qris_billing: qrisBilling,
    qris_produk: qrisProduk,
    total_billing: txStats.total_billing,
    total_produk: txStats.total_produk,
    total_pengeluaran: pengeluaran,
    detail_pengeluaran: {
      kasbon: expenseStats.kasbon,
      operasional: expenseStats.operasional,
      stok_masuk: expenseStats.stok_masuk
    },
    kas_seharusnya: kasSeharusnya
  });
});

// POST /api/shifts/close - Close shift with 3-step reconciliation
router.post('/close', requireActiveShift, (req, res) => {
  const shift = req.activeShift;
  const {
    qris_edc,
    catatan_qris,
    billing_cyberindo,
    catatan_billing,
    kas_fisik,
    catatan_kas
  } = req.body;

  const parsedQrisEdc = parseInt(qris_edc, 10);
  const parsedBillingCyberindo = parseInt(billing_cyberindo, 10);
  const parsedKasFisik = parseInt(kas_fisik, 10);

  if (isNaN(parsedQrisEdc) || isNaN(parsedBillingCyberindo) || isNaN(parsedKasFisik)) {
    return res.status(400).json({ error: 'Input nilai nominal rekonsiliasi tidak valid' });
  }

  // Compute app numbers
  const appQris = db.prepare(`
    SELECT COALESCE(SUM(total), 0) as total
    FROM transactions
    WHERE shift_id = ? AND metode_bayar = 'qris'
    AND (status IS NULL OR status != 'void')
  `).get(shift.id).total;

  const appBilling = db.prepare(`
    SELECT COALESCE(SUM(total), 0) as total
    FROM transactions
    WHERE shift_id = ? AND tipe = 'billing'
    AND (status IS NULL OR status != 'void')
  `).get(shift.id).total;

  const appCash = db.prepare(`
    SELECT COALESCE(SUM(total), 0) as total
    FROM transactions
    WHERE shift_id = ? AND metode_bayar = 'cash'
    AND (status IS NULL OR status != 'void')
  `).get(shift.id).total;

  const appExpenses = db.prepare(`
    SELECT COALESCE(SUM(nominal), 0) as total
    FROM expenses
    WHERE shift_id = ?
  `).get(shift.id).total;

  const kasSeharusnya = appCash - appExpenses;

  const selisihQris = parsedQrisEdc - appQris;
  const selisihBilling = parsedBillingCyberindo - appBilling;
  const selisihKas = parsedKasFisik - kasSeharusnya;

  // Execute in transaction
  const closeShiftTx = db.transaction(() => {
    // 1. Insert reconciliation
    db.prepare(`
      INSERT INTO reconciliations (
        shift_id,
        qris_app, qris_edc, selisih_qris, catatan_qris,
        billing_app, billing_cyberindo, selisih_billing, catatan_billing,
        kas_seharusnya, kas_fisik, selisih_kas, catatan_kas
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      shift.id,
      appQris, parsedQrisEdc, selisihQris, catatan_qris || null,
      appBilling, parsedBillingCyberindo, selisihBilling, catatan_billing || null,
      kasSeharusnya, parsedKasFisik, selisihKas, catatan_kas || null
    );

    // 2. Update shift status to closed
    db.prepare(`
      UPDATE shifts 
      SET status = 'closed', closed_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(shift.id);
  });

  try {
    closeShiftTx();
    res.json({
      message: 'Shift berhasil ditutup',
      reconciliation: {
        shift_id: shift.id,
        qris_app: appQris,
        qris_edc: parsedQrisEdc,
        selisih_qris: selisihQris,
        billing_app: appBilling,
        billing_cyberindo: parsedBillingCyberindo,
        selisih_billing: selisihBilling,
        kas_seharusnya: kasSeharusnya,
        kas_fisik: parsedKasFisik,
        selisih_kas: selisihKas
      }
    });
  } catch (err) {
    console.error('Error closing shift:', err);
    res.status(500).json({ error: 'Gagal menutup shift: ' + err.message });
  }
});

// GET /api/shifts/history - Shift history for current user (or all users if admin)
router.get('/history', (req, res) => {
  const isAdmin = req.session.user.role === 'admin';
  const query = isAdmin
    ? `
      SELECT s.*, u.nama as operator_nama, u.username as operator_username,
        r.qris_app, r.qris_edc, r.selisih_qris, r.catatan_qris,
        r.billing_app, r.billing_cyberindo, r.selisih_billing, r.catatan_billing,
        r.kas_seharusnya, r.kas_fisik, r.selisih_kas, r.catatan_kas,
        (SELECT COUNT(*) FROM transactions WHERE shift_id = s.id AND (status IS NULL OR status != 'void')) as total_transaksi,
        (SELECT COALESCE(SUM(total), 0) FROM transactions WHERE shift_id = s.id AND (status IS NULL OR status != 'void')) as total_pendapatan
      FROM shifts s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN reconciliations r ON s.id = r.shift_id
      ORDER BY s.id DESC
      LIMIT 50
    `
    : `
      SELECT s.*, u.nama as operator_nama, u.username as operator_username,
        r.qris_app, r.qris_edc, r.selisih_qris, r.catatan_qris,
        r.billing_app, r.billing_cyberindo, r.selisih_billing, r.catatan_billing,
        r.kas_seharusnya, r.kas_fisik, r.selisih_kas, r.catatan_kas,
        (SELECT COUNT(*) FROM transactions WHERE shift_id = s.id AND (status IS NULL OR status != 'void')) as total_transaksi,
        (SELECT COALESCE(SUM(total), 0) FROM transactions WHERE shift_id = s.id AND (status IS NULL OR status != 'void')) as total_pendapatan
      FROM shifts s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN reconciliations r ON s.id = r.shift_id
      WHERE s.user_id = ?
      ORDER BY s.id DESC
      LIMIT 50
    `;

  const rows = isAdmin 
    ? db.prepare(query).all()
    : db.prepare(query).all(req.session.user.id);

  res.json({ shifts: rows });
});

module.exports = router;
