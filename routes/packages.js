const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/packages - List billing packages
router.get('/', (req, res) => {
  const { tier } = req.query;

  let query = 'SELECT * FROM billing_packages WHERE 1=1';
  const params = [];

  if (tier) {
    query += ' AND LOWER(tier) = LOWER(?)';
    params.push(tier.trim());
  }

  query += ' ORDER BY id ASC';

  try {
    const rawPackages = db.prepare(query).all(...params);
    // Include compatibility fields so legacy code or tests don't break
    const packages = rawPackages.map(pkg => {
      const premPkg = rawPackages.find(p => p.nama.toLowerCase() === pkg.nama.toLowerCase() && p.tier && p.tier.toLowerCase() === 'premium');
      const vipPkg = rawPackages.find(p => p.nama.toLowerCase() === pkg.nama.toLowerCase() && p.tier && p.tier.toLowerCase() === 'vip');
      const regPkg = rawPackages.find(p => p.nama.toLowerCase() === pkg.nama.toLowerCase() && p.tier && p.tier.toLowerCase() === 'reguler');

      return {
        ...pkg,
        harga_reguler: regPkg ? regPkg.harga : pkg.harga,
        harga_premium: premPkg ? premPkg.harga : pkg.harga,
        harga_vip: vipPkg ? vipPkg.harga : pkg.harga
      };
    });

    res.json({ packages });
  } catch (err) {
    console.error('Error fetching packages:', err);
    res.status(500).json({ error: 'Gagal memuat paket billing: ' + err.message });
  }
});

// POST /api/packages - Create billing package (admin only)
router.post('/', requireRole('admin'), (req, res) => {
  let { nama, waktu, harga, tier, deskripsi, harga_reguler } = req.body;

  if (!nama || !nama.trim()) {
    return res.status(400).json({ error: 'Nama paket wajib diisi' });
  }

  // Support both new format (harga, tier, waktu) and legacy format fallback
  const finalHarga = parseInt(harga !== undefined ? harga : harga_reguler, 10);
  if (isNaN(finalHarga) || finalHarga <= 0) {
    return res.status(400).json({ error: 'Harga billing harus bernilai lebih dari 0' });
  }

  const finalTierName = (tier || 'Reguler').trim();
  const tierRecord = db.prepare('SELECT * FROM tiers WHERE LOWER(nama) = LOWER(?)').get(finalTierName);
  if (!tierRecord) {
    return res.status(400).json({ error: `Tier "${finalTierName}" tidak ditemukan. Silakan tambahkan tier terlebih dahulu.` });
  }

  const finalWaktu = (waktu || deskripsi || '').trim();

  try {
    const result = db.prepare(`
      INSERT INTO billing_packages (nama, waktu, harga, tier)
      VALUES (?, ?, ?, ?)
    `).run(nama.trim(), finalWaktu, finalHarga, tierRecord.nama);

    const created = db.prepare('SELECT * FROM billing_packages WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({
      message: 'Paket billing berhasil ditambahkan',
      package: created
    });
  } catch (err) {
    console.error('Error adding package:', err);
    res.status(500).json({ error: 'Gagal menambahkan paket billing: ' + err.message });
  }
});

// PUT /api/packages/:id - Update billing package (admin only)
router.put('/:id', requireRole('admin'), (req, res) => {
  let { nama, waktu, harga, tier, deskripsi, harga_reguler } = req.body;

  const existing = db.prepare('SELECT * FROM billing_packages WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Paket billing tidak ditemukan' });
  }

  if (!nama || !nama.trim()) {
    return res.status(400).json({ error: 'Nama paket wajib diisi' });
  }

  const finalHarga = parseInt(harga !== undefined ? harga : harga_reguler, 10);
  if (isNaN(finalHarga) || finalHarga <= 0) {
    return res.status(400).json({ error: 'Harga billing harus bernilai lebih dari 0' });
  }

  const finalTierName = (tier || existing.tier || 'Reguler').trim();
  const tierRecord = db.prepare('SELECT * FROM tiers WHERE LOWER(nama) = LOWER(?)').get(finalTierName);
  if (!tierRecord) {
    return res.status(400).json({ error: `Tier "${finalTierName}" tidak ditemukan. Silakan tambahkan tier terlebih dahulu.` });
  }

  const finalWaktu = (waktu !== undefined ? waktu : (deskripsi || existing.waktu || '')).trim();

  try {
    db.prepare(`
      UPDATE billing_packages 
      SET nama = ?, waktu = ?, harga = ?, tier = ?
      WHERE id = ?
    `).run(nama.trim(), finalWaktu, finalHarga, tierRecord.nama, req.params.id);

    const updated = db.prepare('SELECT * FROM billing_packages WHERE id = ?').get(req.params.id);
    res.json({
      message: 'Paket billing berhasil diperbarui',
      package: updated
    });
  } catch (err) {
    console.error('Error updating package:', err);
    res.status(500).json({ error: 'Gagal memperbarui paket billing: ' + err.message });
  }
});

// DELETE /api/packages/:id - Delete billing package (admin only)
router.delete('/:id', requireRole('admin'), (req, res) => {
  const pkgId = req.params.id;

  const pkg = db.prepare('SELECT * FROM billing_packages WHERE id = ?').get(pkgId);
  if (!pkg) {
    return res.status(404).json({ error: 'Paket billing tidak ditemukan' });
  }

  try {
    const deleteTx = db.transaction(() => {
      // 1. Preserve package name snapshot in transactions and set foreign key to NULL
      db.prepare(`
        UPDATE transactions 
        SET paket_nama = COALESCE(paket_nama, ?), paket_id = NULL 
        WHERE paket_id = ?
      `).run(pkg.nama, pkgId);

      // 2. Delete the billing package
      db.prepare('DELETE FROM billing_packages WHERE id = ?').run(pkgId);
    });

    deleteTx();

    res.json({
      message: `Paket billing "${pkg.nama}" berhasil dihapus`,
      id: parseInt(pkgId, 10)
    });
  } catch (err) {
    console.error('Error deleting package:', err);
    res.status(500).json({ error: 'Gagal menghapus paket billing: ' + err.message });
  }
});

module.exports = router;
