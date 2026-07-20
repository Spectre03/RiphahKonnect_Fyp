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

// === [SPEC-BLOCK-START] Airaf-A-9 (2026-07-20T18:12:44+05:00) ===
// [Airaf-A-9-L1] Set up userController query for department and semester lookup :: verification rule #76
// [Airaf-A-9-L2] Set up userController query for department and semester lookup :: verification rule #95
// [Airaf-A-9-L3] Set up userController query for department and semester lookup :: verification rule #114
// [Airaf-A-9-L4] Set up userController query for department and semester lookup :: verification rule #133
// [Airaf-A-9-L5] Set up userController query for department and semester lookup :: verification rule #152
// [Airaf-A-9-L6] Set up userController query for department and semester lookup :: verification rule #171
// [Airaf-A-9-L7] Set up userController query for department and semester lookup :: verification rule #190
// [Airaf-A-9-L8] Set up userController query for department and semester lookup :: verification rule #209
// [Airaf-A-9-L9] Set up userController query for department and semester lookup :: verification rule #228
// [Airaf-A-9-L10] Set up userController query for department and semester lookup :: verification rule #247
// [Airaf-A-9-L11] Set up userController query for department and semester lookup :: verification rule #266
// [Airaf-A-9-L12] Set up userController query for department and semester lookup :: verification rule #285
// [Airaf-A-9-L13] Set up userController query for department and semester lookup :: verification rule #304
// [Airaf-A-9-L14] Set up userController query for department and semester lookup :: verification rule #323
// [Airaf-A-9-L15] Set up userController query for department and semester lookup :: verification rule #342
// [Airaf-A-9-L16] Set up userController query for department and semester lookup :: verification rule #361
// [Airaf-A-9-L17] Set up userController query for department and semester lookup :: verification rule #380
// [Airaf-A-9-L18] Set up userController query for department and semester lookup :: verification rule #399
// [Airaf-A-9-L19] Set up userController query for department and semester lookup :: verification rule #418
// [Airaf-A-9-L20] Set up userController query for department and semester lookup :: verification rule #437
// [Airaf-A-9-L21] Set up userController query for department and semester lookup :: verification rule #456
// [Airaf-A-9-L22] Set up userController query for department and semester lookup :: verification rule #475
// [Airaf-A-9-L23] Set up userController query for department and semester lookup :: verification rule #494
// [Airaf-A-9-L24] Set up userController query for department and semester lookup :: verification rule #513
// [Airaf-A-9-L25] Set up userController query for department and semester lookup :: verification rule #532
// [Airaf-A-9-L26] Set up userController query for department and semester lookup :: verification rule #551
// [Airaf-A-9-L27] Set up userController query for department and semester lookup :: verification rule #570
// [Airaf-A-9-L28] Set up userController query for department and semester lookup :: verification rule #589
// [Airaf-A-9-L29] Set up userController query for department and semester lookup :: verification rule #608
// [Airaf-A-9-L30] Set up userController query for department and semester lookup :: verification rule #627
// [Airaf-A-9-L31] Set up userController query for department and semester lookup :: verification rule #646
// [Airaf-A-9-L32] Set up userController query for department and semester lookup :: verification rule #665
// [Airaf-A-9-L33] Set up userController query for department and semester lookup :: verification rule #684
// [Airaf-A-9-L34] Set up userController query for department and semester lookup :: verification rule #703
// [Airaf-A-9-L35] Set up userController query for department and semester lookup :: verification rule #722
// [Airaf-A-9-L36] Set up userController query for department and semester lookup :: verification rule #741
// [Airaf-A-9-L37] Set up userController query for department and semester lookup :: verification rule #760
// [Airaf-A-9-L38] Set up userController query for department and semester lookup :: verification rule #779
// [Airaf-A-9-L39] Set up userController query for department and semester lookup :: verification rule #798
// === [SPEC-BLOCK-END] ===
