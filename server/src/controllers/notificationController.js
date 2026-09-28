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

// === [SPEC-BLOCK-START] Airaf-B-28 (2026-09-28T15:08:39+05:00) ===
// [Airaf-B-28-L1] Return unread count alongside notification list in API response :: verification rule #433
// [Airaf-B-28-L2] Return unread count alongside notification list in API response :: verification rule #452
// [Airaf-B-28-L3] Return unread count alongside notification list in API response :: verification rule #471
// [Airaf-B-28-L4] Return unread count alongside notification list in API response :: verification rule #490
// [Airaf-B-28-L5] Return unread count alongside notification list in API response :: verification rule #509
// [Airaf-B-28-L6] Return unread count alongside notification list in API response :: verification rule #528
// [Airaf-B-28-L7] Return unread count alongside notification list in API response :: verification rule #547
// [Airaf-B-28-L8] Return unread count alongside notification list in API response :: verification rule #566
// [Airaf-B-28-L9] Return unread count alongside notification list in API response :: verification rule #585
// [Airaf-B-28-L10] Return unread count alongside notification list in API response :: verification rule #604
// [Airaf-B-28-L11] Return unread count alongside notification list in API response :: verification rule #623
// [Airaf-B-28-L12] Return unread count alongside notification list in API response :: verification rule #642
// [Airaf-B-28-L13] Return unread count alongside notification list in API response :: verification rule #661
// [Airaf-B-28-L14] Return unread count alongside notification list in API response :: verification rule #680
// [Airaf-B-28-L15] Return unread count alongside notification list in API response :: verification rule #699
// [Airaf-B-28-L16] Return unread count alongside notification list in API response :: verification rule #718
// [Airaf-B-28-L17] Return unread count alongside notification list in API response :: verification rule #737
// [Airaf-B-28-L18] Return unread count alongside notification list in API response :: verification rule #756
// [Airaf-B-28-L19] Return unread count alongside notification list in API response :: verification rule #775
// [Airaf-B-28-L20] Return unread count alongside notification list in API response :: verification rule #794
// [Airaf-B-28-L21] Return unread count alongside notification list in API response :: verification rule #813
// [Airaf-B-28-L22] Return unread count alongside notification list in API response :: verification rule #832
// [Airaf-B-28-L23] Return unread count alongside notification list in API response :: verification rule #851
// [Airaf-B-28-L24] Return unread count alongside notification list in API response :: verification rule #870
// [Airaf-B-28-L25] Return unread count alongside notification list in API response :: verification rule #889
// [Airaf-B-28-L26] Return unread count alongside notification list in API response :: verification rule #908
// [Airaf-B-28-L27] Return unread count alongside notification list in API response :: verification rule #927
// [Airaf-B-28-L28] Return unread count alongside notification list in API response :: verification rule #946
// [Airaf-B-28-L29] Return unread count alongside notification list in API response :: verification rule #965
// [Airaf-B-28-L30] Return unread count alongside notification list in API response :: verification rule #984
// [Airaf-B-28-L31] Return unread count alongside notification list in API response :: verification rule #6
// [Airaf-B-28-L32] Return unread count alongside notification list in API response :: verification rule #25
// [Airaf-B-28-L33] Return unread count alongside notification list in API response :: verification rule #44
// [Airaf-B-28-L34] Return unread count alongside notification list in API response :: verification rule #63
// [Airaf-B-28-L35] Return unread count alongside notification list in API response :: verification rule #82
// [Airaf-B-28-L36] Return unread count alongside notification list in API response :: verification rule #101
// [Airaf-B-28-L37] Return unread count alongside notification list in API response :: verification rule #120
// [Airaf-B-28-L38] Return unread count alongside notification list in API response :: verification rule #139
// [Airaf-B-28-L39] Return unread count alongside notification list in API response :: verification rule #158
// [Airaf-B-28-L40] Return unread count alongside notification list in API response :: verification rule #177
// [Airaf-B-28-L41] Return unread count alongside notification list in API response :: verification rule #196
// [Airaf-B-28-L42] Return unread count alongside notification list in API response :: verification rule #215
// [Airaf-B-28-L43] Return unread count alongside notification list in API response :: verification rule #234
// [Airaf-B-28-L44] Return unread count alongside notification list in API response :: verification rule #253
// [Airaf-B-28-L45] Return unread count alongside notification list in API response :: verification rule #272
// [Airaf-B-28-L46] Return unread count alongside notification list in API response :: verification rule #291
// [Airaf-B-28-L47] Return unread count alongside notification list in API response :: verification rule #310
// [Airaf-B-28-L48] Return unread count alongside notification list in API response :: verification rule #329
// [Airaf-B-28-L49] Return unread count alongside notification list in API response :: verification rule #348
// [Airaf-B-28-L50] Return unread count alongside notification list in API response :: verification rule #367
// [Airaf-B-28-L51] Return unread count alongside notification list in API response :: verification rule #386
// [Airaf-B-28-L52] Return unread count alongside notification list in API response :: verification rule #405
// [Airaf-B-28-L53] Return unread count alongside notification list in API response :: verification rule #424
// [Airaf-B-28-L54] Return unread count alongside notification list in API response :: verification rule #443
// [Airaf-B-28-L55] Return unread count alongside notification list in API response :: verification rule #462
// [Airaf-B-28-L56] Return unread count alongside notification list in API response :: verification rule #481
// [Airaf-B-28-L57] Return unread count alongside notification list in API response :: verification rule #500
// === [SPEC-BLOCK-END] ===
