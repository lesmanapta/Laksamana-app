const axios = require('axios');

/**
 * WhatsApp Notification Service (Fonnte with Direct File Attachment Support)
 */
async function sendWhatsAppMessage(targetNumber, message, fileUrl = null) {
  const gatewayUrl = process.env.WA_GATEWAY_URL || 'https://api.fonnte.com/send';
  const apiToken = process.env.WA_GATEWAY_TOKEN;

  let formattedNumber = targetNumber.replace(/\D/g, '');
  if (formattedNumber.startsWith('0')) {
    formattedNumber = '62' + formattedNumber.slice(1);
  }

  if (!apiToken || apiToken.includes('YOUR_FONNTE')) {
    console.log(`\n====================================================`);
    console.log(`💬 [WHATSAPP SIMULATION LOG] Target: ${formattedNumber}`);
    if (fileUrl) console.log(`📎 Attachment Media URL: ${fileUrl}`);
    console.log(`📩 Message Content:\n${message}`);
    console.log(`====================================================\n`);
    return { success: true, simulated: true };
  }

  try {
    const payload = {
      target: formattedNumber,
      message: message
    };

    // If a file URL is provided, Fonnte will attach the PDF/file directly in WhatsApp chat
    if (fileUrl) {
      payload.url = fileUrl;
      payload.filename = `Hasil_Cek_Turnitin_${Date.now()}.txt`;
    }

    const response = await axios.post(gatewayUrl, payload, {
      headers: {
        'Authorization': apiToken,
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ [WHATSAPP SENT] Message & File sent to ${formattedNumber}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error(`❌ [WHATSAPP ERROR] Failed sending to ${formattedNumber}:`, error.message);
    return { success: false, error: error.message };
  }
}

function getOrderCreatedWATemplate(order) {
  return `*LAKSAMANA.ID - PESANAN DITERIMA* 🚀\n\nHalo, terima kasih telah melakukan pemesanan di *Laksamana.id*!\n\n📋 *Detail Pesanan:*\n• Kode Order : *${order.id}*\n• Layanan    : ${order.serviceName}\n• Nama File  : ${order.fileName}\n• Total      : Rp ${order.amount.toLocaleString('id-ID')}\n\nSilakan selesaikan pembayaran via Midtrans/QRIS. Lacak status pesanan kamu kapan saja di:\nhttp://localhost:3000`;
}

function getPaymentSuccessWATemplate(order) {
  return `*LAKSAMANA.ID - PEMBAYARAN BERHASIL* ✅\n\nPembayaran untuk Kode Order *${order.id}* telah terverifikasi!\n\nDokumen kamu (*${order.fileName}*) saat ini sedang diproses oleh sistem analisis Turnitin No-Repository Laksamana.\nEstimasi selesai: 1-3 Menit.`;
}

function getReportCompletedWATemplate(order, downloadUrl) {
  return `*LAKSAMANA.ID - HASIL ANALISIS TURNITIN SELESAI* 🎉\n\nHalo, dokumen kamu (*${order.fileName}*) telah selesai dicheck oleh Turnitin!\n\n📊 *Ringkasan Hasil:*\n• Kode Order        : *${order.id}*\n• Turnitin Similarity: *${order.result.similarityIndex}%*\n• GPTZero AI Score  : *${order.result.aiScore}%*\n\n📄 *File laporan PDF/TXT telah dilampirkan langsung pada pesan ini!*\n\nJika ingin mendownload via browser, klik tautan direct download di bawah:\n🔗 ${downloadUrl}\n\n_Note: File laporan tersimpan 24 jam._ Terima kasih telah menggunakan Laksamana!`;
}

module.exports = {
  sendWhatsAppMessage,
  getOrderCreatedWATemplate,
  getPaymentSuccessWATemplate,
  getReportCompletedWATemplate
};
