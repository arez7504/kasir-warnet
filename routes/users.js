const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/users - Daftar semua user (admin only)
router.get('/', requireRole('admin'), (req, res) => {
  const users = db.prepare(`
    SELECT id, username, nama, role, created_at FROM users ORDER BY role DESC, nama ASC
  `).all();
  res.json({ users });
});

// POST /api/users - Tambah user baru (admin only)
router.post('/', requireRole('admin'), (req, res) => {
  const { username, password, nama, role } = req.body;

  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Username wajib diisi' });
  }
  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'Password minimal 4 karakter' });
  }
  if (!nama || !nama.trim()) {
    return res.status(400).json({ error: 'Nama lengkap wajib diisi' });
  }
  if (!['operator', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Role harus operator atau admin' });
  }

  const cleanUsername = username.trim().toLowerCase();

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
  if (existing) {
    return res.status(400).json({ error: `Username "${cleanUsername}" sudah dipakai` });
  }

  try {
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
      INSERT INTO users (username, password, nama, role) VALUES (?, ?, ?, ?)
    `).run(cleanUsername, hash, nama.trim(), role);

    const created = db.prepare('SELECT id, username, nama, role, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: `User "${created.username}" berhasil ditambahkan`, user: created });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Gagal menambahkan user: ' + err.message });
  }
});

// PUT /api/users/:id - Edit nama & role user (admin only)
router.put('/:id', requireRole('admin'), (req, res) => {
  const { nama, role } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User tidak ditemukan' });
  }

  // Cegah admin mengubah role dirinya sendiri (proteksi lock-out)
  if (parseInt(req.params.id) === req.session.user.id && role !== 'admin') {
    return res.status(400).json({ error: 'Tidak bisa mengubah role akun Anda sendiri' });
  }

  if (!nama || !nama.trim()) {
    return res.status(400).json({ error: 'Nama lengkap wajib diisi' });
  }
  if (!['operator', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Role harus operator atau admin' });
  }

  try {
    db.prepare('UPDATE users SET nama = ?, role = ? WHERE id = ?').run(nama.trim(), role, user.id);
    const updated = db.prepare('SELECT id, username, nama, role, created_at FROM users WHERE id = ?').get(user.id);
    res.json({ message: 'Data user berhasil diperbarui', user: updated });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Gagal memperbarui user: ' + err.message });
  }
});

// PATCH /api/users/:id/password - Ganti password user (admin only)
router.patch('/:id/password', requireRole('admin'), (req, res) => {
  const { password } = req.body;

  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'Password baru minimal 4 karakter' });
  }

  const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User tidak ditemukan' });
  }

  try {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, user.id);
    res.json({ message: `Password user "${user.username}" berhasil diubah` });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ error: 'Gagal mengubah password: ' + err.message });
  }
});

// DELETE /api/users/:id - Hapus user (admin only)
router.delete('/:id', requireRole('admin'), (req, res) => {
  const userId = parseInt(req.params.id);

  // Cegah admin hapus dirinya sendiri
  if (userId === req.session.user.id) {
    return res.status(400).json({ error: 'Tidak bisa menghapus akun Anda sendiri' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User tidak ditemukan' });
  }

  // Cek apakah user punya riwayat shift
  const shiftCount = db.prepare('SELECT COUNT(*) as count FROM shifts WHERE user_id = ?').get(userId).count;
  if (shiftCount > 0) {
    return res.status(400).json({
      error: `User "${user.nama}" memiliki ${shiftCount} riwayat shift dan tidak bisa dihapus. Nonaktifkan jika perlu.`
    });
  }

  try {
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    res.json({ message: `User "${user.nama}" berhasil dihapus`, deleted: true });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Gagal menghapus user: ' + err.message });
  }
});

module.exports = router;
