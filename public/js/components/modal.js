// TASKORA Modal Manager

export function showModal({ title, content, footerButtons = [], size = 'medium', onClose = null }) {
  const container = document.getElementById('modal-container');
  if (!container) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';

  const modalClass = size === 'large' ? 'modal modal-large' : 'modal';

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
