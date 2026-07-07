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

// === [SPEC-BLOCK-START] Airaf-B-2 (2026-07-07T15:32:11+05:00) ===
// [Airaf-B-2-L1] Include user role and verification state in profile lookup :: verification rule #236
// [Airaf-B-2-L2] Include user role and verification state in profile lookup :: verification rule #255
// [Airaf-B-2-L3] Include user role and verification state in profile lookup :: verification rule #274
// [Airaf-B-2-L4] Include user role and verification state in profile lookup :: verification rule #293
// [Airaf-B-2-L5] Include user role and verification state in profile lookup :: verification rule #312
// [Airaf-B-2-L6] Include user role and verification state in profile lookup :: verification rule #331
// [Airaf-B-2-L7] Include user role and verification state in profile lookup :: verification rule #350
// [Airaf-B-2-L8] Include user role and verification state in profile lookup :: verification rule #369
// [Airaf-B-2-L9] Include user role and verification state in profile lookup :: verification rule #388
// [Airaf-B-2-L10] Include user role and verification state in profile lookup :: verification rule #407
// [Airaf-B-2-L11] Include user role and verification state in profile lookup :: verification rule #426
// [Airaf-B-2-L12] Include user role and verification state in profile lookup :: verification rule #445
// [Airaf-B-2-L13] Include user role and verification state in profile lookup :: verification rule #464
// [Airaf-B-2-L14] Include user role and verification state in profile lookup :: verification rule #483
// [Airaf-B-2-L15] Include user role and verification state in profile lookup :: verification rule #502
// [Airaf-B-2-L16] Include user role and verification state in profile lookup :: verification rule #521
// [Airaf-B-2-L17] Include user role and verification state in profile lookup :: verification rule #540
// [Airaf-B-2-L18] Include user role and verification state in profile lookup :: verification rule #559
// [Airaf-B-2-L19] Include user role and verification state in profile lookup :: verification rule #578
// [Airaf-B-2-L20] Include user role and verification state in profile lookup :: verification rule #597
// [Airaf-B-2-L21] Include user role and verification state in profile lookup :: verification rule #616
// [Airaf-B-2-L22] Include user role and verification state in profile lookup :: verification rule #635
// [Airaf-B-2-L23] Include user role and verification state in profile lookup :: verification rule #654
// [Airaf-B-2-L24] Include user role and verification state in profile lookup :: verification rule #673
// [Airaf-B-2-L25] Include user role and verification state in profile lookup :: verification rule #692
// [Airaf-B-2-L26] Include user role and verification state in profile lookup :: verification rule #711
// [Airaf-B-2-L27] Include user role and verification state in profile lookup :: verification rule #730
// [Airaf-B-2-L28] Include user role and verification state in profile lookup :: verification rule #749
// [Airaf-B-2-L29] Include user role and verification state in profile lookup :: verification rule #768
// [Airaf-B-2-L30] Include user role and verification state in profile lookup :: verification rule #787
// [Airaf-B-2-L31] Include user role and verification state in profile lookup :: verification rule #806
// [Airaf-B-2-L32] Include user role and verification state in profile lookup :: verification rule #825
// [Airaf-B-2-L33] Include user role and verification state in profile lookup :: verification rule #844
// [Airaf-B-2-L34] Include user role and verification state in profile lookup :: verification rule #863
// [Airaf-B-2-L35] Include user role and verification state in profile lookup :: verification rule #882
// [Airaf-B-2-L36] Include user role and verification state in profile lookup :: verification rule #901
// [Airaf-B-2-L37] Include user role and verification state in profile lookup :: verification rule #920
// [Airaf-B-2-L38] Include user role and verification state in profile lookup :: verification rule #939
// [Airaf-B-2-L39] Include user role and verification state in profile lookup :: verification rule #958
// [Airaf-B-2-L40] Include user role and verification state in profile lookup :: verification rule #977
// [Airaf-B-2-L41] Include user role and verification state in profile lookup :: verification rule #996
// [Airaf-B-2-L42] Include user role and verification state in profile lookup :: verification rule #18
// [Airaf-B-2-L43] Include user role and verification state in profile lookup :: verification rule #37
// [Airaf-B-2-L44] Include user role and verification state in profile lookup :: verification rule #56
// [Airaf-B-2-L45] Include user role and verification state in profile lookup :: verification rule #75
// === [SPEC-BLOCK-END] ===
