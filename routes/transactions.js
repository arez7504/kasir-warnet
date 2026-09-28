const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requireAuth, requireActiveShift } = require('../middleware/auth');

router.use(requireAuth);

// POST /api/transactions/product - Checkout product cart
router.post('/product', requireActiveShift, (req, res) => {
  const shift = req.activeShift;
  const { items, metode_bayar, nominal_bayar } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Keranjang belanja tidak boleh kosong' });
  }

  if (!['cash', 'qris'].includes(metode_bayar)) {
    return res.status(400).json({ error: 'Metode bayar harus cash atau qris' });
  }

  // Validate items and calculate total
  const preparedProducts = [];
  let total = 0;

  for (const item of items) {
    const qty = parseInt(item.qty, 10);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Jumlah produk tidak valid' });
    }

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
    if (!product) {
      return res.status(404).json({ error: `Produk ID ${item.product_id} tidak ditemukan` });
    }
    if (!product.aktif) {
      return res.status(400).json({ error: `Produk "${product.nama}" sudah tidak aktif` });
    }
    if (product.stok < qty) {
      return res.status(400).json({ 
        error: `Stok untuk "${product.nama}" tidak mencukupi (sisa: ${product.stok}, diminta: ${qty})` 
      });
    }

    const subtotal = product.harga * qty;
    total += subtotal;
    preparedProducts.push({
      product,
      qty,
      harga_saat_itu: product.harga,
      nama_produk: product.nama,
      varian: product.varian || null
    });
  }

  let finalNominalBayar = null;
  let finalKembalian = null;

  if (metode_bayar === 'cash') {
    const parsedNominal = parseInt(nominal_bayar, 10);
    if (isNaN(parsedNominal) || parsedNominal < total) {
      return res.status(400).json({ 
        error: `Uang yang diterima (Rp ${parsedNominal || 0}) kurang dari total belanja (Rp ${total})` 
      });
    }
    finalNominalBayar = parsedNominal;
    finalKembalian = parsedNominal - total;
  }

  // Database transaction
  const executeSale = db.transaction(() => {
    // 1. Insert transaction
    const txResult = db.prepare(`
      INSERT INTO transactions (shift_id, tipe, metode_bayar, total, nominal_bayar, kembalian)
      VALUES (?, 'produk', ?, ?, ?, ?)
    `).run(shift.id, metode_bayar, total, finalNominalBayar, finalKembalian);

    const txId = txResult.lastInsertRowid;

    // 2. Insert items and decrement stock
    const insertItemStmt = db.prepare(`
      INSERT INTO transaction_items (transaction_id, product_id, nama_produk, varian, qty, harga_saat_itu)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const updateStockStmt = db.prepare(`
      UPDATE products SET stok = stok - ? WHERE id = ?
    `);

    for (const item of preparedProducts) {
      insertItemStmt.run(txId, item.product.id, item.nama_produk, item.varian, item.qty, item.harga_saat_itu);
      updateStockStmt.run(item.qty, item.product.id);
    }

    return txId;
  });

  try {
    const txId = executeSale();
    res.status(201).json({
      message: 'Transaksi produk berhasil disimpan',
      transaction_id: txId,
      total,
      metode_bayar,
      nominal_bayar: finalNominalBayar,
      kembalian: finalKembalian,
      items: preparedProducts.map(p => ({
        nama: p.nama_produk,
        varian: p.varian,
        qty: p.qty,
        harga: p.harga_saat_itu,
        subtotal: p.harga_saat_itu * p.qty
      }))
    });
  } catch (err) {
    console.error('Error saving product transaction:', err);
    res.status(500).json({ error: 'Gagal memproses transaksi produk: ' + err.message });
  }
});

// POST /api/transactions/billing - Checkout billing package
router.post('/billing', requireActiveShift, (req, res) => {
  const shift = req.activeShift;
  const { paket_id, tier, jumlah_pc, metode_bayar, nominal_bayar } = req.body;

  if (!['cash', 'qris'].includes(metode_bayar)) {
    return res.status(400).json({ error: 'Metode bayar harus cash atau qris' });
  }

  const pcs = parseInt(jumlah_pc, 10);
  if (isNaN(pcs) || pcs <= 0) {
    return res.status(400).json({ error: 'Jumlah PC minimal 1' });
  }

  let pkg = db.prepare('SELECT * FROM billing_packages WHERE id = ?').get(paket_id);
  if (!pkg) {
    return res.status(404).json({ error: 'Paket billing tidak ditemukan' });
  }

  // If a specific tier is requested and differs from pkg.tier, look up package with same name for that tier
  if (tier && pkg.tier && pkg.tier.toLowerCase() !== tier.trim().toLowerCase()) {
    const matchingTierPkg = db.prepare('SELECT * FROM billing_packages WHERE LOWER(nama) = LOWER(?) AND LOWER(tier) = LOWER(?)').get(pkg.nama, tier.trim());
    if (matchingTierPkg) {
      pkg = matchingTierPkg;
    }
  }

  const activeTier = (tier || pkg.tier || 'Reguler').trim();
  const hargaPerPc = typeof pkg.harga === 'number' && pkg.harga > 0
    ? pkg.harga
    : (pkg[`harga_${activeTier.toLowerCase()}`] || pkg.harga_reguler);

  if (typeof hargaPerPc !== 'number' || hargaPerPc <= 0) {
    return res.status(400).json({ error: 'Harga paket billing tidak valid' });
  }

  const total = hargaPerPc * pcs;
  let finalNominalBayar = null;
  let finalKembalian = null;

  if (metode_bayar === 'cash') {
    const parsedNominal = parseInt(nominal_bayar, 10);
    if (isNaN(parsedNominal) || parsedNominal < total) {
      return res.status(400).json({ 
        error: `Uang yang diterima (Rp ${parsedNominal || 0}) kurang dari total tagihan (Rp ${total})` 
      });
    }
    finalNominalBayar = parsedNominal;
    finalKembalian = parsedNominal - total;
  }

  try {
    const result = db.prepare(`
      INSERT INTO transactions (
        shift_id, tipe, metode_bayar, total, nominal_bayar, kembalian,
        paket_id, paket_nama, tier, jumlah_pc, harga_saat_itu
      ) VALUES (?, 'billing', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      shift.id, metode_bayar, total, finalNominalBayar, finalKembalian,
      pkg.id, pkg.nama, activeTier, pcs, hargaPerPc
    );

    res.status(201).json({
      message: 'Transaksi billing berhasil disimpan',
      transaction_id: result.lastInsertRowid,
      paket_nama: pkg.nama,
      tier: activeTier,
      jumlah_pc: pcs,
      harga_saat_itu: hargaPerPc,
      total,
      metode_bayar,
      nominal_bayar: finalNominalBayar,
      kembalian: finalKembalian
    });
  } catch (err) {
    console.error('Error saving billing transaction:', err);
    res.status(500).json({ error: 'Gagal memproses transaksi billing: ' + err.message });
  }
});

