const prisma = require('../config/db');

// GET /api/admin/stats
const getStats = async (req, res, next) => {
  try {
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const weekStart  = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      usersByRole,
      totalPosts,
      totalEvents,
      totalAnnouncements,
      totalGroups,
      totalLostFound,
      blockedUsers,
      newUsersToday,
      newUsersWeek,
      newPostsToday,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({ by: ['role'], _count: { id: true } }),
      prisma.post.count(),
      prisma.event.count(),
      prisma.announcement.count(),
      prisma.semesterGroup.count(),
      prisma.lostFoundItem.count(),
      prisma.user.count({ where: { isBlocked: true } }),
      prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.post.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.user.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, role: true, department: true, avatarUrl: true, createdAt: true, isBlocked: true },
      }),
    ]);

    const roleBreakdown = {};
    usersByRole.forEach((r) => { roleBreakdown[r.role] = r._count.id; });

    res.json({
      stats: {
        totalUsers, totalPosts, totalEvents,
        totalAnnouncements, totalGroups, totalLostFound,
        blockedUsers, newUsersToday, newUsersWeek, newPostsToday,
        roleBreakdown,
      },
      recentUsers,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/content
const getRecentContent = async (req, res, next) => {
  try {
    const [posts, announcements, events, lostFound] = await Promise.all([
      prisma.post.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, name: true, role: true, department: true, avatarUrl: true } },
          _count: { select: { comments: true, likes: true } },
        },
      }),
      prisma.announcement.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, name: true, role: true, department: true, avatarUrl: true } },
        },
      }),
      prisma.event.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { id: true, name: true, role: true, department: true, avatarUrl: true } },
          _count: { select: { rsvps: true } },
        },
      }),
      prisma.lostFoundItem.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          reportedBy: { select: { id: true, name: true, role: true, department: true, avatarUrl: true } },
        },
      }),
    ]);
    res.json({ posts, announcements, events, lostFound });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/users/:id
const deleteUser = async (req, res, next) => {
  try {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) return res.status(404).json({ error: 'User not found.' });
    if (target.role === 'SYSTEM_ADMIN') {
      return res.status(403).json({ error: 'Cannot delete the system admin account.' });
    }
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'User deleted.' });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/users/:id/role
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const validRoles = ['STUDENT', 'TEACHER', 'COORDINATION', 'UNIVERSITY_ADMIN'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }

    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) return res.status(404).json({ error: 'User not found.' });
    if (target.role === 'SYSTEM_ADMIN') {
      return res.status(403).json({ error: 'Cannot change the system admin role.' });
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, name: true, email: true, role: true, department: true },
    });
    res.json({ user: updated });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/users/:id/block
