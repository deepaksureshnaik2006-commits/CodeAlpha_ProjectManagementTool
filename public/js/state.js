// TASKORA Reactive Client State

const LOCAL_STORAGE_KEY = 'taskora_auth_state';

function loadPersistedAuth() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { user: null, token: null };
  } catch (err) {
    return { user: null, token: null };
  }
}

const initialAuth = loadPersistedAuth();

export const state = {
  user: initialAuth.user,
  token: initialAuth.token,
  projects: [],
  currentProject: null,
  currentTasks: [],
  notifications: [],
  unreadCount: 0,
  activeTaskId: null,
  activeRoute: 'dashboard',
  socket: null,
  listeners: []
};

export function subscribe(listener) {
  state.listeners.push(listener);
  return () => {
    state.listeners = state.listeners.filter(l => l !== listener);
  };
}

export function notify(event, payload) {
  state.listeners.forEach(fn => fn(event, payload, state));
}

export function setAuth(user, token) {
  state.user = user;
  state.token = token;
  if (user && token) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ user, token }));
  } else {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
  notify('auth_changed', { user, token });
}

export function isAuthenticated() {
  return !!(state.user && state.token);
}

export function setProjects(projects) {
  state.projects = projects;
  notify('projects_updated', projects);
}

export function setCurrentProject(project) {
  state.currentProject = project;
  notify('current_project_updated', project);
}

export function setCurrentTasks(tasks) {
  state.currentTasks = tasks;
  notify('tasks_updated', tasks);
}

export function setUnreadCount(count) {
  state.unreadCount = count;
  notify('unread_count_updated', count);
}

export function setNotifications(notifications) {
  state.notifications = notifications;
  notify('notifications_updated', notifications);
}
