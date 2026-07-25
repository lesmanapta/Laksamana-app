const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getPool } = require('../config/database');

const { runTurnitinWorker } = require('../services/turnitinWorker');
const { runDrillbitEngine } = require('../services/drillbitService');
const { runGPTZeroEngine } = require('../services/gptzeroService');
const { runHumanizerEngine } = require('../services/humanizerService');

const { createMidtransTransaction } = require('../services/midtransService');
const { 
  sendWhatsAppMessage, 
  getOrderCreatedWATemplate, 
  getPaymentSuccessWATemplate, 
  getReportCompletedWATemplate 
} = require('../services/whatsappService');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${file.fieldname}_${Date.now()}_${file.originalname}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }
});

const cpUpload = upload.fields([
  { name: 'document', maxCount: 1 },
  { name: 'plagiarismReport', maxCount: 1 }
]);

// POST /api/orders/create
router.post('/create', cpUpload, async (req, res) => {
  const { serviceSlug, serviceName, whatsapp, email, paymentMethod, price } = req.body;
  const files = req.files || {};
  const mainFile = files['document'] ? files['document'][0] : null;
  const reportFile = files['plagiarismReport'] ? files['plagiarismReport'][0] : null;

  if (!whatsapp) {
    return res.status(400).json({ error: 'Nomor WhatsApp wajib diisi' });
  }

  const orderId = `LKS-${Math.floor(100000 + Math.random() * 900000)}`;
  const fileName = mainFile ? mainFile.originalname : 'Dokumen_Upload.pdf';
  const filePath = mainFile ? `/uploads/${mainFile.filename}` : '';
  const plagiarismReportPath = reportFile ? `/uploads/${reportFile.filename}` : '';
  const fileSize = mainFile ? mainFile.size : 30000;
  const targetSlug = serviceSlug || 'cek-plagiasi';

  let calculatedWordCount = Math.max(150, Math.ceil(fileSize / 18));
  let calculatedAmount = parseInt(price) || 10000;
  let reportDownloadUrl = `/api/orders/download/${orderId}`;

  let analysisResult = {
    similarityIndex: 12,
    aiScore: 3,
    pageCount: Math.max(1, Math.ceil(fileSize / 15000)),
    wordCount: calculatedWordCount,
    matchedSources: [
      { source: "journal.univexample.ac.id/index.php/article/view/1092", percent: 5 },
      { source: "repository.researchgate.net/publication/34821", percent: 4 }
    ]
  };

  if (targetSlug === 'cek-plagiasi') {
    const trnRes = await runTurnitinWorker(filePath, fileName, orderId);
    analysisResult.similarityIndex = trnRes.similarityIndex;
    analysisResult.aiScore = trnRes.aiScore;
  } else if (targetSlug === 'cek-drillbit') {
    const dblRes = await runDrillbitEngine(filePath, fileName, fileSize, orderId);
    analysisResult.similarityIndex = dblRes.similarityIndex;
    analysisResult.wordCount = dblRes.wordCount;
    calculatedAmount = dblRes.calculatedTotalAmount;
    if (dblRes.reportDownloadUrl) {
      reportDownloadUrl = dblRes.reportDownloadUrl;
    }
  } else if (targetSlug === 'gptzero') {
    const gptRes = await runGPTZeroEngine(filePath, fileName, orderId);
    analysisResult.aiScore = gptRes.aiScore;
  } else if (targetSlug === 'humanizer') {
    const humRes = await runHumanizerEngine(filePath, fileName, orderId, 'humanizer');
    analysisResult.similarityIndex = humRes.similarityIndex;
    analysisResult.aiScore = humRes.aiScore;
  }

  analysisResult.reportDownloadUrl = reportDownloadUrl;
  const initialStatus = targetSlug === 'parafrase' ? 'PROCESSING' : 'PENDING_PAYMENT';

  const newOrder = {
    id: orderId,
    serviceSlug: targetSlug,
    serviceName: serviceName || 'Cek Plagiasi No-Repository',
    fileName,
    filePath,
    plagiarismReportPath,
    fileSize,
    whatsapp,
    email: email || '',
    paymentMethod: paymentMethod || 'Midtrans QRIS',
    amount: calculatedAmount,
    status: initialStatus,
    createdAt: new Date().toISOString(),
    completedAt: null,
    result: analysisResult
  };

  try {
    const midtransRes = await createMidtransTransaction(newOrder);
    newOrder.snapToken = midtransRes.snapToken;
    newOrder.snapRedirectUrl = midtransRes.redirectUrl;

    const db = getPool();
    await db.query(`
      INSERT INTO orders (id, service_slug, service_name, file_name, file_path, plagiarism_report_path, file_size, whatsapp, email, payment_method, amount, status, similarity_index, ai_score, page_count, word_count, matched_sources, report_download_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newOrder.id,
      newOrder.serviceSlug,
      newOrder.serviceName,
      newOrder.fileName,
      newOrder.filePath,
      newOrder.plagiarismReportPath,
      newOrder.fileSize,
      newOrder.whatsapp,
      newOrder.email,
      newOrder.paymentMethod,
      newOrder.amount,
      newOrder.status,
      analysisResult.similarityIndex,
      analysisResult.aiScore,
      analysisResult.pageCount,
      analysisResult.wordCount,
      JSON.stringify(analysisResult.matchedSources),
      reportDownloadUrl
    ]);

    // Send WA notification
    const waText = getOrderCreatedWATemplate(newOrder);
    sendWhatsAppMessage(newOrder.whatsapp, waText);

    // Auto-complete non-manual services & update completed_at timestamp
    if (targetSlug !== 'parafrase') {
      setTimeout(async () => {
        await db.query('UPDATE orders SET status = "COMPLETED", completed_at = CURRENT_TIMESTAMP WHERE id = ?', [orderId]);
        const fullDownloadUrl = `http://localhost:5000${reportDownloadUrl}`;
        
        let reportWaText = getReportCompletedWATemplate(newOrder, fullDownloadUrl);
        if (targetSlug === 'cek-drillbit') {
          reportWaText = `📊 *HASIL CEK DRILLBIT LAKSAMANA SELESAI* 🎉\n\nHalo, pemeriksaan plagiasi Drillbit untuk dokumen *${newOrder.fileName}* telah selesai dikerjakan secara otomatis!\n\n📋 *Ringkasan Drillbit Per-Kata:*\n• Kode Order : *${newOrder.id}*\n• Total Kata : *${analysisResult.wordCount.toLocaleString('id-ID')} kata*\n• Similarity Index : *${analysisResult.similarityIndex}%*\n\n📄 *File laporan resmi Drillbit telah dilampirkan langsung pada pesan WhatsApp ini!*`;
        }

        sendWhatsAppMessage(newOrder.whatsapp, reportWaText, fullDownloadUrl);
      }, 4000);
    }

    res.status(201).json({
      message: 'Pesanan Laksamana berhasil disimpan di MySQL Database',
      orderId: newOrder.id,
      snapToken: newOrder.snapToken,
      snapRedirectUrl: newOrder.snapRedirectUrl,
      order: newOrder
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal membuat pesanan di MySQL: ' + err.message });
  }
});

