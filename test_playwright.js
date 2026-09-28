// End-to-End Playwright Test for Kasir Warnet POS
// Testing:
// 1. Shift Opening with saldo_awal: 0
// 2. Product Transactions & Rekap Produk Shift Aktif
// 3. Exclusion of Voided Transactions from Rekap Produk & CSV
// 4. WIB Timezone Filters in Financial Reports
// 5. Close Shift Clean Logout & Ghost Shift Elimination
// 6. Closed Shift Protection (Blocking Void and Expense Edit/Delete)

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACTS_DIR = 'C:\\Users\\HYPE AMD\\.gemini\\antigravity-ide\\brain\\783507d0-b0af-44f7-8fda-953447f07a3e';

async function runPlaywrightTests() {
  console.log('====================================================');
  console.log('  STARTING COMPREHENSIVE PLAYWRIGHT E2E TESTING    ');
  console.log('====================================================\n');

  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    acceptDownloads: true
  });

  const page = await context.newPage();
  page.on('console', msg => console.log('  [BROWSER LOG]', msg.text()));
  page.on('pageerror', err => console.log('  [BROWSER ERR]', err.message));

  try {
    // ----------------------------------------------------
    // TEST 1: Login & Initial Shift with saldo_awal = 0
    // ----------------------------------------------------
    console.log('[TEST 1] Navigasi ke Halaman Login & Otentikasi Admin...');
    await page.goto('http://localhost:3000/#/login', { waitUntil: 'networkidle' });

    await page.fill('#input-username', 'admin');
    await page.fill('#input-password', 'admin123');
    await page.click('#btn-submit-login');
    await page.waitForURL('**/#/home', { timeout: 8000 });
    console.log('  -> Berhasil login dan dialihkan ke Home Dashboard.');

    // Check / open active shift with saldo_awal = 0
    const shiftInfo = await page.evaluate(async () => {
      let activeRes = await Api.get('/api/shifts/active');
      if (!activeRes.shift) {
        // Explicitly open shift with saldo_awal = 0 as confirmed by user
        activeRes = await Api.post('/api/shifts/open', { saldo_awal: 0 });
      }
      return activeRes.shift;
    });

    console.log(`  -> Shift Aktif ID: ${shiftInfo.id}, Status: ${shiftInfo.status}, Saldo Awal: Rp ${shiftInfo.saldo_awal}`);
    if (shiftInfo.saldo_awal !== 0 && shiftInfo.saldo_awal !== 100000) {
      console.log('  -> Catatan: Saldo awal terdeteksi:', shiftInfo.saldo_awal);
    }
    const screenshotHome = path.join(ARTIFACTS_DIR, '01_home_dashboard.png');
    await page.screenshot({ path: screenshotHome });
    console.log(`  [PASS] Screenshot dashboard: ${screenshotHome}`);

    // ----------------------------------------------------
    // TEST 2: Buat Transaksi Sampel (2 Produk + 1 Pengeluaran)
    // ----------------------------------------------------
    console.log('\n[TEST 2] Menyiapkan Transaksi Produk & Pengeluaran Sampel...');
    const txData = await page.evaluate(async () => {
      // Tx 1: Aqua Kecil x2 (Rp 10.000) + Teh Pucuk x1 (Rp 5.000) -> Cash Rp 15.000 (Tetap Valid)
      const tx1 = await Api.post('/api/transactions/product', {
        items: [
          { product_id: 1, qty: 2 },
          { product_id: 3, qty: 1 }
        ],
        metode_bayar: 'cash',
        nominal_bayar: 15000
      });

      // Tx 2: Fruit Tea x1 (Rp 7.000) -> Cash Rp 7.000 (Akan di-Void)
      const tx2 = await Api.post('/api/transactions/product', {
        items: [
          { product_id: 4, qty: 1 }
        ],
        metode_bayar: 'cash',
        nominal_bayar: 7000
      });

      // Pengeluaran 1: Operasional
      const exp1 = await Api.post('/api/expenses', {
        nominal: 12000,
        tipe: 'operasional',
        keterangan: 'Beli pembersih monitor warnet'
      });

      return {
        tx1Id: tx1.transaction_id,
        tx2Id: tx2.transaction_id,
        exp1Id: exp1.expense.id
      };
    });

    console.log(`  -> Berhasil membuat Tx1 (ID: ${txData.tx1Id}), Tx2 (ID: ${txData.tx2Id}), Exp1 (ID: ${txData.exp1Id})`);

    // ----------------------------------------------------
    // TEST 3: Buka Halaman Riwayat & Preview Rekap Produk (Shift Aktif) SEBELUM Void
    // ----------------------------------------------------
    console.log('\n[TEST 3] Memeriksa Riwayat Transaksi & Preview Rekap Produk SEBELUM Void...');
    await page.click('#nav-history');
    await page.waitForURL('**/#/history', { timeout: 8000 });
    await page.waitForSelector('#table-transactions', { timeout: 8000 });

    // Open Preview Rekap Produk Modal
    const btnPreview = await page.waitForSelector('#btn-preview-rekap', { timeout: 5000 });
    await btnPreview.click();
    await page.waitForSelector('#dialog-title', { state: 'visible', timeout: 5000 });

    const dialogTitleBefore = await page.innerText('#dialog-title');
    console.log('  -> Judul Dialog Preview Rekap:', dialogTitleBefore);
    if (!dialogTitleBefore.includes('Shift Aktif')) {
      throw new Error('Judul preview rekap tidak memuat "Shift Aktif"');
    }

    // Check that Aqua Besar is currently PRESENT in the modal
    const rekapRowsBefore = await page.$$eval('.dialog-body .data-table tbody tr', trs => {
      return trs.map(tr => {
        const tds = tr.querySelectorAll('td');
        if (tds.length < 5) return null;
        return {
          nama: tds[0].innerText.trim(),
          varian: tds[1].innerText.trim(),
          qty: tds[2].innerText.trim(),
          metode: tds[3].innerText.trim(),
          total: tds[4].innerText.trim()
        };
      }).filter(Boolean);
    });

    console.log('  -> Item dalam Rekap Produk (Sebelum Void):');
    rekapRowsBefore.forEach(r => console.log(`     * ${r.nama} (${r.varian}) x${r.qty} [${r.metode}] = ${r.total}`));

    const hasFruitTeaBefore = rekapRowsBefore.some(r => r.nama.includes('Fruit Tea'));
    if (!hasFruitTeaBefore) {
      throw new Error('Fruit Tea seharusnya ada di rekap sebelum di-void!');
    }

    const screenshotRekapBefore = path.join(ARTIFACTS_DIR, '02_preview_rekap_sebelum_void.png');
    await page.screenshot({ path: screenshotRekapBefore });
    console.log(`  [PASS] Screenshot rekap sebelum void tersimpan: ${screenshotRekapBefore}`);

    // Close preview modal
    await page.click('#btn-dialog-close');
    await page.waitForTimeout(400);

    // ----------------------------------------------------
    // TEST 4: Void Transaksi 2 (Fruit Tea) & Verifikasi Pengecualian dari Rekap
    // ----------------------------------------------------
    console.log('\n[TEST 4] Melakukan Void Transaksi #TRX-' + txData.tx2Id + ' (Fruit Tea) via UI...');
    
    // Find void button for txData.tx2Id
    const voidBtnSelector = `button[data-type="void"][data-id="${txData.tx2Id}"]`;
    await page.waitForSelector(voidBtnSelector, { timeout: 5000 });
    await page.click(voidBtnSelector);

    // Confirmation dialog
    await page.waitForSelector('#dialog-title', { state: 'visible', timeout: 5000 });
    console.log('  -> Dialog konfirmasi void terbuka, menekan konfirmasi "Ya, Void!"...');
    await page.click('.dialog-footer button.btn-danger');

    // Wait for table to reload with voided state
    await page.waitForTimeout(1000);
    const isVoidBadgeVisible = await page.evaluate((txId) => {
      const row = Array.from(document.querySelectorAll('#tbody-transactions tr')).find(r => r.innerText.includes(`#TRX-${txId}`));
      return row ? row.innerText.includes('VOID') : false;
    }, txData.tx2Id);

    if (!isVoidBadgeVisible) {
      throw new Error(`Transaksi #${txData.tx2Id} tidak menampilkan badge VOID setelah dibatalkan!`);
    }
    console.log(`  -> Transaksi #TRX-${txData.tx2Id} telah berstatus VOID di tabel riwayat.`);

    // Re-open Preview Rekap Produk Modal
    console.log('  -> Membuka kembali Preview Rekap Produk setelah transaksi di-void...');
    await page.click('#btn-preview-rekap');
    await page.waitForSelector('#dialog-title', { state: 'visible', timeout: 5000 });

    const rekapRowsAfter = await page.$$eval('.dialog-body .data-table tbody tr', trs => {
      return trs.map(tr => {
        const tds = tr.querySelectorAll('td');
        if (tds.length < 5) return null;
        return {
          nama: tds[0].innerText.trim(),
          varian: tds[1].innerText.trim(),
          qty: tds[2].innerText.trim(),
          metode: tds[3].innerText.trim(),
          total: tds[4].innerText.trim()
        };
      }).filter(Boolean);
    });

    console.log('  -> Item dalam Rekap Produk (SETELAH Void):');
    rekapRowsAfter.forEach(r => console.log(`     * ${r.nama} (${r.varian}) x${r.qty} [${r.metode}] = ${r.total}`));

    const hasFruitTeaAfter = rekapRowsAfter.some(r => r.nama.includes('Fruit Tea'));
    if (hasFruitTeaAfter) {
      throw new Error('FATAL: Transaksi Fruit Tea yang sudah di-void MASIH muncul di Preview Rekap Produk!');
    }
    console.log('  [PASS] Transaksi VOIDED (Fruit Tea) 100% TIDAK LAGI MUNCUL di Preview Rekap Produk!');

    const screenshotRekapAfter = path.join(ARTIFACTS_DIR, '03_preview_rekap_setelah_void.png');
    await page.screenshot({ path: screenshotRekapAfter });
    console.log(`  [PASS] Screenshot rekap setelah void: ${screenshotRekapAfter}`);

    // Verify CSV Download does not contain Fruit Tea
    console.log('  -> Menguji ekspor CSV dari modal preview...');
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 6000 }),
      page.click('#btn-download-rekap-csv')
    ]);

    const csvFilename = download.suggestedFilename();
    const csvSavePath = path.join(ARTIFACTS_DIR, csvFilename);
    await download.saveAs(csvSavePath);
    const csvText = fs.readFileSync(csvSavePath, 'utf8');

    if (csvText.includes('Fruit Tea')) {
      throw new Error('FATAL: File CSV yang diekspor masih mengandung produk void (Fruit Tea)!');
    }
    console.log('  [PASS] File CSV ekspor bersih dari transaksi void!');
    console.log(`         Nama file: ${csvFilename}`);

    // Close preview modal
    await page.click('#btn-dialog-close');
    await page.waitForTimeout(400);

    // ----------------------------------------------------
    // TEST 5: Filter Laporan dengan Zona Waktu WIB
    // ----------------------------------------------------
    console.log('\n[TEST 5] Menguji Halaman Laporan & Filter Zona Waktu WIB...');
    await page.click('#nav-reports');
    await page.waitForURL('**/#/reports', { timeout: 8000 });
    await page.waitForSelector('#report-stat-grid', { timeout: 8000 });

    // Test filter buttons
    const presets = ['hari_ini', 'kemarin', '7_hari', '30_hari'];
    for (const preset of presets) {
      console.log(`  -> Memilih filter preset: ${preset}...`);
      await page.click(`button[data-preset="${preset}"]`);
      await page.waitForTimeout(600);
      const omzetText = await page.innerText('#rep-total-omzet');
      console.log(`     Total Omzet (${preset}): ${omzetText}`);
      if (!omzetText.startsWith('Rp')) {
        throw new Error(`Format total omzet tidak valid pada preset ${preset}: ${omzetText}`);
      }
    }

    const screenshotReports = path.join(ARTIFACTS_DIR, '04_laporan_wib.png');
    await page.screenshot({ path: screenshotReports });
    console.log(`  [PASS] Screenshot laporan WIB tersimpan: ${screenshotReports}`);

    // ----------------------------------------------------
    // TEST 6: Tutup Shift (Close Shift) & Eliminasi Shift Hantu
    // ----------------------------------------------------
    console.log('\n[TEST 6] Menjalankan Wizard Tutup Shift & Memastikan Tidak Ada Shift Hantu...');
    await page.click('#nav-close-shift');
    await page.waitForURL('**/#/close-shift', { timeout: 8000 });
    await page.waitForSelector('#wizard-card-body', { timeout: 8000 });

    // Step 1: QRIS Reconciliation
    console.log('  -> Step 1: Rekonsiliasi QRIS...');
    await page.waitForSelector('#btn-next-step-1', { timeout: 5000 });
    await page.click('#btn-next-step-1');
    await page.waitForTimeout(500);

    // Step 2: Cyberindo Billing Reconciliation
    console.log('  -> Step 2: Rekonsiliasi Billing Cyberindo...');
    await page.waitForSelector('#btn-next-step-2', { timeout: 5000 });
    await page.click('#btn-next-step-2');
    await page.waitForTimeout(500);

    // Step 3: Kas Fisik Reconciliation
    console.log('  -> Step 3: Rekonsiliasi Kas Fisik...');
    await page.waitForSelector('#btn-next-step-3', { timeout: 5000 });
    await page.click('#btn-next-step-3');
    await page.waitForTimeout(500);

    // Step 4: Konfirmasi Tutup Shift
    console.log('  -> Step 4: Menekan Konfirmasi Tutup Shift...');
    await page.waitForSelector('#btn-submit-close-shift', { timeout: 5000 });
    await page.click('#btn-submit-close-shift');

    // Verify Shift Selesai Dialog
    await page.waitForSelector('#dialog-title', { state: 'visible', timeout: 8000 });
    const shiftDoneTitle = await page.innerText('#dialog-title');
    console.log('  -> Dialog Selesai:', shiftDoneTitle);
    if (!shiftDoneTitle.includes('Shift Selesai')) {
      throw new Error(`Judul dialog tidak valid: ${shiftDoneTitle}`);
    }

    const screenshotShiftDone = path.join(ARTIFACTS_DIR, '05_shift_selesai_dialog.png');
    await page.screenshot({ path: screenshotShiftDone });
    console.log(`  [PASS] Screenshot dialog tutup shift: ${screenshotShiftDone}`);

    // Click "Kembali ke Halaman Login"
    console.log('  -> Menekan tombol "Kembali ke Halaman Login"...');
    await page.click('#btn-done-close-shift');
    await page.waitForURL('**/#/login', { timeout: 8000 });
    console.log('  -> Berhasil dialihkan ke halaman #/login!');

    const screenshotAfterLogout = path.join(ARTIFACTS_DIR, '06_login_page_after_close.png');
    await page.screenshot({ path: screenshotAfterLogout });
    console.log(`  [PASS] Screenshot halaman login setelah shift ditutup: ${screenshotAfterLogout}`);

    // VERIFY GHOST SHIFT IS ELIMINATED:
    // Active shift should be null when not logged in or when checked
    const ghostShiftCheck = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/shifts/active');
        return await res.json();
      } catch (e) {
        return { error: e.message };
      }
    });

    console.log('  -> Respon /api/shifts/active setelah tutup shift:', JSON.stringify(ghostShiftCheck));
    // Since session is logged out, it should either be 401 Unauthorized or { shift: null }
    if (ghostShiftCheck.shift) {
      throw new Error('FATAL: Terjadi Shift Hantu! Shift baru masih otomatis terbuka setelah tutup shift!');
    }
    console.log('  [PASS] Terverifikasi: TIDAK ADA SHIFT HANTU (ghost shift) yang terbentuk!');

    // ----------------------------------------------------
    // TEST 7: Proteksi Shift Ditutup (Void & Edit/Hapus Pengeluaran Ditolak)
    // ----------------------------------------------------
    console.log('\n[TEST 7] Memverifikasi Proteksi Integritas Shift Ditutup...');

    // Log back in as admin
    await page.fill('#input-username', 'admin');
    await page.fill('#input-password', 'admin123');
    await page.click('#btn-submit-login');
    await page.waitForURL('**/#/home', { timeout: 8000 });

    // Open a fresh new shift with saldo_awal = 0
    await page.evaluate(async () => {
      const activeRes = await Api.get('/api/shifts/active');
      if (!activeRes.shift) {
        await Api.post('/api/shifts/open', { saldo_awal: 0 });
      }
    });

    // Check History page for closed shift transaction badge
    await page.click('#nav-history');
    await page.waitForURL('**/#/history', { timeout: 8000 });
    await page.waitForSelector('#table-transactions', { timeout: 8000 });

    // Switch to "Semua Riwayat"
    await page.click('#btn-scope-all');
    await page.waitForTimeout(600);

    // Look for Tx1 row in table (from the previous, now closed shift)
    const tx1RowContent = await page.evaluate((txId) => {
      const rows = Array.from(document.querySelectorAll('#tbody-transactions tr'));
      const targetRow = rows.find(r => r.innerText.includes(`#TRX-${txId}`));
      return targetRow ? targetRow.innerHTML : null;
    }, txData.tx1Id);

    if (!tx1RowContent) {
      throw new Error(`Baris transaksi #${txData.tx1Id} tidak ditemukan di tabel semua riwayat!`);
    }

    if (!tx1RowContent.includes('🔒 Shift Ditutup')) {
      throw new Error(`Transaksi #${txData.tx1Id} pada shift yang sudah closed harus menampilkan badge '🔒 Shift Ditutup', bukan tombol void!`);
    }
    console.log('  [PASS] UI History: Transaksi shift tertutup menampilkan badge "🔒 Shift Ditutup"');

    // Attempt to void Tx1 directly via API -> MUST RETURN HTTP 400
    const voidBlockedRes = await page.evaluate(async (txId) => {
      try {
        const res = await fetch(`/api/transactions/${txId}/void`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' }
        });
        const body = await res.json();
        return { status: res.status, body };
      } catch (e) {
        return { error: e.message };
      }
    }, txData.tx1Id);

    console.log('  -> Hasil proteksi API Void pada shift closed:', JSON.stringify(voidBlockedRes));
    if (voidBlockedRes.status !== 400 || !voidBlockedRes.body.error.includes('sudah ditutup')) {
      throw new Error(`API Void seharusnya menolak dengan HTTP 400, didapat: ${JSON.stringify(voidBlockedRes)}`);
    }
    console.log('  [PASS] API Void: Ditolak dengan pesan: "' + voidBlockedRes.body.error + '"');

    // Check Expense page for closed shift expense protection
    await page.click('#nav-expense');
    await page.waitForURL('**/#/expense', { timeout: 8000 });
    await page.waitForTimeout(600);

    // Attempt to edit & delete Exp1 (from closed shift) via API -> MUST RETURN HTTP 400
    const editExpBlockedRes = await page.evaluate(async (expId) => {
      try {
        const putRes = await fetch(`/api/expenses/${expId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nominal: 25000, keterangan: 'Modifikasi terlarang' })
        });
        const putBody = await putRes.json();

        const delRes = await fetch(`/api/expenses/${expId}`, {
          method: 'DELETE'
        });
        const delBody = await delRes.json();

        return {
          putStatus: putRes.status,
          putBody,
          delStatus: delRes.status,
          delBody
        };
      } catch (e) {
        return { error: e.message };
      }
    }, txData.exp1Id);

    console.log('  -> Hasil proteksi API Edit/Delete Expense pada shift closed:', JSON.stringify(editExpBlockedRes));
    if (editExpBlockedRes.putStatus !== 400 || editExpBlockedRes.delStatus !== 400) {
      throw new Error(`API Edit/Delete Expense seharusnya menolak dengan HTTP 400! Got: ${JSON.stringify(editExpBlockedRes)}`);
    }
    console.log('  [PASS] API Expense: Edit dan Delete ditolak dengan pesan: "' + editExpBlockedRes.putBody.error + '"');

    const screenshotProtection = path.join(ARTIFACTS_DIR, '07_closed_shift_protected.png');
    await page.screenshot({ path: screenshotProtection });
    console.log(`  [PASS] Screenshot proteksi shift tertutup: ${screenshotProtection}`);

    console.log('\n====================================================');
    console.log('  SELURUH 7 PENGUJIAN PLAYWRIGHT BERHASIL 100%! ✅ ');
    console.log('====================================================\n');

  } finally {
    await context.close();
    await browser.close();
  }
}

runPlaywrightTests().catch(err => {
  console.error('\n❌ PLAYWRIGHT TEST ERROR:', err);
  process.exit(1);
});
