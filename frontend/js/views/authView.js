// TASKORA Auth View: Login, Register, Forgot Password, Reset Password

import { api } from '../api.js';
import { setAuth } from '../state.js';
import { initSocket } from '../socket.js';
import { showToast } from '../components/toast.js';
import { setupPasswordToggles } from '../components/passwordToggle.js';

export function renderAuthView(container, subview = 'login') {
  container.innerHTML = `
    <div class="auth-wrapper">
      <div class="auth-container">
        
        <!-- Left Hero Section -->
        <div class="auth-hero">
          <div>
            <div class="auth-brand">
              <div class="auth-brand-logo">
                <i data-lucide="layers" style="width: 24px; height: 24px;"></i>
              </div>
              <span class="auth-brand-title">TASKORA</span>
            </div>
            <h2 class="auth-tagline">Plan Together.<br>Work Smarter.<br>Deliver Better.</h2>
            <p class="auth-hero-desc">
              The high-performance collaborative project workspace. Organize teams, orchestrate Kanban workflows, and communicate with real-time WebSockets.
            </p>

            <div class="auth-features-list">
              <div class="auth-feature-item">
                <div class="auth-feature-icon"><i data-lucide="check"></i></div>
                <span>Full-featured Kanban boards with smooth drag & drop</span>
              </div>
              <div class="auth-feature-item">
                <div class="auth-feature-icon"><i data-lucide="check"></i></div>
                <span>Real-time instant live collaboration & updates</span>
              </div>
              <div class="auth-feature-item">
                <div class="auth-feature-icon"><i data-lucide="check"></i></div>
                <span>Task comments with instant chronological discussions</span>
              </div>
              <div class="auth-feature-item">
                <div class="auth-feature-icon"><i data-lucide="check"></i></div>
                <span>Role-based team access (Owner, Admin, Member)</span>
              </div>
            </div>
          </div>

          <div class="auth-hero-footer">
            &copy; ${new Date().getFullYear()} TASKORA. Plan Together. Work Smarter. Deliver Better.
          </div>
        </div>

        <!-- Right Form Section -->
        <div class="auth-form-card" id="auth-form-container">
          <!-- Dynamic Form Content Injected Here -->
        </div>

      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons({ root: container });

  const formContainer = container.querySelector('#auth-form-container');

  if (subview === 'register') {
    renderRegisterForm(formContainer);
  } else if (subview === 'forgot-password') {
    renderForgotPasswordForm(formContainer);
  } else if (subview === 'reset-password') {
    renderResetPasswordForm(formContainer);
  } else {
    renderLoginForm(formContainer);
  }
}

// ------------------------------------------------------------------------------
// LOGIN FORM
// ------------------------------------------------------------------------------
function renderLoginForm(container) {
  container.innerHTML = `
    <div class="auth-form-header">
      <h3 class="auth-form-title">Welcome back</h3>
      <p class="auth-form-subtitle">Enter your credentials to access your workspace</p>
    </div>

    <div id="auth-alert" style="display: none;"></div>

    <form id="form-login">
      <div class="form-group">
        <label class="form-label" for="login-email">Email Address</label>
        <input type="email" id="login-email" class="form-input" placeholder="you@company.com" required autocomplete="email">
      </div>

      <div class="form-group">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <label class="form-label" for="login-password">Password</label>
          <a href="#/forgot-password" style="font-size: 0.78rem;">Forgot password?</a>
        </div>
        <div class="password-input-wrap">
          <input type="password" id="login-password" class="form-input" placeholder="••••••••" required autocomplete="current-password">
          <button type="button" class="password-toggle-btn" aria-label="Show password" title="Toggle password visibility">
            <i data-lucide="eye"></i>
          </button>
        </div>
      </div>

      <button type="submit" id="btn-submit-login" class="btn btn-primary btn-lg" style="width: 100%; margin-top: 10px;">
        <span>Sign In</span>
        <i data-lucide="arrow-right"></i>
      </button>
    </form>

    <div class="auth-switch-prompt">
      Don't have an account? <a href="#/register">Sign up for free</a>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons({ root: container });
  setupPasswordToggles(container);

  const form = container.querySelector('#form-login');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = container.querySelector('#login-email').value.trim();
    const password = container.querySelector('#login-password').value;
    const btn = container.querySelector('#btn-submit-login');
    const alertEl = container.querySelector('#auth-alert');

    try {
      btn.disabled = true;
      btn.innerHTML = `<span>Signing in...</span>`;
      alertEl.style.display = 'none';

      const res = await api.login({ email, password });
      setAuth(res.user, res.token);
      initSocket();
      showToast({ title: 'Welcome back!', message: `Logged in as ${res.user.full_name}`, type: 'success' });
      window.location.hash = '#/dashboard';
    } catch (err) {
      alertEl.className = 'alert-message alert-error';
      alertEl.innerHTML = `<i data-lucide="alert-circle"></i><span>${err.message || 'Login failed.'}</span>`;
      alertEl.style.display = 'flex';
      if (window.lucide) window.lucide.createIcons({ root: alertEl });
      btn.disabled = false;
      btn.innerHTML = `<span>Sign In</span><i data-lucide="arrow-right"></i>`;
      if (window.lucide) window.lucide.createIcons({ root: btn });
    }
  });
}

