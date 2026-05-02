const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const {
  getItems,
  createItem,
  getItem,
  updateItem,
  deleteItem,
  resolveItem,
} = require('../controllers/lostFoundController');

const router = express.Router();

router.use(authenticate);

// View — all roles
router.get('/', getItems);
router.get('/:id', getItem);

// Report a lost or found item — Students and Teachers only
router.post(
  '/',
  authorize('STUDENT', 'TEACHER'),
  validate([
    body('title').trim().notEmpty().withMessage('Title is required.'),
    body('status').isIn(['LOST', 'FOUND']).withMessage('Status must be LOST or FOUND.'),
  ]),
  createItem
);

// Edit / Delete — reporter or admin (controller enforces reporter check)
router.put(
  '/:id',
  validate([
    body('title').optional().trim().notEmpty().withMessage('Title cannot be empty.'),
  ]),
  updateItem
);
router.delete('/:id', deleteItem);

// Resolve (mark as RESOLVED) — Coordination, University Admin, System Admin only
router.post('/:id/resolve', authorize('COORDINATION', 'UNIVERSITY_ADMIN', 'SYSTEM_ADMIN'), resolveItem);

module.exports = router;
