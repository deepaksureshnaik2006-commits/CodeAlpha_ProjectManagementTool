// TASKORA Kanban Drag and Drop Controller

import { api } from '../api.js';
import { state, setCurrentTasks } from '../state.js';
import { showToast } from './toast.js';

let draggedTaskId = null;
let sourceStatus = null;

export function setupDragAndDrop(container, onTaskMoved = null) {
  if (!container) return;

  const cards = container.querySelectorAll('.task-card');
  const dropZones = container.querySelectorAll('.column-tasks-list');

  cards.forEach(card => {
    card.setAttribute('draggable', 'true');

    card.addEventListener('dragstart', (e) => {
      draggedTaskId = card.dataset.taskId;
      sourceStatus = card.dataset.status;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', draggedTaskId);
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      dropZones.forEach(zone => zone.classList.remove('drag-over'));
      draggedTaskId = null;
      sourceStatus = null;
    });
  });

  dropZones.forEach(zone => {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      zone.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', (e) => {
      if (!zone.contains(e.relatedTarget)) {
        zone.classList.remove('drag-over');
      }
    });

    zone.addEventListener('drop', async (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');

      const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
      const targetStatus = zone.dataset.status;

      if (!taskId || !targetStatus) return;

      const card = container.querySelector(`[data-task-id="${taskId}"]`);
      if (!card) return;

      const currentStatus = card.dataset.status;
      if (currentStatus === targetStatus) {
        // Same column, no status change
        return;
      }

      // Optimistically move card in DOM
      zone.appendChild(card);
      card.dataset.status = targetStatus;

      // Update in state
      const taskIndex = state.currentTasks.findIndex(t => t.id === taskId);
      if (taskIndex !== -1) {
        state.currentTasks[taskIndex].status = targetStatus;
        setCurrentTasks([...state.currentTasks]);
      }

      try {
        await api.updateTaskStatus(taskId, targetStatus, 0);
        if (onTaskMoved) onTaskMoved(taskId, targetStatus);
      } catch (err) {
        showToast({ title: 'Move Failed', message: err.message, type: 'error' });
        // Revert card position if needed
        if (onTaskMoved) onTaskMoved(null, null);
      }
    });
  });
}
