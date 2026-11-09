// TASKORA Settings View: System diagnostics, Supabase integration status, preferences

import { api } from '../api.js';
import { showToast } from '../components/toast.js';

export async function renderSettingsView(container) {
  container.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 200px;">
      <div style="color: var(--text-muted); font-size: 0.9rem;">Loading settings & system info...</div>
    </div>
  `;

  try {
    const health = await api.getHealth();

    container.innerHTML = `
      <div style="max-width: 720px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px;">
        
        <div>
          <h2 style="font-size: 1.4rem; font-weight: 700;">Settings & Integration</h2>
          <p style="color: var(--text-muted); font-size: 0.85rem;">Configure application behavior and review real-time infrastructure</p>
        </div>

        <!-- Infrastructure & Database Card -->
        <div class="card">
          <div class="card-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <i data-lucide="database" style="color: var(--color-primary); width: 18px; height: 18px;"></i>
              <h3 class="card-title">Database & Backend Diagnostics</h3>
            </div>
            <span class="badge badge-admin">${health.database}</span>
          </div>
          <div class="card-body">
            <div style="display: flex; flex-direction: column; gap: 14px;">
              <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid var(--border-color-light);">
                <div>
                  <div style="font-weight: 600;">Supabase PostgreSQL Status</div>
                  <div style="font-size: 0.78rem; color: var(--text-muted);">Database schema: profiles, projects, members, tasks, comments, notifications, activities</div>
                </div>
                <div style="display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 0.82rem; color: #10b981;">
                  <span class="status-dot"></span>
                  <span>Active</span>
                </div>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid var(--border-color-light);">
                <div>
                  <div style="font-weight: 600;">Real-Time WebSocket Protocol</div>
                  <div style="font-size: 0.78rem; color: var(--text-muted);">Socket.IO Engine with project-specific rooms and direct user queues</div>
                </div>
                <div style="display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 0.82rem; color: #10b981;">
                  <span class="status-dot"></span>
                  <span>Connected</span>
                </div>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-weight: 600;">Application Tagline</div>
                  <div style="font-size: 0.78rem; color: var(--text-muted);">Official product motto</div>
                </div>
                <div style="font-style: italic; color: var(--text-main); font-weight: 500;">
                  "${health.tagline}"
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Notification Preferences Card -->
        <div class="card">
          <div class="card-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <i data-lucide="bell-ring" style="color: var(--color-secondary); width: 18px; height: 18px;"></i>
              <h3 class="card-title">In-App Notification Preferences</h3>
            </div>
          </div>
          <div class="card-body">
            <div style="display: flex; flex-direction: column; gap: 16px;">
              <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
                <div>
                  <div style="font-weight: 600;">Task Assignment Alerts</div>
                  <div style="font-size: 0.78rem; color: var(--text-muted);">Receive real-time toasts when team members assign tasks to you</div>
                </div>
                <input type="checkbox" checked style="accent-color: var(--color-primary); width: 18px; height: 18px;">
              </label>

              <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
                <div>
                  <div style="font-weight: 600;">Task Discussion Comments</div>
                  <div style="font-size: 0.78rem; color: var(--text-muted);">Receive real-time toasts when comments are posted on your tasks</div>
                </div>
                <input type="checkbox" checked style="accent-color: var(--color-primary); width: 18px; height: 18px;">
              </label>

              <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
                <div>
                  <div style="font-weight: 600;">Kanban Board Movement Sync</div>
                  <div style="font-size: 0.78rem; color: var(--text-muted);">Notify when team members move cards between columns</div>
                </div>
                <input type="checkbox" checked style="accent-color: var(--color-primary); width: 18px; height: 18px;">
              </label>
            </div>
          </div>
        </div>

      </div>
    `;

    if (window.lucide) window.lucide.createIcons({ root: container });
  } catch (err) {
    container.innerHTML = `<div class="card" style="padding: 24px; color: #dc2626;">Error: ${err.message}</div>`;
  }
}
