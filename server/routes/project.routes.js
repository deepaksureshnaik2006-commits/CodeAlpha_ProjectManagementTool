const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');
const { requireProjectMember, requireProjectAdmin, requireProjectOwner } = require('../middleware/projectAuth');
const { sendDirectNotification, broadcastProjectUpdated } = require('../socket/socketHandler');

// All project routes require authenticated user
router.use(authMiddleware);

// GET /api/projects - list user's projects
router.get('/', async (req, res) => {
  try {
    const projects = await db.getProjectsForUser(req.user.id);
    return res.json({ success: true, projects });
  } catch (err) {
    console.error('[GET PROJECTS ERROR]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/projects - create new project
router.post('/', async (req, res) => {
  try {
    const { name, description, color } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Project name is required.' });
    }

    const project = await db.createProject({
      name: name.trim(),
      description: description || '',
      color: color || '#6366f1',
      ownerId: req.user.id
    });

    return res.status(201).json({
      success: true,
      message: 'Project created successfully!',
      project
    });
  } catch (err) {
    console.error('[CREATE PROJECT ERROR]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/projects/:projectId - get project details
router.get('/:projectId', requireProjectMember, async (req, res) => {
  try {
    const project = await db.getProjectById(req.projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const members = await db.getProjectMembers(req.projectId);
    const tasks = await db.getTasksByProject(req.projectId);

    return res.json({
      success: true,
      project: {
        ...project,
        userRole: req.userRole,
        members,
        tasks
      }
    });
  } catch (err) {
    console.error('[GET PROJECT DETAILS ERROR]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/projects/:projectId - update project
router.put('/:projectId', requireProjectAdmin, async (req, res) => {
  try {
    const { name, description, color } = req.body;
    const updated = await db.updateProject(req.projectId, { name, description, color });

    await db.createActivity({
      projectId: req.projectId,
      userId: req.user.id,
      action: 'updated_project',
      details: { name: updated.name }
    });

    broadcastProjectUpdated(req.projectId, updated, req.user);

    return res.json({
      success: true,
      message: 'Project updated successfully.',
      project: updated
    });
  } catch (err) {
    console.error('[UPDATE PROJECT ERROR]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/projects/:projectId - delete project
router.delete('/:projectId', requireProjectOwner, async (req, res) => {
  try {
    await db.deleteProject(req.projectId);
    return res.json({
      success: true,
      message: 'Project deleted successfully.'
    });
  } catch (err) {
    console.error('[DELETE PROJECT ERROR]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/projects/:projectId/members - list members
router.get('/:projectId/members', requireProjectMember, async (req, res) => {
  try {
    const members = await db.getProjectMembers(req.projectId);
    return res.json({ success: true, members });
  } catch (err) {
    console.error('[GET MEMBERS ERROR]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/projects/:projectId/members - add member
router.post('/:projectId/members', requireProjectAdmin, async (req, res) => {
  try {
    let { userId, email, role = 'member' } = req.body;

    if (!userId && email) {
      const found = await db.getProfileByEmail(email);
      if (!found) {
        return res.status(404).json({ success: false, message: `No registered user found with email: ${email}` });
      }
      userId = found.id;
    }

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID or valid email is required.' });
    }

    const member = await db.addProjectMember(req.projectId, userId, role);
    const project = await db.getProjectById(req.projectId);
    const addedProfile = await db.getProfileById(userId);

    // Record activity
    await db.createActivity({
      projectId: req.projectId,
      userId: req.user.id,
      action: 'added_member',
      details: { memberName: addedProfile.full_name, role }
    });

    // Create & push notification to the added user
    const notif = await db.createNotification({
      userId,
      actorId: req.user.id,
      type: 'project_invitation',
      title: 'Added to Project',
      message: `${req.user.full_name} added you to project "${project.name}" as ${role}.`,
      link: `#/projects/${req.projectId}`
    });
    sendDirectNotification(userId, notif);

    return res.status(201).json({
      success: true,
      message: `${addedProfile.full_name} added to project as ${role}.`,
      member: {
        ...member,
        full_name: addedProfile.full_name,
        email: addedProfile.email,
        avatar_url: addedProfile.avatar_url
      }
    });
  } catch (err) {
    console.error('[ADD MEMBER ERROR]', err);
    return res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/projects/:projectId/members/:memberId - update member role
router.put('/:projectId/members/:memberId', requireProjectAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    const { memberId } = req.params; // user_id

    const updated = await db.updateProjectMemberRole(req.projectId, memberId, role);
    return res.json({
      success: true,
      message: 'Member role updated successfully.',
      member: updated
    });
  } catch (err) {
    console.error('[UPDATE MEMBER ROLE ERROR]', err);
    return res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/projects/:projectId/members/:memberId - remove member
router.delete('/:projectId/members/:memberId', requireProjectAdmin, async (req, res) => {
  try {
    const { memberId } = req.params;
    if (memberId === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot remove yourself. Leave project or transfer ownership instead.' });
    }

    await db.removeProjectMember(req.projectId, memberId);
    return res.json({
      success: true,
      message: 'Member removed from project.'
    });
  } catch (err) {
    console.error('[REMOVE MEMBER ERROR]', err);
    return res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
