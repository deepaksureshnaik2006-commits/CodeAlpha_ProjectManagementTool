const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { generateToken } = require('../utils/jwt');
const authMiddleware = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName, avatarUrl } = req.body;
    if (!email || !password || !fullName) {
      return res.status(400).json({ success: false, message: 'Full name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const profile = await db.registerUser({ email, password, fullName, avatarUrl });
    const token = generateToken({ id: profile.id, email: profile.email });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully! Please verify your email or continue to dashboard.',
      token,
      user: profile
    });
  } catch (err) {
    console.error('[AUTH REGISTER ERROR]', err);
    return res.status(400).json({ success: false, message: err.message || 'Registration failed.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const { user, session } = await db.authenticateUser({ email, password });
    const token = generateToken({ id: user.id, email: user.email });

    return res.json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user
    });
  } catch (err) {
    console.error('[AUTH LOGIN ERROR]', err);
    return res.status(401).json({ success: false, message: err.message || 'Invalid credentials.' });
  }
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, (req, res) => {
  return res.json({ success: true, message: 'Logged out successfully.' });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const result = await db.requestPasswordReset(email);
    return res.json(result);
  } catch (err) {
    console.error('[AUTH FORGOT PASSWORD ERROR]', err);
    return res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    const result = await db.resetPasswordWithToken({ email, token, newPassword });
    return res.json(result);
  } catch (err) {
    console.error('[AUTH RESET PASSWORD ERROR]', err);
    return res.status(400).json({ success: false, message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  return res.json({
    success: true,
    user: req.user
  });
});

// PUT /api/auth/profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { fullName, avatarUrl } = req.body;
    const updated = await db.updateProfile(req.user.id, { fullName, avatarUrl });
    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: updated
    });
  } catch (err) {
    console.error('[AUTH UPDATE PROFILE ERROR]', err);
    return res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', authMiddleware, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ success: false, message: 'New password is required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    await db.changePassword(req.user.id, { newPassword });
    return res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    console.error('[AUTH CHANGE PASSWORD ERROR]', err);
    return res.status(400).json({ success: false, message: err.message });
  }
});

// GET /api/auth/users/search
router.get('/users/search', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    const profiles = await db.searchProfiles(q, req.user.id);
    return res.json({ success: true, users: profiles });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

