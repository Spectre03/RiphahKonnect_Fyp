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
