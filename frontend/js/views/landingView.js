// TASKORA Public Landing Page View

import { isAuthenticated } from '../state.js';

export function renderLandingView(container) {
  const isAuth = isAuthenticated();

  container.innerHTML = `
    <div class="landing-page">
      
      <!-- 1. NAVBAR -->
      <header class="landing-navbar">
        <div class="landing-container">
          <div class="landing-nav-inner">
            <a href="#/home" class="landing-brand">
              <div class="landing-brand-icon">
                <i data-lucide="layers" style="width: 20px; height: 20px;"></i>
              </div>
              <span class="landing-brand-text">TASKORA</span>
              <span class="brand-badge">PRO</span>
            </a>

            <nav>
              <ul class="landing-nav-links">
                <li><a href="#features" class="landing-nav-link">Features</a></li>
                <li><a href="#how-it-works" class="landing-nav-link">How It Works</a></li>
                <li><a href="#about" class="landing-nav-link">About</a></li>
              </ul>
            </nav>

            <div class="landing-nav-actions">
              ${isAuth ? `
                <a href="#/dashboard" class="landing-hero-btn-primary" style="padding: 9px 18px; font-size: 0.88rem;">
                  <i data-lucide="layout-dashboard" style="width: 16px; height: 16px;"></i>
                  <span>Go to Dashboard</span>
                </a>
              ` : `
                <a href="#/login" class="landing-nav-link" style="padding: 8px 14px; font-weight: 600;">Sign In</a>
                <a href="#/register" class="landing-hero-btn-primary" style="padding: 9px 18px; font-size: 0.88rem;">
                  <span>Get Started</span>
                  <i data-lucide="arrow-right" style="width: 15px; height: 15px;"></i>
                </a>
              `}
            </div>
          </div>
        </div>
      </header>

      <!-- 2. HERO SECTION -->
      <section class="landing-hero">
        <div class="landing-container">
          
          <div class="landing-hero-badge">
            <i data-lucide="sparkles" style="width: 15px; height: 15px;"></i>
            <span>Real-Time Collaborative Workspace</span>
          </div>

          <h1 class="landing-hero-title">
            Plan Together.<br>
            Work Smarter.<br>
            <span>Deliver Better.</span>
          </h1>

          <p class="landing-hero-subtitle">
            TASKORA brings teams together with intuitive Kanban boards, priority task assignments, real-time WebSocket synchronization, and focused discussion streams.
          </p>

          <div class="landing-hero-ctas">
            <a href="#/register" class="landing-hero-btn-primary">
              <i data-lucide="rocket" style="width: 18px; height: 18px;"></i>
              <span>Get Started Free</span>
            </a>
            <a href="#/login" class="landing-hero-btn-secondary">
              <i data-lucide="log-in" style="width: 18px; height: 18px;"></i>
              <span>Sign In to Workspace</span>
            </a>
          </div>

          <div class="landing-trust-bar">
            <div class="landing-trust-item">
              <i data-lucide="check-circle-2"></i>
              <span>No credit card required</span>
            </div>
            <div class="landing-trust-item">
              <i data-lucide="zap"></i>
              <span>Real-time WebSocket sync</span>
            </div>
            <div class="landing-trust-item">
              <i data-lucide="shield-check"></i>
              <span>Role-based team security</span>
            </div>
          </div>

          <!-- 3. PRODUCT PREVIEW (Live Interactive Kanban Board Frame) -->
          <div class="landing-preview-wrap">
            <div class="landing-preview-window">
              
              <!-- Window Header -->
              <div class="preview-window-bar">
                <div class="window-dots">
                  <div class="window-dot red"></div>
                  <div class="window-dot yellow"></div>
                  <div class="window-dot green"></div>
                </div>
                <div class="preview-window-title">
                  <i data-lucide="folder-kanban" style="width: 14px; height: 14px; color: #6366f1;"></i>
                  <span>TASKORA — Launchpad 2026 Workspace</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px; font-size: 0.72rem; color: #10b981; font-weight: 600;">
                  <span class="status-dot"></span>
                  <span>Live Sync</span>
                </div>
              </div>

              <!-- Window Inner Workspace Layout -->
              <div class="preview-workspace-layout">
                <!-- Mini Sidebar -->
                <div class="preview-sidebar">
                  <div class="preview-sidebar-item">
                    <i data-lucide="layout-dashboard" style="width: 15px; height: 15px;"></i>
                    <span>Dashboard</span>
                  </div>
                  <div class="preview-sidebar-item active">
                    <i data-lucide="folder-kanban" style="width: 15px; height: 15px;"></i>
                    <span>My Projects</span>
                  </div>
                  <div class="preview-sidebar-item">
                    <i data-lucide="bell" style="width: 15px; height: 15px;"></i>
                    <span>Notifications</span>
                  </div>
                  <div class="preview-sidebar-item">
                    <i data-lucide="user" style="width: 15px; height: 15px;"></i>
                    <span>Profile</span>
                  </div>
                </div>

                <!-- Mini Main Kanban Workspace -->
                <div class="preview-main-content">
                  <div class="preview-board-header">
                    <div>
                      <div style="font-weight: 700; font-size: 1.05rem; color: #0f172a;">Sprint Board — Mobile App Launch</div>
                      <div style="font-size: 0.75rem; color: #64748b;">4 team members &bull; Real-time synchronized</div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                      <span class="badge badge-admin" style="font-size: 0.75rem;">Owner</span>
                    </div>
                  </div>

                  <!-- 3 Kanban Columns Preview -->
                  <div class="preview-kanban-cols">
                    <!-- Column 1: To Do -->
                    <div class="preview-col">
                      <div class="preview-col-title todo">
                        <span>To Do</span>
                        <span>2</span>
                      </div>
                      
                      <div class="preview-card">
                        <span class="preview-badge-high">High Priority</span>
                        <div class="preview-card-title">Design System & Dark Theme</div>
                        <div style="font-size: 0.72rem; color: #64748b;">Build reusable UI component library with Lucide icons.</div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; font-size: 0.7rem; color: #94a3b8;">
                          <span>Due in 3 days</span>
                          <span style="display: flex; align-items: center; gap: 4px;"><i data-lucide="message-square" style="width: 12px; height: 12px;"></i> 2</span>
                        </div>
                      </div>

                      <div class="preview-card">
                        <span class="badge" style="background: #e0f2fe; color: #0369a1; font-size: 0.68rem; align-self: flex-start;">Medium</span>
                        <div class="preview-card-title">Role-Based Permission Rules</div>
                        <div style="font-size: 0.72rem; color: #64748b;">Restrict project editing to Owners and Admins.</div>
                      </div>
                    </div>

                    <!-- Column 2: In Progress -->
                    <div class="preview-col">
                      <div class="preview-col-title in_progress">
                        <span>In Progress</span>
                        <span>2</span>
                      </div>

                      <div class="preview-card" style="border-left: 3px solid #6366f1;">
                        <span class="preview-badge-urgent">Urgent</span>
                        <div class="preview-card-title">WebSocket Real-Time Engine</div>
                        <div style="font-size: 0.72rem; color: #64748b;">Broadcast live task cards, movements, and comments without refresh.</div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; font-size: 0.7rem; color: #94a3b8;">
                          <span style="color: #6366f1; font-weight: 600;">Active Now</span>
                          <span style="display: flex; align-items: center; gap: 4px;"><i data-lucide="message-square" style="width: 12px; height: 12px;"></i> 5</span>
                        </div>
                      </div>

                      <div class="preview-card">
                        <span class="preview-badge-high">High Priority</span>
                        <div class="preview-card-title">Drag-and-Drop Column Reordering</div>
                        <div style="font-size: 0.72rem; color: #64748b;">Smooth card dragging with HTML5 drag API.</div>
                      </div>
                    </div>

                    <!-- Column 3: Completed -->
                    <div class="preview-col">
                      <div class="preview-col-title completed">
                        <span>Completed</span>
                        <span>2</span>
                      </div>

                      <div class="preview-card" style="border-left: 3px solid #10b981;">
                        <span class="preview-badge-done">Completed</span>
                        <div class="preview-card-title">Authentication & User Profiles</div>
                        <div style="font-size: 0.72rem; color: #64748b;">Full sign-up, sign-in, and avatar photo management.</div>
                      </div>

                      <div class="preview-card">
                        <span class="preview-badge-done">Completed</span>
                        <div class="preview-card-title">PostgreSQL Database Schema</div>
                        <div style="font-size: 0.72rem; color: #64748b;">Configured projects, tasks, comments, and activity indexes.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      <!-- 4. FEATURES SECTION -->
      <section class="landing-section" id="features">
        <div class="landing-container">
          
          <div class="landing-section-header">
            <div class="landing-section-kicker">Core Capabilities</div>
            <h2 class="landing-section-title">Everything your team needs to deliver on time</h2>
            <p class="landing-section-desc">
              TASKORA combines powerful Kanban management, real-time collaboration, and in-depth activity tracking in a clean, distraction-free environment.
            </p>
          </div>

          <div class="features-grid">
            
            <div class="feature-card">
              <div class="feature-icon-wrap">
                <i data-lucide="folder-kanban" style="width: 24px; height: 24px;"></i>
              </div>
              <h3 class="feature-title">Group Project Management</h3>
              <p class="feature-desc">
                Create dedicated collaborative workspaces. Invite teammates, manage membership rosters, and assign roles (Owner, Admin, Member) to keep project access secure.
              </p>
            </div>

            <div class="feature-card">
              <div class="feature-icon-wrap">
                <i data-lucide="layout-grid" style="width: 24px; height: 24px;"></i>
              </div>
              <h3 class="feature-title">Kanban-Style Workflow Boards</h3>
              <p class="feature-desc">
                Organize work visually with To Do, In Progress, and Completed columns. Move cards effortlessly using intuitive drag-and-drop mechanics.
              </p>
            </div>

            <div class="feature-card">
              <div class="feature-icon-wrap">
                <i data-lucide="check-square" style="width: 24px; height: 24px;"></i>
              </div>
              <h3 class="feature-title">Task Assignments & Priorities</h3>
              <p class="feature-desc">
                Assign tasks to specific team members, configure priority badges (Low, Medium, High, Urgent), set due dates, and track upcoming deadlines with ease.
              </p>
            </div>

            <div class="feature-card">
              <div class="feature-icon-wrap">
                <i data-lucide="messages-square" style="width: 24px; height: 24px;"></i>
              </div>
              <h3 class="feature-title">Task Discussions & Comments</h3>
              <p class="feature-desc">
                Hold contextual conversations directly inside individual tasks. Post comments, view chronological discussions, and edit or delete your own updates anytime.
              </p>
            </div>

            <div class="feature-card">
              <div class="feature-icon-wrap">
                <i data-lucide="zap" style="width: 24px; height: 24px;"></i>
              </div>
              <h3 class="feature-title">Real-Time WebSocket Sync</h3>
              <p class="feature-desc">
                Powered by a high-performance Socket.IO engine. When a teammate moves a card, adds a task, or posts a comment, your board updates instantly without a refresh.
              </p>
            </div>

            <div class="feature-card">
              <div class="feature-icon-wrap">
                <i data-lucide="bell-ring" style="width: 24px; height: 24px;"></i>
              </div>
              <h3 class="feature-title">In-App Notifications & Daily Feed</h3>
              <p class="feature-desc">
                Stay updated on task assignments and team comments with real-time toasts, an unread notification center, and an interactive daily activity timeline.
              </p>
            </div>

          </div>

        </div>
      </section>

      <!-- 5. HOW IT WORKS -->
      <section class="landing-section" id="how-it-works" style="background-color: #f1f5f9; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
        <div class="landing-container">
          
          <div class="landing-section-header">
            <div class="landing-section-kicker">Simple Workflow</div>
            <h2 class="landing-section-title">How TASKORA Powers Your Team</h2>
            <p class="landing-section-desc">
              Go from planning to execution in four straightforward steps.
            </p>
          </div>

          <div class="steps-grid">
            
            <div class="step-card">
              <div class="step-number">1</div>
              <h3 class="step-title">Create a Project</h3>
              <p class="step-desc">
                Set up a shared project in seconds. Define the project name, goals, and customize its visual accent color.
              </p>
            </div>

            <div class="step-card">
              <div class="step-number">2</div>
              <h3 class="step-title">Invite Your Team</h3>
              <p class="step-desc">
                Add registered team members by email and assign roles (Owner, Admin, Member) to establish permissions.
              </p>
            </div>

            <div class="step-card">
              <div class="step-number">3</div>
              <h3 class="step-title">Assign & Prioritize</h3>
              <p class="step-desc">
                Create tasks, assign teammates, attach due dates, and mark priorities (Low, Medium, High, Urgent).
              </p>
            </div>

            <div class="step-card">
              <div class="step-number">4</div>
              <h3 class="step-title">Track Real-Time Progress</h3>
              <p class="step-desc">
                Drag cards across columns, exchange task comments, and watch your project progress update live.
              </p>
            </div>

          </div>

        </div>
      </section>

      <!-- 6. ABOUT SECTION -->
      <section class="landing-section" id="about">
        <div class="landing-container" style="max-width: 860px; text-align: center;">
          <div class="landing-section-kicker">About TASKORA</div>
          <h2 class="landing-section-title">Engineered for Focus and Velocity</h2>
          <p style="font-size: 1.05rem; color: #475569; line-height: 1.8; margin-bottom: 24px;">
            Modern software and product teams shouldn't have to choose between bloated enterprise tools or disconnected spreadsheets. 
            TASKORA was created to deliver an ultra-fast, clean collaborative workspace where teams can brainstorm, organize work, and communicate in real time without cognitive overload.
          </p>
          <div style="display: flex; justify-content: center; gap: 40px; margin-top: 36px; flex-wrap: wrap;">
            <div>
              <div style="font-size: 2rem; font-weight: 800; color: #6366f1;">100%</div>
              <div style="font-size: 0.85rem; color: #64748b;">Real-Time Sync</div>
            </div>
            <div>
              <div style="font-size: 2rem; font-weight: 800; color: #10b981;">0 ms</div>
              <div style="font-size: 0.85rem; color: #64748b;">Manual Refresh Needed</div>
            </div>
            <div>
              <div style="font-size: 2rem; font-weight: 800; color: #8b5cf6;">Enterprise</div>
              <div style="font-size: 0.85rem; color: #64748b;">PostgreSQL Security</div>
            </div>
          </div>
        </div>
      </section>

      <!-- 7. CALL TO ACTION BANNER -->
      <div class="landing-container">
        <div class="landing-cta-banner">
          <h2 class="landing-cta-title">Ready to Supercharge Your Team's Productivity?</h2>
          <p class="landing-cta-subtitle">
            Join modern teams delivering their best work together. Start your free workspace now.
          </p>
          <div style="display: flex; justify-content: center; gap: 14px; position: relative; flex-wrap: wrap;">
            <a href="#/register" class="landing-hero-btn-primary" style="padding: 14px 32px; font-size: 1.05rem;">
              <span>Create Free Workspace</span>
              <i data-lucide="arrow-right" style="width: 18px; height: 18px;"></i>
            </a>
            <a href="#/login" class="landing-hero-btn-secondary" style="padding: 14px 28px; font-size: 1.05rem;">
              <span>Sign In</span>
            </a>
          </div>
        </div>
      </div>

      <!-- 8. FOOTER -->
      <footer class="landing-footer">
        <div class="landing-container">
          <div class="landing-footer-grid">
            
            <div class="landing-footer-brand">
              <a href="#/home" class="landing-brand">
                <div class="landing-brand-icon">
                  <i data-lucide="layers" style="width: 18px; height: 18px;"></i>
                </div>
                <span class="landing-brand-text">TASKORA</span>
              </a>
              <p>Plan Together. Work Smarter. Deliver Better.</p>
              <p style="margin-top: 6px; font-size: 0.78rem; color: #475569;">
                The high-performance collaborative project management tool.
              </p>
            </div>

            <div class="landing-footer-col">
              <h4>Product</h4>
              <ul class="landing-footer-links">
                <li><a href="#features">Features</a></li>
                <li><a href="#how-it-works">How It Works</a></li>
                <li><a href="#about">About</a></li>
                <li><a href="#/login">Dashboard</a></li>
              </ul>
            </div>

            <div class="landing-footer-col">
              <h4>Get Started</h4>
              <ul class="landing-footer-links">
                <li><a href="#/register">Create Free Account</a></li>
                <li><a href="#/login">Sign In</a></li>
                <li><a href="#/forgot-password">Password Reset</a></li>
              </ul>
            </div>

          </div>

          <div class="landing-footer-bottom">
            <div>&copy; ${new Date().getFullYear()} TASKORA. Plan Together. Work Smarter. Deliver Better. All rights reserved.</div>
            <div style="display: flex; gap: 16px;">
              <span>Privacy</span>
              <span>&bull;</span>
              <span>Terms of Service</span>
              <span>&bull;</span>
              <span>Security</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  `;

  if (window.lucide) window.lucide.createIcons({ root: container });

  // Handle smooth scroll for in-page anchors
  container.querySelectorAll('a[href^="#"]').forEach(anchor => {
    const targetId = anchor.getAttribute('href');
    if (targetId && !targetId.startsWith('#/')) {
      anchor.addEventListener('click', (e) => {
        const el = container.querySelector(targetId);
        if (el) {
          e.preventDefault();
          el.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }
  });
}

