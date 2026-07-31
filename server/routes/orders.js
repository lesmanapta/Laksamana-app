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

// POST /api/orders/validate-token - Validate Token Code / Kupon Paket Laksamana
router.post('/validate-token', async (req, res) => {
  const { tokenCode } = req.body;
  if (!tokenCode || !tokenCode.trim()) {
    return res.status(400).json({ error: 'Kode token wajib diisi.' });
  }

  const code = tokenCode.trim().toUpperCase();

  try {
    const db = getPool();
    const [rows] = await db.query('SELECT * FROM package_tokens WHERE UPPER(token_code) = ?', [code]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Kode token / kupon tidak ditemukan atau tidak valid.' });
    }

    const tokenData = rows[0];

    if (tokenData.status !== 'ACTIVE' || tokenData.quota_remaining <= 0) {
      return res.status(400).json({ error: 'Kuota token paket ini sudah habis atau telah kedaluwarsa.' });
    }

    res.json({
      valid: true,
      message: `Token Paket Berhasil Digunakan! (${tokenData.package_name})`,
      token: {
        code: tokenData.token_code,
        packageName: tokenData.package_name,
        quotaTotal: tokenData.quota_total,
        quotaRemaining: tokenData.quota_remaining
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memverifikasi token paket: ' + err.message });
  }
});

// POST /api/orders/buy-package - Buy Paket Laksamana & Generate Package Token
router.post('/buy-package', async (req, res) => {
  const { packageId, packageName, price, whatsapp, email, quota } = req.body;

  if (!whatsapp || !packageId) {
    return res.status(400).json({ error: 'Paket dan Nomor WhatsApp wajib diisi.' });
  }

  const tokenCode = `LKS-PKG-${packageId.toUpperCase().slice(-3)}-${Math.floor(100000 + Math.random() * 900000)}`;
  const quotaTotal = parseInt(quota) || 3;

  try {
    const db = getPool();
    await db.query(`
      INSERT INTO package_tokens (token_code, package_id, package_name, user_email, whatsapp, quota_total, quota_remaining, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
    `, [tokenCode, packageId, packageName || 'Paket Laksamana', email || '', whatsapp, quotaTotal, quotaTotal]);

    // Send WA notification with Token Code
    const waMsg = `🎉 *PEMBELIAN PAKET LAKSAMANA BERHASIL!*\n\nHalo, paket *${packageName}* Anda telah sukses dibuat.\n\n🎟️ *KODE TOKEN ANDA:* \`${tokenCode}\`\n• Kuota Cek: *${quotaTotal}x Cek Plagiasi*\n• Status: ✅ AKTIF\n\nGunakan Kode Token \`${tokenCode}\` saat order di website Laksamana untuk *Skip Pembayaran*!\n🌐 http://localhost:3000`;
    sendWhatsAppMessage(whatsapp, waMsg);

    res.status(201).json({
      message: 'Pembelian Paket Laksamana Berhasil! Kode Token telah dikirimkan ke WA.',
      tokenCode,
      quotaTotal,
      packageName
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memproses paket: ' + err.message });
  }
});

// POST /api/orders/create
router.post('/create', cpUpload, async (req, res) => {
  const { serviceSlug, serviceName, whatsapp, email, paymentMethod, price, tokenCode, filterOptions } = req.body;
  const files = req.files || {};
  const mainFile = files['document'] ? files['document'][0] : null;
  const reportFile = files['plagiarismReport'] ? files['plagiarismReport'][0] : null;

  if (!whatsapp) {
    return res.status(400).json({ error: 'Nomor WhatsApp wajib diisi' });
  }

  let parsedFilters = { excludeQuotes: true, excludeBibliography: true, excludeSmallSources: false, smallSourceWords: 5 };
  if (filterOptions) {
    try {
      parsedFilters = typeof filterOptions === 'string' ? JSON.parse(filterOptions) : filterOptions;
    } catch (e) {}
  }

  const orderId = `LKS-${Math.floor(100000 + Math.random() * 900000)}`;
  const transactionId = `TRX-${Math.floor(100000 + Math.random() * 900000)}-${Date.now().toString().slice(-4)}`;

  const fileName = mainFile ? mainFile.originalname : 'Dokumen_Upload.pdf';
  const filePath = mainFile ? `/uploads/${mainFile.filename}` : '';
  const plagiarismReportPath = reportFile ? `/uploads/${reportFile.filename}` : '';
  const fileSize = mainFile ? mainFile.size : 30000;
  const targetSlug = serviceSlug || 'cek-plagiasi';

  let calculatedWordCount = Math.max(150, Math.ceil(fileSize / 18));
  let calculatedAmount = parseInt(price) || 10000;
  let reportDownloadUrl = `/api/orders/download/${orderId}`;
  let usedTokenCode = null;

  // Process Token Code / Coupon if provided
  if (tokenCode && tokenCode.trim()) {
    try {
      const db = getPool();
      const code = tokenCode.trim().toUpperCase();
      const [tokenRows] = await db.query('SELECT * FROM package_tokens WHERE UPPER(token_code) = ? AND status = "ACTIVE" AND quota_remaining > 0', [code]);

      if (tokenRows.length > 0) {
        const token = tokenRows[0];
        calculatedAmount = 0; // 100% Free / Token Redeem
        usedTokenCode = token.token_code;

        // Deduct 1 quota from token
        const newQuota = token.quota_remaining - 1;
        const newStatus = newQuota <= 0 ? 'EXHAUSTED' : 'ACTIVE';
        await db.query('UPDATE package_tokens SET quota_remaining = ?, status = ? WHERE token_code = ?', [newQuota, newStatus, token.token_code]);
        console.log(`🎟️ [TOKEN SYSTEM] Redeemed token ${token.token_code}. Remaining quota: ${newQuota}`);
      }
    } catch (tokenErr) {
      console.error('Error redeeming token:', tokenErr.message);
    }
  }

  let analysisResult = {
    similarityIndex: 0,
    aiScore: 0,
    pageCount: Math.max(1, Math.ceil(fileSize / 15000)),
    wordCount: calculatedWordCount,
    matchedSources: []
  };

  if (targetSlug === 'cek-drillbit' && !usedTokenCode) {
    calculatedAmount = calculatedWordCount * 10;
  }

  analysisResult.reportDownloadUrl = reportDownloadUrl;
  const initialStatus = 'PROCESSING';

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
    paymentMethod: usedTokenCode ? `Token Paket (${usedTokenCode})` : (paymentMethod || 'Midtrans QRIS'),
    amount: calculatedAmount,
    status: initialStatus,
    filterOptions: parsedFilters,
    createdAt: new Date().toISOString(),
    completedAt: null,
    result: analysisResult
  };

  try {
    const midtransRes = await createMidtransTransaction(newOrder, transactionId);
    newOrder.snapToken = midtransRes.snapToken;
    newOrder.snapRedirectUrl = midtransRes.redirectUrl;

    const db = getPool();
    // 1. Insert Into orders Table
    await db.query(`
      INSERT INTO orders (id, service_slug, service_name, file_name, file_path, plagiarism_report_path, file_size, whatsapp, email, payment_method, amount, status, similarity_index, ai_score, page_count, word_count, matched_sources, filter_options, report_download_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      JSON.stringify(parsedFilters),
      reportDownloadUrl
    ]);

    // 2. Insert Dedicated Unique Transaction Record Into transactions Table
    await db.query(`
      INSERT INTO transactions (id, order_id, amount, payment_type, snap_token, snap_redirect_url, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      transactionId,
      newOrder.id,
      newOrder.amount,
      newOrder.paymentMethod,
      newOrder.snapToken,
      newOrder.snapRedirectUrl,
      usedTokenCode ? 'SETTLEMENT' : 'PENDING'
    ]);

    // Send WA notification that order was received & is being processed
    const waText = `📄 *PESANAN DITERIMA - LAKSAMANA.ID*\n\nHalo, dokumen *${fileName}* telah diterima dengan Kode Order: *${orderId}*.\n• Filter Turnitin: *Quotes (${parsedFilters.excludeQuotes ? 'OFF' : 'ON'}), Biblio (${parsedFilters.excludeBibliography ? 'OFF' : 'ON'})*\n• Pembayaran: *${newOrder.paymentMethod}*\n• Tarif: *Rp ${newOrder.amount.toLocaleString('id-ID')}*\n\n⏳ *Status:* Dokumen Anda sedang diproses oleh sistem ${newOrder.serviceName}.\n\nSilakan tunggu, hasil skor & file laporan resmi akan dikirimkan otomatis ke WhatsApp ini setelah selesai!`;
    sendWhatsAppMessage(newOrder.whatsapp, waText);

    // Asynchronously trigger automated Drillbit or Turnitin Puppeteer worker to upload the file
    setTimeout(async () => {
      try {
        if (targetSlug === 'cek-drillbit') {
          console.log(`🚀 [BACKGROUND WORKER] Triggering automated Drillbit upload for ${orderId}...`);
          const dblRes = await runDrillbitEngine(filePath, fileName, fileSize, orderId);
          
          await db.query(`
            UPDATE orders 
            SET status = 'COMPLETED', similarity_index = ?, word_count = ?, report_download_url = ?, completed_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `, [dblRes.similarityIndex, dblRes.wordCount, dblRes.reportDownloadUrl, orderId]);

          const fullDownloadUrl = `http://localhost:5000${dblRes.reportDownloadUrl}`;
          const reportWaText = `📊 *HASIL CEK DRILLBIT LAKSAMANA SELESAI* 🎉\n\nHalo, pemeriksaan plagiasi Drillbit untuk dokumen *${fileName}* telah selesai dikerjakan!\n\n📋 *Ringkasan Drillbit Per-Kata:*\n• Kode Order : *${orderId}*\n• Total Kata : *${dblRes.wordCount.toLocaleString('id-ID')} kata*\n• Similarity Index : *${dblRes.similarityIndex}%*\n\n📄 *File laporan resmi Drillbit telah dilampirkan langsung pada pesan WhatsApp ini!*`;
          sendWhatsAppMessage(whatsapp, reportWaText, fullDownloadUrl);
        } else if (targetSlug === 'cek-plagiasi') {
          console.log(`🚀 [BACKGROUND WORKER] Triggering automated Turnitin check for ${orderId}...`);
          const trnRes = await runTurnitinWorker(filePath, fileName, orderId, parsedFilters);

          await db.query(`
            UPDATE orders 
            SET status = 'COMPLETED', similarity_index = ?, ai_score = ?, completed_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `, [trnRes.similarityIndex, trnRes.aiScore, orderId]);

          const fullDownloadUrl = `http://localhost:5000${reportDownloadUrl}`;
          sendWhatsAppMessage(whatsapp, getReportCompletedWATemplate(newOrder, fullDownloadUrl), fullDownloadUrl);
        }
      } catch (workerErr) {
        console.error(`❌ [BACKGROUND WORKER ERROR] Order ${orderId}:`, workerErr.message);
      }
    }, 2000);

    res.status(201).json({
      message: 'Pesanan Laksamana berhasil disimpan di MySQL Database',
      orderId: newOrder.id,
      transactionId: transactionId,
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
  
  const [trxRows] = await db.query('SELECT * FROM transactions WHERE id = ?', [order_id]);
  let targetOrderId = order_id;
  
  if (trxRows.length > 0) {
    targetOrderId = trxRows[0].order_id;
    await db.query('UPDATE transactions SET status = ? WHERE id = ?', [transaction_status, order_id]);
  }

  const [rows] = await db.query('SELECT * FROM orders WHERE id = ?', [targetOrderId]);
  if (rows.length === 0) return res.status(404).json({ error: 'Order not found' });
  
  const order = rows[0];
  const filterOpts = typeof order.filter_options === 'string' ? JSON.parse(order.filter_options) : (order.filter_options || {});

  if (transaction_status === 'capture' || transaction_status === 'settlement') {
    if (fraud_status === 'accept' || !fraud_status) {
      if (order.service_slug === 'cek-drillbit') {
        const dblRes = await runDrillbitEngine(order.file_path, order.file_name, order.file_size, order.id);
        await db.query(`
          UPDATE orders 
          SET status = 'COMPLETED', similarity_index = ?, word_count = ?, report_download_url = ?, completed_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `, [dblRes.similarityIndex, dblRes.wordCount, dblRes.reportDownloadUrl, order.id]);
        
        const fullDownloadUrl = `http://localhost:5000${dblRes.reportDownloadUrl}`;
        const reportWaText = `📊 *HASIL CEK DRILLBIT LAKSAMANA SELESAI* 🎉\n\nHalo, pemeriksaan plagiasi Drillbit untuk dokumen *${order.file_name}* telah selesai dikerjakan!\n\n📋 *Ringkasan Drillbit Per-Kata:*\n• Kode Order : *${order.id}*\n• Total Kata : *${dblRes.wordCount.toLocaleString('id-ID')} kata*\n• Similarity Index : *${dblRes.similarityIndex}%*\n\n📄 *File laporan resmi Drillbit telah dilampirkan langsung pada pesan WhatsApp ini!*`;
        sendWhatsAppMessage(order.whatsapp, reportWaText, fullDownloadUrl);
      } else if (order.service_slug === 'cek-plagiasi') {
        const trnRes = await runTurnitinWorker(order.file_path, order.file_name, order.id, filterOpts);
        await db.query(`
          UPDATE orders 
          SET status = 'COMPLETED', similarity_index = ?, ai_score = ?, completed_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `, [trnRes.similarityIndex, trnRes.aiScore, order.id]);

        const fullDownloadUrl = `http://localhost:5000${order.report_download_url}`;
        sendWhatsAppMessage(order.whatsapp, getReportCompletedWATemplate(order, fullDownloadUrl), fullDownloadUrl);
      }
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
    const cleanPhone = query.replace(/\D/g, '');
    const phonePattern = cleanPhone.length > 5 ? `%${cleanPhone.slice(-8)}%` : query;

    const [rows] = await db.query(
      'SELECT * FROM orders WHERE id = ? OR whatsapp = ? OR whatsapp LIKE ? ORDER BY created_at DESC',
      [query, query, phonePattern]
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
      filterOptions: typeof r.filter_options === 'string' ? JSON.parse(r.filter_options) : (r.filter_options || {}),
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
  const filterOpts = typeof order.filter_options === 'string' ? JSON.parse(order.filter_options) : (order.filter_options || {});

  const reportText = `
===========================================================
        LAKSAMANA.ID - LAPORAN RESMI DRILLBIT / TURNITIN
===========================================================
Kode Pesanan    : ${order.id}
Nama File       : ${order.file_name}
Layanan         : ${order.service_name}
Status Bayar    : ${order.status} (Midtrans Verified)
Tanggal Cek     : ${new Date(order.created_at).toLocaleString('id-ID')}
Waktu Kirim WA  : ${order.completed_at ? new Date(order.completed_at).toLocaleString('id-ID') : 'Sedang Diproses'}
-----------------------------------------------------------
FILTER TURNITIN YANG DIAKTIFKAN:
- Exclude Quotes        : ${filterOpts.excludeQuotes ? 'AKTIF [YES]' : 'TIDAK [NO]'}
- Exclude Bibliography  : ${filterOpts.excludeBibliography ? 'AKTIF [YES]' : 'TIDAK [NO]'}
- Exclude Small Matches : ${filterOpts.excludeSmallSources ? `AKTIF [<${filterOpts.smallSourceWords || 5}w]` : 'TIDAK [NO]'}
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
