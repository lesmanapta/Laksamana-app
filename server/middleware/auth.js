const jwt = require('jsonwebtoken');
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

function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
      next();
    } else {
      return res.status(403).json({ error: 'Akses terlarang. Diperlukan hak akses Admin/Superadmin.' });
    }
  });
}

module.exports = { authMiddleware, adminMiddleware };
