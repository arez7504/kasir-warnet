const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'warnet.db');
const db = new Database(dbPath);

// Enable WAL mode & foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDb() {
  // Execute schema
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);

  // Auto-migration for varian columns
  try {
    const prodCols = db.prepare("PRAGMA table_info(products)").all();
    if (!prodCols.some(c => c.name === 'varian')) {
      db.exec("ALTER TABLE products ADD COLUMN varian TEXT");
    }
  } catch (err) {
    console.error('[DB] Migration error on products:', err.message);
  }

  try {
    const itemCols = db.prepare("PRAGMA table_info(transaction_items)").all();
    if (!itemCols.some(c => c.name === 'varian')) {
      db.exec("ALTER TABLE transaction_items ADD COLUMN varian TEXT");
    }
  } catch (err) {
    console.error('[DB] Migration error on transaction_items:', err.message);
  }

  // Migration: tambah kolom status untuk void/cancel transaksi
  try {
    const txCols = db.prepare("PRAGMA table_info(transactions)").all();
    if (!txCols.some(c => c.name === 'status')) {
      db.exec("ALTER TABLE transactions ADD COLUMN status TEXT DEFAULT 'completed'");
      console.log('[DB] Migration: tambah kolom transactions.status');
    }
    if (!txCols.some(c => c.name === 'voided_at')) {
      db.exec("ALTER TABLE transactions ADD COLUMN voided_at TEXT");
    }
    if (!txCols.some(c => c.name === 'voided_by')) {
      db.exec("ALTER TABLE transactions ADD COLUMN voided_by INTEGER REFERENCES users(id)");
    }
    if (!txCols.some(c => c.name === 'paket_nama')) {
      db.exec("ALTER TABLE transactions ADD COLUMN paket_nama TEXT");
      console.log('[DB] Migration: tambah kolom transactions.paket_nama');
    }
  } catch (err) {
    console.error('[DB] Migration error on transactions (columns):', err.message);
  }

  // Ensure tiers table and seed default tiers
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS tiers (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        nama       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
        created_at TEXT    DEFAULT (datetime('now','localtime'))
      )
    `);

    const tierCount = db.prepare('SELECT COUNT(*) AS count FROM tiers').get().count;
    if (tierCount === 0) {
      console.log('[DB] Seeding default tiers...');
      const insertTier = db.prepare('INSERT INTO tiers (nama) VALUES (?)');
      ['Reguler', 'Premium', 'VIP'].forEach(t => insertTier.run(t));
    }
  } catch (err) {
    console.error('[DB] Error initializing tiers:', err.message);
  }

  // Migration: Rebuild billing_packages to clean schema (nama, waktu, harga, tier, created_at)
  try {
    const pkgSqlRow = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='billing_packages'").get();
    if (pkgSqlRow && pkgSqlRow.sql && pkgSqlRow.sql.includes('harga_reguler  INTEGER NOT NULL')) {
      console.log('[DB] Migrating billing_packages to new schema...');
      db.pragma('foreign_keys = OFF');

      // Get existing rows
      const oldPkgs = db.prepare("SELECT * FROM billing_packages").all();

      db.exec(`
        DROP TABLE IF EXISTS billing_packages_migrated;
        CREATE TABLE billing_packages_migrated (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          nama        TEXT    NOT NULL,
          waktu       TEXT,
          harga       INTEGER NOT NULL,
          tier        TEXT    NOT NULL,
          created_at  TEXT    DEFAULT (datetime('now','localtime'))
        );
      `);

      const insertNew = db.prepare(`
        INSERT INTO billing_packages_migrated (id, nama, waktu, harga, tier, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const insertNewAuto = db.prepare(`
        INSERT INTO billing_packages_migrated (nama, waktu, harga, tier, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      // First insert all original rows with their original IDs
      for (const p of oldPkgs) {
        const waktuStr = p.waktu || p.deskripsi || p.nama;
        const hargaReg = p.harga || p.harga_reguler || 5000;
        insertNew.run(p.id, p.nama, waktuStr, hargaReg, 'Reguler', p.created_at || new Date().toISOString());
      }

      // Then insert Premium and VIP variants with auto-increment IDs
      for (const p of oldPkgs) {
        if (p.id <= 7) {
          const waktuStr = p.waktu || p.deskripsi || p.nama;
          if (p.harga_premium && p.harga_premium > 0) {
            insertNewAuto.run(p.nama, waktuStr, p.harga_premium, 'Premium', p.created_at || new Date().toISOString());
          }
          if (p.harga_vip && p.harga_vip > 0) {
            insertNewAuto.run(p.nama, waktuStr, p.harga_vip, 'VIP', p.created_at || new Date().toISOString());
          }
        }
      }

      db.exec(`
        DROP TABLE billing_packages;
        ALTER TABLE billing_packages_migrated RENAME TO billing_packages;
      `);
      db.pragma('foreign_keys = ON');
      console.log('[DB] billing_packages migrated successfully to new schema.');
    }
  } catch (err) {
    console.error('[DB] Migration error on billing_packages:', err.message);
    try { db.pragma('foreign_keys = ON'); } catch (e) {}
  }

  // Populate transactions.paket_nama snapshot for existing transactions
  try {
    db.exec(`
      UPDATE transactions 
      SET paket_nama = (SELECT nama FROM billing_packages WHERE id = transactions.paket_id)
      WHERE paket_nama IS NULL AND paket_id IS NOT NULL;
    `);
  } catch (err) {
    console.error('[DB] Error populating transactions.paket_nama:', err.message);
  }

  // Migration: Relax CHECK(tier IN (...)) on transactions table if present
  try {
    const txSqlRow = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='transactions'").get();
    if (txSqlRow && txSqlRow.sql && txSqlRow.sql.includes("tier IN ('reguler','premium','vip')")) {
      console.log('[DB] Migrating transactions table to remove restrictive tier check constraint...');
      db.pragma('foreign_keys = OFF');
      db.exec(`
        CREATE TABLE transactions_migrated (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          shift_id        INTEGER NOT NULL REFERENCES shifts(id),
          tipe            TEXT    NOT NULL CHECK(tipe IN ('produk','billing')),
          metode_bayar    TEXT    NOT NULL CHECK(metode_bayar IN ('cash','qris')),
          total           INTEGER NOT NULL,
          nominal_bayar   INTEGER,
          kembalian       INTEGER,
          paket_id        INTEGER REFERENCES billing_packages(id) ON DELETE SET NULL,
          paket_nama      TEXT,
          tier            TEXT,
          jumlah_pc       INTEGER,
          harga_saat_itu  INTEGER,
          created_at      TEXT    DEFAULT (datetime('now','localtime')),
          status          TEXT    DEFAULT 'completed' CHECK(status IN ('completed','void')),
          voided_at       TEXT,
          voided_by       INTEGER REFERENCES users(id)
        );

        INSERT INTO transactions_migrated (
          id, shift_id, tipe, metode_bayar, total, nominal_bayar, kembalian,
          paket_id, paket_nama, tier, jumlah_pc, harga_saat_itu, created_at, status, voided_at, voided_by
        )
        SELECT 
          id, shift_id, tipe, metode_bayar, total, nominal_bayar, kembalian,
          paket_id, paket_nama, tier, jumlah_pc, harga_saat_itu, created_at, status, voided_at, voided_by
        FROM transactions;

        DROP TABLE transactions;
        ALTER TABLE transactions_migrated RENAME TO transactions;
        CREATE INDEX IF NOT EXISTS idx_transactions_shift ON transactions(shift_id);
      `);
      db.pragma('foreign_keys = ON');
      console.log('[DB] transactions table migrated successfully.');
    }
  } catch (err) {
    console.error('[DB] Migration error relaxing transactions check constraint:', err.message);
    try { db.pragma('foreign_keys = ON'); } catch (e) {}
  }

  // Seed users if table is empty
  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  if (userCount === 0) {
    console.log('[DB] Seeding users...');
    const insertUser = db.prepare(`
      INSERT INTO users (username, password, nama, role)
      VALUES (?, ?, ?, ?)
    `);

    const users = [
      { username: 'agil', pass: 'agil123', nama: 'Agil', role: 'operator' },
      { username: 'rezi', pass: 'rezi123', nama: 'Rezi', role: 'operator' },
      { username: 'admin', pass: 'admin123', nama: 'Admin Owner', role: 'admin' }
    ];

    const insertManyUsers = db.transaction((userList) => {
      for (const u of userList) {
        const hash = bcrypt.hashSync(u.pass, 10);
        insertUser.run(u.username, hash, u.nama, u.role);
      }
    });
    insertManyUsers(users);
  }

  // Seed billing packages if empty
  const pkgCount = db.prepare('SELECT COUNT(*) AS count FROM billing_packages').get().count;
  if (pkgCount === 0) {
    console.log('[DB] Seeding billing packages...');
    const insertPkg = db.prepare(`
      INSERT INTO billing_packages (nama, waktu, harga, tier, aktif)
      VALUES (?, ?, ?, ?, 1)
    `);

    const packages = [
      ['Biasa 1 Jam', '1 Jam', 4000, 'Reguler'],
      ['Biasa 1 Jam', '1 Jam', 5000, 'Premium'],
      ['Biasa 1 Jam', '1 Jam', 7000, 'VIP'],
      ['Biasa 2 Jam', '2 Jam', 7000, 'Reguler'],
      ['Biasa 2 Jam', '2 Jam', 9000, 'Premium'],
      ['Biasa 2 Jam', '2 Jam', 13000, 'VIP'],
      ['Biasa 3 Jam', '3 Jam', 10000, 'Reguler'],
      ['Biasa 3 Jam', '3 Jam', 13000, 'Premium'],
      ['Biasa 3 Jam', '3 Jam', 18000, 'VIP'],
      ['Biasa 5 Jam', '5 Jam', 15000, 'Reguler'],
      ['Biasa 5 Jam', '5 Jam', 20000, 'Premium'],
      ['Biasa 5 Jam', '5 Jam', 28000, 'VIP'],
      ['Pagi 08–12', '08:00 - 12:00', 12000, 'Reguler'],
      ['Pagi 08–12', '08:00 - 12:00', 16000, 'Premium'],
      ['Pagi 08–12', '08:00 - 12:00', 22000, 'VIP'],
      ['Malam 21–06', '21:00 - 06:00', 18000, 'Reguler'],
      ['Malam 21–06', '21:00 - 06:00', 24000, 'Premium'],
      ['Malam 21–06', '21:00 - 06:00', 33000, 'VIP'],
      ['Malam 22–07', '22:00 - 07:00', 18000, 'Reguler'],
      ['Malam 22–07', '22:00 - 07:00', 24000, 'Premium'],
      ['Malam 22–07', '22:00 - 07:00', 33000, 'VIP']
    ];

    const insertManyPkgs = db.transaction((items) => {
      for (const item of items) {
        insertPkg.run(...item);
      }
    });
    insertManyPkgs(packages);
  }

  // Seed products if empty
  const prodCount = db.prepare('SELECT COUNT(*) AS count FROM products').get().count;
  if (prodCount === 0) {
    console.log('[DB] Seeding products from CSV catalog...');
    const insertProd = db.prepare(`
      INSERT INTO products (nama, kategori, varian, harga, stok, aktif)
      VALUES (?, ?, ?, ?, ?, 1)
    `);

    const products = [
      ['Aqua Kecil', 'Minuman', '600ml', 5000, 9999],
      ['Aqua Besar', 'Minuman', '1,5L', 10000, 9999],
      ['Teh Pucuk', 'Minuman', '350ml', 5000, 9999],
      ['Fruit Tea', 'Minuman', 'Apple 350ml', 7000, 9999],
      ['Fruit Tea', 'Minuman', 'Blackcurrant 350ml', 7000, 9999],
      ['Tebs Pet', 'Minuman', 'Mix Fruit 300ml', 7000, 9999],
      ['Mizone Mood up', 'Minuman', 'Lychee 500ml', 7000, 9999],
      ['Golda', 'Minuman', 'Dolce Latte 200ml', 7000, 9999],
      ['Golda', 'Minuman', 'Cappucino 200ml', 7000, 9999],
      ['Milku', 'Minuman', 'Coklat 200ml', 7000, 9999],
      ['Floridina', 'Minuman', 'Jeruk 350ml', 7000, 9999],
      ['Teh Lemon', 'Minuman', 'Madu 350ml', 7000, 9999],
      ['Fanta', 'Minuman', '390 ml', 7000, 9999],
      ['Mie Sedap', 'Makanan', 'Kari Spesial', 10000, 9999],
      ['Mie Sedap', 'Makanan', 'Ayam Jerit', 10000, 9999],
      ['Mie Sedap', 'Makanan', 'Bakso Bleduk', 10000, 9999],
      ['Roti', 'Makanan', 'Coklat', 5000, 9999],
      ['Roti', 'Makanan', 'Ayam', 5000, 9999],
      ['Garuda Kacang Atom', 'Makanan', 'Original 33gr', 3000, 9999],
      ['Nabati', 'Makanan', 'Coklat 35gr', 3000, 9999],
      ['Nabati', 'Makanan', 'Coklat 15gr', 2000, 9999],
      ['Nabati', 'Makanan', 'Keju 75gr', 5000, 9999],
      ['Nabati', 'Makanan', 'Keju 35gr', 3000, 9999],
      ['Roma Sari Gandum', 'Makanan', 'Coklat 36gr', 3000, 9999],
      ['Tango Waffle', 'Makanan', 'Choco Hazelnut 25gr', 3000, 9999],
      ['Kacang Medan Jaya', 'Makanan', 'Udang Bakar 15gr', 2000, 9999],
      ['Nextar', 'Makanan', 'Choco Brownies 27gr', 3000, 9999],
      ['Saltcheese', 'Makanan', 'Coklat 17gr', 2000, 9999],
      ['Malkist', 'Makanan', 'Coklat 18gr', 2000, 9999],
      ['Blastoz', 'Makanan', 'Choco 24gr', 3000, 9999],
      ['Gery Chocolatos', 'Makanan', 'Coklat 8gr', 1000, 9999],
      ['Pop Mie Goreng', 'Makanan', 'Spesial', 10000, 9999],
      ['Pop Mie Kuah', 'Makanan', 'Kari Ayam', 10000, 9999],
      ['Pop Mie Kuah', 'Makanan', 'Ayam', 10000, 9999],
      ['Fullo', 'Makanan', 'Coklat 7gr', 1000, 9999],
      ['Magnum', 'Rokok', 'Rokok', 3000, 9999],
      ['Sempurna Putih', 'Rokok', 'Rokok', 3000, 9999],
      ['Surya', 'Rokok', 'Rokok', 3000, 9999]
    ];

    const insertManyProds = db.transaction((items) => {
      for (const item of items) {
        insertProd.run(...item);
      }
    });
    insertManyProds(products);
  }
}

initDb();

module.exports = db;
