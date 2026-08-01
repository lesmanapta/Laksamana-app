require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Optional rate limiting - gracefully skip if package not installed
let rateLimit;
try {
  rateLimit = require('express-rate-limit');
} catch (e) {
  console.warn('⚠️ express-rate-limit not installed. Rate limiting disabled.');
  rateLimit = null;
}

const { initDatabase } = require('./config/database');
const { startExpiryWorker } = require('./services/expiryWorker');
const authRoutes = require('./routes/auth');
const servicesRoutes = require('./routes/services');
const ordersRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting for auth routes (prevent brute force)
const authRateLimiter = rateLimit
  ? rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 20,                   // max 20 attempts per 15 min per IP
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.' }
    })
  : (req, res, next) => next(); // Passthrough if not installed

// Static file uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    system: 'Laksamana MySQL Backend Server', 
    database: process.env.DB_NAME || 'db_laksamana',
    midtransConfigured: !!process.env.MIDTRANS_SERVER_KEY,
    whatsappConfigured: !!process.env.WA_GATEWAY_TOKEN,
    time: new Date().toISOString() 
  });
});

const clientBuildPath = path.join(__dirname, '../client/dist');
if (require('fs').existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath, {
    setHeaders: (res, filepath) => {
      if (filepath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    }
  }));

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint tidak ditemukan' });
    }
    if (/\.[a-zA-Z0-9]+$/.test(req.path)) {
      return res.status(404).send('Asset Not Found');
    }
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Initialize MySQL Database & Start Express Server
initDatabase().then(() => {
  // Start background payment timeout monitor (30 minutes)
  startExpiryWorker();

  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  🚀 LAKSAMANA BACKEND SERVER RUNNING ON PORT: ${PORT} `);
    console.log(`  🗄️ Database: MySQL (http://localhost/phpmyadmin -> db_laksamana)`);
    console.log(`  👨‍💻 Admin API: http://localhost:${PORT}/api/admin/orders`);
    console.log(`  💳 Midtrans Gateway: READY (Merchant ID: ${process.env.MIDTRANS_MERCHANT_ID})`);
    console.log(`  💬 WhatsApp Fonnte: READY (Token Set)`);
    console.log(`  ⏰ Payment Expiry Worker: ACTIVE (30-minute timeout)`);
    console.log(`====================================================`);
  });
});
