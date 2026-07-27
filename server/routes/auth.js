const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getPool } = require('../config/database');
const { sendWhatsAppMessage } = require('../services/whatsappService');

const JWT_SECRET = process.env.JWT_SECRET || 'laksamana_super_secret_jwt_key_2026';
const ADMIN_WA_NUMBER = '08117676477';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, whatsapp } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nama, email, dan password wajib diisi' });
  }

  try {
    const db = getPool();
    const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email sudah terdaftar di sistem Laksamana' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const userId = `usr_${Date.now()}`;
    const verificationCode = `V-${Math.floor(100000 + Math.random() * 900000)}`;

    await db.query(
      'INSERT INTO users (id, name, email, password, whatsapp, role, tokens, is_verified, verification_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, name, email, hashedPassword, whatsapp || '', 'user', 1, 1, verificationCode]
    );

    // Auto-associate previous guest orders matching this WhatsApp number to the new user email
    if (whatsapp) {
      await db.query('UPDATE orders SET email = ? WHERE whatsapp = ? OR whatsapp LIKE ?', [email, whatsapp, `%${whatsapp.slice(-8)}%`]);
    }

    // Send Admin WA Notification
    const adminNotificationMessage = `📢 *PENDAFTARAN AKUN BARU LAKSAMANA*\n\nPengguna baru telah mendaftar & otomatis teraktivasi:\n\n• Nama      : *${name}*\n• Email     : ${email}\n• WhatsApp  : ${whatsapp || 'Tidak Diisi'}\n• Status    : ✅ AKTIF OTOMATIS\n\n🌐 *Buka Beranda/Admin Laksamana:*\n${CLIENT_URL}`;
    await sendWhatsAppMessage(ADMIN_WA_NUMBER, adminNotificationMessage);

    // Send Welcome WA Notification
    if (whatsapp) {
      const userWelcomeMessage = `🎉 *SELAMAT DATANG DI LAKSAMANA.ID!*\n\nHalo *${name}*,\n\nAkun Laksamana Anda (*${email}*) telah sukses teraktivasi!\n\nSeluruh riwayat pesanan yang dibuat dengan nomor WhatsApp ini telah otomatis terhubung ke akun Anda.\n\nKlik tautan di bawah ini untuk langsung kembali ke Beranda & mulai cek dokumen:\n🌐 ${CLIENT_URL}\n\nTerima kasih dan selamat menggunakan layanan Laksamana.id!`;
      await sendWhatsAppMessage(whatsapp, userWelcomeMessage);
    }

    let formattedAdminNo = ADMIN_WA_NUMBER.replace(/\D/g, '');
    if (formattedAdminNo.startsWith('0')) formattedAdminNo = '62' + formattedAdminNo.slice(1);
    const userWaText = encodeURIComponent(`Halo Admin Laksamana, akun saya (${name} - ${email}) sudah terdaftar!\n\nLink Beranda: ${CLIENT_URL}\n\nTerima kasih!`);
    const redirectWaUrl = `https://wa.me/${formattedAdminNo}?text=${userWaText}`;

    const token = jwt.sign({ id: userId, email, name, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Pendaftaran & Aktivasi Akun Otomatis Berhasil!',
      token,
      requiresVerification: false,
      redirectWaUrl,
      clientUrl: CLIENT_URL,
      user: { id: userId, name, email, whatsapp: whatsapp || '', role: 'user', tokens: 1, isVerified: 1 }
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal meregistrasi pengguna: ' + err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const db = getPool();
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    const user = users[0];

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role || 'user' }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login Laksamana berhasil',
      token,
      user: { id: user.id, name: user.name, email: user.email, whatsapp: user.whatsapp, role: user.role || 'user', tokens: user.tokens, isVerified: user.is_verified }
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal melakukan login: ' + err.message });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token tidak tersedia' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = getPool();
    const [users] = await db.query('SELECT id, name, email, whatsapp, role, tokens, is_verified FROM users WHERE id = ?', [decoded.id]);

    if (users.length === 0) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });

    const user = users[0];
    res.json({
      user: { id: user.id, name: user.name, email: user.email, whatsapp: user.whatsapp, role: user.role || 'user', tokens: user.tokens, isVerified: user.is_verified }
    });
  } catch (err) {
    res.status(401).json({ error: 'Token kedaluwarsa atau tidak valid' });
  }
});

module.exports = router;
