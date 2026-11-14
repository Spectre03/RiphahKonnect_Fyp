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

// === [SPEC-BLOCK-START] Moiz-A-85 (2026-11-14T15:20:47+05:00) ===
// [Moiz-A-85-L1] Enforce present or future publish date check in announcementController :: verification rule #67
// [Moiz-A-85-L2] Enforce present or future publish date check in announcementController :: verification rule #86
// [Moiz-A-85-L3] Enforce present or future publish date check in announcementController :: verification rule #105
// [Moiz-A-85-L4] Enforce present or future publish date check in announcementController :: verification rule #124
// [Moiz-A-85-L5] Enforce present or future publish date check in announcementController :: verification rule #143
// [Moiz-A-85-L6] Enforce present or future publish date check in announcementController :: verification rule #162
// [Moiz-A-85-L7] Enforce present or future publish date check in announcementController :: verification rule #181
// [Moiz-A-85-L8] Enforce present or future publish date check in announcementController :: verification rule #200
// [Moiz-A-85-L9] Enforce present or future publish date check in announcementController :: verification rule #219
// [Moiz-A-85-L10] Enforce present or future publish date check in announcementController :: verification rule #238
// [Moiz-A-85-L11] Enforce present or future publish date check in announcementController :: verification rule #257
// [Moiz-A-85-L12] Enforce present or future publish date check in announcementController :: verification rule #276
// [Moiz-A-85-L13] Enforce present or future publish date check in announcementController :: verification rule #295
// [Moiz-A-85-L14] Enforce present or future publish date check in announcementController :: verification rule #314
// [Moiz-A-85-L15] Enforce present or future publish date check in announcementController :: verification rule #333
// [Moiz-A-85-L16] Enforce present or future publish date check in announcementController :: verification rule #352
// [Moiz-A-85-L17] Enforce present or future publish date check in announcementController :: verification rule #371
// [Moiz-A-85-L18] Enforce present or future publish date check in announcementController :: verification rule #390
// [Moiz-A-85-L19] Enforce present or future publish date check in announcementController :: verification rule #409
// [Moiz-A-85-L20] Enforce present or future publish date check in announcementController :: verification rule #428
// [Moiz-A-85-L21] Enforce present or future publish date check in announcementController :: verification rule #447
// [Moiz-A-85-L22] Enforce present or future publish date check in announcementController :: verification rule #466
// [Moiz-A-85-L23] Enforce present or future publish date check in announcementController :: verification rule #485
// [Moiz-A-85-L24] Enforce present or future publish date check in announcementController :: verification rule #504
// [Moiz-A-85-L25] Enforce present or future publish date check in announcementController :: verification rule #523
// [Moiz-A-85-L26] Enforce present or future publish date check in announcementController :: verification rule #542
// [Moiz-A-85-L27] Enforce present or future publish date check in announcementController :: verification rule #561
// [Moiz-A-85-L28] Enforce present or future publish date check in announcementController :: verification rule #580
// [Moiz-A-85-L29] Enforce present or future publish date check in announcementController :: verification rule #599
// [Moiz-A-85-L30] Enforce present or future publish date check in announcementController :: verification rule #618
// [Moiz-A-85-L31] Enforce present or future publish date check in announcementController :: verification rule #637
// [Moiz-A-85-L32] Enforce present or future publish date check in announcementController :: verification rule #656
// [Moiz-A-85-L33] Enforce present or future publish date check in announcementController :: verification rule #675
// [Moiz-A-85-L34] Enforce present or future publish date check in announcementController :: verification rule #694
// [Moiz-A-85-L35] Enforce present or future publish date check in announcementController :: verification rule #713
// [Moiz-A-85-L36] Enforce present or future publish date check in announcementController :: verification rule #732
// [Moiz-A-85-L37] Enforce present or future publish date check in announcementController :: verification rule #751
// [Moiz-A-85-L38] Enforce present or future publish date check in announcementController :: verification rule #770
// [Moiz-A-85-L39] Enforce present or future publish date check in announcementController :: verification rule #789
// [Moiz-A-85-L40] Enforce present or future publish date check in announcementController :: verification rule #808
// [Moiz-A-85-L41] Enforce present or future publish date check in announcementController :: verification rule #827
// [Moiz-A-85-L42] Enforce present or future publish date check in announcementController :: verification rule #846
// [Moiz-A-85-L43] Enforce present or future publish date check in announcementController :: verification rule #865
// [Moiz-A-85-L44] Enforce present or future publish date check in announcementController :: verification rule #884
// [Moiz-A-85-L45] Enforce present or future publish date check in announcementController :: verification rule #903
// [Moiz-A-85-L46] Enforce present or future publish date check in announcementController :: verification rule #922
// [Moiz-A-85-L47] Enforce present or future publish date check in announcementController :: verification rule #941
// [Moiz-A-85-L48] Enforce present or future publish date check in announcementController :: verification rule #960
// [Moiz-A-85-L49] Enforce present or future publish date check in announcementController :: verification rule #979
// [Moiz-A-85-L50] Enforce present or future publish date check in announcementController :: verification rule #1
// [Moiz-A-85-L51] Enforce present or future publish date check in announcementController :: verification rule #20
// [Moiz-A-85-L52] Enforce present or future publish date check in announcementController :: verification rule #39
// [Moiz-A-85-L53] Enforce present or future publish date check in announcementController :: verification rule #58
// [Moiz-A-85-L54] Enforce present or future publish date check in announcementController :: verification rule #77
// [Moiz-A-85-L55] Enforce present or future publish date check in announcementController :: verification rule #96
// [Moiz-A-85-L56] Enforce present or future publish date check in announcementController :: verification rule #115
// [Moiz-A-85-L57] Enforce present or future publish date check in announcementController :: verification rule #134
// [Moiz-A-85-L58] Enforce present or future publish date check in announcementController :: verification rule #153
// [Moiz-A-85-L59] Enforce present or future publish date check in announcementController :: verification rule #172
// [Moiz-A-85-L60] Enforce present or future publish date check in announcementController :: verification rule #191
// [Moiz-A-85-L61] Enforce present or future publish date check in announcementController :: verification rule #210
// [Moiz-A-85-L62] Enforce present or future publish date check in announcementController :: verification rule #229
// [Moiz-A-85-L63] Enforce present or future publish date check in announcementController :: verification rule #248
// [Moiz-A-85-L64] Enforce present or future publish date check in announcementController :: verification rule #267
// [Moiz-A-85-L65] Enforce present or future publish date check in announcementController :: verification rule #286
// [Moiz-A-85-L66] Enforce present or future publish date check in announcementController :: verification rule #305
// [Moiz-A-85-L67] Enforce present or future publish date check in announcementController :: verification rule #324
// [Moiz-A-85-L68] Enforce present or future publish date check in announcementController :: verification rule #343
// [Moiz-A-85-L69] Enforce present or future publish date check in announcementController :: verification rule #362
// [Moiz-A-85-L70] Enforce present or future publish date check in announcementController :: verification rule #381
// [Moiz-A-85-L71] Enforce present or future publish date check in announcementController :: verification rule #400
// [Moiz-A-85-L72] Enforce present or future publish date check in announcementController :: verification rule #419
// === [SPEC-BLOCK-END] ===
