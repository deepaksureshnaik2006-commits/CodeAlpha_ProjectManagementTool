// ==============================================================================
// TASKORA Automated End-to-End Test Suite
// Verifies full stack: REST API, Supabase Data Layer, Socket.IO WebSockets & Real-Time Sync
// ==============================================================================

const http = require('http');
const { io: ioClient } = require('socket.io-client');
const { app, server } = require('../backend/index');

const PORT = 3099; // Dedicated test port
const BASE_URL = `http://localhost:${PORT}`;

// Helper: HTTP request
async function req(endpoint, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

let testServer;
let aliceSocket;
let bobSocket;

async function runTestSuite() {
  console.log('\n==============================================================');
  console.log('   🧪 TASKORA COMPREHENSIVE AUTOMATED TEST SUITE');
  console.log('==============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (!condition) {
      console.error(`  ❌ FAIL: ${message}`);
      throw new Error(message);
    }
    passedTests++;
    console.log(`  ✅ PASS: ${message}`);
  }

  try {
    // 1. Start Server on test port
    const { waitForReady } = require('../backend/config/supabase');
    await waitForReady();
    await new Promise((resolve) => {
      testServer = server.listen(PORT, resolve);
    });
    console.log(`[TEST] Server listening on ${BASE_URL}`);

    // Health check
    const health = await req('/api/health');
    assert(health.status === 200 && health.data.app === 'TASKORA', 'Backend API health check returns TASKORA tagline');

    // --------------------------------------------------------------------------
    // TEST 1: User Registration & Authentication (Alice & Bob)
    // --------------------------------------------------------------------------
    console.log('\n--- Test 1: User Registration & Authentication ---');
    const timestamp = Date.now();
    const aliceEmail = `alice_${timestamp}@taskora.test`;
    const bobEmail = `bob_${timestamp}@taskora.test`;

    const aliceReg = await req('/api/auth/register', 'POST', {
      email: aliceEmail,
      password: 'password123',
      fullName: 'Alice Johnson'
    });
    assert(aliceReg.status === 201 && aliceReg.data.token, 'Alice registered successfully and received token');
    const aliceToken = aliceReg.data.token;
    const aliceId = aliceReg.data.user.id;

    const bobReg = await req('/api/auth/register', 'POST', {
      email: bobEmail,
      password: 'password123',
      fullName: 'Bob Smith'
    });
    assert(bobReg.status === 201 && bobReg.data.token, 'Bob registered successfully and received token');
    const bobToken = bobReg.data.token;
    const bobId = bobReg.data.user.id;

    // Login verification
    const aliceLogin = await req('/api/auth/login', 'POST', {
      email: aliceEmail,
      password: 'password123'
    });
    assert(aliceLogin.status === 200 && aliceLogin.data.user.full_name === 'Alice Johnson', 'Alice logged in with correct credentials');

    // Direct password update without requiring old password
    const pwdChange = await req('/api/auth/change-password', 'PUT', {
      newPassword: 'newsecurepassword456'
    }, aliceToken);
    assert(pwdChange.status === 200 && pwdChange.data.success, 'Alice changed password directly without current password');

    // Profile photo update
    const profUpdate = await req('/api/auth/profile', 'PUT', {
      fullName: 'Alice Johnson',
      avatarUrl: 'data:image/jpeg;base64,samplephoto123'
    }, aliceToken);
    assert(profUpdate.status === 200 && profUpdate.data.user.avatar_url === 'data:image/jpeg;base64,samplephoto123', 'Alice updated profile avatar photo');

    // --------------------------------------------------------------------------
    // TEST 2: Creating and Managing Group Projects
    // --------------------------------------------------------------------------
    console.log('\n--- Test 2: Group Project Creation & Management ---');
    const projRes = await req('/api/projects', 'POST', {
      name: 'TASKORA Launchpad 2026',
      description: 'Collaborative development of next-gen project management',
      color: '#6366f1'
    }, aliceToken);

    assert(projRes.status === 201 && projRes.data.project.name === 'TASKORA Launchpad 2026', 'Alice created project "TASKORA Launchpad 2026"');
    const projectId = projRes.data.project.id;

    // --------------------------------------------------------------------------
    // TEST 3: Adding Project Members
    // --------------------------------------------------------------------------
    console.log('\n--- Test 3: Adding Project Members & Role Assignment ---');
    const addMemberRes = await req(`/api/projects/${projectId}/members`, 'POST', {
      userId: bobId,
      role: 'member'
    }, aliceToken);

    assert(addMemberRes.status === 201 && addMemberRes.data.member.role === 'member', 'Alice added Bob to the project as a Member');

    const bobProjects = await req('/api/projects', 'GET', null, bobToken);
    assert(bobProjects.status === 200 && bobProjects.data.projects.some(p => p.id === projectId), 'Bob can view the project in his projects list');

    // --------------------------------------------------------------------------
    // TEST 4: Socket.IO WebSocket Connection & Room Join
    // --------------------------------------------------------------------------
    console.log('\n--- Test 4: Socket.IO WebSocket Connection & Authorization ---');
    
    // Connect Alice Socket
    aliceSocket = ioClient(BASE_URL, {
      auth: { token: aliceToken }
    });
    await new Promise((resolve) => aliceSocket.on('connect', resolve));
    assert(aliceSocket.connected, 'Alice successfully established authenticated WebSocket connection');

    // Connect Bob Socket
    bobSocket = ioClient(BASE_URL, {
      auth: { token: bobToken }
    });
    await new Promise((resolve) => bobSocket.on('connect', resolve));
    assert(bobSocket.connected, 'Bob successfully established authenticated WebSocket connection');

    // Join Project Room
    const aliceJoin = await new Promise((resolve) => {
      aliceSocket.emit('join_project', { projectId }, resolve);
    });
    assert(aliceJoin && aliceJoin.success === true, 'Alice joined Socket.IO project room');

    const bobJoin = await new Promise((resolve) => {
      bobSocket.emit('join_project', { projectId }, resolve);
    });
    assert(bobJoin.success === true, 'Bob joined Socket.IO project room');

    // --------------------------------------------------------------------------
    // TEST 5: Real-Time Task Creation & Real-Time Assignment
    // --------------------------------------------------------------------------
    console.log('\n--- Test 5: Real-Time Task Creation & Live Assignment Synchronization ---');
    
    const taskCreatedPromise = new Promise((resolve) => {
      bobSocket.once('task_created', (data) => resolve(data));
    });

    const notifReceivedPromise = new Promise((resolve) => {
      bobSocket.once('notification_received', (data) => resolve(data));
    });

    const createTaskRes = await req(`/api/projects/${projectId}/tasks`, 'POST', {
      title: 'Implement WebSocket Real-time Engine',
      description: 'Integrate Socket.IO with Kanban columns and real-time updates',
      status: 'todo',
      priority: 'urgent',
      assigneeId: bobId,
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString()
    }, aliceToken);

    assert(createTaskRes.status === 201 && createTaskRes.data.task.title === 'Implement WebSocket Real-time Engine', 'Alice created task in database');
    const taskId = createTaskRes.data.task.id;

    // Await real-time broadcast to Bob
    const taskCreatedData = await taskCreatedPromise;
    assert(taskCreatedData.task.id === taskId && taskCreatedData.actor.full_name === 'Alice Johnson', 'Bob received live "task_created" Socket.IO event without refreshing');

    const notifData = await notifReceivedPromise;
    assert(notifData.type === 'task_assigned', 'Bob received live in-app "notification_received" Socket.IO event for task assignment');

    // --------------------------------------------------------------------------
    // TEST 6: Real-Time Kanban Column Drag & Drop (Status Update)
    // --------------------------------------------------------------------------
    console.log('\n--- Test 6: Kanban Column Move & Real-Time Status Synchronization ---');
    
    const statusChangedPromise = new Promise((resolve) => {
      aliceSocket.once('task_status_changed', (data) => resolve(data));
    });

    // Bob moves task to 'in_progress'
    const moveRes = await req(`/api/tasks/${taskId}/status`, 'PATCH', {
      status: 'in_progress',
      position: 1
    }, bobToken);
    assert(moveRes.status === 200 && moveRes.data.task.status === 'in_progress', 'Bob updated task status to "in_progress" in database');

    // Alice should immediately receive task_status_changed
    const liveMoveData = await statusChangedPromise;
    assert(liveMoveData.task.status === 'in_progress' && liveMoveData.actor.full_name === 'Bob Smith', 'Alice received live "task_status_changed" Socket.IO event when Bob moved the card');

    // --------------------------------------------------------------------------
    // TEST 7: Task Comments & Real-Time Communication
    // --------------------------------------------------------------------------
    console.log('\n--- Test 7: Task Comments & Instant WebSocket Updates ---');

    const newCommentPromise = new Promise((resolve) => {
      bobSocket.once('new_comment', (data) => resolve(data));
    });

    const addCommentRes = await req(`/api/tasks/${taskId}/comments`, 'POST', {
      content: 'Hello Bob! The WebSocket implementation is looking great.'
    }, aliceToken);

    assert(addCommentRes.status === 201 && addCommentRes.data.comment.content.includes('Hello Bob!'), 'Alice created task comment in database');
    const commentId = addCommentRes.data.comment.id;

    // Bob receives new comment live
    const liveCommentData = await newCommentPromise;
    assert(liveCommentData.comment.id === commentId && liveCommentData.actor.full_name === 'Alice Johnson', 'Bob received live "new_comment" Socket.IO event');

    // View comments in chronological order
    const getCommentsRes = await req(`/api/tasks/${taskId}/comments`, 'GET', null, bobToken);
    assert(getCommentsRes.status === 200 && getCommentsRes.data.comments.length >= 1, 'Bob can view task comments in chronological order');
    assert(getCommentsRes.data.comments[0].user.full_name === 'Alice Johnson', 'Comment includes commenter name and profile');

    // Edit own comment
    const commentUpdatedPromise = new Promise((resolve) => {
      bobSocket.once('comment_updated', (data) => resolve(data));
    });

    const editCommentRes = await req(`/api/comments/${commentId}`, 'PUT', {
      content: 'Hello Bob! WebSocket is ready for production deployment.'
    }, aliceToken);
    assert(editCommentRes.status === 200 && editCommentRes.data.comment.content.includes('production deployment'), 'Alice edited her own comment');

    const liveUpdatedComment = await commentUpdatedPromise;
    assert(liveUpdatedComment.comment.content.includes('production deployment'), 'Bob received live "comment_updated" event');

    // Delete comment
    const commentDeletedPromise = new Promise((resolve) => {
      bobSocket.once('comment_deleted', (data) => resolve(data));
    });

    const delCommentRes = await req(`/api/comments/${commentId}`, 'DELETE', null, aliceToken);
    assert(delCommentRes.status === 200, 'Alice deleted her comment');

    const liveDeletedComment = await commentDeletedPromise;
    assert(liveDeletedComment.commentId === commentId, 'Bob received live "comment_deleted" event');

    // --------------------------------------------------------------------------
    // TEST 8: Authorization and Project Data Isolation
    // --------------------------------------------------------------------------
    console.log('\n--- Test 8: Security, Authorization & Data Isolation ---');

    // Create Charlie (non-member)
    const charlieReg = await req('/api/auth/register', 'POST', {
      email: `charlie_${timestamp}@taskora.test`,
      password: 'password123',
      fullName: 'Charlie Outsider'
    });
    const charlieToken = charlieReg.data.token;
    const charlieId = charlieReg.data.user.id;

    // Charlie attempts to view Alice's project tasks
    const unauthorizedTasks = await req(`/api/projects/${projectId}/tasks`, 'GET', null, charlieToken);
    assert(unauthorizedTasks.status === 403, 'Non-member Charlie is rejected with 403 Forbidden when accessing project tasks');

    // Charlie attempts to join project WebSocket room
    const charlieSocket = ioClient(BASE_URL, {
      auth: { token: charlieToken }
    });
    await new Promise((resolve) => charlieSocket.on('connect', resolve));

    const charlieJoin = await new Promise((resolve) => {
      charlieSocket.emit('join_project', { projectId }, resolve);
    });
    assert(charlieJoin.success === false, 'Socket.IO rejects non-member from joining project room');
    charlieSocket.disconnect();

    // --------------------------------------------------------------------------
    // TEST 9: Dashboard Database Aggregations
    // --------------------------------------------------------------------------
    console.log('\n--- Test 9: Real Dashboard Database Stats ---');
    const bobDashboard = await req('/api/dashboard/stats', 'GET', null, bobToken);
    assert(bobDashboard.status === 200, 'Dashboard statistics returned successfully');
    assert(bobDashboard.data.stats.totalProjects >= 1, `Dashboard shows real database count for totalProjects (${bobDashboard.data.stats.totalProjects})`);
    assert(bobDashboard.data.stats.totalAssignedTasks >= 1, `Dashboard shows real database count for assigned tasks (${bobDashboard.data.stats.totalAssignedTasks})`);
    assert(bobDashboard.data.stats.tasksInProgress >= 1, `Dashboard shows real database count for tasks in progress (${bobDashboard.data.stats.tasksInProgress})`);
    assert(bobDashboard.data.stats.recentActivity.length > 0, `Dashboard contains real activity logs (${bobDashboard.data.stats.recentActivity.length} events)`);

    // --------------------------------------------------------------------------
    // TEST 10: Task, Project, and Member Deletion (Owner-Only Restrictions)
    // --------------------------------------------------------------------------
    console.log('\n--- Test 10: Delete Task, Member, and Project ---');

    // 1. Task Deletion by Project Member
    const delTaskRes = await req(`/api/tasks/${taskId}`, 'DELETE', null, bobToken);
    assert(delTaskRes.status === 200, 'Member Bob can delete a task');

    // 2. Member Deletion: Promote Bob to Admin
    const promoteBobRes = await req(`/api/projects/${projectId}/members/${bobId}`, 'PUT', { role: 'admin' }, aliceToken);
    assert(promoteBobRes.status === 200, 'Owner Alice promoted Bob to Admin');

    // Add Charlie as member
    const addCharlieRes = await req(`/api/projects/${projectId}/members`, 'POST', {
      userId: charlieId,
      role: 'member'
    }, aliceToken);
    assert(addCharlieRes.status === 201, 'Owner Alice added Charlie to project');

    // Admin Bob attempts to remove Charlie -> MUST BE REJECTED with 403 Forbidden!
    const adminRemoveRes = await req(`/api/projects/${projectId}/members/${charlieId}`, 'DELETE', null, bobToken);
    assert(adminRemoveRes.status === 403, 'Admin Bob is rejected with 403 Forbidden when attempting to remove member (Owner only)');

    // Owner Alice removes Charlie -> SUCCESS with 200 OK
    const ownerRemoveRes = await req(`/api/projects/${projectId}/members/${charlieId}`, 'DELETE', null, aliceToken);
    assert(ownerRemoveRes.status === 200, 'Owner Alice successfully removed Charlie from project');

    // 3. Project Deletion: Admin Bob attempts to delete project -> MUST BE REJECTED with 403 Forbidden!
    const adminDelProjRes = await req(`/api/projects/${projectId}`, 'DELETE', null, bobToken);
    assert(adminDelProjRes.status === 403, 'Non-owner Bob is rejected with 403 Forbidden when attempting to delete project');

    // Owner Alice deletes project -> SUCCESS with 200 OK
    const ownerDelProjRes = await req(`/api/projects/${projectId}`, 'DELETE', null, aliceToken);
    assert(ownerDelProjRes.status === 200, 'Owner Alice successfully deleted project');

    console.log('\n==============================================================');
    console.log(`   🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
    console.log('==============================================================\n');

  } catch (err) {
    console.error('\n❌ Test Suite Aborted Due to Error:', err);
    process.exitCode = 1;
  } finally {
    if (aliceSocket) aliceSocket.disconnect();
    if (bobSocket) bobSocket.disconnect();
    if (testServer) {
      testServer.close();
    }
  }
}

runTestSuite();

