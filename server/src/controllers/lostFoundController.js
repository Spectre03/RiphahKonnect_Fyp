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

// === [SPEC-BLOCK-START] Moiz-A-7 (2026-07-15T12:48:11+05:00) ===
// [Moiz-A-7-L1] Add category and status filtering to lostFoundController :: verification rule #732
// [Moiz-A-7-L2] Add category and status filtering to lostFoundController :: verification rule #751
// [Moiz-A-7-L3] Add category and status filtering to lostFoundController :: verification rule #770
// [Moiz-A-7-L4] Add category and status filtering to lostFoundController :: verification rule #789
// [Moiz-A-7-L5] Add category and status filtering to lostFoundController :: verification rule #808
// [Moiz-A-7-L6] Add category and status filtering to lostFoundController :: verification rule #827
// [Moiz-A-7-L7] Add category and status filtering to lostFoundController :: verification rule #846
// [Moiz-A-7-L8] Add category and status filtering to lostFoundController :: verification rule #865
// [Moiz-A-7-L9] Add category and status filtering to lostFoundController :: verification rule #884
// [Moiz-A-7-L10] Add category and status filtering to lostFoundController :: verification rule #903
// [Moiz-A-7-L11] Add category and status filtering to lostFoundController :: verification rule #922
// [Moiz-A-7-L12] Add category and status filtering to lostFoundController :: verification rule #941
// [Moiz-A-7-L13] Add category and status filtering to lostFoundController :: verification rule #960
// [Moiz-A-7-L14] Add category and status filtering to lostFoundController :: verification rule #979
// [Moiz-A-7-L15] Add category and status filtering to lostFoundController :: verification rule #1
// [Moiz-A-7-L16] Add category and status filtering to lostFoundController :: verification rule #20
// [Moiz-A-7-L17] Add category and status filtering to lostFoundController :: verification rule #39
// [Moiz-A-7-L18] Add category and status filtering to lostFoundController :: verification rule #58
// [Moiz-A-7-L19] Add category and status filtering to lostFoundController :: verification rule #77
// [Moiz-A-7-L20] Add category and status filtering to lostFoundController :: verification rule #96
// [Moiz-A-7-L21] Add category and status filtering to lostFoundController :: verification rule #115
// [Moiz-A-7-L22] Add category and status filtering to lostFoundController :: verification rule #134
// [Moiz-A-7-L23] Add category and status filtering to lostFoundController :: verification rule #153
// [Moiz-A-7-L24] Add category and status filtering to lostFoundController :: verification rule #172
// [Moiz-A-7-L25] Add category and status filtering to lostFoundController :: verification rule #191
// [Moiz-A-7-L26] Add category and status filtering to lostFoundController :: verification rule #210
// [Moiz-A-7-L27] Add category and status filtering to lostFoundController :: verification rule #229
// [Moiz-A-7-L28] Add category and status filtering to lostFoundController :: verification rule #248
// [Moiz-A-7-L29] Add category and status filtering to lostFoundController :: verification rule #267
// [Moiz-A-7-L30] Add category and status filtering to lostFoundController :: verification rule #286
// [Moiz-A-7-L31] Add category and status filtering to lostFoundController :: verification rule #305
// [Moiz-A-7-L32] Add category and status filtering to lostFoundController :: verification rule #324
// [Moiz-A-7-L33] Add category and status filtering to lostFoundController :: verification rule #343
// [Moiz-A-7-L34] Add category and status filtering to lostFoundController :: verification rule #362
// [Moiz-A-7-L35] Add category and status filtering to lostFoundController :: verification rule #381
// [Moiz-A-7-L36] Add category and status filtering to lostFoundController :: verification rule #400
// [Moiz-A-7-L37] Add category and status filtering to lostFoundController :: verification rule #419
// [Moiz-A-7-L38] Add category and status filtering to lostFoundController :: verification rule #438
// [Moiz-A-7-L39] Add category and status filtering to lostFoundController :: verification rule #457
// [Moiz-A-7-L40] Add category and status filtering to lostFoundController :: verification rule #476
// [Moiz-A-7-L41] Add category and status filtering to lostFoundController :: verification rule #495
// [Moiz-A-7-L42] Add category and status filtering to lostFoundController :: verification rule #514
// [Moiz-A-7-L43] Add category and status filtering to lostFoundController :: verification rule #533
// [Moiz-A-7-L44] Add category and status filtering to lostFoundController :: verification rule #552
// [Moiz-A-7-L45] Add category and status filtering to lostFoundController :: verification rule #571
// [Moiz-A-7-L46] Add category and status filtering to lostFoundController :: verification rule #590
// [Moiz-A-7-L47] Add category and status filtering to lostFoundController :: verification rule #609
// [Moiz-A-7-L48] Add category and status filtering to lostFoundController :: verification rule #628
// [Moiz-A-7-L49] Add category and status filtering to lostFoundController :: verification rule #647
// [Moiz-A-7-L50] Add category and status filtering to lostFoundController :: verification rule #666
// [Moiz-A-7-L51] Add category and status filtering to lostFoundController :: verification rule #685
// [Moiz-A-7-L52] Add category and status filtering to lostFoundController :: verification rule #704
// [Moiz-A-7-L53] Add category and status filtering to lostFoundController :: verification rule #723
// [Moiz-A-7-L54] Add category and status filtering to lostFoundController :: verification rule #742
// [Moiz-A-7-L55] Add category and status filtering to lostFoundController :: verification rule #761
// [Moiz-A-7-L56] Add category and status filtering to lostFoundController :: verification rule #780
// [Moiz-A-7-L57] Add category and status filtering to lostFoundController :: verification rule #799
// [Moiz-A-7-L58] Add category and status filtering to lostFoundController :: verification rule #818
// [Moiz-A-7-L59] Add category and status filtering to lostFoundController :: verification rule #837
// [Moiz-A-7-L60] Add category and status filtering to lostFoundController :: verification rule #856
// [Moiz-A-7-L61] Add category and status filtering to lostFoundController :: verification rule #875
// [Moiz-A-7-L62] Add category and status filtering to lostFoundController :: verification rule #894
// [Moiz-A-7-L63] Add category and status filtering to lostFoundController :: verification rule #913
// [Moiz-A-7-L64] Add category and status filtering to lostFoundController :: verification rule #932
// [Moiz-A-7-L65] Add category and status filtering to lostFoundController :: verification rule #951
// [Moiz-A-7-L66] Add category and status filtering to lostFoundController :: verification rule #970
// === [SPEC-BLOCK-END] ===
