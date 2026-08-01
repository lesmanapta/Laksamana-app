const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getPool } = require('../config/database');
const { sendWhatsAppMessage } = require('../services/whatsappService');

const uploadDir = path.join(__dirname, '../uploads/reports');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `Revision_${Date.now()}_${file.originalname}`)
});

const upload = multer({ storage });

// ==================== 1. ORDERS MANAGEMENT ====================
router.get('/orders', async (req, res) => {
  try {
    const db = getPool();
    const [rows] = await db.query('SELECT * FROM orders ORDER BY created_at DESC');

    const formattedOrders = rows.map(r => ({
      id: r.id,
      serviceSlug: r.service_slug,
      serviceName: r.service_name,
      fileName: r.file_name,
      filePath: r.file_path,
      plagiarismReportPath: r.plagiarism_report_path,
      fileSize: r.file_size,
      whatsapp: r.whatsapp,
      email: r.email,
      paymentMethod: r.payment_method,
      amount: r.amount,
      status: r.status,
      filterOptions: typeof r.filter_options === 'string' ? JSON.parse(r.filter_options) : (r.filter_options || {}),
      createdAt: r.created_at,
      completedAt: r.completed_at,
      adminNotes: r.admin_notes,
      result: {
        similarityIndex: r.similarity_index,
        aiScore: r.ai_score,
        pageCount: r.page_count,
        wordCount: r.word_count,
        matchedSources: typeof r.matched_sources === 'string' ? JSON.parse(r.matched_sources) : (r.matched_sources || []),
        reportDownloadUrl: r.report_download_url
      }
    }));

    res.json({ orders: formattedOrders });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil data pesanan admin: ' + err.message });
  }
});

router.delete('/orders/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const db = getPool();
    await db.query('DELETE FROM orders WHERE id = ?', [id]);
    await db.query('DELETE FROM transactions WHERE order_id = ?', [id]);
    res.json({ message: `Pesanan ${id} berhasil dihapus.` });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus pesanan: ' + err.message });
  }
});

