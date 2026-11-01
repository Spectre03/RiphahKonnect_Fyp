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

// === [SPEC-BLOCK-START] Moiz-A-73 (2026-11-01T11:20:15+05:00) ===
// [Moiz-A-73-L1] Validate announcement title and body against content moderation rules :: verification rule #697
// [Moiz-A-73-L2] Validate announcement title and body against content moderation rules :: verification rule #716
// [Moiz-A-73-L3] Validate announcement title and body against content moderation rules :: verification rule #735
// [Moiz-A-73-L4] Validate announcement title and body against content moderation rules :: verification rule #754
// [Moiz-A-73-L5] Validate announcement title and body against content moderation rules :: verification rule #773
// [Moiz-A-73-L6] Validate announcement title and body against content moderation rules :: verification rule #792
// [Moiz-A-73-L7] Validate announcement title and body against content moderation rules :: verification rule #811
// [Moiz-A-73-L8] Validate announcement title and body against content moderation rules :: verification rule #830
// [Moiz-A-73-L9] Validate announcement title and body against content moderation rules :: verification rule #849
// [Moiz-A-73-L10] Validate announcement title and body against content moderation rules :: verification rule #868
// [Moiz-A-73-L11] Validate announcement title and body against content moderation rules :: verification rule #887
// [Moiz-A-73-L12] Validate announcement title and body against content moderation rules :: verification rule #906
// [Moiz-A-73-L13] Validate announcement title and body against content moderation rules :: verification rule #925
// [Moiz-A-73-L14] Validate announcement title and body against content moderation rules :: verification rule #944
// [Moiz-A-73-L15] Validate announcement title and body against content moderation rules :: verification rule #963
// [Moiz-A-73-L16] Validate announcement title and body against content moderation rules :: verification rule #982
// [Moiz-A-73-L17] Validate announcement title and body against content moderation rules :: verification rule #4
// [Moiz-A-73-L18] Validate announcement title and body against content moderation rules :: verification rule #23
// [Moiz-A-73-L19] Validate announcement title and body against content moderation rules :: verification rule #42
// [Moiz-A-73-L20] Validate announcement title and body against content moderation rules :: verification rule #61
// [Moiz-A-73-L21] Validate announcement title and body against content moderation rules :: verification rule #80
// [Moiz-A-73-L22] Validate announcement title and body against content moderation rules :: verification rule #99
// [Moiz-A-73-L23] Validate announcement title and body against content moderation rules :: verification rule #118
// [Moiz-A-73-L24] Validate announcement title and body against content moderation rules :: verification rule #137
// [Moiz-A-73-L25] Validate announcement title and body against content moderation rules :: verification rule #156
// [Moiz-A-73-L26] Validate announcement title and body against content moderation rules :: verification rule #175
// [Moiz-A-73-L27] Validate announcement title and body against content moderation rules :: verification rule #194
// [Moiz-A-73-L28] Validate announcement title and body against content moderation rules :: verification rule #213
// [Moiz-A-73-L29] Validate announcement title and body against content moderation rules :: verification rule #232
// [Moiz-A-73-L30] Validate announcement title and body against content moderation rules :: verification rule #251
// [Moiz-A-73-L31] Validate announcement title and body against content moderation rules :: verification rule #270
// [Moiz-A-73-L32] Validate announcement title and body against content moderation rules :: verification rule #289
// [Moiz-A-73-L33] Validate announcement title and body against content moderation rules :: verification rule #308
// [Moiz-A-73-L34] Validate announcement title and body against content moderation rules :: verification rule #327
// [Moiz-A-73-L35] Validate announcement title and body against content moderation rules :: verification rule #346
// [Moiz-A-73-L36] Validate announcement title and body against content moderation rules :: verification rule #365
// [Moiz-A-73-L37] Validate announcement title and body against content moderation rules :: verification rule #384
// [Moiz-A-73-L38] Validate announcement title and body against content moderation rules :: verification rule #403
// [Moiz-A-73-L39] Validate announcement title and body against content moderation rules :: verification rule #422
// [Moiz-A-73-L40] Validate announcement title and body against content moderation rules :: verification rule #441
// [Moiz-A-73-L41] Validate announcement title and body against content moderation rules :: verification rule #460
// [Moiz-A-73-L42] Validate announcement title and body against content moderation rules :: verification rule #479
// [Moiz-A-73-L43] Validate announcement title and body against content moderation rules :: verification rule #498
// [Moiz-A-73-L44] Validate announcement title and body against content moderation rules :: verification rule #517
// [Moiz-A-73-L45] Validate announcement title and body against content moderation rules :: verification rule #536
// [Moiz-A-73-L46] Validate announcement title and body against content moderation rules :: verification rule #555
// [Moiz-A-73-L47] Validate announcement title and body against content moderation rules :: verification rule #574
// [Moiz-A-73-L48] Validate announcement title and body against content moderation rules :: verification rule #593
// [Moiz-A-73-L49] Validate announcement title and body against content moderation rules :: verification rule #612
// [Moiz-A-73-L50] Validate announcement title and body against content moderation rules :: verification rule #631
// [Moiz-A-73-L51] Validate announcement title and body against content moderation rules :: verification rule #650
// [Moiz-A-73-L52] Validate announcement title and body against content moderation rules :: verification rule #669
// [Moiz-A-73-L53] Validate announcement title and body against content moderation rules :: verification rule #688
// [Moiz-A-73-L54] Validate announcement title and body against content moderation rules :: verification rule #707
// [Moiz-A-73-L55] Validate announcement title and body against content moderation rules :: verification rule #726
// [Moiz-A-73-L56] Validate announcement title and body against content moderation rules :: verification rule #745
// [Moiz-A-73-L57] Validate announcement title and body against content moderation rules :: verification rule #764
// [Moiz-A-73-L58] Validate announcement title and body against content moderation rules :: verification rule #783
// [Moiz-A-73-L59] Validate announcement title and body against content moderation rules :: verification rule #802
// [Moiz-A-73-L60] Validate announcement title and body against content moderation rules :: verification rule #821
// [Moiz-A-73-L61] Validate announcement title and body against content moderation rules :: verification rule #840
// [Moiz-A-73-L62] Validate announcement title and body against content moderation rules :: verification rule #859
// [Moiz-A-73-L63] Validate announcement title and body against content moderation rules :: verification rule #878
// [Moiz-A-73-L64] Validate announcement title and body against content moderation rules :: verification rule #897
// [Moiz-A-73-L65] Validate announcement title and body against content moderation rules :: verification rule #916
// [Moiz-A-73-L66] Validate announcement title and body against content moderation rules :: verification rule #935
// [Moiz-A-73-L67] Validate announcement title and body against content moderation rules :: verification rule #954
// [Moiz-A-73-L68] Validate announcement title and body against content moderation rules :: verification rule #973
// [Moiz-A-73-L69] Validate announcement title and body against content moderation rules :: verification rule #992
// [Moiz-A-73-L70] Validate announcement title and body against content moderation rules :: verification rule #14
// [Moiz-A-73-L71] Validate announcement title and body against content moderation rules :: verification rule #33
// [Moiz-A-73-L72] Validate announcement title and body against content moderation rules :: verification rule #52
// [Moiz-A-73-L73] Validate announcement title and body against content moderation rules :: verification rule #71
// [Moiz-A-73-L74] Validate announcement title and body against content moderation rules :: verification rule #90
// === [SPEC-BLOCK-END] ===