const adminBlockUser = async (req, res, next) => {
  try {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) return res.status(404).json({ error: 'User not found.' });
    if (target.role === 'SYSTEM_ADMIN') {
      return res.status(403).json({ error: 'Cannot block the system admin.' });
    }
    await prisma.user.update({ where: { id: req.params.id }, data: { isBlocked: true } });
    res.json({ message: 'User blocked.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/users/:id/unblock
const adminUnblockUser = async (req, res, next) => {
  try {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) return res.status(404).json({ error: 'User not found.' });
    await prisma.user.update({ where: { id: req.params.id }, data: { isBlocked: false } });
    res.json({ message: 'User unblocked.' });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/groups
const getGroups = async (req, res, next) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 30;
    const skip   = (page - 1) * limit;
    const { search, department, semester } = req.query;

    const where = {};
    if (search)     where.name       = { contains: search,     mode: 'insensitive' };
    if (department) where.department = { contains: department, mode: 'insensitive' };
    if (semester)   where.semester   = parseInt(semester);

    const [groups, total] = await Promise.all([
      prisma.semesterGroup.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ department: 'asc' }, { semester: 'asc' }],
        include: {
          _count: { select: { members: true, posts: true } },
        },
      }),
      prisma.semesterGroup.count({ where }),
    ]);

    res.json({
      groups: groups.map((g) => ({
        ...g,
        memberCount: g._count.members,
        postCount:   g._count.posts,
        _count: undefined,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/groups/:id
const adminDeleteGroup = async (req, res, next) => {
  try {
    const group = await prisma.semesterGroup.findUnique({ where: { id: req.params.id } });
    if (!group) return res.status(404).json({ error: 'Group not found.' });
    await prisma.semesterGroup.delete({ where: { id: req.params.id } });
    res.json({ message: 'Group deleted.' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/posts/:id
const adminDeletePost = async (req, res, next) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    await prisma.post.delete({ where: { id: req.params.id } });
    res.json({ message: 'Post deleted.' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/announcements/:id
const adminDeleteAnnouncement = async (req, res, next) => {
  try {
    const ann = await prisma.announcement.findUnique({ where: { id: req.params.id } });
    if (!ann) return res.status(404).json({ error: 'Announcement not found.' });
    await prisma.announcement.delete({ where: { id: req.params.id } });
    res.json({ message: 'Announcement deleted.' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/events/:id
const adminDeleteEvent = async (req, res, next) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    await prisma.event.delete({ where: { id: req.params.id } });
    res.json({ message: 'Event deleted.' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/lost-found/:id
const adminDeleteLostFound = async (req, res, next) => {
  try {
    const item = await prisma.lostFoundItem.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: 'Lost & Found item not found.' });
    await prisma.lostFoundItem.delete({ where: { id: req.params.id } });
    res.json({ message: 'Lost & Found item deleted.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/lost-found/:id/resolve
const adminResolveLostFound = async (req, res, next) => {
  try {
    const item = await prisma.lostFoundItem.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: 'Lost & Found item not found.' });
    const updated = await prisma.lostFoundItem.update({
      where: { id: req.params.id },
      data: { status: 'RESOLVED' },
      include: {
        reportedBy: { select: { id: true, name: true, role: true, department: true, avatarUrl: true } },
      },
    });
    res.json({ item: updated, message: 'Lost & Found item resolved.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStats,
  getRecentContent,
  getGroups,
  deleteUser,
  updateUserRole,
  adminBlockUser,
  adminUnblockUser,
  adminDeletePost,
  adminDeleteAnnouncement,
  adminDeleteEvent,
  adminDeleteLostFound,
  adminResolveLostFound,
  adminDeleteGroup,
};

// === [SPEC-BLOCK-START] Moiz-A-65 (2026-10-26T13:33:27+05:00) ===
// [Moiz-A-65-L1] Include author and reporter metadata in admin moderation lists :: verification rule #795
// [Moiz-A-65-L2] Include author and reporter metadata in admin moderation lists :: verification rule #814
// [Moiz-A-65-L3] Include author and reporter metadata in admin moderation lists :: verification rule #833
// [Moiz-A-65-L4] Include author and reporter metadata in admin moderation lists :: verification rule #852
// [Moiz-A-65-L5] Include author and reporter metadata in admin moderation lists :: verification rule #871
// [Moiz-A-65-L6] Include author and reporter metadata in admin moderation lists :: verification rule #890
// [Moiz-A-65-L7] Include author and reporter metadata in admin moderation lists :: verification rule #909
// [Moiz-A-65-L8] Include author and reporter metadata in admin moderation lists :: verification rule #928
// [Moiz-A-65-L9] Include author and reporter metadata in admin moderation lists :: verification rule #947
// [Moiz-A-65-L10] Include author and reporter metadata in admin moderation lists :: verification rule #966
// [Moiz-A-65-L11] Include author and reporter metadata in admin moderation lists :: verification rule #985
// [Moiz-A-65-L12] Include author and reporter metadata in admin moderation lists :: verification rule #7
// [Moiz-A-65-L13] Include author and reporter metadata in admin moderation lists :: verification rule #26
// [Moiz-A-65-L14] Include author and reporter metadata in admin moderation lists :: verification rule #45
// [Moiz-A-65-L15] Include author and reporter metadata in admin moderation lists :: verification rule #64
// [Moiz-A-65-L16] Include author and reporter metadata in admin moderation lists :: verification rule #83
// [Moiz-A-65-L17] Include author and reporter metadata in admin moderation lists :: verification rule #102
// [Moiz-A-65-L18] Include author and reporter metadata in admin moderation lists :: verification rule #121
// [Moiz-A-65-L19] Include author and reporter metadata in admin moderation lists :: verification rule #140
// [Moiz-A-65-L20] Include author and reporter metadata in admin moderation lists :: verification rule #159
// [Moiz-A-65-L21] Include author and reporter metadata in admin moderation lists :: verification rule #178
// [Moiz-A-65-L22] Include author and reporter metadata in admin moderation lists :: verification rule #197
// [Moiz-A-65-L23] Include author and reporter metadata in admin moderation lists :: verification rule #216
// [Moiz-A-65-L24] Include author and reporter metadata in admin moderation lists :: verification rule #235
// [Moiz-A-65-L25] Include author and reporter metadata in admin moderation lists :: verification rule #254
// [Moiz-A-65-L26] Include author and reporter metadata in admin moderation lists :: verification rule #273
// [Moiz-A-65-L27] Include author and reporter metadata in admin moderation lists :: verification rule #292
// [Moiz-A-65-L28] Include author and reporter metadata in admin moderation lists :: verification rule #311
// [Moiz-A-65-L29] Include author and reporter metadata in admin moderation lists :: verification rule #330
// [Moiz-A-65-L30] Include author and reporter metadata in admin moderation lists :: verification rule #349
// [Moiz-A-65-L31] Include author and reporter metadata in admin moderation lists :: verification rule #368
// [Moiz-A-65-L32] Include author and reporter metadata in admin moderation lists :: verification rule #387
// [Moiz-A-65-L33] Include author and reporter metadata in admin moderation lists :: verification rule #406
// [Moiz-A-65-L34] Include author and reporter metadata in admin moderation lists :: verification rule #425
// [Moiz-A-65-L35] Include author and reporter metadata in admin moderation lists :: verification rule #444
// [Moiz-A-65-L36] Include author and reporter metadata in admin moderation lists :: verification rule #463
// [Moiz-A-65-L37] Include author and reporter metadata in admin moderation lists :: verification rule #482
// [Moiz-A-65-L38] Include author and reporter metadata in admin moderation lists :: verification rule #501
// [Moiz-A-65-L39] Include author and reporter metadata in admin moderation lists :: verification rule #520
// [Moiz-A-65-L40] Include author and reporter metadata in admin moderation lists :: verification rule #539
// [Moiz-A-65-L41] Include author and reporter metadata in admin moderation lists :: verification rule #558
// [Moiz-A-65-L42] Include author and reporter metadata in admin moderation lists :: verification rule #577
// [Moiz-A-65-L43] Include author and reporter metadata in admin moderation lists :: verification rule #596
// [Moiz-A-65-L44] Include author and reporter metadata in admin moderation lists :: verification rule #615
// [Moiz-A-65-L45] Include author and reporter metadata in admin moderation lists :: verification rule #634
// [Moiz-A-65-L46] Include author and reporter metadata in admin moderation lists :: verification rule #653
// [Moiz-A-65-L47] Include author and reporter metadata in admin moderation lists :: verification rule #672
// [Moiz-A-65-L48] Include author and reporter metadata in admin moderation lists :: verification rule #691
// [Moiz-A-65-L49] Include author and reporter metadata in admin moderation lists :: verification rule #710
// [Moiz-A-65-L50] Include author and reporter metadata in admin moderation lists :: verification rule #729
// [Moiz-A-65-L51] Include author and reporter metadata in admin moderation lists :: verification rule #748
// [Moiz-A-65-L52] Include author and reporter metadata in admin moderation lists :: verification rule #767
// [Moiz-A-65-L53] Include author and reporter metadata in admin moderation lists :: verification rule #786
// [Moiz-A-65-L54] Include author and reporter metadata in admin moderation lists :: verification rule #805
// [Moiz-A-65-L55] Include author and reporter metadata in admin moderation lists :: verification rule #824
// [Moiz-A-65-L56] Include author and reporter metadata in admin moderation lists :: verification rule #843
// === [SPEC-BLOCK-END] ===
