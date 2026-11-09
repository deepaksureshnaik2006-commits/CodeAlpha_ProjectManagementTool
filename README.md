# TASKORA – Full-Stack Collaborative Project Management Tool

> **Plan Together. Work Smarter. Deliver Better.**

TASKORA is a modern, high-performance collaborative project management application designed for agile teams, engineering squads, and cross-functional organizations. Built from the ground up with a dark-charcoal SaaS aesthetic, crisp typography, and fluid micro-interactions, TASKORA delivers an experience comparable to industry leaders like Asana and Trello.

---

## 🌟 Key Features

### 1. Group Project Management & Role-Based Access Control (RBAC)
- **Create & Configure Projects**: Set project name, description, and custom color accents.
- **Team Collaboration**: Invite registered users to projects by email or user ID.
- **Granular Roles**:
  - 👑 **Owner**: Full control over project settings, member management, and project deletion.
  - 🛡️ **Admin**: Manage team members, project settings, tasks, and columns.
  - 👤 **Member**: Create, move, assign, and comment on tasks.
- **Data Isolation**: Strict project-level membership authorization guarantees complete isolation of workspaces.

### 2. Interactive Kanban Boards & Task Workflow
- **Standard Columns**: **To Do**, **In Progress**, and **Completed**.
- **Native Drag & Drop**: Fluid HTML5 drag-and-drop mechanics to move task cards across workflow columns.
- **Comprehensive Task Attributes**: Title, rich description, priority badges (*Low*, *Medium*, *High*, *Urgent*), assignee avatar, due dates with overdue warnings, and live comment counters.
- **Instant Search & Multi-Criteria Filtering**: Filter tasks in real time by search terms, priority level, and assignee.

### 3. Task Comments & Real-Time Discussions
- **Chronological Discussion Stream**: View comments in chronological order with commenter name, avatar, and relative/exact timestamps.
- **Full Comment Lifecycle**: Add new comments, edit your own comments inline, and delete your comments (or remove inappropriate comments if project Admin/Owner).
- **Instant WebSocket Synchronization**: When one team member posts or edits a comment, all users viewing the board or task modal receive it immediately.

### 4. WebSocket-Based Real-Time Collaboration (Socket.IO)
- **Zero Polling**: Built entirely on bidirectional WebSockets via Socket.IO.
- **Project-Specific Rooms**: Clients join authenticated rooms (`project_${projectId}`) so updates are delivered only to authorized collaborators.
- **Synchronized Events**:
  - `join_project` / `leave_project`: Room lifecycle management.
  - `task_created`: Card immediately appears on other members' boards with a highlight animation.
  - `task_updated`: Field edits update dynamically across all clients.
  - `task_status_changed`: Cards move between columns in real time.
  - `task_assigned`: Assignee receives an instant targeted alert.
  - `new_comment`, `comment_updated`, `comment_deleted`: Discussions update without page refreshes.
  - `notification_received`: Direct personal notification delivery.
- **Resilient Connection Handling**: Auto-reconnection with visual status indicators (*Live*, *Reconnecting*, *Offline*).

### 5. In-App Notification Center
- Real-time alerts for:
  - Being invited/added to a project.
  - Being assigned to a task.
  - Comments posted on tasks you are involved with.
  - Status updates on your assigned tasks.
- Unread badge counters in both top navbar and sidebar.
- Single-click to mark as read or mark all as read.
- Click any notification to jump directly to the relevant task or project board.

### 6. Live Analytics Dashboard
- Calculated directly from actual database information (**zero hardcoded or dummy metrics**):
  - Total Active Projects
  - Total Assigned Tasks
  - Tasks In Progress
  - Completed Tasks
  - Pending (To Do) Tasks
  - Upcoming Deadlines (with overdue flags)
  - Recent Project Activity Feed (audit log of actions and actors)

### 7. User Profile & Security
- User registration, login, session persistence, and logout.
- Password change and forgot password recovery.
- Customizable user profile with avatar URL preview and DiceBear avatar generation.
- Supabase Row Level Security (RLS) policies and JWT session verification.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript (ES Modules), Lucide Icons |
| **Backend** | Node.js, Express.js |
| **Real-Time WebSockets** | Socket.IO (Server & Client) |
| **Database & Auth** | Supabase PostgreSQL, Supabase Auth, Row Level Security (RLS) |
| **Local Fallback** | File-backed atomic persistence mode for zero-setup local testing |
| **Testing** | Automated End-to-End Test Suite (`test/test-suite.js`) |

---

## 📂 Project Directory Structure

