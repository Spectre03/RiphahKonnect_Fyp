const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const {
  register,
  registerUser,
  verifyEmail,
  login,
  forgotPassword,
  resetPassword,
  getMe,
} = require('../controllers/authController');

const router = express.Router();

// Self-registration — supports any @students.riphah.edu.pk or @riphah.edu.pk email
router.post(
  '/register',
  validate([
    body('email')
      .isEmail().withMessage('Please provide a valid email.')
      .matches(/^[^\s@]+@(students\.)?riphah\.edu\.pk$/i)
      .withMessage('Use your Riphah email (e.g. 44316@students.riphah.edu.pk or name@riphah.edu.pk).'),
    body('password')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required.')
      .isLength({ max: 100 }).withMessage('Name must not exceed 100 characters.'),
    body('role')
      .optional()
      .isIn(['STUDENT', 'TEACHER', 'UNIVERSITY_ADMIN'])
      .withMessage('Role must be STUDENT, TEACHER, or UNIVERSITY_ADMIN.'),
  ]),
  register
);

// Coordination / Admin registers a Student or Teacher
router.post(
  '/register-user',
  authenticate,
  authorize('COORDINATION', 'SYSTEM_ADMIN', 'UNIVERSITY_ADMIN'),
  validate([
    body('email')
      .isEmail().withMessage('Please provide a valid email.')
      .matches(/@(students\.)?riphah\.edu\.pk$/i).withMessage('Only @riphah.edu.pk or @students.riphah.edu.pk emails are allowed.'),
    body('password')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required.')
      .isLength({ max: 100 }).withMessage('Name must not exceed 100 characters.'),
    body('role')
      .isIn(['STUDENT', 'TEACHER', 'COORDINATION', 'UNIVERSITY_ADMIN']).withMessage('Invalid role.'),
  ]),
  registerUser
);

router.get('/verify-email', verifyEmail);

router.post(
  '/login',
  validate([
    body('email').isEmail().withMessage('Please provide a valid email.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ]),
  login
);

router.post(
  '/forgot-password',
  validate([
    body('email').isEmail().withMessage('Please provide a valid email.'),
  ]),
  forgotPassword
);

router.post(
  '/reset-password',
  validate([
    body('token').notEmpty().withMessage('Reset token is required.'),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
      .matches(/\d/).withMessage('Password must contain at least one number.'),
  ]),
  resetPassword
);

router.get('/me', authenticate, getMe);

module.exports = router;
