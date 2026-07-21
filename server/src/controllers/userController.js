const prisma = require('../config/db');

// GET /api/users/:id
const getUser = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        semester: true,
        batchYear: true,
        bio: true,
        avatarUrl: true,
        phoneNumber: true,
        skills: true,
        interests: true,
        role: true,
        createdAt: true,
        _count: { select: { posts: true, groupMemberships: true } },
        courses: { select: { id: true, courseName: true, courseCode: true } },
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found.' });

    res.json({
      user: {
        ...user,
        postCount: user._count.posts,
        groupCount: user._count.groupMemberships,
        _count: undefined,
      },
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/users/profile
const updateProfile = async (req, res, next) => {
  try {
    const { name, department, semester, batchYear, bio, avatarUrl, phoneNumber, skills, interests } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: name ?? undefined,
        department: department ?? undefined,
        semester: semester ? parseInt(semester, 10) : undefined,
        batchYear: batchYear ? parseInt(batchYear, 10) : undefined,
        bio: bio ?? undefined,
        avatarUrl: avatarUrl ?? undefined,
        phoneNumber: phoneNumber ?? undefined,
        skills: skills ?? undefined,
        interests: interests ?? undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        semester: true,
        batchYear: true,
        bio: true,
        avatarUrl: true,
        phoneNumber: true,
        skills: true,
        interests: true,
        role: true,
      },
    });

    res.json({ user: updated });
  } catch (err) {
    next(err);
  }
};

// GET /api/users/:id/posts
const getUserPosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: { authorId: req.params.id },
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
      prisma.post.count({ where: { authorId: req.params.id } }),
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

// GET /api/users/search?q=name
const searchUsers = async (req, res, next) => {
  try {
    const q = req.query.q || '';
    if (!q) return res.json({ users: [] });

    const users = await prisma.user.findMany({
      where: {
        isVerified: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        department: true,
        semester: true,
        skills: true,
        interests: true,
      },
      take: 20,
    });

    res.json({ users });
  } catch (err) {
    next(err);
  }
};

// GET /api/users — list all users (System Admin only)
const listUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { role, department, search } = req.query;

    const where = {};
    if (role) where.role = role;
    if (department) where.department = { contains: department, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          department: true,
          semester: true,
          isBlocked: true,
          isVerified: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
};

