const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requireAuth, requireActiveShift } = require('../middleware/auth');

router.use(requireAuth);

// POST /api/expenses - Record an expense
router.post('/', requireActiveShift, (req, res) => {
  const shift = req.activeShift;
  const { tipe, nominal, keterangan, product_id, qty } = req.body;

  if (!['kasbon', 'operasional', 'stok_masuk'].includes(tipe)) {
    return res.status(400).json({ error: 'Tipe pengeluaran harus kasbon, operasional, atau stok_masuk' });
  }

  const parsedNominal = parseInt(nominal, 10);
  if (isNaN(parsedNominal) || parsedNominal <= 0) {
    return res.status(400).json({ error: 'Nominal pengeluaran harus angka lebih dari 0' });
  }

  if (!keterangan || typeof keterangan !== 'string' || keterangan.trim().length === 0) {
    return res.status(400).json({ error: 'Keterangan pengeluaran wajib diisi' });
  }

  let finalProductId = null;
  let finalQty = null;

  if (tipe === 'stok_masuk') {
    if (!product_id) {
      return res.status(400).json({ error: 'Produk wajib dipilih untuk pengeluaran stok masuk' });
    }
    const parsedQty = parseInt(qty, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      return res.status(400).json({ error: 'Jumlah stok masuk minimal 1' });
    }

    const prod = db.prepare('SELECT id, nama FROM products WHERE id = ?').get(product_id);
    if (!prod) {
      return res.status(404).json({ error: 'Produk tidak ditemukan' });
    }

    finalProductId = prod.id;
    finalQty = parsedQty;
  }

  const recordExpenseTx = db.transaction(() => {
    // 1. Insert expense
    const result = db.prepare(`
      INSERT INTO expenses (shift_id, tipe, nominal, keterangan, product_id, qty)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(shift.id, tipe, parsedNominal, keterangan.trim(), finalProductId, finalQty);

    // 2. If stok_masuk, increment stock
    if (tipe === 'stok_masuk' && finalProductId && finalQty) {
      db.prepare('UPDATE products SET stok = stok + ? WHERE id = ?').run(finalQty, finalProductId);
    }

    return result.lastInsertRowid;
  });

  try {
    const expenseId = recordExpenseTx();
    const created = db.prepare(`
      SELECT e.*, p.nama as product_nama, p.varian as product_varian
      FROM expenses e
      LEFT JOIN products p ON e.product_id = p.id
      WHERE e.id = ?
    `).get(expenseId);

    res.status(201).json({
      message: 'Pengeluaran berhasil dicatat',
      expense: created
    });
  } catch (err) {
    console.error('Error recording expense:', err);
    res.status(500).json({ error: 'Gagal mencatat pengeluaran: ' + err.message });
  }
});

// GET /api/expenses - List expenses
router.get('/', (req, res) => {
  const { shift_id, filter_scope } = req.query;

  let baseQuery = `
    SELECT e.*, p.nama as product_nama, p.varian as product_varian, u.nama as operator_nama, s.started_at as shift_started_at, s.status as shift_status
    FROM expenses e
    JOIN shifts s ON e.shift_id = s.id
    JOIN users u ON s.user_id = u.id
    LEFT JOIN products p ON e.product_id = p.id
    WHERE 1=1
  `;
  const params = [];

  if (shift_id) {
    baseQuery += ' AND e.shift_id = ?';
    params.push(shift_id);
  } else if (filter_scope === 'shift_ini') {
    const openShift = db.prepare("SELECT id FROM shifts WHERE user_id = ? AND status = 'open'").get(req.session.user.id);
    if (openShift) {
      baseQuery += ' AND e.shift_id = ?';
      params.push(openShift.id);
    } else {
      return res.json({ expenses: [] });
    }
  }

  baseQuery += ' ORDER BY e.id DESC LIMIT 100';

  const expenses = db.prepare(baseQuery).all(...params);
  res.json({ expenses });
});

// PUT /api/expenses/:id - Edit pengeluaran
router.put('/:id', (req, res) => {
  const expense = db.prepare(`
    SELECT e.*, s.user_id as shift_user_id, s.status as shift_status
    FROM expenses e
    JOIN shifts s ON e.shift_id = s.id
    WHERE e.id = ?
  `).get(req.params.id);

  if (!expense) {
    return res.status(404).json({ error: 'Pengeluaran tidak ditemukan' });
  }

  if (expense.shift_status === 'closed') {
    return res.status(400).json({ 
      error: 'Pengeluaran tidak dapat diubah karena shift terkait sudah ditutup dan direkonsiliasi.' 
    });
  }

  const isAdmin = req.session.user.role === 'admin';
  const isOwner = expense.shift_user_id === req.session.user.id;

  if (!isAdmin && !isOwner) {
    return res.status(403).json({ error: 'Hanya admin atau operator pemilik shift yang bisa edit pengeluaran ini' });
  }

  const { nominal, keterangan } = req.body;
  const parsedNominal = parseInt(nominal, 10);
  if (isNaN(parsedNominal) || parsedNominal <= 0) {
    return res.status(400).json({ error: 'Nominal pengeluaran harus lebih dari 0' });
  }
  if (!keterangan || !keterangan.trim()) {
    return res.status(400).json({ error: 'Keterangan wajib diisi' });
  }

  try {
    db.prepare(`
      UPDATE expenses SET nominal = ?, keterangan = ? WHERE id = ?
    `).run(parsedNominal, keterangan.trim(), expense.id);

    const updated = db.prepare(`
      SELECT e.*, p.nama as product_nama, p.varian as product_varian
      FROM expenses e LEFT JOIN products p ON e.product_id = p.id
      WHERE e.id = ?
    `).get(expense.id);

    res.json({ message: 'Pengeluaran berhasil diperbarui', expense: updated });
  } catch (err) {
    console.error('Error updating expense:', err);
    res.status(500).json({ error: 'Gagal memperbarui pengeluaran: ' + err.message });
  }
});

// DELETE /api/expenses/:id - Hapus pengeluaran
router.delete('/:id', (req, res) => {
  const expense = db.prepare(`
    SELECT e.*, s.user_id as shift_user_id, s.status as shift_status
    FROM expenses e
    JOIN shifts s ON e.shift_id = s.id
    WHERE e.id = ?
  `).get(req.params.id);

  if (!expense) {
    return res.status(404).json({ error: 'Pengeluaran tidak ditemukan' });
  }

  if (expense.shift_status === 'closed') {
    return res.status(400).json({ 
      error: 'Pengeluaran tidak dapat dihapus karena shift terkait sudah ditutup dan direkonsiliasi.' 
    });
  }

  const isAdmin = req.session.user.role === 'admin';
  const isOwner = expense.shift_user_id === req.session.user.id;

  if (!isAdmin && !isOwner) {
    return res.status(403).json({ error: 'Hanya admin atau operator pemilik shift yang bisa hapus pengeluaran ini' });
  }

  const deleteTx = db.transaction(() => {
    // Jika stok_masuk, kembalikan stok produk
    if (expense.tipe === 'stok_masuk' && expense.product_id && expense.qty) {
      db.prepare('UPDATE products SET stok = stok - ? WHERE id = ?').run(expense.qty, expense.product_id);
    }
    db.prepare('DELETE FROM expenses WHERE id = ?').run(expense.id);
  });

  try {
    deleteTx();
    res.json({
      message: `Pengeluaran berhasil dihapus${expense.tipe === 'stok_masuk' ? ' dan stok dikembalikan' : ''}`,
      deleted: true
    });
  } catch (err) {
    console.error('Error deleting expense:', err);
    res.status(500).json({ error: 'Gagal menghapus pengeluaran: ' + err.message });
  }
});

module.exports = router;
