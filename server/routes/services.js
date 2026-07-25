const express = require('express');
const router = express.Router();

const servicesList = [
  {
    id: 'cek-plagiasi',
    slug: 'cek-plagiasi',
    title: 'Cek Plagiasi No-Repository',
    subtitle: 'Deteksi plagiarisme dokumen via Turnitin',
    icon: 'ri-file-line',
    price: 10000,
    unit: 'file',
    maxPages: 800,
    description: 'Pengecekan keaslian tulisan cepat 24 jam tanpa menyimpan dokumen ke repository Turnitin.',
    active: true
  },
  {
    id: 'cek-drillbit',
    slug: 'cek-drillbit',
    title: 'Cek Drillbit (Per Kata)',
    subtitle: 'Cek plagiarisme komprehensif dengan Drillbit',
    icon: 'ri-file-search-line',
    price: 10,
    unit: 'kata',
    maxPages: 500,
    description: 'Solusi pemeriksaan plagiasi jurnal & skripsi berbasis algoritma Drillbit (Tarif Rp 10/kata).',
    active: true
  },
  {
    id: 'parafrase',
    slug: 'parafrase',
    title: 'Jasa Parafrase',
    subtitle: 'Ubah teks tanpa menghilangkan makna asli',
    icon: 'ri-loop-left-line',
    price: 35000,
    unit: 'halaman',
    maxPages: 100,
    description: 'Layanan penulisan ulang profesional untuk menurunkan skor Turnitin secara signifikan.',
    active: true
  },
  {
    id: 'gptzero',
    slug: 'gptzero',
    title: 'Cek AI GPTZero',
    subtitle: 'Deteksi tulisan buatan AI (ChatGPT, Claude, Gemini)',
    icon: 'ri-search-eye-line',
    price: 15000,
    unit: 'file',
    maxPages: 300,
    description: 'Analisis mendalam persentase konten buatan AI dengan laporan skor probabilitas detail.',
    active: false
  },
  {
    id: 'humanizer',
    slug: 'humanizer',
    title: 'Humanize File AI GPTZero',
    subtitle: 'Ubah teks AI menjadi terasa sangat manusiawi',
    icon: 'ri-robot-2-line',
    price: 25000,
    unit: 'file',
    maxPages: 200,
    description: 'Menghilangkan pola sintaksis buatan AI sehingga lolos deteksi GPTZero dan Turnitin AI.',
    active: false
  }
];

const packageList = [
  {
    id: 'pkg_hemat_3x',
    name: 'Paket Hemat Laksamana (3x Cek)',
    validity: '7 hari',
    price: 27500,
    targetAudience: 'Buat kamu yang lagi ngebut nyelesein tugas biar selesai tepat waktu',
    quota: '3x cek plagiasi',
    benefits: [
      'Skip menu pembayaran',
      'Bisa cek sampai 800 halaman/file',
      'Dapet token 3x cek plagiasi',
      'Hasil langsung dikirim ke WhatsApp'
    ]
  },
  {
    id: 'pkg_praktis_10x',
    name: 'Paket Praktis Laksamana (10x Cek)',
    validity: '14 hari',
    price: 89500,
    targetAudience: 'Buat kamu deadliners yang lagi ngerjain revisian dan nugas',
    quota: '10x cek plagiasi',
    benefits: [
      'Skip menu pembayaran',
      'Bisa cek sampai 800 halaman/file',
      'Dapet token 10x cek plagiasi',
      'Hasil langsung dikirim ke WhatsApp'
    ]
  },
  {
    id: 'pkg_pro_25x',
    name: 'Paket Sultan Laksamana (25x Cek)',
    validity: '30 hari',
    price: 199000,
    targetAudience: 'Cocok buat bimbingan skripsi kelompok atau jasa pengetikan',
    quota: '25x cek plagiasi',
    benefits: [
      'Skip menu pembayaran & antrean instant',
      'Bisa cek sampai 800 halaman/file',
      'Dapet token 25x cek plagiasi',
      'Laporan PDF + Highlight Sumber Lengkap'
    ]
  }
];

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

// GET /api/services
router.get('/', (req, res) => {
  res.json(servicesList);
});

// GET /api/services/packages
router.get('/packages', (req, res) => {
  res.json(packageList);
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
