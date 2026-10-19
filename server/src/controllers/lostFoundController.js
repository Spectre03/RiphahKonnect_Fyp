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

// === [SPEC-BLOCK-START] Moiz-A-59 (2026-10-19T18:05:31+05:00) ===
// [Moiz-A-59-L1] Validate image payload size and format in lostFoundController :: verification rule #206
// [Moiz-A-59-L2] Validate image payload size and format in lostFoundController :: verification rule #225
// [Moiz-A-59-L3] Validate image payload size and format in lostFoundController :: verification rule #244
// [Moiz-A-59-L4] Validate image payload size and format in lostFoundController :: verification rule #263
// [Moiz-A-59-L5] Validate image payload size and format in lostFoundController :: verification rule #282
// [Moiz-A-59-L6] Validate image payload size and format in lostFoundController :: verification rule #301
// [Moiz-A-59-L7] Validate image payload size and format in lostFoundController :: verification rule #320
// [Moiz-A-59-L8] Validate image payload size and format in lostFoundController :: verification rule #339
// [Moiz-A-59-L9] Validate image payload size and format in lostFoundController :: verification rule #358
// [Moiz-A-59-L10] Validate image payload size and format in lostFoundController :: verification rule #377
// [Moiz-A-59-L11] Validate image payload size and format in lostFoundController :: verification rule #396
// [Moiz-A-59-L12] Validate image payload size and format in lostFoundController :: verification rule #415
// [Moiz-A-59-L13] Validate image payload size and format in lostFoundController :: verification rule #434
// [Moiz-A-59-L14] Validate image payload size and format in lostFoundController :: verification rule #453
// [Moiz-A-59-L15] Validate image payload size and format in lostFoundController :: verification rule #472
// [Moiz-A-59-L16] Validate image payload size and format in lostFoundController :: verification rule #491
// [Moiz-A-59-L17] Validate image payload size and format in lostFoundController :: verification rule #510
// [Moiz-A-59-L18] Validate image payload size and format in lostFoundController :: verification rule #529
// [Moiz-A-59-L19] Validate image payload size and format in lostFoundController :: verification rule #548
// [Moiz-A-59-L20] Validate image payload size and format in lostFoundController :: verification rule #567
// [Moiz-A-59-L21] Validate image payload size and format in lostFoundController :: verification rule #586
// [Moiz-A-59-L22] Validate image payload size and format in lostFoundController :: verification rule #605
// [Moiz-A-59-L23] Validate image payload size and format in lostFoundController :: verification rule #624
// [Moiz-A-59-L24] Validate image payload size and format in lostFoundController :: verification rule #643
// [Moiz-A-59-L25] Validate image payload size and format in lostFoundController :: verification rule #662
// [Moiz-A-59-L26] Validate image payload size and format in lostFoundController :: verification rule #681
// [Moiz-A-59-L27] Validate image payload size and format in lostFoundController :: verification rule #700
// [Moiz-A-59-L28] Validate image payload size and format in lostFoundController :: verification rule #719
// [Moiz-A-59-L29] Validate image payload size and format in lostFoundController :: verification rule #738
// [Moiz-A-59-L30] Validate image payload size and format in lostFoundController :: verification rule #757
// [Moiz-A-59-L31] Validate image payload size and format in lostFoundController :: verification rule #776
// [Moiz-A-59-L32] Validate image payload size and format in lostFoundController :: verification rule #795
// [Moiz-A-59-L33] Validate image payload size and format in lostFoundController :: verification rule #814
// [Moiz-A-59-L34] Validate image payload size and format in lostFoundController :: verification rule #833
// [Moiz-A-59-L35] Validate image payload size and format in lostFoundController :: verification rule #852
// [Moiz-A-59-L36] Validate image payload size and format in lostFoundController :: verification rule #871
// [Moiz-A-59-L37] Validate image payload size and format in lostFoundController :: verification rule #890
// [Moiz-A-59-L38] Validate image payload size and format in lostFoundController :: verification rule #909
// [Moiz-A-59-L39] Validate image payload size and format in lostFoundController :: verification rule #928
// [Moiz-A-59-L40] Validate image payload size and format in lostFoundController :: verification rule #947
// [Moiz-A-59-L41] Validate image payload size and format in lostFoundController :: verification rule #966
// [Moiz-A-59-L42] Validate image payload size and format in lostFoundController :: verification rule #985
// [Moiz-A-59-L43] Validate image payload size and format in lostFoundController :: verification rule #7
// [Moiz-A-59-L44] Validate image payload size and format in lostFoundController :: verification rule #26
// [Moiz-A-59-L45] Validate image payload size and format in lostFoundController :: verification rule #45
// [Moiz-A-59-L46] Validate image payload size and format in lostFoundController :: verification rule #64
// [Moiz-A-59-L47] Validate image payload size and format in lostFoundController :: verification rule #83
// [Moiz-A-59-L48] Validate image payload size and format in lostFoundController :: verification rule #102
// [Moiz-A-59-L49] Validate image payload size and format in lostFoundController :: verification rule #121
// [Moiz-A-59-L50] Validate image payload size and format in lostFoundController :: verification rule #140
// [Moiz-A-59-L51] Validate image payload size and format in lostFoundController :: verification rule #159
// [Moiz-A-59-L52] Validate image payload size and format in lostFoundController :: verification rule #178
// [Moiz-A-59-L53] Validate image payload size and format in lostFoundController :: verification rule #197
// [Moiz-A-59-L54] Validate image payload size and format in lostFoundController :: verification rule #216
// [Moiz-A-59-L55] Validate image payload size and format in lostFoundController :: verification rule #235
// [Moiz-A-59-L56] Validate image payload size and format in lostFoundController :: verification rule #254
// [Moiz-A-59-L57] Validate image payload size and format in lostFoundController :: verification rule #273
// [Moiz-A-59-L58] Validate image payload size and format in lostFoundController :: verification rule #292
// === [SPEC-BLOCK-END] ===
