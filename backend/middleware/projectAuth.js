const db = require('../config/db');

async function requireProjectMember(req, res, next) {
  try {
    const projectId = req.params.projectId || req.params.id || req.body.projectId;
    if (!projectId) {
      return res.status(400).json({ success: false, message: 'Project ID is required.' });
    }

    const role = await db.getUserRoleInProject(projectId, req.user.id);
    if (!role) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a member of this project.'
      });
    }

    req.userRole = role;
    req.projectId = projectId;
    next();
  } catch (err) {
    console.error('[TASKORA] Project member check error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error verifying project access.' });
  }
}

async function requireProjectAdmin(req, res, next) {
  try {
    const projectId = req.params.projectId || req.params.id || req.body.projectId;
    if (!projectId) {
      return res.status(400).json({ success: false, message: 'Project ID is required.' });
    }

    const role = await db.getUserRoleInProject(projectId, req.user.id);
    if (!role || (role !== 'owner' && role !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied. Only project owners and admins can perform this action.'
      });
    }

    req.userRole = role;
    req.projectId = projectId;
    next();
  } catch (err) {
    console.error('[TASKORA] Project admin check error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error verifying admin permissions.' });
  }
}

async function requireProjectOwner(req, res, next) {
  try {
    const projectId = req.params.projectId || req.params.id || req.body.projectId;
    if (!projectId) {
      return res.status(400).json({ success: false, message: 'Project ID is required.' });
    }

    const project = await db.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    if (project.owner_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied. Only the project owner can perform this action.'
      });
    }

    req.userRole = 'owner';
    req.projectId = projectId;
    next();
  } catch (err) {
    console.error('[TASKORA] Project owner check error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error verifying owner permissions.' });
  }
}

module.exports = {
  requireProjectMember,
  requireProjectAdmin,
  requireProjectOwner
};

