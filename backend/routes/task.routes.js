const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');
const {
  broadcastTaskCreated,
  broadcastTaskUpdated,
  broadcastTaskDeleted,
  broadcastTaskStatusChanged,
  broadcastTaskAssigned,
  sendDirectNotification
} = require('../socket/socketHandler');

router.use(authMiddleware);

// GET /api/projects/:projectId/tasks - get all tasks for a project
router.get('/projects/:projectId/tasks', async (req, res) => {
  try {
    const { projectId } = req.params;
    const role = await db.getUserRoleInProject(projectId, req.user.id);
    if (!role) {
      return res.status(403).json({ success: false, message: 'Access denied. You are not a member of this project.' });
    }

    const tasks = await db.getTasksByProject(projectId);
    return res.json({ success: true, tasks });
  } catch (err) {
    console.error('[GET TASKS ERROR]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/projects/:projectId/tasks - create new task
router.post('/projects/:projectId/tasks', async (req, res) => {
  try {
    const { projectId } = req.params;
    const role = await db.getUserRoleInProject(projectId, req.user.id);
    if (!role) {
      return res.status(403).json({ success: false, message: 'Access denied. You are not a member of this project.' });
    }

    const { title, description, status = 'todo', priority = 'medium', assigneeId, dueDate, position = 0 } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Task title is required.' });
    }

    const task = await db.createTask({
      projectId,
      title: title.trim(),
      description: description || '',
      status,
      priority,
      assigneeId: assigneeId || null,
      createdBy: req.user.id,
      dueDate: dueDate || null,
      position: position || 0
    });

    const project = await db.getProjectById(projectId);

    // Record activity
    await db.createActivity({
      projectId,
      userId: req.user.id,
      action: 'created_task',
      details: { taskId: task.id, title: task.title, status: task.status }
    });

    // Notify assignee if assigned to someone else
    if (assigneeId && assigneeId !== req.user.id) {
      const notif = await db.createNotification({
        userId: assigneeId,
        actorId: req.user.id,
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: `${req.user.full_name} assigned you to "${task.title}" in ${project?.name || 'project'}.`,
        link: `#/projects/${projectId}/kanban`
      });
      sendDirectNotification(assigneeId, notif);
      broadcastTaskAssigned(projectId, task, assigneeId, req.user);
    }

    // Broadcast to project room
    broadcastTaskCreated(projectId, task, req.user);

    return res.status(201).json({
      success: true,
      message: 'Task created successfully!',
      task
    });
  } catch (err) {
    console.error('[CREATE TASK ERROR]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/tasks/:taskId - get single task
router.get('/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await db.getTaskById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const role = await db.getUserRoleInProject(task.project_id, req.user.id);
    if (!role) {
      return res.status(403).json({ success: false, message: 'Access denied to this task.' });
    }

    return res.json({ success: true, task });
  } catch (err) {
    console.error('[GET TASK ERROR]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/tasks/:taskId - update task
router.put('/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const existing = await db.getTaskById(taskId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const role = await db.getUserRoleInProject(existing.project_id, req.user.id);
    if (!role) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const { title, description, status, priority, assigneeId, dueDate, position } = req.body;
    const updated = await db.updateTask(taskId, {
      title,
      description,
      status,
      priority,
      assignee_id: assigneeId !== undefined ? (assigneeId || null) : existing.assignee_id,
      due_date: dueDate !== undefined ? (dueDate || null) : existing.due_date,
      position: position !== undefined ? position : existing.position
    });

    const project = await db.getProjectById(existing.project_id);

    // Record activity
    await db.createActivity({
      projectId: existing.project_id,
      userId: req.user.id,
      action: 'updated_task',
      details: { taskId, title: updated.title }
    });

    // Notify new assignee if changed
    if (assigneeId && assigneeId !== existing.assignee_id && assigneeId !== req.user.id) {
      const notif = await db.createNotification({
        userId: assigneeId,
        actorId: req.user.id,
        type: 'task_assigned',
        title: 'Task Assigned',
        message: `${req.user.full_name} assigned you to "${updated.title}" in ${project?.name || 'project'}.`,
        link: `#/projects/${existing.project_id}/kanban`
      });
      sendDirectNotification(assigneeId, notif);
      broadcastTaskAssigned(existing.project_id, updated, assigneeId, req.user);
    } else if (existing.assignee_id && existing.assignee_id !== req.user.id) {
      // Notify current assignee about the task update
      const notif = await db.createNotification({
        userId: existing.assignee_id,
        actorId: req.user.id,
        type: 'task_updated',
        title: 'Task Updated',
        message: `${req.user.full_name} updated task "${updated.title}".`,
        link: `#/projects/${existing.project_id}/kanban`
      });
      sendDirectNotification(existing.assignee_id, notif);
    }

    // Broadcast update to project room
    broadcastTaskUpdated(existing.project_id, updated, req.user);

    return res.json({
      success: true,
      message: 'Task updated successfully.',
      task: updated
    });
  } catch (err) {
    console.error('[UPDATE TASK ERROR]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/tasks/:taskId/status - update task status & position (Kanban Drag and Drop)
router.patch('/tasks/:taskId/status', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, position } = req.body;

    if (!status || !['todo', 'in_progress', 'completed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Valid status (todo, in_progress, completed) is required.' });
    }

    const existing = await db.getTaskById(taskId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const role = await db.getUserRoleInProject(existing.project_id, req.user.id);
    if (!role) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const updated = await db.updateTask(taskId, {
      status,
      position: position !== undefined ? position : existing.position
    });

    // Record activity
    await db.createActivity({
      projectId: existing.project_id,
      userId: req.user.id,
      action: 'moved_task',
      details: { taskId, title: updated.title, fromStatus: existing.status, toStatus: status }
    });

    // Broadcast status change immediately to all connected clients in the project room
    broadcastTaskStatusChanged(existing.project_id, updated, req.user);

    // If assigned to someone else, notify them of status movement
    if (updated.assignee_id && updated.assignee_id !== req.user.id) {
      const notif = await db.createNotification({
        userId: updated.assignee_id,
        actorId: req.user.id,
        type: 'task_updated',
        title: 'Task Status Changed',
        message: `${req.user.full_name} moved "${updated.title}" to ${status.replace('_', ' ')}.`,
        link: `#/projects/${existing.project_id}/kanban`
      });
      sendDirectNotification(updated.assignee_id, notif);
    }

    return res.json({
      success: true,
      message: 'Task status updated.',
      task: updated
    });
  } catch (err) {
    console.error('[UPDATE TASK STATUS ERROR]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/tasks/:taskId - delete task
router.delete('/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const existing = await db.getTaskById(taskId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const role = await db.getUserRoleInProject(existing.project_id, req.user.id);
    if (!role) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    await db.deleteTask(taskId);

    // Record activity
    await db.createActivity({
      projectId: existing.project_id,
      userId: req.user.id,
      action: 'deleted_task',
      details: { title: existing.title }
    });

    // Broadcast deletion to all users in project room
    broadcastTaskDeleted(existing.project_id, taskId, req.user);

    return res.json({
      success: true,
      message: 'Task deleted successfully.'
    });
  } catch (err) {
    console.error('[DELETE TASK ERROR]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

