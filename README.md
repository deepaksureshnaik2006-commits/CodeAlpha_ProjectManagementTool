# TASKORA – Collaborative Project Management Tool

> **Plan Together. Work Smarter. Deliver Better.**

TASKORA is a modern, full-stack collaborative project management application inspired by tools like Trello and Asana. It provides teams with real-time Kanban boards, task assignment workflows, contextual discussion threads, and instant notification feeds.

---

## 🌟 Features

### 📁 Group Projects & Role Management
- **Workspaces**: Create and organize group projects with custom descriptions and accent colors.
- **Role-Based Access**: Granular roles (**Owner**, **Admin**, **Member**).
- **Owner Controls**: Only project owners can delete projects or remove team members.
- **Team Collaboration**: Invite registered users to projects by email.

### 📋 Interactive Kanban Boards
- **Workflow Columns**: Three clear stages — **To Do**, **In Progress**, and **Completed**.
- **Drag & Drop**: Move cards smoothly between columns with live status persistence.
- **Task Cards**: Priority tags (*Low*, *Medium*, *High*, *Urgent*), due dates with overdue indicators, assignee avatars, and comment count badges.
- **Search & Filters**: Instantly filter board tasks by title keyword, priority level, and assignee.
- **Display Options**: Toggle between standard and compact card density.

### 🎯 Task Assignments
- **Member Assignment**: Assign tasks to specific teammates directly during creation or from the task modal.
- **Instant Alerts**: Assignees receive real-time notifications upon assignment.

### 💬 Task Discussions & Comments
- **Contextual Communication**: Dedicated chronological comment thread inside every task details modal.
- **Full Comment Management**: Add comments, edit your own comments inline, and delete comments with confirmation dialogs.
- **Live Sync**: Teammates see new comments and edits appear in real time without refreshing.

### ⚡ Real-Time Collaboration (WebSockets)
- **Instant Updates**: Powered by WebSockets so board movements, new tasks, edits, and comments sync live across all active team members.
- **Project Rooms**: Secure, room-based isolation ensures team members only receive updates for projects they belong to.

### 🔔 In-App Notifications & Activity Feed
- **Live Toasts**: In-app alerts for task assignments and team comments.
- **Notification Center**: Dropdown menu with unread badges and quick navigation to relevant tasks.
- **Daily Activity Stream**: Dashboard timeline tracking project events, filterable by date (with future date restriction).

### 📊 Dashboard & Metrics
- Real-time project counts, assigned task progress, completion rates, and upcoming deadlines.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vanilla JavaScript (ES Modules), HTML5, CSS3, Lucide Icons |
| **Backend** | Node.js, Express.js |
| **Real-Time** | WebSockets (Socket.IO) |
| **Database & Auth** | PostgreSQL, JWT Authentication |
| **Testing** | Automated End-to-End Test Suite |

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js** v18+ (tested on v20 & v24)
- **npm** v9+

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/deepaksureshnaik2006-commits/CodeAlpha_ProjectManagementTool.git
cd CodeAlpha_ProjectManagementTool

# Install dependencies
npm install
```

### 3. Environment Configuration
Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key_here
```

### 4. Run the Application
```bash
# Start server
npm start
```
Open your browser and visit: **`http://localhost:3000`**

---

## 🧪 Testing

Run the automated test suite covering all 40 verification checkpoints (auth, projects, member permissions, Kanban drag & drop, real-time WebSockets, comments, and role restrictions):

```bash
npm test
```

---

## 📄 License

This project is licensed under the MIT License.
