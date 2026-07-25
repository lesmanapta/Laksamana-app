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

// GET /api/admin/orders - Fetch all orders from MySQL database with created_at & completed_at timestamps
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
    res.status(500).json({ error: 'Gagal mengambil data pesanan admin dari MySQL: ' + err.message });
  }
});

// GET /api/admin/users - Fetch all registered users
router.get('/users', async (req, res) => {
  try {
    const db = getPool();
    const [users] = await db.query('SELECT id, name, email, whatsapp, role, tokens, is_verified, verification_code, created_at FROM users ORDER BY created_at DESC');
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil data pengguna dari MySQL: ' + err.message });
  }
});

// POST /api/admin/users/:id/verify - Admin activates user account
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

// POST /api/admin/orders/:id/complete - Admin completes order (e.g. Paraphrased document) & records completed_at timestamp
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

    // Update status to COMPLETED and set completed_at timestamp to CURRENT_TIMESTAMP
    await db.query(`
      UPDATE orders 
      SET status = 'COMPLETED', similarity_index = ?, ai_score = ?, report_download_url = ?, admin_notes = ?, completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newSimScore, newAIScore, reportDownloadUrl, adminNotes || 'Parafrase selesai dikerjakan.', id]);

    const downloadUrl = `http://localhost:5000${reportDownloadUrl}`;
    const waText = `*LAKSAMANA.ID - JASA PARAFRASE SELESAI* 🎉\n\nHalo, pengerjaan parafrase dokumen kamu (*${order.file_name}*) telah selesai dikerjakan oleh Tim Laksamana!\n\n📊 *Hasil Akhir:*\n• Kode Order : *${order.id}*\n• Turnitin Similarity : *${newSimScore}%*\n• AI Score : *${newAIScore}%*\n\n📄 *File hasil parafrase yang sudah lolos Turnitin telah dilampirkan langsung pada pesan ini!*`;

    await sendWhatsAppMessage(order.whatsapp, waText, downloadUrl);

    res.json({
      message: `Pesanan ${id} berhasil diselesaikan di MySQL & file dikirimkan ke WhatsApp customer!`,
      order: { ...order, status: 'COMPLETED', similarityIndex: newSimScore, aiScore: newAIScore, completedAt: new Date().toISOString() }
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengupdate pesanan di MySQL: ' + err.message });
  }
});

module.exports = router;