// GET /api/transactions - List transactions with filtering
router.get('/', (req, res) => {
  const { shift_id, tipe, filter_scope } = req.query;

  let baseQuery = `
    SELECT 
      t.*,
      COALESCE(t.paket_nama, p.nama, 'Billing') as paket_nama,
      s.started_at as shift_started_at,
      s.status as shift_status,
      u.nama as operator_nama
    FROM transactions t
    JOIN shifts s ON t.shift_id = s.id
    JOIN users u ON s.user_id = u.id
    LEFT JOIN billing_packages p ON t.paket_id = p.id
    WHERE 1=1
  `;
  const params = [];

  if (shift_id) {
    baseQuery += ' AND t.shift_id = ?';
    params.push(shift_id);
  } else if (filter_scope === 'shift_ini') {
    // Current user's open shift
    const openShift = db.prepare("SELECT id FROM shifts WHERE user_id = ? AND status = 'open'").get(req.session.user.id);
    if (openShift) {
      baseQuery += ' AND t.shift_id = ?';
      params.push(openShift.id);
    } else {
      // Return empty if no open shift for 'shift_ini'
      return res.json({ transactions: [] });
    }
  }

  if (tipe && ['produk', 'billing'].includes(tipe)) {
    baseQuery += ' AND t.tipe = ?';
    params.push(tipe);
  }

  baseQuery += ' ORDER BY t.id DESC LIMIT 200';

  const transactions = db.prepare(baseQuery).all(...params);

  // Attach items for product transactions
  const getItemsStmt = db.prepare(`
    SELECT 
      ti.id,
      ti.transaction_id,
      ti.product_id,
      ti.nama_produk,
      ti.qty,
      ti.harga_saat_itu,
      COALESCE(NULLIF(p.varian, ''), ti.varian) AS varian,
      COALESCE(p.kategori, 'Lainnya') AS kategori
    FROM transaction_items ti
    LEFT JOIN products p ON ti.product_id = p.id
    WHERE ti.transaction_id = ?
  `);
  const enriched = transactions.map(tx => {
    if (tx.tipe === 'produk') {
      tx.items = getItemsStmt.all(tx.id);
    }
    return tx;
  });

  res.json({ transactions: enriched });
});

