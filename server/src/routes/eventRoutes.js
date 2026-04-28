const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const {
  getEvents,
  createEvent,
  getEvent,
  updateEvent,
  deleteEvent,
  rsvpEvent,
  getAttendees,
} = require('../controllers/eventController');

const router = express.Router();

router.use(authenticate);

// View — all roles
router.get('/', getEvents);
router.get('/:id', getEvent);
router.get('/:id/attendees', getAttendees);

// Create — Teachers, Coordination, University Admin
router.post(
  '/',
  authorize('TEACHER', 'COORDINATION', 'UNIVERSITY_ADMIN'),
  validate([
    body('title').trim().notEmpty().withMessage('Event title is required.'),
    body('startDate').notEmpty().withMessage('Start date is required.').isISO8601().withMessage('Invalid date format.'),
  ]),
  createEvent
);

// Update / Delete — creator (any staff) or System Admin (controller enforces creator check)
router.put(
  '/:id',
  authorize('TEACHER', 'COORDINATION', 'UNIVERSITY_ADMIN', 'SYSTEM_ADMIN'),
  validate([
    body('title').optional().trim().notEmpty().withMessage('Title cannot be empty.'),
    body('startDate').optional().isISO8601().withMessage('Invalid date format.'),
  ]),
  updateEvent
);
router.delete('/:id', authorize('TEACHER', 'COORDINATION', 'UNIVERSITY_ADMIN', 'SYSTEM_ADMIN'), deleteEvent);

// RSVP — all authenticated users
router.post(
  '/:id/rsvp',
  validate([
    body('status').isIn(['GOING', 'INTERESTED', 'NOT_GOING', 'REMOVE']).withMessage('Invalid RSVP status.'),
  ]),
  rsvpEvent
);

module.exports = router;
