const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');

const tutorialsList = [
  {
    id: 'tut_1',
    title: 'Cara Cek Plagiasi Laksamana',
    image: 'tutorial_turnitin.png',
    url: 'cara-cek-plagiasi',
    how_to: '<ol><li>Pilih menu <b>Jasa Laksamana</b> lalu klik <b>Cek Plagiasi No-Repository</b>.</li><li>Upload file karya tulis kamu (.pdf / .docx).</li><li>Masukkan nomor WhatsApp aktif untuk penerimaan hasil.</li><li>Lakukan pembayaran via QRIS atau Transfer.</li><li>Hasil akan dikirim otomatis ke WA & bisa di-download di menu <b>Cek Pesanan</b>!</li></ol>'
  },
  {
    id: 'tut_2',
    title: 'Cara Menggunakan Token Paket',
    image: 'tutorial_token.png',
    url: 'cara-menggunakan-token',
    how_to: '<ol><li>Beli salah satu Paket Laksamana Hemat/Praktis.</li><li>Setelah pembayaran berhasil, kamu akan mendapatkan Kode Token.</li><li>Saat order, masukkan Kode Token kamu pada kolom diskon/token untuk <b>skip pembayaran</b>!</li></ol>'
  }
];

// GET /api/services - Fetch active services from MySQL
router.get('/', async (req, res) => {
  try {
    const db = getPool();
    const [rows] = await db.query('SELECT * FROM services ORDER BY created_at ASC');
    const formatted = rows.map(r => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      subtitle: r.subtitle,
      icon: r.icon,
      price: r.price,
      unit: r.unit,
      maxPages: r.max_pages,
      description: r.description,
      active: Boolean(r.active)
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil data layanan: ' + err.message });
  }
});

// GET /api/services/packages - Fetch active packages from MySQL
router.get('/packages', async (req, res) => {
  try {
    const db = getPool();
    const [rows] = await db.query('SELECT * FROM packages WHERE active = 1 ORDER BY price ASC');
    const formatted = rows.map(r => ({
      id: r.id,
      name: r.name,
      validity: r.validity,
      price: r.price,
      targetAudience: r.target_audience,
      quota: `${r.quota}x cek plagiasi`,
      quotaNumber: r.quota,
      benefits: typeof r.benefits === 'string' ? JSON.parse(r.benefits) : (r.benefits || [])
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil data paket: ' + err.message });
  }
});

// GET /api/services/tutorials
router.get('/tutorials', (req, res) => {
  const { url } = req.query;
  if (url) {
    const found = tutorialsList.find(t => t.url === url);
    return res.json(found || tutorialsList[0]);
  }
  res.json(tutorialsList);
});

module.exports = router;
