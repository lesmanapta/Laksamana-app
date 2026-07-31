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

async function seedDefaultData(poolConnection) {
  try {
    const salt = await bcrypt.genSalt(10);

    // 1. Super Admin Account: Lesmana.pta@gmail.com / Manto1909@
    const adminPassHash = await bcrypt.hash('Manto1909@', salt);
    await poolConnection.query(`
      INSERT INTO users (id, name, email, password, whatsapp, role, tokens, is_verified)
      VALUES ('usr_superadmin', 'Sumanto Lesmana Putra', 'Lesmana.pta@gmail.com', ?, '08117676477', 'superadmin', 999, 1)
      ON DUPLICATE KEY UPDATE password = ?, role = 'superadmin', is_verified = 1;
    `, [adminPassHash, adminPassHash]);

    // 2. Regular User Account: sumantolesmana1909@gmail.com / Manto1909
    const userPassHash = await bcrypt.hash('Manto1909', salt);
    await poolConnection.query(`
      INSERT INTO users (id, name, email, password, whatsapp, role, tokens, is_verified)
      VALUES ('usr_regular', 'Sumanto Lesmana', 'sumantolesmana1909@gmail.com', ?, '081234567890', 'user', 5, 1)
      ON DUPLICATE KEY UPDATE password = ?, role = 'user', is_verified = 1;
    `, [userPassHash, userPassHash]);

    // 3. Seed Default Services
    const [existingServices] = await poolConnection.query('SELECT COUNT(*) as count FROM services');
    if (existingServices[0].count === 0) {
      await poolConnection.query(`
        INSERT INTO services (id, slug, title, subtitle, icon, price, unit, max_pages, description, active) VALUES
        ('cek-plagiasi', 'cek-plagiasi', 'Cek Plagiasi No-Repository', 'Deteksi plagiarisme dokumen via Turnitin', 'ri-file-line', 10000, 'file', 800, 'Pengecekan keaslian tulisan cepat 24 jam tanpa menyimpan dokumen ke repository Turnitin.', 1),
        ('cek-drillbit', 'cek-drillbit', 'Cek Drillbit (Per Kata)', 'Cek plagiarisme komprehensif dengan Drillbit', 'ri-file-search-line', 10, 'kata', 500, 'Solusi pemeriksaan plagiasi jurnal & skripsi berbasis algoritma Drillbit (Tarif Rp 10/kata).', 1),
        ('parafrase', 'parafrase', 'Jasa Parafrase', 'Ubah teks tanpa menghilangkan makna asli', 'ri-loop-left-line', 35000, 'halaman', 100, 'Layanan penulisan ulang profesional untuk menurunkan skor Turnitin secara signifikan.', 1),
        ('gptzero', 'gptzero', 'Cek AI GPTZero', 'Deteksi tulisan buatan AI (ChatGPT, Claude, Gemini)', 'ri-search-eye-line', 15000, 'file', 300, 'Analisis mendalam persentase konten buatan AI dengan laporan skor probabilitas detail.', 0),
        ('humanizer', 'humanizer', 'Humanize File AI GPTZero', 'Ubah teks AI menjadi terasa sangat manusiawi', 'ri-robot-2-line', 25000, 'file', 200, 'Menghilangkan pola sintaksis buatan AI sehingga lolos deteksi GPTZero dan Turnitin AI.', 0);
      `);
      console.log('🌱 [DATABASE SEEDER] Default services inserted into MySQL.');
    }

    // 4. Seed Default Packages
    const [existingPackages] = await poolConnection.query('SELECT COUNT(*) as count FROM packages');
    if (existingPackages[0].count === 0) {
      await poolConnection.query(`
        INSERT INTO packages (id, name, validity, price, target_audience, quota, benefits, active) VALUES
        ('pkg_hemat_3x', 'Paket Hemat Laksamana (3x Cek)', '7 hari', 27500, 'Buat kamu yang lagi ngebut nyelesein tugas biar selesai tepat waktu', 3, '["Skip menu pembayaran", "Bisa cek sampai 800 halaman/file", "Dapet token 3x cek plagiasi", "Hasil langsung dikirim ke WhatsApp"]', 1),
        ('pkg_praktis_10x', 'Paket Praktis Laksamana (10x Cek)', '14 hari', 89500, 'Buat kamu deadliners yang lagi ngerjain revisian dan nugas', 10, '["Skip menu pembayaran", "Bisa cek sampai 800 halaman/file", "Dapet token 10x cek plagiasi", "Hasil langsung dikirim ke WhatsApp"]', 1),
        ('pkg_pro_25x', 'Paket Sultan Laksamana (25x Cek)', '30 hari', 199000, 'Cocok buat bimbingan skripsi kelompok atau jasa pengetikan', 25, '["Skip menu pembayaran & antrean instant", "Bisa cek sampai 800 halaman/file", "Dapet token 25x cek plagiasi", "Laporan PDF + Highlight Sumber Lengkap"]', 1);
      `);
      console.log('🌱 [DATABASE SEEDER] Default packages inserted into MySQL.');
    }

    console.log(`🌱 [DATABASE SEEDER] All default accounts, services, and packages seeded in MySQL.`);
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

    // 1. Create 'users' table
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

    // 2. Create 'services' table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS services (
        id VARCHAR(50) PRIMARY KEY,
        slug VARCHAR(50) UNIQUE NOT NULL,
        title VARCHAR(100) NOT NULL,
        subtitle VARCHAR(255),
        icon VARCHAR(50) DEFAULT 'ri-file-line',
        price INT NOT NULL DEFAULT 10000,
        unit VARCHAR(20) DEFAULT 'file',
        max_pages INT DEFAULT 800,
        description TEXT,
        active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 3. Create 'packages' table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS packages (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        validity VARCHAR(50) DEFAULT '7 hari',
        price INT NOT NULL DEFAULT 27500,
        target_audience TEXT,
        quota INT DEFAULT 3,
        benefits JSON,
        active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 4. Create 'orders' table
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

    // 5. Create dedicated 'transactions' table for Midtrans payment attempts
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

    // 6. Create 'package_tokens' table for Paket Laksamana & Coupon System
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

    // Run automatic seeder for default accounts, services, and packages
    await seedDefaultData(pool);

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
  seedDefaultData
};
