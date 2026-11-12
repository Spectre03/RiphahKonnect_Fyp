const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const {
  getAnnouncements,
  getAnnouncement,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} = require('../controllers/announcementController');

const router = express.Router();

router.use(authenticate);

// View announcements — all roles
router.get('/', getAnnouncements);
router.get('/:id', getAnnouncement);

// Create — University Admin, Coordination, Teacher, System Admin
router.post(
  '/',
  authorize('UNIVERSITY_ADMIN', 'COORDINATION', 'TEACHER', 'SYSTEM_ADMIN'),
  validate([
    body('title').trim().notEmpty().withMessage('Title is required.'),
    body('content').trim().notEmpty().withMessage('Content is required.'),
    body('targetSemester')
      .optional()
      .isInt({ min: 1, max: 8 })
      .withMessage('Semester must be between 1 and 8.'),
  ]),
  createAnnouncement
);

// Update / Delete — author or admin (checked in controller)
router.put('/:id', authorize('UNIVERSITY_ADMIN', 'COORDINATION', 'TEACHER', 'SYSTEM_ADMIN'), updateAnnouncement);
router.delete('/:id', authorize('UNIVERSITY_ADMIN', 'COORDINATION', 'TEACHER', 'SYSTEM_ADMIN'), deleteAnnouncement);

module.exports = router;
