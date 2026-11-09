// TASKORA Configuration & Constants

export const API_BASE = '/api';

export const PRIORITIES = {
  low: { label: 'Low', badgeClass: 'badge-low', color: '#059669' },
  medium: { label: 'Medium', badgeClass: 'badge-medium', color: '#2563eb' },
  high: { label: 'High', badgeClass: 'badge-high', color: '#d97706' },
  urgent: { label: 'Urgent', badgeClass: 'badge-urgent', color: '#dc2626' }
};

export const STATUSES = {
  todo: { label: 'To Do', indicatorClass: 'todo', color: '#64748b' },
  in_progress: { label: 'In Progress', indicatorClass: 'in_progress', color: '#0284c7' },
  completed: { label: 'Completed', indicatorClass: 'completed', color: '#10b981' }
};

export const ROLES = {
  owner: { label: 'Owner', badgeClass: 'badge-owner' },
  admin: { label: 'Admin', badgeClass: 'badge-admin' },
  member: { label: 'Member', badgeClass: 'badge-member' }
};
