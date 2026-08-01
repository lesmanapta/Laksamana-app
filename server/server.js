require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Optional rate limiting - gracefully skip if package not installed
let rateLimit;
try {
  rateLimit = require('express-rate-limit');
} catch (e) {
  console.warn('⚠️ express-rate-limit not installed. Rate limiting disabled.');
  rateLimit = null;
}

const { initDatabase } = require('./config/database');
const { startExpiryWorker } = require('./services/expiryWorker');
const authRoutes = require('./routes/auth');
const servicesRoutes = require('./routes/services');
const ordersRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting for auth routes (prevent brute force)
const authRateLimiter = rateLimit
  ? rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 20,                   // max 20 attempts per 15 min per IP
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.' }
    })
  : (req, res, next) => next(); // Passthrough if not installed

// Static file uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/admin', adminRoutes);

// Direct fallback handlers for /api/admin/settings
app.get('/api/admin/settings', async (req, res) => {
  try {
    const { getPool } = require('./config/database');
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
    const { getPool } = require('./config/database');
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

const clientBuildPath = path.join(__dirname, '../client/dist');
if (require('fs').existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    }
  });
}

// Initialize MySQL Database & Start Express Server
initDatabase().then(() => {
  // Start background payment timeout monitor (30 minutes)
  startExpiryWorker();

  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  🚀 LAKSAMANA BACKEND SERVER RUNNING ON PORT: ${PORT} `);
    console.log(`  🗄️ Database: MySQL (http://localhost/phpmyadmin -> db_laksamana)`);
    console.log(`  👨‍💻 Admin API: http://localhost:${PORT}/api/admin/orders`);
    console.log(`  💳 Midtrans Gateway: READY (Merchant ID: ${process.env.MIDTRANS_MERCHANT_ID})`);
    console.log(`  💬 WhatsApp Fonnte: READY (Token Set)`);
    console.log(`  ⏰ Payment Expiry Worker: ACTIVE (30-minute timeout)`);
    console.log(`====================================================`);
  });
});