// ------------------------------------------------------------------------------
// REGISTER FORM
// ------------------------------------------------------------------------------
function renderRegisterForm(container) {
  container.innerHTML = `
    <div class="auth-form-header">
      <h3 class="auth-form-title">Create your account</h3>
      <p class="auth-form-subtitle">Join TASKORA to start collaborating with your team</p>
    </div>

    <div id="auth-alert" style="display: none;"></div>

    <form id="form-register">
      <div class="form-group">
        <label class="form-label" for="reg-name">Full Name</label>
        <input type="text" id="reg-name" class="form-input" placeholder="e.g. Alex Morgan" required autocomplete="name">
      </div>

      <div class="form-group">
        <label class="form-label" for="reg-email">Email Address</label>
        <input type="email" id="reg-email" class="form-input" placeholder="alex@company.com" required autocomplete="email">
      </div>

      <div class="form-group">
        <label class="form-label" for="reg-password">Password</label>
        <div class="password-input-wrap">
          <input type="password" id="reg-password" class="form-input" placeholder="At least 6 characters" minlength="6" required autocomplete="new-password">
          <button type="button" class="password-toggle-btn" aria-label="Show password" title="Toggle password visibility">
            <i data-lucide="eye"></i>
          </button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="reg-confirm">Confirm Password</label>
        <div class="password-input-wrap">
          <input type="password" id="reg-confirm" class="form-input" placeholder="Repeat your password" minlength="6" required autocomplete="new-password">
          <button type="button" class="password-toggle-btn" aria-label="Show password" title="Toggle password visibility">
            <i data-lucide="eye"></i>
          </button>
        </div>
      </div>

      <button type="submit" id="btn-submit-register" class="btn btn-primary btn-lg" style="width: 100%; margin-top: 10px;">
        <span>Create Account</span>
        <i data-lucide="arrow-right"></i>
      </button>
    </form>

    <div class="auth-switch-prompt">
      Already have an account? <a href="#/login">Sign in</a>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons({ root: container });
  setupPasswordToggles(container);

  const form = container.querySelector('#form-register');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = container.querySelector('#reg-name').value.trim();
    const email = container.querySelector('#reg-email').value.trim();
    const password = container.querySelector('#reg-password').value;
    const confirm = container.querySelector('#reg-confirm').value;
    const btn = container.querySelector('#btn-submit-register');
    const alertEl = container.querySelector('#auth-alert');

    if (password !== confirm) {
      alertEl.className = 'alert-message alert-error';
      alertEl.innerHTML = `<i data-lucide="alert-circle"></i><span>Passwords do not match.</span>`;
      alertEl.style.display = 'flex';
      if (window.lucide) window.lucide.createIcons({ root: alertEl });
      return;
    }

    try {
      btn.disabled = true;
      btn.innerHTML = `<span>Creating account...</span>`;
      alertEl.style.display = 'none';

      const res = await api.register({ email, password, fullName });
      setAuth(res.user, res.token);
      initSocket();
      showToast({ title: 'Welcome to TASKORA!', message: 'Your account is ready.', type: 'success' });
      window.location.hash = '#/dashboard';
    } catch (err) {
      const msg = err.message || '';
      const isAlreadyRegistered = msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exists');

      alertEl.className = `alert-message ${isAlreadyRegistered ? 'alert-error' : 'alert-error'}`;
      alertEl.innerHTML = `
        <i data-lucide="alert-circle"></i>
        <span>${isAlreadyRegistered ? `This email is already registered. <a href="#/login" style="font-weight: 700; text-decoration: underline; color: inherit;">Click here to Sign In &rarr;</a>` : msg || 'Registration failed.'}</span>
      `;
      alertEl.style.display = 'flex';
      if (window.lucide) window.lucide.createIcons({ root: alertEl });

      btn.disabled = false;
      btn.innerHTML = `<span>Create Account</span><i data-lucide="arrow-right"></i>`;
      if (window.lucide) window.lucide.createIcons({ root: btn });
    }
  });
}

// ------------------------------------------------------------------------------
// FORGOT PASSWORD FORM
// ------------------------------------------------------------------------------
function renderForgotPasswordForm(container) {
  container.innerHTML = `
    <div class="auth-form-header">
      <h3 class="auth-form-title">Reset Password</h3>
      <p class="auth-form-subtitle">Enter your registered email and we'll send you recovery details</p>
    </div>

    <div id="auth-alert" style="display: none;"></div>

    <form id="form-forgot">
      <div class="form-group">
        <label class="form-label" for="forgot-email">Email Address</label>
        <input type="email" id="forgot-email" class="form-input" placeholder="you@company.com" required>
      </div>

      <button type="submit" id="btn-submit-forgot" class="btn btn-primary btn-lg" style="width: 100%; margin-top: 10px;">
        <span>Send Reset Link</span>
        <i data-lucide="mail"></i>
      </button>
    </form>

    <div class="auth-switch-prompt">
      Remember your password? <a href="#/login">Back to Sign In</a>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons({ root: container });

  const form = container.querySelector('#form-forgot');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = container.querySelector('#forgot-email').value.trim();
    const btn = container.querySelector('#btn-submit-forgot');
    const alertEl = container.querySelector('#auth-alert');

    try {
      btn.disabled = true;
      btn.innerHTML = `<span>Sending...</span>`;

      const res = await api.forgotPassword(email);
      alertEl.className = 'alert-message alert-success';
      alertEl.innerHTML = `
        <i data-lucide="check-circle"></i>
        <span>${res.message || 'Password reset instructions sent!'}</span>
      `;
      alertEl.style.display = 'flex';

      if (res.resetToken) {
        // If local mode token returned, offer one-click link to reset
        const resetLink = document.createElement('div');
        resetLink.style.marginTop = '12px';
        resetLink.innerHTML = `<a href="#/reset-password?email=${encodeURIComponent(email)}&token=${res.resetToken}" class="btn btn-secondary btn-sm" style="width: 100%;">Click here to set new password now &rarr;</a>`;
        container.appendChild(resetLink);
      }

      if (window.lucide) window.lucide.createIcons({ root: container });
      btn.innerHTML = `<span>Sent</span>`;
    } catch (err) {
      alertEl.className = 'alert-message alert-error';
      alertEl.innerHTML = `<i data-lucide="alert-circle"></i><span>${err.message}</span>`;
      alertEl.style.display = 'flex';
      btn.disabled = false;
      btn.innerHTML = `<span>Send Reset Link</span><i data-lucide="mail"></i>`;
      if (window.lucide) window.lucide.createIcons({ root: alertEl });
    }
  });
}

