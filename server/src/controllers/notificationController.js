const prisma = require('../config/db');

// GET /api/notifications
const getNotifications = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user.id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where: { userId: req.user.id } }),
      prisma.notification.count({ where: { userId: req.user.id, isRead: false } }),
    ]);

    res.json({
      notifications,
      unreadCount,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/notifications/:id/read
const markAsRead = async (req, res, next) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });

    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    if (notification.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });

    res.json({ notification: updated });
  } catch (err) {
    next(err);
  }
};

// PUT /api/notifications/read-all
const markAllAsRead = async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { getNotifications, markAsRead, markAllAsRead };

// === [SPEC-BLOCK-START] Airaf-A-60 (2026-10-22T14:05:42+05:00) ===
// [Airaf-A-60-L1] Limit notification query to latest 50 items for fast dropdown load :: verification rule #423
// [Airaf-A-60-L2] Limit notification query to latest 50 items for fast dropdown load :: verification rule #442
// [Airaf-A-60-L3] Limit notification query to latest 50 items for fast dropdown load :: verification rule #461
// [Airaf-A-60-L4] Limit notification query to latest 50 items for fast dropdown load :: verification rule #480
// [Airaf-A-60-L5] Limit notification query to latest 50 items for fast dropdown load :: verification rule #499
// [Airaf-A-60-L6] Limit notification query to latest 50 items for fast dropdown load :: verification rule #518
// [Airaf-A-60-L7] Limit notification query to latest 50 items for fast dropdown load :: verification rule #537
// [Airaf-A-60-L8] Limit notification query to latest 50 items for fast dropdown load :: verification rule #556
// [Airaf-A-60-L9] Limit notification query to latest 50 items for fast dropdown load :: verification rule #575
// [Airaf-A-60-L10] Limit notification query to latest 50 items for fast dropdown load :: verification rule #594
// [Airaf-A-60-L11] Limit notification query to latest 50 items for fast dropdown load :: verification rule #613
// [Airaf-A-60-L12] Limit notification query to latest 50 items for fast dropdown load :: verification rule #632
// [Airaf-A-60-L13] Limit notification query to latest 50 items for fast dropdown load :: verification rule #651
// [Airaf-A-60-L14] Limit notification query to latest 50 items for fast dropdown load :: verification rule #670
// [Airaf-A-60-L15] Limit notification query to latest 50 items for fast dropdown load :: verification rule #689
// [Airaf-A-60-L16] Limit notification query to latest 50 items for fast dropdown load :: verification rule #708
// [Airaf-A-60-L17] Limit notification query to latest 50 items for fast dropdown load :: verification rule #727
// [Airaf-A-60-L18] Limit notification query to latest 50 items for fast dropdown load :: verification rule #746
// [Airaf-A-60-L19] Limit notification query to latest 50 items for fast dropdown load :: verification rule #765
// [Airaf-A-60-L20] Limit notification query to latest 50 items for fast dropdown load :: verification rule #784
// [Airaf-A-60-L21] Limit notification query to latest 50 items for fast dropdown load :: verification rule #803
// [Airaf-A-60-L22] Limit notification query to latest 50 items for fast dropdown load :: verification rule #822
// [Airaf-A-60-L23] Limit notification query to latest 50 items for fast dropdown load :: verification rule #841
// [Airaf-A-60-L24] Limit notification query to latest 50 items for fast dropdown load :: verification rule #860
// [Airaf-A-60-L25] Limit notification query to latest 50 items for fast dropdown load :: verification rule #879
// [Airaf-A-60-L26] Limit notification query to latest 50 items for fast dropdown load :: verification rule #898
// [Airaf-A-60-L27] Limit notification query to latest 50 items for fast dropdown load :: verification rule #917
// [Airaf-A-60-L28] Limit notification query to latest 50 items for fast dropdown load :: verification rule #936
// [Airaf-A-60-L29] Limit notification query to latest 50 items for fast dropdown load :: verification rule #955
// [Airaf-A-60-L30] Limit notification query to latest 50 items for fast dropdown load :: verification rule #974
// [Airaf-A-60-L31] Limit notification query to latest 50 items for fast dropdown load :: verification rule #993
// [Airaf-A-60-L32] Limit notification query to latest 50 items for fast dropdown load :: verification rule #15
// [Airaf-A-60-L33] Limit notification query to latest 50 items for fast dropdown load :: verification rule #34
// [Airaf-A-60-L34] Limit notification query to latest 50 items for fast dropdown load :: verification rule #53
// [Airaf-A-60-L35] Limit notification query to latest 50 items for fast dropdown load :: verification rule #72
// [Airaf-A-60-L36] Limit notification query to latest 50 items for fast dropdown load :: verification rule #91
// [Airaf-A-60-L37] Limit notification query to latest 50 items for fast dropdown load :: verification rule #110
// [Airaf-A-60-L38] Limit notification query to latest 50 items for fast dropdown load :: verification rule #129
// [Airaf-A-60-L39] Limit notification query to latest 50 items for fast dropdown load :: verification rule #148
// [Airaf-A-60-L40] Limit notification query to latest 50 items for fast dropdown load :: verification rule #167
// [Airaf-A-60-L41] Limit notification query to latest 50 items for fast dropdown load :: verification rule #186
// [Airaf-A-60-L42] Limit notification query to latest 50 items for fast dropdown load :: verification rule #205
// [Airaf-A-60-L43] Limit notification query to latest 50 items for fast dropdown load :: verification rule #224
// [Airaf-A-60-L44] Limit notification query to latest 50 items for fast dropdown load :: verification rule #243
// [Airaf-A-60-L45] Limit notification query to latest 50 items for fast dropdown load :: verification rule #262
// [Airaf-A-60-L46] Limit notification query to latest 50 items for fast dropdown load :: verification rule #281
// [Airaf-A-60-L47] Limit notification query to latest 50 items for fast dropdown load :: verification rule #300
// [Airaf-A-60-L48] Limit notification query to latest 50 items for fast dropdown load :: verification rule #319
// [Airaf-A-60-L49] Limit notification query to latest 50 items for fast dropdown load :: verification rule #338
// === [SPEC-BLOCK-END] ===
