const axios = require('axios');

/**
 * WhatsApp Notification Service (Fonnte with Direct PDF File Attachment Support)
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

    // If a file URL is provided, Fonnte will attach the PDF directly in WhatsApp chat
    if (fileUrl) {
      payload.url = fileUrl;
      payload.filename = `Hasil_Laksamana_${Date.now()}.pdf`;
    }

    const response = await axios.post(gatewayUrl, payload, {
      headers: {
        'Authorization': apiToken,
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ [WHATSAPP SENT] Message & PDF sent to ${formattedNumber}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error(`❌ [WHATSAPP ERROR] Failed sending to ${formattedNumber}:`, error.message);
    return { success: false, error: error.message };
  }
}

function getOrderCreatedWATemplate(order) {
  const domainUrl = process.env.APP_URL || 'https://laksamana.biz.id';
  return `*LAKSAMANA.ID - PESANAN DITERIMA* 🚀\n\nHalo, terima kasih telah melakukan pemesanan di *Laksamana.id*!\n\n📋 *Detail Pesanan:*\n• Kode Order : *${order.id}*\n• Layanan    : ${order.serviceName}\n• Nama File  : ${order.fileName}\n• Total      : Rp ${order.amount.toLocaleString('id-ID')}\n\nSilakan selesaikan pembayaran via Midtrans/QRIS. Lacak status pesanan kamu kapan saja di:\n${domainUrl}`;
}

function getPaymentSuccessWATemplate(order) {
  return `*LAKSAMANA.ID - PEMBAYARAN BERHASIL* ✅\n\nPembayaran untuk Kode Order *${order.id}* telah terverifikasi!\n\nDokumen kamu (*${order.fileName}*) saat ini sedang diproses oleh sistem analisis Turnitin No-Repository Laksamana.\nEstimasi selesai: 1-3 Menit.`;
}

function getReportCompletedWATemplate(order, downloadUrl) {
  return `*LAKSAMANA.ID - HASIL ANALISIS SELESAI* 🎉\n\nHalo, dokumen kamu (*${order.fileName}*) telah selesai diproses!\n\n📊 *Ringkasan Hasil:*\n• Kode Order        : *${order.id}*\n• Turnitin Similarity: *${order.result.similarityIndex}%*\n• AI Content Score  : *${order.result.aiScore}%*\n\n📄 *Klik tautan di bawah ini untuk langsung mengunduh file PDF Laporan Resmi:* \n${downloadUrl}\n\n_Note: File laporan tersimpan di server Laksamana._ Terima kasih!`;
}

module.exports = {
  sendWhatsAppMessage,
  getOrderCreatedWATemplate,
  getPaymentSuccessWATemplate,
  getReportCompletedWATemplate
};
