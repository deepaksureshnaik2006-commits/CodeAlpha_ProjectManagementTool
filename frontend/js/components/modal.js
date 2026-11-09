// TASKORA Modal Manager

export function showModal({ title, content, footerButtons = [], size = 'medium', onClose = null }) {
  const container = document.getElementById('modal-container');
  if (!container) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';

  let modalClass = 'modal';
  if (size === 'large') modalClass = 'modal modal-large';
  if (size === 'small') modalClass = 'modal modal-small';

  overlay.innerHTML = `
    <div class="${modalClass}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-header">
        <h2 id="modal-title" class="modal-title">${title}</h2>
        <button class="modal-close-btn" aria-label="Close modal">
          <i data-lucide="x"></i>
        </button>
      </div>
      <div class="modal-body">
        ${typeof content === 'string' ? content : ''}
      </div>
      ${footerButtons.length > 0 ? `
        <div class="modal-footer">
          ${footerButtons.map(btn => `
            <button id="${btn.id}" class="btn ${btn.className || 'btn-secondary'}">
              ${btn.icon ? `<i data-lucide="${btn.icon}"></i>` : ''}
              <span>${btn.text}</span>
            </button>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;

  if (typeof content !== 'string' && content instanceof HTMLElement) {
    overlay.querySelector('.modal-body').appendChild(content);
  }

  container.innerHTML = '';
  container.appendChild(overlay);

  if (window.lucide) window.lucide.createIcons({ root: overlay });

  function closeModal() {
    overlay.classList.remove('active');
    setTimeout(() => {
      overlay.remove();
      if (onClose) onClose();
    }, 150);
  }

  overlay.querySelector('.modal-close-btn').addEventListener('click', closeModal);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });

  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  // Attach button click listeners
  footerButtons.forEach(btn => {
    if (btn.onClick) {
      const el = overlay.querySelector(`#${btn.id}`);
      if (el) {
        el.addEventListener('click', (e) => btn.onClick(e, closeModal, overlay));
      }
    }
  });

  return { closeModal, overlay };
}

// Reusable UI-based confirmation modal dialog (replaces native browser confirm())
export function showConfirmDialog({
  title = 'Confirmation',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmBtnClass = 'btn-danger',
  icon = 'alert-triangle'
}) {
  return new Promise((resolve) => {
    let settled = false;

    showModal({
      title,
      size: 'small',
      content: `
        <div style="display: flex; gap: 16px; align-items: flex-start; padding: 4px 0;">
          <div style="width: 42px; height: 42px; border-radius: 10px; background-color: rgba(239, 68, 68, 0.1); color: #ef4444; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <i data-lucide="${icon}" style="width: 20px; height: 20px;"></i>
          </div>
          <div style="flex: 1; margin-top: 2px;">
            <div style="color: var(--text-main); font-size: 0.92rem; font-weight: 500; line-height: 1.5;">${message}</div>
          </div>
        </div>
      `,
      footerButtons: [
        {
          id: 'btn-dialog-cancel',
          text: cancelText,
          className: 'btn-secondary',
          onClick: (e, closeModal) => {
            if (!settled) {
              settled = true;
              closeModal();
              resolve(false);
            }
          }
        },
        {
          id: 'btn-dialog-confirm',
          text: confirmText,
          className: confirmBtnClass,
          onClick: (e, closeModal) => {
            if (!settled) {
              settled = true;
              closeModal();
              resolve(true);
            }
          }
        }
      ],
      onClose: () => {
        if (!settled) {
          settled = true;
          resolve(false);
        }
      }
    });
  });
}
