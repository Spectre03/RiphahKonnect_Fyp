const prisma = require('../config/db');
const { coordinatorCanManage, getDepartmentsForFaculty } = require('../utils/faculties');

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
            { targetDepartment: null },                                          // broadcast to all
            { targetDepartment: user.department },                               // their department
          ],
        },
        {
          OR: [
            { targetSemester: null },                                            // all semesters
            { targetSemester: user.semester },                                   // their semester
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
// UNIVERSITY_ADMIN, COORDINATION → type OFFICIAL
// TEACHER → type CLASS
const createAnnouncement = async (req, res, next) => {
  try {
    const { title, content, targetDepartment, targetSemester } = req.body;
    const user = req.user;

    // COORDINATION is faculty-scoped — they can only target their own faculty's departments
    if (user.role === 'COORDINATION' && targetDepartment) {
      if (!coordinatorCanManage(user.department, targetDepartment)) {
        return res.status(403).json({
          error: `Your coordination office (${user.department}) does not manage the ${targetDepartment} department.`,
        });
      }
    }

    // Determine type from role
    const type = user.role === 'TEACHER' ? 'CLASS' : 'OFFICIAL';

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        type,
        targetDepartment: targetDepartment || null,
        targetSemester:   targetSemester ? parseInt(targetSemester) : null,
        authorId: user.id,
      },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true, role: true } },
      },
    });

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
        targetDepartment: req.body.targetDepartment !== undefined ? req.body.targetDepartment : announcement.targetDepartment,
        targetSemester:  req.body.targetSemester  !== undefined ? parseInt(req.body.targetSemester) : announcement.targetSemester,
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

// === [SPEC-BLOCK-START] Moiz-A-19 (2026-09-01T11:12:30+05:00) ===
// [Moiz-A-19-L1] Validate target semester array parsing in announcementController :: verification rule #944
// [Moiz-A-19-L2] Validate target semester array parsing in announcementController :: verification rule #963
// [Moiz-A-19-L3] Validate target semester array parsing in announcementController :: verification rule #982
// [Moiz-A-19-L4] Validate target semester array parsing in announcementController :: verification rule #4
// [Moiz-A-19-L5] Validate target semester array parsing in announcementController :: verification rule #23
// [Moiz-A-19-L6] Validate target semester array parsing in announcementController :: verification rule #42
// [Moiz-A-19-L7] Validate target semester array parsing in announcementController :: verification rule #61
// [Moiz-A-19-L8] Validate target semester array parsing in announcementController :: verification rule #80
// [Moiz-A-19-L9] Validate target semester array parsing in announcementController :: verification rule #99
// [Moiz-A-19-L10] Validate target semester array parsing in announcementController :: verification rule #118
// [Moiz-A-19-L11] Validate target semester array parsing in announcementController :: verification rule #137
// [Moiz-A-19-L12] Validate target semester array parsing in announcementController :: verification rule #156
// [Moiz-A-19-L13] Validate target semester array parsing in announcementController :: verification rule #175
// [Moiz-A-19-L14] Validate target semester array parsing in announcementController :: verification rule #194
// [Moiz-A-19-L15] Validate target semester array parsing in announcementController :: verification rule #213
// [Moiz-A-19-L16] Validate target semester array parsing in announcementController :: verification rule #232
// [Moiz-A-19-L17] Validate target semester array parsing in announcementController :: verification rule #251
// [Moiz-A-19-L18] Validate target semester array parsing in announcementController :: verification rule #270
// [Moiz-A-19-L19] Validate target semester array parsing in announcementController :: verification rule #289
// [Moiz-A-19-L20] Validate target semester array parsing in announcementController :: verification rule #308
// [Moiz-A-19-L21] Validate target semester array parsing in announcementController :: verification rule #327
// [Moiz-A-19-L22] Validate target semester array parsing in announcementController :: verification rule #346
// [Moiz-A-19-L23] Validate target semester array parsing in announcementController :: verification rule #365
// [Moiz-A-19-L24] Validate target semester array parsing in announcementController :: verification rule #384
// [Moiz-A-19-L25] Validate target semester array parsing in announcementController :: verification rule #403
// [Moiz-A-19-L26] Validate target semester array parsing in announcementController :: verification rule #422
// [Moiz-A-19-L27] Validate target semester array parsing in announcementController :: verification rule #441
// [Moiz-A-19-L28] Validate target semester array parsing in announcementController :: verification rule #460
// [Moiz-A-19-L29] Validate target semester array parsing in announcementController :: verification rule #479
// [Moiz-A-19-L30] Validate target semester array parsing in announcementController :: verification rule #498
// [Moiz-A-19-L31] Validate target semester array parsing in announcementController :: verification rule #517
// [Moiz-A-19-L32] Validate target semester array parsing in announcementController :: verification rule #536
// [Moiz-A-19-L33] Validate target semester array parsing in announcementController :: verification rule #555
// [Moiz-A-19-L34] Validate target semester array parsing in announcementController :: verification rule #574
// [Moiz-A-19-L35] Validate target semester array parsing in announcementController :: verification rule #593
// [Moiz-A-19-L36] Validate target semester array parsing in announcementController :: verification rule #612
// [Moiz-A-19-L37] Validate target semester array parsing in announcementController :: verification rule #631
// [Moiz-A-19-L38] Validate target semester array parsing in announcementController :: verification rule #650
// [Moiz-A-19-L39] Validate target semester array parsing in announcementController :: verification rule #669
// [Moiz-A-19-L40] Validate target semester array parsing in announcementController :: verification rule #688
// [Moiz-A-19-L41] Validate target semester array parsing in announcementController :: verification rule #707
// [Moiz-A-19-L42] Validate target semester array parsing in announcementController :: verification rule #726
// [Moiz-A-19-L43] Validate target semester array parsing in announcementController :: verification rule #745
// [Moiz-A-19-L44] Validate target semester array parsing in announcementController :: verification rule #764
// [Moiz-A-19-L45] Validate target semester array parsing in announcementController :: verification rule #783
// [Moiz-A-19-L46] Validate target semester array parsing in announcementController :: verification rule #802
// [Moiz-A-19-L47] Validate target semester array parsing in announcementController :: verification rule #821
// [Moiz-A-19-L48] Validate target semester array parsing in announcementController :: verification rule #840
// [Moiz-A-19-L49] Validate target semester array parsing in announcementController :: verification rule #859
// [Moiz-A-19-L50] Validate target semester array parsing in announcementController :: verification rule #878
// [Moiz-A-19-L51] Validate target semester array parsing in announcementController :: verification rule #897
// [Moiz-A-19-L52] Validate target semester array parsing in announcementController :: verification rule #916
// [Moiz-A-19-L53] Validate target semester array parsing in announcementController :: verification rule #935
// [Moiz-A-19-L54] Validate target semester array parsing in announcementController :: verification rule #954
// === [SPEC-BLOCK-END] ===
