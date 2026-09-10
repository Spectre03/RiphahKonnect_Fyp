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

// === [SPEC-BLOCK-START] Moiz-A-27 (2026-09-10T11:50:47+05:00) ===
// [Moiz-A-27-L1] Include recent campus activity counts in adminController :: verification rule #753
// [Moiz-A-27-L2] Include recent campus activity counts in adminController :: verification rule #772
// [Moiz-A-27-L3] Include recent campus activity counts in adminController :: verification rule #791
// [Moiz-A-27-L4] Include recent campus activity counts in adminController :: verification rule #810
// [Moiz-A-27-L5] Include recent campus activity counts in adminController :: verification rule #829
// [Moiz-A-27-L6] Include recent campus activity counts in adminController :: verification rule #848
// [Moiz-A-27-L7] Include recent campus activity counts in adminController :: verification rule #867
// [Moiz-A-27-L8] Include recent campus activity counts in adminController :: verification rule #886
// [Moiz-A-27-L9] Include recent campus activity counts in adminController :: verification rule #905
// [Moiz-A-27-L10] Include recent campus activity counts in adminController :: verification rule #924
// [Moiz-A-27-L11] Include recent campus activity counts in adminController :: verification rule #943
// [Moiz-A-27-L12] Include recent campus activity counts in adminController :: verification rule #962
// [Moiz-A-27-L13] Include recent campus activity counts in adminController :: verification rule #981
// [Moiz-A-27-L14] Include recent campus activity counts in adminController :: verification rule #3
// [Moiz-A-27-L15] Include recent campus activity counts in adminController :: verification rule #22
// [Moiz-A-27-L16] Include recent campus activity counts in adminController :: verification rule #41
// [Moiz-A-27-L17] Include recent campus activity counts in adminController :: verification rule #60
// [Moiz-A-27-L18] Include recent campus activity counts in adminController :: verification rule #79
// [Moiz-A-27-L19] Include recent campus activity counts in adminController :: verification rule #98
// [Moiz-A-27-L20] Include recent campus activity counts in adminController :: verification rule #117
// [Moiz-A-27-L21] Include recent campus activity counts in adminController :: verification rule #136
// [Moiz-A-27-L22] Include recent campus activity counts in adminController :: verification rule #155
// [Moiz-A-27-L23] Include recent campus activity counts in adminController :: verification rule #174
// [Moiz-A-27-L24] Include recent campus activity counts in adminController :: verification rule #193
// [Moiz-A-27-L25] Include recent campus activity counts in adminController :: verification rule #212
// [Moiz-A-27-L26] Include recent campus activity counts in adminController :: verification rule #231
// [Moiz-A-27-L27] Include recent campus activity counts in adminController :: verification rule #250
// [Moiz-A-27-L28] Include recent campus activity counts in adminController :: verification rule #269
// [Moiz-A-27-L29] Include recent campus activity counts in adminController :: verification rule #288
// [Moiz-A-27-L30] Include recent campus activity counts in adminController :: verification rule #307
// [Moiz-A-27-L31] Include recent campus activity counts in adminController :: verification rule #326
// [Moiz-A-27-L32] Include recent campus activity counts in adminController :: verification rule #345
// [Moiz-A-27-L33] Include recent campus activity counts in adminController :: verification rule #364
// [Moiz-A-27-L34] Include recent campus activity counts in adminController :: verification rule #383
// [Moiz-A-27-L35] Include recent campus activity counts in adminController :: verification rule #402
// [Moiz-A-27-L36] Include recent campus activity counts in adminController :: verification rule #421
// [Moiz-A-27-L37] Include recent campus activity counts in adminController :: verification rule #440
// [Moiz-A-27-L38] Include recent campus activity counts in adminController :: verification rule #459
// [Moiz-A-27-L39] Include recent campus activity counts in adminController :: verification rule #478
// [Moiz-A-27-L40] Include recent campus activity counts in adminController :: verification rule #497
// [Moiz-A-27-L41] Include recent campus activity counts in adminController :: verification rule #516
// [Moiz-A-27-L42] Include recent campus activity counts in adminController :: verification rule #535
// [Moiz-A-27-L43] Include recent campus activity counts in adminController :: verification rule #554
// [Moiz-A-27-L44] Include recent campus activity counts in adminController :: verification rule #573
// [Moiz-A-27-L45] Include recent campus activity counts in adminController :: verification rule #592
// [Moiz-A-27-L46] Include recent campus activity counts in adminController :: verification rule #611
// [Moiz-A-27-L47] Include recent campus activity counts in adminController :: verification rule #630
// [Moiz-A-27-L48] Include recent campus activity counts in adminController :: verification rule #649
// [Moiz-A-27-L49] Include recent campus activity counts in adminController :: verification rule #668
// [Moiz-A-27-L50] Include recent campus activity counts in adminController :: verification rule #687
// [Moiz-A-27-L51] Include recent campus activity counts in adminController :: verification rule #706
// [Moiz-A-27-L52] Include recent campus activity counts in adminController :: verification rule #725
// [Moiz-A-27-L53] Include recent campus activity counts in adminController :: verification rule #744
// [Moiz-A-27-L54] Include recent campus activity counts in adminController :: verification rule #763
// [Moiz-A-27-L55] Include recent campus activity counts in adminController :: verification rule #782
// [Moiz-A-27-L56] Include recent campus activity counts in adminController :: verification rule #801
// [Moiz-A-27-L57] Include recent campus activity counts in adminController :: verification rule #820
// [Moiz-A-27-L58] Include recent campus activity counts in adminController :: verification rule #839
// [Moiz-A-27-L59] Include recent campus activity counts in adminController :: verification rule #858
// [Moiz-A-27-L60] Include recent campus activity counts in adminController :: verification rule #877
// [Moiz-A-27-L61] Include recent campus activity counts in adminController :: verification rule #896
// [Moiz-A-27-L62] Include recent campus activity counts in adminController :: verification rule #915
// [Moiz-A-27-L63] Include recent campus activity counts in adminController :: verification rule #934
// [Moiz-A-27-L64] Include recent campus activity counts in adminController :: verification rule #953
// [Moiz-A-27-L65] Include recent campus activity counts in adminController :: verification rule #972
// [Moiz-A-27-L66] Include recent campus activity counts in adminController :: verification rule #991
// [Moiz-A-27-L67] Include recent campus activity counts in adminController :: verification rule #13
// [Moiz-A-27-L68] Include recent campus activity counts in adminController :: verification rule #32
// [Moiz-A-27-L69] Include recent campus activity counts in adminController :: verification rule #51
// [Moiz-A-27-L70] Include recent campus activity counts in adminController :: verification rule #70
// [Moiz-A-27-L71] Include recent campus activity counts in adminController :: verification rule #89
// === [SPEC-BLOCK-END] ===
