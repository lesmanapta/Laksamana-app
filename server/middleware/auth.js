const jwt = require('jsonwebtoken');
const { getPool } = require('../config/database');
const JWT_SECRET = process.env.JWT_SECRET || 'laksamana_super_secret_jwt_key_2026';

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Akses ditolak. Token autentikasi tidak tersedia.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token tidak valid atau telah kedaluwarsa.' });
  }
}

// Admin middleware: verifies JWT then checks role from DATABASE (not JWT payload)
// This ensures role changes take effect without requiring re-login
async function adminMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Akses ditolak. Token autentikasi tidak tersedia.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Always verify role from database for freshest data
    const db = getPool();
    const [rows] = await db.query('SELECT id, role FROM users WHERE id = ?', [decoded.id]);
    if (rows.length === 0) {
      return res.status(403).json({ error: 'Pengguna tidak ditemukan.' });
    }
    const dbRole = rows[0].role;
    if (dbRole !== 'admin' && dbRole !== 'superadmin') {
      return res.status(403).json({ error: 'Akses terlarang. Diperlukan hak akses Admin/Superadmin.' });
    }
    req.user = { ...decoded, role: dbRole };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token tidak valid atau telah kedaluwarsa.' });
  }
}

module.exports = { authMiddleware, adminMiddleware };

