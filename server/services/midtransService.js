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
 * 
 * THROWS an error if the Midtrans API call fails — caller must handle it.
 */
async function createMidtransTransaction(order, transactionId) {
  const midtransOrderId = transactionId || `TRX-${Math.floor(100000 + Math.random() * 900000)}-${Date.now().toString().slice(-4)}`;
  console.log(`💳 [MIDTRANS SERVICE] Initializing Snap Transaction for Transaction ID: ${midtransOrderId} (Order ID: ${order.id})`);
  console.log(`💳 [MIDTRANS SERVICE] Amount: ${order.amount}, Service: ${order.serviceName}, IsProduction: ${isProduction}`);

  const safeAmount = Math.max(1, parseInt(order.amount) || 10000);

  const parameter = {
    transaction_details: {
      order_id: midtransOrderId,
      gross_amount: safeAmount
    },
    customer_details: {
      first_name: 'Pelanggan',
      last_name: 'Laksamana',
      email: order.email || 'customer@laksamana.id',
      phone: order.whatsapp || '081234567890'
    },
    item_details: [
      {
        id: (order.serviceSlug || 'cek-plagiasi').substring(0, 50),
        price: safeAmount,
        quantity: 1,
        name: (order.serviceName || 'Cek Plagiasi No-Repository').substring(0, 50)
      }
    ],
    enabled_payments: ['gopay', 'qris', 'bank_transfer', 'shopeepay']
  };

  if (!serverKey || serverKey.includes('YOUR_SERVER_KEY')) {
    console.log(`⚠️ [MIDTRANS NOTICE] Server key not configured. Midtrans payment cannot be processed.`);
    throw new Error('Midtrans server key belum dikonfigurasi. Hubungi admin.');
  }

  try {
    const snapRes = await snap.createTransaction(parameter);
    console.log(`✅ [MIDTRANS SERVICE] Snap Token created successfully: ${snapRes.token.substring(0, 20)}...`);

    return {
      midtransOrderId,
      snapToken: snapRes.token,
      redirectUrl: snapRes.redirect_url
    };
  } catch (error) {
    console.error(`❌ [MIDTRANS ERROR] Failed creating transaction for ${midtransOrderId}:`, error.message);
    console.error(`❌ [MIDTRANS ERROR] Parameters:`, JSON.stringify(parameter, null, 2));
    // Throw the error so the caller can handle it properly
    throw new Error(`Midtrans payment error: ${error.message}`);
  }
}

module.exports = { createMidtransTransaction };
