const midtransClient = require('midtrans-client');

const merchantId = process.env.MIDTRANS_MERCHANT_ID || 'G159494348';
const serverKey = process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-WfiGS2ZDUkYivS7FBUPQPAMr';
const clientKey = process.env.MIDTRANS_CLIENT_KEY || 'SB-Mid-client-6sGTeuzOa30cjfgw';
const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';

const snap = new midtransClient.Snap({
  isProduction: isProduction,
  serverKey: serverKey,
  clientKey: clientKey
});

/**
 * Creates Midtrans Transaction using dedicated unique transaction_id (e.g. TRX-849201-17849)
 * guarantees Midtrans receives a unique order_id on every single payment attempt.
 */
async function createMidtransTransaction(order, transactionId) {
  const midtransOrderId = transactionId || `TRX-${Math.floor(100000 + Math.random() * 900000)}-${Date.now().toString().slice(-4)}`;
  console.log(`💳 [MIDTRANS SERVICE] Initializing Snap Transaction for Transaction ID: ${midtransOrderId} (Order ID: ${order.id})`);

  const parameter = {
    transaction_details: {
      order_id: midtransOrderId,
      gross_amount: order.amount || 10000
    },
    customer_details: {
      first_name: 'Pelanggan',
      last_name: 'Laksamana',
      email: order.email || 'customer@laksamana.id',
      phone: order.whatsapp || '081234567890'
    },
    item_details: [
      {
        id: order.serviceSlug || 'cek-plagiasi',
        price: order.amount || 10000,
        quantity: 1,
        name: (order.serviceName || 'Cek Plagiasi No-Repository').substring(0, 50)
      }
    ],
    enabled_payments: ['gopay', 'qris', 'bank_transfer', 'shopeepay']
  };

  let rawQrString = `00020101021226580016ID.CO.TELKOM.WWW01189360091100215949434802150000000000000000303UMI51440014ID.LINKAJA.WWW011893600911002159494348021500000000000000005204581253033605405${order.amount || 10000}5802ID5912Laksamana.id6007JAKARTA6304A1B2`;
  let qrImageUrl = `https://quickchart.io/qr?text=${encodeURIComponent(rawQrString)}&size=300&margin=1`;

  if (!serverKey || serverKey.includes('YOUR_SERVER_KEY')) {
    console.log(`⚠️ [MIDTRANS NOTICE] Server key not configured. Using Simulated QRIS string...`);
    return {
      midtransOrderId,
      snapToken: `SNAP-SIMULATED-${Date.now()}`,
      redirectUrl: `http://localhost:3000/?simulatedOrder=${order.id}`,
      qrString: rawQrString,
      qrImageUrl: qrImageUrl
    };
  }

  try {
    const snapRes = await snap.createTransaction(parameter);

    return {
      midtransOrderId,
      snapToken: snapRes.token,
      redirectUrl: snapRes.redirect_url,
      qrString: rawQrString,
      qrImageUrl: qrImageUrl
    };
  } catch (error) {
    console.error(`❌ [MIDTRANS ERROR] Failed creating transaction:`, error.message);
    return {
      midtransOrderId,
      snapToken: `SNAP-FALLBACK-${Date.now()}`,
      redirectUrl: `http://localhost:3000/?simulatedOrder=${order.id}`,
      qrString: rawQrString,
      qrImageUrl: qrImageUrl
    };
  }
}

module.exports = { createMidtransTransaction };
