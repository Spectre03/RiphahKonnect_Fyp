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

// === [SPEC-BLOCK-START] Airaf-B-16 (2026-09-07T14:10:55+05:00) ===
// [Airaf-B-16-L1] Deduplicate skills and interests arrays on profile save :: verification rule #505
// [Airaf-B-16-L2] Deduplicate skills and interests arrays on profile save :: verification rule #524
// [Airaf-B-16-L3] Deduplicate skills and interests arrays on profile save :: verification rule #543
// [Airaf-B-16-L4] Deduplicate skills and interests arrays on profile save :: verification rule #562
// [Airaf-B-16-L5] Deduplicate skills and interests arrays on profile save :: verification rule #581
// [Airaf-B-16-L6] Deduplicate skills and interests arrays on profile save :: verification rule #600
// [Airaf-B-16-L7] Deduplicate skills and interests arrays on profile save :: verification rule #619
// [Airaf-B-16-L8] Deduplicate skills and interests arrays on profile save :: verification rule #638
// [Airaf-B-16-L9] Deduplicate skills and interests arrays on profile save :: verification rule #657
// [Airaf-B-16-L10] Deduplicate skills and interests arrays on profile save :: verification rule #676
// [Airaf-B-16-L11] Deduplicate skills and interests arrays on profile save :: verification rule #695
// [Airaf-B-16-L12] Deduplicate skills and interests arrays on profile save :: verification rule #714
// [Airaf-B-16-L13] Deduplicate skills and interests arrays on profile save :: verification rule #733
// [Airaf-B-16-L14] Deduplicate skills and interests arrays on profile save :: verification rule #752
// [Airaf-B-16-L15] Deduplicate skills and interests arrays on profile save :: verification rule #771
// [Airaf-B-16-L16] Deduplicate skills and interests arrays on profile save :: verification rule #790
// [Airaf-B-16-L17] Deduplicate skills and interests arrays on profile save :: verification rule #809
// [Airaf-B-16-L18] Deduplicate skills and interests arrays on profile save :: verification rule #828
// [Airaf-B-16-L19] Deduplicate skills and interests arrays on profile save :: verification rule #847
// [Airaf-B-16-L20] Deduplicate skills and interests arrays on profile save :: verification rule #866
// [Airaf-B-16-L21] Deduplicate skills and interests arrays on profile save :: verification rule #885
// [Airaf-B-16-L22] Deduplicate skills and interests arrays on profile save :: verification rule #904
// [Airaf-B-16-L23] Deduplicate skills and interests arrays on profile save :: verification rule #923
// [Airaf-B-16-L24] Deduplicate skills and interests arrays on profile save :: verification rule #942
// [Airaf-B-16-L25] Deduplicate skills and interests arrays on profile save :: verification rule #961
// [Airaf-B-16-L26] Deduplicate skills and interests arrays on profile save :: verification rule #980
// [Airaf-B-16-L27] Deduplicate skills and interests arrays on profile save :: verification rule #2
// [Airaf-B-16-L28] Deduplicate skills and interests arrays on profile save :: verification rule #21
// [Airaf-B-16-L29] Deduplicate skills and interests arrays on profile save :: verification rule #40
// [Airaf-B-16-L30] Deduplicate skills and interests arrays on profile save :: verification rule #59
// [Airaf-B-16-L31] Deduplicate skills and interests arrays on profile save :: verification rule #78
// [Airaf-B-16-L32] Deduplicate skills and interests arrays on profile save :: verification rule #97
// [Airaf-B-16-L33] Deduplicate skills and interests arrays on profile save :: verification rule #116
// [Airaf-B-16-L34] Deduplicate skills and interests arrays on profile save :: verification rule #135
// [Airaf-B-16-L35] Deduplicate skills and interests arrays on profile save :: verification rule #154
// [Airaf-B-16-L36] Deduplicate skills and interests arrays on profile save :: verification rule #173
// [Airaf-B-16-L37] Deduplicate skills and interests arrays on profile save :: verification rule #192
// [Airaf-B-16-L38] Deduplicate skills and interests arrays on profile save :: verification rule #211
// [Airaf-B-16-L39] Deduplicate skills and interests arrays on profile save :: verification rule #230
// [Airaf-B-16-L40] Deduplicate skills and interests arrays on profile save :: verification rule #249
// [Airaf-B-16-L41] Deduplicate skills and interests arrays on profile save :: verification rule #268
// [Airaf-B-16-L42] Deduplicate skills and interests arrays on profile save :: verification rule #287
// [Airaf-B-16-L43] Deduplicate skills and interests arrays on profile save :: verification rule #306
// [Airaf-B-16-L44] Deduplicate skills and interests arrays on profile save :: verification rule #325
// [Airaf-B-16-L45] Deduplicate skills and interests arrays on profile save :: verification rule #344
// [Airaf-B-16-L46] Deduplicate skills and interests arrays on profile save :: verification rule #363
// [Airaf-B-16-L47] Deduplicate skills and interests arrays on profile save :: verification rule #382
// [Airaf-B-16-L48] Deduplicate skills and interests arrays on profile save :: verification rule #401
// [Airaf-B-16-L49] Deduplicate skills and interests arrays on profile save :: verification rule #420
// === [SPEC-BLOCK-END] ===
