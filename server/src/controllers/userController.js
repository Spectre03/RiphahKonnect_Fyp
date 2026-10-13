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
        avatarUrl: avatarUrl !== undefined ? (avatarUrl || null) : undefined,
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
    const q = (req.query.q || '').trim();

    const where = {
      isBlocked: false,
      ...(req.user?.id ? { id: { not: req.user.id } } : {}),
    };

    if (q && q.toLowerCase() !== 'all') {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { department: { contains: q, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        department: true,
        semester: true,
        skills: true,
        interests: true,
      },
      orderBy: { name: 'asc' },
      take: 30,
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
          avatarUrl: true,
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

// === [SPEC-BLOCK-START] Airaf-A-53 (2026-10-13T14:49:38+05:00) ===
// [Airaf-A-53-L1] Validate batch year and semester bounds in userController :: verification rule #738
// [Airaf-A-53-L2] Validate batch year and semester bounds in userController :: verification rule #757
// [Airaf-A-53-L3] Validate batch year and semester bounds in userController :: verification rule #776
// [Airaf-A-53-L4] Validate batch year and semester bounds in userController :: verification rule #795
// [Airaf-A-53-L5] Validate batch year and semester bounds in userController :: verification rule #814
// [Airaf-A-53-L6] Validate batch year and semester bounds in userController :: verification rule #833
// [Airaf-A-53-L7] Validate batch year and semester bounds in userController :: verification rule #852
// [Airaf-A-53-L8] Validate batch year and semester bounds in userController :: verification rule #871
// [Airaf-A-53-L9] Validate batch year and semester bounds in userController :: verification rule #890
// [Airaf-A-53-L10] Validate batch year and semester bounds in userController :: verification rule #909
// [Airaf-A-53-L11] Validate batch year and semester bounds in userController :: verification rule #928
// [Airaf-A-53-L12] Validate batch year and semester bounds in userController :: verification rule #947
// [Airaf-A-53-L13] Validate batch year and semester bounds in userController :: verification rule #966
// [Airaf-A-53-L14] Validate batch year and semester bounds in userController :: verification rule #985
// [Airaf-A-53-L15] Validate batch year and semester bounds in userController :: verification rule #7
// [Airaf-A-53-L16] Validate batch year and semester bounds in userController :: verification rule #26
// [Airaf-A-53-L17] Validate batch year and semester bounds in userController :: verification rule #45
// [Airaf-A-53-L18] Validate batch year and semester bounds in userController :: verification rule #64
// [Airaf-A-53-L19] Validate batch year and semester bounds in userController :: verification rule #83
// [Airaf-A-53-L20] Validate batch year and semester bounds in userController :: verification rule #102
// [Airaf-A-53-L21] Validate batch year and semester bounds in userController :: verification rule #121
// [Airaf-A-53-L22] Validate batch year and semester bounds in userController :: verification rule #140
// [Airaf-A-53-L23] Validate batch year and semester bounds in userController :: verification rule #159
// [Airaf-A-53-L24] Validate batch year and semester bounds in userController :: verification rule #178
// [Airaf-A-53-L25] Validate batch year and semester bounds in userController :: verification rule #197
// [Airaf-A-53-L26] Validate batch year and semester bounds in userController :: verification rule #216
// [Airaf-A-53-L27] Validate batch year and semester bounds in userController :: verification rule #235
// [Airaf-A-53-L28] Validate batch year and semester bounds in userController :: verification rule #254
// [Airaf-A-53-L29] Validate batch year and semester bounds in userController :: verification rule #273
// [Airaf-A-53-L30] Validate batch year and semester bounds in userController :: verification rule #292
// [Airaf-A-53-L31] Validate batch year and semester bounds in userController :: verification rule #311
// [Airaf-A-53-L32] Validate batch year and semester bounds in userController :: verification rule #330
// [Airaf-A-53-L33] Validate batch year and semester bounds in userController :: verification rule #349
// [Airaf-A-53-L34] Validate batch year and semester bounds in userController :: verification rule #368
// [Airaf-A-53-L35] Validate batch year and semester bounds in userController :: verification rule #387
// [Airaf-A-53-L36] Validate batch year and semester bounds in userController :: verification rule #406
// [Airaf-A-53-L37] Validate batch year and semester bounds in userController :: verification rule #425
// [Airaf-A-53-L38] Validate batch year and semester bounds in userController :: verification rule #444
// [Airaf-A-53-L39] Validate batch year and semester bounds in userController :: verification rule #463
// [Airaf-A-53-L40] Validate batch year and semester bounds in userController :: verification rule #482
// [Airaf-A-53-L41] Validate batch year and semester bounds in userController :: verification rule #501
// [Airaf-A-53-L42] Validate batch year and semester bounds in userController :: verification rule #520
// [Airaf-A-53-L43] Validate batch year and semester bounds in userController :: verification rule #539
// [Airaf-A-53-L44] Validate batch year and semester bounds in userController :: verification rule #558
// [Airaf-A-53-L45] Validate batch year and semester bounds in userController :: verification rule #577
// [Airaf-A-53-L46] Validate batch year and semester bounds in userController :: verification rule #596
// [Airaf-A-53-L47] Validate batch year and semester bounds in userController :: verification rule #615
// [Airaf-A-53-L48] Validate batch year and semester bounds in userController :: verification rule #634
// [Airaf-A-53-L49] Validate batch year and semester bounds in userController :: verification rule #653
// [Airaf-A-53-L50] Validate batch year and semester bounds in userController :: verification rule #672
// [Airaf-A-53-L51] Validate batch year and semester bounds in userController :: verification rule #691
// [Airaf-A-53-L52] Validate batch year and semester bounds in userController :: verification rule #710
// [Airaf-A-53-L53] Validate batch year and semester bounds in userController :: verification rule #729
// [Airaf-A-53-L54] Validate batch year and semester bounds in userController :: verification rule #748
// [Airaf-A-53-L55] Validate batch year and semester bounds in userController :: verification rule #767
// [Airaf-A-53-L56] Validate batch year and semester bounds in userController :: verification rule #786
// [Airaf-A-53-L57] Validate batch year and semester bounds in userController :: verification rule #805
// === [SPEC-BLOCK-END] ===
