const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const { supabase, isSupabaseConfigured } = require('./supabase');

// Local file-backed database path
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'taskora_db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial structure for local persistence
const initialData = {
  users: [], // { id, email, password_hash, full_name, avatar_url, reset_token, created_at, updated_at }
  profiles: [], // { id, email, full_name, avatar_url, created_at, updated_at }
  projects: [], // { id, name, description, color, owner_id, created_at, updated_at }
  project_members: [], // { id, project_id, user_id, role, created_at }
  tasks: [], // { id, project_id, title, description, status, priority, assignee_id, created_by, due_date, position, created_at, updated_at }
  task_comments: [], // { id, task_id, user_id, content, created_at, updated_at }
  notifications: [], // { id, user_id, actor_id, type, title, message, link, is_read, created_at }
  activities: [] // { id, project_id, user_id, action, details, created_at }
};

function readLocalDb() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf8');
    return JSON.parse(JSON.stringify(initialData));
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return { ...initialData, ...parsed };
  } catch (err) {
    console.error('[TASKORA DB] Error reading DB file, recreating:', err.message);
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf8');
    return JSON.parse(JSON.stringify(initialData));
  }
}

function writeLocalDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[TASKORA DB] Error saving local DB:', err.message);
  }
}

// ==============================================================================
// DATABASE REPOSITORY IMPLEMENTATION
// ==============================================================================

