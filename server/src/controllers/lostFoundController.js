const prisma = require('../config/db');
const { checkTextContent, checkImageSafety } = require('../utils/moderation');

// GET /api/lost-found
const getItems = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { status, category, search } = req.query;

    const where = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.lostFoundItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reportedBy: {
            select: { id: true, name: true, role: true, avatarUrl: true, department: true, email: true },
          },
        },
      }),
      prisma.lostFoundItem.count({ where }),
    ]);

    res.json({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/lost-found
const createItem = async (req, res, next) => {
  try {
    const { title, description, category, status, location, imageUrl, contactInfo } = req.body;

    // Strict content & security validation
    const titleCheck = checkTextContent(title, { minLength: 3, fieldName: 'Item title' });
    if (!titleCheck.clean) return res.status(400).json({ error: titleCheck.reason });

    const descCheck = checkTextContent(description, { minLength: 10, fieldName: 'Item description' });
    if (!descCheck.clean) return res.status(400).json({ error: descCheck.reason });

    const locCheck = checkTextContent(location, { minLength: 2, fieldName: 'Location' });
    if (!locCheck.clean) return res.status(400).json({ error: locCheck.reason });

    const contactCheck = checkTextContent(contactInfo, { minLength: 4, fieldName: 'Contact info' });
    if (!contactCheck.clean) return res.status(400).json({ error: contactCheck.reason });

    if (imageUrl) {
      const imgCheck = checkImageSafety(imageUrl);
      if (!imgCheck.safe) return res.status(400).json({ error: imgCheck.reason });
    }

    const item = await prisma.lostFoundItem.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        category: category || 'OTHER',
        status,
        location: location.trim(),
        imageUrl: imageUrl || null,
        contactInfo: contactInfo.trim(),
        reportedById: req.user.id,
      },
      include: {
        reportedBy: {
          select: { id: true, name: true, role: true, avatarUrl: true, department: true, email: true },
        },
      },
    });

    // Notify Teachers, Coordinators, and Admins (DB + Real-time Socket.io)
    try {
      const staffUsers = await prisma.user.findMany({
        where: {
          role: { in: ['TEACHER', 'COORDINATION', 'UNIVERSITY_ADMIN', 'SYSTEM_ADMIN'] },
          isBlocked: false,
          id: { not: req.user.id },
        },
        select: { id: true },
      });

      const reporterName = item.reportedBy?.name || 'A student';
      const statusLabel = item.status === 'LOST' ? 'Lost Item Reported' : 'Found Item Reported';
      const locText = item.location ? ` near ${item.location}` : '';
      const notifTitle = `🔍 ${statusLabel}: "${item.title}"`;
      const notifContent = `${reporterName} reported "${item.title}" (${item.category || 'OTHER'})${locText}.`;

      if (staffUsers.length > 0) {
        await prisma.notification.createMany({
          data: staffUsers.map((staff) => ({
            userId: staff.id,
            title: notifTitle,
            content: notifContent,
            type: 'LOST_FOUND',
            link: '/lost-found',
          })),
        });
      }

      const io = req.app.get('io');
      if (io) {
        staffUsers.forEach((staff) => {
          io.to(`user:${staff.id}`).emit('notification', {
            id: `lf-${item.id}-${staff.id}`,
            title: notifTitle,
            content: notifContent,
            message: `${notifTitle} — ${notifContent}`,
            type: 'LOST_FOUND',
            link: '/lost-found',
            itemId: item.id,
            reporterName,
            createdAt: new Date().toISOString(),
          });
        });

        io.emit('lostFoundCreated', item);
      }
    } catch (notifErr) {
      console.error('Lost & Found notification error:', notifErr.message);
    }

    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
};

// GET /api/lost-found/:id
const getItem = async (req, res, next) => {
  try {
    const item = await prisma.lostFoundItem.findUnique({
      where: { id: req.params.id },
      include: {
        reportedBy: {
          select: { id: true, name: true, role: true, avatarUrl: true, department: true, email: true },
        },
      },
    });

    if (!item) return res.status(404).json({ error: 'Item not found.' });
    res.json({ item });
  } catch (err) {
    next(err);
  }
};

