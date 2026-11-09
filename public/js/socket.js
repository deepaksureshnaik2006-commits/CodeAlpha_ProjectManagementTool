// TASKORA Socket.IO WebSocket Client

import { state, setCurrentTasks, setUnreadCount } from './state.js';
import { showToast } from './components/toast.js';

let socket = null;
let currentJoinedProject = null;

export function initSocket() {
  if (!state.token) return null;

  if (socket && socket.connected) {
    return socket;
  }

  // Connect to Socket.IO server passing auth token in handshake
  socket = window.io({
    auth: {
      token: state.token
    },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000
  });

  state.socket = socket;

  const statusPill = document.getElementById('connection-status-pill');
  const statusText = document.getElementById('connection-status-text');

  socket.on('connect', () => {
    console.log('[TASKORA WS] Connected to real-time server. ID:', socket.id);
    if (statusPill && statusText) {
      statusPill.classList.remove('disconnected');
      statusText.textContent = 'Live';
    }

    // Rejoin active project room if reconnecting
    if (currentJoinedProject) {
      joinProjectRoom(currentJoinedProject);
    }
  });

  socket.on('disconnect', (reason) => {
    console.warn('[TASKORA WS] Disconnected:', reason);
    if (statusPill && statusText) {
      statusPill.classList.add('disconnected');
      statusText.textContent = 'Reconnecting...';
    }
  });

  socket.on('connect_error', (err) => {
    console.error('[TASKORA WS] Connection error:', err.message);
    if (statusPill && statusText) {
      statusPill.classList.add('disconnected');
      statusText.textContent = 'Offline';
    }
  });

  // ----------------------------------------------------------------------------
  // REAL-TIME EVENT HANDLERS
  // ----------------------------------------------------------------------------

  // Event: task_created
  socket.on('task_created', ({ projectId, task, actor }) => {
    if (state.currentProject && state.currentProject.id === projectId) {
      // Don't duplicate if already present
      if (!state.currentTasks.some(t => t.id === task.id)) {
        state.currentTasks.push(task);
        setCurrentTasks([...state.currentTasks]);

        // If actor wasn't current user, show friendly toast
        if (actor.id !== state.user?.id) {
          showToast({
            title: 'New Task Added',
            message: `${actor.full_name} created "${task.title}"`,
            type: 'info'
          });
        }
      }
    }
  });

  // Event: task_updated
  socket.on('task_updated', ({ projectId, task, actor }) => {
    if (state.currentProject && state.currentProject.id === projectId) {
      const idx = state.currentTasks.findIndex(t => t.id === task.id);
      if (idx !== -1) {
        state.currentTasks[idx] = { ...state.currentTasks[idx], ...task };
        setCurrentTasks([...state.currentTasks]);
      }
    }
  });

  // Event: task_status_changed (Kanban column move)
  socket.on('task_status_changed', ({ projectId, task, actor }) => {
    if (state.currentProject && state.currentProject.id === projectId) {
      const idx = state.currentTasks.findIndex(t => t.id === task.id);
      if (idx !== -1) {
        state.currentTasks[idx].status = task.status;
        state.currentTasks[idx].position = task.position;
        setCurrentTasks([...state.currentTasks]);

        if (actor.id !== state.user?.id) {
          showToast({
            title: 'Task Moved',
            message: `${actor.full_name} moved "${task.title}" to ${task.status.replace('_', ' ')}`,
            type: 'info'
          });
        }
      }
    }
  });

  // Event: task_deleted
  socket.on('task_deleted', ({ projectId, taskId, actor }) => {
    if (state.currentProject && state.currentProject.id === projectId) {
      state.currentTasks = state.currentTasks.filter(t => t.id !== taskId);
      setCurrentTasks([...state.currentTasks]);

      if (actor.id !== state.user?.id) {
        showToast({
          title: 'Task Removed',
          message: `${actor.full_name} deleted a task`,
          type: 'info'
        });
      }
    }
  });

  // Event: task_assigned
  socket.on('task_assigned', ({ projectId, task, assigneeId, actor }) => {
    if (assigneeId === state.user?.id && actor.id !== state.user?.id) {
      showToast({
        title: 'Task Assigned To You',
        message: `${actor.full_name} assigned you to "${task.title}"`,
        type: 'success'
      });
    }
  });

  // Event: new_comment
  socket.on('new_comment', ({ projectId, taskId, comment, actor }) => {
    // 1. Update comment count on task card
    const task = state.currentTasks.find(t => t.id === taskId);
    if (task) {
      task.comment_count = (task.comment_count || 0) + 1;
      setCurrentTasks([...state.currentTasks]);
    }

    // 2. Dispatch custom event for task modal view if open
    window.dispatchEvent(new CustomEvent('taskora:new_comment', { detail: { taskId, comment, actor } }));

    // 3. Show notification toast if someone else commented
    if (actor.id !== state.user?.id) {
      showToast({
        title: 'New Comment',
        message: `${actor.full_name} commented on "${task?.title || 'task'}"`,
        type: 'info'
      });
    }
  });

  // Event: comment_updated
  socket.on('comment_updated', ({ projectId, taskId, comment }) => {
    window.dispatchEvent(new CustomEvent('taskora:comment_updated', { detail: { taskId, comment } }));
  });

  // Event: comment_deleted
  socket.on('comment_deleted', ({ projectId, taskId, commentId }) => {
    const task = state.currentTasks.find(t => t.id === taskId);
    if (task && task.comment_count > 0) {
      task.comment_count -= 1;
      setCurrentTasks([...state.currentTasks]);
    }
    window.dispatchEvent(new CustomEvent('taskora:comment_deleted', { detail: { taskId, commentId } }));
  });

  // Event: notification_received (Direct user notification delivery)
  socket.on('notification_received', (notification) => {
    console.log('[TASKORA WS] Direct notification received:', notification);
    setUnreadCount((state.unreadCount || 0) + 1);

    showToast({
      title: notification.title,
      message: notification.message,
      type: 'info',
      duration: 5000
    });

    window.dispatchEvent(new CustomEvent('taskora:notification_received', { detail: notification }));
  });

  return socket;
}

export function joinProjectRoom(projectId) {
  if (!socket || !socket.connected) return;
  if (currentJoinedProject === projectId) return;

  if (currentJoinedProject) {
    leaveProjectRoom(currentJoinedProject);
  }

  socket.emit('join_project', { projectId }, (res) => {
    if (res && res.success) {
      currentJoinedProject = projectId;
      console.log(`[TASKORA WS] Joined project room: ${res.room}`);
    }
  });
}

export function leaveProjectRoom(projectId) {
  if (!socket || !socket.connected) return;
  socket.emit('leave_project', { projectId });
  if (currentJoinedProject === projectId) {
    currentJoinedProject = null;
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentJoinedProject = null;
  }
}
