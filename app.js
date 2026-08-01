// Laksamana App - cPanel Entry Point
// This file is the startup file for cPanel Node.js App Selector.
// It loads the server from the server/ subdirectory.

const path = require('path');

// Load .env from server folder if it exists there
const dotenvPath = path.join(__dirname, 'server', '.env');
require('dotenv').config({ path: dotenvPath });

// Also try loading .env from root folder
require('dotenv').config();

// Start the Express server
const express = require('express');
const cors = require('cors');
const fs = require('fs');

const { initDatabase } = require('./server/config/database');
const authRoutes = require('./server/routes/auth');
const servicesRoutes = require('./server/routes/services');
const ordersRoutes = require('./server/routes/orders');
const adminRoutes = require('./server/routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'server/uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/admin', adminRoutes);

// Health Check Endpoint
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

// Serve React Frontend (client/dist)
const clientBuildPath = path.join(__dirname, 'client/dist');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));

  // All non-API routes serve the React SPA
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    }
  });
}

// Initialize MySQL Database & Start Express Server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  🚀 LAKSAMANA SERVER RUNNING ON PORT: ${PORT}`);
    console.log(`  🗄️  Database: ${process.env.DB_NAME || 'db_laksamana'}`);
    console.log(`  💳 Midtrans: ${process.env.MIDTRANS_MERCHANT_ID || 'Not Set'}`);
    console.log(`  💬 WhatsApp Fonnte: ${process.env.WA_GATEWAY_TOKEN ? 'READY' : 'Not Set'}`);
    console.log(`====================================================`);
  });
});
