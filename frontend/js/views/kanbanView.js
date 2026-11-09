// TASKORA Kanban Board View: 3 Columns, Drag-and-Drop, Real-time Sync & Filtering

import { api } from '../api.js';
import { state, setCurrentProject, setCurrentTasks, subscribe } from '../state.js';
import { PRIORITIES, STATUSES } from '../config.js';
import { joinProjectRoom, leaveProjectRoom } from '../socket.js';
import { setupDragAndDrop } from '../components/dragDrop.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';
import { renderTaskModal } from './taskModalView.js';

let activeSearchTerm = '';
let activePriorityFilter = 'all';
let activeAssigneeFilter = 'all';
let unsubscribeState = null;

export async function renderKanbanView(container, projectId) {
  // Join real-time WebSocket room for this project
  joinProjectRoom(projectId);

  container.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 250px;">
      <div style="color: var(--text-muted); font-size: 0.95rem;">Connecting to project board...</div>
    </div>
  `;

  try {
    const [projRes, tasksRes] = await Promise.all([
      api.getProject(projectId),
      api.getTasks(projectId)
    ]);

    const project = projRes.project;
    setCurrentProject(project);
    setCurrentTasks(tasksRes.tasks || []);

    // Setup top navbar quick button
    const quickBtn = document.getElementById('btn-quick-new-task');
    if (quickBtn) {
      quickBtn.style.display = 'inline-flex';
      quickBtn.onclick = () => openCreateTaskModal(projectId, 'todo');
    }

    function renderBoard() {
      const allTasks = state.currentTasks || [];

      // Apply Filters
      const filteredTasks = allTasks.filter(t => {
        if (activeSearchTerm) {
          const matchTitle = t.title.toLowerCase().includes(activeSearchTerm);
          const matchDesc = t.description && t.description.toLowerCase().includes(activeSearchTerm);
          if (!matchTitle && !matchDesc) return false;
        }
        if (activePriorityFilter !== 'all' && t.priority !== activePriorityFilter) {
          return false;
        }
        if (activeAssigneeFilter !== 'all') {
          if (activeAssigneeFilter === 'unassigned' && t.assignee_id) return false;
          if (activeAssigneeFilter !== 'unassigned' && t.assignee_id !== activeAssigneeFilter) return false;
        }
        return true;
      });

      const todoTasks = filteredTasks.filter(t => t.status === 'todo');
      const inProgressTasks = filteredTasks.filter(t => t.status === 'in_progress');
      const completedTasks = filteredTasks.filter(t => t.status === 'completed');

      container.innerHTML = `
        <div class="kanban-view-header">
          <!-- Top info bar -->
          <div class="kanban-top-bar">
            <div class="kanban-project-info">
              <a href="#/projects" class="btn btn-secondary btn-sm" aria-label="Back to projects">
                <i data-lucide="arrow-left"></i>
              </a>
              <div class="project-color-badge" style="background-color: ${project.color || '#6366f1'};"></div>
              <div>
                <h2 style="font-size: 1.35rem; font-weight: 700; color: var(--text-main);">${project.name}</h2>
                <div style="font-size: 0.78rem; color: var(--text-muted);">${project.members?.length || 1} team members &bull; Real-time synchronized</div>
              </div>
            </div>

            <div style="display: flex; gap: 8px;">
              <a href="#/projects/${projectId}" class="btn btn-secondary btn-sm">
                <i data-lucide="users"></i>
                <span>Team Members</span>
              </a>
              <button id="btn-board-add-task" class="btn btn-primary btn-sm">
                <i data-lucide="plus"></i>
                <span>Add Task</span>
              </button>
            </div>
          </div>

          <!-- Filters Bar -->
          <div class="kanban-filters-bar">
            <div class="kanban-search-box">
              <i data-lucide="search" style="color: var(--text-subtle); width: 16px; height: 16px;"></i>
              <input type="text" id="kanban-search-input" placeholder="Filter tasks by name or description..." value="${activeSearchTerm}">
              ${activeSearchTerm ? `<button id="btn-clear-search" style="color: var(--text-muted);"><i data-lucide="x" style="width: 14px; height: 14px;"></i></button>` : ''}
            </div>

            <select id="filter-priority" class="filter-select">
              <option value="all" ${activePriorityFilter === 'all' ? 'selected' : ''}>All Priorities</option>
              <option value="urgent" ${activePriorityFilter === 'urgent' ? 'selected' : ''}>Urgent</option>
              <option value="high" ${activePriorityFilter === 'high' ? 'selected' : ''}>High</option>
              <option value="medium" ${activePriorityFilter === 'medium' ? 'selected' : ''}>Medium</option>
              <option value="low" ${activePriorityFilter === 'low' ? 'selected' : ''}>Low</option>
            </select>

            <select id="filter-assignee" class="filter-select">
              <option value="all" ${activeAssigneeFilter === 'all' ? 'selected' : ''}>All Assignees</option>
              <option value="unassigned" ${activeAssigneeFilter === 'unassigned' ? 'selected' : ''}>Unassigned</option>
              ${(project.members || []).map(m => `
                <option value="${m.user_id}" ${activeAssigneeFilter === m.user_id ? 'selected' : ''}>${m.full_name}</option>
              `).join('')}
            </select>
          </div>
        </div>

        <!-- 3 Kanban Columns -->
        <div class="kanban-board">
          <!-- Column 1: To Do -->
          ${renderColumn('todo', STATUSES.todo.label, todoTasks, projectId)}

          <!-- Column 2: In Progress -->
          ${renderColumn('in_progress', STATUSES.in_progress.label, inProgressTasks, projectId)}

          <!-- Column 3: Completed -->
          ${renderColumn('completed', STATUSES.completed.label, completedTasks, projectId)}
        </div>
      `;

      if (window.lucide) window.lucide.createIcons({ root: container });

      // Attach Filter Event Listeners
      const searchInput = container.querySelector('#kanban-search-input');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          activeSearchTerm = e.target.value.toLowerCase().trim();
          renderBoard();
        });
      }

      const clearSearchBtn = container.querySelector('#btn-clear-search');
      if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
          activeSearchTerm = '';
          renderBoard();
        });
      }

      const priSelect = container.querySelector('#filter-priority');
      if (priSelect) {
        priSelect.addEventListener('change', (e) => {
          activePriorityFilter = e.target.value;
          renderBoard();
        });
      }

      const assignSelect = container.querySelector('#filter-assignee');
      if (assignSelect) {
        assignSelect.addEventListener('change', (e) => {
          activeAssigneeFilter = e.target.value;
          renderBoard();
        });
      }

      // Quick add buttons
      const boardAddBtn = container.querySelector('#btn-board-add-task');
      if (boardAddBtn) {
        boardAddBtn.addEventListener('click', () => openCreateTaskModal(projectId, 'todo'));
      }

      container.querySelectorAll('.column-add-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const status = btn.dataset.status;
          openCreateTaskModal(projectId, status);
        });
      });

      // Card click -> Open Task Details with comments
      container.querySelectorAll('.task-card').forEach(card => {
        card.addEventListener('click', (e) => {
          // If clicked action button, don't open modal
          if (e.target.closest('.task-card-actions')) return;
          const taskId = card.dataset.taskId;
          renderTaskModal(taskId);
        });
      });

      // Quick action: Delete task
      container.querySelectorAll('.card-action-btn.delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const taskId = btn.dataset.taskId;
          if (!confirm('Are you sure you want to delete this task?')) return;

          try {
            await api.deleteTask(taskId);
            state.currentTasks = state.currentTasks.filter(t => t.id !== taskId);
            setCurrentTasks([...state.currentTasks]);
            showToast({ title: 'Task Deleted', message: 'Task removed successfully.', type: 'info' });
          } catch (err) {
            showToast({ title: 'Error', message: err.message, type: 'error' });
          }
        });
      });

      // Setup Drag and Drop
      setupDragAndDrop(container);
    }

    renderBoard();

    // Re-render board on real-time state changes
    if (unsubscribeState) unsubscribeState();
    unsubscribeState = subscribe((event) => {
      if (event === 'tasks_updated') {
        renderBoard();
      }
    });

  } catch (err) {
    container.innerHTML = `<div class="card" style="padding: 24px; color: #dc2626;">Error loading board: ${err.message}</div>`;
  }
}

// ------------------------------------------------------------------------------
// RENDER INDIVIDUAL KANBAN COLUMN
// ------------------------------------------------------------------------------
function renderColumn(statusKey, title, tasks, projectId) {
  const statusConfig = STATUSES[statusKey] || STATUSES.todo;

  return `
    <div class="kanban-column" data-status="${statusKey}">
      <div class="column-header">
        <div class="column-title-wrap">
          <span class="column-indicator ${statusConfig.indicatorClass}"></span>
          <span class="column-title">${title}</span>
          <span class="column-count">${tasks.length}</span>
        </div>
        <button class="column-add-btn" data-status="${statusKey}" title="Add task to ${title}">
          <i data-lucide="plus" style="width: 16px; height: 16px;"></i>
        </button>
      </div>

      <div class="column-tasks-list" data-status="${statusKey}">
        ${tasks.map(task => renderTaskCard(task)).join('')}
      </div>
    </div>
  `;
}

// ------------------------------------------------------------------------------
// RENDER INDIVIDUAL TASK CARD
// ------------------------------------------------------------------------------
function renderTaskCard(task) {
  const pri = PRIORITIES[task.priority] || PRIORITIES.medium;
  const assigneeName = task.assignee?.full_name || 'Unassigned';
  const hasAssignee = !!task.assignee_id;

  let duePillHtml = '';
  if (task.due_date) {
    const dueDate = new Date(task.due_date);
    const isOverdue = dueDate < new Date() && task.status !== 'completed';
    const dateFormatted = dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    duePillHtml = `
      <div class="due-date-pill ${isOverdue ? 'overdue' : ''}">
        <i data-lucide="clock" style="width: 12px; height: 12px;"></i>
        <span>${dateFormatted}</span>
      </div>
    `;
  }

  return `
    <div class="task-card" data-task-id="${task.id}" data-status="${task.status}">
      <div class="task-card-header">
        <span class="badge ${pri.badgeClass}">${pri.label}</span>
        <div class="task-card-actions">
          <button class="card-action-btn delete" data-task-id="${task.id}" title="Delete task">
            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
          </button>
        </div>
      </div>

      <div class="task-card-title">${task.title}</div>
      ${task.description ? `<div class="task-card-desc">${task.description}</div>` : ''}

      <div class="task-card-meta">
        <div class="task-meta-left">
          ${duePillHtml}
          <div class="comment-count-pill" title="${task.comment_count || 0} comments">
            <i data-lucide="message-square" style="width: 12px; height: 12px;"></i>
            <span>${task.comment_count || 0}</span>
          </div>
        </div>

        <div class="avatar avatar-sm" title="${assigneeName}">
          ${hasAssignee && task.assignee?.avatar_url ? `
            <img src="${task.assignee.avatar_url}" alt="${assigneeName}">
          ` : `
            <span>${hasAssignee ? assigneeName[0] : '?'}</span>
          `}
        </div>
      </div>
    </div>
  `;
}

// ------------------------------------------------------------------------------
// CREATE TASK MODAL
// ------------------------------------------------------------------------------
export function openCreateTaskModal(projectId, defaultStatus = 'todo') {
  const project = state.currentProject;
  const members = project?.members || [];

  const content = document.createElement('div');
  content.innerHTML = `
    <div class="form-group">
      <label class="form-label" for="task-title-input">Task Title *</label>
      <input type="text" id="task-title-input" class="form-input" placeholder="e.g. Design landing page hero section" required>
    </div>

    <div class="form-group">
      <label class="form-label" for="task-desc-input">Description</label>
      <textarea id="task-desc-input" class="form-textarea" placeholder="Provide background information, acceptance criteria, or technical details..."></textarea>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label" for="task-status-select">Status Column</label>
        <select id="task-status-select" class="form-select">
          <option value="todo" ${defaultStatus === 'todo' ? 'selected' : ''}>To Do</option>
          <option value="in_progress" ${defaultStatus === 'in_progress' ? 'selected' : ''}>In Progress</option>
          <option value="completed" ${defaultStatus === 'completed' ? 'selected' : ''}>Completed</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label" for="task-priority-select">Priority</label>
        <select id="task-priority-select" class="form-select">
          <option value="low">Low</option>
          <option value="medium" selected>Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label" for="task-assignee-select">Assign Member</label>
        <select id="task-assignee-select" class="form-select">
          <option value="">Unassigned</option>
          ${members.map(m => `
            <option value="${m.user_id}" ${m.user_id === state.user?.id ? 'selected' : ''}>${m.full_name} (${m.role})</option>
          `).join('')}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label" for="task-due-date-input">Due Date</label>
        <input type="date" id="task-due-date-input" class="form-input">
      </div>
    </div>
  `;

  showModal({
    title: 'Create New Task',
    content,
    footerButtons: [
      { id: 'btn-cancel-task', text: 'Cancel', className: 'btn-secondary', onClick: (e, close) => close() },
      {
        id: 'btn-submit-task',
        text: 'Create Task',
        className: 'btn-primary',
        icon: 'plus',
        onClick: async (e, close, overlay) => {
          const title = overlay.querySelector('#task-title-input').value.trim();
          const description = overlay.querySelector('#task-desc-input').value.trim();
          const status = overlay.querySelector('#task-status-select').value;
          const priority = overlay.querySelector('#task-priority-select').value;
          const assigneeId = overlay.querySelector('#task-assignee-select').value || null;
          const dueDateVal = overlay.querySelector('#task-due-date-input').value;
          const dueDate = dueDateVal ? new Date(dueDateVal).toISOString() : null;

          if (!title) {
            showToast({ title: 'Validation Error', message: 'Task title is required.', type: 'error' });
            return;
          }

          try {
            const res = await api.createTask(projectId, {
              title,
              description,
              status,
              priority,
              assigneeId,
              dueDate
            });

            close();
            showToast({ title: 'Task Created', message: `"${res.task.title}" added to ${status.replace('_', ' ')}!`, type: 'success' });
          } catch (err) {
            showToast({ title: 'Error', message: err.message, type: 'error' });
          }
        }
      }
    ]
  });
}

