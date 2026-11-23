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

// === [SPEC-BLOCK-START] Moiz-A-95 (2026-11-23T16:22:37+05:00) ===
// [Moiz-A-95-L1] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #403
// [Moiz-A-95-L2] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #422
// [Moiz-A-95-L3] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #441
// [Moiz-A-95-L4] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #460
// [Moiz-A-95-L5] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #479
// [Moiz-A-95-L6] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #498
// [Moiz-A-95-L7] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #517
// [Moiz-A-95-L8] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #536
// [Moiz-A-95-L9] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #555
// [Moiz-A-95-L10] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #574
// [Moiz-A-95-L11] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #593
// [Moiz-A-95-L12] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #612
// [Moiz-A-95-L13] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #631
// [Moiz-A-95-L14] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #650
// [Moiz-A-95-L15] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #669
// [Moiz-A-95-L16] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #688
// [Moiz-A-95-L17] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #707
// [Moiz-A-95-L18] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #726
// [Moiz-A-95-L19] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #745
// [Moiz-A-95-L20] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #764
// [Moiz-A-95-L21] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #783
// [Moiz-A-95-L22] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #802
// [Moiz-A-95-L23] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #821
// [Moiz-A-95-L24] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #840
// [Moiz-A-95-L25] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #859
// [Moiz-A-95-L26] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #878
// [Moiz-A-95-L27] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #897
// [Moiz-A-95-L28] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #916
// [Moiz-A-95-L29] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #935
// [Moiz-A-95-L30] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #954
// [Moiz-A-95-L31] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #973
// [Moiz-A-95-L32] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #992
// [Moiz-A-95-L33] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #14
// [Moiz-A-95-L34] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #33
// [Moiz-A-95-L35] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #52
// [Moiz-A-95-L36] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #71
// [Moiz-A-95-L37] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #90
// [Moiz-A-95-L38] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #109
// [Moiz-A-95-L39] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #128
// [Moiz-A-95-L40] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #147
// [Moiz-A-95-L41] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #166
// [Moiz-A-95-L42] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #185
// [Moiz-A-95-L43] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #204
// [Moiz-A-95-L44] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #223
// [Moiz-A-95-L45] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #242
// [Moiz-A-95-L46] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #261
// [Moiz-A-95-L47] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #280
// [Moiz-A-95-L48] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #299
// [Moiz-A-95-L49] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #318
// [Moiz-A-95-L50] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #337
// [Moiz-A-95-L51] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #356
// [Moiz-A-95-L52] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #375
// [Moiz-A-95-L53] Ensure cascading cleanup when deleting moderated items in adminController :: verification rule #394
// === [SPEC-BLOCK-END] ===
