const express = require('express');
const router = express.Router();

let getPool;
try {
  getPool = require('../config/database').getPool;
} catch (e) {
  try {
    getPool = require('./server/config/database').getPool;
  } catch (e2) {
    getPool = require('./config/database').getPool;
  }
}

const DEFAULT_SETTINGS = {
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

async function ensureTable(db) {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value TEXT NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (e) {}
}

router.get('/', async (req, res) => {
  try {
    const db = getPool();
    await ensureTable(db);
    const [rows] = await db.query('SELECT setting_key, setting_value FROM system_settings');
    const settings = { ...DEFAULT_SETTINGS };
    if (Array.isArray(rows)) {
      rows.forEach(r => {
        if (r.setting_key && r.setting_value !== undefined) {
          settings[r.setting_key] = r.setting_value;
        }
      });
    }
    return res.json({ success: true, settings });
  } catch (err) {
    return res.json({ success: false, error: 'Gagal mengambil pengaturan: ' + err.message, settings: DEFAULT_SETTINGS });
  }
});

router.post('/', async (req, res) => {
  const { settings } = req.body || {};
  if (!settings || typeof settings !== 'object') {
    return res.json({ success: false, error: 'Settings object required' });
  }
  try {
    const db = getPool();
    await ensureTable(db);
    for (const [key, val] of Object.entries(settings)) {
      if (val !== undefined && val !== null) {
        await db.query(`
          REPLACE INTO system_settings (setting_key, setting_value)
          VALUES (?, ?);
        `, [key, String(val)]);
      }
    }
    return res.json({ success: true, message: 'Pengaturan & credentials akun berhasil disimpan ke database!' });
  } catch (err) {
    return res.json({ success: false, error: 'Gagal menyimpan pengaturan: ' + err.message });
  }
});

module.exports = router;
