const prisma = require('../config/db');
const { coordinatorCanManage, getDepartmentsForFaculty } = require('../utils/faculties');
const { checkTextContent } = require('../utils/moderation');

// GET /api/announcements
// Returns announcements relevant to the logged-in user
const getAnnouncements = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;
    const { type } = req.query;
    const user = req.user;

    // Build filter: user sees announcements targeted to them
    const where = {
      AND: [
        type ? { type } : {},
        {
          OR: [
            { targetDepartments: { isEmpty: true } },
            { targetDepartments: { has: 'All' } },
            { targetDepartments: { has: user.department } },
          ],
        },
        {
          OR: [
            { targetSemesters: { isEmpty: true } },
            { targetSemesters: { has: user.semester } },
          ],
        },
      ],
    };

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, name: true, avatarUrl: true, role: true, department: true } },
        },
      }),
      prisma.announcement.count({ where }),
    ]);

    res.json({
      announcements,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/announcements/:id
const getAnnouncement = async (req, res, next) => {
  try {
    const announcement = await prisma.announcement.findUnique({
      where: { id: req.params.id },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true, role: true } },
      },
    });

    if (!announcement) return res.status(404).json({ error: 'Announcement not found.' });
    res.json({ announcement });
  } catch (err) {
    next(err);
  }
};

// POST /api/announcements
const createAnnouncement = async (req, res, next) => {
  try {
    const {
      title,
      content,
      type: requestedType,
      targetDepartments,
      targetSemesters,
      publishDate,
      attachmentUrl,
      attachmentName,
    } = req.body;
    const user = req.user;

    const titleCheck = checkTextContent(title, { minLength: 3, fieldName: 'Announcement title' });
    if (!titleCheck.clean) return res.status(400).json({ error: titleCheck.reason });

    const contentCheck = checkTextContent(content, { minLength: 5, fieldName: 'Announcement content' });
    if (!contentCheck.clean) return res.status(400).json({ error: contentCheck.reason });

    // COORDINATION is faculty-scoped — they can only target their own faculty's departments
    if (user.role === 'COORDINATION' && targetDepartments && targetDepartments.length > 0) {
      for (const dept of targetDepartments) {
        if (dept !== 'All' && !coordinatorCanManage(user.department, dept)) {
          return res.status(403).json({
            error: `Your coordination office (${user.department}) does not manage the ${dept} department.`,
          });
        }
      }
    }

    // Determine type from role or requestedType
    const type = user.role === 'TEACHER'
      ? 'CLASS'
      : requestedType === 'CLASS'
      ? 'CLASS'
      : 'GENERAL';

    // Encode optional attachment metadata & publishDate cleanly if provided
    let storedContent = content.trim();
    if (attachmentUrl && !storedContent.includes('<!--RK_META:')) {
      const metaObj = {
        attachmentUrl,
        attachmentName: attachmentName || 'Attachment',
        publishDate: publishDate || new Date().toISOString(),
      };
      storedContent = `${storedContent}\n<!--RK_META:${JSON.stringify(metaObj)}-->`;
    } else if (publishDate && !storedContent.includes('<!--RK_META:')) {
      const metaObj = {
        publishDate,
      };
      storedContent = `${storedContent}\n<!--RK_META:${JSON.stringify(metaObj)}-->`;
    }

    const createdAtDate = publishDate && !Number.isNaN(new Date(publishDate).getTime())
      ? new Date(publishDate)
      : undefined;

    const announcement = await prisma.announcement.create({
      data: {
        title: title.trim(),
        content: storedContent,
        type,
        targetDepartments: targetDepartments || [],
        targetSemesters:   targetSemesters ? targetSemesters.map(s => parseInt(s)) : [],
        authorId: user.id,
        ...(createdAtDate ? { createdAt: createdAtDate } : {}),
      },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true, role: true, department: true } },
      },
    });

    // Spawn Notifications for targeted users
    // Build user filter based on targetDepartments and targetSemesters
    const userWhere = {};
    const dArray = targetDepartments || [];
    const sArray = targetSemesters ? targetSemesters.map(s => parseInt(s)) : [];

    if (dArray.length > 0 && !dArray.includes('All')) {
      userWhere.department = { in: dArray };
    }
    if (sArray.length > 0) {
      userWhere.semester = { in: sArray };
    }
    
    // exclude the author from being notified
    userWhere.id = { not: user.id };

    const targetUsers = await prisma.user.findMany({
      where: userWhere,
      select: { id: true },
    });

    if (targetUsers.length > 0) {
      const notifications = targetUsers.map(u => ({
        userId: u.id,
        title: `New ${type === 'CLASS' ? 'Class' : 'General'} Announcement`,
        content: title,
        type: 'ANNOUNCEMENT',
        link: `/announcements?id=${announcement.id}`,
      }));
      
      await prisma.notification.createMany({ data: notifications });

      // Emit socket event to online users
      const io = req.app.get('io');
      if (io) {
        targetUsers.forEach(u => {
          io.to(`user:${u.id}`).emit('notification', {
            title: `New ${type === 'CLASS' ? 'Class' : 'General'} Announcement`,
            content: title,
            type: 'ANNOUNCEMENT',
            link: `/announcements?id=${announcement.id}`
          });
        });
      }
    }

    res.status(201).json({ announcement });
  } catch (err) {
    next(err);
  }
};

// PUT /api/announcements/:id — author only
const updateAnnouncement = async (req, res, next) => {
  try {
    const announcement = await prisma.announcement.findUnique({ where: { id: req.params.id } });
    if (!announcement) return res.status(404).json({ error: 'Announcement not found.' });
    if (announcement.authorId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized.' });
    }

    const updated = await prisma.announcement.update({
      where: { id: req.params.id },
      data: {
        title:           req.body.title           ?? announcement.title,
        content:         req.body.content         ?? announcement.content,
        targetDepartments: req.body.targetDepartments !== undefined ? req.body.targetDepartments : announcement.targetDepartments,
        targetSemesters:  req.body.targetSemesters  !== undefined ? req.body.targetSemesters.map(s => parseInt(s)) : announcement.targetSemesters,
      },
    });

    res.json({ announcement: updated });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/announcements/:id — author only
const deleteAnnouncement = async (req, res, next) => {
  try {
    const announcement = await prisma.announcement.findUnique({ where: { id: req.params.id } });
    if (!announcement) return res.status(404).json({ error: 'Announcement not found.' });

    const canDelete = announcement.authorId === req.user.id ||
      ['SYSTEM_ADMIN', 'UNIVERSITY_ADMIN'].includes(req.user.role);
    if (!canDelete) return res.status(403).json({ error: 'Not authorized.' });

    await prisma.announcement.delete({ where: { id: req.params.id } });
    res.json({ message: 'Announcement deleted.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAnnouncements, getAnnouncement, createAnnouncement, updateAnnouncement, deleteAnnouncement };
