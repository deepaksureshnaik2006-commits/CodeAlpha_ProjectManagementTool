// TASKORA Dashboard View: Live Statistics, Deadlines, and Recent Activity Feed

import { api } from '../api.js';
import { state } from '../state.js';
import { PRIORITIES } from '../config.js';

export async function renderDashboardView(container) {
  container.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 200px;">
      <div style="color: var(--text-muted); font-size: 0.9rem;">Loading live dashboard stats...</div>
    </div>
  `;

  try {
    const res = await api.getDashboardStats();
    const stats = res.stats || {
      totalProjects: 0,
      totalAssignedTasks: 0,
      tasksInProgress: 0,
      completedTasks: 0,
      pendingTasks: 0,
      upcomingDeadlines: [],
      recentActivity: []
    };

    container.innerHTML = `
      <!-- Welcome Header -->
      <div style="margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
        <div>
          <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text-main);">
            Good day, ${state.user?.full_name || 'Team'}! 👋
          </h2>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 2px;">
            Here is your live team overview across all projects.
          </p>
        </div>
        <div style="display: flex; gap: 10px;">
          <a href="#/projects/new" class="btn btn-primary">
            <i data-lucide="plus"></i>
            <span>Create Project</span>
          </a>
        </div>
      </div>

      <!-- Real DB Stats Grid -->
      <div class="dashboard-grid">
        <div class="stat-card">
          <div class="stat-icon primary">
            <i data-lucide="folder-kanban"></i>
          </div>
          <div class="stat-details">
            <span class="stat-value">${stats.totalProjects}</span>
            <span class="stat-label">Active Projects</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon info">
            <i data-lucide="clock"></i>
          </div>
          <div class="stat-details">
            <span class="stat-value">${stats.tasksInProgress}</span>
            <span class="stat-label">Tasks In Progress</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon success">
            <i data-lucide="check-circle-2"></i>
          </div>
          <div class="stat-details">
            <span class="stat-value">${stats.completedTasks}</span>
            <span class="stat-label">Completed Tasks</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon warning">
            <i data-lucide="list-todo"></i>
          </div>
          <div class="stat-details">
            <span class="stat-value">${stats.pendingTasks}</span>
            <span class="stat-label">Pending (To Do)</span>
          </div>
        </div>
      </div>

      <!-- Two-column Dashboard Sections -->
      <div class="dashboard-sections">
        
        <!-- Upcoming Deadlines -->
        <div class="card">
          <div class="card-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <i data-lucide="calendar" style="color: var(--color-primary); width: 18px; height: 18px;"></i>
              <h3 class="card-title">Upcoming Deadlines</h3>
            </div>
            <span class="badge badge-member">${stats.upcomingDeadlines.length} items</span>
          </div>
          <div class="card-body">
            ${stats.upcomingDeadlines.length === 0 ? `
              <div class="empty-state" style="padding: 24px 0;">
                <div class="empty-icon" style="width: 44px; height: 44px;"><i data-lucide="calendar-check"></i></div>
                <div class="empty-title" style="font-size: 0.95rem;">No upcoming deadlines</div>
                <div class="empty-description" style="font-size: 0.8rem; margin-bottom: 0;">All scheduled tasks are on track.</div>
              </div>
            ` : `
              <div class="dashboard-list">
                ${stats.upcomingDeadlines.map(task => {
                  const pri = PRIORITIES[task.priority] || PRIORITIES.medium;
                  const dueDate = new Date(task.due_date);
                  const isOverdue = dueDate < new Date();
                  const formattedDate = dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

                  return `
                    <a href="#/projects/${task.project_id}/kanban" class="deadline-item">
                      <div class="deadline-item-left">
                        <span class="badge ${pri.badgeClass}">${pri.label}</span>
                        <div>
                          <div class="deadline-title">${task.title}</div>
                          <div class="deadline-project">${task.project?.name || 'Project'}</div>
                        </div>
                      </div>
                      <div class="due-date-pill ${isOverdue ? 'overdue' : 'due-soon'}">
                        <i data-lucide="clock" style="width: 14px; height: 14px;"></i>
                        <span>${isOverdue ? 'Overdue: ' : 'Due: '} ${formattedDate}</span>
                      </div>
                    </a>
                  `;
                }).join('')}
              </div>
            `}
          </div>
        </div>

        <!-- Recent Activity Feed -->
        <div class="card">
          <div class="card-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <i data-lucide="activity" style="color: var(--color-secondary); width: 18px; height: 18px;"></i>
              <h3 class="card-title">Recent Activity</h3>
            </div>
          </div>
          <div class="card-body" style="max-height: 380px; overflow-y: auto;">
            ${stats.recentActivity.length === 0 ? `
              <div class="empty-state" style="padding: 24px 0;">
                <div class="empty-icon" style="width: 44px; height: 44px;"><i data-lucide="history"></i></div>
                <div class="empty-title" style="font-size: 0.95rem;">No recent activities</div>
                <div class="empty-description" style="font-size: 0.8rem; margin-bottom: 0;">Project events and task updates will show here.</div>
              </div>
            ` : `
              <div>
                ${stats.recentActivity.map(act => {
                  const userName = act.user?.full_name || 'Team member';
                  const actTime = new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
                  let actionText = 'updated project';
                  let icon = 'info';

                  if (act.action === 'created_project') {
                    actionText = `created project <strong>${act.details?.projectName || ''}</strong>`;
                    icon = 'folder-plus';
                  } else if (act.action === 'created_task') {
                    actionText = `added task "<strong>${act.details?.title || 'task'}</strong>"`;
                    icon = 'plus-circle';
                  } else if (act.action === 'moved_task') {
                    actionText = `moved "<strong>${act.details?.title || ''}</strong>" to ${(act.details?.toStatus || '').replace('_', ' ')}`;
                    icon = 'arrow-right';
                  } else if (act.action === 'commented_on_task') {
                    actionText = `commented on "<strong>${act.details?.title || 'task'}</strong>"`;
                    icon = 'message-square';
                  } else if (act.action === 'added_member') {
                    actionText = `added <strong>${act.details?.memberName || 'a member'}</strong> to the team`;
                    icon = 'user-plus';
                  } else if (act.action === 'deleted_task') {
                    actionText = `removed task "<strong>${act.details?.title || ''}</strong>"`;
                    icon = 'trash-2';
                  }

                  return `
                    <div class="activity-item">
                      <div class="avatar avatar-sm">
                        ${act.user?.avatar_url ? `<img src="${act.user.avatar_url}" alt="${userName}">` : userName[0]}
                      </div>
                      <div style="flex: 1;">
                        <div class="activity-text">
                          <strong>${userName}</strong> ${actionText}
                        </div>
                        <div class="activity-time">${actTime}</div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>
        </div>

      </div>
    `;

    if (window.lucide) window.lucide.createIcons({ root: container });
  } catch (err) {
    container.innerHTML = `
      <div class="card" style="padding: 24px; text-align: center; color: #dc2626;">
        <i data-lucide="alert-triangle" style="width: 32px; height: 32px; margin-bottom: 8px;"></i>
        <div>Failed to load dashboard: ${err.message}</div>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons({ root: container });
  }
}

