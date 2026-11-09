const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/notifications - get current user's notifications
router.get('/', async (req, res) => {
  try {
    const notifications = await db.getNotificationsByUser(req.user.id);
    const unreadCount = await db.getUnreadNotificationCount(req.user.id);
    return res.json({ success: true, notifications, unreadCount });
  } catch (err) {
    console.error('[GET NOTIFICATIONS ERROR]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/notifications/count - get unread count
router.get('/count', async (req, res) => {
  try {
    const unreadCount = await db.getUnreadNotificationCount(req.user.id);
    return res.json({ success: true, count: unreadCount });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/notifications/:id/read - mark single notification as read
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await db.markNotificationAsRead(id, req.user.id);
    const unreadCount = await db.getUnreadNotificationCount(req.user.id);
    return res.json({ success: true, notification: updated, unreadCount });
  } catch (err) {
    console.error('[MARK NOTIFICATION READ ERROR]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/notifications/read-all - mark all notifications as read
router.post('/read-all', async (req, res) => {
  try {
    await db.markAllNotificationsAsRead(req.user.id);
    return res.json({ success: true, message: 'All notifications marked as read.', unreadCount: 0 });
  } catch (err) {
    console.error('[MARK ALL NOTIFICATIONS READ ERROR]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

