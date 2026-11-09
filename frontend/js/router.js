// TASKORA Client-Side Router

import { isAuthenticated, state, setUnreadCount } from './state.js';
import { api } from './api.js';
import { renderAuthView } from './views/authView.js';
import { renderDashboardView } from './views/dashboardView.js';
import { renderProjectsList, renderCreateProject, renderProjectDetails } from './views/projectsView.js';
import { renderKanbanView } from './views/kanbanView.js';
import { renderTaskModal } from './views/taskModalView.js';
import { renderNotificationsView } from './views/notificationsView.js';
import { renderProfileView } from './views/profileView.js';
import { renderSettingsView } from './views/settingsView.js';

export function handleRoute() {
  const hash = window.location.hash || '#/dashboard';
  const path = hash.split('?')[0].replace('#/', '').trim();
  const segments = path.split('/');

  const authView = document.getElementById('auth-view');
  const appContainer = document.getElementById('app-container');
  const mainView = document.getElementById('main-view');
  const quickNewTaskBtn = document.getElementById('btn-quick-new-task');

  // Hide quick task button by default (Kanban will reveal if applicable)
  if (quickNewTaskBtn) quickNewTaskBtn.style.display = 'none';

  // 1. Auth check
  const isAuth = isAuthenticated();
  const isAuthRoute = ['login', 'register', 'forgot-password', 'reset-password'].includes(segments[0]);

  if (!isAuth) {
    if (!isAuthRoute) {
      window.location.hash = '#/login';
      return;
    }

    if (appContainer) appContainer.style.display = 'none';
    if (authView) {
      authView.style.display = 'block';
      renderAuthView(authView, segments[0]);
    }
    return;
  }

  // If already authenticated and visiting auth route, redirect to dashboard
  if (isAuthRoute) {
    window.location.hash = '#/dashboard';
    return;
  }

  // Show App Workspace
  if (authView) authView.style.display = 'none';
  if (appContainer) appContainer.style.display = 'flex';

  // Update sidebar active class
  updateSidebarActive(segments[0]);

  // Update notification counts in background
  api.getUnreadCount().then(res => {
    setUnreadCount(res.count || 0);
  }).catch(() => {});

  // 2. Route Dispatcher
  const pageHeading = document.getElementById('page-heading');
  const pageBreadcrumb = document.getElementById('page-breadcrumb');

  if (segments[0] === 'dashboard' || segments[0] === '') {
    if (pageHeading) pageHeading.textContent = 'Dashboard';
    if (pageBreadcrumb) pageBreadcrumb.innerHTML = 'TASKORA &rsaquo; Overview';
    renderDashboardView(mainView);
  } else if (segments[0] === 'projects') {
    if (segments[1] === 'new') {
      if (pageHeading) pageHeading.textContent = 'Create Project';
      if (pageBreadcrumb) pageBreadcrumb.innerHTML = 'TASKORA &rsaquo; Projects &rsaquo; New';
      renderCreateProject(mainView);
    } else if (segments[1] && segments[2] === 'kanban') {
      const projectId = segments[1];
      if (pageHeading) pageHeading.textContent = 'Kanban Board';
      if (pageBreadcrumb) pageBreadcrumb.innerHTML = `TASKORA &rsaquo; <a href="#/projects">Projects</a> &rsaquo; Board`;
      renderKanbanView(mainView, projectId);
    } else if (segments[1]) {
      const projectId = segments[1];
      if (pageHeading) pageHeading.textContent = 'Project Details';
      if (pageBreadcrumb) pageBreadcrumb.innerHTML = `TASKORA &rsaquo; <a href="#/projects">Projects</a> &rsaquo; Manage`;
      renderProjectDetails(mainView, projectId);
    } else {
      if (pageHeading) pageHeading.textContent = 'My Projects';
      if (pageBreadcrumb) pageBreadcrumb.innerHTML = 'TASKORA &rsaquo; Projects';
      renderProjectsList(mainView);
    }
  } else if (segments[0] === 'tasks' && segments[1]) {
    const taskId = segments[1];
    renderTaskModal(taskId);
  } else if (segments[0] === 'notifications') {
    if (pageHeading) pageHeading.textContent = 'Notifications';
    if (pageBreadcrumb) pageBreadcrumb.innerHTML = 'TASKORA &rsaquo; In-App Notifications';
    renderNotificationsView(mainView);
  } else if (segments[0] === 'profile') {
    if (pageHeading) pageHeading.textContent = 'User Profile';
    if (pageBreadcrumb) pageBreadcrumb.innerHTML = 'TASKORA &rsaquo; Account &rsaquo; Profile';
    renderProfileView(mainView);
  } else if (segments[0] === 'settings') {
    if (pageHeading) pageHeading.textContent = 'Settings';
    if (pageBreadcrumb) pageBreadcrumb.innerHTML = 'TASKORA &rsaquo; Workspace & System Settings';
    renderSettingsView(mainView);
  } else {
    // 404 fallback to dashboard
    window.location.hash = '#/dashboard';
  }
}

function updateSidebarActive(activeKey) {
  const links = document.querySelectorAll('.nav-item');
  links.forEach(l => {
    const route = l.dataset.route;
    if (route && (route === activeKey || (activeKey === 'projects' && route.startsWith('projects')))) {
      l.classList.add('active');
    } else {
      l.classList.remove('active');
    }
  });
}

