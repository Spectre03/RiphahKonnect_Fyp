const express = require('express');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const {
  getStats,
  getRecentContent,
  getGroups,
  deleteUser,
  updateUserRole,
  adminBlockUser,
  adminUnblockUser,
  adminDeletePost,
  adminDeleteAnnouncement,
  adminDeleteEvent,
  adminDeleteGroup,
} = require('../controllers/adminController');

const router = express.Router();

// All admin routes — SYSTEM_ADMIN only
router.use(authenticate);
router.use(authorize('SYSTEM_ADMIN'));

router.get('/stats',   getStats);
router.get('/content', getRecentContent);

// User control
router.delete('/users/:id',          deleteUser);
router.put('/users/:id/role',        updateUserRole);
router.post('/users/:id/block',      adminBlockUser);
router.post('/users/:id/unblock',    adminUnblockUser);

// Content moderation
router.delete('/posts/:id',          adminDeletePost);
router.delete('/announcements/:id',  adminDeleteAnnouncement);
router.delete('/events/:id',         adminDeleteEvent);

// Group management
router.get('/groups',        getGroups);
router.delete('/groups/:id', adminDeleteGroup);

module.exports = router;
