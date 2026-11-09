// TASKORA Projects Views: List, Create, Details & Member Management

import { api } from '../api.js';
import { state, setCurrentProject } from '../state.js';
import { ROLES } from '../config.js';
import { showToast } from '../components/toast.js';
import { showModal, showConfirmDialog } from '../components/modal.js';

// ------------------------------------------------------------------------------
// 1. MY PROJECTS LIST
// ------------------------------------------------------------------------------
export async function renderProjectsList(container) {
  container.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 200px;">
      <div style="color: var(--text-muted); font-size: 0.9rem;">Loading projects...</div>
    </div>
  `;

  try {
    const res = await api.getProjects();
    const projects = res.projects || [];

    if (projects.length === 0) {
      container.innerHTML = `
        <div class="empty-state card" style="padding: 60px 24px;">
          <div class="empty-icon"><i data-lucide="folder-plus"></i></div>
          <h2 class="empty-title">No Projects Found</h2>
          <p class="empty-description">Create your first collaborative group project to start planning tasks with your team.</p>
          <a href="#/projects/new" class="btn btn-primary btn-lg">
            <i data-lucide="plus"></i>
            <span>Create New Project</span>
          </a>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons({ root: container });
      return;
    }

    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
        <div>
          <h2 style="font-size: 1.35rem; font-weight: 700;">My Projects</h2>
          <p style="color: var(--text-muted); font-size: 0.85rem;">Projects you own or collaborate on</p>
        </div>
        <a href="#/projects/new" class="btn btn-primary">
          <i data-lucide="plus"></i>
          <span>New Project</span>
        </a>
      </div>

      <div class="projects-grid">
        ${projects.map(p => {
          const roleConfig = ROLES[p.userRole] || ROLES.member;
          const projColor = p.color || '#6366f1';
          return `
            <div class="project-card" style="--project-color: ${projColor};" onclick="window.location.hash = '#/projects/${p.id}/kanban'">
              <div class="project-card-header">
                <div>
                  <h3 class="project-title">${p.name}</h3>
                  <span class="badge ${roleConfig.badgeClass}" style="margin-top: 4px;">${roleConfig.label}</span>
                </div>
                <div style="width: 24px; height: 24px; border-radius: 6px; background-color: ${projColor}20; display: flex; align-items: center; justify-content: center; color: ${projColor};">
                  <i data-lucide="folder" style="width: 14px; height: 14px;"></i>
                </div>
              </div>

              <p class="project-desc">${p.description || 'No description provided.'}</p>

              <div class="project-progress-wrap">
                <div class="progress-labels">
                  <span>Progress</span>
                  <span><strong>${p.progress || 0}%</strong> (${p.completedTasks || 0}/${p.totalTasks || 0} tasks)</span>
                </div>
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill" style="width: ${p.progress || 0}%;"></div>
                </div>
              </div>

              <div class="project-card-footer" onclick="event.stopPropagation();">
                <div style="display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: var(--text-muted);">
                  <i data-lucide="users" style="width: 14px; height: 14px;"></i>
                  <span>${p.memberCount || 1} ${p.memberCount === 1 ? 'member' : 'members'}</span>
                </div>

                <div style="display: flex; gap: 8px;">
                  <a href="#/projects/${p.id}" class="btn btn-secondary btn-sm" title="Project Details & Members">
                    <i data-lucide="settings" style="width: 14px; height: 14px;"></i>
                    <span>Manage</span>
                  </a>
                  <a href="#/projects/${p.id}/kanban" class="btn btn-primary btn-sm">
                    <i data-lucide="kanban" style="width: 14px; height: 14px;"></i>
                    <span>Board</span>
                  </a>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    if (window.lucide) window.lucide.createIcons({ root: container });
  } catch (err) {
    container.innerHTML = `<div class="card" style="padding: 24px; color: #dc2626;">Error: ${err.message}</div>`;
  }
}

// ------------------------------------------------------------------------------
// 2. CREATE PROJECT VIEW
// ------------------------------------------------------------------------------
export function renderCreateProject(container) {
  container.innerHTML = `
    <div style="max-width: 640px; margin: 0 auto;">
      <div style="margin-bottom: 24px;">
        <a href="#/projects" class="btn btn-ghost btn-sm" style="margin-bottom: 12px; display: inline-flex;">
          <i data-lucide="arrow-left"></i>
          <span>Back to Projects</span>
        </a>
        <h2 style="font-size: 1.4rem; font-weight: 700;">Create New Project</h2>
        <p style="color: var(--text-muted); font-size: 0.85rem;">Set up a collaborative workspace for your team.</p>
      </div>

      <div class="card">
        <div class="card-body">
          <form id="form-create-project">
            <div class="form-group">
              <label class="form-label" for="proj-name">Project Name *</label>
              <input type="text" id="proj-name" class="form-input" placeholder="e.g. Mobile App Redesign" required>
            </div>

            <div class="form-group">
              <label class="form-label" for="proj-desc">Description</label>
              <textarea id="proj-desc" class="form-textarea" placeholder="Briefly explain the goal and scope of this project..."></textarea>
            </div>

            <div class="form-group">
              <label class="form-label">Accent Color</label>
              <div style="display: flex; gap: 12px; align-items: center; margin-top: 4px;" id="color-picker-group">
                ${['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'].map((c, i) => `
                  <label style="cursor: pointer; position: relative;">
                    <input type="radio" name="proj-color" value="${c}" ${i === 0 ? 'checked' : ''} style="position: absolute; opacity: 0;">
                    <div class="color-swatch" style="width: 32px; height: 32px; border-radius: 8px; background-color: ${c}; border: 2px solid ${i === 0 ? '#0f172a' : 'transparent'}; transition: transform 0.15s ease;"></div>
                  </label>
                `).join('')}
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px;">
              <a href="#/projects" class="btn btn-secondary">Cancel</a>
              <button type="submit" id="btn-save-project" class="btn btn-primary">
                <i data-lucide="plus"></i>
                <span>Create Project</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons({ root: container });

  // Handle color radio visual toggle
  const swatches = container.querySelectorAll('.color-swatch');
  const radios = container.querySelectorAll('input[name="proj-color"]');
  radios.forEach((r, idx) => {
    r.addEventListener('change', () => {
      swatches.forEach(s => s.style.border = '2px solid transparent');
      swatches[idx].style.border = '2px solid #0f172a';
    });
  });

  const form = container.querySelector('#form-create-project');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = container.querySelector('#proj-name').value.trim();
    const description = container.querySelector('#proj-desc').value.trim();
    const color = container.querySelector('input[name="proj-color"]:checked')?.value || '#6366f1';
    const btn = container.querySelector('#btn-save-project');

    try {
      btn.disabled = true;
      btn.innerHTML = `<span>Creating...</span>`;

      const res = await api.createProject({ name, description, color });
      showToast({ title: 'Project Created', message: `"${res.project.name}" is ready!`, type: 'success' });
      window.location.hash = `#/projects/${res.project.id}/kanban`;
    } catch (err) {
      showToast({ title: 'Error', message: err.message, type: 'error' });
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="plus"></i><span>Create Project</span>`;
      if (window.lucide) window.lucide.createIcons({ root: btn });
    }
  });
}

// ------------------------------------------------------------------------------
// 3. PROJECT DETAILS & TEAM MEMBERS MANAGEMENT
// ------------------------------------------------------------------------------
export async function renderProjectDetails(container, projectId) {
  container.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 200px;">
      <div style="color: var(--text-muted); font-size: 0.9rem;">Loading project details...</div>
    </div>
  `;

  try {
    const res = await api.getProject(projectId);
    const project = res.project;
    setCurrentProject(project);

    const isOwnerOrAdmin = project.userRole === 'owner' || project.userRole === 'admin';
    const isOwner = project.userRole === 'owner';

    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 14px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <a href="#/projects" class="btn btn-secondary btn-sm" aria-label="Back">
            <i data-lucide="arrow-left"></i>
          </a>
          <div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <h2 style="font-size: 1.4rem; font-weight: 700;">${project.name}</h2>
              <span class="badge ${ROLES[project.userRole]?.badgeClass}">${ROLES[project.userRole]?.label}</span>
            </div>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 2px;">${project.description || 'No description'}</p>
          </div>
        </div>

        <div style="display: flex; gap: 10px;">
          <a href="#/projects/${projectId}/kanban" class="btn btn-primary">
            <i data-lucide="kanban"></i>
            <span>Open Kanban Board</span>
          </a>
          ${isOwner ? `
            <button id="btn-delete-project" class="btn btn-danger btn-sm" title="Delete Project">
              <i data-lucide="trash-2"></i>
              <span>Delete Project</span>
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Members Section -->
      <div class="card" style="margin-bottom: 24px;">
        <div class="card-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <i data-lucide="users" style="color: var(--color-primary); width: 18px; height: 18px;"></i>
            <h3 class="card-title">Project Members (${project.members?.length || 0})</h3>
          </div>
          ${isOwnerOrAdmin ? `
            <button id="btn-add-member" class="btn btn-secondary btn-sm">
              <i data-lucide="user-plus"></i>
              <span>Add Member</span>
            </button>
          ` : ''}
        </div>

        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                ${isOwnerOrAdmin ? `<th style="text-align: right;">Actions</th>` : ''}
              </tr>
            </thead>
            <tbody>
              ${(project.members || []).map(m => {
                const roleConfig = ROLES[m.role] || ROLES.member;
                const isCurrentUser = m.user_id === state.user?.id;
                const joinDate = new Date(m.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

                return `
                  <tr>
                    <td>
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="avatar avatar-sm">
                          ${m.avatar_url ? `<img src="${m.avatar_url}" alt="${m.full_name}">` : m.full_name[0]}
                        </div>
                        <span style="font-weight: 600;">${m.full_name} ${isCurrentUser ? '<span style="color: var(--text-muted); font-size: 0.75rem;">(You)</span>' : ''}</span>
                      </div>
                    </td>
                    <td style="color: var(--text-muted);">${m.email}</td>
                    <td>
                      ${isOwner && !isCurrentUser ? `
                        <select class="filter-select member-role-select" data-member-id="${m.user_id}" style="padding: 4px 8px;">
                          <option value="owner" ${m.role === 'owner' ? 'selected' : ''}>Owner</option>
                          <option value="admin" ${m.role === 'admin' ? 'selected' : ''}>Admin</option>
                          <option value="member" ${m.role === 'member' ? 'selected' : ''}>Member</option>
                        </select>
                      ` : `
                        <span class="badge ${roleConfig.badgeClass}">${roleConfig.label}</span>
                      `}
                    </td>
                    <td style="color: var(--text-muted); font-size: 0.8rem;">${joinDate}</td>
                    ${isOwnerOrAdmin ? `
                      <td style="text-align: right;">
                        ${!isCurrentUser && (isOwner || m.role === 'member') ? `
                          <button class="btn btn-ghost btn-sm remove-member-btn" data-member-id="${m.user_id}" data-name="${m.full_name}" style="color: #ef4444;" title="Remove from project">
                            <i data-lucide="user-minus" style="width: 15px; height: 15px;"></i>
                            <span>Remove</span>
                          </button>
                        ` : ''}
                      </td>
                    ` : ''}
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons({ root: container });

    // Handle Delete Project
    const deleteBtn = container.querySelector('#btn-delete-project');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        showModal({
          title: 'Delete Project?',
          content: `<p style="color: var(--text-muted); font-size: 0.9rem;">Are you sure you want to delete <strong>${project.name}</strong>? All tasks, columns, and comments will be permanently erased. This action cannot be undone.</p>`,
          footerButtons: [
            { id: 'btn-cancel-del', text: 'Cancel', className: 'btn-secondary', onClick: (e, close) => close() },
            {
              id: 'btn-confirm-del',
              text: 'Delete Project',
              className: 'btn-danger',
              onClick: async (e, close) => {
                try {
                  await api.deleteProject(projectId);
                  close();
                  showToast({ title: 'Deleted', message: 'Project was deleted.', type: 'info' });
                  window.location.hash = '#/projects';
                } catch (err) {
                  showToast({ title: 'Error', message: err.message, type: 'error' });
                }
              }
            }
          ]
        });
      });
    }

    // Handle Add Member Modal
    const addMemberBtn = container.querySelector('#btn-add-member');
    if (addMemberBtn) {
      addMemberBtn.addEventListener('click', () => {
        const modalContent = document.createElement('div');
        modalContent.innerHTML = `
          <div class="form-group">
            <label class="form-label" for="member-email">User Email Address</label>
            <input type="email" id="member-email" class="form-input" placeholder="teammate@company.com" required>
            <span class="form-hint">Enter the email of an existing registered TASKORA user</span>
          </div>
          <div class="form-group">
            <label class="form-label" for="member-role">Assign Role</label>
            <select id="member-role" class="form-select">
              <option value="member" selected>Member (Can create, move, comment on tasks)</option>
              <option value="admin">Admin (Can manage project settings and invite members)</option>
            </select>
          </div>
        `;

        showModal({
          title: 'Add Team Member',
          content: modalContent,
          footerButtons: [
            { id: 'modal-cancel', text: 'Cancel', className: 'btn-secondary', onClick: (e, close) => close() },
            {
              id: 'modal-submit-add',
              text: 'Add to Project',
              className: 'btn-primary',
              icon: 'user-plus',
              onClick: async (e, close, overlay) => {
                const email = overlay.querySelector('#member-email').value.trim();
                const role = overlay.querySelector('#member-role').value;
                if (!email) {
                  showToast({ title: 'Missing Info', message: 'Please enter an email address.', type: 'error' });
                  return;
                }

                try {
                  await api.addMember(projectId, { email, role });
                  close();
                  showToast({ title: 'Member Added', message: `Added ${email} to project.`, type: 'success' });
                  renderProjectDetails(container, projectId);
                } catch (err) {
                  showToast({ title: 'Failed to add', message: err.message, type: 'error' });
                }
              }
            }
          ]
        });
      });
    }

    // Handle Change Role Select
    container.querySelectorAll('.member-role-select').forEach(sel => {
      sel.addEventListener('change', async () => {
        const memberId = sel.dataset.memberId;
        const newRole = sel.value;
        try {
          await api.updateMemberRole(projectId, memberId, newRole);
          showToast({ title: 'Role Updated', message: `Member role changed to ${newRole}`, type: 'success' });
        } catch (err) {
          showToast({ title: 'Error', message: err.message, type: 'error' });
          renderProjectDetails(container, projectId);
        }
      });
    });

    // Handle Remove Member
    container.querySelectorAll('.remove-member-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const memberId = btn.dataset.memberId;
        const name = btn.dataset.name;
        const confirmed = await showConfirmDialog({
          title: 'Remove Member',
          message: `Are you sure you want to remove ${name} from this project?`,
          confirmText: 'Remove Member',
          confirmBtnClass: 'btn-danger',
          icon: 'user-x'
        });
        if (!confirmed) return;

        try {
          await api.removeMember(projectId, memberId);
          showToast({ title: 'Removed', message: `${name} was removed from the project.`, type: 'info' });
          renderProjectDetails(container, projectId);
        } catch (err) {
          showToast({ title: 'Error', message: err.message, type: 'error' });
        }
      });
    });

  } catch (err) {
    container.innerHTML = `<div class="card" style="padding: 24px; color: #dc2626;">Error: ${err.message}</div>`;
  }
}

