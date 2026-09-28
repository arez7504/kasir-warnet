require('dotenv').config();
const express = require('express');
const session = require('express-session');
const SqliteStore = require('connect-sqlite3')(session);
const path = require('path');
const db = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Gunakan SESSION_SECRET dari .env — WAJIB diisi sebelum deploy produksi
const SESSION_SECRET = process.env.SESSION_SECRET || 'kasir-warnet-dev-secret-ganti-di-env';
if (!process.env.SESSION_SECRET) {
  console.warn('[WARNING] SESSION_SECRET tidak ditemukan di .env! Gunakan secret default (tidak aman untuk produksi).');
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  store: new SqliteStore({
    db: 'sessions.db',
    dir: path.join(__dirname, 'database'),
    table: 'sessions'
  }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 24 jam
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Serve static assets
app.use(express.static(path.join(__dirname, 'public')));

// Mount API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/shifts', require('./routes/shifts'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/products', require('./routes/products'));
app.use('/api/packages', require('./routes/packages'));
app.use('/api/tiers', require('./routes/tiers'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/users', require('./routes/users'));

// Fallback for SPA
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: 'Terjadi kesalahan internal server: ' + err.message });
});

app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`  KASIR WARNET BERHASIL DIMULAI`);
  console.log(`  Buka browser di: http://localhost:${PORT}`);
  console.log(`=========================================`);
});
