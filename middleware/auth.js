const db = require('../database/db');

function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Sesi berakhir atau belum login' });
  }
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'Sesi berakhir atau belum login' });
    }
    if (req.session.user.role !== role) {
      return res.status(403).json({ error: 'Akses ditolak: hak akses tidak mencukupi' });
    }
    next();
  };
}

function requireActiveShift(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Sesi berakhir atau belum login' });
  }
  
  // Find open shift for this user
  const shift = db.prepare(`
    SELECT * FROM shifts 
    WHERE user_id = ? AND status = 'open' 
    ORDER BY id DESC LIMIT 1
  `).get(req.session.user.id);

  if (!shift) {
    return res.status(400).json({ 
      error: 'Tidak ada shift aktif yang terbuka. Silakan mulai shift terlebih dahulu.' 
    });
  }

  req.activeShift = shift;
  next();
}

module.exports = {
  requireAuth,
  requireRole,
  requireActiveShift
};