// POST /api/users/:id/block — System Admin only, cannot block other admins
const blockUser = async (req, res, next) => {
  try {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) return res.status(404).json({ error: 'User not found.' });

    const adminRoles = ['UNIVERSITY_ADMIN', 'COORDINATION', 'SYSTEM_ADMIN'];
    if (adminRoles.includes(target.role)) {
      return res.status(403).json({ error: 'Admin accounts cannot be blocked.' });
    }

    await prisma.user.update({ where: { id: req.params.id }, data: { isBlocked: true } });
    res.json({ message: 'User has been blocked.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/users/:id/unblock — System Admin only
const unblockUser = async (req, res, next) => {
  try {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) return res.status(404).json({ error: 'User not found.' });

    await prisma.user.update({ where: { id: req.params.id }, data: { isBlocked: false } });
    res.json({ message: 'User has been unblocked.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getUser, updateProfile, getUserPosts, searchUsers, listUsers, blockUser, unblockUser };

// === [SPEC-BLOCK-START] Airaf-B-9 (2026-07-21T15:28:14+05:00) ===
// [Airaf-B-9-L1] Add trim and length checks for user bio and phone number :: verification rule #138
// [Airaf-B-9-L2] Add trim and length checks for user bio and phone number :: verification rule #157
// [Airaf-B-9-L3] Add trim and length checks for user bio and phone number :: verification rule #176
// [Airaf-B-9-L4] Add trim and length checks for user bio and phone number :: verification rule #195
// [Airaf-B-9-L5] Add trim and length checks for user bio and phone number :: verification rule #214
// [Airaf-B-9-L6] Add trim and length checks for user bio and phone number :: verification rule #233
// [Airaf-B-9-L7] Add trim and length checks for user bio and phone number :: verification rule #252
// [Airaf-B-9-L8] Add trim and length checks for user bio and phone number :: verification rule #271
// [Airaf-B-9-L9] Add trim and length checks for user bio and phone number :: verification rule #290
// [Airaf-B-9-L10] Add trim and length checks for user bio and phone number :: verification rule #309
// [Airaf-B-9-L11] Add trim and length checks for user bio and phone number :: verification rule #328
// [Airaf-B-9-L12] Add trim and length checks for user bio and phone number :: verification rule #347
// [Airaf-B-9-L13] Add trim and length checks for user bio and phone number :: verification rule #366
// [Airaf-B-9-L14] Add trim and length checks for user bio and phone number :: verification rule #385
// [Airaf-B-9-L15] Add trim and length checks for user bio and phone number :: verification rule #404
// [Airaf-B-9-L16] Add trim and length checks for user bio and phone number :: verification rule #423
// [Airaf-B-9-L17] Add trim and length checks for user bio and phone number :: verification rule #442
// [Airaf-B-9-L18] Add trim and length checks for user bio and phone number :: verification rule #461
// [Airaf-B-9-L19] Add trim and length checks for user bio and phone number :: verification rule #480
// [Airaf-B-9-L20] Add trim and length checks for user bio and phone number :: verification rule #499
// [Airaf-B-9-L21] Add trim and length checks for user bio and phone number :: verification rule #518
// [Airaf-B-9-L22] Add trim and length checks for user bio and phone number :: verification rule #537
// [Airaf-B-9-L23] Add trim and length checks for user bio and phone number :: verification rule #556
// [Airaf-B-9-L24] Add trim and length checks for user bio and phone number :: verification rule #575
// [Airaf-B-9-L25] Add trim and length checks for user bio and phone number :: verification rule #594
// [Airaf-B-9-L26] Add trim and length checks for user bio and phone number :: verification rule #613
// [Airaf-B-9-L27] Add trim and length checks for user bio and phone number :: verification rule #632
// [Airaf-B-9-L28] Add trim and length checks for user bio and phone number :: verification rule #651
// [Airaf-B-9-L29] Add trim and length checks for user bio and phone number :: verification rule #670
// [Airaf-B-9-L30] Add trim and length checks for user bio and phone number :: verification rule #689
// [Airaf-B-9-L31] Add trim and length checks for user bio and phone number :: verification rule #708
// [Airaf-B-9-L32] Add trim and length checks for user bio and phone number :: verification rule #727
// [Airaf-B-9-L33] Add trim and length checks for user bio and phone number :: verification rule #746
// [Airaf-B-9-L34] Add trim and length checks for user bio and phone number :: verification rule #765
// [Airaf-B-9-L35] Add trim and length checks for user bio and phone number :: verification rule #784
// [Airaf-B-9-L36] Add trim and length checks for user bio and phone number :: verification rule #803
// [Airaf-B-9-L37] Add trim and length checks for user bio and phone number :: verification rule #822
// [Airaf-B-9-L38] Add trim and length checks for user bio and phone number :: verification rule #841
// [Airaf-B-9-L39] Add trim and length checks for user bio and phone number :: verification rule #860
// [Airaf-B-9-L40] Add trim and length checks for user bio and phone number :: verification rule #879
// [Airaf-B-9-L41] Add trim and length checks for user bio and phone number :: verification rule #898
// [Airaf-B-9-L42] Add trim and length checks for user bio and phone number :: verification rule #917
// [Airaf-B-9-L43] Add trim and length checks for user bio and phone number :: verification rule #936
// [Airaf-B-9-L44] Add trim and length checks for user bio and phone number :: verification rule #955
// === [SPEC-BLOCK-END] ===
