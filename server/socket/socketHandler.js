const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const db = require('../config/db');

let ioInstance = null;

function initializeSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
    },
    pingTimeout: 30000,
    pingInterval: 15000
  });

  ioInstance = io;

  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication required for WebSocket connection.'));
      }

      const decoded = verifyToken(token);
      if (!decoded || !decoded.id) {
        return next(new Error('Invalid WebSocket authentication token.'));
      }

      const profile = await db.getProfileById(decoded.id);
      if (!profile) {
        return next(new Error('User profile not found.'));
      }

      socket.user = profile;
      next();
    } catch (err) {
      console.error('[TASKORA SOCKET] Auth middleware error:', err.message);
      next(new Error('Internal server error during socket authentication.'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`[TASKORA SOCKET] User connected: ${user.full_name} (${user.id}), socket: ${socket.id}`);

    // Join personal user notification room
    socket.join(`user_${user.id}`);

    // Event: join_project
    socket.on('join_project', async (data, callback) => {
      try {
        const projectId = typeof data === 'string' ? data : data?.projectId;
        if (!projectId) {
          if (callback) callback({ success: false, message: 'Project ID is required.' });
          return;
        }

        // Verify user is an authorized member
        const role = await db.getUserRoleInProject(projectId, user.id);
        if (!role) {
          if (callback) callback({ success: false, message: 'Unauthorized: You are not a member of this project.' });
          return;
        }

        const room = `project_${projectId}`;
        socket.join(room);
        console.log(`[TASKORA SOCKET] User ${user.full_name} joined room ${room}`);

        if (callback) {
          callback({
            success: true,
            room,
            userRole: role,
            message: `Joined project room ${room}`
          });
        }
      } catch (err) {
        console.error('[TASKORA SOCKET] join_project error:', err.message);
        if (callback) callback({ success: false, message: err.message });
      }
    });

    // Event: leave_project
    socket.on('leave_project', (data, callback) => {
      try {
        const projectId = typeof data === 'string' ? data : data?.projectId;
        if (projectId) {
          const room = `project_${projectId}`;
          socket.leave(room);
          console.log(`[TASKORA SOCKET] User ${user.full_name} left room ${room}`);
        }
        if (callback) callback({ success: true });
      } catch (err) {
        console.error('[TASKORA SOCKET] leave_project error:', err.message);
        if (callback) callback({ success: false, message: err.message });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[TASKORA SOCKET] User disconnected: ${user.full_name} (${reason})`);
    });
  });

  return io;
}

function getIO() {
  if (!ioInstance) {
    throw new Error('Socket.IO has not been initialized yet.');
  }
  return ioInstance;
}

// ==============================================================================
// REAL-TIME BROADCAST DISPATCHERS
// Always invoked AFTER changes are persisted in database
// ==============================================================================

function broadcastTaskCreated(projectId, task, actor) {
  if (!ioInstance) return;
  const room = `project_${projectId}`;
  ioInstance.to(room).emit('task_created', {
    projectId,
    task,
    actor: { id: actor.id, full_name: actor.full_name, avatar_url: actor.avatar_url }
  });
}

function broadcastTaskUpdated(projectId, task, actor) {
  if (!ioInstance) return;
  const room = `project_${projectId}`;
  ioInstance.to(room).emit('task_updated', {
    projectId,
    task,
    actor: { id: actor.id, full_name: actor.full_name, avatar_url: actor.avatar_url }
  });
}

function broadcastTaskDeleted(projectId, taskId, actor) {
  if (!ioInstance) return;
  const room = `project_${projectId}`;
  ioInstance.to(room).emit('task_deleted', {
    projectId,
    taskId,
    actor: { id: actor.id, full_name: actor.full_name, avatar_url: actor.avatar_url }
  });
}

function broadcastTaskStatusChanged(projectId, task, actor) {
  if (!ioInstance) return;
  const room = `project_${projectId}`;
  ioInstance.to(room).emit('task_status_changed', {
    projectId,
    task,
    actor: { id: actor.id, full_name: actor.full_name, avatar_url: actor.avatar_url }
  });
}

function broadcastTaskAssigned(projectId, task, assigneeId, actor) {
  if (!ioInstance) return;
  const room = `project_${projectId}`;
  ioInstance.to(room).emit('task_assigned', {
    projectId,
    task,
    assigneeId,
    actor: { id: actor.id, full_name: actor.full_name, avatar_url: actor.avatar_url }
  });
}

function broadcastNewComment(projectId, taskId, comment, actor) {
  if (!ioInstance) return;
  const room = `project_${projectId}`;
  ioInstance.to(room).emit('new_comment', {
    projectId,
    taskId,
    comment,
    actor: { id: actor.id, full_name: actor.full_name, avatar_url: actor.avatar_url }
  });
}

function broadcastCommentUpdated(projectId, taskId, comment, actor) {
  if (!ioInstance) return;
  const room = `project_${projectId}`;
  ioInstance.to(room).emit('comment_updated', {
    projectId,
    taskId,
    comment,
    actor: { id: actor.id, full_name: actor.full_name, avatar_url: actor.avatar_url }
  });
}

function broadcastCommentDeleted(projectId, taskId, commentId, actor) {
  if (!ioInstance) return;
  const room = `project_${projectId}`;
  ioInstance.to(room).emit('comment_deleted', {
    projectId,
    taskId,
    commentId,
    actor: { id: actor.id, full_name: actor.full_name, avatar_url: actor.avatar_url }
  });
}

function sendDirectNotification(userId, notification) {
  if (!ioInstance) return;
  const userRoom = `user_${userId}`;
  ioInstance.to(userRoom).emit('notification_received', notification);
}

function broadcastProjectUpdated(projectId, project, actor) {
  if (!ioInstance) return;
  const room = `project_${projectId}`;
  ioInstance.to(room).emit('project_updated', {
    projectId,
    project,
    actor: { id: actor.id, full_name: actor.full_name, avatar_url: actor.avatar_url }
  });
}

module.exports = {
  initializeSocket,
  getIO,
  broadcastTaskCreated,
  broadcastTaskUpdated,
  broadcastTaskDeleted,
  broadcastTaskStatusChanged,
  broadcastTaskAssigned,
  broadcastNewComment,
  broadcastCommentUpdated,
  broadcastCommentDeleted,
  sendDirectNotification,
  broadcastProjectUpdated
};
