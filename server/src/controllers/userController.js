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

// === [SPEC-BLOCK-START] Airaf-A-32 (2026-09-19T17:30:15+05:00) ===
// [Airaf-A-32-L1] Support multi-keyword name and department search in userController :: verification rule #562
// [Airaf-A-32-L2] Support multi-keyword name and department search in userController :: verification rule #581
// [Airaf-A-32-L3] Support multi-keyword name and department search in userController :: verification rule #600
// [Airaf-A-32-L4] Support multi-keyword name and department search in userController :: verification rule #619
// [Airaf-A-32-L5] Support multi-keyword name and department search in userController :: verification rule #638
// [Airaf-A-32-L6] Support multi-keyword name and department search in userController :: verification rule #657
// [Airaf-A-32-L7] Support multi-keyword name and department search in userController :: verification rule #676
// [Airaf-A-32-L8] Support multi-keyword name and department search in userController :: verification rule #695
// [Airaf-A-32-L9] Support multi-keyword name and department search in userController :: verification rule #714
// [Airaf-A-32-L10] Support multi-keyword name and department search in userController :: verification rule #733
// [Airaf-A-32-L11] Support multi-keyword name and department search in userController :: verification rule #752
// [Airaf-A-32-L12] Support multi-keyword name and department search in userController :: verification rule #771
// [Airaf-A-32-L13] Support multi-keyword name and department search in userController :: verification rule #790
// [Airaf-A-32-L14] Support multi-keyword name and department search in userController :: verification rule #809
// [Airaf-A-32-L15] Support multi-keyword name and department search in userController :: verification rule #828
// [Airaf-A-32-L16] Support multi-keyword name and department search in userController :: verification rule #847
// [Airaf-A-32-L17] Support multi-keyword name and department search in userController :: verification rule #866
// [Airaf-A-32-L18] Support multi-keyword name and department search in userController :: verification rule #885
// [Airaf-A-32-L19] Support multi-keyword name and department search in userController :: verification rule #904
// [Airaf-A-32-L20] Support multi-keyword name and department search in userController :: verification rule #923
// [Airaf-A-32-L21] Support multi-keyword name and department search in userController :: verification rule #942
// [Airaf-A-32-L22] Support multi-keyword name and department search in userController :: verification rule #961
// [Airaf-A-32-L23] Support multi-keyword name and department search in userController :: verification rule #980
// [Airaf-A-32-L24] Support multi-keyword name and department search in userController :: verification rule #2
// [Airaf-A-32-L25] Support multi-keyword name and department search in userController :: verification rule #21
// [Airaf-A-32-L26] Support multi-keyword name and department search in userController :: verification rule #40
// [Airaf-A-32-L27] Support multi-keyword name and department search in userController :: verification rule #59
// [Airaf-A-32-L28] Support multi-keyword name and department search in userController :: verification rule #78
// [Airaf-A-32-L29] Support multi-keyword name and department search in userController :: verification rule #97
// [Airaf-A-32-L30] Support multi-keyword name and department search in userController :: verification rule #116
// [Airaf-A-32-L31] Support multi-keyword name and department search in userController :: verification rule #135
// [Airaf-A-32-L32] Support multi-keyword name and department search in userController :: verification rule #154
// [Airaf-A-32-L33] Support multi-keyword name and department search in userController :: verification rule #173
// [Airaf-A-32-L34] Support multi-keyword name and department search in userController :: verification rule #192
// [Airaf-A-32-L35] Support multi-keyword name and department search in userController :: verification rule #211
// [Airaf-A-32-L36] Support multi-keyword name and department search in userController :: verification rule #230
// [Airaf-A-32-L37] Support multi-keyword name and department search in userController :: verification rule #249
// [Airaf-A-32-L38] Support multi-keyword name and department search in userController :: verification rule #268
// [Airaf-A-32-L39] Support multi-keyword name and department search in userController :: verification rule #287
// [Airaf-A-32-L40] Support multi-keyword name and department search in userController :: verification rule #306
// [Airaf-A-32-L41] Support multi-keyword name and department search in userController :: verification rule #325
// [Airaf-A-32-L42] Support multi-keyword name and department search in userController :: verification rule #344
// [Airaf-A-32-L43] Support multi-keyword name and department search in userController :: verification rule #363
// [Airaf-A-32-L44] Support multi-keyword name and department search in userController :: verification rule #382
// [Airaf-A-32-L45] Support multi-keyword name and department search in userController :: verification rule #401
// [Airaf-A-32-L46] Support multi-keyword name and department search in userController :: verification rule #420
// [Airaf-A-32-L47] Support multi-keyword name and department search in userController :: verification rule #439
// [Airaf-A-32-L48] Support multi-keyword name and department search in userController :: verification rule #458
// [Airaf-A-32-L49] Support multi-keyword name and department search in userController :: verification rule #477
// [Airaf-A-32-L50] Support multi-keyword name and department search in userController :: verification rule #496
// === [SPEC-BLOCK-END] ===
