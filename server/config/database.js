const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'db_laksamana'
};

let pool;

async function seedDefaultUsers(poolConnection) {
  try {
    const salt = await bcrypt.genSalt(10);

    // 1. Super Admin Account: Lesmana.pta@gmail.com / Manto1909@
    const adminPassHash = await bcrypt.hash('Manto1909@', salt);
    await poolConnection.query(`
      INSERT INTO users (id, name, email, password, whatsapp, role, tokens, is_verified)
      VALUES ('usr_superadmin', 'Super Admin Lesmana', 'Lesmana.pta@gmail.com', ?, '08117676477', 'superadmin', 999, 1)
      ON DUPLICATE KEY UPDATE password = ?, role = 'superadmin', is_verified = 1;
    `, [adminPassHash, adminPassHash]);

    // 2. Regular User Account: sumantolesmana1909@gmail.com / Manto1909
    const userPassHash = await bcrypt.hash('Manto1909', salt);
    await poolConnection.query(`
      INSERT INTO users (id, name, email, password, whatsapp, role, tokens, is_verified)
      VALUES ('usr_regular', 'Sumanto Lesmana', 'sumantolesmana1909@gmail.com', ?, '081234567890', 'user', 5, 1)
      ON DUPLICATE KEY UPDATE password = ?, role = 'user', is_verified = 1;
    `, [userPassHash, userPassHash]);

    console.log(`🌱 [DATABASE SEEDER] Standard accounts seeded: Super Admin (Lesmana.pta@gmail.com) & User (sumantolesmana1909@gmail.com)`);
  } catch (err) {
    console.error(`⚠️ [DATABASE SEEDER NOTICE] Seeding info:`, err.message);
  }
}

async function initDatabase() {
  try {
    const rootConnection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password
    });

    await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\`;`);
    await rootConnection.end();

    pool = mysql.createPool({
      ...dbConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    console.log(`🗄️ [MYSQL DATABASE] Connected to database "${dbConfig.database}" at ${dbConfig.host}:${dbConfig.port}`);

    // Create 'users' table with 2 role standard (superadmin & user)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        whatsapp VARCHAR(30),
        role VARCHAR(20) DEFAULT 'user',
        tokens INT DEFAULT 1,
        is_verified INT DEFAULT 1,
        verification_code VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Create 'orders' table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(50) PRIMARY KEY,
        service_slug VARCHAR(50) NOT NULL,
        service_name VARCHAR(100) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(255),
        plagiarism_report_path VARCHAR(255),
        file_size INT DEFAULT 0,
        whatsapp VARCHAR(30) NOT NULL,
        email VARCHAR(100),
        payment_method VARCHAR(50),
        amount INT DEFAULT 0,
        status VARCHAR(30) DEFAULT 'PENDING_PAYMENT',
        similarity_index INT DEFAULT 0,
        ai_score INT DEFAULT 0,
        page_count INT DEFAULT 1,
        word_count INT DEFAULT 0,
        matched_sources JSON,
        filter_options JSON,
        report_download_url VARCHAR(255),
        admin_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Create dedicated 'transactions' table for Midtrans payment attempts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(100) PRIMARY KEY,
        order_id VARCHAR(50) NOT NULL,
        amount INT DEFAULT 0,
        payment_type VARCHAR(50) DEFAULT 'gopay_qris',
        snap_token VARCHAR(255),
        snap_redirect_url VARCHAR(255),
        status VARCHAR(30) DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (order_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Create 'package_tokens' table for Paket Laksamana & Coupon System
    await pool.query(`
      CREATE TABLE IF NOT EXISTS package_tokens (
        token_code VARCHAR(50) PRIMARY KEY,
        package_id VARCHAR(50) NOT NULL,
        package_name VARCHAR(100) NOT NULL,
        user_email VARCHAR(100),
        whatsapp VARCHAR(30),
        quota_total INT DEFAULT 1,
        quota_remaining INT DEFAULT 1,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        expires_at TIMESTAMP NULL DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    try {
      await pool.query('ALTER TABLE orders ADD COLUMN completed_at TIMESTAMP NULL DEFAULT NULL;');
    } catch (e) {}
    try {
      await pool.query('ALTER TABLE orders ADD COLUMN filter_options JSON NULL;');
    } catch (e) {}

    // Run automatic seeder for default accounts
    await seedDefaultUsers(pool);

  } catch (error) {
    console.error(`❌ [MYSQL DATABASE ERROR] Failed initializing database:`, error.message);
  }
}

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      ...dbConfig,
      waitForConnections: true,
      connectionLimit: 10
    });
  }
  return pool;
}

module.exports = {
  initDatabase,
  getPool,
  seedDefaultUsers
};
