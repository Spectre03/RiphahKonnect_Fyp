const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const {
  getPosts,
  createPost,
  getPost,
  updatePost,
  deletePost,
  toggleLike,
  getComments,
  createComment,
  deleteComment,
} = require('../controllers/postController');

const router = express.Router();

router.use(authenticate);

// All authenticated users can view, post, like, and comment
router.get('/', getPosts);
router.get('/:id', getPost);
router.get('/:id/comments', getComments);

router.post(
  '/',
  validate([
    body('content')
      .trim().notEmpty().withMessage('Post content is required.')
      .isLength({ max: 5000 }).withMessage('Post content cannot exceed 5000 characters.'),
    body('type')
      .optional()
      .isIn(['GENERAL', 'QUESTION', 'RESOURCE']).withMessage('Invalid post type.'),
  ]),
  createPost
);

router.put(
  '/:id',
  validate([
    body('content')
      .optional().trim().notEmpty().withMessage('Content cannot be empty.')
      .isLength({ max: 5000 }).withMessage('Post content cannot exceed 5000 characters.'),
    body('type')
      .optional()
      .isIn(['GENERAL', 'QUESTION', 'RESOURCE']).withMessage('Invalid post type.'),
  ]),
  updatePost
);

router.delete('/:id', deletePost);

router.post('/:id/like', toggleLike);

router.post(
  '/:id/comments',
  validate([
    body('content')
      .trim().notEmpty().withMessage('Comment content is required.')
      .isLength({ max: 1000 }).withMessage('Comment cannot exceed 1000 characters.'),
  ]),
  createComment
);

router.delete('/comments/:commentId', deleteComment);

module.exports = router;
