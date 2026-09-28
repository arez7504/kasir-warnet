const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/tiers - List all tiers
router.get('/', (req, res) => {
  try {
    const tiers = db.prepare('SELECT * FROM tiers ORDER BY id ASC').all();
    res.json({ tiers });
  } catch (err) {
    console.error('Error fetching tiers:', err);
    res.status(500).json({ error: 'Gagal memuat data tier: ' + err.message });
  }
});

// POST /api/tiers - Add new tier (admin only)
router.post('/', requireRole('admin'), (req, res) => {
  const { nama } = req.body;

  if (!nama || !nama.trim()) {
    return res.status(400).json({ error: 'Nama tier wajib diisi' });
  }

  const cleanNama = nama.trim();

  try {
    const existing = db.prepare('SELECT * FROM tiers WHERE LOWER(nama) = LOWER(?)').get(cleanNama);
    if (existing) {
      return res.status(400).json({ error: `Tier "${cleanNama}" sudah ada` });
    }

    const result = db.prepare('INSERT INTO tiers (nama) VALUES (?)').run(cleanNama);
    const created = db.prepare('SELECT * FROM tiers WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      message: `Tier "${cleanNama}" berhasil ditambahkan`,
      tier: created
    });
  } catch (err) {
    console.error('Error adding tier:', err);
    res.status(500).json({ error: 'Gagal menambahkan tier: ' + err.message });
  }
});

// DELETE /api/tiers/:id - Delete tier (admin only)
router.delete('/:id', requireRole('admin'), (req, res) => {
  const tierId = req.params.id;

  try {
    const tier = db.prepare('SELECT * FROM tiers WHERE id = ?').get(tierId);
    if (!tier) {
      return res.status(404).json({ error: 'Tier tidak ditemukan' });
    }

    // Check if any billing package is using this tier
    const usedCount = db.prepare('SELECT COUNT(*) AS count FROM billing_packages WHERE LOWER(tier) = LOWER(?)').get(tier.nama).count;
    if (usedCount > 0) {
      return res.status(400).json({
        error: `Tidak dapat menghapus tier "${tier.nama}" karena masih digunakan oleh ${usedCount} paket billing. Hapus atau ubah paket terkait terlebih dahulu.`
      });
    }

    db.prepare('DELETE FROM tiers WHERE id = ?').run(tierId);

    res.json({
      message: `Tier "${tier.nama}" berhasil dihapus`,
      id: parseInt(tierId, 10)
    });
  } catch (err) {
    console.error('Error deleting tier:', err);
    res.status(500).json({ error: 'Gagal menghapus tier: ' + err.message });
  }
});

module.exports = router;
