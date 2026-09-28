// Automated End-to-End Verification Test Script
const http = require('http');

let cookie = '';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (cookie) headers['Cookie'] = cookie;
    if (postData) headers['Content-Length'] = Buffer.byteLength(postData);

    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers
    }, (res) => {
      let data = '';
      if (res.headers['set-cookie']) {
        cookie = res.headers['set-cookie'][0].split(';')[0];
      }

      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, data: json });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING AUTOMATED END-TO-END TESTS ---');

  // Test 1: Invalid Login
  console.log('\n[Test 1] Login dengan password salah:');
  const invLogin = await request('POST', '/api/auth/login', { username: 'agil', password: 'wrongpassword' });
  console.log('Status:', invLogin.status, invLogin.data);
  if (invLogin.status !== 401) throw new Error('Expected 401 on invalid login');

  // Test 2: Valid Login as Agil
  console.log('\n[Test 2] Login sebagai operator Agil:');
  const loginRes = await request('POST', '/api/auth/login', { username: 'agil', password: 'agil123' });
  console.log('Status:', loginRes.status, 'User:', loginRes.data.user.nama);
  if (loginRes.status !== 200) throw new Error('Expected 200 on login');

  // Test 3: Check Active Shift (and close if open from previous run)
  console.log('\n[Test 3] Cek shift aktif awal:');
  const activeShiftBefore = await request('GET', '/api/shifts/active');
  console.log('Shift aktif:', activeShiftBefore.data.shift);
  if (activeShiftBefore.data.shift) {
    console.log('Menutup shift terbuka sebelumnya agar test fresh...');
    await request('POST', '/api/shifts/close', {
      qris_edc: 0,
      catatan_qris: 'Auto close',
      billing_cyberindo: 0,
      catatan_billing: 'Auto close',
      kas_fisik: 0,
      catatan_kas: 'Auto close'
    });
  }

  // Test 4: Open Shift
  console.log('\n[Test 4] Buka shift baru (modal: Rp 200.000):');
  const openShift = await request('POST', '/api/shifts/open', { saldo_awal: 200000 });
  console.log('Status:', openShift.status, 'Shift ID:', openShift.data.shift?.id);
  if (openShift.status !== 201) throw new Error('Failed to open shift');

  // Test 5: Get Products
  console.log('\n[Test 5] Ambil daftar produk aktif:');
  const prods = await request('GET', '/api/products', null);
  console.log(`Ditemukan ${prods.data.products.length} produk`);
  if (prods.data.products.length !== 38) throw new Error('Expected 38 products from CSV');
  const aqua = prods.data.products.find(p => p.nama === 'Aqua Kecil');
  const roti = prods.data.products.find(p => p.nama === 'Roti' && p.varian === 'Coklat');
  const surya = prods.data.products.find(p => p.nama === 'Surya');
  console.log(`Stok Aqua: ${aqua.stok}, Roti: ${roti.stok}, Surya: ${surya.stok}`);

  // Test 6: Transaction 1 - Product (Cash)
  console.log('\n[Test 6] Transaksi Produk Tunai (Aqua Kecil x2, Roti Coklat x1):');
  const txProdCash = await request('POST', '/api/transactions/product', {
    items: [
      { product_id: aqua.id, qty: 2 },
      { product_id: roti.id, qty: 1 }
    ],
    metode_bayar: 'cash',
    nominal_bayar: 20000
  });
  console.log('Status:', txProdCash.status, 'Total:', txProdCash.data.total, 'Kembalian:', txProdCash.data.kembalian);
  if (txProdCash.data.total !== 15000 || txProdCash.data.kembalian !== 5000) {
    throw new Error('Total / kembalian mismatch in product cash transaction');
  }

  // Test 7: Transaction 2 - Product (QRIS)
  console.log('\n[Test 7] Transaksi Produk QRIS (Surya x1):');
  const txProdQris = await request('POST', '/api/transactions/product', {
    items: [
      { product_id: surya.id, qty: 1 }
    ],
    metode_bayar: 'qris'
  });
  console.log('Status:', txProdQris.status, 'Total QRIS:', txProdQris.data.total);

  // Test 8: Transaction 3 - Billing Cash
  console.log('\n[Test 8] Transaksi Billing Cash (Biasa 2 Jam, Premium, 2 PC):');
  const pkgs = await request('GET', '/api/packages');
  const biasa2Jam = pkgs.data.packages.find(p => p.nama === 'Biasa 2 Jam');
  const expectedBillCashTotal = biasa2Jam.harga_premium * 2;
  const nominalBayarBillCash = expectedBillCashTotal + 2000;

  const txBillCash = await request('POST', '/api/transactions/billing', {
    paket_id: biasa2Jam.id,
    tier: 'premium',
    jumlah_pc: 2,
    metode_bayar: 'cash',
    nominal_bayar: nominalBayarBillCash
  });
  console.log('Status:', txBillCash.status, 'Total:', txBillCash.data.total, 'Kembalian:', txBillCash.data.kembalian);
  if (txBillCash.data.total !== expectedBillCashTotal || txBillCash.data.kembalian !== 2000) {
    throw new Error('Total / kembalian mismatch in billing cash transaction');
  }

  // Test 9: Transaction 4 - Billing QRIS
  console.log('\n[Test 9] Transaksi Billing QRIS (Paket Malam, VIP, 1 PC):');
  const malamPkg = pkgs.data.packages.find(p => p.nama.includes('Malam')) || pkgs.data.packages[0];
  const expectedMalamTotal = malamPkg.harga_vip * 1;
  const txBillQris = await request('POST', '/api/transactions/billing', {
    paket_id: malamPkg.id,
    tier: 'vip',
    jumlah_pc: 1,
    metode_bayar: 'qris'
  });
  console.log('Status:', txBillQris.status, 'Total QRIS:', txBillQris.data.total);
  if (txBillQris.data.total !== expectedMalamTotal) throw new Error('Billing QRIS total mismatch');

  // Test 10: Expenses
  console.log('\n[Test 10] Catat Pengeluaran (Kasbon & Stok Masuk):');
  const expKasbon = await request('POST', '/api/expenses', {
    tipe: 'kasbon',
    nominal: 50000,
    keterangan: 'Kasbon makan operator Agil'
  });
  console.log('Kasbon:', expKasbon.data.message);

  const magnum = prods.data.products.find(p => p.nama === 'Magnum');
  const oldStokMagnum = magnum.stok;
  const expStok = await request('POST', '/api/expenses', {
    tipe: 'stok_masuk',
    nominal: 15000,
    keterangan: 'Beli 5 bungkus Magnum',
    product_id: magnum.id,
    qty: 5
  });
  console.log('Stok Masuk:', expStok.data.message);

  // Verify stock increment
  const prodsAfter = await request('GET', '/api/products');
  const magnumAfter = prodsAfter.data.products.find(p => p.id === magnum.id);
  console.log(`Stok Magnum awal: ${oldStokMagnum} -> setelah stok masuk: ${magnumAfter.stok}`);
  if (magnumAfter.stok !== oldStokMagnum + 5) throw new Error('Stock was not incremented correctly');

  // Test 11: Summary
  console.log('\n[Test 11] Cek Ringkasan Shift:');
  const summary = await request('GET', '/api/shifts/summary');
  console.log('Summary shift:', summary.data);
  const expectedKas = summary.data.kas_seharusnya;
  const expectedQris = summary.data.total_qris_masuk;
  const expectedBilling = summary.data.total_billing;

  // Test 12: Tutup Shift dengan Rekonsiliasi
  console.log('\n[Test 12] Tutup Shift dengan 3-Langkah Rekonsiliasi:');
  const closeRes = await request('POST', '/api/shifts/close', {
    qris_edc: expectedQris,
    catatan_qris: 'Sesuai transaksi EDC',
    billing_cyberindo: expectedBilling,
    catatan_billing: 'Sesuai laporan Cyberindo server',
    kas_fisik: expectedKas,
    catatan_kas: 'Uang laci pas'
  });
  console.log('Close Status:', closeRes.status, closeRes.data.message);
  console.log('Reconciliation result:', closeRes.data.reconciliation);
  if (closeRes.status !== 200) throw new Error('Failed to close shift');

  // Test 13: Operator Shift History
  console.log('\n[Test 13] Cek Riwayat Shift Operator:');
  const historyShifts = await request('GET', '/api/shifts/history');
  console.log(`Ditemukan ${historyShifts.data.shifts.length} riwayat shift`);
  const lastShift = historyShifts.data.shifts[0];
  console.log(`Shift #${lastShift.id} - Status: ${lastShift.status}, Selisih Kas: Rp ${lastShift.selisih_kas}`);

  // Test 14: Admin Features
  console.log('\n[Test 14] Login sebagai Admin & cek Laporan:');
  const adminLogin = await request('POST', '/api/auth/login', { username: 'admin', password: 'admin123' });
  console.log('Admin login:', adminLogin.data.user.nama, 'Role:', adminLogin.data.user.role);

  // Add new billing package
  const addPkg = await request('POST', '/api/packages', {
    nama: 'Begadang Khusus',
    deskripsi: 'Paket malam 00:00 - 06:00',
    harga_reguler: 14000,
    harga_premium: 18000,
    harga_vip: 25000
  });
  console.log('Tambah paket baru:', addPkg.data.package.nama);

  // Reports Summary
  const repSummary = await request('GET', '/api/reports/summary', null);
  console.log('Laporan Omzet:', repSummary.data.total_pendapatan, 'Total TRX:', repSummary.data.total_transaksi);
  console.log('Proporsi:', repSummary.data.breakdown);

  // Top Products
  const topProds = await request('GET', '/api/reports/top-products', null);
  console.log('Top Produk:', topProds.data.top_products);

  console.log('\n=============================================');
  console.log('  ALL AUTOMATED TESTS PASSED SUCCESSFULLY!  ');
  console.log('=============================================');
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
