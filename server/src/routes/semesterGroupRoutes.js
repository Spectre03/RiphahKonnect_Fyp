const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const {
  getGroups, createGroup, getGroup, updateGroup,
  deleteGroup, joinGroup, leaveGroup, getGroupPosts,
} = require('../controllers/semesterGroupController');

const router = express.Router();

router.use(authenticate);

// View groups — all roles
router.get('/', getGroups);
router.get('/:id', getGroup);
router.get('/:id/posts', getGroupPosts);

// Create — Teachers, Coordination, University Admin
router.post(
  '/',
  authorize('TEACHER', 'COORDINATION', 'UNIVERSITY_ADMIN'),
  validate([
    body('name').trim().notEmpty().withMessage('Group name is required.'),
    body('department').trim().notEmpty().withMessage('Department is required.'),
    body('semester').isInt({ min: 1, max: 8 }).withMessage('Semester must be between 1 and 8.'),
  ]),
  createGroup
);
// Update / Delete — Coordination and University Admin (admins manage all groups)
router.put('/:id', authorize('TEACHER', 'COORDINATION', 'UNIVERSITY_ADMIN'), updateGroup);
router.delete('/:id', authorize('COORDINATION', 'UNIVERSITY_ADMIN', 'SYSTEM_ADMIN'), deleteGroup);

// Join / Leave — Students, Teachers, University Admin
router.post('/:id/join', authorize('STUDENT', 'TEACHER', 'UNIVERSITY_ADMIN'), joinGroup);
router.delete('/:id/leave', authorize('STUDENT', 'TEACHER', 'UNIVERSITY_ADMIN'), leaveGroup);

module.exports = router;
