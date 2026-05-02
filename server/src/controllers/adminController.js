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
