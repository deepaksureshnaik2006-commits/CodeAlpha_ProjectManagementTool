// TASKORA User Profile View

import { api } from '../api.js';
import { state, setAuth } from '../state.js';
import { showToast } from '../components/toast.js';
import { setupPasswordToggles } from '../components/passwordToggle.js';

// Helper to process and resize image files to lightweight Data URLs (max 256x256)
function processImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Please select an image file (PNG, JPG, or WebP).'));
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Export as JPEG with 0.88 quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load selected image.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

export function renderProfileView(container) {
  const user = state.user || {};
  const initials = user.full_name ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';
  let currentAvatarUrl = user.avatar_url || '';

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
            <!-- Profile Avatar Management -->
            <div style="display: flex; align-items: center; gap: 24px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid var(--border-color-light);">
              <div style="position: relative;">
                <div class="avatar avatar-xl" id="profile-avatar-preview" style="cursor: pointer;" title="Click to choose a photo">
                  ${currentAvatarUrl ? `<img src="${currentAvatarUrl}" alt="${user.full_name || 'Profile'}">` : `<span>${initials}</span>`}
                </div>
                <input type="file" id="profile-avatar-file" accept="image/png, image/jpeg, image/jpg, image/webp" style="display: none;">
              </div>
              
              <div style="display: flex; flex-direction: column; gap: 6px;">
                <div style="font-weight: 600; font-size: 0.95rem;">Profile Photo</div>
                <div style="color: var(--text-muted); font-size: 0.78rem;">Upload or edit your personal profile picture.</div>
                <div style="display: flex; align-items: center; gap: 10px; margin-top: 6px;">
                  <button type="button" id="btn-upload-photo" class="btn btn-secondary btn-sm">
                    <i data-lucide="camera"></i>
                    <span id="btn-upload-photo-label">${currentAvatarUrl ? 'Change Photo' : 'Upload Photo'}</span>
                  </button>
                  <button type="button" id="btn-remove-photo" class="btn btn-ghost btn-sm" style="color: var(--color-danger); ${currentAvatarUrl ? '' : 'display: none;'}">
                    <i data-lucide="trash-2"></i>
                    <span>Remove Photo</span>
                  </button>
                </div>
                <input type="hidden" id="profile-avatar-input" value="${currentAvatarUrl}">
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

      <!-- Change Password Card (Direct New Password without Current Password) -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Change Password</h3>
        </div>
        <div class="card-body">
          <p style="color: var(--text-muted); font-size: 0.82rem; margin-bottom: 16px;">
            Set a new secure password directly for your account.
          </p>
          <form id="form-change-password">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="new-pwd-input">New Password</label>
                <div class="password-input-wrap">
                  <input type="password" id="new-pwd-input" class="form-input" placeholder="At least 6 characters" minlength="6" required>
                  <button type="button" class="password-toggle-btn" aria-label="Show password" title="Toggle password visibility">
                    <i data-lucide="eye"></i>
                  </button>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="confirm-pwd-input">Confirm New Password</label>
                <div class="password-input-wrap">
                  <input type="password" id="confirm-pwd-input" class="form-input" placeholder="Repeat new password" minlength="6" required>
                  <button type="button" class="password-toggle-btn" aria-label="Show password" title="Toggle password visibility">
                    <i data-lucide="eye"></i>
                  </button>
                </div>
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; margin-top: 18px;">
              <button type="submit" id="btn-submit-change-pwd" class="btn btn-secondary">
                <i data-lucide="lock"></i>
                <span>Set New Password</span>
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  `;

  if (window.lucide) window.lucide.createIcons({ root: container });
  setupPasswordToggles(container);

  // Avatar Management Elements
  const avatarPreview = container.querySelector('#profile-avatar-preview');
  const fileInput = container.querySelector('#profile-avatar-file');
  const uploadBtn = container.querySelector('#btn-upload-photo');
  const uploadLabel = container.querySelector('#btn-upload-photo-label');
  const removeBtn = container.querySelector('#btn-remove-photo');
  const avatarInput = container.querySelector('#profile-avatar-input');

  // Trigger file chooser on avatar click or upload button click
  const triggerFileChooser = () => fileInput.click();
  if (uploadBtn) uploadBtn.addEventListener('click', triggerFileChooser);
  if (avatarPreview) avatarPreview.addEventListener('click', triggerFileChooser);

  // Handle local file selection
  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      try {
        const dataUrl = await processImageFile(file);
        currentAvatarUrl = dataUrl;
        avatarInput.value = dataUrl;
        avatarPreview.innerHTML = `<img src="${dataUrl}" alt="Profile Preview">`;
        if (uploadLabel) uploadLabel.textContent = 'Change Photo';
        if (removeBtn) removeBtn.style.display = 'inline-flex';
        showToast({ title: 'Photo Ready', message: 'Photo selected! Click "Update Profile" to save.', type: 'info' });
      } catch (err) {
        showToast({ title: 'Image Error', message: err.message, type: 'error' });
      }
    });
  }

  // Handle remove photo
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      currentAvatarUrl = '';
      avatarInput.value = '';
      if (fileInput) fileInput.value = '';
      const name = container.querySelector('#profile-name-input').value.trim() || user.full_name || 'U';
      const initialLetter = name ? name[0].toUpperCase() : 'U';
      avatarPreview.innerHTML = `<span>${initialLetter}</span>`;
      if (uploadLabel) uploadLabel.textContent = 'Upload Photo';
      removeBtn.style.display = 'none';
      showToast({ title: 'Photo Removed', message: 'Profile photo removed. Click "Update Profile" to save.', type: 'info' });
    });
  }

  // Handle Profile Update
  const formProfile = container.querySelector('#form-update-profile');
  formProfile.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = container.querySelector('#profile-name-input').value.trim();
    const avatarUrl = avatarInput.value.trim();
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
        sidebarAvatar.innerHTML = res.user.avatar_url ? `<img src="${res.user.avatar_url}" alt="${res.user.full_name}">` : (res.user.full_name ? res.user.full_name[0].toUpperCase() : 'U');
      }

      showToast({ title: 'Success', message: 'Profile updated successfully!', type: 'success' });
      btn.disabled = false;
    } catch (err) {
      showToast({ title: 'Error', message: err.message, type: 'error' });
      btn.disabled = false;
    }
  });

  // Handle Direct Password Change
  const formPwd = container.querySelector('#form-change-password');
  formPwd.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = container.querySelector('#new-pwd-input').value;
    const confirm = container.querySelector('#confirm-pwd-input').value;
    const btn = container.querySelector('#btn-submit-change-pwd');

    if (newPassword.length < 6) {
      showToast({ title: 'Password Too Short', message: 'New password must be at least 6 characters.', type: 'error' });
      return;
    }

    if (newPassword !== confirm) {
      showToast({ title: 'Password Mismatch', message: 'New passwords do not match.', type: 'error' });
      return;
    }

    try {
      btn.disabled = true;
      await api.changePassword({ newPassword });
      formPwd.reset();
      showToast({ title: 'Password Updated', message: 'Your new password has been set successfully.', type: 'success' });
      btn.disabled = false;
    } catch (err) {
      showToast({ title: 'Failed', message: err.message, type: 'error' });
      btn.disabled = false;
    }
  });
}
