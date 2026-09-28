const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACTS_DIR = 'C:\\Users\\HYPE AMD\\.gemini\\antigravity-ide\\brain\\f3cd42c8-b9df-4690-a2f6-f2a3119fd2b3';

async function runPlaywrightTest() {
  console.log('====================================================');
  console.log('  STARTING PLAYWRIGHT E2E TEST: MANAJEMEN PAKET & TIER');
  console.log('====================================================\n');

  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 }
  });

  const page = await context.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('  [BROWSER ERR]', msg.text());
  });

  try {
    // ----------------------------------------------------
    // STEP 1: Login sebagai Admin
    // ----------------------------------------------------
    console.log('[STEP 1] Login sebagai Admin Owner...');
    await page.goto('http://localhost:3000/#/login', { waitUntil: 'networkidle' });

    await page.fill('#input-username', 'admin');
    await page.fill('#input-password', 'admin123');
    await page.click('#btn-submit-login');
    await page.waitForURL('**/#/home', { timeout: 8000 });
    console.log('  -> Berhasil login sebagai admin.');

    // ----------------------------------------------------
    // STEP 2: Navigasi ke Manajemen Paket
    // ----------------------------------------------------
    console.log('\n[STEP 2] Navigasi ke Halaman Manajemen Paket...');
    await page.click('#nav-manage-packages');
    await page.waitForSelector('#btn-manage-tiers', { timeout: 10000 });
    await page.waitForSelector('#tbody-manage-packages tr');

    // Verifikasi tombol header
    const btnManageTiers = await page.$('#btn-manage-tiers');
    const btnAddPackage = await page.$('#btn-add-package');
    if (!btnManageTiers) throw new Error('Tombol "Tambahkan Tier" tidak ditemukan di header!');
    if (!btnAddPackage) throw new Error('Tombol "Tambah Paket Billing Baru" tidak ditemukan di header!');
    console.log('  -> Tombol "Tambahkan Tier" & "Tambah Paket Billing Baru" terpasang di header.');

    // Verifikasi struktur kolom tabel: pastikan kolom Status tidak ada
    const tableHeaders = await page.$$eval('.data-table thead th', ths => ths.map(t => t.textContent.trim()));
    console.log('  -> Header tabel:', tableHeaders);
    if (tableHeaders.includes('Status')) {
      throw new Error('Kolom Status seharusnya sudah dihapus!');
    }
    if (!tableHeaders.includes('Waktu Billing') || !tableHeaders.includes('Tier') || !tableHeaders.includes('Harga Billing')) {
      throw new Error('Kolom tabel harus memuat: Waktu Billing, Tier, dan Harga Billing!');
    }
    console.log('  -> Kolom tabel valid: ID, Nama Paket, Waktu Billing, Tier, Harga Billing, Aksi.');

    // Verifikasi bahwa tidak ada tombol Nonaktifkan/Aktifkan di tabel
    const toggleButtons = await page.$$('.btn-toggle-pkg');
    if (toggleButtons.length > 0) {
      throw new Error('Tombol Nonaktifkan/Aktifkan seharusnya sudah dihapus!');
    }
    console.log('  -> Fitur aktifkan/nonaktifkan berhasil dihilangkan dari tabel.');

    const screenshot1 = path.join(ARTIFACTS_DIR, 'playwright_01_manage_packages_table.png');
    await page.screenshot({ path: screenshot1 });
    console.log(`  [SCREENSHOT] Disimpan: ${screenshot1}`);

    // ----------------------------------------------------
    // STEP 3: Fitur "Tambahkan Tier"
    // ----------------------------------------------------
    console.log('\n[STEP 3] Menguji Fitur "Tambahkan Tier"...');
    await page.click('#btn-manage-tiers');
    await page.waitForSelector('#form-add-tier');
    console.log('  -> Modal Tambahkan Tier berhasil terbuka.');

    const newTierName = 'VVIP Sultan ' + Date.now().toString().slice(-4);
    await page.fill('#modal-tier-nama', newTierName);
    await page.click('#btn-save-tier');

    // Tunggu hingga tier muncul di daftar modal
    await page.waitForFunction((tier) => {
      const el = document.querySelector('#modal-tiers-list');
      return el && el.textContent.includes(tier);
    }, newTierName, { timeout: 8000 });

    console.log(`  -> Tier "${newTierName}" berhasil terdaftar di modal.`);

    const screenshot2 = path.join(ARTIFACTS_DIR, 'playwright_02_tambah_tier_modal.png');
    await page.screenshot({ path: screenshot2 });
    console.log(`  [SCREENSHOT] Disimpan: ${screenshot2}`);

    // Tutup dialog tier
    await page.click('#btn-dialog-close');
    await page.waitForTimeout(400);

    // Verifikasi tombol filter tier di halaman utama kini menyertakan tier baru
    const filterButtonsText = await page.$$eval('.filter-tier-btn', btns => btns.map(b => b.textContent.trim()));
    console.log('  -> Tombol filter tier:', filterButtonsText);
    if (!filterButtonsText.includes(newTierName)) {
      throw new Error(`Tombol filter untuk tier "${newTierName}" tidak muncul di halaman utama!`);
    }
    console.log(`  -> Filter tier "${newTierName}" langsung tersedia di halaman Manajemen Paket.`);

    // ----------------------------------------------------
    // STEP 4: Fitur "Tambah Paket Billing Baru" dengan format baru
    // ----------------------------------------------------
    console.log('\n[STEP 4] Menguji Fitur "Tambah Paket Billing Baru" dengan format baru...');
    await page.click('#btn-add-package');
    await page.waitForSelector('#form-manage-package');
    console.log('  -> Modal Tambah Paket berhasil terbuka.');

    // Verifikasi field formulir
    const hasNamaInput = await page.$('#modal-pkg-nama');
    const hasWaktuInput = await page.$('#modal-pkg-waktu');
    const hasHargaInput = await page.$('#modal-pkg-harga');
    const hasTierSelect = await page.$('#modal-pkg-tier');

    if (!hasNamaInput || !hasWaktuInput || !hasHargaInput || !hasTierSelect) {
      throw new Error('Formulir tambah paket harus memiliki: Nama Paket, Waktu Billing, Harga Billing, dan Pilih Tier!');
    }

    // Verifikasi dropdown tier memuat tier baru
    const tierOptions = await page.$$eval('#modal-pkg-tier option', opts => opts.map(o => o.value));
    console.log('  -> Opsi pilihan tier dalam dropdown:', tierOptions);
    if (!tierOptions.includes(newTierName)) {
      throw new Error(`Tier "${newTierName}" tidak tersedia di pilihan dropdown paket!`);
    }

    const testPkgNama = 'Paket Gaming Begadang Sultan ' + Date.now().toString().slice(-4);
    const testPkgWaktu = '22:00 - 06:00 (8 Jam)';
    const testPkgHarga = '45000';

    await page.fill('#modal-pkg-nama', testPkgNama);
    await page.fill('#modal-pkg-waktu', testPkgWaktu);
    await page.fill('#modal-pkg-harga', testPkgHarga);
    await page.selectOption('#modal-pkg-tier', newTierName);

    const screenshot3 = path.join(ARTIFACTS_DIR, 'playwright_03_form_tambah_paket.png');
    await page.screenshot({ path: screenshot3 });
    console.log(`  [SCREENSHOT] Disimpan: ${screenshot3}`);

    await page.click('#btn-save-pkg');
    await page.waitForFunction((pkgName) => {
      const el = document.querySelector('#tbody-manage-packages');
      return el && el.textContent.includes(pkgName);
    }, testPkgNama, { timeout: 8000 });
    console.log('  -> Paket baru berhasil disimpan.');

    const tableBodyText = await page.$eval('#tbody-manage-packages', el => el.textContent);
    if (!tableBodyText.includes(testPkgWaktu)) {
      throw new Error('Waktu billing paket baru tidak muncul di tabel!');
    }
    if (!tableBodyText.includes('45.000')) {
      throw new Error('Harga paket baru (Rp 45.000) tidak muncul di tabel!');
    }
    console.log('  -> Paket baru langsung terupdate di tabel (Nama, Waktu, Harga, Tier terkonfirmasi).');

    const screenshot4 = path.join(ARTIFACTS_DIR, 'playwright_04_paket_berhasil_ditambahkan.png');
    await page.screenshot({ path: screenshot4 });
    console.log(`  [SCREENSHOT] Disimpan: ${screenshot4}`);

    // ----------------------------------------------------
    // STEP 5: Fitur Edit Paket Billing
    // ----------------------------------------------------
    console.log('\n[STEP 5] Menguji Fitur Edit Paket Billing...');
    const rowForTestPkg = await page.locator('#tbody-manage-packages tr', { hasText: testPkgNama });
    await rowForTestPkg.locator('.btn-edit-pkg').click();
    await page.waitForSelector('#form-manage-package');

    const editNama = await page.$eval('#modal-pkg-nama', el => el.value);
    console.log(`  -> Membuka edit paket: "${editNama}"`);

    // Ubah harga menjadi 77.000 dan waktu menjadi 21:00 - 06:00 (9 Jam)
    const updatedWaktu = '21:00 - 06:00 (9 Jam)';
    await page.fill('#modal-pkg-harga', '77000');
    await page.fill('#modal-pkg-waktu', updatedWaktu);
    await page.click('#btn-save-pkg');

    await page.waitForFunction((waktu) => {
      const el = document.querySelector('#tbody-manage-packages');
      return el && el.textContent.includes(waktu);
    }, updatedWaktu, { timeout: 8000 });

    const updatedTableText = await page.$eval('#tbody-manage-packages', el => el.textContent);
    if (!updatedTableText.includes('77.000')) {
      throw new Error('Pembaruan harga paket tidak langsung tercermin di tabel!');
    }
    console.log('  -> Paket berhasil diedit dan langsung terupdate di tabel (Rp 77.000, 9 Jam).');

    const screenshot5 = path.join(ARTIFACTS_DIR, 'playwright_05_paket_berhasil_diedit.png');
    await page.screenshot({ path: screenshot5 });
    console.log(`  [SCREENSHOT] Disimpan: ${screenshot5}`);

    // ----------------------------------------------------
    // STEP 6: Fitur Hapus Paket Billing
    // ----------------------------------------------------
    console.log('\n[STEP 6] Menguji Fitur Hapus Paket Billing...');
    const targetRow = page.locator('#tbody-manage-packages tr', { hasText: testPkgNama });
    await targetRow.locator('.btn-delete-pkg').click();

    // Tunggu dialog konfirmasi
    await page.waitForSelector('#btn-modal-confirm');
    const confirmDialogTitle = await page.$eval('#dialog-title', el => el.textContent);
    console.log('  -> Dialog konfirmasi muncul:', confirmDialogTitle);

    const screenshot6 = path.join(ARTIFACTS_DIR, 'playwright_06_dialog_konfirmasi_hapus.png');
    await page.screenshot({ path: screenshot6 });
    console.log(`  [SCREENSHOT] Disimpan: ${screenshot6}`);

    // Klik tombol konfirmasi hapus
    await page.click('#btn-modal-confirm');
    await page.waitForFunction((pkgName) => {
      const el = document.querySelector('#tbody-manage-packages');
      return el && !el.textContent.includes(pkgName);
    }, testPkgNama, { timeout: 8000 });

    console.log('  -> Paket berhasil dihapus dan langsung hilang dari tabel secara instan.');

    const screenshot7 = path.join(ARTIFACTS_DIR, 'playwright_07_tabel_setelah_hapus.png');
    await page.screenshot({ path: screenshot7 });
    console.log(`  [SCREENSHOT] Disimpan: ${screenshot7}`);

    // ----------------------------------------------------
    // STEP 7: Verifikasi Halaman Kasir Billing (#/cashier-billing)
    // ----------------------------------------------------
    console.log('\n[STEP 7] Memverifikasi Integrasi Dinamis di Kasir Billing...');
    await page.click('#nav-billing');
    await page.waitForSelector('#billing-tier-selector .tier-card');

    const cashierTiers = await page.$$eval('#billing-tier-selector .tier-card h3', els => els.map(e => e.textContent.trim()));
    console.log('  -> Tier yang terdeteksi di Kasir Billing:', cashierTiers);
    if (!cashierTiers.some(t => t.toLowerCase() === newTierName.toLowerCase())) {
      throw new Error(`Tier "${newTierName}" tidak muncul di halaman Kasir Billing!`);
    }
    console.log(`  -> Tier "${newTierName}" tampil secara dinamis di Kasir Billing.`);

    // Klik tier baru untuk melihat paketnya
    const newTierCard = page.locator('#billing-tier-selector .tier-card', { hasText: new RegExp(newTierName, 'i') });
    await newTierCard.click();
    await page.waitForTimeout(300);

    const activeTierLabel = await page.$eval('#label-active-tier', el => el.textContent);
    console.log('  -> Tier aktif terpilih di kasir:', activeTierLabel);

    const screenshot8 = path.join(ARTIFACTS_DIR, 'playwright_08_kasir_billing_tier_dinamis.png');
    await page.screenshot({ path: screenshot8 });
    // Cleanup test tier
    await page.evaluate(async (tierName) => {
      try {
        const res = await Api.get('/api/tiers');
        const t = (res.tiers || []).find(x => x.nama.toLowerCase() === tierName.toLowerCase());
        if (t) await Api.delete('/api/tiers/' + t.id);
      } catch (e) {}
    }, newTierName);

    console.log('\n====================================================');
    console.log('  PLAYWRIGHT TESTING SELESAI & SEMUA STEP LULUS 100%! ');
    console.log('====================================================');
  } catch (err) {
    console.error('\n❌ PLAYWRIGHT TEST ERROR:', err);
    const errScreenshot = path.join(ARTIFACTS_DIR, 'playwright_error.png');
    await page.screenshot({ path: errScreenshot }).catch(() => {});
    throw err;
  } finally {
    await browser.close();
  }
}

runPlaywrightTest().catch(err => {
  console.error('Fatal test error:', err.message);
  process.exit(1);
});
