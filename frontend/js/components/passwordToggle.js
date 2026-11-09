// TASKORA Password Visibility Toggle Helper

export function setupPasswordToggles(container) {
  if (!container) return;

  container.querySelectorAll('.password-toggle-btn').forEach(btn => {
    // Avoid double attaching
    if (btn.dataset.toggleBound) return;
    btn.dataset.toggleBound = 'true';

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const wrap = btn.closest('.password-input-wrap');
      if (!wrap) return;
      const input = wrap.querySelector('input');
      if (!input) return;

      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';

      btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
      btn.innerHTML = `<i data-lucide="${isPassword ? 'eye-off' : 'eye'}" style="width: 18px; height: 18px;"></i>`;
      if (window.lucide) window.lucide.createIcons({ root: btn });
    });
  });
}

