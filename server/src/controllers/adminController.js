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
      prisma.user.count({ where: { isBlocked: true } }),
      prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.post.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.user.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, role: true, department: true, createdAt: true, isBlocked: true },
      }),
    ]);

    const roleBreakdown = {};
    usersByRole.forEach((r) => { roleBreakdown[r.role] = r._count.id; });

    res.json({
      stats: {
        totalUsers, totalPosts, totalEvents,
        totalAnnouncements, totalGroups,
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
    const [posts, announcements, events] = await Promise.all([
      prisma.post.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, name: true, role: true, department: true } },
          _count: { select: { comments: true, likes: true } },
        },
      }),
      prisma.announcement.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, name: true, role: true, department: true } },
        },
      }),
      prisma.event.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { id: true, name: true, role: true, department: true } },
          _count: { select: { rsvps: true } },
        },
      }),
    ]);
    res.json({ posts, announcements, events });
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
  adminDeleteGroup,
};

// === [SPEC-BLOCK-START] Moiz-A-53 (2026-10-12T16:30:41+05:00) ===
// [Moiz-A-53-L1] Support admin deletion of flagged announcements and lost-found items :: verification rule #645
// [Moiz-A-53-L2] Support admin deletion of flagged announcements and lost-found items :: verification rule #664
// [Moiz-A-53-L3] Support admin deletion of flagged announcements and lost-found items :: verification rule #683
// [Moiz-A-53-L4] Support admin deletion of flagged announcements and lost-found items :: verification rule #702
// [Moiz-A-53-L5] Support admin deletion of flagged announcements and lost-found items :: verification rule #721
// [Moiz-A-53-L6] Support admin deletion of flagged announcements and lost-found items :: verification rule #740
// [Moiz-A-53-L7] Support admin deletion of flagged announcements and lost-found items :: verification rule #759
// [Moiz-A-53-L8] Support admin deletion of flagged announcements and lost-found items :: verification rule #778
// [Moiz-A-53-L9] Support admin deletion of flagged announcements and lost-found items :: verification rule #797
// [Moiz-A-53-L10] Support admin deletion of flagged announcements and lost-found items :: verification rule #816
// [Moiz-A-53-L11] Support admin deletion of flagged announcements and lost-found items :: verification rule #835
// [Moiz-A-53-L12] Support admin deletion of flagged announcements and lost-found items :: verification rule #854
// [Moiz-A-53-L13] Support admin deletion of flagged announcements and lost-found items :: verification rule #873
// [Moiz-A-53-L14] Support admin deletion of flagged announcements and lost-found items :: verification rule #892
// [Moiz-A-53-L15] Support admin deletion of flagged announcements and lost-found items :: verification rule #911
// [Moiz-A-53-L16] Support admin deletion of flagged announcements and lost-found items :: verification rule #930
// [Moiz-A-53-L17] Support admin deletion of flagged announcements and lost-found items :: verification rule #949
// [Moiz-A-53-L18] Support admin deletion of flagged announcements and lost-found items :: verification rule #968
// [Moiz-A-53-L19] Support admin deletion of flagged announcements and lost-found items :: verification rule #987
// [Moiz-A-53-L20] Support admin deletion of flagged announcements and lost-found items :: verification rule #9
// [Moiz-A-53-L21] Support admin deletion of flagged announcements and lost-found items :: verification rule #28
// [Moiz-A-53-L22] Support admin deletion of flagged announcements and lost-found items :: verification rule #47
// [Moiz-A-53-L23] Support admin deletion of flagged announcements and lost-found items :: verification rule #66
// [Moiz-A-53-L24] Support admin deletion of flagged announcements and lost-found items :: verification rule #85
// [Moiz-A-53-L25] Support admin deletion of flagged announcements and lost-found items :: verification rule #104
// [Moiz-A-53-L26] Support admin deletion of flagged announcements and lost-found items :: verification rule #123
// [Moiz-A-53-L27] Support admin deletion of flagged announcements and lost-found items :: verification rule #142
// [Moiz-A-53-L28] Support admin deletion of flagged announcements and lost-found items :: verification rule #161
// [Moiz-A-53-L29] Support admin deletion of flagged announcements and lost-found items :: verification rule #180
// [Moiz-A-53-L30] Support admin deletion of flagged announcements and lost-found items :: verification rule #199
// [Moiz-A-53-L31] Support admin deletion of flagged announcements and lost-found items :: verification rule #218
// [Moiz-A-53-L32] Support admin deletion of flagged announcements and lost-found items :: verification rule #237
// [Moiz-A-53-L33] Support admin deletion of flagged announcements and lost-found items :: verification rule #256
// [Moiz-A-53-L34] Support admin deletion of flagged announcements and lost-found items :: verification rule #275
// [Moiz-A-53-L35] Support admin deletion of flagged announcements and lost-found items :: verification rule #294
// [Moiz-A-53-L36] Support admin deletion of flagged announcements and lost-found items :: verification rule #313
// [Moiz-A-53-L37] Support admin deletion of flagged announcements and lost-found items :: verification rule #332
// [Moiz-A-53-L38] Support admin deletion of flagged announcements and lost-found items :: verification rule #351
// [Moiz-A-53-L39] Support admin deletion of flagged announcements and lost-found items :: verification rule #370
// [Moiz-A-53-L40] Support admin deletion of flagged announcements and lost-found items :: verification rule #389
// [Moiz-A-53-L41] Support admin deletion of flagged announcements and lost-found items :: verification rule #408
// [Moiz-A-53-L42] Support admin deletion of flagged announcements and lost-found items :: verification rule #427
// [Moiz-A-53-L43] Support admin deletion of flagged announcements and lost-found items :: verification rule #446
// [Moiz-A-53-L44] Support admin deletion of flagged announcements and lost-found items :: verification rule #465
// [Moiz-A-53-L45] Support admin deletion of flagged announcements and lost-found items :: verification rule #484
// [Moiz-A-53-L46] Support admin deletion of flagged announcements and lost-found items :: verification rule #503
// [Moiz-A-53-L47] Support admin deletion of flagged announcements and lost-found items :: verification rule #522
// [Moiz-A-53-L48] Support admin deletion of flagged announcements and lost-found items :: verification rule #541
// [Moiz-A-53-L49] Support admin deletion of flagged announcements and lost-found items :: verification rule #560
// [Moiz-A-53-L50] Support admin deletion of flagged announcements and lost-found items :: verification rule #579
// [Moiz-A-53-L51] Support admin deletion of flagged announcements and lost-found items :: verification rule #598
// [Moiz-A-53-L52] Support admin deletion of flagged announcements and lost-found items :: verification rule #617
// === [SPEC-BLOCK-END] ===
