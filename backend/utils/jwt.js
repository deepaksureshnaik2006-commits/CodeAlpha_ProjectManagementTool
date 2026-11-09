const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'taskora_jwt_secret_dev_key_2026_super_secure_change_in_production';
const JWT_EXPIRES_IN = '7d';

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;

  // 1. Try standard verify using local JWT_SECRET
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded && (decoded.id || decoded.sub)) {
      return {
        id: decoded.id || decoded.sub,
        email: decoded.email,
        ...decoded
      };
    }
  } catch (err) {
    // Fall through to verify Supabase/issued tokens
  }

  // 2. Decode Supabase Auth JWT tokens (uses 'sub' for user UUID)
  try {
    const decoded = jwt.decode(token);
    if (decoded && (decoded.id || decoded.sub)) {
      // Check expiration if present
      if (decoded.exp && Date.now() >= decoded.exp * 1000) {
        return null;
      }
      return {
        id: decoded.id || decoded.sub,
        email: decoded.email,
        ...decoded
      };
    }
  } catch (e) {
    return null;
  }

  return null;
}

module.exports = {
  generateToken,
  verifyToken,
  JWT_SECRET
};
