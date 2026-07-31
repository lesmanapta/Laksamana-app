const midtransClient = require('midtrans-client');

const merchantId = (process.env.MIDTRANS_MERCHANT_ID || 'G159494348').trim();
const serverKey = (process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-WfiGS2ZDUkYivS7FBUPQPAMr').trim();
const clientKey = (process.env.MIDTRANS_CLIENT_KEY || 'SB-Mid-client-6sGTeuzOa30cjfgw').trim();

// Auto-detect environment: Sandbox keys start with 'SB-', Production keys start with 'Mid-'
const isProduction = serverKey.startsWith('SB-') ? false : (process.env.MIDTRANS_IS_PRODUCTION === 'true');

console.log(`💳 [MIDTRANS INIT] Merchant ID: ${merchantId}, ServerKey: ${serverKey.slice(0, 10)}..., IsProduction: ${isProduction}`);

const snap = new midtransClient.Snap({
  isProduction: isProduction,
  serverKey: serverKey,
  clientKey: clientKey
});

/**
 * Creates Midtrans Transaction using dedicated unique transaction_id
 */
async function createMidtransTransaction(order, transactionId) {
  const midtransOrderId = transactionId || `TRX-${Math.floor(100000 + Math.random() * 900000)}-${Date.now().toString().slice(-4)}`;
  console.log(`💳 [MIDTRANS SERVICE] Creating Snap Transaction: ${midtransOrderId} (Order ID: ${order.id}), Amount: ${order.amount}, IsProduction: ${isProduction}`);

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
    enabled_payments: ['gopay', 'qris', 'bank_transfer', 'shopeepay'],
    expiry: {
      expiry_duration: 30,
      unit: 'minute'
    }
  };

  try {
    const snapRes = await snap.createTransaction(parameter);
    console.log(`✅ [MIDTRANS SERVICE] Snap Token created successfully: ${snapRes.token.substring(0, 20)}...`);

    return {
      midtransOrderId,
      snapToken: snapRes.token,
      redirectUrl: snapRes.redirect_url,
      error: null
    };
  } catch (error) {
    console.error(`❌ [MIDTRANS ERROR] Failed creating transaction for ${midtransOrderId}:`, error.message);
    
    // Return error info gracefully so order creation doesn't crash 500
    return {
      midtransOrderId,
      snapToken: null,
      redirectUrl: null,
      error: error.message
    };
  }
}

module.exports = { createMidtransTransaction };
