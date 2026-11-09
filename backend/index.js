const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initializeSocket } = require('./socket/socketHandler');
const { isSupabaseConfigured } = require('./config/supabase');

// Import routes
const authRoutes = require('./routes/auth.routes');
const projectRoutes = require('./routes/project.routes');
const taskRoutes = require('./routes/task.routes');
const commentRoutes = require('./routes/comment.routes');
const notificationRoutes = require('./routes/notification.routes');
const activityRoutes = require('./routes/activity.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const app = express();
const server = http.createServer(app);

// Initialize WebSockets via Socket.IO
const io = initializeSocket(server);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'TASKORA',
    tagline: 'Plan Together. Work Smarter. Deliver Better.',
    database: isSupabaseConfigured() ? 'Supabase PostgreSQL' : 'Local Persistence (Ready for Supabase)',
    time: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', taskRoutes);
app.use('/api', commentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/dashboard', dashboardRoutes);

// SPA fallback: any non-API route serves index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API endpoint not found.' });
  }
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[UNCAUGHT ERROR]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'An unexpected error occurred on the server.'
  });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`
  ==============================================================
   🚀 TASKORA Server Running!
   Tagline: "Plan Together. Work Smarter. Deliver Better."
   Local URL: http://localhost:${PORT}
   Database: ${isSupabaseConfigured() ? 'Supabase PostgreSQL (Connected)' : 'Local File Persistence (SQLite/JSON mode active)'}
   WebSockets: Socket.IO initialized on port ${PORT}
  ==============================================================
    `);
  });
}

module.exports = { app, server, io };
