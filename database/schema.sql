-- Pengguna (operator & admin)
CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  username    TEXT    NOT NULL UNIQUE,
  password    TEXT    NOT NULL,  -- hashed with bcrypt
  nama        TEXT    NOT NULL,
  role        TEXT    NOT NULL CHECK(role IN ('operator','admin')),
  created_at  TEXT    DEFAULT (datetime('now','localtime'))
);

-- Shift kerja
CREATE TABLE IF NOT EXISTS shifts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  started_at  TEXT    DEFAULT (datetime('now','localtime')),
  closed_at   TEXT,
  saldo_awal  INTEGER NOT NULL,  -- dalam rupiah (integer, tanpa desimal)
  status      TEXT    NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed'))
);

-- Produk (jajan, minuman, rokok)
CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nama        TEXT    NOT NULL,
  kategori    TEXT    NOT NULL CHECK(kategori IN ('Rokok','Minuman','Minuman Botol','Makanan')),
  varian      TEXT,
  harga       INTEGER NOT NULL,
  stok        INTEGER NOT NULL DEFAULT 0,
  aktif       INTEGER NOT NULL DEFAULT 1,  -- 1 = aktif, 0 = nonaktif
  created_at  TEXT    DEFAULT (datetime('now','localtime'))
);

-- Tier Ruangan / PC Billing
CREATE TABLE IF NOT EXISTS tiers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nama        TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  created_at  TEXT    DEFAULT (datetime('now','localtime'))
);

-- Paket billing (tarif Cyberindo)
CREATE TABLE IF NOT EXISTS billing_packages (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nama           TEXT    NOT NULL,
  waktu          TEXT,
  harga          INTEGER NOT NULL,
  tier           TEXT    NOT NULL,
  deskripsi      TEXT,
  harga_reguler  INTEGER,
  harga_premium  INTEGER,
  harga_vip      INTEGER,
  aktif          INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT    DEFAULT (datetime('now','localtime'))
);

-- Transaksi (produk & billing, satu tabel)
CREATE TABLE IF NOT EXISTS transactions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  shift_id        INTEGER NOT NULL REFERENCES shifts(id),
  tipe            TEXT    NOT NULL CHECK(tipe IN ('produk','billing')),
  metode_bayar    TEXT    NOT NULL CHECK(metode_bayar IN ('cash','qris')),
  total           INTEGER NOT NULL,
  nominal_bayar   INTEGER,  -- null jika QRIS
  kembalian       INTEGER,  -- null jika QRIS
  -- Khusus billing
  paket_id        INTEGER REFERENCES billing_packages(id) ON DELETE SET NULL,
  paket_nama      TEXT,     -- snapshot nama paket
  tier            TEXT,     -- tier ruangan (Reguler, Premium, VIP, dll)
  jumlah_pc       INTEGER,
  harga_saat_itu  INTEGER,  -- harga paket snapshot
  -- Status void / pembatalan
  status          TEXT    DEFAULT 'completed' CHECK(status IN ('completed','void')),
  voided_at       TEXT,
  voided_by       INTEGER REFERENCES users(id),
  --
  created_at      TEXT    DEFAULT (datetime('now','localtime'))
);

-- Detail item transaksi produk
CREATE TABLE IF NOT EXISTS transaction_items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id  INTEGER NOT NULL REFERENCES transactions(id),
  product_id      INTEGER NOT NULL REFERENCES products(id),
  nama_produk     TEXT    NOT NULL,  -- snapshot nama
  varian          TEXT,              -- snapshot varian
  qty             INTEGER NOT NULL,
  harga_saat_itu  INTEGER NOT NULL   -- snapshot harga
);

-- Pengeluaran (kasbon, operasional, stok masuk)
CREATE TABLE IF NOT EXISTS expenses (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  shift_id        INTEGER NOT NULL REFERENCES shifts(id),
  tipe            TEXT    NOT NULL CHECK(tipe IN ('kasbon','operasional','stok_masuk')),
  nominal         INTEGER NOT NULL,
  keterangan      TEXT    NOT NULL,
  product_id      INTEGER REFERENCES products(id),  -- khusus stok masuk
  qty             INTEGER,                           -- khusus stok masuk
  created_at      TEXT    DEFAULT (datetime('now','localtime'))
);

-- Rekonsiliasi (saat tutup shift)
CREATE TABLE IF NOT EXISTS reconciliations (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  shift_id            INTEGER NOT NULL UNIQUE REFERENCES shifts(id),
  qris_app            INTEGER NOT NULL,
  qris_edc            INTEGER NOT NULL,
  selisih_qris        INTEGER NOT NULL,
  catatan_qris        TEXT,
  billing_app         INTEGER NOT NULL,
  billing_cyberindo   INTEGER NOT NULL,
  selisih_billing     INTEGER NOT NULL,
  catatan_billing     TEXT,
  kas_seharusnya      INTEGER NOT NULL,
  kas_fisik           INTEGER NOT NULL,
  selisih_kas         INTEGER NOT NULL,
  catatan_kas         TEXT,
  created_at          TEXT    DEFAULT (datetime('now','localtime'))
);

-- Indexes untuk performa query shift & transaksi
CREATE INDEX IF NOT EXISTS idx_shifts_user_status ON shifts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_transactions_shift ON transactions(shift_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_tx ON transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_expenses_shift ON expenses(shift_id);
