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

// === [SPEC-BLOCK-START] Moiz-A-31 (2026-09-15T17:44:29+05:00) ===
// [Moiz-A-31-L1] Support general and class announcement type filtering :: verification rule #221
// [Moiz-A-31-L2] Support general and class announcement type filtering :: verification rule #240
// [Moiz-A-31-L3] Support general and class announcement type filtering :: verification rule #259
// [Moiz-A-31-L4] Support general and class announcement type filtering :: verification rule #278
// [Moiz-A-31-L5] Support general and class announcement type filtering :: verification rule #297
// [Moiz-A-31-L6] Support general and class announcement type filtering :: verification rule #316
// [Moiz-A-31-L7] Support general and class announcement type filtering :: verification rule #335
// [Moiz-A-31-L8] Support general and class announcement type filtering :: verification rule #354
// [Moiz-A-31-L9] Support general and class announcement type filtering :: verification rule #373
// [Moiz-A-31-L10] Support general and class announcement type filtering :: verification rule #392
// [Moiz-A-31-L11] Support general and class announcement type filtering :: verification rule #411
// [Moiz-A-31-L12] Support general and class announcement type filtering :: verification rule #430
// [Moiz-A-31-L13] Support general and class announcement type filtering :: verification rule #449
// [Moiz-A-31-L14] Support general and class announcement type filtering :: verification rule #468
// [Moiz-A-31-L15] Support general and class announcement type filtering :: verification rule #487
// [Moiz-A-31-L16] Support general and class announcement type filtering :: verification rule #506
// [Moiz-A-31-L17] Support general and class announcement type filtering :: verification rule #525
// [Moiz-A-31-L18] Support general and class announcement type filtering :: verification rule #544
// [Moiz-A-31-L19] Support general and class announcement type filtering :: verification rule #563
// [Moiz-A-31-L20] Support general and class announcement type filtering :: verification rule #582
// [Moiz-A-31-L21] Support general and class announcement type filtering :: verification rule #601
// [Moiz-A-31-L22] Support general and class announcement type filtering :: verification rule #620
// [Moiz-A-31-L23] Support general and class announcement type filtering :: verification rule #639
// [Moiz-A-31-L24] Support general and class announcement type filtering :: verification rule #658
// [Moiz-A-31-L25] Support general and class announcement type filtering :: verification rule #677
// [Moiz-A-31-L26] Support general and class announcement type filtering :: verification rule #696
// [Moiz-A-31-L27] Support general and class announcement type filtering :: verification rule #715
// [Moiz-A-31-L28] Support general and class announcement type filtering :: verification rule #734
// [Moiz-A-31-L29] Support general and class announcement type filtering :: verification rule #753
// [Moiz-A-31-L30] Support general and class announcement type filtering :: verification rule #772
// [Moiz-A-31-L31] Support general and class announcement type filtering :: verification rule #791
// [Moiz-A-31-L32] Support general and class announcement type filtering :: verification rule #810
// [Moiz-A-31-L33] Support general and class announcement type filtering :: verification rule #829
// [Moiz-A-31-L34] Support general and class announcement type filtering :: verification rule #848
// [Moiz-A-31-L35] Support general and class announcement type filtering :: verification rule #867
// [Moiz-A-31-L36] Support general and class announcement type filtering :: verification rule #886
// [Moiz-A-31-L37] Support general and class announcement type filtering :: verification rule #905
// [Moiz-A-31-L38] Support general and class announcement type filtering :: verification rule #924
// [Moiz-A-31-L39] Support general and class announcement type filtering :: verification rule #943
// [Moiz-A-31-L40] Support general and class announcement type filtering :: verification rule #962
// [Moiz-A-31-L41] Support general and class announcement type filtering :: verification rule #981
// [Moiz-A-31-L42] Support general and class announcement type filtering :: verification rule #3
// [Moiz-A-31-L43] Support general and class announcement type filtering :: verification rule #22
// [Moiz-A-31-L44] Support general and class announcement type filtering :: verification rule #41
// [Moiz-A-31-L45] Support general and class announcement type filtering :: verification rule #60
// [Moiz-A-31-L46] Support general and class announcement type filtering :: verification rule #79
// [Moiz-A-31-L47] Support general and class announcement type filtering :: verification rule #98
// [Moiz-A-31-L48] Support general and class announcement type filtering :: verification rule #117
// [Moiz-A-31-L49] Support general and class announcement type filtering :: verification rule #136
// [Moiz-A-31-L50] Support general and class announcement type filtering :: verification rule #155
// [Moiz-A-31-L51] Support general and class announcement type filtering :: verification rule #174
// === [SPEC-BLOCK-END] ===
