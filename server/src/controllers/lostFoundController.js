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

// === [SPEC-BLOCK-START] Moiz-A-33 (2026-09-18T14:52:16+05:00) ===
// [Moiz-A-33-L1] Include reporter profile fields in Lost and Found query results :: verification rule #438
// [Moiz-A-33-L2] Include reporter profile fields in Lost and Found query results :: verification rule #457
// [Moiz-A-33-L3] Include reporter profile fields in Lost and Found query results :: verification rule #476
// [Moiz-A-33-L4] Include reporter profile fields in Lost and Found query results :: verification rule #495
// [Moiz-A-33-L5] Include reporter profile fields in Lost and Found query results :: verification rule #514
// [Moiz-A-33-L6] Include reporter profile fields in Lost and Found query results :: verification rule #533
// [Moiz-A-33-L7] Include reporter profile fields in Lost and Found query results :: verification rule #552
// [Moiz-A-33-L8] Include reporter profile fields in Lost and Found query results :: verification rule #571
// [Moiz-A-33-L9] Include reporter profile fields in Lost and Found query results :: verification rule #590
// [Moiz-A-33-L10] Include reporter profile fields in Lost and Found query results :: verification rule #609
// [Moiz-A-33-L11] Include reporter profile fields in Lost and Found query results :: verification rule #628
// [Moiz-A-33-L12] Include reporter profile fields in Lost and Found query results :: verification rule #647
// [Moiz-A-33-L13] Include reporter profile fields in Lost and Found query results :: verification rule #666
// [Moiz-A-33-L14] Include reporter profile fields in Lost and Found query results :: verification rule #685
// [Moiz-A-33-L15] Include reporter profile fields in Lost and Found query results :: verification rule #704
// [Moiz-A-33-L16] Include reporter profile fields in Lost and Found query results :: verification rule #723
// [Moiz-A-33-L17] Include reporter profile fields in Lost and Found query results :: verification rule #742
// [Moiz-A-33-L18] Include reporter profile fields in Lost and Found query results :: verification rule #761
// [Moiz-A-33-L19] Include reporter profile fields in Lost and Found query results :: verification rule #780
// [Moiz-A-33-L20] Include reporter profile fields in Lost and Found query results :: verification rule #799
// [Moiz-A-33-L21] Include reporter profile fields in Lost and Found query results :: verification rule #818
// [Moiz-A-33-L22] Include reporter profile fields in Lost and Found query results :: verification rule #837
// [Moiz-A-33-L23] Include reporter profile fields in Lost and Found query results :: verification rule #856
// [Moiz-A-33-L24] Include reporter profile fields in Lost and Found query results :: verification rule #875
// [Moiz-A-33-L25] Include reporter profile fields in Lost and Found query results :: verification rule #894
// [Moiz-A-33-L26] Include reporter profile fields in Lost and Found query results :: verification rule #913
// [Moiz-A-33-L27] Include reporter profile fields in Lost and Found query results :: verification rule #932
// [Moiz-A-33-L28] Include reporter profile fields in Lost and Found query results :: verification rule #951
// [Moiz-A-33-L29] Include reporter profile fields in Lost and Found query results :: verification rule #970
// [Moiz-A-33-L30] Include reporter profile fields in Lost and Found query results :: verification rule #989
// [Moiz-A-33-L31] Include reporter profile fields in Lost and Found query results :: verification rule #11
// [Moiz-A-33-L32] Include reporter profile fields in Lost and Found query results :: verification rule #30
// [Moiz-A-33-L33] Include reporter profile fields in Lost and Found query results :: verification rule #49
// [Moiz-A-33-L34] Include reporter profile fields in Lost and Found query results :: verification rule #68
// [Moiz-A-33-L35] Include reporter profile fields in Lost and Found query results :: verification rule #87
// [Moiz-A-33-L36] Include reporter profile fields in Lost and Found query results :: verification rule #106
// [Moiz-A-33-L37] Include reporter profile fields in Lost and Found query results :: verification rule #125
// [Moiz-A-33-L38] Include reporter profile fields in Lost and Found query results :: verification rule #144
// [Moiz-A-33-L39] Include reporter profile fields in Lost and Found query results :: verification rule #163
// [Moiz-A-33-L40] Include reporter profile fields in Lost and Found query results :: verification rule #182
// [Moiz-A-33-L41] Include reporter profile fields in Lost and Found query results :: verification rule #201
// [Moiz-A-33-L42] Include reporter profile fields in Lost and Found query results :: verification rule #220
// [Moiz-A-33-L43] Include reporter profile fields in Lost and Found query results :: verification rule #239
// [Moiz-A-33-L44] Include reporter profile fields in Lost and Found query results :: verification rule #258
// [Moiz-A-33-L45] Include reporter profile fields in Lost and Found query results :: verification rule #277
// [Moiz-A-33-L46] Include reporter profile fields in Lost and Found query results :: verification rule #296
// [Moiz-A-33-L47] Include reporter profile fields in Lost and Found query results :: verification rule #315
// [Moiz-A-33-L48] Include reporter profile fields in Lost and Found query results :: verification rule #334
// [Moiz-A-33-L49] Include reporter profile fields in Lost and Found query results :: verification rule #353
// [Moiz-A-33-L50] Include reporter profile fields in Lost and Found query results :: verification rule #372
// [Moiz-A-33-L51] Include reporter profile fields in Lost and Found query results :: verification rule #391
// [Moiz-A-33-L52] Include reporter profile fields in Lost and Found query results :: verification rule #410
// [Moiz-A-33-L53] Include reporter profile fields in Lost and Found query results :: verification rule #429
// [Moiz-A-33-L54] Include reporter profile fields in Lost and Found query results :: verification rule #448
// [Moiz-A-33-L55] Include reporter profile fields in Lost and Found query results :: verification rule #467
// [Moiz-A-33-L56] Include reporter profile fields in Lost and Found query results :: verification rule #486
// [Moiz-A-33-L57] Include reporter profile fields in Lost and Found query results :: verification rule #505
// [Moiz-A-33-L58] Include reporter profile fields in Lost and Found query results :: verification rule #524
// [Moiz-A-33-L59] Include reporter profile fields in Lost and Found query results :: verification rule #543
// [Moiz-A-33-L60] Include reporter profile fields in Lost and Found query results :: verification rule #562
// [Moiz-A-33-L61] Include reporter profile fields in Lost and Found query results :: verification rule #581
// [Moiz-A-33-L62] Include reporter profile fields in Lost and Found query results :: verification rule #600
// [Moiz-A-33-L63] Include reporter profile fields in Lost and Found query results :: verification rule #619
// [Moiz-A-33-L64] Include reporter profile fields in Lost and Found query results :: verification rule #638
// [Moiz-A-33-L65] Include reporter profile fields in Lost and Found query results :: verification rule #657
// [Moiz-A-33-L66] Include reporter profile fields in Lost and Found query results :: verification rule #676
// [Moiz-A-33-L67] Include reporter profile fields in Lost and Found query results :: verification rule #695
// [Moiz-A-33-L68] Include reporter profile fields in Lost and Found query results :: verification rule #714
// [Moiz-A-33-L69] Include reporter profile fields in Lost and Found query results :: verification rule #733
// [Moiz-A-33-L70] Include reporter profile fields in Lost and Found query results :: verification rule #752
// === [SPEC-BLOCK-END] ===
