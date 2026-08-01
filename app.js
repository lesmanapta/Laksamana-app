// Laksamana App - cPanel Entry Point
const path = require('path');

// Ensure Node.js searches both root node_modules and server/node_modules
module.paths.push(path.join(__dirname, 'node_modules'));
module.paths.push(path.join(__dirname, 'server', 'node_modules'));

// Load .env from server folder if it exists there
const dotenvPath = path.join(__dirname, 'server', '.env');
try {
  require('dotenv').config({ path: dotenvPath });
} catch (e) {}
try {
  require('dotenv').config();
} catch (e) {}

// Start the Express server
const express = require('express');
const cors = require('cors');
const fs = require('fs');

const { initDatabase } = require('./server/config/database');
const authRoutes = require('./server/routes/auth');
const servicesRoutes = require('./server/routes/services');
const ordersRoutes = require('./server/routes/orders');
const adminRoutes = require('./server/routes/admin');
const settingsRoutes = require('./server/routes/settings');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'server/uploads')));

// Dedicated settings route (Must be mounted BEFORE adminRoutes to prevent 404 falling through)
app.use('/api/admin/settings', settingsRoutes);
app.get('/api/admin/settings', async (req, res) => {
  try {
    let getPool;
    try {
      getPool = require('./server/config/database').getPool;
    } catch (e) {
      getPool = require('./config/database').getPool;
    }
    const db = getPool();
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS system_settings (
          setting_key VARCHAR(100) PRIMARY KEY,
          setting_value TEXT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    } catch (e) {}

    const [rows] = await db.query('SELECT setting_key, setting_value FROM system_settings');
    const settings = {
      manual_payment_enabled: 'true',
      manual_wa_number: '08117676477',
      manual_account_name: 'Sumanto Lesmana Putra',
      manual_ewallet_number: '08117676477',
      manual_ewallet_types: 'DANA, GoPay, OVO, ShopeePay',
      manual_qris_url: '',
      manual_qris_info: 'Scan QRIS Manual Laksamana lalu kirimkan bukti transfer ke WhatsApp 08117676477.',
      wa_gateway_token: '',
      wa_gateway_url: 'https://api.fonnte.com/send',
      wa_admin_number: '08117676477',
      wa_gateway_enabled: 'true',
      turnitin_email: '',
      turnitin_password: '',
      turnitin_class_id: '',
      turnitin_enrollment_key: '',
      turnitin_auto_check: 'true',
      drillbit_user: '',
      drillbit_pass: '',
      drillbit_url: 'https://online.drillbitplagiarismcheck.com/user/files',
      drillbit_auto_check: 'true',
      midtrans_merchant_id: 'G159494348',
      midtrans_server_key: 'SB-Mid-server-WfiGS2ZDUkYivS7FBUPQPAMr',
      midtrans_client_key: 'SB-Mid-client-6sGTeuzOa30cjfgw',
      midtrans_is_production: 'false'
    };

    if (Array.isArray(rows)) {
      rows.forEach(r => { 
        if (r.setting_key && r.setting_value !== undefined) {
          settings[r.setting_key] = r.setting_value; 
        }
      });
    }

    res.json({ success: true, settings });
  } catch (err) {
    res.json({ success: false, error: 'Gagal mengambil pengaturan sistem: ' + err.message, settings: {} });
  }
});

app.post('/api/admin/settings', async (req, res) => {
  const { settings } = req.body || {};
  if (!settings || typeof settings !== 'object') {
    return res.json({ success: false, error: 'Settings object required' });
  }

  try {
    let getPool;
    try {
      getPool = require('./server/config/database').getPool;
    } catch (e) {
      getPool = require('./config/database').getPool;
    }
    const db = getPool();
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS system_settings (
          setting_key VARCHAR(100) PRIMARY KEY,
          setting_value TEXT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    } catch (e) {}

    for (const [key, val] of Object.entries(settings)) {
      if (val !== undefined && val !== null) {
        await db.query(`
          REPLACE INTO system_settings (setting_key, setting_value)
          VALUES (?, ?);
        `, [key, String(val)]);
      }
    }
    res.json({ success: true, message: 'Pengaturan & credentials akun berhasil disimpan ke database!' });
  } catch (err) {
    res.json({ success: false, error: 'Gagal menyimpan pengaturan: ' + err.message });
  }
});

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    system: 'Laksamana MySQL Backend Server', 
    database: process.env.DB_NAME || 'db_laksamana',
    midtransConfigured: !!process.env.MIDTRANS_SERVER_KEY,
    whatsappConfigured: !!process.env.WA_GATEWAY_TOKEN,
    time: new Date().toISOString() 
  });
});

// Serve React Frontend (client/dist)
const clientBuildPath = path.join(__dirname, 'client/dist');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));

  // All non-API routes serve the React SPA
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    }
  });
}

// Initialize MySQL Database & Start Express Server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  🚀 LAKSAMANA SERVER RUNNING ON PORT: ${PORT}`);
    console.log(`  🗄️  Database: ${process.env.DB_NAME || 'db_laksamana'}`);
    console.log(`  💳 Midtrans: ${process.env.MIDTRANS_MERCHANT_ID || 'Not Set'}`);
    console.log(`  💬 WhatsApp Fonnte: ${process.env.WA_GATEWAY_TOKEN ? 'READY' : 'Not Set'}`);
    console.log(`====================================================`);
  });
});
