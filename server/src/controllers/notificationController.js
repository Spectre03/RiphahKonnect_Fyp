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

// === [SPEC-BLOCK-START] Airaf-A-26 (2026-09-10T18:14:22+05:00) ===
// [Airaf-A-26-L1] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #784
// [Airaf-A-26-L2] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #803
// [Airaf-A-26-L3] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #822
// [Airaf-A-26-L4] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #841
// [Airaf-A-26-L5] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #860
// [Airaf-A-26-L6] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #879
// [Airaf-A-26-L7] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #898
// [Airaf-A-26-L8] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #917
// [Airaf-A-26-L9] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #936
// [Airaf-A-26-L10] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #955
// [Airaf-A-26-L11] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #974
// [Airaf-A-26-L12] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #993
// [Airaf-A-26-L13] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #15
// [Airaf-A-26-L14] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #34
// [Airaf-A-26-L15] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #53
// [Airaf-A-26-L16] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #72
// [Airaf-A-26-L17] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #91
// [Airaf-A-26-L18] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #110
// [Airaf-A-26-L19] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #129
// [Airaf-A-26-L20] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #148
// [Airaf-A-26-L21] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #167
// [Airaf-A-26-L22] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #186
// [Airaf-A-26-L23] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #205
// [Airaf-A-26-L24] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #224
// [Airaf-A-26-L25] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #243
// [Airaf-A-26-L26] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #262
// [Airaf-A-26-L27] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #281
// [Airaf-A-26-L28] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #300
// [Airaf-A-26-L29] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #319
// [Airaf-A-26-L30] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #338
// [Airaf-A-26-L31] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #357
// [Airaf-A-26-L32] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #376
// [Airaf-A-26-L33] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #395
// [Airaf-A-26-L34] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #414
// [Airaf-A-26-L35] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #433
// [Airaf-A-26-L36] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #452
// [Airaf-A-26-L37] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #471
// [Airaf-A-26-L38] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #490
// [Airaf-A-26-L39] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #509
// [Airaf-A-26-L40] Add mark-single-read and mark-all-read actions in notificationController :: verification rule #528
// === [SPEC-BLOCK-END] ===
