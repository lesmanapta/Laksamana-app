require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const { initDatabase } = require('./config/database');
const { startExpiryWorker } = require('./services/expiryWorker');
const authRoutes = require('./routes/auth');
const servicesRoutes = require('./routes/services');
const ordersRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// Restrict CORS to known origins only
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:3000',
  'https://laksamana.biz.id',
  'http://localhost:5173'
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting for auth routes (prevent brute force)
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // max 20 attempts per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.' }
});

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
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res) => {
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