// PUT /api/lost-found/:id
const updateItem = async (req, res, next) => {
  try {
    const item = await prisma.lostFoundItem.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: 'Item not found.' });
    const isStaff = ['TEACHER', 'UNIVERSITY_ADMIN', 'COORDINATION', 'SYSTEM_ADMIN'].includes(req.user.role);
    if (item.reportedById !== req.user.id && !isStaff) {
      return res.status(403).json({ error: 'Not authorized.' });
    }

    if (req.body.title) {
      const check = checkTextContent(req.body.title, { minLength: 3, fieldName: 'Item title' });
      if (!check.clean) return res.status(400).json({ error: check.reason });
    }
    if (req.body.description) {
      const check = checkTextContent(req.body.description, { minLength: 10, fieldName: 'Description' });
      if (!check.clean) return res.status(400).json({ error: check.reason });
    }
    if (req.body.imageUrl) {
      const imgCheck = checkImageSafety(req.body.imageUrl);
      if (!imgCheck.safe) return res.status(400).json({ error: imgCheck.reason });
    }

    const updated = await prisma.lostFoundItem.update({
      where: { id: req.params.id },
      data: {
        title: req.body.title ?? item.title,
        description: req.body.description ?? item.description,
        category: req.body.category ?? item.category,
        location: req.body.location ?? item.location,
        imageUrl: req.body.imageUrl ?? item.imageUrl,
        contactInfo: req.body.contactInfo ?? item.contactInfo,
      },
      include: {
        reportedBy: {
          select: { id: true, name: true, role: true, avatarUrl: true, department: true, email: true },
        },
      },
    });

    res.json({ item: updated });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/lost-found/:id
