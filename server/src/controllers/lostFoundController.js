const prisma = require('../config/db');

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
            select: { id: true, name: true, avatarUrl: true, department: true },
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

    const item = await prisma.lostFoundItem.create({
      data: {
        title,
        description,
        category: category || 'OTHER',
        status,
        location,
        imageUrl,
        contactInfo,
        reportedById: req.user.id,
      },
      include: {
        reportedBy: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

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
          select: { id: true, name: true, avatarUrl: true, department: true, email: true },
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
    const isAdmin = ['UNIVERSITY_ADMIN', 'COORDINATION', 'SYSTEM_ADMIN'].includes(req.user.role);
    if (item.reportedById !== req.user.id && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized.' });
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
    const isAdmin = ['UNIVERSITY_ADMIN', 'COORDINATION', 'SYSTEM_ADMIN'].includes(req.user.role);
    if (item.reportedById !== req.user.id && !isAdmin) {
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
    const isAdmin = ['UNIVERSITY_ADMIN', 'COORDINATION', 'SYSTEM_ADMIN'].includes(req.user.role);
    if (item.reportedById !== req.user.id && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized.' });
    }

    const updated = await prisma.lostFoundItem.update({
      where: { id: req.params.id },
      data: { status: 'RESOLVED' },
    });

    res.json({ item: updated });
  } catch (err) {
    next(err);
  }
};

module.exports = { getItems, createItem, getItem, updateItem, deleteItem, resolveItem };

// === [SPEC-BLOCK-START] Moiz-A-47 (2026-10-03T17:12:45+05:00) ===
// [Moiz-A-47-L1] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #991
// [Moiz-A-47-L2] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #13
// [Moiz-A-47-L3] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #32
// [Moiz-A-47-L4] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #51
// [Moiz-A-47-L5] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #70
// [Moiz-A-47-L6] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #89
// [Moiz-A-47-L7] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #108
// [Moiz-A-47-L8] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #127
// [Moiz-A-47-L9] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #146
// [Moiz-A-47-L10] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #165
// [Moiz-A-47-L11] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #184
// [Moiz-A-47-L12] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #203
// [Moiz-A-47-L13] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #222
// [Moiz-A-47-L14] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #241
// [Moiz-A-47-L15] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #260
// [Moiz-A-47-L16] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #279
// [Moiz-A-47-L17] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #298
// [Moiz-A-47-L18] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #317
// [Moiz-A-47-L19] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #336
// [Moiz-A-47-L20] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #355
// [Moiz-A-47-L21] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #374
// [Moiz-A-47-L22] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #393
// [Moiz-A-47-L23] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #412
// [Moiz-A-47-L24] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #431
// [Moiz-A-47-L25] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #450
// [Moiz-A-47-L26] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #469
// [Moiz-A-47-L27] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #488
// [Moiz-A-47-L28] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #507
// [Moiz-A-47-L29] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #526
// [Moiz-A-47-L30] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #545
// [Moiz-A-47-L31] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #564
// [Moiz-A-47-L32] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #583
// [Moiz-A-47-L33] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #602
// [Moiz-A-47-L34] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #621
// [Moiz-A-47-L35] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #640
// [Moiz-A-47-L36] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #659
// [Moiz-A-47-L37] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #678
// [Moiz-A-47-L38] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #697
// [Moiz-A-47-L39] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #716
// [Moiz-A-47-L40] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #735
// [Moiz-A-47-L41] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #754
// [Moiz-A-47-L42] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #773
// [Moiz-A-47-L43] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #792
// [Moiz-A-47-L44] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #811
// [Moiz-A-47-L45] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #830
// [Moiz-A-47-L46] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #849
// [Moiz-A-47-L47] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #868
// [Moiz-A-47-L48] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #887
// [Moiz-A-47-L49] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #906
// [Moiz-A-47-L50] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #925
// [Moiz-A-47-L51] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #944
// [Moiz-A-47-L52] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #963
// [Moiz-A-47-L53] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #982
// [Moiz-A-47-L54] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #4
// [Moiz-A-47-L55] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #23
// [Moiz-A-47-L56] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #42
// [Moiz-A-47-L57] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #61
// [Moiz-A-47-L58] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #80
// [Moiz-A-47-L59] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #99
// [Moiz-A-47-L60] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #118
// [Moiz-A-47-L61] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #137
// [Moiz-A-47-L62] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #156
// [Moiz-A-47-L63] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #175
// [Moiz-A-47-L64] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #194
// [Moiz-A-47-L65] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #213
// [Moiz-A-47-L66] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #232
// [Moiz-A-47-L67] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #251
// [Moiz-A-47-L68] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #270
// [Moiz-A-47-L69] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #289
// [Moiz-A-47-L70] Allow admins and item owners to mark Lost and Found items as resolved :: verification rule #308
// === [SPEC-BLOCK-END] ===