const db = {
  isSupabase: isSupabaseConfigured,

  // ----------------------------------------------------------------------------
  // AUTH & USERS / PROFILES
  // ----------------------------------------------------------------------------
  async registerUser({ email, password, fullName, avatarUrl = '' }) {
    const normEmail = email.toLowerCase().trim();

    if (isSupabaseConfigured()) {
      let userId;
      const avatar = avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`;

      // 1. Try Supabase Auth Admin creation (auto-confirms email so registration doesn't fail on SMTP)
      try {
        const { data: adminData, error: adminErr } = await supabase.auth.admin.createUser({
          email: normEmail,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            avatar_url: avatar
          }
        });
        if (adminErr) {
          // If user already exists, bubble up error
          if (adminErr.message && adminErr.message.toLowerCase().includes('already')) {
            throw adminErr;
          }
          throw adminErr;
        }
        userId = adminData.user?.id;
      } catch (err) {
        // If admin failed for another reason, try standard signUp
        if (err.message && err.message.toLowerCase().includes('already')) {
          throw err;
        }
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email: normEmail,
          password,
          options: {
            data: {
              full_name: fullName,
              avatar_url: avatar
            }
          }
        });
        if (authErr) throw authErr;
        userId = authData.user?.id;
      }

      // Upsert into public.profiles_taskora
      const { data: profile, error: profErr } = await supabase
        .from('profiles_taskora')
        .upsert({
          id: userId,
          email: normEmail,
          full_name: fullName,
          avatar_url: avatar,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (profErr) {
        console.warn('[TASKORA] Profile upsert warning:', profErr.message);
      }
      return profile || { id: userId, email: normEmail, full_name: fullName, avatar_url: avatar };
    }

    // Local DB fallback
    const local = readLocalDb();
    const existing = local.users.find(u => u.email === normEmail);
    if (existing) {
      throw new Error('User with this email already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const now = new Date().toISOString();
    const newId = uuidv4();
    const defaultAvatar = avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`;

    const newUser = {
      id: newId,
      email: normEmail,
      password_hash: hash,
      full_name: fullName,
      avatar_url: defaultAvatar,
      created_at: now,
      updated_at: now
    };

    const newProfile = {
      id: newId,
      email: normEmail,
      full_name: fullName,
      avatar_url: defaultAvatar,
      created_at: now,
      updated_at: now
    };

    local.users.push(newUser);
    local.profiles.push(newProfile);
    writeLocalDb(local);

    return newProfile;
  },

  async authenticateUser({ email, password }) {
    const normEmail = email.toLowerCase().trim();

    if (isSupabaseConfigured()) {
      // Create isolated auth client so we never overwrite the main service_role credentials
      const authClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } }
      );

      const { data, error } = await authClient.auth.signInWithPassword({
        email: normEmail,
        password
      });
      if (error) throw error;

      let { data: profile } = await supabase
        .from('profiles_taskora')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (!profile) {
        // Auto-provision profile into profiles_taskora if user was registered in another app on this Supabase project
        const fullName = data.user.user_metadata?.full_name || normEmail.split('@')[0];
        const avatarUrl = data.user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`;
        try {
          const { data: newProfile } = await supabase
            .from('profiles_taskora')
            .upsert({
              id: data.user.id,
              email: normEmail,
              full_name: fullName,
              avatar_url: avatarUrl,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();
          profile = newProfile;
        } catch (e) {
          console.warn('[TASKORA] Auto-profile creation notice:', e.message);
        }
      }

      return {
        user: profile || { id: data.user.id, email: normEmail, full_name: data.user.user_metadata?.full_name || normEmail },
        session: data.session
      };
    }

    // Local DB
    const local = readLocalDb();
    const user = local.users.find(u => u.email === normEmail);
    if (!user) {
      throw new Error('Invalid email or password.');
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      throw new Error('Invalid email or password.');
    }

    const profile = local.profiles.find(p => p.id === user.id) || {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url
    };

    return { user: profile, session: null };
  },

  async getProfileById(userId) {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('profiles_taskora')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) return null;
      return data;
    }

    const local = readLocalDb();
    return local.profiles.find(p => p.id === userId) || null;
  },

  async getProfileByEmail(email) {
    const normEmail = email.toLowerCase().trim();
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('profiles_taskora')
        .select('*')
        .eq('email', normEmail)
        .single();
      if (error) return null;
      return data;
    }

    const local = readLocalDb();
    return local.profiles.find(p => p.email === normEmail) || null;
  },

  async updateProfile(userId, { fullName, avatarUrl }) {
    const now = new Date().toISOString();
    if (isSupabaseConfigured()) {
      const updateData = { updated_at: now };
      if (fullName !== undefined) updateData.full_name = fullName;
      if (avatarUrl !== undefined) updateData.avatar_url = avatarUrl;

      const { data, error } = await supabase
        .from('profiles_taskora')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const local = readLocalDb();
    const idx = local.profiles.findIndex(p => p.id === userId);
    if (idx === -1) throw new Error('Profile not found.');

    if (fullName !== undefined) local.profiles[idx].full_name = fullName;
    if (avatarUrl !== undefined) local.profiles[idx].avatar_url = avatarUrl;
    local.profiles[idx].updated_at = now;

    // also sync user record
    const userIdx = local.users.findIndex(u => u.id === userId);
    if (userIdx !== -1) {
      if (fullName !== undefined) local.users[userIdx].full_name = fullName;
      if (avatarUrl !== undefined) local.users[userIdx].avatar_url = avatarUrl;
      local.users[userIdx].updated_at = now;
    }

    writeLocalDb(local);
    return local.profiles[idx];
  },

  async changePassword(userId, { newPassword }) {
    if (isSupabaseConfigured()) {
      if (supabase.auth.admin?.updateUserById) {
        const { data, error } = await supabase.auth.admin.updateUserById(userId, { password: newPassword });
        if (error) throw error;
        return { success: true };
      }
      const { data, error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return { success: true };
    }

    const local = readLocalDb();
    const user = local.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found.');

    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(newPassword, salt);
    user.updated_at = new Date().toISOString();
    writeLocalDb(local);
    return { success: true };
  },

  async requestPasswordReset(email) {
    const normEmail = email.toLowerCase().trim();
    if (isSupabaseConfigured()) {
      const { error } = await supabase.auth.resetPasswordForEmail(normEmail);
      if (error) throw error;
      return { success: true, message: 'Password reset link sent to your email.' };
    }

    const local = readLocalDb();
    const user = local.users.find(u => u.email === normEmail);
    if (!user) {
      // Don't disclose non-existence for security, but return success
      return { success: true, message: 'If an account exists with this email, a reset token has been issued.' };
    }
    const token = uuidv4().substring(0, 8);
    user.reset_token = token;
    writeLocalDb(local);
    return { success: true, resetToken: token, message: `Reset token generated: ${token}` };
  },

  async resetPasswordWithToken({ email, token, newPassword }) {
    const normEmail = email.toLowerCase().trim();
    if (isSupabaseConfigured()) {
      // Supabase handles session exchange via recovery link, but if token is provided:
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return { success: true, message: 'Password reset successfully.' };
    }

    const local = readLocalDb();
    const user = local.users.find(u => u.email === normEmail);
    if (!user || (user.reset_token && user.reset_token !== token)) {
      throw new Error('Invalid or expired reset token.');
    }

    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(newPassword, salt);
    user.reset_token = null;
    user.updated_at = new Date().toISOString();
    writeLocalDb(local);
    return { success: true, message: 'Password has been reset successfully.' };
  },

  async searchProfiles(query = '', excludeUserId = null) {
    const q = query.toLowerCase().trim();
    if (isSupabaseConfigured()) {
      let req = supabase
        .from('profiles_taskora')
        .select('id, email, full_name, avatar_url');
      if (q) {
        req = req.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
      }
      if (excludeUserId) {
        req = req.neq('id', excludeUserId);
      }
      const { data, error } = await req.limit(20);
      if (error) throw error;
      return data || [];
    }

    const local = readLocalDb();
    return local.profiles
      .filter(p => {
        if (excludeUserId && p.id === excludeUserId) return false;
        if (!q) return true;
        return (
          (p.full_name && p.full_name.toLowerCase().includes(q)) ||
          (p.email && p.email.toLowerCase().includes(q))
        );
      })
      .slice(0, 20)
      .map(p => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        avatar_url: p.avatar_url
      }));
  },

  // ----------------------------------------------------------------------------
  // PROJECTS
  // ----------------------------------------------------------------------------
  async createProject({ name, description = '', color = '#6366f1', ownerId }) {
    const now = new Date().toISOString();
    const projectId = uuidv4();

    if (isSupabaseConfigured()) {
      const { data: project, error: projErr } = await supabase
        .from('projects_taskora')
        .insert({
          id: projectId,
          name,
          description,
          color,
          owner_id: ownerId,
          created_at: now,
          updated_at: now
        })
        .select()
        .single();
      if (projErr) throw projErr;

      // Add owner as a member with 'owner' role
      await supabase.from('project_members_taskora').insert({
        project_id: projectId,
        user_id: ownerId,
        role: 'owner',
        created_at: now
      });

      // Record activity
      await this.createActivity({
        projectId,
        userId: ownerId,
        action: 'created_project',
        details: { projectName: name }
      });

      return project;
    }

    const local = readLocalDb();
    const newProject = {
      id: projectId,
      name,
      description,
      color,
      owner_id: ownerId,
      created_at: now,
      updated_at: now
    };
    local.projects.push(newProject);

    local.project_members.push({
      id: uuidv4(),
      project_id: projectId,
      user_id: ownerId,
      role: 'owner',
      created_at: now
    });

    writeLocalDb(local);

    await this.createActivity({
      projectId,
      userId: ownerId,
      action: 'created_project',
      details: { projectName: name }
    });

    return newProject;
  },

  async getProjectsForUser(userId) {
    if (isSupabaseConfigured()) {
      // Find projects where user is owner or member
      const { data: memberships, error: memErr } = await supabase
        .from('project_members_taskora')
        .select('project_id, role')
        .eq('user_id', userId);
      if (memErr) throw memErr;

      const projectIds = memberships.map(m => m.project_id);
      if (projectIds.length === 0) return [];

      const { data: projects, error: projErr } = await supabase
        .from('projects_taskora')
        .select(`
          *,
          owner:profiles_taskora!fk_projects_owner(id, full_name, email, avatar_url)
        `)
        .in('id', projectIds)
        .order('created_at', { ascending: false });
      if (projErr) throw projErr;

      // Attach member counts, task counts, and user's role
      const enriched = await Promise.all(
        projects.map(async p => {
          const role = memberships.find(m => m.project_id === p.id)?.role || (p.owner_id === userId ? 'owner' : 'member');
          const { count: memberCount } = await supabase
            .from('project_members_taskora')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', p.id);
          const { data: tasks } = await supabase
            .from('tasks_taskora')
            .select('status')
            .eq('project_id', p.id);
          const totalTasks = tasks ? tasks.length : 0;
          const completedTasks = tasks ? tasks.filter(t => t.status === 'completed').length : 0;
          return {
            ...p,
            userRole: role,
            memberCount: memberCount || 1,
            totalTasks,
            completedTasks,
            progress: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100)
          };
        })
      );
      return enriched;
    }

    const local = readLocalDb();
    const memberships = local.project_members.filter(m => m.user_id === userId);
    const memberProjectIds = new Set(memberships.map(m => m.project_id));
    // Also include owned projects if somehow not in members
    local.projects.forEach(p => {
      if (p.owner_id === userId) memberProjectIds.add(p.id);
    });

    const userProjects = local.projects
      .filter(p => memberProjectIds.has(p.id))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(p => {
        const mem = memberships.find(m => m.project_id === p.id);
        const role = mem ? mem.role : (p.owner_id === userId ? 'owner' : 'member');
        const owner = local.profiles.find(prof => prof.id === p.owner_id) || { full_name: 'Unknown', email: '' };
        const memberCount = local.project_members.filter(m => m.project_id === p.id).length;
        const projectTasks = local.tasks.filter(t => t.project_id === p.id);
        const totalTasks = projectTasks.length;
        const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
        return {
          ...p,
          owner,
          userRole: role,
          memberCount: Math.max(memberCount, 1),
          totalTasks,
          completedTasks,
          progress: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100)
        };
      });

    return userProjects;
  },

  async getProjectById(projectId) {
    if (isSupabaseConfigured()) {
      const { data: project, error } = await supabase
        .from('projects_taskora')
        .select(`
          *,
          owner:profiles_taskora!fk_projects_owner(id, full_name, email, avatar_url)
        `)
        .eq('id', projectId)
        .single();
      if (error) return null;
      return project;
    }

    const local = readLocalDb();
    const proj = local.projects.find(p => p.id === projectId);
    if (!proj) return null;
    const owner = local.profiles.find(prof => prof.id === proj.owner_id);
    return { ...proj, owner };
  },

  async updateProject(projectId, { name, description, color }) {
    const now = new Date().toISOString();
    if (isSupabaseConfigured()) {
      const updates = { updated_at: now };
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (color !== undefined) updates.color = color;

      const { data, error } = await supabase
        .from('projects_taskora')
        .update(updates)
        .eq('id', projectId)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const local = readLocalDb();
    const idx = local.projects.findIndex(p => p.id === projectId);
    if (idx === -1) throw new Error('Project not found.');

    if (name !== undefined) local.projects[idx].name = name;
    if (description !== undefined) local.projects[idx].description = description;
    if (color !== undefined) local.projects[idx].color = color;
    local.projects[idx].updated_at = now;

    writeLocalDb(local);
    return local.projects[idx];
  },

  async deleteProject(projectId) {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('projects_taskora').delete().eq('id', projectId);
      if (error) throw error;
      return true;
    }

    const local = readLocalDb();
    local.projects = local.projects.filter(p => p.id !== projectId);
    local.project_members = local.project_members.filter(m => m.project_id !== projectId);
    const taskIds = local.tasks.filter(t => t.project_id === projectId).map(t => t.id);
    local.tasks = local.tasks.filter(t => t.project_id !== projectId);
    local.task_comments = local.task_comments.filter(c => !taskIds.includes(c.task_id));
    local.activities = local.activities.filter(a => a.project_id !== projectId);
    writeLocalDb(local);
    return true;
  },

  // ----------------------------------------------------------------------------
  // PROJECT MEMBERS
  // ----------------------------------------------------------------------------
  async getProjectMembers(projectId) {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('project_members_taskora')
        .select(`
          id,
          project_id,
          user_id,
          role,
          created_at,
          user:profiles_taskora!fk_project_members_user(id, full_name, email, avatar_url)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data.map(m => ({
        id: m.id,
        project_id: m.project_id,
        user_id: m.user_id,
        role: m.role,
        created_at: m.created_at,
        full_name: m.user?.full_name || 'User',
        email: m.user?.email || '',
        avatar_url: m.user?.avatar_url || ''
      }));
    }

    const local = readLocalDb();
    const members = local.project_members.filter(m => m.project_id === projectId);
    return members.map(m => {
      const profile = local.profiles.find(p => p.id === m.user_id) || {};
      return {
        id: m.id,
        project_id: m.project_id,
        user_id: m.user_id,
        role: m.role,
        created_at: m.created_at,
        full_name: profile.full_name || 'User',
        email: profile.email || '',
        avatar_url: profile.avatar_url || ''
      };
    });
  },

  async addProjectMember(projectId, userId, role = 'member') {
    const now = new Date().toISOString();
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('project_members_taskora')
        .insert({
          project_id: projectId,
          user_id: userId,
          role,
          created_at: now
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const local = readLocalDb();
    const exists = local.project_members.find(
      m => m.project_id === projectId && m.user_id === userId
    );
    if (exists) {
      throw new Error('User is already a member of this project.');
    }

    const newMember = {
      id: uuidv4(),
      project_id: projectId,
      user_id: userId,
      role,
      created_at: now
    };
    local.project_members.push(newMember);
    writeLocalDb(local);
    return newMember;
  },

  async updateProjectMemberRole(projectId, userId, role) {
    if (!['owner', 'admin', 'member'].includes(role)) {
      throw new Error('Invalid role specified.');
    }

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('project_members_taskora')
        .update({ role })
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const local = readLocalDb();
    const member = local.project_members.find(
      m => m.project_id === projectId && m.user_id === userId
    );
    if (!member) throw new Error('Member not found in project.');

    member.role = role;
    writeLocalDb(local);
    return member;
  },

  async removeProjectMember(projectId, userId) {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('project_members_taskora')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userId);
      if (error) throw error;
      return true;
    }

    const local = readLocalDb();
    local.project_members = local.project_members.filter(
      m => !(m.project_id === projectId && m.user_id === userId)
    );
    // Unassign tasks assigned to this removed member
    local.tasks.forEach(t => {
      if (t.project_id === projectId && t.assignee_id === userId) {
        t.assignee_id = null;
      }
    });
    writeLocalDb(local);
    return true;
  },

  async getUserRoleInProject(projectId, userId) {
    if (isSupabaseConfigured()) {
      // Check owner first
      const { data: proj } = await supabase
        .from('projects_taskora')
        .select('owner_id')
        .eq('id', projectId)
        .single();
      if (proj && proj.owner_id === userId) return 'owner';

      const { data: mem } = await supabase
        .from('project_members_taskora')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .single();
      return mem ? mem.role : null;
    }

    const local = readLocalDb();
    const proj = local.projects.find(p => p.id === projectId);
    if (proj && proj.owner_id === userId) return 'owner';

    const mem = local.project_members.find(
      m => m.project_id === projectId && m.user_id === userId
    );
    return mem ? mem.role : null;
  },

  // ----------------------------------------------------------------------------
  // TASKS
  // ----------------------------------------------------------------------------
  async createTask({
    projectId,
    title,
    description = '',
    status = 'todo',
    priority = 'medium',
    assigneeId = null,
    createdBy,
    dueDate = null,
    position = 0
  }) {
    const now = new Date().toISOString();
    const taskId = uuidv4();

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('tasks_taskora')
        .insert({
          id: taskId,
          project_id: projectId,
          title,
          description,
          status,
          priority,
          assignee_id: assigneeId || null,
          created_by: createdBy,
          due_date: dueDate || null,
          position,
          created_at: now,
          updated_at: now
        })
        .select(`
          *,
          assignee:profiles_taskora!fk_tasks_assignee(id, full_name, email, avatar_url),
          creator:profiles_taskora!fk_tasks_creator(id, full_name, email, avatar_url)
        `)
        .single();
      if (error) throw error;
      return data;
    }

    const local = readLocalDb();
    const newTask = {
      id: taskId,
      project_id: projectId,
      title,
      description,
      status,
      priority,
      assignee_id: assigneeId || null,
      created_by: createdBy,
      due_date: dueDate || null,
      position,
      created_at: now,
      updated_at: now
    };
    local.tasks.push(newTask);
    writeLocalDb(local);

    const assignee = assigneeId ? local.profiles.find(p => p.id === assigneeId) || null : null;
    const creator = local.profiles.find(p => p.id === createdBy) || null;
    return { ...newTask, assignee, creator, comment_count: 0 };
  },

  async getTasksByProject(projectId) {
    if (isSupabaseConfigured()) {
      const { data: tasks, error } = await supabase
        .from('tasks_taskora')
        .select(`
          *,
          assignee:profiles_taskora!fk_tasks_assignee(id, full_name, email, avatar_url),
          creator:profiles_taskora!fk_tasks_creator(id, full_name, email, avatar_url)
        `)
        .eq('project_id', projectId)
        .order('position', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Count comments for each task
      const taskIds = tasks.map(t => t.id);
      if (taskIds.length === 0) return [];

      const { data: commentCounts } = await supabase
        .from('task_comments_taskora')
        .select('task_id')
        .in('task_id', taskIds);

      const countsMap = {};
      (commentCounts || []).forEach(c => {
        countsMap[c.task_id] = (countsMap[c.task_id] || 0) + 1;
      });

      return tasks.map(t => ({
        ...t,
        comment_count: countsMap[t.id] || 0
      }));
    }

    const local = readLocalDb();
    const tasks = local.tasks.filter(t => t.project_id === projectId);
    return tasks
      .sort((a, b) => a.position - b.position)
      .map(t => {
        const assignee = t.assignee_id ? local.profiles.find(p => p.id === t.assignee_id) || null : null;
        const creator = local.profiles.find(p => p.id === t.created_by) || null;
        const comment_count = local.task_comments.filter(c => c.task_id === t.id).length;
        return { ...t, assignee, creator, comment_count };
      });
  },

  async getTaskById(taskId) {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('tasks_taskora')
        .select(`
          *,
          assignee:profiles_taskora!fk_tasks_assignee(id, full_name, email, avatar_url),
          creator:profiles_taskora!fk_tasks_creator(id, full_name, email, avatar_url),
          project:projects_taskora!fk_tasks_project(id, name, color)
        `)
        .eq('id', taskId)
        .single();
      if (error) return null;

      const { count } = await supabase
        .from('task_comments_taskora')
        .select('*', { count: 'exact', head: true })
        .eq('task_id', taskId);

      return { ...data, comment_count: count || 0 };
    }

    const local = readLocalDb();
    const task = local.tasks.find(t => t.id === taskId);
    if (!task) return null;

    const assignee = task.assignee_id ? local.profiles.find(p => p.id === task.assignee_id) || null : null;
    const creator = local.profiles.find(p => p.id === task.created_by) || null;
    const project = local.projects.find(p => p.id === task.project_id) || null;
    const comment_count = local.task_comments.filter(c => c.task_id === task.id).length;

    return { ...task, assignee, creator, project, comment_count };
  },

  async updateTask(taskId, updates) {
    const now = new Date().toISOString();
    const allowed = ['title', 'description', 'status', 'priority', 'assignee_id', 'due_date', 'position'];
    const filteredUpdates = { updated_at: now };

    for (const key of allowed) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('tasks_taskora')
        .update(filteredUpdates)
        .eq('id', taskId)
        .select(`
          *,
          assignee:profiles_taskora!fk_tasks_assignee(id, full_name, email, avatar_url),
          creator:profiles_taskora!fk_tasks_creator(id, full_name, email, avatar_url)
        `)
        .single();
      if (error) throw error;
      return data;
    }

    const local = readLocalDb();
    const idx = local.tasks.findIndex(t => t.id === taskId);
    if (idx === -1) throw new Error('Task not found.');

    Object.assign(local.tasks[idx], filteredUpdates);
    writeLocalDb(local);

    const task = local.tasks[idx];
    const assignee = task.assignee_id ? local.profiles.find(p => p.id === task.assignee_id) || null : null;
    const creator = local.profiles.find(p => p.id === task.created_by) || null;
    const comment_count = local.task_comments.filter(c => c.task_id === task.id).length;

    return { ...task, assignee, creator, comment_count };
  },

  async deleteTask(taskId) {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('tasks_taskora').delete().eq('id', taskId);
      if (error) throw error;
      return true;
    }

    const local = readLocalDb();
    local.tasks = local.tasks.filter(t => t.id !== taskId);
    local.task_comments = local.task_comments.filter(c => c.task_id !== taskId);
    writeLocalDb(local);
    return true;
  },

  // ----------------------------------------------------------------------------
  // COMMENTS
  // ----------------------------------------------------------------------------
  async createComment({ taskId, userId, content }) {
    const now = new Date().toISOString();
    const commentId = uuidv4();

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('task_comments_taskora')
        .insert({
          id: commentId,
          task_id: taskId,
          user_id: userId,
          content,
          created_at: now,
          updated_at: now
        })
        .select(`
          *,
          user:profiles_taskora!fk_task_comments_user(id, full_name, email, avatar_url)
        `)
        .single();
      if (error) throw error;
      return data;
    }

    const local = readLocalDb();
    const newComment = {
      id: commentId,
      task_id: taskId,
      user_id: userId,
      content,
      created_at: now,
      updated_at: now
    };
    local.task_comments.push(newComment);
    writeLocalDb(local);

    const user = local.profiles.find(p => p.id === userId) || null;
    return { ...newComment, user };
  },

  async getCommentsByTask(taskId) {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('task_comments_taskora')
        .select(`
          *,
          user:profiles_taskora!fk_task_comments_user(id, full_name, email, avatar_url)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    }

    const local = readLocalDb();
    return local.task_comments
      .filter(c => c.task_id === taskId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map(c => {
        const user = local.profiles.find(p => p.id === c.user_id) || null;
        return { ...c, user };
      });
  },

  async getCommentById(commentId) {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('task_comments_taskora')
        .select('*')
        .eq('id', commentId)
        .single();
      if (error) return null;
      return data;
    }

    const local = readLocalDb();
    return local.task_comments.find(c => c.id === commentId) || null;
  },

  async updateComment(commentId, content) {
    const now = new Date().toISOString();
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('task_comments_taskora')
        .update({ content, updated_at: now })
        .eq('id', commentId)
        .select(`
          *,
          user:profiles_taskora!fk_task_comments_user(id, full_name, email, avatar_url)
        `)
        .single();
      if (error) throw error;
      return data;
    }

    const local = readLocalDb();
    const comment = local.task_comments.find(c => c.id === commentId);
    if (!comment) throw new Error('Comment not found.');

    comment.content = content;
    comment.updated_at = now;
    writeLocalDb(local);

    const user = local.profiles.find(p => p.id === comment.user_id) || null;
    return { ...comment, user };
  },

  async deleteComment(commentId) {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('task_comments_taskora').delete().eq('id', commentId);
      if (error) throw error;
      return true;
    }

    const local = readLocalDb();
    local.task_comments = local.task_comments.filter(c => c.id !== commentId);
    writeLocalDb(local);
    return true;
  },

  // ----------------------------------------------------------------------------
  // NOTIFICATIONS
  // ----------------------------------------------------------------------------
  async createNotification({ userId, actorId, type, title, message, link = '' }) {
    const now = new Date().toISOString();
    const notifId = uuidv4();

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('notifications_taskora')
        .insert({
          id: notifId,
          user_id: userId,
          actor_id: actorId || null,
          type,
          title,
          message,
          link,
          is_read: false,
          created_at: now
        })
        .select(`
          *,
          actor:profiles_taskora!fk_notifications_actor(id, full_name, avatar_url)
        `)
        .single();
      if (error) throw error;
      return data;
    }

    const local = readLocalDb();
    const newNotif = {
      id: notifId,
      user_id: userId,
      actor_id: actorId || null,
      type,
      title,
      message,
      link,
      is_read: false,
      created_at: now
    };
    local.notifications.push(newNotif);
    writeLocalDb(local);

    const actor = actorId ? local.profiles.find(p => p.id === actorId) || null : null;
    return { ...newNotif, actor };
  },

  async getNotificationsByUser(userId, limit = 50) {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('notifications_taskora')
        .select(`
          *,
          actor:profiles_taskora!fk_notifications_actor(id, full_name, avatar_url)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    }

    const local = readLocalDb();
    return local.notifications
      .filter(n => n.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit)
      .map(n => {
        const actor = n.actor_id ? local.profiles.find(p => p.id === n.actor_id) || null : null;
        return { ...n, actor };
      });
  },

  async markNotificationAsRead(notificationId, userId) {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('notifications_taskora')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const local = readLocalDb();
    const notif = local.notifications.find(n => n.id === notificationId && n.user_id === userId);
    if (notif) {
      notif.is_read = true;
      writeLocalDb(local);
    }
    return notif;
  },

  async markAllNotificationsAsRead(userId) {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('notifications_taskora')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      if (error) throw error;
      return true;
    }

    const local = readLocalDb();
    local.notifications.forEach(n => {
      if (n.user_id === userId) n.is_read = true;
    });
    writeLocalDb(local);
    return true;
  },

  async getUnreadNotificationCount(userId) {
    if (isSupabaseConfigured()) {
      const { count, error } = await supabase
        .from('notifications_taskora')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      if (error) return 0;
      return count || 0;
    }

    const local = readLocalDb();
    return local.notifications.filter(n => n.user_id === userId && !n.is_read).length;
  },

  // ----------------------------------------------------------------------------
  // ACTIVITIES (AUDIT TRAIL & RECENT ACTIVITY)
  // ----------------------------------------------------------------------------
  async createActivity({ projectId, userId, action, details = {} }) {
    const now = new Date().toISOString();
    const actId = uuidv4();

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('activities_taskora')
        .insert({
          id: actId,
          project_id: projectId,
          user_id: userId || null,
          action,
          details,
          created_at: now
        })
        .select()
        .single();
      if (error) console.warn('[TASKORA] Activity insert error:', error.message);
      return data;
    }

    const local = readLocalDb();
    const newAct = {
      id: actId,
      project_id: projectId,
      user_id: userId || null,
      action,
      details,
      created_at: now
    };
    local.activities.push(newAct);
    writeLocalDb(local);
    return newAct;
  },

  async getActivitiesByProject(projectId, limit = 30) {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('activities_taskora')
        .select(`
          *,
          user:profiles_taskora!fk_activities_user(id, full_name, avatar_url)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    }

    const local = readLocalDb();
    return local.activities
      .filter(a => a.project_id === projectId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit)
      .map(a => {
        const user = a.user_id ? local.profiles.find(p => p.id === a.user_id) || null : null;
        return { ...a, user };
      });
  },

  // ----------------------------------------------------------------------------
  // DASHBOARD AGGREGATE STATS
  // ----------------------------------------------------------------------------
  async getDashboardStats(userId) {
    // 1. Projects user belongs to
    const projects = await this.getProjectsForUser(userId);
    const projectIds = projects.map(p => p.id);

    if (projectIds.length === 0) {
      return {
        totalProjects: 0,
        totalAssignedTasks: 0,
        tasksInProgress: 0,
        completedTasks: 0,
        pendingTasks: 0,
        upcomingDeadlines: [],
        recentActivity: []
      };
    }

    if (isSupabaseConfigured()) {
      // Get all tasks across user's projects
      const { data: allTasks } = await supabase
        .from('tasks_taskora')
        .select(`
          *,
          project:projects_taskora!fk_tasks_project(id, name, color),
          assignee:profiles_taskora!fk_tasks_assignee(id, full_name, avatar_url)
        `)
        .in('project_id', projectIds);

      const tasks = allTasks || [];
      const assignedTasks = tasks.filter(t => t.assignee_id === userId);

      const totalProjects = projects.length;
      const totalAssignedTasks = assignedTasks.length;
      const tasksInProgress = assignedTasks.filter(t => t.status === 'in_progress').length;
      const completedTasks = assignedTasks.filter(t => t.status === 'completed').length;
      const pendingTasks = assignedTasks.filter(t => t.status === 'todo').length;

      // Upcoming deadlines: assigned tasks or project tasks with due_date
      const now = new Date();
      const upcomingDeadlines = tasks
        .filter(t => t.due_date && t.status !== 'completed')
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
        .slice(0, 5);

      // Recent activities across projects
      const { data: activities } = await supabase
        .from('activities_taskora')
        .select(`
          *,
          user:profiles_taskora!fk_activities_user(id, full_name, avatar_url),
          project:projects_taskora!fk_activities_project(id, name)
        `)
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
        .limit(10);

      return {
        totalProjects,
        totalAssignedTasks,
        tasksInProgress,
        completedTasks,
        pendingTasks,
        upcomingDeadlines,
        recentActivity: activities || []
      };
    }

    // Local DB stats
    const local = readLocalDb();
    const tasks = local.tasks.filter(t => projectIds.includes(t.project_id));
    const assignedTasks = tasks.filter(t => t.assignee_id === userId);

    const totalProjects = projects.length;
    const totalAssignedTasks = assignedTasks.length;
    const tasksInProgress = assignedTasks.filter(t => t.status === 'in_progress').length;
    const completedTasks = assignedTasks.filter(t => t.status === 'completed').length;
    const pendingTasks = assignedTasks.filter(t => t.status === 'todo').length;

    const upcomingDeadlines = tasks
      .filter(t => t.due_date && t.status !== 'completed')
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
      .slice(0, 5)
      .map(t => {
        const project = local.projects.find(p => p.id === t.project_id);
        const assignee = t.assignee_id ? local.profiles.find(p => p.id === t.assignee_id) : null;
        return { ...t, project, assignee };
      });

    const recentActivity = local.activities
      .filter(a => projectIds.includes(a.project_id))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10)
      .map(a => {
        const user = a.user_id ? local.profiles.find(p => p.id === a.user_id) : null;
        const project = local.projects.find(p => p.id === a.project_id);
        return { ...a, user, project };
      });

    return {
      totalProjects,
      totalAssignedTasks,
      tasksInProgress,
      completedTasks,
      pendingTasks,
      upcomingDeadlines,
      recentActivity
    };
  }
};

module.exports = db;

