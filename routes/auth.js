const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database/db');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim().toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'Username atau password salah' });
  }

  const match = bcrypt.compareSync(password, user.password);
  if (!match) {
    return res.status(401).json({ error: 'Username atau password salah' });
  }

  const safeUser = {
    id: user.id,
    username: user.username,
    nama: user.nama,
    role: user.role
  };

  req.session.user = safeUser;
  res.json({ user: safeUser });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Gagal logout' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logout berhasil' });
  });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.json({ user: null });
  }
  // Refresh user data from db in case of role change
  const user = db.prepare('SELECT id, username, nama, role FROM users WHERE id = ?').get(req.session.user.id);
  if (!user) {
    req.session.destroy();
    return res.json({ user: null });
  }
  req.session.user = user;
  res.json({ user });
});

module.exports = router;
