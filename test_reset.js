const http = require('http');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch (e) { parsed = data; }
        resolve({ status: res.statusCode, headers: res.headers, data: parsed });
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runResetTest() {
  console.log('--- TESTING RESET STATS & SHIFT AUDIT ---');

  // 1. Operator attempts to reset
  const opLogin = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'agil', password: 'agil123' });

  const opCookie = opLogin.headers['set-cookie'][0].split(';')[0];

  const opReset = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/reports/reset',
    method: 'POST',
    headers: { 'Cookie': opCookie }
  });

  console.log('[1] Operator attempt to reset reports: Status', opReset.status, opReset.data);
  if (opReset.status !== 403) throw new Error('Operator should be forbidden (403)');

  // 2. Admin attempts to reset
  const adminLogin = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'admin', password: 'admin123' });

  const adminCookie = adminLogin.headers['set-cookie'][0].split(';')[0];

  const adminReset = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/reports/reset',
    method: 'POST',
    headers: { 'Cookie': adminCookie }
  });

  console.log('[2] Admin reset reports: Status', adminReset.status, adminReset.data);
  if (adminReset.status !== 200) throw new Error('Admin reset failed');

  // 3. Verify summary stats
  const sumRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/reports/summary',
    method: 'GET',
    headers: { 'Cookie': adminCookie }
  });

  console.log('[3] Reports summary after reset:', sumRes.data);
  if (sumRes.data.total_pendapatan !== 0 || sumRes.data.total_transaksi !== 0) {
    throw new Error('Summary stats should be 0');
  }

  // 4. Verify shifts audit
  const shiftsRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/reports/shifts',
    method: 'GET',
    headers: { 'Cookie': adminCookie }
  });

  console.log('[4] Shifts audit count after reset:', shiftsRes.data.shifts.length);
  if (shiftsRes.data.shifts.length !== 0) {
    throw new Error('Shifts audit should be empty');
  }

  // 5. Verify master products still exist
  const prodRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/products',
    method: 'GET',
    headers: { 'Cookie': adminCookie }
  });

  console.log('[5] Products count after reset:', prodRes.data.products.length);
  if (prodRes.data.products.length < 10) {
    throw new Error('Products should not be deleted');
  }

  // 6. Test opening a new shift to see ID sequence restart from 1
  const newShiftRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/shifts/open',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': opCookie }
  }, { saldo_awal: 150000 });

  console.log('[6] New Shift after sequence reset:', newShiftRes.data.shift);
  if (newShiftRes.data.shift.id !== 1) {
    console.log('Notice: New shift ID is', newShiftRes.data.shift.id);
  } else {
    console.log('New Shift ID successfully restarted at #SHIFT-1!');
  }

  console.log('\n>>> RESET FEATURE VERIFIED SUCCESSFULLY! <<<');
}

runResetTest().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
