const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');
const { requireProjectMember } = require('../middleware/projectAuth');

router.use(authMiddleware);

// GET /api/activities/project/:projectId - get project activities
router.get('/project/:projectId', requireProjectMember, async (req, res) => {
  try {
    const activities = await db.getActivitiesByProject(req.projectId);
    return res.json({ success: true, activities });
  } catch (err) {
    console.error('[GET ACTIVITIES ERROR]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

