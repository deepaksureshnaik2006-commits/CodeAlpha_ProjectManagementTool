// TASKORA Main Application Entry Point

import { state, setAuth, subscribe, isAuthenticated } from './state.js';
import { handleRoute } from './router.js';
import { initSocket, disconnectSocket } from './socket.js';
import { api } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons on page load
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Update user info in sidebar if logged in
  function syncUserUI() {
    const user = state.user;
    const nameEl = document.getElementById('sidebar-user-name');
    const roleEl = document.getElementById('sidebar-user-role');
    const avatarEl = document.getElementById('sidebar-user-avatar');

    if (user && nameEl) {
      nameEl.textContent = user.full_name || 'User';
      if (roleEl) roleEl.textContent = user.email || 'Member';
      if (avatarEl) {
        if (user.avatar_url) {
          avatarEl.innerHTML = `<img src="${user.avatar_url}" alt="${user.full_name}">`;
        } else {
          avatarEl.textContent = (user.full_name ? user.full_name[0] : 'U').toUpperCase();
        }
      }
    }
  }

  // Update unread count badges in sidebar & top navbar
  function syncUnreadBadges(count) {
    const sideBadge = document.getElementById('sidebar-unread-badge');
    const topBadge = document.getElementById('top-unread-badge');

    const displayVal = count > 99 ? '99+' : count;
    const show = count > 0;

    if (sideBadge) {
      sideBadge.textContent = displayVal;
      sideBadge.style.display = show ? 'inline-block' : 'none';
    }
    if (topBadge) {
      topBadge.textContent = displayVal;
      topBadge.style.display = show ? 'inline-block' : 'none';
    }
  }

  // Subscribe to state changes
  subscribe((event, payload) => {
    if (event === 'auth_changed') {
      syncUserUI();
      if (!payload.user) {
        disconnectSocket();
      } else {
        initSocket();
      }
    } else if (event === 'unread_count_updated') {
      syncUnreadBadges(payload);
    }
  });

  // Mobile sidebar drawer
  const mobileToggleBtn = document.getElementById('mobile-sidebar-toggle');
  const sidebar = document.getElementById('app-sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (mobileToggleBtn && sidebar && overlay) {
    mobileToggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
    });

    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });

    // Close on navigation
    window.addEventListener('hashchange', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }

  // Logout button
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to sign out of TASKORA?')) {
        try {
          await api.logout();
        } catch (e) {}
        disconnectSocket();
        setAuth(null, null);
        window.location.hash = '#/login';
      }
    });
  }

  // If user is authenticated on boot, initialize socket and sync profile
  if (isAuthenticated()) {
    syncUserUI();
    initSocket();
  }

  // Start Router
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
});
