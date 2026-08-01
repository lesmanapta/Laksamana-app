const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Config file path - stored in server directory, persists across restarts
const CONFIG_FILE = path.join(__dirname, '..', 'config', 'system_settings.json');

// Ensure config directory exists
const configDir = path.join(__dirname, '..', 'config');
if (!fs.existsSync(configDir)) {
  try { fs.mkdirSync(configDir, { recursive: true }); } catch (e) {}
}

const DEFAULT_SETTINGS = {
  manual_payment_enabled: 'true',
  manual_wa_number: '08117676477',
  manual_account_name: 'Sumanto Lesmana Putra',
  manual_ewallet_number: '08117676477',
  manual_ewallet_types: 'DANA, GoPay, OVO, ShopeePay',
  manual_qris_url: '',
  manual_qris_info: 'Scan QRIS Manual Laksamana lalu kirimkan bukti transfer ke WhatsApp 08117676477.',
  wa_gateway_token: process.env.WA_GATEWAY_TOKEN || '',
  wa_gateway_url: process.env.WA_GATEWAY_URL || 'https://api.fonnte.com/send',
  wa_admin_number: process.env.ADMIN_WA || '08117676477',
  wa_gateway_enabled: 'true',
  turnitin_email: process.env.TURNITIN_EMAIL || '',
  turnitin_password: process.env.TURNITIN_PASSWORD || '',
  turnitin_class_id: process.env.TURNITIN_CLASS_ID || '',
  turnitin_enrollment_key: process.env.TURNITIN_ENROLLMENT_KEY || '',
  turnitin_auto_check: 'true',
  drillbit_user: process.env.DRILLBIT_USER || '',
  drillbit_pass: process.env.DRILLBIT_PASS || '',
  drillbit_url: process.env.DRILLBIT_URL || 'https://online.drillbitplagiarismcheck.com/user/files',
  drillbit_auto_check: 'true',
  midtrans_merchant_id: process.env.MIDTRANS_MERCHANT_ID || 'G159494348',
  midtrans_server_key: process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-WfiGS2ZDUkYivS7FBUPQPAMr',
  midtrans_client_key: process.env.MIDTRANS_CLIENT_KEY || 'SB-Mid-client-6sGTeuzOa30cjfgw',
  midtrans_is_production: process.env.MIDTRANS_IS_PRODUCTION || 'false'
};

function readSettings() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('[SETTINGS] Could not read config file, using defaults:', e.message);
  }
  return { ...DEFAULT_SETTINGS };
}

function writeSettings(settings) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(settings, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('[SETTINGS] Could not write config file:', e.message);
    return false;
  }
}

// Also try to sync with MySQL if available
async function syncToDatabase(settings) {
  try {
    let getPool;
    try { getPool = require('../config/database').getPool; } catch (e) { return; }
    const db = getPool();
    await db.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value TEXT NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    for (const [key, val] of Object.entries(settings)) {
      if (val !== undefined && val !== null) {
        await db.query(
          'REPLACE INTO system_settings (setting_key, setting_value) VALUES (?, ?)',
          [key, String(val)]
        );
      }
    }
  } catch (e) {
    // Silently ignore DB errors - file is the primary store
  }
}

// GET /api/admin/settings
router.get('/', (req, res) => {
  try {
    const settings = readSettings();
    return res.status(200).json({ success: true, settings });
  } catch (err) {
    return res.status(200).json({ success: false, error: err.message, settings: DEFAULT_SETTINGS });
  }
});

// POST /api/admin/settings
router.post('/', async (req, res) => {
  const { settings } = req.body || {};
  if (!settings || typeof settings !== 'object') {
    return res.status(200).json({ success: false, error: 'Settings object required' });
  }
  try {
    const current = readSettings();
    const merged = { ...current, ...settings };
    const saved = writeSettings(merged);
    // Try to sync to MySQL in background (non-blocking)
    syncToDatabase(merged).catch(() => {});
    if (saved) {
      return res.status(200).json({ success: true, message: 'Pengaturan & credentials akun berhasil disimpan!' });
    } else {
      return res.status(200).json({ success: false, error: 'Gagal menyimpan ke file konfigurasi. Periksa izin folder server/config/' });
    }
  } catch (err) {
    return res.status(200).json({ success: false, error: 'Gagal menyimpan pengaturan: ' + err.message });
  }
});

module.exports = router;
