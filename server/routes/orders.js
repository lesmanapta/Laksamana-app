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

// POST /api/orders/buy-package - Buy Paket Laksamana (Payment First, Token After)
router.post('/buy-package', async (req, res) => {
  const { packageId, packageName, price, whatsapp, email, quota } = req.body;

  if (!whatsapp || !packageId) {
    return res.status(400).json({ error: 'Paket dan Nomor WhatsApp wajib diisi.' });
  }

  const tokenCode = `LKS-PKG-${packageId.toUpperCase().slice(-3)}-${Math.floor(100000 + Math.random() * 900000)}`;
  const quotaTotal = parseInt(quota) || 3;
  const packagePrice = parseInt(price) || 27500;
  const transactionId = `TRX-PKG-${Math.floor(100000 + Math.random() * 900000)}-${Date.now().toString().slice(-4)}`;

  try {
    const db = getPool();

    // 1. Insert token with status PENDING (not yet active until payment confirmed)
    await db.query(`
      INSERT INTO package_tokens (token_code, package_id, package_name, user_email, whatsapp, quota_total, quota_remaining, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
    `, [tokenCode, packageId, packageName || 'Paket Laksamana', email || '', whatsapp, quotaTotal, quotaTotal]);

    // 2. Create Midtrans Snap transaction for package payment
    const orderForMidtrans = {
      id: tokenCode,
      serviceSlug: packageId,
      serviceName: (packageName || 'Paket Laksamana').substring(0, 50),
      amount: packagePrice,
      whatsapp,
      email: email || ''
    };

    const midtransRes = await createMidtransTransaction(orderForMidtrans, transactionId);
    if (midtransRes.error) {
      return res.status(400).json({ error: `Gagal memproses pembayaran Midtrans: ${midtransRes.error}. Pastikan Server Key & Client Key Midtrans di server/cPanel sudah sesuai (Sandbox / Production).` });
    }

    // 3. Save transaction record linked to this token
    await db.query(`
      INSERT INTO transactions (id, order_id, amount, payment_type, snap_token, snap_redirect_url, status)
      VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
    `, [transactionId, tokenCode, packagePrice, 'Paket Laksamana', midtransRes.snapToken, midtransRes.redirectUrl]);

    res.status(201).json({
      message: 'Silakan selesaikan pembayaran untuk menerima Kode Token Paket.',
      tokenCode,
      quotaTotal,
      packageName,
      snapToken: midtransRes.snapToken,
      snapRedirectUrl: midtransRes.redirectUrl,
      transactionId,
      price: packagePrice,
      status: 'PENDING_PAYMENT'
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memproses paket: ' + err.message });
  }
});

// POST /api/orders/package-payment-success - Activate token after client-side payment confirmed
router.post('/package-payment-success', async (req, res) => {
  const { tokenCode, transactionId } = req.body;

  if (!tokenCode) {
    return res.status(400).json({ error: 'Token code required.' });
  }

  try {
    const db = getPool();

    // Check if token exists and is still PENDING
    const [tokenRows] = await db.query('SELECT * FROM package_tokens WHERE token_code = ?', [tokenCode]);
    if (tokenRows.length === 0) {
      return res.status(404).json({ error: 'Token tidak ditemukan.' });
    }

    const token = tokenRows[0];
    if (token.status === 'ACTIVE') {
      return res.json({ message: 'Token sudah aktif.', tokenCode, alreadyActive: true });
    }

    // Activate token
    await db.query('UPDATE package_tokens SET status = "ACTIVE" WHERE token_code = ?', [tokenCode]);

    // Update transaction status
    if (transactionId) {
      await db.query('UPDATE transactions SET status = "SETTLEMENT" WHERE id = ?', [transactionId]);
    }

    // Send WA notification with Token Code
    const waMsg = `🎉 *PEMBAYARAN PAKET LAKSAMANA BERHASIL!*\n\nHalo, pembayaran paket *${token.package_name}* Anda telah dikonfirmasi.\n\n🎟️ *KODE TOKEN ANDA:* \`${tokenCode}\`\n• Kuota Cek: *${token.quota_total}x Cek Plagiasi*\n• Status: ✅ AKTIF\n\nGunakan Kode Token \`${tokenCode}\` saat order di website Laksamana untuk *Skip Pembayaran*!\n🌐 https://laksamana.biz.id`;
    sendWhatsAppMessage(token.whatsapp, waMsg);

    res.json({
      message: 'Pembayaran berhasil! Token Paket telah diaktifkan & dikirim ke WhatsApp.',
      tokenCode,
      quotaTotal: token.quota_total,
      packageName: token.package_name
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengaktifkan token: ' + err.message });
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
  const initialStatus = usedTokenCode ? 'PROCESSING' : 'PENDING_PAYMENT';

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
    if (!usedTokenCode && midtransRes.error) {
      return res.status(400).json({ error: `Gagal menghubungkan ke Gateway Pembayaran Midtrans: ${midtransRes.error}. Silakan periksa konfigurasi MIDTRANS_SERVER_KEY (Sandbox / Production) di server.` });
    }

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

    // Send WA notification that order was received
    const waText = usedTokenCode
      ? `📄 *PESANAN DITERIMA - LAKSAMANA.ID*\n\nHalo, dokumen *${fileName}* telah diterima (Token Paket: \`${usedTokenCode}\`) dengan Kode Order: *${orderId}*.\n• Status: ⏳ SEDANG DIPROSES\n\nHasil skor & file laporan resmi akan dikirimkan otomatis ke WhatsApp ini setelah selesai!`
      : `📄 *PESANAN DITERIMA - LAKSAMANA.ID*\n\nHalo, dokumen *${fileName}* telah diterima dengan Kode Order: *${orderId}*.\n• Tarif: *Rp ${newOrder.amount.toLocaleString('id-ID')}*\n• Status: 💳 MENUNGGU PEMBAYARAN\n\nSilakan selesaikan pembayaran untuk memproses dokumen Anda.`;
    sendWhatsAppMessage(newOrder.whatsapp, waText);

    // Asynchronously trigger automated Drillbit or Turnitin Puppeteer worker ONLY IF TOKEN WAS USED
    if (usedTokenCode) {
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

            if (trnRes && trnRes.autoCompleted) {
              await db.query(`
                UPDATE orders 
                SET status = 'COMPLETED', similarity_index = ?, ai_score = ?, completed_at = CURRENT_TIMESTAMP 
                WHERE id = ?
              `, [trnRes.similarityIndex, trnRes.aiScore, orderId]);

              const fullDownloadUrl = `http://localhost:5000${reportDownloadUrl}`;
              sendWhatsAppMessage(whatsapp, getReportCompletedWATemplate(newOrder, fullDownloadUrl), fullDownloadUrl);
            } else {
              console.log(`⏳ [PROCESSING] Order ${orderId} is in PROCESSING state. Waiting for Admin PDF upload.`);
              await db.query(`
                UPDATE orders 
                SET status = 'PROCESSING', admin_notes = 'Menunggu pengerjaan / unggah laporan PDF Turnitin oleh Admin'
                WHERE id = ?
              `, [orderId]);
            }
          }
        } catch (workerErr) {
          console.error(`❌ [BACKGROUND WORKER ERROR] Order ${orderId}:`, workerErr.message);
        }
      }, 2000);
    }

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

// POST /api/orders/confirm-payment - Trigger document check when payment is confirmed
router.post('/confirm-payment', async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) return res.status(400).json({ error: 'Order ID required.' });

  try {
    const db = getPool();
    const [rows] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Pesanan tidak ditemukan.' });

    const order = rows[0];
    if (order.status === 'COMPLETED') {
      return res.json({ message: 'Pesanan sudah selesai.', status: 'COMPLETED' });
    }

    // Update status to PROCESSING
    await db.query('UPDATE orders SET status = "PROCESSING" WHERE id = ?', [orderId]);

    const filterOpts = typeof order.filter_options === 'string' ? JSON.parse(order.filter_options) : (order.filter_options || {});

    // Trigger background worker
    setTimeout(async () => {
      try {
        if (order.service_slug === 'cek-drillbit') {
          console.log(`🚀 [CONFIRM PAYMENT] Running Drillbit check for ${orderId}...`);
          const dblRes = await runDrillbitEngine(order.file_path, order.file_name, order.file_size, order.id);
          await db.query(`
            UPDATE orders 
            SET status = 'COMPLETED', similarity_index = ?, word_count = ?, report_download_url = ?, completed_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `, [dblRes.similarityIndex, dblRes.wordCount, dblRes.reportDownloadUrl, order.id]);

          const fullDownloadUrl = `http://localhost:5000${dblRes.reportDownloadUrl}`;
          const reportWaText = `📊 *HASIL CEK DRILLBIT LAKSAMANA SELESAI* 🎉\n\nHalo, pemeriksaan plagiasi Drillbit untuk dokumen *${order.file_name}* telah selesai dikerjakan!\n\n📋 *Ringkasan Drillbit Per-Kata:*\n• Kode Order : *${order.id}*\n• Total Kata : *${dblRes.wordCount.toLocaleString('id-ID')} kata*\n• Similarity Index : *${dblRes.similarityIndex}%*\n\n📄 *File laporan resmi Drillbit telah dilampirkan langsung pada pesan WhatsApp ini!*`;
          sendWhatsAppMessage(order.whatsapp, reportWaText, fullDownloadUrl);
        } else {
          console.log(`🚀 [CONFIRM PAYMENT] Running Turnitin check for ${orderId}...`);
          const trnRes = await runTurnitinWorker(order.file_path, order.file_name, order.id, filterOpts);
          if (trnRes && trnRes.autoCompleted) {
            await db.query(`
              UPDATE orders 
              SET status = 'COMPLETED', similarity_index = ?, ai_score = ?, completed_at = CURRENT_TIMESTAMP 
              WHERE id = ?
            `, [trnRes.similarityIndex, trnRes.aiScore, order.id]);

            const fullDownloadUrl = `http://localhost:5000${order.report_download_url}`;
            sendWhatsAppMessage(order.whatsapp, getReportCompletedWATemplate(order, fullDownloadUrl), fullDownloadUrl);
          } else {
            console.log(`⏳ [CONFIRM PAYMENT] Order ${orderId} status set to PROCESSING. Waiting for Admin PDF upload.`);
            await db.query(`
              UPDATE orders 
              SET status = 'PROCESSING', admin_notes = 'Menunggu unggah laporan PDF Turnitin oleh Admin'
              WHERE id = ?
            `, [order.id]);
          }
        }
      } catch (err) {
        console.error(`❌ [CONFIRM PAYMENT ERROR] Order ${orderId}:`, err.message);
      }
    }, 1000);

    res.json({ message: 'Pembayaran dikonfirmasi! Dokumen sedang diproses.', status: 'PROCESSING' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengonfirmasi pembayaran: ' + err.message });
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

  // Check if this is a package token purchase (order_id starts with LKS-PKG-)
  if (targetOrderId && targetOrderId.startsWith('LKS-PKG-')) {
    if (transaction_status === 'capture' || transaction_status === 'settlement') {
      if (fraud_status === 'accept' || !fraud_status) {
        // Activate the pending token
        const [tokenRows] = await db.query('SELECT * FROM package_tokens WHERE token_code = ?', [targetOrderId]);
        if (tokenRows.length > 0) {
          const token = tokenRows[0];
          await db.query('UPDATE package_tokens SET status = "ACTIVE" WHERE token_code = ?', [targetOrderId]);

          const waMsg = `🎉 *PEMBAYARAN PAKET LAKSAMANA BERHASIL!*\n\nHalo, pembayaran paket *${token.package_name}* Anda telah dikonfirmasi.\n\n🎟️ *KODE TOKEN ANDA:* \`${targetOrderId}\`\n• Kuota Cek: *${token.quota_total}x Cek Plagiasi*\n• Status: ✅ AKTIF\n\nGunakan Kode Token \`${targetOrderId}\` saat order di website Laksamana untuk *Skip Pembayaran*!\n🌐 https://laksamana.biz.id`;
          sendWhatsAppMessage(token.whatsapp, waMsg);
          console.log(`🎟️ [WEBHOOK] Package token ${targetOrderId} activated via Midtrans webhook.`);
        }
      }
    } else if (transaction_status === 'cancel' || transaction_status === 'deny' || transaction_status === 'expire') {
      await db.query('UPDATE package_tokens SET status = "EXPIRED" WHERE token_code = ?', [targetOrderId]);
      console.log(`❌ [WEBHOOK] Package token ${targetOrderId} marked as EXPIRED (payment ${transaction_status}).`);
    }
    return res.json({ status: 'OK' });
  }

  // Regular order processing (non-package)
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
        if (trnRes && trnRes.autoCompleted) {
          await db.query(`
            UPDATE orders 
            SET status = 'COMPLETED', similarity_index = ?, ai_score = ?, completed_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `, [trnRes.similarityIndex, trnRes.aiScore, order.id]);

          const fullDownloadUrl = `http://localhost:5000${order.report_download_url}`;
          sendWhatsAppMessage(order.whatsapp, getReportCompletedWATemplate(order, fullDownloadUrl), fullDownloadUrl);
        } else {
          console.log(`⏳ [WEBHOOK] Order ${order.id} set to PROCESSING (paid, awaiting Admin PDF upload).`);
          await db.query(`
            UPDATE orders 
            SET status = 'PROCESSING', admin_notes = 'Menunggu unggah laporan PDF Turnitin oleh Admin'
            WHERE id = ?
          `, [order.id]);
        }
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
  const orderId = req.params.id.trim();
  const db = getPool();
  try {
    const [rows] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);

    if (rows.length === 0) {
      return res.status(404).send('Laporan tidak ditemukan.');
    }

    const order = rows[0];

    if (order.status !== 'COMPLETED') {
      return res.status(400).send('Laporan hasil Turnitin/Drillbit belum tersedia. Dokumen Anda sedang dalam proses pemeriksaan.');
    }

    if (!order.report_download_url || order.report_download_url.endsWith('.txt')) {
      return res.status(400).send('File laporan PDF resmi belum diunggah oleh Admin.');
    }

    let relativePath = order.report_download_url.startsWith('/') ? order.report_download_url.slice(1) : order.report_download_url;
    let fullFilePath = path.join(__dirname, '..', relativePath);

    if (!fs.existsSync(fullFilePath)) {
      return res.status(404).send('File PDF laporan resmi tidak ditemukan pada server.');
    }

    const downloadFileName = `Hasil_Laksamana_${order.id}.pdf`;
    res.download(fullFilePath, downloadFileName);
  } catch (err) {
    res.status(500).send('Gagal mengunduh laporan: ' + err.message);
  }
});

module.exports = router;
