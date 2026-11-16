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

// Report a lost or found item — all campus roles with proper required details
router.post(
  '/',
  authorize('STUDENT', 'TEACHER', 'COORDINATION', 'UNIVERSITY_ADMIN', 'SYSTEM_ADMIN'),
  validate([
    body('title').trim().isLength({ min: 3 }).withMessage('Item title must be at least 3 characters.'),
    body('description').trim().isLength({ min: 10 }).withMessage('Please provide a clear description (at least 10 characters).'),
    body('location').trim().isLength({ min: 2 }).withMessage('Location (where lost/found) is required.'),
    body('contactInfo').trim().isLength({ min: 4 }).withMessage('Contact info (email, phone, or room) is required.'),
    body('status').isIn(['LOST', 'FOUND']).withMessage('Status must be LOST or FOUND.'),
  ]),
  createItem
);

// Edit / Delete — reporter or admin (controller enforces reporter check)
router.put(
  '/:id',
  validate([
    body('title').optional().trim().isLength({ min: 3 }).withMessage('Title must be at least 3 characters.'),
  ]),
  updateItem
);
router.delete('/:id', deleteItem);

// Resolve (mark as RESOLVED) — reporter or staff (controller enforces authorization)
router.post('/:id/resolve', resolveItem);

module.exports = router;
