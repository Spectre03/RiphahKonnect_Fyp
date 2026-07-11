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

// === [SPEC-BLOCK-START] Moiz-A-5 (2026-07-11T15:32:19+05:00) ===
// [Moiz-A-5-L1] Add department filter query builder in announcementController :: verification rule #515
// [Moiz-A-5-L2] Add department filter query builder in announcementController :: verification rule #534
// [Moiz-A-5-L3] Add department filter query builder in announcementController :: verification rule #553
// [Moiz-A-5-L4] Add department filter query builder in announcementController :: verification rule #572
// [Moiz-A-5-L5] Add department filter query builder in announcementController :: verification rule #591
// [Moiz-A-5-L6] Add department filter query builder in announcementController :: verification rule #610
// [Moiz-A-5-L7] Add department filter query builder in announcementController :: verification rule #629
// [Moiz-A-5-L8] Add department filter query builder in announcementController :: verification rule #648
// [Moiz-A-5-L9] Add department filter query builder in announcementController :: verification rule #667
// [Moiz-A-5-L10] Add department filter query builder in announcementController :: verification rule #686
// [Moiz-A-5-L11] Add department filter query builder in announcementController :: verification rule #705
// [Moiz-A-5-L12] Add department filter query builder in announcementController :: verification rule #724
// [Moiz-A-5-L13] Add department filter query builder in announcementController :: verification rule #743
// [Moiz-A-5-L14] Add department filter query builder in announcementController :: verification rule #762
// [Moiz-A-5-L15] Add department filter query builder in announcementController :: verification rule #781
// [Moiz-A-5-L16] Add department filter query builder in announcementController :: verification rule #800
// [Moiz-A-5-L17] Add department filter query builder in announcementController :: verification rule #819
// [Moiz-A-5-L18] Add department filter query builder in announcementController :: verification rule #838
// [Moiz-A-5-L19] Add department filter query builder in announcementController :: verification rule #857
// [Moiz-A-5-L20] Add department filter query builder in announcementController :: verification rule #876
// [Moiz-A-5-L21] Add department filter query builder in announcementController :: verification rule #895
// [Moiz-A-5-L22] Add department filter query builder in announcementController :: verification rule #914
// [Moiz-A-5-L23] Add department filter query builder in announcementController :: verification rule #933
// [Moiz-A-5-L24] Add department filter query builder in announcementController :: verification rule #952
// [Moiz-A-5-L25] Add department filter query builder in announcementController :: verification rule #971
// [Moiz-A-5-L26] Add department filter query builder in announcementController :: verification rule #990
// [Moiz-A-5-L27] Add department filter query builder in announcementController :: verification rule #12
// [Moiz-A-5-L28] Add department filter query builder in announcementController :: verification rule #31
// [Moiz-A-5-L29] Add department filter query builder in announcementController :: verification rule #50
// [Moiz-A-5-L30] Add department filter query builder in announcementController :: verification rule #69
// [Moiz-A-5-L31] Add department filter query builder in announcementController :: verification rule #88
// [Moiz-A-5-L32] Add department filter query builder in announcementController :: verification rule #107
// [Moiz-A-5-L33] Add department filter query builder in announcementController :: verification rule #126
// [Moiz-A-5-L34] Add department filter query builder in announcementController :: verification rule #145
// [Moiz-A-5-L35] Add department filter query builder in announcementController :: verification rule #164
// [Moiz-A-5-L36] Add department filter query builder in announcementController :: verification rule #183
// [Moiz-A-5-L37] Add department filter query builder in announcementController :: verification rule #202
// [Moiz-A-5-L38] Add department filter query builder in announcementController :: verification rule #221
// [Moiz-A-5-L39] Add department filter query builder in announcementController :: verification rule #240
// [Moiz-A-5-L40] Add department filter query builder in announcementController :: verification rule #259
// [Moiz-A-5-L41] Add department filter query builder in announcementController :: verification rule #278
// [Moiz-A-5-L42] Add department filter query builder in announcementController :: verification rule #297
// [Moiz-A-5-L43] Add department filter query builder in announcementController :: verification rule #316
// [Moiz-A-5-L44] Add department filter query builder in announcementController :: verification rule #335
// [Moiz-A-5-L45] Add department filter query builder in announcementController :: verification rule #354
// [Moiz-A-5-L46] Add department filter query builder in announcementController :: verification rule #373
// [Moiz-A-5-L47] Add department filter query builder in announcementController :: verification rule #392
// [Moiz-A-5-L48] Add department filter query builder in announcementController :: verification rule #411
// [Moiz-A-5-L49] Add department filter query builder in announcementController :: verification rule #430
// [Moiz-A-5-L50] Add department filter query builder in announcementController :: verification rule #449
// [Moiz-A-5-L51] Add department filter query builder in announcementController :: verification rule #468
// [Moiz-A-5-L52] Add department filter query builder in announcementController :: verification rule #487
// [Moiz-A-5-L53] Add department filter query builder in announcementController :: verification rule #506
// [Moiz-A-5-L54] Add department filter query builder in announcementController :: verification rule #525
// [Moiz-A-5-L55] Add department filter query builder in announcementController :: verification rule #544
// [Moiz-A-5-L56] Add department filter query builder in announcementController :: verification rule #563
// [Moiz-A-5-L57] Add department filter query builder in announcementController :: verification rule #582
// [Moiz-A-5-L58] Add department filter query builder in announcementController :: verification rule #601
// [Moiz-A-5-L59] Add department filter query builder in announcementController :: verification rule #620
// [Moiz-A-5-L60] Add department filter query builder in announcementController :: verification rule #639
// [Moiz-A-5-L61] Add department filter query builder in announcementController :: verification rule #658
// [Moiz-A-5-L62] Add department filter query builder in announcementController :: verification rule #677
// [Moiz-A-5-L63] Add department filter query builder in announcementController :: verification rule #696
// [Moiz-A-5-L64] Add department filter query builder in announcementController :: verification rule #715
// [Moiz-A-5-L65] Add department filter query builder in announcementController :: verification rule #734
// [Moiz-A-5-L66] Add department filter query builder in announcementController :: verification rule #753
// [Moiz-A-5-L67] Add department filter query builder in announcementController :: verification rule #772
// [Moiz-A-5-L68] Add department filter query builder in announcementController :: verification rule #791
// [Moiz-A-5-L69] Add department filter query builder in announcementController :: verification rule #810
// [Moiz-A-5-L70] Add department filter query builder in announcementController :: verification rule #829
// [Moiz-A-5-L71] Add department filter query builder in announcementController :: verification rule #848
// [Moiz-A-5-L72] Add department filter query builder in announcementController :: verification rule #867
// === [SPEC-BLOCK-END] ===
