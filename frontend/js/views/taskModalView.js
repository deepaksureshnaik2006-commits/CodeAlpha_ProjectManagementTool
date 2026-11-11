// TASKORA Task Details Modal & Real-time Comment Stream View

import { api } from '../api.js';
import { state, setCurrentTasks } from '../state.js';
import { PRIORITIES, STATUSES } from '../config.js';
import { showModal, showConfirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';

export async function renderTaskModal(taskId) {
  state.activeTaskId = taskId;

  const contentContainer = document.createElement('div');
  contentContainer.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 250px;">
      <div style="color: var(--text-muted);">Loading task details & comments...</div>
    </div>
  `;

  const { closeModal, overlay } = showModal({
    title: 'Task Details',
    content: contentContainer,
    size: 'large',
    onClose: () => {
      state.activeTaskId = null;
      window.removeEventListener('taskora:new_comment', handleRealtimeComment);
      window.removeEventListener('taskora:comment_updated', handleRealtimeCommentUpdate);
      window.removeEventListener('taskora:comment_deleted', handleRealtimeCommentDelete);
    }
  });

  try {
    const [taskRes, commentsRes] = await Promise.all([
      api.getTask(taskId),
      api.getComments(taskId)
    ]);

    const task = taskRes.task;
    let comments = commentsRes.comments || [];
    const project = state.currentProject;
    const members = project?.members || [];

    function renderModalContent() {
      const pri = PRIORITIES[task.priority] || PRIORITIES.medium;
      const dueDateFormatted = task.due_date ? new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No due date';

      contentContainer.innerHTML = `
        <div class="task-modal-layout">
          
          <!-- LEFT: Task Metadata & Properties -->
          <div class="task-modal-main">
            <div>
              <input type="text" id="task-edit-title" class="form-input" value="${task.title}" style="font-size: 1.25rem; font-weight: 700; border: 1px solid transparent; background: transparent; padding: 4px 6px;">
            </div>

            <div class="task-meta-grid">
              <div class="task-meta-item">
                <span class="task-meta-label">Status</span>
                <select id="task-prop-status" class="form-select" style="padding: 6px 10px;">
                  <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>To Do</option>
                  <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                  <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Completed</option>
                </select>
              </div>

              <div class="task-meta-item">
                <span class="task-meta-label">Priority</span>
                <select id="task-prop-priority" class="form-select" style="padding: 6px 10px;">
                  <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low</option>
                  <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium</option>
                  <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High</option>
                  <option value="urgent" ${task.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
                </select>
              </div>

              <div class="task-meta-item">
                <span class="task-meta-label">Assignee</span>
                <select id="task-prop-assignee" class="form-select" style="padding: 6px 10px;">
                  <option value="">Unassigned</option>
                  ${members.map(m => `
                    <option value="${m.user_id}" ${m.user_id === task.assignee_id ? 'selected' : ''}>${m.full_name}</option>
                  `).join('')}
                </select>
              </div>

              <div class="task-meta-item">
                <span class="task-meta-label">Due Date</span>
                <input type="date" id="task-prop-due-date" class="form-input" value="${task.due_date ? task.due_date.split('T')[0] : ''}" style="padding: 6px 10px;">
              </div>
            </div>

            <div class="form-group" style="margin-top: 10px;">
              <label class="task-meta-label">Description</label>
              <textarea id="task-edit-desc" class="form-textarea" placeholder="Add detailed notes or requirements..." style="min-height: 110px;">${task.description || ''}</textarea>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border-color);">
              <button id="btn-delete-task-modal" type="button" class="btn btn-ghost btn-sm" style="color: #ef4444;" title="Delete this task">
                <i data-lucide="trash-2"></i>
                <span>Delete Task</span>
              </button>
              <button id="btn-save-task-props" class="btn btn-primary btn-sm">
                <i data-lucide="check"></i>
                <span>Save Changes</span>
              </button>
            </div>
          </div>

          <!-- RIGHT: Real-Time Chronological Comments Section -->
          <div class="task-modal-sidebar">
            <div class="comments-section">
              <div class="comments-header">
                <div class="comments-title">
                  <i data-lucide="messages-square" style="color: var(--color-primary); width: 18px; height: 18px;"></i>
                  <span>Discussion</span>
                  <span class="badge badge-member" id="comments-count-badge">${comments.length}</span>
                </div>
              </div>

              <!-- Comment Stream (Chronological order) -->
              <div class="comments-list" id="modal-comments-stream">
                ${comments.length === 0 ? `
                  <div id="no-comments-prompt" style="text-align: center; color: var(--text-subtle); padding: 30px 10px; font-size: 0.85rem;">
                    No comments yet. Start the conversation with your team!
                  </div>
                ` : comments.map(c => renderCommentItem(c)).join('')}
              </div>

              <!-- Add Comment Form -->
              <form id="form-new-comment" class="comment-input-box">
                <textarea id="comment-text-input" placeholder="Write a comment..." rows="2" required></textarea>
                <div class="comment-input-footer">
                  <button type="submit" id="btn-submit-comment" class="btn btn-primary btn-sm">
                    <i data-lucide="send" style="width: 14px; height: 14px;"></i>
                    <span>Comment</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

        </div>
      `;

      if (window.lucide) window.lucide.createIcons({ root: contentContainer });

      // Save task properties
      const saveBtn = contentContainer.querySelector('#btn-save-task-props');
      if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
          const title = contentContainer.querySelector('#task-edit-title').value.trim();
          const description = contentContainer.querySelector('#task-edit-desc').value.trim();
          const status = contentContainer.querySelector('#task-prop-status').value;
          const priority = contentContainer.querySelector('#task-prop-priority').value;
          const assigneeId = contentContainer.querySelector('#task-prop-assignee').value || null;
          const dueDateVal = contentContainer.querySelector('#task-prop-due-date').value;
          const dueDate = dueDateVal ? new Date(dueDateVal).toISOString() : null;

          if (!title) {
            showToast({ title: 'Validation', message: 'Task title cannot be empty.', type: 'error' });
            return;
          }

          try {
            saveBtn.disabled = true;
            const updated = await api.updateTask(taskId, {
              title,
              description,
              status,
              priority,
              assigneeId,
              dueDate
            });

            // Update local state
            const idx = state.currentTasks.findIndex(t => t.id === taskId);
            if (idx !== -1) {
              state.currentTasks[idx] = { ...state.currentTasks[idx], ...updated.task };
              setCurrentTasks([...state.currentTasks]);
            }

            showToast({ title: 'Saved', message: 'Task properties updated.', type: 'success' });
            saveBtn.disabled = false;
          } catch (err) {
            showToast({ title: 'Error', message: err.message, type: 'error' });
            saveBtn.disabled = false;
          }
        });
      }

      // Delete Task Handler (inside modal)
      const deleteModalBtn = contentContainer.querySelector('#btn-delete-task-modal');
      if (deleteModalBtn) {
        deleteModalBtn.addEventListener('click', async () => {
          const confirmed = await showConfirmDialog({
            title: 'Delete Task',
            message: `Are you sure you want to delete "${task.title}"? All attached comments will be permanently removed.`,
            confirmText: 'Delete Task',
            confirmBtnClass: 'btn-danger',
            icon: 'trash-2'
          });
          if (!confirmed) return;

          try {
            await api.deleteTask(taskId);
            state.currentTasks = state.currentTasks.filter(t => t.id !== taskId);
            setCurrentTasks([...state.currentTasks]);
            closeModal();
            showToast({ title: 'Task Deleted', message: 'Task removed successfully.', type: 'info' });
          } catch (err) {
            showToast({ title: 'Error', message: err.message, type: 'error' });
          }
        });
      }

      // Add Comment Form Handler
      const commentForm = contentContainer.querySelector('#form-new-comment');
      const commentInput = contentContainer.querySelector('#comment-text-input');

      // Submit on Enter without shift
      commentInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          commentForm.dispatchEvent(new Event('submit'));
        }
      });

      commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = commentInput.value.trim();
        if (!content) return;

        const submitBtn = contentContainer.querySelector('#btn-submit-comment');
        try {
          submitBtn.disabled = true;
          commentInput.value = '';

          const res = await api.addComment(taskId, content);
          // Append comment to list
          appendCommentToStream(res.comment);
          submitBtn.disabled = false;
        } catch (err) {
          showToast({ title: 'Comment Failed', message: err.message, type: 'error' });
          submitBtn.disabled = false;
        }
      });

      attachCommentActionListeners();
    }

    renderModalContent();

    // --------------------------------------------------------------------------
    // REAL-TIME COMMENT EVENT HANDLERS
    // --------------------------------------------------------------------------
    function handleRealtimeComment(e) {
      if (e.detail?.taskId === taskId) {
        appendCommentToStream(e.detail.comment, true);
      }
    }

    function handleRealtimeCommentUpdate(e) {
      if (e.detail?.taskId === taskId) {
        const comment = e.detail.comment;
        const el = contentContainer.querySelector(`[data-comment-id="${comment.id}"] .comment-text`);
        if (el) {
          el.textContent = comment.content;
        }
      }
    }

    function handleRealtimeCommentDelete(e) {
      if (e.detail?.taskId === taskId) {
        const commentId = e.detail.commentId;
        const card = contentContainer.querySelector(`[data-comment-id="${commentId}"]`);
        if (card) {
          card.remove();
          updateCommentCount(-1);
        }
      }
    }

    window.addEventListener('taskora:new_comment', handleRealtimeComment);
    window.addEventListener('taskora:comment_updated', handleRealtimeCommentUpdate);
    window.addEventListener('taskora:comment_deleted', handleRealtimeCommentDelete);

    function appendCommentToStream(comment, isHighlight = false) {
      const stream = contentContainer.querySelector('#modal-comments-stream');
      const noComments = contentContainer.querySelector('#no-comments-prompt');
      if (noComments) noComments.remove();

      // Avoid duplicating if comment is already in DOM
      if (stream.querySelector(`[data-comment-id="${comment.id}"]`)) return;

      const div = document.createElement('div');
      div.innerHTML = renderCommentItem(comment, isHighlight);
      const newCard = div.firstElementChild;
      stream.appendChild(newCard);

      if (window.lucide) window.lucide.createIcons({ root: newCard });

      // Scroll to bottom
      stream.scrollTop = stream.scrollHeight;
      updateCommentCount(1);
      attachCommentActionListeners();
    }

    function updateCommentCount(delta) {
      const badge = contentContainer.querySelector('#comments-count-badge');
      if (badge) {
        const curr = parseInt(badge.textContent, 10) || 0;
        badge.textContent = Math.max(0, curr + delta);
      }
    }

    function attachCommentActionListeners() {
      // Edit Comment
      contentContainer.querySelectorAll('.btn-edit-comment').forEach(btn => {
        btn.onclick = () => {
          const commentId = btn.dataset.commentId;
          const card = contentContainer.querySelector(`[data-comment-id="${commentId}"]`);
          const textEl = card.querySelector('.comment-text');
          const originalContent = textEl.textContent;

          const editArea = document.createElement('div');
          editArea.style.marginTop = '6px';
          editArea.innerHTML = `
            <textarea class="form-textarea" style="min-height: 60px; font-size: 0.85rem;">${originalContent}</textarea>
            <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 6px;">
              <button class="btn btn-ghost btn-sm btn-cancel-edit">Cancel</button>
              <button class="btn btn-primary btn-sm btn-save-edit">Save</button>
            </div>
          `;

          textEl.style.display = 'none';
          card.querySelector('.comment-content-wrap').appendChild(editArea);

          editArea.querySelector('.btn-cancel-edit').onclick = () => {
            editArea.remove();
            textEl.style.display = 'block';
          };

          editArea.querySelector('.btn-save-edit').onclick = async () => {
            const newContent = editArea.querySelector('textarea').value.trim();
            if (!newContent) return;

            try {
              await api.updateComment(commentId, newContent);
              textEl.textContent = newContent;
              editArea.remove();
              textEl.style.display = 'block';
              showToast({ title: 'Updated', message: 'Comment updated.', type: 'info' });
            } catch (err) {
              showToast({ title: 'Error', message: err.message, type: 'error' });
            }
          };
        };
      });

      // Delete Comment
      contentContainer.querySelectorAll('.btn-delete-comment').forEach(btn => {
        btn.onclick = async () => {
          const commentId = btn.dataset.commentId;
          const confirmed = await showConfirmDialog({
            title: 'Delete Comment',
            message: 'Are you sure you want to delete this comment?',
            confirmText: 'Delete',
            confirmBtnClass: 'btn-danger',
            icon: 'trash-2'
          });
          if (!confirmed) return;

          try {
            await api.deleteComment(commentId);
            const card = contentContainer.querySelector(`[data-comment-id="${commentId}"]`);
            if (card) {
              card.remove();
              updateCommentCount(-1);
            }
            showToast({ title: 'Deleted', message: 'Comment removed.', type: 'info' });
          } catch (err) {
            showToast({ title: 'Error', message: err.message, type: 'error' });
          }
        };
      });
    }

  } catch (err) {
    contentContainer.innerHTML = `<div style="color: #dc2626; padding: 20px;">Failed to load task: ${err.message}</div>`;
  }
}

// ------------------------------------------------------------------------------
// RENDER INDIVIDUAL COMMENT CARD
// ------------------------------------------------------------------------------
function renderCommentItem(comment, isHighlight = false) {
  const authorName = comment.user?.full_name || 'Team member';
  const isAuthor = comment.user_id === state.user?.id;
  const timeFormatted = new Date(comment.created_at).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
    <div class="comment-card ${isHighlight ? 'highlight-new' : ''}" data-comment-id="${comment.id}">
      <div class="avatar avatar-sm">
        ${comment.user?.avatar_url ? `
          <img src="${comment.user.avatar_url}" alt="${authorName}">
        ` : `
          <span>${authorName[0]}</span>
        `}
      </div>

      <div class="comment-content-wrap">
        <div class="comment-top">
          <span class="comment-author-name">${authorName} ${isAuthor ? '<span style="color: var(--text-muted); font-size: 0.72rem;">(You)</span>' : ''}</span>
          <span class="comment-timestamp">${timeFormatted}</span>
        </div>

        <div class="comment-text">${comment.content}</div>

        ${isAuthor ? `
          <div class="comment-actions">
            <span class="comment-action-btn btn-edit-comment" data-comment-id="${comment.id}">Edit</span>
            <span>&bull;</span>
            <span class="comment-action-btn delete btn-delete-comment" data-comment-id="${comment.id}">Delete</span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

