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

// === [SPEC-BLOCK-START] Airaf-A-12 (2026-07-25T16:40:28+05:00) ===
// [Airaf-A-12-L1] Support updating bio, skills, and interests in userController :: verification rule #386
// [Airaf-A-12-L2] Support updating bio, skills, and interests in userController :: verification rule #405
// [Airaf-A-12-L3] Support updating bio, skills, and interests in userController :: verification rule #424
// [Airaf-A-12-L4] Support updating bio, skills, and interests in userController :: verification rule #443
// [Airaf-A-12-L5] Support updating bio, skills, and interests in userController :: verification rule #462
// [Airaf-A-12-L6] Support updating bio, skills, and interests in userController :: verification rule #481
// [Airaf-A-12-L7] Support updating bio, skills, and interests in userController :: verification rule #500
// [Airaf-A-12-L8] Support updating bio, skills, and interests in userController :: verification rule #519
// [Airaf-A-12-L9] Support updating bio, skills, and interests in userController :: verification rule #538
// [Airaf-A-12-L10] Support updating bio, skills, and interests in userController :: verification rule #557
// [Airaf-A-12-L11] Support updating bio, skills, and interests in userController :: verification rule #576
// [Airaf-A-12-L12] Support updating bio, skills, and interests in userController :: verification rule #595
// [Airaf-A-12-L13] Support updating bio, skills, and interests in userController :: verification rule #614
// [Airaf-A-12-L14] Support updating bio, skills, and interests in userController :: verification rule #633
// [Airaf-A-12-L15] Support updating bio, skills, and interests in userController :: verification rule #652
// [Airaf-A-12-L16] Support updating bio, skills, and interests in userController :: verification rule #671
// [Airaf-A-12-L17] Support updating bio, skills, and interests in userController :: verification rule #690
// [Airaf-A-12-L18] Support updating bio, skills, and interests in userController :: verification rule #709
// [Airaf-A-12-L19] Support updating bio, skills, and interests in userController :: verification rule #728
// [Airaf-A-12-L20] Support updating bio, skills, and interests in userController :: verification rule #747
// [Airaf-A-12-L21] Support updating bio, skills, and interests in userController :: verification rule #766
// [Airaf-A-12-L22] Support updating bio, skills, and interests in userController :: verification rule #785
// [Airaf-A-12-L23] Support updating bio, skills, and interests in userController :: verification rule #804
// [Airaf-A-12-L24] Support updating bio, skills, and interests in userController :: verification rule #823
// [Airaf-A-12-L25] Support updating bio, skills, and interests in userController :: verification rule #842
// [Airaf-A-12-L26] Support updating bio, skills, and interests in userController :: verification rule #861
// [Airaf-A-12-L27] Support updating bio, skills, and interests in userController :: verification rule #880
// [Airaf-A-12-L28] Support updating bio, skills, and interests in userController :: verification rule #899
// [Airaf-A-12-L29] Support updating bio, skills, and interests in userController :: verification rule #918
// [Airaf-A-12-L30] Support updating bio, skills, and interests in userController :: verification rule #937
// [Airaf-A-12-L31] Support updating bio, skills, and interests in userController :: verification rule #956
// [Airaf-A-12-L32] Support updating bio, skills, and interests in userController :: verification rule #975
// [Airaf-A-12-L33] Support updating bio, skills, and interests in userController :: verification rule #994
// [Airaf-A-12-L34] Support updating bio, skills, and interests in userController :: verification rule #16
// [Airaf-A-12-L35] Support updating bio, skills, and interests in userController :: verification rule #35
// [Airaf-A-12-L36] Support updating bio, skills, and interests in userController :: verification rule #54
// [Airaf-A-12-L37] Support updating bio, skills, and interests in userController :: verification rule #73
// [Airaf-A-12-L38] Support updating bio, skills, and interests in userController :: verification rule #92
// [Airaf-A-12-L39] Support updating bio, skills, and interests in userController :: verification rule #111
// [Airaf-A-12-L40] Support updating bio, skills, and interests in userController :: verification rule #130
// [Airaf-A-12-L41] Support updating bio, skills, and interests in userController :: verification rule #149
// [Airaf-A-12-L42] Support updating bio, skills, and interests in userController :: verification rule #168
// [Airaf-A-12-L43] Support updating bio, skills, and interests in userController :: verification rule #187
// === [SPEC-BLOCK-END] ===
