// TASKORA Notifications View

import { api } from '../api.js';
import { state, setUnreadCount } from '../state.js';
import { showToast } from '../components/toast.js';

export async function renderNotificationsView(container) {
  container.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 200px;">
      <div style="color: var(--text-muted); font-size: 0.9rem;">Loading notifications...</div>
    </div>
  `;

  try {
    const res = await api.getNotifications();
    const notifications = res.notifications || [];
    setUnreadCount(res.unreadCount || 0);

    container.innerHTML = `
      <div style="max-width: 760px; margin: 0 auto;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h2 style="font-size: 1.4rem; font-weight: 700;">Notifications</h2>
            <p style="color: var(--text-muted); font-size: 0.85rem;">Stay updated with project changes, assignments, and discussions</p>
          </div>

          ${notifications.some(n => !n.is_read) ? `
            <button id="btn-mark-all-read" class="btn btn-secondary btn-sm">
              <i data-lucide="check-check"></i>
              <span>Mark all as read</span>
            </button>
          ` : ''}
        </div>

        ${notifications.length === 0 ? `
          <div class="empty-state card" style="padding: 60px 24px;">
            <div class="empty-icon"><i data-lucide="bell-off"></i></div>
            <h3 class="empty-title">All Caught Up!</h3>
            <p class="empty-description">You have no notifications right now. Activity and assignments will appear here in real-time.</p>
          </div>
        ` : `
          <div class="notifications-list">
            ${notifications.map(n => {
              const actorName = n.actor?.full_name || 'Team';
              const timeFormatted = new Date(n.created_at).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              let iconName = 'bell';
              if (n.type === 'project_invitation') iconName = 'folder-plus';
              if (n.type === 'task_assigned') iconName = 'user-check';
              if (n.type === 'new_comment') iconName = 'message-square';
              if (n.type === 'task_updated') iconName = 'refresh-cw';

              return `
                <div class="notification-card ${!n.is_read ? 'unread' : ''}" data-id="${n.id}" data-link="${n.link || ''}">
                  ${!n.is_read ? `<div class="notif-badge-unread" title="Unread"></div>` : ''}
                  
                  <div class="avatar avatar-sm">
                    ${n.actor?.avatar_url ? `
                      <img src="${n.actor.avatar_url}" alt="${actorName}">
                    ` : `
                      <i data-lucide="${iconName}" style="width: 14px; height: 14px;"></i>
                    `}
                  </div>

                  <div style="flex: 1;">
                    <div class="notif-title">${n.title}</div>
                    <div class="notif-msg">${n.message}</div>
                    <div class="notif-time">${timeFormatted}</div>
                  </div>

                  ${!n.is_read ? `
                    <button class="btn btn-ghost btn-sm btn-mark-one-read" data-id="${n.id}" title="Mark as read">
                      <i data-lucide="check" style="width: 14px; height: 14px;"></i>
                    </button>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;

    if (window.lucide) window.lucide.createIcons({ root: container });

    // Mark all as read
    const markAllBtn = container.querySelector('#btn-mark-all-read');
    if (markAllBtn) {
      markAllBtn.addEventListener('click', async () => {
        try {
          await api.markAllNotificationsRead();
          setUnreadCount(0);
          showToast({ title: 'Notifications', message: 'All marked as read.', type: 'info' });
          renderNotificationsView(container);
        } catch (err) {
          showToast({ title: 'Error', message: err.message, type: 'error' });
        }
      });
    }

    // Individual click to navigate & mark read
    container.querySelectorAll('.notification-card').forEach(card => {
      card.addEventListener('click', async (e) => {
        if (e.target.closest('.btn-mark-one-read')) return;
        const id = card.dataset.id;
        const link = card.dataset.link;

        try {
          if (card.classList.contains('unread')) {
            await api.markNotificationRead(id);
            setUnreadCount(Math.max(0, (state.unreadCount || 1) - 1));
          }
          if (link) {
            window.location.hash = link;
          }
        } catch (err) {
          console.warn('Notification read error:', err);
        }
      });
    });

    // Mark single button
    container.querySelectorAll('.btn-mark-one-read').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        try {
          await api.markNotificationRead(id);
          setUnreadCount(Math.max(0, (state.unreadCount || 1) - 1));
          renderNotificationsView(container);
        } catch (err) {
          showToast({ title: 'Error', message: err.message, type: 'error' });
        }
      });
    });

  } catch (err) {
    container.innerHTML = `<div class="card" style="padding: 24px; color: #dc2626;">Error: ${err.message}</div>`;
  }
}
