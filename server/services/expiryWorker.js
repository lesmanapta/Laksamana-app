const { getPool } = require('../config/database');

/**
 * Auto-cancels orders and package tokens in PENDING_PAYMENT / PENDING status 
 * if they exceed the 30-minute payment time limit.
 */
async function checkAndCancelExpiredTransactions() {
  try {
    const db = getPool();
    if (!db) return;

    // 1. Cancel orders pending payment for > 30 minutes
    const [resultOrders] = await db.query(`
      UPDATE orders 
      SET status = 'FAILED', 
          admin_notes = 'Transaksi otomatis dibatalkan: Pembayaran melebihi batas waktu 30 menit' 
      WHERE status = 'PENDING_PAYMENT' 
        AND created_at < NOW() - INTERVAL 30 MINUTE
    `);

    if (resultOrders && resultOrders.affectedRows > 0) {
      console.log(`⏰ [EXPIRY WORKER] Automatically cancelled ${resultOrders.affectedRows} orders (Payment timeout > 30 minutes).`);
    }

    // 2. Expire pending package tokens for > 30 minutes
    const [resultTokens] = await db.query(`
      UPDATE package_tokens 
      SET status = 'EXHAUSTED' 
      WHERE status = 'PENDING' 
        AND created_at < NOW() - INTERVAL 30 MINUTE
    `);

    if (resultTokens && resultTokens.affectedRows > 0) {
      console.log(`⏰ [EXPIRY WORKER] Automatically expired ${resultTokens.affectedRows} pending package tokens (Payment timeout > 30 minutes).`);
    }

  } catch (err) {
    console.error('❌ [EXPIRY WORKER ERROR]:', err.message);
  }
}

/**
 * Starts background interval checking every 60 seconds
 */
function startExpiryWorker(intervalMs = 60000) {
  // Run once immediately on start
  checkAndCancelExpiredTransactions();

  // Run on interval
  setInterval(() => {
    checkAndCancelExpiredTransactions();
  }, intervalMs);

  console.log(`⏰ [EXPIRY WORKER INIT] 30-minute payment timeout monitor active (Checks every 60s).`);
}

module.exports = {
  checkAndCancelExpiredTransactions,
  startExpiryWorker
};
