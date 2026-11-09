// TASKORA Settings View: User workspace and notification preferences

import { showToast } from '../components/toast.js';

export function renderSettingsView(container) {
  // Load saved preferences or defaults
  const prefs = JSON.parse(localStorage.getItem('taskora_user_prefs') || '{}');
  const alertAssignments = prefs.alertAssignments !== false;
  const alertComments = prefs.alertComments !== false;
  const alertKanban = prefs.alertKanban !== false;
  const compactCards = prefs.compactCards === true;
  const soundNotifications = prefs.soundNotifications !== false;

  container.innerHTML = `
    <div style="max-width: 680px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px;">
      
      <div>
        <h2 style="font-size: 1.4rem; font-weight: 700;">Workspace Settings</h2>
        <p style="color: var(--text-muted); font-size: 0.85rem;">Manage your in-app notification preferences and workspace display options</p>
      </div>

      <!-- In-App Notification Preferences Card -->
      <div class="card">
        <div class="card-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <i data-lucide="bell" style="color: var(--color-primary); width: 18px; height: 18px;"></i>
            <h3 class="card-title">In-App Notification Alerts</h3>
          </div>
        </div>
        <div class="card-body">
          <form id="form-settings">
            <div style="display: flex; flex-direction: column; gap: 16px;">
              <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
                <div>
                  <div style="font-weight: 600;">Task Assignment Alerts</div>
                  <div style="font-size: 0.78rem; color: var(--text-muted);">Receive real-time toasts when team members assign tasks to you</div>
                </div>
                <input type="checkbox" id="pref-assignments" ${alertAssignments ? 'checked' : ''} style="accent-color: var(--color-primary); width: 18px; height: 18px; cursor: pointer;">
              </label>

              <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
                <div>
                  <div style="font-weight: 600;">Task Discussion Comments</div>
                  <div style="font-size: 0.78rem; color: var(--text-muted);">Receive real-time toasts when comments are posted on your tasks</div>
                </div>
                <input type="checkbox" id="pref-comments" ${alertComments ? 'checked' : ''} style="accent-color: var(--color-primary); width: 18px; height: 18px; cursor: pointer;">
              </label>

              <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
                <div>
                  <div style="font-weight: 600;">Kanban Board Movement Sync</div>
                  <div style="font-size: 0.78rem; color: var(--text-muted);">Notify when team members move cards between columns</div>
                </div>
                <input type="checkbox" id="pref-kanban" ${alertKanban ? 'checked' : ''} style="accent-color: var(--color-primary); width: 18px; height: 18px; cursor: pointer;">
              </label>

              <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
                <div>
                  <div style="font-weight: 600;">Audio Chimes for Updates</div>
                  <div style="font-size: 0.78rem; color: var(--text-muted);">Play a subtle audible ping when a new real-time event is received</div>
                </div>
                <input type="checkbox" id="pref-sound" ${soundNotifications ? 'checked' : ''} style="accent-color: var(--color-primary); width: 18px; height: 18px; cursor: pointer;">
              </label>
            </div>

            <!-- Workspace Experience Card Section -->
            <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border-color-light);">
              <h4 style="font-size: 0.95rem; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                <i data-lucide="sliders" style="width: 16px; height: 16px; color: var(--color-secondary);"></i>
                <span>Display & Workspace View</span>
              </h4>
              <div style="display: flex; flex-direction: column; gap: 14px;">
                <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
                  <div>
                    <div style="font-weight: 600;">Compact Kanban Cards</div>
                    <div style="font-size: 0.78rem; color: var(--text-muted);">Display denser cards on the Kanban board to fit more tasks on screen</div>
                  </div>
                  <input type="checkbox" id="pref-compact" ${compactCards ? 'checked' : ''} style="accent-color: var(--color-primary); width: 18px; height: 18px; cursor: pointer;">
                </label>
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; margin-top: 24px;">
              <button type="submit" class="btn btn-primary" id="btn-save-settings">
                <i data-lucide="save"></i>
                <span>Save Settings</span>
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  `;

  if (window.lucide) window.lucide.createIcons({ root: container });

  const form = container.querySelector('#form-settings');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const updated = {
      alertAssignments: container.querySelector('#pref-assignments').checked,
      alertComments: container.querySelector('#pref-comments').checked,
      alertKanban: container.querySelector('#pref-kanban').checked,
      soundNotifications: container.querySelector('#pref-sound').checked,
      compactCards: container.querySelector('#pref-compact').checked
    };
    localStorage.setItem('taskora_user_prefs', JSON.stringify(updated));
    showToast({ title: 'Preferences Saved', message: 'Your workspace settings have been saved successfully.', type: 'success' });
  });
}
