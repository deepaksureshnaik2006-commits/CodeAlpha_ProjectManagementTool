// TASKORA Client-Side Router

import { isAuthenticated, state, setUnreadCount } from './state.js';
import { api } from './api.js';
import { renderLandingView } from './views/landingView.js';
import { renderAuthView } from './views/authView.js';
import { renderDashboardView } from './views/dashboardView.js';
import { renderProjectsList, renderCreateProject, renderProjectDetails } from './views/projectsView.js';
import { renderKanbanView } from './views/kanbanView.js';
import { renderTaskModal } from './views/taskModalView.js';
import { renderNotificationsView } from './views/notificationsView.js';
import { renderProfileView } from './views/profileView.js';
import { renderSettingsView } from './views/settingsView.js';

export function handleRoute() {
  const hash = window.location.hash || '';
  const path = hash.split('?')[0].replace('#/', '').replace('#', '').trim();
  const segments = path.split('/');

  const landingView = document.getElementById('landing-view');
  const authView = document.getElementById('auth-view');
  const appContainer = document.getElementById('app-container');
  const mainView = document.getElementById('main-view');
  const quickNewTaskBtn = document.getElementById('btn-quick-new-task');

  // Hide quick task button by default (Kanban will reveal if applicable)
  if (quickNewTaskBtn) quickNewTaskBtn.style.display = 'none';

  const isAuth = isAuthenticated();
  const isAuthRoute = ['login', 'register', 'forgot-password', 'reset-password'].includes(segments[0]);
  const isLandingRoute = ['', 'home', 'landing'].includes(segments[0]);

  // 1. Unauthenticated user handling
  if (!isAuth) {
    if (isLandingRoute) {
      if (appContainer) appContainer.style.display = 'none';
      if (authView) authView.style.display = 'none';
      if (landingView) {
        landingView.style.display = 'block';
        renderLandingView(landingView);
      }
      return;
    }

    if (isAuthRoute) {
      if (appContainer) appContainer.style.display = 'none';
      if (landingView) landingView.style.display = 'none';
      if (authView) {
        authView.style.display = 'block';
        renderAuthView(authView, segments[0]);
      }
      return;
    }

    // Visiting protected route while logged out -> redirect to landing or login
    window.location.hash = '#/login';
    return;
  }

  // 2. Authenticated user handling
  // If authenticated and visiting auth screens, redirect to dashboard
  if (isAuthRoute) {
    window.location.hash = '#/dashboard';
    return;
  }

  // Root empty hash for logged in users -> dashboard
  if (segments[0] === '' && hash === '') {
    window.location.hash = '#/dashboard';
    return;
  }

  // Public homepage view for authenticated users (shows 'Go to Dashboard' pill)
  if (segments[0] === 'home' || segments[0] === 'landing') {
    if (appContainer) appContainer.style.display = 'none';
    if (authView) authView.style.display = 'none';
    if (landingView) {
      landingView.style.display = 'block';
      renderLandingView(landingView);
    }
    return;
  }

  // 3. Authenticated App Workspace
  if (landingView) landingView.style.display = 'none';
  if (authView) authView.style.display = 'none';
  if (appContainer) appContainer.style.display = 'flex';

  // Update sidebar active class
  updateSidebarActive(segments);

  // Update notification counts in background
  api.getUnreadCount().then(res => {
    setUnreadCount(res.count || 0);
  }).catch(() => {});

  // 4. Route Dispatcher
  const pageHeading = document.getElementById('page-heading');
  const pageBreadcrumb = document.getElementById('page-breadcrumb');

  if (segments[0] === 'dashboard') {
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
    // Fallback to dashboard
    window.location.hash = '#/dashboard';
  }
}

function updateSidebarActive(segments = []) {
  const primary = segments[0] || 'dashboard';
  const sub = segments[1] || '';

  // Distinguish between 'projects' (My Projects) and 'projects/new' (Create Project)
  let currentRouteKey = primary;
  if (primary === 'projects') {
    if (sub === 'new') {
      currentRouteKey = 'projects/new';
    } else {
      currentRouteKey = 'projects';
    }
  }

  const links = document.querySelectorAll('.nav-item');
  links.forEach(l => {
    const route = l.dataset.route;
    if (route === currentRouteKey) {
      l.classList.add('active');
    } else {
      l.classList.remove('active');
    }
  });
}
