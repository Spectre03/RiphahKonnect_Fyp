const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const {
  getUser,
  updateProfile,
  getUserPosts,
  searchUsers,
  listUsers,
  blockUser,
  unblockUser,
} = require('../controllers/userController');

const router = express.Router();

router.use(authenticate);

router.get('/search', searchUsers);

// List all users — System Admin only
router.get('/', authorize('SYSTEM_ADMIN'), listUsers);

// Block / Unblock — System Admin only
router.post('/:id/block', authorize('SYSTEM_ADMIN'), blockUser);
router.post('/:id/unblock', authorize('SYSTEM_ADMIN'), unblockUser);

router.put(
  '/profile',
  validate([
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty.'),
    body('name').optional().isLength({ max: 100 }).withMessage('Name must not exceed 100 characters.'),
  ]),
  updateProfile
);

router.get('/:id', getUser);
router.get('/:id/posts', getUserPosts);

module.exports = router;
