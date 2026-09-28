const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'warnet.db');
const db = new Database(dbPath);

console.log('[MIGRATE] Starting migration of products from CSV...');

const csvProducts = [
  // Minuman
  { nama: 'Aqua Kecil', kategori: 'Minuman', varian: '600ml', harga: 5000 },
  { nama: 'Aqua Besar', kategori: 'Minuman', varian: '1,5L', harga: 10000 },
  { nama: 'Teh Pucuk', kategori: 'Minuman', varian: '350ml', harga: 5000 },
  { nama: 'Fruit Tea', kategori: 'Minuman', varian: 'Apple 350ml', harga: 7000 },
  { nama: 'Fruit Tea', kategori: 'Minuman', varian: 'Blackcurrant 350ml', harga: 7000 },
  { nama: 'Tebs Pet', kategori: 'Minuman', varian: 'Mix Fruit 300ml', harga: 7000 },
  { nama: 'Mizone Mood up', kategori: 'Minuman', varian: 'Lychee 500ml', harga: 7000 },
  { nama: 'Golda', kategori: 'Minuman', varian: 'Dolce Latte 200ml', harga: 7000 },
  { nama: 'Golda', kategori: 'Minuman', varian: 'Cappucino 200ml', harga: 7000 },
  { nama: 'Milku', kategori: 'Minuman', varian: 'Coklat 200ml', harga: 7000 },
  { nama: 'Floridina', kategori: 'Minuman', varian: 'Jeruk 350ml', harga: 7000 },
  { nama: 'Teh Lemon', kategori: 'Minuman', varian: 'Madu 350ml', harga: 7000 },
  { nama: 'Fanta', kategori: 'Minuman', varian: '390 ml', harga: 7000 },
  // Makanan
  { nama: 'Mie Sedap', kategori: 'Makanan', varian: 'Kari Spesial', harga: 10000 },
  { nama: 'Mie Sedap', kategori: 'Makanan', varian: 'Ayam Jerit', harga: 10000 },
  { nama: 'Mie Sedap', kategori: 'Makanan', varian: 'Bakso Bleduk', harga: 10000 },
  { nama: 'Roti', kategori: 'Makanan', varian: 'Coklat', harga: 5000 },
  { nama: 'Roti', kategori: 'Makanan', varian: 'Ayam', harga: 5000 },
  { nama: 'Garuda Kacang Atom', kategori: 'Makanan', varian: 'Original 33gr', harga: 3000 },
  { nama: 'Nabati', kategori: 'Makanan', varian: 'Coklat 35gr', harga: 3000 },
  { nama: 'Nabati', kategori: 'Makanan', varian: 'Coklat 15gr', harga: 2000 },
  { nama: 'Nabati', kategori: 'Makanan', varian: 'Keju 75gr', harga: 5000 },
  { nama: 'Nabati', kategori: 'Makanan', varian: 'Keju 35gr', harga: 3000 },
  { nama: 'Roma Sari Gandum', kategori: 'Makanan', varian: 'Coklat 36gr', harga: 3000 },
  { nama: 'Tango Waffle', kategori: 'Makanan', varian: 'Choco Hazelnut 25gr', harga: 3000 },
  { nama: 'Kacang Medan Jaya', kategori: 'Makanan', varian: 'Udang Bakar 15gr', harga: 2000 },
  { nama: 'Nextar', kategori: 'Makanan', varian: 'Choco Brownies 27gr', harga: 3000 },
  { nama: 'Saltcheese', kategori: 'Makanan', varian: 'Coklat 17gr', harga: 2000 },
  { nama: 'Malkist', kategori: 'Makanan', varian: 'Coklat 18gr', harga: 2000 },
  { nama: 'Blastoz', kategori: 'Makanan', varian: 'Choco 24gr', harga: 3000 },
  { nama: 'Gery Chocolatos', kategori: 'Makanan', varian: 'Coklat 8gr', harga: 1000 },
  { nama: 'Pop Mie Goreng', kategori: 'Makanan', varian: 'Spesial', harga: 10000 },
  { nama: 'Pop Mie Kuah', kategori: 'Makanan', varian: 'Kari Ayam', harga: 10000 },
  { nama: 'Pop Mie Kuah', kategori: 'Makanan', varian: 'Ayam', harga: 10000 },
  { nama: 'Fullo', kategori: 'Makanan', varian: 'Coklat 7gr', harga: 1000 },
  // Rokok
  { nama: 'Magnum', kategori: 'Rokok', varian: 'Rokok', harga: 3000 },
  { nama: 'Sempurna Putih', kategori: 'Rokok', varian: 'Rokok', harga: 3000 },
  { nama: 'Surya', kategori: 'Rokok', varian: 'Rokok', harga: 3000 }
];

db.pragma('foreign_keys = OFF');

try {
  db.exec('BEGIN TRANSACTION');

  // 1. Ensure table structure has varian and allows Minuman category
  db.exec(`
    CREATE TABLE IF NOT EXISTS new_products (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      nama        TEXT    NOT NULL,
      kategori    TEXT    NOT NULL CHECK(kategori IN ('Rokok','Minuman','Minuman Botol','Makanan')),
      varian      TEXT,
      harga       INTEGER NOT NULL,
      stok        INTEGER NOT NULL DEFAULT 0,
      aktif       INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT    DEFAULT (datetime('now','localtime'))
    );
  `);

  // Drop old products table and rename new_products
  db.exec('DROP TABLE IF EXISTS products;');
  db.exec('ALTER TABLE new_products RENAME TO products;');

  // 2. Ensure transaction_items has varian column
  const itemCols = db.prepare("PRAGMA table_info(transaction_items)").all();
  if (!itemCols.some(c => c.name === 'varian')) {
    db.exec("ALTER TABLE transaction_items ADD COLUMN varian TEXT");
  }

  // 3. Insert all 38 products from CSV with stock = 100
  const insertStmt = db.prepare(`
    INSERT INTO products (nama, kategori, varian, harga, stok, aktif)
    VALUES (?, ?, ?, ?, 9999, 1)
  `);

  for (const p of csvProducts) {
    insertStmt.run(p.nama, p.kategori, p.varian, p.harga);
  }

  db.exec('COMMIT');
  console.log(`[MIGRATE] Success! Inserted ${csvProducts.length} products from CSV.`);
} catch (err) {
  db.exec('ROLLBACK');
  console.error('[MIGRATE] Error during migration:', err);
  process.exit(1);
} finally {
  db.pragma('foreign_keys = ON');
}

// Display summary
const count = db.prepare('SELECT COUNT(*) AS count FROM products').get().count;
console.log(`[MIGRATE] Total products currently in DB: ${count}`);

const sample = db.prepare('SELECT id, nama, varian, kategori, harga, stok FROM products LIMIT 5').all();
console.log('[MIGRATE] Sample products:', sample);
