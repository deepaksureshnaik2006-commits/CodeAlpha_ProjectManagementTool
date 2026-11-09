// TASKORA Dashboard View: Live Statistics, Deadlines, and Recent Activity Feed

import { api } from '../api.js';
import { state } from '../state.js';
import { PRIORITIES } from '../config.js';
import { showToast } from '../components/toast.js';

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

        <!-- Recent Activity Feed with Daily Date Filter -->
        <div class="card">
          <div class="card-header" style="flex-wrap: wrap; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <i data-lucide="activity" style="color: var(--color-secondary); width: 18px; height: 18px;"></i>
              <h3 class="card-title">Recent Activity</h3>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <input type="date" id="activity-date-filter" class="form-input" max="${new Date().toISOString().split('T')[0]}" style="padding: 4px 8px; font-size: 0.78rem; height: 30px; width: auto; cursor: pointer;" title="Filter activities by past dates or today">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-activity-today" style="padding: 4px 10px; font-size: 0.75rem;">Today</button>
              <button type="button" class="btn btn-ghost btn-sm" id="btn-activity-reset" style="display: none; padding: 4px 8px; font-size: 0.75rem; color: var(--color-primary);" title="Show all recent activity">Show All</button>
            </div>
          </div>
          <div class="card-body" id="activity-stream-body" style="max-height: 380px; overflow-y: auto;">
            <!-- Populated dynamically by renderActivityStream -->
          </div>
        </div>

      </div>
    `;

    // Interactive Daily Date Filter Logic
    const allActivities = stats.recentActivity || [];
    const streamBody = container.querySelector('#activity-stream-body');
    const dateInput = container.querySelector('#activity-date-filter');
    const todayBtn = container.querySelector('#btn-activity-today');
    const resetBtn = container.querySelector('#btn-activity-reset');

    function renderActivityStream(selectedDate = null) {
      if (!streamBody) return;

      let list = allActivities;
      if (selectedDate) {
        list = allActivities.filter(act => {
          const actDate = new Date(act.created_at).toISOString().split('T')[0];
          return actDate === selectedDate;
        });
      }

      if (list.length === 0) {
        if (selectedDate) {
          const formatted = new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
          streamBody.innerHTML = `
            <div class="empty-state" style="padding: 36px 16px; text-align: center;">
              <div class="empty-icon" style="width: 44px; height: 44px; margin: 0 auto 12px; background: rgba(99, 102, 241, 0.08); color: var(--color-primary); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <i data-lucide="calendar-x"></i>
              </div>
              <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-main); margin-bottom: 4px;">No activity on ${formatted}</div>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 14px;">No team actions, task updates, or comments occurred on this date.</div>
              <button type="button" class="btn btn-secondary btn-sm" id="btn-empty-show-all" style="display: inline-flex;">
                <i data-lucide="rotate-ccw"></i>
                <span>View All Activities</span>
              </button>
            </div>
          `;
          const emptyShowAll = streamBody.querySelector('#btn-empty-show-all');
          if (emptyShowAll) {
            emptyShowAll.addEventListener('click', () => {
              if (dateInput) dateInput.value = '';
              if (resetBtn) resetBtn.style.display = 'none';
              renderActivityStream(null);
            });
          }
        } else {
          streamBody.innerHTML = `
            <div class="empty-state" style="padding: 24px 0;">
              <div class="empty-icon" style="width: 44px; height: 44px;"><i data-lucide="history"></i></div>
              <div class="empty-title" style="font-size: 0.95rem;">No recent activities</div>
              <div class="empty-description" style="font-size: 0.8rem; margin-bottom: 0;">Project events and task updates will show here.</div>
            </div>
          `;
        }
      } else {
        streamBody.innerHTML = `
          <div>
            ${list.map(act => {
              const userName = act.user?.full_name || 'Team member';
              const actTime = new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
              let actionText = 'updated project';

              if (act.action === 'created_project') {
                actionText = `created project <strong>${act.details?.projectName || ''}</strong>`;
              } else if (act.action === 'created_task') {
                actionText = `added task "<strong>${act.details?.title || 'task'}</strong>"`;
              } else if (act.action === 'moved_task') {
                actionText = `moved "<strong>${act.details?.title || ''}</strong>" to ${(act.details?.toStatus || '').replace('_', ' ')}`;
              } else if (act.action === 'commented_on_task') {
                actionText = `commented on "<strong>${act.details?.title || 'task'}</strong>"`;
              } else if (act.action === 'added_member') {
                actionText = `added <strong>${act.details?.memberName || 'a member'}</strong> to the team`;
              } else if (act.action === 'deleted_task') {
                actionText = `removed task "<strong>${act.details?.title || ''}</strong>"`;
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
        `;
      }

      if (window.lucide) window.lucide.createIcons({ root: streamBody });
    }

    // Initial render of all activities
    renderActivityStream(null);

    // Event listeners for date filtering
    const todayStr = new Date().toISOString().split('T')[0];
    if (dateInput) {
      dateInput.max = todayStr;
      dateInput.addEventListener('change', (e) => {
        const val = e.target.value;
        // Block future dates
        if (val && val > todayStr) {
          showToast({
            title: 'Future Date Not Available',
            message: 'You cannot select future dates because no activity has occurred yet. Showing today instead.',
            type: 'error'
          });
          dateInput.value = todayStr;
          if (resetBtn) resetBtn.style.display = 'inline-flex';
          renderActivityStream(todayStr);
          return;
        }
        if (resetBtn) resetBtn.style.display = val ? 'inline-flex' : 'none';
        renderActivityStream(val || null);
      });
    }

    if (todayBtn) {
      todayBtn.addEventListener('click', () => {
        const todayStr = new Date().toISOString().split('T')[0];
        if (dateInput) dateInput.value = todayStr;
        if (resetBtn) resetBtn.style.display = 'inline-flex';
        renderActivityStream(todayStr);
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (dateInput) dateInput.value = '';
        resetBtn.style.display = 'none';
        renderActivityStream(null);
      });
    }

    if (window.lucide) window.lucide.createIcons({ root: container });
  } catch (err) {
    container.innerHTML = `
      <div class="card" style="padding: 32px 24px; text-align: center; max-width: 480px; margin: 40px auto;">
        <div style="width: 48px; height: 48px; border-radius: 50%; background-color: rgba(239, 68, 68, 0.1); color: #ef4444; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
          <i data-lucide="alert-triangle" style="width: 24px; height: 24px;"></i>
        </div>
        <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text-main); margin-bottom: 8px;">Session Notice</h3>
        <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 20px;">${err.message}</p>
        <a href="#/login" class="btn btn-primary" style="display: inline-flex;">
          <i data-lucide="log-in"></i>
          <span>Sign In to Refresh Session</span>
        </a>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons({ root: container });
  }
}