router.post('/orders/:id/complete', upload.single('revisedDocument'), async (req, res) => {
  const { id } = req.params;
  const { similarityIndex, aiScore, adminNotes } = req.body;
  const file = req.file;

  try {
    const db = getPool();
    const [rows] = await db.query('SELECT * FROM orders WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    }

    const order = rows[0];
    const newSimScore = parseInt(similarityIndex) || order.similarity_index || 4;
    const newAIScore = parseInt(aiScore) || order.ai_score || 1;
    const reportDownloadUrl = file ? `/uploads/reports/${file.filename}` : order.report_download_url;

    await db.query(`
      UPDATE orders 
      SET status = 'COMPLETED', similarity_index = ?, ai_score = ?, report_download_url = ?, admin_notes = ?, completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newSimScore, newAIScore, reportDownloadUrl, adminNotes || 'Parafrase selesai dikerjakan.', id]);

    const host = req.get('host');
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const domainUrl = process.env.APP_URL || `${protocol}://${host}`;

    // Direct Auto-Download URL on website
    const directDownloadLink = `${domainUrl}/api/orders/download/${order.id}`;

    // Public Media Attachment URL for Fonnte WA Gateway
    const mediaAttachmentUrl = file ? `${domainUrl}${reportDownloadUrl}` : directDownloadLink;

    const waText = `*LAKSAMANA.ID - LAPORAN HASIL SELESAI* 🎉\n\nHalo, pengerjaan dokumen kamu (*${order.file_name}*) telah selesai dikerjakan!\n\n📊 *Hasil Akhir:*\n• Kode Order : *${order.id}*\n• Turnitin Similarity : *${newSimScore}%*\n• AI Content Score : *${newAIScore}%*\n\n📄 *Klik tautan di bawah ini untuk langsung mengunduh PDF Laporan Resmi:* \n${directDownloadLink}\n\nTerima kasih telah menggunakan layanan Laksamana!`;

    await sendWhatsAppMessage(order.whatsapp, waText, mediaAttachmentUrl);

    res.json({
      message: `Pesanan ${id} berhasil diselesaikan & laporan PDF dikirimkan ke WhatsApp customer!`,
      order: { ...order, status: 'COMPLETED', similarityIndex: newSimScore, aiScore: newAIScore, completedAt: new Date().toISOString(), reportDownloadUrl }
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengupdate pesanan: ' + err.message });
  }
});

// ==================== 2. SERVICES / PRODUCTS MANAGEMENT ====================
router.get('/services', async (req, res) => {
  try {
    const db = getPool();
    const [services] = await db.query('SELECT * FROM services ORDER BY created_at ASC');
    res.json({ services });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil data layanan: ' + err.message });
  }
});

router.post('/services', async (req, res) => {
  const { slug, title, subtitle, icon, price, unit, maxPages, description, active } = req.body;
  if (!slug || !title) {
    return res.status(400).json({ error: 'Slug dan Judul Wajib Diisi.' });
  }

  const serviceId = slug.toLowerCase().trim();
  const safePrice = parseInt(price) || 10000;
  const safeMaxPages = parseInt(maxPages) || 800;
  try {
    const db = getPool();
    await db.query(`
      INSERT INTO services (id, slug, title, subtitle, icon, price, unit, max_pages, description, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [serviceId, serviceId, title, subtitle || '', icon || 'ri-file-line', safePrice, unit || 'file', safeMaxPages, description || '', active ? 1 : 0]);

    res.status(201).json({ message: `Layanan ${title} berhasil ditambahkan!`, serviceId });
  } catch (err) {
    res.status(500).json({ error: 'Gagal membuat layanan: ' + err.message });
  }
});

router.put('/services/:id', async (req, res) => {
  const { id } = req.params;
  const { title, subtitle, icon, price, unit, maxPages, description, active } = req.body;

  const safePrice = parseInt(price) || 10000;
  const safeMaxPages = parseInt(maxPages) || 800;
  try {
    const db = getPool();
    await db.query(`
      UPDATE services 
      SET title = ?, subtitle = ?, icon = ?, price = ?, unit = ?, max_pages = ?, description = ?, active = ?
      WHERE id = ?
    `, [title || '', subtitle || '', icon || 'ri-file-line', safePrice, unit || 'file', safeMaxPages, description || '', active ? 1 : 0, id]);

    res.json({ message: `Layanan ${title} berhasil diperbarui!` });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengedit layanan: ' + err.message });
  }
});

router.delete('/services/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const db = getPool();
    await db.query('DELETE FROM services WHERE id = ?', [id]);
    res.json({ message: `Layanan ${id} berhasil dihapus.` });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus layanan: ' + err.message });
  }
});

// ==================== 3. PACKAGES MANAGEMENT ====================
router.get('/packages', async (req, res) => {
  try {
    const db = getPool();
    const [packages] = await db.query('SELECT * FROM packages ORDER BY price ASC');
    res.json({ packages });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil data paket: ' + err.message });
  }
});

router.post('/packages', async (req, res) => {
  const { name, validity, price, targetAudience, quota, benefits, active } = req.body;
  if (!name || !price) {
    return res.status(400).json({ error: 'Nama Paket dan Harga Wajib Diisi.' });
  }

  const pkgId = `pkg_${Date.now()}`;
  try {
    const db = getPool();
    const benefitsJson = Array.isArray(benefits) ? JSON.stringify(benefits) : (benefits || '[]');

    await db.query(`
      INSERT INTO packages (id, name, validity, price, target_audience, quota, benefits, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [pkgId, name, validity || '7 hari', parseInt(price) || 27500, targetAudience || '', parseInt(quota) || 3, benefitsJson, active ? 1 : 0]);

    res.status(201).json({ message: `Paket ${name} berhasil ditambahkan!`, pkgId });
  } catch (err) {
    res.status(500).json({ error: 'Gagal membuat paket: ' + err.message });
  }
});

router.put('/packages/:id', async (req, res) => {
  const { id } = req.params;
  const { name, validity, price, targetAudience, quota, benefits, active } = req.body;

  try {
    const db = getPool();
    const benefitsJson = Array.isArray(benefits) ? JSON.stringify(benefits) : (benefits || '[]');

    await db.query(`
      UPDATE packages 
      SET name = ?, validity = ?, price = ?, target_audience = ?, quota = ?, benefits = ?, active = ?
      WHERE id = ?
    `, [name || '', validity || '7 hari', parseInt(price) || 27500, targetAudience || '', parseInt(quota) || 3, benefitsJson, active ? 1 : 0, id]);

    res.json({ message: `Paket ${name} berhasil diperbarui!` });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengedit paket: ' + err.message });
  }
});

router.delete('/packages/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const db = getPool();
    await db.query('DELETE FROM packages WHERE id = ?', [id]);
    res.json({ message: `Paket ${id} berhasil dihapus.` });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus paket: ' + err.message });
  }
});

// ==================== 4. USERS MANAGEMENT ====================
router.get('/users', async (req, res) => {
  try {
    const db = getPool();
    const [users] = await db.query('SELECT id, name, email, whatsapp, role, tokens, is_verified, verification_code, created_at FROM users ORDER BY created_at DESC');
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil data pengguna: ' + err.message });
  }
});

router.put('/users/:id/role', async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!role || !['user', 'superadmin'].includes(role)) {
    return res.status(400).json({ error: 'Role tidak valid (user, superadmin).' });
  }

  try {
    const db = getPool();
    await db.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    res.json({ message: `Role user ${id} berhasil diubah menjadi ${role}` });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengubah role user: ' + err.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const db = getPool();
    await db.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: `Akun user ${id} berhasil dihapus.` });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus user: ' + err.message });
  }
});

