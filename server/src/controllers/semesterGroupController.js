const prisma = require('../config/db');
const { coordinatorCanManage } = require('../utils/faculties');

// GET /api/semester-groups
const getGroups = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { department, semester, search } = req.query;

    const where = {};
    if (department) where.department = { contains: department, mode: 'insensitive' };
    if (semester)   where.semester = parseInt(semester);
    if (search)     where.name = { contains: search, mode: 'insensitive' };

    const [groups, total] = await Promise.all([
      prisma.semesterGroup.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ department: 'asc' }, { semester: 'asc' }],
        include: {
          _count: { select: { members: true, posts: true } },
          members: {
            where: { userId: req.user.id },
            select: { id: true, role: true },
          },
        },
      }),
      prisma.semesterGroup.count({ where }),
    ]);

    const formatted = groups.map((g) => ({
      ...g,
      memberCount: g._count.members,
      postCount: g._count.posts,
      isMember: g.members.length > 0,
      myRole: g.members[0]?.role || null,
      _count: undefined,
      members: undefined,
    }));

    res.json({
      groups: formatted,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/semester-groups — Teachers, Coordination, University Admin
const createGroup = async (req, res, next) => {
  try {
    const { name, description, department, semester } = req.body;

    if (!department || !semester) {
      return res.status(400).json({ error: 'Department and semester are required.' });
    }

    // COORDINATION is faculty-scoped — they can only create groups for their own faculty
    if (req.user.role === 'COORDINATION') {
      if (!coordinatorCanManage(req.user.department, department)) {
        return res.status(403).json({
          error: `Your coordination office (${req.user.department}) does not manage the ${department} department.`,
        });
      }
    }

    const group = await prisma.semesterGroup.create({
      data: {
        name,
        description,
        department,
        semester: parseInt(semester),
        members: {
          create: { userId: req.user.id, role: 'COORDINATOR' },
        },
      },
      include: { _count: { select: { members: true } } },
    });

    res.status(201).json({
      group: { ...group, memberCount: group._count.members, _count: undefined },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/semester-groups/:id
const getGroup = async (req, res, next) => {
  try {
    const group = await prisma.semesterGroup.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { members: true, posts: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true, department: true } },
          },
        },
      },
    });

    if (!group) return res.status(404).json({ error: 'Group not found.' });

    res.json({ group });
  } catch (err) {
    next(err);
  }
};

// PUT /api/semester-groups/:id — coordinator of group or admin
const updateGroup = async (req, res, next) => {
  try {
    const group = await prisma.semesterGroup.findUnique({ where: { id: req.params.id } });
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    // Teachers can only update groups they coordinate; admins can update any
    const isAdmin = ['COORDINATION', 'UNIVERSITY_ADMIN', 'SYSTEM_ADMIN'].includes(req.user.role);
    if (!isAdmin) {
      const membership = await prisma.groupMember.findUnique({
        where: { userId_groupId: { userId: req.user.id, groupId: req.params.id } },
      });
      if (!membership || membership.role !== 'COORDINATOR') {
        return res.status(403).json({ error: 'Only the group coordinator can edit this group.' });
      }
    }

    const updated = await prisma.semesterGroup.update({
      where: { id: req.params.id },
      data: {
        name: req.body.name ?? group.name,
        description: req.body.description ?? group.description,
      },
    });

    res.json({ group: updated });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/semester-groups/:id — Coordination only
const deleteGroup = async (req, res, next) => {
  try {
    const group = await prisma.semesterGroup.findUnique({ where: { id: req.params.id } });
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    await prisma.semesterGroup.delete({ where: { id: req.params.id } });
    res.json({ message: 'Group deleted.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/semester-groups/:id/join — Student or Teacher
const joinGroup = async (req, res, next) => {
  try {
    const group = await prisma.semesterGroup.findUnique({ where: { id: req.params.id } });
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    const existing = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: req.user.id, groupId: req.params.id } },
    });
    if (existing) return res.status(409).json({ error: 'You are already a member of this group.' });

    await prisma.groupMember.create({
      data: { userId: req.user.id, groupId: req.params.id, role: 'MEMBER' },
    });

    res.json({ message: 'Joined group successfully.' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/semester-groups/:id/leave
const leaveGroup = async (req, res, next) => {
  try {
    const member = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: req.user.id, groupId: req.params.id } },
    });
    if (!member) return res.status(404).json({ error: 'You are not a member of this group.' });
    if (member.role === 'COORDINATOR') {
      return res.status(400).json({ error: 'The coordinator cannot leave the group.' });
    }

    await prisma.groupMember.delete({
      where: { userId_groupId: { userId: req.user.id, groupId: req.params.id } },
    });

    res.json({ message: 'Left group successfully.' });
  } catch (err) {
    next(err);
  }
};

// GET /api/semester-groups/:id/posts
const getGroupPosts = async (req, res, next) => {
  try {
    const member = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: req.user.id, groupId: req.params.id } },
    });
    if (!member) return res.status(403).json({ error: 'You must be a member to view group posts.' });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: { groupId: req.params.id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, name: true, avatarUrl: true, department: true } },
          _count: { select: { comments: true, likes: true } },
          likes: { where: { userId: req.user.id }, select: { id: true } },
        },
      }),
      prisma.post.count({ where: { groupId: req.params.id } }),
    ]);

    const formatted = posts.map((p) => ({
      ...p,
      likesCount: p._count.likes,
      commentsCount: p._count.comments,
      isLiked: p.likes.length > 0,
      _count: undefined,
      likes: undefined,
    }));

    res.json({ posts: formatted, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
};

module.exports = { getGroups, createGroup, getGroup, updateGroup, deleteGroup, joinGroup, leaveGroup, getGroupPosts };
