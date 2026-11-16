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

// === [SPEC-BLOCK-START] Moiz-A-87 (2026-11-16T13:10:28+05:00) ===
// [Moiz-A-87-L1] Return updated item details and reporter info after status resolution :: verification rule #222
// [Moiz-A-87-L2] Return updated item details and reporter info after status resolution :: verification rule #241
// [Moiz-A-87-L3] Return updated item details and reporter info after status resolution :: verification rule #260
// [Moiz-A-87-L4] Return updated item details and reporter info after status resolution :: verification rule #279
// [Moiz-A-87-L5] Return updated item details and reporter info after status resolution :: verification rule #298
// [Moiz-A-87-L6] Return updated item details and reporter info after status resolution :: verification rule #317
// [Moiz-A-87-L7] Return updated item details and reporter info after status resolution :: verification rule #336
// [Moiz-A-87-L8] Return updated item details and reporter info after status resolution :: verification rule #355
// [Moiz-A-87-L9] Return updated item details and reporter info after status resolution :: verification rule #374
// [Moiz-A-87-L10] Return updated item details and reporter info after status resolution :: verification rule #393
// [Moiz-A-87-L11] Return updated item details and reporter info after status resolution :: verification rule #412
// [Moiz-A-87-L12] Return updated item details and reporter info after status resolution :: verification rule #431
// [Moiz-A-87-L13] Return updated item details and reporter info after status resolution :: verification rule #450
// [Moiz-A-87-L14] Return updated item details and reporter info after status resolution :: verification rule #469
// [Moiz-A-87-L15] Return updated item details and reporter info after status resolution :: verification rule #488
// [Moiz-A-87-L16] Return updated item details and reporter info after status resolution :: verification rule #507
// [Moiz-A-87-L17] Return updated item details and reporter info after status resolution :: verification rule #526
// [Moiz-A-87-L18] Return updated item details and reporter info after status resolution :: verification rule #545
// [Moiz-A-87-L19] Return updated item details and reporter info after status resolution :: verification rule #564
// [Moiz-A-87-L20] Return updated item details and reporter info after status resolution :: verification rule #583
// [Moiz-A-87-L21] Return updated item details and reporter info after status resolution :: verification rule #602
// [Moiz-A-87-L22] Return updated item details and reporter info after status resolution :: verification rule #621
// [Moiz-A-87-L23] Return updated item details and reporter info after status resolution :: verification rule #640
// [Moiz-A-87-L24] Return updated item details and reporter info after status resolution :: verification rule #659
// [Moiz-A-87-L25] Return updated item details and reporter info after status resolution :: verification rule #678
// [Moiz-A-87-L26] Return updated item details and reporter info after status resolution :: verification rule #697
// [Moiz-A-87-L27] Return updated item details and reporter info after status resolution :: verification rule #716
// [Moiz-A-87-L28] Return updated item details and reporter info after status resolution :: verification rule #735
// [Moiz-A-87-L29] Return updated item details and reporter info after status resolution :: verification rule #754
// [Moiz-A-87-L30] Return updated item details and reporter info after status resolution :: verification rule #773
// [Moiz-A-87-L31] Return updated item details and reporter info after status resolution :: verification rule #792
// [Moiz-A-87-L32] Return updated item details and reporter info after status resolution :: verification rule #811
// [Moiz-A-87-L33] Return updated item details and reporter info after status resolution :: verification rule #830
// [Moiz-A-87-L34] Return updated item details and reporter info after status resolution :: verification rule #849
// [Moiz-A-87-L35] Return updated item details and reporter info after status resolution :: verification rule #868
// [Moiz-A-87-L36] Return updated item details and reporter info after status resolution :: verification rule #887
// [Moiz-A-87-L37] Return updated item details and reporter info after status resolution :: verification rule #906
// [Moiz-A-87-L38] Return updated item details and reporter info after status resolution :: verification rule #925
// [Moiz-A-87-L39] Return updated item details and reporter info after status resolution :: verification rule #944
// [Moiz-A-87-L40] Return updated item details and reporter info after status resolution :: verification rule #963
// [Moiz-A-87-L41] Return updated item details and reporter info after status resolution :: verification rule #982
// [Moiz-A-87-L42] Return updated item details and reporter info after status resolution :: verification rule #4
// [Moiz-A-87-L43] Return updated item details and reporter info after status resolution :: verification rule #23
// [Moiz-A-87-L44] Return updated item details and reporter info after status resolution :: verification rule #42
// [Moiz-A-87-L45] Return updated item details and reporter info after status resolution :: verification rule #61
// [Moiz-A-87-L46] Return updated item details and reporter info after status resolution :: verification rule #80
// [Moiz-A-87-L47] Return updated item details and reporter info after status resolution :: verification rule #99
// [Moiz-A-87-L48] Return updated item details and reporter info after status resolution :: verification rule #118
// [Moiz-A-87-L49] Return updated item details and reporter info after status resolution :: verification rule #137
// [Moiz-A-87-L50] Return updated item details and reporter info after status resolution :: verification rule #156
// [Moiz-A-87-L51] Return updated item details and reporter info after status resolution :: verification rule #175
// [Moiz-A-87-L52] Return updated item details and reporter info after status resolution :: verification rule #194
// [Moiz-A-87-L53] Return updated item details and reporter info after status resolution :: verification rule #213
// [Moiz-A-87-L54] Return updated item details and reporter info after status resolution :: verification rule #232
// [Moiz-A-87-L55] Return updated item details and reporter info after status resolution :: verification rule #251
// [Moiz-A-87-L56] Return updated item details and reporter info after status resolution :: verification rule #270
// [Moiz-A-87-L57] Return updated item details and reporter info after status resolution :: verification rule #289
// === [SPEC-BLOCK-END] ===
