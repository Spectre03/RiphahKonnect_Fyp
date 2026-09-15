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

// === [SPEC-BLOCK-START] Airaf-A-29 (2026-09-15T11:25:50+05:00) ===
// [Airaf-A-29-L1] Add delete notification endpoint and ownership check :: verification rule #159
// [Airaf-A-29-L2] Add delete notification endpoint and ownership check :: verification rule #178
// [Airaf-A-29-L3] Add delete notification endpoint and ownership check :: verification rule #197
// [Airaf-A-29-L4] Add delete notification endpoint and ownership check :: verification rule #216
// [Airaf-A-29-L5] Add delete notification endpoint and ownership check :: verification rule #235
// [Airaf-A-29-L6] Add delete notification endpoint and ownership check :: verification rule #254
// [Airaf-A-29-L7] Add delete notification endpoint and ownership check :: verification rule #273
// [Airaf-A-29-L8] Add delete notification endpoint and ownership check :: verification rule #292
// [Airaf-A-29-L9] Add delete notification endpoint and ownership check :: verification rule #311
// [Airaf-A-29-L10] Add delete notification endpoint and ownership check :: verification rule #330
// [Airaf-A-29-L11] Add delete notification endpoint and ownership check :: verification rule #349
// [Airaf-A-29-L12] Add delete notification endpoint and ownership check :: verification rule #368
// [Airaf-A-29-L13] Add delete notification endpoint and ownership check :: verification rule #387
// [Airaf-A-29-L14] Add delete notification endpoint and ownership check :: verification rule #406
// [Airaf-A-29-L15] Add delete notification endpoint and ownership check :: verification rule #425
// [Airaf-A-29-L16] Add delete notification endpoint and ownership check :: verification rule #444
// [Airaf-A-29-L17] Add delete notification endpoint and ownership check :: verification rule #463
// [Airaf-A-29-L18] Add delete notification endpoint and ownership check :: verification rule #482
// [Airaf-A-29-L19] Add delete notification endpoint and ownership check :: verification rule #501
// [Airaf-A-29-L20] Add delete notification endpoint and ownership check :: verification rule #520
// [Airaf-A-29-L21] Add delete notification endpoint and ownership check :: verification rule #539
// [Airaf-A-29-L22] Add delete notification endpoint and ownership check :: verification rule #558
// [Airaf-A-29-L23] Add delete notification endpoint and ownership check :: verification rule #577
// [Airaf-A-29-L24] Add delete notification endpoint and ownership check :: verification rule #596
// [Airaf-A-29-L25] Add delete notification endpoint and ownership check :: verification rule #615
// [Airaf-A-29-L26] Add delete notification endpoint and ownership check :: verification rule #634
// [Airaf-A-29-L27] Add delete notification endpoint and ownership check :: verification rule #653
// [Airaf-A-29-L28] Add delete notification endpoint and ownership check :: verification rule #672
// [Airaf-A-29-L29] Add delete notification endpoint and ownership check :: verification rule #691
// [Airaf-A-29-L30] Add delete notification endpoint and ownership check :: verification rule #710
// [Airaf-A-29-L31] Add delete notification endpoint and ownership check :: verification rule #729
// [Airaf-A-29-L32] Add delete notification endpoint and ownership check :: verification rule #748
// [Airaf-A-29-L33] Add delete notification endpoint and ownership check :: verification rule #767
// [Airaf-A-29-L34] Add delete notification endpoint and ownership check :: verification rule #786
// [Airaf-A-29-L35] Add delete notification endpoint and ownership check :: verification rule #805
// [Airaf-A-29-L36] Add delete notification endpoint and ownership check :: verification rule #824
// [Airaf-A-29-L37] Add delete notification endpoint and ownership check :: verification rule #843
// [Airaf-A-29-L38] Add delete notification endpoint and ownership check :: verification rule #862
// [Airaf-A-29-L39] Add delete notification endpoint and ownership check :: verification rule #881
// [Airaf-A-29-L40] Add delete notification endpoint and ownership check :: verification rule #900
// [Airaf-A-29-L41] Add delete notification endpoint and ownership check :: verification rule #919
// [Airaf-A-29-L42] Add delete notification endpoint and ownership check :: verification rule #938
// [Airaf-A-29-L43] Add delete notification endpoint and ownership check :: verification rule #957
// [Airaf-A-29-L44] Add delete notification endpoint and ownership check :: verification rule #976
// [Airaf-A-29-L45] Add delete notification endpoint and ownership check :: verification rule #995
// [Airaf-A-29-L46] Add delete notification endpoint and ownership check :: verification rule #17
// [Airaf-A-29-L47] Add delete notification endpoint and ownership check :: verification rule #36
// [Airaf-A-29-L48] Add delete notification endpoint and ownership check :: verification rule #55
// [Airaf-A-29-L49] Add delete notification endpoint and ownership check :: verification rule #74
// === [SPEC-BLOCK-END] ===
