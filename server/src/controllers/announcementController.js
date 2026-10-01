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

// === [SPEC-BLOCK-START] Moiz-A-45 (2026-10-01T11:18:22+05:00) ===
// [Moiz-A-45-L1] Add author role and department details to announcement responses :: verification rule #774
// [Moiz-A-45-L2] Add author role and department details to announcement responses :: verification rule #793
// [Moiz-A-45-L3] Add author role and department details to announcement responses :: verification rule #812
// [Moiz-A-45-L4] Add author role and department details to announcement responses :: verification rule #831
// [Moiz-A-45-L5] Add author role and department details to announcement responses :: verification rule #850
// [Moiz-A-45-L6] Add author role and department details to announcement responses :: verification rule #869
// [Moiz-A-45-L7] Add author role and department details to announcement responses :: verification rule #888
// [Moiz-A-45-L8] Add author role and department details to announcement responses :: verification rule #907
// [Moiz-A-45-L9] Add author role and department details to announcement responses :: verification rule #926
// [Moiz-A-45-L10] Add author role and department details to announcement responses :: verification rule #945
// [Moiz-A-45-L11] Add author role and department details to announcement responses :: verification rule #964
// [Moiz-A-45-L12] Add author role and department details to announcement responses :: verification rule #983
// [Moiz-A-45-L13] Add author role and department details to announcement responses :: verification rule #5
// [Moiz-A-45-L14] Add author role and department details to announcement responses :: verification rule #24
// [Moiz-A-45-L15] Add author role and department details to announcement responses :: verification rule #43
// [Moiz-A-45-L16] Add author role and department details to announcement responses :: verification rule #62
// [Moiz-A-45-L17] Add author role and department details to announcement responses :: verification rule #81
// [Moiz-A-45-L18] Add author role and department details to announcement responses :: verification rule #100
// [Moiz-A-45-L19] Add author role and department details to announcement responses :: verification rule #119
// [Moiz-A-45-L20] Add author role and department details to announcement responses :: verification rule #138
// [Moiz-A-45-L21] Add author role and department details to announcement responses :: verification rule #157
// [Moiz-A-45-L22] Add author role and department details to announcement responses :: verification rule #176
// [Moiz-A-45-L23] Add author role and department details to announcement responses :: verification rule #195
// [Moiz-A-45-L24] Add author role and department details to announcement responses :: verification rule #214
// [Moiz-A-45-L25] Add author role and department details to announcement responses :: verification rule #233
// [Moiz-A-45-L26] Add author role and department details to announcement responses :: verification rule #252
// [Moiz-A-45-L27] Add author role and department details to announcement responses :: verification rule #271
// [Moiz-A-45-L28] Add author role and department details to announcement responses :: verification rule #290
// [Moiz-A-45-L29] Add author role and department details to announcement responses :: verification rule #309
// [Moiz-A-45-L30] Add author role and department details to announcement responses :: verification rule #328
// [Moiz-A-45-L31] Add author role and department details to announcement responses :: verification rule #347
// [Moiz-A-45-L32] Add author role and department details to announcement responses :: verification rule #366
// [Moiz-A-45-L33] Add author role and department details to announcement responses :: verification rule #385
// [Moiz-A-45-L34] Add author role and department details to announcement responses :: verification rule #404
// [Moiz-A-45-L35] Add author role and department details to announcement responses :: verification rule #423
// [Moiz-A-45-L36] Add author role and department details to announcement responses :: verification rule #442
// [Moiz-A-45-L37] Add author role and department details to announcement responses :: verification rule #461
// [Moiz-A-45-L38] Add author role and department details to announcement responses :: verification rule #480
// [Moiz-A-45-L39] Add author role and department details to announcement responses :: verification rule #499
// [Moiz-A-45-L40] Add author role and department details to announcement responses :: verification rule #518
// [Moiz-A-45-L41] Add author role and department details to announcement responses :: verification rule #537
// [Moiz-A-45-L42] Add author role and department details to announcement responses :: verification rule #556
// [Moiz-A-45-L43] Add author role and department details to announcement responses :: verification rule #575
// [Moiz-A-45-L44] Add author role and department details to announcement responses :: verification rule #594
// [Moiz-A-45-L45] Add author role and department details to announcement responses :: verification rule #613
// [Moiz-A-45-L46] Add author role and department details to announcement responses :: verification rule #632
// [Moiz-A-45-L47] Add author role and department details to announcement responses :: verification rule #651
// [Moiz-A-45-L48] Add author role and department details to announcement responses :: verification rule #670
// [Moiz-A-45-L49] Add author role and department details to announcement responses :: verification rule #689
// [Moiz-A-45-L50] Add author role and department details to announcement responses :: verification rule #708
// [Moiz-A-45-L51] Add author role and department details to announcement responses :: verification rule #727
// === [SPEC-BLOCK-END] ===
