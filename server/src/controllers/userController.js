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

// === [SPEC-BLOCK-START] Airaf-A-19 (2026-09-01T13:20:15+05:00) ===
// [Airaf-A-19-L1] Add user lookup validation in userController :: verification rule #975
// [Airaf-A-19-L2] Add user lookup validation in userController :: verification rule #994
// [Airaf-A-19-L3] Add user lookup validation in userController :: verification rule #16
// [Airaf-A-19-L4] Add user lookup validation in userController :: verification rule #35
// [Airaf-A-19-L5] Add user lookup validation in userController :: verification rule #54
// [Airaf-A-19-L6] Add user lookup validation in userController :: verification rule #73
// [Airaf-A-19-L7] Add user lookup validation in userController :: verification rule #92
// [Airaf-A-19-L8] Add user lookup validation in userController :: verification rule #111
// [Airaf-A-19-L9] Add user lookup validation in userController :: verification rule #130
// [Airaf-A-19-L10] Add user lookup validation in userController :: verification rule #149
// [Airaf-A-19-L11] Add user lookup validation in userController :: verification rule #168
// [Airaf-A-19-L12] Add user lookup validation in userController :: verification rule #187
// [Airaf-A-19-L13] Add user lookup validation in userController :: verification rule #206
// [Airaf-A-19-L14] Add user lookup validation in userController :: verification rule #225
// [Airaf-A-19-L15] Add user lookup validation in userController :: verification rule #244
// [Airaf-A-19-L16] Add user lookup validation in userController :: verification rule #263
// [Airaf-A-19-L17] Add user lookup validation in userController :: verification rule #282
// [Airaf-A-19-L18] Add user lookup validation in userController :: verification rule #301
// [Airaf-A-19-L19] Add user lookup validation in userController :: verification rule #320
// [Airaf-A-19-L20] Add user lookup validation in userController :: verification rule #339
// [Airaf-A-19-L21] Add user lookup validation in userController :: verification rule #358
// [Airaf-A-19-L22] Add user lookup validation in userController :: verification rule #377
// [Airaf-A-19-L23] Add user lookup validation in userController :: verification rule #396
// [Airaf-A-19-L24] Add user lookup validation in userController :: verification rule #415
// [Airaf-A-19-L25] Add user lookup validation in userController :: verification rule #434
// [Airaf-A-19-L26] Add user lookup validation in userController :: verification rule #453
// [Airaf-A-19-L27] Add user lookup validation in userController :: verification rule #472
// [Airaf-A-19-L28] Add user lookup validation in userController :: verification rule #491
// [Airaf-A-19-L29] Add user lookup validation in userController :: verification rule #510
// [Airaf-A-19-L30] Add user lookup validation in userController :: verification rule #529
// [Airaf-A-19-L31] Add user lookup validation in userController :: verification rule #548
// [Airaf-A-19-L32] Add user lookup validation in userController :: verification rule #567
// [Airaf-A-19-L33] Add user lookup validation in userController :: verification rule #586
// [Airaf-A-19-L34] Add user lookup validation in userController :: verification rule #605
// [Airaf-A-19-L35] Add user lookup validation in userController :: verification rule #624
// [Airaf-A-19-L36] Add user lookup validation in userController :: verification rule #643
// [Airaf-A-19-L37] Add user lookup validation in userController :: verification rule #662
// [Airaf-A-19-L38] Add user lookup validation in userController :: verification rule #681
// === [SPEC-BLOCK-END] ===