// GET /api/transactions/:id - Detailed view of single transaction
router.get('/:id', (req, res) => {
  const tx = db.prepare(`
    SELECT 
      t.*,
      COALESCE(t.paket_nama, p.nama, 'Billing') as paket_nama,
      s.started_at as shift_started_at,
      s.status as shift_status,
      u.nama as operator_nama
    FROM transactions t
    JOIN shifts s ON t.shift_id = s.id
    JOIN users u ON s.user_id = u.id
    LEFT JOIN billing_packages p ON t.paket_id = p.id
    WHERE t.id = ?
  `).get(req.params.id);

  if (!tx) {
    return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
  }

  if (tx.tipe === 'produk') {
    tx.items = db.prepare(`
      SELECT 
        ti.id,
        ti.transaction_id,
        ti.product_id,
        ti.nama_produk,
        ti.qty,
        ti.harga_saat_itu,
        COALESCE(NULLIF(p.varian, ''), ti.varian) AS varian,
        COALESCE(p.kategori, 'Lainnya') AS kategori
      FROM transaction_items ti
      LEFT JOIN products p ON ti.product_id = p.id
      WHERE ti.transaction_id = ?
    `).all(tx.id);
  }

  res.json({ transaction: tx });
});

// PATCH /api/transactions/:id/void - Void (cancel) sebuah transaksi
router.patch('/:id/void', (req, res) => {
  const tx = db.prepare(`
    SELECT t.*, s.user_id as shift_user_id, s.status as shift_status
    FROM transactions t
    JOIN shifts s ON t.shift_id = s.id
    WHERE t.id = ?
  `).get(req.params.id);

  if (!tx) {
    return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
  }

  if (tx.status === 'void') {
    return res.status(400).json({ error: 'Transaksi ini sudah pernah di-void' });
  }

  if (tx.shift_status === 'closed') {
    return res.status(400).json({ 
      error: 'Transaksi tidak dapat di-void karena shift terkait sudah ditutup dan direkonsiliasi.' 
    });
  }

  const isAdmin = req.session.user.role === 'admin';
  const isOwner = tx.shift_user_id === req.session.user.id;

  if (!isAdmin && !isOwner) {
    return res.status(403).json({ error: 'Hanya admin atau operator pemilik shift yang bisa void transaksi ini' });
  }

  const voidTx = db.transaction(() => {
    // Restore stok jika transaksi produk
    if (tx.tipe === 'produk') {
      const items = db.prepare('SELECT * FROM transaction_items WHERE transaction_id = ?').all(tx.id);
      const restoreStmt = db.prepare('UPDATE products SET stok = stok + ? WHERE id = ?');
      for (const item of items) {
        restoreStmt.run(item.qty, item.product_id);
      }
    }

    // Tandai sebagai void
    db.prepare(`
      UPDATE transactions 
      SET status = 'void', voided_at = datetime('now','localtime'), voided_by = ?
      WHERE id = ?
    `).run(req.session.user.id, tx.id);
  });

  try {
    voidTx();
    res.json({
      message: `Transaksi #TRX-${tx.id} berhasil di-void${tx.tipe === 'produk' ? ' dan stok telah dikembalikan' : ''}`,
      transaction_id: tx.id
    });
  } catch (err) {
    console.error('Error voiding transaction:', err);
    res.status(500).json({ error: 'Gagal void transaksi: ' + err.message });
  }
});

module.exports = router;
