const http = require('http');

function makeRequest(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const options = {
      hostname: '127.0.0.1',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (e) => reject(e));
    if (postData) req.write(postData);
    req.end();
  });
}

async function runPermissionTests() {
  console.log('===========================================================');
  console.log('🧪 TESTING ROLE & PERMISSION MATRIX FOR LAKSAMANA.ID');
  console.log('===========================================================');

  let results = [];

  // 1. Test Super Admin Login
  let superAdminToken = null;
  try {
    const loginRes = await makeRequest('/api/auth/login', 'POST', {
      email: 'Lesmana.pta@gmail.com',
      password: 'Manto1909@'
    });
    if (loginRes.status === 200 && loginRes.data.user.role === 'superadmin') {
      superAdminToken = loginRes.data.token;
      results.push({ test: '1. Super Admin Authentication', status: 'PASS', details: 'Role: superadmin' });
    } else {
      results.push({ test: '1. Super Admin Authentication', status: 'FAIL', details: JSON.stringify(loginRes.data) });
    }
  } catch (e) {
    results.push({ test: '1. Super Admin Authentication', status: 'FAIL', details: e.message });
  }

  // 2. Test Regular User Login
  let userToken = null;
  try {
    const userLoginRes = await makeRequest('/api/auth/login', 'POST', {
      email: 'sumantolesmana1909@gmail.com',
      password: 'Manto1909'
    });
    if (userLoginRes.status === 200 && userLoginRes.data.user.role === 'user') {
      userToken = userLoginRes.data.token;
      results.push({ test: '2. Regular User Authentication', status: 'PASS', details: 'Role: user' });
    } else {
      results.push({ test: '2. Regular User Authentication', status: 'FAIL', details: JSON.stringify(userLoginRes.data) });
    }
  } catch (e) {
    results.push({ test: '2. Regular User Authentication', status: 'FAIL', details: e.message });
  }

  // 3. Test Super Admin Access to Admin APIs
  try {
    const adminOrdersRes = await makeRequest('/api/admin/orders', 'GET', null, superAdminToken);
    if (adminOrdersRes.status === 200 && Array.isArray(adminOrdersRes.data.orders)) {
      results.push({ test: '3. Super Admin Access to GET /api/admin/orders', status: 'PASS', details: `Fetched ${adminOrdersRes.data.orders.length} orders` });
    } else {
      results.push({ test: '3. Super Admin Access to GET /api/admin/orders', status: 'FAIL', details: JSON.stringify(adminOrdersRes.data) });
    }
  } catch (e) {
    results.push({ test: '3. Super Admin Access to GET /api/admin/orders', status: 'FAIL', details: e.message });
  }

  // 4. Test Super Admin Access to Admin Users List
  try {
    const adminUsersRes = await makeRequest('/api/admin/users', 'GET', null, superAdminToken);
    if (adminUsersRes.status === 200 && Array.isArray(adminUsersRes.data.users)) {
      results.push({ test: '4. Super Admin Access to GET /api/admin/users', status: 'PASS', details: `Fetched ${adminUsersRes.data.users.length} users` });
    } else {
      results.push({ test: '4. Super Admin Access to GET /api/admin/users', status: 'FAIL', details: JSON.stringify(adminUsersRes.data) });
    }
  } catch (e) {
    results.push({ test: '4. Super Admin Access to GET /api/admin/users', status: 'FAIL', details: e.message });
  }

  // 5. Test Regular User Profile Endpoint
  try {
    const meRes = await makeRequest('/api/auth/me', 'GET', null, userToken);
    if (meRes.status === 200 && meRes.data.user.role === 'user') {
      results.push({ test: '5. Regular User Profile (GET /api/auth/me)', status: 'PASS', details: `Email: ${meRes.data.user.email}` });
    } else {
      results.push({ test: '5. Regular User Profile (GET /api/auth/me)', status: 'FAIL', details: JSON.stringify(meRes.data) });
    }
  } catch (e) {
    results.push({ test: '5. Regular User Profile (GET /api/auth/me)', status: 'FAIL', details: e.message });
  }

  // 6. Test Regular User Access to Token List
  try {
    const myTokensRes = await makeRequest('/api/auth/my-tokens?email=sumantolesmana1909@gmail.com', 'GET', null, userToken);
    if (myTokensRes.status === 200 && Array.isArray(myTokensRes.data.tokens)) {
      results.push({ test: '6. Regular User Token List (GET /api/auth/my-tokens)', status: 'PASS', details: `Fetched ${myTokensRes.data.tokens.length} tokens` });
    } else {
      results.push({ test: '6. Regular User Token List (GET /api/auth/my-tokens)', status: 'FAIL', details: JSON.stringify(myTokensRes.data) });
    }
  } catch (e) {
    results.push({ test: '6. Regular User Token List (GET /api/auth/my-tokens)', status: 'FAIL', details: e.message });
  }

  // 7. Test Regular User Access to Order History
  try {
    const myOrdersRes = await makeRequest('/api/orders/my-orders?email=sumantolesmana1909@gmail.com', 'GET', null, userToken);
    if (myOrdersRes.status === 200 && Array.isArray(myOrdersRes.data.orders)) {
      results.push({ test: '7. Regular User Order History (GET /api/orders/my-orders)', status: 'PASS', details: `Fetched ${myOrdersRes.data.orders.length} orders` });
    } else {
      results.push({ test: '7. Regular User Order History (GET /api/orders/my-orders)', status: 'FAIL', details: JSON.stringify(myOrdersRes.data) });
    }
  } catch (e) {
    results.push({ test: '7. Regular User Order History (GET /api/orders/my-orders)', status: 'FAIL', details: e.message });
  }

  // 8. Test Public Health Endpoint
  try {
    const healthRes = await makeRequest('/api/health', 'GET');
    if (healthRes.status === 200 && healthRes.data.status === 'OK') {
      results.push({ test: '8. Public Health Endpoint (GET /api/health)', status: 'PASS', details: `System Status: ${healthRes.data.status}` });
    } else {
      results.push({ test: '8. Public Health Endpoint (GET /api/health)', status: 'FAIL', details: JSON.stringify(healthRes.data) });
    }
  } catch (e) {
    results.push({ test: '8. Public Health Endpoint (GET /api/health)', status: 'FAIL', details: e.message });
  }

  console.log('\n===========================================================');
  console.log('📊 PERMISSION TESTING RESULTS SUMMARY:');
  console.log('===========================================================');
  let passedCount = 0;
  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} [${r.status}] ${r.test} - ${r.details}`);
    if (r.status === 'PASS') passedCount++;
  });

  console.log('===========================================================');
  console.log(`🎉 OVERALL SCORE: ${passedCount} / ${results.length} PASSED (${Math.round(passedCount/results.length*100)}%)`);
  console.log('===========================================================');
}

runPermissionTests();
