const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');
const {
  broadcastNewComment,
  broadcastCommentUpdated,
  broadcastCommentDeleted,
  sendDirectNotification
} = require('../socket/socketHandler');

router.use(authMiddleware);

// GET /api/tasks/:taskId/comments - get comments in chronological order
router.get('/tasks/:taskId/comments', async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await db.getTaskById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const role = await db.getUserRoleInProject(task.project_id, req.user.id);
    if (!role) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const comments = await db.getCommentsByTask(taskId);
    return res.json({ success: true, comments });
  } catch (err) {
    console.error('[GET COMMENTS ERROR]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/tasks/:taskId/comments - add new comment
router.post('/tasks/:taskId/comments', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Comment content cannot be empty.' });
    }

    const task = await db.getTaskById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const role = await db.getUserRoleInProject(task.project_id, req.user.id);
    if (!role) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const comment = await db.createComment({
      taskId,
      userId: req.user.id,
      content: content.trim()
    });

    // Record activity
    await db.createActivity({
      projectId: task.project_id,
      userId: req.user.id,
      action: 'commented_on_task',
      details: { taskId, title: task.title, commentSnippet: content.slice(0, 50) }
    });

    // Notify assignee or creator if different from commenter
    const notifyTargets = new Set();
    if (task.assignee_id && task.assignee_id !== req.user.id) {
      notifyTargets.add(task.assignee_id);
    }
    if (task.created_by && task.created_by !== req.user.id) {
      notifyTargets.add(task.created_by);
    }

    for (const targetUserId of notifyTargets) {
      const notif = await db.createNotification({
        userId: targetUserId,
        actorId: req.user.id,
        type: 'new_comment',
        title: 'New Comment',
        message: `${req.user.full_name} commented on "${task.title}": "${content.slice(0, 40)}${content.length > 40 ? '...' : ''}"`,
        link: `#/tasks/${taskId}`
      });
      sendDirectNotification(targetUserId, notif);
    }

    // Broadcast new comment to all users in project room via WebSockets
    broadcastNewComment(task.project_id, taskId, comment, req.user);

    return res.status(201).json({
      success: true,
      message: 'Comment added successfully.',
      comment
    });
  } catch (err) {
    console.error('[CREATE COMMENT ERROR]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/comments/:commentId - edit own comment
router.put('/comments/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Comment content cannot be empty.' });
    }

    const existing = await db.getCommentById(commentId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Comment not found.' });
    }

    if (existing.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only edit your own comments.' });
    }

    const task = await db.getTaskById(existing.task_id);
    const updated = await db.updateComment(commentId, content.trim());

    if (task) {
      broadcastCommentUpdated(task.project_id, task.id, updated, req.user);
    }

    return res.json({
      success: true,
      message: 'Comment updated.',
      comment: updated
    });
  } catch (err) {
    console.error('[UPDATE COMMENT ERROR]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/comments/:commentId - delete comment
router.delete('/comments/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;
    const existing = await db.getCommentById(commentId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Comment not found.' });
    }

    const task = await db.getTaskById(existing.task_id);
    const role = task ? await db.getUserRoleInProject(task.project_id, req.user.id) : null;

    // Allowed if author OR project admin/owner
    const isAuthor = existing.user_id === req.user.id;
    const isAdmin = role === 'owner' || role === 'admin';

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Permission denied to delete this comment.' });
    }

    await db.deleteComment(commentId);

    if (task) {
      broadcastCommentDeleted(task.project_id, task.id, commentId, req.user);
    }

    return res.json({
      success: true,
      message: 'Comment deleted successfully.'
    });
  } catch (err) {
    console.error('[DELETE COMMENT ERROR]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

