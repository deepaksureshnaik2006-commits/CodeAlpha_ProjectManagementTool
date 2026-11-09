-- ==============================================================================
-- TASKORA: Full-Stack Collaborative Project Management Tool
-- Database Schema for Supabase PostgreSQL
-- All tables suffixed with: _taskora
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. Profiles Table (profiles_taskora)
-- Linked directly to Supabase auth.users
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles_taskora (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at_taskora()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::TEXT, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_taskora_updated_at ON public.profiles_taskora;
CREATE TRIGGER set_profiles_taskora_updated_at
    BEFORE UPDATE ON public.profiles_taskora
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at_taskora();

-- Auto-create profile in profiles_taskora on user signup in Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user_taskora()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles_taskora (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles_taskora.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles_taskora.avatar_url);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_taskora ON auth.users;
CREATE TRIGGER on_auth_user_created_taskora
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_taskora();

-- ------------------------------------------------------------------------------
-- 2. Projects Table (projects_taskora)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects_taskora (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6366f1',
    owner_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    CONSTRAINT fk_projects_owner FOREIGN KEY (owner_id) REFERENCES public.profiles_taskora(id) ON DELETE CASCADE
);

DROP TRIGGER IF EXISTS set_projects_taskora_updated_at ON public.projects_taskora;
CREATE TRIGGER set_projects_taskora_updated_at
    BEFORE UPDATE ON public.projects_taskora
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at_taskora();

-- ------------------------------------------------------------------------------
-- 3. Project Members Table (project_members_taskora)
-- Roles: 'owner', 'admin', 'member'
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_members_taskora (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    CONSTRAINT fk_project_members_project FOREIGN KEY (project_id) REFERENCES public.projects_taskora(id) ON DELETE CASCADE,
    CONSTRAINT fk_project_members_user FOREIGN KEY (user_id) REFERENCES public.profiles_taskora(id) ON DELETE CASCADE,
    UNIQUE (project_id, user_id)
);

-- ------------------------------------------------------------------------------
-- 4. Tasks Table (tasks_taskora)
-- Statuses: 'todo', 'in_progress', 'completed'
-- Priorities: 'low', 'medium', 'high', 'urgent'
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks_taskora (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assignee_id UUID,
    created_by UUID NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    CONSTRAINT fk_tasks_project FOREIGN KEY (project_id) REFERENCES public.projects_taskora(id) ON DELETE CASCADE,
    CONSTRAINT fk_tasks_assignee FOREIGN KEY (assignee_id) REFERENCES public.profiles_taskora(id) ON DELETE SET NULL,
    CONSTRAINT fk_tasks_creator FOREIGN KEY (created_by) REFERENCES public.profiles_taskora(id) ON DELETE CASCADE
);

DROP TRIGGER IF EXISTS set_tasks_taskora_updated_at ON public.tasks_taskora;
CREATE TRIGGER set_tasks_taskora_updated_at
    BEFORE UPDATE ON public.tasks_taskora
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at_taskora();

-- ------------------------------------------------------------------------------
-- 5. Task Comments Table (task_comments_taskora)
-- Chronological comment stream
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_comments_taskora (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    CONSTRAINT fk_task_comments_task FOREIGN KEY (task_id) REFERENCES public.tasks_taskora(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_comments_user FOREIGN KEY (user_id) REFERENCES public.profiles_taskora(id) ON DELETE CASCADE
);

DROP TRIGGER IF EXISTS set_task_comments_taskora_updated_at ON public.task_comments_taskora;
CREATE TRIGGER set_task_comments_taskora_updated_at
    BEFORE UPDATE ON public.task_comments_taskora
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at_taskora();

-- ------------------------------------------------------------------------------
-- 6. Notifications Table (notifications_taskora)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications_taskora (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    actor_id UUID,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES public.profiles_taskora(id) ON DELETE CASCADE,
    CONSTRAINT fk_notifications_actor FOREIGN KEY (actor_id) REFERENCES public.profiles_taskora(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------------------------
-- 7. Activities Table (activities_taskora)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activities_taskora (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    user_id UUID,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    CONSTRAINT fk_activities_project FOREIGN KEY (project_id) REFERENCES public.projects_taskora(id) ON DELETE CASCADE,
    CONSTRAINT fk_activities_user FOREIGN KEY (user_id) REFERENCES public.profiles_taskora(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------------------------
-- Performance Indexes
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_projects_taskora_owner ON public.projects_taskora(owner_id);
CREATE INDEX IF NOT EXISTS idx_project_members_taskora_proj_user ON public.project_members_taskora(project_id, user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_taskora_user ON public.project_members_taskora(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_taskora_project ON public.tasks_taskora(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_taskora_status ON public.tasks_taskora(project_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_taskora_assignee ON public.tasks_taskora(assignee_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_taskora_task ON public.task_comments_taskora(task_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_notifications_taskora_user_read ON public.notifications_taskora(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_activities_taskora_project ON public.activities_taskora(project_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- Row Level Security (RLS) Policies
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles_taskora ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects_taskora ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members_taskora ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks_taskora ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments_taskora ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_taskora ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities_taskora ENABLE ROW LEVEL SECURITY;

-- Helper security function: Check project membership
CREATE OR REPLACE FUNCTION public.is_project_member_taskora(p_id UUID, u_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.project_members_taskora
        WHERE project_id = p_id AND user_id = u_id
    ) OR EXISTS (
        SELECT 1 FROM public.projects_taskora
        WHERE id = p_id AND owner_id = u_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Authenticated users can view all profiles and update their own
CREATE POLICY "Public profiles are viewable by authenticated users"
    ON public.profiles_taskora FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON public.profiles_taskora FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- Projects
CREATE POLICY "Project members can view project"
    ON public.projects_taskora FOR SELECT
    TO authenticated
    USING (public.is_project_member_taskora(id, auth.uid()));

CREATE POLICY "Authenticated users can create projects"
    ON public.projects_taskora FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners and admins can update project"
    ON public.projects_taskora FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = owner_id OR
        EXISTS (
            SELECT 1 FROM public.project_members_taskora
            WHERE project_id = id AND user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Only owners can delete project"
    ON public.projects_taskora FOR DELETE
    TO authenticated
    USING (auth.uid() = owner_id);

-- Project Members
CREATE POLICY "Members can view project membership"
    ON public.project_members_taskora FOR SELECT
    TO authenticated
    USING (public.is_project_member_taskora(project_id, auth.uid()));

CREATE POLICY "Owners and admins can add/manage members"
    ON public.project_members_taskora FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.projects_taskora
            WHERE id = project_id AND owner_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.project_members_taskora
            WHERE project_id = project_members_taskora.project_id
              AND user_id = auth.uid()
              AND role IN ('owner', 'admin')
        )
    );

-- Tasks
CREATE POLICY "Project members can view tasks"
    ON public.tasks_taskora FOR SELECT
    TO authenticated
    USING (public.is_project_member_taskora(project_id, auth.uid()));

CREATE POLICY "Project members can insert tasks"
    ON public.tasks_taskora FOR INSERT
    TO authenticated
    WITH CHECK (public.is_project_member_taskora(project_id, auth.uid()));

CREATE POLICY "Project members can update tasks"
    ON public.tasks_taskora FOR UPDATE
    TO authenticated
    USING (public.is_project_member_taskora(project_id, auth.uid()));

CREATE POLICY "Project members can delete tasks"
    ON public.tasks_taskora FOR DELETE
    TO authenticated
    USING (public.is_project_member_taskora(project_id, auth.uid()));

-- Task Comments
CREATE POLICY "Project members can view task comments"
    ON public.task_comments_taskora FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks_taskora t
            WHERE t.id = task_comments_taskora.task_id
              AND public.is_project_member_taskora(t.project_id, auth.uid())
        )
    );

CREATE POLICY "Project members can insert comments"
    ON public.task_comments_taskora FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.tasks_taskora t
            WHERE t.id = task_comments_taskora.task_id
              AND public.is_project_member_taskora(t.project_id, auth.uid())
        )
    );

CREATE POLICY "Comment authors can update own comments"
    ON public.task_comments_taskora FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Comment authors or project admins can delete comments"
    ON public.task_comments_taskora FOR DELETE
    TO authenticated
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.tasks_taskora t
            JOIN public.projects_taskora p ON p.id = t.project_id
            WHERE t.id = task_comments_taskora.task_id AND (
                p.owner_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.project_members_taskora pm
                    WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin')
                )
            )
        )
    );

-- Notifications
CREATE POLICY "Users can view own notifications"
    ON public.notifications_taskora FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
    ON public.notifications_taskora FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- Activities
CREATE POLICY "Members can view project activity"
    ON public.activities_taskora FOR SELECT
    TO authenticated
    USING (public.is_project_member_taskora(project_id, auth.uid()));
