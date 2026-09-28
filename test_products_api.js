const http = require('http');

let adminCookie = '';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (adminCookie) headers['Cookie'] = adminCookie;
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
        adminCookie = res.headers['set-cookie'][0].split(';')[0];
      }

      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, data: json });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function verify() {
  console.log('--- VERIFYING PRODUCTS API & VARIAN FUNCTIONALITY ---');

  // 1. Admin login
  const login = await request('POST', '/api/auth/login', { username: 'admin', password: 'admin123' });
  console.log('[1] Login Admin:', login.status, login.data.user.nama);
  if (login.status !== 200) throw new Error('Login failed');

  // 2. Fetch all products
  const allProds = await request('GET', '/api/products');
  console.log(`[2] Total Products: ${allProds.data.products.length}`);
  if (allProds.data.products.length !== 38) throw new Error('Expected 38 products');

  // 3. Filter by Minuman
  const minuman = await request('GET', '/api/products?kategori=Minuman');
  console.log(`[3] Category Minuman count: ${minuman.data.products.length}`);
  if (minuman.data.products.length !== 13) throw new Error('Expected 13 Minuman products');

  // 4. Filter by Makanan
  const makanan = await request('GET', '/api/products?kategori=Makanan');
  console.log(`[4] Category Makanan count: ${makanan.data.products.length}`);
  if (makanan.data.products.length !== 22) throw new Error('Expected 22 Makanan products');

  // 5. Filter by Rokok
  const rokok = await request('GET', '/api/products?kategori=Rokok');
  console.log(`[5] Category Rokok count: ${rokok.data.products.length}`);
  if (rokok.data.products.length !== 3) throw new Error('Expected 3 Rokok products');

  // 6. Search by variant (e.g. 'Apple')
  const searchVarian = await request('GET', '/api/products?search=Apple');
  console.log(`[6] Search 'Apple': found ${searchVarian.data.products.length} product ->`, searchVarian.data.products[0].nama, `(${searchVarian.data.products[0].varian})`);
  if (searchVarian.data.products.length !== 1 || searchVarian.data.products[0].varian !== 'Apple 350ml') {
    throw new Error('Search by variant failed');
  }

  // 7. Add a new product with variant
  const addRes = await request('POST', '/api/products', {
    nama: 'Kopi Good Day',
    varian: 'Mocacinno 250ml',
    kategori: 'Minuman',
    harga: 8000,
    stok: 50
  });
  console.log('[7] Add product with varian:', addRes.status, addRes.data.product.nama, addRes.data.product.varian);
  if (addRes.status !== 201) throw new Error('Add product failed');
  const newId = addRes.data.product.id;

  // 8. Update product variant
  const updateRes = await request('PUT', `/api/products/${newId}`, {
    nama: 'Kopi Good Day',
    varian: 'Carrebian Nut 250ml',
    kategori: 'Minuman',
    harga: 8500,
    stok: 45
  });
  console.log('[8] Update product varian:', updateRes.status, updateRes.data.product.varian, 'Harga:', updateRes.data.product.harga);
  if (updateRes.data.product.varian !== 'Carrebian Nut 250ml') throw new Error('Update variant failed');

  // 9. Delete test product
  const delRes = await request('DELETE', `/api/products/${newId}`);
  console.log('[9] Delete product:', delRes.status, delRes.data.message);
  if (delRes.status !== 200 || !delRes.data.deleted) throw new Error('Delete product failed');

  // 10. Re-verify total count is 38
  const finalProds = await request('GET', '/api/products');
  console.log(`[10] Final count after delete: ${finalProds.data.products.length}`);
  if (finalProds.data.products.length !== 38) throw new Error('Expected 38 products final');

  console.log('\n>>> ALL PRODUCT API AND VARIANT VERIFICATIONS PASSED! <<<');
}

verify().catch(e => {
  console.error('FAILED:', e);
  process.exit(1);
});