// ------------------------------------------------------------------------------
// RESET PASSWORD FORM
// ------------------------------------------------------------------------------
function renderResetPasswordForm(container) {
  const hash = window.location.hash;
  const urlParams = new URLSearchParams(hash.split('?')[1] || '');
  const emailParam = urlParams.get('email') || '';
  const tokenParam = urlParams.get('token') || '';

  container.innerHTML = `
    <div class="auth-form-header">
      <h3 class="auth-form-title">Set New Password</h3>
      <p class="auth-form-subtitle">Choose a new strong password for your account</p>
    </div>

    <div id="auth-alert" style="display: none;"></div>

    <form id="form-reset">
      <div class="form-group">
        <label class="form-label" for="reset-email">Email Address</label>
        <input type="email" id="reset-email" class="form-input" value="${emailParam}" required>
      </div>

      <div class="form-group">
        <label class="form-label" for="reset-token">Reset Token / Code</label>
        <input type="text" id="reset-token" class="form-input" value="${tokenParam}" placeholder="Enter token" required>
      </div>

      <div class="form-group">
        <label class="form-label" for="reset-password">New Password</label>
        <div class="password-input-wrap">
          <input type="password" id="reset-password" class="form-input" placeholder="At least 6 characters" minlength="6" required>
          <button type="button" class="password-toggle-btn" aria-label="Show password" title="Toggle password visibility">
            <i data-lucide="eye"></i>
          </button>
        </div>
      </div>

      <button type="submit" id="btn-submit-reset" class="btn btn-primary btn-lg" style="width: 100%; margin-top: 10px;">
        <span>Reset Password</span>
        <i data-lucide="check"></i>
      </button>
    </form>

    <div class="auth-switch-prompt">
      <a href="#/login">Back to Sign In</a>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons({ root: container });
  setupPasswordToggles(container);

  const form = container.querySelector('#form-reset');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = container.querySelector('#reset-email').value.trim();
    const token = container.querySelector('#reset-token').value.trim();
    const newPassword = container.querySelector('#reset-password').value;
    const btn = container.querySelector('#btn-submit-reset');
    const alertEl = container.querySelector('#auth-alert');

    try {
      btn.disabled = true;
      btn.innerHTML = `<span>Updating password...</span>`;
      await api.resetPassword({ email, token, newPassword });

      showToast({ title: 'Password Reset', message: 'You can now sign in with your new password.', type: 'success' });
      window.location.hash = '#/login';
    } catch (err) {
      alertEl.className = 'alert-message alert-error';
      alertEl.innerHTML = `<i data-lucide="alert-circle"></i><span>${err.message}</span>`;
      alertEl.style.display = 'flex';
      btn.disabled = false;
      btn.innerHTML = `<span>Reset Password</span><i data-lucide="check"></i>`;
      if (window.lucide) window.lucide.createIcons({ root: alertEl });
    }
  });
}
