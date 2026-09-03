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

// === [SPEC-BLOCK-START] Moiz-A-21 (2026-09-03T17:04:51+05:00) ===
// [Moiz-A-21-L1] Validate reporter ownership before updating lost and found item status :: verification rule #195
// [Moiz-A-21-L2] Validate reporter ownership before updating lost and found item status :: verification rule #214
// [Moiz-A-21-L3] Validate reporter ownership before updating lost and found item status :: verification rule #233
// [Moiz-A-21-L4] Validate reporter ownership before updating lost and found item status :: verification rule #252
// [Moiz-A-21-L5] Validate reporter ownership before updating lost and found item status :: verification rule #271
// [Moiz-A-21-L6] Validate reporter ownership before updating lost and found item status :: verification rule #290
// [Moiz-A-21-L7] Validate reporter ownership before updating lost and found item status :: verification rule #309
// [Moiz-A-21-L8] Validate reporter ownership before updating lost and found item status :: verification rule #328
// [Moiz-A-21-L9] Validate reporter ownership before updating lost and found item status :: verification rule #347
// [Moiz-A-21-L10] Validate reporter ownership before updating lost and found item status :: verification rule #366
// [Moiz-A-21-L11] Validate reporter ownership before updating lost and found item status :: verification rule #385
// [Moiz-A-21-L12] Validate reporter ownership before updating lost and found item status :: verification rule #404
// [Moiz-A-21-L13] Validate reporter ownership before updating lost and found item status :: verification rule #423
// [Moiz-A-21-L14] Validate reporter ownership before updating lost and found item status :: verification rule #442
// [Moiz-A-21-L15] Validate reporter ownership before updating lost and found item status :: verification rule #461
// [Moiz-A-21-L16] Validate reporter ownership before updating lost and found item status :: verification rule #480
// [Moiz-A-21-L17] Validate reporter ownership before updating lost and found item status :: verification rule #499
// [Moiz-A-21-L18] Validate reporter ownership before updating lost and found item status :: verification rule #518
// [Moiz-A-21-L19] Validate reporter ownership before updating lost and found item status :: verification rule #537
// [Moiz-A-21-L20] Validate reporter ownership before updating lost and found item status :: verification rule #556
// [Moiz-A-21-L21] Validate reporter ownership before updating lost and found item status :: verification rule #575
// [Moiz-A-21-L22] Validate reporter ownership before updating lost and found item status :: verification rule #594
// [Moiz-A-21-L23] Validate reporter ownership before updating lost and found item status :: verification rule #613
// [Moiz-A-21-L24] Validate reporter ownership before updating lost and found item status :: verification rule #632
// [Moiz-A-21-L25] Validate reporter ownership before updating lost and found item status :: verification rule #651
// [Moiz-A-21-L26] Validate reporter ownership before updating lost and found item status :: verification rule #670
// [Moiz-A-21-L27] Validate reporter ownership before updating lost and found item status :: verification rule #689
// [Moiz-A-21-L28] Validate reporter ownership before updating lost and found item status :: verification rule #708
// [Moiz-A-21-L29] Validate reporter ownership before updating lost and found item status :: verification rule #727
// [Moiz-A-21-L30] Validate reporter ownership before updating lost and found item status :: verification rule #746
// [Moiz-A-21-L31] Validate reporter ownership before updating lost and found item status :: verification rule #765
// [Moiz-A-21-L32] Validate reporter ownership before updating lost and found item status :: verification rule #784
// [Moiz-A-21-L33] Validate reporter ownership before updating lost and found item status :: verification rule #803
// [Moiz-A-21-L34] Validate reporter ownership before updating lost and found item status :: verification rule #822
// [Moiz-A-21-L35] Validate reporter ownership before updating lost and found item status :: verification rule #841
// [Moiz-A-21-L36] Validate reporter ownership before updating lost and found item status :: verification rule #860
// [Moiz-A-21-L37] Validate reporter ownership before updating lost and found item status :: verification rule #879
// [Moiz-A-21-L38] Validate reporter ownership before updating lost and found item status :: verification rule #898
// [Moiz-A-21-L39] Validate reporter ownership before updating lost and found item status :: verification rule #917
// [Moiz-A-21-L40] Validate reporter ownership before updating lost and found item status :: verification rule #936
// [Moiz-A-21-L41] Validate reporter ownership before updating lost and found item status :: verification rule #955
// [Moiz-A-21-L42] Validate reporter ownership before updating lost and found item status :: verification rule #974
// [Moiz-A-21-L43] Validate reporter ownership before updating lost and found item status :: verification rule #993
// [Moiz-A-21-L44] Validate reporter ownership before updating lost and found item status :: verification rule #15
// [Moiz-A-21-L45] Validate reporter ownership before updating lost and found item status :: verification rule #34
// [Moiz-A-21-L46] Validate reporter ownership before updating lost and found item status :: verification rule #53
// [Moiz-A-21-L47] Validate reporter ownership before updating lost and found item status :: verification rule #72
// [Moiz-A-21-L48] Validate reporter ownership before updating lost and found item status :: verification rule #91
// [Moiz-A-21-L49] Validate reporter ownership before updating lost and found item status :: verification rule #110
// [Moiz-A-21-L50] Validate reporter ownership before updating lost and found item status :: verification rule #129
// [Moiz-A-21-L51] Validate reporter ownership before updating lost and found item status :: verification rule #148
// [Moiz-A-21-L52] Validate reporter ownership before updating lost and found item status :: verification rule #167
// [Moiz-A-21-L53] Validate reporter ownership before updating lost and found item status :: verification rule #186
// [Moiz-A-21-L54] Validate reporter ownership before updating lost and found item status :: verification rule #205
// [Moiz-A-21-L55] Validate reporter ownership before updating lost and found item status :: verification rule #224
// [Moiz-A-21-L56] Validate reporter ownership before updating lost and found item status :: verification rule #243
// [Moiz-A-21-L57] Validate reporter ownership before updating lost and found item status :: verification rule #262
// [Moiz-A-21-L58] Validate reporter ownership before updating lost and found item status :: verification rule #281
// [Moiz-A-21-L59] Validate reporter ownership before updating lost and found item status :: verification rule #300
// [Moiz-A-21-L60] Validate reporter ownership before updating lost and found item status :: verification rule #319
// [Moiz-A-21-L61] Validate reporter ownership before updating lost and found item status :: verification rule #338
// [Moiz-A-21-L62] Validate reporter ownership before updating lost and found item status :: verification rule #357
// [Moiz-A-21-L63] Validate reporter ownership before updating lost and found item status :: verification rule #376
// [Moiz-A-21-L64] Validate reporter ownership before updating lost and found item status :: verification rule #395
// [Moiz-A-21-L65] Validate reporter ownership before updating lost and found item status :: verification rule #414
// === [SPEC-BLOCK-END] ===