```
TASKORA/
├── .env.example               # Environment variables template
├── .gitignore                 # Standard git ignore definitions
├── package.json               # Node.js dependencies & scripts
├── README.md                  # Project documentation
│
├── supabase/
│   └── schema.sql             # Complete Supabase PostgreSQL schema with RLS, triggers & indexes
│
├── server/
│   ├── index.js               # Application entry point (Express + Socket.IO server)
│   ├── config/
│   │   ├── supabase.js        # Supabase client initializer
│   │   └── db.js              # Unified database repository (Supabase + local fallback)
│   ├── middleware/
│   │   ├── auth.js            # JWT session verification middleware
│   │   └── projectAuth.js     # Project membership & role authorization middleware
│   ├── routes/
│   │   ├── auth.routes.js     # Registration, login, password reset, profile
│   │   ├── project.routes.js  # Project CRUD, team membership, roles
│   │   ├── task.routes.js     # Task creation, updates, status drag & drop
│   │   ├── comment.routes.js  # Task comment CRUD (chronological stream)
│   │   ├── notification.routes.js # Notifications, mark read, unread counts
│   │   ├── activity.routes.js # Project activity audit log
│   │   └── dashboard.routes.js# Real database analytics
│   ├── socket/
│   │   └── socketHandler.js   # Socket.IO setup, authentication, rooms & broadcasts
│   └── utils/
│       └── jwt.js             # JWT generation and verification
│
├── public/                    # Frontend Single Page Application (SPA)
│   ├── index.html             # Main HTML5 shell
│   ├── css/
│   │   ├── theme.css          # Color variables, typography, resets
│   │   ├── layout.css         # Sidebar, top navbar, responsive drawers
│   │   ├── components.css     # Buttons, cards, modals, toasts, badges
│   │   ├── auth.css           # Authentication layout and forms
│   │   ├── kanban.css         # Kanban columns, task cards, drag & drop states
│   │   ├── task-modal.css     # Task details drawer & real-time comments section
│   │   └── pages.css          # Dashboard widgets, projects grid, tables
│   └── js/
│       ├── app.js             # Client bootstrap
│       ├── router.js          # Client-side router (all 12 views)
│       ├── state.js           # Reactive application state
│       ├── api.js             # API client with automatic auth headers
│       ├── socket.js          # Socket.IO client with event listeners
│       ├── config.js          # Priorities, statuses, and role constants
│       ├── components/
│       │   ├── toast.js       # Toast notifications
│       │   ├── modal.js       # Accessible modal dialogs
│       │   └── dragDrop.js    # Kanban drag-and-drop controller
│       └── views/
│           ├── authView.js         # Login, Register, Forgot/Reset Password
│           ├── dashboardView.js    # Live analytics & activity feed
│           ├── projectsView.js     # Projects list, Create, Details & Members
│           ├── kanbanView.js       # Kanban board & task cards
│           ├── taskModalView.js    # Task modal & real-time discussions
│           ├── notificationsView.js# In-app notifications
│           ├── profileView.js      # User profile & password management
│           └── settingsView.js     # Workspace & diagnostics settings
│
└── test/
    └── test-suite.js          # Automated end-to-end test suite (31 tests)
```

---

## ⚡ Quick Start & Installation

### 1. Prerequisites
- **Node.js** v18+ (tested on Node.js v24)
- **npm** v9+

### 2. Clone and Install Dependencies
```bash
# Clone the repository
git clone https://github.com/your-username/CodeAlpha_ProjectManagementTool.git
cd CodeAlpha_ProjectManagementTool

# Install dependencies
npm install
```

### 3. Configure Environment Variables
Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```

Open `.env` in your text editor:
```env
PORT=3000
NODE_ENV=development