router.post('/users/:id/verify', async (req, res) => {
  const { id } = req.params;
  try {
    const db = getPool();
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User tidak ditemukan' });

    const user = rows[0];
    await db.query('UPDATE users SET is_verified = 1 WHERE id = ?', [id]);

    if (user.whatsapp) {
      const waMsg = `🎉 *AKUN LAKSAMANA ANDA TELAH DIAKTIVASI!*\n\nHalo *${user.name}*,\n\nPendaftaran akun Laksamana Anda (*${user.email}*) telah sukses diverifikasi dan diaktifkan oleh Admin!\n\nSilakan login kembali di website Laksamana:\nhttp://localhost:3000\n\nTerima kasih dan selamat menggunakan layanan Laksamana!`;
      await sendWhatsAppMessage(user.whatsapp, waMsg);
    }

    res.json({ message: `Akun ${user.email} berhasil diaktivasi & notifikasi WA telah dikirimkan!`, userId: id });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengaktivasi user: ' + err.message });
  }
});

// ==================== 5. TOKENS & COUPONS MANAGEMENT ====================
router.get('/tokens', async (req, res) => {
  try {
    const db = getPool();
    const [tokens] = await db.query('SELECT * FROM package_tokens ORDER BY created_at DESC');
    res.json({ tokens });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil data token: ' + err.message });
  }
});

router.post('/tokens/generate', async (req, res) => {
  const { customCode, packageName, quotaTotal, whatsapp, userEmail } = req.body;
  const tokenCode = customCode ? customCode.trim().toUpperCase() : `LKS-PKG-${Math.floor(100000 + Math.random() * 900000)}`;
  const quota = parseInt(quotaTotal) || 3;

  try {
    const db = getPool();
    await db.query(`
      INSERT INTO package_tokens (token_code, package_id, package_name, user_email, whatsapp, quota_total, quota_remaining, status)
      VALUES (?, 'custom_pkg', ?, ?, ?, ?, ?, 'ACTIVE')
    `, [tokenCode, packageName || 'Token Admin Custom', userEmail || '', whatsapp || '', quota, quota]);

    if (whatsapp) {
      const waMsg = `🎟️ *KODE TOKEN / KUPON PAKET LAKSAMANA*\n\nHalo, Anda telah mendapatkan Kode Token Paket Laksamana:\n\n• Kode Token : \`${tokenCode}\`\n• Nama Paket : *${packageName || 'Token Admin Custom'}*\n• Kuota Cek : *${quota}x Cek Plagiasi*\n\nGunakan Kode Token ini saat checkout order di website Laksamana untuk *Skip Pembayaran*!\n🌐 http://localhost:3000`;
      await sendWhatsAppMessage(whatsapp, waMsg);
    }

    res.status(201).json({
      message: `Token ${tokenCode} berhasil diterbitkan (${quota}x kuota)!`,
      tokenCode,
      quota
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menerbitkan token: ' + err.message });
  }
});

router.delete('/tokens/:code', async (req, res) => {
  const { code } = req.params;
  try {
    const db = getPool();
    await db.query('DELETE FROM package_tokens WHERE UPPER(token_code) = ?', [code.toUpperCase()]);
    res.json({ message: `Token ${code} berhasil dihapus/dibatalkan.` });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus token: ' + err.message });
  }
});

module.exports = router;
