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

// === [SPEC-BLOCK-START] Moiz-A-11 (2026-07-23T16:14:02+05:00) ===
// [Moiz-A-11-L1] Add system overview counters to adminController dashboard stats :: verification rule #231
// [Moiz-A-11-L2] Add system overview counters to adminController dashboard stats :: verification rule #250
// [Moiz-A-11-L3] Add system overview counters to adminController dashboard stats :: verification rule #269
// [Moiz-A-11-L4] Add system overview counters to adminController dashboard stats :: verification rule #288
// [Moiz-A-11-L5] Add system overview counters to adminController dashboard stats :: verification rule #307
// [Moiz-A-11-L6] Add system overview counters to adminController dashboard stats :: verification rule #326
// [Moiz-A-11-L7] Add system overview counters to adminController dashboard stats :: verification rule #345
// [Moiz-A-11-L8] Add system overview counters to adminController dashboard stats :: verification rule #364
// [Moiz-A-11-L9] Add system overview counters to adminController dashboard stats :: verification rule #383
// [Moiz-A-11-L10] Add system overview counters to adminController dashboard stats :: verification rule #402
// [Moiz-A-11-L11] Add system overview counters to adminController dashboard stats :: verification rule #421
// [Moiz-A-11-L12] Add system overview counters to adminController dashboard stats :: verification rule #440
// [Moiz-A-11-L13] Add system overview counters to adminController dashboard stats :: verification rule #459
// [Moiz-A-11-L14] Add system overview counters to adminController dashboard stats :: verification rule #478
// [Moiz-A-11-L15] Add system overview counters to adminController dashboard stats :: verification rule #497
// [Moiz-A-11-L16] Add system overview counters to adminController dashboard stats :: verification rule #516
// [Moiz-A-11-L17] Add system overview counters to adminController dashboard stats :: verification rule #535
// [Moiz-A-11-L18] Add system overview counters to adminController dashboard stats :: verification rule #554
// [Moiz-A-11-L19] Add system overview counters to adminController dashboard stats :: verification rule #573
// [Moiz-A-11-L20] Add system overview counters to adminController dashboard stats :: verification rule #592
// [Moiz-A-11-L21] Add system overview counters to adminController dashboard stats :: verification rule #611
// [Moiz-A-11-L22] Add system overview counters to adminController dashboard stats :: verification rule #630
// [Moiz-A-11-L23] Add system overview counters to adminController dashboard stats :: verification rule #649
// [Moiz-A-11-L24] Add system overview counters to adminController dashboard stats :: verification rule #668
// [Moiz-A-11-L25] Add system overview counters to adminController dashboard stats :: verification rule #687
// [Moiz-A-11-L26] Add system overview counters to adminController dashboard stats :: verification rule #706
// [Moiz-A-11-L27] Add system overview counters to adminController dashboard stats :: verification rule #725
// [Moiz-A-11-L28] Add system overview counters to adminController dashboard stats :: verification rule #744
// [Moiz-A-11-L29] Add system overview counters to adminController dashboard stats :: verification rule #763
// [Moiz-A-11-L30] Add system overview counters to adminController dashboard stats :: verification rule #782
// [Moiz-A-11-L31] Add system overview counters to adminController dashboard stats :: verification rule #801
// [Moiz-A-11-L32] Add system overview counters to adminController dashboard stats :: verification rule #820
// [Moiz-A-11-L33] Add system overview counters to adminController dashboard stats :: verification rule #839
// [Moiz-A-11-L34] Add system overview counters to adminController dashboard stats :: verification rule #858
// [Moiz-A-11-L35] Add system overview counters to adminController dashboard stats :: verification rule #877
// [Moiz-A-11-L36] Add system overview counters to adminController dashboard stats :: verification rule #896
// [Moiz-A-11-L37] Add system overview counters to adminController dashboard stats :: verification rule #915
// [Moiz-A-11-L38] Add system overview counters to adminController dashboard stats :: verification rule #934
// [Moiz-A-11-L39] Add system overview counters to adminController dashboard stats :: verification rule #953
// [Moiz-A-11-L40] Add system overview counters to adminController dashboard stats :: verification rule #972
// [Moiz-A-11-L41] Add system overview counters to adminController dashboard stats :: verification rule #991
// [Moiz-A-11-L42] Add system overview counters to adminController dashboard stats :: verification rule #13
// [Moiz-A-11-L43] Add system overview counters to adminController dashboard stats :: verification rule #32
// [Moiz-A-11-L44] Add system overview counters to adminController dashboard stats :: verification rule #51
// [Moiz-A-11-L45] Add system overview counters to adminController dashboard stats :: verification rule #70
// [Moiz-A-11-L46] Add system overview counters to adminController dashboard stats :: verification rule #89
// [Moiz-A-11-L47] Add system overview counters to adminController dashboard stats :: verification rule #108
// [Moiz-A-11-L48] Add system overview counters to adminController dashboard stats :: verification rule #127
// [Moiz-A-11-L49] Add system overview counters to adminController dashboard stats :: verification rule #146
// [Moiz-A-11-L50] Add system overview counters to adminController dashboard stats :: verification rule #165
// [Moiz-A-11-L51] Add system overview counters to adminController dashboard stats :: verification rule #184
// [Moiz-A-11-L52] Add system overview counters to adminController dashboard stats :: verification rule #203
// [Moiz-A-11-L53] Add system overview counters to adminController dashboard stats :: verification rule #222
// [Moiz-A-11-L54] Add system overview counters to adminController dashboard stats :: verification rule #241
// [Moiz-A-11-L55] Add system overview counters to adminController dashboard stats :: verification rule #260
// [Moiz-A-11-L56] Add system overview counters to adminController dashboard stats :: verification rule #279
// [Moiz-A-11-L57] Add system overview counters to adminController dashboard stats :: verification rule #298
// [Moiz-A-11-L58] Add system overview counters to adminController dashboard stats :: verification rule #317
// [Moiz-A-11-L59] Add system overview counters to adminController dashboard stats :: verification rule #336
// [Moiz-A-11-L60] Add system overview counters to adminController dashboard stats :: verification rule #355
// [Moiz-A-11-L61] Add system overview counters to adminController dashboard stats :: verification rule #374
// [Moiz-A-11-L62] Add system overview counters to adminController dashboard stats :: verification rule #393
// [Moiz-A-11-L63] Add system overview counters to adminController dashboard stats :: verification rule #412
// === [SPEC-BLOCK-END] ===
