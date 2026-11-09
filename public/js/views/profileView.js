// TASKORA User Profile View

import { api } from '../api.js';
import { state, setAuth } from '../state.js';
import { showToast } from '../components/toast.js';

export function renderProfileView(container) {
  const user = state.user || {};
  const initials = user.full_name ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';

  container.innerHTML = `
    <div style="max-width: 680px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px;">
      
      <div>
        <h2 style="font-size: 1.4rem; font-weight: 700;">User Profile</h2>
        <p style="color: var(--text-muted); font-size: 0.85rem;">Manage your personal profile details and security settings</p>
      </div>

      <!-- Profile Information Card -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Personal Details</h3>
        </div>
        <div class="card-body">
          <form id="form-update-profile">
            <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 24px;">
              <div class="avatar avatar-lg" id="profile-avatar-preview">
                ${user.avatar_url ? `<img src="${user.avatar_url}" alt="${user.full_name}">` : `<span>${initials}</span>`}
              </div>
              <div>
                <label class="form-label">Avatar Image URL</label>
                <div style="display: flex; gap: 8px; margin-top: 4px;">
                  <input type="url" id="profile-avatar-input" class="form-input" value="${user.avatar_url || ''}" placeholder="https://example.com/photo.jpg">
                  <button type="button" id="btn-dicebear-avatar" class="btn btn-secondary btn-sm" title="Generate avatar with Dicebear">
                    <i data-lucide="sparkles"></i>
                    <span>Generate</span>
                  </button>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="profile-name-input">Full Name</label>
              <input type="text" id="profile-name-input" class="form-input" value="${user.full_name || ''}" required>
            </div>

            <div class="form-group">
              <label class="form-label" for="profile-email-input">Email Address</label>
              <input type="email" id="profile-email-input" class="form-input" value="${user.email || ''}" disabled style="background-color: var(--bg-surface-secondary); cursor: not-allowed;">
              <span class="form-hint">Email address is linked to your Supabase authentication account</span>
            </div>

            <div style="display: flex; justify-content: flex-end; margin-top: 18px;">
              <button type="submit" id="btn-save-profile" class="btn btn-primary">
                <i data-lucide="check"></i>
                <span>Update Profile</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Change Password Card -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Change Password</h3>
        </div>
        <div class="card-body">
          <form id="form-change-password">
            <div class="form-group">
              <label class="form-label" for="old-pwd-input">Current Password</label>
              <input type="password" id="old-pwd-input" class="form-input" placeholder="••••••••" required>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="new-pwd-input">New Password</label>
                <input type="password" id="new-pwd-input" class="form-input" placeholder="At least 6 characters" minlength="6" required>
              </div>

              <div class="form-group">
                <label class="form-label" for="confirm-pwd-input">Confirm New Password</label>
                <input type="password" id="confirm-pwd-input" class="form-input" placeholder="Repeat new password" minlength="6" required>
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; margin-top: 18px;">
              <button type="submit" id="btn-submit-change-pwd" class="btn btn-secondary">
                <i data-lucide="lock"></i>
                <span>Change Password</span>
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  `;

  if (window.lucide) window.lucide.createIcons({ root: container });

  // Dicebear generator helper
  const genBtn = container.querySelector('#btn-dicebear-avatar');
  const avatarInput = container.querySelector('#profile-avatar-input');
  const avatarPreview = container.querySelector('#profile-avatar-preview');
  if (genBtn && avatarInput) {
    genBtn.addEventListener('click', () => {
      const name = container.querySelector('#profile-name-input').value.trim() || 'User';
      const randomSeed = Math.random().toString(36).substring(7);
      const url = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name + ' ' + randomSeed)}`;
      avatarInput.value = url;
      avatarPreview.innerHTML = `<img src="${url}" alt="${name}">`;
    });
  }

  // Handle Profile Update
  const formProfile = container.querySelector('#form-update-profile');
  formProfile.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = container.querySelector('#profile-name-input').value.trim();
    const avatarUrl = container.querySelector('#profile-avatar-input').value.trim();
    const btn = container.querySelector('#btn-save-profile');

    try {
      btn.disabled = true;
      const res = await api.updateProfile({ fullName, avatarUrl });
      setAuth(res.user, state.token);

      // Update sidebar avatar and name
      const sidebarName = document.getElementById('sidebar-user-name');
      const sidebarAvatar = document.getElementById('sidebar-user-avatar');
      if (sidebarName) sidebarName.textContent = res.user.full_name;
      if (sidebarAvatar) {
        sidebarAvatar.innerHTML = res.user.avatar_url ? `<img src="${res.user.avatar_url}" alt="${res.user.full_name}">` : res.user.full_name[0];
      }

      showToast({ title: 'Success', message: 'Profile updated successfully!', type: 'success' });
      btn.disabled = false;
    } catch (err) {
      showToast({ title: 'Error', message: err.message, type: 'error' });
      btn.disabled = false;
    }
  });

  // Handle Change Password
  const formPwd = container.querySelector('#form-change-password');
  formPwd.addEventListener('submit', async (e) => {
    e.preventDefault();
    const oldPassword = container.querySelector('#old-pwd-input').value;
    const newPassword = container.querySelector('#new-pwd-input').value;
    const confirm = container.querySelector('#confirm-pwd-input').value;
    const btn = container.querySelector('#btn-submit-change-pwd');

    if (newPassword !== confirm) {
      showToast({ title: 'Password Mismatch', message: 'New passwords do not match.', type: 'error' });
      return;
    }

    try {
      btn.disabled = true;
      await api.changePassword({ oldPassword, newPassword });
      formPwd.reset();
      showToast({ title: 'Password Changed', message: 'Your password has been securely updated.', type: 'success' });
      btn.disabled = false;
    } catch (err) {
      showToast({ title: 'Failed', message: err.message, type: 'error' });
      btn.disabled = false;
    }
  });
}