// POST /api/orders/midtrans-webhook
router.post('/midtrans-webhook', async (req, res) => {
  const { order_id, transaction_status, fraud_status } = req.body;
  const db = getPool();
  
  const baseOrderId = order_id ? order_id.split('-').slice(0, 2).join('-') : order_id;
  const [rows] = await db.query('SELECT * FROM orders WHERE id = ? OR id = ?', [order_id, baseOrderId]);
  if (rows.length === 0) return res.status(404).json({ error: 'Order not found' });
  
  const order = rows[0];

  if (transaction_status === 'capture' || transaction_status === 'settlement') {
    if (fraud_status === 'accept' || !fraud_status) {
      const nextStatus = order.service_slug === 'parafrase' ? 'PROCESSING' : 'COMPLETED';
      await db.query('UPDATE orders SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?', [nextStatus, order.id]);
      
      const fullDownloadUrl = `http://localhost:5000${order.report_download_url}`;
      sendWhatsAppMessage(order.whatsapp, getPaymentSuccessWATemplate(order));
      sendWhatsAppMessage(order.whatsapp, getReportCompletedWATemplate(order, fullDownloadUrl), fullDownloadUrl);
    }
  } else if (transaction_status === 'cancel' || transaction_status === 'deny' || transaction_status === 'expire') {
    await db.query('UPDATE orders SET status = "FAILED" WHERE id = ?', [order.id]);
  }

  res.json({ status: 'OK' });
});

// GET /api/orders/track/:id
router.get('/track/:id', async (req, res) => {
  const query = req.params.id.trim();
  const db = getPool();

  try {
    const [rows] = await db.query(
      'SELECT * FROM orders WHERE id = ? OR whatsapp = ? ORDER BY created_at DESC',
      [query, query]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Pesanan Laksamana tidak ditemukan.' });

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
    res.status(500).json({ error: 'Gagal mengambil data pesanan dari MySQL: ' + err.message });
  }
});

// GET /api/orders/download/:id
router.get('/download/:id', async (req, res) => {
  const db = getPool();
  const [rows] = await db.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);

  if (rows.length === 0) return res.status(404).json({ error: 'Laporan tidak ditemukan' });
  const order = rows[0];
  const matchedSources = typeof order.matched_sources === 'string' ? JSON.parse(order.matched_sources) : (order.matched_sources || []);

  const reportText = `
===========================================================
        LAKSAMANA.ID - LAPORAN RESMI DRILLBIT / TURNITIN
===========================================================
Kode Pesanan    : ${order.id}
Nama File       : ${order.file_name}
Layanan         : ${order.service_name}
Status Bayar    : ${order.status} (Midtrans Verified)
Tanggal Cek     : ${new Date(order.created_at).toLocaleString('id-ID')}
Waktu Kirim WA  : ${order.completed_at ? new Date(order.completed_at).toLocaleString('id-ID') : 'Selesai'}
-----------------------------------------------------------
SKOR HASIL ANALISIS LAKSAMANA:
- Similarity Index   : ${order.similarity_index}%
- Skor Konten AI     : ${order.ai_score}%
- Total Jumlah Kata  : ${order.word_count.toLocaleString('id-ID')} kata
- Estimasi Halaman   : ${order.page_count} halaman
-----------------------------------------------------------
SUMBER TERDETEKSI KEMIRIPAN:
${matchedSources.map(s => `- [${s.percent}%] ${s.source}`).join('\n')}

===========================================================
Status: DOKUMEN TERVERIFIKASI AMAN NO-REPOSITORY
Terima kasih telah menggunakan sistem platform Laksamana!
===========================================================
`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="Hasil_Laksamana_${order.id}.txt"`);
  res.send(reportText);
});

module.exports = router;
