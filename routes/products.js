const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

const VALID_CATEGORIES = ['Rokok', 'Minuman', 'Minuman Botol', 'Makanan'];

// GET /api/products - List products
router.get('/', (req, res) => {
  const { kategori, aktif, search } = req.query;

  let query = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (kategori) {
    if (kategori === 'Minuman' || kategori === 'Minuman Botol') {
      query += ' AND (kategori = ? OR kategori = ?)';
      params.push('Minuman', 'Minuman Botol');
    } else if (VALID_CATEGORIES.includes(kategori)) {
      query += ' AND kategori = ?';
      params.push(kategori);
    }
  }

  if (aktif !== undefined && aktif !== '') {
    query += ' AND aktif = ?';
    params.push(parseInt(aktif, 10) === 1 ? 1 : 0);
  }

  if (search && search.trim()) {
    query += ' AND (nama LIKE ? OR varian LIKE ?)';
    params.push(`%${search.trim()}%`, `%${search.trim()}%`);
  }

  query += ' ORDER BY kategori ASC, nama ASC, varian ASC';

  const products = db.prepare(query).all(...params);
  res.json({ products });
});

// POST /api/products - Create product (admin only)
router.post('/', requireRole('admin'), (req, res) => {
  const { nama, varian, kategori, harga, stok } = req.body;

  if (!nama || !nama.trim()) {
    return res.status(400).json({ error: 'Nama produk wajib diisi' });
  }

  if (!VALID_CATEGORIES.includes(kategori)) {
    return res.status(400).json({ error: 'Kategori harus Rokok, Minuman, atau Makanan' });
  }

  const parsedHarga = parseInt(harga, 10);
  if (isNaN(parsedHarga) || parsedHarga <= 0) {
    return res.status(400).json({ error: 'Harga produk harus lebih dari 0' });
  }

  const parsedStok = parseInt(stok, 10);
  if (isNaN(parsedStok) || parsedStok < 0) {
    return res.status(400).json({ error: 'Stok tidak boleh bernilai negatif' });
  }

  const cleanVarian = (varian && varian.trim()) ? varian.trim() : null;

  try {
    const result = db.prepare(`
      INSERT INTO products (nama, varian, kategori, harga, stok, aktif)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(nama.trim(), cleanVarian, kategori, parsedHarga, parsedStok);

    const created = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'Produk berhasil ditambahkan', product: created });
  } catch (err) {
    console.error('Error adding product:', err);
    res.status(500).json({ error: 'Gagal menambahkan produk: ' + err.message });
  }
});

// PUT /api/products/:id - Update product (admin only)
router.put('/:id', requireRole('admin'), (req, res) => {
  const { nama, varian, kategori, harga, stok } = req.body;

  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Produk tidak ditemukan' });
  }

  if (!nama || !nama.trim()) {
    return res.status(400).json({ error: 'Nama produk wajib diisi' });
  }

  if (!VALID_CATEGORIES.includes(kategori)) {
    return res.status(400).json({ error: 'Kategori harus Rokok, Minuman, atau Makanan' });
  }

  const parsedHarga = parseInt(harga, 10);
  if (isNaN(parsedHarga) || parsedHarga <= 0) {
    return res.status(400).json({ error: 'Harga produk harus lebih dari 0' });
  }

  const parsedStok = parseInt(stok, 10);
  if (isNaN(parsedStok) || parsedStok < 0) {
    return res.status(400).json({ error: 'Stok tidak boleh bernilai negatif' });
  }

  const cleanVarian = (varian && varian.trim()) ? varian.trim() : null;

  try {
    db.prepare(`
      UPDATE products 
      SET nama = ?, varian = ?, kategori = ?, harga = ?, stok = ?
      WHERE id = ?
    `).run(nama.trim(), cleanVarian, kategori, parsedHarga, parsedStok, req.params.id);

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    res.json({ message: 'Produk berhasil diperbarui', product: updated });
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: 'Gagal mengupdate produk: ' + err.message });
  }
});

// PATCH /api/products/:id/toggle - Toggle active status (admin only)
router.patch('/:id/toggle', requireRole('admin'), (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Produk tidak ditemukan' });
  }

  const newStatus = product.aktif === 1 ? 0 : 1;
  db.prepare('UPDATE products SET aktif = ? WHERE id = ?').run(newStatus, product.id);

  res.json({ 
    message: `Status produk berhasil diubah menjadi ${newStatus === 1 ? 'Aktif' : 'Nonaktif'}`,
    product: { ...product, aktif: newStatus }
  });
});

// DELETE /api/products/:id - Delete product (admin only)
router.delete('/:id', requireRole('admin'), (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Produk tidak ditemukan' });
  }

  try {
    // Check if product is referenced in transactions or expenses
    const txCount = db.prepare('SELECT COUNT(*) as count FROM transaction_items WHERE product_id = ?').get(product.id).count;
    const expCount = db.prepare('SELECT COUNT(*) as count FROM expenses WHERE product_id = ?').get(product.id).count;

    if (txCount > 0 || expCount > 0) {
      // Soft-delete to preserve foreign key integrity
      db.prepare('UPDATE products SET aktif = 0 WHERE id = ?').run(product.id);
      return res.json({ 
        message: `Produk "${product.nama}" memiliki riwayat data sehingga dinonaktifkan (arsip)`,
        soft_deleted: true 
      });
    }

    // Hard-delete if never used
    db.prepare('DELETE FROM products WHERE id = ?').run(product.id);
    res.json({ 
      message: `Produk "${product.nama}" berhasil dihapus`,
      deleted: true 
    });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: 'Gagal menghapus produk: ' + err.message });
  }
});

module.exports = router;
