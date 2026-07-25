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

const coreApi = new midtransClient.CoreApi({
  isProduction: isProduction,
  serverKey: serverKey,
  clientKey: clientKey
});

/**
 * Creates Midtrans Transaction with unique sub-order ID to prevent Midtrans 'ongoing payment' duplicate errors.
 */
async function createMidtransTransaction(order) {
  // Append timestamp to ensure Midtrans receives a unique order_id on every retry
  const midtransOrderId = `${order.id}-${Date.now()}`;
  console.log(`💳 [MIDTRANS SERVICE] Creating transaction for Midtrans Order ID: ${midtransOrderId} (Base: ${order.id})`);

  const parameter = {
    payment_type: 'gopay',
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
    ]
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
    // 1. Create Core API charge to extract direct QR Code Image URL
    try {
      const chargeRes = await coreApi.charge(parameter);
      if (chargeRes.actions && Array.isArray(chargeRes.actions)) {
        const qrAction = chargeRes.actions.find(a => a.name === 'generate-qr-code');
        if (qrAction && qrAction.url) {
          qrImageUrl = qrAction.url;
        }
      }
      if (chargeRes.qr_string) {
        rawQrString = chargeRes.qr_string;
      }
    } catch (e) {
      console.log(`ℹ️ [MIDTRANS CORE API INFO] Fallback to Snap Transaction...`);
    }

    // 2. Create Snap Transaction Token
    const snapRes = await snap.createTransaction({
      transaction_details: parameter.transaction_details,
      customer_details: parameter.customer_details,
      item_details: parameter.item_details,
      enabled_payments: ['gopay', 'qris', 'bank_transfer', 'shopeepay']
    });

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