# Supabase Credentials (optional for local testing, required for Supabase cloud)
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT Secret
JWT_SECRET=taskora_jwt_secret_dev_key_2026_super_secure_change_in_production
```

> **Note on Resilient Architecture**: If Supabase credentials are not yet configured or left as placeholders, TASKORA automatically runs in **Resilient Local Persistence Mode** (`data/taskora_db.json`). This enables 100% full functionality out-of-the-box without blocking development. When you add your Supabase credentials, it instantly switches to Supabase PostgreSQL!

### 4. Start the Application
```bash
# Start server
npm start
```
Open your browser and navigate to:
```
http://localhost:3000
```

---

## 🗄️ Supabase PostgreSQL Setup Instructions

To connect TASKORA directly to your Supabase project:

1. **Create a Supabase Project**:
   - Go to [supabase.com](https://supabase.com) and create a new project.

2. **Execute Database Schema**:
   - Open the **SQL Editor** in your Supabase dashboard.
   - Open [`supabase/schema.sql`](supabase/schema.sql) in this repository.
   - Copy and paste the entire script into the Supabase SQL Editor and click **Run**.
   - This creates:
     - `public.profiles` (linked to `auth.users` with automated signup trigger)
     - `public.projects`
     - `public.project_members` (with roles: `owner`, `admin`, `member`)
     - `public.tasks` (with statuses: `todo`, `in_progress`, `completed` & priorities)
     - `public.task_comments`
     - `public.notifications`
     - `public.activities`
     - Performance indices on foreign keys and timestamps
     - Row Level Security (RLS) policies and security helper function `is_project_member`

3. **Retrieve Credentials**:
   - In Supabase, go to **Project Settings** &rsaquo; **API**.
   - Copy the **Project URL** into `SUPABASE_URL` in `.env`.
   - Copy the **anon public key** into `SUPABASE_ANON_KEY`.
   - Copy the **service_role secret** into `SUPABASE_SERVICE_ROLE_KEY`.

4. **Restart Server**:
   - Restart with `npm start`. You will see:
     `[TASKORA] Connected to Supabase PostgreSQL at: https://your-project-ref.supabase.co`

---

## 🔌 Socket.IO & WebSocket Architecture

Real-time collaboration is powered by a dedicated Socket.IO integration:

```
                  +-----------------------------------+
                  |          TASKORA Backend          |
                  |         (Express + HTTP)          |
                  +-----------------+-----------------+
                                    |
                         Socket.IO Engine (/socket.io)
                                    |
          +-------------------------+-------------------------+
          |                                                   |
Room: "project_<id>"                                Room: "user_<id>"
All members on Kanban board                         Direct notifications
- task_created                                      - notification_received
- task_updated                                      - task_assigned
- task_status_changed (drag & drop)
- task_deleted
- new_comment
- comment_updated / comment_deleted
```

### Event Specifications
| Event | Direction | Payload | Description |
|---|---|---|---|
| `join_project` | Client &rarr; Server | `{ projectId }` | Verifies membership and joins project room |
| `leave_project` | Client &rarr; Server | `{ projectId }` | Leaves project room |
| `task_created` | Server &rarr; Client | `{ projectId, task, actor }` | Appends task card to column live |
| `task_status_changed` | Server &rarr; Client | `{ projectId, task, actor }` | Moves card to target column live |
| `task_updated` | Server &rarr; Client | `{ projectId, task, actor }` | Updates card title, priority, assignee |
| `task_deleted` | Server &rarr; Client | `{ projectId, taskId, actor }`| Removes card from connected boards |
| `task_assigned` | Server &rarr; Client | `{ projectId, task, assigneeId, actor }` | Direct alert to assignee |
| `new_comment` | Server &rarr; Client | `{ projectId, taskId, comment, actor }` | Inserts comment into stream live |
| `comment_updated` | Server &rarr; Client | `{ projectId, taskId, comment, actor }` | Updates comment text live |
| `comment_deleted` | Server &rarr; Client | `{ projectId, taskId, commentId, actor }`| Removes comment from stream live |
| `notification_received` | Server &rarr; Client | `notification` | Direct personal in-app toast & badge increment |

**Rule of Thumb**: Changes are always persisted in Supabase/database **before** broadcasting to connected clients.

---

## 🧪 Automated Testing

TASKORA includes a complete automated test suite verifying all 31 critical checkpoints:

```bash
npm test
```

### What is Tested:
1. User registration & login with password verification.
2. Group project creation and ownership assignment.
3. Member invitations and role management.
4. Authenticated Socket.IO connections and room authorizations.
5. Real-time task creation and live synchronization to connected team members.
6. Kanban column drag-and-drop movement and live broadcast.
7. Task comments: adding, viewing chronologically, inline editing, and deletion.
8. Authorization checks: rejection of unauthorized users with 403 Forbidden.
9. Real-time in-app notifications.
10. Live dashboard database statistical calculations.

---

## 🚀 Manual GitHub Push Instructions

Repository Name: **`CodeAlpha_ProjectManagementTool`**

To manually push this codebase to your GitHub account:

```bash
# 1. Initialize git if not already done
git init

# 2. Stage all files (sensitive files in .env and data/ are ignored via .gitignore)
git add .

# 3. Commit the changes
git commit -m "feat: complete TASKORA collaborative project management tool"

# 4. Set branch to main
git branch -M main

# 5. Add your GitHub remote repository
git remote add origin https://github.com/<your-github-username>/CodeAlpha_ProjectManagementTool.git

# 6. Push to GitHub
git push -u origin main
```

---

## 📄 License

This project is licensed under the MIT License.
