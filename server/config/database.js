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

    // Create 'users' table
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

    // Create 'orders' table with completed_at timestamp column
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
        report_download_url VARCHAR(255),
        admin_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure completed_at column exists if table was previously created
    try {
      await pool.query('ALTER TABLE orders ADD COLUMN completed_at TIMESTAMP NULL DEFAULT NULL;');
    } catch (e) {}

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
  getPool
};
