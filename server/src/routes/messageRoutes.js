const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const {
  getConversations,
  createConversation,
  getMessages,
  sendMessage,
} = require('../controllers/messageController');

const router = express.Router();

router.use(authenticate);

router.get('/', getConversations);

router.post(
  '/',
  validate([
    body('participantId')
      .if(body('isGroup').not().equals('true'))
      .notEmpty().withMessage('Participant ID is required for direct messages.'),
  ]),
  createConversation
);

router.get('/:id/messages', getMessages);

router.post(
  '/:id/messages',
  validate([
    body('content')
      .trim().notEmpty().withMessage('Message content is required.')
      .isLength({ max: 2000 }).withMessage('Message cannot exceed 2000 characters.'),
  ]),
  sendMessage
);

module.exports = router;
