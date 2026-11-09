const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/dashboard/stats - real aggregate database statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await db.getDashboardStats(req.user.id);
    return res.json({
      success: true,
      stats
    });
  } catch (err) {
    console.error('[GET DASHBOARD STATS ERROR]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