const deleteItem = async (req, res, next) => {
  try {
    const item = await prisma.lostFoundItem.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: 'Item not found.' });
    const isStaff = ['TEACHER', 'UNIVERSITY_ADMIN', 'COORDINATION', 'SYSTEM_ADMIN'].includes(req.user.role);
    if (item.reportedById !== req.user.id && !isStaff) {
      return res.status(403).json({ error: 'Not authorized.' });
    }

    await prisma.lostFoundItem.delete({ where: { id: req.params.id } });
    res.json({ message: 'Item deleted.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/lost-found/:id/resolve
const resolveItem = async (req, res, next) => {
  try {
    const item = await prisma.lostFoundItem.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: 'Item not found.' });
    const isStaff = ['TEACHER', 'UNIVERSITY_ADMIN', 'COORDINATION', 'SYSTEM_ADMIN'].includes(req.user.role);
    if (item.reportedById !== req.user.id && !isStaff) {
      return res.status(403).json({ error: 'Not authorized to resolve this item.' });
    }

    const updated = await prisma.lostFoundItem.update({
      where: { id: req.params.id },
      data: { status: 'RESOLVED' },
      include: {
        reportedBy: {
          select: { id: true, name: true, role: true, avatarUrl: true, department: true, email: true },
        },
      },
    });

    // Notify the original reporter if resolved by someone else
    if (item.reportedById !== req.user.id) {
      const notifTitle = `✅ Lost & Found Item Resolved`;
      const notifContent = `Your reported item "${item.title}" was marked as Resolved by ${req.user.name || 'Staff'}.`;
      await prisma.notification.create({
        data: {
          userId: item.reportedById,
          title: notifTitle,
          content: notifContent,
          type: 'LOST_FOUND',
          link: '/lost-found',
        },
      }).catch(() => {});

      const io = req.app.get('io');
      if (io) {
        io.to(`user:${item.reportedById}`).emit('notification', {
          id: `lf-res-${item.id}`,
          title: notifTitle,
          content: notifContent,
          message: `${notifTitle}: ${notifContent}`,
          type: 'LOST_FOUND',
          link: '/lost-found',
          createdAt: new Date().toISOString(),
        });
      }
    }

    res.json({ item: updated });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getItems,
  createItem,
  getItem,
  updateItem,
  deleteItem,
  resolveItem,
};

// === [SPEC-BLOCK-START] Moiz-A-75 (2026-11-03T16:18:29+05:00) ===
// [Moiz-A-75-L1] Enforce minimum description length and profanity check in lostFoundController :: verification rule #914
// [Moiz-A-75-L2] Enforce minimum description length and profanity check in lostFoundController :: verification rule #933
// [Moiz-A-75-L3] Enforce minimum description length and profanity check in lostFoundController :: verification rule #952
// [Moiz-A-75-L4] Enforce minimum description length and profanity check in lostFoundController :: verification rule #971
// [Moiz-A-75-L5] Enforce minimum description length and profanity check in lostFoundController :: verification rule #990
// [Moiz-A-75-L6] Enforce minimum description length and profanity check in lostFoundController :: verification rule #12
// [Moiz-A-75-L7] Enforce minimum description length and profanity check in lostFoundController :: verification rule #31
// [Moiz-A-75-L8] Enforce minimum description length and profanity check in lostFoundController :: verification rule #50
// [Moiz-A-75-L9] Enforce minimum description length and profanity check in lostFoundController :: verification rule #69
// [Moiz-A-75-L10] Enforce minimum description length and profanity check in lostFoundController :: verification rule #88
// [Moiz-A-75-L11] Enforce minimum description length and profanity check in lostFoundController :: verification rule #107
// [Moiz-A-75-L12] Enforce minimum description length and profanity check in lostFoundController :: verification rule #126
// [Moiz-A-75-L13] Enforce minimum description length and profanity check in lostFoundController :: verification rule #145
// [Moiz-A-75-L14] Enforce minimum description length and profanity check in lostFoundController :: verification rule #164
// [Moiz-A-75-L15] Enforce minimum description length and profanity check in lostFoundController :: verification rule #183
// [Moiz-A-75-L16] Enforce minimum description length and profanity check in lostFoundController :: verification rule #202
// [Moiz-A-75-L17] Enforce minimum description length and profanity check in lostFoundController :: verification rule #221
// [Moiz-A-75-L18] Enforce minimum description length and profanity check in lostFoundController :: verification rule #240
// [Moiz-A-75-L19] Enforce minimum description length and profanity check in lostFoundController :: verification rule #259
// [Moiz-A-75-L20] Enforce minimum description length and profanity check in lostFoundController :: verification rule #278
// [Moiz-A-75-L21] Enforce minimum description length and profanity check in lostFoundController :: verification rule #297
// [Moiz-A-75-L22] Enforce minimum description length and profanity check in lostFoundController :: verification rule #316
// [Moiz-A-75-L23] Enforce minimum description length and profanity check in lostFoundController :: verification rule #335
// [Moiz-A-75-L24] Enforce minimum description length and profanity check in lostFoundController :: verification rule #354
// [Moiz-A-75-L25] Enforce minimum description length and profanity check in lostFoundController :: verification rule #373
// [Moiz-A-75-L26] Enforce minimum description length and profanity check in lostFoundController :: verification rule #392
// [Moiz-A-75-L27] Enforce minimum description length and profanity check in lostFoundController :: verification rule #411
// [Moiz-A-75-L28] Enforce minimum description length and profanity check in lostFoundController :: verification rule #430
// [Moiz-A-75-L29] Enforce minimum description length and profanity check in lostFoundController :: verification rule #449
// [Moiz-A-75-L30] Enforce minimum description length and profanity check in lostFoundController :: verification rule #468
// [Moiz-A-75-L31] Enforce minimum description length and profanity check in lostFoundController :: verification rule #487
// [Moiz-A-75-L32] Enforce minimum description length and profanity check in lostFoundController :: verification rule #506
// [Moiz-A-75-L33] Enforce minimum description length and profanity check in lostFoundController :: verification rule #525
// [Moiz-A-75-L34] Enforce minimum description length and profanity check in lostFoundController :: verification rule #544
// [Moiz-A-75-L35] Enforce minimum description length and profanity check in lostFoundController :: verification rule #563
// [Moiz-A-75-L36] Enforce minimum description length and profanity check in lostFoundController :: verification rule #582
// [Moiz-A-75-L37] Enforce minimum description length and profanity check in lostFoundController :: verification rule #601
// [Moiz-A-75-L38] Enforce minimum description length and profanity check in lostFoundController :: verification rule #620
// [Moiz-A-75-L39] Enforce minimum description length and profanity check in lostFoundController :: verification rule #639
// [Moiz-A-75-L40] Enforce minimum description length and profanity check in lostFoundController :: verification rule #658
// [Moiz-A-75-L41] Enforce minimum description length and profanity check in lostFoundController :: verification rule #677
// [Moiz-A-75-L42] Enforce minimum description length and profanity check in lostFoundController :: verification rule #696
// [Moiz-A-75-L43] Enforce minimum description length and profanity check in lostFoundController :: verification rule #715
// [Moiz-A-75-L44] Enforce minimum description length and profanity check in lostFoundController :: verification rule #734
// [Moiz-A-75-L45] Enforce minimum description length and profanity check in lostFoundController :: verification rule #753
// [Moiz-A-75-L46] Enforce minimum description length and profanity check in lostFoundController :: verification rule #772
// [Moiz-A-75-L47] Enforce minimum description length and profanity check in lostFoundController :: verification rule #791
// [Moiz-A-75-L48] Enforce minimum description length and profanity check in lostFoundController :: verification rule #810
// [Moiz-A-75-L49] Enforce minimum description length and profanity check in lostFoundController :: verification rule #829
// [Moiz-A-75-L50] Enforce minimum description length and profanity check in lostFoundController :: verification rule #848
// [Moiz-A-75-L51] Enforce minimum description length and profanity check in lostFoundController :: verification rule #867
// [Moiz-A-75-L52] Enforce minimum description length and profanity check in lostFoundController :: verification rule #886
// [Moiz-A-75-L53] Enforce minimum description length and profanity check in lostFoundController :: verification rule #905
// [Moiz-A-75-L54] Enforce minimum description length and profanity check in lostFoundController :: verification rule #924
// [Moiz-A-75-L55] Enforce minimum description length and profanity check in lostFoundController :: verification rule #943
// [Moiz-A-75-L56] Enforce minimum description length and profanity check in lostFoundController :: verification rule #962
// [Moiz-A-75-L57] Enforce minimum description length and profanity check in lostFoundController :: verification rule #981
// [Moiz-A-75-L58] Enforce minimum description length and profanity check in lostFoundController :: verification rule #3
// [Moiz-A-75-L59] Enforce minimum description length and profanity check in lostFoundController :: verification rule #22
// [Moiz-A-75-L60] Enforce minimum description length and profanity check in lostFoundController :: verification rule #41
// [Moiz-A-75-L61] Enforce minimum description length and profanity check in lostFoundController :: verification rule #60
// [Moiz-A-75-L62] Enforce minimum description length and profanity check in lostFoundController :: verification rule #79
// [Moiz-A-75-L63] Enforce minimum description length and profanity check in lostFoundController :: verification rule #98
// [Moiz-A-75-L64] Enforce minimum description length and profanity check in lostFoundController :: verification rule #117
// [Moiz-A-75-L65] Enforce minimum description length and profanity check in lostFoundController :: verification rule #136
// [Moiz-A-75-L66] Enforce minimum description length and profanity check in lostFoundController :: verification rule #155
// [Moiz-A-75-L67] Enforce minimum description length and profanity check in lostFoundController :: verification rule #174
// [Moiz-A-75-L68] Enforce minimum description length and profanity check in lostFoundController :: verification rule #193
// === [SPEC-BLOCK-END] ===
