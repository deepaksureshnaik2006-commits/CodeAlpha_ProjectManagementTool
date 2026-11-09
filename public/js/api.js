// TASKORA Centralized API Client

import { state } from './state.js';

export async function request(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  const config = {
    ...options,
    headers
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  const url = endpoint.startsWith('/') ? endpoint : `/api/${endpoint}`;

  try {
    const res = await fetch(url, config);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const error = new Error(data.message || `Request failed with status ${res.status}`);
      error.status = res.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    throw err;
  }
}

export const api = {
  // Auth
  register: (payload) => request('/api/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  forgotPassword: (email) => request('/api/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (payload) => request('/api/auth/reset-password', { method: 'POST', body: payload }),
  getMe: () => request('/api/auth/me'),
  updateProfile: (payload) => request('/api/auth/profile', { method: 'PUT', body: payload }),
  changePassword: (payload) => request('/api/auth/change-password', { method: 'PUT', body: payload }),
  searchUsers: (query) => request(`/api/auth/users/search?q=${encodeURIComponent(query || '')}`),

  // Projects
  getProjects: () => request('/api/projects'),
  getProject: (projectId) => request(`/api/projects/${projectId}`),
  createProject: (payload) => request('/api/projects', { method: 'POST', body: payload }),
  updateProject: (projectId, payload) => request(`/api/projects/${projectId}`, { method: 'PUT', body: payload }),
  deleteProject: (projectId) => request(`/api/projects/${projectId}`, { method: 'DELETE' }),
  getMembers: (projectId) => request(`/api/projects/${projectId}/members`),
  addMember: (projectId, payload) => request(`/api/projects/${projectId}/members`, { method: 'POST', body: payload }),
  updateMemberRole: (projectId, memberId, role) => request(`/api/projects/${projectId}/members/${memberId}`, { method: 'PUT', body: { role } }),
  removeMember: (projectId, memberId) => request(`/api/projects/${projectId}/members/${memberId}`, { method: 'DELETE' }),

  // Tasks
  getTasks: (projectId) => request(`/api/projects/${projectId}/tasks`),
  getTask: (taskId) => request(`/api/tasks/${taskId}`),
  createTask: (projectId, payload) => request(`/api/projects/${projectId}/tasks`, { method: 'POST', body: payload }),
  updateTask: (taskId, payload) => request(`/api/tasks/${taskId}`, { method: 'PUT', body: payload }),
  updateTaskStatus: (taskId, status, position) => request(`/api/tasks/${taskId}/status`, { method: 'PATCH', body: { status, position } }),
  deleteTask: (taskId) => request(`/api/tasks/${taskId}`, { method: 'DELETE' }),

  // Comments
  getComments: (taskId) => request(`/api/tasks/${taskId}/comments`),
  addComment: (taskId, content) => request(`/api/tasks/${taskId}/comments`, { method: 'POST', body: { content } }),
  updateComment: (commentId, content) => request(`/api/comments/${commentId}`, { method: 'PUT', body: { content } }),
  deleteComment: (commentId) => request(`/api/comments/${commentId}`, { method: 'DELETE' }),

  // Notifications
  getNotifications: () => request('/api/notifications'),
  getUnreadCount: () => request('/api/notifications/count'),
  markNotificationRead: (id) => request(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request('/api/notifications/read-all', { method: 'POST' }),

  // Activities
  getActivities: (projectId) => request(`/api/activities/project/${projectId}`),

  // Dashboard
  getDashboardStats: () => request('/api/dashboard/stats'),

  // Health
  getHealth: () => request('/api/health')
};
