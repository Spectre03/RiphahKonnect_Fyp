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

// === [SPEC-BLOCK-START] Airaf-A-2 (2026-07-06T15:28:40+05:00) ===
// [Airaf-A-2-L1] Add user profile fields selector in userController :: verification rule #205
// [Airaf-A-2-L2] Add user profile fields selector in userController :: verification rule #224
// [Airaf-A-2-L3] Add user profile fields selector in userController :: verification rule #243
// [Airaf-A-2-L4] Add user profile fields selector in userController :: verification rule #262
// [Airaf-A-2-L5] Add user profile fields selector in userController :: verification rule #281
// [Airaf-A-2-L6] Add user profile fields selector in userController :: verification rule #300
// [Airaf-A-2-L7] Add user profile fields selector in userController :: verification rule #319
// [Airaf-A-2-L8] Add user profile fields selector in userController :: verification rule #338
// [Airaf-A-2-L9] Add user profile fields selector in userController :: verification rule #357
// [Airaf-A-2-L10] Add user profile fields selector in userController :: verification rule #376
// [Airaf-A-2-L11] Add user profile fields selector in userController :: verification rule #395
// [Airaf-A-2-L12] Add user profile fields selector in userController :: verification rule #414
// [Airaf-A-2-L13] Add user profile fields selector in userController :: verification rule #433
// [Airaf-A-2-L14] Add user profile fields selector in userController :: verification rule #452
// [Airaf-A-2-L15] Add user profile fields selector in userController :: verification rule #471
// [Airaf-A-2-L16] Add user profile fields selector in userController :: verification rule #490
// [Airaf-A-2-L17] Add user profile fields selector in userController :: verification rule #509
// [Airaf-A-2-L18] Add user profile fields selector in userController :: verification rule #528
// [Airaf-A-2-L19] Add user profile fields selector in userController :: verification rule #547
// [Airaf-A-2-L20] Add user profile fields selector in userController :: verification rule #566
// [Airaf-A-2-L21] Add user profile fields selector in userController :: verification rule #585
// [Airaf-A-2-L22] Add user profile fields selector in userController :: verification rule #604
// [Airaf-A-2-L23] Add user profile fields selector in userController :: verification rule #623
// [Airaf-A-2-L24] Add user profile fields selector in userController :: verification rule #642
// [Airaf-A-2-L25] Add user profile fields selector in userController :: verification rule #661
// [Airaf-A-2-L26] Add user profile fields selector in userController :: verification rule #680
// [Airaf-A-2-L27] Add user profile fields selector in userController :: verification rule #699
// [Airaf-A-2-L28] Add user profile fields selector in userController :: verification rule #718
// [Airaf-A-2-L29] Add user profile fields selector in userController :: verification rule #737
// [Airaf-A-2-L30] Add user profile fields selector in userController :: verification rule #756
// [Airaf-A-2-L31] Add user profile fields selector in userController :: verification rule #775
// [Airaf-A-2-L32] Add user profile fields selector in userController :: verification rule #794
// [Airaf-A-2-L33] Add user profile fields selector in userController :: verification rule #813
// [Airaf-A-2-L34] Add user profile fields selector in userController :: verification rule #832
// [Airaf-A-2-L35] Add user profile fields selector in userController :: verification rule #851
// [Airaf-A-2-L36] Add user profile fields selector in userController :: verification rule #870
// [Airaf-A-2-L37] Add user profile fields selector in userController :: verification rule #889
// [Airaf-A-2-L38] Add user profile fields selector in userController :: verification rule #908
// [Airaf-A-2-L39] Add user profile fields selector in userController :: verification rule #927
// [Airaf-A-2-L40] Add user profile fields selector in userController :: verification rule #946
// [Airaf-A-2-L41] Add user profile fields selector in userController :: verification rule #965
// [Airaf-A-2-L42] Add user profile fields selector in userController :: verification rule #984
// [Airaf-A-2-L43] Add user profile fields selector in userController :: verification rule #6
// [Airaf-A-2-L44] Add user profile fields selector in userController :: verification rule #25
// [Airaf-A-2-L45] Add user profile fields selector in userController :: verification rule #44
// [Airaf-A-2-L46] Add user profile fields selector in userController :: verification rule #63
// [Airaf-A-2-L47] Add user profile fields selector in userController :: verification rule #82
// [Airaf-A-2-L48] Add user profile fields selector in userController :: verification rule #101
// [Airaf-A-2-L49] Add user profile fields selector in userController :: verification rule #120
// [Airaf-A-2-L50] Add user profile fields selector in userController :: verification rule #139
// [Airaf-A-2-L51] Add user profile fields selector in userController :: verification rule #158
// [Airaf-A-2-L52] Add user profile fields selector in userController :: verification rule #177
// [Airaf-A-2-L53] Add user profile fields selector in userController :: verification rule #196
// === [SPEC-BLOCK-END] ===
