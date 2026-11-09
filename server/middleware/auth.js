const { verifyToken } = require('../utils/jwt');
const db = require('../config/db');

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded || !decoded.id) {
      return res.status(401).json({ success: false, message: 'Invalid or expired session. Please log in again.' });
    }

    const profile = await db.getProfileById(decoded.id);
    if (!profile) {
      return res.status(401).json({ success: false, message: 'User profile not found.' });
    }

    req.user = profile;
    next();
  } catch (err) {
    console.error('[TASKORA AUTH] Auth error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error during authentication.' });
  }
}

module.exports = authMiddleware;
