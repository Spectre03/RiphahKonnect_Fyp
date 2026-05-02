const prisma = require('../config/db');

// GET /api/posts — paginated feed
const getPosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { type } = req.query;

    const validTypes = ['GENERAL', 'QUESTION', 'RESOURCE'];
    const where = {
      groupId: null, // only public feed posts
      ...(type && validTypes.includes(type) ? { type } : {}),
    };

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: { id: true, name: true, avatarUrl: true, department: true },
          },
          _count: { select: { comments: true, likes: true } },
          likes: {
            where: { userId: req.user.id },
            select: { id: true },
          },
        },
      }),
      prisma.post.count({ where }),
    ]);

    const formatted = posts.map((p) => ({
      ...p,
      likesCount: p._count.likes,
      commentsCount: p._count.comments,
      isLiked: p.likes.length > 0,
      _count: undefined,
      likes: undefined,
    }));

    res.json({
      posts: formatted,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/posts
const createPost = async (req, res, next) => {
  try {
    const { content, type, imageUrl, groupId } = req.body;

    // If posting to a group, verify the user is a member
    if (groupId) {
      const membership = await prisma.groupMember.findUnique({
        where: { userId_groupId: { userId: req.user.id, groupId } },
      });
      if (!membership) {
        return res.status(403).json({ error: 'You must be a member of the group to post.' });
      }
    }

    const post = await prisma.post.create({
      data: {
        content,
        type: type || 'GENERAL',
        imageUrl,
        authorId: req.user.id,
        groupId: groupId || null,
      },
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true, department: true },
        },
      },
    });

    res.status(201).json({ post });
  } catch (err) {
    next(err);
  }
};

// GET /api/posts/:id
const getPost = async (req, res, next) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true, department: true },
        },
        _count: { select: { comments: true, likes: true } },
        likes: {
          where: { userId: req.user.id },
          select: { id: true },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    res.json({
      post: {
        ...post,
        likesCount: post._count.likes,
        commentsCount: post._count.comments,
        isLiked: post.likes.length > 0,
        _count: undefined,
        likes: undefined,
      },
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/posts/:id
const updatePost = async (req, res, next) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    if (post.authorId !== req.user.id) return res.status(403).json({ error: 'Not authorized.' });

    const updated = await prisma.post.update({
      where: { id: req.params.id },
      data: {
        content: req.body.content ?? post.content,
        type: req.body.type ?? post.type,
        imageUrl: req.body.imageUrl ?? post.imageUrl,
      },
    });

    res.json({ post: updated });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/posts/:id
const deletePost = async (req, res, next) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    const canDelete = post.authorId === req.user.id ||
      ['UNIVERSITY_ADMIN', 'SYSTEM_ADMIN'].includes(req.user.role);
    if (!canDelete) return res.status(403).json({ error: 'Not authorized.' });

    await prisma.post.delete({ where: { id: req.params.id } });
    res.json({ message: 'Post deleted.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/posts/:id/like — toggle like
const toggleLike = async (req, res, next) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const existing = await prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } });
      return res.json({ liked: false });
    }

    await prisma.like.create({ data: { userId, postId } });
    res.json({ liked: true });
  } catch (err) {
    next(err);
  }
};

// GET /api/posts/:id/comments
const getComments = async (req, res, next) => {
  try {
    const comments = await prisma.comment.findMany({
      where: { postId: req.params.id, parentId: null },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true },
        },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
        },
      },
    });

    res.json({ comments });
  } catch (err) {
    next(err);
  }
};

// POST /api/posts/:id/comments
const createComment = async (req, res, next) => {
  try {
    const { content, parentId } = req.body;

    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const comment = await prisma.comment.create({
      data: {
        content,
        authorId: req.user.id,
        postId: req.params.id,
        parentId: parentId || null,
      },
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/posts/comments/:commentId
const deleteComment = async (req, res, next) => {
  try {
    const comment = await prisma.comment.findUnique({ where: { id: req.params.commentId } });
    if (!comment) return res.status(404).json({ error: 'Comment not found.' });
    const canDelete = comment.authorId === req.user.id ||
      ['UNIVERSITY_ADMIN', 'SYSTEM_ADMIN'].includes(req.user.role);
    if (!canDelete) return res.status(403).json({ error: 'Not authorized.' });

    await prisma.comment.delete({ where: { id: req.params.commentId } });
    res.json({ message: 'Comment deleted.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPosts,
  createPost,
  getPost,
  updatePost,
  deletePost,
  toggleLike,
  getComments,
  createComment,
  deleteComment,
};
